import * as THREE from './vendor/three.module.js';
import {createBerserkCollection} from './berserk-books.js?v=20261029-2';
import {mediaConsole as layout,television as tv,dockCableHole} from './media-layout.js?v=20261101-2';

function roundedOutline(w,h,r){
 const s=new THREE.Shape(),a=w/2,b=h/2;
 s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);
 s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);
 s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);
 s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);s.closePath();return s;
}
function softenedExtrusion(shape,depth,bevel=.003){
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:10,steps:1});
 geometry.translate(0,0,bevel);return geometry;
}

// Local X runs from left to right when looking at the TV from the sofa.
export function createTVConsole(parent,box){
 const root=new THREE.Group();root.name='oak-tv-console';root.position.set(layout.x,0,layout.z);root.rotation.y=Math.PI/2;parent.add(root);
 const oak=new THREE.MeshStandardMaterial({color:'#b28a59',roughness:.78});
 const interior=new THREE.MeshStandardMaterial({color:'#9b764d',roughness:.84});
 const ceramic=new THREE.MeshStandardMaterial({color:'#d5c7ae',roughness:.85});
 root.userData.woodMaterials=[oak,interior];
 const block=(name,w,h,d,m,x,y,z)=>{const p=box(w,h,d,m,x,y,z,root);p.name=name;return p;};
 const part=(name,g,m,x,y,z)=>{const p=new THREE.Mesh(g,m);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;root.add(p);return p;};
 const half=layout.width/2,rear=-layout.depth/2,bodyBottom=.112,bodyTop=layout.top-.024,bodyHeight=bodyTop-bodyBottom,bodyY=(bodyBottom+bodyTop)/2;
 const holeX=dockCableHole.x-(tv.centerZ-layout.z),holeZ=dockCableHole.z-(layout.x-tv.frontX);
 const radius=layout.cornerRadius,bevel=.003;
 const topShape=roundedOutline(layout.width-2*bevel,layout.depth-2*bevel,radius-bevel);
 const topHole=new THREE.Path();topHole.absarc(holeX,holeZ,dockCableHole.radius,0,Math.PI*2,true);topShape.holes.push(topHole);
 const topGeometry=softenedExtrusion(topShape,.024);topGeometry.rotateX(Math.PI/2);
 part('continuous-oak-top',topGeometry,oak,0,layout.top,0);
 const baseGeometry=softenedExtrusion(roundedOutline(layout.width-2*bevel,layout.depth-2*bevel,radius-bevel),.022);baseGeometry.rotateX(Math.PI/2);
 part('cabinet-base',baseGeometry,oak,0,bodyBottom,0);
 // Curved end panels follow the top's four corners, keeping the niches hollow.
 const side=new THREE.Shape(),edge=half-radius,t=.022;
 side.moveTo(edge,rear);side.quadraticCurveTo(half,rear,half,rear+radius);
 side.lineTo(half,-rear-radius);side.quadraticCurveTo(half,-rear,edge,-rear);
 side.lineTo(edge,-rear-t);side.quadraticCurveTo(half-t,-rear-t,half-t,-rear-radius);
 side.lineTo(half-t,rear+radius);side.quadraticCurveTo(half-t,rear+t,edge,rear+t);side.closePath();
 const sideGeometry=new THREE.ExtrudeGeometry(side,{depth:bodyHeight,bevelEnabled:false,curveSegments:10,steps:1});sideGeometry.rotateX(Math.PI/2);
 for(const angle of [0,Math.PI])part('cabinet-side',sideGeometry,oak,0,bodyTop,0).rotation.y=angle;
 for(const x of [-.72,.72])block('base-divider',.022,bodyHeight,layout.depth-.022,oak,x,bodyY,-.011);
 // Two closed end cupboards surround three genuinely open central niches.
 const doorEdge=half-radius-.004,doorWidth=doorEdge-.735,doorX=(doorEdge+.735)/2;
 const doorGeometry=softenedExtrusion(roundedOutline(doorWidth-2*bevel,bodyHeight-.008-2*bevel,.025-bevel),.020);
 part('left-flat-door',doorGeometry,oak,-doorX,bodyY,.220);
 part('right-flat-door',doorGeometry,oak,doorX,bodyY,.220);
 for(const x of [-.24,.24])block('open-niche-divider',.018,bodyHeight,.445,oak,x,bodyY,-.013);
 const rearShape=new THREE.Shape();rearShape.moveTo(-half+radius,bodyBottom);rearShape.lineTo(half-radius,bodyBottom);rearShape.lineTo(half-radius,bodyTop);rearShape.lineTo(-half+radius,bodyTop);rearShape.closePath();
 const cableHole=new THREE.Path();cableHole.absarc(tv.centerZ-layout.z,.34,.025,0,Math.PI*2,true);rearShape.holes.push(cableHole);
 const dockRearHole=new THREE.Path();dockRearHole.absarc(holeX,dockCableHole.rearY,dockCableHole.radius,0,Math.PI*2,true);rearShape.holes.push(dockRearHole);
 part('rear-panel-with-cable-hole',new THREE.ExtrudeGeometry(rearShape,{depth:.012,bevelEnabled:false,curveSegments:12}),interior,0,0,rear);
 for(const x of [-half+.14,0,half-.14])for(const z of [-.17,.17])block('recessed-oak-foot',.028,.09,.028,oak,x,.045,z);
 createBerserkCollection(root,oak);
 const vaseProfile=[[0,0],[.043,0],[.055,.025],[.058,.10],[.040,.16],[.022,.18],[.022,.23],[.018,.235],[.016,.23],[.016,.18],[.034,.157],[.050,.095],[.047,.03],[0,.012]];
 const vase=new THREE.LatheGeometry(vaseProfile.map(p=>new THREE.Vector2(...p)),24);
 const lowVase=part('base-ceramic-vase',vase,ceramic,.48,bodyBottom,.07);lowVase.scale.set(.65,.8,.65);
 root.updateMatrixWorld(true);return root;
}
