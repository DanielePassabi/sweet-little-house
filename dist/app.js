import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { point, SCALE, HEIGHT, rooms, walls, railings, footprint, insidePolygon, canStand, collisionWalls } from './model.js';
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
scene.background=new THREE.Color('#dfe4e6');
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
function polygonMesh(poly,material,y=0){
 const shape=new THREE.Shape();poly.map(point).forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const geo=new THREE.ShapeGeometry(shape);const uv=geo.attributes.uv;const pos=geo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i),pos.getY(i));
 const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;model.add(mesh);return mesh;
}
// Continuous floor prevents seams in the corridor and keeps tile joints aligned.
const floor=polygonMesh(footprint,floorMaterial);floorObjects.push(floor);
const terraceFloor=polygonMesh(rooms.find(r=>r.id==='terrace').polygon,new THREE.MeshStandardMaterial({color:'#d7d8d3',map:floorMaterial.map,roughness:.95}),.003);floorObjects.push(terraceFloor);
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
const roof=polygonMesh(footprint,new THREE.MeshStandardMaterial({color:'#faf9f3',side:THREE.DoubleSide,roughness:1}),HEIGHT);
model.remove(roof);ceiling.add(roof);
// Daylight plus low-power fill lights keep the enclosed walk-through readable.
scene.add(new THREE.HemisphereLight('#f5faff','#afaba0',1.45));
const sunlight=new THREE.DirectionalLight('#fff6e7',2);sunlight.position.set(-7,17,10);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);Object.assign(sunlight.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:65});sunlight.target.position.set(4,0,7);sunlight.shadow.bias=-.0003;sunlight.shadow.normalBias=.025;scene.add(sunlight,sunlight.target);
const interiorLights=new THREE.Group();scene.add(interiorLights);for(const r of rooms){if(r.id==='terrace')continue;const [x,z]=point(r.at);const light=new THREE.PointLight('#fff7eb',7,8,2);light.position.set(x,2.3,z);interiorLights.add(light);}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d8dfe2',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.20;ground.receiveShadow=true;scene.add(ground);

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
document.addEventListener('mousemove',e=>{if(view==='walk'&&document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.35,1.35);applyLook();}});
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(view==='walk'&&document.pointerLockElement!==renderer.domElement){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||view!=='walk')return;yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.004,-1.35,1.35);drag={x:e.clientX,y:e.clientY};applyLook();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
const moveCodes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};
for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(moveCodes[b.dataset.move]);};b.onpointerup=b.onpointercancel=()=>keys.delete(moveCodes[b.dataset.move]);}
function move(dt){if(view!=='walk'||!walkActive)return;let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));let right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));const norm=Math.hypot(forward,right);if(!norm)return;forward/=norm;right/=norm;const speed=1.5;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*dt*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*dt*speed;const p=perspective.position; // axis sliding avoids snagging on doorway edges
 if(canStand(p.x+dx,p.z))p.x+=dx;if(canStand(p.x,p.z+dz))p.z+=dz;
}
$('#tile-size').onchange=e=>{tileSize=Number(e.target.value);floorMaterial.map.repeat.set(1/tileSize,1/tileSize);};
$('#floor-color').oninput=e=>{floorMaterial.color.set(e.target.value);$('.material-sample').style.backgroundColor=e.target.value;};
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
 const showLabels=view!=='walk'&&$('#show-labels').checked;
 for(const room of rooms){const el=labelElements.get(room.id);const compactHidden=host.clientWidth<600&&['hall','bath1','bath2','utility'].includes(room.id)&&selected!==room.id;el.hidden=!showLabels||compactHidden;if(!showLabels||compactHidden)continue;const[x,z]=point(room.label);projected.set(x,.06,z).project(camera);el.hidden=projected.z>1||projected.z< -1;el.style.left=((projected.x*.5+.5)*host.clientWidth)+'px';el.style.top=((-projected.y*.5+.5)*host.clientHeight)+'px';}
 if(view==='walk'){const p=perspective.position;mapMarker.setAttribute('transform',`translate(${p.x*SCALE+42} ${p.z*SCALE+54}) rotate(${-yaw*180/Math.PI})`);if(now-lastRoomTime>300){const room=rooms.find(r=>insidePolygon(p.x,p.z,r.polygon));if(room&&room.id!==selected)updateSelection(room.id);lastRoomTime=now;}}
 renderer.render(scene,camera);
}
resize();setView('orbit');requestAnimationFrame(animate);
// Small read-only diagnostics and deterministic spatial queries for validation.
window.houseModel={get state(){return {view,selected,height:HEIGHT,tileSize,eyeHeight,position:perspective.position.toArray(),wallCount:walls.length,colliderCount:collisionWalls.length};},canStand,rooms:rooms.map(r=>({id:r.id,at:point(r.at)}))};
