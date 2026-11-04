import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RGBELoader} from './vendor/addons/loaders/RGBELoader.js';
import {FontLoader} from './vendor/addons/loaders/FontLoader.js';
import {Sky} from './vendor/addons/objects/Sky.js';
import {buildSite,setArchitecturalMaterials,towerLayout,places} from './model.js?v=roof-center-8';
import {mergeStaticPieces} from './scene-optimization.js?v=master-layout-7';
import {WalkthroughController} from './walkthrough-controller.js?v=master-layout-7';
import {createTowerElevation} from './tower-elevation.js?v=official-lighting-1';
import {createArchitecturalLighting} from './architectural-lighting.js?v=original-day-2';
import {ZONES} from './walk-navigation.js?v=master-layout-7';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const announce=s=>$('#announcement').textContent=s;
function showReference(button){
  const image=$('#reference-image'),detail=$('#reference-detail');
  const stem=button.dataset.ref;
  if(stem==='garden'){
    image.removeAttribute('srcset');image.src='assets/garden.jpg';detail.hidden=true;
  }else{
    const base='assets/exteriors/'+stem+'-';
    image.srcset=[1280,2400,5000].map(width=>base+width+'.webp '+width+'w').join(', ');
    image.src=base+'1280.webp';detail.href=base+'5000.webp';detail.hidden=false;
  }
  image.alt=button.textContent+' architectural render';
  $$('[data-ref]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
}
$('#open-reference')?.addEventListener('click',()=>{
  showReference($('[data-ref][aria-pressed="true"]'));$('#references').showModal();
});
$('#close-reference').onclick=()=>$('#references').close();
$$('[data-ref]').forEach(button=>button.onclick=()=>showReference(button));
init().catch(e=>{console.error('3D scene initialization failed',e);$('#loading').hidden=true;$('#error').hidden=false;});

async function init(){
  const canvas=$('#scene'),viewport=$('#viewport'),mobile=innerWidth<800;
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  let pixelRatio=Math.min(devicePixelRatio,mobile?1:1.25);
  renderer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const loader=new T.TextureLoader();
  const load=async(name,color=true,repeat=null)=>{const tex=await loader.loadAsync('assets/'+name);tex.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}return tex;};
  const entries=await Promise.all([
    load('facade-35-center.jpg',true,[1,1]).then(t=>['center',t]),load('facade-35-left.jpg',true,[1,1]).then(t=>['left',t]),load('facade-35-right.jpg',true,[1,1]).then(t=>['right',t]),
    load('canopy-spray.webp').then(t=>['canopy',t]),load('stone.jpg',true,[2,8]).then(t=>['stone',t]),load('stone-bump.jpg',false,[12,12]).then(t=>['bump',t]),load('grass.jpg',true,[45,30]).then(t=>['grass',t]),
    load('water-bump.jpg',false,[7,7]).then(t=>['water',t]),load('asphalt.jpg',true,[40,3]).then(t=>['asphalt',t]),
    load('pool-pattern.jpg',true,[6,2]).then(t=>['poolPattern',t]),load('wood-deck.jpg',true,[40,8]).then(t=>['wood',t]),
    ...['center','left','right'].flatMap(name=>['Roughness','Metalness','Glass'].map(suffix=>load(`facade-35-${name}-${suffix.toLowerCase()}.jpg`,false,[1,1]).then(t=>[name+suffix,t]))),
    ...['clerestory','posters-west','posters-east','arcade-glass'].map(key=>load(key+'.jpg').then(t=>[key,t])),
    load('shop-display.jpg').then(t=>['shopDisplay',t]),load('shop-upper.jpg').then(t=>['shopUpper',t]),
    load('plaza-relief.jpg').then(t=>['relief',t]),
    fetch('vendor/fonts/helvetiker_regular.typeface.json').then(r=>r.json()).then(json=>['font',new FontLoader().parse(json)]),
  ]);setArchitecturalMaterials(Object.fromEntries(entries));
  $('#loading-message').textContent='Preparing the architecture and walking paths…';
  const scene=new T.Scene();scene.background=new T.Color(0xb5d6e7);scene.fog=new T.FogExp2(0xc4d6d6,.00082);
  const camera=new T.PerspectiveCamera(39,1,.15,1800);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.095;controls.maxPolarAngle=Math.PI/2-.025;controls.minPolarAngle=.025;controls.minDistance=38;controls.maxDistance=690;controls.autoRotateSpeed=.62;controls.zoomSpeed=.72;
  const sky=new Sky();sky.scale.setScalar(1300);const u=sky.material.uniforms;u.turbidity.value=4;u.rayleigh.value=1.4;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.78;u.sunPosition.value.set(-.5,.8,.6).normalize();scene.add(sky);
  const pmrem=new T.PMREMGenerator(renderer);
  try{const hdr=await new RGBELoader().loadAsync('assets/environment.hdr');hdr.mapping=T.EquirectangularReflectionMapping;scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.5;hdr.dispose();}catch(e){scene.environment=pmrem.fromScene(sky,.04).texture;scene.environmentIntensity=.7;}pmrem.dispose();
  const daylightSky=new T.Mesh(new T.SphereGeometry(1050,48,24),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,toneMapped:false,
    uniforms:{horizon:{value:new T.Color(0xd7ecf1)},skyBlue:{value:new T.Color(0x369bef)}},
    vertexShader:`varying vec3 direction;
      void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 direction;uniform vec3 horizon;uniform vec3 skyBlue;
      void main(){float altitude=normalize(direction).y;
        float t=1.-exp(-5.5*max(altitude+.018,0.));
        gl_FragColor=vec4(mix(horizon,skyBlue,t),1.);
        #include <colorspace_fragment>
      }`
  }));
  sky.visible=false;daylightSky.renderOrder=-10;scene.add(daylightSky);
  const ambient=new T.HemisphereLight(0xe2f1ff,0x6b7256,.48);scene.add(ambient);
  const sun=new T.DirectionalLight(0xfff0dc,2.3);sun.position.set(-160,205,195);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:10,far:650});sun.shadow.bias=-.00015;sun.shadow.normalBias=.15;sun.shadow.radius=2;scene.add(sun);
  const fill=new T.DirectionalLight(0xd6eaff,.28);fill.position.set(100,100,-200);scene.add(fill);
  const model=buildSite(),fineDetails=[];
  try {
    const imported=await new GLTFLoader().loadAsync('assets/residential-facades.glb');
    for(const tower of model.towers){
      const facade=tower.getObjectByName('Plan-shaped facade with projecting wings and recessed courts');
      const source=imported.scene.getObjectByName(tower.userData.name);
      if(!source||!facade)continue;
      const pieces=[];
      source.traverse(node=>{if(node.isMesh)pieces.push(node);});
      const geometry=mergeGeometries(pieces.map(piece=>piece.geometry),true);
      if(!geometry)continue;
      facade.geometry.dispose();
      facade.geometry=geometry;
      facade.material=pieces.map(piece=>piece.material);
      facade.userData.source='Blender';
    }
  } catch(error){console.warn('Using the local tower facade fallback.',error);}
  for(const tower of model.towers){tower.traverse(o=>{if(o.name==='Fine ornamental balcony balusters'){o.castShadow=false;fineDetails.push({mesh:o,position:new T.Vector3(tower.position.x,51,tower.position.z)});}});mergeStaticPieces(tower);}
  // Pick the surfaces the visitor actually sees, including the gaps between wings.
  const selectables=[],towerOwner=new Map();
  for(const tower of model.towers)tower.traverse(o=>{
    if(o.isMesh&&(!o.isInstancedMesh||o.name.startsWith('35 residential floor plates'))){
      selectables.push(o);towerOwner.set(o,tower);
    }
  });
  model.root.updateMatrixWorld(true);
  const siteTouches=[];
  for(const [part,role] of [[model.businessPark,'business'],[model.podium,'podium']]){
    part.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;
      const p=new T.Mesh(o.geometry,o.material);p.matrixAutoUpdate=false;p.matrixWorld.copy(o.matrixWorld);p.userData.siteRole=role;siteTouches.push(p);
    });
  }
  model.land.remove(model.businessPark);mergeStaticPieces(model.businessPark);mergeStaticPieces(model.land);model.land.add(model.businessPark);mergeStaticPieces(model.context);scene.add(model.root,model.context);model.root.updateMatrixWorld(true);
  model.context.children.find(x=>x.name==='Context ground')?.material.color.set(0x77876b);
  const ground=new T.Mesh(new T.PlaneGeometry(2800,2800),new T.MeshStandardMaterial({color:0x8c9981,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-3.1;ground.receiveShadow=true;scene.add(ground);
  const ring=new T.Mesh(new T.RingGeometry(20,20.35,96),new T.MeshBasicMaterial({color:0xf0d69b,side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=1.4;ring.visible=false;scene.add(ring);
  renderer.shadowMap.needsUpdate=true;
  const pickMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const poolPick=new T.Mesh(new T.PlaneGeometry(39,13),pickMaterial);poolPick.rotation.x=-Math.PI/2;poolPick.position.set(0,12.65,64);poolPick.userData.walkZone='pool';poolPick.updateMatrixWorld();
  const gardenPick=new T.Mesh(new T.PlaneGeometry(130,26.5),pickMaterial);gardenPick.rotation.x=-Math.PI/2;gardenPick.position.set(0,1.3,25.75);gardenPick.userData.walkZone='garden';gardenPick.updateMatrixWorld();
  let dirty=true,flight=null,mode='overview',overviewSnapshot=null,high=false,composer=null,ssao=null,qualityRequest=0;
  let width=1,height=1,frames=0,lastTick=0,lastRender=0,ready=false,renderCost=0,costSamples=0,invalidation=0;
  const invalidate=()=>{dirty=true;invalidation++;};
  document.addEventListener('floor-plan-open',()=>{pauseOrbit();if(mode!=='overview')exitWalk();});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presets={courtyard:{pos:[0,45,171],target:[0,49,-10],fov:55,title:'The residential courtyard'},aerial:{pos:[-195,175,265],target:[0,31,4],title:'Aerial perspective'},street:{pos:[-28,19,166],target:[18,10,67],title:'The boulevard entrance'},plan:{pos:[0,355,22],target:[0,2,18],title:'Site plan · brochure p. 27'}};
  const walk=new WalkthroughController({camera,canvas,scene,obstacles:model.walkObstacles,invalidate,onEnterRequest:enterWalk,onExit:exitWalk,announce});
  function fitted(p,target){const a=new T.Vector3(...p),c=new T.Vector3(...target);if(camera.aspect<1.2)a.sub(c).multiplyScalar(Math.min(1.7,1.2/camera.aspect)).add(c);return a;}
  function pauseOrbit(){controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');$('#rotate').setAttribute('aria-label','Start 360 degree rotation');}
  function clear(){ring.visible=false;$('#tower').value='';$$('.place').forEach(b=>b.classList.remove('active'));}
  function fly(pos,target,{type='overview',fov=39,onComplete=null,duration=1100}={}){
    pauseOrbit();flight={start:performance.now(),from:camera.position.clone(),to:pos instanceof T.Vector3?pos:new T.Vector3(...pos),fromTarget:mode==='overview'?controls.target.clone():camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(10)),toTarget:new T.Vector3(...target),fromFov:camera.fov,toFov:fov,type,onComplete,duration:reduced?1:duration};invalidate();
  }
  function enterWalk(zone,point=null,options={}){
    if(!ZONES[zone])return;
    $('#viewer').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
    if(mode==='overview')overviewSnapshot={position:camera.position.clone(),target:controls.target.clone()};
    pauseOrbit();controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.enabled=false;clear();
    const entry=walk.prepare(zone,options.tour?null:point);mode='entering';
    $('#view-name').textContent=ZONES[zone].title+' · Walkthrough';$('#side-title').textContent=ZONES[zone].title;
    $('#side-description').textContent=zone==='pool'?'Walk around the patterned pool, timber deck and colonnade, reconstructed from the poolside renders.':'Explore the garden paths, palm avenue and fountain at walking height.';
    $$('button[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
    fly(entry.position,entry.target,{type:'entry',fov:64,duration:1600,onComplete:()=>{mode='walk';walk.activate(options);canvas.dataset.walkPosition=entry.position.map(n=>n.toFixed(2)).join(',');canvas.focus({preventScroll:true});}});
  }
  function leaveWalk(){walk.deactivate();mode='overview';$('#viewer').dataset.mode='overview';controls.enabled=true;controls.target.copy(camera.position).add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(10));camera.fov=39;camera.updateProjectionMatrix();}
  function exitWalk(){if(mode==='overview')return;const saved=overviewSnapshot;leaveWalk();$('#view-name').textContent='Overview';if(saved)fly(saved.position,saved.target);else chooseView('courtyard');announce('Returned to the overview.');}
  function chooseView(name){if(mode!=='overview')leaveWalk();clear();const v=presets[name];fly(fitted(v.pos,v.target),v.target,{fov:v.fov??39});$('#view-name').textContent=v.title;$$('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));canvas.dataset.view=name;$('#side-title').textContent=name==='plan'?'The development':'The residences';$('#side-description').textContent='Explore the exterior, or tap the pool and courtyard to walk through the outdoor spaces.';$('.place[data-place="residences"]').classList.add('active');announce(v.title);}
  $$('button[data-view]').forEach(b=>b.onclick=()=>chooseView(b.dataset.view));$('#reset').onclick=()=>chooseView('courtyard');
  $$('[data-enter-walk]').forEach(b=>b.onclick=()=>enterWalk(b.dataset.enterWalk));
  $('#start-guided-overview').onclick=()=>enterWalk('pool',null,{tour:true});
  function zoom(f){if(mode!=='overview')return;flight=null;pauseOrbit();camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);controls.update();invalidate();}
  $('#zoom-in').onclick=()=>zoom(.84);$('#zoom-out').onclick=()=>zoom(1.18);
  $('#rotate').onclick=()=>{flight=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));$('#rotate').setAttribute('aria-label',controls.autoRotate?'Pause 360 degree rotation':'Start 360 degree rotation');invalidate();};
  controls.addEventListener('start',()=>{if(mode==='overview'){flight=null;pauseOrbit();invalidate();}});controls.addEventListener('change',invalidate);
  $('#context').onclick=()=>{const blocks=model.context.getObjectByName('Illustrative city blocks');blocks.visible=!blocks.visible;$('#context').setAttribute('aria-pressed',String(blocks.visible));renderer.shadowMap.needsUpdate=true;invalidate();};
  const lighting=createArchitecturalLighting({scene,renderer,sun,ambient,fill,sky,nightSky:daylightSky,model,
    maps:Object.fromEntries(entries),invalidate,announce});
  document.querySelectorAll('[data-lighting]').forEach(button=>button.onclick=()=>lighting.set(button.dataset.lighting));
  lighting.set('day');

  async function setHigh(enabled){
    const request=++qualityRequest;high=enabled;$('#quality').setAttribute('aria-pressed',String(high));$('#quality strong').textContent=high?'Loading…':'Balanced';
    if(high&&!composer){try{const[{EffectComposer},{RenderPass},{SSAOPass},{OutputPass}]=await Promise.all([import('./vendor/addons/postprocessing/EffectComposer.js'),import('./vendor/addons/postprocessing/RenderPass.js'),import('./vendor/addons/postprocessing/SSAOPass.js'),import('./vendor/addons/postprocessing/OutputPass.js')]);composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ssao=new SSAOPass(scene,camera,width,height,12);ssao.kernelRadius=3;ssao.minDistance=.0004;ssao.maxDistance=.025;composer.addPass(ssao);composer.addPass(new OutputPass());composer.setSize(width,height);}catch(e){if(request===qualityRequest)high=false;announce('Balanced detail remains active for smoother navigation.');}}
    if(request!==qualityRequest)return;$('#quality strong').textContent=high?'High':'Balanced';$('#quality').setAttribute('aria-pressed',String(high));invalidate();
  }
  $('#quality').setAttribute('aria-pressed','false');$('#quality strong').textContent='Balanced';$('#quality').onclick=()=>setHigh(!high);
  const elevation=createTowerElevation({renderer,canvas,environment:scene.environment,
    open(background,selected){
      const rect=canvas.getBoundingClientRect(),bounds=new T.Box3().setFromObject(selected);
      const center=bounds.getCenter(new T.Vector3()).project(camera);
      const top=new T.Vector3(selected.position.x,bounds.max.y,selected.position.z).project(camera);
      const bottom=new T.Vector3(selected.position.x,bounds.min.y,selected.position.z).project(camera);
      selected.visible=false;
      try{
        renderer.render(scene,camera);
        background.width=canvas.width;background.height=canvas.height;
        background.getContext('2d').drawImage(canvas,0,0);
      }finally{selected.visible=true;}
      flight=null;pauseOrbit();controls.enabled=false;
      return {x:rect.left+(center.x+1)*rect.width/2,y:rect.top+(1-center.y)*rect.height/2,
        height:Math.abs(top.y-bottom.y)*rect.height/2};
    },
    close(){controls.enabled=true;$('#tower').value='';resize();renderer.shadowMap.needsUpdate=true;invalidate();}
  });
  function focusTower(id){
    if(!id){chooseView('courtyard');return;}
    const selected=id==='business'?model.businessPark:model.towers.find(tower=>tower.userData.towerId===id);
    if(!selected)return;
    if(mode!=='overview')leaveWalk();
    elevation.show(id,selected);
  }
  $('#tower').onchange=e=>focusTower(e.target.value);
  document.addEventListener('switch-elevation-tower',event=>focusTower(event.detail));
  $$('[data-place]').forEach(b=>b.onclick=()=>{const id=b.dataset.place;if(id==='residences'){chooseView('courtyard');return;}if(id==='pool'||id==='garden'){enterWalk(id);return;}if(mode!=='overview')leaveWalk();clear();b.classList.add('active');const p=places.find(p=>p.id===id),[x,y,z]=p.pos;fly([x-38,y+46,z+88],[x,y+5,z]);$('#view-name').textContent=p.title;$('#side-title').textContent=p.title;$('#side-description').textContent=p.text;invalidate();});
  const ray=new T.Raycaster();let pointerDown=null;
  canvas.addEventListener('pointerdown',e=>{if(!elevation.active&&mode==='overview')pointerDown={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(elevation.active||mode!=='overview'||!pointerDown)return;const start=pointerDown;pointerDown=null;if(e.button!==0||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects([...selectables,...siteTouches,poolPick,gardenPick],false)[0];if(!hit)return;
    if(hit.object.userData.walkZone){enterWalk(hit.object.userData.walkZone,hit.point);return;}
    const tower=towerOwner.get(hit.object),role=hit.object.userData.siteRole;
    if(!tower&&role!=='business')return;
    focusTower(tower?.userData.towerId??'business');});
  canvas.addEventListener('pointercancel',()=>pointerDown=null);
  canvas.addEventListener('keydown',e=>{if(elevation.active||mode!=='overview'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){chooseView('courtyard');return;}if(['+','=','-'].includes(e.key)){zoom(e.key==='-'?1.12:.9);return;}flight=null;pauseOrbit();const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.1;if(e.key==='ArrowRight')s.theta+=.1;if(e.key==='ArrowUp')s.phi=Math.max(.03,s.phi-.08);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI/2-.03,s.phi+.08);camera.position.copy(new T.Vector3().setFromSpherical(s).add(controls.target));controls.update();invalidate();});
  function resize(){if(elevation.active){elevation.resize();return;}width=viewport.clientWidth;height=viewport.clientHeight;const previousAspect=camera.aspect;camera.aspect=width/height;
    if(ready&&mode==='overview'&&!flight){
      const fit=aspect=>Math.max(1,Math.min(1.7,1.2/aspect));
      camera.position.sub(controls.target).multiplyScalar(fit(camera.aspect)/fit(previousAspect)).add(controls.target);
      controls.update();
    }
    camera.updateProjectionMatrix();renderer.setSize(width,height,false);composer?.setSize(width,height);invalidate();}
  new ResizeObserver(resize).observe(viewport);camera.fov=presets.courtyard.fov;resize();controls.target.set(...presets.courtyard.target);camera.position.copy(fitted(presets.courtyard.pos,presets.courtyard.target));controls.update();canvas.dataset.view='courtyard';$('#viewer').dataset.mode='overview';
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#viewer').requestFullscreen();}catch{announce('Fullscreen is unavailable in this browser.');}};document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');resize();});if(!document.fullscreenEnabled)$('#fullscreen').hidden=true;
  const hotspotPositions=[{id:'#pool-hotspot',point:new T.Vector3(0,15.5,64)},{id:'#garden-hotspot',point:new T.Vector3(0,4,24)}],projected=new T.Vector3();
  const buildings=towerLayout.map(t=>({id:t.id,name:t.name,anchor:new T.Vector3(t.x,113,t.z)}));
  buildings.push({id:'business',name:model.businessPark.name,anchor:model.businessPark.position.clone().add(new T.Vector3(0,104,0))});
  const roofLabels=buildings.map(({id,name,anchor})=>{
    const label=document.createElement('span');
    label.className='roof-label';
    const caption=document.createElement('button');caption.type='button';caption.setAttribute('aria-label','Explore '+name+' levels');caption.onclick=()=>focusTower(id);
    caption.className='roof-caption';caption.textContent=name;
    const arrow=document.createElement('span');
    arrow.className='roof-arrow';arrow.setAttribute('aria-hidden','true');
    arrow.onclick=()=>focusTower(id);label.append(caption,arrow);viewport.append(label);
    return {label,caption,anchor};
  });
  function updateRoofLabels(){
    const visible=[];
    for(const marker of roofLabels){
      projected.copy(marker.anchor).project(camera);
      const x=(1+projected.x)*width/2,y=(1-projected.y)*height/2-3;
      marker.label.hidden=projected.z < -1||projected.z>1||x<0||x>width||y<0||y>height;
      if(!marker.label.hidden)visible.push({...marker,x,y});
    }
    // The arrow tip always tracks the roof. Stack just the captions when
    // buildings line up in projection, including on narrow screens.
    const placed=[];
    for(const {label,caption,x,y} of visible.sort((a,b)=>b.y-a.y)){
      const w=caption.offsetWidth,h=caption.offsetHeight;
      const left=Math.max(2,Math.min(width-w-2,x-w/2));
      let top=y-19-h;
      for(const box of placed){
        if(left<box.right+3&&left+w>box.left-3&&top<box.bottom+3&&top+h>box.top-3)top=box.top-h-4;
      }
      top=Math.max(2,top);
      placed.push({left,right:left+w,top,bottom:top+h});
      placed.sort((a,b)=>b.top-a.top);
      label.style.transform='translate('+x+'px,'+y+'px)';
      caption.style.left=(left-x)+'px';caption.style.top=(top-y)+'px';
      label.style.setProperty('--stem',Math.max(0,y-top-h-15)+'px');
    }
  }
  function updateHotspots(){updateRoofLabels();const visible=[];for(const h of hotspotPositions){const node=$(h.id);projected.copy(h.point).project(camera);const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;node.hidden=mode!=='overview'||$('button[data-view="plan"]').getAttribute('aria-pressed')==='true'||projected.z>1||x<30||x>width-30||y<75||y>height-135;if(!node.hidden)visible.push({node,x,y});}if(visible.length===2&&Math.abs(visible[0].x-visible[1].x)<135&&Math.abs(visible[0].y-visible[1].y)<35)visible[1].y-=39;for(const h of visible){h.node.style.left=h.x+'px';h.node.style.top=h.y+'px';}}
  function draw(now){
    requestAnimationFrame(draw);if(document.hidden||elevation.active){lastTick=now;return;}const dt=Math.min((now-(lastTick||now))/1000,.06);lastTick=now;
    if(flight){const f=flight,t=Math.min((now-f.start)/f.duration,1),v=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.position.lerpVectors(f.from,f.to,v);const target=new T.Vector3().lerpVectors(f.fromTarget,f.toTarget,v);camera.fov=T.MathUtils.lerp(f.fromFov,f.toFov,v);camera.updateProjectionMatrix();if(f.type==='overview')controls.target.copy(target);else camera.lookAt(target);dirty=true;if(t===1){flight=null;f.onComplete?.();}}
    if(mode==='overview'&&controls.update())dirty=true;
    if(mode==='walk'&&walk.update(dt))dirty=true;
    walk.tickRecording(now);
    if(!dirty&&walk.recorder?.state!=='recording')return;
    if(ready&&now-lastRender<1000/30)return;lastRender=now;
    for(const detail of fineDetails)detail.mesh.visible=camera.position.distanceTo(detail.position)<100;
    const start=performance.now(),drawnRevision=invalidation;
    if(high&&composer)composer.render();else renderer.render(scene,camera);
    const cost=performance.now()-start;renderCost+=cost;costSamples++;
    if(costSamples>=45){const average=renderCost/costSamples;canvas.dataset.renderMs=average.toFixed(1);if(average>28&&pixelRatio>.8&&!walk.recorder){pixelRatio=Math.max(.8,pixelRatio-.15);renderer.setPixelRatio(pixelRatio);resize();if(high)setHigh(false);}renderCost=0;costSamples=0;}
    frames++;canvas.dataset.frames=String(frames);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.mode=mode;
    if(frames%3===0){canvas.dataset.azimuth=controls.getAzimuthalAngle().toFixed(3);canvas.dataset.distance=camera.position.distanceTo(controls.target).toFixed(1);$('#compass-arrow').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;}
    updateHotspots();dirty=drawnRevision!==invalidation||!!flight||controls.autoRotate||!!(walk.active&&(walk.keys.size||walk.path.length||walk.tour?.running));
    if(!ready){ready=true;$('#loading').hidden=true;canvas.dataset.modelReady='true';canvas.dataset.towers=String(model.towers.length);canvas.dataset.textured='true';announce('3D scene ready. Tap the pool or courtyard to enter a walkthrough.');}
  }
  requestAnimationFrame(draw);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();walk.deactivate();$('#error').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
}
