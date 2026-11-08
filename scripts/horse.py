"""Horse rig (flat-cartoon-code-video library, ep02 Little Bighorn): a code-drawn horse in side view facing screen-right
(layer flip=True faces left), with an optional mounted rider drawn by toon.draw_character. Drawn by
toon.draw_character when a design has rig="horse", so it is an ordinary toon layer (keys, talk, motions, flip, --check)
and works in crowds (CR.crowd, cached sprites, march).

    import horse as HO
    from cast import CUSTER, TROOPER
    CUSTER_ON_VIC = HO.mounted(CUSTER, HO.SORREL)
    S.toon(CUSTER_ON_VIC, (900, gy + 150), 0.42, [(0, HO.ride(gait="walk"))], walk=dict(period=1.1))
    CR.crowd(HO.mounted(TROOPER, HO.BAY), HO.ride_charge(), n=2, ..., march=dict(dx=900, dur=3, period=0.42))

Character space (same as the cast): units ~ 1060 = a person's height, y DOWN, origin = midpoint between the hooves on
the ground line. Horse ~1000 units long (nose to tail), withers ~700 high, rider's hat top ~1450.

Design keys (design(**kw); colours BGR): coat, coat_dk (far legs / shading lines), mane (mane + tail), points (lower
legs of bay / dun; None = coat), socks (4 floats 0..1 = white stocking height on near-fore, near-hind, far-fore,
far-hind), blaze (white face stripe), dorsal (dun stripe colour or None), hoof, saddle (leather), blanket,
blanket_trim, roll (blue overcoat rolled behind the cantle), bridle, rider (a cast design or None), name.

Pose fields (toon.DEFAULT_POSE; the rider's fields are the normal ones: facing, lean, head, hL/hR, eyes, mouth ...):
  gait    "stand" | "walk" | "gallop"     stride  cycle phase 0..1 (stage `walk=` and crowd `march=` drive it)
  hneck   horse head/neck raise (deg, + = head up / rear back, - = head down to graze)
Rider poses: ride, ride_point, ride_salute, ride_wave_hat, ride_shade_eyes, ride_charge, ride_look_back (all take
**kw overrides, e.g. ride(gait="gallop", mouth="shout")). Joints: head (rider's head if mounted, else the horse's),
handL/handR (rider), footL/footR (fore / hind hoof on the ground), hip, horse_head, muzzle, saddle.
python production/horse.py -> production/review/horse_sheet.jpg
"""
import math
import numpy as np, cv2
import toon as TN
from toon import LINE, WHITE, INK, ellipse_pts, rot, crom

# ------------------------------------------------------------------------------------------------ colours (BGR)
SADDLE = (34, 48, 70)          # dark russet-black McClellan leather
BLANKET = (104, 52, 34)        # army blue saddle blanket
BLANKET_TRIM = (40, 170, 226)  # cavalry yellow (orange-yellow) border stripe
ROLL = (120, 80, 60)           # rolled sky-blue/grey overcoat behind the cantle
BRIDLE = (30, 40, 58)
HOOF = (54, 56, 62)
METAL = (170, 176, 184)

HS = 1.2                          # horse drawing scale vs the cast (horse coordinates below are x HS in char units)
BOX = (-1050, -2450, 1150, 150)   # drawing box (char units): horse + rider with a raised sword / hat


def design(rider=None, coat=(40, 72, 140), mane=(38, 34, 36), socks=(0, 0, 0, 0), blaze=False, saddle=True,
           blanket=BLANKET, name="horse", **kw):
    """a horse design dict (rig="horse"). saddle=True draws the McClellan saddle + blanket (False = bare back);
    rider = a cast design (see mounted())."""
    d = dict(name=name, rig="horse", coat=tuple(coat), coat_dk=tuple(int(v * 0.74) for v in coat), mane=tuple(mane),
             points=None, socks=tuple(socks), blaze=blaze, dorsal=None, hoof=HOOF, saddle=saddle,
             saddle_col=SADDLE, blanket=tuple(blanket) if blanket else None, blanket_trim=BLANKET_TRIM, roll=True,
             bridle=BRIDLE, rider=rider,
             # keys the generic tools expect on every design (unused by the horse itself)
             jacket=coat, jacket_dk=coat, trousers=coat, boots=HOOF, hair=mane, hair_dk=mane, rope=(32, 132, 240),
             leg_u=135, leg_l=130, torso=270, head_rx=150, head_ry=176, style="none")
    d.update(kw)
    if "coat_dk" not in kw:
        d["coat_dk"] = tuple(int(v * 0.74) for v in d["coat"])
    return d


