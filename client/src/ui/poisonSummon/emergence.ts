import * as T from 'three';
import type {CardId} from './selection';

// One continuous surface: the material is the card's temporary physical state.
// XZ is the face and +Y is height. Revealed vertices return to the face exactly.
const common=/* glsl */`
uniform float clockMs;
uniform float family;
uniform float direction;
uniform float reduced;
float sat(float x){return clamp(x,0.,1.);}
float ramp(float a,float b,float t){return smoothstep(a,b,t);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return .58*noise(p)+.28*noise(p*2.03)+.14*noise(p*4.17);}
float roundRect(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float cells(vec2 p){vec2 i=floor(p),f=fract(p);float d=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 seed=vec2(hash(i+o),hash(i+o+19.));d=min(d,length(o+seed-f));}return d;}
// Ordering fields describe a visible physical action, not a different particle colour.
float order(vec2 p){
 float n=fbm(p*4.1)-.5;
 if(family<.5){
  if(direction<.5)return length(p*vec2(.87,.7))+.09*n; // pool drawn inward: outer card appears first
  if(direction<1.5)return .5-p.y*.46+.075*sin(p.x*4.)+.065*n; // poured liquid drains toward near edge
  if(direction<2.5)return cells(p*2.2)*1.1+.06*n; // chemical film opens organic holes
  return abs(p.x)*.84+.08*sin(p.y*3.)+.045*n; // two reagents join, seam clears outward
 }
 if(family<1.5){
  if(direction<.5)return .5+p.y*.46+.05*sin(p.x*5.)+.08*n; // a foot wave pulls mucus forward
  if(direction<1.5)return abs(p.x)*.84+.09*sin(p.y*4.)+.05*n; // a lengthwise tear stretches sideways
  if(direction<2.5)return .9-length((p-vec2(.0,.78))*vec2(.55,.5))+.06*n; // contracted trail collects at one tip
  return .48+p.x*.44+.12*sin(p.y*2.8)+.05*n; // a skin rolls to the side
 }
 if(direction<.5)return .5+p.y*.44+.14*sin(p.x*6.+p.y*3.)+.07*n; // a mycelial front unveils the record
 if(direction<1.5)return length(p*vec2(.82,.67))+.075*sin(atan(p.y,p.x)*7.)+.04*n; // cap rind splits from centre
 if(direction<2.5)return .22+cells(p*3.2)*.85+.15*noise(p*1.8); // spore pockets perforate the crust
 return min(length((p-vec2(-.65,-.65))*.62),min(length((p-vec2(.7,.0))*.72),length((p-vec2(-.15,.8))*.72)))+.08*n;
}
float progress(){return mix(-.18,1.55,ramp(760.,2050.,clockMs));}
float cover(vec2 p){
 if(reduced>.5)return 0.;
 float coat=ramp(190.,570.,clockMs);
 float arrival=1.-ramp(order(p)-.055,order(p)+.055,progress());
 return coat*arrival;
}
float lift(vec2 p){
 float c=cover(p),r=length(p*vec2(.83,.65));
 float contact=ramp(570.,740.,clockMs),release=ramp(760.,2000.,clockMs);
 float ridge=exp(-pow((order(p)-progress())/.105,2.));
 float h=0.;
 if(family<.5){
  if(direction<.5)h=(9.+24.*(1.-contact))*pow(max(0.,1.-r*r),2.)+5.*ridge;
  else if(direction<1.5)h=3.+11.*ridge;
  else if(direction<2.5)h=5.+6.*sin(p.x*4.+p.y*3.)*sin(p.x*4.+p.y*3.);
  else h=4.+12.*exp(-pow(p.x/.24,2.))*(1.-release);
 }else if(family<1.5){
  if(direction<.5)h=4.+17.*ridge;
  else if(direction<1.5)h=3.+17.*ridge*(.6+.4*cos(p.y*2.));
  else if(direction<2.5)h=4.+18.*release*pow(max(0.,1.-r*r),2.);
  else h=4.+24.*ridge;
 }else{
  if(direction<.5)h=4.+6.*ridge;
  else if(direction<1.5)h=3.+25.*pow(max(0.,1.-r*r),1.4)*(1.-release)+10.*ridge;
  else if(direction<2.5)h=5.+9.*noise(p*5.);
  else h=4.+15.*ridge;
 }
 return c*h;
}
`;
const vertex=/* glsl */`
${common}
varying vec2 faceCoord;
varying vec3 worldPos;
void main(){
 faceCoord=vec2(position.x/72.,position.z/112.);
 vec3 p=position;p.y=1.+lift(faceCoord);
 vec4 world=modelMatrix*vec4(p,1.);worldPos=world.xyz;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment=/* glsl */`
