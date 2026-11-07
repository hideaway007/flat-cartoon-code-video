"""Explainer overlay kit (flat-cartoon-code-video library): the on-screen graphics that history/science explainers
layer over the cartoon - red marker circles, arrows, labels, title cards, number pops, counters, bars, map routes,
spotlight, comic emotes, game meters, rubber stamps - plus shot filters (sepia flashback, night).

Everything is drawn in code in the cartoon's style: near-black marker outline, flat fills, slight (stable, non-
boiling) hand-drawn wobble, a bold friendly font (bundled OFL fonts: Lilita One, Bangers).

A layer is a dict  dict(kind="overlay", type=<type>, t=<start s, relative to the shot>, ...params)
(stage.overlay(type, t, **params) builds it). Common params, all types:
    t        start time inside the shot (s). The overlay animates IN from t.
    dur      visible time (s)           } optional end; without either the overlay stays until the cut
    out      end time inside the shot   } (no out animation). With an end it animates OUT just before it.
    tout     length of the out animation (default 0.2 s)
    world    False (default) = screen space HUD in frame px (1920x1080). True = scene space: positions are the
             same coordinates as toon `pos` / plates before the camera, the overlay moves/zooms with the camera
             (camera affine at `depth`, default 1.0) and shakes with the shot.
    depth    parallax depth for world overlays (use the map plate's depth for routes on a map layer)
    opacity  overall opacity (default 1)
    seed     wobble seed (default derived from the type/position: stable between frames)
Rendered by stage.render_shot in layer order (put overlays after the characters). Each overlay draws only its own
bounding box, supersampled. Positions are screen px (x right, y down); colours BGR.

Shot-level filters (shot dict key): filter="sepia" | "night" | dict(kind=..., amount=0..1). The filter tints the
layers before the first overlay layer (overlays keep their colours), then grade and vignette run as usual.
"""
import math, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

import engine as E
import toon as T

HERE = pathlib.Path(__file__).resolve().parent
SS = 3                                     # supersampling of drawn strokes/shapes
SPR = 2                                    # supersampling of cached sprites (text, boxes)

INK = T.INK                                # (30, 24, 26) near-black marker
RED = (46, 44, 222)                        # marker red
PAPER = (214, 238, 250)                    # warm cream card
WHITE = (250, 250, 250)
YELLOW = (58, 204, 255)
ORANGE = (40, 140, 245)
BLUE = (236, 186, 104)
GREEN = (86, 196, 104)
OL = 4.5                                   # outline width (px) of overlay shapes at 1080p

TYPES = ("circle", "underline", "arrow", "label", "title", "caption_pop", "counter", "bars", "route", "spotlight",
         "emote", "meter", "stamp")
EMOTES = ("question", "exclaim", "sweat", "anger", "sparkle", "impact", "speed")
FILTERS = ("sepia", "night")


# ------------------------------------------------------------------------------------------------ fonts
def _font_dirs():
    return [E.ROOT / "assets" / "fonts", HERE.parent / "assets" / "fonts",
            pathlib.Path.home() / ".claude" / "skills" / "flat-cartoon-code-video" / "assets" / "fonts"]


FONT_FILES = dict(main="LilitaOne-Regular.ttf", comic="Bangers-Regular.ttf")
_fonts = {}


def font(name="main", size=60):
    """PIL font. name: "main" (Lilita One, bold rounded), "comic" (Bangers, condensed comic caps) or a .ttf path."""
    key = (name, int(size))
    if key not in _fonts:
        fn = FONT_FILES.get(name, name)
        path = next((d / fn for d in _font_dirs() if (d / fn).exists()), None)
        if path is None and pathlib.Path(fn).exists():
            path = pathlib.Path(fn)
        if path is None:
            raise FileNotFoundError(f"font {fn} not found in {[str(d) for d in _font_dirs()]}")
        _fonts[key] = ImageFont.truetype(str(path), int(size))
    return _fonts[key]


# ------------------------------------------------------------------------------------------------ small math
def clamp(x, a=0.0, b=1.0):
    return min(max(x, a), b)


def ease_out(u, p=3):
    return 1 - (1 - clamp(u)) ** p


def ease_io(u):
    u = clamp(u)
    return 0.5 - 0.5 * math.cos(math.pi * u)


def back(u, s=1.9):
    """ease-out-back: overshoots past 1 and settles (pop)."""
    u = clamp(u) - 1
    return 1 + u * u * ((s + 1) * u + s)


def pop(u, s=2.2):
    """scale curve 0 -> overshoot (~1.15) -> 1 with a tiny settle wobble."""
    if u <= 0:
        return 0.0
    if u >= 1.6:
        return 1.0
    v = back(u, s)
    if u > 1:
        v = 1 + 0.03 * math.sin((u - 1) * 2 * math.pi * 1.6) * math.exp(-(u - 1) * 6)
    return v


def _bgr(c):
    return tuple(int(v) for v in c)


def _shade(c, k):
    return tuple(int(clamp(v * k, 0, 255)) for v in c)


def _seed(L):
    if "seed" in L:
        return int(L["seed"])
    s = repr((L.get("type"), L.get("at"), L.get("pts"), L.get("text"), L.get("box")))
    return sum(ord(ch) * (i + 1) for i, ch in enumerate(s)) % 100003


def resample(pts, step=2.0):
    """polyline -> evenly spaced points + cumulative arc length."""
    p = np.asarray(pts, np.float64).reshape(-1, 2)
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    if d[-1] < 1e-6:
        return p[:1].repeat(2, 0), np.array([0.0, 0.0])
    s = np.linspace(0, d[-1], max(int(d[-1] / step), 2) + 1)
    return np.stack([np.interp(s, d, p[:, 0]), np.interp(s, d, p[:, 1])], 1), s


def normals(p):
    d = np.gradient(p, axis=0)
    n = np.stack([-d[:, 1], d[:, 0]], 1)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)


def wobble(p, s, seed, amp=1.6):
    """stable hand-drawn wobble along the normal, a function of arc length (does not boil while drawing on)."""
    rng = np.random.default_rng(seed)
    ph = rng.uniform(0, 2 * math.pi, 3)
    off = amp * (0.6 * np.sin(s / 95 + ph[0]) + 0.3 * np.sin(s / 41 + ph[1]) + 0.15 * np.sin(s / 17 + ph[2]))
    return p + normals(p) * off[:, None]


def truncate(p, s, frac):
    """the first `frac` of a resampled path (with an interpolated end point)."""
    if frac >= 1:
        return p, s
    L = s[-1] * clamp(frac)
    k = int(np.searchsorted(s, L))
    if k <= 0:
        return p[:1], s[:1]
    k = min(k, len(s) - 1)
    a = (L - s[k - 1]) / max(s[k] - s[k - 1], 1e-9)
    end = p[k - 1] + (p[k] - p[k - 1]) * a
    return np.vstack([p[:k], end]), np.r_[s[:k], L]


