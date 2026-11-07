"""Background sets of this project, drawn in code. Run: python production/sets.py [names...]
-> assets/bg/<name>_<layer>.png, assets/bg/sets.json, production/review/sets.jpg (green line = ground).
Each set: Plate(w, h) (PW x PH = frame + 10 %; taller for tilt reveals), layers back to front with parallax depth
(sky 0.35-0.5 opaque, far 0.55-0.75, ground 1.0 = moves with the characters), then save(name, plate, ground_frac).
Keep it simple like the reference: big flat shapes, few details, a clear level ground line for standing shots.
Example content: The Rope V12 (b01 camp close, b02 camp wide, b03 snow ridge, b04 valley, b05 ice wall).
"""
import math, pathlib, sys
import numpy as np, cv2
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import toon as T
from scenery import *


def b01():
    w, h = PW, PH
    gy = h * 0.58
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.4, True)
    sky_grad(sky, (232, 170, 92), (246, 222, 170))
    for x, y, s, sd in ((280, 150, 300, 1), (1250, 110, 360, 2), (1820, 230, 240, 3)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.7)
    mountains(far, -40, w + 40, gy - 40, [(300, 260, 0.9), (900, 330, 0.8), (1500, 270, 0.85), (2000, 240, 0.9)],
              C["mtn"], 11)
    hill = [(-20, gy + 20), (-20, gy - 90), (300, gy - 120), (700, gy - 80), (1100, gy - 120), (1500, gy - 70),
            (1900, gy - 110), (w + 20, gy - 80), (w + 20, gy + 20)]
    far.shape(T.crom(hill, False, 10).tolist() + [(w + 20, gy + 40), (-20, gy + 40)], C["hill"], OL)
    gnd = pl.layer("ground", 1.0)
    ground_layer(gnd, w, h, gy, C["ground"], 4)
    for cx, cy, rx, ry, sd in ((500, gy + 120, 220, 26, 1), (1200, gy + 260, 300, 30, 2), (300, gy + 360, 180, 22, 3),
                               (1700, gy + 380, 260, 28, 4), (900, gy + 60, 160, 16, 5)):
        patch(gnd, cx, cy, rx, ry, C["ground_dk"], sd)
    texture(gnd, 0, w, gy + 30, h, C["ground_dk"], 70, 21)
    tent(gnd, 1450, 2120, gy + 190)
    for sx, sw in ((150, 120), (260, 110), (210, 90)):
        gnd.shape(T.crom([(sx - sw / 2, gy + 150), (sx - sw / 2.4, gy + 108), (sx + sw / 2.4, gy + 104),
                          (sx + sw / 2, gy + 150)], False, 6).tolist(), C["stone"], OL2)
    gnd.shape(T.crom([(130, gy + 110), (120, gy + 20), (290, gy + 20), (280, gy + 110), (205, gy + 122)], True, 6),
              C["pot"], OL)
    gnd.shape(T.ellipse_pts(205, gy + 20, 86, 18), (90, 90, 100), OL2)
    gnd.shape([(185, gy - 10), (225, gy - 10), (225, gy + 4), (185, gy + 4)], (90, 90, 100), OL2)
    return save("b01", pl, 0.58)


def b02():
    w, h = PW, PH
    gy = h * 0.62
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.4, True)
    sky_grad(sky, (232, 170, 92), (246, 222, 170))
    for x, y, s, sd in ((420, 140, 340, 5), (1700, 120, 300, 6)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.65)
    mountains(far, -40, w + 40, gy - 50, [(1050, 560, 0.75)], C["mtn"], 21, cap=0.42)
    mountains(far, -40, w + 40, gy - 30, [(150, 230, 0.6), (1950, 250, 0.6)], C["hill"], 22, cap=0.0)
    far.shape(T.crom([(-20, gy - 60), (700, gy - 72), (1500, gy - 66), (w + 20, gy - 58)], False, 8).tolist()
              + [(w + 20, gy + 10), (-20, gy + 10)], C["lake"], OL)
    gnd = pl.layer("ground", 1.0)
    ground_layer(gnd, w, h, gy, C["ground"], 7, wave=4)
    for cx, cy, rx, ry, sd in ((700, gy + 90, 260, 20, 1), (1500, gy + 200, 340, 28, 2), (400, gy + 300, 220, 24, 3)):
        patch(gnd, cx, cy, rx, ry, C["ground_dk"], sd)
    texture(gnd, 0, w, gy + 30, h, C["ground_dk"], 60, 22)
    tent(gnd, 230, 560, gy + 60)
    return save("b02", pl, 0.62)


