import * as THREE from './vendor/three.module.js';
import {mediaConsole as layout,mediaBookcase as bookcase,television as tv,dockCableHole} from './media-layout.js?v=20261028-4';

// Local X runs from left to right when looking at the TV from the sofa.
export function createTVConsole(parent,box){
 const root=new THREE.Group();root.name='oak-media-wall';root.position.set(layout.x,0,layout.z);root.rotation.y=Math.PI/2;parent.add(root);
 const oak=new THREE.MeshStandardMaterial({color:'#b28a59',roughness:.78});
 const interior=new THREE.MeshStandardMaterial({color:'#9b764d',roughness:.84});
 const dark=new THREE.MeshStandardMaterial({color:'#66503b',roughness:.9});
 const ceramic=new THREE.MeshStandardMaterial({color:'#d5c7ae',roughness:.85});
 const pages=new THREE.MeshStandardMaterial({color:'#e0d6bd',roughness:1});
 root.userData.woodMaterials=[oak,interior];
 const block=(name,w,h,d,m,x,y,z)=>{const p=box(w,h,d,m,x,y,z,root);p.name=name;return p;};
 const part=(name,g,m,x,y,z)=>{const p=new THREE.Mesh(g,m);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;root.add(p);return p;};
 const half=layout.width/2,rear=-layout.depth/2;
 const holeX=dockCableHole.x-(tv.centerZ-layout.z),holeZ=dockCableHole.z-(layout.x-tv.frontX);
 const topShape=new THREE.Shape();topShape.moveTo(-half,rear);topShape.lineTo(half,rear);topShape.lineTo(half,-rear);topShape.lineTo(-half,-rear);topShape.closePath();
 const topHole=new THREE.Path();topHole.absarc(holeX,holeZ,dockCableHole.radius,0,Math.PI*2,true);topShape.holes.push(topHole);
 const topGeometry=new THREE.ExtrudeGeometry(topShape,{depth:.024,bevelEnabled:false,curveSegments:16});topGeometry.rotateX(Math.PI/2);
 part('continuous-oak-top',topGeometry,oak,0,layout.top,0);
 block('cabinet-base',layout.width,.022,layout.depth,oak,0,.101,0);
 for(const x of [-half+.011,half-.011])block('cabinet-side',.022,.304,layout.depth,oak,x,.264,0);
 for(const x of [-.77,.80])block('base-divider',.022,.304,.458,oak,x,.264,-.011);
 // Two closed end cupboards surround three genuinely open central niches.
 block('left-flat-door',.595,.296,.020,oak,-1.073,.264,.230);
 block('right-flat-door',.565,.296,.020,oak,1.098,.264,.230);
 for(const x of [-.32,.36])block('open-niche-divider',.018,.304,.445,oak,x,.264,-.013);
 const rearShape=new THREE.Shape();rearShape.moveTo(-half+.022,.112);rearShape.lineTo(half-.022,.112);rearShape.lineTo(half-.022,.416);rearShape.lineTo(-half+.022,.416);rearShape.closePath();
 const cableHole=new THREE.Path();cableHole.absarc(-.20,.34,.025,0,Math.PI*2,true);rearShape.holes.push(cableHole);
 const dockRearHole=new THREE.Path();dockRearHole.absarc(holeX,dockCableHole.rearY,dockCableHole.radius,0,Math.PI*2,true);rearShape.holes.push(dockRearHole);
 part('rear-panel-with-cable-hole',new THREE.ExtrudeGeometry(rearShape,{depth:.012,bevelEnabled:false,curveSegments:12}),interior,0,0,rear);
 for(const x of [-1.26,0,1.26])for(const z of [-.17,.17])block('recessed-oak-foot',.028,.09,.028,oak,x,.045,z);
 // The tall part is mirrored to the RIGHT of the TV. Its first shelf leaves
 // a ventilated lower bay for the PC, with a clear view of its narrow front.
 const bx=bookcase.x,bottom=layout.top,back=rear+.009,front=rear+bookcase.depth;
 for(const x of [bx-bookcase.width/2+.012,bx+bookcase.width/2-.012])block('bookcase-side',.024,bookcase.height-bottom,bookcase.depth,oak,x,(bookcase.height+bottom)/2,rear+bookcase.depth/2);
 // Leave the PC bay open at the back for its connectors and ventilation.
 block('bookcase-back',bookcase.width-.048,bookcase.height-bookcase.shelves[0],.018,interior,bx,(bookcase.height+bookcase.shelves[0])/2,back);
 for(const y of bookcase.shelves)block('bookcase-shelf',bookcase.width-.048,.024,bookcase.depth-.018,oak,bx,y-.012,(back+.009+front)/2);
 function book(x,y,z,w,h,d,lean=0){
  const cover=new THREE.MeshStandardMaterial({color:['#b1a48c','#d2c6ad','#8a806d'][Math.round(w*100)%3],roughness:1});
  const group=new THREE.Group();group.name='shelf-book';group.position.set(x,y,z);group.rotation.z=lean;root.add(group);
  for(const [name,bw,bh,bd,m,px,py,pz] of [['book-pages',w-.004,h-.006,d-.006,pages,0,h/2,0],['book-cover',.002,h,d,cover,-w/2+.001,h/2,0],['book-cover',.002,h,d,cover,w/2-.001,h/2,0],['book-spine',w,h,.003,cover,0,h/2,d/2]]){const p=box(bw,bh,bd,m,px,py,pz,group);p.name=name;}
 }
 for(let i=0;i<5;i++)book(.92+i*.043,1.04,.035,.035,.24+(i%3)*.025,.15);
 book(1.19,1.04,.035,.045,.25,.15,-.16);
 for(let i=0;i<3;i++)block('stacked-book',.22,.024,.14,i===1?dark:pages,1.19,1.892+i*.024,.025);
 for(let i=0;i<2;i++)block('base-book',.24,.026,.18,i?pages:dark,-.53,.125+i*.026,.085);
 const vaseProfile=[[0,0],[.043,0],[.055,.025],[.058,.10],[.040,.16],[.022,.18],[.022,.23],[.018,.235],[.016,.23],[.016,.18],[.034,.157],[.050,.095],[.047,.03],[0,.012]];
 const vase=new THREE.LatheGeometry(vaseProfile.map(p=>new THREE.Vector2(...p)),24);
 part('tall-ceramic-vase',vase,ceramic,.95,1.88,.015);
 const small=part('small-ceramic-vase',vase,ceramic,1.22,1.48,.03);small.scale.set(.7,.65,.7);
 part('round-shelf-ornament',new THREE.SphereGeometry(.068,20,12),ceramic,.95,1.548,.03);
 const lowVase=part('base-ceramic-vase',vase,ceramic,.56,.112,.07);lowVase.scale.set(.65,.8,.65);
 root.updateMatrixWorld(true);return root;
}
