import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { point, SCALE, HEIGHT, rooms, nightRoomIds, nightFloorPolygon, walls, railings, footprint, insidePolygon, canStand, collisionWalls } from './model.js';
import { wallVolumes, unionSurface } from './wall-geometry.js';

const $ = s => document.querySelector(s);
const host = $('#scene');
const isTouch = matchMedia('(pointer:coarse)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false}); }
catch { $('#error').hidden=false; $('#error').textContent='Il browser non riesce ad avviare la vista 3D. Prova ad attivare l’accelerazione grafica o ad aprire la pagina in un browser aggiornato.'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
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
const floorMaterial=new THREE.MeshStandardMaterial({color:$('#floor-color').value,roughness:.88});

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
  image.data[i]=Math.max(45,Math.min(103,69+grain*22+patch*2));
  image.data[i+1]=Math.max(102,Math.min(165,132+grain*28+patch*3));
  image.data[i+2]=Math.max(31,Math.min(82,49+grain*16+patch*1.5));image.data[i+3]=255;
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
polygonMesh(nightFloorPolygon,parquetMaterial,.006);
const bathroomTileMaterial=new THREE.MeshStandardMaterial({color:'#b8b9b5',map:floorMaterial.map,roughness:.92});
const bathroomFloors=rooms.filter(room=>['bath1','bath2'].includes(room.id)).map(room=>polygonMesh(room.polygon,bathroomTileMaterial,.009));
floorObjects.push(...bathroomFloors);
const base=polygonMesh(footprint,new THREE.MeshStandardMaterial({color:'#a7b1b7',roughness:1}),-.16);
const box=(w,h,d,mat,x,y,z,parent=model)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
// Foundation edge under the exterior outline.
footprint.forEach((a,i)=>{const b=footprint[(i+1)%footprint.length];const [x,z]=point(a),[ex,ez]=point(b);const len=Math.hypot(ex-x,ez-z);const m=box(len,.16,.09,cap,(x+ex)/2,-.08,(z+ez)/2);m.rotation.y=-Math.atan2(ez-z,ex-x);});

const wallSurface=unionSurface(wallVolumes());
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
const applianceGlass=new THREE.MeshPhysicalMaterial({color:'#18252b',roughness:.18,metalness:.2,transparent:true,opacity:.88});
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

const furnitureColliders=[
 {minX:6.28,maxX:7.55,minZ:8.04,maxZ:10.50},
 {minX:5.62,maxX:7.10,minZ:8.02,maxZ:8.92},
 {minX:3.02,maxX:3.52,minZ:8.84,maxZ:11.02},
 {minX:.86,maxX:1.62,minZ:8.56,maxZ:9.10},
 {minX:1.70,maxX:2.45,minZ:8.56,maxZ:9.26},
 {minX:.775,maxX:1.775,minZ:11.78,maxZ:12.72},
 {minX:.955,maxX:1.595,minZ:11.10,maxZ:11.76},
 {minX:.955,maxX:1.595,minZ:12.74,maxZ:13.40},
 {minX:-.08,maxX:2.60,minZ:14.05,maxZ:14.88}
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
const grassMaterial=new THREE.MeshStandardMaterial({color:'#f2f8ec',map:grassTexture,bumpMap:grassTexture,bumpScale:.008,roughness:1});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),grassMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=GROUND_Y;ground.receiveShadow=true;scene.add(ground);

const landscape=new THREE.Group();scene.add(landscape);
const trunkMaterial=new THREE.MeshStandardMaterial({color:'#765033',roughness:1});
const leafMaterials=[new THREE.MeshStandardMaterial({color:'#4d8d42',roughness:.95,flatShading:true}),new THREE.MeshStandardMaterial({color:'#69a653',roughness:.95,flatShading:true})];
const trunkGeometry=new THREE.CylinderGeometry(.15,.22,1.5,8);
const crownGeometry=new THREE.IcosahedronGeometry(1,2);
function addTree(x,z,scale=1,tone=0){
 const tree=new THREE.Group();tree.position.set(x,GROUND_Y,z);tree.rotation.y=(x*1.7+z*.9)%Math.PI;
 // Scale the trunk around its base so every tree stays planted on the lawn.
 const trunk=new THREE.Mesh(trunkGeometry,trunkMaterial);trunk.position.y=.75*scale;trunk.scale.set(scale,scale,scale);trunk.castShadow=true;tree.add(trunk);
 const crown=new THREE.Mesh(crownGeometry,leafMaterials[tone%leafMaterials.length]);crown.position.y=2.25*scale;crown.scale.set(1.05*scale,1.35*scale,1.05*scale);crown.castShadow=true;crown.receiveShadow=true;tree.add(crown);
 const side=new THREE.Mesh(crownGeometry,leafMaterials[(tone+1)%leafMaterials.length]);side.position.set(.62*scale,1.92*scale,.16*scale);side.scale.set(.68*scale,.78*scale,.68*scale);side.castShadow=true;tree.add(side);
 landscape.add(tree);
}
[
 [-5,-3,.9,0],[-7,4,1.08,1],[-6,12,.95,0],[-5,20,1.14,1],[2,21,.82,0],
 [16,18,.88,0],[17,10,1.12,1],[16,2,.9,0],[12,-5,1.06,1],[4,-6,.78,0]
].forEach(args=>addTree(...args));

// A low-poly mountain ring closes the horizon while remaining far outside the walkable garden.
const mountains=new THREE.Group();scene.add(mountains);
const mountainMaterials=['#78919a','#6e8993','#879da2'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
const snowMaterial=new THREE.MeshStandardMaterial({color:'#e8eeed',roughness:1,flatShading:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
let mountainSeed=7143;
const mountainRandom=()=>{mountainSeed=(mountainSeed*1664525+1013904223)>>>0;return mountainSeed/4294967296;};
const mountainCount=26,mountainCenter=new THREE.Vector2(4.5,7.5);
for(let i=0;i<mountainCount;i++){
 const angle=i/mountainCount*Math.PI*2+(mountainRandom()-.5)*.06;
 const distance=58+mountainRandom()*9,width=8.5+mountainRandom()*5.5,height=7+mountainRandom()*9;
 const geometry=new THREE.ConeGeometry(width,height,7,2);
 const mountain=new THREE.Mesh(geometry,mountainMaterials[i%mountainMaterials.length]);
 mountain.position.set(mountainCenter.x+Math.cos(angle)*distance,GROUND_Y+height/2,mountainCenter.y+Math.sin(angle)*distance);
 mountain.rotation.y=mountainRandom()*Math.PI;mountains.add(mountain);
 if(height>12){
  // The wider, slightly raised cap sits above the mountain slope instead of sharing
  // the same triangles, preventing the two surfaces from flickering (z-fighting).
  const capHeight=height*.28;
  const snow=new THREE.Mesh(new THREE.ConeGeometry(width*.32,capHeight,7,1),snowMaterial);
  snow.position.set(mountain.position.x,GROUND_Y+height-capHeight/2+.025,mountain.position.z);snow.rotation.y=mountain.rotation.y;mountains.add(snow);
 }
}

const clouds=new THREE.Group();scene.add(clouds);
const cloudGeometry=new THREE.SphereGeometry(1,16,10);
const cloudMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#dcebf1',emissiveIntensity:.28,roughness:1,transparent:true,opacity:.94,depthWrite:false});
function addCloud(x,y,z,scale=1){
 const cloud=new THREE.Group();cloud.position.set(x,y,z);
 [[0,0,0,1.35,.72,.8],[-1.05,-.12,.08,.92,.55,.68],[1.08,-.08,.04,1.05,.62,.72],[-.35,.38,0,.85,.72,.7],[.5,.3,-.05,.92,.68,.72]].forEach(([px,py,pz,sx,sy,sz])=>{
  const puff=new THREE.Mesh(cloudGeometry,cloudMaterial);puff.position.set(px*scale,py*scale,pz*scale);puff.scale.set(sx*scale,sy*scale,sz*scale);cloud.add(puff);
 });
 clouds.add(cloud);
}
addCloud(-8,8,-9,1.2);addCloud(-22,11,-15,1.1);addCloud(30,12,-10,1.25);addCloud(-24,13,24,1.05);addCloud(32,15,38,1.3);

let view='orbit',selected=null,eyeHeight=1.65,yaw=0,pitch=0,walkActive=false;
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
function selectRoom(id){const room=rooms.find(r=>r.id===id);if(!room)return;updateSelection(id);const[x,z]=point(room.at);if(view==='walk'){perspective.position.set(x,eyeHeight,z);yaw=0;pitch=0;applyLook();}else if(view==='orbit'){const offset=perspective.position.clone().sub(controls.target).normalize().multiplyScalar(12);controls.target.set(x,0,z);perspective.position.copy(controls.target).add(offset);controls.update();}else{orthographic.position.set(x,24,z+.001);orthographic.lookAt(x,0,z);orthographic.zoom=1.6;orthographic.updateProjectionMatrix();}if(isTouch){$('#panel').classList.remove('open');$('#panel-toggle').setAttribute('aria-expanded','false');}}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);perspective.aspect=w/h;perspective.updateProjectionMatrix();const half=9;orthographic.left=-half*w/h;orthographic.right=half*w/h;orthographic.top=half;orthographic.bottom=-half;orthographic.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);
function resetOverview(){controls.target.set(4.6,0,7.35);const widthRatio=Math.max(1,1.03/(host.clientWidth/host.clientHeight));perspective.position.set(4.6+12*widthRatio,17*widthRatio,7.35+16*widthRatio);controls.update();}
function resetPlan(){orthographic.position.set(4.8,24,7.4);orthographic.up.set(0,0,-1);orthographic.lookAt(4.8,0,7.4);orthographic.zoom=Math.min(.80,(host.clientWidth/host.clientHeight)*1.5);orthographic.updateProjectionMatrix();}
function applyLook(){perspective.rotation.order='YXZ';perspective.rotation.set(pitch,yaw,0);}
function stopWalk(){walkActive=false;keys.clear();$('#enter-walk').hidden=view!=='walk'||isTouch;$('#crosshair').hidden=true;if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();}
function setView(mode){
 if(!['orbit','plan','walk'].includes(mode))return;
 stopWalk();if(measuring)toggleMeasure(false);view=mode;$('#viewer').classList.toggle('walk-mode',view==='walk');
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view);});
 ceiling.visible=view==='walk';controls.enabled=view==='orbit';camera=view==='plan'?orthographic:perspective;
 clouds.visible=view!=='plan';mountains.visible=view!=='plan';
 perspective.fov=view==='walk'?65:43;perspective.updateProjectionMatrix();
 $('#measure').disabled=view==='walk';$('#touch-controls').hidden=!(view==='walk'&&isTouch);
 $('#enter-walk').hidden=view!=='walk'||isTouch;
 $('#view-title').textContent=view==='walk'?'A casa, un passo alla volta.':view==='plan'?'Ogni ambiente, al suo posto.':'Uno spazio tutto da immaginare.';
 $('#view-help').textContent=view==='walk'?(isTouch?'Frecce per muoverti · Trascina per guardare':'WASD / frecce per muoverti · Esc per liberare il mouse'):view==='plan'?'Rotella per lo zoom · Seleziona una stanza a destra':isTouch?'Un dito per ruotare · Due dita per zoom e spostamento':'Trascina per ruotare · Rotella per avvicinarti';
 if(view==='orbit')resetOverview();else if(view==='plan')resetPlan();else{const r=rooms.find(r=>r.id===selected)??rooms[0];const[x,z]=point(r.at);perspective.position.set(x,eyeHeight,z);yaw=.3;pitch=0;applyLook();updateSelection(r.id);walkActive=isTouch;}
 mapMarker.style.display=view==='walk'?'':'none';
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#reset').onclick=()=>{updateSelection(null);setView(view);};
$('#enter-walk').onclick=async()=>{try{await renderer.domElement.requestPointerLock();}catch{$('#enter-walk span').textContent='Clicca nella scena e trascina per guardare. Usa WASD per camminare.';walkActive=true;$('#enter-walk').hidden=true;}};
document.addEventListener('pointerlockchange',()=>{walkActive=document.pointerLockElement===renderer.domElement;if(view==='walk'){$('#enter-walk').hidden=walkActive||isTouch;$('#crosshair').hidden=!walkActive;}if(!walkActive)keys.clear();});
const keys=new Set();
window.addEventListener('keydown',e=>{if(view!=='walk'||!walkActive||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
function rotateLook(dx,dy,sensitivity){
 const safeX=THREE.MathUtils.clamp(Number.isFinite(dx)?dx:0,-90,90),safeY=THREE.MathUtils.clamp(Number.isFinite(dy)?dy:0,-90,90);
 yaw=THREE.MathUtils.euclideanModulo(yaw-safeX*sensitivity+Math.PI,Math.PI*2)-Math.PI;
 pitch=THREE.MathUtils.clamp(pitch-safeY*sensitivity,-1.35,1.35);applyLook();
}
document.addEventListener('mousemove',e=>{if(view==='walk'&&document.pointerLockElement===renderer.domElement)rotateLook(e.movementX,e.movementY,.002);});
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(view==='walk'&&document.pointerLockElement!==renderer.domElement){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||view!=='walk')return;rotateLook(e.clientX-drag.x,e.clientY-drag.y,.004);drag={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
const moveCodes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};
for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(moveCodes[b.dataset.move]);};b.onpointerup=b.onpointercancel=()=>keys.delete(moveCodes[b.dataset.move]);}
function move(dt){if(view!=='walk'||!walkActive)return;let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));let right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));const norm=Math.hypot(forward,right);if(!norm)return;forward/=norm;right/=norm;const speed=1.5;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*dt*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*dt*speed;const p=perspective.position;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.03)),stepX=dx/steps,stepZ=dz/steps;
 for(let i=0;i<steps;i++){if(canWalk(p.x+stepX,p.z))p.x+=stepX;if(canWalk(p.x,p.z+stepZ))p.z+=stepZ;}
}
$('#tile-size').onchange=e=>{tileSize=Number(e.target.value);floorMaterial.map.repeat.set(1/tileSize,1/tileSize);};
$('#floor-color').oninput=e=>{floorMaterial.color.set(e.target.value);$('.tile-sample').style.backgroundColor=e.target.value;};
$('#eye-height').oninput=e=>{eyeHeight=Number(e.target.value);$('#eye-value').textContent=eyeHeight.toFixed(2).replace('.',',')+' m';if(view==='walk')perspective.position.y=eyeHeight;};
$('#panel-toggle').onclick=()=>{const open=$('#panel').classList.toggle('open');$('#panel-toggle').setAttribute('aria-expanded',open);};

