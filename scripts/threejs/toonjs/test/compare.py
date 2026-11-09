"""Compare test/js/<id>.png with test/ref/<id>.png (both straight alpha, composited on white).
Per case: shape IoU (alpha > 50 %), bad px % (colour diff > 40 among drawn pixels), mean diff.
Writes test/report.json and test/sheet_<n>.jpg (ref | js | diff, worst cases first). Usage: $PY compare.py [prefix ...]"""
import json, pathlib, sys
import numpy as np, cv2

HERE = pathlib.Path(__file__).resolve().parent
cases = json.loads((HERE / "cases.json").read_text())
only = sys.argv[1:]
OUT = HERE / ("out_" + "_".join(o.rstrip("_") for o in only) if only else "out_all")   # per-prefix: parallel runs do not clash
OUT.mkdir(exist_ok=True)


def load(p):
    im = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if im is None:
        return None
    a = im[..., 3:4].astype(np.float32) / 255
    return im[..., :3].astype(np.float32) * a + 255 * (1 - a), im[..., 3] > 127


rep, rows = {}, []
for c in cases:
    if only and not any(c["id"].startswith(o) for o in only):
        continue
    ref = load(HERE / "ref" / f"{c['id']}.png")
    js = load(HERE / "js" / f"{c['id']}.png")
    if js is None or js[0].shape != ref[0].shape:
        rep[c["id"]] = {"ran": False}
        rows.append((1e9, c["id"], ref[0], None, None))
        continue
    (ri, rm), (ji, jm) = ref, js
    d = np.abs(ji - ri).max(2)
    union = rm | jm
    drawn = union | (d > 40)
    m = {"ran": True, "iou": round(float((rm & jm).sum() / max(union.sum(), 1)), 4),
         "bad_pct": round(float((d[drawn] > 40).mean() * 100), 2) if drawn.any() else 0.0,
         "mean": round(float(d[drawn].mean()), 2) if drawn.any() else 0.0}
    rep[c["id"]] = m
    heat = np.full_like(ri, 255)
    heat[d > 12] = (170, 170, 250)
    heat[d > 40] = (40, 40, 230)
    rows.append((m["bad_pct"] + 100 * (1 - m["iou"]), c["id"], ri, ji, heat))

ran = [v for v in rep.values() if v["ran"]]
summary = {"cases": len(rep), "ran": len(ran),
           "median_iou": float(np.median([v["iou"] for v in ran])) if ran else None,
           "median_bad_pct": float(np.median([v["bad_pct"] for v in ran])) if ran else None,
           "worst": sorted(((k, v) for k, v in rep.items()), key=lambda kv: -(1e9 if not kv[1]["ran"] else kv[1]["bad_pct"] + 100 * (1 - kv[1]["iou"])))[:8]}
(OUT / "report.json").write_text(json.dumps({"summary": summary, "cases": rep}, indent=1))
print(json.dumps(summary, indent=1))

rows.sort(key=lambda r: -r[0])
TH = 260
for f in OUT.glob("sheet_*.jpg"):
    f.unlink()
lines = []
for score, cid, ri, ji, heat in rows:
    tiles = []
    for im, lab in ((ri, "ref"), (ji, "js"), (heat, "diff")):
        if im is None:
            im = np.full_like(ri, 230)
        t = cv2.resize(im.astype(np.uint8), (max(1, int(im.shape[1] * TH / im.shape[0])), TH), interpolation=cv2.INTER_AREA)
        tiles.append(t)
    row = np.hstack(tiles)
    row = np.vstack([np.full((30, row.shape[1], 3), 40, np.uint8), row])
    m = rep[cid]
    txt = f"{cid}  " + (f"IoU {m['iou']:.3f}  bad {m['bad_pct']:.1f}%" if m["ran"] else "NO JS IMAGE")
    cv2.putText(row, txt, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1, cv2.LINE_AA)
    lines.append(row)
for i in range(0, len(lines), 6):
    chunk = lines[i:i + 6]
    W = max(r.shape[1] for r in chunk)
    sheet = np.vstack([np.hstack([r, np.full((r.shape[0], W - r.shape[1], 3), 255, np.uint8)]) for r in chunk])
    cv2.imwrite(str(OUT / f"sheet_{i // 6:02d}.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
