"""Register furnished unit sheets against the floor plate before rendering paired views.
Coordinates below are in the half-scale PDF proofs. Objects are traced on the unit sheet.
"""
from pathlib import Path
import json,cv2,numpy as np,pymupdf as fitz
root=Path(__file__).resolve().parents[1]
assets=root/'dist/assets/plans'
doc=fitz.open(root.parent/'plan-references/plans.pdf')
# Sheet, unit number, printed type, crop, furniture rectangles (x,y,width,height).
catalog=[
(2,6,'2 BHK',(29,102,280,269),'b:174,131,33,36 235,155,32,37;s:84,135,18,50 94,134,23,13;t:89,214,34,25;k:38,164,13,53;w:153,219,11,23 200,220,11,18'),
(2,4,'3 BHK',(301,72,456,305),'b:366,107,29,30 404,213,30,28 393,264,29,32;s:381,146,38,27;t:319,159,32,22;k:307,197,12,52;w:351,245,11,16 352,266,12,17'),
(2,7,'2 BHK',(561,88,854,280),'b:582,144,35,45 647,121,37,47;s:744,150,44,16 774,162,15,43;t:722,231,29,33;k:828,189,16,51;w:635,224,15,18 683,219,14,18'),
(4,2,'1 BHK',(104,72,376,278),'b:309,119,48,50;s:116,150,55,19 116,165,19,43;t:157,231,38,39;k:246,108,22,67;w:215,218,17,29'),
(4,10,'2 BHK',(525,61,681,298),'b:553,196,36,37 568,252,35,34;s:575,116,18,42 586,116,33,13;t:640,145,26,23;k:602,69,48,15;w:644,186,13,22 635,224,12,19'),
(4,4,'2.5 BHK',(731,65,873,298),'b:822,78,28,31 822,138,27,28 741,159,36,19;s:790,215,35,15 815,204,15,33;t:744,202,30,23;k:760,274,52,15;w:774,79,13,20 761,112,12,20'),
(6,2,'3 BHK',(160,67,325,300),'b:208,88,27,32 201,131,33,30 226,257,30,31;s:212,209,35,17 211,225,14,14;t:287,180,27,24;k:302,124,16,45;w:266,112,13,19 265,146,13,20'),
(6,4,'3 BHK',(498,96,749,276),'b:510,166,36,37 649,133,31,43 707,146,32,37;s:571,148,20,48 580,146,35,14;t:597,228,25,32;k:636,237,47,15;w:678,209,15,19 516,218,11,19'),
(6,6,'3 BHK',(787,61,916,296),'b:846,71,31,30 853,162,30,27 853,232,28,30;s:849,123,34,16;t:797,139,22,27;k:795,193,16,31;w:875,247,13,20 812,80,13,19'),
(8,2,'3 BHK',(163,66,326,297),'b:211,77,28,29 207,133,30,34 227,258,29,27;s:212,209,36,19;t:288,184,24,25;k:302,139,15,39;w:265,98,12,21 264,144,12,20'),
(8,8,'3 BHK',(499,89,755,270),'b:509,180,32,39 568,187,31,38 713,159,30,38;s:649,180,35,19 669,194,14,29;t:631,98,25,35;k:563,99,49,19;w:524,129,14,19 564,129,12,20'),
(8,6,'3 BHK',(787,62,916,296),'b:846,70,30,30 855,163,30,27 853,237,29,28;s:850,123,35,18;t:797,137,22,27;k:796,190,16,35;w:812,80,13,19 878,247,11,20'),
(13,9,'1 BHK',(22,55,221,205),'b:175,137,34,42;s:33,110,14,38 35,135,39,15;t:68,73,28,23;k:131,138,15,47;w:113,86,13,18'),
(13,7,'1 BHK',(217,160,332,321),'b:280,275,28,32;s:259,211,32,13 280,221,12,25;t:227,235,22,25;k:249,169,41,13;w:238,286,14,18'),
(13,1,'2 BHK',(316,54,462,206),'b:354,64,27,28 336,113,34,29;s:348,175,34,16;t:399,153,22,26;k:444,140,12,39;w:397,81,14,17 400,123,14,19'),
(13,5,'2 BHK',(495,86,680,266),'b:610,159,28,36 601,223,29,28;s:598,94,43,15 631,104,13,26;t:552,115,21,25;k:504,133,12,35;w:555,181,13,18 559,221,14,18'),
(13,8,'3 BHK',(691,90,928,266),'b:718,225,31,30 884,218,31,35 838,102,28,22;s:740,184,55,14 740,152,13,36;t:863,149,24,39;k:729,99,62,14;w:775,229,13,17 843,221,13,17')]
groups={'castle':2,'heaven':2,'vista':4,'meadows':4,'mist':6,'spring':8,'breeze':13}
cv2.setNumThreads(3)
sift=cv2.SIFT_create(nfeatures=2500)
def features(im):
 kp,desc=sift.detectAndCompute(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),None)
 return np.float32([k.pt for k in kp]),desc
