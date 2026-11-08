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
  modern    garment blazer (tweed: shirt, tie loosened, elbow patches; colours shirt, tie, patch, tweed=False for plain)
            | hoodie (hood bunched at the neck, kangaroo pocket, ribbed hem); girth scales the torso width (0.9 thin)
            glasses halfmoon | round (+ glasses_col; pose field specs 0 low on the nose, 1 pushed to the tip, -1 up)
            lanyard BGR (cord + ID card on the chest), headphones BGR (resting around the neck), brow_w (1.7 bushy)
            hair receding (grey tufts + combed-over wisps) | curtains (middle-parted fringe)
  ep02 (Little Bighorn project copy only, not in the skill):
            garment buckskin (fringed frontier jacket, open over a `shirt` colour, fringe on sleeves/hem/yoke;
            `fringe` colour, default jacket) | shirt (tucked-in work/flannel shirt, placket + fall collar; `vest` BGR
            draws a field vest with pockets over it); sleeves fringe | rolled (rolled to the elbow)
            kerchief BGR (knotted neckerchief); belt_style cartridge (brass cartridge loops)
            headwear slouch (wide-brim slouch hat; `brim` extra width, default 116) | boonie (soft bush hat) | cap
            (baseball cap, bill toward the facing; hat2 = front patch or None)
            style curly (short hair with curls; curls show under a hat); moustache droop (big drooping ends)
            legwear jeans (denim + seams); footwear tall (knee boots, trousers tucked in)
            held prop detector (metal detector: armrest, control box, coil kept just above the ground in front of
            the feet; pose field sweep -1..1 swings the coil back/forward, design keys detector, detector_coil)

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
    blazer=dict(sleeves="long", skirt=0.24, flare=24),
    hoodie=dict(sleeves="long", skirt=0.0, flare=0),
    uniform=dict(sleeves="long", skirt=0.17, flare=22),
    kilt=dict(sleeves="none", skirt=0.44, flare=40),
    buckskin=dict(sleeves="fringe", skirt=0.26, flare=30),     # ep02: fringed frontier jacket (Custer)
    shirt=dict(sleeves="long", skirt=0.0, flare=0),            # ep02: tucked-in work / flannel shirt (+ vest)
    trade_shirt=dict(sleeves="long", skirt=0.22, flare=26),    # ep02: loose untucked trade-cloth / calico shirt
    dress=dict(sleeves="dress", skirt=0.8, flare=46),          # ep02: Plains wool (stroud) dress, wide sleeves
)
HEADWEAR = ("none", "beanie", "nasal", "greathelm", "kettle", "kabuto", "galea", "crown", "tophat", "tricorn", "kasa",
            "turban", "hood", "wushamao", "nemes", "viking", "chinese_helm", "slouch", "boonie", "cap")
HAIR = ("messy", "beanie", "short", "bald", "long", "topknot", "bun", "tonsure", "receding", "curtains", "curly",
        "none")
MOUSTACHE = ("none", "walrus", "handlebar", "thin", "droop")
BEARD = ("none", "stubble", "short", "long")
HELD = ("none", "sword", "gladius", "katana", "spear", "axe", "hammer", "mallet", "mace", "bow", "longbow", "arrow",
        "crossbow", "shield_round", "shield_kite", "shield_heater", "scutum", "scroll", "scroll_open", "book", "torch",
        "flag", "banner", "quill", "lantern", "paper_lantern", "wrench", "staff", "crook",
        "mug", "red_pen", "stamp", "sticker", "detector",
        "note", "exam", "exam_f", "cartridge", "beer", "bugle", "folder")
UPRIGHT = ("book", "scroll_open", "exam", "exam_f", "folder", "note", "cartridge")   # props that stay upright
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
        if kind in SHIELDS or kind in UPRIGHT:
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

    def glasses(s):
        glasses(s)


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
    _blanket_back(C)
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
    elif lw == "leggings":    # Plains trade-cloth leggings: broad side flap with a beaded strip (`beads`)
        nrm = _perp(_n(ank - hj))
        out = side if C.fac == "f" else (-side if back else -1)
        if np.dot(nrm, (out, 0)) < 0:
            nrm = -nrm
        fl = D.get("legging_flap", dk(col, 0.86))
        top = hj + (knee - hj) * D.get("flap_top", 0.15)
        a0, a1 = top + nrm * 36, ank + nrm * 34 + (0, -10)
        pt.shape([a0, knee + nrm * 40, a1, a1 + nrm * 34 + (0, 10), knee + nrm * 80, a0 + nrm * 30], fl, LINE * 0.7)
        if D.get("beads"):    # beaded strip: a band with blocks of a second colour (reads as beadwork, not a stripe)
            path = crom([a0 + nrm * 16, knee + nrm * 56, a1 + nrm * 18], False, 8)
            pt.stroke(path, D["beads"], 22, LINE * 0.4, shade=False)
            Ls = np.r_[0, np.cumsum(np.hypot(*np.diff(path, axis=0).T))]
            b2 = D.get("beads2", RED)
            for s in np.arange(20, Ls[-1] - 14, 46):
                q0 = np.array([np.interp(s, Ls, path[:, 0]), np.interp(s, Ls, path[:, 1])])
                q1 = np.array([np.interp(s + 16, Ls, path[:, 0]), np.interp(s + 16, Ls, path[:, 1])])
                pt.stroke([q0, q1], b2, 14, 0, shade=False)
    elif lw == "jeans":       # outer seam stitched in a lighter thread + a pale crease at the knee
        sc = D.get("stitch", (90, 170, 220))
        o = side * (24 if not back else -24)
        pt.line([hj + (o, 8), knee + (o, 0), ank + (o, -24)], LINE * 0.35, sc)
        pt.line([knee + (-26, -10), knee + (0, -2), knee + (26, -12)], LINE * 0.35, dk(col, 0.75), smooth=True)
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
    if fw == "tall":          # knee boots: shaft from just below the knee, trousers tucked in, a flared top
        _, knee, _ = C.legs[side]
        dl = ank - knee
        top = knee + dl * 0.14
        pt.stroke([top, ank + (0, 8)], col, 106)
        nrm = _perp(_n(dl))
        pt.shape([top - nrm * 58 - _n(dl) * 6, top + nrm * 58 - _n(dl) * 6, top + nrm * 54 + _n(dl) * 26,
                  top - nrm * 54 + _n(dl) * 26], dk(col, 0.82) if sum(col) > 200 else tuple(min(255, v + 18) for v in col),
                 LINE * 0.7, shade=False)
        fw = "boots"
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
        if fw == "moccasins":     # soft hide moccasin: rounded, a cuff at the ankle, beaded band over the instep
            fill = D.get("moccasin", (130, 170, 200))
            shoe = [(bx - 46 + 16 * min(toe, 0), by - 14), (bx + 24 + 40 * max(toe, 0), by - 16),
                    (bx + 56 + 60 * max(toe, 0), by + 8), (bx + 52 + 58 * max(toe, 0), by + 36),
                    (bx - 50 + 50 * min(toe, 0), by + 36), (bx - 52 + 24 * min(toe, 0), by + 6)]
            if back:
                shoe = [(bx - 48, by - 14), (bx + 48, by - 14), (bx + 52, by + 36), (bx - 52, by + 36)]
        pt.blob(shoe, fill, n=6)
        if fw == "moccasins":
            pt.shape([(bx - 40, by - 30), (bx + 40, by - 30), (bx + 44, by - 6), (bx - 44, by - 6)], fill, LINE * 0.6,
                     shade=False)
            if D.get("beads") and not back:
                pt.stroke([(bx - 24 + 30 * max(toe, 0), by + 2), (bx + 20 + 50 * max(toe, 0), by + 6)],
                          D.get("moc_beads", D["beads"]), 16, LINE * 0.4, shade=False)
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
    if style == "cartridge":  # wide leather/canvas belt, a row of brass cartridge heads in loops
        y0, y1 = -30, 22
        brass = D.get("brass", (70, 170, 214))
        x0, x1 = -122 + 16 * k, 122 - 22 * k
        for x in np.arange(x0 + 14, x1 - 8, 24):
            if not C.back and abs(x - cx) < 34:
                continue
            pt.shape(up([(x - 8, y0 - 16), (x + 8, y0 - 16), (x + 8, y0 + 8), (x - 8, y0 + 8)]), brass, LINE * 0.45,
                     shade=False)
    if style == "tacks":      # wide hide belt studded with brass tacks (Plains women's belt), no buckle
        y0, y1 = -34, 18
    pt.shape(up([(-132 + 16 * k, y0), (132 - 22 * k, y0), (134 - 22 * k, y1), (-134 + 16 * k, y1)]), col, LINE * 0.8)
    if style == "tacks":
        for x in np.arange(-110 + 16 * k, 112 - 22 * k, 30):
            pt.dot(*up((x, (y0 + y1) / 2)), 8, D.get("brass", (70, 170, 214)))
        return
    if style == "cartridge":
        for x in np.arange(-122 + 16 * k + 2, 122 - 22 * k, 24):
            pt.line(up([(x, y0 + 4), (x, y1 - 4)]), LINE * 0.35, dk(col, 0.7))
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
    elif g == "buckskin":
        _buckskin(C, col, dkc, cx, f, flare)
    elif g == "shirt":
        _work_shirt(C, col, dkc, cx)
    elif g == "trade_shirt":
        _trade_shirt(C, col, dkc, cx, f, flare)
    elif g == "dress":
        _dress(C, col, dkc, cx, f, flare)
    elif g == "blazer":
        _blazer(C, col, dkc, cx, f, flare)
    elif g == "hoodie":
        _hoodie(C, col, dkc, cx)
    if D.get("cape_trim") == "ermine" and D.get("cape") and not back:   # ermine shoulder cape
        sw = C.sh_w
        pt.blob(up([(-sw - 10 + 18 * k, -T + 40), (-sw + 30, -T - 10), (sw - 30, -T - 10), (sw + 10 - 26 * k, -T + 40),
                    (sw - 30, -T * 0.68), (cx, -T * 0.62), (-sw + 30, -T * 0.68)]), WHITE, n=6)
        for x, y in ((-80, -0.8), (-20, -0.72), (40, -0.8), (90, -0.72), (-100, -0.9)):
            _ermine_spot(pt, up((x + 20 * k, T * y)), 1.0)
    if D.get("breechcloth"):
        _breechcloth(C, cx)
    if D.get("blanket"):
        _blanket(C, cx)
    if D.get("apron"):
        _apron(C, cx)
    neckwear(C)


