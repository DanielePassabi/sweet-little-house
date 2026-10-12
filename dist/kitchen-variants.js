import {kitchenType1} from './kitchen-layout.js?v=20261012-1';

// The sketch is rotated relative to the house plan: its top is the washing run,
// its right side is the window wall. All dimensions below are metres.
const modules=[
 {id:'integrated-fridge',x:9.235,z:12.675,w:.60,d:.60,face:'west',tall:true,h:2.20},
 ...kitchenType1.modules.filter(m=>['sink','dishwasher','right-corner'].includes(m.id)),
 {id:'oven-side',x:8.81,z:14.619,w:.25,d:.60,face:'north',plain:true},
 {id:'under-window-oven',x:8.385,z:14.619,w:.60,d:.60,face:'north'},
 {id:'wall-hob',x:7.41,z:14.619,w:1.35,d:.60,face:'north'},
 {id:'peninsula-corner',x:6.335,z:14.619,w:.80,d:.60,face:'north'},
 {id:'breakfast-base',x:6.335,z:14.019,w:.80,d:.60,face:'east'},
];
const peninsula={x:6.335,z:14.019,w:.80,d:.60};
const worktop={...kitchenType1.worktop,outline:[
 [5.935,13.719],[6.735,13.719],[6.735,14.319],[8.935,14.319],
 [8.935,12.975],[9.535,12.975],[9.535,14.919],[5.935,14.919],
]};
const breakfast={shape:'rounded-square',x:6.335,z:13.99,w:.90,d:.90,cornerRadius:.10,bottom:worktop.y+.001,h:.04};
// A convex rounded perimeter shares the visible overhang with walking collisions.
export function roundedTopPoints({x,z,w,d,cornerRadius:r}){
 const points=[];
 for(const [cx,cz,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]]){
  for(let i=0;i<=8;i++){const a=start+i*Math.PI/16;points.push([x+cx+r*Math.cos(a),z+cz+r*Math.sin(a)]);}
 }
 return points;
}
const wallCabinets=kitchenType1.wallCabinets;
export const kitchenType2={id:'2',name:'Tipo 2',description:'Frigo integrato, forno sotto la finestra e cottura a parete.',
 modules,peninsula,worktop,sink:kitchenType1.sink,
 hob:{x:7.385,z:14.619,w:.72,d:.52,turned:true},breakfast,wallCabinets,
 wallVolumes:kitchenType1.wallVolumes,
 backsplash:{x:7.335,z:14.915,w:1.10,bottom:worktop.y,h:.60},
 colliders:[...modules.map(({x,z,w,d,id})=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2-(id==='under-window-oven'?.045:0),maxZ:z+d/2})),
  {points:roundedTopPoints(breakfast),minX:breakfast.x-breakfast.w/2,maxX:breakfast.x+breakfast.w/2,minZ:breakfast.z-breakfast.d/2,maxZ:breakfast.z+breakfast.d/2}],
};
export const kitchenVariants=[kitchenType1,kitchenType2];
export function getKitchenVariant(id){
 const variant=kitchenVariants.find(k=>k.id===String(id));
 if(!variant)throw new RangeError(`Unknown kitchen type: ${id}`);
 return variant;
}
