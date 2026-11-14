// Both the fixed box and the moving upholstery are clickable. Furniture in
// front of the bed (including the bridge in plan view) still intercepts rays.
function visible(object){
 for(let ancestor=object;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return false;
 return true;
}
export function createBedLift(bed,applyPose){
 let progress=0,target=0;
 return {
  get open(){return progress===1;},
  get targetOpen(){return target===1;},
  toggle(){target=1-target;},
  update(dt){
   if(progress===target||!Number.isFinite(dt)||dt<=0)return false;
   const step=Math.min(dt,.1)/1.15;
   progress=target?Math.min(1,progress+step):Math.max(0,progress-step);
   applyPose(progress*progress*(3-2*progress));return true;
  },
  pick(raycaster,occluders=[]){
   if(!visible(bed))return null;
   const hit=raycaster.intersectObject(bed,true)[0];
   if(!hit)return null;
   const far=raycaster.far;
   try{
    raycaster.far=Math.min(far,hit.distance-.001);
    if(raycaster.intersectObjects(occluders.filter(visible),false).length)return null;
   }finally{raycaster.far=far;}
   return hit;
  }
 };
}
