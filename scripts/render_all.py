"""Render every segment in parallel and join them with the full narration:
    python render_all.py <project> [--jobs 3] [--only seg03 seg04] [--name Film]
1. checks every production/segments/seg*.py (stops on errors)
2. renders segments without audio, N at a time (one process per segment, OpenCV single-threaded)
3. joins the segment videos (stream copy) and adds the narration cut to the film length -> out/<name>.mp4
Segments already rendered and newer than their .py and the libraries are skipped (delete the mp4 to force).
"""
import argparse, concurrent.futures as cf, os, pathlib, subprocess, sys, time

ap = argparse.ArgumentParser()
ap.add_argument("project"); ap.add_argument("--jobs", type=int, default=3)
ap.add_argument("--only", nargs="*", default=[]); ap.add_argument("--name", default="film")
a = ap.parse_args()
P = pathlib.Path(a.project).expanduser().resolve()
PY = sys.executable
segs = sorted((P / "production" / "segments").glob("seg*.py"))
if not segs:
    sys.exit("no production/segments/seg*.py")
outdir = P / "out" / "segments"
outdir.mkdir(parents=True, exist_ok=True)
libs = [P / "production" / f for f in ("toon.py", "stage.py", "cast.py", "poses.py", "engine.py", "overlays.py",
                                         "costumes.py", "crowds.py", "sets.py", "timing.py", "words.json")]
newest_lib = max(f.stat().st_mtime for f in libs if f.exists())

bad = [s.stem for s in segs if subprocess.run([PY, str(s), "--check"]).returncode]
if bad:
    sys.exit(f"check failed: {bad}")


def job(seg):
    out = outdir / f"{seg.stem}.mp4"
    deps = max(seg.stat().st_mtime, newest_lib, *(s.stat().st_mtime for s in segs if s.stem < seg.stem))
    if (a.only and seg.stem not in a.only) or (out.exists() and out.stat().st_mtime > deps):
        return seg.stem, "kept", 0
    t0 = time.time()
    env = dict(os.environ, OPENCV_NUM_THREADS="1")   # measured: fewer threads per process = less contention
    r = subprocess.run([PY, str(seg), "--render", "--noaudio", "--out", str(out)], capture_output=True, text=True,
                       env=env)
    if r.returncode:
        return seg.stem, "FAILED: " + r.stderr[-800:], time.time() - t0
    return seg.stem, "rendered", time.time() - t0


t0 = time.time()
with cf.ThreadPoolExecutor(a.jobs) as ex:
    for name, status, secs in ex.map(job, segs):
        print(f"{name}: {status} {secs:.0f}s", flush=True)
        if status.startswith("FAILED"):
            sys.exit(1)
lst = outdir / "concat.txt"
lst.write_text("".join(f"file '{outdir / (s.stem + '.mp4')}'\n" for s in segs))
silent = outdir / "_joined.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)],
               check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(silent)],
                           capture_output=True, text=True).stdout)
audio = next(iter(sorted((P / "assets" / "audio").glob("*.*"))), None)
final = P / "out" / f"{a.name}.mp4"
cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(silent)]
if audio:
    cmd += ["-i", str(audio), "-map", "0:v", "-map", "1:a", "-t", f"{dur:.3f}", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-af", f"afade=t=out:st={max(dur - 0.45, 0):.3f}:d=0.43"]
subprocess.run(cmd + [str(final)], check=True)
silent.unlink()
print(f"{final}  {dur:.2f}s, {len(segs)} segments, total {time.time() - t0:.0f}s")
