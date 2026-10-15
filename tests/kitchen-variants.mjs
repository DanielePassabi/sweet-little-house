import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.js';
import {createKitchen} from '../dist/kitchen.js';
import {kitchenVariants,getKitchenVariant,getDiningConfiguration} from '../dist/kitchen-variants.js';
import {createDiningSet} from '../dist/dining.js';
import {canWalk,setKitchenCollisionVariant,furnitureColliders,intersects,safeRoomPosition} from '../dist/furniture-collisions.js';
import {canStand,rooms,walls,point} from '../dist/model.js';

const materials=Object.fromEntries(['front','wood','ceramic','steel','dark','glass'].map(n=>[n,new THREE.MeshStandardMaterial()]));
const unit=new THREE.BoxGeometry(1,1,1),parent=new THREE.Group();
const box=(w,h,d,m,x,y,z,p)=>{const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);p.add(mesh);return mesh;};
const groups=kitchenVariants.map(layout=>createKitchen(parent,box,materials,layout));parent.updateMatrixWorld(true);
// Captured from the approved kitchen before introducing alternatives. This checks
// transforms, every vertex/normal/UV/index and material assignment, not just sizes.
function fingerprint(group){
 const hash=createHash('sha256');
 group.traverse(o=>{if(!o.isMesh)return;hash.update(o.name);hash.update(JSON.stringify(o.matrixWorld.elements));
  for(const name of ['position','normal','uv']){const a=o.geometry.attributes[name];if(a)hash.update(Buffer.from(a.array.buffer));}
  if(o.geometry.index)hash.update(Buffer.from(o.geometry.index.array.buffer));
  hash.update(Object.entries(materials).find(([,m])=>m===o.material)?.[0]??JSON.stringify(o.material.color));
 });return hash.digest('hex');
}
const approved='dd2ee1e6abe8c461c28947653e3b91556071eb8f7a3a3dacfd34d0a0c7eeae7d';
assert.equal(fingerprint(groups[0]),approved,'Type 1 must remain identical to the approved rendering');
const second=groups[1],layout=getKitchenVariant('2');
assert.ok(!second.getObjectByName('pink-fridge-body'),'Type 2 has no freestanding pink refrigerator');
for(const name of ['integrated-fridge-door','integrated-freezer-door','integrated-pantry-door','under-window-oven-glass','hob-backsplash','breakfast-rounded-top'])assert.ok(second.getObjectByName(name),name);
assert.equal(second.children.filter(o=>o.name==='backsplash-tile').length,36);
const bounds=name=>new THREE.Box3().setFromObject(second.getObjectByName(name));
const oven=bounds('under-window-oven-frame'),hob=bounds('induction-hob'),wood=bounds('breakfast-rounded-top'),splash=bounds('hob-backsplash');
assert.ok(oven.min.x>7.977&&oven.max.x<8.791&&oven.max.y<1,'Oven is entirely beneath the window');
assert.ok(hob.max.x<7.937&&hob.min.z>14.319,'Hob faces solid wall beside the window');
assert.ok(splash.max.x<7.937&&splash.min.x<hob.min.x&&splash.max.x>hob.max.x,'Tiled splashback covers the hob without crossing the window');
assert.ok(splash.min.y>=layout.worktop.y-1e-6&&splash.max.y>1.53);
assert.ok(Math.abs(wood.max.x-wood.min.x-.90)<1e-5&&Math.abs(wood.max.z-wood.min.z-.90)<1e-5);
assert.ok(Math.abs(wood.min.y-layout.worktop.y-.001)<1e-5,'Wood rests above the ceramic');
const ray=new THREE.Raycaster(),hit=(object,x,z)=>{ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(object);};
const top=second.getObjectByName('breakfast-rounded-top');
for(const coordinate of top.geometry.attributes.uv.array)assert.ok(coordinate>=-1e-5&&coordinate<=1.00001,'Oak grain maps across the whole square instead of clamping to a flat edge colour');
assert.ok(hit(top,layout.breakfast.x,layout.breakfast.z).length,'Square has a solid centre');
assert.equal(hit(top,wood.min.x+.01,wood.min.z+.01).length,0,'Rounded corners remove the sharp square tips');
const slab=second.getObjectByName('ceramic-worktop');
assert.equal(hit(slab,layout.sink.x,layout.sink.z).length,0,'Sink remains an actual opening');
for(const [x,z] of [[6.335,13.8],[6.335,14.6],[7.4,14.6],[8.4,14.6],[9.2,13.8]])assert.ok(hit(slab,x,z).length,'Continuous U worktop');
assert.equal(hit(slab,7.5,13.9).length,0,'Wider working aisle stays open');
const v=new THREE.Vector3();
second.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){
 v.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
 assert.ok(Number.isFinite(v.x+v.y+v.z),'All new geometry is finite');
 assert.ok(canStand(v.x,v.z,0),`Furniture stays clear of architecture at ${v.x},${v.z}`);
}});

