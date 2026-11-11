// person.js — figure on foot supporting 3 views ('side' 3/4, 'front', and 'back' true rear OTS)
// and full-body stances ('stand'|'strut'|'lunge'|'kneel'|'crouch'|'recoil'|'leap'|'sit').
const HIP = 176;

function footLeg(hx, ph, walk, pants, boot, a1Off = 0, bendOff = 0, toeDir = 28) {
  const a = Math.sin(ph) * 0.42 * walk + a1Off;
  const bend = Math.max(0, Math.cos(ph)) * 0.68 * walk + bendOff;
  const kx = hx + Math.sin(a) * 86, ky = Math.cos(a) * 86;
  const fx = kx + Math.sin(a - bend) * 86, fy = ky + Math.cos(a - bend) * 86;
  limb(hx, 0, kx, ky, 28, 21, pants);
  limb(kx, ky, fx, fy, 21, 17, pants);
  limb(lerp(kx, fx, 0.48), lerp(ky, fy, 0.48), fx, fy, 19, 17.5, boot);
  limb(fx - 3, fy + 2, fx + toeDir, fy + 3, 13.5, 10, boot);
}

// True Rear-View Lineless OTS Figure (broad tailored coat back, collar, ears, hair nape, slouch/kepi/headband back!)
function standingBack(x, y, s, o = {}) {
  const k = kitOf(o), c = n => C(k[n]);
  const ph = o.ph ?? (_T * 4.2 + x * 0.01);
  const breathe = Math.sin(ph * 0.6) * 3;
  at(x, y + breathe, s, () => {
    form(() => {
      curve([[-124, 120], [-116, -84], [-50, -118], [50, -118], [116, -84], [124, 120]], true);
    }, c('coat'), () => {
      poly([[-132, -125], [-8, -125], [-16, 125], [-132, 125]], c('coatSh'));
    });
    limb(0, -112, 0, 110, 2.5, 2.5, C(mix(k.coatSh, '#120e18', 0.28)));
    rr(-42, -124, 84, 13, 5, C('#ece6da'));
    if (k.trim === 'buttons') {
      rr(-108, -104, 50, 13, 4, C(GOLD_SH));
      rr(58, -104, 50, 13, 4, C(GOLD));
    } else if (k.trim === 'fringe') {
      fringe(-105, -62, 105, -62, 13, 18, c('coatSh'));
    }

    // Neck + Ears + Classic Rounded Back-of-Head!
    rr(-24, -152, 48, 32, 8, c('skinSh'));
    ell(-66, -196, 11, 17, c('skinSh'));
    ell(66, -196, 11, 17, c('skin'));
    form(() => g.roundRect(-64, -264, 128, 128, [60, 60, 48, 48]), c('hair'), () => {
      poly([[-68, -268], [-6, -268], [-12, -132], [-68, -132]], C(k.hairSh));
    });

    const hatType = o.hat || (k.hat === 'none' ? 'none' : 'slouch');
    if (hatType === 'kepi') {
      form(() => g.ellipse(0, -242, 70, 44, 0, 0, Math.PI * 2), c('hat'), () => {
        poly([[-74, -288], [-4, -288], [-8, -194], [-74, -194]], c('hatSh'));
      });
      rr(-64, -210, 128, 11, 4, C('#16151e'));
      rr(-62, -216, 124, 6, 2, c('band'));
    } else if (hatType !== 'none' && hatType !== 'headband') {
      ell(0, -214, 124, 22, c('hatSh'));
      ell(0, -218, 120, 19, c('hat'));
      form(() => g.roundRect(-52, -282, 104, 68, [34, 34, 6, 6]), c('hat'), () => {
        g.fillStyle = c('hatSh'); g.fillRect(-54, -284, 38, 72);
      });
      rr(-52, -226, 104, 11, 3, c('band'));
    }
  });
}

