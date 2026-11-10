"""Stage: shot helpers, checks and the renderer for code-drawn segments (flat-cartoon-code-video library).

A segment file (production/segments/segNN.py) builds `shots` with these helpers and ends with
    if __name__ == "__main__": stage.main(shots, context=prev_last_shot_or_None)
CLI of a segment:  --check | --stills [ids] | --render [--noaudio] [--out path]
Layer kinds: plate (engine.py), toon (code character, tweened keys), rope (between two toon layers' hands),
overlay (explainer graphics: circle, arrow, label, title, counter, bars, route, emote, stamp... -> overlays.py).
Shot filters: shot["filter"] = "sepia" | "night" (overlays.apply_filter).
"""
import json, math, pathlib, subprocess, sys
import numpy as np, cv2

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import engine as E, toon as T, timing

ROOT = E.ROOT
_sets = None


def sets():
    global _sets
    if _sets is None:
        p = ROOT / "assets" / "bg" / "sets.json"
        if not p.exists():
            sys.exit("assets/bg/sets.json missing: run production/sets.py first")
        _sets = json.loads(p.read_text())
    return _sets


def words():
    return timing.load()


_OV = None


def OV():
    """the overlays module, imported on first use (next to this file; else from the skill's scripts folder)."""
    global _OV
    if _OV is None:
        try:
            import overlays as m
        except ImportError:
            sys.path.append(str(pathlib.Path.home() / ".claude" / "skills" / "flat-cartoon-code-video" / "scripts"))
            import overlays as m
        _OV = m
    return _OV


# ------------------------------------------------------------------------------------------------ helpers
def set_meta(name):
    s = sets()
    if name not in s:
        sys.exit(f"set {name!r} is not built (known: {sorted(s)}): add it to production/sets.py and run it")
    return s[name]


def plates(name, scale=1.08, offset=(0, 0)):
    """all layers of a set as engine plates (sky opaque, others alpha), with parallax depths from sets.json."""
    s = set_meta(name)
    return [dict(kind="plate", src=L["src"], depth=L["depth"], scale=scale, opaque=L["opaque"], offset=tuple(offset),
                 _set=name) for L in s["layers"]]


def ground_y(name, scale=1.08, offset=(0, 0)):
    """screen y of the set's ground line before camera moves (plates and depth-1.0 characters move together)."""
    s = sets()[name]
    w, h = s["size"]
    cover = max(E.W / w, E.H / h) * scale
    return E.H / 2 + (s["ground"] - 0.5) * h * cover + offset[1]


def toon(D, pos, scale, keys, **kw):
    """a code character. keys: [(t_rel, pose[, opts])], first = start pose; opts: dur (tween s, default 0.18),
    amp/deg (squash-overshoot-settle on the change, like the reference's pose swaps).
    kw: flip (face left), phase (idle offset), talk (word spans -> mouth flaps when mouth="talk"),
    walk=dict(period, ph), motions (engine: drift/bob/jolt/punch/enter/tremble), shadow (False for waist-up/hanging),
    idle_off, depth."""
    return dict(kind="toon", D=D, pos=tuple(pos), scale=scale, keys=[k if len(k) == 3 else (*k, {}) for k in keys], **kw)


def rope(a, b, sag=(70, 8), switch=None):
    """rope between toon layers a (left) and b (right) = their indices in the shot's layers. Each character's rope
    colour runs from a tail on the ground through both hands to a knot in the middle. sag=(before, after `switch`)."""
    return dict(kind="rope", a=a, b=b, sag=sag, switch=1e9 if switch is None else switch)


def overlay(type, t, **params):
    """an explainer overlay layer (see overlays.py for every type's params). t = start inside the shot (s);
    optional dur= or out= (end inside the shot) animates it out; world=True pins it to the scene (moves with the
    camera), default = screen-space HUD. Put overlays after the characters in the layer list."""
    return dict(kind="overlay", type=type, t=t, **params)


