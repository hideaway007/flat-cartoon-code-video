// The sound of "ELEVEN MILES", synthesised in code (no samples, no speech).
//   node examples/eleven_miles/audio.mjs   ->   out/eleven_miles.wav   (48 kHz, 16-bit stereo, 15 s)
// The cut list and every cue time below mirror shots.js. The stride is the beat: a ski goes down every 0.75 s, ten times, and then
// the page cuts it off: they have stopped. Open shots are wind; the journal is written inside the tent, so the pages are muffled and the
// pencil is close; the blizzard is the loudest thing in the film; when the lamp goes out only the wind is left.
import { mixer, TAU } from '../../sfx.mjs';
const STEP = 0.75;                                                                    // = STEP4 in lowsun.js
const CUTS = [0, 1.5, 3.75, 6, 7.5, 9.75, 11.25, 12.75, 15], KIND = ['near', 'far', 'ext', 'face', 'page', 'gale', 'tent', 'end'];
const m = mixer({ dur: 15, seed: 19120329, cuts: CUTS, kinds: KIND });
const { SR, N, L, R, rnd, white, pink, brown, filt, toRms, toPeak, synth, put, shot, bed } = m;

// ---- beds: the level of each is set per kind of shot
const gust = t => 0.72 + 0.2 * Math.sin(TAU * 0.19 * t + 0.6) + 0.14 * Math.sin(TAU * 0.53 * t + 2);
bed(() => { const x = toRms(filt(filt(pink(N), 'lp', t => 380 + 560 * gust(t)), 'hp', 90), 0.1); for (let i = 0; i < N; i++) x[i] *= gust(i / SR); return x; },
  { near: 0.85, far: 1.05, ext: 0.8, face: 0.9, gale: 1.9, end: 0.6 });                                                                                                   // the wind over the Barrier
bed(() => { const x = toRms(filt(white(N), 'bp', 4200, 0.6), 0.016); for (let i = 0; i < N; i++) x[i] *= 0.7 + 0.3 * Math.sin(TAU * 0.37 * i / SR + 1); return x; },
  { near: 1.4, far: 0.4, ext: 0.8, face: 1, gale: 2.4, end: 0.4 });                                                                                                      // drift hissing over the crust
bed(() => { const x = toRms(filt(pink(N), 'bp', t => 560 + 170 * Math.sin(TAU * 0.29 * t) + 80 * Math.sin(TAU * 0.83 * t + 1), 10), 0.03); for (let i = 0; i < N; i++) x[i] *= 0.55 + 0.45 * Math.sin(TAU * 0.41 * i / SR + 2); return x; },
  { far: 0.6, ext: 0.4, face: 0.6, page: 0.3, gale: 1.6, tent: 0.45, end: 0.8 });                                                                                        // its voice: a narrow band that wanders
bed(() => toRms(filt(pink(N), 'lp', 340), 0.085), { page: 0.6, tent: 0.7 });                                                                                              // the gale, through the canvas
bed(() => toRms(filt(brown(N), 'lp', 110), 0.05), { page: 0.7, gale: 1, tent: 0.8 });                                                                                    // and its weight
bed(() => { const x = new Float32Array(N); for (let t = 0; t < 15; t += 0.08 + 0.14 * Math.abs(rnd())) { const i0 = Math.round(t * SR), a = 0.4 + 0.6 * Math.abs(rnd()), n = Math.round(0.07 * SR); for (let i = 0; i < n && i0 + i < N; i++) x[i0 + i] += rnd() * a * Math.exp(-i / SR * 45); } return toRms(filt(x, 'lp', 520), 0.045); },
  { page: 0.5, gale: 0.9, tent: 0.85 });                                                                                                                                    // the tent, slapping
bed(() => { const x = toRms(filt(pink(N), 'bp', 420, 0.8), 0.035); for (let i = 0; i < N; i++) x[i] *= 0.6 + 0.4 * Math.cos(TAU * i / SR / STEP); return x; },
  { near: 0.6, far: 0.2, ext: 1, face: 0.5 });                                                                                                                           // the runners of the sledge: it comes on with every stride

