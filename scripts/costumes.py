"""Costume parts, held props and ready-made era designs for toon.py characters (flat-cartoon-code-video library).

A design dict (production/cast.py) picks parts with these keys; all are optional, a design without any of them is
drawn exactly like before (Joe/Simon). Colours BGR.

  garment   puffy | zip (the two climbers) | tunic | robe | toga | mail (mail + surcoat) | plate | lamellar |
            segmentata | coat | uniform | kilt
            colours: jacket (main), jacket_dk (dark trim / lapels), trim (accent: braid, lacing, buttons), belt,
            sleeve (sleeve colour, default jacket), tunic (under-tunic of segmentata), vest + tie (coat),
            strap (uniform cross-belt), mail (mail colour)
            options: sleeves long | short | none | wide | mail | plate (default per garment), skirt (hem as a
            fraction of the leg, default per garment), collar cross | round | v (robe), belt_style leather | rope |
            sash | none, badge (BGR: mandarin square on the chest), hem_trim (bool)
  cape      BGR or None; cape_trim "ermine" or a BGR colour; quiver (BGR) arrows on the back
  heraldry  dict(field=BGR, device=cross|saltire|chevron|pale|fess|bend|quarterly|roundel|star|fleur|mon|wings,
            color=BGR) -> surcoat chest, shields, flags/banners
  legwear   trousers | hose | bare | wraps | greaves | mail | striped | hakama   (colour: trousers; wrap: wraps colour;
            stripe: trouser stripe)
  footwear  boots | shoes | sandals | sabatons | bare   (colour: boots)
  style     hair: messy | beanie (the climbers) | short | bald | long | topknot | bun | tonsure | none
  headwear  none | beanie | nasal | greathelm | kettle | kabuto | galea | crown | tophat | tricorn | kasa | turban |
            hood | wushamao | nemes | viking | chinese_helm   (colours: hat, hat2 = accent/crest/band, crest = galea
            plume BGR or None, hat_wings = long | short for wushamao, hat_dy = move the hat up/down)
  moustache none | walrus | handlebar | thin ;  beard none | stubble | short | long   (colour: beard, default hair)
  lashes    True draws eyelashes

Held props (pose fields heldL / heldR, angle rotL / rotR): see HELD. Presets: PRESETS (python costumes.py ->
production/review/presets.jpg shows every preset in a few poses).
"""
import math, pathlib, sys
import numpy as np, cv2

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import toon as TN
from toon import crom, ellipse_pts, rot, LINE, WHITE, INK

# ------------------------------------------------------------------------------------------------- palette (BGR)
STEEL = (204, 196, 190)
STEEL_DK = (150, 142, 136)
IRON = (118, 112, 108)
GOLD = (52, 182, 236)
GOLD_DK = (30, 130, 190)
BRONZE = (64, 140, 196)
WOOD = (52, 100, 152)
WOOD_DK = (38, 72, 112)
LEATHER = (44, 78, 126)
PAPER = (196, 232, 244)
LINEN = (226, 236, 238)
RED = (52, 48, 196)
RED_DK = (40, 36, 150)
BLUE = (160, 92, 40)
GREEN = (70, 130, 60)
BLACK = (52, 46, 48)
FLAME = (40, 150, 250)
FLAME_IN = (110, 226, 255)
SKIN = WHITE                      # bare skin is the same white as faces and hands in this style

GARMENT = dict(   # per-garment defaults: sleeve style, skirt hem (fraction of leg length below the hip), hem flare
    tunic=dict(sleeves="long", skirt=0.42, flare=34),
    robe=dict(sleeves="wide", skirt=1.0, flare=66),
    toga=dict(sleeves="short", skirt=0.8, flare=50),
    mail=dict(sleeves="mail", skirt=0.56, flare=40),
    plate=dict(sleeves="plate", skirt=0.3, flare=40),
    lamellar=dict(sleeves="long", skirt=0.44, flare=58),
    segmentata=dict(sleeves="short", skirt=0.4, flare=38),
    coat=dict(sleeves="long", skirt=0.64, flare=34),
    uniform=dict(sleeves="long", skirt=0.17, flare=22),
    kilt=dict(sleeves="none", skirt=0.44, flare=40),
)
HEADWEAR = ("none", "beanie", "nasal", "greathelm", "kettle", "kabuto", "galea", "crown", "tophat", "tricorn", "kasa",
            "turban", "hood", "wushamao", "nemes", "viking", "chinese_helm")
HAIR = ("messy", "beanie", "short", "bald", "long", "topknot", "bun", "tonsure", "none")
MOUSTACHE = ("none", "walrus", "handlebar", "thin")
BEARD = ("none", "stubble", "short", "long")
HELD = ("none", "sword", "gladius", "katana", "spear", "axe", "hammer", "mallet", "mace", "bow", "longbow", "arrow",
        "crossbow", "shield_round", "shield_kite", "shield_heater", "scutum", "scroll", "scroll_open", "book", "torch",
        "flag", "banner", "quill", "lantern", "paper_lantern", "wrench", "staff", "crook")
SHIELDS = ("shield_round", "shield_kite", "shield_heater", "scutum")
BOWS = ("bow", "longbow")


def _n(d):
    d = np.asarray(d, float)
    return d / (np.hypot(*d) + 1e-9)


def _perp(d):
    return np.array([-d[1], d[0]])


def dk(c, f=0.72):
    return tuple(int(v * f) for v in c)


# ------------------------------------------------------------------------------------------------- context
class Ctx:
    """everything the part painters need about the character being drawn (built by toon.draw_character)."""

    def __init__(s, pt, D, p, k, fac, T, hip, lean, up, sh_w, joints):
        s.pt, s.D, s.p, s.k, s.fac, s.T, s.hip, s.lean, s.up, s.sh_w, s.joints = \
            pt, D, p, k, fac, T, hip, lean, up, sh_w, joints
        s.back = fac == "b"
        s.garment = D.get("garment") or ("puffy" if D.get("puffy") else "zip")
        s.g = GARMENT.get(s.garment, {})
        s.legs, s.arms, s.defer = {}, {}, []
        s.hw = D.get("headwear") or "none"
        if D.get("style") == "beanie" and s.hw == "none":
            s.hw = "beanie_legacy"
        s.leg_len = D["leg_u"] + D["leg_l"]

    # arms ------------------------------------------------------------
    def set_arm(s, side, sh, el, wr):
        s.arms[side] = (sh, el, wr)
        if len(s.arms) == 2:
            s._prop_geometry()

    def held(s, side):
        return s.p.get("heldL" if side < 0 else "heldR", "none")

    def prop_frame(s, side):
        """(grip point, prop angle) of a hand: angle 0 = forward when the forearm hangs down."""
        sh, el, wr = s.arms[side]
        af = math.atan2(*(wr - el)[::-1])
        kind = s.held(side)
        rotd = math.radians(s.p.get("rotL" if side < 0 else "rotR", 0.0))
        c = wr + 8 * np.array([math.cos(af), math.sin(af)])
        if kind in SHIELDS or kind in ("book", "scroll_open"):
            return c, -math.pi / 2 + s.lean + rotd          # strapped / held flat: stays upright
        base = math.pi / 2 if kind == "crossbow" else 0.0
        a = af - math.pi / 2 + base + rotd
        fix = s.p.get("fixL" if side < 0 else "fixR", 0.0)
        if fix:
            d = (rotd + s.lean - a + math.pi) % (2 * math.pi) - math.pi
            a += fix * d
        return c, a

    def _prop_geometry(s):
        s.bow = None
        for side in (-1, 1):
            if s.held(side) in BOWS:
                c, a = s.prop_frame(side)
                L = 440 if s.held(side) == "longbow" else 290
                other = s.held(-side) == "arrow"
                bend = 150 if other else 90
                R = lambda pts: rot(np.asarray(pts, float), a) + c
                tips = R([(L, -bend), (-L, -bend)])
                s.bow = dict(side=side, c=c, a=a, L=L, tips=tips, drawn=other)

    # head ------------------------------------------------------------
    def set_head(s, H, hc, ha, rx, ry, fsx):
        s.H, s.hc, s.ha, s.rx, s.ry, s.fsx = H, hc, ha, rx, ry, fsx
        s.hy = s.D.get("hat_dy", 0)

    def face_visible(s):
        return s.hw != "greathelm"

    def hair_visible(s):
        return s.hw != "greathelm"

    def beard(s):
        beard(s)

    def moustache(s):
        moustache(s)


# ------------------------------------------------------------------------------------------------- heraldry
def device(pt, her, center, size, ang, clip=None, line=LINE * 0.6):
    """draw a heraldic device (not the field) centred at `center`, `size` ~ half-width in units, rotated by ang.
    clip: convex polygon (char units) -> stripes/crosses run to its edge; without clip they stay inside size."""
    if not her:
        return
    dev, col = her.get("device", "none"), her.get("color", GOLD)
    ext = 400 if clip is not None else 100
    S = size / 100.0

    def Wp(pts):
        return rot(np.asarray(pts, float) * S, ang) + center

    shapes = []
    if dev == "cross":
        w = 20
        shapes = [[(-w, -ext), (w, -ext), (w, ext), (-w, ext)], [(-ext, -w), (ext, -w), (ext, w), (-ext, w)]]
    elif dev == "saltire":
        w = 18
        for a in (0.785, -0.785):
            shapes.append(rot(np.array([(-ext, -w), (ext, -w), (ext, w), (-ext, w)], float), a))
    elif dev == "pale":
        shapes = [[(-34, -ext), (34, -ext), (34, ext), (-34, ext)]]
    elif dev == "fess":
        shapes = [[(-ext, -30), (ext, -30), (ext, 30), (-ext, 30)]]
    elif dev == "bend":
        shapes = [rot(np.array([(-ext, -26), (ext, -26), (ext, 26), (-ext, 26)], float), 0.785)]
    elif dev == "chevron":
        for sgn in (-1, 1):
            q = np.array([(0, -40), (0, 10), (sgn * ext, 10 + ext * 0.9), (sgn * ext, -40 + ext * 0.9)], float)
            shapes.append(q if sgn > 0 else q[::-1])
    elif dev == "quarterly":
        shapes = [[(-ext, -ext), (0, -ext), (0, 0), (-ext, 0)], [(0, 0), (ext, 0), (ext, ext), (0, ext)]]
    elif dev == "roundel":
        shapes = [ellipse_pts(0, 0, 52, 52, n=36)]
    elif dev == "mon":
        shapes = [ellipse_pts(0, 0, 60, 60, n=36)]
    elif dev == "star":
        t = np.arange(10) * math.pi / 5 - math.pi / 2
        r = np.where(np.arange(10) % 2 == 0, 64, 26)
        shapes = [np.stack([r * np.cos(t), r * np.sin(t)], 1)]
    if clip is not None and dev in ("cross", "saltire", "pale", "fess", "bend", "chevron", "quarterly"):
        cp = np.asarray(clip, np.float32)
        for sh in shapes:
            q = Wp(sh).astype(np.float32)
            area, inter = cv2.intersectConvexConvex(q, cp)
            if area > 1 and inter is not None:
                pt.shape(inter.reshape(-1, 2).astype(float), col, line, shade=False)
    elif dev == "fleur":
        pt.blob(Wp([(0, -70), (20, -30), (14, 10), (0, 26), (-14, 10), (-20, -30)]), col, line, n=6, shade=False)
        for sg in (-1, 1):
            pt.blob(Wp([(sg * 10, 10), (sg * 34, -30), (sg * 64, -24), (sg * 56, 8), (sg * 30, 20)]), col, line, n=5,
                    shade=False)
        pt.shape(Wp([(-40, 14), (40, 14), (40, 30), (-40, 30)]), col, line, shade=False)
        pt.blob(Wp([(-12, 30), (12, 30), (8, 64), (-8, 64)]), col, line, n=4, shade=False)
    elif dev == "wings":   # scutum: boss rays / lightning
        for a in (-0.6, 0.6, math.pi - 0.6, math.pi + 0.6):
            d = np.array([math.cos(a), math.sin(a)])
            n = _perp(d)
            pts = [d * 60, d * 120 + n * 18, d * 150 - n * 10, d * 210 + n * 10]
            pt.line(Wp(pts), LINE * 1.1 * S + 6, col)
    else:
        for sh in shapes:
            pt.shape(Wp(sh), col, line, shade=False)
        if dev == "mon":
            pt.shape(Wp(ellipse_pts(0, 0, 30, 30, n=30)), her.get("field", WHITE), line, shade=False)


