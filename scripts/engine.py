"""Compositor for flat-cartoon story shots: 2:1 frame, layered plates + transparent character poses,
camera push/pan with per-layer depth, pose swaps with anticipation/overshoot/settle and a short crossfade,
seamless whole-image deformation (breathe, head tilt, sway, pendulum), contact shadows, rope continuation,
snow, titles, whip/fade shot transitions and a paper-grain overlay. Renders straight to ffmpeg.

Layout: this file lives in <project>/production/; asset paths in shot lists are relative to <project>/.
Character placement: `scale` (source px -> screen px) with feet anchor = bottom centre of the foot groups,
or legacy `height` (alpha bbox height on screen). `anchor="top"` hangs a character from its top edge.
Camera per shot: zoom z(t) and pan p(t); a layer with depth d sees zoom 1+(z-1)*d and pan p*d.
Deformations are inverse maps in character source space: the image is never cut.
"""
import math, json, pathlib, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
# frame size: production/format.json {"w": 1920, "h": 1080} (new_project.py writes it; 16:9 by default).
# Projects without the file keep the original 2:1 (1920x960).
_fmt = ROOT / "production" / "format.json"
W, H = (lambda d: (int(d["w"]), int(d["h"])))(json.loads(_fmt.read_text())) if _fmt.exists() else (1920, 960)
XF = 0.05          # crossfade length of a pose swap (s)

def ease(t, kind="inout"):
    t = min(max(t, 0.0), 1.0)
    if kind == "linear": return t
    if kind == "out": return 1 - (1 - t) ** 3
    return 0.5 - 0.5 * math.cos(math.pi * t)

def lerp(a, b, t): return a + (b - a) * t

# ---------------------------------------------------------------- assets
_cache = {}
def load_rgba(path, max_h=None):
    key = (path, max_h)
    if key in _cache: return _cache[key]
    im = cv2.imread(str(ROOT / path), cv2.IMREAD_UNCHANGED)
    if im is None: raise FileNotFoundError(path)
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    if max_h and im.shape[0] > max_h:
        s = max_h / im.shape[0]
        im = cv2.resize(im, (round(im.shape[1] * s), max_h), interpolation=cv2.INTER_AREA)
    f = im.astype(np.float32) / 255.0
    f[..., :3] *= f[..., 3:4]  # premultiplied BGRA
    _cache[key] = f
    return f

def analyse_char(img):
    """alpha bbox, feet point, top point, and white-face head blobs (neck pivots)."""
    a = img[..., 3]
    ys, xs = np.nonzero(a > 0.1)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    feet = ((x0 + x1) / 2, float(y1))
    top_row = np.nonzero(a[y0:y0 + 6].max(0) > 0.3)[0]
    top = (float(top_row.mean()) if len(top_row) else (x0 + x1) / 2, float(y0))
    # premultiplied white face: rgb close to alpha, alpha high
    rgb = img[..., :3]
    white = ((rgb.min(2) > 0.86) & (a > 0.9)).astype(np.uint8)
    white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(white)
    heads = []
    hgt = y1 - y0
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < (hgt * 0.06) ** 2: continue
        if w < 0.5 * h or w > 2.2 * h: continue  # face-ish aspect
        heads.append(dict(cx=float(cen[i][0]), top=float(y), bottom=float(y + h), w=float(w), h=float(h), area=int(area)))
    heads.sort(key=lambda d: -d["area"])
    heads = heads[:2]
    band = a[max(y1 - int(0.035 * hgt), y0):y1 + 1].max(0) > 0.5
    spans, xs_on = [], np.nonzero(band)[0]
    if len(xs_on):
        start = prev = xs_on[0]
        for x in xs_on[1:]:
            if x - prev > hgt * 0.04:
                spans.append((start, prev)); start = x
            prev = x
        spans.append((start, prev))
    spans = [s for s in spans if s[1] - s[0] > hgt * 0.03] or [(x0, x1)]
    return dict(bbox=(x0, y0, x1, y1), feet=feet, top=top, heads=heads, spans=spans)

