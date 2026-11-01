import {createSlidingDoors} from './sliding-doors.js';
import {createHingedDoors} from './hinged-doors.js';
import {createTerraceDoor} from './terrace-door.js';

// Share picking and walking across doors; the robot only opens interior routes.
export function createDoors(parent,options){
 const sliding=createSlidingDoors(parent,options),hinged=createHingedDoors(parent,options),terrace=createTerraceDoor(parent,options),systems=[sliding,hinged,terrace];
 const byId=new Map(systems.flatMap(s=>s.state.map(d=>[d.id,s])));
 const find=id=>{const s=byId.get(id);if(!s)throw new RangeError(`Unknown door: ${id}`);return s;};
 return {sliding,hinged,terrace,
  get state(){return systems.flatMap(s=>s.state);},
  setOpen:(id,open)=>find(id).setOpen(id,open),toggle:id=>find(id).toggle(id),
  blocksPoint:(x,z,r)=>systems.some(s=>s.blocksPoint(x,z,r)),
  blocksWhenOpen:(x,z,r)=>hinged.blocksWhenOpen(x,z,r)||terrace.blocksWhenOpen(x,z,r),
  prepareRobotStep(x,z,r){
   for(const id of sliding.blockingDoors(x,z,r))sliding.setOpen(id,true);
   hinged.prepareRobotStep(x,z,r);
  },
  setPlanVisible:hinged.setPlanVisible,
  update(dt,occupants){let changed=false;for(const s of systems)if(s.update(dt,occupants))changed=true;return changed;},
  pick(raycaster,occluders){return systems.map(s=>s.pick(raycaster,occluders)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]??null;}
 };
}
