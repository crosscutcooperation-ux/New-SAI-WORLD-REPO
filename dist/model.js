import * as T from './vendor/three.module.js';
import {createArchitecturalTower} from './architectural-tower.js';

// A reference-led exterior study, not an architectural survey. Units are illustrative.
export const towerLayout = [
  {id:'A',x:-83,z:25,rotation:Math.PI/2},
  {id:'B',x:-83,z:-16,rotation:Math.PI/2},
  {id:'C',x:-43,z:-49,rotation:0},
  {id:'D',x:0,z:-49,rotation:0},
  {id:'E',x:43,z:-49,rotation:0},
  {id:'F',x:83,z:-16,rotation:-Math.PI/2},
  {id:'G',x:83,z:25,rotation:-Math.PI/2},
];
export const places = [
  {id:'garden',title:'Central gardens',category:'LANDSCAPE',pos:[0,2,-6],image:'garden.jpg',text:'Garden courts, palm-lined paths and seating between the residential towers. Reconstructed from the landscape renders.'},
  {id:'club',title:'The clubhouse',category:'LEISURE',pos:[0,15,57],image:'club.jpg',text:'A central clubhouse and terrace overlooking the landscaped courtyard, based on the supplied club views.'},
  {id:'pool',title:'Pool terrace',category:'WELLNESS',pos:[0,16,70],image:'pool.jpg',text:'An elevated pool and circular pavilion inspired by the pool and rooftop café references.'},
  {id:'sports',title:'Sports & movement',category:'ACTIVE LIVING',pos:[-55,14,57],image:'sports.jpg',text:'A tennis court and elevated running track, with the adjoining futsal court represented on the podium.'},
  {id:'retail',title:'The boulevard',category:'ARRIVAL',pos:[48,6,79],image:'boulevard.jpg',text:'The commercial frontage, shaded arcade and arrival road visible in the supplied roadside renders.'},
];
const palette={stone:0xc4b39a,trim:0xe8ddc7,wall:0x968778,glass:0x66828a,dark:0x435958,brass:0xa88b54,mint:0x8cae8a,grass:0x8c9d71,hedge:0x567454,path:0xd8d3c5,water:0x5dabb3,road:0xb8bcba};
const unit=new T.BoxGeometry(1,1,1), dummy=new T.Object3D();
const mat=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.79,metalness:0,...opts});
const materials=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,mat(v,k==='glass'?{metalness:.32,roughness:.27}:k==='water'?{roughness:.22,metalness:.3}:{})]));
let facadeMaps={};
export function setArchitecturalMaterials(t){
  facadeMaps={center:t.center,left:t.left,right:t.right};
  if(t.stone){materials.stone.map=t.stone;materials.stone.color.set(0xd2c3a9);materials.stone.roughness=.84;materials.wall.map=t.stone;}
  if(t.bump){for(const k of ['stone','trim','wall','path']){materials[k].bumpMap=t.bump;materials[k].bumpScale=.045;}}
  if(t.grass){materials.grass.map=t.grass;materials.grass.color.set(0xb6c197);materials.hedge.color.set(0x37572c);}
  if(t.water){materials.water.bumpMap=t.water;materials.water.bumpScale=.13;materials.water.roughness=.09;materials.water.metalness=.4;materials.water.color.set(0x60b8c2);}
  materials.glass.color.set(0x5d8292);materials.glass.metalness=.6;materials.glass.roughness=.19;
  if(t.asphalt)materials.road.map=t.asphalt;
}
function box(g,w,h,d,x,y,z,m,name=''){
  const mesh=new T.Mesh(unit,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;g.add(mesh);return mesh;
}
function batch(g,list,m,geo=unit,name=''){
  const mesh=new T.InstancedMesh(geo,m,list.length);mesh.name=name;
  list.forEach((a,i)=>{dummy.position.set(a[0],a[1],a[2]);dummy.scale.set(a[3]??1,a[4]??1,a[5]??1);dummy.rotation.set(0,a[6]??0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function cylinder(g,r1,r2,h,x,y,z,m,segments=24){const a=new T.Mesh(new T.CylinderGeometry(r1,r2,h,segments),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
function line(g,pts,color=0xf3eee1,width=1){const a=new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,linewidth:width}));g.add(a);return a;}

export function buildSite(){
  const root=new T.Group();root.name='World Dreams — reference-led exterior reconstruction';root.userData={description:'Approximate 3D study from supplied architectural renders. Unverified dimensions, floor counts and contextual buildings. No apartment interiors.',source:'User-supplied render folder'};
  const towers=towerLayout.map(c=>{const g=createArchitecturalTower(c,materials,facadeMaps);root.add(g);return g;});
  const land=new T.Group();land.name='Landscape and amenity podium';root.add(land);
  const {stone,trim,path,grass,water,hedge,brass,glass,dark,road}=materials;
  box(land,211,2.4,159,0,-.5,8,path,'Site plinth');
  box(land,205,.18,153,0,.79,8,grass);
  // Tower-side driveways and pedestrian loops.
  for(const x of [-98,98])box(land,7,.2,154,x,.95,8,path);
  box(land,202,.18,6,0,.99,-64,path);
  box(land,140,.22,7,0,1.02,34,path);
  box(land,6,.2,93,0,1.04,-7,path);
  const hedges=[],pavers=[];
  for(let i=0;i<4;i++)for(const x of [-33,33]){
    const z=-28+i*17;
    box(land,47,.3,12,x,1.05,z,grass);
    hedges.push([x,1.5,z-6,46,.85,.7],[x,1.5,z+6,46,.85,.7],[x-23,1.5,z,.7,.85,12],[x+23,1.5,z,.7,.85,12]);
    box(land,132,.14,2.2,0,1.22,z+8.3,path);
    for(let n=0;n<7;n++)pavers.push([x-10+n*3.5,1.27,z,2.4,.14,1.8]);
  }
  batch(land,hedges,hedge,unit,'Garden hedges');batch(land,pavers,trim,unit,'Stepping stones');
  cylinder(land,6,6,.3,0,1.3,4,path);cylinder(land,4.7,4.7,.26,0,1.55,4,water);cylinder(land,.5,1,3.4,0,3.3,4,trim);
  const benches=[];for(const x of [-59,59,-14,14])for(let z=-29;z<28;z+=17)benches.push([x,1.9,z,4,.4,1]);batch(land,benches,materials.wall);
  // A continuous low-rise retail and clubhouse frontage.
  box(land,185,10.4,24,0,6.3,59,stone,'Retail and clubhouse podium');
  box(land,189,.65,27,0,11.7,59,trim);
  const shopWindows=[],arcadeCols=[],retailBands=[];
  for(let i=0;i<35;i++){
    const x=-88+i*5.2;
    for(const y of [3.4,7.7])shopWindows.push([x,y,71.12,4.1,3.2,.22]);
    arcadeCols.push([x+2.5,5.5,72.3,.48,10,.9]);
  }
  for(const y of [1.4,5.5,10.7])retailBands.push([0,y,72.2,185,.45,1.8]);
  batch(land,shopWindows,glass,unit,'Commercial glazing');batch(land,arcadeCols,trim,unit,'Boulevard colonnade');batch(land,retailBands,trim);
  // Rooftop gardens, pool and round pavilion, visible in the reference collection.
  box(land,53,.22,21,0,12.25,60,path);
  box(land,39,.25,13,0,12.5,64,water,'Pool terrace');
  box(land,42,.18,.65,0,12.72,71,trim);box(land,42,.18,.65,0,12.72,57,trim);
  for(const x of [-20.5,20.5])box(land,.65,.18,14,x,12.72,64,trim);
  cylinder(land,11,11,.6,0,12.8,47,path);
  cylinder(land,8.5,8.5,.7,0,16.8,47,trim);
  cylinder(land,5.4,5.4,.45,0,20.2,47,trim);
  cylinder(land,4.8,4.8,2.6,0,18.6,47,glass);
  for(let i=0;i<12;i++){let a=i*Math.PI/6;cylinder(land,.24,.24,3.9,8*Math.cos(a),14.8,47+8*Math.sin(a),trim,8);}
  const loungers=[];for(const x of [-25,25])for(let z=53;z<72;z+=4)loungers.push([x,12.8,z,1.5,.45,2.8]);batch(land,loungers,trim);
  // Rooftop sport courts and an elevated red walking loop.
  for(const [x,type] of [[-57,'tennis'],[57,'futsal']]){
    box(land,44,.3,19,x,12.25,58,grass);
    box(land,31,.12,14,x,12.5,58,mat(type==='tennis'?0x638d9f:0x67937e));
    const y=12.61;
    line(land,[[x-15,y,51],[x+15,y,51],[x+15,y,65],[x-15,y,65],[x-15,y,51]]);
    line(land,[[x,y,51],[x,y,65]]);
    if(type==='tennis'){
      line(land,[[x-8,y,51],[x-8,y,65]]);line(land,[[x+8,y,51],[x+8,y,65]]);
      box(land,.12,1,14,x,13.1,58,glass);
    }
    box(land,39,.16,1.4,x,12.7,48,materials.wall);box(land,39,.16,1.4,x,12.7,68,materials.wall);
    for(const px of [x-19.5,x+19.5])box(land,1.4,.16,21,px,12.7,58,materials.wall);
    line(land,[[x-18.8,12.8,48],[x+18.8,12.8,48],[x+18.8,12.8,68],[x-18.8,12.8,68],[x-18.8,12.8,48]],0xdcc4ad);
  }
  // Taller commercial blocks at the road-side corner, simplified from renders.
  for(const [x,z,h,w,d] of [[105,61,89,22,22],[105,29,75,20,19]]){
    const g=new T.Group();g.name='Commercial exterior massing';land.add(g);
    box(g,w,h,d,x,h/2+12,z,materials.wall);
    const ribs=[],glazing=[],belts=[];
    for(let side of [-1,1]){
      for(let c=-2;c<=2;c++){ribs.push([x+c*w/5,h/2+12,z+side*(d/2+.35),.5,h+1,.8]);glazing.push([x+c*w/5+w/10,h/2+12,z+side*(d/2+.1),w/5-.65,h-6,.18]);}
      for(let c=-2;c<=2;c++)ribs.push([x+side*(w/2+.3),h/2+12,z+c*d/5,.8,h+1,.5]);
      glazing.push([x+side*(w/2+.1),h/2+12,z,.18,h-6,d-1]);
    }
    for(let y=16;y<h+10;y+=3)belts.push([x,y,z,w+.5,.16,d+.5]);
    batch(g,glazing,glass);batch(g,ribs,trim);batch(g,belts,stone);
    box(g,w+2,.9,d+2,x,h+12,z,trim);box(g,w+1,.6,d+1,x,h+8,z,trim);
  }
  // Trees are instanced to keep the scene practical on phones.
  const trunks=[],crowns=[],palms=[],fronds=[];
  const rnd=(i)=>{const n=Math.sin(i*127.1+8.13)*43758.5453;return n-Math.floor(n);};
  let seed=0;
  function tree(x,z,scale=1){const a=seed++;trunks.push([x,2.7*scale,z,.22*scale,3.8*scale,.22*scale]);for(let j=0;j<22;j++){const u=rnd(a*41+j)*Math.PI*2,r=Math.sqrt(rnd(a*41+j+31))*2.6*scale,py=4.4*scale+rnd(a*41+j+63)*3*scale;crowns.push([x+Math.cos(u)*r,py,z+Math.sin(u)*r,(.6+rnd(j+a)*.5)*scale,(.7+rnd(j+a+8)*.55)*scale,(.7+rnd(j+a+12)*.5)*scale]);}}
  function palm(x,z){palms.push([x,4.9,z,.23,7.5,.23]);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;fronds.push([x+1.15*Math.cos(a),8.4,z+1.15*Math.sin(a),3.5,.22,.9,-a]);}}
  for(let x=-95;x<=95;x+=7){tree(x,-65,.65+rnd(seed)*.3);tree(x,80,.7+rnd(seed)*.35);}
  for(let z=-50;z<=73;z+=7){tree(-103,z,.75);tree(103,z,.7);}
  for(let x=-61;x<=61;x+=15)for(let z=-32;z<=27;z+=17){if(Math.abs(x)>8)tree(x,z,.55+rnd(seed)*.25);}
  for(let x=-65;x<=65;x+=13){palm(x,36);palm(x,76);}
  for(let z=-28;z<=25;z+=13){palm(-8,z);palm(8,z);}
  batch(land,trunks,materials.wall,unit,'Tree trunks');const foliage=batch(land,crowns,hedge,new T.SphereGeometry(1,7,5),'Tree canopy');for(let i=0;i<crowns.length;i++)foliage.setColorAt(i,new T.Color().setHSL(.22+rnd(i)*.08,.24+rnd(i+7)*.12,.55+rnd(i+33)*.27));batch(land,palms,materials.wall,unit,'Palm trunks');batch(land,fronds,grass,new T.SphereGeometry(1,8,4),'Palm fronds');
  const context=new T.Group();context.name='Illustrative neighborhood — not geographically surveyed';
  const contextMat=mat(0xd9ded7),contexts=[],contextTrees=[];
  box(context,1100,.5,1100,0,-3,0,mat(0xe5e8e0),'Context ground');
  // Road along the frontage, then a quieter local street behind.
  box(context,700,.1,21,0,-2.6,103,road);box(context,700,.12,2.4,0,-2.5,103,path);
  box(context,700,.1,9,0,-2.6,-94,road);
  for(const x of [-133,133])box(context,10,.1,430,x,-2.6,0,road);
  const roadMarks=[];for(let x=-330;x<330;x+=9)for(const z of [98,108])roadMarks.push([x,-2.45,z,4,.06,.15]);batch(context,roadMarks,trim);
  for(let i=0;i<110;i++){
    const x=(rnd(i*4)-.5)*620,z=(rnd(i*4+1)-.5)*480;
    if(Math.abs(x)<153&&z>-110&&z<145)continue;
    const h=5+rnd(i*4+2)*28,w=10+rnd(i+400)*17,d=10+rnd(i+700)*15;
    contexts.push([x,h/2-2.5,z,w,h,d]);
    contextTrees.push([x+w*.7,2,z+d*.65,3,4,3]);
  }
  batch(context,contexts,contextMat,unit,'Illustrative city blocks');batch(context,contextTrees,mat(0xc6cec0),new T.IcosahedronGeometry(1,0));
  const cars=[],carRoofs=[];
  for(let i=0;i<19;i++){const x=-150+i*17+(rnd(i+88)*6),z=i%2?98:109;cars.push([x,-1.9,z,3.6,.9,1.7]);carRoofs.push([x,-1.3,z,1.9,.5,1.55]);}
  batch(context,cars,mat(0xeaece7));batch(context,carRoofs,mat(0x798885));
  return {root,towers,land,context};
}
