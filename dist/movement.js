export const DEFAULT_EYE_HEIGHT=1.75;
export const WALK_SPEED=1.5;
export const RUN_SPEED=3;
export const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space']);

// Independent of the renderer so time stepping and collision behaviour are testable.
export function createMovement(canWalk,clearance=()=>Infinity){
 let vx=0,vz=0,verticalSpeed=0,jumpHeight=0,jumpRequested=false;
 return {
  get jumpHeight(){return jumpHeight;},
  jump(){if(jumpHeight===0)jumpRequested=true;},
  reset(){vx=vz=verticalSpeed=jumpHeight=0;jumpRequested=false;},
  update(dt,keys,yaw,position,eyeHeight=DEFAULT_EYE_HEIGHT){
   if(!Number.isFinite(dt)||dt<=0)return;
   const duration=Math.min(dt,.1),steps=Math.ceil(duration/(1/120)),step=duration/steps;
   let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
   let right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
   const norm=Math.hypot(forward,right);if(norm){forward/=norm;right/=norm;}
   if(!norm&&!jumpRequested&&jumpHeight===0){vx=vz=verticalSpeed=0;position.y=eyeHeight;return;}
   const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?RUN_SPEED:WALK_SPEED;
   const targetX=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
   const targetZ=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
   if(jumpRequested&&jumpHeight===0)verticalSpeed=2.5;
   jumpRequested=false;
   const blend=1-Math.exp(-18*step);
   const fits=(x,z)=>canWalk(x,z)&&jumpHeight<=clearance(x,z,eyeHeight)+1e-6;
   for(let i=0;i<steps;i++){
    vx+=(targetX-vx)*blend;vz+=(targetZ-vz)*blend;
    // Release stops promptly; acceleration only smooths starting and changing direction.
    if(!norm)vx=vz=0;
    const nextX=position.x+vx*step,nextZ=position.z+vz*step;
    if(vx!==0&&fits(nextX,position.z))position.x=nextX;else vx=0;
    if(vz!==0&&fits(position.x,nextZ))position.z=nextZ;else vz=0;
    const limit=Math.max(0,clearance(position.x,position.z,eyeHeight));
    jumpHeight+=verticalSpeed*step-.5*9.81*step*step;
    verticalSpeed-=9.81*step;
    if(jumpHeight>=limit){jumpHeight=limit;verticalSpeed=Math.min(0,verticalSpeed);}
    if(jumpHeight<=0){jumpHeight=0;verticalSpeed=0;}
   }
   position.y=eyeHeight+jumpHeight;
  }
 };
}