def rot2(v, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    v = np.asarray(v, np.float64)
    return np.stack([c * v[..., 0] - s * v[..., 1], s * v[..., 0] + c * v[..., 1]], -1)


# ------------------------------------------------------------------------------------------------ canvas
class Canvas:
    """supersampled BGRA uint8 drawing surface over a screen-px box; drawn pixels are opaque, so the area-down-
    sampled result is premultiplied (like toon.composite)."""

    def __init__(self, x0, y0, x1, y1, ss=SS):
        self.x0, self.y0 = int(math.floor(x0)), int(math.floor(y0))
        self.x1, self.y1 = int(math.ceil(x1)), int(math.ceil(y1))
        self.ss = ss
        w, h = max(self.x1 - self.x0, 1), max(self.y1 - self.y0, 1)
        self.img = np.zeros((h * ss, w * ss, 4), np.uint8)

    @classmethod
    def around(cls, pts, pad, ss=SS):
        p = np.asarray(pts, np.float64).reshape(-1, 2)
        x0, y0 = p.min(0) - pad
        x1, y1 = p.max(0) + pad
        x0, y0 = max(x0, -4), max(y0, -4)
        x1, y1 = min(x1, E.W + 4), min(y1, E.H + 4)
        if x1 <= x0 or y1 <= y0:
            return None
        return cls(x0, y0, x1, y1, ss)

    def P(self, pts):
        p = np.asarray(pts, np.float64).reshape(-1, 2)
        return np.round((p - (self.x0, self.y0)) * self.ss * 4).astype(np.int32)   # shift=2 subpixel

    def lw(self, w):
        return max(1, int(round(w * self.ss)))

    def stroke(self, pts, widths, color):
        """variable-width round-capped stroke (one cv2.line per segment)."""
        q = self.P(pts)
        widths = np.broadcast_to(np.asarray(widths, np.float64), (len(q),))
        c = (*_bgr(color), 255)
        if len(q) == 1:
            cv2.circle(self.img, tuple(q[0]), self.lw(widths[0] / 2) * 4, c, -1, cv2.LINE_8, 2)
            return
        for i in range(len(q) - 1):
            cv2.line(self.img, tuple(q[i]), tuple(q[i + 1]), c, self.lw((widths[i] + widths[i + 1]) / 2),
                     cv2.LINE_8, 2)

    def marker(self, pts, widths, color, ol=OL):
        """coloured marker stroke with an ink outline."""
        w = np.asarray(widths, np.float64)
        self.stroke(pts, w + 2 * ol, INK)
        self.stroke(pts, w, color)

    def poly(self, pts, fill, line=OL, color=INK):
        q = self.P(pts)
        if fill is not None:
            cv2.fillPoly(self.img, [q], (*_bgr(fill), 255), cv2.LINE_8, 2)
        if line:
            cv2.polylines(self.img, [q], True, (*_bgr(color), 255), self.lw(line), cv2.LINE_8, 2)

    def dot(self, c, r, fill, line=OL):
        self.poly(T.ellipse_pts(c[0], c[1], r, r, n=28), fill, line)

    def paste(self, spr, ss_spr, x, y):
        """premultiplied float sprite (at ss_spr) with its top-left at screen (x, y) - resized to this canvas."""
        k = self.ss / ss_spr
        s = spr if k == 1 else cv2.resize(spr, None, fx=k, fy=k, interpolation=cv2.INTER_LINEAR)
        X, Y = int(round((x - self.x0) * self.ss)), int(round((y - self.y0) * self.ss))
        h, w = s.shape[:2]
        H, W = self.img.shape[:2]
        X0, Y0, X1, Y1 = max(X, 0), max(Y, 0), min(X + w, W), min(Y + h, H)
        if X0 >= X1 or Y0 >= Y1:
            return
        d = self.img[Y0:Y1, X0:X1].astype(np.float32) / 255
        sp = s[Y0 - Y:Y1 - Y, X0 - X:X1 - X]
        d = d * (1 - sp[..., 3:4]) + sp
        self.img[Y0:Y1, X0:X1] = np.clip(d * 255 + 0.5, 0, 255).astype(np.uint8)

    def done(self, frame, opacity=1.0):
        h, w = self.img.shape[:2]
        small = cv2.resize(self.img, (w // self.ss, h // self.ss), interpolation=cv2.INTER_AREA).astype(np.float32)
        small *= opacity / 255.0
        _over(frame, small, self.x0, self.y0)


def _over(frame, pm, x, y):
    """premultiplied BGRA float over the float BGR frame at integer (x, y)."""
    H, W = frame.shape[:2]
    h, w = pm.shape[:2]
    X0, Y0, X1, Y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if X0 >= X1 or Y0 >= Y1:
        return
    s = pm[Y0 - y:Y1 - y, X0 - x:X1 - x]
    d = frame[Y0:Y1, X0:X1]
    d *= (1 - s[..., 3:4])
    d += s[..., :3]


# ------------------------------------------------------------------------------------------------ sprites
_spr_cache = {}


def text_sprite(text, size, fill=WHITE, ink=INK, stroke=None, fname="main", shadow=True, align="center",
                spacing=None, ss=SPR):
    """text -> premultiplied BGRA float32 at ss x (cached). stroke: ink outline px (default size*0.11).
    shadow: soft ink drop shadow down-right. Multi-line with \\n."""
    key = ("txt", text, size, fill, ink, stroke, fname, shadow, align, spacing, ss)
    if key in _spr_cache:
        return _spr_cache[key]
    f = font(fname, size * ss)
    sw = int(round((size * 0.11 if stroke is None else stroke) * ss))
    sp = int((size * 0.12 if spacing is None else spacing) * ss)
    probe = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    bb = probe.multiline_textbbox((0, 0), text, font=f, stroke_width=sw, align=align, spacing=sp)
    pad = sw + int(size * 0.12 * ss) + 4
    w, h = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rgb_fill = tuple(int(v) for v in fill[::-1])
    rgb_ink = tuple(int(v) for v in ink[::-1])
    d.multiline_text((pad - bb[0], pad - bb[1]), text, font=f, fill=(*rgb_fill, 255), stroke_width=sw,
                     stroke_fill=(*rgb_ink, 255), align=align, spacing=sp)
    a = np.asarray(im).astype(np.float32) / 255
    bgra = np.dstack([a[..., 2], a[..., 1], a[..., 0], a[..., 3]])
    bgra[..., :3] *= bgra[..., 3:4]
    if shadow:
        off = max(2, int(size * 0.07 * ss))
        sh = np.zeros_like(bgra[..., 3])
        sh[off:, off:] = bgra[:-off, :-off, 3]
        sh = cv2.GaussianBlur(sh, (0, 0), max(1.0, size * 0.03 * ss)) * 0.38
        out = np.zeros_like(bgra)
        out[..., 3] = sh
        out[..., :3] = sh[..., None] * (np.array(INK, np.float32) / 255)
        bgra = bgra + out * (1 - bgra[..., 3:4])
    if len(_spr_cache) > 600:
        _spr_cache.clear()
    _spr_cache[key] = bgra
    return bgra


def place_sprite(frame, spr, ss, anchor, pos, scale=1.0, rot=0.0, opacity=1.0):
    """draw a cached sprite (at ss x) with its local point `anchor` (px of the sprite at 1x) on screen `pos`,
    scaled and rotated (deg) about the anchor. Warped at 2x then area-downsampled (sharp, no aliasing)."""
    if scale <= 0.01 or opacity <= 0.003:
        return
    h, w = spr.shape[:2]
    if abs(scale - 1) < 1e-4 and abs(rot) < 1e-4:
        x, y = pos[0] - anchor[0], pos[1] - anchor[1]
        if abs(x - round(x)) < 0.02 and abs(y - round(y)) < 0.02:
            key = ("down", id(spr))
            sm = _spr_cache.get(key)
            if sm is None or sm[0] is not spr:
                sm = (spr, cv2.resize(spr, (w // ss, h // ss), interpolation=cv2.INTER_AREA))
                _spr_cache[key] = sm
            _over(frame, sm[1] * opacity if opacity < 1 else sm[1], int(round(x)), int(round(y)))
            return
    k = 2                                       # target supersampling
    a = math.radians(rot)
    c, s = math.cos(a) * scale / ss, math.sin(a) * scale / ss
    M = np.array([[c, -s, 0], [s, c, 0]], np.float64)
    M[:, 2] = np.asarray(pos, np.float64) - M[:, :2] @ (np.asarray(anchor, np.float64) * ss)
    cr = np.array([[0, 0], [w, 0], [0, h], [w, h]], np.float64) @ M[:, :2].T + M[:, 2]
    x0, y0 = int(math.floor(max(cr[:, 0].min() - 2, -2))), int(math.floor(max(cr[:, 1].min() - 2, -2)))
    x1, y1 = int(math.ceil(min(cr[:, 0].max() + 2, E.W + 2))), int(math.ceil(min(cr[:, 1].max() + 2, E.H + 2)))
    if x1 <= x0 or y1 <= y0:
        return
    M2 = M * k
    M2[:, 2] -= (x0 * k, y0 * k)
    big = cv2.warpAffine(spr, M2.astype(np.float32), ((x1 - x0) * k, (y1 - y0) * k), flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    small = cv2.resize(big, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    if opacity < 1:
        small *= opacity
    _over(frame, small, x0, y0)


def _sprite_canvas(w, h, ss=SPR):
    """a Canvas in sprite-local px (0..w, 0..h) at sprite supersampling."""
    return Canvas(0, 0, w, h, ss)


def _to_float(cv):
    return cv.img.astype(np.float32) / 255.0


def wobbly_rect(x0, y0, x1, y1, r=14, seed=0, amp=1.4):
    """rounded rectangle outline with a little hand-drawn wobble (closed polygon)."""
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for a in np.linspace(a0, a0 + 90, 7):
            pts.append((cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))))
    p, s = resample(pts + [pts[0]], 4)
    return wobble(p, s, seed, amp)[:-1]


# ------------------------------------------------------------------------------------------------ context
class Ctx:
    """per-frame placement of one overlay: maps the layer's coordinates to screen px."""

    def __init__(self, L, sh, t, tn, shk):
        self.L, self.t = L, t
        if L.get("world"):
            A = E.cam_affine(sh["cam"], L.get("depth", 1.0), tn).astype(np.float64)
            d = L.get("depth", 1.0)
            A[0, 2] += shk[0] * d
            A[1, 2] += shk[1] * d
        else:
            A = np.array([[1, 0, 0], [0, 1, 0]], np.float64)
        self.A = A
        self.k = math.sqrt(abs(np.linalg.det(A[:, :2])))      # size multiplier (camera zoom for world overlays)

    def pt(self, p):
        p = np.asarray(p, np.float64)
        return p @ self.A[:, :2].T + self.A[:, 2]


def life(L, t, shot_dur):
    """(age since t, end time or None, out factor 1..0)."""
    t0 = L.get("t", 0.0)
    end = L["t"] + L["dur"] if "dur" in L else L.get("out")
    age = t - t0
    if end is None:
        return age, None, 1.0
    return age, end, clamp((end - t) / max(L.get("tout", 0.2), 1e-3))


# ------------------------------------------------------------------------------------------------ 1 circle
def circle(frame, c, L, age, outk):
    """red hand-drawn ellipse (signature "red circle") drawn on around a point or box.
    params: at=(x, y) + r=(rx, ry) | r=radius   OR   box=(x0, y0, x1, y1) (+ pad=18)
            color=RED, width=16, draw=0.35 (s to draw on), turns=1.08 (overlapping ends), tilt=-6 (deg),
            start=-120 (deg where the pen starts; 0 = right, 90 = bottom)"""
    if "box" in L:
        x0, y0, x1, y1 = L["box"]
        pad = L.get("pad", 18)
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 * 1.12 + pad, (y1 - y0) / 2 * 1.12 + pad
    else:
        cx, cy = L["at"]
        r = L.get("r", 110)
        rx, ry = (r, r * 0.8) if np.isscalar(r) else r
    seed = _seed(L)
    turns = L.get("turns", 1.08)
    th = math.radians(L.get("start", -120)) + np.linspace(0, 2 * math.pi * turns, 220)
    u = (th - th[0]) / (2 * math.pi)
    grow = 1 - 0.03 + 0.06 * u                           # spiral out a bit: the ends do not meet
    rng = np.random.default_rng(seed)
    jag = 1 + 0.025 * np.sin(2 * th + rng.uniform(0, 6)) + 0.02 * np.sin(3 * th + rng.uniform(0, 6))
    loc = np.stack([rx * grow * jag * np.cos(th), ry * grow * jag * np.sin(th)], 1)
    loc = rot2(loc, L.get("tilt", -6)) + (cx, cy)
    p = c.pt(loc)
    p, s = resample(p, 2.0)
    p = wobble(p, s, seed, 1.4 * c.k)
    prog = ease_out(age / L.get("draw", 0.35), 2)
    p, s = truncate(p, s, prog)
    if len(p) < 2:
        return
    w = L.get("width", 16) * c.k
    tot = s[-1] / max(prog, 1e-3)
    un = s / tot
    widths = w * (0.55 + 0.45 * np.clip(un / 0.12, 0, 1)) * (1 - 0.45 * np.clip((un - 0.85) / 0.15, 0, 1))
    cv = Canvas.around(p, w + 2 * OL + 6)
    if cv is None:
        return
    split = int(np.searchsorted(un, 0.82))           # the overlapping tail gets drawn on top with its own outline
    col = L.get("color", RED)
    cv.stroke(p[:split + 1], widths[:split + 1] + 2 * OL, INK)
    cv.stroke(p[:split + 1], widths[:split + 1], col)
    if split < len(p) - 1:
        cv.marker(p[split:], widths[split:], col)
    cv.done(frame, outk * L.get("opacity", 1.0))


# ------------------------------------------------------------------------------------------------ 2 underline / arrow
def _arrowhead(cv, tip, d, size, col, k_scale=1.0):
    d = d / (np.linalg.norm(d) + 1e-9)
    n = np.array([-d[1], d[0]])
    s = size * k_scale
    pts = [tip + d * s * 0.35, tip - d * s * 0.85 + n * s * 0.62, tip - d * s * 0.55, tip - d * s * 0.85 - n * s * 0.62]
    cv.poly(np.array(pts), col, OL)


def arrow(frame, c, L, age, outk, head_default=True):
    """hand-drawn curved arrow / underline that draws on.
    params: pts=[(x, y), ...] (2 points: a gentle curve with `bend`, more: Catmull-Rom through them)
            underline also takes span=(x0, x1, y).
            color=RED, width=12, draw=0.4 (s), bend=0.18 (fraction of length, + bulges left of travel),
            head=True for arrow / False for underline, head_size=42, double=False (underline: two strokes)"""
    if "span" in L and "pts" not in L:
        x0, x1, y = L["span"]
        pts = [(x0, y + 3), (x1, y - 3)]
    else:
        pts = [tuple(p) for p in L["pts"]]
    bend = L.get("bend", 0.18 if head_default else 0.04)
    if len(pts) == 2:
        a, b = np.array(pts[0], float), np.array(pts[1], float)
        d = b - a
        n = np.array([d[1], -d[0]])
        mid = (a + b) / 2 + n * bend
        pts = [a, mid, b]
    pts = T.crom(pts, False, 16)
    seed = _seed(L)
    p = c.pt(pts)
    p, s = resample(p, 2.0)
    p = wobble(p, s, seed, 1.2 * c.k)
    strokes = [p]
    if L.get("double") and not head_default:
        q = p + np.array([6, 13]) * c.k
        q[:, 0] = q[:, 0] * 0.92 + q[:, 0].mean() * 0.08 + 18 * c.k
        strokes.append(wobble(q, s, seed + 5, 1.6 * c.k))
    draw = L.get("draw", 0.4)
    col = L.get("color", RED)
    w = L.get("width", 12) * c.k
    head = L.get("head", head_default)
    hs = L.get("head_size", 42)
    allp = np.vstack(strokes)
    cv = Canvas.around(allp, w + 2 * OL + hs * c.k + 8)
    if cv is None:
        return
    for i, sp in enumerate(strokes):
        u0 = i * 0.55
        prog = ease_io((age - u0 * draw) / draw) if i else ease_out(age / draw, 2)
        q, qs = truncate(sp, s, prog)
        if len(q) < 2:
            continue
        un = qs / s[-1]
        widths = w * (0.6 + 0.4 * np.clip(un / 0.1, 0, 1)) * (1 - (0 if head else 0.5) * np.clip((un - 0.85) / 0.15, 0, 1))
        cv.marker(q, widths, col)
    if head:
        hp = clamp((age - draw * 0.85) / 0.16)
        if hp > 0:
            tip = p[-1]
            d = p[-1] - p[max(len(p) - 12, 0)]
            _arrowhead(cv, tip, d, hs * back(hp, 2.5), col, c.k)
    cv.done(frame, outk * L.get("opacity", 1.0))


# ------------------------------------------------------------------------------------------------ 3 label
def _box_sprite(text, size, fill, ink, fname, seed, pad=(0.55, 0.32)):
    key = ("box", text, size, fill, ink, fname, seed)
    if key in _spr_cache:
        return _spr_cache[key]
    ts = text_sprite(text, size, fill=ink if fill != ink else WHITE, ink=ink, stroke=0, fname=fname, shadow=False)
    th, tw = ts.shape[0] / SPR, ts.shape[1] / SPR
    px, py = size * pad[0], size * pad[1]
    sh = max(5, size * 0.12)
    w, h = tw + 2 * px + sh + 2 * OL, th + 2 * py + sh + 2 * OL
    cv = _sprite_canvas(w, h)
    x0, y0, x1, y1 = OL, OL, w - OL - sh, h - OL - sh
    r = min(size * 0.35, (y1 - y0) / 2)
    cv.poly(wobbly_rect(x0 + sh, y0 + sh, x1 + sh, y1 + sh, r, seed + 1), INK, 0)          # drop block
    cv.poly(wobbly_rect(x0, y0, x1, y1, r, seed), fill, OL)
    cv.paste(ts, SPR, (x0 + x1) / 2 - tw / 2, (y0 + y1) / 2 - th / 2 - size * 0.04)
    out = (_to_float(cv), w, h, (x0 + x1) / 2, (y0 + y1) / 2)
    _spr_cache[key] = out
    return out


def label(frame, c, L, age, outk):
    """text box with a leader line pointing at a point ("AXE BLADE"); the line draws from the point, the box pops.
    params: text, at=(x, y) point, box=(x, y) box centre (default at + (200, -170)), size=54 (font px),
            fill=PAPER, ink=INK (text + line colour), font="main", dot=True (dot on the point), line_color=INK"""
    at = np.array(L["at"], float)
    bc = np.array(L.get("box", (at[0] + 200, at[1] - 170)), float)
    seed = _seed(L)
    spr, w, h, cx, cy = _box_sprite(L["text"], L.get("size", 54), L.get("fill", PAPER), L.get("ink", INK),
                                    L.get("font", "main"), seed)
    A, B = c.pt(at), c.pt(bc)
    lc = L.get("line_color", INK)
    pl = clamp(age / 0.18)
    cv = Canvas.around([A, B], 30 * c.k)
    if cv is not None:
        if pl > 0:
            mid = (A + B) / 2 + np.array([-(B - A)[1], (B - A)[0]]) * 0.08
            p, s = resample(T.crom([A, mid, B], False, 10), 2)
            q, qs = truncate(p, s, ease_out(pl, 2))
            if len(q) > 1:
                cv.stroke(q, 6 * c.k + 2 * 2.5, WHITE if lc == INK else INK)
                cv.stroke(q, 6 * c.k, lc)
        if L.get("dot", True):
            cv.dot(A, 11 * c.k * pop(age / 0.15), L.get("fill", PAPER), 4)
        cv.done(frame, outk * L.get("opacity", 1.0))
    sc = pop((age - 0.1) / 0.28) * c.k * (0.6 + 0.4 * outk)
    place_sprite(frame, spr, SPR, (cx, cy), B, sc, 0, L.get("opacity", 1.0) * min(outk * 1.5, 1))


# ------------------------------------------------------------------------------------------------ 4 title
def _ribbon_sprite(text, sub, size, band, fill, ink, fname, seed):
    key = ("ribbon", text, sub, size, band, fill, ink, fname, seed)
    if key in _spr_cache:
        return _spr_cache[key]
    ts = text_sprite(text, size, fill=fill, ink=ink, fname=fname, shadow=False)
    tw, th = ts.shape[1] / SPR, ts.shape[0] / SPR
    ss_ = text_sprite(sub, int(size * 0.42), fill=ink, ink=ink, stroke=0, fname=fname, shadow=False) if sub else None
    bw = tw + size * 0.9
    bh = size * 1.25
    tail = size * 0.9
    drop = size * 0.32
    W_, H_ = bw + 2 * tail + 2 * OL + 10, bh + drop + 2 * OL + 10 + (size * 0.75 if sub else 0)
    cv = _sprite_canvas(W_, H_)
    x0, y0 = tail + OL + 5, OL + 5
    x1, y1 = x0 + bw, y0 + bh
    sag = size * 0.08
    dk, dk2 = _shade(band, 0.72), _shade(band, 0.5)
    for sgn in (-1, 1):                         # tails behind (lower, with a V notch)
        xe = x0 if sgn < 0 else x1
        xo = xe + sgn * tail
        cv.poly(np.array([(xe - sgn * tail * 0.35, y0 + drop), (xo, y0 + drop), (xo - sgn * tail * 0.38, (y0 + y1) / 2 + drop),
                          (xo, y1 + drop), (xe - sgn * tail * 0.35, y1 + drop)]), dk, OL)
        cv.poly(np.array([(xe, y1), (xe - sgn * tail * 0.35, y1 + drop), (xe - sgn * tail * 0.35, y1)]), dk2, OL)
    top = T.crom([(x0, y0), ((x0 + x1) / 2, y0 + sag), (x1, y0)], False, 12)
    bot = T.crom([(x1, y1), ((x0 + x1) / 2, y1 + sag), (x0, y1)], False, 12)
    band_poly = np.vstack([top, bot])
    p, s = resample(np.vstack([band_poly, band_poly[:1]]), 4)
    cv.poly(wobble(p, s, seed, 1.3)[:-1], band, OL)
    cv.poly(np.array([(x0 + 10, y0 + 12 + sag * 0.4), (x1 - 10, y0 + 12 + sag * 0.4)]), None, 3,
            _shade(band, 1.25))
    cv.paste(ts, SPR, (x0 + x1) / 2 - tw / 2, (y0 + y1) / 2 - th / 2 + sag * 0.5)
    if ss_ is not None:
        sw, shh = ss_.shape[1] / SPR, ss_.shape[0] / SPR
        pw, ph = sw + size * 0.6, shh + size * 0.1
        px0, py0 = (x0 + x1) / 2 - pw / 2, y1 + drop * 0.25
        cv.poly(wobbly_rect(px0, py0, px0 + pw, py0 + ph, size * 0.12, seed + 3), PAPER, OL * 0.8)
        cv.paste(ss_, SPR, (x0 + x1) / 2 - sw / 2, py0 + ph / 2 - shh / 2)
    out = (_to_float(cv), W_, H_, (x0 + x1) / 2, (y0 + y1) / 2)
    _spr_cache[key] = out
    return out


def _paper_sprite(text, sub, size, fill, ink, fname, seed):
    key = ("paper", text, sub, size, fill, ink, fname, seed)
    if key in _spr_cache:
        return _spr_cache[key]
    ts = text_sprite(text, size, fill=ink, ink=ink, stroke=0, fname=fname, shadow=False)
    tw, th = ts.shape[1] / SPR, ts.shape[0] / SPR
    ss_ = text_sprite(sub, int(size * 0.45), fill=_shade(ink, 1.0), ink=ink, stroke=0, fname=fname, shadow=False) \
        if sub else None
    sw, shh = (ss_.shape[1] / SPR, ss_.shape[0] / SPR) if sub else (0, 0)
    pw, ph = max(tw, sw) + size * 1.1, th + shh + size * 0.7
    W_, H_ = pw + 40, ph + 40
    cv = _sprite_canvas(W_, H_)
    x0, y0, x1, y1 = 20, 20, 20 + pw, 20 + ph
    rng = np.random.default_rng(seed)
    pts = []                                      # torn edges: small random zigzag on all sides
    for (ax, ay), (bx, by) in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
        n = max(4, int(math.hypot(bx - ax, by - ay) / 26))
        for i in range(n):
            f = i / n
            j = rng.uniform(-3.5, 3.5)
            px, py = ax + (bx - ax) * f, ay + (by - ay) * f
            pts.append((px + (j if ax == bx else 0), py + (j if ay == by else 0)))
    pts = np.array(pts)
    cv.poly(pts + (8, 9), INK, 0)
    cv.poly(pts, fill, OL)
    for tx, ang in ((x0 + 10, -35), (x1 - 10, 35)):     # two strips of tape
        tp = rot2(np.array([(-36, -12), (36, -12), (36, 12), (-36, 12)], float), ang) + (tx, y0 + 4)
        cv.poly(tp, (196, 222, 232), 2.5)
    cv.paste(ts, SPR, (x0 + x1) / 2 - tw / 2, y0 + size * 0.3)
    if ss_ is not None:
        cv.paste(ss_, SPR, (x0 + x1) / 2 - sw / 2, y0 + size * 0.3 + th - size * 0.05)
    out = (_to_float(cv), W_, H_, (x0 + x1) / 2, (y0 + y1) / 2)
    _spr_cache[key] = out
    return out


def title(frame, c, L, age, outk):
    """chapter / title card. params: text, sub=None (second smaller line), pos="center" | "top" | "lower" |
    (x, y) centre, style="ribbon" (red banner with folded tails) | "paper" (torn cream card with tape),
    size=96 (font px), band=RED (ribbon colour), fill (ribbon text: PAPER; paper card: PAPER),
    ink=INK, font="main", anim="pop" | "slide" (default: slide for pos="lower", else pop), rot=0 (deg; paper: -2)"""
    size = L.get("size", 96)
    style = L.get("style", "ribbon")
    seed = _seed(L)
    if style == "paper":
        spr, w, h, ax, ay = _paper_sprite(L["text"], L.get("sub"), size, L.get("fill", PAPER), L.get("ink", INK),
                                          L.get("font", "main"), seed)
        rot = L.get("rot", -2)
    else:
        spr, w, h, ax, ay = _ribbon_sprite(L["text"], L.get("sub"), size, L.get("band", RED), L.get("fill", PAPER),
                                           L.get("ink", INK), L.get("font", "main"), seed)
        rot = L.get("rot", 0)
    pos = L.get("pos", "center")
    if pos == "center":
        P = (E.W / 2, E.H * 0.42)
    elif pos == "top":
        P = (E.W / 2, h / 2 + 40)
    elif pos == "lower":
        P = (w / 2 + 70, E.H - h / 2 - 70)
    else:
        P = tuple(pos)
    P = c.pt(P)
    anim = L.get("anim", "slide" if pos == "lower" else "pop")
    op = L.get("opacity", 1.0)
    if anim == "slide":
        u = back(age / 0.45, 1.3)
        dx = -(1 - u) * (P[0] + w / 2 + 40)
        if outk < 1:
            dx = -(1 - outk) ** 2 * (P[0] + w / 2 + 40)
        place_sprite(frame, spr, SPR, (ax, ay), (P[0] + dx, P[1]), c.k, rot, op)
    else:
        sc = pop(age / 0.32) * c.k * (outk ** 0.5 if outk < 1 else 1)
        wig = 3.0 * math.sin(age * 14) * math.exp(-age * 5) if age > 0 else 0
        place_sprite(frame, spr, SPR, (ax, ay), P, sc, rot + wig, op * min(outk * 2, 1))


# ------------------------------------------------------------------------------------------------ 5 caption_pop
def caption_pop(frame, c, L, age, outk):
    """short word/number that pops near a point ("1274", "x2") and floats up a little.
    params: text, at=(x, y) centre, size=84, fill=YELLOW, ink=INK, font="main", rot=-6 (deg), rise=18 (px drift up
    over 1 s)"""
    size = L.get("size", 84)
    spr = text_sprite(L["text"], size, fill=L.get("fill", YELLOW), ink=L.get("ink", INK), fname=L.get("font", "main"))
    h, w = spr.shape[0] / SPR, spr.shape[1] / SPR
    P = c.pt(L["at"]) - (0, L.get("rise", 18) * ease_out(age / 1.0, 2) * c.k)
    sc = pop(age / 0.25, 2.6) * c.k * (0.5 + 0.5 * outk)
    rot = L.get("rot", -6) + 6 * math.sin(age * 18) * math.exp(-age * 6)
    place_sprite(frame, spr, SPR, (w / 2, h / 2), P, sc, rot, L.get("opacity", 1.0) * min(outk * 1.5, 1))


# ------------------------------------------------------------------------------------------------ 6 counter
def counter(frame, c, L, age, outk):
    """a number counting from a to b (ease-out), with a label ("200 km of tunnels"); punches when it lands.
    params: b, a=0, at=(x, y) centre of the number, count=1.2 (s counting), fmt="{:,.0f}", prefix="", suffix="",
    label=None, label_pos="below" | "right", size=110, fill=WHITE, ink=INK, label_fill=YELLOW, font="main",
    card=False (cream card behind)"""
    a, b = L.get("a", 0), L["b"]
    dur = L.get("count", 1.2)
    u = clamp((age - 0.12) / dur)
    v = a + (b - a) * ease_out(u, 3)
    s = L.get("prefix", "") + L.get("fmt", "{:,.0f}").format(v) + L.get("suffix", "")
    size = L.get("size", 110)
    spr = text_sprite(s, size, fill=L.get("fill", WHITE), ink=L.get("ink", INK), fname=L.get("font", "main"))
    final = text_sprite(L.get("prefix", "") + L.get("fmt", "{:,.0f}").format(b) + L.get("suffix", ""), size,
                        fill=L.get("fill", WHITE), ink=L.get("ink", INK), fname=L.get("font", "main"))
    P = c.pt(L["at"])
    sc = pop(age / 0.25) * c.k
    land = age - 0.12 - dur
    if 0 <= land < 0.3:
        sc *= 1 + 0.16 * math.sin(math.pi * land / 0.3)
    sc *= 0.4 + 0.6 * outk
    op = L.get("opacity", 1.0) * min(outk * 1.5, 1)
    fw, fh = final.shape[1] / SPR, final.shape[0] / SPR
    h, w = spr.shape[0] / SPR, spr.shape[1] / SPR
    lab = L.get("label")
    lspr = text_sprite(lab, int(size * 0.5), fill=L.get("label_fill", YELLOW), ink=L.get("ink", INK),
                       fname=L.get("font", "main")) if lab else None
    if L.get("card"):
        lw_ = lspr.shape[1] / SPR if lab else 0
        lh_ = lspr.shape[0] / SPR if lab else 0
        if L.get("label_pos", "below") == "right":
            cw, ch = fw + lw_ + size * 0.3, max(fh, lh_) + size * 0.2
            off = (lw_ / 2, 0)
        else:
            cw, ch = max(fw, lw_) + size * 0.4, fh + lh_ + size * 0.1
            off = (0, lh_ / 2 - size * 0.05)
        key = ("cardbg", int(cw), int(ch), _seed(L))
        if key not in _spr_cache:
            cv = _sprite_canvas(cw + 2 * OL + 12, ch + 2 * OL + 12)
            cv.poly(wobbly_rect(OL + 9, OL + 9, cw + OL + 9, ch + OL + 9, size * 0.18, _seed(L) + 1), INK, 0)
            cv.poly(wobbly_rect(OL, OL, cw + OL, ch + OL, size * 0.18, _seed(L)), PAPER, OL)
            _spr_cache[key] = (_to_float(cv), cw / 2 + OL, ch / 2 + OL)
        cs, cax, cay = _spr_cache[key]
        place_sprite(frame, cs, SPR, (cax - off[0], cay - off[1]), P, sc, 0, op)
    # number anchored at its centre (sized by the final string so it does not jump left/right)
    place_sprite(frame, spr, SPR, (w / 2, h / 2), P, sc, 0, op)
    if lspr is not None:
        lu = pop((age - 0.25) / 0.28) * c.k * (0.4 + 0.6 * outk)
        lh, lw = lspr.shape[0] / SPR, lspr.shape[1] / SPR
        if L.get("label_pos", "below") == "right":
            Q = P + (fw / 2 * sc + lw / 2 * lu - size * 0.05 * c.k, size * 0.12 * c.k)
        else:
            Q = P + (0, fh / 2 * sc + lh / 2 * lu - size * 0.22 * c.k)
        place_sprite(frame, lspr, SPR, (lw / 2, lh / 2), Q, lu, L.get("label_rot", -2), op)


# ------------------------------------------------------------------------------------------------ 7 bars
def bars(frame, c, L, age, outk):
    """2-4 comparison bars growing from a baseline with overshoot, labels under, values on top (counting).
    params: items=[(label, value[, colour]), ...], at=(x, y) bottom-left of the chart (baseline), size=(w, h) of the
    bar area (default (520, 300)), max=None (value of a full-height bar), fmt="{:,.0f}", suffix="", grow=0.7 (s),
    stagger=0.18 (s), colors=[...], card=True (cream card behind), title=None, label_size=44"""
    items = L["items"]
    n = len(items)
    x0, yb = L["at"]
    bw_, bh_ = L.get("size", (520, 300))
    vmax = L.get("max") or max(it[1] for it in items)
    cols = L.get("colors", [RED, BLUE, YELLOW, GREEN])
    grow, stag = L.get("grow", 0.7), L.get("stagger", 0.18)
    ls = L.get("label_size", 44)
    op = L.get("opacity", 1.0) * outk
    seed = _seed(L)
    slot = bw_ / n
    barw = slot * 0.6
    ttl = L.get("title")
    pad = 30
    top_extra = ls * 1.6 + (ls * 1.5 if ttl else 0)
    bx0, by0, bx1, by1 = x0 - pad, yb - bh_ - top_extra - pad * 0.5, x0 + bw_ + pad, yb + ls * 1.5 + pad * 0.6
    corners = c.pt([(bx0, by0), (bx1, by1)])
    cv = Canvas.around(corners, 14)
    if cv is None:
        return
    k = c.k
    cu = pop(age / 0.25, 1.4)
    card = L.get("card", True)
    if card and cu > 0:
        cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
        r = wobbly_rect(bx0, by0, bx1, by1, 22, seed)
        r = (r - (cx, cy)) * cu + (cx, cy)
        cv.poly(c.pt(r + (9, 10)), INK, 0)
        cv.poly(c.pt(r), PAPER, OL)
    base = c.pt([(x0 - 12, yb), (x0 + bw_ + 12, yb)])
    bp, bs = resample(base, 2)
    bp, bs = truncate(wobble(bp, bs, seed + 2, 1.2), bs, ease_out(age / 0.3))
    texts = []
    for i, it in enumerate(items):
        lab, val = it[0], it[1]
        col = it[2] if len(it) > 2 else cols[i % len(cols)]
        g = back((age - 0.2 - i * stag) / grow, 1.5) if age > 0.2 + i * stag else 0.0
        hgt = bh_ * val / vmax * g
        cx = x0 + slot * (i + 0.5)
        if hgt > 1:
            q = np.array([(cx - barw / 2, yb), (cx - barw / 2, yb - hgt), (cx + barw / 2, yb - hgt), (cx + barw / 2, yb)])
            cv.poly(c.pt(q), col, 0)
            sh = np.array([(cx + barw * 0.22, yb), (cx + barw * 0.22, yb - hgt), (cx + barw / 2, yb - hgt),
                           (cx + barw / 2, yb)])
            cv.poly(c.pt(sh), _shade(col, 0.8), 0)
            cv.poly(c.pt(q), None, OL)
        vt = clamp((age - 0.2 - i * stag) / grow)
        if vt > 0:
            vs = L.get("fmt", "{:,.0f}").format(val * ease_out(vt, 3)) + L.get("suffix", "")
            texts.append((vs, (cx, yb - hgt - ls * 0.75), ls, WHITE, pop(vt / 0.4)))
        texts.append((lab, (cx, yb + ls * 0.75), int(ls * 0.85), INK if card else WHITE,
                      pop((age - 0.15 - i * stag) / 0.3)))
    if len(bp) > 1:
        cv.stroke(bp, 6 * k, INK)
    cv.done(frame, op)
    if ttl:
        texts.append((ttl, ((bx0 + bx1) / 2, by0 + pad * 0.5 + ls * 0.75), int(ls * 1.05), INK if card else WHITE,
                      pop(age / 0.3)))
    for s, p, sz, fill, sc in texts:
        if fill == INK:
            spr = text_sprite(s, sz, fill=INK, ink=INK, stroke=0, shadow=False)
        else:
            spr = text_sprite(s, sz, fill=fill, ink=INK, shadow=False)
        h, w = spr.shape[0] / SPR, spr.shape[1] / SPR
        place_sprite(frame, spr, SPR, (w / 2, h / 2), c.pt(p), sc * k, 0, op)


# ------------------------------------------------------------------------------------------------ 8 route
def route(frame, c, L, age, outk):
    """dashed / dotted path that draws on along screen points with a moving marker at its head (maps).
    params: pts=[(x, y), ...] (use S.lonlat(set, lon, lat) for map coordinates), color=RED, width=9,
    style="dash" | "dots" | "solid", dash=(30, 18) (px on, off), draw=1.5 (s), smooth=True, head=True (arrowhead
    when complete), head_size=36, marker=True (dot riding the head), marker_color=WHITE, marker_r=17"""
    pts = [tuple(p) for p in L["pts"]]
    pts = T.crom(pts, False, 14) if L.get("smooth", True) and len(pts) > 2 else np.array(pts, float)
    seed = _seed(L)
    p, s = resample(c.pt(pts), 2.0)
    p = wobble(p, s, seed, 1.0 * c.k)
    draw = L.get("draw", 1.5)
    prog = ease_io(age / draw)
    q, qs = truncate(p, s, prog)
    col = L.get("color", RED)
    w = L.get("width", 9) * c.k
    hs = L.get("head_size", 36)
    cv = Canvas.around(p, w + 2 * OL + max(hs * c.k, 30) + 10)
    if cv is None:
        return
    style = L.get("style", "dash")
    if len(q) > 1:
        if style == "solid":
            cv.marker(q, w, col)
        elif style == "dots":
            gap = L.get("dash", (0, 2.6 * w))[1] or 2.6 * w
            for d in np.arange(0, qs[-1], gap):
                cp = q[min(int(np.searchsorted(qs, d)), len(q) - 1)]
                cv.dot(cp, w * 0.62, col, OL * 0.8)
        else:
            on, off = (np.asarray(L.get("dash", (30, 18)), float) * c.k)
            ph = (qs % (on + off)) < on
            idx = np.flatnonzero(np.diff(np.r_[0, ph.astype(int), 0]))
            segs = [(idx[i], idx[i + 1]) for i in range(0, len(idx), 2)]
            for a, b in segs:                                  # all outlines first, then the colour = clean joins
                if b - a > 1:
                    cv.stroke(q[a:b], w + 2 * OL, INK)
            for a, b in segs:
                if b - a > 1:
                    cv.stroke(q[a:b], w, col)
    done = clamp((age - draw) / 0.18)
    if L.get("head", True) and done > 0:
        _arrowhead(cv, p[-1] + (p[-1] - p[-8]) / (np.linalg.norm(p[-1] - p[-8]) + 1e-9) * 6 * c.k,
                   p[-1] - p[max(len(p) - 14, 0)], hs * back(done, 2.5), col, c.k)
    if L.get("marker", True) and age >= 0 and len(q):
        mr = L.get("marker_r", 17) * c.k * pop(age / 0.2)
        if not (L.get("head", True) and done >= 1):
            bob = 3 * c.k * math.sin(age * 12)
            cv.dot(q[-1] + (0, -bob * 0), mr, L.get("marker_color", WHITE), OL)
    cv.done(frame, outk * L.get("opacity", 1.0))


# ------------------------------------------------------------------------------------------------ 9 spotlight
_grid = {}


def spotlight(frame, c, L, age, outk, shot_t):
    """darkens everything except a soft circle ("look at this"); the circle shrinks onto the target as it fades in.
    params: at=(x, y), r=200, dark=0.62, soft=70 (feather px), keys=[(t_shot, (x, y), r), ...] optional moving /
    growing circle (times relative to the shot, eased between keys), ring=False (thin ink ring at the edge),
    tint=(0.20, 0.12, 0.10) colour of the dark area (BGR 0..1, multiplied)"""
    keys = L.get("keys")
    if keys:
        ks = [(k[0], np.array(k[1], float), float(k[2])) for k in keys]
        if shot_t <= ks[0][0]:
            ctr, r = ks[0][1], ks[0][2]
        elif shot_t >= ks[-1][0]:
            ctr, r = ks[-1][1], ks[-1][2]
        else:
            i = max(j for j in range(len(ks)) if ks[j][0] <= shot_t)
            u = ease_io((shot_t - ks[i][0]) / max(ks[i + 1][0] - ks[i][0], 1e-6))
            ctr, r = ks[i][1] + (ks[i + 1][1] - ks[i][1]) * u, ks[i][2] + (ks[i + 1][2] - ks[i][2]) * u
    else:
        ctr, r = np.array(L["at"], float), float(L.get("r", 200))
    u = ease_out(age / 0.45, 3)
    r = r * (1 + 2.5 * (1 - u))
    P = c.pt(ctr)
    r *= c.k
    soft = L.get("soft", 70) * c.k
    dark = L.get("dark", 0.62) * u * outk * L.get("opacity", 1.0)
    q = 4
    key = (E.H // q, E.W // q)
    if key not in _grid:
        _grid[key] = np.mgrid[0:key[0], 0:key[1]].astype(np.float32) * q + q / 2
    gy, gx = _grid[key]
    d = np.sqrt((gx - P[0]) ** 2 + (gy - P[1]) ** 2)
    m = np.clip((d - r) / max(soft, 1), 0, 1)
    m = m * m * (3 - 2 * m)
    m = cv2.resize(m, (E.W, E.H), interpolation=cv2.INTER_LINEAR)
    tint = np.array(L.get("tint", (0.20, 0.12, 0.10)), np.float32)
    k = (dark * m)[..., None]
    frame *= 1 - k * (1 - tint)
    if L.get("ring"):
        cv = Canvas.around([P - r - 10, P + r + 10], 8)
        if cv:
            p, s = resample(T.ellipse_pts(P[0], P[1], r + soft * 0.1, r + soft * 0.1, n=90), 2)
            cv.stroke(wobble(p, s, _seed(L), 1.2), 4 * c.k, INK)
            cv.done(frame, u * outk * 0.8)


# ------------------------------------------------------------------------------------------------ 10 emote
def _star(n, r0, r1, rot=0.0, jag=None):
    a = np.linspace(0, 2 * math.pi, 2 * n, endpoint=False) + math.radians(rot)
    r = np.where(np.arange(2 * n) % 2 == 0, r0, r1).astype(float)
    if jag is not None:
        r = r * jag
    return np.stack([r * np.cos(a), r * np.sin(a)], 1)


def _drop(cx, cy, s, ang=0.0):
    """tear drop (point up) centred on its round part."""
    t = np.linspace(0, 2 * math.pi, 40, endpoint=False)
    x = np.sin(t) * (1 - np.cos(t)) * 0.5
    y = -np.cos(t)
    pts = np.stack([x * s * 0.95, y * s * 1.05 + 0.25 * s], 1)
    pts[:, 1] = np.where(pts[:, 1] > 0, pts[:, 1] * 0.75, pts[:, 1] * 1.25)
    return rot2(pts, ang) + (cx, cy)


def emote(frame, c, L, age, outk):
    """comic symbols that pop with a bounce near a point and keep a little life.
    params: symbol = question | exclaim | sweat | anger | sparkle | impact | speed, at=(x, y), size=1.0, color
    (defaults: question WHITE, exclaim RED, sweat BLUE, anger RED, sparkle YELLOW, impact YELLOW, speed INK),
    rot=0 (deg), flip=False (mirror sweat/anger/sparkle layout), text=None (impact: word in the burst; question/
    exclaim: override the glyphs e.g. "?!"), dir=0 (speed: direction of motion in deg; lines trail behind),
    count (question/exclaim glyphs 1-3, speed lines 6, sparkles 3)"""
    kind = L["symbol"]
    s = L.get("size", 1.0) * c.k
    P = c.pt(L["at"])
    fl = -1 if L.get("flip") else 1
    op = L.get("opacity", 1.0) * min(outk * 1.6, 1)
    sc = pop(age / 0.28, 2.6) * (0.3 + 0.7 * outk)
    if sc <= 0.01:
        return
    rot = L.get("rot", 0)
    if kind in ("question", "exclaim"):
        n = L.get("count", 1)
        txt = L.get("text") or ("?" if kind == "question" else "!") * n
        col = L.get("color", WHITE if kind == "question" else RED)
        spr = text_sprite(txt, int(200 * L.get("size", 1.0)), fill=col, ink=INK, stroke=16 * L.get("size", 1.0),
                          fname="comic", spacing=0)
        h, w = spr.shape[0] / SPR, spr.shape[1] / SPR
        if kind == "question":
            r = rot + 10 * math.sin(age * 5.0) + 14 * math.sin(age * 20) * math.exp(-age * 5)
            dy = 0
        else:
            r = rot + 4 * math.sin(age * 9)
            dy = -abs(math.sin(age * 7.5)) * 10 * s * math.exp(-age * 1.2)
        place_sprite(frame, spr, SPR, (w / 2, h * 0.92), P + (0, dy), sc * c.k, r, op)
        return
    seed = _seed(L)
    shapes = []                                       # (kind, pts, fill, extra)
    if kind == "sweat":
        col = L.get("color", BLUE)
        for i, (dx, dy, ds, da) in enumerate(((0, 0, 1.0, -18), (70, 44, 0.72, -8), (-52, 66, 0.55, -30))):
            slide = (age * 26 * (0.6 + 0.3 * i)) % 30 if age > 0.3 else 0
            cx = dx * fl * s * sc
            cy = (dy + slide * 0.6) * s * sc
            shapes.append(("poly", _drop(cx, cy, 40 * ds * s * sc, da * fl), col))
            shapes.append(("hl", _drop(cx - 10 * ds * s * sc, cy + 4 * ds * s * sc, 10 * ds * s * sc, da * fl), WHITE))
    elif kind == "anger":
        col = L.get("color", RED)
        pulse = 1 + 0.12 * max(0, math.sin(age * 2 * math.pi * 2.2)) ** 3 if age > 0.3 else 1
        k = 46 * s * sc * pulse
        for qd in range(4):                       # vein mark: four arcs bulging toward the centre, a "+" gap between
            arc = T.crom(np.array([(1.0, 0.2), (0.36, 0.36), (0.2, 1.0)]) * k, False, 8)
            shapes.append(("line", rot2(arc, 90 * qd + rot), col, 15 * s * sc))
    elif kind == "sparkle":
        col = L.get("color", YELLOW)
        lay = [(0, 0, 1.0, 0.0), (96, -60, 0.62, 1.7), (-80, -86, 0.5, 3.1), (64, 64, 0.42, 4.4)][:L.get("count", 3)]
        for dx, dy, ds, ph in lay:
            tw = 0.75 + 0.25 * math.sin(age * 7 + ph) if age > 0.3 else 1
            st = _star(4, 64 * ds * s * sc * tw, 17 * ds * s * sc * tw, rot + age * 40 * (1 if ph < 2 else -1))
            shapes.append(("poly", st + (dx * fl * s * sc, dy * s * sc), col))
    elif kind == "impact":
        col = L.get("color", YELLOW)
        rng = np.random.default_rng(seed)
        jag = rng.uniform(0.78, 1.18, 24)
        flick = 1 + 0.04 * math.sin(age * 40) if age > 0.3 else 1
        shapes.append(("poly", _star(12, 150 * s * sc * flick, 82 * s * sc, rot, jag), col))
        shapes.append(("poly", _star(10, 86 * s * sc, 50 * s * sc, rot + 9, jag[:20] ** 0.5), WHITE))
    elif kind == "speed":
        col = L.get("color", INK)
        d = math.radians(L.get("dir", 0))
        dv = np.array([math.cos(d), math.sin(d)])
        nv = np.array([-dv[1], dv[0]])
        rng = np.random.default_rng(seed)
        n = L.get("count", 6)
        step = int(age * 15)                      # flicker on twos
        r2 = np.random.default_rng(seed + step)
        for i in range(n):
            off = (i - (n - 1) / 2) * 36 * s
            ln = rng.uniform(140, 280) * s * (0.85 + 0.3 * r2.random())
            st = -dv * (rng.uniform(10, 60) * s + r2.uniform(0, 14) * s)
            a = st + nv * off
            b = a - dv * ln * ease_out(age / 0.18)
            shapes.append(("taper", np.array([a, b]), col, 11 * s))
    else:
        return
    allp = np.vstack([sp[1] for sp in shapes]) + P
    cv = Canvas.around(allp, 30 * s + 12)
    if cv is None:
        return
    for sp in shapes:
        pts = sp[1] + P
        if sp[0] == "poly":
            p, ss_ = resample(np.vstack([pts, pts[:1]]), 2)
            cv.poly(wobble(p, ss_, seed, 0.8)[:-1], sp[2], OL)
        elif sp[0] == "hl":
            cv.poly(pts, sp[2], 0)
        elif sp[0] == "line":
            p, ss_ = resample(pts, 2)
            u = np.linspace(0, 1, len(p))
            cv.marker(p, sp[3] * (0.55 + 0.45 * np.sin(np.pi * u)), sp[2])
        elif sp[0] == "taper":
            p, ss_ = resample(pts, 3)
            u = np.linspace(0, 1, len(p))
            cv.stroke(p, sp[3] * (1 - 0.85 * u), sp[2])
    cv.done(frame, op)


# ------------------------------------------------------------------------------------------------ 11 meter
def meter(frame, c, L, age, outk, shot_t):
    """game-UI bar ("POWER") that fills / drains.
    params: at=(x, y) top-left of the bar, size=(w, h)=(440, 46), label="POWER" (None = no label), keys=[(t_shot,
    value 0..1), ...] (eased between keys; times relative to the shot) or value=1.0, color=GREEN, low=0.25 (below:
    low_color + blinking), low_color=RED, segments=10 (0 = smooth bar), show_value=False ("75%" at the right end)"""
    x, y = L["at"]
    w, h = L.get("size", (440, 46))
    keys = L.get("keys")
    if keys:
        if shot_t <= keys[0][0]:
            v = keys[0][1]
        elif shot_t >= keys[-1][0]:
            v = keys[-1][1]
        else:
            i = max(j for j in range(len(keys)) if keys[j][0] <= shot_t)
            u = ease_io((shot_t - keys[i][0]) / max(keys[i + 1][0] - keys[i][0], 1e-6))
            v = keys[i][1] + (keys[i + 1][1] - keys[i][1]) * u
    else:
        v = L.get("value", 1.0)
    v = clamp(v)
    sc = pop(age / 0.3, 1.6) * (0.4 + 0.6 * outk)
    if sc <= 0.01:
        return
    op = L.get("opacity", 1.0) * min(outk * 1.6, 1)
    low = v < L.get("low", 0.25)
    col = L.get("low_color", RED) if low else L.get("color", GREEN)
    if low and int(age * 6) % 2:
        col = _shade(col, 1.35)
    lab = L.get("label", "POWER")
    k = c.k * sc
    org = c.pt((x, y + h / 2))
    def Pp(pts):                                   # local (bar px, origin left-middle) -> screen
        return np.asarray(pts, float) * k + org
    cv = Canvas.around(Pp([(-14, -h), (w + 14, h)]), 16)
    if cv is None:
        return
    seed = _seed(L)
    rr = h * 0.42
    frame_r = wobbly_rect(-8, -h / 2 - 8, w + 8, h / 2 + 8, rr + 6, seed, 1.0)
    cv.poly(Pp(frame_r + (6, 7)), INK, 0)
    cv.poly(Pp(frame_r), (70, 62, 66), OL)
    inner = wobbly_rect(0, -h / 2, w, h / 2, rr, seed + 1, 0.5)
    cv.poly(Pp(inner), (44, 36, 40), 0)
    fw = w * v
    nseg = L.get("segments", 10)
    if fw > 2:
        if nseg:
            gap = 6
            sw = (w - gap * (nseg + 1)) / nseg
            for i in range(nseg):
                a = gap + i * (sw + gap)
                b = min(a + sw, fw - gap / 2)
                if b - a < 1:
                    break
                cv.poly(Pp([(a, -h / 2 + 6), (b, -h / 2 + 6), (b, h / 2 - 6), (a, h / 2 - 6)]), col, 0)
                cv.poly(Pp([(a, -h / 2 + 6), (b, -h / 2 + 6), (b, -h / 2 + 6 + h * 0.2), (a, -h / 2 + 6 + h * 0.2)]),
                        _shade(col, 1.3), 0)
        else:
            cv.poly(Pp(wobbly_rect(4, -h / 2 + 5, max(fw - 4, 4 + rr), h / 2 - 5, rr * 0.8, seed + 2, 0.4)), col, 0)
            cv.poly(Pp([(14, -h / 2 + 9), (max(fw - 14, 15), -h / 2 + 9), (max(fw - 14, 15), -h / 2 + 9 + h * 0.15),
                        (14, -h / 2 + 9 + h * 0.15)]), _shade(col, 1.35), 0)
    cv.poly(Pp(inner), None, 3.0)
    cv.done(frame, op)
    if lab:
        ls = int(h * 1.05)
        spr = text_sprite(lab, ls, fill=WHITE, ink=INK, fname="main")
        lh, lw = spr.shape[0] / SPR, spr.shape[1] / SPR
        pad = ls * 0.11 + 4 + ls * 0.12                       # sprite padding around the glyphs
        place_sprite(frame, spr, SPR, (pad, lh - pad), Pp([(4, -h / 2 - 12)])[0], k, -2, op)
    if L.get("show_value"):
        spr = text_sprite(f"{v * 100:.0f}%", int(h * 0.7), fill=WHITE, ink=INK, fname="main", shadow=False)
        lh, lw = spr.shape[0] / SPR, spr.shape[1] / SPR
        place_sprite(frame, spr, SPR, (lw, lh / 2), Pp([(w - 10, 0)])[0], k, 0, op)


# ------------------------------------------------------------------------------------------------ 12 stamp
def _stamp_sprite(text, size, col, seed, fname):
    key = ("stamp", text, size, col, seed, fname)
    if key in _spr_cache:
        return _spr_cache[key]
    ts = text_sprite(text, size, fill=col, ink=col, stroke=0, fname=fname, shadow=False)
    tw, th = ts.shape[1] / SPR, ts.shape[0] / SPR
    pw, ph = tw + size * 0.5, th + size * 0.12
    b1, b2 = size * 0.1, size * 0.045
    W_, H_ = pw + 2 * b1 + 16, ph + 2 * b1 + 16
    cv = _sprite_canvas(W_, H_)
    x0, y0, x1, y1 = 8 + b1 / 2, 8 + b1 / 2, W_ - 8 - b1 / 2, H_ - 8 - b1 / 2
    r = size * 0.16
    p, s = resample(np.vstack([wobbly_rect(x0, y0, x1, y1, r, seed, 1.5)] * 1), 3)
    cv.poly(p, None, b1, col)
    p2 = wobbly_rect(x0 + b1 * 1.3, y0 + b1 * 1.3, x1 - b1 * 1.3, y1 - b1 * 1.3, r * 0.6, seed + 1, 1.0)
    cv.poly(p2, None, b2, col)
    cv.paste(ts, SPR, W_ / 2 - tw / 2, H_ / 2 - th / 2 - size * 0.03)
    img = _to_float(cv)
    # rubber-stamp grain: blotchy ink-free specks and a slightly uneven density
    rng = np.random.default_rng(seed)
    hh, ww = img.shape[:2]
    n1 = cv2.GaussianBlur(rng.standard_normal((hh, ww)).astype(np.float32), (0, 0), 2.2)
    n2 = cv2.resize(cv2.GaussianBlur(rng.standard_normal((hh // 16 + 2, ww // 16 + 2)).astype(np.float32), (0, 0), 1.5),
                    (ww, hh), interpolation=cv2.INTER_CUBIC)
    n1 /= n1.std() + 1e-6
    n2 /= n2.std() + 1e-6
    keep = np.clip(1.0 - np.clip((n1 - 1.25) * 1.6, 0, 1) - np.clip((n2 - 1.0) * 0.35, 0, 0.45), 0, 1)
    img *= keep[..., None]
    out = (img, W_, H_)
    _spr_cache[key] = out
    return out


def stamp(frame, c, L, age, outk):
    """rubber stamp ("FAILED", "1346") that slams in (big -> small), lands with a jolt, slightly rotated, red,
    with grainy ink. params: text, at=(x, y), size=120, rot=-12 (deg), color=RED, font="main", opacity=0.92,
    shake=9 (px screen shake on landing, 0 = none; added to the shot's shake)"""
    size = L.get("size", 120)
    spr, w, h = _stamp_sprite(L["text"], size, L.get("color", RED), _seed(L), L.get("font", "main"))
    land = 0.13
    if age < land:
        u = age / land
        sc = 2.6 - 1.6 * u * u
        op = 0.25 + 0.6 * u
    else:
        v = age - land
        sc = 1 - 0.05 * math.exp(-v / 0.06) * math.cos(v * 40)
        op = 1.0
    sc *= c.k * (1 + 0.3 * (1 - outk))
    place_sprite(frame, spr, SPR, (w / 2, h / 2), c.pt(L["at"]), sc, L.get("rot", -12),
                 op * outk * L.get("opacity", 0.92))


def stamp_shake(L, t):
    """screen shake (dx, dy) a stamp adds to its shot when it lands."""
    amp = L.get("shake", 9)
    v = t - L.get("t", 0) - 0.13
    if not amp or v < 0:
        return 0.0, 0.0
    env = amp * math.exp(-v / 0.12)
    return env * math.sin(v * 61), env * math.cos(v * 53)


# ------------------------------------------------------------------------------------------------ filters
_fcache = {}


def _edge(key, power, start):
    if key not in _fcache:
        yy, xx = np.mgrid[0:E.H, 0:E.W].astype(np.float32)
        r = np.sqrt(((xx - E.W / 2) / (E.W / 2)) ** 2 + ((yy - E.H / 2) / (E.H / 2)) ** 2)
        _fcache[key] = np.clip((r - start) / (1.42 - start), 0, 1) ** power
    return _fcache[key]


def apply_filter(frame, f):
    """shot filter: "sepia" (old-photo flashback: brown monotone, lifted blacks, soft burnt edge, grain) or
    "night" (blue, dark, desaturated, with a darker edge). f: name or dict(kind=..., amount=1.0)."""
    if isinstance(f, str):
        f = dict(kind=f)
    kind, amt = f["kind"], f.get("amount", 1.0)
    src = frame.copy() if amt < 1 else None
    lum = frame[..., 0] * 0.114 + frame[..., 1] * 0.587 + frame[..., 2] * 0.299
    if kind == "sepia":
        lum = 0.08 + lum * 0.86
        frame[..., 0] = lum * 0.70
        frame[..., 1] = lum * 0.88
        frame[..., 2] = lum * 1.04
        e = _edge("sep", 1.6, 0.55)
        frame *= (1 - 0.62 * e)[..., None]
        frame += (0.05 * e)[..., None] * np.array([0.10, 0.25, 0.45], np.float32)
        if "sgrain" not in _fcache:
            rng = np.random.default_rng(11)
            g = cv2.GaussianBlur(rng.standard_normal((E.H // 2, E.W // 2)).astype(np.float32), (0, 0), 1.2)
            spots = cv2.GaussianBlur(rng.standard_normal((E.H // 24, E.W // 24)).astype(np.float32), (0, 0), 1.0)
            g = cv2.resize(g, (E.W, E.H)) * 0.035 + cv2.resize(spots, (E.W, E.H), interpolation=cv2.INTER_CUBIC) * 0.03
            _fcache["sgrain"] = (1 + g)[..., None]
        frame *= _fcache["sgrain"]
    elif kind == "night":
        mix = frame * 0.45 + lum[..., None] * 0.55
        frame[:] = mix * np.array([1.08, 0.80, 0.60], np.float32) * 0.74 + np.array([0.07, 0.03, 0.0], np.float32)
        e = _edge("night", 1.4, 0.4)
        frame *= (1 - 0.45 * e)[..., None]
    if src is not None:
        frame *= amt
        frame += src * (1 - amt)


# ------------------------------------------------------------------------------------------------ dispatch
def render(frame, L, sh, t, tn, shk):
    """draw overlay layer L of shot sh at shot time t (tn = normalised shot time, shk = shot shake offset)."""
    dur = sh["end"] - sh["start"]
    age, end, outk = life(L, t, dur)
    if age < 0 or (end is not None and t >= end):
        return
    c = Ctx(L, sh, t, tn, shk)
    k = L["type"]
    if k == "circle":
        circle(frame, c, L, age, outk)
    elif k == "underline":
        arrow(frame, c, L, age, outk, head_default=False)
    elif k == "arrow":
        arrow(frame, c, L, age, outk, head_default=True)
    elif k == "label":
        label(frame, c, L, age, outk)
    elif k == "title":
        title(frame, c, L, age, outk)
    elif k == "caption_pop":
        caption_pop(frame, c, L, age, outk)
    elif k == "counter":
        counter(frame, c, L, age, outk)
    elif k == "bars":
        bars(frame, c, L, age, outk)
    elif k == "route":
        route(frame, c, L, age, outk)
    elif k == "spotlight":
        spotlight(frame, c, L, age, outk, t)
    elif k == "emote":
        emote(frame, c, L, age, outk)
    elif k == "meter":
        meter(frame, c, L, age, outk, t)
    elif k == "stamp":
        stamp(frame, c, L, age, outk)


def extra_shake(sh, t):
    """shake added by overlays (stamps landing) at shot time t."""
    dx = dy = 0.0
    for L in sh["layers"]:
        if L["kind"] == "overlay" and L.get("type") == "stamp":
            ex, ey = stamp_shake(L, t)
            dx += ex
            dy += ey
    return dx, dy


REQUIRED = dict(circle=[("at", "box")], underline=[("pts", "span")], arrow=["pts"], label=["text", "at"],
                title=["text"], caption_pop=["text", "at"], counter=["b", "at"], bars=["items", "at"], route=["pts"],
                spotlight=[("at", "keys")], emote=["symbol", "at"], meter=["at"], stamp=["text", "at"])


def check(L, dur, sid):
    """static checks of one overlay layer in a shot of length dur -> list of error strings."""
    errs = []
    k = L.get("type")
    name = f"{sid} overlay {k}"
    if k not in TYPES:
        return [f"{sid}: unknown overlay type {k!r} (known: {', '.join(TYPES)})"]
    for req in REQUIRED[k]:
        if isinstance(req, tuple):
            if not any(r in L for r in req):
                errs.append(f"{name}: needs one of {' / '.join(req)}")
        elif req not in L:
            errs.append(f"{name}: missing required param {req!r}")
    t0 = L.get("t")
    if t0 is None:
        errs.append(f"{name}: missing start time t")
        return errs
    if not 0 <= t0 < dur:
        errs.append(f"{name}: t={t0:.2f} outside the shot (0..{dur:.2f})")
    end = t0 + L["dur"] if "dur" in L else L.get("out")
    if end is not None and (end <= t0 or end > dur + 1e-3):
        errs.append(f"{name}: ends at {end:.2f}, must be after t={t0:.2f} and <= shot length {dur:.2f}")
    if k == "emote" and L.get("symbol") not in EMOTES:
        errs.append(f"{name}: unknown emote symbol {L.get('symbol')!r} (known: {', '.join(EMOTES)})")
    if k == "bars" and "items" in L and not 1 <= len(L["items"]) <= 6:
        errs.append(f"{name}: {len(L['items'])} items (use 2-4)")
    if k in ("route", "arrow") and "pts" in L and len(L["pts"]) < 2:
        errs.append(f"{name}: needs at least 2 points")
    for key in ("keys",):
        if key in L and k in ("spotlight", "meter"):
            ts = [kk[0] for kk in L[key]]
            if ts != sorted(ts) or any(x < 0 or x > dur + 1e-3 for x in ts):
                errs.append(f"{name}: key times {[round(x, 2) for x in ts]} must rise and stay inside the shot")
    return errs


def check_filter(f, sid):
    kind = f if isinstance(f, str) else (f.get("kind") if isinstance(f, dict) else None)
    return [] if kind in FILTERS else [f"{sid}: unknown filter {f!r} (known: {', '.join(FILTERS)})"]
