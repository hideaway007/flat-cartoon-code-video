// Canvas2D port of production/overlays.py. Coordinates are 1920x1080; colours remain BGR.
// Await init(baseUrl) before drawing. All drawing is source-over onto a transparent HUD.
// Multiplicative, coloured spotlights cannot be represented exactly by source-over without
// reading the scene. Their RGBA approximation is exact over neutral 0.5 grey; see lightMask().
import { crom, ellipse_pts, rot, linspace, interp, pyround, get, clamp as clip } from '../toonjs/np.js';
import { css, INK, WHITE } from '../toonjs/painter.js';
import { npUniform } from '../toonjs/rng.js';

export const W = 1920, H = 1080, SS = 3, SPR = 2, OL = 4.5;
export const RED = [46,44,222], PAPER = [214,238,250], YELLOW = [58,204,255];
export const ORANGE = [40,140,245], BLUE = [236,186,104], GREEN = [86,196,104];
export const TYPES = ['circle','underline','arrow','label','title','caption_pop','counter','bars','route','spotlight','emote','meter','stamp','report_card','mood'];
export const EMOTES = ['question','exclaim','sweat','anger','sparkle','impact','speed'];
const clamp = (v,a=0,b=1) => clip(v,a,b), rad = d => d*Math.PI/180;
const add = (a,b) => [a[0]+b[0],a[1]+b[1]], sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
const mul = (a,s) => [a[0]*s,a[1]*s], len = a => Math.hypot(...a);
const shade = (c,k) => c.map(v=>Math.trunc(clamp(v*k,0,255)));
const eq = (a,b) => a.length===b.length && a.every((v,i)=>v===b[i]);
const cache = new Map(), fontInfo = new Map();
const families = {main:'OverlayLilita',comic:'OverlayBangers'};
const files = {main:'LilitaOne-Regular.ttf',comic:'Bangers-Regular.ttf'};
let initPromise;
const canvas = (w,h) => {
  const c = typeof OffscreenCanvas==='function' ? new OffscreenCanvas(Math.max(1,w),Math.max(1,h)) : document.createElement('canvas');
  c.width=Math.max(1,w); c.height=Math.max(1,h); return c;
};
function cachePut(key,v) { if(cache.size>600) cache.clear(); cache.set(key,v); return v; }
function fontMetrics(buffer) {
  const d=new DataView(buffer), tables={};
  for(let i=0;i<d.getUint16(4);i++) {
    const p=12+i*16, tag=String.fromCharCode(...new Uint8Array(buffer,p,4));
    tables[tag]=d.getUint32(p+8);
  }
  return {units:d.getUint16(tables.head+18), ascent:d.getInt16(tables.hhea+4)};
}
export async function init(baseUrl) {
  if(initPromise) return initPromise;
  initPromise=Promise.all(Object.entries(files).map(async ([name,file])=>{
    const url=`${baseUrl}stagejs/fonts/${file}`, response=await fetch(url);
    if(!response.ok) throw new Error(`Cannot load overlay font ${url}: ${response.status}`);
    const data=await response.arrayBuffer(); fontInfo.set(name,fontMetrics(data));
    const face=new FontFace(families[name],data); await face.load();
    (typeof document!=='undefined'?document.fonts:self.fonts).add(face);
  })).catch(e=>{initPromise=undefined;throw e;});
  await initPromise;
}
export const ease_out = (u,p=3) => 1-(1-clamp(u))**p;
export const ease_io = u => .5-.5*Math.cos(Math.PI*clamp(u));
export function back(u,s=1.9) { u=clamp(u)-1; return 1+u*u*((s+1)*u+s); }
export function pop(u,s=2.2) {
  if(u<=0) return 0; if(u>=1.6) return 1;
  return u>1 ? 1+.03*Math.sin((u-1)*2*Math.PI*1.6)*Math.exp(-(u-1)*6) : back(u,s);
}
// JSON preserves lists, not Python tuples. Explicit L.seed also preserves the seed of
// an original Python tuple-valued layer when serializing it to JSON.
function repr(v) {
  if(v===undefined||v===null) return 'None';
  if(v===true) return 'True'; if(v===false) return 'False';
  if(Array.isArray(v)) return '['+v.map(repr).join(', ')+']';
  if(typeof v==='string') {
    const quote=v.includes("'")&&!v.includes('"')?'"':"'";
    return quote+v.replace(/\\/g,'\\\\').replaceAll(quote,'\\'+quote).replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t')+quote;
  }
  return String(v);
}
export function _seed(L) {
  if('seed' in L) return Math.trunc(L.seed);
  const s='('+[L.type,L.at,L.pts,L.text,L.box].map(repr).join(', ')+')';
  return Array.from(s).reduce((a,ch,i)=>a+ch.codePointAt(0)*(i+1),0)%100003;
}
export function resample(p,step=2) {
  const d=[0]; for(let i=1;i<p.length;i++) d.push(d[i-1]+len(sub(p[i],p[i-1])));
  if(d.at(-1)<1e-6) return [[p[0].slice(),p[0].slice()],[0,0]];
  const s=linspace(0,d.at(-1),Math.max(Math.trunc(d.at(-1)/step),2)+1),xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);
  return [s.map(v=>[interp(v,d,xs),interp(v,d,ys)]),s];
}
export function wobble(p,s,seed,amp=1.6) {
  const ph=npUniform(seed,0,Math.PI*2,3);
  return p.map((v,i)=>{
    const d=sub(p[Math.min(i+1,p.length-1)],p[Math.max(0,i-1)]), n=len(d)+1e-9;
    const off=amp*(.6*Math.sin(s[i]/95+ph[0])+.3*Math.sin(s[i]/41+ph[1])+.15*Math.sin(s[i]/17+ph[2]));
    return [v[0]-d[1]/n*off,v[1]+d[0]/n*off];
  });
}
export function truncate(p,s,frac) {
  if(frac>=1) return [p,s]; const l=s.at(-1)*clamp(frac);
  let k=s.findIndex(v=>v>=l); if(k<=0) return [p.slice(0,1),s.slice(0,1)];
  k=Math.min(k,p.length-1); const u=(l-s[k-1])/Math.max(s[k]-s[k-1],1e-9);
  return [[...p.slice(0,k),add(p[k-1],mul(sub(p[k],p[k-1]),u))],[...s.slice(0,k),l]];
}
export function wobbly_rect(x0,y0,x1,y1,r=14,seed=0,amp=1.4) {
  const pts=[];
  for(const [cx,cy,a0] of [[x1-r,y0+r,-90],[x1-r,y1-r,0],[x0+r,y1-r,90],[x0+r,y0+r,180]])
    for(const a of linspace(a0,a0+90,7)) pts.push([cx+r*Math.cos(rad(a)),cy+r*Math.sin(rad(a))]);
  const [p,s]=resample([...pts,pts[0]],4); return wobble(p,s,seed,amp).slice(0,-1);
}
function path(ctx,p,closed=false) {
  if(!p.length) return; ctx.beginPath();ctx.moveTo(...p[0]);
  for(let i=1;i<p.length;i++) ctx.lineTo(...p[i]); if(closed) ctx.closePath();
}
class Canvas {
  constructor(x0,y0,x1,y1,ss=SS) {
    this.x0=Math.floor(x0);this.y0=Math.floor(y0);this.ss=ss;
    this.canvas=canvas(Math.max(Math.ceil(x1)-this.x0,1)*ss,Math.max(Math.ceil(y1)-this.y0,1)*ss);
    this.ctx=this.canvas.getContext('2d'); this.ctx.lineCap='round';this.ctx.lineJoin='round';
  }
  static around(p,pad,ss=SS) {
    const x0=Math.max(Math.min(...p.map(q=>q[0]))-pad,-4), y0=Math.max(Math.min(...p.map(q=>q[1]))-pad,-4);
    const x1=Math.min(Math.max(...p.map(q=>q[0]))+pad,W+4), y1=Math.min(Math.max(...p.map(q=>q[1]))+pad,H+4);
    return x1>x0&&y1>y0 ? new Canvas(x0,y0,x1,y1,ss) : null;
  }
  P(p) { return p.map(v=>[pyround((v[0]-this.x0)*this.ss*4)/4,pyround((v[1]-this.y0)*this.ss*4)/4]); }
  lw(w) { return Math.max(1,pyround(w*this.ss)); }
  stroke(p,widths,color) {
    if(!p.length) return; const q=this.P(p), c=this.ctx;
    const widthsA=Array.isArray(widths)?widths:q.map(()=>widths);
    c.strokeStyle=css(color);c.fillStyle=css(color);
    if(q.length===1) { c.beginPath();c.arc(...q[0],this.lw(widthsA[0]/2),0,2*Math.PI);c.fill();return; }
    for(let i=0;i<q.length-1;i++) {
      const n=this.lw((widthsA[i]+widthsA[i+1])/2);
      // LINE_8 thickLine rounds its radius upward and includes both boundary pixels.
      c.lineWidth=n===1?1:2*Math.ceil(n/2)+1;path(c,[q[i],q[i+1]]);c.stroke();
    }
  }
  marker(p,widths,color,ol=OL) {
    this.stroke(p,Array.isArray(widths)?widths.map(w=>w+2*ol):widths+2*ol,INK);this.stroke(p,widths,color);
  }
  poly(p,fill,line=OL,color=INK) {
    const c=this.ctx,q=this.P(p);if(!q.length) return;
    if(fill!==null) {path(c,q,true);c.fillStyle=css(fill);c.fill('evenodd');}
    if(line) {path(c,q,true);c.strokeStyle=css(color);const n=this.lw(line);c.lineWidth=n===1?1:2*Math.ceil(n/2)+1;c.stroke();}
  }
  dot(p,r,fill,line=OL) {this.poly(ellipse_pts(...p,r,r,0,28),fill,line);}
  paste(spr,ss,x,y) {
    this.ctx.drawImage(spr,pyround((x-this.x0)*this.ss),pyround((y-this.y0)*this.ss),spr.width*this.ss/ss,spr.height*this.ss/ss);
  }
  done(ctx,opacity=1) {
    ctx.save();ctx.globalAlpha*=opacity;ctx.drawImage(this.canvas,this.x0,this.y0,this.canvas.width/this.ss,this.canvas.height/this.ss);ctx.restore();
  }
}
const spriteCanvas = (w,h) => new Canvas(0,0,w,h,SPR);

