import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { point, SCALE, HEIGHT, rooms, nightRoomIds, walls, railings, footprint, insidePolygon, canStand, collisionWalls } from './model.js?v=20260915-1';
import { wallVolumes, unionSurface } from './wall-geometry.js?v=20260915-1';

import { createLandscape } from './landscape.js?v=20260915-3';

import { createMovement, DEFAULT_EYE_HEIGHT, movementCodes } from './movement.js?v=20260916-1';

import { createRenderState, freezeStaticTransforms, indexStaticSurface } from './render-state.js?v=20260916-3';

import {kitchenModules,diningLayout,diningChairs,peninsula,peninsulaStools} from './kitchen-layout.js?v=20260923-4';
import {canWalk,furnitureColliders,safeRoomPosition} from './furniture-collisions.js?v=20260925-7';
import {applyMaterialDetails,applyKitchenMaterials} from './material-details.js?v=20260923-1';
import {solarPosition,romeDate} from './solar.js?v=20260916-1';

const renderState=createRenderState();
const $ = s => document.querySelector(s);
const host = $('#scene');
const isTouch = matchMedia('(pointer:coarse)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch { $('#error').hidden=false; $('#error').textContent='Il browser non riesce ad avviare la vista 3D. Prova ad attivare l’accelerazione grafica o ad aprire la pagina in un browser aggiornato.'; throw new Error('WebGL unavailable'); }
let renderPixelRatio=Math.min(devicePixelRatio,1.75);
renderer.setPixelRatio(renderPixelRatio);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
host.append(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#9dd8f5');
scene.fog=new THREE.Fog('#b8dff2',48,120);
const perspective=new THREE.PerspectiveCamera(43,1,.05,150);
const orthographic=new THREE.OrthographicCamera(-10,10,10,-10,.05,100);
let camera=perspective;
const controls=new OrbitControls(perspective,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;
controls.minDistance=5;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.47;
controls.target.set(4.5,0,7.3);
const model=new THREE.Group();scene.add(model);
const ceiling=new THREE.Group();model.add(ceiling);ceiling.visible=false;
const labelElements=new Map();
const floorObjects=[];
const white=new THREE.MeshStandardMaterial({color:'#f6f5ef',roughness:.91});
const trim=new THREE.MeshStandardMaterial({color:'#edece6',roughness:.6});
const cap=new THREE.MeshStandardMaterial({color:'#9faeb5',roughness:.95});
const frame=new THREE.MeshStandardMaterial({color:'#526169',roughness:.5,metalness:.25});
const glass=new THREE.MeshPhysicalMaterial({color:'#c3dfed',transparent:true,opacity:.22,roughness:.12,metalness:.08,depthWrite:false});
const doorMaterial=new THREE.MeshStandardMaterial({color:'#d2c6b4',roughness:.75});
const GROUND_Y=-.20;
let tileSize=.6;
const floorMaterial=new THREE.MeshStandardMaterial({color:'#b8b9b5',roughness:.92});

function makeTileTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');
 cx.fillStyle='#fafaf8';cx.fillRect(0,0,512,512);
 let seed=1234;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<13500;i++){const v=Math.floor(223+rnd()*30);cx.fillStyle=`rgba(${v},${v},${v-2},.28)`;cx.fillRect(rnd()*512,rnd()*512,1+rnd()*3,1+rnd()*3);}
 cx.fillStyle='#bfc0bc';cx.fillRect(0,0,3,512);cx.fillRect(0,0,512,3);
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/tileSize,1/tileSize);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
floorMaterial.map=makeTileTexture();
function makeParquetTexture(){
 const c=document.createElement('canvas');c.width=c.height=1024;const cx=c.getContext('2d');
 let seed=8421;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const rows=18,rowH=c.height/rows,plankW=c.width/2;
 cx.fillStyle='#ad7745';cx.fillRect(0,0,c.width,c.height);
 for(let row=0;row<rows;row++){
  const offset=(row%2)*plankW/2;
  for(let x=-plankW;x<c.width+plankW;x+=plankW){
   const left=x+offset,light=Math.floor(rnd()*22)-9;
   cx.fillStyle=`rgb(${198+light},${157+light},${105+Math.floor(light*.55)})`;cx.fillRect(left+2,row*rowH+2,plankW-4,rowH-4);
   cx.strokeStyle='rgba(78,45,22,.22)';cx.lineWidth=2;cx.strokeRect(left+1,row*rowH+1,plankW-2,rowH-2);
   for(let grain=0;grain<9;grain++){
    const gy=row*rowH+7+rnd()*(rowH-14),wave=2+rnd()*5;
    cx.beginPath();cx.moveTo(left+8,gy);
    for(let px=24;px<plankW-8;px+=24)cx.lineTo(left+px,gy+Math.sin(px*.035+rnd())*wave);
    cx.strokeStyle=`rgba(91,52,25,${.035+rnd()*.055})`;cx.lineWidth=.8+rnd();cx.stroke();
   }
  }
 }
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/2.7,1/2.7);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
function makeGrassTexture(){
 const size=768,c=document.createElement('canvas');c.width=c.height=size;const cx=c.getContext('2d'),image=cx.createImageData(size,size);
 let seed=1937;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},turn=Math.PI*2/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,grain=rnd()-.5;
  const patch=Math.sin(x*turn*3)+Math.sin(y*turn*4)+Math.sin((x+y)*turn*2);
  image.data[i]=Math.max(45,Math.min(103,99+grain*18+patch*1.3));
  image.data[i+1]=Math.max(102,Math.min(165,125+grain*20+patch*1.6));
  image.data[i+2]=Math.max(31,Math.min(82,65+grain*14+patch));image.data[i+3]=255;
 }
 cx.putImageData(image,0,0);
 for(let i=0;i<9000;i++){
  const x=rnd()*size,y=rnd()*size,h=2+rnd()*7;
  cx.strokeStyle=rnd()>.42?'rgba(24,74,25,.30)':'rgba(174,190,91,.18)';cx.lineWidth=.55+rnd()*.7;
  cx.beginPath();cx.moveTo(x,y+h);cx.quadraticCurveTo(x+(rnd()-.5)*2,y+h*.45,x+(rnd()-.5)*3,y);cx.stroke();
 }
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(32,32);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
function polygonMesh(poly,material,y=0){
 const shape=new THREE.Shape();poly.map(point).forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const geo=new THREE.ShapeGeometry(shape);const uv=geo.attributes.uv;const pos=geo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i),pos.getY(i));
 const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;model.add(mesh);return mesh;
}
// Continuous floor prevents seams in the corridor and keeps tile joints aligned.
const floor=polygonMesh(footprint,floorMaterial);floorObjects.push(floor);
const terraceFloor=polygonMesh(rooms.find(r=>r.id==='terrace').polygon,new THREE.MeshStandardMaterial({color:'#d7d8d3',map:floorMaterial.map,roughness:.95}),.003);floorObjects.push(terraceFloor);
const parquetTexture=makeParquetTexture();
const parquetMaterial=new THREE.MeshStandardMaterial({color:'#fff4df',map:parquetTexture,bumpMap:parquetTexture,bumpScale:.006,roughness:.72});
// Finishes meet at partition centre-lines, including the bedroom door thresholds.
const parquetRoomIds=['room2','room3','bedroom'];
const parquetPolygons=[
 [[30,43],[409,43],[409,374],[270,374],[270,320],[30,320]],
 [[30,498],[300.32,498],[300.32,775],[30,775]],
 [[409,125],[712,125],[712,493],[529,493],[529,529],[409,529]]
];
for(const polygon of parquetPolygons)floorObjects.push(polygonMesh(polygon,parquetMaterial,.006));
for(const [material,layer] of [[terraceFloor.material,1],[parquetMaterial,2]]){material.polygonOffset=true;material.polygonOffsetFactor=-layer;material.polygonOffsetUnits=-layer;}
const base=polygonMesh(footprint,new THREE.MeshStandardMaterial({color:'#a7b1b7',roughness:1}),-.16);
const unitBoxGeometry=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,mat,x,y,z,parent=model)=>{const m=new THREE.Mesh(unitBoxGeometry,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
const assetDummy=new THREE.Object3D(),staticInstanceGroups=new Map();
function queueStaticInstance(geometry,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
 assetDummy.position.set(x,y,z);assetDummy.rotation.set(rx,ry,rz);assetDummy.scale.set(sx,sy,sz);assetDummy.updateMatrix();
 const key=geometry.uuid+material.uuid;if(!staticInstanceGroups.has(key))staticInstanceGroups.set(key,{geometry,material,matrices:[]});
 staticInstanceGroups.get(key).matrices.push(assetDummy.matrix.clone());
}
function flushStaticInstances(parent=model){let items=0;for(const {geometry,material,matrices} of staticInstanceGroups.values()){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();parent.add(mesh);items+=matrices.length;}return {items,batches:staticInstanceGroups.size};}
// Foundation edge under the exterior outline.
footprint.forEach((a,i)=>{const b=footprint[(i+1)%footprint.length];const [x,z]=point(a),[ex,ez]=point(b);const len=Math.hypot(ex-x,ez-z);const m=box(len,.16,.09,cap,(x+ex)/2,-.08,(z+ez)/2);m.rotation.y=-Math.atan2(ez-z,ex-x);});

const architecturalVolumes=wallVolumes();
const wallSurface=unionSurface(architecturalVolumes);
const wallVertexStats={before:0,after:0};
wallSurface.faces.forEach((positions,i)=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.computeVertexNormals();
 const indexed=indexStaticSurface(geometry);wallVertexStats.before+=indexed.before;wallVertexStats.after+=indexed.after;
 const mesh=new THREE.Mesh(geometry,[white,trim,cap][i]);
 mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);
});

function buildOpenings(w){
 const [ax,az]=point(w.a),[bx,bz]=point(w.b);const dx=bx-ax,dz=bz-az;const length=Math.hypot(dx,dz);const group=new THREE.Group();group.position.set(ax,0,az);group.rotation.y=-Math.atan2(dz,dx);model.add(group);
 for(const o of w.open??[]){
  const s=o.s/SCALE,e=o.e/SCALE;
  if(o.kind==='window'||o.kind==='glazed'){
   const f=.035;for(const x of [s+f/2,e-f/2])box(f,o.h,.09,frame,x,o.sill+o.h/2,0,group);
   for(const y of [o.sill+f/2,o.sill+o.h-f/2])box(e-s,f,.09,frame,(s+e)/2,y,0,group);
   box(f,o.h,.09,frame,(s+e)/2,o.sill+o.h/2,0,group);
   if(o.kind==='window')box(e-s-.07,o.h-.07,.015,glass,(s+e)/2,o.sill+o.h/2,0,group);
   else { // sliding terrace door: one open half, one glazed fixed half
    box((e-s)/2-.04,o.h-.07,.015,glass,s+(e-s)/4,o.h/2,0,group);
   }
   if(o.kind==='window')box(e-s+.08,.035,w.t+.10,trim,(s+e)/2,o.sill-.02,0,group);
  }else{
   for(const x of [s-.018,e+.018])box(.035,o.h+.035,w.t+.04,trim,x,o.h/2,0,group);
   box(e-s+.07,.04,w.t+.04,trim,(s+e)/2,o.h+.02,0,group);
   if(o.kind==='entry'){
    box(e-s,o.h,.065,doorMaterial,(s+e)/2,o.h/2,0,group);
    box(.035,.17,.09,frame,e-.10,1,.075,group);
   }
  }
 }
}
walls.forEach(buildOpenings);

