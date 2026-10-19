import * as THREE from './vendor/three.module.js';
import {walls,point,SCALE} from './model.js';

// Estimated from the two installation photos: four 60 cm courses, large
// horizontal slabs, a narrow un-tiled band below the 2.60 m ceiling.
export const bathroomTileFinish={width:1.20,height:.60,top:2.40,grout:.002,thickness:.011,color:'#d7d1c4',estimated:true};
const wallAt=(x,z)=>walls.find(w=>w.a[0]===x&&w.a[1]===z);
const west=walls.find(w=>w.a[0]===30&&w.a[1]===43&&w.b[0]===30),east=wallAt(270,320),north=wallAt(30,320),south=wallAt(30,498);
const x0=point(west.a)[0]+west.t/2,x1=point(east.a)[0]-east.t/2;
const z0=point(north.a)[1]+north.t/2,z1=point(south.a)[1]-south.t/2;
const door=east.open.find(o=>o.kind==='door'),window=west.open.find(o=>o.kind==='window');
const windowStart=point(west.a)[1]+window.s/SCALE,windowEnd=point(west.a)[1]+window.e/SCALE;
const doorStart=point(east.a)[1]+door.s/SCALE,doorEnd=point(east.a)[1]+door.e/SCALE;
const t=bathroomTileFinish.thickness;
// Inward-facing planes, with metric UVs shared across all pieces of each wall.
export const bathroomTileWalls=[
 {id:'north',origin:[x0,z0+t],along:[1,0],length:x1-x0,holes:[]},
 {id:'east',origin:[x1-t,z0],along:[0,1],length:z1-z0,holes:[{start:doorStart-z0-.038,end:doorEnd-z0+.038,bottom:0,top:door.h+.045}]},
 {id:'south',origin:[x1,z1-t],along:[-1,0],length:x1-x0,holes:[]},
 {id:'west',origin:[x0+t,z1],along:[0,-1],length:z1-z0,holes:[{start:z1-windowEnd,end:z1-windowStart,bottom:window.sill-.038,top:window.sill+window.h}]},
];

export function tileRectangles(wall){
 const cuts=[0,wall.length,...wall.holes.flatMap(h=>[h.start,h.end])].sort((a,b)=>a-b),pieces=[];
 for(let i=0;i<cuts.length-1;i++){
  const left=cuts[i],right=cuts[i+1],mid=(left+right)/2;
  if(right-left<.00001)continue;
  const hole=wall.holes.find(h=>mid>h.start&&mid<h.end);
  if(!hole)pieces.push({left,right,bottom:.004,top:bathroomTileFinish.top});
  else{
   if(hole.bottom>.004)pieces.push({left,right,bottom:.004,top:hole.bottom});
   if(hole.top<bathroomTileFinish.top)pieces.push({left,right,bottom:hole.top,top:bathroomTileFinish.top});
  }
 }
 return pieces;
}

export function createBathroomTileTexture(){
 const width=1024,height=512,data=new Uint8Array(width*height*4);
 let seed=79183;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const layers=[4,12,32,96].map(size=>({size,grid:Float32Array.from({length:size*size},()=>rnd()-.5)}));
 const smooth=v=>v*v*(3-2*v);
 function noise(layer,u,v){
  const n=layer.size,x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const at=(a,b)=>layer.grid[(b%n)*n+a%n],a=at(ix,iy)*(1-fx)+at(ix+1,iy)*fx,b=at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx;
  return a*(1-fy)+b*fy;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=(y+.5)/height,i=(y*width+x)*4;
  const joint=Math.min(u,1-u)*bathroomTileFinish.width<bathroomTileFinish.grout/2||Math.min(v,1-v)*bathroomTileFinish.height<bathroomTileFinish.grout/2;
  const cloud=noise(layers[0],u,v)*7+noise(layers[1],u,v)*5+noise(layers[2],u,v)*3+noise(layers[3],u,v)*1.8+(rnd()-.5)*2;
  const base=joint?[185,180,169]:[215,209,196];
  for(let c=0;c<3;c++)data[i+c]=Math.round(base[c]+(joint?0:cloud));data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.name='warm-greige-stone-120x60';
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/bathroomTileFinish.width,1/bathroomTileFinish.height);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

export function createBathroomTiles(parent,anisotropy=1){
 const group=new THREE.Group();group.name='windowed-bathroom-wall-tiles';parent.add(group);
 const map=createBathroomTileTexture();map.anisotropy=anisotropy;
 const material=new THREE.MeshStandardMaterial({map,roughness:.88,bumpMap:map,bumpScale:.0012});
 for(const wall of bathroomTileWalls)for(const p of tileRectangles(wall)){
  const coordinates=[[p.left,p.bottom],[p.right,p.bottom],[p.right,p.top],[p.left,p.top]];
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates.flatMap(([u,y])=>[wall.origin[0]+wall.along[0]*u,y,wall.origin[1]+wall.along[1]*u]),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(coordinates.flat(),2));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='bath1-tiles-'+wall.id;mesh.receiveShadow=true;group.add(mesh);
 }
 // A slender finished edge at the top, without the installation clips in photos.
 const edge=new THREE.MeshStandardMaterial({color:bathroomTileFinish.color,roughness:.88});
 for(const wall of bathroomTileWalls){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(wall.length,.004,t),edge);mesh.name='tile-top-edge';
  mesh.position.set(wall.origin[0]+wall.along[0]*wall.length/2+wall.along[1]*t/2,bathroomTileFinish.top,wall.origin[1]+wall.along[1]*wall.length/2-wall.along[0]*t/2);
  mesh.rotation.y=-Math.atan2(wall.along[1],wall.along[0]);group.add(mesh);
 }
 return group;
}
