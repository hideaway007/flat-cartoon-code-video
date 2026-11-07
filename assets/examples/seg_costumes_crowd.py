"""Segment 3 (demo of costumes, held props and crowds on The Rope narration 12.6-23.0 s)."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import stage as S, poses as PO, costumes as CO, crowds as CR
from seg02 import shots as PREV

W = S.words()
rel = W.rel
CUTS = W.cuts(["In", "hanging", "The other"], start=PREV[-1]["end"], end=23.0)
shots = []

# 6 "In June 1985, one of those climbers"  centurion addresses the legion, they cheer
st, en = CUTS[0]
gy = S.ground_y("b04")
legion = CR.crowd(CO.LEGIONARY, PO.spear_shield(), n=9, rows=3, x=(150, 1770), y=gy + 120, scale=0.27,
                  vary=dict(scale=0.05, colors=dict(tunic=[(52, 48, 196), (44, 44, 176), (60, 56, 205)]),
                            beard=["none", "none", "stubble"]),
                  keys=[(rel(st, "climbers"), PO.cheer_sword(heldL="gladius", heldR="scutum", hR=(80, 150)))],
                  haze_step=0.18, groups=2, name="legion")
shots.append(dict(id="s06", start=st, end=en, cam=dict(z0=1.0, z1=1.07, focus=(960, 560)),
    tin=dict(kind="whip", dir=1, dur=0.32),
    layers=S.plates("b04") + legion + [
        S.toon(CO.CENTURION, (900, gy + 330), 0.52, [
            (0, PO.point(heldR="scutum", hR=(130, 120), mouth="talk")),
            (rel(st, "1985"), PO.raise_sword(heldL="gladius", heldR="scutum", hR=(140, 110)), dict(amp=1.5, deg=3)),
            (rel(st, "climbers"), PO.cheer_sword(heldL="gladius", heldR="scutum", hR=(80, 150)), dict(amp=1.2))],
            talk=S.talk_spans(W, st, en, st))]))

# 7 "was hanging from one end of this rope in the dark over a crevasse with a shattered leg."
#   knight vs viking duel, knights march past behind
st, en = CUTS[1]
gy = S.ground_y("b02", 1.1)
column = CR.crowd(CO.KNIGHT, PO.march_spear(heldR="shield_kite", hR=(110, 150)), n=7, rows=2, x=(-260, 1500),
                  y=gy + 40, scale=0.2, row_dy=-26, haze=0.22, haze_step=0.12, groups=2, jitter=0.5,
                  vary=dict(headwear=["nasal", "nasal", "kettle"], beard=["short", "none", "stubble"],
                            colors=dict(cape=[(40, 36, 150), (120, 60, 30), (40, 36, 150)])),
                  march=dict(dx=330, dur=en - st, period=0.56, bob=3), name="column")
hit = rel(st, "rope")
shots.append(dict(id="s07", start=st, end=en, cam=dict(z0=1.02, z1=1.08, x0=-30, x1=30),
    tin=dict(kind="whip", dir=-1, dur=0.32), shake=[dict(t=hit + 0.12, amp=8, decay=0.2)],
    layers=S.plates("b02", 1.1) + column + [
        S.toon(CO.KNIGHT, (700, gy + 300), 0.55, [
            (0, PO.guard(heldR="shield_kite")),
            (hit - 0.25, PO.raise_sword(heldR="shield_kite", hR=(160, 60)), dict(amp=1.0, dur=0.2)),
            (hit, PO.strike_sword(heldR="shield_kite", hR=(150, 120)), dict(amp=1.8, deg=3, dur=0.12)),
            (rel(st, "crevasse"), PO.guard(heldR="shield_kite", mouth="grin", eyes="closed"), dict(amp=1.0))]),
        S.toon(CO.VIKING, (1260, gy + 310), 0.55, [
            (0, PO.hammer_up(heldL="axe")),
            (hit - 0.05, PO.guard(heldL="axe", rotL=-20, heldR="shield_round", hR=(160, 20), eyes="wide",
                                  mouth="grit"), dict(amp=1.4, dur=0.12)),
            (rel(st, "shattered"), PO.shock(heldL="axe", rotL=-60, heldR="shield_round"), dict(amp=1.5, deg=3))],
            flip=True, phase=1.3)]))

# 8 "The other one was sitting in the snow at the other end, holding him."  the inventor hammers, official reads
st, en = CUTS[2]
gy = S.ground_y("b01")
up_, down_ = PO.hammer_up, PO.hammer_down
k_hits = [rel(st, "sitting"), rel(st, "snow"), rel(st, "holding")]
keys = [(0, up_())]
for i, th in enumerate(k_hits):
    keys += [(th - 0.02, down_(), dict(amp=1.7, deg=3, dur=0.11)), (th + 0.25, up_(), dict(amp=0.6, dur=0.22))]
shots.append(dict(id="s08", start=st, end=en, cam=dict(z0=1.0, z1=1.06, focus=(900, 600)),
    tin=dict(kind="fade", dur=0.35), shake=[dict(t=th + 0.1, amp=5, decay=0.15) for th in k_hits],
    layers=S.plates("b01") + [
        S.toon(CO.INVENTOR_B, (700, gy + 250), 0.6, keys),
        S.toon(CO.OFFICIAL, (1300, gy + 230), 0.56, [
            (0, PO.read_scroll(mouth="talk")),
            (rel(st, "other end"), PO.gongshou(), dict(amp=1.2))],
            talk=S.talk_spans(W, st, en, st), phase=2.0)]))

if __name__ == "__main__":
    S.main(shots, context=PREV[-1])