BAY = design(name="bay", coat=(42, 74, 138), mane=(36, 32, 34), points=(44, 40, 44))
SORREL = design(name="sorrel", coat=(52, 104, 196), mane=(44, 92, 178), socks=(1, 1, 1, 1), blaze=True)  # Vic
BLACK = design(name="black", coat=(66, 58, 56), mane=(40, 34, 34), coat_dk=(50, 44, 42))
GREY = design(name="grey", coat=(198, 200, 200), mane=(150, 152, 156), hoof=(90, 94, 100))
DUN = design(name="dun", coat=(112, 170, 206), mane=(40, 48, 60), points=(50, 58, 70), dorsal=(50, 60, 78))
PRESETS = dict(bay=BAY, sorrel=SORREL, black=BLACK, grey=GREY, dun=DUN)


def mounted(rider_design, horse_preset=BAY, **kw):
    """a horse design carrying rider_design (a cast design dict). The name becomes '<rider> on <horse>'."""
    d = dict(horse_preset)
    d.update(rider=rider_design, name=f"{rider_design.get('name', 'rider')}_on_{horse_preset.get('name', 'horse')}")
    d.update(kw)
    return d


# ------------------------------------------------------------------------------------------------ rider poses
def _P(base, kw):
    d = dict(gait="stand")
    d.update(base)
    d.update(kw)
    return TN.pose(**d)


REINS_L, REINS_R = (175, 150), (150, 165)     # near / far hand targets (torso frame) holding the reins


def ride(**kw):             return _P(dict(facing="r", hL=REINS_L, hR=REINS_R, handL="fist", handR="fist",
                                           mouth="flat"), kw)
def ride_point(**kw):       return _P(dict(facing="r", hL=(300, -40), handL="point", hR=REINS_R, handR="fist",
                                           mouth="talk", brows=(-8, 2)), kw)
def ride_salute(**kw):      return _P(dict(facing="r", hL=(72, -258), handL="open", hR=REINS_R, handR="fist",
                                           mouth="flat", brows=(-6, 0)), kw)
def ride_wave_hat(**kw):    return _P(dict(facing="r", hL=(-60, -300), handL="fist", hR=REINS_R, handR="fist",
                                           mouth="grin", eyes="closed", brows=(10, 10), hat_off=1.0), kw)
def ride_shade_eyes(**kw):  return _P(dict(facing="r", hL=(118, -150), handL="open", hR=REINS_R, handR="fist",
                                           look=(8, -4), mouth="flat", head_dy=-12), kw)
def ride_charge(**kw):      return _P(dict(facing="r", lean=16, hL=(-30, -268), handL="fist", heldL="sword", rotL=70,
                                           hR=REINS_R, handR="fist", eyes="wide", mouth="shout", brows=(-18, 4),
                                           gait="gallop"), kw)
def ride_look_back(**kw):   return _P(dict(facing="f", hL=(60, 200), hR=(-40, 200), handL="fist", handR="fist",
                                           look=(-12, 0), head=-8, mouth="gulp", brows=(18, 6)), kw)


RIDER_POSES = dict(ride=ride, ride_point=ride_point, ride_salute=ride_salute, ride_wave_hat=ride_wave_hat,
                   ride_shade_eyes=ride_shade_eyes, ride_charge=ride_charge, ride_look_back=ride_look_back)


# ------------------------------------------------------------------------------------------------ gaits
# per gait: leg phase offsets (near-fore, near-hind, far-fore, far-hind), duty (stance share), stance sweep, swing
# lift (fore, hind), body bob amp + bobs per cycle, pitch amp (deg), neck nod amp (deg), tail stream 0..1
GAITS = dict(
    stand=dict(off=(0, 0, 0, 0), duty=1.0, sweep=0, lift=(0, 0), bob=0, nb=2, pitch=0, nod=0, stream=0.0, reach=0),
    walk=dict(off=(0.75, 0.5, 0.25, 0.0), duty=0.62, sweep=190, lift=(70, 55), bob=7, nb=2, pitch=0.8, nod=4,
              stream=0.12, reach=0),
    trot=dict(off=(0.0, 0.5, 0.5, 0.0), duty=0.45, sweep=230, lift=(105, 80), bob=14, nb=2, pitch=1.0, nod=3,
              stream=0.35, reach=20),
    gallop=dict(off=(0.62, 0.10, 0.52, 0.0), duty=0.36, sweep=300, lift=(150, 120), bob=26, nb=1, pitch=5.0, nod=9,
                stream=1.0, reach=110),
)
# rest hoof x (near-fore, near-hind, far-fore, far-hind) and leg roots in the body frame
REST_X = (232, -206, 204, -236)
ROOTS = ((214, -478), (-208, -492), (188, -482), (-234, -498))
BODY_C = np.array([0.0, -560.0])