# ------------------------------------------------------------------------------------------------- body parts
def behind_body(C):
    """cape and quiver: behind legs/torso in front & 3/4 views, over the back in the back view."""
    D, pt, up, T, k = C.D, C.pt, C.up, C.T, C.k
    if D.get("quiver") and not C.back:
        _quiver(C)
    if D.get("cape"):
        col = D["cape"]
        sw = C.sh_w
        hem_y = min(C.hip[1] + C.leg_len * 0.74, -70.0)
        trail = -80 * k
        hx = C.hip[0]
        top = [up((-sw + 6 + 18 * k, -T + 22)), up((-40, -T - 18)), up((50, -T - 18)), up((sw - 6 - 26 * k, -T + 22))]
        side_r = up((sw + 26 - 26 * k, -T * 0.45))
        side_l = up((-sw - 26 + 18 * k, -T * 0.45))
        hem = [np.array([hx + sw + 70 + trail * 0.4, hem_y]), np.array([hx + 40 + trail, hem_y + 16]),
               np.array([hx - 60 + trail, hem_y + 10]), np.array([hx - sw - 70 + trail * 1.2, hem_y])]
        pts = top + [side_r] + hem + [side_l]
        pt.blob(np.array(pts), col, n=6)
        if not C.back:
            for f in (-0.45, 0.4):
                a = up((f * sw, -T * 0.55))
                b = np.array([hx + f * (sw + 60) + trail, hem_y - 10])
                pt.line([a, (a + b) / 2 + (6, 0), b], LINE * 0.6, smooth=True)
        else:
            for f in (-0.5, 0.0, 0.5):
                a = up((f * sw * 0.8, -T * 0.7))
                b = np.array([hx + f * (sw + 50), hem_y - 6])
                pt.line([a, (a + b) / 2 + (8, 0), b], LINE * 0.6, smooth=True)
        trim = D.get("cape_trim")
        if trim:
            band = [hem[0] + (6, -40), hem[0] + (0, 0), hem[1], hem[2], hem[3], hem[3] + (6, -40),
                    hem[2] + (0, -38), hem[1] + (0, -40)]
            pt.shape(np.array([hem[3] + (-2, -38), hem[2] + (0, -36), hem[1] + (0, -38), hem[0] + (2, -38),
                               hem[0], hem[1], hem[2], hem[3]]), WHITE if trim == "ermine" else trim, LINE * 0.7)
            if trim == "ermine":
                for f in np.linspace(0.12, 0.88, 6):
                    q = hem[3] + (hem[0] - hem[3]) * f + (0, -16)
                    _ermine_spot(pt, q, 1.0)
    if D.get("quiver") and C.back:
        _quiver(C)


def _ermine_spot(pt, q, s):
    pt.shape([q + (0, -10 * s), q + (6 * s, 8 * s), q + (-6 * s, 8 * s)], INK, 0)


def _quiver(C):
    pt, up, T = C.pt, C.up, C.T
    s = -1 if (C.back or C.k) else 1
    a = up((s * 30, -T * 0.25))
    b = up((s * 120, -T - 60))
    d = _n(b - a)
    n = _perp(d)
    for i, o in enumerate((-22, 0, 22)):        # arrow fletchings sticking out
        q = b + d * 40 + n * o
        pt.stroke([b + n * o * 0.6, q], WOOD, 8, LINE * 0.5, shade=False)
        pt.blob([q - n * 14, q + d * 46 - n * 4, q + d * 54 + n * 4, q + n * 14], WHITE if i != 1 else RED, LINE * 0.6,
                n=4, shade=False)
    pt.blob([a - n * 40, b - n * 46, b + n * 46, a + n * 40], C.D["quiver"], n=4)
    pt.line([b - n * 46 - d * 30, b + n * 46 - d * 30], LINE * 0.6)


def leg(C, side, hj, knee, ank):
    D, pt, fac, back = C.D, C.pt, C.fac, C.back
    lw = D.get("legwear") or "trousers"
    col = D.get("trousers", BLACK)
    path = [hj, knee, ank]
    if lw == "bare":
        pt.stroke(path, SKIN, 64)
    elif lw == "hakama":
        pt.stroke(path, col, 112)
        pt.line([knee + (side * 20, -60), ank + (side * 34, -10)], LINE * 0.5)
    else:
        pt.stroke(path, col, dict(hose=78, wraps=82, greaves=88, mail=90).get(lw, 96))
    dl = ank - knee
    if lw == "wraps":
        wc = D.get("wrap", dk(col, 0.8))
        n = _perp(_n(dl))
        for f in (0.2, 0.45, 0.7):
            a, b = knee + dl * f, knee + dl * (f + 0.2)
            pt.line([a - n * 38, b + n * 38], LINE * 0.55, wc)
            pt.line([a + n * 38, b - n * 38], LINE * 0.55, wc)
    elif lw == "greaves":
        pt.stroke([knee + dl * 0.12, ank - dl * 0.04], D.get("steel", STEEL), 92)
        pt.ell(knee[0], knee[1], 50, 44, D.get("steel", STEEL), LINE * 0.9)
        pt.dot(knee[0] + 4, knee[1] - 2, 8)
    elif lw == "mail":
        _mail_rows(pt, hj, knee, 3)
        _mail_rows(pt, knee, ank, 3)
    elif lw == "striped" and not back:
        pt.line([hj + (side * 30, 0), knee + (side * 30, 0), ank + (side * 30, -20)], LINE * 1.2,
                D.get("stripe", RED))
    foot(C, side, ank, D.get("footwear") or "boots")


def _mail_rows(pt, a, b, n_rows, w=36):
    d = b - a
    nrm = _perp(_n(d))
    for f in np.linspace(0.2, 0.85, n_rows):
        c = a + d * f
        pts = [c + nrm * w * t + _n(d) * 7 * abs(math.sin(t * math.pi * 2.5)) for t in np.linspace(-1, 1, 9)]
        pt.line(pts, LINE * 0.4, dk(STEEL_DK, 0.8))


def foot(C, side, ank, fw):
    D, pt, fac, back = C.D, C.pt, C.fac, C.back
    toe = 1 if fac == "r" else (side * 0.35 if fac == "f" else side * 0.15)
    bx, by = ank[0], ank[1] + 28
    col = D.get("boots", LEATHER)
    if fw in ("boots", "sabatons"):
        boot = [(bx - 52 + 20 * min(toe, 0), by - 42), (bx + 40 + 50 * max(toe, 0) * 0.6, by - 34),
                (bx + 62 + 62 * max(toe, 0), by + 4), (bx + 58 + 60 * max(toe, 0), by + 36),
                (bx - 58 + 60 * min(toe, 0), by + 36), (bx - 62 + 30 * min(toe, 0), by - 4)]
        if back:
            boot = [(bx - 56, by - 40), (bx + 56, by - 40), (bx + 60, by + 36), (bx - 60, by + 36)]
        pt.blob(boot, col, n=6)
        pt.line([(bx - 56 + 50 * min(toe, 0), by + 18), (bx + 56 + 58 * max(toe, 0), by + 18)], LINE * 0.7)
        if fw == "sabatons" and not back:
            for o in (-14, 8):
                pt.line([(bx - 30 + 40 * max(toe, 0), by + o - 10), (bx + 30 + 50 * max(toe, 0), by + o)], LINE * 0.5)
    else:
        fill = SKIN if fw in ("sandals", "bare") else col
        shoe = [(bx - 46 + 16 * min(toe, 0), by - 4), (bx + 30 + 40 * max(toe, 0), by - 10),
                (bx + 58 + 60 * max(toe, 0), by + 10), (bx + 54 + 58 * max(toe, 0), by + 36),
                (bx - 52 + 50 * min(toe, 0), by + 36), (bx - 54 + 24 * min(toe, 0), by + 12)]
        if back:
            shoe = [(bx - 48, by - 6), (bx + 48, by - 6), (bx + 52, by + 36), (bx - 52, by + 36)]
        pt.blob(shoe, fill, n=6)
        if fw == "sandals":
            pt.shape([(bx - 54 + 50 * min(toe, 0), by + 24), (bx + 56 + 58 * max(toe, 0), by + 24),
                      (bx + 56 + 58 * max(toe, 0), by + 38), (bx - 54 + 50 * min(toe, 0), by + 38)], col, LINE * 0.6)
            for o in (-30, 0):
                pt.line([(bx - 30 + o * 0.3, by + o * 0.5 - 2), (bx + 26 + 30 * max(toe, 0), by + o * 0.5 + 8)],
                        LINE * 0.9, col)
            pt.line([(bx - 6, by - 40), (bx - 6, by - 8)], LINE * 0.8, col)
    C.joints["foot" + ("L" if side < 0 else "R")] = np.array([bx, 0.0])


def _leg_point(C, side, f):
    hj, knee, ank = C.legs[side]
    L = f * C.leg_len
    if L <= C.D["leg_u"]:
        return hj + (knee - hj) * (L / C.D["leg_u"])
    return knee + (ank - knee) * min((L - C.D["leg_u"]) / C.D["leg_l"], 1.15)


def skirt(C, f, flare, col, split=0.0, top=-36, line=LINE, w0=134):
    """skirt/hem below the waist that follows the legs: hem at fraction f of the leg. Returns (hemL, hemR).
    split > 0: open front (two panels with a gap of `split` units at the hem)."""
    pt, up, k = C.pt, C.up, C.k
    hL = _leg_point(C, -1, f) + np.array([-flare - 14, 10 + 8 * f])
    hR = _leg_point(C, 1, f) + np.array([flare + 14, 10 + 8 * f])
    if hR[0] - hL[0] < 200:
        m = (hL + hR) / 2
        hL, hR = m - (100, 0), m + (100, 0)
    tL, tR = up((-w0 + 14 * k, top)), up((w0 - 20 * k, top))
    midL = (tL + hL) / 2 + np.array([-12, 0])
    midR = (tR + hR) / 2 + np.array([12, 0])
    hem_mid = (hL + hR) / 2 + np.array([0, 14])
    if split <= 0:
        poly = np.vstack([crom([tL, midL, hL], False, 6), crom([hL, hem_mid, hR], False, 6),
                          crom([hR, midR, tR], False, 6)])
        pt.shape(poly, col, line)
    else:
        cx = up((10 + 30 * k, top))
        for sg, h_, m_, t_ in ((-1, hL, midL, tL), (1, hR, midR, tR)):
            inner = hem_mid + np.array([sg * split / 2, -4])
            poly = np.vstack([crom([t_, m_, h_], False, 6), crom([h_, (h_ + inner) / 2 + (0, 8), inner], False, 4),
                              [cx + (sg * 4, 0)]])
            pt.shape(poly, col, line)
    return hL, hR


def tor_poly(C, w0=128, w1=132, top=0):
    T, k, sw = C.T, C.k, C.sh_w
    return [(-w0 + 16 * k, 18), (-w1 - 8, -T * 0.35), (-w1 + 4, -T * 0.75), (-sw + 8 + 18 * k, -T + 24),
            (-60, -T - 2 + top), (60, -T - 2 + top), (sw - 8 - 26 * k, -T + 24), (w1 + 2 - 20 * k, -T * 0.75),
            (w1 + 4 - 20 * k, -T * 0.35), (w0 - 22 * k, 18), (0, 30)]


def belt(C, col=None, buckle=None, style=None, y0=-20, y1=16):
    D, pt, up, k = C.D, C.pt, C.up, C.k
    style = style or D.get("belt_style", "leather")
    col = col or D.get("belt", LEATHER)
    if style == "none":
        return
    cx = 12 + 30 * k
    if style == "rope":
        pt.shape(up([(-130 + 16 * k, -8), (130 - 22 * k, -8), (132 - 22 * k, 10), (-132 + 16 * k, 10)]), col, LINE * 0.7)
        if not C.back:
            pt.stroke(up([(cx + 20, 4), (cx + 34, 90), (cx + 24, 170)]), col, 14, LINE * 0.6, smooth=True)
            pt.ell(*up((cx + 20, 2)), 18, 15, col, LINE * 0.6)
        return
    if style == "sash":
        y0, y1 = -46, 18
    pt.shape(up([(-132 + 16 * k, y0), (132 - 22 * k, y0), (134 - 22 * k, y1), (-134 + 16 * k, y1)]), col, LINE * 0.8)
    if C.back:
        return
    if style == "sash":
        for o in (-1, 1):
            pt.stroke(up([(cx + 30, 6), (cx + 30 + o * 26, 90), (cx + 30 + o * 18, 150)]), col, 26, LINE * 0.6,
                      smooth=True)
        pt.ell(*up((cx + 30, -12)), 26, 22, col, LINE * 0.7)
    else:
        pt.shape(up([(cx - 22, y0 - 4), (cx + 22, y0 - 4), (cx + 22, y1 + 4), (cx - 22, y1 + 4)]),
                 buckle or D.get("trim", GOLD), LINE * 0.7)


