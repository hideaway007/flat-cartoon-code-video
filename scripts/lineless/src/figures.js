// figures.js — colour plumbing (C, TINT, DEAD), horse coats, detailed historical costume kits, IK, and multi-beat acting.
let DEAD = 0; // 0..1 global desaturation for the "will be dead" solemn beat
const _cc = new Map();
let TINT = null; // [colour, amount] — scene atmospheric light folded into palette
function C(c) {
  if (Array.isArray(c)) c = c[0];
  if (!c || typeof c !== 'string' || c[0] !== '#') return c || '#888888';
  const q = Math.round(DEAD * 20);
  if (!q && !TINT) return c;
  const k = c + q + (TINT ? TINT[0] + TINT[1] : ''); let v = _cc.get(k);
  if (!v) { v = TINT ? mix(c, TINT[0], TINT[1]) : c; if (q) v = grey(v, q / 20); _cc.set(k, v); }
  return v;
}
const INK = '#2a2230';

const COAT = {
  chestnut: { b: '#b9592c', s: '#8e3f22', m: '#4f2618', h: '#33201c' },
  sorrel:   { b: '#b9592c', s: '#8e3f22', m: '#4f2618', h: '#33201c' },
  bay:      { b: '#6b3f2c', s: '#4c2b21', m: '#241718', h: '#1c1416' },
  brown:    { b: '#6b3f2c', s: '#4c2b21', m: '#241718', h: '#1c1416' },
  buck:     { b: '#cfa160', s: '#a67a44', m: '#4a3324', h: '#33241c' },
  dun:      { b: '#cfa160', s: '#a67a44', m: '#4a3324', h: '#33241c' },
  grey:     { b: '#8d8a92', s: '#6a6772', m: '#3d3a45', h: '#2a2830' },
  black:    { b: '#3d3942', s: '#2b2830', m: '#1c1920', h: '#141218' },
};