// First furniture layout, following the annotated plan: media wall to the west and
// a generous L-shaped sectional opposite it, while keeping the hall route clear.
const furniture=new THREE.Group();model.add(furniture);
const sofaFrameMaterial=new THREE.MeshStandardMaterial({color:'#cbb38e',roughness:1});
const sofaCushionMaterial=new THREE.MeshStandardMaterial({color:'#ddc6a2',roughness:1});
const sofaAccentMaterial=new THREE.MeshStandardMaterial({color:'#bfa27b',roughness:1});
const furnitureBlack=new THREE.MeshStandardMaterial({color:'#141719',roughness:.72});
const consoleFrontMaterial=new THREE.MeshStandardMaterial({color:'#222629',roughness:.82});
const screenMaterial=new THREE.MeshStandardMaterial({color:'#071015',emissive:'#1d323c',emissiveIntensity:.24,roughness:.2,metalness:.18});
const furnitureBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,furniture);

// Round inward from the original bounding boxes: every outer dimension stays unchanged.
const sofaGeometryCache=new Map();
function sofaSoftBox(w,h,d,material,x,y,z){
 const key=[w,h,d].join(',');let geometry=sofaGeometryCache.get(key);
 if(!geometry){
  geometry=new THREE.BoxGeometry(w,h,d,8,8,8);
  const radius=Math.min(.055,Math.min(w,h,d)*.28),position=geometry.attributes.position,normal=geometry.attributes.normal;
  const half=new THREE.Vector3(w/2-radius,h/2-radius,d/2-radius),v=new THREE.Vector3(),inner=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i);inner.copy(v).clamp(half.clone().negate(),half);v.sub(inner).normalize();
   normal.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(radius).add(inner);position.setXYZ(i,v.x,v.y,v.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();sofaGeometryCache.set(key,geometry);
 }
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;furniture.add(mesh);return mesh;
}
// Three modules over 2.25 m: a chaise and two seats, facing west toward the TV.
sofaSoftBox(1.08,.32,2.25,sofaFrameMaterial,6.91,.20,9.23);
sofaSoftBox(.24,.72,2.27,sofaFrameMaterial,7.37,.61,9.23);
[8.48,9.22,9.96].forEach(z=>{
 const back=sofaSoftBox(.25,.52,.76,sofaCushionMaterial,7.19,.75,z);back.rotation.z=-.055;
});
[9.22,9.96].forEach(z=>sofaSoftBox(.84,.17,.68,sofaCushionMaterial,6.77,.45,z));
// Chaise at the north end creates the L shown in the supplied sketch.
sofaSoftBox(1.30,.32,.75,sofaFrameMaterial,6.41,.20,8.48);
sofaSoftBox(1.08,.17,.60,sofaCushionMaterial,6.36,.45,8.48);
sofaSoftBox(.20,.56,.76,sofaFrameMaterial,5.735,.45,8.48);
sofaSoftBox(.88,.56,.20,sofaFrameMaterial,6.91,.45,10.40);
// Accent pillows rest on the seat and lean against the back, centered on the end modules.
const cushionA=sofaSoftBox(.18,.44,.46,sofaAccentMaterial,6.96,.75,8.48);cushionA.rotation.z=-.14;cushionA.rotation.y=.035;
const cushionB=sofaSoftBox(.18,.44,.46,sofaAccentMaterial,6.96,.75,9.96);cushionB.rotation.z=-.14;cushionB.rotation.y=-.035;
[[6.53,8.15],[7.27,8.15],[6.53,10.30],[7.27,10.30],[5.84,8.18]].forEach(([x,z])=>furnitureBox(.08,.12,.08,furnitureBlack,x,.06,z));

// Rectangular ivory rug: tucked beneath the seating, inside both sofa back edges.
const livingRugMaterial=new THREE.MeshStandardMaterial({color:'#e6ddcc',roughness:1});
furnitureBox(2.50,.014,2.62,livingRugMaterial,6.10,.014,9.53);

// Approximately 80-inch 16:9 television and a compact black media console.
const mediaWallCenterZ=9.72;
furnitureBox(.38,.42,2.02,furnitureBlack,3.28,.24,mediaWallCenterZ);
[mediaWallCenterZ-.64,mediaWallCenterZ,mediaWallCenterZ+.64].forEach(z=>furnitureBox(.018,.31,.60,consoleFrontMaterial,3.48,.27,z));
[[3.20,mediaWallCenterZ-.90],[3.20,mediaWallCenterZ+.90],[3.38,mediaWallCenterZ-.90],[3.38,mediaWallCenterZ+.90]].forEach(([x,z])=>furnitureBox(.055,.12,.055,furnitureBlack,x,.06,z));
furnitureBox(.075,1.03,1.81,furnitureBlack,3.12,1.47,mediaWallCenterZ);
furnitureBox(.018,.91,1.67,screenMaterial,3.166,1.47,mediaWallCenterZ);

// Utility room: boiler and meter on the left, sink in the centre, stacked
// washer/dryer on the right, all facing the entrance from the terrace.
const utilityFixtures=new THREE.Group();model.add(utilityFixtures);
const utilityBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,utilityFixtures);
const applianceWhite=new THREE.MeshStandardMaterial({color:'#ecefea',roughness:.58});
const applianceTrim=new THREE.MeshStandardMaterial({color:'#aab3b5',roughness:.45,metalness:.25});
const applianceGlass=new THREE.MeshPhysicalMaterial({color:'#18252b',roughness:.18,metalness:.2});
const ceramicMaterial=new THREE.MeshStandardMaterial({color:'#f5f5ef',roughness:.3});
// Boiler and a small consumption meter.
utilityBox(.58,.76,.25,applianceWhite,.40,1.76,8.69);
utilityBox(.30,.13,.018,applianceGlass,.40,1.69,8.825);
utilityBox(.31,.38,.17,applianceTrim,.40,1.10,8.65);
utilityBox(.19,.10,.018,applianceGlass,.40,1.14,8.745);
for(const x of [.31,.49]){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.34,10),applianceTrim);pipe.position.set(x,.83,8.69);utilityFixtures.add(pipe);}
// Central utility sink with a compact cabinet and faucet.
utilityBox(.66,.68,.46,applianceWhite,1.24,.36,8.80);
utilityBox(.72,.09,.52,ceramicMaterial,1.24,.74,8.82);
utilityBox(.48,.025,.32,applianceGlass,1.24,.79,8.86);
const faucetStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.28,12),applianceTrim);faucetStem.position.set(1.24,.94,8.61);utilityFixtures.add(faucetStem);
utilityBox(.05,.05,.22,applianceTrim,1.24,1.07,8.71);
// Front-loading washer and dryer stacked vertically.
for(const y of [.45,1.30]){
 utilityBox(.66,.80,.65,applianceWhite,2.08,y,8.89);
 const door=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.035,32),applianceGlass);door.rotation.x=Math.PI/2;door.position.set(2.08,y,9.235);utilityFixtures.add(door);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.235,.026,10,32),applianceTrim);ring.position.set(2.08,y,9.26);utilityFixtures.add(ring);
 utilityBox(.30,.09,.025,applianceGlass,1.96,y+.29,9.23);
}

// Outdoor terrace set: a round table with two tucked-in curved chairs and a striped
// loveseat on the left-hand side when entering through the glazed door.
const terraceFurniture=new THREE.Group();model.add(terraceFurniture);
const terraceBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,terraceFurniture);
const outdoorFrameMaterial=new THREE.MeshStandardMaterial({color:'#303638',roughness:.86,metalness:.18});
const outdoorWoodMaterial=new THREE.MeshStandardMaterial({color:'#a98258',roughness:.78});
function makeLilacStripeTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');
 cx.fillStyle='#f5f2ee';cx.fillRect(0,0,256,256);
 for(let x=0;x<256;x+=64){cx.fillStyle='#d5c1e4';cx.fillRect(x+30,0,34,256);}
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2.4,1.3);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
const stripedUpholstery=new THREE.MeshStandardMaterial({color:'#ffffff',map:makeLilacStripeTexture(),roughness:1});
// Round 85 cm table: central pedestal frees space beneath the top for seats.
const terraceSetCenterX=1.275,terraceSetCenterZ=12.25;
const terraceRoundGeometry=new THREE.CylinderGeometry(1,1,1,32);
queueStaticInstance(terraceRoundGeometry,outdoorWoodMaterial,terraceSetCenterX,.72,terraceSetCenterZ,.425,.08,.425);
queueStaticInstance(terraceRoundGeometry,outdoorFrameMaterial,terraceSetCenterX,.35,terraceSetCenterZ,.045,.66,.045);
queueStaticInstance(terraceRoundGeometry,outdoorFrameMaterial,terraceSetCenterX,.025,terraceSetCenterZ,.22,.04,.22);
// Closed rounded profile gives the curved back thickness on both sides.
const terraceBackGeometry=new THREE.LatheGeometry([
 new THREE.Vector2(.235,-.18),new THREE.Vector2(.255,-.18),
 new THREE.Vector2(.275,.16),new THREE.Vector2(.265,.19),
 new THREE.Vector2(.25,.19),new THREE.Vector2(.235,-.18)
],24,Math.PI/2,Math.PI);
function addTerraceChair(z,facingSouth){
 queueStaticInstance(terraceRoundGeometry,outdoorWoodMaterial,terraceSetCenterX,.47,z,.24,.07,.24);
 queueStaticInstance(terraceBackGeometry,outdoorFrameMaterial,terraceSetCenterX,.69,z,1,1,1,0,facingSouth?0:Math.PI,0);
 for(const dx of [-.16,.16])for(const dz of [-.16,.16])queueStaticInstance(terraceRoundGeometry,outdoorFrameMaterial,terraceSetCenterX+dx,.225,z+dz,.022,.43,.022);
}
// 33 cm closer than the previous chairs, with seat fronts beneath the tabletop.
addTerraceChair(terraceSetCenterZ-.49,true);addTerraceChair(terraceSetCenterZ+.49,false);
// Full-width outdoor sofa, flush with the south parapet (left on entry).
terraceBox(2.58,.27,.70,outdoorFrameMaterial,1.275,.20,14.44);
terraceBox(2.60,.66,.16,outdoorFrameMaterial,1.275,.59,14.78);
terraceBox(.16,.52,.70,outdoorFrameMaterial,.03,.43,14.44);
terraceBox(.16,.52,.70,outdoorFrameMaterial,2.52,.43,14.44);
[.42,1.275,2.13].forEach(x=>{
 terraceBox(.76,.15,.54,stripedUpholstery,x,.43,14.36);
 const back=terraceBox(.76,.48,.15,stripedUpholstery,x,.72,14.66);back.rotation.x=-.08;
});
[[.08,14.16],[2.47,14.16],[.08,14.70],[2.47,14.70]].forEach(([x,z])=>terraceBox(.055,.12,.055,outdoorFrameMaterial,x,.06,z));