sources=[]
for page,num,bhk,box,objects in catalog:
 p=doc[page-1];pix=p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),clip=fitz.Rect(*(v*2 for v in box)))
 im=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)[:,:,::-1].copy()
 bg=np.array([216,240,255]);fg=(np.abs(im.astype(int)-bg).max(2)>45).astype('uint8')*255
 cs,_=cv2.findContours(cv2.morphologyEx(fg,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8)),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 mask=np.zeros_like(fg);cv2.drawContours(mask,[max(cs,key=cv2.contourArea)],-1,255,-1)
 for flip in [False,True]:
  sample=cv2.flip(im,1) if flip else im
  xy,desc=features(sample);sources.append((page,num,bhk,box,objects,im,mask,flip,xy,desc))
def register(target,entries,region):
 xy,d=features(target)
 if d is None:return None
 best=None
 matcher=cv2.FlannBasedMatcher(dict(algorithm=1,trees=4),dict(checks=48))
 small=cv2.resize(region,None,fx=.25,fy=.25,interpolation=cv2.INTER_NEAREST)
 for src in entries:
  matches=[a for a,b in matcher.knnMatch(src[-1],d,k=2) if a.distance<.81*b.distance and region[tuple(np.int32(xy[a.trainIdx])[::-1])]]
  origin=np.float32([src[-2][a.queryIdx] for a in matches])
  dest=np.float32([xy[a.trainIdx] for a in matches])
  for _ in range(4):
   if len(origin)<6:break
   mat,inlier=cv2.estimateAffinePartial2D(origin,dest,ransacReprojThreshold=3)
   if mat is None:break
   ok=inlier.ravel().astype(bool);score=int(ok.sum())
   origin=origin[~ok];dest=dest[~ok]
   if score<7:break
   if src[7]:mat=mat@np.array([[-1,0,src[5].shape[1]-1],[0,1,0],[0,0,1]])
   projected=cv2.warpAffine(src[6],mat*.25,(small.shape[1],small.shape[0]),flags=cv2.INTER_NEAREST)
   intersection=np.count_nonzero(projected&small)
   coverage=intersection/max(1,np.count_nonzero(small))
   precision=intersection/max(1,np.count_nonzero(projected))
   if coverage<.52 or precision<.62:continue
   rank=score*coverage*precision
   if best is None or rank>best[0]:best=rank,score,mat,src
 return best[1:] if best else None
def process():
 audit=[]
 for path in sorted(assets.glob('*-units.json')):
  manifest=json.loads(path.read_text());name=path.name.split('-units')[0];group=groups[name.split('-')[0]]
  floor=cv2.imread(str(assets/(name+'-floor.png')),-1);h,w=floor.shape[:2]
  for u in manifest['units']:
   old=np.vstack([np.array(poly) for poly in u['polygons']]);x,y,bw,bh=cv2.boundingRect(old);pad=65
   x=max(0,x-pad);y=max(0,y-pad);target=floor[y:min(h,y+bh+pad*2),x:min(w,x+bw+pad*2),:3]
   prev=np.zeros((h,w),np.uint8);cv2.fillPoly(prev,[np.array(q) for q in u['polygons']],255)
   expected='3 BHK' if u['type']=='2 BHK + kids room' else u['type'].split(' · ')[0]
   result=register(target,[s for s in sources if s[0]==group and s[2]==expected],prev[y:y+target.shape[0],x:x+target.shape[1]])
   if not result or result[0]<8:
    audit.append((u['key'],'unmatched'));continue
   score,m,src=result;page,num,bhk,box,objects,im,mask,flip,_,_=src
   m[:,2]+=[x,y]
   u['sheetTransform']=m.round(6).tolist()
   aligned=cv2.warpAffine(mask,m,(w,h),flags=cv2.INTER_NEAREST)
   prev=np.zeros_like(aligned);cv2.fillPoly(prev,[np.array(q) for q in u['polygons']],255)
   overlap=np.count_nonzero(aligned&prev)/max(1,np.count_nonzero(aligned))
   if overlap<.66:audit.append((u['key'],'overlap',round(overlap,2)));continue
   cs,_=cv2.findContours(aligned,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
   poly=cv2.approxPolyDP(max(cs,key=cv2.contourArea),1.4,True).reshape(-1,2)
   u['polygons']=[poly.tolist()]
   if u['type'].split(' · ')[0]!=bhk:u['type']=bhk
   # Use the labelled official sheet in its native orientation for the apartment pair.
   u['sheet']=f'unit-sheets/p{page}-{num:02}';u['sourceUnit']=f'{num:02}';u['sourcePage']=page
   audit.append((u['key'],u['sheet'],score,round(overlap,2)))
  path.write_text(json.dumps(manifest,separators=(',',':')))
 (root/'deliverables/unit-registration.json').write_text(json.dumps(audit))
 print('registered',sum(len(row)==4 and isinstance(row[2],int) for row in audit),'of',len(audit),flush=True)
if __name__=='__main__':process()
