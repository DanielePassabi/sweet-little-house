import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createWindows,windowLayout,windowLeafPose,windowTouches} from '../dist/windows.js';
import {freezeStaticTransforms} from '../dist/render-state.js';
import {wallVolumes} from '../dist/wall-geometry.js';
import {canStand} from '../dist/model.js';

const scene=new THREE.Scene(),events=[],system=createWindows(scene,{onStateChange:s=>events.push(s)});
freezeStaticTransforms(scene);
const advance=(occupants=[])=>{for(let i=0;i<70;i++)system.update(1/60,occupants);};
assert.equal(system.state.length,6);
const ray=new THREE.Raycaster();
for(const w of system.windows){
 const d=w.layout,height=d.sill+d.height/2,p=windowLeafPose(d,0,0);
 assert.equal(w.root.getObjectByName('white-sash-stile').material.color.getHexString(),'f7f6f2');
 const pane=w.leaves[0].getObjectByName('clear-window-glass');assert.ok(pane.material.transparent&&!pane.castShadow);
 const centre=new THREE.Vector3();pane.getWorldPosition(centre);
 const inward=new THREE.Vector3(-d.uz*d.side,0,d.ux*d.side);
 ray.set(centre.clone().addScaledVector(inward,.5),inward.clone().negate());
 assert.equal(system.pick(ray)?.id,d.id,'Closed glazing is clickable');
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.25),new THREE.MeshBasicMaterial());blocker.position.copy(centre).addScaledVector(inward,.25);blocker.updateMatrixWorld();
 assert.equal(system.pick(ray,[blocker]),null,'Walls and furniture occlude clicks');
 const before=w.leaves[0].matrixWorld.clone();system.toggle(d.id);advance();
 assert.equal(w.progress,1);assert.notDeepEqual(w.leaves[0].matrixWorld.elements,before.elements);
 for(let index=0;index<2;index++){
  const pose=windowLeafPose(d,index,1);
  assert.ok(pose.dx*inward.x+pose.dz*inward.z>.999,'Both leaves open inward');
  assert.ok(windowTouches(d,1,pose.x+pose.dx*pose.width/2,pose.z+pose.dz*pose.width/2,.01),'Visitor collision follows the open leaf');
 }
 const openPane=w.leaves[0].getObjectByName('clear-window-glass');openPane.getWorldPosition(centre);
 const pose=windowLeafPose(d,0,1),normal=new THREE.Vector3(-pose.dz,0,pose.dx);
 ray.set(centre.clone().addScaledVector(normal,.2),normal.clone().negate());assert.equal(system.pick(ray)?.id,d.id,'Open leaf can be clicked to close');
 // No vertices enter the wall reveals at any point in either leaf's swing.
 const volumes=wallVolumes().filter(v=>v.kind==='wall');
 for(let progress=0;progress<=1.001;progress+=.05){
  w.leaves.forEach((leaf,index)=>{leaf.rotation.y=windowLeafPose(d,index,progress).angle;leaf.updateMatrix();});w.root.updateMatrixWorld(true);
  for(const leaf of w.leaves)leaf.traverse(mesh=>{if(!mesh.isMesh)return;const v=new THREE.Vector3(),positions=mesh.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);assert.ok(!volumes.some(box=>v.x>box.min[0]+.001&&v.x<box.max[0]-.001&&v.y>box.min[1]+.001&&v.y<box.max[1]-.001&&v.z>box.min[2]+.001&&v.z<box.max[2]-.001),`${d.id} leaf clears the masonry`);}
  });
 }
 system.setOpen(d.id,false);advance();assert.equal(w.progress,0);
 const half=windowLeafPose(d,0,.5),visitor={x:half.x+half.dx*half.width*.7,z:half.z+half.dz*half.width*.7,r:.16,top:1.9};
 system.setOpen(d.id,true);advance([visitor]);assert.ok(w.progress<1,'Opening waits before sweeping through the visitor');
 advance();assert.equal(w.progress,1);system.setOpen(d.id,false);advance([visitor]);advance([visitor]);assert.equal(w.progress,1,'Closing reverses when occupied');
 system.setOpen(d.id,false);advance([{...visitor,top:.14}]);assert.equal(w.progress,0,'A floor robot does not obstruct an elevated window');
 assert.equal(canStand(d.x+d.ux*d.width/2,d.z+d.uz*d.width/2),false,'Opening windows never removes the exterior wall below the sill');
}
assert.equal(system.update(.1),false);assert.equal(system.update(NaN),false);assert.equal(system.update(-1),false);
assert.throws(()=>system.toggle('missing'),RangeError);assert.ok(events.some(s=>s.obstructed));
assert.deepEqual(windowLayout.map(w=>w.roomId),['room2','bedroom','living','living','bath1','room3']);
console.log('PASS: six white double-leaf windows, inward swing, clear reveals, picking/occlusion, collision safety, low robot clearance and frozen/idle rendering.');
