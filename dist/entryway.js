import * as THREE from './vendor/three.module.js';
import {shoeCabinet as layout,entryRug} from './entryway-layout.js?v=20261028-2';

export function createEntryway(parent,box){
 const root=new THREE.Group();root.name='entryway-furniture';parent.add(root);
 const cabinet=new THREE.Group();cabinet.name='wall-hung-shoe-cabinet';cabinet.position.set(layout.x,0,layout.z);root.add(cabinet);
 const oak=new THREE.MeshStandardMaterial({color:'#c7a77c',roughness:.8});
 const inside=new THREE.MeshStandardMaterial({color:'#a58a66',roughness:.9});
 const charcoal=new THREE.MeshStandardMaterial({color:'#3c3a35',roughness:.82});
 const cream=new THREE.MeshStandardMaterial({color:'#ded9cd',roughness:1});
 const rubber=new THREE.MeshStandardMaterial({color:'#b2a997',roughness:1});
 const ceramic=new THREE.MeshStandardMaterial({color:'#d8cebc',roughness:.75});
 root.userData.woodMaterials=[oak,inside];
 const block=(parent,name,w,h,d,m,x,y,z)=>{const p=box(w,h,d,m,x,y,z,parent);p.name=name;return p;};
 const part=(parent,name,g,m,x,y,z)=>{const p=new THREE.Mesh(g,m);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;parent.add(p);return p;};
 const w=layout.width,d=layout.depth,h=layout.top-layout.bottom;
 for(const x of [-(w-.022)/2,(w-.022)/2])block(cabinet,'shoe-cabinet-side',.022,h,d,oak,x,(layout.top+layout.bottom)/2,0);
 for(const y of [layout.bottom+.011,layout.top-.011])block(cabinet,'shoe-cabinet-horizontal',w-.044,.022,d,oak,0,y,0);
 block(cabinet,'shoe-cabinet-back',w-.044,h-.044,.012,inside,0,(layout.top+layout.bottom)/2,-d/2+.006);
 block(cabinet,'drawer-support-shelf',w-.044,.018,d-.012,oak,0,.944,.006);
 // A shallow, partly pulled-out top drawer with individual organiser cells.
 const drawer=new THREE.Group();drawer.name='ajar-key-drawer';drawer.position.set(0,.978,.095);cabinet.add(drawer);
 block(drawer,'drawer-bottom',w-.065,.012,.224,inside,0,0,0);
 block(drawer,'drawer-front',w-.052,.157,.022,oak,0,.066,.123);
 block(drawer,'drawer-back',w-.075,.12,.012,inside,0,.054,-.106);
 for(const x of [-(w-.075)/2,(w-.075)/2])block(drawer,'drawer-side',.012,.12,.224,oak,x,.054,0);
 for(const x of [-.30,-.10,.10,.30])block(drawer,'organiser-divider',.008,.05,.20,inside,x,.031,0);
 const silver=new THREE.MeshStandardMaterial({color:'#a8aaa7',metalness:.75,roughness:.3});
 const keyRing=part(drawer,'key-ring',new THREE.TorusGeometry(.020,.002,6,16),silver,.20,.011,.043);keyRing.rotation.x=-Math.PI/2;
 block(drawer,'house-key',.008,.004,.045,silver,.21,.011,.072);
 for(const x of [-.235,-.17]){const lens=part(drawer,'sunglasses-lens',new THREE.SphereGeometry(1,12,6),charcoal,x,.015,.03);lens.scale.set(.029,.006,.022);}
 block(drawer,'sunglasses-bridge',.016,.006,.004,charcoal,-.2025,.016,.03);
 // The flap and its two shoe racks tilt together around the lower pivot.
 const flap=new THREE.Group();flap.name='tilted-shoe-compartment';flap.position.set(0,.231,.115);flap.rotation.x=layout.tilt;cabinet.add(flap);
 block(flap,'shoe-flap-front',w-.052,.70,.022,oak,0,.35,.009);
 for(const y of [.09,.42]){
  block(flap,'shoe-rack',w-.13,.016,.20,charcoal,0,y,-.107);
  block(flap,'shoe-rack-lip',w-.13,.035,.012,charcoal,0,y+.02,-.007);
 }
 for(const x of [-(w-.105)/2,(w-.105)/2])block(flap,'tilt-support',.012,.62,.13,charcoal,x,.32,-.07);
 const pin=new THREE.CylinderGeometry(.012,.012,.022,12);
 for(const x of [-(w-.045)/2,(w-.045)/2]){const p=part(cabinet,'flap-pivot',pin,silver,x,.231,.115);p.rotation.z=Math.PI/2;}
 // Reuse geometry and materials for the shoe uppers, soles and dark collars.
 const pooled=new Map(),dummy=new THREE.Object3D(),sphere=new THREE.SphereGeometry(1,14,8),upper=new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),lace=new THREE.CylinderGeometry(.0016,.0016,1,6);
 function instance(name,g,m,x,y,z,sx,sy,sz,rz=0){
  const key=name+m.uuid;if(!pooled.has(key))pooled.set(key,{name,g,m,matrices:[]});
  dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,rz);dummy.updateMatrix();pooled.get(key).matrices.push(dummy.matrix.clone());
 }
 for(const [row,y] of [.098,.428].entries())for(const [i,x] of [-.36,-.265,-.05,.045,.265,.36].entries()){
  const m=row===0&&i>3?charcoal:cream;
  instance('shoe-soles',sphere,rubber,x,y+.010,-.103,.040,.010,.104);
  instance('shoe-uppers',upper,m,x,y+.016,-.103,.038,.060,.100);
  instance('shoe-collars',sphere,charcoal,x,y+.063,-.152,.022,.004,.030);
  for(let j=0;j<4;j++)instance('shoe-laces',lace,rubber,x,y+.069-j*.004,-.12+j*.014,1,.040,1,Math.PI/2);
 }
 for(const {name,g,m,matrices} of pooled.values()){
  const mesh=new THREE.InstancedMesh(g,m,matrices.length);mesh.name=name;matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();flap.add(mesh);
 }
 // Small tabletop details from the photo; no extra plants or light sources.
 const bowl=new THREE.LatheGeometry([[0,0],[.038,0],[.060,.020],[.064,.030],[.059,.030],[.053,.020],[.030,.009],[0,.009]].map(p=>new THREE.Vector2(...p)),24);
 part(cabinet,'entry-catchall-bowl',bowl,ceramic,.22,layout.top,.025);
 part(cabinet,'reed-diffuser',new THREE.CylinderGeometry(.026,.032,.095,20),ceramic,-.22,layout.top+.0475,0);
 for(let i=0;i<5;i++){const reed=part(cabinet,'diffuser-reed',new THREE.CylinderGeometry(.0015,.0015,.16,5),inside,-.22+(i-2)*.005,layout.top+.16,0);reed.rotation.z=(i-2)*.09;}
 // A seeded braided jute map avoids thousands of tiny floor meshes.
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/16,v=y/16,twist=Math.sin((u+.17*Math.sin(v*Math.PI))*Math.PI*2),strand=Math.sin((v+.15*Math.cos(u*Math.PI))*Math.PI*2);
  const grain=((Math.imul(x+1,374761393)^Math.imul(y+1,668265263))>>>0)%17-8;
  const value=16*twist*strand+6*Math.sin((u+v)*Math.PI*8)+grain;
  const i=(y*size+x)*4;data[i]=190+value;data[i+1]=157+value;data[i+2]=112+value;data[i+3]=255;
 }
 const weave=new THREE.DataTexture(data,size,size);weave.colorSpace=THREE.SRGBColorSpace;weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(9,4.5);weave.generateMipmaps=true;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.magFilter=THREE.LinearFilter;weave.needsUpdate=true;
 const jute=new THREE.MeshStandardMaterial({map:weave,bumpMap:weave,bumpScale:.0018,roughness:1});
 const border=new THREE.MeshStandardMaterial({color:'#63513d',roughness:1,bumpMap:weave,bumpScale:.0008});
 const rug=new THREE.Group();rug.name='entry-jute-rug';rug.position.set(entryRug.x,0,entryRug.z);root.add(rug);
 block(rug,'jute-rug-backing',entryRug.width,.012,entryRug.depth,border,0,.012,0);
 block(rug,'woven-jute-centre',entryRug.width-.054,.004,entryRug.depth-.054,jute,0,.020,0);
 for(const x of [-(entryRug.width-.027)/2,(entryRug.width-.027)/2])block(rug,'bound-rug-edge',.027,.005,entryRug.depth,border,x,.0205,0);
 for(const z of [-(entryRug.depth-.027)/2,(entryRug.depth-.027)/2])block(rug,'bound-rug-edge',entryRug.width-.054,.005,.027,border,0,.0205,z);
 root.updateMatrixWorld(true);return root;
}
