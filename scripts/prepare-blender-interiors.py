"""Prepare registered apartment drawings and furniture traces for the Blender renderer."""
from pathlib import Path
import json, runpy, tempfile
import cv2
import numpy as np

lib=runpy.run_path(str(Path(__file__).with_name("register-unit-sheets.py")))
assets=lib["assets"]; out=assets/"unit-sheets";out.mkdir(exist_ok=True)
work=Path(tempfile.gettempdir())/"swd-interiors";work.mkdir(exist_ok=True)
jobs=[]
for page,num,bhk,box,objects,img,mask,flip,*_ in lib["sources"]:
    if flip:continue
    key=f"p{page}-{num:02}"
    # Furniture positions are in the coordinate system of the furnished unit sheet.
    items=[]
    for group in objects.split(";"):
        kind,rects=group.split(":")
        for rect in rects.split():
            x,y,w,h=map(int,rect.split(","))
            items.append([kind,(x-box[0])*3,(y-box[1])*3,w*3,h*3])
    path=max(cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0],key=cv2.contourArea)
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    masonry=((hsv[:,:,1]<48)&(hsv[:,:,2]>42)&(hsv[:,:,2]<159)&(mask>0)).astype("uint8")*255
    # Long continuous strokes isolate architectural partitions from print and furnishings.
    wall=np.zeros_like(mask)
    for size in [(3,20),(20,3)]:
        wall|=cv2.morphologyEx(masonry,cv2.MORPH_OPEN,np.ones(size,np.uint8))
    for kind,x,y,w,h in items:
        wall[max(y+2,0):max(y+h-2,0),max(x+2,0):max(x+w-2,0)]=0
    contours,tree=cv2.findContours(wall,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    rings=[cv2.approxPolyDP(c,1,True).reshape(-1,2).tolist() for c in contours if cv2.contourArea(c)>30]
    white=np.full_like(img,255);white[mask>0]=img[mask>0]
    cv2.imwrite(str(work/(key+".png")),white)
    h,w=img.shape[:2];side=round(max(h,w)*1.24)
    canvas=np.full((side,side,3),255,np.uint8)
    top=(side-h)//2;left=(side-w)//2
    canvas[top:top+h,left:left+w]=white
    cv2.imwrite(str(out/(key+"-flat.webp")),canvas,[cv2.IMWRITE_WEBP_QUALITY,96])
    jobs.append(dict(key=key,width=w,height=h,side=side,items=items,walls=rings,
        outline=cv2.approxPolyDP(path,1,True).reshape(-1,2).tolist()))
(work/"jobs.json").write_text(json.dumps(jobs))
