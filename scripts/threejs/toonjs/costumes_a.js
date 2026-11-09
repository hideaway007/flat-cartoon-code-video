// Faithful Canvas2D port of production/costumes.py, lines 1–1393.
// Colours remain BGR. Painter call order is part of the deterministic wobble contract.
import { add, sub, mul, div, neg, dot, hypot, mid, lerp, get, mod, range, arange, linspace, interp,
  crom, ellipse_pts, rot, radians, intersectConvex } from './np.js';
import { LINE, WHITE, INK } from './painter.js';
import { prop, beard, moustache } from './costumes_b.js';

export const STEEL = [204,196,190], STEEL_DK = [150,142,136], IRON = [118,112,108];
export const GOLD = [52,182,236], GOLD_DK = [30,130,190], BRONZE = [64,140,196];
export const WOOD = [52,100,152], WOOD_DK = [38,72,112], LEATHER = [44,78,126];
export const PAPER = [196,232,244], LINEN = [226,236,238], RED = [52,48,196], RED_DK = [40,36,150];
export const BLUE = [160,92,40], GREEN = [70,130,60], BLACK = [52,46,48];
export const FLAME = [40,150,250], FLAME_IN = [110,226,255], SKIN = WHITE;
export const GARMENT = {
  tunic:{sleeves:'long',skirt:0.42,flare:34}, robe:{sleeves:'wide',skirt:1.0,flare:66},
  toga:{sleeves:'short',skirt:0.8,flare:50}, mail:{sleeves:'mail',skirt:0.56,flare:40},
  plate:{sleeves:'plate',skirt:0.3,flare:40}, lamellar:{sleeves:'long',skirt:0.44,flare:58},
  segmentata:{sleeves:'short',skirt:0.4,flare:38}, coat:{sleeves:'long',skirt:0.64,flare:34},
  blazer:{sleeves:'long',skirt:0.24,flare:24}, hoodie:{sleeves:'long',skirt:0,flare:0},
  uniform:{sleeves:'long',skirt:0.17,flare:22}, kilt:{sleeves:'none',skirt:0.44,flare:40},
  buckskin:{sleeves:'fringe',skirt:0.26,flare:30}, shirt:{sleeves:'long',skirt:0,flare:0},
  trade_shirt:{sleeves:'long',skirt:0.22,flare:26}, dress:{sleeves:'dress',skirt:0.8,flare:46},
};
export const HEADWEAR = ['none','beanie','nasal','greathelm','kettle','kabuto','galea','crown','tophat','tricorn','kasa',
  'turban','hood','wushamao','nemes','viking','chinese_helm','slouch','boonie','cap'];
export const HAIR = ['messy','beanie','short','bald','long','topknot','bun','tonsure','receding','curtains','curly','none'];
export const MOUSTACHE = ['none','walrus','handlebar','thin','droop'];
export const BEARD = ['none','stubble','short','long'];
export const HELD = ['none','sword','gladius','katana','spear','axe','hammer','mallet','mace','bow','longbow','arrow',
  'crossbow','shield_round','shield_kite','shield_heater','scutum','scroll','scroll_open','book','torch','flag','banner',
  'quill','lantern','paper_lantern','wrench','staff','crook','mug','red_pen','stamp','sticker','detector',
  'note','exam','exam_f','cartridge','beer','bugle','folder'];
export const UPRIGHT = ['book','scroll_open','exam','exam_f','folder','note','cartridge'];
export const SHIELDS = ['shield_round','shield_kite','shield_heater','scutum'];
export const BOWS = ['bow','longbow'];

// Python truthiness also covers empty dictionaries and sequences.
const truth = x => x != null && (Array.isArray(x) || typeof x === 'string' ? x.length > 0 :
  typeof x === 'object' ? Object.keys(x).length > 0 : !!x);
const or = (a,b) => truth(a) ? a : b;
const shifted = (pts,v) => pts.map(p => add(p,v));
const scaled = (pts,s) => pts.map(p => mul(p,s));
const lengths = pts => { let s=0; return [0,...pts.slice(1).map((p,i) => (s += hypot(sub(p,pts[i]))))]; };
const atLength = (s,L,pts) => [interp(s,L,pts.map(p=>p[0])),interp(s,L,pts.map(p=>p[1]))];

export function _n(d) { return div(d,hypot(d)+1e-9); }
export function _perp(d) { return [-d[1],d[0]]; }
export function dk(c,f=0.72) { return c.map(v=>Math.trunc(v*f)); }

export class Ctx {
  constructor(pt,D,p,k,fac,T,hip,lean,up,sh_w,joints) {
    Object.assign(this,{pt,D,p,k,fac,T,hip,lean,up,sh_w,joints});
    this.back = fac === 'b';
    this.garment = or(get(D,'garment'),truth(get(D,'puffy')) ? 'puffy' : 'zip');
    this.g = get(GARMENT,this.garment,{});
    this.legs={}; this.arms={}; this.defer=[];
    this.hw=or(get(D,'headwear'),'none');
    if (get(D,'style') === 'beanie' && this.hw === 'none') this.hw='beanie_legacy';
    this.leg_len=D.leg_u+D.leg_l;
  }
  set_arm(side,sh,el,wr) {
    this.arms[side]=[sh,el,wr];
    if (Object.keys(this.arms).length === 2) this._prop_geometry();
  }
  held(side) { return get(this.p,side<0 ? 'heldL' : 'heldR','none'); }
  prop_frame(side) {
    const [sh,el,wr]=this.arms[side], d=sub(wr,el), af=Math.atan2(d[1],d[0]);
    const kind=this.held(side), rotd=radians(get(this.p,side<0 ? 'rotL' : 'rotR',0));
    const c=add(wr,mul([Math.cos(af),Math.sin(af)],8));
    if (SHIELDS.includes(kind) || UPRIGHT.includes(kind)) return [c,-Math.PI/2+this.lean+rotd];
    const base=kind === 'crossbow' ? Math.PI/2 : 0;
    let a=af-Math.PI/2+base+rotd;
    const fix=get(this.p,side<0 ? 'fixL' : 'fixR',0);
    if (truth(fix)) a += fix*(mod(rotd+this.lean-a+Math.PI,2*Math.PI)-Math.PI);
    return [c,a];
  }
  _prop_geometry() {
    this.bow=null;
    for (const side of [-1,1]) if (BOWS.includes(this.held(side))) {
      const [c,a]=this.prop_frame(side), L=this.held(side)==='longbow' ? 440 : 290;
      const other=this.held(-side)==='arrow', bend=other ? 150 : 90;
      const tips=shifted(rot([[L,-bend],[-L,-bend]],a),c);
      this.bow={side,c,a,L,tips,drawn:other};
    }
  }
  set_head(H,hc,ha,rx,ry,fsx) { Object.assign(this,{H,hc,ha,rx,ry,fsx}); this.hy=get(this.D,'hat_dy',0); }
  face_visible() { return this.hw !== 'greathelm'; }
  hair_visible() { return this.hw !== 'greathelm'; }
  beard() { beard(this); }
  moustache() { moustache(this); }
  glasses() { glasses(this); }
}

export function device(pt,her,center,size,ang,clip=null,line=LINE*0.6) {
  if (!truth(her)) return;
  const dev=get(her,'device','none'), col=get(her,'color',GOLD), ext=clip!==null ? 400 : 100, S=size/100;
  const Wp=pts=>shifted(rot(scaled(pts,S),ang),center);
  let shapes=[];
  if (dev==='cross') { const w=20; shapes=[[[-w,-ext],[w,-ext],[w,ext],[-w,ext]],[[-ext,-w],[ext,-w],[ext,w],[-ext,w]]]; }
  else if (dev==='saltire') { const w=18; for(const a of [0.785,-0.785]) shapes.push(rot([[-ext,-w],[ext,-w],[ext,w],[-ext,w]],a)); }
  else if (dev==='pale') shapes=[[[-34,-ext],[34,-ext],[34,ext],[-34,ext]]];
  else if (dev==='fess') shapes=[[[-ext,-30],[ext,-30],[ext,30],[-ext,30]]];
  else if (dev==='bend') shapes=[rot([[-ext,-26],[ext,-26],[ext,26],[-ext,26]],0.785)];
  else if (dev==='chevron') for(const sgn of [-1,1]) {
    const q=[[0,-40],[0,10],[sgn*ext,10+ext*0.9],[sgn*ext,-40+ext*0.9]];
    shapes.push(sgn>0 ? q : q.reverse());
  }
  else if (dev==='quarterly') shapes=[[[-ext,-ext],[0,-ext],[0,0],[-ext,0]],[[0,0],[ext,0],[ext,ext],[0,ext]]];
  else if (dev==='roundel') shapes=[ellipse_pts(0,0,52,52,0,36)];
  else if (dev==='mon') shapes=[ellipse_pts(0,0,60,60,0,36)];
  else if (dev==='star') shapes=[range(10).map(i=>{const t=i*Math.PI/5-Math.PI/2,r=i%2===0?64:26;return [r*Math.cos(t),r*Math.sin(t)];})];
  if (clip!==null && ['cross','saltire','pale','fess','bend','chevron','quarterly'].includes(dev)) {
    const cp=clip.map(p=>p.map(Math.fround));
    for(const sh of shapes) {
      const q=Wp(sh).map(p=>p.map(Math.fround)), [area,inter]=intersectConvex(q,cp);
      if(area>1 && inter!==null) pt.shape(inter,col,line,undefined,false);
    }
  } else if(dev==='fleur') {
    pt.blob(Wp([[0,-70],[20,-30],[14,10],[0,26],[-14,10],[-20,-30]]),col,line,6,false);
    for(const sg of [-1,1]) pt.blob(Wp([[sg*10,10],[sg*34,-30],[sg*64,-24],[sg*56,8],[sg*30,20]]),col,line,5,false);
    pt.shape(Wp([[-40,14],[40,14],[40,30],[-40,30]]),col,line,undefined,false);
    pt.blob(Wp([[-12,30],[12,30],[8,64],[-8,64]]),col,line,4,false);
  } else if(dev==='wings') {
    for(const a of [-0.6,0.6,Math.PI-0.6,Math.PI+0.6]) {
      const d=[Math.cos(a),Math.sin(a)],n=_perp(d);
      const pts=[mul(d,60),add(mul(d,120),mul(n,18)),sub(mul(d,150),mul(n,10)),add(mul(d,210),mul(n,10))];
      pt.line(Wp(pts),LINE*1.1*S+6,col);
    }
  } else {
    for(const sh of shapes) pt.shape(Wp(sh),col,line,undefined,false);
    if(dev==='mon') pt.shape(Wp(ellipse_pts(0,0,30,30,0,30)),get(her,'field',WHITE),line,undefined,false);
  }
}

