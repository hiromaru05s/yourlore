import * as T from 'three';
import {CARD_PADDING} from '../../ui/cardSurface';
import {DURATION,designs,ease,pulse,lift} from './catalog';
import {purpleSigil,runeRibbon} from './purpleSigils';
export type Pass='all'|'ground'|'card';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const sealFragment=`varying vec2 vUv;uniform sampler2D ink;uniform float reveal;uniform float opacity;uniform float heat;uniform float erase;uniform float halfSide;uniform float innerCut;
void main(){vec2 p=vUv-.5;float r=length(p)*2.;if(halfSide!=0.&&p.x*halfSide<0.)discard;vec4 s=texture2D(ink,vUv);float draw=1.-smoothstep(reveal-.09,reveal,r);float eraseMask=smoothstep(erase-.08,erase,r);float front=exp(-abs(r-reveal+.04)*48.);vec3 col=s.rgb*(1.+heat*.45)+vec3(.35,.11,.5)*front;gl_FragColor=vec4(col,s.a*draw*eraseMask*opacity*smoothstep(innerCut,innerCut+.025,r));}`;
function sealMaterial(tex:T.Texture){return new T.ShaderMaterial({vertexShader:vertex,fragmentShader:sealFragment,uniforms:{ink:{value:tex},reveal:{value:0},opacity:{value:1},heat:{value:0},erase:{value:-.2},halfSide:{value:0},innerCut:{value:-.1}},transparent:true,side:T.DoubleSide,depthWrite:false});}
const auraFragment=`varying vec2 vUv;uniform float time;uniform float strength;uniform float closed;
void main(){float u=vUv.x*6.2831853;float y=vUv.y;float wave=sin(u*5.-time*2.+y*7.)*.5+.5;float tongues=pow(wave,3.)*(.35+.65*pow(.5+.5*sin(u*9.+time*.9),2.));float height=.34+tongues*.65;float mask=(1.-smoothstep(height-.19,height,y))*smoothstep(0.,.10,y);float filaments=pow(.5+.5*sin(u*13.-y*9.+time*1.7),14.);float rim=pow(1.-y,7.);vec3 col=mix(vec3(.23,.018,.43),vec3(.61,.17,.92),wave);col=mix(col,vec3(.88,.59,1.),filaments*.55+rim*.5);gl_FragColor=vec4(col,mask*(.22+wave*.28+filaments*.23)*strength*(1.-closed*.25));}`;
const veilFragment=`varying vec2 vUv;uniform float time;uniform float amount;uniform float squeeze;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float spiral=.5+.5*sin(a*4.+r*18.-time*3.);float edge=(1.-smoothstep(.76,1.,r))*smoothstep(.03,.25,r);float tongue=pow(spiral,4.);vec3 col=mix(vec3(.22,.018,.42),vec3(.63,.16,.96),tongue);gl_FragColor=vec4(col,edge*(.16+tongue*.5)*amount*(1.-squeeze*.7));}`;
type Seal=T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;
export class Renderer{
 readonly gpu:T.WebGLRenderer;readonly scene=new T.Scene();readonly root=new T.Group();readonly ground=new T.Group();readonly card=new T.Group();readonly camera=new T.OrthographicCamera(-3.2,3.2,3.2,-3.2,.1,40);
 private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private sigils:T.Texture[]=[];private otherTextures:T.Texture[]=[];private disposed=false;
 private faceMat:T.ShaderMaterial;private shadow:T.Mesh;private baseSeal:Seal;private surfaceSeal:Seal;
 private upper:Seal;private lower:Seal;private gates:Seal[]=[];private orbit:Seal;private finalSeal:Seal;
 private aura:T.Mesh<T.CylinderGeometry,T.ShaderMaterial>;private veil:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;
 private ribbons:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>[]=[];private binders=new T.Group();private bars:T.Mesh[]=[];private edges:T.Mesh[]=[];
 private purple=new T.MeshBasicMaterial({color:0x9a32ef,transparent:true,opacity:1,depthWrite:false});private light=new T.MeshBasicMaterial({color:0xedc4ff,transparent:true,opacity:1,depthWrite:false});
 constructor(){
  this.gpu=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});this.gpu.setPixelRatio(1);this.gpu.setClearColor(0,0);this.gpu.outputColorSpace=T.SRGBColorSpace;
  this.scene.add(this.root);this.root.add(this.ground,this.card);this.sigils=Array.from({length:4},(_,i)=>purpleSigil(i));
  this.faceMat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D face;uniform float energy;uniform vec2 faceUvScale;void main(){vec4 s=texture2D(face,vUv);if(s.a<.001)discard;vec2 p=abs(vUv-.5)*2.*faceUvScale;float edge=pow(max(p.x,p.y),5.);vec3 tint=mix(s.rgb,s.rgb*vec3(.72,.43,.93),energy*.52);tint+=vec3(.28,.015,.5)*edge*energy;gl_FragColor=vec4(tint,s.a);
#include <colorspace_fragment>
}`,uniforms:{face:{value:null},energy:{value:0},faceUvScale:{value:new T.Vector2(1+2*CARD_PADDING,1+4*CARD_PADDING/3)}},side:T.DoubleSide,transparent:true});
  const face=new T.Mesh(new T.PlaneGeometry(2+4*CARD_PADDING,3+4*CARD_PADDING),this.faceMat);face.position.z=.015;this.card.add(face);
  const makeSeal=(size:number,z:number,parent:T.Group)=>{const m=new T.Mesh(new T.PlaneGeometry(size,size),sealMaterial(this.sigils[0]));m.position.z=z;parent.add(m);return m;};
  this.baseSeal=makeSeal(4.35,-.06,this.ground);this.baseSeal.material.uniforms.innerCut.value=.69;this.surfaceSeal=makeSeal(1.92,.035,this.card);this.surfaceSeal.scale.y=1.45;
  this.lower=makeSeal(3.9,.08,this.card);this.lower.material.uniforms.innerCut.value=.69;this.upper=makeSeal(3.9,.08,this.card);this.orbit=makeSeal(3.65,.12,this.card);this.finalSeal=makeSeal(2.28,.05,this.card);
  for(let i=0;i<2;i++){const g=makeSeal(3.9,.13,this.card);g.material.uniforms.halfSide.value=i===0?-1:1;this.gates.push(g);}
  this.aura=new T.Mesh(new T.CylinderGeometry(1.35,1.18,1,96,24,true),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:auraFragment,uniforms:{time:{value:0},strength:{value:0},closed:{value:0}},transparent:true,side:T.DoubleSide,depthWrite:false}));this.aura.rotation.x=Math.PI/2;this.card.add(this.aura);
  this.veil=new T.Mesh(new T.PlaneGeometry(3.45,3.45),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:veilFragment,uniforms:{time:{value:0},amount:{value:0},squeeze:{value:0}},transparent:true,side:T.DoubleSide,depthWrite:false}));this.veil.position.z=.045;this.card.add(this.veil);
  this.card.add(this.binders);const ribbonTex=runeRibbon();this.otherTextures.push(ribbonTex);
  for(let i=0;i<6;i++){const geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(new Float32Array(33*2*3),3));const uv:number[]=[],ix:number[]=[];for(let j=0;j<33;j++){uv.push(j/32,0,j/32,1);if(j<32)ix.push(j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2);}geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex(ix);const material=new T.MeshBasicMaterial({map:ribbonTex,transparent:true,side:T.DoubleSide,depthWrite:false,opacity:.9});const r=new T.Mesh(geom,material);this.ribbons.push(r);this.binders.add(r);}
  for(let i=0;i<6;i++){const bar=new T.Mesh(new T.PlaneGeometry(.085,.72),this.purple);bar.position.z=.17;this.bars.push(bar);this.card.add(bar);const core=new T.Mesh(new T.PlaneGeometry(.018,.68),this.light);core.position.z=.174;this.edges.push(core);this.card.add(core);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;const grad=c.createRadialGradient(128,128,10,128,128,125);grad.addColorStop(0,'rgba(59,8,90,.32)');grad.addColorStop(.55,'rgba(100,20,166,.22)');grad.addColorStop(1,'rgba(100,20,166,0)');c.fillStyle=grad;c.fillRect(0,0,256,256);const tex=new T.CanvasTexture(canvas);this.otherTextures.push(tex);this.shadow=new T.Mesh(new T.PlaneGeometry(4.4,4.6),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));this.shadow.position.z=-.08;this.ground.add(this.shadow);
 }
 private seal(m:Seal,v:number,t:number,hit:number,opacity=1){const u=m.material.uniforms;u.ink.value=this.sigils[v];u.reveal.value=.1+ease(0,650,t)*1.12;u.erase.value=-.2+ease(hit+440,2940,t)*1.5;u.opacity.value=opacity;u.heat.value=pulse(0,450,hit+30,hit+200,t);m.visible=t<DURATION;m.scale.setScalar(1);m.rotation.z=0;}
 draw(c:CanvasRenderingContext2D,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,reduced=false,pass:Pass='all',studio=true,giant=true){
  if(this.disposed)return;let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.textures.set(face,tex);}this.faceMat.uniforms.face.value=tex;
  const t=reduced?DURATION:ms,hit=designs[v].hit,alive=t<DURATION,amp=giant?1:.8,grow=ease(0,740,t),close=ease(hit-320,hit,t),retire=ease(hit+320,2880,t),energy=pulse(-70,350,hit+110,hit+450,t),flow=Math.min(t,hit);
  this.root.rotation.z=studio?-.10:0;this.card.position.z=lift(v,t,reduced)*2;this.faceMat.uniforms.energy.value=energy*.85;
  this.seal(this.baseSeal,v,t,hit,.82);this.baseSeal.scale.setScalar((.35+.65*grow)*(studio?1:.84));
  this.seal(this.surfaceSeal,v,t,hit,.34+.36*close);this.surfaceSeal.scale.set(1,1.45,1);
  for(const m of [this.upper,this.lower,this.orbit,this.finalSeal,...this.gates]){this.seal(m,v,t,hit);m.visible=false;}
  this.aura.visible=this.veil.visible=alive;this.aura.material.uniforms.time.value=flow/1000;this.aura.material.uniforms.strength.value=energy;this.aura.material.uniforms.closed.value=close;
  this.aura.scale.set((.4+.6*grow)*(1-close*.24),(.06+grow*.95)*(1-close*.9)*amp,(.4+.6*grow)*(1-close*.24));this.aura.position.z=.055+this.aura.scale.y*.5;
  this.veil.material.uniforms.time.value=flow/1000;this.veil.material.uniforms.amount.value=energy*.85;this.veil.material.uniforms.squeeze.value=close;this.veil.scale.setScalar((.25+.75*grow)*(1-close*.72));this.veil.rotation.z=0;
  this.binders.visible=alive&&v===1;this.bars.forEach(b=>b.visible=false);this.edges.forEach(b=>b.visible=false);
  if(v===0){ // Parallel spell diagrams press the aura into a single face inscription.
   this.upper.visible=this.lower.visible=alive;const size=(.30+.70*grow)*(1-retire*.48);this.upper.scale.setScalar(size);this.lower.scale.setScalar(size);this.upper.position.z=.06+grow*(1-close)*1.2*amp;this.lower.position.z=.065;
   this.upper.rotation.z=(1-close)*.19;this.lower.rotation.z=-(1-close)*.19;this.lower.material.uniforms.opacity.value=.64;this.upper.material.uniforms.opacity.value=.95;
   this.aura.scale.y=(.05+grow*1.18)*(1-close*.975)*amp;this.aura.position.z=.055+this.aura.scale.y*.5;
  }
  if(v===1){ // Six inscribed bands rise from the circumference, then draw taut over the spell.
   this.orbit.visible=alive;this.orbit.position.z=.07;this.orbit.scale.setScalar(.35+.65*grow);
   this.ribbons.forEach((r,i)=>{const start=ease(140+i*70,820+i*70,t),pull=ease(hit-400+i*25,hit-40+i*8,t),withdraw=ease(hit+330+i*35,2770+i*30,t),angle=i*Math.PI/3;const attr=r.geometry.getAttribute('position');const width=.105*(1-withdraw);for(let j=0;j<33;j++){const u=j/32,rad=1.76*(1-u*start*.86),a=angle+(1-pull)*Math.sin(u*Math.PI)*.21,z=.07+Math.sin(u*Math.PI)*start*(1-pull)*1.35*amp;for(let side=0;side<2;side++){const offset=(side?1:-1)*width;attr.setXYZ(j*2+side,Math.cos(a)*rad-Math.sin(a)*offset,Math.sin(a)*rad+Math.cos(a)*offset,z);}}attr.needsUpdate=true;r.geometry.computeBoundingSphere();r.material.opacity=start*(1-withdraw)*.95;});
   this.aura.scale.x=this.aura.scale.z=(.4+.6*grow)*(1-close*.65);
  }
  if(v===2){ // Two half-diagrams part along the same card surface, then close like a seal.
   this.gates.forEach((g,i)=>{g.visible=alive;g.position.set((i?1:-1)*grow*(1-close)*.38,0,.08+grow*(1-close)*.2*amp);g.scale.setScalar(.35+.65*grow);g.rotation.z=(i?1:-1)*(1-close)*grow*.20;});
   this.aura.scale.x=(.4+.6*grow)*(1-close*.96);this.aura.scale.z=.75+.25*grow;this.veil.scale.x=(.25+.75*grow)*(1-close*.98);
   this.bars[0].visible=this.edges[0].visible=alive;for(const b of [this.bars[0],this.edges[0]]){b.position.set(0,0,.19);b.rotation.z=0;b.scale.set(1,ease(hit-100,hit+30,t)*(1-retire)*3.6,1);}
  }
  if(v===3){ // A rotating surface vortex arrests, gathers inward, and becomes a stamped prohibition.
   this.orbit.visible=this.finalSeal.visible=alive;this.orbit.position.z=.12;this.orbit.rotation.z=(1-ease(0,hit-120,t))*1.15;this.orbit.scale.setScalar((.4+.6*grow)*(1-ease(hit-120,hit+230,t)*.5));this.orbit.material.uniforms.opacity.value=1-ease(hit+100,hit+380,t);
   this.veil.scale.setScalar((.2+.8*grow)*(1-close*.98));this.veil.rotation.z=flow*.0008;this.aura.scale.y=(.04+.9*grow)*(1-close*.98)*amp;
   this.finalSeal.position.z=.075;this.finalSeal.scale.setScalar(.25+.75*ease(hit-240,hit+20,t));this.finalSeal.material.uniforms.opacity.value=ease(hit-240,hit+20,t);this.finalSeal.material.uniforms.reveal.value=ease(hit-240,hit+20,t)*1.2;
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3;for(const b of [this.bars[i],this.edges[i]]){b.visible=alive;b.position.set(Math.cos(a)*.48,Math.sin(a)*.48,.11);b.rotation.z=a-Math.PI/2;b.scale.set(1,ease(hit-130+i*45,hit+30+i*40,t)*(1-retire),1);}}
  }
  this.purple.opacity=this.light.opacity=1-retire;this.shadow.scale.setScalar(.7+.3*grow);(this.shadow.material as T.MeshBasicMaterial).opacity=alive?.4+energy*.6:.3;
  this.card.visible=pass!=='ground';this.ground.visible=pass!=='card';
  if(studio){this.camera.position.set(0,-7.5,8.5);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.25);}else{this.camera.position.set(0,0,10);this.camera.up.set(0,1,0);this.camera.lookAt(0,0,0);}this.camera.updateProjectionMatrix();if(!studio){this.camera.projectionMatrix.elements[9]=.325/3.2;this.camera.projectionMatrix.elements[13]=10*.325/3.2;}
  const sz=Math.max(256,Math.min(950,Math.round(w*3.2*Math.min(devicePixelRatio,1.5))));if(this.gpu.domElement.width!==sz)this.gpu.setSize(sz,sz,false);this.gpu.render(this.scene,this.camera);c.drawImage(this.gpu.domElement,x-w*1.6,y-w*1.6,w*3.2,w*3.2);
 }
 stats(){return{geometries:this.gpu.info.memory.geometries,textures:this.gpu.info.memory.textures,calls:this.gpu.info.render.calls};}
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());[...this.sigils,...this.otherTextures,...this.textures.values()].forEach(t=>t.dispose());this.textures.clear();this.gpu.dispose();this.gpu.forceContextLoss();}
}
