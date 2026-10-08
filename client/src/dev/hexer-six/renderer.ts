import * as T from 'three';
import {motion,ease,type Id} from './catalog';
type C=CanvasRenderingContext2D;
const N=40, M=8;
function rand(i:number){return ((Math.sin(i*78.233)*43758.5453)%1+1)%1;}
function texture(kind:number){
 const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d')!;
 const bases=['#64505d','#b3a4b9','#6a586c','#514259','#6c6578','#b1a390'];x.fillStyle=bases[kind];x.fillRect(0,0,256,512);
 for(let i=0;i<7000;i++){const a=rand(i+1),b=rand(i+9);x.fillStyle=`rgba(${kind===5?'47,26,37':'213,192,207'},${.018+rand(i+31)*.11})`;x.fillRect(a*256,b*512,kind===2?1:1+rand(i+8)*3,kind===2?15:1);}
 x.lineWidth=kind===1?1.3:.7;
 for(let j=0;j<19;j++){x.strokeStyle=kind===5?'#48363f':'#ad91a6';x.globalAlpha=kind===5?.85:.28;const y=20+j*25;
 for(let i=0;i<3;i++){const xx=43+i*81;x.beginPath();x.moveTo(xx-9,y-8);x.lineTo(xx+5,y-8);x.lineTo(xx+5,y+8);x.lineTo(xx-5,y+3);x.moveTo(xx-3,y-11);x.lineTo(xx-3,y+13);x.moveTo(xx-11,y+1);x.lineTo(xx+10,y-3);x.stroke();}}
 x.globalAlpha=1;x.strokeStyle=kind===5?'#51404a':'#a599ae';x.lineWidth=1;for(const a of [6,11,244,249]){x.beginPath();x.moveTo(a,0);x.lineTo(a,512);x.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
function ribbon(){const g=new T.BufferGeometry(),pos=new Float32Array((N+1)*(M+1)*3),uv=new Float32Array((N+1)*(M+1)*2),idx:number[]=[];for(let j=0;j<=N;j++)for(let k=0;k<=M;k++){let n=j*(M+1)+k;uv[n*2]=k/M;uv[n*2+1]=j/N;if(j<N&&k<M)idx.push(n,n+1,n+M+1,n+1,n+M+2,n+M+1);}g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);return g;}
export class Renderer{
 private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-245,245,290,-290,.1,2000);private boardCamera=new T.Camera();
 private materials:T.MeshStandardMaterial[]=[];private textures:T.Texture[]=[];private groups:T.Mesh[][]=[];
 private faceMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.02,side:T.DoubleSide,toneMapped:false});private face=new T.Mesh(new T.PlaneGeometry(223.2,313.2),this.faceMat);
 private body=new T.Mesh(new T.BoxGeometry(178,268,1.6),new T.MeshStandardMaterial({color:0x393035,roughness:.65,metalness:.3}));
 private shadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});private shadow=new T.Mesh(new T.PlaneGeometry(242,332),this.shadowMat);
 private light=new T.PointLight(0xab7bc7,0,270,1.5);private faceCache=new Map<HTMLCanvasElement,T.Texture>();private disposed=false;
 private sigilCanvas=document.createElement('canvas');private sigilTexture:T.CanvasTexture;private sigilMat:T.MeshBasicMaterial;private sigil:T.Mesh;
 constructor(){
 this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setSize(600,700,false);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.1;
 this.scene.add(new T.HemisphereLight(0xe6ddea,0x221727,2.5));const key=new T.DirectionalLight(0xffe8ce,3.6);key.position.set(-150,180,350);this.scene.add(key);const rim=new T.DirectionalLight(0xb79ccc,3);rim.position.set(180,-20,110);this.scene.add(rim);this.scene.add(this.face,this.body,this.shadow,this.light);
 const c=document.createElement('canvas');c.width=256;c.height=356;let x=c.getContext('2d')!;x.filter='blur(14px)';x.fillStyle='#110b19';x.fillRect(39,37,180,280);this.shadowMat.map=new T.CanvasTexture(c);this.shadow.position.z=.1;
 this.sigilCanvas.width=360;this.sigilCanvas.height=540;this.sigilTexture=new T.CanvasTexture(this.sigilCanvas);this.sigilTexture.colorSpace=T.SRGBColorSpace;this.sigilMat=new T.MeshBasicMaterial({map:this.sigilTexture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});this.sigil=new T.Mesh(new T.PlaneGeometry(180,270),this.sigilMat);this.scene.add(this.sigil);
 const colors=[0xc9b7c3,0xeee2ef,0xc3b0c8,0x9983ac,0xd3c5dc,0xe1d4c0];const rough=[.38,.29,.63,.16,.18,.91];
 for(let v=0;v<6;v++){const tex=texture(v);this.textures.push(tex);const m=new T.MeshStandardMaterial({color:colors[v],map:tex,roughness:rough[v],metalness:v===1?.35:v===4?.3:.08,bumpMap:tex,bumpScale:v===5?.22:.12,side:T.DoubleSide,transparent:true,depthWrite:true});this.materials.push(m);const list:T.Mesh[]=[];for(let j=0;j<14;j++){const mesh=new T.Mesh(ribbon(),m);mesh.frustumCulled=false;this.scene.add(mesh);list.push(mesh);}this.groups.push(list);}
 }
 private drawSigil(v:number,t:number,level:number){const c=this.sigilCanvas,x=c.getContext('2d')!;x.clearRect(0,0,360,540);let a=ease(.035,.18,t)*(1-ease(.76,.94,t));x.globalAlpha=a;
 x.strokeStyle='#b8a0c8';x.lineWidth=1.2;x.shadowColor='#9777b0';x.shadowBlur=5;
 const trace=ease(.025,.25,t);for(let j=0;j<2;j++){x.beginPath();const dx=14+j*7,dy=16+j*7;x.moveTo(dx,540-dy);x.lineTo(dx,540-dy-(540-2*dy)*trace);x.moveTo(360-dx,dy);x.lineTo(360-dx,dy+(540-2*dy)*trace);x.moveTo(dx,dy);x.lineTo(dx+(360-2*dx)*trace,dy);x.moveTo(360-dx,540-dy);x.lineTo(360-dx-(360-2*dx)*trace,540-dy);x.stroke();}
 x.shadowBlur=0;for(let j=0;j<10+level*3;j++){const yy=42+j*(448/(10+level*3)),xx=j%2?330:30;x.globalAlpha=a*ease(.06+j*.006,.2+j*.006,t);x.beginPath();x.moveTo(xx-4,yy-6);x.lineTo(xx+4,yy-2);x.lineTo(xx-2,yy+5);x.moveTo(xx,yy-8);x.lineTo(xx,yy+8);x.stroke();}
 if(v===3){x.strokeStyle='#735480';x.lineWidth=2;for(let j=0;j<8+level;j++){const yy=70+j*31;x.beginPath();x.moveTo(180,275);x.bezierCurveTo(180,yy,30+j%2*300,yy+20,30+j%2*300,yy-12);x.stroke();}}
 x.globalAlpha=1;this.sigilTexture.needsUpdate=true;
 }
 private prepare(face:HTMLCanvasElement,id:Id,v:number,ms:number,reduced:boolean){
 const m=motion(id,ms,reduced),{t,level,height,grow,open}=m,back=m.return;let tex=this.faceCache.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.faceCache.set(face,tex);if(this.faceCache.size>10){const oldest=this.faceCache.keys().next().value!;this.faceCache.get(oldest)!.dispose();this.faceCache.delete(oldest);}}if(this.faceMat.map!==tex){this.faceMat.map=tex;this.faceMat.needsUpdate=true;}
 this.face.position.z=height+2;this.body.position.z=height+.8;this.shadow.scale.set(1+height*.003,1+height*.002,1);this.shadowMat.opacity=.35-height*.003;this.light.position.set(0,0,height+55);this.light.intensity=7*grow*(1-back);this.sigil.position.z=height+2.15;this.sigil.visible=!reduced;this.drawSigil(v,t,level);
 const count=[6+level,6+level*2,4+Math.floor(level/2),8+level,6+Math.floor(level/2)*2,4+Math.floor(level/2)*2][v];
 const active=t>.075&&t<.94&&!reduced;
 for(let k=0;k<6;k++)for(let j=0;j<14;j++)this.groups[k][j].visible=active&&k===v&&j<count;
 if(!active)return;
 this.materials[v].opacity=(v===2?.62:1)*ease(.075,.15,t)*(1-ease(.9,.94,t));
 for(let j=0;j<count;j++){
 const mesh=this.groups[v][j],p=mesh.geometry.getAttribute('position') as T.BufferAttribute;const arr=p.array as Float32Array;
 const delay=j*.008,release=ease(.40+delay,.69+delay,t),rtn=ease(.66+delay,.9+delay,t),remain=1-rtn;
 for(let i=0;i<=N;i++){const u=i/N;for(let e=0;e<=M;e++){const s=e/M*2-1;let x=0,y=0,z=0;
 if(v===0){ // Continuous wedge coating: inner end rises as the anchored outer rim peels.
 const a=j/count*Math.PI*2+(s*.46)*Math.PI*2/count+.04*Math.sin(u*13+j);const rad=(.04+u*.96)*grow;const peel=release*(1-u);const radius=rad*(1-rtn*.95);
 x=Math.cos(a)*82*radius;y=Math.sin(a)*125*radius;z=3+Math.sin(u*Math.PI)*6*grow+3*(1-s*s)*grow+Math.sin(peel*Math.PI*.86)*70*remain;
 x+=Math.cos(a)*26*Math.sin(peel*Math.PI)*remain;y+=Math.sin(a)*18*Math.sin(peel*Math.PI)*remain;
 }else if(v===1){ // Alternating stitched cords cross the face, then retract toward their original eyelets.
 const yy=-107+j/(count-1)*214,extent=grow*remain,along=u*extent;
 x=-82+164*along;y=yy+Math.sin(along*Math.PI*2+j*.9)*11*release;
 const width=(1.4+level*.13)*(Math.sin(u*Math.PI)*.25+.8)*remain;
 y+=s*width;z=3+Math.sin(u*Math.PI)*((5+level*2)+release*70)*remain+Math.sin(u*35+j)*.6+Math.sqrt(1-s*s)*2*remain;
 x+=rtn*(j%2?160:0);x=Math.min(83,x);
 }else if(v===2){ // Broad woven silk grows inward from alternating edges and turns over its own seam.
 const side=j%2?1:-1,yy=-78+Math.floor(j/2)*156/(Math.ceil(count/2)-1),q=u*grow*(1-rtn);
 x=side*(83-q*100+release*42*Math.sin(q*Math.PI*1.6));y=yy+s*(29+level*2)*(1-.45*q)*remain;
 z=3+Math.sin(q*Math.PI)*(.8+release*89)+Math.sin(q*12+s*5+j)*6*release*remain;
 }else if(v===3){ // A fluid branch rises from the engraved capillary; no emitter or detached blob.
 const q=u*grow*remain,side=j%2?1:-1,yy=-110+Math.floor(j/2)*205/(Math.ceil(count/2)-1);const w=(5.7+level*.55)*(1-u*.92)*grow*remain;
 const bend=Math.sin(q*Math.PI)*7; x=side*(q*q*79)+Math.sin((yy+q*28)*.045)*9+s*w;y=yy+q*30+bend;z=3+Math.sin(q*Math.PI)*(10+open*50)*remain+Math.sqrt(1-s*s)*w;

 }else if(v===4){ // Paired facets open at their own long edges; they sink back along the hinge.
 const side=j%2?1:-1,row=Math.floor(j/2),yy=-112+row*224/(count/2-1),q=u*grow*(1-rtn),ang=release*1.5;
 x=side*(83-q*81*Math.cos(ang));y=yy+s*23*remain;z=3+Math.sin(ang)*q*81+Math.sin(u*Math.PI)*3+2*(1-Math.abs(s));z=3+(z-3)*remain;
 }else { // Paper slips extend from the corners; successive folds collapse back to the frame.
 const a=j/count*Math.PI*2+Math.PI/4,q=u*grow*remain;const r=1-q*.9,fold=Math.sin(q*Math.PI*3)*Math.sin(release*Math.PI*.9)*24*remain;
 x=Math.cos(a)*107*r+Math.sin(a)*s*14*remain;y=Math.sin(a)*149*r-Math.cos(a)*s*14*remain;z=3+Math.abs(fold)+q*release*25*remain;
 }
 const idx=(i*(M+1)+e)*3;arr[idx]=x;arr[idx+1]=y;arr[idx+2]=z+height+2.4;
 }}p.needsUpdate=true;mesh.geometry.computeVertexNormals();
 }
 }
 draw(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,w:number,h:number,reduced=false,angle='oblique'){
 if(this.disposed)return;this.prepare(face,id,v,ms,reduced);if(this.gl.domElement.width!==600||this.gl.domElement.height!==700)this.gl.setSize(600,700,false);
 const aspect=w/h;this.camera.left=-215*aspect;this.camera.right=215*aspect;this.camera.top=215;this.camera.bottom=-215;this.camera.up.set(0,0,1);
 if(angle==='top'){this.camera.up.set(0,1,0);this.camera.position.set(0,0,900);}else if(angle==='side')this.camera.position.set(110,-900,300);else this.camera.position.set(100,-800,900);
 this.camera.lookAt(0,0,23);this.camera.updateProjectionMatrix();this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,0,0,w,h);
 }
 drawBoard(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,matrix:DOMMatrix,w:number,h:number,reduced=false){
 this.prepare(face,id,v,ms,reduced);if(this.gl.domElement.width!==w||this.gl.domElement.height!==h)this.gl.setSize(w,h,false);const screen=new T.Matrix4().set(2/w,0,0,-1,0,-2/h,0,1,0,0,-1/2000,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,w,h);
 }
 get status(){return {disposed:this.disposed,geometries:this.gl.info.memory.geometries,textures:this.gl.info.memory.textures,faces:this.faceCache.size};}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.traverse(o=>{const mesh=o as T.Mesh;if(mesh.geometry)mesh.geometry.dispose();});this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.faceCache.forEach(t=>t.dispose());this.faceMat.dispose();this.body.material.dispose();this.shadowMat.map?.dispose();this.shadowMat.dispose();this.sigilTexture.dispose();this.sigilMat.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}
