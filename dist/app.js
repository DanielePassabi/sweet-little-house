import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { point, SCALE, HEIGHT, rooms, nightRoomIds, nightFloorPolygon, walls, railings, footprint, insidePolygon, canStand, collisionWalls } from './model.js?v=20260915-1';
import { wallVolumes, unionSurface } from './wall-geometry.js?v=20260915-1';

import { createLandscape } from './landscape.js?v=20260915-3';

import { createMovement, DEFAULT_EYE_HEIGHT, movementCodes } from './movement.js?v=20260915-1';

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
const floorMaterial=new THREE.MeshStandardMaterial({color:'#e5e4df',roughness:.88});

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
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/3.2,1/3.2);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
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
const parquetFloor=polygonMesh(nightFloorPolygon,parquetMaterial,.006);floorObjects.push(parquetFloor);
const bathroomTileMaterial=new THREE.MeshStandardMaterial({color:'#b8b9b5',map:floorMaterial.map,roughness:.92});
// Extend bathroom finishes beneath the wall centre-lines so no parquet sliver
// can appear between the room polygons and their partitions.
const bathroomFloorPolygons={bath1:[[30,320],[270,320],[270,498],[30,498]],bath2:[[529,493],[712,493],[712,742],[529,742]]};
const bathroomFloors=rooms.filter(room=>['bath1','bath2'].includes(room.id)).map(room=>polygonMesh(bathroomFloorPolygons[room.id],bathroomTileMaterial,.012));
floorObjects.push(...bathroomFloors);
for(const [material,layer] of [[terraceFloor.material,1],[parquetMaterial,2],[bathroomTileMaterial,3]]){material.polygonOffset=true;material.polygonOffsetFactor=-layer;material.polygonOffsetUnits=-layer;}
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
wallSurface.faces.forEach((positions,i)=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.computeVertexNormals();
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
const sofaFrameMaterial=new THREE.MeshStandardMaterial({color:'#34383b',roughness:.94});
const sofaCushionMaterial=new THREE.MeshStandardMaterial({color:'#444a4e',roughness:1});
const sofaAccentMaterial=new THREE.MeshStandardMaterial({color:'#555c60',roughness:1});
const furnitureBlack=new THREE.MeshStandardMaterial({color:'#141719',roughness:.72});
const consoleFrontMaterial=new THREE.MeshStandardMaterial({color:'#222629',roughness:.82});
const screenMaterial=new THREE.MeshStandardMaterial({color:'#071015',emissive:'#1d323c',emissiveIntensity:.24,roughness:.2,metalness:.18});
const furnitureBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,furniture);

// Three modules over 2.25 m: a chaise and two seats, facing west toward the TV.
furnitureBox(1.08,.32,2.25,sofaFrameMaterial,6.91,.20,9.23);
furnitureBox(.24,.72,2.27,sofaFrameMaterial,7.37,.61,9.23);
[8.48,9.22,9.96].forEach(z=>{
 const back=furnitureBox(.25,.52,.76,sofaCushionMaterial,7.19,.75,z);back.rotation.z=-.055;
});
[9.22,9.96].forEach(z=>furnitureBox(.84,.17,.68,sofaCushionMaterial,6.77,.45,z));
// Chaise at the north end creates the L shown in the supplied sketch.
furnitureBox(1.30,.32,.75,sofaFrameMaterial,6.41,.20,8.48);
furnitureBox(1.08,.17,.60,sofaCushionMaterial,6.36,.45,8.48);
furnitureBox(.20,.56,.76,sofaFrameMaterial,5.735,.45,8.48);
furnitureBox(.88,.56,.20,sofaFrameMaterial,6.91,.45,10.40);
// A pair of soft accent cushions breaks up the dark upholstery.
const cushionA=furnitureBox(.18,.44,.46,sofaAccentMaterial,6.76,.73,8.25);cushionA.rotation.z=-.12;cushionA.rotation.y=.12;
const cushionB=furnitureBox(.18,.42,.42,sofaAccentMaterial,6.69,.72,10.14);cushionB.rotation.z=-.08;cushionB.rotation.y=-.10;
[[6.53,8.15],[7.27,8.15],[6.53,10.30],[7.27,10.30],[5.84,8.18]].forEach(([x,z])=>furnitureBox(.08,.12,.08,furnitureBlack,x,.06,z));

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

