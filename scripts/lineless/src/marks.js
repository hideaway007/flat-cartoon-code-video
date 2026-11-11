// marks.js — the teacher's red pen and on-screen cards: red/cream constants, blink, wobbly pen paths, name plate.
const RED = '#d8352a', CREAM = '#f6ecd6';
const blink = t => ((t + 0.4) % 2.6 < 0.1 ? 'shut' : 'open');
function wobble(x1, y1, x2, y2, amp = 6, n = 18, seed = 1) {
  const r = rng(seed), a = [];
  for (let i = 0; i <= n; i++) a.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n) + (r() - 0.5) * amp]);
  return a;
}
function ring(cx, cy, rx, ry, n = 26) {
  const a = [];
  for (let i = 0; i <= n + 2; i++) { const k = -1.9 + (i / n) * 6.6; a.push([cx + Math.cos(k) * rx * (1 + i * 0.004), cy + Math.sin(k) * ry]); }
  return a;
}
// name / place plate: cream card with a red spine, slides in from the left
function plate(x, y, title, sub, p, size = 58) {
  if (p <= 0) return;
  g.save(); g.globalAlpha = clamp(p * 2); g.translate(-70 * (1 - eout(p)), 0);
  g.font = `700 ${size}px "Rockwell"`; const wt = g.measureText(title).width;
  let ws = 0; if (sub) { g.font = '400 40px "Rockwell"'; ws = g.measureText(sub).width; }
  const w = Math.max(wt, ws) + 84, h = sub ? size + 78 : size + 40;
  rr(x + 8, y + 8, w, h, 10, 'rgba(42,34,48,0.28)'); rr(x, y, w, h, 10, CREAM); g.beginPath(); g.roundRect(x, y, 16, h, [10, 0, 0, 10]); g.fillStyle = RED; g.fill();
  text(title, x + 46, y + (sub ? 20 + size / 2 : h / 2 + 2), size, INK, 'Rockwell', 'left');
  if (sub) text(sub, x + 46, y + size + 44, 40, '#7a6552', 'Rockwell', 'left', 400);
  g.restore();
}
