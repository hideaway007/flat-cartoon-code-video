# Writing the script (history / science explainers)

The script decides most of the result: the reference channel's top video (1.6 M views) wins on its opening and its
question, not on drawing. Write it before any visuals; the user approves it before production.

## Length and pace
- 默认用用户选定的第③版「紧凑短视频叙事」（Fenrir，详见 tts.md）：以试听实测约 178 词/分钟估算，1,700-2,300 词约 10-13 分钟。7-12 章；严肃段落和额外画面留白另算，以实际配音为准。
- Short sentences, concrete nouns, numbers people can picture ("taller than you", "200 km of tunnels").
- One idea per sentence; every 2-3 sentences something new happens that can be shown.

## Title
A question with a paradox or a surprise, under ~60 characters:
"Why Knights Stopped Using Shields", "Were War Elephants Actually Useful?", "The ENTIRE History of the Samurai".
Patterns: Why did X stop/never/suddenly ...? / Was X actually ...? / How did X beat Y? / The ENTIRE history of X /
What happened to X? / Why X was a death trap.

## Cold open (first 20-40 s), pick one
1. **Second person in the scene**: "You're standing on a muddy hillside in 1346, holding ..." -> stakes -> the question.
2. **Paradox**: state the strange fact, then "So why ...?" ("You left your shield behind. On purpose.")
3. **Reversal teaser** for full histories: "They ruled Japan for 700 years. What finally finished them off? Winning."
End the open with the question the video answers, then the first chapter starts.

## Chapter structure by format
- **Dynasty / kingdom speed-run**: origin problem -> founder's move -> golden age (one vivid scene) -> the flaw that
  grows -> crises (2-3 quick ones) -> the fall -> what it left behind -> callback to the open.
- **Invention / discovery**: the world before (a daily pain) -> failed attempts (funny) -> the key person and the
  insight scene -> the obstacle (money, rivals, physics) -> breakthrough demo -> how it spread -> twist/legacy.
- **Biography**: one defining moment as the open -> childhood detail that explains it -> rise in 3 steps ->
  the big decision -> cost/fall -> legacy; keep the person doing things on screen.
- **Myth**: set the world and its rules -> hero and want -> 3 trials escalating -> the twist -> what the myth meant
  to the people who told it (one line of real history).
- **Weapon / tactic "why" question** (the reference channel's core): the situation -> naive answer -> why it fails ->
  the real mechanism step by step -> the counter it provoked -> why it ended.

## Script file format (production/script.md)
One line per beat, so shots can be planned straight from it:
```
## 1 Cold open
You're standing on a muddy hillside in 1346. | SET field_crecy, YOU (longbowman) close, push in
In front of you: thousands of crossbowmen. | wide crowd shot, LABEL "Genoese crossbowmen"
On paper, you should lose this. | STAMP "2:1", Joe gulp
```
Visual hints use the overlay names (CIRCLE, LABEL, ARROW, ROUTE, MAP, COUNTER, BARS, TITLE, STAMP, SPOTLIGHT, METER,
EMOTE, SEPIA) so the shot writer knows what to build.

## Facts
History must be right: keep a `production/sources.md` (book/article per chapter). Round numbers honestly ("at least
twice the size"), mark legends as legends. Re-check names and dates in words.txt after TTS.

## Voice and music
用户自己的稿件，默认由 Gemini TTS + Fenrir 用第③版「紧凑短视频叙事」配音，保留原生语速（试听约 178 词/分钟，
`scripts/narrate.py`，详见 [tts.md](tts.md)）；也可使用用户自己的录音。licensed music with attribution in the description. The spoken text is everything before ` | ` on a line;
put stage notes that must not be read in `( )` on their own line.
Never reuse another channel's script wording, characters or narration.