def torso(C):
    """new garments: skirt (behind), torso, details, belt, collar."""
    D, pt, up, T, k, back, g = C.D, C.pt, C.up, C.T, C.k, C.back, C.garment
    col = D.get("jacket", RED)
    dkc = D.get("jacket_dk", dk(col))
    trim = D.get("trim")
    cx = 10 + 30 * k
    f = D.get("skirt", C.g.get("skirt", 0.4))
    flare = D.get("flare", C.g.get("flare", 36))

    if g == "tunic":
        hL, hR = skirt(C, f, flare, col)
        if trim and D.get("hem_trim", True):
            _hem_band(C, hL, hR, trim)
        pt.blob(up(tor_poly(C)), col, n=8)
        _neckline(C, trim)
        belt(C)
    elif g == "robe":
        hL, hR = skirt(C, f, flare, col)
        if D.get("hem_trim") and trim:
            _hem_band(C, hL, hR, trim)
        pt.blob(up(tor_poly(C, 136, 136)), col, n=8)
        if not back:
            hm = (hL + hR) / 2
            pt.line([up((cx + 40, 10)), hm + (60 + 40 * k, -6)], LINE * 0.6)
            collar = D.get("collar", "cross")
            tc = trim or dkc
            if collar == "cross":
                pt.shape(up([(cx - 74, -T + 2), (cx - 36, -T + 2), (cx + 74, -T * 0.42), (cx + 60, -T * 0.32)]),
                         tc, LINE * 0.8)
                pt.shape(up([(cx + 36, -T + 2), (cx + 74, -T + 2), (cx + 18, -T * 0.66), (cx + 2, -T * 0.72)]),
                         tc, LINE * 0.8)
            elif collar == "round":
                pt.shape(up(ellipse_pts(cx, -T + 6, 82, 34, 0, 30, 0, math.pi)), tc, LINE * 0.8)
            else:
                pt.shape(up([(cx - 60, -T), (cx - 30, -T), (cx, -T * 0.6), (cx + 30, -T), (cx + 60, -T),
                             (cx, -T * 0.5)]), tc, LINE * 0.8)
            if D.get("badge"):
                bx, by = cx - 4, -T * 0.5
                pt.shape(up([(bx - 64, by - 60), (bx + 64, by - 60), (bx + 64, by + 60), (bx - 64, by + 60)]),
                         D["badge"], LINE * 0.8)
                pt.shape(up([(bx - 48, by - 44), (bx + 48, by - 44), (bx + 48, by + 44), (bx - 48, by + 44)]),
                         D.get("badge_in", BLUE), LINE * 0.5, shade=False)
                pt.blob(up([(bx - 30, by + 10), (bx - 4, by - 26), (bx + 30, by - 30), (bx + 12, by - 6),
                            (bx + 30, by + 24), (bx - 2, by + 8)]), WHITE, LINE * 0.5, n=4, shade=False)
                pt.dot(*up((bx + 26, by - 20)), 12, RED)
        belt(C, style=D.get("belt_style", "sash"))
    elif g == "toga":
        hL, hR = skirt(C, f, flare, col)
        if not back:
            for o in (-0.3, 0.15):
                a = up((o * 200, 40))
                pt.line([a, (hL + hR) / 2 + (o * 260 + 30, -30)], LINE * 0.5)
        pt.blob(up(tor_poly(C)), col, n=8)
        _neckline(C, None)
        sw = C.sh_w
        drape = [(-sw + 2 + 18 * k, -T + 20), (-sw + 70, -T - 6), (-20, -T * 0.6), (100 - 20 * k, -T * 0.08),
                 (134 - 22 * k, 30), (110 - 22 * k, 120), (40, 60), (-40, -T * 0.42), (-sw - 16 + 18 * k, -T * 0.6)]
        pt.blob(up(drape), col, n=6)
        if trim:
            pt.line(up([(-sw + 70, -T - 2), (-12, -T * 0.6), (104 - 20 * k, -T * 0.06)]), LINE * 1.3, trim,
                    smooth=True)
        for o in (0.25, 0.5):
            pt.line(up([(-sw + 20 + o * 90, -T * (0.9 - o * 0.3)), (10 + o * 60, -T * 0.3 + o * 40)]), LINE * 0.5,
                    smooth=False)
    elif g == "mail":
        mc = D.get("mail", STEEL)
        skirt(C, f + 0.06, flare - 6, mc)
        pt.blob(up(tor_poly(C)), mc, n=8)
        hL, hR = skirt(C, f, flare, col, split=40, top=-20, w0=124)
        sur = [(-120 + 16 * k, 18), (-124, -T * 0.4), (-104 + 14 * k, -T + 40), (-62 + 10 * k, -T + 4),
               (64 - 10 * k, -T + 4), (104 - 22 * k, -T + 40), (122 - 20 * k, -T * 0.4), (120 - 22 * k, 18)]
        pt.shape(up(sur), col, LINE)
        for sg in (-1, 1):
            _mail_rows(pt, up((sg * 108 + 6 * k, -T + 40)), up((sg * 116 + 6 * k, -T * 0.6)), 2, 18)
        if not back:
            her = D.get("heraldry")
            if her:
                device(pt, her, up((cx - 4, -T * 0.5)), 78, C.lean)
        belt(C)
    elif g == "plate":
        sc = D.get("steel", col)
        hL, hR = skirt(C, f, flare, sc)
        mid = (hL + hR) / 2
        for ff in (0.38, 0.7):
            a, b = up((-134, -36)) * (1 - ff) + hL * ff, up((134, -36)) * (1 - ff) + hR * ff
            pt.line([a, (a + b) / 2 + (0, 16), b], LINE * 0.55, smooth=True)
        pt.blob(up(tor_poly(C, 130, 134)), sc, n=8)
        if not back:
            pt.line(up([(cx, -T + 30), (cx + 4, -T * 0.5), (cx, -T * 0.12)]), LINE * 0.6, smooth=True)
            pt.line(up([(-110 + 16 * k, -T * 0.34), (cx, -T * 0.22), (112 - 20 * k, -T * 0.34)]), LINE * 0.6, smooth=True)
            for x in (-80, 84):
                pt.dot(*up((x + 20 * k, -T + 60)), 8, IRON)
        pt.shape(up([(-74 + 16 * k, -T - 26), (80 - 10 * k, -T - 26), (90 - 10 * k, -T + 22), (-84 + 16 * k, -T + 22)]),
                 sc, LINE * 0.8)
        belt(C, col=LEATHER, y0=-16, y1=8)
    elif g == "lamellar":
        lace = trim or BLUE
        hL, hR = skirt(C, f, flare, col)
        tl, tr = up((-134 + 14 * k, -36)), up((134 - 20 * k, -36))
        for i in range(1, 4):
            u = i / 4
            a, b = tl + (tr - tl) * u, hL + (hR - hL) * u + (0, 14)
            pt.line([a, b], LINE * 0.7)
        for ff in (0.35, 0.68):
            a, b = tl * (1 - ff) + hL * ff, tr * (1 - ff) + hR * ff
            pt.line([a, (a + b) / 2 + (0, 12), b], LINE * 0.5, smooth=True)
            _lace_ticks(pt, a, b, lace, 7)
        pt.blob(up(tor_poly(C, 130, 136)), col, n=8)
        rows = [-T * 0.82, -T * 0.64, -T * 0.46, -T * 0.28, -T * 0.1]
        for y in rows:
            a, b = up((-128 + 16 * k, y)), up((132 - 22 * k, y))
            pt.line([a, b], LINE * 0.55)
            _lace_ticks(pt, up((-110 + 16 * k, y - 24)), up((112 - 22 * k, y - 24)), lace, 8)
        pt.shape(up([(-80 + 16 * k, -T + 2), (86 - 12 * k, -T + 2), (96 - 12 * k, -T * 0.86), (-90 + 16 * k, -T * 0.86)]),
                 dkc, LINE * 0.8)
        belt(C, col=D.get("belt", dkc), style=D.get("belt_style", "sash"))
    elif g == "segmentata":
        tun = D.get("tunic", RED)
        hL, hR = skirt(C, f, flare, tun)
        sc = D.get("steel", col)
        pt.blob(up(tor_poly(C, 128, 134)), sc, n=8)
        for y in np.linspace(-T * 0.58, -T * 0.08, 5):
            pt.line(up([(-130 + 16 * k, y), (cx, y + 14), (134 - 22 * k, y)]), LINE * 0.6, smooth=True)
        if not back:
            pt.line(up([(cx, -T + 10), (cx, -T * 0.6)]), LINE * 0.55)
            for x in (-40, 50):
                pt.dot(*up((cx + x, -T * 0.78)), 9, GOLD)
            for i, x in enumerate((-36, -12, 12, 36)):     # apron (balteus) strips with studs
                a, b = up((cx + x, 14)), up((cx + x * 1.2, 14)) + (0, C.leg_len * f * 0.82)
                pt.stroke([a, b], LEATHER, 20, LINE * 0.6, shade=False)
                for u in (0.35, 0.7):
                    q = a + (b - a) * u
                    pt.dot(q[0], q[1], 7, GOLD)
                pt.ell(b[0], b[1], 14, 12, GOLD, LINE * 0.5)
        pt.blob(up([(-90 + 16 * k, -T + 20), (-60, -T - 30), (70, -T - 30), (96 - 12 * k, -T + 20), (cx, -T + 40)]),
                D.get("scarf", RED), n=6)
        belt(C, col=LEATHER, buckle=GOLD, y0=-14, y1=14)
    elif g == "coat":
        hL, hR = skirt(C, f, flare, col, split=70)
        pt.blob(up(tor_poly(C, 130, 134)), col, n=8)
        if not back:
            vest = D.get("vest", dkc)
            pt.shape(up([(cx - 50, -T + 2), (cx + 50, -T + 2), (cx + 44, -10), (cx, 14), (cx - 44, -10)]), vest, LINE * 0.8)
            for y in (-T * 0.62, -T * 0.42, -T * 0.22):
                pt.dot(*up((cx, y)), 10, D.get("trim", GOLD))
            for sg in (-1, 1):
                pt.shape(up([(cx + sg * 48, -T + 2), (cx + sg * 100, -T + 18), (cx + sg * 56, -T * 0.42)]), dkc, LINE * 0.8)
            pt.shape(up([(cx - 40, -T - 30), (cx, -T + 10), (cx + 40, -T - 30), (cx + 44, -T + 6), (cx - 44, -T + 6)]),
                     WHITE, LINE * 0.7)
            tie = D.get("tie", BLACK)
            pt.shape(up([(cx - 34, -T - 10), (cx, -T + 6), (cx + 34, -T - 10), (cx + 34, -T + 22), (cx, -T + 8),
                         (cx - 34, -T + 22)]), tie, LINE * 0.6)
        else:
            pt.line(up([(cx, -T * 0.3), (cx, 20)]), LINE * 0.6)
    elif g == "uniform":
        hL, hR = skirt(C, f, flare, col)
        pt.blob(up(tor_poly(C, 130, 134)), col, n=8)
        if not back:
            strap = D.get("strap")
            if strap:
                sw = C.sh_w
                pt.shape(up([(-sw + 30 + 18 * k, -T + 10), (-sw + 74 + 18 * k, -T + 10), (130 - 22 * k, -6),
                             (110 - 22 * k, 10)]), strap, LINE * 0.7)
            for y in np.linspace(-T * 0.86, -T * 0.16, 5):
                pt.dot(*up((cx, y)), 10, trim or GOLD)
        belt(C, col=D.get("belt", BLACK))
        pt.shape(up([(-62 + 12 * k, -T - 34), (70 - 8 * k, -T - 34), (76 - 8 * k, -T + 12), (-68 + 12 * k, -T + 12)]),
                 dkc, LINE * 0.8)
    elif g == "kilt":
        hL, hR = skirt(C, f, flare, col)
        if not back:
            hm = (hL + hR) / 2
            a, b = up((cx - 40, 10)), up((cx + 44, 10))
            pt.shape([a, b, hm + (70, -6), hm + (-60, -6)], col, LINE * 0.8)
            for u in (0.25, 0.5, 0.75):
                pt.line([a + (b - a) * u, hm + (-60 + 130 * u, -8)], LINE * 0.45)
        pt.blob(up(tor_poly(C, 122, 126)), SKIN, n=8)
        belt(C, col=D.get("belt", GOLD), buckle=D.get("belt", GOLD), y0=-12, y1=16)
        if not back:   # broad collar
            nx, ny = cx - 2, -T - 12
            for r, cc in ((150, D.get("trim", GOLD)), (118, BLUE), (88, RED_DK), (62, D.get("trim", GOLD))):
                pt.shape(up(np.vstack([ellipse_pts(nx, ny, r * 0.95, r * 0.74, 0, 40, 0.1, math.pi - 0.1)])), cc,
                         LINE * 0.6, shade=False)
    if D.get("cape_trim") == "ermine" and D.get("cape") and not back:   # ermine shoulder cape
        sw = C.sh_w
        pt.blob(up([(-sw - 10 + 18 * k, -T + 40), (-sw + 30, -T - 10), (sw - 30, -T - 10), (sw + 10 - 26 * k, -T + 40),
                    (sw - 30, -T * 0.68), (cx, -T * 0.62), (-sw + 30, -T * 0.68)]), WHITE, n=6)
        for x, y in ((-80, -0.8), (-20, -0.72), (40, -0.8), (90, -0.72), (-100, -0.9)):
            _ermine_spot(pt, up((x + 20 * k, T * y)), 1.0)