function clearMeasurements(){for(const child of [...measurementGroup.children]){child.geometry?.dispose();child.material?.dispose();measurementGroup.remove(child);}measurePoints=[];}
function toggleMeasure(on=!measuring){measuring=on;$('#measure').classList.toggle('active',on);$('#measure').setAttribute('aria-pressed',on);controls.enabled=view==='orbit'&&!on;$('#measure-result').hidden=!on;$('#measure-result').textContent='Seleziona due punti sul pavimento';renderer.domElement.style.cursor=on?'crosshair':'';clearMeasurements();}
$('#measure').onclick=()=>toggleMeasure();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',e=>{if(!measuring)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(floorObjects)[0];if(!hit)return;if(measurePoints.length===2)clearMeasurements();const p=hit.point.clone();p.y=.055;measurePoints.push(p);const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color:'#286eaa',depthTest:false}));dot.position.copy(p);dot.renderOrder=10;measurementGroup.add(dot);if(measurePoints.length===1){$('#measure-result').textContent='Seleziona il secondo punto';return;}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(measurePoints),new THREE.LineBasicMaterial({color:'#286eaa',depthTest:false}));line.renderOrder=10;measurementGroup.add(line);const dist=measurePoints[0].distanceTo(measurePoints[1]);$('#measure-result').textContent=dist.toFixed(2).replace('.',',')+' m · Clicca per una nuova misura';});
renderer.domElement.addEventListener('wheel',e=>{if(view==='plan'){e.preventDefault();orthographic.zoom=THREE.MathUtils.clamp(orthographic.zoom*Math.exp(-e.deltaY*.001),.45,4);orthographic.updateProjectionMatrix();}},{passive:false});