// Outdoor terrace set: a square table with two opposing chairs and a striped
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
// Central 85 cm square table.
const terraceSetCenterX=1.275;
terraceBox(.85,.08,.85,outdoorWoodMaterial,terraceSetCenterX,.72,12.25);
[[.925,11.90],[1.625,11.90],[.925,12.60],[1.625,12.60]].forEach(([x,z])=>terraceBox(.055,.68,.055,outdoorFrameMaterial,x,.35,z));
function addTerraceChair(z,facingSouth){
 terraceBox(.52,.09,.52,outdoorWoodMaterial,terraceSetCenterX,.47,z);
 const backZ=z+(facingSouth?-.25:.25);
 terraceBox(.52,.58,.07,outdoorFrameMaterial,terraceSetCenterX,.76,backZ);
 for(const x of [1.065,1.485])for(const dz of [-.20,.20])terraceBox(.045,.44,.045,outdoorFrameMaterial,x,.23,z+dz);
}
addTerraceChair(11.43,true);addTerraceChair(13.07,false);
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

// Bathrooms follow the supplied plans: Bath 1 has the tub on the west side,
// while Bath 2 has a shower in its south-west corner.
const bathroomFixtures=new THREE.Group();model.add(bathroomFixtures);
const bathroomBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,bathroomFixtures);
const bathroomMetal=new THREE.MeshStandardMaterial({color:'#aeb8bc',roughness:.32,metalness:.68});
const bathroomMirror=new THREE.MeshStandardMaterial({color:'#bcd0d6',roughness:.12,metalness:.72});
const bathWater=new THREE.MeshPhysicalMaterial({color:'#b9dce9',transparent:true,opacity:.56,roughness:.16,depthWrite:false});
const sanitaryBodyGeometry=new THREE.CylinderGeometry(1,1,1,24),sanitaryRingGeometry=new THREE.TorusGeometry(1,.12,9,28),tapGeometry=new THREE.CylinderGeometry(1,1,1,12);
function addSanitary(x,z,rotation=0,toilet=false){
 const sideways=Math.abs(Math.sin(rotation))>.5,sx=sideways ? .33 : .23,sz=sideways ? .23 : .33;
 queueStaticInstance(sanitaryBodyGeometry,ceramicMaterial,x,.22,z,sx,.20,sz);
 queueStaticInstance(sanitaryRingGeometry,ceramicMaterial,x,.34,z,sx,sz,.045,Math.PI/2,0,0);
 if(toilet){const tankX=x+Math.sin(rotation)*.31,tankZ=z-Math.cos(rotation)*.31;bathroomBox(rotation ? .20 : .46,.53,rotation ? .46 : .20,ceramicMaterial,tankX,.39,tankZ);}
 else {const tapX=x+Math.sin(rotation)*.24,tapZ=z-Math.cos(rotation)*.24;queueStaticInstance(tapGeometry,bathroomMetal,tapX,.55,tapZ,.025,.18,.025);}
}
// Bath 1: recessed tub, towel warmer, bidet, toilet and vanity.
bathroomBox(.10,.55,1.90,ceramicMaterial,.12,.285,4.15);bathroomBox(.10,.55,1.90,ceramicMaterial,.81,.285,4.15);
bathroomBox(.79,.55,.10,ceramicMaterial,.465,.285,3.24);bathroomBox(.79,.55,.10,ceramicMaterial,.465,.285,5.06);
bathroomBox(.59,.10,1.70,ceramicMaterial,.465,.10,4.15);bathroomBox(.58,.025,1.68,bathWater,.465,.20,4.15);
queueStaticInstance(tapGeometry,bathroomMetal,.47,.91,3.27,.025,.64,.025);bathroomBox(.08,.08,.06,bathroomMetal,.47,1.31,3.255);bathroomBox(.045,.045,.28,bathroomMetal,.47,1.31,3.39);queueStaticInstance(tapGeometry,bathroomMetal,.47,1.28,3.54,.10,.025,.10);
for(const x of [.16,.76])bathroomBox(.035,1.08,.035,bathroomMetal,x,1.27,3.30);
for(let i=0;i<6;i++)bathroomBox(.60,.025,.04,bathroomMetal,.46,.82+i*.18,3.30);
addSanitary(1.42,3.62,0,false);addSanitary(2.12,3.62,0,true);
bathroomBox(.86,.67,.42,applianceWhite,1.72,.345,4.87);bathroomBox(.90,.08,.46,ceramicMaterial,1.72,.72,4.87);
queueStaticInstance(sanitaryRingGeometry,ceramicMaterial,1.72,.79,4.84,.30,.20,.04,Math.PI/2,0,0);
bathroomBox(.82,.66,.025,bathroomMirror,1.72,1.34,5.055);
// Bath 2: vanity to the north, sanitary ware on the east wall and glass shower.
bathroomBox(.82,.67,.42,applianceWhite,6.66,.345,5.40);bathroomBox(.86,.08,.46,ceramicMaterial,6.66,.72,5.40);
queueStaticInstance(sanitaryRingGeometry,ceramicMaterial,6.66,.79,5.43,.29,.20,.04,Math.PI/2,0,0);
bathroomBox(.78,.64,.025,bathroomMirror,6.66,1.34,5.205);
addSanitary(7.29,6.15,Math.PI/2,false);addSanitary(7.29,6.91,Math.PI/2,true);
bathroomBox(.84,.09,.84,ceramicMaterial,6.16,.055,7.47);
const showerGlass=new THREE.MeshPhysicalMaterial({color:'#c7e3eb',transparent:true,opacity:.26,roughness:.08,metalness:.05,depthWrite:false});
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

