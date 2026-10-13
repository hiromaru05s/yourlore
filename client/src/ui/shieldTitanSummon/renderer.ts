import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {finish,type Finish} from './material';
import {DURATION,designs,ease,lift} from './catalog';
const H=1.5625;
type Surface={mesh:T.Mesh;rest:Float32Array;finish:Finish;};
type Rig={scene:T.Scene;body:T.Group;surfaces:Surface[];table:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;shadow:T.Mesh;key:T.DirectionalLight;face:T.MeshBasicMaterial;wash:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;glow:T.PointLight;strokes:T.Line[]};
const noise=(n:number)=>{const a=Math.sin(n*127.1+9.7)*43758.5453;return a-Math.floor(a);};
export class Renderer{
 readonly renderer:T.WebGLRenderer;
 private rigs:Rig[]=[];private geometries:T.BufferGeometry[]=[];private materials:T.Material[]=[];private textures:T.Texture[]=[];private faces=new Map<HTMLCanvasElement,T.CanvasTexture>();private environment:T.WebGLRenderTarget;
 private camera=new T.OrthographicCamera(-2,2,1.4,-1.4,.01,30);private boardCamera=new T.Camera();private dead=false;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.debug.checkShaderErrors=import.meta.env?.DEV??true;this.renderer.setPixelRatio(1);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.045);room.dispose();pmrem.dispose();
  for(let v=0;v<designs.length;v++)this.rigs.push(this.make(v));
 }
 private geo<G extends T.BufferGeometry>(g:G){this.geometries.push(g);return g;}
 private mat<M extends T.Material>(m:M){this.materials.push(m);return m;}
 private surface(r:Rig,g:T.BufferGeometry,kind:number,color:string){
  const f=finish(kind,color);this.mat(f.mat);this.mat(f.depth);const mesh=new T.Mesh(this.geo(g),f.mat);mesh.customDepthMaterial=f.depth;mesh.castShadow=true;mesh.receiveShadow=false;r.body.add(mesh);
  const s:Surface={mesh,rest:new Float32Array(g.attributes.position.array),finish:f};r.surfaces.push(s);return s;
 }
 private make(v:number):Rig{
  const scene=new T.Scene();scene.environment=this.environment.texture;scene.environmentIntensity=.75;scene.add(new T.HemisphereLight('#d8ebff','#222c36',1.25));
  const key=new T.DirectionalLight('#fff0d4',2.2);key.position.set(-2,1,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:2.5,bottom:-2.5,near:.1,far:12});key.shadow.bias=-.0002;key.shadow.normalBias=.004;scene.add(key);
  const rim=new T.DirectionalLight('#5e9bbc',1.5);rim.position.set(2,1.8,1.3);scene.add(rim);
  const table=new T.Mesh(this.geo(new T.PlaneGeometry(20,20)),this.mat(new T.MeshStandardMaterial({color:'#e7e3dc',roughness:.95})));table.position.z=-.025;table.receiveShadow=true;scene.add(table);
  const body=new T.Group();scene.add(body);
  const thickness=new T.Mesh(this.geo(new T.BoxGeometry(.993,H-.006,.016)),this.mat(new T.MeshStandardMaterial({color:'#443e36',roughness:.67})));thickness.castShadow=true;body.add(thickness);
  const face=this.mat(new T.MeshBasicMaterial({transparent:true,toneMapped:false}));const card=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),face);card.position.z=.010;body.add(card);
  const shadow=new T.Mesh(this.geo(new T.PlaneGeometry(4,4)),this.mat(new T.ShadowMaterial({opacity:.26,depthWrite:false})));shadow.position.z=-.015;shadow.receiveShadow=true;scene.add(shadow);
  const catcher=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),this.mat(new T.ShadowMaterial({opacity:.45,depthWrite:false})));catcher.position.z=.013;catcher.receiveShadow=true;body.add(catcher);
  const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d')!,grad=ctx.createRadialGradient(64,64,1,64,64,64);grad.addColorStop(0,'rgba(120,218,255,.62)');grad.addColorStop(.4,'rgba(65,168,218,.22)');grad.addColorStop(1,'rgba(25,120,175,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const tex=new T.CanvasTexture(cv);this.textures.push(tex);
  const wash=new T.Mesh(this.geo(new T.PlaneGeometry(2.7,3.2)),this.mat(new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})));wash.position.z=-.01;scene.add(wash);
  const glow=new T.PointLight('#68cfff',0,2.5,2);glow.position.set(0,0,.32);scene.add(glow);
  const r:Rig={scene,body,surfaces:[],table,shadow,key,face,wash,glow,strokes:[]};
  const grid=(width:number,nx:number,ny:number,x=0)=>{
   const g=new T.PlaneGeometry(width,H,nx,ny);g.translate(x,0,0);const p=g.attributes.position,uv=g.attributes.uv;
   for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i);if(Math.abs(xx-x)<width*.49&&Math.abs(yy)<.77)p.setXY(i,xx+(noise(i)*2-1)*.012,yy+(noise(i+66)*2-1)*.019);uv.setXY(i,p.getX(i)+.5,p.getY(i)/H+.5);}
   const out=g.toNonIndexed();g.dispose();return out;
  };
  this.surface(r,grid(.998,6,9),v,'#246c89');
  // The selected R4-05 retains the R3-01 mesh and engraved meridians.
  for(let k=0;k<5;k++){const a=new Float32Array(49*3),g=this.geo(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(a,3));const line=new T.Line(g,this.mat(new T.LineBasicMaterial({color:k===2?'#f6dfaa':'#a9e9f4',transparent:true,opacity:.6})));r.body.add(line);r.strokes.push(line);}
  return r;
 }
 setFace(canvas:HTMLCanvasElement){let texture=this.faces.get(canvas);if(!texture){texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.faces.set(canvas,texture);}for(const r of this.rigs){if(r.face.map!==texture){r.face.map=texture;r.face.needsUpdate=true;}}}
 releaseFace(canvas:HTMLCanvasElement){const texture=this.faces.get(canvas);if(!texture)return;for(const r of this.rigs)if(r.face.map===texture){r.face.map=null;r.face.needsUpdate=true;}texture.dispose();this.faces.delete(canvas);}
 // The shield's shoulders and pointed foot are sculpted from the original rectangular face.
 private shield(x:number,y:number,strength:number){
  const Y=y/(H/2),lower=Math.max(0,-Y),upper=Math.max(0,(Y-.60)/.40);
  const width=1-.70*Math.pow(lower,1.7)-.12*upper*upper;
  return x*(1+(width*1.22-1)*strength);
 }
 private crystal(x:number,y:number,t:number):[number,number,number]{
  const delay=(y/H+.5)*250, grow=ease(90+delay,720+delay,t),settle=ease(1390+(1-y/H)*90,2130+(1-y/H)*70,t),a=grow*(1-settle),xx=this.shield(x,y,a),yy=y*(1+.1*a);
  const dome=Math.max(0,1-Math.abs(x/.55))*Math.max(0,1-Math.abs(y/.90));
  return[xx,yy,.025+a*(.10+dome*.63)];
 }
 private update(v:number,t:number,reduced:boolean){
  if(reduced)t=DURATION;const r=this.rigs[v],hit=designs[v].hit;
  r.body.position.set(0,0,lift(v,t));r.body.rotation.set(0,0,0);
  const swell=ease(40,720,t),impact=ease(hit-35,hit+16,t)*(1-ease(hit+40,hit+270,t)),power=swell*(1-ease(hit+180,2380,t));
  r.wash.material.opacity=impact*.55;r.wash.scale.setScalar(1+.25*ease(hit,hit+280,t));r.glow.intensity=power*.23+impact*.9;
  r.key.shadow.intensity=1-(1-designs[v].shadow)*ease(0,220,t)*(1-ease(2500,2730,t));
  for(const s of r.surfaces){
   const {mesh,rest,finish:f}=s;mesh.visible=t<2730;f.time.value=t/1000;f.energy.value=power;const a=mesh.geometry.attributes.position;
   f.reveal.value=ease(1730,2520,t)*1.02;
   for(let i=0;i<a.count;i++){
    const [xx,yy,zz]=this.crystal(rest[i*3],rest[i*3+1],t);
    a.setXYZ(i,xx,yy,zz);
   }
   a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();

  }
  r.strokes.forEach((line,k)=>{
   const a=line.geometry.attributes.position;const vis=ease(350+k*55,710+k*55,t)*(1-ease(1620+k*65,2150+k*65,t));line.visible=t<2380;(line.material as T.LineBasicMaterial).opacity=vis*(k===2?.85:.40);
   for(let i=0;i<a.count;i++){const y=-H/2+i/(a.count-1)*H,x=(k-2)*.202*(.86+.14*Math.sin(i/(a.count-1)*Math.PI)),p=this.crystal(x,y,t);a.setXYZ(i,p[0],p[1],p[2]+.006);}a.needsUpdate=true;line.geometry.computeBoundingSphere();
  });
  if(t>=DURATION){r.body.position.z=0;r.surfaces.forEach(s=>{s.mesh.visible=false;});r.strokes.forEach(s=>s.visible=false);r.wash.material.opacity=0;r.glow.intensity=0;}
  return r;
 }
 draw(canvas:HTMLCanvasElement,v:number,t:number,reduced=false,dark=false){if(this.dead)return;const w=canvas.width,h=canvas.height;this.size(w,h);const r=this.update(v,t,reduced);r.table.visible=true;r.shadow.visible=false;r.table.material.color.set(dark?'#172431':'#e7e3dc');
  const aspect=w/h;this.camera.left=-1.12*aspect;this.camera.right=1.12*aspect;this.camera.top=1.12;this.camera.bottom=-1.12;this.camera.position.set(.42,-3.0,4.9);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.13);this.camera.updateProjectionMatrix();this.renderer.render(r.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.renderer.domElement,0,0);
 }
 drawBoard(canvas:HTMLCanvasElement,v:number,t:number,matrix:DOMMatrix,reduced=false){if(this.dead)return;this.size(canvas.width,canvas.height);
  // Preserve DOM projection while giving PBR a real eye position for reflection and absorption.
  this.boardCamera.position.set(.42,-3,4.9);this.boardCamera.up.set(0,0,1);this.boardCamera.lookAt(0,0,.13);this.boardCamera.updateMatrixWorld(true);
  const ndc=new T.Matrix4().set(2/innerWidth,0,0,-1,0,-2/innerHeight,0,1,0,0,-.0001,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(ndc.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))).multiply(this.boardCamera.matrixWorld));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();const r=this.update(v,t,reduced);r.table.visible=false;r.shadow.visible=true;this.renderer.render(r.scene,this.boardCamera);canvas.getContext('2d')!.drawImage(this.renderer.domElement,0,0);}
 private size(w:number,h:number){if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);}
 get stats(){return{contexts:this.dead?0:1,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls};}
 dispose(){if(this.dead)return;this.dead=true;this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.faces.forEach(t=>t.dispose());this.faces.clear();this.environment.dispose();this.rigs.forEach(r=>r.key.shadow.map?.dispose());this.renderer.dispose();this.renderer.forceContextLoss();}
}
