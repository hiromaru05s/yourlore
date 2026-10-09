import * as T from 'three';
import {LIVING_THEMES,livingArt} from '../../../shared/livingCosmetics';
export type Variant=0|3;
export const clock={time:0};
const textures:Partial<Record<Variant,T.Texture>>={};
let users=0,pending:Promise<void>|undefined;
function clear(){Object.values(textures).forEach(t=>t.dispose());delete textures[0];delete textures[3];pending=undefined;}
/** One shared asset lease across concurrent boards and the catalog renderer. */
export function retainArt(){
 users++;
 const ready=pending??=Promise.allSettled(LIVING_THEMES.map(async theme=>{
  const t=await new T.TextureLoader().loadAsync(livingArt(theme.id));t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;textures[theme.variant]=t;
 })).then(results=>{if(results.some(r=>r.status==='rejected')){clear();throw new Error('Living cosmetic artwork unavailable');}});
 let released=false;
 return {ready,release(){if(released)return;released=true;users--;void ready.catch(()=>{}).then(()=>{if(users===0)clear();});}};
}
export const COLORS={
 0:{body:'#c8c5b8',metal:'#294765',edge:'#9b8d67'},
 3:{body:'#1d362e',metal:'#263a30',edge:'#928461'}
};
// Artwork, material shading and fine highlights share the same deforming UVs.
const fragment=`varying vec2 vUv;uniform sampler2D art;uniform float time;uniform float mode;uniform float ribbon;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=vUv-.5,uv=vUv;float t=time;float boundary=smoothstep(.0,.12,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));float light=0.;
 if(mode<.5){float fold=sin(p.y*6.-t*1.25);uv.x+=.014*fold*boundary;uv.y+=.006*sin(p.x*8.+t*1.25)*boundary;light=.06*pow(.5+.5*sin(p.x*9.+p.y*5.-t*1.25),16.);}
 else{uv.x+=.009*sin(p.y*9.-t*1.4)*boundary;uv.y+=.004*sin(p.x*9.+t*1.1)*boundary;light=.06*pow(.5+.5*sin(p.y*7.-t*1.4),12.);}
 vec3 base=texture2D(art,uv).rgb;
 float lum=dot(base,vec3(.21,.72,.07));float gilt=smoothstep(.06,.22,base.r-base.b*.82)*smoothstep(.1,.65,lum);
 vec3 sheen=vec3(.72,.53,.27);
 vec3 col=base*(.96+light*.60)+sheen*light*gilt;
 if(ribbon>.5){float weave=(hash(floor(vUv*vec2(560.,960.)))-.5)*.012;col+=weave;}
 gl_FragColor=vec4(col,1.);
 #include <colorspace_fragment>
}`;
export function animatedMaterial(v:Variant,ribbon=false,texture=textures[v]){return new T.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:fragment,uniforms:{art:{value:texture},mode:{value:v},time:{value:clock.time},ribbon:{value:ribbon?1:0}},side:T.DoubleSide,toneMapped:false});}
export function tactile(color:string,metalness=.1,roughness=.65,finish:'porcelain'|'leather'|'metal'='metal'){
 const m=new T.MeshPhysicalMaterial({color,metalness,roughness,side:T.DoubleSide,clearcoat:finish==='porcelain'?.75:.13,clearcoatRoughness:.3});
 const index:Variant=finish==='leather'?3:0;
 const patches={0:[.10,.40],3:[.16,.76]};
 m.onBeforeCompile=s=>{
  s.uniforms.craftSurface={value:textures[index]};
  s.vertexShader='varying vec3 localSurface;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlocalSurface=position;');
  s.fragmentShader='varying vec3 localSurface;uniform sampler2D craftSurface;\n'+s.fragmentShader;
  const materialSample=`vec2 craftUv=vec2(${patches[index][0]},${patches[index][1]})+fract(localSurface.xz*.43+localSurface.y*.27)*.12;vec3 craft=texture2D(craftSurface,craftUv).rgb;float craftHeight=dot(craft,vec3(.25,.5,.25));`;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   ${materialSample}
   float fibre=sin(localSurface.x*710.)*sin(localSurface.z*960.);
   diffuseColor.rgb*=(.85+craftHeight*.8)*(1.+fibre*.012);
  `);
  if(finish!=='metal')s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);vec3 cs=cross(q1,normal),ct=cross(normal,q0);float det=dot(q0,cs);
   vec3 grad=sign(det)*(dFdx(craftHeight)*cs+dFdy(craftHeight)*ct);
   normal=normalize(abs(det)*normal-.012*grad);
  `);
 };
 m.customProgramCacheKey=()=>`r4-${finish}-${index}`;return m;
}
