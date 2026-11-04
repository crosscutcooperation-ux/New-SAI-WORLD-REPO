import * as T from './vendor/three.module.js';
import {TOWER_FOOTPRINTS} from './tower-footprints.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

// Merge small static pieces by material, while retaining tower groups and
// instancing. Selection uses a separate low-poly picking scene.
export function mergeStaticPieces(group){
  group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map();
  group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
  for(const items of buckets.values()){
    if(items.length<2)continue;const geometries=[];
    for(const o of items){let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);geometries.push(g);}
    const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!merged)continue;merged.computeBoundingSphere();const mesh=new T.Mesh(merged,items[0].material);mesh.name='Batched static architecture';mesh.castShadow=items[0].castShadow;mesh.receiveShadow=items[0].receiveShadow;group.add(mesh);items.forEach(o=>o.removeFromParent());
  }
}
export function createPickingScene(towerLayout){
  const towers=[],material=new T.MeshBasicMaterial({side:T.DoubleSide});
  for(const t of towerLayout){const p=new T.Mesh(new T.BoxGeometry(38.5,115,TOWER_FOOTPRINTS[t.plan].depth+1),material);p.position.set(t.x,58,t.z);p.rotation.y=t.rotation;p.userData.towerId=t.id;p.updateMatrixWorld();towers.push(p);}
  return towers;
}
