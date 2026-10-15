import * as THREE from './vendor/three.module.js';

const round=new THREE.CylinderGeometry(1,1,1,48);
const pedestal=new THREE.BoxGeometry(.14,.70,.68);
const seat=new THREE.SphereGeometry(1,20,12);
const shell=new THREE.CylinderGeometry(.285,.255,.40,24,1,true,Math.PI/2,Math.PI);
const leg=new THREE.CylinderGeometry(1,1,1,12);

// Independent groups let the kitchen selector swap the complete dining set.
// Chair geometry/materials are shared; six batches regardless of chair count.
export function createDiningSet({table,chairs},{stone,dark,fabric}){
 const group=new THREE.Group();group.name='dining-set';
 const dummy=new THREE.Object3D();
 function batch(name,geometry,material,transforms){
  const mesh=new THREE.InstancedMesh(geometry,material,transforms.length);mesh.name=name;
  transforms.forEach(({p,s=[1,1,1],r=[0,0,0]},i)=>{
   dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
 }
 const {x,z,r,y}=table;
 batch('dining-top',round,stone,[{p:[x,y,z],s:[r,.045,r]}]);
 batch('dining-edge',round,dark,[{p:[x,.725,z],s:[r-.025,.028,r-.025]}]);
 batch('dining-pedestal',pedestal,dark,[-.62,.62].map(a=>({p:[x,.36,z],s:[1,1,r/.60],r:[0,0,a]})));
 batch('dining-seats',seat,fabric,chairs.map(c=>({p:[c.x,.48,c.z],s:[.27,.075,.255],r:[0,c.angle,0]})));
 batch('dining-backs',shell,fabric,chairs.map(c=>({p:[c.x,.68,c.z],r:[0,c.angle,0]})));
 const legs=[];
 for(const c of chairs)for(const side of [-1,1])for(const end of [-1,1]){
  const dx=side*.19,dz=end*.17;
  legs.push({p:[c.x+Math.cos(c.angle)*dx+Math.sin(c.angle)*dz,.235,c.z-Math.sin(c.angle)*dx+Math.cos(c.angle)*dz],s:[.024,.44,.024],r:[0,c.angle,side*-.10]});
 }
 batch('dining-chair-legs',leg,dark,legs);
 return group;
}
