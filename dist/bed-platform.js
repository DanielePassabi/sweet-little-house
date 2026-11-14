import * as THREE from './vendor/three.module.js';
import {createBedLift} from './bed-lift.js';

export function createLiftingPlatform(group,{part,board,start,end,deckY,hingeX,hingeY,socketY,timber}){
 const pivot=new THREE.Group(),deck=new THREE.Group();
 pivot.name='bed-lift-hinge';deck.name='lifting-platform';
 pivot.position.set(hingeX,hingeY,0);deck.position.set(-hingeX,-hingeY,0);
 group.add(pivot);pivot.add(deck);
 const metal=new THREE.MeshStandardMaterial({color:'#4d4842',metalness:.5,roughness:.46});
 const piston=new THREE.MeshStandardMaterial({color:'#b0aaa0',metalness:.75,roughness:.32});
 // The lifting frame carries the mattress on beech slats. Hinge cheek plates
 // place the pivot alongside the mattress so its head clears the wall on lift.
 for(const side of [-1,1]){
  board('hinge-bracket',.04,hingeY-deckY+.04,.014,metal,hingeX,(hingeY+deckY)/2-.016,side*.807);
  board('lifting-hinge-arm',.024,hingeY-deckY,.014,metal,hingeX,(hingeY+deckY)/2,side*.791,deck);
 }
 for(const z of [-.785,0,.785])board('deck-longitudinal-rail',end-start-.025,.037,.026,metal,(start+end)/2,deckY,z,deck);
 for(const x of [start+.0125,end-.0125])board('deck-end-rail',.025,.037,1.596,metal,x,deckY,0,deck);
 const slats=new THREE.InstancedMesh(new THREE.BoxGeometry(.063,.014,1.55),timber,16);
 slats.name='beech-slats';slats.castShadow=slats.receiveShadow=true;
 for(let i=0;i<slats.count;i++)slats.setMatrixAt(i,new THREE.Matrix4().makeTranslation(start+.064+i*(end-start-.128)/15,deckY+.010,0));
 deck.add(slats);
 // Telescopic gas springs connect the stationary box to the lifting frame.
 const axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
 const springs=[-1,1].map(side=>{
  const socket=new THREE.Vector3(start+.32,socketY,side*.755);
  const barrel=part('gas-spring-barrel',new THREE.CylinderGeometry(.014,.014,1,12),metal);
  const rod=part('gas-spring-rod',new THREE.CylinderGeometry(.007,.007,1,12),piston);
  return {socket,barrel,rod};
 });
 function pose(progress){
  const angle=42*Math.PI/180*progress; pivot.rotation.z=angle;pivot.updateMatrix();
  for(const {socket,barrel,rod} of springs){
   const dx=(start+end)/2-hingeX,dy=deckY-.012-hingeY;
   direction.set(hingeX+dx*Math.cos(angle)-dy*Math.sin(angle)-socket.x,
    hingeY+dx*Math.sin(angle)+dy*Math.cos(angle)-socket.y,0);
   const span=direction.length(),barrelLength=(end-start)*.31;direction.divideScalar(span);
   for(const [mesh,offset,size] of [[barrel,0,barrelLength],[rod,barrelLength,span-barrelLength]]){
    mesh.position.copy(socket).addScaledVector(direction,offset+size/2);
    mesh.scale.y=size;mesh.quaternion.setFromUnitVectors(axis,direction);mesh.updateMatrix();
   }
  }
  group.updateMatrixWorld(true);
 }
 pose(0);
 group.userData.controller=createBedLift(group,pose);
 return deck;
}
