import * as THREE from './vendor/three.module.js';

// All three appliance fronts are built in house coordinates. Freeze the fixed
// cabinet parts as usual, but keep each door and its fittings under one hinge.
export function createApplianceDoors(root){
 const doors=new Map(),rotation=new THREE.Matrix4(),worldBounds=new THREE.Box3();
 const angleAt=(d,p)=>d.angle*p*p*(3-2*p);
 function touches(d,angle,x,z,r,top,bottom=0){
  const hinge=d.pivot.position;
  let bounds=d.bounds,px=x-hinge.x,pz=z-hinge.z;
  if(d.axis==='y'){
   const c=Math.cos(angle),s=Math.sin(angle);
   [px,pz]=[c*px-s*pz,s*px+c*pz];
  }else{
   if(d.axis==='x')rotation.makeRotationX(angle);else rotation.makeRotationZ(angle);
   bounds=worldBounds.copy(d.bounds).applyMatrix4(rotation);
  }
  if(top<hinge.y+bounds.min.y||bottom>hinge.y+bounds.max.y)return false;
  const dx=px-THREE.MathUtils.clamp(px,bounds.min.x,bounds.max.x);
  const dz=pz-THREE.MathUtils.clamp(pz,bounds.min.z,bounds.max.z);
  return dx*dx+dz*dz<=r*r;
 }
 const visible=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
 const snapshot=d=>({id:d.id,open:d.progress===1,targetOpen:d.target===1,moving:d.progress!==d.target,obstructed:d.obstructed});
 const system={
  onStateChange:()=>{},
  add(id,hinge,axis,angle,parts){
   const pivot=new THREE.Group(),bounds=new THREE.Box3();
   pivot.name=id+'-hinge';pivot.position.copy(hinge);root.add(pivot);
   for(const part of parts){
    part.position.sub(hinge);pivot.add(part);part.updateMatrix();
    part.geometry.computeBoundingBox();
    bounds.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrix));
    part.userData.dynamicFurniture=true;part.userData.appliance=id;
   }
   doors.set(id,{id,pivot,bounds,axis,angle,progress:0,target:0,obstructed:false});
  },
  get state(){return Array.from(doors.values(),snapshot);},
  toggle(id){
   const d=doors.get(id);d.target=1-d.target;d.obstructed=false;system.onStateChange(snapshot(d));
  },
  blocksPoint(x,z,r,top=Infinity){
   for(const d of doors.values())if(d.progress>0&&touches(d,angleAt(d,d.progress),x,z,r,top))return true;
   return false;
  },
  update(dt,occupants=[]){
   if(!Number.isFinite(dt)||dt<=0)return false;
   let changed=false;
   for(const d of doors.values()){
    if(d.progress===d.target)continue;
    const delta=Math.min(dt,.1)/.8;
    const next=THREE.MathUtils.clamp(d.progress+(d.target?delta:-delta),0,1);
    const from=angleAt(d,d.progress),to=angleAt(d,next);
    const steps=Math.ceil(Math.abs(to-from)/.012);
    let blocked=false;
    for(let i=1;i<=steps&&!blocked;i++){
     const a=from+(to-from)*i/steps;
     blocked=occupants.some(p=>touches(d,a,p.x,p.z,p.r+.008,p.top??Infinity,p.bottom??0));
    }
    const wasBlocked=d.obstructed;d.obstructed=blocked;
    if(!blocked){
     d.progress=next;d.pivot.rotation[d.axis]=to;d.pivot.updateMatrix();d.pivot.updateMatrixWorld(true);changed=true;
    }
    if(wasBlocked!==blocked||d.progress===d.target)system.onStateChange(snapshot(d));
   }
   return changed;
  },
  pick(ray,occluders){
   if(!visible(root))return null;
   const hits=ray.intersectObjects(Array.from(doors.values(),d=>d.pivot),true);
   if(!hits.length)return null;
   const hit=hits[0],far=ray.far;
   try{
    ray.far=Math.min(far,hit.distance-.001);
    if(ray.intersectObjects(occluders.filter(visible),false).length)return null;
   }finally{ray.far=far;}
   return {...hit,id:hit.object.userData.appliance};
  },
 };
 return system;
}
