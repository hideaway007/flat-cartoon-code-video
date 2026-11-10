// scenes_b.js — noon set, shots C / D / E, and the frame dispatcher
function noonBack(cam, tr = 0, village = 0, haze = 0) {
  const bg = { x: cam.x + tr, y: cam.y, z: cam.z };
  sky(NOON);
  layer(cam, 0.04, () => ell(1600, 170, 74, 74, C(NOON.sun)));
  layer(bg, 0.1, () => { cloud(330, 230, 1.6, NOON.cloud); cloud(1180, 330, 1.1, NOON.cloud); cloud(2100, 200, 1.5, NOON.cloud); });
  layer(bg, 0.22, () => ridge(590, 130, 11, NOON.far));
  layer(bg, 0.45, () => {
    ridge(680, 60, 23, NOON.mid); river(742, 36, NOON.river, NOON.riverSh);
    for (let i = 0; i < 11; i++) { const x = -300 + i * 330 + (i % 3) * 60; if (!village || x < 950) tree(x, 740 + Math.sin(x * 0.004 + 3) * 26, 0.5 + (i % 3) * 0.12); }
    if (village) lodges(7, 34, 1020, 2050, 676, 1.0, '#f4eddc', '#d2c8b0');
  });
  if (haze > 0) {                                           // flat haze banks rolling over the valley
    g.globalAlpha = 0.9 * haze;
    layer(cam, 0.45, () => { const dx = 500 * (1 - haze); cloud(1250 + dx, 640, 3.6, '#e9f0ea'); cloud(1820 + dx, 690, 3.2, '#e9f0ea'); cloud(900 + dx, 720, 2.6, '#e9f0ea'); });
    g.globalAlpha = 1;
  }
  return bg;
}
function noonGround(bg) {
  let gy; layer(bg, 1, () => { gy = ground(NOON, 860); });
  return gy;
}
const fore = bg => layer(bg, 1.7, () => [[180, 1160, 2.6], [1250, 1200, 2.2], [2050, 1160, 3], [2900, 1180, 2.5]].forEach(q => sage(q[0], q[1], q[2])));

// ---- C · 6.9–8.9 · "just after noon in southern Montana."
function shotC(t) {
  DEAD = 0;
  const cam = camAt([[6.9, -150, 10, 1.14], [6.9, 40, 0, 1.0, 1.3]], t), ph = t * 5, tr = (t - 6.9) * 70;
  const bg = noonBack(cam, tr), gy = noonGround(bg);
  layer(cam, 1, () => {
    for (let i = 4; i >= 1; i--) { const x = 760 - i * 250 - (i % 2) * 24; trooper(x, gy(x + tr) + 26 + (i % 2) * 20, 0.62, i, ph, { dust: '#efe0b4' }); }
    mounted(760, gy(760 + tr) + 30, 0.86, { ...CUS, ph, blanket: '#2c456e', brow: 0.4, eyes: blink(t), lid: 0.25, mouth: 'smile', dust: '#efe0b4' });
  });
  fore(bg);
  plate(120, 120, 'SOUTHERN MONTANA', 'just after noon', tw(t, 7.5, 7.95, x => x), 62);
}

// ---- D · 8.9–13.4 · "Lt. Col. George Armstrong Custer splits his cavalry regiment into four pieces"
const GROUPS = [ // [x, y offset, scale] where each detachment ends up
  [1180, -185, 0.3], [1500, 44, 0.52], [40, 54, 0.52], [905, -250, 0.2]];
