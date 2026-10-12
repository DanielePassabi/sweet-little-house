import * as THREE from './vendor/three.module.js';
import {sofaLayout,sofaPumpkins} from './sofa-layout.js?v=20261012-1';

// Soft channel upholstery, three tufted backs and a right-hand chaise from the photo.
export function createSofa(parent,materials){
 const {width,depth,chaiseDepth,chaiseWidth,backX,minZ,seatHeight}=sofaLayout;
 const group=new THREE.Group();group.name='purchased-sofa';
 group.position.set(backX,0,minZ+width/2);group.rotation.y=-Math.PI/2;parent.add(group);
 // Mirror the complete sofa, including its cushions and plush pumpkins.
 group.scale.x=-1;
 const cache=new Map(),repeated=new Map(),dummy=new THREE.Object3D();
 function softGeometry(w,h,d,r,tufted=false){
  const key=[w,h,d,r,tufted].join(',');if(cache.has(key))return cache.get(key);
  const geometry=new THREE.BoxGeometry(w,h,d,tufted?40:12,tufted?28:12,12);
  const positions=geometry.attributes.position,normals=geometry.attributes.normal;
  const half=new THREE.Vector3(w/2-r,h/2-r,d/2-r),low=half.clone().negate();
  const v=new THREE.Vector3(),core=new THREE.Vector3(),n=new THREE.Vector3();
  function tuft(x,y){
   let indent=0;
   for(const tx of [-w*.24,w*.24])for(const ty of [-h*.20,h*.20]){
    const dx=x-tx,dy=y-ty;
    indent+=.021*Math.exp(-(dx*dx+dy*dy)/.00055);
    indent+=.004*Math.exp(-dx*dx/.00009-dy*dy/.011);
    indent+=.003*Math.exp(-dx*dx/.011-dy*dy/.00009);
   }
   return -indent;
  }
  for(let i=0;i<positions.count;i++){
   v.fromBufferAttribute(positions,i);core.copy(v).clamp(low,half);n.copy(v).sub(core).normalize();v.copy(core).addScaledVector(n,r);
   if(tufted&&n.z>.5){
    const strength=n.z;v.z+=tuft(v.x,v.y)*strength;
    n.x-=(tuft(v.x+.001,v.y)-tuft(v.x-.001,v.y))/.002*strength;
    n.y-=(tuft(v.x,v.y+.001)-tuft(v.x,v.y-.001))/.002*strength;n.normalize();
   }
   positions.setXYZ(i,v.x,v.y,v.z);normals.setXYZ(i,n.x,n.y,n.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();cache.set(key,geometry);return geometry;
 }
 function cushion(name,w,h,d,r,material,x,y,z,rx=0,ry=0,rz=0,tufted=false){
  const geometry=softGeometry(w,h,d,r,tufted),key=geometry.uuid+material.uuid;
  if(!repeated.has(key))repeated.set(key,{name,geometry,material,matrices:[]});
  dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(1,1,1);dummy.updateMatrix();
  repeated.get(key).matrices.push(dummy.matrix.clone());
 }
 // Recessed foot/base is almost hidden by the upholstery, as in the reference.
 cushion('sofa-shadow-base',width-.12,.08,depth-.10,.035,materials.base,0,.065,depth/2);
 cushion('chaise-shadow-base',chaiseWidth-.10,.08,chaiseDepth-.10,.035,materials.base,width/2-chaiseWidth/2,.065,chaiseDepth/2);
 cushion('sofa-back-frame',width-.08,.82,.21,.095,materials.frame,0,.46,.105);
 // Broad rounded arms stop at the seat front, leaving the end of the chaise open.
 for(const side of [-1,1])cushion('rounded-arms',.29,.65,depth,.14,materials.upholstery,side*(width/2-.145),.375,depth/2);
 const seatWidth=width-.56,pitch=seatWidth/9,start=.28;
 for(let i=0;i<9;i++){
  const long=i>=6,end=long?chaiseDepth:depth;
  cushion(long?'chaise-channels':'seat-channels',pitch-.004,.46,end-start,.11,materials.upholstery,
   -seatWidth/2+(i+.5)*pitch,seatHeight-.23,(start+end)/2);
 }
 // Continue the chaise to the outer edge of its arm, rather than narrowing its foot.
 cushion('chaise-outer-channel',.28,.46,chaiseDepth-1.10,.11,materials.upholstery,
  width/2-.14,seatHeight-.23,(chaiseDepth+1.10)/2);
 const backWidth=(width-.52)/3;
 for(let i=0;i<3;i++)cushion('tufted-back-cushions',backWidth-.018,.57,.24,.08,materials.upholstery,
  (i-1)*backWidth,.718,.265,-.10,0,0,true);
 // The two taupe scatter cushions shown in the photo remain in addition to the pumpkins.
 for(const side of [-1,1])cushion('taupe-scatter-cushions',.39,.39,.15,.065,materials.pillows,
  side*.84,.66,.47,-.19,side*.08,side*-.12);
 for(const {name,geometry,material,matrices} of repeated.values()){
  const instances=new THREE.InstancedMesh(geometry,material,matrices.length);instances.name=name;
  matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));instances.castShadow=instances.receiveShadow=true;
  instances.computeBoundingBox();instances.computeBoundingSphere();group.add(instances);
 }
 // A continuous lobed surface gives each plush pumpkin soft ribs and a flattened base.
 const pumpkinGeometry=new THREE.SphereGeometry(1,64,32),p=pumpkinGeometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x);
  const ribs=.91+.09*Math.cos(angle*8),squash=1-.12*Math.pow(Math.abs(y),8);
  p.setXYZ(i,x*ribs,y*squash,z*ribs);
 }
 pumpkinGeometry.computeVertexNormals();pumpkinGeometry.computeBoundingBox();
 for(const pumpkin of sofaPumpkins){
  const plush=new THREE.Group();plush.name=pumpkin.name;plush.position.set(pumpkin.x,seatHeight,pumpkin.z);plush.rotation.y=pumpkin.turn;
  const body=new THREE.Mesh(pumpkinGeometry,materials[pumpkin.material]);body.name='plush-body';
  body.scale.set(pumpkin.r,pumpkin.h/1.76,pumpkin.r);body.position.y=pumpkin.h/2-.012;
  body.castShadow=body.receiveShadow=true;plush.add(body);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,pumpkin.h-.025,0),new THREE.Vector3(.007,pumpkin.h+.012,0),new THREE.Vector3(.028,pumpkin.h+.04,.008)]);
  const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,10,.015,8,false),materials.stem);stem.name='soft-stem';stem.castShadow=true;plush.add(stem);
  group.add(plush);
 }
 return group;
}
