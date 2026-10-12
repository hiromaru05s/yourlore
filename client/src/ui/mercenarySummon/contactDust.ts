import * as T from 'three';
// Adopted contact density field, rendered in the same context as the card.
const fragment=`precision highp float;
varying vec2 vContactUv;uniform float age,kind,opacity;
float sat(float x){return clamp(x,0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fb(vec2 p){return .57*noise(p)+.28*noise(p*2.03+12.)+.15*noise(p*4.07-7.);}
void main(){
 vec2 p=(vContactUv-.5)*vec2(3.8,-3.8);float t=age; if(t<0.||t>1.8){gl_FragColor=vec4(0.);return;}
 float spread=1.-exp(-t*4.2),fade=1.-smoothstep(.35,1.65,t);float density=0.,rim=0.;
 // A coherent pressure front originates at the rectangular contact perimeter.
 for(int i=0;i<12;i++){
  float fi=float(i),edge=mod(fi,4.),seed=hash(vec2(fi,kind+3.));
  float side=mod(edge,2.)*2.-1.,along=(floor(fi/4.)-1.)*.55;
  vec2 normal=edge<2.?vec2(side,0.):vec2(0.,side);
  vec2 tangent=vec2(-normal.y,normal.x);
  vec2 anchor=edge<2.?vec2(side*.5,along):vec2(along*.62,side*.75);
  float a=max(0.,t-seed*.035),go=1.-exp(-a*(kind==4.?7.:3.8));
  float reach=kind==0.?.25:kind==1.?.29:kind==2.?.21:kind==3.?.32:kind==4.?.42:.24;
  vec2 center=anchor+normal*(.008+reach*go*.38);
  vec2 size=vec2(.075+.08*go,.16+.08*go);
  if(kind==0.)size=vec2(.032+.04*go,.22);
  if(kind==1.)size=vec2(.13,.20)*(.7+go*.5);
  if(kind==2.)size*=.72;
  if(kind==3.){size=vec2(.045,.28);center+=tangent*sin(go*4.+fi)*.04;}
  if(kind==4.)size=vec2(.070,.20);
  if(kind==5.)size=vec2(.09,.14);
  vec2 delta=p-center;vec2 q=vec2(dot(delta,normal),dot(delta,tangent))/size;
  // fb() is in [0,1], so the outer smoothstep edge is at most 1.85.
  // Outside it both density and relief are exactly zero; keep every visible sample.
  float r=length(q);if(r>=1.85)continue;
  float angle=atan(q.y,q.x);
  float curl=angle+a*(kind==1.?3.:1.1)+fi;
  vec2 flow=q*.55+vec2(sin(curl),cos(curl))*.25;
  float n=fb(flow*2.+vec2(fi*7.,-a*.8));
  float silhouette=1.-smoothstep(.62+n*.45,1.45+n*.4,r);
  float erode=smoothstep(.05+a*.23,.28+a*.25,n);
  float hollow=kind==1.?smoothstep(.0,.48+a*.15,length(q-vec2(-side*.55,.14))):1.;
  float d=silhouette*erode*hollow*(.48+n*.35);
  density+=d;rim+=d*(fb(flow*2.+vec2(fi*7.-.16,-a*.8-.20))-n);
 }
 float born=smoothstep(0.,.055,t);float alpha=(1.-exp(-density*.95))*fade*born;
 vec3 dark=kind==5.?vec3(.31,.40,.46):kind==1.?vec3(.29,.30,.34):vec3(.33,.28,.22);
 vec3 light=kind==5.?vec3(.83,.91,.93):kind==1.?vec3(.79,.80,.82):vec3(.86,.80,.68);
 float relief=sat(.65+rim*1.8+fb(p*9.+t)*.10-density*.13);
 vec3 color=mix(dark,light,relief);
 if(kind==3.){color=mix(vec3(.39,.37,.32),vec3(.94,.89,.74),sat(relief+rim*5.));alpha*=.75;}
 if(kind==0.)alpha*=.72;
 gl_FragColor=vec4(color,alpha*.74*opacity);
}`;
export function contactDust(){return new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{age:{value:0},kind:{value:0},opacity:{value:.6}},vertexShader:`varying vec2 vContactUv;void main(){vContactUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:fragment});}
