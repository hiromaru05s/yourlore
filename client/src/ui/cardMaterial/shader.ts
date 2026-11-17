export const fragmentShader = `
precision highp float;
varying vec2 uv;
uniform float time;
uniform float activation;
uniform float still;
uniform float aspect;
uniform sampler2D artwork;
uniform sampler2D inscriptions;
uniform vec4 artBox;
uniform vec2 direction;
uniform vec4 seals;

float bell(float x){return exp(-x*x);}
float sat(float x){return clamp(x,0.,1.);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  vec3 k=vec3(127.1,311.7,43758.5453);
  vec4 v=fract(sin(dot(i,k.xy)+vec4(0.,k.x,k.y,k.x+k.y))*k.z);
  return mix(mix(v.x,v.y,f.x),mix(v.z,v.w,f.x),f.y);
}
// Premultiplied layers retain the card's own print and the white board beneath the glass.
vec4 layer(vec3 color,float a){a=sat(a);return vec4(color*a,a);}
vec4 over(vec4 top,vec4 base){return top+base*(1.-top.a);}
vec3 printAt(vec2 p){return texture2D(artwork,clamp((p-artBox.xy)/artBox.zw,0.,1.)).rgb;}
float luma(vec3 c){return dot(c,vec3(.24,.63,.13));}
float box(vec2 p,vec2 halfSize,float r){vec2 q=abs(p)-halfSize+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float beam(vec2 d,float reach){
  return exp(-abs(d.x)/reach-abs(d.y)*220.)+exp(-abs(d.y)*21.-abs(d.x)*250.)*.40;
}

vec4 struckGold(vec2 p,float t){
  float exposure=smoothstep(0.,.17,t)*(1.-smoothstep(.72,1.,t));
  float pass=mix(smoothstep(.08,.76,t),.52,still);
  vec2 metric=vec2(1.,aspect);
  float rim=box((p-.5)*metric,vec2(.465,.467*aspect),.065);
  float inside=1.-smoothstep(-.005,.012,rim);
  vec2 grain=p*vec2(150.,118.);
  float grit=noise(grain);
  vec3 print=printAt(p);
  float relief=(luma(printAt(p+vec2(.009,-.006)))-luma(printAt(p-vec2(.009,-.006))));
  float sweep=p.y-.24*p.x-(1.20-1.65*pass);
  float film=bell((sweep+relief*.035)/.15)*inside;
  float high=pow(sat(.40+relief*2.4+grit*.19),3.);
  vec4 color=layer(mix(vec3(.50,.27,.08),vec3(1.,.89,.62),high),exposure*film*(.20+.66*high));
  float bevel=bell(rim/.022);
  float travel=bell(sweep/.30);
  float metal=sat(.44+.34*sin(rim*176.+sweep*10.)+.32*travel+.12*(grit-.5));
  vec3 alloy=mix(vec3(.14,.086,.051),vec3(1.,.79,.41),metal);
  alloy+=vec3(.66,.76,.79)*bell((rim-.003)/.006)*(.25+travel);
  color=over(layer(alloy,exposure*bevel*(.43+.6*travel)),color);
  // Several reflections follow one curved wave across the varnish. Their normals
  // offset the original print as the wave passes rather than replacing its artwork.
  float fold=sweep+.044*sin(p.x*7.+pass*4.)+.015*sin(p.x*15.-pass*6.);
  float membrane=bell(fold/.056)*inside;
  vec3 bent=printAt(p+vec2(.009,-.021)*membrane);
  float ridge=bell((fold+.012)/.009);
  vec3 varnish=bent*(.72+.29*grit)+vec3(1.,.81,.44)*(.24+ridge*.98);
  color=over(layer(varnish,membrane*exposure*.78),color);
  for(int i=0;i<2;i++){
    float side=i==0?0.:1.;
    vec2 contact=vec2(mix(.038,.962,side),1.2-1.65*pass+.24*side);
    vec2 d=(p-contact)*metric;
    float end=smoothstep(-.03,.15,contact.y)*(1.-smoothstep(.86,1.06,contact.y));
    float glint=bell(length(d)/.031)+.54*bell(length(d)/.102)+.72*beam(d,.12);
    color=over(layer(mix(vec3(1.,.62,.21),vec3(1.,.98,.87),sat(glint)),glint*end*exposure),color);
  }
  return color;
}

float bendAt(float s,float flow){
  return s*(.115+.072*sin(s*6.4-flow*4.5))+.016*sin(s*17.-flow*8.)*sin(3.14159*s);
}

// The tip and the engraved amount share the same refracting material as the stream.
// Distances are in card widths so the facets and the sign keep their proportions on a tilted board.
vec4 crystalTip(vec2 p,vec2 centre,float signY,float row,vec3 tint,vec3 pale,float t){
  float emerge=smoothstep(.01,.15,t);
  float settle=1.-smoothstep(.83,.99,t);
  float scale=mix(.76,1.,emerge)*mix(.75,1.,settle);
  vec2 q=(p-centre)*vec2(1.,aspect*signY)/scale;
  float roof=max((abs(q.x)*1.08-q.y-.246)*.68,q.y-.036);
  float stem=box(q-vec2(0.,.060),vec2(.166,.102),.017);
  float distance=min(roof,stem);
  float cover=(1.-smoothstep(-.003,.006,distance))*emerge*settle;
  vec3 refracted=printAt(p+vec2(q.x*.095,signY*.012));
  float facet=sat(.42+q.x*2.8-q.y*1.2);
  float spec=bell((q.x+.42*q.y+.055*sin(t*5.))/.023);
  float bevel=bell((distance+.022)/.014);
  vec3 glass=mix(refracted*.34,tint*.72,.76)*( .54+.84*facet);
  glass+=pale*(.26*spec+.66*bevel+.16*facet);
  glass=mix(glass,tint*.13,smoothstep(-.013,-.002,distance));
  if(signY>0.){
    // A pearl-like reflection spreads along the bevel as the crystal fills.
    float polish=bell((q.y+.52*q.x+mix(.16,-.18,smoothstep(.15,.72,t)))/.053);
    glass+=pale*(.22*polish+.15*bevel);
  }else{
    // Fine internal cleavage stays near the rim, clear of the engraving.
    float grain=noise(q*vec2(30.,45.));
    float seam=bell((abs(q.x)-.129+.18*q.y+.012*sin(q.y*36.))/.009);
    glass=mix(glass,glass*.61+vec3(.025,.032,.041),.70);
    glass+=pale*(.25*seam+.07*grain*bevel);
  }
  // Lettering stays upright on both tips and uses the amount of change of its seal.
  vec2 label=(p-centre)*vec2(1.,aspect)/scale;
  vec2 st=clamp(label/vec2(.39,.25)+.5,0.,1.);
  vec2 texel=vec2(st.x,(row+st.y)*.5);
  float ink=texture2D(inscriptions,texel).a;
  float lip=texture2D(inscriptions,texel-vec2(.010,.009)).a;
  glass=mix(glass,vec3(.013,.028,.041),lip*.94);
  glass=mix(glass,mix(pale,vec3(1.),.9),ink);
  return layer(glass,cover*.99);
}

vec4 current(vec2 p,vec2 source,float signY,float inward,float t){
  float up=step(0.,signY);
  vec3 tint=inward>0.?vec3(.035,.45,.87):vec3(.87,.15,.083);
  vec3 pale=inward>0.?vec3(.78,.95,1.):vec3(1.,.89,.74);
  float envelope=smoothstep(0.,.14,t)*(1.-smoothstep(.77,1.,t));
  // The descending ribbon hangs briefly before drawing taut at contact.
  float travel=mix(smoothstep(.24,.66,t),smoothstep(.08,.73,t),up);
  travel=mix(travel,.65,still);
  float behind=mix(smoothstep(.45,.97,t),.15,still);
  float head=mix(1.-travel,travel,up),tail=mix(1.-behind,behind,up);
  float height=min(.64,source.y-.19);
  float h=(source.y-p.y)/height;
  float s=clamp(h,0.,1.);
  float flow=mix(1.-t,t,up);
  float curl=mix(.64,1.12,up);
  float bend=curl*bendAt(s,flow);
  float axis=source.x+inward*bend;
  float lateral=p.x-axis;
  float low=min(head,tail),high=max(head,tail);
  float taper=smoothstep(low-.10,low+.12,h)*(1.-smoothstep(high-.10,high+.09,h));
  float width=(.067+.029*sin(s*7.1-flow*4.8)+.009*sin(s*19.+flow*4.))*taper;
  float swell=bell((s-.62*travel)/.25);
  width*=mix(.67-.18*travel,1.03+.32*swell,up);
  float coreX=lateral/max(width,.001);
  float edge=abs(coreX);
  float glass=(1.-smoothstep(.86,1.08,edge))*smoothstep(.001,.014,width);
  float normal=clamp(coreX,-1.,1.);
  float z=sqrt(max(0.,1.-normal*normal));
  float twist=s*10.-flow*6.+.6*sin(19.*s);
  float fresnel=pow(1.-z,1.5);
  float shine=bell((normal-.63*sin(twist))/.17);
  float dark=bell((normal+.44*cos(twist))/.25);
  vec3 refracted=printAt(p+vec2(-normal*.037,(1.-z)*.012));
  vec3 liquid=mix(refracted*.65,tint,.49+.36*z)-.15*dark;
  liquid+=pale*(shine*.88+fresnel*.58);
  vec2 hd=vec2(lateral,(h-head)*height*aspect);
  float ignition=smoothstep(.04,.21,t)*(1.-smoothstep(.68,.92,t));
  float spill=bell(lateral/.115)*taper;
  vec4 color=layer(tint,(spill*.39+bell(length(hd)/.11)*.46*ignition)*envelope);
  color=over(layer(liquid,glass*.93*envelope),color);
  // Thin caustics twist around the same stream, widening only where the fluid swells.
  for(int i=0;i<3;i++){
    float phase=float(i)*2.095;
    float w=sin(twist+phase);
    float thread=bell((lateral-w*width*1.17)/(.0045+.003*z));
    color=over(layer(mix(tint,pale,.62+.28*cos(twist+phase)),thread*taper*envelope*.77),color);
  }
  if(up>.5){
    // Diffuse reflected light opens out from the coloured glass onto the print.
    float sheen=bell((abs(lateral)-width*.8)/.051)*taper*swell;
    color=over(layer(mix(tint,pale,.46),.46*sheen*envelope),color);
  }else{
    // A soft absorption shadow pulls towards the printed seal, under the thin glints.
    float penumbra=bell((lateral+.018*inward)/.10)*taper*envelope;
    color=over(color,layer(mix(tint*.16,vec3(.058,.047,.061),.55),.64*penumbra));
  }
  float hot=bell(length(hd)/.032)+.33*beam(hd,.084);
  color=over(layer(pale,hot*ignition*mix(.54,.93,up)),color);
  vec2 foot=(p-source)*vec2(1.,aspect);
  float contact=mix(bell((t-.68)/.14),bell((t-.24)/.17),up);
  color=over(layer(mix(tint,pale,.4),bell(length(foot)/.125)*contact*.70),color);
  // At touchdown the downward tip touches the top edge of the printed seal;
  // at launch the upward tip already clears the number.
  float tipHeight=mix(.22,.94,head);
  float x=clamp(source.x+inward*curl*bendAt(tipHeight,flow),.19,.81);
  vec2 centre=vec2(x,source.y-tipHeight*height);
  return over(crystalTip(p,centre,signY,inward>0.?0.:1.,tint,pale,t),color);
}

void main(){
  vec2 p=uv*1.24-.12;
  vec4 color=vec4(0.);
  if(activation>.5)color=struckGold(p,time);
  else{
    if(abs(direction.x)>.5)color=current(p,seals.xy,direction.x,1.,time);
    if(abs(direction.y)>.5)color=over(current(p,seals.zw,direction.y,-1.,time),color);
  }
  gl_FragColor=vec4(min(color.rgb,vec3(color.a)),color.a);
}
`;
