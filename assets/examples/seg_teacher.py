"""Demo of the teacher bust (bust.py) and the report_card overlay: F in History grading Varus (Teutoburg, 9 AD).
Needs the `classroom` set (assets/examples/sets_kit.py) in the project's sets.py. Times and talk spans are fixed
here so the demo runs without narration; in a real segment use W.cuts / W.rel / S.talk_spans as usual.
--check | --stills [ids] | --render --noaudio
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import stage as S, poses as PO, costumes as CO, bust as B

O = S.overlay
TEACHER = B.TEACHER
VARUS = CO.design(CO.CENTURION, name="varus", beard="stubble")
CHALK = (226, 232, 228)
gy = S.ground_y("classroom")
shots = []


def spans(*pairs):
    return list(pairs)


# t1 0.0-3.2  the teacher introduces the student; name on the board in chalk
shots.append(dict(id="t1", start=0.0, end=3.2, cam=dict(z0=1.0, z1=1.06, focus=(700, 560), ease="out"),
    layers=S.plates("classroom") + [
        S.toon(TEACHER, (330, gy + 120), 0.55, [
            (0, PO.rest_side(mouth="talk")),
            (1.6, PO.smug(facing="r"), dict(amp=1.2, deg=2))],
            talk=spans((0.1, 0.5), (0.6, 1.0), (1.1, 1.5), (2.2, 2.6), (2.7, 3.0))),
        O("title", 0.3, text="Publius Quinctilius Varus", sub="Teutoburg Forest, 9 AD", style="paper",
          pos=(1010, 300), size=60, world=True),
        O("emote", 1.7, symbol="sparkle", at=(470, 300), world=True, dur=0.8),
    ]))

# t2 3.2-7.4  the student sweats while the report card fills in
shots.append(dict(id="t2", start=3.2, end=7.4, cam=dict(z0=1.04, z1=1.0, x0=-30, x1=20),
    tin=dict(kind="whip", dir=1, dur=0.32),
    layers=S.plates("classroom") + [
        S.toon(VARUS, (1500, gy + 170), 0.58, [
            (0, PO.worried(facing="r")),
            (2.6, PO.gulp(facing="r"), dict(amp=1.4, deg=2))], flip=True),
        O("report_card", 0.1, at=(800, 540), name="P. QUINCTILIUS VARUS", sub="Teutoburg Forest, 9 AD",
          rows=[("Reconnaissance", "F"), ("Trusting allies", "F-"), ("Legions returned", "0/3")],
          final="F", remark="See me after class.", first=0.5, stagger=0.55, size=50, width=700),
    ]))

# t3 7.4-9.6  the teacher loses it: crack, rock, stamp
shots.append(dict(id="t3", start=7.4, end=9.6, cam=dict(z0=1.25, z1=1.32, focus=(330, 520)),
    tin=dict(kind="whip", dir=-1, dur=0.32),
    layers=S.plates("classroom") + [
        S.toon(TEACHER, (330, gy + 120), 0.55, [
            (0, PO.unimpressed(facing="r", mouth="talk")),
            (0.9, PO.outraged(facing="r", lean=-5), dict(amp=1.8, deg=3, dur=0.16)),
            (1.6, PO.outraged(facing="r", mouth="grit"))],
            talk=spans((0.05, 0.4), (0.45, 0.8)), motions=[dict(type="jolt", t=0.9, dx=16, dy=-6)]),
        O("stamp", 1.0, text="F", at=(560, 300), size=150, world=True),
        O("emote", 1.05, symbol="anger", at=(450, 420), world=True),
    ]))

if __name__ == "__main__":
    S.main(shots)
