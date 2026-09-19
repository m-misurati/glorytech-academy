// Writes public/robots.txt and public/sitemap.xml before the build.
// The site URL comes from VITE_SITE_URL (.env); without it the sitemap is skipped.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { courses, instructors } from '../src/data/courses.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL.trim().replace(/\/$/, '');
  try {
    // Like dotenv, a later line wins over an earlier one.
    const last = readFileSync(join(root, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((item) => item.startsWith('VITE_SITE_URL='))
      .map((item) => item.slice('VITE_SITE_URL='.length).trim())
      .filter(Boolean)
      .at(-1);
    return (last || '').replace(/\/$/, '');
  } catch {
    return '';
  }
}

const siteUrl = readSiteUrl();

writeFileSync(join(root, 'public/robots.txt'), [
  'User-agent: *',
  'Allow: /',
  'Disallow: /dashboard',
  'Disallow: /learn/',
  'Disallow: /instructor',
  'Disallow: /admin',
  siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '',
  '',
].filter((line) => line !== '').join('\n'));

if (!siteUrl) {
  console.warn('[seo] VITE_SITE_URL is not set — robots.txt written, sitemap skipped.');
  process.exit(0);
}

const paths = [
  '/',
  '/login',
  '/legal/terms',
  '/legal/privacy',
  ...courses.map((course) => `/courses/${course.slug}`),
  ...instructors.map((instructor) => `/instructors/${instructor.slug}`),
];

const today = new Date().toISOString().slice(0, 10);
const urls = paths.map((path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>\n  </url>`).join('\n');

writeFileSync(join(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`[seo] robots.txt and sitemap.xml written for ${siteUrl} (${paths.length} urls).`);
