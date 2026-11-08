"""Crowds: rows of code-drawn people as cheap engine `char` layers (flat-cartoon-code-video library).

Every distinct member pose is drawn once with toon.draw_character into a transparent PNG (cached under
<project>/assets/cache/crowd/, keyed by a hash of design + pose + scale), then the members of one row are composited
into a few strip PNGs (one per idle "phase group"), so a crowd of 30 costs a handful of image layers per frame
instead of 30 character renders.

    import crowds as CR, costumes as CO, poses as PO
    gy = S.ground_y("b02")
    layers += CR.crowd(CO.LEGIONARY, PO.spear_shield(), n=9, rows=3, x=(180, 1740), y=gy + 140, scale=0.30,
                       vary=dict(scale=0.05, colors=dict(tunic=[(52, 48, 196), (40, 40, 170)])),
                       keys=[(W.rel(st, "attack"), PO.cheer_sword(heldL="gladius"))],   # whole crowd swaps pose
                       march=None)                                                       # or dict(dx=300, period=0.5)

Front row first in the arguments, layers come back back-to-front (append them after the set plates, before the
main characters). Back rows are smaller (row_scale), higher on screen (row_dy) and hazier (haze).
Strips are drawn with the engine's `char` renderer: motions bob/breathe/drift, `swaps` for timed pose changes.
"""
import hashlib, json, math, pathlib, random, sys
import numpy as np, cv2

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import toon as T

ROOT = HERE.parent          # <project> when this file lives in <project>/production/
CACHE = "assets/cache/crowd"


def _h(obj):
    return hashlib.sha1(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:16]