def b03():
    w, h = PW, PH
    gy = h * 0.64
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.4, True)
    sky_grad(sky, (236, 176, 96), (248, 228, 180))
    for x, y, s, sd in ((300, 160, 320, 8), (1150, 90, 260, 9), (1800, 200, 340, 10)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.7)
    mountains(far, -40, w + 40, gy + 4, [(200, 110, 0.7), (700, 150, 0.6), (1300, 120, 0.7), (1900, 140, 0.6)],
              C["mtn"], 31, cap=0.5)
    gnd = pl.layer("ground", 1.0)
    ground_layer(gnd, w, h, gy, C["snow"], 12, wave=3)
    for cx, cy, rx, ry, sd in ((400, gy + 150, 380, 22, 1), (1500, gy + 110, 420, 20, 2), (1000, gy + 300, 520, 30, 3)):
        patch(gnd, cx, cy, rx, ry, C["snow_sh"], sd)
    texture(gnd, 0, w, gy + 40, h, C["snow_sh"], 26, 23, length=120, curve=True)
    return save("b03", pl, 0.64)


def b04():
    w, h = PW, PH
    gy = h * 0.60
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (176, 160, 214), (168, 210, 250))
    for x, y, s, sd in ((360, 120, 300, 11), (1750, 160, 280, 12)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.55)
    mountains(far, -40, w + 40, gy, [(1060, 470, 0.8)], C["warm_mtn"], 41, snow=C["warm_snow"], cap=0.45)
    mid = pl.layer("walls", 0.8)
    mid.shape(T.crom([(-20, gy - 330), (300, gy - 260), (620, gy - 90), (780, gy + 10)], False, 8).tolist()
              + [(780, gy + 40), (-20, gy + 40)], C["mtn2"], OL)
    mid.shape(T.crom([(w + 20, gy - 360), (w - 320, gy - 270), (w - 640, gy - 100), (w - 800, gy + 10)], False, 8)
              .tolist() + [(w - 800, gy + 40), (w + 20, gy + 40)], C["mtn2"], OL)
    gnd = pl.layer("ground", 1.0)
    ground_layer(gnd, w, h, gy, C["warm_floor"], 13, wave=2)
    patch(gnd, 400, gy + 200, 380, 30, C["warm_floor_dk"], 4)
    patch(gnd, 1700, gy + 260, 360, 34, C["warm_floor_dk"], 5)
    for i in range(14):  # footprints receding toward the mountain
        u = i / 13
        y = h - 40 - (h - 40 - gy - 30) * (1 - (1 - u) ** 1.6)
        x = w / 2 + (1 - u) * 30 * (1 if i % 2 else -1) + u * 20
        s = 1 - 0.85 * u
        gnd.shape(T.ellipse_pts(x, y, 22 * s, 10 * s, 0, 16), C["warm_floor_dk"], 0)
    return save("b04", pl, 0.60)


