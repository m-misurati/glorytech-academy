import { lessonMedia } from './media.js'

// Long enough to finish a lesson with pauses; the player requests a new link after expiry.
const PLAYBACK_TTL_SECONDS = 3 * 60 * 60
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PASSTHROUGH_HEADERS = ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)

    const playbackMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/playback$/)
    if (playbackMatch) {
      // The site may be hosted elsewhere (cPanel), so the browser asks first.
      if (request.method === 'OPTIONS') return withCors(request, env, new Response(null, { status: 204 }))
      if (request.method !== 'POST') return withCors(request, env, json({ error: 'method_not_allowed' }, 405))
      try {
        return withCors(request, env, await handlePlayback(request, env, playbackMatch[1]))
      } catch (error) {
        // Supabase unreachable (slow or dropped link): a retryable answer, not a crash.
        console.error('Playback lookup failed', error?.message)
        return withCors(request, env, json({ error: 'upstream_unavailable' }, 503))
      }
    }

    const streamMatch = pathname.match(/^\/api\/stream\/([^/]+)$/)
    if (streamMatch) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
      try {
        return await handleStream(request, env, ctx, streamMatch[1])
      } catch (error) {
        // Drive dropped the connection before answering. The <video> element retries a 5xx range.
        console.error('Stream upstream failed', error?.message)
        return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } })
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)

    return env.ASSETS.fetch(request)
  },
}

// Checks the learner's Supabase session and enrollment, then issues a short-lived signed stream URL.
async function handlePlayback(request, env, lessonId) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.STREAM_SIGNING_SECRET) {
    return json({ error: 'server_not_configured' }, 500)
  }
  if (!UUID_PATTERN.test(lessonId)) return json({ error: 'not_found' }, 404)

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!accessToken) return json({ error: 'unauthorized' }, 401)

  const userResponse = await supabaseFetch(env, '/auth/v1/user', accessToken)
  if (!userResponse.ok) return json({ error: 'unauthorized' }, 401)
  const user = await userResponse.json()

  // Queries run with the learner's token, so RLS decides what is visible.
  const lessonResponse = await supabaseFetch(env, `/rest/v1/lessons?id=eq.${lessonId}&select=course_id,is_preview`, accessToken)
  const [lesson] = lessonResponse.ok ? await lessonResponse.json() : []
  if (!lesson) return json({ error: 'not_found' }, 404)

  if (!lesson.is_preview) {
    const enrollmentResponse = await supabaseFetch(
      env,
      `/rest/v1/enrollments?course_id=eq.${lesson.course_id}&user_id=eq.${user.id}&select=course_id`,
      accessToken,
    )
    const enrollments = enrollmentResponse.ok ? await enrollmentResponse.json() : []
    if (!enrollments.length) return json({ error: 'not_enrolled' }, 403)
  }

  const media = await lookupMedia(env, lessonId)
  if (!media) return json({ error: 'no_media' }, 404)

  const expiresAt = Math.floor(Date.now() / 1000) + PLAYBACK_TTL_SECONDS
  const token = await signToken({ l: lessonId, u: user.id, e: expiresAt }, env.STREAM_SIGNING_SECRET)

  return json({ url: `/api/stream/${token}`, expiresAt })
}