// Pillow's default anchor is left-ascender. Keep advance-width whitespace and its
// integer glyph bounds, rather than centering Canvas's actual glyph bounding box.
export function text_sprite(text,size,fill=WHITE,ink=INK,stroke=null,fname='main',shadow=true,align='center',spacing=null,ss=SPR) {
  const key=JSON.stringify(['txt',text,size,fill,ink,stroke,fname,shadow,align,spacing,ss]);
  if(cache.has(key)) return cache.get(key);
  if(!fontInfo.has(fname)) throw new Error(`Overlay font ${fname} is not loaded; await init(baseUrl) first`);
  const px=Math.trunc(size*ss), family=families[fname], metric=fontInfo.get(fname);
  const sw=pyround((stroke===null?size*.11:stroke)*ss), sp=Math.trunc((spacing===null?size*.12:spacing)*ss);
  const probe=canvas(4,4).getContext('2d');probe.font=`${px}px ${family}`;probe.textBaseline='alphabetic';
  const lines=String(text).split('\n'), ms=lines.map(s=>probe.measureText(s));
  const asc=Math.ceil(px*metric.ascent/metric.units);
  const top=Math.min(...ms.map(m=>asc-pyround(m.actualBoundingBoxAscent)))-sw;
  const left=Math.min(0,...ms.map(m=>-Math.ceil(m.actualBoundingBoxLeft)))-sw;
  // PIL uses rounded text advance for the right edge unless the glyph overhangs it.
  const right=Math.max(...ms.map(m=>Math.max(pyround(m.width),Math.ceil(m.actualBoundingBoxRight))))+sw;
  const lineStep=asc+sp+2*sw;
  const bottom=Math.max(...ms.map((m,i)=>asc+pyround(m.actualBoundingBoxDescent)+i*lineStep))+sw;
  const pad=sw+Math.trunc(size*.12*ss)+4;
  const c=canvas(right-left+pad*2,bottom-top+pad*2),ctx=c.getContext('2d');
  ctx.font=probe.font;ctx.textBaseline='alphabetic';ctx.lineJoin='round';ctx.miterLimit=2;
  ctx.fillStyle=css(fill);ctx.strokeStyle=css(ink);ctx.lineWidth=sw*2;
  const maxAdvance=Math.max(...ms.map(m=>m.width));
  for(let i=0;i<lines.length;i++) {
    const off=align==='center'?(maxAdvance-ms[i].width)/2:align==='right'?maxAdvance-ms[i].width:0;
    const x=pad-left+off,y=pad-top+asc+i*lineStep;
    if(sw) ctx.strokeText(lines[i],x,y);ctx.fillText(lines[i],x,y);
  }
  if(shadow) {
    const sc=canvas(c.width,c.height),sx=sc.getContext('2d'),off=Math.max(2,Math.trunc(size*.07*ss));
    sx.drawImage(c,0,0);sx.globalCompositeOperation='source-in';sx.fillStyle=css(INK);sx.fillRect(0,0,c.width,c.height);
    ctx.save();ctx.globalCompositeOperation='destination-over';ctx.globalAlpha=.38;
    ctx.filter=`blur(${Math.max(1,size*.03*ss)}px)`;ctx.drawImage(sc,off,off);ctx.restore();
  }
  return cachePut(key,c);
}
export function place_sprite(ctx,spr,ss,anchor,pos,scale=1,angle=0,opacity=1) {
  if(scale<=.01||opacity<=.003) return;
  ctx.save();ctx.globalAlpha*=opacity;ctx.translate(...pos);ctx.rotate(rad(angle));ctx.scale(scale,scale);
  ctx.drawImage(spr,-anchor[0],-anchor[1],spr.width/ss,spr.height/ss);ctx.restore();
}
export class Ctx {
  constructor(L,sh,t,tn,shk) {
    let z=1,x=0,y=0;
    if(L.world) {
      const c=sh.cam,d=get(L,'depth',1),u=c.ease==='linear'?clamp(tn):c.ease==='out'?ease_out(tn):ease_io(tn);
      const lerp=(a,b)=>a+(b-a)*u;
      z=Math.fround(1+(lerp(get(c,'z0',1),get(c,'z1',1))-1)*d);
      const [fx,fy]=get(c,'focus',[W/2,H/2]);
      x=Math.fround(fx-z*fx-lerp(get(c,'x0',0),get(c,'x1',0))*d)+shk[0]*d;
      y=Math.fround(fy-z*fy-lerp(get(c,'y0',0),get(c,'y1',0))*d)+shk[1]*d;
    }
    this.k=Math.abs(z);this.A=[[z,0,x],[0,z,y]];this.L=L;this.t=t;
  }
  pt(p) {
    if(Array.isArray(p[0])) return p.map(v=>this.pt(v));
    return [p[0]*this.A[0][0]+this.A[0][2],p[1]*this.A[1][1]+this.A[1][2]];
  }
}
export function life(L,t) {
  const end='dur' in L?L.t+L.dur:get(L,'out',null);
  return [t-get(L,'t',0),end,end===null?1:clamp((end-t)/Math.max(get(L,'tout',.2),1e-3))];
}
function centered(ctx,spr,P,sc=1,angle=0,op=1) {place_sprite(ctx,spr,SPR,[spr.width/SPR/2,spr.height/SPR/2],P,sc,angle,op);}

