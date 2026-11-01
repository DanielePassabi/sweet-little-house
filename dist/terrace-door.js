import * as THREE from './vendor/three.module.js';
import {walls,point,SCALE} from './model.js';

const wall=walls.find(w=>w.open?.some(o=>o.kind==='glazed'));
const opening=wall.open.find(o=>o.kind==='glazed');
const [ax,az]=point(wall.a),[bx,bz]=point(wall.b),length=Math.hypot(bx-ax,bz-az);
const ux=(bx-ax)/length,uz=(bz-az)/length;
export const terraceDoorLayout={
 id:'terrace',name:'Portafinestra terrazzo',x:ax+ux*opening.s/SCALE,z:az+uz*opening.s/SCALE,ux,uz,
 width:(opening.e-opening.s)/SCALE,height:opening.h,jamb:.055,overlap:.045,
 profile:.065,thickness:.048,track:.036,duration:1.25,
};
const d=terraceDoorLayout;
d.leafWidth=(d.width-2*d.jamb+d.overlap)/2;
d.closedStart=d.width-d.jamb-d.leafWidth;
d.travel=d.closedStart-d.jamb;
const eased=p=>p*p*(3-2*p);
export const terraceMovingStart=progress=>d.closedStart-d.travel*eased(progress);
function touches(min,max,track,x,z,r){
 const dx=x-d.x,dz=z-d.z,u=dx*d.ux+dz*d.uz,v=-dx*d.uz+dz*d.ux;
 const du=u-Math.max(min,Math.min(max,u)),dv=v-Math.max(track-d.thickness/2,Math.min(track+d.thickness/2,v));
 return du*du+dv*dv<=r*r;
}
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};