def b05():
    w, h = PW, int(PH * 1.5)                 # tall plate for the tilt-down reveal
    gy = h * 0.80
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.5, True)
    sky_grad(sky, (232, 170, 92), (246, 222, 170), 0.5)
    cloud(sky, 1850, 140, 280, 14)
    wall = pl.layer("wall", 0.9)
    poly = [(-40, gy + 20), (-40, 300), (180, 120), (420, -40), (1700, -40), (1900, 160), (w + 40, 380), (w + 40, gy + 20)]
    wall.shape(wob(T.crom(poly, True, 6), 4, 3), C["wall"], OL)
    # big triangular rock facets (light from the left: left-leaning faces lighter)
    rng = np.random.default_rng(5)
    pts = [(x + rng.uniform(-160, 160), y + rng.uniform(-120, 120))
           for y in np.linspace(60, gy - 20, 3) for x in np.linspace(-40, w + 40, 5)]
    sub = cv2.Subdiv2D((-200, -200, w + 400, int(gy) + 400))
    for p in pts:
        sub.insert((float(p[0]), float(p[1])))
    tones = [C["wall"], C["wall_dk"], tuple(int(c * 1.08) for c in C["wall"])]
    for tri in sub.getTriangleList():
        t3 = tri.reshape(3, 2)
        if (t3 < -150).any() or (t3[:, 0] > w + 150).any() or (t3[:, 1] > gy + 150).any():
            continue
        nrm = np.cross(np.append(t3[1] - t3[0], 0), np.append(t3[2] - t3[0], 0))[2]
        tone = tones[int(abs(nrm) / 1000) % 3]
        wall.shape(t3, tone, OL2 * 0.7, shade=False)
    # slanting snow ledges with icicles under them
    for x0, y0, x1, y1, th in ((-40, 330, 900, 230, 40), (600, 640, 1700, 520, 46), (1300, 300, 2160, 220, 34),
                               (-40, 900, 1000, 830, 44), (1200, 960, 2160, 880, 40)):
        n = 9
        top = [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n - rng.uniform(0, 14)) for i in range(n + 1)]
        bot = [(x, y + 6 + th * math.sin(math.pi * (n - i) / n) ** 0.7 + rng.uniform(-4, 8))
               for i, (x, y) in reversed(list(enumerate(top)))]
        bot = list(reversed(bot))[::-1]
        wall.shape(T.crom(top, False, 5).tolist() + T.crom(bot, False, 5).tolist(), C["ice"], OL2)
        for i in range(2, n - 1, 2):
            bx, by = bot[i]
            L = rng.uniform(26, 70)
            wall.shape([(bx - 12, by - 4), (bx + 12, by - 4), (bx + rng.uniform(-4, 4), by + L)], C["ice"], OL2 * 0.7,
                       shade=False)
    gnd = pl.layer("ground", 1.0)
    ground_layer(gnd, w, h, gy, C["snow"], 15, wave=3)
    patch(gnd, 700, gy + 120, 400, 24, C["snow_sh"], 6)
    patch(gnd, 1600, gy + 200, 380, 26, C["snow_sh"], 7)
    return save("b05", pl, 0.80)


# ================================================================================================ scenery-kit sets
try:
    from scenery_kits import *
except ImportError:   # library not copied into the project yet: use the skill's copy
    sys.path.append(str(pathlib.Path.home() / ".claude" / "skills" / "flat-cartoon-code-video" / "scripts"))
    from scenery_kits import *

SKY = ((240, 200, 130), (248, 232, 196))        # clear day (BGR top, bottom)


def castle_yard():
    w, h = PW, PH
    gy = h * 0.70
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.4, True)
    sky_grad(sky, *SKY)
    for x, y, s, sd in ((300, 120, 280, 1), (1600, 90, 320, 2)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("castle", 0.85)
    tower(far, 1300, gy - 300, 260, 560, tone(K["castle"], 0.93), "crenel", seed=3, flag_color=K["red"])   # keep
    stone_wall(far, -40, w + 40, gy + 10, gy - 330, seed=4)
    archway(far, w / 2, gy + 10, 260, 300, K["castle"], view=(120, 170, 120))
    for x in (160, w - 160):
        tower(far, x, gy + 10, 240, 600, K["castle"], "cone", seed=5)
    for x, dev in ((620, "tower"), (1490, "tower")):
        banner(far, x, gy - 300, 120, 230, K["red"], dev)
    torch(far, 820, gy - 160, 0.9)
    torch(far, 1290, gy - 160, 0.9)
    gnd = pl.layer("ground", 1.0)
    floor(gnd, -20, w + 20, gy, h + 20, "flagstone", K["stone_warm"], 6, rows=5)
    barrel(gnd, 300, gy + 120, 90, 120)
    barrel(gnd, 400, gy + 100, 80, 110)
    crate(gnd, 1780, gy + 130, 110)
    crate(gnd, 1850, gy + 20, 80)
    return save("castle_yard", pl, 0.70)


def great_hall():
    pl, wp, fp, gy = room(gy_frac=0.70, wall_kind="stone", floor_kind="flagstone", wall_color=(150, 156, 164),
                          floor_color=(130, 140, 150), seed=7)
    w = pl.w
    ceiling_beams(wp, -20, w + 20, 96, 110, n=8)
    for x in (560, w - 560):
        window_gothic(wp, x, 190, 190, 400, seed=int(x))
    for x, dev, col in ((250, "lion", K["red"]), (w / 2, "fleur", K["blue"]), (w - 250, "lion", K["red"])):
        banner(wp, x, 160, 170, 400, col, dev)
    for x in (830, w - 830):
        torch(wp, x, 440)
    pr = pl.layer("props", 1.0)
    top = dais(pr, w / 2, gy + 30, 560, 90, 3)
    throne(pr, w / 2, top, 400, K["gold"], K["red"])
    carpet(pr, w / 2, gy + 30, pl.h + 20, 150, K["red"])
    table(pr, 330, gy + 70, 520, 170, cloth=(196, 214, 226))
    bench(pr, 330, gy + 150, 460, 70)
    return save("great_hall", pl, 0.70)


def battlefield():
    w, h = PW, PH
    gy = h * 0.66
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (226, 196, 150), (236, 228, 214))
    for x, y, s, sd in ((420, 140, 320, 3), (1500, 110, 380, 4)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.55)
    hills(far, -20, w + 20, gy - 120, 140, K["hill_far"], 1, 4)
    treeline(far, -20, w + 20, gy - 100, 90, tone(K["hill_far"], 0.88), 2)
    mid = pl.layer("mid", 0.75)
    hills(mid, -20, w + 20, gy - 30, 90, K["hill_mid"], 3, 3)
    tree_row(mid, -40, w + 40, gy - 50, 160, "round", color=tone(K["leaf"], 0.92), seed=4)
    flag(mid, 260, gy - 40, 220, K["red"], "cross", K["gold"], seed=1)
    flag(mid, 1850, gy - 40, 220, K["blue"], "lion", K["gold"], seed=2)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy, K["grass"], 5, wave=4)
    for cx, cy, rx, ry, sd in ((500, gy + 140, 300, 24, 1), (1500, gy + 260, 380, 30, 2), (900, gy + 380, 260, 26, 3)):
        patch(gnd, cx, cy, rx, ry, K["grass_dk"], sd)
    grass_tufts(gnd, 0, w, gy + 30, h, 40, K["grass_dk"], 6)
    tree(gnd, 90, gy + 60, 560, "round", seed=9)
    rock(gnd, 1950, gy + 150, 220, seed=3)
    return save("battlefield", pl, 0.66)