// Three lightweight ornamental plants. Repeated leaves, trunks, pots and lemons
// share four instanced meshes instead of becoming dozens of individual objects.
const plantPotMaterial=new THREE.MeshStandardMaterial({color:'#b8a48e',roughness:.92});
const plantStemMaterial=new THREE.MeshStandardMaterial({color:'#6d4c32',roughness:1});
const plantLeafMaterials=[new THREE.MeshStandardMaterial({color:'#397943',roughness:.96,flatShading:true}),new THREE.MeshStandardMaterial({color:'#57934d',roughness:.96,flatShading:true})];
const lemonMaterial=new THREE.MeshStandardMaterial({color:'#f2c62f',roughness:.7});
const plantPotGeometry=new THREE.CylinderGeometry(.24,.18,.42,14),plantStemGeometry=new THREE.CylinderGeometry(.025,.04,1,7),plantLeafGeometry=new THREE.IcosahedronGeometry(1,1),lemonGeometry=new THREE.SphereGeometry(1,10,7);
const plantData=[
 {x:3.47,z:8.34,scale:.86,tone:0,lemon:false},
 {x:.18,z:10.83,scale:1.00,tone:1,lemon:false}
];
const leafOffsets=[[0,1.18,0,.29,.35,.25],[-.20,.98,.03,.24,.28,.20],[.22,1.02,-.04,.25,.30,.21],[-.10,1.39,-.02,.23,.28,.20],[.13,1.34,.04,.22,.25,.19]];
plantData.forEach((plant,index)=>{
 const s=plant.scale;queueStaticInstance(plantPotGeometry,plantPotMaterial,plant.x,.21,plant.z,s,s,s);
 queueStaticInstance(plantStemGeometry,plantStemMaterial,plant.x,.76*s,plant.z,s,s,s,0,index*.7,0);
 leafOffsets.forEach(([dx,y,dz,sx,sy,sz],leafIndex)=>queueStaticInstance(plantLeafGeometry,plantLeafMaterials[(plant.tone+leafIndex)%2],plant.x+dx*s,y*s,plant.z+dz*s,sx*s,sy*s,sz*s,0,index*.65+leafIndex*.4,0));
 if(plant.lemon)[[-.18,1.12,.13],[.18,1.24,.10],[.02,1.42,-.13],[-.12,.91,-.15],[.20,.96,-.08]].forEach(([dx,y,dz])=>queueStaticInstance(lemonGeometry,lemonMaterial,plant.x+dx*s,y*s,plant.z+dz*s,.055*s,.07*s,.055*s));
});

// Bathrooms follow the supplied plans: Bath 1 has the full-width shower on the west side,
// while Bath 2 has a shower in its south-west corner.
const bathroomFixtures=new THREE.Group();model.add(bathroomFixtures);
const bathroomBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,bathroomFixtures);
const bathroomMetal=new THREE.MeshStandardMaterial({color:'#aeb8bc',roughness:.32,metalness:.68});
const bathroomMirror=new THREE.MeshStandardMaterial({color:'#bcd0d6',roughness:.12,metalness:.72});
const showerDrainMaterial=new THREE.MeshStandardMaterial({color:"#272d30",roughness:.55});
const showerGlass=new THREE.MeshPhysicalMaterial({color:'#c7e3eb',transparent:true,opacity:.26,roughness:.08,metalness:.05,depthWrite:false});
const sanitaryBodyGeometry=new THREE.CylinderGeometry(1,1,1,24),sanitaryRingGeometry=new THREE.TorusGeometry(1,.12,9,28),tapGeometry=new THREE.CylinderGeometry(1,1,1,12);
// Continuous ceramic profile: floor, pedestal, bowl, lip and inner basin share edges.
const sanitaryProfile=[[0,.012],[.56,.012],[.62,.045],[.60,.16],[.78,.24],[.97,.32],[1,.385],[.98,.415],[.84,.415],[.79,.36],[.52,.27],[0,.26]];
const connectedSanitaryGeometry=new THREE.LatheGeometry(sanitaryProfile.map(([r,y])=>new THREE.Vector2(r,y)),40);
const toiletSeatGeometry=new THREE.LatheGeometry([[.85,0],[1,0],[1,.022],[.98,.032],[.85,.032],[.85,0]].map(([r,y])=>new THREE.Vector2(r,y)),40);
function addSanitary(x,z,rotation=0,toilet=false){
 const sx=.19,sz=.29;
 queueStaticInstance(connectedSanitaryGeometry,ceramicMaterial,x,0,z,sx,1,sz,0,-rotation,0);
 const place=(dx,dz)=>[x+Math.cos(rotation)*dx-Math.sin(rotation)*dz,z+Math.sin(rotation)*dx+Math.cos(rotation)*dz];
 const fixtureBox=(w,h,d,mat,dx,y,dz)=>{const [px,pz]=place(dx,dz);const mesh=bathroomBox(w,h,d,mat,px,y,pz);mesh.rotation.y=-rotation;};
 if(toilet){
  queueStaticInstance(toiletSeatGeometry,applianceWhite,x,.413,z,sx,1,sz,0,-rotation,0);
  fixtureBox(.34,.40,.18,ceramicMaterial,0,.59,-.23);
  fixtureBox(.355,.025,.19,applianceWhite,0,.802,-.23);
  fixtureBox(.075,.008,.04,bathroomMetal,0,.818,-.23);
 }else{
  const [deckX,deckZ]=place(0,-.19);
  queueStaticInstance(sanitaryBodyGeometry,ceramicMaterial,deckX,.400,deckZ,.12,.032,.085,0,-rotation,0);
  queueStaticInstance(tapGeometry,bathroomMetal,x,.264,z,.023,.004,.023);
  const [tx,tz]=place(0,-.22);
  queueStaticInstance(tapGeometry,bathroomMetal,tx,.491,tz,.017,.16,.017);
  fixtureBox(.028,.024,.12,bathroomMetal,0,.567,-.172);
  const [px,pz]=place(0,-.12);
  queueStaticInstance(tapGeometry,bathroomMetal,px,.548,pz,.016,.035,.016);
 }
}
// Bath 1: recessed tub, towel warmer, bidet, toilet and vanity.
// Bath 1: 80 × 194 cm tray, fitted between the existing walls.
const showerStart=3.1704,showerEnd=5.1104,showerCenter=(showerStart+showerEnd)/2;
const showerBack=.012,showerFront=showerBack+.80;
bathroomBox(.80,.045,1.94,ceramicMaterial,showerBack+.40,.0285,showerCenter);
// Shallow perimeter lip and linear drain, all contained inside the tray footprint.
bathroomBox(.022,.012,1.94,ceramicMaterial,showerFront-.011,.057,showerCenter);
bathroomBox(.07,.003,.54,bathroomMetal,showerBack+.12,.052,showerCenter);
for(let i=0;i<9;i++)bathroomBox(.048,.0015,.006,showerDrainMaterial,showerBack+.12,.054,showerCenter-.23+i*.0575);
// Fixed end panels and sliding leaves shown open: 76 cm clear central entry.
for(const side of [-1,1]){
 const panelZ=showerCenter+side*.675;
 bathroomBox(.008,1.98,.574,showerGlass,showerFront-.025,1.055,panelZ);
 bathroomBox(.008,1.94,.48,showerGlass,showerFront-.044,1.055,showerCenter+side*.632);
 bathroomBox(.020,2.03,.024,bathroomMetal,showerFront-.025,1.065,side<0?showerStart+.012:showerEnd-.012);
 const handleZ=showerCenter+side*.402;
 bathroomBox(.015,.25,.015,bathroomMetal,showerFront+.012,1.05,handleZ);
 for(const y of [.932,1.168])bathroomBox(.038,.014,.014,bathroomMetal,showerFront-.003,y,handleZ);
}
for(const y of [.067,2.075])bathroomBox(.055,.026,1.94,bathroomMetal,showerFront-.028,y,showerCenter);
// Looking toward the window wall, its left side is toward increasing z.
const showerTapZ=4.70;
bathroomBox(.025,.18,.12,bathroomMetal,showerBack+.018,1.10,showerTapZ);
queueStaticInstance(tapGeometry,bathroomMetal,showerBack+.067,1.59,showerTapZ,.014,1.02,.014);
bathroomBox(.37,.022,.022,bathroomMetal,showerBack+.235,2.11,showerTapZ);
queueStaticInstance(tapGeometry,bathroomMetal,showerBack+.40,2.08,showerTapZ,.115,.022,.115);
queueStaticInstance(tapGeometry,showerDrainMaterial,showerBack+.40,2.067,showerTapZ,.106,.003,.106);
addSanitary(1.42,3.62,0,false);addSanitary(2.12,3.62,0,true);
// Bath 1 reference vanity: 120 x 48 cm, opposite the sanitary fixtures.
const vanityOak=new THREE.MeshStandardMaterial({color:'#ba925b',roughness:.7});
const vanityDark=new THREE.MeshStandardMaterial({color:'#393c38',roughness:.86});
const vanityBlack=new THREE.MeshStandardMaterial({color:'#222725',roughness:.48});
const vanityIvory=new THREE.MeshStandardMaterial({color:'#eee9d8',roughness:.24});
const vanityTowel=new THREE.MeshStandardMaterial({color:'#a65b39',roughness:1});
const vanityPrototype=new THREE.Group();bathroomFixtures.add(vanityPrototype);
const vanityBox=(w,h,d,mat,x,y,z)=>box(w,h,d,mat,x,y,z,vanityPrototype);
function vanityPart(geometry,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.set(rx,ry,rz);mesh.castShadow=mesh.receiveShadow=true;vanityPrototype.add(mesh);
}
// Floating lower drawer and two open cubbies; clear shelf beneath the oak top.
vanityBox(1.18,.045,.45,vanityDark,1.72,.20,4.85);
vanityBox(1.18,.045,.45,vanityDark,1.72,.57,4.85);
vanityBox(1.18,.35,.025,vanityDark,1.72,.385,5.06);
for(const x of [1.14,1.94,2.12,2.30])vanityBox(.025,.35,.45,vanityDark,x,.385,4.85);
vanityBox(.76,.32,.025,vanityDark,1.535,.385,4.615);
vanityBox(1.20,.065,.48,vanityOak,1.72,.81,4.84);
// Small rear supports keep the open shelf visually light.
for(const x of [1.20,2.24])vanityBox(.035,.21,.035,vanityBlack,x,.69,5.04);
vanityBox(.34,.055,.26,vanityTowel,1.36,.62,4.81);
// Hollow oval vessel, dark exterior and ivory interior; shared low-resolution profiles.
const vesselOuter=new THREE.LatheGeometry([
 new THREE.Vector2(0,0),new THREE.Vector2(.70,0),new THREE.Vector2(.93,.20),
 new THREE.Vector2(1,.65),new THREE.Vector2(.98,1),new THREE.Vector2(.94,1)
],40);
const vesselInner=new THREE.LatheGeometry([
 new THREE.Vector2(.94,1),new THREE.Vector2(.93,.66),new THREE.Vector2(.78,.27),
 new THREE.Vector2(0,.24)
],40);
vanityPart(vesselOuter,vanityBlack,1.72,.842,4.78,.30,.14,.195);
vanityPart(vesselInner,vanityIvory,1.72,.842,4.78,.30,.14,.195);