// ---- a few held notes, D minor. Each voice = a frequency and its level over time [[t, level], ...]; a level changes on a cut in 10 ms
const env = pts => t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (t - a) / (b - a); } return pts[pts.length - 1][1]; };
function voice(f, pts, pan = 0, trem = 0.18) {
  const e = env(pts), a = (pan + 1) * Math.PI / 4, cl = Math.cos(a), cr = Math.sin(a);
  for (let i = 0; i < N; i++) { const t = i / SR, k = e(t); if (k <= 0) continue; const v = k * (1 + trem * Math.sin(TAU * 0.17 * t + f)) * (Math.sin(TAU * f * t) + 0.28 * Math.sin(TAU * 2 * f * t + 1) + 0.1 * Math.sin(TAU * 3 * f * t + 2)); L[i] += v * cl; R[i] += v * cr; }
}
voice(73.42, [[0, 0.02], [1.5, 0.03], [1.6, 0.075], [6, 0.08], [7.5, 0.1], [7.51, 0.04], [9.75, 0.05], [9.76, 0.11], [11.25, 0.13], [11.26, 0.035], [12.75, 0.03], [12.76, 0]]);      // D2, under the whole march
voice(110, [[1.5, 0], [1.7, 0.045], [7.5, 0.05], [7.51, 0.02], [9.75, 0.02], [9.76, 0.05], [11.25, 0.05], [11.26, 0]]);                                                 // A2, from the title
voice(174.61, [[1.5, 0], [2.4, 0.03], [6, 0.03], [7.5, 0.02], [7.51, 0]], 0.3);                                                                                          // F3
voice(146.83, [[3.75, 0], [4.5, 0.025], [7.5, 0.03], [7.51, 0]], -0.3);                                                                                                  // D3
voice(116.54, [[6, 0], [7.5, 0.045], [7.51, 0], [9.75, 0], [9.76, 0.04], [11.25, 0.055], [11.26, 0]], 0.2);                                                              // B flat: the wind gets up
voice(77.78, [[9.75, 0], [9.76, 0.05], [11.25, 0.07], [11.26, 0]], -0.2, 0.3);                                                                                           // E flat against the D: the blizzard
voice(440, [[11.3, 0], [12.2, 0.012], [12.75, 0.012], [12.76, 0]], 0.2, 0.1); voice(349.23, [[11.3, 0], [12.4, 0.01], [12.75, 0.01], [12.76, 0]], -0.2, 0.1);            // thin and high, while he writes

// ---- cues
// the stride (shots 1-4): the ski runs forward, takes his weight on the beat, and the stick goes in just after it
const glide = (d, f) => toPeak(filt(synth(d, u => rnd() * Math.pow(Math.sin(Math.PI * u / d), 1.5)), 'bp', f, 0.9));
const crunch = (f, d = 0.12, k = 30) => toPeak(filt(synth(d, u => rnd() * Math.min(1, u / 0.003) * Math.exp(-u * k) * (0.55 + 0.45 * Math.sin(TAU * 85 * u))), 'bp', f, 0.9));
const kick = synth(0.2, u => Math.exp(-u * 16) * Math.sin(TAU * (70 * u - 40 * u * u)));
const LVL = { near: 1.7, far: 0.3, ext: 0.6, face: 0.3 }, lvl = t => LVL[KIND[shot(Math.max(0, t))]] || 0;
for (let b = 0; b * STEP < 7.5 - 1e-6; b++) { const t = b * STEP, pan = b % 2 ? 0.12 : -0.12;
  if (b > 0) put(glide(0.5, 2500 + 400 * rnd()), t - 0.52, 0.11 * lvl(t - 0.4), pan);
  put(kick, t, 0.14); put(crunch(750, 0.16, 22), t, 0.3 * lvl(t), pan); put(crunch(1900 + 300 * rnd()), t + 0.075, 0.26 * lvl(t), -2 * pan);
  [[0.3, 0.35], [0.525, 0.6]].forEach(([dt, p]) => { if (KIND[shot(t + dt)] !== 'face') put(crunch(1300 + 500 * rnd(), 0.1, 36), t + dt, 0.07 * lvl(t + dt), p); }); }   // the two men behind him, out of step
put(synth(1.4, u => Math.exp(-u * 3.2) * Math.sin(TAU * (44 * u + 5 * (1 - Math.exp(-9 * u))))), 1.5, 0.5);                                         // the cut to the Barrier: a low, soft blow
{ const thud = toPeak(filt(synth(0.05, u => rnd() * Math.exp(-u * 120)), 'lp', 900)); for (let k = 1; k <= 12; k++) if (k !== 7) put(thud, 1.9 + 0.7 * (k - 0.5) / 12, 0.12, -0.6 + 0.04 * k); }   // the title, letter by letter
const breath = toPeak(filt(synth(0.5, u => rnd() * Math.pow(Math.sin(Math.PI * u / 0.5), 1.3)), 'bp', u => 1250 - 500 * u, 1.4));
[6.1, 6.85].forEach(t => put(breath, t, 0.13, -0.1));                                                                                               // close: his breath
put(toPeak(filt(synth(0.65, u => rnd() * Math.pow(u / 0.65, 2.2)), 'bp', u => 420 * Math.pow(4, u / 0.65), 0.8)), 6.85, 0.34, u => -0.5 + 1.5 * u);  // the wind gets up, and the page cuts it off

