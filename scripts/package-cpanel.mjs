// Builds the site and packs dist/client into glorytech-site.zip for cPanel's File Manager.
// Usage: npm run package:cpanel
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

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

// Only Cloudflare reads this file; it has no meaning on cPanel.
rmSync('dist/client/.assetsignore', { force: true });

// Git Bash ships GNU tar, which cannot write zip archives: "tar -a -cf x.zip"
// silently produces a plain tar that Windows and cPanel both refuse to open.
// .NET writes a real zip and keeps dotfiles such as .htaccess.
const source = resolve('dist/client');
const target = resolve(zip);
execFileSync('powershell', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${source}','${target}',[System.IO.Compression.CompressionLevel]::Optimal,$false)`,
], { stdio: 'inherit' });

// A zip always starts with "PK"; anything else means the archive is not a zip.
const signature = readFileSync(target).subarray(0, 2).toString('latin1');
if (signature !== 'PK') {
  console.error(`${zip} is not a zip archive (starts with ${JSON.stringify(signature)})`);
  process.exit(1);
}

const listing = execFileSync('powershell', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[System.IO.Compression.ZipFile]::OpenRead('${target}'); $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose()`,
], { encoding: 'utf8' });

for (const required of ['.htaccess', 'index.html']) {
  if (!listing.split(/\r?\n/).some((line) => line.trim() === required)) {
    console.error(`${zip} does not contain ${required}`);
    process.exit(1);
  }
}

const mb = (statSync(zip).size / 1048576).toFixed(1);
console.log(`entries: ${listing.split(/\r?\n/).filter((l) => l.trim()).length}`);
console.log(`\n${zip} ready (${mb} MB), API at ${apiBase}`);
console.log('Upload it to the domain folder in cPanel File Manager (Domains -> Document Root), then Extract.');
