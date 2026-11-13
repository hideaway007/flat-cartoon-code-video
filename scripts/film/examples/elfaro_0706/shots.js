// EL FARO, 07:06 · style 3 "CUTAWAY" · 15 s, eight shots, cut on a half-second grid (the alarm lamp is the metronome).
// 1 list indicator 0-1.5 · 2 the ship in the storm + title 1.5-3.5 · 3 the bridge, who is who 3.5-5 · 4 the mug 5-6
// 5 the captain, the call 6-8 · 6 cross-section, the three things he reports 8-11 · 7 she goes over 11-12.6 · 8 the recording ends 12.6-15
// Every quoted line is from the NTSB transcript of the bridge audio.

// ---- 1 · insert: the list indicator. The camera is bolted to the ship, so the pendulum shows the list.
function sh_clino(t) {
  const al = alarm3(t), sh = shake3(t, 0.8), fk = t > 0.86 && t < 0.93 ? 0.45 : 1;
  camSet(960 + sh[0], 560 + sh[1], lerp(1.04, 1.12, eout(prog(t, 0, 1.5))));
  rect(-40, -40, W + 80, H + 80, LG(0, 0, 0, H, [[0, '#22364a'], [1, '#0f1823']]));
  for (let x = 110; x < W; x += 430) { rect(x, 0, 5, H, '#0d151e'); rect(x + 5, 0, 2, H, A('#ffffff', 0.05));
    for (let y = 190; y < H; y += 130) { ell(x - 24, y, 7, 7, '#31485e'); ell(x - 25, y - 1, 3, 3, A('#ffffff', 0.2)); ell(x + 30, y, 7, 7, '#31485e'); ell(x + 29, y - 1, 3, 3, A('#ffffff', 0.2)); } }
  rect(0, 92, W, 28, '#31485e'); rect(0, 116, W, 5, '#0d151e'); [250, 1000, 1760].forEach(x => rr(x, 82, 30, 48, 6, '#48627a'));
  glow(380, -100, 1100, '#f2c078', 0.22 * fk);
  const dn = 15 + 3.5 * Math.exp(-t * 1.6) * Math.cos(t * 7 + Math.PI) + 0.4 * wig(t, 1.3), rad = d => Math.PI / 2 + d * Math.PI / 180;
  // keys on a hook: they hang 15 degrees off the bulkhead too
  rr(264, 262, 52, 30, 6, '#48627a'); ell(290, 296, 9, 9, '#0d151e');
  at(290, 296, 0.86, () => { pline([[0, 0], [0, 110]], 5, '#8a6a44'); g.lineWidth = 6; g.strokeStyle = '#c9a064'; g.beginPath(); g.arc(0, 132, 22, 0, TAU); g.stroke(); g.translate(0, -20);
    at(0, 172, 1, () => { limb(0, 0, 0, 92, 5, 4, '#c9a064'); ell(0, 0, 14, 14, '#c9a064'); rect(0, 70, 12, 7, '#c9a064'); rect(0, 82, 9, 7, '#c9a064'); }, -0.22 + 0.06 * wig(t, 2.1));
    at(0, 172, 1, () => { rr(-22, 6, 44, 76, 8, C3.amb); ell(0, 20, 5, 5, '#10161f'); rect(-12, 40, 24, 4, '#10161f'); rect(-12, 52, 24, 4, '#10161f'); }, 0.3 + 0.08 * wig(t, 1.7, 1)); }, (dn + 6 * wig(t, 1.05, 1)) * Math.PI / 180);
  // the instrument
  const P = [1010, 236], R = 580, pt = (d, r) => [P[0] + Math.cos(rad(d)) * r, P[1] + Math.sin(rad(d)) * r];
  shadowed(() => rr(500, 130, 1020, 820, 46, '#1a2937'), 16, 44, 0.5); g.lineWidth = 4; g.strokeStyle = '#31485e'; g.beginPath(); g.roundRect(512, 142, 996, 796, 36); g.stroke();
  [[548, 178], [1472, 178], [548, 902], [1472, 902]].forEach(([x, y]) => { ell(x, y, 13, 13, '#48627a'); rect(x - 9, y - 2, 18, 4, '#0d151e'); });
  const face = () => { g.moveTo(P[0], P[1]); g.arc(P[0], P[1], R, rad(-52), rad(52)); g.closePath(); };
  form(face, C3.cream, () => { g.beginPath(); g.arc(P[0], P[1], R - 10, rad(-52), rad(52)); g.lineWidth = 22; g.strokeStyle = '#e2dac4'; g.stroke(); });
  const band = (d0, d1, c) => { g.beginPath(); g.arc(P[0], P[1], R - 24, rad(d0), rad(d1)); g.lineWidth = 16; g.lineCap = 'butt'; g.strokeStyle = c; g.stroke(); };
  band(10, 20, C3.amb); band(-20, -10, C3.amb); band(20, 51, C3.red); band(-51, -20, C3.red);
  for (let d = -50; d <= 50; d += 5) { const M = d % 10 === 0; pline([pt(d, R - (M ? 98 : 70)), pt(d, R - 38)], M ? 6 : 3, '#27394b', 'butt');
    if (M) { const q = pt(d, R - 134); tx(String(Math.abs(d)), q[0], q[1] + 16, 46, '#27394b', 'barlow-condensed', 'center', 700); } }
  { const a = pt(30, R - 236), b = pt(-30, R - 236); tx('PORT', a[0], a[1], 34, A('#27394b', 0.75), 'barlow-condensed', 'center', 500, 5); tx('STBD', b[0], b[1], 34, A('#27394b', 0.75), 'barlow-condensed', 'center', 500, 5); }
  { const tp = pt(dn, R - 106), w = pt(dn, R - 290); shadowed(() => { limb(P[0], P[1], tp[0], tp[1], 9, 4, '#10161f'); ell(w[0], w[1], 34, 34, '#27394b'); }, 6, 10, 0.3); ell(w[0] - 9, w[1] - 10, 10, 10, A('#ffffff', 0.14));
    poly([pt(dn - 1.7, R - 110), pt(dn + 1.7, R - 110), pt(dn, R - 42)], C3.red); }
  ell(P[0], P[1], 40, 40, '#b08a50'); ell(P[0], P[1], 14, 14, '#3a2a14');
  clipIn(face, () => { poly([[700, 236], [800, 236], [640, 830], [560, 830]], A('#ffffff', 0.09)); poly([[840, 236], [870, 236], [720, 830], [690, 830]], A('#ffffff', 0.06)); if (al) glow(1460, 520, 420, C3.red, 0.5, 'multiply'); });
  g.beginPath(); face(); g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#b08a50'; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#e6c88a'; g.stroke();
  rr(P[0] - 180, 852, 360, 56, 8, '#b08a50'); tx('S.S. EL FARO', P[0] + 3, 893, 38, '#3a2a14', 'barlow-condensed', 'center', 700, 6);
  // the alarm lamp
  rr(1650, 372, 80, 26, 6, '#0d151e'); rr(1654, 276, 72, 100, [36, 36, 6, 6], al ? C3.red : '#5a1c16'); [304, 330, 356].forEach(y => rect(1650, y, 80, 4, '#0d151e')); rect(1688, 270, 4, 106, '#0d151e');
  if (al) { glow(1690, 320, 860, C3.red, 0.6); ell(1674, 300, 9, 15, A('#ffffff', 0.5)); g.save(); g.globalCompositeOperation = 'screen'; rect(-40, -40, W + 80, H + 80, A(C3.red, 0.07)); g.restore(); }
  // the mark
  const tip = pt(dn, R - 62), k = pop((t - 0.55) / 0.3), lp = tw(t, 0.42, 0.72, eout);
  if (lp > 0) { g.lineWidth = 4; g.strokeStyle = C3.amb; g.beginPath(); g.arc(tip[0], tip[1], 30, 0, TAU); g.stroke(); pline([[tip[0] - 30, tip[1]], [lerp(tip[0] - 30, 416, lp), tip[1]]], 4, C3.amb, 'butt'); }
  if (k > 0) { g.save(); g.translate(150, 768); g.scale(k, k); tx('15°', 0, 0, 200, C3.amb, 'barlow-condensed', 'left', 700, -2); g.restore(); tx(typed('LIST TO PORT', (t - 0.75) / 0.35), 156, 834, 50, C3.cream, 'barlow-condensed', 'left', 500, 6); }
}

