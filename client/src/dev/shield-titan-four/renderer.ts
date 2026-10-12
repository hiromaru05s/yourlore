import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {finish,type Finish} from './material';
import {DURATION,designs,ease,lift} from './catalog';
const H=1.5625;
type Surface={mesh:T.Mesh;rest:Float32Array;finish:Finish;cx:number;cy:number;seed:number};
type Rig={scene:T.Scene;body:T.Group;surfaces:Surface[];table:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;shadow:T.Mesh;key:T.DirectionalLight;face:T.MeshBasicMaterial;wash:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;glow:T.PointLight;strokes:T.Line[]};
const noise=(n:number)=>{const a=Math.sin(n*127.1+9.7)*43758.5453;return a-Math.floor(a);};
// Convex cells are cut from the same surface: the cracks never become detached decoration.
function cells(){
 const seeds:number[][]=[];
 for(let y=0;y<6;y++)for(let x=0;x<4;x++)seeds.push([-.5+(x+.23+noise(y*4+x)*.54)/4,-H/2+(y+.24+noise(100+y*4+x)*.52)*H/6]);
 return seeds.map(([x,y],i)=>{
  let poly=[[-.5,-H/2],[.5,-H/2],[.5,H/2],[-.5,H/2]];
  seeds.forEach(([a,b],j)=>{if(i===j)return;const dx=a-x,dy=b-y,c=(a*a+b*b-x*x-y*y)/2,next:number[][]=[];
   for(let k=0;k<poly.length;k++){const p=poly[k],q=poly[(k+1)%poly.length],dp=p[0]*dx+p[1]*dy-c,dq=q[0]*dx+q[1]*dy-c;if(dp<=0)next.push(p);if((dp<0)!==(dq<0)){const u=dp/(dp-dq);next.push([p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u]);}}poly=next;
  });return{poly,x,y};
 });
}
export class TitanRenderer{
 readonly renderer:T.WebGLRenderer;
 private rigs:Rig[]=[];private geometries:T.BufferGeometry[]=[];private materials:T.Material[]=[];private textures:T.Texture[]=[];private texture?:T.CanvasTexture;private environment:T.WebGLRenderTarget;
 private camera=new T.OrthographicCamera(-2,2,1.4,-1.4,.01,30);private boardCamera=new T.Camera();private dead=false;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(1);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.045);room.dispose();pmrem.dispose();
  for(let v=0;v<4;v++)this.rigs.push(this.make(v));
 }
 private geo<G extends T.BufferGeometry>(g:G){this.geometries.push(g);return g;}
 private mat<M extends T.Material>(m:M){this.materials.push(m);return m;}
 private surface(r:Rig,g:T.BufferGeometry,kind:number,color:string,cx=0,cy=0,seed=0){
  const f=finish(kind,color);this.mat(f.mat);this.mat(f.depth);const mesh=new T.Mesh(this.geo(g),f.mat);mesh.customDepthMaterial=f.depth;mesh.castShadow=kind!==2;mesh.receiveShadow=true;r.body.add(mesh);
  const s:Surface={mesh,rest:new Float32Array(g.attributes.position.array),finish:f,cx,cy,seed};r.surfaces.push(s);return s;
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
  const catcher=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),this.mat(new T.ShadowMaterial({opacity:.21,depthWrite:false})));catcher.position.z=.013;catcher.receiveShadow=true;body.add(catcher);
  const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d')!,grad=ctx.createRadialGradient(64,64,1,64,64,64);grad.addColorStop(0,'rgba(120,218,255,.62)');grad.addColorStop(.4,'rgba(65,168,218,.22)');grad.addColorStop(1,'rgba(25,120,175,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const tex=new T.CanvasTexture(cv);this.textures.push(tex);
  const wash=new T.Mesh(this.geo(new T.PlaneGeometry(2.7,3.2)),this.mat(new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})));wash.position.z=-.01;scene.add(wash);
  const glow=new T.PointLight('#68cfff',0,2.5,2);glow.position.set(0,0,.32);scene.add(glow);
  const r:Rig={scene,body,surfaces:[],table,shadow,key,face,wash,glow,strokes:[]};
  if(v===0){
   cells().forEach(({poly,x,y},i)=>{
    const shape=new T.Shape();poly.forEach((p,j)=>{const px=x+(p[0]-x)*.989,py=y+(p[1]-y)*.989;j?shape.lineTo(px,py):shape.moveTo(px,py);});shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelSize:.009,bevelThickness:.013,bevelSegments:2,curveSegments:1,steps:1});
    const pos=g.attributes.position,uv=g.attributes.uv;for(let j=0;j<pos.count;j++)uv.setXY(j,pos.getX(j)+.5,pos.getY(j)/H+.5);
    this.surface(r,g,0,i%5===0?'#8a968d':'#969d90',x,y,i);
   });
  }else if(v===2){
   // A low-poly optical surface has deliberate large facets, unlike the flowing meshes.
   const grid=new T.PlaneGeometry(.998,H,6,9),p=grid.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(Math.abs(x)<.49&&Math.abs(y)<.77)p.setXY(i,x+(noise(i)*2-1)*.022,y+(noise(i+66)*2-1)*.028);}
   const g=grid.toNonIndexed();grid.dispose();this.surface(r,g,2,'#246c89');
   // Five engraved meridians follow the surface; they never orbit or float away.
   for(let k=0;k<5;k++){const a=new Float32Array(49*3),g=this.geo(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(a,3));const line=new T.Line(g,this.mat(new T.LineBasicMaterial({color:k===2?'#f6dfaa':'#a9e9f4',transparent:true,opacity:.6})));r.body.add(line);r.strokes.push(line);}
  }else this.surface(r,new T.PlaneGeometry(1,H,64,96),v,v===1?'#567f87':'#092b4c');
  return r;
 }
 setFace(canvas:HTMLCanvasElement){this.texture?.dispose();this.texture=new T.CanvasTexture(canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());for(const r of this.rigs){r.face.map=this.texture;r.face.needsUpdate=true;}}
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
  for(const s of r.surfaces){
   const {mesh,rest,finish:f,cx,cy,seed}=s;mesh.visible=t<2700;mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);f.time.value=t/1000;f.energy.value=power;
   const a=mesh.geometry.attributes.position;
   if(v===0){
    const formed=ease(30,660,t),release=ease(1160+noise(seed)*110,1930+noise(seed)*140,t),sink=ease(1850,2460,t);
    f.reveal.value=ease(1670,2570,t)*.73;
    for(let i=0;i<a.count;i++){
     const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],bulge=Math.max(0,1-(x/.57)**2)*Math.max(0,1-(y/.91)**2);
     const xx=this.shield(x,y,formed),yy=y*(1+.09*formed);
     a.setXYZ(i,xx+cx*.26*release*(1-sink),yy+cy*.12*release*(1-sink),.019+(z+.13*formed*bulge+formed*.065*Math.pow(Math.max(0,1-Math.abs(x)*4),2))*(1-sink*.9)+release*(1-sink)*(.08+noise(seed)*.10));
    }
   }else if(v===1){
    // The leading edge rolls over the fluid sheet, then a diagonal current draws it back in.
    const cast=ease(0,750,t),recede=ease(1280,2280,t),shape=cast*(1-recede);
    f.reveal.value=ease(1570,2500,t)*1.02;
    for(let i=0;i<a.count;i++){
     const x=rest[i*3],y=rest[i*3+1],u=x+.5,w=y/H+.5;
     const curl=ease(0,470,t)*(1-ease(480,880,t))+.6*ease(1350,1680,t)*(1-ease(1750,2200,t));
     const dome=Math.max(0,1-(x/.56)**2)*Math.max(0,1-(y/.91)**2);
     const xx=this.shield(x,y,shape)+curl*.11*Math.sin(w*4.8)*Math.sin(w*Math.PI);
     const yy=y*(1+shape*.15)+curl*.045*Math.sin(u*4+w*3);
     const zz=.027+shape*(.10+.29*dome)+curl*.24*Math.pow(w,2)*(Math.sin(w*7-t*.004)*.5+.5);
     a.setXYZ(i,xx,yy,zz);
    }
   }else if(v===2){
    f.reveal.value=ease(1730,2520,t)*1.02;
    for(let i=0;i<a.count;i++){const p=this.crystal(rest[i*3],rest[i*3+1],t);a.setXYZ(i,...p);}
   }else{
    // A biased travelling fold, fixed to the lower card edge, gives the cloth weight and drag.
    const billow=ease(0,650,t)*(1-ease(1430,2350,t));f.reveal.value=ease(1640,2540,t)*.98;
    for(let i=0;i<a.count;i++){
     const x=rest[i*3],y=rest[i*3+1],u=x+.5,w=y/H+.5;
     const anchor=Math.sin(Math.PI*w*.91),fold=Math.sin(w*7.4+u*3.8-t*.005),small=Math.sin(u*18+w*7-t*.003);
     const xx=x*(1+billow*.24)+billow*.17*anchor*Math.sin(w*3.8-t*.002),yy=y+billow*.13*Math.sin(u*4+w*3);
     const zz=.025+billow*(.22*anchor+.24*anchor*(fold*.5+.5)+.055*small*anchor);
     a.setXYZ(i,xx,yy,zz);
    }
   }
   a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
  r.strokes.forEach((line,k)=>{
   const a=line.geometry.attributes.position;const vis=ease(350+k*55,710+k*55,t)*(1-ease(1620+k*65,2150+k*65,t));line.visible=t<2380;(line.material as T.LineBasicMaterial).opacity=vis*(k===2?.85:.40);
   for(let i=0;i<a.count;i++){const y=-H/2+i/(a.count-1)*H,x=(k-2)*.202*(.86+.14*Math.sin(i/(a.count-1)*Math.PI)),p=this.crystal(x,y,t);a.setXYZ(i,p[0],p[1],p[2]+.006);}a.needsUpdate=true;line.geometry.computeBoundingSphere();
  });
  if(t>=DURATION){r.body.position.z=0;r.surfaces.forEach(s=>s.mesh.visible=false);r.strokes.forEach(s=>s.visible=false);r.wash.material.opacity=0;r.glow.intensity=0;}
  return r;
 }
 draw(canvas:HTMLCanvasElement,v:number,t:number,reduced=false,dark=false){if(this.dead)return;const w=canvas.width,h=canvas.height;this.size(w,h);const r=this.update(v,t,reduced);r.table.visible=true;r.shadow.visible=false;r.table.material.color.set(dark?'#172431':'#e7e3dc');
  const aspect=w/h;this.camera.left=-1.12*aspect;this.camera.right=1.12*aspect;this.camera.top=1.12;this.camera.bottom=-1.12;this.camera.position.set(.42,-3.0,4.9);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.13);this.camera.updateProjectionMatrix();this.renderer.render(r.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.renderer.domElement,0,0);
 }
 drawBoard(canvas:HTMLCanvasElement,v:number,t:number,matrix:DOMMatrix,reduced=false){if(this.dead)return;this.size(canvas.width,canvas.height);const ndc=new T.Matrix4().set(2/innerWidth,0,0,-1,0,-2/innerHeight,0,1,0,0,-.0001,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(ndc.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();const r=this.update(v,t,reduced);r.table.visible=false;r.shadow.visible=true;this.renderer.render(r.scene,this.boardCamera);canvas.getContext('2d')!.drawImage(this.renderer.domElement,0,0);}
 private size(w:number,h:number){if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);}
 get stats(){return{contexts:this.dead?0:1,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls};}
 dispose(){if(this.dead)return;this.dead=true;this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.texture?.dispose();this.environment.dispose();this.rigs.forEach(r=>r.key.shadow.map?.dispose());this.renderer.dispose();this.renderer.forceContextLoss();}
}
