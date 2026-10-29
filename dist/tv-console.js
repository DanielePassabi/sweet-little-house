import * as THREE from './vendor/three.module.js';
import {mediaConsole as layout,television as tv,dockCableHole} from './media-layout.js?v=20261029-1';

// Local X runs from left to right when looking at the TV from the sofa.
export function createTVConsole(parent,box){
 const root=new THREE.Group();root.name='oak-tv-console';root.position.set(layout.x,0,layout.z);root.rotation.y=Math.PI/2;parent.add(root);
 const oak=new THREE.MeshStandardMaterial({color:'#b28a59',roughness:.78});
 const interior=new THREE.MeshStandardMaterial({color:'#9b764d',roughness:.84});
 const dark=new THREE.MeshStandardMaterial({color:'#66503b',roughness:.9});
 const ceramic=new THREE.MeshStandardMaterial({color:'#d5c7ae',roughness:.85});
 const pages=new THREE.MeshStandardMaterial({color:'#e0d6bd',roughness:1});
 root.userData.woodMaterials=[oak,interior];
 const block=(name,w,h,d,m,x,y,z)=>{const p=box(w,h,d,m,x,y,z,root);p.name=name;return p;};
 const part=(name,g,m,x,y,z)=>{const p=new THREE.Mesh(g,m);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;root.add(p);return p;};
 const half=layout.width/2,rear=-layout.depth/2,bodyBottom=.112,bodyTop=layout.top-.024,bodyHeight=bodyTop-bodyBottom,bodyY=(bodyBottom+bodyTop)/2;
 const holeX=dockCableHole.x-(tv.centerZ-layout.z),holeZ=dockCableHole.z-(layout.x-tv.frontX);
 const topShape=new THREE.Shape();topShape.moveTo(-half,rear);topShape.lineTo(half,rear);topShape.lineTo(half,-rear);topShape.lineTo(-half,-rear);topShape.closePath();
 const topHole=new THREE.Path();topHole.absarc(holeX,holeZ,dockCableHole.radius,0,Math.PI*2,true);topShape.holes.push(topHole);
 const topGeometry=new THREE.ExtrudeGeometry(topShape,{depth:.024,bevelEnabled:false,curveSegments:16});topGeometry.rotateX(Math.PI/2);
 part('continuous-oak-top',topGeometry,oak,0,layout.top,0);
 block('cabinet-base',layout.width,.022,layout.depth,oak,0,.101,0);
 for(const x of [-half+.011,half-.011])block('cabinet-side',.022,bodyHeight,layout.depth,oak,x,bodyY,0);
 for(const x of [-.72,.72])block('base-divider',.022,bodyHeight,layout.depth-.022,oak,x,bodyY,-.011);
 // Two closed end cupboards surround three genuinely open central niches.
 const doorWidth=half-.026-.735,doorX=(half-.026+.735)/2;
 block('left-flat-door',doorWidth,bodyHeight-.008,.020,oak,-doorX,bodyY,.230);
 block('right-flat-door',doorWidth,bodyHeight-.008,.020,oak,doorX,bodyY,.230);
 for(const x of [-.24,.24])block('open-niche-divider',.018,bodyHeight,.445,oak,x,bodyY,-.013);
 const rearShape=new THREE.Shape();rearShape.moveTo(-half+.022,bodyBottom);rearShape.lineTo(half-.022,bodyBottom);rearShape.lineTo(half-.022,bodyTop);rearShape.lineTo(-half+.022,bodyTop);rearShape.closePath();
 const cableHole=new THREE.Path();cableHole.absarc(tv.centerZ-layout.z,.34,.025,0,Math.PI*2,true);rearShape.holes.push(cableHole);
 const dockRearHole=new THREE.Path();dockRearHole.absarc(holeX,dockCableHole.rearY,dockCableHole.radius,0,Math.PI*2,true);rearShape.holes.push(dockRearHole);
 part('rear-panel-with-cable-hole',new THREE.ExtrudeGeometry(rearShape,{depth:.012,bevelEnabled:false,curveSegments:12}),interior,0,0,rear);
 for(const x of [-half+.14,0,half-.14])for(const z of [-.17,.17])block('recessed-oak-foot',.028,.09,.028,oak,x,.045,z);
 for(let i=0;i<2;i++)block('base-book',.24,.026,.18,i?pages:dark,-.48,.125+i*.026,.085);
 const vaseProfile=[[0,0],[.043,0],[.055,.025],[.058,.10],[.040,.16],[.022,.18],[.022,.23],[.018,.235],[.016,.23],[.016,.18],[.034,.157],[.050,.095],[.047,.03],[0,.012]];
 const vase=new THREE.LatheGeometry(vaseProfile.map(p=>new THREE.Vector2(...p)),24);
 const lowVase=part('base-ceramic-vase',vase,ceramic,.48,bodyBottom,.07);lowVase.scale.set(.65,.8,.65);
 root.updateMatrixWorld(true);return root;
}
