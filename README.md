# flat-cartoon-code-video

An agent skill (Claude Code / Codex) for narrated 2D cartoon explainer videos where **everything is drawn in code**:
characters, costumes, props, crowds, backgrounds, maps and on-screen annotations, in a flat marker-outline,
white-egg-head style. No image generation. Every change re-renders in seconds.

Typical topics: dynasty and kingdom speed-runs, invention and discovery histories, biographies, myths, "why did X"
questions, and short story films.

## What is inside

| Path | What it does |
| --- | --- |
| `SKILL.md` | The workflow the agent follows: script -> voice -> project -> word timing -> cast -> sets -> shots -> check -> render |
| `references/script.md` | Script templates per format (dynasty, invention, biography, myth, "why" question) |
| `references/tts.md` | Narration with Google Gemini TTS (voice Fenrir, American English, native pace) |
| `references/api.md` | Pose fields, layer keys and helpers |
| `scripts/toon.py`, `poses.py`, `costumes.py`, `crowds.py` | Vector character rig with tweened poses, era costumes, crowds |
| `scripts/bust.py` | Talking marble bust on a plinth (F in History's teacher), drawn as a toon layer |
| `scripts/scenery.py`, `scenery_kits.py`, `overlays.py` | Code-drawn parallax sets, real-coastline maps, explainer overlays |
| `scripts/engine.py`, `stage.py`, `timing.py`, `render_all.py` | Shot engine, word-timed cuts, parallel segment rendering |
| `scripts/narrate.py` | Script -> chapters -> Gemini TTS -> `assets/audio/narration.wav` |
| `scripts/words.py` | Word timestamps with mlx-whisper |
| `scripts/new_project.py` | Creates a project from `assets/templates/` |

## Install

```bash
git clone https://github.com/hideaway007/flat-cartoon-code-video ~/.claude/skills/flat-cartoon-code-video
# Codex: clone or symlink into ~/.codex/skills/ instead
```

Requirements: Python 3 with numpy and opencv-python, ffmpeg on PATH, `mlx-whisper` for word timing (Apple Silicon).
For narration: the Google Cloud CLI (`gcloud auth login`) and a project with Gemini TTS access, given by
`--gcp-project`, the `GEMINI_TTS_PROJECT` environment variable, a `local.json` (`{"gcp_project": "..."}`) next to
`SKILL.md`, or `gcloud config get-value project`.

Machine-specific notes (paths to your Python, sample renders) can go in a `LOCAL.md` next to `SKILL.md`; it is
git-ignored and the skill reads it first.

## Licenses

- Code and docs: MIT, see `LICENSE`.
- Fonts in `assets/fonts/` (Bangers, Lilita One): SIL Open Font License 1.1, license texts alongside.
- Map data in `assets/geo/`: Natural Earth (public domain).