# ---------------------------------------------------------------- deformation
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def rot_inv(x, y, cx, cy, ang):
    if isinstance(ang, float) and ang == 0.0: return x, y
    c, s = np.cos(-ang), np.sin(-ang)
    dx, dy = x - cx, y - cy
    return cx + c * dx - s * dy, cy + s * dx + c * dy

def deform_inverse(x, y, info, motions, t, swap_t):
    """x,y: arrays of points in (deformed) source space -> undeformed source coords."""
    x0, y0, x1, y1 = info["bbox"]
    fx, fy = info["feet"]
    hgt = y1 - y0
    for m in motions:
        k = m["type"]
        if k == "pendulum":   # rigid swing about the rope top
            ang = math.radians(m["deg"]) * math.sin(2 * math.pi * t / m["period"] + m.get("phase", 0))
            x, y = rot_inv(x, y, info["top"][0], info["top"][1] - m.get("pivot_above", 0), ang)
        elif k == "sway":     # bend about the feet, weight by height
            ang = math.radians(m["deg"]) * math.sin(2 * math.pi * t / m["period"] + m.get("phase", 0))
            w = smoothstep(y1, y0, y)
            x, y = rot_inv(x, y, fx, fy, ang * w)
        elif k == "breathe":
            s = 1 + m["amp"] * math.sin(2 * math.pi * t / m["period"] + m.get("phase", 0))
            y = fy + (y - fy) / s
        elif k == "headtilt":
            for i, hd in enumerate(info["heads"]):
                ph = m.get("phase", 0) + i * 1.7
                ang = math.radians(m["deg"]) * math.sin(2 * math.pi * t / m["period"] + ph)
                nx, ny = hd["cx"], hd["bottom"] - hd["h"] * 0.05
                band = hd["h"] * 0.45
                wy = smoothstep(ny + band * 0.5, ny - band * 0.5, y)
                wx = 1.0 if len(info["heads"]) == 1 else smoothstep(hd["w"] * 1.6, hd["w"] * 0.9, np.abs(x - hd["cx"]))
                x, y = rot_inv(x, y, nx, ny, ang * wy * wx)
    return x, y

def motion_offset(motions, t, swap_t, scale_px):
    """rigid screen-space offsets -> (dx, dy, extra_scale, rotation_rad)."""
    dx = dy = 0.0; sc = 1.0; rot = 0.0
    for m in motions:
        k = m["type"]
        if k == "tremble":
            a = m["amp"]
            dx += a * (math.sin(t * 37.0) * 0.6 + math.sin(t * 23.3 + 1) * 0.4)
            dy += a * (math.sin(t * 31.0 + 2) * 0.6 + math.sin(t * 19.7) * 0.4)
        elif k == "bob":
            dy -= m["amp"] * abs(math.sin(math.pi * t / m["period"]))
        elif k == "jolt" and t >= m["t"]:
            u = t - m["t"]
            env = math.exp(-u / m.get("decay", 0.18)) * math.cos(u * 2 * math.pi * m.get("freq", 3.0))
            dx += m.get("dx", 0) * env; dy += m.get("dy", 0) * env
        elif k == "punch" and m["t"] <= t <= m["t"] + m.get("dur", 0.25):
            u = (t - m["t"]) / m.get("dur", 0.25)
            sc *= 1 + m["amp"] * math.sin(math.pi * u)
        elif k == "drift":
            u = ease(t / m["dur"], m.get("ease", "inout"))
            dx += lerp(0, m.get("dx", 0), u); dy += lerp(0, m.get("dy", 0), u)
            sc *= lerp(1, m.get("scale", 1), u)
        elif k == "enter":   # slide in from off-screen, ease-out with a small overshoot
            u = min(max((t - m.get("t", 0)) / m.get("dur", 0.45), 0), 1)
            e = 1 - (1 - u) ** 3 + 0.06 * math.sin(math.pi * u)
            dx += m.get("dx", 0) * (1 - e); dy += m.get("dy", 0) * (1 - e)
    for ts, kw in swap_t or []:  # acting on every pose change: anticipation squash, overshoot, settle wobble
        u = t - ts
        amp = kw.get("amp", 1.0)
        if -0.07 <= u < 0:
            sc *= 1 - 0.03 * amp * (u + 0.07) / 0.07
        elif 0 <= u < 0.6:
            env = math.exp(-u / 0.11)
            sc *= 1 + 0.035 * amp * env * math.cos(u * 2 * math.pi * 3.2)
            rot += math.radians(kw.get("deg", 2.5)) * amp * env * math.sin(u * 2 * math.pi * 2.6)
    return dx, dy, sc, rot

