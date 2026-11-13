// sheet.mjs — contact sheet: render stills of a page and tile them into one image, in time order. Review this, not single frames.
//   node sheet.mjs <page> 0.9,2.6,4.5,5.5 [cols=3] [cellWidth=640]   ->   stills/_sheet_<name>.jpg
// <page> as for render.mjs. A dense run (every 0.1 s across one shot, or the frames either side of each cut) shows motion and cuts.
// ffmpeg: see ffmpeg.mjs.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ffmpegPath } from './ffmpeg.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = ffmpegPath();
const [page, times, cols = '3', cw = '640'] = process.argv.slice(2);
if (!page || !times) { console.error('usage: node sheet.mjs <page> t1,t2,... [cols] [cellWidth]'); process.exit(1); }
const ts = times.split(',').map(Number), C = Number(cols), w = Number(cw), h = Math.round(w * 9 / 16 / 2) * 2;
const r = spawnSync(process.execPath, [path.join(ROOT, 'render.mjs'), 'stills', page, ts.join(',')], { cwd: ROOT, encoding: 'utf8' });
const noise = (r.stdout + r.stderr).split('\n').filter(l => l.trim() && !l.startsWith('wrote')).join('\n');
if (noise) console.error(noise);
if (r.status) process.exit(r.status);
const base = path.basename(page, '.html'), name = base === 'index' && /[\\/]/.test(page) ? path.basename(path.dirname(page)) : base;   // as render.mjs names its stills
const args = ['-y', '-hide_banner', '-loglevel', 'error'];
ts.forEach(t => args.push('-i', path.join(ROOT, 'stills', `${name}_${t.toFixed(2)}.png`)));
let f = ts.map((_, i) => `[${i}:v]scale=${w}:${h}[v${i}]`).join(';');
if (ts.length > 1) f += ';' + ts.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${ts.length}:layout=${ts.map((_, i) => `${(i % C) * w}_${Math.floor(i / C) * h}`).join('|')}:fill=black[o]`;
const out = path.join(ROOT, 'stills', `_sheet_${name}.jpg`);
args.push('-filter_complex', f, '-map', ts.length > 1 ? '[o]' : '[v0]', '-frames:v', '1', '-q:v', '3', out);
const q = spawnSync(FFMPEG, args, { stdio: 'inherit' });
if (q.error) { console.error('ffmpeg not found: set FFMPEG=/path/to/ffmpeg, or run setup_film.mjs again'); process.exit(1); }
if (q.status) process.exit(q.status);
console.log('wrote', out);
