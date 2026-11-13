// Where ffmpeg is: FFMPEG=/path/to/ffmpeg, else the ffmpeg-static package if this folder has it
// (setup_film.mjs installs it when there is no ffmpeg on PATH), else "ffmpeg" on PATH.
import { createRequire } from 'node:module';

export function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { const p = createRequire(import.meta.url)('ffmpeg-static'); if (p) return p; } catch { /* not installed */ }
  return 'ffmpeg';
}