def deform_forward(px, py, info, motions, t):
    """approximate forward map of one source point through pendulum / sway / breathe."""
    x0, y0, x1, y1 = info["bbox"]
    fx, fy = info["feet"]
    for m in reversed(motions):
        k = m["type"]
        if k == "breathe":
            s = 1 + m["amp"] * math.sin(2 * math.pi * t / m["period"] + m.get("phase", 0))
            py = fy + (py - fy) * s
        elif k in ("pendulum", "sway"):
            ang = math.radians(m["deg"]) * math.sin(2 * math.pi * t / m["period"] + m.get("phase", 0))
            if k == "pendulum":
                cx, cy = info["top"][0], info["top"][1] - m.get("pivot_above", 0)
            else:
                cx, cy = fx, fy
                ang *= float(smoothstep(y1, y0, np.float32(py)))
            c, s_ = math.cos(ang), math.sin(ang)
            dx, dy = px - cx, py - cy
            px, py = cx + c * dx - s_ * dy, cy + s_ * dx + c * dy
    return px, py

# ---------------------------------------------------------------- compositing helpers
def over(dst, src_pm, x, y):
    """premultiplied src (h,w,4) over dst (H,W,3 float) at x,y (ints, may be off-screen)."""
    h, w = src_pm.shape[:2]
    X0, Y0, X1, Y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if X0 >= X1 or Y0 >= Y1: return
    s = src_pm[Y0 - y:Y1 - y, X0 - x:X1 - x]
    d = dst[Y0:Y1, X0:X1]
    d *= (1 - s[..., 3:4]); d += s[..., :3]

def cam_affine(cam, depth, t_norm):
    z = 1 + (lerp(cam.get("z0", 1), cam.get("z1", 1), ease(t_norm, cam.get("ease", "inout"))) - 1) * depth
    px = lerp(cam.get("x0", 0), cam.get("x1", 0), ease(t_norm, cam.get("ease", "inout"))) * depth
    py = lerp(cam.get("y0", 0), cam.get("y1", 0), ease(t_norm, cam.get("ease", "inout"))) * depth
    fx, fy = cam.get("focus", (W / 2, H / 2))
    # screen = focus + z*(p - focus) - pan
    return np.array([[z, 0, fx - z * fx - px], [0, z, fy - z * fy - py]], np.float32)

def compose_affine(A, B):  # A after B (2x3)
    A3 = np.vstack([A, [0, 0, 1]]); B3 = np.vstack([B, [0, 0, 1]])
    return (A3 @ B3)[:2]

def shake_offset(shakes, t):
    dx = dy = 0.0
    for s in shakes or []:
        if t >= s["t"]:
            u = t - s["t"]; env = math.exp(-u / s.get("decay", 0.25))
            dx += s["amp"] * env * math.sin(u * 61); dy += s["amp"] * env * math.cos(u * 53)
    return dx, dy

# ---------------------------------------------------------------- layer renderers
def render_plate(frame, L, cam, t_norm, shk):
    img = load_rgba(L["src"])
    h, w = img.shape[:2]
    cover = max(W / w, H / h) * L.get("scale", 1.12)
    flip = -1 if L.get("flip") else 1
    ox, oy = L.get("offset", (0, 0))
    place = np.array([[cover * flip, 0, W / 2 - flip * cover * w / 2 + ox], [0, cover, H / 2 - cover * h / 2 + oy]], np.float32)
    A = compose_affine(cam_affine(cam, L.get("depth", 0.6), t_norm), place)
    A[0, 2] += shk[0] * L.get("depth", 0.6); A[1, 2] += shk[1] * L.get("depth", 0.6)
    out = cv2.warpAffine(img, A, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE if L.get("opaque", True) else cv2.BORDER_CONSTANT)
    if L.get("blur"):
        k = int(L["blur"]) * 2 + 1
        out = cv2.GaussianBlur(out, (k, k), 0)
    if L.get("tint"):
        out[..., :3] *= np.array(L["tint"], np.float32)
    if L.get("opaque", True):
        frame[:] = out[..., :3] if frame is None else out[..., :3] * out[..., 3:4] + frame * (1 - out[..., 3:4])
    else:
        frame *= (1 - out[..., 3:4]); frame += out[..., :3]