// ---- 2 · exterior: a 790-foot ship, small. The title lands with the thunder.
function sh_ext(t) {
  const fl = flash3(t), slam = 1.95, k = t > slam && t < slam + 0.35 ? 1 - (t - slam) / 0.35 : 0;
  camSet(950 - 14 * (t - 1.5) + 12 * k * wig(t, 19), 566 + 9 * wig(t, 0.31) + 10 * k * wig(t, 23, 1), lerp(1.06, 1.15, prog(t, 1.5, 3.5)));
  ext3(t, { fl, list: -(15 + 2.4 * wig(t, 0.22)) * Math.PI / 180 });
  camOff(); rect(0, 740, W, 340, LG(0, 740, 0, 1080, [[0, A('#03070b', 0)], [1, A('#03070b', 0.72)]]));
  if (t >= slam - 0.05) { const p = prog(t, slam - 0.05, slam + 0.07), q = lerp(1.7, 1, p * p); g.save(); g.translate(96, 968); g.scale(q, q); g.globalAlpha = p;
    for (let i = 0; i < 14; i++) poly([[4 + i * 40, -168], [24 + i * 40, -168], [12 + i * 40, -154], [-8 + i * 40, -154]], i % 2 ? '#10161f' : C3.amb);
    tx('EL FARO', -4, 0, 170, C3.cream, 'barlow-condensed', 'left', 700, 5); g.restore();
    tx(typed('ATLANTIC · 01 OCT 2015 · HURRICANE JOAQUIN', (t - 2.15) / 0.8), 100, 1024, 32, C3.amb, 'b612-mono', 'left', 400, 1); }
}

