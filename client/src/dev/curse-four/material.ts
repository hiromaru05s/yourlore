import * as T from 'three';
export function makeRelief(){const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=150+Math.sin(x*.51+Math.sin(y*.13)*3)*20+Math.sin(x*3.7+y*2.9)*9,k=(y*n+x)*4;data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}const t=new T.DataTexture(data,n,n);t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
export function cardMaterial(face:T.Texture,source:T.Texture,grain:T.Texture,i:number){
 const uniforms={birth:{value:0},clock:{value:0},heat:{value:0},slice:{value:i/5}};
 const mat=new T.MeshPhysicalMaterial({map:face,metalness:.22,roughness:.47,clearcoat:.22,clearcoatRoughness:.25,bumpMap:grain,bumpScale:.008,side:T.DoubleSide,envMapIntensity:.18});
 mat.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms,{origin:{value:source}});s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D origin;uniform float birth,clock,heat,slice;
`).replace('#include <map_fragment>',`#include <map_fragment>
 vec2 p=vMapUv;vec3 old=texture2D(origin,vec2(slice+p.x*.2,p.y)).rgb;
 float wipe=smoothstep(p.y-.18,p.y+.18,birth*1.4-.2);
 diffuseColor.rgb=mix(old,diffuseColor.rgb,wipe);
 float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
 float glyph=pow(1.-abs(sin(p.x*21.+sin(p.y*23.)*2.)),32.)*step(.12,p.x)*step(p.x,.88);
 diffuseColor.rgb+=vec3(.25,.16,.33)*(glyph*.5+exp(-edge*110.)*.8)*heat;
`);};mat.customProgramCacheKey=()=>`curse-face-${i}`;return {mat,uniforms};
}
export function substance(grain:T.Texture){const mat=new T.MeshPhysicalMaterial({color:0x281635,metalness:.12,roughness:.52,specularIntensity:.22,clearcoat:.08,clearcoatRoughness:.17,bumpMap:grain,bumpScale:.013,side:T.DoubleSide,envMapIntensity:.03});mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float thread=pow(1.-abs(sin(vBumpMapUv.x*48.+sin(vBumpMapUv.y*15.)*2.)),36.);
 diffuseColor.rgb+=vec3(.12,.075,.14)*thread;
`);};return mat;}
