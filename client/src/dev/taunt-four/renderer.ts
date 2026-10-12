import * as T from 'three';
import {ease,pulse,pose,DURATION} from './catalog';
type C=CanvasRenderingContext2D;
const W=180,H=270;
const shape=(points:number[][])=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
const geom=(points:number[][],depth=5)=>new T.ExtrudeGeometry(shape(points),{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1.6,bevelThickness:1.2,curveSegments:8});
const rect=(w:number,h:number,d=4)=>geom([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d);
export class Renderer {
 readonly gpu=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 private environment:T.CubeTexture;private scene=new T.Scene();private camera=new T.OrthographicCamera();private root=new T.Group();private body=new T.Group();
 private variants=[new T.Group(),new T.Group(),new T.Group(),new T.Group()];
 private currentFace:HTMLCanvasElement|undefined;private surfaces=new Map<HTMLCanvasElement,T.CanvasTexture>();private edges=new Map<HTMLCanvasElement,T.CanvasTexture>();private backing!:T.Mesh;private face:T.Mesh;private relief:T.Mesh;private ground:T.Mesh;
 private steel=new T.MeshStandardMaterial({color:0x667988,metalness:.55,roughness:.29});
 private silver=new T.MeshStandardMaterial({color:0xcbd5d6,metalness:.62,roughness:.24});
 private gold=new T.MeshStandardMaterial({color:0xb69051,metalness:.55,roughness:.35});
 private dark=new T.MeshStandardMaterial({color:0x263a49,metalness:.45,roughness:.38});
 private stone=new T.MeshStandardMaterial({color:0x82745c,metalness:.08,roughness:.88});
 private edgeStone=new T.MeshStandardMaterial({color:0xb2a082,metalness:.1,roughness:.72});
 private gleam=new T.MeshBasicMaterial({color:0xf5e7b5,transparent:true,opacity:0,depthWrite:false});
 private left=new T.Group();private right=new T.Group();private boss=new T.Group();private braces:T.Group[]=[];private waves:T.Mesh[]=[];
 private cloth:T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>;private clothBorder:T.Line;private poles:T.Mesh[]=[];private blocks:T.Group[]=[];
 private shadowMat=new T.ShadowMaterial({opacity:.28});private disposed=false;
 constructor(){
  this.gpu.setPixelRatio(1);this.gpu.setSize(720,580);this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.05;
  const lights=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!,g=x.createLinearGradient(0,0,128,128);g.addColorStop(0,i===2?'#fff4d7':'#78848d');g.addColorStop(.33,'#e1ded2');g.addColorStop(.46,'#343e47');g.addColorStop(.66,'#6f7f8a');g.addColorStop(.78,'#eaf2f4');g.addColorStop(1,'#504b43');x.fillStyle=g;x.fillRect(0,0,128,128);x.fillStyle='#ffffed';x.fillRect(30+i*3,12,12,104);return c;});this.environment=new T.CubeTexture(lights);this.environment.colorSpace=T.SRGBColorSpace;this.environment.needsUpdate=true;this.scene.environment=this.environment;
  this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.add(new T.HemisphereLight(0xe8f1ff,0x777066,1.2));
  const sun=new T.DirectionalLight(0xffefd2,2.1);sun.position.set(-210,260,550);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-230;sun.shadow.camera.right=230;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-220;sun.shadow.camera.near=1;sun.shadow.camera.far=1300;sun.shadow.bias=-.0005;sun.shadow.normalBias=.5;sun.shadow.radius=3;this.scene.add(sun);
  const rim=new T.DirectionalLight(0xc8defa,1.2);rim.position.set(210,-90,220);this.scene.add(rim);
  this.scene.add(this.root);this.root.add(this.body);this.body.add(...this.variants);
  this.ground=new T.Mesh(new T.PlaneGeometry(680,680),this.shadowMat);this.ground.position.z=-3;this.ground.receiveShadow=true;this.scene.add(this.ground);
  const backing=this.backing=new T.Mesh(rect(155,241,1),new T.MeshStandardMaterial({color:0x534b3e,roughness:.8}));backing.position.z=-2;backing.castShadow=true;this.body.add(backing);
  this.face=new T.Mesh(new T.PlaneGeometry(W*1.24,H+W*.24),new T.MeshBasicMaterial({transparent:true,alphaTest:.02}));this.face.position.z=3;this.face.castShadow=true;this.face.receiveShadow=true;this.body.add(this.face);
  this.relief=new T.Mesh(new T.PlaneGeometry(W*1.24,H+W*.24),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,color:0xffe8b6,blending:T.AdditiveBlending}));this.relief.position.z=3.2;this.body.add(this.relief);
  const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=128;const sc=stoneCanvas.getContext('2d')!;
  sc.fillStyle='#a69f8e';sc.fillRect(0,0,128,128);for(let i=0;i<1500;i++){const x=(Math.sin(i*31.1)*9131)%128,y=(Math.cos(i*11.7)*2317)%128;sc.fillStyle=i%3?'#b5ae9c55':'#655f5355';sc.fillRect(Math.abs(x),Math.abs(y),1+i%3,1);}
  sc.strokeStyle='#6a635246';sc.lineWidth=.9;for(let k=0;k<4;k++){sc.beginPath();sc.moveTo(13+k*29,0);sc.lineTo(8+k*31,33);sc.lineTo(18+k*27,42);sc.lineTo(17+k*28,63);sc.stroke();}
  const stoneMap=new T.CanvasTexture(stoneCanvas);stoneMap.colorSpace=T.SRGBColorSpace;stoneMap.wrapS=stoneMap.wrapT=T.RepeatWrapping;stoneMap.repeat.set(.027,.027);this.stone.map=stoneMap;this.stone.bumpMap=stoneMap;this.stone.bumpScale=.65;
  this.makeShield();this.makeStance();
  const fabric=document.createElement('canvas');fabric.width=256;fabric.height=384;const ctx=fabric.getContext('2d')!;
  ctx.fillStyle='#741d29';ctx.fillRect(0,0,256,384);for(let i=0;i<384;i+=3){ctx.fillStyle=i%2?'#952c39':'#7e2430';ctx.fillRect(0,i,256,1);}ctx.strokeStyle='#d5ae67';ctx.lineWidth=12;ctx.strokeRect(12,12,232,360);
  ctx.beginPath();ctx.moveTo(128,86);ctx.lineTo(180,110);ctx.lineTo(173,190);ctx.lineTo(128,233);ctx.lineTo(83,190);ctx.lineTo(76,110);ctx.closePath();ctx.fillStyle='#deb777';ctx.fill();ctx.strokeStyle='#412329';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#7c2532';ctx.beginPath();ctx.moveTo(128,204);ctx.lineTo(96,159);ctx.lineTo(110,149);ctx.lineTo(128,174);ctx.lineTo(146,149);ctx.lineTo(160,159);ctx.closePath();ctx.fill();
  const fabricMap=new T.CanvasTexture(fabric);fabricMap.colorSpace=T.SRGBColorSpace;
  this.cloth=new T.Mesh(new T.PlaneGeometry(156,168,32,28),new T.MeshStandardMaterial({map:fabricMap,side:T.DoubleSide,roughness:.86,metalness:.02}));this.cloth.castShadow=true;this.cloth.receiveShadow=true;this.variants[2].add(this.cloth);
  const border=new T.BufferGeometry();border.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(33*3),3));this.clothBorder=new T.Line(border,new T.LineBasicMaterial({color:0xe4c17c}));this.variants[2].add(this.clothBorder);
  for(const x of [-79,79]){const p=new T.Mesh(new T.CylinderGeometry(2.1,2.8,1,10),this.gold);p.rotation.x=Math.PI/2;p.position.set(x,111,4);this.variants[2].add(p);this.poles.push(p);}
  this.makeWall();
 }
 private mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 private makeShield(){
  const group=this.variants[0];group.add(this.left,this.right,this.boss);
  for(const [side,rig]of [[-1,this.left],[1,this.right]] as const){
   const curve=(x:number,y:number)=>13*(1-Math.min(1,Math.abs(x)/68)**1.4)*(1-.38*(y/85)**2);
   const bent=(points:number[][],depth:number)=>{const g=geom(points,depth),a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+curve(a.getX(i),a.getY(i)));a.needsUpdate=true;g.computeVertexNormals();return g;};
   const points=[[0,78],[side*64,58],[side*58,-17],[0,-74]];this.mesh(bent(points,7),this.steel,rig);
   this.mesh(bent(points.map(([x,y])=>[x*.91,y*.90]),1.6),this.dark,rig,0,0,8);
   this.mesh(bent([[0,69],[side*9,65],[side*9,-51],[0,-62]],2),this.silver,rig,0,0,10);
   const line=new T.CatmullRomCurve3([new T.Vector3(side*10,53,11+curve(side*10,53)),new T.Vector3(side*47,42,11+curve(side*47,42)),new T.Vector3(side*40,-9,11+curve(side*40,-9)),new T.Vector3(side*9,-46,11+curve(side*9,-46))]);this.mesh(new T.TubeGeometry(line,20,1,5,false),this.gold,rig);
   for(const [x,y]of [[side*53,46],[side*47,-14]])this.mesh(new T.SphereGeometry(2.4,8,6),this.silver,rig,x,y,11+curve(x,y));
   const hinge=this.mesh(new T.CylinderGeometry(3,3,52,10),this.gold,rig,side*59,20,3);hinge.rotation.z=.05*side;
  }
  this.mesh(new T.SphereGeometry(10,16,10),this.silver,this.boss,0,0,0).scale.set(1,1,.38);
  this.mesh(geom([[0,16],[5,0],[0,-18],[-5,0]],2),this.gold,this.boss,0,0,3);
 }
 private makeStance(){
  for(const sx of [-1,1])for(const sy of [-1,1]){const group=new T.Group();group.position.set(sx*77,sy*119,4);this.variants[1].add(group);this.braces.push(group);
   this.mesh(geom([[0,0],[-sx*28,0],[-sx*28,-sy*7],[-sx*8,-sy*8],[-sx*7,-sy*36],[0,-sy*36]],3),this.gold,group);
   this.mesh(geom([[0,0],[-sx*21,0],[-sx*5,-sy*5],[0,-sy*28]],1),this.silver,group,0,0,4);
  }
  for(let i=0;i<2;i++){const wave=this.mesh(geom([[-70,0],[-46,10],[0,17],[46,10],[70,0],[48,4],[0,9],[-48,4]],.8),this.gleam,this.variants[1]);this.waves.push(wave);}
 }
 private makeWall(){
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const b=new T.Group();b.position.set(side*80,100-i*47,4);this.variants[3].add(b);this.blocks.push(b);
   this.mesh(rect(i===0||i===4?19:14,40,i===0||i===4?38:18),this.stone,b);
   this.mesh(rect(i===0||i===4?23:17,42,4),this.edgeStone,b,0,0,i===0||i===4?39:19);
   this.mesh(rect(2.2,28,1),this.gold,b,-side*7.5,0,i===0||i===4?40:20);
   this.mesh(rect(9,11,5),this.stone,b,0,14,i===0||i===4?43:23);
   this.mesh(rect(9,11,5),this.stone,b,0,-14,i===0||i===4?43:23);
  }
  for(let i=0;i<5;i++){
   const b=new T.Group();b.position.set(-64+i*32,117,4);this.variants[3].add(b);this.blocks.push(b);
   this.mesh(rect(29,15,41),this.stone,b);this.mesh(rect(31,19,3),this.edgeStone,b,0,0,41);
   if(i%2===0)this.mesh(rect(15,17,12),this.stone,b,0,0,43);
   this.mesh(rect(1.8,10,2),this.gold,b,0,-8,30);
  }
 }
 private setFace(canvas:HTMLCanvasElement){
  if(this.currentFace===canvas)return;this.currentFace=canvas;
  let texture=this.surfaces.get(canvas);if(!texture){texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());this.surfaces.set(canvas,texture);}
  (this.face.material as T.MeshBasicMaterial).map=texture;(this.face.material as T.MeshBasicMaterial).needsUpdate=true;
  let edge=this.edges.get(canvas);if(!edge){const image=document.createElement('canvas');image.width=270;image.height=405;const c=image.getContext('2d')!;c.drawImage(canvas,0,0,270,405);const pixels=c.getImageData(0,0,270,405),src=new Uint8ClampedArray(pixels.data);for(let y=1;y<404;y++)for(let x=1;x<269;x++){const i=(y*270+x)*4;let contrast=0;for(let k=0;k<3;k++)contrast+=Math.abs(src[i-4+k]-src[i+4+k])+Math.abs(src[i-1080+k]-src[i+1080+k]);pixels.data[i]=255;pixels.data[i+1]=235;pixels.data[i+2]=187;pixels.data[i+3]=Math.min(src[i+3],contrast*.55);}c.putImageData(pixels,0,0);edge=new T.CanvasTexture(image);edge.colorSpace=T.SRGBColorSpace;this.edges.set(canvas,edge);}
  (this.relief.material as T.MeshBasicMaterial).map=edge;(this.relief.material as T.MeshBasicMaterial).needsUpdate=true;
 }
 private update(v:number,ms:number,reduced:boolean){
  const m=pose(v,ms,reduced),t=m.t;this.body.position.set(0,m.advance,m.lift);this.body.scale.setScalar(m.scale);this.body.rotation.set(m.tilt,0,0);
  this.variants.forEach((g,i)=>g.visible=i===v&&ms>0&&ms<DURATION&&!reduced);
  (this.relief.material as T.MeshBasicMaterial).opacity=reduced?.18*m.strength:.1*pulse(0,180,540,930,t);
  const open=pulse(80,390,670,960,t),hold=pulse(20,180,800,1000,t);
  if(v===0){
   for(const [sign,rig]of [[-1,this.left],[1,this.right]] as const){rig.position.set(sign*78*(1-open),26+86*(1-open),4+open*40);rig.rotation.set(.05*open,sign*(1-open)*1.48,sign*.06*(1-open));rig.scale.setScalar(.08+.92*hold);}
   this.boss.position.set(0,26,71);this.boss.scale.setScalar(pulse(280,420,650,870,t));
  }
  if(v===1){
   const charge=pulse(0,160,730,985,t);this.braces.forEach((b,i)=>{b.scale.setScalar(.35+.65*charge);b.position.z=4+5*pulse(180,310,390,590,t);b.rotation.y=(i<2?-1:1)*.13*pulse(10,180,300,510,t);});
   this.waves.forEach((w,i)=>{const p=ease(415+i*32,755+i*32,t),strength=pulse(416+i*32,446+i*32,610+i*32,780+i*32,t);w.visible=strength>0;w.position.set(0,127+p*39,2);w.scale.set(1+p*.22,strength,1);});this.gleam.opacity=pulse(415,450,580,820,t)*.8;
  }
  if(v===2){
   const a=pulse(30,345,660,1000,t),raise=83*a;
   const attr=this.cloth.geometry.attributes.position as T.BufferAttribute;
   // A single continuous sheet peels from the top frame, never a detached icon.
   for(let j=0;j<=28;j++)for(let i=0;i<=32;i++){
    const u=i/32,q=j/28,idx=j*33+i,x=(u-.5)*156;
    const wave=Math.sin(u*6.5-ease(180,620,t)*Math.PI*1.2+q*3)*Math.sin(Math.PI*q)*18*a;
    const length=168*a,unroll=ease(20,360,t)*(1-ease(695,985,t));
    attr.setXYZ(idx,x,115-q*length*(1-.20*Math.pow(Math.abs(u-.5)*2,3)),4+raise*Math.sin(q*Math.PI*.64)+wave*unroll);
   }attr.needsUpdate=true;this.cloth.geometry.computeVertexNormals();
   const edge=this.clothBorder.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<=32;i++){const idx=28*33+i;edge.setXYZ(i,attr.getX(idx),attr.getY(idx),attr.getZ(idx)+.3);}edge.needsUpdate=true;
   this.cloth.visible=a>.004;this.clothBorder.visible=a>.004;this.poles.forEach(p=>{p.scale.y=4+raise*.16;p.position.z=4+raise*.08;});
  }
  if(v===3){
   this.blocks.forEach((b,i)=>{const delay=i<10?(i%5)*18:70+(i-10)*12;const h=pulse(40+delay,335+delay,640+delay,950+delay*.4,t);b.scale.set(1,1,Math.max(.001,h));b.position.z=3;});
  }
 }
 render(ctx:C,face:HTMLCanvasElement,v:number,ms:number,width:number,height:number,reduced=false,dark=false){
  if(this.disposed)return;this.backing.visible=this.face.visible=true;this.setFace(face);this.update(v,ms,reduced);this.root.rotation.z=0;this.ground.visible=true;this.shadowMat.opacity=dark?.43:.28;
  this.gpu.setSize(width,height,false);const range=193;this.camera.left=-range*width/height;this.camera.right=range*width/height;this.camera.top=range;this.camera.bottom=-range;this.camera.near=1;this.camera.far=1800;
  this.camera.position.set(0,-300,850);this.camera.up.set(0,1,0);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.gpu.render(this.scene,this.camera);ctx.clearRect(0,0,width,height);ctx.drawImage(this.gpu.domElement,0,0,width,height);
 }
 /** Full board projection: same world-to-screen matrix as the native card. */
 renderBoard(ctx:C,face:HTMLCanvasElement,v:number,ms:number,width:number,height:number,matrix:DOMMatrix,reduced=false,drawSource=false){
  if(this.disposed)return;this.backing.visible=this.face.visible=drawSource;this.setFace(face);this.update(v,ms,reduced);this.root.rotation.z=0;this.ground.visible=true;this.gpu.setSize(width,height,false);
  const fromWorld=new T.Matrix4().set(1,0,0,90,0,-1,0,135,0,0,1,0,0,0,0,1);
  const dom=new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()));
  // CSS pixel coordinates to WebGL clip coordinates, with depth retained for occlusion.
  const clip=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(clip.multiply(dom).multiply(fromWorld));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.gpu.render(this.scene,this.camera);ctx.drawImage(this.gpu.domElement,0,0,width,height);
 }
 get stats(){return{textures:this.gpu.info.memory.textures,geometries:this.gpu.info.memory.geometries,calls:this.gpu.info.render.calls,triangles:this.gpu.info.render.triangles};}
 dispose(){if(this.disposed)return;this.disposed=true;const geoms=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geoms.add(o.geometry);const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>{mats.add(m);if((m as T.MeshStandardMaterial).map)textures.add((m as T.MeshStandardMaterial).map!);});}});this.surfaces.forEach(t=>textures.add(t));this.edges.forEach(t=>textures.add(t));geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.environment.dispose();this.gpu.dispose();this.gpu.forceContextLoss();this.surfaces.clear();this.edges.clear();}
}
