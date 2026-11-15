// The stick, action buttons and camera can each capture a different finger.
export function createWalkControls({canvas,pad,buttons,active,jump,turn}){
 const knob=pad.firstElementChild, stick={right:0,forward:0,running:false};
 let stickPointer=null,lookPointer=null,runPointer=null;
 let centerX,centerY,radius,lastX,lastY;
 function centerStick(){
  stickPointer=null;
  stick.right=stick.forward=0;
  knob.style.transform='';
 }
 function updateStick(e){
  if(e.pointerId!==stickPointer)return;
  const dx=(e.clientX-centerX)/radius,dy=(e.clientY-centerY)/radius;
  const length=Math.hypot(dx,dy),distance=Math.min(1,length);
  const scale=distance/(length||1);
  knob.style.transform=`translate(${dx*scale*radius}px,${dy*scale*radius}px)`;
  const amount=Math.max(0,(distance-.10)/.90)/(length||1);
  stick.right=dx*amount;stick.forward=-dy*amount;
 }
 pad.onpointerdown=e=>{
  if(!active()||stickPointer!==null)return;
  e.preventDefault();stickPointer=e.pointerId;
  const rect=pad.getBoundingClientRect();
  centerX=rect.left+rect.width/2;centerY=rect.top+rect.height/2;
  radius=Math.max(1,(rect.width-knob.offsetWidth)/2);
  pad.setPointerCapture(e.pointerId);updateStick(e);
 };
 pad.onpointermove=updateStick;
 pad.onpointerup=pad.onpointercancel=pad.onlostpointercapture=e=>{if(e.pointerId===stickPointer)centerStick();};
 for(const b of buttons){
  b.onpointerdown=e=>{
   if(!active())return;
   e.preventDefault();b.setPointerCapture(e.pointerId);
   if(b.dataset.move==='jump')jump();
   else{runPointer=e.pointerId;stick.running=true;}
  };
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{
   if(e.pointerId===runPointer){runPointer=null;stick.running=false;}
  };
 }
 document.addEventListener('mousemove',e=>{
  if(active()&&document.pointerLockElement===canvas)turn(e.movementX,e.movementY,.002);
 });
 canvas.addEventListener('pointerdown',e=>{
  if(!active()||e.button!==0||lookPointer!==null||document.pointerLockElement===canvas)return;
  canvas.focus({preventScroll:true});
  lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==lookPointer)return;
  turn(e.clientX-lastX,e.clientY-lastY,.004);lastX=e.clientX;lastY=e.clientY;
 });
 const endLook=e=>{if(e.pointerId===lookPointer)lookPointer=null;};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endLook);
 return {stick,reset(){lookPointer=runPointer=null;stick.running=false;centerStick();}};
}
