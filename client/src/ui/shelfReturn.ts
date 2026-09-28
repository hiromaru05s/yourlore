import * as T from 'three';
import {portalPose,portalTiming} from './portalReturnMotion';
import {materialPose,sat,smooth} from './cardReturnMotion';
import {layoutRect} from './boardProjection';
import {pileCenter,STOCK_THICKNESS} from './readingBoardLayout';
export type ShelfReturnArgs={root:HTMLElement;scene:T.Scene;source:HTMLElement;target:HTMLElement;count:number;unit:number;cx:number;cy:number;texture:(url:string)=>T.Texture;face?:T.Texture;signal:AbortSignal;warm:()=>Promise<void>;refresh:()=>void};
export type ReturnStudy={id:string;ms:number;color:string;secondary:string;mode:number;strips:number;warp?:number};
export type ReturnClock={speed:number;paused:boolean;time:number;active:boolean};
/** User-approved portal study 3. This is also the production default. */
export const PAIRED_RETURN={id:'portal-echo',ms:2060,color:'#38667c',secondary:'#e6edf0',mode:0,strips:1,warp:2} as const;
const vertex=`varying vec3 vWorld;varying vec2 vUv;varying float vFluid;varying float vTransit;attribute float fluid,transit;
void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vUv=uv;vFluid=fluid;vTransit=transit;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const portalClip=`varying vec3 vWorld;uniform float portalEnabled,portalExit,portalEnter,portalStyle,portalZ,portalUnit;
float portalBoundary(){float bend=portalStyle>.5&&portalStyle<1.5?(vWorld.z-portalZ)*.24:portalStyle>2.5&&portalStyle<3.5?sin((vWorld.z-portalZ)/portalUnit*2.)*portalUnit*.12:0.;return max(portalExit+bend-vWorld.x,vWorld.x-portalEnter-bend);}
`;
const fragment=portalClip+`varying vec2 vUv;varying float vFluid;varying float vTransit;
uniform sampler2D faceMap,sleeveMap;uniform float publicFace,charge,time,coat,mode,halo,surfaceCharge,etchCharge;uniform vec3 tint,accent;
float line(float d,float w){return 1.-smoothstep(w,w+.0025,abs(d));}
void main(){
 if(portalEnabled>.5&&portalBoundary()<0.)discard;
 vec2 uv=vUv;vec2 padded=uv;
 vec4 art=texture2D(faceMap,padded),back=texture2D(sleeveMap,uv*vec2(.94,.94)+.03);
 vec4 tex=mix(back,art,publicFace*(1.-smoothstep(.44,.60,vTransit)));
 vec2 p=abs((uv-.5)*vec2(.94,1.46875));vec2 r=p-vec2(.35,.61);float sdf=length(max(r,0.))+min(max(r.x,r.y),0.)-.12;
 float faceWeight=publicFace*(1.-smoothstep(.44,.60,vTransit));
 float mask=mix(1.-smoothstep(-.006,.0,sdf),art.a,faceWeight);
 if(mask<.01)discard;
 float lum=dot(tex.rgb,vec3(.2126,.7152,.0722));
 float detail=clamp(length(vec2(dFdx(lum),dFdy(lum)))*13.,0.,1.);
 float pixel=max(.0006,fwidth(sdf));
 float rim=1.-smoothstep(pixel*.65,pixel*1.8,abs(sdf+.014));
 float hair=line(sdf+.045,.0012);
 float ends=smoothstep(.0,.08,uv.x)*(1.-smoothstep(.92,1.,uv.x));
 rim*=mix(1.,ends,vFluid);hair*=mix(1.,ends,vFluid);
 float silhouette=clamp(length(vec2(dFdx(art.a),dFdy(art.a)))*2.,0.,1.);rim=mix(rim,silhouette,faceWeight);
 // Engraving lives in the same UV coordinates as the actual card, not on a world-space overlay.
 vec2 e=(uv-.5)*vec2(1.,.67);float radius=length(e),angle=atan(e.y,e.x);
 float etch=line(radius-(.29+.015*sin(angle*6.)),.0018)+line(radius-.25,.0012);
 etch+=line(abs(e.x)+abs(e.y)*.65-.32,.0015)*.65;
 etch+=line(fract(uv.y*13.+sin(uv.x*15.)*.25)-.5,.002)*step(.25,uv.x)*step(uv.x,.75)*.30;
 float sweep=exp(-pow((uv.x+uv.y*.20-fract(time*.31))/.12,2.));
 float density=.50+.19*sin(uv.x*9.+uv.y*7.+time*.15)+.12*sin(uv.y*16.-uv.x*4.);
 float flow=pow(clamp(1.-abs(density-.56)*15.,0.,1.),4.);
 float sheen=exp(-pow((fract(uv.y*3.+uv.x*.3-time*.08)-.35)/.085,2.));
 float dark=.10+density*.32;
 vec3 ink=mix(tint*.12,tint,dark+flow*.44);
 ink=mix(ink,tex.rgb,.11+.19*(1.-vFluid));ink=mix(ink,accent,sheen*vFluid*.24);
 vec3 c=mix(tex.rgb,ink,vFluid*.98);
 float localLight=exp(-pow((uv.x+uv.y*.6-time*.48)/.24,2.));
 float emit=charge*(rim*.52+hair*.18)*(1.-vFluid*.35);
 emit+=surfaceCharge*detail*(.14+localLight*.60)*(1.-vFluid*.80);
 emit+=etchCharge*etch*.24*(1.-vFluid*.76);
 emit+=vFluid*(flow*.22+rim*.15+etch*.07)*(.35+.65*localLight);
 if(portalEnabled>.5)emit+=exp(-abs(portalBoundary())/(portalUnit*.025))*.55;
 c=mix(c,accent,clamp(emit,0.,.70));
 c+=accent*charge*sweep*detail*.15;
 if(halo>.5){gl_FragColor=vec4(tint,mask*charge*.045);}
 else gl_FragColor=vec4(c,mask);
 #include <colorspace_fragment>
}`;
const fxVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const gateFragment=`varying vec2 vUv;uniform vec3 tint,accent;uniform float power,time,arrival,mode;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
float radius=.72+.012*sin(a*9.+time*3.);float edge=abs(r-radius);
float core=1.-smoothstep(.008,.018,edge);float rim=1.-smoothstep(.024,.048,edge);
float segments=(1.-smoothstep(.004,.012,abs(r-.83)))*step(.28,fract(a/6.283185*12.-time*.05));
float ticks=step(.88,r)*step(r,.94)*step(.86,fract(a/6.283185*24.+time*.025));
float inside=(1.-smoothstep(.65,.71,r))*.045;float halo=exp(-edge*24.)*.10;
float alpha=max(rim*.84,max(segments*.65,ticks*.7))+inside+halo;
vec3 c=mix(tint*.52,accent,core);c=mix(c,tint,segments*.75);c+=accent*arrival*core*.5;
gl_FragColor=vec4(c,alpha*power);
#include <colorspace_fragment>
}`;
const floorFragment=`varying vec2 vUv;uniform vec3 tint;uniform float power;
void main(){vec2 p=(vUv-.5)*2.;float d=dot(p,p);gl_FragColor=vec4(tint,exp(-d*5.)*(1.-smoothstep(.6,1.,length(p)))*power);}
`;
function plane(group:T.Group,shader:string,uniforms:Record<string,T.IUniform>){
 const mat=new T.ShaderMaterial({uniforms,vertexShader:fxVertex,fragmentShader:shader,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(1,1),mat);mesh.frustumCulled=false;group.add(mesh);return {mesh,mat};
}
export async function playMaterialReturn(args:ShelfReturnArgs,study:ReturnStudy=PAIRED_RETURN,clock:ReturnClock={speed:1,paused:false,time:0,active:false}):Promise<boolean>{
 const {root,source,target,count,unit,cx,cy,scene,texture,face,signal,warm,refresh}=args;
 if(count<1||signal.aborted||!root.isConnected)return false;
 const warped=study.warp!==undefined,style=study.warp??0;
 const {mode,strips,ms}=study,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tint=new T.Color(study.color),accent=new T.Color(study.secondary);
 const src=layoutRect(source),dst=layoutRect(target);
 const a=new T.Vector3(src.left+src.width/2-cx,0,src.top+src.height/2-cy),b=new T.Vector3(dst.left+dst.width/2-cx,0,dst.top+dst.height/2-cy);
 const world=new T.Group();world.name='connected-card-material';scene.add(world);
 const n=Math.min(mode>=3?2:3,count),height=(Math.min(40,count)-1)*STOCK_THICKNESS;
 const portalUniforms={portalEnabled:{value:warped?1:0},portalExit:{value:a.x+unit*1.10},portalEnter:{value:b.x-unit*1.18},portalStyle:{value:style},portalZ:{value:a.z},portalUnit:{value:unit}};
 const sleeve=texture(target.dataset.sleeve!),sourceSleeve=texture(source.dataset.sleeve!);
 const surfaceUniforms=Array.from({length:n},(_,i)=>({...portalUniforms,faceMap:{value:i===0&&face?face:sourceSleeve},sleeveMap:{value:sleeve},publicFace:{value:i===0&&face?1:0},charge:{value:0},surfaceCharge:{value:0},etchCharge:{value:0},coat:{value:0},time:{value:0},mode:{value:mode},halo:{value:0},tint:{value:tint},accent:{value:accent}}));
 const surfaces:{mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;packet:number;strip:number;positions:Float32Array;fluids:Float32Array;transits:Float32Array}[]=[];
 const p=new T.Vector3();
 function position(t:number,u:number,v:number,packet:number,strip:number,out:T.Vector3){
  const portal=warped?portalPose(t,u,v,packet,style):undefined;
  const pose=portal??materialPose(t,u,v,packet,n,mode,strip,strips);
  const fromY=pileCenter(1,true)+(n-1-packet)/Math.max(1,n-1)*height;
  const toY=pileCenter(1,false)+packet/Math.max(1,n-1)*height;
  const publicScale=packet===0&&face?1-smooth(.44,.60,pose.q):0;
  out.copy(a).lerp(b,pose.s);if(portal)out.x+=unit*portal.offset;out.x+=unit*pose.localX*(1+publicScale*.30/.94);out.z+=unit*pose.z*(1+publicScale*.33375/1.46875);
  out.y=unit*(fromY+(toY-fromY)*pose.s+pose.y+STOCK_THICKNESS/2);
  return pose;
 }
 for(let packet=n-1;packet>=0;packet--)for(let strip=0;strip<strips;strip++){
  const nx=64,ny=mode===3?6:14,positions=new Float32Array((nx+1)*(ny+1)*3),uvs=new Float32Array((nx+1)*(ny+1)*2),fluids=new Float32Array((nx+1)*(ny+1)),transits=new Float32Array((nx+1)*(ny+1)),indices:number[]=[];
  for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){const i=iy*(nx+1)+ix;uvs.set([ix/nx,(strip+iy/ny)/strips],i*2);if(ix<nx&&iy<ny)indices.push(i,i+1,i+nx+1,i+1,i+nx+2,i+nx+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('uv',new T.BufferAttribute(uvs,2));geo.setAttribute('fluid',new T.BufferAttribute(fluids,1));geo.setAttribute('transit',new T.BufferAttribute(transits,1));geo.setIndex(indices);
  const mat=new T.ShaderMaterial({uniforms:surfaceUniforms[packet],vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:true,side:T.DoubleSide,toneMapped:false});
  const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;world.add(mesh);surfaces.push({mesh,packet,strip,positions,fluids,transits});
 }
 // These are projected shadows of the same material geometry, never free-floating discs.
 const shadows=surfaces.map(s=>{const geo=s.mesh.geometry.clone();const mesh=new T.Mesh(geo,new T.ShaderMaterial({uniforms:portalUniforms,vertexShader:vertex,fragmentShader:portalClip+`varying vec2 vUv;varying float vFluid;void main(){if(portalEnabled>.5&&portalBoundary()<0.)discard;vec2 p=abs(vUv-.5)*2.;float mask=(1.-smoothstep(.70,1.,p.x))*(1.-smoothstep(.65,1.,p.y));gl_FragColor=vec4(.045,.065,.12,mask*.08);}`,transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.frustumCulled=false;mesh.renderOrder=-1;world.add(mesh);return mesh;});
 const glows=surfaces.map(s=>{
  const geo=s.mesh.geometry.clone();const uniforms={...surfaceUniforms[s.packet],halo:{value:1}};
  const mat=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:portalClip+`varying vec2 vUv;uniform vec3 tint;uniform float charge;void main(){if(portalEnabled>.5&&portalBoundary()<0.)discard;float d=abs(vUv.y-.5)*2.;float a=(1.-smoothstep(.52,1.,d))*sin(vUv.x*3.141593);gl_FragColor=vec4(tint,a*charge*.065);}`,transparent:true,depthWrite:false,side:T.DoubleSide});
  const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=-1;world.add(mesh);return mesh;
 });
 const anchors=warped?[a.clone().add(new T.Vector3(unit*1.10,0,0)),b.clone().add(new T.Vector3(-unit*1.18,0,0))]:[a,b];
 const gates=anchors.map((anchor,i)=>{
  const f=plane(world,gateFragment,{tint:{value:tint},accent:{value:accent},time:{value:0},power:{value:0},arrival:{value:0},mode:{value:mode}});
  f.mesh.position.copy(anchor);f.mesh.position.y=unit*.25;f.mesh.rotation.x=-Math.PI/2+.17;f.mesh.scale.set(unit*1.65,unit*2.05,1);
  const light=plane(world,floorFragment,{tint:{value:tint},power:{value:0}});light.mesh.position.copy(anchor);light.mesh.position.y=unit*.09;light.mesh.rotation.x=-Math.PI/2;light.mesh.scale.setScalar(unit*2.3);
  return {...f,light,index:i};
 });
 const shards=new T.InstancedMesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:accent,transparent:true,depthWrite:false}),42);
 shards.frustumCulled=false;world.add(shards);const dummy=new T.Object3D();
 let lastT=-1;
 function update(t:number){
  if(t===lastT)return;lastT=t;
  root.dataset.shufflePhase=warped?(t<.14?'浮上と蓄光':t<.44?'光の縁へ消失':t<portalTiming(style).returnAt+.05?'中間は消失':t<.88?'デッキの左から出現':'接地と余韻'):(t<.22?'カード表面に蓄光':t<.42?'表面から連続変形':t<.72?'同じ面を転送':t<.93?'先端から再構成':'接地と余韻');root.dataset.shelfReturnTime=t.toFixed(4);
  for(let i=0;i<n;i++){const u=surfaceUniforms[i];const decay=1-smooth(.76,.91,t);u.charge.value=reduced?0:smooth(.018,.11,t)*decay;u.surfaceCharge.value=reduced?0:smooth(.065,.20,t)*decay;u.etchCharge.value=reduced?0:smooth(.12,.26,t)*decay;u.time.value=t*ms/1000;u.coat.value=smooth(.40,.66,t);}
  const contact=[0,0];let airborne=0;
  surfaces.forEach((s,index)=>{
   const uv=s.mesh.geometry.getAttribute('uv');const shadowPos=shadows[index].geometry.getAttribute('position'),glowPos=glows[index].geometry.getAttribute('position');
   for(let i=0;i<uv.count;i++){
    const u=uv.getX(i),v=uv.getY(i),pose=position(reduced?(t<.5?0:1):t,u,v,s.packet,s.strip,p);
    s.positions.set([p.x,p.y,p.z],i*3);s.fluids[i]=reduced?0:pose.fluid;s.transits[i]=pose.q;
    shadowPos.setXYZ(i,p.x,unit*.088,p.z);
    glowPos.setXYZ(i,p.x,p.y-.15,p.z+(v-.5)*unit*.14*pose.charge);
    if(i%16===0){contact[0]+=Math.exp(-Math.pow(pose.q/.15,2.))*pose.fluid;contact[1]+=Math.exp(-Math.pow((1-pose.q)/.16,2.))*pose.fluid;airborne+=pose.fluid;}
   }
   s.mesh.geometry.getAttribute('position').needsUpdate=true;s.mesh.geometry.getAttribute('fluid').needsUpdate=true;s.mesh.geometry.getAttribute('transit').needsUpdate=true;shadowPos.needsUpdate=true;
   glowPos.needsUpdate=true;glows[index].visible=!reduced;shadows[index].visible=!reduced;
  });
  const sampleCount=surfaces.reduce((sum,s)=>sum+Math.ceil(s.fluids.length/16),0);
  gates.forEach((g,i)=>{
   const c=contact[i]/sampleCount,at=portalTiming(style).returnAt;
   const open=warped?(i?smooth(at,at+.08,t):smooth(.12,.23,t)):(i?smooth(.40,.66,t):smooth(.04,.16,t));
   const close=warped?(i?smooth(.83,.96,t):smooth(.37,.46,t)):(i?smooth(.91,1,t):smooth(.48,.72,t));
   g.mesh.visible=!reduced;g.mat.uniforms.power.value=open*(1-close)*(.25+Math.min(.75,c*14));g.mat.uniforms.time.value=t*ms/1000;g.mat.uniforms.arrival.value=Math.min(1,c*12);
   g.mesh.scale.set(unit*(warped?.26:1.65)*(1+c*.5),unit*(warped?1.55:2.05)*(1+c*.5),1);
   if(warped){g.mesh.position.y=unit*.40;g.mesh.rotation.x=-Math.PI/2+.30;g.mesh.rotation.z=style===1?-.18:0;g.light.mesh.scale.set(unit*.42,unit*1.8,1);}
   g.light.mesh.visible=!reduced;g.light.mat.uniforms.power.value=c*.5;
  });
  // Deterministic fragments detach from actual moving UV positions and inherit their velocity.
  for(let i=0;i<42;i++){
   const packet=i%n,strip=i%strips,seed=(i*.61803398875)%1,born=.20+seed*.52,age=(t-born)/.12;
   const u=.10+((i*.381966)%1)*.8,v=(strip+((i*.723)%1))/strips;
   position(born,u,v,packet,strip,p);const before=new T.Vector3();position(born-.007,u,v,packet,strip,before);
   const hidden=warped&&(p.x>a.x+unit*.96&&p.x<b.x-unit*1.04);
   const crossedCut=warped&&Math.abs(p.x-before.x)>unit*.5;
   const valid=age>0&&age<1&&!hidden&&!crossedCut,life=valid?Math.sin(age*Math.PI):0;
   dummy.position.copy(p).addScaledVector(p.clone().sub(before),sat(age)*7);dummy.position.y+=unit*Math.sin(sat(age)*Math.PI)*.055;if(warped&&dummy.position.x>a.x+unit*1.02&&dummy.position.x<b.x-unit*1.10)dummy.position.copy(p);
   dummy.rotation.set(i+age,i*.42,i*2.4);dummy.scale.set(unit*.012*life,unit*.034*life,unit*.008*life);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);
  }shards.instanceMatrix.needsUpdate=true;shards.visible=!reduced;
  root.dataset.materialTransfer=String(Math.round(airborne/sampleCount*1000));
 }
 let frame=0,finish=()=>{};
 try{
  update(0);await warm();if(signal.aborted||!root.isConnected)return false;
  source.classList.add('is-shuffling');target.classList.add('is-shuffling');clock.active=true;root.dataset.connectedStudyActive=study.id;
  await new Promise<void>(resolve=>{
   let previous=performance.now(),done=false;
   finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};signal.addEventListener('abort',finish,{once:true});
   const tick=(now:number)=>{if(signal.aborted||!root.isConnected){finish();return;}const dt=warped?now-previous:Math.min(60,now-previous);previous=now;if(!clock.paused)clock.time+=dt*clock.speed;const t=sat(clock.time/(reduced?160:ms));update(t);if(t>=1&&!clock.paused)finish();else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  });
  if(signal.aborted||!root.isConnected)return false;
  target.dataset.count=String(count);source.dataset.count='0';source.querySelector('.pile-print')?.remove();delete source.dataset.face;
  for(const el of [source,target]){const counter=el.querySelector('.pile-count');if(counter)counter.textContent=el.dataset.count!;}refresh();return true;
 }finally{
  finish();clock.active=false;source.classList.remove('is-shuffling');target.classList.remove('is-shuffling');for(const key of ['shufflePhase','connectedStudyActive','materialTransfer'])delete root.dataset[key];
  world.removeFromParent();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();world.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
}
