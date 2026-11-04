"""Locate repeated appliance and sanitary symbols on the architect's plan sheets."""
from pathlib import Path
import json
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
sources = root.parent / 'source-assets/unit-render-inputs'
base = json.loads((sources / 'jobs.json').read_text())
jobs = json.loads((sources / 'registered.json').read_text())
source = cv2.imread(str(sources / 'p8-02.png'), 0)
templates = {
    'hob': source[290:318, 437:460],
    'sink': source[213:241, 437:459],
    'toilet': source[139:164, 328:355],
}
canonical = {}
for job in base:
    image = cv2.imread(str(sources / (job['key'] + '.png')), 0)
    parts = []
    for kind, symbol in templates.items():
        regions = [r[1:] for r in job['items'] if r[0] == ('w' if kind == 'toilet' else 'k')]
        candidates = []
        for rotation in range(4):
            for factor in (.75, .875, 1, 1.125, 1.25, 1.5, 1.75, 2):
                template = cv2.resize(np.rot90(symbol, rotation).copy(), None, fx=factor, fy=factor)
                height, width = template.shape
                scores = cv2.matchTemplate(image, template, cv2.TM_CCOEFF_NORMED)
                allowed = np.zeros_like(scores, np.uint8)
                for x, y, w, h in regions:
                    allowed[max(0,y-25):min(scores.shape[0],y+h+25),max(0,x-25):min(scores.shape[1],x+w+25)] = 1
                scores[allowed == 0] = -1
                for _ in range(len(regions)):
                    _, score, _, (x,y) = cv2.minMaxLoc(scores)
                    if score < {'hob':.70, 'sink':.74, 'toilet':.85}[kind]:
                        break
                    candidates.append((score, [kind,x,y,width,height]))
                    scores[max(0,y-height):y+height,max(0,x-width):x+width] = -1
        accepted = []
        for confidence, part in sorted(candidates, reverse=True):
            _,x,y,w,h = part
            if any(np.hypot(x+w/2-a[1]-a[3]/2,y+h/2-a[2]-a[4]/2)<max(w,h)*1.2 for a in accepted):
                continue
            accepted.append(part)
            if kind != 'toilet':
                break
        parts += accepted
    canonical[job['key']] = parts
    print(job['key'], len(parts), 'traced fittings', flush=True)

variants = {}
for job in jobs:
    original = next(row for row in base if row['key'] == job['template'])
    W,H = original['width'], original['height']
    basis = np.array(job['basis'])
    offset = (np.array([[0,0],[W,0],[W,H],[0,H]]) @ basis.T).min(0)
    parts = []
    for kind,x,y,w,h in canonical[job['template']]:
        points = np.array([[x,y],[x+w,y+h]]) @ basis.T-offset
        lo = points.min(0); extent = points.max(0)-lo
        if kind == 'toilet' and any(item[0]=='wc' and np.linalg.norm(lo+extent/2-np.array(item[1:3])-np.array(item[3:])/2)<35 for item in job['items']):
            continue
        parts.append([kind,*lo.tolist(),*extent.tolist()])
    variants[job['key']] = parts
(sources / 'traced-fixtures.json').write_text(json.dumps(variants, indent=2))