// the pencil. scratch = handwriting (strokes per second), line = one steady stroke, tap = the point put down
const scratch = (d, rate = 9) => toPeak(filt(filt(synth(d, u => { const st = 0.5 + 0.5 * Math.sin(TAU * rate * u + 0.9 * Math.sin(TAU * 2.3 * u)); return rnd() * (0.2 + 0.8 * Math.pow(st, 1.5)) * Math.min(1, u / 0.008) * Math.min(1, (d - u) / 0.02); }), 'bp', 3400, 0.7), 'hp', 1300));
const line = d => toPeak(filt(synth(d, u => rnd() * Math.min(1, u / 0.01) * Math.min(1, (d - u) / 0.03)), 'bp', 2600, 1.1));
const tap = toPeak(filt(synth(0.03, u => rnd() * Math.exp(-u * 160)), 'bp', 1800, 0.8));
const write = (t, d, gn, pan = 0, rate = 9) => put(scratch(d, rate), t, gn, pan);
write(0.15, 0.6, 0.035, -0.6); write(0.5, 0.5, 0.035, 0.6);                                                                        // the date slip, the tally: 21
write(3.8, 0.5, 0.03, -0.6); put(line(0.2), 3.9, 0.04, 0.6); write(4.12, 0.4, 0.035, 0.6);                                          // Monday; 21 struck out; 15 1/2
[[3.9, -0.5], [4.275, 0], [4.65, 0.3]].forEach(([t, p]) => write(t, 0.3, 0.07, p));                                                 // Scott, Wilson, Bowers
write(5.0, 0.45, 0.06, -0.3); write(6.2, 0.5, 0.06, -0.3);                                                                          // the two quotes over the picture
write(7.55, 0.5, 0.05, -0.6);                                                                                                       // the page: Wednesday
for (let i = 0; i < 18; i++) put(tap, 7.6 + 0.8 * (i + 0.5) / 18, 0.1, -0.4);                                                       // the track, dot by dot
write(7.75, 0.7, 0.08, 0.45); put(tap, 8.4, 0.2, -0.4); write(8.42, 0.3, 0.07, -0.3); write(8.4, 0.3, 0.06, 0.45);                  // the quote; the camp; Monday night, twice
put(line(0.25), 8.6, 0.09, -0.5); write(8.7, 0.3, 0.1, -0.6); put(line(0.2), 8.7, 0.04, 0.6); write(8.9, 0.3, 0.05, 0.6);           // the bracket; 11 miles; 15 1/2 struck out; 11
write(8.72, 0.36, 0.06, 0.45); write(9.08, 0.32, 0.06, 0.45);
write(9.05, 0.37, 0.15, -0.3, 22); write(9.22, 0.25, 0.09, -0.1);                                                                    // the red scribble across the last eleven miles: blizzard
put(toPeak(filt(synth(0.75, u => rnd() * Math.pow(u / 0.75, 2)), 'lp', u => 200 + 700 * u / 0.75)), 9.0, 0.22);                     // and it comes up under the page
put(toPeak(filt(synth(0.5, u => rnd() * Math.exp(-u * 6)), 'bp', 700, 0.6)), 9.75, 0.3);                                            // the cut to the tent: the gale, all at once
{ const tock = toPeak(synth(0.05, u => Math.exp(-u * 90) * (Math.sin(TAU * 1450 * u) + 0.5 * Math.sin(TAU * 2900 * u)) + (u < 0.003 ? 0.6 * rnd() : 0)));
  for (let k = 1; k <= 7; k++) put(tock, 9.75 + k * STEP / 4, 0.12, -0.55); }                                                        // March 22 ... 28: a day every quarter of a stride
write(9.95, 0.5, 0.04, -0.3);
write(11.3, 0.5, 0.04, -0.6);                                                                                                       // inside: Thursday, March 29
write(11.42, 0.66, 0.12, -0.1, 10); write(12.2, 0.32, 0.12, -0.25, 10); put(line(0.2), 12.55, 0.05, -0.2);                          // the two lines he writes, and the pencil slides off
put(toPeak(filt(synth(0.25, u => rnd() * (0.5 + 0.5 * Math.sin(TAU * 13 * u)) * u / 0.25), 'lp', 700)), 12.5, 0.06, 0.6);           // the flame gutters
put(toPeak(filt(synth(0.18, u => rnd() * Math.exp(-u * 30)), 'lp', 900)), 12.75, 0.2, 0.6);                                         // and is out, on the cut
// ---- 12.75: the lamp is out. Only the wind is left (the 'end' beds), the last line, and three notes
write(13.05, 0.45, 0.05, -0.2); write(13.5, 0.6, 0.05, -0.1);
const note = (f, d) => synth(d, u => Math.min(1, u / 0.012) * (Math.sin(TAU * f * u) * Math.exp(-u * 1.5) + 0.4 * Math.sin(TAU * 2 * f * u) * Math.exp(-u * 2.6) + 0.15 * Math.sin(TAU * 3 * f * u) * Math.exp(-u * 4) + 0.06 * Math.sin(TAU * 4.02 * f * u) * Math.exp(-u * 6)));
put(note(146.83, 1.5), 13.5, 0.2, -0.15); put(note(220, 1.5), 13.52, 0.12, 0.15); put(note(73.42, 0.9), 14.1, 0.2);                 // D and A with the last line; a low D when the tent is found
write(14.35, 0.45, 0.06, 0.6, 5);                                                                                                   // the red ring round the 11

// ---- master
m.master({ peak: 0.8, fade: 0.25 }); m.report(); m.save(new URL('../../out/eleven_miles.wav', import.meta.url));
