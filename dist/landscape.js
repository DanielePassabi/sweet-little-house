import * as THREE from './vendor/three.module.js';

// Deterministic scenery. No architectural coordinates or collision data live here.
export function createLandscape(scene, groundY, footprint, insidePolygon, compact=false){
 let seed=1937;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 const landscape=new THREE.Group(),mountains=new THREE.Group(),clouds=new THREE.Group();
 scene.add(landscape,mountains,clouds);
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
 function batch(parent,geometry,mat,items,shadow=false){
  const mesh=new THREE.InstancedMesh(geometry,mat,items.length);
  items.forEach((item,i)=>{
   const {p,s,r=0,tint}=item;dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(0,r,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(tint)mesh.setColorAt(i,color.set(tint));
  });
  mesh.castShadow=shadow;mesh.receiveShadow=shadow;mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();parent.add(mesh);return mesh;
 }
 const treeData=[[-5,-3,.9],[-7,4,1.08],[-6,12,.95],[-5,20,1.14],[2,21,.82],[16,18,.88],[17,10,1.12],[16,2,.9],[12,-5,1.06],[4,-6,.78]];
 const trunks=[],leaves=[],conifers=[];
 treeData.forEach(([x,z,size],i)=>{
  const type=i%3;
  trunks.push({p:[x,groundY+.85*size,z],s:[size,1.7*size,size]});
  if(type===2){
   for(let j=0;j<3;j++)conifers.push({p:[x,groundY+(1.5+j*.65)*size,z],s:[(1.1-j*.24)*size,1.65*size,(1.1-j*.24)*size],r:i,tint:['#547652','#456c4c','#66835a'][j]});
  }else{
   const clusters=type===0?7:5;
   for(let j=0;j<clusters;j++){
    const angle=j*2.4,spread=j===0?0:(type===0?.65:.28)*size;
    leaves.push({p:[x+Math.cos(angle)*spread,groundY+(type===0?2.15:2.55)*size+(random()-.3)*.6*size,z+Math.sin(angle)*spread],s:[(type===0?.85:.59)*size,(type===0?.85:1.28)*size,.73*size],r:angle,tint:['#658b50','#769657','#567c48','#829d60'][j%4]});
   }
  }
 });
 batch(landscape,new THREE.CylinderGeometry(.10,.17,1,7),material('#75604b'),trunks,true);
 batch(landscape,new THREE.IcosahedronGeometry(1,2),material('#ffffff'),leaves,true);
 batch(landscape,new THREE.ConeGeometry(1,1,9),material('#ffffff'),conifers,true);

 // Three curved blades per tuft, opaque and double-sided: no alpha sorting/overdraw.
 const bladePositions=[],bladeColors=[];
 for(let j=0;j<3;j++){
  const a=j*Math.PI/3,dx=Math.cos(a)*.022,dz=Math.sin(a)*.022;
  bladePositions.push(-dx,0,-dz, dx,0,dz, dx*.9,.075,dz*.9, -dx,0,-dz, dx*.9,.075,dz*.9, dx*1.7,.13,dz*1.7);
  for(const brightness of [.85,.85,.94,.85,.94,1])bladeColors.push(brightness,brightness,brightness);
 }
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute(bladePositions,3));blade.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));blade.computeVertexNormals();
 const tufts=[];
 for(let i=0;i<(compact?4500:9000);i++){
  const x=-14+random()*43,z=-13+random()*43;
  // Keep the complete surveyed footprint and a narrow maintenance strip clear.
  if([[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]].some(([dx,dz])=>insidePolygon(x+dx,z+dz,footprint)))continue;
  const size=.65+random()*.7;
  tufts.push({p:[x,groundY+.002,z],s:[size,size*.65,size],r:random()*Math.PI*2,tint:['#7b9050','#718749','#8d9d5b'][i%3]});
 }
 const grass=batch(landscape,blade,material('#ffffff',{side:THREE.DoubleSide,vertexColors:true}),tufts);

 // A single watertight surface per ridge; snow is vertex colour, never an overlay.
 const ridgePositions=[],ridgeColors=[];
 const rings=5,sectors=12;
 const vertex=(ring,j)=>{
  const t=ring/rings,a=j/sectors*Math.PI*2;
  const radial=(1-t)*(1+.17*Math.sin(j*2.7)+.09*Math.cos(j*4.1))*(1+.14*Math.sin(ring*2+j*1.8));
  const elevation=t+(ring>0&&ring<rings?.08*Math.sin(j*2.1+ring)*Math.sin(t*Math.PI):0);
  return [Math.cos(a)*radial+.16*t,elevation,Math.sin(a)*radial-.12*t];
 };
 const addTriangle=(a,b,c)=>{
  for(const p of [a,b,c]){ridgePositions.push(...p);const snow=p[1]>.76+.035*Math.sin(p[0]*21+p[2]*14);const shade=snow?'#e6ece9':p[1]>.4?'#8b9891':'#6f8278';color.set(shade);ridgeColors.push(color.r,color.g,color.b);}
 };
 for(let r=0;r<rings;r++)for(let j=0;j<sectors;j++){
  const a=vertex(r,j),b=vertex(r,(j+1)%sectors),c=vertex(r+1,j),d=vertex(r+1,(j+1)%sectors);
  addTriangle(a,c,b);if(r<rings-1)addTriangle(b,c,d);
 }
 const ridge=new THREE.BufferGeometry();ridge.setAttribute('position',new THREE.Float32BufferAttribute(ridgePositions,3));ridge.setAttribute('color',new THREE.Float32BufferAttribute(ridgeColors,3));ridge.computeVertexNormals();
 const peaks=[];
 for(let i=0;i<30;i++){
  const angle=i/30*Math.PI*2,distance=62+random()*12;
  peaks.push({p:[4.5+Math.cos(angle)*distance,groundY,7.5+Math.sin(angle)*distance],s:[9+random()*8,7+random()*13,7+random()*7],r:random()*Math.PI*2});
 }
 batch(mountains,ridge,material('#ffffff',{vertexColors:true,flatShading:true}),peaks);

 // Opaque lit lobes correctly occlude each other even within one instanced draw.
 const cloudData=[[-8,9,-9,1.2],[-22,12,-15,1.1],[30,13,-10,1.25],[-24,14,24,1.05],[32,16,38,1.3]];
 const puffs=[];
 for(const [x,y,z,size] of cloudData)for(let j=0;j<9;j++){
  const angle=j*2.4,spread=j===0?0:1.15;
  puffs.push({p:[x+Math.cos(angle)*spread*size,y+(j%3)*.32*size,z+Math.sin(angle)*spread*.62*size],s:[(.8+random()*.5)*size,(.55+random()*.5)*size,(.7+random()*.4)*size]});
 }
 batch(clouds,new THREE.SphereGeometry(1,14,10),material('#fffdf7'),puffs);
 return {landscape,mountains,clouds,grass,treeCount:treeData.length,mountainCount:peaks.length,cloudCount:cloudData.length,grassCount:tufts.length};
}
