import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createSofa} from '../dist/sofa.js';
import {sofaLayout,sofaColliders,sofaPumpkins,sofaCoffeeTable} from '../dist/sofa-layout.js';
import {canStand} from '../dist/model.js';
import {canWalk,intersects} from '../dist/furniture-collisions.js';

const parent=new THREE.Group(),materials=Object.fromEntries(['frame','upholstery','pillows','base','whitePumpkin','tanPumpkin','stem'].map(n=>[n,new THREE.MeshStandardMaterial()]));
const sofa=createSofa(parent,materials);parent.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(sofa),size=bounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z-2.70)<1e-5,'Purchased sofa is 270 cm wide');
assert.ok(Math.abs(size.x-1.80)<1e-5,'Purchased chaise is 180 cm deep');
assert.ok(bounds.max.y<=sofaLayout.height+.01,'Back cushion height remains within the illustrated profile');
const vector=new THREE.Vector3(),instance=new THREE.Matrix4();let triangles=0,draws=0;
sofa.traverse(mesh=>{
 if(!mesh.isMesh)return;
 draws++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.count??1);
 for(let i=0;i<(mesh.count??1);i++){
  if(mesh.isInstancedMesh)mesh.getMatrixAt(i,instance);else instance.identity();
  for(let j=0;j<mesh.geometry.attributes.position.count;j++){
   vector.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(instance).applyMatrix4(mesh.matrixWorld);
   assert.ok(Number.isFinite(vector.x+vector.y+vector.z),'Upholstery vertices remain finite');
   assert.ok(sofaColliders.some(c=>vector.x>=c.minX-1e-5&&vector.x<=c.maxX+1e-5&&vector.z>=c.minZ-1e-5&&vector.z<=c.maxZ+1e-5),'Every visual part fits the shared collision footprint');
   assert.ok(canStand(vector.x,vector.z,0),'Sofa must not intersect architectural walls');
  }
 }
});
assert.ok(draws<20&&triangles<75000,'Repeated upholstery stays batched within a modest render budget');
assert.equal(sofa.getObjectByName('tufted-back-cushions').count,3,'Three tufted back pillows match the reference');
assert.equal(sofa.getObjectByName('taupe-scatter-cushions').count,2);
for(const pumpkin of sofaPumpkins){
 const plush=sofa.getObjectByName(pumpkin.name);assert.ok(plush?.isGroup,'Both named plush pumpkins exist');
 const body=plush.getObjectByName('plush-body');assert.equal(body.material,materials[pumpkin.material],'White and tan pumpkins use distinct materials');
 const box=new THREE.Box3().setFromObject(body);
 assert.ok(Math.abs(box.min.y-sofaLayout.seatHeight)<.015,'Pumpkin rests in the seat without floating');
 assert.ok(plush.getObjectByName('soft-stem'),'Pumpkin has a soft curved stem');
}
assert.equal(canWalk(5.95,8.48),false,'Mirrored chaise beside the partition blocks walking');
assert.equal(canWalk(5.95,10.35),true,'Previous right-hand chaise location is now open');
assert.ok(!sofaColliders.some(c=>intersects(c,sofaCoffeeTable.x,sofaCoffeeTable.z,sofaCoffeeTable.r)),'Coffee table clears the new chaise');
console.log(`PASS: 270 × 180 cm sofa, wall-side chaise, collision/wall clearance, two seated plush pumpkins; ${draws} draw calls, ${triangles} triangles.`);
