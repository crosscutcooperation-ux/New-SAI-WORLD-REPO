"""Resolve repeated sanitary symbols and source labels in unit-sheet coordinates."""
from pathlib import Path
import json,re,runpy,tempfile
import cv2,numpy as np,pymupdf as fitz
work=Path(tempfile.gettempdir())/'swd-interiors';plans=Path(__file__).resolve().parents[1]/'dist/assets/plans'
base={j['key']:j for j in json.loads((work/'jobs.json').read_text())}
source=runpy.run_path(str(Path(__file__).with_name('register-unit-sheets.py')))
doc=source['doc'];catalog=source['catalog'];rows={}
castle=cv2.imread(str(work/'p2-06.png'),0)
symbols=[('wc',castle[400:431,404:443]),('basin',castle[353:377,430:449])]
for page,num,_,box,_ in catalog:
    key=f'p{page}-{num:02}';j=base[key];gray=cv2.imread(str(work/(key+'.png')),0);hits=[]
    img=doc[page-1];clip=fitz.Rect(*(v*2 for v in box))
    lines=[]
    for block in img.get_text('dict',clip=clip,flags=fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES)['blocks']:
        for line in block.get('lines',[]):
            label=' '.join(s['text'] for s in line['spans']).strip()
            if not re.search(r'BED\s*ROOM|KITCHEN|LIVING|DINING|TOILET|BALCONY|KIDS',label,re.I):continue
            x,y,r,b=line['bbox'];lines.append([label,((x+r)/2-clip.x0)*1.5,((y+b)/2-clip.y0)*1.5])
    for kind,symbol in symbols:
        for rot in range(4):
            for scale in (.7,.85,1,1.18,1.34):
                tpl=cv2.resize(np.rot90(symbol,rot).copy(),None,fx=scale,fy=scale)
                h,w=tpl.shape;res=cv2.matchTemplate(gray,tpl,cv2.TM_CCOEFF_NORMED)
                for _ in range(4):
                    _,confidence,_,(x,y)=cv2.minMaxLoc(res)
                    if confidence<.70:break
                    hits.append((confidence,kind,x,y,w,h));res[max(0,y-h):y+h,max(0,x-w):x+w]=0
    parts=[]
    # A round white symbol can also be a lamp or a plate. Accept only strong
    # fixture matches beside the bathroom traces, outside every furnished bay.
    wet=[(x+w/2,y+h/2) for kind,x,y,w,h in j['items'] if kind=='w']
    furniture=[(x-4,y-4,x+w+4,y+h+4) for kind,x,y,w,h in j['items'] if kind!='w']
    claimed=set()
    for score,kind,x,y,w,h in sorted(hits,reverse=True):
        cx,cy=x+w/2,y+h/2
        if score<.89 or any(l<cx<r and t<cy<b for l,t,r,b in furniture):continue
        nearest=min(range(len(wet)),key=lambda n:np.hypot(cx-wet[n][0],cy-wet[n][1]))
        if np.hypot(cx-wet[nearest][0],cy-wet[nearest][1])>32:continue
        if (nearest,kind) in claimed:continue
        if any(np.hypot(cx-a-c/2,cy-b-d/2)<26 for _,a,b,c,d in parts):continue
        claimed.add((nearest,kind));parts.append([kind,x,y,w,h])
    if key=='p2-06':
        parts=[['wc',404,399,39,28],['wc',514,379,28,42],['basin',428,352,21,28],['basin',465,368,23,28],
               ['coffee',208,153,41,53],['door',347,435,4,53],['door',368,229,4,51],['rail',589,26,151,3],['rail',738,26,3,82]]
    rows[key]=(parts,lines)
    # Render the original material artwork without the PDF text; add legible
    # upright room labels after orienting it to the selected unit.
    clean=fitz.open();clean.insert_pdf(doc,from_page=page-1,to_page=page-1);cp=clean[0]
    cp.add_redact_annot(clip,fill=False);cp.apply_redactions(images=0,graphics=0,text=0)
    pix=cp.get_pixmap(matrix=fitz.Matrix(1.5,1.5),clip=clip)
    color=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)[:,:,::-1]
    cv2.imwrite(str(work/(key+'-finish.png')),color)
jobs=json.loads((work/'registered.json').read_text())
for j in jobs:
    key=j['template'];W,H=base[key]['width'],base[key]['height'];a=np.array(j['basis'])
    lo=(np.array([[0,0],[W,0],[W,H],[0,H]])@a.T).min(0)
    parts,labels=rows[key]
    for kind,x,y,w,h in parts:
        pts=np.array([[x,y],[x+w,y+h]])@a.T-lo
        j['items'].append([kind,*pts.min(0).tolist(),*(pts.max(0)-pts.min(0)).tolist()])
    im=cv2.imread(str(work/(key+'-finish.png')))
    im=cv2.warpAffine(im,np.column_stack((a,-lo)).astype(float),(j['width'],j['height']),borderValue=(255,255,255))
    for label,x,y in labels:
        pos=np.array([x,y])@a.T-lo
        font=cv2.FONT_HERSHEY_SIMPLEX;size=cv2.getTextSize(label,font,.32,1)[0]
        cv2.putText(im,label,(round(pos[0]-size[0]/2),round(pos[1])),font,.32,(55,53,49),1,cv2.LINE_AA)
    cv2.imwrite(str(work/(j['key']+'.png')),im)
(work/'registered.json').write_text(json.dumps(jobs))
