"""Scenery library (flat-cartoon-code-video): code-drawn background plates as layer PNGs for engine.py plates.

A set (see production/sets.py) builds a Plate, draws layers back to front (sky opaque, the rest transparent, each with
a parallax depth) and calls save(name, plate, ground_frac). save() writes assets/bg/<name>_<layer>.png and records
size, layers and the ground line in assets/bg/sets.json, which stage.py reads to place plates and characters.
Helpers: sky_grad, cloud, mountains (shaded peaks + snow caps), ground_layer, patch, texture, tent, wob.
Palette C is a default; sets may pass their own colours. Coordinates are plate px, y down.
"""
import math, pathlib, sys
import numpy as np, cv2
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import toon as T
import engine as _E

PW, PH = round(_E.W * 1.1), round(_E.H * 1.1)   # default plate size: frame + 10 % for camera moves

ROOT = pathlib.Path(__file__).resolve().parent.parent
BG = ROOT / "assets" / "bg"
SS = 2
OL = 8.0          # main outline width, plate px
OL2 = 5.5         # minor outline
BG_INK = (58, 48, 46)  # background outlines: dark but softer than the characters' near-black

import json

C = dict(  # BGR
    sky=(242, 204, 128), cloud=(250, 250, 250), mtn=(190, 166, 150), mtn2=(170, 146, 132), snow=(250, 248, 244),
    snow_sh=(232, 214, 198), hill=(112, 160, 150), ground=(98, 112, 142), ground_dk=(84, 96, 124),
    tent=(52, 132, 236), tent_dk=(40, 102, 190), tent_door=(70, 162, 246), stone=(150, 152, 160), pot=(70, 70, 80),
    lake=(200, 190, 72), sun_sky=(170, 196, 244), warm_mtn=(168, 148, 168), warm_snow=(196, 226, 250),
    warm_floor=(196, 202, 228), warm_floor_dk=(176, 182, 210), wall=(156, 132, 120), wall_dk=(130, 108, 98),
    ice=(242, 226, 206),
)


class Plate:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.layers = []

    def layer(self, name, depth, opaque=False):
        pt = T.Painter(self.w * SS, self.h * SS, [[SS, 0, 0], [0, SS, 0]], wobble=2.0, shade=0.12, shade_d=40,
                       min_shade=60, ink=BG_INK, seed=len(self.layers) * 101)
        if opaque:
            pt.img[..., 3] = 255
        self.layers.append((name, depth, pt))
        return pt


def sky_grad(pt, top, bottom, horizon=0.65):
    """soft vertical sky gradient (the reference skies are not flat)."""
    h, w = pt.img.shape[:2]
    u = np.clip(np.linspace(0, 1, h) / horizon, 0, 1)[:, None, None]
    col = np.array(top, np.float32) * (1 - u) + np.array(bottom, np.float32) * u
    pt.img[..., :3] = np.broadcast_to(col, (h, 1, 3)).astype(np.uint8)
    pt.img[..., 3] = 255


def texture(pt, x0, x1, y0, y1, color, n, seed, length=40, curve=False):
    """sparse short strokes (grass/pebbles/snow drifts), denser and longer toward the viewer."""
    rng = np.random.default_rng(seed)
    for _ in range(n):
        u = rng.uniform(0, 1) ** 0.7
        y = y0 + (y1 - y0) * u
        x = rng.uniform(x0, x1)
        L = length * (0.4 + u)
        pts = [(x - L / 2, y), (x, y - (L * 0.12 if curve else 0)), (x + L / 2, y)]
        pt.line(T.crom(pts, False, 4) if curve else pts, 3 + 2 * u, color)


def wob(pts, amp, seed, closed=True):
    """slight hand-drawn wobble along a dense polyline."""
    pts = np.asarray(pts, float)
    rng = np.random.default_rng(seed)
    n = len(pts)
    k = max(4, n // 6)
    noise = np.interp(np.arange(n), np.linspace(0, n - 1, k), rng.uniform(-1, 1, k))
    d = np.roll(pts, -1, 0) - np.roll(pts, 1, 0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1) / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-6)
    return pts + nrm * noise[:, None] * amp