function person(o, seedX = 0) {
  const k = kitOf(o), ph = o.ph ?? (_T * 5.2 + seedX * 0.015), walk = o.walk || 0;
  const c = n => C(k[n]), st = o.stance || 'stand', isFront = o.view === 'front';
  const jmp = Math.max(0, o.jump || 0);
  const hipDrop = st === 'kneel' ? 78 : st === 'crouch' ? 24 : st === 'lunge' ? 20 : 0;
  const stLean = st === 'strut' ? -0.14 : st === 'lunge' ? 0.17 : st === 'crouch' ? 0.14 :
                 st === 'recoil' ? -0.18 : st === 'kneel' ? 0.12 : 0;

  if (!o.noShadow) {
    g.globalAlpha = 0.20 * clamp(1 - jmp / 140, 0.28, 1);
    ell(4, 6, 76 * clamp(1 - jmp / 220, 0.5, 1), 11, C('#1d1226'));
    g.globalAlpha = 1;
  }

  g.save();
  const idleBob = Math.sin(ph * 0.9) * 3.0 * (1 - walk);
  g.translate(0, -HIP + hipDrop - jmp - Math.abs(Math.sin(ph)) * 10 * walk + idleBob);

  const farPants = C(k.pantsSh), farBoot = C(k.bootSh);
  const kneeSw = Math.sin(ph * 0.9) * 0.03 * (1 - walk);

  if (st === 'kneel') {
    footLeg(-10, 0, 0, farPants, farBoot, -0.20, 1.40, -14);
    footLeg(14, 0, 0, c('pants'), c('boot'), 0.98, 1.06, 26);
  } else if (st === 'leap') {
    footLeg(-14, 0, 0, farPants, farBoot, -0.42, 0.82, 22);
    footLeg(14, 0, 0, c('pants'), c('boot'), 0.56, 0.76, 26);
  } else if (st === 'lunge') {
    footLeg(-10, ph + Math.PI, walk * 0.5, farPants, farBoot, -0.44 + kneeSw, 0.08);
    footLeg(14, ph, walk * 0.5, c('pants'), c('boot'), 0.54 - kneeSw, 0.60);
  } else if (st === 'strut') {
    footLeg(-8, ph + Math.PI, Math.max(walk, 0.18), farPants, farBoot, -0.16, 0.05);
    footLeg(10, ph, Math.max(walk, 0.18), c('pants'), c('boot'), 0.30, 0);
  } else if (st === 'crouch') {
    footLeg(-6, ph + Math.PI, Math.max(walk, 0.14), farPants, farBoot, 0.26, 0.54);
    footLeg(8, ph, Math.max(walk, 0.14), c('pants'), c('boot'), 0.36, 0.58);
  } else if (st === 'recoil') {
    footLeg(-10, 0, 0, farPants, farBoot, -0.24 + kneeSw, 0.34);
    footLeg(12, 0, 0, c('pants'), c('boot'), 0.50 - kneeSw, 0.24);
  } else if (isFront) {
    footLeg(-19, ph + Math.PI, walk, farPants, farBoot, -0.04, 0, -16);
    footLeg(19, ph, walk, c('pants'), c('boot'), 0.04, 0, 16);
  } else {
    footLeg(-7, ph + Math.PI, walk, farPants, farBoot, kneeSw, 0, 28);
    footLeg(9, ph, walk, c('pants'), c('boot'), -kneeSw, 0, 28);
  }

  g.rotate((o.lean || 0) + stLean + Math.sin(ph * 0.8) * 0.016);
  const sw = Math.sin(ph) * 30 * walk + Math.sin(ph * 1.1) * 4 * (1 - walk);
  const hand = o.hand ? [o.hand[0], o.hand[1] + HIP] : (isFront ? [66, -4] : [36 - sw, -2]);
  const far = o.hand2 ? [o.hand2[0], o.hand2[1] + HIP] : (isFront ? [-66, -4] : [-6 + sw, -2]);
  const h = upper({ ...o, ph, hand2: far }, k, ph, hand[0], hand[1]);
  g.restore();
  return { hand: [h[0], h[1] - HIP + hipDrop - jmp] };
}

function standing(x, y, s, o = {}, flip = false) {
  if (o.view === 'back') { standingBack(x, y, s, o); return { hand: [0, 0] }; }
  let r;
  at(x, y, s, () => { r = person(o, x); }, 0, flip);
  return r;
}
