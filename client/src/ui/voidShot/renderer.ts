import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {cutCrystal} from './fracture';
export type Point={x:number,y:number};
export type Scene={source:Point,target:Point,unit:number,count:number,spell?:Point};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const phase=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const ease=(t:number)=>t*t*(3-2*t);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const hash=(n:number)=>{const x=Math.sin(n*71.37+18.4)*43781.37;return x-Math.floor(x);};
const originalShape=[[-.30,-.34],[-.15,-.38],[.23,-.38],[.30,-.30],[.30,.30],[.23,.38],[-.15,.38],[-.30,.34]];
const lanceShape=[[-.75,-.20],[-.47,-.34],[.50,-.21],[1.10,-.025],[1.15,0],[.48,.22],[-.46,.34],[-.75,.19]];

type Plate={node:T.Group,body:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>,core:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>};
export class Renderer{
 private scene=new T.Scene();private root=new T.Group();private camera=new T.OrthographicCamera(0,1,1,0,.1,3000);
 private outputs=new Map<HTMLCanvasElement,T.WebGLRenderer[]>();private slots=new WeakMap<HTMLCanvasElement,number>();
 private plates:Plate[]=[];private textures:T.Texture[]=[];private materials:T.Material[]=[];
 private env:T.CanvasTexture;private bodyMats:T.MeshPhysicalMaterial[];private innerMat:T.MeshPhysicalMaterial;
 private shards:{node:T.Group,cx:number,index:number,part:number}[]=[];private shardKey='';
 private pulse=new T.PointLight(0xb898ff,0,600,2);
 constructor(){
  this.camera.position.z=1000;this.root.matrixAutoUpdate=false;this.scene.add(this.root);
  this.env=this.environment();this.scene.environment=this.env;
  this.scene.add(new T.HemisphereLight(0xd8d4ef,0x151321,1.5));
  const key=new T.DirectionalLight(0xffefd9,4.0);key.position.set(-400,450,700);this.scene.add(key);
  const rim=new T.DirectionalLight(0xa4baff,3.4);rim.position.set(300,-200,400);this.scene.add(rim);
  this.scene.add(this.pulse);
  this.bodyMats=[new T.MeshPhysicalMaterial({color:0x44375f,metalness:.12,roughness:.10,clearcoat:1,clearcoatRoughness:.07,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.55,iridescence:.26,iridescenceIOR:1.35})];
  this.innerMat=new T.MeshPhysicalMaterial({color:0x242443,metalness:.42,roughness:.17,clearcoat:1,emissive:0x37205c,emissiveIntensity:.4});
  this.materials.push(...this.bodyMats,this.innerMat);
  for(let i=0;i<24;i++){
   const node=new T.Group(),body=new T.Mesh(this.geometry(),this.bodyMats[0]),core=new T.Mesh(this.geometry(),this.innerMat);
   node.add(body,core);this.root.add(node);this.plates.push({node,body,core});
  }
 }
 private environment(){const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const c=cv.getContext('2d')!;const g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,'#737085');g.addColorStop(.48,'#171822');g.addColorStop(.53,'#544553');g.addColorStop(1,'#12131b');c.fillStyle=g;c.fillRect(0,0,1024,512);
  for(const [x,y,w,h,col] of [[170,90,100,250,'#fff4dc'],[610,50,35,360,'#d7deff'],[830,210,170,80,'#7e7195'],[340,280,240,30,'#b5aaaf']] as const){c.fillStyle=col;c.fillRect(x,y,w,h);}
  const tex=new T.CanvasTexture(cv);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);return tex;}
 // Four eight-point rings close every plate, including its underside. Bevels catch actual light.
 private geometry(){const g=new T.BufferGeometry();const indices:number[]=[];
  for(let r=0;r<3;r++)for(let j=0;j<8;j++){const a=r*8+j,b=r*8+(j+1)%8,d=(r+1)*8+j,e=(r+1)*8+(j+1)%8;indices.push(a,b,e,a,e,d);}
  for(let j=1;j<7;j++){indices.push(0,j+1,j);}
  for(let j=0;j<8;j++)indices.push(32,24+j,24+(j+1)%8);g.setIndex(indices);g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(99),3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(66),2));return g;}
 private shape(g:T.BufferGeometry,q:number,thickness:number,bevel:number,scale=1,variant=0,bend=0){const a=g.getAttribute('position') as T.BufferAttribute,uv=g.getAttribute('uv') as T.BufferAttribute;
  for(let ring=0;ring<4;ring++)for(let i=0;i<8;i++){const inset=ring===0||ring===3?1-bevel:1;const profile=variant===2?[[-.8,-.08],[-.5,-.30],[.20,-.23],[.85,-.06],[1.15,0],[.20,.23],[-.5,.30],[-.8,.08]]:lanceShape;const x=mix(originalShape[i][0],profile[i][0],q)*scale;let y=mix(originalShape[i][1],profile[i][1],q)*scale;if(variant===1)y*=.74;
   const z=[-thickness*.5,-thickness*.5+bevel*.30,thickness*.5-bevel*.30,thickness*.5][ring];const taper=Math.pow(clamp(x/1.15/scale),1.4)*q;a.setXYZ(ring*8+i,x*inset,y*inset,z*(1-taper*.94)+bend*taper);uv.setXY(ring*8+i,(x+.8)/2,(y+.4)/.8);}
  a.setXYZ(32,-.16*scale,0,thickness*(variant===2?1.25:variant===1?.9:.68));uv.setXY(32,.32,.5);a.needsUpdate=true;uv.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
 clearCanvas(canvas:HTMLCanvasElement){this.slots.set(canvas,0);for(const gl of this.outputs.get(canvas)??[])gl.domElement.style.display='none';}
 private output(canvas:HTMLCanvasElement){const i=this.slots.get(canvas)??0;this.slots.set(canvas,i+1);let list=this.outputs.get(canvas);if(!list){list=[];this.outputs.set(canvas,list);}let gl=list[i];if(!gl){gl=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});gl.setClearColor(0,0);gl.outputColorSpace=T.SRGBColorSpace;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.15;list.push(gl);const el=gl.domElement;el.className='void-shot-gpu';el.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';el.setAttribute('aria-hidden','true');if(canvas.style.position==='fixed'){el.style.position='fixed';el.style.zIndex='181';canvas.after(el);}else{let wrapper=canvas.parentElement!;if(!wrapper.classList.contains('barrage-surface')){wrapper=document.createElement('div');wrapper.className='barrage-surface';wrapper.style.cssText='position:relative;min-width:0';canvas.before(wrapper);wrapper.append(canvas);}wrapper.append(el);}}
  gl.domElement.style.display='block';return gl;}
 draw(c:CanvasRenderingContext2D,t:number,s:Scene){if(t<=0||t>=3600||s.count<=0)return;
  const u=s.unit,d=Math.max(.1,Math.hypot(s.target.x-s.source.x,s.target.y-s.source.y)/u),dx=(s.target.x-s.source.x)/(d*u),dy=(s.target.y-s.source.y)/(d*u);
  const dpr=Math.abs(c.getTransform().a),w=Math.round(c.canvas.width/dpr),h=Math.round(c.canvas.height/dpr),gl=this.output(c.canvas);if(gl.domElement.width!==w||gl.domElement.height!==h)gl.setSize(w,h,false);gl.domElement.style.transform=c.getTransform().a<0?'rotate(180deg)':'';
  this.camera.right=w;this.camera.top=h;this.camera.bottom=0;this.camera.updateProjectionMatrix();
  this.root.matrix.set(dx*u,-dy*.75*u,0,s.source.x,-dy*u,-dx*.75*u,.65*u,h-s.source.y,0,.66*u,.76*u,0,0,0,0,1);
  this.root.matrixWorldNeedsUpdate=true;
  for(const shard of this.shards)shard.node.visible=false;
  const v:number=2,power=.4+.63*Math.log2(1+Math.min(s.count,120))/Math.log2(25),n=Math.min(24,s.count),compress=ease(phase(t,1050,1500)),fly=phase(t,1670,2150),travel=Math.pow(fly,2.3),impact=phase(t,2150,2950);
  // Preserve original anticipation / compression / launch clock. Count becomes visible depth.
  const len=(1+.65*compress)*power,tip=len*1.15+.04*power,x=.65+(d-.65-tip)*travel;
  for(let i=0;i<24;i++){const plate=this.plates[i];plate.node.visible=i<n&&t<2950&&!(v===2&&t>=2150);if(!plate.node.visible)continue;
   const born=ease(phase(t,230+i*22,750+i*24));if(born<=0){plate.node.visible=false;continue;}
   const f=n===1?0:i/(n-1)-.5,thick=(v===0?.085:v===1?.095:.12)*power;
   const spacing=(.90*(1-compress)+Math.max(n*.083,.23)*compress)*power;
   const emerge=ease(phase(born,0,.8)),morph=ease(phase(born,.12,.94));
   let py=f*spacing*(v===1?1.1:.22),pz=.52+f*spacing;
   let roll=(1-emerge)*(v===1?(i%2?1:-1)*1.1:.65)+Math.sin(t*.0015+i*.6)*.04*(1-compress);
   if(v===1){py=(i%2?1:-1)*(.32*(1-compress)+.06)*power;pz=.35+Math.floor(i/2)*.14*power;roll+=(i%2?1:-1)*(.22*(1-compress)+.08);}
   if(v===2){py=Math.sin(i*2.4)*.18*power*(1-compress);roll+=(1-compress)*Math.sin(i*1.1)*.28;}
   let px=mix(0,x,emerge)-Math.sin(phase(t,1440,1710)*Math.PI)*.13;
   pz=(pz*emerge)*(1-fly);py*=1-fly*.85;
   if(t>=2150){const a=i/Math.max(n,6)*Math.PI*2,k=Math.sin(Math.min(1,impact*3)*Math.PI*.5);px=d+Math.cos(a)*k*.6*power;py=Math.sin(a)*k*.55*power;pz=Math.sin(impact*Math.PI)*.26;roll+=impact*(i%2?1:-1)*1.8;}
   plate.node.position.set(px,py,pz);plate.node.rotation.set(roll,(1-emerge)*-.4,(1-emerge)*(i%2?-.16:.16));
   const finish=(t>=2150?Math.pow(1-impact,1.8):1)*ease(phase(born,0,.22));plate.node.scale.set(len*finish,Math.max(.1,power)*finish,finish);
   plate.body.material=this.bodyMats[0];
   this.shape(plate.body.geometry,morph,thick*(.45+.55*emerge),v===1?.12:.10,1,v,-(pz-.45*emerge*(1-fly)));

   this.shape(plate.core.geometry,morph,thick*.42,.08,.66,v,-(pz-.45*emerge*(1-fly)));plate.core.visible=v===2;plate.core.position.z=0;
  }
  if(v===2&&t>=2150&&t<2850)this.fracture(t,n,power,len,d-tip);
  this.pulse.position.set(s.source.x,h-s.source.y+u*.6,70);this.pulse.intensity=7*Math.sin(phase(t,100,1650)*Math.PI);this.pulse.distance=u*4;
  this.shadow(c,s,x,dx,dy,power,t,compress,fly);if(fly>0&&fly<1){c.save();c.strokeStyle=`rgba(94,65,119,${Math.sin(fly*Math.PI)*.35})`;c.lineWidth=u*.09*power;c.lineCap='round';c.beginPath();c.moveTo(s.source.x+dx*(x-.3-travel*.8)*u,s.source.y+dy*(x-.3-travel*.8)*u);c.lineTo(s.source.x+dx*(x-.3)*u,s.source.y+dy*(x-.3)*u);c.stroke();c.restore();}this.source(c,s,t,power,v===2);gl.render(this.scene,this.camera);
 }
 private fracture(t:number,n:number,power:number,len:number,base:number){
  if(this.shardKey!==`${n}:${power}`){
   for(const shard of this.shards){shard.node.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.root.remove(shard.node);}this.shards=[];this.shardKey=`${n}:${power}`;
   const hull=this.geometry(),core=this.geometry();this.shape(hull,1,.12*power,.10,1,2);this.shape(core,1,.12*power*.42,.08,.66,2);
   for(let i=0;i<n;i++)for(let part=0;part<3;part++){
    const bounds=[-.9,-.24+(hash(i+101)-.5)*.10,.40+(hash(i+81)-.5)*.10,1.2],slopes=[0,.45+hash(i+40)*.30,-.45-hash(i+12)*.30,0];
    const cx=(bounds[part]+bounds[part+1])*.5,node=new T.Group();
    for(const [source,material]of [[hull,this.bodyMats[0]],[core,this.innerMat]] as const){const g=cutCrystal(source,bounds[part],bounds[part+1],slopes[part],slopes[part+1]);g.translate(-cx,0,0);node.add(new T.Mesh(g,material));}
    this.root.add(node);this.shards.push({node,cx,index:i,part});
   }hull.dispose();core.dispose();
  }
  for(const shard of this.shards){const {node,cx,index:i,part}=shard;
   // The tip fractures first. Every piece starts at its exact incoming position.
   const elapsed=t-2150,delay=(2-part)*30+hash(i+31)*22,a=Math.max(0,elapsed-delay),release=1-Math.exp(-a/120),life=phase(a,140,470+hash(i+8)*100),remain=Math.pow(1-life,1.5),sign=hash(i+part*17)>.5?1:-1;
   const side=sign*(.12+hash(i+part*7)*.42)*power*release;
   node.visible=remain>0;node.position.set(base+cx*len+(part===2?.36:-.18)*release*power,side,(.06+hash(i+9)*.30)*power*release-.22*power*phase(a,200,600)**2);
   node.rotation.set(sign*release*(.15+hash(i+3)*.65),release*(hash(i+part+1)-.5)*.40,sign*release*(.15+hash(i+part*7)*.4));
   node.scale.set(len*remain,power*remain,remain);
  }
 }
 private shadow(c:CanvasRenderingContext2D,s:Scene,x:number,dx:number,dy:number,p:number,t:number,compress:number,fly:number){if(t>=2950)return;const q=phase(t,2150,2950),u=s.unit;const px=t>=2150?s.target.x:s.source.x+dx*x*u,py=t>=2150?s.target.y:s.source.y+dy*x*u;
  c.save();c.translate(px,py);c.rotate(Math.atan2(dy,dx));c.scale(u*(.65+.25*compress)*p*(1-q),u*(.19+.09*(1-fly))*p*(1-q));const g=c.createRadialGradient(0,0,.08,0,0,1.2);g.addColorStop(0,'#130b214f');g.addColorStop(.6,'#1a10242a');g.addColorStop(1,'#130b2100');c.fillStyle=g;c.fillRect(-1.3,-1.3,2.6,2.6);c.restore();
 }
 private source(c:CanvasRenderingContext2D,s:Scene,t:number,p:number,crystal=false){const u=s.unit;const charge=Math.sin(phase(t,0,1670)*Math.PI);if(charge>0){c.save();c.translate(s.source.x,s.source.y);c.scale(u,u);const g=c.createRadialGradient(0,-.07,0,0,0,.65);g.addColorStop(0,`rgba(136,95,179,${charge*.25})`);g.addColorStop(1,'rgba(106,67,139,0)');c.fillStyle=g;c.fillRect(-.7,-.7,1.4,1.4);c.restore();}
  if(s.spell&&t<1050){const q=ease(phase(t,0,500));c.save();c.strokeStyle=`rgba(185,154,212,${1-phase(t,700,1050)})`;c.lineWidth=1.3;c.beginPath();c.moveTo(s.spell.x,s.spell.y);c.lineTo(mix(s.spell.x,s.source.x,q),mix(s.spell.y,s.source.y,q));c.stroke();c.restore();}
  if(t>=2150&&t<(crystal?2290:2410)){const a=1-phase(t,2150,crystal?2290:2410);c.save();c.translate(s.target.x,s.target.y);const g=c.createRadialGradient(0,0,0,0,0,u*.6*p);g.addColorStop(0,`rgba(238,217,255,${a*.85})`);g.addColorStop(.28,`rgba(148,112,218,${a*.35})`);g.addColorStop(1,'rgba(130,94,186,0)');c.fillStyle=g;c.fillRect(-u*p,-u*p,u*2*p,u*2*p);c.restore();}
 }
 dispose(){for(const shard of this.shards)shard.node.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});for(const list of this.outputs.values())for(const gl of list){gl.dispose();gl.forceContextLoss();gl.domElement.remove();}this.outputs.clear();for(const plate of this.plates)for(const m of [plate.body,plate.core])m.geometry.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();}
}
