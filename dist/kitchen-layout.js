// Metres, aligned to the unchanged architectural inner wall faces.
export const kitchenModules=[
 {id:'hob',x:8.10,z:12.675,w:.90,d:.60,face:'south'},
 {id:'prep',x:8.7425,z:12.675,w:.385,d:.60,face:'south'},
 {id:'corner',x:9.235,z:12.675,w:.60,d:.60,face:'south'},
 {id:'sink',x:9.235,z:13.275,w:.60,d:.60,face:'west'},
 {id:'dishwasher',x:9.235,z:13.875,w:.60,d:.60,face:'west'},
 {id:'end',x:9.235,z:14.322,w:.60,d:.294,face:'west'},
 {id:'window-return',x:8.6575,z:14.694,w:1.755,d:.45,face:'north'},
 {id:'fridge',x:7.48,z:14.619,w:.60,d:.60,face:'north',tall:true},
 {id:'oven',x:6.88,z:14.619,w:.60,d:.60,face:'north',tall:true},
 {id:'storage',x:6.28,z:14.619,w:.60,d:.60,face:'north'},
];
export const diningLayout={x:6.15,z:13.00,r:.60};
export const diningChairs=Array.from({length:4},(_,i)=>{
 // Tucked in: seat fronts sit beneath the top, curved backs stay outside its rim.
 const theta=Math.PI/4+i*Math.PI/2;
 return {x:diningLayout.x+Math.cos(theta)*.66,z:diningLayout.z+Math.sin(theta)*.66,angle:-Math.PI/2-theta};
});
export const kitchenColliders=kitchenModules.map(({x,z,w,d})=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}));
export const diningColliders=[{...diningLayout},...diningChairs.map(({x,z})=>({x,z,r:.29}))].map(c=>({...c,minX:c.x-c.r,maxX:c.x+c.r,minZ:c.z-c.r,maxZ:c.z+c.r}));
