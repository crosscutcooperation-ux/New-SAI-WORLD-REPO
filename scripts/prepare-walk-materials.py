from pathlib import Path
from PIL import Image, ImageDraw
import random
out=Path(__file__).resolve().parents[1]/'dist'/'assets'
size=1024
im=Image.new('RGB',(size,size),(57,138,187));d=ImageDraw.Draw(im)
for y in range(-128,size+128,128):
    for x in range(-128,size+128,128):
        for dx,dy in [(0,0),(64,64)]:
            d.ellipse((x+dx-90,y+dy-90,x+dx+90,y+dy+90),outline=(185,225,240),width=3)
im.resize((512,512),Image.Resampling.LANCZOS).save(out/'pool-pattern.jpg',quality=96)
random.seed(11);im=Image.new('RGB',(512,512));d=ImageDraw.Draw(im)
for y in range(512):
    n=random.randrange(-9,10);d.line((0,y,512,y),fill=(155+n,111+n,75+n//2))
for x in range(0,512,64):
    d.line((x,0,x,512),fill=(95,72,47),width=2)
    for y in range((x//64%2)*128,512,256):d.line((x,y,x+64,y),fill=(110,79,50),width=2)
im.save(out/'wood-deck.jpg',quality=94)
print('Pool mosaic and deck material maps prepared.')