// ---- 3 · the bridge, cut open. She lurches; three name tags land on the alarm beats.
function sh_bridge(t) {
  const bump = Math.sin(Math.PI * prog(t, 3.85, 4.8)), sh = shake3(t, 1 + 2 * bump);
  TH3 = -(15 + 1.2 * wig(t, 0.15) + 4.5 * bump) * Math.PI / 180;
  camSet(960 + sh[0], 568 + sh[1], lerp(1.1, 1.19, prog(t, 3.5, 5)));
  const top = bridge3(t, { fl: flash3(t), bump, mug: 0.25 * bump });
  [['cap', 'CAPTAIN', 3.72], ['mate', 'SECOND MATE', 4.07], ['helm', 'HELMSMAN', 4.42]].forEach(([id, s, t0]) => tag3(top[id][0], top[id][1] - 6, s, pop((t - t0) / 0.25)));
}

// ---- 4 · insert: the mug. Out of focus behind it, the bridge.
function mug3(o = {}) {                                                  // origin = centre of the base
  const w = 95, h = 210, sd = o.al ? mix('#cfc7b2', C3.red, 0.4) : '#cfc7b2';
  g.beginPath(); g.ellipse(w + 4, -h * 0.5, 46, 60, 0, -1.9, 1.9); g.lineWidth = 26; g.lineCap = 'round'; g.strokeStyle = sd; g.stroke();
  form(() => g.roundRect(-w, -h, 2 * w, h, [8, 8, 28, 28]), C3.cream, () => { rect(w * 0.3, -h - 10, w, h + 20, sd); rect(-w, -h * 0.5, 2 * w, 26, C3.amb); rect(-w, -h * 0.5 + 34, 2 * w, 7, '#27394b'); });
  ell(0, -h, w, 22, '#e9e2cf');
  clipIn(() => g.ellipse(0, -h, w - 10, 15, 0, 0, TAU), () => { g.save(); g.translate(0, -h); g.rotate(o.liq || 0); rect(-w * 2, -5, 4 * w, 80, '#4a2f1c'); g.restore(); });
}
function sh_mug(t) {
  const u = t - 5, al = alarm3(t), sh = shake3(t, 1.2), s1 = clamp((u - 0.14) / 0.5), fall = Math.max(0, u - 0.64), mx = 420 - 980 * s1 * s1, pan = 0.3 * (420 - mx);
  TH3 = -(16 + 1.2 * wig(t, 0.15)) * Math.PI / 180;
  camSet(1100 - pan * 0.1 + sh[0] * 0.4, 590 + sh[1] * 0.4, 2.7); bridge3(t, { mug: -1 }); blurBack(15, 0.45); camOff();
  g.save(); g.translate(sh[0] + pan, sh[1]); g.translate(900, 720); g.rotate(TH3); g.scale(1.3, 1.3);
  rect(-560, 0, 2600, 1100, LG(0, 0, 0, 700, [[0, '#1d2e40'], [1, '#0a121b']]));                         // the console: front, top, edge
  poly([[-560, 0], [-530, -46], [2040, -46], [2040, 0]], '#3a5269'); rect(-530, -46, 2570, 5, A('#ffffff', 0.08)); rect(-560, 0, 2600, 4, A(C3.amb, 0.45));
  for (let i = 0; i < 9; i++) { const c = ['#f2c078', '#5dff9a', '#ee4630'][(i * 2 + (i === 3 ? Math.floor(t * 4) : 0)) % 3]; rr(-470 + i * 96, 70, 44, 22, 5, c); glow(-448 + i * 96, 81, 46, c, 0.35); }
  rect(-520, 132, 2500, 4, '#0a121b'); ell(-200, 300, 60, 60, '#0a141d'); ell(-200, 300, 44, 44, '#31485e'); rect(-204, 262, 8, 30, C3.cream); rr(40, 250, 300, 90, 8, '#0a141d'); rr(50, 260, 280, 70, 5, '#16344a');
  if (al) glow(900, 160, 760, C3.red, 0.35);
  g.lineWidth = 7; g.strokeStyle = A('#4a2f1c', 0.6); g.beginPath(); g.ellipse(420, -22, 86, 13, 0, 0, TAU); g.stroke();                                         // the ring it left
  if (s1 > 0) poly([[420, -30], [420, -14], [Math.max(mx, -560) + 60, -18], [Math.max(mx, -560) + 60, -26]], A('#4a2f1c', 0.45));
  { const cx = 980 - 260 * eio(prog(u, 0.1, 0.9)); poly([[cx, -44], [cx + 300, -44], [cx + 350, -4], [cx + 50, -4]], C3.cream); [0, 1, 2].forEach(i => pline([[cx + 60 + i * 70, -36], [cx + 110 + i * 70, -12]], 3, A('#27394b', 0.35))); }
  { const q = clamp(u / 0.42), x = 130 - 760 * q * q; if (q < 1) at(x, -12, 1, () => { limb(-70, 0, 60, 0, 7, 7, C3.amb); poly([[60, -7], [84, 0], [60, 7]], '#e2c9a0'); ell(-70, 0, 7, 7, C3.red); }, 0.04); }   // a pencil goes first
  const px = fall > 0 ? -560 - 2500 * fall : mx + (u < 0.14 ? 3 * wig(t, 11) : 0), py = fall > 0 ? -22 + 2800 * fall * fall : -22;
  if (!fall) { ell(px + 16, -16, 104, 13, A('#05090d', 0.45)); if (s1 > 0.25) [0, 1, 2].forEach(i => pline([[px + 150 + i * 30, -70 - i * 52], [px + 150 + i * 30 + 150 * s1, -70 - i * 52]], 6, A('#f2ecdc', 0.4))); }
  at(px, py, 1, () => mug3({ liq: -TH3 - 0.5 * Math.sin(Math.PI * s1), al }), -6.5 * fall);
  if (s1 > 0.1 && !fall) for (let i = 0; i < 5; i++) { const ph = (u * 2.6 + i * 0.21) % 1; ell(px + 70 + 190 * ph, -236 - 70 * Math.sin(ph * Math.PI) + i * 6, 9 * (1 - ph) + 3, 9 * (1 - ph) + 3, A('#4a2f1c', 0.9 * (1 - ph))); }
  g.restore();
}