vanityPart(tapGeometry,vanityBlack,1.72,.985,5.025,.018,.285,.018);
vanityBox(.035,.025,.22,vanityBlack,1.72,1.12,4.935);
vanityPart(tapGeometry,vanityBlack,1.72,1.093,4.84,.017,.05,.017);
// Side towel rail, kept inside the cabinet footprint.
vanityBox(.22,.02,.025,vanityBlack,2.16,.765,4.595);
vanityBox(.025,.065,.11,vanityBlack,2.26,.788,4.64);
// 110 cm mirror, lower edge at 79 cm behind the oak top.
// Circular mirror and soft blue halo: no extra shadow map or per-frame reflection pass.
const mirrorHaloCanvas=document.createElement('canvas');mirrorHaloCanvas.width=mirrorHaloCanvas.height=128;
const haloCtx=mirrorHaloCanvas.getContext('2d'),haloGradient=haloCtx.createRadialGradient(64,64,46,64,64,64);
haloGradient.addColorStop(0,'rgba(105,185,255,.65)');haloGradient.addColorStop(.35,'rgba(105,185,255,.30)');haloGradient.addColorStop(1,'rgba(105,185,255,0)');
haloCtx.fillStyle=haloGradient;haloCtx.fillRect(0,0,128,128);
const haloMap=new THREE.CanvasTexture(mirrorHaloCanvas);haloMap.colorSpace=THREE.SRGBColorSpace;
const mirrorHalo=new THREE.Mesh(new THREE.PlaneGeometry(1.39,1.39),new THREE.MeshBasicMaterial({map:haloMap,transparent:true,depthWrite:false}));
mirrorHalo.position.set(1.72,1.34,5.097);mirrorHalo.rotation.y=Math.PI;vanityPrototype.add(mirrorHalo);
const mirrorEdge=new THREE.Mesh(new THREE.CircleGeometry(.565,64),new THREE.MeshBasicMaterial({color:'#91d5ff'}));
mirrorEdge.position.set(1.72,1.34,5.082);mirrorEdge.rotation.y=Math.PI;vanityPrototype.add(mirrorEdge);
const roundMirror=new THREE.Mesh(new THREE.CircleGeometry(.55,64),bathroomMirror);
roundMirror.position.set(1.72,1.34,5.076);roundMirror.rotation.y=Math.PI;vanityPrototype.add(roundMirror);
// Bath 2: vanity to the north, sanitary ware on the east wall and glass shower.
// Same vanity, rotated toward the room; 110 cm wide, unchanged 48 cm depth.
const bath2Vanity=vanityPrototype.clone(true);
const bath2WidthScale=1.10/1.20;
bath2Vanity.scale.x=bath2WidthScale;bath2Vanity.rotation.y=Math.PI;
bath2Vanity.position.set(6.66+1.72*bath2WidthScale,0,5.415+4.84);
// Keep the mirror perfectly circular when narrowing the cabinet.
for(const child of bath2Vanity.children)if(child.geometry===roundMirror.geometry||child.geometry===mirrorEdge.geometry||child.geometry===mirrorHalo.geometry)child.scale.x/=bath2WidthScale;
bathroomFixtures.add(bath2Vanity);
addSanitary(7.29,6.15,Math.PI/2,false);addSanitary(7.29,6.91,Math.PI/2,true);
bathroomBox(.84,.09,.84,ceramicMaterial,6.16,.055,7.47);

bathroomBox(.025,1.82,.90,showerGlass,6.57,.94,7.49);bathroomBox(.91,1.82,.025,showerGlass,6.115,.94,7.055);
bathroomBox(.035,1.86,.035,bathroomMetal,6.57,.96,7.04);bathroomBox(.035,1.86,.035,bathroomMetal,6.57,.96,7.94);
queueStaticInstance(tapGeometry,bathroomMetal,5.74,1.37,7.50,.025,.62,.025);bathroomBox(.08,.08,.08,bathroomMetal,5.73,1.68,7.50);bathroomBox(.34,.045,.045,bathroomMetal,5.90,1.68,7.50);queueStaticInstance(tapGeometry,bathroomMetal,6.08,1.64,7.50,.11,.025,.11);

// Main bedroom: a custom full-wall wardrobe and a double bed, leaving the
// south-west entrance clear. Lilac textiles echo the terrace upholstery.
const bedroomFurniture=new THREE.Group();model.add(bedroomFurniture);
const bedroomBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,bedroomFurniture);
const wardrobeMaterial=new THREE.MeshStandardMaterial({color:'#ded8cd',roughness:.82});
const wardrobeFrontMaterial=new THREE.MeshStandardMaterial({color:'#ece8df',roughness:.72});
const lilacBedding=new THREE.MeshStandardMaterial({color:'#c8addb',roughness:1});
const lilacAccent=new THREE.MeshStandardMaterial({color:'#a98bc1',roughness:1});
bedroomBox(.56,2.42,4.00,wardrobeMaterial,7.335,1.21,3.03);
for(let i=0;i<5;i++){const z=1.43+i*.80;bedroomBox(.025,2.22,.78,wardrobeFrontMaterial,7.04,1.18,z);bedroomBox(.025,.20,.025,bathroomMetal,7.02,1.18,z-.12);}
// The complete wall-to-footboard depth is 2.00 m: the headboard starts on the
// inner wall face and the shorter frame begins at its front edge.
const bedroomWallInnerX=point([409,54])[0]+.15/2,bedLength=2,headboardDepth=.18,bedFrameLength=bedLength-headboardDepth,bedFrameCenterX=bedroomWallInnerX+headboardDepth+bedFrameLength/2;
bedroomBox(headboardDepth,.95,1.88,wardrobeMaterial,bedroomWallInnerX+headboardDepth/2,.49,3.05);
bedroomBox(bedFrameLength,.25,1.68,wardrobeMaterial,bedFrameCenterX,.17,3.05);
bedroomBox(1.78,.25,1.60,applianceWhite,bedFrameCenterX,.39,3.05);
bedroomBox(1.35,.17,1.56,lilacBedding,bedroomWallInnerX+1.283,.59,3.05);
bedroomBox(.42,.17,.66,wardrobeFrontMaterial,4.76,.60,2.65);bedroomBox(.42,.17,.66,wardrobeFrontMaterial,4.76,.60,3.45);
bedroomBox(.18,.15,.42,lilacAccent,5.04,.71,2.65);bedroomBox(.18,.15,.42,lilacAccent,5.04,.71,3.45);
for(const z of [1.96,4.14]){bedroomBox(.43,.47,.43,wardrobeMaterial,4.76,.245,z);bedroomBox(.45,.035,.45,wardrobeFrontMaterial,4.76,.50,z);}
// Walnut fluted wall behind the unchanged headboard: texture relief, no slat meshes.
const bedroomPanelCanvas=document.createElement('canvas');bedroomPanelCanvas.width=512;bedroomPanelCanvas.height=256;
const panelCtx=bedroomPanelCanvas.getContext('2d');
panelCtx.fillStyle='#624530';panelCtx.fillRect(0,0,512,256);
for(let x=0;x<512;x++){
 const groove=x%8,shade=groove<2?-.32:groove===2?.20:Math.sin(x*1.7)*.055;
 panelCtx.fillStyle=`rgba(${shade>0?'225,184,134':'18,11,7'},${Math.abs(shade)})`;panelCtx.fillRect(x,0,1,256);
 for(let y=0;y<256;y+=4){panelCtx.fillStyle=`rgba(20,12,7,${.035+.025*Math.sin(x*.5+y*.12)})`;panelCtx.fillRect(x,y,1,3);}
}
const bedroomPanelMap=new THREE.CanvasTexture(bedroomPanelCanvas);bedroomPanelMap.colorSpace=THREE.SRGBColorSpace;
bedroomPanelMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const bedroomPanelMaterial=new THREE.MeshStandardMaterial({map:bedroomPanelMap,bumpMap:bedroomPanelMap,bumpScale:.002,roughness:.78});
bedroomBox(.024,1.68,3.30,bedroomPanelMaterial,bedroomWallInnerX+.012,.84,3.05);
const bedsideLampMaterial=new THREE.MeshStandardMaterial({color:'#fff1ce',emissive:'#ffd49a',emissiveIntensity:.8,roughness:.5});
const bedsideLights=[],bedsideHalos=[];
const bedsideGlowCanvas=document.createElement('canvas');bedsideGlowCanvas.width=bedsideGlowCanvas.height=128;
const bedsideCtx=bedsideGlowCanvas.getContext('2d'),bedsideGradient=bedsideCtx.createRadialGradient(64,64,5,64,64,64);
bedsideGradient.addColorStop(0,'rgba(255,195,101,.65)');bedsideGradient.addColorStop(.4,'rgba(255,177,75,.24)');bedsideGradient.addColorStop(1,'rgba(255,165,65,0)');
bedsideCtx.fillStyle=bedsideGradient;bedsideCtx.fillRect(0,0,128,128);
const bedsideGlowMap=new THREE.CanvasTexture(bedsideGlowCanvas);bedsideGlowMap.colorSpace=THREE.SRGBColorSpace;
const bedsideGlowMaterial=new THREE.MeshBasicMaterial({map:bedsideGlowMap,transparent:true,depthWrite:false});
const bedsideGlowGeometry=new THREE.PlaneGeometry(.62,.82);
for(const z of [1.96,4.14]){
 bedroomBox(.07,.065,.34,vanityBlack,bedroomWallInnerX+.062,1.12,z);
 bedroomBox(.012,.028,.30,bedsideLampMaterial,bedroomWallInnerX+.103,1.125,z);
 const glow=new THREE.Mesh(bedsideGlowGeometry,bedsideGlowMaterial);glow.rotation.y=Math.PI/2;glow.position.set(bedroomWallInnerX+.027,1.12,z);bedroomFurniture.add(glow);bedsideHalos.push(glow);
 const light=new THREE.PointLight('#ffd398',.45,1.5,2);light.position.set(bedroomWallInnerX+.20,1.14,z);light.userData.onIntensity=.45;bedsideLights.push(light);
}


