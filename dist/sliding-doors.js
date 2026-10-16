import * as THREE from './vendor/three.module.js';
import {walls,point,SCALE} from './model.js';

// Pocket directions are illustrative; openings and architectural walls stay fixed.
export const slidingDoorLayout=[
 {id:'bath1',name:'Bagno 1',wallStart:[270,320],direction:-1},
 {id:'bath2',name:'Bagno 2',wallStart:[529,493],direction:1},
 {id:'hall',name:'Zona giorno / disimpegno',wallStart:[300.32,742],direction:1},
].map(spec=>{
 const wall=walls.find(w=>w.a[0]===spec.wallStart[0]&&w.a[1]===spec.wallStart[1]&&w.open?.some(o=>o.kind==='door'));
 const opening=wall.open.find(o=>o.kind==='door');
 const [x,z]=point(wall.a),[ex,ez]=point(wall.b),length=Math.hypot(ex-x,ez-z);
 return {...spec,x,z,ux:(ex-x)/length,uz:(ez-z)/length,start:opening.s/SCALE,end:opening.e/SCALE,height:opening.h,thickness:.036,edge:.08,duration:1.15};
});
const eased=p=>p*p*(3-2*p);
function interval(door,progress=door.progress){
 const d=door.layout,offset=d.direction*(d.end-d.start-d.edge)*eased(progress);
 return {min:Math.max(d.start,d.start+.006+offset),max:Math.min(d.end,d.end-.006+offset)};
}
function touches(door,range,x,z,r){
 const d=door.layout,dx=x-d.x,dz=z-d.z,u=dx*d.ux+dz*d.uz,v=-dx*d.uz+dz*d.ux;
 const du=u-Math.max(range.min,Math.min(range.max,u)),dv=v-Math.max(-d.thickness/2,Math.min(d.thickness/2,v));
 return du*du+dv*dv<=r*r;
}
const isVisible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};

