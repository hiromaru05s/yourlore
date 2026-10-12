import * as T from 'three';
export type Finish={mat:T.MeshPhysicalMaterial;depth:T.MeshDepthMaterial;time:{value:number};reveal:{value:number};energy:{value:number}};
/** All four studies preserve R2-03's translucent body, thin rim and real card underneath. */
export function finish(kind:number,color:string):Finish{
 const time={value:0},reveal={value:0},energy={value:0};
 const mat=new T.MeshPhysicalMaterial({color,side:T.DoubleSide,roughness:.17,metalness:.22,clearcoat:.8,clearcoatRoughness:.2,transparent:true,opacity:kind===1?.79:.92,depthWrite:false});
 const patch=(s:any,depth=false)=>{
  s.uniforms.uTime=time;s.uniforms.uReveal=reveal;s.uniforms.uEnergy=energy;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 artUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nartUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec2 artUV;uniform float uTime,uReveal,uEnergy;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 float line(float d,float w){return 1.-smoothstep(w,w+.0018,abs(d));}
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
 vec2 q=artUV;float broad=noise(q*11.);
 float boundary=${kind===0?'(1.-q.y)*.61+abs(q.x-.5)*.30+floor(broad*4.)*.023':kind===1?'abs(q.x-.5)*1.55+abs(q.y-.5)*.13+floor(broad*4.)*.012':kind===2?'length((q-.5)*vec2(1.35,.85))+.035*floor(broad*3.)':'q.y*.70+floor(broad*4.)*.024'};
 if(uReveal>0.&&boundary<uReveal)discard;
 `);
  if(!depth)s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float edge=min(min(q.x,1.-q.x),min(q.y,1.-q.y));
 float border=line(edge-.034,.005)+line(edge-.056,.0015);
 float lozenge=line(abs(q.x-.5)*1.75+abs(q.y-.71)-.065,.004);
 float etch=${kind===0?'border*.5+lozenge':kind===1?'border*.4+line(abs(q.x-.5)-abs(q.y-.5)*.25,.003)*.35':kind===2?'border*.45': 'border*.4+line(abs(q.x-.5)*1.4+abs(q.y-.65)-.11,.003)*.35'};
 diffuseColor.rgb*=.70+noise(floor(q*vec2(6,9)))*.35;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.40,.115),clamp(etch,0.,1.)*.70);
 roughnessFactor=mix(roughnessFactor,.28,etch*.5);
 float hot=(1.-smoothstep(.001,.018,abs(boundary-uReveal)))*step(.001,uReveal);
 float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
 float sweep=pow(max(0.,1.-abs(q.y-fract(uTime*.58))*.9),16.)*uEnergy;
 totalEmissiveRadiance+=vec3(.12,.7,1.)*(rim*.9+uEnergy*.09+hot*1.25+etch*sweep*.18);
 diffuseColor.a*=.67+rim*.33;
 `);
 };
 mat.onBeforeCompile=s=>patch(s);mat.customProgramCacheKey=()=>`titan-crystal-r3-${kind}`;
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});depth.onBeforeCompile=s=>patch(s,true);depth.customProgramCacheKey=()=>`titan-crystal-depth-${kind}`;
 return{mat,depth,time,reveal,energy};
}
