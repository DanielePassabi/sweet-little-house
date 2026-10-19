import {createSlidingDoors} from './sliding-doors.js';
import {createHingedDoors} from './hinged-doors.js';

// Share picking, walking and the robot integration across both kinds of door.
export function createDoors(parent,options){
 const sliding=createSlidingDoors(parent,options),hinged=createHingedDoors(parent,options),systems=[sliding,hinged];
 const byId=new Map(systems.flatMap(s=>s.state.map(d=>[d.id,s])));
 const find=id=>{const s=byId.get(id);if(!s)throw new RangeError(`Unknown door: ${id}`);return s;};
 return {sliding,hinged,
  get state(){return systems.flatMap(s=>s.state);},
  setOpen:(id,open)=>find(id).setOpen(id,open),toggle:id=>find(id).toggle(id),
  blocksPoint:(x,z,r)=>systems.some(s=>s.blocksPoint(x,z,r)),
  blocksWhenOpen:hinged.blocksWhenOpen,
  prepareRobotStep(x,z,r){
   for(const id of sliding.blockingDoors(x,z,r))sliding.setOpen(id,true);
   hinged.prepareRobotStep(x,z,r);
  },
  setPlanVisible:hinged.setPlanVisible,
  update(dt,occupants){const a=sliding.update(dt,occupants),b=hinged.update(dt,occupants);return a||b;},
  pick(raycaster,occluders){return systems.map(s=>s.pick(raycaster,occluders)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]??null;}
 };
}
