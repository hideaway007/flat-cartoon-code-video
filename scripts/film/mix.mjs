// mix.mjs — put a narration over a film's sound bed. The bed is turned down and ducks under the voice, then the mix is set to a loudness.
//   node mix.mjs <bed.wav> <narration.wav> <out.wav> [--at 0] [--bed -6] [--lufs -14]
//   --at    seconds into the film where the narration file starts (default 0). Negative = this film is a later chapter:
//           --at -63.2 starts the film 63.2 s into the narration file
//   --bed   gain of the bed in dB before it ducks (default -6: a bed mastered on its own is too loud under a voice)
//   --lufs  integrated loudness of the result (default -14); a limiter keeps the sample peak at -1.5 dBFS
// The result is as long as the bed (= the film), 48 kHz 16-bit stereo; the narration may be mono and at any sample rate.
// Then: node render.mjs video <page> 0 <dur> 30 out/film.mp4 out/master.wav
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ffmpegPath } from './ffmpeg.mjs';

const FFMPEG = ffmpegPath(), argv = process.argv.slice(2), files = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i < 0 ? def : Number(argv[i + 1]); };
const [bed, vo, out] = files, at = opt('at', 0), bedDb = opt('bed', -6), target = opt('lufs', -14);
if (!bed || !vo || !out || [at, bedDb, target].some(Number.isNaN)) { console.error('usage: node mix.mjs <bed.wav> <narration.wav> <out.wav> [--at 0] [--bed -6] [--lufs -14]'); process.exit(1); }
function ff(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8' });
  if (r.error) { console.error('ffmpeg not found: set FFMPEG=/path/to/ffmpeg, or run setup_film.mjs again'); process.exit(1); }
  return r;
}
const fail = (what, r) => { console.error(what + '\n' + r.stderr.trim().split('\n').slice(-6).join('\n')); process.exit(1); };
// how long the film is
const info = ff(['-i', bed]).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
if (!info) { console.error('cannot read ' + bed); process.exit(1); }
const dur = Number(info[1]) * 3600 + Number(info[2]) * 60 + Number(info[3]);
const measure = f => { const q = ff(['-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-']), s = q.stderr.slice(q.stderr.lastIndexOf('Summary:')); return [Number((s.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]), Number((s.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1])]; };
// 1 the mix. The voice is brought to -16 LUFS first, so the balance does not depend on how loud the TTS file is; then it keys a compressor on the bed
const [v0] = measure(vo), voDb = Number.isNaN(v0) ? 0 : -16 - v0;
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const tmp = path.resolve(out) + '.tmp.wav';
const place = at < 0 ? `atrim=start=${-at},asetpts=PTS-STARTPTS` : `adelay=${Math.round(at * 1000)}:all=1`;
const graph = `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${voDb.toFixed(2)}dB,${place},apad=whole_dur=${dur},atrim=0:${dur},asplit=2[vo][key];` +
  `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${bedDb}dB[b];[b][key]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[duck];` +
  `[duck][vo]amix=inputs=2:duration=first:normalize=0[m]`;
let r = ff(['-y', '-loglevel', 'error', '-i', bed, '-i', vo, '-filter_complex', graph, '-map', '[m]', '-c:a', 'pcm_f32le', tmp]);
if (r.status) fail('the mix failed', r);
// 2 measure, 3 set the level
const [i0] = measure(tmp);
if (Number.isNaN(i0)) { console.error('cannot measure the mix'); process.exit(1); }
r = ff(['-y', '-loglevel', 'error', '-i', tmp, '-af', `volume=${(target - i0).toFixed(2)}dB,alimiter=limit=0.84:attack=5:release=50:level=disabled`, '-ar', '48000', '-c:a', 'pcm_s16le', out]);
rmSync(tmp, { force: true });
if (r.status) fail('levelling failed', r);
const [i1, tp] = measure(out);
console.log(`wrote ${out}: ${dur.toFixed(2)} s, ${i1} LUFS, true peak ${tp} dBFS (bed ${bedDb} dB, narration ${voDb >= 0 ? '+' : ''}${voDb.toFixed(1)} dB, from ${at} s)`);
