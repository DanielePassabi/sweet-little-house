import * as THREE from './vendor/three.module.js';
import {mediaConsole as layout} from './media-layout.js?v=20261020-1';

// Local X spans the cabinet; local +Z faces the sofa.
export function createTVConsole(parent,box){
 const root=new THREE.Group();root.name='walnut-tv-console';root.position.set(layout.x,0,layout.z);root.rotation.y=Math.PI/2;parent.add(root);
 const walnut=new THREE.MeshStandardMaterial({color:'#805437',roughness:.76});
 const front=new THREE.MeshStandardMaterial({color:'#895d3d',roughness:.78});
 const interior=new THREE.MeshStandardMaterial({color:'#533a29',roughness:.85});
 const recess=new THREE.MeshStandardMaterial({color:'#30221b',roughness:.94});
 root.userData.woodMaterials=[walnut,front,interior];
 const part=(name,g,m,x=0,y=0,z=0)=>{const p=new THREE.Mesh(g,m);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;root.add(p);return p;};
 const block=(name,w,h,d,m,x,y,z)=>{const p=box(w,h,d,m,x,y,z,root);p.name=name;return p;};
 block('continuous-walnut-top',layout.width,.020,layout.depth,walnut,0,.430,0);
 block('cabinet-base',layout.width,.018,layout.depth,walnut,0,.109,0);
 for(const x of [-1.191,1.191])block('cabinet-side',.018,.302,layout.depth,walnut,x,.269,0);
 for(const x of [-.585,.215])block('open-bay-divider',.018,.302,.412,walnut,x,.269,-.009);
 // A real rear cable opening is visible through the upper cubby.
 const rearShape=new THREE.Shape();rearShape.moveTo(-1.182,.118);rearShape.lineTo(1.182,.118);rearShape.lineTo(1.182,.420);rearShape.lineTo(-1.182,.420);rearShape.closePath();
 const cableHole=new THREE.Path();cableHole.absarc(0,.347,.025,0,Math.PI*2,true);rearShape.holes.push(cableHole);
 part('rear-panel-with-cable-hole',new THREE.ExtrudeGeometry(rearShape,{depth:.012,bevelEnabled:false,curveSegments:16}),interior,0,0,-.215);
 block('central-open-shelf',.782,.014,.406,walnut,-.185,.267,-.001);
 // The photo has one left door and two narrower right doors; the central bay is open.
 const doors=[{left:-1.178,right:-.597},{left:.227,right:.695,handle:.669},{left:.705,right:1.178,handle:.731}];
 const ribGeometry=new THREE.CylinderGeometry(.0032,.0032,1,8),ribMatrices=[],dummy=new THREE.Object3D();
 function rib(x,y,height){dummy.position.set(x,y,.2118);dummy.scale.set(1,height,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();ribMatrices.push(dummy.matrix.clone());}
 for(const door of doors){
  const shape=new THREE.Shape();shape.moveTo(door.left,.122);shape.lineTo(door.right,.122);shape.lineTo(door.right,.418);shape.lineTo(door.left,.418);shape.closePath();
  if(door.handle!==undefined){
   const x=door.handle,hole=new THREE.Path();hole.moveTo(x-.006,.236);hole.lineTo(x-.006,.304);hole.quadraticCurveTo(x-.006,.310,x,.310);hole.quadraticCurveTo(x+.006,.310,x+.006,.304);hole.lineTo(x+.006,.236);hole.quadraticCurveTo(x+.006,.230,x,.230);hole.quadraticCurveTo(x-.006,.230,x-.006,.236);shape.holes.push(hole);
   block('recessed-finger-pull',.014,.084,.003,recess,x,.270,.1955);
  }
  part('fluted-door-backing',new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:false,curveSegments:6}),front,0,0,.197);
  const count=Math.floor((door.right-door.left)/.009),pitch=(door.right-door.left)/count;
  for(let i=0;i<count;i++){
   const x=door.left+pitch*(i+.5);
   if(door.handle!==undefined&&Math.abs(x-door.handle)<.0093){rib(x,(.124+.227)/2,.227-.124);rib(x,(.313+.416)/2,.416-.313);}
   else rib(x,.270,.292);
  }
 }
 const ribs=new THREE.InstancedMesh(ribGeometry,front,ribMatrices.length);ribs.name='vertical-walnut-flutes';ribMatrices.forEach((m,i)=>ribs.setMatrixAt(i,m));ribs.castShadow=ribs.receiveShadow=true;ribs.computeBoundingBox();ribs.computeBoundingSphere();root.add(ribs);
 const feet=new THREE.InstancedMesh(new THREE.CylinderGeometry(.014,.011,.10,16),walnut,6);feet.name='slender-walnut-feet';let index=0;
 for(const x of [-1.04,0,1.04])for(const z of [-.145,.145]){dummy.position.set(x,.05,z);dummy.scale.set(1,1,1);dummy.updateMatrix();feet.setMatrixAt(index++,dummy.matrix);}
 feet.castShadow=feet.receiveShadow=true;feet.computeBoundingBox();feet.computeBoundingSphere();root.add(feet);
 // A small stack in the lower open shelf echoes the reference without covering the bay.
 const pages=new THREE.MeshStandardMaterial({color:'#c6baa1',roughness:1}),cover=new THREE.MeshStandardMaterial({color:'#8c8170',roughness:1});
 for(const [x,y,w,d] of [[-.26,.118,.23,.15],[-.25,.148,.19,.14]]){
  block('book-pages',w-.004,.024,d-.004,pages,x,y+.015,.055);
  for(const height of [y+.0015,y+.0285])block('book-cover',w,.003,d,cover,x,height,.055);
 }
 root.updateMatrixWorld(true);return root;
}
