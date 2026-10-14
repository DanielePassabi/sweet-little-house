import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createTelevisionVideo,projectTVScreen,tvPlayerVars,TV_VIDEO_ID,PLAYER_WIDTH,PLAYER_HEIGHT} from '../dist/television-video.js';

const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.833,1.833*9/16),new THREE.MeshStandardMaterial());
screen.position.set(3.175,1.47,9.72);screen.rotation.y=Math.PI/2;screen.updateMatrixWorld(true);
const original=screen.material;
const perspective=new THREE.PerspectiveCamera(43,16/9,.05,150);
const orthographic=new THREE.OrthographicCamera(-4,4,3,-3,.05,100);
for(const camera of [perspective,orthographic])for(const [x,y,z] of [[7,2,10],[5,4,12],[3.8,1.75,9]])for(const [width,height] of [[1280,720],[420,800]]){
 camera.position.set(x,y,z);camera.lookAt(screen.position);camera.updateMatrixWorld();
 const result=projectTVScreen(screen,camera,width,height);assert.ok(result,'Visible TV has a projected surface');
 assert.ok(Math.abs(result.matrix.determinant())>1e-10,'CSS matrix must be invertible to paint the iframe');
 for(const [i,[u,v]] of [[0,0],[PLAYER_WIDTH,0],[PLAYER_WIDTH,PLAYER_HEIGHT],[0,PLAYER_HEIGHT]].entries()){
  const p=new THREE.Vector4(u,v,0,1).applyMatrix4(result.matrix);
  const expected=new THREE.Vector3((u/PLAYER_WIDTH-.5)*1.833,(.5-v/PLAYER_HEIGHT)*1.833*9/16,0).applyMatrix4(screen.matrixWorld).project(camera);
  assert.ok(Math.abs(p.x/p.w-(expected.x+1)*width/2)<1e-7&&Math.abs(p.y/p.w-(1-expected.y)*height/2)<1e-7,`Corner ${i} matches WebGL projection`);
 }
}
perspective.position.set(2,1.47,9.72);perspective.lookAt(screen.position);perspective.updateMatrixWorld();
assert.equal(projectTVScreen(screen,perspective,1280,720),null,'Back of TV does not display mirrored video');
orthographic.position.set(3.175,24,9.721);orthographic.lookAt(screen.position);orthographic.updateMatrixWorld();
assert.equal(projectTVScreen(screen,orthographic,1280,720),null,'Plan view hides edge-on TV');
perspective.position.set(6,1.7,10);perspective.lookAt(10,1.7,10);perspective.updateMatrixWorld();
assert.equal(projectTVScreen(screen,perspective,1280,720),null,'TV behind the viewer is hidden');
perspective.lookAt(screen.position);perspective.updateMatrixWorld();
assert.equal(projectTVScreen(screen,perspective,0,720),null,'Collapsed viewport remains safe');
const vars=tvPlayerVars('https://example.com');
assert.equal(TV_VIDEO_ID,'njX2bu-_Vw4');assert.equal(vars.playlist,TV_VIDEO_ID);assert.equal(vars.loop,1);assert.equal(vars.mute,1);assert.equal(vars.playsinline,1);assert.equal(vars.disablekb,1);

