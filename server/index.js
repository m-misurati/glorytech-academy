// Static server for the container image.
//
// It serves the built site, answers /healthz, and injects the runtime
// configuration into index.html so one image works in every environment.
// Lesson video is NOT served here: the browser talks to the Cloudflare Worker
// directly (API_BASE), which has the edge cache and unmetered egress.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'client');
const port = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Only these reach the browser. Secrets (service role key, signing secret) stay
// on the Worker and must never be listed here.
const PUBLIC_CONFIG_KEYS = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'API_BASE', 'CONTACT_EMAIL', 'TELEGRAM_CHANNEL'];

function publicConfig() {
  const config = {};
  for (const key of PUBLIC_CONFIG_KEYS) {
    const value = (process.env[key] || '').trim();
    if (value) config[key] = value;
  }
  return config;
}

// Built once at startup; the values only change when the container restarts.
const configScript = `<script>window.__APP_CONFIG__=${JSON.stringify(publicConfig()).replace(/</g, '\\u003c')}</script>`;
const indexPath = join(root, 'index.html');
const indexHtml = existsSync(indexPath)
  ? readFileSync(indexPath, 'utf8').replace('</head>', `${configScript}</head>`)
  : null;

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

function sendIndex(response, status = 200) {
  if (!indexHtml) {
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end('dist/client/index.html is missing — run npm run build');
    return;
  }
  securityHeaders(response);
  // The HTML carries the config, so it must never be cached.
  response.writeHead(status, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  response.end(indexHtml);
}

// Resolves a URL path to a file inside dist/client, or null when it escapes it.
function resolve(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = normalize(join(root, decoded));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (!existsSync(candidate) || statSync(candidate).isDirectory()) return null;
  return candidate;
}

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (pathname === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok', uptime: Math.round(process.uptime()) }));
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    sendIndex(response);
    return;
  }

  const file = resolve(pathname);
  if (!file) {
    // Unknown path with no file extension is a client route (/teach, /courses/...).
    sendIndex(response, extname(pathname) ? 404 : 200);
    return;
  }

  const ext = extname(file).toLowerCase();
  securityHeaders(response);
  response.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // Built assets carry a content hash, so they can be cached hard.
    'Cache-Control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    'Content-Length': statSync(file).size,
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, () => {
  const keys = Object.keys(publicConfig());
  console.log(`GloryTech Academy listening on :${port}`);
  console.log(keys.length ? `runtime config: ${keys.join(', ')}` : 'runtime config: none (using values compiled at build time)');
});

// Render sends SIGTERM on deploy and on spin-down.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
