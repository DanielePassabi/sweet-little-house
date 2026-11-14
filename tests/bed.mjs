import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createBed} from '../dist/bed.js';
import {createOriginalBed} from '../dist/original-bed.js';
import {createBedroomCabinets} from '../dist/bedroom-cabinets.js';
import {bedLayout,bedFootprint,bridge,wardrobe,bedside,shoeUnit,originalBedroom} from '../dist/bedroom-layout.js';
import {canWalk,setBedroomCollisionVariant,setKitchenCollisionVariant} from '../dist/furniture-collisions.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
import {windowLayout,windowTouches} from '../dist/windows.js';

const scene=new THREE.Scene(),close=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const materials=Object.fromEntries(['frame','fabric','duvet','accent'].map(key=>[key,new THREE.MeshStandardMaterial()]));
const bed=createBed(scene,materials),boundsOf=o=>new THREE.Box3().setFromObject(o,true);
const bounds=boundsOf(bed),{headX,centerZ}=bedLayout;
close(bounds.min.x,bedFootprint.minX);close(bounds.max.x,bedFootprint.maxX);
close(bounds.max.x-bounds.min.x,2.10);close(bounds.min.z,bedFootprint.minZ);close(bounds.max.z,bedFootprint.maxZ);
assert.ok(bounds.min.y>0&&bounds.max.y<1.01);
let triangles=0,meshes=0;
bed.traverse(o=>{
 assert.ok(!o.isLight,'Bed adds no light sources');if(!o.isMesh)return;meshes++;
 const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
 for(const v of p.array)assert.ok(Number.isFinite(v),'Finite geometry');
 for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-4,'Smooth unit normals');
 triangles+=(o.geometry.index?.count??p.count)/3*(o.isInstancedMesh?o.count:1);
});
assert.ok(meshes<55&&triangles<85000,'Bounded bed geometry cost including the storage mechanism');
for(const name of ['draped-taupe-duvet','quilted-throw']){
 const mesh=bed.getObjectByName(name),g=mesh.geometry,edges=new Map();
 // Each edge joins two triangles with opposite winding: a closed cloth volume.
 for(let i=0;i<g.index.count;i+=3){
  const face=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
  for(let j=0;j<3;j++){const a=face[j],b=face[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');const entry=edges.get(key)??{count:0,balance:0};entry.count++;entry.balance+=a<b?1:-1;edges.set(key,entry);}
 }
 assert.ok([...edges.values()].every(e=>e.count===2&&e.balance===0),'Duvet volume is watertight with outward rim winding');
 assert.ok(g.boundingBox.max.y-g.boundingBox.min.y>.20,'Duvet drapes down the mattress sides');
 const ray=new THREE.Raycaster(new THREE.Vector3(headX-(name==='draped-taupe-duvet'?.86:1.6),2,centerZ),new THREE.Vector3(0,-1,0));
 const hit=ray.intersectObject(mesh)[0];assert.ok(hit&&hit.face.normal.y>.8,'Upper cloth surface faces the lights');
}
const mattress=boundsOf(bed.getObjectByName('rounded-mattress'));
close(mattress.max.x-mattress.min.x,2);close(mattress.max.z-mattress.min.z,1.60);
close(mattress.max.y,.699,.002);
const pillows=bed.getObjectByName('lifting-platform').children.filter(o=>o.name==='sleeping-pillow');
assert.equal(pillows.length,2);
for(const pillow of pillows){
 const box=boundsOf(pillow);assert.ok(box.max.y-box.min.y>.19,'Pillow has a full, rounded centre');
 assert.ok(box.min.y<mattress.max.y+.015&&box.max.y>mattress.max.y+.15,'Pillow rests against the mattress');
}

const units=new THREE.Group();scene.add(units);
createBedroomCabinets((w,h,d,material,x,y,z)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 m.position.set(x,y,z);units.add(m);return m;
},{body:materials.frame,front:materials.fabric,wood:materials.duvet,pull:materials.accent});
const leaves=units.children.filter(o=>o.name==='bridge-door');
assert.equal(leaves.length,6);
for(const leaf of leaves){
 const b=boundsOf(leaf);close(b.min.y,1.65);close(b.max.y-b.min.y,.90);
 close(b.max.z-b.min.z,.45-.003);
}
freezeStaticTransforms(scene);
const lift=bed.userData.controller;
const down=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));
const targets=[];scene.traverse(o=>{if(o.isMesh)targets.push(o);});
const storageRay=down(bedFootprint.minX+.16,centerZ+.29);
assert.ok(lift.pick(storageRay,targets),'Closed bed is clickable at the foot');
assert.equal(lift.pick(down(headX-.25,centerZ),targets),null,'Bridge shields the head of the bed from a plan-view click');
assert.equal(lift.update(.1),false,'Initially closed and idle');
const bedBase=boundsOf(bed.getObjectByName('storage-floor'));
const hinge=bed.getObjectByName('bed-lift-hinge');
lift.toggle();lift.update(.1);const partial=hinge.rotation.z;lift.toggle();
assert.equal(hinge.rotation.z,partial,'Reversing preserves the current pose');lift.update(.05);
assert.ok(hinge.rotation.z<partial);lift.toggle();
const window=windowLayout.find(w=>w.roomId==='bedroom'),vertex=new THREE.Vector3();
for(let step=0;step<26;step++){
 lift.update(.05);
 const raised=boundsOf(bed);
 assert.ok(raised.max.y<2.6&&raised.max.x<=headX+.0001&&raised.min.x>=bedFootprint.minX-.0001,'Lift stays within room height and bed footprint throughout');
 // Only the head of the tilted platform runs beneath the bridge.
 hinge.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh)return;
  const attr=mesh.geometry.attributes.position;
  for(let i=0;i<attr.count;i++){
   vertex.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);
   if(vertex.x>=bridge.minX-.03)assert.ok(vertex.y<bridge.base-.03,'Moving bedding clears the underside of the bridge');
  }
 });
 // The inward-opening window sweeps beyond the sill but never reaches the bed.
 assert.ok(raised.min.z>window.z+window.wallThickness/2+.018+window.width/2+.04);
}
assert.ok(lift.open&&lift.targetOpen);assert.equal(lift.update(.1),false);
close(hinge.rotation.z,42*Math.PI/180);assert.deepEqual(bedBase,boundsOf(bed.getObjectByName('storage-floor')));
assert.equal(lift.pick(storageRay,targets)?.object.name,'storage-floor','Raised bed exposes a clickable interior');
lift.toggle();for(let i=0;i<24;i++)lift.update(.05);
assert.deepEqual(boundsOf(bed),bounds,'Closing restores the original geometry after matrix freeze');

