import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createLandscape } from '../dist/landscape.js';
import { footprint, insidePolygon } from '../dist/model.js';

function inspect(compact){
 const scene=new THREE.Scene();
 const result=createLandscape(scene,-.2,footprint,insidePolygon,compact);
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 for(let i=0;i<result.grass.count;i++){
  result.grass.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
  assert.equal(insidePolygon(position.x,position.z,footprint),false,'Grass must stay outside the surveyed house');
 }
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  assert.equal(mesh.material.transparent,false,'Scenery instances must not depend on transparency sorting');
  assert.ok(Number.isFinite(mesh.boundingSphere.radius));
  for(const value of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
 });
 return result;
}
const desktop=inspect(false),mobile=inspect(true);
assert.ok(mobile.grass.count<desktop.grass.count,'Touch profile must reduce grass work');
assert.equal(desktop.mountains.children.length,1,'Snow and rock share a single surface batch');
assert.deepEqual(Array.from(inspect(false).grass.instanceMatrix.array),Array.from(desktop.grass.instanceMatrix.array),'Scenery must be reproducible');
console.log(`PASS: scenery bounds, opaque batches, footprint exclusion, deterministic grass and touch budget (${desktop.grass.count}/${mobile.grass.count} tufts).`);
