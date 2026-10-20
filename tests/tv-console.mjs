import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createTVConsole} from '../dist/tv-console.js';
import {mediaConsole,mediaCollider,television} from '../dist/media-layout.js';
import {canStand} from '../dist/model.js';
import {canWalk,setKitchenCollisionVariant,intersects} from '../dist/furniture-collisions.js';

const scene=new THREE.Scene(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,parent)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
const cabinet=createTVConsole(scene,box),bounds=new THREE.Box3().setFromObject(cabinet),size=bounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z-2.40)<1e-6&&Math.abs(size.x-.43)<1e-6&&Math.abs(size.y-.44)<1e-6,'Exactly 240 cm wide, 43 cm deep and 44 cm high including feet');
assert.ok(Math.abs(bounds.max.y-mediaConsole.top)<1e-6,'Shared top height supports existing media equipment');
assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z-television.centerZ)<1e-6,'Cabinet remains centred beneath the TV');
assert.ok(Math.abs(bounds.min.x-3.09)<1e-6,'Rear edge leaves the existing cable space intact');
const feet=cabinet.getObjectByName('slender-walnut-feet');assert.equal(feet.count,6);
const feetBounds=new THREE.Box3().setFromObject(feet),baseBounds=new THREE.Box3().setFromObject(cabinet.getObjectByName('cabinet-base'));
assert.ok(Math.abs(feetBounds.max.y-baseBounds.min.y)<1e-6,'Feet support the cabinet base');
const look=(x,y)=>new THREE.Raycaster(cabinet.localToWorld(new THREE.Vector3(x,y,.5)),new THREE.Vector3(-1,0,0)).intersectObject(cabinet,true);
for(const y of [.20,.35]){
 const hit=look(-.48,y)[0];assert.equal(hit.object.name,'rear-panel-with-cable-hole','Both central cubbies are open all the way to the back');
}
assert.equal(look(0,.347).length,0,'Rear cable hole passes completely through the panel');
for(const x of [.669,.731])assert.equal(look(x,.27)[0].object.name,'recessed-finger-pull','Finger pulls are recessed through the front rather than stuck over the flutes');
assert.ok(cabinet.getObjectByName('vertical-walnut-flutes').count>150,'Photo-inspired vertical texture is modelled and instanced');
let triangles=0;const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
cabinet.traverse(o=>{
 assert.ok(!o.isLight);if(!o.isMesh)return;
 const count=o.isInstancedMesh?o.count:1,p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count??p.count)/3*count;
 for(let n=0;n<count;n++){
  if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(matrix);
   assert.ok(Number.isFinite(v.x+v.y+v.z));assert.ok(canStand(v.x,v.z,0),'No overlap with architectural walls');
   assert.ok(intersects(mediaCollider,v.x,v.z,.00001),'Visible cabinet fits the shared collision bounds');
  }
 }
});
assert.ok(triangles<14000,'Repeated flutes and feet keep geometry lightweight');
for(const id of ['1','2','3']){
 setKitchenCollisionVariant(id);
 assert.equal(canWalk(mediaConsole.x,mediaConsole.z),false);
 assert.ok(canWalk(3.75,9.72),'Passage in front remains accessible');
 assert.ok(canWalk(3.47,8.30),'Removed living-room plant leaves no invisible obstacle');
}
console.log(`PASS: photo-inspired 240 × 43 × 44 cm TV console, real open cubbies and recessed pulls, six supporting feet, unchanged TV centre, cable clearance and circulation in three kitchens; ${triangles} triangles.`);
