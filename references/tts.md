# Narration: Google Gemini TTS, Fenrir, native pace (~191 wpm)

The confirmed English voice line (chosen by ear, 2026-11-07): Gemini 3.8 Flash TTS,
prebuilt voice **Fenrir**, natural General American male storyteller, grounded and resonant, energy from stress and
pitch, never shouting. Puck (the first The Rope audio) and the Mandarin Iapetus audition are not this line.

**Pace: keep Google's own pace, no time-stretching** (decided 2026-11-07). With the style prompt below Fenrir reads
about 191 wpm. History: 165 (atempo 0.86) was rejected as "stretched", 175 (atempo 0.92) was tried, then the untouched
take won. The audition samples (165 / 175 / 191) are listed in `LOCAL.md`.

## Run

```bash
python3 $K/narrate.py <project> --prepare-only   # chapters from production/script.md, no Google call; check them
python3 $K/narrate.py <project>                  # TTS 2 chapters at a time, native pace -> assets/audio/narration.wav
python3 $K/narrate.py <project> --status         # measured wpm per chapter
```

`<project>` stands for the real folder path: type the path, not the angle brackets (zsh reads `<` as a redirect).
Then `words.py` as usual (step 2), and re-check names, dates and numbers in `words.txt` against the script.

- Input: `production/script.md` (`## N Title` headings, spoken text before ` | `, lines starting with `(` skipped),
  or `--texts <dir>` with ordered `.txt` files. One chapter = one request; chapters over ~3,500 bytes are split at
  sentence ends.
- Output: `production/tts/` holds `NN_<title>.txt`, the untouched take `NN_<title>.raw.wav`, the edge-trimmed
  `NN_<title>.wav`, `style.txt` and `manifest.json`. Chapters are joined with 0.6 s gaps (`--gap`) into
  `assets/audio/narration.wav`. A narration.wav the script did not make (e.g. the `say` placeholder) is moved to
  `production/tts/replaced_<time>_narration.wav`, not deleted.
- Auth: `gcloud auth print-access-token` (run `gcloud auth login` once). Google Cloud project, first found wins:
  `--gcp-project`, env `GEMINI_TTS_PROJECT`, `gcp_project` in `<skill>/local.json` (not in the repo), then
  `gcloud config get-value project`. The project needs Vertex AI / Gemini TTS access. Endpoint `aiplatform.googleapis.com/v1/projects/<p>/locations/global/publishers/google/models/
  gemini-3.8-flash-tts:generateContent`, text plus `speechMetadata.style`, `speechConfig.voiceConfig.voice`.

## Pace

- The style prompt always asks for "about 165 words per minute" (`ASK_WPM`). That is the prompt of the accepted take,
  and Fenrir reads it at ~191. Asking for a higher number pushes the model toward 200+ and changes the delivery, so
  leave it.
- Default `--wpm native`: each chapter is only trimmed of leading/trailing silence, never stretched. Chapters can
  differ by a few wpm; `--status` shows each chapter's measured pace. If one chapter is clearly faster or slower than
  the rest, `--retry NN` for a new take rather than stretching it.
- Optional `--wpm N` forces an exact pace with ffmpeg `atempo = raw_seconds * N / (words * 60)` on the saved raw takes
  (no new request, no quota); `--wpm native` goes back. Factors outside 0.85-1.20 are flagged. Only use this when the
  user asks for a fixed pace.

## Rules

- Style prompt: `style.txt` / `STYLE` in narrate.py. It keeps the voice description and drops story-specific cues.
  For one-off direction, pass `--style file` (`{wpm}` is filled in with 165). Read the user's words verbatim; never
  rewrite the script inside TTS.
- No automatic re-sends: a chapter left `submitted` or `error` stops the run until it is checked and `--retry`'d,
  so a timeout never spends quota twice. On HTTP 429, wait about a minute and retry that chapter.
- Script length: ~190 wpm means 9-12 min = 1,700-2,300 words.
- Prebuilt voice + style prompt, not a cloned or exclusive voice. A custom voice (Voice Design) hit the project's
  quota twice on 2026-11-07, so it is not used.
- Report the result as WAVs that were made and measured. They have not been listened to word by word.
