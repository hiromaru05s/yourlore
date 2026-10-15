import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {DURATION,clamp,envelope,ramp} from './catalog';
type Piece={mesh:T.Mesh;edge:T.LineSegments;back:T.Mesh;rim:T.Mesh;stamp:T.Mesh;ids:number[];base:Float32Array;cx:number;cy:number;w:number;h:number;i:number};
type Rig={group:T.Group;pieces:Piece[];face:T.CanvasTexture;front:T.MeshStandardMaterial;backMat:T.MeshStandardMaterial;edgeMat:T.LineBasicMaterial;variant:number;legend:boolean;stamps:T.CanvasTexture[]};
const W=2,H=3;
function engraving(){const c=document.createElement('canvas');c.width=256;c.height=384;const x=c.getContext('2d')!;x.fillStyle='#331b28';x.fillRect(0,0,256,384);x.strokeStyle='#ba9752';x.lineWidth=2;x.strokeRect(10,10,236,364);x.strokeRect(16,16,224,352);for(let i=0;i<9;i++){x.save();x.translate(128,192);x.rotate(i*Math.PI/4);x.beginPath();x.moveTo(0,-112);x.quadraticCurveTo(51,-28,0,40);x.quadraticCurveTo(-51,-28,0,-112);x.stroke();x.restore()}for(let y=30;y<370;y+=23)for(let xx=30;xx<240;xx+=23){x.beginPath();x.moveTo(xx,y-3);x.lineTo(xx+3,y);x.lineTo(xx,y+3);x.lineTo(xx-3,y);x.closePath();x.stroke()}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
function stampTexture(kind:number,index:number){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!;
 x.fillStyle=kind===1?'#e8d8ac':kind===2?'#ba8132':kind===4?(index%2?'#762c3b':'#23232e'):['#3178a0','#c9a04b','#883049'][index%3];x.fillRect(0,0,256,256);x.strokeStyle=kind===1?'#ab8241':'#f4d393';x.lineWidth=5;x.strokeRect(9,9,238,238);x.lineWidth=1;x.strokeRect(15,15,226,226);
 if(kind===1){const points=[[[.5,.5]],[[.28,.28],[.72,.72]],[[.28,.28],[.5,.5],[.72,.72]],[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],[[.28,.24],[.72,.24],[.28,.5],[.72,.5],[.28,.76],[.72,.76]]];for(const [a,b]of points[index%6]){x.fillStyle='#392631';x.beginPath();x.arc(a*256,b*256,16,0,Math.PI*2);x.fill();x.strokeStyle='#94703a';x.stroke()}}
 else {x.translate(128,128);for(let i=0;i<12;i++){x.rotate(Math.PI/6);x.beginPath();x.moveTo(0,33);x.lineTo(21,73);x.lineTo(0,102);x.lineTo(-21,73);x.closePath();x.stroke()}x.lineWidth=4;x.beginPath();x.moveTo(0,-53);x.lineTo(32,0);x.lineTo(0,53);x.lineTo(-32,0);x.closePath();x.stroke()}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex}
function panel(cx:number,cy:number,w:number,h:number,face:T.Material,back:T.Material,edge:T.LineBasicMaterial,i:number,stamp:T.Texture):Piece{
 const geom=new T.PlaneGeometry(w,h,12,18);const uv=geom.attributes.uv;for(let n=0;n<uv.count;n++)uv.setXY(n,(cx+w*(uv.getX(n)-.5)+1)/W,(cy+h*(uv.getY(n)-.5)+1.5)/H);
 const mesh=new T.Mesh(geom,face);mesh.position.set(cx,cy,0);const backMesh=new T.Mesh(geom.clone(),back);backMesh.rotation.y=Math.PI;backMesh.position.z=-.028;mesh.add(backMesh);
 const ids:number[]=[];const nx=13,ny=19;for(let x=0;x<nx-1;x++)ids.push(x,x+1,(ny-1)*nx+x,(ny-1)*nx+x+1);for(let y=0;y<ny-1;y++)ids.push(y*nx,(y+1)*nx,y*nx+nx-1,(y+1)*nx+nx-1);
 const eg=new T.BufferGeometry();eg.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(ids.length*3),3));const e=new T.LineSegments(eg,edge);mesh.add(e);
 const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(ids.length/2*18),3));const rim=new T.Mesh(rg,new T.MeshStandardMaterial({color:0xb8863c,metalness:.78,roughness:.28,side:T.DoubleSide}));mesh.add(rim);
 const sg=geom.clone();const suv=sg.attributes.uv;for(let n=0;n<suv.count;n++)suv.setXY(n,(geom.attributes.position.getX(n)/w+.5),(geom.attributes.position.getY(n)/h+.5));const seal=new T.Mesh(sg,new T.MeshStandardMaterial({map:stamp,metalness:.26,roughness:.35,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));seal.position.z=.008;mesh.add(seal);
 return {mesh,back:backMesh,edge:e,rim,stamp:seal,ids,base:new Float32Array(geom.attributes.position.array),cx,cy,w,h,i};
}
export class Renderer{
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.OrthographicCamera(-3,3,2.269230769,-2.269230769,.1,50);rigs=new Map<string,Rig>();backTex=engraving();shadow:T.Mesh;shadowTex:T.CanvasTexture;environment:T.WebGLRenderTarget;disposed=false;
 constructor(){this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.setSize(780,590);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);const pmrem=new T.PMREMGenerator(this.renderer);const room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();this.camera.position.set(0,0,13);this.camera.lookAt(0,0,0);this.scene.add(new T.HemisphereLight(0xfff7e9,0x342c41,2.1));const key=new T.DirectionalLight(0xffe8ba,3.4);key.position.set(-4,5,8);this.scene.add(key);const rim=new T.DirectionalLight(0xb8d8ff,2.6);rim.position.set(5,-1,3);this.scene.add(rim);
 const s=document.createElement('canvas');s.width=s.height=128;const c=s.getContext('2d')!,g=c.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(20,10,25,.38)');g.addColorStop(.5,'rgba(20,10,25,.18)');g.addColorStop(1,'rgba(20,10,25,0)');c.fillStyle=g;c.fillRect(0,0,128,128);this.shadowTex=new T.CanvasTexture(s);this.shadow=new T.Mesh(new T.PlaneGeometry(4.4,4.4),new T.MeshBasicMaterial({map:this.shadowTex,transparent:true,depthWrite:false}));this.shadow.position.set(0,-.13,-.3);this.scene.add(this.shadow);
 }
 getRig(face:HTMLCanvasElement,variant:number,legend:boolean){const id=variant+':'+legend;const found=this.rigs.get(id);if(found)return found;const tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 const front=new T.MeshStandardMaterial({map:tex,roughness:variant===3?.8:variant===5?.24:.46,metalness:variant===2?.52:.12,side:T.DoubleSide,emissive:legend?0x7b5426:0x6a3821,emissiveIntensity:0});
 const backMat=new T.MeshStandardMaterial({map:this.backTex,roughness:.37,metalness:.65,side:T.DoubleSide,color:legend?0xffe3a0:0xc8a76e});const edgeMat=new T.LineBasicMaterial({color:legend?0xffd27b:0xb49159});const group=new T.Group(),pieces:Piece[]=[];
 const stamps=Array.from({length:6},(_,i)=>stampTexture(variant,i));const cols=variant===1&&legend?6:[5,2,3,9,4,3][variant],rows=[1,3,4,1,3,1][variant];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const p=panel(-1+(x+.5)*W/cols,1.5-(y+.5)*H/rows,W/cols,H/rows,front,backMat,edgeMat,pieces.length,stamps[pieces.length%6]);pieces.push(p);group.add(p.mesh)}
 const rig={group,pieces,face:tex,front,backMat,edgeMat,variant,legend,stamps};this.rigs.set(id,rig);this.scene.add(group);return rig;
 }
 draw(canvas:HTMLCanvasElement,face:HTMLCanvasElement,variant:number,ms:number,legend=false,reduced=false,transparent=false,dark=false){if(this.disposed)return;const rig=this.getRig(face,variant,legend);for(const r of this.rigs.values())r.group.visible=r===rig;
 const t=clamp(ms/DURATION),a=reduced?0:envelope(t),boost=legend?1.18:1;
 rig.group.rotation.set(0,0,0);rig.group.position.set(0,0,0);rig.group.scale.setScalar(1);
 if(!reduced){rig.group.position.y=.24*Math.sin(Math.PI*ramp(t,0,.88));rig.group.rotation.x=-.12*a;rig.group.rotation.y=.14*a;rig.group.position.z=.6*envelope(t,.0,.25,.7,.88);}
 rig.front.emissiveIntensity=(legend?.24:.13)*envelope(t,.03,.2,.72,.95);rig.edgeMat.color.set(legend?0xffd083:0xcba873);rig.edgeMat.opacity=a*.8;rig.edgeMat.transparent=true;
 for(const p of rig.pieces){const {mesh,cx,cy,w,h,i}=p;const delay=variant===3?i*.008:variant===5?i*.025:0;const e=reduced?0:envelope(t-delay)*boost;mesh.position.set(cx,cy,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);
  if(variant===0){const n=i-2;mesh.rotation.z=n*.25*e;mesh.rotation.y=n*.12*e;mesh.position.x=cx+n*.17*e;mesh.position.y=.14*Math.abs(n)*e;mesh.position.z=(2-Math.abs(n))*.12*e;}
  if(variant===1){const col=i%(legend?6:2),row=Math.floor(i/(legend?6:2)),faceIndex=col%2+row*2,cube=legend?Math.floor(col/2):0,half=legend?.36:.64;const targets=[[0,0,half],[half,0,0],[0,half,0],[-half,0,0],[0,-half,0],[0,0,-half]];const rot=[[0,0],[0,Math.PI/2],[-Math.PI/2,0],[0,-Math.PI/2],[Math.PI/2,0],[0,Math.PI]];const q=clamp(e),tx=(legend?(cube-1)*1.02:0)+targets[faceIndex][0],ty=(legend?(cube===1?.32:-.18):0)+targets[faceIndex][1];mesh.position.set(cx*(1-q)+tx*q,cy*(1-q)+ty*q,targets[faceIndex][2]*q);mesh.rotation.x=rot[faceIndex][0]*q;mesh.rotation.y=rot[faceIndex][1]*q;mesh.scale.set(1+(half*2/w-1)*q,1+(half*2/h-1)*q,1);}
  if(variant===2){const q=clamp(e);mesh.position.x=cx*(1-q)+(legend?(i%3-1)*.88:Math.sin(i*2.4)*.12)*q;mesh.position.y=cy*(1-q)+(legend?(Math.floor(i/3)-1.5)*.15+(i%3===1?.2:0):(i-5.5)*.095)*q;mesh.position.z=Math.cos(i*.7)*.09*q;mesh.rotation.x=1.12*q;mesh.rotation.z=(i-5.5)*.24*q;}
  if(variant===3){mesh.position.x=cx+Math.sin(i*1.4)*.16*e;mesh.position.z=Math.sin(i*1.5)*.18*e;mesh.rotation.y=Math.sin(i*1.3)*.5*e;}
  if(variant===4){const angle=i/12*Math.PI*2;mesh.position.x=cx*(1-clamp(e));mesh.position.y=cy*(1-clamp(e));mesh.rotation.z=.85*e;mesh.position.z=.03*(i%2)*e;void angle;}
  if(variant===5){mesh.position.x=cx*(1+.34*e);mesh.position.y=(i===1?.33:-.13)*e;mesh.position.z=(i===1?.3:0)*e;mesh.rotation.y=(i===0?-1:1)*Math.PI*.37*e;mesh.rotation.z=(i-1)*-.15*e;}
  const seal=p.stamp.material as T.MeshStandardMaterial;seal.opacity=(variant===1?.92:variant===2?.79:variant===5?.64:variant===4?.88:0)*clamp(e);p.stamp.visible=seal.opacity>.001;const pos=mesh.geometry.attributes.position as T.BufferAttribute;const backpos=p.back.geometry.attributes.position as T.BufferAttribute;
  for(let n=0;n<pos.count;n++){const bx=p.base[n*3],by=p.base[n*3+1];let x=bx,y=by,z=0;
   if(variant===0)z=Math.sin((by/h+.5)*Math.PI)*.055*e;
   if(variant===2){const u=bx/(w/2),v=by/(h/2);const dx=u*Math.sqrt(1-v*v/2)*(legend?.44:.64),dy=v*Math.sqrt(1-u*u/2)*(legend?.44:.64);x=bx*(1-clamp(e))+dx*clamp(e);y=by*(1-clamp(e))+dy*clamp(e);}
   if(variant===3){const v=(by/h+.5);x+=Math.sin(v*Math.PI*2+i*.56)*.3*e;z=Math.sin(v*Math.PI*2.0+i*.61+t*3)*.65*e;}
   if(variant===4){const u=bx/w+.5,v=by/h+.5;const angle=(i+u)/12*Math.PI*2;const rad=.21+v*1.24;x=bx*(1-clamp(e))+Math.cos(angle)*rad*clamp(e);y=by*(1-clamp(e))+Math.sin(angle)*rad*clamp(e);}
   if(variant===5){const fac=1-.8*clamp(e)*Math.pow(Math.abs(by)/(h/2),1.5);x*=fac;z=(1-Math.abs(bx)/(w/2))*.14*e;}
   pos.setXYZ(n,x,y,z);backpos.setXYZ(n,-x,y,-z);(p.stamp.geometry.attributes.position as T.BufferAttribute).setXYZ(n,x,y,z);
  }pos.needsUpdate=true;backpos.needsUpdate=true;mesh.geometry.computeVertexNormals();p.back.geometry.computeVertexNormals();
  p.stamp.geometry.attributes.position.needsUpdate=true;p.stamp.geometry.computeVertexNormals();
  const ep=p.edge.geometry.attributes.position as T.BufferAttribute,rp=p.rim.geometry.attributes.position as T.BufferAttribute;
  p.ids.forEach((n,j)=>ep.setXYZ(j,pos.getX(n),pos.getY(n),pos.getZ(n)+.004));ep.needsUpdate=true;
  for(let j=0;j<p.ids.length;j+=2){const a=p.ids[j],b=p.ids[j+1],ax=pos.getX(a),ay=pos.getY(a),az=pos.getZ(a),bx=pos.getX(b),by=pos.getY(b),bz=pos.getZ(b),th=(variant===2?.065:.028)*clamp(e)+.005;const verts=[[ax,ay,az],[bx,by,bz],[ax,ay,az-th],[bx,by,bz],[bx,by,bz-th],[ax,ay,az-th]];verts.forEach((v,k)=>rp.setXYZ(j/2*6+k,v[0],v[1],v[2]));}rp.needsUpdate=true;p.rim.geometry.computeVertexNormals();

 }
 if(variant===1&&!reduced){rig.group.rotation.x=.55*a;rig.group.rotation.y=-.6*a+Math.PI*2*ramp(t,.31,.64)*(1-ramp(t,.65,.85));rig.group.rotation.z=.17*Math.sin(t*12)*a;}
 if(variant===2&&!reduced)rig.group.rotation.z=-.15*a;if(variant===4&&!reduced)rig.group.rotation.x=.3*a;
 this.shadow.scale.setScalar(1+.23*a);(this.shadow.material as T.MeshBasicMaterial).opacity=transparent?.6:1;
 this.renderer.render(this.scene,this.camera);if(canvas.width!==780||canvas.height!==590){canvas.width=780;canvas.height=590}const c=canvas.getContext('2d')!;c.clearRect(0,0,780,590);if(!transparent){c.fillStyle=dark?'#191721':'#ede8df';c.fillRect(0,0,780,590);const gr=c.createRadialGradient(390,230,20,390,290,420);gr.addColorStop(0,dark?'#28212b':'#fffdf8');gr.addColorStop(1,dark?'#18171e':'#e3dcd0');c.fillStyle=gr;c.fillRect(0,0,780,590)}c.drawImage(this.renderer.domElement,0,0);
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const r of this.rigs.values()){for(const p of r.pieces){p.mesh.geometry.dispose();p.back.geometry.dispose();p.edge.geometry.dispose();p.rim.geometry.dispose();(p.rim.material as T.Material).dispose();p.stamp.geometry.dispose();(p.stamp.material as T.Material).dispose()}r.stamps.forEach(t=>t.dispose());r.front.dispose();r.backMat.dispose();r.edgeMat.dispose();r.face.dispose()}this.rigs.clear();this.shadow.geometry.dispose();(this.shadow.material as T.Material).dispose();this.environment.dispose();this.shadowTex.dispose();this.backTex.dispose();this.renderer.dispose();this.renderer.forceContextLoss()}
}
