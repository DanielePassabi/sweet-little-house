import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createEntryway} from '../dist/entryway.js';
import {shoeCabinet,entryRug,shoeCabinetCollider} from '../dist/entryway-layout.js';
import {canStand,point,walls} from '../dist/model.js';
import {canWalk,intersects,setKitchenCollisionVariant} from '../dist/furniture-collisions.js';
const scene=new THREE.Scene(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,parent)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
const entry=createEntryway(scene,box),cabinet=entry.getObjectByName('wall-hung-shoe-cabinet'),rug=entry.getObjectByName('entry-jute-rug');
const bounds=new THREE.Box3().setFromObject(cabinet),rugBounds=new THREE.Box3().setFromObject(rug),size=rugBounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(bounds.min.y-.18)<1e-6,'Shoe cabinet hangs 18 cm above the floor without feet');
assert.ok(Math.abs(bounds.max.x-bounds.min.x-1.05)<1e-6,'105 cm width fits the short wall next to the door');
assert.ok(Math.abs(size.x-entryRug.width)<1e-6&&Math.abs(size.z-entryRug.depth)<1e-6&&rugBounds.max.y<.025,'Low rectangular woven rug with bound edges');
assert.ok(rug.getObjectByName('woven-jute-centre').material.map.isDataTexture,'Real repeatable jute weave, no external image dependency');
assert.ok(cabinet.getObjectByName('ajar-key-drawer').position.z>.08,'Drawer partly pulled out');
const flap=cabinet.getObjectByName('tilted-shoe-compartment');
assert.ok(flap.rotation.x>0&&flap.rotation.x<Math.PI/8,'Flap and shoe racks tilt forwards within the available clearance');
assert.equal(flap.getObjectByName('shoe-soles').count,12,'Six pairs modelled on two racks');
const direction=new THREE.Vector3(0,-1,0),ray=new THREE.Raycaster(new THREE.Vector3(shoeCabinet.x,1.4,shoeCabinet.z+.175),direction);
assert.equal(ray.intersectObject(cabinet,true)[0].object.name,'drawer-bottom','Pulled-out drawer has a real cavity visible from above');
const frontDoor=walls.find(w=>(w.open??[]).some(o=>o.kind==='entry')),[doorX]=point(frontDoor.a);
assert.ok(bounds.max.x<doorX-frontDoor.t/2-.45,'Cabinet stays clear of the entrance door and threshold');
const lowerPartition=walls.find(w=>w.a[0]===697&&w.a[1]===1114),[,partitionZ]=point(lowerPartition.a);
assert.ok(partitionZ-lowerPartition.t/2-shoeCabinetCollider.maxZ>.80,'More than 80 cm clear even with the flap ajar');
let triangles=0;const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
entry.traverse(o=>{
 assert.ok(!o.isLight);if(!o.isMesh)return;
 const p=o.geometry.attributes.position,count=o.isInstancedMesh?o.count:1;triangles+=(o.geometry.index?.count??p.count)/3*count;
 for(let n=0;n<count;n++){
  if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(matrix);
   assert.ok(Number.isFinite(v.x+v.y+v.z)&&canStand(v.x,v.z,0),`${o.name} clears architectural walls`);
   if(!rugBounds.containsPoint(v))assert.ok(intersects(shoeCabinetCollider,v.x,v.z,.00001),`${o.name} fits the furniture collision bounds`);
  }
 }
});
assert.ok(triangles<16000,'Shoe details stay within a modest budget');
for(const id of ['1','2','3']){
 setKitchenCollisionVariant(id);
 assert.equal(canWalk(shoeCabinet.x,shoeCabinet.z,.19),false);
 // Walk from the inside of the entrance, across the rug, into the living room.
 for(let x=9.30;x>=6.90;x-=.04)assert.ok(canWalk(x,11.84,.20),`Entry passage accessible in kitchen ${id}`);
 assert.ok(canWalk(entryRug.x,entryRug.z,.20),'Rug is walkable for the visitor and robot');
}
console.log(`PASS: suspended oak shoe cabinet, open drawer and tilted racks with six shoe pairs, braided jute rug, entrance door clearance and 80 cm passage in all kitchens; ${triangles} triangles.`);