// ---- 5 · close: the captain. He stays upright; the room behind him does not.
function sh_cap(t) {
  const al = alarm3(t), fl = flash3(t), sh = shake3(t, 0.9), zi = prog(t, 6, 8), fli = 1 - tw(t, 6.0, 6.35, eout);
  TH3 = -(15 + 1.4 * wig(t, 0.15)) * Math.PI / 180;
  camSet(1080 + sh[0] * 0.5, 480 + sh[1] * 0.5, lerp(2.2, 2.32, zi)); bridge3(t, { fl, hide: { cap: 1 }, mug: -1 }); blurBack(11, 0.36); camOff();
  const z = lerp(1, 1.06, zi); g.save(); g.translate(700 + sh[0], 470 + sh[1]); g.scale(z, z); g.translate(-700, -470);
  const said = t > 6.5 && t < 7.8, talk = said && wig(t, 3.3) > -0.2 && wig(t, 0.95, 1) > -0.8, tilt = -0.03 + 0.02 * wig(t, 0.3) + 0.07 * fli;
  const rims = [[-12, 0, '#ffd9a0', 0.5], [14, 4, al ? C3.red : '#8fc0d8', al ? 0.7 : 0.45]]; if (fl > 0.1) rims.push([-20, -6, '#eaf3ff', 0.8 * fl], [20, -6, '#eaf3ff', 0.6 * fl]);
  lit(() => at(700, 1500 + 5 * wig(t, 0.45) + 16 * fli, 3, () => {
    const h = blk({ skin: '#e2a47e', coat: '#eef0ee', pants: '#1c2836', body: 1, fl: [-36, 0], fr: [38, 0], armF: [-82 + 1.5 * wig(t, 6), -352], bendF: 1, armN: [112, -118], bendN: 1, tilt,
      trim: d => { rect(-78, -308, 156, 14, '#1c2836'); [0, 1, 2].forEach(i => rect(-74, -304 + i * 4, 36, 2, C3.amb)); rect(28, -280, 30, 30, '#d6dbd8'); rect(32, -276, 22, 3, '#8a9aa6'); rect(32, -270, 14, 3, '#8a9aa6');
        rect(6, -294, 3, 190, '#cdd3d2'); [-240, -204, -168, -132].forEach(y => ell(17, y, 4.5, 4.5, '#c9a064')); },
      head: { skin: '#e2a47e', dir: 1, look: t < 6.3 ? [0.3, 0.9] : [0.9, 0.05 + 0.1 * wig(t, 0.4)], lid: Math.max(0.2 + 0.25 * fli, blink(t, 0.6, 2.3)), brow: '#cfd3d0', browTilt: 0.22, browUp: said ? 3 : 0,
        mouth: fli > 0.5 ? 'grit' : talk ? 'open' : 'frown', beard: '#d9dcd8',
        top: d => { rr(-68, -146, 136, 44, 14, '#f4f5f2'); rect(-66, -112, 132, 12, '#1c2836'); poly([[14, -106], [92, -100], [86, -88], [14, -94]], '#10161f'); ell(26, -126, 9, 9, C3.amb); [40, 54, 68].forEach(x => ell(x, -97, 5, 2.5, C3.amb, 0.1)); } } });
    const mx = h[0][2], my = h[0][3];
    g.save(); g.translate(mx + 12, my - 4); g.rotate(0.16); rr(-12, -46, 24, 92, 9, '#0c1116'); rr(-8, -40, 16, 12, 4, '#27394b'); rr(-8, 28, 16, 12, 4, '#27394b'); g.restore();
    [0, 1, 2].forEach(i => ell(mx + 21, my - 16 + i * 13, 8, 6, '#e2a47e'));
    stroke([[mx + 4, my + 40], [mx - 14, my + 66], [mx + 6, my + 92], [mx - 14, my + 118], [mx + 4, my + 144], [mx - 12, my + 170], [mx + 4, my + 196]], 4, '#0c1116', 0.6);
    g.save(); g.translate(0, -300); g.rotate(tilt); [[54, -58, 0], [47, -40, 0.5]].forEach(([x, y, o]) => { const ph = (t * 0.6 + o) % 1, yy = y + 24 * ph; blob([[x, yy - 9], [x + 5, yy + 2], [x, yy + 7], [x - 5, yy + 2]], A('#cfe9ff', 0.9 * (1 - ph)), 0.6); }); g.restore();
  }, 0.012 * wig(t, 0.4) - 0.03 * fli), rims);
  g.restore();
  cap3('07:06', '“I HAVE A MARINE EMERGENCY.”', (t - 6.5) / 1.0, tw(t, 6.25, 6.55, eout));
}

