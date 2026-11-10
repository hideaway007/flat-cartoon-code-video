// Render a stage JSON (export_stage.py) with stagejs/stage.js in headless Chrome, in parallel:
// node stage.mjs stage_assets/seg01_0-15.json [--jobs 4] [--stills 0,100,200] [--out out/name.mp4]
// Each job = its own Chrome (own GPU/renderer process) rendering a contiguous frame range -> raw RGBA over a
// WebSocket -> its own ffmpeg (x264) chunk; chunks are concatenated losslessly and the narration is muxed in.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { WebSocketServer } from 'ws';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                 // project root: serves assets/ and this folder
const BASE = '/' + path.basename(HERE);               // URL of this folder (<project>/threejs -> /threejs)
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const dataRel = args[0];
const JOBS = +opt('--jobs', 4);
const EXTRA = args.includes('--onetake') ? '&onetake=1' : '';
const stills = args.includes('--stills') ? opt('--stills').split(',').map(Number) : null;
const name = path.basename(dataRel, '.json');
const OUT = path.resolve(HERE, opt('--out', `out/${name}_threejs.mp4`));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const sinks = new Map();                                   // job id -> { ff, n, waiters }
const wss = new WebSocketServer({ server, maxPayload: 64 << 20 });
wss.on('connection', (ws, req) => {
  const job = sinks.get(+new URL(req.url, 'http://x').searchParams.get('job'));
  ws.on('message', async (buf) => {
    if (!job.ff.stdin.write(buf)) await new Promise((r) => job.ff.stdin.once('drain', r));
    job.n += 1; job.waiters.splice(0).forEach((r) => r());
  });
});
const until = (job, n) => new Promise((r) => { const c = () => (job.n >= n ? r() : job.waiters.push(c)); c(); });

const T0 = Date.now();
async function openPage() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('404')) console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}${BASE}/stage.html?data=${BASE}/${dataRel}${EXTRA}`);
  await page.waitForFunction('window.stageReady === true', { timeout: 300000 });
  return { browser, page };
}

if (stills) {
  const { browser, page } = await openPage();
  for (const k of stills) {
    const url = await page.evaluate((k) => window.renderFrameAt(k, true), k);
    fs.writeFileSync(path.join(HERE, 'out', `${name}${EXTRA ? '_ot' : ''}_f${String(k).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(`${stills.length} stills in ${((Date.now() - T0) / 1000).toFixed(1)} s`);
  await browser.close(); server.close(); process.exit(0);
}

const info0 = JSON.parse(fs.readFileSync(path.join(HERE, dataRel)));
const NF = Math.round((info0.t1 - info0.t0) * info0.fps);
const per = Math.ceil(NF / JOBS);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-'));
const t1 = Date.now();
const results = await Promise.all(Array.from({ length: JOBS }, async (_, j) => {
  const a = j * per, b = Math.min(NF, a + per);
  if (a >= b) return null;
  const chunk = path.join(tmp, `c${j}.mp4`);
  const ff = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', String(info0.fps), '-i', '-',
    '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', chunk], { stdio: ['pipe', 'inherit', 'inherit'] });
  const job = { ff, n: 0, waiters: [] }; sinks.set(j, job);
  const { browser, page } = await openPage();
  const ready = Date.now();
  await page.evaluate((port, j) => new Promise((ok) => { window.frameSocket = new WebSocket(`ws://localhost:${port}/?job=${j}`); window.frameSocket.binaryType = 'arraybuffer'; window.frameSocket.onopen = ok; }), port, j);
  for (let k = a; k < b; k += 4) {
    const end = Math.min(b, k + 4);
    await page.evaluate((s, e) => { for (let i = s; i < e; i++) window.renderFrameAt(i, 'raw'); }, k, end);
    if (end - a - job.n > 6) await until(job, end - a - 6);
  }
  await until(job, b - a);
  const charMs = await page.evaluate(() => window.charMsTotal());
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log(`job ${j}: frames ${a}-${b - 1} in ${((Date.now() - ready) / 1000).toFixed(1)} s (character drawing ${(charMs / (b - a)).toFixed(0)} ms/frame)`);
  return chunk;
}));
const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, results.filter(Boolean).map((c) => `file '${c}'`).join('\n'));
const wav = path.join(HERE, dataRel.replace(/\.json$/, '.wav'));
spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT], { stdio: 'inherit' });
const secs = (Date.now() - t1) / 1000;
console.log(`${OUT}\n${NF} frames, ${JOBS} jobs: render ${secs.toFixed(1)} s (${(secs / NF * 1000).toFixed(0)} ms/frame), total incl. startup ${((Date.now() - T0) / 1000).toFixed(1)} s`);
server.close(); process.exit(0);
