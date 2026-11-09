"""Export a time range of a segment (shot list from production/segments/segNN.py) as JSON for the browser stage
(stagejs/). Everything is data: plates and crowd strips are PNG paths (project-relative), toons carry their full design
dict + pose keys (the browser draws them with toonjs), overlays carry their params (stagejs/overlays.js draws them).
Run: $PY threejs/export_stage.py [seg01] [t0] [t1]   -> threejs/stage_assets/<seg>_<t0>-<t1>.json + .wav"""
import json, pathlib, subprocess, sys
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "production"))
sys.path.insert(0, str(ROOT / "production" / "segments"))
seg = sys.argv[1] if len(sys.argv) > 1 else "seg01"
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 15.0
sys.argv = [f"{seg}.py"]
import crowds as _CR
_orig_strip = _CR._strip_layer


def _strip_with_members(mem, y_r, hz, haze_col, shadow, march, idle, g, r, keys, depth, root, tag, blur=0.0):
    """crowds._strip_layer + the members themselves, so the 3D stage can stand every person on their own card."""
    L = _orig_strip(mem, y_r, hz, haze_col, shadow, march, idle, g, r, keys, depth, root, tag, blur)
    L["_members"] = [dict(D=m["D"], s=m["s"], flip=m["flip"], x=m["x"], y=y_r,
                          seq=[[t, frames] for t, frames in m["seq"]]) for m in mem]
    L["_march"] = march
    L["_row"] = r
    L["_haze"] = hz
    return L


_CR._strip_layer = _strip_with_members
mod = __import__(seg)
import engine as E


def clean(v):
    if isinstance(v, dict):
        return {str(k): clean(x) for k, x in v.items()
                if not str(k).startswith("_") or k in ("_crowd", "_members", "_march", "_row", "_haze")}
    if isinstance(v, (list, tuple)):
        return [clean(x) for x in v]
    if isinstance(v, (np.floating, np.integer)):
        return v.item()
    if isinstance(v, np.ndarray):
        return clean(v.tolist())
    if isinstance(v, pathlib.Path):
        return str(v)
    return v


shots = [s for s in mod.shots if s["end"] > t0 and s["start"] < t1]
OVM = None
for s in shots:                      # overlays: keep Python's wobble seed (JSON loses tuple/int details it hashes)
    for L in s["layers"]:
        if L["kind"] == "overlay":
            if OVM is None:
                import stage as _S
                OVM = _S.OV()
            L.setdefault("seed", OVM._seed(L))
out = dict(seg=seg, t0=t0, t1=t1, fps=30, W=E.W, H=E.H, shots=[clean(s) for s in shots])
kinds = {}
for s in out["shots"]:
    for L in s["layers"]:
        k = L["kind"] if L["kind"] != "overlay" else "overlay:" + L["type"]
        kinds[k] = kinds.get(k, 0) + 1
od = HERE / "stage_assets"
od.mkdir(exist_ok=True)
name = f"{seg}_{t0:g}-{t1:g}"
(od / f"{name}.json").write_text(json.dumps(out))
src = next(iter(sorted((ROOT / "assets" / "audio").glob("*.wav"))))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", str(src),
                str(od / f"{name}.wav")], check=True)
print(name, len(shots), "shots:", [s["id"] for s in shots], kinds)
