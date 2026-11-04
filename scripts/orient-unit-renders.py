"""Orient the same furnishing traces to each matched apartment on the actual floor plate."""
import json,tempfile
from pathlib import Path
import numpy as np
import cv2

root=Path(__file__).resolve().parents[1];plans=root/'dist/assets/plans';out=plans/'unit-sheets'
work=Path(tempfile.gettempdir())/'swd-interiors'
base={j['key']:j for j in json.loads((work/'jobs.json').read_text())}
audit={row[0] for row in json.loads((root/'deliverables/unit-registration.json').read_text()) if len(row)==4}
jobs={}
for manifest in sorted(plans.glob('*-units.json')):
    data=json.loads(manifest.read_text())
    floor=cv2.imread(str(plans/(manifest.name.replace('-units.json','-floor.png'))))
    for u in data['units']:
        if u['key'] not in audit:continue
        source=u['sheet'].split('/')[-1];j=base[source]
        m=np.array(u['sheetTransform']);zoom=np.linalg.norm(m[0,:2]);basis=np.rint(m[:,:2]/zoom).astype(int)
        key=source+'-u'+u['id']+'-'+''.join(str(int(i)+1) for i in basis.ravel())
        u['renderPair']='unit-sheets/'+key
        if key in jobs:continue
        W,H=j['width'],j['height']
        corners=np.array([[0,0],[W,0],[W,H],[0,H]])@basis.T
        lo=corners.min(0);w,h=corners.max(0)-lo
        def transform(poly):return (np.array(poly)@basis.T-lo).tolist()
        outline=transform(j['outline'])
        mm=np.column_stack((m[:,:2]@basis.T,m[:,2]+m[:,:2]@basis.T@lo))
        drawing=cv2.warpAffine(floor,mm,(int(w),int(h)),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_CUBIC,borderValue=(255,255,255))
        mask=np.zeros((h,w),np.uint8);cv2.fillPoly(mask,[np.array(outline)],255)
        drawing[mask==0]=255
        cv2.imwrite(str(work/(key+'.png')),drawing)
        side=j['side'];canvas=np.full((side,side,3),255,np.uint8);y=(side-h)//2;x=(side-w)//2
        canvas[y:y+h,x:x+w]=drawing;pad=int(.075*max(w,h));canvas=canvas[max(0,y-pad):min(side,y+h+pad),max(0,x-pad):min(side,x+w+pad)];cv2.imwrite(str(out/(key+'-flat.webp')),canvas,[cv2.IMWRITE_WEBP_QUALITY,96])
        items=[]
        for kind,x,y,r,b in j['items']:
            pts=np.array(transform([[x,y],[x+r,y+b]]));left,top=pts.min(0);bw,bh=pts.max(0)-pts.min(0)
            items.append([kind,int(left),int(top),int(bw),int(bh)])
        jobs[key]=dict(key=key,template=source,basis=basis.tolist(),width=int(w),height=int(h),side=side,items=items,walls=[transform(poly) for poly in j['walls']],outline=outline)
    manifest.write_text(json.dumps(data,separators=(',',':')))
(work/'registered.json').write_text(json.dumps(list(jobs.values())))
print(len(jobs),'oriented renders')