def jp_interior():
    pl, wp, fp, gy = room(gy_frac=0.68, wall_kind="shoji", floor_kind="tatami", seed=11)
    w = pl.w
    box(wp, w / 2 - 330, 150, w / 2 + 330, gy + 4, K["plaster"], OL2)          # tokonoma alcove
    box(wp, w / 2 - 330, 130, w / 2 + 330, 168, K["wood_dk"], OL2, shade=False)
    box(wp, w / 2 - 352, 130, w / 2 - 320, gy + 4, K["wood"], OL2, shade=False)
    box(wp, w / 2 + 320, 130, w / 2 + 352, gy + 4, K["wood"], OL2, shade=False)
    scroll(wp, w / 2 - 80, 230, 170, 430, "mountains")
    box(wp, w / 2 - 330, gy - 40, w / 2 + 330, gy + 4, K["wood_dk"], OL2, shade=False)
    window_round(wp, w / 2 + 170, 360, 110, K["wood_dk"], (150, 210, 170))
    pr = pl.layer("props", 1.0)
    table(pr, w / 2, gy + 160, 420, 80, K["wood_dk"])
    return save("jp_interior", pl, 0.68)


def cn_palace():
    w, h = PW, PH
    gy = h * 0.74
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (236, 196, 130), (246, 232, 206))
    cloud(sky, 260, 120, 300, 5)
    cloud(sky, 1880, 160, 260, 6)
    far = pl.layer("far", 0.55)
    hills(far, -20, w + 20, gy - 300, 160, K["hill_far"], 7, 4)
    mid = pl.layer("hall", 0.8)
    for x0, x1 in ((-40, 280), (w - 280, w + 40)):   # red courtyard walls with yellow tile caps
        box(mid, x0, gy - 240, x1, gy + 10, K["cn_wall"], OL)
        box(mid, x0 - 10, gy - 270, x1 + 10, gy - 236, K["cn_roof"], OL2, shade=False)
    cn_hall(mid, w / 2, gy + 10, 1480, 760)
    for x in (230, w - 230):
        tree(mid, x, gy + 10, 420, "pine", seed=int(x))
    gnd = pl.layer("ground", 1.0)
    floor(gnd, -20, w + 20, gy, h + 20, "tiles", (170, 176, 184), 8, rows=4, cols=8)
    return save("cn_palace", pl, 0.74)


