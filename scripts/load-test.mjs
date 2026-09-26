// Runs the k6 load tests, minting a real playback token first for the stream test.
//
//   npm run load:site      the cPanel host, browsing pages
//   npm run load:stream    the Cloudflare Worker and its edge cache
//
// The playback token is signed for one learner and expires, so it is minted per run
// and never stored. The service role key stays in .dev.vars and is only used here to
// open a session; it is never written to a file k6 can see.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const K6 = process.env.K6 || 'k6';
const which = process.argv[2];

function envFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
  );
}

const pub = envFile('.env');
const secret = envFile('.dev.vars');
const site = pub.VITE_SITE_URL || 'https://academy.glorytech.ly';

if (which === 'site') {
  const result = spawnSync(K6, ['run', '-e', `SITE=${site}`, ...process.argv.slice(3), 'tests/load/site.js'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

if (which !== 'stream') {
  console.error('Usage: node scripts/load-test.mjs <site|stream> [extra k6 flags]');
  process.exit(1);
}

const supabaseUrl = secret.SUPABASE_URL || pub.VITE_SUPABASE_URL;
const serviceKey = secret.SUPABASE_SERVICE_ROLE_KEY;
const publishable = pub.VITE_SUPABASE_PUBLISHABLE_KEY || pub.VITE_SUPABASE_ANON_KEY;
const api = (pub.VITE_API_BASE || '').replace(/\/+$/, '');
const owner = process.env.LOAD_TEST_EMAIL || 'm.misurati@outlook.com';
const lesson = process.env.LOAD_TEST_LESSON || '00000000-0000-4000-8000-000000001102';

if (!serviceKey || !supabaseUrl || !api) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .dev.vars, and VITE_API_BASE in .env');
  process.exit(1);
}

const admin = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

// A magic link generated through the admin API signs the session without sending mail.
const link = await (await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
  method: 'POST', headers: admin, body: JSON.stringify({ type: 'magiclink', email: owner }),
})).json();

const verified = await fetch(`${supabaseUrl}/auth/v1/verify?type=magiclink&token=${link.hashed_token}&redirect_to=${site}/`, { redirect: 'manual' });
const jwt = new URLSearchParams((verified.headers.get('location') || '').split('#')[1] || '').get('access_token');
if (!jwt) {
  console.error('Could not open a session for the load test.');
  process.exit(1);
}

const playback = await fetch(`${api}/api/lessons/${lesson}/playback`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, Origin: site, 'Content-Type': 'application/json' },
});
const body = await playback.json();
const path = body.url || '';
if (!path) {
  console.error(`Playback refused (${playback.status}): ${JSON.stringify(body).slice(0, 200)}`);
  process.exit(1);
}

const streamUrl = path.startsWith('http') ? path : api + path;
console.log(`Streaming lesson ${lesson} through ${api}\n`);

const result = spawnSync(K6, ['run', '-e', `STREAM_URL=${streamUrl}`, ...process.argv.slice(3), 'tests/load/stream.js'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