def _hem_band(C, hL, hR, col):
    hm = (hL + hR) / 2 + np.array([0, 14])
    poly = np.vstack([crom([hL, hm, hR], False, 6), crom([hR + (0, -34), hm + (0, -34), hL + (0, -34)], False, 6)])
    C.pt.shape(poly, col, LINE * 0.7, shade=False)


def _neckline(C, trim):
    if C.back:
        return
    pt, up, T, k = C.pt, C.up, C.T, C.k
    cx = 10 + 30 * k
    if trim:
        pt.shape(up(ellipse_pts(cx, -T + 2, 74, 34, 0, 30, 0, math.pi)), trim, LINE * 0.7, shade=False)
    pt.line(up([(cx - 34, -T + 8), (cx, -T + 70), (cx + 34, -T + 8)]), LINE * 0.6)


def _lace_ticks(pt, a, b, col, n):
    d = b - a
    nrm = _perp(_n(d))
    for u in np.linspace(0.08, 0.92, n):
        q = a + d * u
        pt.line([q - nrm * 9, q + nrm * 9], LINE * 0.6, col)


# ------------------------------------------------------------------------------------------------- arms + hands
def arm(C, side, sh, el, wr, kind, handfn):
    """sleeve, held prop (under/over the hand), hand. Returns the hand kind used."""
    D, pt = C.D, C.pt
    held = C.held(side)
    af = math.atan2(*(wr - el)[::-1])
    if held != "none" and kind == "mitt":
        kind = "fist"
    if held != "none" and held not in SHIELDS:
        prop(C, held, side)
    sleeve(C, side, sh, el, wr)
    handfn(af, kind)
    if held in SHIELDS:
        if C.fac == "r" and side > 0:
            C.defer.append(side)
        else:
            prop(C, held, side)
    return kind


def deferred(C):
    for side in C.defer:
        prop(C, C.held(side), side)
    C.defer = []


def sleeve(C, side, sh, el, wr):
    D, pt, g = C.D, C.pt, C.garment
    col = D.get("sleeve", D.get("jacket", RED))
    if g in ("puffy", "zip"):     # the climbers' sleeves (same drawing as toon.py)
        pt.stroke([sh, el, wr], D["jacket"], 84 if g == "puffy" else 74, line=LINE)
        if g == "puffy":
            for f in (0.45, 1.4):
                a0, a1 = (sh, el) if f < 1 else (el, wr)
                c = a0 + (a1 - a0) * (f if f < 1 else f - 1)
                n = _perp(_n(a1 - a0))
                pt.line([c - n * 30, c + n * 30], LINE * 0.6)
        return
    sty = D.get("sleeves", C.g.get("sleeves", "long"))
    if g == "mail":
        col = D.get("mail", STEEL)
    if g == "plate":
        col = D.get("steel", D.get("jacket", STEEL))
    if sty in ("long", "mail", "plate"):
        pt.stroke([sh, el, wr], col, 76 if sty == "long" else 80)
    elif sty == "short":
        pt.stroke([sh, el, wr], SKIN, 62)
        pt.stroke([sh, sh + (el - sh) * 0.62], D.get("tunic", col) if g == "segmentata" else col, 84)
    elif sty == "none":
        pt.stroke([sh, el, wr], SKIN, 62)
    elif sty == "wide":
        pt.stroke([sh, el, wr], col, 80)
        a = el + (wr - el) * 0.05
        b = wr - (wr - el) * 0.16
        d = _n(b - a)
        n = _perp(d)
        g_ = np.array([0.0, 1.0])
        nd = n if np.dot(n, g_) >= 0 else -n          # normal on the downhill side
        droop = 60 + 70 * max(0.0, 1 - abs(np.dot(d, g_)))
        poly = [a - nd * 40, b - nd * 56, b + nd * 58, b + nd * 58 + g_ * droop * 0.7 + d * -10,
                (a + b) / 2 + nd * 44 + g_ * droop, a + nd * 40]
        pt.blob(poly, col, n=6)
        pt.line([b - nd * 54, b + nd * 56], LINE * 0.9, D.get("trim") or dk(col))
    # decorations
    if sty == "mail":
        _mail_rows(pt, sh, el, 2)
        _mail_rows(pt, el, wr, 2)
    if sty == "plate":
        pt.ell(el[0], el[1], 46, 40, col, LINE * 0.9)
        pt.dot(el[0], el[1], 9, IRON)
        d = _n(el - sh)
        pc = sh + d * 22
        pt.blob(rot(np.array([(-70, -20), (-30, -66), (50, -62), (78, -10), (60, 40), (-60, 40)], float),
                    math.atan2(d[1], d[0]) - math.pi / 2) + pc, col, n=6)
        for o in (12, 34):
            a = pc + d * o
            nn = _perp(d)
            pt.line([a - nn * 60, a + d * 8, a + nn * 60], LINE * 0.5, smooth=True)
    if g == "lamellar" and D.get("sode", True):
        d = _n(el - sh)
        nn = _perp(d)
        a, b = sh - d * 26, sh + d * 150
        poly = [a - nn * 62, a + nn * 62, b + nn * 70, b - nn * 70]
        pt.shape(poly, D.get("jacket", RED), LINE)
        for u in (0.33, 0.66):
            q0, q1 = a - nn * 64 + (b - a) * u, a + nn * 64 + (b - a) * u
            pt.line([q0, q1], LINE * 0.5)
            _lace_ticks(pt, q0 - d * 22, q1 - d * 22, D.get("trim") or BLUE, 4)
    if g == "segmentata":
        d = _n(el - sh)
        nn = _perp(d)
        for i, o in enumerate((-30, 0, 30)):
            q = sh + d * (o + 10)
            pt.shape([q - nn * 56 - d * 18, q + nn * 56 - d * 18, q + nn * 52 + d * 16, q - nn * 52 + d * 16],
                     D.get("steel", STEEL), LINE * 0.7)
    if g == "uniform":
        d = _n(el - sh)
        nn = _perp(d)
        if D.get("epaulettes", True):
            q = sh + d * 6
            pt.shape([q - nn * 50 - d * 22, q + nn * 50 - d * 22, q + nn * 54 + d * 14, q - nn * 54 + d * 14],
                     D.get("trim", GOLD), LINE * 0.7)
            for u in np.linspace(-0.8, 0.8, 5):
                pt.line([q + nn * 50 * u + d * 14, q + nn * 52 * u + d * 36], LINE * 0.45, D.get("trim", GOLD))
    if g in ("uniform", "coat") and sty == "long":
        d = _n(wr - el)
        nn = _perp(d)
        q = wr - d * 34
        pt.shape([q - nn * 40, q + nn * 40, q + nn * 40 + d * 22, q - nn * 40 + d * 22],
                 D.get("jacket_dk", dk(col)), LINE * 0.6, shade=False)
    if g == "kilt":
        d = _n(el - sh)
        nn = _perp(d)
        q = sh + d * 100
        pt.shape([q - nn * 34, q + nn * 34, q + nn * 34 + d * 22, q - nn * 34 + d * 22], D.get("trim", GOLD),
                 LINE * 0.6, shade=False)


# ------------------------------------------------------------------------------------------------- held props
def _R(c, a):
    return lambda pts: rot(np.asarray(pts, float), a) + c


def _rect(x0, x1, w):
    return [(x0, -w / 2), (x1, -w / 2), (x1, w / 2), (x0, w / 2)]


