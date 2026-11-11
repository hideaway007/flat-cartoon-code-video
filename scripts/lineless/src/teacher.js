// teacher.js — Style 2 classical plaster/marble bust teacher.
// Matches body.js's exact rounded-capsule head, soft #fffaf0 + INK eyes, brow/mouth vocabulary,
// and human 1:1 scale (~150px wide, ~355px tall from plinth base y=0 to crown), with both
// 3/4 view (default, view: 'side') and deadpan fourth-wall view (view: 'front').

const MARBLE = {
  b: '#f2ece1',      // warm museum plaster lit plane
  s: '#d9cfc0',      // sculpted limestone shadow plane
  d: '#bfb3a1',      // deep fold / plinth crease
  curl: '#ebe4d7',   // lit plaster curl
  curlSh: '#cfc4b4', // shaded plaster curl
  brow: '#7d7265',   // chiseled stone brow
  leaf: '#668a5c',   // muted classical olive-sage laurel
  leafSh: '#4a6942', // shaded laurel leaf
};

// Optional lectern/pedestal helper for classroom or office corners (top surface at yTop)
function drawTeacherLectern(x, yTop, w = 210, h = 290) {
  g.save();
  // Pedestal column
  form(() => g.roundRect(x - w * 0.42, yTop, w * 0.84, h, 6), C('#8c5a30'), () => {
    g.fillStyle = C('#6b4220');
    g.fillRect(x - w * 0.42, yTop, w * 0.30, h);
    g.fillStyle = C('#754925');
    g.fillRect(x - w * 0.28, yTop + 34, w * 0.56, h - 68);
  });
  // Top tabletop molding
  form(() => g.roundRect(x - w * 0.52, yTop - 22, w * 1.04, 26, 6), C('#a87040'), () => {
    g.fillStyle = C('#7d5029');
    g.fillRect(x - w * 0.52, yTop - 22, w * 0.34, 26);
  });
  rr(x - w * 0.46, yTop + 4, w * 0.92, 8, 2, C('#593518'));
  g.restore();
}