function shotD(t) {
  DEAD = 0;
  const cam = camAt([[8.9, -160, -110, 1.8], [10.95, 0, 0, 1.0, 1.0]], t);
  const bg = noonBack(cam), gy = noonGround(bg), sp = tw(t, 11.1, 13.2, eout), go = t > 11.0 && t < 13.2 ? t * 6 : 0.6;
  const point = tw(t, 11.0, 11.4, back);
  layer(cam, 1, () => {
    const draw = [];
    GROUPS.forEach((G, gi) => {
      for (let j = 0; j < 3; j++) {
        const hx = -330 + (gi % 2) * 130 + j * 50, hy = -34 + gi * 5, hs = 0.5;        // huddle near Custer before the split
        const x = lerp(hx, G[0] + j * 150 * G[2] * 1.9, sp), s = lerp(hs, G[2], sp), y = gy(x) + 26 + lerp(hy, G[1], sp * sp) + j * 6 * s;
        draw.push([x < 930 ? y - 300 : y, () => at(x, y, 1, () => trooper(0, 0, s, gi * 3 + j, go, sp > 0.02 && sp < 0.97 ? { dust: '#efe0b4' } : {}))]);
      }
    });
    draw.push([gy(640) + 34, () => mounted(640, gy(640) + 34, 0.9, { ...CUS, ph: 0.6, nod: Math.sin(t * 1.6) * 7,
      blanket: '#2c456e', brow: 0.55, lid: 0.3, mouth: point > 0.5 && t < 12.5 ? 'open' : 'smile', tilt: -0.08 + Math.sin(t * 1.3) * 0.015, eyes: blink(t), hand: [lerp(95, 150, point), lerp(-312, -440, point)], noReins: point > 0.3 })]);
    draw.sort((a, b) => a[0] - b[0]).forEach(d => d[1]());
    GROUPS.forEach((G, gi) => {                              // the teacher's red pen numbers the pieces
      const p = tw(t, 12.6 + gi * 0.17, 12.95 + gi * 0.17, eout); if (p <= 0) return;
      const cx = G[0] + 150 * G[2] * 1.9, cy = gy(cx) + 26 + G[1] - 650 * G[2] - 56;
      pen(ring(cx, cy, 52, 46), p, 9); g.globalAlpha = p; text(String(gi + 1), cx, cy + 4, 66, RED, 'Bradley Hand', 'center', 700); g.globalAlpha = 1;
    });
  });
  fore(bg);
  const np = Math.min(tw(t, 9.04, 9.5, x => x), 1 - tw(t, 10.8, 11.05, x => x));
  plate(930, 900, 'Lt. Col. George Armstrong Custer', '7th U.S. Cavalry', np, 48);
  plate(120, 110, 'ONE REGIMENT, FOUR PIECES', null, tw(t, 12.3, 12.7, x => x), 50);
}

// ---- E · 13.4–17.5 · "and sends them toward a Lakota and Cheyenne village he still hasn't seen."
function shotE(t) {
  DEAD = 0;
  const cam = camAt([[13.4, -40, 0, 1.0], [13.4, 150, -40, 1.14, 2.6]], t), haze = tw(t, 15.9, 17.1);
  const bg = noonBack(cam, 0, 1, haze), gy = noonGround(bg), shade = tw(t, 14.1, 14.5, back);
  if (t > 14.5) {
    const p = tw(t, 14.55, 14.95, x => x) * (1 - 0.6 * haze);
    layer(cam, 0.45, () => { g.globalAlpha = clamp(p * 2); g.beginPath(); g.moveTo(1500, 560); g.lineTo(1500, 664); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(); ell(1500, 668, 8, 8, INK); g.globalAlpha = 1; });
    const sx = W / 2 + (1 + (cam.z - 1) * 0.45) * (1500 - W / 2 - cam.x * 0.45);
    g.globalAlpha = 1 - 0.6 * haze; plate(sx - 560, 400, 'Lakota & Cheyenne village', null, p / (1 - 0.6 * haze + 1e-6), 50); g.globalAlpha = 1;
  }
  layer(cam, 1, () => {
    mounted(520, gy(520) + 34, 0.95, { ...CUS, ph: 0.6, nod: Math.sin(t * 1.4) * 6, blanket: '#2c456e',
      brow: -0.6 * haze, tilt: -0.05 - 0.05 * shade, eyes: blink(t), look: shade, lid: 0.15 + 0.4 * haze, mouth: haze > 0.4 ? 'frown' : null, hand: [lerp(95, 74, shade), lerp(-312, -536, shade)], noReins: shade > 0.3, lean: 0.06 * shade });
    const q = tw(t, 16.4, 16.9, eout);                      // red "?" over his head
    g.translate(60, -70); pen([[640, 250], [662, 214], [706, 204], [742, 228], [738, 268], [706, 292], [694, 322], [694, 344]], q, 13);
    if (q > 0.95) ell(694, 384, 9, 9, RED);
  });
  fore(bg);
}

window.renderFrame = t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; TINT = null;
  (t < 4.7 ? shotA : t < 6.9 ? shotB : t < 8.9 ? shotC : t < 13.4 ? shotD : shotE)(t);
};
