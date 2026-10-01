/** Twin Gate Atelier: procedural, deterministic, local-only real-time effects.
 * Geometry, opaque color shapes and narrow highlights carry the effect on a white board.
 * No postprocess bloom, scene capture or third-party game assets are required. */
import * as T from 'three';
import {GATE_STUDIES} from './gateReturnPresets';
import {previewClock} from './shelfReturnEffects';
import type {ShelfReturnArgs} from './shelfReturnEffects';
import {cardStock} from '../ui/pileModels';
import {boardLens,layoutRect} from '../ui/boardProjection';
import {pileCenter,STOCK_THICKNESS} from '../ui/readingBoardLayout';
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,t:number)=>{const q=sat((t-a)/(b-a));return q*q*(3-2*q);};
const env=(a:number,b:number,c:number,d:number,t:number)=>smooth(a,b,t)*(1-smooth(c,d,t));
const TAU=Math.PI*2;
const vert='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.13+8.1)*.28+noise(p*4.31)*.15;}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float band(float r,float radius,float width){return 1.-smoothstep(width,width+.008,abs(r-radius));}
`;
const portalFragment=`
varying vec2 vUv;uniform vec3 tint,accent;uniform float time,opacity,power,mode,decay;
${noise}
void main(){
 vec2 p=(vUv-.5)*3.4;float r=length(p),a=atan(p.y,p.x),m=mode;
 float clock=time*.8;vec2 swirl=rotate(clock*.27)*p;
 float turbulence=fbm(swirl*4.+vec2(time*.32,-time*.19));
 float irregular=.012*sin(a*9.+time*2.)+.008*sin(a*17.-time*1.3);
 float radius=.86+irregular;
 if(m>0.5&&m<1.5)radius+=.070*sin(a*3.-time*1.8)+.022*sin(a*7.+time);
 if(m>1.5&&m<2.5)radius+=.04*(noise(vec2(a*14.,floor(time*13.)))-.5);
 if(m>2.5&&m<3.5)radius+=.12*pow(.5+.5*cos(a*6.),4.);
 if(m>3.5)radius+=.026*cos(a*8.);
 // Layered interior: slow clouds under a sharper, oppositely moving star layer.
 vec2 space=rotate(-clock*.1)*p;float cloud=fbm(space*3.+vec2(time*.06,-time*.10));
 vec2 stars=space*16.+vec2(time*.10,0.);vec2 cell=floor(stars),f=fract(stars)-.5;
 float star=pow(max(0.,1.-length(f)*7.),5.)*step(.89,hash(cell));
 float star2=pow(max(0.,1.-length(fract(rotate(.3)*p*23.+time*.12)-.5)*9.),5.)*step(.94,hash(floor(p*23.)));
 float spiral=pow(max(0.,sin(a*3.+r*13.-time*1.7+cloud*2.)),8.)*.25;
 float core=1.-smoothstep(radius-.10,radius-.025,r);
 vec3 deep=mix(vec3(.015,.026,.075),tint*.24,cloud*.7);
 deep+=tint*pow(cloud,4.)*.7+vec3(.7,.86,1.)*(star+star2)*.7;
 if(m>0.5&&m<1.5)deep+=tint*spiral*.7;
 if(m>1.5&&m<2.5)deep+=accent*pow(max(0.,sin(a*7.+r*21.+time*9.)),28.)*.12;
 if(m>2.5&&m<3.5)deep+=tint*step(.82,fract(a/6.283185*6.+r*1.8))*.12;
 // Deliberately broad color rim + narrow white-hot edge, rather than a flat disc.
 float rim=band(r,radius,.038),white=band(r,radius-.024,.008);
 float torus=band(r,radius+.065,.014)*(.55+.45*sin(a-time));
 float outer=band(r,1.08,.005)*step(.16,fract(a/6.283185*8.+time*.05));
 float inner=band(r,.72,.004)*step(.30,fract(a/6.283185*5.-time*.04));
 float glyphs=step(.76,fract(a/6.283185*32.+time*.035))*step(.97,r)*step(r,1.025);
 float filigree=band(r,1.16,.003)*step(.83,fract(a/6.283185*12.-time*.03));
 float crescent=0.;
 if(m>0.5&&m<1.5){
   float waveR=1.02+.065*sin(a*3.-time*2.);float thick=.016+.07*pow(.5+.5*sin(a*3.-time*2.),3.);
   crescent=band(r,waveR,thick)*smoothstep(-.4,.6,sin(a*3.-time*2.));outer*=.25;glyphs=0.;filigree=0.;
 }
 if(m>1.5&&m<2.5){
   float boltR=1.06+.055*(noise(vec2(a*22.,floor(time*15.)))-.5);
   crescent=band(r,boltR,.007)*step(.28,noise(vec2(a*5.,floor(time*8.))));glyphs*=.7;
 }
 if(m>2.5&&m<3.5){
   float petal=.95+.23*pow(.5+.5*cos(a*6.),3.);crescent=band(r,petal,.018);glyphs=0.;outer*=.6;
 }
 if(m>3.5){
   float ray=pow(max(0.,cos(a*8.)),18.);crescent=step(.98,r)*step(r,1.05+ray*.25)*ray;glyphs*=1.3;
 }
 float halo=exp(-abs(r-radius)*17.)*.22;
 float erosion=smoothstep(decay*.96,decay*.96+.07,noise(vec2(a*4.,r*8.-time*.35)));
 float outline=max(max(rim,torus),max(outer,max(glyphs,max(filigree,crescent))));
 vec3 c=deep;
 c=mix(c,tint,clamp(outline,0.,1.));c=mix(c,accent,clamp(glyphs+filigree+torus*.6,0.,1.));
 c=mix(c,vec3(.87,.98,1.),white);c+=tint*halo*.5+vec3(.28,.37,.42)*power*rim;
 float alpha=max(core*.87,max(outline,white))+halo;
 gl_FragColor=vec4(c,clamp(alpha,0.,1.)*opacity*erosion);
 #include <colorspace_fragment>
}`;
const poolFragment=`varying vec2 vUv;uniform vec3 tint;uniform float opacity,time;${noise}
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float soft=exp(-r*r*4.)*(1.-smoothstep(.7,1.,r));float ripple=band(r,.35+fract(time*.3)*.48,.012)*(1.-fract(time*.3));gl_FragColor=vec4(tint,(soft*.19+ripple*.10)*opacity);
#include <colorspace_fragment>
}`;
const flareFragment=`varying vec2 vUv;uniform vec3 tint;uniform float opacity,time,mode;${noise}
void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float spokes=pow(abs(cos(a*(mode>3.5?4.:3.)+time*.2)),24.);
 float spike=pow(max(0.,1.-r),2.)*spokes;float core=exp(-r*r*100.);float halo=exp(-r*r*12.)*.28;
 float ring=band(r,.26+time*.42,.010)*(1.-time);float shape=(core+spike*.85+halo+ring*.4);
 gl_FragColor=vec4(mix(tint,vec3(.92,.99,1.),clamp(core+spike,0.,1.)),shape*opacity);
 #include <colorspace_fragment>
}`;
function plane(parent:T.Group,fragmentShader:string,uniforms:Record<string,T.IUniform>,width=3.4){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:vert,fragmentShader});
 const mesh=new T.Mesh(new T.PlaneGeometry(width,width),material);parent.add(mesh);return {mesh,material};
}

/** Dissolve cards through a broken advancing edge; no sampled hidden card faces. */
function stock(parent:T.Group,sleeve:T.Texture,face:T.Texture|undefined,tint:T.Color){
 const group=cardStock(sleeve,face);parent.add(group);
 const uniforms={gateKeep:{value:1.2},gateTint:{value:tint},gateCharge:{value:0}};
 group.traverse(o=>{if(!(o instanceof T.Mesh))return;o.renderOrder=4;for(const mat of Array.isArray(o.material)?o.material:[o.material]){
   if(!(mat instanceof T.MeshBasicMaterial||mat instanceof T.MeshStandardMaterial))continue;
   mat.transparent=true;mat.depthTest=true;
   mat.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying vec2 gateUv;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngateUv=position.xy*vec2(1.,.64)+.5;');
     shader.fragmentShader='varying vec2 gateUv;uniform float gateKeep,gateCharge;uniform vec3 gateTint;\n'+noise+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
       float gateField=gateUv.y*.86+fbm(gateUv*6.)*.14;
       if(gateField>gateKeep)discard;
       float gateEdge=(1.-smoothstep(.0,.020,abs(gateField-gateKeep)))*step(.0,gateKeep)*step(gateKeep,1.05);`);
     shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(gateTint,vec3(.88,.98,1.),gateEdge),clamp(gateEdge+gateCharge*.35,0.,1.));
       #include <tonemapping_fragment>`);
   };
   mat.customProgramCacheKey=()=> 'lore-twin-gate-dissolve-v1';
 }});
 return {group,uniforms};
}
function makeRibbon(parent:T.Group,tint:T.Color,accent:T.Color,mode:number){
 const segments=56,pos=new Float32Array((segments+1)*6),uv=new Float32Array((segments+1)*4),indices:number[]=[];
 for(let i=0;i<=segments;i++){uv.set([i/segments,0,i/segments,1],i*4);if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(indices);
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,vertexShader:vert,
 uniforms:{tint:{value:tint},accent:{value:accent},opacity:{value:0},time:{value:0}},fragmentShader:`varying vec2 vUv;uniform vec3 tint,accent;uniform float opacity,time;${noise}
 void main(){float edge=abs(vUv.y-.5)*2.;float taper=pow(sin(vUv.x*3.14159),.65);
 float core=1.-smoothstep(.1,.34,edge);float spine=1.-smoothstep(.01,.05,abs(vUv.y-.46));
 float erosion=smoothstep(.11,.22,noise(vec2(vUv.x*19.-time*3.,vUv.y*5.)));
 vec3 c=mix(tint,accent,core*.52);c=mix(c,vec3(.90,.99,1.),spine*.85);
 gl_FragColor=vec4(c,opacity*taper*(1.-smoothstep(.65,1.,edge))*erosion);
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;parent.add(mesh);
 const p=new T.Vector3(),p2=new T.Vector3(),normal=new T.Vector3(),view=new T.Vector3(0,Math.cos(boardLens().angle),Math.sin(boardLens().angle));
 return {mesh,update(path:(s:number,v:T.Vector3)=>void,width:number,alpha:number,time:number){
   mesh.visible=alpha>.002;if(!mesh.visible)return;
   for(let i=0;i<=segments;i++){
     const u=i/segments;path(u,p);path(Math.max(0,Math.min(1,u+(i===segments?-.001:.001))),p2);
     normal.subVectors(p2,p);if(i===segments)normal.negate();normal.cross(view).normalize();
     const w=width*Math.pow(Math.sin(Math.PI*u),.7)*(mode===1?1+.25*Math.sin(u*14.+time*6.):1);
     pos.set([p.x+normal.x*w,p.y+normal.y*w,p.z+normal.z*w,p.x-normal.x*w,p.y-normal.y*w,p.z-normal.z*w],i*6);
   }geo.attributes.position.needsUpdate=true;mat.uniforms.opacity.value=alpha;mat.uniforms.time.value=time;
 }};
}

export async function playGateReturn(args:ShelfReturnArgs):Promise<boolean>{
 const {root,scene,source,target,count,unit,cx,cy,texture,face,signal,warm,refresh}=args;
 const study=GATE_STUDIES.find(s=>s.id===root.dataset.shelfReturnVariant);if(!study||signal.aborted||count<1)return false;
 const {mode,ms}=study,tint=new T.Color(study.color),accent=new T.Color(study.secondary);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const from=layoutRect(source),to=layoutRect(target),a=new T.Vector3(from.left+from.width/2-cx,0,from.top+from.height/2-cy),b=new T.Vector3(to.left+to.width/2-cx,0,to.top+to.height/2-cy);
 const world=new T.Group();world.name='twin-gate-atelier';scene.add(world);
 const n=Math.min(9,count),height=(Math.min(count,40)-1)*STOCK_THICKNESS;
 const sourceCards=Array.from({length:n},(_,i)=>stock(world,texture(source.dataset.sleeve!),i===n-1?face:undefined,tint));
 const targetCards=Array.from({length:n},()=>stock(world,texture(target.dataset.sleeve!),undefined,tint));
 const portals=[a,b].map((anchor,index)=>{
   const group=new T.Group();world.add(group);group.position.copy(anchor);group.position.y=unit*.60;group.rotation.x=-Math.PI/2+.38;group.scale.setScalar(unit);
   const surface=plane(group,portalFragment,{tint:{value:tint},accent:{value:accent},time:{value:0},opacity:{value:0},power:{value:0},mode:{value:mode},decay:{value:0}});
   const rimGroup=new T.Group();group.add(rimGroup);
   const arcs=Array.from({length:mode===0||mode===4?3:2},(_,k)=>{
     const mesh=new T.Mesh(new T.TorusGeometry(1.03+k*.10,.009+(k===0?.003:0),5,64,TAU*(k===0?.72:.45)),new T.MeshStandardMaterial({color:k%2?tint:accent,emissive:k%2?tint:accent,emissiveIntensity:.5,roughness:.3,metalness:.35,transparent:true}));
     mesh.rotation.set((k-1)*.25, k===1?.24:0,k*2.1+index);rimGroup.add(mesh);return mesh;
   });
   const ornaments=Array.from({length:mode===3?6:mode===4?8:12},(_,k)=>{
     const shape=mode===3?new T.OctahedronGeometry(.21,0):new T.OctahedronGeometry(.055,0);
     const mesh=new T.Mesh(shape,new T.MeshStandardMaterial({color:k%3?tint:accent,emissive:k%3?tint:accent,emissiveIntensity:.38,roughness:.25,metalness:.45,transparent:true}));group.add(mesh);return mesh;
   });
   const floor=plane(world,poolFragment,{tint:{value:tint},time:{value:0},opacity:{value:0}},3.8);floor.mesh.rotation.x=-Math.PI/2;floor.mesh.position.copy(anchor);floor.mesh.position.y=unit*.095;floor.mesh.scale.setScalar(unit);
   const flash=plane(group,flareFragment,{tint:{value:accent},time:{value:0},opacity:{value:0},mode:{value:mode}},3.2);flash.mesh.position.z=.09;flash.mesh.renderOrder=7;flash.material.depthTest=false;
   return {group,surface,arcs,ornaments,floor,flash};
 });
 const streams=Array.from({length:mode===2?5:mode===1?3:4},()=>makeRibbon(world,tint,accent,mode));
 const heads=streams.map(()=>{const f=plane(world,flareFragment,{tint:{value:tint},time:{value:.1},opacity:{value:0},mode:{value:mode}},1);f.mesh.rotation.x=-boardLens().angle;return f;});
 const shardGeo=new T.OctahedronGeometry(1),shardMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,toneMapped:false});
 const shards=new T.InstancedMesh(shardGeo,shardMat,96);shards.frustumCulled=false;world.add(shards);
 for(let i=0;i<96;i++)shards.setColorAt(i,i%4? tint:accent);
 const sparkGeo=new T.PlaneGeometry(1,1),sparkMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',uniforms:{tint:{value:accent}},fragmentShader:`varying vec2 vUv;uniform vec3 tint;void main(){vec2 p=abs((vUv-.5)*2.);float d=pow(p.x,.55)+pow(p.y,.55);float a=1.-smoothstep(.6,1.,d);gl_FragColor=vec4(mix(tint,vec3(1.),.55),a);\n#include <colorspace_fragment>\n}`});
 const stars=new T.InstancedMesh(sparkGeo,sparkMat,36);stars.frustumCulled=false;world.add(stars);
 const dummy=new T.Object3D(),p=new T.Vector3();
 const path=(u:number,k:number,out:T.Vector3,t:number)=>{
   out.copy(a).lerp(b,u);out.y=unit*(.60+Math.sin(Math.PI*u)*(.32+(k%2)*.2));
   out.z+=unit*Math.sin(Math.PI*u)*Math.sin(u*Math.PI*2.+k*2.1)*(mode===1?.30:.17);
   if(mode===2){
     const cell=Math.floor(u*18),f=u*18-cell,seed=Math.floor(t*24)*7+k*19;
     const jitter=(j:number)=>{const v=Math.sin(j*127.1+seed)*43758.54;return (v-Math.floor(v))-.5;};
     out.y+=unit*Math.sin(Math.PI*u)*(jitter(cell)*(1-f)+jitter(cell+1)*f)*.36;
     out.z+=unit*Math.sin(Math.PI*u)*(jitter(cell+41)*(1-f)+jitter(cell+42)*f)*.22;
   }
   if(mode===3)out.y+=unit*Math.sin(Math.PI*u)*(k-1.5)*.16;
 };
 function update(t:number){
   const seconds=t*ms/1000;
   root.dataset.shufflePhase=t<.15?'開門':t<.35?'光へ分解':t<.64?'転送':t<.85?'実体化':'余韻';root.dataset.shelfReturnTime=t.toFixed(4);
   sourceCards.forEach((c,i)=>{
     const layer=n===1?0:i/(n-1),h=layer*height,local=smooth(.18+(1-layer)*.06,.43+(1-layer)*.06,t);
     c.group.position.copy(a);c.group.position.y=unit*(pileCenter(1,true)+h+Math.sin(local*Math.PI)*.22);c.group.rotation.x=-Math.PI/2;
     c.group.scale.setScalar(unit*(1-local*.12));c.group.visible=local<1;
     c.uniforms.gateKeep.value=1.12-local*1.25;c.uniforms.gateCharge.value=env(.06,.18,.42,.49,t)*.7;
   });
   targetCards.forEach((c,i)=>{
     const layer=n===1?0:i/(n-1),local=smooth(.59+layer*.012,.80+layer*.012,t);
     c.group.position.copy(b);c.group.position.y=unit*(pileCenter(1,false)+layer*height+(1-local)*.26);c.group.rotation.x=-Math.PI/2;
     c.group.scale.setScalar(unit*(.96+.04*local));c.group.visible=local>0;
     c.uniforms.gateKeep.value=-.13+local*1.25;c.uniforms.gateCharge.value=(1-local)*.9;
   });
   portals.forEach((portal,i)=>{
     const open=smooth(i?.11:0,i?.26:.15,t),close=smooth(i?.85:.62,i?1:.83,t),power=env(i?.64:.22,i?.70:.27,i?.73:.30,i?.80:.39,t);
     const visibility=open*(1-close),scale=(.12+.88*open)*(1-close*.28)*(1+power*.065);
     portal.group.visible=!reduced&&visibility>.001;portal.group.scale.setScalar(unit*scale);
     portal.group.rotation.z=(i?-1:1)*.025*Math.sin(seconds*1.6);
     const uniforms=portal.surface.material.uniforms;uniforms.time.value=seconds+(i?2:0);uniforms.opacity.value=visibility;uniforms.power.value=power;uniforms.decay.value=close;
     portal.arcs.forEach((arc,k)=>{arc.rotation.z=(k*2.1+i)+(i?-1:1)*seconds*(k%2?-.38:.29);arc.material.opacity=visibility*(mode===1?.32:.8);arc.visible=mode!==2;});
     portal.ornaments.forEach((o,k)=>{
       const angle=k/portal.ornaments.length*TAU+(mode===3?0:seconds*(i?-.12:.12));const spread=1.13+(mode===3?.20:.02)*Math.sin(open*Math.PI/2)+close*.3;
       o.position.set(Math.cos(angle)*spread,Math.sin(angle)*spread,.03+Math.sin(angle+seconds)*.04);
       o.rotation.set(mode===3?.28:0,seconds*(mode===3?.3:.8)+k,angle-Math.PI/2);
       o.scale.set(mode===3?.58:1,mode===3?1.4:2.2,mode===3?.38:1);o.scale.multiplyScalar(1-close*.8);o.material.opacity=visibility;
       o.visible=mode!==1;
     });
     portal.floor.mesh.visible=!reduced&&visibility>.001;portal.floor.material.uniforms.opacity.value=visibility;portal.floor.material.uniforms.time.value=seconds;
     portal.flash.material.uniforms.opacity.value=power*(mode===2?1.1:.8);portal.flash.material.uniforms.time.value=smooth(i?.65:.23,i?.80:.39,t);
   });
   streams.forEach((stream,k)=>{
     const q=sat((t-.29-k*.035)/.33),flight=env(0,.09,.83,1,q),head=smooth(0,1,q),tail=Math.max(0,head-(mode===2?.42:.29));
     stream.update((s,out)=>path(tail+(head-tail)*s,k,out,t),unit*(mode===1?.105:mode===2?.036:mode===3?.042:.075)*flight,flight*(mode===2?.98:.90),seconds);
     path(head,k,heads[k].mesh.position,t);heads[k].mesh.scale.setScalar(unit*(mode===2?.50:.37)*flight);heads[k].material.uniforms.opacity.value=flight;
     if(reduced){stream.mesh.visible=false;heads[k].mesh.visible=false;}
   });
   for(let i=0;i<96;i++){
     const seed=(i*.61803398875)%1,part=i<60?0:1,local=part?sat((t-.64-seed*.09)/.25):sat((t-.22-seed*.20)/.40),angle=i*2.399963;
     const size=unit*(mode===3?.039:.022)*(part?Math.sin(local*Math.PI):env(0,.13,.86,1,local));
     if(part){dummy.position.copy(b);const dist=unit*(.28+local*(.7+seed*.6));dummy.position.x+=Math.cos(angle)*dist;dummy.position.z+=Math.sin(angle)*dist;dummy.position.y=unit*(.24+Math.sin(local*Math.PI)*(.35+seed*.4));}
     else{path(local,i%4,dummy.position,t);dummy.position.y+=unit*Math.sin(local*Math.PI)*Math.cos(angle)*.16;dummy.position.z+=unit*Math.sin(local*Math.PI)*Math.sin(angle)*.17;}
     dummy.scale.set(size*.55,size*(mode===3?3.2:1.6),size*.4);dummy.rotation.set(angle+seconds,angle*.6,angle+local*2.);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);
   }
   shards.instanceMatrix.needsUpdate=true;shards.visible=!reduced;
   for(let i=0;i<36;i++){
     const side=i%2,seed=(i*.6180339)%1,local=sat((t-(side?.16:.03)-seed*.18)/.64),angle=i*2.3999+local*.35,anchor=side?b:a;
     p.copy(anchor);p.x+=unit*Math.cos(angle)*(1.05+seed*.28);p.z+=unit*Math.sin(angle)*(1.05+seed*.28);p.y=unit*(.43+seed*.65+local*.16);
     const size=unit*(.07+seed*.06)*Math.pow(Math.sin(local*Math.PI),2)*( .75+.25*Math.sin(seconds*4+seed*11));
     dummy.position.copy(p);dummy.rotation.set(-boardLens().angle,0,0);dummy.scale.setScalar(size);dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix);
   }stars.instanceMatrix.needsUpdate=true;stars.visible=!reduced;
   if(reduced){
     sourceCards.forEach((c,i)=>{c.group.position.copy(a);c.group.position.y=unit*(pileCenter(1,true)+(n===1?0:i/(n-1)*height));c.group.scale.setScalar(unit);c.group.visible=t<.5;c.uniforms.gateKeep.value=1.2;c.uniforms.gateCharge.value=0;});
     targetCards.forEach((c,i)=>{c.group.position.copy(b);c.group.position.y=unit*(pileCenter(1,false)+(n===1?0:i/(n-1)*height));c.group.scale.setScalar(unit);c.group.visible=t>=.5;c.uniforms.gateKeep.value=1.2;c.uniforms.gateCharge.value=0;});
   }
 }
 let frame=0,finish=()=>{};
 try{
   update(0);await warm();if(signal.aborted||!root.isConnected)return false;
   source.classList.add('is-shuffling');target.classList.add('is-shuffling');previewClock.active=true;root.dataset.gateStudyActive=study.id;
   await new Promise<void>(resolve=>{
     let previous=performance.now(),done=false;
     finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
     signal.addEventListener('abort',finish,{once:true});
     const tick=(now:number)=>{
       if(signal.aborted||!root.isConnected){finish();return;}
       const dt=Math.min(60,now-previous);previous=now;if(!previewClock.paused)previewClock.time+=dt*previewClock.speed;
       const t=sat(previewClock.time/(reduced?160:ms));update(t);
       if(t>=1&&!previewClock.paused)finish();else frame=requestAnimationFrame(tick);
     };frame=requestAnimationFrame(tick);
   });
   if(signal.aborted||!root.isConnected)return false;
   target.dataset.count=String(count);source.dataset.count='0';source.querySelector('.pile-print')?.remove();delete source.dataset.face;
   for(const el of [source,target]){const counter=el.querySelector('.pile-count');if(counter)counter.textContent=el.dataset.count!;}
   refresh();return true;
 }finally{
   finish();previewClock.active=false;source.classList.remove('is-shuffling');target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;delete root.dataset.gateStudyActive;
   world.removeFromParent();const geos=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
   world.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
   geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
}
