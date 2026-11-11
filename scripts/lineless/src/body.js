// body.js — Upgraded Lineless Body & Props Engine:
//   - HEAD & EYES: Preserves the user's preferred classic rounded capsule head + soft warm-cream eye with dark pupil
//     (zero harsh eyelash lines, zero overly bright neon irises!) + clean pearlescent water droplets.
//   - BODY & HANDS: Upgraded tailored silhouettes (lapels, shirts, split coat-tails, vests, fringes),
//     sleeve contact-occlusion shadows, sculpted cuff+thumb hands ('open'|'point'|'fist'|'beckon'),
//     3 views ('side' 3/4, 'front' symmetric, 'back' true rear OTS), and 24 detailed historical props.

const SKINS = [['#f0b98f', '#d4946c'], ['#e6a982', '#c58762'], ['#cf9670', '#ab7450'], ['#f3c6a2', '#d9a17c']];
const HAIRS = ['#4a3324', '#2a2024', '#8a5a2e', '#a9a29a'];
const GOLD = '#c9a23f';
const GOLD_SH = '#a38024';

// ---- Classic Soft Eye (warm #fffaf0 oval + dark INK pupil + skin eyelid, never overly bright!)
function eye(x, y, rx, ry, lk, lid, skin, mode = 'open', isFar = false, lkY = 0) {
  if (mode === 'laugh' || mode === 'happy') {
    g.beginPath(); g.moveTo(x - rx, y + 3); g.quadraticCurveTo(x, y - ry * 1.05, x + rx, y + 3);
    g.strokeStyle = C(INK); g.lineWidth = 4.0; g.lineCap = 'round'; g.stroke();
    return;
  }
  if (mode === 'bags') {
    ell(x, y + ry * 0.58, rx * 1.16, ry * 0.62, C('#7d5e58'));
  }
  const skep = mode === 'skeptical';
  const sc = mode === 'pin' ? 1.32 : (mode === 'wide' || mode === 'teary') ? 1.22 :
             skep ? (isFar ? 1.24 : 0.88) : mode === 'squint' ? 0.92 : 1;
  const ry2 = ry * (mode === 'squint' ? 0.62 : skep && !isFar ? 0.68 : sc), rx2 = rx * sc;

  form(() => g.ellipse(x, y, rx2, ry2, 0, 0, Math.PI * 2), C('#fffaf0'), () => {
    const px = x + (isFar ? 2 : 2) + lk * 4.2;
    const py = mode === 'roll' ? y - ry2 * 0.45 : y + 1 + lkY * 3.5;
    const pr = mode === 'pin' ? 0.28 : 0.52;
    ell(px, py, rx * pr, ry * pr, C(INK));
    // Tiny understated soft cream reflection (never flashy!)
    if (mode !== 'pin') ell(px - rx * 0.14, py - ry * 0.16, rx * 0.13, ry * 0.13, C('#fffaf0'));

    const effLid = mode === 'squint' ? Math.max(lid, 0.42) : skep && !isFar ? 0.45 : mode === 'bags' ? Math.max(lid, 0.46) : lid;
    if (effLid) { g.fillStyle = skin; g.fillRect(x - rx2 - 2, y - ry2 - 2, rx2 * 2 + 4, (ry2 * 2 + 2) * effLid); }
    if (mode === 'squint') { g.fillStyle = skin; g.fillRect(x - rx2 - 2, y + ry2 * 0.45, rx2 * 2 + 4, ry2); }
  });
}

// Clean pearlescent water droplet for tears / sweat (replaces old rectangular blue bars)
function droplet(x, y, s = 1, rot = 0) {
  at(x, y, s, () => {
    form(() => {
      g.moveTo(0, -13);
      g.bezierCurveTo(8, -2, 9, 8, 0, 11);
      g.bezierCurveTo(-9, 8, -8, -2, 0, -13);
      g.closePath();
    }, C('#8ad4f5'), () => { ell(3, 3, 6.5, 8, C('#5eb2db')); });
  }, rot);
}

// Buckskin fringe along a segment
function fringe(x1, y1, x2, y2, n, len, col) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, px = lerp(x1, x2, f), py = lerp(y1, y2, f);
    poly([[px - ux * 5, py - uy * 5], [px + ux * 5, py + uy * 5], [px + nx * len, py + ny * len]], col);
  }
}

function kitOf(o) {
  const k = { ...(KIT[o.kit || 'trooper'] || KIT.trooper) };
  if (o.skin != null && typeof o.skin === 'number') [k.skin, k.skinSh] = SKINS[o.skin % 4];
  if (o.hair != null && typeof o.hair === 'number') {
    k.hair = HAIRS[o.hair % 4];
    k.hairSh = mix(k.hair, '#141016', 0.28);
  }
  k.hairSh = k.hairSh || mix(k.hair || '#4a3324', '#141016', 0.28);
  k.pantsSh = k.pantsSh || mix(k.pants || '#4a4652', '#141016', 0.24);
  k.bootSh = k.bootSh || mix(k.boot || '#261e22', '#100c12', 0.28);
  return k;
}