def prop(C, kind, side):
    pt, D = C.pt, C.D
    c, a = C.prop_frame(side)
    R = _R(c, a)
    tag = "L" if side < 0 else "R"
    tip = None
    if kind == "sword":
        pt.ell(*R([(-62, 0)])[0], 22, 22, GOLD, LINE * 0.8)
        pt.shape(R(_rect(-50, 46, 28)), LEATHER, LINE * 0.8)
        pt.shape(R([(64, -20), (420, -18), (480, 0), (420, 18), (64, 20)]), STEEL, LINE * 0.9)
        pt.line(R([(80, 0), (400, 0)]), LINE * 0.4, STEEL_DK)
        pt.shape(R(_rect(40, 66, 160)), GOLD, LINE * 0.8)
        tip = R([(480, 0)])[0]
    elif kind == "gladius":
        pt.ell(*R([(-62, 0)])[0], 26, 26, BRONZE, LINE * 0.8)
        pt.shape(R(_rect(-46, 40, 30)), WOOD, LINE * 0.8)
        pt.shape(R([(56, -24), (230, -28), (290, -18), (330, 0), (290, 18), (230, 28), (56, 24)]), STEEL, LINE * 0.9)
        pt.shape(R(_rect(38, 60, 80)), BRONZE, LINE * 0.8)
        tip = R([(330, 0)])[0]
    elif kind == "katana":
        blade = [(64, -15)] + [(64 + u * 470, -15 - 40 * u * u) for u in np.linspace(0.1, 1, 8)] + \
                [(540, -60)] + [(64 + u * 470, 13 - 40 * u * u) for u in np.linspace(1, 0.1, 8)] + [(64, 15)]
        pt.shape(R(blade), STEEL, LINE * 0.9)
        pt.shape(R(_rect(-120, 48, 32)), WHITE, LINE * 0.8)
        for x in (-90, -50, -10, 30):
            pt.line(R([(x - 14, -14), (x + 14, 14)]), LINE * 0.5)
            pt.line(R([(x - 14, 14), (x + 14, -14)]), LINE * 0.5)
        pt.shape(R(ellipse_pts(54, 0, 12, 44, 0, 24)), BLACK, LINE * 0.8)
        tip = R([(540, -60)])[0]
    elif kind in ("spear", "staff"):
        L0, L1 = (-450, 660) if kind == "spear" else (-450, 560)
        pt.stroke(R([(L0, 0), (L1, 0)]), WOOD, 22, LINE * 0.8)
        if kind == "spear":
            pt.shape(R([(650, -16), (700, -32), (810, 0), (700, 32), (650, 16)]), STEEL, LINE * 0.9)
            pt.shape(R(_rect(630, 660, 30)), IRON, LINE * 0.7)
            tip = R([(810, 0)])[0]
        else:
            tip = R([(L1, 0)])[0]
    elif kind == "crook":
        pt.stroke(R([(-160, 0), (260, 0), (330, -20), (346, -70), (306, -100)]), GOLD, 22, LINE * 0.8, smooth=True)
        for x in (-60, 20, 100, 180, 260):
            pt.line(R([(x, -11), (x, 11)]), LINE * 1.3, BLUE)
        tip = R([(370, -70)])[0]
    elif kind == "axe":
        pt.stroke(R([(-110, 0), (360, 0)]), WOOD, 26, LINE * 0.8)
        pt.blob(R([(296, -14), (346, -14), (380, -70), (400, -150), (330, -140), (292, -60)]), STEEL, LINE * 0.9, n=6)
        tip = R([(400, -150)])[0]
    elif kind in ("hammer", "mallet"):
        pt.stroke(R([(-90, 0), (300, 0)]), WOOD, 26, LINE * 0.8)
        if kind == "hammer":
            pt.shape(R([(270, -96), (330, -96), (334, 44), (314, 70), (286, 70), (266, 44)]), IRON, LINE * 0.9)
            pt.line(R([(270, -60), (330, -60)]), LINE * 0.5)
        else:
            pt.blob(R([(250, -100), (350, -100), (356, 100), (244, 100)]), WOOD_DK, LINE * 0.9, n=4)
            for x in (268, 332):
                pt.line(R([(x, -96), (x, 96)]), LINE * 0.5)
        tip = R([(300, -96)])[0]
    elif kind == "mace":
        pt.stroke(R([(-80, 0), (260, 0)]), WOOD_DK, 24, LINE * 0.8)
        for a2 in np.linspace(0, math.pi * 2, 6, endpoint=False):
            d = np.array([math.cos(a2), math.sin(a2)])
            pt.shape(R([(300, 0) + d * 10 + _perp(d) * 18, (300, 0) + d * 70, (300, 0) + d * 10 - _perp(d) * 18]),
                     STEEL, LINE * 0.7)
        pt.ell(*R([(300, 0)])[0], 40, 40, STEEL, LINE * 0.8)
        tip = R([(300, 0)])[0]
    elif kind in BOWS:
        b = C.bow
        L = b["L"]
        bend = 150 if b["drawn"] else 90
        limb = [(L, -bend), (L * 0.55, -bend * 0.25), (0, 0), (-L * 0.55, -bend * 0.25), (-L, -bend)]
        pts = crom(limb, False, 10)
        pt.stroke(R(pts), WOOD if kind == "longbow" else WOOD_DK, 22, LINE * 0.8, shade=False)
        if not b["drawn"]:
            pt.line(b["tips"], LINE * 0.35)
        pt.shape(R(_rect(-36, 36, 34)), LEATHER, LINE * 0.6, shade=False)
        tip = b["tips"][0]
    elif kind == "arrow":
        b = C.bow
        if b is not None and b["side"] != side:
            nock = c
            d = _n(b["c"] - nock)
            ang = math.atan2(d[1], d[0])
            pt.line([b["tips"][0], nock], LINE * 0.35)
            pt.line([b["tips"][1], nock], LINE * 0.35)
            Ra = _R(nock, ang)
            ln = float(np.hypot(*(b["c"] - nock))) + 90
        else:
            Ra, ln = R, 520
        pt.stroke(Ra([(-10, 0), (ln, 0)]), WOOD, 9, LINE * 0.6, shade=False)
        pt.shape(Ra([(ln - 6, -16), (ln + 44, 0), (ln - 6, 16)]), STEEL, LINE * 0.6)
        for sg in (-1, 1):
            pt.shape(Ra([(4, 0), (60, 0), (40, sg * 22), (0, sg * 22)]), WHITE, LINE * 0.5, shade=False)
        tip = Ra([(ln + 44, 0)])[0]
    elif kind == "crossbow":
        pt.blob(R([(-170, -18), (40, -26), (290, -18), (290, 18), (40, 26), (-60, 40), (-170, 46)]), WOOD, LINE * 0.9,
                n=4)
        prod = [(240, -170), (268, -110), (280, 0), (268, 110), (240, 170)]
        pt.stroke(R(crom(prod, False, 8)), IRON, 18, LINE * 0.7, shade=False)
        pt.line(R([(240, -168), (110, 0), (240, 168)]), LINE * 0.35)
        pt.stroke(R([(110, -6), (330, -6)]), WOOD_DK, 9, LINE * 0.5, shade=False)
        pt.shape(R([(326, -20), (360, -6), (326, 8)]), STEEL, LINE * 0.5)
        tip = R([(360, -6)])[0]
    elif kind in SHIELDS:
        tip = shield(C, kind, side)
    elif kind == "scroll":
        pt.shape(R(_rect(-20, 70, 210)), PAPER, LINE * 0.8)
        pt.shape(R(_rect(-6, 28, 214)), RED, LINE * 0.6, shade=False)
        tip = R([(70, 0)])[0]
    elif kind == "scroll_open":
        if side < 0 and C.held(1) == "scroll_open":
            pl, pr = C.arms[-1][2], C.arms[1][2]
            up_ = np.array([0, -1.0])
            h = 300
            q = [pl + up_ * (h * 0.55), pr + up_ * (h * 0.55), pr - up_ * (h * 0.45), pl - up_ * (h * 0.45)]
            pt.shape(q, PAPER, LINE * 0.8)
            for u in np.linspace(0.18, 0.82, 5):
                a_ = q[0] + (q[3] - q[0]) * u
                b_ = q[1] + (q[2] - q[1]) * u
                L_ = b_ - a_
                pts = [a_ + L_ * t + (0, 6 * math.sin(t * 40)) for t in np.linspace(0.14, 0.86, 18)]
                pt.line(pts, LINE * 0.45, (70, 70, 80))
            for pp in (pl, pr):
                pt.shape([pp + up_ * (h * 0.62) - (16, 0), pp + up_ * (h * 0.62) + (16, 0),
                          pp - up_ * (h * 0.52) + (16, 0), pp - up_ * (h * 0.52) - (16, 0)], WOOD, LINE * 0.7)
    elif kind == "book":
        u_ = _n(R([(1, 0)])[0] - c)           # up along the book
        r_ = -_perp(u_)
        o = c + u_ * 110
        cov = D.get("book", RED_DK)
        pt.shape([o - r_ * 170 - u_ * 120, o + r_ * 170 - u_ * 120, o + r_ * 176 + u_ * 116, o - r_ * 176 + u_ * 116],
                 cov, LINE * 0.8)
        for sg in (-1, 1):
            pt.shape([o + r_ * 4 * sg - u_ * 110, o + r_ * 160 * sg - u_ * 104, o + r_ * 164 * sg + u_ * 104,
                      o + r_ * 4 * sg + u_ * 96], PAPER, LINE * 0.6, shade=False)
            for v in (-50, -10, 30, 70):
                pt.line([o + r_ * 30 * sg + u_ * -v, o + r_ * 130 * sg + u_ * -v], LINE * 0.35, (90, 90, 100))
        tip = o
    elif kind == "torch":
        pt.stroke(R([(-90, 0), (250, 0)]), WOOD, 30, LINE * 0.8)
        pt.shape(R(_rect(220, 290, 46)), WOOD_DK, LINE * 0.8)
        fc = R([(300, 0)])[0]
        _flame(pt, fc, 1.0)
        tip = fc
    elif kind == "flag":
        pt.stroke(R([(-340, 0), (720, 0)]), WOOD, 20, LINE * 0.8)
        pt.ell(*R([(735, 0)])[0], 20, 20, GOLD, LINE * 0.7)
        her = D.get("heraldry") or dict(field=RED, device="none")
        cloth = [(700, -10), (716, -120), (690, -230), (706, -350), (450, -350), (436, -230), (460, -120),
                 (440, -10)]
        q = R(cloth)
        pt.shape(R(crom(cloth[:4], False, 6).tolist() + crom(cloth[4:], False, 6).tolist()), her["field"], LINE * 0.8)
        if her.get("device", "none") != "none":
            device(pt, her, R([(575, -180)])[0], 70, a + math.pi / 2)
        tip = R([(735, 0)])[0]
    elif kind == "banner":
        pt.stroke(R([(-400, 0), (960, 0)]), WOOD, 20, LINE * 0.8)
        top = R([(900, 0)])[0]
        bar_d = R([(900, 1)])[0] - top
        pt.stroke([top - bar_d * 150, top + bar_d * 150], WOOD, 16, LINE * 0.7)
        her = D.get("heraldry") or dict(field=RED, device="none")
        dn = np.array([0, 1.0])
        rt = np.array([1.0, 0])
        cl = [top - rt * 130 + dn * 8, top + rt * 130 + dn * 8, top + rt * 130 + dn * 300, top + dn * 330,
              top - rt * 130 + dn * 300]
        pt.shape(cl, her["field"], LINE * 0.8)
        for u in np.linspace(-110, 110, 6):
            pt.line([top + rt * u + dn * 302 - rt * 0, top + rt * u + dn * 336], LINE * 0.5, GOLD)
        if her.get("device", "none") != "none":
            device(pt, her, top + dn * 160, 74, 0.0)
        pt.ell(*R([(975, 0)])[0], 22, 22, GOLD, LINE * 0.7)
        tip = top
    elif kind == "quill":
        pt.line(R([(-30, 0), (90, 0)]), LINE * 0.8)
        pt.blob(R([(40, 0), (120, -30), (240, -40), (300, -20), (200, 6), (100, 10)]), WHITE, LINE * 0.7, n=6)
        pt.line(R([(60, 0), (280, -24)]), LINE * 0.4)
        tip = R([(-30, 0)])[0]
    elif kind in ("lantern", "paper_lantern"):
        dn = np.array([0, 1.0])
        top = c + dn * 30
        if kind == "lantern":
            body = top + dn * 150
            pt.line([c, top + dn * 50], LINE * 0.6)
            pt.shape([body + (-56, -60), body + (56, -60), body + (50, 70), body + (-50, 70)], FLAME_IN, LINE * 0.8,
                     shade=False)
            pt.ell(*(body + (0, 6)), 18, 30, FLAME, 0, shade=False)
            for x in (-56, 0, 56):
                pt.line([body + (x, -60), body + (x * 0.9, 70)], LINE * 0.6)
            pt.shape([body + (-70, -60), body + (0, -110), body + (70, -60)], IRON, LINE * 0.8)
            pt.shape([body + (-66, 70), body + (66, 70), body + (66, 92), body + (-66, 92)], IRON, LINE * 0.8)
            tip = body
        else:
            body = top + dn * 150
            pt.line([c, top + dn * 40], LINE * 0.6)
            pt.ell(body[0], body[1], 86, 104, RED, LINE * 0.9)
            for x in (-44, 0, 44):
                pt.line([body + (x, -100 + abs(x) * 0.4), body + (x * 1.2, 0), body + (x, 100 - abs(x) * 0.4)],
                        LINE * 0.5, smooth=True)
            for y in (-104, 104):
                pt.shape([body + (-40, y - 12), body + (40, y - 12), body + (40, y + 12), body + (-40, y + 12)],
                         GOLD, LINE * 0.6)
            pt.line([body + (0, 116), body + (0, 190)], LINE * 1.4, RED)
            tip = body
    elif kind == "wrench":
        pt.stroke(R([(-60, 0), (240, 0)]), STEEL, 34, LINE * 0.8)
        pt.blob(R([(230, -40), (300, -60), (340, -36), (300, -22), (300, 22), (340, 36), (300, 60), (230, 40)]),
                STEEL, LINE * 0.8, n=3)
        tip = R([(320, 0)])[0]
    if tip is not None:
        C.joints["tip" + tag] = np.asarray(tip, float)
        C.joints["grip" + tag] = c


def _flame(pt, fc, s):
    up_ = np.array([0, -1.0])
    rt = np.array([1.0, 0])
    outer = [fc + rt * 50 * s, fc + rt * 40 * s + up_ * 90 * s, fc + rt * 6 * s + up_ * 190 * s,
             fc - rt * 30 * s + up_ * 110 * s, fc - rt * 52 * s + up_ * 40 * s, fc + up_ * -26 * s]
    pt.blob(outer, FLAME, LINE * 0.8, n=6, shade=False)
    inner = [fc + rt * 24 * s, fc + rt * 16 * s + up_ * 70 * s, fc + up_ * 120 * s, fc - rt * 22 * s + up_ * 50 * s,
             fc + up_ * -4 * s]
    pt.blob(inner, FLAME_IN, 0, n=6, shade=False)


def shield(C, kind, side):
    pt, D = C.pt, C.D
    sh_, el, wr = C.arms[side]
    c0, a = C.prop_frame(side)
    c = el + (wr - el) * 0.62
    top = np.array([math.cos(a), math.sin(a)])
    u = np.array([-top[1], top[0]])           # shield's right
    v = -top                                   # shield's down
    sq = 0.78 if C.fac == "r" else 1.0
    if C.back:
        sq = 0.9

    def S(pts):
        pts = np.asarray(pts, float)
        return c + np.outer(pts[:, 0] * sq, u) + np.outer(pts[:, 1], v)

    her = D.get("shield_her") or D.get("heraldry") or dict(field=RED, device="none")
    if kind == "shield_round":
        poly = ellipse_pts(0, 0, 210, 210, n=60)
        fill = her["field"]
    elif kind == "shield_kite":
        poly = crom([(-150, -250), (-90, -296), (0, -306), (90, -296), (150, -250), (140, -40), (70, 180), (0, 330),
                     (-70, 180), (-140, -40)], True, 6)
        fill = her["field"]
    elif kind == "shield_heater":
        poly = np.vstack([[(-160, -200), (160, -200)], crom([(160, -200), (158, 0), (100, 150), (0, 236)], False, 6),
                          crom([(0, 236), (-100, 150), (-158, 0), (-160, -200)], False, 6)[1:]])
        fill = her["field"]
    else:   # scutum
        poly = crom([(-150, -270), (150, -270), (156, 270), (-156, 270)], True, 2)
        poly = np.array([(-150, -250), (-130, -272), (130, -272), (150, -250), (154, 250), (134, 272), (-134, 272),
                         (-154, 250)], float)
        fill = her.get("field", RED)
    W = S(poly)
    if C.back:   # we see the inside: wood/leather and the strap
        pt.shape(W, WOOD, LINE)
        pt.line(S([(-80, -40), (80, -40)]), LINE * 1.6, LEATHER)
        return c
    pt.shape(W, fill, LINE)
    if her.get("device", "none") != "none" and kind != "scutum":
        try:
            device(pt, her, S([(0, -20 if kind != "shield_round" else 0)])[0], 120 * (0.9 if kind == "shield_round"
                                                                                       else 1.0),
                   math.atan2(u[1], u[0]), clip=W)
        except cv2.error:
            pass
    if kind == "scutum":
        pt.shape(S([(-130, -252), (130, -252), (134, 252), (-134, 252)]), fill, LINE * 0.0)
        pt.line(S([(-130, -248), (130, -248), (134, 248), (-134, 248), (-130, -248)]), LINE * 1.0, GOLD)
        device(pt, dict(device="wings", color=her.get("color", GOLD)), c, 100, math.atan2(u[1], u[0]))
        pt.ell(c[0], c[1], 56 * sq, 56, BRONZE, LINE * 0.9)
        pt.dot(c[0] - 12, c[1] - 12, 10, WHITE)
    if kind == "shield_round":
        if her.get("device", "none") == "none":
            for x in (-70, 70):
                pt.line(S([(x, -196), (x, 196)]), LINE * 0.5)
        pt.line(np.vstack([W, W[:1]]), LINE * 1.5, IRON)
        pt.shape(S(ellipse_pts(0, 0, 54, 54, n=30)), STEEL, LINE * 0.9)
    pt.line(np.vstack([W, W[:2]]), LINE * 0.9)     # crisp outer edge over the device
    return c


