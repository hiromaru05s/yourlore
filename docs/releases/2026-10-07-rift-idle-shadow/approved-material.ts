import * as T from 'three';
// Preview only. Linear, near-neutral black with narrow violet reflections.
export function makeMaterial(variant=0){return new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms:{time:{value:0},variant:{value:variant}},vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
precision highp float; varying vec2 v; uniform float time; uniform int variant;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+7.2)+.15*noise(p*4.11);}
void main(){
vec2 p=(v-.5)*vec2(1.3,2.);float t=time;float r=length(p);float a=atan(p.y,p.x);float body=0.;float edge=0.;float deep=0.;
if(variant==0){
 // Continuous black liquid: broad, uneven spiral folds advect into the core.
 float angle=a+t*.85+2.8*log(r+.16);vec2 q=vec2(cos(angle),sin(angle))*(2.2+r*2.2);
 float n=fbm(q+vec2(t*.12,-t*.20));
 float fold=sin(angle*3.+n*3.2-r*5.);
 body=smoothstep(-.65,.7,fold)*(.45+.55*n);
 edge=pow(max(0.,1.-abs(fold-.48)*5.),3.)*(.3+.7*n);
 deep=1.-smoothstep(.07,.40,r);
}else if(variant==1){
 // A cohesive membrane pulls inward and releases, with a travelling reflection.
 float breath=sin(t*1.7);vec2 q=p*vec2(1.+.16*breath,1.-.12*breath);
 float n=fbm(q*3.+vec2(.12*sin(t*.9),t*.18));
 float dist=length(q+vec2(.075*sin(t*.8),.08*cos(t*.7)));
 float fold=sin(dist*18.-t*2.2+n*4.5);
 body=(.4+.6*n)*smoothstep(-.6,.85,fold);
 edge=pow(max(0.,1.-abs(fold-.65)*5.),4.)*.6;
 deep=(1.-smoothstep(.11,.5,dist))*(.75+.2*breath);
}else{
 // Long overlapping black curtains: upper and lower layers shear in opposition.
 float n=fbm(vec2(p.x*5.+sin(p.y*4.-t)*.6,p.y*2.-t*.48));
 float flow=p.x*16.+sin(p.y*6.-t*1.5)*1.2+n*4.;
 float fold=sin(flow);float cross=fbm(vec2(p.x*8.,p.y*4.+t*.5));
 body=smoothstep(-.65,.8,fold)*(.35+.65*cross);
 edge=pow(max(0.,1.-abs(fold-.58)*5.),4.)*(.3+.7*cross);
 deep=(1.-smoothstep(.04,.29,abs(p.x+.07*sin(p.y*4.-t))))*.8;
}
vec3 col=mix(vec3(.012,.011,.017),vec3(.20,.18,.23),body);
col+=vec3(.29,.265,.33)*edge;col*=1.-deep*.9;
// Display-referred palette, deliberately black rather than luminous purple.
gl_FragColor=vec4(pow(col,vec3(2.2)),1.);
#include <colorspace_fragment>
}`});}
