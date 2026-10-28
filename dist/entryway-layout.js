// Estimated from the reference photo; positioned on the short entry wall,
// next to the front door, facing the clear passage towards the living room.
import {walls,point,SCALE} from './model.js';
export const shoeCabinet={x:8.53,z:11.09,width:1.05,depth:.25,bottom:.18,top:1.18,tilt:35*Math.PI/180,drawerTravel:.19,flapPivotZ:.105,flapHeight:.70,flapFrontZ:.020};
const entryWall=walls.find(w=>w.open?.some(o=>o.kind==='entry')),opening=entryWall.open.find(o=>o.kind==='entry');
const [doorX,wallZ]=point(entryWall.a);
// The long axis follows the path through the door, centred between its jambs.
export const entryRug={x:doorX-entryWall.t/2-.10-1.46/2,z:wallZ+(opening.s+opening.e)/2/SCALE,width:1.46,depth:.70};
export const shoeCabinetCollider={minX:shoeCabinet.x-shoeCabinet.width/2,maxX:shoeCabinet.x+shoeCabinet.width/2,minZ:shoeCabinet.z-shoeCabinet.depth/2,maxZ:shoeCabinet.z+shoeCabinet.depth/2};
export function shoeCabinetFront(drawerFraction,flapFraction){
 const angle=shoeCabinet.tilt*flapFraction;
 return shoeCabinet.z+Math.max(shoeCabinet.depth/2+shoeCabinet.drawerTravel*drawerFraction,shoeCabinet.flapPivotZ+shoeCabinet.flapHeight*Math.sin(angle)+shoeCabinet.flapFrontZ*Math.cos(angle));
}
// The robot plans around the full opening envelope so a click cannot strand it.
export const shoeCabinetOpenCollider={...shoeCabinetCollider,maxZ:shoeCabinetFront(1,1)};
