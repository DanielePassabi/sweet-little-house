import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.js';
import {createKitchen} from '../dist/kitchen.js';
import {kitchenVariants,getKitchenVariant,getDiningConfiguration} from '../dist/kitchen-variants.js';
import {createDiningSet} from '../dist/dining.js';
import {createInteriorLighting} from '../dist/interior-lighting.js';
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
for(const id of ['1','2','3','4','1','4','3','2']){
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
 const approaches={
  '1':[[8.55,12.675],[8.55,13.275],[8.55,13.875],[7.8,13.93],[6.235,13.85]],
  '2':[[8.55,12.675],[8.55,13.275],[8.55,13.875],[8.385,13.9],[7.385,13.9],[6.335,13.2]],
  '3':[[8.55,12.675],[8.55,13.375],[8.55,14.075],[8.3,14.019],[8.4,14.25],[5.8,13.59],[5.8,14.31]],
  '4':[[8.55,12.675],[8.55,13.33],[8.55,14.03],[8.0,13.73],[6.10,14.01],[6.18,12.69]],
 }[id];
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
const fourth=getKitchenVariant('4'),finalGroup=groups[3];
assert.equal(getDiningConfiguration(fourth),thirdDining,'Final kitchen retains the previous dining set');
assert.equal(finalGroup.children.filter(o=>o.name==='breakfast-stool').length,3);
const finalBounds=name=>new THREE.Box3().setFromObject(finalGroup.getObjectByName(name));
const bar=finalBounds('oak-breakfast-bar'),cooktop=finalBounds('induction-hob'),tower=finalBounds('oven-door-glass');
const oakBar=finalGroup.getObjectByName('oak-breakfast-bar');
assert.ok(hit(oakBar,6.95,fourth.hob.z).length,'Oak overhang sits on the peninsula');
for(const z of [cooktop.min.z,fourth.hob.z,cooktop.max.z])assert.equal(hit(oakBar,cooktop.min.x,z).length,0,'Oak clears the hob from front to back');
const niche=fourth.wallCabinets.find(c=>c.id==='oak-shelving');
for(const x of [niche.x+.02,7.009,7.011,niche.x+niche.w/2-.002]){
 for(const z of [niche.z-niche.d/2+.002,niche.z+niche.d/2-.002]){
  const top=hit(oakBar,x,z)[0];assert.ok(top,'Oak supports the back, upright and complete niche floor');
  close(top.point.y,niche.bottom,'Niche meets the oak bar flush');
 }
}
for(const row of ['upper','lower']){
 const name='peninsula-'+row+'-drawer';
 assert.equal(finalGroup.children.filter(o=>o.name===name).length,1);
 close(finalBounds(name).getSize(new THREE.Vector3()).z,fourth.peninsula.d*2/3-.006,'One wide drawer spans the two marked modules');
 assert.ok(finalGroup.getObjectByName('peninsula-return-'+row+'-drawer'));
}
assert.ok(tower.min.y>.85&&tower.max.y<1.5&&tower.max.x<bar.min.x,'Raised oven opens clear of the bar');
assert.ok(finalBounds('pendant-shade').intersectsBox(new THREE.Box3(
 new THREE.Vector3(cooktop.min.x,1.65,cooktop.min.z),new THREE.Vector3(cooktop.max.x,2.15,cooktop.max.z))));
assert.equal(finalGroup.children.filter(o=>o.name==='oak-niche-back').length,2);
assert.equal(finalGroup.children.filter(o=>o.name==='oak-display-shelf').length,4);
for(const upper of fourth.wallVolumes)for(const window of rearWindows){
 assert.ok(upper.max[0]<window.min||upper.min[0]>window.max,'Upper cabinets clear the window frames');
}
const finalSlab=finalGroup.getObjectByName('ceramic-worktop');
assert.equal(hit(finalSlab,fourth.sink.x,fourth.sink.z).length,0);
for(const [x,z] of [[7.32,13.73],[8.2,14.7],[9.2,14.15]])assert.ok(hit(finalSlab,x,z).length,'The U has a continuous stone top');
for(const [i,group] of [thirdGroup,finalGroup].entries())group.traverse(mesh=>{
 if(!mesh.isMesh)return;
 for(let j=0;j<mesh.geometry.attributes.position.count;j++){
  v.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(mesh.matrixWorld);
  assert.ok(canStand(v.x,v.z,0),`Type ${i+3} stays clear of architecture at ${v.x},${v.z}`);
 }
});
setKitchenCollisionVariant('4');
const appliances=finalGroup.userData.appliances;
const stepAppliances=(occupants=[])=>{for(let i=0;i<16;i++)appliances.update(.08,occupants);};
for(const mesh of finalGroup.children)mesh.traverse(p=>{p.updateMatrix();p.matrixAutoUpdate=false;});
for(const [id,part,inside,approach,obstacle] of [
 ['fridge','integrated-fridge-door','fridge-liner-back',[8.04,1.47,12.72],[8.54,12.45]],
 ['dishwasher','dishwasher-front','dishwasher-liner-back',[7.96,.55,14.03],[8.49,14.03]],
 ['oven','oven-door-glass','oven-cavity-back',[6.26,1.13,13.35],[6.26,14.08]],
]){
 const door=finalGroup.getObjectByName(part),target=door.getWorldPosition(new THREE.Vector3());
 const origin=new THREE.Vector3(...approach);
 ray.set(origin,target.clone().sub(origin).normalize());
 const meshes=[];finalGroup.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.equal(appliances.pick(ray,meshes)?.id,id,'Closed front is clickable');
 const before=door.matrixWorld.clone();
 appliances.toggle(id);stepAppliances([{x:obstacle[0],z:obstacle[1],r:.18,top:1.8}]);
 assert.ok(appliances.state.find(d=>d.id===id).obstructed,'Opening pauses before an occupant');
 stepAppliances();
 assert.ok(appliances.state.find(d=>d.id===id).open);
 assert.ok(!door.matrixWorld.equals(before)&&door.userData.dynamicFurniture);
 assert.ok(appliances.blocksPoint(...obstacle,.18),'Open door participates in walking collisions');
 const back=finalGroup.getObjectByName(inside);
 ray.set(origin,back.getWorldPosition(new THREE.Vector3()).sub(origin).normalize());
 const nearest=ray.intersectObjects(meshes)[0];
 assert.ok(nearest.object!==door&&nearest.object.userData.appliance!==id,'The interior is exposed');
 appliances.toggle(id);stepAppliances();
 assert.ok(door.matrixWorld.equals(before),'Door returns to its exact closed pose after static transforms are frozen');
}
for(const {x,z} of [...fourth.modules,...fourth.stools,fourth.breakfast])assert.equal(canWalk(x,z,.05),false);
const lighting=createInteriorLighting(new THREE.Scene()),pendant=finalGroup.userData.pendant;
const source=lighting.lights.find(light=>light.name==='living-kitchen'),ceilingPosition=source.position.clone();
const frames=lighting.group.getObjectByName('square-ceiling-frames');
lighting.setKitchenPendant(pendant);
assert.equal(frames.count,lighting.lights.length-1);
close(source.position.y,fourth.pendant.bottom-.012,'Kitchen light shines from the pendant');
lighting.setFixturesVisible(false);assert.equal(pendant.visible,false);assert.ok(source.intensity>0);
lighting.setState(false,4000);assert.equal(source.intensity,0);
lighting.setKitchenPendant(null);assert.ok(source.position.equals(ceilingPosition));
assert.equal(frames.count,lighting.lights.length);assert.equal(source.intensity,0);
setKitchenCollisionVariant('1');
console.log('PASS: four kitchen variants, approved original, Bergamin oven tower, three-seat oak bar, pendant lighting, clear windows and reachable rooms and appliances.');
