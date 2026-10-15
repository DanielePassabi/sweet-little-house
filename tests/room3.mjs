import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createRoom3} from '../dist/room3.js';
import {room3Desk,room3Monitor,room3Sofa,room3Colliders} from '../dist/room3-layout.js';
import {canStand,insidePolygon,rooms} from '../dist/model.js';
import {canWalk} from '../dist/furniture-collisions.js';

const scene=new THREE.Group(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,p)=>{const mesh=new THREE.Mesh(unit,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);p.add(mesh);return mesh;};
const materials=Object.fromEntries(['wood','black','upholstery','accent','sofaFabric','screen'].map(n=>[n,new THREE.MeshStandardMaterial()]));
const furniture=createRoom3(scene,box,materials);scene.updateMatrixWorld(true);
const object=name=>{const o=furniture.getObjectByName(name);assert.ok(o,name);return o;};
const bounds=name=>new THREE.Box3().setFromObject(object(name));
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-5,message);
const left=bounds('desk-half-left'),right=bounds('desk-half-right');
close(left.min.x,right.max.x,'The two original desks meet without a gap');
close(left.max.x-right.min.x,2.04,'Combined width is 204 cm');
close(left.max.z-left.min.z,.64,'Original 64 cm depth is retained');
close(left.max.y,room3Desk.top,'Original desktop height is retained');
const workstation=object('joined-workstation'),display=object('monitor-27-inch'),laptop=object('black-laptop-on-arm');
assert.ok(laptop.position.x<0&&display.position.x>0,'Laptop left and monitor right from the seated user viewpoint');
assert.equal(workstation.rotation.y,Math.PI,'Devices face into the room from the original desk wall');
const active=bounds('monitor-active-screen').getSize(new THREE.Vector3());
close(Math.hypot(active.x,active.y)/.0254,27,'Active display diagonal is 27 inches');
close(active.x/active.y,16/9,'Monitor has a 16:9 panel');
assert.equal(room3Monitor.diagonal,27*.0254);
assert.ok(bounds('laptop-base').min.y>room3Desk.top+.20,'Laptop is suspended above the worktop');
assert.ok(bounds('monitor-frame').min.y>room3Desk.top+.20,'Monitor is suspended above the worktop');
assert.equal(object('laptop-base').material,materials.black);
close(bounds('central-arm-pole').getCenter(new THREE.Vector3()).x,room3Desk.x,'Single support starts at the desk join');
for(const name of ['central-clamp-top','central-clamp-bottom','monitor-arm-link','laptop-arm-link','laptop-support-tray','mechanical-keyboard','desk-mouse','monitor-cable','laptop-cable'])object(name);
assert.ok(object('mechanical-keycaps').isInstancedMesh&&object('mechanical-keycaps').count>90,'Full-size keyboard has batched raised keys');
assert.ok(bounds('keyboard-case').min.y>=room3Desk.top&&bounds('keyboard-case').max.y<room3Desk.top+.04,'Keyboard rests on the desktop');
let chairs=0;furniture.traverse(o=>{if(o.name==='gaming-chair')chairs++;});assert.equal(chairs,1,'Only one chair remains');
for(const name of ['chair-contoured-shell','chair-neck-pillow','chair-lumbar-pillow','chair-armrest','chair-contrast-stitching'])object(name);
assert.equal(object('chair-caster-wheels').count,10,'Five pairs of caster wheels');
// The two harness slots are true openings, not dark stickers on the backrest.
const shell=object('chair-contoured-shell'),back=object('chair-high-back'),ray=new THREE.Raycaster();
for(const x of [-.12,.12]){
 const origin=back.localToWorld(new THREE.Vector3(x,.585,-.3)),direction=new THREE.Vector3(0,0,1).transformDirection(back.matrixWorld);
 ray.set(origin,direction);assert.equal(ray.intersectObject(shell).length,0,'Harness slots stay open through the chair shell');
}
const sofa=bounds('room3-corner-sofa');
close(sofa.max.x-sofa.min.x,room3Sofa.width,'L covers 160 cm along the top wall');
close(sofa.max.z-sofa.min.z,room3Sofa.length,'L returns 150 cm along the window wall');
assert.ok(sofa.max.y<1,'Backrest stays below the existing window sill');
assert.equal(canWalk(.4,5.6),false);assert.equal(canWalk(.4,6.4),false);
assert.equal(canWalk(1.05,6.35),true,'Inner space of the L is free');
for(const p of [[2.60,6.25],[2.25,7.0],[.85,7.0]])assert.ok(canWalk(...p),'Door and workstation approaches remain open');

const room=rooms.find(r=>r.id==='room3'),v=new THREE.Vector3(),matrix=new THREE.Matrix4();let triangles=0,draws=0;
furniture.traverse(mesh=>{
 if(!mesh.isMesh)return;draws++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.count??1);
 for(let i=0;i<(mesh.count??1);i++){
  if(mesh.isInstancedMesh)mesh.getMatrixAt(i,matrix);else matrix.identity();
  for(let j=0;j<mesh.geometry.attributes.position.count;j++){
   v.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
   assert.ok(Number.isFinite(v.x+v.y+v.z),`Finite geometry: ${mesh.name}`);
   assert.ok(canStand(v.x,v.z,0)&&insidePolygon(v.x,v.z,room.polygon),`Room furniture clears walls: ${mesh.name} at ${v.x},${v.z}`);
   assert.ok(v.y>=-1e-5&&v.y<2.6,`Furniture fits floor/ceiling: ${mesh.name}`);
   assert.ok(room3Colliders.some(c=>v.x>=c.minX-1e-5&&v.x<=c.maxX+1e-5&&v.z>=c.minZ-1e-5&&v.z<=c.maxZ+1e-5),`Visible part fits walking footprint: ${mesh.name}`);
  }
 }
});
assert.ok(draws<140&&triangles<40000,'Room details stay within a modest budget before global box batching');
console.log(`PASS: joined 204 cm desk, central dual arm, 27-inch panel, left laptop, mechanical keyboard, single photo-inspired chair, low L sofa, clear architecture/collisions; ${draws} meshes, ${triangles} triangles.`);