export function caption_pop(ctx,c,L,age,outk) {
  const spr=text_sprite(L.text,get(L,'size',84),get(L,'fill',YELLOW),get(L,'ink',INK),null,get(L,'font','main'));
  const P=sub(c.pt(L.at),[0,get(L,'rise',18)*ease_out(age,2)*c.k]);
  centered(ctx,spr,P,pop(age/.25,2.6)*c.k*(.5+.5*outk),get(L,'rot',-6)+6*Math.sin(age*18)*Math.exp(-age*6),get(L,'opacity',1)*Math.min(outk*1.5,1));
}
function box_sprite(text,size,fill,ink,fname,seed) {
  const key=JSON.stringify(['box',text,size,fill,ink,fname,seed]);if(cache.has(key)) return cache.get(key);
  const ts=text_sprite(text,size,eq(fill,ink)?WHITE:ink,ink,0,fname,false),tw=ts.width/SPR,th=ts.height/SPR;
  const sh=Math.max(5,size*.12),w=tw+size*1.1+sh+2*OL,h=th+size*.64+sh+2*OL;
  const cv=spriteCanvas(w,h),x0=OL,y0=OL,x1=w-OL-sh,y1=h-OL-sh,r=Math.min(size*.35,(y1-y0)/2);
  cv.poly(wobbly_rect(x0+sh,y0+sh,x1+sh,y1+sh,r,seed+1),INK,0);
  cv.poly(wobbly_rect(x0,y0,x1,y1,r,seed),fill,OL);
  cv.paste(ts,SPR,(x0+x1)/2-tw/2,(y0+y1)/2-th/2-size*.04);
  return cachePut(key,[cv.canvas,w,h,(x0+x1)/2,(y0+y1)/2]);
}
export function label(ctx,c,L,age,outk) {
  const at=L.at,bc=get(L,'box',[at[0]+200,at[1]-170]);
  const [spr,w,h,cx,cy]=box_sprite(L.text,get(L,'size',54),get(L,'fill',PAPER),get(L,'ink',INK),get(L,'font','main'),_seed(L));
  const A=c.pt(at),B=c.pt(bc),lc=get(L,'line_color',INK),pl=clamp(age/.18),cv=Canvas.around([A,B],30*c.k);
  if(cv) {
    if(pl>0) {
      const d=sub(B,A),mid=add(mul(add(A,B),.5),mul([-d[1],d[0]],.08));
      const [p,s]=resample(crom([A,mid,B],false,10),2),[q]=truncate(p,s,ease_out(pl,2));
      if(q.length>1) {cv.stroke(q,6*c.k+5,eq(lc,INK)?WHITE:INK);cv.stroke(q,6*c.k,lc);}
    }
    if(get(L,'dot',true)) cv.dot(A,11*c.k*pop(age/.15),get(L,'fill',PAPER),4);
    cv.done(ctx,outk*get(L,'opacity',1));
  }
  place_sprite(ctx,spr,SPR,[cx,cy],B,pop((age-.1)/.28)*c.k*(.6+.4*outk),0,get(L,'opacity',1)*Math.min(outk*1.5,1));
}
function ribbon_sprite(text,subtext,size,band,fill,ink,fname,seed) {
  const key=JSON.stringify(['ribbon',text,subtext,size,band,fill,ink,fname,seed]);if(cache.has(key)) return cache.get(key);
  const ts=text_sprite(text,size,fill,ink,null,fname,false),tw=ts.width/SPR,th=ts.height/SPR;
  const ss=subtext?text_sprite(subtext,Math.trunc(size*.42),ink,ink,0,fname,false):null;
  const bw=tw+size*.9,bh=size*1.25,tail=size*.9,drop=size*.32;
  const w=bw+2*tail+2*OL+10,h=bh+drop+2*OL+10+(subtext?size*.75:0),cv=spriteCanvas(w,h);
  const x0=tail+OL+5,y0=OL+5,x1=x0+bw,y1=y0+bh,sag=size*.08;
  for(const sgn of [-1,1]) {
    const xe=sgn<0?x0:x1,xo=xe+sgn*tail;
    cv.poly([[xe-sgn*tail*.35,y0+drop],[xo,y0+drop],[xo-sgn*tail*.38,(y0+y1)/2+drop],[xo,y1+drop],[xe-sgn*tail*.35,y1+drop]],shade(band,.72));
    cv.poly([[xe,y1],[xe-sgn*tail*.35,y1+drop],[xe-sgn*tail*.35,y1]],shade(band,.5));
  }
  const bandPoly=[...crom([[x0,y0],[(x0+x1)/2,y0+sag],[x1,y0]],false,12),...crom([[x1,y1],[(x0+x1)/2,y1+sag],[x0,y1]],false,12)];
  const [p,s]=resample([...bandPoly,bandPoly[0]],4);cv.poly(wobble(p,s,seed,1.3).slice(0,-1),band);
  cv.poly([[x0+10,y0+12+sag*.4],[x1-10,y0+12+sag*.4]],null,3,shade(band,1.25));
  cv.paste(ts,SPR,(x0+x1)/2-tw/2,(y0+y1)/2-th/2+sag*.5);
  if(ss) {
    const sw=ss.width/SPR,sh=ss.height/SPR,pw=sw+size*.6,ph=sh+size*.1,px0=(x0+x1)/2-pw/2,py0=y1+drop*.25;
    cv.poly(wobbly_rect(px0,py0,px0+pw,py0+ph,size*.12,seed+3),PAPER,OL*.8);
    cv.paste(ss,SPR,(x0+x1)/2-sw/2,py0+ph/2-sh/2);
  }
  return cachePut(key,[cv.canvas,w,h,(x0+x1)/2,(y0+y1)/2]);
}
function paper_sprite(text,subtext,size,fill,ink,fname,seed) {
  const key=JSON.stringify(['paper',text,subtext,size,fill,ink,fname,seed]);if(cache.has(key)) return cache.get(key);
  const ts=text_sprite(text,size,ink,ink,0,fname,false),tw=ts.width/SPR,th=ts.height/SPR;
  const ss=subtext?text_sprite(subtext,Math.trunc(size*.45),ink,ink,0,fname,false):null;
  const sw=ss?ss.width/SPR:0,sh=ss?ss.height/SPR:0,pw=Math.max(tw,sw)+size*1.1,ph=th+sh+size*.7;
  const w=pw+40,h=ph+40,cv=spriteCanvas(w,h),x0=20,y0=20,x1=20+pw,y1=20+ph,pts=[];
  const sides=[[[x0,y0],[x1,y0]],[[x1,y0],[x1,y1]],[[x1,y1],[x0,y1]],[[x0,y1],[x0,y0]]];
  const ns=sides.map(([a,b])=>Math.max(4,Math.trunc(len(sub(b,a))/26))),js=npUniform(seed,-3.5,3.5,ns.reduce((a,b)=>a+b,0));let k=0;
  sides.forEach(([[ax,ay],[bx,by]],si)=>{
    for(let i=0;i<ns[si];i++) {const f=i/ns[si],j=js[k++];pts.push([ax+(bx-ax)*f+(ax===bx?j:0),ay+(by-ay)*f+(ay===by?j:0)]);}
  });
  cv.poly(pts.map(p=>add(p,[8,9])),INK,0);cv.poly(pts,fill);
  for(const [tx,ang] of [[x0+10,-35],[x1-10,35]]) cv.poly(rot([[-36,-12],[36,-12],[36,12],[-36,12]],rad(ang)).map(p=>add(p,[tx,y0+4])),[196,222,232],2.5);
  cv.paste(ts,SPR,(x0+x1)/2-tw/2,y0+size*.3);
  if(ss) cv.paste(ss,SPR,(x0+x1)/2-sw/2,y0+size*.3+th-size*.05);
  return cachePut(key,[cv.canvas,w,h,(x0+x1)/2,(y0+y1)/2]);
}
export function title(ctx,c,L,age,outk) {
  const size=get(L,'size',96),style=get(L,'style','ribbon'),fn=get(L,'font','main'),seed=_seed(L);
  const [spr,w,h,ax,ay]=style==='paper'?paper_sprite(L.text,L.sub,size,get(L,'fill',PAPER),get(L,'ink',INK),fn,seed):ribbon_sprite(L.text,L.sub,size,get(L,'band',RED),get(L,'fill',PAPER),get(L,'ink',INK),fn,seed);
  const angle=get(L,'rot',style==='paper'?-2:0),pos=get(L,'pos','center');
  const P=c.pt(pos==='center'?[W/2,H*.42]:pos==='top'?[W/2,h/2+40]:pos==='lower'?[w/2+70,H-h/2-70]:pos);
  const anim=get(L,'anim',pos==='lower'?'slide':'pop'),op=get(L,'opacity',1);
  if(anim==='slide') {
    const u=back(age/.45,1.3),dx=-(outk<1?(1-outk)**2:1-u)*(P[0]+w/2+40);
    place_sprite(ctx,spr,SPR,[ax,ay],[P[0]+dx,P[1]],c.k,angle,op);
  } else {
    const sc=pop(age/.32)*c.k*(outk<1?outk**.5:1),wig=age>0?3*Math.sin(age*14)*Math.exp(-age*5):0;
    place_sprite(ctx,spr,SPR,[ax,ay],P,sc,angle+wig,op*Math.min(outk*2,1));
  }
}
function format(v,fmt='{:,.0f}') {
  const m=fmt.match(/\{:(,)?(?:\.(\d+))?([fdeg%])?\}/);
  if(!m) return fmt.replace('{}',String(v));
  const decimals=Number(m[2]||0),percent=m[3]==='%',val=percent?v*100:v;
  let s=pyround(val,decimals).toFixed(decimals);
  if(m[1]) {const [a,b]=s.split('.');s=a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(b===undefined?'':'.'+b);}
  return fmt.replace(m[0],s+(percent?'%':''));
}
export function counter(ctx,c,L,age,outk) {
  const a=get(L,'a',0),b=L.b,dur=get(L,'count',1.2),u=clamp((age-.12)/dur),size=get(L,'size',110);
  const v=a+(b-a)*ease_out(u),str=v=>get(L,'prefix','')+format(v,get(L,'fmt','{:,.0f}'))+get(L,'suffix','');
  const txt=s=>text_sprite(s,size,get(L,'fill',WHITE),get(L,'ink',INK),null,get(L,'font','main'));
  const spr=txt(str(v)),final=txt(str(b)),P=c.pt(L.at),fw=final.width/SPR,fh=final.height/SPR;
  let sc=pop(age/.25)*c.k;const land=age-.12-dur;if(land>=0&&land<.3) sc*=1+.16*Math.sin(Math.PI*land/.3);
  sc*=.4+.6*outk; const op=get(L,'opacity',1)*Math.min(outk*1.5,1),lab=L.label;
  const ls=lab?text_sprite(lab,Math.trunc(size*.5),get(L,'label_fill',YELLOW),get(L,'ink',INK),null,get(L,'font','main')):null;
  if(L.card) {
    const lw=ls?ls.width/SPR:0,lh=ls?ls.height/SPR:0,right=get(L,'label_pos','below')==='right';
    const cw=right?fw+lw+size*.3:Math.max(fw,lw)+size*.4,ch=right?Math.max(fh,lh)+size*.2:fh+lh+size*.1;
    const off=right?[lw/2,0]:[0,lh/2-size*.05],key=JSON.stringify(['cardbg',Math.trunc(cw),Math.trunc(ch),_seed(L)]);
    let cs=cache.get(key);if(!cs) {
      const cv=spriteCanvas(cw+2*OL+12,ch+2*OL+12);
      cv.poly(wobbly_rect(OL+9,OL+9,cw+OL+9,ch+OL+9,size*.18,_seed(L)+1),INK,0);
      cv.poly(wobbly_rect(OL,OL,cw+OL,ch+OL,size*.18,_seed(L)),PAPER);cs=cachePut(key,cv.canvas);
    }
    place_sprite(ctx,cs,SPR,[cw/2+OL-off[0],ch/2+OL-off[1]],P,sc,0,op);
  }
  centered(ctx,spr,P,sc,0,op);
  if(ls) {
    const lu=pop((age-.25)/.28)*c.k*(.4+.6*outk),lw=ls.width/SPR,lh=ls.height/SPR;
    const Q=add(P,get(L,'label_pos','below')==='right'?[fw/2*sc+lw/2*lu-size*.05*c.k,size*.12*c.k]:[0,fh/2*sc+lh/2*lu-size*.22*c.k]);
    centered(ctx,ls,Q,lu,get(L,'label_rot',-2),op);
  }
}

