// Metres, aligned to the unchanged architectural inner wall faces.
export const kitchenModules=[
 // Right run: the sink and dishwasher retain their previous coordinates.
 {id:'sink-prep',x:9.235,z:12.675,w:.60,d:.60,face:'west'},
 {id:'sink',x:9.235,z:13.275,w:.60,d:.60,face:'west'},
 {id:'dishwasher',x:9.235,z:13.875,w:.60,d:.60,face:'west'},
 {id:'right-filler',x:9.235,z:14.247,w:.60,d:.144,face:'west'},
 {id:'right-corner',x:9.235,z:14.619,w:.60,d:.60,face:'north'},
 // Only low bases below the right window (x 7.977 to 8.791 m).
 {id:'window-return',x:8.3775,z:14.619,w:1.115,d:.60,face:'north'},
 {id:'fridge',x:7.52,z:14.619,w:.60,d:.60,face:'north',tall:true},
 {id:'hob',x:6.77,z:14.619,w:.90,d:.60,face:'north'},
 {id:'left-corner',x:6.02,z:14.619,w:.60,d:.60,face:'north'},
 {id:'peninsula-base',x:6.02,z:14.019,w:.60,d:.60,face:'west'},
];
// The 60 cm peninsula ends beside, rather than in front of, the left window.
export const peninsula={x:6.02,z:13.119,w:.60,d:1.20};
export const peninsulaStools=[5.66,6.38].flatMap(x=>[12.84,13.40].map(z=>({x,z,r:.22})));
export const diningLayout={x:4.35,z:13.10,r:.60};
export const diningChairs=Array.from({length:4},(_,i)=>{
 // Tucked in: seat fronts sit beneath the top, curved backs stay outside its rim.
 const theta=Math.PI/4+i*Math.PI/2;
 return {x:diningLayout.x+Math.cos(theta)*.66,z:diningLayout.z+Math.sin(theta)*.66,angle:-Math.PI/2-theta};
});
export const kitchenColliders=[...kitchenModules,peninsula].map(({x,z,w,d})=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}));
export const diningColliders=[{...diningLayout},...diningChairs.map(({x,z})=>({x,z,r:.29})),...peninsulaStools].map(c=>({...c,minX:c.x-c.r,maxX:c.x+c.r,minZ:c.z-c.r,maxZ:c.z+c.r}));