// Measured double-corner kitchen: dimensions include fronts and worktops.
const kitchenFurniture=new THREE.Group();model.add(kitchenFurniture);
const kitchenBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,kitchenFurniture);
const kitchenBrown=new THREE.MeshStandardMaterial({color:'#c4a178',roughness:.74});
const kitchenFront=new THREE.MeshStandardMaterial({color:'#dad4c8',roughness:.88});
const kitchenCounter=new THREE.MeshStandardMaterial({color:'#49423a',roughness:.72});
const kitchenSteel=new THREE.MeshStandardMaterial({color:'#aeb5b6',roughness:.28,metalness:.72});
const diningFabric=new THREE.MeshStandardMaterial({color:'#85817c',roughness:1,side:THREE.DoubleSide});
// All cabinets share their exact footprints with the movement system.
for(const m of kitchenModules){
 const {x,z,w,d,tall,face}=m,h=tall?2.30:.90;
 if(['sink','dishwasher'].includes(m.id)){
  // Open carcass: no solid block intersecting the inset bowls.
  kitchenBox(w-.012,.035,d-.012,kitchenFront,x,.15,z);
  kitchenBox(.018,.72,d-.012,kitchenFront,x+w/2-.015,.51,z);
  // Only outer end panels; the two bowls straddle the internal module boundary.
  const endZ=m.id==='sink'?z-d/2+.015:z+d/2-.015;
  kitchenBox(w-.012,.72,.018,kitchenFront,x,.51,endZ);
 }else kitchenBox(w-.012,h-.12,d-.012,kitchenFront,x,.12+(h-.12)/2,z);
 kitchenBox(w-.08,.10,d-.08,furnitureBlack,x,.05,z);
 if(!tall&&!['sink','dishwasher'].includes(m.id))kitchenBox(w,.035,d,kitchenCounter,x,.9175,z);
 const front=(y,height,material=kitchenFront)=>face==='west'
  ?kitchenBox(.018,height,d-.026,material,x-w/2+.009,y,z)
  :kitchenBox(w-.026,height,.018,material,x,y,z+(face==='south'?1:-1)*(d/2-.009));
 if(m.id==='hob'){
  front(.22,.15);
  kitchenBox(.60,.52,.019,screenMaterial,x,.57,z-d/2+.0095);
  kitchenBox(.57,.025,.032,kitchenSteel,x,.77,z-d/2+.016);
 }else if(m.id==='oven'){
  front(.36,.46);front(1.02,.57,screenMaterial);front(1.59,.38,screenMaterial);front(2.075,.42);
  for(const y of [1.23,1.71])kitchenBox(w-.12,.025,.035,kitchenSteel,x,y,z-d/2-.005);
 }else if(tall){front(.51,.75,kitchenBrown);front(1.64,1.26,kitchenBrown);}
 else if(m.id==='window-return'){
  for(let i=0;i<2;i++)for(const y of [.27,.53,.79])kitchenBox(w/2-.018,.235,.018,kitchenFront,x-w/4+i*w/2,y,z-d/2+.009);
 }else if(m.id==='dishwasher'||m.id==='sink')front(.50,.75);
 else for(const y of [.27,.53,.79])front(y,.235);
}
// Cooking on the solid wall section, oven below; downdraft slot keeps the view open.
const hobModule=kitchenModules.find(m=>m.id==='hob');
kitchenBox(.72,.018,.48,screenMaterial,hobModule.x,.947,hobModule.z);
for(const [dx,dz,r] of [[-.18,-.12,.10],[.18,-.12,.10],[-.18,.12,.12],[.18,.12,.12]])queueStaticInstance(sanitaryRingGeometry,kitchenSteel,hobModule.x+dx,.959,hobModule.z+dz,r,r,.004,Math.PI/2,0,0);
kitchenBox(.48,.008,.035,furnitureBlack,hobModule.x,.959,hobModule.z+.20);
// Each basin is centered over one of the full-door cabinets; the drawer worktop is uncut.
const sinkBowlMaterial=new THREE.MeshStandardMaterial({color:'#69777a',roughness:.33,metalness:.65});
const sinkBowlGeometry=new THREE.LatheGeometry([[1.035,.006],[1,0],[.86,-.10],[.65,-.15],[0,-.15]].map(([r,y])=>new THREE.Vector2(r,y)),36);
// Split worktop around the openings, so the basin interiors are not covered by a slab.
for(const x of [8.9875,9.4825])kitchenBox(.105,.035,1.20,kitchenCounter,x,.9175,13.575);
for(const [start,end] of [[12.975,13.075],[13.475,13.675],[14.075,14.175]])kitchenBox(.39,.035,end-start,kitchenCounter,9.235,.9175,(start+end)/2);
const sinkTopShape=new THREE.Shape();sinkTopShape.moveTo(-.30,-.60);sinkTopShape.lineTo(.30,-.60);sinkTopShape.lineTo(.30,.60);sinkTopShape.lineTo(-.30,.60);sinkTopShape.closePath();
for(const z of [13.275,13.875]){const hole=new THREE.Path();hole.absellipse(0,13.575-z,.195,.20,0,Math.PI*2,true);sinkTopShape.holes.push(hole);}
const sinkTop=new THREE.Mesh(new THREE.ShapeGeometry(sinkTopShape,36),kitchenCounter);sinkTop.rotation.x=-Math.PI/2;sinkTop.position.set(9.235,.9355,13.575);sinkTop.castShadow=sinkTop.receiveShadow=true;kitchenFurniture.add(sinkTop);
for(const z of [13.275,13.875]){
 queueStaticInstance(sinkBowlGeometry,sinkBowlMaterial,9.235,.937,z,.195,1,.20);
 queueStaticInstance(tapGeometry,kitchenSteel,9.235,.791,z,.028,.006,.028);
}
queueStaticInstance(tapGeometry,kitchenSteel,9.46,1.10,13.575,.018,.32,.018);
kitchenBox(.25,.025,.025,kitchenSteel,9.345,1.25,13.575);
queueStaticInstance(tapGeometry,kitchenSteel,9.23,1.22,13.575,.018,.065,.018);
// Three 60 cm deep wall cabinets; recessed carcasses keep doors off coplanar surfaces.
for(const z of [12.675,13.275,13.875]){
 kitchenBox(.578,.80,.596,kitchenBrown,9.246,2.00,z);
 kitchenBox(.018,.772,.574,kitchenFront,8.944,2.00,z);
 // Handleless fronts, separated from the carcass by a 4 mm shadow gap.
}
// No wall units over either window. Warm wood fronts on the solid-wall refrigerator.

// Stone splash protection on the solid cooking and sink walls only.
kitchenBox(.90,.48,.018,kitchenCounter,hobModule.x,1.19,14.905);
kitchenBox(.018,.665,2.544,kitchenCounter,9.519,1.2675,13.647);
// Open-ended dining peninsula, 60 cm wide, with knee space and four tucked stools.
kitchenBox(peninsula.w,.055,peninsula.d,kitchenBrown,peninsula.x,.9075,peninsula.z);
kitchenBox(.045,.87,.045,furnitureBlack,peninsula.x,.435,peninsula.z-peninsula.d/2+.045);
const barRoundGeometry=new THREE.CylinderGeometry(1,1,1,32);
for(const {x,z} of peninsulaStools){
 queueStaticInstance(barRoundGeometry,diningFabric,x,.64,z,.22,.07,.22);
 queueStaticInstance(tapGeometry,furnitureBlack,x,.32,z,.026,.60,.026);
 queueStaticInstance(barRoundGeometry,furnitureBlack,x,.025,z,.18,.04,.18);
 queueStaticInstance(sanitaryRingGeometry,kitchenSteel,x,.23,z,.14,.14,.012,Math.PI/2,0,0);
}
// Round dark stone table, sculptural crossed pedestal and upholstered shell chairs.
const diningFurniture=new THREE.Group();model.add(diningFurniture);
const diningBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,diningFurniture);
const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=512;
const stoneCtx=stoneCanvas.getContext('2d');stoneCtx.fillStyle='#373a39';stoneCtx.fillRect(0,0,512,512);
for(let i=0;i<14;i++){stoneCtx.beginPath();for(let j=0;j<=32;j++){const x=j*16,y=i*47+Math.sin(j*.47+i)*14-j*3; j?stoneCtx.lineTo(x,y):stoneCtx.moveTo(x,y);}stoneCtx.strokeStyle='rgba(214,211,199,.24)';stoneCtx.lineWidth=i%3?.7:1.3;stoneCtx.stroke();}
const stoneMap=new THREE.CanvasTexture(stoneCanvas);stoneMap.colorSpace=THREE.SRGBColorSpace;
const diningStone=new THREE.MeshStandardMaterial({map:stoneMap,roughness:.48});
const roundGeometry=new THREE.CylinderGeometry(1,1,1,48);
queueStaticInstance(roundGeometry,diningStone,diningLayout.x,.76,diningLayout.z,.60,.045,.60);
queueStaticInstance(roundGeometry,furnitureBlack,diningLayout.x,.725,diningLayout.z,.575,.028,.575);
for(const angle of [-.62,.62]){
 const leg=new THREE.Mesh(new THREE.BoxGeometry(.14,.70,.68),furnitureBlack);
 leg.position.set(diningLayout.x,.36,diningLayout.z);leg.rotation.z=angle;leg.castShadow=leg.receiveShadow=true;diningFurniture.add(leg);
}
// Compact companion to the dining table: 60 cm diameter, 36 cm high.
const coffeeTableX=5.72,coffeeTableZ=9.55;
queueStaticInstance(roundGeometry,diningStone,coffeeTableX,.342,coffeeTableZ,.30,.036,.30);
queueStaticInstance(roundGeometry,furnitureBlack,coffeeTableX,.316,coffeeTableZ,.28,.018,.28);
for(const angle of [-.48,.48]){
 const leg=furnitureBox(.065,.295,.34,furnitureBlack,coffeeTableX,.168,coffeeTableZ);
 leg.rotation.z=angle;
}