export function behind_body(C) {
  const {D,pt,up,T,k}=C;
  _blanket_back(C);
  if(truth(get(D,'quiver')) && !C.back) _quiver(C);
  if(truth(get(D,'cape'))) {
    const col=D.cape,sw=C.sh_w,hem_y=Math.min(C.hip[1]+C.leg_len*0.74,-70),trail=-80*k,hx=C.hip[0];
    const top=[up([-sw+6+18*k,-T+22]),up([-40,-T-18]),up([50,-T-18]),up([sw-6-26*k,-T+22])];
    const side_r=up([sw+26-26*k,-T*0.45]),side_l=up([-sw-26+18*k,-T*0.45]);
    const hem=[[hx+sw+70+trail*0.4,hem_y],[hx+40+trail,hem_y+16],[hx-60+trail,hem_y+10],[hx-sw-70+trail*1.2,hem_y]];
    pt.blob([...top,side_r,...hem,side_l],col,undefined,6);
    if(!C.back) for(const f of [-0.45,0.4]) {
      const a=up([f*sw,-T*0.55]),b=[hx+f*(sw+60)+trail,hem_y-10];
      pt.line([a,add(mid(a,b),[6,0]),b],LINE*0.6,undefined,true);
    } else for(const f of [-0.5,0,0.5]) {
      const a=up([f*sw*0.8,-T*0.7]),b=[hx+f*(sw+50),hem_y-6];
      pt.line([a,add(mid(a,b),[8,0]),b],LINE*0.6,undefined,true);
    }
    const trim=get(D,'cape_trim');
    if(truth(trim)) {
      pt.shape([add(hem[3],[-2,-38]),add(hem[2],[0,-36]),add(hem[1],[0,-38]),add(hem[0],[2,-38]),...hem],
        trim==='ermine'?WHITE:trim,LINE*0.7);
      if(trim==='ermine') for(const f of linspace(0.12,0.88,6)) _ermine_spot(pt,add(lerp(hem[3],hem[0],f),[0,-16]),1);
    }
  }
  if(truth(get(D,'quiver')) && C.back) _quiver(C);
}
export function _ermine_spot(pt,q,s) { pt.shape([add(q,[0,-10*s]),add(q,[6*s,8*s]),add(q,[-6*s,8*s])],INK,0); }
export function _quiver(C) {
  const {pt,up,T}=C,s=(C.back||C.k)?-1:1,a=up([s*30,-T*0.25]),b=up([s*120,-T-60]),d=_n(sub(b,a)),n=_perp(d);
  for(const [i,o] of [-22,0,22].entries()) {
    const q=add(add(b,mul(d,40)),mul(n,o));
    pt.stroke([add(b,mul(n,o*0.6)),q],WOOD,8,LINE*0.5,undefined,false);
    pt.blob([sub(q,mul(n,14)),sub(add(q,mul(d,46)),mul(n,4)),add(add(q,mul(d,54)),mul(n,4)),add(q,mul(n,14))],
      i!==1?WHITE:RED,LINE*0.6,4,false);
  }
  pt.blob([sub(a,mul(n,40)),sub(b,mul(n,46)),add(b,mul(n,46)),add(a,mul(n,40))],C.D.quiver,undefined,4);
  pt.line([sub(sub(b,mul(n,46)),mul(d,30)),sub(add(b,mul(n,46)),mul(d,30))],LINE*0.6);
}

