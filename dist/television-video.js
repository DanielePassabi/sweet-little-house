import * as THREE from './vendor/three.module.js';

export const TV_VIDEO_ID='njX2bu-_Vw4';
export const PLAYER_WIDTH=960,PLAYER_HEIGHT=540;
export const tvPlayerVars=origin=>({origin,autoplay:1,mute:1,loop:1,playlist:TV_VIDEO_ID,playsinline:1,controls:0,disablekb:1,fs:0,rel:0});

// Map the iframe's pixel coordinates onto the actual screen plane. WebGL cuts
// only the visible screen pixels out of its canvas, so walls still occlude it.
export function projectTVScreen(screen,camera,width,height){
 const {width:w,height:h}=screen.geometry.parameters;
 const centre=new THREE.Vector3().setFromMatrixPosition(screen.matrixWorld);
 const normal=new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld);
 const towardsCamera=camera.isOrthographicCamera?camera.getWorldDirection(new THREE.Vector3()).negate():camera.position.clone().sub(centre);
 if(normal.dot(towardsCamera)<=.0001||width<=0||height<=0)return null;
 const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(screen.matrixWorld);
 const corners=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]].map(([x,y])=>new THREE.Vector4(x,y,0,1).applyMatrix4(projection));
 // Suppress unstable projection while the camera cuts through the TV plane.
 if(corners.some(p=>p.w<=0||p.z< -p.w))return null;
 if(corners.every(p=>p.z>p.w)||corners.every(p=>p.x< -p.w)||corners.every(p=>p.x>p.w)||corners.every(p=>p.y< -p.w)||corners.every(p=>p.y>p.w))return null;
 const points=corners.map(p=>[(p.x/p.w+1)*width/2,(1-p.y/p.w)*height/2]);
 const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%4];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
 if(area<4)return null;
 const viewport=new THREE.Matrix4().set(width/2,0,0,width/2,0,-height/2,0,height/2,0,0,0,0,0,0,0,1);
 const pixelsToPlane=new THREE.Matrix4().set(w/PLAYER_WIDTH,0,0,-w/2,0,-h/PLAYER_HEIGHT,0,h/2,0,0,1,0,0,0,0,1);
 const matrix=viewport.multiply(projection).multiply(pixelsToPlane);
 // Keep the CSS transform invertible even though the surface itself is flat.
 matrix.elements[10]=1;
 return {transform:`matrix3d(${matrix.elements.join(',')})`,matrix,points};
}

let apiPromise;
function loadYouTubeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  const timer=setTimeout(()=>reject(new Error('YouTube non raggiungibile')),15000);
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>{clearTimeout(timer);reject(new Error('YouTube non raggiungibile'));};document.head.append(script);
 }).catch(error=>{apiPromise=null;throw error;});
 return apiPromise;
}

export function createTelevisionVideo({host,screen,invalidate,controls,apiLoader=loadYouTubeAPI}){
 const {power,audio,play,status,link}=controls;
 const originalMaterial=screen.material;
 // No blending writes alpha zero while retaining the regular depth test.
 const aperture=new THREE.MeshBasicMaterial({color:0,opacity:0,blending:THREE.NoBlending,depthWrite:true,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,fog:false,toneMapped:false});
 const layer=document.createElement('div');layer.className='tv-video-layer';layer.hidden=true;
 const surface=document.createElement('div');surface.className='tv-video-surface';layer.append(surface);host.prepend(layer);
 let player=null,ready=false,loading=false,failed=false,visible=false,sentPlaying=null,blocked=false,disposed=false,generation=0;
 link.href=`https://www.youtube.com/watch?v=${TV_VIDEO_ID}`;
 // Playback is independent of the camera: turning away must not interrupt audio.
 const shouldPlay=()=>power.checked&&!failed;
 function sync(){
  const show=ready&&power.checked&&visible&&!failed;
  layer.hidden=!ready||!power.checked||failed;screen.material=show?aperture:originalMaterial;
  if(ready){
   const wanted=shouldPlay()&&!blocked;
   if(wanted!==sentPlaying){sentPlaying=wanted;wanted?player.playVideo():player.pauseVideo();}
  }
  invalidate();
 }
 function fail(message){failed=true;loading=false;play.hidden=false;play.textContent='Riprova';status.textContent=message;link.hidden=false;sync();}
 async function start(){
  if(disposed||loading||ready&&!failed)return;
  const attempt=++generation;loading=true;failed=false;blocked=false;ready=false;sentPlaying=null;
  player?.destroy();player=null;surface.replaceChildren();
  const mount=document.createElement('div');surface.append(mount);
  status.textContent='Caricamento video…';play.hidden=true;link.hidden=true;
  try{
   const YT=await apiLoader();if(disposed||attempt!==generation)return;
   player=new YT.Player(mount,{width:PLAYER_WIDTH,height:PLAYER_HEIGHT,host:'https://www.youtube-nocookie.com',videoId:TV_VIDEO_ID,playerVars:tvPlayerVars(location.origin),events:{
    onReady:event=>{
     if(disposed||attempt!==generation)return;
     player=event.target;ready=true;loading=false;
     const iframe=player.getIframe();iframe.title='TV · LG OLED The Black';iframe.tabIndex=-1;iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
     iframe.referrerPolicy='strict-origin-when-cross-origin';
     audio.checked?player.unMute():player.mute();sync();
    },
    onStateChange:event=>{
     if(disposed||attempt!==generation)return;
     if(event.data===1){if(!shouldPlay()){player.pauseVideo();return;}blocked=false;play.hidden=true;status.textContent='Video in loop';}
     if(event.data===2&&!failed&&!blocked)status.textContent=power.checked?'Video in pausa':'TV spenta';
     if(event.data===0&&shouldPlay()){player.seekTo(0,true);player.playVideo();}
    },
    onAutoplayBlocked:()=>{if(disposed||attempt!==generation)return;blocked=true;play.hidden=false;play.textContent='Avvia video';status.textContent='Premi Avvia video per iniziare.';},
    onError:()=>{if(disposed||attempt!==generation)return;fail('YouTube non riesce a riprodurre il video qui.');}
   }});
  }catch{if(!disposed&&attempt===generation)fail('YouTube non raggiungibile. Puoi riprovare.');}
 }
 function powerChanged(){if(power.checked&&!ready&&!loading)start();sync();if(!power.checked)status.textContent='TV spenta';}
 function audioChanged(){if(ready){audio.checked?player.unMute():player.mute();} }
 function playClicked(){if(failed||!ready){start();return;}blocked=false;sentPlaying=null;sync();}
 power.addEventListener('change',powerChanged);audio.addEventListener('change',audioChanged);play.addEventListener('click',playClicked);
 return {
  update(camera,width,height){
   const projection=projectTVScreen(screen,camera,width,height),nextVisible=!!projection;
   surface.style.transform=projection?projection.transform:'translate(-200%, -200%)';
   if(nextVisible!==visible){visible=nextVisible;sync();}
   if(power.checked&&!ready&&!loading&&!failed)start();
  },
  dispose(){disposed=true;generation++;player?.destroy();layer.remove();screen.material=originalMaterial;aperture.dispose();power.removeEventListener('change',powerChanged);audio.removeEventListener('change',audioChanged);play.removeEventListener('click',playClicked);}
 };
}
