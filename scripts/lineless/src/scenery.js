// scenery.js — Rich Lineless Landscape & Multiplane Historical Architecture Kit:
//   - Outdoor palettes & terrain: sky, cloud, ridge, ground, tufts, sage, tree, pine, river, lodges, tipi, marker, gatling
//   - Multiplane Illustrated Interiors (with diagonal window light shafts & foreground occluder layers!):
//     1. Saloon + Foreground Mahogany Bar + Framed "Custer's Last Fight" Myth Painting
//     2. Government Archive Office + Pull-Out Testimony Drawer + Foreground Evidence Desk
//     3. U.S. Congress Hearing Chamber + Elevated Committee Dais + Foreground Witness Stand
//     4. White House Executive Study + Foreground Carved Resolute Desk & Sounding Block
//     5. Fort Abraham Lincoln Timber HQ Cabin + Exterior Pine Hills + Montana Wall Map
//     6. West Point Gothic Granite Barracks & Parade Ground
//     7. Illustrated Classroom + Chalkboard + Foreground Teacher's Desk

const DUSK = { sky: ['#3a2d5c', '#8c3f6e', '#e0685a', '#f7b25a'], sun: '#ffe2a0', cloud: '#b04e6c',
  far: ['#7d3a66', '#6a2f5c'], mid: ['#5a2852', '#4a2148'], near: ['#3a1b3e', '#2e1533'],
  trail: ['#4d2450', '#421d46'], front: ['#2c1431', '#230f29'], tuft: '#22102a' };
const NOON = { sky: ['#4f9fd0', '#7fbfe0', '#b9dfea', '#e4f1e6'], sun: '#fff3b8', cloud: '#ffffff',
  far: ['#9db7a6', '#86a595'], mid: ['#a9bf7c', '#8fa864'], near: ['#dcc276', '#c2a558'],
  trail: ['#ecdcab', '#dcc68c'], front: ['#cbb063', '#b1944a'], tuft: '#9a8440', river: '#7cc3da', riverSh: '#5fa9c4' };
const CAMP = { sky: ['#5a98bd', '#8ec0d4', '#cfe0d4', '#f2e2c2'], sun: '#ffefb0', cloud: '#faf5ea',
  far: ['#8aa69b', '#749086'], mid: ['#9bb06e', '#829858'], near: ['#d4b86a', '#ba9c50'],
  trail: ['#e8d6a4', '#d4be86'], front: ['#c2a458', '#a68940'], tuft: '#8e7738', river: '#70b8cf', riverSh: '#549db5' };
const SCORCHED = { sky: ['#5e524a', '#8f7561', '#c29f78', '#e3c69d'], sun: '#f5cc7a', cloud: '#d4c4ae',
  far: ['#756b65', '#605651'], mid: ['#574e49', '#453d39'], near: ['#3b3431', '#2d2725'],
  trail: ['#4f4641', '#3f3733'], front: ['#2a2523', '#1f1b19'], tuft: '#211c1a' };
const WESTPOINT = { sky: ['#6888a6', '#8faec7', '#bdd1de', '#e2ebf0'], sun: '#f7f2dc', cloud: '#f4f7f9',
  far: ['#7d919e', '#697d8a'], mid: ['#6f8578', '#5b7064'], near: ['#8d9892', '#76817b'],
  trail: ['#c7c4bc', '#b0ada4'], front: ['#727e77', '#5c6761'], tuft: '#545f59' };
const OUTPOST = { sky: ['#7898ad', '#a1bdce', '#c9dbe3', '#e7efe9'], sun: '#f5efd6', cloud: '#eef3f5',
  far: ['#91a4a1', '#7d918e'], mid: ['#a1ae87', '#8a9770'], near: ['#c7ba83', '#b0a26b'],
  trail: ['#ded2a6', '#c9bc8e'], front: ['#b3a46e', '#998b58'], tuft: '#827649' };
const CIVIL_WAR = { sky: ['#526170', '#7a8a99', '#b0b8bf', '#ded8c8'], sun: '#f5dfb0', cloud: '#d4cfc4',
  far: ['#6d7882', '#59636c'], mid: ['#6e7a65', '#586350'], near: ['#8f7e60', '#75664b'],
  trail: ['#b8a482', '#9e8b6b'], front: ['#6e5f47', '#574a36'], tuft: '#4d4130' };
const WASHITA = { sky: ['#4a6280', '#7994b0', '#b8cad9', '#e8eef2'], sun: '#fff6d6', cloud: '#f2f6fa',
  far: ['#9eb2c4', '#869bb0'], mid: ['#b8cad8', '#9fb3c4'], near: ['#d8e3ec', '#c0cfd9'],
  trail: ['#eef3f7', '#d5e1eb'], front: ['#c4d2de', '#aabbc9'], tuft: '#7f93a6', river: '#5b87a8', riverSh: '#466d8c' };
const BLACK_HILLS = { sky: ['#488bb5', '#78b5d4', '#b5dceb', '#e4f0e6'], sun: '#fff2b2', cloud: '#ffffff',
  far: ['#6d9482', '#587d6c'], mid: ['#527d5c', '#3f6648'], near: ['#9ab068', '#819652'],
  trail: ['#d9c58b', '#c2ad72'], front: ['#7e9452', '#667a3f'], tuft: '#526332', river: '#62b2cc', riverSh: '#4998b3' };
const GULLY = { sky: ['#6e8294', '#96aab8', '#c2ced6', '#e3e6de'], sun: '#f5e8c4', cloud: '#edf0f2',
  far: ['#7d7a72', '#66635c'], mid: ['#82735c', '#6b5d48'], near: ['#786248', '#5e4b35'],
  trail: ['#634d36', '#4d3a27'], front: ['#4f3d2b', '#3b2d1f'], tuft: '#3b3022' };
const NIGHT = { sky: ['#141d33', '#1f2e4d', '#2c4166', '#3d567d'], sun: '#e8eef7', cloud: '#293b59',
  far: ['#1d2a42', '#162033'], mid: ['#24334d', '#1b273b'], near: ['#2b3a4f', '#202c3d'],
  trail: ['#38485e', '#2c394d'], front: ['#1d2838', '#151e2b'], tuft: '#182230', river: '#2a4666', riverSh: '#1e344d' };
const DAWN = { sky: ['#384c70', '#6d7fa3', '#c99b84', '#f5d4a6'], sun: '#ffe8b5', cloud: '#e8c4aa',
  far: ['#68758c', '#556178'], mid: ['#7d8772', '#66705c'], near: ['#a89b6e', '#8f8258'],
  trail: ['#ccbba0', '#b5a387'], front: ['#8f8358', '#756a45'], tuft: '#665c3b', river: '#6c9db8', riverSh: '#528099' };
const SOLEMN = { sky: ['#3e4a59', '#5a6878', '#8c969e', '#d6b489'], sun: '#f0d5a8', cloud: '#9aa3ab',
  far: ['#596573', '#47525e'], mid: ['#4d575e', '#3c454b'], near: ['#636963', '#4e544e'],
  trail: ['#85867a', '#6e7065'], front: ['#454a46', '#333835'], tuft: '#2f3430', river: '#5b7687', riverSh: '#455c6b' };