def lonlat(name, lon, lat, scale=1.08, offset=(0, 0)):
    """screen px (before camera moves, like ground_y) of a lon/lat on a map set whose sets.json entry has
    "proj": {"lon0", "lat0", "lon1", "lat1"} (equirectangular: plate x = (lon-lon0)/(lon1-lon0)*w,
    y = (lat0-lat)/(lat0-lat1)*h). Pass the same scale/offset as S.plates(name, ...)."""
    s = set_meta(name)
    pr = s.get("proj")
    if not pr:
        sys.exit(f"set {name!r} has no 'proj' (lon/lat bounds) in sets.json: not a map plate")
    w, h = s["size"]
    px = (lon - pr["lon0"]) / (pr["lon1"] - pr["lon0"]) * w
    py = (pr["lat0"] - lat) / (pr["lat0"] - pr["lat1"]) * h
    cover = max(E.W / w, E.H / h) * scale
    return (E.W / 2 + (px - w / 2) * cover + offset[0], E.H / 2 + (py - h / 2) * cover + offset[1])


def talk_spans(W, t0, t1, shot_start):
    """word spans (relative to the shot) for mouth flaps."""
    return [(w["start"] - shot_start, w["end"] - shot_start) for w in W.words if t0 <= w["start"] < t1]


# ------------------------------------------------------------------------------------------------ checks
def check(shots, context=None):
    """static checks (no rendering): timing continuity, key times, standing characters on the ground line."""
    errs = []
    if context is not None and abs(context["end"] - shots[0]["start"]) > 1e-3:
        errs.append(f"{shots[0]['id']}: starts at {shots[0]['start']} but the previous segment ends at {context['end']}")
    for i, sh in enumerate(shots):
        sid, dur = sh["id"], sh["end"] - sh["start"]
        if dur <= 0:
            errs.append(f"{sid}: end <= start"); continue
        if i and abs(sh["start"] - shots[i - 1]["end"]) > 1e-3:
            errs.append(f"{sid}: starts at {sh['start']:.3f}, previous ends at {shots[i - 1]['end']:.3f} (gap/overlap)")
        if sh.get("tin") and i == 0 and context is None:
            errs.append(f"{sid}: transition in, but no previous shot (pass context= from the previous segment)")
        pl = [L for L in sh["layers"] if L["kind"] == "plate"]
        gy = None
        if pl:
            p0 = pl[0]
            gy = ground_y(p0["_set"], p0["scale"], p0.get("offset", (0, 0))) if "_set" in p0 else None
        if sh.get("filter") is not None:
            errs += OV().check_filter(sh["filter"], sid)
        for j, L in enumerate(sh["layers"]):
            if L["kind"] == "overlay":
                errs += OV().check(L, dur, sid)
                continue
            if L["kind"] == "rope":
                for k in (L["a"], L["b"]):
                    if k >= len(sh["layers"]) or sh["layers"][k]["kind"] != "toon" or k > j:
                        errs.append(f"{sid}: rope refers to layer {k}, which is not an earlier toon layer")
            if L["kind"] != "toon":
                continue
            name = L["D"].get("name", "?")
            ts = [k[0] for k in L["keys"]]
            if ts[0] != 0 or ts != sorted(ts) or any(t < 0 or t >= dur for t in ts[1:]):
                errs.append(f"{sid} {name}: key times {[round(t, 2) for t in ts]} must start at 0, rise, stay < {dur:.2f}")
            bad = [k for kk in L["keys"] for k in kk[1] if k not in T.DEFAULT_POSE]
            if bad:
                errs.append(f"{sid} {name}: unknown pose fields {sorted(set(bad))}")
            if gy is not None and L.get("shadow", True) is not False and L.get("depth", 1.0) == 1.0:
                y = L["pos"][1]
                dy = sum(m.get("dy", 0) for m in L.get("motions", []) if m["type"] == "drift")
                for when, yy in (("start", y), ("end", y + min(dy, 0))):
                    if yy < gy - 4:
                        errs.append(f"{sid} {name}: feet at y={yy:.0f} ({when}) above the ground line y={gy:.0f} "
                                    f"-> floating; increase pos y (bigger = nearer the viewer)")
    return errs


