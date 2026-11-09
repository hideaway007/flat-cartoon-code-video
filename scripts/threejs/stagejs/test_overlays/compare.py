"""Build Python | Canvas2D | amplified diff sheets and machine-readable pixel metrics."""
import json
import pathlib
import cv2
import numpy as np
from PIL import Image, ImageDraw
HERE=pathlib.Path(__file__).resolve().parent
cases=json.loads((HERE/'cases.json').read_text())
results=[]
rows=[]
for case in cases:
    ident=case['id']
    a=cv2.imread(str(HERE/'ref'/f'{ident}.png'))
    b=cv2.imread(str(HERE/'js'/f'{ident}.png'))
    if a is None or b is None:
        continue
    diff=np.abs(a.astype(float)-b.astype(float))
    ma=np.max(np.abs(a.astype(float)-128),axis=2)>4
    mb=np.max(np.abs(b.astype(float)-128),axis=2)>4
    union=ma|mb
    iou=float((ma&mb).sum()/max(1,union.sum()))
    results.append(dict(id=ident,type=case['L']['type'],age=case['t']-case['L']['t'],iou=iou,mean=float(diff.mean()),bad_pct=float((diff.max(2)>20).mean()*100),active_mean=float(diff[union].mean()) if union.any() else 0))
    if union.sum()>1080*1920*.8:
        x0,y0,x1,y1=0,0,1920,1080
    elif union.any():
        yy,xx=np.where(union)
        x0,y0,x1,y1=max(0,xx.min()-20),max(0,yy.min()-20),min(1920,xx.max()+21),min(1080,yy.max()+21)
    else:
        x0,y0,x1,y1=0,0,1920,1080
    imgs=[a,b,np.clip(diff*4,0,255).astype('uint8')]
    row=Image.new('RGB',(1440,295),'white')
    d=ImageDraw.Draw(row)
    for i,(img,title) in enumerate(zip(imgs,['Python','JS','diff x4'])):
        crop=Image.fromarray(cv2.cvtColor(img[y0:y1,x0:x1],cv2.COLOR_BGR2RGB))
        crop.thumbnail((480,255))
        row.paste(crop,(i*480+(480-crop.width)//2,35+(255-crop.height)//2))
        d.text((i*480+10,8),f"{ident} {case['L']['type']} +{case['t']-case['L']['t']:.2f}s  {title}",fill='black')
    rows.append((ident,row))
for start in range(0,len(rows),12):
    chunk=rows[start:start+12]
    sheet=Image.new('RGB',(1440,295*len(chunk)),'white')
    for i,(_,row) in enumerate(chunk): sheet.paste(row,(0,i*295))
    sheet.save(HERE/f'sheet_{start//12:02d}.jpg',quality=92)
(HERE/'comparison.json').write_text(json.dumps(results,indent=1))
for r in results:
    print(f"{r['id']:9} {r['type']:12} IoU={r['iou']:.4f} mean={r['mean']:.3f} active={r['active_mean']:.2f} bad={r['bad_pct']:.3f}%")
