import * as THREE from './vendor/three.module.js';
import {wineCabinetLayout as layout} from './wine-cabinet-layout.js?v=20261016-5';

export function createWineCabinet(parent){
 const root=new THREE.Group();root.name='corner-wine-cabinet';root.position.set(layout.x,0,layout.z);root.rotation.y=layout.rotation;parent.add(root);
 const black=new THREE.MeshStandardMaterial({color:'#202321',roughness:.65,metalness:.25});
 const timber=new THREE.MeshStandardMaterial({color:'#292b28',roughness:.82});
 const glass=new THREE.MeshPhysicalMaterial({color:'#a9b6b0',transparent:true,opacity:.22,roughness:.14,metalness:.12,depthWrite:false,side:THREE.DoubleSide});
 const clearGlass=new THREE.MeshPhysicalMaterial({color:'#d9e4df',transparent:true,opacity:.36,roughness:.09,metalness:.1,depthWrite:false,side:THREE.DoubleSide});
 const green=new THREE.MeshStandardMaterial({color:'#3a4d2d',roughness:.24,metalness:.14});
 const dark=new THREE.MeshStandardMaterial({color:'#272c29',roughness:.25,metalness:.12});
 const amber=new THREE.MeshStandardMaterial({color:'#78623a',roughness:.30,metalness:.12});
 const label=new THREE.MeshStandardMaterial({color:'#e1d3ad',roughness:.9});
 const burgundy=new THREE.MeshStandardMaterial({color:'#702f3d',roughness:.65});
 const gold=new THREE.MeshStandardMaterial({color:'#b29651',roughness:.42,metalness:.5});
 const soil=new THREE.MeshStandardMaterial({color:'#30291f',roughness:1});
 const foliage=new THREE.MeshStandardMaterial({color:'#426b37',roughness:.88,side:THREE.DoubleSide});
 const lightLeaf=new THREE.MeshStandardMaterial({color:'#668347',roughness:.9,side:THREE.DoubleSide});
 const stem=new THREE.MeshStandardMaterial({color:'#53643c',roughness:1});
 const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,20);
 const pooled=new Map(),dummy=new THREE.Object3D();
 function part(name,g,m,x=0,y=0,z=0){const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 function block(name,w,h,d,m,x,y,z){const p=part(name,cube,m,x,y,z);p.scale.set(w,h,d);return p;}
 function instance(name,g,m,p,s=[1,1,1],r=[0,0,0]){
  const key=name+g.uuid+m.uuid;if(!pooled.has(key))pooled.set(key,{name,g,m,matrices:[]});
  dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...r);dummy.updateMatrix();pooled.get(key).matrices.push(dummy.matrix.clone());
 }
 function rod(name,a,b,r=.008,m=black){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const p=part(name,cylinder,m,...start.clone().add(end).multiplyScalar(.5).toArray());p.scale.set(r,delta.length(),r);p.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return p;
 }
 function curve(name,points,r=.01,m=black){return part(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,6,false),m);}
 function shelf(name,outline,y,thickness=.018){
  const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});geometry.rotateX(-Math.PI/2);return part(name,geometry,timber,0,y,0);
 }
 // Pentagonal shelves fit the corner, leaving a flat glazed front.
 for(const y of [.075,.405,.83,1.21])shelf('corner-shelf',layout.outline,y);
 const top=[[-.21,.11],[.21,.11],[.21,-.02],[0,-.23],[-.21,-.02]];
 shelf('plant-shelf',top,1.63,.018);
 for(const x of [-.31,.31]){
  block('front-frame-leg',.02,1.23,.02,black,x,.635,.20);
  curve('curved-upper-upright',[[x,1.24,.20],[x,1.33,.20],[x*.83,1.43,.16],[x*.69,1.53,.112],[x*.677,1.65,.11]],.011);
 }
 block('rear-frame-leg',.018,1.63,.018,black,0,.835,-.23);
 for(let i=0;i<top.length;i++){const a=top[i],b=top[(i+1)%top.length];rod('top-shelf-rim',[a[0],1.656,a[1]],[b[0],1.656,b[1]],.009);}
 // Two solid rear panels; bottles remain visible through the front glass door.
 for(const side of [-1,1]){
  const panel=block('cabinet-back',Math.hypot(.31,.31),.724,.018,timber,side*.155,.457,-.085);panel.rotation.y=side*-Math.PI/4;
  block('cabinet-side-return',.018,.724,.13,timber,side*.301,.457,.135);
 }
 for(const y of [.105,.79])block('door-horizontal-frame',.60,.035,.025,black,0,y,.204);
 for(const x of [-.282,.282])block('door-vertical-frame',.035,.72,.025,black,x,.448,.204);
 part('glazed-cabinet-door',new THREE.PlaneGeometry(.53,.65),glass,0,.448,.216);
 block('door-handle',.012,.13,.022,black,.239,.525,.232);
 for(const y of [.24,.67])block('door-hinge',.015,.045,.03,black,-.285,y,.218);
 // Glass fascia above the hanging stemware, with a slim black border.
 part('upper-glass-fascia',new THREE.PlaneGeometry(.60,.10),glass,0,1.285,.20);
 for(const y of [1.231,1.34])block('fascia-border',.62,.012,.018,black,0,y,.20);
 // Six upside-down wine glasses, each supported by two parallel rails.
 const glassProfile=[[0,0],[.028,0],[.031,.003],[.029,.006],[.003,.009],[.003,.061],[.015,.066],[.031,.088],[.034,.111],[.028,.139],[.025,.139],[.031,.11],[.028,.09],[.012,.07],[0,.067]];
 const goblet=new THREE.LatheGeometry(glassProfile.map(p=>new THREE.Vector2(...p)),24);
 for(const x of [-.25,-.15,-.05,.05,.15,.25]){
  for(const dx of [-.017,.017])rod('stemware-rail',[x+dx,1.188,.032],[x+dx,1.188,.19],.0035);
  rod('stemware-hanger',[x,1.21,.04],[x,1.187,.04],.0035);
  instance('hanging-wine-glasses',goblet,clearGlass,[x,1.195,.10],[1,1,1],[Math.PI,0,0]);
 }
 // Three small cocktail glasses sit above the glass band.
 const cocktail=new THREE.LatheGeometry([[0,0],[.025,0],[.025,.004],[.003,.007],[.003,.06],[.035,.095],[.032,.097],[.002,.064],[0,.062]].map(p=>new THREE.Vector2(...p)),24);
 for(const x of [-.18,0,.18])instance('cocktail-glasses',cocktail,clearGlass,[x,1.228,.075]);
 const bottle=new THREE.LatheGeometry([[0,0],[.026,0],[.031,.006],[.032,.02],[.032,.18],[.029,.195],[.014,.223],[.012,.24],[.012,.295],[0,.295]].map(p=>new THREE.Vector2(...p)),24);
 const labelBand=new THREE.CylinderGeometry(.0324,.0324,.10,24,1,true);
 const bottleMaterials=[green,dark,amber];
 function addBottle(x,y,z,i,scale=1){
  instance('wine-bottles',bottle,bottleMaterials[i%3],[x,y,z],[scale,scale,scale]);
  instance('bottle-labels',labelBand,label,[x,y+.10*scale,z],[scale,scale,scale]);
  instance('bottle-foils',cylinder,i%2?burgundy:gold,[x,y+.278*scale,z],[.0128*scale,.036*scale,.0128*scale]);
  instance('label-emblems',cube,burgundy,[x,y+.105*scale,z+.0325*scale],[.019*scale,.019*scale,.001]);
 }
 for(const [row,y] of [.093,.423].entries())for(const [i,x] of [-.16,0,.16].entries())addBottle(x,y,.075,i+row,i===1?1:.92);
 for(const [i,x] of [-.12,0,.12].entries())addBottle(x,.848,-.025,i,i===1?1:.90);
 // Potted trailing foliage on the small crown shelf.
 const pot=new THREE.LatheGeometry([[0,0],[.055,0],[.073,.105],[.074,.115],[.065,.115],[.064,.105],[.051,.012],[0,.012]].map(p=>new THREE.Vector2(...p)),24);
 part('plant-pot',pot,timber,0,1.648,-.015);
 const earth=part('pot-soil',cylinder,soil,0,1.75,-.015);earth.scale.set(.063,.008,.063);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.055);leafShape.bezierCurveTo(-.055,-.014,-.045,.042,-.015,.038);leafShape.quadraticCurveTo(-.004,.036,0,.025);leafShape.quadraticCurveTo(.004,.036,.015,.038);leafShape.bezierCurveTo(.045,.042,.055,-.014,0,-.055);
 const leaf=new THREE.ShapeGeometry(leafShape,8),p=leaf.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,.007*(1-Math.min(1,Math.abs(p.getX(i))/.04))+.06*p.getY(i));leaf.computeVertexNormals();
 for(let branch=0;branch<5;branch++){
  const a=branch*Math.PI*2/5,dx=Math.cos(a),dz=Math.sin(a);
  curve('plant-vine',[[0,1.75,-.015],[dx*.055,1.85,dz*.04],[dx*.11,1.88,dz*.07],[dx*.17,1.78,dz*.10+.02]],.002,stem);
  for(let j=0;j<5;j++){
   const t=(j+1)/5,side=j%2?1:-1;
   instance('pothos-leaves',leaf,branch%2?foliage:lightLeaf,[dx*.16*t+dz*.022*side,1.79+.095*Math.sin(t*Math.PI),dz*.09*t-dx*.022*side+.012],
    [1,1,1],[-.55+branch*.12,a+side*.55,side*.65]);
  }
 }
 // Rails, legs, panels and small hardware share draw calls as well as geometry.
 for(const object of [...root.children])if(object.isMesh&&!object.material.transparent&&(object.geometry===cube||object.geometry===cylinder)){
  object.updateMatrix();const key='structure'+object.geometry.uuid+object.material.uuid;
  if(!pooled.has(key))pooled.set(key,{name:'cabinet-structure',g:object.geometry,m:object.material,matrices:[]});
  pooled.get(key).matrices.push(object.matrix.clone());root.remove(object);
 }
 for(const {name,g,m,matrices} of pooled.values()){
  const mesh=new THREE.InstancedMesh(g,m,matrices.length);mesh.name=name;matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=!m.transparent;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
 }
 root.updateMatrixWorld(true);return root;
}
