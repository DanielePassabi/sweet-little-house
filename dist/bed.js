import * as THREE from './vendor/three.module.js';
import {bedUpholstery} from './bed-upholstery.js?v=20261114-3';

import {bedLayout} from './bedroom-layout.js';
import {createLiftingPlatform} from './bed-platform.js';

// Local X runs from head to foot. The headboard faces the right wall in plan.
export function createBed(parent,{frame,fabric,duvet,accent}){
 const {headX,centerZ,length,width,mattressLength,mattressWidth}=bedLayout;
 const group=new THREE.Group();group.name='soft-double-bed';
 group.position.set(headX,0,centerZ);group.rotation.y=Math.PI;parent.add(group);
 const {part,soft,seam,outline,piping,addPaddedFrame,addPillows,addDuvet}=bedUpholstery(group,fabric,accent);
 const feet=new THREE.MeshStandardMaterial({color:'#514d49',roughness:.75});
 const timber=new THREE.MeshStandardMaterial({color:'#c9aa80',roughness:.82});
 const lining=new THREE.MeshStandardMaterial({color:'#baa995',roughness:1});
 group.userData.fabricMaterials.push(lining);
 const board=(name,w,h,d,material,x,y,z,root=group)=>part(name,new THREE.BoxGeometry(w,h,d),material,x,y,z,root);
 const baseStart=.066;
 const sideLength=length-baseStart;
 addPaddedFrame(frame,{start:baseStart,end:length,width,baseHeight:.423,headWidth:width,headBack:0,headDepth:.08,headTop:1});
 board('storage-floor',sideLength-.07,.024,width-.07,lining,baseStart+sideLength/2,.079,0);
 board('storage-divider',sideLength-.07,.145,.018,timber,baseStart+sideLength/2,.1635,0);
 const folded=soft(.47,.067,.55,.028,0,10);
 for(let i=0;i<3;i++)part('stored-folded-blanket',folded,i===1?accent:fabric,1.43,.1245+i*.067,.395);
 for(const x of [.20,1.96])for(const z of [-.72,.72])part('recessed-bed-foot',new THREE.CylinderGeometry(.026,.021,.05,12),feet,x,.027,z);

 const deck=createLiftingPlatform(group,{part,board,start:.082,end:2.055,deckY:.445,hingeX:.08,hingeY:.69,socketY:.18,timber});
 const mattressY=.577;
 part('rounded-mattress',soft(mattressLength,.23,mattressWidth,.06,.007),fabric,1.078,mattressY,0,deck);
 for(const y of [.485,.662])seam('mattress-edge-stitching',outline(.10,2.056,-.782,.782,y,.07),piping,.0023,true,deck);
 addPillows(deck,.52,.699);
 addDuvet(deck,duvet,{start:.60,foot:2.078,top:.699});
 return group;
}
