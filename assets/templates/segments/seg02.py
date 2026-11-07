"""Segment 2 (example: The Rope shots 4-5). Starts where seg01 ends; seg01's last shot is passed as `context` so the
first shot here can have a transition in. Same CLI as seg01.py."""
import math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import stage as S, poses as PO
from cast import JOE, SIMON
from seg01 import shots as PREV

W = S.words()
rel = W.rel
CUTS = W.cuts(["Because", "on one"], start=PREV[-1]["end"], end=12.63)
shots = []

# 4 "because that is all the rope two young climbers had with them"  walking away toward the mountain
st, en = CUTS[0]
gy = S.ground_y("b04")
drift = dict(type="drift", dur=en - st, dy=-185, scale=0.5, ease="linear")
shots.append(dict(id="s04", start=st, end=en, cam=dict(z0=1.0, z1=1.05), tin=dict(kind="fade", dur=0.4),
    layers=S.plates("b04") + [
        S.toon(JOE, (860, gy + 330), 0.42, [(0, PO.back(prop="coil_shoulder"))], walk=dict(period=0.56, ph=0),
               motions=[dict(drift, dx=5)], idle_off=True),
        S.toon(SIMON, (1065, gy + 336), 0.40, [(0, PO.back(prop="coil_shoulder"))],
               walk=dict(period=0.56, ph=math.pi), motions=[dict(drift, dx=45)], idle_off=True)]))

# 5 "on one of the most remote mountains in Peru."  tilt down the wall, Joe turns and gulps
st, en = CUTS[1]
OFF = (0, -260)
gy = S.ground_y("b05", 1.08, OFF)
shots.append(dict(id="s05", start=st, end=en, cam=dict(z0=1.0, z1=1.03, y0=-330, y1=0, ease="inout"),
    tin=dict(kind="whip", dir=1, dur=0.32),
    layers=S.plates("b05", 1.08, OFF) + [
        S.toon(JOE, (860, gy + 170), 0.5, [
            (0, PO.shade_eyes_back(prop="coil_shoulder")),
            (rel(st, "Peru") - 0.15, PO.gulp(prop="coil_shoulder"), dict(amp=1.3, dur=0.2))]),
        S.toon(SIMON, (1090, gy + 178), 0.47, [(0, PO.look_up_back(prop="coil_shoulder"))], phase=1.3)]))

if __name__ == "__main__":
    S.main(shots, context=PREV[-1])