// Dark-brown corner kitchen following the annotated P/L/F layout, with a
// marble-clad island in front of it.
const kitchenFurniture=new THREE.Group();model.add(kitchenFurniture);
const kitchenBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,kitchenFurniture);
const kitchenBrown=new THREE.MeshStandardMaterial({color:'#3b2b24',roughness:.82});
const kitchenFront=new THREE.MeshStandardMaterial({color:'#4d372c',roughness:.78});
const kitchenCounter=new THREE.MeshStandardMaterial({color:'#252321',roughness:.38,metalness:.08});
const kitchenSteel=new THREE.MeshStandardMaterial({color:'#aeb5b6',roughness:.28,metalness:.72});
function makeMarbleTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');cx.fillStyle='#e9e5df';cx.fillRect(0,0,512,512);
 let seed=4417;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<18;i++){const y=rnd()*512;cx.beginPath();cx.moveTo(-20,y);for(let x=0;x<=540;x+=24)cx.lineTo(x,y+Math.sin(x*.018+i)*18+(rnd()-.5)*12);cx.strokeStyle=i%4?'rgba(104,100,96,.18)':'rgba(91,81,76,.30)';cx.lineWidth=.8+rnd()*2.2;cx.stroke();}
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.4,2.1);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
const marbleMaterial=new THREE.MeshStandardMaterial({color:'#f2efea',map:makeMarbleTexture(),roughness:.32});
// Horizontal run (P): all bodies remain beyond the inner face of the entrance
// wall, so neither base nor wall units can protrude outdoors.
kitchenBox(1.85,.86,.60,kitchenBrown,8.57,.43,12.68);kitchenBox(1.91,.06,.64,kitchenCounter,8.57,.89,12.69);
for(const x of [7.97,8.57,9.17])kitchenBox(.56,.70,.025,kitchenFront,x,.45,12.995);
kitchenBox(.76,.025,.50,screenMaterial,8.18,.94,12.69);
for(const [dx,dz,r] of [[-.18,-.12,.10],[.18,-.12,.10],[-.18,.13,.13],[.18,.13,.13]])queueStaticInstance(sanitaryRingGeometry,kitchenSteel,8.18+dx,.958,12.69+dz,r,r,.012,Math.PI/2,0,0);
kitchenBox(.54,.49,.025,screenMaterial,8.18,.43,13.008);
// Vertical run (L): a shallower, flush-mounted sink cabinet on the east wall.
kitchenBox(.58,.86,1.12,kitchenBrown,9.24,.43,13.58);kitchenBox(.62,.06,1.16,kitchenCounter,9.22,.89,13.58);
for(const z of [13.28,13.88])kitchenBox(.025,.70,.55,kitchenFront,8.938,.45,z);
queueStaticInstance(sanitaryRingGeometry,kitchenSteel,9.18,.945,13.55,.22,.34,.035,Math.PI/2,0,0);
queueStaticInstance(tapGeometry,kitchenSteel,9.45,1.12,13.55,.025,.42,.025);kitchenBox(.27,.035,.035,kitchenSteel,9.33,1.30,13.55);
// The refrigerator is a distinct full-height block, separated from the sink
// cabinetry by a visible shadow gap and aligned to the same inner wall face.
kitchenBox(.62,2.15,.82,kitchenBrown,9.22,1.075,14.60);kitchenBox(.035,2.01,.76,kitchenFront,8.892,1.075,14.60);kitchenBox(.025,.78,.035,kitchenSteel,8.868,1.16,14.40);
// Continuous overhead storage turns the corner above the sink and induction
// hob. The lower units and range hood remain individually legible.
kitchenBox(.82,.64,.32,kitchenBrown,8.07,1.78,12.55);
for(const x of [7.87,8.27])kitchenBox(.37,.57,.025,kitchenFront,x,1.78,12.718);
kitchenBox(.55,.26,.33,kitchenSteel,8.76,1.61,12.55);
kitchenBox(.32,.62,1.02,kitchenBrown,9.35,1.77,13.52);
for(const z of [13.28,13.76])kitchenBox(.025,.55,.45,kitchenFront,9.182,1.77,z);
kitchenBox(1.52,.36,.32,kitchenBrown,8.41,2.40,12.55);
// Two clean door fronts terminate before the turn; the solid corner carcass
// closes the previously empty top-right rectangle without creating a third,
// overlapping door.
for(const x of [8.02,8.80])kitchenBox(.70,.30,.025,kitchenFront,x,2.40,12.718);
kitchenBox(.35,.36,.32,kitchenBrown,9.345,2.40,12.55);
kitchenBox(.60,.36,2.43,kitchenBrown,9.22,2.40,13.79);
for(const z of [12.99,13.79,14.59])kitchenBox(.025,.30,.73,kitchenFront,8.908,2.40,z);
// Marble island (I): the cabinet base is shifted away from the stools, leaving
// a 39 cm knee recess beneath the unchanged worktop overhang.
kitchenBox(.58,.86,1.36,marbleMaterial,6.64,.43,13.91);kitchenBox(.98,.08,1.62,marbleMaterial,6.45,.90,13.91);kitchenBox(.04,.66,1.18,kitchenBrown,6.91,.43,13.91);