[DUSK, NOON, CAMP, SCORCHED, WESTPOINT, OUTPOST, CIVIL_WAR, WASHITA, BLACK_HILLS, GULLY, NIGHT, DAWN, SOLEMN].forEach(p => {
  p.sage = p.sage || ['#7f9a78', '#5f7a5e'];
  p.tree = p.tree || ['#6f9a5a', '#557d48'];
  p.water = p.water || [p.river || '#62b2cc', p.riverSh || '#4998b3'];
  p.farRidge = p.far; p.midRidge = p.mid; p.nearRidge = p.near;
  p.ridge = [p.far[0], p.mid[0], p.mid[1]];
  p.treeA = p.tree[0]; p.treeB = p.tree[1]; p.sageA = p.sage[0]; p.sageB = p.sage[1]; p.sageS = p.sage[1];
});

// ---- Outdoor Landscape Pieces ----------------------------------------------
function sky(p) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  p.sky.forEach((c, i) => gr.addColorStop((i / (p.sky.length - 1)) * 0.86, C(c)));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function cloud(x, y, s, fill) {
  rr(x - 90 * s, y, 180 * s, 34 * s, 17 * s, C(fill));
  rr(x - 46 * s, y - 24 * s, 112 * s, 42 * s, 21 * s, C(fill));
  rr(x - 136 * s, y + 20 * s, 150 * s, 24 * s, 12 * s, C(fill));
}
function ridge(y, amp, seed, cols = ['#8fa864', '#748c4e'], x0 = -1400, x1 = 3400, step = 170) {
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
    limb(x, y, x - 9 * k, y - 26 * k, 4 * k, 1, C(fill));
    limb(x, y, x + 2 * k, y - 34 * k, 4 * k, 1, C(fill));
    limb(x, y, x + 13 * k, y - 22 * k, 4 * k, 1, C(fill));
  }
}
function sage(x, y, s, a = '#7f9a78', b = '#5f7a5e') {
  ell(x, y - 26 * s, 62 * s, 34 * s, C(b));
  ell(x - 26 * s, y - 40 * s, 40 * s, 30 * s, C(a));
  ell(x + 30 * s, y - 36 * s, 34 * s, 26 * s, C(a));
}
function rock(x, y, s = 1, a = '#8f877d', b = '#6b635a') {
  form(() => curve([
    [x - 58 * s, y + 6 * s], [x - 46 * s, y - 36 * s], [x + 8 * s, y - 44 * s],
    [x + 54 * s, y - 18 * s], [x + 62 * s, y + 8 * s],
  ], true), C(a), () => {
    poly([[x - 62 * s, y - 48 * s], [x + 4 * s, y - 48 * s], [x - 12 * s, y + 12 * s], [x - 62 * s, y + 12 * s]], C(b));
  });
}
function tree(x, y, s, a = '#6f9a5a', b = '#557d48') {
  limb(x, y, x, y - 70 * s, 7 * s, 5 * s, C('#6b4a33'));
  ell(x, y - 96 * s, 52 * s, 44 * s, C(b));
  ell(x - 16 * s, y - 112 * s, 38 * s, 32 * s, C(a));
  ell(x + 22 * s, y - 86 * s, 26 * s, 22 * s, C(a));
}
function pine(x, y, s = 1, a = '#4e7c5b', b = '#395e44') {
  rr(x - 6 * s, y - 36 * s, 12 * s, 42 * s, 2, C('#5c3f28'));
  for (let k = 0; k < 2; k++) {
    const yb = y - 28 * s - k * 42 * s, w = (48 - k * 11) * s, h = (78 - k * 14) * s;
    poly([[x - w, yb], [x, yb - h], [x + w, yb]], C(a));
    poly([[x, yb - h], [x + w, yb], [x + 6 * s, yb]], C(b));
  }
}
function river(y, w, fill, shade, seed = 3) {
  const top = [], bot = [];
  for (let x = -1400; x <= 3400; x += 200) {
    const yy = y + Math.sin(x * 0.004 + seed) * 26;
    top.push([x, yy]);
    bot.unshift([x + 40, yy + w + Math.sin(x * 0.006) * 6]);
  }
  form(() => { curve(top, false); bot.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); }, C(fill), () => {
    g.translate(0, w * 0.55); g.beginPath(); curve(top, false); g.lineTo(3400, 3000); g.lineTo(-1400, 3000);
    g.fillStyle = C(shade); g.fill();
  });
}
function lodges(seed, n, x0, x1, y, s, fill, shade) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), yy = y + r() * 46, k = s * (0.7 + r() * 0.6);
    poly([[x - 17 * k, yy], [x, yy - 40 * k], [x + 17 * k, yy]], C(fill));
    poly([[x, yy - 40 * k], [x + 17 * k, yy], [x + 5 * k, yy]], C(shade));
  }
}
function tipi(x, y, s = 1, smokePh = -1) {
  if (smokePh >= 0) {
    for (let k = 0; k < 3; k++) {
      const p = ((smokePh * 0.45 + k / 3) % 1);
      g.save(); g.globalAlpha = (1 - p) * 0.36;
      ell(x + p * 26 * s, y - (195 + p * 75) * s, (12 + p * 22) * s, (9 + p * 15) * s, C('#f2ede2'));
      g.restore();
    }
  }
  limb(x - 14 * s, y - 145 * s, x + 22 * s, y - 195 * s, 3 * s, 2 * s, C('#7a5b3e'));
  limb(x + 14 * s, y - 145 * s, x - 22 * s, y - 195 * s, 3 * s, 2 * s, C('#7a5b3e'));
  limb(x, y - 145 * s, x + 4 * s, y - 202 * s, 3 * s, 2 * s, C('#634830'));
  form(() => { g.moveTo(x - 86 * s, y); g.lineTo(x - 6 * s, y - 156 * s); g.lineTo(x + 8 * s, y - 156 * s); g.lineTo(x + 88 * s, y); g.closePath(); },
    C('#f2e7cf'), () => {
      poly([[x, y - 160 * s], [x + 92 * s, y], [x + 16 * s, y]], C('#d6c7a9'));
      g.fillStyle = C('#8c5332'); g.fillRect(x - 95 * s, y - 26 * s, 190 * s, 26 * s);
      g.fillStyle = C('#3f7687'); g.fillRect(x - 95 * s, y - 34 * s, 190 * s, 8 * s);
    });
  poly([[x - 6 * s, y - 154 * s], [x - 36 * s, y - 112 * s], [x - 14 * s, y - 102 * s]], C('#cbbba0'));
  poly([[x + 6 * s, y - 154 * s], [x + 36 * s, y - 112 * s], [x + 14 * s, y - 102 * s]], C('#bfa98a'));
  ell(x + 4 * s, y - 26 * s, 18 * s, 26 * s, C('#3a271c'));
}
function ground(p, y = 855) {
  const gy = ridge(y, 36, 5, p.near);
  ridge(y + 18, 36, 5, p.trail);
  const r = rng(31);
  for (let i = 0; i < 52; i++) {
    const x = -400 + r() * 3600, k = 0.6 + r();
    ell(x, gy(x) + 32 + r() * 82, 9.5 * k, 4.5 * k, C(p.trail[1]));
  }
  ridge(y + 128, 36, 5, p.front);
  tufts(8, 64, -400, 3200, x => gy(x) + 128, 130, p.tuft, 1.25);
  tufts(9, 28, -400, 3200, x => gy(x) - 12, 8, p.tuft, 0.7);
  return gy;
}
function marker(x, y, s = 1, rot = 0) {
  at(x, y, s, () => {
    g.globalAlpha = 0.22; ell(2, 3, 22, 6, C('#141110')); g.globalAlpha = 1;
    form(() => g.roundRect(-14, -48, 28, 50, [10, 10, 2, 2]), C('#f0ece4'), () => {
      g.fillStyle = C('#cfc8bc'); g.fillRect(4, -48, 12, 50);
    });
  }, rot);
}
function pen(pts, p, w = 9, col = '#d8352a') {
  if (p <= 0 || pts.length < 2) return;
  const n = Math.max(2, Math.ceil(pts.length * clamp(p)));
  g.beginPath(); curve(pts.slice(0, n), false);
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function gatling(x, y, s = 1, tilt = 0, wheelRot = 0) {
  at(x, y, s, () => {
    g.globalAlpha = 0.24; ell(0, 8, 130, 14, C('#1d1226')); g.globalAlpha = 1;
    limb(-115, -18, 12, -62, 11, 8, C('#5c3d24'));
    g.save(); g.translate(10, -72); g.rotate(tilt);
    form(() => g.roundRect(-38, -22, 132, 34, 6), C('#d9b24c'), () => { g.fillStyle = C('#a88225'); g.fillRect(-38, -4, 132, 16); });
    for (let i = -2; i <= 2; i++) limb(-28, i * 5 - 4, 96, i * 5 - 4, 2.5, 2.5, C('#7a5c18'));
    rr(-24, -42, 18, 22, 3, C('#b8902e'));
    g.restore();
    g.save(); g.translate(0, -52); g.rotate(wheelRot);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; limb(0, 0, Math.cos(a) * 54, Math.sin(a) * 54, 4, 3.5, C('#7a5230')); }
    g.beginPath(); g.arc(0, 0, 54, 0, 7); g.strokeStyle = C('#5c3d24'); g.lineWidth = 11; g.stroke();
    g.beginPath(); g.arc(0, 0, 59, 0, 7); g.strokeStyle = C('#38322e'); g.lineWidth = 4; g.stroke();
    ell(0, 0, 14, 14, C('#c9a23f'));
    g.restore();
  });
}