// Pixel effects retain the Python low-resolution grid and bilinear enlargement.
// A colour-dependent multiplier cannot be scene-independent RGBA. For tint/warm,
// choose RGBA that reproduces the multiplier on 0.5 grey; dim/rays are exact for any scene.
const effectCanvas=canvas(W/2,H/2), effectCtx=effectCanvas.getContext('2d'),effectImages=new Map();
function lightMask(ctx,q,fn) {
  const w=W/q,h=H/q;
  if(effectCanvas.width!==w||effectCanvas.height!==h) {effectCanvas.width=w;effectCanvas.height=h;}
  if(!effectImages.has(q)) effectImages.set(q,effectCtx.createImageData(w,h));
  const im=effectImages.get(q),data=im.data;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const out=fn(x*q+q/2,y*q+q/2),o=(y*w+x)*4;
    if(out.length===4) {
      data[o]=out[2];data[o+1]=out[1];data[o+2]=out[0];data[o+3]=out[3]*255;
    } else {
      const a=clamp(Math.max(1-Math.min(out[0],out[1],out[2]),Math.max(out[0],out[1],out[2])-1)),base=1-a;
      for(let k=0;k<3;k++) data[o+2-k]=a?clamp(.5*(out[k]-base)/a)*255:0;
      data[o+3]=a*255;
    }
  }
  effectCtx.putImageData(im,0,0);ctx.drawImage(effectCanvas,0,0,W,H);
}
export function mood(ctx,c,L,age,outk,shot_t) {
  const kind=L.mode,u=ease_out(age/get(L,'fade',.35))*outk*get(L,'opacity',1);
  if(kind==='dim') {ctx.save();ctx.fillStyle=css([0,0,0],get(L,'amount',.4)*u);ctx.fillRect(0,0,W,H);ctx.restore();return;}
  const P=c.pt(get(L,'at',[W/2,H/2]));
  if(kind==='rays') {
    const n=Math.trunc(get(L,'n',18)),spin=rad(get(L,'spin',6))*shot_t,col=get(L,'color',[150,226,255]);
    const reach=get(L,'reach',1400)*c.k,alpha=get(L,'alpha',.35)*u,out=[...col,0];
    lightMask(ctx,2,(x,y)=>{
      const dx=x-P[0],dy=y-P[1],wedge=Math.cos((Math.atan2(dy,dx)+spin)*n)>.15?1:0;
      const fall=clamp(1-Math.sqrt(dx*dx+dy*dy)/reach)**.7;
      out[3]=wedge*fall*alpha;return out;
    });
  } else if(kind==='spotlight') {
    const r=get(L,'r',300)*c.k,soft=get(L,'soft',140)*c.k,dark=get(L,'dark',.85)*u,warm=get(L,'warm',[.88,1,1.06]);
    const aspect=get(L,'aspect',1),cone=get(L,'cone',true),out=[0,0,0];
    lightMask(ctx,2,(x,y)=>{
      const dx=(x-P[0])/aspect,dy=y-P[1],d=Math.sqrt(dx*dx+dy*dy);let lit=1-clamp((d-r)/Math.max(soft,1));
      if(cone) {
        const half=r*.55+(r-r*.55)*clamp(y/Math.max(P[1],1));
        const beam=(1-clamp((Math.abs(x-P[0])-half)/Math.max(soft*.6,1)))*(y<P[1]?1:0);
        lit=Math.max(lit,beam*.55);
      }
      const m=1-dark*(1-lit);for(let k=0;k<3;k++) out[k]=m*(1+(warm[k]-1)*lit*u);return out;
    });
  }
}
function keyValue(keys,t,defaults) {
  if(!keys||!keys.length) return defaults;
  if(t<=keys[0][0]) return keys[0].slice(1);if(t>=keys.at(-1)[0]) return keys.at(-1).slice(1);
  let i=0;while(keys[i+1][0]<=t) i++;
  const u=ease_io((t-keys[i][0])/Math.max(keys[i+1][0]-keys[i][0],1e-6));
  return keys[i].slice(1).map((a,j)=>Array.isArray(a)?a.map((v,k)=>v+(keys[i+1][j+1][k]-v)*u):a+(keys[i+1][j+1]-a)*u);
}
export function spotlight(ctx,c,L,age,outk,shot_t) {
  let [ctr,r]=keyValue(L.keys,shot_t,[L.at,get(L,'r',200)]);
  const u=ease_out(age/.45);r*=1+2.5*(1-u);r*=c.k;
  const P=c.pt(ctr),soft=get(L,'soft',70)*c.k,dark=get(L,'dark',.62)*u*outk*get(L,'opacity',1),tint=get(L,'tint',[.20,.12,.10]),out=[0,0,0];
  lightMask(ctx,4,(x,y)=>{const dx=x-P[0],dy=y-P[1];let m=clamp((Math.sqrt(dx*dx+dy*dy)-r)/Math.max(soft,1));m=m*m*(3-2*m);for(let k=0;k<3;k++) out[k]=1-dark*m*(1-tint[k]);return out;});
  if(L.ring) {
    const [p,s]=resample(ellipse_pts(...P,r+soft*.1,r+soft*.1,0,90),2),cv=Canvas.around(p,20);
    if(cv) {cv.stroke(wobble(p,s,_seed(L),1.2),4*c.k,INK);cv.done(ctx,u*outk*.8);}
  }
}
function star(n,r0,r1,angle=0,jag=null) {
  return linspace(0,Math.PI*2,2*n,false).map((a,i)=>{const r=(i%2?r1:r0)*(jag?jag[i]:1);a+=rad(angle);return [r*Math.cos(a),r*Math.sin(a)];});
}
function drop(cx,cy,s,ang=0) {
  return rot(linspace(0,Math.PI*2,40,false).map(t=>{
    const x=Math.sin(t)*(1-Math.cos(t))*.5*s*.95,y=-Math.cos(t)*s*1.05+.25*s;
    return [x,y*(y>0?.75:1.25)];
  }),rad(ang)).map(p=>add(p,[cx,cy]));
}
export function emote(ctx,c,L,age,outk) {
  const kind=L.symbol,s=get(L,'size',1)*c.k,P=c.pt(L.at),fl=L.flip?-1:1;
  const op=get(L,'opacity',1)*Math.min(outk*1.6,1),sc=pop(age/.28,2.6)*(.3+.7*outk),angle=get(L,'rot',0);
  if(sc<=.01) return;
  if(kind==='question'||kind==='exclaim') {
    const txt=L.text||((kind==='question'?'?':'!').repeat(get(L,'count',1))),sz=get(L,'size',1);
    const spr=text_sprite(txt,Math.trunc(200*sz),get(L,'color',kind==='question'?WHITE:RED),INK,16*sz,'comic',true,'center',0);
    const r=kind==='question'?angle+10*Math.sin(age*5)+14*Math.sin(age*20)*Math.exp(-age*5):angle+4*Math.sin(age*9);
    const dy=kind==='question'?0:-Math.abs(Math.sin(age*7.5))*10*s*Math.exp(-age*1.2);
    place_sprite(ctx,spr,SPR,[spr.width/SPR/2,spr.height/SPR*.92],add(P,[0,dy]),sc*c.k,r,op);return;
  }
  const seed=_seed(L),shapes=[];
  if(kind==='sweat') {
    const col=get(L,'color',BLUE);
    [[0,0,1,-18],[70,44,.72,-8],[-52,66,.55,-30]].forEach(([dx,dy,ds,da],i)=>{
      const slide=age>.3?(age*26*(.6+.3*i))%30:0,cx=dx*fl*s*sc,cy=(dy+slide*.6)*s*sc;
      shapes.push(['poly',drop(cx,cy,40*ds*s*sc,da*fl),col],['hl',drop(cx-10*ds*s*sc,cy+4*ds*s*sc,10*ds*s*sc,da*fl),WHITE]);
    });
  } else if(kind==='anger') {
    const pulse=age>.3?1+.12*Math.max(0,Math.sin(age*2*Math.PI*2.2))**3:1,k=46*s*sc*pulse;
    for(let q=0;q<4;q++) shapes.push(['line',rot(crom([[1,.2],[.36,.36],[.2,1]].map(p=>mul(p,k)),false,8),rad(90*q+angle)),get(L,'color',RED),15*s*sc]);
  } else if(kind==='sparkle') {
    for(const [dx,dy,ds,ph] of [[0,0,1,0],[96,-60,.62,1.7],[-80,-86,.5,3.1],[64,64,.42,4.4]].slice(0,get(L,'count',3))) {
      const tw=age>.3?.75+.25*Math.sin(age*7+ph):1;
      shapes.push(['poly',star(4,64*ds*s*sc*tw,17*ds*s*sc*tw,angle+age*40*(ph<2?1:-1)).map(p=>add(p,[dx*fl*s*sc,dy*s*sc])),get(L,'color',YELLOW)]);
    }
  } else if(kind==='impact') {
    const jag=npUniform(seed,.78,1.18,24),flick=age>.3?1+.04*Math.sin(age*40):1;
    shapes.push(['poly',star(12,150*s*sc*flick,82*s*sc,angle,jag),get(L,'color',YELLOW)],['poly',star(10,86*s*sc,50*s*sc,angle+9,jag.slice(0,20).map(v=>v**.5)),WHITE]);
  } else if(kind==='speed') {
    const d=rad(get(L,'dir',0)),dv=[Math.cos(d),Math.sin(d)],nv=[-dv[1],dv[0]],n=get(L,'count',6);
    const rng=npUniform(seed,0,1,n*2),r2=npUniform(seed+Math.trunc(age*15),0,1,n*2);
    for(let i=0;i<n;i++) {
      const off=(i-(n-1)/2)*36*s,ln=(140+140*rng[i*2])*s*(.85+.3*r2[i*2]);
      const st=mul(dv,-((10+50*rng[i*2+1])*s+r2[i*2+1]*14*s)),a=add(st,mul(nv,off)),b=sub(a,mul(dv,ln*ease_out(age/.18)));
      shapes.push(['taper',[a,b],get(L,'color',INK),11*s]);
    }
  } else return;
  const allp=shapes.flatMap(sp=>sp[1]).map(p=>add(p,P)),cv=Canvas.around(allp,30*s+12);if(!cv) return;
  for(const [kind,p0,col,width] of shapes) {
    const pts=p0.map(p=>add(p,P));
    if(kind==='poly') {const [p,ss]=resample([...pts,pts[0]],2);cv.poly(wobble(p,ss,seed,.8).slice(0,-1),col);}
    else if(kind==='hl') cv.poly(pts,col,0);
    else {const [p]=resample(pts,kind==='line'?2:3),us=linspace(0,1,p.length);if(kind==='line') cv.marker(p,us.map(u=>width*(.55+.45*Math.sin(Math.PI*u))),col);else cv.stroke(p,us.map(u=>width*(1-.85*u)),col);}
  }
  cv.done(ctx,op);
}

