import * as T from './vendor/three.module.js';
import {createSteppedTowerBody} from './stepped-tower.js?v=master-layout-7';

const cube=new T.BoxGeometry(1,1,1);
export function createArchitecturalTower(cfg,m,textureMaps={}){
  const g=new T.Group();g.position.set(cfg.x,1.1,cfg.z);g.rotation.y=cfg.rotation;
  g.name=`Residential tower ${cfg.id} — textured architectural exterior`;
  function block(w,h,d,x,y,z,material,name=''){const mesh=new T.Mesh(cube,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;g.add(mesh);return mesh;}
  function cyl(rt,rb,h,x,y,z,material,segments=32,parent=g){const a=new T.Mesh(new T.CylinderGeometry(rt,rb,h,segments),material);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
  const body=createSteppedTowerBody(cfg,m,textureMaps);g.add(body);
  const sideWing=Math.abs(cfg.rotation)>1;
  g.scale.x=(cfg.mirror?-1:1)*(sideWing?cfg.depth:cfg.width)/37;
  g.scale.z=(sideWing?cfg.width:cfg.depth)/body.userData.depth;
  g.userData={towerId:cfg.id,name:cfg.name,floors:35,sourcePage:body.userData.sourcePage,masterLayoutOnly:body.userData.masterLayoutOnly};
  const depth=body.userData.depth,roofOffset=body.userData.forward-4,roofStart=g.children.length;
  // Roof silhouettes, mouldings, pediment and tiered green cupola.
  block(16.3,.55,11,0,99.1,-1,m.trim);block(15.8,.32,10.4,0,99.9,-1,m.trim);
  block(12,2.8,9.5,0,101.1,-1,m.stone);block(12.6,.4,10.2,0,102.7,-1,m.trim);
  const triangle=new T.Shape();triangle.moveTo(-7.6,0);triangle.lineTo(0,5.3);triangle.lineTo(7.6,0);triangle.closePath();
  const opening=new T.Path();opening.absellipse(0,2.05,1.04,1.28,0,2*Math.PI,true);triangle.holes.push(opening);
  for(const z of [3.6]){const p=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:.55,bevelEnabled:true,bevelSize:.08,bevelThickness:.1,bevelSegments:1}),m.stone);p.position.set(0,99.6,z);g.add(p);const ring=new T.Mesh(new T.TorusGeometry(1.03,.14,8,32),m.trim);ring.scale.y=1.23;ring.position.set(0,101.65,z+.59);g.add(ring);}
  // Each plan footprint is centered on its local X/Z origin. Keep the
  // cupola on that axis when the facade and front pediment step outward.
  const cupola=new T.Group();
  cupola.name='Centered rooftop cupola';
  g.add(cupola);
  const domeMat=new T.MeshStandardMaterial({color:0x849c72,roughness:.73,metalness:.08});
  const drum=(rt,rb,h,y,mat,segments=32)=>cyl(rt,rb,h,0,y,0,mat,segments,cupola);
  drum(3.65,3.85,5.4,101.2,m.stone);
  drum(3.8,3.8,.4,104,m.trim);drum(3.45,3.45,2.6,105.5,domeMat);
  const profile=[[0,0],[3.72,0],[3.74,.35],[3.55,1.3],[2.85,2.5],[1.8,3.2],[.5,3.8],[0,4.1]].map(p=>new T.Vector2(...p));
  const dome=new T.Mesh(new T.LatheGeometry(profile,48),domeMat);dome.position.y=106.7;dome.castShadow=true;cupola.add(dome);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=Math.sin(a)*3.48,z=Math.cos(a)*3.48;
    const recess=new T.Mesh(new T.PlaneGeometry(.58,1.25),m.dark);recess.position.set(x,105.5,z);recess.rotation.y=a;cupola.add(recess);
    const arch=new T.Mesh(new T.TorusGeometry(.35,.07,6,16,Math.PI),m.trim);arch.position.set(x,106.15,z);arch.rotation.y=a;cupola.add(arch);
  }
  drum(1.3,1.7,.45,111.1,m.trim);drum(1.07,1.2,1.5,112,domeMat);
  const small=new T.Mesh(new T.SphereGeometry(1.15,24,12,0,Math.PI*2,0,Math.PI/2),domeMat);small.position.y=112.8;small.scale.y=1.25;cupola.add(small);
  drum(.13,.18,1.7,114.7,m.brass,12);
  // Stone coping follows the two raking edges of the pediment.
  for(const side of [-1,1]){const rake=block(9.35,.32,.94,side*3.8,102.27,3.88,m.trim);rake.rotation.z=-side*Math.atan2(5.3,7.6);}
  const roofBase=98.55;
  for(const object of g.children.slice(roofStart)){
    if(object!==cupola)object.position.z+=roofOffset;
    object.position.y=roofBase+(object.position.y-roofBase)*.74;object.scale.y*=.74;
  }
  // Glazed arrival and paired columns sit at the forward spine of each footprint.
  const entranceZ=body.userData.forward+.25;
  block(9,3.45,.15,0,2.15,entranceZ,m.glass,'Recessed entrance glazing');
  block(11.6,.38,3.6,0,4.05,entranceZ+1.2,m.trim,'Residential drop-off canopy');
  for(const x of [-5,-4.3,4.3,5])cyl(.18,.23,3.4,x,2.25,entranceZ+2.4,m.trim,16);
  // The drop-off render shows a masonry stair spine with a continuous narrow
  // opening. Set it against the rear edge of this tower's own central bays.
  const centralPoints=body.userData.footprint.filter(([x])=>Math.abs(x)<=6.8);
  const stairFace=Math.min(...centralPoints.map(([,z])=>z))-.22;
  for(const side of [-1,1]){
    block(4.2,94.5,1.4,side*3.35,51.25,stairFace+.7,m.stone,'Stair enclosure');
    for(const x of [1.25,5.45])block(.22,94.9,.32,side*x,51.4,stairFace-.12,m.trim);
  }
  block(2.5,94.5,.16,0,51.25,stairFace+.48,m.dark,'Recessed stairwell');
  block(.07,94.5,.12,0,51.25,stairFace+.28,m.trim);
  for(let level=0;level<=35;level++){
    const y=4+2.7*level;
    block(2.52,.17,.62,0,y,stairFace+.11,m.trim);
    if(level%5===0)for(const side of [-1,1])block(4.4,.23,.52,side*3.35,y,stairFace-.06,m.trim);
  }
  // Recessed glazing, paired columns with capitals, and a projecting portico.
  block(12.1,3.6,.22,0,2.05,stairFace+.1,m.glass,'Drop-off lobby doors');
  for(const x of [-5.8,-2.9,0,2.9,5.8])block(.07,3.55,.18,x,2.05,stairFace-.08,m.brass);
  block(13.1,.45,3.9,0,4.15,stairFace-1.5,m.stone);
  block(13.4,.15,4.1,0,4.4,stairFace-1.5,m.trim);
  for(const x of [-5.75,-5.15,5.15,5.75]){
    cyl(.18,.23,3.25,x,2.05,stairFace-3,m.trim,16);
    block(.54,.23,.54,x,.52,stairFace-3,m.stone);
    block(.62,.22,.62,x,3.77,stairFace-3,m.trim);
  }
  return g;
}
