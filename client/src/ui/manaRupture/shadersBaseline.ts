export const fullscreenVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const volumeVertex=`varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const volumeFragment=`precision highp float;
varying vec3 vLocal;
uniform vec3 eye;uniform vec3 anchor;uniform float worldScale;uniform mat4 viewProjection;
uniform vec2 resolution;uniform sampler2D opaqueDepth;uniform float time;uniform float charge;uniform float release;uniform float decay;
uniform vec3 jets[6];uniform vec3 directions[6];
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03+4.2)*.28+noise(p*4.11-2.7)*.15;}
vec2 boxRay(vec3 ro,vec3 rd){vec3 a=(-vec3(1.5,1.5,.9)-ro)/rd,b=(vec3(1.5,1.5,1.1)-ro)/rd;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
void main(){
 if(charge<.005||decay>.999){gl_FragColor=vec4(0);return;}
 vec3 rd=normalize(vLocal-eye);vec2 hit=boxRay(eye,rd);float begin=max(0.,hit.x),end=hit.y;if(end<=begin)discard;
 float sceneDepth=texture2D(opaqueDepth,gl_FragCoord.xy/resolution).x;
 float stepSize=(end-begin)/28.;float jitter=hash(vec3(gl_FragCoord.xy,3.))*stepSize;
 vec3 accum=vec3(0);float trans=1.;
 for(int i=0;i<28;i++){
  float d=begin+(float(i)+.5)*stepSize+jitter;vec3 p=eye+rd*d;
  vec4 clip=viewProjection*vec4(anchor+p*worldScale,1.);float depth=clip.z/clip.w*.5+.5;if(depth>sceneDepth+.000005)break;
  float flow=time*.00023;vec3 np=p*6.+vec3(flow,-flow*1.4,flow*.7);float turbulence=fbm(np);
  float coreRadius=.105+release*.38;vec3 q=(p-vec3(0,0,-.05))/vec3(coreRadius,coreRadius*.84,coreRadius*.82);
  float core=exp(-dot(q,q)*1.35)*(.3+turbulence*.95)*smoothstep(.55,.98,charge)*(1.-decay);
  float vapor=0.;float n=fbm(p*12.+vec3(0,-flow*3.,flow));
  for(int j=0;j<6;j++){
   vec3 delta=p-jets[j],dir=directions[j];float travel=dot(delta,dir),length=.10+charge*.56;
   float radius=.012+max(0.,travel)*.055;vec3 radial=delta-dir*travel;
   float tube=exp(-dot(radial,radial)/(radius*radius*(.45+n)));
   vapor+=tube*smoothstep(-.035,.025,travel)*(1.-smoothstep(length*.36,length,travel))*(.35+n*.85)*charge*(1.-release*.85)*(1.-decay);
  }
  float burst=exp(-pow((time-2180.)/115.,2.));
  float dust=exp(-length(p*vec3(1.,1.,1.3))*3.)*max(0.,turbulence-.43)*release*(1.-decay)*.5;
  float density=core*1.5+vapor*1.35+dust;
  float extinction=1.-exp(-density*stepSize*2.7);
  vec3 cold=vec3(.035,.29,.75),hot=vec3(.76,.94,1.);float heat=clamp(core*1.8+vapor*.3+burst*.6,0.,1.);
  vec3 emission=mix(cold,hot,heat)*(core*(5.+burst*12.)+vapor*4.5+dust*.6);
  accum+=trans*emission*stepSize;trans*=1.-extinction;if(trans<.025)break;
 }
 gl_FragColor=vec4(accum,1.-trans);
}`;
export const mergeFragment=`varying vec2 vUv;uniform sampler2D base;uniform sampler2D volume;void main(){vec4 b=texture2D(base,vUv),v=texture2D(volume,vUv);gl_FragColor=vec4(b.rgb*(1.-v.a)+v.rgb,b.a+v.a*(1.-b.a));}`;
export const blurFragment=`varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;uniform float threshold;
vec3 read(vec2 uv){vec3 c=texture2D(image,uv).rgb;return max(vec3(0),c-vec3(threshold));}
void main(){vec3 c=read(vUv)*.227027;c+=read(vUv+direction*1.384615)*.316216;c+=read(vUv-direction*1.384615)*.316216;c+=read(vUv+direction*3.230769)*.07027;c+=read(vUv-direction*3.230769)*.07027;gl_FragColor=vec4(c,1.);}`;
export const outputFragment=`varying vec2 vUv;uniform sampler2D hdr;uniform sampler2D bloom0;uniform sampler2D bloom1;uniform sampler2D bloom2;
vec3 encode(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
void main(){vec4 src=texture2D(hdr,vUv);vec3 glow=texture2D(bloom0,vUv).rgb*.38+texture2D(bloom1,vUv).rgb*.43+texture2D(bloom2,vUv).rgb*.49;float light=max(max(glow.r,glow.g),glow.b);float alpha=clamp(src.a+1.-exp(-light*.85),0.,1.);vec3 color=(src.rgb+glow)/max(alpha,.001);gl_FragColor=vec4(encode(clamp(color,0.,1.)),alpha);}`;
