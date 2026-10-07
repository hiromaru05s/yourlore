import * as T from 'three';
/** Approved 03 "shadow veil": near-black overlapping sheets with violet reflections.
 * Draw in the board renderer; no extra WebGL context or CanvasTexture upload. */
export function createRiftIdleMaterial(){return new T.ShaderMaterial({name:'Rift idle 03 shadow veil',side:T.DoubleSide,toneMapped:false,uniforms:{time:{value:0}},vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
precision highp float; varying vec2 v; uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+7.2)+.15*noise(p*4.11);}
void main(){
vec2 p=(v-.5)*vec2(1.3,2.);float t=time;float body=0.;float edge=0.;float deep=0.;
 // Long overlapping black curtains: upper and lower layers shear in opposition.
 float n=fbm(vec2(p.x*5.+sin(p.y*4.-t)*.6,p.y*2.-t*.48));
 float flow=p.x*16.+sin(p.y*6.-t*1.5)*1.2+n*4.;
 float fold=sin(flow);float cross=fbm(vec2(p.x*8.,p.y*4.+t*.5));
 body=smoothstep(-.65,.8,fold)*(.35+.65*cross);
 edge=pow(max(0.,1.-abs(fold-.58)*5.),4.)*(.3+.7*cross);
 deep=(1.-smoothstep(.04,.29,abs(p.x+.07*sin(p.y*4.-t))))*.8;
vec3 col=mix(vec3(.012,.011,.017),vec3(.20,.18,.23),body);
col+=vec3(.29,.265,.33)*edge;col*=1.-deep*.9;
// Display-referred palette, deliberately black rather than luminous purple.
gl_FragColor=vec4(pow(col,vec3(2.2)),1.);
#include <colorspace_fragment>
}`});}
