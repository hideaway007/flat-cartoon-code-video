// Ephemeral test fixture server; closes with Chrome after rendering the cases.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
const only=process.argv.slice(2);
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><canvas width="1920" height="1080"></canvas>');return;}
  const file=path.resolve(ROOT,'.'+url);
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.json')?'application/json':file.endsWith('.ttf')?'font/ttf':'text/javascript');
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
  const page=await browser.newPage();
  page.on('pageerror',e=>console.error('PAGE ERROR',e));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result=await page.evaluate(async only=>{
    const O=await import('/stagejs/overlays.js');await O.init('/');
    const cases=await (await fetch('/stagejs/test_overlays/cases.json')).json();
    const cv=document.querySelector('canvas'),ctx=cv.getContext('2d'),results=[];
    for(const c of cases) {
      if(only.length&&!only.some(prefix=>c.id.startsWith(prefix))) continue;
      ctx.clearRect(0,0,1920,1080);ctx.fillStyle='rgb(128,128,128)';ctx.fillRect(0,0,1920,1080);
      const before=performance.now();O.drawOverlay(ctx,c.L,c.sh,c.t,c.tn,c.shk);
      results.push({id:c.id,ms:performance.now()-before,png:cv.toDataURL('image/png').split(',')[1]});
      // Draw to an actual transparent HUD as well; alpha should survive composition.
      const hud=new OffscreenCanvas(1920,1080),hx=hud.getContext('2d');
      O.drawOverlay(hx,c.L,c.sh,c.t,c.tn,c.shk);
      const hc=hx.getImageData(0,0,1920,1080).data;
      results.at(-1).transparentPixels=hc.reduce((a,v,i)=>a+(i%4===3&&v===0?1:0),0);
    }
    const metrics=await (await fetch('/stagejs/test_overlays/metrics.json')).json();
    const metricResults=metrics.map(m=>{
      const spr=O.text_sprite(m.text,m.size,undefined,undefined,m.stroke,m.fname);
      const p=new OffscreenCanvas(4,4).getContext('2d');p.font=`${m.size*2}px ${m.fname==='main'?'OverlayLilita':'OverlayBangers'}`;
      const mm=p.measureText(m.text);return {...m,js:[spr.width,spr.height],measure:{width:mm.width,left:mm.actualBoundingBoxLeft,right:mm.actualBoundingBoxRight,ascent:mm.actualBoundingBoxAscent,descent:mm.actualBoundingBoxDescent}};
    });
    const shake=await (await fetch('/stagejs/test_overlays/shakes.json')).json();
    for(const [t,expected] of shake.expected) {const actual=O.extraShake(shake.sh,t);if(actual.some((v,i)=>Math.abs(v-expected[i])>1e-10)) throw new Error(`Shake mismatch at ${t}`);}
    return {results,metrics:metricResults};
  },only);
  fs.mkdirSync(path.join(HERE,'js'),{recursive:true});
  for(const r of result.results) {fs.writeFileSync(path.join(HERE,'js',r.id+'.png'),Buffer.from(r.png,'base64'));delete r.png;}
  fs.writeFileSync(path.join(HERE,'js_results.json'),JSON.stringify(result,null,2));
  console.log(`${result.results.length} Chrome renders passed; extraShake matched Python.`);
  for(const m of result.metrics) console.log(m.text,`${m.width}x${m.height} Python`,`${m.js.join('x')} JS`,JSON.stringify(m.measure));
} finally {
  if(browser) await browser.close();await new Promise(resolve=>server.close(resolve));
}
