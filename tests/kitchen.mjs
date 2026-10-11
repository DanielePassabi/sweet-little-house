import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createKitchen} from '../dist/kitchen.js';
import {kitchenModules,kitchenWorktop,kitchenSink,diningLayout,diningChairs} from '../dist/kitchen-layout.js';

const scene=new THREE.Group(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,material,x,y,z,parent)=>{
 const mesh=new THREE.Mesh(unit,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
};
const materials=Object.fromEntries(['front','wood','ceramic','steel','dark','glass'].map(name=>[name,new THREE.MeshStandardMaterial()]));
const kitchen=createKitchen(scene,box,materials);scene.updateMatrixWorld(true);
const top=kitchen.getObjectByName('ceramic-worktop'),ray=new THREE.Raycaster();
const topHit=(x,z)=>{ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(top);};
assert.equal(topHit(kitchenSink.x,kitchenSink.z).length,0,'Sink has an actual opening through the ceramic');
assert.equal(topHit(8.1,13.8).length,0,'Working aisle is not bridged by the worktop');
for(const [x,z] of [[6.99,13.3],[6.99,14.6],[8.1,14.6],[9.2,14.6],[9.235,13.875]]){
 const hit=topHit(x,z);assert.ok(hit.length,`Continuous ceramic at ${x},${z}`);
 assert.ok(Math.abs(hit[0].point.y-kitchenWorktop.y)<1e-5,'All arms have the same finished height');
}
// The bowl must be visible below the cutout, not occluded by a cabinet body.
ray.set(new THREE.Vector3(kitchenSink.x,1,kitchenSink.z),new THREE.Vector3(0,-1,0));
const basinHit=ray.intersectObjects(kitchen.children)[0];
assert.ok(basinHit.point.y<.79&&basinHit.point.y>.75,'Inset sink is visibly recessed');
const hobBounds=new THREE.Box3().setFromObject(kitchen.getObjectByName('induction-hob'));
assert.ok(hobBounds.min.x>6.6&&hobBounds.max.x<7.38,'Hob fits inside peninsula ceramic');
assert.ok(hobBounds.min.z>13.55&&hobBounds.max.z<14.319,'Hob sits over its base cabinet');
assert.equal(kitchen.children.filter(m=>m.name==='induction-zone').length,4);
assert.equal(diningLayout.r*2,1.20,'Requested table diameter is 120 cm');
assert.ok(diningLayout.y<kitchenWorktop.y,'Table is at seated dining height');
assert.ok(diningLayout.z+diningLayout.r<13.55,'Table clears base cabinet at connection');
assert.equal(diningChairs.length,3,'Seats occupy the three exposed sides');
for(let i=0;i<diningChairs.length;i++)for(let j=i+1;j<diningChairs.length;j++)assert.ok(Math.hypot(diningChairs[i].x-diningChairs[j].x,diningChairs[i].z-diningChairs[j].z)>.58,'Chair shells do not overlap');
const fridge=kitchenModules.find(m=>m.id==='fridge');
for(const name of ['pink-fridge-body','pink-fridge-door','fridge-handle']){
 const bounds=new THREE.Box3().setFromObject(kitchen.getObjectByName(name));
 assert.ok(bounds.min.x>=fridge.x-fridge.w/2-1e-5&&bounds.max.x<=fridge.x+fridge.w/2+1e-5,'Fridge fits its shared footprint');
 assert.ok(bounds.min.z>=fridge.z-fridge.d/2-1e-5&&bounds.max.z<=fridge.z+fridge.d/2+1e-5,'Fridge handle stays inside collision footprint');
}
// Only the requested oven column and fridge may occupy storage height.
for(const child of kitchen.children){
 const bounds=new THREE.Box3().setFromObject(child);
 if(bounds.max.y>1.65)assert.ok(bounds.min.x>8.8&&bounds.min.z>12.37&&bounds.max.z<12.98,'No suspended wall cabinets');
}
console.log('PASS: ceramic U and sink opening, recessed basin, peninsula induction, 120 cm table, chair spacing, pink fridge and no wall cabinets.');
