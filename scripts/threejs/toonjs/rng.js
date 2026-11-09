// NumPy SeedSequence + PCG64 (XSL-RR 128/64). Each call starts a fresh generator,
// exactly like np.random.default_rng(seed).uniform(lo, hi, n).
const INIT_A = 0x43b0d7e5, MULT_A = 0x931e8875;
const INIT_B = 0x8b51f9dd, MULT_B = 0x58f38ded;
const MIX_MULT_L = 0xca01f9dd, MIX_MULT_R = 0x4973f715;
const MASK64 = (1n << 64n) - 1n, MASK128 = (1n << 128n) - 1n;
const MULT128 = 0x2360ed051fc65da44385df649fccf645n;

function seedState(seed) {
  let entropy = BigInt(seed);
  if (entropy < 0n) throw new RangeError('Seed must be nonnegative');
  const words = [];
  do { words.push(Number(entropy & 0xffffffffn)); entropy >>= 32n; } while (entropy);
  let hashConst = INIT_A;
  const hashmix = (v) => {
    v = (v ^ hashConst) >>> 0;
    hashConst = Math.imul(hashConst, MULT_A) >>> 0;
    v = Math.imul(v, hashConst) >>> 0;
    return (v ^ (v >>> 16)) >>> 0;
  };
  const mix = (x, y) => {
    const v = (Math.imul(MIX_MULT_L, x) - Math.imul(MIX_MULT_R, y)) >>> 0;
    return (v ^ (v >>> 16)) >>> 0;
  };
  const pool = Array.from({ length: 4 }, (_, i) => hashmix(words[i] || 0));
  for (let src = 0; src < 4; src++) {
    for (let dst = 0; dst < 4; dst++) {
      if (src !== dst) pool[dst] = mix(pool[dst], hashmix(pool[src]));
    }
  }
  for (let src = 4; src < words.length; src++) {
    for (let dst = 0; dst < 4; dst++) pool[dst] = mix(pool[dst], hashmix(words[src]));
  }
  hashConst = INIT_B;
  const state = Array.from({ length: 8 }, (_, i) => {
    let v = (pool[i % 4] ^ hashConst) >>> 0;
    hashConst = Math.imul(hashConst, MULT_B) >>> 0;
    v = Math.imul(v, hashConst) >>> 0;
    return (v ^ (v >>> 16)) >>> 0;
  });
  return Array.from({ length: 4 }, (_, i) => BigInt(state[2 * i]) | (BigInt(state[2 * i + 1]) << 32n));
}

export function npUniform(seed, lo, hi, n) {
  const words = seedState(seed);
  const init = (words[0] << 64n) | words[1];
  const seq = (words[2] << 64n) | words[3];
  const inc = ((seq << 1n) | 1n) & MASK128;
  let state = inc;
  state = ((state + init) * MULT128 + inc) & MASK128;
  const out = [];
  for (let i = 0; i < n; i++) {
    state = (state * MULT128 + inc) & MASK128;
    const x = ((state >> 64n) ^ state) & MASK64;
    const r = state >> 122n;
    const bits = ((x >> r) | (x << ((-r) & 63n))) & MASK64;
    const u = Number(bits >> 11n) * (2 ** -53);
    out.push(lo + (hi - lo) * u);
  }
  return out;
}
