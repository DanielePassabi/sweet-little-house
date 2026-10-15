import {kitchenType1,diningLayout,diningChairs,diningColliders} from './kitchen-layout.js?v=20261012-1';

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
// Type 3: 60 cm washing run, 40 cm window return and a 180 x 120 cm peninsula.
// Unspecified lengths are a proposal fitted to the unchanged architectural plan.
const sinkExtension=.20;
const thirdModules=[
 modules[0],...kitchenType1.modules.filter(m=>['sink','dishwasher','right-corner'].includes(m.id)).map(m=>{
  // Keep the fridge-side edge fixed; use the shallower return's extra 20 cm.
  if(m.id==='sink')return {...m,z:m.z+sinkExtension/2,d:m.d+sinkExtension};
  if(m.id==='dishwasher')return {...m,z:m.z+sinkExtension};
  return {...m,z:m.z+sinkExtension/2,d:m.d-sinkExtension,returnPanel:{z:14.719,d:.40}};
 }),
 {id:'shallow-workbench',x:8.3925,z:14.719,w:1.085,d:.40,face:'north'},
 ...[13.419,14.019,14.619].flatMap((z,i)=>[
  {id:i===1?'peninsula-oven':'peninsula-inner-'+i,x:7.55,z,w:.60,d:.60,face:'east'},
  {id:'peninsula-storage-'+i,x:6.95,z,w:.60,d:.60,face:'west',plain:true},
 ]),
];
const thirdWorktop={...kitchenType1.worktop,outline:[
 [6.65,13.119],[7.85,13.119],[7.85,14.519],[8.935,14.519],
 [8.935,12.975],[9.535,12.975],[9.535,14.919],[6.65,14.919],
]};
const thirdBreakfast={shape:'rounded-square',x:6.60,z:13.97,w:.50,d:1.50,cornerRadius:.045,bottom:thirdWorktop.y+.001,h:.04};
const thirdStools=[13.59,14.31].map(z=>({x:6.28,z,angle:Math.PI/2}));
const thirdDining={x:4.40,z:13.0,r:.75,y:.76};
const thirdChairs=Array.from({length:6},(_,i)=>{
 const theta=Math.PI/6+i*Math.PI/3;
 return {x:thirdDining.x+Math.cos(theta)*.81,z:thirdDining.z+Math.sin(theta)*.81,angle:-Math.PI/2-theta};
});
const circleCollider=({x,z,r})=>({x,z,r,minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r});
const thirdUppers=kitchenType2.wallCabinets;
export const kitchenType3={id:'3',name:'Tipo 3',description:'Frigo integrato, raccordo da 40 cm, penisola 180 × 120 cm con induzione e breakfast per due. Tavolo Ø 150 cm, sei posti.',
 modules:thirdModules,peninsula:{x:7.25,z:14.019,w:1.20,d:1.80},worktop:thirdWorktop,
 sink:{...kitchenType1.sink,z:kitchenType1.sink.z+sinkExtension/2,d:kitchenType1.sink.d+sinkExtension},
 hob:{x:7.40,z:14.019,w:.52,d:.72},breakfast:thirdBreakfast,stools:thirdStools,
 wallCabinets:thirdUppers,wallVolumes:thirdUppers.map(({x,z,w,d,bottom,h})=>({min:[x-w/2,bottom,z-d/2],max:[x+w/2,bottom+h,z+d/2]})),
 dining:{table:thirdDining,chairs:thirdChairs,colliders:[thirdDining,...thirdChairs.map(c=>({...c,r:.29}))].map(circleCollider)},
 colliders:[...thirdModules.map(({x,z,w,d,id})=>({minX:x-w/2,maxX:x+w/2+(id==='peninsula-oven'?.045:0),minZ:z-d/2,maxZ:z+d/2})),
  {points:roundedTopPoints(thirdBreakfast),minX:6.35,maxX:6.85,minZ:13.22,maxZ:14.72},
  ...thirdStools.map(c=>circleCollider({...c,r:.25}))],
};
export function getDiningConfiguration(variant){return variant.dining??{table:diningLayout,chairs:diningChairs,colliders:diningColliders};}
export const kitchenVariants=[kitchenType1,kitchenType2,kitchenType3];
export function getKitchenVariant(id){
 const variant=kitchenVariants.find(k=>k.id===String(id));
 if(!variant)throw new RangeError(`Unknown kitchen type: ${id}`);
 return variant;
}