def _smooth(v):
    return v * v * (3 - 2 * v)


def hoof_path(u, g, fore):
    """(dx, lift, curl) of one hoof at its own cycle phase u: stance = on the ground sliding back, swing = an arc
    forward (gallop: kicks back at lift-off, reaches forward before landing). curl 0..1 = pastern flex."""
    G = GAITS[g]
    duty, sw = G["duty"], G["sweep"]
    lift = G["lift"][0 if fore else 1]
    u %= 1.0
    if duty >= 1:
        return 0.0, 0.0, 0.0
    if u < duty:
        s = u / duty
        return sw / 2 - sw * s, 0.0, 0.0
    v = (u - duty) / (1 - duty)
    reach = G["reach"]
    if fore:   # foreleg: tucks high early in the swing, then stretches forward
        x = -sw / 2 + (sw + reach) * _smooth(v) - reach * max(0.0, (v - 0.8) / 0.2) ** 2 * 0
        y = lift * math.sin(math.pi * v) ** 0.8
        curl = math.sin(math.pi * min(1.0, v * 1.25)) ** 1.2
    else:      # hind: pushes back (kick) at lift-off then swings under the belly
        kick = reach * 0.5 * math.sin(math.pi * min(1.0, v / 0.35)) if v < 0.35 else 0.0
        x = -sw / 2 - kick + (sw + reach * 0.3) * _smooth(v)
        y = lift * math.sin(math.pi * v)
        curl = 0.7 * math.sin(math.pi * v)
    if v > 0.85:   # land: settle back to the stance start
        x = x + ((sw / 2) - x) * ((v - 0.85) / 0.15)
    return x, y, curl


def body_motion(g, u, idle=(0.0, 0.0)):
    """(bob units (+ = down), pitch deg (+ = nose down), nod deg) of the body at phase u."""
    G = GAITS[g]
    if g == "stand":
        return 0.0, 0.0, 1.5 * idle[0] + 0.6 * idle[1]
    a = 2 * math.pi * u
    if g == "gallop":
        bob = G["bob"] * math.sin(a - 0.6)
        pitch = G["pitch"] * math.sin(a + 0.9)
        nod = G["nod"] * math.sin(a + 1.6)
    else:
        bob = G["bob"] * math.sin(G["nb"] * a)
        pitch = G["pitch"] * math.sin(a)
        nod = G["nod"] * math.sin(G["nb"] * a + 1.0)
    return bob, pitch, nod


# ------------------------------------------------------------------------------------------------ drawing helpers
def _dk(c, f=0.74):
    return tuple(int(v * f) for v in c)


def _limb_poly(pts, ws):
    """outline polygon of a tapered limb along centreline pts with widths ws."""
    p = np.asarray(pts, float)
    n = len(p)
    nr = []
    for i in range(n):
        d = p[min(i + 1, n - 1)] - p[max(i - 1, 0)]
        d = d / (np.hypot(*d) + 1e-9)
        nr.append(np.array([-d[1], d[0]]))
    nr = np.array(nr)
    w = np.asarray(ws, float)[:, None] / 2
    return np.vstack([p + nr * w, (p - nr * w)[::-1]])


def _seg_point(a, b, f):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * f


