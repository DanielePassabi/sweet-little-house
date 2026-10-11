// Metres, traced from the designer's coloured plan (11 October 2026).
// +X is right and +Z is down on the plan. Architecture is unchanged.
export const kitchenModules=[
 {id:'oven',x:9.235,z:12.675,w:.60,d:.60,face:'west',tall:true,h:2.20},
 {id:'sink',x:9.235,z:13.275,w:.60,d:.60,face:'west'},
 {id:'dishwasher',x:9.235,z:13.875,w:.60,d:.60,face:'west'},
 // One blind corner closes the 14.4 cm remainder without a miniature drawer unit.
 {id:'right-corner',x:9.235,z:14.547,w:.60,d:.744,face:'north',blindCorner:true},
 // Only low bases below the right window (x 7.977 to 8.791 m).
 {id:'window-return',x:8.1575,z:14.619,w:1.555,d:.60,face:'north'},
 {id:'left-corner',x:6.99,z:14.619,w:.78,d:.60,face:'north'},
 {id:'hob',x:6.99,z:13.9345,w:.78,d:.769,face:'east'},
 {id:'fridge',x:6.235,z:14.544,w:.62,d:.75,face:'north',tall:true,h:1.62},
];
export const peninsula={x:6.99,z:13.7195,w:.78,d:1.199};
export const kitchenWorktop={y:.935,thickness:.035,
 // One U-shaped slab, including the cantilever over the table connection.
 outline:[[6.60,13.12],[7.38,13.12],[7.38,14.319],[8.935,14.319],
  [8.935,12.975],[9.535,12.975],[9.535,14.919],[6.60,14.919]],
};
export const kitchenSink={x:9.235,z:13.275,w:.42,d:.44,depth:.18};
export const kitchenHob={x:6.99,z:13.9345,w:.52,d:.72};
// An 80 cm oak breakfast disc rests on top of the end of the ceramic peninsula.
// It is distinct from the freestanding 120 cm dining table restored below.
export const breakfastTop={x:6.78,z:13.13,r:.40,bottom:kitchenWorktop.y+.001,h:.04};
export const diningLayout={x:4.35,z:13.10,r:.60,y:.76};
export const diningChairs=Array.from({length:4},(_,i)=>{
 const theta=Math.PI/4+i*Math.PI/2;
 return {x:diningLayout.x+Math.cos(theta)*.66,z:diningLayout.z+Math.sin(theta)*.66,angle:-Math.PI/2-theta};
});
// Two horizontal fronts above the washing run, one above the fridge-side wall.
// The gap between these runs preserves the full height and width of the window.
export const kitchenWallCabinets=[
 {id:'washing-upper',x:9.365,z:13.947,w:.34,d:1.944,bottom:1.50,h:.70,face:'west',rows:2},
 {id:'fridge-upper',x:6.82,z:14.749,w:1.84,d:.34,bottom:1.82,h:.38,face:'north',rows:1},
];
export const kitchenWallVolumes=kitchenWallCabinets.map(({x,z,w,d,bottom,h})=>({min:[x-w/2,bottom,z-d/2],max:[x+w/2,bottom+h,z+d/2]}));
export const kitchenColliders=[
 ...[...kitchenModules,peninsula].map(({id,x,z,w,d})=>({minX:x-w/2-(id==='oven'?.058:0),maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2})),
 {...breakfastTop,minX:breakfastTop.x-breakfastTop.r,maxX:breakfastTop.x+breakfastTop.r,minZ:breakfastTop.z-breakfastTop.r,maxZ:breakfastTop.z+breakfastTop.r},
];
export const diningColliders=[diningLayout,...diningChairs.map(({x,z})=>({x,z,r:.29}))].map(c=>({...c,minX:c.x-c.r,maxX:c.x+c.r,minZ:c.z-c.r,maxZ:c.z+c.r}));