export function leg(C,side,hj,knee,ank) {
  const {D,pt,fac,back}=C,lw=or(get(D,'legwear'),'trousers'),col=get(D,'trousers',BLACK),path=[hj,knee,ank];
  if(lw==='bare') pt.stroke(path,SKIN,64);
  else if(lw==='hakama') {
    pt.stroke(path,col,112); pt.line([add(knee,[side*20,-60]),add(ank,[side*34,-10])],LINE*0.5);
  } else pt.stroke(path,col,get({hose:78,wraps:82,greaves:88,mail:90},lw,96));
  const dl=sub(ank,knee);
  if(lw==='wraps') {
    const wc=get(D,'wrap',dk(col,0.8)),n=_perp(_n(dl));
    for(const f of [0.2,0.45,0.7]) {
      const a=add(knee,mul(dl,f)),b=add(knee,mul(dl,f+0.2));
      pt.line([sub(a,mul(n,38)),add(b,mul(n,38))],LINE*0.55,wc);
      pt.line([add(a,mul(n,38)),sub(b,mul(n,38))],LINE*0.55,wc);
    }
  } else if(lw==='greaves') {
    pt.stroke([add(knee,mul(dl,0.12)),sub(ank,mul(dl,0.04))],get(D,'steel',STEEL),92);
    pt.ell(knee[0],knee[1],50,44,get(D,'steel',STEEL),LINE*0.9); pt.dot(knee[0]+4,knee[1]-2,8);
  } else if(lw==='mail') { _mail_rows(pt,hj,knee,3); _mail_rows(pt,knee,ank,3); }
  else if(lw==='striped' && !back) pt.line([add(hj,[side*30,0]),add(knee,[side*30,0]),add(ank,[side*30,-20])],LINE*1.2,get(D,'stripe',RED));
  else if(lw==='leggings') {
    let nrm=_perp(_n(sub(ank,hj)));
    const out=fac==='f'?side:(back?-side:-1);
    if(dot(nrm,[out,0])<0) nrm=neg(nrm);
    const fl=get(D,'legging_flap',dk(col,0.86)),top=lerp(hj,knee,get(D,'flap_top',0.15));
    const a0=add(top,mul(nrm,36)),a1=add(add(ank,mul(nrm,34)),[0,-10]);
    pt.shape([a0,add(knee,mul(nrm,40)),a1,add(add(a1,mul(nrm,34)),[0,10]),add(knee,mul(nrm,80)),add(a0,mul(nrm,30))],fl,LINE*0.7);
    if(truth(get(D,'beads'))) {
      const path=crom([add(a0,mul(nrm,16)),add(knee,mul(nrm,56)),add(a1,mul(nrm,18))],false,8);
      pt.stroke(path,D.beads,22,LINE*0.4,undefined,false);
      const Ls=lengths(path),b2=get(D,'beads2',RED);
      for(const s of arange(20,Ls.at(-1)-14,46)) pt.stroke([atLength(s,Ls,path),atLength(s+16,Ls,path)],b2,14,0,undefined,false);
    }
  } else if(lw==='jeans') {
    const sc=get(D,'stitch',[90,170,220]),o=side*(!back?24:-24);
    pt.line([add(hj,[o,8]),add(knee,[o,0]),add(ank,[o,-24])],LINE*0.35,sc);
    pt.line([add(knee,[-26,-10]),add(knee,[0,-2]),add(knee,[26,-12])],LINE*0.35,dk(col,0.75),true);
  }
  foot(C,side,ank,or(get(D,'footwear'),'boots'));
}
export function _mail_rows(pt,a,b,n_rows,w=36) {
  const d=sub(b,a),nrm=_perp(_n(d));
  for(const f of linspace(0.2,0.85,n_rows)) {
    const c=add(a,mul(d,f));
    const pts=linspace(-1,1,9).map(t=>add(add(c,mul(nrm,w*t)),mul(_n(d),7*Math.abs(Math.sin(t*Math.PI*2.5)))));
    pt.line(pts,LINE*0.4,dk(STEEL_DK,0.8));
  }
}
export function foot(C,side,ank,fw) {
  const {D,pt,fac,back}=C,toe=fac==='r'?1:(fac==='f'?side*0.35:side*0.15),bx=ank[0],by=ank[1]+28,col=get(D,'boots',LEATHER);
  if(fw==='tall') {
    const [,knee]=C.legs[side],dl=sub(ank,knee),top=add(knee,mul(dl,0.14));
    pt.stroke([top,add(ank,[0,8])],col,106);
    const nrm=_perp(_n(dl)),d=_n(dl);
    pt.shape([sub(sub(top,mul(nrm,58)),mul(d,6)),sub(add(top,mul(nrm,58)),mul(d,6)),
      add(add(top,mul(nrm,54)),mul(d,26)),add(sub(top,mul(nrm,54)),mul(d,26))],
      col.reduce((a,b)=>a+b,0)>200?dk(col,0.82):col.map(v=>Math.min(255,v+18)),LINE*0.7,undefined,false);
    fw='boots';
  }
  if(['boots','sabatons'].includes(fw)) {
    let boot=[[bx-52+20*Math.min(toe,0),by-42],[bx+40+50*Math.max(toe,0)*0.6,by-34],
      [bx+62+62*Math.max(toe,0),by+4],[bx+58+60*Math.max(toe,0),by+36],
      [bx-58+60*Math.min(toe,0),by+36],[bx-62+30*Math.min(toe,0),by-4]];
    if(back) boot=[[bx-56,by-40],[bx+56,by-40],[bx+60,by+36],[bx-60,by+36]];
    pt.blob(boot,col,undefined,6);
    pt.line([[bx-56+50*Math.min(toe,0),by+18],[bx+56+58*Math.max(toe,0),by+18]],LINE*0.7);
    if(fw==='sabatons' && !back) for(const o of [-14,8]) pt.line([[bx-30+40*Math.max(toe,0),by+o-10],[bx+30+50*Math.max(toe,0),by+o]],LINE*0.5);
  } else {
    let fill=['sandals','bare'].includes(fw)?SKIN:col;
    let shoe=[[bx-46+16*Math.min(toe,0),by-4],[bx+30+40*Math.max(toe,0),by-10],
      [bx+58+60*Math.max(toe,0),by+10],[bx+54+58*Math.max(toe,0),by+36],
      [bx-52+50*Math.min(toe,0),by+36],[bx-54+24*Math.min(toe,0),by+12]];
    if(back) shoe=[[bx-48,by-6],[bx+48,by-6],[bx+52,by+36],[bx-52,by+36]];
    if(fw==='moccasins') {
      fill=get(D,'moccasin',[130,170,200]);
      shoe=[[bx-46+16*Math.min(toe,0),by-14],[bx+24+40*Math.max(toe,0),by-16],
        [bx+56+60*Math.max(toe,0),by+8],[bx+52+58*Math.max(toe,0),by+36],
        [bx-50+50*Math.min(toe,0),by+36],[bx-52+24*Math.min(toe,0),by+6]];
      if(back) shoe=[[bx-48,by-14],[bx+48,by-14],[bx+52,by+36],[bx-52,by+36]];
    }
    pt.blob(shoe,fill,undefined,6);
    if(fw==='moccasins') {
      pt.shape([[bx-40,by-30],[bx+40,by-30],[bx+44,by-6],[bx-44,by-6]],fill,LINE*0.6,undefined,false);
      if(truth(get(D,'beads')) && !back) pt.stroke([[bx-24+30*Math.max(toe,0),by+2],[bx+20+50*Math.max(toe,0),by+6]],get(D,'moc_beads',D.beads),16,LINE*0.4,undefined,false);
    }
    if(fw==='sandals') {
      pt.shape([[bx-54+50*Math.min(toe,0),by+24],[bx+56+58*Math.max(toe,0),by+24],
        [bx+56+58*Math.max(toe,0),by+38],[bx-54+50*Math.min(toe,0),by+38]],col,LINE*0.6);
      for(const o of [-30,0]) pt.line([[bx-30+o*0.3,by+o*0.5-2],[bx+26+30*Math.max(toe,0),by+o*0.5+8]],LINE*0.9,col);
      pt.line([[bx-6,by-40],[bx-6,by-8]],LINE*0.8,col);
    }
  }
  C.joints['foot'+(side<0?'L':'R')]=[bx,0];
}
export function _leg_point(C,side,f) {
  const [hj,knee,ank]=C.legs[side],L=f*C.leg_len;
  if(L<=C.D.leg_u) return lerp(hj,knee,L/C.D.leg_u);
  return lerp(knee,ank,Math.min((L-C.D.leg_u)/C.D.leg_l,1.15));
}
export function skirt(C,f,flare,col,split=0,top=-36,line=LINE,w0=134) {
  const {pt,up,k}=C;
  let hL=add(_leg_point(C,-1,f),[-flare-14,10+8*f]),hR=add(_leg_point(C,1,f),[flare+14,10+8*f]);
  if(hR[0]-hL[0]<200) { const m=mid(hL,hR); hL=sub(m,[100,0]);hR=add(m,[100,0]); }
  const tL=up([-w0+14*k,top]),tR=up([w0-20*k,top]);
  const midL=add(mid(tL,hL),[-12,0]),midR=add(mid(tR,hR),[12,0]),hem_mid=add(mid(hL,hR),[0,14]);
  if(split<=0) pt.shape([...crom([tL,midL,hL],false,6),...crom([hL,hem_mid,hR],false,6),...crom([hR,midR,tR],false,6)],col,line);
  else {
    const cx=up([10+30*k,top]);
    for(const [sg,h_,m_,t_] of [[-1,hL,midL,tL],[1,hR,midR,tR]]) {
      const inner=add(hem_mid,[sg*split/2,-4]);
      pt.shape([...crom([t_,m_,h_],false,6),...crom([h_,add(mid(h_,inner),[0,8]),inner],false,4),add(cx,[sg*4,0])],col,line);
    }
  }
  return [hL,hR];
}
export function tor_poly(C,w0=128,w1=132,top=0) {
  const {T,k,sh_w:sw}=C;
  return [[-w0+16*k,18],[-w1-8,-T*0.35],[-w1+4,-T*0.75],[-sw+8+18*k,-T+24],
    [-60,-T-2+top],[60,-T-2+top],[sw-8-26*k,-T+24],[w1+2-20*k,-T*0.75],
    [w1+4-20*k,-T*0.35],[w0-22*k,18],[0,30]];
}
export function belt(C,col=null,buckle=null,style=null,y0=-20,y1=16) {
  const {D,pt,up,k}=C;
  style=or(style,get(D,'belt_style','leather'));col=or(col,get(D,'belt',LEATHER));
  if(style==='none') return;
  const cx=12+30*k;
  if(style==='rope') {
    pt.shape(up([[-130+16*k,-8],[130-22*k,-8],[132-22*k,10],[-132+16*k,10]]),col,LINE*0.7);
    if(!C.back) {
      pt.stroke(up([[cx+20,4],[cx+34,90],[cx+24,170]]),col,14,LINE*0.6,true);
      pt.ell(...up([cx+20,2]),18,15,col,LINE*0.6);
    }
    return;
  }
  if(style==='sash') { y0=-46;y1=18; }
  if(style==='cartridge') {
    y0=-30;y1=22;
    const brass=get(D,'brass',[70,170,214]),x0=-122+16*k,x1=122-22*k;
    for(const x of arange(x0+14,x1-8,24)) {
      if(!C.back && Math.abs(x-cx)<34) continue;
      pt.shape(up([[x-8,y0-16],[x+8,y0-16],[x+8,y0+8],[x-8,y0+8]]),brass,LINE*0.45,undefined,false);
    }
  }
  if(style==='tacks') {y0=-34;y1=18;}
  pt.shape(up([[-132+16*k,y0],[132-22*k,y0],[134-22*k,y1],[-134+16*k,y1]]),col,LINE*0.8);
  if(style==='tacks') {
    for(const x of arange(-110+16*k,112-22*k,30)) pt.dot(...up([x,(y0+y1)/2]),8,get(D,'brass',[70,170,214]));
    return;
  }
  if(style==='cartridge') for(const x of arange(-122+16*k+2,122-22*k,24)) pt.line(up([[x,y0+4],[x,y1-4]]),LINE*0.35,dk(col,0.7));
  if(C.back) return;
  if(style==='sash') {
    for(const o of [-1,1]) pt.stroke(up([[cx+30,6],[cx+30+o*26,90],[cx+30+o*18,150]]),col,26,LINE*0.6,true);
    pt.ell(...up([cx+30,-12]),26,22,col,LINE*0.7);
  } else pt.shape(up([[cx-22,y0-4],[cx+22,y0-4],[cx+22,y1+4],[cx-22,y1+4]]),or(buckle,get(D,'trim',GOLD)),LINE*0.7);
}

