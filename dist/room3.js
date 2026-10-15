import * as THREE from './vendor/three.module.js';
import {room3Desk as desk,room3Monitor as monitor,room3Laptop as laptop,room3Chair as chair,room3Sofa as sofa} from './room3-layout.js?v=20261015-1';

export function createRoom3(parent,box,{wood,black,upholstery,accent,sofaFabric,screen}){
 const room=new THREE.Group();room.name='room3-furniture';parent.add(room);
 const metal=new THREE.MeshStandardMaterial({color:'#34383d',metalness:.65,roughness:.42});
 const rubber=new THREE.MeshStandardMaterial({color:'#12151a',roughness:.92});
 const stitching=new THREE.MeshStandardMaterial({color:'#b7b9bb',roughness:1});
 const led=new THREE.MeshStandardMaterial({color:'#b6c7fa',emissive:'#718bd0',emissiveIntensity:.6,roughness:.5});
 const keyGlow=new THREE.MeshStandardMaterial({color:'#1e263a',emissive:'#1c294b',emissiveIntensity:.25,roughness:.75});
 const block=(root,name,w,h,d,material,x,y,z)=>{const m=box(w,h,d,material,x,y,z,root);m.name=name;return m;};
 const part=(root,name,geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const group=(root,name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);root.add(g);return g;};
 const cache=new Map();
 function rounded(w,h,d,r,segments=6){
  const key=[w,h,d,r,segments].join(',');if(cache.has(key))return cache.get(key);
  const geometry=new THREE.BoxGeometry(w,h,d,segments,segments,segments),p=geometry.attributes.position,n=geometry.attributes.normal;
  const half=new THREE.Vector3(w/2-r,h/2-r,d/2-r),low=half.clone().negate(),v=new THREE.Vector3(),core=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i);core.copy(v).clamp(low,half);normal.copy(v).sub(core).normalize();v.copy(core).addScaledVector(normal,r);
   p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();cache.set(key,geometry);return geometry;
 }
 const soft=(root,name,w,h,d,r,mat,x,y,z)=>part(root,name,rounded(w,h,d,r),mat,x,y,z);
 function rod(root,name,a,b,r,material=metal){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=part(root,name,new THREE.CylinderGeometry(r,r,delta.length(),12),material,...start.clone().add(end).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
 }
 function cable(root,name,points,r=.004,material=rubber){
  return part(root,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),material);
 }
 function batch(root,name,geometry,material,transforms){
  const mesh=new THREE.InstancedMesh(geometry,material,transforms.length),dummy=new THREE.Object3D();mesh.name=name;
  transforms.forEach(({p,s=[1,1,1],r=[0,0,0]},i)=>{dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);return mesh;
 }

 const station=group(room,'joined-workstation',desk.x,0,desk.z);station.rotation.y=desk.turn;
 for(const side of [-1,1]){
  const table=group(station,'desk-half-'+(side<0?'left':'right'),side*desk.width/4);
  block(table,'desk-top',desk.width/2,desk.thickness,desk.depth,wood,0,desk.top-desk.thickness/2,0);
  for(const x of [-.43,.43])for(const z of [-.25,.25])block(table,'desk-leg',.045,.72,.045,black,x,.36,z);
  block(table,'desk-rear-rail',.90,.045,.035,black,0,.68,-.25);
 }
 // One central clamp and pole split into two independently articulated supports.
 const arm=group(station,'dual-monitor-arm');
 block(arm,'central-clamp-top',.085,.025,.075,black,0,desk.top+.0125,-.2825);
 block(arm,'central-clamp-back',.085,.13,.016,black,0,desk.top-.045,-.312);
 block(arm,'central-clamp-bottom',.075,.015,.075,black,0,desk.top-.105,-.2825);
 rod(arm,'clamp-screw',[0,desk.top-.105,-.27],[0,desk.top-.066,-.27],.009);
 rod(arm,'central-arm-pole',[0,desk.top+.025,-.27],[0,1.48,-.27],.021,black);
 for(const y of [1.10,1.23])rod(arm,'arm-pole-collar',[0,y-.032,-.27],[0,y+.032,-.27],.032,black);
 const monitorArm=[[0,1.23,-.27],[.17,1.23,-.27],[monitor.x,monitor.y,-.23],[monitor.x,monitor.y,monitor.z-.025]];
 const laptopArm=[[0,1.10,-.27],[-.23,1.10,-.27],[laptop.x,1.035,-.15],[laptop.x,1.052,laptop.z]];
 for(const [name,points] of [['monitor',monitorArm],['laptop',laptopArm]]){
  for(let i=1;i<points.length;i++)rod(arm,name+'-arm-link',points[i-1],points[i],.017,black);
  for(const [x,y,z] of points.slice(1,-1))rod(arm,name+'-arm-joint',[x,y-.025,z],[x,y+.025,z],.025,metal);
 }
 const display=group(station,'monitor-27-inch',monitor.x,monitor.y,monitor.z);
 soft(display,'monitor-frame',monitor.width+.016,monitor.height+.018,.035,.006,black,0,0,0);
 block(display,'monitor-vesa-mount',.10,.10,.023,metal,0,0,-.026);
 part(display,'monitor-active-screen',new THREE.PlaneGeometry(monitor.width,monitor.height),screen,0,0,.018);
 block(display,'monitor-status-led',.004,.002,.001,led,monitor.width/2-.012,-monitor.height/2-.004,.019);
 // Laptop and tray tilt together, while the open lid leans back toward the wall.
 const portable=group(station,'black-laptop-on-arm',laptop.x,laptop.y,laptop.z);portable.rotation.x=laptop.tilt;
 soft(portable,'laptop-support-tray',.36,.015,.25,.005,metal,0,-.008,0);
 for(const x of [-.165,.165])block(portable,'tray-front-stop',.025,.024,.014,black,x,.008,.119);
 soft(portable,'laptop-base',laptop.width,.021,laptop.depth,.006,black,0,.012,0);
 block(portable,'laptop-keyboard-well',.334,.002,.11,rubber,0,.023,-.034);
 block(portable,'laptop-trackpad',.105,.001,.065,metal,0,.024,.067);
 const laptopKeys=[];for(let row=0;row<5;row++)for(let col=0;col<15;col++)laptopKeys.push({p:[-.155+col*.022,.026,-.077+row*.021]});
 batch(portable,'laptop-keys',new THREE.BoxGeometry(.018,.003,.016),accent,laptopKeys);
 const lid=group(portable,'laptop-open-lid',0,.023,-.119);lid.rotation.x=-.48;
 soft(lid,'laptop-lid-frame',.38,.242,.014,.005,black,0,.121,0);
 part(lid,'laptop-screen',new THREE.PlaneGeometry(.354,.218),screen,0,.123,.0075);
 cable(station,'monitor-cable',[[monitor.x,1.24,-.169],[.20,1.13,-.24],[0,1.16,-.292],[.015,.73,-.285],[.20,.62,-.25]]);
 cable(station,'laptop-cable',[[laptop.x+.19,1.08,-.02],[-.17,.98,-.15],[0,1.05,-.292],[.015,.73,-.285],[.20,.62,-.25]]);

 // Full-size mechanical keyboard: raised keys, function row, arrows and numpad.
 block(station,'desk-mat',.83,.003,.32,rubber,.13,desk.top+.002,.125);
 const keyboard=group(station,'mechanical-keyboard',.06,desk.top+.004,.13);
 soft(keyboard,'keyboard-case',.445,.021,.155,.007,black,0,.0105,0);
 block(keyboard,'keyboard-backlight',.425,.002,.136,keyGlow,0,.022,0);
 const keys=[];
 for(let row=0;row<5;row++)for(let col=0;col<14;col++){
  if(row===4&&col>2&&col<9)continue;
  keys.push({p:[-.202+col*.019,.03,-.033+row*.021]});
 }
 keys.push({p:[-.098,.03,.051],s:[5.8,1,1]});
 for(let i=0;i<13;i++)keys.push({p:[-.202+i*.021,.03,-.062],s:[.9,1,.8]});
 for(let row=0;row<5;row++)for(let col=0;col<4;col++)keys.push({p:[.143+col*.019,.03,-.033+row*.021]});
 for(const [x,z] of [[.087,.03],[.106,.03],[.125,.03],[.106,.009]])keys.push({p:[x,.03,z]});
 batch(keyboard,'mechanical-keycaps',rounded(.016,.013,.017,.002,2),black,keys);
 batch(keyboard,'key-legends',new THREE.BoxGeometry(.005,.0006,.001),led,keys.map(k=>({p:[k.p[0],.0368,k.p[2]],s:k.s})));
 const mouse=group(station,'desk-mouse',.39,desk.top+.004,.15);
 const mouseBody=part(mouse,'mouse-shell',new THREE.SphereGeometry(1,20,12),black,0,.018,0);mouseBody.scale.set(.032,.022,.056);
 block(mouse,'mouse-button-split',.001,.002,.042,rubber,0,.039,-.018);
 rod(mouse,'mouse-scroll-wheel',[-.004,.04,-.013],[.004,.04,-.013],.008,metal);
 cable(station,'keyboard-cable',[[.06,desk.top+.02,.05],[.07,desk.top+.013,-.07],[.13,desk.top+.012,-.24],[.20,.62,-.25]],.0025);

 // One black/grey high-back chair, with neck/lumbar pillows and five caster legs.
 const seat=group(station,'gaming-chair',chair.x,0,chair.z);
 rod(seat,'chair-gas-lift',[0,.11,0],[0,.45,0],.028,metal);
 const wheels=[];
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,dx=Math.sin(a),dz=Math.cos(a);
  rod(seat,'chair-star-leg',[0,.17,0],[dx*.30,.085,dz*.30],.025,black);
  for(const sign of [-1,1])wheels.push({p:[dx*.31+Math.cos(a)*sign*.018,.045,dz*.31-Math.sin(a)*sign*.018],r:[0,a,Math.PI/2]});
 }
 batch(seat,'chair-caster-wheels',new THREE.CylinderGeometry(.037,.037,.022,12),rubber,wheels);
 soft(seat,'chair-seat',.52,.115,.51,.045,upholstery,0,.48,-.025);
 for(const side of [-1,1]){
  soft(seat,'chair-seat-bolster',.085,.13,.48,.038,black,side*.235,.525,-.025).rotation.z=side*-.18;
  rod(seat,'chair-armrest-stem',[side*.24,.42,.04],[side*.31,.68,.015],.018,metal);
  soft(seat,'chair-armrest',.105,.065,.28,.03,upholstery,side*.31,.705,-.035);
 }
 const back=group(seat,'chair-high-back',0,.55,.205);back.rotation.x=.085;
 const profile=new THREE.Shape();profile.moveTo(-.21,0);profile.lineTo(-.28,.22);profile.lineTo(-.245,.48);profile.lineTo(-.31,.62);profile.lineTo(-.225,.84);profile.quadraticCurveTo(0,.91,.225,.84);profile.lineTo(.31,.62);profile.lineTo(.245,.48);profile.lineTo(.28,.22);profile.lineTo(.21,0);profile.closePath();
 for(const x of [-.12,.12]){
  const hole=new THREE.Path();hole.moveTo(x-.04,.53);hole.lineTo(x-.04,.64);hole.lineTo(x+.04,.64);hole.lineTo(x+.04,.53);hole.closePath();profile.holes.push(hole);
 }
 const shell=new THREE.ExtrudeGeometry(profile,{depth:.10,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:8});shell.translate(0,0,-.05);
 part(back,'chair-contoured-shell',shell,black);
 soft(back,'chair-grey-inset',.31,.48,.065,.025,accent,0,.28,-.062);
 soft(back,'chair-headrest',.43,.17,.095,.04,accent,0,.795,-.04);
 soft(back,'chair-neck-pillow',.39,.135,.115,.04,upholstery,0,.705,-.095);
 soft(back,'chair-lumbar-pillow',.405,.18,.13,.04,upholstery,0,.135,-.13);
 for(const side of [-1,1]){
  soft(back,'chair-side-wing',.09,.46,.10,.035,accent,side*.238,.315,-.05).rotation.z=side*-.15;
  cable(back,'chair-contrast-stitching',[[side*.24,.05,-.11],[side*.26,.22,-.11],[side*.215,.43,-.11],[side*.29,.61,-.07]],.0014,stitching);
  cable(seat,'chair-seat-stitching',[[side*.20,.566,.18],[side*.218,.574,0],[side*.21,.567,-.235]],.0014,stitching);
 }

 const couch=group(room,'room3-corner-sofa',sofa.minX,0,sofa.minZ);
 // Two rectangular legs form a real L; the inside corner remains walkable.
 soft(couch,'sofa-main-base',sofa.width,.26,sofa.depth,.055,sofaFabric,sofa.width/2,.25,sofa.depth/2);
 soft(couch,'sofa-return-base',sofa.depth,.26,sofa.length-sofa.depth,.055,sofaFabric,sofa.depth/2,.25,(sofa.length+sofa.depth)/2);
 soft(couch,'sofa-back-top-wall',sofa.width,.70,.16,.055,sofaFabric,sofa.width/2,.56,.08);
 soft(couch,'sofa-back-window-wall',.16,.70,sofa.length-.16,.055,sofaFabric,.08,.56,(sofa.length+.16)/2);
 for(const [x,z,w,d] of [[.405,.405,.45,.45],[1.04,.405,.78,.45],[.405,1.06,.45,.81]]){
  soft(couch,'corner-sofa-seat',w,.14,d,.045,sofaFabric,x,sofa.seatHeight-.07,z);
 }
 for(const [x,z,w,d] of [[.49,.19,.57,.15],[1.16,.19,.70,.15],[.19,.95,.15,.73]]){
  soft(couch,'corner-sofa-back-cushion',w,.41,d,.045,sofaFabric,x,.69,z);
 }
 soft(couch,'sofa-end-arm',.16,.36,.57,.06,sofaFabric,sofa.width-.08,.47,.365);
 soft(couch,'sofa-return-arm',.57,.36,.16,.06,sofaFabric,.365,.47,sofa.length-.08);
 const sofaFeet=[[.13,.13],[sofa.width-.13,.13],[sofa.width-.13,.52],[.13,sofa.length-.13],[.52,sofa.length-.13],[.52,.52]];
 batch(couch,'corner-sofa-feet',new THREE.CylinderGeometry(.023,.018,.13,10),black,sofaFeet.map(([x,z])=>({p:[x,.065,z]})));
 return room;
}
