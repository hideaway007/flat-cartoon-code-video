"""Marble bust rig (flat-cartoon-code-video library): a talking classical bust on a plinth - the narrator / teacher
character of F in History. Drawn by toon.draw_character when a design has rig="bust", so it is an ordinary toon
layer: S.toon(BUST, pos, scale, keys, talk=...) with tweened keys, mouth flaps, motions, idle sway, flip, --check.

Design keys (bust.design(**kw); colours BGR)
  marble, marble_dk     stone colour and its fold / fluting lines
  plinth                True: stands on a fluted plinth (origin = bottom of the plinth, on the ground line);
                        False: the bust alone (origin = bottom of the chest cut) for a shelf, desk or close-up
  plaque                plaque colour on the plinth (None = no plaque); joints["plaque"] is its centre for a label
  wreath, wreath_col    "laurel" | "none"
  curls                 classical curls round the crown and over the forehead
  head_rx, head_ry      egg head radii (same as the cast)
Pose fields used (toon.DEFAULT_POSE): facing f | r | b, head, head_dy, lean (whole bust rocks on its plinth), eyes,
look, brows, mouth, mopen, sweat, crack (0..1 a crack runs across the forehead - the "losing patience" tell).
Arm, hand, feet and prop fields are ignored: the bust has no hands, so grading happens in overlays (stamp,
report_card, circle, counter).
Size: ~1240 units tall with the plinth (Joe ~1060), ~800 without. Joints: head, plaque, top (plinth top), base.
"""
import math
import numpy as np
import toon as TN
from toon import LINE, WHITE, INK, ellipse_pts, rot, crom

MARBLE = (236, 238, 238)
MARBLE_DK = (196, 200, 204)
PLAQUE = (60, 150, 200)
LAUREL = (70, 136, 70)
BOX = (-430, -1330, 430, 40)            # drawing box (units) with the plinth; bust alone is smaller


def design(**kw):
    d = dict(name="bust", rig="bust", marble=MARBLE, marble_dk=MARBLE_DK, plinth=True, plaque=PLAQUE,
             wreath="laurel", wreath_col=LAUREL, curls=True, head_rx=152, head_ry=176,
             # keys the generic tools expect on every design (unused by the bust)
             jacket=MARBLE, jacket_dk=MARBLE_DK, trousers=MARBLE, boots=MARBLE, hair=MARBLE, hair_dk=MARBLE_DK,
             rope=(32, 132, 240), leg_u=135, leg_l=130, torso=270, style="none")
    d.update(kw)
    return d


TEACHER = design(name="teacher")       # F in History's teacher


def _truncate(p, frac):
    p = np.asarray(p, float)
    if frac >= 1:
        return p
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    L = d[-1] * max(frac, 0.0)
    k = int(np.searchsorted(d, L))
    if k <= 0:
        return p[:1]
    a = (L - d[k - 1]) / max(d[k] - d[k - 1], 1e-9)
    return np.vstack([p[:k], p[k - 1] + (p[k] - p[k - 1]) * a])


