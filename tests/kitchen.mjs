import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createKitchen} from '../dist/kitchen.js';
import {kitchenModules,kitchenWorktop,kitchenSink,breakfastTop,kitchenWallCabinets,diningLayout,diningChairs} from '../dist/kitchen-layout.js';
import {walls,point} from '../dist/model.js';

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
assert.deepEqual([diningLayout.x,diningLayout.z],[4.35,13.10],'Dining table returns to its previous separate position');
assert.equal(diningChairs.length,4,'Restore all four dining chairs');
const breakfast=kitchen.getObjectByName('breakfast-disc'),breakfastBounds=new THREE.Box3().setFromObject(breakfast);
assert.ok(Math.abs(breakfastBounds.max.x-breakfastBounds.min.x-.80)<1e-6,'Breakfast disc is exactly 80 cm');
assert.ok(breakfastBounds.min.y>=kitchenWorktop.y&&breakfastBounds.min.y-kitchenWorktop.y<.002,'Wooden disc sits above the ceramic');
assert.equal(breakfast.material,materials.wood,'Breakfast surface remains oak');
assert.ok(breakfastBounds.max.z<hobBounds.min.z,'Breakfast disc does not cover the hob');
assert.ok(topHit(breakfastTop.x+.15,breakfastTop.z+.15).length,'Breakfast disc overlaps its supporting ceramic');
ray.set(new THREE.Vector3(6.50,.89,13.10),new THREE.Vector3(0,-1,0));
assert.equal(ray.intersectObjects(kitchen.children).length,0,'No dining pedestal below the breakfast overhang');
for(let i=0;i<diningChairs.length;i++)for(let j=i+1;j<diningChairs.length;j++)assert.ok(Math.hypot(diningChairs[i].x-diningChairs[j].x,diningChairs[i].z-diningChairs[j].z)>.58,'Chair shells do not overlap');
const fridge=kitchenModules.find(m=>m.id==='fridge');
for(const name of ['pink-fridge-body','pink-fridge-door','fridge-handle']){
 const bounds=new THREE.Box3().setFromObject(kitchen.getObjectByName(name));
 assert.ok(bounds.min.x>=fridge.x-fridge.w/2-1e-5&&bounds.max.x<=fridge.x+fridge.w/2+1e-5,'Fridge fits its shared footprint');
 assert.ok(bounds.min.z>=fridge.z-fridge.d/2-1e-5&&bounds.max.z<=fridge.z+fridge.d/2+1e-5,'Fridge handle stays inside collision footprint');
}
// Keep the whole rear window opening clear, including its frame, not just its centre.
const rearWall=walls.find(w=>w.a[1]===1350&&w.b[1]===1350);
const rearWindows=rearWall.open.filter(o=>o.kind==='window').map(o=>({
 min:point([rearWall.a[0]+o.s,rearWall.a[1]])[0]-.04,
 max:point([rearWall.a[0]+o.e,rearWall.a[1]])[0]+.04,
}));
assert.equal(kitchenWallCabinets.length,2,'Two wall cabinet runs match the annotated image');
for(const cabinet of kitchenWallCabinets){
 const shell=kitchen.getObjectByName(cabinet.id+'-carcass'),bounds=new THREE.Box3().setFromObject(shell);
 assert.ok(bounds.min.y>=1.49&&bounds.max.y<2.21,'Suspended storage stays above worktops and below ceiling');
 for(const window of rearWindows)assert.ok(bounds.max.x<window.min||bounds.min.x>window.max,'Wall cabinets do not block either window');
 for(let row=0;row<cabinet.rows;row++)assert.ok(kitchen.getObjectByName(cabinet.id+'-front-'+row),'Each horizontal cabinet front is rendered');
}
assert.equal(kitchenWallCabinets.find(c=>c.id==='washing-upper').rows,2,'Two stacked horizontal fronts above the sink');
assert.equal(kitchenWallCabinets.find(c=>c.id==='fridge-upper').rows,1,'Single horizontal front above the fridge-side wall');
console.log('PASS: ceramic U, recessed sink, induction, raised 80 cm breakfast disc, separate 120 cm table, four chairs and wall cabinets clear of windows.');
