import * as THREE from './vendor/three.module.js';
import {walls,point,SCALE,footprint,insidePolygon,rooms} from './model.js';

// Photo-inspired white rebated profiles, dark seals, two inward-opening leaves.
export const windowLayout=walls.flatMap(w=>(w.open??[]).filter(o=>o.kind==='window').map(o=>{
 const [ax,az]=point(w.a),[bx,bz]=point(w.b),length=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/length,uz=(bz-az)/length;
 const x=ax+ux*o.s/SCALE,z=az+uz*o.s/SCALE,width=(o.e-o.s)/SCALE;
 const mx=x+ux*width/2,mz=z+uz*width/2,side=insidePolygon(mx-uz*.5,mz+ux*.5,footprint)?1:-1;
 const room=rooms.find(r=>insidePolygon(mx-uz*.6*side,mz+ux*.6*side,r.polygon));
 return {x,z,ux,uz,width,side,sill:o.sill,height:o.h,wallThickness:w.t,roomId:room?.id,
  jamb:.045,profile:.055,thickness:.044,duration:.9};
})).map((d,i)=>({...d,id:'window-'+(i+1),name:`Finestra ${rooms.find(r=>r.id===d.roomId)?.name??i+1}${d.roomId==='living'?(d.width<1?' cucina':' soggiorno'):''}`}));
const eased=p=>p*p*(3-2*p);
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export function windowLeafPose(d,index,progress){
 const direction=index===0?1:-1,angle=-d.side*direction*Math.PI/2*eased(progress);
 const hinge=index===0?d.jamb:d.width-d.jamb,depth=d.side*(d.wallThickness/2+.018);
 const dx=direction*Math.cos(angle),dz=-direction*Math.sin(angle);
 return {x:d.x+d.ux*hinge-d.uz*depth,z:d.z+d.uz*hinge+d.ux*depth,
  dx:d.ux*dx-d.uz*dz,dz:d.uz*dx+d.ux*dz,angle,width:(d.width-2*d.jamb-.006)/2};
}
export function windowTouches(d,progress,x,z,r=.18){
 return [0,1].some(index=>{
  const p=windowLeafPose(d,index,progress),dx=x-p.x,dz=z-p.z,u=dx*p.dx+dz*p.dz,v=-dx*p.dz+dz*p.dx;
  const du=u-Math.max(0,Math.min(p.width,u)),dv=Math.max(0,Math.abs(v)-d.thickness);
  return du*du+dv*dv<=r*r;
 });
}
export function createWindows(parent,{onStateChange=()=>{}}={}){
 const group=new THREE.Group();group.name='interactive-windows';parent.add(group);
 const white=new THREE.MeshStandardMaterial({color:'#f7f6f2',roughness:.46,metalness:.04});
 const seal=new THREE.MeshStandardMaterial({color:'#272d2c',roughness:.9});
 const glass=new THREE.MeshPhysicalMaterial({color:'#e4eded',transparent:true,opacity:.15,roughness:.1,metalness:.03,depthWrite:false});
 const unitBox=new THREE.BoxGeometry(1,1,1);
 const add=(root,name,w,h,depth,material,x,y,z)=>{
  const mesh=new THREE.Mesh(unitBox,material);mesh.name=name;mesh.scale.set(w,h,depth);mesh.position.set(x,y,z);
  mesh.castShadow=mesh.receiveShadow=!material.transparent;root.add(mesh);return mesh;
 };
 const windows=windowLayout.map(d=>{
  const root=new THREE.Group();root.name=d.id;root.position.set(d.x,d.sill,d.z);root.rotation.y=-Math.atan2(d.uz,d.ux);group.add(root);
  const outerDepth=d.side*(d.wallThickness/2-.035),pivotDepth=d.side*(d.wallThickness/2+.018);
  for(const x of [d.jamb/2,d.width-d.jamb/2])add(root,'white-window-jamb',d.jamb,d.height,.09,white,x,d.height/2,outerDepth);
  for(const y of [d.jamb/2,d.height-d.jamb/2])add(root,'white-window-head-sill',d.width,d.jamb,.09,white,d.width/2,y,outerDepth);
  const leaves=[0,1].map(index=>{
   const direction=index===0?1:-1,width=(d.width-2*d.jamb-.006)/2,height=d.height-2*d.jamb;
   const leaf=new THREE.Group();leaf.name=index===0?'left-window-leaf':'right-window-leaf';leaf.position.set(index===0?d.jamb:d.width-d.jamb,0,pivotDepth);root.add(leaf);
   const depth=d.side*d.thickness/2;
   for(const x of [d.profile/2,width-d.profile/2])add(leaf,'white-sash-stile',d.profile,height,d.thickness,white,direction*x,d.height/2,depth);
   for(const y of [d.jamb+d.profile/2,d.height-d.jamb-d.profile/2])add(leaf,'white-sash-rail',width,d.profile,d.thickness,white,direction*width/2,y,depth);
   for(const x of [d.profile+.002,width-d.profile-.002])add(leaf,'dark-glazing-seal',.004,height-2*d.profile,.014,seal,direction*x,d.height/2,depth);
   for(const y of [d.jamb+d.profile+.002,d.height-d.jamb-d.profile-.002])add(leaf,'dark-glazing-seal',width-2*d.profile,.004,.014,seal,direction*width/2,y,depth);
   add(leaf,'clear-window-glass',width-2*d.profile-.004,height-2*d.profile-.004,.012,glass,direction*width/2,d.height/2,depth);
   // Subtle raised bead around the glazing and white hinge covers.
   for(const x of [d.profile-.009,width-d.profile+.009])add(leaf,'raised-glazing-bead',.012,height-.024,.008,white,direction*x,d.height/2,d.side*(d.thickness+.004));
   for(const y of [d.jamb+.13,d.height-d.jamb-.13])add(leaf,'white-hinge-cover',.024,.09,.027,white,0,y,d.side*(d.thickness+.008));
   if(index===0){
    const x=direction*(width-d.profile/2),y=d.height*.48;
    add(leaf,'window-handle-plate',.028,.10,.009,white,x,y,d.side*(d.thickness+.005));
    add(leaf,'window-handle-stem',.016,.019,.035,white,x,y,d.side*(d.thickness+.026));
    add(leaf,'white-window-handle',.018,.105,.018,white,x,y-.044,d.side*(d.thickness+.049));
   }
   return leaf;
  });
  return {layout:d,root,leaves,progress:0,target:0,obstructed:false};
 });
 group.updateMatrixWorld(true);
 const find=id=>{const w=windows.find(w=>w.layout.id===id);if(!w)throw new RangeError(`Unknown window: ${id}`);return w;};
 const state=w=>({id:w.layout.id,name:w.layout.name,progress:w.progress,open:w.progress===1,targetOpen:w.target===1,moving:w.progress!==w.target,obstructed:w.obstructed});
 function setOpen(id,open){const w=find(id),target=open?1:0;if(w.target===target)return;w.target=target;w.obstructed=false;onStateChange(state(w));}
 return {group,windows,setOpen,get state(){return windows.map(state);},
  toggle(id){const w=find(id);setOpen(id,w.target===0);},
  blocksPoint(x,z,r=.18){return windows.some(w=>windowTouches(w.layout,w.progress,x,z,r));},
  update(dt,occupants=[]){
   if(!Number.isFinite(dt)||dt<=0)return false;let changed=false;
   for(const w of windows){
    if(w.progress===w.target)continue;
    const next=w.target>w.progress?Math.min(1,w.progress+Math.min(dt,.1)/w.layout.duration):Math.max(0,w.progress-Math.min(dt,.1)/w.layout.duration);
    const samples=Math.max(1,Math.ceil(Math.abs(eased(next)-eased(w.progress))*Math.PI/2*w.layout.width/.008));
    let blocked=false;
    for(let i=1;i<=samples&&!blocked;i++)blocked=occupants.some(p=>(p.top??2)>w.layout.sill&&(p.bottom??0)<w.layout.sill+w.layout.height&&windowTouches(w.layout,w.progress+(next-w.progress)*i/samples,p.x,p.z,(p.r??.20)+.008));
    if(blocked){
     if(w.target===0){w.target=1;w.obstructed=true;onStateChange({...state(w),reopening:true});}
     else if(!w.obstructed){w.obstructed=true;onStateChange(state(w));}
     continue;
    }
    w.obstructed=false;w.progress=next;
    w.leaves.forEach((leaf,i)=>{leaf.rotation.y=windowLeafPose(w.layout,i,next).angle;leaf.updateMatrix();});
    w.root.updateMatrixWorld(true);changed=true;if(next===w.target)onStateChange(state(w));
   }
   return changed;
  },
  pick(raycaster,occluders=[]){
   const hit=windows.filter(w=>visible(w.root)).map(w=>{const h=raycaster.intersectObject(w.root,true)[0];return h?{...h,id:w.layout.id}:null;}).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
   if(!hit)return null;const far=raycaster.far;
   try{raycaster.far=Math.min(far,hit.distance-.003);if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;}
   finally{raycaster.far=far;}return hit;
  }
 };
}
