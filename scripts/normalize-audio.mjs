// Brings every lecture to the same loudness.
//
// The recordings were made at very different microphone levels: measured across both
// courses, most sit around -36 dB mean while a few sit near -19 dB. That is a gap of
// roughly 17 dB, which a laptop hides behind its own loudness compensation but a phone
// speaker cannot, so the quiet lectures sound like they have no audio at all.
//
// Two-pass EBU R128 (the broadcast standard) measures each file, then applies a single
// linear gain -- no compression, no pumping, the speech keeps its own dynamics. The
// video stream is copied bit for bit, so picture quality is untouched and a file takes
// a couple of minutes instead of an hour.
//
// Usage:  node scripts/normalize-audio.mjs "D:/CCNA4 Course/Final/iOS Ready"
//
// Safe to stop and re-run: finished files are skipped and each file is written under a
// .part name until it has passed verification.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';

const [sourceDir, outName = 'Normalized Audio'] = process.argv.slice(2);
if (!sourceDir) {
  console.error('Usage: node scripts/normalize-audio.mjs "<folder with the .mp4 files>" [output folder name]');
  process.exit(1);
}

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const TARGET_LUFS = -16;
const TRUE_PEAK = -1.5;
const LOUDNESS_RANGE = 11;

const targetDir = join(sourceDir, outName);
mkdirSync(targetDir, { recursive: true });

const run = (args) => {
  const result = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return `${result.stdout || ''}${result.stderr || ''}`;
};

const videoFacts = (file) => execFileSync(FFPROBE, [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,nb_frames',
  '-of', 'csv=p=0', file,
], { encoding: 'utf8' }).trim();

const duration = (file) => Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim()) || 0;

const meanVolume = (file, at) => {
  const text = run(['-ss', String(at), '-t', '45', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-']);
  return Number((text.match(/mean_volume: (\S+)/) || [])[1] ?? NaN);
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

console.log(`${files.length} files, ${files.length - pending.length} already done, ${pending.length} to normalize`);
console.log(`target ${TARGET_LUFS} LUFS, true peak ${TRUE_PEAK} dB, into ${targetDir}\n`);

const startedAt = Date.now();
let failures = 0;

for (const [index, name] of pending.entries()) {
  const source = join(sourceDir, name);
  const finished = join(targetDir, name);
  const partial = join(targetDir, `${parse(name).name}.part.mp4`);
  rmSync(partial, { force: true });
  console.log(`[${index + 1}/${pending.length}] ${name}`);

  // Pass 1: measure.
  const analysis = run(['-i', source, '-vn', '-af', `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=${LOUDNESS_RANGE}:print_format=json`, '-f', 'null', '-']);
  const json = analysis.slice(analysis.lastIndexOf('{'), analysis.lastIndexOf('}') + 1);
  let measured;
  try { measured = JSON.parse(json); } catch {
    console.error('  could not measure the loudness -- skipped\n');
    failures += 1;
    continue;
  }
  console.log(`  measured ${Number(measured.input_i).toFixed(1)} LUFS, peak ${Number(measured.input_tp).toFixed(1)} dB -> raising by ${(TARGET_LUFS - Number(measured.input_i)).toFixed(1)} dB`);

  // Pass 2: raise it, keeping the picture bit for bit.
  // Three strategies, gentlest first. Most lectures need only a single fixed gain.
  // A few change level part way through -- one sits at -35 dB for its first quarter
  // and -14 dB in the middle -- and for those a fixed gain, or even loudnorm's own
  // dynamic mode, leaves the quiet stretches inaudible on a phone. Those get a gain
  // that follows the recording over a moving window.
  const measuredArgs = [
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
  ].join(':');
  const loudnorm = (linear) => `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=${LOUDNESS_RANGE}:${measuredArgs}:linear=${linear}:print_format=summary`;

  const strategies = [
    ['a fixed gain', loudnorm('true')],
    ['loudnorm following the level', loudnorm('false')],
    // f: window in ms, g: smoothing, m: how much it may lift, p: how close to the peak.
    ['a moving-window gain', `dynaudnorm=f=400:g=21:p=0.9:m=25:r=0.0:n=1,alimiter=limit=0.89`],
  ];

  const length = duration(source);
  const probePoints = [0.05, 0.25, 0.5, 0.75, 0.92].map((f) => Math.round(length * f));

  let accepted = null;
  let level = NaN;
  let broken = '';
  for (const [label, filter] of strategies) {
    rmSync(partial, { force: true });
    run(['-y', '-i', source, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', filter,
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', partial]);
    if (!existsSync(partial)) { broken = 'ffmpeg produced nothing'; continue; }

    const sameVideo = videoFacts(source) === videoFacts(partial);
    const sameLength = Math.abs(duration(source) - duration(partial)) <= 2;
    if (!sameVideo || !sameLength) {
      broken = `video ${sameVideo ? 'ok' : 'changed'}, length ${sameLength ? 'ok' : 'differs'}`;
      break;
    }

    // Sampled across the whole lecture, so an uneven recording cannot slip through.
    const samples = probePoints.map((at) => meanVolume(partial, at)).filter(Number.isFinite);
    if (!samples.length) { broken = 'could not measure the result'; break; }
    level = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    if (Math.min(...samples) > -28) { accepted = label; break; }
    broken = `quietest stretch still at ${Math.min(...samples).toFixed(1)} dB`;
  }

  if (!accepted) {
    console.error(`  ${broken} -- discarded
`);
    rmSync(partial, { force: true });
    failures += 1;
    continue;
  }

  renameSync(partial, finished);
  console.log(`  ${accepted}: now ${level.toFixed(1)} dB mean, picture untouched, ${(statSync(finished).size / 1048576).toFixed(0)}MB
`);
}

console.log(`done in ${clock((Date.now() - startedAt) / 1000)} -- ${targetDir}`);
if (failures) console.log(`${failures} file(s) need attention`);