def cloud(pt, cx, cy, w, seed=0):
    rng = np.random.default_rng(seed)
    n = 5
    pts = []
    for i in range(n + 1):  # bumps on top
        x = cx - w / 2 + w * i / n
        pts.append((x, cy - w * (0.16 + 0.12 * math.sin(math.pi * i / n)) - rng.uniform(0, w * 0.05)))
    pts = [(cx + w / 2 + w * 0.06, cy)] + pts[::-1][:0] + pts[::-1] + [(cx - w / 2 - w * 0.06, cy)]
    pts = [(cx + w * 0.52, cy - w * 0.02)] + [(x, y) for x, y in reversed(pts[1:-1])][::-1] + [(cx - w * 0.52, cy)]
    bump = []
    for i in range(7):
        x = cx - w * 0.45 + w * 0.9 * i / 6
        bump.append((x, cy - w * (0.10 + 0.13 * math.sin(math.pi * i / 6)) - rng.uniform(0, w * 0.04)))
    poly = [(cx - w * 0.55, cy)] + bump + [(cx + w * 0.55, cy), (cx, cy + w * 0.03)]
    pt.shape(T.crom(poly, True, 8), C["cloud"], OL2)


def ridge(x0, x1, base, peaks, jag, seed, step=30):
    rng = np.random.default_rng(seed)
    xs = np.arange(x0, x1 + step, step, dtype=float)
    hgt = np.zeros_like(xs)
    for px, ph, slope in peaks:
        hgt = np.maximum(hgt, ph - np.abs(xs - px) * slope)
    hgt += rng.uniform(-jag, jag, len(xs)) * (hgt > 0)
    return np.stack([xs, base - np.maximum(hgt, 0)], 1)


def mountains(pt, x0, x1, base, peaks, fill, seed, snow=C["snow"], cap=0.35, bottom=None):
    r = ridge(x0, x1, base, peaks, 10, seed)
    bottom = bottom if bottom is not None else base + 400
    poly = np.vstack([[[x0, bottom]], r, [[x1, bottom]]])
    pt.shape(wob(poly, 3, seed), fill, OL)
    dark = tuple(int(c * 0.84) for c in fill)
    for px, ph, slope in peaks:  # shadow side of each peak (light from the left)
        if ph < 40:
            continue
        pt.shape([(px, base - ph + 4), (px + 0.82 * ph / slope, base + 2), (px + 0.12 * ph / slope, base + 2)],
                 dark, 0, shade=False)
    rng = np.random.default_rng(seed + 1)
    for px, ph, slope in peaks:  # snow caps: ridge near the peak + zigzag lower edge
        capd = ph * cap
        sel = r[(base - r[:, 1]) > ph - capd]
        sel = sel[np.abs(sel[:, 0] - px) < capd / slope + 5]
        if len(sel) < 2:
            continue
        xl, xr = sel[0, 0], sel[-1, 0]
        zz = []
        for i, x in enumerate(np.linspace(xr, xl, 7)):
            ry = np.interp(x, r[:, 0], r[:, 1])
            if i in (0, 6):
                zz.append((x, ry + 2)); continue
            y = base - ph + capd * (0.95 if i % 2 else 0.6) + rng.uniform(-8, 8)
            zz.append((x, max(y, ry + 14)))
        pt.shape(np.vstack([sel, zz]), snow, OL2)
        cap_sh = [p for p in np.vstack([sel, zz]) if p[0] >= px - 2]
        if len(cap_sh) > 2:
            pt.shape([(px, base - ph + 6)] + [tuple(p) for p in cap_sh if p[1] > base - ph + 6],
                     tuple(int(c * 0.9) for c in snow), 0, shade=False)


def ground_layer(pt, w, h, gy, fill, seed, wave=6):
    xs = np.linspace(-20, w + 20, 40)
    rng = np.random.default_rng(seed)
    top = np.stack([xs, gy + np.sin(xs / 300 + seed) * wave + rng.uniform(-1, 1, len(xs))], 1)
    pt.shape(np.vstack([top, [[w + 20, h + 20], [-20, h + 20]]]), fill, OL)


def patch(pt, cx, cy, rx, ry, fill, seed):
    rng = np.random.default_rng(seed)
    a = np.linspace(0, 2 * math.pi, 9, endpoint=False)
    pts = np.stack([cx + rx * np.cos(a) * rng.uniform(0.75, 1.1, 9), cy + ry * np.sin(a) * rng.uniform(0.75, 1.1, 9)], 1)
    pt.shape(T.crom(pts, True, 6), fill, 0)


