// Install / update the film styles (style 3 CUTAWAY, style 4 LOW SUN) in a project:
//   node <skill>/scripts/film/setup_film.mjs <project>
// Copies this folder to <project>/film/ (library code and the examples are overwritten = updated from the skill; the project's own
// films in <project>/film/films/ are never touched) and runs npm install (puppeteer-core).
// Needs Node 18+ and Google Chrome (or CHROME=/path/to/chrome). No Python. ffmpeg: if there is none on PATH and FFMPEG is not set,
// the ffmpeg-static package is installed into the project as well (a download of about 80 MB).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
if (!process.argv[2]) { console.error('usage: node setup_film.mjs <project>'); process.exit(1); }
const proj = path.resolve(process.argv[2]), dst = path.join(proj, 'film');
const SKIP = new Set(['setup_film.mjs', 'node_modules', 'stills', 'out', 'films', 'package.json', 'package-lock.json']);
function copy(from, to, top) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (top && SKIP.has(name)) continue;
    const a = path.join(from, name), b = path.join(to, name);
    if (statSync(a).isDirectory()) copy(a, b, false); else copyFileSync(a, b);
  }
}
copy(HERE, dst, true);
mkdirSync(path.join(dst, 'films'), { recursive: true });

const pkgFile = path.join(dst, 'package.json');
const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : { name: 'film-stage', private: true, type: 'module', dependencies: {} };
pkg.dependencies = { 'puppeteer-core': '^24.0.0', ...pkg.dependencies };
const onPath = !spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).error;
if (!onPath && !process.env.FFMPEG && !pkg.dependencies['ffmpeg-static']) {
  pkg.dependencies['ffmpeg-static'] = '^5.2.0';
  console.log('no ffmpeg on PATH: adding the ffmpeg-static package to this project');
}
writeFileSync(pkgFile, JSON.stringify(pkg, null, 1) + '\n');
// npm is a .cmd on Windows, which Node only runs through a shell
const npm = spawnSync('npm install --no-audit --no-fund', { cwd: dst, stdio: 'inherit', shell: true });
if (npm.status) { console.error('npm install failed'); process.exit(npm.status || 1); }
console.log('ready: ' + dst);
console.log('try:   cd "' + dst + '" && node sheet.mjs examples/elfaro_0706/index.html 0.9,2.6,4.5,5.5,7.2,9.6,11.9,13.8 4 480');
