import * as T from './vendor/three.module.js';

export const LIGHTING_PRESETS={
  day:{sun:[-160,205,195],color:0xfff0dc,sunPower:2.3,ambient:.48,fill:.28,environment:.5,exposure:1,
    fog:0xc4d6d6,density:.00082,windows:0,lamps:0,turbidity:2.5,rayleigh:1.65},
  evening:{sun:[-140,21,-400],color:0xffaa62,sunPower:2.25,ambient:.42,fill:.30,environment:.28,exposure:.98,
    fog:0xe6b29b,density:.0010,windows:.40,lamps:.18,turbidity:6,rayleigh:2.8},
  night:{sun:[-110,190,80],color:0x92b7ef,sunPower:.26,ambient:.23,fill:.13,environment:.055,exposure:1.08,
    fog:0x111e36,density:.0013,windows:1.65,lamps:1,turbidity:3,rayleigh:1}
};

export function createArchitecturalLighting({scene,renderer,sun,ambient,fill,sky,nightSky,model,maps,invalidate,announce}){
  const originalEnvironment=scene.environment,originalEnvironmentIntensity=scene.environmentIntensity;
  const windowMaterials=[],paneMaterials=[],lights=[];
  const bayNames=new Map([['Central bay','center'],['West bay','left'],['East bay','right']]);
  function occupiedWindows(material,seed){
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec2 room=floor(vMapUv*vec2(7.0,35.0));
         float occupancy=fract(sin(dot(room,vec2(127.1,311.7))+${seed.toFixed(3)})*43758.5453);
         float variation=mix(0.48,1.0,fract(occupancy*17.0));
         totalEmissiveRadiance*=step(0.36,occupancy)*variation;`);
    };
    material.customProgramCacheKey=()=>String(seed);
  }
  model.towers.forEach((tower,index)=>{
    const facade=tower.getObjectByName('Plan-shaped facade with projecting wings and recessed courts');
    if(!facade)return;
    facade.material=facade.material.map(original=>{
      const bay=bayNames.get(original.name);
      if(!bay)return original;
      const material=original.clone();
      material.emissive.set(0xffd69a);material.emissiveMap=maps[bay+'Glass'];
      material.emissiveIntensity=0;occupiedWindows(material,index*3.71+1);
      material.name=original.name;windowMaterials.push(material);return material;
    });
  });
  // Light the existing commercial panes independently from their glass envelope.
  const panes=model.businessPark.getObjectByName('Reflective individual glazing panes');
  if(panes){
    panes.material=panes.material.clone();panes.material.emissive.set(0xf9dba6);
    panes.material.emissiveIntensity=0;
    const officeLights=new Float32Array(panes.count);
    for(let i=0;i<officeLights.length;i++){
      const random=Math.abs(Math.sin(i*127.1+11.7));
      officeLights[i]=random>.4?.45+random*.55:0;
    }
    panes.geometry.setAttribute('instanceRoomLight',new T.InstancedBufferAttribute(officeLights,1));
    panes.material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float instanceRoomLight;varying float vOfficeLight;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vOfficeLight=instanceRoomLight;');
      shader.fragmentShader='varying float vOfficeLight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance*=vOfficeLight;');
    };
    paneMaterials.push(panes.material);
  }
  const fixtures=new T.Group();fixtures.name='Entrance and landscape luminaires';scene.add(fixtures);
  const metal=new T.MeshStandardMaterial({color:0x3b4038,roughness:.5,metalness:.55});
  const glow=new T.MeshStandardMaterial({color:0xfff1cd,emissive:0xffca80,emissiveIntensity:0,roughness:.4});
  const points=[];
  for(const x of [-56,-28,0,28,56])for(const z of [4,21,38])points.push([x,1.85,z]);
  for(const x of [-24,24])for(const z of [57,70])points.push([x,13.3,z]);
  const dummy=new T.Object3D();
  const stems=new T.InstancedMesh(new T.CylinderGeometry(.095,.13,1.25,8),metal,points.length);
  const bulbs=new T.InstancedMesh(new T.SphereGeometry(.21,10,6),glow,points.length);
  points.forEach(([x,y,z],i)=>{
    dummy.position.set(x,y-.48,z);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,y+.11,z);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);
  });
  fixtures.add(stems,bulbs);
  for(const [x,y,z,power,reach] of [
    [-45,4,13,1700,34],[0,4,25,1700,38],[45,4,13,1700,34],
    [-23,16,63,1800,40],[23,16,63,1800,40],[0,15,73,1300,30],
    [91,17,77,1800,60]
  ]){
    const light=new T.PointLight(0xffd59a,0,reach,2);
    light.position.set(x,y,z);fixtures.add(light);lights.push({light,power});
  }
  // A small number of broad uplights reveal stone profiles without per-window lights.
  for(const index of [1,3,5]){
    const tower=model.towers[index],light=new T.SpotLight(0xffd6a3,0,135,.48,.8,2);
    light.position.set(tower.position.x,3,tower.position.z+18);
    light.target.position.set(tower.position.x,58,tower.position.z);
    fixtures.add(light,light.target);lights.push({light,power:8000});
  }
  const environmentCache=new Map(),generator=new T.PMREMGenerator(renderer);
  function environment(name,p){
    if(!environmentCache.has(name)){
      const backdrop=new T.Scene();
      if(name==='night')backdrop.background=new T.Color(0x23314d);
      else backdrop.add(sky.clone());
      environmentCache.set(name,generator.fromScene(backdrop,.035,.1,1800));
    }
    scene.environment=environmentCache.get(name).texture;
    scene.environmentIntensity=p.environment;
  }
  function set(name){
    const p=LIGHTING_PRESETS[name];if(!p)return;
    sun.position.set(...p.sun);sun.color.set(p.color);sun.intensity=p.sunPower;
    ambient.intensity=p.ambient;ambient.color.set(name==='day'?0xe2f1ff:name==='evening'?0xd9c1b5:0xcbdcf2);
    ambient.groundColor.set(name==='day'?0x6b7256:name==='night'?0x25394b:0x778369);
    fill.intensity=p.fill;fill.color.set(name==='day'?0xd6eaff:name==='evening'?0x8ba5e3:0xc3d7ff);
    renderer.toneMappingExposure=p.exposure;scene.fog.color.set(p.fog);scene.fog.density=p.density;
    const u=sky.material.uniforms;
    u.sunPosition.value.copy(sun.position).normalize();u.turbidity.value=p.turbidity;u.rayleigh.value=p.rayleigh;
    sky.visible=name==='evening';nightSky.visible=name!=='evening';
    nightSky.material.uniforms.horizon.value.set(name==='day'?0xd7ecf1:0x1b2d46);
    nightSky.material.uniforms.skyBlue.value.set(name==='day'?0x369bef:0x040a19);
    if(name==='day'){
      scene.environment=originalEnvironment;
      scene.environmentIntensity=originalEnvironmentIntensity;
    }else environment(name,p);
    for(const m of windowMaterials)m.emissiveIntensity=p.windows;
    for(const m of paneMaterials)m.emissiveIntensity=p.windows*.34;
    glow.emissiveIntensity=p.lamps*3.5;
    for(const {light,power} of lights)light.intensity=power*p.lamps;
    document.querySelectorAll('[data-lighting]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lighting===name)));
    document.querySelector('#scene').dataset.lighting=name;
    document.querySelector('#scene').dataset.windowLighting=String(p.windows>0);
    document.querySelector('#viewer').dataset.lighting=name;
    renderer.shadowMap.needsUpdate=true;
    document.dispatchEvent(new CustomEvent('architectural-lighting-change',{detail:{name,...p,environment:scene.environment}}));
    announce(name==='day'?'Daylight':name==='evening'?'Evening · sunset and warm lights':'Night · illuminated residences and gardens');
    invalidate();
  }
  return {set};
}
