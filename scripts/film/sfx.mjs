// sfx.mjs — a film's sound, synthesised in code: seeded noise, filters, a stereo mix, a master and a WAV writer. Node 18+, no dependencies.
//
//   import { mixer, TAU } from '../../sfx.mjs';
//   const m = mixer({ dur: 15, seed: 1912, cuts: [0, 1.5, 3.75, 15], kinds: ['ext', 'ext', 'int'] });   // kinds[i] = the kind of space shot i is in
//   m.bed(() => m.toRms(m.filt(m.pink(m.N), 'lp', 600), 0.1), { ext: 1, int: 0.2 });   // a bed for the whole film; its level is set per kind of shot
//   m.put(m.synth(0.2, u => Math.sin(TAU * 440 * u) * Math.exp(-u * 20)), 3.75, 0.3, -0.2);   // a cue: the sound, when, gain, pan (-1..1)
//   m.master(); m.report(); m.save(new URL('../../out/film.wav', import.meta.url));
//
// Everything is deterministic: the same script writes the same file, bit for bit. Nobody has heard the result until a person plays it:
// say so when you hand the film over.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TAU = Math.PI * 2;

export function mixer({ dur, seed = 1, cuts = [0], kinds = ['all'], sr = 48000 }) {
  const SR = sr, N = Math.round(SR * dur), L = new Float32Array(N), R = new Float32Array(N), last = kinds.length - 1;
  // ---- noise (one seeded generator: the order of the calls is part of the sound)
  let sd = seed >>> 0; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 2147483648 - 1; };
  const white = n => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rnd(); return o; };
  const pink = n => { const o = new Float32Array(n); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { const w = rnd(); a = 0.99765 * a + w * 0.099046; b = 0.963 * b + w * 0.2965164; c = 0.57 * c + w * 1.0526913; o[i] = (a + b + c + w * 0.1848) * 0.25; } return o; };
  const brown = n => { const o = new Float32Array(n); let v = 0; for (let i = 0; i < n; i++) { v = (v + 0.02 * rnd()) * 0.998; o[i] = v * 3; } return o; };
  // ---- a biquad: type 'lp' | 'hp' | 'bp'; f = Hz, or a function of the time in seconds since the start of x
  function filt(x, type, f, q = 0.707) {
    const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
    const set = fc => { const w = TAU * Math.min(Math.max(fc, 20), SR * 0.45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
      if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
      b0 /= a0; b1 /= a0; b2 /= a0; a1 = -2 * c / a0; a2 = (1 - al) / a0; };
    const fn = typeof f === 'function' ? f : null; if (!fn) set(f);
    for (let i = 0; i < x.length; i++) { if (fn && i % 48 === 0) set(fn(i / SR)); const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  // ---- levels
  const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); };
  const peak = x => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
  const toRms = (x, r) => { const k = r / (rms(x) || 1); for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  const toPeak = (x, p = 1) => { const k = p / (peak(x) || 1); for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  // ---- a sound from a function of time: fn(u), u = seconds since its start
  const synth = (d, fn) => { const n = Math.round(d * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = fn(i / SR); return o; };
  // ---- the mix: add a mono sound at t0. pan -1..1, or a function of the time since t0
  function put(x, t0, gain = 1, pan = 0) {
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < x.length; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; const p = typeof pan === 'function' ? pan(i / SR) : pan, a = (p + 1) * Math.PI / 4; L[j] += x[i] * gain * Math.cos(a); R[j] += x[i] * gain * Math.sin(a); }
  }
  // which shot the time t is in
  const shot = t => { let i = 0; while (i < last && t >= cuts[i + 1]) i++; return i; };
  // a bed that runs the whole length; gains = { kind: level }. make() is called once per channel, so the two sides differ.
  // The level changes on the cut over 6 ms: the cut is hard but does not click.
  function bed(make, gains) {
    [L, R].forEach(ch => { const x = make(); let s = 0;
      for (let i = 0; i < N; i++) { const t = i / SR; while (s < last && t >= cuts[s + 1]) s++;
        const g1 = gains[kinds[s]] || 0, dt = t - cuts[s]; let k = g1; if (s > 0 && dt < 0.006) { const g0 = gains[kinds[s - 1]] || 0; k = g0 + (g1 - g0) * dt / 0.006; } ch[i] += x[i] * k; } });
  }
  // ---- master: soft clip, a fade at the very end, then the sample peak is set. peak 0.84 = -1.5 dBFS (AAC adds up to about 1 dB of true peak)
  let before = 0;
  function master({ drive = 1.6, fade = 0.2, peak: target = 0.84 } = {}) {
    for (const ch of [L, R]) for (let i = 0; i < N; i++) ch[i] = Math.tanh(ch[i] * drive) / drive;
    for (let i = N - Math.round(fade * SR), k = 0; i < N; i++, k++) { const f = 1 - k / (fade * SR); L[i] *= f; R[i] *= f; }
    before = Math.max(peak(L), peak(R)); const gn = target / before; for (const ch of [L, R]) for (let i = 0; i < N; i++) ch[i] *= gn;
    return gn;
  }
  const db = v => (20 * Math.log10(v || 1e-9)).toFixed(1);
  // the level of every shot, to read before you listen: a shot that is 15 dB under its neighbours is a hole unless you meant it
  function report() {
    console.log('peak before normalising', db(before), 'dBFS, gain', (Math.max(peak(L), peak(R)) / (before || 1)).toFixed(2));
    for (let s = 0; s <= last; s++) { const a = Math.round(cuts[s] * SR), b = Math.round((cuts[s + 1] ?? dur) * SR); console.log(`shot ${s + 1} ${kinds[s]} ${cuts[s]}-${cuts[s + 1] ?? dur}s  rms ${db(rms(L.subarray(a, b)))} dB  peak ${db(peak(L.subarray(a, b)))} dB`); }
  }
  // 16-bit stereo WAV. where = a path, or a file: URL
  function save(where) {
    const file = where instanceof URL ? fileURLToPath(where) : where, buf = Buffer.alloc(44 + N * 4);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
    for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
    mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, buf); console.log('wrote ' + file);
  }
  return { SR, N, L, R, rnd, white, pink, brown, filt, rms, peak, toRms, toPeak, synth, put, shot, bed, master, report, save };
}
