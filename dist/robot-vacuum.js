import * as THREE from './vendor/three.module.js';
import {robotLayout} from './robot-navigation.js';

export function createRobotVacuum(scene){
 const group=new THREE.Group();group.name='robot-vacuum';scene.add(group);
 const robot=new THREE.Group();robot.name='vacuum-body';group.add(robot);
 const dock=new THREE.Group();dock.name='vacuum-charging-dock';group.add(dock);
 const white=new THREE.MeshStandardMaterial({color:'#f3f5f3',roughness:.36,metalness:.08});
 const black=new THREE.MeshStandardMaterial({color:'#202a30',roughness:.6});
 const silver=new THREE.MeshStandardMaterial({color:'#9ba7ae',metalness:.65,roughness:.3});
 const pad=new THREE.MeshStandardMaterial({color:'#859eaa',roughness:1});
 const led=new THREE.MeshStandardMaterial({color:'#4ccbbe',emissive:'#4ccbbe',emissiveIntensity:.45,roughness:.35});
 const add=(parent,name,geometry,material,x,y,z)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=parent===dock;parent.add(mesh);return mesh;
 };
 const cylinder=(name,r,h,y,material,x=0,z=0)=>add(robot,name,new THREE.CylinderGeometry(r,r,h,48),material,x,y,z);
 cylinder('lower-dark-shell',.166,.035,.035,black);
 cylinder('round-white-shell',robotLayout.radius,.063,.061,white);
 cylinder('lid',.169,.007,.096,white);
 const seam=add(robot,'lid-seam',new THREE.RingGeometry(.148,.150,64),silver,0,.100,0);seam.rotation.x=-Math.PI/2;
 add(robot,'front-bumper',new THREE.CylinderGeometry(.1755,.1755,.025,32,1,true,-.95,1.9),black,0,.055,0);
 add(robot,'front-sensor',new THREE.BoxGeometry(.06,.018,.008),black,0,.064,.172);
 const lens=add(robot,'front-sensor-lens',new THREE.CircleGeometry(.006,16),silver,0,.064,.1765);
 lens.rotation.y=0;
 cylinder('lidar-dark-band',.039,.023,.113,black,0,-.045);
 cylinder('lidar-white-cap',.041,.008,.128,white,0,-.045);
 const ring=add(robot,'status-ring',new THREE.TorusGeometry(.039,.0018,6,48),led,0,.133,-.045);ring.rotation.x=Math.PI/2;
 for(const x of [-.017,.017]){
  const button=add(robot,'top-button',new THREE.CircleGeometry(.009,20),silver,x,.101,.073);button.rotation.x=-Math.PI/2;
 }
 add(robot,'power-mark',new THREE.BoxGeometry(.0018,.001,.007),white,-.017,.102,.073);
 for(const x of [-.133,.133]){
  const wheel=cylinder('drive-wheel',.025,.019,.028,black,x,-.02);wheel.rotation.z=Math.PI/2;
 }
 for(const x of [-.062,.062])cylinder('mop-pad',.055,.006,.012,pad,x,-.072);
 const brush=new THREE.Group();brush.name='rotating-side-brush';brush.position.set(-.122,.015,.08);robot.add(brush);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3,blade=add(brush,'brush-bristles',new THREE.BoxGeometry(.009,.004,.042),black,Math.sin(a)*.019,0,Math.cos(a)*.019);blade.rotation.y=a;
 }
 // A small contact shadow follows the robot without rebuilding all house shadows.
 const contact=new THREE.Group();contact.name='vacuum-contact-shadow';group.add(contact);
 for(const [r,opacity] of [[.19,.035],[.177,.065],[.158,.13]]){
  const material=new THREE.MeshBasicMaterial({color:'#192b32',transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
  const mesh=add(contact,'soft-contact-shadow',new THREE.CircleGeometry(r,48),material,0,.009,0);mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=false;
 }
 dock.position.set(.085,0,robotLayout.dock.z);
 add(dock,'charging-back',new THREE.BoxGeometry(.13,.30,.44),white,0,.16,0);
 add(dock,'charging-sensor',new THREE.BoxGeometry(.006,.10,.31),black,.068,.19,0);
 add(dock,'charging-tray',new THREE.BoxGeometry(.49,.007,.45),black,.18,.007,0);
 for(const z of [-.06,.06])add(dock,'charging-contact',new THREE.BoxGeometry(.008,.033,.025),silver,.071,.055,z);
 add(dock,'dock-led',new THREE.BoxGeometry(.007,.006,.055),led,.072,.265,0);
 const pickables=[];robot.traverse(o=>{if(o.isMesh)pickables.push(o);});dock.traverse(o=>{if(o.isMesh)pickables.push(o);});
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 function sync(state,dt=0){
  robot.position.set(state.x,.004,state.z);robot.rotation.y=state.yaw;
  contact.position.set(state.x,0,state.z);
  const moving=['cleaning','returning'].includes(state.mode)&&!state.waiting;
  if(moving)brush.rotation.y+=Math.min(dt,.1)*9;
  led.color.set(state.waiting?'#ebb75e':state.mode==='paused'?'#82a3b4':'#4ccbbe');led.emissive.copy(led.color);
  robot.updateMatrix();brush.updateMatrix();contact.updateMatrix();group.updateMatrixWorld(true);
 }
 sync({...robotLayout.dock,mode:'docked',waiting:false});
 return {group,robot,dock,brush,sync,
  pick(raycaster,occluders=[]){
   const hit=raycaster.intersectObjects(pickables.filter(visible),false)[0];if(!hit)return null;
   const far=raycaster.far;
   try{raycaster.far=Math.min(far,hit.distance-.003);if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;}
   finally{raycaster.far=far;}
   return hit;
  }
 };
}
