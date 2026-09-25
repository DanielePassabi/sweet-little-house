import {kitchenColliders,diningColliders} from './kitchen-layout.js?v=20260923-4';
import {canStand,point,insidePolygon} from './model.js';


const rect=(minX,maxX,minZ,maxZ)=>({minX,maxX,minZ,maxZ});
const circle=(x,z,r)=>({x,z,r,minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r});
// Retain full solid fixtures; split seats/tables and use round pot/stool footprints.
export const furnitureColliders=[
 {minX:3.02,maxX:3.52,minZ:8.84,maxZ:11.02},
 {minX:.86,maxX:1.62,minZ:8.56,maxZ:9.10},
 {minX:1.70,maxX:2.45,minZ:8.56,maxZ:9.26},
 {minX:-.08,maxX:2.60,minZ:14.05,maxZ:14.88},
 // Shower glass leaves slide toward the ends; the central entrance stays open.
 {minX:.754,maxX:.827,minZ:3.1704,maxZ:3.7604},
 {minX:.754,maxX:.827,minZ:4.5204,maxZ:5.1104},
 {minX:1.12,maxX:2.32,minZ:4.58,maxZ:5.08},
 {minX:6.11,maxX:7.21,minZ:5.175,maxZ:5.675},
 {minX:5.70,maxX:6.62,minZ:7.00,maxZ:7.91},
 {minX:4.34,maxX:6.35,minZ:2.12,maxZ:3.98},
 {minX:7.02,maxX:7.62,minZ:1.02,maxZ:5.04},
 {minX:point([529,632])[0]-.06-.55,maxX:point([529,632])[0]-.06,minZ:point([529,632])[1]+.06,maxZ:point([529,742])[1]-.06},
];
furnitureColliders.push(...kitchenColliders,...diningColliders);
furnitureColliders.push(rect(6.37,7.49,8.095,10.5),rect(5.635,7.06,8.105,8.855));
furnitureColliders.push(circle(5.72,9.55,.30));
furnitureColliders.push(circle(1.275,12.25,.425));
for(const z of [11.76,12.74])furnitureColliders.push(circle(1.275,z,.275));
for(const [x,z,r] of [[3.47,8.34,.24*.86],[.18,10.83,.24]])furnitureColliders.push(circle(x,z,r));
for(const x of [.60,2.36]){
 furnitureColliders.push(rect(x-.51,x+.51,7.56,8.20));
 furnitureColliders.push(rect(x-.32,x+.32,7.04,7.67));
}
const readingChairPoints=[[-.40,-.45],[.40,-.45],[.40,.39],[-.40,.39]].map(([x,z])=>[.64+Math.cos(Math.PI/3)*x+Math.sin(Math.PI/3)*z,5.83-Math.sin(Math.PI/3)*x+Math.cos(Math.PI/3)*z]);
furnitureColliders.push({points:readingChairPoints,minX:Math.min(...readingChairPoints.map(p=>p[0])),maxX:Math.max(...readingChairPoints.map(p=>p[0])),minZ:Math.min(...readingChairPoints.map(p=>p[1])),maxZ:Math.max(...readingChairPoints.map(p=>p[1]))});
for(const z of [1.96,4.14])furnitureColliders.push(rect(4.535,4.985,z-.225,z+.225));
furnitureColliders.push(rect(.11,.69,8.565,8.815));
// Elliptical sanitary rims, represented by a convex perimeter, including tanks.
for(const [x,z,rx,rz] of [[1.42,3.62,.19,.29],[2.12,3.62,.19,.29],[7.29,6.15,.29,.19],[7.29,6.91,.29,.19]]){
 const points=Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*rx,z+Math.sin(i*Math.PI/12)*rz]);
 furnitureColliders.push({points,minX:x-rx,maxX:x+rx,minZ:z-rz,maxZ:z+rz});
}
furnitureColliders.push(rect(1.9425,2.2975,3.295,3.485),rect(7.425,7.615,6.7325,7.0875));
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
