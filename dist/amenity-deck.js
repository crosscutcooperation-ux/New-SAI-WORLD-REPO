import * as T from './vendor/three.module.js';
export function createAmenityDeck(m){
  const group=new T.Group();group.name='Walkable pool terrace and colonnade';const obstacles=[];
  const cube=new T.BoxGeometry(1,1,1),items=[];
  function box(w,h,d,x,y,z,mat,name=''){const a=new T.Mesh(cube,mat);a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=true;a.receiveShadow=true;a.name=name;group.add(a);return a;}
  function cyl(r,h,x,y,z,mat){const a=new T.Mesh(new T.CylinderGeometry(r,r,h,24),mat);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;group.add(a);return a;}
  const wood=m.wood??new T.MeshStandardMaterial({color:0x9a7351,roughness:.87});
  // The deck is a ring of strips, leaving a real opening above the basin.
  // A full slab here would occlude the water at walking height.
  for(const[w,d,x,z]of[[9.5,36,-25.25,60],[9.5,36,25.25,60],[41,15,0,49.5],[41,7,0,74.5]]){
    box(w,.55,d,x,12.48,z,m.trim,'Pool deck structure');
    const finish=wood.clone();if(finish.map){finish.map=finish.map.clone();finish.map.repeat.set(w*.8,d/3);finish.map.needsUpdate=true;}
    box(w-.05,.08,d-.05,x,12.8,z,finish,'Timber poolside promenade');
  }
  const bottom=box(39,.16,13,0,11.95,64,m.water,'Patterned pool basin');
  const surfaceMaterial=m.water.clone();surfaceMaterial.transparent=true;surfaceMaterial.opacity=.46;surfaceMaterial.depthWrite=false;surfaceMaterial.color.set(0x84c8e6);surfaceMaterial.map=null;
  const surface=box(39,.03,13,0,12.59,64,surfaceMaterial,'Pool water — tap to enter walkthrough');surface.userData.walkZone='pool';
  for(const z of [57,71])box(41,.22,.65,0,12.76,z,m.trim);for(const x of [-20.2,20.2])box(.65,.22,14.6,x,12.76,64,m.trim);
  // Low transparent edge rails leave the view open, as in the supplied renders.
  const glass=m.glass.clone();glass.transparent=true;glass.opacity=.25;glass.depthWrite=false;
  box(59,1,.08,0,13.38,77.4,glass);for(const x of [-29.4,29.4])box(.08,1,34,x,13.38,60,glass);
  const rail=new T.MeshStandardMaterial({color:0xc4b18a,metalness:.5,roughness:.35});box(59,.07,.12,0,13.9,77.4,rail);
  for(const x of [-29.4,29.4])box(.12,.07,34,x,13.9,60,rail);
  for(const[cx,cz,r]of[[0,47,8],[-24,49.8,4.5],[24,49.8,4.5]]){
    cyl(r+1,.35,cx,12.94,cz,m.path);cyl(r+1,.45,cx,16.7,cz,m.trim);cyl(r+.75,.22,cx,17.1,cz,m.stone);
    const count=cx===0?12:8;for(let i=0;i<count;i++){const a=i*Math.PI*2/count,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;cyl(.2,3.45,x,14.7,z,m.trim);obstacles.push({zone:'pool',x,z,r:.28});}
  }
  cyl(4.9,.4,0,20.2,47,m.trim);cyl(4.5,2.65,0,18.67,47,m.glass);
  for(const x of [-27.3,27.3])for(const z of [60,65,70]){
    const seat=box(1.45,.32,2.35,x,13.12,z,m.trim);const back=box(1.45,.18,1,x,13.4,z-.75,m.trim);back.rotation.x=-.35;obstacles.push({zone:'pool',x,z,w:1.65,d:2.55});
  }
  for(const x of [-15.5,15.5]){
    cyl(1.05,.13,x,13.9,46,wood);cyl(.1,1,x,13.35,46,rail);obstacles.push({zone:'pool',x,z:46,r:1.1});
    for(const dx of [-1.7,1.7]){box(.75,.2,.75,x+dx,13.3,46,m.trim);box(.75,.7,.12,x+dx,13.7,45.65,m.trim);obstacles.push({zone:'pool',x:x+dx,z:46,r:.5});}
  }
  return{group,obstacles,water:surface,basin:bottom};
}
