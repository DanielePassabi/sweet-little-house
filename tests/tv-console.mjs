import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createTVConsole} from '../dist/tv-console.js';
import {createMediaStation} from '../dist/media-station.js';
import {mediaConsole,mediaCollider,television,dockCableHole} from '../dist/media-layout.js';
import {canStand} from '../dist/model.js';
import {canWalk,setKitchenCollisionVariant,intersects} from '../dist/furniture-collisions.js';
const scene=new THREE.Scene(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,parent)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
const cabinet=createTVConsole(scene,box),station=createMediaStation(scene,box,{black:new THREE.MeshStandardMaterial(),screen:new THREE.MeshStandardMaterial(),wall:new THREE.MeshStandardMaterial()});
scene.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(cabinet),size=bounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z-2.60)<1e-6&&Math.abs(size.x-.48)<1e-6&&Math.abs(size.y-.60)<1e-6,'Console measures 260 × 48 × 60 cm, including feet');
assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z-television.centerZ)<1e-8,'Console is centred exactly below the existing TV');
assert.equal(cabinet.getObjectByName('bookcase-side'),undefined,'Tall column has been removed');
const top=new THREE.Box3().setFromObject(cabinet.getObjectByName('continuous-oak-top'));
assert.ok(Math.abs(top.max.y-mediaConsole.top)<1e-6,'Top supports devices at 60 cm');
assert.ok(Math.abs(bounds.min.x-3.09)<1e-6,'Rear cable space remains intact');
const look=(x,y)=>new THREE.Raycaster(cabinet.localToWorld(new THREE.Vector3(x,y,.6)),new THREE.Vector3(-1,0,0)).intersectObject(cabinet,true);
for(const x of [0,.48])assert.equal(look(x,.40)[0].object.name,'rear-panel-with-cable-hole','Unoccupied niches remain open');
const manga=cabinet.getObjectByName('berserk-collection-1-43');
assert.equal(look(manga.userData.volumes[10].x,.40)[0].object.name,'berserk-numbered-spines','Berserk replaces the generic books in the left niche');
assert.equal(cabinet.getObjectByName('base-book'),undefined);
assert.equal(look(0,.34).length,0,'Centred base cable hole passes through');
const holeX=dockCableHole.x-(television.centerZ-mediaConsole.z),holeZ=dockCableHole.z-(mediaConsole.x-television.frontX);
assert.equal(look(holeX,dockCableHole.rearY).length,0,'Dock cables have a real opening in the back panel');
const topRay=new THREE.Raycaster(cabinet.localToWorld(new THREE.Vector3(holeX,mediaConsole.top+.10,holeZ)),new THREE.Vector3(0,-1,0));
assert.equal(topRay.intersectObject(cabinet.getObjectByName('continuous-oak-top')).length,0,'Dock pass-through is cut through the full top thickness');
const tv=new THREE.Box3().setFromObject(station.getObjectByName('lg-c1-83'));
let feet=0,triangles=0;
cabinet.traverse(o=>{
 assert.ok(!o.isLight);if(!o.isMesh)return;
 const b=new THREE.Box3().setFromObject(o),p=o.geometry.attributes.position;
 if(o.name==='recessed-oak-foot'){feet++;assert.ok(Math.abs(b.max.y-.09)<1e-6&&Math.abs(b.min.y)<1e-6);}
 assert.ok(!b.intersectsBox(tv),'Cabinet cannot cover the TV screen');
 triangles+=(o.geometry.index?.count??p.count)/3*(o.count??1);
 for(let instance=0;instance<(o.count??1);instance++)for(let i=0;i<p.count;i++){
  const matrix=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(instance,matrix);
  const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix).applyMatrix4(o.matrixWorld);
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
assert.ok(tv.min.z-pc.max.z>.09,'PC is entirely to the right of the TV, with over 9 cm lateral clearance');
assert.ok(pc.min.z-bounds.min.z>.04,'PC remains over 4 cm inside the right edge of the top');
for(const id of ['1','2','3']){setKitchenCollisionVariant(id);assert.equal(canWalk(mediaConsole.x,mediaConsole.z),false);assert.ok(canWalk(3.82,9.72),'Front circulation stays open');}
console.log(`PASS: centred 260 × 48 × 60 cm oak console without column, three open niches, raised devices clear of TV, supporting feet, cable holes, architecture and circulation; ${triangles} triangles.`);
