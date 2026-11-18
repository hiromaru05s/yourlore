/** Normal summon timing measured at 10 fps, then checked against the 29/30 fps sources.
 * SV: j9drRwDyuBk 111.30–114.50; HS: 8RN9ui-wPXI 175.80–179.00.
 * The shader stays in card-width coordinates; no screen-space decorative overlays. */
export const arrivalVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const arrivalFragment=`
precision highp float;
uniform float clock;uniform float variant;uniform vec2 origin;uniform vec4 heldBounds;uniform vec2 extent;uniform vec2 anchor;uniform vec3 orb;varying vec2 vUv;
float sat(float x){return clamp(x,0.,1.);}
float E(float a,float b,float t){return smoothstep(a,b,t);}
float H(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float N(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(H(i),H(i+vec2(1,0)),f.x),mix(H(i+vec2(0,1)),H(i+1.),f.x),f.y);}
float F(vec2 p){return N(p)*.55+N(p*2.03+1.7)*.27+N(p*4.11-3.1)*.13+N(p*8.13)*.05;}
float gauss(float d,float w){return exp(-d*d/max(.00001,w*w));}
void main(){
 // Coordinates remain relative to the final print, including the central reveal and flight.
 vec2 p=(vUv-.5)*extent+anchor;float t=clock;
 vec3 energy=vec3(0.);float density=0.;
 if(variant>.5){
  // The card-shaped light and its rectangular frame are separate from the final card.
  vec2 h=p-origin;
  float frameScale=mix(1.,1.43,E(1.04,1.20,t));
  vec2 distance=abs(h)-heldBounds.zw*.5*frameScale;
  float sd=max(distance.x,distance.y);
  float frameLife=E(1.00,1.035,t)*(1.-E(1.16,1.23,t));
  float line=gauss(sd,.013)*frameLife,wide=gauss(sd,.055)*frameLife;
  energy+=vec3(.92,1.,.69)*(line*1.6+wide*.36);density+=line+wide*.30;
  // A bright central expansion condenses before travelling the full arc to the board.
  vec2 q=p-orb.xy;float r=length(q),angle=atan(q.y,q.x);
  float cloud=F(q*6.5+vec2(t*.8,-t*1.3));
  float radius=orb.z;
  float life=E(1.22,1.30,t)*(1.-E(1.94,1.97,t));
  float edge=r-radius-(cloud-.5)*.09;
  float core=(1.-E(-.10,.045,edge))*life;
  float scatter=exp(-r*r/max(.02,radius*radius*3.5))*life;
  float rays=pow(abs(sin(angle*13.+F(q*3.)*2.)),22.)*gauss(r-radius*.9,.20)*life*.23;
  energy+=vec3(.60,.87,.91)*(scatter*.48+rays)+vec3(1.)*core*1.8;
  density+=core+scatter*.44+rays*.5;
  // Impact and one rapidly contracting circle expose the full-colour monster beneath.
  float impact=gauss(t-1.955,.031)*exp(-dot(p,p)/.60);
  energy+=vec3(.88,1.,.86)*impact*2.;density+=impact;
  float ringLife=E(1.98,2.015,t)*(1.-E(2.20,2.26,t));
  float collapse=1.-pow(1.-sat((t-2.01)/.23),2.);
  float ringRadius=mix(1.34,.025,collapse);
  float rd=length(p*vec2(1.,1.04))-ringRadius;
  float ring=gauss(rd,.075)*ringLife,halo=gauss(rd,.22)*ringLife;
  energy+=vec3(.92,1.,.90)*ring*1.9+vec3(.45,.77,.66)*halo*.30;
  density+=ring+halo*.30;
 }else{
  // Blue surface conversion, followed by white/ochre vapour above the grounded card.
  vec2 boxDistance=abs(p-heldBounds.xy)-heldBounds.zw*.5;
  float sd=length(max(boxDistance,0.))+min(max(boxDistance.x,boxDistance.y),0.);
  float charged=E(.10,.24,t)*(1.-E(1.08,1.22,t));
  float edge=gauss(sd,.018),aura=gauss(sd,.080);
  energy+=vec3(.04,.32,1.0)*(edge*1.6+aura*.50)*charged;
  density+=(edge*.9+aura*.4)*charged;
  float a=t-1.11,age=sat(a/1.38),life=E(0.,.10,a)*(1.-E(.72,1.38,a));
  vec2 q=p; q.y+=.30;
  float ellipse=length(q/vec2(.52,.72));float angle=atan(q.y,q.x);
  float noise=F(vec2(angle*1.7,ellipse*5.-t*3.1));
  float shell=gauss(ellipse-1.-age*.28-(noise-.5)*.22,.15+age*.16);
  float breaks=E(.20,.68,noise+.17*sin(angle*7.+t*9.));
  float vapor=shell*breaks*life;
  vec3 tint=mix(vec3(.12,.67,1.),vec3(1.,.89,.58),(1.-E(-.8,.1,q.y)));
  energy+=tint*vapor*1.8;density+=vapor;
  float pulse=gauss(t-1.13,.065)*exp(-dot(p,p)/.58);
  energy+=vec3(.63,.84,1.)*pulse;density+=pulse*.7;
  // Debris comes from the print's edge, accelerates away, then falls and fragments.
  for(int j=0;j<30;j++){
   float id=float(j),seed=H(vec2(id,7.));float born=1.21+seed*.18,pt=t-born;
   if(pt>0. && pt<.80){float ang=id*2.39996,vel=.24+H(vec2(id,2.))*.68;
    vec2 pos=vec2(cos(ang)*.48,sin(ang)*.66)+vec2(cos(ang)*vel*pt,sin(ang)*vel*pt+pt*pt*.65-.22);
    vec2 d=p-pos;float size=(.008+seed*.015)*(1.-pt/.8);
    float speck=exp(-dot(d,d)/max(.00001,size*size))*pow(1.-pt/.8,1.5);
    energy+=mix(vec3(.23,.65,1.),vec3(1.,.91,.69),seed)*speck*1.7;density+=speck;
   }
  }
 }
 float alpha=sat(density);if(alpha<.002)discard;
 // Energy is premultiplied here explicitly; brighter layers retain a fine white core.
 vec3 color=energy/max(.04,density);color=pow(max(color,vec3(0.)),vec3(.4545));
 gl_FragColor=vec4(color,alpha);
}`;