// Two high stools face the island. Their repeated circular details are
// instanced, while the footrests share the existing box batch.
const stoolSeatGeometry=new THREE.CylinderGeometry(1,1,1,16);
for(const z of [13.45,14.37]){
 queueStaticInstance(stoolSeatGeometry,kitchenFront,6.08,.72,z,.21,.08,.21);
 queueStaticInstance(tapGeometry,furnitureBlack,6.08,.38,z,.045,.62,.045);
 queueStaticInstance(sanitaryRingGeometry,kitchenSteel,6.08,.26,z,.14,.14,.025,Math.PI/2,0,0);
 kitchenBox(.42,.035,.035,furnitureBlack,6.08,.08,z);kitchenBox(.035,.035,.42,furnitureBlack,6.08,.08,z);
}

// Four-seat dining table from the annotated plan, with a lilac tablecloth and
// chairs whose dark wood matches the kitchen cabinetry.
const diningFurniture=new THREE.Group();model.add(diningFurniture);
const diningBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,diningFurniture);
const diningX=4.36,diningZ=13.72;
diningBox(.88,.10,1.42,kitchenBrown,diningX,.74,diningZ);
diningBox(.96,.035,1.50,lilacBedding,diningX,.805,diningZ);
diningBox(.035,.27,1.46,lilacBedding,diningX-.463,.66,diningZ);diningBox(.035,.27,1.46,lilacBedding,diningX+.463,.66,diningZ);
diningBox(.92,.27,.035,lilacBedding,diningX,.66,diningZ-.733);diningBox(.92,.27,.035,lilacBedding,diningX,.66,diningZ+.733);
for(const x of [diningX-.36,diningX+.36])for(const z of [diningZ-.62,diningZ+.62])diningBox(.055,.70,.055,kitchenBrown,x,.36,z);
for(const x of [3.92,4.80])for(const z of [13.34,14.10]){
 diningBox(.42,.08,.42,kitchenFront,x,.46,z);
 const outer=x<diningX?x-.19:x+.19;diningBox(.08,.68,.46,kitchenBrown,outer,.73,z);
 for(const dx of [-.16,.16])for(const dz of [-.16,.16])diningBox(.045,.43,.045,kitchenBrown,x+dx,.225,z+dz);
}