def draw_leg(pt, D, root, hx, lift, curl, fore, near):
    """one leg from root (char space, already bobbed) to the hoof whose ground point is x=hx (lifted by `lift`)."""
    coat = D["coat"] if near else D["coat_dk"]
    pts_col = D.get("points") or D["coat"]
    if not near:
        pts_col = _dk(pts_col, 0.8) if D.get("points") else D["coat_dk"]
    idx = (0 if fore else 1) + (0 if near else 2)
    sock = float(D.get("socks", (0, 0, 0, 0))[idx])
    l1, l2 = (215, 205) if fore else (232, 218)
    fet_h = 80.0
    w = min(1.0, lift / 40.0)                       # 0 on the ground, 1 when clearly lifted
    fet = np.array([hx - 20 + 20 * w, -fet_h - lift])
    reach = float(np.hypot(*(fet - root)))
    if reach > (l1 + l2) * 0.995:                  # stance leg at full extension: stretch a little, keep the hoof down
        st = min(reach / ((l1 + l2) * 0.995), 1.12)
        l1, l2 = l1 * st, l2 * st
    joint, fet = TN.ik2(root, fet, l1, l2, -1 if fore else 1)
    cd = fet - joint
    tilt = math.atan2(cd[0], cd[1])                 # cannon angle from vertical (+ = lower end forward)
    ang = w * (-tilt * 0.6) + curl * (1.9 if fore else 1.0)
    # pastern + hoof in a local frame: fetlock at 0, down = +y; hoof upright on the ground when ang = 0
    loc_pas = np.array([[0, 0], [18, 40]], float)
    hoof = np.array([[2, 34], [44, 34], [56, 80], [-6, 80]], float)
    R = lambda q: rot(q, ang) + fet
    pas = R(loc_pas)
    top_w = 92 if fore else 104
    centre = [root + (0, -30), root, _seg_point(root, joint, 0.55), joint, _seg_point(joint, fet, 0.5), fet, pas[1]]
    widths = [top_w + 10, top_w, top_w * 0.72, 56 if fore else 62, 44, 54, 42]
    pt.blob(_limb_poly(centre, widths), coat, n=4)
    # lower leg colour: bay/dun points (up to the knee), then white socks/stockings on top
    if D.get("points"):
        c2 = [_seg_point(joint, fet, -0.05), _seg_point(joint, fet, 0.5), fet, pas[1]]
        pt.blob(_limb_poly(c2, [58 if fore else 64, 44, 54, 42]), pts_col, LINE * 0.7, n=4, shade=False)
    if sock > 0.02:
        f0 = 1.0 - min(sock, 1.0) * 0.95
        c3 = [_seg_point(joint, fet, f0), _seg_point(joint, fet, (1 + f0) / 2), fet, pas[1]]
        wcol = WHITE if near else (205, 205, 210)
        pt.blob(_limb_poly(c3, [47, 45, 54, 42]), wcol, LINE * 0.7, n=4, shade=False)
    hcol = D.get("hoof", HOOF)
    pt.shape(R(hoof), hcol if near else _dk(hcol, 0.8), LINE * 0.9, shade=False)
    return joint, fet, R(hoof)


def tail_pts(stream, swish, flutter):
    """tail centreline (body frame) from the root: hangs (stream 0) or streams back (stream 1)."""
    hang = np.array([(-336, -664), (-392, -628), (-418, -548), (-420, -460), (-408, -372), (-392, -306)], float)
    fly = np.array([(-336, -664), (-420, -680), (-506, -672), (-590, -650), (-668, -622), (-736, -600)], float)
    c = hang * (1 - stream) + fly * stream
    k = np.arange(len(c)) / (len(c) - 1)
    c[:, 0] += swish * 60 * k ** 1.5
    c[:, 1] += flutter * 26 * np.sin(k * 4.0) * k
    return c


def neck_pts():
    """neck outline (body frame, rest angle), withers -> crest -> poll -> throat -> chest."""
    return [(120, -712), (200, -762), (290, -842), (372, -926), (426, -934), (456, -876), (430, -806),
            (390, -720), (352, -630), (320, -560), (220, -600)]


def head_pts():
    """head outline (body frame at rest): poll, forehead, face to the muzzle, chin, jaw, throat latch."""
    return [(388, -952), (452, -950), (520, -900), (584, -836), (636, -790), (650, -752), (618, -722),
            (566, -726), (500, -760), (448, -790), (412, -830), (384, -890)]


BODY = [(318, -612), (310, -520), (250, -458), (120, -436), (-20, -430), (-160, -446), (-262, -486), (-330, -548),
        (-366, -622), (-340, -686), (-260, -716), (-150, -700), (-40, -684), (60, -700), (150, -728)]
NECK_PIVOT = np.array([250.0, -640.0])
SEAT = np.array([-30.0, -738.0])           # rider's hip (body frame)


