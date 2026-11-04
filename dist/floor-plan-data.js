export const BUILDINGS = [
  {id:'castle',number:1,name:'Castle',sceneId:'A',floors:35,page:1},
  {id:'vista',number:2,name:'Vista',sceneId:'B',floors:35,page:3},
  {id:'mist',number:3,name:'Mist',sceneId:'C',floors:35,page:5},
  {id:'spring',number:4,name:'Spring',sceneId:'D',floors:35,page:7},
  {id:'orchard',number:5,name:'Orchard',sceneId:'E',floors:35},
  {id:'meadows',number:6,name:'Meadows',sceneId:'F',floors:35,page:9},
  {id:'heaven',number:7,name:'Heaven',sceneId:'G',floors:35,page:10},
  {id:'breeze',number:8,name:'Breeze',sceneId:'H',floors:35,page:11},
  {id:'business',name:'World Dreams Business Park',floors:33},
];
export const SOURCE_URL='https://drive.google.com/file/d/1qTSUegvlSeu2Ng6d_7xtzUY481v0CENx/view';
export function resolvePlan(buildingId,floor,requestedKind='typical'){
  const building=BUILDINGS.find(item=>item.id===buildingId);
  if(!building||!Number.isInteger(floor)||floor<0||floor>building.floors)return {available:false,reason:'Choose a valid building and floor.'};
  if(floor===0)return {available:false,reason:'A ground floor drawing for '+building.name+' is not included in the supplied floor plans.'};
  if(!building.page)return {available:false,reason:building.id==='orchard'?'Orchard is named in the brochure, but its floor drawings are absent from the supplied plan PDF.':'The brochure lists the business complex as G+33. Its floor drawings are absent from the supplied plan PDF.'};
  if(building.id==='breeze'){
    if(floor<6)return {available:false,reason:'The supplied Breeze drawings cover residential floors 6 to 35. Floors 1 to 5 are not included.'};
    const low=floor<=9,kind=(low?floor===7:[12,17,22,27,32].includes(floor))?'refuge':'typical';
    return {available:true,key:'breeze-'+(low?'low':'high')+'-'+kind,kind,page:low?11:12,verified:true,note:'Floor assignment follows the floor ranges printed on the Breeze drawing.'};
  }
  const kind=requestedKind==='refuge'?'refuge':'typical';
  return {available:true,key:building.id+'-'+kind,kind,page:building.page,verified:false,note:'The PDF provides typical and refuge layouts without assigning them to individual floor numbers. Confirm the floor schedule before using this as a floor-specific plan.'};
}
