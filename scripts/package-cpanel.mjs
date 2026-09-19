// Builds the site and packs dist/client into glorytech-site.zip for cPanel's File Manager.
// Usage: npm run package:cpanel
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';

// Like dotenv, a later line wins over an earlier one.
function value(key) {
  return env
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${key}=`))
    .map((line) => line.slice(key.length + 1).trim())
    .filter(Boolean)
    .at(-1) || '';
}

// On cPanel the Worker is not on the same domain, so the site must know where it is.
const apiBase = value('VITE_API_BASE');
if (!apiBase) {
  console.error('VITE_API_BASE is missing from .env — lesson videos would not play on cPanel.');
  console.error('Add the Worker address, e.g. VITE_API_BASE=https://glorytech-academy.<account>.workers.dev');
  process.exit(1);
}
if (!value('VITE_SITE_URL')) console.warn('VITE_SITE_URL is not set — sitemap.xml will be skipped.');

execSync('npm run build', { stdio: 'inherit' });

if (!existsSync('dist/client/.htaccess')) {
  console.error('dist/client/.htaccess is missing — links other than the home page would return 404.');
  process.exit(1);
}

const zip = 'glorytech-site.zip';
rmSync(zip, { force: true });
// Windows 10+ ships bsdtar, which writes zip archives (-a) and keeps dotfiles such as .htaccess.
// .assetsignore only means something to Cloudflare, so it stays out of the cPanel package.
execFileSync('tar', ['-a', '-c', '-f', zip, '-C', 'dist/client', '--exclude', './.assetsignore', '.']);

const listing = execFileSync('tar', ['-t', '-f', zip], { encoding: 'utf8' });
for (const required of ['.htaccess', 'index.html']) {
  if (!listing.split(/\r?\n/).some((line) => line === `./${required}`)) {
    console.error(`${zip} does not contain ${required}`);
    process.exit(1);
  }
}

const mb = (statSync(zip).size / 1048576).toFixed(1);
console.log(`\n${zip} ready (${mb} MB), API at ${apiBase}`);
console.log('Upload it to public_html/academy in cPanel File Manager, then Extract.');