def _pose_patch(buf, L, cur, cam, t_norm, t, shk, swaps, weight):
    img = load_rgba(cur, max_h=None if "scale" in L else int(L["height"] * 1.6 * 1.25))
    info = L.setdefault("_info", {}).get(cur)
    if info is None:
        info = analyse_char(img); L["_info"][cur] = info
    x0, y0, x1, y1 = info["bbox"]
    s = L["scale"] if "scale" in L else L["height"] / (y1 - y0)
    anchor = info["feet"] if L.get("anchor", "feet") == "feet" else info["top"]
    if "scale" in L and L.get("anchor", "feet") == "feet":
        anchor = (float(np.mean([(xa + xb) / 2 for xa, xb in info["spans"]])), float(y1))
    if L.get("anchor_src"):
        anchor = tuple(L["anchor_src"])
    mdx, mdy, msc, rot = motion_offset(L.get("motions", []), t, swaps, s)
    s *= msc
    flip = -1 if L.get("flip") else 1
    px, py = L["pos"]
    c, sn = math.cos(rot), math.sin(rot)
    M = np.array([[c, -sn], [sn, c]]) @ np.diag([s * flip, s])
    tr = np.array([px + mdx, py + mdy]) - M @ np.array(anchor)
    place = np.hstack([M, tr[:, None]]).astype(np.float32)
    A = compose_affine(cam_affine(cam, L.get("depth", 1.0), t_norm), place)
    A[0, 2] += shk[0] * L.get("depth", 1.0); A[1, 2] += shk[1] * L.get("depth", 1.0)
    Ai = cv2.invertAffineTransform(A)
    # screen bbox of the character (+margin for deformation)
    hh, ww = img.shape[:2]
    corners = np.array([[0, 0, 1], [ww, 0, 1], [0, hh, 1], [ww, hh, 1]], np.float32) @ A.T
    m = 60
    X0 = int(max(corners[:, 0].min() - m, 0)); X1 = int(min(corners[:, 0].max() + m, W))
    Y0 = int(max(corners[:, 1].min() - m, 0)); Y1 = int(min(corners[:, 1].max() + m, H))
    if X0 >= X1 or Y0 >= Y1: return None
    gx, gy = np.meshgrid(np.arange(X0, X1, dtype=np.float32), np.arange(Y0, Y1, dtype=np.float32))
    sx = Ai[0, 0] * gx + Ai[0, 1] * gy + Ai[0, 2]
    sy = Ai[1, 0] * gx + Ai[1, 1] * gy + Ai[1, 2]
    sx, sy = deform_inverse(sx, sy, info, L.get("motions", []), t, None)
    patch = cv2.remap(img, sx.astype(np.float32), sy.astype(np.float32), cv2.INTER_LINEAR,
                      borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    buf[Y0:Y1, X0:X1] += patch * weight
    return A, info, s

def render_char(frame, L, cam, t_norm, t, shk):
    entries = [(0.0, L["src"], {})] + [(s[0], s[1], s[2] if len(s) > 2 else {}) for s in L.get("swaps", [])]
    k = max(i for i, e in enumerate(entries) if t >= e[0] or i == 0)
    swaps = [(e[0], e[2]) for e in entries[1:]]
    poses = [(entries[k][1], 1.0)]
    xf = entries[k][2].get("xf", XF) if k > 0 else 0
    if k > 0 and t - entries[k][0] < xf:
        w = (t - entries[k][0]) / xf
        poses = [(entries[k - 1][1], 1 - w), (entries[k][1], w)]
    buf = np.zeros((H, W, 4), np.float32)
    geo = None
    for cur, w in poses:
        g = _pose_patch(buf, L, cur, cam, t_norm, t, shk, swaps, w)
        if g and w >= 0.5:
            geo = g
            L["_A"], L["_cur"], L["_t"] = g[0], cur, t
    if L.get("tint"):
        buf[..., :3] *= np.array(L["tint"], np.float32)
    # contact shadow under each foot group, drawn on the ground before the character
    shadow = L.get("shadow", dict(opacity=0.32, h=0.05, grow=1.25)) if L.get("anchor", "feet") == "feet" else None
    if shadow and geo:
        A, info, s = geo
        msk = np.zeros((H, W), np.float32)
        fy = info["bbox"][3]
        for xa, xb in info["spans"]:
            cx, cy = A @ np.array([(xa + xb) / 2, fy, 1.0])
            rw = max(4, (xb - xa) / 2 * s * shadow["grow"]); rh = max(3, rw * shadow["h"] * 4)
            cv2.ellipse(msk, (int(cx), int(cy)), (int(rw), int(rh)), 0, 0, 360, 1.0, -1, cv2.LINE_AA)
        msk = cv2.GaussianBlur(msk, (0, 0), 6) * shadow["opacity"]
        frame *= (1 - msk[..., None] * 0.85)
    halo = L.get("halo", dict(size=2, blur=5, opacity=0.30, color=(0.05, 0.04, 0.06)))
    if halo:
        a = np.clip(buf[..., 3], 0, 1)
        k = max(1, int(halo["size"]))
        ad = cv2.dilate(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1)))
        b = int(halo["blur"]) * 2 + 1
        ad = cv2.GaussianBlur(ad, (b, b), 0) * halo["opacity"]
        frame *= (1 - ad[..., None]); frame += ad[..., None] * np.array(halo["color"], np.float32)
    frame *= (1 - np.clip(buf[..., 3:4], 0, 1)); frame += buf[..., :3]

