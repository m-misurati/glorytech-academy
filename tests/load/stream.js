// How the video Worker and its edge cache hold up when a class starts together.
//
// Needs a signed stream URL, which `npm run load:stream` mints for you:
//
//   k6 run -e STREAM_URL="https://.../api/stream/<token>" tests/load/stream.js
//
// Each iteration asks for one 1 MB slice, the way a player does while it buffers.
// Most requests should land on chunks Cloudflare already holds, so watch
// cached_ttfb_ms against cold_ttfb_ms: that gap is what the cache is worth.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const STREAM_URL = __ENV.STREAM_URL;
const PEAK = Number(__ENV.PEAK || 30);
const HOLD = __ENV.HOLD || '1m';
const SLICE = 1024 * 1024;
// Stay inside the first chunks so the test measures serving, not Drive's throttle.
const CHUNKS = Number(__ENV.CHUNKS || 8);

const cachedTtfb = new Trend('cached_ttfb_ms', true);
const coldTtfb = new Trend('cold_ttfb_ms', true);
const cacheHits = new Rate('edge_cache_hits');

export const options = {
  stages: [
    { duration: '20s', target: Math.round(PEAK / 3) },
    { duration: '20s', target: PEAK },
    { duration: HOLD, target: PEAK },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'checks': ['rate>0.98'],
    // A warm chunk comes from the nearest Cloudflare location; half a second is generous.
    'cached_ttfb_ms': ['p(95)<500'],
  },
};

export function setup() {
  if (!STREAM_URL) throw new Error('STREAM_URL is required -- run: npm run load:stream');
  // One pass warms the chunks this test will ask for, so the run measures the cache
  // rather than Google Drive. The first learner of the day pays this cost once.
  for (let i = 0; i < CHUNKS; i += 1) {
    const start = i * 4 * 1024 * 1024;
    http.get(STREAM_URL, { headers: { Range: `bytes=${start}-${start + SLICE - 1}` }, timeout: '120s' });
  }
  return {};
}

export default function () {
  const chunk = Math.floor(Math.random() * CHUNKS);
  const start = chunk * 4 * 1024 * 1024 + Math.floor(Math.random() * (4 * 1024 * 1024 - SLICE));
  const res = http.get(STREAM_URL, {
    headers: { Range: `bytes=${start}-${start + SLICE - 1}` },
    tags: { kind: 'chunk' },
    timeout: '60s',
  });

  const warm = res.timings.waiting < 500;
  cacheHits.add(warm);
  (warm ? cachedTtfb : coldTtfb).add(res.timings.waiting);

  check(res, {
    'partial content': (r) => r.status === 206,
    'range honoured': (r) => (r.headers['Content-Range'] || '').startsWith('bytes '),
    'is video': (r) => (r.headers['Content-Type'] || '').includes('mp4'),
    'body arrived': (r) => r.body.length > 0,
  });

  sleep(Math.random() * 2 + 0.5);
}
