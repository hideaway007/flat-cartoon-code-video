"""Segment 1 (example: The Rope shots 1-3). Run from anywhere:
  python production/segments/seg01.py --check          static checks
  python production/segments/seg01.py --stills [ids]   key frames + review/stills_seg01.jpg
  python production/segments/seg01.py --render         out/segments/seg01.mp4 (with its slice of the narration)
Times come from the narration words (production/words.json): W.cuts for touching shot times, W.rel for pose changes.
"""
import math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import stage as S, poses as PO
from cast import JOE, SIMON

W = S.words()
rel = W.rel
CUTS = W.cuts(["This", "Technically", "tied"], start=0.0, end=W.at("Because"))
shots = []

# 1 "This is a rope."  smug grin with the coil -> thrusts it at the camera on "a rope"
st, en = CUTS[0]
shots.append(dict(id="s01", start=st, end=en, cam=dict(z0=1.0, z1=1.08, focus=(960, 420), ease="out"),
    layers=S.plates("b01") + [
        S.toon(JOE, (960, 1270), 1.1, [
            (0, PO.coil_proud()),
            (rel(st, "a"), PO.coil_thrust(), dict(amp=1.6, deg=3, dur=0.16))], shadow=False)]))

# 2 "Technically, it's two ropes, each one 150 feet long,"  Joe explains, Simon unimpressed
st, en = CUTS[1]
gy = S.ground_y("b02", 1.1)
shots.append(dict(id="s02", start=st, end=en, cam=dict(z0=1.02, z1=1.07, x0=40, x1=-30),
    tin=dict(kind="whip", dir=1, dur=0.32),
    layers=S.plates("b02", 1.1) + [
        S.toon(JOE, (640, gy + 300), 0.6, [
            (0, PO.explain(prop="coil_shoulder", hR=(10, 240))),
            (rel(st, "two"), PO.two(prop="coil_shoulder", hR=(10, 240), mouth="talk"), dict(amp=1.2)),
            (rel(st, "150"), PO.spread(prop="coil_shoulder", mouth="talk"), dict(amp=1.4, deg=3))],
            talk=S.talk_spans(W, st, en, st)),
        S.toon(SIMON, (1290, gy + 312), 0.57, [
            (0, PO.crossed(prop="coil_shoulder")),
            (rel(st, "feet"), PO.shrug(prop="coil_shoulder"), dict(amp=0.7, deg=1.5))], flip=True, phase=1.3)]))

# 3 "tied together in the middle with a knot,"  tying -> tug of war on "knot"
st, en = CUTS[2]
gy = S.ground_y("b03")
k_t = rel(st, "knot")
shots.append(dict(id="s03", start=st, end=en, cam=dict(z0=1.0, z1=1.10, focus=(960, 560)),
    tin=dict(kind="whip", dir=-1, dur=0.32), shake=[dict(t=k_t, amp=7, decay=0.18)],
    layers=S.plates("b03") + [
        S.toon(JOE, (690, gy + 190), 0.55, [(0, PO.tie(brows=(-8, 0))), (k_t, PO.tug(), dict(amp=1.8, deg=2))]),
        S.toon(SIMON, (1235, gy + 196), 0.52, [
            (0, PO.tie(eyes="half")),
            (k_t, PO.tug(eyes="half", mouth="flat", look=(-6, 0), brows=(0, 0)), dict(amp=1.2, deg=1.5))],
            flip=True, phase=1.3),
        S.rope(3, 4, sag=(70, 8), switch=k_t)]))   # layer indices: b03 has 3 plate layers (0-2), then Joe 3, Simon 4

if __name__ == "__main__":
    S.main(shots)