# ------------------------------------------------------------------------------------------------- head parts
def head_back(C, over=False):
    """parts behind the egg: long hair, hood, nemes, neck guards, hat wings. In the back view the nemes and neck
    guards cover the back of the head, so they are drawn again over the egg (over=True, from head_front)."""
    D, pt, H, rx, ry, hw, back = C.D, C.pt, C.H, C.rx, C.ry, C.hw, C.back
    hy = C.hy
    if back and over != (hw in ("nemes", "kabuto", "galea")):
        return
    st = D.get("style", "short")
    hc = D.get("hair", BLACK)
    if st == "long" and hw not in ("greathelm", "nemes", "hood"):
        pt.blob(H([(-rx - 18, -60), (-rx * 0.6, -ry - 10), (rx * 0.6, -ry - 10), (rx + 18, -60), (rx + 30, ry + 60),
                   (rx + 6, ry + 160), (0, ry + 140), (-rx - 6, ry + 160), (-rx - 30, ry + 60)]), hc, n=6)
    if hw == "hood":
        col = D.get("hat", (70, 90, 110))
        pt.blob(H([(-rx - 50, ry * 0.5), (-rx - 54, -ry * 0.4), (-rx * 0.5, -ry - 60), (rx * 0.5, -ry - 60),
                   (rx + 54, -ry * 0.4), (rx + 50, ry * 0.5), (rx + 80, ry + 90), (0, ry + 120), (-rx - 80, ry + 90)]),
                col, n=6)
    elif hw == "nemes":
        a, b = D.get("hat", BLUE), D.get("hat2", GOLD)
        poly = [(-rx - 10, -ry * 0.6 + hy), (rx + 10, -ry * 0.6 + hy), (rx + 70, ry * 0.3), (rx + 96, ry + 110),
                (-rx - 96, ry + 110), (-rx - 70, ry * 0.3)]
        pt.shape(H(crom(poly, True, 4)), b, LINE)
        for y in np.linspace(-ry * 0.2, ry + 90, 7):
            w = rx + 50 + (y + ry * 0.2) * 0.2
            pt.line(H([(-w, y), (w, y)]), LINE * 1.6, a)
    elif hw == "kabuto":
        col = D.get("hat", BLACK)
        for i, (y, w0, w1) in enumerate(((-56, rx + 10, rx + 44), (-12, rx + 40, rx + 76), (32, rx + 70, rx + 106))):
            pt.shape(H([(-w0, y - 44 + hy), (w0, y - 44 + hy), (w1, y + 8 + hy), (-w1, y + 8 + hy)]), col, LINE)
            _lace_ticks(pt, H([(-w0 - 6, y - 16 + hy)])[0], H([(w0 + 6, y - 16 + hy)])[0], D.get("trim") or BLUE, 10)
    elif hw == "galea":
        col = D.get("hat", STEEL)
        if back:
            pt.shape(H([(-rx - 14, -60 + hy), (rx + 14, -60 + hy), (rx + 40, 10 + hy), (-rx - 40, 10 + hy)]), col, LINE)
        elif C.k:
            pt.shape(H([(-rx + 10, -70 + hy), (-rx - 64, -6 + hy), (-rx - 40, 22 + hy), (-rx + 30, -16 + hy)]), col,
                     LINE)
    elif hw == "wushamao" and not back:
        col = D.get("hat", BLACK)
        if D.get("hat_wings", "long") == "long":
            L = (rx + 290) * (0.7 if C.k else 1.0)
            for sg in (-1, 1):
                pt.stroke(H([(sg * (rx - 20), -96 + hy), (sg * L, -100 + hy)]), col, 20, LINE * 0.7, shade=False)
                pt.ell(*H([(sg * L, -100 + hy)])[0], 24, 30, col, LINE * 0.7, C.ha)
        else:
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 10), -104 + hy), (sg * (rx + 60), -150 + hy), (sg * (rx + 130), -140 + hy),
                           (sg * (rx + 110), -96 + hy), (sg * (rx + 30), -86 + hy)]), col, LINE * 0.8, n=4)
    elif hw == "chinese_helm":
        col = D.get("hat", STEEL)
        pt.blob(H([(-rx - 30, -60 + hy), (rx + 30, -60 + hy), (rx + 50, 70 + hy), (-rx - 50, 70 + hy)]),
                D.get("hat2", RED_DK), n=3)


def head_front(C):
    """new hair styles, then headwear (both over the egg)."""
    D = C.D
    st = D.get("style", "short")
    if st not in ("messy", "beanie", "none") and C.hw not in ("greathelm",):
        hair2(C, st)
    if C.back:
        head_back(C, over=True)
    hw = C.hw
    if hw not in ("none", "beanie_legacy"):
        headwear(C, hw)


def hair2(C, st):
    D, pt, H, rx, ry, k, back, hw = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back, C.hw
    hc = D.get("hair", BLACK)
    sh = 20 * k
    covered = hw in ("nemes", "hood", "turban", "kabuto", "galea", "viking", "nasal", "kettle", "chinese_helm",
                     "wushamao", "tophat", "tricorn", "kasa")
    if back:
        if st in ("short", "long", "bun", "topknot"):
            low = ry * 0.72 if st != "long" else ry + 120
            pt.blob(H([(-rx - 8, low), (-rx - 14, -60), (-rx * 0.7, -ry + 6), (0, -ry - 20), (rx * 0.7, -ry + 6),
                       (rx + 14, -60), (rx + 8, low), (0, low + 30)]), hc, n=6)
        elif st in ("bald", "tonsure"):
            pt.blob(H([(-rx - 4, -20), (rx + 4, -20), (rx - 4, 60), (0, 80), (-rx + 4, 60)]), hc, n=6)
        if st == "bun" and not covered:
            pt.ell(*H([(0, -ry - 30)])[0], 56, 50, hc, LINE, C.ha)
        if st == "topknot":
            pt.shape(H([(-22, -ry - 50), (22, -ry - 50), (22, -ry + 10), (-22, -ry + 10)]), hc, LINE)
        return
    if st == "short":
        if covered:
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 6), -70), (sg * (rx + 12), -66), (sg * (rx + 10), 10), (sg * (rx - 16), 0)]),
                        hc, LINE * 0.9, n=4)
            return
        pt.blob(H([(-rx - 6, 10), (-rx - 16, -60), (-rx * 0.75, -ry + 4), (0, -ry - 26), (rx * 0.75, -ry + 4),
                   (rx + 16, -60), (rx + 6, 10), (rx - 16, 4), (rx - 26, -54), (rx * 0.4 + sh, -82), (sh + 10, -70),
                   (-rx * 0.35 + sh, -92), (-rx + 26, -54), (-rx + 16, 4)]), hc, n=5)
    elif st == "long":
        if not covered:
            pt.blob(H([(-rx - 6, 10), (-rx - 16, -60), (-rx * 0.75, -ry + 4), (0, -ry - 24), (rx * 0.75, -ry + 4),
                       (rx + 16, -60), (rx + 6, 10), (rx - 22, -40), (sh + 20, -90), (sh, -60), (-rx * 0.4, -86),
                       (-rx + 22, -40)]), hc, n=5)
        if hw not in ("hood", "nemes"):
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 30), -60), (sg * (rx + 18), -40), (sg * (rx + 30), ry * 0.6),
                           (sg * (rx + 10), ry + 60), (sg * (rx - 30), ry * 0.7), (sg * (rx - 26), 0)]), hc, LINE, n=5)
    elif st in ("bald", "tonsure", "topknot"):
        if st == "tonsure":
            pt.blob(H([(-rx - 8, 0), (-rx - 14, -80), (-rx * 0.7, -ry + 30), (0, -ry + 6), (rx * 0.7, -ry + 30),
                       (rx + 14, -80), (rx + 8, 0), (rx - 16, -10), (rx - 30, -80), (0, -ry + 44), (-rx + 30, -80),
                       (-rx + 16, -10)]), hc, n=5)
        else:
            top = -60 if st == "topknot" else -20
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 6), top), (sg * (rx + 14), top + 6), (sg * (rx + 12), 40),
                           (sg * (rx - 12), 30)]), hc, LINE * 0.9, n=4)
        if st == "topknot" and not covered:
            pt.blob(H([(-24 + sh * 0.5, -ry + 10), (24 + sh * 0.5, -ry + 10), (30 + sh * 1.5, -ry - 40),
                       (10 + sh * 2, -ry - 80), (-18 + sh, -ry - 50)]), hc, LINE, n=4)
            pt.line(H([(-22 + sh * 0.5, -ry - 8), (28 + sh, -ry - 14)]), LINE * 1.2, WHITE)
    elif st == "bun":
        if not covered:
            pt.blob(H([(-rx - 6, 10), (-rx - 16, -60), (-rx * 0.75, -ry + 4), (0, -ry - 22), (rx * 0.75, -ry + 4),
                       (rx + 16, -60), (rx + 6, 10), (rx - 22, -40), (sh + 30, -96), (sh, -106), (sh - 30, -96),
                       (-rx + 22, -40)]), hc, n=5)
            pt.ell(*H([(sh * 0.3, -ry - 36)])[0], 58, 50, hc, LINE, C.ha)
            pt.stroke(H([(-80, -ry - 50), (90, -ry - 24)]), D.get("hat2", GOLD), 12, LINE * 0.5, shade=False)
        else:
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 6), -70), (sg * (rx + 12), -66), (sg * (rx + 10), 10), (sg * (rx - 16), 0)]),
                        hc, LINE * 0.9, n=4)


def beard(C):
    D, pt, H, rx, ry, p = C.D, C.pt, C.H, C.rx, C.ry, C.p
    b = D.get("beard", "none")
    if b in (None, "none"):
        return
    col = D.get("beard_col", D.get("hair", BLACK))
    f = C.fsx
    L0 = -rx + 34 + f * 1.3          # back cheek edge (narrower in 3/4 view)
    R0 = rx - 30 + f * 0.25
    if b == "stubble":
        q = [(L0 + 6, 70), (-rx * 0.5 + f, ry - 26), (f, ry - 8), (rx * 0.5 + f, ry - 26), (R0 - 6, 70),
             (f + 56, 118), (f, 128), (f - 56, 118)]
        pt.shape(H(crom(q, True, 4)), tuple(int(0.62 * 238 + 0.38 * v) for v in col), 0, shade=False)
        return
    ln = 26 if b == "short" else 180
    pts = [(L0, 30), (L0 + 4, 100), (-rx * 0.5 + f, ry + ln * 0.45), (f + 4, ry + ln),
           (rx * 0.5 + f, ry + ln * 0.45), (R0 - 2, 100), (R0, 30), (R0 - 22, 56), (f + 66, 112), (f + 6, 128),
           (f - 60, 112), (L0 + 22, 56)]
    pt.blob(H(pts), col, n=6)
    if b == "long":
        for x in (-40, 0, 44):
            pt.line(H([(f + x, ry - 10), (f + x * 0.6, ry + ln * 0.75)]), LINE * 0.5, smooth=False)


def moustache(C):
    D, pt, H, p = C.D, C.pt, C.H, C.p
    m = D.get("moustache", "none")
    if m in (None, "none"):
        return
    col = D.get("beard_col", D.get("hair", BLACK))
    mx, my = C.fsx + 4, 56
    if m == "walrus":
        pt.blob(H([(mx - 70, my + 34), (mx - 50, my - 8), (mx, my - 14), (mx + 50, my - 8), (mx + 70, my + 34),
                   (mx + 36, my + 22), (mx, my + 18), (mx - 36, my + 22)]), col, LINE * 0.9, n=5)
    elif m == "handlebar":
        for sg in (-1, 1):
            pt.stroke(H([(mx + sg * 6, my + 4), (mx + sg * 44, my + 4), (mx + sg * 80, my - 6), (mx + sg * 94, my - 28),
                         (mx + sg * 80, my - 40)]), col, 18, LINE * 0.7, smooth=True, shade=False)
    elif m == "thin":
        for sg in (-1, 1):
            pt.stroke(H([(mx + sg * 8, my + 6), (mx + sg * 40, my + 10), (mx + sg * 58, my + 40),
                         (mx + sg * 62, my + 90)]), col, 10, LINE * 0.6, smooth=True, shade=False)


