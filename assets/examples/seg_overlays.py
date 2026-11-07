"""Demo of the explainer overlay kit (overlays.py): every overlay type + the sepia / night shot filters, on the
template's sets and cast. --check | --stills [ids] | --render
"""
import math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import stage as S, poses as PO
from cast import JOE, SIMON

W = S.words()
rel = W.rel
O = S.overlay
CUTS = W.cuts(["This", "two", "tied", "Because", "on one"], start=0.0, end=W.at("one", after=14.0))
shots = []

# d1 "This is a rope. Technically, it's"  title card, red circle on the coil, sparkles
st, en = CUTS[0]
shots.append(dict(id="d1", start=st, end=en, cam=dict(z0=1.0, z1=1.06, focus=(960, 420), ease="out"),
    layers=S.plates("b01") + [
        S.toon(JOE, (960, 1270), 1.1, [
            (0, PO.coil_proud()),
            (rel(st, "a"), PO.coil_thrust(), dict(amp=1.6, deg=3, dur=0.16))], shadow=False),
        O("title", 0.1, text="THE ROPE", sub="a story in 150 feet", style="paper", pos=(430, 330), size=92),
        O("circle", rel(st, "rope") + 0.1, at=(960, 830), r=(250, 200), world=True),
        O("emote", rel(st, "rope") + 0.35, symbol="sparkle", at=(1215, 640), size=1.1),
    ]))

# d2 "two ropes, each one 150 feet long,"  x2 pop, label on Simon, counter, question mark, underline
st, en = CUTS[1]
gy = S.ground_y("b02", 1.1)
t150 = rel(st, "150")
shots.append(dict(id="d2", start=st, end=en, cam=dict(z0=1.02, z1=1.07, x0=40, x1=-30),
    tin=dict(kind="whip", dir=1, dur=0.32),
    layers=S.plates("b02", 1.1) + [
        S.toon(JOE, (640, gy + 300), 0.6, [
            (0, PO.two(prop="coil_shoulder", hR=(10, 240), mouth="talk")),
            (t150, PO.spread(prop="coil_shoulder", mouth="talk"), dict(amp=1.4, deg=3))],
            talk=S.talk_spans(W, st, en, st)),
        S.toon(SIMON, (1290, gy + 312), 0.57, [
            (0, PO.crossed(prop="coil_shoulder")),
            (rel(st, "feet"), PO.shrug(prop="coil_shoulder"), dict(amp=0.7, deg=1.5))], flip=True, phase=1.3),
        O("caption_pop", 0.3, text="x2", at=(830, 330), size=96, dur=0.9),
        O("label", 0.35, text="SIMON", at=(1300, 600), box=(1560, 330), world=True, dur=1.6),
        O("counter", t150, b=150, suffix=" ft", label="each rope", at=(640, 190), size=104),
        O("underline", t150 + 1.2, span=(520, 780, 330), color=(40, 140, 245)),
        O("emote", 1.95, symbol="question", at=(1395, 360), world=True),
    ]))

# d3 "tied together in the middle with a knot."  label on the knot, meter drains, impact + speed lines
st, en = CUTS[2]
gy = S.ground_y("b03")
k_t = rel(st, "knot")
shots.append(dict(id="d3", start=st, end=en, cam=dict(z0=1.0, z1=1.10, focus=(960, 560)),
    tin=dict(kind="whip", dir=-1, dur=0.32), shake=[dict(t=k_t, amp=7, decay=0.18)],
    layers=S.plates("b03") + [
        S.toon(JOE, (690, gy + 190), 0.55, [(0, PO.tie(brows=(-8, 0))), (k_t, PO.tug(), dict(amp=1.8, deg=2))]),
        S.toon(SIMON, (1235, gy + 196), 0.52, [
            (0, PO.tie(eyes="half")),
            (k_t, PO.tug(eyes="half", mouth="flat", look=(-6, 0), brows=(0, 0)), dict(amp=1.2, deg=1.5))],
            flip=True, phase=1.3),
        S.rope(3, 4, sag=(70, 8), switch=k_t),
        O("meter", 0.05, label="GRIP", at=(70, 110), keys=[(0.3, 1.0), (k_t, 0.8), (en - st, 0.12)]),
        O("arrow", 0.25, pts=[(470, 300), (880, 640)], bend=-0.2, out=k_t),
        O("label", 0.3, text="THE KNOT", at=(975, 700), box=(1250, 380), world=True, out=k_t),
        O("emote", k_t, symbol="impact", at=(990, 650), size=0.8, world=True, dur=0.55),
        O("emote", k_t + 0.05, symbol="speed", at=(590, 640), dir=0, world=True),
        O("emote", k_t + 0.15, symbol="anger", at=(840, 330), world=True),
    ]))

