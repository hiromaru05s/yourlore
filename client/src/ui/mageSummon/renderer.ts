import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {reliefTexture,Ribbon,shardGeometry,mineralTextures} from './materials';
import {Volume} from './volume';
import {mageVisualTime} from './timing';
export type View='oblique'|'top'|'side';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const span=(t:number,a:number,b:number,c:number,d:number)=>ease(a,b,t)*(1-ease(c,d,t));
export const CONTACT=2260;
export function pose(ms:number,reduced=false){const release=1580,u=clamp((ms-release)/(CONTACT-release));return{height:reduced?0:46*ease(0,380,ms)*(1-u*u),contact:CONTACT,phase:ms<380?'予兆':ms<1580?'形成・展開':ms<CONTACT?'解放・降下':ms<3450?'接地・収束':'完了'};}
type Sheet=Ribbon;
export class Renderer{
 private gl:T.WebGLRenderer;private scene=new T.Scene();private cam=new T.OrthographicCamera(-260,260,260,-260,.1,2000);private boardCam=new T.Camera();
 private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private env:T.WebGLRenderTarget;private disposed=false;
 private cardMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.01,toneMapped:false,side:T.DoubleSide});private card=new T.Mesh(new T.PlaneGeometry(223.2,313.2),this.cardMat);
 private body=new T.Mesh(new T.PlaneGeometry(223.2,313.2),new T.MeshBasicMaterial({color:0x50473c,transparent:true,alphaTest:.02,side:T.DoubleSide}));
 private surfaceShadow=new T.Mesh(new T.PlaneGeometry(168,250),new T.ShadowMaterial({opacity:.33,depthWrite:false}));
 private table=new T.Group();private ghost=new T.Mesh(new T.PlaneGeometry(370,470),new T.ShadowMaterial({opacity:.29,transparent:true,depthWrite:false}));
 private shadow=new T.Mesh(new T.PlaneGeometry(225,315),new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
 private key=new T.DirectionalLight(0xffecd9,2.65);private fill=new T.DirectionalLight(0xb0bed3,1.2);private sourceLight=new T.PointLight(0xff751c,0,400,1.5);
 private minerals=mineralTextures();private stoneMap=this.minerals[0];private metalMap=reliefTexture('metal');private paperMap=reliefTexture('vellum');
 private stone=new T.MeshPhysicalMaterial({color:0x25212c,roughness:.25,metalness:.35,clearcoat:1,clearcoatRoughness:.18,envMapIntensity:1.1,bumpScale:.42,side:T.DoubleSide});
 private metal=new T.MeshPhysicalMaterial({color:0x514856,roughness:.21,metalness:.88,clearcoat:.7,clearcoatRoughness:.19,envMapIntensity:1.25,bumpScale:.07,side:T.DoubleSide});
 private paper=new T.MeshPhysicalMaterial({color:0xb9afaa,roughness:.76,metalness:0,sheen:.2,sheenRoughness:.65,sheenColor:new T.Color(0x887384),bumpScale:.12,side:T.DoubleSide});
 private liquid=new T.MeshPhysicalMaterial({color:0x170e23,roughness:.12,metalness:.6,clearcoat:1,clearcoatRoughness:.11,envMapIntensity:1.4});
 private shell:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>[]=[];private slabs:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>[]=[];private ribbons:Sheet[]=[];private tubes:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>[]=[];
 private pages:Sheet[]=[];private pageMats:T.MeshPhysicalMaterial[]=[];private volume=new Volume();private ray=new T.Vector3();private point=new T.Vector3();
 constructor(onlySelected=false){
 this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:true,powerPreference:'high-performance'});this.gl.setSize(680,680,false);this.gl.setPixelRatio(1);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=.98;this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFSoftShadowMap;
 const pmrem=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.045);this.scene.environment=this.env.texture;room.dispose();pmrem.dispose();
 this.scene.add(new T.HemisphereLight(0xf4eeea,0x262535,1.05));this.key.position.set(-180,230,380);this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);Object.assign(this.key.shadow.camera,{left:-260,right:260,top:340,bottom:-290,near:1,far:1000});this.key.shadow.bias=-.0005;this.key.shadow.normalBias=.2;this.fill.position.set(200,-40,160);this.scene.add(this.key,this.fill,this.sourceLight);
 this.stone.map=this.stoneMap;this.stone.bumpMap=this.stoneMap;this.stone.emissiveMap=this.minerals[1];this.metal.bumpMap=this.metalMap;this.paper.map=this.paperMap;this.paper.bumpMap=this.paperMap;
 const ground=new T.Mesh(new T.BoxGeometry(355,440,5),new T.MeshStandardMaterial({color:0xbab5aa,roughness:.91}));ground.position.z=-3;ground.receiveShadow=true;this.table.add(ground);
 const edge=new T.LineSegments(new T.EdgesGeometry(ground.geometry),new T.LineBasicMaterial({color:0x9d9284,transparent:true,opacity:.25}));edge.position.z=-3;this.table.add(edge);
 const sc=document.createElement('canvas');sc.width=256;sc.height=356;const cx=sc.getContext('2d')!;cx.filter='blur(14px)';cx.fillStyle='#201b20';cx.fillRect(42,42,172,272);this.shadow.material.map=new T.CanvasTexture(sc);this.shadow.position.z=.1;
 this.ghost.position.z=.15;this.ghost.receiveShadow=true;this.surfaceShadow.receiveShadow=true;
 this.scene.add(this.table,this.ghost,this.shadow,this.card,this.body,this.surfaceShadow,this.volume.mesh);
 for(let j=0;j<9;j++){const mesh=new T.Mesh(shardGeometry(81+j*9),this.stone);mesh.castShadow=mesh.receiveShadow=true;this.shell.push(mesh);this.scene.add(mesh);}
 if(onlySelected)return;
 for(let j=0;j<6;j++){const s=new T.Shape();const points=j%2?[[-38,-47],[-14,-38],[3,-48],[32,-31],[41,-10],[31,4],[39,24],[21,40],[1,35],[-28,47],[-41,21],[-33,3]]:[[-36,-40],[-10,-36],[8,-47],[38,-35],[34,-16],[45,3],[26,35],[3,43],[-12,32],[-38,42],[-44,14],[-32,-7]];points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:4,bevelEnabled:true,bevelThickness:1,bevelSize:1.6,bevelSegments:2,steps:1});const uv=geo.getAttribute('uv'),pos=geo.getAttribute('position');for(let k=0;k<uv.count;k++)uv.setXY(k,pos.getX(k)/100+.5,pos.getY(k)/100+.5);uv.needsUpdate=true;const mesh=new T.Mesh(geo,this.stone);mesh.castShadow=mesh.receiveShadow=true;this.slabs.push(mesh);this.scene.add(mesh);}
 for(let j=0;j<5;j++){const r=new Ribbon(this.paper);this.ribbons.push(r);this.scene.add(r.mesh);}
 for(let j=0;j<5;j++){const geo=new T.PlaneGeometry(1,1,12,64),mesh=new T.Mesh(geo,this.liquid);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;this.tubes.push(mesh);this.scene.add(mesh);}
 for(let j=0;j<2;j++){const mat=new T.MeshPhysicalMaterial({color:0x909090,roughness:.55,metalness:.015,clearcoat:.12,side:T.DoubleSide,transparent:true,alphaTest:.025});const r=new Ribbon(mat);this.pages.push(r);this.pageMats.push(mat);this.scene.add(r.mesh);}
 }
 private tube(index:number,fn:(t:number)=>T.Vector3,radius:number,flat=1){const m=this.tubes[index];if(!m)return;m.visible=true;const p=m.geometry.getAttribute('position');const up=new T.Vector3(0,0,1),tangent=new T.Vector3(),across=new T.Vector3(),normal=new T.Vector3();
 for(let j=0;j<=64;j++){const t=j/64,a=fn(t),next=fn(Math.min(1,t+.005)),prev=fn(Math.max(0,t-.005));tangent.copy(next).sub(prev).normalize();across.crossVectors(tangent,up).normalize();if(across.lengthSq()<.01)across.set(1,0,0);normal.crossVectors(across,tangent).normalize();const r=radius*Math.pow(Math.sin(Math.PI*t),.56)+.09;
 for(let i=0;i<=12;i++){const angle=i/12*Math.PI*2;this.point.copy(a).addScaledVector(across,Math.cos(angle)*r).addScaledVector(normal,Math.sin(angle)*r*flat);p.setXYZ(j*13+i,this.point.x,this.point.y,this.point.z);}}
 p.needsUpdate=true;m.geometry.computeVertexNormals();}
 private prepare(face:HTMLCanvasElement,v:number,ms:number,reduced:boolean,kind:number){
 if(v===0)ms=mageVisualTime(ms);
 const fire=kind===0,heavy=kind===1,clock=ms*(kind===2?1.08:1),h=pose(ms,reduced).height,life=reduced?0:span(clock,80,610,2620,3500),settle=ease(CONTACT,2740,ms);
 let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.textures.set(face,tex);}if(this.cardMat.map!==tex){this.body.material.map=tex;this.body.material.needsUpdate=true;this.cardMat.map=tex;this.cardMat.needsUpdate=true;this.pageMats.forEach(m=>{m.map=tex!;m.needsUpdate=true;});}
 this.card.visible=true;this.cardMat.opacity=1;this.card.position.set(0,0,h+1.9);this.card.rotation.set(0,0,0);this.body.position.set(0,0,h+.15);this.body.visible=true;this.surfaceShadow.visible=true;this.surfaceShadow.position.z=h+2.1;
 this.cardMat.color.setRGB(1,1,1);this.shadow.material.opacity=.22-h*.002;this.shadow.scale.set(1+h*.003,1+h*.002,1);
 this.stone.color.set(fire?0x817368:0x65606b);this.stone.roughness=fire?.67:.27;this.stone.emissive.set(fire?0xf84108:0x3a154e);this.stone.emissiveIntensity=(fire?2.6:.07)*life;this.metal.color.set(fire?0xa98250:0x39303e);this.liquid.color.set(fire?0x4a1407:0x160d20);this.liquid.emissive.set(fire?0xff4b05:0x351145);this.liquid.emissiveIntensity=fire?life*1.9:life*.09;
 this.paper.color.set(fire?0x655345:0xd3c4b2);this.paper.emissive.set(fire?0xb3310b:0x291d36);this.paper.emissiveIntensity=life*(fire?.16:.025);
 this.sourceLight.color.set(fire?0xff6b14:0x967ab9);this.sourceLight.intensity=life*(fire?36:6);this.sourceLight.position.set(-23,40,h+55);
 for(const a of [this.shell,this.slabs,this.tubes])a.forEach(m=>m.visible=false);this.ribbons.forEach(r=>r.mesh.visible=false);this.pages.forEach(r=>r.mesh.visible=false);
 let volumeStrength=0,volumeMode=0;
 if(life>.001){
 if(v===0){
  // The flame/smoke starts in the card frame; a few heated fragments have inertial motion.
  volumeStrength=life*(fire?1:.85);volumeMode=0;
  for(let j=0;j<7;j++){const m=this.shell[j],a=j*2.399+clock*.0005,r=95+Math.sin(j*3)*9,local=span(clock,280+j*44,880+j*42,1720+j*70,2720+j*50);m.visible=local>.01;m.scale.set(3.2,5.1,2.8).multiplyScalar(local);m.position.set(Math.cos(a)*r,Math.sin(a)*r*1.33,h+25+j*10+Math.sin(clock*.002+j)*7);m.rotation.set(clock*.001+j,j*.7,clock*.0007);}
 }else if(v===1){
  // Unequal lacquer/scoria plates start on the printed face and hinge from the perimeter.
  for(let j=0;j<6;j++){const m=this.slabs[j],s=j%2?1:-1,row=Math.floor(j/2),p=span(clock,120+j*32,650+j*25,2670+j*40,3430+j*25),peel=ease(860+j*94,1800+j*25,clock),fall=ease(1680,CONTACT+160+j*20,clock);m.visible=p>.01;m.scale.set(.95,1.07,.8).multiplyScalar(p);m.position.set(s*(40+peel*58)+Math.sin(j*3)*8, (row-1)*80+Math.sin(j*5)*12,h*(1-fall)+5+peel*(1-fall)*48);m.rotation.set(s*peel*(1-fall)*.55, s*peel*(1-fall)*1.02,Math.sin(j*9)*.06+peel*s*.1);}
  volumeStrength=life*(fire?.60:.28);volumeMode=0;
 }else if(v===2){
  // Three irregular vellum tongues unwind, expose their reverse and settle onto the table.
  for(let j=0;j<3;j++){const r=this.ribbons[j],s=j===1?1:-1,peel=ease(700+j*160,1740+j*70,clock),retreat=ease(2280+j*70,3380,clock),len=(j===1?250:211)*life;r.mesh.visible=true;r.update((u,t)=>{const theta=peel*(2.15+Math.sin(j)*.25)*t,along=Math.abs(theta)>.001?Math.sin(theta)/(peel*(2.15+Math.sin(j)*.25))*len:t*len;const curl=(1-Math.cos(theta))*len/(.1+peel*2.4);const w=(j===1?32:26)*(.78+.22*Math.sin(t*8+j))*Math.pow(Math.sin(Math.PI*t),.35)*life;return[s*(81-along*(1-retreat*.75)+retreat*32),(j-1)*78+u*w+Math.sin(t*4+j)*14,h*(1-retreat)+5+curl*(1-retreat)+Math.sin(t*14-clock*.005+j)*4*t*life+u*u*2];});}
  volumeStrength=life*(fire?.32:.18);volumeMode=0;
 }else if(v===3){
  // Viscous channels have round cross-sections, narrow highlights, and delayed recoil at tips.
  for(let j=0;j<4;j++){const s=j%2?1:-1,y=(j<2?-1:1)*104,peel=ease(680+j*110,1630+j*80,clock),recoil=ease(1820+j*70,3100,clock);this.tubes[j].material=this.liquid;this.tube(j,t=>new T.Vector3(s*(81-Math.sin(t*Math.PI)*68*(1-peel)+peel*Math.sin(t*3.1)*32)*(1-recoil*.08),y+(j<2?1:-1)*t*159+Math.sin(t*9+j)*12*life,h*(1-settle)+7+Math.sin(t*Math.PI)*(18+peel*68)*(1-recoil)+Math.sin(clock*.004-t*7+j)*5*t*life),(heavy?6:4.3)*life,.72);}
  volumeStrength=life*(fire?.25:.2);volumeMode=0;
 }else if(v===4){
  // A moon of polished black metal (matching the staff) opens around the card. Fire uses
  // heated fractured stone in the same pressure-release choreography, not a recoloured moon.
  if(fire){for(let j=0;j<7;j++){const m=this.shell[j],a=j*2.399+.25,release=ease(810+j*44,1930,clock),r=59+release*47;m.visible=true;m.scale.set(17+Math.sin(j)*4,24+Math.cos(j)*5,8).multiplyScalar(life);m.position.set(Math.cos(a)*r,Math.sin(a)*r*1.28,h*(1-settle)+13+Math.sin(release*Math.PI)*32);m.rotation.set(j*.7+release*.6,j*.4, a+release*.25);}volumeStrength=life*.78;volumeMode=1;}
  else{for(let j=0;j<2;j++){const side=j?1:-1,release=ease(840+j*150,1800,clock);this.tubes[j].material=this.metal;this.tube(j,t=>{const a=(.13+t*.80)*Math.PI;return new T.Vector3(side*(Math.sin(a)*(85+release*25)-12),Math.cos(a)*136,h*(1-settle)+7+Math.sin(a)*Math.sin(release*Math.PI)*56);},(heavy?13:9)*life,.28);}volumeStrength=life*.27;volumeMode=0;}
 }else{
  // The actual face becomes two curved leaves. Its UV coordinates, gilded border and illustration
  // travel with the material and return to the same native surface without a texture swap.
  const bend=span(clock,400,1370,1760,2760);const pageAlpha=Math.min(1,bend/.14);this.card.visible=pageAlpha<1;this.cardMat.opacity=1-pageAlpha;this.pageMats.forEach(m=>m.opacity=pageAlpha);this.body.visible=bend<.002;this.surfaceShadow.visible=bend<.002;
  for(let j=0;j<2;j++){const r=this.pages[j],s=j?1:-1;r.mesh.visible=bend>=.002;const uv=r.geometry.getAttribute('uv');for(let row=0;row<=64;row++)for(let col=0;col<=12;col++){const t=row/64,u=col/12;uv.setXY(row*13+col,j?(.5+.5*u):(.5-.5*u),1-t);}uv.needsUpdate=true;
   r.update((u,t)=>{const a=(u+1)*.5,k=bend*(1.05+(j?.11:0)),arc=a*k;return[s*(Math.sin(arc)/(k||1)*111.6||a*111.6),(.5-t)*313.2,h+2+(1-Math.cos(arc))/(k||1)*111.6+Math.sin(t*7+j)*a*a*bend*7];});}
  volumeStrength=span(clock,700,1400,2160,2940)*(fire?.75:.60);volumeMode=1;
 }
 }
 this.volume.update(ms,volumeStrength,fire,volumeMode,h,this.ray);
 }
 draw(c:CanvasRenderingContext2D,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,reduced=false,kind=0,_shadow=true,view:View='oblique'){
 if(this.disposed)return;const cam=this.cam;cam.up.set(0,0,1);if(view==='top'){cam.up.set(0,1,0);cam.position.set(0,0,1000);}else if(view==='side')cam.position.set(330,-850,325);else cam.position.set(190,-920,890);cam.lookAt(0,0,38);cam.updateMatrixWorld();cam.getWorldDirection(this.ray);
 this.prepare(face,v,ms,reduced,kind);this.table.visible=true;this.ghost.visible=false;const size=w*520/180,resolution=Math.min(900,Math.max(256,Math.ceil(size)));if(this.gl.domElement.width!==resolution)this.gl.setSize(resolution,resolution,false);this.gl.render(this.scene,cam);c.drawImage(this.gl.domElement,x-size/2,y-size/2,size,size);
 }
 drawBoard(c:CanvasRenderingContext2D,face:HTMLCanvasElement,v:number,ms:number,matrix:DOMMatrix,width:number,height:number,reduced=false,kind=0){
 if(this.disposed)return;this.ray.set(0,.309,-.951);this.prepare(face,v,ms,reduced,kind);this.table.visible=false;this.ghost.visible=true;this.gl.setSize(width,height,false);
 const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);this.boardCam.position.set(0,-325,1000);this.boardCam.up.set(0,0,1);this.boardCam.lookAt(0,0,0);this.boardCam.updateMatrixWorld();this.boardCam.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))).multiply(this.boardCam.matrixWorld));this.boardCam.projectionMatrixInverse.copy(this.boardCam.projectionMatrix).invert();this.boardCam.updateMatrixWorld();this.gl.render(this.scene,this.boardCam);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 releaseFace(face:HTMLCanvasElement){this.textures.get(face)?.dispose();this.textures.delete(face);}
 get status(){return{renderer:'three-physical-volumetric-r2',disposed:this.disposed,textures:this.textures.size,contact:CONTACT};}
 dispose(){if(this.disposed)return;this.disposed=true;this.volume.dispose();this.scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material){for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}});this.key.shadow.dispose();for(const m of [this.cardMat,this.body.material,this.surfaceShadow.material,this.ghost.material,this.shadow.material,this.stone,this.metal,this.paper,this.liquid,...this.pageMats])m.dispose();this.shadow.material.map?.dispose();this.textures.forEach(t=>t.dispose());for(const t of [this.stoneMap,this.minerals[1],this.metalMap,this.paperMap])t.dispose();this.env.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}
