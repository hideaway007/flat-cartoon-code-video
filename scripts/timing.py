"""Word-timed shot lists. Copied into <project>/production/ by new_project.py; words.json comes from scripts/words.py.

    import timing
    W = timing.load()                       # production/words.json
    t = W.at("two")                         # start (s) of the first "two" in the narration
    t = W.at("two young", after=6.0)        # a phrase, first match at/after 6.0 s (repeated words)
    a, b = W.span("tied together", after=4)  # start of the first word, end of the last
    W.shot("Technically", "knot")           # (start, end) for a shot covering those words
    T = W.cuts(["This", "Technically", "tied", "Because", "on one"], start=0.0, end=12.63)  # touching shots

    # inside a shot that starts at `st`:
    swaps=[(W.rel(st, "two"), ch("j2b_two"), dict(amp=1.2))]

Matching ignores case and punctuation ("Peru." == "peru", "it's" == "its"); numbers match as written by whisper
("150"). `rel()`/`at()` land LEAD seconds before the word starts (picture slightly ahead of sound reads as "on the
word"; the engine's anticipation squash starts 0.07 s before a swap).
"""
import json, pathlib, re

LEAD = 0.05
_norm = lambda s: re.sub(r"[^a-z0-9]+", "", s.lower())


class Words:
    def __init__(self, words):
        self.words = [dict(w=_norm(w["w"]), raw=w["w"], start=float(w["start"]), end=float(w["end"])) for w in words]
        self.words = [w for w in self.words if w["w"]]

    def find(self, phrase, after=0.0):
        """Index of the first word of the first match of `phrase` starting at/after `after` seconds."""
        toks = [_norm(t) for t in phrase.split() if _norm(t)]
        if not toks:
            raise ValueError("empty phrase")
        ws = self.words
        for i in range(len(ws) - len(toks) + 1):
            if ws[i]["start"] + 1e-6 >= after and all(ws[i + k]["w"] == toks[k] for k in range(len(toks))):
                return i
        near = [w["raw"] for w in ws if w["start"] >= after][:12]
        raise KeyError(f"{phrase!r} not found after {after:.2f}s; next words: {' '.join(near)}")

    def span(self, phrase, after=0.0):
        i = self.find(phrase, after)
        n = len([t for t in phrase.split() if _norm(t)])
        return self.words[i]["start"], self.words[i + n - 1]["end"]

    def at(self, phrase, after=0.0, lead=LEAD):
        return round(max(self.span(phrase, after)[0] - lead, 0.0), 3)

    def rel(self, shot_start, phrase, lead=LEAD):
        """Swap time relative to a shot that starts at `shot_start`; searches from the shot start."""
        return round(self.at(phrase, after=shot_start - 0.3, lead=lead) - shot_start, 3)

    def shot(self, first, last, after=0.0, lead=LEAD):
        """(start, end) of a shot from the word `first` to the word `last` (end = end of `last`)."""
        a = self.at(first, after, lead)
        return a, round(self.span(last, after=a)[1], 3)

    def cuts(self, firsts, end=None, start=None, lead=LEAD):
        """Contiguous shot times from the first word of each shot: [(start, end), ...]; each shot ends where the next
        begins (shots must touch). `end`: end of the last shot (default: end of the last word); `start`: force the
        first shot's start (e.g. 0.0 or the segment start)."""
        ts, after = [], 0.0 if start is None else start
        for f in firsts:
            t = self.at(f, after=after - 0.3, lead=lead)
            ts.append(t); after = t + lead + 0.01
        if start is not None:
            ts[0] = start
        last = end if end is not None else self.words[-1]["end"]
        return [(a, b) for a, b in zip(ts, ts[1:] + [last])]

    def text(self, t0=0.0, t1=1e9):
        return " ".join(w["raw"] for w in self.words if t0 <= w["start"] < t1)


def load(path=None):
    p = pathlib.Path(path) if path else pathlib.Path(__file__).resolve().parent / "words.json"
    if not p.exists():
        raise FileNotFoundError(f"{p} missing: run scripts/words.py <project> first")
    return Words(json.loads(p.read_text()))
