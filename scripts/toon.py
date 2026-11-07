"""Code-drawn flat cartoon characters: no image generation. (flat-cartoon-code-video skill library)

Characters are vector rigs drawn every frame (OpenCV polygons at SUPERSAMPLE x, then area-downsampled = antialiased).
Style: uniform near-black marker outline, flat fills, egg-shaped white head, dot eyes, mitten hands, stubby body.

Character space: units ~ 1000 = Joe's height, y DOWN, origin = midpoint between the feet on the ground.
Poses are dicts (see DEFAULT_POSE); numeric fields tween, discrete fields (eyes, mouth, hands, facing) switch at the
middle of a tween. Limbs are 2-bone IK: you give hand targets (relative to the shoulder, in the torso frame) and
foot positions (on the ground), the elbows/knees are solved.
"""
import math
import numpy as np, cv2

SS = 3                                   # supersampling factor
INK = (30, 24, 26)                       # BGR near-black outline
WHITE = (250, 250, 250)
MOUTH = (48, 34, 110)                    # dark maroon mouth interior
TONGUE = (95, 95, 215)
LINE = 11.0                              # outline width, character units


# ----------------------------------------------------------------------------------------------- geometry helpers
def crom(pts, closed=True, n=10):
    """Catmull-Rom spline through pts -> dense polyline."""
    p = np.asarray(pts, np.float64)
    m = len(p)
    out = []
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0, p1 = p[(i - 1) % m] if closed or i > 0 else p[0], p[i]
        p2 = p[(i + 1) % m]
        p3 = p[(i + 2) % m] if closed or i + 2 < m else p[-1]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(p[-1])
    return np.array(out)


def ellipse_pts(cx, cy, rx, ry, ang=0.0, n=48, a0=0.0, a1=2 * math.pi):
    t = np.linspace(a0, a1, n, endpoint=(a1 - a0) < 2 * math.pi - 1e-6)
    x, y = rx * np.cos(t), ry * np.sin(t)
    c, s = math.cos(ang), math.sin(ang)
    return np.stack([cx + c * x - s * y, cy + s * x + c * y], 1)


def rot(p, ang, about=(0, 0)):
    p = np.asarray(p, np.float64) - about
    c, s = math.cos(ang), math.sin(ang)
    return np.stack([c * p[..., 0] - s * p[..., 1], s * p[..., 0] + c * p[..., 1]], -1) + about