# ------------------------------------------------------------------------------------------------ renderer
def ease_back(u, s=1.4):
    u = min(max(u, 0.0), 1.0) - 1
    return 1 + u * u * ((s + 1) * u + s)


def pose_at(L, t):
    keys = L["keys"]
    cur = dict(keys[0][1])
    for tk, pk, o in keys[1:]:
        if t >= tk:
            cur = T.blend(cur, pk, ease_back((t - tk) / o.get("dur", 0.18)))
    if L.get("talk") and cur["mouth"] == "talk":
        on = [(a, b) for a, b in L["talk"] if a <= t < b]
        cur["mopen"] = (0.15 + 0.85 * abs(math.sin(math.pi * (t - on[0][0]) / max(on[0][1] - on[0][0], 0.08)))
                        if on else 0.1)
    if L.get("walk") and L["D"].get("rig") == "horse":   # horse.py: walk= drives the gait cycle, rider keeps the pose
        w = L["walk"]
        cur["stride"] = (t / w.get("period", 1.0) + w.get("ph", 0) / (2 * math.pi)) % 1.0
        if cur.get("gait", "stand") == "stand":
            cur["gait"] = "walk"
    elif L.get("walk"):
        w = L["walk"]
        s = math.sin(2 * math.pi * t / w.get("period", 0.56) + w.get("ph", 0))
        cur["lift"] = (max(0, s) * 46, max(0, -s) * 46)
        cur["hL"] = (-30, 230 + 30 * s)
        cur["hR"] = (30, 230 - 30 * s)
        cur["head"] = 2.5 * s
    return cur


def _shadow(frame, pts, rx, ry):
    m = int(rx * 2 + 30)
    x0, y0 = int(min(p[0] for p in pts) - m), int(min(p[1] for p in pts) - m)
    x1, y1 = int(max(p[0] for p in pts) + m), int(max(p[1] for p in pts) + m)
    X0, Y0, X1, Y1 = max(x0, 0), max(y0, 0), min(x1, E.W), min(y1, E.H)
    if X0 >= X1 or Y0 >= Y1:
        return
    msk = np.zeros((y1 - y0, x1 - x0), np.float32)
    for x, y in pts:
        cv2.ellipse(msk, (int(x - x0), int(y - y0)), (int(rx), int(ry)), 0, 0, 360, 1.0, -1, cv2.LINE_AA)
    msk = cv2.GaussianBlur(msk, (0, 0), 5) * 0.30
    frame[Y0:Y1, X0:X1] *= (1 - msk[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0, None])


def draw_toon(frame, L, cam, tn, t, shk):
    p = pose_at(L, t)
    swaps = [(tk, o) for tk, _, o in L["keys"][1:]]
    s0 = L["scale"]
    mdx, mdy, msc, r = E.motion_offset(L.get("motions", []), t, swaps, s0)
    s = s0 * msc
    ph = L.get("phase", 0.0)
    idle = (0.0, 0.0) if L.get("idle_off") else (math.sin(2 * math.pi * t / 2.6 + ph),
                                                  2.0 * math.sin(2 * math.pi * t / 2.2 + ph))
    x, y = L["pos"][0] + mdx, L["pos"][1] + mdy
    place = np.array([[s * math.cos(r), -s * math.sin(r), x], [s * math.sin(r), s * math.cos(r), y]], np.float32)
    A = E.compose_affine(E.cam_affine(cam, L.get("depth", 1.0), tn), place).astype(np.float64)
    A[0, 2] += shk[0]; A[1, 2] += shk[1]
    sc = math.sqrt(abs(np.linalg.det(A[:, :2])))
    if L.get("shadow", True):
        fl = -1 if L.get("flip") else 1
        rig = L["D"].get("rig")
        feet, rx = {"bust": ((-150.0, 150.0), 130), "horse": ((-200.0, 0.0, 200.0), 170)}.get(rig, (p["feet"], 78))
        _shadow(frame, [A[:, :2] @ np.array([fl * fx, 0.0]) + A[:, 2] for fx in feet], rx * sc, 16 * sc)
    L["_j"] = T.render_char(frame, L["D"], p, A, flip=L.get("flip", False), idle=idle)
    L["_s"] = sc