def headwear(C, hw):
    D, pt, H, rx, ry, k, back, f = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back, C.fsx
    hy = C.hy
    col = D.get("hat") or STEEL
    acc = D.get("hat2") or GOLD
    if back:
        f = 0

    def Hy(pts):
        return H([(x, y + hy) for x, y in pts])

    if hw == "beanie":
        pt.blob(Hy([(-rx - 14, -38), (-rx - 4, -120), (-60, -178), (40, -182), (rx + 2, -128), (rx + 14, -38),
                    (0, -28)]), col, n=8)
        pt.shape(Hy([(-rx - 18, -62), (rx + 18, -62), (rx + 18, -24), (-rx - 18, -24)]), col, LINE)
        for x in range(-110, 120, 30):
            pt.line(Hy([(x, -58), (x, -28)]), LINE * 0.5)
    elif hw in ("nasal", "viking", "kettle", "chinese_helm"):
        sh = f * 0.4
        if hw == "nasal":
            dome = [(-rx - 14, -50), (-rx - 6, -120), (-rx * 0.6 + sh, -ry - 20), (sh, -ry - 76),
                    (rx * 0.6 + sh, -ry - 20), (rx + 6, -120), (rx + 14, -50)]
        else:
            dome = [(-rx - 14, -50), (-rx - 6, -130), (-rx * 0.62, -ry - 24), (sh, -ry - 44), (rx * 0.62, -ry - 24),
                    (rx + 6, -130), (rx + 14, -50)]
        pt.shape(Hy(crom(dome, False, 8)), col, LINE)
        if not back:
            pt.line(Hy([(sh, -ry - 60 if hw == "nasal" else -ry - 40), (f * 0.8, -70)]), LINE * 0.5)
        if hw == "kettle":
            pt.blob(Hy([(-rx - 90, -40), (-rx - 50, -78), (rx + 50, -78), (rx + 90, -40), (rx + 40, -30),
                        (-rx - 40, -30)]), col, LINE, n=4)
        else:
            pt.shape(Hy([(-rx - 18, -84), (rx + 18, -84), (rx + 18, -44), (-rx - 18, -44)]), dk(col, 0.88), LINE)
            for x in np.linspace(-rx + 10, rx - 10, 6):
                pt.dot(*Hy([(x, -64)])[0], 7, IRON)
        if hw == "chinese_helm":
            pt.stroke(Hy([(sh, -ry - 40), (sh, -ry - 110)]), acc, 14, LINE * 0.6, shade=False)
            pt.blob(Hy([(sh, -ry - 100), (sh + 40, -ry - 60), (sh + 34, -ry - 20), (sh - 30, -ry - 24),
                        (sh - 40, -ry - 60)]), D.get("plume", RED), LINE * 0.8, n=5)
        if not back and hw == "nasal":
            pt.shape(Hy([(f - 15, -50), (f + 15, -50), (f + 13, 44), (f, 54), (f - 13, 44)]), col, LINE * 0.8)
        if not back and hw == "viking":
            for sg in (-1, 1):
                ex = f + sg * 46 * (0.82 if (f and sg < 0) else 1.0)
                q = ellipse_pts(ex, 10 - hy, 36, 30, 0, 30)
                pt.stroke(Hy(np.vstack([q, q[:2]])), col, 13, LINE * 0.6, shade=False)
            pt.shape(Hy([(f - 13, -46), (f + 13, -46), (f + 11, 46), (f - 11, 46)]), col, LINE * 0.8)
    elif hw == "greathelm":
        poly = [(-rx - 26, -ry - 10), (-rx * 0.5, -ry - 34), (rx * 0.5, -ry - 34), (rx + 26, -ry - 10),
                (rx + 30, ry * 0.8), (rx + 10, ry + 24), (-rx - 10, ry + 24), (-rx - 30, ry * 0.8)]
        pt.blob(Hy(poly), col, n=6)
        if not back:
            pt.shape(Hy([(f - rx * 0.86, -4), (f + rx * 0.82, -4), (f + rx * 0.82, 22), (f - rx * 0.86, 22)]), INK, 0)
            pt.shape(Hy([(f - 18, -ry - 20), (f + 18, -ry - 20), (f + 18, ry + 20), (f - 18, ry + 20)]), acc, LINE * 0.7)
            pt.shape(Hy([(f - rx * 0.86, -26), (f + rx * 0.84, -26), (f + rx * 0.84, -6), (f - rx * 0.86, -6)]), acc,
                     LINE * 0.7)
            for i in range(3):
                for j in range(2):
                    pt.dot(*Hy([(f + 50 + j * 30, 70 + i * 28)])[0], 7, INK)
    elif hw == "kabuto":
        pt.shape(Hy(crom([(-rx - 20, -40), (-rx - 6, -120), (-rx * 0.6, -ry - 26), (f * 0.3, -ry - 50),
                          (rx * 0.6, -ry - 26), (rx + 6, -120), (rx + 20, -40)], False, 8)), col, LINE)
        for x in (-0.6, -0.25, 0.1, 0.45):
            pt.line(Hy([(f * 0.3, -ry - 46), (x * rx * 1.4 + f * 0.3, -50)]), LINE * 0.45)
        pt.shape(Hy([(-rx - 24, -76), (rx + 24, -76), (rx + 24, -40), (-rx - 24, -40)]), col, LINE)
        if not back:
            for sg in (-1, 1):   # fukigaeshi
                pt.blob(Hy([(sg * (rx - 20), -84), (sg * (rx + 50), -110), (sg * (rx + 70), -60),
                            (sg * (rx + 20), -30)]), col, LINE, n=3)
                pt.line(Hy([(sg * (rx + 46), -104), (sg * (rx + 64), -62)]), LINE * 0.8, acc)
            pt.blob(Hy([(f - 16, -80), (f - 80, -150), (f - 110, -250), (f - 70, -230), (f, -110), (f + 70, -230),
                        (f + 110, -250), (f + 80, -150), (f + 16, -80)]), acc, LINE * 0.8, n=3)
            pt.ell(*Hy([(f, -78)])[0], 22, 22, acc, LINE * 0.7)
    elif hw == "galea":
        pt.shape(Hy(crom([(-rx - 16, -44), (-rx - 6, -120), (-rx * 0.6, -ry - 18), (f * 0.3, -ry - 34),
                          (rx * 0.6, -ry - 18), (rx + 6, -120), (rx + 16, -44)], False, 8)), col, LINE)
        pt.shape(Hy([(-rx - 18, -78), (rx + 18, -78), (rx + 18, -50), (-rx - 18, -50)]), dk(col, 0.86), LINE * 0.9)
        if not back:
            for sg in (-1, 1):
                ox = f + sg * 98 + (sg * 6 if f == 0 else -12)
                pt.blob(Hy([(ox, -52), (sg * (rx + 14) + f * 0.3, -52), (sg * (rx + 8) + f * 0.3, 50),
                            (ox + sg * 6, 96), (ox - sg * 8, 40)]), col, LINE, n=3)
                pt.dot(*Hy([(ox + sg * 26, 20)])[0], 8, BRONZE)
        crest = D.get("crest", RED)
        if crest:
            trans = D.get("crest_dir") == "trans"
            half = (190 if trans else (46 + 120 * k)) * (0.9 if back else 1.0)
            hgt = 150 if trans else 130
            cx0 = f * 0.3 - (40 * k if not trans else 0)
            base_y = -ry - 22
            arc = ellipse_pts(cx0, base_y, half, hgt, 0, 24, math.pi, 2 * math.pi)
            pt.shape(Hy(np.vstack([arc, [(cx0 + half * 0.7, base_y + 6), (cx0 - half * 0.7, base_y + 6)]])), crest,
                     LINE)
            for u in np.linspace(-0.75, 0.75, 7 if trans else 4):
                a_ = math.pi * 1.5 + u * 1.2
                pt.line(Hy([(cx0 + half * 0.25 * math.cos(a_), base_y + hgt * 0.25 * math.sin(a_)),
                            (cx0 + half * 0.85 * math.cos(a_), base_y + hgt * 0.85 * math.sin(a_))]), LINE * 0.45)
            pt.shape(Hy([(cx0 - 26, base_y - 18), (cx0 + 26, base_y - 18), (cx0 + 22, base_y + 8),
                         (cx0 - 22, base_y + 8)]), BRONZE, LINE * 0.6)
    elif hw == "crown":
        y0 = -ry + 74
        pts = [(-rx + 14, y0), (rx - 14, y0), (rx - 10, y0 - 70), (rx - 40, y0 - 50), (rx * 0.5, y0 - 120),
               (rx * 0.25, y0 - 56), (0, y0 - 140), (-rx * 0.25, y0 - 56), (-rx * 0.5, y0 - 120), (-rx + 40, y0 - 50),
               (-rx + 10, y0 - 70)]
        pt.shape(Hy([(x + f * 0.4, y) for x, y in pts]), acc, LINE)
        pt.shape(Hy([(-rx + 12 + f * 0.4, y0 - 34), (rx - 12 + f * 0.4, y0 - 34), (rx - 14 + f * 0.4, y0),
                     (-rx + 14 + f * 0.4, y0)]), dk(acc, 0.85), LINE * 0.8)
        for x, cc in ((-60, RED), (0, BLUE), (60, RED)):
            pt.ell(*Hy([(x + f * 0.4, y0 - 17)])[0], 13, 11, cc, LINE * 0.5)
        for x, y in ((rx - 10, y0 - 70), (rx * 0.5, y0 - 120), (0, y0 - 140), (-rx * 0.5, y0 - 120), (-rx + 10, y0 - 70)):
            pt.ell(*Hy([(x + f * 0.4, y - 8)])[0], 13, 13, acc, LINE * 0.6)
    elif hw == "tophat":
        pt.shape(Hy([(-rx + 26, -86), (-rx + 16, -ry - 240), (rx - 16, -ry - 240), (rx - 26, -86)]), col, LINE)
        pt.shape(Hy([(-rx + 25, -120), (rx - 25, -120), (rx - 26, -86), (-rx + 26, -86)]), acc, LINE * 0.8)
        pt.blob(Hy([(-rx - 40, -66), (-rx - 30, -96), (rx + 30, -96), (rx + 40, -66), (0, -58)]), col, LINE, n=4)
    elif hw == "tricorn":
        pt.blob(Hy([(-rx * 0.7, -110), (-rx * 0.55, -ry - 50), (rx * 0.55, -ry - 50), (rx * 0.7, -110)]), col, n=4)
        tri = [(-rx - 80, -120), (-rx * 0.6, -ry - 44), (f * 0.5, -ry + 4), (rx * 0.6, -ry - 44), (rx + 80, -120),
               (rx * 0.4 + f * 0.4, -70), (f * 0.8, -44), (-rx * 0.4 + f * 0.4, -70)]
        pt.blob(Hy(tri), col, n=4)
        pt.line(Hy([(-rx - 74, -116), (-rx * 0.4 + f * 0.4, -74), (f * 0.8, -50), (rx * 0.4 + f * 0.4, -74),
                    (rx + 74, -116)]), LINE * 0.9, acc, smooth=True)
    elif hw == "kasa":
        apex = (f * 0.3, -ry - 120)
        poly = [(-rx - 180, -36), apex, (rx + 180, -36), (rx + 120, -14), (0, -6), (-rx - 120, -14)]
        pt.blob(Hy(poly), col, n=3)
        for x in (-rx - 110, -rx * 0.6, 0, rx * 0.6, rx + 110):
            pt.line(Hy([apex, (x, -24)]), LINE * 0.4, dk(col, 0.6))
        if not back:
            for sg in (-1, 1):
                pt.line(Hy([(sg * (rx - 30) + f * 0.5, -20), (sg * (rx - 50) + f * 0.6, 90), (f, ry + 6)]),
                        LINE * 0.6, smooth=True)
    elif hw == "turban":
        poly = [(-rx - 24, -40), (-rx - 40, -130), (-rx * 0.6, -ry - 74), (f * 0.2, -ry - 96), (rx * 0.6, -ry - 74),
                (rx + 40, -130), (rx + 24, -40), (f * 0.6, -60)]
        pt.blob(Hy(poly), col, n=6)
        for i, y in enumerate((-80, -150, -220)):
            pt.line(Hy([(-rx - 20, y + 20), (f * 0.3, y - 30), (rx + 20, y - 4)]), LINE * 0.5, smooth=True)
        if not back:
            pt.ell(*Hy([(f * 0.7, -110)])[0], 22, 26, acc, LINE * 0.7)
            pt.blob(Hy([(f * 0.7, -130), (f * 0.7 - 30, -230), (f * 0.7 + 10, -280), (f * 0.7 + 24, -200)]), WHITE,
                    LINE * 0.7, n=4)
    elif hw == "hood":
        if back:
            pt.blob(Hy([(-rx - 50, 40), (-rx - 54, -ry * 0.4), (-rx * 0.5, -ry - 60), (rx * 0.5, -ry - 60),
                        (rx + 54, -ry * 0.4), (rx + 50, 40), (0, 70)]), col, n=6)
            return
        outer = [(-rx - 50, ry * 0.55), (-rx - 54, -ry * 0.4), (-rx * 0.5, -ry - 60), (f * 0.3, -ry - 66),
                 (rx * 0.5, -ry - 60), (rx + 54, -ry * 0.4), (rx + 50, ry * 0.55)]
        inner = [(rx - 10 + f * 0.3, ry * 0.45), (rx - 8 + f * 0.2, -70), (rx * 0.5 + f * 0.5, -ry + 52),
                 (f * 0.5, -ry + 64), (-rx * 0.5 + f * 0.5, -ry + 52), (-rx + 8 + f * 0.6, -70),
                 (-rx + 10 + f * 0.6, ry * 0.45)]
        pt.shape(Hy(np.vstack([crom(outer, False, 6), crom(inner, False, 6)])), col, LINE)
    elif hw == "wushamao":
        pt.blob(Hy([(-rx * 0.62, -120), (-rx * 0.6, -ry - 60), (0, -ry - 84), (rx * 0.6, -ry - 60), (rx * 0.62, -120)]),
                col, n=6)
        pt.shape(Hy([(-rx - 6, -40), (-rx + 4, -130), (rx - 4, -130), (rx + 6, -40)]), col, LINE)
        pt.line(Hy([(-rx + 6, -122), (rx - 6, -122)]), LINE * 0.5, (90, 90, 90))
    elif hw == "nemes":
        a, b = col if D.get("hat") else BLUE, acc
        pt.shape(Hy([(-rx - 16, -112), (-rx * 0.6, -ry - 24), (rx * 0.6, -ry - 24), (rx + 16, -112), (rx + 22, -60),
                      (-rx - 22, -60)]), b, LINE)
        for y in (-ry + 4, -ry + 44):
            pt.line(Hy([(-rx * 0.8, y), (rx * 0.8, y)]), LINE * 1.6, a)
        pt.shape(Hy([(-rx - 24, -86), (rx + 24, -86), (rx + 24, -56), (-rx - 24, -56)]), b, LINE * 0.9)
        if not back:
            for sg in (-1, 1):
                q = [(sg * (rx - 14) + f * 0.3, -40), (sg * (rx + 36) + f * 0.3, -50), (sg * (rx + 46), ry + 40),
                     (sg * (rx + 30), ry + 200), (sg * (rx - 30), ry + 200), (sg * (rx - 24), ry * 0.4)]
                pt.shape(Hy(q), b, LINE)
                for y in np.linspace(10, ry + 170, 6):
                    pt.line(Hy([(sg * (rx - 22), y), (sg * (rx + 38), y)]), LINE * 1.5, a)
            pt.blob(Hy([(f - 14, -64), (f + 14, -64), (f + 18, -130), (f, -150), (f - 18, -130)]), GOLD, LINE * 0.7, n=4)


