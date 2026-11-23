// Fitted to the existing washing wall and kitchen window. Lengths are in metres.
import {kitchenType1} from './kitchen-layout.js?v=20261012-1';

function footprint(id,left,right,start,end){
 return {id,x:(left+right)/2,z:(start+end)/2,w:right-left,d:end-start};
}
function bounds({x,z,w,d}){
 return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};
}
const peninsula=footprint('peninsula',6.84,7.65,12.97,14.919);
const modules=[
 {...footprint('integrated-fridge',8.935,9.535,12.377,12.975),h:2.20},
 footprint('sink',8.935,9.535,12.975,13.755),
 footprint('dishwasher',8.935,9.535,13.755,14.355),
 footprint('right-corner',8.935,9.535,14.355,14.919),
 footprint('window-return',7.65,8.935,14.519,14.919),
 peninsula,footprint('shelf-base',6.56,6.84,14.319,14.919),
 {...footprint('oven-tower',5.96,6.56,14.319,14.919),h:1.49},
];
const worktop={...kitchenType1.worktop,outline:[
 [6.84,12.97],[7.65,12.97],[7.65,14.519],[8.935,14.519],
 [8.935,12.975],[9.535,12.975],[9.535,14.919],[6.56,14.919],
 [6.56,14.319],[6.84,14.319],
]};
const breakfast={...footprint('oak-bar',6.56,7.01,12.90,14.919),bottom:worktop.y,h:.045};
// One seat at the short end, the other two facing the cooktop.
const stools=[
 {x:6.72,z:12.69,angle:.15},
 {x:6.56,z:13.39,angle:Math.PI/2},
 {x:6.58,z:14.005,angle:Math.PI/2},
];
const wallCabinets=[
 {...footprint('washing-upper',9.19,9.535,12.975,14.919),bottom:1.55,h:.65},
 {...footprint('window-upper',7.16,7.925,14.569,14.919),bottom:1.82,h:.38},
 {...footprint('oak-shelving',5.96,7.16,14.625,14.919),bottom:breakfast.bottom+breakfast.h,h:2.20-breakfast.bottom-breakfast.h},
];
export const bergaminLayout={
 id:'4',name:'Tipo 4 · Bergamin',description:'Cucina definitiva Bergamin con frontali tortora, penisola a induzione, bancone in rovere per tre e forno a mezza colonna.',
 modules,peninsula,worktop,breakfast,stools,wallCabinets,
 sink:{...kitchenType1.sink,z:13.33,d:.57,mixer:'square'},hob:{x:7.33,z:13.73,w:.52,d:.74},
 pendant:{x:7.28,z:13.73,bottom:1.67},
 wallVolumes:wallCabinets.map(({x,z,w,d,bottom,h})=>({min:[x-w/2,bottom,z-d/2],max:[x+w/2,bottom+h,z+d/2]})),
 colliders:[...modules.map(m=>{
  const b=bounds(m);
  if(m.id==='oven-tower')b.minZ-=.042; // Handle projects into the room.
  return b;
 }),bounds(breakfast),...stools.map(({x,z,angle})=>{
  const extentX=.225*Math.abs(Math.cos(angle))+.245*Math.abs(Math.sin(angle));
  const extentZ=.225*Math.abs(Math.sin(angle))+.245*Math.abs(Math.cos(angle));
  return {minX:x-extentX,maxX:x+extentX,minZ:z-extentZ,maxZ:z+extentZ};
 })],
};
