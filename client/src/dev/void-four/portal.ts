// Black ink, folded laminae and narrow silver ridges follow riftInkMaterial's
// material hierarchy. This is an emergence aperture, not the board Rift zone.
export const portalFragment=`
precision highp float;
varying vec2 vUv;
uniform float time,variant,opening,closing,frontPass,release;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<3;i++){v+=noise(p)*a;p=mat2(.8,.6,-.6,.8)*p*2.03+7.1;a*=.5;}return v;}
void main(){
 vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x),t=time;
 float wave=.028*sin(a*3.+t*2.1)+.016*sin(a*7.-t*3.);
 if(variant>2.5)wave+=.07*cos(a*4.+.4)*release;
 float radial=r/(.76+wave),n=fbm(p*7.+vec2(t*.14,-t*.21));
 float core=1.-smoothstep(.72,.76,radial);
 vec3 col=vec3(.0008,.0002,.002)+vec3(.004,.001,.009)*n;
 float alpha=core;
 // Asymmetric folded liquid sheets: broad dark body, violet mids, narrow grazing light.
 for(int j=0;j<5;j++){
  float k=float(j),angle=a+k*1.256-r*4.8+t*(variant==2.?-2.4:1.9);
  float radius=.62+k*.065+.115*sin(angle+k*.8)+.025*sin(angle*3.-t*.6);
  float width=.045+k*.008;
  float d=(radial-radius)/width;
  float gate=smoothstep(.07,.7,.5+.5*sin(angle*2.+k));
  float body=exp(-d*d*1.3)*gate;
  float edge=exp(-pow((d-.57)*10.,2.))*gate;
  float micro=noise(vec2(angle*21.+k,radial*165.-t*.6));
  float thread=pow(.5+.5*sin(radial*610.+angle*7.+micro*6.),13.);
  float grazing=pow(.5+.5*sin(angle+k*.7),6.);
  vec3 surface=mix(vec3(.009,.002,.02),vec3(.105,.036,.19),clamp(d*.3+.4,0.,1.));
  surface+=vec3(.52,.34,.72)*(thread*.12+micro*.06)+vec3(.86,.73,1.)*(edge*.40+grazing*body*.20);
  float opacity=body*(.62+.28*micro);
  col=mix(col,surface,opacity);alpha=max(alpha,opacity);
 }
 float lip=exp(-pow((radial-.75)*100.,2.));
 col+=vec3(.54,.31,.75)*lip*(.06+.32*pow(.5+.5*sin(a-t*3.),4.));
 alpha=max(alpha,lip*.65);
 // Distorted light is subordinate to the opaque throat, not an additive neon ring.
 float halo=exp(-pow((radial-.89)*9.,2.))*.065;
 if(alpha<halo){col=vec3(.13,.045,.23);alpha=halo;}
 if(frontPass>.5){
  float sector=variant<.5?(1.-smoothstep(-.4,.2,p.y)):variant<1.5?(1.-smoothstep(-.3,.3,p.x)):variant<2.5?smoothstep(.1,.7,sin(a+t*2.)):1.;
  float ring=smoothstep(.70,.79,radial)*(1.-smoothstep(1.,1.2,radial));
  alpha*=ring*sector*(1.-release);
 }
 alpha*=smoothstep(0.,.06,opening)*(1.-closing);
 if(alpha<.004)discard;
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
}`;
