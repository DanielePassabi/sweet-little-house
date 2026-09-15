import assert from 'node:assert/strict';
import {createMovement,DEFAULT_EYE_HEIGHT} from '../dist/movement.js';
import {canStand,rooms,point,HEIGHT} from '../dist/model.js';
import {wallVolumes} from '../dist/wall-geometry.js';

function travel(codes,fps=60,seconds=2,yaw=0,canWalk=()=>true){
 const movement=createMovement(canWalk),p={x:0,y:DEFAULT_EYE_HEIGHT,z:0},keys=new Set(codes);
 for(let i=0;i<fps*seconds;i++)movement.update(1/fps,keys,yaw,p);
 return {movement,p};
}
const straight=travel(['KeyW']).p,diagonal=travel(['KeyW','KeyD']).p;
assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-Math.abs(straight.z))<1e-8,'Diagonals must not move faster');
assert.deepEqual(travel(['ArrowUp']).p,straight,'Arrows and WASD must match');
assert.equal(travel(['KeyW','KeyS']).p.z,0,'Opposing inputs cancel');
assert.ok(Math.abs(travel(['KeyW','ShiftLeft']).p.z/straight.z-2)<1e-8,'Shift doubles speed');
assert.deepEqual(travel(['KeyW','ShiftLeft']).p,travel(['KeyW','ShiftRight']).p);
for(const fps of [10,30,144])assert.ok(Math.abs(travel(['KeyW'],fps).p.z-straight.z)<.01,'Movement is stable across frame rates');
assert.ok(travel(['KeyW'],60,2,Math.PI/2).p.x<-2.8,'Forward follows yaw');
const released=travel(['KeyW']);const z=released.p.z;released.movement.update(1/60,new Set(),0,released.p);assert.equal(released.p.z,z,'No drifting after release');
const barrier=(x,z)=>!(z<-.9&&z>-1.1);
assert.ok(travel(['KeyW','ShiftLeft'],10,2,0,barrier).p.z>=-.9,'Sprint cannot tunnel through thin obstacles');
const slide=travel(['KeyW','KeyD','ShiftLeft'],30,2,0,barrier).p;
assert.ok(slide.x>3&&slide.z>=-.9,'Slide along walls instead of sticking');
for(const ceiling of [.73,.18]){
 const movement=createMovement(()=>true,()=>ceiling),p={x:0,y:1.75,z:0};let peak=0;
 movement.jump();
 for(let i=0;i<120;i++){movement.update(1/120,new Set(),0,p);peak=Math.max(peak,movement.jumpHeight);if(i===12)movement.jump();}
 assert.ok(peak>0&&peak<=ceiling,'Jump is limited by overhead clearance');
 assert.ok(peak<=.32,'No double jump');assert.equal(p.y,1.75,'Land at reference eye height');
 movement.jump();movement.update(.05,new Set(),0,p);movement.reset();movement.update(.01,new Set(),0,p);assert.equal(p.y,1.75,'Pause resets jumping');
}
const volumes=wallVolumes();
const clearance=(x,z,eye)=>Math.max(0,Math.min(HEIGHT,...volumes.filter(v=>v.min[1]>0&&x+.18>v.min[0]&&x-.18<v.max[0]&&z+.18>v.min[2]&&z-.18<v.max[2]).map(v=>v.min[1]))-eye-.12);
for(const room of rooms){
 const [x,z]=point(room.at),p={x,z,y:1.75},movement=createMovement(canStand,clearance);movement.jump();
 for(let i=0;i<120;i++){movement.update(1/120,new Set(),0,p);assert.ok(p.y+.12<=HEIGHT+1e-6);}
 assert.equal(p.y,1.75);
}
console.log('PASS: WASD/arrows, sprint, diagonals, frame rates, wall sliding, no tunnelling, jump/landing/headroom and reset.');
