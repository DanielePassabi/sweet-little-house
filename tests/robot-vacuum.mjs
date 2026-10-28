import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {rooms,insidePolygon} from '../dist/model.js';
import {canWalk,canWalkWithoutDoors,intersects,setKitchenCollisionVariant,setDoorCollisionTest} from '../dist/furniture-collisions.js';
import {createRobotController,clearRobotSegment,robotLayout,robotDockCollider} from '../dist/robot-navigation.js';
import {createRobotVacuum} from '../dist/robot-vacuum.js';
import {createDoors} from '../dist/doors.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
import {shoeCabinetOpenCollider} from '../dist/entryway-layout.js';

const isFree=(x,z,r)=>canWalkWithoutDoors(x,z,r)&&!doors.blocksWhenOpen(x,z,r)&&!intersects(robotDockCollider,x,z,r)&&!intersects(shoeCabinetOpenCollider,x,z,r);
assert.ok(insidePolygon(robotLayout.dock.x,robotLayout.dock.z,rooms.find(r=>r.id==='utility').polygon));

assert.equal(clearRobotSegment({x:0,z:0},{x:1,z:0},x=>Math.abs(x-.5)>.03),false,'Swept check catches an obstacle between clear endpoints');
const scene=new THREE.Scene(),visual=createRobotVacuum(scene),doors=createDoors(scene);
freezeStaticTransforms(scene);
assert.ok(isFree(robotLayout.dock.x,robotLayout.dock.z,robotLayout.clearance),'Docked robot clears walls, utilities and charging station');
const bodyBounds=new THREE.Box3().setFromObject(visual.robot);
assert.ok(bodyBounds.max.y<.15&&bodyBounds.min.y>.005,'Small floor-level robot with raised LiDAR and mop pads');
assert.equal(visual.robot.getObjectByName('mop-pad')!==undefined,true);
let dynamicCasters=0,lights=0;
visual.robot.traverse(o=>{if(o.castShadow)dynamicCasters++;if(o.isLight)lights++;});
assert.equal(dynamicCasters,0,'Moving robot reuses house shadow maps and has its own contact shadow');assert.equal(lights,0);
const ray=new THREE.Raycaster(new THREE.Vector3(robotLayout.dock.x,2,robotLayout.dock.z),new THREE.Vector3(0,-1,0));
assert.ok(visual.pick(ray),'Robot is clickable');
const occluder=new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.5),new THREE.MeshBasicMaterial());
occluder.position.set(robotLayout.dock.x,1,robotLayout.dock.z);occluder.updateMatrixWorld();
assert.equal(visual.pick(ray,[occluder]),null,'Cannot click through a wall or furniture');
occluder.visible=false;assert.ok(visual.pick(ray,[occluder]));
setDoorCollisionTest(doors.blocksPoint);
const liveFree=(x,z,r)=>canWalk(x,z,r)&&!intersects(robotDockCollider,x,z,r);
function controller(onChange=()=>{}){return createRobotController({isFree,canMove:liveFree,prepareStep:doors.prepareRobotStep,onChange});}
function advance(robot,dt=.1){
 const before=robot.state;
 doors.update(dt,[{x:before.x,z:before.z,r:robotLayout.clearance}]);robot.update(dt);
 const after=robot.state;
 assert.ok(liveFree(after.x,after.z,robotLayout.radius),`No collision at ${after.x}, ${after.z}`);
 assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<=robotLayout.speed*Math.min(dt,.1)+1e-8,'No teleport or tunnelling');
 return after;
}
for(const variant of ['1','2','3']){
 setKitchenCollisionVariant(variant);
 for(const d of doors.state)doors.setOpen(d.id,false);
 for(let i=0;i<20;i++)doors.update(.1);
 const robot=controller();assert.equal(robot.update(.1),false,'Docked robot is idle');robot.toggle();
 let frames=0;
 while(robot.state.mode!=='docked'&&frames++<16000)advance(robot);
 assert.equal(robot.state.mode,'docked',`Variant ${variant} completes tour and returns`);
 assert.equal(robot.state.completed,true);
 assert.deepEqual([...robot.state.visited].sort(),rooms.map(r=>r.id).sort(),`Variant ${variant}: every room is visited`);
 assert.ok(doors.state.every(d=>d.open),'All seven initially closed doors were opened along the route');
 assert.ok(Math.hypot(robot.state.x-robotLayout.dock.x,robot.state.z-robotLayout.dock.z)<.005);
 assert.equal(robot.state.yaw,robotLayout.dock.yaw,'Faces out from charger after docking');
 assert.equal(robot.update(.1),false,'Completed tour stops rendering');
 console.log(`PASS: kitchen ${variant}, full collision-free tour of nine spaces and return (${(frames/10).toFixed(1)} simulated seconds).`);
}
const robot=controller();robot.toggle();for(let i=0;i<200;i++)advance(robot);
robot.toggle();const paused=robot.state;assert.equal(paused.mode,'paused');
for(let i=0;i<30;i++)assert.equal(robot.update(.1),false);
assert.deepEqual(robot.state,paused,'Pause preserves position and mission');
robot.toggle();advance(robot);assert.equal(robot.state.mode,'cleaning');
robot.toggle();robot.returnHome();assert.equal(robot.state.mode,'returning','Return works while paused');
for(let i=0;i<3000&&robot.state.mode!=='docked';i++)advance(robot);
assert.equal(robot.state.mode,'docked');assert.equal(robot.state.completed,false,'Cancelled tour does not claim completion');
robot.toggle();for(let i=0;i<15;i++)advance(robot);
const before=visual.robot.matrixWorld.clone();visual.sync(robot.state,.1);
assert.notDeepEqual(visual.robot.matrixWorld.elements,before.elements,'Animated matrices update after scene freeze');
const brushBefore=visual.brush.matrix.clone();visual.sync(robot.state,.1);
assert.notDeepEqual(visual.brush.matrix.elements,brushBefore.elements,'Side brush spins during cleaning');
setKitchenCollisionVariant('2');robot.replan();assert.ok(isFree(robot.state.x,robot.state.z,robotLayout.clearance));
robot.returnHome();for(let i=0;i<3000&&robot.state.mode!=='docked';i++)advance(robot);assert.equal(robot.state.mode,'docked');
assert.equal(robot.update(NaN),false);assert.equal(robot.update(-1),false);
// A new visitor is a temporary obstacle, not a reason to abandon the tour.
let occupied=true;
const waiting=createRobotController({isFree,canMove:(x,z,r)=>!occupied&&isFree(x,z,r)});waiting.toggle();
for(let i=0;i<100;i++)waiting.update(.1);
assert.equal(waiting.state.waiting,true);assert.equal(waiting.state.x,robotLayout.dock.x);
occupied=false;for(let i=0;i<100;i++)waiting.update(.1);assert.equal(waiting.state.waiting,false);
// Closing a door must also protect the robot when the visitor is elsewhere.
const door=doors.sliding.doors[0],d=door.layout,u=(d.start+d.end)/2;
doors.setOpen(d.id,true);for(let i=0;i<20;i++)doors.update(.1);doors.setOpen(d.id,false);
for(let i=0;i<40;i++)doors.update(.1,[{x:9,z:14,r:.2},{x:d.x+d.ux*u,z:d.z+d.uz*u,r:robotLayout.clearance}]);
assert.equal(door.progress,1,'Door reopens for the robot occupant');
setDoorCollisionTest(null);setKitchenCollisionVariant('1');
console.log('PASS: dock geometry, picking/occlusion, pause/resume/recall, visitor avoidance, door safety, layout replanning, animation after freeze and idle rendering.');