def draw_rope(frame, L, layers, t):
    a, b = layers[L["a"]], layers[L["b"]]
    ja, jb = a.get("_j"), b.get("_j")
    if not ja or not jb:
        return
    ha = sorted([ja["handL"], ja["handR"]], key=lambda v: v[0])
    hb = sorted([jb["handL"], jb["handR"]], key=lambda v: v[0])
    sag = L["sag"][0] if t < L["switch"] else L["sag"][1]
    knot = (ha[1] + hb[0]) / 2 + np.array([0, sag * 0.6])
    sa, sb = a["_s"], b["_s"]
    tail_a = np.array([ha[0][0] - 170 * sa, ja["footL"][1] - 6])
    tail_b = np.array([hb[1][0] + 170 * sb, jb["footL"][1] - 6])
    mid_a = (ha[1] + knot) / 2 + np.array([0, sag * 0.5])
    mid_b = (hb[0] + knot) / 2 + np.array([0, sag * 0.5])
    wpx, lw = 19 * (sa + sb) / 2, 7 * (sa + sb) / 2
    T.render_strokes(frame, [[tail_a, (tail_a + ha[0]) / 2 + (0, 10 * sa), ha[0], ha[1], mid_a, knot]],
                     a["D"]["rope"], wpx, lw)
    T.render_strokes(frame, [[knot, mid_b, hb[0], hb[1], (hb[1] + tail_b) / 2 + (0, 10 * sb), tail_b]],
                     b["D"]["rope"], wpx, lw, knot=T.ellipse_pts(knot[0], knot[1], 46 * sa, 36 * sa, 0.3, 20))


def render_shot(sh, t):
    tn = min(t / (sh["end"] - sh["start"]), 1.0)
    frame = np.zeros((E.H, E.W, 3), np.float32)
    shk = E.shake_offset(sh.get("shake"), t)
    filt = sh.get("filter")
    if any(L["kind"] == "overlay" for L in sh["layers"]):
        ex = OV().extra_shake(sh, t)
        shk = (shk[0] + ex[0], shk[1] + ex[1])
    for L in sh["layers"]:
        k = L["kind"]
        if k == "overlay":
            if filt is not None:          # the filter tints the scene (layers before the first overlay), not graphics
                OV().apply_filter(frame, filt)
                filt = None
            OV().render(frame, L, sh, t, tn, shk)
        elif k == "plate":
            E.render_plate(frame, L, sh["cam"], tn, shk)
        elif k == "toon":
            draw_toon(frame, L, sh["cam"], tn, t, shk)
        elif k == "rope":
            draw_rope(frame, L, sh["layers"], t)
        elif k == "char":   # an image-based character layer (PNG poses) for shots too hard to draw in code
            E.render_char(frame, L, sh["cam"], tn, t, shk)
    if filt is not None:
        OV().apply_filter(frame, filt)
    E.grade(frame, sh.get("grade"))
    E.vignette(frame, sh.get("vignette", 0.25))
    return frame


