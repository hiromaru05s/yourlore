import * as T from 'three';
/** Adopted 02 deep mist: broad, continuous layers flow into a dark recess.
 * Same aperture, depth occlusion and 30 Hz board pass; no textures or particles. */
export const RIFT_MIST_FRAGMENT = `
precision highp float;
varying vec2 v;
uniform float time;
float mistHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float mistNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mistHash(i),mistHash(i+vec2(1.,0.)),f.x),mix(mistHash(i+vec2(0.,1.)),mistHash(i+1.),f.x),f.y);
}
float mistFbm(vec2 p){
 return .57*mistNoise(p)+.28*mistNoise(p*2.03+7.2)+.15*mistNoise(p*4.11+2.4);
}
void main(){
 vec2 p=(v-.5)*vec2(1.2,2.8);
 float t=time;
 // Larger waves bend both layers around the same moving dark channel.
 float bend=.16*sin(p.y*2.1-t*.72)+.055*sin(p.y*4.4+t*.47);
 float seam=p.x+bend;
 vec2 flow=vec2(seam*3.4,p.y*2.2);
 vec2 warp=vec2(mistFbm(flow+vec2(t*.16,-t*.28)),mistFbm(flow+vec2(5.2-t*.14,1.3+t*.22)))-.5;
 // Near curtains travel upward; the slower back layer shears in opposition.
 float near=mistFbm(flow+warp*2.6+vec2(.65*sin(p.y*2.3-t*.6),-t*.82));
 float far=mistFbm(flow*1.48-warp*1.7+vec2(-3.8,t*.39));
 float roll=.5+.5*sin(p.y*3.4-t*1.08+near*4.2+seam*3.);
 float mist=smoothstep(.25,.76,near)*(.62+.18*roll)+smoothstep(.30,.78,far)*.26;
 float width=.13+.035*sin(p.y*2.4-t*.56);
 float depth=exp(-pow(seam/width,2.));
 vec3 col=mix(vec3(.019,.018,.032),vec3(.235,.205,.285),clamp(mist,0.,1.));
 // Dark violet crests retain volume while keeping attention on the board.
 float crest=pow(smoothstep(.47,.78,near),2.)*(.35+.65*roll);
 col+=vec3(.04,.04,.055)*crest;
 col*=1.-depth*.86;
 float rim=smoothstep(0.,.13,v.x)*smoothstep(0.,.13,1.-v.x)*smoothstep(0.,.09,v.y)*smoothstep(0.,.09,1.-v.y);
 col*=.56+.44*rim;
 gl_FragColor=vec4(pow(col,vec3(2.2)),1.);
 #include <colorspace_fragment>
}`;
export function createRiftIdleMaterial(){
 return new T.ShaderMaterial({name:'Rift idle 02 deep mist',side:T.DoubleSide,toneMapped:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:RIFT_MIST_FRAGMENT});
}
