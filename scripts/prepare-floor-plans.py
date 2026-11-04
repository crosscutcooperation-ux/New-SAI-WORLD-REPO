"""Prepare original 2D drawings and low wall cutaways from the supplied plan PDF."""
from pathlib import Path
import json
import cv2
import numpy as np
import pymupdf as fitz

source=Path(__file__).resolve().parents[2]/'plan-references'/'plans.pdf'
out=Path(__file__).resolve().parents[1]/'dist'/'assets'/'plans'
out.mkdir(parents=True,exist_ok=True)
doc=fitz.open(source)
rows=[('castle',0),('vista',2),('mist',4),('spring',6),('meadows',8),('heaven',9),('breeze-low',10),('breeze-high',11)]

def polygon(contour):
    return cv2.approxPolyDP(contour,1.1,True).reshape(-1,2).tolist()

for key,index in rows:
    page=doc[index]
    for half,kind in [(0,'typical'),(1,'refuge')]:
        name=key+'-'+kind
        # The original page contains two separate floor drawings.
        clip=fitz.Rect(14+half*936,18,950+half*936,665)
        page.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip).pil_save(str(out/(name+'-2d.webp')),format='WEBP',quality=95)
        large=[a for a in page.get_image_info() if a['width']>300 and a['height']>200 and (a['bbox'][0]<953)==(half==0)]
        bounds=fitz.Rect()
        for info in large:bounds|=fitz.Rect(info['bbox'])
        # Include only the floor body for the 3D texture.
        if key=='breeze-low':bounds=fitz.Rect(202+half*936,125,760+half*936,638)
        margin=4
        bounds=fitz.Rect(bounds.x0-margin,bounds.y0-margin,bounds.x1+margin,bounds.y1+margin)
        zoom=1800/max(bounds.width,bounds.height)
        pix=page.get_pixmap(matrix=fitz.Matrix(zoom,zoom),clip=bounds,alpha=False)
        rgb=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3).copy()
        hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
        walls=((hsv[:,:,1]<38)&(hsv[:,:,2]>58)&(hsv[:,:,2]<160)).astype(np.uint8)*255
        walls=cv2.morphologyEx(walls,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
        count,labels,stats,_=cv2.connectedComponentsWithStats(walls)
        clean=np.zeros_like(walls)
        for component in range(1,count):
            x,y,w,h,area=stats[component]
            if area>=60 and max(w,h)>16:clean[labels==component]=255
        # Remove the two exact cream/star background colors. The remaining
        # rendered floor finishes give a much fuller silhouette than walls alone.
        pixels=rgb.astype(np.int16)
        cream=np.max(np.abs(pixels-np.array([255,240,216])),axis=2)<13
        stars=np.max(np.abs(pixels-np.array([245,227,194])),axis=2)<13
        foreground=(~(cream|stars)).astype(np.uint8)*255
        foreground=cv2.morphologyEx(foreground,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
        foreground=cv2.morphologyEx(foreground,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
        outlines,_=cv2.findContours(foreground,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        mask=np.zeros_like(foreground)
        largest=max((cv2.contourArea(c) for c in outlines),default=0)
        valid=[c for c in outlines if cv2.contourArea(c)>max(1200,largest*.015)]
        cv2.drawContours(mask,valid,-1,255,cv2.FILLED)
        clean=cv2.bitwise_and(clean,mask)
        contours,hierarchy=cv2.findContours(clean,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
        rings=[]
        if hierarchy is not None:
            for i,contour in enumerate(contours):
                if hierarchy[0,i,3]!=-1 or cv2.contourArea(contour)<30:continue
                holes=[];child=hierarchy[0,i,2]
                while child!=-1:
                    if cv2.contourArea(contours[child])>12:holes.append(polygon(contours[child]))
                    child=hierarchy[0,child,0]
                rings.append({'outer':polygon(contour),'holes':holes})
        rgba=cv2.cvtColor(rgb,cv2.COLOR_RGB2BGRA);rgba[:,:,3]=mask
        cv2.imwrite(str(out/(name+'-floor.png')),rgba)
        exterior,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        payload={'width':pix.width,'height':pix.height,'walls':rings,'footprint':[polygon(c) for c in exterior if cv2.contourArea(c)>500],'page':index+1}
        (out/(name+'.json')).write_text(json.dumps(payload,separators=(',',':')))
        print(name,len(rings),'wall contours')