export function circle(ctx,c,L,age,outk) {
  let cx,cy,rx,ry;
  if('box' in L) {const [x0,y0,x1,y1]=L.box,pad=get(L,'pad',18);cx=(x0+x1)/2;cy=(y0+y1)/2;rx=(x1-x0)/2*1.12+pad;ry=(y1-y0)/2*1.12+pad;}
  else { [cx,cy]=L.at;const r=get(L,'r',110);[rx,ry]=typeof r==='number'?[r,r*.8]:r; }
  const seed=_seed(L),th=linspace(0,2*Math.PI*get(L,'turns',1.08),220).map(v=>v+rad(get(L,'start',-120))),rs=npUniform(seed,0,6,2);
  const loc=th.map(a=>{const u=(a-th[0])/(2*Math.PI),grow=.97+.06*u,jag=1+.025*Math.sin(2*a+rs[0])+.02*Math.sin(3*a+rs[1]);return [rx*grow*jag*Math.cos(a),ry*grow*jag*Math.sin(a)];});
  let [p,s]=resample(c.pt(rot(loc,rad(get(L,'tilt',-6))).map(v=>add(v,[cx,cy]))),2);p=wobble(p,s,seed,1.4*c.k);
  const prog=ease_out(age/get(L,'draw',.35),2);[p,s]=truncate(p,s,prog);if(p.length<2) return;
  const w=get(L,'width',16)*c.k,tot=s.at(-1)/Math.max(prog,1e-3),un=s.map(v=>v/tot),widths=un.map(v=>w*(.55+.45*clamp(v/.12))*(1-.45*clamp((v-.85)/.15)));
  const cv=Canvas.around(p,w+2*OL+6);if(!cv) return;let split=un.findIndex(v=>v>=.82);if(split<0) split=un.length;
  const col=get(L,'color',RED);cv.stroke(p.slice(0,split+1),widths.slice(0,split+1).map(v=>v+2*OL),INK);cv.stroke(p.slice(0,split+1),widths.slice(0,split+1),col);
  if(split<p.length-1) cv.marker(p.slice(split),widths.slice(split),col);cv.done(ctx,outk*get(L,'opacity',1));
}
function arrowhead(cv,tip,d,size,col,k=1) {
  d=mul(d,1/(len(d)+1e-9));const n=[-d[1],d[0]],s=size*k;
  cv.poly([add(tip,mul(d,s*.35)),add(sub(tip,mul(d,s*.85)),mul(n,s*.62)),sub(tip,mul(d,s*.55)),sub(sub(tip,mul(d,s*.85)),mul(n,s*.62))],col);
}
export function arrow(ctx,c,L,age,outk,headDefault=true) {
  let pts='span' in L&&!('pts' in L)?[[L.span[0],L.span[2]+3],[L.span[1],L.span[2]-3]]:L.pts;
  if(pts.length===2) {const [a,b]=pts,d=sub(b,a);pts=[a,add(mul(add(a,b),.5),mul([d[1],-d[0]],get(L,'bend',headDefault?.18:.04))),b];}
  const seed=_seed(L);let [p,s]=resample(c.pt(crom(pts,false,16)),2);p=wobble(p,s,seed,1.2*c.k);const strokes=[p];
  if(L.double&&!headDefault) {let q=p.map(v=>add(v,mul([6,13],c.k)));const mx=q.reduce((a,v)=>a+v[0],0)/q.length;q=q.map(v=>[v[0]*.92+mx*.08+18*c.k,v[1]]);strokes.push(wobble(q,s,seed+5,1.6*c.k));}
  const draw=get(L,'draw',.4),col=get(L,'color',RED),w=get(L,'width',12)*c.k,head=get(L,'head',headDefault),hs=get(L,'head_size',42),cv=Canvas.around(strokes.flat(),w+2*OL+hs*c.k+8);if(!cv) return;
  strokes.forEach((sp,i)=>{
    const prog=i?ease_io((age-i*.55*draw)/draw):ease_out(age/draw,2),[q,qs]=truncate(sp,s,prog);if(q.length<2) return;
    const widths=qs.map(v=>{const u=v/s.at(-1);return w*(.6+.4*clamp(u/.1))*(1-(head?0:.5)*clamp((u-.85)/.15));});cv.marker(q,widths,col);
  });
  if(head) {const hp=clamp((age-draw*.85)/.16);if(hp>0) arrowhead(cv,p.at(-1),sub(p.at(-1),p[Math.max(p.length-12,0)]),hs*back(hp,2.5),col,c.k);}
  cv.done(ctx,outk*get(L,'opacity',1));
}
export function route(ctx,c,L,age,outk) {
  const pts=get(L,'smooth',true)&&L.pts.length>2?crom(L.pts,false,14):L.pts,seed=_seed(L);
  let [p,s]=resample(c.pt(pts),2);p=wobble(p,s,seed,c.k);
  const draw=get(L,'draw',1.5),prog=ease_io(age/draw),[q,qs]=truncate(p,s,prog),col=get(L,'color',RED),w=get(L,'width',9)*c.k,hs=get(L,'head_size',36),cv=Canvas.around(p,w+2*OL+Math.max(hs*c.k,30)+10);if(!cv) return;
  if(q.length>1) {
    const style=get(L,'style','dash');
    if(style==='solid') cv.marker(q,w,col);
    else if(style==='dots') {const gap=get(L,'dash',[0,2.6*w])[1]||2.6*w;for(let d=0;d<qs.at(-1);d+=gap) cv.dot(q[Math.min(qs.findIndex(v=>v>=d),q.length-1)],w*.62,col,OL*.8);}
    else {
      const [on,off]=get(L,'dash',[30,18]).map(v=>v*c.k),segs=[];let start=null;
      for(let i=0;i<=qs.length;i++) {const yes=i<qs.length&&qs[i]%(on+off)<on;if(yes&&start===null) start=i;if(!yes&&start!==null) {segs.push([start,i]);start=null;}}
      for(const width of [w+2*OL,w]) for(const [a,b] of segs) if(b-a>1) cv.stroke(q.slice(a,b),width,width===w?col:INK);
    }
  }
  const done=clamp((age-draw)/.18);
  if(get(L,'head',true)&&done>0) {const d=sub(p.at(-1),p[Math.max(p.length-8,0)]),tip=add(p.at(-1),mul(d,6*c.k/(len(d)+1e-9)));arrowhead(cv,tip,sub(p.at(-1),p[Math.max(p.length-14,0)]),hs*back(done,2.5),col,c.k);}
  if(get(L,'marker',true)&&age>=0&&q.length&&!(get(L,'head',true)&&done>=1)) cv.dot(q.at(-1),get(L,'marker_r',17)*c.k*pop(age/.2),get(L,'marker_color',WHITE));
  cv.done(ctx,outk*get(L,'opacity',1));
}

