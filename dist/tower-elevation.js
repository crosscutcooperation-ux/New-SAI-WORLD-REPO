import {LIGHTING_PRESETS} from './architectural-lighting.js?v=original-day-2';
import * as T from './vendor/three.module.js';
import {BUILDINGS,resolvePlan} from './floor-plan-data.js?v=block-floors-1';

export function createTowerElevation({renderer,canvas,environment,open,close}){
  const byId=id=>document.getElementById(id);
  const dialog=byId('elevation'),stage=byId('elevation-stage'),rail=byId('elevation-levels'),bands=byId('elevation-bands');
  const railNav=rail.parentElement;
  const highlight=document.createElement('i');
  const overviewLabel=canvas.getAttribute('aria-label');
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,600);
  scene.environment=environment;
  const ambient=new T.HemisphereLight(0xfff2da,0x8292a4,1.55);scene.add(ambient);
  const keyLight=new T.DirectionalLight(0xffe3ba,2.05);
  scene.add(keyLight,keyLight.target);
  let building=null,mesh=null,parent=null,level=9,home=null;
  let buttons=[],slices=[],transition=null,closing=false,pending=null,origin=null;
  const switcher=document.createElement('select');
  switcher.setAttribute('aria-label','Choose a building');
  switcher.className='elevation-switcher';
  for(const item of BUILDINGS){
    const option=document.createElement('option');
    option.value=item.sceneId??item.id;option.textContent=item.name;
    switcher.append(option);
  }
  byId('leave-elevation').insertAdjacentElement('afterend',switcher);
  function siteTransform(){
    const rect=stage.getBoundingClientRect();
    const scale=Math.max(.04,Math.min(2,origin.height/(rect.height*.93)));
    return 'translate('+ (origin.x-rect.left-rect.width/2)+'px,'+(origin.y-rect.top-rect.height/2)+'px) scale('+scale+')';
  }
  function leave(next){
    pending=next;
    if(closing)return;
    closing=true;
    const motion=matchMedia('(prefers-reduced-motion: reduce)').matches?180:650;
    const animation=canvas.animate([
      {transform:'translate(0, 0) scale(1)',opacity:1},
      {transform:siteTransform(),opacity:0}
    ],{duration:motion,easing:'cubic-bezier(.55,0,.8,.25)',fill:'forwards'});
    animation.finished.then(()=>{
      dialog.close();animation.cancel();

    });
  }
  switcher.onchange=()=>leave(switcher.value);
  dialog.addEventListener('cancel',event=>{event.preventDefault();leave();});
  function updateLighting(detail){
    const name=detail?.name??byId('scene').dataset.lighting??'day';
    const p=LIGHTING_PRESETS[name];
    if(detail?.environment)scene.environment=detail.environment;
    scene.environmentIntensity=name==='day'?1:p.environment;
    ambient.intensity=name==='night'?.32:name==='evening'?.68:1.55;
    ambient.color.set(name==='night'?0x9bb2da:name==='day'?0xfff2da:0xffefd7);
    keyLight.intensity=name==='night'?.35:name==='evening'?1.15:2.05;
    keyLight.color.set(name==='day'?0xffe3ba:p.color);dialog.dataset.lighting=name;
    resize();
  }
  document.addEventListener('architectural-lighting-change',event=>updateLighting(event.detail));
  const format=n=>n===0?'G':String(n).padStart(2,'0');

  function preview(n){
    if(!building)return;
    buttons[level]?.removeAttribute('aria-current');
    level=n;
    buttons[n].setAttribute('aria-current','true');
    if(slices[n]){
      highlight.style.top=slices[n].style.top;
      highlight.style.height=slices[n].style.height;
      const top=parseFloat(slices[n].style.top),bottom=top+parseFloat(slices[n].style.height);
      byId('elevation-dim').style.setProperty('--band-top',top+'%');
      byId('elevation-dim').style.setProperty('--band-bottom',bottom+'%');
      byId('elevation-indicator').style.top=bottom+'%';
      byId('elevation-open').style.marginTop=bottom>92?'-38px':'0';
    }
    const plan=resolvePlan(building.id,n);
    byId('elevation-open').textContent=n===0?'OPEN GROUND FLOOR':'OPEN LEVEL '+format(n);
    byId('elevation-readout').textContent=n===0?'GROUND FLOOR':'LEVEL '+format(n);
    byId('elevation-tag').textContent=format(n);
    if(!slices[n])byId('elevation-indicator').style.top=((1-n/building.floors)*76+15)+'%';
    byId('elevation-note').textContent=plan.available?(plan.verified?'Floor plan available':'Typical and refuge layouts · floor assignment unconfirmed'):'Drawing unavailable';
  }
  function openPlan(n){
    preview(n);resize();
    document.dispatchEvent(new CustomEvent('open-block-floor',{detail:{id:building.id,floor:n}}));
  }
  document.addEventListener('floor-plan-close',()=>{
    if(!building)return;
    const floor=Number(byId('floor-plan-dialog').dataset.floor);
    if(buttons[floor])preview(floor);
  });
  byId('elevation-open').onclick=()=>openPlan(level);
  byId('leave-elevation').onclick=()=>leave();
  dialog.addEventListener('close',()=>{
    if(!building)return;
    parent.add(mesh);home.replaceWith(canvas);canvas.setAttribute('aria-label',overviewLabel);canvas.tabIndex=0;building=null;mesh=null;
    renderer.setClearAlpha(1);
    close();closing=false;
    if(pending){const next=pending;pending=null;document.dispatchEvent(new CustomEvent('switch-elevation-tower',{detail:next}));}
  });
  function resize(){
    if(!building||!dialog.open)return;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w||!h)return;
    const commercial=building.id==='business',angle=mesh.rotation.y+.10;
    const mid=(commercial?57:54)+mesh.position.y;
    const span=Math.max(commercial?103:117,52*h/w);
    const direction=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
    camera.top=span/2;camera.bottom=-span/2;camera.right=span*w/h/2;camera.left=-camera.right;
    camera.position.copy(mesh.position).addScaledVector(direction,180);camera.position.y=mid;
    camera.lookAt(mesh.position.x,mid,mesh.position.z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    keyLight.target.position.copy(mesh.position);keyLight.position.copy(mesh.position).addScaledVector(direction,85);
    keyLight.position.x+=45;keyLight.position.y+=110;
    renderer.setSize(w,h,false);renderer.setClearAlpha(0);renderer.render(scene,camera);
    railNav.classList.remove('aligned');
    if(commercial)return;
    
    // Project the elevation onto the same camera plane as its picking stripes.
    const facade=mesh.getObjectByProperty('name','Plan-shaped facade with projecting wings and recessed courts');
    const geom=facade.geometry;
    geom.computeBoundingBox();
    const xs=[],v=new T.Vector3();
    for(const x of [geom.boundingBox.min.x,geom.boundingBox.max.x])
      for(const z of [geom.boundingBox.min.z,geom.boundingBox.max.z]){
        v.set(x,0,z).applyMatrix4(facade.matrixWorld).project(camera);xs.push((v.x+1)*w/2);
      }
    const min=Math.min(...xs),max=Math.max(...xs);
    byId('elevation-indicator').style.left=Math.max(24,min-12)+'px';
    byId('elevation-indicator').style.right=Math.max(12,w-max-40)+'px';
    bands.style.left=min+'px';bands.style.width=(max-min)+'px';
    const base=mesh.position.y;
    for(let n=0;n<=building.floors;n++){
      const bottom=n===0?base:base+4+(n-1)*2.7;
      const top=base+4+n*2.7;
      slices[n].style.top=((mid+span/2-top)/span*100)+'%';
      slices[n].style.height=((top-bottom)/span*100)+'%';
    }
    const pitch=h*2.7/span;
    if(matchMedia('(min-width:651px) and (pointer:fine)').matches&&pitch>=12){
      const rowTop=(mid+span/2-base-98.5)*h/span;
      railNav.style.setProperty('--rail-shift',(max-w+20)+'px');
      railNav.style.setProperty('--rail-top',rowTop+'px');
      railNav.style.setProperty('--pitch',pitch+'px');
      railNav.style.setProperty('--ground-pitch',(h*4/span)+'px');
      railNav.classList.add('aligned');
    }
    preview(level);
  }
  new ResizeObserver(resize).observe(stage);
  function show(id,selected){
    const entry=BUILDINGS.find(b=>b.sceneId===id||b.id===id);
    if(!entry||dialog.open)return;
    origin=open(byId('elevation-background'),selected);building=entry;mesh=selected;parent=mesh.parent;scene.add(mesh);
    home=document.createComment('overview canvas');canvas.replaceWith(home);stage.prepend(canvas);
    switcher.value=entry.sceneId??entry.id;
    byId('elevation-name').textContent=entry.name;
    byId('elevation-index').textContent=entry.number?'RESIDENTIAL TOWER  /  '+format(entry.number):'COMMERCIAL TOWER';
    canvas.setAttribute('aria-label',entry.name+' tower elevation');canvas.tabIndex=-1;rail.replaceChildren();bands.replaceChildren(highlight);highlight.hidden=!entry.number;buttons=[];slices=[];
    for(let n=entry.floors;n>=0;n--){
      const button=document.createElement('button');button.type='button';button.textContent=format(n);
      button.style.setProperty('--reveal-delay',(0.2+(entry.floors-n)*.026)+'s');
      button.setAttribute('aria-label',n===0?'Ground floor':'Level '+n);
      button.onfocus=()=>preview(n);button.onpointerenter=e=>{if(e.pointerType==='mouse')preview(n);};
      button.onclick=()=>openPlan(n);rail.append(button);buttons[n]=button;
      if(entry.number){
        const slice=document.createElement('div');
        slice.onpointerenter=e=>{if(e.pointerType==='mouse')preview(n);};slice.onclick=()=>openPlan(n);
        slices[n]=slice;bands.append(slice);
      }
    }
    if(!entry.number){
      byId('elevation-indicator').style.left='20%';
      byId('elevation-indicator').style.right='14%';
      byId('elevation-open').style.marginTop='0';
      byId('elevation-dim').style.setProperty('--band-top','0%');
      byId('elevation-dim').style.setProperty('--band-bottom','100%');
    }
    dialog.showModal();preview(Math.min(9,entry.floors));if(!railNav.classList.contains('aligned'))buttons[level].scrollIntoView({block:'center'});
    updateLighting();
    transition?.cancel();
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?180:900;
    transition=canvas.animate([
      {transform:siteTransform(),opacity:0},
      {transform:'translate(0, 0) scale(1)',opacity:1}
    ],{duration,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  return {show,resize,get active(){return building!==null;}};
}