// Proxies the video bytes (including Range requests) so the browser never sees the Drive origin.
async function handleStream(request, env, ctx, token) {
  if (!env.STREAM_SIGNING_SECRET) return new Response(null, { status: 500 })

  const payload = await verifyToken(token, env.STREAM_SIGNING_SECRET)
  if (!payload) return new Response(null, { status: 403 })

  const media = await lookupMedia(env, payload.l)
  if (!media) return new Response(null, { status: 404 })

  const range = parseRange(request.headers.get('Range'))

  // Without a Range header the browser wants the whole file; stream it straight through.
  // Chrome only does this for the very first probe, then switches to ranges.
  if (!range) {
    const upstream = await fetchDrive(media.driveFileId)
    const failure = driveFailure(upstream, payload.l)
    if (failure) return failure
    const headers = streamHeaders(pickHeaders(upstream.headers), media, upstream)
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers })
  }

  // Drive throttles to a few hundred KB/s, so every byte we serve twice must come
  // from the edge instead. Ranges are snapped to fixed chunks and each chunk is
  // cached once; the next learner on the same lesson is served from Cloudflare.
  const chunkIndex = Math.floor(range.start / CHUNK_SIZE)
  const chunkStart = chunkIndex * CHUNK_SIZE
  const cacheKey = new Request(`https://media.cache.invalid/${media.driveFileId}/${chunkIndex}`)

  const hit = await caches.default.match(cacheKey)
  if (hit) {
    const buffer = await hit.arrayBuffer()
    const total = Number(hit.headers.get('X-Total-Length')) || 0
    if (total && range.start >= total) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    }
    const chunkEnd = chunkStart + buffer.byteLength - 1
    const end = Math.min(range.end ?? chunkEnd, chunkEnd)
    const body = buffer.slice(range.start - chunkStart, end - chunkStart + 1)
    return partialResponse(request, media, body, range.start, end, total)
  }

  // Cache miss: never make the learner wait for a whole chunk. Stream their bytes
  // straight from Drive, and fill the cache for the next learner in the background.
  const chunkLast = chunkStart + CHUNK_SIZE - 1
  const aligned = range.start === chunkStart
  const upstream = await fetchDrive(media.driveFileId, `bytes=${aligned ? chunkStart : range.start}-${chunkLast}`)
  const failure = driveFailure(upstream, payload.l)
  if (failure) return failure

  const upstreamRange = parseContentRange(upstream.headers.get('Content-Range'))
  const total = upstreamRange?.total || 0
  const upstreamEnd = upstreamRange?.end ?? chunkLast
  const end = Math.min(range.end ?? upstreamEnd, upstreamEnd)

  let clientBody = upstream.body
  if (aligned) {
    // One Drive read serves both: the learner's copy and the cached copy.
    const [toClient, toCache] = upstream.body.tee()
    clientBody = toClient
    ctx.waitUntil(storeChunk(cacheKey, toCache, total))
  } else {
    ctx.waitUntil(fillChunk(cacheKey, media.driveFileId, chunkStart, chunkLast))
  }

  const length = end - range.start + 1
  return partialResponse(request, media, limitStream(clientBody, length), range.start, end, total, length)
}

// 4 MB keeps a cold seek short (few seconds from Drive) while a lesson still
// needs only a few dozen cached objects.
const CHUNK_SIZE = 4 * 1024 * 1024

function partialResponse(request, media, body, start, end, total, length) {
  const headers = new Headers()
  headers.set('Content-Type', media.mimeType || 'video/mp4')
  headers.set('Content-Length', String(length ?? body.byteLength))
  headers.set('Content-Range', `bytes ${start}-${end}/${total || '*'}`)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Content-Disposition', 'inline')
  // Signed per learner, so the browser may keep it but shared caches may not.
  headers.set('Cache-Control', 'private, max-age=3600')
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(request.method === 'HEAD' ? null : body, { status: 206, headers })
}

function parseContentRange(value) {
  const match = /bytes (\d+)-(\d+)\/(\d+|\*)/.exec(value || '')
  if (!match) return null
  return { start: Number(match[1]), end: Number(match[2]), total: match[3] === '*' ? 0 : Number(match[3]) }
}

// Passes through at most `length` bytes, so the body always matches Content-Length.
function limitStream(stream, length) {
  let remaining = length
  return stream.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      if (remaining <= 0) return
      const piece = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk
      remaining -= piece.byteLength
      controller.enqueue(piece)
    },
  }))
}

async function storeChunk(cacheKey, body, total) {
  try {
    const buffer = await new Response(body).arrayBuffer()
    // Stored as a plain 200: the Cache API refuses to store 206 responses.
    await caches.default.put(cacheKey, new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buffer.byteLength),
        'X-Total-Length': String(total),
        'Cache-Control': `public, max-age=${CHUNK_CACHE_SECONDS}`,
      },
    }))
  } catch (error) {
    console.error('Chunk cache store failed', error.message)
  }
}

