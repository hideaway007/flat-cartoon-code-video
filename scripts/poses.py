"""Named poses (flat-cartoon-code-video library). Each returns a full pose dict; keyword arguments override fields:
    PO.two(prop="coil_shoulder")            PO.tug(eyes="half", mouth="flat")
Arm targets are written for a character facing screen-right (facing "r"); a character facing left uses the same
pose with the layer's flip=True. Fields: see toon.DEFAULT_POSE.
python poses.py [cast_key]  -> production/review/poses.jpg (every pose drawn, for choosing and checking)
Add project poses in production/cast.py or a segment file the same way: def name(**kw): return P(..., **kw).
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import toon as T


def P(base, kw):
    d = dict(base)
    d.update(kw)
    return T.pose(**d)


# --- standing / idle
def rest(**kw):        return P(dict(), kw)
def rest_side(**kw):   return P(dict(facing="r"), kw)
def back(**kw):        return P(dict(facing="b"), kw)

# --- talking / explaining (facing right)
def explain(**kw):     return P(dict(facing="r", hL=(170, 110), handL="open", mouth="talk", brows=(4, 4)), kw)
def two(**kw):         return P(dict(facing="r", hL=(230, -110), handL="two", mouth="grin", brows=(14, 12)), kw)
def point(**kw):       return P(dict(facing="r", hL=(290, -10), handL="point", mouth="talk", brows=(-8, 2)), kw)
def spread(**kw):      return P(dict(facing="r", hL=(-220, -40), hR=(230, -30), handL="open", handR="open",
                                     eyes="wide", mouth="shout", brows=(16, 16)), kw)
def wave(**kw):        return P(dict(facing="r", hL=(-110, -210), handL="open", mouth="grin", eyes="closed"), kw)
def think(**kw):       return P(dict(facing="r", hL=(150, -40), handL="fist", look=(6, -6), mouth="flat",
                                     brows=(10, 6)), kw)

# --- reactions
def crossed(**kw):     return P(dict(facing="r", hL=(160, 110), hR=(-30, 120), handL="fist", handR="fist",
                                     eyes="half", mouth="flat"), kw)
def shrug(**kw):       return P(dict(facing="r", hL=(-60, 20), hR=(120, 30), handL="open", handR="open",
                                     eyes="half", mouth="flat", look=(-8, 0), lean=-3), kw)
def cheer(**kw):       return P(dict(hL=(-60, -260), hR=(60, -260), handL="fist", handR="fist", eyes="closed",
                                     mouth="grin", brows=(10, 12)), kw)
def shock(**kw):       return P(dict(hL=(-140, -60), hR=(140, -60), handL="open", handR="open", eyes="wide",
                                     mouth="shout", brows=(22, 20), lean=-6), kw)
def gulp(**kw):        return P(dict(eyes="wide", mouth="gulp", sweat=1.0, brows=(20, 10), hL=(-30, 240)), kw)
def worried(**kw):     return P(dict(eyes="dot", mouth="gulp", brows=(24, 6), hL=(60, 150), hR=(-60, 150)), kw)

# --- rope / climbing
def coil_proud(**kw):  return P(dict(prop="coil_chest", hL=(22, 200), hR=(-22, 200), mouth="grin", eyes="closed",
                                     brows=(6, 6)), kw)
def coil_thrust(**kw): return P(dict(prop="coil_chest", hL=(-20, 150), hR=(20, 150), lean=5, mouth="shout",
                                     eyes="wide", brows=(16, 18), coil=(0, 40, 1.35)), kw)
def tie(**kw):         return P(dict(facing="r", lean=14, hL=(230, 210), hR=(180, 235), look=(6, 8), mouth="flat"), kw)
def tug(**kw):         return P(dict(facing="r", lean=-16, hip=(-24, 14), feet=(-120, 80), hL=(240, 150), hR=(175, 165),
                                     handL="fist", handR="fist", eyes="squint", mouth="grit", brows=(-20, 0)), kw)
def look_up_back(**kw): return P(dict(facing="b", head_dy=-34), kw)
def shade_eyes_back(**kw): return P(dict(facing="b", head_dy=-34, hL=(70, -150)), kw)

# --- history / held props (heldL/heldR = costumes.HELD, rotL/rotR = extra prop angle). In 3/4 view (facing r) hL is
#     the near arm (in front of the body) and hR the far arm (behind; a shield there is drawn in front of the body).
def hold_sword(**kw):  return P(dict(facing="r", hL=(70, 230), heldL="sword", rotL=-62, mouth="flat"), kw)
def raise_sword(**kw): return P(dict(facing="r", hL=(-40, -272), handL="fist", heldL="sword", rotL=82, eyes="wide",
                                     mouth="shout", brows=(-14, 6), hR=(120, 120)), kw)
def strike_sword(**kw): return P(dict(facing="r", lean=12, feet=(-110, 100), hL=(250, 40), heldL="sword", rotL=88,
                                      eyes="squint", mouth="grit", brows=(-20, 0), hR=(-60, 160)), kw)
def guard(**kw):       return P(dict(facing="r", feet=(-90, 80), hL=(150, 150), heldL="sword", rotL=-40, hR=(170, 70),
                                     heldR="shield_heater", mouth="flat", brows=(-12, 0)), kw)
def shield_up(**kw):   return P(dict(facing="r", lean=-4, feet=(-100, 80), hR=(150, -70), heldR="shield_heater",
                                     hL=(20, -250), heldL="sword", rotL=60, eyes="wide", mouth="grit",
                                     brows=(-16, 4)), kw)
def stand_spear(**kw): return P(dict(hR=(-30, 210), heldR="spear", rotR=-90, fixR=1, hL=(30, 200), mouth="flat"), kw)
def spear_shield(**kw): return P(dict(hR=(-30, 210), heldR="spear", rotR=-90, fixR=1, hL=(70, 150), heldL="scutum",
                                      mouth="flat"), kw)
def thrust_spear(**kw): return P(dict(facing="r", lean=14, feet=(-130, 110), hL=(210, 150), heldL="spear", rotL=-14, fixL=1,
                                      hR=(118, 121), eyes="squint", mouth="shout", brows=(-20, 0)), kw)
def march(**kw):       return P(dict(facing="r", feet=(-80, 70), lift=(0, 26), hL=(60, 225), hR=(-40, 225),
                                     head=2, mouth="flat"), kw)
def march_spear(**kw): return P(dict(facing="r", feet=(-80, 70), lift=(0, 26), hL=(80, 40), heldL="spear", rotL=-112, fixL=1,
                                     hR=(-30, 225), mouth="flat"), kw)
def draw_bow(**kw):    return P(dict(facing="r", feet=(-90, 80), hR=(285, -40), heldR="bow", hL=(105, -150),
                                     heldL="arrow", eyes="squint", mouth="flat", brows=(-14, 0), lean=-3), kw)
def aim_crossbow(**kw): return P(dict(facing="r", feet=(-80, 80), hL=(150, -120), heldL="crossbow", rotL=0, fixL=1,
                                      hR=(110, -92), eyes="squint", mouth="flat", brows=(-12, 0)), kw)
def hammer_up(**kw):   return P(dict(facing="r", lean=-8, feet=(-90, 90), hL=(-40, -250), heldL="hammer", rotL=36,
                                     hR=(150, 120), eyes="squint", mouth="grit", brows=(-16, 0)), kw)
def hammer_down(**kw): return P(dict(facing="r", lean=16, feet=(-90, 90), hL=(240, 150), heldL="hammer", rotL=120,
                                     hR=(160, 170), eyes="squint", mouth="open", mopen=0.4, brows=(-16, 0)), kw)
def read_scroll(**kw): return P(dict(hL=(-10, 105), hR=(10, 105), heldL="scroll_open", heldR="scroll_open",
                                     look=(0, 6), mouth="talk", brows=(6, 6)), kw)
def read_book(**kw):   return P(dict(facing="r", hL=(165, 40), heldL="book", look=(8, 10), mouth="flat",
                                     brows=(6, 4)), kw)
def write_quill(**kw): return P(dict(facing="r", lean=8, hL=(190, 120), heldL="quill", rotL=-125, fixL=1, look=(8, 10),
                                     mouth="flat", brows=(8, 4)), kw)
def hold_torch(**kw):  return P(dict(facing="r", hL=(230, 110), heldL="torch", rotL=-62, fixL=1, mouth="flat"), kw)
def torch_up(**kw):    return P(dict(facing="r", hL=(-30, -270), heldL="torch", rotL=-96, fixL=1, eyes="wide", mouth="shout",
                                     brows=(12, 10)), kw)
def hold_flag(**kw):   return P(dict(facing="r", hL=(175, 60), heldL="flag", rotL=-68, fixL=1, hR=(120, 200),
                                     mouth="grin", eyes="closed"), kw)
def hold_banner(**kw): return P(dict(hR=(-30, 200), heldR="banner", rotR=-90, fixR=1, hL=(30, 220), mouth="flat"), kw)
def hold_lantern(**kw): return P(dict(facing="r", hL=(150, 60), heldL="lantern", look=(4, 0), mouth="flat"), kw)
def use_wrench(**kw):  return P(dict(facing="r", lean=10, hL=(220, 100), heldL="wrench", rotL=60, hR=(230, 140),
                                     look=(8, 8), mouth="flat", brows=(-6, 0)), kw)
def hold_staff(**kw):  return P(dict(facing="r", hL=(200, 130), heldL="staff", rotL=-72, fixL=1, mouth="smile"), kw)
def bow_greeting(**kw): return P(dict(facing="r", lean=32, head=6, hL=(40, 240), hR=(10, 240), eyes="closed",
                                      mouth="flat"), kw)
def gongshou(**kw):    return P(dict(lean=4, hL=(112, 80), hR=(-112, 80), handL="fist", handR="open", eyes="closed",
                                     mouth="smile"), kw)
def salute(**kw):      return P(dict(hL=(72, -258), handL="open", mouth="flat", brows=(-6, 0)), kw)
def kneel(**kw):       return P(dict(facing="r", hip=(-40, 132), feet=(-222, 147), hL=(150, 160), hR=(40, 200),
                                     head=8, eyes="closed", mouth="flat"), kw)
def present(**kw):     return P(dict(facing="r", hL=(260, 10), handL="open", mouth="talk", brows=(6, 6)), kw)
def pharaoh(**kw):     return P(dict(hL=(150, 80), heldL="crook", rotL=-58, fixL=1, hR=(-60, 220), mouth="flat",
                                     eyes="half"), kw)
def cheer_sword(**kw): return P(dict(hL=(-40, -270), heldL="sword", rotL=90, hR=(60, -250), handR="fist",
                                     eyes="closed", mouth="shout", brows=(12, 14)), kw)

# --- teacher expressions (face only: work on any character; the bust rig uses just these fields)
def unimpressed(**kw): return P(dict(eyes="half", mouth="flat", brows=(-6, -4), look=(0, 2)), kw)
def smug(**kw):        return P(dict(eyes="half", mouth="smile", brows=(10, 10), head=-4), kw)
def outraged(**kw):    return P(dict(eyes="wide", mouth="shout", mopen=1.0, brows=(-20, 4), crack=1.0, head=3), kw)

ALL = [rest, rest_side, back, explain, two, point, spread, wave, think, crossed, shrug, cheer, shock, gulp,
       worried, coil_proud, coil_thrust, tie, tug, look_up_back, shade_eyes_back,
       hold_sword, raise_sword, strike_sword, guard, shield_up, stand_spear, spear_shield, thrust_spear, march,
       march_spear, draw_bow, aim_crossbow, hammer_up, hammer_down, read_scroll, read_book, write_quill, hold_torch,
       torch_up, hold_flag, hold_banner, hold_lantern, use_wrench, hold_staff, bow_greeting, gongshou, salute, kneel,
       present, pharaoh, cheer_sword, unimpressed, smug, outraged]
LEGACY = ALL[:21]       # the climbers' poses (before the history set)

# preset name (costumes.PRESETS) -> poses shown on the preset sheet (python costumes.py)
SHOWCASE = dict(
    knight=[lambda: guard(heldR="shield_kite"), raise_sword, lambda: kneel(heldL="sword", rotL=90, fixL=1, hL=(200, -20))],
    knight_plate=[guard, strike_sword, cheer_sword],
    longbowman=[lambda: draw_bow(heldR="longbow"), lambda: rest_side(heldL="longbow", rotL=-90, fixL=1, hL=(80, 150)), march],
    legionary=[spear_shield, lambda: guard(heldL="gladius", heldR="scutum", rotL=-30),
               lambda: march_spear(heldR="scutum", hR=(60, 160))],
    centurion=[lambda: point(heldR="scutum", hR=(130, 120)), lambda: raise_sword(heldL="gladius"), salute],
    samurai=[lambda: raise_sword(heldL="katana", hR=(30, -250), rotL=70), bow_greeting,
             lambda: hold_sword(heldL="katana")],
    ronin=[lambda: strike_sword(heldL="katana"), gongshou, rest_side],
    official=[read_scroll, gongshou, lambda: explain()],
    official_ming=[read_book, write_quill, bow_greeting],
    chinese_soldier=[lambda: thrust_spear(), aim_crossbow, lambda: stand_spear(heldL="shield_round", hL=(60, 150))],
    egyptian=[pharaoh, present, lambda: rest_side(heldL="staff", rotL=-90, fixL=1, hL=(90, 150))],
    egypt_worker=[hammer_up, hammer_down, lambda: march()],
    viking=[lambda: hammer_up(heldL="axe"), lambda: guard(heldL="axe", rotL=-20, heldR="shield_round"), cheer_sword],
    inventor=[use_wrench, hold_lantern, explain],
    inventor_b=[read_book, lambda: hammer_down(heldL="mallet"), think],
    peasant=[hold_torch, torch_up, lambda: hold_staff()],
    king=[lambda: hold_staff(heldL="sword", rotL=90, hL=(170, 40)), present, hold_banner],
    queen=[rest, lambda: present(), read_scroll],
    monk=[read_book, hold_lantern, kneel],
    monk_hood=[write_quill, lambda: hold_staff(), bow_greeting],
    soldier_1800=[salute, hold_flag, march],
)


if __name__ == "__main__":
    import numpy as np, cv2
    ROOT = pathlib.Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(ROOT / "production"))
    import cast
    key = sys.argv[1] if len(sys.argv) > 1 else next(iter(cast.CAST))
    D = cast.CAST[key]
    cols, cw, ch = 8, 300, 560
    rows = (len(ALL) + cols - 1) // cols
    frame = np.full((rows * ch, cols * cw, 3), 0.84, np.float32)
    for i, f in enumerate(ALL):
        r, c = divmod(i, cols)
        T.render_char(frame, D, f(), [[0.42, 0, c * cw + cw / 2], [0, 0.42, r * ch + ch - 70]])
    img = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
    for i, f in enumerate(ALL):
        r, c = divmod(i, cols)
        cv2.putText(img, f.__name__, (c * cw + 10, r * ch + ch - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 30, 30), 2)
    out = ROOT / "production" / "review" / f"poses_{key}.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(out)