def sprite(D, p, scale, flip=False, haze=0.0, haze_col=(0.80, 0.84, 0.88), shadow=0.28, root=None, blur=0.0):
    """draw one character to a premultiplied float BGRA array at `scale` px/unit. Returns (img, (ax, ay)) where
    (ax, ay) is the feet anchor (char origin) in sprite px. Cached as a PNG (straight alpha) under assets/cache."""
    root = pathlib.Path(root or ROOT)
    key = _h(["v1", D, p, round(scale, 4), flip, round(haze, 3), haze_col, shadow] + ([round(blur, 2)] if blur else []))
    png = root / CACHE / f"m_{key}.png"
    meta = png.with_suffix(".json")
    if png.exists() and meta.exists():
        im = cv2.imread(str(png), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        im[..., :3] *= im[..., 3:4]
        return im, tuple(json.loads(meta.read_text())["anchor"])
    x0, y0, x1, y1 = T.char_box(D, p)
    w, h = int(math.ceil((x1 - x0) * scale)) + 4, int(math.ceil((y1 - y0) * scale)) + 4
    ox = (x1 * scale + 2) if flip else (-x0 * scale + 2)
    oy = -y0 * scale + 2
    A = np.array([[-scale if flip else scale, 0, ox], [0, scale, oy]], np.float64)
    pt = T.Painter(w * T.SS, h * T.SS, A * T.SS)
    T.draw_character(pt, D, p)
    T.silhouette(pt, T.LINE * 0.55)
    small = cv2.resize(pt.img, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255   # premultiplied
    if haze > 0:
        small[..., :3] = small[..., :3] * (1 - haze) + np.array(haze_col, np.float32) * small[..., 3:4] * haze
    if shadow:   # soft contact shadow under the feet, behind the character
        sh = np.zeros((h, w), np.float32)
        cv2.ellipse(sh, (int(ox), int(oy)), (max(3, int(150 * scale)), max(2, int(22 * scale))), 0, 0, 360, 1.0, -1,
                    cv2.LINE_AA)
        sh = cv2.GaussianBlur(sh, (0, 0), max(1.5, 7 * scale)) * shadow * (1 - haze * 0.6)
        a = small[..., 3:4]
        small[..., :3] = small[..., :3]                  # shadow colour is black: only alpha grows
        small[..., 3:4] = a + sh[..., None] * (1 - a)
    if blur > 0.3:   # depth of field: soften the whole premultiplied sprite (pad first so the blur can spread)
        pad = int(blur * 3) + 2
        small = cv2.copyMakeBorder(small, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
        k = int(blur * 3) * 2 + 1
        small = cv2.GaussianBlur(small, (k, k), blur)
        ox, oy, w, h = ox + pad, oy + pad, w + 2 * pad, h + 2 * pad
    ys, xs = np.nonzero(small[..., 3] > 0.004)
    if len(xs) == 0:
        return small[:1, :1], (0.0, 0.0)
    cx0, cy0, cx1, cy1 = max(xs.min() - 2, 0), max(ys.min() - 2, 0), min(xs.max() + 3, w), min(ys.max() + 3, h)
    img = small[cy0:cy1, cx0:cx1].copy()
    anchor = (ox - cx0, oy - cy0)
    png.parent.mkdir(parents=True, exist_ok=True)
    st = img.copy()
    st[..., :3] /= np.maximum(st[..., 3:4], 1e-4)
    cv2.imwrite(str(png), (np.clip(st, 0, 1) * 255 + 0.5).astype(np.uint8))
    meta.write_text(json.dumps(dict(anchor=anchor)))
    return img, anchor


def variants(D, n, vary=None, seed=0):
    """n design dicts made from D (or a list of designs, cycled) with random variation:
    vary = dict(colors={key: [BGR, ...]}, headwear=[...], moustache=[...], beard=[...], style=[...],
                hair=[BGR, ...], any_key=[values...])    (scale/flip/pose jitter are handled by crowd())."""
    rng = random.Random(seed)
    bases = D if isinstance(D, (list, tuple)) else [D]
    vary = vary or {}
    out = []
    for i in range(n):
        d = dict(bases[i % len(bases)])
        for k, vals in vary.get("colors", {}).items():
            d[k] = tuple(rng.choice(vals))
        for k, vals in vary.items():
            if k in ("colors", "scale", "flip", "jitter", "pose"):
                continue
            d[k] = rng.choice(vals)
        out.append(d)
    return out


def _jitter(p, rng, amount):
    q = dict(p)
    if amount:
        q["lean"] = p["lean"] + rng.uniform(-3, 3) * amount
        q["head"] = p["head"] + rng.uniform(-6, 6) * amount
        q["look"] = (p["look"][0] + rng.uniform(-4, 4) * amount, p["look"][1])
    return q


def walk_cycle(p, n=4):
    """n poses of a walk-in-place cycle (feet lift + free arms swing) from pose p (held props keep their arm)."""
    out = []
    if p.get("gait", "stand") in ("walk", "trot", "gallop"):   # horse.py rig: n frames of the gait cycle (min 8)
        n = max(n, 8)
        return [dict(p, stride=(p.get("stride", 0.0) + i / n) % 1.0) for i in range(n)]
    for i in range(n):
        s = math.sin(2 * math.pi * i / n + math.pi / 2)
        q = dict(p)
        q["lift"] = (max(0, s) * 40, max(0, -s) * 40)
        if q.get("heldL", "none") == "none":
            q["hL"] = (p["hL"][0] + 40 * s, p["hL"][1])
        if q.get("heldR", "none") == "none":
            q["hR"] = (p["hR"][0] - 40 * s, p["hR"][1])
        q["head"] = p["head"] + 2.0 * s
        out.append(q)
    return out


def crowd(D, pose, n=8, rows=1, x=(240, 1680), y=900, scale=0.3, row_dy=-46, row_scale=0.86, row_dn=0,
          keys=None, vary=None, seed=1, groups=3, march=None, idle=True, haze=0.0, haze_step=0.16,
          haze_col=(0.80, 0.84, 0.88), flip=False, jitter=1.0, shadow=0.28, depth=1.0, root=None, name="crowd",
          blur=0.0, blur_step=0.0):
    """rows of people as engine `char` layers (back row first).
    D: design or list of designs; pose: pose dict (or callable); n: people in the front row (row_dn: +/- per row
    further back); x: (left, right) screen span of the front row (back rows are staggered by half a spacing);
    y: feet y of the front row; scale: px per unit of the front row; row_dy/row_scale: per row further back;
    keys: [(t_rel, pose), ...] timed pose changes for everyone (members' variation kept);
    vary: see variants() + scale (relative +-, e.g. 0.05), flip (probability of facing the other way);
    march: dict(dx=px over the shot, dur=shot seconds, period=0.5 s per step cycle, bob=px) -> walk cycle + drift;
    idle: small bob/breathe per phase group; haze: haze of the front row (+haze_step per row back);
    jitter: random lean/head/look per member (0 = identical poses).
    blur: depth-of-field blur (px) of the front row, + blur_step per row further back (e.g. blur_step=1.5)."""
    root = pathlib.Path(root or ROOT)
    vary = dict(vary or {})
    pose = pose() if callable(pose) else pose
    keys = [(0.0, pose)] + [(t, (pk() if callable(pk) else pk)) for t, pk in (keys or [])]
    layers = []
    rng = random.Random(seed)
    for r in reversed(range(rows)):
        nr = max(1, n + row_dn * r)
        sc_r = scale * row_scale ** r
        y_r = y + row_dy * r
        hz = min(0.85, haze + haze_step * r)
        bl = blur + blur_step * r
        x0, x1 = x
        sp = (x1 - x0) / max(nr - 1, 1) if nr > 1 else 0
        stagger = (sp / 2) * (r % 2)
        designs = variants(D, nr, vary, seed=seed * 101 + r)
        members = []
        for i in range(nr):
            mrng = random.Random(seed * 7919 + r * 131 + i)
            ms = sc_r * (1 + mrng.uniform(-1, 1) * vary.get("scale", 0.0))
            mf = flip != (mrng.random() < vary.get("flip", 0.0))
            mx = x0 + sp * i + stagger + mrng.uniform(-0.12, 0.12) * sp
            seq = []
            for t, pk in keys:
                pj = _jitter(T.pose(**pk), mrng, jitter)
                seq.append((t, walk_cycle(pj) if march else [pj]))
            members.append(dict(D=designs[i], s=ms, flip=mf, x=mx, seq=seq, g=i % groups))
        for g in range(groups):
            mem = [m for m in members if m["g"] == g]
            if not mem:
                continue
            layers.append(_strip_layer(mem, y_r, hz, haze_col, shadow, march, idle, g, r, keys, depth, root,
                                       f"{name}_r{r}g{g}", bl))
    return layers


def _strip_layer(mem, y_r, hz, haze_col, shadow, march, idle, g, r, keys, depth, root, tag, blur=0.0):
    """composite the members of one phase group into strip PNGs (one per key pose / walk frame), same geometry."""
    frames = []        # list of (t, frame_index) -> per frame a list of (sprite, anchor, x)
    nk = len(mem[0]["seq"])
    nf = len(mem[0]["seq"][0][1])
    sprites = {}
    for m in mem:
        for ki in range(nk):
            for fi in range(nf):
                p = m["seq"][ki][1][fi]
                sprites[(id(m), ki, fi)] = sprite(m["D"], p, m["s"], m["flip"], hz, haze_col, shadow, root, blur)
    # common canvas
    lo_x, lo_y, hi_x, hi_y = 1e9, 1e9, -1e9, -1e9
    for m in mem:
        for ki in range(nk):
            for fi in range(nf):
                im, (ax, ay) = sprites[(id(m), ki, fi)]
                lo_x, hi_x = min(lo_x, m["x"] - ax), max(hi_x, m["x"] - ax + im.shape[1])
                lo_y, hi_y = min(lo_y, -ay), max(hi_y, -ay + im.shape[0])
    W_, H_ = int(math.ceil(hi_x - lo_x)) + 2, int(math.ceil(hi_y - lo_y)) + 2
    srcs = {}
    for ki in range(nk):
        for fi in range(nf):
            key = _h([tag, [(m["x"], m["s"], m["flip"], _h(m["D"]), _h(m["seq"][ki][1][fi])) for m in mem], hz])
            rel = f"{CACHE}/s_{key}.png"
            path = root / rel
            if not path.exists():
                buf = np.zeros((H_, W_, 4), np.float32)
                for m in sorted(mem, key=lambda m: m["x"]):
                    im, (ax, ay) = sprites[(id(m), ki, fi)]
                    px, py = int(round(m["x"] - ax - lo_x)), int(round(-ay - lo_y))
                    h, w = im.shape[:2]
                    d = buf[py:py + h, px:px + w]
                    d *= (1 - im[..., 3:4])
                    d += im
                st = buf.copy()
                st[..., :3] /= np.maximum(st[..., 3:4], 1e-4)
                path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(path), (np.clip(st, 0, 1) * 255 + 0.5).astype(np.uint8))
            srcs[(ki, fi)] = rel
    anchor = (-lo_x, -lo_y)              # screen x=0 / feet line in strip px
    motions = []
    swaps = []
    if march:
        per = march.get("period", 0.5)
        step = per / nf
        dur = march.get("dur", 6.0)
        times = sorted(set([round(step * i, 4) for i in range(1, int((dur + step) / step) + 1)] +
                           [round(k[0], 4) for k in keys[1:]]))
        for t in times:   # walk frames every step; a key pose change switches at its own time too
            fi = int(round(t / step)) % nf
            ki = max(i for i in range(len(keys)) if keys[i][0] <= t + 1e-6)
            swaps.append((t, srcs[(ki, fi)], dict(amp=0.0, xf=0.03)))
        if march.get("bob", 4):
            motions.append(dict(type="bob", amp=march.get("bob", 4) * (0.86 ** r), period=per / 2))
        if march.get("dx") or march.get("dy"):
            motions.append(dict(type="drift", dur=dur, dx=march.get("dx", 0), dy=march.get("dy", 0), ease="linear"))
        src0 = srcs[(0, 0)]
    else:
        src0 = srcs[(0, 0)]
        for ki in range(1, len(keys)):
            swaps.append((keys[ki][0], srcs[(ki, 0)], dict(amp=0.6, deg=1.0, xf=0.06)))
        if idle:
            motions.append(dict(type="bob", amp=2.2 * (0.86 ** r), period=1.1 + 0.27 * g + 0.11 * r))
            motions.append(dict(type="breathe", amp=0.006, period=2.4 + 0.3 * g, phase=1.7 * g + 0.6 * r))
    return dict(kind="char", src=src0, pos=(0.0, y_r), scale=1.0, anchor_src=anchor, swaps=swaps, motions=motions,
                shadow=False, halo=None, depth=depth, _crowd=tag)