// ---- Sculpted Lineless Hands (with cuff & thumb plane, zero round stumps!) --
function drawHandShape(kind = 'open', skin, skinSh, ang = 0) {
  g.save();
  g.rotate(ang);
  if (kind === 'point') {
    rr(-6, -6, 19, 17, 6, skinSh);
    limb(-3, -7, 32, -7, 6.0, 4.6, skin);
    limb(-5, -2, 10, -15, 5.0, 4.0, skin);
    ell(0, 2, 11.5, 10.5, skin);
  } else if (kind === 'beckon') {
    form(() => {
      g.moveTo(-13, 4); g.quadraticCurveTo(-2, 15, 21, 9);
      g.quadraticCurveTo(36, 3, 34, -6); g.quadraticCurveTo(16, -8, -8, -8); g.closePath();
    }, skin, () => { g.fillStyle = skinSh; g.fillRect(-13, 4, 48, 11); });
    limb(-5, -6, 9, -19, 5.0, 4.0, skin);
  } else if (kind === 'open') {
    form(() => {
      g.moveTo(-11, -8); g.lineTo(17, -11);
      g.quadraticCurveTo(28, -9, 26, 2); g.quadraticCurveTo(24, 12, 7, 12);
      g.lineTo(-11, 8); g.closePath();
    }, skin, () => { g.fillStyle = skinSh; g.fillRect(-11, 3, 39, 10); });
    limb(-4, -7, 9, -19, 4.8, 3.8, skin);
  } else {
    // Default sculpted grip / fist with thumb
    form(() => g.roundRect(-11, -12, 24, 23, 8), skin, () => {
      g.fillStyle = skinSh; g.fillRect(-11, 2, 24, 11);
    });
    limb(-4, -8, 9, -4, 4.8, 4.2, skin);
  }
  g.restore();
}

