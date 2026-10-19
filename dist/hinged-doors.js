import * as THREE from './vendor/three.module.js';
import {walls,point,SCALE} from './model.js';

// Hinge jamb and quarter-turn traced from planimetria.pdf, Sub. 4.
// X goes right and Z down in the plan. The utility leaf opens onto the terrace.
export const hingedDoorLayout=[
 {id:'room2',name:'Camera 2',wallStart:[270,374],hinge:'end',swing:-1},
 {id:'bedroom',name:'Camera matrimoniale',wallStart:[409,125],hinge:'end',swing:-1},
 {id:'room3',name:'Camera 3',wallStart:[300.32,498],hinge:'end',swing:1},
 {id:'utility',name:'Locale tecnico',wallStart:[30,958],hinge:'start',swing:-1},
].map(spec=>{
 const wall=walls.find(w=>w.a[0]===spec.wallStart[0]&&w.a[1]===spec.wallStart[1]&&w.open?.some(o=>o.kind==='door'));
 const opening=wall.open.find(o=>o.kind==='door');
 const [ax,az]=point(wall.a),[bx,bz]=point(wall.b),length=Math.hypot(bx-ax,bz-az);
 const ux=(bx-ax)/length,uz=(bz-az)/length,start=opening.s/SCALE,end=opening.e/SCALE;
 const direction=spec.hinge==='start'?1:-1,closedYaw=-Math.atan2(uz*direction,ux*direction);
 const openYaw=closedYaw+spec.swing*Math.PI/2;
 const jamb=spec.hinge==='start'?start+.024:end-.024;
 // Hinge axis sits on the room-facing jamb: the open leaf clears the wall face.
 return {...spec,x:ax+ux*jamb+Math.cos(openYaw)*(wall.t/2+.004),z:az+uz*jamb-Math.sin(openYaw)*(wall.t/2+.004),
  width:end-start-.048,height:opening.h-.016,thickness:.04,closedYaw,openYaw,duration:.85};
});
const eased=p=>p*p*(3-2*p);
export function hingedDoorPose(layout,progress){
 const yaw=layout.closedYaw+layout.swing*Math.PI/2*eased(progress);
 return {x:layout.x,z:layout.z,yaw,dx:Math.cos(yaw),dz:-Math.sin(yaw)};
}
export function hingedDoorTouches(layout,progress,x,z,r=.18){
 const p=hingedDoorPose(layout,progress),dx=x-p.x,dz=z-p.z,u=dx*p.dx+dz*p.dz,v=-dx*p.dz+dz*p.dx-layout.swing*layout.thickness/2;
 const du=u-Math.max(0,Math.min(layout.width,u)),dv=v-Math.max(-layout.thickness/2,Math.min(layout.thickness/2,v));
 return du*du+dv*dv<=r*r;
}
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};