export function createTerraceDoor(parent,{onStateChange=()=>{}}={}){
 const group=new THREE.Group();group.name='terrace-sliding-glass-door';
 group.position.set(d.x,0,d.z);group.rotation.y=-Math.atan2(d.uz,d.ux);parent.add(group);
 const frame=new THREE.MeshStandardMaterial({color:'#f7f6f2',roughness:.46,metalness:.04});
 const seal=new THREE.MeshStandardMaterial({color:'#202a2e',roughness:.87});
 const silver=new THREE.MeshStandardMaterial({color:'#d6dde0',roughness:.3,metalness:.5});
 const glass=new THREE.MeshPhysicalMaterial({color:'#d9e7ea',transparent:true,opacity:.16,roughness:.12,metalness:.05,depthWrite:false});
 const add=(parent,name,w,h,depth,mat,x,y,z)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mat);mesh.name=name;mesh.position.set(x,y,z);
  mesh.castShadow=!mat.transparent;mesh.receiveShadow=!mat.transparent;parent.add(mesh);return mesh;
 };
 // Continuous head and low threshold; no fixed mullion across the clear opening.
 for(const x of [d.jamb/2,d.width-d.jamb/2])add(group,'outer-jamb',d.jamb,d.height,.14,frame,x,d.height/2,0);
 add(group,'outer-head',d.width,.045,.14,frame,d.width/2,d.height-.0225,0);
 add(group,'low-threshold',d.width,.018,.15,silver,d.width/2,.009,0);
 for(const z of [-d.track,d.track]){
  add(group,'sliding-guide',d.width-2*d.jamb,.008,.009,silver,d.width/2,.022,z);
  add(group,'upper-guide',d.width-2*d.jamb,.006,.012,seal,d.width/2,d.height-.047,z);
 }
 const bottom=.026,top=d.height-.049,leafHeight=top-bottom;
 function leaf(name,start,track){
  const root=new THREE.Group();root.name=name;root.position.set(start,0,track);group.add(root);
  for(const x of [d.profile/2,d.leafWidth-d.profile/2])add(root,'leaf-stile',d.profile,leafHeight,d.thickness,frame,x,(top+bottom)/2,0);
  for(const y of [bottom+d.profile/2,top-d.profile/2])add(root,'leaf-rail',d.leafWidth,d.profile,d.thickness,frame,d.leafWidth/2,y,0);
  // Thin dark gaskets border each pane, leaving the view clear.
  for(const x of [d.profile+.002,d.leafWidth-d.profile-.002])add(root,'glazing-gasket',.004,leafHeight-2*d.profile,.012,seal,x,(top+bottom)/2,0);
  for(const y of [bottom+d.profile+.002,top-d.profile-.002])add(root,'glazing-gasket',d.leafWidth-2*d.profile,.004,.012,seal,d.leafWidth/2,y,0);
  add(root,'clear-glass',d.leafWidth-2*d.profile-.004,leafHeight-2*d.profile-.004,.010,glass,d.leafWidth/2,(top+bottom)/2,0);
  return root;
 }
 const fixedLeaf=leaf('outer-glass-leaf',d.jamb,d.track);
 const movingLeaf=leaf('sliding-glass-leaf',d.closedStart,-d.track);
 // A pull on the room-facing side; flush exterior pull clears the other track.
 add(movingLeaf,'handle-plate',.030,.29,.008,frame,d.profile/2,1.08,-.028);
 for(const y of [.96,1.20])add(movingLeaf,'handle-mount',.018,.020,.037,frame,d.profile/2,y,-.0465);
 add(movingLeaf,'white-sliding-handle',.014,.254,.014,frame,d.profile/2,1.08,-.066);
 add(movingLeaf,'flush-exterior-pull',.026,.15,.003,frame,d.profile/2,1.08,.0255);
 add(movingLeaf,'flush-pull-recess',.013,.10,.001,seal,d.profile/2,1.08,.0275);
 group.updateMatrixWorld(true);
 let progress=0,target=0;
 const state=()=>({id:d.id,name:d.name,kind:'glazed',progress,open:progress===1,targetOpen:target===1,moving:progress!==target});
 const check=id=>{if(id!==d.id)throw new RangeError(`Unknown terrace door: ${id}`);};
 function setOpen(id,open){check(id);const next=open?1:0;if(target===next)return;target=next;onStateChange(state());}
 const blocksFixed=(x,z,r)=>touches(d.jamb,d.jamb+d.leafWidth,d.track,x,z,r);
 const blocksAt=(p,x,z,r)=>{const start=terraceMovingStart(p);return blocksFixed(x,z,r)||touches(start,start+d.leafWidth,-d.track,x,z,r);};
 return {group,fixedLeaf,movingLeaf,
  get state(){return [state()];},
  setOpen,toggle(id){check(id);setOpen(id,target===0);},
  blocksPoint:(x,z,r=.18)=>blocksAt(progress,x,z,r),
  blocksWhenOpen:(x,z,r=.18)=>blocksAt(1,x,z,r),
  prepareRobotStep(x,z,r=.18){if(blocksAt(progress,x,z,r))setOpen(d.id,true);},
  update(dt,occupants=[]){
   if(!Number.isFinite(dt)||dt<=0||progress===target)return false;
   const step=Math.min(dt,.1)/d.duration,next=target>progress?Math.min(1,progress+step):Math.max(0,progress-step);
   if(!Array.isArray(occupants))occupants=occupants?[occupants]:[];
   if(target===0){
    const a=terraceMovingStart(progress),b=terraceMovingStart(next);
    if(occupants.some(p=>touches(Math.min(a,b),Math.max(a,b)+d.leafWidth,-d.track,p.x,p.z,p.r??.20))){
     target=1;onStateChange({...state(),obstructed:true});return false;
    }
   }
   progress=next;movingLeaf.position.x=terraceMovingStart(progress);
   movingLeaf.updateMatrix();group.updateMatrixWorld(true);
   if(progress===target)onStateChange(state());return true;
  },
  pick(raycaster,occluders=[]){
   if(!visible(group))return null;
   const hit=raycaster.intersectObject(group,true)[0];if(!hit)return null;
   const far=raycaster.far;
   try{raycaster.far=Math.min(far,hit.distance-.003);if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;}
   finally{raycaster.far=far;}return {...hit,id:d.id};
  }
 };
}