// Floor-to-ceiling built-in storage fills the dead end of the hall between the
// bathroom door jamb and the south partition. It stays clear of both openings.
const hallWardrobe=new THREE.Group();model.add(hallWardrobe);
const hallWardrobeBox=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,hallWardrobe);
const hallWardrobeMinZ=6.66,hallWardrobeMaxZ=7.94,hallWardrobeDepth=.55,hallWardrobeCenterZ=(hallWardrobeMinZ+hallWardrobeMaxZ)/2;
hallWardrobeBox(hallWardrobeDepth,2.48,hallWardrobeMaxZ-hallWardrobeMinZ,wardrobeMaterial,5.325,1.24,hallWardrobeCenterZ);
for(const z of [6.985,7.625]){
 hallWardrobeBox(.025,2.30,.60,wardrobeFrontMaterial,5.038,1.20,z);
 hallWardrobeBox(.025,.22,.025,bathroomMetal,5.018,1.20,z+.16);
}
hallWardrobeBox(.59,.08,1.32,wardrobeFrontMaterial,5.305,2.52,hallWardrobeCenterZ);

// Two study/gaming stations in Camera 3, placed above and below the west-wall
// window as shown in the supplied plan.
const room3Furniture=new THREE.Group();model.add(room3Furniture);
const room3Box=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,room3Furniture);
const deskWood=new THREE.MeshStandardMaterial({color:'#d5ad78',roughness:.76});
const gamingUpholstery=new THREE.MeshStandardMaterial({color:'#252a2f',roughness:.9});
const gamingAccent=new THREE.MeshStandardMaterial({color:'#555c65',roughness:.88});
const laptopSilver=new THREE.MeshStandardMaterial({color:'#bfc5c7',roughness:.34,metalness:.68});
const deskStations=[{z:5.68,laptop:laptopSilver},{z:7.72,laptop:furnitureBlack}];
for(const station of deskStations){
 const z=station.z;room3Box(.64,.065,1.02,deskWood,.33,.75,z);
 for(const x of [.08,.58])for(const dz of [-.43,.43])room3Box(.045,.72,.045,furnitureBlack,x,.37,z+dz);
 room3Box(.38,.025,.50,station.laptop,.43,.795,z);const screen=room3Box(.035,.32,.48,station.laptop,.25,.96,z);screen.rotation.z=-.12;room3Box(.012,.25,.40,screenMaterial,.228,.96,z).rotation.z=-.12;
 room3Box(.48,.12,.50,gamingUpholstery,1.16,.46,z);const back=room3Box(.16,.72,.56,gamingUpholstery,1.42,.84,z);back.rotation.z=-.10;
 room3Box(.38,.08,.06,gamingAccent,1.18,.67,z-.29);room3Box(.38,.08,.06,gamingAccent,1.18,.67,z+.29);
 queueStaticInstance(tapGeometry,furnitureBlack,1.20,.25,z,.05,.34,.05);room3Box(.62,.045,.07,furnitureBlack,1.20,.09,z);room3Box(.07,.045,.62,furnitureBlack,1.20,.09,z);
}

const bathroomFixtureCount=bathroomFixtures.children.length,bedroomObjectCount=bedroomFurniture.children.length,kitchenObjectCount=kitchenFurniture.children.length,diningObjectCount=diningFurniture.children.length,hallWardrobeObjectCount=hallWardrobe.children.length,room3ObjectCount=room3Furniture.children.length,plantCount=plantData.length;
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
const batchedBoxes=batchStaticBoxes();

