import * as THREE from './vendor/three.module.js';
import {HEIGHT,footprint,point} from './model.js';

// Indicative positions, not electrical points surveyed from the architectural PDF.
export const ceilingLayout=[
 {id:'living-lounge',room:'living',x:5.45,z:9.9,size:.50,intensity:20},
 {id:'living-kitchen',room:'living',x:6.2,z:13.3,size:.50,intensity:20},
 {id:'bedroom',room:'bedroom',x:6.0,z:3.0,size:.42,intensity:13},
 {id:'room2',room:'room2',x:2.0,z:1.6,size:.42,intensity:13},
 {id:'room3',room:'room3',x:1.48,z:6.72,size:.42,intensity:12},
 {id:'bath1',room:'bath1',x:1.28,z:4.14,size:.32,intensity:10},
 {id:'bath2',room:'bath2',x:6.66,z:6.55,size:.32,intensity:10},
 {id:'hall-north',room:'hall',x:3.58,z:4.84,size:.28,intensity:7},
 {id:'hall-south',room:'hall',x:4.40,z:7.02,size:.28,intensity:7},
 {id:'utility',room:'utility',x:1.28,z:9.50,size:.32,intensity:9}
];
// Display-balanced approximations; this is a visual preview, not a lux survey.
export const lightTemperatures={3000:'#ffd1a0',4000:'#fff1df'};

export function createCeiling(){
 const shape=new THREE.Shape();
 footprint.map(point).forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 // A closed shadow occluder above the unchanged 2.60 m underside. Unlike the
 // old coplanar, upward-facing sheet, its bottom has a true downward normal.
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false,steps:1});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,HEIGHT,0);
 const material=new THREE.MeshStandardMaterial({color:'#faf9f3',roughness:1,shadowSide:THREE.FrontSide});
 const roof=new THREE.Mesh(geometry,material);roof.name='closed-ceiling';
 roof.castShadow=true;roof.receiveShadow=true;
 return roof;
}

export function createInteriorLighting(scene){
 const group=new THREE.Group();group.name='ceiling-luminaires';scene.add(group);
 const frameMaterial=new THREE.MeshStandardMaterial({color:'#e5e5e1',roughness:.7,metalness:.08});
 const diffuserMaterial=new THREE.MeshStandardMaterial({color:'#fffaf1',roughness:1,emissive:lightTemperatures[3000],emissiveIntensity:1.4});
 const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),frameMaterial,ceilingLayout.length);
 const diffusers=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),diffuserMaterial,ceilingLayout.length);
 bodies.name='square-ceiling-frames';diffusers.name='square-ceiling-diffusers';
 // The light origin is immediately below the diffuser; it never illuminates
 // the top of a wall. The luminaire body itself cannot shadow its own light.
 bodies.receiveShadow=true;diffusers.receiveShadow=false;group.add(bodies,diffusers);
 const dummy=new THREE.Object3D(),lights=[];
 ceilingLayout.forEach((layout,i)=>{
  dummy.rotation.set(0,0,0);dummy.position.set(layout.x,HEIGHT-.03,layout.z);dummy.scale.set(layout.size,.06,layout.size);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
  dummy.rotation.x=Math.PI/2;dummy.position.y=HEIGHT-.061;dummy.scale.set(layout.size-.035,layout.size-.035,1);dummy.updateMatrix();diffusers.setMatrixAt(i,dummy.matrix);
  const light=new THREE.SpotLight(lightTemperatures[3000],layout.intensity,7,Math.PI*.38,.62,2);
  light.name=layout.id;light.position.set(layout.x,HEIGHT-.075,layout.z);light.target.position.set(layout.x,0,layout.z);
  light.castShadow=true;light.shadow.mapSize.set(512,512);
  // Sun/view changes must not rebuild ten unchanged indoor shadow maps.
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
  light.shadow.camera.near=.05;light.shadow.camera.far=7;
  light.shadow.bias=-.00004;light.shadow.normalBias=.003;
  light.userData.onIntensity=layout.intensity;group.add(light,light.target);lights.push(light);
 });
 for(const mesh of [bodies,diffusers]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
 let enabled=true,kelvin=3000;
 return {group,lights,diffuserMaterial,
  invalidateShadows(){for(const light of lights)light.shadow.needsUpdate=true;},
  setState(on,temperature){
   enabled=!!on;kelvin=Object.hasOwn(lightTemperatures,temperature)?Number(temperature):3000;
   for(const light of lights){light.intensity=enabled?light.userData.onIntensity:0;light.color.set(lightTemperatures[kelvin]);}
   diffuserMaterial.emissive.set(lightTemperatures[kelvin]);diffuserMaterial.emissiveIntensity=enabled?1.4:0;
  },
  get state(){return {enabled,kelvin,fixtureCount:lights.length};}
 };
}
