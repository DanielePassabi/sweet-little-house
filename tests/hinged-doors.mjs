import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createHingedDoors,hingedDoorLayout,hingedDoorPose,hingedDoorTouches} from '../dist/hinged-doors.js';
import {createDoors} from '../dist/doors.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
import {wallVolumes} from '../dist/wall-geometry.js';
import {canWalk,canWalkWithoutDoors,setDoorCollisionTest,safeRoomPosition} from '../dist/furniture-collisions.js';
import {rooms} from '../dist/model.js';

const events=[],scene=new THREE.Scene(),system=createHingedDoors(scene,{onStateChange:s=>events.push(s)});
freezeStaticTransforms(scene);
const step=(occupants=[])=>{for(let i=0;i<70;i++)system.update(1/60,occupants);};
const expected={room2:[0,-1],bedroom:[1,0],room3:[-1,0],utility:[0,1]};
assert.deepEqual(system.state.map(d=>d.id),['room2','bedroom','room3','utility']);
const walls=wallVolumes().filter(v=>v.kind==='wall'&&v.min[1]<1&&v.max[1]>1);
for(const door of system.doors){
 const d=door.layout,pose=hingedDoorPose(d,0),mid={x:pose.x+pose.dx*d.width/2,z:pose.z+pose.dz*d.width/2};
 assert.ok(system.blocksPoint(mid.x,mid.z),'Closed leaf blocks the doorway');
 assert.equal(door.leaf.getObjectByName('plain-white-door-panel').material.color.getHexString(),'ffffff');
 assert.equal(door.leaf.children.filter(o=>o.name==='silver-lever-handle').length,2);
 const ray=new THREE.Raycaster(new THREE.Vector3(mid.x-pose.dz*.6,1.4,mid.z+pose.dx*.6),new THREE.Vector3(pose.dz,0,-pose.dx));
 assert.equal(system.pick(ray)?.id,d.id,'Closed panel can be clicked');
 const before=door.leaf.matrixWorld.clone();system.toggle(d.id);step();
 assert.equal(door.progress,1);assert.notDeepEqual(door.leaf.matrixWorld.elements,before.elements,'Frozen transforms update');
 const open=hingedDoorPose(d,1),[dx,dz]=expected[d.id];
 assert.ok(Math.abs(open.dx-dx)<1e-10&&Math.abs(open.dz-dz)<1e-10,`${d.id} follows the plan swing`);
 assert.ok(!system.blocksPoint(mid.x,mid.z,.18),'Open leaf releases the original doorway');
 const openMid=new THREE.Vector3(open.x+open.dx*d.width/2,1.4,open.z+open.dz*d.width/2);
 ray.set(openMid.clone().add(new THREE.Vector3(-open.dz*.5,0,open.dx*.5)),new THREE.Vector3(open.dz,0,-open.dx));
 assert.equal(system.pick(ray)?.id,d.id,'Open panel remains clickable');
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.25),new THREE.MeshBasicMaterial());blocker.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction,.25);blocker.updateMatrixWorld();
 assert.equal(system.pick(ray,[blocker]),null,'Cannot click through other objects');
 // Panel corners and perimeter remain clear of the actual wall volumes throughout the sweep.
 for(let p=0;p<=1.001;p+=.025){const a=hingedDoorPose(d,p);for(let u=.002;u<d.width;u+=.015)for(const v of [d.swing*d.thickness/2-.019,d.swing*d.thickness/2+.019]){
  const x=a.x+a.dx*u-a.dz*v,z=a.z+a.dz*u+a.dx*v;
  assert.ok(!walls.some(w=>x>w.min[0]+.0001&&x<w.max[0]-.0001&&z>w.min[2]+.0001&&z<w.max[2]-.0001),`${d.id} clears the jamb throughout its swing`);
 }}
 const half=hingedDoorPose(d,.5),person={x:half.x+half.dx*d.width*.7,z:half.z+half.dz*d.width*.7,r:.18};
 system.setOpen(d.id,false);step([person]);step([person]);assert.equal(door.progress,1,'Closing reverses around an occupied swing');
 system.setOpen(d.id,false);step();assert.equal(door.progress,0);
 system.setOpen(d.id,true);step([person]);assert.ok(door.progress<1,'Opening pauses before hitting an occupant');
 assert.equal(hingedDoorTouches(d,door.progress,person.x,person.z,person.r),false);step();assert.equal(door.progress,1,'Opening resumes after occupant moves');
 system.setOpen(d.id,false);system.update(.1);const progress=door.progress;system.toggle(d.id);assert.equal(door.progress,progress,'No jump when reversing');step();
}
assert.equal(system.update(.1),false,'Stationary doors leave shadow maps and renderer idle');
assert.equal(system.update(NaN),false);assert.throws(()=>system.toggle('none'),RangeError);
assert.ok(events.some(s=>s.obstructed));
system.setPlanVisible(true);assert.ok(system.doors.every(d=>d.arc.visible));system.setPlanVisible(false);
const combined=createDoors(new THREE.Scene());setDoorCollisionTest(combined.blocksPoint);
assert.equal(combined.state.length,7,'Four new hinged and three existing pocket doors');
for(const room of rooms)assert.ok(canWalk(...safeRoomPosition(room)),`Safe spawn in ${room.id}`);
for(const s of combined.state)combined.setOpen(s.id,true);for(let i=0;i<30;i++)combined.update(.1);
for(const d of hingedDoorLayout){const p=hingedDoorPose(d,0),x=p.x+p.dx*d.width/2,z=p.z+p.dz*d.width/2;assert.ok(canWalk(x,z),'Doorway traversable when open');}
setDoorCollisionTest(null);
console.log('PASS: four plain white hinged doors, plan-accurate jambs/90-degree swings, silver handles, picking, animation after freeze, swept occupancy, wall clearance and shared door integration.');