// ============================================================================
// MULTIPLANE HISTORICAL INTERIORS & ARCHITECTURAL SETS
// (Every interior provides background + warm light shafts + separate foreground
//  occluder furniture so figures stand INSIDE spaces, never pasted on flat walls!)
// ============================================================================

// ---- 1. 1890s American Saloon + Framed "Custer's Last Fight" Myth Painting --
function drawSaloonBack(paintingDrop = 1) {
  const gr = g.createLinearGradient(0, 0, 0, 820);
  gr.addColorStop(0, C('#543928'));
  gr.addColorStop(1, C('#3f291c'));
  g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 1040);

  // Wainscot & wallpaper stripes
  for (let x = -200; x < W + 200; x += 140) {
    g.fillStyle = C('#4a3122'); g.fillRect(x, -150, 68, 690);
  }
  g.fillStyle = C('#362115'); g.fillRect(-300, 535, W + 600, 265);
  rr(-300, 526, W + 600, 14, 0, C('#26160d'));

  // Left & Right liquor bottle shelves behind bar
  for (const sx of [210, 1710]) {
    for (const sy of [255, 405]) {
      rr(sx - 155, sy, 310, 16, 4, C('#291810'));
      const bCols = ['#4d7a58', '#9e6b36', '#546b82', '#7d5238', '#638052'];
      for (let b = 0; b < 5; b++) {
        const bx = sx - 122 + b * 58, bc = C(bCols[(b + sy) % 5]);
        rr(bx - 12, sy - 58, 24, 58, 5, bc);
        rr(bx - 5, sy - 78, 10, 24, 2, bc);
        rr(bx - 9, sy - 42, 18, 18, 2, C('#efe6d2'));
      }
    }
  }

  // Plank floor
  g.fillStyle = C('#69472f'); g.fillRect(-300, 790, W + 600, 450);
  for (let i = -5; i <= 5; i++) {
    if (i) limb(960 + i * 165, 790, 960 + i * 310, 1220, 2, 3.5, C('#523521'));
  }

  // Hanging brass saloon lamps & warm golden light cones
  for (const lx of [360, 1560]) {
    limb(lx, -100, lx, 85, 3, 3, C('#261810'));
    form(() => g.ellipse(lx, 95, 48, 22, 0, Math.PI, 0), C('#dfb244'), () => {
      g.fillStyle = C('#b58924'); g.fillRect(lx - 50, 70, 34, 28);
    });
    g.save(); g.globalAlpha = 0.12;
    poly([[lx - 42, 98], [lx + 42, 98], [lx + 240, 880], [lx - 240, 880]], '#fff3c4');
    g.restore();
  }

  // Ornate Gold-Framed "CUSTER'S LAST FIGHT" Barroom Poster/Painting in center!
  if (paintingDrop > 0) {
    const py = lerp(-420, 92, eout(clamp(paintingDrop)));
    g.save();
    g.translate(960, py);
    rr(-365, -8, 730, 426, 10, 'rgba(20,12,8,0.32)');
    form(() => g.roundRect(-360, -14, 720, 420, 8), C('#d9ab3f'), () => {
      g.fillStyle = C('#b08420'); g.fillRect(-360, 220, 720, 190);
    });
    // Canvas inside frame: heroic myth hill + tiny Custer waving sabre in sunbeam
    form(() => g.roundRect(-328, 16, 656, 356, 4), C('#edd7a4'), () => {
      const pGr = g.createLinearGradient(0, 16, 0, 372);
      pGr.addColorStop(0, C('#e0b978')); pGr.addColorStop(1, C('#f5e5bd'));
      g.fillStyle = pGr; g.fillRect(-328, 16, 656, 356);
      ell(170, 92, 52, 52, C('#fff6d6'));
      blob([[-340, 380], [-180, 255], [0, 215], [185, 260], [340, 380]], C('#c4985a'));
      // Heroic circle myth silhouettes inside the painting
      rr(-12, 138, 24, 82, 8, C('#2c446e'));
      ell(0, 122, 16, 16, C('#f0b98f'));
      ell(0, 110, 28, 6, C('#ead9b0'));
      limb(8, 152, 58, 96, 4, 2, C('#ffffff')); // gleaming sabre
      for (const sx of [-98, -54, 54, 98]) {
        rr(sx - 9, 178, 18, 60, 6, C('#34507e'));
        ell(sx, 165, 12, 12, C('#e8ad84'));
      }
    });
    rr(-135, 374, 270, 26, 4, C('#4a301c'));
    text("CUSTER'S LAST FIGHT", 0, 388, 19, C('#f5e5bd'), 'Georgia', 'center', 800);
    g.restore();
  }
}

