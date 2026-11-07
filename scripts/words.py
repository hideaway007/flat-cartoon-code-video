"""Word timestamps for the narration: python words.py <project> [audio] [--model M] [--language en]

Runs mlx_whisper (default model mlx-community/whisper-large-v3-turbo, ~13 s for 23 s of audio on an M-series Mac)
and writes
  production/words.json   [{"w","start","end"}, ...]   -> production/timing.py (W.at / W.rel / W.shot)
  production/words.txt    one line per sentence: "12.12  on one of the most remote mountains in Peru."
Default audio: the first file in assets/audio/. Check words.txt against the script: whisper can mishear names and
numbers; fix them in words.json (keep the times) rather than in shots.py.
"""
import argparse, json, os, pathlib, shutil, subprocess, sys, tempfile

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("project"); ap.add_argument("audio", nargs="?")
ap.add_argument("--model", default="mlx-community/whisper-large-v3-turbo"); ap.add_argument("--language", default="en")
a = ap.parse_args()
P = pathlib.Path(a.project).expanduser().resolve()
audio = pathlib.Path(a.audio) if a.audio else next(iter(sorted((P / "assets" / "audio").glob("*.*"))), None)
if not audio or not audio.exists():
    sys.exit("no narration audio: put it in assets/audio/ or pass it as the second argument")
model, lang = a.model, a.language

exe = shutil.which("mlx_whisper") or "/Library/Frameworks/Python.framework/Versions/3.14/bin/mlx_whisper"
if not os.path.exists(exe):
    sys.exit("mlx_whisper not found (pip install mlx-whisper)")
with tempfile.TemporaryDirectory() as td:
    subprocess.run([exe, str(audio), "--model", model, "--word-timestamps", "True", "--output-format", "json",
                    "--output-dir", td, "--output-name", "w", "--language", lang, "--verbose", "False"],
                   check=True, stdout=subprocess.DEVNULL)
    d = json.loads((pathlib.Path(td) / "w.json").read_text())

words, lines = [], []
for seg in d["segments"]:
    ws = [dict(w=w["word"].strip(), start=round(w["start"], 3), end=round(w["end"], 3)) for w in seg.get("words", [])]
    words += [w for w in ws if w["w"]]
    if ws:
        lines.append(f"{ws[0]['start']:7.2f}  " + " ".join(w["w"] for w in ws))
out = P / "production"
(out / "words.json").write_text(json.dumps(words, indent=0, ensure_ascii=False))
(out / "words.txt").write_text("\n".join(lines) + "\n")
print(f"{len(words)} words, {words[-1]['end'] if words else 0:.1f} s -> {out / 'words.json'}, {out / 'words.txt'}")