const furnitureColliders=[
 {minX:6.28,maxX:7.55,minZ:8.04,maxZ:10.50},
 {minX:5.62,maxX:7.10,minZ:8.02,maxZ:8.92},
 {minX:3.02,maxX:3.52,minZ:8.84,maxZ:11.02},
 {minX:.86,maxX:1.62,minZ:8.56,maxZ:9.10},
 {minX:1.70,maxX:2.45,minZ:8.56,maxZ:9.26},
 {minX:.775,maxX:1.775,minZ:11.78,maxZ:12.72},
 {minX:.955,maxX:1.595,minZ:11.10,maxZ:11.76},
 {minX:.955,maxX:1.595,minZ:12.74,maxZ:13.40},
 {minX:-.08,maxX:2.60,minZ:14.05,maxZ:14.88},
 {minX:3.17,maxX:3.76,minZ:8.04,maxZ:8.64},
 {minX:-.12,maxX:.48,minZ:10.53,maxZ:11.13},
 {minX:.02,maxX:.91,minZ:3.15,maxZ:5.15},
 {minX:1.14,maxX:2.42,minZ:3.28,maxZ:4.05},
 {minX:1.22,maxX:2.22,minZ:4.60,maxZ:5.10},
 {minX:6.18,maxX:7.12,minZ:5.16,maxZ:5.70},
 {minX:6.88,maxX:7.61,minZ:5.84,maxZ:7.24},
 {minX:5.70,maxX:6.62,minZ:7.00,maxZ:7.91},
 {minX:4.34,maxX:6.35,minZ:2.12,maxZ:3.98},
 {minX:7.02,maxX:7.62,minZ:1.02,maxZ:5.04},
 {minX:7.60,maxX:9.54,minZ:12.34,maxZ:13.03},
 {minX:8.86,maxX:9.54,minZ:12.96,maxZ:15.03},
 {minX:5.94,maxX:6.96,minZ:13.06,maxZ:14.76},
 {minX:5.82,maxX:6.34,minZ:13.18,maxZ:14.62},
 {minX:3.30,maxX:5.42,minZ:13.06,maxZ:14.50},
 {minX:5.00,maxX:5.63,minZ:6.63,maxZ:7.97},
 {minX:.01,maxX:1.55,minZ:5.12,maxZ:6.24},
 {minX:.01,maxX:1.55,minZ:7.16,maxZ:8.23}
];
function canWalk(x,z,radius=.18){
 if(!canStand(x,z,radius))return false;
 return !furnitureColliders.some(c=>x>c.minX-radius&&x<c.maxX+radius&&z>c.minZ-radius&&z<c.maxZ+radius);
}
const roof=polygonMesh(footprint,new THREE.MeshStandardMaterial({color:'#faf9f3',side:THREE.DoubleSide,roughness:1}),HEIGHT);
model.remove(roof);ceiling.add(roof);
// Daylight plus low-power fill lights keep the enclosed walk-through readable.
scene.add(new THREE.HemisphereLight('#f5faff','#afaba0',1.45));
const sunlight=new THREE.DirectionalLight('#fff6e7',2);sunlight.position.set(-7,17,10);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);Object.assign(sunlight.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:65});sunlight.target.position.set(4,0,7);sunlight.shadow.bias=-.0003;sunlight.shadow.normalBias=.025;scene.add(sunlight,sunlight.target);
const interiorLights=new THREE.Group();scene.add(interiorLights);for(const r of rooms){if(r.id==='terrace')continue;const [x,z]=point(r.at);const light=new THREE.PointLight('#fff7eb',7,8,2);light.position.set(x,2.3,z);interiorLights.add(light);}
const grassTexture=makeGrassTexture();
const grassMaterial=new THREE.MeshStandardMaterial({color:'#f2f8ec',map:grassTexture,bumpMap:grassTexture,bumpScale:.002,roughness:1});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),grassMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=GROUND_Y;ground.receiveShadow=true;scene.add(ground);

const {landscape,mountains,clouds,grass,treeCount,mountainCount,cloudCount,grassCount}=createLandscape(scene,GROUND_Y,footprint,insidePolygon,isTouch);

