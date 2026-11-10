// rider.js — seated rider on the horse's local frame (seat at -15,-292), plus mounted() = horse + rider + reins.
// o: everything upper() takes, plus {kit, hand:[x,y] in horse space, lean, skin, hair, ph}
function rider(o) {
  const k = kitOf(o), ph = o.ph || 0, c = n => C(k[n]);
  g.save(); g.translate(0, Math.sin(ph * 2 + 1) * 4 + Math.sin(ph * 2 + 2.2) * 3);
  limb(-15, -290, 40, -262, 30, 24, c('pants')); limb(40, -262, 48, -176, 22, 17, c('pants'));   // near leg
  if (k.trim === 'buttons') limb(46, -256, 53, -184, 3, 3, C(GOLD));
  limb(48, -176, 48, -150, 18, 18, c('boot')); limb(46, -146, 80, -144, 13, 10, c('boot'));
  g.translate(-15, -292); g.rotate(o.lean || 0);
  const hx = (o.hand ? o.hand[0] : 95) + 15, hy = (o.hand ? o.hand[1] : -312) + 292;
  upper(o, k, ph, hx, hy);
  g.restore();
  return { hand: [hx - 15, hy - 292] };
}

function mounted(x, y, s, o, flip = false) {
  at(x, y, s, () => {
    const h = horse(o), r = rider(o);
    if (!o.noReins) { g.beginPath(); g.moveTo(r.hand[0], r.hand[1] + 4); g.quadraticCurveTo((r.hand[0] + h.mouth[0]) / 2, h.mouth[1] + 40, h.mouth[0], h.mouth[1]); g.strokeStyle = C('#3a2218'); g.lineWidth = 5; g.stroke(); }
  }, 0, flip);
}