// Foreground Mahogany Saloon Bar Counter (occludes bartender & patrons below waist!)
function drawSaloonBarFG(yTop = 825) {
  form(() => g.roundRect(-120, yTop, 1380, 320, 6), C('#5e3b24'), () => {
    g.fillStyle = C('#452917'); g.fillRect(-120, yTop, 380, 320);
    for (let px = 40; px <= 1020; px += 265) {
      g.fillStyle = C('#472b19'); g.fillRect(px, yTop + 42, 210, 195);
    }
  });
  form(() => g.roundRect(-140, yTop - 28, 1420, 36, 6), C('#3d2314'), () => {
    g.fillStyle = C('#7a4e32'); g.fillRect(-140, yTop - 28, 1420, 10);
  });
  // Brass foot rail + wooden beer barrel on right
  limb(-120, yTop + 215, 1250, yTop + 215, 7, 7, C('#d4a63c'));
  form(() => g.roundRect(1690, yTop - 35, 195, 255, [28, 28, 22, 22]), C('#6e482c'), () => {
    g.fillStyle = C('#4f321d'); g.fillRect(1690, yTop - 35, 68, 255);
    rr(1686, yTop + 12, 203, 14, 2, C('#3d4047'));
    rr(1686, yTop + 158, 203, 14, 2, C('#3d4047'));
  });
}

// ---- 2. Government Records Archive Office + Open Testimony Drawer -----------
function drawArchiveBack(drawerOpen = 1) {
  const gr = g.createLinearGradient(0, 0, 0, 800);
  gr.addColorStop(0, C('#cfc5b0')); gr.addColorStop(1, C('#b8ad96'));
  g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 1020);

  // Paned archive window on left + warm dust-mote sunlight shaft
  form(() => g.roundRect(130, 95, 260, 420, 6), C('#dfeef7'), () => {
    g.fillStyle = C('#c5ddec'); g.fillRect(130, 95, 90, 420);
  });
  rr(118, 510, 284, 16, 3, C('#5c402b'));
  rr(255, 95, 10, 418, 0, C('#5c402b'));
  rr(130, 235, 260, 10, 0, C('#5c402b'));
  rr(130, 375, 260, 10, 0, C('#5c402b'));

  // Wainscot & wood floor
  g.fillStyle = C('#6b4b35'); g.fillRect(-300, 585, W + 600, 200);
  rr(-300, 578, W + 600, 12, 0, C('#4d3423'));
  g.fillStyle = C('#876244'); g.fillRect(-300, 780, W + 600, 450);

  // Tall Oak Filing Cabinet at x = 470..830 with sliding Testimony Drawer!
  form(() => g.roundRect(470, 135, 360, 665, 6), C('#5e3d26'), () => {
    g.fillStyle = C('#452b19'); g.fillRect(470, 135, 115, 665);
  });
  for (let d = 0; d < 4; d++) {
    const dy = 168 + d * 152;
    if (d === 1) continue;
    rr(496, dy, 308, 128, 4, C('#734c31'));
    rr(618, dy + 46, 64, 22, 3, C('#d4a63c'));
  }
  // Drawer #2 sliding open to the right with Lakota & Cheyenne testimony folders!
  const slide = clamp(drawerOpen) * 145;
  const dy2 = 168 + 152;
  rr(496, dy2, 308, 128, 4, C('#331f12'));
  form(() => g.roundRect(496 + slide, dy2 + 6, 308, 122, 4), C('#7d5336'), () => {
    g.fillStyle = C('#5c3b24'); g.fillRect(496 + slide, dy2 + 6, 95, 122);
  });
  if (drawerOpen > 0.15) {
    for (let f = 0; f < 5; f++) {
      rr(525 + slide + f * 46, dy2 - 34 - (f % 2) * 10, 40, 44, 3, f % 2 ? C('#efe2c4') : C('#fbf5e6'));
    }
  }
  rr(760 + slide, dy2 + 48, 32, 24, 3, C('#dfb244'));

  // Diagonal archive window sunbeam
  g.save(); g.globalAlpha = 0.14;
  poly([[130, 100], [390, 100], [860, 960], [380, 960]], '#fff7d8');
  g.restore();
}

// Foreground Evidence Verification Table (holds #1 Cartridge, #2 Note, #3 Native Accounts!)
function drawArchiveTableFG(x0 = 980, yTop = 815) {
  form(() => g.roundRect(x0, yTop, 760, 310, 6), C('#69452c'), () => {
    g.fillStyle = C('#4d301d'); g.fillRect(x0, yTop, 240, 310);
  });
  rr(x0 - 22, yTop - 26, 804, 32, 6, C('#472b19'));
  // Item 1: Brass cartridge cases on velvet pad
  rr(x0 + 65, yTop - 40, 130, 14, 3, C('#3b4d5e'));
  rr(x0 + 105, yTop - 68, 14, 30, 3, C('#e8be4a'));
  rr(x0 + 128, yTop - 62, 14, 24, 3, C('#dfb03b'));
  // Item 2: Bugler's scribbled note
  rr(x0 + 295, yTop - 48, 145, 24, 3, C('#fbf6ea'));
  rr(x0 + 312, yTop - 40, 95, 4, 1, C('#6e655c'));
  // Item 3: Native accounts bound ledger
  rr(x0 + 525, yTop - 58, 155, 34, 4, C('#6e4832'));
  rr(x0 + 535, yTop - 48, 135, 14, 2, C('#fbf5e6'));
}

// ---- 3. Illustrated Classroom + Multi-Camera Presets + Live Chalk ----------
const CLASS_CAM = {
  wide:    [0, 0, 1.00],
  board:   [255, -92, 1.44],
  teacher: [-460, 118, 1.54],
};