const seatGeometry=new THREE.SphereGeometry(1,20,12);
const shellGeometry=new THREE.CylinderGeometry(.285,.255,.40,24,1,true,Math.PI/2,Math.PI);
for(const chair of diningChairs){
 const {x,z,angle}=chair;
 queueStaticInstance(seatGeometry,diningFabric,x,.48,z,.27,.075,.255,0,angle,0);
 queueStaticInstance(shellGeometry,diningFabric,x,.68,z,1,1,1,0,angle,0);
 for(const side of [-1,1])for(const end of [-1,1]){
  const dx=side*.19,dz=end*.17;
  queueStaticInstance(tapGeometry,furnitureBlack,x+Math.cos(angle)*dx+Math.sin(angle)*dz,.235,z-Math.sin(angle)*dx+Math.cos(angle)*dz,.024,.44,.024,0,angle,side*-.10);
 }
}

// Floor-to-ceiling built-in storage fills the dead end of the hall between the
// bathroom door jamb and the south partition. It stays clear of both openings.
const hallWardrobe=new THREE.Group();model.add(hallWardrobe);
const hallWardrobeBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,hallWardrobe);
// Fit every component inside the finished wall faces, with a 1 cm clearance.
const hallWardrobeMinZ=point([529,632])[1]+.05+.01,hallWardrobeMaxZ=point([529,742])[1]-.05-.01;
const hallWardrobeBack=point([529,632])[0]-.05-.01,hallWardrobeDepth=.55;
const hallWardrobeFront=hallWardrobeBack-hallWardrobeDepth,hallWardrobeCenterZ=(hallWardrobeMinZ+hallWardrobeMaxZ)/2;
const hallWardrobeWidth=hallWardrobeMaxZ-hallWardrobeMinZ;
hallWardrobeBox(hallWardrobeDepth-.04,2.48,hallWardrobeWidth,wardrobeMaterial,(hallWardrobeFront+.04+hallWardrobeBack)/2,1.24,hallWardrobeCenterZ);
for(const side of [-1,1]){
 const z=hallWardrobeCenterZ+side*hallWardrobeWidth/4;
 hallWardrobeBox(.025,2.30,hallWardrobeWidth/2-.008,wardrobeFrontMaterial,hallWardrobeFront+.0275,1.20,z);
 hallWardrobeBox(.015,.22,.025,bathroomMetal,hallWardrobeFront+.0075,1.20,z+.16);
}
hallWardrobeBox(hallWardrobeDepth,.08,hallWardrobeWidth,wardrobeFrontMaterial,(hallWardrobeFront+hallWardrobeBack)/2,2.52,hallWardrobeCenterZ);

// Two unchanged 102 × 64 cm stations facing the south wall.
const room3Furniture=new THREE.Group();model.add(room3Furniture);
const room3Box=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,room3Furniture);
const deskWood=new THREE.MeshStandardMaterial({color:'#d5ad78',roughness:.76});
const gamingUpholstery=new THREE.MeshStandardMaterial({color:'#252a2f',roughness:.9});
const gamingAccent=new THREE.MeshStandardMaterial({color:'#555c65',roughness:.88});
const laptopSilver=new THREE.MeshStandardMaterial({color:'#bfc5c7',roughness:.34,metalness:.68});
for(const [x,laptop] of [[.60,laptopSilver],[2.36,furnitureBlack]]){
 room3Box(1.02,.065,.64,deskWood,x,.75,7.88);
 for(const dx of [-.43,.43])for(const z of [7.63,8.13])room3Box(.045,.72,.045,furnitureBlack,x+dx,.37,z);
 room3Box(.50,.025,.38,laptop,x,.795,7.78);
 const screen=room3Box(.48,.32,.035,laptop,x,.96,7.96);screen.rotation.x=-.12;
 room3Box(.40,.25,.012,screenMaterial,x,.96,7.938).rotation.x=-.12;
 room3Box(.50,.12,.48,gamingUpholstery,x,.46,7.40);
 const back=room3Box(.56,.72,.16,gamingUpholstery,x,.84,7.14);back.rotation.x=.10;
 for(const dx of [-.29,.29])room3Box(.06,.08,.38,gamingAccent,x+dx,.67,7.38);
 queueStaticInstance(tapGeometry,furnitureBlack,x,.25,7.36,.05,.34,.05);
 room3Box(.07,.045,.62,furnitureBlack,x,.09,7.36);room3Box(.62,.045,.07,furnitureBlack,x,.09,7.36);
}
// Reading chair beside the west window, angled toward the east doorway.
const readingFabric=new THREE.MeshStandardMaterial({color:'#c8b599',roughness:1});
const readingChair=new THREE.Group();readingChair.position.set(.64,0,5.83);readingChair.rotation.y=Math.PI/3;room3Furniture.add(readingChair);
function readingCushion(w,h,d,x,y,z){const mesh=sofaSoftBox(w,h,d,readingFabric,x,y,z);readingChair.add(mesh);return mesh;}
readingCushion(.78,.24,.78,0,.27,0);
readingCushion(.60,.17,.61,0,.45,.05);
const readingBack=readingCushion(.76,.67,.18,0,.68,-.32);readingBack.rotation.x=-.10;
for(const x of [-.32,.32])readingCushion(.16,.38,.73,x,.49,.02);
for(const x of [-.27,.27])for(const z of [-.25,.27])box(.045,.18,.045,furnitureBlack,x,.10,z,readingChair);

const bathroomFixtureCount=bathroomFixtures.children.length,bedroomObjectCount=bedroomFurniture.children.length,kitchenObjectCount=kitchenFurniture.children.length,diningObjectCount=diningFurniture.children.length,hallWardrobeObjectCount=hallWardrobe.children.length,room3ObjectCount=room3Furniture.children.length,plantCount=plantData.length;
applyMaterialDetails({upholstery:[readingFabric,sofaFrameMaterial,sofaCushionMaterial,sofaAccentMaterial],fabric:[livingRugMaterial,vanityTowel,diningFabric,lilacBedding,lilacAccent,gamingUpholstery,gamingAccent],striped:stripedUpholstery,wood:[vanityOak,outdoorWoodMaterial,deskWood,kitchenBrown],metal:[bathroomMetal,kitchenSteel,laptopSilver,applianceTrim],glass:[glass,showerGlass]},renderer);
const assetInstanceStats=flushStaticInstances();

// Most architectural details and furniture share the same cube geometry. Batch
// opaque boxes by material so they render in a handful of draw calls while
// keeping transparent panes separate for correct depth sorting.
const furnitureObjectCount=furniture.children.length,utilityObjectCount=utilityFixtures.children.length,terraceObjectCount=terraceFurniture.children.length;
function batchStaticBoxes(root=model){
 root.updateMatrixWorld(true);
 const boxes=[];root.traverse(object=>{if(object.isMesh&&object.geometry===unitBoxGeometry&&!object.material.transparent)boxes.push(object);});
 const groups=new Map();for(const mesh of boxes){const key=mesh.material.uuid;if(!groups.has(key))groups.set(key,{material:mesh.material,meshes:[]});groups.get(key).meshes.push(mesh);}
 const rootInverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4();
 for(const {material,meshes} of groups.values()){
  const instances=new THREE.InstancedMesh(unitBoxGeometry,material,meshes.length);instances.name='static-box-batch';instances.castShadow=true;instances.receiveShadow=true;
  meshes.forEach((mesh,index)=>{matrix.multiplyMatrices(rootInverse,mesh.matrixWorld);instances.setMatrixAt(index,matrix);mesh.parent.remove(mesh);});
  instances.instanceMatrix.needsUpdate=true;instances.computeBoundingBox();instances.computeBoundingSphere();root.add(instances);
 }
 return {boxes:boxes.length,batches:groups.size};
}
applyKitchenMaterials({wood:kitchenBrown,stone:kitchenCounter,front:kitchenFront},renderer);
const batchedBoxes=batchStaticBoxes();

const roof=polygonMesh(footprint,new THREE.MeshStandardMaterial({color:'#faf9f3',side:THREE.DoubleSide,roughness:1}),HEIGHT);
model.remove(roof);ceiling.add(roof);
roof.castShadow=true;roof.material.shadowSide=THREE.DoubleSide;
// Thin clear panes transmit direct sunlight; opaque frames still cast shadows.
// Standard shadow maps otherwise treat even nearly transparent glass as opaque.
model.traverse(object=>{if(object.isMesh&&object.material.transparent)object.castShadow=false;});
// Fixed world-space sun: negative X is left and negative Z is up in the plan.
// Parallel rays approximate a distant sun, 34 degrees above the horizon.
const skylight=new THREE.HemisphereLight('#e4f1ff','#b9ad94',.8);scene.add(skylight);
const sunlight=new THREE.DirectionalLight('#fff1d6',3);
sunlight.target.position.set(4.5,0,7.5);
sunlight.position.copy(sunlight.target.position).add(new THREE.Vector3(-24,19,-14));
sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
Object.assign(sunlight.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:90});
sunlight.shadow.bias=-.00008;sunlight.shadow.normalBias=.012;
scene.add(sunlight,sunlight.target);
// Low-cost fill approximates indirect bounce, without washing out window light.
const interiorLights=new THREE.Group();scene.add(interiorLights);
interiorLights.add(...bedsideLights);
for(const r of rooms){if(r.id==='terrace')continue;const [x,z]=point(r.at);const light=new THREE.PointLight('#fff7eb',1.8,8,2);light.position.set(x,2.3,z);interiorLights.add(light);}
const sunDateInput=$('#sun-date'),sunTimeInput=$('#sun-time'),sunStatus=$('#sun-status');
sunDateInput.value=romeDate();
let solarPending=false,currentSun=null;
function updateDaylight(){
 if(!sunDateInput.value||!sunDateInput.checkValidity())return;
 const minutes=Number(sunTimeInput.value);currentSun=solarPosition(sunDateInput.value,minutes);
 const elevation=currentSun.altitude*180/Math.PI,daylight=THREE.MathUtils.clamp(Math.sin(currentSun.altitude)*2.5,0,1);
 sunlight.position.copy(sunlight.target.position).addScaledVector(new THREE.Vector3(...currentSun.direction),40);
 sunlight.updateMatrix();sunlight.updateMatrixWorld(true);
 sunlight.intensity=3*daylight;sunlight.color.set(elevation<12?'#ffd2a1':'#fff1d6');
 skylight.intensity=.12+.68*daylight;
 const twilight=THREE.MathUtils.clamp((elevation+8)/20,0,1);
 scene.background.set('#192b45').lerp(new THREE.Color('#9dd8f5'),twilight);
 scene.fog.color.set('#25364b').lerp(new THREE.Color('#b8dff2'),twilight);
 $('#sun-time-value').textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
 const compass=['N','NE','E','SE','S','SO','O','NO'][Math.round(currentSun.azimuth/45)%8];
 sunStatus.textContent=elevation>0?`Sole da ${compass} · altezza ${elevation.toFixed(0)}°`:'Sole sotto l’orizzonte';
 renderer.shadowMap.needsUpdate=true;renderState.invalidate();
}
sunDateInput.oninput=sunTimeInput.oninput=()=>{solarPending=true;};
$('#interior-lights').onchange=e=>{for(const light of interiorLights.children)light.intensity=e.target.checked?(light.userData.onIntensity??1.8):0;bedsideLampMaterial.emissiveIntensity=e.target.checked?.8:0;for(const halo of bedsideHalos)halo.visible=e.target.checked;renderState.invalidate();};
const grassTexture=makeGrassTexture();
const grassMaterial=new THREE.MeshStandardMaterial({color:'#f2f8ec',map:grassTexture,bumpMap:grassTexture,bumpScale:.002,roughness:1});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),grassMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=GROUND_Y;ground.receiveShadow=true;scene.add(ground);

