// The sound of "EL FARO, 07:06", synthesised in code (no samples, no speech).
//   node examples/elfaro_0706/audio.mjs   ->   out/elfaro_0706.wav   (48 kHz, 16-bit stereo, 15 s)
// The cut list and every cue time below mirror shots.js. Interior shots are muffled, exterior shots are open,
// the cross-section is almost quiet, and at 12.6 s everything stops: the recording ends.
import { mixer, TAU } from '../../sfx.mjs';
// ---- the cut: which kind of space each shot is in
const CUTS = [0, 1.5, 3.5, 5, 6, 8, 11, 12.6, 15], KIND = ['int', 'ext', 'int', 'int', 'int', 'dia', 'ext', 'end'], END = 12.6;
const m = mixer({ dur: 15, seed: 20151001, cuts: CUTS, kinds: KIND });
const { SR, N, L, R, rnd, white, pink, brown, filt, peak, toRms, toPeak, synth, put, shot, bed } = m;

// ---- beds: the level of each is set per kind of shot
const gust = t => 0.75 + 0.25 * Math.sin(TAU * 0.23 * t + 1) + 0.12 * Math.sin(TAU * 0.71 * t);
bed(() => { const x = toRms(filt(filt(pink(N), 'lp', t => 500 + 700 * gust(t)), 'hp', 110), 0.17); for (let i = 0; i < N; i++) x[i] *= gust(i / SR); return x; }, { ext: 1 });            // wind
bed(() => toRms(filt(brown(N), 'lp', 240), 0.15), { ext: 1 });                                                                                                          // the sea
bed(() => toRms(filt(white(N), 'hp', 3200), 0.035), { ext: 1, int: 0.22 });                                                                                             // rain; on the glass when inside
bed(() => toRms(filt(pink(N), 'lp', 300), 0.085), { int: 1, dia: 0.32 });                                                                                               // the storm through the steel
bed(() => toRms(filt(brown(N), 'lp', 120), 0.05), { int: 1, dia: 1.5 });                                                                                                // the hull, low
bed(() => { const x = toRms(filt(pink(N), 'bp', 1100, 1.1), 0.022); for (let i = 0; i < N; i++) x[i] *= 0.6 + 0.4 * Math.sin(TAU * 3.1 * i / SR) * Math.sin(TAU * 0.9 * i / SR); return x; }, { dia: 1 });   // water moving in the hold
// a low drone that swells under everything until the recording stops
for (let i = 0; i < N; i++) { const t = i / SR, k = (0.035 + 0.1 * Math.pow(t / END, 1.6)) * (1 + 0.2 * Math.sin(TAU * 0.21 * t));
  const v = k * (0.5 * Math.sin(TAU * 55 * t) + 0.3 * Math.sin(TAU * 82.41 * t + 0.6 * Math.sin(TAU * 0.13 * t)) + 0.2 * Math.sin(TAU * 110.6 * t)); L[i] += v; R[i] += v; }

// ---- cues
const thunder = (dur, muffled) => { const n = Math.round(dur * SR); let x = filt(brown(n), 'lp', muffled ? 170 : u => 1300 * Math.exp(-u * 2.4) + 110);
  for (let i = 0; i < n; i++) { const u = i / SR; x[i] *= Math.min(1, u / 0.012) * Math.exp(-u * 1.5) * (1 + 0.6 * Math.sin(TAU * 9 * u + 1) * Math.exp(-u * 2.5)); }
  if (!muffled) { const c = filt(white(Math.round(0.09 * SR)), 'hp', 1800); const k = peak(x); for (let i = 0; i < c.length; i++) x[i] += c[i] * Math.exp(-i / SR * 40) * k * 0.8; }
  return toPeak(x); };
[[1.5, 0, 0.62, 0.3], [2.8, 0, 0.3, 0.5], [4.25, 1, 0.3, 0.4], [7.1, 1, 0.26, -0.2], [11.0, 0, 0.62, 0.5], [11.95, 0, 0.45, 0.6]].forEach(([t, mf, gn, p]) => put(thunder(2.6, mf), t, gn, p));   // the same times as flashes3([...]) in parts.js
put(synth(1.0, u => Math.exp(-u * 4.5) * Math.sin(TAU * (40 * u + 5 * (1 - Math.exp(-10 * u))))), 1.95, 0.6);                                   // the title lands
const groan = dur => { let ph = 0; const x = synth(dur, u => { ph += TAU * (68 - 14 * u / dur + 3 * Math.sin(TAU * 5 * u)) / SR; return (2 * ((ph / TAU) % 1) - 1) * Math.pow(Math.sin(Math.PI * u / dur), 2); });
  const a = filt(x, 'bp', 190, 2.5), b = filt(x, 'bp', 460, 4); for (let i = 0; i < a.length; i++) a[i] += 0.5 * b[i]; return toPeak(a); };
