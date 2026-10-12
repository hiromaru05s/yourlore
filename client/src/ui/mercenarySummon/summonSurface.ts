import * as T from 'three';
/** The public card is the material. No replacement illustration or prop texture. */
export function summonSurface(){
 const uniforms={phase:{value:0},mode:{value:0},rank:{value:2},strength:{value:0}};
 const mat=new T.MeshPhysicalMaterial({transparent:true,alphaTest:.06,side:T.DoubleSide,roughness:.55,metalness:0,clearcoat:.03,envMapIntensity:.42});
 mat.onBeforeCompile=s=>{
  Object.assign(s.uniforms,uniforms);
  s.fragmentShader=`uniform float phase,mode,rank,strength;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise21(p)*.55+noise21(p*2.02+9.)*.28+noise21(p*4.13-7.)*.17;}
float voronoi(vec2 p){vec2 ip=floor(p),fp=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 q=g+vec2(hash21(ip+g),hash21(ip+g+73.))-fp;float d=dot(q,q);if(d<a){b=a;a=d;}else if(d<b)b=d;}return sqrt(b)-sqrt(a);}
float field(vec2 q){
 if(mode<.5)return q.x*.72+q.y*.42+.48;
 if(mode<1.5){float d=2.;for(int i=0;i<7;i++){float z=float(i);vec2 c=vec2(hash21(vec2(z,4.))-.5,(hash21(vec2(z,9.))-.5)*1.5);d=min(d,length((q-c)*vec2(1.,.8))+.10*hash21(c));}return d*2.+.065*fbm(q*18.);}
 if(mode<2.5)return q.y+.5+sin(q.x*6.)*.12;
 if(mode<3.5)return q.y+.5+.17*sin(q.x*6.+fbm(q*7.)*3.);
 if(mode<4.5)return max(abs(q.x)*1.8,abs(q.y)*1.18)+.12*fbm(q*18.);
 return abs(q.x*.65-q.y*.44)*1.8;
}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 q=(vMapUv-.5)*vec2(1.24,1.74);
 float f=field(q),p=mix(-.20,1.55,smoothstep(.22,.92,phase));
 float substrate=(1.-smoothstep(p-.07,p+.035,f))*strength;
 // Develop the real face into a material, then resolve it from the same front.
 substrate=strength-substrate;
 float border=exp(-abs(f-p)*95.)*strength;
 float n=fbm(q*38.);
 float grain=noise21(q*vec2(580.,180.));
 float cracks=mode>3.5&&mode<4.5?voronoi(q*vec2(9.,12.)):1.;
 vec3 original=diffuseColor.rgb;
 float lum=dot(original,vec3(.2126,.7152,.0722));
 float crease=0.; vec3 matter=vec3(.17,.20,.23); float metallic=.84;
 if(mode<.5){matter=vec3(.075,.10,.13)*(.35+lum*1.6+n*.04);crease=sin(q.y*240.)*.002;}
 else if(mode<1.5){matter=vec3(.018,.014,.012)*(.7+n*.7)+original*.18;metallic=0.;crease=fbm(q*24.)*.035;}
 else if(mode<2.5){float weave=sin(q.x*650.)*sin(q.y*720.);matter=original*.34+vec3(.012,.026,.039)*(1.+weave*.25);metallic=.02;crease=weave*.002;}
 else if(mode<3.5){matter=vec3(.24,.27,.28)*(.7+lum*.6);metallic=.96;crease=sin(q.y*22.+sin(q.x*9.)*2.-phase*13.)*.095;}
 else if(mode<4.5){matter=vec3(.052,.047,.042)*(.55+lum*.6+n*.55);metallic=.15;crease=smoothstep(.015,.09,cracks)*.035;matter*=.45+.55*smoothstep(.007,.055,cracks);}
 else {matter=vec3(.17,.080,.021)*(.28+lum*1.4+n*.06);metallic=.80;crease=sin(q.y*260.)*.001;}
 diffuseColor.rgb=mix(original,matter,substrate);
 float ornament=length(vec2(dFdx(lum),dFdy(lum)))*25.;
 float trace=clamp(ornament,0.,1.);
 float hot=border*(mode<1.5&&mode>.5?1.5:.65);
 vec3 edgeColor=mode<.5?vec3(.70,.83,1.):mode<1.5?vec3(1.,.33,.055):mode<2.5?vec3(.45,.64,.77):mode<3.5?vec3(.82,.87,.9):vec3(1.,.65,.24);
 float relief=(lum*.045+crease+n*.003)*substrate;
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=mix(.65,mode>.5&&mode<2.5?.94:mode>2.5&&mode<3.5?.24:mode>3.5&&mode<4.5?.89:.43,substrate);`);
  s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
 metalnessFactor=substrate*metallic;`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 normal=normalize(normal+vec3(-dFdx(relief)*2.3,-dFdy(relief)*2.3,0.));`);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 totalEmissiveRadiance+=edgeColor*(hot+trace*substrate*.075);`);
  // Once the material resolves, the captured card has exact original color.
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`if(mode>.5&&mode<1.5)outgoingLight=mix(outgoingLight,matter*.65,substrate*.88)+edgeColor*hot;
 if(mode>3.5&&mode<4.5)outgoingLight=mix(outgoingLight,matter*.8,substrate*.6)+edgeColor*hot;

 #include <opaque_fragment>`);
  s.fragmentShader=s.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
 gl_FragColor.rgb=mix(original,gl_FragColor.rgb,clamp(substrate+border*.6,0.,1.));`);
 };
 return{mat,uniforms};
}
