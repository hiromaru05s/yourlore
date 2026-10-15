import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CARD_PADDING} from '../cardSurface';
import {CARD_RATIO} from '../boardProjection';
import {ForgeMaterials,plate,blade,hammer,axe,shield,Ribbon} from './geometry';
import {ease,DURATION} from './catalog';
type C=CanvasRenderingContext2D;
const life=(t:number,a:number,b:number,c:number,d:number)=>ease(a,b,t)*(1-ease(c,d,t));

/** Approved Sally #4: identical forged models, lighting and choreography to the comparison. */
export class Renderer {
 readonly shaderErrors:string[]=[];readonly gl:T.WebGLRenderer;readonly scene=new T.Scene();readonly camera=new T.OrthographicCamera(-2.2,2.2,2.2,-2.2,.1,40);readonly root=new T.Group();
 private mats=new ForgeMaterials();private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private env:T.WebGLRenderTarget;private disposed=false;
 private face:T.Mesh;private faceMat:T.ShaderMaterial;private receiver:T.Mesh;
 private army:T.Group[]=[];private trail=new Ribbon(0xbdeafa);private chips:T.Mesh[]=[];private stamp:T.Mesh;
 constructor(){
  const m=this.mats;
  this.gl=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.debug.onShaderError=(gl,program,vs,fs)=>{this.shaderErrors.push([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vs),gl.getShaderInfoLog(fs)].filter(Boolean).join('\n'));};this.gl.setPixelRatio(1);this.gl.setSize(800,800);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.1;this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFShadowMap;
  const pm=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.env=pm.fromScene(room,.04);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.88;room.dispose();pm.dispose();
  this.scene.add(new T.HemisphereLight(0xdeedff,0x2d1d16,1.1));const key=new T.DirectionalLight(0xffedd8,2.1);key.position.set(-2.5,3,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2.3;key.shadow.camera.right=2.3;key.shadow.camera.top=2.3;key.shadow.camera.bottom=-2.3;key.shadow.bias=-.0003;key.shadow.normalBias=.01;key.shadow.radius=3;this.scene.add(key);const edge=new T.DirectionalLight(0x9cccf7,1.35);edge.position.set(3,-1,3);this.scene.add(edge);
  this.scene.add(this.root);
  this.faceMat=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,toneMapped:false,uniforms:{map:{value:null},heat:{value:0},time:{value:0},cool:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D map;uniform float heat,time,cool;varying vec2 vUv;void main(){vec4 c=texture2D(map,vUv);vec2 q=(vUv-.5)*vec2(1.24,1.8025);float d=min(.5-abs(q.x),.78125-abs(q.y));float rim=(1.-smoothstep(.0,.045,abs(d)))*step(0.,d);float grit=.7+.3*sin(q.y*115.+sin(q.x*33.)*2.);float pulse=.6+.4*sin(q.y*9.-time*4.);c.rgb+=mix(vec3(1.,.23,.025),vec3(.10,.48,.7),cool)*rim*heat*grit*pulse;float sheen=pow(max(0.,1.-abs(q.x+q.y*.23-(time-2.6)*1.4)*16.),2.)*smoothstep(2.55,2.7,time)*(1.-smoothstep(3.05,3.2,time));c.rgb+=vec3(.16,.22,.25)*sheen;gl_FragColor=c;\n#include <colorspace_fragment>\n}`});
  this.face=new T.Mesh(new T.PlaneGeometry(1+2*CARD_PADDING,1/CARD_RATIO+2*CARD_PADDING),this.faceMat);this.face.position.z=.01;this.root.add(this.face);
  this.receiver=new T.Mesh(new T.PlaneGeometry(3.5,3.5),new T.ShadowMaterial({opacity:.25,depthWrite:false}));this.receiver.position.z=.013;this.receiver.receiveShadow=true;this.root.add(this.receiver);
  this.army=[blade(m).g,axe(m),blade(m,'spear').g,hammer(m),blade(m).g,shield(m),blade(m,'spear').g];this.army.forEach(g=>this.root.add(g));
  this.root.add(this.trail.mesh);
  for(let i=0;i<42;i++){const chip=plate([[0,0],[.013,.004],[.005,.045],[-.006,.015]],.002,i%3?m.ember:m.edge,.001);this.chips.push(chip);this.root.add(chip);}
  this.stamp=plate([[0,.24],[.028,.035],[.31,0],[.035,-.028],[0,-.25],[-.03,-.035],[-.3,0],[-.035,.028]],.002,new T.MeshBasicMaterial({color:0xffecc6,transparent:true,opacity:1,depthWrite:false}),0);this.root.add(this.stamp);
  this.army.forEach(g=>g.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true;}));
 }
 private animate(t:number,reduced:boolean){
  const alive=!reduced&&t>0&&t<3.45,heat=life(t,.04,.44,2.15,2.80),tier=2;
  this.trail.mesh.visible=false;this.stamp.visible=false;
  this.faceMat.uniforms.heat.value=alive?heat:0;this.faceMat.uniforms.time.value=t;this.faceMat.uniforms.cool.value=1;
  const impactX=0,impactY=-.58;
   const count=7,hits=Array.from({length:count},(_,i)=>1.05+i*.12);
   this.army.forEach((g,i)=>{g.visible=alive;const n=i-(count-1)/2,s=n/(count/2),start=.13+i*.05,up=ease(start,start+.58,t),lock=ease(.89+i*.12,1.06+i*.12,t),withdraw=ease(2.25+i*.065,2.91+i*.065,t);const unfold=up*(1-withdraw);g.position.set(s*(.16+.26*lock)*unfold,-.73+.10*unfold+.20*(1-s*s)*lock*(1-withdraw),.11+(count-i)*.034);g.rotation.set(0,-s*.24,s*(-.08-.32*lock)*(1-withdraw));g.scale.setScalar(Math.max(.001,unfold*(i===5?.78:i===3?.83:.70+tier*.045)));});
   const command=life(t,1.72,1.83,1.93,2.30);this.trail.mesh.scale.set(1,1,1);this.trail.mesh.position.set(0,0,0);this.trail.arc(0,-.58,1.1,-.1,Math.PI+.1,.075,.09,command*.6);
  let flash=0;for(const hit of hits)flash=Math.max(flash,life(t,hit-.006,hit+.012,hit+.025,hit+.10));
  this.stamp.visible=alive&&flash>.002;this.stamp.position.set(impactX,impactY,.62);this.stamp.scale.set(1.2*flash,.55*flash,1);(this.stamp.material as T.MeshBasicMaterial).opacity=flash;
  this.chips.forEach((p,i)=>{const impact=hits.length?hits[i%hits.length]:10,age=t-impact-(i%3)*.008,limit=.24+(i%5)*.037;const a=i*2.399,vx=Math.cos(a)*(.65+(i%7)*.17),vy=.4+Math.sin(a)*.6;p.visible=alive&&age>0&&age<limit;p.position.set(impactX+vx*age,impactY+vy*age-age*age*2.7,.45+age*(1+(i%3)*.4)-age*age*2);p.rotation.set(age*12,age*7,a);p.scale.setScalar((1-ease(limit*.45,limit,age))*(.70+tier*.18));});
  if(!alive){this.trail.mesh.visible=false;this.chips.forEach(p=>p.visible=false);}
  this.receiver.visible=alive;
 }
 draw(c:C,face:HTMLCanvasElement,ms:number,x:number,y:number,w:number,reduced=false,flat=true,pass:'all'|'ground'|'card'='all'){
  if(this.disposed)return;const t=Math.max(0,Math.min(DURATION,ms))/1000;
  if(pass!=='card'){c.save();c.translate(x,y);c.scale(w,w);c.fillStyle='rgba(28,24,19,.12)';c.shadowColor='rgba(18,21,26,.26)';c.shadowBlur=w*.055;c.beginPath();c.roundRect(-.46,-.745,.92,1.49,.045);c.fill();c.restore();}if(pass==='ground')return;
  let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.textures.set(face,tex);}this.faceMat.uniforms.map.value=tex;
  this.animate(t,reduced);this.root.position.set(0,0,0);this.camera.position.set(0,flat?0:-2.6,12);this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();this.gl.render(this.scene,this.camera);const size=w*4.4;c.drawImage(this.gl.domElement,x-size/2,y-size/2,size,size);
 }
 releaseFace(face:HTMLCanvasElement){this.textures.get(face)?.dispose();this.textures.delete(face);}
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.env.dispose();this.mats.dispose();this.gl.dispose();this.gl.forceContextLoss();}
 get stats(){return {...this.gl.info.memory,drawCalls:this.gl.info.render.calls,triangles:this.gl.info.render.triangles};}
}
