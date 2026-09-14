import assert from 'node:assert/strict';
import { point } from '../dist/model.js';
import { wallVolumes, unionSurface } from '../dist/wall-geometry.js';

// An overlap must become one boundary, not two boxes with hidden faces.
const overlap=unionSurface([
 {min:[0,0,0],max:[1,1,1]},
 {min:[.5,0,0],max:[1.5,1,1]},
]);
assert.equal(overlap.surfaceArea,8);

// A joint is padded by the thickness of the perpendicular wall, not by the
// wall's own thickness. This prevents a thick wall from forming a tooth past a
// thinner wall, while a free end remains a clean butt end.
const unequal=wallVolumes([
 {a:[42,54],b:[128,54],t:.34},
 {a:[128,54],b:[128,140],t:.10},
],[]);
const occupied=(boxes,x,z,y=1)=>boxes.some(b=>x>=b.min[0]&&x<=b.max[0]&&y>=b.min[1]&&y<=b.max[1]&&z>=b.min[2]&&z<=b.max[2]);
assert.equal(occupied(unequal,1.06,0),false,'Thick wall must not protrude past the thinner joining wall');
assert.equal(occupied(unequal,1.049,-.16),true,'Unequal L-joint must still fill its outside corner');
const freeEnd=wallVolumes([{a:[42,54],b:[128,54],t:.20}],[]);
assert.equal(occupied(freeEnd,1.01,0),false,'Free wall end must stop at its endpoint');

const volumes=wallVolumes();
const at=(drawing,y=1)=>{const [x,z]=point(drawing);return volumes.some(b=>x>=b.min[0]&&x<=b.max[0]&&y>=b.min[1]&&y<=b.max[1]&&z>=b.min[2]&&z<=b.max[2]);};
for(const p of [[409,140],[698.5,493],[698.5,742],[861,1114],[270,496],[400,34],[866,1341]])assert.ok(at(p),`Unfilled junction at ${p}`);
assert.equal(at([269,850]),false,'Remove doubled utility wall, not just hide its seam');
for(const p of [[409,560],[300.32,600],[529,580],[400,742],[150,958]])assert.equal(at(p),false,`Door must remain open at ${p}`);

const surface=unionSurface(volumes);
// Every mesh edge belongs to exactly two triangles, including material seams.
// This catches holes, unjoined caps and internal/duplicate surfaces.
const edges=new Map();let triangles=0;
const vertex=p=>p.map(n=>n.toFixed(6)).join(',');
for(const positions of surface.faces)for(let i=0;i<positions.length;i+=9){
 const p=[0,3,6].map(j=>vertex(positions.slice(i+j,i+j+3)));
 for(let k=0;k<3;k++){const edge=[p[k],p[(k+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
 triangles++;
}
const bad=[...edges].filter(([,n])=>n!==2);
assert.deepEqual(bad,[],'The architectural union must be a closed surface');
console.log(`PASS: filled L/T junctions, open doors, no duplicate utility wall; ${triangles} triangles form a watertight union.`);
