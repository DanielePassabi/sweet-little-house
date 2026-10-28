import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createTVConsole} from '../dist/tv-console.js';
import {createMediaStation} from '../dist/media-station.js';
import {mediaConsole,mediaBookcase,mediaCollider} from '../dist/media-layout.js';
import {canStand} from '../dist/model.js';
import {canWalk,setKitchenCollisionVariant,intersects} from '../dist/furniture-collisions.js';
const scene=new THREE.Scene(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,parent)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
const cabinet=createTVConsole(scene,box),station=createMediaStation(scene,box,{black:new THREE.MeshStandardMaterial(),screen:new THREE.MeshStandardMaterial(),wall:new THREE.MeshStandardMaterial()});
scene.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(cabinet),size=bounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z-2.80)<1e-6&&Math.abs(size.x-.48)<1e-6&&Math.abs(size.y-2.36)<1e-6,'Composition fits the available 280 × 48 × 236 cm volume');
const top=new THREE.Box3().setFromObject(cabinet.getObjectByName('continuous-oak-top'));
assert.ok(Math.abs(top.max.y-mediaConsole.top)<1e-6,'Low base remains 44 cm high');
assert.ok(Math.abs(bounds.min.x-3.09)<1e-6,'Rear cable space remains intact');
const look=(x,y)=>new THREE.Raycaster(cabinet.localToWorld(new THREE.Vector3(x,y,.6)),new THREE.Vector3(-1,0,0)).intersectObject(cabinet,true);
for(const x of [-.55,0,.60])assert.equal(look(x,.35)[0].object.name,'rear-panel-with-cable-hole','Three real open base niches');
assert.equal(look(-.20,.34).length,0,'Base cable hole passes through');
const tv=new THREE.Box3().setFromObject(station.getObjectByName('lg-c1-83'));
let feet=0,triangles=0;
cabinet.traverse(o=>{
 assert.ok(!o.isLight);if(!o.isMesh)return;
 const b=new THREE.Box3().setFromObject(o),p=o.geometry.attributes.position;
 if(o.name==='recessed-oak-foot'){feet++;assert.ok(Math.abs(b.max.y-.09)<1e-6&&Math.abs(b.min.y)<1e-6);}
 if(o.name==='bookcase-side')assert.ok(b.max.z<tv.min.z-.07,'Entire bookcase stands to the right of the TV with a gap');
 assert.ok(!b.intersectsBox(tv),'Cabinet cannot cover the TV screen');
 triangles+=(o.geometry.index?.count??p.count)/3;
 for(let i=0;i<p.count;i++){
  const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
  assert.ok(Number.isFinite(v.x+v.y+v.z)&&canStand(v.x,v.z,0),'Finite geometry clear of architecture');
  assert.ok(intersects(mediaCollider,v.x,v.z,.00001),'Cabinet fits the shared collision bounds');
 }
 for(const name of ['desktop-pc','ps4-pro','steam-deck-docked','white-controller','grey-controller']){
  const device=new THREE.Box3().setFromObject(station.getObjectByName(name)).expandByScalar(-.0001);
  assert.ok(!b.intersectsBox(device),`${o.name} clears ${name}`);
 }
});
assert.equal(feet,6);assert.ok(triangles<14000);
const pc=new THREE.Box3().setFromObject(station.getObjectByName('desktop-pc'));
assert.ok(mediaBookcase.shelves[0]-.024-pc.max.y>.10,'Over 10 cm of air above the PC');
for(const id of ['1','2','3']){setKitchenCollisionVariant(id);assert.equal(canWalk(mediaConsole.x,mediaConsole.z),false);assert.ok(canWalk(3.82,9.72),'Front circulation stays open');}
console.log(`PASS: oak base, three open niches, right-hand bookcase, full screen clearance, ventilated rotated PC bay, supporting feet, architecture and circulation; ${triangles} triangles.`);