// Each configuration must rebuild the index, retain other furnishings, and keep
// both the rooms and the fronts of the appliances reachable.
for(const id of ['1','2','3','1','3','2']){
 setKitchenCollisionVariant(id);
 assert.equal(canWalk(6.235,14.4),false,'Fridge, shifted peninsula or breakfast stool is solid');
 assert.equal(canWalk(6.99,13.8),id==='2','Former induction peninsula is clear only in Type 2');
 assert.equal(canWalk(5.95,8.48),false,'Mirrored sofa remains solid in both versions');
 for(let x=5.5;x<9.6;x+=.09)for(let z=12;z<15;z+=.09){
  assert.equal(canWalk(x,z),canStand(x,z)&&!furnitureColliders.some(c=>intersects(c,x,z,.18)),'Updated spatial index agrees with complete scan');
 }
 const step=.065,cols=165,rowsCount=245,offset=-.4;
 const key=(x,z)=>Math.round((z-offset)/step)*cols+Math.round((x-offset)/step);
 const grid=new Uint8Array(cols*rowsCount);
 for(let r=0;r<rowsCount;r++)for(let c=0;c<cols;c++)grid[r*cols+c]=canWalk(offset+c*step,offset+r*step)?1:0;
 const start=key(...safeRoomPosition(rooms[0])),seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){const k=queue[i],r=Math.floor(k/cols),c=k%cols;for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nc=c+dc,nr=r+dr,nk=nr*cols+nc;if(nc>=0&&nc<cols&&nr>=0&&nr<rowsCount&&grid[nk]&&!seen.has(nk)){seen.add(nk);queue.push(nk);}
 }}
 for(const room of rooms)assert.ok(seen.has(key(...safeRoomPosition(room))),`${room.id} reachable in Type ${id}`);
 const approaches=id==='1'?[[8.55,12.675],[8.55,13.275],[8.55,13.875],[7.8,13.93],[6.235,13.85]]:id==='2'?[[8.55,12.675],[8.55,13.275],[8.55,13.875],[8.385,13.9],[7.385,13.9],[6.335,13.2]]:[[8.55,12.675],[8.55,13.375],[8.55,14.075],[8.3,14.019],[8.4,14.25],[5.8,13.59],[5.8,14.31]];
 for(const p of approaches)assert.ok(seen.has(key(...p)),`Appliance/breakfast approach ${p} reachable in Type ${id}`);
}
assert.equal(fingerprint(groups[0]),approved,'Repeated changes never mutate Type 1');
assert.throws(()=>setKitchenCollisionVariant('unknown'),RangeError);
assert.equal(canWalk(6.99,13.8),true,'Invalid selection leaves the current collision configuration intact');
const third=getKitchenVariant('3'),thirdGroup=groups[2],thirdDining=getDiningConfiguration(third);
assert.equal(third.modules.find(m=>m.id==='integrated-fridge').w,.60);
assert.equal(third.modules.find(m=>m.id==='shallow-workbench').d,.40);
assert.equal(thirdDining.table.r*2,1.50);assert.equal(thirdDining.chairs.length,6);
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,message);
const original=getKitchenVariant('1'),sinkBase=third.modules.find(m=>m.id==='sink'),dishwasher=third.modules.find(m=>m.id==='dishwasher');
const fridge=third.modules.find(m=>m.id==='integrated-fridge'),corner=third.modules.find(m=>m.id==='right-corner');
close(third.sink.z-third.sink.d/2,original.sink.z-original.sink.d/2,'Sink keeps its fridge-side edge');
close(third.sink.z+third.sink.d/2,original.sink.z+original.sink.d/2+.20,'Bowl extends 20 cm away from the fridge');
assert.equal(third.sink.x,original.sink.x,'Sink stays on the washing wall');
assert.equal(third.sink.w,original.sink.w,'Sink depth across the counter is unchanged');
close(sinkBase.d,.80,'Wider bowl has an 80 cm base');
close(dishwasher.d,.60,'Dishwasher remains a full 60 cm module');
close(fridge.z+fridge.d/2,sinkBase.z-sinkBase.d/2,'Sink base stays against the fridge');
close(sinkBase.z+sinkBase.d/2,dishwasher.z-dishwasher.d/2,'Dishwasher shifts to meet the wider sink base');
close(dishwasher.z+dishwasher.d/2,corner.z-corner.d/2,'Reduced corner meets the dishwasher without overlap');
close(corner.z+corner.d/2,14.919,'Corner still meets the rear wall');
const cornerFront=new THREE.Box3().setFromObject(thirdGroup.getObjectByName('corner-return-panel'));
close(cornerFront.min.z,14.519,'Corner front aligns with the 40 cm return');
assert.ok(cornerFront.min.z>dishwasher.z+dishwasher.d/2,'Corner return does not cross the dishwasher front');
assert.equal(hit(thirdGroup.getObjectByName('ceramic-worktop'),third.sink.x,13.60).length,0,'Cutout includes the extended bowl');
ray.set(new THREE.Vector3(third.sink.x,1,13.60),new THREE.Vector3(0,-1,0));
const expandedBasinHit=ray.intersectObjects(thirdGroup.children)[0];
assert.ok(expandedBasinHit.point.y>.75&&expandedBasinHit.point.y<.79,'Extended bowl stays recessed without cabinet panels across it');
assert.deepEqual(third.wallCabinets,layout.wallCabinets,'Type 3 reuses both Type 2 cabinet runs');
assert.deepEqual(third.wallVolumes,layout.wallVolumes,'Both upper cabinets participate in head clearance');
const rearWall=walls.find(w=>w.a[1]===1350&&w.b[1]===1350);
const rearWindows=rearWall.open.filter(o=>o.kind==='window').map(o=>({
 min:point([rearWall.a[0]+o.s,rearWall.a[1]])[0]-.04,
 max:point([rearWall.a[0]+o.e,rearWall.a[1]])[0]+.04,
}));
for(const cabinet of third.wallCabinets){
 const cabinetBounds=new THREE.Box3().setFromObject(thirdGroup.getObjectByName(cabinet.id+'-carcass'));
 for(const window of rearWindows)assert.ok(cabinetBounds.max.x<window.min||cabinetBounds.min.x>window.max,'Type 3 uppers keep both windows clear');
 for(let row=0;row<cabinet.rows;row++)assert.ok(thirdGroup.getObjectByName(cabinet.id+'-front-'+row),'All reused cabinet fronts are rendered');
}
assert.equal(thirdGroup.children.filter(o=>o.name==='breakfast-stool').length,2);
assert.ok(thirdGroup.getObjectByName('peninsula-oven-glass'));
assert.ok(third.breakfast.x+third.breakfast.w/2<third.hob.x-third.hob.w/2,'Oak surface never covers the hob');
assert.ok(Math.abs(8.935-(third.peninsula.x+third.peninsula.w/2)-1.085)<1e-8,'Working aisle remains 108.5 cm');
for(const [x,z] of [[7.2,13.3],[7.2,14.6],[8.4,14.7],[9.2,13.8]])assert.ok(hit(thirdGroup.getObjectByName('ceramic-worktop'),x,z).length,'Third worktop is continuous');
assert.equal(hit(thirdGroup.getObjectByName('ceramic-worktop'),third.sink.x,third.sink.z).length,0);
assert.equal(hit(thirdGroup.getObjectByName('ceramic-worktop'),8.4,14.4).length,0,'40 cm return leaves the extra 20 cm clear');
for(const variant of kitchenVariants){
 const config=getDiningConfiguration(variant),set=createDiningSet(config,{stone:materials.ceramic,dark:materials.dark,fabric:materials.front});set.updateMatrixWorld(true);
 assert.equal(set.children.length,6,'Dining draw calls stay bounded with six seats');
 assert.equal(set.getObjectByName('dining-seats').count,config.chairs.length);
 const topBounds=new THREE.Box3().setFromObject(set.getObjectByName('dining-top'));
 assert.ok(Math.abs(topBounds.max.x-topBounds.min.x-2*config.table.r)<1e-6);
 for(const chair of config.chairs)assert.ok(canStand(chair.x,chair.z,.29),'Chairs stay inside the original walls');
}
thirdGroup.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){
 v.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
 assert.ok(canStand(v.x,v.z,0),`Type 3 stays clear of architecture at ${v.x},${v.z}`);
}});
setKitchenCollisionVariant('1');
console.log('PASS: original Type 1 unchanged; three kitchen/dining variants, 40 cm return, six-seat 150 cm table, two stools, appliance access, architecture and nine reachable rooms.');
