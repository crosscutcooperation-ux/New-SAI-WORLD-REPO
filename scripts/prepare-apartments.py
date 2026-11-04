"""Extract apartment areas from supplied floor drawings into selectable plans and cutaways."""
from pathlib import Path
import json,re
import pymupdf as fitz
import cv2
import numpy as np

root=Path(__file__).resolve().parents[1]/'dist'/'assets'/'plans'
doc=fitz.open(Path(__file__).resolve().parents[2]/'plan-references'/'plans.pdf')
def rect(x,y,r,b):return [[x,y],[r,y],[r,b],[x,b]]
castle=[
('08','2 BHK',rect(70,130,175,199)),
('01','2 BHK',rect(70,218,175,284)),
('07','2 BHK',[[180,110],[294,110],[294,165],[242,165],[242,199],[180,199]]),
('06','2 BHK',[[329,115],[443,115],[443,199],[383,199],[383,165],[329,165]]),
('05','3 BHK',rect(443,69,532,199)),
('04','3 BHK',rect(443,218,532,343)),
('02','2 BHK',[[180,218],[241,218],[241,247],[294,247],[294,300],[180,300]]),
('03','2 BHK',[[383,218],[443,218],[443,300],[329,300],[329,247],[383,247]])]
vista=[
('01','1 BHK',rect(88,140,169,200)),('02','1 BHK',rect(169,140,246,200)),
('03','2.5 BHK',rect(230,24,300,143)),('04','2.5 BHK',rect(300,24,367,143)),
('05','1 BHK',rect(348,140,426,200)),('06','1 BHK',rect(426,140,503,200)),
('07','1 BHK',rect(426,218,503,272)),('08','1 BHK',rect(348,218,426,272)),
('09','2 BHK',rect(300,278,367,387)),('10','2 BHK',rect(230,278,300,387)),
('11','1 BHK',rect(169,218,246,272)),('12','1 BHK',rect(88,218,169,272))]
mist=[
('01','3 BHK · Type 1',rect(168,134,267,200)),('08','3 BHK · Type 1',rect(168,203,267,278)),
('02','3 BHK · Type 1',rect(252,40,321,149)),('03','3 BHK · Type 1',rect(321,40,390,149)),
('04','3 BHK · Type 1',rect(380,134,478,200)),('05','3 BHK · Type 1',rect(380,203,478,278)),
('06','3 BHK · Type 2',rect(324,280,386,378)),('07','3 BHK · Type 2',rect(257,280,324,378))]
spring=[(i,t.replace('Type 2','Type 3'),p) for i,t,p in mist]
spring=[(i,'3 BHK · Type 2' if i in ['02','03'] else t,p) for i,t,p in spring]
low=[
('01','2 BHK',rect(122,58,218,176)),('10','2 BHK',rect(122,180,218,283)),
('02','1 BHK',rect(218,82,329,166)),('09','1 BHK',rect(218,188,329,254)),
('08','2 BHK + kids room',[[326,282],[472,282],[472,388],[326,388]])]
high=[
('01','2 BHK · Type 1',rect(72,76,145,167)),('02','1 BHK · Type 1',rect(145,94,244,166)),
('03','1 BHK · Type 1',rect(351,94,453,166)),('04','2 BHK',rect(453,75,532,167)),
('05','2 BHK',rect(453,178,532,264)),('06','1 BHK · Type 1',rect(351,178,453,250)),
('07','1 BHK · Type 2',rect(300,252,357,347)),('08','1 BHK · Type 2',rect(235,252,300,347)),
('09','1 BHK · Type 1',rect(145,178,244,250)),('10','2 BHK · Type 1',rect(72,178,145,264))]
configs=[('castle',0,castle,0,'03'),('vista',2,vista,-17,'01'),('mist',4,mist,-10,'02'),('spring',6,spring,-8,'02'),('meadows',8,vista,-17,'01'),('heaven',9,castle,0,'03'),('breeze-low',10,low,0,'08'),('breeze-high',11,high,-7,'08')]
def contours(mask):
 cs,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 return [cv2.approxPolyDP(c,1.4,True).reshape(-1,2).tolist() for c in cs if cv2.contourArea(c)>200]
def walls(mask):
 cs,hi=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 out=[]
 if hi is None:return out
 for i,c in enumerate(cs):
  if hi[0,i,3]!=-1 or cv2.contourArea(c)<25:continue
  holes=[];child=hi[0,i,2]
  while child!=-1:
   if cv2.contourArea(cs[child])>12:holes.append(cv2.approxPolyDP(cs[child],1.1,True).reshape(-1,2).tolist())
   child=hi[0,child,0]
  out.append(dict(outer=cv2.approxPolyDP(c,1.1,True).reshape(-1,2).tolist(),holes=holes))
 return out