# ------------------------------------------------------------------------------------------------- ep02 frontier / field dress
def _fringe_band(pt, pts, col, depth=40, step=18, line=LINE * 0.55):
    """a fringe hanging below the polyline pts (filled comb: band + ink slits)."""
    pts = np.asarray(pts, float)
    top = crom(pts, False, 6)
    bot = top + np.array([0, depth])
    pt.shape(np.vstack([top, bot[::-1]]), col, line, shade=False)
    L = np.r_[0, np.cumsum(np.hypot(*np.diff(top, axis=0).T))]
    for s in np.arange(step * 0.6, L[-1] - step * 0.3, step):
        q = np.array([np.interp(s, L, top[:, 0]), np.interp(s, L, top[:, 1])])
        pt.line([q + (0, 6), q + (0, depth)], LINE * 0.32)


def _buckskin(C, col, dkc, cx, f, flare):
    """fringed buckskin frontier jacket, open over a dark shirt; fringe on the hem and across the chest yoke."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    fr = D.get("fringe", col)
    hL, hR = skirt(C, f, flare, col, split=0 if back else 46)
    hm = (hL + hR) / 2 + np.array([0, 14])
    if back:
        _fringe_band(pt, [hL, hm, hR], fr, 44)
    else:
        _fringe_band(pt, [hL, (hL + hm) / 2 + (0, 6), hm - (30, -2)], fr, 44)
        _fringe_band(pt, [hm + (30, 2), (hR + hm) / 2 + (0, 6), hR], fr, 44)
    pt.blob(up(tor_poly(C, 132, 136)), col, n=8)
    sw = C.sh_w
    if back:
        _fringe_band(pt, up([(-sw + 16, -T + 70), (0, -T * 0.66), (sw - 16, -T + 70)]), fr, 34)
        pt.line(up([(cx - 4, -T * 0.6), (cx - 4, 16)]), LINE * 0.5)
    else:
        shirt = D.get("shirt", BLUE)
        pt.shape(up([(cx - 48, -T + 2), (cx + 48, -T + 2), (cx + 34, 22), (cx - 30, 22)]), shirt, LINE * 0.8)
        for y in (-T * 0.62, -T * 0.42, -T * 0.22):      # bib-front shirt buttons
            for sg in (-1, 1):
                pt.dot(*up((cx + sg * 20, y)), 7, D.get("trim", (200, 200, 205)))
        for sg in (-1, 1):                               # yoke fringe either side of the opening
            a = (sg * (sw - 22) + (18 * k if sg < 0 else -26 * k), -T + 56)
            b = (cx + sg * 52, -T * 0.6)
            _fringe_band(pt, up([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 16), b]), fr, 32)
        for sg in (-1, 1):                               # jacket front edges
            pt.line(up([(cx + sg * 48, -T + 4), (cx + sg * 40, -T * 0.5), (cx + sg * 34, 22)]), LINE * 0.7, dkc)
    belt(C, style=D.get("belt_style", "cartridge"))


def _work_shirt(C, col, dkc, cx):
    """tucked-in work / flannel shirt: fall collar, buttoned placket; optional field vest with pockets."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    pt.blob(up(tor_poly(C, 128, 132)), col, n=8)
    vest = D.get("vest")
    sw = C.sh_w
    if back:
        if vest:
            pt.blob(up([(-sw + 14, -T + 26), (-60, -T + 6), (60, -T + 6), (sw - 14, -T + 26), (132, -T * 0.4),
                        (126, 14), (-126, 14), (-132, -T * 0.4)]), vest, n=6)
            pt.line(up([(-90, -T * 0.55), (0, -T * 0.6), (90, -T * 0.55)]), LINE * 0.5, smooth=True)
    else:
        pt.line(up([(cx, -T + 30), (cx - 2, 20)]), LINE * 0.55)
        for y in (-T * 0.7, -T * 0.48, -T * 0.26):
            pt.dot(*up((cx + 10, y)), 8, D.get("trim", (220, 220, 225)))
        if vest:
            pk = D.get("vest_dk", dk(vest, 0.82))
            L_ = [(-sw + 18 + 18 * k, -T + 22), (cx - 34, -T + 4), (cx - 30, 18), (-126 + 16 * k, 18),
                  (-134, -T * 0.42)]
            R_ = [(cx + 34, -T + 4), (sw - 18 - 26 * k, -T + 22), (134 - 20 * k, -T * 0.42), (126 - 22 * k, 18),
                  (cx + 30, 18)]
            for poly, sg in ((L_, -1), (R_, 1)):
                pt.shape(up(poly), vest, LINE * 0.8)
                for (py, ph) in ((-T * 0.66, 62), (-T * 0.3, 70)):    # pocket + flap on each panel
                    x0 = cx + sg * 44 if sg > 0 else cx - 44 - 64
                    x0 = x0 - (14 * k if sg > 0 else 0)
                    pt.shape(up([(x0, py), (x0 + 64, py), (x0 + 64, py + ph), (x0, py + ph)]), vest, LINE * 0.55,
                             shade=False)
                    pt.shape(up([(x0 - 3, py - 4), (x0 + 67, py - 4), (x0 + 67, py + 16), (x0 - 3, py + 16)]), pk,
                             LINE * 0.55, shade=False)
    if not back:
        for sg in (-1, 1):                               # fall collar
            pt.shape(up([(cx + sg * 4, -T + 12), (cx + sg * 70, -T - 2), (cx + sg * 48, -T + 52)]),
                     D.get("collar_col", col), LINE * 0.7, shade=False)
    belt(C, col=D.get("belt", LEATHER), style=D.get("belt_style", "leather"))


# ------------------------------------------------------------------------------------------------- ep02 Lakota / Cheyenne dress
def _print_dots(C, x0, x1, y0, y1, col, step=40, r=6):
    """calico print: small dots on a jittered grid (torso frame)."""
    pt, up = C.pt, C.up
    for i, y in enumerate(np.arange(y0, y1, step)):
        for j, x in enumerate(np.arange(x0, x1, step)):
            jx, jy = ((i * 7 + j * 13) % 11 - 5) * 1.6, ((i * 5 + j * 3) % 9 - 4) * 1.6
            px = x + jx + (step / 2 if i % 2 else 0)
            if px > x1:
                continue
            pt.dot(*up((px, y + jy)), r, col)


def _trade_shirt(C, col, dkc, cx, f, flare):
    """loose untucked trade-cloth / calico shirt (Plains men, 1870s): hem over the hips, slit neck with ties,
    shoulder yoke seam; optional calico print (`print` BGR) and an open cloth vest (`vest`, `vest_trim`)."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    hL, hR = skirt(C, f, flare, col, top=-30, w0=136)
    pr = D.get("print")
    if pr:
        hm = (hL + hR) / 2
        for u in (0.25, 0.5, 0.75):
            q = hL + (hR - hL) * u + (0, -26)
            pt.dot(q[0], q[1], 6, pr)
    pt.blob(up(tor_poly(C, 134, 138)), col, n=8)
    sw = C.sh_w
    if pr:
        _print_dots(C, -118 + 16 * k, 120 - 22 * k, -T + 40, 10, pr)
    vest = D.get("vest")
    if back:
        if vest:
            pt.blob(up([(-sw + 14, -T + 26), (-60, -T + 6), (60, -T + 6), (sw - 14, -T + 26), (134, -T * 0.4),
                        (128, 16), (-128, 16), (-134, -T * 0.4)]), vest, n=6)
        return
    pt.line(up([(-sw + 30 + 18 * k, -T + 56), (cx, -T + 70), (sw - 30 - 26 * k, -T + 56)]), LINE * 0.45, smooth=True)
    pt.line(up([(cx, -T + 10), (cx + 2, -T * 0.6)]), LINE * 0.6)              # neck slit
    for sg in (-1, 1):                                                       # its ties
        pt.line(up([(cx, -T + 40), (cx + sg * 14, -T + 74)]), LINE * 0.4, D.get("trim", dkc))
    if vest:
        vt = D.get("vest_trim")
        L_ = [(-sw + 16 + 18 * k, -T + 22), (cx - 40, -T + 6), (cx - 26, -T * 0.4), (cx - 40, 14), (-128 + 16 * k, 14),
              (-136, -T * 0.42)]
        R_ = [(cx + 40, -T + 6), (sw - 16 - 26 * k, -T + 22), (136 - 20 * k, -T * 0.42), (128 - 22 * k, 14),
              (cx + 40, 14), (cx + 26, -T * 0.4)]
        for poly in (L_, R_):
            pt.shape(up(poly), vest, LINE * 0.8)
            if vt:                                                           # trimmed / beaded front edge
                pt.line(up(poly[1:4]), LINE * 0.9, vt)
        for y in (-T * 0.5, -T * 0.3):
            pt.dot(*up((cx - 30, y)), 8, D.get("trim", (200, 200, 205)))
    belt(C, col=D.get("belt", LEATHER), style=D.get("belt_style", "none"))


ELK_TOOTH = (226, 236, 240)


def _dress(C, col, dkc, cx, f, flare):
    """Plains wool (stroud) trade-cloth dress, 1870s Lakota / Cheyenne: T-cut, hem at mid-calf with the undyed
    selvage edge (`selvage`), a deep cape-like yoke decorated with rows of elk teeth (`teeth` BGR, `yoke` BGR yoke
    cloth, `yoke_trim` BGR bead line along its edge); wide hide belt with brass tacks (belt_style tacks)."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    hL, hR = skirt(C, f, flare, col, top=-30, w0=138)
    sel = D.get("selvage", (226, 230, 232))
    _hem_band(C, hL, hR, sel)
    hm = (hL + hR) / 2 + np.array([0, 14])
    pt.line(crom([hL + (0, -34), hm + (0, -34), hR + (0, -34)], False, 6).tolist(), LINE * 0.9,
            D.get("yoke_trim", RED))
    pt.blob(up(tor_poly(C, 138, 140)), col, n=8)
    sw = C.sh_w
    yk = D.get("yoke", col)
    teeth = D.get("teeth", ELK_TOOTH)
    dip = -T * 0.5 if not back else -T * 0.58
    yoke = [(-sw - 12 + 18 * k, -T + 70), (-sw + 4 + 18 * k, -T + 18), (-60, -T - 4), (60, -T - 4),
            (sw - 4 - 26 * k, -T + 18), (sw + 12 - 26 * k, -T + 70), (sw - 50 - 26 * k, -T * 0.62), (cx, dip),
            (-sw + 50 + 18 * k, -T * 0.62)]
    pt.blob(up(yoke), yk, n=6)
    edge = [yoke[5], yoke[6], yoke[7], yoke[8], yoke[0]]
    pt.line(up(edge), LINE * 1.0, D.get("yoke_trim", RED), smooth=True)
    # rows of elk teeth following the yoke's curve
    for r, frac in enumerate((0.78, 0.5, 0.22)):
        q = crom(np.array(edge, float), False, 10)
        top = np.array([(cx, -T + 10)], float)
        row = q * frac + (1 - frac) * np.array([cx, -T + 6]) + np.array([0, -18 * frac])
        row[:, 0] = cx + (q[:, 0] - cx) * (0.55 + 0.45 * frac)
        L_ = np.r_[0, np.cumsum(np.hypot(*np.diff(row, axis=0).T))]
        n = max(3, int(L_[-1] / 34))
        for s in np.linspace(L_[-1] * 0.04, L_[-1] * 0.96, n):
            x, y = np.interp(s, L_, row[:, 0]), np.interp(s, L_, row[:, 1])
            if back and abs(x) < 4:
                continue
            c = up((x, y))
            pt.ell(c[0], c[1], 9, 13, teeth, LINE * 0.4, C.lean)
    if not back:
        pt.line(up([(cx - 30, -T + 6), (cx, -T + 30), (cx + 30, -T + 6)]), LINE * 0.6, smooth=True)   # neck opening
    belt(C, col=D.get("belt", LEATHER), style=D.get("belt_style", "tacks"))