const movement=createMovement(canWalk,(x,z,eye)=>{
 let ceilingHeight=HEIGHT;
 for(const v of architecturalVolumes)if(v.min[1]>0&&x+.18>v.min[0]&&x-.18<v.max[0]&&z+.18>v.min[2]&&z-.18<v.max[2])ceilingHeight=Math.min(ceilingHeight,v.min[1]);
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
 const label=document.createElement('span');label.className='room-label';label.textContent=room.name==='Camera matrimoniale'?'Matrimoniale':room.name;$('#labels').append(label);labelElements.set(room.id,label);
}
function updateSelection(id){selected=id;for(const b of document.querySelectorAll('.room-button'))b.classList.toggle('selected',b.dataset.room===id);for(const [key,p]of mapRooms)p.setAttribute('fill',key===id?'#b6d1e2':'#f7f8f7');for(const[key,l]of labelElements)l.classList.toggle('selected',key===id);$('#current-room').textContent=rooms.find(r=>r.id===id)?.name??'Intero appartamento';}
function selectRoom(id){const room=rooms.find(r=>r.id===id);if(!room)return;updateSelection(id);const[x,z]=point(room.at);if(view==='walk'){resetMovement();perspective.position.set(x,eyeHeight,z);yaw=0;pitch=0;applyLook();}else if(view==='orbit'){const offset=perspective.position.clone().sub(controls.target).normalize().multiplyScalar(12);controls.target.set(x,0,z);perspective.position.copy(controls.target).add(offset);controls.update();}else{orthographic.position.set(x,24,z+.001);orthographic.lookAt(x,0,z);orthographic.zoom=1.6;orthographic.updateProjectionMatrix();}if(isTouch){$('#panel').classList.remove('open');$('#panel-toggle').setAttribute('aria-expanded','false');}}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);perspective.aspect=w/h;perspective.updateProjectionMatrix();const half=9;orthographic.left=-half*w/h;orthographic.right=half*w/h;orthographic.top=half;orthographic.bottom=-half;orthographic.updateProjectionMatrix();}
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
 ceiling.visible=view==='walk';controls.enabled=view==='orbit';camera=view==='plan'?orthographic:perspective;
 clouds.visible=view!=='plan';mountains.visible=view!=='plan';grass.visible=view!=='plan';
 applyRenderProfile(view);
 perspective.fov=view==='walk'?65:43;perspective.updateProjectionMatrix();
 $('#measure').disabled=view==='walk';$('#touch-controls').hidden=!(view==='walk'&&isTouch);
 $('#enter-walk').hidden=view!=='walk'||isTouch;
 $('#view-title').textContent=view==='walk'?'A casa, un passo alla volta.':view==='plan'?'Ogni ambiente, al suo posto.':'Uno spazio tutto da immaginare.';
 $('#view-help').textContent=view==='walk'?(isTouch?'Frecce · Salta · Tieni premuto Corri · Trascina per guardare':'WASD / frecce · Shift per correre · Spazio per saltare · Esc per pausa'):view==='plan'?'Rotella per lo zoom · Seleziona una stanza a destra':isTouch?'Un dito per ruotare · Due dita per zoom e spostamento':'Trascina per ruotare · Rotella per avvicinarti';
 if(view==='orbit')resetOverview();else if(view==='plan')resetPlan();else{const r=rooms.find(r=>r.id===selected)??rooms[0];const[x,z]=point(r.at);perspective.position.set(x,eyeHeight,z);yaw=.3;pitch=0;applyLook();updateSelection(r.id);walkActive=isTouch;}
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
$('#tile-size').onchange=e=>{tileSize=Number(e.target.value);floorMaterial.map.repeat.set(1/tileSize,1/tileSize);};
$('#eye-height').oninput=e=>{eyeHeight=Number(e.target.value);$('#eye-value').textContent=eyeHeight.toFixed(2).replace('.',',')+' m';resetMovement();};
$('#panel-toggle').onclick=()=>{const open=$('#panel').classList.toggle('open');$('#panel-toggle').setAttribute('aria-expanded',open);};

function clearMeasurements(){for(const child of [...measurementGroup.children]){child.geometry?.dispose();child.material?.dispose();measurementGroup.remove(child);}measurePoints=[];}
function toggleMeasure(on=!measuring){measuring=on;$('#measure').classList.toggle('active',on);$('#measure').setAttribute('aria-pressed',on);controls.enabled=view==='orbit'&&!on;$('#measure-result').hidden=!on;$('#measure-result').textContent='Seleziona due punti sul pavimento';renderer.domElement.style.cursor=on?'crosshair':'';clearMeasurements();}
$('#measure').onclick=()=>toggleMeasure();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',e=>{if(!measuring)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(floorObjects)[0];if(!hit)return;if(measurePoints.length===2)clearMeasurements();const p=hit.point.clone();p.y=.055;measurePoints.push(p);const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color:'#286eaa',depthTest:false,depthWrite:false}));dot.position.copy(p);dot.renderOrder=10;measurementGroup.add(dot);if(measurePoints.length===1){$('#measure-result').textContent='Seleziona il secondo punto';return;}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(measurePoints),new THREE.LineBasicMaterial({color:'#286eaa',depthTest:false,depthWrite:false}));line.renderOrder=10;measurementGroup.add(line);const dist=measurePoints[0].distanceTo(measurePoints[1]);$('#measure-result').textContent=dist.toFixed(2).replace('.',',')+' m · Clicca per una nuova misura';});
renderer.domElement.addEventListener('wheel',e=>{if(view==='plan'){e.preventDefault();orthographic.zoom=THREE.MathUtils.clamp(orthographic.zoom*Math.exp(-e.deltaY*.001),.45,4);orthographic.updateProjectionMatrix();}},{passive:false});