export function torso(C) {
  const {D,pt,up,T,k,back,garment:g}=C,col=get(D,'jacket',RED),dkc=get(D,'jacket_dk',dk(col)),trim=get(D,'trim'),cx=10+30*k;
  const f=get(D,'skirt',get(C.g,'skirt',0.4)),flare=get(D,'flare',get(C.g,'flare',36));
  if(g==='tunic') {
    const [hL,hR]=skirt(C,f,flare,col);
    if(truth(trim) && truth(get(D,'hem_trim',true))) _hem_band(C,hL,hR,trim);
    pt.blob(up(tor_poly(C)),col,undefined,8); _neckline(C,trim); belt(C);
  } else if(g==='robe') {
    const [hL,hR]=skirt(C,f,flare,col);
    if(truth(get(D,'hem_trim')) && truth(trim)) _hem_band(C,hL,hR,trim);
    pt.blob(up(tor_poly(C,136,136)),col,undefined,8);
    if(!back) {
      const hm=mid(hL,hR);
      pt.line([up([cx+40,10]),add(hm,[60+40*k,-6])],LINE*0.6);
      const collar=get(D,'collar','cross'),tc=or(trim,dkc);
      if(collar==='cross') {
        pt.shape(up([[cx-74,-T+2],[cx-36,-T+2],[cx+74,-T*0.42],[cx+60,-T*0.32]]),tc,LINE*0.8);
        pt.shape(up([[cx+36,-T+2],[cx+74,-T+2],[cx+18,-T*0.66],[cx+2,-T*0.72]]),tc,LINE*0.8);
      } else if(collar==='round') pt.shape(up(ellipse_pts(cx,-T+6,82,34,0,30,0,Math.PI)),tc,LINE*0.8);
      else pt.shape(up([[cx-60,-T],[cx-30,-T],[cx,-T*0.6],[cx+30,-T],[cx+60,-T],[cx,-T*0.5]]),tc,LINE*0.8);
      if(truth(get(D,'badge'))) {
        const bx=cx-4,by=-T*0.5;
        pt.shape(up([[bx-64,by-60],[bx+64,by-60],[bx+64,by+60],[bx-64,by+60]]),D.badge,LINE*0.8);
        pt.shape(up([[bx-48,by-44],[bx+48,by-44],[bx+48,by+44],[bx-48,by+44]]),get(D,'badge_in',BLUE),LINE*0.5,undefined,false);
        pt.blob(up([[bx-30,by+10],[bx-4,by-26],[bx+30,by-30],[bx+12,by-6],[bx+30,by+24],[bx-2,by+8]]),WHITE,LINE*0.5,4,false);
        pt.dot(...up([bx+26,by-20]),12,RED);
      }
    }
    belt(C,undefined,undefined,get(D,'belt_style','sash'));
  } else if(g==='toga') {
    const [hL,hR]=skirt(C,f,flare,col);
    if(!back) for(const o of [-0.3,0.15]) {
      const a=up([o*200,40]);pt.line([a,add(mid(hL,hR),[o*260+30,-30])],LINE*0.5);
    }
    pt.blob(up(tor_poly(C)),col,undefined,8);_neckline(C,null);
    const sw=C.sh_w,drape=[[-sw+2+18*k,-T+20],[-sw+70,-T-6],[-20,-T*0.6],[100-20*k,-T*0.08],
      [134-22*k,30],[110-22*k,120],[40,60],[-40,-T*0.42],[-sw-16+18*k,-T*0.6]];
    pt.blob(up(drape),col,undefined,6);
    if(truth(trim)) pt.line(up([[-sw+70,-T-2],[-12,-T*0.6],[104-20*k,-T*0.06]]),LINE*1.3,trim,true);
    for(const o of [0.25,0.5]) pt.line(up([[-sw+20+o*90,-T*(0.9-o*0.3)],[10+o*60,-T*0.3+o*40]]),LINE*0.5,undefined,false);
  } else if(g==='mail') {
    const mc=get(D,'mail',STEEL);
    skirt(C,f+0.06,flare-6,mc);pt.blob(up(tor_poly(C)),mc,undefined,8);
    skirt(C,f,flare,col,40,-20,undefined,124);
    const sur=[[-120+16*k,18],[-124,-T*0.4],[-104+14*k,-T+40],[-62+10*k,-T+4],
      [64-10*k,-T+4],[104-22*k,-T+40],[122-20*k,-T*0.4],[120-22*k,18]];
    pt.shape(up(sur),col,LINE);
    for(const sg of [-1,1]) _mail_rows(pt,up([sg*108+6*k,-T+40]),up([sg*116+6*k,-T*0.6]),2,18);
    if(!back) {const her=get(D,'heraldry');if(truth(her)) device(pt,her,up([cx-4,-T*0.5]),78,C.lean);}
    belt(C);
  } else if(g==='plate') {
    const sc=get(D,'steel',col),[hL,hR]=skirt(C,f,flare,sc);
    for(const ff of [0.38,0.7]) {
      const a=add(mul(up([-134,-36]),1-ff),mul(hL,ff)),b=add(mul(up([134,-36]),1-ff),mul(hR,ff));
      pt.line([a,add(mid(a,b),[0,16]),b],LINE*0.55,undefined,true);
    }
    pt.blob(up(tor_poly(C,130,134)),sc,undefined,8);
    if(!back) {
      pt.line(up([[cx,-T+30],[cx+4,-T*0.5],[cx,-T*0.12]]),LINE*0.6,undefined,true);
      pt.line(up([[-110+16*k,-T*0.34],[cx,-T*0.22],[112-20*k,-T*0.34]]),LINE*0.6,undefined,true);
      for(const x of [-80,84]) pt.dot(...up([x+20*k,-T+60]),8,IRON);
    }
    pt.shape(up([[-74+16*k,-T-26],[80-10*k,-T-26],[90-10*k,-T+22],[-84+16*k,-T+22]]),sc,LINE*0.8);
    belt(C,LEATHER,undefined,undefined,-16,8);
  } else if(g==='lamellar') {
    const lace=or(trim,BLUE),[hL,hR]=skirt(C,f,flare,col),tl=up([-134+14*k,-36]),tr=up([134-20*k,-36]);
    for(const i of range(1,4)) {const u=i/4,a=lerp(tl,tr,u),b=add(lerp(hL,hR,u),[0,14]);pt.line([a,b],LINE*0.7);}
    for(const ff of [0.35,0.68]) {
      const a=add(mul(tl,1-ff),mul(hL,ff)),b=add(mul(tr,1-ff),mul(hR,ff));
      pt.line([a,add(mid(a,b),[0,12]),b],LINE*0.5,undefined,true);_lace_ticks(pt,a,b,lace,7);
    }
    pt.blob(up(tor_poly(C,130,136)),col,undefined,8);
    for(const y of [-T*0.82,-T*0.64,-T*0.46,-T*0.28,-T*0.1]) {
      const a=up([-128+16*k,y]),b=up([132-22*k,y]);pt.line([a,b],LINE*0.55);
      _lace_ticks(pt,up([-110+16*k,y-24]),up([112-22*k,y-24]),lace,8);
    }
    pt.shape(up([[-80+16*k,-T+2],[86-12*k,-T+2],[96-12*k,-T*0.86],[-90+16*k,-T*0.86]]),dkc,LINE*0.8);
    belt(C,get(D,'belt',dkc),undefined,get(D,'belt_style','sash'));
  } else if(g==='segmentata') {
    const tun=get(D,'tunic',RED);skirt(C,f,flare,tun);
    const sc=get(D,'steel',col);pt.blob(up(tor_poly(C,128,134)),sc,undefined,8);
    for(const y of linspace(-T*0.58,-T*0.08,5)) pt.line(up([[-130+16*k,y],[cx,y+14],[134-22*k,y]]),LINE*0.6,undefined,true);
    if(!back) {
      pt.line(up([[cx,-T+10],[cx,-T*0.6]]),LINE*0.55);
      for(const x of [-40,50]) pt.dot(...up([cx+x,-T*0.78]),9,GOLD);
      for(const x of [-36,-12,12,36]) {
        const a=up([cx+x,14]),b=add(up([cx+x*1.2,14]),[0,C.leg_len*f*0.82]);
        pt.stroke([a,b],LEATHER,20,LINE*0.6,undefined,false);
        for(const u of [0.35,0.7]) {const q=lerp(a,b,u);pt.dot(q[0],q[1],7,GOLD);}
        pt.ell(b[0],b[1],14,12,GOLD,LINE*0.5);
      }
    }
    pt.blob(up([[-90+16*k,-T+20],[-60,-T-30],[70,-T-30],[96-12*k,-T+20],[cx,-T+40]]),get(D,'scarf',RED),undefined,6);
    belt(C,LEATHER,GOLD,undefined,-14,14);
  } else if(g==='coat') {
    skirt(C,f,flare,col,70);pt.blob(up(tor_poly(C,130,134)),col,undefined,8);
    if(!back) {
      const vest=get(D,'vest',dkc);
      pt.shape(up([[cx-50,-T+2],[cx+50,-T+2],[cx+44,-10],[cx,14],[cx-44,-10]]),vest,LINE*0.8);
      for(const y of [-T*0.62,-T*0.42,-T*0.22]) pt.dot(...up([cx,y]),10,get(D,'trim',GOLD));
      for(const sg of [-1,1]) pt.shape(up([[cx+sg*48,-T+2],[cx+sg*100,-T+18],[cx+sg*56,-T*0.42]]),dkc,LINE*0.8);
      pt.shape(up([[cx-40,-T-30],[cx,-T+10],[cx+40,-T-30],[cx+44,-T+6],[cx-44,-T+6]]),WHITE,LINE*0.7);
      const tie=get(D,'tie',BLACK);
      pt.shape(up([[cx-34,-T-10],[cx,-T+6],[cx+34,-T-10],[cx+34,-T+22],[cx,-T+8],[cx-34,-T+22]]),tie,LINE*0.6);
    } else pt.line(up([[cx,-T*0.3],[cx,20]]),LINE*0.6);
  } else if(g==='uniform') {
    skirt(C,f,flare,col);pt.blob(up(tor_poly(C,130,134)),col,undefined,8);
    if(!back) {
      const strap=get(D,'strap');
      if(truth(strap)) {
        const sw=C.sh_w;
        pt.shape(up([[-sw+30+18*k,-T+10],[-sw+74+18*k,-T+10],[130-22*k,-6],[110-22*k,10]]),strap,LINE*0.7);
      }
      for(const y of linspace(-T*0.86,-T*0.16,5)) pt.dot(...up([cx,y]),10,or(trim,GOLD));
    }
    belt(C,get(D,'belt',BLACK));
    pt.shape(up([[-62+12*k,-T-34],[70-8*k,-T-34],[76-8*k,-T+12],[-68+12*k,-T+12]]),dkc,LINE*0.8);
  } else if(g==='kilt') {
    const [hL,hR]=skirt(C,f,flare,col);
    if(!back) {
      const hm=mid(hL,hR),a=up([cx-40,10]),b=up([cx+44,10]);
      pt.shape([a,b,add(hm,[70,-6]),add(hm,[-60,-6])],col,LINE*0.8);
      for(const u of [0.25,0.5,0.75]) pt.line([lerp(a,b,u),add(hm,[-60+130*u,-8])],LINE*0.45);
    }
    pt.blob(up(tor_poly(C,122,126)),SKIN,undefined,8);
    belt(C,get(D,'belt',GOLD),get(D,'belt',GOLD),undefined,-12,16);
    if(!back) {
      const nx=cx-2,ny=-T-12;
      for(const [r,cc] of [[150,get(D,'trim',GOLD)],[118,BLUE],[88,RED_DK],[62,get(D,'trim',GOLD)]])
        pt.shape(up(ellipse_pts(nx,ny,r*0.95,r*0.74,0,40,0.1,Math.PI-0.1)),cc,LINE*0.6,undefined,false);
    }
  } else if(g==='buckskin') _buckskin(C,col,dkc,cx,f,flare);
  else if(g==='shirt') _work_shirt(C,col,dkc,cx);
  else if(g==='trade_shirt') _trade_shirt(C,col,dkc,cx,f,flare);
  else if(g==='dress') _dress(C,col,dkc,cx,f,flare);
  else if(g==='blazer') _blazer(C,col,dkc,cx,f,flare);
  else if(g==='hoodie') _hoodie(C,col,dkc,cx);
  if(get(D,'cape_trim')==='ermine' && truth(get(D,'cape')) && !back) {
    const sw=C.sh_w;
    pt.blob(up([[-sw-10+18*k,-T+40],[-sw+30,-T-10],[sw-30,-T-10],[sw+10-26*k,-T+40],
      [sw-30,-T*0.68],[cx,-T*0.62],[-sw+30,-T*0.68]]),WHITE,undefined,6);
    for(const [x,y] of [[-80,-0.8],[-20,-0.72],[40,-0.8],[90,-0.72],[-100,-0.9]]) _ermine_spot(pt,up([x+20*k,T*y]),1);
  }
  if(truth(get(D,'breechcloth'))) _breechcloth(C,cx);
  if(truth(get(D,'blanket'))) _blanket(C,cx);
  if(truth(get(D,'apron'))) _apron(C,cx);
  neckwear(C);
}

