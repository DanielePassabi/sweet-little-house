import assert from 'node:assert/strict';
import {createMovement,createWalkLook,DEFAULT_EYE_HEIGHT} from '../dist/movement.js';
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
const released=travel(['KeyW']),releaseZ=released.p.z;
let previousStep=1.5/60,brakingFrames=0;
for(let i=0;i<60;i++){
 const before=released.p.z;
 released.movement.update(1/60,new Set(),0,released.p);
 const step=before-released.p.z;
 assert.ok(step>=0&&step<=previousStep,'Brake monotonically');
 if(step>0)brakingFrames++;
 previousStep=step;
}
assert.ok(brakingFrames>1&&brakingFrames<15);
assert.ok(Math.abs(releaseZ-released.p.z-.05)<.001,'Stopping distance at walking speed');
assert.equal(previousStep,0,'Come fully to rest');
function analog(stick,intervals){
 const m=createMovement(()=>true),p={x:0,y:1.75,z:0},keys=new Set();
 for(const dt of intervals)m.update(dt,keys,0,p,1.75,stick);
 return p;
}
const input={right:.3,forward:.4},regular=Array(240).fill(1/120);
const uneven=Array.from({length:20},()=>[.007,.021,.013,.059]).flat();
const smooth=analog(input,regular),variable=analog(input,uneven);
assert.ok(Math.hypot(smooth.x-variable.x,smooth.z-variable.z)<1e-10,'Frame pacing does not alter distance');
assert.ok(Math.abs(smooth.x+straight.z*.3)<1e-9&&Math.abs(smooth.z-straight.z*.4)<1e-9);
const look=createWalkLook();let yaw=0,pitch=0;
const advance=dt=>look.update(dt,(dx,dy)=>{yaw+=dx;pitch+=dy;});
look.turn(260,4000,.002,pitch);advance(1/120);
assert.ok(yaw<0&&yaw>-.52);
uneven.forEach(advance);
assert.ok(Math.abs(yaw+.52)<1e-10,'Coalesced mouse motion keeps its full distance');
assert.ok(Math.abs(pitch+1.35)<1e-10);
look.turn(0,-15,.004,pitch);regular.forEach(advance);
assert.ok(Math.abs(pitch+1.29)<1e-10,'Reverses immediately from the pitch limit');
look.turn(60,20,.002,pitch);look.reset();
const paused=[yaw,pitch];advance(.1);assert.deepEqual([yaw,pitch],paused);
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

// Exercise concurrent controls using the same events as the canvas and touch buttons.
const {createWalkControls}=await import('../dist/walk-controls.js');
const canvas=new EventTarget(),pad={firstElementChild:{offsetWidth:44,style:{}}},run={dataset:{move:'run'}},jump={dataset:{move:'jump'}};
const turns=[];let jumps=0;
globalThis.document=new EventTarget();
for(const el of [canvas,pad,run,jump])el.setPointerCapture=()=>{};
canvas.focus=()=>{};
pad.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
const controls=createWalkControls({canvas,pad,buttons:[run,jump],active:()=>true,jump:()=>jumps++,turn:(...delta)=>turns.push(delta)});
const pointer=(type,pointerId,clientX,clientY)=>Object.assign(new Event(type),{pointerId,clientX,clientY,button:0});
pad.onpointerdown(pointer('pointerdown',1,50,22));
canvas.dispatchEvent(pointer('pointerdown',2,220,180));
canvas.dispatchEvent(pointer('pointermove',2,244,189));
canvas.dispatchEvent(pointer('pointerup',7,0,0));
canvas.dispatchEvent(pointer('pointermove',2,254,189));
assert.deepEqual(turns,[[24,9,.004],[10,0,.004]],'A different pointer cannot interrupt a turn');
assert.equal(controls.stick.forward,1,'Walking continues while looking around');
run.onpointerdown(pointer('pointerdown',3,0,0));jump.onpointerdown(pointer('pointerdown',4,0,0));
jump.onpointerup(pointer('pointerup',4,0,0));assert.ok(controls.stick.running);assert.equal(jumps,1);
pad.onpointercancel(pointer('pointercancel',1,50,22));
assert.equal(controls.stick.forward,0);
controls.reset();assert.equal(controls.stick.running,false);
canvas.dispatchEvent(pointer('pointermove',2,274,189));assert.equal(turns.length,2);
delete globalThis.document;
