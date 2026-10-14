import {ShaderChunk} from './vendor/three.module.js';

// Keep the sun's PCFSoft filter. Static indoor lights use bilinear 2x2 PCF:
// four depth reads instead of sixteen, with a continuous edge between texels.
const indoorShadowGLSL=`
#if defined(USE_SHADOWMAP) && NUM_SPOT_LIGHT_SHADOWS > 0
float getIndoorShadow(sampler2D map, vec2 size, float intensity, float bias, vec4 coord) {
 vec3 p=coord.xyz/coord.w; p.z+=bias;
 if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0) return 1.0;
 vec2 texel=1.0/size;
 vec2 pixel=p.xy*size-0.5;
 vec2 f=fract(pixel), uv=(floor(pixel)+0.5)*texel;
 float a=texture2DCompare(map,uv,p.z);
 float b=texture2DCompare(map,uv+vec2(texel.x,0.0),p.z);
 float c=texture2DCompare(map,uv+vec2(0.0,texel.y),p.z);
 float d=texture2DCompare(map,uv+texel,p.z);
 return mix(1.0,mix(mix(a,b,f.x),mix(c,d,f.x),f.y),intensity);
}
#endif
`;

export function efficientLightingChunk(){
 const original=ShaderChunk.lights_fragment_begin;
 const start=original.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
 const end=original.indexOf('#if ( NUM_DIR_LIGHTS > 0 )',start);
 if(start<0||end<0)throw new Error('Unsupported Three.js spotlight chunk');
 let spot=original.slice(start,end);
 const info='getSpotLightInfo( spotLight, geometryPosition, directLight );';
 const direct='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
 if(!spot.includes(info)||!spot.includes(direct))throw new Error('Unsupported Three.js spotlight evaluation');
 // Three.js removes the loop braces when unrolling: declare the temporary once.
 spot=spot.replace('SpotLight spotLight;','SpotLight spotLight;\n bool litFace;');
 spot=spot.replace(info,info+`
  litFace=dot(geometryNormal,directLight.direction)>0.0;
  #ifdef USE_CLEARCOAT
   litFace=litFace||dot(geometryClearcoatNormal,directLight.direction)>0.0;
  #endif
  if(directLight.visible && litFace) {
 `).replace(direct,direct+'\n  }');
 spot=spot.replace('getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] )',
 'getIndoorShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, vSpotLightCoord[ i ] )');
 return original.slice(0,start)+spot+original.slice(end);
}

export function optimizeLightingMaterials(scene){
 const chunk=efficientLightingChunk(),seen=new Set();
 scene.traverse(object=>{
  const materials=Array.isArray(object.material)?object.material:[object.material];
  for(const material of materials){
   if(!material?.isMeshStandardMaterial||seen.has(material)||material.userData.efficientIndoorLighting)continue;
   seen.add(material);material.userData.efficientIndoorLighting=true;
   const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
   const key=previousKey();
   material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n'+indoorShadowGLSL)
     .replace('#include <lights_fragment_begin>',chunk);
   };
   material.customProgramCacheKey=()=>key+'|indoor-bilinear-pcf-v1';
   material.needsUpdate=true;
  }
 });
 return seen.size;
}
