import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createEntryway} from '../dist/entryway.js';
import {shoeCabinet,entryRug,shoeCabinetCollider,shoeCabinetOpenCollider} from '../dist/entryway-layout.js';
import {canStand,point,walls,SCALE} from '../dist/model.js';
import {canWalk,intersects,setKitchenCollisionVariant,setShoeCabinetExtent} from '../dist/furniture-collisions.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
const scene=new THREE.Scene(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,parent)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
const entry=createEntryway(scene,box,{onExtentChange:setShoeCabinetExtent}),cabinet=entry.getObjectByName('wall-hung-shoe-cabinet'),rug=entry.getObjectByName('entry-jute-rug');
const controls=entry.userData.controller,flap=cabinet.getObjectByName('tilted-shoe-compartment'),drawer=cabinet.getObjectByName('key-drawer');
const bounds=()=>new THREE.Box3().setFromObject(cabinet),rugBounds=new THREE.Box3().setFromObject(rug),size=rugBounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(bounds().min.y-.18)<1e-6,'Cabinet floats 18 cm off the floor');
assert.ok(Math.abs(bounds().max.x-bounds().min.x-1.05)<1e-6);
assert.ok(controls.state.every(s=>!s.open&&!s.targetOpen&&!s.moving));
assert.equal(flap.rotation.x,0);assert.equal(drawer.position.z,-.009);
assert.ok(Math.abs(bounds().getSize(new THREE.Vector3()).z-.25)<1e-6,'All closed geometry fits the true 25 cm depth');
assert.ok(Math.abs(size.x-entryRug.width)<1e-6&&Math.abs(size.z-entryRug.depth)<1e-6&&rugBounds.max.y<.025);
assert.ok(rug.getObjectByName('woven-jute-centre').material.map.isDataTexture);
assert.equal(flap.getObjectByName('shoe-soles').count,12);
const frontDoor=walls.find(w=>w.open?.some(o=>o.kind==='entry')),door=frontDoor.open.find(o=>o.kind==='entry'),[doorX,doorZ]=point(frontDoor.a);
assert.ok(Math.abs(rugBounds.getCenter(new THREE.Vector3()).z-(doorZ+(door.s+door.e)/2/SCALE))<1e-7,'Runner lies on the centre line of the entrance door');
assert.ok(Math.abs(doorX-frontDoor.t/2-rugBounds.max.x-.10)<1e-6,'Runner starts 10 cm inside the door');
assert.ok(bounds().max.x<doorX-frontDoor.t/2-.45,'No obstruction at the entrance');
const occluders=[];scene.traverse(o=>{if(o.isMesh)occluders.push(o);});
const ray=y=>new THREE.Raycaster(new THREE.Vector3(shoeCabinet.x,y,shoeCabinet.z+1),new THREE.Vector3(0,0,-1));
assert.equal(controls.pick(ray(.70),occluders)?.id,'flap');
assert.equal(controls.pick(ray(1.06),occluders)?.id,'drawer');
const wall=box(2,2,.04,new THREE.MeshBasicMaterial(),shoeCabinet.x,1,shoeCabinet.z+.7,scene);scene.updateMatrixWorld(true);
const occludedRay=ray(.7);assert.equal(controls.pick(occludedRay,[...occluders,wall]),null,'Cannot click through walls');assert.equal(occludedRay.far,Infinity);
wall.visible=false;
freezeStaticTransforms(scene);
const advance=occupants=>{for(let i=0;i<20;i++)controls.update(.1,occupants);};
const probe={x:shoeCabinet.x,z:shoeCabinet.z+.40,r:.03};
assert.ok(canWalk(probe.x,probe.z,probe.r),'Closed door frees the area in front');
controls.toggle('flap');advance([{x:shoeCabinet.x,z:shoeCabinet.z+.43,r:.10}]);
assert.ok(controls.state.find(s=>s.id==='flap').obstructed,'Opening stops before touching a visitor or robot');
assert.ok(controls.maxZ<shoeCabinet.z+.33+.001);
advance([]);
assert.ok(controls.state.find(s=>s.id==='flap').open);assert.equal(controls.state.find(s=>s.id==='drawer').open,false);
assert.ok(Math.abs(flap.rotation.x-35*Math.PI/180)<1e-8&&Math.abs(controls.depth-.648)<.001,'Full opening has the measured 65 cm envelope');
assert.ok(Math.abs(bounds().max.z-controls.maxZ)<1e-6,'Moving world matrices match the collision front after static freeze');
assert.equal(canWalk(probe.x,probe.z,probe.r),false,'Opening adds the actual obstruction');
controls.toggle('drawer');advance([]);
assert.ok(controls.state.every(s=>s.open));
const drawerRay=new THREE.Raycaster(new THREE.Vector3(shoeCabinet.x,1.4,shoeCabinet.z+.25),new THREE.Vector3(0,-1,0));
assert.equal(drawerRay.intersectObject(cabinet,true)[0].object.name,'drawer-bottom','Fully open drawer has a real cavity');
assert.equal(controls.pick(ray(1.06),occluders)?.id,'drawer','Open drawer remains clickable');
assert.equal(controls.pick(ray(.7),occluders)?.id,'flap','Open flap remains clickable');
const lowerPartition=walls.find(w=>w.a[0]===697&&w.a[1]===1114),[,partitionZ]=point(lowerPartition.a);
assert.ok(partitionZ-lowerPartition.t/2-controls.maxZ>.65,'More than 65 cm passage at full opening');
let triangles=0;const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
function verifyGeometry(){
 entry.traverse(o=>{
  assert.ok(!o.isLight);if(!o.isMesh)return;
  const p=o.geometry.attributes.position,count=o.isInstancedMesh?o.count:1;
  for(let n=0;n<count;n++){
   if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(matrix);
    assert.ok(Number.isFinite(v.x+v.y+v.z)&&canStand(v.x,v.z,0),`${o.name} clears walls throughout motion`);
    if(!rugBounds.containsPoint(v))assert.ok(intersects({...shoeCabinetCollider,maxZ:controls.maxZ},v.x,v.z,.00001),`${o.name} fits the live footprint`);
   }
  }
 });
}
verifyGeometry();entry.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);});assert.ok(triangles<16000);
for(const id of ['1','2','3']){
 setKitchenCollisionVariant(id);
 assert.equal(canWalk(probe.x,probe.z,probe.r),false,'Changing kitchens preserves live cabinet collisions');
 for(let x=9.30;x>=6.90;x-=.04)assert.ok(canWalk(x,11.84,.20),`Passage remains accessible in kitchen ${id}`);
 assert.ok(canWalk(9.30,entryRug.z,.20),'Rug beside the flap stays walkable');
}
controls.toggle('flap');controls.toggle('drawer');
for(let i=0;i<12;i++){controls.update(.1,[]);verifyGeometry();}
assert.ok(controls.state.every(s=>!s.open&&!s.moving));assert.ok(canWalk(probe.x,probe.z,probe.r));
assert.ok(Math.abs(controls.depth-.25)<1e-8&&controls.update(.1)===false,'Closed again and idle without extra frames');
const second=createEntryway(new THREE.Group(),box);assert.ok(second.userData.controller.state.every(s=>!s.open),'Each fresh load starts closed');
assert.ok(shoeCabinetOpenCollider.maxZ>=bounds().max.z,'Stable robot envelope contains the furniture');
console.log(`PASS: closed 25 cm cabinet, independent click targets, full 65 cm opening, obstacle pause, animated matrices after freeze, live collisions, clear passage and door-centred rug; ${triangles} triangles.`);