def cn_throne():
    pl, wp, fp, gy = room(gy_frac=0.72, wall_kind="palace", floor_kind="tiles", floor_color=(118, 124, 132),
                          wall_kw=dict(bay=470), seed=13)
    w = pl.w
    pr = pl.layer("props", 1.0)
    top = dais(pr, w / 2, gy + 50, 960, 110, 3, K["marble"], carpet_color=K["red"])
    folding_screen(pr, w / 2, top + 4, 820, 470)
    throne(pr, w / 2, top + 6, 330, K["gold"], K["red"], style="china")
    carpet(pr, w / 2, gy + 50, pl.h + 20, 210, K["red"])
    for x in (330, w - 330):   # bronze incense burners
        pr.shape(T.crom([(x - 60, gy + 30), (x - 80, gy - 40), (x + 80, gy - 40), (x + 60, gy + 30)], True, 4),
                 (90, 120, 130), OL2)
        box(pr, x - 70, gy - 60, x + 70, gy - 36, (80, 106, 116), OL2, shade=False)
    return save("cn_throne", pl, 0.72)


def great_wall_set():
    w, h = PW, PH
    gy = h * 0.72
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (238, 200, 140), (240, 232, 214))
    cloud(sky, 1600, 110, 320, 7)
    far = pl.layer("far", 0.5)
    SC.mountains(far, -40, w + 40, gy - 160, [(300, 260, 0.8), (1000, 330, 0.7), (1800, 280, 0.8)], (182, 178, 170), 31,
                 cap=0.0)
    mid = pl.layer("wall", 0.75)
    top = hills(mid, -20, w + 20, gy - 70, 300, K["hill_mid"], 12, 3)
    path = top[::6] + (0, 6)
    great_wall(mid, path, 62, seed=3, towers=(0.2, 0.62, 0.92))
    treeline(mid, -20, w + 20, gy + 20, 60, tone(K["hill_mid"], 0.85), 5)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy, K["grass"], 9, wave=3)
    grass_tufts(gnd, 0, w, gy + 30, h, 30, K["grass_dk"], 9)
    rock(gnd, 1700, gy + 120, 180, seed=5)
    bush(gnd, 300, gy + 90, 200, seed=6)
    return save("great_wall", pl, 0.72)


def rain_road():
    w, h = PW, PH
    gy = h * 0.66
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (168, 160, 150), (196, 194, 188))
    for x, y, s, sd in ((300, 110, 380, 1), (1150, 80, 420, 2), (1900, 140, 360, 3)):
        cloud(sky, x, y, s, sd)
    far = pl.layer("far", 0.55)
    hills(far, -20, w + 20, gy - 110, 180, (170, 176, 160), 4, 4)
    treeline(far, -20, w + 20, gy - 80, 70, (140, 150, 132), 5)
    mid = pl.layer("fields", 0.8)
    hills(mid, -20, w + 20, gy, 30, (120, 162, 128), 6, 2)
    house(mid, 1500, gy - 10, 230, 230, "plaster", "thatch", seed=2, chimney=False)
    tree(mid, 1820, gy - 6, 300, "round", (96, 150, 110), seed=3)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy, (112, 160, 128), 7, wave=3)
    field(gnd, -300, 760, gy + 20, h + 40, K["rice"], n=12, crop="rice", seed=1)
    field(gnd, 1340, 2400, gy + 20, h + 40, (110, 168, 196), n=12, crop="wheat", seed=2)
    road(gnd, 1040, gy - 4, 90, 1000, h + 60, 1300, K["mud"], seed=3, curve=-60, puddles=4)
    grass_tufts(gnd, 0, w, gy + 20, h, 26, (90, 130, 100), 4)
    rain_layer(pl, n=650, alpha=0.45, seed=5)
    return save("rain_road", pl, 0.66)


def workshop_in():
    pl, wp, fp, gy = room(gy_frac=0.70, wall_kind="planks", floor_kind="planks", wall_color=(84, 118, 156),
                          floor_color=(96, 132, 170), seed=17)
    w = pl.w
    ceiling_beams(wp, -20, w + 20, 80, 90, n=7)
    tool_rack(wp, 180, 230, 560, 300)
    window_lattice(wp, 1230, 220, 300, 260, K["wood_dk"], (196, 230, 246), 3, 3)
    gear(wp, 960, 330, 90, 12, (150, 160, 170))
    gear(wp, 1075, 410, 54, 9, K["gold_dk"])
    pr = pl.layer("props", 1.0)
    shelf(pr, 1640, gy + 40, 360, 620, items="jars", seed=4)
    workbench(pr, 640, gy + 70, 760, 250, seed=2)
    barrel(pr, 1400, gy + 90, 100, 130)
    return save("workshop_in", pl, 0.70)