const {landscape,mountains,clouds,grass,treeCount,mountainCount,cloudCount,grassCount}=createLandscape(scene,GROUND_Y,footprint,insidePolygon,isTouch);

const overheadVolumes=architecturalVolumes.filter(v=>v.min[1]>0);
const movement=createMovement(canWalk,(x,z,eye)=>{
 let ceilingHeight=HEIGHT;
 for(const v of overheadVolumes)if(x+.18>v.min[0]&&x-.18<v.max[0]&&z+.18>v.min[2]&&z-.18<v.max[2])ceilingHeight=Math.min(ceilingHeight,v.min[1]);
 return Math.max(0,ceilingHeight-eye-.12);
});
let view='orbit',selected=null,eyeHeight=DEFAULT_EYE_HEIGHT,yaw=0,pitch=0,walkActive=false;
let measuring=false,measurePoints=[],measurementGroup=new THREE.Group();scene.add(measurementGroup);
const map=$('#minimap');const ns='http://www.w3.org/2000/svg';
const svg=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
map.append(svg('polygon',{points:footprint.map(p=>p.join(',')).join(' '),fill:'#e2e8eb'}));
const mapRooms=new Map();for(const room of rooms){const p=svg('polygon',{points:room.polygon.map(p=>p.join(',')).join(' '),fill:'#f7f8f7',stroke:'#ccd7dc','stroke-width':5});mapRooms.set(room.id,p);map.append(p);}
for(const w of walls){let cursor=0;const len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);const add=(s,e)=>map.append(svg('line',{x1:w.a[0]+(w.b[0]-w.a[0])*s/len,y1:w.a[1]+(w.b[1]-w.a[1])*s/len,x2:w.a[0]+(w.b[0]-w.a[0])*e/len,y2:w.a[1]+(w.b[1]-w.a[1])*e/len,stroke:'#617583','stroke-width':w.t*SCALE}));for(const o of w.open??[]){add(cursor,o.s);cursor=o.e;}add(cursor,len);}
const mapMarker=svg('g',{});mapMarker.append(svg('path',{d:'M 0 -62 L -35 -10 L 35 -10 Z',fill:'#3a7fad',opacity:.3}));mapMarker.append(svg('circle',{r:18,fill:'#315c78',stroke:'white','stroke-width':7}));map.append(mapMarker);mapMarker.style.display='none';
for(const room of rooms){
 const button=document.createElement('button');button.className='room-button';button.textContent=room.name;button.title=room.detail;button.dataset.room=room.id;button.onclick=()=>selectRoom(room.id);$('#room-list').append(button);
 const label=document.createElement('button');label.type='button';label.className='room-label';label.setAttribute('aria-label',`Inquadra ${room.name}`);label.onclick=()=>selectRoom(room.id);label.textContent=room.name==='Camera matrimoniale'?'Matrimoniale':room.name;$('#labels').append(label);labelElements.set(room.id,label);
}
function updateSelection(id){selected=id;for(const b of document.querySelectorAll('.room-button'))b.classList.toggle('selected',b.dataset.room===id);for(const [key,p]of mapRooms)p.setAttribute('fill',key===id?'#b6d1e2':'#f7f8f7');for(const[key,l]of labelElements)l.classList.toggle('selected',key===id);$('#current-room').textContent=rooms.find(r=>r.id===id)?.name??'Intero appartamento';}
function selectRoom(id){const room=rooms.find(r=>r.id===id);if(!room)return;updateSelection(id);const[x,z]=view==='walk'?safeRoomPosition(room):point(room.at);if(view==='walk'){resetMovement();perspective.position.set(x,eyeHeight,z);yaw=0;pitch=0;applyLook();}else if(view==='orbit'){const offset=perspective.position.clone().sub(controls.target).normalize().multiplyScalar(12);controls.target.set(x,0,z);perspective.position.copy(controls.target).add(offset);controls.update();}else{orthographic.position.set(x,24,z+.001);orthographic.lookAt(x,0,z);orthographic.zoom=1.6;orthographic.updateProjectionMatrix();}if(isTouch){$('#panel').classList.remove('open');$('#panel-toggle').setAttribute('aria-expanded','false');}}
let viewportWidth=0,viewportHeight=0;
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;viewportWidth=w;viewportHeight=h;renderState.invalidate();renderer.setSize(w,h);perspective.aspect=w/h;perspective.updateProjectionMatrix();const half=9;orthographic.left=-half*w/h;orthographic.right=half*w/h;orthographic.top=half;orthographic.bottom=-half;orthographic.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);
function applyRenderProfile(mode){
 const next=Math.min(devicePixelRatio,mode==='walk'?1.35:1.75);
 if(Math.abs(next-renderPixelRatio)<.01)return;
 renderPixelRatio=next;renderer.setPixelRatio(renderPixelRatio);resize();
}
function resetOverview(){controls.target.set(4.6,0,7.35);const widthRatio=Math.max(1,1.03/(host.clientWidth/host.clientHeight));perspective.position.set(4.6+12*widthRatio,17*widthRatio,7.35+16*widthRatio);controls.update();}
function resetPlan(){orthographic.position.set(4.8,24,7.4);orthographic.up.set(0,0,-1);orthographic.lookAt(4.8,0,7.4);orthographic.zoom=Math.min(.80,(host.clientWidth/host.clientHeight)*1.5);orthographic.updateProjectionMatrix();}
function applyLook(){perspective.rotation.order='YXZ';perspective.rotation.set(pitch,yaw,0);}
function resetMovement(){keys.clear();touchKeys.clear();movement.reset();drag=null;if(view==='walk')perspective.position.y=eyeHeight;}
function stopWalk(){walkActive=false;resetMovement();$('#enter-walk').hidden=view!=='walk';$('#crosshair').hidden=true;if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();}
function setView(mode){
 if(!['orbit','plan','walk'].includes(mode))return;
 stopWalk();if(measuring)toggleMeasure(false);view=mode;$('#viewer').classList.toggle('walk-mode',view==='walk');
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view);});
 const showCeiling=view==='walk';
 if(ceiling.visible!==showCeiling){ceiling.visible=showCeiling;renderer.shadowMap.needsUpdate=true;}
 renderState.invalidate();
 controls.enabled=view==='orbit';camera=view==='plan'?orthographic:perspective;
 clouds.visible=view!=='plan';mountains.visible=view!=='plan';grass.visible=view!=='plan';
 applyRenderProfile(view);
 perspective.fov=view==='walk'?65:43;perspective.updateProjectionMatrix();
 $('#measure').disabled=view==='walk';$('#touch-controls').hidden=!(view==='walk'&&isTouch);
 $('#enter-walk').hidden=view!=='walk'||isTouch;
 $('#view-title').textContent=view==='walk'?'A casa, un passo alla volta.':view==='plan'?'Ogni ambiente, al suo posto.':'Uno spazio tutto da immaginare.';
 $('#view-help').textContent=view==='walk'?(isTouch?'Frecce · Salta · Tieni premuto Corri · Trascina per guardare':'WASD / frecce · Shift per correre · Spazio per saltare · Esc per pausa'):view==='plan'?'Rotella per lo zoom · Seleziona una stanza a destra':isTouch?'Un dito per ruotare · Due dita per zoom e spostamento':'Trascina per ruotare · Rotella per avvicinarti';
 if(view==='orbit')resetOverview();else if(view==='plan')resetPlan();else{const r=rooms.find(r=>r.id===selected)??rooms[0];const[x,z]=safeRoomPosition(r);perspective.position.set(x,eyeHeight,z);yaw=.3;pitch=0;applyLook();updateSelection(r.id);walkActive=isTouch;}
 mapMarker.style.display=view==='walk'?'':'none';
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#reset').onclick=()=>{updateSelection(null);setView(view);};
function activateWalk(){if(view!=='walk'||document.hidden)return;walkActive=true;$('#enter-walk').hidden=true;$('#crosshair').hidden=false;renderer.domElement.focus({preventScroll:true});}
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Visita 3D: WASD o frecce, Shift per correre, Spazio per saltare, Esc per pausa');
$('#enter-walk').onclick=async()=>{
 activateWalk();
 try{await renderer.domElement.requestPointerLock();if(view!=='walk'&&document.pointerLockElement===renderer.domElement)document.exitPointerLock();}
 catch{if(view==='walk'&&walkActive)$('#view-help').textContent='Trascina per guardare · WASD / frecce · Shift per correre · Spazio per saltare · Esc per pausa';}
};
document.addEventListener('pointerlockchange',()=>{
 if(document.pointerLockElement===renderer.domElement){if(view==='walk')activateWalk();else document.exitPointerLock();}
 else if(view==='walk')stopWalk();
});
const keys=new Set(),touchKeys=new Set();
window.addEventListener('keydown',e=>{
 if(view!=='walk'||!walkActive)return;
 if(e.code==='Escape'){e.preventDefault();stopWalk();return;}
 if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,select,textarea,button,[contenteditable="true"]'))return;
 if(movementCodes.has(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)movement.jump();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{if(view==='walk')stopWalk();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&view==='walk')stopWalk();});
document.addEventListener('focusin',e=>{if(e.target!==renderer.domElement)resetMovement();});
function rotateLook(dx,dy,sensitivity){
 const safeX=THREE.MathUtils.clamp(Number.isFinite(dx)?dx:0,-90,90),safeY=THREE.MathUtils.clamp(Number.isFinite(dy)?dy:0,-90,90);
 yaw=THREE.MathUtils.euclideanModulo(yaw-safeX*sensitivity+Math.PI,Math.PI*2)-Math.PI;
 pitch=THREE.MathUtils.clamp(pitch-safeY*sensitivity,-1.35,1.35);applyLook();
}
document.addEventListener('mousemove',e=>{if(view==='walk'&&document.pointerLockElement===renderer.domElement)rotateLook(e.movementX,e.movementY,.002);});
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(view==='walk'&&walkActive&&document.pointerLockElement!==renderer.domElement){renderer.domElement.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||view!=='walk')return;rotateLook(e.clientX-drag.x,e.clientY-drag.y,.004);drag={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);renderer.domElement.addEventListener('lostpointercapture',()=>drag=null);
const moveCodes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',run:'ShiftLeft'};
for(const b of document.querySelectorAll('[data-move]')){
 b.onpointerdown=e=>{if(view!=='walk')return;e.preventDefault();activateWalk();b.setPointerCapture(e.pointerId);if(b.dataset.move==='jump')movement.jump();else touchKeys.add(moveCodes[b.dataset.move]);};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>touchKeys.delete(moveCodes[b.dataset.move]);
}
const activeKeys=new Set();
function move(dt){
 if(view!=='walk'||!walkActive)return;
 activeKeys.clear();for(const key of keys)activeKeys.add(key);for(const key of touchKeys)activeKeys.add(key);
 movement.update(dt,activeKeys,yaw,perspective.position,eyeHeight);
}
$('#tile-size').onchange=e=>{tileSize=Number(e.target.value);floorMaterial.map.repeat.set(1/tileSize,1/tileSize);renderState.invalidate();};
$('#eye-height').oninput=e=>{eyeHeight=Number(e.target.value);$('#eye-value').textContent=eyeHeight.toFixed(2).replace('.',',')+' m';resetMovement();};
$('#panel-toggle').onclick=()=>{const open=$('#panel').classList.toggle('open');$('#panel-toggle').setAttribute('aria-expanded',open);};

function clearMeasurements(){for(const child of [...measurementGroup.children]){child.geometry?.dispose();child.material?.dispose();measurementGroup.remove(child);}measurePoints=[];}
function toggleMeasure(on=!measuring){measuring=on;$('#measure').classList.toggle('active',on);$('#measure').setAttribute('aria-pressed',on);controls.enabled=view==='orbit'&&!on;$('#measure-result').hidden=!on;$('#measure-result').textContent='Seleziona due punti sul pavimento';renderer.domElement.style.cursor=on?'crosshair':'';clearMeasurements();}
$('#measure').onclick=()=>toggleMeasure();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',e=>{if(!measuring)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(floorObjects)[0];if(!hit)return;if(measurePoints.length===2)clearMeasurements();const p=hit.point.clone();p.y=.055;measurePoints.push(p);const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color:'#286eaa',depthTest:false,depthWrite:false}));dot.position.copy(p);dot.renderOrder=10;measurementGroup.add(dot);if(measurePoints.length===1){$('#measure-result').textContent='Seleziona il secondo punto';return;}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(measurePoints),new THREE.LineBasicMaterial({color:'#286eaa',depthTest:false,depthWrite:false}));line.renderOrder=10;measurementGroup.add(line);const dist=measurePoints[0].distanceTo(measurePoints[1]);$('#measure-result').textContent=dist.toFixed(2).replace('.',',')+' m · Clicca per una nuova misura';});
renderer.domElement.addEventListener('wheel',e=>{if(view==='plan'){e.preventDefault();orthographic.zoom=THREE.MathUtils.clamp(orthographic.zoom*Math.exp(-e.deltaY*.001),.45,4);orthographic.updateProjectionMatrix();}},{passive:false});

// Cache DOM references and metric positions; neither changes between frames.
const showLabelsInput=$('#show-labels'),performanceToggle=$('#performance-toggle'),performanceOverlay=$('#performance-overlay');
const performanceText=$('#performance-values');
const labelAnchors=rooms.map(room=>({room,el:labelElements.get(room.id),at:point(room.label)}));
let showPerformance=false;
performanceToggle.onclick=()=>{showPerformance=!showPerformance;performanceToggle.setAttribute('aria-pressed',String(showPerformance));performanceOverlay.hidden=!showPerformance;updatePerformanceText();};
// UI mutations can change pixels without moving the camera (tiles, labels, ruler).
for(const event of ['input','change','click'])document.addEventListener(event,()=>renderState.invalidate());
document.addEventListener('visibilitychange',()=>{last=performance.now();perfWindowStart=last;perfFrames=0;cpuTotal=0;renderState.invalidate();});
renderer.domElement.addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;renderState.invalidate();});
let last=performance.now(),lastRoomTime=0,perfWindowStart=last,perfFrames=0,currentFps=0;
let cpuTotal=0,cpuRenderMs=0,lastRenderedAt=0,renderedFrames=0,idle=true;
const projected=new THREE.Vector3();
function updatePerformanceText(){
 if(!showPerformance)return;
 performanceText.textContent=`${idle?'A riposo · nessun ridisegno':currentFps.toFixed(0)+' FPS'}\n${renderer.info.render.calls} draw call · ${renderer.info.render.triangles.toLocaleString('it-IT')} triangoli\nCPU invio frame: ${cpuRenderMs.toFixed(1)} ms`;
}
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(document.hidden)return;
 if(view==='orbit'&&controls.enabled)controls.update();
 move(dt);
 if(solarPending){solarPending=false;updateDaylight();}
 if(renderState.consume(camera)){
  const renderStart=performance.now();
  const labelElevation=(perspective.position.y-controls.target.y)/perspective.position.distanceTo(controls.target);
  const showLabels=view!=='walk'&&(view==='plan'||labelElevation>.28)&&showLabelsInput.checked;
  for(const {room,el,at:[x,z]} of labelAnchors){
   const compactHidden=viewportWidth<600&&['hall','bath1','bath2','utility'].includes(room.id)&&selected!==room.id;
   el.hidden=!showLabels||compactHidden;if(el.hidden)continue;
   projected.set(x,.06,z).project(camera);el.hidden=projected.z>1||projected.z< -1;
   el.style.left=((projected.x*.5+.5)*viewportWidth)+'px';el.style.top=((-projected.y*.5+.5)*viewportHeight)+'px';
  }
  if(view==='walk'){
   const p=perspective.position;mapMarker.setAttribute('transform',`translate(${p.x*SCALE+42} ${p.z*SCALE+54}) rotate(${-yaw*180/Math.PI})`);
  }
  renderer.render(scene,camera);
  cpuTotal+=performance.now()-renderStart;perfFrames++;renderedFrames++;lastRenderedAt=now;
 }
 if(view==='walk'&&now-lastRoomTime>300){const p=perspective.position,room=rooms.find(r=>insidePolygon(p.x,p.z,r.polygon));if(room&&room.id!==selected)updateSelection(room.id);lastRoomTime=now;}
 if(now-perfWindowStart>=1000){
  currentFps=perfFrames*1000/(now-perfWindowStart);cpuRenderMs=perfFrames?cpuTotal/perfFrames:0;idle=now-lastRenderedAt>250;
  perfFrames=0;cpuTotal=0;perfWindowStart=now;
  renderer.domElement.dataset.fps=currentFps.toFixed(1);renderer.domElement.dataset.renderedFrames=String(renderedFrames);renderer.domElement.dataset.idle=String(idle);
  renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
  renderer.domElement.dataset.cameraPosition=perspective.position.toArray().map(n=>n.toFixed(4)).join(',');renderer.domElement.dataset.cameraAngles=`${yaw.toFixed(4)},${pitch.toFixed(4)}`;
  updatePerformanceText();
 }
}
// The house, landscape and furniture are static: render their shadow map once
// instead of rebuilding a 2048px map on every frame while walking.
// Entering/leaving the cutaway view refreshes it once for the ceiling change.
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
// The ruler remains dynamic; architecture, scenery and lights have fixed transforms.
let frozenTransformCount=0;
for(const root of scene.children)if(root!==measurementGroup)frozenTransformCount+=freezeStaticTransforms(root);
scene.updateMatrix();scene.matrixAutoUpdate=false;
updateDaylight();resize();setView('orbit');renderer.compile(scene,perspective);renderer.compile(scene,orthographic);requestAnimationFrame(animate);
// Small read-only diagnostics and deterministic spatial queries for validation.
window.houseModel={get state(){return {view,selected,height:HEIGHT,sunDirection:currentSun?.direction,sunElevation:currentSun?currentSun.altitude*180/Math.PI:0,sunAzimuth:currentSun?.azimuth,solarDate:sunDateInput.value,solarMinutes:Number(sunTimeInput.value),ceilingShadows:ceiling.visible,tileSize,eyeHeight,jumpHeight:movement.jumpHeight,walkActive,position:perspective.position.toArray(),yaw,pitch,wallCount:walls.length,colliderCount:collisionWalls.length+furnitureColliders.length,nightRoomIds:[...nightRoomIds],ground:'grass',parquetRoomIds:[...parquetRoomIds],nightFloor:'stoneware-with-bedroom-parquet',livingFloor:'dark-stoneware',bathroomFloor:'dark-stoneware',furniture:'living-sectional-tv-utility-terrace-bathrooms-bedrooms-plants-kitchen-dining-and-hall-wardrobe',sofaLength:2.25,chaiseLength:1.30,bedLength,furnitureObjectCount,utilityObjectCount,terraceObjectCount,bathroomFixtureCount,bedroomObjectCount,kitchenObjectCount,diningObjectCount,hallWardrobeObjectCount,room3ObjectCount,plantCount,lemonPlantCount:0,treeCount,mountainCount,cloudCount,grassCount};},get performance(){return {fps:Number(currentFps.toFixed(1)),idle,renderedFrames,cpuRenderMs,frozenTransformCount,wallVertexStats,pixelRatio:renderPixelRatio,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,staticShadowMap:renderer.shadowMap.autoUpdate===false,batchedBoxes,assetInstanceStats};},canStand:canWalk,rooms:rooms.map(r=>({id:r.id,at:safeRoomPosition(r)}))};
