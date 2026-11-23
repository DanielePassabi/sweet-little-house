import * as THREE from './vendor/three.module.js';

// panel() places parts relative to the cabinet front, including the interior
// fittings. Only the pieces registered with the hinge move when it opens.
export function addRefrigerator(m,panel,door,motion,{liner,glass,front,graphite}){
 const {x,z,w,d,h}=m;
 door('integrated-freezer-door',.103,.807);
 const leaf=door('integrated-fridge-door',.814,h-.007);
 const moving=[leaf,panel('fridge-door-liner',d-.09,h-.88,.014,liner,0,(.84+h-.04)/2,.028)];
 for(const y of [.94,1.39,1.79]){
  moving.push(panel('fridge-door-bin',d-.15,.016,.083,liner,0,y,.072));
  moving.push(panel('fridge-bin-lip',d-.15,.066,.008,glass,0,y+.026,.109));
 }
 panel('fridge-shadow-gap',d-.02,.02,.024,graphite,0,.808,.023);
 panel('fridge-cap',d,.012,w,front,0,h-.006,w/2);
 panel('fridge-liner-back',d-.04,h-.84,.016,liner,0,(h+.82)/2,w-.033);
 for(const side of [-1,1])panel('fridge-liner-side',.016,h-.83,w-.058,liner,side*(d/2-.027),(h+.81)/2,w/2);
 for(const y of [.825,h-.023])panel('fridge-liner-end',d-.043,.027,w-.05,liner,0,y,w/2);
 for(const y of [1.06,1.33,1.59,1.85]){
  panel('fridge-shelf',d-.073,.009,w-.18,glass,0,y,w/2+.047);
  panel('fridge-shelf-trim',d-.073,.015,.011,liner,0,y,.138);
 }
 motion.add('fridge',new THREE.Vector3(x-w/2,.814,z-d/2+.006),'y',-Math.PI/2,moving);
}

export function addDishwasher(m,panel,door,motion,{steel,graphite}){
 const {x,z,w,d}=m;
 const leaf=door('dishwasher-front',.102,.865);
 const moving=[leaf,panel('dishwasher-inner-door',d-.069,.698,.014,steel,0,.491,.03),
  panel('detergent-dispenser',.13,.077,.019,graphite,-.11,.68,.046)];
 panel('dishwasher-top-gasket',d-.012,.036,.018,graphite,0,.882,.027);
 panel('dishwasher-liner-back',d-.04,.74,.015,steel,0,.494,w-.032);
 for(const side of [-1,1])panel('dishwasher-liner-side',.013,.74,w-.06,steel,side*(d/2-.027),.494,w/2);
 for(const y of [.128,.868])panel('dishwasher-liner-end',d-.04,.016,w-.06,steel,0,y,w/2);
 for(const y of [.247,.557]){
  for(const inset of [.097,.32,.51])panel('basket-crossbar',d-.085,.009,.009,steel,0,y,inset);
  for(const offset of [-.22,-.15,-.075,0,.075,.15,.22]){
   panel('basket-wire',.008,.008,.425,steel,offset,y+.007,.305);
   for(const inset of [.097,.51])panel('basket-upright',.008,.098,.008,steel,offset,y+.05,inset);
  }
  for(const inset of [.097,.51])panel('basket-rim',d-.085,.009,.009,steel,0,y+.098,inset);
  for(const side of [-1,1])panel('basket-side-rail',.009,.009,.42,steel,side*(d-.085)/2,y+.098,.305);
 }
 motion.add('dishwasher',new THREE.Vector3(x-w/2,.12,z),'z',Math.PI/2,moving);
}

export function addOven(m,panel,door,motion,{front,enamel,glass,ovenWindow,trim,steel},group){
 const {x,z,w,d,h}=m;
 door('oven-base-drawer',.103,.485);door('oven-upper-drawer',.49,h-.608);
 const y=h-.36;
 panel('oven-cavity-back',w-.066,.438,.018,enamel,0,y,d-.065);
 for(const side of [-1,1]){
  panel('oven-cavity-side',.019,.46,d-.065,enamel,side*(w/2-.033),y,d/2-.015);
  panel('oven-frame',.024,.59,.027,enamel,side*(w/2-.019),h-.303,.009);
 }
 for(const shelf of [h-.58,h-.13])panel('oven-cavity-end',w-.06,.018,d-.065,enamel,0,shelf,d/2-.015);
 for(const offset of [-.2,-.12,-.04,.04,.12,.2])panel('oven-rack-wire',.007,.007,.398,steel,offset,y+.033,.26);
 for(const inset of [.065,.455])panel('oven-rack-rail',w-.094,.008,.008,steel,0,y+.031,inset);
 panel('oven-tray',w-.084,.017,.41,trim,0,y-.092,.266);
 panel('oven-control-housing',w-.04,.133,d-.041,enamel,0,h-.074,d/2-.012);
 panel('oven-control-fascia',w-.05,.099,.025,enamel,0,h-.055,-.003);
 panel('oven-display',.12,.029,.008,glass,0,h-.054,-.019);
 const moving=[panel('oven-door-glass',w-.06,.466,.010,ovenWindow,0,h-.363,-.005)];
 for(const side of [-1,1]){
  moving.push(panel('oven-door-edge',.045,.466,.014,glass,side*(w/2-.05),h-.363,-.009));
  moving.push(panel('oven-handle-mount',.024,.026,.028,trim,side*.215,h-.139,-.016));
  const knob=new THREE.Mesh(new THREE.CylinderGeometry(.018,.019,.016,24),trim);
  knob.rotation.x=Math.PI/2;knob.position.set(x+side*.201,h-.054,z-d/2-.025);group.add(knob);
 }
 for(const band of [h-.55,h-.177])moving.push(panel('oven-door-band',w-.06,.092,.014,glass,0,band,-.010));
 moving.push(panel('oven-handle',.474,.024,.017,trim,0,h-.138,-.033));
 panel('tower-cap',w,.012,d,front,0,h-.006,d/2);
 motion.add('oven',new THREE.Vector3(x,.912,z-d/2),'x',-85*Math.PI/180,moving);
}