function drawClassroomBack() {
  // Extended multi-camera-safe wall & wainscot (-1400..W+1400) so close-ups & pans never clip!
  const gr = g.createLinearGradient(0, -400, 0, 860);
  gr.addColorStop(0, C('#ecdac0')); gr.addColorStop(1, C('#dcc5a2'));
  g.fillStyle = gr; g.fillRect(-1400, -900, W + 2800, 1850);

  g.save(); g.globalAlpha = 0.18;
  for (let wx = -1200; wx < W + 1200; wx += 180) {
    g.fillStyle = C('#cbb08a'); g.fillRect(wx, -800, 4, 1610);
  }
  g.restore();

  // Tall sunlit schoolhouse window on far left (-430..-140) visible in wide pans & Teacher MCU!
  form(() => g.roundRect(-430, 86, 290, 520, [145, 145, 6, 6]), C('#e6f2f8'), () => {
    g.fillStyle = C('#cde3ef'); g.fillRect(-430, 86, 98, 520);
    ell(-245, 220, 95, 95, C('#fff8dc'));
  });
  rr(-448, 598, 326, 20, 4, C('#6e472b'));
  rr(-290, 92, 12, 510, 0, C('#6e472b'));
  rr(-430, 315, 290, 12, 0, C('#6e472b'));
  rr(-430, 455, 290, 12, 0, C('#6e472b'));

  g.fillStyle = C('#c9ab80'); g.fillRect(-1400, 815, W + 2800, 780);
  for (let px = -1200; px < W + 1200; px += 220) {
    rr(px + 18, 845, 184, 165, 4, C('#be9e72'));
  }
  rr(-1400, 802, W + 2800, 18, 0, C('#a68356'));

  // Framed Slate-Green Chalkboard (x = 610..1810, y = 84..736; interior safe zone: 640..1768, 124..700)
  rr(602, 92, 1216, 656, 14, 'rgba(34,24,18,0.22)');
  rr(596, 82, 1216, 656, 12, C('#7d5030'));
  form(() => g.roundRect(622, 108, 1164, 604, 6), C('#2b5747'), () => {
    poly([[1380, 108], [1800, 108], [1800, 720], [1120, 720]], C('#23493b'));
  });
  rr(610, 726, 1188, 22, 4, C('#5e3b22'));
  rr(1510, 712, 68, 14, 4, C('#f5f1e8'));
  rr(1600, 712, 44, 14, 4, C('#e6be9c'));
  rr(1210, 706, 82, 20, 4, C('#4a433d'));

  g.save(); g.globalAlpha = 0.12;
  poly([[-420, 100], [-140, 100], [640, 1060], [60, 1060]], '#fff8de');
  poly([[20, -60], [340, -60], [880, 1020], [360, 1020]], '#fff8de');
  g.restore();
}

function drawLiveChalk(x, y, active = true, t = _CUR_T) {
  if (!active) return;
  at(x + 12, y - 4 + Math.sin(t * 28) * 3, 1, () => {
    rr(-6, -10, 38, 13, 4, '#faf7f0');
    rr(18, -10, 14, 13, 3, '#dfd9cc');
  }, -0.52);
  for (let i = 0; i < 4; i++) {
    const dp = ((t * 2.8 + i * 0.25) % 1);
    g.save(); g.globalAlpha = (1 - dp) * 0.65;
    ell(x + (i - 1.5) * 9, y + 8 + dp * 34, 2.6, 2.6, '#f5f1e8');
    g.restore();
  }
}

function drawClassroomDeskFG(yTop = 915) {
  form(() => g.roundRect(1060, yTop, 880, 240, 8), C('#9e693a'), () => {
    g.fillStyle = C('#7d5029'); g.fillRect(1060, yTop, 280, 240);
  });
  rr(1042, yTop - 22, 916, 28, 6, C('#b87f4c'));
  // Graded exam sheet with red F on teacher's desk
  at(1395, yTop - 16, 1, () => {
    rr(-135, -36, 270, 126, 4, C('#fbf6ea'));
    for (let i = 0; i < 3; i++) rr(-108, -12 + i * 24, 150, 7, 3, C('#d6cec0'));
    ell(84, 10, 28, 25, 'rgba(216,53,42,0.12)');
    text('F', 84, 12, 40, '#d8352a', 'Georgia', 'center', 900);
  }, -0.07);
  limb(1610, yTop - 6, 1755, yTop - 42, 8.5, 8.5, '#d8352a');
  limb(1755, yTop - 42, 1778, yTop - 48, 8.5, 2, C(INK));
}

// ---- 4. West Point Granite Gothic Barracks (1861) ---------------------------
function drawWestPointBack() {
  sky(WESTPOINT);
  ell(1580, 185, 76, 76, C(WESTPOINT.sun));
  cloud(360, 155, 1.3, WESTPOINT.cloud);
  cloud(1180, 125, 1.1, WESTPOINT.cloud);
  ridge(665, 85, 14, WESTPOINT.far);

  // Imposing Grey Granite Gothic Fortress Barracks with Battlements & Arched Windows!
  form(() => g.rect(80, 245, 1760, 520), C('#9aa3ab'), () => {
    g.fillStyle = C('#818b94'); g.fillRect(80, 245, 480, 520);
  });
  // Crenellations along roof
  for (let cx = 80; cx < 1820; cx += 92) {
    rr(cx, 205, 56, 46, 3, cx < 560 ? C('#818b94') : C('#9aa3ab'));
  }
  // Tall Gothic windows & central sally-port arch
  for (const wx of [245, 515, 1385, 1655]) {
    rr(wx - 44, 335, 88, 175, [44, 44, 2, 2], C('#3c4856'));
    rr(wx - 3, 338, 6, 170, 0, C('#7d8790'));
    rr(wx - 42, 420, 84, 6, 0, C('#7d8790'));
  }
  rr(835, 415, 250, 350, [125, 125, 0, 0], C('#2f3842'));

  // Cobblestone parade ground
  const gy = ground(WESTPOINT, 765);
  return gy;
}

// ---- 5. Congress / White House / Fort Lincoln HQ (from Lineless Pro) -------
function drawCongressBack() {
  const gr = g.createLinearGradient(0, 0, 0, 760);
  gr.addColorStop(0, C('#dfd5c3')); gr.addColorStop(1, C('#c7baa4'));
  g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 980);
  for (const wx of [480, 1440]) {
    form(() => g.roundRect(wx - 145, 75, 290, 440, [145, 145, 4, 4]), C('#dfeef7'), () => {
      g.fillStyle = C('#c7dfee'); g.fillRect(wx - 145, 75, 95, 440);
      ell(wx + 35, 195, 110, 110, C('#f7f2dc'));
    });
    rr(wx - 158, 510, 316, 18, 4, C('#5c3d28'));
    rr(wx - 6, 80, 12, 432, 0, C('#6e4a32'));
    rr(wx - 145, 255, 290, 11, 0, C('#6e4a32'));
    rr(wx - 145, 385, 290, 11, 0, C('#6e4a32'));
  }
  for (const cx of [145, 845, 1075, 1775]) {
    form(() => g.rect(cx - 46, 40, 92, 545), C('#eee7d8'), () => {
      g.fillStyle = C('#d4cab6'); g.fillRect(cx - 46, 40, 34, 545);
    });
    rr(cx - 58, 32, 116, 24, 6, C('#dfd6c4'));
    rr(cx - 56, 568, 112, 22, 5, C('#d4cab6'));
  }
  g.fillStyle = C('#6b4630'); g.fillRect(-300, 560, W + 600, 210);
  rr(-300, 552, W + 600, 14, 0, C('#4f3220'));
  g.save(); g.globalAlpha = 0.14;
  poly([[340, 110], [620, 110], [980, 920], [580, 920]], '#fff6d6');
  poly([[1300, 110], [1580, 110], [1940, 920], [1540, 920]], '#fff6d6');
  g.restore();
}

