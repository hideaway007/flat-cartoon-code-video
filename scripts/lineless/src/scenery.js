// scenery.js — flat layered landscape pieces. Every colour goes through C() so the "dead" beat drains them too.
const DUSK = { sky: ['#3a2d5c', '#8c3f6e', '#e0685a', '#f7b25a'], sun: '#ffe2a0', cloud: '#b04e6c',
  far: ['#7d3a66', '#6a2f5c'], mid: ['#5a2852', '#4a2148'], near: ['#3a1b3e', '#2e1533'], tuft: '#22102a' };
const NOON = { sky: ['#4f9fd0', '#7fbfe0', '#b9dfea', '#e4f1e6'], sun: '#fff3b8', cloud: '#ffffff',
  far: ['#9db7a6', '#86a595'], mid: ['#a9bf7c', '#8fa864'], near: ['#dcc276', '#c2a558'], tuft: '#9a8440',
  river: '#7cc3da', riverSh: '#5fa9c4' };

function sky(p) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  p.sky.forEach((c, i) => gr.addColorStop(i / (p.sky.length - 1) * 0.86, C(c)));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function cloud(x, y, s, fill) {
  rr(x - 90 * s, y, 180 * s, 34 * s, 17 * s, C(fill)); rr(x - 46 * s, y - 24 * s, 112 * s, 42 * s, 21 * s, C(fill));
  rr(x - 136 * s, y + 20 * s, 150 * s, 24 * s, 12 * s, C(fill));
}
// rolling ridge filled downward; returns y(x) so figures can stand on it
function ridge(y, amp, seed, cols, x0 = -1400, x1 = 3400, step = 170) {
  const r = rng(seed), pts = [];
  for (let x = x0; x <= x1; x += step) pts.push([x, y - amp * (0.5 + 0.5 * Math.sin(x * 0.0023 + seed)) - r() * amp * 0.3]);
  const path = () => { curve(pts, false); g.lineTo(x1, 3000); g.lineTo(x0, 3000); g.closePath(); };
  form(path, C(cols[0]), () => { g.translate(150, amp * 0.42 + 24); g.beginPath(); path(); g.fillStyle = C(cols[1]); g.fill(); });
  return x => {
    const i = clamp(Math.floor((x - x0) / step), 0, pts.length - 2), f = (x - pts[i][0]) / step;
    return lerp(pts[i][1], pts[i + 1][1], f);
  };
}
function tufts(seed, n, x0, x1, yFn, dy, fill, s = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = yFn(x) + 14 + r() * dy, k = (0.6 + r() * 0.8) * s;
    limb(x, y, x - 9 * k, y - 26 * k, 4 * k, 1, C(fill)); limb(x, y, x + 2 * k, y - 34 * k, 4 * k, 1, C(fill)); limb(x, y, x + 13 * k, y - 22 * k, 4 * k, 1, C(fill));
  }
}
function sage(x, y, s, a = '#7f9a78', b = '#5f7a5e') {
  ell(x, y - 26 * s, 62 * s, 34 * s, C(b)); ell(x - 26 * s, y - 40 * s, 40 * s, 30 * s, C(a)); ell(x + 30 * s, y - 36 * s, 34 * s, 26 * s, C(a));
}
// winding river band across a valley floor
function river(y, w, fill, shade, seed = 3) {
  const top = [], bot = [];
  for (let x = -1400; x <= 3400; x += 200) { const yy = y + Math.sin(x * 0.004 + seed) * 26; top.push([x, yy]); bot.unshift([x + 40, yy + w + Math.sin(x * 0.006) * 6]); }
  form(() => { curve(top, false); bot.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); }, C(fill),
    () => { g.translate(0, w * 0.55); g.beginPath(); curve(top, false); g.lineTo(3400, 3000); g.lineTo(-1400, 3000); g.fillStyle = C(shade); g.fill(); });
}
// distant lodges, small and pale: a place, not a prop
function lodges(seed, n, x0, x1, y, s, fill, shade) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), yy = y + r() * 46, k = s * (0.7 + r() * 0.6);
    poly([[x - 17 * k, yy], [x, yy - 40 * k], [x + 17 * k, yy]], C(fill)); poly([[x, yy - 40 * k], [x + 17 * k, yy], [x + 5 * k, yy]], C(shade));
  }
}
// red-pen stroke that draws on over time (the teacher's marking hand); pts in screen space
function pen(pts, p, w = 9, col = '#d8352a') {
  if (p <= 0) return;
  const n = Math.max(2, Math.ceil(pts.length * clamp(p)));
  g.beginPath(); curve(pts.slice(0, n), false); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}

// ---- v2 additions --------------------------------------------------------
Object.assign(NOON, { trail: ['#ecdcab', '#dcc68c'], front: ['#cbb063', '#b1944a'] });
Object.assign(DUSK, { trail: ['#4d2450', '#421d46'], front: ['#2c1431', '#230f29'] });
function tree(x, y, s, a = '#6f9a5a', b = '#557d48') {
  limb(x, y, x, y - 70 * s, 7 * s, 5 * s, C('#6b4a33'));
  ell(x, y - 96 * s, 52 * s, 44 * s, C(b)); ell(x - 16 * s, y - 112 * s, 38 * s, 32 * s, C(a)); ell(x + 22 * s, y - 86 * s, 26 * s, 22 * s, C(a));
}
// three-band foreground: back grass / dirt trail / front grass. Returns y(x) of the back-grass edge;
// feet placed at gy(x)+26..+90 land on the trail.
function ground(p, y = 860) {
  const gy = ridge(y, 36, 5, p.near);
  ridge(y + 18, 36, 5, p.trail);
  const r = rng(31);
  for (let i = 0; i < 46; i++) { const x = -400 + r() * 3600, k = 0.6 + r(); ell(x, gy(x) + 34 + r() * 78, 9 * k, 4.5 * k, C(p.trail[1])); }
  ridge(y + 128, 36, 5, p.front);
  tufts(8, 60, -400, 3200, x => gy(x) + 128, 130, p.tuft, 1.25);
  tufts(9, 26, -400, 3200, x => gy(x) - 12, 8, p.tuft, 0.7);
  return gy;
}
