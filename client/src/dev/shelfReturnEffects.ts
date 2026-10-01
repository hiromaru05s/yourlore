/** Local-only studies. Shared board camera, furniture, sleeves and public counts.
 * Visual layer indices never represent the shuffled deck's hidden order. */
import * as T from 'three';
import {cardStock} from '../ui/pileModels';
import {layoutRect,boardLens} from '../ui/boardProjection';
import {pileCenter,STOCK_THICKNESS} from '../ui/readingBoardLayout';

export const RETURN_STUDIES = [
  {id:'gilded',name:'金箔のリボン',en:'GILDED RIBBON',ms:2200,color:'#cf922b',description:'紙束がほどけ、金の帯に沿って帰還。最後の一枚が静かに揃う。'},
  {id:'gates',name:'双環ゲート',en:'TWIN GATES',ms:2050,color:'#548fc8',description:'二つの環が呼応。カードがゲートをくぐり、デッキ側へ一枚ずつ現れる。'},
  {id:'orbit',name:'星図のオービット',en:'CELESTIAL ORBIT',ms:2550,color:'#8070c3',description:'二重の螺旋にカードが乗り、星の軌跡を引いて一つの束へ収束。'},
  {id:'leaves',name:'ページ・カスケード',en:'PAGE CASCADE',ms:2300,color:'#329e93',description:'扇状に開いたカードが、ページをめくるリズムで連続して重なる。'},
  {id:'prism',name:'光片のリビルド',en:'PRISM REBUILD',ms:2100,color:'#497fc5',description:'束が光の薄片へ分かれ、一本の流れとなり、輪郭から実体へ戻る。'},
] as const;
export type ReturnVariant=typeof RETURN_STUDIES[number]['id'];
export const previewClock={speed:1,paused:false,time:0,active:false};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const envelope=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const TAU=Math.PI*2;
import type {ShelfReturnArgs} from '../ui/shelfReturn';
export type {ShelfReturnArgs} from '../ui/shelfReturn';
type Surface={material:T.MeshBasicMaterial|T.MeshStandardMaterial;color:T.Color};
type Actor={group:T.Group;surfaces:Surface[]};

/** Pure poses: deterministic scrubbing, precise endpoints, stagger independent of count. */
export function returnPose(variant:ReturnVariant,t:number,i:number,n:number){
  const order=(n-1-i)/Math.max(1,n-1),q=clamp((t-.13-order*.19)/.57),s=q*q*(3-2*q),arc=Math.sin(Math.PI*q);
  const anticipation=envelope(0,.09,.13+order*.19,.26+order*.19,t);
  let travel=s,lift=arc*1.4,side=0,roll=0,tilt=-arc*.16,alpha=1,scale=1,glow=arc*.18;
  if(variant==='gilded') {lift=arc*(1.20+order*.22);side=arc*Math.sin(q*Math.PI*1.5+order)*.30;roll=arc*(order-.5)*.30;}
  if(variant==='gates') {
    travel=q<.5?0:1;lift=arc*.38;side=0;
    const vanish=ease(.23,.44,q),appear=ease(.55,.75,q);
    alpha=q<.5?1-vanish:appear;scale=q<.5?1-vanish*.6:.4+appear*.6;
    tilt=arc*.65;glow=envelope(.05,.2,.75,1,q);
  }
  if(variant==='orbit') {const angle=q*TAU+i*2.399963;lift=arc*(1.25+.58*Math.cos(angle));side=arc*Math.sin(angle)*.95;roll=arc*Math.cos(angle)*.5;tilt=arc*Math.sin(angle)*.32;}
  if(variant==='leaves') {travel=ease(.08,.91,q);lift=arc*(1.8+order*.25);side=arc*(order-.5)*.9;tilt=Math.sin(q*Math.PI)*-.95;roll=arc*(order-.5)*.75;}
  if(variant==='prism') {
    travel=q<.45?0:1;const dissolve=ease(.05,.34,q),rebuild=ease(.50,.86,q);
    alpha=q<.45?1-dissolve:rebuild;lift=q<.45?dissolve*(.15+order*.45):(1-rebuild)*(.6+order*.3);
    scale=q<.45?1:mix(.87,1,rebuild);glow=envelope(0,.12,.82,1,q);
  }
  // A tiny damped settling motion, with exact return to the furniture mount.
  const settle=clamp((q-.9)/.1),bounce=Math.sin(settle*Math.PI)*.025;
  return {travel,lift:lift+anticipation*.10+bounce,side,roll,tilt,alpha,scale,glow,q};
}