// Detailed historical costume kits (tailored silhouettes, lapels, shirts, fringes, aprons, vests)
const KIT = {
  custer: {
    trim: 'fringe', coat: '#d9b377', coatSh: '#b48a52', shirt: '#23395d',
    pants: '#5878a0', pantsSh: '#3f5a7d', hat: '#ead9b0', hatSh: '#c9b384', band: '#6e4e32',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#e2a93b', hairSh: '#b57b1e',
    scarf: '#d8352a', scarfSh: '#a62219', boot: '#2e2328', bootSh: '#1e161a',
  },
  custer_dress: {
    trim: 'buttons', coat: '#243b63', coatSh: '#172744', shirt: '#f5efe4',
    pants: '#4c6d96', pantsSh: '#375275', hat: '#ead9b0', hatSh: '#c9b384', band: '#c9a23f',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#e2a93b', hairSh: '#b57b1e',
    scarf: '#d8352a', scarfSh: '#a62219', boot: '#241d22', bootSh: '#161115',
  },
  trooper: {
    trim: 'buttons', coat: '#34507e', coatSh: '#243a60', shirt: '#e6dfd3',
    pants: '#6f8fb5', pantsSh: '#516f94', hat: '#2b2a35', hatSh: '#1d1c26', band: '#c9a23f',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#4a3324', hairSh: '#332116',
    scarf: '#c9a23f', boot: '#231c22', bootSh: '#161116',
  },
  scout: {
    trim: 'fringe', coat: '#9e7449', coatSh: '#7a5632', shirt: '#3a4a5e',
    pants: '#54463c', pantsSh: '#3d322a', hat: '#4f3b2b', hatSh: '#38281c', band: '#8c6239',
    skin: '#d4956a', skinSh: '#b3744c', hair: '#2a2024', hairSh: '#1a1417',
    scarf: '#b87638', boot: '#3b2b20', bootSh: '#291d15',
  },
  plain: {
    trim: 'suit', coat: '#8a6b52', coatSh: '#6a4f3c', shirt: '#f2ece0', tie: '#3b302a',
    pants: '#4a4652', pantsSh: '#35323b', hat: '#5a4636', hatSh: '#40301f', band: '#2e2328',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#4a3324', hairSh: '#332116',
    boot: '#2e2328', bootSh: '#1e161a',
  },
  lakota: {
    trim: 'native', coat: '#4c6882', coatSh: '#364d63', blanket: '#8c5332',
    pants: '#59463a', pantsSh: '#403128', hat: '#8c5332', hatSh: '#6b3d22', band: '#3f7687',
    skin: '#c98860', skinSh: '#a66843', hair: '#1f191c', hairSh: '#120e10',
    scarf: '#3f7687', boot: '#6e5239', bootSh: '#523b28',
  },
  cheyenne: {
    trim: 'native', coat: '#3b5472', coatSh: '#283c54', blanket: '#9c6239',
    pants: '#5e4432', pantsSh: '#453022', hat: '#7a482a', hatSh: '#5c341d', band: '#d4a64a',
    skin: '#cf9068', skinSh: '#aa6f4a', hair: '#1f191c', hairSh: '#120e10',
    scarf: '#d4a64a', boot: '#6b4f37', bootSh: '#4f3926',
  },
  warrior: {
    trim: 'fringe', coat: '#b07648', coatSh: '#8a5830', shirt: '#3f5c6e',
    pants: '#574134', pantsSh: '#3d2d23', hat: '#6b4228', hatSh: '#4f2f1b', band: '#c9a23f',
    skin: '#c28058', skinSh: '#9e623e', hair: '#1c171a', hairSh: '#100d0f',
    boot: '#5c422c', bootSh: '#422e1e',
  },
  bartender: {
    trim: 'apron', coat: '#f2ead8', coatSh: '#d6cbb4', shirt: '#ffffff',
    pants: '#3d3430', pantsSh: '#29221f', hat: 'none', band: '#8c694a',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#3b281e', hairSh: '#261912',
    boot: '#261e1b', bootSh: '#171210',
  },
  patron: {
    trim: 'vest', coat: '#7a5a42', coatSh: '#5c412e', shirt: '#dfd3be',
    pants: '#3d3942', pantsSh: '#2b2830', hat: '#4b392a', hatSh: '#33251a', band: '#8a6b48',
    skin: '#e6a982', skinSh: '#c58762', hair: '#4a3324', hairSh: '#332116',
    scarf: '#997443', boot: '#251e1c', bootSh: '#171211',
  },
  arch: {
    trim: 'vest', coat: '#7896ab', coatSh: '#5a768a', vestCol: '#c4b084', vestSh: '#a38f65',
    pants: '#495c73', pantsSh: '#354457', hat: '#dfd0ab', hatSh: '#bfb088', band: '#5c4934',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#4a3324', hairSh: '#332116',
    boot: '#4a3828', bootSh: '#33261a',
  },
  clerk: {
    trim: 'suit', coat: '#4e544b', coatSh: '#383d36', shirt: '#f5efe4', tie: '#2c3038',
    pants: '#3c3942', pantsSh: '#2a282e', hat: 'none', band: '#2e2328',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#9c9690', hairSh: '#75706b',
    boot: '#262024', bootSh: '#171316',
  },
  senator: {
    trim: 'suit', coat: '#3d3942', coatSh: '#29262e', shirt: '#f5f1e8', tie: '#4a3c52',
    pants: '#45414a', pantsSh: '#312e36', hat: 'none', band: '#2e2328',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#aeb3bd', hairSh: '#848a96',
    boot: '#221e24', bootSh: '#161318',
  },
  cadet: {
    trim: 'cadet', coat: '#858d96', coatSh: '#676f78',
    pants: '#6e7680', pantsSh: '#535a63', hat: '#282732', hatSh: '#1a1922', band: '#c9a23f',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#e2a93b', hairSh: '#b57b1e',
    boot: '#221d24', bootSh: '#151217',
  },
  officer: {
    trim: 'buttons', coat: '#283d63', coatSh: '#1b2b48', shirt: '#f2ece0',
    pants: '#4d688f', pantsSh: '#374d6e', hat: '#23222c', hatSh: '#16151d', band: '#c9a23f',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#9e9892', hairSh: '#78736e',
    scarf: '#c9a23f', boot: '#211b20', bootSh: '#141014',
  },
  grant: {
    trim: 'suit', coat: '#262a36', coatSh: '#181b24', shirt: '#f7f4ec', tie: '#181a22',
    pants: '#323746', pantsSh: '#222632', hat: 'none', band: '#c9a23f',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#5c4230', hairSh: '#3f2c1f',
    boot: '#1c181c', bootSh: '#110e11',
  },
  terry: {
    trim: 'buttons', coat: '#243a5e', coatSh: '#172742', shirt: '#f4efe4',
    pants: '#4a668c', pantsSh: '#354c6b', hat: '#262530', hatSh: '#181720', band: '#c9a23f',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#9aa0ab', hairSh: '#737985',
    scarf: '#c9a23f', boot: '#211b20', bootSh: '#141014',
  },
  crook: {
    trim: 'vest', coat: '#7d684d', coatSh: '#614f38', vestCol: '#b8a47e', vestSh: '#96835f',
    pants: '#4d463f', pantsSh: '#38322c', hat: '#dfd0ab', hatSh: '#bfb088', band: '#5c4934',
    skin: '#e6a982', skinSh: '#c58762', hair: '#6e5239', hairSh: '#4f3a27',
    boot: '#332820', bootSh: '#211914',
  },
  miner: {
    trim: 'vest', coat: '#9c5238', coatSh: '#783c26', vestCol: '#6e5844', vestSh: '#524030',
    pants: '#4a5668', pantsSh: '#353f4d', hat: '#594433', hatSh: '#3d2e22', band: '#2e2328',
    skin: '#e6a982', skinSh: '#c58762', hair: '#4a3324', hairSh: '#332116',
    boot: '#2b221c', bootSh: '#1c1612',
  },
  libbie: {
    trim: 'suit', coat: '#322b3b', coatSh: '#211c28', shirt: '#f5efe6', tie: '#5c4b68',
    pants: '#2b2433', pantsSh: '#1d1824', hat: 'none', band: '#5c4b68',
    skin: '#f3c6a2', skinSh: '#d9a17c', hair: '#593a27', hairSh: '#3d2619',
    boot: '#1f1a24', bootSh: '#131017',
  },
  reno: {
    trim: 'buttons', coat: '#263f6b', coatSh: '#182b4d', shirt: '#f0eae0',
    pants: '#5878a0', pantsSh: '#3f5a7d', hat: '#262530', hatSh: '#181720', band: '#c9a23f',
    skin: '#e8ad84', skinSh: '#c98a64', hair: '#3b2b22', hairSh: '#261b15',
    scarf: '#c9a23f', boot: '#221c21', bootSh: '#151115',
  },
  benteen: {
    trim: 'buttons', coat: '#2b4470', coatSh: '#1c2f52', shirt: '#f0eae0',
    pants: '#5878a0', pantsSh: '#3f5a7d', hat: '#4a3a2c', hatSh: '#33271d', band: '#c9a23f',
    skin: '#f0b98f', skinSh: '#d4946c', hair: '#aeb3bd', hairSh: '#848a96',
    scarf: '#3f5a7d', boot: '#221c21', bootSh: '#151115',
  },
};