export function createSlidingDoors(parent,{onStateChange=()=>{}}={}){
 const group=new THREE.Group();group.name='sliding-doors';parent.add(group);
 const doors=slidingDoorLayout.map(layout=>{
  const d=layout,root=new THREE.Group();root.name='sliding-door-'+d.id;
  root.position.set(d.x,0,d.z);root.rotation.y=-Math.atan2(d.uz,d.ux);group.add(root);
  const leaf=new THREE.Group();leaf.name='door-leaf';root.add(leaf);
  // Clip the retracted part at the jamb, including its shadows and picking.
  // This avoids a leaf emerging beyond a short schematic wall segment.
  const along=new THREE.Vector3(d.ux,0,d.uz),base=d.x*d.ux+d.z*d.uz;
  const clippingPlanes=[new THREE.Plane(along,-base-d.start),new THREE.Plane(along.clone().negate(),base+d.end)];
  const finish=options=>new THREE.MeshStandardMaterial({...options,clippingPlanes,clipShadows:true});
  const white=finish({color:'#f5f3ed',roughness:.72});
  const groove=finish({color:'#c4c3bc',roughness:.9});
  const highlight=finish({color:'#fffefa',roughness:.72});
  const silver=finish({color:'#bcc3c7',metalness:.86,roughness:.25});
  const recess=finish({color:'#5e686d',metalness:.6,roughness:.4});
  const add=(name,geometry,material,x=0,y=0,z=0)=>{
   const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;leaf.add(mesh);return mesh;
  };
  const width=d.end-d.start-.012,pullX=d.direction>0?.04:width-.04;
  const shape=new THREE.Shape();shape.moveTo(0,.012);shape.lineTo(width,.012);shape.lineTo(width,d.height-.012);shape.lineTo(0,d.height-.012);shape.closePath();
  const hole=new THREE.Path();hole.absarc(pullX,1.02,.020,0,Math.PI*2,true);shape.holes.push(hole);
  const panel=new THREE.ExtrudeGeometry(shape,{depth:d.thickness,bevelEnabled:false,steps:1,curveSegments:16});panel.translate(0,0,-d.thickness/2);
  add('white-door-panel',panel,white);
  for(const side of [-1,1]){
   // Three discreet vertical incisions, with the centre line extending farther.
   for(const [dx,bottom,top] of [[-.12,.32,1.46],[0,.23,1.63],[.12,.32,1.46]]){
    add('vertical-door-groove',new THREE.BoxGeometry(.0022,top-bottom,.0008),groove,width/2+dx,(bottom+top)/2,side*(d.thickness/2+.0004));
    add('groove-edge-highlight',new THREE.BoxGeometry(.0008,top-bottom,.0008),highlight,width/2+dx+.0015,(bottom+top)/2,side*(d.thickness/2+.0004));
   }
   const rim=add('silver-recessed-pull',new THREE.RingGeometry(.019,.027,32),silver,pullX,1.02,side*(d.thickness/2+.0008));
   rim.rotation.y=side<0?Math.PI:0;
   add('pull-rounded-rim',new THREE.TorusGeometry(.024,.002,6,32),silver,pullX,1.02,side*d.thickness/2);
   const bowl=add('pull-inset-bottom',new THREE.CircleGeometry(.020,32),recess,pullX,1.02,side*.004);bowl.rotation.y=side<0?Math.PI:0;
   const inner=add('pull-inset-wall',new THREE.CylinderGeometry(.020,.020,.013,32,1,true),silver,pullX,1.02,side*.0105);
   inner.rotation.x=Math.PI/2;inner.material.side=THREE.DoubleSide;
  }
  const door={layout,root,leaf,clippingPlanes,progress:0,target:0};leaf.position.x=d.start+.006;return door;
 });
 group.updateMatrixWorld(true);
 const find=id=>{const door=doors.find(d=>d.layout.id===id);if(!door)throw new RangeError(`Unknown sliding door: ${id}`);return door;};
 const state=door=>({id:door.layout.id,name:door.layout.name,progress:door.progress,open:door.progress===1,targetOpen:door.target===1,moving:door.progress!==door.target});
 function setOpen(id,open){const door=find(id),target=open?1:0;if(door.target===target)return;door.target=target;onStateChange(state(door));}
 return {group,doors,
  get state(){return doors.map(state);},
  setOpen,
  toggle(id){const door=find(id);setOpen(id,door.target===0);},
  blocksPoint(x,z,r=.18){return doors.some(door=>touches(door,interval(door),x,z,r));},
  update(dt,occupant){
   if(!Number.isFinite(dt)||dt<=0)return false;let changed=false;
   for(const door of doors){
    if(door.progress===door.target)continue;
    const step=Math.min(dt,.1)/door.layout.duration;
    const next=door.target>door.progress?Math.min(door.target,door.progress+step):Math.max(door.target,door.progress-step);
    if(door.target===0&&occupant){
     const a=interval(door),b=interval(door,next),sweep={min:Math.min(a.min,b.min),max:Math.max(a.max,b.max)};
     if(touches(door,sweep,occupant.x,occupant.z,occupant.r??.20)){
      door.target=1;onStateChange({...state(door),obstructed:true});continue;
     }
    }
    door.progress=next;
    door.leaf.position.x=door.layout.start+.006+door.layout.direction*(door.layout.end-door.layout.start-door.layout.edge)*eased(next);
    // Explicit matrices keep the door animated even after the static scene freeze.
    door.leaf.updateMatrix();door.root.updateMatrixWorld(true);changed=true;
    if(next===door.target)onStateChange(state(door));
   }
   return changed;
  },
  pick(raycaster,occluders=[]){
   let nearest=null;
   for(const door of doors){
    if(!isVisible(door.root))continue;
    const hit=raycaster.intersectObject(door.leaf,true).find(h=>door.clippingPlanes.every(p=>p.distanceToPoint(h.point)>=-1e-6));
    if(hit&&(!nearest||hit.distance<nearest.distance))nearest={...hit,id:door.layout.id};
   }
   if(!nearest)return null;
   const far=raycaster.far;
   try{
    raycaster.far=Math.min(far,nearest.distance-.003);
    if(raycaster.intersectObjects(occluders.filter(isVisible),false).length)return null;
   }finally{raycaster.far=far;}
   return nearest;
  }
 };
}
