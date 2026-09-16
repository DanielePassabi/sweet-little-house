import * as THREE from './vendor/three.module.js';

// Three small shared maps; no extra meshes, draw calls or external assets.
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
 const wood=texture(512,(x,y)=>235+8*Math.sin(x*.18+Math.sin(y*.012)*1.4)+4*Math.sin(x*.6+y*.015)+random()*5,[1,1],true);
 for(const m of materials.wood){m.map=wood;m.bumpMap=wood;m.bumpScale=.001;m.roughness=.65;}
 const brushed=texture(256,(x,y)=>195+18*Math.sin(y*1.3)+random()*12,[1,3]);
 for(const m of materials.metal){m.roughnessMap=brushed;m.roughness=.42;m.bumpMap=brushed;m.bumpScale=.00012;}
 for(const m of materials.glass){m.color.set('#dce9eb');m.opacity=.14;m.roughness=.07;m.metalness=0;}
}
