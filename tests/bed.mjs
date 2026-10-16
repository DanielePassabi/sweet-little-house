import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createBed} from '../dist/bed.js';
import {point} from '../dist/model.js';
import {canWalk} from '../dist/furniture-collisions.js';

const wallX=point([409,54])[0]+.15/2,scene=new THREE.Scene();
const materials=Object.fromEntries(['frame','fabric','duvet','accent'].map(key=>[key,new THREE.MeshStandardMaterial()]));
const bed=createBed(scene,{wallX,...materials}),bounds=new THREE.Box3().setFromObject(bed);
assert.ok(bounds.min.x>=wallX+.02,'Upholstery clears the walnut wall panel');
assert.ok(Math.abs(bounds.max.x-(wallX+2))<1e-5,'Original two metre wall-to-footprint dimension is preserved');
assert.ok(bounds.min.z>=2.11-1e-6&&bounds.max.z<=3.99+1e-6,'Existing headboard width and side clearances are preserved');
assert.ok(bounds.min.y>0&&bounds.max.y<1,'Ground clearance and original headboard height');
let triangles=0,meshes=0;
bed.traverse(o=>{
 assert.ok(!o.isLight,'Bed adds no light sources');if(!o.isMesh)return;meshes++;
 const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
 for(const v of p.array)assert.ok(Number.isFinite(v),'Finite geometry');
 for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-4,'Smooth unit normals');
 triangles+=(o.geometry.index?.count??p.count)/3;
});
assert.ok(meshes<35&&triangles<85000,'Bounded static geometry cost');
for(const name of ['draped-lilac-duvet','turned-back-duvet-cuff']){
 const mesh=bed.getObjectByName(name),g=mesh.geometry,edges=new Map();
 // Each edge joins two triangles with opposite winding: a closed cloth volume.
 for(let i=0;i<g.index.count;i+=3){
  const face=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
  for(let j=0;j<3;j++){const a=face[j],b=face[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');const entry=edges.get(key)??{count:0,balance:0};entry.count++;entry.balance+=a<b?1:-1;edges.set(key,entry);}
 }
 assert.ok([...edges.values()].every(e=>e.count===2&&e.balance===0),'Duvet volume is watertight with outward rim winding');
 assert.ok(g.boundingBox.max.y-g.boundingBox.min.y>.20,'Duvet drapes down the mattress sides');
 const ray=new THREE.Raycaster(new THREE.Vector3(wallX+(name==='draped-lilac-duvet'?1.3:.8),2,3.05),new THREE.Vector3(0,-1,0));
 const hit=ray.intersectObject(mesh)[0];assert.ok(hit&&hit.face.normal.y>.8,'Upper cloth surface faces the lights');
}
const mattress=new THREE.Box3().setFromObject(bed.getObjectByName('rounded-mattress'));
assert.ok(mattress.max.y>.52&&mattress.max.y<.55);
for(const pillow of bed.children.filter(o=>o.name==='sleeping-pillow')){
 const box=new THREE.Box3().setFromObject(pillow);assert.ok(box.max.y-box.min.y>.19,'Pillow has a full, rounded centre');
 assert.ok(box.min.y<mattress.max.y+.015&&box.max.y>mattress.max.y+.15,'Pillow rests against the mattress');
}
for(const p of [[6.6,3.05],[5.4,1.85],[5.4,4.25],[4.65,5.8]])assert.ok(canWalk(...p),'Existing circulation stays free');
console.log(`PASS: soft double bed, unchanged footprint, rounded pillows, closed draped bedding, correct normals and free circulation; ${meshes} meshes, ${triangles} triangles.`);
