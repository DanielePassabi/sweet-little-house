import { Matrix4, Float32BufferAttribute } from './vendor/three.module.js';

// Wall surfaces contain only positions and normals. Share exact duplicate pairs;
// different face normals stay separate, preserving every hard edge and triangle.
export function indexStaticSurface(geometry){
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 const vertices=[],normals=[],indices=[],lookup=new Map();
 for(let i=0;i<position.count;i++){
  const p=[position.getX(i),position.getY(i),position.getZ(i)],n=[normal.getX(i),normal.getY(i),normal.getZ(i)];
  const key=p.join(',')+'|'+n.join(',');
  let index=lookup.get(key);
  if(index===undefined){index=vertices.length/3;lookup.set(key,index);vertices.push(...p);normals.push(...n);}
  indices.push(index);
 }
 geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
 geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setIndex(indices);
 return {before:position.count,after:vertices.length/3};
}

// Compare full matrices: zoom, FOV, translation and rotation all invalidate a frame.
export function createRenderState(){
 const world=new Matrix4(),projection=new Matrix4();
 let previousCamera=null,dirty=true;
 const sameWorld=matrix=>world.elements.every((value,i)=>Math.abs(value-matrix.elements[i])<1e-12);
 return {
  invalidate(){dirty=true;},
  consume(camera){
   camera.updateMatrixWorld();
   // Orbit damping leaves floating-point noise long after visible motion stops.
   if(!dirty&&camera===previousCamera&&sameWorld(camera.matrixWorld)&&projection.equals(camera.projectionMatrix))return false;
   dirty=false;previousCamera=camera;world.copy(camera.matrixWorld);projection.copy(camera.projectionMatrix);return true;
  }
 };
}

export function freezeStaticTransforms(root){
 let count=0;
 root.updateMatrixWorld(true);
 root.traverse(object=>{object.matrixAutoUpdate=false;count++;});
 return count;
}
