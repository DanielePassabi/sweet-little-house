import * as THREE from './vendor/three.module.js';

// Local X runs from the headboard wall to the foot; Z is the bed's width.
// The complete bed retains its original 2.00 m wall-to-footprint depth.
export function createBed(parent,{wallX,centerZ=3.05,frame,fabric,duvet,accent}){
 const group=new THREE.Group();group.name='soft-double-bed';group.position.set(wallX,0,centerZ);parent.add(group);
 const thread=new THREE.MeshStandardMaterial({color:'#e4dfd5',roughness:1});
 const lilacThread=new THREE.MeshStandardMaterial({color:'#b39ac5',roughness:1});
 const underside=new THREE.MeshStandardMaterial({color:'#dcc9e6',roughness:1});
 const feet=new THREE.MeshStandardMaterial({color:'#514d49',roughness:.75});
 group.userData.fabricMaterials=[thread,lilacThread,underside];
 function part(name,geometry,material,x=0,y=0,z=0,root=group){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
 }
 function soft(w,h,d,r,puff=0){
  const geometry=new THREE.BoxGeometry(w,h,d,28,8,28),p=geometry.attributes.position,n=geometry.attributes.normal;
  const half=new THREE.Vector3(w/2-r,h/2-r,d/2-r),low=half.clone().negate(),v=new THREE.Vector3(),core=new THREE.Vector3(),normal=new THREE.Vector3();
  const fullness=(x,z)=>puff*Math.max(0,1-(2*x/w)**2)*Math.max(0,1-(2*z/d)**2);
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i);core.copy(v).clamp(low,half);normal.copy(v).sub(core).normalize();v.copy(core).addScaledVector(normal,r);
   const weight=Math.abs(normal.y),sign=Math.sign(normal.y),x=v.x,z=v.z;
   v.y+=sign*fullness(x,z)*weight*weight;
   normal.x-=(fullness(x+.001,z)-fullness(x-.001,z))/.002*weight;
   normal.z-=(fullness(x,z+.001)-fullness(x,z-.001))/.002*weight;normal.normalize();
   p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
 }
 function seam(name,points,material=thread,r=.0023,closed=true,root=group){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
  return part(name,new THREE.TubeGeometry(curve,Math.max(48,points.length*3),r,4,closed),material,0,0,0,root);
 }
 function outline(minX,maxX,minZ,maxZ,y,r=.06){
  const points=[];
  for(const [cx,cz,start] of [[maxX-r,maxZ-r,0],[minX+r,maxZ-r,Math.PI/2],[minX+r,minZ+r,Math.PI],[maxX-r,minZ+r,Math.PI*1.5]]){
   for(let i=0;i<=5;i++){const a=start+i*Math.PI/10;points.push([cx+Math.cos(a)*r,y,cz+Math.sin(a)*r]);}
  }
  return points;
 }
 part('upholstered-headboard',soft(.15,.95,1.88,.055),frame,.103,.49,0);
 for(const z of [-.442,.442])part('headboard-padded-panel',soft(.054,.73,.866,.025),frame,.157,.54,z);
 // The small centre channel and perimeter seam describe the upholstered panels.
 seam('headboard-piping',outline(.11,.95,-.883,.883,0,.07).map(([y,,z])=>[.185,y,z]),thread,.002);
 part('rounded-bed-base',soft(1.82,.25,1.68,.065),frame,1.09,.17,0);
 seam('base-top-piping',outline(.205,1.975,-.815,.815,.278,.07),thread,.0025);
 for(const x of [.34,1.82])for(const z of [-.66,.66])part('recessed-bed-foot',new THREE.CylinderGeometry(.026,.021,.065,12),feet,x,.038,z);
 part('rounded-mattress',soft(1.78,.25,1.60,.065,.008),fabric,1.09,.40,0);
 for(const y of [.305,.493])seam('mattress-edge-stitching',outline(.235,1.945,-.765,.765,y,.07));
 // Slightly different pillow angles and fuller centres avoid rigid cuboid cushions.
 const pillowGeometry=soft(.46,.14,.69,.055,.034),accentGeometry=soft(.25,.13,.43,.05,.026);
 for(const [i,z] of [-.40,.40].entries()){
  const pillow=new THREE.Group();pillow.name='sleeping-pillow';pillow.position.set(.47,.627,z);pillow.rotation.y=i?-.035:.035;group.add(pillow);
  part('pillow-with-soft-centre',pillowGeometry,fabric,0,0,0,pillow);
  seam('pillow-piped-edge',outline(-.222,.222,-.336,.336,0,.055),thread,.0018,true,pillow);
  const cushion=new THREE.Group();cushion.name='lilac-scatter-cushion';cushion.position.set(.735,.72,z+(i?.012:-.012));cushion.rotation.set(i?.035:-.035,i?.09:-.09,-.14);group.add(cushion);
  part('puffy-lilac-cushion',accentGeometry,accent,0,0,0,cushion);
  seam('accent-cushion-piping',outline(-.119,.119,-.208,.208,0,.045),lilacThread,.0016,true,cushion);
 }
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function clothPoint(u,v,fold=false,bottom=false){
  let x=fold?.64+u*.26:.64+u*1.34,z=(v*2-1)*.835;
  const side=smooth((Math.abs(z)-.725)/.11),foot=smooth((x-1.83)/.15);
  const drop=(side*.235+foot*.215+Math.sqrt((side*.235-foot*.215)**2+.000006))/2;
  // Gentle broad undulation, with narrower creases toward the hanging sides.
  const wave=.009*Math.sin(x*11+z*3)+.006*Math.sin(z*16-x*4)+.005*Math.sin(x*32+z*11)*smooth((Math.abs(z)-.38)/.42);
  const crown=.026*Math.sin(Math.PI*u)*Math.max(0,1-(z/.88)**2);
  let y=.583+crown+wave-drop;
  // A double layer curves over the exposed, lighter folded-back edge.
  if(fold)y+=.019+.018*Math.sin(Math.PI*u);
  if(bottom)y-=fold?.012:.055-.037*Math.max(side,foot);
  z+=.003*Math.sin(x*22)*side;
  x-=.015*smooth((x-1.92)/.06)*smooth((Math.abs(z)-.78)/.055);
  return [x,y,z];
 }
 function clothGeometry(fold=false){
  const nx=fold?12:52,nz=48,vertices=[],uv=[],indices=[],stride=nz+1,layer=(nx+1)*stride;
  for(const bottom of [false,true])for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   vertices.push(...clothPoint(i/nx,j/nz,fold,bottom));uv.push(i/nx,j/nz);
  }
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const a=i*stride+j,b=a+stride;
   indices.push(a,a+1,b,b,a+1,b+1,a+layer,b+layer,a+1+layer,b+layer,b+1+layer,a+1+layer);
  }
  const rim=[];for(let j=0;j<=nz;j++)rim.push(j);for(let i=1;i<=nx;i++)rim.push(i*stride+nz);
  for(let j=nz-1;j>=0;j--)rim.push(nx*stride+j);for(let i=nx-1;i>0;i--)rim.push(i*stride);
  for(let k=0;k<rim.length;k++){const a=rim[k],b=rim[(k+1)%rim.length];indices.push(a,a+layer,b,b,a+layer,b+layer);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
 }
 part('draped-lilac-duvet',clothGeometry(),duvet);
 part('turned-back-duvet-cuff',clothGeometry(true),underside);
 const hem=[];
 for(let i=0;i<=36;i++)hem.push(clothPoint(i/36,0));
 for(let j=1;j<=36;j++)hem.push(clothPoint(1,j/36));
 for(let i=35;i>=0;i--)hem.push(clothPoint(i/36,1));
 seam('duvet-stitched-hem',hem,lilacThread,.0022,false);
 seam('folded-cuff-edge',Array.from({length:49},(_,i)=>clothPoint(1,i/48,true)),thread,.0018,false);
 group.updateMatrixWorld(true);return group;
}
