import * as T from 'three';
export type Cut={open:{value:number};pulse:{value:number};kind:{value:number}};
/** Object-space grain stays attached to each authored plate throughout its motion. */
export function alloy(color:string,kind=0){
 const uniforms:Cut={open:{value:0},pulse:{value:0},kind:{value:kind}};
 const mat=new T.MeshStandardMaterial({color,roughness:kind===1?.72:.43,metalness:kind===1?.15:.66});
 const patch=(shader:any,depth=false)=>{
  shader.uniforms.cut=uniforms.open;shader.uniforms.pulse=uniforms.pulse;shader.uniforms.kind=uniforms.kind;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 localP;').replace('#include <begin_vertex>','#include <begin_vertex>\nlocalP=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 localP;uniform float cut,pulse,kind;
 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
 float g=grain(localP*68.)*.6+grain(localP*179.)*.4;
 float threshold=length(localP.xy*vec2(1.,.64))*.85+g*.13;
 if(cut>0.001&&threshold<cut)discard;`);
  if(!depth)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float macro=grain(localP*vec3(29.,32.,18.));
 float stoneChip=smoothstep(.63,.77,macro);
 float scratch=pow(abs(sin(localP.y*810.+grain(localP*18.)*9.)),60.);
 diffuseColor.rgb*=kind>.5 ? (.94-stoneChip*.30+(g-.5)*.085) : (.90+(g-.5)*.12-scratch*.055);
 float vein=pow(max(0.,1.-abs(sin(localP.y*22.+sin(localP.x*14.)*.8)))*.9,18.);
 totalEmissiveRadiance+=vec3(.03,.54,.7)*pulse*(vein*.42+smoothstep(.045,0.,abs(threshold-cut))*.5);
 roughnessFactor=clamp(roughnessFactor+(g-.5)*.16,.12,1.);`);
 };
 mat.onBeforeCompile=s=>patch(s);mat.customProgramCacheKey=()=>`titan-alloy-${kind}`;
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=s=>patch(s,true);depth.customProgramCacheKey=()=>`titan-depth-${kind}`;
 return {mat,depth,uniforms};
}
