import { lessonMedia } from './media.js'

// Long enough to finish a lesson with pauses; the player requests a new link after expiry.
const PLAYBACK_TTL_SECONDS = 3 * 60 * 60
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PASSTHROUGH_HEADERS = ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    const playbackMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/playback$/)
    if (playbackMatch) {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
      return handlePlayback(request, env, playbackMatch[1])
    }

    const streamMatch = pathname.match(/^\/api\/stream\/([^/]+)$/)
    if (streamMatch) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
      return handleStream(request, env, streamMatch[1])
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
async function handleStream(request, env, token) {
  if (!env.STREAM_SIGNING_SECRET) return new Response(null, { status: 500 })

  const payload = await verifyToken(token, env.STREAM_SIGNING_SECRET)
  if (!payload) return new Response(null, { status: 403 })

  const media = await lookupMedia(env, payload.l)
  if (!media) return new Response(null, { status: 404 })

  const upstreamHeaders = new Headers()
  const range = request.headers.get('Range')
  if (range) upstreamHeaders.set('Range', range)

  const upstream = await fetch(driveDownloadUrl(media.driveFileId), {
    method: request.method,
    headers: upstreamHeaders,
    redirect: 'follow',
  })

  // Drive answers with an HTML page for quota, permission, or scan-warning problems.
  const upstreamType = upstream.headers.get('Content-Type') || ''
  if (upstream.status === 416) return new Response(null, { status: 416, headers: pickHeaders(upstream.headers) })
  if (!upstream.ok || upstreamType.startsWith('text/html')) {
    console.error('Drive upstream failed', upstream.status, upstreamType, payload.l)
    return new Response(null, { status: 502 })
  }

  const headers = pickHeaders(upstream.headers)
  headers.set('Content-Type', media.mimeType || upstreamType)
  headers.set('Content-Disposition', 'inline')
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers })
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
