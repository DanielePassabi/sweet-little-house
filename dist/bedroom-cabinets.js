import {bridge,wardrobe,bedside,shoeUnit} from './bedroom-layout.js';

// The front of each unit faces into the room. Box dimensions below include
// the fronts, so the model and the footprints use the same outside edges.
export function createBedroomCabinets(box,{body,front,wood,pull}){
 const height=bridge.base+bridge.height,plinth=.065,face=.019,gap=.003;
 function panel(name,x1,x2,y1,y2,z1,z2,material){
  const mesh=box(x2-x1,y2-y1,z2-z1,material,(x1+x2)/2,(y1+y2)/2,(z1+z2)/2);
  mesh.name=name;
 }
 function rightRun(area,name,base,count){
  const {minX,maxX,minZ,maxZ}=area;
  panel(name,minX+face,maxX,base,height,minZ,maxZ,body);
  const span=(maxZ-minZ)/count;
  for(let i=0;i<count;i++){
   const start=minZ+span*i;
   panel(name+'-door',minX,minX+face,base,height,start+gap/2,start+span-gap/2,front);
   // Inset finger pulls keep the full depth within the run.
   const z=start+span*(i%2?.22:.78),y=base===plinth?1.03:base+.055;
   panel('recessed-pull',minX-.001,minX,y,y+.011,z-.064,z+.064,pull);
  }
 }
 rightRun(bridge,'bridge',bridge.base,bridge.doors);
 rightRun(wardrobe.side,'wardrobe',plinth,2);
 const c=wardrobe.corner,r=wardrobe.return;
 panel('blind-corner',c.minX,c.maxX,plinth,height,c.minZ,c.maxZ,body);
 panel('wardrobe-return',r.minX,r.maxX,plinth,height,r.minZ+face,r.maxZ,body);
 const leaf=(r.maxX-r.minX)/2;
 for(let i=0;i<2;i++){
  const x=r.minX+i*leaf;
  panel('return-door',x+gap/2,x+leaf-gap/2,plinth,height,r.minZ,r.minZ+face,front);
  const grip=x+leaf*(i?.22:.78);
  panel('recessed-pull',grip-.064,grip+.064,1.03,1.041,r.minZ-.001,r.minZ,pull);
 }
 panel('wardrobe-plinth',c.minX+.035,c.maxX,0,plinth,wardrobe.side.minZ+.025,c.maxZ,body);
 panel('return-plinth',r.minX+.025,c.minX+.035,0,plinth,r.minZ+.035,r.maxZ,body);

 const n=bedside;
 panel('bedside-plinth',n.minX+.035,n.maxX-.015,0,.055,n.minZ+.025,n.maxZ-.025,body);
 panel('bedside-drawer-case',n.minX+face,n.maxX,.055,.50,n.minZ,n.maxZ,body);
 for(const y of [.055,.278])panel('bedside-drawer',n.minX,n.minX+face,y,y+.219,n.minZ+.002,n.maxZ-.002,front);
 panel('bedside-oak-top',n.minX,n.maxX,.50,.522,n.minZ,n.maxZ,wood);

 const s=shoeUnit,mid=(s.minZ+s.maxZ)/2;
 panel('shoe-cabinet-plinth',s.minX,s.maxX-.025,0,plinth,s.minZ+.02,s.maxZ-.02,body);
 panel('shoe-cabinet-case',s.minX,s.maxX-face,plinth,1.06,s.minZ,s.maxZ,body);
 for(const [z1,z2] of [[s.minZ,mid],[mid,s.maxZ]]){
  for(const y of [plinth,.56]){
   panel('shoe-cabinet-tilt-front',s.maxX-face,s.maxX,y,y+.492,z1+.002,z2-.002,front);
   panel('shoe-cabinet-pull',s.maxX,s.maxX+.001,y+.437,y+.448,(z1+z2)/2-.064,(z1+z2)/2+.064,pull);
  }
 }
}
