"""Python reference renders for the JS port. Writes test/cases.json + test/ref/<id>.png (straight alpha).
Each case names a design and a pose BY NAME, so the JS side builds them from its own cast.js / poses.js / horse.js /
bust.js (that tests those translations too). Run: $PY toonjs/test/make_refs.py"""
import json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
PROD = HERE.parents[2] / "production"
sys.path.insert(0, str(PROD))
import numpy as np, cv2
import toon as T, poses as PO, cast as CA, horse as HO, bust as B

S = 0.5
cases = []


def case(cid, design, pose, kw=None, flip=False, idle=(0.0, 0.0)):
    cases.append(dict(id=cid, design=design, pose=pose, kw=kw or {}, flip=flip, idle=list(idle), scale=S))


designs = [n for n in dir(CA) if n.isupper() and isinstance(getattr(CA, n), dict) and "leg_u" in getattr(CA, n)]
for n in designs:                                       # every cast member, 3/4 view
    case(f"cast_{n}", dict(kind="cast", name=n), dict(mod="poses", fn="rest_side"))
for n in ("CUSTER", "LAKOTA_ELDER", "CHEYENNE_WOMAN", "ARCHAEOLOGIST_B"):   # front view
    case(f"front_{n}", dict(kind="cast", name=n), dict(mod="poses", fn="rest"))
case("back_TROOPER", dict(kind="cast", name="TROOPER"), dict(mod="poses", fn="back"))
for f in ("side_eye", "eye_roll", "disbelief", "panic", "cry", "dazed", "starstruck", "furious", "cringe", "sulk",
          "dread", "smug", "unimpressed", "gulp", "shock"):
    case(f"ex_{f}", dict(kind="cast", name="CUSTER"), dict(mod="poses", fn=f))
for cid, n, f in (("prop_sweep", "ARCHAEOLOGIST", "sweep_detector"), ("prop_sweep_b", "ARCHAEOLOGIST_B", "sweep_detector_b"),
                  ("prop_det_front", "ARCHAEOLOGIST", "detector_front"), ("prop_beep", "ARCHAEOLOGIST_D", "detector_beep"),
                  ("prop_kneel", "ARCHAEOLOGIST_C", "kneel_find"), ("prop_exam", "CUSTER", "hold_exam"),
                  ("prop_toast", "PATRON", "toast"), ("prop_drawer", "CLERK", "push_drawer"),
                  ("prop_tell", "LAKOTA_ELDER", "tell"), ("prop_shade", "RANGER", "shade_eyes_back"),
                  ("prop_hold_up", "ARCHIVIST", "hold_up_item"), ("prop_hang", "BARTENDER", "hang_picture"),
                  ("prop_point", "TROOPER_C", "point"), ("prop_sword", "TROOPER", "raise_sword")):
    case(cid, dict(kind="cast", name=n), dict(mod="poses", fn=f))
case("flip_explain", dict(kind="cast", name="PATRON_B"), dict(mod="poses", fn="explain"), flip=True)
case("idle_talk", dict(kind="cast", name="BUGLER"), dict(mod="poses", fn="explain"), idle=(0.8, 1.5))
for cid, rider, horse, f, kw in (("horse_stand", "CUSTER", "SORREL", "ride", {}),
                                 ("horse_walk", "TROOPER", "BAY", "ride", dict(gait="walk", stride=0.3)),
                                 ("horse_trot", "TROOPER_B", "BLACK", "ride", dict(gait="trot", stride=0.55)),
                                 ("horse_gallop", "BUGLER", "DUN", "ride_charge", dict(gait="gallop", stride=0.7)),
                                 ("horse_look_back", "TROOPER_C", "GREY", "ride_look_back", {}),
                                 ("horse_shade", "CUSTER", "SORREL", "ride_shade_eyes", {}),
                                 ("horse_wave_hat", "CUSTER", "SORREL", "ride_wave_hat", dict(hat_off=1.0))):
    case(cid, dict(kind="horse", rider=rider, horse=horse), dict(mod="horse", fn=f), kw)
for cid, f, kw in (("bust_rest", "rest", {}), ("bust_smug", "smug", {}), ("bust_talk", "unimpressed", dict(mouth="talk", mopen=0.7)),
                   ("bust_crack", "furious", dict(crack=1.0))):
    case(cid, dict(kind="bust", name="TEACHER"), dict(mod="poses", fn=f), kw)


def build(c):
    d = c["design"]
    if d["kind"] == "cast":
        D = getattr(CA, d["name"])
    elif d["kind"] == "horse":
        D = HO.mounted(getattr(CA, d["rider"]), getattr(HO, d["horse"]))
    else:
        D = getattr(B, d["name"])
    mod = PO if c["pose"]["mod"] == "poses" else HO
    p = getattr(mod, c["pose"]["fn"])(**c["kw"])
    return D, p


out = HERE / "ref"
out.mkdir(exist_ok=True)
for c in cases:
    D, p = build(c)
    c["D"] = json.loads(json.dumps(D, default=list))       # the design itself: the JS side needs no cast.js
    x0, y0, x1, y1 = T.char_box(D, p)
    W, H = int((x1 - x0) * S) + 2, int((y1 - y0) * S) + 2
    c["size"] = [W, H]
    c["M"] = [[S, 0, -x0 * S if not c["flip"] else x1 * S], [0, S, -y0 * S]]
    lay = np.zeros((H, W, 4), np.float32)
    T.render_char(lay, D, p, np.array(c["M"], float), flip=c["flip"], idle=tuple(c["idle"]))
    a = np.clip(lay[..., 3:4], 0, 1)
    rgb = np.where(a > 1e-4, lay[..., :3] / np.maximum(a, 1e-4), 0)
    cv2.imwrite(str(out / f"{c['id']}.png"), (np.dstack([np.clip(rgb, 0, 1), a]) * 255).round().astype(np.uint8))
(HERE / "cases.json").write_text(json.dumps(cases, indent=1))
print(len(cases), "cases ->", out)
