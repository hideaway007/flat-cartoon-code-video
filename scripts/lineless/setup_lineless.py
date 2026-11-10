"""Install / update style 2 (lineless colour-block) in a project:  python3 <skill>/scripts/lineless/setup_lineless.py <project>
Copies this folder to <project>/lineless/ (library code is overwritten = updated from the skill; the project's own
src/index.html and src/scenes*.js are kept if they exist) and runs npm install (puppeteer-core).
Needs Node 18+, ffmpeg and Google Chrome (or CHROME=/path/to/chrome). No Python packages."""
import json, pathlib, shutil, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
if len(sys.argv) < 2:
    sys.exit(__doc__)
proj = pathlib.Path(sys.argv[1]).resolve()
proj.mkdir(parents=True, exist_ok=True)
dst = proj / "lineless"
SKIP = {"setup_lineless.py", "__pycache__", "node_modules", "stills", "out"}
for src in sorted(HERE.rglob("*")):
    rel = src.relative_to(HERE)
    if src.is_dir() or any(part in SKIP for part in rel.parts) or src.suffix == ".pyc":
        continue
    out = dst / rel
    mine = rel.parts[0] == "src" and (rel.name == "index.html" or rel.name.startswith("scenes"))
    if mine and out.exists():
        print("keep", out.relative_to(proj))
        continue
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out)
pkg = dst / "package.json"
if not pkg.exists():
    pkg.write_text(json.dumps({"name": "lineless-stage", "private": True, "type": "module",
                               "dependencies": {"puppeteer-core": "^24.0.0"}}, indent=1))
subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=dst, check=True)
print("ready:", dst)
print("try:   cd", dst, "&& node render.mjs stills cast_sheet.html 0.3 && node render.mjs stills index.html 1,3.6,5")