// o: { view: 'side'|'front', mouth: 0..1 | 'smirk'|'frown'|'scoff'|'grin'|'open'|'talk',
//      eyes: 'open'|'skeptical'|'roll'|'squint'|'shut'|'wide',
//      look: -1..1, lookY: -1..1, brow: -1..1, lid: 0..1, tilt, squash, glasses, flip }
function teacher(o = {}) {
  const M = MARBLE;
  const isFront = o.view === 'front';
  const lk = o.look || 0, lkY = o.lookY || 0;
  const lid = o.lid ?? 0.30;
  const sq = o.squash || 0;
  const flipped = !!o.flip;

  g.save();
  if (flipped) g.scale(-1, 1);

  // Subtle contact shadow under plinth base
  if (!o.noShadow) {
    g.save();
    g.globalAlpha = 0.20;
    ell(0, 5, 64, 9, C('#1d1226'));
    g.restore();
  }

  // 1. Classical Turned Plaster Pedestal Plinth (y = 0 .. -56)
  form(() => g.roundRect(-58, -16, 116, 16, 5), C(M.b), () => {
    g.fillStyle = C(M.s); g.fillRect(-58, -16, 44, 16);
  });
  rr(-48, -26, 96, 11, 4, C(M.d));
  form(() => g.roundRect(-34, -50, 68, 25, 4), C(M.s), () => {
    g.fillStyle = C(M.d); g.fillRect(-34, -50, 26, 25);
  });
  form(() => g.roundRect(-52, -60, 104, 12, 5), C(M.b), () => {
    g.fillStyle = C(M.s); g.fillRect(-52, -60, 40, 12);
  });

  // 2. Sculpted Greco-Roman Draped Toga Bust (y = -58 .. -186, width ~148px matching human upper())
  form(() => {
    curve([[-52, -58], [-74, -116], [-62, -172], [0, -184], [62, -172], [74, -116], [52, -58]], true);
  }, C(M.b), () => {
    poly([[-78, -188], [-12, -188], [-18, -54], [-78, -54]], C(M.s));
    // Classical diagonal toga sash & sculpted fold planes
    poly([[-58, -174], [-22, -182], [56, -68], [16, -58]], C(M.s));
    limb(-42, -174, 38, -62, 5, 4, C(M.d));
    limb(-26, -178, 50, -72, 4, 3, C('#faf6ee'));
  });

  // Collar / neck bridge
  rr(isFront ? -18 : -12, -202, 36, 24, 7, C(M.s));

  // Signature Red 'F' Grading Lapel Badge (auto-unflipped so 'F' always reads forward!)
  const bx = isFront ? 38 : 34, by = -118;
  g.save();
  g.translate(bx, by);
  if (flipped) g.scale(-1, 1);
  g.rotate(flipped ? -0.14 : 0.14);
  rr(-18, -18, 36, 36, 5, '#d8352a');
  rr(-14, -14, 28, 28, 3, '#f6ecd6');
  text('F', 0, 2, 25, '#d8352a', 'Futura', 'center', 800);
  g.restore();

  // 3. Classic Style 2 Rounded Capsule Head (exact 1.42x proportion from body.js!)
  g.save();
  g.translate(isFront ? 0 : 8, -188);
  g.rotate(o.tilt || 0);
  g.scale(1.42 * (1 - sq * 0.16), 1.42 * (1 + sq * 0.20));

  // Back plaster curls behind head silhouette (above ear line so ears read cleanly!)
  if (isFront) {
    [[-46, -84, 16], [-51, -66, 15], [46, -84, 16], [51, -66, 15]]
      .forEach(([cx, cy, cr]) => ell(cx, cy, cr, cr, C(cx < 0 ? M.curlSh : M.curl)));
  } else {
    [[-40, -82, 18], [-48, -58, 18], [-50, -34, 16], [-42, -12, 14]]
      .forEach(([cx, cy, cr]) => ell(cx, cy, cr, cr, C(M.curlSh)));
  }

  // Head capsule + cute button nose (100% matching body.js!)
  if (isFront) {
    ell(-54, -44, 9, 13, C(M.s));
    ell(54, -44, 9, 13, C(M.b));
    form(() => { g.roundRect(-52, -106, 104, 112, [52, 52, 46, 46]); }, C(M.b), () => {
      ell(-48, -40, 38, 76, C(M.s));
    });
    ell(0, -40, 9.5, 7.5, C(M.s));
  } else {
    form(() => {
      g.roundRect(-48, -106, 104, 112, [52, 52, 46, 46]);
      g.ellipse(58, -42, 12, 10, 0, 0, Math.PI * 2);
    }, C(M.b), () => {
      ell(-46, -40, 42, 76, C(M.s));
    });
    ell(-8, -44, 9, 13, C(M.s));
  }

  // Sculpted Greco-Roman Forehead Curls (hugging top contour neatly)
  const crownCurls = isFront
    ? [[-36, -98, 15, M.curlSh], [-18, -105, 16, M.curlSh], [0, -107, 16, M.curl], [18, -105, 16, M.curl], [36, -98, 15, M.curl]]
    : [[-28, -98, 16, M.curlSh], [-8, -105, 17, M.curl], [14, -106, 16, M.curl], [34, -100, 15, M.curl]];
  crownCurls.forEach(([cx, cy, cr, col]) => {
    ell(cx, cy + 3, cr, cr * 0.92, C(M.d));
    ell(cx, cy, cr, cr * 0.92, C(col));
  });

  // Low-profile Classical Olive-Sage Laurel Wreath (tucked cleanly along the curls, never spiky!)
  if (isFront) {
    [-1, 1].forEach(sd => {
      for (let i = 0; i < 4; i++) {
        const lx = sd * (50 - i * 9), ly = -64 - i * 12;
        const rot = sd * (-0.55 + i * 0.18);
        ell(lx, ly, 12, 5.2, C(sd < 0 || i % 2 ? M.leafSh : M.leaf), rot);
      }
    });
  } else {
    const leaves = [
      [-36, -68, -0.45, M.leafSh],
      [-24, -80, -0.35, M.leaf],
      [-8, -90, -0.22, M.leafSh],
      [10, -96, -0.10, M.leaf],
      [28, -96, 0.05, M.leafSh],
    ];
    leaves.forEach(([lx, ly, rot, col]) => ell(lx, ly, 13, 5.4, C(col), rot));
  }

  // Soft Style 2 Eyes (warm #fffaf0 sclera + INK pupil via body.js eye()!)
  const ey = -56, br = o.brow || 0;
  const eyeMode = o.eyes || 'open';
  if (eyeMode === 'shut') {
    if (isFront) {
      limb(-28, ey + 2, -10, ey + 2, 3.5, 3.5, C(INK));
      limb(10, ey + 2, 28, ey + 2, 3.5, 3.5, C(INK));
    } else {
      limb(10, ey, 28, ey + 3, 3.5, 3.5, C(INK));
      limb(36, ey + 3, 52, ey, 3.5, 3.5, C(INK));
    }
  } else if (isFront) {
    eye(-19, ey, 10, 12.5, lk, lid, C(M.s), eyeMode, false, lkY);
    eye(19, ey, 10, 12.5, lk, lid, C(M.s), eyeMode, false, lkY);
  } else {
    eye(19, ey, 10, 12.5, lk, lid, C(M.s), eyeMode, false, lkY);
    eye(44, ey, 9, 12.5, lk, lid, C(M.s), eyeMode, true, lkY);
  }

  // Expressive Teacher Brows (tucked cleanly inside forehead contour!)
  if (isFront) {
    limb(-31, ey - 18 + br * 4, -9, ey - 20 - br * 2, 4.4, 4.8, C(M.brow));
    limb(9, ey - 20 - br * 9, 31, ey - 19 - br * 11, 4.8, 4.4, C(M.brow));
  } else {
    limb(6, ey - 19 + br * 3, 28, ey - 20 - br * 3, 4.6, 4.2, C(M.brow));
    limb(34, ey - 21 - br * 9, 51, ey - 20 - br * 10, 4.2, 4.6, C(M.brow));
  }

  // Optional wire-rim reading spectacles (for dry grading beats!)
  if (o.glasses) {
    g.save();
    g.strokeStyle = C('#5c4a32');
    g.lineWidth = 2.4;
    if (isFront) {
      g.beginPath(); g.ellipse(-19, ey + 3, 13, 10, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(19, ey + 3, 13, 10, 0, 0, Math.PI * 2); g.stroke();
      limb(-6, ey + 2, 6, ey + 2, 2.2, 2.2, C('#5c4a32'));
    } else {
      g.beginPath(); g.ellipse(19, ey + 3, 12.5, 9.5, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(44, ey + 3, 11, 9.5, 0, 0, Math.PI * 2); g.stroke();
      limb(31, ey + 2, 34, ey + 2, 2.2, 2.2, C('#5c4a32'));
      limb(-4, ey - 1, 7, ey + 2, 2.0, 2.0, C('#5c4a32'));
    }
    g.restore();
  }

  // Style 2 Mouths (auto-gated to exact words.json syllable envelope when _WORDS is loaded!)
  const mc = C('#5e1f22'), teeth = C('#fffaf0'), tongue = C('#d96862');
  const mx = isFront ? 0 : 36;
  const useGate = o.autoGate !== false && typeof speechOpen === 'function' && _WORDS.length > 0;
  const gateVal = useGate ? speechOpen(o.t ?? (_T || _CUR_T)) : 1;
  const m = o.mouth;
  if (typeof m === 'number') {
    const effM = useGate ? (m > 0.09 ? gateVal : m) : m;
    if (effM < 0.10) {
      // Dry deadpan teacher smirk / slight unimpressed line
      g.beginPath();
      g.moveTo(mx - 14, -12);
      g.quadraticCurveTo(mx, -11, mx + 14, -16);
      g.strokeStyle = C('#73675b');
      g.lineWidth = 3.6;
      g.lineCap = 'round';
      g.stroke();
    } else {
      const oh = 4 + clamp(effM) * 13;
      form(() => g.roundRect(mx - 15, -20, 30, oh + 8, 7), mc, () => {
        g.fillStyle = teeth; g.fillRect(mx - 15, -20, 30, 5.5);
        ell(mx, -12 + oh, 10, 5.5, tongue);
      });
    }
  } else if (m === 'smirk') {
    g.beginPath(); g.moveTo(mx - 15, -11); g.quadraticCurveTo(mx, -10, mx + 15, -19);
    g.strokeStyle = C('#73675b'); g.lineWidth = 3.8; g.lineCap = 'round'; g.stroke();
  } else if (m === 'scoff' || m === 'frown') {
    g.beginPath(); g.moveTo(mx - 14, -10); g.quadraticCurveTo(mx, -17, mx + 14, -11);
    g.strokeStyle = C('#73675b'); g.lineWidth = 3.8; g.lineCap = 'round'; g.stroke();
  } else if (m === 'grin') {
    form(() => { g.moveTo(mx - 18, -17); g.quadraticCurveTo(mx, -13, mx + 18, -18); g.quadraticCurveTo(mx + 2, 4, mx - 18, -17); }, teeth, null);
  } else if (m === 'open' || m === 'talk') {
    const oh = m === 'talk' ? 5 + Math.abs(Math.sin((_T || 0) * 9.5)) * 8 : 10;
    ell(mx, -12, 9.5, oh, mc);
  } else {
    g.beginPath(); g.moveTo(mx - 13, -13); g.quadraticCurveTo(mx, -12, mx + 13, -15);
    g.strokeStyle = C('#73675b'); g.lineWidth = 3.5; g.lineCap = 'round'; g.stroke();
  }

  g.restore(); // head
  g.restore(); // flip
}

function teacherAt(x, y, s, o = {}, flip = false) {
  at(x, y, s, () => teacher({ ...o, flip }));
}
