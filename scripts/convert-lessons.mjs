// Re-encodes the lecture recordings so an iPhone can decode them.
//
// The originals are x264 "veryslow" output: Main profile, level 5.1, 14 reference
// frames. Apple's hardware decoder refuses that, which is why the picture stayed
// black on an iPhone while the sound carried on. High profile at level 4.0 with 4
// reference frames is what every iPhone in service can decode, and +faststart moves
// the index to the front of the file so playback starts without reading the tail.
//
// Usage:  node scripts/convert-lessons.mjs "D:/CCNA1 Course/Final" "Shrinked Vidoes"
//
// Safe to stop and re-run: finished files are skipped, and each file is written to a
// .part name first so an interrupted encode is never mistaken for a finished one.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';

const [sourceDir, outName = 'Shrinked Videos'] = process.argv.slice(2);
if (!sourceDir) {
  console.error('Usage: node scripts/convert-lessons.mjs "<folder with the .mp4 files>" [output folder name]');
  process.exit(1);
}

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const targetDir = join(sourceDir, outName);
mkdirSync(targetDir, { recursive: true });

const seconds = (file) => {
  try {
    const out = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    return Number(out.trim()) || 0;
  } catch { return 0; }
};

const clock = (value) => {
  const total = Math.round(value);
  return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const files = readdirSync(sourceDir)
  .filter((name) => name.toLowerCase().endsWith('.mp4'))
  .filter((name) => statSync(join(sourceDir, name)).isFile())
  .sort();

const pending = files.filter((name) => !existsSync(join(targetDir, name)));
const totalSeconds = pending.reduce((sum, name) => sum + seconds(join(sourceDir, name)), 0);

console.log(`${files.length} files, ${files.length - pending.length} already done, ${pending.length} to encode`);
console.log(`${clock(totalSeconds)} of video into ${targetDir}\n`);

let doneSeconds = 0;
const startedAt = Date.now();

for (const [index, name] of pending.entries()) {
  const source = join(sourceDir, name);
  const finished = join(targetDir, name);
  const partial = join(targetDir, `${parse(name).name}.part.mp4`);
  rmSync(partial, { force: true });

  const length = seconds(source);
  const label = `[${index + 1}/${pending.length}] ${name}`;
  process.stdout.write(`${label}\n`);

  const code = await new Promise((resolve) => {
    const child = spawn(FFMPEG, [
      '-hide_banner', '-v', 'error', '-stats', '-y',
      '-i', source,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      // The three settings that decide whether an iPhone will show a picture.
      '-profile:v', 'high', '-level', '4.0', '-refs', '4',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      partial,
    ], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('close', resolve);
  });

  if (code !== 0 || !existsSync(partial)) {
    console.error(`  failed (exit ${code}) -- left the original alone and carrying on\n`);
    rmSync(partial, { force: true });
    continue;
  }

  // A truncated encode is worse than none: check the result really is the full length.
  const madeLength = seconds(partial);
  if (length && Math.abs(madeLength - length) > 2) {
    console.error(`  length mismatch: ${clock(madeLength)} of ${clock(length)} -- discarded\n`);
    rmSync(partial, { force: true });
    continue;
  }

  renameSync(partial, finished);
  doneSeconds += length;
  const before = statSync(source).size;
  const after = statSync(finished).size;
  const elapsed = (Date.now() - startedAt) / 1000;
  const rate = doneSeconds / elapsed;
  const left = (totalSeconds - doneSeconds) / (rate || 1);
  console.log(`  ${(before / 1048576).toFixed(0)}MB -> ${(after / 1048576).toFixed(0)}MB  (${Math.round((1 - after / before) * 100)}% smaller)  ${rate.toFixed(1)}x realtime  about ${clock(left)} left\n`);
}

console.log(`done in ${clock((Date.now() - startedAt) / 1000)} -- ${targetDir}`);
