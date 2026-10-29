import * as THREE from './vendor/three.module.js';

// Collection paperbacks: 13 × 18 cm. Spine thicknesses are illustrative.
// Two rows preserve their scale inside the existing 46 cm compartment.
export const berserkBay={x:-.479,width:.460,bottom:.112,top:.576,shelfTop:.344,shelfThickness:.012};
const columns=16,cellWidth=64,cellHeight=512,atlasWidth=1024,atlasHeight=2048;
export const berserkVolumes=[];
for(const [first,count,bottom] of [[1,22,berserkBay.shelfTop],[23,21,berserkBay.bottom]]){
 const widths=Array.from({length:count},(_,i)=>[.0185,.0192,.018,.0201,.0196,.0206,.0188][(first+i-1)%7]);
 const span=widths.reduce((a,b)=>a+b,0)+(count-1)*.0005;
 let cursor=berserkBay.x-span/2;
 for(let i=0;i<count;i++){
  const width=widths[i];berserkVolumes.push({number:first+i,x:cursor+width/2,bottom,width,height:.18,depth:.13,z:.135+(i%3-1)*.0007});cursor+=width+.0005;
 }
}

// A single atlas gives every spine its own number and print, with crisp text
// at close range. Geometry remains usable by the Node-based spatial tests.
function spineAtlas(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=atlasWidth;canvas.height=atlasHeight;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#111516';ctx.fillRect(0,0,atlasWidth,atlasHeight);
 const accents=['#77705d','#66504a','#697278','#72756b','#80684e','#574951'];
 for(const volume of berserkVolumes){
  const n=volume.number,index=n-1,x=index%columns*cellWidth,y=Math.floor(index/columns)*cellHeight;
  ctx.save();ctx.translate(x,y);
  const ground=n<26?'#15191a':['#192323','#202323','#29201e','#20272b'][n%4];
  ctx.fillStyle=ground;ctx.fillRect(0,0,cellWidth,cellHeight);
  const bend=ctx.createLinearGradient(0,0,64,0);bend.addColorStop(0,'#0008');bend.addColorStop(.22,'#ffffff08');bend.addColorStop(.70,'#ffffff06');bend.addColorStop(1,'#0009');ctx.fillStyle=bend;ctx.fillRect(0,0,64,512);
  ctx.fillStyle='#a62032';ctx.fillRect(3,5,58,67);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f6f0e4';ctx.font='bold 39px Arial';ctx.fillText(String(n),32,39,54);
  // Small original monochrome vignettes echo the varied spine illustrations,
  // rather than reproducing panels from the manga or downloading cover art.
  ctx.save();ctx.beginPath();ctx.rect(4,79,56,73);ctx.clip();
  ctx.fillStyle=accents[n%accents.length];ctx.fillRect(4,79,56,73);
  ctx.fillStyle='#d5cbbc';ctx.beginPath();ctx.arc(42,95,15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222324';ctx.beginPath();ctx.moveTo(3,153);ctx.lineTo(16,125);ctx.lineTo(36,119);ctx.lineTo(63,148);ctx.fill();
  ctx.fillStyle='#b2a592';ctx.beginPath();ctx.ellipse(30,115,11,19,(n%3-1)*.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#141819';ctx.beginPath();ctx.moveTo(15,113);for(let i=0;i<7;i++)ctx.lineTo(15+i*5,95+(i%2)*13);ctx.lineTo(45,118);ctx.lineTo(34,107);ctx.lineTo(27,119);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#45433c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,118);ctx.lineTo(28,119);ctx.moveTo(34,118);ctx.lineTo(38,116);ctx.stroke();
  ctx.strokeStyle='#c5c0b1';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(8,154);ctx.lineTo(53,88);ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(32,205);ctx.rotate(-Math.PI/2);ctx.fillStyle='#e2dfd2';ctx.font='bold 15px Arial';ctx.fillText('KENTARO',0,-8);ctx.fillText('MIURA',0,9);ctx.restore();
  ctx.save();ctx.translate(32,349);ctx.rotate(-Math.PI/2);ctx.font='bold italic 35px Georgia';ctx.lineWidth=1.5;ctx.strokeStyle='#e1b7ab';ctx.fillStyle='#a82a35';ctx.strokeText('BERSERK',0,0,192);ctx.fillText('BERSERK',0,0,192);ctx.restore();
  ctx.save();ctx.translate(32,476);ctx.rotate(-Math.PI/2);ctx.font='bold 10px Arial';ctx.fillStyle='#ddd8cb';ctx.fillText('PLANET',0,-5);ctx.fillStyle='#ba4a50';ctx.fillText('MANGA',0,6);ctx.restore();
  // Fine crease lines along the binding and tiny wear at the head and foot.
  ctx.fillStyle='#c6b9a326';ctx.fillRect(3,75,1,425);ctx.fillRect(59,76,1,421);
  for(let i=0;i<18;i++){ctx.fillStyle='#e5d9bf20';ctx.fillRect(4+(i*17+n*7)%55,i%2?505:3,2,1);}
  ctx.restore();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.name='berserk-spines-01-43';texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}

function paperTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,t=(y%3===0?-13:0)+((x*17+y*11)%7)-3;
  data[i]=228+t;data[i+1]=222+t;data[i+2]=207+t;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true;return texture;
}

export function createBerserkCollection(parent,woodMaterial){
 const root=new THREE.Group();root.name='berserk-collection-1-43';parent.add(root);root.userData.volumes=berserkVolumes;
 const shelf=new THREE.Mesh(new THREE.BoxGeometry(berserkBay.width,berserkBay.shelfThickness,.445),woodMaterial);
 shelf.name='manga-middle-shelf';shelf.position.set(berserkBay.x,berserkBay.shelfTop-berserkBay.shelfThickness/2,-.013);root.add(shelf);
 const paper=new THREE.MeshStandardMaterial({color:'#f0e9d8',map:paperTexture(),roughness:1});
 const cover=new THREE.MeshStandardMaterial({color:'#141819',roughness:.72});
 const spineMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',map:spineAtlas(),roughness:.78});
 const unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
 const pages=new THREE.InstancedMesh(unit,paper,43);pages.name='berserk-page-blocks';root.add(pages);
 const covers=new THREE.InstancedMesh(unit,cover,86);covers.name='berserk-paperback-covers';root.add(covers);
 const positions=[],uvs=[],indices=[];
 function setInstance(mesh,index,x,y,z,w,h,d){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
 berserkVolumes.forEach((v,index)=>{
  const cy=v.bottom+v.height/2;
  setInstance(pages,index,v.x,cy,v.z-.0005,v.width-.0014,v.height-.003,.127);
  pages.setColorAt(index,new THREE.Color().setRGB(1-(index%5)*.008,1-(index%4)*.009,1-(index%3)*.014));
  for(const side of [-1,1])setInstance(covers,index*2+(side+1)/2,v.x+side*(v.width/2-.00035),cy,v.z,.0007,v.height,v.depth);
  const col=index%columns,row=Math.floor(index/columns),start=positions.length/3;
  for(let iy=0;iy<2;iy++)for(let ix=0;ix<=4;ix++){
   const t=ix/4;
   positions.push(v.x+(t-.5)*v.width,v.bottom+iy*v.height,v.z+v.depth/2+Math.sin(t*Math.PI)*.0009);
   uvs.push((col*cellWidth+1+t*(cellWidth-2))/atlasWidth,1-(row*cellHeight+1+(1-iy)*(cellHeight-2))/atlasHeight);
  }
  for(let ix=0;ix<4;ix++){const a=start+ix;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const spines=new THREE.Mesh(geometry,spineMaterial);spines.name='berserk-numbered-spines';root.add(spines);
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});root.updateMatrixWorld(true);return root;
}
