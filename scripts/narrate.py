"""English narration with Google Gemini TTS (Fenrir, American, native pace) -> <project>/assets/audio/narration.wav

    python3 narrate.py <project>                  # script.md -> chapters -> TTS (pace as Google reads it) -> narration.wav
    python3 narrate.py <project> --prepare-only   # write chapter texts + manifest, no Google call
    python3 narrate.py <project> --status         # show the manifest (measured wpm per chapter)
    python3 narrate.py <project> --retry 03       # re-submit chapter 03 (after an error, or to get a new take)
    python3 narrate.py <project> --join-only      # rebuild narration.wav from the finished chapters
    python3 narrate.py <project> --wpm 175        # optional: force an exact pace (atempo on the saved raw takes, no new request)
    python3 narrate.py <project> --wpm native     # back to the untouched Google pace

Voice line confirmed by ear on 2026-11-07: Gemini 3.8 Flash TTS, prebuilt
voice Fenrir, natural General American male storyteller. Decision: keep the pace exactly as Google reads it
(~191 wpm with this prompt); no time-stretching by default. 165 sounded stretched, 175 was tried, then native won.
The style prompt always asks for ASK_WPM (165): that prompt produced the accepted take that Fenrir read at ~191 wpm.
Asking for a higher number pushes the model faster and changes the delivery, so leave it.
Chapters are only edge-trimmed (leading/trailing silence) and measured; --status shows each chapter's wpm.

Input: production/script.md in the skill's format ("## N Title" chapter headings, one beat per line, spoken text
before " | ", visual hints after). Or --texts <dir> with ordered .txt files (one file = one chapter).
Work files: production/tts/ (chapter txt, raw takes, per-chapter WAVs, manifest.json, style.txt).
Needs: gcloud logged in (gcloud auth login) with access to the project, ffmpeg on PATH. Standard library only.
Google Cloud project, first found wins: --gcp-project, env GEMINI_TTS_PROJECT, "gcp_project" in <skill>/local.json
(machine-local, git-ignored), then `gcloud config get-value project`.
"""
import argparse, base64, concurrent.futures as cf, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.error
import urllib.request, wave

MODEL = "gemini-3.8-flash-tts"
VOICE = "Fenrir"
STYLE = ("Natural General American English, confident and energetic storytelling at about {wpm} words per minute. "
         "Use the same grounded, resonant male delivery throughout. Make important words pop with crisp stress and "
         "varied pitch, preserve clean phrase endings, leave a short beat before each reveal or question, and lift "
         "the funny lines with dry humor. No shouting. Read the supplied text verbatim, without music or added sound.")
ASK_WPM = 165              # pace written into the style prompt (not the output pace, see the docstring)
MAX_BYTES = 3500          # split longer chapters at sentence ends (one request stays well inside the TTS limit)
SAFE_TEMPO = (0.85, 1.20)  # atempo outside this range starts to sound processed -> flagged, regenerate instead

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("project")
ap.add_argument("--texts", help="folder of ordered .txt chapters instead of production/script.md")
ap.add_argument("--wpm", default="native",
                help="'native' (default: keep Google's pace) or a number to time-stretch every chapter to that pace")
ap.add_argument("--voice", default=VOICE)
ap.add_argument("--style", help="file with a custom style prompt ({wpm} is filled in)")
ap.add_argument("--gap", type=float, default=0.6, help="silence between chapters in narration.wav (s)")
ap.add_argument("--workers", type=int, default=2)
ap.add_argument("--gcp-project", help="Google Cloud project (default: env / local.json / gcloud config)")
ap.add_argument("--prepare-only", action="store_true")
ap.add_argument("--status", action="store_true")
ap.add_argument("--join-only", action="store_true")
ap.add_argument("--retry", nargs="+", default=[], metavar="ID")
a = ap.parse_args()
try:
    a.wpm = None if str(a.wpm).lower() == "native" else float(a.wpm)
except ValueError:
    sys.exit("--wpm takes 'native' or a number")