def render(shots, out_mp4=None, fps=30, audio=None, stills=None, context=None):
    """frames from shots[0].start to shots[-1].end. `context`: the previous segment's last shot, used only for a
    transition into this segment's first shot."""
    seq = ([context] if context else []) + list(shots)
    f0, f1 = int(round(shots[0]["start"] * fps)), int(round(shots[-1]["end"] * fps))
    proc = None
    if stills is None:
        args = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{E.W}x{E.H}", "-r", str(fps),
                "-i", "-"]
        if audio:
            args += ["-i", str(audio), "-c:a", "aac", "-b:a", "192k", "-shortest"]
        args += ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(out_mp4)]
        proc = subprocess.Popen(args, stdin=subprocess.PIPE)
    frames = range(f0, f1) if stills is None else [int(round(s * fps)) for s in stills]
    for fi in frames:
        Tm = fi / fps
        si = next((i for i, s in enumerate(seq) if s["start"] <= Tm < s["end"]), len(seq) - 1)
        sh = seq[si]
        t = Tm - sh["start"]
        frame = render_shot(sh, t)
        tin = sh.get("tin")
        if tin and si > 0 and t < tin.get("dur", 0.35):
            prev = seq[si - 1]
            frame = E.transition(render_shot(prev, prev["end"] - prev["start"] + t), frame, t / tin.get("dur", 0.35), tin)
        frame *= E.paper()
        out = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
        if proc:
            proc.stdin.write(out.tobytes())
        else:
            p = ROOT / "production" / "stills" / f"{sh['id']}_{Tm:06.2f}.jpg"
            p.parent.mkdir(exist_ok=True)
            cv2.imwrite(str(p), out, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if fi % (fps * 5) == 0:
            print(f"frame {fi - f0}/{f1 - f0} shot {sh['id']}", flush=True)
    if proc:
        proc.stdin.close(); proc.wait()


def contact_sheet(paths, out, w=530, cols=3):
    ims = [cv2.resize(im, (w, int(im.shape[0] * w / im.shape[1]))) for im in (cv2.imread(str(p)) for p in paths)
           if im is not None]
    if not ims:
        return None
    while len(ims) % cols:
        ims.append(np.zeros_like(ims[0]))
    cv2.imwrite(str(out), np.vstack([np.hstack(ims[i:i + cols]) for i in range(0, len(ims), cols)]),
                [cv2.IMWRITE_JPEG_QUALITY, 82])
    return out


def main(shots, context=None, name=None):
    """CLI for a segment file. --check | --stills [ids] | --render [--noaudio] [--out path] (default: all three
    steps' cheapest = --check then --stills)."""
    args = sys.argv[1:]
    ids = [a for a in args if not a.startswith("--") and not a.endswith(".mp4")]
    seg = name or pathlib.Path(sys.argv[0]).stem
    errs = check(shots, context)
    for e in errs:
        print("ERROR", e)
    print(f"{seg}: {len(shots)} shots {shots[0]['start']:.2f}-{shots[-1]['end']:.2f}s, {len(errs)} errors")
    if errs or "--check" in args:
        sys.exit(1 if errs else 0)
    if "--render" in args:
        out = pathlib.Path(args[args.index("--out") + 1]) if "--out" in args else ROOT / "out" / "segments" / f"{seg}.mp4"
        out.parent.mkdir(parents=True, exist_ok=True)
        aud = None
        if "--noaudio" not in args:
            src = next(iter(sorted((ROOT / "assets" / "audio").glob("*.*"))), None)
            if src:
                aud = out.with_suffix(".wav")
                st, en = shots[0]["start"], shots[-1]["end"]
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{st:.3f}", "-t", f"{en - st:.3f}", "-i", str(src),
                                str(aud)], check=True)
        render(shots, out, audio=aud, context=context)
        if aud:
            aud.unlink()
        print(out)
    else:  # stills: 3 key frames per shot + a contact sheet
        sel = [s for s in shots if not ids or s["id"] in ids]
        times = [s["start"] + (s["end"] - s["start"]) * f for s in sel for f in (0.15, 0.5, 0.9)]
        sd = ROOT / "production" / "stills"
        for old in sd.glob("*.jpg") if sd.exists() else []:
            if any(old.name.startswith(s["id"] + "_") for s in sel):
                old.unlink()
        render(shots, stills=times, context=context)
        paths = sorted(p for p in sd.glob("*.jpg") if any(p.name.startswith(s["id"] + "_") for s in sel))
        print(contact_sheet(paths, ROOT / "production" / "review" / f"stills_{seg}.jpg"))