for key,index,areas,shift,refuge in configs:
 page=doc[index]
 for half,kind in [(0,'typical'),(1,'refuge')]:
  name=key+'-'+kind; data=json.loads((root/(name+'.json')).read_text())
  # Reproduce the exact floor-image coordinate system used by the cutaway exporter.
  infos=[a for a in page.get_image_info() if a['width']>300 and a['height']>200 and (a['bbox'][0]<953)==(half==0)]
  bounds=fitz.Rect()
  for info in infos:bounds|=fitz.Rect(info['bbox'])
  if key=='breeze-low':bounds=fitz.Rect(202+half*936,125,760+half*936,638)
  bounds=fitz.Rect(bounds.x0-4,bounds.y0-4,bounds.x1+4,bounds.y1+4)
  scale=1800/max(bounds.width,bounds.height)
  ox=int(np.floor(bounds.x0*scale));oy=int(np.floor(bounds.y0*scale))
  def to_pixel(point):return [round((14+half*936+point[0]*936/600)*scale-ox),round((18+point[1]*647/408)*scale-oy)]
  img=cv2.imread(str(root/(name+'-floor.png')),cv2.IMREAD_UNCHANGED)
  h,w=img.shape[:2];wallmask=np.zeros((h,w),np.uint8)
  for wall in data['walls']:
   cv2.fillPoly(wallmask,[np.array(wall['outer'])],255)
   for hole in wall['holes']:cv2.fillPoly(wallmask,[np.array(hole)],0)
  units=[]
  for number,bhk,points in areas:
   if half and number==refuge:continue
   poly=[to_pixel([x+(shift if half else 0),y]) for x,y in points]
   mask=np.zeros((h,w),np.uint8);cv2.fillPoly(mask,[np.array(poly)],255)
   mask=cv2.bitwise_and(mask,img[:,:,3])
   outline=contours(mask)
   if not outline:raise ValueError((name,number))
   unitkey=name+'-unit-'+number
   rgba=img.copy();rgba[:,:,3]=mask
   x,y,bw,bh=cv2.boundingRect(cv2.findNonZero(mask))
   # Keep full floor coordinates for 3D consistency. Crop only the 2D apartment image.
   cv2.imwrite(str(root/(unitkey+'-floor.png')),rgba)
   cv2.imwrite(str(root/(unitkey+'-2d.png')),rgba[max(0,y-12):min(h,y+bh+12),max(0,x-12):min(w,x+bw+12)])
   payload=dict(data,walls=walls(cv2.bitwise_and(wallmask,mask)),footprint=outline)
   (root/(unitkey+'.json')).write_text(json.dumps(payload,separators=(',',':')))
   # Room descriptions and dimensions come from PDF text inside this apartment.
   texts=[];bed_labels=[]
   for block in page.get_text('dict',flags=fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES)['blocks']:
    for line in block.get('lines',[]):
     for span in line['spans']:
      b=span['bbox'];px=int((b[0]+b[2])/2*scale-ox);py=int((b[1]+b[3])/2*scale-oy)
      if 0<=px<w and 0<=py<h and mask[py,px] and span['text'].strip():
       texts.append(span['text'].strip())
       if re.search(r'BED\s*ROOM',span['text'],re.I):bed_labels.append([px,py])
   wood=((img[:,:,2].astype(float)>img[:,:,1]*1.08)&(img[:,:,1]>65)&(img[:,:,1]<200)&(img[:,:,0]<190)&(mask>0)).astype(np.uint8)*255
   wood=cv2.morphologyEx(wood,cv2.MORPH_CLOSE,np.ones((19,19),np.uint8))
   furniture=[]
   for contour in cv2.findContours(wood,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
    rx,ry,rw,rh=cv2.boundingRect(contour)
    if rw<65 or rh<65:continue
    if not any(rx-15<=bx<=rx+rw+15 and ry-15<=by<=ry+rh+15 for bx,by in bed_labels):continue
    furniture.append(dict(kind='bed',x=rx+rw*.5,y=ry+rh*.5,width=rw*.52,depth=rh*.62))
   payload['furniture']=furniture
   (root/(unitkey+'.json')).write_text(json.dumps(payload,separators=(',',':')))
   units.append(dict(id=number,type=bhk,key=unitkey,polygons=outline,center=[x+bw/2,y+bh/2],rooms=texts))
  manifest=dict(width=w,height=h,units=sorted(units,key=lambda u:u['id']),page=index+1,kind=kind)
  (root/(name+'-units.json')).write_text(json.dumps(manifest,separators=(',',':')))
  print(name,len(units))
