import * as T from 'three';
export type Finish={mat:T.MeshPhysicalMaterial;depth:T.MeshDepthMaterial;time:{value:number};reveal:{value:number};energy:{value:number}};
/** A single material owns both the physical surface and the moving reveal boundary. */
export function finish(kind:number,color:string):Finish{
 const time={value:0},reveal={value:0},energy={value:0};
 const mat=new T.MeshPhysicalMaterial({color,side:T.DoubleSide,roughness:kind===0?.65:kind===3?.79:.24,metalness:kind===0?.12:kind===3?0:.82,clearcoat:kind===1?1:kind===2?.8:kind===3?0:.12,clearcoatRoughness:.2});
 if(kind===2){mat.transparent=true;mat.opacity=.92;mat.metalness=.22;mat.roughness=.17;mat.depthWrite=false;}
 const patch=(s:any,depth=false)=>{
  s.uniforms.uTime=time;s.uniforms.uReveal=reveal;s.uniforms.uEnergy=energy;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 artUV;varying vec3 artP;').replace('#include <begin_vertex>','#include <begin_vertex>\nartUV=uv;artP=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec2 artUV;varying vec3 artP;uniform float uTime,uReveal,uEnergy;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 float line(float d,float w){return 1.-smoothstep(w,w+.0018,abs(d));}
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
 vec2 q=artUV;float grit=noise(q*160.);float broad=noise(q*11.);
 float boundary=${kind===0?'length((q-.5)*vec2(1.,.65))*.95+broad*.045':kind===1?'q.y*.78+sin(q.x*8.+q.y*6.)*.085+grit*.012':kind===2?'(1.-q.y)*.61+abs(q.x-.5)*.30+floor(broad*4.)*.023':'q.y*.5+q.x*.3+sin(q.x*13.)*.024'};
 if(uReveal>0.&&boundary<uReveal)discard;
 `);
  if(!depth)s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float edge=min(min(q.x,1.-q.x),min(q.y,1.-q.y));
 float border=line(edge-.034,.007)+line(edge-.056,.002);
 float spine=line(q.x-.5,.004)*smoothstep(.08,.2,q.y)*(1.-smoothstep(.84,.91,q.y));
 float crest=0.;
 for(int j=0;j<3;j++){float y=.43+float(j)*.087;crest+=line(q.y-y-abs(q.x-.5)*.51,.005)*step(abs(q.x-.5),.245-float(j)*.027);}
 float lozenge=line(abs(q.x-.5)*1.75+abs(q.y-.71)-.065,.006);
 float ornaments=clamp(border+spine+crest+lozenge,0.,1.);
 ${kind===3?`float wing=0.;float ax=abs(q.x-.5);for(int k=0;k<4;k++){float yy=.65-float(k)*.054+.40*ax-2.4*ax*ax;wing+=line(q.y-yy,.007)*step(.045,ax)*step(ax,.27-float(k)*.025);}float crestEdge=line(ax*1.1+abs(q.y-.53)*.53-.09,.006);float boss=line(length((q-vec2(.5,.69))*vec2(1.,.68))-.034,.006);ornaments=clamp(border+wing+crestEdge+boss,0.,1.);`:kind===2?'ornaments=border*.5+lozenge;':''}
 ${kind===0?`diffuseColor.rgb*=.75+grit*.08+broad*.16;
 float chisel=line(q.y-.43-abs(q.x-.5)*.51,.024)*step(abs(q.x-.5),.255)+line(q.y-.517-abs(q.x-.5)*.51,.022)*step(abs(q.x-.5),.225)+line(q.x-.5,.018)*step(.13,q.y)*step(q.y,.83);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.037,.08,.10),clamp(chisel,0.,1.)*.87);roughnessFactor+=grit*.1;`:
 kind===1?`float flow=sin(q.x*38.+q.y*14.+sin(q.y*13.-uTime*2.)*2.);diffuseColor.rgb*=.74+flow*.09+grit*.035;roughnessFactor=.2+grit*.075;`:
 kind===2?`diffuseColor.rgb*=.70+noise(floor(q*vec2(6,9)))*.35;`:
 `float weave=sin(q.x*320.)*sin(q.y*500.);diffuseColor.rgb*=.84+weave*.09+grit*.05;roughnessFactor=.74+weave*.08;float stitch=line(fract(q.y*105.)-.5,.13)*line(edge-.046,.003);ornaments=max(ornaments,stitch*.6);`}
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.40,.115),ornaments*.93);
 roughnessFactor=mix(roughnessFactor,.28,ornaments*.75);
 float hot=(1.-smoothstep(.001,.02,abs(boundary-uReveal)))*step(.001,uReveal);
 totalEmissiveRadiance+=vec3(.13,.65,.93)*(hot*2.4+uEnergy*(ornaments*.08));
 ${kind===2?'float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);totalEmissiveRadiance+=vec3(.12,.7,1.)*(rim*.9+uEnergy*.1);diffuseColor.a*=.67+rim*.33;':''}
 `);
 };
 mat.onBeforeCompile=s=>patch(s);mat.customProgramCacheKey=()=>`titan-r2-${kind}`;
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});depth.onBeforeCompile=s=>patch(s,true);depth.customProgramCacheKey=()=>`titan-r2-depth-${kind}`;
 return{mat,depth,time,reveal,energy};
}
