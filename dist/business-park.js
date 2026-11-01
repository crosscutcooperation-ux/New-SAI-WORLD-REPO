import * as T from './vendor/three.module.js';

// One business-park tower, rebuilt from the roadside and commercial references.
// Dimensions are inferred; this is not a measured architectural model.
export function createBusinessPark(m){
  const g=new T.Group();g.name='World Dreams Business Park';g.userData={role:'business-park',referenceBased:true};g.position.set(91,0,60);
  const boxGeo=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();
  const glass=new T.MeshPhysicalMaterial({color:0x7995ac,metalness:.32,roughness:.13,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.25,ior:1.5});
  const dark=new T.MeshStandardMaterial({color:0x343a3c,roughness:.34,metalness:.66});
  const spandrel=new T.MeshStandardMaterial({color:0x9f9382,roughness:.82,map:m.stone.map,bumpMap:m.stone.bumpMap,bumpScale:.025});
  const bronze=new T.MeshStandardMaterial({color:0x947547,metalness:.65,roughness:.29});
  function box(w,h,d,x,y,z,mat,name=''){const a=new T.Mesh(boxGeo,mat);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;a.name=name;g.add(a);return a;}
  function batch(list,mat,name){const a=new T.InstancedMesh(boxGeo,mat,list.length);list.forEach((v,i)=>{dummy.position.set(v[0],v[1],v[2]);dummy.scale.set(v[3],v[4],v[5]);dummy.rotation.set(0,0,0);dummy.updateMatrix();a.setMatrixAt(i,dummy.matrix);});a.castShadow=true;a.receiveShadow=true;a.name=name;g.add(a);return a;}
  function rounded(w,d,r,h,y,mat,name){const s=new T.Shape(),x=-w/2,z=-d/2;s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);if(y===101.7){const opening=new T.Path();for(const [i,p] of [[-w/2+1,-d/2+1],[-w/2+1,d/2-1],[w/2-1,d/2-1],[w/2-1,-d/2+1]].entries())opening[i===0?"moveTo":"lineTo"](...p);opening.closePath();s.holes.push(opening);}const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:10});geo.rotateX(-Math.PI/2);const a=new T.Mesh(geo,mat);a.position.y=y;a.castShadow=true;a.receiveShadow=true;a.name=name;g.add(a);return a;}
  rounded(29.2,25.2,2.6,.65,12,m.trim,'Stone podium footing');
  rounded(27.6,23.6,2.3,82,13,glass,'Rounded curtain-wall envelope');
  const piers=[],panes=[],mullions=[],panels=[],floorBelts=[],capitals=[];
  const frontBays=[-10,-6,-2,2,6,10],sideBays=[-8,-4,0,4,8];
  for(let level=0;level<25;level++){
    const y=20+level*2.96;
    for(const side of [-1,1]){
      for(const x of frontBays){panes.push([x,y+1.1,side*11.85,3.2,2.12,.08]);panels.push([x,y-.28,side*11.92,3.2,.55,.14]);mullions.push([x,y+1.1,side*11.95,.055,2.14,.05]);mullions.push([x-1.5,y+1.1,side*11.96,.055,2.14,.05]);mullions.push([x+1.5,y+1.1,side*11.96,.055,2.14,.05]);}
      for(const z of sideBays){panes.push([side*13.85,y+1.1,z,.08,2.12,3.15]);panels.push([side*13.92,y-.28,z,.14,.55,3.15]);mullions.push([side*13.96,y+1.1,z,.05,2.14,.055]);}
      floorBelts.push([0,y-.65,side*11.91,23.6,.12,.16]);
      floorBelts.push([side*13.91,y-.65,0,.16,.12,19.5]);
    }
    // Curved corner bands follow the continuous rounded glass instead of a box.
    rounded(27.8,23.8,2.4,.11,y-.67,dark,'Curved floor mullion');
  }
  for(const side of [-1,1]){
    for(let x=-12;x<=12;x+=4){piers.push([x,55.2,side*12.25,.66,71.2,.78]);capitals.push([x,88.8,side*12.4,1.12,.54,1.05]);}
    for(let z=-10;z<=10;z+=4){piers.push([side*14.25,55.2,z,.78,71.2,.66]);capitals.push([side*14.4,88.8,z,1.05,.54,1.12]);}
  }
  batch(panes,glass,'Reflective individual glazing panes');batch(panels,spandrel,'Recessed sandstone spandrels');batch(mullions,dark,'Fine window mullions');batch(floorBelts,dark,'Window transoms');batch(piers,m.trim,'Continuous stone facade piers');batch(capitals,m.trim,'Pier capitals');
  // The arches and attic are characteristic of the reference business park.
  for(const side of [-1,1]){
    for(const x of frontBays){const a=new T.Mesh(new T.TorusGeometry(1.66,.19,8,28,Math.PI),m.trim);a.position.set(x,88.8,side*12.43);if(side<0)a.rotation.y=Math.PI;a.castShadow=true;g.add(a);}
    for(const z of sideBays){const a=new T.Mesh(new T.TorusGeometry(1.66,.19,8,28,Math.PI),m.trim);a.position.set(side*14.43,88.8,z);a.rotation.y=side*Math.PI/2;a.castShadow=true;g.add(a);}
  }
  for(const[y,w,d,h]of[[18.3,29.1,25.1,.5],[19.1,28.7,24.7,.22],[92.8,29.4,25.4,.38],[94,29.7,25.7,.35],[98,30,26,.55],[101.7,30.3,26.3,.45]])rounded(w,d,2.7,h,y,m.trim,'Profiled cornice');
  rounded(27.4,23.4,2.4,3.4,94.4,glass,'Upper glazed attic');
  const attic=[],roofPosts=[];
  for(const side of [-1,1]){
    for(let x=-12;x<=12;x+=4){attic.push([x,96.1,side*12,.55,3.8,.7]);roofPosts.push([x,100,side*12.15,.62,3.4,.75]);}
    for(let z=-8;z<=8;z+=4){attic.push([side*14,96.1,z,.7,3.8,.55]);roofPosts.push([side*14.15,100,z,.75,3.4,.62]);}
  }
  batch(attic,m.trim,'Attic pilasters');batch(roofPosts,m.trim,'Open rooftop colonnade');
  // Ground frontage: a projecting stone canopy, lobby glazing and fine railing.
  rounded(30.5,26.5,2.8,.5,13.1,m.trim,'Projecting entrance canopy');
  const lobbyCols=[];for(let x=-12;x<=12;x+=4)for(const side of [-1,1])lobbyCols.push([x,16.1,side*12.2,.7,5.8,.8]);batch(lobbyCols,m.stone,'Lobby stone columns');
  const balusters=[];for(let x=-13.8;x<=13.8;x+=.38)for(const side of [-1,1])balusters.push([x,19.85,side*12.7,.055,.9,.055]);batch(balusters,m.trim,'Podium balustrade');
  for(const side of [-1,1])box(28.5,.1,.2,0,20.35,side*12.7,m.trim);
  if(m.font){const shapes=m.font.generateShapes('WORLD DREAMS BUSINESS PARK',.67),geo=new T.ExtrudeGeometry(shapes,{depth:.055,bevelEnabled:false});geo.computeBoundingBox();const width=geo.boundingBox.max.x-geo.boundingBox.min.x;const text=new T.Mesh(geo,bronze);text.position.set(-width/2,96.3,12.56);text.name='World Dreams Business Park lettering';g.add(text);}
  return g;
}
