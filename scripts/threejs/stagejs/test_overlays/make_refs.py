"""Render Python overlay references; run with historically-study/.venv/bin/python."""
import json
import pathlib
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "production"))
import overlays as O

LAYERS = [
{"type":"caption_pop","t":0.1,"text":"BEFORE SUNDOWN","at":[560,240],"size":96,"fill":[40,140,245],"rot":-4},
{"type":"counter","t":0.49,"b":210,"at":[1520,160],"count":0.6,"label":"MEN WITH CUSTER","size":90},
{"type":"mood","t":0.0,"mode":"dim","amount":0.35,"fade":0.6},
{"type":"caption_pop","t":0.1,"text":"June 25, 1876","at":[900,300],"size":100,"fill":[226,232,228],"rot":-2,"world":True},
{"type":"label","t":0.15,"text":"Southern Montana","at":[1250,470],"box":[1350,300],"size":48},
{"type":"mood","t":0.0,"mode":"rays","at":[960,260],"alpha":0.32,"world":True},
{"type":"title","t":0.1,"text":"Lt. Col. George Armstrong Custer","sub":"7th Cavalry","pos":"lower","style":"paper","size":66},
{"type":"title","t":0.1,"text":"1983","sub":"Little Bighorn Battlefield","pos":"top","style":"ribbon","size":104},
{"type":"label","t":1.6,"text":"BENTEEN","at":[186.0,656.6],"box":[186.0,546.6],"size":42,"dot":False,"fill":[58,204,255]},
{"type":"emote","t":3.08,"symbol":"question","at":[550.0,339.9],"size":1.4,"world":True},
{"type":"mood","t":0,"mode":"spotlight","at":[960,640],"r":230},
{"type":"spotlight","t":0,"at":[960,500],"r":210,"ring":True},
{"type":"circle","t":0,"at":[960,480],"r":[180,110]},
{"type":"arrow","t":0,"pts":[[500,650],[1200,350]]},
{"type":"underline","t":0,"span":[500,1200,500],"double":True},
{"type":"route","t":0,"pts":[[500,650],[800,300],[1200,450]],"draw":0.5},
{"type":"bars","t":0,"at":[700,740],"items":[["A",30],["B",60],["C",100]],"title":"MEN"},
{"type":"meter","t":0,"at":[700,540],"value":0.65,"show_value":True},
{"type":"report_card","t":0,"at":[960,540],"name":"CUSTER","rows":[["Planning","F"],["Timing","D"]],"final":"F","remark":"See me after class."},
{"type":"emote","t":0,"symbol":"sweat","at":[960,500]},
{"type":"emote","t":0,"symbol":"anger","at":[960,500]},
{"type":"emote","t":0,"symbol":"sparkle","at":[960,500]},
{"type":"emote","t":0,"symbol":"impact","at":[960,500]},
{"type":"emote","t":0,"symbol":"speed","at":[960,500]},
{"type":"stamp","t":0,"text":"FAILED","at":[960,500]},
]
SHOT = {"start":0,"end":10,"cam":{"z0":1,"z1":1},"layers":[]}
COLORS = {"fill","ink","color","line_color","label_fill","band","marker_color","low_color","grade_color"}
def python_layer(layer):
    # Python caches need hashable colours. Preserve coordinate lists for JSON seed parity.
    layer = dict(layer)
    for key in COLORS:
        if isinstance(layer.get(key), list):
            layer[key] = tuple(layer[key])
    if "items" in layer:
        layer["items"] = [(it[0],it[1],tuple(it[2])) if len(it)>2 else it for it in layer["items"]]
    return layer

def main():
    (HERE / "ref").mkdir(exist_ok=True)
    cases = []
    for i, layer in enumerate(LAYERS):
        # Serializing explicit seeds preserves Python repr's 186.0 vs JSON's 186,
        # and list/tuple distinctions. This is also recommended for shot export.
        layer = dict(layer, seed=O._seed(layer))
        for j, age in enumerate((0.05,0.3,1.0)):
            t = layer["t"] + age
            case = dict(id=f"{i:02d}_{j}", L=layer, sh=SHOT, t=t, tn=t/10, shk=[0,0])
            frame = np.full((1080,1920,3),0.5,np.float32)
            O.render(frame,python_layer(layer),SHOT,t,t/10,[0,0])
            cv2.imwrite(str(HERE / "ref" / (case["id"]+".png")), np.clip(frame*255+0.5,0,255).astype(np.uint8))
            cases.append(case)
    # Camera, depth, screen shake and out-factor coverage.
    for j, age in enumerate((0.05,0.3,1.0,1.82,1.95,2.05)):
        layer = dict(LAYERS[3],dur=2,depth=0.7,seed=99)
        sh = {**SHOT,"cam":{"z0":1.1,"z1":1.8,"x0":-90,"x1":140,"y0":10,"y1":-65,"focus":[800,480],"ease":"out"}}
        t = layer["t"]+age
        case = dict(id=f"camera_{j}",L=layer,sh=sh,t=t,tn=t/10,shk=[8,-5])
        frame=np.full((1080,1920,3),0.5,np.float32)
        O.render(frame,python_layer(layer),sh,t,t/10,[8,-5])
        cv2.imwrite(str(HERE/"ref"/(case["id"]+".png")),np.clip(frame*255+0.5,0,255).astype(np.uint8))
        cases.append(case)
    (HERE/"cases.json").write_text(json.dumps(cases,indent=1))
    metrics=[]
    for text,size,fname,stroke in [("BEFORE SUNDOWN",96,"main",None),("1983",104,"main",None),("Southern Montana",48,"main",0),("?",280,"comic",22.4),("Lt. Col. George Armstrong Custer",66,"main",0)]:
        spr=O.text_sprite(text,size,stroke=stroke,fname=fname)
        f=O.font(fname,size*2)
        metrics.append(dict(text=text,size=size,fname=fname,stroke=stroke,width=spr.shape[1],height=spr.shape[0],bbox=ImageDraw.Draw(Image.new("RGBA",(4,4))).textbbox((0,0),text,font=f,stroke_width=round((size*.11 if stroke is None else stroke)*2))))
    (HERE/"metrics.json").write_text(json.dumps(metrics,indent=1))
    shake_sh={"layers":[{"kind":"overlay","type":"stamp","t":0.4},{"kind":"overlay","type":"report_card","t":0.2,"rows":[["A","F"],["B","D"]],"final":"F"}]}
    (HERE/"shakes.json").write_text(json.dumps({"sh":shake_sh,"expected":[[t,O.extra_shake(shake_sh,t)] for t in [0,.4,.53,.6,1,2,2.5,3]]}))
    print(f"{len(cases)} references written; frame {O.E.W} x {O.E.H}")

if __name__ == "__main__":
    main()