def draw(pt, D, p, idle=(0.0, 0.0)):
    """draw the horse (and its rider) in pose p into a toon.Painter. Returns joints (char space)."""
    g = p.get("gait", "stand")
    if g not in GAITS:
        g = "stand"
    u = float(p.get("stride", 0.0)) % 1.0
    G = GAITS[g]
    A0 = pt.A.copy()                           # horse parts are drawn HS x bigger (line widths stay the same px)
    pt.A = np.hstack([A0[:, :2] * HS, A0[:, 2:]])
    bob, pitch, nod = body_motion(g, u, idle)
    pr = math.radians(pitch)

    def BT(pts):                               # body frame -> char space (pitch about the barrel, then bob)
        return rot(np.asarray(pts, float), pr, BODY_C) + (0.0, bob)

    na = math.radians(nod - p.get("hneck", 0.0))

    def NT(pts):                               # neck/head frame
        return BT(rot(np.asarray(pts, float), na, NECK_PIVOT))

    joints = {}
    coat, cdk, mane = D["coat"], D["coat_dk"], D["mane"]

    # ---- tail (behind everything)
    t_swish = (0.35 * idle[0] + 0.25 * math.sin(idle[1])) if g == "stand" else 0.15 * math.sin(2 * math.pi * u)
    flut = math.sin(2 * math.pi * u * (2 if g == "gallop" else 1) + 0.5) if g != "stand" else 0.3 * idle[0]
    tc = tail_pts(G["stream"], t_swish, flut)
    k = np.linspace(0, 1, len(tc))
    tw = 52 + 70 * np.sin(np.pi * np.clip(k * 0.9, 0, 1)) ** 0.7
    tw[-1] = 34
    pt.blob(BT(_limb_poly(tc, tw)), mane, n=5)
    for o in (-0.22, 0.18):           # hair strands
        sp = tc[1:-1] + np.array([[0, o * 40 * (1 - G["stream"])] for _ in tc[1:-1]]) + np.array(
            [[o * 40 * G["stream"] * 0 + o * 50 * (1 - G["stream"]), 0] for _ in tc[1:-1]]) * 0
        pt.line(BT(sp + (o * 30, o * 22)), LINE * 0.45, _dk(mane, 0.7), smooth=True)

    # ---- legs: far pair first (darker), then near pair
    hooves = {}
    for idx in (2, 3, 0, 1):
        fore = idx in (0, 2)
        near = idx < 2
        dx, lift, curl = hoof_path(u + G["off"][idx], g, fore)
        root = BT([ROOTS[idx]])[0]
        hx = REST_X[idx] + dx
        _, _, hpoly = draw_leg(pt, D, root, hx, lift, curl, fore, near)
        hooves[idx] = hpoly
    # ---- body barrel
    pt.blob(BT(BODY), coat, n=8)
    pt.line(BT([(-250, -640), (-290, -560), (-268, -500)]), LINE * 0.5, cdk, smooth=True)   # haunch line
    pt.line(BT([(250, -560), (232, -500)]), LINE * 0.5, cdk)                                 # elbow line
    if D.get("dorsal"):
        pt.line(BT([(130, -722), (-40, -688), (-150, -704), (-260, -712)]), LINE * 1.3, D["dorsal"], smooth=True)

    # ---- neck, mane, head
    pt.blob(NT(neck_pts()), coat, n=6)
    _mane(pt, NT, mane, G["stream"], u, g, idle)
    pt.blob(NT(head_pts()), coat, n=6)
    _head_details(pt, NT, D, p)
    joints["horse_head"] = NT([(470, -880)])[0]
    joints["muzzle"] = NT([(600, -752)])[0]
    bit = NT([(586, -748)])[0]

    # ---- tack
    if D.get("saddle", True):
        _saddle(pt, BT, D, rider=D.get("rider") is not None)
    joints["saddle"] = BT([SEAT])[0]
    rein_hand = None
    if D.get("rider") is not None:
        rein_hand = _rider(pt, D, p, pr, bob, g, idle, bit, joints)
    if rein_hand is None and D.get("saddle", True):   # no rider: reins rest on the neck to the pommel
        pt.line([bit, NT([(380, -800)])[0], BT([(120, -760)])[0]], LINE * 0.6, D["bridle"], smooth=True)
    joints.setdefault("head", joints["horse_head"])
    joints.setdefault("hip", BT([SEAT])[0])
    joints.setdefault("handL", BT([(120, -760)])[0])
    joints.setdefault("handR", BT([(120, -760)])[0])
    joints["footL"] = np.array([float(np.mean(hooves[0][:, 0])), 0.0])
    joints["footR"] = np.array([float(np.mean(hooves[1][:, 0])), 0.0])
    pt.A = A0
    return {k: np.asarray(v, float) * HS for k, v in joints.items()}


def _mane(pt, NT, col, stream, u, g, idle):
    """crest mane from the poll to the withers as a row of tufts that flutter back; forelock."""
    crest = np.array([(400, -940), (372, -918), (330, -872), (284, -826), (236, -782), (186, -746), (140, -722)],
                     float)
    n = len(crest)
    outer = []
    for i, c in enumerate(crest):
        ph = 2 * math.pi * (u * (2 if g == "gallop" else 1)) - i * 0.9
        fl = (math.sin(ph) * (8 + 22 * stream) if g != "stand" else 4 * idle[0])
        tip = c + np.array([-30 - 52 * stream + fl * 0.6, -22 + 12 * stream + fl * 0.4])
        outer.append(tip)
    poly = [crest[0] + (14, 4)]
    for i in range(n):
        poly.append(outer[i])
        if i < n - 1:
            poly.append((crest[i] + crest[i + 1]) / 2 + (-14 - 30 * stream, -8 + 6 * stream))
    poly += [crest[-1] + (10, 14)] + [c + (16, 18) for c in crest[::-1][1:-1]]
    pt.blob(NT(poly), col, LINE * 0.9, n=4)
    # forelock between the ears
    pt.blob(NT([(398, -948), (430, -934), (446, -900), (420, -906), (404, -922)]), col, LINE * 0.8, n=4,
            shade=False)


