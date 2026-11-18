/** Normal summon timing measured at 10 fps, then checked against the 29/30 fps sources.
 * SV: j9drRwDyuBk 111.30–114.50; HS: 8RN9ui-wPXI 175.80–179.00.
 * The shader stays in card-width coordinates; no screen-space decorative overlays. */
export const arrivalVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const arrivalFragment=`
precision highp float;
uniform float clock;uniform float variant;uniform vec2 origin;uniform vec4 heldBounds;varying vec2 vUv;
float sat(float x){return clamp(x,0.,1.);}
float E(float a,float b,float t){return smoothstep(a,b,t);}
float H(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float N(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(H(i),H(i+vec2(1,0)),f.x),mix(H(i+vec2(0,1)),H(i+1.),f.x),f.y);}
float F(vec2 p){return N(p)*.55+N(p*2.03+1.7)*.27+N(p*4.11-3.1)*.13+N(p*8.13)*.05;}
float gauss(float d,float w){return exp(-d*d/max(.00001,w*w));}
void main(){
 // Plane is 5 card widths across and 7 high, centred on the final print.
 vec2 p=(vUv-.5)*vec2(5.,7.);float t=clock;
 vec3 energy=vec3(0.);float density=0.;
 if(variant>.5){
  // The original luminous mass lifts to the upper right before the landing pulse.
  float travel=E(1.36,1.72,t);vec2 center=mix(origin,vec2(.84,-2.20),travel);
  vec2 q=p-center;float angle=atan(q.y,q.x);float r=length(q);
  float cloud=F(q*5.5+vec2(t*1.8,-t*2.3));
  float radius=mix(.18,.87,E(1.08,1.31,t))*(1.-.87*E(1.42,1.74,t));
  float life=E(1.06,1.20,t)*(1.-E(1.68,1.78,t));
  float edge=r-radius-(cloud-.5)*.18;
  float core=(1.-E(-.12,.07,edge))*life;
  float scatter=exp(-r*r/max(.02,radius*radius*2.6))*life;
  float rays=pow(abs(sin(angle*11.+F(q*3.)*3.)),20.)*gauss(r-radius*.75,.28)*life*.34;
  energy+=vec3(.58,.87,1.)*(scatter*.38+rays)+vec3(1.)*core*2.1;
  density+=core+scatter*.30+rays*.5;
  // One fast expanding rim, not a stationary ring decoration.
  float ringLife=E(1.79,1.84,t)*(1.-E(1.96,2.04,t));
  float ringRadius=mix(.24,1.30,E(1.80,1.98,t));
  float ringNoise=F(p*7.+t*.4)-.5;
  float rd=length(p*vec2(1.,.88))-ringRadius-ringNoise*.028;
  float ring=gauss(rd,.045)*ringLife,ringHalo=gauss(rd,.13)*ringLife;
  energy+=vec3(.8,1.,.92)*ring*1.9+vec3(.34,.69,.64)*ringHalo*.26;
  density+=ring+ringHalo*.30;
  // Rotating sheets of vapour: an opening centre exposes the same forming print.
  float vLife=E(2.20,2.36,t)*(1.-E(2.74,3.00,t));
  vec2 v=p*vec2(1.,1.04);float vr=length(v),va=atan(v.y,v.x);
  float age=sat((t-2.20)/.80),hole=mix(.08,.65,E(2.35,2.95,t));
  float outer=.92-.10*age;
  float swirl=va+vr*6.2-t*12.5;
  vec2 advected=vec2(cos(swirl),sin(swirl))*(vr*5.+.2);
  float smoke=F(advected+vec2(t*.22,-t*.44));
  float ridges=pow(.5+.5*sin(swirl*4.+smoke*5.),1.2);
  float broken=.045*sin(va*5.+t*8.)+.025*sin(va*11.-t*4.);
  float shell=E(hole-.065,hole+.07,vr)*(1.-E(outer-.12+broken,outer+.04+broken,vr));
  float striation=pow(.5+.5*sin(va*2.3+vr*20.-t*13.+smoke*2.),12.);
  striation*=E(.28,.74,.5+.5*sin(va*2.0+vr*4.+t*.7));
  float sheet=shell*(.84+.16*smoke)*(1.-striation*.50);
  // Fine, irregular striations break up the luminous surface at the inner lip.
  float inner=gauss(vr-hole-.03,.025)*( .35+.65*ridges);
  float streak=gauss(vr-outer+.045,.018)*shell*.12;
  float vapor=(sheet+inner*.48+streak)*vLife;
  float halo=gauss(vr-(hole+outer)*.5,max(.09,(outer-hole)*.7))*vLife*.16;
  energy+=vec3(.78,.89,.86)*vapor*(.72+E(.20,.75,smoke)*1.10)+vec3(.38,.62,.61)*halo;
  density+=vapor+halo;
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