def draw(pt, D, p, idle=(0.0, 0.0)):
    """draw the bust in pose p into a toon.Painter (character units, origin = bottom centre, y down)."""
    fac = p["facing"]
    k = 1 if fac == "r" else 0
    back = fac == "b"
    mar, mdk = D.get("marble", MARBLE), D.get("marble_dk", MARBLE_DK)
    plinth = D.get("plinth", True)
    oy = 0.0 if plinth else 440.0            # bust alone: shift everything down so its chest cut sits on y = 0
    joints = {"base": np.array([0.0, 0.0])}

    # ---------------- plinth (does not rock)
    top = -440.0 + oy
    if plinth:
        pt.shape([(-250, 0), (250, 0), (250, -70), (-250, -70)], mdk)
        pt.shape([(-175, -70), (175, -70), (165, -380), (-165, -380)], mar)
        for x in (-110, -40, 40, 110):
            pt.line([(x, -95), (x * 0.97, -360)], LINE * 0.45, mdk)
        pt.shape([(-225, -380), (225, -380), (225, -440), (-225, -440)], mdk)
        if D.get("plaque") is not None and not back:
            pt.shape([(-120, -250), (120, -250), (120, -180), (-120, -180)], D["plaque"], LINE * 0.7, shade=False)
            joints["plaque"] = np.array([0.0, -215.0])
    joints["top"] = np.array([0.0, top])

    # everything above rocks with `lean` about the plinth top
    lean = math.radians(p["lean"])

    def U(pts):
        return rot(np.asarray(pts, float) + (0, oy), lean, (0, top))

    # ---------------- chest, toga, neck
    hx = 14 * k
    sx = 270
    body = [(-200, -450), (-sx + 20, -560), (-sx, -690), (-210, -760), (-80, -790), (hx, -800), (80, -790),
            (210, -760), (sx, -690), (sx - 20, -560), (200, -450), (0, -470)]
    pt.blob(U(body), mar, n=10)
    if not back:
        pt.blob(U([(-sx + 10, -690), (-200, -770), (-120, -760), (40, -560), (10, -470), (-120, -480)]), mar,
                LINE * 0.8, n=8)
        for f in (0.0, 0.33, 0.66):
            pt.line(U(crom([(-160 + 80 * f, -700 + 60 * f), (-40 + 120 * f, -600 + 40 * f), (60 + 90 * f, -480)],
                           False, 8)), LINE * 0.5, mdk)
    pt.shape(U([(-74 + hx, -790), (74 + hx, -790), (68 + hx, -836), (-68 + hx, -836)]), mar)

    # ---------------- head
    rx, ry = D.get("head_rx", 152), D.get("head_ry", 176)
    hd = math.radians(p["head"] + 0.6 * idle[1])
    hc_l = np.array([hx, -836 - ry + 58 + p["head_dy"]])
    hc = U([hc_l])[0]
    ha = lean + hd

    def H(pts):
        return rot(np.asarray(pts, float), ha) + hc

    t = np.linspace(0, 2 * math.pi, 72, endpoint=False)
    egg = np.stack([rx * np.cos(t) * (1 + 0.06 * np.sin(t)), ry * np.sin(t) - 6 * np.sin(t) ** 2 * (np.sin(t) > 0)], 1)
    curls = D.get("curls", True)
    if curls:   # curls behind the crown
        ring = [(-rx * 0.98, -ry * 0.25), (-rx * 0.9, -ry * 0.6), (-rx * 0.62, -ry * 0.88), (-rx * 0.25, -ry * 1.02),
                (rx * 0.15, -ry * 1.04), (rx * 0.52, -ry * 0.92), (rx * 0.84, -ry * 0.66), (rx * 0.98, -ry * 0.3)]
        for i, (x, y) in enumerate(ring):
            pt.ell(*H([(x, y)])[0], 44, 40, mar, LINE * 0.8, ang=0.3 * i)
    pt.shape(H(egg), WHITE)
    if back:
        if curls:   # the back of the head is all curls: overlapping rows, top row first
            for j, yy in enumerate(np.linspace(-ry * 0.82, ry * 0.18, 5)):
                half = rx * 0.9 * math.sqrt(max(0.0, 1 - (yy / ry) ** 2))
                n = max(2, int(2 * half / 58) + 1)
                for x in np.linspace(-half + 26, half - 26, n) + (j % 2) * 12:
                    c = H([(x, yy)])[0]
                    pt.ell(*c, 38, 34, mar, LINE * 0.6, ang=0.4 * j)
                    pt.line(H([(x - 14, yy + 6), (x - 4, yy - 10), (x + 12, yy - 4), (x + 6, yy + 8)]), LINE * 0.4,
                            mdk, smooth=True)
    else:
        if curls:   # fringe over the forehead
            for x in np.linspace(-rx * 0.7, rx * 0.7, 6):
                y = -ry * 0.78 + 0.25 * ry * (x / rx) ** 2
                pt.ell(*H([(x + 10 * k, y)])[0], 30, 26, mar, LINE * 0.7)
                pt.line(H([(x + 10 * k - 10, y + 2), (x + 10 * k + 4, y - 8), (x + 10 * k + 14, y + 4)]),
                        LINE * 0.45, mdk, smooth=True)
        TN.face(pt, H, p, 34 * k, rx, ry, None)
    # laurel wreath: two branches from the sides of the head up to the crown
    if D.get("wreath", "laurel") == "laurel":
        leaf = np.array([[0, 0], [28, -17], [62, 0], [28, 17]], float)
        col = D.get("wreath_col", LAUREL)
        for s in (-1, 1):
            for i in range(7):
                u = i / 6
                th = math.radians(-8 - 70 * u)
                x, y = s * rx * math.cos(th), ry * 0.98 * math.sin(th) - 10
                tang = math.atan2(-(ry * math.cos(th)), -s * rx * math.sin(th))
                q = rot(leaf, tang + (0.5 if i % 2 else -0.5)) + (x, y)
                pt.blob(H(q), col, LINE * 0.6, n=4, shade=False)
    # crack across the forehead, growing with p["crack"]
    cr = float(p.get("crack", 0.0))
    if cr > 0.02 and not back:
        path = crom([(rx * 0.62, -ry * 0.9), (rx * 0.42, -ry * 0.64), (rx * 0.6, -ry * 0.5), (rx * 0.36, -ry * 0.26),
                     (rx * 0.52, -ry * 0.1), (rx * 0.38, ry * 0.02)], False, 4)
        q = _truncate(path, cr)
        if len(q) > 1:
            pt.line(H(q), LINE * 0.75)
        if cr > 0.55:   # a short branch
            b = _truncate([(rx * 0.6, -ry * 0.5), (rx * 0.78, -ry * 0.44), (rx * 0.86, -ry * 0.3)], (cr - 0.55) / 0.45)
            if len(b) > 1:
                pt.line(H(b), LINE * 0.6)
    if p["sweat"] > 0.05 and not back:
        s = min(p["sweat"], 1.0)
        pt.blob(H([(rx * 0.95, -ry * 0.45), (rx * 0.95 + 22 * s, -ry * 0.1), (rx * 0.95, -ry * 0.0 + 10 * s),
                   (rx * 0.95 - 22 * s, -ry * 0.1)]), (235, 190, 120), LINE * 0.7, n=6)
    if not back:
        TN.head_marks(pt, H, p, rx, ry, 34 * k, None)   # extra sweat drops (sweat > 1), anger vein
    joints["head"] = hc
    # stand-ins so generic code that asks for hands/feet still gets a point
    for key in ("handL", "handR", "footL", "footR", "hip"):
        joints[key] = np.array([0.0, top])
    return joints