def _head_details(pt, NT, D, p):
    coat, cdk = D["coat"], D["coat_dk"]
    # ears: far ear first (behind), near ear
    pt.blob(NT([(388, -950), (398, -1030), (420, -1000), (418, -946)]), cdk, LINE * 0.9, n=4, shade=False)
    pt.blob(NT([(406, -946), (430, -1040), (450, -1006), (444, -944)]), coat, LINE * 0.9, n=4, shade=False)
    pt.line(NT([(426, -956), (434, -1006)]), LINE * 0.5, cdk)
    if D.get("blaze"):
        pt.blob(NT([(452, -946), (474, -938), (560, -846), (622, -786), (630, -758), (606, -760), (546, -826),
                    (470, -910)]), WHITE, LINE * 0.6, n=4, shade=False)
    # eye, nostril, mouth, jaw line
    pt.dot(*NT([(478, -880)])[0], 15)
    pt.line(NT([(462, -900), (480, -906), (496, -898)]), LINE * 0.6, smooth=True)
    pt.ell(*NT([(618, -778)])[0], 13, 9, _dk(coat, 0.45), LINE * 0.45, ang=0.6, shade=False)
    pt.line(NT([(648, -746), (604, -738)]), LINE * 0.6)
    pt.line(NT([(454, -790), (480, -812), (520, -812)]), LINE * 0.5, cdk, smooth=True)
    # bridle: crown piece, browband, cheek strap, noseband, bit ring
    br = D.get("bridle", BRIDLE)
    pt.line(NT([(420, -944), (430, -880), (446, -820), (470, -786)]), LINE * 0.9, br)
    pt.line(NT([(436, -926), (468, -930)]), LINE * 0.8, br)
    pt.line(NT([(534, -846), (566, -770), (520, -756)]), LINE * 0.8, br)
    pt.line(NT([(446, -820), (586, -748)]), LINE * 0.7, br)
    pt.ell(*NT([(588, -748)])[0], 14, 14, None, LINE * 0.7, shade=False)


def _saddle(pt, BT, D, rider):
    """saddle blanket (blue, yellow border) and McClellan saddle: open seat, high pommel and cantle, skirt,
    stirrup leather and hooded stirrup, rolled overcoat behind the cantle."""
    bl = D.get("blanket")
    if bl is not None:
        pt.blob(BT([(-170, -720), (90, -730), (110, -620), (96, -520), (-150, -516), (-176, -620)]), bl, n=4)
        pt.line(BT([(-150, -700), (-158, -620), (-136, -540), (76, -540), (90, -620), (74, -706)]), LINE * 1.0,
                D.get("blanket_trim", BLANKET_TRIM))
    sc = D.get("saddle_col", SADDLE)
    if D.get("roll", True):
        pt.blob(BT([(-190, -780), (-120, -790), (-108, -748), (-122, -712), (-196, -706), (-210, -744)]), ROLL,
                LINE * 0.9, n=5)
        pt.line(BT([(-160, -790), (-160, -708)]), LINE * 0.6, sc)
    # tree: cantle (back), seat, pommel (front)
    pt.blob(BT([(-118, -800), (-92, -806), (-70, -744), (20, -728), (64, -748), (74, -790), (100, -790),
                (100, -716), (60, -690), (-60, -690), (-112, -716)]), sc, n=5)
    # skirt / side bar
    pt.blob(BT([(-110, -716), (90, -716), (84, -610), (-96, -606)]), _dk(sc, 1.25), LINE * 0.9, n=4)
    pt.line(BT([(-80, -690), (60, -690)]), LINE * 0.5, _dk(sc, 0.6))
    # girth (cinch) under the barrel
    pt.shape(BT([(40, -610), (78, -610), (92, -436), (58, -436)]), _dk(sc, 1.25), LINE * 0.8, shade=False)
    if not rider:   # stirrup hanging free
        pt.line(BT([(-6, -700), (-4, -480)]), LINE * 1.3, sc)
        pt.blob(BT([(-46, -500), (36, -500), (44, -446), (-50, -446)]), sc, LINE * 0.9, n=4, shade=False)



