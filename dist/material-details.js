import * as THREE from './vendor/three.module.js';

// Small shared procedural maps; no extra meshes, draw calls or external assets.
export function applyMaterialDetails(materials,renderer){
 let seed=512;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 function texture(size,pixel,repeat,color=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=pixel(x,y);data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}
  ctx.putImageData(data,0,0);const map=new THREE.CanvasTexture(canvas);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(...repeat);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(color)map.colorSpace=THREE.SRGBColorSpace;return map;
 }
 const weave=texture(256,(x,y)=>185+22*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)+random()*10,[12,12]);
 for(const m of [...materials.fabric,materials.striped]){m.bumpMap=weave;m.bumpScale=.00065;m.roughnessMap=weave;m.roughness=1;}
 // Matte woven upholstery: visible warp/weft and subtle fibre variation in the colour.
 const linen=texture(256,(x,y)=>{
  const warp=Math.sin(x*Math.PI/4),weft=Math.cos(y*Math.PI/4);
  return 226+12*warp*weft+6*Math.sin(x*Math.PI/2)+random()*9;
 },[6,6],true);
 for(const m of materials.upholstery??[]){m.map=linen;m.bumpMap=linen;m.bumpScale=.0012;m.roughnessMap=null;m.roughness=1;m.metalness=0;}
 const wood=texture(512,(x,y)=>235+8*Math.sin(x*.18+Math.sin(y*.012)*1.4)+4*Math.sin(x*.6+y*.015)+random()*5,[1,1],true);
 for(const m of materials.wood){m.map=wood;m.bumpMap=wood;m.bumpScale=.001;m.roughness=.65;}
 const brushed=texture(256,(x,y)=>195+18*Math.sin(y*1.3)+random()*12,[1,3]);
 for(const m of materials.metal){m.roughnessMap=brushed;m.roughness=.42;m.bumpMap=brushed;m.bumpScale=.00012;}
 for(const m of materials.glass){m.color.set('#dce9eb');m.opacity=.14;m.roughness=.07;m.metalness=0;}
}

// Kitchen-only, seeded colour detail; no geometry or external texture downloads.
export function applyKitchenMaterials({wood,stone,front},renderer){
 let seed=93477;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;};
 function map(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const i=(y*512+x)*4;
   if(kind==='wood'){
    const wave=y+3*Math.sin(x*.014)+1.5*Math.sin(x*.039+y*.009);
    const grain=7*Math.sin(wave*.65)+3*Math.sin(wave*2.3)+4*Math.sin(y*.04)+rnd()*5;
    data.data[i]=201+grain;data.data[i+1]=169+grain;data.data[i+2]=126+grain;
   }else{
    const cloud=14*(noise(x/73,y/73)-.5)+8*(noise(x/21,y/21)-.5)+4*(noise(x/6,y/6)-.5)+rnd()*4;
    data.data[i]=109+cloud;data.data[i+1]=103+cloud;data.data[i+2]=94+cloud;
   }
   data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
 }
 wood.map=map('wood');wood.color.set('#ffffff');wood.bumpMap=wood.map;wood.bumpScale=.0006;wood.roughness=.78;
 stone.map=map('stone');stone.color.set('#ffffff');stone.bumpMap=stone.map;stone.bumpScale=.00035;stone.roughness=.82;stone.metalness=0;
 front.roughness=1;front.metalness=0;
}
