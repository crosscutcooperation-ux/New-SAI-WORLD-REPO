import * as T from './vendor/three.module.js';
import {createArchitecturalTower} from './architectural-tower.js?v=architecture-4d';
import {createAmenityDeck} from './amenity-deck.js?v=walkthrough-3c';
import {createBusinessPark} from './business-park.js?v=architecture-4d';
import {createPodium} from './podium.js?v=architecture-4d';

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
  for(const name of ['center','left','right'])for(const suffix of ['Roughness','Metalness','Glass'])facadeMaps[name+suffix]=t[name+suffix];
  if(t.stone){materials.stone.map=t.stone;materials.stone.color.set(0xd2c3a9);materials.stone.roughness=.84;materials.wall.map=t.stone;}
  if(t.bump){for(const k of ['stone','trim','wall','path']){materials[k].bumpMap=t.bump;materials[k].bumpScale=.045;}}
  if(t.grass){materials.grass.map=t.grass;materials.grass.color.set(0xb6c197);materials.hedge.color.set(0x37572c);}
  if(t.water){materials.water.bumpMap=t.water;materials.water.bumpScale=.13;materials.water.roughness=.09;materials.water.metalness=.4;materials.water.color.set(0x60b8c2);}
  materials.glass.color.set(0x5d8292);materials.glass.metalness=.6;materials.glass.roughness=.19;
  if(t.asphalt)materials.road.map=t.asphalt;
  if(t.poolPattern){materials.water.map=t.poolPattern;materials.water.color.set(0xffffff);materials.water.metalness=.12;}
  if(t.wood)materials.wood=new T.MeshStandardMaterial({map:t.wood,color:0xffffff,roughness:.85});
  for(const key of ['clerestory','posters-west','posters-east','arcade-glass'])materials[key]=t[key];
  if(t.font)materials.font=t.font;
  if(t.relief)materials.relief=t.relief;
  materials.shopDisplay=t.shopDisplay;materials.shopUpper=t.shopUpper;
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
  const walkObstacles=[];
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
  for(const a of hedges)walkObstacles.push({zone:'garden',x:a[0],z:a[2],w:a[3],d:a[5]});
  cylinder(land,6,6,.3,0,1.3,4,path);cylinder(land,4.7,4.7,.26,0,1.55,4,water);cylinder(land,.5,1,3.4,0,3.3,4,trim);
  const benches=[];for(const x of [-59,59,-14,14])for(let z=-29;z<28;z+=17)benches.push([x,1.9,z,4,.4,1]);batch(land,benches,materials.wall);
  for(const a of benches)walkObstacles.push({zone:'garden',x:a[0],z:a[2],w:a[3],d:a[5]});
  box(land,207,.16,15,0,.99,79.5,path,'Paved boulevard promenade');
  const podium=createPodium(materials);land.add(podium);
  // Ground-level detail follows the poolside and rooftop pavilion references.
  const amenityDeck=createAmenityDeck(materials);land.add(amenityDeck.group);walkObstacles.push(...amenityDeck.obstacles);
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
  const businessPark=createBusinessPark(materials);land.add(businessPark);
  // Trees are instanced to keep the scene practical on phones.
  const trunks=[],crowns=[],palms=[],fronds=[];
  const rnd=(i)=>{const n=Math.sin(i*127.1+8.13)*43758.5453;return n-Math.floor(n);};
  let seed=0;
  function tree(x,z,scale=1){const a=seed++;trunks.push([x,2.7*scale,z,.22*scale,3.8*scale,.22*scale]);walkObstacles.push({zone:'garden',x,z,r:.3*scale});for(let j=0;j<22;j++){const u=rnd(a*41+j)*Math.PI*2,r=Math.sqrt(rnd(a*41+j+31))*2.6*scale,py=4.4*scale+rnd(a*41+j+63)*3*scale;crowns.push([x+Math.cos(u)*r,py,z+Math.sin(u)*r,(.6+rnd(j+a)*.5)*scale,(.7+rnd(j+a+8)*.55)*scale,(.7+rnd(j+a+12)*.5)*scale]);}}
  function palm(x,z){
    palms.push([x,4.9,z,.27,7.6,.27]);
    for(let i=0;i<13;i++){
      const angle=i*2.4+rnd(x+z)*.4, size=.76+rnd(i+x)*.43;
      fronds.push([x,8.64,z,size,i%2?.76:1.2,size,angle]);
    }
    walkObstacles.push({zone:'garden',x,z,r:.33});
  }
  for(let x=-95;x<=95;x+=7){tree(x,-65,.65+rnd(seed)*.3);tree(x,80,.7+rnd(seed)*.35);}
  for(let z=-50;z<=73;z+=7){tree(-103,z,.75);tree(103,z,.7);}
  for(let x=-61;x<=61;x+=15)for(let z=-32;z<=27;z+=17){if(Math.abs(x)>8)tree(x,z,.55+rnd(seed)*.25);}
  for(let x=-65;x<=65;x+=13){palm(x,36);palm(x,76);}
  for(let z=-28;z<=25;z+=13){palm(-8,z);palm(8,z);}
  batch(land,trunks,mat(0x74604a),new T.CylinderGeometry(.7,1,1,9),'Tree trunks');
  // One instanced spray carries folded leaves and fine branchlets rather than a solid crown.
  const leaves=[],leafColors=[];
  function facet(a,b,c,color){leaves.push(...a,...b,...c);leafColors.push(...color,...color,...color);}
  for(let j=0;j<9;j++){
    const azimuth=j*2.4,dx=Math.cos(azimuth),dz=Math.sin(azimuth),lift=rnd(j+19)*1.8-.8;
    const end=[dx*1.1,lift,dz*1.1];
    facet([-.045,0,0],[.045,0,0],end,[.14,.085,.04]);
    for(let n=1;n<6;n++){
      const t=n/5,side=n%2?1:-1,span=.17+.08*rnd(j*9+n),x=end[0]*t,y=lift*t,z=end[2]*t;
      const root=[x,y,z],tip=[x+dx*.24-dz*side*span,y+.16,z+dz*.24+dx*side*span];
      const mid=[(x+tip[0])*.5,(y+tip[1])*.5,(z+tip[2])*.5];
      const tone=.6+rnd(j*11+n)*.7;
      facet(root,[mid[0]+dx*.12,mid[1]+.045,mid[2]+dz*.12],tip,[.092*tone,.21*tone,.044*tone]);
      facet(root,tip,[mid[0]-dx*.12,mid[1]-.02,mid[2]-dz*.12],[.067*tone,.15*tone,.035*tone]);
    }
  }
  const spray=new T.BufferGeometry();spray.setAttribute('position',new T.Float32BufferAttribute(leaves,3));spray.setAttribute('color',new T.Float32BufferAttribute(leafColors,3));spray.computeVertexNormals();
  for(let i=0;i<crowns.length;i++)crowns[i][6]=rnd(i)*6.28;
  batch(land,crowns,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.92}),spray,'Branch and leaf sprays');
  batch(land,palms,mat(0x806d52),new T.CylinderGeometry(.63,1,1,10),'Palm trunks');
  const blade=[],bladeColors=[];
  function triangle(a,b,c,tint){blade.push(...a,...b,...c);for(let k=0;k<3;k++)bladeColors.push(...tint);}
  const arch=t=>1.04*Math.sin(t*Math.PI)-.76*t*t;
  for(let j=0;j<29;j++){
    const t=(j+.45)/30,x=t*3.6,y=arch(t),width=.08+.67*Math.sin(Math.PI*t)**.8;
    for(const side of [-1,1]){
      const root=[x,y,0],ridge=[x+.16,y+.04,side*width*.38],tip=[x+.28,y-.23-width*.33,side*width];
      triangle(root,ridge,tip,[.115,.22,.061]);triangle(root,tip,[x+.085,y-.025,0],[.064,.148,.042]);
    }
    triangle([x-.065,y,.045],[x-.065,y,-.045],[x+.10,arch(t+.04),0],[.18,.25,.07]);
  }
  const pinnate=new T.BufferGeometry();pinnate.setAttribute('position',new T.Float32BufferAttribute(blade,3));pinnate.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));pinnate.computeVertexNormals();
  batch(land,fronds,new T.MeshStandardMaterial({side:T.DoubleSide,vertexColors:true,roughness:.85}),pinnate,'Arching palm fronds');
  const context=new T.Group();context.name='Illustrative neighborhood — not geographically surveyed';
  const contextMat=mat(0xd9ded7),contexts=[];
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
  }
  batch(context,contexts,contextMat,unit,'Illustrative city blocks').visible=false;
  const cars=[],carRoofs=[];
  for(let i=0;i<19;i++){const x=-150+i*17+(rnd(i+88)*6),z=i%2?98:109;cars.push([x,-1.9,z,3.6,.9,1.7]);carRoofs.push([x,-1.3,z,1.9,.5,1.55]);}
  batch(context,cars,mat(0xeaece7));batch(context,carRoofs,mat(0x798885));
  context.position.y=3.32;
  return {root,towers,land,context,walkObstacles,poolWater:amenityDeck.water,businessPark,podium};
}