def _breechcloth(C, cx):
    """trade-cloth breechcloth: front (and back) flap hanging from the belt to above the knee, selvage stripe."""
    D, pt, up, k, back = C.D, C.pt, C.up, C.k, C.back
    col = D["breechcloth"]
    f = D.get("breech_len", 0.62)
    yb = C.leg_len * f
    x = cx if not back else 0
    q = up([(x - 44, 14), (x + 44, 14), (x + 58, yb), (x - 58, yb)])      # hangs over the belt's lower edge
    pt.shape(q, col, LINE * 0.8)
    s = D.get("selvage", (226, 230, 232))
    pt.shape(up([(x - 56, yb - 40), (x + 56, yb - 40), (x + 58, yb - 22), (x - 57, yb - 22)]), s, LINE * 0.5,
             shade=False)


def _blanket(C, cx):
    """trade / stroud blanket. blanket = BGR; blanket_mode waist (wrapped round the waist, rolled top, to below the
    knees) | shawl (round the shoulders, the two ends hanging down the front; the back panel is drawn by
    behind_body); blanket_band = BGR stripe near the edge, blanket_band2 = thin second stripe."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    col = D["blanket"]
    band = D.get("blanket_band", (226, 230, 232))
    band2 = D.get("blanket_band2")
    mode = D.get("blanket_mode", "waist")
    if mode == "waist":
        f = D.get("blanket_len", 0.66)
        hL, hR = skirt(C, f, 44, col, top=-40, w0=142)
        hm = (hL + hR) / 2 + np.array([0, 14])
        for off, c_, w in ((-70, band, 30), (-38, band2, 12)):
            if c_ is None:
                continue
            a, b = hL + (6, off), hR + (-6, off)
            pt.shape(np.vstack([crom([a, hm + (0, off), b], False, 6), crom([b + (2, w), hm + (0, off + w), a + (-2, w)],
                                                                             False, 6)]), c_, LINE * 0.5, shade=False)
        pt.shape(up([(-144 + 16 * k, -58), (144 - 22 * k, -58), (148 - 22 * k, -16), (-148 + 16 * k, -16)]), col,
                 LINE * 0.9)                                                   # rolled top
        pt.line(up([(-140 + 16 * k, -36), (0, -32), (140 - 22 * k, -36)]), LINE * 0.4, dk(col, 0.7), smooth=True)
        if not back:                                                           # overlapping front edge
            ox = cx + 40
            pt.line([up((ox, -16)), hm + (60 + 40 * k, -4)], LINE * 0.7)
            pt.line([up((ox - 30, 20)), (up((ox - 30, 20)) + hm + (30, -20)) / 2 + (-6, 0)], LINE * 0.4,
                    dk(col, 0.7))
    elif mode == "shawl" and not back:
        sw = C.sh_w
        bot = D.get("shawl_low", -0.06)
        for sg in (-1, 1):            # narrow ends hanging off the shoulders: the dress yoke stays visible between
            if k and sg > 0:
                xo, xi = sw - 4 - 26 * k, sw - 44 - 26 * k
            else:
                xo = sg * (sw + 24) + (18 * k if sg < 0 else 0)
                xi = sg * (sw - 26) + (18 * k if sg < 0 else 0)
            q = [(xi + sg * -14, -T - 2), (sg * (sw - 20) + (18 * k if sg < 0 else -26 * k), -T - 16),
                 (xo, -T + 30), (xo + sg * 12, T * bot), (xi + sg * 8, T * bot + 10), (xi, -T * 0.5)]
            pt.blob(up(q), col, LINE, n=5)
            yb = T * bot
            pt.shape(up([(xo + sg * 9, yb - 40), (xi + sg * 7, yb - 32), (xi + sg * 7, yb - 16), (xo + sg * 11, yb - 24)]),
                     band, LINE * 0.45, shade=False)
            for u in np.linspace(0.1, 0.9, 5):                                 # fringe on the ends
                x = xi + sg * 7 + (xo + sg * 11 - xi - sg * 7) * u
                y = yb + 10 * (1 - u)
                pt.line(up([(x, y), (x, y + 30)]), LINE * 0.4)


def _blanket_back(C):
    """the part of a shawl / blanket seen behind the body (front views) or over the back (back view)."""
    D, pt, up, T, k = C.D, C.pt, C.up, C.T, C.k
    if not D.get("blanket") or D.get("blanket_mode", "waist") != "shawl":
        return
    col = D["blanket"]
    sw = C.sh_w
    bot = D.get("shawl_low", -0.06)
    q = [(-sw - 28 + 18 * k, -T + 26), (-70, -T - 20), (70, -T - 20), (sw + 28 - 26 * k, -T + 26),
         (sw + 44 - 26 * k, T * bot), (0, T * bot + 30), (-sw - 44 + 18 * k, T * bot)]
    pt.blob(up(q), col, n=5)
    if C.back:
        band = D.get("blanket_band", (226, 230, 232))
        pt.shape(up([(-sw - 40 + 18 * k, T * bot - 44), (0, T * bot - 16), (sw + 40 - 26 * k, T * bot - 44),
                     (sw + 42 - 26 * k, T * bot - 22), (0, T * bot + 6), (-sw - 42 + 18 * k, T * bot - 22)]), band,
                 LINE * 0.45, shade=False)


def _apron(C, cx):
    """long white bib-less waist apron (1890s bartender), tied at the waist, to just below the knee."""
    D, pt, up, k, back = C.D, C.pt, C.up, C.k, C.back
    col = D["apron"]
    if back:
        pt.stroke(up([(-128, -4), (128, -4)]), col, 18, LINE * 0.5, shade=False)
        pt.blob(up([(-10, -14), (-50, 30), (-30, 60), (0, 0), (30, 60), (50, 30), (10, -14)]), col, LINE * 0.5, n=3)
        return
    hL, hR = skirt(C, D.get("apron_len", 0.66), 20, col, top=-10, w0=126)
    pt.shape(up([(-132 + 16 * k, -22), (132 - 22 * k, -22), (134 - 22 * k, 2), (-134 + 16 * k, 2)]), col, LINE * 0.7)
    pt.line([up((cx - 30, 10)), (hL + hR) / 2 + (-20, -10)], LINE * 0.35, dk(col, 0.82))
    pt.line([up((cx + 50, 10)), (hL + hR) / 2 + (70, -10)], LINE * 0.35, dk(col, 0.82))


# ------------------------------------------------------------------------------------------------- modern dress
def _tweed(C, x0, x1, y0, y1, col, skip=None, step=44):
    """herringbone flecks: short alternating diagonal ticks on a jittered grid (torso frame)."""
    pt, up = C.pt, C.up
    tc = dk(col, 0.78)
    for i, y in enumerate(np.arange(y0, y1, step)):
        for j, x in enumerate(np.arange(x0, x1, step)):
            jx, jy = ((i * 7 + j * 13) % 11 - 5) * 2.2, ((i * 5 + j * 3) % 9 - 4) * 2.2
            px, py = x + jx + (step / 2 if i % 2 else 0), y + jy
            if px > x1 or (skip and skip(px, py)):
                continue
            s = 1 if (i + j) % 2 else -1
            pt.line(up([(px - 7, py - 7 * s), (px + 7, py + 7 * s)]), LINE * 0.3, tc)


def _blazer(C, col, dkc, cx, f, flare):
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    gw = D.get("girth", 1.0)
    w0, w1 = 124 * gw, 126 * gw
    skirt(C, f, flare, col, split=0 if back else 56, top=-30, w0=w0 + 6)
    pt.blob(up(tor_poly(C, w0, w1)), col, n=8)
    bt = -T * 0.3                                       # the one fastened button
    vee = lambda x, y: (not back) and y < bt + 10 and abs(x - cx) < 18 + 74 * (bt - y) / (bt + T)
    if D.get("tweed", True):
        _tweed(C, -w1 + 26 + 16 * k, w1 - 26 - 20 * k, -T + 40, 0, col, vee)
    if back:
        pt.line(up([(0, -T + 20), (2, -T * 0.4), (0, 14)]), LINE * 0.55, smooth=True)
        pt.shape(up([(-64, -T - 24), (64, -T - 24), (70, -T + 14), (-70, -T + 14)]), col, LINE * 0.8)
        return
    shirt = D.get("shirt", (236, 222, 200))
    pt.shape(up([(cx - 60, -T + 2), (cx + 60, -T + 2), (cx + 10, bt), (cx - 10, bt)]), shirt, LINE * 0.7, shade=False)
    pt.shape(up([(cx - 18, -T - 2), (cx + 18, -T - 2), (cx, -T + 34)]), WHITE, LINE * 0.5, shade=False)   # open top
    tie = D.get("tie", RED_DK)
    kx, ky = cx + 6, -T + 58                            # knot pulled down and a little askew
    pt.blob(up([(kx - 22, ky - 22), (kx + 24, ky - 18), (kx + 14, ky + 20), (kx - 10, ky + 18)]), tie, LINE * 0.7, n=4)
    pt.shape(up([(kx - 12, ky + 16), (kx + 12, ky + 18), (kx + 30, bt - 6), (kx + 14, bt + 6), (kx - 4, bt - 2)]),
             tie, LINE * 0.7)
    for sg in (-1, 1):                                  # shirt collar points, spread open
        pt.shape(up([(cx + sg * 20, -T - 6), (cx + sg * 64, -T - 2), (cx + sg * 40, -T + 46)]), shirt, LINE * 0.7,
                 shade=False)
    lap = dk(col, 0.9)
    for sg in (-1, 1):                                  # notched lapels down to the button
        pt.shape(up([(cx + sg * 58, -T + 6), (cx + sg * 100, -T + 16), (cx + sg * 92, -T + 70),
                     (cx + sg * 110, -T + 84), (cx + sg * 12, bt + 4)]), lap, LINE * 0.8)
        pt.line(up([(cx + sg * 92, -T + 70), (cx + sg * 74, -T + 76)]), LINE * 0.5)
    pt.dot(*up((cx + 2, bt + 10)), 12, D.get("trim", (40, 60, 90)))
    pc = D.get("trim", (40, 60, 90))
    for sg in (-1, 1):                                  # lower pocket flaps
        pt.shape(up([(cx + sg * 40, -T * 0.14), (cx + sg * 104, -T * 0.16), (cx + sg * 102, -T * 0.08),
                     (cx + sg * 40, -T * 0.06)]), col, LINE * 0.6)
    pt.line(up([(cx - 98, -T * 0.66), (cx - 52, -T * 0.64)]), LINE * 0.6)        # breast pocket welt
    pt.shape(up([(cx - 92, -T * 0.66), (cx - 84, -T * 0.78), (cx - 70, -T * 0.66)]), pc, LINE * 0.5)  # pen in pocket
    for sg in (-1, 1):                                  # crumples at the waist
        pt.line(up([(cx + sg * 96, -T * 0.44), (cx + sg * 78, -T * 0.38), (cx + sg * 88, -T * 0.32)]), LINE * 0.45,
                smooth=True)


def _hoodie(C, col, dkc, cx):
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    gw = D.get("girth", 1.0)
    w0, w1 = 138 * gw, 140 * gw
    pt.blob(up(tor_poly(C, w0, w1)), col, n=8)
    rib = D.get("jacket_dk", dk(col, 0.82))
    pt.shape(up([(-w0 + 14 + 16 * k, -30), (w0 - 14 - 22 * k, -30), (w0 - 6 - 22 * k, 20), (-w0 + 6 + 16 * k, 20)]),
             rib, LINE * 0.7)
    for x in np.linspace(-w0 + 40, w0 - 40, 9):
        pt.line(up([(x + 8 * k, -24), (x + 8 * k, 14)]), LINE * 0.3, dk(rib, 0.8))
    if back:   # hood hanging down the back
        pt.blob(up([(-112, -T + 12), (-96, -T - 36), (96, -T - 36), (112, -T + 12), (74, -T * 0.52), (0, -T * 0.42),
                    (-74, -T * 0.52)]), col, n=6)
        pt.line(up([(0, -T - 30), (0, -T * 0.46)]), LINE * 0.55)
        return
    pt.shape(up([(cx - 92, -T * 0.38), (cx + 92, -T * 0.38), (cx + 112, -34), (cx - 112, -34)]), col, LINE * 0.6)
    for sg in (-1, 1):                                  # pocket openings
        pt.line(up([(cx + sg * 92, -T * 0.38), (cx + sg * 118, -T * 0.2), (cx + sg * 112, -34)]), LINE * 0.6,
                smooth=True)
    pt.blob(up([(cx - 124, -T + 34), (cx - 122, -T - 20), (cx - 62, -T - 52), (cx + 62, -T - 52),
                (cx + 122, -T - 20), (cx + 124, -T + 34), (cx + 62, -T + 12), (cx, -T + 26), (cx - 62, -T + 12)]),
            col, n=6)                                   # hood bunched around the neck
    pt.line(up([(cx - 70, -T + 2), (cx, -T + 18), (cx + 70, -T + 2)]), LINE * 0.5, smooth=True)
    for sg in (-1, 1):                                  # drawstrings
        a = up((cx + sg * 26, -T + 20))
        b = up((cx + sg * 34, -T * 0.62))
        pt.stroke([a, (a + b) / 2 + (sg * 4, 0), b], D.get("cord", WHITE), 12, LINE * 0.45, smooth=True, shade=False)
        pt.shape([b + (-9, -2), b + (9, -2), b + (7, 26), b + (-7, 26)], dk(col, 0.6), LINE * 0.4, shade=False)


def neckwear(C):
    """lanyard + ID card, headphones resting around the neck (over any garment)."""
    D, pt, up, T, k, back = C.D, C.pt, C.up, C.T, C.k, C.back
    cx = 10 + 30 * k
    if D.get("kerchief"):     # knotted neckerchief: band round the neck, knot + two tails at the front
        kc = D["kerchief"]
        if back:
            pt.blob(up([(-80, -T + 4), (80, -T + 4), (40, -T + 60), (0, -T + 84), (-40, -T + 60)]), kc, LINE * 0.8, n=4)
        else:
            pt.blob(up([(cx - 76, -T + 2), (cx + 76, -T + 2), (cx + 52, -T + 40), (cx - 52, -T + 40)]), kc, LINE * 0.8,
                    n=4)
            for dx, ln in ((-22, 96), (20, 84)):
                pt.blob(up([(cx + dx * 0.4 - 14, -T + 36), (cx + dx * 0.4 + 14, -T + 36), (cx + dx + 16, -T + 36 + ln),
                            (cx + dx - 14, -T + 40 + ln)]), kc, LINE * 0.7, n=3)
            pt.ell(*up((cx, -T + 40)), 24, 20, kc, LINE * 0.7)
    if D.get("choker") and not back:   # hair-pipe choker: rows of long white bone pipes, a brass bead in the middle
        pc = D["choker"]
        for i, (y0, w) in enumerate(((-T + 12, 62), (-T + 32, 66))):
            pt.shape(up([(cx - w, y0), (cx + w, y0), (cx + w - 2, y0 + 18), (cx - w + 2, y0 + 18)]), pc, LINE * 0.55,
                     shade=False)
            for x in np.arange(cx - w + 24, cx + w - 10, 24):
                pt.line(up([(x, y0 + 2), (x, y0 + 16)]), LINE * 0.35)
        pt.line(up([(cx, -T + 10), (cx, -T + 52)]), LINE * 0.5, D.get("choker_bead", (160, 92, 40)))
        pt.ell(*up((cx, -T + 32)), 12, 12, D.get("brass", (70, 170, 214)), LINE * 0.4)
    if D.get("lanyard") and not back:
        lc = D["lanyard"]
        clip = up((cx + 8, -T * 0.4))
        for sg in (-1, 1):
            pt.stroke([up((cx + sg * 58, -T + 4)), up((cx + sg * 34, -T * 0.68)), clip], lc, 15, LINE * 0.45,
                      smooth=True, shade=False)
        top = -T * 0.4 + 18
        card = [(cx - 40, top), (cx + 56, top), (cx + 56, top + 122), (cx - 40, top + 122)]
        pt.shape(up(card), WHITE, LINE * 0.7, shade=False)
        pt.shape(up([(cx - 40, top), (cx + 56, top), (cx + 56, top + 30), (cx - 40, top + 30)]), lc, LINE * 0.5,
                 shade=False)
        pt.shape(up([(cx - 28, top + 42), (cx + 4, top + 42), (cx + 4, top + 80), (cx - 28, top + 80)]),
                 (200, 200, 200), LINE * 0.4, shade=False)
        pt.ell(*up((cx - 12, top + 56)), 9, 9, WHITE, LINE * 0.3, shade=False)
        for y in (top + 52, top + 70, top + 98):
            pt.line(up([(cx + 14, y), (cx + 44, y)]) if y < top + 90 else up([(cx - 26, y), (cx + 40, y)]),
                    LINE * 0.35, (90, 90, 100))
        pt.ell(*clip, 12, 12, STEEL, LINE * 0.5)
    if D.get("headphones"):
        hc = D["headphones"]
        if back:
            pt.stroke(up([(-118, -T + 2), (0, -T - 44), (118, -T + 2)]), hc, 26, LINE * 0.6, smooth=True)
            for sg in (-1, 1):
                pt.ell(*up((sg * 124, -T + 22)), 40, 50, hc, LINE * 0.8, C.lean)
            return
        pt.stroke(up([(cx - 84, -T + 40), (cx, -T - 30), (cx + 84, -T + 40)]), hc, 22, LINE * 0.6, smooth=True)
        for sg in (-1, 1):
            if k and sg > 0:
                continue          # 3/4 view: the far cup (screen-right) is hidden behind the neck and chin
            c = up((cx + sg * (84 + 10 * k), -T + 56))
            pt.ell(c[0], c[1], 40, 50, hc, LINE * 0.8, C.lean + sg * 0.3)
            pt.ell(c[0] - sg * 2, c[1] + 2, 22, 32, dk(hc, 0.5), LINE * 0.45, C.lean + sg * 0.3, shade=False)


def glasses(C):
    """glasses over the eyes; pose field specs slides them along the nose (0 low, 1 at the tip, -1 up)."""
    D, pt, H, p = C.D, C.pt, C.H, C.p
    kind = D.get("glasses")
    if kind in (None, "none") or C.back:
        return
    s = p.get("specs", 0.0)
    fc = D.get("glasses_col", INK)
    y0 = 24 + 24 * s if kind == "halfmoon" else 10 + 20 * s
    fsx = C.fsx
    xs = [fsx + sd * 46 * (0.82 if (fsx and sd < 0) else 1.0) for sd in (-1, 1)]
    for sd, x in zip((-1, 1), xs):
        if kind == "halfmoon":
            lens = np.vstack([[(x + 34, y0)], ellipse_pts(x, y0, 34, 24, 0, 16, 0, math.pi), [(x + 34, y0)]])
        else:
            lens = ellipse_pts(x, y0, 32, 30, 0, 28)
            lens = np.vstack([lens, lens[:1]])
        pt.line(H(lens), LINE * 0.55, fc)
        pt.line(H([(x + 8, y0 + 6), (x + 18, y0 + 14)]) if kind == "halfmoon" else H([(x + 6, y0 - 12), (x + 16, y0 - 4)]),
                LINE * 0.35, (200, 200, 200))
        ex = x + sd * 34
        if not (fsx and sd < 0):
            pt.line(H([(ex, y0 + 2), (sd * (C.rx - 6) + fsx * 0.4, y0 - 16)]), LINE * 0.5, fc)
    ty = y0 + (2 if kind == "halfmoon" else -2)
    pt.line(H([(xs[0] + 34, ty), ((xs[0] + xs[1]) / 2, ty - 8), (xs[1] - 34, ty)]), LINE * 0.5, fc, smooth=True)


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
    if sty == "fringe":       # buckskin sleeve with a fringe hanging off its lower edge
        fr = D.get("fringe", col)
        g_ = np.array([0.0, 1.0])
        for a, b in ((sh + (el - sh) * 0.2, el), (el, wr - (wr - el) * 0.2)):
            d = _n(b - a)
            n = _perp(d)
            nd = n if np.dot(n, g_) >= 0 else -n
            if abs(np.dot(d, g_)) > 0.93:     # hanging straight: fringe on the back (outer) seam
                nd = np.array([-1.0 if C.fac == "r" or side < 0 else 1.0, 0.0])
            q = [a + nd * 30, b + nd * 30, b + nd * 64, a + nd * 64]
            pt.shape(q, fr, LINE * 0.5, shade=False)
            for u in np.linspace(0.1, 0.9, 6):
                m = a + (b - a) * u
                pt.line([m + nd * 40, m + nd * 64], LINE * 0.32)
        pt.stroke([sh, el, wr], col, 78)
    elif sty == "rolled":     # sleeve rolled up past the elbow, bare forearm
        pt.stroke([sh, el, wr], SKIN, 62)
        d = _n(wr - el)
        cuff = el + d * 26
        pt.stroke([sh, cuff], col, 78)
        nn = _perp(d)
        pt.shape([cuff - nn * 44 - d * 12, cuff + nn * 44 - d * 12, cuff + nn * 42 + d * 18, cuff - nn * 42 + d * 18],
                 D.get("roll", dk(col, 0.86)), LINE * 0.7, shade=False)
        return
    elif sty == "dress":      # Plains wool dress: open cape-like sleeve hanging under the upper arm, bare forearm
        pt.stroke([sh, el, wr], SKIN, 62)
        end = el + _n(wr - el) * 30
        g_ = np.array([0.0, 1.0])
        a = sh + (el - sh) * 0.3
        flap = [a, end, end + g_ * 74 + _n(end - a) * 8, (a + end) / 2 + g_ * 70, a + g_ * 40]
        pt.blob(flap, col, LINE * 0.8, n=4)
        pt.shape([a + g_ * 30, (a + end) / 2 + g_ * 58, end + g_ * 60, end + g_ * 72, (a + end) / 2 + g_ * 70,
                  a + g_ * 42], D.get("selvage", (226, 230, 232)), LINE * 0.4, shade=False)
        pt.stroke([sh, el, end], col, 92)
        return
    elif sty in ("long", "mail", "plate"):
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
    if g == "blazer" and sty == "long":
        d = _n(wr - el)
        if D.get("tweed", True):
            for u in (0.3, 0.7):
                for o in (-18, 16):
                    q = sh + (el - sh) * u + _perp(_n(el - sh)) * o
                    pt.line([q - (7, 7), q + (7, 7)], LINE * 0.3, dk(col, 0.78))
        pc = el + d * 8                                  # suede elbow patch with stitching
        ang = math.atan2(d[1], d[0]) - math.pi / 2
        pt.ell(pc[0], pc[1], 30, 40, D.get("patch", (40, 62, 96)), LINE * 0.6, ang)
        st = ellipse_pts(pc[0], pc[1], 21, 31, ang, 14)
        for a_, b_ in zip(st[::2], st[1::2]):
            pt.line([a_, b_], LINE * 0.25, (150, 170, 190))
        q = wr - d * 30
        pt.line([q - _perp(d) * 38, q + _perp(d) * 38], LINE * 0.5)
    if g == "hoodie" and sty == "long":                  # ribbed cuff
        d = _n(wr - el)
        nn = _perp(d)
        q = wr - d * 40
        pt.shape([q - nn * 36, q + nn * 36, q + nn * 34 + d * 30, q - nn * 34 + d * 30],
                 D.get("jacket_dk", dk(col, 0.82)), LINE * 0.6, shade=False)
        for u in (-0.5, 0.0, 0.5):
            pt.line([q + nn * 34 * u + d * 4, q + nn * 34 * u + d * 26], LINE * 0.25, dk(col, 0.6))
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
    elif kind == "mug":        # chipped mug held by its handle, body beside the hand (stays upright)
        hs = 1 if C.fac != "b" else -1
        o = c + np.array([hs * 92, -46])
        mc = D.get("mug", (200, 226, 238))
        hp = [o + (-hs * 56, -34), c + (-hs * 6, -30), c + (-hs * 8, 12), o + (-hs * 56, 26)]
        pt.stroke(crom(hp, False, 6), mc, 22, LINE * 0.7, shade=False)
        pt.shape([o + (-58, -66), o + (58, -66), o + (52, 70), o + (-52, 70)], mc, LINE * 0.9)
        pt.ell(o[0], o[1] - 66, 58, 15, (50, 70, 100), LINE * 0.7, shade=False)          # coffee
        chip = o + (hs * 30, -72)                                                        # the chip in the rim
        pt.shape([chip + (-16, -4), chip + (16, -4), chip + (2, 16)], mc, LINE * 0.5, shade=False)
        pt.line([chip + (2, 16), chip + (8, 34)], LINE * 0.35)
        fx = o[0] - 12
        for a_, b_ in (((fx, o[1] - 30), (fx, o[1] + 40)), ((fx, o[1] - 30), (fx + 34, o[1] - 30)),
                       ((fx, o[1] + 2), (fx + 26, o[1] + 2))):
            pt.stroke([np.array(a_), np.array(b_)], RED, 14, LINE * 0.35, shade=False)
        if D.get("steam", True):
            for dx in (-16, 18):
                pt.line([o + (dx, -96), o + (dx + 12, -126), o + (dx - 4, -154), o + (dx + 8, -182)], LINE * 0.9,
                        (225, 225, 225), smooth=True)
        tip = o + (0, -66)
    elif kind == "red_pen":
        pt.stroke(R([(-40, 0), (120, 0)]), RED, 26, LINE * 0.7)
        pt.stroke(R([(60, 0), (124, 0)]), RED_DK, 28, LINE * 0.7)
        pt.line(R([(70, -12), (110, -12)]), LINE * 0.4, STEEL)
        pt.shape(R([(-40, -13), (-78, -3), (-82, 0), (-78, 3), (-40, 13)]), WHITE, LINE * 0.6, shade=False)
        pt.dot(*R([(-80, 0)])[0], 6, RED)
        tip = R([(-82, 0)])[0]
    elif kind == "stamp":      # rubber stamp, handle up, red pad down (stays upright)
        pt.ell(c[0], c[1] - 74, 36, 32, WOOD, LINE * 0.8)
        pt.stroke([c + (0, -50), c + (0, 46)], WOOD, 30, LINE * 0.8)
        pt.shape([c + (-76, 40), c + (76, 40), c + (76, 92), c + (-76, 92)], WOOD_DK, LINE * 0.8)
        pt.shape([c + (-80, 92), c + (80, 92), c + (80, 112), c + (-80, 112)], RED, LINE * 0.7, shade=False)
        tip = c + (0, 112)
    elif kind == "detector":
        tip = _detector(C, c, side)
    elif kind in ("exam", "exam_f"):
        tip = _exam(C, c, side, kind)
    elif kind == "note":       # small folded paper held up between the fingers (upright)
        u_ = _n(R([(1, 0)])[0] - c)
        r_ = -_perp(u_)
        o = c + u_ * 52
        w, h = 56, 44
        pc = D.get("note", PAPER)
        pt.shape([o - r_ * w - u_ * h, o + r_ * w - u_ * h + u_ * 6, o + r_ * w + u_ * h, o - r_ * w + u_ * h - u_ * 4],
                 pc, LINE * 0.7)
        pt.line([o - u_ * h + u_ * 2, o + u_ * h - u_ * 1], LINE * 0.4, dk(pc, 0.75))          # the fold
        pt.shape([o + r_ * w + u_ * h, o + r_ * (w - 22) + u_ * h, o + r_ * w + u_ * (h - 20)], dk(pc, 0.88),
                 LINE * 0.4, shade=False)                                                    # dog-ear
        for v in (-14, 6):
            pt.line([o + r_ * 10 + u_ * v, o + r_ * (w - 14) + u_ * v], LINE * 0.3, (110, 110, 120))
        tip = o
    elif kind == "cartridge":  # one fired brass .45-55 case, held up between finger and thumb (upright, mouth up)
        u_ = _n(R([(1, 0)])[0] - c)
        r_ = -_perp(u_)
        br = D.get("cartridge", (64, 178, 226))
        b0, b1 = c + u_ * 6, c + u_ * 112
        pt.shape([b0 - r_ * 17, b1 - r_ * 15, b1 + r_ * 15, b0 + r_ * 17], br, LINE * 0.6)
        pt.shape([b0 - r_ * 21, b0 - r_ * 21 + u_ * 10, b0 + r_ * 21 + u_ * 10, b0 + r_ * 21], dk(br, 0.85), LINE * 0.5,
                 shade=False)                                                                 # rim
        pt.ell(b1[0], b1[1], 14, 6, (40, 70, 90), LINE * 0.4, C.lean, shade=False)           # open mouth
        pt.line([b0 + r_ * 6 + u_ * 22, b1 + r_ * 6 - u_ * 12], LINE * 0.35, (200, 236, 250))  # glint
        if D.get("cartridge_glint", True):
            for ang in (0.0, 0.8, -0.8):
                d_ = rot(np.array([0.0, -1.0]), ang)
                pt.line([b1 + d_ * 24, b1 + d_ * 44], LINE * 0.45, (110, 220, 250))
        tip = b1
    elif kind == "beer":       # glass beer mug with a foam head, held by its handle (stays upright)
        hs = 1 if C.fac != "b" else -1
        o = c + np.array([hs * 88, -44])
        gl = (226, 226, 214)
        hp = [o + (-hs * 50, -38), c + (-hs * 4, -34), c + (-hs * 6, 14), o + (-hs * 50, 30)]
        pt.stroke(crom(hp, False, 6), gl, 22, LINE * 0.7, shade=False)
        pt.shape([o + (-54, -62), o + (54, -62), o + (50, 70), o + (-50, 70)], D.get("beer", (40, 156, 224)), LINE * 0.9)
        pt.shape([o + (-50, 52), o + (50, 52), o + (50, 70), o + (-50, 70)], gl, LINE * 0.5, shade=False)  # glass base
        for x in (-26, 0, 26):                                                     # facets of the glass
            pt.line([o + (x, -40), o + (x * 0.95, 46)], LINE * 0.3, (90, 196, 240))
        pt.line([o + (-38, -30), o + (-36, 36)], LINE * 0.5, (190, 236, 250))      # glint
        pt.blob([o + (-62, -58), o + (-60, -88), o + (-30, -106), o + (2, -96), o + (34, -110), o + (62, -86),
                 o + (60, -58), o + (36, -50), o + (40, -24), o + (26, -50)], WHITE, LINE * 0.8, n=4)
        tip = o + (0, -96)
    elif kind == "bugle":      # brass cavalry trumpet: one long loop, bell forward, mouthpiece back, yellow cord
        _bugle(pt, R, D)
        tip = R([(280, 0)])[0]
    elif kind == "folder":     # manila file folder (upright above the hand; rotL=180 hangs it below the hand)
        u_ = _n(R([(1, 0)])[0] - c)
        r_ = -_perp(u_)
        o = c + u_ * 120
        mc = D.get("folder", (120, 196, 226))
        P_ = lambda x, y: o + r_ * x + u_ * y
        pt.shape([P_(-112, -140), P_(112, -140), P_(112, 140), P_(-30, 140), P_(-40, 160), P_(-104, 160),
                  P_(-112, 140)], dk(mc, 0.9), LINE * 0.8)                                      # back + tab
        pt.shape([P_(-92, 150), P_(-52, 150), P_(-52, 140), P_(-92, 140)], WHITE, LINE * 0.3, shade=False)  # label
        pt.shape([P_(-96, -124), P_(104, -124), P_(100, 150), P_(-96, 150)], WHITE, LINE * 0.5, shade=False)  # papers
        pt.shape([P_(-112, -140), P_(112, -140), P_(108, 126), P_(-112, 126)], mc, LINE * 0.8)      # front cover
        pt.line([P_(-60, 90), P_(60, 90)], LINE * 0.35, dk(mc, 0.7))
        pt.line([P_(-60, 70), P_(30, 70)], LINE * 0.35, dk(mc, 0.7))
        tip = o
    elif kind == "sticker":    # round sticker on the fingertip: the "dead" face, one corner peeling
        o = R([(118, 0)])[0]
        sc_ = D.get("sticker", (60, 214, 250))
        pt.ell(o[0], o[1], 54, 54, sc_, LINE * 0.8)
        for sg in (-1, 1):
            e = o + (sg * 20, -10)
            pt.line([e + (-9, -9), e + (9, 9)], LINE * 0.55)
            pt.line([e + (-9, 9), e + (9, -9)], LINE * 0.55)
        pt.line([o + (-16, 24), o + (16, 24)], LINE * 0.55)
        pt.shape([o + (28, -46), o + (50, -24), o + (36, -22)], WHITE, LINE * 0.5, shade=False)
        tip = o
    if tip is not None:
        C.joints["tip" + tag] = np.asarray(tip, float)
        C.joints["grip" + tag] = c


DETECTOR_SHAFT = (196, 192, 188)
DETECTOR_COIL = (62, 60, 64)


def detector_coil_pos(C, c):
    """where the search coil sits (char units, y=0 is the ground): just above the ground in front of the feet.
    Pose field sweep (-1..1) swings it back/forward (3/4 view) or left/right (front/back view)."""
    sw = C.p.get("sweep", 0.0)
    if C.fac == "r":
        return np.array([max(c[0] + 360 + 160 * sw, 150.0), -40.0])
    return np.array([c[0] * 0.35 + 230 * sw, -14.0 if C.fac == "f" else -52.0])


def _detector(C, c, side):
    """1980s metal detector: armrest + grip, control box, telescopic shaft, cable, flat round search coil.
    The shaft always runs from the hand to the coil, so the coil stays just above the ground whatever the arm does."""
    pt, D = C.pt, C.D
    shaft = D.get("detector", DETECTOR_SHAFT)
    coilc = D.get("detector_coil", DETECTOR_COIL)
    co = detector_coil_pos(C, c)
    top = co + np.array([0, -16])                    # where the lower shaft meets the coil's yoke
    d = _n(top - c)
    n = _perp(d)
    if n[1] > 0:
        n = -n                                       # n = the shaft's upper side
    _, el, wr = C.arms[side]
    fa = _n(el - wr)                                 # up the forearm: the armrest sits under it, near the elbow
    back_end = c + fa * min(110.0, 0.75 * float(np.hypot(*(el - wr))))
    # coil first (the shaft and yoke sit on top of it)
    pt.ell(co[0], co[1], 112, 28, coilc, LINE * 0.9)
    pt.line([co + (-92, -6), co + (0, -18), co + (92, -6)], LINE * 0.4, (150, 150, 156), smooth=True)
    pt.shape([top + (-22, -6), top + (22, -6), top + (16, 14), top + (-16, 14)], coilc, LINE * 0.6, shade=False)
    # lower (telescopic) shaft + cable wrapped round it
    pt.stroke([c, top], shaft, 18, LINE * 0.7)
    j = c + (top - c) * 0.5
    pt.stroke([j - d * 14, j + d * 14], dk(shaft, 0.7), 28, LINE * 0.6, shade=False)
    L = float(np.hypot(*(top - c)))
    cab = [c + d * (110 + s) + n * (14 if i % 2 else -14) for i, s in enumerate(np.linspace(0, max(L - 150, 40), 9))]
    pt.line(cab + [top + (0, 4)], LINE * 0.35, smooth=True)
    # upper shaft, armrest cuff at the back end
    pt.stroke([back_end, c, c + d * 20], dk(shaft, 0.85), 22, LINE * 0.7)
    na = _perp(fa)
    if na[1] > 0:
        na = -na
    cuff = [back_end - na * 6 + fa * 10, back_end + na * 40 + fa * 22, back_end + na * 46 - fa * 6,
            back_end + na * 14 - fa * 40, back_end - fa * 44]
    pt.blob(cuff, BLACK, LINE * 0.7, n=4)
    pt.stroke([c + fa * 40, c + d * 36], BLACK, 30, LINE * 0.6, shade=False)         # rubber grip
    # control box with a meter on the shaft just below the hand
    b0 = c + d * 64
    box = [b0 - n * 6, b0 + d * 96 - n * 6, b0 + d * 96 + n * 62, b0 + n * 62]
    pt.shape(box, D.get("detector_box", (70, 70, 76)), LINE * 0.75)
    m0 = b0 + d * 18 + n * 18
    meter = [m0, m0 + d * 58, m0 + d * 58 + n * 34, m0 + n * 34]
    pt.shape(meter, (200, 236, 240), LINE * 0.4, shade=False)
    mc = m0 + d * 29 + n * 2
    pt.line([mc, mc + d * 14 + n * 26], LINE * 0.35, RED)
    pt.dot(*(b0 + d * 84 + n * 30), 8, (60, 200, 250))
    return co


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
    if D.get("feather") and not back and not over:
        _feather(C)
    if D.get("style") == "ponytail" and not back and not over:
        _ponytail(C)
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
        if D.get("feather"):
            _feather(C)
        if st == "ponytail":
            _ponytail(C)
    elif D.get("age_lines"):
        _age_lines(C)
    hw = C.hw
    if hw not in ("none", "beanie_legacy"):
        headwear(C, hw)
    if st == "braids" and not C.back:
        _braids(C)


def hair2(C, st):
    D, pt, H, rx, ry, k, back, hw = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back, C.hw
    hc = D.get("hair", BLACK)
    sh = 20 * k
    covered = hw in ("nemes", "hood", "turban", "kabuto", "galea", "viking", "nasal", "kettle", "chinese_helm",
                     "wushamao", "tophat", "tricorn", "kasa", "slouch", "boonie", "cap")
    if st == "curly":
        _curly(C, covered)
        return
    if st == "braids":
        _braid_cap(C, covered)
        return
    if st == "ponytail":          # pulled-back cap; the tail itself is drawn by _ponytail
        st = "short"
    if back:
        if st == "curtains":
            st = "short"
        if st == "receding":      # horseshoe low on the back of the head + the tufts sticking out at the sides
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 14), -64), (sg * (rx + 18), -84), (sg * (rx + 44), -54), (sg * (rx + 30), -30),
                           (sg * (rx + 46), -4), (sg * (rx + 20), 34), (sg * (rx - 14), 24)]), hc, LINE * 0.9, n=5)
            pt.blob(H([(-rx - 2, 30), (-rx * 0.5, 58), (0, 66), (rx * 0.5, 58), (rx + 2, 30), (rx - 12, 120),
                       (0, ry + 6), (-rx + 12, 120)]), hc, LINE * 0.9, n=5)
            return
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
    elif st == "receding":    # grey side tufts that stick out + a few combed-over wisps
        for sg in (-1, 1):
            pt.blob(H([(sg * (rx - 14), -64), (sg * (rx + 18), -84), (sg * (rx + 44), -54), (sg * (rx + 30), -30),
                       (sg * (rx + 46), -4), (sg * (rx + 20), 34), (sg * (rx - 14), 24)]), hc, LINE * 0.9, n=5)
        if not covered:
            for dx, dy in ((-30, 0), (0, -10), (30, -4)):
                pt.stroke(H([(-rx * 0.62 + dx + sh, -ry + 52 + dy), (dx * 0.4 + sh, -ry + 6 + dy),
                             (rx * 0.5 + dx * 0.5 + sh, -ry + 34 + dy)]), hc, 13, LINE * 0.5, smooth=True, shade=False)
    elif st == "curtains":    # middle-parted fringe, volume on top
        if covered:
            for sg in (-1, 1):
                pt.blob(H([(sg * (rx - 6), -70), (sg * (rx + 12), -66), (sg * (rx + 10), 10), (sg * (rx - 16), 0)]),
                        hc, LINE * 0.9, n=4)
            return
        px = sh + 8                                      # parting
        pt.blob(H([(-rx - 8, 14), (-rx - 22, -56), (-rx * 0.82, -ry + 4), (-rx * 0.3, -ry - 34), (rx * 0.3, -ry - 38),
                   (rx * 0.82, -ry + 2), (rx + 22, -56), (rx + 8, 14), (rx - 18, 6), (rx - 20, -34),
                   (rx * 0.55 + sh, -46), (px + 26, -84), (px, -120), (px - 26, -84), (-rx * 0.55 + sh, -46),
                   (-rx + 20, -34), (-rx + 18, 6)]), hc, n=5)
        for sg in (-1, 1):
            pt.line(H([(px + sg * 6, -116), (px + sg * 50, -ry + 4), (px + sg * 96, -ry + 30)]), LINE * 0.55,
                    smooth=True)
        pt.line(H([(px, -120), (px - 4, -ry - 20)]), LINE * 0.55)
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


def _curly(C, covered):
    """short hair with curls (Custer, 1876): a cap of hair + curl knobs; under a hat the curls poke out at the
    sides and the nape."""
    D, pt, H, rx, ry, k, back = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back
    hc = D.get("hair", BLACK)
    hd = D.get("hair_dk", dk(hc, 0.8))
    sh = 20 * k
    if back:
        low = ry * 0.42
        if covered:          # only the nape shows under the hat
            pt.blob(H([(-rx + 2, -40), (rx - 2, -40), (rx - 4, low - 10), (0, low + 10), (-rx + 4, low - 10)]), hc,
                    n=6)
        else:
            pt.blob(H([(-rx - 10, low), (-rx - 16, -60), (-rx * 0.7, -ry + 4), (0, -ry - 22), (rx * 0.7, -ry + 4),
                       (rx + 16, -60), (rx + 10, low), (0, low + 26)]), hc, n=6)
        for x, y in ((-rx + 14, low - 14), (-rx * 0.45, low + 4), (0, low + 12), (rx * 0.45, low + 4),
                     (rx - 14, low - 14)):
            pt.ell(*H([(x, y)])[0], 24, 21, hc, LINE * 0.75)
        return
    knobs = []
    for sg in (-1, 1):
        if k and sg > 0:     # 3/4 view: the far side shows less
            knobs += [(rx - 2, -30)]
        else:
            knobs += [(sg * (rx + 6), -42), (sg * (rx + 10), -8)]
    knobs += [(-rx + 10 if not k else -rx + 2, 24)]
    if k:
        knobs += [(-rx - 2, 24 - 30)]
    if not covered:
        pt.blob(H([(-rx - 6, 10), (-rx - 16, -60), (-rx * 0.75, -ry + 4), (0, -ry - 28), (rx * 0.75, -ry + 4),
                   (rx + 16, -60), (rx + 6, 10), (rx - 18, 0), (rx - 28, -60), (sh + 40, -92), (sh, -76),
                   (-rx * 0.4 + sh, -96), (-rx + 26, -60), (-rx + 18, 0)]), hc, n=5)
        knobs += [(sh - 50, -ry - 6), (sh + 30, -ry - 14), (sh + 90, -ry + 10), (sh - 110, -ry + 30)]
        pt.line(H([(sh - 10, -92), (sh + 14, -110), (sh + 40, -96)]), LINE * 0.5, hd, smooth=True)
    for x, y in knobs:
        pt.ell(*H([(x, y)])[0], 23, 21, hc, LINE * 0.75)
        pt.line(H([(x - 8, y + 2), (x + 2, y - 6), (x + 10, y + 2)]), LINE * 0.3, hd, smooth=True)


def _braid_cap(C, covered):
    """hair parted in the middle and drawn back over the ears into two braids (Lakota / Cheyenne). `hair_grey` BGR
    adds grey streaks (an elder). The braids themselves are drawn by _braids (over the chest)."""
    D, pt, H, rx, ry, k, back = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back
    hc = D.get("hair", BLACK)
    grey = D.get("hair_grey")
    sh = 20 * k
    if back:
        pt.blob(H([(-rx - 10, 40), (-rx - 16, -60), (-rx * 0.7, -ry + 4), (0, -ry - 20), (rx * 0.7, -ry + 4),
                   (rx + 16, -60), (rx + 10, 40), (rx - 30, ry * 0.5), (0, ry * 0.56), (-rx + 30, ry * 0.5)]), hc, n=6)
        pt.line(H([(0, -ry - 14), (0, ry * 0.4)]), LINE * 0.5, dk(hc, 0.6) if sum(hc) > 200 else (90, 90, 96))
        return
    if covered:
        cap = [(-rx - 8, 30), (-rx - 12, -70), (-rx + 10, -80), (-rx + 16, 20)]
        for sg in (-1, 1):
            pt.blob(H([(sg * x, y) for x, y in cap]), hc, LINE * 0.9, n=4)
        return
    px = sh + 6
    cap = [(-rx - 8, 34), (-rx - 16, -50), (-rx * 0.76, -ry + 2), (px, -ry - 16), (rx * 0.76, -ry + 2), (rx + 16, -50),
           (rx + 8, 34), (rx - 16, 26), (rx - 22, -52), (rx * 0.52 + sh, -ry + 50), (px, -ry + 58),
           (-rx * 0.52 + sh, -ry + 50), (-rx + 22, -52), (-rx + 16, 26)]
    pt.blob(H(cap), hc, n=5)
    pt.line(H([(px, -ry + 56), (px - 2, -ry - 10)]), LINE * 0.55, (110, 110, 118) if sum(hc) < 200 else dk(hc, 0.6))
    # strands combed back from the parting toward the ears: they run between the outer and inner hair edge
    for i, o in enumerate((0.3, 0.65) if not grey else (0.2, 0.45, 0.7)):
        for sg in (-1, 1):
            ox = sh * (1 if sg > 0 else 0.5)
            q = [(px + sg * 14, -ry + 4 + 46 * o), (sg * rx * (0.76 - 0.24 * o) + ox * 0.5, -ry + 2 + 48 * o),
                 (sg * (rx + 16 - 38 * o), -50), (sg * (rx + 8 - 24 * o), 20)]
            c_ = grey if (grey and i != 1) else ((110, 110, 118) if sum(hc) < 200 else dk(hc, 0.6))
            pt.line(H(q), LINE * (0.55 if grey else 0.4), c_, smooth=True)


def _braids(C):
    """two braids hanging from behind the ears down in front of the shoulders (gravity: they hang straight down
    whatever the head does). braid_len (units, default 250), braid_wrap = BGR fur / cloth wrapping (None = plaits
    showing), braid_tie = BGR tie at the end."""
    D, pt, H, rx, ry, k = C.D, C.pt, C.H, C.rx, C.ry, C.k
    hc = D.get("hair", BLACK)
    grey = D.get("hair_grey")
    wrap = D.get("braid_wrap")
    L = D.get("braid_len", 340)
    for sg in (-1, 1):
        if k:
            top = H([(-rx + 14, 60)])[0] if sg < 0 else H([(rx - 30, 70)])[0]
            drift = -6 if sg < 0 else -4
        else:
            top = H([(sg * (rx - 14), 60)])[0]
            drift = -sg * 8
        mid = top + np.array([drift + sg * 8, L * 0.4])
        end = top + np.array([drift * 2.5, L])
        path = crom([top, mid, end], False, 8)
        pt.stroke(path, hc, 38, LINE * 0.8)
        Ls = np.r_[0, np.cumsum(np.hypot(*np.diff(path, axis=0).T))]

        def at(s):
            return np.array([np.interp(s, Ls, path[:, 0]), np.interp(s, Ls, path[:, 1])])
        for i, s in enumerate(np.arange(18, Ls[-1] - 10, 22)):     # plait chevrons
            q = at(s)
            pt.line([q + (-15, -7), q + (0, 4), q + (15, -7)], LINE * 0.4,
                    grey if (grey and i % 3 == 1) else (dk(hc, 0.55) if sum(hc) > 200 else (96, 96, 104)))
        tie = D.get("braid_tie", RED)
        if wrap:
            a, b = at(Ls[-1] * 0.42), at(Ls[-1] * 0.94)
            pt.stroke([a, (a + b) / 2 + (sg * 2, 0), b], wrap, 48, LINE * 0.8, smooth=True)
            for s in np.linspace(Ls[-1] * 0.46, Ls[-1] * 0.9, 7):  # fur / cloth texture ticks
                q = at(s)
                pt.line([q + (-17, 4), q + (-6, -6)], LINE * 0.35, dk(wrap, 0.6))
                pt.line([q + (6, 2), q + (17, -8)], LINE * 0.35, dk(wrap, 0.6))
            for s in (Ls[-1] * 0.42, Ls[-1] * 0.94):
                q = at(s)
                pt.shape([q + (-25, -6), q + (25, -6), q + (25, 6), q + (-25, 6)], tie, LINE * 0.5, shade=False)
        else:
            q = at(Ls[-1] * 0.9)
            pt.shape([q + (-21, -6), q + (21, -6), q + (21, 6), q + (-21, 6)], tie, LINE * 0.5, shade=False)
        tip = at(Ls[-1])
        pt.blob([tip + (-12, -6), tip + (12, -6), tip + (9, 30), tip + (0, 40), tip + (-9, 30)], hc, LINE * 0.7, n=4)


def _feather(C):
    """one eagle feather standing up at the back of the head (white, dark tip, a small dyed tuft at the base)."""
    D, pt, H, rx, ry, k, back = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back
    if back:
        base, tipx = (10, -ry + 70), 30
    elif k:
        base, tipx = (-rx * 0.62, -ry + 44), -rx * 0.9
    else:
        base, tipx = (-rx * 0.32, -ry + 40), -rx * 0.5
    L = D.get("feather_len", 250)
    b = np.array(base, float)
    t = np.array([tipx, base[1] - L])
    d = _n(t - b)
    n = _perp(d)
    vane = [b + d * 60 + n * 10, b + d * 120 + n * 26, t - d * 30 + n * 24, t + d * 6, t - d * 30 - n * 22,
            b + d * 120 - n * 24, b + d * 60 - n * 10]
    pt.blob(H(vane), D.get("feather", WHITE) if isinstance(D.get("feather"), tuple) else WHITE, LINE * 0.8, n=4)
    dkt = [t - d * 96 + n * 25, t - d * 30 + n * 24, t + d * 6, t - d * 30 - n * 22, t - d * 96 - n * 23,
           t - d * 84]
    pt.blob(H(dkt), D.get("feather_tip", (40, 44, 56)), LINE * 0.6, n=3)
    pt.line(H([b + d * 30, t - d * 20]), LINE * 0.4, (150, 150, 156))
    pt.blob(H([b + d * 40 + n * 16, b + d * 76 + n * 14, b + d * 70 - n * 14, b + d * 40 - n * 16]),
            D.get("feather_tuft", RED), LINE * 0.5, n=3)
    pt.stroke(H([b - d * 6, b + d * 44]), D.get("feather_wrap", (60, 90, 130)), 16, LINE * 0.5, shade=False)


def _ponytail(C):
    """ponytail tied at the back of the head (behind the egg in front / 3/4 views, over it in the back view)."""
    D, pt, H, rx, ry, k, back = C.D, C.pt, C.H, C.rx, C.ry, C.k, C.back
    hc = D.get("hair", BLACK)
    if back:
        a = H([(0, -ry * 0.3)])[0]
        pt.blob([a + (-34, -10), a + (34, -10), a + (40, 150), a + (6, 230), a + (-30, 160)], hc, n=5)
        pt.ell(a[0], a[1], 30, 18, D.get("hair_tie", RED), LINE * 0.6, C.ha)
        return
    if k:
        a = H([(-rx - 4, -ry * 0.25)])[0]
        pts = [a + (10, -20), a + (-40, -6), a + (-76, 80), a + (-64, 190), a + (-40, 170), a + (-20, 70)]
    else:
        a = H([(-rx * 0.5, -ry * 0.5)])[0]
        pts = [a + (10, -10), a + (-70, 10), a + (-rx * 0.62 - 20, 120), a + (-rx * 0.62 - 6, 230),
               a + (-rx * 0.62 + 20, 170), a + (-40, 60)]
    pt.blob(pts, hc, n=5)


def _age_lines(C):
    """a few lines for an older face: smile folds beside the mouth, crow's feet."""
    pt, H, f = C.pt, C.H, C.fsx
    mx, my = f + 4, 80
    col = C.D.get("age_col", (150, 150, 158))
    for sg in (-1, 1):
        if f and sg < 0:
            pt.line(H([(mx - 46, my - 34), (mx - 54, my - 8), (mx - 46, my + 14)]), LINE * 0.45, col, smooth=True)
            continue
        pt.line(H([(mx + sg * 50, my - 38), (mx + sg * 60, my - 8), (mx + sg * 52, my + 16)]), LINE * 0.45, col,
                smooth=True)
        ex = f + sg * 46 + sg * 34
        pt.line(H([(ex, 2), (ex + sg * 16, -4)]), LINE * 0.4, col)
        pt.line(H([(ex, 14), (ex + sg * 16, 18)]), LINE * 0.4, col)


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
    elif m == "droop":      # big drooping cavalry moustache: two heavy lobes, ends hanging past the mouth corners
        for sg in (-1, 1):
            pt.blob(H([(mx + sg * 2, my - 12), (mx + sg * 40, my - 12), (mx + sg * 78, my + 10),
                       (mx + sg * 98, my + 58), (mx + sg * 86, my + 74), (mx + sg * 62, my + 42),
                       (mx + sg * 30, my + 22), (mx + sg * 2, my + 16)]), col, LINE * 0.85, n=5)
        hd = D.get("hair_dk", dk(col, 0.8))
        for sg in (-1, 1):
            pt.line(H([(mx + sg * 20, my + 2), (mx + sg * 56, my + 18), (mx + sg * 80, my + 50)]), LINE * 0.35, hd,
                    smooth=True)
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
    elif hw == "slouch":      # wide-brim slouch hat, pinched crown with a centre crease, drooping brim
        bw = D.get("brim", 116)
        sh = f * 0.4
        crown = [(-rx * 0.74, -84), (-rx * 0.76, -ry - 46), (-rx * 0.34 + sh, -ry - 84), (sh, -ry - 64),
                 (rx * 0.34 + sh, -ry - 84), (rx * 0.76, -ry - 46), (rx * 0.74, -84)]
        pt.blob(Hy(crown), col, n=6)
        if not back:
            pt.line(Hy([(sh, -ry - 62), (sh + 4, -ry - 20)]), LINE * 0.5, smooth=True)
        pt.shape(Hy([(-rx * 0.75, -122), (rx * 0.75, -122), (rx * 0.74, -86), (-rx * 0.74, -86)]), acc, LINE * 0.8)
        dip = 22 if not back else 10
        brim = [(-rx - bw, -54), (-rx - bw * 0.55, -92), (sh, -102), (rx + bw * 0.55, -92), (rx + bw, -54),
                (rx + bw * 0.5, -60), (f * 0.6, -72 + dip), (-rx - bw * 0.5, -60)]
        pt.blob(Hy(brim), col, n=5)
        pt.line(Hy([(-rx - bw * 0.7, -64), (f * 0.6, -82 + dip * 0.6), (rx + bw * 0.7, -64)]), LINE * 0.4,
                dk(col, 0.7), smooth=True)
    elif hw == "boonie":      # soft bush hat: round crown, stitched drooping brim
        sh = f * 0.35
        pt.blob(Hy([(-rx * 0.86, -76), (-rx * 0.84, -ry - 34), (sh, -ry - 52), (rx * 0.84, -ry - 34),
                    (rx * 0.86, -76)]), col, n=6)
        pt.shape(Hy([(-rx * 0.87, -110), (rx * 0.87, -110), (rx * 0.86, -78), (-rx * 0.86, -78)]), acc, LINE * 0.7)
        brim = [(-rx - 72, -30), (-rx - 40, -86), (sh, -94), (rx + 40, -86), (rx + 72, -30), (rx + 36, -44),
                (f * 0.6, -58), (-rx - 36, -44)]
        pt.blob(Hy(brim), col, n=5)
        for o in (12, 26):
            pt.line(Hy([(-rx - 64 + o, -38 - o * 0.3), (-rx - 30, -70 + o * 0.4), (f * 0.6, -80 + o * 0.6),
                        (rx + 30, -70 + o * 0.4), (rx + 64 - o, -38 - o * 0.3)]), LINE * 0.3, dk(col, 0.7),
                    smooth=True)
        if not back:
            for sg in (-1, 1):
                pt.dot(*Hy([(sg * rx * 0.6 + sh, -ry - 6)])[0], 7, dk(col, 0.6))
    elif hw == "cap":         # baseball cap, bill toward the facing direction
        sh = f * 0.4
        crown = [(-rx - 8, -62), (-rx + 2, -130), (-rx * 0.6, -ry - 24), (sh, -ry - 38), (rx * 0.6, -ry - 24),
                 (rx - 2, -130), (rx + 8, -62), (sh, -72)]
        pt.blob(Hy(crown), col, n=6)
        if back:
            pt.shape(Hy([(-46, -66), (46, -66), (40, -40), (-40, -40)]), WHITE, LINE * 0.6, shade=False)
            pt.line(Hy([(-46, -54), (46, -54)]), LINE * 0.5, col)
        else:
            for x in (-0.55, 0.0, 0.55):
                pt.line(Hy([(sh, -ry - 34), (x * rx + sh * 1.6, -70)]), LINE * 0.35, dk(col, 0.7), smooth=True)
            if D.get("hat2"):
                pt.shape(Hy([(sh - 36, -128), (sh + 36, -128), (sh + 34, -88), (sh - 34, -88)]), D["hat2"], LINE * 0.5,
                         shade=False)
            if k:
                bill = [(rx * 0.1 + f, -72), (rx + 14, -84), (rx + 126, -66), (rx + 132, -48), (rx + 40, -50),
                        (rx * 0.1 + f, -56)]
            else:
                bill = [(-rx * 0.86, -70), (-rx * 0.4, -86), (rx * 0.4, -86), (rx * 0.86, -70), (rx * 0.5, -46),
                        (0, -40), (-rx * 0.5, -46)]
            pt.blob(Hy(bill), D.get("bill", col), n=5)
        pt.dot(*Hy([(sh, -ry - 36)])[0], 12, dk(col, 0.7))
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