def tent(pt, x0, x1, base):
    w = x1 - x0
    h = w * 0.62
    cx = (x0 + x1) / 2
    dome = [(x0, base), (x0 + w * 0.08, base - h * 0.55), (cx - w * 0.1, base - h * 0.97), (cx + w * 0.12, base - h),
            (x1 - w * 0.08, base - h * 0.55), (x1, base)]
    pt.shape(T.crom(dome, False, 10).tolist() + [(x1, base + 6), (x0, base + 6)], C["tent"], OL)
    pt.line(T.crom([(cx - w * 0.05, base - h * 0.98), (cx - w * 0.2, base - h * 0.5), (cx - w * 0.24, base)], False, 8), OL2)
    pt.line(T.crom([(cx + w * 0.1, base - h), (cx + w * 0.28, base - h * 0.5), (cx + w * 0.34, base)], False, 8), OL2)
    door = [(cx - w * 0.14, base), (cx - w * 0.02, base - h * 0.62), (cx + w * 0.2, base)]
    pt.shape(T.crom(door, False, 8).tolist(), C["tent_door"], OL2)
    pt.shape([(x0 - 6, base - 4), (x1 + 6, base - 4), (x1 + 6, base + 14), (x0 - 6, base + 14)], C["tent_dk"], OL2)


def save(name, plate, ground_frac, proj=None):
    """write the layers and register the set in assets/bg/sets.json (layers back to front, depths, size, ground).
    proj (map plates): {"lon0", "lat0", "lon1", "lat1"} equirectangular bounds (lon0/lat0 = top-left corner), read by
    stage.lonlat and the overlay `route`; plate x = (lon-lon0)/(lon1-lon0)*w, y = (lat0-lat)/(lat0-lat1)*h."""
    BG.mkdir(parents=True, exist_ok=True)
    layers = []
    for lname, depth, pt in plate.layers:
        im = cv2.resize(pt.img, (plate.w, plate.h), interpolation=cv2.INTER_AREA)
        p = BG / f"{name}_{lname}.png"
        cv2.imwrite(str(p), im)
        layers.append(dict(src=str(p.relative_to(ROOT)), depth=depth, opaque=lname == plate.layers[0][0]))
    meta_p = BG / "sets.json"
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    meta[name] = dict(size=[plate.w, plate.h], ground=ground_frac, layers=layers)
    if proj:
        meta[name]["proj"] = {k: float(proj[k]) for k in ("lon0", "lat0", "lon1", "lat1")}
    meta_p.write_text(json.dumps(meta, indent=1))
    return layers


def build(sets, only=()):
    """run set functions (dict name -> fn), then write production/review/sets.jpg (each set with its ground line)."""
    tiles = []
    for name, fn in sets.items():
        if only and name not in only:
            continue
        layers = fn()
        comp = None
        for L in layers:
            im = cv2.imread(str(ROOT / L["src"]), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
            a = im[..., 3:4] if im.shape[2] == 4 else 1.0
            comp = im[..., :3].copy() if comp is None else comp * (1 - a) + im[..., :3] * a
        g = json.loads((BG / "sets.json").read_text())[name]["ground"]
        comp = (np.clip(comp, 0, 1) * 255).astype(np.uint8)
        y = int(comp.shape[0] * g)
        cv2.line(comp, (0, y), (comp.shape[1], y), (0, 200, 0), 4)
        cv2.putText(comp, name, (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0, 0, 230), 5)
        tiles.append(cv2.resize(comp, (640, int(comp.shape[0] * 640 / comp.shape[1]))))
        print(name, "ground", g, [L["src"] for L in layers])
    if not tiles:
        return
    hh = max(t.shape[0] for t in tiles)
    tiles = [cv2.copyMakeBorder(t, 0, hh - t.shape[0], 0, 6, cv2.BORDER_CONSTANT, value=(40, 40, 40)) for t in tiles]
    while len(tiles) % 3:
        tiles.append(np.full_like(tiles[0], 40))
    out = ROOT / "production" / "review" / "sets.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]),
                [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(out)
