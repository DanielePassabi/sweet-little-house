import {canStand,point,insidePolygon} from './model.js';


const rect=(minX,maxX,minZ,maxZ)=>({minX,maxX,minZ,maxZ});
const circle=(x,z,r)=>({x,z,r,minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r});
// Retain full solid fixtures; split seats/tables and use round pot/stool footprints.
export const furnitureColliders=[
 {minX:3.02,maxX:3.52,minZ:8.84,maxZ:11.02},
 {minX:.86,maxX:1.62,minZ:8.56,maxZ:9.10},
 {minX:1.70,maxX:2.45,minZ:8.56,maxZ:9.26},
 {minX:-.08,maxX:2.60,minZ:14.05,maxZ:14.88},
 {minX:.02,maxX:.91,minZ:3.15,maxZ:5.15},
 {minX:1.22,maxX:2.22,minZ:4.60,maxZ:5.10},
 {minX:6.18,maxX:7.12,minZ:5.16,maxZ:5.70},
 {minX:5.70,maxX:6.62,minZ:7.00,maxZ:7.91},
 {minX:4.34,maxX:6.35,minZ:2.12,maxZ:3.98},
 {minX:7.02,maxX:7.62,minZ:1.02,maxZ:5.04},
 {minX:7.60,maxX:9.54,minZ:12.34,maxZ:13.03},
 {minX:8.86,maxX:9.54,minZ:12.96,maxZ:15.03},
 {minX:5.94,maxX:6.96,minZ:13.06,maxZ:14.76},
 {minX:5.00,maxX:5.63,minZ:6.63,maxZ:7.97},
];
furnitureColliders.push(rect(6.37,7.49,8.095,10.5),rect(5.635,7.06,8.105,8.855));
furnitureColliders.push(rect(.85,1.70,11.825,12.675));
for(const z of [11.43,13.07])furnitureColliders.push(rect(1.015,1.535,z-.285,z+.285));
for(const [x,z,r] of [[3.47,8.34,.24*.86],[.18,10.83,.24],[6.08,13.45,.21],[6.08,14.37,.21]])furnitureColliders.push(circle(x,z,r));
furnitureColliders.push(rect(3.88,4.84,12.97,14.47));
for(const x of [3.92,4.80])for(const z of [13.34,14.10])furnitureColliders.push(rect(x-.23,x+.23,z-.23,z+.23));
for(const z of [5.68,7.72]){
 furnitureColliders.push(rect(.01,.65,z-.51,z+.51));
 furnitureColliders.push(rect(.92,1.536,z-.32,z+.32));
}
for(const z of [1.96,4.14])furnitureColliders.push(rect(4.535,4.985,z-.225,z+.225));
furnitureColliders.push(rect(.11,.69,8.565,8.815));
// Elliptical sanitary rims, represented by a convex perimeter, including tanks.
for(const [x,z,rx,rz] of [[1.42,3.62,.258,.37],[2.12,3.62,.258,.37],[7.29,6.15,.37,.258],[7.29,6.91,.37,.258]]){
 const points=Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*rx,z+Math.sin(i*Math.PI/12)*rz]);
 furnitureColliders.push({points,minX:x-rx,maxX:x+rx,minZ:z-rz,maxZ:z+rz});
}
furnitureColliders.push(rect(1.89,2.35,3.21,3.41),rect(7.50,7.70,6.68,7.14));
export function intersects(c,x,z,r){
 if(x+r<c.minX||x-r>c.maxX||z+r<c.minZ||z-r>c.maxZ)return false;
 if(c.r!==undefined)return (x-c.x)**2+(z-c.z)**2<(r+c.r)**2;
 if(c.points){
  let inside=true;
  for(let i=0;i<c.points.length;i++){
   const [ax,az]=c.points[i],[bx,bz]=c.points[(i+1)%c.points.length],dx=bx-ax,dz=bz-az;
   if(dx*(z-az)-dz*(x-ax)<0)inside=false;
   const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
   if((x-ax-t*dx)**2+(z-az-t*dz)**2<r*r)return true;
  }
  return inside;
 }
 if(x>=c.minX&&x<=c.maxX&&z>=c.minZ&&z<=c.maxZ)return true;
 const dx=x-Math.max(c.minX,Math.min(c.maxX,x)),dz=z-Math.max(c.minZ,Math.min(c.maxZ,z));
 return dx*dx+dz*dz<r*r;
}
// Spatial buckets avoid scanning every furnishing for each physics substep.
const buckets=new Map();
for(const c of furnitureColliders)for(let x=Math.floor(c.minX);x<=Math.floor(c.maxX);x++)for(let z=Math.floor(c.minZ);z<=Math.floor(c.maxZ);z++){
 const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(c);
}
export function canWalk(x,z,r=.18){
 if(!canStand(x,z,r))return false;
 for(let gx=Math.floor(x-r);gx<=Math.floor(x+r);gx++)for(let gz=Math.floor(z-r);gz<=Math.floor(z+r);gz++){
  for(const c of buckets.get(gx+','+gz)??[])if(intersects(c,x,z,r))return false;
 }
 return true;
}

// Room labels are architectural reference points, not guaranteed furniture-free spawns.
export function safeRoomPosition(room){
 const [x,z]=point(room.at);
 if(canWalk(x,z,.20))return [x,z];
 for(let radius=.05;radius<=2;radius+=.05)for(let i=0;i<32;i++){
  const px=x+Math.cos(i*Math.PI/16)*radius,pz=z+Math.sin(i*Math.PI/16)*radius;
  if(insidePolygon(px,pz,room.polygon)&&canWalk(px,pz,.20))return [px,pz];
 }
 throw new Error(`No safe entry position for ${room.id}`);
}
