import * as T from 'three';
export type Variant=0|1|2;
export const VARIANTS:Variant[]=[0,1,2];
export const clock={time:0};
import {GACHA_THEMES,gachaArt} from '../../../shared/gachaCosmetics';
const textures:Partial<Record<Variant,T.Texture>>={};
let users=0,pending:Promise<void>|undefined;
function clear(){Object.values(textures).forEach(t=>t.dispose());for(const k of VARIANTS)delete textures[k];pending=undefined;}
export function retainArt(){
 users++;
 const ready=pending??=Promise.allSettled(GACHA_THEMES.map(async theme=>{
  const t=await new T.TextureLoader().loadAsync(gachaArt(theme.variant));t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;textures[theme.variant]=t;
 })).then(results=>{if(results.some(r=>r.status==='rejected')){clear();throw new Error('Gacha cosmetic artwork unavailable');}});
 let released=false;
 return {ready,release(){if(released)return;released=true;users--;void ready.catch(()=>{}).then(()=>{if(users===0)clear();});}};
}
export const COLORS=[{body:'#155163',dark:'#0a2934',edge:'#aec8cc'},{body:'#e3d8bb',dark:'#25333b',edge:'#b99755'},{body:'#380d1b',dark:'#1e111c',edge:'#b47d66'}];
// Each illustration and its highlights share the same bounded material coordinates.
const fragment=`varying vec2 vUv;uniform sampler2D art;uniform float time;uniform float mode;
void main(){
 vec2 p=vUv-.5,uv=vUv;float t=time;
 float bound=smoothstep(.02,.15,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));
 float gleam=0.;
 if(mode<.5){float wave=sin(p.y*9.-t*1.15)+.35*sin(p.y*19.+p.x*5.-t*.72);uv.x+=.017*wave*bound;uv.y+=.009*sin(p.x*9.+p.y*4.-t*.8)*bound;gleam=.10*pow(.5+.5*sin(p.y*13.+p.x*6.-t*1.15),22.);}
 else if(mode<1.5){float feather=sin(p.y*7.-t*.95);uv.x+=sign(p.x)*.016*feather*bound;uv.y+=.008*sin(abs(p.x)*7.-p.y*3.-t*.95)*bound;gleam=.065*pow(.5+.5*sin(p.y*8.-abs(p.x)*3.-t*.95),16.);}
 else{float r=length(p*vec2(1.,.8));float a=.027*sin(t*.85-r*8.)*bound;uv=.5+mat2(cos(a),-sin(a),sin(a),cos(a))*p*(1.+.016*sin(t*.85-r*9.)*bound);gleam=.09*pow(.5+.5*sin(r*21.-t*.85),20.);}
 vec3 base=texture2D(art,uv).rgb;float lum=dot(base,vec3(.21,.72,.07));
 vec3 tint=mode<.5?vec3(.5,.82,.9):mode<1.5?vec3(.9,.78,.53):vec3(.85,.43,.36);
 vec3 surface=base*(.97+gleam*.6)+tint*gleam*smoothstep(.12,.62,lum);
 // A rigid, rounded metal binding separates every overlapping card. Its
 // coordinates never follow the animated illustration or its luminance.
 vec2 q=abs((vUv-.5)*vec2(.64,1.))-vec2(.292,.472);
 float inset=.028-length(max(q,0.))-min(max(q.x,q.y),0.);
 vec3 rim=mode<.5?vec3(.62,.82,.86):mode<1.5?vec3(.94,.82,.59):vec3(.87,.61,.46);
 vec3 gasket=vec3(.025,.035,.045);
 float bevel=.76+.24*clamp(vUv.y*.65+(1.-vUv.x)*.35,0.,1.);
 vec3 binding=mix(gasket,rim*bevel,smoothstep(.003,.005,inset));
 binding=mix(binding,gasket,smoothstep(.015,.018,inset));
 float innerLine=smoothstep(.022,.024,inset)*(1.-smoothstep(.025,.027,inset));
 binding=mix(binding,rim*.7,innerLine);
 surface=mix(binding,surface,smoothstep(.029,.032,inset));
 gl_FragColor=vec4(surface,1.);
 #include <colorspace_fragment>
}`;
export function animatedMaterial(v:Variant,texture=textures[v]){return new T.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:fragment,uniforms:{art:{value:texture},mode:{value:v},time:{value:clock.time}},side:T.DoubleSide,toneMapped:false});}
export function tactile(v:Variant,color:string,metal=false){return new T.MeshPhysicalMaterial({color,metalness:metal?.78:v===2?.24:.08,roughness:metal?.27:v===0?.2:v===1?.35:.24,clearcoat:metal?.3:1,clearcoatRoughness:.16,side:T.DoubleSide,iridescence:v===0?.22:0,iridescenceIOR:1.3});}