function ik(sx, sy, hx, hy, l1, l2, dir = 1) {
  const dx = hx - sx, dy = hy - sy, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 0.5);
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [sx + Math.cos(a + dir * b) * l1, sy + Math.sin(a + dir * b) * l1, sx + Math.cos(a) * d, sy + Math.sin(a) * d];
}

// Expression presets tuned for the classic soft eye + rounded head aesthetic
const EX = {
  smug:     { eyes: 'open', lid: 0.30, brow: 0.65, mouth: 'grin', tilt: -0.07 },
  cocky:    { eyes: 'open', lid: 0.26, brow: 0.75, mouth: 'smirk', tilt: -0.09 },
  charge:   { eyes: 'wide', brow: -0.85, mouth: 'shout', lean: 0.14, tilt: -0.05 },
  panic:    { eyes: 'pin', brow: 0.90, mouth: 'jaw', sweat: 1, shiver: 0.5, lean: -0.10, tilt: 0.07 },
  shock:    { eyes: 'pin', brow: 0.85, mouth: 'shout', shockLines: 1, sweat: 0.7, lean: -0.09 },
  grit:     { eyes: 'squint', brow: -0.85, mouth: 'grit', sweat: 0.5 },
  furious:  { eyes: 'squint', brow: -0.95, mouth: 'shout', steam: 1, shiver: 0.35, lean: 0.12 },
  laugh:    { eyes: 'laugh', brow: 0.55, mouth: 'grin', blush: 0.5, tilt: -0.08 },
  eyeroll:  { eyes: 'roll', lid: 0.36, brow: 0.45, mouth: 'frown', tilt: 0.05 },
  dread:    { eyes: 'pin', brow: 0.75, mouth: 'wobble', pale: 0.7, sweat: 1, shiver: 0.4 },
  gloom:    { eyes: 'open', lid: 0.54, brow: 0.65, mouth: 'frown', pale: 0.45, lean: 0.12, tilt: 0.10 },
  solemn:   { eyes: 'open', lid: 0.18, brow: -0.20, mouth: 'frown' },
  starry:   { eyes: 'wide', brow: 0.65, mouth: 'grin', blush: 0.4, tilt: -0.08 },
  beg:      { eyes: 'teary', brow: 0.90, mouth: 'plead', sweat: 0.6, shiver: 0.35, tilt: -0.08 },
  skeptic:  { eyes: 'skeptical', brow: 0.55, mouth: 'frown', tilt: 0.05 },
  innocent: { eyes: 'roll', brow: 0.70, mouth: 'whistle', blush: 0.6, tilt: -0.09 },
  haughty:  { eyes: 'shut', brow: 0.75, mouth: 'scoff', tilt: -0.14, stance: 'strut' },
  exhausted:{ eyes: 'bags', lid: 0.46, brow: 0.50, mouth: 'wobble', sweat: 0.85 },
};

