// Metres. Keep the two existing 102 x 64 cm desks, now joined at the room centre.
// Workstation-local +X is the seated user's right and +Z points toward the chair.
export const room3Desk={x:1.48,z:7.88,width:2.04,depth:.64,top:.7825,thickness:.065,turn:Math.PI};
export const room3Monitor={diagonal:27*.0254,aspect:16/9,x:.32,y:1.27,z:-.14};
room3Monitor.height=room3Monitor.diagonal/Math.hypot(room3Monitor.aspect,1);
room3Monitor.width=room3Monitor.height*room3Monitor.aspect;
export const room3Laptop={x:-.39,y:1.07,z:-.015,width:.38,depth:.26,tilt:.28};
export const room3Chair={x:0,z:.73,width:.74,depth:.82};
// Low upholstery follows the top-left corner of the plan, below the window sill.
export const room3Sofa={minX:.05,minZ:5.24,width:1.60,length:1.50,depth:.65,height:.93,seatHeight:.46};
const rect=(minX,maxX,minZ,maxZ)=>({minX,maxX,minZ,maxZ});
export const room3Colliders=[
 rect(room3Desk.x-room3Desk.width/2,room3Desk.x+room3Desk.width/2,room3Desk.z-room3Desk.depth/2,room3Desk.z+room3Desk.depth/2),
 rect(room3Desk.x-room3Chair.width/2,room3Desk.x+room3Chair.width/2,room3Desk.z-room3Chair.z-room3Chair.depth/2,room3Desk.z-room3Chair.z+room3Chair.depth/2),
 rect(room3Sofa.minX,room3Sofa.minX+room3Sofa.width,room3Sofa.minZ,room3Sofa.minZ+room3Sofa.depth),
 rect(room3Sofa.minX,room3Sofa.minX+room3Sofa.depth,room3Sofa.minZ+room3Sofa.depth,room3Sofa.minZ+room3Sofa.length),
];
