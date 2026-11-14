import * as THREE from './vendor/three.module.js';

export function bedUpholstery(group,fabric,accent){
 const thread=new THREE.MeshStandardMaterial({color:'#e4dfd5',roughness:1});
 const hemThread=new THREE.MeshStandardMaterial({color:'#75645a',roughness:1});
 group.userData.fabricMaterials=[thread,hemThread];
 function part(name,geometry,material,x=0,y=0,z=0,root=group){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
 }
 function soft(w,h,d,r,puff=0,segments=28){
  const geometry=new THREE.BoxGeometry(w,h,d,segments,8,segments),p=geometry.attributes.position,n=geometry.attributes.normal;
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
 // Broad upholstered channels share one rounded form, scaled independently
 // along each rail. Their recessed joins leave the storage compartment hollow.
 function addPaddedFrame(frame,{start,end,width,baseHeight,headWidth,headBack,headDepth,headTop}){
  const pad=soft(1,1,1,.27,0,9),transforms=[],matrix=new THREE.Matrix4();
  function channel(x,y,z,w,h,d){
   transforms.push(matrix.makeScale(w,h,d).setPosition(x,y,z).clone());
  }
  const bottom=.037,depth=.12;
  const height=baseHeight-bottom;
  const run=end-start-depth,pitch=run/5;
  for(const side of [-1,1])for(let i=0;i<5;i++){
   channel(start+(i+.5)*pitch,bottom+height/2,side*(width-depth)/2,pitch-.002,height,depth);
  }
  for(let i=0;i<5;i++){
   channel(end-depth/2,bottom+height/2,((i+.5)/5-.5)*width,depth,height,width/5-.002);
  }
  // The top row rises above the pillows, with a second padded row below it.
  channel(start+.015,bottom+height/2,0,.03,height,width-depth);
  const crown=.32,join=headTop-crown;
  for(let i=0;i<6;i++){
   const z=((i+.5)/6-.5)*headWidth;
   channel(headBack+headDepth/2,join+crown/2,z,headDepth,crown,headWidth/6);
   channel(headBack+headDepth/2,(join+bottom)/2,z,headDepth,join-bottom,headWidth/6);
  }
  const pads=new THREE.InstancedMesh(pad,frame,transforms.length);
  pads.name='channel-upholstered-frame';pads.castShadow=pads.receiveShadow=true;
  transforms.forEach((m,i)=>pads.setMatrixAt(i,m));group.add(pads);
 }
 function addPillows(deck,x,mattressTop){
  const geometry=soft(.44,.13,.73,.05,.047);
  for(const [i,z] of [-.38,.38].entries()){
   const pillow=new THREE.Group();pillow.name='sleeping-pillow';
   pillow.position.set(x,mattressTop+.133,z);pillow.rotation.set(i?.02:-.02,i?.035:-.035,-.38);deck.add(pillow);
   part('ivory-pillow',geometry,fabric,0,0,0,pillow);
   seam('pillow-piped-edge',outline(-.215,.215,-.358,.358,0,.052),thread,.0018,true,pillow);
  }
 }
 function addDuvet(deck,duvet,{start,foot,top}){
  function drape(distance,edge,radius){
   const travel=Math.max(0,distance-edge),angle=Math.min(travel/radius,Math.PI/2);
   return [Math.min(distance,edge)+radius*Math.sin(angle),
    radius*(1-Math.cos(angle))+Math.max(0,travel-radius*Math.PI/2)];
  }
  function clothPoint(u,v,quilt=false,bottom=false){
   const across=v*2-1;
   // The folded quilt crosses the lower half at a slight angle.
   const along=quilt?.42+.30*u+.034*across+.012*Math.sin(v*8):u;
   const [edgeX,endDrop]=drape(start+along*(foot+.215-start),foot-.067,.071);
   const [side,sideDrop]=drape(Math.abs(across)*(quilt?1.07:1.01),.745,.081);
   const z=(side+.012*sideDrop+.004*Math.min(sideDrop/.18,1)*Math.cos(10*along))*Math.sign(across);
   const x=edgeX+.008*endDrop+.002*Math.sin(across*9)*Math.min(1,endDrop/.14);
   const wrinkles=.007*Math.sin(28*x+4*z)+.003*Math.sin(52*z+9*x);
   let y=top+.042+.021*Math.sin(along*Math.PI)*(1-across*across)+wrinkles-Math.max(sideDrop,endDrop);
   if(quilt){
    // Quilted diamonds puff between diagonal stitch lines and pinch at the seams.
    const a=Math.sin(Math.PI*(u*3.2+v*8)),b=Math.sin(Math.PI*(u*3.2-v*8));
    y+=.026+.018*Math.abs(a*b);
   }
   if(bottom)y-=quilt?.018:.038;
   const overhang=quilt?.004*Math.sign(across)*Math.min(1,sideDrop/.08):0;
   return [x,y,z+overhang];
  }
  function clothGeometry(fold=false){
   const nx=fold?38:52,nz=fold?72:48,vertices=[],uv=[],indices=[],stride=nz+1,layer=(nx+1)*stride;
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
  part('draped-taupe-duvet',clothGeometry(),duvet,0,0,0,deck);
  part('quilted-throw',clothGeometry(true),accent,0,0,0,deck);
  const hem=[];
  for(let i=0;i<=36;i++)hem.push(clothPoint(i/36,0));
  for(let j=1;j<=36;j++)hem.push(clothPoint(1,j/36));
  for(let i=35;i>=0;i--)hem.push(clothPoint(i/36,1));
  seam('duvet-stitched-hem',hem,hemThread,.0022,false,deck);
  seam('quilt-bound-edge',Array.from({length:49},(_,i)=>clothPoint(1,i/48,true)),hemThread,.0018,false,deck);
 }
 return {part,soft,seam,outline,piping:thread,addPaddedFrame,addPillows,addDuvet};
}