function makeActor(sleeve:T.Texture,face?:T.Texture):Actor {
  const group=cardStock(sleeve,face),surfaces:Surface[]=[];
  group.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof T.MeshBasicMaterial||material instanceof T.MeshStandardMaterial){material.transparent=true;surfaces.push({material,color:material.color.clone()});}});
  return {group,surfaces};
}
function coat(actor:Actor,alpha:number,glow:number,tint:T.Color){
  actor.group.visible=alpha>.003;
  for(const {material,color} of actor.surfaces){material.opacity=alpha;material.color.copy(color).lerp(tint,glow*.65);if(material instanceof T.MeshStandardMaterial){material.emissive.copy(tint);material.emissiveIntensity=glow;}}
}

/** Three-tone ribbon: saturated contour, bright center, fine specular spine.
 * Normal alpha blending keeps the silhouette readable on the white board. */
function ribbon(group:T.Group,color:T.Color,segments=64){
  const geometry=new T.BufferGeometry(),positions=new Float32Array((segments+1)*6),uv=new Float32Array((segments+1)*4),indices:number[]=[];
  for(let j=0;j<=segments;j++){uv.set([j/segments,0,j/segments,1],j*4);if(j<segments){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms:{tint:{value:color},alpha:{value:1},clock:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float alpha,clock;
      void main(){float edge=abs(vUv.y-.5)*2.;float core=1.-smoothstep(.1,.42,edge);
      float spine=1.-smoothstep(.025,.11,abs(vUv.y-.42));
      vec3 c=mix(tint,mix(tint,vec3(1.),.76),core);c=mix(c,vec3(1.,.98,.89),spine*.8);
      float ends=smoothstep(0.,.10,vUv.x)*(1.-smoothstep(.85,1.,vUv.x));
      float breaks=step(.045,fract(vUv.x*7.-clock*.7));
      gl_FragColor=vec4(c,alpha*ends*(1.-smoothstep(.72,1.,edge))*mix(.5,1.,breaks));
      #include <colorspace_fragment>
    }`});
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);
  const p=new T.Vector3(),next=new T.Vector3(),tangent=new T.Vector3(),normal=new T.Vector3(),view=new T.Vector3(0,Math.cos(boardLens().angle),Math.sin(boardLens().angle));
  return {mesh,update(path:(s:number,out:T.Vector3)=>void,width:number,alpha:number,time:number){
    mesh.visible=alpha>.002;if(!mesh.visible)return;
    for(let j=0;j<=segments;j++){const s=j/segments;path(s,p);path(Math.min(1,s+.001),next);if(j===segments){path(s-.001,next);tangent.subVectors(p,next);}else tangent.subVectors(next,p);
      normal.crossVectors(tangent,view).normalize();if(normal.lengthSq()<.1)normal.set(0,1,0);
      const w=width*Math.pow(Math.sin(Math.PI*s),.7)*(.8+.2*Math.sin(s*14+time*4));
      positions.set([p.x+normal.x*w,p.y+normal.y*w,p.z+normal.z*w,p.x-normal.x*w,p.y-normal.y*w,p.z-normal.z*w],j*6);
    }
    geometry.attributes.position.needsUpdate=true;material.uniforms.alpha.value=alpha;material.uniforms.clock.value=time;
  }};
}
function ring(group:T.Group,color:T.Color){
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms:{tint:{value:color},alpha:{value:0},clock:{value:0},broken:{value:0}},
    vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 p;uniform vec3 tint;uniform float alpha,clock,broken;void main(){
      float r=length(p),a=atan(p.y,p.x);float band=1.-smoothstep(.013,.031,abs(r-.79));
      float fine=1.-smoothstep(.003,.009,abs(r-.94));float inner=1.-smoothstep(.005,.014,abs(r-.63));
      float ticks=step(.79,fract(a/6.283185*24.+clock*.13))*step(.83,r)*step(r,.91);
      float cut=step(broken*.7,fract(a/6.283185*7.+clock*.09));
      float halo=exp(-abs(r-.79)*30.)*.20;
      float pool=(1.-smoothstep(.52,.76,r))*.1;
      float shape=max(max(band,fine*.8),max(inner*.55,ticks))+halo+pool;
      vec3 c=mix(tint,vec3(.94,.97,1.),band*.65);gl_FragColor=vec4(c,shape*alpha*cut);
      #include <colorspace_fragment>
    }`});
  const mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);group.add(mesh);
  return {mesh,update(alpha:number,time:number,broken=0){mesh.visible=alpha>.002;material.uniforms.alpha.value=alpha;material.uniforms.clock.value=time;material.uniforms.broken.value=broken;}};
}
function shadow(group:T.Group){
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{alpha:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvv;uniform float alpha;void main(){vec2 p=(uvv-.5)*2.;float a=exp(-dot(p,p)*3.8)*(1.-smoothstep(.6,1.,length(p)));gl_FragColor=vec4(.09,.12,.19,a*alpha);}'});
  const mesh=new T.Mesh(new T.PlaneGeometry(1.5,2.1),material);mesh.rotation.x=-Math.PI/2;group.add(mesh);return {mesh,material};
}

export async function playShelfReturn(args:ShelfReturnArgs):Promise<boolean>{
  if((args.root.dataset.shelfReturnVariant?.startsWith('linked-')||args.root.dataset.shelfReturnVariant?.startsWith('portal-')))return (await import('./connectedReturnEffects')).playConnectedReturn(args);
  if(args.root.dataset.shelfReturnVariant?.startsWith('gate-'))return (await import('./gateReturnEffects')).playGateReturn(args);
  const {root,scene,source,target,count,unit,cx,cy,texture,face,signal,warm,refresh}=args;
  const study=RETURN_STUDIES.find(s=>s.id===root.dataset.shelfReturnVariant);if(!study||count<1||signal.aborted)return false;
  const variant=study.id,accent=study.color,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const a=layoutRect(source),b=layoutRect(target),start=new T.Vector3(a.left+a.width/2-cx,0,a.top+a.height/2-cy),end=new T.Vector3(b.left+b.width/2-cx,0,b.top+b.height/2-cy);
  const world=new T.Group();world.name='shelf-return-study';scene.add(world);
  const tint=new T.Color(study.color),n=Math.min(9,count),height=(Math.min(count,40)-1)*STOCK_THICKNESS;
  const cards=Array.from({length:n},(_,i)=>{const c=makeActor(texture(target.dataset.sleeve!),i===n-1?face:undefined);world.add(c.group);c.group.scale.setScalar(unit);return c;});
  const shadows=cards.map(()=>shadow(world));
  const outlines=cards.map(c=>{
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
      uniforms:{tint:{value:tint},charge:{value:0}},
      vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 uvv;uniform vec3 tint;uniform float charge;void main(){
        vec2 p=(uvv-.5)*vec2(1.,1.5625);vec2 q=abs(p)-vec2(.36,.64);
        float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.10;
        float rim=1.-smoothstep(.006,.023,abs(d));
        float halo=exp(-abs(d)*45.)*.23;
        float scan=(1.-smoothstep(.015,.065,abs(uvv.y-charge)))*step(d,0.)*.40;
        gl_FragColor=vec4(mix(tint,vec3(.95,.99,1.),rim*.85),(rim+halo+scan)*charge);
        #include <colorspace_fragment>
      }`});
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1.5625),material);mesh.position.z=STOCK_THICKNESS/2+.004;c.group.add(mesh);return material;
  });
  // Separate face/back rotation: only the public top discard can expose a face.
  const bands=Array.from({length:variant==='orbit'?3:2},()=>ribbon(world,tint));
  const seals=[ring(world,tint),ring(world,tint)],impacts=[ring(world,tint),ring(world,tint)];
  seals.forEach((r,i)=>{r.mesh.position.copy(i?end:start);r.mesh.position.y=unit*.12;r.mesh.rotation.x=-Math.PI/2;});
  impacts.forEach(r=>{r.mesh.position.copy(end);r.mesh.position.y=unit*.13;r.mesh.rotation.x=-Math.PI/2;});
  const particleGeo=new T.OctahedronGeometry(1,0),particleMaterial=new T.MeshBasicMaterial({color:tint,transparent:true,depthWrite:false,toneMapped:false});
  const particles=new T.InstancedMesh(particleGeo,particleMaterial,variant==='prism'?100:44);particles.frustumCulled=false;world.add(particles);
  const dummy=new T.Object3D();
  for(let i=0;i<particles.count;i++)particles.setColorAt(i,new T.Color(i%5===0?'#fff8dc':accent));
  const path=(p:number,out:T.Vector3,twist=0)=>{
    const arc=Math.sin(p*Math.PI),r=variant==='orbit'?.50:.24;
    out.copy(start).lerp(end,p);out.y=unit*(.35+arc*(variant==='leaves'?1.9:1.25)+Math.cos(p*TAU+twist)*arc*r);
    out.z+=unit*arc*(Math.sin(p*TAU+twist)*(variant==='orbit'?.85:.48)+(variant==='gilded'?(twist?-.62:.62):0));
  };
  function update(t:number){
    root.dataset.shufflePhase=t<.15?'予備動作':t<.72?'帰還':t<.9?'再構成':'定着';root.dataset.shelfReturnTime=t.toFixed(4);
    const active=envelope(.02,.17,.76,.99,t),move=envelope(.12,.25,.71,.94,t);
    cards.forEach((c,i)=>{
      const p=returnPose(variant,t,i,n),h=(n===1?0:i/(n-1)*height),y=mix(pileCenter(1,true),pileCenter(1,false),p.travel)+h;
      c.group.position.copy(start).lerp(end,p.travel);c.group.position.y=unit*(y+p.lift);c.group.position.z+=unit*p.side;
      c.group.rotation.set(-Math.PI/2+p.tilt,0,p.roll);
      // Flip the public face underneath once airborne, preserving a sleeve-up deck.
      if(i===n-1&&face)c.group.rotation.x+=Math.PI*ease(.12,.62,p.q);
      c.group.scale.set(unit*p.scale,unit*p.scale,unit*p.scale);coat(c,p.alpha,p.glow,tint);
      outlines[i].uniforms.charge.value=['prism','gates'].includes(variant)?p.glow*p.alpha:0;
      c.group.children[c.group.children.length-1].visible=!reduced&&outlines[i].uniforms.charge.value>.002;
      const sh=shadows[i];sh.mesh.visible=!reduced;sh.mesh.position.copy(c.group.position);sh.mesh.position.y=unit*.085;sh.mesh.scale.setScalar(unit*(1+p.lift*.32));sh.material.uniforms.alpha.value=p.alpha*.17/(1+p.lift*2);
    });
    bands.forEach((band,k)=>{
      const head=ease(.12,.70,t),tail=ease(.35,.92,t),twist=k*Math.PI;
      band.update((s,out)=>{const p=mix(tail,head,s);path(p,out,twist);if(variant==='gates'){out.y=unit*(.4+Math.sin(p*Math.PI)*.2);out.z+=unit*(k?-.12:.12);}if(variant==='prism')out.y+=unit*Math.sin(p*Math.PI*3+twist)*.08;},unit*(variant==='prism'?.13:variant==='gates'?.055:.12)*(1+k*.16),move*(variant==='leaves'?.42:.92),t);
    });
    seals.forEach((r,i)=>{
      const onset=i?(variant==='gates'?.16:.40):.01,ending=i?.95:(variant==='gates'?.65:.55),v=envelope(onset,onset+.12,ending-.05,ending+.05,t);
      r.mesh.scale.setScalar(unit*(variant==='gates'?1.15:variant==='orbit'?1.10:.84)*(.72+.28*ease(onset,onset+.14,t)));
      r.mesh.rotation.z=(i?-1:1)*t*.7;
      if(variant==='gates'){r.mesh.rotation.x=-Math.PI/2+.62;r.mesh.position.y=unit*.38;}else r.mesh.position.y=unit*.11;
      r.update(v*(['gates','orbit'].includes(variant)?.85:0),t*(i?-1:1),ease(ending-.1,ending+.05,t));
    });
    impacts.forEach((r,k)=>{const q=clamp((t-.76-k*.04)/(.21-k*.015)),v=Math.sin(Math.PI*q)*(1-q);r.mesh.scale.setScalar(unit*(.6+q*(1.1+k*.3)));r.update(v*(variant==='leaves'?0:(k?.50:.9)),t+k, q);});
    for(let i=0;i<particles.count;i++){
      const seed=(i*.61803398875)%1,local=clamp((t-.14-seed*.26)/.49),arc=Math.sin(Math.PI*local),angle=i*2.399963+local*5;
      path(local,dummy.position,i%2*Math.PI);const scatter=variant==='prism'?.36:.53;
      dummy.position.y+=Math.cos(angle)*unit*scatter*arc;dummy.position.z+=Math.sin(angle)*unit*scatter*arc;
      const visible=envelope(0,.1,.87,1,local),size=unit*(variant==='prism'?.036:.018)*visible*(.6+seed*.7);
      dummy.scale.set(size,variant==='prism'?size*(2+seed*3):size*1.8,size*.45);dummy.rotation.set(angle,angle*.5,angle*.3);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate=true;if(particles.instanceColor)particles.instanceColor.needsUpdate=true;particleMaterial.opacity=active*.87;
    if(reduced){bands.forEach(r=>r.mesh.visible=false);seals.forEach(r=>r.mesh.visible=false);impacts.forEach(r=>r.mesh.visible=false);particles.visible=false;cards.forEach((c,i)=>{c.group.position.copy(t<.5?start:end);c.group.position.y=unit*(pileCenter(1,t<.5)+(n===1?0:i/(n-1)*height));c.group.rotation.set(t<.5?-Math.PI/2:Math.PI/2,0,0);coat(c,Math.abs(t-.5)*2,0,tint);});}
  }
  let frame=0,finish=()=>{};
  try{
    update(0);await warm();if(signal.aborted||!root.isConnected)return false;
    source.classList.add('is-shuffling');target.classList.add('is-shuffling');previewClock.active=true;
    await new Promise<void>(resolve=>{
      let previous=performance.now(),done=false;
      finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
      signal.addEventListener('abort',finish,{once:true});
      const tick=(now:number)=>{
        if(signal.aborted||!root.isConnected){finish();return;}
        const delta=Math.min(60,now-previous);previous=now;
        if(!previewClock.paused)previewClock.time+=delta*previewClock.speed;
        const t=clamp(previewClock.time/(reduced?160:study.ms));update(t);
        if(t>=1&&!previewClock.paused)finish();else frame=requestAnimationFrame(tick);
      };frame=requestAnimationFrame(tick);
    });
    if(signal.aborted||!root.isConnected)return false;
    target.dataset.count=String(count);source.dataset.count='0';source.querySelector('.pile-print')?.remove();delete source.dataset.face;
    for(const el of [source,target]){const counter=el.querySelector('.pile-count');if(counter)counter.textContent=el.dataset.count!;}
    refresh();return true;
  }finally{
    finish();previewClock.active=false;source.classList.remove('is-shuffling');target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;
    world.removeFromParent();world.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  }
}