export function _fringe_band(pt,pts,col,depth=40,step=18,line=LINE*0.55) {
  const top=crom(pts,false,6),bot=shifted(top,[0,depth]);
  pt.shape([...top,...bot.reverse()],col,line,undefined,false);
  const L=lengths(top);
  for(const s of arange(step*0.6,L.at(-1)-step*0.3,step)) {
    const q=atLength(s,L,top);pt.line([add(q,[0,6]),add(q,[0,depth])],LINE*0.32);
  }
}
export function _buckskin(C,col,dkc,cx,f,flare) {
  const {D,pt,up,T,k,back}=C,fr=get(D,'fringe',col),[hL,hR]=skirt(C,f,flare,col,back?0:46),hm=add(mid(hL,hR),[0,14]);
  if(back) _fringe_band(pt,[hL,hm,hR],fr,44);
  else {
    _fringe_band(pt,[hL,add(mid(hL,hm),[0,6]),sub(hm,[30,-2])],fr,44);
    _fringe_band(pt,[add(hm,[30,2]),add(mid(hR,hm),[0,6]),hR],fr,44);
  }
  pt.blob(up(tor_poly(C,132,136)),col,undefined,8);
  const sw=C.sh_w;
  if(back) {
    _fringe_band(pt,up([[-sw+16,-T+70],[0,-T*0.66],[sw-16,-T+70]]),fr,34);
    pt.line(up([[cx-4,-T*0.6],[cx-4,16]]),LINE*0.5);
  } else {
    const shirt=get(D,'shirt',BLUE);
    pt.shape(up([[cx-48,-T+2],[cx+48,-T+2],[cx+34,22],[cx-30,22]]),shirt,LINE*0.8);
    for(const y of [-T*0.62,-T*0.42,-T*0.22]) for(const sg of [-1,1]) pt.dot(...up([cx+sg*20,y]),7,get(D,'trim',[200,200,205]));
    for(const sg of [-1,1]) {
      const a=[sg*(sw-22)+(sg<0?18*k:-26*k),-T+56],b=[cx+sg*52,-T*0.6];
      _fringe_band(pt,up([a,[(a[0]+b[0])/2,(a[1]+b[1])/2+16],b]),fr,32);
    }
    for(const sg of [-1,1]) pt.line(up([[cx+sg*48,-T+4],[cx+sg*40,-T*0.5],[cx+sg*34,22]]),LINE*0.7,dkc);
  }
  belt(C,undefined,undefined,get(D,'belt_style','cartridge'));
}
export function _work_shirt(C,col,dkc,cx) {
  const {D,pt,up,T,k,back}=C;
  pt.blob(up(tor_poly(C,128,132)),col,undefined,8);
  const vest=get(D,'vest'),sw=C.sh_w;
  if(back) {
    if(truth(vest)) {
      pt.blob(up([[-sw+14,-T+26],[-60,-T+6],[60,-T+6],[sw-14,-T+26],[132,-T*0.4],[126,14],[-126,14],[-132,-T*0.4]]),vest,undefined,6);
      pt.line(up([[-90,-T*0.55],[0,-T*0.6],[90,-T*0.55]]),LINE*0.5,undefined,true);
    }
  } else {
    pt.line(up([[cx,-T+30],[cx-2,20]]),LINE*0.55);
    for(const y of [-T*0.7,-T*0.48,-T*0.26]) pt.dot(...up([cx+10,y]),8,get(D,'trim',[220,220,225]));
    if(truth(vest)) {
      const pk=get(D,'vest_dk',dk(vest,0.82));
      const L_=[[-sw+18+18*k,-T+22],[cx-34,-T+4],[cx-30,18],[-126+16*k,18],[-134,-T*0.42]];
      const R_=[[cx+34,-T+4],[sw-18-26*k,-T+22],[134-20*k,-T*0.42],[126-22*k,18],[cx+30,18]];
      for(const [poly,sg] of [[L_,-1],[R_,1]]) {
        pt.shape(up(poly),vest,LINE*0.8);
        for(const [py,ph] of [[-T*0.66,62],[-T*0.3,70]]) {
          let x0=sg>0?cx+sg*44:cx-44-64;x0-=sg>0?14*k:0;
          pt.shape(up([[x0,py],[x0+64,py],[x0+64,py+ph],[x0,py+ph]]),vest,LINE*0.55,undefined,false);
          pt.shape(up([[x0-3,py-4],[x0+67,py-4],[x0+67,py+16],[x0-3,py+16]]),pk,LINE*0.55,undefined,false);
        }
      }
    }
  }
  if(!back) for(const sg of [-1,1]) pt.shape(up([[cx+sg*4,-T+12],[cx+sg*70,-T-2],[cx+sg*48,-T+52]]),get(D,'collar_col',col),LINE*0.7,undefined,false);
  belt(C,get(D,'belt',LEATHER),undefined,get(D,'belt_style','leather'));
}