def gcp_project():
    if a.gcp_project:
        return a.gcp_project
    if os.environ.get("GEMINI_TTS_PROJECT"):
        return os.environ["GEMINI_TTS_PROJECT"]
    local = pathlib.Path(__file__).resolve().parent.parent / "local.json"
    if local.exists() and json.loads(local.read_text()).get("gcp_project"):
        return json.loads(local.read_text())["gcp_project"]
    r = subprocess.run(["gcloud", "config", "get-value", "project"], capture_output=True, text=True, timeout=30)
    if r.returncode or not r.stdout.strip() or r.stdout.strip() == "(unset)":
        sys.exit("no Google Cloud project: pass --gcp-project, set GEMINI_TTS_PROJECT, or gcloud config set project")
    return r.stdout.strip()


def pace(t):
    return "native pace" if t is None else f"{t:g} wpm"

P = pathlib.Path(a.project).expanduser().resolve()
T = P / "production" / "tts"
MAN = T / "manifest.json"
FF = shutil.which("ffmpeg") or sys.exit("ffmpeg not found on PATH")


def count_words(text):
    return len(text.split())


def save(m):
    tmp = MAN.with_suffix(".tmp")
    tmp.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n")
    tmp.replace(MAN)


def seconds(path):
    with wave.open(str(path), "rb") as f:
        return f.getnframes() / f.getframerate()


def chapters_from_script(path):
    """[(title, spoken text)] from '## N Title' + 'spoken | hints' lines."""
    out, title, lines = [], None, []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if line.startswith("## "):
            if title and lines:
                out.append((title, " ".join(lines)))
            title, lines = re.sub(r"^##\s*(\d+[.)]?\s+)?", "", line), []
        elif line and title and not line.startswith(("#", ">", "<!--")):
            spoken = line.split(" | ")[0].strip()
            if spoken and not spoken.startswith("("):
                lines.append(spoken)
    if title and lines:
        out.append((title, " ".join(lines)))
    return out


def split_long(text):
    if len(text.encode()) <= MAX_BYTES:
        return [text]
    parts, cur = [], ""
    for s in re.split(r"(?<=[.!?])\s+", text):
        if cur and len((cur + " " + s).encode()) > MAX_BYTES:
            parts.append(cur)
            cur = s
        else:
            cur = (cur + " " + s).strip()
    return parts + [cur] if cur else parts


def prepare():
    if MAN.exists():
        return json.loads(MAN.read_text())
    if a.texts:
        src = pathlib.Path(a.texts).expanduser().resolve()
        chaps = [(f.stem, f.read_text().strip()) for f in sorted(src.glob("*.txt"))]
    else:
        src = P / "production" / "script.md"
        if not src.exists():
            sys.exit(f"no {src}; write the script first or pass --texts <dir>")
        chaps = chapters_from_script(src)
    if not chaps:
        sys.exit(f"no chapters found in {src}")
    style = (pathlib.Path(a.style).read_text().strip() if a.style else STYLE).format(wpm=ASK_WPM)
    T.mkdir(parents=True, exist_ok=True)
    (T / "style.txt").write_text(style + "\n")
    sections, n = [], 0
    for title, text in chaps:
        pieces = split_long(text)
        for k, piece in enumerate(pieces):
            n += 1
            sid = f"{n:02d}"
            slug = re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_")[:40] or "chapter"
            name = f"{sid}_{slug}" + (f"_part{k + 1}" if len(pieces) > 1 else "")
            (T / f"{name}.txt").write_text(piece + "\n")
            sections.append(dict(id=sid, name=name, title=title, text=piece, words=count_words(piece),
                                 status="pending"))
    m = dict(source=str(src), gcp_project=gcp_project(), model=MODEL, voice=a.voice, language="en-US",
             target_wpm=a.wpm, style=style, gap=a.gap, created=time.strftime("%Y-%m-%d %H:%M"), sections=sections)
    save(m)
    return m