# ------------------------------------------------------------------------------------------------- presets
def design(base=None, **kw):
    """a full design dict: base defaults (+ another design) + overrides. Unused climber keys get neutral values."""
    d = dict(name="person", jacket=(70, 110, 150), jacket_dk=(50, 80, 110), puffy=False, trousers=(70, 70, 80),
             boots=LEATHER, hair=(40, 60, 90), hair_dk=(30, 44, 66), harness=None, rope=(32, 132, 240), pack=LEATHER,
             leg_u=135, leg_l=130, torso=270, head_rx=152, head_ry=176, hat=None, style="short", garment="tunic")
    if base:
        d.update(base)
    d.update(kw)
    return d


KNIGHT = design(name="knight", garment="mail", jacket=(236, 238, 240), mail=STEEL, belt=LEATHER, trim=GOLD,
                heraldry=dict(field=(236, 238, 240), device="cross", color=RED), legwear="mail", trousers=STEEL,
                footwear="boots", boots=IRON, headwear="nasal", hat=STEEL, style="short", hair=(40, 70, 120),
                beard="short", cape=RED_DK, leg_u=140, leg_l=135, torso=285)
KNIGHT_PLATE = design(KNIGHT, name="knight_plate", garment="plate", steel=STEEL, jacket=STEEL, legwear="greaves",
                      footwear="sabatons", boots=STEEL, headwear="greathelm", hat=STEEL, hat2=GOLD, cape=None,
                      heraldry=dict(field=(150, 60, 30), device="fleur", color=GOLD), beard="none")
LONGBOWMAN = design(name="longbowman", garment="tunic", jacket=(70, 120, 60), trim=None, belt=LEATHER,
                    legwear="hose", trousers=(50, 80, 110), footwear="shoes", boots=WOOD_DK, headwear="kettle",
                    hat=STEEL_DK, style="short", hair=(40, 80, 140), moustache="none", beard="stubble",
                    quiver=LEATHER, heraldry=dict(field=RED, device="cross", color=WHITE))
LEGIONARY = design(name="legionary", garment="segmentata", steel=STEEL, tunic=RED, scarf=RED, legwear="bare",
                   footwear="sandals", boots=LEATHER, headwear="galea", hat=STEEL, crest=None, style="short",
                   hair=(30, 40, 60), heraldry=dict(field=RED, device="wings", color=GOLD))
CENTURION = design(LEGIONARY, name="centurion", crest=RED, crest_dir="trans", cape=RED_DK, steel=(190, 200, 205))
SAMURAI = design(name="samurai", garment="lamellar", jacket=(40, 40, 150), jacket_dk=(40, 36, 40), trim=(170, 110, 40),
                 sleeve=(60, 50, 50), belt=(50, 40, 40), legwear="wraps", trousers=(60, 50, 50), wrap=(110, 100, 100),
                 footwear="sandals", boots=(50, 70, 90), headwear="kabuto", hat=(40, 36, 40), hat2=GOLD, style="topknot",
                 hair=BLACK, moustache="thin", heraldry=dict(field=WHITE, device="mon", color=BLACK))
RONIN = design(SAMURAI, name="ronin", garment="robe", jacket=(110, 80, 60), trim=(60, 50, 50), collar="cross",
               legwear="hakama", trousers=(70, 60, 60), headwear="none", skirt=0.4, flare=60, belt=(60, 50, 50))
OFFICIAL = design(name="official", garment="robe", jacket=(50, 50, 170), trim=(40, 36, 40), collar="round",
                  belt=(60, 160, 120), belt_style="leather", badge=(60, 170, 230), badge_in=(150, 90, 40),
                  headwear="wushamao", hat=(40, 36, 40), hat_wings="long", style="bun", hair=BLACK, moustache="thin",
                  beard="long", footwear="shoes", boots=BLACK, legwear="trousers", trousers=(40, 36, 40))
OFFICIAL_MING = design(OFFICIAL, name="official_ming", hat_wings="short", jacket=(60, 110, 40), collar="round")
CHINESE_SOLDIER = design(name="chinese_soldier", garment="lamellar", jacket=(50, 50, 170), jacket_dk=(40, 36, 40),
                         trim=GOLD, sleeve=(40, 40, 130), sode=False, belt=(40, 36, 40), legwear="wraps",
                         trousers=(40, 36, 40), wrap=(200, 200, 200), footwear="boots", boots=BLACK,
                         headwear="chinese_helm", hat=STEEL, hat2=(40, 36, 40), plume=RED, style="short", hair=BLACK,
                         heraldry=dict(field=(40, 40, 180), device="roundel", color=GOLD))
EGYPTIAN = design(name="egyptian", garment="kilt", jacket=LINEN, trim=GOLD, belt=GOLD, legwear="bare",
                  footwear="sandals", boots=(60, 120, 170), headwear="nemes", hat=BLUE, hat2=GOLD, style="none",
                  torso=260)
EGYPT_WORKER = design(EGYPTIAN, name="egypt_worker", headwear="none", style="short", hair=BLACK, trim=(60, 120, 170),
                      belt=(60, 120, 170), footwear="bare")
VIKING = design(name="viking", garment="tunic", jacket=(70, 100, 130), trim=(50, 60, 150), belt=LEATHER,
                legwear="wraps", trousers=(100, 110, 120), wrap=LEATHER, footwear="boots", boots=WOOD_DK,
                headwear="viking", hat=STEEL, style="long", hair=(60, 140, 200), beard="long", moustache="walrus",
                heraldry=dict(field=(40, 40, 170), device="quarterly", color=(220, 225, 230)), leg_u=145, leg_l=140,
                torso=295, head_rx=158)
INVENTOR = design(name="inventor", garment="coat", jacket=(60, 50, 50), jacket_dk=(40, 34, 34), vest=(60, 90, 130),
                  tie=BLACK, trim=GOLD, legwear="trousers", trousers=(80, 76, 76), footwear="shoes", boots=BLACK,
                  headwear="tophat", hat=(40, 36, 40), hat2=(60, 60, 150), style="short", hair=(170, 170, 170),
                  moustache="walrus", beard="none")
INVENTOR_B = design(INVENTOR, name="inventor_b", headwear="none", style="bald", hair=(120, 130, 140),
                    moustache="handlebar", beard="short", jacket=(90, 70, 50), vest=(40, 40, 120))
PEASANT = design(name="peasant", garment="tunic", jacket=(80, 120, 150), trim=None, belt=(70, 140, 170),
                 belt_style="rope", legwear="hose", trousers=(60, 90, 110), footwear="shoes", boots=WOOD_DK,
                 headwear="hood", hat=(60, 100, 90), style="short", hair=(40, 80, 130), beard="stubble")
KING = design(name="king", garment="robe", jacket=(130, 40, 80), trim=GOLD, collar="round", hem_trim=True,
              belt=GOLD, belt_style="leather", cape=(40, 30, 160), cape_trim="ermine", headwear="crown", hat2=GOLD,
              style="short", hair=(40, 70, 120), beard="short", moustache="walrus", footwear="shoes",
              boots=(40, 30, 140), legwear="trousers", trousers=(130, 40, 80), torso=280)
QUEEN = design(name="queen", garment="robe", jacket=(140, 60, 40), trim=GOLD, collar="v", hem_trim=True,
               belt=GOLD, belt_style="leather", cape=(40, 30, 160), cape_trim="ermine", headwear="crown", hat2=GOLD,
               style="long", hair=(40, 90, 160), lashes=True, footwear="shoes", boots=(40, 30, 140), skirt=1.04,
               flare=90, head_rx=146, head_ry=170, torso=255)
MONK = design(name="monk", garment="robe", jacket=(60, 90, 120), trim=None, collar="round", sleeves="wide",
              belt=(150, 190, 210), belt_style="rope", headwear="none", style="tonsure", hair=(60, 80, 110),
              footwear="sandals", boots=LEATHER, legwear="bare")
MONK_HOOD = design(MONK, name="monk_hood", headwear="hood", hat=(60, 90, 120))
SOLDIER_1800 = design(name="soldier_1800", garment="uniform", jacket=(40, 40, 170), jacket_dk=(120, 60, 30),
                      trim=GOLD, strap=WHITE, belt=WHITE, legwear="striped", trousers=(230, 230, 230), stripe=RED,
                      footwear="boots", boots=BLACK, headwear="tricorn", hat=BLACK, hat2=WHITE, style="short",
                      hair=(170, 170, 170), moustache="none")

PRESETS = dict(knight=KNIGHT, knight_plate=KNIGHT_PLATE, longbowman=LONGBOWMAN, legionary=LEGIONARY,
               centurion=CENTURION, samurai=SAMURAI, ronin=RONIN, official=OFFICIAL, official_ming=OFFICIAL_MING,
               chinese_soldier=CHINESE_SOLDIER, egyptian=EGYPTIAN, egypt_worker=EGYPT_WORKER, viking=VIKING,
               inventor=INVENTOR, inventor_b=INVENTOR_B, peasant=PEASANT, king=KING, queen=QUEEN, monk=MONK,
               monk_hood=MONK_HOOD, soldier_1800=SOLDIER_1800)


if __name__ == "__main__":     # preset sheet: python costumes.py [preset ...] -> production/review/presets.jpg
    import poses as PO
    ROOT = pathlib.Path(__file__).resolve().parent.parent
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or list(PRESETS)
    rows = []
    for n in names:
        D = PRESETS[n]
        ps = PO.SHOWCASE.get(n, [PO.rest, PO.rest_side, PO.explain])
        rows.append((n, [f() if callable(f) else f for f in ps]))
    cols = max(len(r[1]) for r in rows)
    per_row = 3 if cols <= 3 else cols
    cw, ch, sc = 330, 600, 0.36
    items = [(n, p) for n, ps in rows for p in ps]
    ncol = 12
    nrow = (len(items) + ncol - 1) // ncol
    frame = np.full((nrow * ch, ncol * cw, 3), 0.86, np.float32)
    import cv2 as _cv
    labels = []
    for i, (n, p) in enumerate(items):
        r, c = divmod(i, ncol)
        TN.render_char(frame, PRESETS[n], p, [[sc, 0, c * cw + cw / 2], [0, sc, r * ch + ch - 60]])
        labels.append((n, c * cw + 8, r * ch + ch - 18))
    img = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
    for n, x, y in labels:
        _cv.putText(img, n, (x, y), _cv.FONT_HERSHEY_SIMPLEX, 0.6, (30, 30, 30), 2)
    out = ROOT / "production" / "review" / "presets.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    _cv.imwrite(str(out), img, [_cv.IMWRITE_JPEG_QUALITY, 85])
    print(out)
