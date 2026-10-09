import * as T from 'three';
import {LeafWrap} from './leafWrap';
import {Renderer as ApprovedHalf} from './renderer';
import {ease,CONTACT,type Id,type RichId} from './richCatalog';
type C=CanvasRenderingContext2D;
export type View='oblique'|'side'|'top';
/** Local X/Y lie on the board. Z is height; the underside is z=height. */
export function physics(ms:number){const release=1720,duration=CONTACT-release,u=Math.max(0,Math.min(1,(ms-release)/duration));const height=ms<=0||ms>=CONTACT?0:76*ease(0,400,ms)*(1-u*u);return {height,velocity:ms>release&&ms<CONTACT?-152*u/duration:0,release,contact:CONTACT,underside:height,face:height+1.8};}

type Blade={mesh:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>;geo:T.BufferGeometry;pos:T.BufferAttribute};
const NX=12,NY=32,TAU=Math.PI*2;
const palettes:Record<RichId,[number,number,number]>={ELF:[66,103,51],DARK_ELF:[49,41,58],HIGH_ELF:[141,168,147],ELDER_ELF_KING:[78,91,48],WORLD_TREE:[99,82,49]};
function rng(seed:number){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
/** Fine material marks are dark/subtle. Light comes from geometry and lighting, not a luminous line drawing. */
function material(id:RichId){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const c=canvas.getContext('2d')!,im=c.createImageData(256,512),rgb=palettes[id],rand=rng(419+id.length),bark=id==='WORLD_TREE';
 for(let y=0;y<512;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4,u=x/255,v=y/511,grain=(rand()-.5)*8,cloud=Math.sin(x*.038+Math.sin(y*.024)*2)*4+Math.sin(y*.059+x*.029)*3,mid=Math.exp(-Math.abs(u-.5)*30)*10,edge=Math.abs(u-.5)*14,barkGrain=bark?Math.sin(x*.36+Math.sin(y*.025)*2)*12:0;for(let ch=0;ch<3;ch++)im.data[k+ch]=rgb[ch]+grain+cloud+mid-edge+barkGrain+(ch===1?Math.sin(v*9)*3:0);im.data[k+3]=255;}c.putImageData(im,0,0);
 c.lineCap='round';c.strokeStyle=bark?'rgba(26,20,14,.35)':'rgba(27,42,20,.32)';c.lineWidth=bark?2:1.8;c.beginPath();c.moveTo(128,512);c.bezierCurveTo(120,360,134,170,128,0);c.stroke();c.strokeStyle='rgba(213,217,149,.25)';c.lineWidth=.9;c.beginPath();c.moveTo(130,512);c.lineTo(130,0);c.stroke();
 for(let j=1;j<22;j++){const yy=j*23,spread=78+rand()*30;for(const s of [-1,1]){c.strokeStyle=bark?'rgba(20,20,12,.23)':'rgba(21,35,15,.24)';c.lineWidth=.8;c.beginPath();c.moveTo(128,yy+30);c.bezierCurveTo(128+s*20,yy+20,128+s*62,yy-4,128+s*spread,yy-22);c.stroke();c.strokeStyle='rgba(201,211,150,.12)';for(let k=1;k<5;k++){c.beginPath();c.moveTo(128+s*k*18,yy+20-k*8);c.lineTo(128+s*(k*18+13),yy-14-k*8);c.stroke();}}}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 return new T.MeshPhysicalMaterial({map,bumpMap:bump,bumpScale:bark?.19:.035,color:0xffffff,roughness:bark?.87:id==='HIGH_ELF'?.42:.63,metalness:id==='HIGH_ELF'?.13:0,clearcoat:bark?.02:.16,clearcoatRoughness:.52,side:T.DoubleSide});
}
function blade(mat:T.MeshPhysicalMaterial):Blade{const geo=new T.BufferGeometry(),p=new Float32Array((NX+1)*(NY+1)*3),uv=new Float32Array((NX+1)*(NY+1)*2),indices=[];for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){const i=y*(NX+1)+x;uv[i*2]=x/NX;uv[i*2+1]=y/NY;if(x<NX&&y<NY){indices.push(i,i+1,i+NX+1,i+1,i+NX+2,i+NX+1);}}geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(indices);const mesh=new T.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;return{mesh,geo,pos:geo.attributes.position as T.BufferAttribute};}
export class RichRenderer{
 private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-300,300,400,-400,.1,2000);
 private mats=new Map<RichId,T.MeshPhysicalMaterial>();private blades:Blade[]=[];private stems:T.Mesh<T.CylinderGeometry,T.MeshStandardMaterial>[]=[];
 private cardMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.01,side:T.DoubleSide,toneMapped:false});private card=new T.Mesh(new T.PlaneGeometry(223.2,323.2),this.cardMat);
 private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private half:ApprovedHalf|null=null;private used=0;private stemUsed=0;private activeId:RichId='ELF';private disposed=false;
 private body=new T.Mesh(new T.BoxGeometry(180,280,1.8),new T.MeshStandardMaterial({color:0x50472f,roughness:.79}));
 private shadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});private shadow=new T.Mesh(new T.PlaneGeometry(260,360),this.shadowMat);
 private table=new T.Group();private previewCamera=new T.OrthographicCamera(-300,300,400,-400,.1,2200);
 private wrap=new LeafWrap();private faceShadow=new T.Mesh(new T.PlaneGeometry(180,280),new T.ShadowMaterial({opacity:.26,transparent:true,depthWrite:false}));
 private glow=new T.PointLight(0xbacb80,0,340,1.3);
 constructor(){this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:true,powerPreference:'high-performance'});this.gl.setSize(600,800,false);this.gl.setPixelRatio(1);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.08;this.gl.shadowMap.enabled=false;this.gl.shadowMap.type=T.PCFShadowMap;this.camera.position.set(0,0,900);this.camera.lookAt(0,0,0);
  this.scene.add(new T.AmbientLight(0xffffff,.75));this.scene.add(new T.HemisphereLight(0xf4f2dc,0x273226,2.1));const key=new T.DirectionalLight(0xfff7dc,2.7);key.position.set(-180,300,360);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-300,right:300,top:400,bottom:-250,near:1,far:1100});key.shadow.bias=-.002;key.shadow.normalBias=.12;key.shadow.radius=2;this.scene.add(key);const fill=new T.DirectionalLight(0xc4d9d5,.8);fill.position.set(240,60,-100);this.scene.add(fill);
  for(const id of Object.keys(palettes) as RichId[])this.mats.set(id,material(id));for(let j=0;j<32;j++){const b=blade(this.mats.get('ELF')!);this.blades.push(b);this.scene.add(b.mesh);}const stemMat=new T.MeshStandardMaterial({color:0x5b4b30,roughness:.92});const cyl=new T.CylinderGeometry(.75,1,1,7,1);for(let j=0;j<72;j++){const m=new T.Mesh(cyl,stemMat);m.castShadow=true;m.receiveShadow=true;this.stems.push(m);this.scene.add(m);}this.scene.add(this.card,this.glow,this.body,this.shadow,this.table,this.wrap.group,this.faceShadow);this.faceShadow.receiveShadow=true;
  const sc=document.createElement('canvas');sc.width=256;sc.height=356;const sx=sc.getContext('2d')!;sx.filter='blur(13px)';sx.fillStyle='#111c14';sx.fillRect(37,37,182,282);this.shadowMat.map=new T.CanvasTexture(sc);this.shadow.position.z=.06;
  const bed=new T.Mesh(new T.BoxGeometry(420,520,7),new T.MeshStandardMaterial({color:0xb9c0aa,roughness:.97}));bed.position.z=-3.5;this.table.add(bed);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(420,520,7)),new T.LineBasicMaterial({color:0x89957c,transparent:true,opacity:.35}));edge.position.z=-3.5;this.table.add(edge);
  // Sparse board seams establish the horizontal plane without decorative rings.
  const lines:number[]=[];for(const x of [-140,140])lines.push(x,-260,.08,x,260,.08);for(const y of [-210,210])lines.push(-210,y,.08,210,y,.08);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lines,3));this.table.add(new T.LineSegments(geo,new T.LineBasicMaterial({color:0x8f9b82,transparent:true,opacity:.28})));