def _bugle(pt, R, D):
    """brass cavalry trumpet along the forearm frame: mouthpiece at the hand, one long loop, bell forward."""
    br = D.get("bugle", (64, 178, 226))
    tube = R([(20, -10), (120, -34), (210, -30), (250, -10), (210, 14), (120, 18), (60, 8)])
    pt.stroke(list(tube), br, 14, LINE * 0.6, smooth=True)
    bell = R([(230, -30), (290, -56), (300, -40), (300, 22), (290, 36), (230, 10)])
    pt.shape(list(bell), br, LINE * 0.7)
    pt.stroke(list(R([(60, 20), (90, 70), (150, 80), (210, 60), (240, 20)])), (40, 186, 236), 6, LINE * 0.4,
              smooth=True, shade=False)   # yellow cord


def _exam(C, c, side, kind):
    """an exam sheet held upright in front of the chest: header bar, three question lines, boxes; exam_f adds a red F."""
    pt, D = C.pt, C.D
    o = c + np.array([-90.0, 10.0])
    w, h = 160, 175
    P_ = lambda x, y: o + np.array([x, y], float)
    pt.shape([P_(-w, -h), P_(w, -h + 6), P_(w - 4, h), P_(-w + 4, h - 4)], D.get("exam", (240, 246, 248)), LINE * 0.8)
    pt.shape([P_(-w + 24, -h + 24), P_(w - 30, -h + 26), P_(w - 30, -h + 58), P_(-w + 24, -h + 56)], (40, 40, 44), 0,
             shade=False)
    for k in range(3):
        y = -h + 105 + k * 78
        pt.line([P_(-w + 30, y), P_(w - 96, y)], LINE * 0.35, (110, 110, 120))
        pt.shape([P_(w - 78, y - 30), P_(w - 30, y - 30), P_(w - 30, y + 14), P_(w - 78, y + 14)], (250, 252, 252),
                 LINE * 0.35, shade=False)
    if kind == "exam_f":
        pt.line([P_(110, -60), P_(30, -60), P_(30, 60)], LINE * 0.9, (52, 56, 214))
        pt.line([P_(30, 0), P_(90, 0)], LINE * 0.9, (52, 56, 214))
    return o
