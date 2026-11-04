from pathlib import Path
import cv2,numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'dist'/'assets'
for name in ['center','left','right']:
    rgb=np.asarray(Image.open(out/f'facade-{name}.jpg').convert('RGB'))
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
    mask=((hsv[:,:,0]>73)&(hsv[:,:,0]<125)&(hsv[:,:,1]>16)&(rgb[:,:,2].astype(float)>rgb[:,:,0]*.94)).astype('float32')
    mask=cv2.GaussianBlur(mask,(3,3),.6)
    Image.fromarray((235-mask*200).astype('uint8')).save(out/f'facade-{name}-roughness.jpg',quality=94)
    Image.fromarray((mask*155).astype('uint8')).save(out/f'facade-{name}-metalness.jpg',quality=94)
    Image.fromarray((mask*255).astype('uint8')).save(out/f'facade-{name}-glass.jpg',quality=94)
src=cv2.imread(r'C:\Users\ajitg\Downloads\01 Road Side day View.tif')
points=np.float32([[1184,2246],[1467,2200],[1467,2456],[1184,2506]])*(src.shape[1]/5000)
target=np.float32([[0,0],[511,0],[511,439],[0,439]])
relief=cv2.warpPerspective(src,cv2.getPerspectiveTransform(points,target),(512,440))
cv2.imwrite(str(out/'plaza-relief.jpg'),relief,[cv2.IMWRITE_JPEG_QUALITY,96])
shop=cv2.imread(str(out.parents[2]/'reference-previews'/'33 Shop Closeup view.jpg'))
for name,corners in [
    ('shop-display',[(737,216),(794,203),(794,313),(737,308)]),
    ('shop-upper',[(735,64),(794,28),(794,128),(735,154)]),
]:
    transform=cv2.getPerspectiveTransform(np.float32(corners)*shop.shape[1]/1000,np.float32([[0,0],[127,0],[127,191],[0,191]]))
    cv2.imwrite(str(out/(name+'.jpg')),cv2.warpPerspective(shop,transform,(128,192)))
print('Window-specific PBR maps and source relief prepared.')

# Rectify only the middle frontage. Crop individual architectural bands so each
# maps to its own recessed wall or projecting sign face in the 3D model.
corners=np.float32([(934,102),(1231,59),(1231,230),(934,296)])*2+np.float32([702,1720])
middle=cv2.warpPerspective(src,cv2.getPerspectiveTransform(corners,np.float32([[0,0],[899,0],[899,359],[0,359]])),(900,360))
for name,(x0,y0,x1,y1) in {
    'clerestory':(3,12,896,80),'posters-west':(2,98,298,210),
    'posters-east':(620,98,898,210),'arcade-glass':(2,231,296,267)
}.items():
    cv2.imwrite(str(out/(name+'.jpg')),middle[y0:y1,x0:x1],[cv2.IMWRITE_JPEG_QUALITY,95])

# Align the photographed facade strips to the brochure's 35 residential levels.
for key in ['center','left','right']:
    for suffix in ['', '-roughness','-metalness','-glass']:
        original=Image.open(out/('facade-'+key+suffix+'.jpg'))
        width,height=original.size
        result=Image.new(original.mode,(width,2450))
        for row in range(35):
            source_row=min(29,int(row*30/35))
            strip=original.crop((0,round(source_row*height/30),width,round((source_row+1)*height/30)))
            result.paste(strip.resize((width,70),Image.Resampling.LANCZOS),(0,row*70))
        result.save(out/('facade-35-'+key+suffix+'.jpg'),quality=95)