# d4 "Because that is all the rope two young climbers had with them"  sepia flashback: route, lower third, bars
st, en = CUTS[3]
gy = S.ground_y("b04")
drift = dict(type="drift", dur=en - st, dy=-185, scale=0.5, ease="linear")
shots.append(dict(id="d4", start=st, end=en, cam=dict(z0=1.0, z1=1.05), tin=dict(kind="fade", dur=0.4),
    filter="sepia",
    layers=S.plates("b04") + [
        S.toon(JOE, (860, gy + 330), 0.42, [(0, PO.back(prop="coil_shoulder"))], walk=dict(period=0.56, ph=0),
               motions=[dict(drift, dx=5)], idle_off=True),
        S.toon(SIMON, (1065, gy + 336), 0.40, [(0, PO.back(prop="coil_shoulder"))],
               walk=dict(period=0.56, ph=math.pi), motions=[dict(drift, dx=45)], idle_off=True),
        O("route", 0.4, pts=[(560, 1010), (700, 780), (880, 640), (930, 450), (975, 250)], world=True, draw=1.8),
        O("title", 0.2, text="PERU, 1985", pos="lower", size=74),
        O("bars", 1.2, items=[("1 rope", 150), ("2 ropes", 300)], at=(1440, 760), size=(330, 300),
          title="FEET OF ROPE"),
    ]))

# d5 "on one of the most remote mountains in Peru. In June 1985,"  night: spotlight, sweat, exclaim, stamp
st, en = CUTS[4]
OFF = (0, -260)
gy = S.ground_y("b05", 1.08, OFF)
tp = rel(st, "Peru")
joe_head = (860, gy + 170 - 400)
simon_head = (1090, gy + 178 - 405)
shots.append(dict(id="d5", start=st, end=en, cam=dict(z0=1.0, z1=1.03, y0=-330, y1=0, ease="inout"),
    tin=dict(kind="whip", dir=1, dur=0.32), filter="night",
    layers=S.plates("b05", 1.08, OFF) + [
        S.toon(JOE, (860, gy + 170), 0.5, [
            (0, PO.shade_eyes_back(prop="coil_shoulder")),
            (tp - 0.15, PO.gulp(prop="coil_shoulder"), dict(amp=1.3, dur=0.2))]),
        S.toon(SIMON, (1090, gy + 178), 0.47, [(0, PO.look_up_back(prop="coil_shoulder"))], phase=1.3),
        O("spotlight", 0.9, keys=[(0.9, simon_head, 230), (tp, joe_head, 190)], world=True, out=en - st - 0.3),
        O("emote", tp, symbol="sweat", at=(joe_head[0] - 150, joe_head[1] - 50), flip=True, world=True),
        O("emote", tp + 0.25, symbol="exclaim", at=(simon_head[0] + 40, simon_head[1] - 150), world=True),
        O("stamp", tp + 0.9, text="NO WAY BACK", at=(1520, 880), size=96, rot=-10),
    ]))

if __name__ == "__main__":
    S.main(shots)
