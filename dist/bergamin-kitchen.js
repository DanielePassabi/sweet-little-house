import * as THREE from './vendor/three.module.js';
import {createApplianceDoors} from './appliance-doors.js';
import {addRefrigerator,addDishwasher,addOven} from './bergamin-appliances.js';
import {HEIGHT} from './model.js';
import {cushionGeometry} from './cushion-geometry.js';

// A small prefiltered reflection of the window, pale walls and floor supplies
// the indirect light that the house's direct spotlights cannot reproduce.
function kitchenReflection(){
 const w=128,h=64,data=new Uint16Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=(x+.5)/w,v=(y+.5)/h;
  const floor=THREE.MathUtils.smoothstep(v,.16,.53);
  const ambient=.08+.42*floor+.24*THREE.MathUtils.smoothstep(v,.68,.94);
  const window=Math.abs(u-.75)<.103&&v>.43&&v<.76&&Math.abs(u-.75)>.004;
  const daylight=window?1.8:0,i=(y*w+x)*4;
  data[i]=THREE.DataUtils.toHalfFloat(ambient*1.04+daylight);
  data[i+1]=THREE.DataUtils.toHalfFloat(ambient+daylight);
  data[i+2]=THREE.DataUtils.toHalfFloat(ambient*.96+daylight*1.04);
  data[i+3]=THREE.DataUtils.toHalfFloat(1);
 }
 const map=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.HalfFloatType);
 map.mapping=THREE.EquirectangularReflectionMapping;map.colorSpace=THREE.LinearSRGBColorSpace;
 map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;
 return map;
}

// Vertical oak figure on the shelf backs; the same grain runs lengthwise on the bar.
function oakMaterial(){
 const width=256,height=512,pixels=new Uint8Array(width*height*4);
 function hash(x,y){
  let n=Math.imul(x+1,1597334677)^Math.imul(y+1,3812015801);
  n=Math.imul(n^(n>>>16),2246822507);
  return ((n^(n>>>13))>>>0)/4294967296;
 }
 function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=THREE.MathUtils.smoothstep(x-ix,0,1),fy=THREE.MathUtils.smoothstep(y-iy,0,1);
  const a=THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),fx);
  const b=THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),fx);
  return THREE.MathUtils.lerp(a,b,fy)-.5;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const knot=Math.hypot((u-.67)*13,(v-.36)*2.4);
  const grain=u+.028*noise(4*u,5*v)+.012*Math.sin(6*v+9*u)+.034*Math.exp(-knot*knot*2);
  const rings=Math.sin(355*grain+4*Math.exp(-knot*knot)*Math.cos(8*knot));
  const pores=Math.pow(Math.max(0,Math.sin(grain*820+2*Math.sin(v*18))),10);
  const tone=23*noise(grain*25,v*3)+16*noise(grain*60,v*9)+3*rings-7*pores
   -22*Math.exp(-knot*knot*8)+6*(hash(x,y)-.5);
  const i=(y*width+x)*4;
  pixels[i]=184+tone;pixels[i+1]=148+tone;pixels[i+2]=115+tone;pixels[i+3]=255;
 }
 const map=new THREE.DataTexture(pixels,width,height);
 map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;
 map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.needsUpdate=true;
 return new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:.0005,roughness:.72});
}

function addStools(group,box,stools,black){
 const seat=cushionGeometry(.415,.036,.40,12,[8,2,8],p=>{p.y+=.014*(p.x/.21)**2;});
 const back=cushionGeometry(.39,.19,.025,14,[10,5,2],p=>{p.z+=.045*(p.x/.195)**2-.17*p.y;});
 for(const {x,z,angle} of stools){
  const stool=new THREE.Group();stool.name='breakfast-stool';stool.position.set(x,0,z);stool.rotation.y=angle;group.add(stool);
  for(const [geometry,y,pz] of [[seat,.655,0],[back,.808,-.193]]){
   const panel=new THREE.Mesh(geometry,black);panel.position.set(0,y,pz);
   panel.castShadow=panel.receiveShadow=true;stool.add(panel);
  }
  for(const side of [-1,1]){
   for(const end of [-1,1]){
    const leg=box(.029,.65,.031,black,side*.18,.326,end*.165,stool);
    leg.rotation.z=side*.055;leg.rotation.x=-end*.075;
   }
   box(.026,.16,.027,black,side*.175,.709,-.178,stool).rotation.x=-.12;
   box(.022,.024,.365,black,side*.185,.225,0,stool);
  }
  for(const end of [-1,1])box(.384,.024,.022,black,0,.225,end*.178,stool);
 }
}

