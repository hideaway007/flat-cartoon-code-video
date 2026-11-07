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


SETS = dict(b01=b01, b02=b02, b03=b03, b04=b04, b05=b05)

if __name__ == "__main__":
    build(SETS, only=sys.argv[1:])