// ---- 6 · the cross-section at hold 3, drawn as he reports it. The water inside stays level; the ship does not.
function sh_cut(t) {
  const th = -(15 + 0.8 * wig(t, 0.16)) * Math.PI / 180, pb = eio(prog(t, 8.0, 9.3)), K = 0.82, C = [760, 540], cs = Math.cos(th), sn = Math.sin(th);
  const Wp = (x, y) => [C[0] + K * (x * cs - y * sn), C[1] + K * (x * sn + y * cs)];                 // a point of the hull, on the screen
  camSet(lerp(1020, 960, pb), lerp(420, 540, pb), lerp(1.22, 1.0, pb) + 0.035 * prog(t, 9.3, 11));
  rect(-40, -40, W + 80, H + 80, '#0b1620');
  g.beginPath(); for (let x = 0; x <= W; x += 60) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = 0; y <= H; y += 60) { g.moveTo(0, y); g.lineTo(W, y); } g.lineWidth = 1; g.strokeStyle = A('#8fc0d8', 0.07); g.stroke();
  const WL = 508; g.beginPath(); g.moveTo(-40, H + 40); for (let x = -40; x <= W + 40; x += 30) g.lineTo(x, WL + 7 * wig(t, 0.25, x * 0.011) + 4 * wig(t, 0.41, x * 0.023)); g.lineTo(W + 40, H + 40); g.closePath();
  g.fillStyle = LG(0, WL, 0, H, [[0, A('#1c4250', 0.85)], [1, A('#0c1f29', 0.95)]]); g.fill(); g.lineWidth = 3; g.strokeStyle = A('#d9ecea', 0.5); g.stroke();
  g.setLineDash([12, 10]); pline([[C[0], C[1]], [C[0], 44]], 3, A(C3.cream, 0.7)); pline([[C[0], C[1]], Wp(0, -590)], 3, A(C3.amb, 0.8)); g.setLineDash([]);
  g.beginPath(); g.arc(C[0], C[1], 462, -Math.PI / 2 + th, -Math.PI / 2); g.lineWidth = 5; g.strokeStyle = C3.amb; g.stroke(); tx('15°', C[0] + 16, 74, 50, C3.amb, 'barlow-condensed', 'left', 700);
  // ---- the hull, rolled
  g.save(); g.translate(C[0], C[1]); g.rotate(th); g.scale(K, K);
  for (let c = 0; c < 9; c++) for (let r = 0; r < 2; r++) { g.save(); g.translate(-504 + c * 112.5, -300 - (r + 1) * 76); g.scale(2.3, 2.6); box3(BOXC[(c + r * 2) % 6]); g.restore(); }
  const shell = () => g.roundRect(-520, -300, 1040, 600, [0, 0, 110, 110]), inner = () => g.roundRect(-494, -278, 988, 552, [0, 0, 88, 88]);
  g.beginPath(); inner(); g.fillStyle = '#132131'; g.fill(); glow(0, -200, 520, '#f2c078', 0.1);
  [-456, -272, -88, 96].forEach((x, i) => { rr(x, -240, 172, 104, 6, ['#59687a', '#7f858c', '#3f6e5a', '#8a3b32'][i]); for (let j = 0; j < 6; j++) rect(x + 14 + j * 26, -234, 3, 92, A('#000000', 0.2));
    rect(x + 6, -136, 160, 8, '#0c141d'); ell(x + 120, -122, 11, 11, '#0c141d'); ell(x + 146, -122, 11, 11, '#0c141d'); rect(x + 30, -128, 5, 18, '#0c141d'); });
  const lvl = lerp(250, 64, prog(t, 8, 11)) + 4 * wig(t, 0.5), CC = ['#c94a3a', '#d9d4c4', '#3d6f96', '#d0a23a', '#7f858c', '#c94a3a', '#d9d4c4', '#3d6f96'];
  const car = c => { rr(-50, -40, 100, 28, 9, c); rr(-30, -62, 58, 28, 10, c); rr(-22, -56, 20, 16, 4, '#bfe3ff'); rr(4, -56, 18, 16, 4, '#bfe3ff'); ell(-28, -10, 11, 11, '#0c141d'); ell(28, -10, 11, 11, '#0c141d'); };
  clipIn(() => g.roundRect(-494, -94, 988, 368, [0, 0, 88, 88]), () => {
    const afloat = [];
    [-400, -280, -160, -40, 80, 200, 320, 420].forEach((x, i) => { const wx = x * cs - 274 * sn, wy = x * sn + 274 * cs, sub = wy - 26 - lvl;
      if (sub <= 0) { g.save(); g.translate(x, 274); car(CC[i]); g.restore(); pline([[x - 48, 272], [x - 70, 250]], 2, A(C3.amb, 0.5)); pline([[x + 48, 272], [x + 70, 250]], 2, A(C3.amb, 0.5)); } else afloat.push([Math.max(-405, wx - sub * 0.35), sub, i]); });
    g.save(); g.rotate(-th);
    afloat.forEach(([x, sub, i]) => { g.save(); g.translate(x, lvl + 26 + 4 * wig(t, 0.6, i)); g.rotate(th * clamp(1 - sub / 50) + 0.09 * wig(t, 0.45, i * 2)); car(CC[i]); g.restore(); });
    rect(-900, lvl, 1800, 900, A('#2f8794', 0.62));
    g.beginPath(); for (let x = -700; x <= 700; x += 20) g.lineTo(x, lvl + 3 * wig(t, 0.8, x * 0.02)); g.lineWidth = 4; g.strokeStyle = A('#d9ecea', 0.8); g.stroke();
    g.restore();
  });
  { const a = tw(t, 8.45, 8.9); if (a > 0) { g.save(); g.globalAlpha = a; g.setLineDash([16, 12]); g.lineDashOffset = -t * 70; pline([[332, -150], [332, 236], [-20, 236]], 5, C3.amb, 'butt'); g.setLineDash([]); poly([[-20, 222], [-50, 236], [-20, 250]], C3.amb); g.restore(); } }
  const cut = pathFn => { g.save(); g.beginPath(); pathFn(); g.clip('evenodd'); rect(-560, -330, 1120, 660, C3.slab); hatch(-560, -330, 1120, 660, 18, A(C3.amb, 0.6), 3); g.restore(); };
  cut(() => { shell(); inner(); }); cut(() => { g.rect(-494, -110, 794, 16); g.rect(364, -110, 130, 16); });
  g.lineWidth = 3; g.strokeStyle = A(C3.amb, 0.9); g.beginPath(); shell(); g.stroke(); g.beginPath(); inner(); g.stroke(); g.strokeRect(-494, -110, 794, 16); g.strokeRect(364, -110, 130, 16);
  g.save(); g.translate(364, -110); g.rotate(1.15); rect(-64, -5, 64, 10, C3.slab); g.strokeRect(-64, -5, 64, 10); g.restore();          // the scuttle, open
  g.restore();
  // ---- the three marks, in his words
  const k1 = pop((t - 8.35) / 0.3), k2 = pop((t - 9.2) / 0.3), k3 = pop((t - 10.05) / 0.3), pu = t0 => ((t - t0) % 1.5) / 1.5;
  const lead = (pts, t0) => { const p = tw(t, t0 + 0.1, t0 + 0.4, eout) * (pts.length - 1), n = Math.floor(p); if (p <= 0) return; const q = pts.slice(0, n + 1); if (n < pts.length - 1) q.push(L2(pts[n], pts[n + 1], p - n)); pline(q, 3.5, C3.amb, 'butt'); };
  const s1 = Wp(332, -110), d1 = [s1[0] - 2, s1[1] - 62];
  lead([[d1[0] + 34, d1[1]], [1296, d1[1]]], 8.35); dot3(d1[0], d1[1], '1', k1, pu(8.35));
  tx(typed('“A SCUTTLE BLEW OPEN.”', (t - 8.55) / 0.55), 1312, d1[1] + 18, 52, C3.cream, 'barlow-condensed', 'left', 700, 2);
  const ys = C[1] + K * lvl, d2 = [476, ys - 58];
  lead([[d2[0] - 34, d2[1]], [250, d2[1]], [250, 944]], 9.2); dot3(d2[0], d2[1], '2', k2, pu(9.2));
  tx(typed('“WATER DOWN IN THREE HOLD.”', (t - 9.4) / 0.6), 96, 1006, 52, C3.cream, 'barlow-condensed', 'left', 700, 2);
  if (k3 > 0) { const a = clamp(k3);
    g.save(); g.globalAlpha = a; rr(1350, 410, 480, 290, 10, '#0f1c29'); g.lineWidth = 2.5; g.strokeStyle = A(C3.amb, 0.9); g.beginPath(); g.roundRect(1350, 410, 480, 290, 10); g.stroke();
    tx('MAIN ENGINE · LUBE OIL', 1400, 452, 24, A(C3.amb, 0.9), 'b612-mono', 'left', 400, 1);
    g.save(); g.translate(1590, 552); g.rotate(th); const sump = () => g.roundRect(-170, -50, 340, 100, 12);
    g.beginPath(); sump(); g.fillStyle = '#0a141d'; g.fill();
    clipIn(sump, () => { g.save(); g.rotate(-th); rect(-300, 40 + 2 * wig(t, 0.7), 600, 200, '#b9772a'); g.restore(); });
    rect(72, -96, 16, 128, '#5d7b96'); poly([[66, 30], [94, 30], [104, 44], [56, 44]], '#5d7b96');
    g.lineWidth = 3; g.strokeStyle = A(C3.amb, 0.9); g.beginPath(); sump(); g.stroke();
    if (t % 0.5 < 0.3) { pline([[58, 4], [102, 26]], 6, C3.red); pline([[102, 4], [58, 26]], 6, C3.red); }
    g.restore();
    tx('NO OIL PRESSURE', 1400, 678, 26, t % 0.5 < 0.3 ? C3.red : A(C3.red, 0.4), 'b612-mono', 'left', 700, 1); g.restore();
    dot3(1350, 410, '3', k3, pu(10.05));
    tx(typed('“WE’VE LOST THE MAIN', (t - 10.2) / 0.3), 1350, 764, 52, C3.cream, 'barlow-condensed', 'left', 700, 2); tx(typed('PROPULSION UNIT.”', (t - 10.5) / 0.25), 1350, 822, 52, C3.cream, 'barlow-condensed', 'left', 700, 2); }
}

