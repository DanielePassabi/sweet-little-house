import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createBerserkCollection,berserkBay as bay,berserkVolumes} from '../dist/berserk-books.js';

const root=createBerserkCollection(new THREE.Group(),new THREE.MeshStandardMaterial());
const pages=root.getObjectByName('berserk-page-blocks'),covers=root.getObjectByName('berserk-paperback-covers'),spines=root.getObjectByName('berserk-numbered-spines');
assert.deepEqual(berserkVolumes.map(v=>v.number),Array.from({length:43},(_,i)=>i+1),'Complete ordered run 1–43, with no duplicate or missing volume');
assert.equal(pages.count,43);assert.equal(covers.count,86);assert.equal(spines.geometry.attributes.position.count,430);
const uv=spines.geometry.attributes.uv,regions=new Set();
for(let index=0;index<43;index++){
 const v=berserkVolumes[index],matrix=new THREE.Matrix4();pages.getMatrixAt(index,matrix);
 const pageBounds=new THREE.Box3().setFromBufferAttribute(pages.geometry.attributes.position).applyMatrix4(matrix);
 assert.ok(Math.abs(v.height-.18)<1e-8&&Math.abs(v.depth-.13)<1e-8,'Collection books retain 13 × 18 cm dimensions');
 assert.ok(v.width>.017&&v.width<.021,'Individual paperback thickness remains plausible');
 assert.ok(Math.abs(pageBounds.min.y-v.bottom-.0015)<1e-7,'Page block sits inside the supported cover');
 assert.ok(v.bottom+v.height<bay.top,'Books fit below the cabinet top');
 assert.ok(v.x-v.width/2>bay.x-bay.width/2&&v.x+v.width/2<bay.x+bay.width/2,'Every volume fits between the dividers');
 if(index>0&&v.bottom===berserkVolumes[index-1].bottom){const previous=berserkVolumes[index-1];assert.ok(v.x-v.width/2>previous.x+previous.width/2,'Neighbouring books do not overlap');}
 regions.add(`${Math.floor(uv.getX(index*10)*16)},${Math.floor((1-uv.getY(index*10+5))*4)}`);
}
assert.equal(regions.size,43,'Every spine has a separate numbered region in the shared atlas');
for(const bottom of [bay.bottom,bay.shelfTop]){
 const row=berserkVolumes.filter(v=>v.bottom===bottom),span=row.at(-1).x+row.at(-1).width/2-row[0].x+row[0].width/2;
 assert.ok(span>bay.width*.88&&span<bay.width,'Both rows fill the compartment at realistic scale');
}
const shelfBounds=new THREE.Box3().setFromObject(root.getObjectByName('manga-middle-shelf'));
assert.ok(Math.abs(shelfBounds.max.y-bay.shelfTop)<1e-7);
assert.ok(berserkVolumes.filter(v=>v.bottom===bay.bottom).every(v=>v.bottom+v.height<shelfBounds.min.y),'Lower books clear the intermediate shelf');
let meshes=0,triangles=0;root.traverse(o=>{assert.ok(!o.isLight);if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);}});
assert.equal(meshes,4,'43 detailed books use only four draw calls including the shelf');assert.ok(triangles<2500);
console.log(`PASS: Berserk 1–43, 13 × 18 cm paperbacks in two supported rows, individual numbered atlas regions, real clearances and four draw calls; ${triangles} triangles.`);
