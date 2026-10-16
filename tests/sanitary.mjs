import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createSanitaryFixtures} from '../dist/sanitary.js';
import {sanitaryFixtures,sanitaryPoint,sanitaryColliders} from '../dist/sanitary-layout.js';
import {point} from '../dist/model.js';
import {canWalk,intersects} from '../dist/furniture-collisions.js';

const scene=new THREE.Scene(),materials=Object.fromEntries(['ceramic','seat','metal'].map(key=>[key,new THREE.MeshStandardMaterial()]));
const group=createSanitaryFixtures(scene,materials);
assert.equal(group.children.length,4,'Exactly two toilets and two bidets');
let triangles=0;
for(const [index,fixture] of sanitaryFixtures.entries()){
 const root=group.getObjectByName(fixture.id),bounds=new THREE.Box3().setFromObject(root);
 assert.ok(Math.abs(bounds.min.y-.18)<1e-6,`${fixture.id}: full 18 cm clear below all components`);
 const mount=root.getObjectByName('wall-mount-housing'),mountBounds=new THREE.Box3().setFromObject(mount);
 if(fixture.id.startsWith('bath1')){
  const wall=point([42,320])[1]+.075;
  assert.ok(Math.abs(mountBounds.min.z-wall)<1e-6,'Rear housing sits flush on Bath 1 partition');
  assert.ok(bounds.min.z>=wall-1e-6,'No ceramic or controls behind the wall');
 }else{
  const wall=point([712,125])[0]-.15;
  assert.ok(Math.abs(mountBounds.max.x-wall)<1e-6,'Rear housing sits flush on Bath 2 outside wall');
  assert.ok(bounds.max.x<=wall+1e-6,'No ceramic or controls behind the wall');
 }
 const [frontX,frontZ]=sanitaryPoint(fixture,0,.50),direction=new THREE.Vector3(fixture.x-frontX,0,fixture.z-frontZ).normalize();
 assert.equal(new THREE.Raycaster(new THREE.Vector3(frontX,.10,frontZ),direction).intersectObject(root,true).length,0,'Floor is visibly clear underneath, without a pedestal');
 assert.ok(new THREE.Raycaster(new THREE.Vector3(frontX,.32,frontZ),direction).intersectObject(root,true).length>0,'Ceramic shell has a solid front');
 const basinHit=new THREE.Raycaster(new THREE.Vector3(fixture.x,2,fixture.z),new THREE.Vector3(0,-1,0)).intersectObject(root,true)[0];
 assert.ok(basinHit.point.y>.27&&basinHit.point.y<.30,'Open bowl has a recessed, closed bottom');
 assert.equal(canWalk(fixture.x,fixture.z),false,'Suspended fixtures still block the standing visitor');
 assert.ok(canWalk(frontX,frontZ,.18),'Front access remains clear');
 const toilet=fixture.type==='toilet';
 assert.equal(!!root.getObjectByName('flush-plate'),toilet);
 assert.equal(!!root.getObjectByName('toilet-seat'),toilet);
 assert.equal(!!root.getObjectByName('tap-spout'),!toilet);
 assert.ok(bounds.max.y<(toilet?1.11:.59),'No exposed cistern above the toilet');
 root.traverse(o=>{
  assert.ok(!o.isLight);if(!o.isMesh)return;
  const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??p.count)/3;
  for(const n of p.array)assert.ok(Number.isFinite(n),'Finite geometry');
  for(let i=0;i<p.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
   assert.ok(intersects(sanitaryColliders[index],v.x,v.z,.001),'Shared collision shape contains the visible geometry');
  }
 });
}
assert.ok(triangles<15000,'Shared static geometry stays lightweight');
console.log(`PASS: four suspended sanitary fixtures, 18 cm floor clearance, actual wall contact, recessed bowls, concealed cisterns, shared footprints and free access; ${triangles} triangles.`);