def street_1800s():
    w, h = PW, PH
    gy = h * 0.74
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (196, 200, 200), (190, 222, 236))
    far = pl.layer("far", 0.55)
    factory(far, 860, gy, 980, 470, seed=3, chimneys=((0.2, 1.3), (0.55, 1.45), (0.85, 1.2)))
    mid = pl.layer("houses", 0.85)
    xs = [(-40, 300, K["townhouse"], None), (300, 290, (96, 120, 150), (60, 60, 170)), (620, 300, (150, 160, 170), None),
          (1440, 300, (100, 128, 168), (60, 130, 60)), (1760, 400, K["townhouse"], None)]
    for i, (x0, ww, col, shop) in enumerate(xs):
        townhouse(mid, x0, gy, ww, 520 + 40 * (i % 2), col, 3, seed=i, shop=shop)
    box(mid, -20, gy - 10, w + 20, gy + 14, K["stone_lt"], OL2, shade=False)   # kerb
    for x in (560, 1430):
        lamp_post(mid, x, gy + 4, 330)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy + 10, K["cobble"], 3, wave=1)
    cobbles(gnd, 0, w, gy + 40, h, seed=4, n=80)
    return save("street_1800s", pl, 0.75)


def egypt():
    w, h = PW, PH
    gy = h * 0.70
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (226, 196, 140), (196, 226, 246))
    sun(sky, 1750, 200, 80)
    far = pl.layer("far", 0.55)
    hills(far, -20, w + 20, gy - 90, 90, (150, 200, 230), 3, 5, shape="dune")
    mid = pl.layer("pyramids", 0.7)
    pyramid(mid, 1300, gy - 40, 760, 470, seed=1)
    pyramid(mid, 760, gy - 40, 520, 320, seed=2)
    pyramid(mid, 1780, gy - 40, 300, 180, seed=3)
    gnd = pl.layer("ground", 1.0)
    hills(gnd, -20, w + 20, gy + 10, 30, K["sand"], 4, 3, bottom=h + 20, shape="dune")
    SC.ground_layer(gnd, w, h, gy, K["sand"], 6, wave=4)
    texture(gnd, 0, w, gy + 30, h, K["sand_dk"], 40, 6)
    tree(gnd, 160, gy + 40, 520, "palm", seed=3)
    tree(gnd, 330, gy + 10, 380, "palm", seed=8)
    rock(gnd, 1900, gy + 130, 200, color=(120, 160, 190), seed=2)
    return save("egypt", pl, 0.70)


def map_europe():
    return map_plate("map_europe", -12, 61, 24, 39, highlight={"GBR": REGION_COLORS[0], "FRA": REGION_COLORS[1]})


WARRING_STATES = [   # rough borders c. 260 BC (lon, lat) - illustrative, not survey-grade
    ([(102, 31), (102.5, 34.5), (104, 36.5), (106, 37.5), (109, 38.5), (110.5, 36.5), (110.5, 34.5), (111, 33),
      (110, 31.5), (108, 30), (105, 28.5), (103, 29)], REGION_COLORS[7]),      # Qin
    ([(110.5, 36.5), (110, 39.5), (112, 40.8), (114.5, 40.5), (116, 38.5), (115.5, 36.5), (114, 36), (112.5, 35.8)],
     REGION_COLORS[3]),                                                                     # Zhao
    ([(114.5, 40.5), (116, 42), (119, 42.5), (122, 42), (124, 41), (121.5, 39.5), (118, 39), (116, 38.5)],
     REGION_COLORS[5]),                                                                     # Yan
    ([(116, 38.5), (118, 38), (119.5, 37.5), (122.7, 37.3), (121, 36), (119, 35), (117, 35), (115.5, 36.5)],
     REGION_COLORS[1]),                                                                     # Qi
    ([(110.5, 34.5), (112.5, 35.8), (114, 36), (115.5, 36.5), (117, 35), (116, 34), (114, 34), (112, 34)],
     REGION_COLORS[2]),                                                                     # Wei
    ([(110.5, 34.5), (112, 34), (114, 34), (113.8, 33), (112, 32.5), (111, 33)], REGION_COLORS[6]),   # Han
    ([(110, 31.5), (111, 33), (112, 32.5), (113.8, 33), (114, 34), (116, 34), (117, 35), (119, 35), (120.5, 33),
      (121.5, 31.5), (120, 30), (118, 29), (116, 27), (113, 26), (110, 26.5), (108.5, 28), (108, 30)],
     REGION_COLORS[0]),                                                                     # Chu
]


