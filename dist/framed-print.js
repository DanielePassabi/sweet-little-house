import * as THREE from './vendor/three.module.js';

export function createFramedPrint(doorFinish,texture,printWidth,printHeight,printName){
 const picture=new THREE.Group();
 const border=.050; // 28 mm of carved wood plus a 22 mm bevelled mat.
 const width=printWidth+2*border,height=printHeight+2*border;
 // Sweep the cross-section around four mitred rails. Each pair is the inset
 // from the outside edge and the depth towards the viewer, in metres.
 function rim(profile){
  const rings=profile.map(([inset,depth])=>{
   const x=width/2-inset,y=height/2-inset;
   return [[-x,-y,depth],[x,-y,depth],[x,y,depth],[-x,y,depth]];
  });
  const vertices=[];
  for(let i=1;i<rings.length;i++){
   const outer=rings[i-1],inner=rings[i];
   for(let side=0;side<4;side++){
    const next=(side+1)%4;
    vertices.push(...outer[side],...outer[next],...inner[next],...outer[side],...inner[next],...inner[side]);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  return geometry;
 }
 // A rounded outer bead, a shallow cove and a fine carved inner fillet.
 const frame=new THREE.Mesh(rim([[0,0],[0,.014],[.001,.018],[.003,.020],[.005,.020],
  [.007,.018],[.008,.015],[.009,.014],[.011,.0155],[.013,.0155],[.015,.013],
  [.018,.011],[.021,.0105],[.0225,.012],[.024,.014],[.026,.014],[.028,.011],[.028,.0055]]),doorFinish);
 frame.name='white-carved-frame';frame.castShadow=frame.receiveShadow=true;picture.add(frame);
 const mat=new THREE.Mesh(rim([[.027,.007],[border-.001,.007],[border,.006]]),
  new THREE.MeshStandardMaterial({color:'#f7f4eb',roughness:1}));
 mat.name='bevelled-photo-mat';mat.receiveShadow=true;picture.add(mat);
 const print=new THREE.Mesh(new THREE.PlaneGeometry(printWidth,printHeight),
  new THREE.MeshStandardMaterial({map:texture,roughness:.89}));
 print.name=printName;print.position.z=.006;print.receiveShadow=true;picture.add(print);
 return picture;
}
