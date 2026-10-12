import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {alloy,type Cut} from './material';
import {DURATION,designs,ease,lift} from './catalog';
const H=1.5625;
type Part={node:T.Group;home:T.Vector3;cuts:Cut[];index:number};
type Rig={scene:T.Scene;body:T.Group;parts:Part[];table:T.Group;shadow:T.Mesh;key:T.DirectionalLight;face:T.MeshBasicMaterial;light:T.MeshBasicMaterial;contact:T.Mesh;pressure:T.Group;skin?:T.Mesh<T.PlaneGeometry>;base?:Float32Array;core?:T.Group;closed:T.Group};
/** Four independently authored rigs; one shared WebGL context and one clock per frame. */
export class TitanRenderer{
 readonly renderer:T.WebGLRenderer;
 private rigs:Rig[]=[];private geometries:T.BufferGeometry[]=[];private materials:T.Material[]=[];private texture?:T.CanvasTexture;
 private camera=new T.OrthographicCamera(-2,2,1.4,-1.4,.01,30);private boardCamera=new T.Camera();private dead=false;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(1);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  for(let v=0;v<4;v++)this.rigs.push(this.make(v));
 }
 private geo<G extends T.BufferGeometry>(g:G){this.geometries.push(g);return g;}
 private mat<M extends T.Material>(m:M){this.materials.push(m);return m;}
 private shape(points:number[][],depth=.035){const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return this.geo(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,bevelSegments:2,steps:1,curveSegments:1}));}
 private metal(geometry:T.BufferGeometry,color:string,part:Part,kind=0){const a=alloy(color,kind);this.mat(a.mat);this.mat(a.depth);part.cuts.push(a.uniforms);const mesh=new T.Mesh(geometry,a.mat);mesh.customDepthMaterial=a.depth;mesh.castShadow=true;mesh.receiveShadow=true;part.node.add(mesh);return mesh;}
 private plate(points:number[][],part:Part,stone=true){
  const base=this.metal(this.shape(points), '#98734a',part);
  const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;
  const inset=points.map(p=>[cx+(p[0]-cx)*.88,cy+(p[1]-cy)*.88]);
  const fill=this.metal(this.shape(inset,.012),stone?'#d1c9b4':'#334a55',part,stone?1:0);fill.position.z=.043;
  // Fine brass inlay, interrupted grooves and inset studs give the broad shield its scale.
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length];const ax=cx+(p[0]-cx)*.96,ay=cy+(p[1]-cy)*.96,bx=cx+(q[0]-cx)*.96,by=cy+(q[1]-cy)*.96;
   const bar=this.metal(this.geo(new T.BoxGeometry(Math.hypot(bx-ax,by-ay),.005,.004)),'#edd1a0',part);bar.position.set((ax+bx)/2,(ay+by)/2,.043);bar.rotation.z=Math.atan2(by-ay,bx-ax);
   if(i%2===0){const stud=this.metal(this.geo(new T.SphereGeometry(.014,7,5)),'#b38a50',part);stud.scale.z=.45;stud.position.set(cx+(p[0]-cx)*.86,cy+(p[1]-cy)*.86,.065);}
  }
  return base;
 }
 private part(r:Rig,index:number,x=0,y=0,z=.018){const p:Part={node:new T.Group(),home:new T.Vector3(x,y,z),cuts:[],index};p.node.position.copy(p.home);r.body.add(p.node);r.parts.push(p);return p;}
 private gem(part:Part,x:number,y:number,size=.08){
  const g=this.metal(this.geo(new T.OctahedronGeometry(size,0)),'#48afc5',part);g.position.set(x,y,.11);g.scale.set(.8,1,.5);(g.material as T.MeshStandardMaterial).emissive.set('#166b82');(g.material as T.MeshStandardMaterial).emissiveIntensity=.6;
  const inner=this.metal(this.geo(new T.OctahedronGeometry(size*.49,0)),'#aee6eb',part);inner.position.set(x,y,.139);inner.scale.set(.7,1,.36);(inner.material as T.MeshStandardMaterial).emissive.set('#7cc5d3');(inner.material as T.MeshStandardMaterial).emissiveIntensity=.5;
 }
 private make(v:number):Rig{
  const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff7e4','#4e6671',2.25));
  const key=new T.DirectionalLight('#fff0d2',3.1);key.position.set(-2.5,2,5);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-1.7,right:1.7,top:2,bottom:-2,near:.1,far:12});key.shadow.bias=-.0003;key.shadow.normalBias=.007;scene.add(key);
  const fill=new T.DirectionalLight('#b0deef',1.45);fill.position.set(2,-1,2.5);scene.add(fill);
  const table=new T.Group();scene.add(table);
  const slab=new T.Mesh(this.geo(new T.BoxGeometry(20,20,.06)),this.mat(new T.MeshStandardMaterial({color:'#e4dfd4',roughness:.93})));slab.position.z=-.04;slab.receiveShadow=true;table.add(slab);
  const seams=new T.LineSegments(this.geo(new T.BufferGeometry().setFromPoints([new T.Vector3(-2.4,1.02,-.009),new T.Vector3(2.4,1.02,-.009),new T.Vector3(-1.3,-2,-.009),new T.Vector3(-1.3,2,-.009)])),this.mat(new T.LineBasicMaterial({color:'#9b9485',transparent:true,opacity:.2})));table.add(seams);
  const body=new T.Group();scene.add(body);
  const thickness=new T.Mesh(this.geo(new T.BoxGeometry(.984,H-.008,.019)),this.mat(new T.MeshStandardMaterial({color:'#786248',roughness:.66})));thickness.castShadow=true;body.add(thickness);
  const face=this.mat(new T.MeshBasicMaterial({transparent:true,toneMapped:false}));const card=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),face);card.position.z=.011;body.add(card);
  const shadow=new T.Mesh(this.geo(new T.PlaneGeometry(3.5,3.7)),this.mat(new T.ShadowMaterial({opacity:.23,depthWrite:false})));shadow.position.z=-.007;shadow.receiveShadow=true;scene.add(shadow);
  const catcher=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),this.mat(new T.ShadowMaterial({opacity:.25,depthWrite:false})));catcher.position.z=.012;catcher.receiveShadow=true;body.add(catcher);
  const light=this.mat(new T.MeshBasicMaterial({color:'#68d5e8',transparent:true,opacity:0,depthWrite:false}));
  const contact=new T.Mesh(this.geo(new T.PlaneGeometry(1.08,H+ .08)),light);contact.position.z=-.004;scene.add(contact);
  const pressure=new T.Group();scene.add(pressure);
  for(let i=0;i<8;i++){const s=i%2?1:-1,j=Math.floor(i/2),line=new T.Mesh(this.geo(new T.BoxGeometry(.12+j*.018,.007,.002)),this.mat(new T.MeshBasicMaterial({color:'#b9a688',transparent:true,opacity:0})));line.position.set(s*.6,(j-1.5)*.29,.001);line.rotation.z=s*(j-1.5)*.18;pressure.add(line);}
  const closed=new T.Group();body.add(closed);
  const r:Rig={scene,body,parts:[],table,shadow,key,face,light,contact,pressure,closed};
  if(v===0){
   const p=this.part(r,0,0,0,.024);
   this.plate([[-.49,-.65],[0,-.79],[.49,-.65],[.49,.65],[.37,.77],[-.37,.77],[-.49,.65]],p,false);
   for(const y of [-.51,.50]){const band=this.metal(this.geo(new T.BoxGeometry(.91,.073,.040)),'#bba271',p);band.position.set(0,y,.08);}
   const keel=this.metal(this.geo(new T.BoxGeometry(.048,1.24,.058)),'#c8aa72',p);keel.position.set(0,0,.082);
   for(const side of [-1,1]){const emblem=this.metal(this.shape([[side*.04,.02],[side*.36,.21],[side*.36,.28],[side*.04,.09]],.015),'#e2c791',p);emblem.position.z=.078;}
   this.gem(p,0,.02,.115);
  }else if(v===1){
   for(let i=0;i<7;i++){
    const y=.66-i*.218,p=this.part(r,i,0,y,.025+i*.007);
    this.plate([[-.49,-.095],[-.40,-.139],[.38,-.139],[.49,-.077],[.49,.105],[.37,.133],[-.49,.105]],p,true);
    const ridge=this.metal(this.shape([[-.43,-.065],[0,-.12],[.43,-.065],[.40,-.025],[0,-.072],[-.40,-.025]],.008),'#a18c63',p);ridge.position.z=.072;
    const groove=this.metal(this.geo(new T.BoxGeometry(.59,.008,.003)),'#52737b',p);groove.position.set(0,-.059,.066);
    const cap=this.metal(this.geo(new T.BoxGeometry(.045,.19,.022)),'#a28050',p);cap.position.set(i%2?.34:-.34,0,.070);if(i===3)this.gem(p,0,0,.072);
   }
  }else if(v===2){
   const p=this.part(r,0,0,0,.038);const g=this.geo(new T.PlaneGeometry(.985,H-.025,40,64));
   const a=alloy('#aebbb3');this.mat(a.mat);this.mat(a.depth);p.cuts.push(a.uniforms);a.mat.side=T.DoubleSide;a.mat.metalness=.83;a.mat.roughness=.38;
   const skin=new T.Mesh(g,a.mat);skin.customDepthMaterial=a.depth;skin.castShadow=true;skin.receiveShadow=true;p.node.add(skin);r.skin=skin;r.base=new Float32Array(g.attributes.position.array);
   const core=this.part(r,1,0,0,.047);this.gem(core,0,0,.135);r.core=core.node;
   for(let i=0;i<4;i++){const rib=this.part(r,i+2);const x=(i-1.5)*.244;const ridge=this.metal(this.geo(new T.BoxGeometry(.018,H-.035,.027)),'#b69660',rib);ridge.position.set(x,0,.036);}
  }else{
   for(const side of [-1,1]){
    for(let j=0;j<3;j++){
     const p=this.part(r,r.parts.length,side*.495,(j-1)*.512,.025);
     const a=side===-1?0:-.495,b=side===-1?.495:0;
     this.plate([[a,-.243],[b,-.243],[b,.243],[a,.243]],p,true);
     const rail=this.metal(this.geo(new T.BoxGeometry(.065,.40,.026)),'#9d7b4d',p);rail.position.set((a+b)/2,0,.07);
     for(const y of [-.19,.19]){const cap=this.metal(this.geo(new T.BoxGeometry(.46,.026,.05)),'#c6a575',p);cap.position.set((a+b)/2,y,.057);}
     const buttress=this.metal(this.shape([[a+.07,-.17],[b-.07,-.17],[b-.07,.17],[a+.07,.17]],.055),'#c5b99e',p,1);buttress.position.z=.067;
     if(j===1)this.gem(p,(a+b)/2,0,.090);
    }
   }
  }
  // Merge fixed inlays and studs per articulated plate. They share a transform and material.
  for(const p of r.parts){
   const buckets=new Map<string,T.Mesh[]>();
   for(const o of [...p.node.children]){if(!(o instanceof T.Mesh)||o===r.skin)continue;
    const m=o.material as T.MeshStandardMaterial;const key=[m.color.getHex(),m.roughness,m.metalness,m.emissive.getHex(),m.emissiveIntensity].join(':');
    const items=buckets.get(key)||[];items.push(o);buckets.set(key,items);
   }
   for(const items of buckets.values()){if(items.length<2)continue;const chunks=items.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);return g;});const merged=mergeGeometries(chunks);chunks.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new T.Mesh(this.geo(merged),items[0].material);mesh.customDepthMaterial=items[0].customDepthMaterial;mesh.castShadow=true;mesh.receiveShadow=true;items.forEach(m=>p.node.remove(m));p.node.add(mesh);
   }
  }
  return r;
 }
 setFace(canvas:HTMLCanvasElement){this.texture?.dispose();this.texture=new T.CanvasTexture(canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());for(const r of this.rigs){r.face.map=this.texture;r.face.needsUpdate=true;}}
 private update(v:number,t:number,reduced:boolean){
  const r=this.rigs[v];if(reduced)t=DURATION;const hit=designs[v].hit;r.body.position.z=lift(v,t);r.body.rotation.set(0,0,0);
  const pulse=ease(80,430,t)*(1-ease(hit,hit+470,t));
  for(const p of r.parts){const {node:n,index:i}=p;n.visible=t<DURATION;n.position.copy(p.home);n.rotation.set(0,0,0);n.scale.set(1,1,1);let cut=0;
   if(v===0){const load=ease(80,660,t),strike=ease(900,1240,t),sink=ease(1300,2320,t);n.position.z+=.12*load*(1-strike);n.rotation.x=.10*load*(1-strike);n.scale.z=1-.84*sink;cut=ease(1370,2410,t)*.95;}

   if(v===1){const compress=ease(260,630,t)*(1-ease(780,1080,t));const release=ease(730+i*78,1360+i*78,t),returning=ease(1500+i*55,2250+i*45,t);n.position.y=p.home.y*(1-compress*.16)+(i<3?1:-1)*.15*release*(1-returning);n.position.x=(i%2?1:-1)*.23*Math.sin(release*Math.PI);n.position.z+=Math.sin(release*Math.PI)*(.22+.02*i);n.rotation.x=(i<3?-1:1)*release*.46*(1-returning);cut=ease(1480+i*54,2260+i*42,t)*.93;n.scale.y=1-returning*.82;}
   if(v===2){const open=ease(1190,2220,t);cut=i===0?open*.92:ease(1570,2290,t)*.94;if(i===1){n.position.z+=.40*ease(80,650,t)*(1-ease(1250,2240,t));n.scale.setScalar(1-.8*ease(1500,2230,t));n.rotation.z=.3*Math.sin(ease(0,2100,t)*Math.PI);}if(i>1){n.position.z+=.10*ease(150,580,t)*(1-open);n.scale.x=1-.92*open;}}
   if(v===3){const s=i<3?-1:1,j=i%3,raise=ease(200+j*95,650+j*95,t),fold=ease(1310+j*90,2030+j*90,t);n.rotation.y=s*1.35*raise*(1-fold);n.position.x+=s*.045*raise*(1-fold);n.position.z+=.018*Math.sin(raise*Math.PI);cut=ease(1900+j*60,2590+j*40,t)*.97;n.scale.x=1-.88*fold;}
   for(const c of p.cuts){c.open.value=cut;c.pulse.value=pulse;}
   if(cut>.91)n.visible=false;
  }
  if(r.skin&&r.base){const a=r.skin.geometry.attributes.position;const shape=ease(80,650,t)*(1-ease(1250,2240,t));for(let i=0;i<a.count;i++){const x=r.base[i*3],y=r.base[i*3+1],edge=Math.max(0,1-(x/.505)**4)*Math.max(0,1-(y/.79)**4);const wave=Math.sin(y*9-t*.005)*.026*edge*shape;const dome=Math.max(0,1-(x/.53)**2)*.40*shape;const taper=1-.46*shape*Math.pow(Math.max(0,-y/.8),1.7);a.setXYZ(i,x*taper,y,dome*edge+wave);}a.needsUpdate=true;r.skin.geometry.computeVertexNormals();}
  const impact=ease(hit,hit+55,t)*(1-ease(hit+60,hit+320,t));r.light.opacity=impact*.23;
  r.pressure.children.forEach((node,i)=>{const m=node as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>,u=ease(hit,hit+430,t),s=i%2?1:-1;m.position.x=s*(.57+u*.26);m.scale.x=.3+u*.8;m.material.opacity=impact*.33;});
  if(t>=DURATION){r.body.position.z=0;r.parts.forEach(p=>p.node.visible=false);r.light.opacity=0;}
  return r;
 }
 draw(canvas:HTMLCanvasElement,v:number,t:number,reduced=false,dark=false){if(this.dead)return;const w=canvas.width,h=canvas.height;this.size(w,h);const r=this.update(v,t,reduced);r.table.visible=true;r.shadow.visible=false;(r.table.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.color.set(dark?'#202932':'#e4dfd4');
  const aspect=w/h;this.camera.left=-1.02*aspect;this.camera.right=1.02*aspect;this.camera.top=1.02;this.camera.bottom=-1.02;this.camera.position.set(.16,-3.35,4.5);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.13);this.camera.updateProjectionMatrix();this.renderer.render(r.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.renderer.domElement,0,0);
 }
 drawBoard(canvas:HTMLCanvasElement,v:number,t:number,matrix:DOMMatrix,reduced=false){if(this.dead)return;this.size(canvas.width,canvas.height);const ndc=new T.Matrix4().set(2/innerWidth,0,0,-1,0,-2/innerHeight,0,1,0,0,-.0001,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(ndc.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();const r=this.update(v,t,reduced);r.table.visible=false;r.shadow.visible=true;this.renderer.render(r.scene,this.boardCamera);canvas.getContext('2d')!.drawImage(this.renderer.domElement,0,0);}
 private size(w:number,h:number){if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);}
 get stats(){return{contexts:this.dead?0:1,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls};}
 dispose(){if(this.dead)return;this.dead=true;this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.texture?.dispose();this.rigs.forEach(r=>r.key.shadow.map?.dispose());this.renderer.dispose();this.renderer.forceContextLoss();}
}