// ---- 7 · exterior: the list keeps growing, the deck cargo goes, the lights go. The clock runs out.
const LOST3 = [[0, 2, 11.15], [1, 2, 11.35], [0, 1, 11.55], [2, 2, 11.72], [1, 1, 11.9], [0, 0, 12.05], [3, 2, 12.18], [2, 1, 12.3]];
function sh_sink(t) {
  const p = prog(t, 11, 12.6), sh = shake3(t, 1 + 2 * p);
  camSet(850 + sh[0], 610 + sh[1], lerp(1.45, 1.62, p));
  ext3(t, { fl: flash3(t), list: -(17 + 22 * p * p + 1.5 * wig(t, 0.3)) * Math.PI / 180, sink: 74 * p * p, dark: t > 12.28 || (t > 12.0 && t * 16 % 2 < 1),
    gone: (c, r) => LOST3.some(([a, b, t0]) => a === c && b === r && t >= t0),
    after: (P, rot, S, f3) => LOST3.forEach(([c, r, t0], i) => { const u = t - t0; if (u < 0) return;
      const [bx, by] = BOX3(c, r), lx = (bx + 23) * S, ly = (by + 14) * S, cs = Math.cos(rot), sn = Math.sin(rot), x0 = P[0] + lx * cs - ly * sn, y0 = P[1] + lx * sn + ly * cs;
      const x = x0 - 240 * u - 80 * u * u, y = y0 + 1500 * u * u, xs = x0 - 110, ysf = f3(xs), uc = Math.sqrt(Math.max(0.02, (ysf - y0) / 1500));
      if (u < uc + 0.05) { g.save(); g.translate(x, y); g.rotate(rot - 3.2 * u); g.scale(S, S); g.translate(-23, -14); box3(BOXC[(c * 2 + r * 3) % 6]); g.restore(); }
      const v = (u - uc) / 0.55; if (v > 0 && v < 1) { ell(xs, ysf, 30 + 70 * v, 9 + 5 * v, A('#e6f3f1', 0.7 * (1 - v)));
        for (let j = 0; j < 9; j++) { const q = (j - 4) / 4; ell(xs + q * (20 + 70 * v), ysf - (60 + 50 * Math.abs(Math.sin(j * 2.1 + i))) * Math.sin(Math.PI * Math.min(1, v * 1.15)) * (1 - 0.5 * q * q), 9 * (1 - v) + 3, 9 * (1 - v) + 3, A('#e6f3f1', 0.9 * (1 - v))); } } }) });
}

