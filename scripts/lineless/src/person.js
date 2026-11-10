// person.js — figure on foot. Origin = ground between the feet, facing right. Shares upper() with the rider.
// o: everything upper() takes, plus {kit, skin, hair, ph, walk:0..1, lean, hand:[x,y], hand2:[x,y]} (hands in figure space)
const HIP = 172;
function footLeg(hx, ph, walk, pants, boot) {
  const a = Math.sin(ph) * 0.42 * walk, bend = Math.max(0, Math.cos(ph)) * 0.7 * walk;
  const kx = hx + Math.sin(a) * 84, ky = Math.cos(a) * 84;
  const fx = kx + Math.sin(a - bend) * 84, fy = ky + Math.cos(a - bend) * 84;
  limb(hx, 0, kx, ky, 30, 23, pants); limb(kx, ky, fx, fy, 22, 18, pants);
  limb(lerp(kx, fx, 0.6), lerp(ky, fy, 0.6), fx, fy, 19, 19, boot); limb(fx - 2, fy + 2, fx + 30, fy + 3, 14, 10, boot);
}
function person(o) {
  const k = kitOf(o), ph = o.ph || 0, walk = o.walk || 0, c = n => C(k[n]);
  g.globalAlpha = 0.2; ell(6, 6, 78, 11, C('#1d1226')); g.globalAlpha = 1;          // contact shadow
  g.save(); g.translate(0, -HIP - 4 - Math.abs(Math.sin(ph)) * 7 * walk + Math.sin(ph * 2) * 1.5 * (1 - walk));
  footLeg(-6, ph + Math.PI, walk, C(mix(k.pants, '#1d1226', 0.22)), c('boot'));      // far leg, darker
  footLeg(8, ph, walk, c('pants'), c('boot'));
  g.rotate(o.lean || 0);
  const sw = Math.sin(ph) * 26 * walk;                                               // arms swing against the legs
  const hand = o.hand ? [o.hand[0], o.hand[1] + HIP] : [34 - sw, 2];
  const far = o.hand2 ? [o.hand2[0], o.hand2[1] + HIP] : [-4 + sw, 0];
  const h = upper({ ...o, hand2: far }, k, ph, hand[0], hand[1]);
  g.restore();
  return { hand: [h[0], h[1] - HIP] };
}
function standing(x, y, s, o, flip = false) { let r; at(x, y, s, () => { r = person(o); }, 0, flip); return r; }