// ---- Rich Historical Props Library (24 props, pure two-tone lineless) -------
function drawProp(kind, ph = 0) {
  if (!kind) return;
  g.save();
  if (kind === 'sabre') {
    g.rotate(-0.55 + Math.sin(ph * 2) * 0.05);
    form(() => { g.moveTo(0, -10); g.quadraticCurveTo(85, -32, 165, -18); g.quadraticCurveTo(85, -12, 0, 4); g.closePath(); },
      C('#eef3f7'), () => { g.fillStyle = C('#b8c7d4'); g.fillRect(0, -8, 170, 12); });
    rr(-18, -8, 22, 12, 3, C('#4a3324')); rr(-4, -18, 9, 32, 4, C(GOLD));
    ell(-2, 4, 14, 10, C(GOLD));
  } else if (kind === 'spyglass') {
    rr(-10, -14, 52, 22, 5, C('#38322e')); rr(30, -17, 28, 28, 5, C(GOLD));
    ell(58, -3, 6, 12, C('#9ad4ea'));
  } else if (kind === 'detector') {
    // 1984 Battlefield Metal Detector: angled aluminum shaft + control box + sweep coil hovering over ground!
    const sw = Math.sin(ph * 1.4) * 0.14;
    g.rotate(sw);
    rr(-12, -26, 32, 22, 5, C('#3d424a'));
    rr(-6, -22, 20, 9, 2, C('#9ec4b8'));
    limb(-4, -4, 96, 138, 5.5, 4.5, C('#b8c0c8'));
    ell(104, 144, 38, 12, C('#2f3238'));
    ell(104, 144, 22, 7, C('#525863'));
  } else if (kind === 'mug') {
    rr(14, -22, 20, 32, 6, C('#d9ccb4')); rr(18, -16, 12, 20, 4, C('#593d29'));
    form(() => g.roundRect(-22, -30, 42, 50, 6), C('#e09f2d'), () => { g.fillStyle = C('#bd7f18'); g.fillRect(-22, -30, 16, 50); });
    ell(-1, -32, 24, 11, C('#fffaf0')); ell(-12, -35, 12, 9, C('#fffaf0')); ell(10, -34, 11, 8, C('#fffaf0'));
  } else if (kind === 'rag') {
    poly([[-18, -6], [22, -12], [32, 24], [-8, 30]], C('#f5efe2'));
    poly([[0, -8], [26, -10], [28, 22], [6, 24]], C('#ded4c1'));
  } else if (kind === 'cartridge') {
    // Gleaming .45-70 brass cartridge case
    form(() => g.roundRect(-10, -38, 20, 42, 4), C('#e8be4a'), () => {
      g.fillStyle = C('#fff3b8'); g.fillRect(-6, -38, 6, 42);
    });
    rr(-13, 0, 26, 7, 2, C('#b58b24'));
  } else if (kind === 'note') {
    g.rotate(-0.14 + Math.sin(ph * 3) * 0.04);
    form(() => g.roundRect(-44, -34, 96, 68, 5), C('#fbf6ea'), () => {
      g.fillStyle = C('#e0d7c3'); g.fillRect(-44, 14, 96, 22);
    });
    for (let i = 0; i < 3; i++) rr(-32, -18 + i * 15, 68 - (i % 2) * 14, 5, 2, C('#5e554d'));
  } else if (kind === 'sealed_order') {
    g.rotate(-0.12);
    form(() => g.roundRect(-36, -46, 72, 86, 4), C('#fcf7eb'), () => {
      g.fillStyle = C('#e3dac6'); g.fillRect(-36, 18, 72, 22);
    });
    rr(-24, -32, 48, 7, 2, C('#2b4066'));
    rr(-24, -18, 42, 4, 2, C('#8c8275'));
    rr(-24, -8, 34, 4, 2, C('#8c8275'));
    ell(14, 12, 11, 11, C('#d8352a'));
  } else if (kind === 'bugle') {
    limb(-16, 0, 38, -16, 7, 12, C(GOLD));
    poly([[32, -14], [68, -38], [68, 8]], C('#e6be4c'));
    ell(68, -15, 7, 22, C('#9e761e'));
    rr(-6, 2, 28, 11, 5, C('#c99e38'));
  } else if (kind === 'ledger' || kind === 'playbook') {
    const col = kind === 'playbook' ? '#8c352b' : '#6e4832';
    const colSh = kind === 'playbook' ? '#6b241c' : '#4f3220';
    g.rotate(-0.10);
    form(() => g.roundRect(-36, -42, 72, 82, 6), C(col), () => { g.fillStyle = C(colSh); g.fillRect(-36, -42, 22, 82); });
    rr(-24, -26, 48, 22, 3, C(CREAM)); rr(-18, -18, 36, 5, 2, C(INK));
    rr(-20, 10, 40, 5, 2, C(GOLD));
  } else if (kind === 'dossier') {
    g.rotate(-0.20);
    form(() => g.roundRect(-20, -42, 58, 74, 4), C('#fbf6ea'), () => {
      g.fillStyle = C('#dfd5c0'); g.fillRect(-20, 14, 58, 20);
    });
    rr(-10, -28, 38, 6, 2, C('#3a4c6b'));
    for (let i = 0; i < 3; i++) rr(-10, -14 + i * 11, 34 - (i % 2) * 8, 4, 2, C('#8c8275'));
  } else if (kind === 'scroll_long') {
    // West Point 726-demerits long unrolled scroll!
    rr(-28, -14, 56, 16, 6, C('#dfd5c0'));
    form(() => g.roundRect(-24, 0, 48, 175, 4), C('#fbf6ea'), () => {
      g.fillStyle = C('#e3dac6'); g.fillRect(-24, 0, 14, 175);
    });
    for (let y = 16; y < 162; y += 15) rr(-14, y, 30, 4, 1, C('#7a7066'));
    ell(0, 175, 26, 9, C('#dfd5c0'));
  } else if (kind === 'feather_staff') {
    limb(-6, 65, 8, -155, 5.5, 4, C('#6b482e'));
    for (let i = 0; i < 4; i++) {
      const y = -140 + i * 28;
      limb(6, y, 36, y + 10, 6, 2, C('#f4efe4')); limb(25, y + 6, 36, y + 10, 5, 2, C(INK));
    }
  } else if (kind === 'carbine' || kind === 'winchester') {
    const isWin = kind === 'winchester';
    limb(-12, 82, 4, -145, 7, 5, C('#694328'));
    limb(0, -65, 8, -205, 4.5, 4, C('#505866'));
    rr(-4, -68, 12, 26, 2, C(isWin ? GOLD : '#7d8594'));
  } else if (kind === 'star_badge') {
    rr(-24, -18, 48, 28, 6, C('#34507e')); rr(-24, -18, 48, 6, 2, C(GOLD));
    poly([[0, -16], [5, -6], [16, -4], [7, 2], [10, 12], [0, 6], [-10, 12], [-7, 2], [-16, -4], [-5, -6]], C('#fff2b2'));
  } else if (kind === 'gold_nugget') {
    blob([[-28, -10], [-14, -34], [18, -30], [34, -6], [20, 22], [-18, 18]], C('#f5c24c'));
    blob([[-8, -24], [16, -22], [24, -2], [8, 12]], C('#ffe885'));
  } else if (kind === 'pickaxe') {
    limb(-8, 42, 16, -68, 5, 4, C('#7a5536'));
    form(() => { g.moveTo(-26, -56); g.quadraticCurveTo(16, -82, 56, -48); g.quadraticCurveTo(16, -62, -26, -56); }, C('#6d757d'), null);
  } else if (kind === 'gavel') {
    limb(-14, 10, 52, -24, 6.5, 5.5, C('#694127'));
    g.save(); g.translate(50, -24); g.rotate(-0.45);
    form(() => g.roundRect(-20, -32, 40, 64, 6), C('#4d2d18'), () => { g.fillStyle = C('#331c0e'); g.fillRect(-20, 4, 40, 30); });
    rr(-21, -7, 42, 14, 2, C(GOLD));
    g.restore();
  } else if (kind === 'hanky') {
    poly([[-10, -4], [22, 8], [8, 50], [-20, 36]], C('#faf7f0'));
    poly([[2, 4], [22, 8], [8, 50], [-4, 42]], C('#dfd8ca'));
  } else if (kind === 'probation') {
    g.rotate(-0.08);
    rr(-42, -32, 88, 64, 4, C('#fbf6ea'));
    rr(-30, -18, 64, 14, 2, C('#d8352a'));
    rr(-30, 4, 52, 5, 2, C('#6e655c')); rr(-30, 14, 40, 5, 2, C('#6e655c'));
  } else if (kind === 'pointer') {
    limb(-6, 8, 115, 78, 5, 2, C('#5c3d24'));
  } else if (kind === 'trophy') {
    rr(-22, 22, 44, 14, 3, C('#4a3324')); rr(-10, 6, 20, 18, 3, C('#c99322'));
    ell(-26, -16, 12, 18, C('#c99322')); ell(26, -16, 12, 18, C('#c99322'));
    form(() => g.roundRect(-26, -42, 52, 50, [6, 6, 24, 24]), C('#f5c24c'), () => { g.fillStyle = C('#ffe680'); g.fillRect(-16, -40, 14, 44); });
  } else if (kind === 'scissors') {
    limb(-10, 6, 38, -18, 4, 2, C('#8d969e')); limb(-10, -8, 38, 14, 4, 2, C('#6c757d'));
    ell(-14, 8, 8, 8, C(GOLD)); ell(-14, -10, 8, 8, C(GOLD));
  }
  g.restore();
}

