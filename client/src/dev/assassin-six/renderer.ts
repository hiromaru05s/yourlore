import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {ease,rank,DURATION} from './catalog';

type C = CanvasRenderingContext2D;
export type View = 'oblique'|'top'|'side';
const TAU = Math.PI * 2;
const lerp = T.MathUtils.lerp;
const v3 = (x:number,y:number,z:number)=>new T.Vector3(x,y,z);

/** All ornament grows from the face/perimeter. Units are card pixels, Z is board normal. */
class AssassinRenderer {
 private gl:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-230,230,260,-260,.1,2200);
 private boardCamera=new T.Camera();
 private cardGroup=new T.Group();
 private pieces=new T.Group();
 private maps=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private materials:T.Material[]=[];
 private textures:T.Texture[]=[];
 private sheets:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>[]=[];
 private cords:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>[]=[];
 private fog:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>[]=[];
 private cardMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.01,toneMapped:false,side:T.DoubleSide});
 private card=new T.Mesh(new T.PlaneGeometry(223.2,313.2),this.cardMat);
 private faceShadow=new T.Mesh(new T.PlaneGeometry(174,264),new T.ShadowMaterial({opacity:.42,depthWrite:false}));
 private groundShadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});
 private groundShadow=new T.Mesh(new T.PlaneGeometry(262,352),this.groundShadowMat);
 private cloth:T.MeshPhysicalMaterial;
 private lining:T.MeshPhysicalMaterial;
 private steel:T.MeshPhysicalMaterial;
 private lacquer:T.MeshPhysicalMaterial;
 private feather:T.MeshPhysicalMaterial;
 private rope:T.MeshPhysicalMaterial;
 private env:T.WebGLRenderTarget;
 private disposed=false;
 constructor(){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.gl.setPixelRatio(1);this.gl.setSize(460,520,false);this.gl.setClearColor(0,0);
  this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.04;
  this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFShadowMap;
  const pmrem=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.03);this.scene.environment=this.env.texture;room.dispose();pmrem.dispose();
  this.scene.add(new T.AmbientLight(0xcad1dc,.65));
  const key=new T.DirectionalLight(0xffedd4,3.1);key.position.set(-170,190,330);key.castShadow=true;key.shadow.mapSize.set(768,768);Object.assign(key.shadow.camera,{left:-240,right:240,top:300,bottom:-300,near:1,far:900});key.shadow.bias=-.0004;key.shadow.normalBias=.14;key.shadow.radius=2;this.scene.add(key);
  const rim=new T.DirectionalLight(0xa4bbdf,2);rim.position.set(200,-70,140);this.scene.add(rim);
  this.cloth=this.material({color:0x070910,roughness:.87,metalness:0,sheen:.38,sheenColor:new T.Color(0x3f4d62),sheenRoughness:.75,bumpMap:this.texture('weave'),bumpScale:.7});
  this.lining=this.material({color:0x30080e,roughness:.82,sheen:.3,sheenColor:new T.Color(0xad5558),bumpMap:this.texture('weave'),bumpScale:.23});
  this.steel=this.material({color:0x303744,roughness:.39,metalness:.93,bumpMap:this.texture('steel'),bumpScale:.09,envMapIntensity:.72});
  this.lacquer=this.material({color:0x10131b,roughness:.27,metalness:.15,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.45,bumpMap:this.texture('lacquer'),bumpScale:.16});
  this.feather=this.material({color:0x070c16,roughness:.64,metalness:.08,sheen:.35,sheenColor:new T.Color(0x3b506a),bumpMap:this.texture('feather'),bumpScale:.4});
  this.rope=this.material({color:0x6b2028,roughness:.74,sheen:.8,sheenColor:new T.Color(0xc78375),bumpMap:this.texture('weave'),bumpScale:.48});
  for(let i=0;i<32;i++){const mesh=new T.Mesh(new T.PlaneGeometry(1,1,12,36),this.cloth);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.pieces.add(mesh);this.sheets.push(mesh);}
  for(let i=0;i<12;i++){const mesh=new T.Mesh(new T.PlaneGeometry(1,1,8,72),this.rope);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.pieces.add(mesh);this.cords.push(mesh);}
  for(let i=0;i<7;i++){
   const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},life:{value:0},layer:{value:i}},vertexShader:`varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec2 uv0;uniform float time,life,layer;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
   float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03)+.15*noise(p*4.01);}
   void main(){vec2 p=uv0;float edge=smoothstep(0.,.15,p.x)*smoothstep(1.,.83,p.x)*smoothstep(0.,.14,p.y)*smoothstep(1.,.86,p.y);float n=fbm(p*vec2(3.,5.)+vec2(layer*.31,time*.0003));float vein=fbm(p*vec2(6.,7.)+n*3.-time*.00019);float a=edge*smoothstep(.25,.77,n+.22*vein)*life*.27;vec3 dark=vec3(.029,.038,.058),lit=vec3(.20,.24,.31);gl_FragColor=vec4(mix(dark,lit,vein*.7+layer*.035),a);}`});
   const mesh=new T.Mesh(new T.PlaneGeometry(1,1,12,24),mat);mesh.frustumCulled=false;mesh.renderOrder=20+i;this.materials.push(mat);this.fog.push(mesh);this.pieces.add(mesh);
  }
  const body=new T.Mesh(new T.BoxGeometry(150,242,1.5),new T.MeshStandardMaterial({color:0x33343b,roughness:.8}));body.position.z=.75;this.card.position.z=1.52;this.faceShadow.position.z=1.58;this.faceShadow.receiveShadow=true;this.cardGroup.add(body,this.card,this.faceShadow,this.pieces);this.scene.add(this.cardGroup,this.groundShadow);
  const sc=document.createElement('canvas');sc.width=262;sc.height=352;const cx=sc.getContext('2d')!;cx.filter='blur(12px)';cx.fillStyle='#111723';cx.fillRect(40,40,182,272);this.groundShadowMat.map=new T.CanvasTexture(sc);this.groundShadowMat.opacity=.24;this.groundShadow.position.z=-.1;
 }
 private material(p:T.MeshPhysicalMaterialParameters){const mat=new T.MeshPhysicalMaterial({...p,side:T.DoubleSide});this.materials.push(mat);return mat;}
 private texture(kind:string){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const c=canvas.getContext('2d')!;c.fillStyle='#888';c.fillRect(0,0,256,512);
  let seed=713;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(kind==='weave'){for(let y=0;y<512;y+=3)for(let x=0;x<256;x+=3){const b=90+random()*55+((x+y)%2)*28;c.fillStyle=`rgb(${b},${b},${b})`;c.fillRect(x,y,2,1);}}
  else if(kind==='steel'){for(let i=0;i<2400;i++){const b=90+random()*75;c.strokeStyle=`rgba(${b},${b},${b},.35)`;c.lineWidth=.35;c.beginPath();const x=random()*256,y=random()*512;c.moveTo(x,y);c.lineTo(x+random()*3,y+10+random()*160);c.stroke();}}
  else if(kind==='feather'){for(let y=0;y<512;y+=4){c.strokeStyle=y%8?'#777':'#b0b0b0';c.lineWidth=.6;c.beginPath();c.moveTo(0,y-65);c.lineTo(128,y);c.lineTo(256,y-65);c.stroke();}c.fillStyle='#bcbcbc';c.fillRect(126,0,3,512);}
  else {for(let i=0;i<13000;i++){const b=110+random()*35;c.fillStyle=`rgb(${b},${b},${b})`;c.fillRect(random()*256,random()*512,1,1);}}
  const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;this.textures.push(tex);return tex;
 }
 private sheet(index:number,mat:T.MeshPhysicalMaterial,f:(u:number,v:number)=>T.Vector3){const mesh=this.sheets[index];mesh.visible=true;mesh.material=mat;this.deform(mesh.geometry,f);}
 private deform(g:T.PlaneGeometry,f:(u:number,v:number)=>T.Vector3){const uv=g.getAttribute('uv'),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const q=f(uv.getX(i),uv.getY(i));p.setXYZ(i,q.x,q.y,q.z);}p.needsUpdate=true;g.computeVertexNormals();}
 private tube(index:number,radius:number,f:(v:number)=>T.Vector3,mat=this.rope){const mesh=this.cords[index];mesh.visible=true;mesh.material=mat;this.deform(mesh.geometry,(u,v)=>{const p=f(v),ahead=f(Math.min(1,v+.002)),behind=f(Math.max(0,v-.002)),t=ahead.sub(behind).normalize(),n=new T.Vector3(-t.y,t.x,0).normalize(),b=new T.Vector3().crossVectors(t,n).normalize(),a=u*TAU,twist=1+.08*Math.sin(v*280+u*15);return p.addScaledVector(n,Math.cos(a)*radius*twist).addScaledVector(b,Math.sin(a)*radius*twist);});}
 private prepare(face:HTMLCanvasElement,v:number,ms:number,id:string,reduced:boolean,board=false){
  this.sheets.forEach(m=>m.visible=false);this.cords.forEach(m=>m.visible=false);this.fog.forEach(m=>m.visible=false);
  let map=this.maps.get(face);if(!map){map=new T.CanvasTexture(face);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;this.maps.set(face,map);}if(this.cardMat.map!==map){this.cardMat.map=map;this.cardMat.needsUpdate=true;}
  const strength=rank(id),squad=id==='ASSASSIN_SQUAD';
  const grow=ease(80,620,ms),end=1-ease(2110,2750,ms),life=grow*end;
  const height=board?0:36*ease(0,430,ms)*(1-ease(1000,1720,ms));
  this.cardGroup.position.z=height;this.cardGroup.rotation.set(0,0,0);this.groundShadowMat.opacity=.25-height*.002;this.groundShadow.scale.setScalar(1+height*.003);
  this.faceShadow.visible=!reduced&&life>.001;this.gl.shadowMap.enabled=this.faceShadow.visible;
  if(reduced||ms<=0||ms>=DURATION||life<.001)return;

  if(v===0){ // Tailored mantle: the weighted lower hem lags behind the shoulder seam.
   for(const side of [-1,1])for(let layer=0;layer<(id==='ASSASSIN1'?1:2);layer++){
    const idx=(side+1)+layer,delay=layer*120+(squad?(side+1)*100:0),open=ease(620+delay,1980+delay,ms);
    this.sheet(idx,layer?this.lining:this.cloth,(u,t)=>{const lag=open*(.48+.52*t),angle=lerp(.04,2.38,lag),span=(91+layer*9)*life*(.8+.2*Math.sin(t*Math.PI)),d=u*span;
     return v3(side*(86-Math.cos(angle)*d),lerp(-133,131,t)+Math.sin(u*4+t*5)*7*life*(1-t),3+layer*.6+Math.sin(angle)*d+Math.sin(u*Math.PI)*7*life+(Math.sin(u*19+t*4+ms*.0018)*3.8+Math.sin(u*37-t*7)*1.3)*life*u);
    });
   }
  }else if(v===1){ // Hinged, bevelled steel lamellae; no card slicing or disconnected swords.
   const count=id==='ASSASSIN1'?3:4;
   for(const side of [-1,1])for(let j=0;j<count;j++){
    const open=ease(620+j*105,1510+j*105,ms),retract=1-ease(1530+j*95,2430+j*60,ms),length=(92+j*3)*grow*retract,baseY=-117+j*246/count;
    this.sheet((side+1)*count/2+j,this.steel,(u,t)=>{const taper=.4+.6*Math.sin(t*Math.PI),d=u*length,angle=open*2.1;
     return v3(side*(86-d*Math.cos(angle)),baseY+t*(238/count)+open*u*(j-count/2)*12,3+Math.sin(angle)*d+Math.min(u/.12,(1-u)/.12,1)*3*taper*grow+(u>.87?(1-u)*12:1.56));
    });
   }
  }else if(v===2){ // One continuous lacquer skin rolls away; its free edge never teleports.
   const peel=ease(580,2220,ms),front=lerp(-132,151,peel),roll=28*Math.sin(peel*Math.PI),length=(Math.max(0,132-front)+roll*Math.PI)*grow;
   this.sheet(0,this.lacquer,(u,t)=>{const d=t*length,curled=Math.min(d,roll*Math.PI),flat=Math.max(0,d-roll*Math.PI),a=roll>.1?Math.PI-curled/roll:0;return v3((u-.5)*174*life,Math.min(132,front-Math.sin(a)*roll+flat),3+(1-Math.cos(a))*roll+Math.sin(u*13+t*5)*1.4*life);});
   }else if(v===3){ // Coherent layered fog, confined to the card and drawn upward from its outline.
   for(let i=0;i<this.fog.length;i++){
    const m=this.fog[i],lift=ease(450+i*80,2200+i*65,ms),density=grow*(1-ease(1370+i*80,2470+i*45,ms));m.visible=true;m.material.uniforms.time.value=ms;m.material.uniforms.life.value=density*1.8;
    this.deform(m.geometry,(u,t)=>{const wave=Math.sin(t*7+i*.7+ms*.0018),width=184*(1-lift*.37);return v3((u-.5)*width+wave*16*lift,lerp(-144,144,t)+lift*30*Math.sin(u*4+i),4+i*3.4+lift*27*Math.sin(t*Math.PI));});
   }
  }else if(v===4){ // A woven binding releases at its crossing; slack travels to the free ends.
   const unwind=ease(620,2120,ms),length=1-ease(1980,2740,ms),count=id==='ASSASSIN1'?2:3;
   for(let j=0;j<count;j++)for(const sign of [-1,1]){
    const index=j*2+(sign+1)/2,phase=j*.35;
    this.tube(index,2.9*grow*length,(t)=>{const spread=ease(.05,.8,t)*unwind,angle=(t*1.2+phase)*TAU;
     return v3(sign*(lerp(0,84,t)+spread*48*Math.sin(t*4)),lerp(-92+j*32,105-j*24,t)+Math.sin(angle)*17*(1-unwind)+spread*38*sign,5+j*2+Math.sin(t*Math.PI)*(9+48*spread)+Math.sin(t*17-ms*.004)*spread*7).multiplyScalar(.7+.3*grow);
    });
   }
   this.tube(8,3.6*life,t=>{const a=t*TAU,rr=13*(1-unwind)*grow;return v3(Math.cos(a)*rr,Math.sin(a)*rr*.7,12+Math.sin(a*2)*3);});
  }else { // Overlapping feather vanes, rooted in two side seams with a visible shaft.
   const count=id==='ASSASSIN1'?4:id==='ASSASSIN4'?7:6;
   for(const sign of [-1,1])for(let j=0;j<count;j++){
    const index=(sign+1)*count/2+j,open=ease(640+j*70,1730+j*70,ms),fade=1-ease(1780+j*55,2560+j*40,ms),len=(96+j*3)*grow*fade,angle=lerp(.05,2.1,open),baseY=-117+j*230/count;
    this.sheet(index,this.feather,(u,t)=>{const d=t*len,width=Math.pow(Math.sin(t*Math.PI),.72)*(11+(strength-1)*4),barb=(u-.5)*2*width*(1-.055*Math.sin(t*210));
     return v3(sign*(85-Math.cos(angle)*d+barb*.3),baseY+d*(.24+.35*open)+barb,4+j*.42+Math.sin(angle)*d+Math.sin(u*Math.PI)*4.3*Math.sin(t*Math.PI)+Math.sin(t*12+j)*2.5*open+Math.sin(u*16+t*52)*.25);
    });
    if(j%2===0&&j<6)this.tube((sign+1)*3/2+Math.floor(j/2),.65*life,t=>v3(sign*(85-Math.cos(angle)*t*len),baseY+t*len*(.24+.35*open),6+j*.42+Math.sin(angle)*t*len),this.steel);
   }
  }
 }
 draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,id:string,reduced=false,view:View='oblique'){
  if(this.disposed)return;this.prepare(face,v,ms,id,reduced);this.gl.setSize(460,520,false);
  this.camera.up.set(0,0,1);if(view==='top'){this.camera.up.set(0,1,0);this.camera.position.set(0,0,900);}else if(view==='side')this.camera.position.set(260,-750,350);else this.camera.position.set(100,-730,950);
  this.camera.lookAt(0,0,16);this.camera.updateMatrixWorld();this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,x-w*230/180,y-w*260/180,w*460/180,w*520/180);
 }
 drawBoard(c:C,face:HTMLCanvasElement,v:number,ms:number,id:string,matrix:DOMMatrix,width:number,height:number){
  // Hidden/unloading iframes can report a zero-size viewport during their last resize callback.
  if(this.disposed||width<1||height<1)return;this.prepare(face,v,ms,id,false,true);this.gl.setSize(width,height,false);
  const local=matrix.translate(90,135,0).scale(1,-1,1),screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  // Keep the DOM projection exact, but evaluate physical reflections from a real eye position.
  this.boardCamera.position.set(0,-600,1000);this.boardCamera.up.set(0,0,1);this.boardCamera.lookAt(0,0,0);this.boardCamera.updateMatrixWorld();
  this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(local.toFloat64Array()))).multiply(this.boardCamera.matrixWorld));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 get status(){return{disposed:this.disposed,renderer:'physical-3d',textures:this.maps.size};}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.traverse(o=>{const mesh=o as T.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){const a=Array.isArray(mesh.material)?mesh.material:[mesh.material];a.forEach(m=>m.dispose());}const light=o as T.DirectionalLight;light.shadow?.map?.dispose();});this.maps.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.materials.forEach(m=>m.dispose());this.cardMat.dispose();this.faceShadow.material.dispose();this.groundShadowMat.map?.dispose();this.groundShadowMat.dispose();this.env.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}
let renderer:AssassinRenderer|undefined;
function instance(){return renderer??=new AssassinRenderer();}
export function draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,id:string,reduced=false,view:View|boolean='oblique'){instance().draw(c,face,v,ms,x,y,w,id,reduced,typeof view==='string'?view:'top');}
export function drawBoard(c:C,face:HTMLCanvasElement,v:number,ms:number,id:string,matrix:DOMMatrix,width:number,height:number){instance().drawBoard(c,face,v,ms,id,matrix,width,height);}
export function dispose(){renderer?.dispose();renderer=undefined;}
if(import.meta.hot)import.meta.hot.dispose(dispose);
