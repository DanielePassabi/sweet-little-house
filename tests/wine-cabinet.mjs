import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createWineCabinet} from '../dist/wine-cabinet.js';
import {wineCabinetLayout as layout,wineCabinetPoint,wineCabinetCollider} from '../dist/wine-cabinet-layout.js?v=20261016-5';
import {canStand,insidePolygon,rooms,point} from '../dist/model.js';
import {canWalk,intersects,furnitureColliders,setKitchenCollisionVariant} from '../dist/furniture-collisions.js';

const scene=new THREE.Scene(),cabinet=createWineCabinet(scene),bounds=new THREE.Box3();
const leftWall=point([290,1350])[0]+.17,bottomWall=point([290,1350])[1]-.15;
assert.ok(insidePolygon(layout.x,layout.z,rooms.find(r=>r.id==='living').polygon));
let meshes=0,triangles=0;
const counts=new Map(),matrix=new THREE.Matrix4(),v=new THREE.Vector3();
cabinet.traverse(o=>{
 assert.ok(!o.isLight,'No additional lights');if(!o.isMesh)return;meshes++;
 const count=o.isInstancedMesh?o.count:1;counts.set(o.name,(counts.get(o.name)??0)+count);
 triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*count;
 assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));
 for(let n=0;n<count;n++){
  if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
  const p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(matrix);bounds.expandByPoint(v);
   assert.ok(canStand(v.x,v.z,0),`No furniture geometry crosses walls: ${o.name} at ${v.x},${v.z}`);
   if(v.y<1.7)assert.ok(intersects(wineCabinetCollider,v.x,v.z,.003),'Collision footprint includes frame, door handle and bottles');
  }
 }
});
assert.ok(bounds.min.x>leftWall&&bounds.max.z<bottomWall,'Cabinet and foliage fit between the finished wall faces');
assert.ok(bounds.min.y>=.009&&bounds.max.y<2,'Feet rest above floor; foliage stays below ceiling');
assert.ok(bounds.max.y>1.85,'Reference silhouette includes the plant above the crown');
assert.ok(bounds.max.x<4,'Leaves the adjacent bottom-wall window unobstructed');
assert.ok(bounds.min.z>14.1,'Leaves the terrace glazed opening unobstructed');
assert.equal(counts.get('hanging-wine-glasses'),6);
assert.equal(counts.get('wine-bottles'),9);
assert.equal(counts.get('cocktail-glasses'),3);
assert.equal(counts.get('pothos-leaves'),25);
const door=cabinet.getObjectByName('glazed-cabinet-door');
assert.ok(door.material.transparent&&door.material.opacity<.4&&!door.material.depthWrite&&!door.castShadow,'Glazed door reveals the stocked shelves');
assert.equal(counts.get('curved-upper-upright'),2);
assert.ok(meshes<40&&triangles<35000,`Instanced detail stays lightweight: ${meshes} meshes, ${triangles} triangles`);
for(const type of ['1','2','3']){
 setKitchenCollisionVariant(type);
 assert.equal(canWalk(layout.x,layout.z),false,'The unit is solid to the visitor and robot');
 assert.ok(canWalk(...wineCabinetPoint(0,.70)),`Type ${type}: cabinet front remains accessible`);
 for(const [x,z] of wineCabinetCollider.points){
  assert.ok(!furnitureColliders.some(c=>c!==wineCabinetCollider&&intersects(c,x,z,.18)),`Type ${type}: cabinet clears existing furnishings`);
 }
 for(const p of [[3.30,13.7],[4.25,14.45],[5.45,14.2]])assert.ok(canWalk(...p),`Type ${type}: dining, terrace and kitchen circulation stays free`);
}
console.log(`PASS: reference-inspired corner wine cabinet, nine bottles, six hanging glasses, glazed storage, plant, clear walls/windows and all three layouts; ${meshes} meshes, ${triangles} triangles.`);