export function createHingedDoors(parent,{onStateChange=()=>{}}={}){
 const group=new THREE.Group();group.name='hinged-doors';parent.add(group);
 const white=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.57});
 const silver=new THREE.MeshStandardMaterial({color:'#dee2e4',metalness:.5,roughness:.28});
 const doors=hingedDoorLayout.map(layout=>{
  const d=layout,root=new THREE.Group();root.name='hinged-door-'+d.id;root.position.set(d.x,0,d.z);group.add(root);
  const leaf=new THREE.Group();leaf.name='hinged-leaf';leaf.rotation.y=d.closedYaw;root.add(leaf);
  const add=(name,geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;leaf.add(m);return m;};
  const shape=new THREE.Shape();shape.moveTo(.001,.013);shape.lineTo(d.width-.001,.013);shape.lineTo(d.width-.001,d.height+.011);shape.lineTo(.001,d.height+.011);shape.closePath();
  const panel=new THREE.ExtrudeGeometry(shape,{depth:d.thickness-.002,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,steps:1});
  panel.translate(0,0,-d.thickness/2+.001);add('plain-white-door-panel',panel,white,0,0,0);
  for(const side of [-1,1]){
   const x=d.width-.065,y=1.02;
   const rose=add('silver-handle-rosette',new THREE.CylinderGeometry(.025,.025,.006,24),silver,x,y,side*.024);rose.rotation.x=Math.PI/2;
   const stem=add('silver-handle-stem',new THREE.CylinderGeometry(.007,.007,.036,12),silver,x,y,side*.044);stem.rotation.x=Math.PI/2;
   const handle=add('silver-lever-handle',new THREE.CapsuleGeometry(.008,.088,4,12),silver,x-.044,y,side*.062);handle.rotation.z=Math.PI/2;
   const lock=add('silver-key-rosette',new THREE.CylinderGeometry(.019,.019,.004,20),silver,x,.90,side*.023);lock.rotation.x=Math.PI/2;
  }
  for(const y of [.23,1.05,1.86])add('silver-hinge',new THREE.CylinderGeometry(.008,.008,.065,12),silver,0,y,0);
  // The hinge is on the opening face, rather than the panel centre-plane.
  // This rebate lets the leaf rotate past the lining without clipping it.
  for(const part of leaf.children)part.position.z+=d.swing*d.thickness/2;
  const points=Array.from({length:49},(_,i)=>{const p=hingedDoorPose(d,i/48);return new THREE.Vector3(p.dx*d.width,.014,p.dz*d.width);});
  const arc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#698491',dashSize:.035,gapSize:.025,transparent:true,opacity:.65}));
  arc.name='door-swing-arc';arc.computeLineDistances();arc.visible=false;root.add(arc);
  return {layout,root,leaf,arc,progress:0,target:0,obstructed:false};
 });
 group.updateMatrixWorld(true);
 const find=id=>{const d=doors.find(d=>d.layout.id===id);if(!d)throw new RangeError(`Unknown hinged door: ${id}`);return d;};
 const state=d=>({id:d.layout.id,name:d.layout.name,kind:'hinged',progress:d.progress,open:d.progress===1,targetOpen:d.target===1,moving:d.progress!==d.target,obstructed:d.obstructed});
 function setOpen(id,open){const d=find(id),target=open?1:0;if(d.target===target)return;d.target=target;d.obstructed=false;onStateChange(state(d));}
 return {group,doors,setOpen,
  get state(){return doors.map(state);},
  toggle(id){const d=find(id);setOpen(id,d.target===0);},
  setPlanVisible(show){for(const d of doors)d.arc.visible=show;},
  blocksPoint(x,z,r=.18){return doors.some(d=>hingedDoorTouches(d.layout,d.progress,x,z,r));},
  blocksWhenOpen(x,z,r=.18){return doors.some(d=>hingedDoorTouches(d.layout,1,x,z,r));},
  // Request opening before the robot enters the swept area, from either side.
  prepareRobotStep(x,z,r=.18){for(const d of doors)if(Math.hypot(x-d.layout.x,z-d.layout.z)<d.layout.width+r+.45)setOpen(d.layout.id,true);},
  update(dt,occupants=[]){
   if(!Number.isFinite(dt)||dt<=0)return false;let changed=false;
   if(!Array.isArray(occupants))occupants=occupants?[occupants]:[];
   for(const d of doors){
    if(d.progress===d.target)continue;
    const step=Math.min(dt,.1)/d.layout.duration,next=d.target>d.progress?Math.min(1,d.progress+step):Math.max(0,d.progress-step);
    // Sample the entire angular step; thick leaves cannot sweep through a visitor.
    const angle=Math.abs(eased(next)-eased(d.progress))*Math.PI/2;
    const samples=Math.max(1,Math.ceil(angle*d.layout.width/.008));
    let blocked=false;
    for(let i=1;i<=samples&&!blocked;i++)blocked=occupants.some(p=>hingedDoorTouches(d.layout,d.progress+(next-d.progress)*i/samples,p.x,p.z,(p.r??.20)+.008));
    if(blocked){
     if(d.target===0){d.target=1;d.obstructed=true;onStateChange({...state(d),reopening:true});}
     else if(!d.obstructed){d.obstructed=true;onStateChange(state(d));}
     continue;
    }
    if(d.obstructed){d.obstructed=false;onStateChange(state(d));}
    d.progress=next;d.leaf.rotation.y=hingedDoorPose(d.layout,next).yaw;
    d.leaf.updateMatrix();d.root.updateMatrixWorld(true);changed=true;
    if(next===d.target)onStateChange(state(d));
   }
   return changed;
  },
  pick(raycaster,occluders=[]){
   const hit=doors.filter(d=>visible(d.root)).map(d=>{const h=raycaster.intersectObject(d.leaf,true)[0];return h?{...h,id:d.layout.id}:null;}).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
   if(!hit)return null;const far=raycaster.far;
   try{raycaster.far=Math.min(far,hit.distance-.003);if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;}
   finally{raycaster.far=far;}return hit;
  }
 };
}
