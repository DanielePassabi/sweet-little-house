import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createInteriorLighting,createCeiling,ceilingLayout} from '../dist/interior-lighting.js';
import {rooms,HEIGHT,insidePolygon} from '../dist/model.js';
import {wallVolumes,unionSurface} from '../dist/wall-geometry.js';
import {optimizeLightingMaterials,efficientLightingChunk} from '../dist/lighting-performance.js';

const scene=new THREE.Scene(),system=createInteriorLighting(scene),roof=createCeiling();
assert.equal(system.lights.length,10);
assert.ok(system.lights.reduce((sum,l)=>sum+l.shadow.mapSize.x*l.shadow.mapSize.y,0)<=10*1024*1024,'Indoor shadow maps stay within the texel budget');
assert.equal(system.group.children.filter(o=>o.isInstancedMesh).length,2,'Only two fixture draw calls');
assert.ok(system.lights.every(l=>!l.shadow.autoUpdate&&l.shadow.needsUpdate),'Indoor shadows are rendered once');
for(const light of system.lights)light.shadow.needsUpdate=false;
system.setState(false,4000);system.setState(true,3000);
assert.ok(system.lights.every(l=>!l.shadow.needsUpdate),'Power and kelvin changes reuse cached geometry shadows');
system.invalidateShadows();assert.ok(system.lights.every(l=>l.shadow.needsUpdate),'Furniture/context changes refresh all indoor shadows');
for(const layout of ceilingLayout){
 const room=rooms.find(r=>r.id===layout.room);
 for(const dx of [-layout.size/2,layout.size/2])for(const dz of [-layout.size/2,layout.size/2])
  assert.ok(insidePolygon(layout.x+dx,layout.z+dz,room.polygon),`${layout.id} stays inside its room`);
}
scene.updateMatrixWorld(true);
for(const light of system.lights){
 assert.ok(light.position.y<HEIGHT&&light.position.y>HEIGHT-.10);
 assert.equal(light.target.position.x,light.position.x);assert.equal(light.target.position.z,light.position.z);
 assert.equal(light.target.position.y,0);assert.ok(light.angle<Math.PI/2,'No upward wall illumination');
 assert.ok(light.castShadow,'Walls must occlude every ceiling light');
 assert.equal(light.shadow.mapSize.x,1024,'Eye-level shadow detail within bounded budget');
 assert.ok(light.shadow.camera.near<light.position.y);
}
for(const temp of [3000,4000]){
 system.setState(true,temp);assert.equal(system.state.kelvin,temp);
 assert.ok(system.lights.every(l=>l.intensity>0));assert.ok(system.diffuserMaterial.emissiveIntensity>0);
 const colour=system.lights[0].color.clone();
 system.setState(false,temp);assert.ok(system.lights.every(l=>l.intensity===0));assert.equal(system.diffuserMaterial.emissiveIntensity,0);
 system.setState(true,temp);assert.ok(system.lights[0].color.equals(colour),'Switch preserves chosen temperature');
}
system.setState(true,3000);const warm=system.lights[0].color.clone();
system.setState(true,4000);assert.ok(system.lights[0].color.b>warm.b,'White is cooler than warm');
system.setState(true,123);assert.equal(system.state.kelvin,3000,'Safe temperature fallback');

roof.geometry.computeBoundingBox();
assert.ok(Math.abs(roof.geometry.boundingBox.min.y-HEIGHT)<1e-6,'Interior height remains exactly 2.60 m');
assert.ok(roof.castShadow&&roof.receiveShadow);
roof.updateMatrixWorld();
const ray=new THREE.Raycaster(new THREE.Vector3(5.6,1.75,10),new THREE.Vector3(0,1,0));
const underside=ray.intersectObject(roof)[0];assert.ok(underside,'Closed ceiling visible from below');
assert.ok(Math.abs(underside.point.y-HEIGHT)<1e-6);assert.ok(underside.face.normal.y<-.99,'Underside normal faces into the room');

// Rays from a source to a neighbouring room must encounter a real partition.
const surface=unionSurface(wallVolumes()),geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.faces.flat(),3));
const partitions=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));partitions.updateMatrixWorld();
for(const [source,destination] of [['room3','bath1'],['bath1','room2'],['bath2','bedroom'],['living-lounge','hall-south']]){
 const from=system.lights.find(l=>l.name===source).position;
 const to=system.lights.find(l=>l.name===destination).position.clone();to.y=1;
 const direction=to.clone().sub(from);ray.set(from,direction.clone().normalize());ray.far=direction.length();
 assert.ok(ray.intersectObject(partitions).length>0,`${source} cannot shine through the partition into ${destination}`);
}
// Exercise the extension against the actual bundled Three.js chunks, preserving
// existing material hooks and the directional sun's original filtering.
const material=new THREE.MeshStandardMaterial();let originalHookCalled=false;
material.onBeforeCompile=shader=>{originalHookCalled=true;shader.uniforms.custom={value:1};};
const testScene=new THREE.Scene();testScene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
testScene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
assert.equal(optimizeLightingMaterials(testScene),1,'Shared material is patched once');
const key=material.customProgramCacheKey();assert.equal(optimizeLightingMaterials(testScene),0);assert.equal(material.customProgramCacheKey(),key);
const shader={uniforms:{},fragmentShader:'#include <shadowmap_pars_fragment>\n#include <lights_fragment_begin>'};
material.onBeforeCompile(shader,null);assert.ok(originalHookCalled);assert.equal(shader.uniforms.custom.value,1);
assert.equal((shader.fragmentShader.match(/texture2DCompare\(map,/g)||[]).length,9,'Smooth indoor filter stays below the standard 16 depth reads');
assert.ok(shader.fragmentShader.includes('getIndoorShadow( spotShadowMap'));
assert.ok(shader.fragmentShader.includes('if(directLight.visible && litFace)'));
// Match the renderer's unrolling, which removes each loop's enclosing scope.
const expanded=efficientLightingChunk().replaceAll('NUM_SPOT_LIGHTS','12').replace(
 /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,
 (_,start,end,body)=>Array.from({length:Number(end)-Number(start)},()=>body).join('\n'));
assert.equal((expanded.match(/bool litFace/g)||[]).length,1,'Unrolled lights share one declaration');
assert.equal((expanded.match(/if\(directLight.visible && litFace\)/g)||[]).length,12,'Every light retains its guard');
const originalChunk=THREE.ShaderChunk.lights_fragment_begin,dirStart='#if ( NUM_DIR_LIGHTS > 0 )';
assert.equal(efficientLightingChunk().split(dirStart)[1],originalChunk.split(dirStart)[1],'Sun/indirect lighting remains identical');
console.log('PASS: room-contained square fixtures, cached shadows and invalidation, shared shader extension, unchanged sun filter, switching/kelvin and closed ceiling at 2.60 m.');