function addPendant(group,{x,z,bottom},black,metal){
 const pendant=new THREE.Group();pendant.name='kitchen-pendant';pendant.position.set(x,bottom,z);group.add(pendant);
 const part=(name,g,m,y)=>{
  const p=new THREE.Mesh(g,m);p.name=name;p.position.y=y;p.receiveShadow=true;pendant.add(p);return p;
 };
 const drop=HEIGHT-bottom,shadeHeight=.34;
 part('pendant-canopy',new THREE.CylinderGeometry(.052,.052,.025,24),metal,drop-.0125);
 part('pendant-cord',new THREE.CylinderGeometry(.003,.003,drop-shadeHeight-.025,8),black,(drop+shadeHeight-.025)/2);
 const lead=new THREE.CatmullRomCurve3([
  new THREE.Vector3(.025,drop-.02,0),new THREE.Vector3(.033,drop-.18,0),
  new THREE.Vector3(-.016,shadeHeight+.18,0),new THREE.Vector3(.010,shadeHeight,0)
 ]);
 part('pendant-power-lead',new THREE.TubeGeometry(lead,18,.0025,6,false),black,0);
 const profile=[[.196,0],[.202,.006],[.145,.333],[.14,.34],[.134,.336],[.193,.007],[.196,0]];
 const shade=new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),128);
 const vertices=shade.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const px=vertices.getX(i),pz=vertices.getZ(i);
  const flute=1+.006*Math.cos(32*Math.atan2(pz,px));
  vertices.setXYZ(i,px*flute,vertices.getY(i),pz*flute);
 }
 shade.computeVertexNormals();
 const shell=part('pendant-shade',shade,black,0);shell.castShadow=true;
 const diffuser=part('pendant-diffuser',new THREE.CircleGeometry(.191,48),metal,.012);
 diffuser.rotation.x=Math.PI/2;
 return pendant;
}

