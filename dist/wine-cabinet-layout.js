// Photo-inspired corner unit; dimensions are illustrative, in metres.
// Local +Z is the glazed front, facing diagonally into the dining area.
export const wineCabinetLayout={x:3.25,z:14.72,rotation:Math.PI*3/4,width:.64,height:1.65,
 outline:[[-.31,.20],[.31,.20],[.31,.07],[0,-.24],[-.31,.07]]};
export function wineCabinetPoint(x,z){
 const f=wineCabinetLayout,c=Math.cos(f.rotation),s=Math.sin(f.rotation);
 return [f.x+c*x+s*z,f.z-s*x+c*z];
}
// The outline is clockwise in model coordinates; collision polygons are CCW.
const points=[[-.325,.25],[.325,.25],[.325,.065],[0,-.26],[-.325,.065]].map(([x,z])=>wineCabinetPoint(x,z)).reverse();
export const wineCabinetCollider={points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),
 minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))};
