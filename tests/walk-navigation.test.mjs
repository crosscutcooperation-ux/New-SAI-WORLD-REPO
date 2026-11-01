import assert from 'node:assert/strict';
import {buildSite} from '../dist/model.js';
import {mergeStaticPieces} from '../dist/scene-optimization.js';
import {ZONES,TOUR_ROUTES,isWalkable,moveWithin,findWalkPath,walkFloor} from '../dist/walk-navigation.js';
const model=buildSite(),obs=model.walkObstacles;
const named=[];
model.root.traverse(node=>{if(node.userData.role==='business-park')named.push(node);});
assert.deepEqual(named,[model.businessPark],'Exactly one business park in the campus');
assert.ok(model.podium.getObjectByName('Ground-floor shop windows'));
assert.ok(model.podium.getObjectByName('Upper arcade piers'));
assert.ok(model.podium.children.some(node=>node.name.startsWith('Tall arched entrance') && node.geometry.type==='ExtrudeGeometry'));
for(const [zone,cfg]of Object.entries(ZONES))assert.ok(isWalkable(zone,...cfg.start,obs),`${zone} entry is clear`);
assert.equal(isWalkable('pool',0,64,obs),false,'Pool cannot be walked into');
assert.equal(isWalkable('garden',0,4,obs),false,'Fountain cannot be walked into');
assert.equal(isWalkable('garden',0,-36,obs),false,'Back boundary stops before the residential foundation');
for(const zone of Object.keys(ZONES)){
  const route=TOUR_ROUTES[zone];for(const p of route)assert.ok(isWalkable(zone,...p,obs),`${zone} waypoint ${p} is clear`);
  for(let i=1;i<route.length;i++){
    const a={x:route[i-1][0],z:route[i-1][1]},b={x:route[i][0],z:route[i][1]},path=findWalkPath(zone,a,b,obs);assert.ok(path.length,`${zone} guided leg ${i} is reachable`);
    let at=a;for(const p of path){const steps=Math.ceil(Math.hypot(p.x-at.x,p.z-at.z)/.08),from={...at};for(let j=1;j<=steps;j++)assert.ok(isWalkable(zone,from.x+(p.x-from.x)*j/steps,from.z+(p.z-from.z)*j/steps,obs),'Path never cuts a collision corner');at=p;}
  }
}
const aroundPool=findWalkPath('pool',{x:-23.5,z:64},{x:23.5,z:64},obs);assert.ok(aroundPool.length>1,'Click-to-walk routes around the swimming pool');
const p=moveWithin('pool',{x:23.5,z:64},-45,0,obs);assert.ok(p.x>20.8,'Large movement cannot tunnel into water');
const edge=moveWithin('garden',{x:0,z:33.5},0,100,obs);assert.ok(edge.z<39,'Cannot walk off the courtyard');
assert.equal(walkFloor('pool',0,47),13.1);assert.equal(walkFloor('garden',0,33),1.25);
let before=0,after=0;model.root.traverse(o=>{if(o.isMesh)before++;});for(const t of model.towers)mergeStaticPieces(t);mergeStaticPieces(model.land);mergeStaticPieces(model.context);model.root.traverse(o=>{if(o.isMesh)after++;});assert.ok(after<before*.55,'Static batching materially reduces mesh submissions');
console.log(JSON.stringify({navigation:'passed',guidedRoutes:'all reachable',poolAvoidance:'passed',boundaryCollision:'passed',meshSubmissions:{before,after}},null,2));