${common}
uniform sampler2D cardTexture;
varying vec2 faceCoord;
varying vec3 worldPos;
void main(){
 vec2 p=faceCoord;
 vec2 uv=vec2(p.x*72./178.56+.5,.5-p.y*112./258.56);
 vec4 paper=texture2D(cardTexture,uv);
 // The temporary material keeps its own rounded, uneven edge around the captured card.
 float wav=fbm(p*6.)-.5;
 float boundary=roundRect(p,vec2(1.04,1.03),.25)+.045*wav;
 float silhouette=1.-smoothstep(-.018,.008,boundary);
 float c=cover(p)*max(silhouette,paper.a);
 float reveal=ramp(760.,2050.,clockMs);
 float rim=exp(-pow((order(p)-progress())/.036,2.))*ramp(650.,790.,clockMs)*(1.-ramp(1880.,2180.,clockMs))*silhouette;
 float n=fbm(p*vec2(3.8,5.2)+vec2(clockMs*.00013,-clockMs*.00018));
 float fine=noise(p*44.);
 vec3 dark,mid,light;
 if(family<.5){dark=vec3(.028,.065,.014);mid=vec3(.22,.39,.035);light=vec3(.78,.92,.24);}
 else if(family<1.5){dark=vec3(.023,.068,.047);mid=vec3(.20,.40,.24);light=vec3(.66,.85,.48);}
 else{dark=vec3(.105,.048,.025);mid=vec3(.43,.20,.074);light=vec3(.79,.60,.29);}
 vec3 material=mix(dark,mid,smoothstep(.18,.78,n));
 vec3 normal=normalize(cross(dFdx(worldPos),dFdy(worldPos)));normal*=sign(normal.y);
 float lit=.45+.55*max(0.,dot(normal,normalize(vec3(-.6,1.,.4))));
 material*=lit;
 if(family<1.5){
  float spec=pow(max(0.,dot(normal,normalize(vec3(-.15,1.,.27)))),24.);
  material+=light*spec*.16;
  material+=light*smoothstep(.67,.74,n)*.12;
  // Small fluid veins and bubbles are subordinate to the wide material body.
  float vein=1.-smoothstep(.008,.024,abs(noise(p*15.)-.52));
  material+=mid*vein*.08;
 }else{
  float cracks=1.-smoothstep(.012,.04,abs(noise(p*14.)-.5));
  float fibre=pow(abs(sin(p.x*41.+sin(p.y*12.)*2.8)),14.);
  material*=.72+.34*fine;
  material=mix(material,vec3(.032,.15,.105),cracks*.7);
  material+=vec3(.17,.27,.10)*fibre*.22;
 }
 // Embossed traces of the source image survive inside the material until it becomes paper.
 float detail=dot(paper.rgb,vec3(.2126,.7152,.0722));material+=mid*detail*.12;
 material+=light*rim*.38;
 float wet=exp(-pow((order(p)-progress()+.06)/.06,2.))*reveal*(1.-reveal);
 vec3 cardColor=paper.rgb+light*wet*.22;
 float cardAlpha=paper.a;
 // Outside the captured paper, the excess material breaks up before the handoff.
 float materialAlpha=c;
 float alpha=max(cardAlpha,materialAlpha);
 if(alpha<.015)discard;
 vec3 color=mix(cardColor,material,smoothstep(.01,.32,c));
 if(cardAlpha<.1){alpha=materialAlpha;color=material;}
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 gl_FragColor.rgb=mix(linearToOutputTexel(vec4(cardColor,1.)).rgb,gl_FragColor.rgb,cardAlpha<.1?1.:smoothstep(.01,.32,c));
}`;
export function createEmergence(texture:T.Texture,id:CardId,variant:number){
 const family=id==='POISON_MASTER'?0:id==='RUST_SLUG'?1:2;
 const geometry=new T.PlaneGeometry(196,284,72,104);geometry.rotateX(-Math.PI/2);
 const material=new T.ShaderMaterial({uniforms:{cardTexture:{value:texture},clockMs:{value:0},family:{value:family},direction:{value:variant},reduced:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;
 return{mesh,geometry,material,update(ms:number,reduced:boolean){material.uniforms.clockMs.value=ms;material.uniforms.reduced.value=reduced?1:0;}};
}