# ------------------------------------------------------------------------------------------------ rider
def _affine(pr, bob, origin, rs=1.0):
    """2x3 matrix: rider-local units (scaled by rs) -> horse units (translate to origin, pitch about the barrel,
    bob)."""
    c, s = math.cos(pr), math.sin(pr)
    Rm = np.array([[c, -s], [s, c]]) * rs
    t = Rm @ (np.asarray(origin, float) - BODY_C) + BODY_C + (0.0, bob)
    return np.hstack([Rm, t[:, None]])


def _rider(pt, D, p, pr, bob, g, idle, bit, joints):
    """draw D['rider'] sitting in the saddle: upper body by toon.draw_character (its legs are erased below the
    seat), then the near leg with the boot in the stirrup, then the reins from the rein hand(s) to the bit.
    Returns the rein hand (char space) or None."""
    R = dict(D["rider"])
    hat_off = p.get("hat_off", 0.0) >= 0.5
    hat_col = R.get("hat")
    if hat_off:
        R["headwear"] = "none"
    rp = dict(p)
    rp.update(feet=(0.0, 0.0), lift=(0.0, 0.0), hip=(0.0, 0.0))
    if g == "gallop":
        rp["lean"] = p["lean"] + 6
    leg_rest = R["leg_u"] + R["leg_l"]
    hip_y = -(72 + leg_rest * 0.96)
    rise = -0.45 * bob if g == "gallop" else -0.3 * bob      # the rider absorbs part of the bounce
    origin = SEAT - np.array([0.0, hip_y / HS]) + (0.0, rise)
    M = _affine(pr, bob, origin, 1.0 / HS)
    A0 = pt.A.copy()
    pt.A = np.hstack([A0[:, :2] @ M[:, :2], (A0[:, :2] @ M[:, 2] + A0[:, 2])[:, None]])
    # --- save the pixels below the seat line, draw the character, restore them (= no legs)
    cut = [(-420, hip_y + 26), (460, hip_y + 26), (460, 120), (-420, 120)]
    q = pt.P(cut)
    H_, W_ = pt.img.shape[:2]
    x0, y0 = max(int(q[:, 0].min() // 4) - 2, 0), max(int(q[:, 1].min() // 4) - 2, 0)
    x1, y1 = min(int(q[:, 0].max() // 4) + 3, W_), min(int(q[:, 1].max() // 4) + 3, H_)
    saved = pt.img[y0:y1, x0:x1].copy() if x1 > x0 and y1 > y0 else None
    rj = TN.draw_character(pt, R, rp, idle)
    if saved is not None:
        m = np.zeros((y1 - y0, x1 - x0), np.uint8)
        cv2.fillPoly(m, [q - np.array([x0 * 4, y0 * 4], np.int32)], 1, cv2.LINE_8, 2)
        reg = pt.img[y0:y1, x0:x1]
        reg[m > 0] = saved[m > 0]
    # --- near leg: thigh forward, knee bent, boot in the stirrup (hung from the saddle)
    hj = np.array([14.0, hip_y + 6])
    ank_t = np.array([hj[0] + 34, hj[1] + 0.8 * leg_rest])
    knee, ank = TN.ik2(hj, ank_t, R["leg_u"], R["leg_l"], -1)
    sc = D.get("saddle_col", SADDLE)
    if D.get("saddle", True):
        pt.line([(hj[0] - 30, hj[1] + 40), (ank[0] - 6, ank[1] + 40)], LINE * 1.3, sc)   # stirrup leather
    if TN.uses_costumes(R, rp):
        import costumes as CO
        C = CO.Ctx(pt, R, rp, 1, "r", R["torso"], np.array([0.0, hip_y]), 0.0, lambda v: np.asarray(v, float),
                   118, {})
        C.legs[-1] = (hj, knee, ank)
        CO.leg(C, -1, hj, knee, ank)
    else:
        pt.stroke([hj, knee, ank], R["trousers"], 96, line=LINE)
        bx, by = ank[0], ank[1] + 28
        pt.blob([(bx - 52, by - 42), (bx + 70, by - 34), (bx + 124, by + 4), (bx + 118, by + 36), (bx - 58, by + 36),
                 (bx - 62, by - 4)], R["boots"], n=6)
    if D.get("saddle", True):   # stirrup tread under the ball of the foot
        bx, by = ank[0], ank[1] + 28
        pt.shape([(bx + 2, by + 34), (bx + 78, by + 34), (bx + 72, by + 52), (bx + 8, by + 52)], METAL, LINE * 0.7,
                 shade=False)
    # --- hat in the hand (wave hat)
    if hat_off and hat_col is not None:
        hc = rj["handL"] + (0, -50)
        brim = R.get("brim", 100) * 1.2
        pt.ell(hc[0], hc[1] + 10, brim, 30, hat_col, LINE * 0.9, ang=-0.25)
        pt.blob([hc + (-70, 6), hc + (-60, -70), hc + (0, -96), hc + (60, -70), hc + (70, 4)], hat_col, n=5)
        pt.line([hc + (-66, -4), hc + (66, -18)], LINE * 1.4, R.get("hat2", INK))
    pt.A = A0
    toC = lambda v: M[:, :2] @ np.asarray(v, float) + M[:, 2]
    for k in ("head", "handL", "handR"):
        if k in rj:
            joints[k] = toC(rj[k])
    joints["hip"] = toC((0.0, hip_y))
    # --- reins: from every hand low and forward enough to hold them
    rein = None
    br = D.get("bridle", BRIDLE)
    for hk, tk in (("handR", "hR"), ("handL", "hL")):
        tgt = p[tk]
        if tgt[1] > 60 and tgt[0] > 40 and p["facing"] == "r":
            h = joints[hk]
            mid = (h + bit) / 2 + (0, 40 + (0 if g == "stand" else 10))
            pt.line([h, mid, bit], LINE * 0.6, br, smooth=True)
            rein = h
    if rein is None and p["facing"] != "r":
        for hk in ("handL", "handR"):
            h = joints[hk]
            pt.line([h, (h + bit) / 2 + (0, 50), bit], LINE * 0.6, br, smooth=True)
            rein = h
    return rein if rein is not None else bit

# ------------------------------------------------------------------------------------------------ review sheet
def _cell(items, sc=0.2, cw=440, ch=420, cols=6, bg=0.86):
    """render (label, design, pose, flip) items into a grid image (uint8)."""
    import cv2
    rows = -(-len(items) // cols)
    frame = np.full((ch * rows, cw * cols, 3), bg, np.float32)
    for i, (lab, D, p, fl) in enumerate(items):
        r, c = divmod(i, cols)
        gx, gy = c * cw + cw / 2, r * ch + ch - 60
        cv2.line(frame, (c * cw + 10, int(gy)), (c * cw + cw - 10, int(gy)), (0.55, 0.6, 0.62), 2)
        TN.render_char(frame, D, p, [[sc, 0, gx], [0, sc, gy]], flip=fl, idle=(0.0, 0.0))
    img = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
    for i, (lab, *_rest) in enumerate(items):
        r, c = divmod(i, cols)
        cv2.putText(img, lab, (c * cw + 10, r * ch + ch - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (30, 30, 30), 2)
    return img


if __name__ == "__main__":
    import pathlib, sys, time, cv2
    ROOT = pathlib.Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(ROOT / "production"))
    import cast
    riders = [D for D in cast.CAST.values() if D.get("rig") is None][:2]   # the project's first two body-rig characters
    CUSTER, TROOPER = (riders + riders)[:2] if riders else (None, None)
    t0 = time.time()
    items = [(f"{k} stand", D, TN.pose(gait="stand"), False) for k, D in PRESETS.items()]
    items.append(("bay flip", BAY, TN.pose(gait="stand"), True))
    for g, D in (("walk", SORREL), ("trot", GREY), ("gallop", BAY)):
        for ph in (0.0, 0.25, 0.5, 0.75) if g != "gallop" else (0.0, 0.17, 0.33, 0.5, 0.67, 0.83):
            items.append((f"{g} {ph:.2f}", D, TN.pose(gait=g, stride=ph), False))
    vic = mounted(CUSTER, SORREL) if CUSTER else None
    trp = mounted(TROOPER, BAY) if TROOPER else None
    for n, fn in (RIDER_POSES.items() if vic else []):
        g = "gallop" if n == "ride_charge" else "walk"
        items.append((f"rider 1 {n}", vic, fn(gait=g, stride=0.3), False))
        items.append((f"rider 2 {n}", trp, fn(gait="gallop" if n in ("ride", "ride_charge") else "stand",
                                              stride=0.6), False))
    if vic:
        items.append(("rider 1 stand flip", vic, ride(), True))
        items.append(("rider 2 gallop flip", trp, ride(gait="gallop", lean=10, mouth="shout"), True))
    img = _cell(items, sc=0.2, cw=440, ch=560, cols=6)
    out = ROOT / "production" / "review" / "horse_sheet.jpg"
    cv2.imwrite(str(out), img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(out, f"{time.time() - t0:.1f}s for {len(items)} cells")
