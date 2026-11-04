import * as T from './vendor/three.module.js';
import {TOWER_FOOTPRINTS} from './tower-footprints.js?v=master-layout-7';

export function createSteppedTowerBody(cfg,m,maps={}){
  const outline=TOWER_FOOTPRINTS[cfg.plan],group=new T.Group(),shape=new T.Shape();
  // Plan image rows run toward the roadside. Preserve that orientation in X/Z.
  outline.points.forEach(([x,z],i)=>shape[i===0?'moveTo':'lineTo'](x,-z));shape.closePath();
  const height=94.5,base=4.0,floorHeight=height/35;
  const facade=(key)=>maps[key]?new T.MeshPhysicalMaterial({map:maps[key],color:0xffffff,roughnessMap:maps[key+'Roughness']??null,roughness:1,metalnessMap:maps[key+'Metalness']??null,metalness:.5,clearcoatMap:maps[key+'Glass']??null,clearcoat:.6,clearcoatRoughness:.15,envMapIntensity:.65}):m.stone;
  const facadeMaterials=[m.trim,facade('center'),facade('left'),facade('right'),m.stone];
  const coreShapes=(outline.cores??[outline.points]).map(points=>{const core=new T.Shape();points.forEach(([x,z],i)=>core[i===0?'moveTo':'lineTo'](x,-z));core.closePath();return core;});
  const bodyGeometry=new T.ExtrudeGeometry(coreShapes,{depth:height,bevelEnabled:false,curveSegments:1});bodyGeometry.rotateX(-Math.PI/2);
  const pos=bodyGeometry.attributes.position,normal=bodyGeometry.attributes.normal;
  const buckets=facadeMaterials.map(()=>({position:[],normal:[],uv:[]}));
  for(let triangle=0;triangle<pos.count;triangle+=3){
    const nx=normal.getX(triangle),ny=normal.getY(triangle),nz=normal.getZ(triangle);
    // Solid stone returns frame the projecting central bay in the courtyard elevation.
    const xs=[pos.getX(triangle),pos.getX(triangle+1),pos.getX(triangle+2)];
    const zs=[pos.getZ(triangle),pos.getZ(triangle+1),pos.getZ(triangle+2)];
    const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
    const stoneReturn=Math.abs(nx)>.92&&Math.abs(cx)<8.8&&cz>outline.depth*.18;
    let material=1;
    if(Math.abs(ny)>.5)material=0;
    else if(stoneReturn)material=4;
    else if(Math.abs(nx)>.5)material=nx>0?3:2;
    else if(cx < -7.4)material=2;
    else if(cx > 7.4)material=3;
    const bucket=buckets[material],tile=material===1?14.8:10.8;
    for(let i=triangle;i<triangle+3;i++){
      bucket.position.push(pos.getX(i),pos.getY(i),pos.getZ(i));bucket.normal.push(normal.getX(i),normal.getY(i),normal.getZ(i));
      const sideways=Math.abs(nx)>.5;
      const bayCenter=sideways||material===1?0:material===2?-12.95:12.95;
      bucket.uv.push(((sideways?pos.getZ(i):pos.getX(i))-bayCenter)/tile+.5,pos.getY(i)/height);
    }
  }
  const wallGeometry=new T.BufferGeometry(),positions=[],normals=[],uvs=[];
  buckets.forEach((bucket,index)=>{const start=positions.length/3;positions.push(...bucket.position);normals.push(...bucket.normal);uvs.push(...bucket.uv);wallGeometry.addGroup(start,bucket.position.length/3,index);});
  wallGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));wallGeometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));wallGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));bodyGeometry.dispose();
  const body=new T.Mesh(wallGeometry,facadeMaterials);body.position.y=base;body.name='Plan-shaped facade with projecting wings and recessed courts';body.castShadow=true;body.receiveShadow=true;group.add(body);
  const plateGeometry=new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false,curveSegments:1});plateGeometry.rotateX(-Math.PI/2);
  const plates=new T.InstancedMesh(plateGeometry,m.trim,36),dummy=new T.Object3D();
  for(let floor=0;floor<=35;floor++){dummy.position.set(0,base+floor*floorHeight,0);dummy.updateMatrix();plates.setMatrixAt(floor,dummy.matrix);}
  plates.name='35 residential floor plates following the supplied footprint';plates.receiveShadow=true;plates.castShadow=false;group.add(plates);
  const plinthGeometry=new T.ExtrudeGeometry(shape,{depth:3.9,bevelEnabled:false,curveSegments:1});plinthGeometry.rotateX(-Math.PI/2);
  const plinth=new T.Mesh(plinthGeometry,m.stone);plinth.name='Lobby level following the tower footprint';plinth.castShadow=true;group.add(plinth);
  const piers=[],rails=[],posts=[];
  function piece(x,y,z,w,h,d,angle=0){return{x,y,z,w,h,d,angle};}
  // Each long outside edge gets its own recessed bay and corner piers.
  for(let edge=0;edge<outline.points.length;edge++){
    const a=outline.points[edge],b=outline.points[(edge+1)%outline.points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.15)continue;
    const tx=dx/length,tz=dz/length,angle=-Math.atan2(dz,dx),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
    piers.push(piece(cx,98.87,cz,length+.06,.61,.27,angle));
    if(length<2.4)continue;
    piers.push(piece(a[0],51,a[1],.52,94.5,.52),piece(b[0],51,b[1],.52,94.5,.52));
    // The reference elevations have a deeper string course about every five floors.
    for(let f=5;f<=35;f+=5)piers.push(piece(cx,base+f*floorHeight,cz,length+.10,.20,.32,angle));
    // Rails occur on selected projecting bays, leaving the recessed window bays open.
    if(length<3||length>10||edge%3===0)continue;
    for(let floor=0;floor<35;floor++){
      const y=base+floor*floorHeight;
      rails.push(piece(cx,y+.86,cz,length,.065,.085,angle));
      const count=Math.floor(length/.42);
      for(let n=0;n<=count;n++)posts.push(piece(a[0]+dx*n/count,y+.47,a[1]+dz*n/count,.035,.78,.035));
    }
  }
  function instances(items,material,name){
    const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,items.length);
    items.forEach((item,i)=>{dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(0,item.angle,0);dummy.scale.set(item.w,item.h,item.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);mesh.name=name;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  instances(piers,m.stone,'Stone piers at the plan setbacks');instances(rails,m.brass,'Projecting bay handrails');instances(posts,m.dark,'Fine ornamental balcony balusters');
  const forward=[];
  outline.points.forEach((a,i)=>{const b=outline.points[(i+1)%outline.points.length];if((a[0]<=0&&b[0]>=0)||(b[0]<=0&&a[0]>=0)){const t=(0-a[0])/(b[0]-a[0]||1);if(t>=0&&t<=1)forward.push(a[1]+(b[1]-a[1])*t);}});
  group.userData={forward:Math.max(...forward),footprint:outline.points,depth:outline.depth,floors:35,sourcePage:outline.sourcePage,masterLayoutOnly:!!outline.masterLayoutOnly};
  return group;
}
