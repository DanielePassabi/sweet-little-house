// Purchased sofa: confirmed 270 cm width and 180 cm chaise depth.
// Main depth, height and cushion proportions are estimated from the reference photo.
export const sofaLayout={width:2.70,depth:1.20,chaiseDepth:1.80,chaiseWidth:1.00,
 backX:7.49,minZ:8.10,height:1.02,seatHeight:.515};
// Faces the TV (-X). The photo's right-hand chaise is the +Z end in the plan.
export const sofaColliders=[
 {minX:sofaLayout.backX-sofaLayout.depth,maxX:sofaLayout.backX,minZ:sofaLayout.minZ,maxZ:sofaLayout.minZ+sofaLayout.width},
 {minX:sofaLayout.backX-sofaLayout.chaiseDepth,maxX:sofaLayout.backX,minZ:sofaLayout.minZ+sofaLayout.width-sofaLayout.chaiseWidth,maxZ:sofaLayout.minZ+sofaLayout.width},
];
// Shift the existing coffee table slightly toward the TV to clear the longer chaise.
export const sofaCoffeeTable={x:5.40,z:9.45,r:.30};
// Positions are local: X spans the sofa width, Z runs from the back toward the TV.
export const sofaPumpkins=[
 {name:'white-pumpkin',material:'whitePumpkin',x:-.70,z:.78,r:.155,h:.225,turn:.12},
 {name:'tan-pumpkin',material:'tanPumpkin',x:.76,z:1.16,r:.17,h:.245,turn:-.20},
];