let last=performance.now(),lastRoomTime=0;
const projected=new THREE.Vector3();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;if(view==='orbit'&&controls.enabled)controls.update();move(dt);
 renderer.domElement.dataset.cameraPosition=perspective.position.toArray().map(n=>n.toFixed(4)).join(',');
 renderer.domElement.dataset.cameraAngles=`${yaw.toFixed(4)},${pitch.toFixed(4)}`;
 const showLabels=view!=='walk'&&$('#show-labels').checked;
 for(const room of rooms){const el=labelElements.get(room.id);const compactHidden=host.clientWidth<600&&['hall','bath1','bath2','utility'].includes(room.id)&&selected!==room.id;el.hidden=!showLabels||compactHidden;if(!showLabels||compactHidden)continue;const[x,z]=point(room.label);projected.set(x,.06,z).project(camera);el.hidden=projected.z>1||projected.z< -1;el.style.left=((projected.x*.5+.5)*host.clientWidth)+'px';el.style.top=((-projected.y*.5+.5)*host.clientHeight)+'px';}
 if(view==='walk'){const p=perspective.position;mapMarker.setAttribute('transform',`translate(${p.x*SCALE+42} ${p.z*SCALE+54}) rotate(${-yaw*180/Math.PI})`);if(now-lastRoomTime>300){const room=rooms.find(r=>insidePolygon(p.x,p.z,r.polygon));if(room&&room.id!==selected)updateSelection(room.id);lastRoomTime=now;}}
 renderer.render(scene,camera);
}
resize();setView('orbit');requestAnimationFrame(animate);
// Small read-only diagnostics and deterministic spatial queries for validation.
window.houseModel={get state(){return {view,selected,height:HEIGHT,tileSize,eyeHeight,position:perspective.position.toArray(),yaw,pitch,wallCount:walls.length,colliderCount:collisionWalls.length+furnitureColliders.length,nightRoomIds:[...nightRoomIds],ground:'grass',nightFloor:'oak-parquet',bathroomFloor:'dark-stoneware',furniture:'living-sectional-tv-utility-and-terrace',sofaLength:2.25,chaiseLength:1.30,furnitureObjectCount:furniture.children.length,utilityObjectCount:utilityFixtures.children.length,terraceObjectCount:terraceFurniture.children.length,treeCount:landscape.children.length,mountainCount,cloudCount:clouds.children.length};},canStand:canWalk,rooms:rooms.map(r=>({id:r.id,at:point(r.at)}))};