// ---- 8 · the last card. The meter is flat.
function sh_end(t) {
  const u = t - 12.6; rect(0, 0, W, H, '#04070a');
  g.beginPath(); for (let x = 150; x <= 1770; x += 6) g.lineTo(x, 330 + 70 * Math.exp(-u * 6) * Math.sin(x * 0.09 + t * 50) * Math.exp(-Math.pow((x - 300 - u * 2600) / 240, 2))); g.lineWidth = 3; g.strokeStyle = A(C3.amb, 0.7); g.stroke();
  g.globalAlpha = tw(t, 12.75, 13.0, eout); tx('07:39', 144, 590, 190, C3.amb, 'b612-mono', 'left', 700, -6); g.globalAlpha = 1;
  tx(typed('THE BRIDGE RECORDING ENDS.', (t - 13.0) / 0.7), 156, 704, 92, C3.cream, 'barlow-condensed', 'left', 700, 4);
  const a = tw(t, 13.8, 14.2, eout); g.globalAlpha = a; tx('ALL 33 CREW WERE LOST.', 158, 800 + 16 * (1 - a), 60, C3.cream, 'barlow-condensed', 'left', 500, 6); g.globalAlpha = 1;
  tx('SS EL FARO · 01 OCT 2015', 158, 1000, 28, A(C3.amb, 0.8), 'b612-mono', 'left', 400, 1);
}

// ---- the cut. The read-out runs on every shot: 33 minutes of recording are left when he makes the call; the clock runs out in shot 7.
film([0, 1.5, 3.5, 5.0, 6.0, 8.0, 11.0, 12.6], [sh_clino, sh_ext, sh_bridge, sh_mug, sh_cap, sh_cut, sh_sink, sh_end], (t, i) => {
  const end = i === 7, p = prog(t, 11, 12.6);
  if (!end) vignette(0.42, '#03070b', 0.56);
  hud3(t, { end, src: 'BRIDGE AUDIO · ' + (end ? '07:39' : '07:06'), label: 'TIME LEFT', left: Math.max(0, t < 11 ? 1980 - t : 1969 * (1 - p * p)) });
  grain(0.06, 'overlay');
});
