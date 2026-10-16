import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createSlidingDoors,slidingDoorLayout} from '../dist/sliding-doors.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
import {canWalk,setDoorCollisionTest,setKitchenCollisionVariant,safeRoomPosition} from '../dist/furniture-collisions.js';
import {canStand,rooms} from '../dist/model.js';
import {createMovement} from '../dist/movement.js';

const scene=new THREE.Scene(),events=[],system=createSlidingDoors(scene,{onStateChange:s=>events.push(s)});
freezeStaticTransforms(scene);
assert.deepEqual(system.state.map(d=>d.id),['bath1','bath2','hall'],'Only the three requested doors are added');
setDoorCollisionTest(system.blocksPoint);
const pointAt=(d,u,normal=0,y=1)=>new THREE.Vector3(d.x+d.ux*u-d.uz*normal,y,d.z+d.uz*u+d.ux*normal);
const step=(seconds=1.3,occupant=null,fps=60)=>{for(let i=0;i<seconds*fps;i++)system.update(1/fps,occupant);};
const ray=new THREE.Raycaster();
function aim(d,u,side=1){
 const target=pointAt(d,u,0),origin=pointAt(d,u,side*.5);ray.set(origin,target.clone().sub(origin).normalize());ray.far=2;
}
for(const door of system.doors){
 const d=door.layout,mid=(d.start+d.end)/2,p=pointAt(d,mid);
 assert.ok(canStand(p.x,p.z,0),'Door occupies an existing opening');
 assert.equal(canWalk(p.x,p.z),false,'Closed leaf blocks passage');
 for(const side of [-1,1]){aim(d,mid,side);assert.equal(system.pick(ray)?.id,d.id,'Closed panel can be clicked from either side');}
 assert.equal(door.leaf.children.filter(o=>o.name==='silver-recessed-pull').length,2,'Flush circular silver pulls on both faces');
 assert.equal(door.leaf.children.filter(o=>o.name==='vertical-door-groove').length,6,'Three vertical decorative lines on each face');
 for(const mesh of door.leaf.children){
  assert.equal(mesh.material.clippingPlanes.length,2);assert.equal(mesh.material.clipShadows,true,'Retracted leaf must not cast shadows outside its portal');
 }
 // A real hole reveals the inset cup behind the face, rather than a protruding handle.
 const pull=door.leaf.getObjectByName('pull-inset-bottom'),world=door.leaf.localToWorld(new THREE.Vector3(pull.position.x,1.02,0));
 const origin=world.clone().add(new THREE.Vector3(-d.uz,0,d.ux).multiplyScalar(.3));
 ray.set(origin,world.clone().sub(origin).normalize());
 const cupHit=system.pick(ray);assert.equal(cupHit.object.name,'pull-inset-bottom');
 const before=door.leaf.getWorldPosition(new THREE.Vector3());
 system.setOpen(d.id,true);assert.equal(system.update(.25),true);
 assert.ok(door.progress>0&&door.progress<1,'Opening is animated and long frame gaps are bounded');
 const during=door.leaf.getWorldPosition(new THREE.Vector3());
 assert.ok(during.distanceTo(before)>0,'Frozen scene matrices still update the moving leaf');
 step();assert.equal(door.progress,1);
 assert.ok(canWalk(p.x,p.z),'Open door releases passage');
 aim(d,mid);assert.equal(system.pick(ray),null,'Open middle is not an invisible click target');
 const edge=d.direction>0?d.end-.035:d.start+.035;aim(d,edge);
 assert.equal(system.pick(ray)?.id,d.id,'Exposed edge/pull remains clickable to close');
 // Hidden material outside the jamb must not be pickable, including Bath 1's short wall.
 const retracted=d.direction>0?d.end+.2:d.start-.2;aim(d,retracted);
 assert.equal(system.pick(ray),null,'Clipping is respected by picking');
 system.toggle(d.id);step(.25);const partial=door.progress;assert.ok(partial>0&&partial<1);
 system.toggle(d.id);assert.equal(door.progress,partial,'Reversing starts from the current position');step();
 // Closing across an occupied doorway reverses before the leaf touches the visitor.
 system.setOpen(d.id,false);step(2.5,{x:p.x,z:p.z,r:.20});
 assert.equal(door.progress,1);assert.ok(events.some(e=>e.id===d.id&&e.obstructed),'Occupied passage reopens');
 system.setOpen(d.id,false);step();assert.equal(door.progress,0);
 aim(d,mid);
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(.2,2,.2),new THREE.MeshBasicMaterial());blocker.position.copy(pointAt(d,mid,.25));scene.add(blocker);blocker.updateMatrixWorld();
 assert.equal(system.pick(ray,[blocker]),null,'Walls/furniture occlude clicks');
 blocker.visible=false;assert.equal(system.pick(ray,[blocker])?.id,d.id,'Hidden objects do not intercept clicks');scene.remove(blocker);
}
// Real walking integration: closed stops, open permits the same crossing.
const hall=slidingDoorLayout.find(d=>d.id==='hall'),u=(hall.start+hall.end)/2;
const start=pointAt(hall,u,.55,1.75),position=start.clone(),move=createMovement(canWalk),keys=new Set(['KeyW']);
for(let i=0;i<60;i++)move.update(1/60,keys,0,position);
assert.ok(position.z>hall.z+.17,'Cannot walk through the closed hall door');
system.setOpen('hall',true);step();move.reset();
for(let i=0;i<60;i++)move.update(1/60,keys,0,position);
assert.ok(position.z<hall.z-.2,'Open hall door can be crossed');
for(const door of system.doors)system.setOpen(door.layout.id,true);step();
for(const id of ['1','2','3']){
 setKitchenCollisionVariant(id);
 for(const d of slidingDoorLayout){const p=pointAt(d,(d.start+d.end)/2);assert.ok(canWalk(p.x,p.z),'Kitchen swaps retain the open door collisions');}
 for(const room of rooms)assert.ok(canWalk(...safeRoomPosition(room)));
}
assert.equal(system.update(1/60),false,'Open, stationary doors stop requesting redraws/shadow updates');
assert.equal(system.update(NaN),false);assert.equal(system.update(-1),false);
assert.throws(()=>system.toggle('unknown'),RangeError);
// Equal elapsed time produces the same animation at different frame rates.
for(const fps of [30,60,120]){
 const test=createSlidingDoors(new THREE.Group());test.setOpen('bath2',true);
 for(let i=0;i<fps/2;i++)test.update(1/fps);
 assert.ok(Math.abs(test.state[1].progress-.5/1.15)<1e-10);
}
setDoorCollisionTest(null);setKitchenCollisionVariant('1');
console.log('PASS: three decorated pocket doors, recessed silver pulls, animation after transform freeze, bidirectional/occluded picking, clipped pockets, dynamic walking collisions, safe reversal and idle rendering.');