_rope_tiles = {}
def rope_tile(src, tip, back, thick=40):
    """sample a straight piece of the PNG's own rope behind the cut-off tip, trimmed to a whole number of
    stripe periods so it tiles seamlessly; phase-aligned so tile[0] continues right after the tip."""
    key = (src, tip, back)
    if key in _rope_tiles: return _rope_tiles[key]
    img = load_rgba(src)
    tx, ty = tip; bx, by = back
    D = math.hypot(tx - bx, ty - by)
    dx, dy = (tx - bx) / D, (ty - by) / D
    nx, ny = -dy, dx
    span = int(D + 60)
    u0 = tx - dx * (span + 2) - bx * 0
    # strip coords (u in [0, span), v in [-thick/2, thick/2)) -> source
    M = np.array([[dx, nx, tx - dx * (span + 2) - nx * thick / 2],
                  [dy, ny, ty - dy * (span + 2) - ny * thick / 2]], np.float32)
    strip = cv2.warpAffine(img, M, (span, thick), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                           borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    lum = strip[thick // 2 - 3:thick // 2 + 4, :, :3].mean((0, 2))
    lum = lum - lum.mean()
    best, P = -1e9, 30
    for p in range(14, min(90, span // 2)):
        c = float(np.dot(lum[:-p], lum[p:]) / (len(lum) - p))
        if c > best: best, P = c, p
    k = max(1, 60 // P)
    tile = strip[:, span - P * k:span].copy()
    _rope_tiles[key] = (tile, P * k)
    return _rope_tiles[key]

def render_rope(frame, L, layers):
    """continue a rope that the character PNG cuts off, by tiling a sample of the PNG's own rope from the
    tip outward along the rope direction (or toward screen point `to`). Must come after its char layer."""
    C = layers[L["attach"]]
    if "_A" not in C: return
    A, cur, t = C["_A"], C["_cur"], C["_t"]
    info = C["_info"][cur]
    tip, back = L["tips"][cur]
    tile, tl = rope_tile(cur, tuple(tip), tuple(back))
    pts = []
    for p in (tip, back):
        x, y = deform_forward(p[0], p[1], info, C.get("motions", []), t)
        pts.append(A @ np.array([x, y, 1.0], np.float32))
    (tx, ty), (bx, by) = pts
    ds = math.hypot(tx - bx, ty - by) or 1.0
    s = ds / math.hypot(tip[0] - back[0], tip[1] - back[1])
    if L.get("to"):
        ex, ey = L["to"]; dl = math.hypot(ex - tx, ey - ty) or 1.0
        ux, uy = (ex - tx) / dl, (ey - ty) / dl
        length = dl / s
    else:
        ux, uy = (tx - bx) / ds, (ty - by) / ds
        length = 4000 / s
    reps = int(length / tl) + 2
    strip = np.concatenate([tile] * reps, axis=1)
    th = strip.shape[0]
    nx, ny = -uy, ux
    o = (tx - ux * 2 * s - nx * th / 2 * s, ty - uy * 2 * s - ny * th / 2 * s)
    M = np.array([[ux * s, nx * s, o[0]], [uy * s, ny * s, o[1]]], np.float32)
    lay = cv2.warpAffine(strip, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    if C.get("tint"):
        lay[..., :3] *= np.array(C["tint"], np.float32)
    halo = C.get("halo")
    if halo:
        a = lay[..., 3]
        k = max(1, int(halo["size"]))
        ad = cv2.dilate(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1)))
        b = int(halo["blur"]) * 2 + 1
        ad = cv2.GaussianBlur(ad, (b, b), 0) * halo["opacity"]
        frame *= (1 - ad[..., None]); frame += ad[..., None] * np.array(halo["color"], np.float32)
    frame *= (1 - lay[..., 3:4]); frame += lay[..., :3]

def render_snow(frame, L, t, cam, t_norm, seed=7):
    rng = np.random.default_rng(seed + L.get("seed", 0))
    n = L.get("count", 160)
    base = rng.random((n, 2)) * [W + 200, H + 200] - 100
    size = rng.uniform(*L.get("size", (1.2, 3.2)), n)
    spd = rng.uniform(40, 110, n) * L.get("speed", 1.0)
    wind = L.get("wind", 60)
    xs = (base[:, 0] + wind * t + 12 * np.sin(t * 1.3 + base[:, 1])) % (W + 200) - 100
    ys = (base[:, 1] + spd * t) % (H + 200) - 100
    lay = np.zeros((H, W), np.float32)
    for x, y, r in zip(xs, ys, size):
        cv2.circle(lay, (int(x), int(y)), int(max(r, 1)), 1.0, -1, lineType=cv2.LINE_AA)
    lay = cv2.GaussianBlur(lay, (3, 3), 0) * L.get("opacity", 0.75)
    col = np.array(L.get("color", (1.0, 0.97, 0.92)), np.float32)
    frame *= (1 - lay[..., None]); frame += lay[..., None] * col

_txt = {}
def render_text(frame, L, t):
    if t < L["t"]: return
    key = L["text"]
    if key not in _txt:
        font = ImageFont.truetype(L.get("font", "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"), L.get("size", 110))
        bbox = font.getbbox(key)
        w, h = bbox[2] + 40, bbox[3] + 40
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.text((20, 20), key, font=font, fill=(245, 240, 230, 255), stroke_width=6, stroke_fill=(20, 16, 24, 255))
        a = np.asarray(im).astype(np.float32) / 255
        bgra = np.dstack([a[..., 2], a[..., 1], a[..., 0], a[..., 3]])
        bgra[..., :3] *= bgra[..., 3:4]
        _txt[key] = bgra
    img = _txt[key].copy()
    u = ease((t - L["t"]) / 0.25, "out")
    img *= u
    x, y = L["pos"]
    over(frame, img, int(x), int(y + (1 - u) * 30))

def grade(frame, g):
    if not g: return frame
    frame *= np.array(g.get("mul", (1, 1, 1)), np.float32)
    frame += np.array(g.get("add", (0, 0, 0)), np.float32)
    return frame

_vig = None
def vignette(frame, strength=0.35):
    global _vig
    if _vig is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        _vig = (1 - strength * np.clip(r - 0.45, 0, 1) ** 1.6)[..., None]
    frame *= _vig

# ---------------------------------------------------------------- main render
def render(shots, out_mp4, fps=30, audio=None, only=None, stills=None):
    total = shots[-1]["end"]
    f0 = int(round(shots[0]["start"] * fps))   # a segment may start later than 0 s
    nframes = int(round(total * fps))
    proc = None
    if stills is None:
        args = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-"]
        if audio: args += ["-i", str(audio), "-c:a", "aac", "-b:a", "192k", "-shortest"]
        args += ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(out_mp4)]
        proc = subprocess.Popen(args, stdin=subprocess.PIPE)
    frames = range(f0, nframes) if stills is None else [int(round(s * fps)) for s in stills]
    for fi in frames:
        T = fi / fps
        si = next(i for i, s in enumerate(shots) if s["start"] <= T < s["end"] or s is shots[-1])
        sh = shots[si]
        if only and sh["id"] not in only: continue
        t = T - sh["start"]
        frame = render_shot(sh, t)
        tin = sh.get("tin")
        if tin and si > 0 and t < tin.get("dur", 0.35):
            prev = shots[si - 1]
            pf = render_shot(prev, prev["end"] - prev["start"] + t)
            frame = transition(pf, frame, t / tin.get("dur", 0.35), tin)
        frame *= paper()
        out = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
        if proc: proc.stdin.write(out.tobytes())
        else:
            p = ROOT / "production" / "stills" / f"{sh['id']}_{T:06.2f}.jpg"
            p.parent.mkdir(exist_ok=True); cv2.imwrite(str(p), out, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if fi % (fps * 2) == 0: print(f"frame {fi}/{nframes} shot {sh['id']}", flush=True)
    if proc:
        proc.stdin.close(); proc.wait()

def render_shot(sh, t):
    tn = min(t / (sh["end"] - sh["start"]), 1.0)
    frame = np.zeros((H, W, 3), np.float32)
    shk = shake_offset(sh.get("shake"), t)
    for L in sh["layers"]:
        k = L["kind"]
        if k == "plate": render_plate(frame, L, sh["cam"], tn, shk)
        elif k == "char": render_char(frame, L, sh["cam"], tn, t, shk)
        elif k == "rope": render_rope(frame, L, sh["layers"])
        elif k == "snow": render_snow(frame, L, t, sh["cam"], tn)
        elif k == "text": render_text(frame, L, t)
    grade(frame, sh.get("grade"))
    vignette(frame, sh.get("vignette", 0.25))
    return frame

def transition(a, b, u, tin):
    """whip: old shot slides out, new slides in, with horizontal motion blur at peak speed."""
    e = ease(u, "inout")
    d = tin.get("dir", 1)
    blur = int(1 + 120 * math.sin(math.pi * u))
    def shift(img, dx):
        M = np.float32([[1, 0, dx], [0, 1, 0]])
        out = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_CONSTANT)
        return cv2.blur(out, (blur, 1)) if blur > 2 else out
    if tin.get("kind") == "whip":
        A = shift(a, -d * W * e); B = shift(b, d * W * (1 - e))
        m = np.zeros((H, W, 1), np.float32)
        edge = int(W * (1 - e)) if d > 0 else int(W * e)
        if d > 0: m[:, edge:] = 1
        else: m[:, :edge] = 1
        return A * (1 - m) + B * m
    return a * (1 - e) + b * e

_paper = None
def paper():
    global _paper
    if _paper is None:
        rng = np.random.default_rng(3)
        low = cv2.GaussianBlur(rng.standard_normal((H // 8, W // 8)).astype(np.float32), (0, 0), 3)
        low = cv2.resize(low / (np.abs(low).max() + 1e-6), (W, H), interpolation=cv2.INTER_CUBIC)
        fine = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.8)
        _paper = (1 + 0.035 * low + 0.018 * fine / (np.abs(fine).max() + 1e-6) * 3)[..., None].astype(np.float32)
    return _paper
