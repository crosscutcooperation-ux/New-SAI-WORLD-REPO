import {ApartmentSelector} from './apartment-selector.js?v=image-rotation-1';
import {BUILDINGS,resolvePlan,SOURCE_URL} from './floor-plan-data.js?v=block-floors-1';
const $=selector=>document.querySelector(selector);
const dialog=$('#floor-plan-dialog'),buildingSelect=$('#plan-building'),floorSelect=$('#plan-floor');
let viewer=null,selectedApartment=null,mode='2d',revision=0,current=null,zoom=1,viewerModule=null;


const apartments=new ApartmentSelector({
  select(unit){
    selectedApartment=unit;revision++;mode='2d';zoom=1;
    $('#plan-drawing').style.transform='';
    setMode('2d');
  },
  toggle(){if(selectedApartment)setMode(mode==='2d'?'3d':'rotate');}
});

const options='<option value="" selected disabled>Choose a building</option>'+BUILDINGS.map(building=>`<option value="${building.id}">${building.number?'Tower '+building.number+' · ':''}${building.name}</option>`).join('');
buildingSelect.innerHTML=options;$('#dialog-building').innerHTML=options;
function syncFloors(preserve=false){
  const building=BUILDINGS.find(item=>item.id===buildingSelect.value),old=floorSelect.value;
  let content='<option value="">Choose a floor</option>';
  if(building){
    content+='<option value="0">Ground · drawing unavailable</option>';
    for(let floor=1;floor<=building.floors;floor++)content+=`<option value="${floor}">Floor ${floor}${building.id==='breeze'&&[7,12,17,22,27,32].includes(floor)?' · Refuge':''}</option>`;
  }
  floorSelect.innerHTML=content;$('#dialog-floor').innerHTML=content;
  floorSelect.disabled=!building;$('#dialog-floor').disabled=!building;
  if(preserve&&old&&Number(old)<=building?.floors)floorSelect.value=old;
  $('#dialog-building').value=buildingSelect.value;$('#dialog-floor').value=floorSelect.value;
  $('#open-floor-plan').disabled=!floorSelect.value;
  $('#plan-availability').textContent=building?(!building.page?'Floor plans are absent from the supplied PDF.':building.id==='breeze'?'Residential plans available for floors 6–35.':'Typical and refuge drawings available. Floor assignments are not specified.'):'Eight residential towers · brochure page 14';
}
function chooseBuilding(value,preserve=false){buildingSelect.value=value;$('#plan-kind').value='typical';syncFloors(preserve);if(dialog.open&&floorSelect.value)showFloor();}
buildingSelect.onchange=()=>chooseBuilding(buildingSelect.value);
$('#dialog-building').onchange=event=>{
  const previous=Number(floorSelect.value),next=BUILDINGS.find(b=>b.id===event.target.value);
  chooseBuilding(next.id);floorSelect.value=String(Math.min(previous,next.floors));showFloor();
};
floorSelect.onchange=()=>{if(floorSelect.value)showFloor();};
$('#dialog-floor').onchange=event=>{floorSelect.value=event.target.value;showFloor();};
$('#open-floor-plan').onclick=showFloor;
$('#plan-kind').onchange=showFloor;
$('#close-floor-plan').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{revision++;viewer?.setActive(false);document.dispatchEvent(new CustomEvent('floor-plan-close'));});
$('#plan-previous').onclick=()=>stepFloor(-1);$('#plan-next').onclick=()=>stepFloor(1);
function stepFloor(delta){floorSelect.value=String(Number(floorSelect.value)+delta);showFloor();}
$('#plan-zoom-in').onclick=()=>changeZoom(1.2);$('#plan-zoom-out').onclick=()=>changeZoom(1/1.2);
$('#plan-fit').onclick=()=>{zoom=1;$('#plan-drawing').style.transform='';viewer?.reset();};
function changeZoom(factor){if(mode==='rotate'||(mode==='3d'&&!selectedApartment?.renderPair))viewer?.zoom(1/factor);else{zoom=Math.max(.65,Math.min(4,zoom*factor));$('#plan-drawing').style.transform=`scale(${zoom})`;}}
for(const button of document.querySelectorAll('[data-plan-mode]'))button.onclick=()=>setMode(button.dataset.planMode);
function setMode(value){
  mode=value;
  for(const button of document.querySelectorAll('[data-plan-mode]')){
    button.setAttribute('aria-pressed',String(mode===button.dataset.planMode));
  }
  const furnished=Boolean(selectedApartment?.renderPair);
  document.querySelector('[data-plan-mode="rotate"]').hidden=!furnished;
  const interactive=mode==='rotate'||(mode==='3d'&&!furnished);
  $('#plan-2d').hidden=interactive;
  $('#plan-3d').hidden=!interactive;
  $('#plan-cutaway-note').hidden=furnished||!interactive;
  viewer?.setActive(interactive&&dialog.open);
  $('#plan-loading').hidden=true;
  const request=++revision;
  if(furnished&&!interactive){
    $('#plan-view-help').textContent=mode==='2d'?'Original supplied drawing · use + / − to zoom':'Photorealistic furnished preview · click to open the 3D model';
    $('.apartment-instruction').textContent=mode==='2d'?'Tap the plan for the furnished 3D image.':'Tap the preview to explore the furnished 3D model.';
    apartments.reveal.show(mode==='3d').catch(()=>{
      if(request!==revision)return;
      setMode('2d');$('#plan-view-help').textContent='The furnished image could not load. Tap to retry.';
    });
    apartments.fit();return;
  }
  $('#plan-view-help').textContent=mode==='rotate'?'Furnished 3D model · drag to orbit · scroll to zoom':
    interactive?'Drag to orbit · scroll to zoom · right-drag to pan':'Original supplied drawing · use + / − to zoom';
  $('.apartment-instruction').textContent=mode==='rotate'?'Explore the raised walls, furniture and fittings. Drag to orbit.':
    mode==='2d'?'Tap the plan for the furnished 3D image.':'Drag to orbit the floor plan.';
  if(interactive&&current?.available){
    load3d(furnished?selectedApartment.renderPair:selectedApartment?.key??current.key,request,mode==='rotate');
  }else apartments.fit();
}
async function load3d(key,request,furnishedModel){
  const status=$('#plan-loading');status.hidden=false;
  status.textContent=furnishedModel?'Building the furnished 3D view…':'Preparing the 3D floor plan…';
  try{
    viewerModule??=import('./floor-plan-viewer.js?v=volume-popup-2');
    const {FloorPlanViewer}=await viewerModule;
    if(request!==revision||!dialog.open||!['3d','rotate'].includes(mode))return;
    viewer??=new FloorPlanViewer($('#floor-plan-canvas'));
    viewer.setActive(true);
    if(furnishedModel)await viewer.loadModel(key);else await viewer.load(key);
    if(request===revision)status.hidden=true;
  }catch(error){
    if(request===revision){
      status.hidden=false;status.textContent='This view could not load. Choose 3D plan or 2D plan to return.';
    }
    console.error(error);
  }
}
function showFloor(){
  const building=BUILDINGS.find(item=>item.id===buildingSelect.value),floor=Number(floorSelect.value);
  if(!building||floorSelect.value==='')return;
  $('#open-floor-plan').disabled=false;$('#dialog-floor').value=String(floor);$('#dialog-building').value=building.id;
  selectedApartment=null;mode='2d';apartments.clear();
  current=resolvePlan(building.id,floor,$('#plan-kind').value);const request=++revision;
  const inElevation=Boolean(document.querySelector('#elevation[open]'));
  $('#dialog-building').disabled=inElevation;dialog.classList.toggle('from-elevation',inElevation);
  const rail=$('#floor-levels');rail.replaceChildren();
  for(let n=building.floors;n>=0;n--){
    const button=document.createElement('button');button.type='button';
    button.textContent=n===0?'G':String(n).padStart(2,'0');button.setAttribute('aria-label','View floor '+n);
    button.setAttribute('aria-current',String(n===floor));
    button.onclick=()=>{floorSelect.value=String(n);showFloor();};rail.append(button);
  }
  if(!dialog.open){
    const source=document.querySelector('#scene'),background=$('#plan-background');
    background.width=source.width;background.height=source.height;
    background.getContext('2d').drawImage(source,0,0);
    document.dispatchEvent(new CustomEvent('floor-plan-open'));dialog.showModal();}
  $('#plan-building-name').textContent=building.number?'Tower '+building.number+' · '+building.name:building.name;
  $('#plan-title').textContent=floor===0?'GROUND FLOOR':'LEVEL '+String(floor).padStart(2,'0');
  $('#plan-note').textContent=current.note??current.reason;
  $('#plan-kind-label').hidden=building.id==='breeze'||!current.available;
  $('#plan-previous').disabled=floor===0;$('#plan-next').disabled=floor===building.floors;
  $('#plan-source').href=SOURCE_URL;$('#plan-source').textContent=current.available?'Source PDF · page '+current.page+' ↗':'Open supplied plan PDF ↗';
  $('.plan-modes').hidden=!current.available;
  $('#plan-empty').hidden=current.available;$('#plan-content').hidden=!current.available;
  $('#plan-empty-message').textContent=current.reason??'';
  $('#plan-loading').hidden=true;viewer?.setActive(false);
  if(current.available){
    const image=$('#floor-plan-image');zoom=1;image.style.transform='';
    image.alt=building.name+', floor '+floor+', '+current.kind+' floor plan from PDF page '+current.page;
    image.src='assets/plans/'+current.key+'-floor.png';setMode('2d');
    apartments.load(current.key,{building:building.name,floor,available:current.verified});
  }
  dialog.dataset.building=building.id;dialog.dataset.floor=String(floor);dialog.dataset.plan=current.key??'unavailable';
}
document.addEventListener('open-block-floor',({detail})=>{
  const building=BUILDINGS.find(item=>item.sceneId===detail.id||item.id===detail.id);
  if(!building)return;
  chooseBuilding(building.id);floorSelect.value=String(detail.floor??0);mode='2d';showFloor();
  if(detail.floor===null){
    $('#dialog-floor').value='';$('#plan-title').textContent='Floor plans';
    $('#plan-note').textContent='World Dreams Business Park';
    $('#plan-empty-message').textContent='The supplied drawings cover residential towers. A Business Park floor plan is unavailable.';
  }
});
document.addEventListener('tower-focus',event=>{
  const building=BUILDINGS.find(item=>item.sceneId===event.detail);if(building)chooseBuilding(building.id);
});
syncFloors();
