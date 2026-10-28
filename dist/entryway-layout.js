// Estimated from the reference photo; positioned on the short entry wall,
// next to the front door, facing the clear passage towards the living room.
export const shoeCabinet={x:8.53,z:11.09,width:1.05,depth:.25,bottom:.18,top:1.18,tilt:Math.PI/10};
export const entryRug={x:8.53,z:11.80,width:1.46,depth:.70};
// Include the ajar drawer and flap, not only the closed carcass.
export const shoeCabinetCollider={minX:shoeCabinet.x-shoeCabinet.width/2,maxX:shoeCabinet.x+shoeCabinet.width/2,minZ:shoeCabinet.z-shoeCabinet.depth/2,maxZ:shoeCabinet.z+.36};
