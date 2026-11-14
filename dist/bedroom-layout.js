import {point} from './model.js';

// Interior wall faces in plan coordinates. The return sits against Bath 2.
const left=point([409,125])[0]+.075, right=point([712,125])[0]-.15;
const top=point([409,125])[1]+.15, bottom=point([529,493])[1]-.05;
const back=right-.008, start=top+.012, end=bottom-.008;
const depth=.58, bridgeWidth=6*.45, corner=end-depth;
const rect=(minX,maxX,minZ,maxZ)=>({minX,maxX,minZ,maxZ});
export const bridge={...rect(back-depth,back,start,start+bridgeWidth),doors:6,base:1.65,height:.90};
export const wardrobe={
 side:rect(back-depth,back,bridge.maxZ,corner),
 corner:rect(back-depth,back,corner,end),
 return:rect(back-depth-1.10,back-depth,corner,end)
};
export const shoeUnit=rect(left+.008,left+.308,start,start+1.25);
export const bedside=rect(back-.48,back-.022,start+.105,start+.605);
export const bedLayout={
 headX:back-.024,centerZ:start+1.66,length:2.10,width:1.68,
 mattressLength:2,mattressWidth:1.60
};
export const bedFootprint=rect(bedLayout.headX-bedLayout.length,bedLayout.headX,
 bedLayout.centerZ-bedLayout.width/2,bedLayout.centerZ+bedLayout.width/2);
export const bedroomFloorColliders=[bedFootprint,shoeUnit,bedside,...Object.values(wardrobe)];

export const originalBedroom={wallX:left,nightstands:[1.96,4.14]};
export const bedroomColliders={
 '1':[rect(4.34,6.35,2.12,3.98),rect(7.02,7.62,1.02,5.04),
  ...originalBedroom.nightstands.map(z=>rect(4.535,4.985,z-.225,z+.225))],
 '2':[...bedroomFloorColliders,bridge]
};
