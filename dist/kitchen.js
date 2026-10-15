import * as THREE from './vendor/three.module.js';
import {kitchenType1} from './kitchen-layout.js?v=20261012-1';
import {roundedTopPoints} from './kitchen-variants.js?v=20261014-5';

// The same module dimensions drive the rendered kitchen and walking collisions.
export function createKitchen(parent,box,{front,wood,ceramic,steel,dark,glass,fabric=front},layout=kitchenType1){
 const {modules:kitchenModules,worktop:kitchenWorktop,sink:kitchenSink,hob:kitchenHob,breakfast:breakfastTop,wallCabinets:kitchenWallCabinets}=layout;
 const group=new THREE.Group();group.name='kitchen';parent.add(group);
 const block=(w,h,d,material,x,y,z)=>box(w,h,d,material,x,y,z,group);
 const mesh=(geometry,material,x,y,z,name)=>{
  const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);
  object.name=name;object.castShadow=object.receiveShadow=true;group.add(object);return object;
 };
 const face=(m,y,h,material=front,inset=0)=>{
  const {x,z,w,d}=m;
  if(m.face==='west'||m.face==='east')return block(.018,h,d-.028,material,x+(m.face==='west'?-1:1)*(w/2-.009-inset),y,z);
  return block(w-.028,h,.018,material,x,y,z-d/2+.009+inset);
 };
 for(const m of kitchenModules){
  if(m.id==='fridge')continue;
  const {x,z,w,d,tall}=m,h=tall?m.h:.90;
  // Open boxes keep the sink bowl and recessed appliance fronts clear.
  block(w-.032,.025,d-.032,front,x,.14,z);
  if(m.face==='west'||m.face==='east'){
   for(const sign of [-1,1])block(w-.028,h-.16,.018,front,x,(h+.16)/2,z+sign*(d/2-.022));
   block(.018,h-.16,d-.028,front,x+(m.face==='west'?1:-1)*(w/2-.022),(h+.16)/2,z);
  }else{
   for(const sign of [-1,1])block(.018,h-.16,d-.028,front,x+sign*(w/2-.022),(h+.16)/2,z);
   block(w-.028,h-.16,.018,front,x,(h+.16)/2,z+d/2-.022);
  }
  if(m.blindCorner){
   // Flush returns meet the neighbouring fronts, with one continuous recessed plinth.
   const side=face({...m,face:'west'},.515,.75);side.name='corner-side-panel';
   const end=face({...m,d:.60,z:14.619},.515,.75);end.name='corner-return-panel';
   block(w-.08,.10,d,dark,x,.055,z).name='corner-plinth';
   continue;
  }
  block(w-.08,.10,d-.08,dark,x,.055,z);
  if(m.id==='integrated-fridge'){
   block(w-.028,.022,d-.028,front,x,h-.011,z);
   face(m,.43,.57).name='integrated-freezer-door';
   face(m,1.30,1.14).name='integrated-fridge-door';
   face(m,2.04,.28).name='integrated-pantry-door';
  }else if(m.id==='peninsula-oven'){
   face(m,.86,.06);face(m,.175,.065);
   face(m,.51,.60,steel).name='peninsula-oven-frame';
   face(m,.475,.46,glass,-.004).name='peninsula-oven-glass';
   block(.024,.09,d-.09,dark,x+w/2+.004,.765,z);
   block(.036,.028,d-.13,steel,x+w/2+.025,.695,z);
   for(const dz of [-.18,.18]){
    const knob=mesh(new THREE.CylinderGeometry(.019,.019,.014,16),steel,x+w/2+.025,.765,z+dz,'peninsula-oven-control');knob.rotation.z=Math.PI/2;
   }
   block(.006,.03,.09,glass,x+w/2+.019,.765,z);
  }else if(m.id==='under-window-oven'){
   face(m,.86,.06);face(m,.175,.065);
   face(m,.51,.60,steel).name='under-window-oven-frame';
   face(m,.475,.46,glass,-.004).name='under-window-oven-glass';
   block(w-.09,.09,.024,dark,x,.765,z-d/2-.004);
   block(w-.13,.028,.036,steel,x,.695,z-d/2-.025);
   for(const dx of [-.18,.18]){
    const knob=mesh(new THREE.CylinderGeometry(.019,.019,.014,16),steel,x+dx,.765,z-d/2-.025,'under-window-oven-control');knob.rotation.x=Math.PI/2;
   }
   block(.09,.03,.006,glass,x,.765,z-d/2-.019);
  }else if(m.id==='oven'){
   block(w-.028,.022,d-.028,front,x,h-.011,z);
   face(m,.45,.61);face(m,1.785,.79);
   face(m,1.065,.60,steel);face(m,1.035,.49,glass,-.004);
   block(.025,.10,d-.095,dark,x-w/2-.007,1.30,z);
   block(.026,.30,d-.16,dark,x-w/2-.011,1.00,z);
   block(.045,.026,d-.13,steel,x-w/2-.035,1.245,z);
   for(const dz of [-.18,.18]){
    const knob=mesh(new THREE.CylinderGeometry(.021,.021,.016,16),steel,x-w/2-.029,1.30,z+dz,'oven-control');knob.rotation.z=Math.PI/2;
   }
   block(.005,.036,.09,glass,x-w/2-.030,1.30,z);
  }else if(m.id==='sink'||m.plain)face(m,.515,.75);
  else if(m.id==='dishwasher'){
   face(m,.515,.75);
   block(.021,.026,d-.12,dark,x-w/2-.002,.855,z);
  }else if(m.id==='window-return'){
   for(const sign of [-1,1])for(const y of [.27,.53,.79])block(w/2-.02,.235,.018,front,x+sign*w/4,y,z-d/2+.009);
 }else for(const y of [.27,.53,.79])face(m,y,.235);
 }

 // Continuous ceramic with a real through-opening for the single inset sink.
 const outline=new THREE.Shape();
 kitchenWorktop.outline.forEach(([x,z],i)=>i?outline.lineTo(x,-z):outline.moveTo(x,-z));outline.closePath();
 const {x:sx,z:sz,w:sw,d:sd,depth}=kitchenSink;
 const hole=new THREE.Path();hole.moveTo(sx-sw/2,-sz-sd/2);hole.lineTo(sx+sw/2,-sz-sd/2);
 hole.lineTo(sx+sw/2,-sz+sd/2);hole.lineTo(sx-sw/2,-sz+sd/2);hole.closePath();outline.holes.push(hole);
 const worktop=mesh(new THREE.ExtrudeGeometry(outline,{depth:kitchenWorktop.thickness,bevelEnabled:false,steps:1}),ceramic,0,kitchenWorktop.y-kitchenWorktop.thickness,0,'ceramic-worktop');worktop.rotation.x=-Math.PI/2;
 const uv=worktop.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);
 const rimY=kitchenWorktop.y+.003;
 for(const sign of [-1,1]){
  block(.016,.012,sd+.028,steel,sx+sign*(sw/2+.003),rimY,sz);
  block(sw,.012,.016,steel,sx,rimY,sz+sign*(sd/2+.003));
  block(.012,depth,sd,steel,sx+sign*(sw/2-.006),rimY-depth/2,sz);
  block(sw,depth,.012,steel,sx,rimY-depth/2,sz+sign*(sd/2-.006));
 }
 block(sw,.012,sd,steel,sx,rimY-depth,sz);
 mesh(new THREE.CylinderGeometry(.024,.024,.004,24),dark,sx,rimY-depth+.009,sz,'sink-drain');
 const tapPath=new THREE.CatmullRomCurve3([
  new THREE.Vector3(sx+.235,.945,sz),new THREE.Vector3(sx+.235,1.24,sz),
  new THREE.Vector3(sx+.17,1.31,sz),new THREE.Vector3(sx+.04,1.26,sz),new THREE.Vector3(sx+.04,1.19,sz),
 ]);
 mesh(new THREE.TubeGeometry(tapPath,28,.013,10,false),steel,0,0,0,'sink-tap');
 block(.025,.08,.015,steel,sx+.235,1.01,sz+.045);

 const hob=mesh(new THREE.BoxGeometry(kitchenHob.w,.012,kitchenHob.d),glass,kitchenHob.x,.941,kitchenHob.z,'induction-hob');
 for(const [dx,dz,r] of [[-.13,-.18,.087],[.13,-.18,.095],[-.13,.16,.102],[.13,.16,.088]]){
  const ring=mesh(new THREE.TorusGeometry(r,.0016,6,48),steel,hob.position.x+(kitchenHob.turned?dz:dx),.948,hob.position.z+(kitchenHob.turned?-dx:dz),'induction-zone');ring.rotation.x=-Math.PI/2;
 }
 for(const dz of [-.10,0,.10]){
  if(kitchenHob.turned)block(.006,.002,.018,steel,hob.position.x+dz,.948,hob.position.z-.218);
  else block(.018,.002,.006,steel,hob.position.x+.218,.948,hob.position.z+dz);
 }
 // Both breakfast surfaces rest on the ceramic, with no dining pedestal.
 if(breakfastTop.shape==='rounded-square'){
  const shape=new THREE.Shape(roundedTopPoints(breakfastTop).map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:breakfastTop.h,bevelEnabled:false,steps:1});
  const positions=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(positions.getX(i)-breakfastTop.x)/breakfastTop.w+.5,(-positions.getY(i)-breakfastTop.z)/breakfastTop.d+.5);
  const top=mesh(geometry,wood,0,breakfastTop.bottom,0,'breakfast-rounded-top');top.rotation.x=-Math.PI/2;
 }else mesh(new THREE.CylinderGeometry(breakfastTop.r,breakfastTop.r,breakfastTop.h,64),wood,breakfastTop.x,breakfastTop.bottom+breakfastTop.h/2,breakfastTop.z,'breakfast-disc');

 // Two compact upholstered stools tucked into the oak overhang (Type 3 only).
 for(const {x,z,angle} of layout.stools??[]){
  const stool=new THREE.Group();stool.name='breakfast-stool';stool.position.set(x,0,z);stool.rotation.y=angle;group.add(stool);
  const part=(geometry,material,px,y,pz)=>{const m=new THREE.Mesh(geometry,material);m.position.set(px,y,pz);m.castShadow=m.receiveShadow=true;stool.add(m);return m;};
  const seat=part(new THREE.SphereGeometry(1,20,12),fabric,0,.64,0);seat.scale.set(.235,.045,.22);
  const stoolBackMaterial=fabric.side===THREE.DoubleSide?fabric:fabric.clone();stoolBackMaterial.side=THREE.DoubleSide;
  part(new THREE.CylinderGeometry(.24,.22,.21,20,1,true,Math.PI/2,Math.PI),stoolBackMaterial,0,.76,0);
  for(const dx of [-.16,.16])for(const dz of [-.15,.15])part(new THREE.CylinderGeometry(.016,.021,.59,10),dark,dx,.315,dz);
  const rail=part(new THREE.TorusGeometry(.18,.012,6,20),dark,0,.25,0);rail.rotation.x=Math.PI/2;
 }

 if(layout.backsplash){
  const {x,z,w,bottom,h}=layout.backsplash;
  const grout=new THREE.MeshStandardMaterial({color:'#bdbbb3',roughness:1});
  const tile=new THREE.MeshStandardMaterial({color:'#eee9df',roughness:.38});
  block(w,h,.009,grout,x,bottom+h/2,z).name='hob-backsplash';
  const columns=6,rows=6;
  for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
   block(w/columns-.003,h/rows-.003,.012,tile,x-w/2+(col+.5)*w/columns,bottom+(row+.5)*h/rows,z-.007).name='backsplash-tile';
  }
 }

 // Handleless wall cabinets follow the two red areas of the user's sketch.
 // Carcasses are recessed behind the door fronts, preserving clean shadow gaps.
 for(const cabinet of kitchenWallCabinets){
  const {x,z,w,d,bottom,h,rows}=cabinet,y=bottom+h/2;
  const shell=cabinet.face==='west'
   ?block(w-.028,h,d,wood,x+.014,y,z)
   :block(w,h,d-.028,wood,x,y,z+.014);
  shell.name=cabinet.id+'-carcass';
  for(let row=0;row<rows;row++){
   const door=face(cabinet,bottom+(row+.5)*h/rows,h/rows-.014);
   door.name=cabinet.id+'-front-'+row;
  }
 }

 // Rounded enamel body and chrome handle: an illustrative retro fridge.
 const fridge=kitchenModules.find(m=>m.id==='fridge');
 if(fridge){
 const pink=new THREE.MeshPhysicalMaterial({color:'#eaa7b8',roughness:.28,metalness:.06,clearcoat:.5,clearcoatRoughness:.2});
 function roundedBox(w,h,d,r,material,x,y,z,name){
  const geometry=new THREE.BoxGeometry(w,h,d,8,8,8),p=geometry.attributes.position,n=geometry.attributes.normal;
  const v=new THREE.Vector3(),core=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i);core.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));
   normal.copy(v).sub(core).normalize();v.copy(core).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  return mesh(geometry,material,x,y,z,name);
 }
 roundedBox(.62,1.54,.63,.065,pink,fridge.x,.85,14.589,'pink-fridge-body');
 roundedBox(.59,1.47,.078,.034,dark,fridge.x,.85,14.274,'fridge-door-seal');
 roundedBox(.59,1.47,.10,.045,pink,fridge.x,.85,14.244,'pink-fridge-door');
 for(const y of [.92,1.23])block(.026,.026,.05,steel,fridge.x-.205,y,14.195);
 mesh(new THREE.CylinderGeometry(.016,.016,.34,20),steel,fridge.x-.205,1.075,14.188,'fridge-handle');
 for(const dx of [-.22,.22])for(const dz of [-.23,.23])block(.055,.08,.055,dark,fridge.x+dx,.04,fridge.z+dz);
 }
 return group;
}
