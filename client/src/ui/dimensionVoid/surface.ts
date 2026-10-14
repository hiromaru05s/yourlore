import * as T from 'three';
/** Approved 01: pale purple, maximum opacity .66, one 760ms inward vortex. */
export const VOID_GRANT_DURATION=760;
export class VoidGrantSurface {
 private renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-1,1,1,-1,0,2);
 private geometry=new T.PlaneGeometry(2,2);
 private material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
precision highp float;
varying vec2 vUv;

uniform float age;
const float duration=760.,enabled=1.,reduced=0.;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.58+noise(p*2.03)*.28+noise(p*4.09)*.14;}
float box(vec2 p){vec2 q=abs(p)-vec2(.456,.471);return length(max(q,0.))+min(max(q.x,q.y),0.)-.029;}
void main(){
 vec2 uv=vUv,p=uv-.5;

 float bounds=1.-smoothstep(-.003,.003,box(p));
 float t=clamp(age/duration,0.,1.);
 float strength=smoothstep(0.,.13,t)*(1.-smoothstep(.57,1.,t))*enabled;
 if(reduced>.5)strength=smoothstep(0.,.025,t)*(1.-smoothstep(.1,.24,t))*enabled;
 float shade=0.,line=0.,clear=1.,rim=0.;
 float r=length(p*vec2(1.,.82)),a=atan(p.y*.82,p.x);
 {
  // A single liquid rotation, entirely within the card silhouette.
  float flow=a*2.1+r*22.-t*8.;
  float n=fbm(vec2(flow*.55,r*8.-t*1.2));
  shade=.14+.62*n+.24*sin(flow+3.*n)*sin(flow+3.*n);
  line=pow(max(0.,sin(flow+4.*n)),18.)*.65;
  float collapse=smoothstep(.56,1.,t);
  clear=1.-smoothstep(.72-collapse*.70,.78-collapse*.70,r+.05*n);
  rim=exp(-abs(r-(.70-collapse*.68))*130.)*collapse;
 }
 if(reduced>.5){shade=.4;line=0.;clear=1.;rim=0.;}
 // Deep violet body, quiet middle tones, a narrow lilac reflection.
 vec3 violet=mix(vec3(.025,.006,.065),vec3(.27,.045,.59),clamp(shade,0.,1.));
 violet+=vec3(.40,.20,.67)*(line*.62+rim*.5);
 float border=exp(-abs(box(p)+.009)*240.);
 violet+=vec3(.25,.095,.43)*border*.7;
 violet=mix(violet,vec3(.48,.29,.68),.28);
 float opacity=.66;
 float coverage=strength*clear*bounds;
 gl_FragColor=vec4(violet,coverage*opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
 constructor(){this.renderer.setSize(256,400,false);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);this.camera.position.z=1;this.scene.add(new T.Mesh(this.geometry,this.material));}
 draw(age:number){this.material.uniforms.age.value=age;this.renderer.render(this.scene,this.camera);return this.renderer.domElement;}
 dispose(){this.geometry.dispose();this.material.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