// Multi-beat pose keyframe helper with natural secondary breathing (no high-frequency jitter!)
let _T = 0;
const _NUM_KEYS = ['lean', 'tilt', 'look', 'lookY', 'brow', 'lid', 'jump', 'sweat', 'pale', 'blush', 'steam',
  'shockLines', 'shiver', 'walk', 'nod', 'squash', 'rear', 'tired', 'emptyPockets', 'hatLift'];
function act(t, beats, defaultDur = 0.42) {
  _T = t;
  let cur = { ...beats[0][1] }, sq = 0;
  for (let i = 1; i < beats.length; i++) {
    const [t0, target, dOpt] = beats[i], dur = dOpt || defaultDur;
    if (t < t0) break;
    const raw = prog(t, t0, t0 + dur), p = back(raw);
    const next = { ...cur, ...target };
    for (const k of _NUM_KEYS) {
      if (cur[k] != null || target[k] != null) next[k] = lerp(cur[k] || 0, target[k] ?? (cur[k] || 0), p);
    }
    for (const hk of ['hand', 'hand2']) {
      if (cur[hk] && target[hk]) next[hk] = [lerp(cur[hk][0], target[hk][0], p), lerp(cur[hk][1], target[hk][1], p)];
    }
    for (const sk of ['eyes', 'mouth', 'prop', 'prop2', 'handKind', 'hand2Kind', 'noReins', 'stance', 'view']) {
      if (target[sk] !== undefined) next[sk] = raw < 0.25 && cur[sk] !== undefined ? cur[sk] : target[sk];
    }
    if (raw > 0 && raw < 1) {
      const amp = target.amp ?? 0.20;
      sq += Math.sin(raw * Math.PI * 2) * amp * (1 - raw * 0.5);
    }
    cur = next;
  }
  // Calm organic breathing between beats
  const w1 = Math.sin(t * 3.2), w2 = Math.cos(t * 2.7);
  cur.squash = (cur.squash || 0) + sq + Math.sin(t * 3.0) * 0.018;
  cur.lean = (cur.lean || 0) + w1 * 0.018;
  cur.tilt = (cur.tilt || 0) + w2 * 0.020;
  if (cur.hand) cur.hand = [cur.hand[0] + w1 * 5, cur.hand[1] + w2 * 6];
  if (cur.hand2) cur.hand2 = [cur.hand2[0] - w2 * 4, cur.hand2[1] + w1 * 5];
  return cur;
}
