import * as THREE from './vendor/three.module.js';
import {createLiftingPlatform} from './bed-platform.js';
import {bedUpholstery} from './bed-upholstery.js?v=20261114-3';

// Local X runs from the headboard wall to the foot; Z is the bed's width.
// The complete bed retains its original 2.00 m wall-to-footprint depth.
export function createOriginalBed(parent,{wallX,centerZ=3.05,frame,fabric,duvet,accent}){
 const group=new THREE.Group();group.name='soft-double-bed';group.position.set(wallX,0,centerZ);parent.add(group);
 const {part,soft,seam,outline,piping,addPaddedFrame,addPillows,addDuvet}=bedUpholstery(group,fabric,accent);
 const feet=new THREE.MeshStandardMaterial({color:'#514d49',roughness:.75});
 const timber=new THREE.MeshStandardMaterial({color:'#c9aa80',roughness:.82});
 const board=(name,w,h,d,material,x,y,z,root=group)=>part(name,new THREE.BoxGeometry(w,h,d),material,x,y,z,root);
 addPaddedFrame(frame,{start:.18,end:2,width:1.68,baseHeight:.247,headWidth:1.88,headBack:.028,headDepth:.15,headTop:.965});
 board('storage-floor',1.74,.018,1.60,timber,1.09,.06,0);
 board('storage-divider',1.74,.11,.016,timber,1.09,.124,0);
 const deck=createLiftingPlatform(group,{part,board,start:.201,end:1.979,deckY:.258,hingeX:.213,hingeY:.66,socketY:.10,timber});
 for(const x of [.34,1.82])for(const z of [-.66,.66])part('recessed-bed-foot',new THREE.CylinderGeometry(.026,.021,.065,12),feet,x,.038,z);
 part('rounded-mattress',soft(1.78,.25,1.60,.065,.008),fabric,1.09,.40,0,deck);
 for(const y of [.305,.493])seam('mattress-edge-stitching',outline(.235,1.945,-.765,.765,y,.07),piping,.0023,true,deck);
 addPillows(deck,.48,.533);
 addDuvet(deck,duvet,{start:.69,foot:1.98,top:.533});
 group.updateMatrixWorld(true);return group;
}
