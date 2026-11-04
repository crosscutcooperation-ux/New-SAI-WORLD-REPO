"""Resolve the unfurnished floor-plate crops using their matching published wall outlines."""
import json,cv2,numpy as np,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
plans=root/'dist/assets/plans';work=Path(tempfile.gettempdir())/'swd-interiors'
audit=json.loads((root/'deliverables/unit-registration.json').read_text())
jobs={j['key']:j for j in json.loads((work/'jobs.json').read_text())}
def wallmask(img):
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    m=((hsv[:,:,1]<48)&(hsv[:,:,2]>42)&(hsv[:,:,2]<165)).astype('uint8')*255
    return cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
for row in audit:
    if len(row)==4:continue
    k=row[0];name,num=k.rsplit('-unit-',1);manifest=plans/(name+'-units.json')
    d=json.loads(manifest.read_text());u=next(a for a in d['units'] if a['id']==num)
    key=('p13-01' if num=='10' else 'p13-09') if name.startswith('breeze') else ('p2-06' if num=='03' else 'p4-02')
    j=jobs[key];src=wallmask(cv2.imread(str(work/(key+'.png'))))
    mask=wallmask(cv2.imread(str(plans/(name+'-floor.png'))))
    old=np.vstack(u['polygons']) if len(u['polygons'])==1 else np.concatenate([np.array(q) for q in u['polygons']])
    bx,by,bw,bh=cv2.boundingRect(old);cx,cy=bx+bw/2,by+bh/2
    # These seven floor drawings have the same room adjacency as the labelled
    # unit sheet when reflected vertically (verified from kitchen / entry / bathroom).
    best=None
    for flip in [1,0,-1,2]:
        f=cv2.flip(src,flip) if flip!=2 else src
        for scale in np.linspace(.85,1.17,23)*max(bw/src.shape[1],bh/src.shape[0]):
            reduced=cv2.resize(f,None,fx=scale*.5,fy=scale*.5)
            target=cv2.resize(mask,None,fx=.5,fy=.5)
            h,w=reduced.shape;pad=40
            left=max(0,int(cx*.5-w*.5-pad));top=max(0,int(cy*.5-h*.5-pad))
            region=target[top:int(cy*.5+h*.5+pad),left:int(cx*.5+w*.5+pad)]
            if region.shape[0]<h or region.shape[1]<w:continue
            _,score,_,loc=cv2.minMaxLoc(cv2.matchTemplate(region,reduced,cv2.TM_CCORR_NORMED))
            if best is None or score>best[0]:
                dx= -1 if flip in (1,-1) else 1;dy= -1 if flip in (0,-1) else 1
                best=(score,np.array([[dx*scale,0,(loc[0]+left)*2+(src.shape[1]-1)*scale*(dx<0)],[0,dy*scale,(loc[1]+top)*2+(src.shape[0]-1)*scale*(dy<0)]]))
    score,m=best
    if score<.30:print(k,'unresolved',score);continue
    contour=np.array(j['outline'])@m[:,:2].T+m[:,2]
    u['polygons']=[np.rint(contour).astype(int).tolist()];u['center']=contour.mean(axis=0).tolist()
    u.update(sheet='unit-sheets/'+key,sheetTransform=m.tolist(),sourceUnit=key.split('-')[1],sourcePage=int(key.split('-')[0][1:]))
    row[:]=[k,u['sheet'],'walls',round(score,3)];manifest.write_text(json.dumps(d,separators=(',',':')))
    print(k,key,round(score,3))
(root/'deliverables/unit-registration.json').write_text(json.dumps(audit))
