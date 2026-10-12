import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {finish,type Finish} from './material';
import {DURATION,designs,ease,lift} from './catalog';
const H=1.5625;
type Surface={mesh:T.Mesh;rest:Float32Array;finish:Finish;cx:number;cy:number;seed:number;rim?:{line:T.LineLoop;indices:number[]}};
type Rig={scene:T.Scene;body:T.Group;surfaces:Surface[];table:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;shadow:T.Mesh;key:T.DirectionalLight;face:T.MeshBasicMaterial;wash:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;glow:T.PointLight;strokes:T.Line[]};
const noise=(n:number)=>{const a=Math.sin(n*127.1+9.7)*43758.5453;return a-Math.floor(a);};
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
  const f=finish(kind,color);this.mat(f.mat);this.mat(f.depth);const mesh=new T.Mesh(this.geo(g),f.mat);mesh.customDepthMaterial=f.depth;mesh.castShadow=false;mesh.receiveShadow=true;r.body.add(mesh);
  const s:Surface={mesh,rest:new Float32Array(g.attributes.position.array),finish:f,cx,cy,seed};r.surfaces.push(s);return s;
 }
 private outline(r:Rig,s:Surface,indices:number[]){
  const g=this.geo(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(new Float32Array(indices.length*3),3));
  const line=new T.LineLoop(g,this.mat(new T.LineBasicMaterial({color:'#83c9dd',transparent:true,opacity:0,depthWrite:false})));r.body.add(line);s.rim={line,indices};
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
  const grid=(width:number,nx:number,ny:number,x=0)=>{
   const g=new T.PlaneGeometry(width,H,nx,ny);g.translate(x,0,0);const p=g.attributes.position,uv=g.attributes.uv;
   for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i);if(Math.abs(xx-x)<width*.49&&Math.abs(yy)<.77)p.setXY(i,xx+(noise(i)*2-1)*.012,yy+(noise(i+66)*2-1)*.019);uv.setXY(i,p.getX(i)+.5,p.getY(i)/H+.5);}
   const out=g.toNonIndexed();g.dispose();return out;
  };
  if(v===0)this.surface(r,grid(.998,6,9),v,'#246c89');
  if(v===1)for(const side of [-1,1]){
   const s=this.surface(r,grid(.5,3,9,side*.25),v,'#246c89',side),p=s.mesh.geometry.attributes.position,unique=new Map<string,number>();
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(Math.abs(Math.abs(x-side*.25)-.25)<.0001||Math.abs(Math.abs(y)-H/2)<.0001)unique.set(x.toFixed(5)+':'+y.toFixed(5),i);}
   const indices=[...unique.values()].sort((a,b)=>Math.atan2(p.getY(a),p.getX(a)-side*.25)-Math.atan2(p.getY(b),p.getX(b)-side*.25));this.outline(r,s,indices);
  }
  if(v===2){
   const perimeter=[[-.5,-H/2],[0,-H/2],[.5,-H/2],[.5,0],[.5,H/2],[0,H/2],[-.5,H/2],[-.5,0]];
   perimeter.forEach((p,k)=>{
    const q=perimeter[(k+1)%8],pos:number[]=[],uv:number[]=[];const n=4;
    const add=(u:number,w:number)=>{const x=p[0]*u+q[0]*w,y=p[1]*u+q[1]*w;pos.push(x,y,1-u-w);uv.push(x+.5,y/H+.5);};
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){add(i/n,j/n);add((i+1)/n,j/n);add(i/n,(j+1)/n);if(i+j<n-1){add((i+1)/n,j/n);add((i+1)/n,(j+1)/n);add(i/n,(j+1)/n);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const surface=this.surface(r,g,v,'#246c89',(p[0]+q[0])/2,(p[1]+q[1])/2,k);
    const points=[[0,0],p,q],a=g.attributes.position,indices=points.map(([x,y])=>{let best=0,dist=Infinity;for(let j=0;j<a.count;j++){const d=(a.getX(j)-x)**2+(a.getY(j)-y)**2;if(d<dist){dist=d;best=j;}}return best;});this.outline(r,surface,indices);
   });
  }
  if(v===3)for(let k=0;k<7;k++)this.surface(r,grid(1/7,2,10,(k-3)/7),v,'#246c89',(k-3)/7,0,k);
  // Meridians belong to the continuous monolith; the other three use their real cut edges.
  if(v===0)for(let k=0;k<5;k++){const a=new Float32Array(49*3),g=this.geo(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(a,3));const line=new T.Line(g,this.mat(new T.LineBasicMaterial({color:k===2?'#f6dfaa':'#a9e9f4',transparent:true,opacity:.6})));r.body.add(line);r.strokes.push(line);}
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
   const {mesh,rest,finish:f,cx,cy,seed}=s;mesh.visible=t<2730;f.time.value=t/1000;f.energy.value=power;const a=mesh.geometry.attributes.position;
   const settle=ease(1510,2320,t);
   f.reveal.value=v===0?ease(1730,2520,t)*1.02:v===1?ease(1640,2530,t)*1.04:v===2?ease(1730+(seed%4)*70,2520+(seed%4)*35,t)*1.04:ease(1640+seed*65,2450+seed*36,t)*1.04;
   for(let i=0;i<a.count;i++){
    const x=rest[i*3],y=rest[i*3+1];let xx=x,yy=y,zz=.025;
    if(v===0){[xx,yy,zz]=this.crystal(x,y,t);}
    if(v===1){
     const side=cx,inner=1-Math.abs(x)*2,grow=ease(90+(side===1?160:0),790+(side===1?100:0),t)*(1-settle);
     const meet=ease(480,1050,t)*(1-ease(1450,2080,t));
     xx=x+side*(.085*(1-inner)-.17*inner)*grow;
     yy=y*(1+.055*grow)+side*.15*inner*meet;
     zz=.025+grow*(.04+inner*.45+Math.sin((y/H+.5)*Math.PI)*.10)+(side===1?.025:0)*grow;
     // The upper shoulders and lower tips taper independently on each interlocking half.
     xx+=(side*.25-x)*grow*.20*Math.pow(Math.abs(y)/(H/2),3);
    }
    if(v===2){
     const inner=rest[i*3+2],delay=(seed%4)*67,grow=ease(80+delay,670+delay,t),open=ease(470+delay,1110+delay,t),returning=ease(1480+delay,2260+delay,t),alive=1-returning;
     xx=x+cx*.70*inner*open*alive;yy=y+cy*.70*inner*open*alive;
     zz=.025+grow*alive*(.035+inner*(.69+.09*Math.sin(seed*Math.PI/4)));
     // The boundary vertices remain at the card edge throughout the opening.
    }
    if(v===3){
     const w=y/H+.5,delay=seed*82+(1-w)*175,grow=ease(40+delay,580+delay,t),back=ease(1480+seed*65,2180+seed*65,t),amp=grow*(1-back);
     const cross=Math.max(0,1-Math.abs((x-cx)*14)),long=Math.max(0,1-Math.abs(y/(H*.56)));
     xx=this.shield(x,y,amp*.65);yy=y*(1+amp*(.04+.10*Math.sin(seed*1.2)))+amp*.025*Math.sin(seed);
     zz=.025+amp*(.06+cross*long*(.29+.26*Math.sin((seed+1)*Math.PI/8)));
    }
    a.setXYZ(i,xx,yy,zz);
   }
   a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
   if(s.rim){const {line,indices}=s.rim,positions=line.geometry.attributes.position;line.visible=t<2500;for(let j=0;j<indices.length;j++){const i=indices[j];positions.setXYZ(j,a.getX(i),a.getY(i),a.getZ(i)+.0015);}positions.needsUpdate=true;line.geometry.computeBoundingSphere();(line.material as T.LineBasicMaterial).opacity=.52*ease(100,700,t)*(1-ease(1680,2430,t));}
  }
  r.strokes.forEach((line,k)=>{
   const a=line.geometry.attributes.position;const vis=ease(350+k*55,710+k*55,t)*(1-ease(1620+k*65,2150+k*65,t));line.visible=t<2380;(line.material as T.LineBasicMaterial).opacity=vis*(k===2?.85:.40);
   for(let i=0;i<a.count;i++){const y=-H/2+i/(a.count-1)*H,x=(k-2)*.202*(.86+.14*Math.sin(i/(a.count-1)*Math.PI)),p=this.crystal(x,y,t);a.setXYZ(i,p[0],p[1],p[2]+.006);}a.needsUpdate=true;line.geometry.computeBoundingSphere();
  });
  if(t>=DURATION){r.body.position.z=0;r.surfaces.forEach(s=>{s.mesh.visible=false;if(s.rim)s.rim.line.visible=false;});r.strokes.forEach(s=>s.visible=false);r.wash.material.opacity=0;r.glow.intensity=0;}
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
