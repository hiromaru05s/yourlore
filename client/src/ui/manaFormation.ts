import * as T from 'three';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {manaSlotLayout,type FormationInput,type FormationHandle,type FormationPreview} from './manaFormationTypes';
export const FORMATION_MS=2200,FORMATION_IMPACT=1280;
export const FORMATIONS=[
 {id:'condense',name:'凝晶',en:'Condensation',note:'3本の光が種へ流れ込み、中心からサファイアの体積を満たす。'},
 {id:'facets',name:'結面',en:'Facet assembly',note:'光が結晶面に変わり、一枚ずつ組み合わさって実物の水晶になる。'},
 {id:'helix',name:'螺旋',en:'Helical compression',note:'旋回する光の帯が巻き締まり、その螺旋から結晶面が定着する。'},
 {id:'liquid',name:'水核',en:'Liquid crystallization',note:'流れ込む光が透明な雫になり、液面が硬い結晶面へ変わる。'},
 {id:'lattice',name:'晶脈',en:'Lattice growth',note:'光が実物の稜線を走り、細い結晶の骨格から面が成長する。'},
] as const;
export type FormationId=typeof FORMATIONS[number]['id'];
export const isFormation=(value:unknown):value is FormationId=>FORMATIONS.some(v=>v.id===value);
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const noise=(n:number)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const center=new T.Vector3(0,.0106,0),tau=Math.PI*2;
const activeGroups=new Set<T.Group>();
const glslNoise=`float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
/** Progress displaces/reveals the authored triangles; at progress 1 all edits are identity. */
function formationMaterial(source:T.Material,mode:number,gem:boolean){
 const mat=source.clone() as T.MeshPhysicalMaterial;
 const uniforms={form:{value:0},time:{value:0},heat:{value:0}};
 const sourceCompile=source.onBeforeCompile;
 mat.onBeforeCompile=(shader,renderer)=>{
  sourceCompile.call(mat,shader,renderer);
  Object.assign(shader.uniforms,{uForm:uniforms.form,uTime:uniforms.time,uHeat:uniforms.heat});
  if(gem&&mode===3)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nobjectNormal=normalize(mix(normalize(position-vec3(0,.0106,0)),objectNormal,uForm));`);
  const vary=`varying vec3 vFormP; varying vec3 vBary; varying float vSeed; uniform float uForm,uTime,uHeat;`;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute vec3 aCenter;attribute vec3 aBary;attribute float aSeed;\n${vary}`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vFormP=(position-vec3(0,.0106,0))/.016;vBary=aBary;vSeed=aSeed;
    float rest=1.-uForm;
    ${gem&&mode===0?`transformed=vec3(0,.0106,0)+(position-vec3(0,.0106,0))*(.08+.92*smoothstep(0.,.92,uForm));`:''}
    ${gem&&mode===1?`float a=aSeed*6.283+rest*2.; vec3 flight=vec3(cos(a),.3+sin(aSeed*7.)*.45,sin(a))*.055;
      transformed=position+(flight+aCenter*.5)*rest*rest;`:''}
    ${gem&&mode===2?`float a=aSeed*18.85+rest*9.;vec3 ribbon=vec3(cos(a)*.034,(aSeed-.5)*.046+.016,sin(a)*.034);
      transformed=mix(ribbon+(position-aCenter)*.24,position,uForm);`:''}
    ${gem&&mode===3?`vec3 radial=normalize(position-vec3(0,.0106,0));vec3 liquid=vec3(0,.012,0)+radial*vec3(.011,.016,.011);
      liquid+=radial*sin(radial.y*9.+uTime*8.)*.0018*rest;
      transformed=mix(liquid,position,uForm);
      transformed=vec3(0,.0106,0)+(transformed-vec3(0,.0106,0))*(.15+.85*smoothstep(0.,.55,uForm));`:''}
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${vary}\n${glslNoise}`)
   .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    if(uForm<0.00001)discard;
    float micro=noise3(vFormP*8.)*.12+noise3(vFormP*22.)*.035;
    float field=${!gem?'(vFormP.y+.9)*.48':mode===4?'(vFormP.z+1.)*.47+micro':mode===0?'length(vFormP)*.07+micro*.3':mode===1?'vSeed*.65+micro':mode===2?'vSeed*.72+micro':'micro*.5'};
    float edge=uForm*1.55-field;
    if(edge<0.)discard;
   `)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float rim=exp(-abs(edge)*38.)*(1.-smoothstep(.87,1.,uForm));
    float vein=pow(1.-smoothstep(0.,.035,min(vBary.x,min(vBary.y,vBary.z))),2.);
    totalEmissiveRadiance+=vec3(.22,.75,1.8)*(${gem?'rim*5.5+uHeat*(.12+vein*2.6)':'rim*.35'});
   `);
 };
 mat.customProgramCacheKey=()=>`mana-formation-${mode}-${gem}-${source.customProgramCacheKey()}`;
 return {mat,uniforms,gem,attenuation:mat.attenuationDistance};
}
function faceGeometry(source:T.BufferGeometry){
 const geo=source.index?source.toNonIndexed():source.clone(),p=geo.getAttribute('position');
 const centers=new Float32Array(p.count*3),bary=new Float32Array(p.count*3),seed=new Float32Array(p.count);
 for(let i=0;i<p.count;i+=3){const c=new T.Vector3();for(let j=0;j<3;j++)c.add(new T.Vector3().fromBufferAttribute(p,i+j));c.multiplyScalar(1/3);
  for(let j=0;j<3;j++){c.toArray(centers,(i+j)*3);bary[(i+j)*3+j]=1;seed[i+j]=noise(i/3+3);}}
 geo.setAttribute('aCenter',new T.BufferAttribute(centers,3));geo.setAttribute('aBary',new T.BufferAttribute(bary,3));geo.setAttribute('aSeed',new T.BufferAttribute(seed,1));return geo;
}
const ribbonVertex=`attribute float aU;varying vec2 vUv;void main(){vUv=vec2(aU,uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const ribbonFragment=`uniform float uTime,uAlpha;uniform vec3 uTint;varying vec2 vUv;
void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.9);
float striation=.62+.38*sin(vUv.x*95.-uTime*17.+sin(vUv.x*27.-uTime*5.)*2.);
float core=pow(max(0.,1.-abs(vUv.y*2.-1.)),16.);
float a=edge*sin(vUv.x*3.14159)*uAlpha;
gl_FragColor=vec4(uTint*(.6+striation)+vec3(.65,1.,1.4)*core*1.8,a);}`;
function makeRibbon(){
 const n=64,geo=new T.BufferGeometry(),p=new Float32Array((n+1)*6),uv=new Float32Array((n+1)*4),u=new Float32Array((n+1)*2),idx=[];
 for(let i=0;i<=n;i++){uv.set([i/n,0,i/n,1],i*4);u.set([i/n,i/n],i*2);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 geo.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setAttribute('aU',new T.BufferAttribute(u,1));geo.setIndex(idx);
 const mat=new T.ShaderMaterial({vertexShader:ribbonVertex,fragmentShader:ribbonFragment,uniforms:{uTime:{value:0},uAlpha:{value:0},uTint:{value:new T.Color(.08,.65,1.6)}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
 const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;return {mesh,geo,mat,p,n};
}

function makeVolume(){
 const rings=48,sides=8,geo=new T.BufferGeometry(),p=new Float32Array((rings+1)*sides*3),normals=new Float32Array(p.length),idx:number[]=[];
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;idx.push(a,b,a+sides,b,b+sides,a+sides);}
 geo.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geo.setIndex(idx);
 const mat=new T.MeshPhysicalMaterial({color:0x278ed0,roughness:.13,metalness:0,transmission:.72,thickness:.002,ior:1.38,clearcoat:1,clearcoatRoughness:.1,attenuationColor:0x2480c1,attenuationDistance:.027,envMapIntensity:1.2,depthWrite:false});
 const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;return {mesh,geo,mat,p,normals,rings,sides};
}
function streamPoint(s:number,time:number,j:number,mode:number,out:T.Vector3){
 // The heads enter the physical jewel, never an unrelated screen-space centroid.
 const a=j*tau/3-.8;
 const radius=.060*(1-s)**1.35;
 const angle=a+s*(mode===2?8.5:1.65)+time*.36;
 out.set(Math.cos(angle)*radius,.0106+Math.sin(Math.PI*s)*.022+Math.sin(a)*radius*.23,Math.sin(angle)*radius*.68);
 if(mode===3)out.y+=Math.sin(s*10-time*4)*.002*Math.sin(Math.PI*s);
 return out;
}
export function createManaFormation(input:FormationInput,id:FormationId):FormationHandle{
 const mode=FORMATIONS.findIndex(v=>v.id===id),{parent,parts,slot,maximum,ordinal,count}=input,layout=manaSlotLayout(slot,maximum);
 const group=new T.Group();group.name=`Mana formation ${id} slot ${slot}`;group.position.set(.0415+layout.x,layout.y,layout.z);group.scale.setScalar(layout.scale);parent.add(group);
 activeGroups.add(group);group.userData.slot=slot;group.userData.finalPosition=[group.position.x,group.position.y,group.position.z];
 const mats:ReturnType<typeof formationMaterial>[]=[],geos:T.BufferGeometry[]=[],bodies:T.Mesh[]=[];
 let jewelGeo:T.BufferGeometry|undefined;
 for(const part of parts){const source=part.material as T.Material,gem=source instanceof T.MeshPhysicalMaterial&&source.transmission>0;
  const geo=faceGeometry(part.geometry),material=formationMaterial(source,mode,gem),body=new T.Mesh(geo,material.mat);
  if(gem)jewelGeo=geo;body.frustumCulled=false;body.receiveShadow=part.receiveShadow;body.userData.restShadow=part.castShadow;body.name=gem?'forming-authored-crystal':'forming-authored-setting';group.add(body);bodies.push(body);mats.push(material);geos.push(geo);
 }
 const ribbons=Array.from({length:3},makeRibbon);for(const r of ribbons)group.add(r.mesh);
 const volumes=Array.from({length:3},makeVolume);for(const v of volumes)group.add(v.mesh);
 const particleCount=96,positions=new Float32Array(particleCount*3),sizes=new Float32Array(particleCount),alphas=new Float32Array(particleCount),seeds=new Float32Array(particleCount),targets:T.Vector3[]=[];
 const attr=jewelGeo!.getAttribute('position');
 for(let i=0;i<particleCount;i++){const f=Math.floor(noise(i+1)*attr.count/3)*3;const a=new T.Vector3().fromBufferAttribute(attr,f),b=new T.Vector3().fromBufferAttribute(attr,f+1),c=new T.Vector3().fromBufferAttribute(attr,f+2);const u=Math.sqrt(noise(i+81)),v=noise(i+319);targets.push(a.multiplyScalar(1-u).addScaledVector(b,u*(1-v)).addScaledVector(c,u*v));sizes[i]=.35+noise(i+911)*.65;seeds[i]=noise(i+72);}
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));pg.setAttribute('aSize',new T.BufferAttribute(sizes,1));pg.setAttribute('aAlpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));pg.setAttribute('aSeed',new T.BufferAttribute(seeds,1));
 const pm=new T.ShaderMaterial({uniforms:{uPixels:{value:4}},vertexShader:`attribute float aSize,aAlpha,aSeed;uniform float uPixels;varying float vAlpha,vSeed;void main(){vAlpha=aAlpha;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=uPixels*aSize;}`,fragmentShader:`varying float vAlpha,vSeed;void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);float a=exp(-r*5.)*smoothstep(1.,.6,r)*vAlpha;gl_FragColor=vec4(mix(vec3(.10,.50,1.8),vec3(2.,2.5,3.),vSeed),a);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
 const points=new T.Points(pg,pm);points.frustumCulled=false;group.add(points);
 const eg=new T.EdgesGeometry(jewelGeo!,18),em=new T.ShaderMaterial({uniforms:{uGrow:{value:0},uFade:{value:0}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uGrow,uFade;void main(){float d=(vP.z+.018)/.036;if(d>uGrow)discard;float pulse=exp(-abs(uGrow-d)*30.);gl_FragColor=vec4(vec3(.25,.9,2.5)*(1.+pulse*3.),uFade);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
 const edges=new T.LineSegments(eg,em);group.add(edges);edges.visible=mode===4;
 const glowGeo=new T.PlaneGeometry(.075,.075),glowMat=new T.ShaderMaterial({uniforms:{uAlpha:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uAlpha;void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(.08,.45,1.4,exp(-r*r*7.)*smoothstep(1.,.5,r)*uAlpha);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 const glow=new T.Mesh(glowGeo,glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=.003;group.add(glow);
 const light=new T.PointLight(0x70cfff,0,.12,2);light.position.copy(center);light.position.y=.03;group.add(light);
 const temp=new T.Vector3(),previous=new T.Vector3(),next=new T.Vector3(),normal=new T.Vector3(),tangent=new T.Vector3();
 let dead=false;
 return {group,update(age:number,worldScale:number){
  if(dead)return;
  const delay=count<=1?0:Math.min(140,(count-1)*35)*ordinal/(count-1),t=Math.max(0,age-delay),sec=t/1000;
  const form=smooth(mode===4?630:mode===1?380:520,1220,t),heat=Math.sin(Math.PI*smooth(320,1720,t))*.9*(1-smooth(1180,1740,t));
  group.userData.progress=form;group.userData.age=t;
  bodies.forEach(b=>{b.visible=true;b.castShadow=!!b.userData.restShadow&&t>=1300;});mats.forEach(m=>{m.uniforms.form.value=m.gem?form:smooth(850,1180,t);m.uniforms.time.value=sec;m.uniforms.heat.value=heat;if(Number.isFinite(m.attenuation))m.mat.attenuationDistance=m.attenuation*worldScale;});
  for(let j=0;j<3;j++){const r=ribbons[j],head=smooth(0,520,t),tail=Math.max(0,head-(.38+.20*Math.sin(Math.PI*head))*(1-smooth(520,1150,t)));
   r.mesh.visible=t>5&&t<1320;const fade=1-smooth(900,1280,t);r.mat.uniforms.uAlpha.value=smooth(0,180,t)*fade;r.mat.uniforms.uTime.value=sec;
   for(let k=0;k<=r.n;k++){const u=k/r.n,s=tail+(head-tail)*u;streamPoint(s,sec,j,mode,temp);streamPoint(Math.max(0,s-.005),sec,j,mode,previous);streamPoint(Math.min(1,s+.005),sec,j,mode,next);tangent.subVectors(next,previous).normalize();normal.set(-tangent.z,0,tangent.x).normalize();
    const width=(mode===3?.0048:.0030)*Math.pow(Math.sin(Math.PI*u),.7)*(1-.75*head)+.00006;
    for(let side=0;side<2;side++){const ix=(k*2+side)*3;next.copy(temp).addScaledVector(normal,width*(side?1:-1));next.toArray(r.p,ix);}}
   r.geo.getAttribute('position').needsUpdate=true;
   const v=volumes[j];v.mesh.visible=t>5&&t<1280;v.mat.attenuationDistance=.027*worldScale;
   for(let k=0;k<=v.rings;k++){const u=k/v.rings,s=tail+(head-tail)*u;
    streamPoint(s,sec,j,mode,temp);streamPoint(Math.max(0,s-.005),sec,j,mode,previous);streamPoint(Math.min(1,s+.005),sec,j,mode,next);tangent.subVectors(next,previous).normalize();normal.set(-tangent.z,0,tangent.x).normalize();const binormal=new T.Vector3().crossVectors(tangent,normal).normalize();
    const radius=(mode===3?.0058:.0044)*Math.pow(Math.sin(Math.PI*u),1.2)*(1-.55*head)*fade;
    for(let side=0;side<v.sides;side++){const a=side/v.sides*tau,ix=(k*v.sides+side)*3;next.copy(normal).multiplyScalar(Math.cos(a)).addScaledVector(binormal,Math.sin(a));next.toArray(v.normals,ix);next.multiplyScalar(radius).add(temp).toArray(v.p,ix);}}
   v.geo.getAttribute('position').needsUpdate=true;v.geo.getAttribute('normal').needsUpdate=true;
  }
  for(let i=0;i<particleCount;i++){
   const seed=seeds[i],arrival=480+seed*660,travel=smooth(seed*260,arrival,t),end=targets[i];
   streamPoint(travel,sec,i%3,mode,temp);
   const attach=smooth(.66,1,travel);temp.lerp(end,attach);
   const swirl=(1-travel)*.003;temp.x+=Math.sin(seed*90+sec*5)*swirl;temp.z+=Math.cos(seed*70+sec*4)*swirl;temp.toArray(positions,i*3);
   alphas[i]=smooth(seed*260,seed*260+140,t)*(1-smooth(arrival,arrival+210,t))*(.3+seed*.7);
  }
  pg.getAttribute('position').needsUpdate=true;pg.getAttribute('aAlpha').needsUpdate=true;points.visible=t<1540;
  pm.uniforms.uPixels.value=Math.max(1.5,Math.min(6,worldScale*.0038))*(devicePixelRatio||1);
  em.uniforms.uGrow.value=smooth(400,980,t)*1.2;em.uniforms.uFade.value=smooth(380,570,t)*(1-smooth(990,1630,t))*.85;
  const energy=Math.sin(Math.PI*smooth(120,1680,t));glowMat.uniforms.uAlpha.value=energy*.42;
  light.intensity=energy*worldScale*worldScale*.00065;light.distance=worldScale*.11;
 },dispose(){if(dead)return;dead=true;activeGroups.delete(group);group.removeFromParent();geos.forEach(g=>g.dispose());mats.forEach(m=>m.mat.dispose());ribbons.forEach(r=>{r.geo.dispose();r.mat.dispose();});volumes.forEach(v=>{v.geo.dispose();v.mat.dispose();});pg.dispose();pm.dispose();eg.dispose();em.dispose();glowGeo.dispose();glowMat.dispose();light.dispose();}};
}
let bloom:UnrealBloomPass|undefined,bloomWidth=0,bloomHeight=0;
export function applyFormationBloom(renderer:T.WebGLRenderer,target:T.WebGLRenderTarget){
 if(![...activeGroups].some(g=>g.userData.age>0&&g.userData.age<1720))return;
 if(!bloom)bloom=new UnrealBloomPass(new T.Vector2(target.width,target.height),.38,.25,2.8);
 if(target.width!==bloomWidth||target.height!==bloomHeight){bloomWidth=target.width;bloomHeight=target.height;bloom.setSize(bloomWidth,bloomHeight);}
 bloom.render(renderer,target,target,0,false);
}
export function disposeFormationBloom(){bloom?.dispose();bloom=undefined;}
export function formationPreview(id:FormationId):FormationPreview{return {id,duration:FORMATION_MS,impact:FORMATION_IMPACT,create:input=>createManaFormation(input,id),postprocess:applyFormationBloom};}
