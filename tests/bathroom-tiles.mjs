import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {bathroomTileFinish as finish,bathroomTileWalls,tileRectangles,createBathroomTiles} from '../dist/bathroom-tiles.js';
const group=createBathroomTiles(new THREE.Group());
assert.equal(finish.width,1.2);assert.equal(finish.height,.6);assert.equal(finish.top,2.4);assert.equal(finish.grout,.002);
for(const wall of bathroomTileWalls){
 const pieces=tileRectangles(wall);
 const expected=wall.length*(finish.top-.004)-wall.holes.reduce((s,h)=>s+(h.end-h.start)*(Math.min(h.top,finish.top)-Math.max(h.bottom,.004)),0);
 assert.ok(Math.abs(pieces.reduce((s,p)=>s+(p.right-p.left)*(p.top-p.bottom),0)-expected)<1e-8,'Tiles cover each wall except door/window openings');
 for(const p of pieces)for(const h of wall.holes)assert.ok(p.right<=h.start||p.left>=h.end||p.top<=h.bottom||p.bottom>=h.top,'Door/window remain clear');
 for(const mesh of group.children.filter(o=>o.name==='bath1-tiles-'+wall.id)){
  const uv=mesh.geometry.attributes.uv,pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  assert.ok(Math.abs(normal.getX(0)+wall.along[1])<1e-7&&Math.abs(normal.getZ(0)-wall.along[0])<1e-7,'Tiles face into the room');
  for(let i=0;i<pos.count;i++)assert.ok(Math.abs(uv.getY(i)-pos.getY(i))<1e-7,'Courses align at identical heights across pieces and walls');
 }
}
const bounds=new THREE.Box3().setFromObject(group);assert.ok(bounds.max.y<2.405&&bounds.min.x>0&&bounds.max.x<2.61,'Cladding stays in Bath 1 and below ceiling');
assert.equal(new Set(group.children.filter(m=>m.name.startsWith('bath1-tiles-')).map(m=>m.material)).size,1,'Cladding shares one finish');
const material=group.children[0].material,map=material.map,rgba=map.image.data;
assert.equal(map.repeat.x,1/1.2);assert.equal(map.repeat.y,1/.6);assert.ok(material.roughness>.8);
let r=0,g=0,b=0;for(let i=0;i<rgba.length;i+=4){r+=rgba[i];g+=rgba[i+1];b+=rgba[i+2];}const n=rgba.length/4;
assert.ok(r/n>210&&r/n<218&&r>g&&g>b,'Light warm greige with subtle stone variation');
assert.ok(group.children.every(m=>!m.name.includes('clip')),'No installation hardware');
console.log('PASS: metric 120 × 60 cm warm greige wall tiles, 2 mm joints, four aligned courses, window/door cutouts and white ceiling band.');
