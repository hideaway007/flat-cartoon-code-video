// render.mjs — headless Chrome renderer for the lineless style. A page defines window.renderFrame(t) on a 1920x1080 canvas.
//   node render.mjs stills <page> 0.8,2.6,4.3                -> stills/<page>_<t>.png
//   node render.mjs video  <page> 0 17.5 30 out/x.mp4 [audio.wav]   (audio is cut from t0, so chapters line up)
// <page> = a file in src/ (index.html) or a path with a slash (examples/ep02_ch1_0-17/index.html).
// Paths are relative to this folder. Chrome: CHROME=/path/to/chrome. ffmpeg: FFMPEG=/path or on PATH.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome',
  '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!CHROME) { console.error('Chrome not found: set CHROME=/path/to/chrome'); process.exit(1); }
const [mode, pageName, ...rest] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true, args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console', m => m.type() === 'error' && console.error('CONSOLE:', m.text()));
const pagePath = /[\\/]/.test(pageName) ? path.resolve(ROOT, pageName) : path.join(ROOT, 'src', pageName);
let failed = false;
page.on('pageerror', () => { failed = true; });
await page.goto(pathToFileURL(pagePath).href);
await page.evaluate(() => document.fonts.ready);

const grab = (t, type, q) => page.evaluate((t, type, q) => {
  window.renderFrame(t);
  return document.getElementById('c').toDataURL(type, q).split(',')[1];
}, t, type, q);

if (mode === 'stills') {
  mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
  for (const t of rest[0].split(',').map(Number)) {
    const f = path.join(ROOT, 'stills', `${path.basename(pageName, '.html')}_${t.toFixed(2)}.png`);
    writeFileSync(f, Buffer.from(await grab(t, 'image/png'), 'base64'));
    console.log('wrote', f);
  }
} else {
  const [t0, t1, fps, out, audio] = [Number(rest[0]), Number(rest[1]), Number(rest[2]), rest[3], rest[4]];
  mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (audio) args.push('-ss', String(t0), '-i', path.resolve(ROOT, audio));
  args.push('-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(path.resolve(ROOT, out));
  const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps);
  for (let i = 0; i < n; i++) {
    const buf = Buffer.from(await grab(t0 + i / fps, 'image/jpeg', 0.96), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', out);
}
await browser.close();
if (failed) { console.error('the page threw an error: the frames above are not valid'); process.exit(1); }