export function _print_dots(C,x0,x1,y0,y1,col,step=40,r=6) {
  const {pt,up}=C;
  for(const [i,y] of arange(y0,y1,step).entries()) for(const [j,x] of arange(x0,x1,step).entries()) {
    const jx=((i*7+j*13)%11-5)*1.6,jy=((i*5+j*3)%9-4)*1.6,px=x+jx+(i%2?step/2:0);
    if(px>x1) continue;pt.dot(...up([px,y+jy]),r,col);
  }
}
export function _trade_shirt(C,col,dkc,cx,f,flare) {
  const {D,pt,up,T,k,back}=C,[hL,hR]=skirt(C,f,flare,col,0,-30,undefined,136),pr=get(D,'print');
  if(truth(pr)) for(const u of [0.25,0.5,0.75]) {const q=add(lerp(hL,hR,u),[0,-26]);pt.dot(q[0],q[1],6,pr);}
  pt.blob(up(tor_poly(C,134,138)),col,undefined,8);
  const sw=C.sh_w;
  if(truth(pr)) _print_dots(C,-118+16*k,120-22*k,-T+40,10,pr);
  const vest=get(D,'vest');
  if(back) {
    if(truth(vest)) pt.blob(up([[-sw+14,-T+26],[-60,-T+6],[60,-T+6],[sw-14,-T+26],[134,-T*0.4],
      [128,16],[-128,16],[-134,-T*0.4]]),vest,undefined,6);
    return;
  }
  pt.line(up([[-sw+30+18*k,-T+56],[cx,-T+70],[sw-30-26*k,-T+56]]),LINE*0.45,undefined,true);
  pt.line(up([[cx,-T+10],[cx+2,-T*0.6]]),LINE*0.6);
  for(const sg of [-1,1]) pt.line(up([[cx,-T+40],[cx+sg*14,-T+74]]),LINE*0.4,get(D,'trim',dkc));
  if(truth(vest)) {
    const vt=get(D,'vest_trim');
    const L_=[[-sw+16+18*k,-T+22],[cx-40,-T+6],[cx-26,-T*0.4],[cx-40,14],[-128+16*k,14],[-136,-T*0.42]];
    const R_=[[cx+40,-T+6],[sw-16-26*k,-T+22],[136-20*k,-T*0.42],[128-22*k,14],[cx+40,14],[cx+26,-T*0.4]];
    for(const poly of [L_,R_]) {pt.shape(up(poly),vest,LINE*0.8);if(truth(vt)) pt.line(up(poly.slice(1,4)),LINE*0.9,vt);}
    for(const y of [-T*0.5,-T*0.3]) pt.dot(...up([cx-30,y]),8,get(D,'trim',[200,200,205]));
  }
  belt(C,get(D,'belt',LEATHER),undefined,get(D,'belt_style','none'));
}
export const ELK_TOOTH=[226,236,240];
export function _dress(C,col,dkc,cx,f,flare) {
  const {D,pt,up,T,k,back}=C,[hL,hR]=skirt(C,f,flare,col,0,-30,undefined,138),sel=get(D,'selvage',[226,230,232]);
  _hem_band(C,hL,hR,sel);
  const hm=add(mid(hL,hR),[0,14]);
  pt.line(crom([add(hL,[0,-34]),add(hm,[0,-34]),add(hR,[0,-34])],false,6),LINE*0.9,get(D,'yoke_trim',RED));
  pt.blob(up(tor_poly(C,138,140)),col,undefined,8);
  const sw=C.sh_w,yk=get(D,'yoke',col),teeth=get(D,'teeth',ELK_TOOTH),dip=!back?-T*0.5:-T*0.58;
  const yoke=[[-sw-12+18*k,-T+70],[-sw+4+18*k,-T+18],[-60,-T-4],[60,-T-4],
    [sw-4-26*k,-T+18],[sw+12-26*k,-T+70],[sw-50-26*k,-T*0.62],[cx,dip],[-sw+50+18*k,-T*0.62]];
  pt.blob(up(yoke),yk,undefined,6);
  const edge=[yoke[5],yoke[6],yoke[7],yoke[8],yoke[0]];
  pt.line(up(edge),LINE,get(D,'yoke_trim',RED),true);
  for(const frac of [0.78,0.5,0.22]) {
    const q=crom(edge,false,10);
    const row=q.map(p=>[cx+(p[0]-cx)*(0.55+0.45*frac),p[1]*frac+(1-frac)*(-T+6)-18*frac]);
    const L_=lengths(row),n=Math.max(3,Math.trunc(L_.at(-1)/34));
    for(const s of linspace(L_.at(-1)*0.04,L_.at(-1)*0.96,n)) {
      const [x,y]=atLength(s,L_,row);if(back && Math.abs(x)<4) continue;
      const c=up([x,y]);pt.ell(c[0],c[1],9,13,teeth,LINE*0.4,C.lean);
    }
  }
  if(!back) pt.line(up([[cx-30,-T+6],[cx,-T+30],[cx+30,-T+6]]),LINE*0.6,undefined,true);
  belt(C,get(D,'belt',LEATHER),undefined,get(D,'belt_style','tacks'));
}
export function _breechcloth(C,cx) {
  const {D,pt,up,k,back}=C,col=D.breechcloth,f=get(D,'breech_len',0.62),yb=C.leg_len*f,x=!back?cx:0;
  const q=up([[x-44,14],[x+44,14],[x+58,yb],[x-58,yb]]);pt.shape(q,col,LINE*0.8);
  const s=get(D,'selvage',[226,230,232]);
  pt.shape(up([[x-56,yb-40],[x+56,yb-40],[x+58,yb-22],[x-57,yb-22]]),s,LINE*0.5,undefined,false);
}
export function _blanket(C,cx) {
  const {D,pt,up,T,k,back}=C,col=D.blanket,band=get(D,'blanket_band',[226,230,232]),band2=get(D,'blanket_band2'),mode=get(D,'blanket_mode','waist');
  if(mode==='waist') {
    const f=get(D,'blanket_len',0.66),[hL,hR]=skirt(C,f,44,col,0,-40,undefined,142),hm=add(mid(hL,hR),[0,14]);
    for(const [off,c_,w] of [[-70,band,30],[-38,band2,12]]) {
      if(c_==null) continue;
      const a=add(hL,[6,off]),b=add(hR,[-6,off]);
      pt.shape([...crom([a,add(hm,[0,off]),b],false,6),...crom([add(b,[2,w]),add(hm,[0,off+w]),add(a,[-2,w])],false,6)],c_,LINE*0.5,undefined,false);
    }
    pt.shape(up([[-144+16*k,-58],[144-22*k,-58],[148-22*k,-16],[-148+16*k,-16]]),col,LINE*0.9);
    pt.line(up([[-140+16*k,-36],[0,-32],[140-22*k,-36]]),LINE*0.4,dk(col,0.7),true);
    if(!back) {
      const ox=cx+40;pt.line([up([ox,-16]),add(hm,[60+40*k,-4])],LINE*0.7);
      pt.line([up([ox-30,20]),add(div(add(add(up([ox-30,20]),hm),[30,-20]),2),[-6,0])],LINE*0.4,dk(col,0.7));
    }
  } else if(mode==='shawl' && !back) {
    const sw=C.sh_w,bot=get(D,'shawl_low',-0.06);
    for(const sg of [-1,1]) {
      let xo,xi;
      if(k && sg>0) {xo=sw-4-26*k;xi=sw-44-26*k;}
      else {xo=sg*(sw+24)+(sg<0?18*k:0);xi=sg*(sw-26)+(sg<0?18*k:0);}
      const q=[[xi+sg*-14,-T-2],[sg*(sw-20)+(sg<0?18*k:-26*k),-T-16],
        [xo,-T+30],[xo+sg*12,T*bot],[xi+sg*8,T*bot+10],[xi,-T*0.5]];
      pt.blob(up(q),col,LINE,5);
      const yb=T*bot;
      pt.shape(up([[xo+sg*9,yb-40],[xi+sg*7,yb-32],[xi+sg*7,yb-16],[xo+sg*11,yb-24]]),band,LINE*0.45,undefined,false);
      for(const u of linspace(0.1,0.9,5)) {
        const x=xi+sg*7+(xo+sg*11-xi-sg*7)*u,y=yb+10*(1-u);pt.line(up([[x,y],[x,y+30]]),LINE*0.4);
      }
    }
  }
}
export function _blanket_back(C) {
  const {D,pt,up,T,k}=C;
  if(!truth(get(D,'blanket')) || get(D,'blanket_mode','waist')!=='shawl') return;
  const col=D.blanket,sw=C.sh_w,bot=get(D,'shawl_low',-0.06);
  const q=[[-sw-28+18*k,-T+26],[-70,-T-20],[70,-T-20],[sw+28-26*k,-T+26],
    [sw+44-26*k,T*bot],[0,T*bot+30],[-sw-44+18*k,T*bot]];
  pt.blob(up(q),col,undefined,5);
  if(C.back) {
    const band=get(D,'blanket_band',[226,230,232]);
    pt.shape(up([[-sw-40+18*k,T*bot-44],[0,T*bot-16],[sw+40-26*k,T*bot-44],
      [sw+42-26*k,T*bot-22],[0,T*bot+6],[-sw-42+18*k,T*bot-22]]),band,LINE*0.45,undefined,false);
  }
}
export function _apron(C,cx) {
  const {D,pt,up,k,back}=C,col=D.apron;
  if(back) {
    pt.stroke(up([[-128,-4],[128,-4]]),col,18,LINE*0.5,undefined,false);
    pt.blob(up([[-10,-14],[-50,30],[-30,60],[0,0],[30,60],[50,30],[10,-14]]),col,LINE*0.5,3);return;
  }
  const [hL,hR]=skirt(C,get(D,'apron_len',0.66),20,col,0,-10,undefined,126);
  pt.shape(up([[-132+16*k,-22],[132-22*k,-22],[134-22*k,2],[-134+16*k,2]]),col,LINE*0.7);
  pt.line([up([cx-30,10]),add(mid(hL,hR),[-20,-10])],LINE*0.35,dk(col,0.82));
  pt.line([up([cx+50,10]),add(mid(hL,hR),[70,-10])],LINE*0.35,dk(col,0.82));
}

export function _tweed(C,x0,x1,y0,y1,col,skip=null,step=44) {
  const {pt,up}=C,tc=dk(col,0.78);
  for(const [i,y] of arange(y0,y1,step).entries()) for(const [j,x] of arange(x0,x1,step).entries()) {
    const jx=((i*7+j*13)%11-5)*2.2,jy=((i*5+j*3)%9-4)*2.2,px=x+jx+(i%2?step/2:0),py=y+jy;
    if(px>x1 || (skip && skip(px,py))) continue;
    const s=(i+j)%2?1:-1;pt.line(up([[px-7,py-7*s],[px+7,py+7*s]]),LINE*0.3,tc);
  }
}
export function _blazer(C,col,dkc,cx,f,flare) {
  const {D,pt,up,T,k,back}=C,gw=get(D,'girth',1),w0=124*gw,w1=126*gw;
  skirt(C,f,flare,col,back?0:56,-30,undefined,w0+6);pt.blob(up(tor_poly(C,w0,w1)),col,undefined,8);
  const bt=-T*0.3,vee=(x,y)=>(!back)&&y<bt+10&&Math.abs(x-cx)<18+74*(bt-y)/(bt+T);
  if(truth(get(D,'tweed',true))) _tweed(C,-w1+26+16*k,w1-26-20*k,-T+40,0,col,vee);
  if(back) {
    pt.line(up([[0,-T+20],[2,-T*0.4],[0,14]]),LINE*0.55,undefined,true);
    pt.shape(up([[-64,-T-24],[64,-T-24],[70,-T+14],[-70,-T+14]]),col,LINE*0.8);return;
  }
  const shirt=get(D,'shirt',[236,222,200]);
  pt.shape(up([[cx-60,-T+2],[cx+60,-T+2],[cx+10,bt],[cx-10,bt]]),shirt,LINE*0.7,undefined,false);
  pt.shape(up([[cx-18,-T-2],[cx+18,-T-2],[cx,-T+34]]),WHITE,LINE*0.5,undefined,false);
  const tie=get(D,'tie',RED_DK),kx=cx+6,ky=-T+58;
  pt.blob(up([[kx-22,ky-22],[kx+24,ky-18],[kx+14,ky+20],[kx-10,ky+18]]),tie,LINE*0.7,4);
  pt.shape(up([[kx-12,ky+16],[kx+12,ky+18],[kx+30,bt-6],[kx+14,bt+6],[kx-4,bt-2]]),tie,LINE*0.7);
  for(const sg of [-1,1]) pt.shape(up([[cx+sg*20,-T-6],[cx+sg*64,-T-2],[cx+sg*40,-T+46]]),shirt,LINE*0.7,undefined,false);
  const lap=dk(col,0.9);
  for(const sg of [-1,1]) {
    pt.shape(up([[cx+sg*58,-T+6],[cx+sg*100,-T+16],[cx+sg*92,-T+70],[cx+sg*110,-T+84],[cx+sg*12,bt+4]]),lap,LINE*0.8);
    pt.line(up([[cx+sg*92,-T+70],[cx+sg*74,-T+76]]),LINE*0.5);
  }
  pt.dot(...up([cx+2,bt+10]),12,get(D,'trim',[40,60,90]));
  const pc=get(D,'trim',[40,60,90]);
  for(const sg of [-1,1]) pt.shape(up([[cx+sg*40,-T*0.14],[cx+sg*104,-T*0.16],[cx+sg*102,-T*0.08],[cx+sg*40,-T*0.06]]),col,LINE*0.6);
  pt.line(up([[cx-98,-T*0.66],[cx-52,-T*0.64]]),LINE*0.6);
  pt.shape(up([[cx-92,-T*0.66],[cx-84,-T*0.78],[cx-70,-T*0.66]]),pc,LINE*0.5);
  for(const sg of [-1,1]) pt.line(up([[cx+sg*96,-T*0.44],[cx+sg*78,-T*0.38],[cx+sg*88,-T*0.32]]),LINE*0.45,undefined,true);
}
export function _hoodie(C,col,dkc,cx) {
  const {D,pt,up,T,k,back}=C,gw=get(D,'girth',1),w0=138*gw,w1=140*gw;
  pt.blob(up(tor_poly(C,w0,w1)),col,undefined,8);
  const rib=get(D,'jacket_dk',dk(col,0.82));
  pt.shape(up([[-w0+14+16*k,-30],[w0-14-22*k,-30],[w0-6-22*k,20],[-w0+6+16*k,20]]),rib,LINE*0.7);
  for(const x of linspace(-w0+40,w0-40,9)) pt.line(up([[x+8*k,-24],[x+8*k,14]]),LINE*0.3,dk(rib,0.8));
  if(back) {
    pt.blob(up([[-112,-T+12],[-96,-T-36],[96,-T-36],[112,-T+12],[74,-T*0.52],[0,-T*0.42],[-74,-T*0.52]]),col,undefined,6);
    pt.line(up([[0,-T-30],[0,-T*0.46]]),LINE*0.55);return;
  }
  pt.shape(up([[cx-92,-T*0.38],[cx+92,-T*0.38],[cx+112,-34],[cx-112,-34]]),col,LINE*0.6);
  for(const sg of [-1,1]) pt.line(up([[cx+sg*92,-T*0.38],[cx+sg*118,-T*0.2],[cx+sg*112,-34]]),LINE*0.6,undefined,true);
  pt.blob(up([[cx-124,-T+34],[cx-122,-T-20],[cx-62,-T-52],[cx+62,-T-52],[cx+122,-T-20],
    [cx+124,-T+34],[cx+62,-T+12],[cx,-T+26],[cx-62,-T+12]]),col,undefined,6);
  pt.line(up([[cx-70,-T+2],[cx,-T+18],[cx+70,-T+2]]),LINE*0.5,undefined,true);
  for(const sg of [-1,1]) {
    const a=up([cx+sg*26,-T+20]),b=up([cx+sg*34,-T*0.62]);
    pt.stroke([a,add(mid(a,b),[sg*4,0]),b],get(D,'cord',WHITE),12,LINE*0.45,true,false);
    pt.shape([add(b,[-9,-2]),add(b,[9,-2]),add(b,[7,26]),add(b,[-7,26])],dk(col,0.6),LINE*0.4,undefined,false);
  }
}