// Runs inside waitUntil, after the learner already has their bytes, so it must
// never reject: a failure here only means the chunk is fetched again next time.
async function fillChunk(cacheKey, fileId, start, last) {
  try {
    const upstream = await fetchDrive(fileId, `bytes=${start}-${last}`)
    const type = upstream.headers.get('Content-Type') || ''
    if (!upstream.ok || type.startsWith('text/html')) return
    const total = parseContentRange(upstream.headers.get('Content-Range'))?.total || 0
    await storeChunk(cacheKey, upstream.body, total)
  } catch (error) {
    console.error('Background chunk fill failed', error?.message)
  }
}

function parseRange(value) {
  const match = /^bytes=(\d*)-(\d*)$/.exec((value || '').trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (!rawStart) return null // suffix ranges ("bytes=-500") fall back to the passthrough path
  return { start: Number(rawStart), end: rawEnd ? Number(rawEnd) : null }
}

const CHUNK_CACHE_SECONDS = 7 * 24 * 60 * 60

function fetchDrive(fileId, range) {
  const headers = new Headers()
  if (range) headers.set('Range', range)
  return fetch(driveDownloadUrl(fileId), { headers, redirect: 'follow' })
}

// Drive answers with an HTML page for quota, permission, or scan-warning problems.
function driveFailure(upstream, lessonId) {
  const type = upstream.headers.get('Content-Type') || ''
  if (upstream.status === 416) return new Response(null, { status: 416, headers: pickHeaders(upstream.headers) })
  if (!upstream.ok || type.startsWith('text/html')) {
    console.error('Drive upstream failed', upstream.status, type, lessonId)
    return new Response(null, { status: 502 })
  }
  return null
}

function streamHeaders(headers, media, upstream) {
  headers.set('Content-Type', media.mimeType || upstream.headers.get('Content-Type') || 'video/mp4')
  headers.set('Content-Disposition', 'inline')
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=3600')
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}

// Lesson videos live in the database (set from the instructor portal); worker/media.js is the fallback.
// Cached briefly so a seek does not re-query Supabase for every Range request.
const mediaCache = new Map()
const MEDIA_CACHE_MS = 5 * 60 * 1000

async function lookupMedia(env, lessonId) {
  const cached = mediaCache.get(lessonId)
  if (cached && cached.expires > Date.now()) return cached.media

  let media = null
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_lesson_video`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_lesson_id: lessonId }),
      })
      const row = response.ok ? await response.json() : null
      if (row?.drive_file_id) media = { provider: 'google_drive', driveFileId: row.drive_file_id, mimeType: row.mime_type }
    } catch (error) {
      console.error('Lesson video lookup failed', error.message)
    }
  }

  if (!media) media = lessonMedia[lessonId] || null
  mediaCache.set(lessonId, { media, expires: Date.now() + MEDIA_CACHE_MS })
  return media
}

function driveDownloadUrl(fileId) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
}

function pickHeaders(source) {
  const headers = new Headers()
  for (const name of PASSTHROUGH_HEADERS) {
    const value = source.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

function supabaseFetch(env, path, accessToken) {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

// Only origins listed in ALLOWED_ORIGINS (comma-separated) may call the API from
// another domain. When the Worker serves the site itself, requests are same-origin
// and no header is needed. Video bytes need no CORS: <video> loads them like an image.
function withCors(request, env, response) {
  const origin = request.headers.get('Origin')
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim().replace(/\/+$/, '')).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return response

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  headers.set('Access-Control-Max-Age', '86400')
  headers.append('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

// Stream tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature).
const encoder = new TextEncoder()

function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function signToken(payload, secret) {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body))
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function verifyToken(token, secret) {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  let signatureBytes
  let payload
  try {
    signatureBytes = base64UrlDecode(signature)
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)))
  } catch {
    return null
  }

  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), signatureBytes, encoder.encode(body))
  if (!valid || typeof payload.e !== 'number' || payload.e < Date.now() / 1000) return null
  return payload
}

function base64UrlEncode(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
