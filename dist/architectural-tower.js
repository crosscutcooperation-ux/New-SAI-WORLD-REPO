import * as T from './vendor/three.module.js';

const cube=new T.BoxGeometry(1,1,1);
export function createArchitecturalTower(cfg,m,textureMaps={}){
  const g=new T.Group();g.position.set(cfg.x,1.1,cfg.z);g.rotation.y=cfg.rotation;
  g.name=`Residential tower ${cfg.id} — textured architectural exterior`;
  g.userData={towerId:cfg.id,conceptual:true,levelCountUnverified:true};
  function block(w,h,d,x,y,z,material,name=''){const mesh=new T.Mesh(cube,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;g.add(mesh);return mesh;}
  function cyl(rt,rb,h,x,y,z,material,segments=32){const a=new T.Mesh(new T.CylinderGeometry(rt,rb,h,segments),material);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
  function many(items,material,name){const mesh=new T.InstancedMesh(cube,material,items.length);const o=new T.Object3D();items.forEach((a,i)=>{o.position.set(a[0],a[1],a[2]);o.scale.set(a[3],a[4],a[5]);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;g.add(mesh);}
  function facade(key){return textureMaps[key]?new T.MeshStandardMaterial({map:textureMaps[key],color:0xffffff,roughness:.86,metalness:0,envMapIntensity:.32}):m.stone;}
  const center=facade('center'),left=facade('left'),right=facade('right');
  const body=(front,side)=>[side,side,m.trim,m.stone,front,front];
  block(38.2,1.2,24,0,.6,0,m.trim,'Stone foundation');
  // The facade images are UV materials on six-sided solid tower geometry.
  // Forward and rear faces, recessed wings and projecting balconies remain
  // separate mesh surfaces and continue to work from every camera angle.
  block(14.8,94.5,22,0,51.4,1,body(center,left),'Central projecting volume');
  block(10.8,93.5,19.8,-12.8,50.9,-.4,body(left,left),'West recessed wing');
  block(10.8,93.5,19.8,12.8,50.9,-.4,body(right,right),'East recessed wing');
  const slabs=[],railPosts=[],handrails=[],cornices=[],pilasters=[];
  for(let f=0;f<31;f++){
    const y=4.8+f*3.05;
    for(const side of [-1,1])for(const x of [-3.7,3.7]){
      const z=side>0?12.65:-10.65;
      slabs.push([x,y,z,6.05,.17,1.45]);
      handrails.push([x,y+.87,z+side*.62,5.95,.055,.06]);
      handrails.push([x,y+.12,z+side*.62,5.95,.045,.05]);
      for(let j=0;j<14;j++)railPosts.push([x-2.81+j*.43,y+.49,z+side*.62,.033,.79,.04]);
    }
  }
  for(const y of [3.8,34.5,65,98.5])cornices.push([0,y,.5,37.6,.24,22.7]);
  for(const x of [-18.1,18.1])for(const z of [-10.2,9.9])pilasters.push([x,51,z,.47,96,.65]);
  for(const x of [-7.4,7.4])for(const z of [-10.15,12.15])pilasters.push([x,51.6,z,.82,95,.48]);
  many(slabs,m.trim,'Three-dimensional balcony floor slabs');many(railPosts,m.dark,'Fine ornamental balcony balusters');many(handrails,m.brass,'Metal balcony handrails');many(cornices,m.trim,'Stone cornice courses');many(pilasters,m.stone,'Facade piers');
  // Roof silhouettes, mouldings, pediment and tiered green cupola.
  for(const x of [-12.8,12.8]){block(11.5,.5,21,x,98.2,-.4,m.trim);block(11.3,.35,20.7,x,98.9,-.4,m.trim);}
  block(16.3,.55,24,0,99.1,1,m.trim);block(15.8,.32,23.6,0,99.9,1,m.trim);
  block(12,2.8,9.5,0,101.1,-1,m.stone);block(12.6,.4,10.2,0,102.7,-1,m.trim);
  const triangle=new T.Shape();triangle.moveTo(-7.6,0);triangle.lineTo(0,5.3);triangle.lineTo(7.6,0);triangle.closePath();
  for(const z of [12.2,-10.7]){const p=new T.Mesh(new T.ExtrudeGeometry(triangle,{depth:.55,bevelEnabled:true,bevelSize:.08,bevelThickness:.1,bevelSegments:1}),m.stone);p.position.set(0,99.6,z);g.add(p);const ring=new T.Mesh(new T.TorusGeometry(1.03,.14,8,32),m.trim);ring.position.set(0,102.2,z+.59);g.add(ring);}
  const domeMat=new T.MeshStandardMaterial({color:0x849c72,roughness:.73,metalness:.08});
  cyl(3.8,3.8,.4,0,104,-1,m.trim);cyl(3.45,3.45,2.6,0,105.5,-1,domeMat);
  const profile=[[0,0],[3.72,0],[3.74,.35],[3.55,1.3],[2.85,2.5],[1.8,3.2],[.5,3.8],[0,4.1]].map(p=>new T.Vector2(...p));
  const dome=new T.Mesh(new T.LatheGeometry(profile,48),domeMat);dome.position.set(0,106.7,-1);dome.castShadow=true;g.add(dome);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=Math.sin(a)*3.48,z=Math.cos(a)*3.48-1;
    const recess=new T.Mesh(new T.PlaneGeometry(.58,1.25),m.dark);recess.position.set(x,105.5,z);recess.rotation.y=a;g.add(recess);
    const arch=new T.Mesh(new T.TorusGeometry(.35,.07,6,16,Math.PI),m.trim);arch.position.set(x,106.15,z);arch.rotation.y=a;g.add(arch);
  }
  cyl(1.3,1.7,.45,0,111.1,-1,m.trim);cyl(1.07,1.2,1.5,0,112,-1,domeMat);
  const small=new T.Mesh(new T.SphereGeometry(1.15,24,12,0,Math.PI*2,0,Math.PI/2),domeMat);small.position.set(0,112.8,-1);small.scale.y=1.25;g.add(small);
  cyl(.13,.18,1.7,0,114.7,-1,m.brass,12);
  for(const x of [-18,18])for(const z of [-10,10]){cyl(.12,.35,2,x,99.8,z,m.trim,8);}
  return g;
}