export function neckwear(C) {
  const {D,pt,up,T,k,back}=C,cx=10+30*k;
  if(truth(get(D,'kerchief'))) {
    const kc=D.kerchief;
    if(back) pt.blob(up([[-80,-T+4],[80,-T+4],[40,-T+60],[0,-T+84],[-40,-T+60]]),kc,LINE*0.8,4);
    else {
      pt.blob(up([[cx-76,-T+2],[cx+76,-T+2],[cx+52,-T+40],[cx-52,-T+40]]),kc,LINE*0.8,4);
      for(const [dx,ln] of [[-22,96],[20,84]]) pt.blob(up([[cx+dx*0.4-14,-T+36],[cx+dx*0.4+14,-T+36],
        [cx+dx+16,-T+36+ln],[cx+dx-14,-T+40+ln]]),kc,LINE*0.7,3);
      pt.ell(...up([cx,-T+40]),24,20,kc,LINE*0.7);
    }
  }
  if(truth(get(D,'choker')) && !back) {
    const pc=D.choker;
    for(const [y0,w] of [[-T+12,62],[-T+32,66]]) {
      pt.shape(up([[cx-w,y0],[cx+w,y0],[cx+w-2,y0+18],[cx-w+2,y0+18]]),pc,LINE*0.55,undefined,false);
      for(const x of arange(cx-w+24,cx+w-10,24)) pt.line(up([[x,y0+2],[x,y0+16]]),LINE*0.35);
    }
    pt.line(up([[cx,-T+10],[cx,-T+52]]),LINE*0.5,get(D,'choker_bead',[160,92,40]));
    pt.ell(...up([cx,-T+32]),12,12,get(D,'brass',[70,170,214]),LINE*0.4);
  }
  if(truth(get(D,'lanyard')) && !back) {
    const lc=D.lanyard,clip=up([cx+8,-T*0.4]);
    for(const sg of [-1,1]) pt.stroke([up([cx+sg*58,-T+4]),up([cx+sg*34,-T*0.68]),clip],lc,15,LINE*0.45,true,false);
    const top=-T*0.4+18,card=[[cx-40,top],[cx+56,top],[cx+56,top+122],[cx-40,top+122]];
    pt.shape(up(card),WHITE,LINE*0.7,undefined,false);
    pt.shape(up([[cx-40,top],[cx+56,top],[cx+56,top+30],[cx-40,top+30]]),lc,LINE*0.5,undefined,false);
    pt.shape(up([[cx-28,top+42],[cx+4,top+42],[cx+4,top+80],[cx-28,top+80]]),[200,200,200],LINE*0.4,undefined,false);
    pt.ell(...up([cx-12,top+56]),9,9,WHITE,LINE*0.3,undefined,false);
    for(const y of [top+52,top+70,top+98]) pt.line(y<top+90?up([[cx+14,y],[cx+44,y]]):up([[cx-26,y],[cx+40,y]]),LINE*0.35,[90,90,100]);
    pt.ell(...clip,12,12,STEEL,LINE*0.5);
  }
  if(truth(get(D,'headphones'))) {
    const hc=D.headphones;
    if(back) {
      pt.stroke(up([[-118,-T+2],[0,-T-44],[118,-T+2]]),hc,26,LINE*0.6,true);
      for(const sg of [-1,1]) pt.ell(...up([sg*124,-T+22]),40,50,hc,LINE*0.8,C.lean);
      return;
    }
    pt.stroke(up([[cx-84,-T+40],[cx,-T-30],[cx+84,-T+40]]),hc,22,LINE*0.6,true);
    for(const sg of [-1,1]) {
      if(k && sg>0) continue;
      const c=up([cx+sg*(84+10*k),-T+56]);
      pt.ell(c[0],c[1],40,50,hc,LINE*0.8,C.lean+sg*0.3);
      pt.ell(c[0]-sg*2,c[1]+2,22,32,dk(hc,0.5),LINE*0.45,C.lean+sg*0.3,false);
    }
  }
}
export function glasses(C) {
  const {D,pt,H,p}=C,kind=get(D,'glasses');
  if(kind==null || kind==='none' || C.back) return;
  const s=get(p,'specs',0),fc=get(D,'glasses_col',INK),y0=kind==='halfmoon'?24+24*s:10+20*s,fsx=C.fsx;
  const xs=[-1,1].map(sd=>fsx+sd*46*((fsx && sd<0)?0.82:1));
  for(const [i,sd] of [-1,1].entries()) {
    const x=xs[i];let lens;
    if(kind==='halfmoon') lens=[[x+34,y0],...ellipse_pts(x,y0,34,24,0,16,0,Math.PI),[x+34,y0]];
    else {lens=ellipse_pts(x,y0,32,30,0,28);lens=[...lens,...lens.slice(0,1)];}
    pt.line(H(lens),LINE*0.55,fc);
    pt.line(kind==='halfmoon'?H([[x+8,y0+6],[x+18,y0+14]]):H([[x+6,y0-12],[x+16,y0-4]]),LINE*0.35,[200,200,200]);
    const ex=x+sd*34;
    if(!(fsx && sd<0)) pt.line(H([[ex,y0+2],[sd*(C.rx-6)+fsx*0.4,y0-16]]),LINE*0.5,fc);
  }
  const ty=y0+(kind==='halfmoon'?2:-2);
  pt.line(H([[xs[0]+34,ty],[(xs[0]+xs[1])/2,ty-8],[xs[1]-34,ty]]),LINE*0.5,fc,true);
}
export function _hem_band(C,hL,hR,col) {
  const hm=add(mid(hL,hR),[0,14]);
  const poly=[...crom([hL,hm,hR],false,6),...crom([add(hR,[0,-34]),add(hm,[0,-34]),add(hL,[0,-34])],false,6)];
  C.pt.shape(poly,col,LINE*0.7,undefined,false);
}
export function _neckline(C,trim) {
  if(C.back) return;
  const {pt,up,T,k}=C,cx=10+30*k;
  if(truth(trim)) pt.shape(up(ellipse_pts(cx,-T+2,74,34,0,30,0,Math.PI)),trim,LINE*0.7,undefined,false);
  pt.line(up([[cx-34,-T+8],[cx,-T+70],[cx+34,-T+8]]),LINE*0.6);
}
export function _lace_ticks(pt,a,b,col,n) {
  const d=sub(b,a),nrm=_perp(_n(d));
  for(const u of linspace(0.08,0.92,n)) {const q=add(a,mul(d,u));pt.line([sub(q,mul(nrm,9)),add(q,mul(nrm,9))],LINE*0.6,col);}
}
export function arm(C,side,sh,el,wr,kind,handfn) {
  const {D,pt}=C,held=C.held(side),d=sub(wr,el),af=Math.atan2(d[1],d[0]);
  if(held!=='none' && kind==='mitt') kind='fist';
  if(held!=='none' && !SHIELDS.includes(held)) prop(C,held,side);
  sleeve(C,side,sh,el,wr);handfn(af,kind);
  if(SHIELDS.includes(held)) {if(C.fac==='r' && side>0) C.defer.push(side);else prop(C,held,side);}
  return kind;
}
export function deferred(C) { for(const side of C.defer) prop(C,C.held(side),side);C.defer=[]; }
export function sleeve(C,side,sh,el,wr) {
  const {D,pt,garment:g}=C;
  let col=get(D,'sleeve',get(D,'jacket',RED));
  if(['puffy','zip'].includes(g)) {
    pt.stroke([sh,el,wr],D.jacket,g==='puffy'?84:74,LINE);
    if(g==='puffy') for(const f of [0.45,1.4]) {
      const [a0,a1]=f<1?[sh,el]:[el,wr],c=lerp(a0,a1,f<1?f:f-1),n=_perp(_n(sub(a1,a0)));
      pt.line([sub(c,mul(n,30)),add(c,mul(n,30))],LINE*0.6);
    }
    return;
  }
  const sty=get(D,'sleeves',get(C.g,'sleeves','long'));
  if(g==='mail') col=get(D,'mail',STEEL);
  if(g==='plate') col=get(D,'steel',get(D,'jacket',STEEL));
  if(sty==='fringe') {
    const fr=get(D,'fringe',col),g_=[0,1];
    for(const [a,b] of [[lerp(sh,el,0.2),el],[el,sub(wr,mul(sub(wr,el),0.2))]]) {
      const d=_n(sub(b,a)),n=_perp(d);let nd=dot(n,g_)>=0?n:neg(n);
      if(Math.abs(dot(d,g_))>0.93) nd=[C.fac==='r'||side<0?-1:1,0];
      const q=[add(a,mul(nd,30)),add(b,mul(nd,30)),add(b,mul(nd,64)),add(a,mul(nd,64))];
      pt.shape(q,fr,LINE*0.5,undefined,false);
      for(const u of linspace(0.1,0.9,6)) {const m=lerp(a,b,u);pt.line([add(m,mul(nd,40)),add(m,mul(nd,64))],LINE*0.32);}
    }
    pt.stroke([sh,el,wr],col,78);
  } else if(sty==='rolled') {
    pt.stroke([sh,el,wr],SKIN,62);
    const d=_n(sub(wr,el)),cuff=add(el,mul(d,26));pt.stroke([sh,cuff],col,78);
    const nn=_perp(d);
    pt.shape([sub(sub(cuff,mul(nn,44)),mul(d,12)),sub(add(cuff,mul(nn,44)),mul(d,12)),
      add(add(cuff,mul(nn,42)),mul(d,18)),add(sub(cuff,mul(nn,42)),mul(d,18))],get(D,'roll',dk(col,0.86)),LINE*0.7,undefined,false);return;
  } else if(sty==='dress') {
    pt.stroke([sh,el,wr],SKIN,62);
    const end=add(el,mul(_n(sub(wr,el)),30)),g_=[0,1],a=lerp(sh,el,0.3);
    const flap=[a,end,add(add(end,mul(g_,74)),mul(_n(sub(end,a)),8)),add(mid(a,end),mul(g_,70)),add(a,mul(g_,40))];
    pt.blob(flap,col,LINE*0.8,4);
    pt.shape([add(a,mul(g_,30)),add(mid(a,end),mul(g_,58)),add(end,mul(g_,60)),add(end,mul(g_,72)),
      add(mid(a,end),mul(g_,70)),add(a,mul(g_,42))],get(D,'selvage',[226,230,232]),LINE*0.4,undefined,false);
    pt.stroke([sh,el,end],col,92);return;
  } else if(['long','mail','plate'].includes(sty)) pt.stroke([sh,el,wr],col,sty==='long'?76:80);
  else if(sty==='short') {
    pt.stroke([sh,el,wr],SKIN,62);pt.stroke([sh,lerp(sh,el,0.62)],g==='segmentata'?get(D,'tunic',col):col,84);
  } else if(sty==='none') pt.stroke([sh,el,wr],SKIN,62);
  else if(sty==='wide') {
    pt.stroke([sh,el,wr],col,80);
    const a=lerp(el,wr,0.05),b=sub(wr,mul(sub(wr,el),0.16)),d=_n(sub(b,a)),n=_perp(d),g_=[0,1],nd=dot(n,g_)>=0?n:neg(n);
    const droop=60+70*Math.max(0,1-Math.abs(dot(d,g_)));
    const poly=[sub(a,mul(nd,40)),sub(b,mul(nd,56)),add(b,mul(nd,58)),add(add(add(b,mul(nd,58)),mul(g_,droop*0.7)),mul(d,-10)),
      add(add(mid(a,b),mul(nd,44)),mul(g_,droop)),add(a,mul(nd,40))];
    pt.blob(poly,col,undefined,6);pt.line([sub(b,mul(nd,54)),add(b,mul(nd,56))],LINE*0.9,or(get(D,'trim'),dk(col)));
  }
  if(sty==='mail') {_mail_rows(pt,sh,el,2);_mail_rows(pt,el,wr,2);}
  if(sty==='plate') {
    pt.ell(el[0],el[1],46,40,col,LINE*0.9);pt.dot(el[0],el[1],9,IRON);
    const d=_n(sub(el,sh)),pc=add(sh,mul(d,22));
    pt.blob(shifted(rot([[-70,-20],[-30,-66],[50,-62],[78,-10],[60,40],[-60,40]],Math.atan2(d[1],d[0])-Math.PI/2),pc),col,undefined,6);
    for(const o of [12,34]) {
      const a=add(pc,mul(d,o)),nn=_perp(d);pt.line([sub(a,mul(nn,60)),add(a,mul(d,8)),add(a,mul(nn,60))],LINE*0.5,undefined,true);
    }
  }
  if(g==='lamellar' && truth(get(D,'sode',true))) {
    const d=_n(sub(el,sh)),nn=_perp(d),a=sub(sh,mul(d,26)),b=add(sh,mul(d,150));
    const poly=[sub(a,mul(nn,62)),add(a,mul(nn,62)),add(b,mul(nn,70)),sub(b,mul(nn,70))];
    pt.shape(poly,get(D,'jacket',RED),LINE);
    for(const u of [0.33,0.66]) {
      const q0=add(sub(a,mul(nn,64)),mul(sub(b,a),u)),q1=add(add(a,mul(nn,64)),mul(sub(b,a),u));
      pt.line([q0,q1],LINE*0.5);_lace_ticks(pt,sub(q0,mul(d,22)),sub(q1,mul(d,22)),or(get(D,'trim'),BLUE),4);
    }
  }
  if(g==='segmentata') {
    const d=_n(sub(el,sh)),nn=_perp(d);
    for(const o of [-30,0,30]) {
      const q=add(sh,mul(d,o+10));
      pt.shape([sub(sub(q,mul(nn,56)),mul(d,18)),sub(add(q,mul(nn,56)),mul(d,18)),
        add(add(q,mul(nn,52)),mul(d,16)),add(sub(q,mul(nn,52)),mul(d,16))],get(D,'steel',STEEL),LINE*0.7);
    }
  }
  if(g==='uniform') {
    const d=_n(sub(el,sh)),nn=_perp(d);
    if(truth(get(D,'epaulettes',true))) {
      const q=add(sh,mul(d,6));
      pt.shape([sub(sub(q,mul(nn,50)),mul(d,22)),sub(add(q,mul(nn,50)),mul(d,22)),
        add(add(q,mul(nn,54)),mul(d,14)),add(sub(q,mul(nn,54)),mul(d,14))],get(D,'trim',GOLD),LINE*0.7);
      for(const u of linspace(-0.8,0.8,5)) pt.line([add(add(q,mul(nn,50*u)),mul(d,14)),add(add(q,mul(nn,52*u)),mul(d,36))],LINE*0.45,get(D,'trim',GOLD));
    }
  }
  if(['uniform','coat'].includes(g) && sty==='long') {
    const d=_n(sub(wr,el)),nn=_perp(d),q=sub(wr,mul(d,34));
    pt.shape([sub(q,mul(nn,40)),add(q,mul(nn,40)),add(add(q,mul(nn,40)),mul(d,22)),add(sub(q,mul(nn,40)),mul(d,22))],get(D,'jacket_dk',dk(col)),LINE*0.6,undefined,false);
  }
  if(g==='blazer' && sty==='long') {
    const d=_n(sub(wr,el));
    if(truth(get(D,'tweed',true))) for(const u of [0.3,0.7]) for(const o of [-18,16]) {
      const q=add(lerp(sh,el,u),mul(_perp(_n(sub(el,sh))),o));pt.line([sub(q,[7,7]),add(q,[7,7])],LINE*0.3,dk(col,0.78));
    }
    const pc=add(el,mul(d,8)),ang=Math.atan2(d[1],d[0])-Math.PI/2;
    pt.ell(pc[0],pc[1],30,40,get(D,'patch',[40,62,96]),LINE*0.6,ang);
    const st=ellipse_pts(pc[0],pc[1],21,31,ang,14);
    for(let i=0;i+1<st.length;i+=2) pt.line([st[i],st[i+1]],LINE*0.25,[150,170,190]);
    const q=sub(wr,mul(d,30));pt.line([sub(q,mul(_perp(d),38)),add(q,mul(_perp(d),38))],LINE*0.5);
  }
  if(g==='hoodie' && sty==='long') {
    const d=_n(sub(wr,el)),nn=_perp(d),q=sub(wr,mul(d,40));
    pt.shape([sub(q,mul(nn,36)),add(q,mul(nn,36)),add(add(q,mul(nn,34)),mul(d,30)),add(sub(q,mul(nn,34)),mul(d,30))],get(D,'jacket_dk',dk(col,0.82)),LINE*0.6,undefined,false);
    for(const u of [-0.5,0,0.5]) pt.line([add(add(q,mul(nn,34*u)),mul(d,4)),add(add(q,mul(nn,34*u)),mul(d,26))],LINE*0.25,dk(col,0.6));
  }
  if(g==='kilt') {
    const d=_n(sub(el,sh)),nn=_perp(d),q=add(sh,mul(d,100));
    pt.shape([sub(q,mul(nn,34)),add(q,mul(nn,34)),add(add(q,mul(nn,34)),mul(d,22)),add(sub(q,mul(nn,34)),mul(d,22))],get(D,'trim',GOLD),LINE*0.6,undefined,false);
  }
}