if __name__ == "__main__":   # sheet: python bust.py -> production/review/bust.jpg (expressions, facings, sizes)
    import pathlib, cv2
    import poses as PO
    ROOT = pathlib.Path(__file__).resolve().parent.parent
    items = [("rest", PO.rest()), ("lecture", PO.explain()), ("unimpressed", PO.unimpressed()),
             ("smug", PO.smug()), ("outraged", PO.outraged()), ("shock", PO.shock()), ("gulp", PO.gulp()),
             ("side talk", PO.rest_side(mouth="talk", mopen=0.7)), ("back", PO.back()),
             ("rocked", PO.outraged(lean=-8)), ("no plinth", PO.unimpressed())]
    cw, ch, sc = 330, 680, 0.42
    frame = np.full((ch, cw * len(items), 3), 0.86, np.float32)
    for i, (n, p) in enumerate(items):
        D = design(plinth=False) if n == "no plinth" else TEACHER
        TN.render_char(frame, D, p, [[sc, 0, i * cw + cw / 2], [0, sc, ch - 70 - (120 if n == "no plinth" else 0)]])
    img = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
    for i, (n, _) in enumerate(items):
        cv2.putText(img, n, (i * cw + 10, ch - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 30, 30), 2)
    out = ROOT / "production" / "review" / "bust.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(out)
