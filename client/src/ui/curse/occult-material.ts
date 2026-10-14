import * as T from 'three';
const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.01);}`;
const vertex=`varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export function skullMaterial(map:T.Texture){return new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,uniforms:{map:{value:map},alpha:{value:0},clock:{value:0},dissolve:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 uv0;uniform sampler2D map;uniform float alpha,clock,dissolve;${noise}void main(){vec2 uv=uv0;uv.x+=sin(uv.y*19.+clock*1.5)*.003;vec4 s=texture2D(map,uv);float n=fbm(uv*12.+vec2(0.,clock*.12));float erosion=smoothstep(dissolve-.08,dissolve+.12,n*.65+uv.y*.35);vec3 tint=s.rgb*vec3(.74,.67,.91);gl_FragColor=vec4(tint,s.a*alpha*erosion);
#include <colorspace_fragment>
}`});}
export function mistMaterial(){return new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,uniforms:{alpha:{value:0},clock:{value:0},seed:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 uv0;uniform float alpha,clock,seed;${noise}void main(){vec2 p=(uv0-.5)*2.;float n=fbm(uv0*5.+vec2(seed,clock*-.36));float r=length(p*vec2(1.,.83));float edge=1.-smoothstep(.37,.95,r+(n-.45)*.38);float flow=fbm(uv0*11.+vec2(clock*.18,clock*-.26)+n*2.);vec3 col=mix(vec3(.018,.006,.029),vec3(.23,.09,.30),smoothstep(.42,.8,flow));float rim=pow(max(0.,1.-abs(r-.65)/.2),3.)*flow;col+=vec3(.12,.05,.17)*rim;gl_FragColor=vec4(col,edge*alpha);}`});}
export function curseMaterial(map:T.Texture,i:number){
 const uniforms={birth:{value:0},clock:{value:0},heat:{value:0},mode:{value:0}};
 const mat=new T.MeshPhysicalMaterial({map,roughness:.62,metalness:.16,clearcoat:.18,envMapIntensity:.20,side:T.DoubleSide,transparent:true,alphaTest:.015,depthWrite:true});
 mat.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nuniform float birth,clock,heat,mode;\n${noise}`).replace('#include <map_fragment>',`#include <map_fragment>
 vec2 p=vMapUv;float n=fbm(p*12.+${i.toFixed(1)});float axis=mode<.5?length((p-.5)*vec2(1.,.8))*.95:mode<1.5?1.-p.y:mode<2.5?1.-abs(p.x-.5)*2.:p.y;
 float edge=axis*.78+n*.22;float reveal=smoothstep(edge-.09,edge+.09,birth*1.3-.12);float seam=exp(-abs(edge-(birth*1.3-.12))*55.);
 diffuseColor.rgb=mix(vec3(.012,.004,.022),diffuseColor.rgb*.58,reveal);diffuseColor.rgb+=vec3(.24,.08,.32)*seam*heat;
 diffuseColor.a*=smoothstep(edge-.20,edge-.02,birth*1.45);
 float border=min(min(p.x,1.-p.x),min(p.y,1.-p.y));diffuseColor.rgb+=vec3(.14,.035,.22)*exp(-border*75.)*heat;
`).replace('#include <opaque_fragment>',`outgoingLight *= vec3(.42,.32,.50);
#include <opaque_fragment>`);};mat.customProgramCacheKey=()=>`curse-skull-${i}`;return {mat,uniforms};
}