export function bars(ctx,c,L,age,outk) {
  const items=L.items,n=items.length,[x0,yb]=L.at,[bw,bh]=get(L,'size',[520,300]),vmax=L.max||Math.max(...items.map(it=>it[1]));
  const cols=get(L,'colors',[RED,BLUE,YELLOW,GREEN]),grow=get(L,'grow',.7),stag=get(L,'stagger',.18),ls=get(L,'label_size',44),op=get(L,'opacity',1)*outk,seed=_seed(L);
  const slot=bw/n,barw=slot*.6,ttl=L.title,pad=30,topExtra=ls*1.6+(ttl?ls*1.5:0),bx0=x0-pad,by0=yb-bh-topExtra-pad*.5,bx1=x0+bw+pad,by1=yb+ls*1.5+pad*.6;
  const cv=Canvas.around(c.pt([[bx0,by0],[bx1,by1]]),14);if(!cv) return;
  const k=c.k,cu=pop(age/.25,1.4),card=get(L,'card',true),texts=[];
  if(card&&cu>0) {const ctr=[(bx0+bx1)/2,(by0+by1)/2],r=wobbly_rect(bx0,by0,bx1,by1,22,seed).map(p=>add(mul(sub(p,ctr),cu),ctr));cv.poly(c.pt(r.map(p=>add(p,[9,10]))),INK,0);cv.poly(c.pt(r),PAPER);}
  let [bp,bs]=resample(c.pt([[x0-12,yb],[x0+bw+12,yb]]),2);[bp,bs]=truncate(wobble(bp,bs,seed+2,1.2),bs,ease_out(age/.3));
  items.forEach((it,i)=>{
    const [lab,val]=it,col=it.length>2?it[2]:cols[i%cols.length],g=age>.2+i*stag?back((age-.2-i*stag)/grow,1.5):0,hgt=bh*val/vmax*g,cx=x0+slot*(i+.5);
    if(hgt>1) {const q=[[cx-barw/2,yb],[cx-barw/2,yb-hgt],[cx+barw/2,yb-hgt],[cx+barw/2,yb]],sh=[[cx+barw*.22,yb],[cx+barw*.22,yb-hgt],[cx+barw/2,yb-hgt],[cx+barw/2,yb]];cv.poly(c.pt(q),col,0);cv.poly(c.pt(sh),shade(col,.8),0);cv.poly(c.pt(q),null);}
    const vt=clamp((age-.2-i*stag)/grow);
    if(vt>0) texts.push([format(val*ease_out(vt),get(L,'fmt','{:,.0f}'))+get(L,'suffix',''),[cx,yb-hgt-ls*.75],ls,WHITE,pop(vt/.4)]);
    texts.push([lab,[cx,yb+ls*.75],Math.trunc(ls*.85),card?INK:WHITE,pop((age-.15-i*stag)/.3)]);
  });
  if(bp.length>1) cv.stroke(bp,6*k,INK);cv.done(ctx,op);
  if(ttl) texts.push([ttl,[(bx0+bx1)/2,by0+pad*.5+ls*.75],Math.trunc(ls*1.05),card?INK:WHITE,pop(age/.3)]);
  for(const [s,p,sz,fill,sc] of texts) centered(ctx,text_sprite(s,sz,fill,INK,eq(fill,INK)?0:null,'main',false),c.pt(p),sc*k,0,op);
}
export function meter(ctx,c,L,age,outk,shot_t) {
  const [x,y]=L.at,[w,h]=get(L,'size',[440,46]),v=clamp(keyValue(L.keys,shot_t,[get(L,'value',1)])[0]),sc=pop(age/.3,1.6)*(.4+.6*outk);if(sc<=.01) return;
  const op=get(L,'opacity',1)*Math.min(outk*1.6,1),low=v<get(L,'low',.25);let col=low?get(L,'low_color',RED):get(L,'color',GREEN);if(low&&Math.trunc(age*6)%2) col=shade(col,1.35);
  const lab=get(L,'label','POWER'),k=c.k*sc,org=c.pt([x,y+h/2]),Pp=p=>p.map(q=>add(mul(q,k),org)),cv=Canvas.around(Pp([[-14,-h],[w+14,h]]),16);if(!cv) return;
  const seed=_seed(L),rr=h*.42,fr=wobbly_rect(-8,-h/2-8,w+8,h/2+8,rr+6,seed,1);
  cv.poly(Pp(fr.map(p=>add(p,[6,7]))),INK,0);cv.poly(Pp(fr),[70,62,66]);
  const inner=wobbly_rect(0,-h/2,w,h/2,rr,seed+1,.5);cv.poly(Pp(inner),[44,36,40],0);
  const fw=w*v,nseg=get(L,'segments',10);
  if(fw>2) {
    if(nseg) {const gap=6,sw=(w-gap*(nseg+1))/nseg;for(let i=0;i<nseg;i++) {const a=gap+i*(sw+gap),b=Math.min(a+sw,fw-gap/2);if(b-a<1) break;cv.poly(Pp([[a,-h/2+6],[b,-h/2+6],[b,h/2-6],[a,h/2-6]]),col,0);cv.poly(Pp([[a,-h/2+6],[b,-h/2+6],[b,-h/2+6+h*.2],[a,-h/2+6+h*.2]]),shade(col,1.3),0);}}
    else {cv.poly(Pp(wobbly_rect(4,-h/2+5,Math.max(fw-4,4+rr),h/2-5,rr*.8,seed+2,.4)),col,0);cv.poly(Pp([[14,-h/2+9],[Math.max(fw-14,15),-h/2+9],[Math.max(fw-14,15),-h/2+9+h*.15],[14,-h/2+9+h*.15]]),shade(col,1.35),0);}
  }
  cv.poly(Pp(inner),null,3);cv.done(ctx,op);
  if(lab) {const ls=Math.trunc(h*1.05),spr=text_sprite(lab,ls),lh=spr.height/SPR,pad=ls*.11+4+ls*.12;place_sprite(ctx,spr,SPR,[pad,lh-pad],Pp([[4,-h/2-12]])[0],k,-2,op);}
  if(L.show_value) {const spr=text_sprite(format(v*100,'{:.0f}')+'%',Math.trunc(h*.7),WHITE,INK,null,'main',false);place_sprite(ctx,spr,SPR,[spr.width/SPR,spr.height/SPR/2],Pp([[w-10,0]])[0],k,0,op);}
}