def map_eastasia():
    return map_plate("map_eastasia", 92, 48, 136, 16, regions=WARRING_STATES)


def village():
    w, h = PW, PH
    gy = h * 0.68
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, *SKY)
    cloud(sky, 500, 130, 320, 9)
    far = pl.layer("far", 0.6)
    hills(far, -20, w + 20, gy - 60, 150, K["hill_far"], 2, 4)
    windmill(far, 1700, gy - 90, 420, 18)
    tree_row(far, 100, 1300, gy - 70, 110, "cypress", seed=3)
    mid = pl.layer("houses", 0.85)
    hills(mid, -20, w + 20, gy, 30, K["hill_mid"], 8, 2)
    house(mid, 180, gy, 300, 330, "timber", "thatch", seed=1)
    house(mid, 560, gy - 4, 260, 300, "stone", "tile", seed=2)
    house(mid, 1180, gy, 300, 320, "plaster", "slate", seed=3)
    tree(mid, 980, gy, 380, "round", seed=4)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy, K["grass"], 10, wave=3)
    river(gnd, [(1560, gy + 4), (1620, gy + 110), (1780, gy + 260), (1720, h + 60)], 50, 380, seed=2)
    bush(gnd, 120, gy + 120, 220, seed=1, flowers=(120, 120, 240))
    bush(gnd, 1350, gy + 90, 180, seed=2)
    rock(gnd, 1200, gy + 260, 160, seed=4)
    grass_tufts(gnd, 0, 1500, gy + 30, h, 30, K["grass_dk"], 11)
    return save("village", pl, 0.68)


def japan_ext():
    w, h = PW, PH
    gy = h * 0.72
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, (240, 206, 160), (238, 228, 240))
    far = pl.layer("far", 0.55)
    hills(far, -20, w + 20, gy - 80, 160, K["hill_far"], 5, 3)
    jp_castle(far, 1500, gy - 60, 560, 620)
    pagoda(far, 420, gy - 60, 300, 560)
    mid = pl.layer("mid", 0.85)
    torii(mid, 960, gy, 560, 470)
    tree(mid, 1950, gy, 420, "blossom", seed=2)
    tree(mid, 120, gy, 480, "bamboo", seed=3)
    gnd = pl.layer("ground", 1.0)
    SC.ground_layer(gnd, w, h, gy, (150, 186, 200), 4, wave=2)
    texture(gnd, 0, w, gy + 30, h, (130, 166, 180), 40, 3)
    return save("japan_ext", pl, 0.72)


def rome():
    w, h = PW, PH
    gy = h * 0.72
    pl = Plate(w, h)
    sky = pl.layer("sky", 0.35, True)
    sky_grad(sky, *SKY)
    far = pl.layer("far", 0.6)
    hills(far, -20, w + 20, gy - 70, 140, K["hill_far"], 6, 3)
    city_wall(far, -40, w + 40, gy - 50, 150, seed=2, towers=6, gate_x=1700)
    tree_row(far, 50, 600, gy - 50, 220, "cypress", seed=7)
    mid = pl.layer("temple", 0.85)
    temple(mid, 900, gy, 900, 640, 6)
    gnd = pl.layer("ground", 1.0)
    floor(gnd, -20, w + 20, gy, h + 20, "flagstone", K["sandstone"], 3, rows=4)
    return save("rome", pl, 0.72)


SETS = dict(b01=b01, b02=b02, b03=b03, b04=b04, b05=b05, castle_yard=castle_yard, great_hall=great_hall,
            battlefield=battlefield, jp_interior=jp_interior, cn_palace=cn_palace, cn_throne=cn_throne,
            great_wall=great_wall_set, rain_road=rain_road, workshop_in=workshop_in, street_1800s=street_1800s,
            egypt=egypt, map_europe=map_europe, map_eastasia=map_eastasia, village=village, japan_ext=japan_ext,
            rome=rome)

if __name__ == "__main__":
    build(SETS, only=sys.argv[1:])
