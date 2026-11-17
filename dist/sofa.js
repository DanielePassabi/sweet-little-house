import * as THREE from './vendor/three.module.js';
import {sofaLayout,sofaPumpkins} from './sofa-layout.js?v=20261012-1';

import {point,walls} from './model.js';
import {createFramedPrint} from './framed-print.js';
import {cushionGeometry} from './cushion-geometry.js';

// Two loose back cushions over a continuous quilted seat and a wall-side chaise.
export function createSofa(parent,materials){
 const {width,depth,chaiseDepth,chaiseWidth,backX,minZ,seatHeight}=sofaLayout;
 const group=new THREE.Group();group.name='purchased-sofa';
 group.position.set(backX,0,minZ+width/2);group.rotation.y=-Math.PI/2;parent.add(group);
 // Mirror the complete sofa, including its cushions and plush pumpkins.
 group.scale.x=-1;
 function place(name,geometry,material,positions){
  const mesh=new THREE.InstancedMesh(geometry,material,positions.length),dummy=new THREE.Object3D();
  mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
  positions.forEach(([x,y,z,rx=0,ry=0,rz=0],i)=>{
   dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
 }
 // The inset bases disappear into shadow beneath the upholstered waterfall front.
 const chaiseX=(width-chaiseWidth)/2;
 place('sofa-shadow-base',cushionGeometry(width-.14,.085,depth-.14,8,[8,4,8]),materials.base,[[0,.059,depth/2]]);
 place('chaise-shadow-base',cushionGeometry(chaiseWidth-.12,.085,chaiseDepth-.14,8,[8,4,8]),materials.base,[[chaiseX,.059,chaiseDepth/2]]);
 place('sofa-back-frame',cushionGeometry(width-.13,.78,.24,5,[18,10,8]),materials.frame,[[0,.417,.12]]);

 // One surface runs across each module and down its front. Stitching compresses
 // the foam in both directions without opening gaps between adjacent squares.
 function seamProfile(value,span,count){
  const pitch=span/count,at=(value+span/2)/pitch,seam=Math.round(at);
  if(seam<=0||seam>=count)return 0;
  const offset=(at-seam)*pitch;
  return .68*Math.exp(-((offset/.064)**2))+.32*Math.exp(-((offset/.020)**2));
 }
 function quilt(w,h,d,columns,rows){
  return cushionGeometry(w,h,d,5.8,[columns*16,10,rows*14],p=>{
   const across=seamProfile(p.x,w,columns),along=seamProfile(p.z,d,rows);
   const top=Math.max(0,2*p.y/h),front=Math.max(0,2*p.z/d),side=Math.abs(2*p.x/w);
   p.y-=(.032*(across+along)+.009*across*along)*top*top;
   p.z-=.039*across*front**5;
   p.x*=1-.036*along*side**4;
   return 1-.13*(across*Math.max(top,front)+along*Math.max(top,side));
  });
 }
 const armWidth=.30,armX=(width-armWidth)/2,seatStart=.18,seatBottom=.026;
 const seatH=seatHeight-seatBottom,seatY=seatBottom+seatH/2;
 place('quilted-arms',quilt(armWidth,.61,depth,1,3),materials.upholstery,
  [[-armX,.334,depth/2],[armX,.334,depth/2]]);
 const mainWidth=width-chaiseWidth-armWidth,chaiseSeatWidth=chaiseWidth-armWidth;
 place('quilted-seat',quilt(mainWidth,seatH,depth-seatStart,4,3),materials.upholstery,
  [[-width/2+armWidth+mainWidth/2,seatY,(seatStart+depth)/2]]);
 place('quilted-chaise',quilt(chaiseSeatWidth,seatH,chaiseDepth-seatStart,2,5),materials.upholstery,
  [[width/2-armWidth-chaiseSeatWidth/2,seatY,(seatStart+chaiseDepth)/2]]);
 const extensionStart=depth-.105;
 place('chaise-outer-pad',quilt(armWidth,seatH,chaiseDepth-extensionStart,1,2),materials.upholstery,
  [[armX,seatY,(extensionStart+chaiseDepth)/2]]);

 const backW=(width-.46)/2,backH=.52,backD=.265;
 const back=cushionGeometry(backW,backH,backD,4.4,[56,24,8],p=>{
  // Two shallow, buttonless pulls gather the face of each broad pillow.
  const dx=Math.abs(p.x)-backW*.237,dy=p.y+.006;
  const dimple=Math.exp(-((dx/.059)**2+(dy/.050)**2));
  const crease=Math.exp(-((dx/.024)**2+(dy/.125)**2));
  const crossFold=Math.exp(-((dx/.14)**2+(dy/.024)**2));
  const face=Math.max(0,2*p.z/backD);
  p.z-=face*(.021*dimple+.006*crease+.005*crossFold);
  const welt=Math.exp(-((p.z/.009)**2));
  p.x*=1+.007*welt;p.y*=1+.011*welt;
  return 1-.105*dimple*face-.022*crease*face;
 });
 place('tufted-back-cushions',back,materials.upholstery,
  [[-backW/2,.713,.315,-.14,.012,.012],[backW/2,.706,.305,-.16,-.012,-.012]]);
 // Taupe cushions nest against the rear edge, with one raised as in the photo.
 place('taupe-scatter-cushions',cushionGeometry(.67,.218,.17,3.1,[18,10,8]),materials.pillows,
  [[-backW/2,.90,.169,-.15,0,.012],[backW/2,.832,.17,-.14,0,-.023]]);
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

// The sofa faces west. The hall doorway and the chaise are on its north side.
export function createLivingRoomPicture(parent,doorFinish,texture){
 const partition=walls.find(w=>w.a[1]===742&&w.b[1]===742);
 const [,wallZ]=point(partition.a),printWidth=.90;
 const picture=createFramedPrint(doorFinish,texture,printWidth,printWidth*483/612,'starry-night-print');
 picture.name='living-room-starry-night';
 picture.position.set(sofaLayout.backX-sofaLayout.chaiseDepth/2,1.63,wallZ+partition.t/2+.0005);
 parent.add(picture);return picture;
}
