import * as T from 'three';
import {rank,type Id} from './catalog';

const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.01)*.15;}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
`;
const vertex = `
uniform float time,variant,power,quiet;varying vec2 uv0;varying float fold;
void main(){
 uv0=uv;vec3 p=position;vec2 q=uv-.5;float r=length(q);float a=atan(q.y,q.x);
 float grow=smoothstep(.3,1.10,time),release=smoothstep(1.48,2.44,time);
 float living=grow*(1.-release);fold=0.;
 if(variant<.5){
  // A ribbon flows upward through itself; its head leads its wet trailing edge.
  float lag=smoothstep(.24+uv.y*.29,1.06+uv.y*.13,time);
  p.xy*=mix(.12,1.,lag);p.x+=sin(uv.y*9.-time*4.)*13.*living;
  p.xy=mat2(cos((1.-grow)*1.1-release*.8),-sin((1.-grow)*1.1-release*.8),sin((1.-grow)*1.1-release*.8),cos((1.-grow)*1.1-release*.8))*p.xy;
  p.xy*=1.-release*.50;p.z+=sin(uv.y*7.-time*3.)*14.*living;
 }else if(variant<1.5){
  // Wings open at the root, with the distal membrane following the bone.
  float spread=smoothstep(.33+abs(q.x)*.35,1.02+abs(q.x)*.3,time);
  float wing=(.14+.86*spread)*(1.-release*.72);
  p.x*=wing;p.y*=.65+.35*grow;
  p.z+=abs(q.x)*100.*sin(spread*2.8)*(1.-release);
  p.y+=sin(abs(q.x)*8.-time*5.)*9.*living;fold=abs(q.x)*living;
 }else if(variant<2.5){
  // Petals rotate about the flower heart; outer layers unfurl later.
  float bloom=smoothstep(.25+r*.8,1.04+r*.8,time);
  float turn=(1.-bloom)*1.35+release*r*2.;
  p.xy=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*p.xy;
  p.xy*=mix(.16,1.,bloom)*(1.+release*.12);
  p.z+=sin(r*8.-time*2.)*15.*living+sin(release*3.14159)*r*65.;fold=r*living;
 }else if(variant<3.5){
  // A heavy mantle travels downward: collar, folds, then the delayed hem.
  float fall=smoothstep(.22+(1.-uv.y)*.5,.90+(1.-uv.y)*.5,time);
  p.x*=.16+.84*fall;p.y*=.40+.60*grow;
  p.x+=sin(uv.y*8.+time*5.)*17.*(1.-uv.y)*living;
  p.z+=sin(uv.x*19.+uv.y*4.-time*4.)*12.*living;
  p.y+=release*85.;p.x*=1.-release*.34;fold=(1.-uv.y)*living;
 }else if(variant<4.5){
  // Facets converge along independent radial directions, then split under pressure.
  float segment=floor((a+3.14159)/1.0472),delay=mod(segment,3.)*.09;
  float join=smoothstep(.3+delay,1.05+delay,time);
  float squeeze=sin(smoothstep(1.1,1.65,time)*3.14159)*.07;
  p.xy*=1.+(1.-join)*.48-squeeze+release*.20;
  p.z+=(1.-join)*25.+sin(release*3.14159)*r*65.;fold=r*living;
 }else{
  // Seven crown tines lift independently, settle, and press into the card as silver.
  float branch=floor(uv.x*7.),delay=abs(branch-3.)*.075;
  float forge=smoothstep(.25+delay,1.00+delay,time);
  p.y-=65.*(1.-forge)*(uv.y+.2);p.x*=.55+.45*grow;
  p.xy*=1.-release*.42;p.z+=sin(forge*3.14159)*20.*(uv.y+.2);fold=uv.y*living;
 }
 p.xy*=power;p.z=max(0.,p.z)*quiet;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const fragment = `
uniform sampler2D art;uniform float time,variant,power,quiet,silver;
varying vec2 uv0;varying float fold;
${noise}
void main(){
 vec2 uv=uv0;vec2 q=uv-.5;float r=length(q),a=atan(q.y,q.x);
 float envelope=smoothstep(.24,.66,time)*(1.-smoothstep(2.35,2.64,time));
 if(envelope<.001)discard;
 // Spatial motion changes texture coordinates, not only the sprite's opacity.
 if(variant<.5) uv+=vec2(sin(uv.y*19.-time*7.),cos(uv.x*13.+time*4.))*.008*envelope;
 else if(variant>2.5&&variant<3.5)uv.x+=sin(uv.y*25.-time*7.)*.009*envelope;
 float n=fbm(uv*20.);float formation=0.,erosion=0.;
 if(variant<.5){formation=uv.y*.62+n*.3;erosion=(1.-uv.y)*.64+n*.27;}
 else if(variant<1.5){formation=abs(q.x)*1.35+n*.24;erosion=(.5-abs(q.x))*1.3+n*.23;}
 else if(variant<2.5){formation=r*1.28+n*.26;erosion=(.66-r)*1.12+n*.30;}
 else if(variant<3.5){formation=(1.-uv.y)*.66+n*.27;erosion=uv.y*.65+n*.30;}
 else if(variant<4.5){formation=(.62-r)*.92+n*.42;erosion=r*.93+n*.44;}
 else{formation=uv.y*.6+abs(q.x)*.2+n*.24;erosion=(1.-uv.y)*.62+n*.30;}
 float arrive=smoothstep(.24,1.12,time)*1.28;
 float leave=smoothstep(1.56,2.59,time)*1.3;
 float mask=smoothstep(formation-.085,formation+.045,arrive)*(1.-smoothstep(erosion-.04,erosion+.065,leave));
 vec4 tex=texture2D(art,uv);if(tex.a*mask<.004)discard;
 float edge=(1.-smoothstep(.0,.055,abs(erosion-leave)))*smoothstep(1.55,1.7,time);
 float sheen=pow(max(0.,1.-abs(uv.x*.62+uv.y*.45-(time-.75)*.85)/.14),3.);
 vec3 glow=mix(vec3(1.,.12,.065),vec3(.8,.88,1.),silver*.75);
 vec3 col=tex.rgb*(1.10-fold*.12)+glow*(edge*.55+sheen*.24)*tex.a;
 gl_FragColor=vec4(col,tex.a*mask*envelope);
 #include <colorspace_fragment>
}`;

export class MaterialR2{
 readonly group=new T.Group();readonly ready:Promise<void>;
 private textures:T.Texture[]=[];private disposed=false;
 private uniforms={art:{value:null as T.Texture|null},time:{value:0},variant:{value:0},power:{value:1},quiet:{value:1},silver:{value:0}};
 private material=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,depthWrite:false});
 private mesh=new T.Mesh(new T.PlaneGeometry(306,344,72,72),this.material);
 constructor(){this.mesh.renderOrder=3;this.group.add(this.mesh);const loader=new T.TextureLoader();this.ready=Promise.all(Array.from({length:6},(_,i)=>loader.loadAsync(`/vfx/vampire-r2/0${i+1}.png`))).then(textures=>{if(this.disposed){textures.forEach(t=>t.dispose());return;}this.textures=textures;textures.forEach(t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;});});}
 draw(id:Id,v:number,ms:number,h:number){const t=ms/1000;this.group.visible=t>.24&&t<2.65&&!!this.textures[v];this.uniforms.art.value=this.textures[v]||null;this.uniforms.time.value=t;this.uniforms.variant.value=v;this.uniforms.power.value=.81+rank(id)*.038;this.uniforms.quiet.value=id==='VAMP_BUTLER'?.66:1;this.uniforms.silver.value=id==='VAMP_BUTLER'?1:v===5?.8:0;this.mesh.position.z=h+5;}
 dispose(){this.disposed=true;this.textures.forEach(t=>t.dispose());this.mesh.geometry.dispose();this.material.dispose();}
}
