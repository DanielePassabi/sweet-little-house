import assert from 'node:assert/strict';
import {PerspectiveCamera,OrthographicCamera,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from '../dist/vendor/three.module.js';
import {createRenderState,createWalkResolution,freezeStaticTransforms,indexStaticSurface} from '../dist/render-state.js';
const state=createRenderState(),camera=new PerspectiveCamera();
assert.equal(state.consume(camera),true);
for(let i=0;i<120;i++)assert.equal(state.consume(camera),false,'Stationary frames do not render');
camera.position.x=1e-14;assert.equal(state.consume(camera),false,'Ignore sub-pixel floating-point damping noise');
camera.position.x=2;assert.equal(state.consume(camera),true);
camera.rotation.y=.3;assert.equal(state.consume(camera),true);
camera.fov=60;camera.updateProjectionMatrix();assert.equal(state.consume(camera),true);
assert.equal(state.consume(camera),false);
state.invalidate();assert.equal(state.consume(camera),true,'UI changes redraw a stationary view');
const plan=new OrthographicCamera();assert.equal(state.consume(plan),true);
plan.zoom=2;plan.updateProjectionMatrix();assert.equal(state.consume(plan),true);
const root=new Group(),nested=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshBasicMaterial());
root.position.set(2,3,4);nested.rotation.y=.6;mesh.position.set(1,2,3);mesh.scale.set(2,3,4);root.add(nested);nested.add(mesh);
root.updateMatrixWorld(true);const before=mesh.matrixWorld.clone();
assert.equal(freezeStaticTransforms(root),3);
for(let i=0;i<120;i++)root.updateMatrixWorld();
assert.ok(before.equals(mesh.matrixWorld),'Freezing preserves world transforms');
mesh.visible=false;root.updateMatrixWorld();mesh.visible=true;root.updateMatrixWorld();assert.ok(before.equals(mesh.matrixWorld));
const dynamic=new Mesh(new BoxGeometry(),new MeshBasicMaterial());root.add(dynamic);dynamic.position.x=7;root.updateMatrixWorld();assert.equal(dynamic.getWorldPosition(new Vector3()).x,9,'New ruler objects remain dynamic');
console.log('PASS: idle frames skipped, camera/zoom/FOV/view/UI invalidation, unchanged static transforms and dynamic children.');

const original=new BoxGeometry().toNonIndexed(),positions=original.attributes.position.array.slice(),normals=original.attributes.normal.array.slice();
original.deleteAttribute('uv');const stats=indexStaticSurface(original);
assert.ok(stats.after<stats.before);
for(let i=0;i<original.index.count;i++)for(let j=0;j<3;j++){
 const index=original.index.getX(i)*3+j;
 assert.equal(original.attributes.position.array[index],positions[i*3+j]);
 assert.equal(original.attributes.normal.array[index],normals[i*3+j]);
}
console.log('PASS: indexed surfaces expand to identical positions and normals.');

const resolution=createWalkResolution();
let now=0,scale=1;
const step=(ms,moving)=>resolution.update(now+=ms,moving);
for(let i=0;i<100;i++)assert.equal(step(16.7,true),1,'Smooth turns keep full detail');
for(let i=0;i<100;i++)scale=step(32,true);
assert.ok(scale>=.65&&scale<1);
assert.equal(step(16,false),scale);
assert.equal(step(350,false),1,'A stationary view gets its full resolution back');
assert.equal(step(5000,true),scale,'Idle time does not penalize the next turn');
resolution.reset();
for(let i=0;i<120;i++){assert.equal(step(8,true),1);assert.equal(step(8,false),1);}
for(let i=0;i<100;i++){step(8,true);scale=step(27,false);}
assert.ok(scale<1,'Missed frames are measured even when mouse events arrive less often than refreshes');
