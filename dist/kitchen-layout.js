// Metres, traced from the designer's coloured plan (11 October 2026).
// +X is right and +Z is down on the plan. Architecture is unchanged.
export const kitchenModules=[
 {id:'oven',x:9.235,z:12.675,w:.60,d:.60,face:'west',tall:true,h:2.20},
 {id:'sink',x:9.235,z:13.275,w:.60,d:.60,face:'west'},
 {id:'dishwasher',x:9.235,z:13.875,w:.60,d:.60,face:'west'},
 {id:'right-filler',x:9.235,z:14.247,w:.60,d:.144,face:'west'},
 {id:'right-corner',x:9.235,z:14.619,w:.60,d:.60,face:'north'},
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
// Lower 120 cm wooden circle tucks under the ceramic end. Cabinets start at
// z=13.55, beyond the table rim, leaving the connection free of solid cabinetry.
export const diningLayout={x:6.43,z:12.94,r:.60,y:.76};
export const diningChairs=[-Math.PI/3,-Math.PI*7/9,Math.PI*7/9].map(theta=>({
 x:diningLayout.x+Math.cos(theta)*.73,z:diningLayout.z+Math.sin(theta)*.73,
 angle:-Math.PI/2-theta,
}));
export const kitchenColliders=[...kitchenModules,peninsula].map(({id,x,z,w,d})=>({minX:x-w/2-(id==='oven'?.058:0),maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}));
export const diningColliders=[diningLayout,...diningChairs.map(({x,z})=>({x,z,r:.29}))].map(c=>({...c,minX:c.x-c.r,maxX:c.x+c.r,minZ:c.z-c.r,maxZ:c.z+c.r}));