def ik2(root, target, l1, l2, bend):
    """2-bone IK. bend=+1/-1 picks the side of the joint. Returns (joint, end)."""
    root, target = np.asarray(root, float), np.asarray(target, float)
    d = target - root
    dist = float(np.hypot(*d))
    dist = min(max(dist, abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999)
    a = math.atan2(d[1], d[0])
    cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    al = math.acos(max(-1, min(1, cosA)))
    joint = root + l1 * np.array([math.cos(a + bend * al), math.sin(a + bend * al)])
    end = root + dist * np.array([math.cos(a), math.sin(a)])
    return joint, end


# ----------------------------------------------------------------------------------------------- painter
class Painter:
    """Draws character-space shapes onto a BGRA uint8 canvas through a 2x3 affine (char units -> canvas px)."""

    def __init__(self, w, h, A, wobble=1.6, shade=0.17, shade_d=30.0, min_shade=55.0, ink=INK, seed=0):
        """wobble: hand-drawn line wobble (units); shade: strength of the one soft shade on the side away from the
        light (upper-left); shade_d: width of that shade band (units); shapes smaller than min_shade get none."""
        self.img = np.zeros((h, w, 4), np.uint8)
        self.A = np.asarray(A, np.float64)
        self.s = math.sqrt(abs(np.linalg.det(self.A[:, :2])))
        self.wob, self.sh, self.sh_d, self.min_sh, self.ink, self.seed = wobble, shade, shade_d, min_shade, ink, seed
        self.k = 0

    def P(self, pts):
        pts = np.asarray(pts, np.float64).reshape(-1, 2)
        return np.round((pts @ self.A[:, :2].T + self.A[:, 2]) * 4).astype(np.int32)  # shift=2 subpixel

    def lw(self, w):
        return max(1, int(round(w * self.s)))

    def _wobble(self, pts):
        """stable per-shape wobble: seeded by draw order, so it does not boil between frames."""
        pts = np.asarray(pts, np.float64).reshape(-1, 2)
        self.k += 1
        if not self.wob or len(pts) < 6:
            return pts
        rng = np.random.default_rng(self.k * 7919 + self.seed)
        n = len(pts)
        m = max(4, n // 5)
        noise = np.interp(np.arange(n), np.linspace(0, n - 1, m), rng.uniform(-1, 1, m))
        d = np.roll(pts, -1, 0) - np.roll(pts, 1, 0)
        nrm = np.stack([-d[:, 1], d[:, 0]], 1) / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-6)
        return pts + nrm * noise[:, None] * self.wob

    def _shade(self, q, draw_mask, size_units):
        """darken a soft band along the lower-right inside of the shape just drawn (light from the upper-left)."""
        if not self.sh or size_units < self.min_sh:
            return
        pad = 4
        x0, y0 = max(int(q[:, 0].min() // 4) - pad, 0), max(int(q[:, 1].min() // 4) - pad, 0)
        x1 = min(int(q[:, 0].max() // 4) + pad, self.img.shape[1])
        y1 = min(int(q[:, 1].max() // 4) + pad, self.img.shape[0])
        if x1 - x0 < 4 or y1 - y0 < 4:
            return
        m = np.zeros((y1 - y0, x1 - x0), np.uint8)
        draw_mask(m, np.array([x0 * 4, y0 * 4], np.int32))
        d = self.sh_d * self.s
        ox, oy = max(1, int(d * 0.5)), max(1, int(d * 0.85))
        sh = np.zeros_like(m)
        sh[:-oy or None, :-ox or None] = m[oy:, ox:]
        band = ((m > 0) & (sh == 0)).astype(np.float32)
        band = cv2.GaussianBlur(band, (0, 0), max(d * 0.18, 1.0)) * (m > 0)
        reg = self.img[y0:y1, x0:x1, :3].astype(np.float32)
        self.img[y0:y1, x0:x1, :3] = (reg * (1 - self.sh * band[..., None])).astype(np.uint8)

    def shape(self, pts, fill, line=LINE, closed=True, shade=True):
        q = self.P(self._wobble(pts))
        if fill is not None:
            cv2.fillPoly(self.img, [q], (*fill, 255), cv2.LINE_8, 2)
            if shade and fill != self.ink:
                span = (q.max(0) - q.min(0)).min() / 4 / max(self.s, 1e-6)
                self._shade(q, lambda m, off: cv2.fillPoly(m, [q - off], 1, cv2.LINE_8, 2), span)
        if line:
            cv2.polylines(self.img, [q], closed, (*self.ink, 255), self.lw(line), cv2.LINE_8, 2)

    def blob(self, pts, fill, line=LINE, n=10, shade=True):
        self.shape(crom(pts, True, n), fill, line, shade=shade)

    def ell(self, cx, cy, rx, ry, fill, line=LINE, ang=0.0, shade=True):
        self.shape(ellipse_pts(cx, cy, rx, ry, ang), fill, line, shade=shade)

    def stroke(self, pts, color, width, line=LINE, smooth=False, shade=True):
        """thick round-capped stroke with an outline (sleeves, legs, ropes)."""
        pts = crom(pts, False, 8) if smooth and len(pts) > 2 else np.asarray(pts, float)
        q = self.P(pts)
        self.k += 1
        if line:
            cv2.polylines(self.img, [q], False, (*self.ink, 255), self.lw(width + 2 * line), cv2.LINE_8, 2)
        cv2.polylines(self.img, [q], False, (*color, 255), self.lw(width), cv2.LINE_8, 2)
        if shade:
            lw = self.lw(width)
            box = np.vstack([q.min(0) - lw * 4, q.max(0) + lw * 4]).astype(np.int32)
            self._shade(box, lambda m, off: cv2.polylines(m, [q - off], False, 1, lw, cv2.LINE_8, 2), width)

    def line(self, pts, width=LINE * 0.8, color=None, smooth=False):
        pts = crom(pts, False, 8) if smooth and len(pts) > 2 else pts
        q = self.P(self._wobble(pts) if len(pts) >= 6 else pts)
        cv2.polylines(self.img, [q], False, (*(color or self.ink), 255), self.lw(width), cv2.LINE_8, 2)

    def dot(self, cx, cy, r, color=INK):
        self.shape(ellipse_pts(cx, cy, r, r, n=24), color, line=0)


def composite(frame, canvas, x0, y0):
    """canvas: BGRA uint8 at SS x, top-left at screen (x0, y0). Premultiplied over (transparent pixels are 0)."""
    h, w = canvas.shape[:2]
    small = cv2.resize(canvas, (w // SS, h // SS), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    H, W = frame.shape[:2]
    sh, sw = small.shape[:2]
    fx0, fy0 = max(x0, 0), max(y0, 0)
    fx1, fy1 = min(x0 + sw, W), min(y0 + sh, H)
    if fx0 >= fx1 or fy0 >= fy1:
        return
    c = small[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0]
    a = c[..., 3:4]
    frame[fy0:fy1, fx0:fx1] = frame[fy0:fy1, fx0:fx1] * (1 - a) + c[..., :3]


# ----------------------------------------------------------------------------------------------- characters
# A character design is a dict (see the project's production/cast.py). Keys:
#   jacket, jacket_dk, trousers, boots, hair, hair_dk, harness, rope, pack: BGR colours
#   puffy: quilted down jacket (scalloped sides, quilt lines) or a plain jacket with a zip
#   leg_u, leg_l, torso: lengths in units (Joe: 135, 130, 270 -> ~1060 units tall with hair)
#   head_rx, head_ry: egg head radii; style: "messy" (big wavy hair) or "beanie" (knit hat + tufts, needs `hat` colour)
# New hair styles / hats / costume pieces: add a branch in hair() or draw_character() here.
# Costume parts (garment, headwear, cape, beard, ... see costumes.py) are drawn by costumes.py; a design without any
# of those keys takes exactly the original drawing path (Joe/Simon render pixel-identically).
COSTUME_KEYS = ("garment", "headwear", "cape", "legwear", "footwear", "moustache", "beard", "quiver", "sleeves",
                "heraldry", "badge", "lashes")


def uses_costumes(D, p=None):
    """True when the design (or the pose's held props) needs costumes.py."""
    if any(D.get(k) not in (None, "none") for k in COSTUME_KEYS) or D.get("style") not in ("messy", "beanie"):
        return True
    return p is not None and (p.get("heldL", "none") != "none" or p.get("heldR", "none") != "none")

DEFAULT_POSE = dict(
    facing="f",            # f front, r three-quarter facing screen-right, b back view (mirror with layer flip)
    hip=(0.0, 0.0),        # hip offset from rest
    lean=0.0,              # torso lean (deg, + = toward facing direction / forward)
    head=0.0,              # head tilt (deg)
    head_dy=0.0,           # head raise (- = up), e.g. looking up
    feet=(-62.0, 62.0),    # foot x positions (screen-left foot, screen-right foot)
    lift=(0.0, 0.0),       # foot lift (units, + = up)
    hL=(-40.0, 250.0),     # screen-left hand target, relative to the left shoulder, torso frame
    hR=(40.0, 250.0),
    handL="mitt", handR="mitt",   # mitt / fist / two / open / point
    eyes="dot",            # dot / wide / closed / squint / half / up
    look=(0.0, 0.0),       # pupil offset
    brows=(0.0, 0.0),      # (tilt deg: + = worried/raised inner, - = angry), raise units
    mouth="smile",         # smile / grin / open / shout / flat / grit / gulp / talk
    mopen=0.5,             # mouth openness for open/talk
    sweat=0.0,             # 0..1 sweat drop size
    prop="none",           # none / coil_chest / coil_shoulder / pack
    coil=(0.0, 0.0, 1.0),  # coil_chest offset (dx, dy) and scale
    heldL="none",          # prop in the screen-left hand (costumes.HELD: sword, spear, bow, shield_kite, torch ...)
    heldR="none",          # prop in the screen-right hand
    rotL=0.0,              # extra prop angle (deg) in the left hand: 0 = points forward (screen-right) when the
    rotR=0.0,              #   forearm hangs down, -90 = up; the prop turns with the forearm (shields stay upright)
    fixL=0.0,              # 0..1: 1 = the left prop keeps the angle rotL in the torso frame (0 forward, -90 up,
    fixR=0.0,              #   90 down) whatever the forearm does; tweens smoothly between the two modes
)

NUMERIC = [k for k, v in DEFAULT_POSE.items() if isinstance(v, (int, float, tuple))]


def blend(a, b, u):
    """tween pose a -> b (u 0..1). Discrete fields switch at u=0.5."""
    out = {}
    for k in DEFAULT_POSE:
        va, vb = a.get(k, DEFAULT_POSE[k]), b.get(k, DEFAULT_POSE[k])
        if isinstance(va, tuple):
            out[k] = tuple(x + (y - x) * u for x, y in zip(va, vb))
        elif isinstance(va, (int, float)) and not isinstance(va, bool):
            out[k] = va + (vb - va) * u
        else:
            out[k] = vb if u >= 0.5 else va
    return out


def pose(**kw):
    p = dict(DEFAULT_POSE)
    p.update(kw)
    return p


def draw_character(pt: Painter, D, p, idle=(0.0, 0.0)):
    """Draw design D in pose p. idle = (breathe 0..1 scale, head sway deg). Returns dict of joint positions
    (char space) e.g. 'handL', 'handR' for ropes (+ 'gripL'/'tipL' etc. for held props)."""
    fac = p["facing"]
    k = 1 if fac == "r" else 0                      # three-quarter amount
    back = fac == "b"
    boot_h = 72
    leg_rest = D["leg_u"] + D["leg_l"]
    hip = np.array([0.0 + p["hip"][0], -(boot_h + leg_rest * 0.96) + p["hip"][1]])
    lean = math.radians(p["lean"])
    breathe = 1 + 0.012 * idle[0]
    T = D["torso"] * breathe

    def up(v):  # torso frame (rotated by lean about the hip) -> char space
        return rot(np.asarray(v, float) + hip, lean, hip)

    puffy = D.get("puffy", False)
    sh_w = 132 if puffy else 118
    shoulderL = up((-sh_w + 18 * k, -T + 40))
    shoulderR = up((sh_w - 26 * k, -T + 40))
    neck = up((10 * k, -T - 4))
    joints = {}
    C = None                                        # costume context (only for designs/poses that need it)
    if uses_costumes(D, p):
        import costumes as CO
        C = CO.Ctx(pt, D, p, k, fac, T, hip, lean, up, sh_w, joints)
    newg = C is not None and C.garment not in ("puffy", "zip")

    if C is not None and not back:
        CO.behind_body(C)                           # cape, quiver (behind legs and torso)

    # ---------------- legs (IK from hip to feet)
    def leg(side):
        fx = p["feet"][0 if side < 0 else 1]
        lift = p["lift"][0 if side < 0 else 1]
        hj = hip + np.array([side * 52, 0.0])
        ankle = np.array([fx, -boot_h + 8 - lift])
        bend = 1 if (fac == "r") else (-side if fac == "f" else side)  # knees forward in 3/4, outward in front
        if fac == "r":
            bend = -1
        knee, ank = ik2(hj, ankle, D["leg_u"], D["leg_l"], bend)
        if C is not None:
            C.legs[side] = (hj, knee, ank)
            CO.leg(C, side, hj, knee, ank)
            return hj, knee
        pt.stroke([hj, knee, ank], D["trousers"], 96, line=LINE)
        # boot
        toe = 1 if fac == "r" else (side * 0.35 if fac == "f" else side * 0.15)
        bx, by = ank[0], ank[1] + 28
        boot = [(bx - 52 + 20 * min(toe, 0), by - 42), (bx + 40 + 50 * max(toe, 0) * 0.6, by - 34),
                (bx + 62 + 62 * max(toe, 0), by + 4), (bx + 58 + 60 * max(toe, 0), by + 36),
                (bx - 58 + 60 * min(toe, 0), by + 36), (bx - 62 + 30 * min(toe, 0), by - 4)]
        if back:
            boot = [(bx - 56, by - 40), (bx + 56, by - 40), (bx + 60, by + 36), (bx - 60, by + 36)]
        pt.blob(boot, D["boots"], n=6)
        pt.line([(bx - 56 + 50 * min(toe, 0), by + 18), (bx + 56 + 58 * max(toe, 0), by + 18)], LINE * 0.7)
        joints["foot" + ("L" if side < 0 else "R")] = np.array([bx, 0.0])
        return hj, knee

    legs = [leg(-1), leg(1)]
    # harness leg loops
    if D.get("harness") is not None and not newg:
        for hj, knee in legs:
            d = knee - hj
            c = hj + d * 0.32
            ang = math.atan2(d[1], d[0]) + math.pi / 2
            pt.ell(c[0], c[1], 58, 15, D["harness"], LINE * 0.8, ang)

    # ---------------- arms: helper
    def arm(side, draw=True):
        sh = shoulderL if side < 0 else shoulderR
        tgt = p["hL"] if side < 0 else p["hR"]
        target = up(np.asarray(tgt) + (np.array([-sh_w + 18 * k, -T + 40]) if side < 0
                                       else np.array([sh_w - 26 * k, -T + 40])))
        # elbows hang down (and outward in front/back views): pick the IK solution that scores best
        out = 0.3 * side if fac != "r" else 0.0
        cands = [ik2(sh, target, 150, 140, b) for b in (1, -1)]
        elbow, wrist = max(cands, key=lambda c: (c[0][1] - sh[1]) + 0.8 * out * (c[0][0] - sh[0]))
        joints["hand" + ("L" if side < 0 else "R")] = wrist
        if not draw:
            return sh, elbow, wrist
        kind = p["handL" if side < 0 else "handR"]
        if C is not None:
            kind = CO.arm(C, side, sh, elbow, wrist, kind, lambda a, kd: hand(wrist, a, kd, side))
            return
        pt.stroke([sh, elbow, wrist], D["jacket"], 84 if D["puffy"] else 74, line=LINE)
        if D["puffy"]:  # sleeve quilting
            for f in (0.45, 1.4):
                a0, a1 = (sh, elbow) if f < 1 else (elbow, wrist)
                c = a0 + (a1 - a0) * (f if f < 1 else f - 1)
                d = a1 - a0
                n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-6)
                pt.line([c - n * 30, c + n * 30], LINE * 0.6)
        hand(wrist, math.atan2(*(wrist - elbow)[::-1]), kind, side)

    def hand(c, ang, kind, side):
        def R(pts):
            return rot(np.asarray(pts, float), ang) + c
        if kind == "fist":
            pt.ell(c[0], c[1], 36, 34, WHITE, LINE, ang)
        elif kind == "two":
            for da in (-0.32, 0.12):
                tip = c + 80 * np.array([math.cos(ang + da - side * 0.0), math.sin(ang + da)])
                pt.stroke([c, tip], WHITE, 26, LINE)
            pt.ell(*(c + 6 * np.array([math.cos(ang), math.sin(ang)])), 34, 32, WHITE, LINE, ang)
        elif kind == "open":
            pt.blob(R([(-10, -38), (34, -40), (52, -10), (48, 26), (16, 40), (-18, 30)]), WHITE, n=6)
            pt.blob(R([(-6, -30), (14, -62), (32, -58), (24, -26)]), WHITE, n=5)
        elif kind == "point":
            pt.stroke([c, c + 82 * np.array([math.cos(ang), math.sin(ang)])], WHITE, 26, LINE)
            pt.ell(c[0], c[1], 36, 33, WHITE, LINE, ang)
        else:  # mitt
            pt.ell(*(c + 8 * np.array([math.cos(ang), math.sin(ang)])), 40, 34, WHITE, LINE, ang)
            th = c + 28 * np.array([math.cos(ang - side * 1.1), math.sin(ang - side * 1.1)])
            pt.ell(th[0], th[1], 18, 13, WHITE, LINE, ang - side * 1.1)

    if C is not None:   # both arms' geometry first (two-hand props: bow string, open scroll)
        for s in (-1, 1):
            C.set_arm(s, *arm(s, draw=False))

    # far arm behind the torso in 3/4 view
    if fac == "r":
        arm(1)

    # ---------------- rope coil over the shoulder (behind front arm)
    if p["prop"] == "coil_shoulder":
        side = -1 if fac != "b" else 1
        c = up((side * -10 + 10, -T * 0.5))
        coil(pt, c, 116, 168, math.radians(-38 * side), D["rope"], 40)

    # ---------------- torso
    if newg:
        CO.torso(C)
    else:
        w0, w1 = (158, 150) if D["puffy"] else (128, 132)
        if D["puffy"]:  # scalloped quilted sides
            L_ = [(-w0 + 16 * k, 18), (-w0 - 6, -T * 0.14), (-w1 + 2, -T * 0.28), (-w1 - 12, -T * 0.42),
                  (-w1 + 4, -T * 0.55), (-w1 - 8, -T * 0.68), (-w1 + 6, -T * 0.8), (-sh_w + 8 + 18 * k, -T + 24)]
            R_ = [(sh_w - 8 - 26 * k, -T + 24), (w1 + 2 - 20 * k, -T * 0.8), (w1 + 12 - 20 * k, -T * 0.68),
                  (w1 - 2 - 20 * k, -T * 0.55), (w1 + 14 - 20 * k, -T * 0.42), (w1 - 2 - 20 * k, -T * 0.28),
                  (w0 + 6 - 22 * k, -T * 0.14), (w0 - 22 * k, 18)]
            tor = L_ + [(-60, -T - 2), (60, -T - 2)] + R_ + [(0, 30)]
        else:
            tor = [(-w0 + 16 * k, 18), (-w1 - 8, -T * 0.35), (-w1 + 4, -T * 0.75), (-sh_w + 8 + 18 * k, -T + 24),
                   (-60, -T - 2), (60, -T - 2), (sh_w - 8 - 26 * k, -T + 24), (w1 + 2 - 20 * k, -T * 0.75),
                   (w1 + 4 - 20 * k, -T * 0.35), (w0 - 22 * k, 18), (0, 30)]
        pt.blob(up(tor), D["jacket"], n=8)
        if D["puffy"]:
            for f in (0.28, 0.55, 0.8):
                y = -T * f + 6
                hw = (w1 - 22) if f > 0.4 else (w0 - 26)
                pt.line(up([(-hw + 16 * k, y + 4), (0 + 20 * k, y + 14), (hw - 20 * k, y + 4)]), LINE * 0.6,
                        smooth=True)
        if not back:
            zx = 12 + 34 * k
            pt.line(up([(zx, -T + 6), (zx - 4, 22)]), LINE * 0.6)
        # harness waist belt
        if D.get("harness") is not None:
            pt.shape(up([(-w0 + 2 + 16 * k, -18), (w0 - 2 - 22 * k, -18), (w0 - 22 * k, 16), (-w0 + 16 * k, 16)]),
                     D["harness"], LINE * 0.8)
            if not back:
                pt.ell(*up((zx, 0)), 22, 20, (90, 120, 150), LINE * 0.7)
    if (back and (C is None or D.get("pack_back"))) or p["prop"] == "pack":
        pt.blob(up([(-84, -T + 50), (84, -T + 50), (98, -T * 0.45), (84, -T * 0.16), (-84, -T * 0.16), (-98, -T * 0.45)]),
                D["pack"], n=6)
        pt.shape(up([(-60, -T * 0.42), (60, -T * 0.42), (60, -T * 0.24), (-60, -T * 0.24)]), D["pack"], LINE * 0.7)
    if C is not None and back:
        CO.behind_body(C)                           # back view: cape / quiver over the back
    # collar
    if not newg:
        pt.blob(up([(-78 + 18 * k, -T + 22), (-70 + 16 * k, -T - 38), (80 + 10 * k, -T - 38), (86 + 8 * k, -T + 22),
                    (8 * k, -T + 36)]), D["jacket_dk"] if not D["puffy"] else D["jacket"], n=6)

    # ---------------- head
    hd = math.radians(p["head"] + idle[1])
    hc = neck + rot(np.array([0.0, -D["head_ry"] + 18 + p["head_dy"]]), lean + hd)
    ha = lean + hd

    def H(pts):
        return rot(np.asarray(pts, float), ha) + hc

    rx, ry = D["head_rx"], D["head_ry"]
    fsx = 34 * k                                     # face shift toward facing direction
    if C is not None:
        C.set_head(H, hc, ha, rx, ry, fsx)
        CO.head_back(C)                             # long hair, hood, nemes, neck guards, hat wings (behind the head)
    t = np.linspace(0, 2 * math.pi, 72, endpoint=False)
    egg = np.stack([rx * np.cos(t) * (1 + 0.06 * np.sin(t)), ry * np.sin(t) - 6 * np.sin(t) ** 2 * (np.sin(t) > 0)], 1)
    pt.shape(H(egg), WHITE)
    if not back and (C is None or C.face_visible()):
        face(pt, H, p, fsx, rx, ry, C)
    if C is None or D.get("style") in ("messy", "beanie"):
        if C is None or C.hair_visible():
            hair(pt, H, D, k, back, rx, ry)
    if C is not None:
        CO.head_front(C)                            # new hair styles + headwear
    if p["sweat"] > 0.05 and not back:
        s = p["sweat"]
        pt.blob(H([(rx * 0.95, -ry * 0.45), (rx * 0.95 + 22 * s, -ry * 0.1), (rx * 0.95, -ry * 0.0 + 10 * s),
                   (rx * 0.95 - 22 * s, -ry * 0.1)]), (235, 190, 120), LINE * 0.7, n=6)

    # ---------------- chest coil (in front of torso, behind hands)
    if p["prop"] == "coil_chest":
        dx, dy, sc = p["coil"]
        c = up((10 * k + dx, -T * 0.42 + dy))
        coil(pt, c, 104 * sc, 120 * sc, 0.25, D["rope"], 58 * sc)

    if C is not None:
        CO.deferred(C)                              # far-arm shield in front of the body (3/4 view)
    # ---------------- near arm(s)
    if fac == "r":
        arm(-1)
    else:
        arm(-1); arm(1)
    joints["head"] = hc
    joints["hip"] = hip
    return joints


def coil(pt, c, rx, ry, ang, color, width):
    """a coiled rope: one thick ring with concentric strand lines and a few wrap ticks (reads as a bundle)."""
    q = ellipse_pts(c[0], c[1], rx, ry, ang, 72)
    pt.stroke(np.vstack([q, q[:3]]), color, width, LINE * 0.9, shade=False)
    for f in (-0.28, 0.0, 0.28):
        r = ellipse_pts(c[0], c[1], rx + f * width, ry + f * width, ang, 72)
        pt.line(np.vstack([r, r[:2]]), LINE * 0.35, tuple(int(v * 0.72) for v in color))
    for a in np.linspace(0.3, 2 * math.pi + 0.3, 9, endpoint=False):
        u = np.array([math.cos(a), math.sin(a)])
        ca, sa = math.cos(ang), math.sin(ang)
        d = np.array([ca * rx * u[0] - sa * ry * u[1], sa * rx * u[0] + ca * ry * u[1]])
        n = d / (np.hypot(*d) + 1e-6)
        p0 = np.asarray(c) + d
        pt.line([p0 - n * width * 0.45, p0 + n * width * 0.45], LINE * 0.45)


def face(pt, H, p, fsx, rx, ry, C=None):
    """eyes, brows, mouth. C: costume context (beard drawn before the mouth, moustache after, lashes)."""
    lx, ly = p["look"]
    ex, ey = 46, 10
    br_t, br_up = p["brows"]
    eyes = p["eyes"]
    for s in (-1, 1):
        cx, cy = fsx + s * ex * (0.82 if (fsx and s < 0) else 1.0), ey
        if eyes in ("dot", "wide", "up"):
            r = 15 if eyes == "dot" else 19
            oy = -14 if eyes == "up" else 0
            pt.dot(*H([(cx + lx, cy + ly + oy)])[0], r * pt_scale(pt, H))
        elif eyes == "half":
            pt.shape(H(ellipse_pts(cx + lx, cy + 2, 14, 14, 0, 16, 0, math.pi)), INK, 0)
            pt.line(H([(cx - 20, cy - 2), (cx + 20, cy - 2)]), LINE * 0.8)
        elif eyes == "closed":
            pt.line(H([(cx - 18, cy + 6), (cx, cy - 10), (cx + 18, cy + 6)]), LINE * 0.9, smooth=True)
        elif eyes == "squint":
            pt.line(H([(cx - 18 * s, cy - 10), (cx + 14 * s, cy), (cx - 18 * s, cy + 10)]), LINE * 0.9)
        # brows: inner end at the face centre side
        by = cy - 44 - br_up
        tn = math.tan(math.radians(br_t))
        inner = (cx - s * 20, by - tn * 20)
        outer = (cx + s * 26, by + tn * 26 + 4)
        mid = ((inner[0] + outer[0]) / 2, (inner[1] + outer[1]) / 2 - 5)
        pt.line(H([inner, mid, outer]), LINE * 1.15, smooth=True)
        if C is not None and C.D.get("lashes") and eyes in ("dot", "wide", "up", "half"):
            ox = cx + s * 17
            pt.line(H([(ox, cy - 6), (ox + s * 16, cy - 18)]), LINE * 0.6)
            pt.line(H([(ox - s * 2, cy - 14), (ox + s * 8, cy - 30)]), LINE * 0.6)
    if C is not None:
        C.beard()
    m = p["mouth"]
    mx, my = fsx + 4, 80
    o = p["mopen"]
    if m == "smile":
        pt.line(H([(mx - 34, my - 6), (mx, my + 12), (mx + 34, my - 6)]), LINE * 0.9, smooth=True)
    elif m == "grin":
        pt.blob(H([(mx - 46, my - 14), (mx + 46, my - 14), (mx + 30, my + 22), (mx, my + 34), (mx - 30, my + 22)]),
                MOUTH, LINE * 0.9, n=6)
        pt.shape(H([(mx - 38, my - 13), (mx + 38, my - 13), (mx + 32, my - 1), (mx - 32, my - 1)]), WHITE, 0)
    elif m in ("open", "talk"):
        pt.shape(H(ellipse_pts(mx, my + 4, 24 + 6 * o, 4 + 24 * o, 0, 32)), MOUTH, LINE * 0.9)
    elif m == "shout":
        pt.blob(H([(mx - 44, my - 18), (mx + 44, my - 18), (mx + 34, my + 30), (mx, my + 46), (mx - 34, my + 30)]),
                MOUTH, LINE * 0.9, n=6)
        pt.shape(H(ellipse_pts(mx, my + 28, 22, 10, 0, 20)), TONGUE, 0)
    elif m == "flat":
        pt.line(H([(mx - 26, my + 4), (mx + 26, my + 4)]), LINE * 0.9)
    elif m == "grit":
        pt.shape(H([(mx - 40, my - 12), (mx + 40, my - 12), (mx + 40, my + 18), (mx - 40, my + 18)]), WHITE, LINE * 0.9)
        pt.line(H([(mx - 40, my + 3), (mx + 40, my + 3)]), LINE * 0.6)
        for x in (-20, 0, 20):
            pt.line(H([(mx + x, my - 12), (mx + x, my + 18)]), LINE * 0.6)
    elif m == "gulp":
        pt.line(H([(mx - 26, my + 4), (mx - 13, my - 4), (mx, my + 4), (mx + 13, my - 4), (mx + 26, my + 4)]),
                LINE * 0.85, smooth=True)
    if C is not None:
        C.moustache()


def pt_scale(pt, H):
    return 1.0  # dot radii are in character units already (Painter scales them)


def hair(pt, H, D, k, back, rx, ry):
    if D["style"] == "messy":
        sh = 22 * k
        # big wavy volume around the top and sides of the head (reference: chunky, bouncy, darker underside)
        outer = [(-rx - 2, 52), (-rx - 26, 18), (-rx - 26, -22), (-rx - 44, -62), (-rx - 22, -96), (-rx - 30, -146),
                 (-rx + 12, -160), (-rx + 16, -214), (-52, -202), (-26, -238), (24, -214), (78, -236), (98, -196),
                 (rx + 18, -190), (rx + 12, -140), (rx + 40, -110), (rx + 22, -64), (rx + 32, -22), (rx + 10, 30)]
        if back:
            inner = [(rx - 4, 110), (80, 168), (20, 150), (-40, 172), (-rx + 4, 110)]
        else:
            inner = [(rx - 22, -6), (rx - 24, -54), (rx - 62 + sh, -74), (70 + sh, -52), (52 + sh, -96),
                     (16 + sh, -64), (-14 + sh, -108), (-52 + sh, -70), (-90 + sh, -92), (-rx + 36, -56),
                     (-rx + 24, -12), (-rx + 14, 30)]
        pt.blob(H(outer + inner), D["hair"], n=6)
        for strand in ([(-90, -186), (-74, -146), (-82, -112)], [(-12, -214), (0, -170), (-8, -130)],
                       [(64, -206), (78, -166), (70, -128)], [(rx - 10, -150), (rx - 2, -112)]):
            if back or strand[0][0] < 100:
                pt.line(H([(x + (0 if back else sh * 0.5), y) for x, y in strand]), LINE * 0.6, smooth=True)
    else:  # beanie + blond tufts
        sh = 16 * k
        tuft_y = 30 if back else -10
        for s in (-1, 1):
            pt.blob(H([(s * (rx - 30), -70), (s * (rx + 22), -40), (s * (rx + 12), tuft_y),
                       (s * (rx + 24), tuft_y + 30), (s * (rx - 10), tuft_y + 20)]), D["hair"], LINE, n=6)
        if back:
            pt.blob(H([(-rx - 4, -40), (rx + 4, -40), (rx - 6, 100), (0, 140), (-rx + 6, 100)]), D["hair"], n=6)
        pt.blob(H([(-rx - 14, -38), (-rx - 4, -120), (-60, -178), (40, -182), (rx + 2, -128), (rx + 14, -38),
                   (0, -28)]), D["hat"], n=8)
        pt.shape(H([(-rx - 18, -62), (rx + 18, -62), (rx + 18, -24), (-rx - 18, -24)]), D["hat"], LINE)
        for x in range(-110, 120, 30):
            pt.line(H([(x, -58), (x, -28)]), LINE * 0.5)
        if not back:
            pt.blob(H([(-rx + 26 + sh, -22), (-40 + sh, -46), (20 + sh, -20), (rx - 30 + sh, -40), (rx - 20, -10),
                       (sh, 0), (-rx + 40, -4)]), D["hair"], LINE * 0.9, n=5)


# ----------------------------------------------------------------------------------------------- render to frame
BOX = (-560, -1500, 560, 120)              # drawing box (char units) of a plain character
BOX_COSTUME = (-720, -1640, 720, 140)       # hats, capes, wide sleeves
BOX_PROPS = (-1320, -2150, 1320, 170)       # long props (spears, banners, longbows) may reach far


def char_box(D, p):
    if not uses_costumes(D, p):
        return BOX
    return BOX_PROPS if (p.get("heldL", "none") != "none" or p.get("heldR", "none") != "none") else BOX_COSTUME


def render_char(frame, D, p, M, flip=False, idle=(0.0, 0.0), box=None):
    """M: 2x3 affine char space -> screen px (already includes camera). Draws into the float BGR frame and returns
    the joints in SCREEN px."""
    box = box or char_box(D, p)
    A = np.asarray(M, np.float64).copy()
    if flip:
        A[:, 0] *= -1
    x0, y0, x1, y1 = box
    corners = np.array([[x0, y0], [x1, y0], [x0, y1], [x1, y1]], float) @ A[:, :2].T + A[:, 2]
    Hh, Ww = frame.shape[:2]
    sx0, sy0 = int(max(math.floor(corners[:, 0].min()), -50)), int(max(math.floor(corners[:, 1].min()), -50))
    sx1, sy1 = int(min(math.ceil(corners[:, 0].max()), Ww + 50)), int(min(math.ceil(corners[:, 1].max()), Hh + 50))
    if sx1 <= sx0 or sy1 <= sy0:
        return {}
    C = A.copy()
    C[:, 2] -= (sx0, sy0)
    C *= SS
    pt = Painter((sx1 - sx0) * SS, (sy1 - sy0) * SS, C)
    j = draw_character(pt, D, p, idle)
    if box != BOX:   # costume characters use a big box: crop to what was drawn before the costly steps
        a = pt.img[..., 3]
        rows, cols = np.flatnonzero(a.any(1)), np.flatnonzero(a.any(0))
        if len(rows):
            m = pt.lw(LINE * 0.55) + 2 * SS
            r0, c0 = max(rows[0] - m, 0) // SS * SS, max(cols[0] - m, 0) // SS * SS
            r1 = min(-(-(rows[-1] + 1 + m) // SS) * SS, a.shape[0] // SS * SS)
            c1 = min(-(-(cols[-1] + 1 + m) // SS) * SS, a.shape[1] // SS * SS)
            pt.img = np.ascontiguousarray(pt.img[r0:r1, c0:c1])
            sx0, sy0 = sx0 + c0 // SS, sy0 + r0 // SS
    silhouette(pt, LINE * 0.55)
    composite(frame, pt.img, sx0, sy0)
    return {k: v @ A[:, :2].T + A[:, 2] for k, v in j.items()}


def silhouette(pt, extra):
    """outer contour thicker than inner lines, like the reference's marker outline."""
    k = pt.lw(extra)
    if k < 1:
        return
    a = (pt.img[..., 3] > 0).astype(np.uint8)
    ring = cv2.dilate(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))) & (1 - a)
    pt.img[ring > 0] = (*INK, 255)


def render_strokes(frame, paths, color, width, line=LINE * 0.8, knot=None):
    """screen-space rope(s): paths = list of polylines in screen px; width in px."""
    pts = np.vstack(paths)
    m = width + 2 * line + 4
    x0, y0 = int(pts[:, 0].min() - m), int(pts[:, 1].min() - m)
    x1, y1 = int(pts[:, 0].max() + m), int(pts[:, 1].max() + m)
    pt = Painter((x1 - x0) * SS, (y1 - y0) * SS, [[SS, 0, -x0 * SS], [0, SS, -y0 * SS]])
    for path in paths:
        pt.stroke(path, color, width, line, smooth=len(path) > 2)
    if knot is not None:
        pt.blob(knot, color, line, n=6)
    composite(frame, pt.img, x0, y0)