export function addBergaminKitchen(group,box,layout,materials){
 const steel=materials.steel.clone(),ceramic=materials.ceramic.clone();
 const front=new THREE.MeshStandardMaterial({color:'#b2a99c',roughness:.88});
 const graphite=new THREE.MeshStandardMaterial({color:'#292d30',roughness:.68});
 const black=new THREE.MeshStandardMaterial({color:'#252525',roughness:.53});
 const enamel=new THREE.MeshStandardMaterial({color:'#37393a',metalness:.26,roughness:.32});
 const trim=new THREE.MeshStandardMaterial({color:'#56585a',metalness:.50,roughness:.34});
 const glass=new THREE.MeshStandardMaterial({color:'#222426',metalness:.28,roughness:.17});
 const oak=oakMaterial();
 const barOak=oak.clone();barOak.color.set('#c5c1bb');
 const shadeFinish=new THREE.MeshStandardMaterial({color:'#303032',metalness:.36,roughness:.29});
 const hobGlass=new THREE.MeshPhysicalMaterial({color:'#17191a',specularIntensity:.22,roughness:.23});
 const liner=new THREE.MeshStandardMaterial({color:'#f0f2ee',roughness:.42});
 const shelfGlass=new THREE.MeshStandardMaterial({color:'#c8dcda',transparent:true,opacity:.46,roughness:.17,depthWrite:false});
 const ovenWindow=new THREE.MeshStandardMaterial({color:'#26292a',transparent:true,opacity:.80,roughness:.2,depthWrite:false});
 const motion=createApplianceDoors(group);
 group.userData.appliances=motion;
 const reflection=kitchenReflection();
 ceramic.color.set('#fff7ee');
 group.userData.finishes=[front,graphite,black,enamel,trim,glass,hobGlass,shadeFinish,oak,barOak,ceramic,steel,liner,shelfGlass,ovenWindow];
 for(const material of group.userData.finishes)material.envMap=reflection;
 const block=(name,w,h,d,material,x,y,z)=>{
  const part=box(w,h,d,material,x,y,z,group);part.name=name;return part;
 };
 for(const m of layout.modules){
  const {id,x,z,w,d}=m,h=m.h??.90;
  const west=['integrated-fridge','sink','dishwasher','right-corner'].includes(id);
  const east=id==='peninsula',across=west||east;
  const width=across?d:w,depth=across?w:d;
  // Place a panel in cabinet coordinates, measuring its inset from the door face.
  const panel=(name,pw,ph,pd,material,offset,y,inset)=>{
   const inward=inset-depth/2;
   return across?block(name,pd,ph,pw,material,x+(west?inward:-inward),y,z+offset)
    :block(name,pw,ph,pd,material,x+offset,y,z+inward);
  };
  panel('graphite-plinth',width-.016,.10,depth-.07,graphite,0,.05,depth/2+.012);
  for(const side of [-1,1])panel('cabinet-side',.018,h-.10,depth,front,side*(width/2-.009),(h+.10)/2,depth/2);
  panel('cabinet-back',width-.036,h-.10,.018,front,0,(h+.10)/2,depth-.009);
  const door=(name,bottom,top,offset=0,pw=width)=>panel(name,pw-.006,top-bottom,.020,front,offset,(bottom+top)/2,.010);
  if(id==='oven-tower'){
   addOven(m,panel,door,motion,{front,enamel,glass,ovenWindow,trim,steel},group);
  }else if(id==='integrated-fridge'){
   addRefrigerator(m,panel,door,motion,{front,graphite,liner,glass:shelfGlass});
  }else if(id==='dishwasher'){
   addDishwasher(m,panel,door,motion,{steel,graphite});
  }else{
   // The two outer modules under the hob share one continuous front per row.
   // Keep the wall-end section separate where it meets the window return.
   const spans=id==='peninsula'?[width*2/3,width/3]:id==='window-return'?[width/2,width/2]:[width];
   let edge=-width/2;
   for(const span of spans){
    const offset=edge+span/2;
    const section=id==='peninsula'&&edge>-width/2?'peninsula-return':id;
    if(id==='shelf-base')door(id+'-front',.102,.865,offset,span);
    else{
     door(section+'-lower-drawer',.102,.48,offset,span);
     door(section+'-upper-drawer',.513,.865,offset,span);
    }
    edge+=span;
   }
   for(const y of [.497,.881])panel('recessed-grip',width-.006,.038,.017,graphite,0,y,.031);
  }
 }
 const [wash,upper,shelves]=layout.wallCabinets;
 const wallX=wash.x+wash.w/2,first=wash.z-wash.d/2,last=wash.z+wash.d/2;
 const splashHeight=wash.bottom-layout.worktop.y;
 block('washing-stone-backsplash',.014,splashHeight,wash.d,ceramic,wallX-.007,layout.worktop.y+splashHeight/2,wash.z);
 const niche=.17,doorSpan=(wash.d-niche)/2,wy=wash.bottom+wash.h/2;
 block('washing-upper-body',wash.w-.024,wash.h,wash.d-niche,front,wash.x+.012,wy,wash.z-niche/2);
 for(let i=0;i<2;i++)block('washing-upper-door',.02,wash.h-.012,doorSpan-.004,front,wallX-wash.w+.010,wy,first+(i+.5)*doorSpan);
 block('upper-door-reveal',.01,wash.h-.014,.006,graphite,wallX-wash.w+.018,wy,first+doorSpan);
 block('fridge-end-trim',.018,2.10,.017,graphite,8.942,1.15,first-.006);
 block('upper-niche-back',.015,wash.h,niche,oak,wallX-.0075,wy,last-niche/2);
 for(const side of [last-niche+.008,last-.008])block('upper-niche-side',wash.w,wash.h,.016,oak,wash.x,wy,side);
 for(const y of [wash.bottom+.009,wy,wash.bottom+wash.h-.009])block('upper-niche-shelf',wash.w,.018,niche,oak,wash.x,y,last-niche/2);
 block('window-upper-body',upper.w,upper.h,upper.d,front,upper.x,upper.bottom+upper.h/2,upper.z);
 block('window-upper-grip',upper.w-.014,.014,.023,graphite,upper.x,upper.bottom+.007,upper.z-upper.d/2);

 const {x,z,w,d,bottom,h}=shelves,top=bottom+h,frame=.025,bay=w/2,rear=z+d/2;
 const tower=layout.modules.find(m=>m.id==='oven-tower');
 for(let i=0;i<2;i++){
  const cx=x+(i-.5)*bay,base=i===0?tower.h:bottom;
  block('oak-niche-back',bay-frame,top-base,.018,oak,cx,(top+base)/2,rear-.009);
  for(const y of [1.50,1.84]){
   block('oak-display-shelf',bay-frame,.023,d,oak,cx,y,z);
   block('shelf-front-rail',bay-frame,.010,.009,graphite,cx,y+.035,z-d/2+.005);
  }
 }
 for(const [cx,base] of [[x-w/2+frame/2,tower.h],[x,bottom],[x+w/2-frame/2,bottom]]){
  block('graphite-upright',frame,top-base,d,graphite,cx,(top+base)/2,z);
 }
 block('graphite-cornice',w,frame,d,graphite,x,top-frame/2,z);
 const bar=layout.breakfast;
 // The bar widens only inside the niche, supporting the back and both uprights.
 const left=bar.x-bar.w/2,right=bar.x+bar.w/2,near=bar.z-bar.d/2;
 const shelfEdge=x+w/2,shelfFace=z-d/2;
 const outline=[[left,near],[right,near],[right,shelfFace],[shelfEdge,shelfFace],[shelfEdge,rear],[left,rear]];
 const shape=new THREE.Shape(outline.map(([px,pz])=>new THREE.Vector2(px,-pz)));
 const boardGeometry=new THREE.ExtrudeGeometry(shape,{depth:bar.h,bevelEnabled:false});
 boardGeometry.rotateX(-Math.PI/2);
 const {position,normal,uv}=boardGeometry.attributes;
 for(let i=0;i<uv.count;i++){
  const along=(position.getZ(i)-near)/(rear-near),across=(position.getX(i)-left)/(shelfEdge-left);
  const edgeHeight=position.getY(i)/(shelfEdge-left);
  uv.setXY(i,Math.abs(normal.getX(i))>.9?edgeHeight:across,Math.abs(normal.getZ(i))>.9?edgeHeight:along);
 }
 const board=new THREE.Mesh(boardGeometry,barOak);board.name='oak-breakfast-bar';
 board.position.y=bar.bottom;board.castShadow=board.receiveShadow=true;group.add(board);
 addStools(group,box,layout.stools,black);
 group.userData.pendant=addPendant(group,layout.pendant,shadeFinish,steel);
 return {ceramic,steel,dark:graphite,glass:hobGlass,markings:enamel};
}
