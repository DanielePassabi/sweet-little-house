import {rooms,insidePolygon} from './model.js';

export const robotLayout={radius:.175,clearance:.195,speed:.42,turnSpeed:3,dock:{x:.36,z:9.65,yaw:Math.PI/2}};
export const robotDockCollider={minX:.02,maxX:.15,minZ:9.43,maxZ:9.87};
const roomOrder=['utility','terrace','living','hall','room3','bath1','room2','bedroom','bath2'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Swept circles, not endpoint-only checks: narrow corners cannot be cut.
export function clearRobotSegment(a,b,isFree,r=robotLayout.clearance){
 const steps=Math.max(1,Math.ceil(distance(a,b)/.025));
 for(let i=0;i<=steps;i++){const t=i/steps;if(!isFree(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,r))return false;}
 return true;
}

export function createRobotNavigation(isFree){
 const step=.10,offset=-.4,cols=105,rowsCount=160,size=cols*rowsCount;
 const free=new Uint8Array(size),edges=new Uint8Array(size);
 const at=id=>({x:offset+(id%cols)*step,z:offset+Math.floor(id/cols)*step});
 for(let id=0;id<size;id++){const p=at(id);free[id]=isFree(p.x,p.z,robotLayout.clearance)?1:0;}
 // Cache undirected edges once. Every edge is checked between samples as well.
 for(let id=0;id<size;id++)if(free[id]){
  for(const [delta,bit,opposite] of [[1,1,2],[cols,4,8]]){
   const next=id+delta;
   if(next>=size||(delta===1&&next%cols===0)||!free[next])continue;
   if(clearRobotSegment(at(id),at(next),isFree)){edges[id]|=bit;edges[next]|=opposite;}
  }
 }
 function nearest(p,connected=true){
  const col=Math.round((p.x-offset)/step),row=Math.round((p.z-offset)/step),rounded=row*cols+col;
  if(col>=0&&col<cols&&row>=0&&row<rowsCount&&free[rounded]&&(!connected||clearRobotSegment(p,at(rounded),isFree)))return rounded;
  // Test nearest candidates first, instead of casting long rays across the house.
  const candidates=[];
  for(let id=0;id<size;id++)if(free[id])candidates.push({id,d:distance(p,at(id))});
  candidates.sort((a,b)=>a.d-b.d);
  return candidates.find(({id})=>!connected||clearRobotSegment(p,at(id),isFree))?.id??-1;
 }
 function flood(start,goal=-1){
  const parent=new Int32Array(size).fill(-1),queue=new Int32Array(size);let end=1;
  if(start<0)return parent;queue[0]=start;parent[start]=start;
  for(let i=0;i<end;i++){
   const id=queue[i];if(id===goal)break;
   for(const [bit,delta] of [[1,1],[2,-1],[4,cols],[8,-cols]])if(edges[id]&bit){
    const next=id+delta;if(parent[next]<0){parent[next]=id;queue[end++]=next;}
   }
  }
  return parent;
 }
 function route(from,to){
  if(!isFree(to.x,to.z,robotLayout.clearance))return null;
  const start=nearest(from),end=nearest(to),parent=flood(start,end);
  if(end<0||parent[end]<0)return null;
  const reverse=[];for(let id=end;id!==start;id=parent[id])reverse.push(at(id));
  const raw=[at(start),...reverse.reverse(),to],result=[];let anchor=from,index=0;
  // String-pulling retains clearance, removing the visible grid staircase.
  while(index<raw.length){
   let last=index;
   while(last+1<raw.length&&clearRobotSegment(anchor,raw[last+1],isFree))last++;
   if(!clearRobotSegment(anchor,raw[last],isFree))return null;
   if(distance(anchor,raw[last])>.001)result.push(raw[last]);anchor=raw[last];index=last+1;
  }
  return result;
 }
 function tour(from){
  const reachable=flood(nearest(from)),targets=[];
  for(const roomId of roomOrder){
   const room=rooms.find(r=>r.id===roomId),candidates=[];
   // Alternating strips across each room, approximately one metre apart.
   for(let row=5;row<rowsCount;row+=10){
    const strip=[];
    for(let col=5;col<cols;col+=10){const id=row*cols+col,p=at(id);if(reachable[id]>=0&&insidePolygon(p.x,p.z,room.polygon))strip.push({...p,roomId});}
    if(Math.floor(row/10)%2)strip.reverse();candidates.push(...strip);
   }
   if(!candidates.length){
    const id=Array.from(reachable).findIndex((parent,i)=>parent>=0&&insidePolygon(at(i).x,at(i).z,room.polygon));
    if(id>=0)candidates.push({...at(id),roomId});
   }
   targets.push(...candidates);
  }
  return targets;
 }
 return {route,tour,nearestPoint:p=>{const id=nearest(p,false);return id<0?null:at(id);}};
}

export function createRobotController({isFree,canMove=isFree,prepareStep=()=>{},onChange=()=>{}}){
 const position={x:robotLayout.dock.x,z:robotLayout.dock.z};
 let yaw=robotLayout.dock.yaw,mode='docked',resumeMode='cleaning',waiting=false,roomId='utility';
 let navigation=null,targets=[],path=[],visited=new Set(),completed=false;
 const snapshot=()=>({mode,waiting,roomId,x:position.x,z:position.z,yaw,visited:[...visited],total:roomOrder.length,completed});
 const emit=()=>onChange(snapshot());
 const grid=()=>navigation??=createRobotNavigation(isFree);
 function setMode(next){mode=next;waiting=false;emit();}
 function home(){targets=[{...robotLayout.dock,home:true}];path=[];setMode('returning');}
 function toggle(){
  if(mode==='paused'){setMode(resumeMode);return;}
  if(mode==='cleaning'||mode==='returning'){resumeMode=mode;setMode('paused');return;}
  completed=false;visited=new Set();targets=grid().tour(position);path=[];setMode('cleaning');
 }
 function replan(){
  navigation=null;path=[];
  if(!isFree(position.x,position.z,robotLayout.clearance)){
   // A newly selected kitchen can appear around the robot, like around a visitor.
   const safe=grid().nearestPoint(position);if(safe)Object.assign(position,safe);
  }
  if(mode==='cleaning'||(mode==='paused'&&resumeMode==='cleaning'))targets=grid().tour(position);
  if(mode==='blocked')setMode(resumeMode);
  emit();
 }
 function update(dt){
  if(!Number.isFinite(dt)||dt<=0||!['cleaning','returning'].includes(mode))return false;
  const duration=Math.min(dt,.1);
  if(!targets.length){home();return true;}
  const goal=targets[0];
  if(!path.length){
   if(distance(position,goal)<.005){
    if(goal.home){
     const delta=angleDifference(robotLayout.dock.yaw,yaw);
     yaw+=Math.max(-robotLayout.turnSpeed*duration,Math.min(robotLayout.turnSpeed*duration,delta));
     if(Math.abs(delta)<.005){yaw=robotLayout.dock.yaw;setMode('docked');}
    }else{targets.shift();if(!targets.length){completed=true;home();}}
    return true;
   }
   path=grid().route(position,goal);
   if(!path){path=[];resumeMode=mode;setMode('blocked');return false;}
  }
  const next=path[0],dist=distance(position,next);
  if(dist<.001){path.shift();return true;}
  const dx=(next.x-position.x)/dist,dz=(next.z-position.z)/dist;
  prepareStep(position.x+dx*Math.min(dist,.35),position.z+dz*Math.min(dist,.35),robotLayout.clearance+.06);
  const wanted=Math.atan2(dx,dz),delta=angleDifference(wanted,yaw),turn=robotLayout.turnSpeed*duration;
  yaw+=Math.max(-turn,Math.min(turn,delta));
  if(Math.abs(delta)>turn+.005)return true;
  const amount=Math.min(dist,robotLayout.speed*duration),candidate={x:position.x+dx*amount,z:position.z+dz*amount};
  if(!clearRobotSegment(position,candidate,canMove)){
   if(!waiting){waiting=true;emit();}return false;
  }
  if(waiting){waiting=false;emit();}
  Object.assign(position,candidate);if(amount===dist)path.shift();
  const room=rooms.find(r=>insidePolygon(position.x,position.z,r.polygon));
  if(room&&(room.id!==roomId||!visited.has(room.id))){roomId=room.id;visited.add(room.id);emit();}
  return true;
 }
 return {get state(){return snapshot();},toggle,returnHome:()=>{if(mode!=='docked')home();},replan,update};
}
