import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RGBELoader} from './vendor/addons/loaders/RGBELoader.js';
import {Sky} from './vendor/addons/objects/Sky.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {SSAOPass} from './vendor/addons/postprocessing/SSAOPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {ShaderPass} from './vendor/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from './vendor/addons/shaders/FXAAShader.js';
import {buildSite,setArchitecturalMaterials,towerLayout,places} from './model.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const announce=s=>$('#announcement').textContent=s;
$('#open-reference').onclick=()=>$('#references').showModal();$('#close-reference').onclick=()=>$('#references').close();
$$('[data-ref]').forEach(b=>b.onclick=()=>{$('#reference-image').src='assets/'+b.dataset.ref;$$('[data-ref]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)));});
init().catch(e=>{console.error('3D scene initialization failed',e);$('#loading').hidden=true;$('#error').hidden=false;});

async function init(){
  const canvas=$('#scene'),viewport=$('#viewport');
  const mobile=innerWidth<800;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const loader=new T.TextureLoader();
  const load=async(name,color=true,repeat=null)=>{const tex=await loader.loadAsync('assets/'+name);tex.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}return tex;};
  const textureEntries=await Promise.all([
    load('facade-center.jpg').then(t=>['center',t]),load('facade-left.jpg').then(t=>['left',t]),load('facade-right.jpg').then(t=>['right',t]),load('stone.jpg',true,[2,8]).then(t=>['stone',t]),load('stone-bump.jpg',false,[12,12]).then(t=>['bump',t]),load('grass.jpg',true,[45,30]).then(t=>['grass',t]),load('water-bump.jpg',false,[7,7]).then(t=>['water',t]),load('asphalt.jpg',true,[40,3]).then(t=>['asphalt',t])
  ]);setArchitecturalMaterials(Object.fromEntries(textureEntries));
  $('#loading-message').textContent='Building the textured 3D exterior…';
  const scene=new T.Scene();scene.background=new T.Color(0xb5d6e7);scene.fog=new T.Fog(0xb6cad0,470,1250);
  const camera=new T.PerspectiveCamera(39,1,1,1800);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI/2-.025;controls.minPolarAngle=.025;controls.minDistance=38;controls.maxDistance=690;controls.autoRotateSpeed=.62;controls.zoomSpeed=.72;
  const sky=new Sky();sky.scale.setScalar(1300);const u=sky.material.uniforms;u.turbidity.value=4;u.rayleigh.value=1.4;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.78;const sunDirection=new T.Vector3(-.5,.8,.6).normalize();u.sunPosition.value.copy(sunDirection);scene.add(sky);
  const pmrem=new T.PMREMGenerator(renderer);
  try{const hdr=await new RGBELoader().loadAsync('assets/environment.hdr');hdr.mapping=T.EquirectangularReflectionMapping;scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.72;scene.background=hdr;scene.backgroundIntensity=.9;scene.backgroundBlurriness=.015;sky.visible=false;}catch(e){scene.environment=pmrem.fromScene(sky,.04).texture;scene.environmentIntensity=.7;console.warn('Using physical sky lighting fallback.');}pmrem.dispose();
  const hemi=new T.HemisphereLight(0xe2f1ff,0x6b7256,.85);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe6c2,2.7);sun.position.set(-180,240,175);sun.castShadow=true;sun.shadow.mapSize.set(mobile?2048:4096,mobile?2048:4096);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:10,far:650});sun.shadow.bias=-.00015;sun.shadow.normalBias=.15;sun.shadow.radius=2;scene.add(sun);
  const fill=new T.DirectionalLight(0xd6eaff,.28);fill.position.set(100,100,-200);scene.add(fill);
  const model=buildSite();scene.add(model.root,model.context);model.root.updateMatrixWorld(true);
  // A fully geometric ground and neighborhood; the sky is only illumination.
  model.context.children.find(x=>x.name==='Context ground')?.material.color.set(0x77876b);
  const ground=new T.Mesh(new T.PlaneGeometry(2800,2800),new T.MeshStandardMaterial({color:0x8c9981,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-3.1;ground.receiveShadow=true;scene.add(ground);
  const ring=new T.Mesh(new T.RingGeometry(20,20.35,96),new T.MeshBasicMaterial({color:0xf0d69b,side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=1.4;ring.visible=false;scene.add(ring);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const ssao=new SSAOPass(scene,camera,1,1,16);ssao.kernelRadius=4;ssao.minDistance=.0004;ssao.maxDistance=.025;ssao.enabled=!mobile;composer.addPass(ssao);composer.addPass(new OutputPass());const fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);
  let high=!mobile,warm=false,flight=null,frame=0,ready=false;
  $('#quality').setAttribute('aria-pressed',String(high));$('#quality strong').textContent=high?'High':'Standard';
  const presets={courtyard:{pos:[-9,64,255],target:[0,49,-14],title:'The residential courtyard'},aerial:{pos:[-195,175,265],target:[0,31,4],title:'Aerial perspective'},street:{pos:[-175,66,238],target:[0,40,33],title:'The boulevard'},plan:{pos:[0,365,12],target:[0,0,8],title:'Concept site plan'}};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fitted(p,target){const a=new T.Vector3(...p),c=new T.Vector3(...target);if(camera.aspect<1.2)a.sub(c).multiplyScalar(Math.min(1.7,1.2/camera.aspect)).add(c);return a;}
  function pauseOrbit(){controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');$('#rotate').setAttribute('aria-label','Start 360 degree rotation');}
  function fly(pos,target){pauseOrbit();flight={start:performance.now(),from:camera.position.clone(),to:pos instanceof T.Vector3?pos:new T.Vector3(...pos),fromTarget:controls.target.clone(),toTarget:new T.Vector3(...target)};if(reduced){camera.position.copy(flight.to);controls.target.copy(flight.toTarget);flight=null;}}
  function clear(){ring.visible=false;$('#tower').value='';$$('.place').forEach(b=>b.classList.remove('active'));}
  function chooseView(name){clear();const v=presets[name];fly(fitted(v.pos,v.target),v.target);$('#view-name').textContent=v.title;$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));canvas.dataset.view=name;$('#side-title').textContent=name==='plan'?'The development':'The residences';$('#side-description').textContent=name==='plan'?'A concept layout of the towers, courtyard and amenity podium.': 'A textured 3D reconstruction with recessed facades, projecting balconies and tiered green cupolas.';$('.place[data-place="residences"]').classList.add('active');announce(v.title);}
  $$('[data-view]').forEach(b=>b.onclick=()=>chooseView(b.dataset.view));$('#reset').onclick=()=>chooseView('courtyard');
  function zoom(f){flight=null;pauseOrbit();camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);controls.update();}
  $('#zoom-in').onclick=()=>zoom(.84);$('#zoom-out').onclick=()=>zoom(1.18);
  $('#rotate').onclick=()=>{flight=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));$('#rotate').setAttribute('aria-label',controls.autoRotate?'Pause 360 degree rotation':'Start 360 degree rotation');announce(controls.autoRotate?'360 degree rotation started':'Rotation paused');};
  controls.addEventListener('start',()=>{flight=null;pauseOrbit();});
  $('#context').onclick=()=>{model.context.visible=!model.context.visible;$('#context').setAttribute('aria-pressed',String(model.context.visible));};
  $('#lighting').onclick=()=>{warm=!warm;$('#lighting').setAttribute('aria-pressed',String(warm));$('#lighting span').textContent=warm?'Warm light':'Daylight';sun.color.set(warm?0xffba75:0xffe6c2);sun.position.set(-180,warm?115:240,175);sun.intensity=warm?2.5:2.7;u.sunPosition.value.set(-.5,warm?.3:.8,.6).normalize();renderer.toneMappingExposure=warm?.94:1;};
  $('#quality').onclick=()=>{high=!high;ssao.enabled=high;$('#quality').setAttribute('aria-pressed',String(high));$('#quality strong').textContent=high?'High':'Standard';};
  function focusTower(id){clear();if(!id){chooseView('courtyard');return;}const t=towerLayout.find(x=>x.id===id),dir=new T.Vector3(-t.x,0,70-t.z).normalize();ring.position.set(t.x,1.4,t.z);ring.visible=true;$('#tower').value=id;fly([t.x+dir.x*110,72,t.z+dir.z*110],[t.x,53,t.z]);$('#view-name').textContent=`Tower ${id} · Exterior`;$('#side-title').textContent=`Tower ${id}`;$('#side-description').textContent='Recessed facade volumes, balconies, stone piers and cupola. Tower labels and floor counts are illustrative.';$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));announce(`Tower ${id} exterior selected`);}
  $('#tower').onchange=e=>focusTower(e.target.value);
  $$('[data-place]').forEach(b=>b.onclick=()=>{if(b.dataset.place==='residences'){chooseView('courtyard');return;}clear();b.classList.add('active');const p=places.find(p=>p.id===b.dataset.place);const [x,y,z]=p.pos;fly([x-38,y+46,z+88],[x,y+5,z]);$('#view-name').textContent=p.title;$('#side-title').textContent=p.title;$('#side-description').textContent=p.text;$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));announce(p.title);});
  const ray=new T.Raycaster();let down=null;
  canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{if(!down||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(model.towers,true)[0];if(hit){let a=hit.object;while(a&&!a.userData.towerId)a=a.parent;if(a)focusTower(a.userData.towerId);}down=null;});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){chooseView('courtyard');return;}if(['+','=','-'].includes(e.key)){zoom(e.key==='-'?1.12:.9);return;}flight=null;pauseOrbit();const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.1;if(e.key==='ArrowRight')s.theta+=.1;if(e.key==='ArrowUp')s.phi=Math.max(.03,s.phi-.08);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI/2-.03,s.phi+.08);camera.position.copy(new T.Vector3().setFromSpherical(s).add(controls.target));controls.update();});
  function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);ssao.setSize(w,h);const ratio=renderer.getPixelRatio();fxaa.material.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio));}
  new ResizeObserver(resize).observe(viewport);resize();controls.target.set(...presets.courtyard.target);camera.position.copy(fitted(presets.courtyard.pos,presets.courtyard.target));controls.update();canvas.dataset.view='courtyard';
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#viewer').requestFullscreen();}catch{announce('Fullscreen is unavailable in this browser.');}};document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');resize();});if(!document.fullscreenEnabled)$('#fullscreen').hidden=true;
  function draw(now){requestAnimationFrame(draw);if(document.hidden)return;if(flight){const t=Math.min((now-flight.start)/1050,1),v=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.position.lerpVectors(flight.from,flight.to,v);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,v);if(t===1)flight=null;}controls.update();composer.render();if(frame++%5===0){$('#compass-arrow').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;canvas.dataset.azimuth=controls.getAzimuthalAngle().toFixed(3);canvas.dataset.distance=camera.position.distanceTo(controls.target).toFixed(1);}if(!ready){ready=true;$('#loading').hidden=true;canvas.dataset.modelReady='true';canvas.dataset.towers=String(model.towers.length);canvas.dataset.textured='true';announce('Textured 3D architecture loaded. Drag to orbit freely.');}}
  requestAnimationFrame(draw);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;});
}
