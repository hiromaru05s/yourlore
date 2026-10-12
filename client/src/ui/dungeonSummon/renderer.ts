import * as T from 'three';
import {clamp,ease,pulse,DURATION} from './catalog';
const W=1.7,H=2.55;
const rand=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
type Rock={mesh:T.Mesh;base:T.Vector3;s:T.Vector3;tag:number;row:number};
function stoneTexture(art?:HTMLImageElement){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!;
 x.fillStyle='#abb3a7';x.fillRect(0,0,512,512);
 if(art){x.drawImage(art,0,210,210,300,0,0,512,512);x.globalCompositeOperation='screen';x.fillStyle='#4a5356';x.fillRect(0,0,512,512);x.globalCompositeOperation='source-over';}
 for(let i=0;i<8000;i++){const q=rand(i),a=.04+rand(i+73)*.15;x.fillStyle=q>.5?`rgba(218,221,200,${a})`:`rgba(12,23,25,${a})`;x.fillRect(rand(i+1)*512,rand(i+2)*512,1+rand(i+3)*3,1+rand(i+4)*4);}
 for(let i=0;i<24;i++){let px=rand(i+500)*512,py=rand(i+600)*512;x.beginPath();x.moveTo(px,py);for(let j=0;j<7;j++){px+=(rand(i*8+j)-.5)*55;py+=12+rand(j+i*15)*22;x.lineTo(px,py);}x.strokeStyle='rgba(17,25,25,.38)';x.lineWidth=1+rand(i)*2;x.stroke();x.translate(1,-1);x.strokeStyle='rgba(220,216,176,.24)';x.lineWidth=.6;x.stroke();x.translate(-1,1);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
function fissureTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!;x.fillStyle='#000';x.fillRect(0,0,256,256);for(let i=0;i<3;i++){x.beginPath();let px=30+i*85,py=20+i*16;x.moveTo(px,py);for(let j=0;j<6;j++){px+=(rand(i*7+j)-.5)*34;py+=28;x.lineTo(px,py);}x.strokeStyle='#ffb352';x.lineWidth=1;x.shadowColor='#ff9528';x.shadowBlur=3;x.stroke();}return new T.CanvasTexture(c);}
function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!,g=x.createRadialGradient(64,64,3,64,64,64);g.addColorStop(0,'rgba(7,13,16,.65)');g.addColorStop(.6,'rgba(7,13,16,.2)');g.addColorStop(1,'rgba(7,13,16,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
function rockGeometry(seed:number){
 const g=new T.SphereGeometry(1,9,6).toNonIndexed();const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const q=1+.14*Math.sin(x*13+seed*2)*Math.sin(y*11+z*7)+.06*Math.cos(z*27+y*16);p.setXYZ(i,Math.sign(x)*Math.pow(Math.abs(x),.66)*q,Math.sign(y)*Math.pow(Math.abs(y),.7)*q,z*q*.8);}
 g.computeVertexNormals();return g;
}
function toothGeometry(seed:number){const g=new T.CylinderGeometry(.018,.11,.58,5,3);g.translate(0,.29,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)+Math.pow(y/.58,2)*(.08+rand(seed)*.09));}g.computeVertexNormals();return g;}
export class DungeonRenderer {
 readonly gl:T.WebGLRenderer;readonly scene=new T.Scene();readonly camera=new T.OrthographicCamera(-2.2,2.2,2.2,-2.2,.1,60);
 readonly root=new T.Group();readonly matter=new T.Group();readonly rocks:Rock[]=[];readonly teeth:Rock[]=[];readonly ribs:Rock[]=[];readonly rails:Rock[]=[];
 readonly skins:T.Mesh[]=[];readonly basePositions:Float32Array[]=[];readonly stone:T.MeshStandardMaterial[]=[];
 readonly eyes:T.Mesh[]=[];readonly pupil:T.Mesh[]=[];readonly cavity:T.Mesh;readonly glow:T.PointLight;readonly shadow:T.Mesh;
 readonly tex:T.Texture;readonly faces=new Map<HTMLCanvasElement,T.Texture>();readonly boardCamera=new T.Camera();readonly veins=fissureTexture();readonly noise:T.Texture;readonly shadowTex=radialTexture();readonly rockGeo=Array.from({length:6},(_,i)=>rockGeometry(i));readonly toothGeo=Array.from({length:5},(_,i)=>toothGeometry(i));
 readonly core:T.Mesh;readonly dust:Rock[]=[];readonly materials:T.Material[]=[];disposed=false;variant=0;draws=0;
 constructor(face:HTMLCanvasElement,art?:HTMLImageElement){
  this.noise=stoneTexture(art);
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setClearColor(0,0);this.gl.setPixelRatio(1);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.25;
  this.camera.position.set(0,-4.6,14);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight(0xe7f3f0,0x172827,2.5));const light=new T.DirectionalLight(0xffe6bb,3.6);light.position.set(-3,4,7);this.scene.add(light);const rim=new T.DirectionalLight(0x8bbdbf,1.8);rim.position.set(4,0,2);this.scene.add(rim);
  this.scene.add(this.root);this.root.add(this.matter);
  this.tex=new T.CanvasTexture(face);this.tex.colorSpace=T.SRGBColorSpace;this.tex.anisotropy=4;this.faces.set(face,this.tex);
  const cardMat=new T.MeshBasicMaterial({map:this.tex,transparent:true,side:T.DoubleSide,vertexColors:true});this.materials.push(cardMat);
  // Independent halves share the exact same UV space; opening never stretches a painted tooth.
  for(let half=0;half<2;half++){
   const g=new T.PlaneGeometry(W,H/2,24,24);g.translate(0,(half?1:-1)*H/4,0);const uv=g.attributes.uv;
   for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*.5+half*.5);
   g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));
   this.basePositions.push(new Float32Array(g.attributes.position.array));const m=new T.Mesh(g,cardMat);m.frustumCulled=false;this.skins.push(m);this.root.add(m);
  }
  for(const color of [0x98a8ab,0xa7acac,0x7c9299,0xaaa598,0x929c9c,0xaab2ad])this.stone.push(new T.MeshStandardMaterial({color,map:this.noise,bumpMap:this.noise,bumpScale:.06,emissive:0xffab56,emissiveMap:this.veins,emissiveIntensity:0,roughness:.84,metalness:.06,flatShading:true}));
  const cavityMat=new T.MeshBasicMaterial({color:0x070d0e,side:T.DoubleSide,transparent:true});this.materials.push(cavityMat);this.cavity=new T.Mesh(new T.CircleGeometry(.77,32),cavityMat);this.cavity.position.z=-.72;this.cavity.scale.y=1.27;this.root.add(this.cavity);
  const coreMat=new T.MeshBasicMaterial({color:0xffb657,transparent:true});this.materials.push(coreMat);this.core=new T.Mesh(new T.CircleGeometry(.045,20),coreMat);this.root.add(this.core);
  this.glow=new T.PointLight(0xffad4c,1.5,4,1.5);this.glow.position.set(0,.1,.3);this.root.add(this.glow);
  const shadowMat=new T.MeshBasicMaterial({map:this.shadowTex,transparent:true,depthWrite:false});this.materials.push(shadowMat);this.shadow=new T.Mesh(new T.PlaneGeometry(2.8,3.8),shadowMat);this.shadow.position.z=-.07;this.scene.add(this.shadow);
  for(let row=0;row<7;row++)for(let j=0;j<18;j++){
   const a=j/18*Math.PI*2;const scale=1-row*.115;
   this.rocks.push(this.rock(Math.sin(a)*.88*scale,Math.cos(a)*1.16*scale,.02,.23*scale*(.8+rand(j+row*6)*.4),.27*scale*(.85+rand(j+row*4)*.3),.27*scale,j,row));
  }
  for(let side=0;side<2;side++)for(let j=0;j<9;j++){
   const m=new T.Mesh(this.toothGeo[j%5],this.stone[(j+side)%6]);this.matter.add(m);const x=(j-4)*.176,y=(side?1:-1)*.68;
   this.teeth.push({mesh:m,base:new T.Vector3(x,y,.12),s:new T.Vector3(.9+rand(j)*.5, .72+rand(j+30)*.65, .7),tag:side,row:j});
  }
  for(let row=0;row<4;row++)for(let j=0;j<7;j++){
   const a=j/6*Math.PI;const r=this.rock(Math.cos(a)*.83,(row-1.5)*.61,.03,.15,.15,.23,j,row);this.ribs.push(r);
  }
  const railMat=new T.MeshStandardMaterial({color:0x5d5545,metalness:.65,roughness:.48});this.materials.push(railMat);
  for(let j=0;j<2;j++){const m=new T.Mesh(new T.BoxGeometry(.024,2.7,.045),railMat);this.matter.add(m);this.rails.push({mesh:m,base:new T.Vector3((j?1:-1)*.26,-.23,.02),s:new T.Vector3(1,1,1),tag:0,row:j});}
  for(let j=0;j<16;j++){const m=new T.Mesh(new T.BoxGeometry(.7,.057,.03),this.stone[3]);this.matter.add(m);this.rails.push({mesh:m,base:new T.Vector3(0,-1.48+j*.17,.008),s:new T.Vector3(1,1,1),tag:1,row:j});}
  for(let j=0;j<2;j++){
   const mat=new T.MeshBasicMaterial({color:0xffbd63});const m=new T.Mesh(new T.SphereGeometry(.065,16,8),mat);m.scale.set(1.3,.45,.5);this.eyes.push(m);this.root.add(m);this.materials.push(mat);
   const pupil=new T.Mesh(new T.SphereGeometry(.028,12,6),cavityMat);this.pupil.push(pupil);this.root.add(pupil);
  }
  for(let j=0;j<22;j++)this.dust.push(this.rock(0,0,0,.018+rand(j)*.02,.018,.014,j,0));
 }
 warmup(){const c=document.createElement('canvas');c.width=c.height=320;for(let v=0;v<4;v++)this.draw(c,v,1350);this.gl.getContext().finish();}
 private rock(x:number,y:number,z:number,sx:number,sy:number,sz:number,tag:number,row:number):Rock{
  const mesh=new T.Mesh(this.rockGeo[(tag+row)%6],this.stone[(tag*3+row)%6]);this.matter.add(mesh);return {mesh,base:new T.Vector3(x,y,z),s:new T.Vector3(sx,sy,sz),tag,row};
 }
 update(v:number,ms:number,reduced=false){
  this.variant=v;const t=clamp(ms/DURATION);const a=reduced?0:pulse(.07,.28,.66,.84,t);const open=reduced?0:pulse(.14,.38,.52,.75,t);
  this.stone.forEach(m=>m.emissiveIntensity=a*(.5+.3*Math.sin(t*21)));this.matter.visible=a>.0001;this.cavity.visible=a>.001&&v<2;(this.cavity.material as T.MeshBasicMaterial).opacity=a;this.cavity.position.z=v===1?-.72:-.23;this.core.visible=v===1&&a>.02;this.core.position.set(0,.05,-.38);this.core.scale.setScalar(.5+a*1.5);
  this.root.position.set(0,v===3?-.53*(1-ease(.24,.72,t)):0,.22*(1-ease(0,.2,t)));
  if(reduced)this.root.position.set(0,0,0);
  this.glow.intensity=a*(1.3+.35*Math.sin(t*22));this.shadow.scale.setScalar(1+a*.1);
  // One continuous card surface, with a different spatial deformation for each direction.
  this.skins.forEach((m,k)=>{
   const p=m.geometry.attributes.position,c=m.geometry.attributes.color,b=this.basePositions[k];
   for(let i=0;i<p.count;i++){
    let x=b[i*3],y=b[i*3+1],z=0,shade=1;
    if(v===0){const seam=Math.max(0,1-Math.abs(y)/.4);y+=(k?1:-1)*open*.20+open*.038*Math.sin(x*33)*seam;z=a*.08+open*.08*(1-Math.abs(x)/.85);}
    if(v===1){const r=Math.min(1,Math.max(Math.abs(x)/.85,Math.abs(y)/1.275));z=-a*.50*Math.pow(1-r,1.5);const q=1-a*.44*Math.pow(1-r,2);x*=q;y*=q;shade=1-a*.78*Math.pow(1-r,.7);}
    if(v===2){const f=Math.max(0,1-(x/.86)**2);const wave=.68+.32*Math.cos(y*4.8-t*9);z=a*f*(.38+wave*.55)*(1-.28*(y/1.275)**2);shade=1-a*.38*(.5+.5*Math.sin(y*5-t*9));}
    if(v===3){z=a*.04*Math.sin((y+1.3)*3.2-t*8);shade=1-a*.08;}
    p.setXYZ(i,x,y,z+.009);c.setXYZ(i,shade,shade,shade);
   }p.needsUpdate=true;c.needsUpdate=true;
  });
  for(const r of this.rocks){const {mesh:m,base:b,row,tag}=r;m.visible=false;m.rotation.set(0,0,(rand(tag+row*30)-.5)*.46);m.position.copy(b);m.scale.copy(r.s);
   if(v===0&&row===0){m.visible=true;const s=Math.sign(b.y)||1;m.position.y+=s*open*.20;m.position.z=.035+a*(.13+.13*Math.abs(b.y));m.scale.multiplyScalar(a);m.rotation.x=-s*open*.26;m.position.x*=.89;m.scale.y*=1.15;m.position.x+=(rand(tag+81)-.5)*.035*a;m.position.y+=(rand(tag+73)-.5)*.045*a;}
   if(v===1){m.visible=true;const delay=row*.022,g=pulse(.07+delay,.27+delay,.53+delay,.8+delay,t);m.position.z=-row*.095*g+.065*g;m.scale.multiplyScalar(g);m.rotation.z=(row%2?1:-1)*open*.15;const ang=tag/18*Math.PI*2+open*(row%2?1:-1)*.13;m.position.x=Math.sin(ang)*.88*(1-row*.115);m.position.y=Math.cos(ang)*1.16*(1-row*.115);}
   if(v===2&&row<4&&tag<6){m.visible=true;const x=(tag-2.5)*.285+(rand(row+tag)-.5)*.09,y=(row-1.5)*.57;const f=Math.max(0,1-(x/.94)**2),wave=.68+.32*Math.cos(y*4.8-t*9);m.position.set(x,y,.035+a*f*(.38+wave*.55));m.scale.set((.17+rand(tag)*.03)*a,(.32+rand(row)*.03)*a,.23*a);m.rotation.x=a*Math.sin(y*4.8-t*9)*.2;m.rotation.y=x*a*.36;}
  }
  for(const r of this.teeth){const m=r.mesh;const s=r.tag?1:-1;m.visible=v===0;m.position.copy(r.base);m.scale.copy(r.s).multiplyScalar(a);m.rotation.set(.15*s,0,r.tag?Math.PI:0);
   if(v===0){m.position.y+=s*open*.20;m.position.z=.10+a*.28;m.rotation.x=-s*open*.48;}
   else {m.position.y*=.82;m.scale.multiplyScalar(.72);m.position.z=.02;}
  }
  for(const r of this.ribs){const m=r.mesh;m.visible=v===3;const d=(3-r.row)*.065,g=pulse(.09+d,.24+d,.56+d,.79+d,t);const angle=r.tag/6*Math.PI;
   m.position.set(Math.cos(angle)*.82,r.base.y,.025+Math.sin(angle)*.88*g);m.scale.set(.16*g,.14*g,.22*g);m.rotation.y=angle-Math.PI/2;m.rotation.z=.02*Math.sin(r.row*5)*g;
  }
  for(const r of this.rails){const m=r.mesh;m.visible=v===3;m.position.copy(r.base);const grow=ease(.06,.25,t)*(1-ease(.68,.85,t));m.scale.set(1,grow,Math.max(.01,grow));if(r.tag===1){m.scale.setScalar(grow);m.position.y=-.4+(r.base.y+.4)*grow;}}
  for(let j=0;j<2;j++){const x=(j?1:-1)*.64;const y=v===3?.91:.68;const z=v===2?.91*a:.42*a;this.eyes[j].position.set(x,y+ (v===0?open*.20:0),z+.10);this.eyes[j].visible=a>.02&&v!==1;this.eyes[j].scale.set(1.25*a,.40*a,.65*a);this.pupil[j].visible=this.eyes[j].visible;this.pupil[j].position.copy(this.eyes[j].position).z+=.033;this.pupil[j].scale.set(.29*a,.85*a,.7*a);}
  const impact=[.68,.73,.72,.76][v];for(let i=0;i<this.dust.length;i++){const r=this.dust[i],m=r.mesh,q=clamp((t-impact)/.16);m.visible=!reduced&&t>impact&&q<1;const ang=i*2.399;m.position.set(Math.cos(ang)*(.68+q*.4),Math.sin(ang)*(1+q*.3),Math.max(0,Math.sin(q*Math.PI)*.12*(.5+rand(i))));m.scale.copy(r.s).multiplyScalar(1-ease(.55,1,q));m.rotation.set(q*4+i,q*5,ang);}
  if(reduced){this.cavity.visible=false;this.core.visible=false;this.eyes.forEach(m=>m.visible=false);this.pupil.forEach(m=>m.visible=false);}
 }
 draw(canvas:HTMLCanvasElement,v:number,ms:number,reduced=false,board=false){
  if(this.disposed)return;const w=canvas.width,h=canvas.height,aspect=w/h;const span=board?2.15:2.12;
  this.camera.position.set(0,board?-4.6:-7,14);this.camera.lookAt(0,0,0);this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();
  this.update(v,ms,reduced);if(this.gl.domElement.width!==w||this.gl.domElement.height!==h)this.gl.setSize(w,h,false);this.gl.render(this.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.gl.domElement,0,0);this.draws++;
 }
 /** Same approved geometry, projected with the exact DOM board transform. */
 drawBoard(canvas:HTMLCanvasElement,face:HTMLCanvasElement,ms:number,placement:DOMMatrix,cardWidth:number){
  if(this.disposed)return;
  let texture=this.faces.get(face);
  if(!texture){texture=new T.CanvasTexture(face);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;this.faces.set(face,texture);}
  (this.skins[0].material as T.MeshBasicMaterial).map=texture;
  this.update(0,ms);
  const w=canvas.width,h=canvas.height;
  if(this.gl.domElement.width!==w||this.gl.domElement.height!==h)this.gl.setSize(w,h,false);
  const local=placement.translate(90,135).scale(180/W,-270/H,cardWidth/W);
  const screen=new T.Matrix4().set(2/w,0,0,-1,0,-2/h,0,1,0,0,-1/2000,0,0,0,0,1);
  this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(local.toFloat64Array()))));
  this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();
  this.boardCamera.updateMatrixWorld();this.gl.render(this.scene,this.boardCamera);
  const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.gl.domElement,0,0);this.draws++;
 }
 releaseFace(face:HTMLCanvasElement){this.faces.get(face)?.dispose();this.faces.delete(face);}
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());[...this.faces.values(),this.noise,this.shadowTex,this.veins].forEach(t=>t.dispose());this.faces.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