put(groan(1.2), 0.1, 0.2, -0.3); put(groan(1.0), 3.85, 0.26, 0.2); put(groan(1.6), 8.2, 0.1, 0);
put(toPeak(filt(synth(0.3, u => rnd() * Math.exp(-u * 14)), 'lp', 380)), 4.3, 0.3, 0.3);                                                          // something heavy goes across the deck
const beep = toPeak(filt(synth(0.22, u => { const p = TAU * 880 * u; return Math.min(1, u / 0.004) * (u < 0.18 ? 1 : Math.max(0, 1 - (u - 0.18) / 0.04)) * (Math.sin(p) + 0.35 * Math.sin(3 * p) + 0.15 * Math.sin(5 * p)); }), 'lp', 2600));
for (let t = 0; t < END - 0.2; t += 0.5) { const k = KIND[shot(t)]; if (k === 'int') put(beep, t, 0.075, 0.35); else if (k === 'dia') put(beep, t, 0.016, 0.35); }   // the alarm is the metronome: the beat grid, made audible
const pop = synth(0.16, u => Math.exp(-u * 38) * (0.6 * Math.sin(TAU * 1175 * u) + 0.5 * Math.sin(TAU * 587 * u)) + (u < 0.004 ? rnd() * 0.5 : 0)), thump = synth(0.14, u => Math.exp(-u * 30) * Math.sin(TAU * (90 * u - 60 * u * u)));
[[0.55, -0.4], [3.72, -0.4], [4.07, 0.1], [4.42, 0.4], [8.35, 0.2], [9.2, -0.4], [10.05, 0.5]].forEach(([t, p]) => { put(pop, t, 0.2, p); put(thump, t, 0.3, p); });      // every callout that pops on
const tick = toPeak(filt(synth(0.012, u => rnd() * Math.exp(-u * 500)), 'hp', 2500));
[[0.75, 1.1, 12, 1], [2.15, 2.95, 24, 1], [6.5, 7.5, 26, 1], [8.55, 9.1, 20, 1], [9.4, 10.0, 24, 1], [10.2, 10.75, 20, 1], [13.0, 13.7, 24, 0.6]].forEach(([a, b, n, k]) => { for (let i = 0; i < n; i++) put(tick, a + (b - a) * i / n, 0.045 * k * (0.7 + 0.3 * Math.abs(rnd())), -0.3 + 0.2 * rnd()); });   // every line that types on
// the mug: it scrapes down the console, and breaks on the cut
put(toPeak(filt(synth(0.5, u => rnd() * Math.pow(u / 0.5, 1.5)), 'bp', u => 900 + 2200 * Math.pow(u / 0.5, 2), 5)), 5.14, 0.2, u => 0.4 - 1.6 * u);
put(toPeak(filt(synth(0.5, u => { let v = rnd() * Math.exp(-u * 16) * 0.9; [2140, 3310, 4720, 6150, 7900].forEach((f, k) => { v += 0.16 * Math.sin(TAU * f * u + k) * Math.exp(-u * (22 + k * 7)); }); return v; }), 'hp', 900)), 6.0, 0.42, -0.5);
for (let i = 0; i < 7; i++) { const f = 3000 + 5000 * Math.abs(rnd()); put(synth(0.09, u => Math.sin(TAU * f * u) * Math.exp(-u * 60)), 6.04 + 0.34 * Math.abs(rnd()), 0.035, -0.7 + 0.5 * Math.abs(rnd())); }
put(synth(0.02, u => rnd() * Math.exp(-u * 300)), 6.15, 0.12, -0.3);                                                                                // the handset comes off its hook
// a pulse under the call and the cross-section; it doubles when she starts to go
const pulse = synth(0.16, u => Math.exp(-u * 20) * Math.sin(TAU * (62 * u - 15 * u * u)));
for (let t = 6; t < END - 0.05; t += t < 11 ? 0.5 : 0.25) put(pulse, t, 0.14 + 0.24 * (t - 6) / 6.6);
// shot 7: a riser, the deck cargo hitting the sea, the clock running out
{ const d = END - 11;
  put(toPeak(filt(synth(d, u => rnd() * Math.pow(u / d, 2)), 'bp', u => 300 * Math.pow(11, u / d), 1.2)), 11, 0.24);
  put(synth(d, u => Math.pow(u / d, 1.5) * Math.sin(TAU * (50 * u + 28 * u * u))), 11, 0.26);
  const splash = () => toPeak(filt(synth(0.6, u => rnd() * Math.min(1, u / 0.015) * Math.exp(-u * 7)), 'bp', 700, 0.7));
  [11.52, 11.72, 11.93, 12.1, 12.28, 12.42, 12.55].forEach((t, i) => put(splash(), t, 0.22, -0.35 + 0.05 * i));
  for (let t = 11, dt = 0.17; t < END - 0.02; t += dt, dt = Math.max(0.03, dt * 0.93)) put(synth(0.02, u => Math.sin(TAU * 2100 * u) * Math.exp(-u * 220)), t, 0.06 + 0.07 * (t - 11) / d, 0.4); }

// ---- 12.6: the recording stops. Nothing above this line survives the cut.
for (let i = Math.round(END * SR), k = 0; i < N; i++, k++) { const f = Math.max(0, 1 - k / (0.004 * SR)); L[i] *= f; R[i] *= f; }
{ const x = toRms(filt(pink(N), 'lp', 400), 0.004); for (let i = Math.round(END * SR); i < N; i++) { L[i] += x[i]; R[i] += x[i]; } }                 // not digital silence: an empty room
const bell = (f0, dur) => synth(dur, u => { let v = 0; [[0.5, 0.3, 0.7], [1, 1, 1], [1.19, 0.55, 1.3], [1.5, 0.3, 1.7], [2, 0.45, 2], [2.51, 0.22, 2.6], [2.66, 0.2, 3], [3.01, 0.14, 3.6], [4.1, 0.1, 4.6]]
  .forEach(([h, a, d]) => { v += a * Math.sin(TAU * f0 * h * u) * Math.exp(-u * d); }); return v * Math.min(1, u / 0.003); });
put(toPeak(bell(220, 2.0)), 13.0, 0.36, -0.1); put(toPeak(bell(220, 1.2)), 13.8, 0.26, 0.1);       // 0.4 s of nothing, then one toll with each line of the card

// ---- master. Measured in the MP4 (AAC 192k): about -15.6 LUFS, true peak about -0.6 dBFS.
m.master({ peak: 0.84 }); m.report(); m.save(new URL('../../out/elfaro_0706.wav', import.meta.url));