def token():
    r = subprocess.run(["gcloud", "auth", "print-access-token", "--quiet"], capture_output=True, text=True, timeout=45)
    if r.returncode or not r.stdout.strip():
        sys.exit("gcloud has no access token; run: gcloud auth login\n" + r.stderr.strip()[:500])
    return r.stdout.strip()


def synth(m, s, tok):
    url = (f"https://aiplatform.googleapis.com/v1/projects/{m['gcp_project']}/locations/global/publishers/google/"
           f"models/{m['model']}:generateContent")
    body = {"contents": [{"role": "user", "parts": [{"text": s["text"], "speechMetadata": {"style": m["style"]}}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"voice": m["voice"]}}}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.load(r)
    except urllib.error.HTTPError as e:
        try:
            msg = json.load(e).get("error", {}).get("message", "")
        except ValueError:
            msg = ""
        raise RuntimeError(f"HTTP {e.code}: {msg[:600]}") from None
    blob = next((p.get("inlineData") or p.get("inline_data") for c in res.get("candidates", [])
                 for p in c.get("content", {}).get("parts", []) if p.get("inlineData") or p.get("inline_data")), None)
    if not blob:
        raise RuntimeError("no audio in the response")
    data, mime = base64.b64decode(blob["data"]), blob.get("mimeType", blob.get("mime_type", "")).lower()
    raw = T / f"{s['name']}.raw.wav"
    if data[:4] == b"RIFF":
        raw.write_bytes(data)
    elif mime.startswith("audio/l16"):
        rate = re.search(r"rate=(\d+)", mime)
        with wave.open(str(raw), "wb") as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(int(rate.group(1)) if rate else 24000)
            f.writeframes(data)
    else:
        raise RuntimeError("unexpected audio format " + mime)
    return raw


def to_pace(m, s, raw):
    """Trim edge silence, measure; atempo only if a fixed target wpm is set -> production/tts/<name>.wav"""
    trim = T / f"{s['name']}.trim.wav"
    edge = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05"
    subprocess.run([FF, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                    f"{edge},areverse,{edge},areverse", "-ac", "1", "-c:a", "pcm_s16le", str(trim)], check=True)
    raw_s = seconds(trim)
    dst = T / f"{s['name']}.wav"
    if m["target_wpm"] is None:   # native pace: the take as Google read it
        factor = 1.0
        trim.replace(dst)
    else:
        factor = raw_s * m["target_wpm"] / (s["words"] * 60)
        subprocess.run([FF, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(trim), "-af",
                        f"atempo={factor:.9f}", "-c:a", "pcm_s16le", str(dst)], check=True)
        trim.unlink()
    dur = seconds(dst)
    s.update(status="done", raw_wpm=round(60 * s["words"] / raw_s, 1), tempo_factor=round(factor, 4),
             seconds=round(dur, 2), wpm=round(60 * s["words"] / dur, 1), file=str(dst),
             check=None if SAFE_TEMPO[0] <= factor <= SAFE_TEMPO[1] else
             f"atempo {factor:.2f} is outside {SAFE_TEMPO}; listen, and --retry {s['id']} if it sounds processed")


def generate(m):
    for sid in a.retry:
        s = next((x for x in m["sections"] if x["id"] == sid.zfill(2)), None) or sys.exit(f"no chapter {sid}")
        s.update(status="pending", error=None)
    stuck = [s["id"] for s in m["sections"] if s["status"] in ("submitted", "error")]
    if stuck:
        sys.exit(f"chapters {stuck} were submitted before without a saved result (see --status). Check them, then "
                 f"--retry {' '.join(stuck)}; nothing is re-sent automatically so quota is not spent twice.")
    todo = [s for s in m["sections"] if s["status"] == "pending"]
    if not todo:
        return
    tok = token()

    def run(s):
        s["status"] = "submitted"; save(m)
        try:
            to_pace(m, s, synth(m, s, tok))
        except Exception as e:
            s.update(status="error", error=str(e)[:700])
        save(m)
        return s

    print(f"{len(todo)} chapter(s) -> {m['voice']} at {pace(m['target_wpm'])}", flush=True)
    with cf.ThreadPoolExecutor(max_workers=max(1, a.workers)) as pool:
        for s in (f.result() for f in cf.as_completed([pool.submit(run, s) for s in todo])):
            if s["status"] == "done":
                print(f"  {s['name']}: {s['seconds']:.1f} s, {s['raw_wpm']} -> {s['wpm']} wpm"
                      + (f"  !! {s['check']}" if s.get("check") else ""), flush=True)
            else:
                print(f"  {s['name']}: ERROR {s['error']}", flush=True)


def join(m):
    secs = m["sections"]
    if any(s["status"] != "done" for s in secs):
        print("not joined: some chapters are not done (see --status)")
        return False
    audio = P / "assets" / "audio"
    audio.mkdir(parents=True, exist_ok=True)
    dst = audio / "narration.wav"
    if dst.exists() and not (T / "narration.joined").exists():   # a file we did not make (placeholder voice etc.)
        keep = T / f"replaced_{time.strftime('%Y%m%d-%H%M%S')}_narration.wav"
        shutil.move(str(dst), keep)
        print(f"moved the previous narration.wav to {keep}")
    others = [f.name for f in sorted(audio.glob("*.*")) if f.name != "narration.wav"]
    if others:
        print(f"note: assets/audio also holds {others}; words.py and render_all.py use the first file by name")
    sr = 24000
    with wave.open(secs[0]["file"], "rb") as f:
        sr = f.getframerate()
    inputs, labels = [], []   # ffmpeg input index = len(labels): chapters and gap silences are interleaved inputs
    for i, s in enumerate(secs):
        labels.append(f"[{len(labels)}:a]")
        inputs += ["-i", s["file"]]
        if i < len(secs) - 1 and m["gap"] > 0:
            labels.append(f"[{len(labels)}:a]")
            inputs += ["-f", "lavfi", "-t", f"{m['gap']}", "-i", f"anullsrc=r={sr}:cl=mono"]
    graph = "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
    subprocess.run([FF, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", *inputs, "-filter_complex", graph,
                    "-map", "[out]", "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s16le", str(dst)], check=True)
    (T / "narration.joined").write_text(time.strftime("%Y-%m-%d %H:%M") + "\n")
    words = sum(s["words"] for s in secs)
    total = seconds(dst)
    print(f"-> {dst}: {len(secs)} chapters, {words} words, {total / 60:.1f} min "
          f"({60 * words / total:.0f} wpm incl. {m['gap']:g} s gaps)")
    return True


def status(m):
    print(f"{m['voice']} / {m['model']} / {pace(m['target_wpm'])} / {m['gcp_project']}")
    for s in m["sections"]:
        extra = (f"{s['seconds']:6.1f} s  {s['raw_wpm']:>5} -> {s['wpm']} wpm" if s["status"] == "done"
                 else s.get("error") or "")
        print(f"  {s['name']:<44} {s['words']:>4} w  {s['status']:<9} {extra}"
              + (f"  !! {s['check']}" if s.get("check") else ""))


m = prepare()
if a.status:
    status(m)
elif a.prepare_only:
    print(f"{len(m['sections'])} chapter(s), {sum(s['words'] for s in m['sections'])} words -> {T}")
    status(m)
elif a.join_only:
    join(m)
else:
    if m["target_wpm"] != a.wpm and "--wpm" in sys.argv:   # new pace: re-time the saved raw takes, no new request
        print(f"re-pacing finished chapters {pace(m['target_wpm'])} -> {pace(a.wpm)} from the saved raw takes")
        m["target_wpm"] = a.wpm
        for s in m["sections"]:
            if s["status"] == "done":
                to_pace(m, s, T / f"{s['name']}.raw.wav")
        save(m)
    generate(m)
    join(m) or sys.exit(1)
