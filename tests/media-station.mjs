import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createMediaStation} from '../dist/media-station.js';
import {television,mediaConsole,mediaCollider,cableDuct,dockCableHole,desktopPC,gameControllers,ps4Pro,steamDeck,steamDock} from '../dist/media-layout.js';
import {canStand} from '../dist/model.js';
import {canWalk,setKitchenCollisionVariant} from '../dist/furniture-collisions.js';

const parent=new THREE.Group(),unit=new THREE.BoxGeometry(1,1,1);
const box=(w,h,d,m,x,y,z,p)=>{const o=new THREE.Mesh(unit,m);o.position.set(x,y,z);o.scale.set(w,h,d);p.add(o);return o;};
const materials=Object.fromEntries(['black','screen','wall'].map(k=>[k,new THREE.MeshStandardMaterial()]));
const station=createMediaStation(parent,box,materials);parent.updateMatrixWorld(true);
const bounds=name=>new THREE.Box3().setFromObject(station.getObjectByName(name));
const screen=bounds('lg-c1-83'),size=screen.getSize(new THREE.Vector3()),centre=screen.getCenter(new THREE.Vector3());
assert.ok(Math.abs(size.z-1.851)<1e-6&&Math.abs(size.y-1.062)<1e-6,'LG C1 83-inch enclosure is exactly 185.1 × 106.2 cm');
assert.ok(Math.abs(size.x-.0553)<.00002,'TV depth follows LG dimensions without a stand');
assert.ok(Math.abs(centre.z-9.72)<1e-8&&Math.abs(centre.y-1.47)<1e-8,'Previous TV centre is preserved');
const pc=bounds('desktop-pc');
assert.ok(pc.min.y>=mediaConsole.top-1e-6&&pc.min.y<mediaConsole.top+.001,'Tower feet rest on the console');
assert.ok(screen.min.z-pc.max.z>.09,'Raised PC is entirely beside the TV, with over 9 cm horizontal clearance');
for(const name of ['desktop-pc','ps4-pro','steam-deck-docked',...gameControllers.map(c=>c.name)]){
 const b=bounds(name);
 assert.ok(b.min.x>=mediaConsole.x-mediaConsole.depth/2&&b.max.x<=mediaConsole.x+mediaConsole.depth/2,'Devices fit the console depth');
 assert.ok(b.min.z>=mediaCollider.minZ&&b.max.z<=mediaCollider.maxZ,'Devices fit the console width');
 assert.ok(b.min.y>=mediaConsole.top-.001&&b.min.y<mediaConsole.top+.007,'Each device rests on the console');
}
// Read rendered bounds, including protruding controls, feet and cables.
const ps4=bounds('ps4-pro'),deck=bounds('steam-deck-docked'),whitePad=bounds('white-controller'),greyPad=bounds('grey-controller');
assert.ok(ps4.max.y<screen.min.y&&deck.max.y<screen.min.y,'New devices leave the television unobstructed');
// Local +X points to the viewer's right and maps to decreasing world Z.
assert.ok(pc.max.z<ps4.min.z&&ps4.max.z<deck.min.z,'PS4 stays next to the PC, between it and the Deck');
const leftGap=deck.min.z-ps4.max.z,rightGap=ps4.min.z-pc.max.z;
assert.ok(leftGap>.05&&Math.abs(leftGap-rightGap)<1e-6,'PS4 and its stand are centred between devices with over 5 cm either side');
assert.ok(screen.min.y-ps4.max.y>.03,'PS4 retains over 3 cm clearance beneath the TV');
// Project the complete device bounds onto the screen plane from seats across
// the sofa, including the forward chaise: physical separation alone is not
// enough if a closer device can still hide a corner of the picture.
for(const [eyeX,eyeZ] of [[7.1,8.4],[6.1,8.4],[7.1,9.45],[7.1,10.5]]){
 const eye=new THREE.Vector3(eyeX,1.15,eyeZ);
 for(const b of [pc,ps4,deck]){
  const projected=new THREE.Box3();
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
   const corner=new THREE.Vector3(x,y,z),ratio=(television.frontX-eye.x)/(x-eye.x);
   projected.expandByPoint(corner.sub(eye).multiplyScalar(ratio).add(eye));
  }
  assert.ok(projected.max.z<screen.min.z||projected.max.y<screen.min.y,'All devices leave the full screen visible from the sofa and chaise');
 }
}
assert.ok(deck.max.z<greyPad.min.z,'Docked Steam Deck stays to the right of both controllers');
const ps4Tiers=new THREE.Box3();station.getObjectByName('ps4-pro-chassis').traverse(o=>{if(o.name==='ps4-tier')ps4Tiers.union(new THREE.Box3().setFromObject(o));});
const ps4Size=ps4Tiers.getSize(new THREE.Vector3());
assert.ok(Math.abs(ps4Size.y-ps4Pro.height)<1e-6&&Math.abs(ps4Size.x-ps4Pro.depth)<1e-6&&Math.abs(ps4Size.z-ps4Pro.width)<1e-6,'Vertical PS4 uses the official 295 × 327 × 55 mm chassis');
assert.ok(Math.abs(ps4Tiers.min.y-bounds('ps4-vertical-stand').max.y)<1e-6,'PS4 chassis touches its stand');
const deckBody=station.getObjectByName('steam-deck'),deckShell=deckBody.getObjectByName('deck-shell');deckShell.geometry.computeBoundingBox();
const deckSize=deckShell.geometry.boundingBox.getSize(new THREE.Vector3());
assert.ok(Math.abs(deckSize.x-steamDeck.width)<1e-6&&Math.abs(deckSize.y-steamDeck.height)<1e-6,'Deck shell retains full 298 × 117 mm dimensions');
assert.ok(deckBody.rotation.x<0,'Deck leans back toward its dock support');
assert.ok(bounds('steam-deck').min.y>=bounds('dock-base').max.y-.001&&bounds('steam-deck').min.y<bounds('dock-base').max.y+.008,'Handheld rests in the dock cradle');
const dockSize=bounds('steam-dock').getSize(new THREE.Vector3());
assert.ok(dockSize.z<=steamDock.width+.001&&dockSize.x<=steamDock.depth+.002,'Dock follows the official footprint including ports');
const usb=station.getObjectByName('deck-dock-usb-c-cable'),usbEnd=usb.geometry.parameters.path.getPoint(1).applyMatrix4(usb.matrixWorld);
assert.ok(bounds('deck-usb-c-plug').containsPoint(usbEnd),'Dock USB-C cable meets the handheld plug');
for(const name of ['ps4-hdmi-cable','dock-hdmi-cable','pc-hdmi-cable','pc-power-cable']){
 const cable=station.getObjectByName(name),start=cable.geometry.parameters.path.getPoint(0).applyMatrix4(cable.matrixWorld);
 const port=bounds({'ps4-hdmi-cable':'ps4-hdmi-plug','dock-hdmi-cable':'dock-hdmi-port','pc-hdmi-cable':'pc-hdmi-plug','pc-power-cable':'pc-power-plug'}[name]).expandByScalar(.001);
 assert.ok(port.containsPoint(start),'HDMI lead starts at its device connector');
}
for(const name of ['ps4-power-cable','dock-power-cable']){
 const end=station.getObjectByName(name).geometry.parameters.path.getPoint(1);
 assert.ok(Math.abs(end.x)+.002<cableDuct.width/2&&Math.abs(end.z-cableDuct.z)+.002<cableDuct.depth/2&&end.y<mediaConsole.top,'Power lead joins the lower cable bundle behind the console');
}
assert.ok(station.getObjectByName('pc-tempered-glass').material.transparent,'PC interior is visible through the glass panel');
const tower=station.getObjectByName('desktop-pc'),glass=station.getObjectByName('pc-tempered-glass');
const glassNormal=new THREE.Vector3(0,0,1).transformDirection(glass.matrixWorld);
assert.ok(Math.abs(tower.rotation.y+Math.PI/2)<1e-8&&glassNormal.z>.999,'Quarter turn exposes LEDs to the left, towards the TV');
const blackSide=station.getObjectByName('pc-back-side');
assert.ok(!blackSide.material.transparent&&bounds('pc-back-side').max.z<pc.getCenter(new THREE.Vector3()).z,'Opaque black side faces the right wall');
assert.ok(pc.getSize(new THREE.Vector3()).z<.24,'Silhouette from the sofa is about 23 cm instead of 44 cm');
for(const name of ['ram-light','graphics-card','coolant-tube','case-fan-rings'])assert.ok(station.getObjectByName(name),name);
assert.equal(gameControllers.length,2);
for(const controller of gameControllers){
 const pad=station.getObjectByName(controller.name);
 for(const name of ['controller-touchpad','controller-left-grip','controller-right-grip','analogue-sticks','button-symbol-triangle','button-symbol-circle','button-symbol-cross','button-symbol-square'])assert.ok(pad.getObjectByName(name),name);
}
assert.notEqual(station.getObjectByName('white-controller').getObjectByName('controller-left-grip').material.color.getHex(),station.getObjectByName('grey-controller').getObjectByName('controller-left-grip').material.color.getHex());
const duct=bounds('central-cable-duct');
assert.ok(Math.abs(duct.getCenter(new THREE.Vector3()).z-television.centerZ)<1e-8,'Raceway is centred beneath the TV');
assert.ok(Math.abs(duct.max.y-television.centerY)<1e-6&&duct.min.y<mediaConsole.top,'Raceway connects the console to the TV centre');
for(const name of ['pc-hdmi-cable','ps4-hdmi-cable','dock-hdmi-cable','tv-power-cable']){
 const cable=station.getObjectByName(name),end=cable.geometry.parameters.path.getPoint(1);
 assert.ok(Math.abs(end.y-television.centerY)<1e-8,'Cable reaches the TV at its centre height');
 assert.ok(bounds(name).min.y<mediaConsole.top+.07,'Cable connects to the console area');
 const {path,tubularSegments,radialSegments}=cable.geometry.parameters;
 // The HDMI lead starts at the PC above the console before entering the duct.
 // Only its vertical riser belongs inside the raceway; height alone also selects
 // the exposed PC connection. Identify the riser by distance along the path.
 const riserIndex=name==='tv-power-cable'?0:1;
 const riser=path.curves[riserIndex],lengths=path.getCurveLengths();
 assert.ok(riser.isLineCurve3,'Raceway section is a straight riser');
 assert.ok(riser.v1.y<.56&&riser.v2.y>.92,'Riser spans the visible raceway');
 for(const end of [riser.v1,riser.v2]){
  assert.ok(Math.abs(end.x)<cableDuct.width/2,'Riser centre stays within duct width');
  assert.ok(Math.abs(end.z-cableDuct.z)<cableDuct.depth/2,'Riser centre stays within duct depth');
 }
 if(riserIndex>0){
  const leadEnd=path.curves[riserIndex-1].getPoint(1);
  assert.ok(leadEnd.distanceTo(riser.v1)<1e-8,'Device lead connects to the riser');
 }
 const positions=cable.geometry.attributes.position;let checkedRings=0;
 for(let ring=0;ring<=tubularSegments;ring++){
  const distance=ring/tubularSegments*path.getLength();
  if(distance<=(riserIndex?lengths[riserIndex-1]:0)||distance>=lengths[riserIndex])continue;
  const centre=path.getPointAt(ring/tubularSegments);
  if(centre.y<=.56||centre.y>=.92)continue;
  checkedRings++;
  for(let side=0;side<=radialSegments;side++){
   const i=ring*(radialSegments+1)+side;
   assert.ok(Math.abs(positions.getX(i))<cableDuct.width/2,'Cable remains inside raceway width');
   assert.ok(Math.abs(positions.getZ(i)-cableDuct.z)<cableDuct.depth/2,'Cable stays behind the raceway cover');
  }
 }
 assert.ok(checkedRings>=3,'Check multiple complete cable cross-sections inside the raceway');
}
assert.ok(station.getObjectByName('pc-power-cable'),'PC power cable runs behind the console');
// Check the actual tube vertices, including their thickness, against the wood
// and the exposed top. This catches long diagonal runs and curve overshoot.
const rearZ=mediaConsole.x-mediaConsole.depth/2-television.frontX;
for(const name of ['pc-hdmi-cable','ps4-hdmi-cable','dock-hdmi-cable','tv-power-cable','pc-power-cable','ps4-power-cable','dock-power-cable']){
 const cable=station.getObjectByName(name),p=cable.geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(y>mediaConsole.top-.024&&y<mediaConsole.top&&z>rearZ){
   assert.ok(Math.hypot(x-dockCableHole.x,z-dockCableHole.z)<dockCableHole.radius,`${name} passes through the top opening, not through wood`);
  }
  if(z>rearZ&&z<rearZ+.012&&y>.112&&y<mediaConsole.top-.024){
   assert.ok(Math.hypot(x-dockCableHole.x,y-dockCableHole.rearY)<dockCableHole.radius||Math.hypot(x,y-.34)<.025,`${name} passes through a rear opening`);
  }
  if(y>mediaConsole.top+.003&&y<.92&&Math.abs(x)>.04&&z>rearZ){
   const behindDock=name.startsWith('dock-')&&Math.abs(x-steamDeck.x)<.04&&y<mediaConsole.top+.012;
   const behindPS4=name.startsWith('ps4-')&&Math.abs(x-ps4Pro.x)<.02&&z<ps4Pro.z-ps4Pro.depth/2+.003;
   const behindPC=name.startsWith('pc-')&&Math.abs(x-desktopPC.x)<.065&&z<desktopPC.z-desktopPC.width/2+.003;
   assert.ok(behindDock||behindPS4||behindPC,`${name} cannot cross the visible top above the cabinet`);
  }
 }
}
assert.ok(bounds('central-cable-duct').max.x<mediaCollider.minX,'Raceway fits behind the cabinet without entering its wood');
const v=new THREE.Vector3(),instance=new THREE.Matrix4();let triangles=0;
station.traverse(o=>{
 if(!o.isMesh)return;
 triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);
 for(let i=0;i<(o.count??1);i++){
  if(o.isInstancedMesh)o.getMatrixAt(i,instance);else instance.identity();
  for(let j=0;j<o.geometry.attributes.position.count;j++){
   v.fromBufferAttribute(o.geometry.attributes.position,j).applyMatrix4(instance).applyMatrix4(o.matrixWorld);
   assert.ok(Number.isFinite(v.x+v.y+v.z),'All geometry is finite');
   assert.ok(canStand(v.x,v.z,0),`${o.name} must not penetrate architectural walls at ${v.x},${v.z}`);
  }
 }
});
assert.ok(triangles<45000,'Static gaming details stay within a modest geometry budget');
for(const id of ['1','2','3']){setKitchenCollisionVariant(id);assert.equal(canWalk(mediaConsole.x,mediaConsole.z),false,'Console remains solid in all kitchens');assert.equal(canWalk(3.82,9.72),true,'Path in front of the console remains open');}
setKitchenCollisionVariant('1');
console.log(`PASS: centred LG C1 185.1 × 106.2 cm, console-supported PC/PS4 Pro/docked Deck/controllers, connected central raceway, wall clearance; ${triangles} triangles.`);
