// Coordinates traced from the supplied quoted plan. 86 drawing units = 1 metre.
// Origin is the inside upper-left corner; z follows the plan downward.
export const SCALE = 86;
export const point = ([x,z]) => [(x-42)/SCALE,(z-54)/SCALE];
export const HEIGHT = 2.6;
export const rooms = [
  {id:'living',name:'Zona giorno',detail:'Soggiorno e cucina',at:[530,1120],polygon:[[306,742],[697,742],[697,982],[860,982],[860,1338],[306,1338]],label:[510,1180]},
  {id:'bedroom',name:'Camera matrimoniale',detail:'3,19 × 4,025 m da pianta',at:[560,320],polygon:[[424,142],[697,142],[697,487],[424,487]],label:[555,290]},
  {id:'room2',name:'Camera 2',detail:'Camera a due letti in planimetria',at:[185,190],polygon:[[42,54],[397,54],[397,142],[416,142],[416,374],[351,374],[351,314],[42,314]],label:[195,190]},
  {id:'room3',name:'Camera 3',detail:'2,97 × 3,055 m da pianta',at:[160,650],polygon:[[42,503],[297,503],[297,763],[42,763]],label:[160,680]},
  {id:'bath1',name:'Bagno 1',detail:'2,56 × 1,96 m da pianta',at:[160,420],polygon:[[42,327],[263,327],[263,494],[42,494]],label:[150,418]},
  {id:'bath2',name:'Bagno 2',detail:'1,91 × 2,83 m da pianta',at:[614,620],polygon:[[534,500],[697,500],[697,737],[534,737]],label:[617,655]},
  {id:'hall',name:'Disimpegno',detail:'Collegamento zona notte',at:[355,585],polygon:[[270,374],[397,374],[397,529],[526,529],[526,632],[526,737],[306,737],[306,494],[270,494]],label:[355,580]},
  {id:'utility',name:'Locale tecnico',detail:'Accesso dalla terrazza',at:[145,875],polygon:[[40,796],[263,796],[263,946],[40,946]],label:[151,870]},
  {id:'terrace',name:'Terrazza',detail:'Spazio esterno coperto',at:[160,1150],polygon:[[30,958],[277,958],[277,1338],[30,1338]],label:[145,1180]}
];
export const nightRoomIds = ['room2','room3','hall','bedroom','bath1','bath2'];
// One continuous finish beneath the night-area partitions and door openings.
// This also covers the small corridor infills that do not belong to a room polygon.
export const nightFloorPolygon = [[42,54],[397,54],[397,142],[424,142],[697,142],[697,742],[297,742],[297,763],[42,763]];
// Segment a/b, thickness in metres, openings in drawing units from endpoint a.
// Opening heights and widths lacking explicit quotes are provisional.
export const walls = [
  {a:[30,43],b:[409,43],t:.30,open:[{s:180,e:297,kind:'window',sill:1,h:1.35}]},
  {a:[409,43],b:[409,125],t:.30},
  {a:[409,125],b:[712,125],t:.30,open:[{s:99,e:211,kind:'window',sill:1,h:1.35}]},
  {a:[712,125],b:[712,982],t:.30},
  {a:[712,982],b:[875,982],t:.30},
  {a:[875,982],b:[875,1350],t:.30,open:[{s:28,e:113,kind:'entry',sill:0,h:2.15}]},
  {a:[290,1350],b:[875,1350],t:.30,open:[{s:132,e:242,kind:'window',sill:1,h:1.35},{s:438,e:508,kind:'window',sill:1,h:1.35}]},
  {a:[290,775],b:[290,1350],t:.34,open:[{s:266,e:469,kind:'glazed',sill:0,h:2.35}]},
  {a:[30,43],b:[30,958],t:.30,open:[{s:302,e:369,kind:'window',sill:1.15,h:1.15},{s:522,e:632,kind:'window',sill:1,h:1.35}]},
  {a:[30,775],b:[290,775],t:.34},
  {a:[30,320],b:[270,320],t:.15},
  {a:[270,320],b:[270,498],t:.10,open:[{s:55,e:135,kind:'door',sill:0,h:2.1}]},
  {a:[270,374],b:[409,374],t:.10,open:[{s:9,e:81,kind:'door',sill:0,h:2.1}]},
  {a:[409,125],b:[409,632],t:.15,open:[{s:404,e:480,kind:'door',sill:0,h:2.1}]},
  {a:[30,498],b:[300.32,498],t:.10},
  // Same room-facing plane as the thicker wall at x=290 below it.
  {a:[300.32,498],b:[300.32,775],t:.10,open:[{s:68,e:147,kind:'door',sill:0,h:2.1}]},
  {a:[529,493],b:[712,493],t:.10},
  {a:[529,493],b:[529,742],t:.10,open:[{s:56,e:129,kind:'door',sill:0,h:2.1}]},
  {a:[409,632],b:[529,632],t:.10},
  {a:[300.32,742],b:[712,742],t:.10,open:[{s:68.68,e:146.68,kind:'door',sill:0,h:2.1}]},
  {a:[697,1114],b:[875,1114],t:.10},
  // The technical room shares the existing x=290 wall; no doubled partition.
  {a:[30,958],b:[290,958],t:.15,open:[{s:90,e:165,kind:'door',sill:0,h:2.1}]},
];
export const railings=[{a:[20,958],b:[20,1350]},{a:[20,1350],b:[277,1350]}];
export const footprint = [[30,43],[409,43],[409,125],[712,125],[712,982],[875,982],[875,1350],[20,1350],[20,958],[30,958]];
export function polygonArea(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2/SCALE**2;}
export function insidePolygon(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=point(poly[i]),b=point(poly[j]);if(((a[1]>z)!=(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;}
export function collisionSegments(){
 const segments=[];
 for(const w of walls){
  const[a,z]=point(w.a),[b,q]=point(w.b),len=Math.hypot(b-a,q-z);
  const add=(s,e,r=w.t/2)=>{if(e-s>.001)segments.push({x1:a+(b-a)*s/len,z1:z+(q-z)*s/len,x2:a+(b-a)*e/len,z2:z+(q-z)*e/len,r});};
  let cursor=0;
  for(const o of w.open??[]){const s=o.s/SCALE,e=o.e/SCALE;add(cursor,s);if(o.kind==='window'||o.kind==='entry')add(s,e);if(o.kind==='glazed')add(s,(s+e)/2,.035);cursor=e;}
  add(cursor,len);
 }
 for(const w of railings){const[x1,z1]=point(w.a),[x2,z2]=point(w.b);segments.push({x1,z1,x2,z2,r:.07});}
 return segments;
}
export const collisionWalls=collisionSegments();
export function canStand(x,z,radius=.18){
 if(!insidePolygon(x,z,footprint))return false;
 for(const c of collisionWalls){const dx=c.x2-c.x1,dz=c.z2-c.z1,t=Math.max(0,Math.min(1,((x-c.x1)*dx+(z-c.z1)*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-c.x1-t*dx,z-c.z1-t*dz)<c.r+radius)return false;}
 return true;
}
