"""Scenery kits (flat-cartoon-code-video): reusable code-drawn building blocks for history/science explainer sets.

Same conventions as scenery.py: draw on a Plate layer (a toon.Painter in plate px, y down, BGR colours), back to
front; big flat shapes, one soft shade side (Painter does it), sparse texture, BG_INK outlines (OL main, OL2 minor).
Every helper takes the layer painter `pt` first; `base` = the y where a thing stands (its feet on the ground line).

Kits
  interior  room, wall(kind=brick|stone|timber|planks|shoji|palace|plaster), floor(kind=planks|flagstone|tatami|dirt),
            skirting, ceiling_beams, window_gothic, window_lattice, window_round, door, archway, banner, flag,
            tapestry, scroll, torch, candle, table, bench, shelf, throne, dais, carpet, folding_screen, chalkboard, desk,
            workbench, tool_rack, gear, barrel, crate
  nature    tree(kind=round|pine|cypress|palm|blossom|bamboo), tree_row, treeline, bush, grass_tufts, rock, water,
            river, field, road, hills, sun, rain_layer, tipi
  depth     furrows (perspective lines to a vanishing point), fog (haze band layer); text: ptext, font_path
  architecture  merlons, stone_wall, tower, castle, city_wall, eave_roof, jp_castle, pagoda, torii, cn_hall,
            great_wall, temple, colonnade, pyramid, house, windmill, factory, townhouse, lamp_post, workshop, cobbles
  maps      map_plate(name, lon0, lat0, lon1, lat1, highlight={"FRA": color}, regions=[(lonlat_poly, color)]) ->
            saves the set with "proj" in sets.json (Natural Earth 1:110m data in assets/geo/)
Utilities   rect, dense, tone, mix, box, ring_line, clipped (draw clipped to a polygon), glow, Persp (floor perspective)
"""
import math, json, pathlib, sys
import numpy as np, cv2

_HERE = pathlib.Path(__file__).resolve().parent
_SKILL = pathlib.Path.home() / ".claude" / "skills" / "flat-cartoon-code-video"
try:
    import scenery as SC
except ImportError:
    sys.path.append(str(_HERE))
    import scenery as SC
import toon as T
from scenery import Plate, save, sky_grad, cloud, patch, texture, wob, PW, PH, OL, OL2, BG_INK, SS

_GEO_DIRS = [_HERE.parent / "assets" / "geo", _SKILL / "assets" / "geo"]

K = dict(  # BGR
    # interior
    plaster=(196, 220, 234), brick=(80, 102, 176), stone=(160, 166, 172), stone_lt=(194, 200, 206),
    stone_warm=(150, 176, 198), wood=(70, 112, 164), wood_lt=(100, 150, 200), wood_dk=(46, 70, 104),
    timber=(48, 64, 92), iron=(76, 70, 70), shoji=(226, 240, 246), tatami=(126, 196, 206), tatami_edge=(62, 92, 64),
    red=(52, 56, 180), red_dk=(42, 42, 140), cn_red=(42, 52, 200), cn_wall=(52, 58, 160), gold=(62, 186, 234),
    gold_dk=(40, 140, 192), teal=(150, 150, 60), jade=(120, 156, 70), blue=(170, 110, 56), purple=(130, 66, 110),
    dark=(58, 46, 44), lead=(64, 52, 50), sky_lt=(246, 222, 176), night=(120, 76, 54), flame=(40, 142, 252),
    flame_in=(116, 228, 255), glow=(150, 214, 255), cloth=(214, 206, 196), parchment=(196, 230, 242),
    # nature
    leaf=(84, 170, 114), leaf_dk=(66, 140, 92), pine=(88, 128, 60), cypress=(76, 112, 66), palm=(82, 172, 112),
    blossom=(206, 184, 248), trunk=(60, 86, 124), bamboo=(100, 184, 150), grass=(100, 180, 142), grass_dk=(80, 152, 118),
    field=(104, 178, 216), field_dk=(82, 148, 186), rice=(150, 196, 150), mud=(82, 106, 138), mud_dk=(66, 88, 116),
    water=(214, 186, 124), water_lt=(238, 218, 176), rock=(152, 156, 164), hill_far=(190, 200, 172),
    hill_mid=(150, 188, 152), sand=(142, 198, 234), sand_dk=(114, 168, 208),
    # architecture
    castle=(170, 178, 184), roof_red=(66, 86, 188), slate=(128, 110, 98), jp_wall=(242, 244, 244),
    jp_roof=(102, 90, 78), torii=(48, 86, 224), cn_roof=(54, 178, 230), wall_tan=(122, 156, 182),
    marble=(226, 230, 234), board=(74, 92, 52), chalk=(226, 232, 228), sandstone=(132, 192, 228), thatch=(92, 162, 198), factory_brick=(72, 88, 152),
    smoke=(188, 184, 182), cobble=(142, 148, 158), townhouse=(110, 140, 186),
    # maps
    map_paper=(178, 222, 238), map_sea=(200, 208, 172), map_land=(162, 210, 228), burnt=(38, 66, 104),
)
# distinct flat colours for map regions / banners (BGR)
REGION_COLORS = [(84, 96, 206), (198, 134, 92), (104, 172, 112), (72, 152, 232), (178, 112, 152), (172, 170, 72),
                 (92, 202, 232), (160, 132, 222), (128, 128, 128)]
GLASS = [(176, 96, 46), (54, 54, 196), (62, 186, 234), (96, 156, 64), (140, 66, 116)]
BOOKS = [(52, 56, 168), (150, 96, 46), (70, 130, 70), (40, 110, 170), (110, 60, 110), (60, 150, 200), (70, 70, 90)]


# ================================================================================================ utilities
def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def dense(pts, step=30.0, closed=True):
    """resample a polygon so its edges get the hand-drawn wobble (Painter wobbles shapes with >= 6 points)."""
    p = np.asarray(pts, float)
    if closed:
        p = np.vstack([p, p[:1]])
    out = []
    for a, b in zip(p[:-1], p[1:]):
        n = max(1, int(np.hypot(*(b - a)) / step))
        out += [a + (b - a) * k / n for k in range(n)]
    if not closed:
        out.append(p[-1])
    return np.array(out)


def tone(c, k):
    return tuple(int(min(255, max(0, v * k))) for v in c)


def mix(a, b, u):
    return tuple(int(a[i] * (1 - u) + b[i] * u) for i in range(3))


def box(pt, x0, y0, x1, y1, fill, line=OL2, shade=True, wobble=False):
    pts = rect(x0, y0, x1, y1)
    pt.shape(dense(pts, 40) if wobble else pts, fill, line, shade=shade)


def ring_line(pt, pts, width, color):
    p = [tuple(map(float, q)) for q in np.asarray(pts, float)]
    pt.line(p + [p[0]], width, color)


