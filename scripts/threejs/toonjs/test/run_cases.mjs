// Render every test case with the JS port in headless Chrome -> test/js/<id>.png, test/js_result.json
// node toonjs/test/run_cases.mjs [id-prefix ...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                       // toonjs/
const only = process.argv.slice(2);
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (name === '/page.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><body></body>'); }
  const p = path.join(ROOT, name);
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.json') ? 'application/json' : 'text/javascript', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text()); });
await page.goto(`http://localhost:${port}/page.html`);
const out = await page.evaluate(async (only) => {
  const res = {};
  let mods;
  try {
    mods = {
      PO: await import('/poses.js'), HO: await import('/horse.js'), B: await import('/bust.js'),
      R: await import('/render.js'),
    };
  } catch (e) { return { __import_error: String(e && e.stack || e) }; }
  const cases = await (await fetch('/test/cases.json')).json();
  for (const c of cases) {
    if (only.length && !only.some((o) => c.id.startsWith(o))) continue;
    try {
      const d = c.design;
      const D = c.D;
      if (!D) throw new Error(`design ${JSON.stringify(d)} not exported`);
      const fn = (c.pose.mod === 'poses' ? mods.PO : mods.HO)[c.pose.fn];
      if (!fn) throw new Error(`pose ${c.pose.mod}.${c.pose.fn} not exported`);
      const p = fn({ ...c.kw });
      const t0 = performance.now();
      const r = mods.R.renderChar(D, p, c.M, { flip: c.flip, idle: c.idle });
      const ms = performance.now() - t0;
      const cv = new OffscreenCanvas(c.size[0], c.size[1]);
      if (r) cv.getContext('2d').drawImage(mods.R.toCanvas(r.img), r.x0, r.y0);
      const blob = await cv.convertToBlob({ type: 'image/png' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      res[c.id] = { ok: true, ms: Math.round(ms), png: btoa(s) };
    } catch (e) { res[c.id] = { ok: false, error: String(e && e.stack || e).slice(0, 800) }; }
  }
  return res;
}, only);
fs.mkdirSync(path.join(HERE, 'js'), { recursive: true });
const summary = {};
if (out.__import_error) { console.log('IMPORT ERROR', out.__import_error); summary.__import_error = out.__import_error; }
for (const [id, r] of Object.entries(out)) {
  if (id.startsWith('__')) continue;
  const f = path.join(HERE, 'js', `${id}.png`);
  if (r.ok) fs.writeFileSync(f, Buffer.from(r.png, 'base64')); else if (fs.existsSync(f)) fs.unlinkSync(f);
  summary[id] = r.ok ? { ok: true, ms: r.ms } : { ok: false, error: r.error };
}
summary.__console = [...new Set(logs)].slice(0, 30);
fs.writeFileSync(path.join(HERE, `js_result_${only.length ? only.map((o) => o.replace(/_$/, '')).join('_') : 'all'}.json`), JSON.stringify(summary, null, 1));
const ok = Object.values(summary).filter((v) => v && v.ok).length, bad = Object.entries(summary).filter(([k, v]) => !k.startsWith('__') && !v.ok);
console.log(`${ok} ok, ${bad.length} failed`);
for (const [k, v] of bad.slice(0, 10)) console.log(' FAIL', k, v.error.split('\n').slice(0, 3).join(' | '));
await browser.close();
server.close();
