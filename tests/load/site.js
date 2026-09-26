// How many students can browse the site at once before the cPanel host slows down.
//
// This hits the static site only -- the pages and their assets -- which is what
// LibyanSpider serves. Video and sign-in are measured separately, because they are
// served by Cloudflare and Supabase and would hide what the host itself can take.
//
//   k6 run -e SITE=https://academy.glorytech.ly tests/load/site.js
//
// Override the shape with -e PEAK=200 -e RAMP=30s -e HOLD=1m.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const SITE = (__ENV.SITE || 'https://academy.glorytech.ly').replace(/\/+$/, '');
const PEAK = Number(__ENV.PEAK || 100);
const RAMP = __ENV.RAMP || '30s';
const HOLD = __ENV.HOLD || '1m';

const pageTime = new Trend('page_load_ms', true);

export const options = {
  stages: [
    { duration: RAMP, target: Math.round(PEAK / 4) },
    { duration: RAMP, target: PEAK },
    { duration: HOLD, target: PEAK },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    // A page that takes over 2s at peak is already a bad experience on a phone.
    'http_req_duration{kind:page}': ['p(95)<2000'],
    'http_req_failed': ['rate<0.01'],
    'checks': ['rate>0.99'],
  },
};

// Every route is the same index.html; what differs is what the visitor does next.
const routes = ['/', '/b2b', '/teach', '/courses/ccna1-introduction-to-networks', '/login'];

export default function () {
  const route = routes[Math.floor(Math.random() * routes.length)];

  group('page', () => {
    const res = http.get(`${SITE}${route}`, { tags: { kind: 'page' } });
    pageTime.add(res.timings.duration);
    check(res, {
      'page 200': (r) => r.status === 200,
      'page is the app': (r) => r.body.includes('<div id="root"'),
    });
  });

  group('assets', () => {
    const responses = http.batch([
      ['GET', `${SITE}/robots.txt`, null, { tags: { kind: 'asset' } }],
      ['GET', `${SITE}/sitemap.xml`, null, { tags: { kind: 'asset' } }],
    ]);
    check(responses[0], { 'asset 200': (r) => r.status === 200 });
  });

  // A real visitor reads before clicking again.
  sleep(Math.random() * 3 + 1);
}