let last=performance.now(),lastRoomTime=0,perfWindowStart=last,perfFrames=0,currentFps=0;
const projected=new THREE.Vector3();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.1);last=now;if(view==='orbit'&&controls.enabled)controls.update();move(dt);
 const labelElevation=(perspective.position.y-controls.target.y)/perspective.position.distanceTo(controls.target);
 const showLabels=view!=='walk'&&(view==='plan'||labelElevation>.28)&&$('#show-labels').checked;
 for(const room of rooms){const el=labelElements.get(room.id);const compactHidden=host.clientWidth<600&&['hall','bath1','bath2','utility'].includes(room.id)&&selected!==room.id;el.hidden=!showLabels||compactHidden;if(!showLabels||compactHidden)continue;const[x,z]=point(room.label);projected.set(x,.06,z).project(camera);el.hidden=projected.z>1||projected.z< -1;el.style.left=((projected.x*.5+.5)*host.clientWidth)+'px';el.style.top=((-projected.y*.5+.5)*host.clientHeight)+'px';}
 if(view==='walk'){const p=perspective.position;mapMarker.setAttribute('transform',`translate(${p.x*SCALE+42} ${p.z*SCALE+54}) rotate(${-yaw*180/Math.PI})`);if(now-lastRoomTime>300){const room=rooms.find(r=>insidePolygon(p.x,p.z,r.polygon));if(room&&room.id!==selected)updateSelection(room.id);lastRoomTime=now;}}
 renderer.render(scene,camera);
 perfFrames++;if(now-perfWindowStart>=1000){currentFps=perfFrames*1000/(now-perfWindowStart);perfFrames=0;perfWindowStart=now;renderer.domElement.dataset.fps=currentFps.toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);renderer.domElement.dataset.cameraPosition=perspective.position.toArray().map(n=>n.toFixed(4)).join(',');renderer.domElement.dataset.cameraAngles=`${yaw.toFixed(4)},${pitch.toFixed(4)}`;}
}
// The house, landscape and furniture are static: render their shadow map once
// instead of rebuilding a 2048px map on every frame while walking.
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
resize();setView('orbit');renderer.compile(scene,perspective);renderer.compile(scene,orthographic);requestAnimationFrame(animate);
// Small read-only diagnostics and deterministic spatial queries for validation.
window.houseModel={get state(){return {view,selected,height:HEIGHT,tileSize,eyeHeight,jumpHeight:movement.jumpHeight,walkActive,position:perspective.position.toArray(),yaw,pitch,wallCount:walls.length,colliderCount:collisionWalls.length+furnitureColliders.length,nightRoomIds:[...nightRoomIds],ground:'grass',nightFloor:'oak-parquet',bathroomFloor:'dark-stoneware',furniture:'living-sectional-tv-utility-terrace-bathrooms-bedrooms-plants-kitchen-dining-and-hall-wardrobe',sofaLength:2.25,chaiseLength:1.30,bedLength,furnitureObjectCount,utilityObjectCount,terraceObjectCount,bathroomFixtureCount,bedroomObjectCount,kitchenObjectCount,diningObjectCount,hallWardrobeObjectCount,room3ObjectCount,plantCount,lemonPlantCount:0,treeCount,mountainCount,cloudCount,grassCount};},get performance(){return {fps:Number(currentFps.toFixed(1)),pixelRatio:renderPixelRatio,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,staticShadowMap:renderer.shadowMap.autoUpdate===false,batchedBoxes,assetInstanceStats};},canStand:canWalk,rooms:rooms.map(r=>({id:r.id,at:point(r.at)}))};