// Grain is deterministic and cached, but uses uniform specks rather than NumPy's
// blurred ziggurat-normal noise. Stamp geometry and animation follow Python.
function stamp_sprite(text,size,col,seed,fname) {
  const key=JSON.stringify(['stamp',text,size,col,seed,fname]);if(cache.has(key)) return cache.get(key);
  const ts=text_sprite(text,size,col,col,0,fname,false),tw=ts.width/SPR,th=ts.height/SPR,pw=tw+size*.5,ph=th+size*.12,b1=size*.1,b2=size*.045,w=pw+2*b1+16,h=ph+2*b1+16;
  const cv=spriteCanvas(w,h),x0=8+b1/2,y0=8+b1/2,x1=w-8-b1/2,y1=h-8-b1/2,r=size*.16;
  const [p]=resample(wobbly_rect(x0,y0,x1,y1,r,seed,1.5),3);cv.poly(p,null,b1,col);cv.poly(wobbly_rect(x0+b1*1.3,y0+b1*1.3,x1-b1*1.3,y1-b1*1.3,r*.6,seed+1,1),null,b2,col);
  cv.paste(ts,SPR,w/2-tw/2,h/2-th/2-size*.03);
  const cx=cv.ctx,im=cx.getImageData(0,0,cv.canvas.width,cv.canvas.height),noise=npUniform(seed,0,1,Math.ceil(im.data.length/4));
  for(let i=0;i<noise.length;i++) if(noise[i]>.965) im.data[i*4+3]*=clamp(1-(noise[i]-.965)*30);
  cx.putImageData(im,0,0);return cachePut(key,[cv.canvas,w,h]);
}
export function stamp(ctx,c,L,age,outk) {
  const [spr,w,h]=stamp_sprite(L.text,get(L,'size',120),get(L,'color',RED),_seed(L),get(L,'font','main')),land=.13;
  let sc,op;if(age<land) {const u=age/land;sc=2.6-1.6*u*u;op=.25+.6*u;} else {const v=age-land;sc=1-.05*Math.exp(-v/.06)*Math.cos(v*40);op=1;}
  sc*=c.k*(1+.3*(1-outk));place_sprite(ctx,spr,SPR,[w/2,h/2],c.pt(L.at),sc,get(L,'rot',-12),op*outk*get(L,'opacity',.92));
}
function rc_layout(L) {
  const size=get(L,'size',44),w=get(L,'width',640),pad=size*.6;let y=pad;
  const lay={size,W:w,pad,title_y:y+size*.62};y+=size*1.35;
  const lines=[L.name,L.sub].filter(Boolean);lay.head_y=lines.map((_,i)=>y+size*.5+i*size*.95);y+=size*.95*lines.length+size*.25;
  lay.div_y=y;y+=size*.2;const rh=size*1.3;lay.row_y=L.rows.map((_,i)=>y+rh*(i+.5));y+=rh*L.rows.length;lay.rh=rh;
  if(L.final) {lay.final_y=y+size*1.6;y+=size*2.9;}if(L.remark) {lay.remark_y=y+size*.55;y+=size*1.2;}
  return {...lay,H:y+pad*.7,gx:w-pad-size*.9,mx:pad+size*.25};
}
function rc_times(L) {
  const first=get(L,'t',0)+get(L,'first',.45),stag=get(L,'stagger',.45),ts=L.rows.map((r,i)=>r.length>2?r[2]:first+i*stag);
  const tf=L.final?get(L,'final_t',(ts.length?Math.max(...ts):first)+stag+.15):null;
  const tr=L.remark?get(L,'remark_t',(tf!==null?tf:Math.max(...ts))+.6):null;return [ts,tf,tr];
}
function rc_card(L,lay) {
  const seed=_seed(L),key=JSON.stringify(['rcard',L,lay]);if(cache.has(key)) return cache.get(key);
  const {size,W:w,H:h,pad}=lay,m=14,cv=spriteCanvas(w+2*m+10,h+2*m+10),fn=get(L,'font','main');
  cv.poly(wobbly_rect(m+10,m+11,m+w+10,m+h+11,size*.3,seed+1),INK,0);cv.poly(wobbly_rect(m,m,m+w,m+h,size*.3,seed),PAPER);
  const put=(text,sz,x,y,align='left',col=INK)=>{
    const ts=text_sprite(text,sz,col,col,0,fn,false),tw=ts.width/SPR,th=ts.height/SPR,x0=align==='center'?x-tw/2:align==='right'?x-tw:x-size*.12;
    cv.paste(ts,SPR,m+x0,m+y-th/2);
  };
  for(const y of lay.row_y) cv.stroke([[m+pad*.5,m+y+lay.rh/2-2],[m+w-pad*.5,m+y+lay.rh/2-2]],2.5,[232,206,170]);
  cv.stroke([[m+lay.mx,m+lay.div_y+4],[m+lay.mx,m+h-pad*.4]],3,[150,150,236]);put(get(L,'title','REPORT CARD'),Math.trunc(size*1.1),w/2,lay.title_y,'center');
  [L.name,L.sub].filter(Boolean).forEach((text,i)=>put(text,Math.trunc(size*.78),pad,lay.head_y[i],'left',[90,84,86]));
  cv.stroke([[m+pad*.5,m+lay.div_y],[m+w-pad*.5,m+lay.div_y]],4,INK);L.rows.forEach((row,i)=>put(row[0],size,lay.mx+size*.45,lay.row_y[i]));
  if(L.final) put('FINAL GRADE',Math.trunc(size*.95),lay.mx+size*.45,lay.final_y);
  return cachePut(key,[cv.canvas,m+w/2,m+h/2]);
}
export function report_card(ctx,c,L,age,outk) {
  const lay=rc_layout(L),[spr,ax,ay]=rc_card(L,lay),P=c.pt(L.at),angle=get(L,'rot',-3),sc=pop(age/.3,1.6)*c.k*(.5+.5*outk),op=get(L,'opacity',1)*Math.min(outk*1.5,1);if(sc<=.01) return;
  place_sprite(ctx,spr,SPR,[ax,ay],P,sc,angle,op);
  const {W:w,H:h,size}=lay,S=(x,y)=>add(P,rot(mul([x-w/2,y-h/2],sc),rad(angle))),col=get(L,'grade_color',RED),hand=get(L,'hand','comic'),[ts,tf,tr]=rc_times(L),seed=_seed(L);
  const active=L.rows.map((r,i)=>age-(ts[i]-get(L,'t',0))>0),rs=npUniform(seed,-8,6,active.filter(Boolean).length);let ri=0;
  L.rows.forEach((row,i)=>{const u=age-(ts[i]-get(L,'t',0));if(u<=0) return;const g=text_sprite(String(row[1]),Math.trunc(size*1.2),col,col,0,hand,false);centered(ctx,g,S(lay.gx,lay.row_y[i]-size*.05),sc*pop(u/.22,2.6),angle+rs[ri++],op);});
  if(tf!==null) {
    const u=age-(tf-get(L,'t',0));if(u>0) {
      const fx=lay.gx-size*.5,fy=lay.final_y,g=text_sprite(String(L.final),Math.trunc(size*2.3),col,col,0,hand,false),land=u<.12?2.2-1.2*Math.min(u/.12,1)**2:1-.06*Math.exp(-(u-.12)/.06)*Math.cos((u-.12)*40);
      centered(ctx,g,S(fx,fy),sc*land,angle-6,op);
      if(u>.15) circle(ctx,{k:sc,pt:p=>p},{at:S(fx,fy),r:[size*1.35*sc,size*1.08*sc],tilt:angle-8,width:11,color:col,draw:.35,seed:seed+5},u-.15,outk);
    }
  }
  if(tr!==null) {const u=age-(tr-get(L,'t',0));if(u>0) centered(ctx,text_sprite(L.remark,Math.trunc(size*.95),col,col,0,hand,false),S(w/2+size*.3,lay.remark_y),sc*pop(u/.25,2),angle-4,op);}
}
export function stamp_shake(L,t) {
  const amp=get(L,'shake',9),v=t-get(L,'t',0)-.13;if(!amp||v<0) return [0,0];const env=amp*Math.exp(-v/.12);return [env*Math.sin(v*61),env*Math.cos(v*53)];
}
export function report_card_shake(L,t) {
  const amp=get(L,'shake',7);if(!amp||!L.final) return [0,0];const [,tf]=rc_times(L),v=t-tf-.12;if(v<0) return [0,0];const env=amp*Math.exp(-v/.12);return [env*Math.sin(v*61),env*Math.cos(v*53)];
}
export function extraShake(sh,t) {
  let dx=0,dy=0;for(const L of sh.layers) if(L.kind==='overlay'&&(L.type==='stamp'||L.type==='report_card')) {const [x,y]=(L.type==='stamp'?stamp_shake:report_card_shake)(L,t);dx+=x;dy+=y;}return [dx,dy];
}
export const extra_shake=extraShake;
const renderers={circle,underline:(ctx,c,L,age,outk)=>arrow(ctx,c,L,age,outk,false),arrow,label,title,caption_pop,counter,bars,route,spotlight,emote,meter,stamp,report_card,mood};
export function drawOverlay(ctx,L,sh,t,tn,shk=[0,0]) {
  const [age,end,outk]=life(L,t);if(age<0||(end!==null&&t>=end)) return;
  const renderer=renderers[L.type];if(!renderer) return;
  ctx.save();ctx.globalCompositeOperation='source-over';
  try {renderer(ctx,new Ctx(L,sh,t,tn,shk),L,age,outk,t);} finally {ctx.restore();}
}
