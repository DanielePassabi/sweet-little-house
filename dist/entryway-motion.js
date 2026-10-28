import {shoeCabinet,shoeCabinetCollider,shoeCabinetFront} from './entryway-layout.js?v=20261028-4';

const ease=p=>p*p*(3-2*p);
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export function createEntrywayMotion(root,drawer,flap,{onStateChange=()=>{},onExtentChange=()=>{}}={}){
 const parts=[{id:'drawer',object:drawer,progress:0,target:0,obstructed:false},{id:'flap',object:flap,progress:0,target:0,obstructed:false}];
 const find=id=>{const p=parts.find(p=>p.id===id);if(!p)throw new RangeError(`Unknown cabinet part: ${id}`);return p;};
 const snapshot=p=>({id:p.id,open:p.progress===1,targetOpen:p.target===1,moving:p.progress!==p.target,obstructed:p.obstructed,progress:p.progress});
 const front=(id=null,next=0)=>shoeCabinetFront(...parts.map(p=>ease(p.id===id?next:p.progress)));
 const touches=(maxZ,person)=>{
  const r=person.r??.20,c=shoeCabinetCollider;
  const dx=person.x-Math.max(c.minX,Math.min(c.maxX,person.x)),dz=person.z-Math.max(c.minZ,Math.min(maxZ,person.z));
  return dx*dx+dz*dz<r*r;
 };
 // All descendants must remain inside the moving groups after static batching.
 for(const p of parts)p.object.traverse(o=>{o.userData.dynamicFurniture=true;});
 function setOpen(id,open){const p=find(id),target=open?1:0;if(p.target===target)return;p.target=target;p.obstructed=false;onStateChange(snapshot(p));}
 onExtentChange(front());
 return {
  get state(){return parts.map(snapshot);},
  get depth(){return front()-shoeCabinetCollider.minZ;},
  get maxZ(){return front();},
  setOpen,toggle(id){const p=find(id);setOpen(id,p.target===0);},
  update(dt,occupants=[]){
   if(!Number.isFinite(dt)||dt<=0)return false;let changed=false;
   for(const p of parts){
    if(p.progress===p.target)continue;
    const delta=Math.min(dt,.1)/.9,next=p.target>p.progress?Math.min(1,p.progress+delta):Math.max(0,p.progress-delta);
    // Pause an opening before it reaches the visitor or robot. Closing shrinks
    // the occupied footprint; neither the drawer nor the flap sweeps outside it.
    const blocked=next>p.progress&&occupants.some(person=>touches(Math.max(front(),front(p.id,next)),person));
    if(blocked!==p.obstructed){p.obstructed=blocked;onStateChange(snapshot(p));}
    if(blocked)continue;
    p.progress=next;
    if(p.id==='drawer')p.object.position.z=-.009+shoeCabinet.drawerTravel*ease(next);
    else p.object.rotation.x=shoeCabinet.tilt*ease(next);
    p.object.updateMatrix();root.updateMatrixWorld(true);changed=true;
    onExtentChange(front());
    if(p.progress===p.target)onStateChange(snapshot(p));
   }
   return changed;
  },
  pick(raycaster,occluders=[]){
   const targets=parts.filter(p=>visible(p.object)).flatMap(p=>raycaster.intersectObject(p.object,true).map(hit=>({...hit,id:p.id})));
   const nearest=targets.sort((a,b)=>a.distance-b.distance)[0];if(!nearest)return null;
   // Include the carcass itself: side panels, the top and walls occlude clicks.
   const far=raycaster.far;
   try{raycaster.far=Math.min(far,nearest.distance-.003);if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;}
   finally{raycaster.far=far;}
   return nearest;
  }
 };
}