this.glow.position.set(0,0,95);
 }
 /** Curled, ribbed geometry: root remains on the card, the tip bends and exposes the back face. */
 private leaf(x:number,y:number,z:number,len:number,width:number,rot:number,fold:number,curl:number,opacity=1,twist=0){
  if(len<1||width<.3||this.used>=this.blades.length)return;const b=this.blades[this.used++],id=this.activeId,mat=this.mats.get(id)!;b.mesh.material=mat;b.mesh.visible=true;b.mesh.position.set(x,y,z);b.mesh.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),-rot).multiply(new T.Quaternion().setFromEuler(new T.Euler(fold,twist,0)));const a=b.pos.array as Float32Array,bark=id==='WORLD_TREE',dark=id==='DARK_ELF',king=id==='ELDER_ELF_KING';
  for(let iy=0;iy<=NY;iy++)for(let ix=0;ix<=NX;ix++){const u=ix/NX*2-1,v=iy/NY,i=(iy*(NX+1)+ix)*3;const profile=Math.pow(Math.sin(Math.PI*v),bark?.40:dark?1.15:.75);const lobe=king?1+.11*Math.cos(v*TAU*4):dark?1+.13*Math.sin(v*TAU*6):1+.025*Math.sin(v*TAU*11);const bend=curl*v*1.4;const yy=Math.abs(curl)>.01?Math.sin(bend)/(curl*1.4)*len:v*len;const zz=Math.abs(curl)>.01?(1-Math.cos(bend))/(curl*1.4)*len:0;a[i]=u*width*profile*lobe+Math.sin(v*5)*width*.025;a[i+1]=yy;a[i+2]=zz+Math.pow(Math.abs(u),1.3)*width*.24*profile+Math.sin(v*48+Math.abs(u)*8)*.28*profile;}b.pos.needsUpdate=true;b.geo.computeVertexNormals();b.mesh.scale.setScalar(opacity);
 }
 private segment(a:T.Vector3,b:T.Vector3,r:number){if(this.stemUsed>=this.stems.length||r<.05)return;const m=this.stems[this.stemUsed++];m.visible=true;m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,a.distanceTo(b),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}
 /** Ground roots start on the whole footprint, in the board plane. */
 private rootAt(x:number,y:number,angle:number,len:number,width:number,bend:number,life=1){
  const pts:T.Vector3[]=[];for(let j=0;j<=7;j++){const u=j/7,across=Math.sin(u*Math.PI)*bend;pts.push(new T.Vector3(x+Math.sin(angle)*len*u+Math.cos(angle)*across,y+Math.cos(angle)*len*u-Math.sin(angle)*across,.8+Math.sin(u*Math.PI)*width*.6));}
  for(let j=0;j<7;j++)this.segment(pts[j],pts[j+1],width*(1-j/8)*life);return pts[5];
 }
 private pre(id:RichId,v:number,ms:number,height:number){
  if(v===1){this.wrap.draw(id,ms,height);return;}
  const grow=ease(100,670,ms),gone=1-ease(1920,2220,ms),g=grow*gone;if(g<.002)return;
  const king=id==='ELDER_ELF_KING',tree=id==='WORLD_TREE',dark=id==='DARK_ELF',high=id==='HIGH_ELF';
  const count=v===2?2:v===0? (king?5:4):(king&&v===3?5:4);
  for(let j=0;j<count;j++){
   const open=ease(940+j*(v===1?115:45),v===3?1920:1850,ms),s=j%2?1:-1;
   let x=0,y=0,angle=0,len=200,width=45,fold=.05+open*2.12,curl=.09+open*.14;
   if(v===0){x=s*94;y=(Math.floor(j/2)-.5)*112;angle=-s*Math.PI/2;len=190;width=52;if(king&&j===4){x=0;y=-137;angle=0;len=260;width=45;}fold=.06+open*(dark?2.48:2.03);}
   if(v===1){x=s*81;y=(j<2?-1:1)*126;angle=Math.atan2(-x,-y);len=235;width=high?32:39;fold=.04+open*1.96;angle+=open*(dark?-.4:.32);curl=.13+open*.48;}
   if(v===2){x=0;y=s*137;angle=s>0?Math.PI:0;len=274;width=king?91:dark?57:71;fold=.02+open*.22;curl=.04+open*(tree?2.3:2.65);}
   if(v===3){const a=j*TAU/count;x=Math.sin(a)*94;y=Math.cos(a)*138;angle=a+Math.PI;len=j%2?185:270;width=tree?51:high?31:47;fold=.08+open*2.22;curl=.15+Math.sin(open*Math.PI)*.6;}
   if(tree)width*=.8;if(dark)width*=.72;if(high)width*=.78;
   // The petiole follows the elevated face; the leaf peels up from that face.
   this.leaf(x,y,height+3.5+j*.7,len*g*(1-open*.48),width*g*(1-open*.22),angle,fold,curl,1,(king?.07:.035)*s*open);
  }
 }
 private impact(id:RichId,v:number,ms:number){
  const age=ms-CONTACT;if(age<=0||age>1250)return;
  const front=ease(0,190,age),settle=ease(210,970,age),life=1-ease(680,1250,age);
  const tree=id==='WORLD_TREE',king=id==='ELDER_ELF_KING',dark=id==='DARK_ELF',high=id==='HIGH_ELF';
  // Every origin is on a different edge of the back-face footprint. None is a standing card's lower edge.
  const n=king&&v===1?5:4;
  for(let j=0;j<n;j++){
   const a=j*TAU/n+(v===1?.47:0),dx=Math.sin(a),dy=Math.cos(a),edge=1/Math.max(Math.abs(dx)/93,Math.abs(dy)/142);
   const lag=v===1?j*35:v===2?j*55:0,q=ease(lag,lag+170,age)*life;
   const travel=(v===0?Math.sin(settle*Math.PI)*22:v===1?settle*28:v===2?settle*12:(1-settle)*16)*front;
   const x=dx*(edge+travel),y=dy*(edge+travel);
   if(tree||king&&v<2||dark&&v===0){
    const len=(tree?70:king?58:42)*q*(v===3?1-settle*.55:1),thick=tree?5.1:king?4.2:2;
    const tip=this.rootAt(dx*edge,dy*edge,a,len,thick*q,(v===2?Math.sin(age*.006+j):v===1?1:-1)*15*q);
    if(tree&&v===0){this.rootAt(tip.x,tip.y,a+.8,26*q,2*q,3);this.rootAt(tip.x,tip.y,a-.6,23*q,1.8*q,-4);}
    if((tree&&v!==1)||(dark&&v===0))continue;
   }
   let len=high?62:dark?55:king?86:65,width=high?15:dark?9:king?29:23;
   let curl=.1+settle*.9,fold=.08+Math.sin(settle*Math.PI)*.16,rot=a;
   if(v===1){rot+=settle*(dark?-.65:.52);fold+=Math.sin(settle*Math.PI)*.36;}
   if(v===2){curl=.15+settle*2.1;fold=.1+front*.34;len*=.82;}
   if(v===3){rot+=Math.sin(settle*Math.PI)*.22;curl=.2+settle*1.8;len*=1.15;width*=1.15;}
   if(tree){len=71;width=22;fold=.1+settle*.3;}
   this.leaf(x,y,1.4,len*q,width*q,rot,fold,curl);
  }
 }
 private prepare(face:HTMLCanvasElement,id:Id,v:number,ms:number,reduced:boolean){
  this.wrap.group.visible=false;this.used=0;this.stemUsed=0;this.blades.forEach(b=>b.mesh.visible=false);this.stems.forEach(m=>m.visible=false);
  let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.textures.set(face,tex);}this.cardMat.map=tex;this.cardMat.needsUpdate=true;
  const active=!reduced&&id!=='VITAL2'&&id!=='VITAL3',h=active?physics(ms).height:0;
  this.gl.shadowMap.enabled=active&&v===1&&ms>0&&ms<2220&&id!=='HALF_ELF';this.faceShadow.visible=this.gl.shadowMap.enabled;this.faceShadow.position.set(0,0,h+1.92);
  this.card.position.set(0,0,h+1.86);this.card.rotation.set(0,0,0);this.body.position.set(0,0,h+.9);
  this.shadow.scale.set(1+h*.0023,1+h*.0019,1);this.shadowMat.opacity=.26-h*.0015;this.shadow.visible=true;
  if(active&&id!=='HALF_ELF'){this.activeId=id;this.pre(id,v,ms,h);this.impact(id,v,ms);}
  this.glow.intensity=active?ease(300,800,ms)*(1-ease(1450,2050,ms))*.22:0;this.glow.position.set(0,0,h+55);
 }
 draw(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,x:number,y:number,w:number,reduced=false,view:View='oblique'){
  if(this.disposed)return;
  // Approved Half Elf remains an unchanged reference; the five rich studies use the new physical scene.
  if(id==='HALF_ELF'){this.half??=new ApprovedHalf();this.half.draw(c,face,id,0,ms,x,y,w,reduced);return;}
  this.prepare(face,id,v,ms,reduced);this.table.visible=true;
  this.gl.setSize(600,800,false);const cam=this.previewCamera;
  cam.up.set(0,0,1);if(view==='side')cam.position.set(420,-900,260);else if(view==='top'){cam.up.set(0,1,0);cam.position.set(0,0,1000);}else cam.position.set(230,-970,650);cam.lookAt(0,0,25);cam.updateMatrixWorld();
  this.gl.render(this.scene,cam);c.drawImage(this.gl.domElement,x-w*300/180,y-w*400/180,w*600/180,w*800/180);
 }
 /** Project the 3D scene with exactly the DOM board matrix. Height is projected once, along board normal. */
 drawBoard(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,matrix:DOMMatrix,width:number,height:number,reduced=false){
  if(this.disposed)return;this.prepare(face,id,v,ms,reduced);this.table.visible=false;this.gl.setSize(width,height,false);
  const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 get status(){return{renderer:'webgl-physical',disposed:this.disposed,textures:this.textures.size,geometries:this.blades.length,physics:'board-normal / back-face contact'};}
 dispose(){if(this.disposed)return;this.disposed=true;this.half?.dispose();this.wrap.dispose();this.faceShadow.geometry.dispose();this.faceShadow.material.dispose();this.textures.forEach(t=>t.dispose());this.mats.forEach(m=>{m.map?.dispose();m.bumpMap?.dispose();m.dispose();});this.blades.forEach(b=>b.geo.dispose());this.stems[0]?.geometry.dispose();this.stems[0]?.material.dispose();this.card.geometry.dispose();this.cardMat.dispose();this.body.geometry.dispose();this.body.material.dispose();this.shadow.geometry.dispose();this.shadowMat.map?.dispose();this.shadowMat.dispose();this.table.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(m.material as T.Material).dispose();});this.gl.dispose();this.gl.forceContextLoss();}
}
