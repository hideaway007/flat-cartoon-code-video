#!/usr/bin/env python3
"""Convert production/words.json into lineless/src/words_data.js for syllable-exact lip-sync gating (`setWords`).
Usage: python3 export_words_js.py <words.json> <out_words_data.js>"""
import json, pathlib, re, sys

def count_syllables(word: str) -> int:
    w = re.sub(r"[^a-zA-Z]", "", word).lower()
    if not w:
        return 1
    if w.isdigit():
        return 2
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and n > 1 and not w.endswith("le"):
        n -= 1
    return max(1, min(4, n))

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src = pathlib.Path(sys.argv[1])
    dst = pathlib.Path(sys.argv[2])
    raw = json.loads(src.read_text(encoding="utf-8"))
    words = raw.get("words", raw) if isinstance(raw, dict) else raw
    triples = []
    for item in words:
        if isinstance(item, dict):
            t0 = round(float(item.get("start", item.get("t0", 0))), 3)
            t1 = round(float(item.get("end", item.get("t1", t0 + 0.18))), 3)
            txt = str(item.get("word", item.get("text", "")))
        else:
            t0, t1, txt = round(float(item[0]), 3), round(float(item[1]), 3), str(item[2])
        if t1 > t0:
            triples.append([t0, t1, count_syllables(txt)])
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(f"// Auto-generated from {src.name} ({len(triples)} words)\nsetWords({json.dumps(triples, separators=(',', ':'))});\n", encoding="utf-8")
    print(f"wrote {dst} ({len(triples)} words)")

if __name__ == "__main__":
    main()
