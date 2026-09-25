import assert from 'node:assert/strict';
import {canWalk,intersects,furnitureColliders,safeRoomPosition} from '../dist/furniture-collisions.js';
import {kitchenModules,kitchenColliders,diningChairs} from '../dist/kitchen-layout.js';
import {canStand,rooms,point} from '../dist/model.js';
const box={minX:0,maxX:1,minZ:0,maxZ:1};
assert.equal(intersects(box,.5,.5,0),true,'Points inside a solid must collide');
assert.equal(intersects(box,1.15,1.15,.18),false,'Rounded player clearance frees square corners');
assert.equal(intersects(box,1.1,1.1,.18),true);
assert.equal(canWalk(3.5,14.2),true,'Free space beside dining table must not be blocked');
assert.equal(canWalk(4.35,13.10),false,'Round table remains solid');
assert.equal(canWalk(4.80,11.60),true,'Previous dining location is free');
assert.equal(canWalk(1.6,5.68),true,'Former desk location is clear');
assert.equal(canWalk(.60,7.40),false,'Relocated desk chair is solid');
assert.equal(canWalk(.64,5.83),false,'Reading chair is solid');
for(const room of rooms)assert.ok(canWalk(...safeRoomPosition(room)),`${room.id} spawn`);
// Compare the bucketed broad phase with a complete scan across the whole house.
for(let x=-.2;x<10;x+=.13)for(let z=-.2;z<16;z+=.13){
 const expected=canStand(x,z)&&!furnitureColliders.some(c=>intersects(c,x,z,.18));
 assert.equal(canWalk(x,z),expected,'Spatial buckets must not miss an obstacle');
}
const step=.065,cols=165,rowsCount=245,offset=-.4;
const key=(x,z)=>Math.round((z-offset)/step)*cols+Math.round((x-offset)/step);
const grid=new Uint8Array(cols*rowsCount);
for(let r=0;r<rowsCount;r++)for(let c=0;c<cols;c++)grid[r*cols+c]=canWalk(offset+c*step,offset+r*step)?1:0;
const start=key(...safeRoomPosition(rooms[0])),seen=new Set([start]),queue=[start];
for(let i=0;i<queue.length;i++){const k=queue[i],r=Math.floor(k/cols),c=k%cols;for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,nk=nr*cols+nc;if(nc>=0&&nc<cols&&nr>=0&&nr<rowsCount&&grid[nk]&&!seen.has(nk)){seen.add(nk);queue.push(nk);}}}
for(const room of rooms)assert.ok(seen.has(key(...safeRoomPosition(room))),`${room.id} reachable with furniture`);
console.log('PASS: rounded clearance, individual furnishings, spatial index, safe spawns and nine rooms reachable.');

const byId=id=>kitchenModules.find(m=>m.id===id);
assert.equal(byId('hob').d,.60);
assert.equal(byId('sink').w,.60);
assert.equal(byId('dishwasher').w,.60);
assert.equal(byId('window-return').d,.60);
for(const m of kitchenModules)assert.equal(m.face==='west'?m.w:m.d,.60,'Every module is exactly 60 cm deep');
const windowStart=(728-42)/86,windowEnd=(798-42)/86;
for(const m of kitchenModules.filter(m=>m.tall))assert.ok(m.x+m.w/2<windowStart||m.x-m.w/2>windowEnd,'Tall units must clear the window');
assert.ok(seen.has(key(8.4,13.7)),'Working aisle must be accessible');
for(const c of diningChairs)assert.ok(!kitchenColliders.some(k=>intersects(k,c.x,c.z,.29)),'Chairs must clear cabinets');
console.log('PASS: kitchen depths, unobstructed window, chair clearance and accessible working aisle.');

assert.ok(seen.has(key(.43,4.14)),'Shower interior reachable through central entrance');
assert.equal(canWalk(.80,3.55),false,'Fixed shower glass blocks walking');
assert.equal(canWalk(.80,4.14),true,'Central shower entrance remains clear');
console.log('PASS: shower glass collision and accessible central entry.');
