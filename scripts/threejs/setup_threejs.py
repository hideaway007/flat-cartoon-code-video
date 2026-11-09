"""Install / update the three.js renderer in a project:  $PY <skill>/scripts/threejs/setup_threejs.py <project>
Copies this folder to <project>/threejs/ (code is overwritten = updated from the skill; the per-project direction
files stagejs/shots3d.js and stagejs/onetake_dir.js are kept if they exist) and runs npm install
(three, puppeteer-core, ws). Needs Node 18+ and Google Chrome (or CHROME=/path/to/chrome)."""
import json, pathlib, shutil, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
if len(sys.argv) < 2:
    sys.exit(__doc__)
proj = pathlib.Path(sys.argv[1]).resolve()
if not (proj / "production").is_dir():
    sys.exit(f"{proj} has no production/ folder: run new_project.py first")
dst = proj / "threejs"
KEEP = {"stagejs/shots3d.js", "stagejs/onetake_dir.js"}
SKIP = {"setup_threejs.py", "__pycache__", "node_modules"}
for src in sorted(HERE.rglob("*")):
    rel = src.relative_to(HERE)
    if src.is_dir() or any(part in SKIP for part in rel.parts) or src.suffix == ".pyc":
        continue
    out = dst / rel
    if rel.as_posix() in KEEP and out.exists():
        print("keep", out.relative_to(proj))
        continue
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out)
pkg = dst / "package.json"
if not pkg.exists():
    pkg.write_text(json.dumps({"name": "threejs-stage", "private": True, "type": "commonjs",
                               "dependencies": {"three": "^0.187.0", "puppeteer-core": "^25.16.0", "ws": "^8.22.2"}},
                              indent=1))
subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=dst, check=True)
print("ready:", dst)