// Exercise asynchronous playback events without a network or browser dependency.
class Element extends EventTarget{
 constructor(){super();this.style={};this.children=[];this.hidden=false;this.checked=false;this.textContent='';}
 append(child){this.children.push(child);} prepend(child){this.children.unshift(child);}
 replaceChildren(){this.children=[];} remove(){this.removed=true;} setAttribute(name,value){this[name]=value;}
}
const doc=new Element();doc.createElement=()=>new Element();doc.hidden=false;
globalThis.document=doc;globalThis.location={origin:'http://localhost:4173'};
const host=new Element(),controls=Object.fromEntries(['power','audio','play','status','link'].map(k=>[k,new Element()]));controls.power.checked=true;
const calls=[],players=[];let invalidations=0;
class Player{
 constructor(mount,options){this.options=options;this.iframe=new Element();players.push(this);}
 getIframe(){return this.iframe;} playVideo(){calls.push('play');} pauseVideo(){calls.push('pause');}
 mute(){calls.push('mute');} unMute(){calls.push('unmute');} seekTo(time){calls.push(['seek',time]);} destroy(){calls.push('destroy');}
 emit(name,data){this.options.events[name]({target:this,data});}
}
const video=createTelevisionVideo({host,screen,controls,invalidate:()=>invalidations++,apiLoader:async()=>({Player})});
video.update(perspective,1280,720);await Promise.resolve();
assert.equal(players.length,1);assert.equal(screen.material,original,'Keep original screen during loading');
players[0].emit('onReady');assert.deepEqual(calls.slice(-2),['mute','play']);
assert.equal(host.children[0].hidden,false);assert.notEqual(screen.material,original);
assert.equal(screen.material.blending,THREE.NoBlending);assert.equal(screen.material.opacity,0);
assert.equal(screen.material.depthTest,true);assert.equal(screen.material.depthWrite,true);assert.equal(screen.material.polygonOffset,true);
const idleInvalidations=invalidations,playCalls=calls.length;
for(let i=0;i<50;i++)video.update(perspective,1280,720);
assert.equal(invalidations,idleInvalidations,'Video frames do not continuously invalidate the 3D scene');assert.equal(calls.length,playCalls,'No repeated play commands during camera updates');
players[0].emit('onStateChange',0);assert.deepEqual(calls.slice(-2),[['seek',0],'play'],'Ended event restarts the video');
controls.audio.checked=true;controls.audio.dispatchEvent(new Event('change'));assert.equal(calls.at(-1),'unmute');
const continuousCalls=calls.length;
video.update(orthographic,1280,720);assert.equal(screen.material,original);assert.equal(host.children[0].hidden,false,'Keep iframe alive outside the camera view');
assert.match(host.children[0].children[0].style.transform,/translate/,'Move out-of-view video behind the opaque canvas');
video.update(perspective,1280,720);
doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
assert.equal(calls.length,continuousCalls,'Turning away, changing views and hiding the tab never pause or restart playback');
controls.power.checked=false;controls.power.dispatchEvent(new Event('change'));assert.equal(calls.at(-1),'pause');assert.equal(screen.material,original);
controls.power.checked=true;controls.power.dispatchEvent(new Event('change'));assert.equal(calls.at(-1),'play');
players[0].emit('onAutoplayBlocked');assert.equal(controls.play.hidden,false);
controls.play.dispatchEvent(new Event('click'));assert.equal(calls.at(-1),'play');
players[0].emit('onError',150);assert.equal(screen.material,original);assert.equal(controls.link.hidden,false);assert.equal(controls.play.hidden,false);
controls.play.dispatchEvent(new Event('click'));await Promise.resolve();assert.equal(players.length,2,'Retry recreates the player');
players[1].emit('onReady');assert.deepEqual(calls.slice(-2),['unmute','play'],'Retry retains the user audio choice');
video.dispose();assert.equal(screen.material,original);assert.equal(calls.at(-1),'destroy');assert.equal(host.children[0].removed,true);
const disposedCount=calls.length;players[1].emit('onStateChange',0);assert.equal(calls.length,disposedCount,'Late player callbacks do nothing after teardown');
const offline=createTelevisionVideo({host:new Element(),screen,controls,invalidate:()=>{},apiLoader:async()=>{throw new Error('offline');}});
offline.update(perspective,1280,720);await Promise.resolve();await Promise.resolve();
assert.equal(screen.material,original);assert.equal(controls.play.hidden,false);assert.equal(controls.link.hidden,false);offline.dispose();
const planFirst=createTelevisionVideo({host:new Element(),screen,controls,invalidate:()=>{},apiLoader:async()=>({Player})});
const beforePlan=players.length;planFirst.update(orthographic,1280,720);await Promise.resolve();
assert.equal(players.length,beforePlan+1,'TV starts even when initially outside the view');planFirst.dispose();
console.log('PASS: perspective/orthographic projection, depth-tested aperture, loop, muted autoplay, audio, continuous off-screen playback, idle rendering, retry and teardown.');
