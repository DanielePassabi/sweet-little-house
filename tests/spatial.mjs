import assert from 'node:assert/strict';
import { rooms, nightRoomIds, nightFloorPolygon, point, insidePolygon, canStand, HEIGHT } from '../dist/model.js';
assert.equal(HEIGHT,2.6);
assert.deepEqual([...nightRoomIds].sort(),['bath1','bath2','bedroom','hall','room2','room3']);
for(const id of nightRoomIds){const room=rooms.find(r=>r.id===id);assert.ok(insidePolygon(...point(room.at),nightFloorPolygon),`${id}: missing from continuous parquet area`);}
for(const p of [[400,430],[470,510],[400,690]])assert.ok(insidePolygon(...point(p),nightFloorPolygon),`Parquet infill missing at ${p}`);
assert.equal(insidePolygon(...point(rooms.find(r=>r.id==='living').at),nightFloorPolygon),false,'Parquet must stop before the living area');
for(const room of rooms)assert.ok(canStand(...point(room.at)),`${room.id}: spawn inside a wall`);
assert.equal(canStand(-5,-5),false);
assert.equal(canStand(...point([712,300])),false,'Exterior wall must block movement');
assert.equal(canStand(...point([30,600])),false,'Window must block movement');
const step=.065,cols=165,rows=245,offset=-.4;
const key=(x,z)=>Math.round((z-offset)/step)*cols+Math.round((x-offset)/step);
const walkable=new Uint8Array(cols*rows);
for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)walkable[r*cols+c]=canStand(offset+c*step,offset+r*step)?1:0;
const start=key(...point(rooms[0].at)),seen=new Set([start]),queue=[start];
for(let i=0;i<queue.length;i++){const k=queue[i],r=Math.floor(k/cols),c=k%cols;for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const nr=r+dr,nc=c+dc,n=nr*cols+nc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&walkable[n]&&!seen.has(n)){seen.add(n);queue.push(n);}}}
for(const room of rooms)assert.ok(seen.has(key(...point(room.at))),`${room.id} cannot be reached from living room`);
console.log(`PASS: ${rooms.length} room spawn points safe and all reachable; exterior and window collisions; 2.60m height. ${seen.size} accessible navigation cells.`);
