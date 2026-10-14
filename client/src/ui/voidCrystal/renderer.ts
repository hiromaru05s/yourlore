import * as T from 'three';
import {DURATION,impactAt} from './catalog';
export type Point={x:number,y:number};
export type Scene={source:Point,target:Point,unit:number,count:number,reduced:boolean,spell?:Point};
type V=[number,number,number];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const phase=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
const ease=(n:number)=>n*n*(3-2*n);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const hash=(n:number)=>{const v=Math.sin(n*127.13+61.17)*41783.47;return v-Math.floor(v);};
const blend=(a:V,b:V,t:number):V=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
const TAU=Math.PI*2;

/** Selected crystal implosion uses real depth-tested meshes. Geometry is deterministic at any seek time. */
export class Renderer{
 private outputs=new Map<HTMLCanvasElement,T.WebGLRenderer[]>();private slots=new WeakMap<HTMLCanvasElement,number>();private scene=new T.Scene();private camera=new T.OrthographicCamera(0,1,0,1,.1,3000);
 private geo=new T.BufferGeometry();private edgeGeo=new T.BufferGeometry();private n=0;private en=0;
 private pos=new Float32Array(180000);private norm=new Float32Array(180000);private colors=new Float32Array(180000);private uv=new Float32Array(120000);private edges=new Float32Array(60000);private edgeColors=new Float32Array(60000);
 private glowGeo=new T.BufferGeometry();private glowPositions=new Float32Array(1800);private glowColors=new Float32Array(1800);private glowN=0;private glowMat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 private mat:T.MeshStandardMaterial;private edgeMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthWrite:false});private texture:T.CanvasTexture;
 private cardMeshes:T.Mesh[]=[];private cardMaterial:T.MeshStandardMaterial;private faceTexture:T.CanvasTexture;private recordTexture:T.CanvasTexture;
 private postContact=false;private viewHeight=1;private viewWidth=1;private s!:Scene;private u=1;private d=1;private dx=1;private dy=0;
 constructor(private face:CanvasImageSource,record:CanvasImageSource){
  this.camera.position.z=1000;
  this.glowGeo.setAttribute('position',new T.BufferAttribute(this.glowPositions,3));this.glowGeo.setAttribute('color',new T.BufferAttribute(this.glowColors,3));const glow=new T.Mesh(this.glowGeo,this.glowMat);glow.frustumCulled=false;glow.renderOrder=10;this.scene.add(glow);
  this.texture=new T.CanvasTexture(this.makeMaterial());this.texture.colorSpace=T.SRGBColorSpace;this.texture.wrapS=this.texture.wrapT=T.RepeatWrapping;
  this.mat=new T.MeshStandardMaterial({map:this.texture,vertexColors:true,metalness:.3,roughness:.48,side:T.DoubleSide});
  for(const [name,arr,size] of [['position',this.pos,3],['normal',this.norm,3],['color',this.colors,3],['uv',this.uv,2]] as const)this.geo.setAttribute(name,new T.BufferAttribute(arr,size).setUsage(T.DynamicDrawUsage));
  const mesh=new T.Mesh(this.geo,this.mat);mesh.frustumCulled=false;this.scene.add(mesh);
  this.edgeGeo.setAttribute('position',new T.BufferAttribute(this.edges,3).setUsage(T.DynamicDrawUsage));this.edgeGeo.setAttribute('color',new T.BufferAttribute(this.edgeColors,3).setUsage(T.DynamicDrawUsage));const lines=new T.LineSegments(this.edgeGeo,this.edgeMat);lines.frustumCulled=false;this.scene.add(lines);
  this.scene.add(new T.AmbientLight(0xc6bade,.7));this.scene.add(new T.HemisphereLight(0xd8d6fa,0x12091f,2.2));const key=new T.DirectionalLight(0xf1e2c9,3.8);key.position.set(-200,-400,700);this.scene.add(key);const rim=new T.DirectionalLight(0x7969e8,4);rim.position.set(250,180,150);this.scene.add(rim);
  this.faceTexture=new T.CanvasTexture(face as HTMLCanvasElement);this.faceTexture.colorSpace=T.SRGBColorSpace;this.recordTexture=new T.CanvasTexture(record as HTMLCanvasElement);this.recordTexture.colorSpace=T.SRGBColorSpace;
  this.cardMaterial=new T.MeshStandardMaterial({map:this.recordTexture,side:T.DoubleSide,roughness:.5,metalness:.25,transparent:true});
  for(let i=0;i<24;i++){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(18),3));g.setAttribute('uv',new T.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),2));const m=new T.Mesh(g,this.cardMaterial);m.frustumCulled=false;m.visible=false;this.scene.add(m);this.cardMeshes.push(m);}
 }
 clearCanvas(canvas:HTMLCanvasElement){this.slots.set(canvas,0);for(const gl of this.outputs.get(canvas)??[])gl.domElement.style.display='none';}
 private output(canvas:HTMLCanvasElement){const index=this.slots.get(canvas)??0;this.slots.set(canvas,index+1);let list=this.outputs.get(canvas);if(!list){list=[];this.outputs.set(canvas,list);}let gl=list[index];if(!gl){gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});gl.setClearColor(0,0);gl.outputColorSpace=T.SRGBColorSpace;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.35;list.push(gl);const el=gl.domElement;el.className='collapse-gpu';el.setAttribute('aria-hidden','true');el.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;margin:0;z-index:2';if(canvas.style.position==='fixed'){el.style.position='fixed';el.style.zIndex='181';canvas.after(el);}else{let wrapper=canvas.parentElement!;if(!wrapper.classList.contains('collapse-surface')){wrapper=document.createElement('div');wrapper.className='collapse-surface';wrapper.style.cssText='position:relative;display:block;min-width:0';canvas.before(wrapper);wrapper.append(canvas);}wrapper.append(el);}}gl.domElement.style.display='block';return gl;}
 private makeMaterial(){const a=document.createElement('canvas');a.width=a.height=512;const c=a.getContext('2d')!;c.fillStyle='#8e8398';c.fillRect(0,0,512,512);
  // Material strata have directional flow and interrupted incisions, never a particle overlay.
  for(let i=0;i<110;i++){const y=hash(i+8)*512;c.strokeStyle=`rgba(${i%3?'34,24,51':'218,208,222'},${.06+hash(i)*.17})`;c.lineWidth=.4+hash(i+99)*3;c.beginPath();c.moveTo(0,y);for(let x=0;x<=512;x+=16)c.lineTo(x,y+Math.sin(x*.014+i)*8+Math.sin(x*.049+i*2)*2);c.stroke();}
  c.globalAlpha=.14;c.drawImage(this.face,70,8,350,490);c.globalAlpha=1;return a;
 }
 private p(x:number,z:number,h=0):V{let px=this.s.source.x+(this.dx*x-this.dy*z*.64)*this.u,py=this.s.source.y+(this.dy*x+this.dx*z*.64)*this.u-h*this.u*.52;if(this.postContact){const tx=this.s.target.x,ty=this.s.target.y;const fit=(offset:number,available:number)=>offset*Math.min(1,Math.max(8,available)/(this.u*1.85));px=tx+fit(px-tx,px<tx?tx-8:this.viewWidth-tx-8);py=ty+fit(py-ty,py<ty?ty-8:this.viewHeight-ty-8);}return[px,py,h*this.u+z*.025];}
 private tri(a:V,b:V,c:V,color:V,uvScale=1){if(this.n+3>=this.pos.length/3)return;const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0];const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;for(const p of[a,b,c]){let k=this.n*3;this.pos.set(p,k);this.norm.set([nx,ny,nz],k);this.colors.set(color,k);this.uv.set([p[0]/this.u*.45*uvScale,p[1]/this.u*.45*uvScale],this.n*2);this.n++;}}
 private quad(a:V,b:V,c:V,d:V,color:V){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 private line(a:V,b:V,power=.5){if(this.en+2>=this.edges.length/3)return;for(const p of[a,b]){this.edges.set([p[0],p[1],p[2]+.2],this.en*3);this.edgeColors.set([.47*power,.42*power,.72*power],this.en*3);this.en++;}}
 private prism(points:V[],thick:number,color:V,accent=.2){const center:V=[0,0,0];for(const p of points)for(let j=0;j<3;j++)center[j]+=p[j]/points.length;const inset=points.map(p=>{const v=blend(p,center,.035);v[2]+=thick*.16;return v;});const back=points.map(p=>[p[0],p[1]+thick*.5,p[2]-thick] as V);for(let i=1;i<inset.length-1;i++)this.tri(inset[0],inset[i],inset[i+1],color);for(let i=0;i<points.length;i++){const j=(i+1)%points.length;this.quad(inset[i],points[i],points[j],inset[j],color.map(n=>n*1.18) as V);this.quad(points[i],back[i],back[j],points[j],color.map(n=>n*.52) as V);if(i%2===0)this.line(inset[i],inset[j],accent);}}
 private card(i:number,center:V,w:number,h:number,tilt:number,turn:number){const m=this.cardMeshes[i];if(!m)return;m.visible=true;const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[center[0]+Math.cos(turn)*x*w*.5-Math.sin(turn)*y*h*.5,center[1]+Math.sin(turn)*x*w*.5+Math.cos(turn)*y*h*.5*Math.cos(tilt),center[2]+y*h*.5*Math.sin(tilt)] as V);const arr=m.geometry.getAttribute('position') as T.BufferAttribute;[points[0],points[1],points[2],points[0],points[2],points[3]].forEach((v,j)=>arr.setXYZ(j,...v));arr.needsUpdate=true;m.geometry.computeVertexNormals();}
 private shadow(c:CanvasRenderingContext2D,x:number,z:number,rx:number,ry:number,opacity=.25){const p=this.p(x,z);c.save();c.translate(p[0],p[1]);c.rotate(Math.atan2(this.dy,this.dx));c.scale(rx*this.u,ry*this.u);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(14,5,29,${opacity})`);g.addColorStop(.7,`rgba(20,8,34,${opacity*.5})`);g.addColorStop(1,'rgba(20,8,34,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
 private source(c:CanvasRenderingContext2D,t:number){let opening=ease(phase(t,0,600))*(1-ease(phase(t,1250,2100)));if(!opening)return;this.shadow(c,0,0,.7,.36,.35*opening);c.save();c.translate(this.s.source.x,this.s.source.y);c.scale(this.u,this.u);c.fillStyle=`rgba(28,9,48,${opening})`;c.beginPath();c.ellipse(0,0,.47*opening,.2*opening,0,0,TAU);c.fill();c.strokeStyle=`rgba(177,150,218,${opening*.7})`;c.lineWidth=.018;c.beginPath();c.ellipse(0,0,.43*opening,.17*opening,0,.1,Math.PI*1.7);c.stroke();c.restore();if(this.s.spell&&t<640){const p=this.s.spell;const progress=ease(phase(t,0,400));c.save();c.globalAlpha=(1-phase(t,430,640))*.7;c.strokeStyle='#89709c';c.lineWidth=1.5;c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(mix(p.x,this.s.source.x,.4),p.y-this.u*.12,mix(p.x,this.s.source.x,progress),mix(p.y,this.s.source.y,progress));c.stroke();c.restore();}}
 draw(c:CanvasRenderingContext2D,variant:number,ms:number,s:Scene){if(ms<=0||ms>=DURATION||s.count<=0)return;this.s=s;this.u=s.unit;this.d=Math.hypot(s.target.x-s.source.x,s.target.y-s.source.y)/this.u;this.dx=(s.target.x-s.source.x)/(this.d*this.u);this.dy=(s.target.y-s.source.y)/(this.d*this.u);const hit=impactAt(variant);this.postContact=ms>=hit;if(s.reduced){this.reduced(c,ms,hit);return;}
  const dpr=Math.abs(c.getTransform().a)||1,w=c.canvas.width/dpr,h=c.canvas.height/dpr; // Scene coordinates remain in CSS pixels even on a mirrored board.
  this.viewWidth=w;this.viewHeight=h;const ww=Math.max(1,Math.round(w)),hh=Math.max(1,Math.round(h)),gl=this.output(c.canvas);if(gl.domElement.width!==ww||gl.domElement.height!==hh)gl.setSize(ww,hh,false);gl.domElement.style.transform=c.getTransform().a<0?"rotate(180deg)":"";this.camera.right=ww;this.camera.top=hh;this.camera.bottom=0;this.scene.scale.y=-1;this.scene.position.y=hh;this.camera.updateProjectionMatrix();this.n=0;this.en=0;this.glowN=0;for(const m of this.cardMeshes)m.visible=false;
  const power=.68+.38*Math.log2(1+s.count)/Math.log2(25);this.source(c,ms);
  if(ms<hit)this.enclosure(c,ms,power);else this.aftermath(c,variant,ms-hit,power);
  this.geo.setDrawRange(0,this.n);for(const a of Object.values(this.geo.attributes)){const b=a as T.BufferAttribute;b.clearUpdateRanges();b.addUpdateRange(0,this.n*b.itemSize);b.needsUpdate=true;}this.edgeGeo.setDrawRange(0,this.en);for(const a of Object.values(this.edgeGeo.attributes)){const b=a as T.BufferAttribute;b.clearUpdateRanges();b.addUpdateRange(0,this.en*3);b.needsUpdate=true;}
  this.glowGeo.setDrawRange(0,this.glowN);this.glowGeo.getAttribute('position').needsUpdate=true;this.glowGeo.getAttribute('color').needsUpdate=true;this.cardMaterial.opacity=1-ease(phase(ms,850,1550))*.9;gl.render(this.scene,this.camera);this.impact(c,ms,hit,variant,power);
 }
 private records(t:number,endpoints:V[],finish=1300){const n=Math.min(24,this.s.count);for(let i=0;i<n;i++){const q=ease(phase(t,120+i*19,finish+i*9)),dest=endpoints[i%endpoints.length];if(q<=0||t>1700)continue;const p=blend(this.p(0,0,.04+i*.035),dest,q);p[1]-=Math.sin(q*Math.PI)*this.u*(.35+hash(i)*.4);p[2]+=Math.sin(q*Math.PI)*this.u*.5;this.card(i,p,this.u*.31*(1-q*.25),this.u*.45*(1-q*.25),.5+q*.7,(hash(i+20)-.5)*.6+q*.2);}}
 private enclosure(c:CanvasRenderingContext2D,t:number,power:number){const grow=ease(phase(t,450,1900)),crush=ease(phase(t,2770,3220)),unravel=ease(phase(t,3250,4100));if(!grow||unravel===1)return;const radius=1.25*power*(1-crush*.97)*(1-unravel),cx=mix(this.d*.64,this.d,crush);this.shadow(c,cx,0,radius*1.2,radius*.65,.46*grow);const ends:V[]=[];
  // Eight hinged triangular shells form a hollow octahedron around the target's space.
  for(let face=0;face<8;face++){const sx=face&1?1:-1,sy=face&2?1:-1,sz=face&4?1:-1;const assemble=ease(phase(t,350+face*91,1400+face*69)),close=ease(phase(t,1750+face*33,2360+face*32));const vertices:V[]=[[sx*radius,0,0],[0,sy*radius*.88,0],[0,0,sz*radius*1.18]],middle:V=[sx*radius/3,sy*radius*.88/3,sz*radius*1.18/3];let shell:V[]=[];
   for(const v of vertices){const opening=(1-close)*.72;const x=v[0]+sx*radius*opening*.55,z=v[1]+sy*radius*opening*.4,h=v[2]+sz*radius*opening*.3;const dest=this.p(cx+x,z,radius*1.2+h);shell.push(blend(this.p(0,0,.025*face),dest,assemble));}const mid=blend(this.p(0,0,.02),this.p(cx+middle[0],middle[1],radius*1.2+middle[2]),assemble);ends.push(mid);
   for(let j=0;j<3;j++){const a=shell[j],b=shell[(j+1)%3];const inset=.045*(1-close)+.012;const points=[blend(a,mid,inset),blend(b,mid,inset),blend(mid,blend(a,b,.5),inset)];const shade=.16+hash(face*3+j)*.035;this.prism(points,this.u*.05,[shade*.78,shade*.69,shade*1.3],.36+crush*.7);}
  }this.records(t,ends,1600);
  if(t>3220&&t<3870){const q=phase(t,3220,3870);for(let i=0;i<8;i++){const a=i*2.399,r=q*1.3;const tip=this.p(this.d+Math.cos(a)*r,Math.sin(a)*r*.4,.03),base=this.p(this.d,0,.03);this.tri([base[0]-this.u*.02,base[1],base[2]],tip,[base[0]+this.u*.02,base[1],base[2]],[.14*(1-q),.09*(1-q),.2*(1-q)]);}}
 }
 private glowTri(a:V,b:V,c:V,color:V){for(const v of[a,b,c]){this.glowPositions.set(v,this.glowN*3);this.glowColors.set(color,this.glowN*3);this.glowN++;}}
 private aftermath(c:CanvasRenderingContext2D,_v:number,t:number,power:number){
  const release=phase(t,85,460),flight=1-Math.pow(1-release,4),fall=phase(t,460,1540),clean=ease(phase(t,1430,2530));
  this.shadow(c,this.d,0,(.15+flight*1.7)*power,.72,.62*(1-clean));
  // Compressed octahedral core remains at the point of contact during the short pressure hold.
  if(t<240){const r=(.041+.09*Math.sin(phase(t,85,240)*Math.PI))*power;for(let k=0;k<4;k++){const a=k*TAU/4,b=(k+1)*TAU/4;const left=this.p(this.d+Math.cos(a)*r,Math.sin(a)*r,.055),right=this.p(this.d+Math.cos(b)*r,Math.sin(b)*r,.055);this.tri(left,right,this.p(this.d,0,r*1.8),[.18,.1,.32]);this.line(left,right,2);}}
  // Broad black pressure folds are stretched out of the shell, then tear at their tips.
  const pressure=phase(t,85,730),curtain=Math.sin(pressure*Math.PI);if(curtain>0){
   for(let k=0;k<7;k++){
    const a=k*2.399+.17,len=(.08+flight*(.85+hash(k+7)*.52))*power;
    for(let j=0;j<9;j++){const q=j/9,n=(j+1)/9;const curve=(u:number)=>a+Math.sin(u*3.4+pressure*2)*.25;const point=(u:number,side:number)=>{const turn=curve(u),width=Math.sin(u*Math.PI)*(.19+hash(k+20)*.11)*curtain*power;return this.p(this.d+Math.cos(turn)*u*len-Math.sin(turn)*width*side,Math.sin(turn)*u*len+Math.cos(turn)*width*side,Math.sin(u*Math.PI)*.27*curtain);};
     const points=[point(q,-1),point(n,-1),point(n,1),point(q,1)];this.prism(points,this.u*.012,[.018,.008,.042],.24*curtain);
    }
   }
  }
  // Luminous fracture planes briefly expose the energy trapped inside the dark shell.
  const flare=Math.sin(phase(t,105,390)*Math.PI);if(flare>0){for(let i=0;i<6;i++){const a=i*2.399+.45,r=(.1+flight*(.85+hash(i+8)*.35))*power,w=.035*flare*power;const base=this.p(this.d,0,.13),tip=this.p(this.d+Math.cos(a)*r,Math.sin(a)*r,.16),edge=this.p(this.d+Math.cos(a)*r*.42-Math.sin(a)*w,Math.sin(a)*r*.42+Math.cos(a)*w,.22);this.glowTri(base,edge,tip,[.9*flare,.61*flare,flare]);}}
  // Irregular, pointed crystal bodies with three separately lit facets; large mass carries the hit.
  for(let i=0;i<15;i++){
   const a=i*2.399+.14*Math.sin(i),delay=phase(t,85+(i%4)*12,430+(i%3)*25),eject=1-Math.pow(1-delay,3),r=(.025+eject*(.58+hash(i+18)*.91))*power;
   const x=this.d+Math.cos(a)*r,z=Math.sin(a)*r*(.75+hash(i)*.35),size=(.015+Math.sin(Math.min(1,delay*3.7)*Math.PI*.5)*(.17+hash(i+43)*.18))*power*(1-clean);
   const h=Math.max(.028,(.08+Math.sin(delay*Math.PI*.74)*(.32+hash(i+28)*.53))*(1-fall)),angle=a+delay*(hash(i+82)-.5)*1.7+fall*.24;
   const point=(px:number,pz:number,height=0)=>this.p(x+(px*Math.cos(angle)-pz*Math.sin(angle))*size,z+(px*Math.sin(angle)+pz*Math.cos(angle))*size,h+height*size*(1-fall*.65));
   const body=[point(-.95,-.18),point(-.30,-.43),point(1.38,-.06),point(.17,.43),point(-.72,.25)],ridge=point(.09,0,.52);
   this.prism(body,this.u*size*.3,[.065,.032,.12],.75);
   for(let j=0;j<body.length;j++){const shine=Math.exp(-Math.abs(t-215)/125)*(j%2===0?.65:.08),shade=.085+hash(i*7+j)*.115;this.tri(body[j],body[(j+1)%body.length],ridge,[shade*.75+shine*.65,shade*.51+shine*.34,shade*1.5+shine]);}
   this.line(body[2],ridge,1.35*(1-clean));this.line(body[0],ridge,.55*(1-clean));
  }
  // A handful of tiny chips follow, subordinate to the main crystal bodies.
  for(let i=0;i<19;i++){const q=phase(t,150+i%5*16,1030+i%4*130);if(!q||q>=1)continue;const a=i*2.399+.9,r=(.2+(1-Math.pow(1-q,2))*1.65)*power,sz=(.02+hash(i+80)*.035)*Math.sin(q*Math.PI)*power;const x=this.d+Math.cos(a)*r,z=Math.sin(a)*r;this.tri(this.p(x-sz,z,.08),this.p(x+sz,z-sz,.08),this.p(x,z+sz,.12),[.29,.16,.46]);}
 }
 private impact(c:CanvasRenderingContext2D,t:number,hit:number,_v:number,power:number){const age=t-hit;if(age<0)return;const reduced=this.s.reduced,strength=reduced?Math.max(0,1-age/500)*.16:Math.exp(-Math.abs(age-110)/105);if(strength<.01)return;const p=this.s.target,r=this.u*(.24+phase(age,85,310)*1.02)*power;c.save();c.translate(p.x,p.y);c.scale(1,.65);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(255,238,255,${strength*.95})`);g.addColorStop(.12,`rgba(224,187,247,${strength*.82})`);g.addColorStop(.38,`rgba(126,62,179,${strength*.42})`);g.addColorStop(.68,`rgba(36,12,58,${strength*.35})`);g.addColorStop(1,'rgba(24,8,37,0)');c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();}
 private reduced(c:CanvasRenderingContext2D,t:number,hit:number){const show=ease(phase(t,200,650))*(1-ease(phase(t,hit+100,hit+500)));c.save();c.globalAlpha=show;c.strokeStyle='#9075aa';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.moveTo(this.s.source.x,this.s.source.y);c.lineTo(this.s.target.x,this.s.target.y);c.stroke();c.restore();if(t>=hit)this.impact(c,t,hit,0,.6);}
 dispose(){this.glowGeo.dispose();this.glowMat.dispose();this.geo.dispose();this.edgeGeo.dispose();this.mat.dispose();this.edgeMat.dispose();this.texture.dispose();this.faceTexture.dispose();this.recordTexture.dispose();this.cardMaterial.dispose();for(const m of this.cardMeshes)m.geometry.dispose();for(const list of this.outputs.values())for(const gl of list){gl.dispose();gl.forceContextLoss();gl.domElement.remove();}this.outputs.clear();}
}