def clipped(pt, clip, draw, pad=40):
    """run draw() and keep only what it painted inside polygon `clip` (plate px). draw() should stay near the clip's
    bounding box (pixels changed more than `pad` canvas px outside it are kept)."""
    q = pt.P(clip)
    Hc, Wc = pt.img.shape[:2]
    x0, y0 = max(int(q[:, 0].min() // 4) - pad, 0), max(int(q[:, 1].min() // 4) - pad, 0)
    x1, y1 = min(int(q[:, 0].max() // 4) + pad, Wc), min(int(q[:, 1].max() // 4) + pad, Hc)
    if x1 <= x0 or y1 <= y0:
        return
    snap = pt.img[y0:y1, x0:x1].copy()
    draw()
    m = np.zeros((y1 - y0, x1 - x0), np.uint8)
    cv2.fillPoly(m, [q - np.array([x0 * 4, y0 * 4], np.int32)], 1, cv2.LINE_8, 2)
    reg = pt.img[y0:y1, x0:x1]
    reg[m == 0] = snap[m == 0]


def glow(pt, x, y, r, color=K["glow"], strength=0.45):
    """warm radial light blended into what is already painted (torches, candles, lamps, windows)."""
    c = pt.A[:, :2] @ np.array([x, y], float) + pt.A[:, 2]
    R = r * pt.s
    Hc, Wc = pt.img.shape[:2]
    x0, y0, x1, y1 = max(int(c[0] - R), 0), max(int(c[1] - R), 0), min(int(c[0] + R), Wc), min(int(c[1] + R), Hc)
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    f = (np.clip(1 - np.hypot(xx - c[0], yy - c[1]) / R, 0, 1) ** 1.6 * strength)[..., None]
    reg = pt.img[y0:y1, x0:x1]
    on = reg[..., 3:4] > 0
    reg[..., :3] = np.where(on, reg[..., :3] * (1 - f) + np.array(color, np.float32) * f, reg[..., :3]).astype(np.uint8)


def arch_pts(cx, ys, w, r=0.5, n=16):
    """arch from the left springing point (cx-w/2, ys) over the top to the right one. r = arc radius / width:
    0.5 = round arch, 0.6-1.0 = pointed (gothic)."""
    hw = w / 2
    if r <= 0.5 + 1e-6:
        a = np.linspace(math.pi, 0, n * 2)
        return np.stack([cx + hw * np.cos(a), ys - hw * np.sin(a)], 1)
    R = w * r
    ccx = cx - hw + R
    th = math.acos((hw - R) / R)
    a = np.linspace(math.pi, th, n)
    left = np.stack([ccx + R * np.cos(a), ys - R * np.sin(a)], 1)
    right = left[::-1].copy()
    right[:, 0] = 2 * cx - right[:, 0]
    return np.vstack([left, right[1:]])


def arch_height(w, r=0.5):
    if r <= 0.5 + 1e-6:
        return w / 2
    R, hw = w * r, w / 2
    return R * math.sin(math.acos((hw - R) / R))


def arch_poly(cx, base, w, h, r=0.5):
    """an arched opening of total height h (base to apex)."""
    ys = base - h + arch_height(w, r)
    return np.vstack([[[cx - w / 2, base]], arch_pts(cx, ys, w, r), [[cx + w / 2, base]]])


class Persp:
    """one-point floor perspective: u in [0, 1] across the back edge (x0..x1 at y=gy), v in [0, 1] from the back
    edge to the front (y=y1); the floor is `spread` times wider at the front. Equal v steps = equal depth steps."""

    def __init__(self, x0, x1, gy, y1, spread=1.8):
        self.cx, self.hw, self.gy, self.y1, self.sp = (x0 + x1) / 2, (x1 - x0) / 2, gy, y1, spread

    def __call__(self, u, v):
        s = 1 / (self.sp + (1 - self.sp) * v)
        k = (s - 1 / self.sp) / (1 - 1 / self.sp)
        return (self.cx + (u - 0.5) * 2 * self.hw * self.sp * s, self.gy + (self.y1 - self.gy) * k)

    def quad(self, u0, v0, u1, v1):
        return [self(u0, v0), self(u1, v0), self(u1, v1), self(u0, v1)]


def star_pts(cx, cy, r, n=5, inner=0.45, rot=-90):
    a = np.radians(rot) + np.arange(2 * n) * math.pi / n
    rr = np.where(np.arange(2 * n) % 2 == 0, r, r * inner)
    return np.stack([cx + rr * np.cos(a), cy + rr * np.sin(a)], 1)


def scallop(cx, cy, rx, ry, bumps=9, depth=0.09, n=180, seed=0):
    """bumpy round outline (tree crowns, bushes, smoke)."""
    rng = np.random.default_rng(seed)
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    ph = rng.uniform(0, math.pi)
    r = 1 - depth + depth * np.abs(np.cos(bumps * a / 2 + ph))
    return np.stack([cx + rx * r * np.cos(a), cy + ry * r * np.sin(a)], 1)


# ================================================================================================ interior kit
WALLS = dict(brick=K["brick"], stone=K["stone"], timber=K["plaster"], planks=K["wood"], shoji=K["shoji"],
             palace=K["cn_wall"], plaster=K["plaster"])


def wall(pt, x0, y0, x1, y1, kind="plaster", color=None, seed=0, **kw):
    """flat wall area with sparse texture. kind: brick (clusters of bricks; full=True for all), stone (big blocks,
    course=110), timber (plaster + dark beams, beam=, bay=380), planks (vertical boards), shoji (paper screens over a
    wooden kick panel, panel=300), palace (red wall + red columns with gold/teal bracket band, bay=420), plaster."""
    rng = np.random.default_rng(seed)
    col = color or WALLS[kind]
    box(pt, x0, y0, x1, y1, col, line=0, shade=False)
    W, H = x1 - x0, y1 - y0
    if kind == "brick":
        c = kw.get("course", 44)
        bw = c * 2.3
        mortar = tone(col, 0.74)
        if kw.get("full"):
            clusters = [((x0 + x1) / 2, (y0 + y1) / 2, W * 2, H * 2)]
        else:
            n = kw.get("clusters", max(4, int(W * H / 160000)))
            clusters = [(rng.uniform(x0, x1), rng.uniform(y0 + c, y1 - c), rng.uniform(2.2, 3.4) * bw,
                         rng.uniform(1.8, 3.0) * c) for _ in range(n)]
        done = set()
        for cx, cy, rx, ry in clusters:
            for r in range(int((cy - ry - y0) // c), int((cy + ry - y0) // c) + 1):
                yy = y0 + r * c
                off = (r % 2) * bw / 2
                for k in range(int((cx - rx - x0) // bw) - 1, int((cx + rx - x0) // bw) + 2):
                    bx = x0 + k * bw - off
                    if (r, k) in done or yy < y0 or yy + c > y1 + 1 or bx + bw < x0 or bx > x1:
                        continue
                    if ((bx + bw / 2 - cx) / rx) ** 2 + ((yy + c / 2 - cy) / ry) ** 2 > 1 or rng.random() < 0.18:
                        continue
                    done.add((r, k))
                    q = rect(max(bx, x0) + 3, yy + 3, min(bx + bw, x1) - 3, yy + c - 3)
                    pt.shape(q, tone(col, rng.choice([0.9, 0.95, 1.06])), 0, shade=False)
                    ring_line(pt, q, 3, mortar)
    elif kind == "stone":
        c = kw.get("course", 110)
        mortar = tone(col, 0.72)
        for r, yy in enumerate(np.arange(y0, y1, c)):
            xx = x0 - rng.uniform(0, c * 1.6)
            while xx < x1:
                bw = rng.uniform(1.3, 2.3) * c
                q = rect(xx + 4, yy + 4, xx + bw - 4, min(yy + c, y1) - 4)
                pt.shape(dense(q, 50), tone(col, rng.choice([0.95, 1.0, 1.04])), 0, shade=False)
                ring_line(pt, dense(q, 50), 3.5, mortar)
                if rng.random() < 0.12:  # a small crack
                    sx, sy = xx + rng.uniform(0.3, 0.7) * bw, yy + 6
                    pt.line([(sx, sy), (sx + 10, sy + c * 0.25), (sx + 2, sy + c * 0.45)], 3, mortar)
                xx += bw
    elif kind == "timber":
        beam, bay, t = kw.get("beam", K["timber"]), kw.get("bay", 380), kw.get("t", 30)
        for _ in range(int(W * H / 250000) + 2):
            patch(pt, rng.uniform(x0, x1), rng.uniform(y0, y1), rng.uniform(60, 140), rng.uniform(20, 40),
                  tone(col, 0.94), int(rng.integers(1000)))
        ytop = y0 + H * kw.get("top", 0.16)
        for i, xx in enumerate(np.arange(x0 + bay * 0.5, x1, bay)):
            if i % 2 == 0:  # diagonal brace
                pt.shape([(xx + t / 2, y1 - t), (xx + t / 2 + bay * 0.5, ytop + t), (xx + t / 2 + bay * 0.5 + t * 1.2, ytop + t),
                          (xx + t / 2 + t * 1.2, y1 - t)], beam, OL2, shade=False)
            box(pt, xx - t / 2, ytop, xx + t / 2, y1, beam, OL2, shade=False)
        box(pt, x0 - 10, ytop - t / 2, x1 + 10, ytop + t / 2 + 4, beam, OL2, shade=False)
        box(pt, x0 - 10, y1 - t, x1 + 10, y1 + 10, beam, OL2, shade=False)
    elif kind == "planks":
        seam = tone(col, 0.68)
        xx = x0
        while xx < x1:
            bw = rng.uniform(70, 105)
            box(pt, xx, y0, xx + bw, y1, tone(col, rng.choice([0.94, 1.0, 1.05])), 0, shade=False)
            pt.line([(xx, y0), (xx, y1)], 4, seam)
            if rng.random() < 0.35:
                ky = rng.uniform(y0 + 40, y1 - 40)
                pt.shape(T.ellipse_pts(xx + bw / 2, ky, 9, 16, 0, 20), None, 3)
                pt.line(T.ellipse_pts(xx + bw / 2, ky, 9, 16, 0, 20).tolist(), 3, seam)
            xx += bw
        for yy in (y0 + H * 0.18, y1 - H * 0.12):   # battens with nails
            for xx in np.arange(x0 + 40, x1, 90):
                pt.dot(xx, yy, 4, seam)
    elif kind == "shoji":
        wood = kw.get("wood", K["wood"])
        pw = kw.get("panel", 300)
        kick = y1 - H * kw.get("kick", 0.2)
        top = y0 + H * kw.get("transom", 0.1)
        box(pt, x0 - 10, y0 - 10, x1 + 10, top, kw.get("upper", K["plaster"]), 0, shade=False)
        for xx in np.arange(x0, x1, pw):
            box(pt, xx, kick, xx + pw, y1, tone(wood, 1.08), OL2, shade=False)
            for gx in np.linspace(xx, xx + pw, 4)[1:-1]:
                pt.line([(gx, top), (gx, kick)], 7, wood)
            for gy in np.arange(top + 85, kick - 20, 85):
                pt.line([(xx, gy), (xx + pw, gy)], 7, wood)
            box(pt, xx - 11, top, xx + 11, y1, wood, OL2, shade=False)
        box(pt, x0 - 10, top - 16, x1 + 10, top + 16, tone(wood, 0.85), OL2, shade=False)
    elif kind == "palace":
        bay, cw = kw.get("bay", 420), kw.get("col_w", 74)
        colc = kw.get("column", K["cn_red"])
        band = y0 + H * kw.get("band", 0.2)
        box(pt, x0 - 10, y1 - H * 0.16, x1 + 10, y1 + 10, tone(col, 0.82), OL2, shade=False)   # dado
        box(pt, x0 - 10, y0 - 10, x1 + 10, band, kw.get("band_color", K["teal"]), OL2, shade=False)
        for xx in np.arange(x0 + bay / 2, x1 + bay, bay):  # gold lozenges between columns
            pt.shape([(xx, band - 50), (xx + 70, band - (band - y0) / 2), (xx, y0 + 20), (xx - 70, band - (band - y0) / 2)],
                     K["gold"], OL2 * 0.7, shade=False)
        box(pt, x0 - 10, band - 14, x1 + 10, band + 12, K["gold"], OL2, shade=False)
        for xx in np.arange(x0, x1 + bay, bay):
            box(pt, xx - cw / 2, band, xx + cw / 2, y1, colc, OL2)
            box(pt, xx - cw / 2 - 8, band + 12, xx + cw / 2 + 8, band + 40, K["gold"], OL2 * 0.8, shade=False)
            box(pt, xx - cw / 2 - 14, y1 - 46, xx + cw / 2 + 14, y1 + 4, K["stone_lt"], OL2, shade=False)
    elif kind == "plaster":
        for _ in range(int(W * H / 300000) + 2):
            patch(pt, rng.uniform(x0, x1), rng.uniform(y0, y1), rng.uniform(60, 160), rng.uniform(18, 40),
                  tone(col, 0.94), int(rng.integers(1000)))
        for _ in range(2):
            sx, sy = rng.uniform(x0, x1), rng.uniform(y0, y1 - 100)
            pt.line([(sx, sy), (sx + 14, sy + 30), (sx + 4, sy + 52), (sx + 18, sy + 80)], 3, tone(col, 0.7))


def skirting(pt, x0, x1, gy, h=34, color=K["wood_dk"]):
    box(pt, x0 - 10, gy - h, x1 + 10, gy + 6, color, OL2, shade=False)


def ceiling_beams(pt, x0, x1, y, h=70, color=K["timber"], n=7):
    """dark wooden beam along the top of a back wall with beam ends sticking out (halls, barns, workshops)."""
    box(pt, x0 - 10, y - h, x1 + 10, y, color, OL2, shade=False)
    for xx in np.linspace(x0, x1, n):
        box(pt, xx - 26, y - 8, xx + 26, y + 36, tone(color, 1.15), OL2, shade=False)


FLOORS = dict(planks=K["wood_lt"], flagstone=K["stone"], tatami=K["tatami"], dirt=K["mud"], tiles=K["stone_lt"])


def floor(pt, x0, x1, gy, y1, kind="planks", color=None, seed=0, spread=1.8, **kw):
    """perspective floor from the back edge gy (the ground line where characters stand) down to y1.
    kind: planks (n=14 boards), flagstone (rows=5), tatami (rows=4), tiles (checker, rows=6, cols=10), dirt."""
    rng = np.random.default_rng(seed)
    col = color or FLOORS[kind]
    P = Persp(x0, x1, gy, y1, spread)
    base = tone(col, 0.74) if kind in ("flagstone", "tatami") else col
    pt.shape(dense([(x0 - 30, gy), (x1 + 30, gy), (x1 + 400, y1 + 40), (x0 - 400, y1 + 40)], 60), base, OL)
    if kind == "planks":
        n = kw.get("n", 14)
        seam = tone(col, 0.72)
        us = np.linspace(-0.2, 1.2, int(n * 1.4) + 1)
        for u in us:
            pt.line([P(u, 0), P(u, 1.02)], 3.5, seam)
        for a, b in zip(us[:-1], us[1:]):
            for v in rng.uniform(0.05, 0.95, 2):
                pt.line([P(a, v), P(b, v)], 3, seam)
    elif kind in ("flagstone", "tiles"):
        rows = kw.get("rows", 5 if kind == "flagstone" else 6)
        vs = np.linspace(0, 1.05, rows + 1)
        for r, (va, vb) in enumerate(zip(vs[:-1], vs[1:])):
            if kind == "tiles":
                cols = kw.get("cols", 10)
                us = np.linspace(-0.3, 1.3, int(cols * 1.6) + 1)
            else:
                us = [-0.3]
                while us[-1] < 1.3:
                    us.append(us[-1] + rng.uniform(0.11, 0.2))
            for c, (ua, ub) in enumerate(zip(us[:-1], us[1:])):
                g, gv = 0.006, 0.025 * (vb - va)
                if kind == "tiles":
                    f = col if (r + c) % 2 else tone(col, 0.82)
                else:
                    f = tone(col, rng.choice([0.94, 1.0, 1.05]))
                pt.shape(P.quad(ua + g, va + gv, ub - g, vb - gv), f, 0, shade=False)
    elif kind == "tatami":
        rows = kw.get("rows", 4)
        vs = np.linspace(0, 1.05, rows + 1)
        edge = kw.get("edge", K["tatami_edge"])
        for r, (va, vb) in enumerate(zip(vs[:-1], vs[1:])):
            L = 1 / 3
            u = -0.4 - (r % 2) * L / 2
            while u < 1.4:
                q = P.quad(u + 0.004, va + 0.01, u + L - 0.004, vb - 0.01)
                pt.shape(q, tone(col, rng.choice([0.97, 1.0, 1.03])), 0, shade=False)
                for k in (0.33, 0.66):
                    pt.line([P(u + 0.01, va + (vb - va) * k), P(u + L - 0.01, va + (vb - va) * k)], 2.5, tone(col, 0.9))
                pt.line([P(u + 0.004, va + 0.01), P(u + L - 0.004, va + 0.01)], 7, edge)
                pt.line([P(u + 0.004, vb - 0.01), P(u + L - 0.004, vb - 0.01)], 7, edge)
                u += L
    elif kind == "dirt":
        for _ in range(6):
            patch(pt, rng.uniform(x0, x1), rng.uniform(gy + 60, y1), rng.uniform(140, 320), rng.uniform(16, 30),
                  tone(col, 0.88), int(rng.integers(1000)))
        texture(pt, x0, x1, gy + 30, y1, tone(col, 0.85), 50, seed)
    pt.line([(x0 - 30, gy), (x1 + 30, gy)], OL, BG_INK)


def carpet(pt, cx, gy, y1, w_back, color=K["red"], border=K["gold"], spread=1.8):
    """runner carpet on the floor from the back wall to the viewer (throne halls, churches)."""
    P = Persp(cx - w_back / 2, cx + w_back / 2, gy, y1, spread)
    pt.shape(dense(P.quad(0, 0.0, 1, 1.05), 60), color, OL2, shade=False)
    for u in (0.1, 0.9):
        pt.line([P(u, 0.0), P(u, 1.05)], 7, border)


def window_gothic(pt, cx, y_top, w, h, frame=K["stone_lt"], glass=None, seed=0, sill=True, r=0.75):
    """pointed-arch window with stained-glass blocks; (cx, y_top) = apex of the stone surround."""
    rng = np.random.default_rng(seed)
    glass = glass or GLASS
    t = w * 0.14
    base = y_top + h
    outer = arch_poly(cx, base, w + 2 * t, h, r)
    pt.shape(outer, frame, OL2)
    inner = arch_poly(cx, base - t * 0.6, w, h - t * 1.6, r)
    top = inner[:, 1].min()

    def cells():
        box(pt, cx - w / 2 - 5, top - 5, cx + w / 2 + 5, base, K["lead"], 0, shade=False)
        cols = 3 if w < 260 else 4
        cw = w / cols
        ch = cw * 1.25
        for yy in np.arange(base - t * 0.6, top, -ch):
            for i in range(cols):
                f = glass[int(rng.integers(len(glass)))]
                pt.shape(rect(cx - w / 2 + i * cw + 4, yy - ch + 4, cx - w / 2 + (i + 1) * cw - 4, yy - 4), f, 0,
                         shade=False)
        rr = w * 0.22
        pt.shape(T.ellipse_pts(cx, top + w * 0.42, rr, rr), K["lead"], 0, shade=False)
        pt.shape(star_pts(cx, top + w * 0.42, rr * 0.85, 4, 0.45, 45), glass[2], 0, shade=False)

    clipped(pt, inner, cells, pad=int(w / (3 if w < 260 else 4) * 1.25 * SS) + 40)
    pt.shape(inner, None, OL2)
    if sill:
        box(pt, cx - w / 2 - t * 1.6, base - 6, cx + w / 2 + t * 1.6, base + t * 0.6, tone(frame, 0.92), OL2, shade=False)


def window_lattice(pt, x0, y0, w, h, frame=K["wood"], view=K["sky_lt"], cols=2, rows=3, diamond=False,
                   shutters=False, sill=True, arch=False):
    """rectangular (or round-topped, arch=True) window with a wooden frame and lattice bars over a view colour
    (sky, night, warm interior light). diamond=True: leaded diamond panes (medieval). shutters: open side shutters."""
    t = 16
    if shutters:
        for sx in (x0 - t - w / 2 - 6, x0 + w + t + 6):
            box(pt, sx, y0 - t, sx + w / 2, y0 + h + t, tone(frame, 1.05), OL2)
            for k in (1, 2):
                pt.line([(sx + w / 2 * k / 3, y0 - t + 6), (sx + w / 2 * k / 3, y0 + h + t - 6)], 3, tone(frame, 0.7))
    if arch:
        outer = arch_poly(x0 + w / 2, y0 + h + t, w + 2 * t, h + 2 * t)
        inner = arch_poly(x0 + w / 2, y0 + h, w, h)
    else:
        outer = rect(x0 - t, y0 - t, x0 + w + t, y0 + h + t)
        inner = rect(x0, y0, x0 + w, y0 + h)
    pt.shape(outer, frame, OL2)
    pt.shape(inner, view, OL2 * 0.6, shade=False)

    def bars():
        if diamond:
            s = w / 3.2
            for k in np.arange(-h, w + h, s):
                pt.line([(x0 + k, y0), (x0 + k + h, y0 + h)], 3.5, K["lead"])
                pt.line([(x0 + k, y0 + h), (x0 + k + h, y0)], 3.5, K["lead"])
        for i in range(1, cols):
            xx = x0 + w * i / cols
            pt.line([(xx, y0 - 5), (xx, y0 + h + 5)], 9, frame)
        for j in range(1, rows):
            yy = y0 + h * j / rows
            pt.line([(x0 - 5, yy), (x0 + w + 5, yy)], 9, frame)

    clipped(pt, inner, bars)
    pt.shape(inner, None, OL2 * 0.6)
    if sill:
        box(pt, x0 - t - 12, y0 + h + t - 4, x0 + w + t + 12, y0 + h + t + 16, tone(frame, 0.9), OL2, shade=False)


def window_round(pt, cx, cy, r, frame=K["wood_dk"], view=K["sky_lt"], ring=None, pattern="grid"):
    """round (moon) window: thick ring + lattice. pattern: grid | plain."""
    ring = ring or K["stone_lt"]
    pt.shape(T.ellipse_pts(cx, cy, r * 1.16, r * 1.16, 0, 96), ring, OL2)
    inner = T.ellipse_pts(cx, cy, r, r, 0, 96)
    pt.shape(inner, view, OL2 * 0.7, shade=False)
    if pattern == "grid":
        def bars():
            s = r / 2.2
            for k in np.arange(-3, 4) * s:
                pt.line([(cx + k, cy - r), (cx + k, cy + r)], 8, frame)
                pt.line([(cx - r, cy + k), (cx + r, cy + k)], 8, frame)
            ring_line(pt, rect(cx - s * 1.5, cy - s * 1.5, cx + s * 1.5, cy + s * 1.5), 10, frame)
        clipped(pt, inner, bars)
    pt.shape(inner, None, OL2 * 0.7)


def door(pt, cx, base, w, h, kind="arch", color=K["wood"], frame=None, open=False, inside=K["dark"], bands=True):
    """wooden door: kind arch (round top) | pointed | square. frame: stone surround colour or None. open=True draws
    the dark opening instead of the leaf (inside colour)."""
    r = {"arch": 0.5, "pointed": 0.7}.get(kind)
    poly = arch_poly(cx, base, w, h, r) if r else np.array(rect(cx - w / 2, base - h, cx + w / 2, base), float)
    if frame:
        t = w * 0.12
        outer = arch_poly(cx, base, w + 2 * t, h + t, r) if r else np.array(rect(cx - w / 2 - t, base - h - t,
                                                                                    cx + w / 2 + t, base), float)
        pt.shape(outer, frame, OL2)
    if open:
        pt.shape(poly, inside, OL2, shade=False)
        return
    pt.shape(poly, color, OL2)
    top = poly[:, 1].min()

    def planks():
        for xx in np.linspace(cx - w / 2, cx + w / 2, 5)[1:-1]:
            pt.line([(xx, top), (xx, base)], 4, tone(color, 0.7))
        if bands:
            for yy in (base - h * 0.25, base - h * 0.62):
                box(pt, cx - w / 2, yy - 9, cx + w / 2, yy + 9, K["iron"], 2.5, shade=False)
                for xx in np.linspace(cx - w / 2 + 14, cx + w / 2 - 14, 4):
                    pt.dot(xx, yy, 4, tone(K["iron"], 1.6))

    clipped(pt, poly, planks)
    pt.shape(poly, None, OL2)
    pt.line(T.ellipse_pts(cx + w * 0.28, base - h * 0.42, 12, 14, 0, 24).tolist(), 4.5, K["iron"])


def archway(pt, cx, base, w, h, color=K["castle"], inside=K["dark"], r=0.5, t=None, view=None):
    """arched opening with voussoir stones (castle gates, cloisters). view: colour seen through it (else inside)."""
    t = t or w * 0.18
    outer = arch_poly(cx, base, w + 2 * t, h + t, r)
    inner = arch_poly(cx, base, w, h, r)
    pt.shape(outer, color, OL2)
    pt.shape(inner, view or inside, OL2, shade=False)
    io = arch_pts(cx, base - h + arch_height(w, r), w, r, 9)
    oo = arch_pts(cx, base - h - t + arch_height(w + 2 * t, r), w + 2 * t, r, 9)
    for k in range(1, min(len(io), len(oo)) - 1, 2):   # joints between the voussoir stones
        pt.line([tuple(io[k]), tuple(oo[k])], 3.5, tone(color, 0.7))


# ------------------------------------------------------------------------------------------------ heraldry, hangings
def device(pt, kind, cx, cy, s, color=K["gold"], field=K["red"]):
    """simple heraldic device centred at (cx, cy), half-size s: cross, saltire, chevron, bend, sun, star, tower,
    crescent, circle, lion (stylised rampant shape), fleur."""
    lw = OL2 * 0.7
    if kind in ("cross", "saltire"):
        a, b = s * 0.2, s
        q = np.array([(-a, -b), (a, -b), (a, -a), (b, -a), (b, a), (a, a), (a, b), (-a, b), (-a, a), (-b, a), (-b, -a),
                      (-a, -a)], float)
        if kind == "saltire":
            q = T.rot(q, math.pi / 4)
        pt.shape(q + (cx, cy), color, lw, shade=False)
    elif kind == "chevron":
        pt.shape([(cx - s * 1.3, cy + s * 0.7), (cx, cy - s * 0.6), (cx + s * 1.3, cy + s * 0.7), (cx + s * 1.3, cy + s * 1.15),
                  (cx, cy - s * 0.12), (cx - s * 1.3, cy + s * 1.15)], color, lw, shade=False)
    elif kind == "bend":
        pt.shape([(cx - s * 2, cy - s * 2.4), (cx - s * 1.4, cy - s * 2.4), (cx + s * 2, cy + s * 2.4),
                  (cx + s * 1.4, cy + s * 2.4)], color, lw, shade=False)
    elif kind == "sun":
        pt.shape(star_pts(cx, cy, s, 12, 0.62), color, lw, shade=False)
        pt.shape(T.ellipse_pts(cx, cy, s * 0.5, s * 0.5), tone(color, 1.08), lw, shade=False)
    elif kind == "star":
        pt.shape(star_pts(cx, cy, s, 5, 0.45), color, lw, shade=False)
    elif kind == "tower":
        m = s * 0.22
        q = [(cx - s * 0.6, cy + s), (cx - s * 0.6, cy - s * 0.5), (cx - s * 0.75, cy - s * 0.5), (cx - s * 0.75, cy - s),
             (cx - s * 0.75 + m, cy - s), (cx - s * 0.75 + m, cy - s * 0.78), (cx - m / 2, cy - s * 0.78), (cx - m / 2, cy - s),
             (cx + m / 2, cy - s), (cx + m / 2, cy - s * 0.78), (cx + s * 0.75 - m, cy - s * 0.78), (cx + s * 0.75 - m, cy - s),
             (cx + s * 0.75, cy - s), (cx + s * 0.75, cy - s * 0.5), (cx + s * 0.6, cy - s * 0.5), (cx + s * 0.6, cy + s)]
        pt.shape(q, color, lw, shade=False)
        pt.shape(arch_poly(cx, cy + s, s * 0.45, s * 0.6), field, lw * 0.8, shade=False)
    elif kind == "crescent":
        pt.shape(T.ellipse_pts(cx, cy, s * 0.8, s * 0.8), color, lw, shade=False)
        pt.shape(T.ellipse_pts(cx + s * 0.32, cy - s * 0.12, s * 0.66, s * 0.66), field, 0, shade=False)
    elif kind == "circle":
        pt.shape(T.ellipse_pts(cx, cy, s * 0.7, s * 0.7), color, lw, shade=False)
    elif kind == "fleur":
        q = T.crom([(cx, cy - s), (cx + s * 0.22, cy - s * 0.5), (cx + s * 0.12, cy), (cx, cy + s * 0.1),
                    (cx - s * 0.12, cy), (cx - s * 0.22, cy - s * 0.5)], True, 6)
        pt.shape(q, color, lw, shade=False)
        for sg in (-1, 1):
            q = T.crom([(cx + sg * s * 0.1, cy - s * 0.05), (cx + sg * s * 0.55, cy - s * 0.55), (cx + sg * s * 0.85, cy - s * 0.2),
                        (cx + sg * s * 0.6, cy + s * 0.15), (cx + sg * s * 0.4, cy - s * 0.1), (cx + sg * s * 0.15, cy + s * 0.2)],
                       True, 6)
            pt.shape(q, color, lw, shade=False)
        box(pt, cx - s * 0.55, cy + s * 0.15, cx + s * 0.55, cy + s * 0.35, color, lw, shade=False)
        pt.shape([(cx - s * 0.1, cy + s * 0.35), (cx + s * 0.1, cy + s * 0.35), (cx, cy + s)], color, lw, shade=False)
    elif kind == "lion":  # very simplified rampant beast silhouette
        q = [(-0.35, 1), (-0.2, 0.3), (-0.45, -0.1), (-0.3, -0.55), (-0.05, -0.95), (0.25, -0.9), (0.2, -0.65),
             (0.45, -0.6), (0.3, -0.35), (0.05, -0.3), (0.25, 0.05), (0.55, 0.0), (0.45, 0.25), (0.2, 0.35), (0.3, 1),
             (0.1, 1), (0.0, 0.55), (-0.1, 1)]
        pt.shape(T.crom([(cx + x * s, cy + y * s) for x, y in q], True, 4), color, lw, shade=False)
        pt.line(T.crom([(cx - s * 0.3, cy + s * 0.2), (cx - s * 0.75, cy - s * 0.1), (cx - s * 0.7, cy - s * 0.55)],
                       False, 6).tolist(), s * 0.1, color)


def banner(pt, cx, y_top, w, h, color=K["red"], device_kind="cross", device_color=K["gold"], trim=K["gold"],
           tail="point", rod=K["wood_dk"]):
    """hanging banner on a rod (castle halls). tail: point | swallow | flat."""
    pt.stroke([(cx - w / 2 - 26, y_top), (cx + w / 2 + 26, y_top)], rod, 10, OL2 * 0.6)
    for sx in (cx - w / 2 - 30, cx + w / 2 + 30):
        pt.shape(T.ellipse_pts(sx, y_top, 12, 12, 0, 20), K["gold"], OL2 * 0.6, shade=False)
    yb = y_top + h
    if tail == "point":
        bot = [(cx + w / 2, yb - w * 0.4), (cx, yb), (cx - w / 2, yb - w * 0.4)]
    elif tail == "swallow":
        bot = [(cx + w / 2, yb), (cx, yb - w * 0.4), (cx - w / 2, yb)]
    else:
        bot = [(cx + w / 2, yb), (cx - w / 2, yb)]
    cloth = np.vstack([dense([(cx - w / 2, y_top + 6), (cx + w / 2, y_top + 6)], 30, False),
                       dense([(cx + w / 2, y_top + 6), bot[0]], 30, False)[1:], np.array(bot[1:], float)])
    pt.shape(cloth, color, OL2)
    c = cloth.mean(0)
    pt.line([tuple(p) for p in (cloth - c) * 0.86 + c] + [tuple((cloth[0] - c) * 0.86 + c)], 5, trim)
    clipped(pt, cloth, lambda: device(pt, device_kind, cx, y_top + h * 0.38, w * 0.28, device_color, color))


def flag(pt, x, base, h, color=K["red"], device_kind=None, device_color=K["gold"], w=None, pole=K["wood_dk"], seed=0):
    """flag on a pole standing at (x, base); the cloth waves to the right."""
    w = w or h * 0.42
    fh = w * 0.66
    top = base - h
    pt.stroke([(x, base), (x, top)], pole, 9, OL2 * 0.6, shade=False)
    pt.shape(T.ellipse_pts(x, top - 6, 9, 9, 0, 16), K["gold"], OL2 * 0.6, shade=False)
    xs = np.linspace(0, 1, 14)
    upper = np.stack([x + xs * w, top + 8 + np.sin(xs * 5 + seed) * fh * 0.08], 1)
    lower = np.stack([x + xs * w, top + 8 + fh + np.sin(xs * 5 + seed + 0.6) * fh * 0.08], 1)[::-1]
    cloth = np.vstack([upper, lower])
    pt.shape(cloth, color, OL2)
    if device_kind:
        clipped(pt, cloth, lambda: device(pt, device_kind, x + w * 0.5, top + 8 + fh / 2, fh * 0.32, device_color, color))


def tapestry(pt, x0, y0, w, h, color=K["blue"], border=K["gold"], motif="tree", seed=0, rod=K["wood_dk"]):
    """wall tapestry: rod, border band, simple motif (tree | diamonds), fringe."""
    rng = np.random.default_rng(seed)
    pt.stroke([(x0 - 22, y0), (x0 + w + 22, y0)], rod, 10, OL2 * 0.6)
    q = dense(rect(x0, y0 + 6, x0 + w, y0 + h), 40)
    pt.shape(q, border, OL2)
    b = w * 0.08
    inner = rect(x0 + b, y0 + 6 + b, x0 + w - b, y0 + h - b)
    pt.shape(inner, color, OL2 * 0.6)
    cx, cy = x0 + w / 2, y0 + h / 2
    if motif == "tree":
        tw = w - 2 * b
        pt.shape(T.ellipse_pts(cx, y0 + h - b - tw * 0.05, tw * 0.42, tw * 0.07), tone(K["jade"], 0.9), 0, shade=False)
        box(pt, cx - tw * 0.05, cy, cx + tw * 0.05, y0 + h - b - tw * 0.06, K["trunk"], OL2 * 0.6, shade=False)
        pt.shape(scallop(cx, cy - tw * 0.12, tw * 0.33, tw * 0.3, 8, 0.1, seed=seed), K["jade"], OL2 * 0.6, shade=False)
        for _ in range(5):
            pt.dot(cx + rng.uniform(-0.22, 0.22) * tw, cy - tw * 0.12 + rng.uniform(-0.2, 0.2) * tw, tw * 0.03, K["red"])
        for sx in (x0 + b + tw * 0.12, x0 + w - b - tw * 0.12):
            pt.shape(star_pts(sx, y0 + 6 + b + tw * 0.14, tw * 0.07, 6, 0.5), border, 0, shade=False)
    else:
        s = (w - 2 * b) / 4
        for i in range(4):
            for j in range(int((h - 2 * b) / s)):
                xx, yy = x0 + b + (i + 0.5) * s, y0 + 6 + b + (j + 0.5) * s
                pt.shape([(xx, yy - s * 0.4), (xx + s * 0.4, yy), (xx, yy + s * 0.4), (xx - s * 0.4, yy)],
                         border if (i + j) % 2 else tone(color, 1.3), 0, shade=False)
    for xx in np.arange(x0 + 8, x0 + w - 4, 16):
        pt.line([(xx, y0 + h), (xx, y0 + h + 22)], 4, border)


def scroll(pt, cx, y_top, w, h, kind="mountains", paper=K["parchment"], mount=(96, 120, 150), seed=0):
    """hanging scroll painting (East Asian interiors): kind mountains | bamboo | calligraphy | blank."""
    rng = np.random.default_rng(seed)
    pt.line([(cx - w * 0.3, y_top), (cx, y_top - w * 0.3), (cx + w * 0.3, y_top)], 3, K["dark"])
    pt.shape(rect(cx - w / 2, y_top, cx + w / 2, y_top + h), mount, OL2)
    m = w * 0.1
    px0, py0, px1, py1 = cx - w / 2 + m, y_top + h * 0.12, cx + w / 2 - m, y_top + h * 0.86
    pt.shape(rect(px0, py0, px1, py1), paper, OL2 * 0.6, shade=False)
    ink, wash = (62, 60, 64), tone(paper, 0.86)
    pw, ph = px1 - px0, py1 - py0
    if kind == "mountains":
        for k, (mx, mh, f) in enumerate(((0.35, 0.55, wash), (0.68, 0.42, tone(paper, 0.78)))):
            q = T.crom([(px0, py1 - ph * 0.12), (px0 + pw * (mx - 0.25), py1 - ph * (mh * 0.5)),
                        (px0 + pw * mx, py1 - ph * mh), (px0 + pw * (mx + 0.25), py1 - ph * (mh * 0.45)),
                        (px1, py1 - ph * 0.1)], False, 6)
            pt.shape(np.vstack([q, [[px1, py1 - 3], [px0, py1 - 3]]]), f, 0, shade=False)
            pt.line(q.tolist(), 3.5, ink)
        pt.shape(T.ellipse_pts(px0 + pw * 0.75, py0 + ph * 0.2, pw * 0.08, pw * 0.08), (60, 60, 200), 0, shade=False)
    elif kind == "bamboo":
        for sx in (0.4, 0.62):
            xx = px0 + pw * sx
            pt.line([(xx, py1 - 6), (xx + 4, py0 + ph * 0.1)], 6, ink)
            for yy in np.linspace(py0 + ph * 0.2, py1 - ph * 0.15, 4):
                pt.line([(xx - 5, yy), (xx + 7, yy)], 3, paper)
                for sg in (-1, 1):
                    pt.shape(T.ellipse_pts(xx + sg * pw * 0.12, yy - 6, pw * 0.11, pw * 0.025, sg * 0.4, 20), ink, 0,
                             shade=False)
    elif kind == "calligraphy":
        for col in (0.36, 0.64):
            for yy in np.linspace(py0 + ph * 0.1, py1 - ph * 0.15, 4):
                xx = px0 + pw * col
                s = pw * 0.12
                for _ in range(3):
                    a = rng.uniform(-0.6, 0.6)
                    pt.line([(xx - s * math.cos(a), yy - s * math.sin(a)), (xx + s * math.cos(a), yy + s * math.sin(a))],
                            rng.uniform(4, 7), ink)
                    yy += s * 0.35
    pt.stroke([(cx - w / 2 - 14, y_top + h), (cx + w / 2 + 14, y_top + h)], K["wood_dk"], 14, OL2 * 0.5, shade=False)
    pt.stroke([(cx - w / 2 - 4, y_top), (cx + w / 2 + 4, y_top)], K["wood_dk"], 8, OL2 * 0.5, shade=False)


def torch(pt, x, y, size=1.0, light=True, bracket=True):
    """wall torch: iron bracket, wooden handle, flame at (x, y - 60*size), warm glow on the wall."""
    s = size
    fy = y - 62 * s
    if light:
        glow(pt, x, fy, 230 * s, K["glow"], 0.5)
    if bracket:
        box(pt, x - 14 * s, y + 4 * s, x + 14 * s, y + 46 * s, K["iron"], OL2 * 0.7, shade=False)
    pt.shape([(x - 12 * s, y - 34 * s), (x + 12 * s, y - 34 * s), (x + 6 * s, y + 36 * s), (x - 6 * s, y + 36 * s)],
             K["wood_dk"], OL2 * 0.7, shade=False)
    pt.shape(T.ellipse_pts(x, y - 34 * s, 20 * s, 9 * s, 0, 24), K["iron"], OL2 * 0.7, shade=False)
    flame(pt, x, y - 38 * s, 34 * s)


def flame(pt, x, base, h):
    f = T.crom([(x - h * 0.42, base), (x - h * 0.3, base - h * 0.55), (x - h * 0.05, base - h), (x + h * 0.2, base - h * 0.7),
                (x + h * 0.4, base - h * 0.35), (x + h * 0.36, base)], True, 6)
    pt.shape(f, K["flame"], OL2 * 0.6, shade=False)
    pt.shape((f - (x, base)) * 0.55 + (x, base), K["flame_in"], 0, shade=False)


def candle(pt, x, base, h=46, light=True, color=(214, 236, 246)):
    if light:
        glow(pt, x, base - h - 14, 120, K["glow"], 0.35)
    box(pt, x - 9, base - h, x + 9, base, color, OL2 * 0.6, shade=False)
    pt.shape(T.ellipse_pts(x, base, 20, 6, 0, 20), K["gold_dk"], OL2 * 0.6, shade=False)
    flame(pt, x, base - h - 2, 26)


# ------------------------------------------------------------------------------------------------ furniture
def table(pt, cx, base, w, h, color=K["wood"], cloth=None, depth=None):
    """table seen from the front with a thin top surface. cloth: colour of a draped tablecloth or None."""
    d = depth or h * 0.2
    th = h * 0.12
    y = base - h
    for sx in (cx - w / 2 + w * 0.12, cx + w / 2 - w * 0.12 - 18):   # back legs
        box(pt, sx, y, sx + 18, base - d * 0.7, tone(color, 0.7), OL2 * 0.8, shade=False)
    pt.shape([(cx - w / 2 + d * 0.5, y - d), (cx + w / 2 - d * 0.5, y - d), (cx + w / 2, y), (cx - w / 2, y)],
             tone(color, 1.15), OL2, shade=False)
    box(pt, cx - w / 2, y, cx + w / 2, y + th, color, OL2, shade=False)
    for sx in (cx - w / 2 + 12, cx + w / 2 - 38):
        box(pt, sx, y + th, sx + 26, base, color, OL2)
    if cloth:
        q = [(cx - w / 2 - 6, y - 2)] + [(cx - w / 2 + w * k / 8, y + th + h * 0.22 + (14 if k % 2 else 0)) for k in range(9)] \
            + [(cx + w / 2 + 6, y - 2)]
        pt.shape(T.crom(q, False, 6).tolist(), cloth, OL2, shade=False)
        pt.shape([(cx - w / 2 + d * 0.5, y - d), (cx + w / 2 - d * 0.5, y - d), (cx + w / 2 + 6, y), (cx - w / 2 - 6, y)],
                 tone(cloth, 1.08), OL2, shade=False)
    return y - d * 0.5   # y of the table top (to put things on)


def bench(pt, cx, base, w, h=None, color=K["wood"]):
    h = h or w * 0.22
    for sx in (cx - w * 0.36, cx + w * 0.36):
        pt.shape([(sx - 22, base - h + 10), (sx + 22, base - h + 10), (sx + 34, base), (sx - 34, base)], tone(color, 0.85),
                 OL2, shade=False)
    pt.shape([(cx - w / 2 + 10, base - h - 14), (cx + w / 2 - 10, base - h - 14), (cx + w / 2, base - h), (cx - w / 2, base - h)],
             tone(color, 1.15), OL2, shade=False)
    box(pt, cx - w / 2, base - h, cx + w / 2, base - h + 22, color, OL2, shade=False)


def shelf(pt, x0, base, w, h, color=K["wood"], items="mixed", shelves=3, seed=0):
    """bookcase / shelf unit standing at base; items: mixed | books | jars | scrolls | none."""
    rng = np.random.default_rng(seed)
    t = 22
    box(pt, x0, base - h, x0 + w, base, tone(color, 0.62), OL2, shade=False)
    levels = np.linspace(base - t, base - h + t + 10, shelves + 1)
    for a, b in zip(levels[:-1], levels[1:]):   # a = shelf board y (bottom), b = next board up
        gap = a - b - t
        xx = x0 + t + 6
        while xx < x0 + w - t - 30:
            kind = items if items in ("books", "jars", "scrolls") else rng.choice(["books", "books", "jars", "scrolls"])
            if items == "none":
                break
            if kind == "books":
                for _ in range(int(rng.integers(3, 7))):
                    bw = rng.uniform(14, 26)
                    bh = gap * rng.uniform(0.55, 0.85)
                    if xx + bw > x0 + w - t - 4:
                        break
                    c = BOOKS[int(rng.integers(len(BOOKS)))]
                    box(pt, xx, a - bh, xx + bw, a, c, OL2 * 0.55, shade=False)
                    pt.line([(xx + 3, a - bh * 0.8), (xx + bw - 3, a - bh * 0.8)], 3, K["gold"])
                    xx += bw + 1
                if rng.random() < 0.4 and xx + gap * 0.6 < x0 + w - t:
                    bh = gap * 0.7
                    pt.shape(T.rot(np.array(rect(0, -bh, 20, 0), float), 0.35) + (xx + 2, a), BOOKS[int(rng.integers(7))],
                             OL2 * 0.55, shade=False)
                    xx += bh * 0.4 + 24
            elif kind == "jars":
                for _ in range(int(rng.integers(1, 3))):
                    jw = rng.uniform(34, 52)
                    jh = min(gap * 0.75, jw * 1.2)
                    if xx + jw > x0 + w - t - 4:
                        break
                    c = [(70, 110, 170), (196, 176, 150), (110, 150, 110), (60, 90, 140)][int(rng.integers(4))]
                    q = T.crom([(xx + jw * 0.25, a), (xx, a - jh * 0.5), (xx + jw * 0.2, a - jh * 0.92),
                                (xx + jw * 0.8, a - jh * 0.92), (xx + jw, a - jh * 0.5), (xx + jw * 0.75, a)], True, 6)
                    pt.shape(q, c, OL2 * 0.6, shade=False)
                    box(pt, xx + jw * 0.25, a - jh - 6, xx + jw * 0.75, a - jh * 0.88, tone(c, 0.75), OL2 * 0.5, shade=False)
                    xx += jw + 10
            else:
                r = min(gap * 0.16, 15)
                n = int(rng.integers(2, 4))
                for i in range(n):
                    for j in range(n - i):
                        ex, ey = xx + r + j * 2 * r + i * r, a - r - i * 1.7 * r
                        pt.shape(T.ellipse_pts(ex, ey, r, r, 0, 18), K["parchment"], OL2 * 0.5, shade=False)
                        pt.dot(ex, ey, r * 0.35, tone(K["parchment"], 0.7))
                xx += n * 2 * r + 14
            xx += rng.uniform(6, 26)
        box(pt, x0 + 4, a, x0 + w - 4, a + t * 0.7, color, OL2 * 0.8, shade=False)
    box(pt, x0, base - h, x0 + t, base, color, OL2, shade=False)
    box(pt, x0 + w - t, base - h, x0 + w, base, color, OL2, shade=False)
    box(pt, x0 - 12, base - h - 26, x0 + w + 12, base - h + 4, tone(color, 1.1), OL2, shade=False)


def dais(pt, cx, base, w, h, steps=3, color=K["stone_lt"], carpet_color=None):
    """stepped platform (throne dais, altar); returns the y of its top (stand things there)."""
    sh = h / steps
    for k in range(steps):
        ww = w - k * w * 0.12
        y1 = base - k * sh
        pt.shape([(cx - ww / 2 + 8, y1 - sh - 10), (cx + ww / 2 - 8, y1 - sh - 10), (cx + ww / 2, y1 - sh), (cx - ww / 2, y1 - sh)],
                 tone(color, 1.08), OL2 * 0.8, shade=False)
        box(pt, cx - ww / 2, y1 - sh, cx + ww / 2, y1, color, OL2, shade=False)
        if carpet_color:
            cw = w * 0.22
            box(pt, cx - cw / 2, y1 - sh - 6, cx + cw / 2, y1, carpet_color, OL2 * 0.6, shade=False)
    return base - h


def throne(pt, cx, base, h, color=K["gold"], cushion=K["red"], style="euro"):
    """throne seen from the front standing at base, total height h. style: euro | china."""
    if style == "china":
        w = h * 1.05
        seat = base - h * 0.42
        back = T.crom([(cx - w * 0.42, seat), (cx - w * 0.44, base - h * 0.78), (cx - w * 0.5, base - h * 0.92),
                       (cx - w * 0.38, base - h * 0.98), (cx, base - h), (cx + w * 0.38, base - h * 0.98),
                       (cx + w * 0.5, base - h * 0.92), (cx + w * 0.44, base - h * 0.78), (cx + w * 0.42, seat)], False, 6)
        pt.shape(back, color, OL2)
        inner = (back - (cx, seat)) * 0.76 + (cx, seat)
        pt.shape(inner, cushion, OL2 * 0.7, shade=False)
        pt.shape(T.ellipse_pts(cx, base - h * 0.74, w * 0.08, w * 0.08), color, OL2 * 0.6, shade=False)
        for sg in (-1, 1):   # armrests with scroll ends
            pt.shape([(cx + sg * w * 0.5, seat + 6), (cx + sg * w * 0.5, seat - h * 0.18), (cx + sg * w * 0.36, seat - h * 0.2),
                      (cx + sg * w * 0.36, seat + 6)], color, OL2, shade=False)
            pt.shape(T.ellipse_pts(cx + sg * w * 0.52, seat - h * 0.2, h * 0.05, h * 0.05), tone(color, 0.85), OL2 * 0.7,
                     shade=False)
        box(pt, cx - w * 0.36, seat - h * 0.06, cx + w * 0.36, seat + h * 0.04, cushion, OL2, shade=False)
        box(pt, cx - w * 0.5, seat + h * 0.04, cx + w * 0.5, base, tone(cushion, 0.85), OL2)
        box(pt, cx - w * 0.5, seat + h * 0.04, cx + w * 0.5, seat + h * 0.1, color, OL2, shade=False)
        box(pt, cx - w * 0.5, base - h * 0.06, cx + w * 0.5, base, color, OL2, shade=False)
        return seat
    w = h * 0.58
    seat = base - h * 0.4
    back = np.vstack([[[cx - w * 0.36, seat]], arch_pts(cx, base - h + w * 0.36, w * 0.72, 0.62), [[cx + w * 0.36, seat]]])
    pt.shape(back, color, OL2)
    pt.shape((back - (cx, seat)) * [0.72, 0.84] + (cx, seat), cushion, OL2 * 0.7, shade=False)
    for sg in (-1, 1):
        box(pt, cx + sg * w * 0.36 - 14, base - h * 0.8, cx + sg * w * 0.36 + 14, seat, color, OL2, shade=False)
        pt.shape(T.ellipse_pts(cx + sg * w * 0.36, base - h * 0.8 - 12, 17, 17), tone(color, 1.05), OL2 * 0.7, shade=False)
    box(pt, cx - w * 0.42, seat - 16, cx + w * 0.42, seat + 18, cushion, OL2, shade=False)
    for sg in (-1, 1):
        box(pt, cx + sg * w * 0.5 - (30 if sg > 0 else 0), seat - h * 0.16, cx + sg * w * 0.5 + (0 if sg > 0 else 30),
            base, color, OL2, shade=False)
        pt.shape(T.ellipse_pts(cx + sg * w * 0.5 + (-15 if sg > 0 else 15), seat - h * 0.16, 20, 13), tone(color, 1.05),
                 OL2 * 0.7, shade=False)
    box(pt, cx - w * 0.38, seat + 18, cx + w * 0.38, base, tone(color, 0.85), OL2, shade=False)
    return seat


def folding_screen(pt, cx, base, w, h, panels=5, frame=K["red_dk"], panel=K["gold"], motif="mountains"):
    """folding screen behind a throne (East Asian halls): framed panels, centre one taller, simple motif."""
    pw = w / panels
    for i in range(panels):
        x0 = cx - w / 2 + i * pw
        hh = h * (1.0 if i == panels // 2 else 0.86 if abs(i - panels // 2) == 1 else 0.74)
        box(pt, x0, base - hh, x0 + pw, base, frame, OL2)
        box(pt, x0 + 12, base - hh + 12, x0 + pw - 12, base - 30, panel, OL2 * 0.6, shade=False)
        if motif == "mountains":
            mx, my = x0 + pw / 2, base - 30
            pt.shape([(x0 + 12, my), (mx - pw * 0.1, my - hh * 0.35 * (0.7 + 0.3 * (i % 2))), (x0 + pw - 12, my)],
                     tone(panel, 0.86), 0, shade=False)
        pt.shape(scallop(x0 + pw / 2, base - hh * 0.7, pw * 0.22, pw * 0.1, 5, 0.25, 60, i), tone(panel, 1.08), 3,
                 shade=False)


def chalkboard(pt, x0, y0, w, h, color=K["board"], frame=K["wood"], tray=True, smudges=True, seed=0):
    """classroom chalkboard on a wall: wooden frame, dark green board, chalk tray with two sticks and a duster,
    faint wiped-chalk smudges. Write on it with overlays (title / label / caption_pop, world=True) or a project
    helper, so the text can change per shot. Returns the board's inner rect (x0, y0, x1, y1)."""
    fw = max(14, w * 0.022)
    box(pt, x0 - fw, y0 - fw, x0 + w + fw, y0 + h + fw, frame, OL)
    box(pt, x0, y0, x0 + w, y0 + h, color, OL2)
    if smudges:
        rng = np.random.default_rng(seed)
        for _ in range(5):
            cx, cy = x0 + rng.uniform(0.15, 0.85) * w, y0 + rng.uniform(0.2, 0.8) * h
            rw, rh = rng.uniform(0.08, 0.2) * w, rng.uniform(0.04, 0.09) * h
            pt.shape(T.ellipse_pts(cx, cy, rw, rh, rng.uniform(-0.3, 0.3), 30), mix(color, K["chalk"], 0.08), 0,
                     shade=False)
    if tray:
        ty = y0 + h + fw
        box(pt, x0 - fw * 0.5, ty - 4, x0 + w + fw * 0.5, ty + 18, tone(frame, 0.85), OL2)
        for k, x in enumerate((x0 + w * 0.12, x0 + w * 0.16)):
            box(pt, x, ty - 14, x + 46 - k * 12, ty - 2, K["chalk"], OL2 * 0.6, shade=False)
        box(pt, x0 + w * 0.78, ty - 30, x0 + w * 0.86, ty - 2, K["wood_lt"], OL2 * 0.7, shade=False)
        box(pt, x0 + w * 0.78, ty - 12, x0 + w * 0.86, ty - 2, (110, 110, 110), OL2 * 0.6, shade=False)
    return x0, y0, x0 + w, y0 + h


def desk(pt, cx, base, w, h, color=K["wood"], items=True, seed=0):
    """writing desk with a drawer pedestal; items: papers, book, inkwell + quill, candle."""
    top = table(pt, cx, base, w, h, color)
    y = base - h
    box(pt, cx + w * 0.12, y + h * 0.12, cx + w / 2 - 4, base, tone(color, 0.92), OL2)
    for k in range(3):
        yy = y + h * 0.12 + (h * 0.88) * k / 3
        box(pt, cx + w * 0.12 + 10, yy + 8, cx + w / 2 - 14, yy + h * 0.88 / 3 - 8, color, OL2 * 0.7, shade=False)
        pt.dot(cx + w * 0.31, yy + h * 0.88 / 6, 6, K["gold"])
    if items:
        rng = np.random.default_rng(seed)
        for k in range(3):
            q = T.rot(np.array(rect(-60, -8, 60, 0), float), rng.uniform(-0.08, 0.08)) + (cx - w * 0.22, y - 6 - k * 6)
            pt.shape(q, K["parchment"], OL2 * 0.6, shade=False)
        pt.shape([(cx + w * 0.02, y - 4), (cx + w * 0.12, y - 22), (cx + w * 0.22, y - 4)], K["parchment"], OL2 * 0.6,
                 shade=False)
        box(pt, cx + w * 0.02, y - 10, cx + w * 0.22, y - 2, K["red_dk"], OL2 * 0.6, shade=False)
        pt.shape(T.crom([(cx + w * 0.28, y - 4), (cx + w * 0.27, y - 30), (cx + w * 0.33, y - 30), (cx + w * 0.32, y - 4)],
                        True, 4), K["dark"], OL2 * 0.6, shade=False)
        pt.shape(T.crom([(cx + w * 0.3, y - 30), (cx + w * 0.24, y - 90), (cx + w * 0.2, y - 120), (cx + w * 0.27, y - 92)],
                        True, 5), (236, 240, 244), OL2 * 0.6, shade=False)
        candle(pt, cx + w * 0.42, y - 2, 52)
    return top


def gear(pt, cx, cy, r, teeth=10, color=(150, 150, 150), hole=True, rot=0.0):
    a = np.linspace(0, 2 * math.pi, teeth * 4, endpoint=False) + rot
    rr = np.where((np.arange(teeth * 4) // 2) % 2 == 0, r, r * 0.8)
    pt.shape(np.stack([cx + rr * np.cos(a), cy + rr * np.sin(a)], 1), color, OL2 * 0.7)
    if hole:
        pt.shape(T.ellipse_pts(cx, cy, r * 0.42, r * 0.42, 0, 24), tone(color, 0.85), OL2 * 0.5, shade=False)
        pt.shape(T.ellipse_pts(cx, cy, r * 0.15, r * 0.15, 0, 16), K["dark"], 0, shade=False)


def hammer(pt, x, y, s=1.0, ang=0.0):
    q = T.rot(np.array(rect(-6, 0, 6, 120), float) * s, ang) + (x, y)
    pt.shape(q, K["wood_lt"], OL2 * 0.6, shade=False)
    pt.shape(T.rot(np.array(rect(-34, -10, 30, 18), float) * s, ang) + (x, y), K["iron"], OL2 * 0.6, shade=False)


def saw(pt, x, y, s=1.0, ang=0.0):
    blade = np.array([(0, 0), (170, 10), (170, 34), (0, 52)], float)
    q = np.vstack([blade[:3], [(170 - k * 9.4, 34 + 1.0 * k + (6 if k % 2 else 0)) for k in range(1, 18)], blade[3:]])
    pt.shape(T.rot(q * s, ang) + (x, y), (196, 200, 206), OL2 * 0.6, shade=False)
    pt.shape(T.rot(np.array(rect(-50, 0, 6, 52), float) * s, ang) + (x, y), K["wood"], OL2 * 0.6, shade=False)
    pt.shape(T.rot(T.ellipse_pts(-22, 26, 13, 9, 0, 16) * s, ang) + (x, y), K["dark"], 0, shade=False)


def wrench(pt, x, y, s=1.0, ang=0.0):
    q = np.vstack([np.array(rect(-7, 0, 7, 110), float), ])
    pt.shape(T.rot(q * s, ang) + (x, y), (176, 178, 182), OL2 * 0.6, shade=False)
    pt.shape(T.rot(T.ellipse_pts(0, -6, 18, 18, 0, 20) * s, ang) + (x, y), (176, 178, 182), OL2 * 0.6, shade=False)
    pt.shape(T.rot(np.array(rect(-6, -26, 6, -6), float) * s, ang) + (x, y), K["wood_lt"], 0, shade=False)


def workbench(pt, cx, base, w, h, color=K["wood"], tools=True, seed=0):
    """heavy workbench with a vise, lower shelf and tools on top (hammer, saw, gears, plans)."""
    d = h * 0.18
    y = base - h
    for sx in (cx - w / 2 + 30, cx + w / 2 - 60):
        box(pt, sx, y, sx + 30, base - d * 0.6, tone(color, 0.68), OL2 * 0.8, shade=False)
    box(pt, cx - w / 2 + 20, base - h * 0.3, cx + w / 2 - 20, base - h * 0.22, tone(color, 0.8), OL2, shade=False)
    for k in range(3):
        box(pt, cx - w * 0.3 + k * 50, base - h * 0.3 - 40, cx - w * 0.3 + k * 50 + 44, base - h * 0.3,
            [K["wood_lt"], (120, 120, 126), K["parchment"]][k], OL2 * 0.6, shade=False)
    pt.shape([(cx - w / 2 + d * 0.5, y - d), (cx + w / 2 - d * 0.5, y - d), (cx + w / 2, y), (cx - w / 2, y)],
             tone(color, 1.15), OL2, shade=False)
    box(pt, cx - w / 2, y, cx + w / 2, y + h * 0.14, color, OL2, shade=False)
    for sx in (cx - w / 2 + 14, cx + w / 2 - 50):
        box(pt, sx, y + h * 0.14, sx + 36, base, color, OL2)
    vx = cx - w / 2 + 40
    box(pt, vx - 30, y - d - 40, vx + 30, y - d + 6, K["iron"], OL2 * 0.7, shade=False)
    pt.stroke([(vx - 50, y - d - 20), (vx + 50, y - d - 20)], (150, 150, 156), 7, OL2 * 0.5, shade=False)
    if tools:
        rng = np.random.default_rng(seed)
        top = y - d * 0.5
        pt.shape([(cx - w * 0.2, top + 6), (cx + w * 0.05, top + 6), (cx + w * 0.07, top - 6), (cx - w * 0.18, top - 6)],
                 K["parchment"], OL2 * 0.6, shade=False)
        hammer(pt, cx + w * 0.12, top - 4, 0.9, -1.45)
        gear(pt, cx + w * 0.3, top - 34, 34, 9, (150, 160, 170))
        gear(pt, cx + w * 0.38, top - 22, 22, 7, K["gold_dk"])
        for k in range(4):
            xx = cx - w * 0.05 + rng.uniform(-60, 60)
            pt.line(T.ellipse_pts(xx, top - 6, 10, 6, 0, 14, 0, 4.5).tolist(), 3, K["wood_lt"])
    return y - d * 0.5


def tool_rack(pt, x0, y0, w, h, color=K["wood_lt"]):
    """wall board with hanging tools (workshop back walls)."""
    box(pt, x0, y0, x0 + w, y0 + h, color, OL2)
    for xx in np.linspace(x0 + w * 0.12, x0 + w * 0.88, 5):
        pt.dot(xx, y0 + h * 0.14, 5, K["dark"])
    k = w / 5
    saw(pt, x0 + k * 0.6, y0 + h * 0.18, 0.7, 1.57)
    hammer(pt, x0 + k * 1.75, y0 + h * 0.3, 0.9, 0.0)
    wrench(pt, x0 + k * 2.7, y0 + h * 0.24, 1.0, 0.0)
    pt.line(T.ellipse_pts(x0 + k * 3.8, y0 + h * 0.5, k * 0.36, h * 0.26, 0, 40).tolist(), 7, K["thatch"])
    pt.line(T.ellipse_pts(x0 + k * 3.8, y0 + h * 0.52, k * 0.3, h * 0.2, 0, 40).tolist(), 7, K["thatch"])
    gear(pt, x0 + k * 4.55, y0 + h * 0.6, k * 0.3, 8, (150, 160, 170))


def barrel(pt, cx, base, w=90, h=120, color=K["wood"]):
    q = T.crom([(cx - w * 0.42, base), (cx - w / 2, base - h / 2), (cx - w * 0.42, base - h), (cx + w * 0.42, base - h),
                (cx + w / 2, base - h / 2), (cx + w * 0.42, base)], True, 6)
    pt.shape(q, color, OL2)
    for yy in (base - h * 0.2, base - h * 0.8):
        pt.line([(cx - w * 0.47, yy), (cx + w * 0.47, yy)], 7, K["iron"])
    pt.shape(T.ellipse_pts(cx, base - h, w * 0.42, w * 0.1, 0, 24), tone(color, 1.15), OL2 * 0.8, shade=False)


def crate(pt, x0, base, s=100, color=K["wood_lt"]):
    box(pt, x0, base - s, x0 + s, base, color, OL2)
    pt.line([(x0 + 10, base - s + 10), (x0 + s - 10, base - 10)], 8, tone(color, 0.8))
    ring_line(pt, rect(x0 + 10, base - s + 10, x0 + s - 10, base - 10), 4, tone(color, 0.8))


# ================================================================================================ nature kit
TREES = dict(round=K["leaf"], pine=K["pine"], cypress=K["cypress"], palm=K["palm"], blossom=K["blossom"],
             bamboo=K["bamboo"])


def tree(pt, x, base, h, kind="round", color=None, trunk=K["trunk"], seed=0, line=None):
    """one tree standing at (x, base), height h. kind: round | pine | cypress | palm | blossom | bamboo."""
    rng = np.random.default_rng(seed)
    col = color or TREES[kind]
    lw = line if line is not None else (OL2 if h > 180 else OL2 * 0.7)
    if kind in ("round", "blossom"):
        tw = h * 0.07
        th = h * 0.5
        lean = rng.uniform(-0.04, 0.04) * h
        pt.shape([(x - tw, base), (x - tw * 0.6 + lean, base - th), (x + tw * 0.6 + lean, base - th), (x + tw, base)],
                 trunk, lw, shade=False)
        if kind == "blossom":
            pt.line([(x + lean, base - th * 0.8), (x - h * 0.2, base - h * 0.62)], tw * 0.8, trunk)
            pt.line([(x + lean, base - th * 0.8), (x + h * 0.22, base - h * 0.66)], tw * 0.8, trunk)
            for k, (dx, dy, s) in enumerate(((-0.2, -0.66, 0.2), (0.22, -0.7, 0.2), (0.0, -0.8, 0.24))):
                pt.shape(scallop(x + dx * h, base + dy * h, s * h * 1.1, s * h * 0.8, 7, 0.12, seed=seed + k), col, lw)
            for _ in range(int(h / 40)):
                pt.dot(x + rng.uniform(-0.35, 0.35) * h, base - h * rng.uniform(0.6, 0.9), h * 0.012,
                       tone(col, 1.06))
            for _ in range(5):   # falling petals
                pt.dot(x + rng.uniform(-0.5, 0.5) * h, base - rng.uniform(0.05, 0.45) * h, h * 0.01, col)
        else:
            R = h * 0.3
            pt.shape(scallop(x + lean, base - h + R * 1.05, R * 1.08, R, 9, 0.08, seed=seed), col, lw)
            for _ in range(3):
                ax, ay = x + lean + rng.uniform(-0.55, 0.45) * R, base - h + R * rng.uniform(0.7, 1.5)
                pt.line(T.ellipse_pts(ax, ay, R * 0.18, R * 0.12, 0, 14, 0.2, 2.6).tolist(), max(2.5, h * 0.008),
                        tone(col, 0.82))
    elif kind == "pine":
        box(pt, x - h * 0.04, base - h * 0.2, x + h * 0.04, base, trunk, lw, shade=False)
        tiers = 4
        for i in range(tiers):
            yb = base - h * 0.12 - i * h * 0.21
            ww = h * (0.34 - i * 0.06)
            top = yb - h * (0.36 if i < tiers - 1 else 0.42)
            q = [(x - ww, yb)] + [(x - ww + 2 * ww * k / 6, yb + (5 if k % 2 else -3)) for k in range(1, 6)] + [(x + ww, yb),
                                                                                                               (x, top)]
            pt.shape(q, col, lw)
    elif kind == "cypress":
        box(pt, x - h * 0.03, base - h * 0.1, x + h * 0.03, base, trunk, lw, shade=False)
        q = T.crom([(x, base - h), (x + h * 0.1, base - h * 0.62), (x + h * 0.11, base - h * 0.25), (x, base - h * 0.07),
                    (x - h * 0.11, base - h * 0.25), (x - h * 0.1, base - h * 0.62)], True, 8)
        pt.shape(q, col, lw)
    elif kind == "palm":
        bend = rng.choice([-1, 1]) * h * 0.18
        path = T.crom([(x, base), (x + bend * 0.2, base - h * 0.45), (x + bend, base - h * 0.88)], False, 10)
        pt.stroke(path, (90, 140, 176), h * 0.06, lw, shade=False)
        for p in path[4:-2:3]:
            pt.line([(p[0] - h * 0.03, p[1]), (p[0] + h * 0.03, p[1] - 3)], 3, (64, 104, 136))
        tx, ty = path[-1]
        for k in range(7):
            a = math.pi * (-0.05 - k / 6 * 0.9)
            L = h * rng.uniform(0.34, 0.44)
            ex, ey = tx + L * math.cos(a), ty + L * math.sin(a) * 0.55 + L * 0.35
            mid = (tx + L * 0.5 * math.cos(a), ty + L * 0.5 * math.sin(a) * 0.8 - h * 0.02)
            spine = T.crom([(tx, ty), mid, (ex, ey)], False, 8)
            d = np.gradient(spine, axis=0)
            nrm = np.stack([-d[:, 1], d[:, 0]], 1) / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-6)
            wdt = np.sin(np.linspace(0, math.pi, len(spine))) * h * 0.05 + 1
            pt.shape(np.vstack([spine + nrm * wdt[:, None], (spine - nrm * wdt[:, None])[::-1]]), col, lw * 0.8)
        for dx in (-1, 1):
            pt.shape(T.ellipse_pts(tx + dx * h * 0.025, ty + h * 0.03, h * 0.025, h * 0.025, 0, 16), K["wood_dk"],
                     lw * 0.6, shade=False)
    elif kind == "bamboo":
        for k in range(int(rng.integers(3, 6))):
            sx = x + (k - 2) * h * 0.06 + rng.uniform(-8, 8)
            sh = h * rng.uniform(0.75, 1.0)
            sw = h * 0.025
            box(pt, sx - sw, base - sh, sx + sw, base, col, lw * 0.8, shade=False)
            for yy in np.arange(base - sh * 0.15, base - sh, -sh * 0.15):
                pt.line([(sx - sw, yy), (sx + sw, yy)], 3, tone(col, 0.7))
            for yy in np.arange(base - sh * 0.45, base - sh, -sh * 0.12):
                sg = 1 if rng.random() < 0.5 else -1
                for j in range(2):
                    L = h * 0.09
                    a = (0.3 + j * 0.35) * sg
                    cxl, cyl = sx + sg * L * 0.6, yy + j * 8
                    pt.shape(T.ellipse_pts(cxl, cyl, L * 0.55, L * 0.12, a, 18), tone(K["leaf"], 0.95), lw * 0.5,
                             shade=False)


def tree_row(pt, x0, x1, base, h, kind="round", n=None, color=None, seed=0, jitter=0.18, line=None):
    """a row of trees between x0 and x1 standing on y=base (use several rows on layers with rising depth, smaller and
    paler further back)."""
    rng = np.random.default_rng(seed)
    n = n or max(2, int((x1 - x0) / (h * 0.55)))
    xs = np.linspace(x0, x1, n) + rng.uniform(-1, 1, n) * (x1 - x0) / n * 0.3
    for i in rng.permutation(n):
        tree(pt, xs[i], base + rng.uniform(-0.03, 0.03) * h, h * rng.uniform(1 - jitter, 1 + jitter), kind, color,
             seed=seed * 100 + int(i), line=line)


def treeline(pt, x0, x1, base, h, color=K["leaf_dk"], seed=0, kind="round", line=OL2):
    """far forest as one merged silhouette band (round bumps or pine zigzag) from base up to ~h."""
    rng = np.random.default_rng(seed)
    pts = [(x0 - 20, base + 30)]
    xx = x0 - 20
    while xx < x1 + 20:
        if kind == "pine":
            ww = h * rng.uniform(0.25, 0.4)
            hh = h * rng.uniform(0.7, 1.0)
            pts += [(xx, base - hh * 0.35), (xx + ww / 2, base - hh)]
            xx += ww
        else:
            ww = h * rng.uniform(0.5, 0.9)
            hh = h * rng.uniform(0.65, 1.0)
            a = np.linspace(math.pi, 0, 9)
            pts += list(zip(xx + ww / 2 + ww / 2 * np.cos(a), base - hh * 0.55 - hh * 0.45 * np.sin(a)))
            xx += ww * 0.85
    pts += [(x1 + 20, base - h * 0.4), (x1 + 20, base + 30)]
    pt.shape(np.array(pts), color, line)


def bush(pt, cx, base, w, color=K["leaf"], seed=0, flowers=None, line=OL2):
    h = w * 0.55
    q = scallop(cx, base - h * 0.45, w / 2, h * 0.62, 7, 0.12, seed=seed)
    q = q[q[:, 1] < base + 2]
    pt.shape(np.vstack([q, [[cx + w * 0.45, base], [cx - w * 0.45, base]]]) if len(q) else q, color, line)
    if flowers:
        rng = np.random.default_rng(seed)
        for _ in range(int(w / 30)):
            pt.dot(cx + rng.uniform(-0.35, 0.35) * w, base - rng.uniform(0.2, 0.75) * h, w * 0.03, flowers)


def grass_tufts(pt, x0, x1, y0, y1, n=30, color=K["grass_dk"], seed=0, size=26):
    """small V-shaped grass tufts, bigger toward the viewer (y1)."""
    rng = np.random.default_rng(seed)
    for _ in range(n):
        u = rng.uniform(0, 1) ** 0.7
        x, y = rng.uniform(x0, x1), y0 + (y1 - y0) * u
        s = size * (0.5 + u)
        for a in (-0.5, 0.0, 0.45):
            pt.line([(x + a * s * 0.3, y), (x + a * s, y - s * (1 - abs(a) * 0.4))], 2.5 + 2 * u, color)


def rock(pt, cx, base, w, h=None, color=K["rock"], seed=0, line=OL2):
    rng = np.random.default_rng(seed)
    h = h or w * 0.55
    q = [(cx - w / 2, base), (cx - w * 0.45, base - h * 0.55), (cx - w * 0.2 + rng.uniform(-8, 8), base - h),
         (cx + w * 0.18, base - h * rng.uniform(0.85, 1.0)), (cx + w * 0.45, base - h * 0.5), (cx + w / 2, base)]
    pt.shape(T.crom(q, True, 4), color, line)
    pt.shape([(cx + w * 0.08, base - h * 0.92), (cx + w * 0.45, base - h * 0.5), (cx + w / 2 - 2, base - 2),
              (cx + w * 0.15, base - 2)], tone(color, 0.86), 0, shade=False)


def water(pt, x0, x1, y0, y1, color=K["water"], seed=0, ripples=14, line=OL2):
    """lake / wide river band between y0 (far shore) and y1 with light ripple dashes."""
    rng = np.random.default_rng(seed)
    xs = np.linspace(x0 - 20, x1 + 20, 30)
    top = np.stack([xs, y0 + np.sin(xs / 220 + seed) * 4], 1)
    bot = np.stack([xs[::-1], y1 + np.sin(xs[::-1] / 260 + seed + 1) * 6], 1)
    pt.shape(np.vstack([top, bot]), color, line)
    for _ in range(ripples):
        u = rng.uniform(0.1, 0.95)
        x, y = rng.uniform(x0, x1), y0 + (y1 - y0) * u
        L = 30 + 70 * u
        pt.line([(x - L / 2, y), (x + L / 2, y)], 3 + 2 * u, K["water_lt"])


def river(pt, path, w_far, w_near, color=K["water"], seed=0, line=OL2):
    """river winding toward the viewer: path = centre points from far (first) to near (last), width tapers."""
    p = T.crom(path, False, 12)
    d = np.gradient(p, axis=0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1) / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-6)
    wd = np.linspace(w_far, w_near, len(p))[:, None] / 2
    pt.shape(np.vstack([p + nrm * wd, (p - nrm * wd)[::-1]]), color, line)
    rng = np.random.default_rng(seed)
    for i in rng.integers(len(p) // 5, len(p), 10):
        L = wd[i, 0] * 0.6
        off = rng.uniform(-0.4, 0.4) * wd[i, 0]
        c = p[i] + nrm[i] * off
        pt.line([(c[0] - L / 2, c[1]), (c[0] + L / 2, c[1])], 2 + 3 * i / len(p), K["water_lt"])


def field(pt, x0, x1, y0, y1, color=K["field"], furrow=None, n=12, spread=1.6, crop=None, seed=0, line=OL2):
    """crop field patch in perspective: far edge x0..x1 at y0, widening to the front edge y1. Furrows converge.
    crop: None | wheat (tick marks) | rice (flooded, rows of sprouts)."""
    P = Persp(x0, x1, y0, y1, spread)
    furrow = furrow or tone(color, 0.82)
    q = dense(P.quad(0, 0, 1, 1), 50)
    pt.shape(q, color, line)
    rng = np.random.default_rng(seed)

    def lines():
        for u in np.linspace(0, 1, n + 1)[1:-1]:
            if crop == "rice":
                for v in np.linspace(0.04, 0.98, 9):
                    x, y = P(u, v)
                    s = 6 + 14 * v
                    pt.line([(x - s * 0.4, y), (x, y - s), (x + s * 0.4, y)], 2 + 2 * v, (90, 160, 90))
            else:
                pt.line([P(u, 0), P(u, 1)], 3 + 0 * u, furrow)
                if crop == "wheat":
                    for v in rng.uniform(0.05, 0.95, 5):
                        x, y = P(u + 0.02, v)
                        s = 6 + 12 * v
                        pt.line([(x, y), (x + s * 0.3, y - s)], 2 + 2 * v, tone(color, 1.15))

    clipped(pt, q, lines)


def road(pt, x_far, y_far, w_far, x_near, y_near, w_near, color=K["mud"], seed=0, curve=0.0, ruts=True, puddles=3,
         line=OL2):
    """dirt/muddy road from a far point to the viewer (y_near usually below the plate). curve bends the middle."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, 1, 40)
    cxm = (x_far + x_near) / 2 + curve
    xs = (1 - t) ** 2 * x_far + 2 * (1 - t) * t * cxm + t ** 2 * x_near
    ys = y_far + (y_near - y_far) * t ** 1.4
    ws = w_far + (w_near - w_far) * t ** 1.4
    left = np.stack([xs - ws / 2, ys], 1)
    right = np.stack([xs + ws / 2, ys], 1)
    poly = np.vstack([left, right[::-1]])
    pt.shape(poly, color, line)

    def detail():
        if ruts:
            for k in (-0.22, 0.22):
                pt.line(np.stack([xs + ws * k, ys], 1)[2:].tolist(), 5, tone(color, 0.8))
        for _ in range(puddles):
            u = rng.uniform(0.35, 0.9)
            i = int(u * 39)
            px, py, pw = xs[i] + rng.uniform(-0.25, 0.25) * ws[i], ys[i], ws[i] * rng.uniform(0.18, 0.3)
            pt.shape(T.ellipse_pts(px, py, pw, pw * 0.16, 0, 30), mix(K["water"], color, 0.45), OL2 * 0.6, shade=False)
            pt.line([(px - pw * 0.4, py - pw * 0.03), (px + pw * 0.1, py - pw * 0.03)], 3, K["water_lt"])
        for _ in range(16):
            u = rng.uniform(0.1, 1)
            i = int(u * 39)
            x, y = xs[i] + rng.uniform(-0.45, 0.45) * ws[i], ys[i]
            pt.line([(x - 8 * u - 4, y), (x + 8 * u + 4, y)], 2 + 2 * u, tone(color, 0.85))

    clipped(pt, poly, detail)


def hills(pt, x0, x1, base, h, color=K["hill_mid"], seed=0, n=3, bottom=None, line=OL2, shape="round"):
    """rolling hill band (round) or desert dunes (shape="dune": sharp crest, lit and shaded faces)."""
    rng = np.random.default_rng(seed)
    xs = np.linspace(x0 - 20, x1 + 20, 120)
    if shape == "dune":
        cs = np.linspace(x0, x1, n) + rng.uniform(-0.15, 0.15, n) * (x1 - x0) / n
        hh = rng.uniform(0.55, 1.0, n) * h
        y = np.zeros_like(xs)
        for c, a in zip(cs, hh):
            wl, wr = (x1 - x0) / n * 0.75, (x1 - x0) / n * 0.4
            prof = np.where(xs < c, np.clip(1 - ((c - xs) / wl) ** 2, 0, 1), np.clip(1 - np.clip((xs - c) / wr, 0, None) ** 1.3, 0, 1))
            y = np.maximum(y, a * prof)
    else:
        y = np.zeros_like(xs)
        for _ in range(n):
            c, a, s = rng.uniform(x0, x1), rng.uniform(0.6, 1.0) * h, rng.uniform(0.18, 0.4) * (x1 - x0)
            y = np.maximum(y, a * np.exp(-((xs - c) / s) ** 2))
        y = y + h * 0.15
    top = np.stack([xs, base - y], 1)
    bottom = bottom if bottom is not None else base + 60
    pt.shape(np.vstack([top, [[x1 + 20, bottom], [x0 - 20, bottom]]]), color, line)
    if shape == "dune":
        for c, a in zip(cs, hh):
            i = int(np.argmin(np.abs(xs - c)))
            wr = (x1 - x0) / n * 0.4
            pt.shape([(c, base - a), (c + wr * 0.95, base - 2), (c + wr * 0.2, base - 2)], tone(color, 0.86), 0,
                     shade=False)
    return top


def sun(pt, cx, cy, r, color=(120, 222, 252)):
    pt.shape(T.ellipse_pts(cx, cy, r, r, 0, 60), color, OL2, shade=False)


def rain_layer(plate, name="rain", depth=1.0, n=700, angle=14, length=(40, 90), color=(236, 226, 214), alpha=0.5,
               seed=0):
    """transparent overlay layer of rain streaks (put it last; depth ~1.0)."""
    pt = plate.layer(name, depth)
    rng = np.random.default_rng(seed)
    Hc, Wc = pt.img.shape[:2]
    m = np.zeros((Hc, Wc), np.uint8)
    a = math.radians(angle)
    for _ in range(n):
        x, y = rng.uniform(-100, plate.w + 100) * SS, rng.uniform(-100, plate.h) * SS
        L = rng.uniform(*length) * SS
        cv2.line(m, (int(x), int(y)), (int(x + L * math.sin(a)), int(y + L * math.cos(a))),
                 int(255 * alpha * rng.uniform(0.6, 1.0)), int(rng.uniform(2, 3.5) * SS), cv2.LINE_AA)
    pt.img[..., :3] = color
    pt.img[..., 3] = m
    pt.img[m == 0, :3] = 0
    return pt


# ================================================================================================ architecture kit
def merlons(pt, x0, x1, top, mw=34, mh=34, color=K["castle"], line=OL2):
    """crenellation teeth standing on the wall top y=top."""
    n = max(1, int((x1 - x0) / (2 * mw)))
    step = (x1 - x0) / n
    for i in range(n):
        xx = x0 + i * step + (step - mw) / 2
        box(pt, xx, top - mh, xx + mw, top + 4, color, line, shade=False)


def stone_wall(pt, x0, x1, base, top, color=K["castle"], seed=0, crenel=True, blocks=True, line=OL):
    """curtain / city wall body between x0 and x1 from base up to top, with crenellations and sparse stone blocks."""
    rng = np.random.default_rng(seed)
    if crenel:
        merlons(pt, x0 + 6, x1 - 6, top, mw=(top - base) * -0.09 + 6, mh=(base - top) * 0.11 + 8, color=color)
    pt.shape(dense(rect(x0, top, x1, base), 50), color, line)
    pt.line([(x0 + 4, top + 16), (x1 - 4, top + 16)], 3.5, tone(color, 0.75))
    if blocks:
        c = max(26, (base - top) * 0.09)

        def blk():
            for _ in range(int((x1 - x0) * (base - top) / 60000) + 2):
                cx, cy = rng.uniform(x0, x1), rng.uniform(top + 40, base - c)
                for r in range(int(rng.integers(2, 4))):
                    xx = cx + (r % 2) * c
                    for k in range(int(rng.integers(1, 4))):
                        q = rect(xx + k * 2 * c + 3, cy + r * c + 3, xx + (k + 1) * 2 * c - 3, cy + (r + 1) * c - 3)
                        pt.shape(q, tone(color, rng.choice([0.92, 1.05])), 0, shade=False)
                        ring_line(pt, q, 3, tone(color, 0.74))
        clipped(pt, rect(x0, top + 20, x1, base), blk)


def tower(pt, cx, base, w, h, color=K["castle"], roof="cone", roof_color=K["roof_red"], seed=0, windows=2,
          flag_color=None, line=OL):
    """castle tower standing at (cx, base). roof: cone | crenel | pyramid | none."""
    top = base - h
    pt.shape(dense(rect(cx - w / 2, top, cx + w / 2, base), 50), color, line)
    for k in range(windows):   # arrow slits / small windows
        yy = top + h * (0.25 + k * 0.3)
        pt.shape(arch_poly(cx, yy + w * 0.22, w * 0.12, w * 0.22), K["dark"], OL2 * 0.6, shade=False)
    if roof in ("cone", "pyramid"):
        box(pt, cx - w / 2 - 12, top - 24, cx + w / 2 + 12, top + 6, tone(color, 1.05), OL2, shade=False)
        rh = w * (1.2 if roof == "cone" else 0.8)
        q = T.crom([(cx - w / 2 - 22, top - 20), (cx - w * 0.2, top - rh * 0.6), (cx, top - 20 - rh)], False, 6).tolist() + \
            T.crom([(cx, top - 20 - rh), (cx + w * 0.2, top - rh * 0.6), (cx + w / 2 + 22, top - 20)], False, 6).tolist()[1:]
        pt.shape(q, roof_color, line)
        if flag_color:
            flag(pt, cx, top - 18 - rh, w * 0.7, flag_color, seed=seed)
    elif roof == "crenel":
        box(pt, cx - w / 2 - 12, top - 20, cx + w / 2 + 12, top + 8, tone(color, 1.05), OL2, shade=False)
        merlons(pt, cx - w / 2 - 12, cx + w / 2 + 12, top - 20, w * 0.16, w * 0.16, color)
        if flag_color:
            flag(pt, cx, top - 20, w * 0.9, flag_color, seed=seed)
    return top


def castle(pt, cx, base, w, h, color=K["castle"], roof_color=K["roof_red"], flag_color=K["red"], seed=0, gate=True,
           line=OL):
    """iconic castle: keep behind, curtain wall with crenellations, two round towers, gatehouse with portcullis.
    (cx, base) = bottom centre; w, h = overall size (towers reach ~h)."""
    keep_w = w * 0.26
    tower(pt, cx + w * 0.08, base - h * 0.3, keep_w, h * 0.55, tone(color, 0.94), "crenel", seed=seed + 1,
          flag_color=flag_color, line=line)
    wall_top = base - h * 0.42
    stone_wall(pt, cx - w * 0.42, cx + w * 0.42, base, wall_top, color, seed, line=line)
    for sx in (-1, 1):
        tower(pt, cx + sx * w * 0.42, base, w * 0.17, h * 0.62, color, "cone", roof_color, seed=seed + 2 + sx, line=line,
              flag_color=None)
    if gate:
        gw = w * 0.22
        gtop = base - h * 0.55
        box(pt, cx - gw / 2, gtop, cx + gw / 2, base, tone(color, 1.03), line)
        merlons(pt, cx - gw / 2, cx + gw / 2, gtop, gw * 0.12, gw * 0.12, color)
        op = arch_poly(cx, base, gw * 0.55, h * 0.28)
        pt.shape(op, K["dark"], OL2, shade=False)

        def grid():
            for xx in np.linspace(cx - gw * 0.27, cx + gw * 0.27, 6):
                pt.line([(xx, base - h * 0.3), (xx, base - h * 0.08)], 5, K["iron"])
            for yy in np.linspace(base - h * 0.26, base - h * 0.1, 4):
                pt.line([(cx - gw * 0.3, yy), (cx + gw * 0.3, yy)], 5, K["iron"])
        clipped(pt, op, grid)
        pt.shape(op, None, OL2)


def city_wall(pt, x0, x1, base, h, color=K["wall_tan"], seed=0, towers=4, gate_x=None, line=OL):
    """long city wall with square towers and an optional gate (arched, at gate_x)."""
    stone_wall(pt, x0, x1, base, base - h, color, seed, line=line)
    for tx in np.linspace(x0 + 60, x1 - 60, towers):
        if gate_x is not None and abs(tx - gate_x) < h * 0.8:
            continue
        tower(pt, tx, base, h * 0.45, h * 1.3, tone(color, 1.04), "crenel", seed=seed, windows=1, line=line)
    if gate_x is not None:
        gw = h * 0.9
        box(pt, gate_x - gw / 2, base - h * 1.45, gate_x + gw / 2, base, tone(color, 1.06), line)
        merlons(pt, gate_x - gw / 2, gate_x + gw / 2, base - h * 1.45, gw * 0.12, gw * 0.12, color)
        archway(pt, gate_x, base, gw * 0.5, h * 0.8, tone(color, 0.95))


def eave_roof(pt, cx, y_eave, w, h, color=K["jp_roof"], curl=0.12, ridge=None, line=OL2, tiles=True, top_w=None):
    """sweeping East Asian roof: eave line at y_eave curling up at the tips, concave slopes up to a ridge of width
    top_w (default 0.45 w). Returns the ridge y."""
    top_w = top_w if top_w is not None else w * 0.45
    yr = y_eave - h
    L = T.crom([(cx - w / 2, y_eave - h * curl * 1.8), (cx - w * 0.4, y_eave - h * 0.02), (cx, y_eave + h * 0.03)], False, 8)
    R = L[::-1].copy()
    R[:, 0] = 2 * cx - R[:, 0]
    eave = np.vstack([L, R[1:]])
    sl = T.crom([(cx + w / 2, y_eave - h * curl * 1.8), (cx + w * 0.36, y_eave - h * 0.5), (cx + top_w / 2, yr)], False, 8)
    left_slope = sl[::-1].copy()          # ridge (left end) down to the left tip
    left_slope[:, 0] = 2 * cx - left_slope[:, 0]
    poly = np.vstack([eave, sl[1:], left_slope[:-1]])
    pt.shape(poly, color, line)
    if tiles:
        def tl():
            for xx in np.linspace(cx - w * 0.42, cx + w * 0.42, 15):
                pt.line([(xx * 0.55 + cx * 0.45, yr + 4), (xx, y_eave)], 3, tone(color, 0.8))
        clipped(pt, poly, tl)
    box(pt, cx - top_w / 2 - 8, yr - (ridge or h * 0.12), cx + top_w / 2 + 8, yr + 4, tone(color, 0.85), line,
        shade=False)
    return yr - (ridge or h * 0.12)


def jp_castle(pt, cx, base, w, h, wall=K["jp_wall"], roof=K["jp_roof"], stone=K["stone"], gold=K["gold"], seed=0,
              tiers=3, line=OL):
    """Japanese castle keep: sloped stone base, white tiers with dark sweeping roofs, gables, gold ridge ornaments."""
    sb = h * 0.24
    q = T.crom([(cx - w * 0.52, base), (cx - w * 0.44, base - sb * 0.6), (cx - w * 0.4, base - sb)], False, 6).tolist() + \
        T.crom([(cx + w * 0.4, base - sb), (cx + w * 0.44, base - sb * 0.6), (cx + w * 0.52, base)], False, 6).tolist()
    pt.shape(q, stone, line)

    def blocks():
        rng = np.random.default_rng(seed)
        for yy in np.arange(base - sb + 30, base, 34):
            for xx in np.arange(cx - w * 0.55 + rng.uniform(0, 60), cx + w * 0.55, rng.uniform(70, 110)):
                pt.line([(xx, yy - 34), (xx + 4, yy)], 3, tone(stone, 0.75))
            pt.line([(cx - w * 0.6, yy), (cx + w * 0.6, yy)], 3, tone(stone, 0.75))
    clipped(pt, q, blocks)
    y = base - sb
    th = (h - sb) / (tiers + 0.6)
    for i in range(tiers):
        tw = w * (0.78 - i * 0.18)
        box(pt, cx - tw / 2, y - th * 0.75, cx + tw / 2, y, wall, line)
        for xx in np.linspace(cx - tw * 0.35, cx + tw * 0.35, max(2, 5 - i)):
            box(pt, xx - 10, y - th * 0.55, xx + 10, y - th * 0.3, K["dark"], OL2 * 0.6, shade=False)
        y -= th * 0.75
        rw = tw * 1.32
        ry = eave_roof(pt, cx, y + th * 0.08, rw, th * 0.5, roof, line=line, top_w=tw * 0.7 if i < tiers - 1 else tw * 0.4)
        if i < tiers - 1 and i % 2 == 0:   # triangular gable on the roof
            gy = y - th * 0.05
            pt.shape([(cx - tw * 0.22, gy), (cx, gy - th * 0.45), (cx + tw * 0.22, gy)], roof, OL2)
            pt.shape([(cx - tw * 0.14, gy - 4), (cx, gy - th * 0.32), (cx + tw * 0.14, gy - 4)], wall, OL2 * 0.6,
                     shade=False)
        y = y - th * 0.15 if i < tiers - 1 else ry
    for sg in (-1, 1):
        pt.shape(T.crom([(cx + sg * w * 0.13, y + 4), (cx + sg * w * 0.16, y - 24), (cx + sg * w * 0.12, y - 40),
                         (cx + sg * w * 0.1, y - 14)], True, 4), gold, OL2 * 0.6, shade=False)


def pagoda(pt, cx, base, w, h, tiers=5, body=K["cn_red"], roof=K["jp_roof"], line=OL):
    """tiered pagoda: platform, shrinking storeys with wide sweeping eaves, spire with rings."""
    box(pt, cx - w * 0.5, base - h * 0.05, cx + w * 0.5, base, K["stone_lt"], line, shade=False)
    y = base - h * 0.05
    sh = h * 0.78 / tiers
    for i in range(tiers):
        bw = w * (0.56 - i * 0.07)
        box(pt, cx - bw / 2, y - sh * 0.55, cx + bw / 2, y, body, OL2)
        box(pt, cx - bw * 0.12, y - sh * 0.45, cx + bw * 0.12, y, K["dark"], OL2 * 0.6, shade=False)
        y -= sh * 0.55
        eave_roof(pt, cx, y + sh * 0.05, bw * 1.75, sh * 0.42, roof, ridge=4, line=OL2, top_w=bw * 0.85)
        y -= sh * 0.42
    top = base - h
    pt.line([(cx, y), (cx, top)], 9, K["iron"])
    for k in range(5):
        yy = y - (y - top) * (0.2 + k * 0.13)
        pt.shape(T.ellipse_pts(cx, yy, 16 - k * 1.5, 5, 0, 16), K["gold"], OL2 * 0.5, shade=False)


def torii(pt, cx, base, w, h, color=K["torii"], top=(56, 50, 48), line=OL):
    """torii gate: two pillars, black upswept top beam (kasagi), red tie beam (nuki), centre strut."""
    pw = w * 0.07
    for sg in (-1, 1):
        x = cx + sg * w * 0.33
        pt.shape([(x - pw * 0.55, base - h * 0.82), (x + pw * 0.55, base - h * 0.82), (x + pw * 0.65, base),
                  (x - pw * 0.65, base)], color, line)
        box(pt, x - pw * 0.8, base - h * 0.08, x + pw * 0.8, base, top, OL2, shade=False)
    box(pt, cx - w * 0.44, base - h * 0.7, cx + w * 0.44, base - h * 0.63, color, line, shade=False)
    box(pt, cx - pw * 0.4, base - h * 0.85, cx + pw * 0.4, base - h * 0.7, color, OL2, shade=False)
    box(pt, cx - w * 0.46, base - h * 0.88, cx + w * 0.46, base - h * 0.82, color, line, shade=False)
    kb = base - h * 0.88
    q = T.crom([(cx - w * 0.56, kb - h * 0.13), (cx - w * 0.3, kb - h * 0.02), (cx, kb), (cx + w * 0.3, kb - h * 0.02),
                (cx + w * 0.56, kb - h * 0.13)], False, 8)
    upper = q.copy()
    upper[:, 1] -= h * 0.055
    pt.shape(np.vstack([q, upper[::-1]]), top, line)


def cn_hall(pt, cx, base, w, h, roof=K["cn_roof"], column=K["cn_red"], wall=K["cn_wall"], terrace=K["marble"],
            band=K["teal"], double=True, line=OL):
    """Chinese palace hall: white terrace with balustrade and central stairs, red columns, lattice doors, teal/gold
    bracket band, sweeping yellow double-eave hip roof. (cx, base) = bottom of the terrace."""
    th = h * 0.16
    box(pt, cx - w * 0.5, base - th, cx + w * 0.5, base, terrace, line)
    pt.line([(cx - w * 0.5, base - th * 0.55), (cx + w * 0.5, base - th * 0.55)], 3, tone(terrace, 0.8))
    for xx in np.linspace(cx - w * 0.49, cx + w * 0.49, 22):   # balustrade posts
        box(pt, xx - 6, base - th - 34, xx + 6, base - th, terrace, OL2 * 0.6, shade=False)
    box(pt, cx - w * 0.5, base - th - 26, cx + w * 0.5, base - th - 16, terrace, OL2 * 0.6, shade=False)
    sw = w * 0.16   # central stairs
    pt.shape([(cx - sw / 2, base - th - 2), (cx + sw / 2, base - th - 2), (cx + sw / 2 + 30, base), (cx - sw / 2 - 30, base)],
             tone(terrace, 0.95), OL2)
    for k in range(1, 6):
        yy = base - th + th * k / 6
        pt.line([(cx - sw / 2 - 30 * k / 6, yy), (cx + sw / 2 + 30 * k / 6, yy)], 3, tone(terrace, 0.75))
    pt.shape([(cx - sw * 0.18, base - th), (cx + sw * 0.18, base - th), (cx + sw * 0.2, base), (cx - sw * 0.2, base)],
             tone(terrace, 0.88), OL2 * 0.6, shade=False)
    y0 = base - th
    bh = h * 0.34
    hw = w * 0.4
    box(pt, cx - hw, y0 - bh, cx + hw, y0, wall, line)
    n = 8
    xs = np.linspace(cx - hw + 20, cx + hw - 20, n)
    for a, b in zip(xs[:-1], xs[1:]):   # lattice doors between columns
        box(pt, a + 26, y0 - bh * 0.8, b - 26, y0, K["gold_dk"], OL2 * 0.6, shade=False)
        def lat(a=a, b=b):
            for yy in np.arange(y0 - bh * 0.8 + 14, y0 - bh * 0.35, 18):
                pt.line([(a + 26, yy), (b - 26, yy)], 3, tone(K["gold_dk"], 0.7))
            for xx in np.arange(a + 38, b - 26, 18):
                pt.line([(xx, y0 - bh * 0.8), (xx, y0 - bh * 0.35)], 3, tone(K["gold_dk"], 0.7))
        clipped(pt, rect(a + 26, y0 - bh * 0.8, b - 26, y0 - bh * 0.35), lat, pad=6)
    for xx in xs:
        box(pt, xx - 16, y0 - bh, xx + 16, y0, column, OL2)
    box(pt, cx - hw - 20, y0 - bh - h * 0.08, cx + hw + 20, y0 - bh + 6, band, line, shade=False)
    for xx in np.linspace(cx - hw, cx + hw, 12):
        pt.shape([(xx, y0 - bh - h * 0.06), (xx + 14, y0 - bh - h * 0.035), (xx, y0 - bh - h * 0.01), (xx - 14, y0 - bh - h * 0.035)],
                 K["gold"], 2, shade=False)
    ye = y0 - bh - h * 0.06
    if double:
        eave_roof(pt, cx, ye, w * 1.04, h * 0.12, roof, ridge=4, line=line, top_w=w * 0.72)
        ye -= h * 0.12
        box(pt, cx - hw * 0.8, ye - h * 0.08, cx + hw * 0.8, ye + 4, wall, OL2, shade=False)
        box(pt, cx - hw * 0.8, ye - h * 0.1, cx + hw * 0.8, ye - h * 0.06, band, OL2, shade=False)
        ye -= h * 0.08
    yr = eave_roof(pt, cx, ye, w * (0.9 if double else 1.04), h * 0.26, roof, ridge=h * 0.03, line=line, top_w=w * 0.42)
    for sg in (-1, 1):   # ridge-end ornaments
        x = cx + sg * w * 0.21
        pt.shape(T.crom([(x, yr + 6), (x + sg * 6, yr - 40), (x - sg * 18, yr - 46), (x - sg * 14, yr - 20)], True, 4),
                 tone(roof, 0.85), OL2 * 0.7, shade=False)


def great_wall(pt, path, h=70, color=K["wall_tan"], seed=0, towers=(), tower_w=110, line=OL2):
    """Great-Wall-style wall following a ridge: path = ground points (plate px, left to right, may climb hills),
    h = wall height, towers = fractions 0..1 along the path for watchtowers."""
    p = T.crom(path, False, 10)
    top = p - (0, h)
    face = np.vstack([p, top[::-1]])
    pt.shape(face, color, line)
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])
    # crenels along the top
    step = h * 0.55
    for d in np.arange(step / 2, cum[-1], step * 2):
        i = int(np.searchsorted(cum, d))
        i = min(i, len(p) - 1)
        x, y = top[i]
        box(pt, x - step * 0.45, y - h * 0.32, x + step * 0.45, y + 3, color, line * 0.8, shade=False)
    pt.line((top + (0, h * 0.18)).tolist(), 3, tone(color, 0.75))

    def blk():
        rng = np.random.default_rng(seed)
        for d in rng.uniform(0, cum[-1], int(cum[-1] / 120)):
            i = min(int(np.searchsorted(cum, d)), len(p) - 1)
            x, y = p[i]
            yy = y - h * rng.uniform(0.25, 0.7)
            pt.line([(x - h * 0.3, yy), (x + h * 0.3, yy)], 3, tone(color, 0.78))
    clipped(pt, face, blk)
    for f in towers:
        i = min(int(np.searchsorted(cum, f * cum[-1])), len(p) - 1)
        x, y = p[i]
        tw = tower_w
        th = h * 2.0
        box(pt, x - tw / 2, y - th, x + tw / 2, y + 10, tone(color, 1.05), line)
        merlons(pt, x - tw / 2 - 4, x + tw / 2 + 4, y - th, tw * 0.13, tw * 0.13, tone(color, 1.05), line * 0.8)
        for k in (-1, 1):
            pt.shape(arch_poly(x + k * tw * 0.2, y - th * 0.45, tw * 0.16, th * 0.3), K["dark"], line * 0.6, shade=False)


def column(pt, cx, base, w, h, color=K["marble"], flutes=True, line=OL2):
    box(pt, cx - w * 0.66, base - w * 0.24, cx + w * 0.66, base, color, line, shade=False)
    pt.shape([(cx - w / 2, base - h + w * 0.36), (cx + w / 2, base - h + w * 0.36), (cx + w * 0.55, base - w * 0.24),
              (cx - w * 0.55, base - w * 0.24)], color, line)
    if flutes:
        for k in (-0.22, 0.0, 0.22):
            pt.line([(cx + k * w, base - h + w * 0.5), (cx + k * w * 1.05, base - w * 0.34)], 2.5, tone(color, 0.82))
    box(pt, cx - w * 0.72, base - h, cx + w * 0.72, base - h + w * 0.2, color, line, shade=False)
    for sg in (-1, 1):
        pt.shape(T.ellipse_pts(cx + sg * w * 0.62, base - h + w * 0.3, w * 0.16, w * 0.16, 0, 16), color, line * 0.7,
                 shade=False)
    box(pt, cx - w * 0.5, base - h + w * 0.2, cx + w * 0.5, base - h + w * 0.38, color, line * 0.8, shade=False)


def colonnade(pt, x0, x1, base, h, n=8, color=K["marble"], line=OL2, entablature=True):
    cw = (x1 - x0) / n * 0.4
    for xx in np.linspace(x0 + cw, x1 - cw, n):
        column(pt, xx, base, cw, h, color, line=line)
    if entablature:
        box(pt, x0 - cw * 0.3, base - h - h * 0.14, x1 + cw * 0.3, base - h + 2, color, OL2 * 1.2)
        pt.line([(x0 - cw * 0.3, base - h - h * 0.07), (x1 + cw * 0.3, base - h - h * 0.07)], 3, tone(color, 0.8))
    return base - h - h * 0.14


def temple(pt, cx, base, w, h, n_cols=6, color=K["marble"], line=OL):
    """Greco-Roman temple front: three steps, columns, entablature, pediment. h = total height to the apex."""
    sh = h * 0.05
    for k in range(3):
        ww = w - k * w * 0.03
        box(pt, cx - ww / 2, base - (k + 1) * sh, cx + ww / 2, base - k * sh, tone(color, 0.97 + 0.02 * k), OL2, shade=False)
    sb = base - 3 * sh
    ch = h * 0.55
    ww = w * 0.9
    top = colonnade(pt, cx - ww / 2, cx + ww / 2, sb, ch, n_cols, color, OL2)
    ph = h - (base - top)
    pt.shape([(cx - ww / 2 - 30, top + 2), (cx, top - ph), (cx + ww / 2 + 30, top + 2)], color, line)
    pt.shape([(cx - ww / 2 + 30, top - 10), (cx, top - ph + 26), (cx + ww / 2 - 30, top - 10)], tone(color, 0.9), OL2 * 0.6,
             shade=False)


def pyramid(pt, cx, base, w, h, color=K["sandstone"], seed=0, courses=True, line=OL, cap=True):
    """pyramid with a lit left face and a shaded right face (corner edge facing the viewer slightly right)."""
    apex = (cx + w * 0.06, base - h)
    mid = (cx + w * 0.16, base)
    L, R = (cx - w / 2, base), (cx + w / 2, base)
    pt.shape([L, apex, mid], color, line, shade=False)
    dk = tone(color, 0.78)
    pt.shape([mid, apex, R], dk, line, shade=False)
    if courses:
        rng = np.random.default_rng(seed)
        for k in range(1, 12):
            y = base - h * k / 12
            u = k / 12
            xl = L[0] + (apex[0] - L[0]) * u
            xm = mid[0] + (apex[0] - mid[0]) * u
            xr = R[0] + (apex[0] - R[0]) * u
            if rng.random() < 0.8:
                a, b = sorted(rng.uniform(xl + 6, xm - 6, 2))
                pt.line([(a, y), (b, y)], 3, tone(color, 0.82))
            pt.line([(xm + 6, y), (xm + (xr - xm) * rng.uniform(0.4, 0.95), y)], 3, tone(dk, 0.85))
    if cap:
        u = 0.9
        pt.shape([(L[0] + (apex[0] - L[0]) * u, base - h * u), apex, (mid[0] + (apex[0] - mid[0]) * u, base - h * u)],
                 (150, 222, 246), OL2 * 0.6, shade=False)


def house(pt, x0, base, w, h, kind="timber", roof="thatch", color=None, roof_color=None, seed=0, door_side=0.25,
          chimney=True, gable=True, line=OL):
    """medieval village house (front gable). kind: timber | stone | plaster; roof: thatch | tile | slate."""
    rng = np.random.default_rng(seed)
    col = color or (K["plaster"] if kind in ("timber", "plaster") else K["stone_warm"])
    rc = roof_color or dict(thatch=K["thatch"], tile=K["roof_red"], slate=K["slate"])[roof]
    wh = h * 0.55
    top = base - wh
    cx = x0 + w / 2
    if chimney:
        box(pt, x0 + w * 0.68, base - h * 1.02, x0 + w * 0.8, base - h * 0.62, K["stone"], OL2)
    ov = w * 0.08
    if roof == "thatch":
        q = T.crom([(x0 - ov, top + 10), (x0 + w * 0.12, top - (h - wh) * 0.6), (cx, base - h), (x0 + w * 0.88, top - (h - wh) * 0.6),
                    (x0 + w + ov, top + 10)], False, 8)
        rpoly = np.vstack([q, [[x0 + w + ov - 4, top + 26], [x0 - ov + 4, top + 26]]])
    else:
        rpoly = np.array([(x0 - ov, top + 14), (cx, base - h), (x0 + w + ov, top + 14), (x0 + w + ov - 10, top + 28),
                          (x0 - ov + 10, top + 28)], float)
    wallp = dense(rect(x0, top, x0 + w, base), 40)
    pt.shape(wallp, col, line)
    if kind == "timber":
        def beams():
            for xx in (x0 + 6, x0 + w - 6, cx):
                pt.line([(xx, top), (xx, base)], 12, K["timber"])
            pt.line([(x0, top + wh * 0.45), (x0 + w, top + wh * 0.45)], 12, K["timber"])
            pt.line([(x0 + 6, top + wh * 0.45), (cx, top + 6)], 10, K["timber"])
        clipped(pt, wallp, beams)
    elif kind == "stone":
        def stones():
            for _ in range(6):
                sx, sy = rng.uniform(x0, x0 + w), rng.uniform(top, base)
                q = rect(sx, sy, sx + rng.uniform(30, 50), sy + 22)
                pt.shape(q, tone(col, 0.92), 0, shade=False)
                ring_line(pt, q, 3, tone(col, 0.72))
        clipped(pt, wallp, stones)
    pt.shape(wallp, None, line)
    pt.shape(rpoly, rc, line)
    if roof == "thatch":
        for xx in np.linspace(x0 - ov + 14, x0 + w + ov - 14, 9):
            pt.line([(xx, top + 22), (xx + 4, top + 4)], 3, tone(rc, 0.78))
    else:
        def tl():
            for k in range(1, 6):
                yy = top + 20 - (h - wh) * k / 6
                pt.line([(x0 - ov, yy), (x0 + w + ov, yy)], 3, tone(rc, 0.78))
        clipped(pt, rpoly, tl)
    dw = w * 0.22
    dx = x0 + w * door_side
    door(pt, dx, base, dw, wh * 0.62, "arch", K["wood"], bands=False)
    window_lattice(pt, x0 + w * 0.58, top + wh * 0.2, w * 0.24, wh * 0.3, K["wood_dk"], (70, 110, 150), 2, 2, sill=False)
    if gable:
        window_lattice(pt, cx - w * 0.07, base - h * 0.78, w * 0.14, w * 0.12, K["wood_dk"], (70, 110, 150), 2, 1,
                       sill=False)


def windmill(pt, cx, base, h, angle=20, color=K["plaster"], roof=K["thatch"], sail=K["cloth"], frame=K["wood_dk"],
             line=OL):
    """tower windmill with four lattice sails; angle = sail rotation in degrees."""
    w = h * 0.36
    pt.shape([(cx - w / 2, base), (cx - w * 0.32, base - h * 0.62), (cx + w * 0.32, base - h * 0.62), (cx + w / 2, base)],
             color, line)
    door(pt, cx, base, w * 0.3, h * 0.16, "arch", K["wood"], bands=False)
    window_lattice(pt, cx - w * 0.08, base - h * 0.42, w * 0.16, w * 0.18, K["wood_dk"], K["dark"], 1, 1, sill=False)
    top = base - h * 0.62
    pt.shape(T.ellipse_pts(cx, top, w * 0.4, w * 0.36, 0, 40, math.pi, 2 * math.pi).tolist() + [(cx + w * 0.4, top + 8),
                                                                                                (cx - w * 0.4, top + 8)],
             roof, line)
    hub = (cx, top - w * 0.12)
    for k in range(4):
        a = math.radians(angle + 90 * k)
        u = np.array([math.cos(a), math.sin(a)])
        v = np.array([-u[1], u[0]])
        L = h * 0.48
        p0 = np.array(hub) + u * L * 0.18
        sail_q = [p0, p0 + u * L * 0.82, p0 + u * L * 0.82 + v * L * 0.2, p0 + v * L * 0.2]
        pt.shape(sail_q, sail, OL2 * 0.8, shade=False)
        for f in (0.33, 0.66):
            pt.line([tuple(p0 + u * L * 0.82 * f), tuple(p0 + u * L * 0.82 * f + v * L * 0.2)], 3, frame)
        pt.line([tuple(np.array(hub)), tuple(np.array(hub) + u * L)], 9, frame)
    pt.shape(T.ellipse_pts(hub[0], hub[1], 14, 14, 0, 20), frame, OL2 * 0.7, shade=False)


def smoke(pt, x, y, h, color=K["smoke"], seed=0, drift=0.5):
    """puffs rising from (x, y) to y - h, drifting right."""
    rng = np.random.default_rng(seed)
    for k in range(5):
        u = k / 4
        r = h * (0.08 + 0.1 * u)
        pt.shape(scallop(x + drift * h * u ** 1.3, y - h * u - r * 0.5, r * 1.2, r, 6, 0.14, 80, seed + k),
                 tone(color, 1.0 + 0.04 * u), OL2 * 0.7, shade=False)


def factory(pt, x0, base, w, h, color=K["factory_brick"], seed=0, chimneys=((0.75, 1.9), (0.88, 1.6)), smoke_on=True,
            sawtooth=True, lit=False, line=OL):
    """19th-century factory: brick hall with arched window rows, sawtooth roof, tall chimneys with smoke."""
    for fx, hm in chimneys:
        cx = x0 + w * fx
        cw = w * 0.07
        ch = h * hm
        pt.shape([(cx - cw / 2, base - ch), (cx + cw / 2, base - ch), (cx + cw * 0.65, base - h * 0.5), (cx - cw * 0.65, base - h * 0.5)],
                 tone(color, 0.92), line)
        box(pt, cx - cw * 0.62, base - ch - 18, cx + cw * 0.62, base - ch + 8, tone(color, 0.8), OL2, shade=False)
        pt.line([(cx - cw * 0.52, base - ch + 50), (cx + cw * 0.52, base - ch + 50)], 6, tone(color, 0.7))
        if smoke_on:
            smoke(pt, cx, base - ch - 18, h * 0.45, seed=seed + int(fx * 10))
    top = base - h * 0.7
    if sawtooth:
        n = 5
        tw = w / n
        for i in range(n):
            pt.shape([(x0 + i * tw, top + 4), (x0 + i * tw, top - h * 0.24), (x0 + (i + 1) * tw, top + 4)], K["slate"], OL2)
            box(pt, x0 + i * tw + 6, top - h * 0.2, x0 + i * tw + 22, top, (150, 200, 220) if lit else (130, 120, 110),
                OL2 * 0.5, shade=False)
    wallp = dense(rect(x0, top, x0 + w, base), 50)
    pt.shape(wallp, color, line)

    def bricks():
        wall(pt, x0, top, x0 + w, base, "brick", color, seed, course=24, clusters=max(3, int(w / 260)))
    clipped(pt, wallp, bricks)
    pt.shape(wallp, None, line)
    box(pt, x0 - 6, top - 6, x0 + w + 6, top + 14, tone(color, 0.8), OL2, shade=False)
    cols = max(3, int(w / 130))
    for r in range(2):
        for i in range(cols):
            wx = x0 + w * (i + 0.5) / cols
            ww = w / cols * 0.5
            yb = top + (base - top) * (0.45 + r * 0.42)
            wh_ = (base - top) * 0.28
            if r == 1 and i == cols // 2:
                door(pt, wx, base, ww * 1.3, (base - top) * 0.42, "arch", K["wood_dk"], bands=False)
                continue
            pt.shape(arch_poly(wx, yb, ww + 12, wh_ + 8), tone(color, 0.82), OL2 * 0.7, shade=False)
            win = arch_poly(wx, yb - 4, ww, wh_)
            pt.shape(win, (110, 210, 240) if lit else (110, 96, 86), OL2 * 0.7, shade=False)
            pt.line([(wx, yb - 4), (wx, yb - 4 - wh_)], 4, tone(color, 0.6))
            pt.line([(wx - ww / 2, yb - wh_ * 0.45), (wx + ww / 2, yb - wh_ * 0.45)], 4, tone(color, 0.6))


def townhouse(pt, x0, base, w, h, color=K["townhouse"], floors=3, seed=0, shop=None, trim=K["stone_lt"], line=OL):
    """19th-century terraced town house: cornice, sash windows with lintels, door with steps, chimney pots.
    shop: awning colour for a ground-floor shop front, or None."""
    rng = np.random.default_rng(seed)
    top = base - h
    box(pt, x0 + w * 0.15, top - 50, x0 + w * 0.35, top + 4, tone(color, 0.85), OL2, shade=False)
    for k in range(3):
        box(pt, x0 + w * 0.17 + k * w * 0.06, top - 70, x0 + w * 0.21 + k * w * 0.06, top - 46, (90, 110, 150), OL2 * 0.6,
            shade=False)
    pt.shape(dense(rect(x0, top, x0 + w, base), 50), color, line)
    box(pt, x0 - 10, top - 4, x0 + w + 10, top + 22, trim, OL2, shade=False)
    fh = h / floors
    for f in range(floors):
        yb = base - f * fh
        if f == 0:
            if shop:
                box(pt, x0 + 14, yb - fh * 0.75, x0 + w - 14, yb, (90, 70, 60), OL2)
                box(pt, x0 + 28, yb - fh * 0.66, x0 + w * 0.62, yb - fh * 0.12, (150, 196, 220), OL2 * 0.7, shade=False)
                door(pt, x0 + w * 0.78, yb, w * 0.2, fh * 0.62, "square", K["wood_dk"], bands=False)
                q = [(x0 + 4, yb - fh * 0.8), (x0 + w - 4, yb - fh * 0.8), (x0 + w + 20, yb - fh * 0.6), (x0 - 20, yb - fh * 0.6)]
                pt.shape(q, shop, OL2)
                for k in range(8):
                    a = x0 - 20 + (w + 40) * k / 8
                    pt.shape([(a, yb - fh * 0.6), (a + (w + 40) / 16, yb - fh * 0.54), (a + (w + 40) / 8, yb - fh * 0.6)],
                             shop if k % 2 else (236, 240, 244), OL2 * 0.6, shade=False)
                continue
            door(pt, x0 + w * 0.25, yb - 20, w * 0.22, fh * 0.62, "arch", K["wood_dk"], bands=False)
            for k in range(2):
                box(pt, x0 + w * 0.1 - k * 10, yb - 20 + k * 10, x0 + w * 0.4 + k * 10, yb - 10 + k * 10, trim, OL2 * 0.6,
                    shade=False)
            xs = [x0 + w * 0.7]
        else:
            xs = [x0 + w * 0.25, x0 + w * 0.7]
        for wx in xs:
            ww, wh_ = w * 0.22, fh * 0.5
            yt = yb - fh * 0.75
            box(pt, wx - ww / 2 - 10, yt - 18, wx + ww / 2 + 10, yt, trim, OL2 * 0.7, shade=False)
            box(pt, wx - ww / 2, yt, wx + ww / 2, yt + wh_, (110, 96, 90) if rng.random() < 0.6 else (130, 200, 230), OL2 * 0.7,
                shade=False)
            pt.line([(wx, yt), (wx, yt + wh_)], 5, (236, 240, 244))
            pt.line([(wx - ww / 2, yt + wh_ / 2), (wx + ww / 2, yt + wh_ / 2)], 5, (236, 240, 244))
            box(pt, wx - ww / 2 - 8, yt + wh_, wx + ww / 2 + 8, yt + wh_ + 12, trim, OL2 * 0.6, shade=False)


def lamp_post(pt, x, base, h=330, color=(60, 64, 60), light=False):
    """Victorian gas lamp post standing at (x, base)."""
    if light:
        glow(pt, x, base - h + 30, 160, K["glow"], 0.5)
    pt.shape([(x - 22, base), (x - 12, base - 40), (x + 12, base - 40), (x + 22, base)], color, OL2, shade=False)
    box(pt, x - 6, base - h + 40, x + 6, base - 40, color, OL2 * 0.8, shade=False)
    pt.shape([(x - 26, base - h + 40), (x + 26, base - h + 40), (x + 34, base - h), (x - 34, base - h)],
             (150, 210, 236) if light else (180, 196, 200), OL2, shade=False)
    pt.shape([(x - 40, base - h), (x + 40, base - h), (x, base - h - 30)], color, OL2, shade=False)


def workshop(pt, x0, base, w, h, color=K["wood"], roof=K["slate"], seed=0, line=OL):
    """craftsman's workshop exterior: plank shed with lean-to roof, open double doors, blank sign board, barrels, crates."""
    top = base - h * 0.72
    q = dense(rect(x0, top, x0 + w, base), 50)
    pt.shape(q, color, line)
    clipped(pt, q, lambda: wall(pt, x0, top, x0 + w, base, "planks", color, seed))
    pt.shape(q, None, line)
    pt.shape([(x0 - 40, top + 20), (x0 + w + 40, base - h), (x0 + w + 40, base - h + 40), (x0 - 40, top + 60)], roof, line)
    dx = x0 + w * 0.42
    dw = w * 0.36
    box(pt, dx - dw / 2, base - h * 0.5, dx + dw / 2, base, K["dark"], OL2, shade=False)
    gear(pt, dx - dw * 0.18, base - h * 0.2, h * 0.08, 9, (120, 120, 120))
    pt.shape([(dx - dw / 2, base - h * 0.5), (dx - dw * 0.85, base - h * 0.47), (dx - dw * 0.85, base + 6), (dx - dw / 2, base)],
             tone(color, 1.08), OL2)
    pt.shape([(dx + dw / 2, base - h * 0.5), (dx + dw * 0.85, base - h * 0.47), (dx + dw * 0.85, base + 6), (dx + dw / 2, base)],
             tone(color, 0.95), OL2)
    box(pt, x0 + w * 0.2, top - 10, x0 + w * 0.64, top + 50, K["parchment"], OL2)   # sign board for an overlay label
    window_lattice(pt, x0 + w * 0.74, base - h * 0.5, w * 0.16, h * 0.18, K["wood_dk"], (120, 200, 236), 2, 2)
    barrel(pt, x0 + w * 0.12, base + 6, 80, 110)
    crate(pt, x0 + w * 0.8, base + 6, 90)
    crate(pt, x0 + w * 0.86, base - 84, 64)


def cobbles(pt, x0, x1, y0, y1, color=K["cobble"], seed=0, n=90):
    """sparse cobble outlines on a street, larger toward the viewer."""
    rng = np.random.default_rng(seed)
    for _ in range(n):
        u = rng.uniform(0, 1) ** 0.8
        x, y = rng.uniform(x0, x1), y0 + (y1 - y0) * u
        s = 10 + 26 * u
        pt.line(T.ellipse_pts(x, y, s, s * 0.45, 0, 18, 0.0, 2 * math.pi).tolist() + [(x + s, y)], 2 + 2 * u,
                tone(color, 0.8))


# ================================================================================================ interior plate
def room(w=None, h=None, gy_frac=0.68, wall_kind="plaster", floor_kind="planks", wall_color=None, floor_color=None,
         wall_kw=None, floor_kw=None, base_board=True, wall_depth=0.9, spread=1.8, seed=0):
    """start an interior set: back wall layer ("wall", opaque, depth wall_depth) + floor layer ("floor", 1.0).
    Returns (plate, wall_pt, floor_pt, gy); gy = ground line where the wall meets the floor (characters stand at
    S.ground_y(set) + depth_px). Add windows/hangings to wall_pt, furniture to floor_pt or a new layer
    plate.layer("props", 1.0), then save(name, plate, gy_frac)."""
    w, h = w or PW, h or PH
    gy = h * gy_frac
    pl = Plate(w, h)
    wp = pl.layer("wall", wall_depth, True)
    wall(wp, -20, -20, w + 20, gy + 20, wall_kind, wall_color, seed, **(wall_kw or {}))
    if base_board and wall_kind not in ("shoji", "palace"):
        skirting(wp, -20, w + 20, gy)
    fp = pl.layer("floor", 1.0)
    floor(fp, -20, w + 20, gy, h + 20, floor_kind, floor_color, seed + 1, spread, **(floor_kw or {}))
    return pl, wp, fp, gy


# ================================================================================================ maps
_GEO_CACHE = {}


def load_geo(kind="land"):
    """Natural Earth 1:110m features: kind land | countries (props iso = ADM0_A3 code, name, cont)."""
    if kind not in _GEO_CACHE:
        for d in _GEO_DIRS:
            p = d / f"ne_110m_{kind}.json"
            if p.exists():
                _GEO_CACHE[kind] = json.loads(p.read_text())["features"]
                break
        else:
            raise FileNotFoundError(f"ne_110m_{kind}.json not found in {_GEO_DIRS}")
    return _GEO_CACHE[kind]


def _geo_wobble(ring, amp):
    """deterministic wobble keyed on the coordinates (not on draw order), so two regions sharing an edge wobble
    identically along it and stay seamless."""
    r = np.asarray(ring, float)
    k = np.sin(r[:, 0] * 3.1 + r[:, 1] * 1.7) + np.sin(r[:, 0] * 1.3 - r[:, 1] * 2.9)
    m = np.cos(r[:, 0] * 2.3 - r[:, 1] * 0.7) + np.sin(r[:, 1] * 3.7 + r[:, 0] * 0.5)
    return r + np.stack([k, m], 1) * amp * 0.5


def _polys(geom):
    """GeoJSON geometry -> list of polygons, each a list of rings (first = exterior)."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def fit_bounds(lon0, lat0, lon1, lat1, w, h):
    """grow the lon or lat span so that 1 deg lon = cos(mid lat) deg lat on screen (no stretched coasts)."""
    k = math.cos(math.radians((lat0 + lat1) / 2))
    lon_span, lat_span = lon1 - lon0, lat0 - lat1
    want = w / h
    if lon_span * k / lat_span > want:
        grow = lon_span * k / want - lat_span
        lat0, lat1 = lat0 + grow / 2, lat1 - grow / 2
    else:
        grow = lat_span * want / k - lon_span
        lon0, lon1 = lon0 - grow / 2, lon1 + grow / 2
    return lon0, lat0, lon1, lat1


def map_plate(name, lon0, lat0, lon1, lat1, highlight=None, regions=None, w=None, h=None, fit=True, ground=0.9,
              paper=K["map_paper"], sea=K["map_sea"], land=K["map_land"], grid=None, borders=False, compass=True,
              ripples=3, waves=10, burn=True, coast=4.5, draw=None, smooth_regions=False, seed=0):
    """old-map style plate with real coastlines (Natural Earth 1:110m), saved as set `name` with "proj" in sets.json.

    lon0, lat0 = top-left corner, lon1, lat1 = bottom-right (degrees; west/south negative). fit=True grows one span so
    coasts are not stretched (the saved proj holds the final bounds). highlight = {"FRA": colour, "GBR": colour}
    (ADM0_A3 codes, colour BGR or None for the next REGION_COLORS entry). regions = [(polygon_lonlat, colour), ...]
    custom areas (historic states) clipped to land; a region may also be a dict(poly=, color=, outline=True).
    Region edges stay straight with a slight coordinate-keyed wobble, so neighbours that share vertices meet without
    gaps; smooth_regions=True rounds them with a spline instead (blobby; only for isolated regions).
    grid = lat/lon line step in degrees (None = auto). borders = thin modern country borders. compass = True (auto
    corner), False, or (x, y, r) in plate px. draw(pt, P) adds your own marks; P(lon, lat) -> plate (x, y).
    Returns the layer list from save()."""
    w, h = w or PW, h or PH
    if lat1 > lat0:
        lat0, lat1 = lat1, lat0
    if fit:
        lon0, lat0, lon1, lat1 = fit_bounds(lon0, lat0, lon1, lat1, w, h)
    rng = np.random.default_rng(seed)
    pl = Plate(w, h)
    pt = pl.layer("map", 1.0, True)
    img = pt.img
    Hc, Wc = img.shape[:2]

    def P(lon, lat):
        return ((lon - lon0) / (lon1 - lon0) * w, (lat0 - lat) / (lat0 - lat1) * h)

    def Pa(ring):
        a = np.asarray(ring, float)
        return np.stack([(a[:, 0] - lon0) / (lon1 - lon0) * w, (lat0 - a[:, 1]) / (lat0 - lat1) * h], 1)

    def C(ring):  # canvas px int32 for cv2 (no shift)
        return np.round(Pa(ring) * SS).astype(np.int32)

    def visible(ring, m=0.2):
        a = np.asarray(ring, float)
        dl, dt = (lon1 - lon0) * m, (lat0 - lat1) * m
        return not (a[:, 0].max() < lon0 - dl or a[:, 0].min() > lon1 + dl or a[:, 1].max() < lat1 - dt
                    or a[:, 1].min() > lat0 + dt)

    def mask_of(polys):
        m = np.zeros((Hc, Wc), np.uint8)
        for poly in polys:
            if not visible(poly[0], 1.0):
                continue
            cv2.fillPoly(m, [C(poly[0])], 1)
            for hole in poly[1:]:
                cv2.fillPoly(m, [C(hole)], 0)
        return m

    land_polys = [p for f in load_geo("land") for p in _polys(f["geometry"])]
    landm = mask_of(land_polys)
    img[..., :3] = sea
    img[..., 3] = 255
    # sea: concentric ripple lines along the coasts (old-map style) + a few wave marks
    dist = cv2.distanceTransform((1 - landm).astype(np.uint8), cv2.DIST_L2, 5)
    step = 11 * SS
    for k in range(1, ripples + 1):
        band = np.abs(dist - k * step) < 1.3 * SS
        img[band, :3] = (img[band, :3] * (0.86 + 0.035 * k)).astype(np.uint8)
    img[landm > 0, :3] = land
    dl = cv2.distanceTransform(landm, cv2.DIST_L2, 5)
    inner = (landm > 0) & (dl < 7 * SS)
    img[inner, :3] = (img[inner, :3] * 0.93).astype(np.uint8)
    # highlighted countries and custom regions (flat colours, clipped to land)
    ci = 0
    outlines = []
    countries = load_geo("countries")
    for iso, col in (highlight or {}).items():
        if col is None:
            col = REGION_COLORS[ci % len(REGION_COLORS)]
            ci += 1
        polys = [p for f in countries if f["properties"]["iso"] == iso for p in _polys(f["geometry"])]
        if not polys:
            print("map_plate: unknown country code", iso)
            continue
        m = mask_of(polys) & landm
        img[m > 0, :3] = col
        outlines += [(poly[0], 3.0) for poly in polys if visible(poly[0])]
    region_lines = []
    for reg in regions or []:
        if isinstance(reg, dict):
            poly, col, ol = reg["poly"], reg.get("color"), reg.get("outline", True)
        else:
            poly, col = reg[0], (reg[1] if len(reg) > 1 else None)
            ol = True
        if col is None:
            col = REGION_COLORS[ci % len(REGION_COLORS)]
            ci += 1
        ring = T.crom(poly, True, 6) if smooth_regions and len(poly) > 3 else np.asarray(poly, float)
        if not smooth_regions:   # densify in degrees, wobble ~0.08 deg: hand-drawn but neighbours still meet
            span = max(lon1 - lon0, lat0 - lat1)
            ring = _geo_wobble(dense(ring, span / 120), span * 0.0025)
        m = np.zeros((Hc, Wc), np.uint8)
        cv2.fillPoly(m, [C(ring)], 1)
        m &= landm
        img[m > 0, :3] = col
        if ol:
            region_lines.append(ring)
    # lat/lon grid: multiplicative darkening (works on sea and land)
    if grid is None:
        span = max(lon1 - lon0, lat0 - lat1)
        grid = next(g for g in (2, 5, 10, 15, 20, 30) if span / g <= 8)
    gm = np.zeros((Hc, Wc), np.uint8)
    for lon in np.arange(math.ceil(lon0 / grid) * grid, lon1, grid):
        x = int(P(lon, 0)[0] * SS)
        cv2.line(gm, (x, 0), (x, Hc), 1, int(1.6 * SS))
    for lat in np.arange(math.ceil(lat1 / grid) * grid, lat0, grid):
        y = int(P(0, lat)[1] * SS)
        cv2.line(gm, (0, y), (Wc, y), 1, int(1.6 * SS))
    img[gm > 0, :3] = (img[gm > 0, :3] * 0.88).astype(np.uint8)
    # wave marks in open sea
    far = np.argwhere(dist[::8, ::8] > 60 * SS) * 8
    for i in rng.permutation(len(far))[:waves] if len(far) else []:
        y, x = far[i] / SS
        for dx in (0, 24):
            pt.line(T.ellipse_pts(x + dx, y + 8, 12, 8, 0, 10, math.pi * 1.15, math.pi * 1.85).tolist(), 3,
                    tone(sea, 0.78))
    # borders: thin darker lines of modern countries
    if borders:
        bm = np.zeros((Hc, Wc), np.uint8)
        for f in countries:
            for poly in _polys(f["geometry"]):
                if visible(poly[0]):
                    cv2.polylines(bm, [C(poly[0])], True, 1, int(1.6 * SS), cv2.LINE_AA)
        bm &= landm
        img[bm > 0, :3] = (img[bm > 0, :3] * 0.72).astype(np.uint8)
    # region borders on land only (dashed look via darker colour), then coastlines in ink with wobble
    if region_lines:
        rm = np.zeros((Hc, Wc), np.uint8)
        for ring in region_lines:
            cv2.polylines(rm, [C(ring)], True, 1, int(2.6 * SS), cv2.LINE_AA)
        rm &= cv2.dilate(landm, np.ones((3, 3), np.uint8))
        img[rm > 0, :3] = (img[rm > 0, :3] * 0.55).astype(np.uint8)
    for ring, lw in outlines:
        pt.shape(Pa(ring), None, lw)
    for poly in land_polys:
        if visible(poly[0]) and len(poly[0]) > 3:
            pt.shape(Pa(poly[0]), None, coast)
    if draw:
        draw(pt, P)
    # compass rose
    if compass:
        cx, cy, r = compass if isinstance(compass, tuple) else (w * 0.86, h * 0.76, h * 0.085)
        pt.shape(T.ellipse_pts(cx, cy, r * 0.78, r * 0.78, 0, 60), None, 2.5)
        pt.shape(T.ellipse_pts(cx, cy, r * 0.7, r * 0.7, 0, 60), None, 1.5)
        dark, light = (88, 72, 66), (226, 240, 246)
        for k in range(8):
            a = -math.pi / 2 + k * math.pi / 4
            L = r * (1.0 if k % 2 == 0 else 0.55)
            tip = (cx + L * math.cos(a), cy + L * math.sin(a))
            s1 = (cx + r * 0.16 * math.cos(a - math.pi / 4), cy + r * 0.16 * math.sin(a - math.pi / 4))
            s2 = (cx + r * 0.16 * math.cos(a + math.pi / 4), cy + r * 0.16 * math.sin(a + math.pi / 4))
            col1 = (60, 60, 190) if k == 0 else dark
            pt.shape([(cx, cy), s1, tip], col1, 2, shade=False)
            pt.shape([(cx, cy), tip, s2], light, 2, shade=False)
        nx, ny, s = cx, cy - r * 1.22, r * 0.16
        pt.line([(nx - s, ny + s), (nx - s, ny - s), (nx + s, ny + s), (nx + s, ny - s)], 4, BG_INK)
    # paper: soft blotches + burnt edges (wide enough to survive the camera's crop)
    lo = cv2.resize(rng.uniform(-1, 1, (12, 20)).astype(np.float32), (Wc, Hc), interpolation=cv2.INTER_CUBIC)
    f = img[..., :3].astype(np.float32) * (1 + 0.035 * lo[..., None])
    tint = np.array(paper, np.float32)
    f = f * 0.9 + tint * 0.1
    if burn:
        yy, xx = np.mgrid[0:Hc, 0:Wc].astype(np.float32) / SS
        e = np.minimum(np.minimum(xx, w - xx), np.minimum(yy, h - yy))
        nz = cv2.resize(rng.uniform(-1, 1, (16, 28)).astype(np.float32), (Wc, Hc), interpolation=cv2.INTER_CUBIC)
        bw = 170 if burn is True else float(burn)
        t = np.clip((bw + nz * 45 - e) / bw, 0, 1) ** 1.8
        f = f * (1 - 0.75 * t[..., None]) + np.array(K["burnt"], np.float32) * 0.75 * t[..., None]
    img[..., :3] = np.clip(f, 0, 255).astype(np.uint8)
    return save(name, pl, ground, proj=dict(lon0=lon0, lat0=lat0, lon1=lon1, lat1=lat1))



# ================================================================================================ depth + text kit
# (added 2026-11-09 after comparing with Squire Explains: perspective ground, haze bands, text painted on a set)
_FONT_DIRS = [pathlib.Path(__file__).resolve().parent.parent / "assets" / "fonts",
              pathlib.Path(__file__).resolve().parent.parent.parent / "assets" / "fonts"]


def font_path(name="LilitaOne-Regular.ttf"):
    """a font from the project's / skill's assets/fonts (or an absolute path)."""
    if pathlib.Path(name).is_absolute():
        return name
    for d in _FONT_DIRS:
        if (d / name).exists():
            return str(d / name)
    raise FileNotFoundError(name)


def ptext(pt, text, x, y, size, color=(30, 26, 24), font="LilitaOne-Regular.ttf", rot=0.0, anchor="lm", alpha=1.0,
          spacing=1.0):
    """text painted on a plate layer (signs, labels on a map, handwriting on a note). anchor: PIL-style 2 letters
    (l/m/r + t/m/b) for (x, y); rot = degrees counter-clockwise; font = file in assets/fonts or an absolute path."""
    from PIL import Image, ImageDraw, ImageFont
    s = SS
    f = ImageFont.truetype(font_path(font), int(size * s))
    lines = text.split("\n")
    lh = int(size * s * 1.18 * spacing)
    wmax = max(int(f.getlength(l)) for l in lines) + 8 * s
    im = Image.new("RGBA", (wmax, lh * len(lines) + 8 * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, l in enumerate(lines):
        d.text((4 * s, 4 * s + i * lh), l, font=f, fill=(color[2], color[1], color[0], int(255 * alpha)))
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    a = np.asarray(im).astype(np.float32) / 255
    x0 = int(x * s - {"l": 0, "m": 0.5, "r": 1}[anchor[0]] * a.shape[1])
    y0 = int(y * s - {"t": 0, "m": 0.5, "b": 1}[anchor[1]] * a.shape[0])
    H, W = pt.img.shape[:2]
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + a.shape[1], W), min(y0 + a.shape[0], H)
    if xa >= xb or ya >= yb:
        return
    src = a[ya - y0:yb - y0, xa - x0:xb - x0]
    al = src[..., 3:4]
    dst = pt.img[ya:yb, xa:xb].astype(np.float32)
    dst[..., :3] = dst[..., :3] * (1 - al) + src[..., [2, 1, 0]] * 255 * al
    dst[..., 3:4] = np.maximum(dst[..., 3:4], al * 255)
    pt.img[ya:yb, xa:xb] = dst.astype(np.uint8)


def furrows(pt, vp, gy, h, n=22, color=(0, 0, 0), width=4.0, spread=2.6, x_rows=0, seed=0):
    pass



def fog(pl, name, depth, y0, y1, color=(236, 240, 242), peak=0.75, seed=0):
    """DEPTH: a semi-transparent haze band as its own plate layer (alpha 0 at y0 / y1, `peak` in the middle, lightly
    lumpy) - put it between far and near layers so distant things fade."""
    L = pl.layer(name, depth)
    H, W = L.img.shape[:2]
    s = H / pl.h
    ys = np.arange(H)[:, None] / s
    u = np.clip((ys - y0) / max(y1 - y0, 1), 0, 1)
    a = np.sin(u * math.pi) ** 0.8 * peak
    rng = np.random.default_rng(seed)
    noise = cv2.GaussianBlur(rng.uniform(0.75, 1.0, (H // 40 + 1, W // 40 + 1)).astype(np.float32), (0, 0), 1.2)
    noise = cv2.resize(noise, (W, H), interpolation=cv2.INTER_CUBIC)
    L.img[..., :3] = color
    L.img[..., 3] = np.clip(a * noise * 255, 0, 255).astype(np.uint8)
    return L


def tipi(pt, x, base, s, col=(196, 222, 232), seed=0):
    """a plain Plains conical lodge with its poles crossing above the top and a door flap (drawn simply)."""
    top = base - s * 1.15
    for dx in (-0.16, -0.05, 0.07, 0.17):
        pt.line([(x + dx * s * 0.3, top + s * 0.08), (x + dx * s, top - s * 0.22)], max(2.0, s * 0.045), (60, 80, 110))
    pt.shape(dense([(x - s * 0.52, base), (x - s * 0.06, top), (x + s * 0.06, top), (x + s * 0.52, base)], 14),
             col, max(2.5, s * 0.06))
    pt.shape(T.ellipse_pts(x, base - s * 0.14, s * 0.11, s * 0.16, 0, 20, math.pi, 2 * math.pi), tone(col, 0.55),
             max(2.0, s * 0.045), shade=False)