for(const area of [bedFootprint,wardrobe.side,wardrobe.corner,wardrobe.return,shoeUnit,bedside]){
 assert.equal(canWalk((area.minX+area.maxX)/2,(area.minZ+area.maxZ)/2,.18),false);
}
const gapZ=(bedside.maxZ+bedFootprint.minZ)/2;
assert.equal(canWalk(headX-.24,gapZ,.06,1.75),false,'Pensili block a standing head');
assert.equal(canWalk(headX-.24,gapZ,.06,.15),true,'Floor space under suspended cabinets stays free');
assert.ok(bedFootprint.minX-shoeUnit.maxX>.85,'At least 85 cm clear at narrowest foot passage');
for(const p of [[5,1.55],[5,centerZ],[6.5,4],[5.20,4.8],[4.65,5.8]])assert.ok(canWalk(...p),'Circulation remains free');
for(const area of [shoeUnit,bridge]){
 for(let step=0;step<=20;step++)for(let z=area.minZ;z<area.maxZ;z+=.04){
  assert.ok(!windowTouches(window,step/20,area===shoeUnit?area.maxX:area.minX,z,.02),'Window swing clears both cabinets');
 }
}
const original=createOriginalBed(scene,{wallX:originalBedroom.wallX,...materials});
const originalBounds=boundsOf(original);
close(originalBounds.max.x,originalBedroom.wallX+2);close(originalBounds.min.z,2.11);
close(originalBounds.max.z,3.99);assert.equal(original.getObjectByName('lifting-platform').children.filter(o=>o.name==='sleeping-pillow').length,2);
freezeStaticTransforms(original);
const originalLift=original.userData.controller,footRay=down(originalBedroom.wallX+1.82,3.35);
assert.ok(originalLift.pick(footRay));originalLift.toggle();
for(let i=0;i<24;i++)originalLift.update(.05);
assert.ok(originalLift.open);assert.equal(originalLift.pick(footRay).object.name,'storage-floor');
originalLift.toggle();for(let i=0;i<24;i++)originalLift.update(.05);
assert.deepEqual(boundsOf(original),originalBounds);
for(const kitchen of ['1','2','3']){
 for(const type of ['1','2','1','2']){
  setBedroomCollisionVariant(type);setKitchenCollisionVariant(kitchen);
  assert.equal(canWalk(4.80,3.05),type==='2','Only the original bed occupies the left wall');
  assert.equal(canWalk(6.82,2.60),type==='1','Only the new bed occupies the bridge niche');
  assert.equal(canWalk(6.35,4.85),type==='1','Only the new wardrobe has a return');
  assert.equal(canWalk(4.55,1.34),type==='1','Only the new layout has a shoe cabinet');
 }
}
bed.visible=false;assert.equal(lift.pick(storageRay,targets),null,'Hidden bed cannot intercept clicks in the original layout');
console.log(`PASS: bedroom bridge and L-return, bed dimensions, reversible lift and open storage, window sweep, picking and circulation. ${meshes} bed meshes, ${triangles} triangles.`);
