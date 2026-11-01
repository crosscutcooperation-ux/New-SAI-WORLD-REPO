import * as T from './vendor/three.module.js';

export function createPodium(m){
  const g=new T.Group();g.name='World Dreams Plaza — stepped retail podium';g.userData={visibleRetailRows:3,upperArcadeRows:1,entranceOpening:true};
  const cube=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();
  function box(w,h,d,x,y,z,mat,name=''){const a=new T.Mesh(cube,mat);a.scale.set(w,h,d);a.position.set(x,y,z);a.name=name;a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
  function batch(list,mat,name){const a=new T.InstancedMesh(cube,mat,list.length);list.forEach((v,i)=>{dummy.position.set(v[0],v[1],v[2]);dummy.scale.set(v[3],v[4],v[5]);dummy.rotation.set(0,0,0);dummy.updateMatrix();a.setMatrixAt(i,dummy.matrix);});a.name=name;a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
  // A real opening separates the two masses at the tall entrance arch.
  box(123.5,10.8,24,-30.75,6.4,59,m.stone,'West retail mass');
  box(47.5,10.8,24,68.75,6.4,59,m.stone,'East retail mass');
  // Keep the cornice around the pool cutout so the patterned basin remains visible.
  box(73.75,.6,27,-56.625,12.08,59,m.trim);
  box(12.5,.6,27,25.75,12.08,59,m.trim);
  box(39,.6,12,0,12.08,51.5,m.trim);
  box(39,.6,2,0,12.08,71.5,m.trim);box(49.5,.6,27,68.75,12.08,59,m.trim);
  const glazing=m.glass.clone();glazing.color.set(0x8299a5);glazing.roughness=.14;glazing.metalness=.48;glazing.envMapIntensity=1;
  const display=glazing.clone(),upperGlass=glazing.clone();
  display.map=m.shopDisplay??null;upperGlass.map=m.shopUpper??null;
  for(const material of [display,upperGlass]){material.color.set(0xffffff);material.metalness=.17;material.roughness=.22;}
  const shopfronts=[],panes=[],piers=[],mullions=[],belts=[],capitals=[];
  for(let i=0;i<35;i++){
    const x=-88+i*5.2;if(x>29&&x<47)continue;
    for(const y of [2.8,6.45,9.8]){
      (y===2.8?shopfronts:panes).push([x,y,71.14,4.25,2.8,.18]);
      for(const dx of [-1.4,0,1.4])mullions.push([x+dx,y,71.28,.055,2.82,.07]);
    }
    piers.push([x+2.5,6.4,71.7,.5,10.8,1]);capitals.push([x+2.5,11.55,71.85,.88,.45,1.25]);
  }
  for(const y of [1.2,4.55,8.15,11.7]){belts.push([-30.75,y,71.75,123.5,.27,1.35],[68.75,y,71.75,47.5,.27,1.35]);}
  batch(shopfronts,display,'Ground-floor shop windows');batch(panes,upperGlass,'Upper retail windows');batch(piers,m.trim,'Podium stone pilasters');batch(capitals,m.trim,'Podium column capitals');batch(mullions,m.dark,'Shopfront mullions');batch(belts,m.trim,'Retail floor cornices');
  // The taller east frontage has an additional arched rooftop arcade.
  const upper=[];
  for(let x=49;x<92;x+=5.2){
    box(4.3,2.5,.2,x,13.65,71.15,glazing);upper.push([x+2.5,13.65,71.7,.45,2.9,.9]);
    const arch=new T.Mesh(new T.TorusGeometry(1.85,.16,8,24,Math.PI),m.trim);arch.position.set(x,13.55,71.9);g.add(arch);
  }
  batch(upper,m.trim,'Upper arcade piers');box(47.8,.42,2.6,68.75,15.3,71,m.trim,'Upper arcade cornice');
  // High portico, as shown between the club and the east commercial frontage.
  const outer=7,inner=5.55,spring=8.2,shape=new T.Shape();shape.moveTo(-outer,0);shape.lineTo(-outer,spring);shape.absarc(0,spring,outer,Math.PI,0,true);shape.lineTo(outer,0);shape.closePath();
  const hole=new T.Path();hole.moveTo(-inner,.03);hole.lineTo(inner,.03);hole.lineTo(inner,spring);hole.absarc(0,spring,inner,0,Math.PI,false);hole.closePath();shape.holes.push(hole);
  const portal=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:2.8,bevelEnabled:true,bevelSize:.09,bevelThickness:.09,bevelSegments:1}),m.trim);portal.position.set(38,1,71.1);portal.name='Tall arched entrance — open passage';portal.castShadow=true;portal.receiveShadow=true;g.add(portal);
  // Continue both jambs into the passage and set the stair behind the street face.
  for(const x of [31.8,44.2])box(1.6,8.2,12,x,5.1,65.2,m.stone);
  for(let step=0;step<12;step++){
    const height=.16*(step+1);
    box(10.9,height,.46,38,1+height/2,69-step*.45,m.trim);
  }
  box(17.3,.5,4,38,16.45,72.1,m.trim,'Entrance cornice');
  for(const x of [30.8,45.2]){box(.5,8.5,3.1,x,5.25,72.4,m.stone);box(.9,.35,3.4,x,9.3,72.4,m.trim);}
  // The recessed arrival colonnade has actual round columns and a canopy.
  box(46,.5,7,-47,8.45,74,m.trim,'Arrival canopy');
  for(let x=-67;x<=-27;x+=8){const column=new T.Mesh(new T.CylinderGeometry(.32,.42,7.2,20),m.trim);column.position.set(x,4.75,76.5);column.castShadow=true;g.add(column);box(.95,.28,.95,x,8.23,76.5,m.trim);}
  // Left landmark relief panel is a textured architectural surface, not a view.
  box(13,.6,1.2,-83,12.5,72,m.trim);box(13,11.2,1.2,-83,6.9,72,m.trim);
  if(m.relief){const relief=new T.MeshStandardMaterial({map:m.relief,color:0xffffff,roughness:.62,metalness:.15});box(10.8,9.3,.12,-83,7.1,72.67,relief,'Reference-derived sculptural facade panel');}
  // Residential arrival gate beside the podium.
  for(const x of [-105,-96]){box(1.25,5.4,1.3,x,2.8,75,m.trim);box(1.8,.35,1.8,x,5.65,75,m.trim);}
  box(10.5,.7,1.4,-100.5,5.6,75,m.stone,'Residential entrance lintel');
  return g;
}
