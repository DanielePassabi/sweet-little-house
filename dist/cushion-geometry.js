import * as THREE from './vendor/three.module.js';

// A superellipsoid keeps a cushion full across its face and soft around its edges.
// UV distances are in metres so the weave keeps its scale across different panels.
export function cushionGeometry(width,height,depth,power,segments,deform){
 const geometry=new THREE.BoxGeometry(2,2,2,...segments);
 const {position,normal,uv}=geometry.attributes;
 const t=new THREE.Vector3(),point=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3();
 const sizes=[width,height,depth],colors=[];
 function sample(x,y,z,out){
  const length=(Math.abs(x)**power+Math.abs(y)**power+Math.abs(z)**power)**(1/power);
  out.set(x*width/(2*length),y*height/(2*length),z*depth/(2*length));
  return deform?.(out)??1;
 }
 const step=.001;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const shade=sample(x,y,z,point);
  colors.push(shade,shade,shade);
  t.fromBufferAttribute(normal,i);
  const axis=t.x?0:t.y?1:2,sign=t.getComponent(axis);
  const u=(axis+1)%3,v=(axis+2)%3;
  // Differentiate the actual padded surface, including at the six UV boundaries.
  function tangent(direction,out){
   t.set(0,0,0).setComponent(direction,step);
   sample(x+t.x,y+t.y,z+t.z,out);
   sample(x-t.x,y-t.y,z-t.z,delta);
   return out.sub(delta);
  }
  tangent(u,a);tangent(v,b);a.cross(b).normalize().multiplyScalar(sign);
  normal.setXYZ(i,a.x,a.y,a.z);position.setXYZ(i,point.x,point.y,point.z);
  uv.setXY(i,uv.getX(i)*sizes[axis===0?2:0],uv.getY(i)*sizes[axis===1?2:1]);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}
