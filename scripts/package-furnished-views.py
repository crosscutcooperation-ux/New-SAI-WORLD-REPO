"""Package native and mirrored furnished cutaways against their registered 2D plans.

Run with the registered layout JSON and a JSON mapping of sheet IDs to finished PNGs.
The "approved" entry is the labelled Castle 06 image for its native orientation.
"""
from pathlib import Path
import sys,json
import cv2
import numpy as np
from PIL import Image

assets=Path(__file__).resolve().parents[1]/'dist/assets/plans/unit-sheets'
jobs=json.loads(Path(sys.argv[1]).read_text('utf-8-sig'))
renders=json.loads(Path(sys.argv[2]).read_text('utf-8-sig'))
for job in jobs:
    key=job['key']
    original=Image.open(renders['approved' if key=='p2-06-u06-2112' else job['template']]).convert('RGB')
    matrix=job['basis']
    if matrix[0][0]==0:
        original=original.transpose(Image.Transpose.ROTATE_90)
    else:
        if matrix[0][0]<0:original=original.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if matrix[1][1]<0:original=original.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    def bounds(image):
        gray=cv2.cvtColor(np.asarray(image),cv2.COLOR_RGB2GRAY)
        return cv2.boundingRect((gray<185).astype(np.uint8))
    flat=Image.open(assets/(key+'-flat.webp')).convert('RGB')
    x,y,w,h=bounds(flat);sx,sy,sw,sh=bounds(original)
    scale=1440/max(flat.size);fit=min(w/sw,h/sh)*scale
    resized=original.resize((round(original.width*fit),round(original.height*fit)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(round(flat.width*scale),round(flat.height*scale)),'white')
    canvas.paste(resized,(round((x+w/2)*scale-(sx+sw/2)*fit),round((y+h/2)*scale-(sy+sh/2)*fit)))
    canvas.save(assets/(key+'-furnished.webp'),quality=94,method=6)
print('Packaged',len(jobs),'furnished views')