function drawCongressDaisAndFloor() {
  form(() => g.roundRect(120, 585, 1680, 175, 6), C('#5e3b26'), () => {
    g.fillStyle = C('#472b1b'); g.fillRect(120, 585, 420, 175);
  });
  rr(102, 568, 1716, 24, 5, C('#3d6b4c'));
  for (const lx of [430, 960, 1490]) {
    rr(lx - 14, 548, 28, 22, 3, C('#b88b28'));
    ell(lx, 540, 34, 16, C('#e6ba4c'));
  }
  g.fillStyle = C('#8c6546'); g.fillRect(-300, 755, W + 600, 500);
  poly([[540, 755], [1380, 755], [1660, 1220], [260, 1220]], C('#6e2f3a'));
}

function drawWitnessPodiumFG(yTop = 885, scatterT = -1) {
  form(() => g.roundRect(450, yTop, 1020, 360, 6), C('#6e462e'), () => {
    g.fillStyle = C('#52321f'); g.fillRect(450, yTop, 320, 360);
  });
  rr(422, yTop - 28, 1076, 36, 6, C('#4a2c1b'));
  for (let k = 0; k < 3; k++) rr(505 + k * 7, yTop - 44 - k * 8, 135, 14, 2, k % 2 ? C('#e8dfd0') : C('#faf5e8'));
  rr(1315, yTop - 86, 52, 60, 6, C('#dfb244'));
  if (scatterT >= 0) {
    for (let i = 0; i < 4; i++) {
      const p = ((scatterT * 0.55 + i * 0.24) % 1), dir = i % 2 === 0 ? 1 : -1;
      const px = 940 + dir * (90 + p * 280), py = yTop - 55 - Math.sin(p * Math.PI) * 155 + p * 40;
      at(px, py, 1 - p * 0.15, () => { rr(-34, -22, 68, 44, 3, C('#fcf8ee')); }, dir * p * 1.4);
    }
  }
}

// ---- 6. 1876 White House Executive Study + Resolute Desk FG ----------------
function drawWhiteHouseBack() {
  const gr = g.createLinearGradient(0, 0, 0, 780);
  gr.addColorStop(0, C('#7d8c84')); gr.addColorStop(1, C('#627069'));
  g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 1000);
  form(() => g.roundRect(960, 55, 340, 470, 8), C('#dcebf5'), () => {
    g.fillStyle = C('#c2d9e8'); g.fillRect(960, 55, 120, 470);
  });
  rr(1124, 55, 12, 470, 0, C('#4a2f1e'));
  rr(960, 215, 340, 11, 0, C('#4a2f1e'));
  rr(960, 370, 340, 11, 0, C('#4a2f1e'));
  for (const dx of [890, 1295]) {
    form(() => g.roundRect(dx, 35, 82, 520, 6), C('#59253a'), () => {
      g.fillStyle = C('#3f1828'); g.fillRect(dx, 35, 32, 520);
    });
  }
  rr(1455, 78, 340, 410, 6, C('#c99e38'));
  for (let s = 0; s < 9; s++) rr(1467, 90 + s * 43, 316, 44, 0, s % 2 === 0 ? C('#8c3842') : C('#ede6d8'));
  rr(1467, 90, 148, 195, 0, C('#24385c'));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ell(1488 + c * 34, 112 + r * 44, 3.5, 3.5, C('#f2ece0'));
  form(() => g.roundRect(110, 135, 360, 440, 6), C('#4d301e'), () => {
    g.fillStyle = C('#362013'); g.fillRect(140, 165, 300, 390);
    const bCols = ['#5c7085', '#7a6848', '#4c6654', '#6e5266', '#85704e'];
    for (let sh = 0; sh < 3; sh++) {
      const sy = 285 + sh * 125;
      g.fillStyle = C('#593824'); g.fillRect(132, sy, 316, 14);
      for (let b = 0; b < 8; b++) {
        const bh = 72 + ((sh * 7 + b * 3) % 24);
        g.fillStyle = C(bCols[(sh + b) % bCols.length]);
        g.fillRect(152 + b * 34, sy - bh, 28, bh);
      }
    }
  });
  g.fillStyle = C('#4a2f1e'); g.fillRect(-300, 545, W + 600, 235);
  rr(-300, 538, W + 600, 14, 0, C('#362012'));
  g.fillStyle = C('#26354d'); g.fillRect(-300, 775, W + 600, 450);
  rr(830, 742, 1080, 95, 4, C('#3b2316'));
  g.save(); g.globalAlpha = 0.13;
  poly([[960, 60], [1300, 60], [1560, 960], [1040, 960]], '#fff4d2');
  g.restore();
}

