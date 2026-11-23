export const DEFAULT_EYE_HEIGHT=1.75;
export const WALK_SPEED=1.5;
export const RUN_SPEED=3;
export const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space']);

// Consume relative pointer motion on animation frames, including coalesced mouse events.
export function createWalkLook(){
 let yawLeft=0,pitchLeft=0;
 return {
  reset(){yawLeft=pitchLeft=0;},
  turn(dx,dy,sensitivity,pitch){
   if(Number.isFinite(dx))yawLeft-=dx*sensitivity;
   if(Number.isFinite(dy))pitchLeft=Math.max(-1.35,Math.min(1.35,pitch+pitchLeft-dy*sensitivity))-pitch;
  },
  update(dt,apply,smooth=true){
   if(!yawLeft&&!pitchLeft)return;
   // A mouse reports distance. Apply the whole batch on the next display frame,
   // so a short frame followed by a long one cannot redistribute the turn.
   const blend=smooth?-Math.expm1(-55*dt):1;
   const dx=Math.abs(yawLeft)<.0001?yawLeft:yawLeft*blend;
   const dy=Math.abs(pitchLeft)<.0001?pitchLeft:pitchLeft*blend;
   yawLeft-=dx;pitchLeft-=dy;
   apply(dx,dy);
  }
 };
}

export function createMovement(canWalk,clearance=()=>Infinity){
 let vx=0,vz=0,verticalSpeed=0,jumpHeight=0,jumpRequested=false;
 const fits=(x,z,eye)=>canWalk(x,z)&&(jumpHeight===0||jumpHeight<=clearance(x,z,eye)+1e-6);
 return {
  get jumpHeight(){return jumpHeight;},
  jump(){if(jumpHeight===0)jumpRequested=true;},
  reset(){vx=vz=verticalSpeed=jumpHeight=0;jumpRequested=false;},
  update(dt,keys,yaw,position,eyeHeight=DEFAULT_EYE_HEIGHT,stick){
   if(!Number.isFinite(dt)||dt<=0)return;
   const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+(stick?.forward??0);
   const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+(stick?.right??0);
   const norm=Math.hypot(forward,right);
   if(!norm&&!vx&&!vz&&!jumpRequested&&jumpHeight===0){position.y=eyeHeight;return;}
   const running=keys.has('ShiftLeft')||keys.has('ShiftRight')||stick?.running;
   const speed=(running?RUN_SPEED:WALK_SPEED)/Math.max(1,norm);
   const targetX=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
   const targetZ=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
   const duration=Math.min(dt,.1),steps=Math.ceil(duration/(1/120)),step=duration/steps;
   // Integrate the velocity curve exactly, keeping the physical step short for collisions.
   const response=norm?18:30,blend=-Math.expm1(-response*step);
   if(jumpRequested)verticalSpeed=2.5;
   jumpRequested=false;
   for(let i=0;i<steps;i++){
    const dx=targetX*step+(vx-targetX)*blend/response;
    const dz=targetZ*step+(vz-targetZ)*blend/response;
    vx+=(targetX-vx)*blend;vz+=(targetZ-vz)*blend;
    const x=position.x+dx,z=position.z+dz;
    if(dx||dz){
     if(fits(x,z,eyeHeight)){position.x=x;position.z=z;}
     else{
      if(dx&&fits(x,position.z,eyeHeight))position.x=x;else vx=0;
      if(dz&&fits(position.x,z,eyeHeight))position.z=z;else vz=0;
     }
    }
    if(jumpHeight===0&&verticalSpeed===0)continue;
    const limit=Math.max(0,clearance(position.x,position.z,eyeHeight));
    jumpHeight+=verticalSpeed*step-.5*9.81*step*step;
    verticalSpeed-=9.81*step;
    if(jumpHeight>=limit){jumpHeight=limit;verticalSpeed=Math.min(0,verticalSpeed);}
    if(jumpHeight<=0){jumpHeight=0;verticalSpeed=0;}
   }
   if(!norm&&Math.hypot(vx,vz)<.008)vx=vz=0;
   position.y=eyeHeight+jumpHeight;
  }
 };
}
