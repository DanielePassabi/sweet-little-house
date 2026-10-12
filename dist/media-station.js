import * as THREE from './vendor/three.module.js';
import {television as tv,desktopPC as pc,gameControllers,cableDuct as duct} from './media-layout.js?v=20261012-1';

// Local X = width seen from the sofa, +Z = toward the viewer, Y = vertical.
export function createMediaStation(parent,box,{black,screen,wall}){
 const station=new THREE.Group();station.name='media-station';station.position.set(tv.frontX,0,tv.centerZ);station.rotation.y=Math.PI/2;parent.add(station);
 const matte=new THREE.MeshStandardMaterial({color:'#171a20',roughness:.73});
 const graphite=new THREE.MeshStandardMaterial({color:'#303640',roughness:.48,metalness:.3});
 const board=new THREE.MeshStandardMaterial({color:'#18262b',roughness:.85});
 const rubber=new THREE.MeshStandardMaterial({color:'#080a0d',roughness:1});
 const blue=new THREE.MeshStandardMaterial({color:'#809eff',emissive:'#506fff',emissiveIntensity:1.7,roughness:.35});
 const whiteLED=new THREE.MeshStandardMaterial({color:'#dbe9ff',emissive:'#a5baff',emissiveIntensity:1.8});
 const glass=new THREE.MeshPhysicalMaterial({color:'#8092b5',transparent:true,opacity:.16,roughness:.13,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
 const block=(root,name,w,h,d,material,x,y,z)=>{const m=box(w,h,d,material,x,y,z,root);m.name=name;return m;};
 const add=(root,name,geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const tube=(root,name,points,r,material)=>add(root,name,new THREE.TubeGeometry(Array.isArray(points)?new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))):points,48,r,6,false),material,0,0,0);
 const pooled=new Map(),dummy=new THREE.Object3D();
 function instance(root,name,geometry,material,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){
  const key=root.uuid+geometry.uuid+material.uuid;
  if(!pooled.has(key))pooled.set(key,{root,name,geometry,material,matrices:[]});
  dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();pooled.get(key).matrices.push(dummy.matrix.clone());
 }

 const display=new THREE.Group();display.name='lg-c1-83';station.add(display);
 // The thin OLED panel and thicker lower electronics housing share LG's outer dimensions.
 block(display,'oled-panel',tv.width,tv.height,.005,black,0,tv.centerY,-.0025);
 block(display,'oled-electronics',1.12,.51,tv.depth-.005,matte,0,tv.centerY-tv.height/2+.255,-(tv.depth+.005)/2);
 const picture=add(display,'oled-screen',new THREE.PlaneGeometry(1.833,1.833*9/16),screen,0,tv.centerY,.00001);picture.castShadow=false;
 block(station,'tv-wall-bracket',.36,.28,.024,graphite,0,1.33,-.069);
 block(station,'central-cable-duct',duct.width,duct.top-duct.bottom,duct.depth,wall,0,(duct.top+duct.bottom)/2,duct.z);
 // Cover seams give the narrow wall-coloured raceway a readable edge.
 const seam=new THREE.MeshStandardMaterial({color:'#b9bdb9',roughness:.9});
 for(const x of [-.018,.018])block(station,'duct-cover-seam',.0007,.48,.001,seam,x,.69,duct.z+duct.depth/2+.001);

 const tower=new THREE.Group();tower.name='desktop-pc';tower.position.set(pc.x,pc.bottom,pc.z);station.add(tower);
 const w=pc.width,h=pc.height,d=pc.depth;
 for(const x of [-w/2+.045,w/2-.045])for(const z of [-d/2+.035,d/2-.035])block(tower,'pc-foot',.036,.016,.031,rubber,x,.008,z);
 block(tower,'pc-floor',w,.016,d,black,0,.024,0);
 block(tower,'pc-roof',w,.016,d,black,0,h-.008,0);
 block(tower,'pc-back-side',w,h-.032,.012,black,0,h/2,-d/2+.006);
 for(const x of [-w/2+.009,w/2-.009]){
  block(tower,'pc-end-frame',.018,h-.032,d,matte,x,h/2,0);
  block(tower,'glass-frame-upright',.018,h-.035,.012,black,x,h/2,d/2-.006);
 }
 // Vent slots on the front and top, both visible from an oblique angle.
 for(let i=0;i<17;i++)block(tower,'front-vent',.003,.34,.006,graphite,w/2+.001,h/2,-.09+i*.011);
 for(let i=0;i<15;i++)block(tower,'top-vent',.004,.001,.15,graphite,-.16+i*.022,h+.0005,-.012);
 block(tower,'motherboard',.30,.29,.009,board,-.025,.285,-.089);
 for(const x of [-.15,-.125,-.10,-.075])block(tower,'board-heatsink',.013,.08,.019,graphite,x,.36,-.071);
 block(tower,'power-supply-shroud',w-.027,.075,d-.022,matte,0,.069,0);
 block(tower,'graphics-card',.29,.043,.137,graphite,-.028,.159,-.006);
 block(tower,'gpu-top-plate',.30,.004,.145,black,-.028,.183,-.006);
 for(let i=0;i<18;i++)block(tower,'gpu-cooling-fin',.007,.022,.002,matte,-.16+i*.015,.156,.064);
 block(tower,'gpu-light-strip',.11,.005,.003,blue,-.055,.173,.066);
 for(const x of [.043,.063]){
  block(tower,'ram-stick',.014,.137,.025,graphite,x,.311,-.059);
  block(tower,'ram-light',.007,.127,.006,whiteLED,x,.313,-.042);
 }
 block(tower,'liquid-cooling-pump',.067,.067,.036,matte,-.04,.302,-.035);
 const pumpShape=new THREE.Shape();pumpShape.moveTo(-.025,-.029);pumpShape.lineTo(.025,-.029);pumpShape.quadraticCurveTo(.03,-.029,.03,-.024);pumpShape.lineTo(.03,.024);pumpShape.quadraticCurveTo(.03,.029,.025,.029);pumpShape.lineTo(-.025,.029);pumpShape.quadraticCurveTo(-.03,.029,-.03,.024);pumpShape.lineTo(-.03,-.024);pumpShape.quadraticCurveTo(-.03,-.029,-.025,-.029);
 const pumpPoints=pumpShape.getPoints(40).map(p=>new THREE.Vector3(p.x-.04,p.y+.302,-.014));
 add(tower,'pump-light-border',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pumpPoints,true),48,.0018,5,true),blue,0,0,0);
 block(tower,'pump-indicator',.012,.008,.002,whiteLED,-.04,.302,-.012);
 for(const delta of [0,.014])tube(tower,'coolant-tube',[[.001,.286+delta,-.01],[.053,.225+delta,.037],[.14,.276+delta,.040],[.18,.396+delta,-.018]],.006,rubber);
 const fanRing=new THREE.TorusGeometry(.047,.004,7,28),fanHub=new THREE.CylinderGeometry(.012,.012,.014,16),blade=new THREE.SphereGeometry(1,10,6);
 for(const [x,y] of [[-.191,.33],[.191,.25],[.191,.365]]){
  instance(tower,'case-fan-rings',fanRing,graphite,x,y,-.018,0,Math.PI/2);
  instance(tower,'case-fan-hubs',fanHub,matte,x,y,-.018,0,0,Math.PI/2);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;instance(tower,'case-fan-blades',blade,graphite,x,y+Math.cos(a)*.028,-.018+Math.sin(a)*.028,a,0,0,.003,.025,.010);}
 }
 const pane=add(tower,'pc-tempered-glass',new THREE.PlaneGeometry(w-.029,h-.045),glass,0,h/2+.004,d/2+.001);pane.castShadow=false;
 const glow=new THREE.PointLight('#7387ff',.075,.45,2);glow.name='pc-internal-blue-light';glow.position.set(.015,.285,.060);tower.add(glow);
 const screwGeometry=new THREE.CylinderGeometry(.003,.003,.002,8);
 for(const x of [-w/2+.019,w/2-.019])for(const y of [.039,h-.023])instance(tower,'glass-fasteners',screwGeometry,graphite,x,y,d/2+.002,Math.PI/2);
 block(tower,'power-button',.013,.002,.014,blue,.177,h+.002,.056);
 for(const x of [.133,.153])block(tower,'usb-port',.012,.002,.004,rubber,x,h+.002,.060);

 // HDMI goes to the TV centre; both power leads disappear behind the cabinet.
 const hdmiPath=new THREE.CurvePath();
 hdmiPath.add(new THREE.CatmullRomCurve3([[pc.x-w/2-.002,pc.bottom+.18,pc.z],[pc.x-w/2-.035,.56,.03],[-.84,.48,-.045],[-.20,.47,-.074],[-.008,.51,duct.z]].map(p=>new THREE.Vector3(...p))));
 hdmiPath.add(new THREE.LineCurve3(new THREE.Vector3(-.008,.51,duct.z),new THREE.Vector3(-.008,1.41,duct.z)));
 hdmiPath.add(new THREE.LineCurve3(new THREE.Vector3(-.008,1.41,duct.z),new THREE.Vector3(0,tv.centerY,-.055)));
 tube(station,'pc-hdmi-cable',hdmiPath,.003,rubber);
 const powerPath=new THREE.CurvePath();
 powerPath.add(new THREE.LineCurve3(new THREE.Vector3(.008,.23,duct.z),new THREE.Vector3(.008,1.39,duct.z)));
 powerPath.add(new THREE.LineCurve3(new THREE.Vector3(.008,1.39,duct.z),new THREE.Vector3(.04,tv.centerY,-.055)));
 tube(station,'tv-power-cable',powerPath,.0025,rubber);
 tube(station,'pc-power-cable',[[pc.x-w/2-.002,pc.bottom+.06,pc.z-.05],[-.99,.48,.012],[-.94,.36,-.075],[-.80,.20,-.078]],.0035,rubber);

 // A shared curved silhouette and two moulded wings form each DualSense-style pad.
 function extrude(shape,depth,bevel=.002){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:10});g.rotateX(-Math.PI/2);return g;}
 const outline=new THREE.Shape();outline.moveTo(-.055,.046);outline.bezierCurveTo(-.077,.044,-.085,-.023,-.074,-.055);outline.bezierCurveTo(-.063,-.063,-.049,-.025,-.035,-.020);outline.quadraticCurveTo(0,-.010,.035,-.020);outline.bezierCurveTo(.049,-.025,.063,-.063,.074,-.055);outline.bezierCurveTo(.085,-.023,.077,.044,.055,.046);outline.quadraticCurveTo(0,.051,-.055,.046);
 const shell=extrude(outline,.020,.003);
 const wing=new THREE.Shape();wing.moveTo(-.026,.044);wing.lineTo(-.055,.044);wing.bezierCurveTo(-.074,.042,-.082,-.020,-.072,-.054);wing.bezierCurveTo(-.062,-.056,-.052,-.023,-.039,-.015);wing.quadraticCurveTo(-.027,.001,-.026,.044);
 const leftWing=extrude(wing,.007),rightWing=leftWing.clone();rightWing.scale(-1,1,1);
 // Reverse winding after mirroring geometry so the right wing remains front-facing.
 const mirroredIndex=rightWing.index;
 if(mirroredIndex){for(let i=0;i<mirroredIndex.count;i+=3){const a=mirroredIndex.getX(i);mirroredIndex.setX(i,mirroredIndex.getX(i+2));mirroredIndex.setX(i+2,a);}}
 else{for(const attribute of Object.values(rightWing.attributes))for(let i=0;i<attribute.count;i+=3)for(let j=0;j<attribute.itemSize;j++){const a=attribute.array[i*attribute.itemSize+j];attribute.array[i*attribute.itemSize+j]=attribute.array[(i+2)*attribute.itemSize+j];attribute.array[(i+2)*attribute.itemSize+j]=a;}}
 const buttonGeo=new THREE.CylinderGeometry(.0054,.0054,.0025,16),stickGeo=new THREE.CylinderGeometry(.009,.009,.006,20),stickRing=new THREE.TorusGeometry(.007,.001,5,20);
 for(const controller of gameControllers){
  const pad=new THREE.Group();pad.name=controller.name;pad.position.set(controller.x,pc.bottom+.006,controller.z);pad.rotation.y=controller.angle;station.add(pad);
  const colour=new THREE.MeshStandardMaterial({color:controller.color,roughness:.72});
  add(pad,'controller-body',shell,rubber,0,0,0);
  add(pad,'controller-left-grip',leftWing,colour,0,.018,0);add(pad,'controller-right-grip',rightWing,colour,0,.018,0);
  // Rounded touchpad matches the broad centre plate in both reference controllers.
  const touch=new THREE.Shape();touch.moveTo(-.025,-.040);touch.lineTo(.025,-.040);touch.quadraticCurveTo(.030,-.040,.030,-.035);touch.lineTo(.027,-.012);touch.quadraticCurveTo(.027,-.007,.022,-.007);touch.lineTo(-.022,-.007);touch.quadraticCurveTo(-.027,-.007,-.027,-.012);touch.lineTo(-.030,-.035);touch.quadraticCurveTo(-.030,-.040,-.025,-.040);
  // Shape coordinates above are local Z, so flip the touchpad's placement along Z.
  const touchGeometry=extrude(touch,.004,.0015);touchGeometry.rotateY(Math.PI);
  add(pad,'controller-touchpad',touchGeometry,colour,0,.023,0);
  for(const x of [-.027,.027]){
   instance(pad,'analogue-sticks',stickGeo,rubber,x,.030,.016);
   instance(pad,'stick-rims',stickRing,graphite,x,.0332,.016,-Math.PI/2);
  }
  for(const [x,z] of [[-.047,-.030],[-.047,-.010],[-.057,-.020],[-.037,-.020]])block(pad,'direction-button',.008,.003,.008,graphite,x,.029,z);
  const faceSymbols=[['triangle',.047,-.032,'#43a396'],['circle',.059,-.020,'#d9757f'],['cross',.047,-.008,'#7dadd0'],['square',.035,-.020,'#c78bab']];
  for(const [symbol,x,z,color] of faceSymbols){
   instance(pad,'face-buttons',buttonGeo,controller.retro?rubber:colour,x,.029,z);
   const ink=new THREE.MeshBasicMaterial({color:controller.retro?color:'#777971'}),r=.0033;
   const strokes=symbol==='circle'?[Array.from({length:17},(_,i)=>[Math.cos(i*Math.PI/8)*r,Math.sin(i*Math.PI/8)*r])]:symbol==='triangle'?[[[0,-r],[r,r],[-r,r],[0,-r]]]:symbol==='square'?[[[-r,-r],[r,-r],[r,r],[-r,r],[-r,-r]]]:[[[-r,-r],[r,r]],[[-r,r],[r,-r]]];
   for(const stroke of strokes){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(stroke.map(([dx,dz])=>new THREE.Vector3(x+dx,.0306,z+dz))),ink);line.name='button-symbol-'+symbol;pad.add(line);}
  }
  block(pad,'home-button',.005,.002,.006,controller.retro?blue:graphite,0,.024,.020);
  for(const x of [-.034,.034])block(pad,'shoulder-button',.025,.008,.010,matte,x,.018,-.049);
 }
 for(const {root,name,geometry,material,matrices} of pooled.values()){
  const m=new THREE.InstancedMesh(geometry,material,matrices.length);m.name=name;matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=m.receiveShadow=true;m.computeBoundingBox();m.computeBoundingSphere();root.add(m);
 }
 return station;
}