function drawResoluteDeskFG(yTop = 815, slamImpact = 0) {
  g.save(); g.translate(0, slamImpact * 6);
  form(() => g.roundRect(845, yTop, 960, 340, 6), C('#5e3a24'), () => {
    g.fillStyle = C('#452918'); g.fillRect(845, yTop, 330, 340);
    g.fillStyle = C('#4a2c1a'); g.fillRect(910, yTop + 44, 365, 210);
    g.fillStyle = C('#4a2c1a'); g.fillRect(1365, yTop + 44, 365, 210);
  });
  form(() => g.roundRect(818, yTop - 30, 1014, 38, 6), C('#3d2314'), () => {
    g.fillStyle = C('#73482e'); g.fillRect(818, yTop - 30, 1014, 10);
  });
  rr(1285, yTop + 95, 72, 46, 6, C('#c9a23f'));
  rr(1035, yTop - 52, 124, 24, 4, C('#382012'));
  rr(1050, yTop - 62, 94, 12, 3, C('#c9a23f'));
  rr(1635, yTop - 118, 24, 90, 4, C('#b88c28'));
  form(() => g.ellipse(1647, yTop - 124, 52, 26, 0, Math.PI, 0), C('#3d7052'), () => {
    g.fillStyle = C('#2b523b'); g.fillRect(1595, yTop - 152, 36, 30);
  });
  if (slamImpact > 0.05) {
    g.save(); g.globalAlpha = slamImpact * 0.85; g.strokeStyle = C('#fff9e6'); g.lineWidth = 8 * slamImpact;
    g.beginPath(); g.ellipse(1095, yTop - 62, 115 * (1.3 - slamImpact * 0.5), 34 * (1.3 - slamImpact * 0.5), 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  g.restore();
}

// ---- 7. Fort Abraham Lincoln Timber HQ Cabin + Briefing Table FG -----------
function drawFortLincolnBack(showMap = true) {
  const skyGr = g.createLinearGradient(0, 120, 0, 740);
  skyGr.addColorStop(0, C('#7db4d8')); skyGr.addColorStop(1, C('#d9ebe6'));
  g.fillStyle = skyGr; g.fillRect(150, 150, 400, 620);
  blob([[140, 560], [280, 495], [430, 515], [560, 485], [560, 760], [140, 760]], C('#8da894'));
  pine(240, 600, 0.95, '#4c7a5b', '#395e45');
  pine(450, 590, 1.08, '#4c7a5b', '#395e45');
  g.fillStyle = C('#a9bc7c'); g.fillRect(150, 580, 400, 195);

  const drawLogSection = (x0, x1, y0, y1) => {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    for (let ly = -20; ly < 780; ly += 78) {
      form(() => g.rect(x0, ly, x1 - x0, 68), C('#8c5f3e'), () => {
        g.fillStyle = C('#734b2f'); g.fillRect(x0, ly + 44, x1 - x0, 24);
        g.fillStyle = C('#9e6e4b'); g.fillRect(x0, ly, x1 - x0, 12);
      });
      g.fillStyle = C('#cfc3ae'); g.fillRect(x0, ly + 68, x1 - x0, 10);
    }
    g.restore();
  };
  drawLogSection(-300, 195, -150, 755);
  drawLogSection(505, W + 300, -150, 755);
  drawLogSection(195, 505, -150, 195);

  rr(172, 185, 28, 575, 3, C('#543620'));
  rr(498, 185, 28, 575, 3, C('#543620'));
  rr(158, 172, 382, 28, 4, C('#472d1a'));
  rr(-300, -40, W + 600, 86, 0, C('#472d1a'));

  if (showMap) {
    form(() => g.roundRect(675, 138, 690, 410, 6), C('#543620'), () => {
      rr(694, 156, 652, 374, 4, C('#f4ead2'));
      limb(735, 395, 1020, 345, 5.5, 5, C('#6aa6c4'));
      limb(1020, 345, 1295, 265, 5, 4.5, C('#6aa6c4'));
      limb(1045, 342, 1075, 490, 4, 3.5, C('#6aa6c4'));
      text('MONTANA TERRITORY · 1876', 1020, 196, 24, C('#3b2e24'), 'Georgia', 'center', 800);
    });
  }
  form(() => g.roundRect(1495, 155, 290, 355, 6), C('#dfeff8'), () => {
    g.fillStyle = C('#c5e0ef'); g.fillRect(1495, 155, 95, 355);
  });
  rr(1480, 505, 320, 18, 3, C('#4f321e'));
  rr(1635, 155, 11, 355, 0, C('#543620'));
  rr(1495, 328, 290, 11, 0, C('#543620'));

  g.fillStyle = C('#9e724b'); g.fillRect(-300, 752, W + 600, 480);
  poly([[490, 805], [1510, 805], [1710, 1190], [310, 1190]], C('#3c5c47'));
  g.save(); g.globalAlpha = 0.14;
  poly([[1495, 165], [1785, 165], [1320, 1120], [820, 1120]], '#fff7dc');
  g.restore();
}

function drawFortLincolnTableFG(x0 = 560, yTop = 845, w = 820) {
  form(() => g.roundRect(x0, yTop, w, 280, 6), C('#6e482c'), () => {
    g.fillStyle = C('#52331d'); g.fillRect(x0, yTop, w * 0.34, 280);
  });
  rr(x0 - 22, yTop - 26, w + 44, 32, 6, C('#4a2d19'));
  // Unrolled campaign map sheet on table surface
  rr(x0 + 120, yTop - 36, w - 240, 14, 3, C('#f5ebd4'));
}

// ---- 8. Victorian Parlor Study + Writing Desk FG (Ch 8 Libbie Custer) ------
function drawParlorBack() {
  const gr = g.createLinearGradient(0, 0, 0, 780);
  gr.addColorStop(0, C('#6e5560')); gr.addColorStop(1, C('#543f48'));
  g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 1000);
  for (let x = -200; x < W + 200; x += 130) {
    g.fillStyle = C('#614a54'); g.fillRect(x, -150, 56, 700);
  }
  // Tall Victorian arched window on left + warm afternoon sunbeam
  form(() => g.roundRect(160, 80, 280, 450, [140, 140, 4, 4]), C('#e6eff5'), () => {
    g.fillStyle = C('#cbdce8'); g.fillRect(160, 80, 95, 450);
  });
  rr(145, 525, 310, 18, 4, C('#4a2f22'));
  rr(295, 85, 10, 442, 0, C('#4a2f22'));
  rr(160, 285, 280, 10, 0, C('#4a2f22'));
  for (const dx of [105, 425]) {
    rr(dx, 65, 68, 480, 6, C('#422936'));
  }
  g.fillStyle = C('#4d3324'); g.fillRect(-300, 565, W + 600, 210);
  rr(-300, 556, W + 600, 14, 0, C('#362217'));
  g.fillStyle = C('#734d34'); g.fillRect(-300, 775, W + 600, 450);
  g.save(); g.globalAlpha = 0.14;
  poly([[160, 95], [440, 95], [960, 960], [420, 960]], '#fff6dc');
  g.restore();
}

function drawParlorDeskFG(x0 = 520, yTop = 835, w = 860) {
  form(() => g.roundRect(x0, yTop, w, 300, 6), C('#5c3824'), () => {
    g.fillStyle = C('#422617'); g.fillRect(x0, yTop, w * 0.34, 300);
  });
  rr(x0 - 22, yTop - 26, w + 44, 32, 6, C('#3b2113'));
}

// ---- 9. Unified Historical Parchment Topographic Map Kit -------------------
// Ensures every tactical/forensic map across a film shares one cohesive visual bible!
function drawParchmentMapFrame(title = '', sub = '') {
  // Rich dark-oak war-room tabletop backdrop
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, C('#422c1c')); bg.addColorStop(1, C('#2b1b10'));
  g.fillStyle = bg; g.fillRect(-300, -200, W + 600, H + 400);
  for (let py = 120; py < H; py += 180) {
    limb(-200, py, W + 200, py, 1.8, 1.8, C('#332013'));
  }

  // Drop shadow + antique parchment sheet (x = 112..1808, y = 68..1012)
  rr(126, 82, 1696, 944, 14, 'rgba(14,8,4,0.44)');
  form(() => g.roundRect(112, 68, 1696, 944, 12), C('#f3e7cb'), () => {
    g.fillStyle = C('#e7d7b4'); g.fillRect(112, 540, 1696, 472);
    ell(180, 120, 220, 160, C('#eadbc0'));
    ell(1740, 950, 260, 180, C('#decb9f'));
  });

  // Classic double cartographic border + corner brass tacks
  g.save();
  g.strokeStyle = C('#6e553b'); g.lineWidth = 4.5;
  g.beginPath(); g.roundRect(136, 92, 1648, 896, 6); g.stroke();
  g.strokeStyle = C('#9c8262'); g.lineWidth = 2;
  g.beginPath(); g.roundRect(148, 104, 1624, 872, 4); g.stroke();
  g.restore();
  for (const [tx, ty] of [[142, 98], [1778, 98], [142, 982], [1778, 982]]) {
    ell(tx, ty, 8, 8, C('#c99e38'));
    ell(tx - 2, ty - 2, 2.5, 2.5, '#fff5cc');
  }

  // Subtle topographic contour rings
  g.save(); g.strokeStyle = C('#d4c29c'); g.lineWidth = 2.2;
  for (let k = 0; k < 4; k++) {
    g.beginPath(); g.ellipse(1040, 520, 580 - k * 105, 250 - k * 42, -0.16, 0, Math.PI * 2); g.stroke();
  }
  g.restore();

  // Compass rose at bottom-left
  at(228, 898, 0.92, () => {
    ell(0, 0, 42, 42, C('#e6d5b2'));
    g.save(); g.strokeStyle = C('#6e553b'); g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, 42, 0, Math.PI * 2); g.stroke(); g.restore();
    poly([[0, -36], [9, 0], [0, -8], [-9, 0]], C('#28416b'));
    poly([[0, 36], [9, 0], [0, 8], [-9, 0]], C('#8c7456'));
    poly([[-36, 0], [0, -8], [-8, 0], [0, 8]], C('#8c7456'));
    poly([[36, 0], [0, -8], [8, 0], [0, 8]], C('#8c7456'));
    text('N', 0, -54, 24, C('#3b2e24'), 'Georgia', 'center', 800);
  });

  // Navy & cream cartographic header banner
  if (title) {
    g.font = '800 34px "Rockwell", Georgia, serif';
    const bw = Math.max(540, g.measureText(title).width + 110);
    rr(960 - bw / 2 + 5, 118 + 5, bw, sub ? 86 : 58, 8, 'rgba(28,18,10,0.22)');
    rr(960 - bw / 2, 118, bw, sub ? 86 : 58, 8, C('#283d63'));
    text(title, 960, sub ? 146 : 148, 34, '#f6ecd6', 'Rockwell', 'center', 800);
    if (sub) text(sub, 960, 182, 24, '#d9c9a8', 'Rockwell', 'center', 700);
  }
}