// ---- Upper Body: Tailored Coat + Sleeve Contact Shadow + Classic Rounded Head!
function upper(o, k, ph, hx, hy) {
  const c = n => C(k[n]), cus = k.trim === 'fringe', btn = k.trim === 'buttons', isFront = o.view === 'front';
  const sq = o.squash || 0, shv = o.shiver ? Math.sin(ph * 14) * 2.5 * o.shiver : 0;
  g.save();
  g.translate(shv, 0);
  if (sq) g.scale(1 - sq * 0.35, 1 + sq * 0.45);

  const cuffCol = k.trim === 'suit' || k.trim === 'apron' ? '#f5efe4' : cus ? '#ead9b0' : GOLD;

  const drawArm = (sx, sy, tx, ty, sleeveC, handKind, propKind, bendDir, castShadow) => {
    const [ex, ey, fx, fy] = ik(sx, sy, tx, ty, 66, 64, bendDir);
    if (castShadow) {
      g.save(); g.globalAlpha = 0.17;
      limb(sx + 5, sy + 8, ex + 5, ey + 8, 22, 17, '#16101e');
      limb(ex + 5, ey + 8, fx + 5, fy + 8, 17, 14, '#16101e');
      g.restore();
    }
    limb(sx, sy, ex, ey, 21, 16.5, C(sleeveC));
    if (cus) fringe(ex, ey, fx, fy, 5, 13, c('coatSh'));
    limb(ex, ey, fx, fy, 16.5, 13.5, C(sleeveC));
    const ang = Math.atan2(fy - ey, fx - ex);
    limb(fx - Math.cos(ang) * 7, fy - Math.sin(ang) * 7, fx, fy, 15, 14.5, C(cuffCol));
    if (propKind) at(fx, fy, 1, () => drawProp(propKind, ph));
    at(fx, fy, 1, () => drawHandShape(handKind || (propKind ? 'fist' : 'open'), c('skin'), c('skinSh'), ang));
    return [fx, fy];
  };

  // 1. Far arm (behind torso in 3/4 side view)
  if (!isFront && o.hand2) {
    drawArm(-12, -120, o.hand2[0], o.hand2[1], k.coatSh, o.hand2Kind, o.prop2, 1, false);
  }

  // 2. Tailored Torso + Flared Coat-Tails / Skirt + Collar / Lapels / Vest
  form(() => {
    curve([[-50, -16], [52, -16], [62, 28], [14, 30], [4, 8], [-6, 30], [-58, 28]], true);
  }, c('coat'), () => { g.fillStyle = c('coatSh'); g.fillRect(-64, -18, 50, 52); });
  if (cus) fringe(-50, 24, 54, 24, 9, 14, c('coatSh'));

  form(() => {
    curve([[-56, -138], [0, -152], [58, -138], [48, -12], [-46, -12]], true);
  }, c('coat'), () => { poly([[-62, -156], [-10, -156], [-16, -8], [-62, -8]], c('coatSh')); });

  const cx = isFront ? 0 : 14;
  if (cus) {
    if (k.shirt) poly([[cx - 22, -146], [cx + 24, -146], [cx + 18, -22], [cx - 16, -22]], C(k.shirt));
    for (let i = 0; i < 3; i++) { ell(cx - 9, -106 + i * 26, 3, 3, C('#dce2ec')); ell(cx + 11, -106 + i * 26, 3, 3, C('#dce2ec')); }
  } else if (btn) {
    rr(cx - 18, -150, 38, 11, 4, c('coatSh'));
    for (let i = 0; i < 4; i++) { ell(cx - 11, -122 + i * 26, 4.2, 4.2, C(GOLD)); ell(cx + 15, -122 + i * 26, 4.2, 4.2, C(GOLD)); }
    rr(-54, -145, 28, 9, 4, C(GOLD_SH)); rr(26, -145, 28, 9, 4, C(GOLD));
  } else if (k.trim === 'suit') {
    poly([[cx - 17, -146], [cx + 17, -146], [cx + 2, -74]], C(k.shirt || '#f5efe4'));
    poly([[cx - 6, -138], [cx + 6, -138], [cx + 8, -84], [cx, -74], [cx - 8, -84]], C(k.tie || '#28242e'));
    poly([[cx - 17, -146], [cx - 32, -122], [cx - 22, -98], [cx - 2, -74]], c('coatSh'));
    poly([[cx + 17, -146], [cx + 32, -122], [cx + 22, -98], [cx + 2, -74]], C(mix(k.coat, '#141018', 0.2)));
  } else if (k.trim === 'apron') {
    rr(-44, -146, 88, 66, 8, C('#523f32'));
    form(() => g.roundRect(-50, -82, 102, 104, 6), C('#f7f2e6'), () => { g.fillStyle = C('#ded4c1'); g.fillRect(-50, -82, 34, 104); });
  } else if (k.trim === 'vest') {
    const vc = k.vestCol || '#c4b084', vs = k.vestSh || '#a38f65';
    form(() => g.roundRect(-48, -142, 98, 126, 10), C(vc), () => { g.fillStyle = C(vs); g.fillRect(-48, -142, 34, 126); });
    rr(8, -82, 28, 26, 4, C(vs)); rr(-32, -82, 24, 26, 4, C(vs));
  } else if (k.trim === 'native') {
    // Trade-cloth shirt + woven blanket waist band + hair-pipe choker
    rr(-52, -26, 106, 38, 6, C(k.blanket || '#8c5332'));
    rr(-52, -10, 106, 7, 0, C('#f0ebe0'));
    rr(cx - 20, -146, 40, 12, 4, C('#f0ebe0'));
  } else if (k.trim === 'cadet') {
    limb(-38, -144, 38, -16, 7, 7, C('#f2ece0')); limb(38, -144, -34, -16, 7, 7, C('#f2ece0'));
    for (let i = 0; i < 4; i++) { ell(34, -124 + i * 28, 4, 4, C(GOLD)); ell(-12, -124 + i * 28, 4, 4, C(GOLD)); }
    rr(-52, -16, 106, 14, 3, C('#f2ece0'));
  }

  if (k.trim !== 'cadet' && k.trim !== 'apron') {
    rr(-51, -18, 104, 14, 4, C(INK));
    rr(cx - 8, -20, 17, 18, 3, C(GOLD));
  }

  // Optional turned-out empty white cloth hip pockets!
  if (o.emptyPockets > 0.05) {
    const pk = o.emptyPockets;
    for (const sgn of [-1, 1]) {
      const px = sgn * 48;
      form(() => {
        curve([[px - sgn * 4, -8], [px + sgn * 28 * pk, 6 * pk], [px + sgn * 30 * pk, 46 * pk],
               [px + sgn * 10 * pk, 50 * pk], [px - sgn * 6, 22 * pk]], true);
      }, C('#faf6ec'), () => { ell(px + sgn * 8 * pk, 26 * pk, 11 * pk, 18 * pk, C('#dcd3c0')); });
    }
  }

  // Kerchief / Neckerchief
  if (k.scarf) {
    poly([[cx - 24, -150], [cx + 26, -150], [cx + 4, -102]], c('scarf'));
    limb(cx + 2, -120, cx - 10 - Math.sin(ph * 1.8) * 5, -86, 7.5, 4, c('scarf'));
  }

  // 3. Neck Bridge + Classic Rounded Capsule Head (the exact head & eye look the user loves!)
  rr(isFront ? -14 : -8, -164, 28, 24, 6, c('skinSh'));
  g.save();
  g.translate(isFront ? 0 : 8, -148);
  g.rotate(o.tilt || 0);
  g.scale(1.42 * (1 - sq * 0.16), 1.42 * (1 + sq * 0.20));

  // Back curls / braids / nape hair
  if (o.curls || k.kit === 'custer') {
    if (isFront) {
      [[-46, -30, 24], [-52, -6, 21], [-42, 14, 18], [46, -30, 24], [52, -6, 21], [42, 14, 18]]
        .forEach(q => ell(q[0], q[1], q[2], q[2], C(q[0] < 0 ? k.hairSh : k.hair)));
    } else {
      [[-44, -30, 26], [-52, -8, 22], [-40, 12, 20]].forEach(q => ell(q[0], q[1], q[2], q[2], c('hair')));
    }
  } else if (o.braids || k.trim === 'native') {
    ell(-38, -48, 20, 32, c('hair'));
    limb(-34, -32, -40, 28, 9, 6, c('hair')); rr(-45, 18, 10, 5, 2, c('band'));
    if (isFront) { limb(34, -32, 40, 28, 9, 6, c('hair')); rr(35, 18, 10, 5, 2, c('band')); }
  } else if (!isFront) {
    ell(-38, -48, 17, 28, c('hair'));
  }

  // Classic Rounded Capsule Head + Cute Button Nose!
  if (isFront) {
    ell(-54, -44, 9, 13, c('skinSh'));
    ell(54, -44, 9, 13, c('skin'));
    form(() => { g.roundRect(-52, -106, 104, 112, [52, 52, 46, 46]); }, c('skin'), () => {
      ell(-48, -40, 38, 76, c('skinSh'));
      if (o.pale) { g.globalAlpha = 0.42 * o.pale; g.fillStyle = C('#6a8299'); g.fillRect(-54, -110, 112, 68); g.globalAlpha = 1; }
    });
    ell(0, -40, 9.5, 7.5, c('skinSh'));
  } else {
    form(() => {
      g.roundRect(-48, -106, 104, 112, [52, 52, 46, 46]);
      g.ellipse(58, -42, 12, 10, 0, 0, Math.PI * 2);
    }, c('skin'), () => {
      ell(-46, -40, 42, 76, c('skinSh'));
      if (o.pale) { g.globalAlpha = 0.42 * o.pale; g.fillStyle = C('#6a8299'); g.fillRect(-52, -110, 120, 68); g.globalAlpha = 1; }
    });
    ell(-8, -44, 9, 13, c('skinSh'));
  }

  if ((o.braids || k.trim === 'native') && !isFront) {
    limb(-12, -26, -14, 34, 8.5, 5.5, c('hair')); rr(-19, 22, 10, 5, 2, c('band'));
  }

  // Cheek warmth
  g.globalAlpha = 0.28 + (o.blush || 0) * 0.42;
  if (isFront) {
    ell(-30, -30, 12, 6.5, C('#e0604a')); ell(30, -30, 12, 6.5, C('#e0604a'));
  } else {
    ell(28, -30, 13 + (o.blush || 0) * 4, 7 + (o.blush || 0) * 2.5, C('#e0604a'));
  }
  g.globalAlpha = 1;

  // Classic Soft Eyes + Accurate Brows (br > 0 = raised/pleading inner-up, br < 0 = angry inner-down!)
  const ey = -56, br = o.brow || 0, lk = o.look || 0, lkY = o.lookY || 0;
  if (o.eyes === 'shut') {
    if (isFront) {
      limb(-28, ey + 2, -10, ey + 2, 3.5, 3.5, C(INK));
      limb(10, ey + 2, 28, ey + 2, 3.5, 3.5, C(INK));
    } else {
      limb(10, ey, 28, ey + 3, 3.5, 3.5, C(INK));
      limb(36, ey + 3, 52, ey, 3.5, 3.5, C(INK));
    }
  } else if (isFront) {
    eye(-19, ey, 10, 12.5, lk, o.lid || 0, c('skin'), o.eyes || 'open', false, lkY);
    eye(19, ey, 10, 12.5, lk, o.lid || 0, c('skin'), o.eyes || 'open', false, lkY);
  } else {
    eye(19, ey, 10, 12.5, lk, o.lid || 0, c('skin'), o.eyes || 'open', false, lkY);
    eye(44, ey, 9, 12.5, lk, o.lid || 0, c('skin'), o.eyes || 'open', true, lkY);
  }

  const skep = o.eyes === 'skeptical';
  if (isFront) {
    limb(-32, ey - 19 + br * 6, -8, ey - 21 - br * 9, 4.6, 5.0, c('hair'));
    limb(32, ey - 19 + br * 6, 8, ey - 21 - br * 9, 4.6, 5.0, c('hair'));
  } else {
    limb(5, ey - 20 + (skep ? 4 : br * 6), 29, ey - 21 - (skep ? -6 : br * 9), 4.8, 4.4, c('hair'));
    limb(35, ey - 21 - (skep ? 10 : br * 9), 58, ey - 20 + (skep ? -12 : br * 6), 4.4, 4.8, c('hair'));
  }

  // Beard
  if (o.beard || k.kit === 'grant' || k.kit === 'terry') {
    if (isFront) blob([[-46, -28], [0, -18], [46, -28], [42, 8], [0, 18], [-42, 8]], c('hair'));
    else blob([[-12, -34], [22, -24], [62, -32], [58, -2], [30, 14], [-2, 4]], c('hair'));
  }

  // Mouths
  const mc = C('#5e1f22'), teeth = C('#fffaf0'), tongue = C('#d96862');
  const mx = isFront ? 0 : 38, m = o.mouth;
  if (m === 'open' || m === 'talk') {
    const oh = m === 'talk' ? 5 + Math.abs(Math.sin(ph * 3.2)) * 8 : 11;
    ell(mx, -10, 9.5, oh, mc);
  } else if (m === 'whistle') {
    ell(mx + 10, -11, 5.5, 6.5, mc);
    const wp = (Math.abs(ph) * 0.45) % 1;
    g.globalAlpha = 1 - wp * 0.7;
    ell(mx + 28 + wp * 20, -24 - wp * 18, 4.8, 3.8, C(INK));
    limb(mx + 32 + wp * 20, -24 - wp * 18, mx + 32 + wp * 20, -37 - wp * 18, 2, 2, C(INK));
    g.globalAlpha = 1;
  } else if (m === 'plead') {
    g.beginPath(); g.moveTo(mx - 14, -5); g.quadraticCurveTo(mx, -19, mx + 14, -6);
    g.strokeStyle = mc; g.lineWidth = 4.0; g.lineCap = 'round'; g.stroke();
  } else if (m === 'scoff') {
    g.beginPath(); g.moveTo(mx - 15, -16); g.quadraticCurveTo(mx, -6, mx + 14, -19);
    g.strokeStyle = mc; g.lineWidth = 4.0; g.lineCap = 'round'; g.stroke();
  } else if (m === 'shout') {
    form(() => g.roundRect(mx - 18, -23, 36, 26, 9), mc, () => {
      g.fillStyle = teeth; g.fillRect(mx - 18, -23, 36, 8);
      ell(mx, 1, 13, 8, tongue);
    });
  } else if (m === 'jaw') {
    ell(mx - 1, -2, 17, 20, c('skin'));
    form(() => g.roundRect(mx - 17, -23, 34, 35, 11), mc, () => {
      g.fillStyle = teeth; g.fillRect(mx - 17, -23, 34, 8);
      ell(mx, 9, 13, 9, tongue);
    });
  } else if (m === 'grin') {
    form(() => { g.moveTo(mx - 22, -18); g.quadraticCurveTo(mx, -14, mx + 20, -20); g.quadraticCurveTo(mx + 2, 7, mx - 22, -18); }, teeth, () => {
      limb(mx - 20, -9, mx + 16, -11, 1.8, 1.8, C('#c9bfb0'));
    });
  } else if (m === 'grit') {
    form(() => g.roundRect(mx - 18, -19, 36, 14, 5), teeth, () => {
      limb(mx - 18, -12, mx + 18, -12, 2, 2, C(INK));
      for (let tx = mx - 10; tx <= mx + 10; tx += 7) limb(tx, -19, tx, -5, 1.8, 1.8, C('#b8afa2'));
    });
  } else if (m === 'smirk') {
    g.beginPath(); g.moveTo(mx - 16, -10); g.quadraticCurveTo(mx, -9, mx + 16, -21);
    g.strokeStyle = mc; g.lineWidth = 4.2; g.lineCap = 'round'; g.stroke();
  } else if (m === 'wobble') {
    g.beginPath(); g.moveTo(mx - 18, -10); g.bezierCurveTo(mx - 8, -19, mx, -3, mx + 8, -15); g.quadraticCurveTo(mx + 14, -19, mx + 18, -9);
    g.strokeStyle = mc; g.lineWidth = 3.8; g.lineCap = 'round'; g.stroke();
  } else if (m) {
    const d = m === 'smile' ? 8 : -7;
    g.beginPath(); g.moveTo(mx - 14, -13 - d * 0.3); g.quadraticCurveTo(mx, -13 + d, mx + 15, -15 - d * 0.3);
    g.strokeStyle = mc; g.lineWidth = 3.8; g.lineCap = 'round'; g.stroke();
  }

  if (o.stache || k.kit === 'custer') {
    const lift = (m === 'shout' || m === 'jaw' || m === 'grin') ? -4 : 0;
    limb(mx - 2, -27 + lift, mx - 30, -13 + lift * 0.5, 9.5, 3.8, c('hair'));
    limb(mx - 2, -27 + lift, mx + 28, -14 + lift * 0.5, 9.5, 3.8, c('hair'));
  }
  if (o.cigar) {
    limb(mx + 4, -12, mx + 38, -17, 4.5, 4, C('#7d4a28'));
    ell(mx + 39, -17, 3.5, 4.2, C('#f06d2f'));
  }

  // Clean pearlescent teardrops & sweat drops (no rectangular bars!)
  if (o.eyes === 'teary') {
    const tp = (Math.abs(ph) * 0.35) % 1;
    droplet((isFront ? -22 : 12) - tp * 6, ey + 15 + tp * 18, 0.65 * (1 - tp * 0.3), 0.15);
    const tp2 = ((Math.abs(ph) * 0.35) + 0.5) % 1;
    droplet((isFront ? 22 : 48) + tp2 * 6, ey + 15 + tp2 * 16, 0.58 * (1 - tp2 * 0.3), -0.15);
  }
  if (o.sweat) {
    const sp = (Math.abs(ph) * 0.35) % 1;
    g.globalAlpha = clamp(o.sweat) * (1 - sp * 0.5);
    droplet(isFront ? -38 : -24, -72 + sp * 16, 0.70);
    g.globalAlpha = 1;
  }
  if (o.steam) {
    const sp = (Math.abs(ph) * 0.5) % 1;
    g.globalAlpha = clamp(o.steam) * (1 - sp * 0.7);
    ell(-36 - sp * 14, -118 - sp * 24, 13 + sp * 7, 10 + sp * 5, C('#f4efe4'));
    ell(54 + sp * 14, -118 - sp * 24, 11 + sp * 6, 9 + sp * 4, C('#f4efe4'));
    g.globalAlpha = 1;
  }
  if (o.shockLines) {
    g.globalAlpha = clamp(o.shockLines);
    [[-58, -115, -76, -134], [4, -144, 4, -170], [66, -115, 84, -134]].forEach(([x1, y1, x2, y2]) => limb(x1, y1, x2, y2, 3.8, 1.5, C(GOLD)));
    g.globalAlpha = 1;
  }

  // Hats (supports hatLift for clear close-up brow acting)
  g.save();
  g.translate(0, -(o.hatLift || 0));
  const hatType = o.hat || (k.hat === 'none' ? 'none' : 'slouch');
  if (hatType === 'none') {
    g.beginPath(); g.roundRect(-50, -110, 104, 42, [50, 50, 6, 6]); g.fillStyle = c('hair'); g.fill();
  } else if (hatType === 'headband') {
    g.beginPath(); g.roundRect(-50, -110, 104, 40, [50, 50, 6, 6]); g.fillStyle = c('hair'); g.fill();
    if (o.feather) {
      limb(-34, -92, -52, -156, 8, 3, C('#f4efe4')); limb(-46, -134, -52, -156, 6, 2.5, C(INK));
      if (o.feather > 1) { limb(-22, -92, -32, -148, 7, 2.5, C('#f4efe4')); limb(-29, -128, -32, -148, 5, 2, C(INK)); }
    }
    rr(-49, -90, 102, 12, 4, c('band')); rr(isFront ? -12 : -20, -90, 24, 12, 2, C(GOLD));
  } else if (hatType === 'shako') {
    form(() => g.roundRect(-42, -152, 84, 68, [10, 10, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-44, -154, 28, 72); });
    rr(-42, -94, 84, 9, 2, C(GOLD)); ell(0, -158, 9, 11, C(GOLD));
    if (!isFront) ell(50, -84, 28, 7, c('hatSh'), 0.12);
  } else if (hatType === 'kepi') {
    form(() => g.roundRect(-42, -128, 84, 50, [10, 16, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-44, -130, 28, 60); });
    rr(-42, -88, 84, 9, 2, c('band'));
    if (isFront) ell(0, -80, 42, 8, C('#181720'));
    else ell(50, -80, 30, 8, c('hatSh'), 0.12);
  } else if (hatType === 'cap') {
    // 1984 Red/Khaki Field Cap
    form(() => g.roundRect(-44, -118, 88, 40, [40, 40, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-46, -120, 30, 44); });
    ell(isFront ? 0 : 48, -82, isFront ? 42 : 34, 8, c('hatSh'), isFront ? 0 : 0.10);
  } else {
    // Classic Cavalry Slouch Hat
    ell(isFront ? 0 : 6, -82, 102, 16, c('hatSh'), isFront ? 0 : -0.05);
    ell(isFront ? 0 : 6, -86, 98, 14, c('hat'), isFront ? 0 : -0.05);
    form(() => g.roundRect(-40, -146, 86, 62, [28, 28, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-42, -148, 30, 68); });
    rr(-40, -98, 86, 10, 2, c('band'));
  }
  g.restore();
  g.restore();

  // 4. Front Arm(s) with Sleeve Contact Shadow!
  let retHand;
  if (isFront) {
    const h2 = o.hand2 || [-68, -4];
    drawArm(-50, -122, h2[0], h2[1], k.coatSh, o.hand2Kind, o.prop2, -1, true);
    retHand = drawArm(50, -122, hx, hy, k.coat, o.handKind, o.prop, 1, true);
  } else {
    retHand = drawArm(12, -120, hx, hy, k.coat, o.handKind, o.prop, 1, true);
  }

  g.restore();
  return retHand;
}
