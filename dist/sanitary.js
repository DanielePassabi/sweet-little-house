import * as THREE from './vendor/three.module.js';
import {sanitaryFixtures,sanitarySize} from './sanitary-layout.js?v=20261016-4';

export function createSanitaryFixtures(parent,{ceramic,seat,metal}){
 const group=new THREE.Group();group.name='wall-hung-sanitary-fixtures';parent.add(group);
 const lathe=points=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),48);
 // One continuous shell: rounded underside, outer bowl, lip and recessed basin.
 const bowlGeometry=lathe([[0,.18],[.40,.18],[.58,.188],[.72,.21],[.84,.25],[.94,.31],[.99,.365],[1,.393],[.985,.415],[.87,.415],[.83,.397],[.80,.36],[.66,.31],[.44,.285],[0,.28]]);
 const seatGeometry=lathe([[.85,0],[.98,0],[1,.006],[1,.021],[.98,.03],[.86,.03],[.84,.024],[.84,.006],[.85,0]]);
 const cylinder=new THREE.CylinderGeometry(1,1,1,24);
 const box=new THREE.BoxGeometry(1,1,1);
 const inset=new THREE.MeshStandardMaterial({color:'#7d888d',metalness:.6,roughness:.4});
 function mesh(root,name,geometry,material,x,y,z,sx=1,sy=1,sz=1){
  const part=new THREE.Mesh(geometry,material);part.name=name;part.position.set(x,y,z);part.scale.set(sx,sy,sz);part.castShadow=part.receiveShadow=true;root.add(part);return part;
 }
 for(const fixture of sanitaryFixtures){
  const root=new THREE.Group();root.name=fixture.id;root.position.set(fixture.x,0,fixture.z);root.rotation.y=-fixture.rotation;group.add(root);
  mesh(root,'suspended-ceramic-bowl',bowlGeometry,ceramic,0,0,0,sanitarySize.width/2,1,sanitarySize.depth/2);
  // The rear housing meets the actual room-facing wall, concealing pipes/fixings.
  // Its lower edge stays above the bowl's underside; there is no pedestal.
  mesh(root,'wall-mount-housing',box,ceramic,0,.3025,-.22,.31,.215,.14);
  if(fixture.type==='toilet'){
   mesh(root,'toilet-seat',seatGeometry,seat,0,.419,0,.19,1,.29);
   mesh(root,'rear-seat-deck',box,seat,0,.427,-.235,.30,.024,.11);
   for(const x of [-.105,.105])mesh(root,'seat-hinge',cylinder,metal,x,.445,-.235,.016,.012,.016);
   // Concealed cistern, with only the dual flush plate visible above the bowl.
   mesh(root,'flush-plate',box,metal,0,1.02,-.282,.24,.155,.016);
   mesh(root,'large-flush-button',box,inset,-.045,1.02,-.272,.105,.10,.006);
   mesh(root,'small-flush-button',box,inset,.064,1.02,-.272,.065,.10,.006);
  }else{
   mesh(root,'tap-deck',box,ceramic,0,.401,-.205,.26,.028,.17);
   mesh(root,'bidet-drain',cylinder,metal,0,.284,0,.023,.005,.023);
   mesh(root,'tap-stem',cylinder,metal,0,.485,-.22,.017,.14,.017);
   mesh(root,'tap-spout',box,metal,0,.548,-.166,.028,.024,.13);
   mesh(root,'tap-outlet',cylinder,metal,0,.529,-.112,.015,.027,.015);
   mesh(root,'tap-lever',box,metal,0,.57,-.205,.024,.012,.07);
   mesh(root,'overflow',cylinder,inset,0,.377,-.218,.014,.003,.014).rotation.x=Math.PI/2;
  }
 }
 group.updateMatrixWorld(true);return group;
}