function drawMapRiver(pts, w = 28) {
  if (!pts || pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); curve(pts, false);
  g.strokeStyle = C('#5b9cb8'); g.lineWidth = w + 8; g.stroke();
  g.beginPath(); curve(pts, false);
  g.strokeStyle = C('#7cc0dc'); g.lineWidth = w; g.stroke();
  g.restore();
}

function drawMapRidge(pts, w = 44) {
  if (!pts || pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); curve(pts, false);
  g.strokeStyle = C('#c7b289'); g.lineWidth = w + 16; g.stroke();
  g.beginPath(); curve(pts, false);
  g.strokeStyle = C('#d9c7a0'); g.lineWidth = w; g.stroke();
  // Hachure ticks along crest
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
    limb(mx - Math.cos(ang) * (w * 0.45), my - Math.sin(ang) * (w * 0.45),
         mx + Math.cos(ang) * (w * 0.45), my + Math.sin(ang) * (w * 0.45), 2.5, 1.5, C('#a8926a'));
  }
  g.restore();
}

// ---- 10. Twin-Lens Brass Spyglass Matte & Atmospheric Helpers --------------
function drawSpyglassPOV(insideFn, headerTxt = '', rLens = 285, sep = 215) {
  g.fillStyle = '#141118'; g.fillRect(0, 0, W, H);
  const cxL = W / 2 - sep, cxR = W / 2 + sep, cy = H / 2 + 8;

  g.save();
  g.beginPath();
  g.arc(cxL, cy, rLens, 0, Math.PI * 2);
  g.arc(cxR, cy, rLens, 0, Math.PI * 2);
  g.clip();
  insideFn();
  // Subtle optical crosshairs inside twin lenses
  g.strokeStyle = 'rgba(38,32,44,0.34)'; g.lineWidth = 2;
  for (const lx of [cxL, cxR]) {
    g.beginPath(); g.moveTo(lx - 26, cy); g.lineTo(lx + 26, cy); g.stroke();
    g.beginPath(); g.moveTo(lx, cy - 26); g.lineTo(lx, cy + 26); g.stroke();
  }
  g.restore();

  // Outer vignette cutout + warm brass binocular rim (even-odd mask so center stays merged!)
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cxL, cy, rLens, 0, Math.PI * 2, true);
  g.closePath();
  g.clip('evenodd');
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cxR, cy, rLens, 0, Math.PI * 2, true);
  g.closePath();
  g.fillStyle = '#141118';
  g.fill('evenodd');
  g.restore();

  // Clean brass outer rim where the two circles don't overlap
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cxL, cy, rLens - 2, 0, Math.PI * 2, true);
  g.clip('evenodd');
  g.beginPath(); g.arc(cxR, cy, rLens + 5, 0, Math.PI * 2);
  g.strokeStyle = C('#b8923b'); g.lineWidth = 10; g.stroke();
  g.restore();

  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cxR, cy, rLens - 2, 0, Math.PI * 2, true);
  g.clip('evenodd');
  g.beginPath(); g.arc(cxL, cy, rLens + 5, 0, Math.PI * 2);
  g.strokeStyle = C('#b8923b'); g.lineWidth = 10; g.stroke();
  g.restore();

  if (headerTxt) {
    text(headerTxt, W / 2, cy - rLens - 46, 30, '#e8dec8', 'Rockwell', 'center', 800);
  }
}

function glint(x, y, r, rot = 0, alpha = 1, col = '#fffdf2') {
  if (alpha <= 0.01 || r <= 0.5) return;
  g.save(); g.globalAlpha = clamp(alpha); g.translate(x, y); g.rotate(rot);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, len = k % 2 === 0 ? r : r * 0.62;
    limb(-Math.cos(a) * len, -Math.sin(a) * len, Math.cos(a) * len, Math.sin(a) * len, r * 0.16, 1.2, col);
  }
  ell(0, 0, r * 0.24, r * 0.24, '#ffffff');
  g.restore();
}

function windGrass(seed, n, x0, x1, yFn, dy, col, t = _CUR_T, s = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = yFn(x) + 10 + r() * dy, k = (0.7 + r() * 0.75) * s;
    const sway = Math.sin(t * 2.3 + i * 0.7) * 11 * k + 6 * k;
    limb(x, y, x - 8 * k + sway, y - 32 * k, 4 * k, 1, C(col));
    limb(x + 4 * k, y, x + 4 * k + sway * 1.15, y - 40 * k, 3.8 * k, 1, C(col));
    limb(x + 10 * k, y, x + 15 * k + sway * 0.85, y - 26 * k, 3.5 * k, 1, C(col));
  }
}

// Legacy compatibility helpers
function perspRoom(wall, wain, floor, rail, vx = 960, vy = 620, hy = 720) {
  g.fillStyle = C(wall); g.fillRect(-300, -200, W + 600, hy + 200);
  g.fillStyle = C(wain); g.fillRect(-300, hy - 140, W + 600, 145);
  rr(-300, hy - 146, W + 600, 14, 0, C(rail));
  g.fillStyle = C(floor); g.fillRect(-300, hy, W + 600, H - hy + 300);
}
function perspTrail(p, vx = 960, vy = 700, y = 760) {
  return ground(p, y + 60);
}
