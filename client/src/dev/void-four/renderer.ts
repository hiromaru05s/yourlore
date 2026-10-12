import {VoidRenderer} from '../../ui/voidSummon/renderer';
import * as T from 'three';
import {designs,envelope,ramp,motion} from './catalog';
import {portalFragment} from './portal';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const faceFragment=`precision highp float;varying vec2 vUv;uniform sampler2D face;uniform float reveal,variant,ink,time;
void main(){vec4 c=texture2D(face,vUv);if(c.a<.025)discard;
 float field=variant<.5?1.-vUv.y:variant<1.5?1.-vUv.x:variant<2.5?(vUv.x+1.-vUv.y)*.5:length((vUv-.5)*vec2(1.4,1.));
 float distortion=sin(vUv.x*36.+sin(vUv.y*22.+time*7.))*sin(vUv.y*31.)*.016*ink;
 float boundary=reveal*1.35-.13+distortion;
 if(field>boundary)discard;
 float wet=exp(-abs(field-boundary)*28.)*ink;
 float ridge=pow(.5+.5*sin(vUv.y*51.+sin(vUv.x*29.+time*6.)*2.),15.);
 c.rgb=mix(c.rgb,vec3(.023,.009,.045),wet*.92);
 c.rgb+=vec3(.63,.42,.88)*wet*(ridge*.65+.09);
 gl_FragColor=c;
 #include <colorspace_fragment>
}`;
export class Renderer {
 readonly gl:T.WebGLRenderer;
 private selected=new VoidRenderer();private captured:Map<string,HTMLCanvasElement>;
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-2.4,2.4,2.4,-2.4,.1,30);
 private textures=new Map<string,T.CanvasTexture>();private faceMaterial:T.ShaderMaterial;
 private card=new T.Group();private face:T.Mesh;private stock:T.Mesh;
 private aperture=new T.Group();private back:T.Mesh;private front:T.Mesh;
 private petals:T.Mesh[]=[];private shadow:T.Mesh;private contact:T.Mesh;private disposed=false;
 constructor(faces:Map<string,HTMLCanvasElement>){
  this.captured=faces;for(const face of faces.values())this.selected.warmup(face);
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setPixelRatio(1);this.gl.setSize(512,512);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  this.camera.position.z=10;this.camera.updateProjectionMatrix();this.camera.projectionMatrix.elements[9]=.6/2.4;this.camera.projectionMatrix.elements[8]=.07/2.4;this.camera.projectionMatrix.elements[13]=6/2.4;this.camera.projectionMatrix.elements[12]=.7/2.4;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  for(const[id,canvas]of faces){const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(4,this.gl.capabilities.getMaxAnisotropy());this.textures.set(id,tex);}
  this.faceMaterial=new T.ShaderMaterial({uniforms:{face:{value:this.textures.values().next().value},reveal:{value:0},variant:{value:0},ink:{value:1},time:{value:0}},vertexShader:vertex,fragmentShader:faceFragment,side:T.DoubleSide,transparent:true});
  this.face=new T.Mesh(new T.PlaneGeometry(1,1.5),this.faceMaterial);this.face.position.z=.016;this.face.renderOrder=3;this.card.add(this.face);
  this.stock=new T.Mesh(new T.BoxGeometry(.982,1.482,.021),new T.MeshBasicMaterial({color:'#64536e'}));this.stock.renderOrder=2;this.card.add(this.stock);this.scene.add(this.card);
  const portal=(front:number)=>{const m=new T.ShaderMaterial({uniforms:{time:{value:0},variant:{value:0},opening:{value:0},closing:{value:0},frontPass:{value:front},release:{value:0}},vertexShader:vertex,fragmentShader:portalFragment,side:T.DoubleSide,transparent:true,depthWrite:false,depthTest:false});const mesh=new T.Mesh(new T.PlaneGeometry(2.65,2.65),m);mesh.renderOrder=front?5:1;return mesh;};
  this.back=portal(0);this.front=portal(1);this.aperture.add(this.back,this.front);this.scene.add(this.aperture);
  const petalMaterial=new T.MeshStandardMaterial({color:'#23122f',metalness:.68,roughness:.33,side:T.DoubleSide});
  for(let k=0;k<4;k++){const g=new T.PlaneGeometry(1,1,16,12);const mesh=new T.Mesh(g,petalMaterial);mesh.renderOrder=4;this.petals.push(mesh);this.scene.add(mesh);}
  const radial=document.createElement('canvas');radial.width=radial.height=128;const c=radial.getContext('2d')!,gr=c.createRadialGradient(64,64,1,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.6)');gr.addColorStop(.4,'rgba(255,255,255,.25)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,128,128);const map=new T.CanvasTexture(radial);
  const plane=(color:string)=>new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,color,transparent:true,depthWrite:false}));
  this.shadow=plane('#100719');this.shadow.position.z=-.08;this.contact=plane('#9f76bd');this.contact.position.z=-.07;this.scene.add(this.shadow,this.contact);
  this.scene.add(new T.AmbientLight('#a192ba',2));const light=new T.DirectionalLight('#dec4ff',4);light.position.set(-1,3,4);this.scene.add(light);
  // Compile all material paths and upload both public faces while the lab still
  // displays its loading state, so the abrupt entrance has no first-use hitch.
  this.gl.compile(this.scene,this.camera);
  for(const texture of this.textures.values()){this.faceMaterial.uniforms.face.value=texture;this.gl.render(this.scene,this.camera);}
  this.gl.getContext().finish();
 }
 render(canvas:HTMLCanvasElement,id:string,v:number,ms:number,options:{reduced?:boolean;board?:boolean;pass?:'card'|'ground';size?:number}={}){
  if(this.disposed)return;
  if(v===0){this.selected.render(canvas,this.captured.get(id)!,id,ms,options);return;}
  const reduced=!!options.reduced,t=reduced?4000:ms,jailer=id==='GM6_1',d=designs[v],state=motion(v,t,reduced);
  const start=[150,160,150,210][v],finish=[550,650,780,550][v]+(jailer?35:0),emerge=ramp(t,start,finish),land=ramp(t,[690,760,870,670][v],d.hit),after=1-land;
  const opening=ramp(t,35,[135,105,165,105][v]),close=ramp(t,[460,560,700,440][v],[860,880,1050,790][v]);
  const visible=t>start+6;this.card.visible=visible;this.card.position.set(0,0,0);this.card.rotation.set(0,0,0);this.card.scale.setScalar(1);
  if(v===0){const punch=envelope(t,190,440,610,d.hit);this.card.position.set(0,.28*(1-emerge)*after,.54*after);this.card.scale.setScalar(.46+.54*emerge+.07*punch);this.card.rotation.x=-(1-emerge)*.55;}
  if(v===1){this.card.position.set(-.78*(1-emerge),.30*(1-emerge),.38*after);this.card.rotation.z=(jailer?-.12:-.27)*(1-emerge);this.card.rotation.y=.38*(1-emerge);}
  if(v===2){const turn=(jailer?-1:1)*(1-emerge)*1.4;this.card.position.set(Math.sin(turn)*.42,Math.sin(Math.PI*emerge)*.2,.49*after);this.card.rotation.z=turn;this.card.scale.setScalar(.43+.57*emerge);}
  if(v===3){const kick=envelope(t,220,420,580,d.hit);this.card.position.set(0,.08*after,.64*after);this.card.scale.setScalar(.73+.27*emerge+.06*kick);this.card.rotation.x=-.22*(1-emerge);}
  // Keep the landing face parallel and exact; shadow/contact use the same hit clock.
  const u=this.faceMaterial.uniforms;u.face.value=this.textures.get(id);u.reveal.value=emerge;u.variant.value=v;u.ink.value=1-ramp(t,finish,finish+160);u.time.value=t/1000;
  this.stock.visible=emerge>.999;
  this.aperture.visible=opening>0&&close<1;this.aperture.position.set(v===1?-.45:0,v===1?.25:.28,.18);this.aperture.rotation.set(0,0,v===1?-.35:0);
  const radius=opening*Math.pow(1-close,.65);this.aperture.scale.set(radius*(v===1?.40:1),radius*(v===1?1.08:v===2?.88:1),1);
  for(const mesh of [this.back,this.front]){const u=(mesh.material as T.ShaderMaterial).uniforms;u.time.value=t/1000*(jailer?-.88:1);u.variant.value=v;u.opening.value=opening;u.closing.value=close;u.release.value=ramp(t,start+30,finish+70);}
  const peel=envelope(t,180,390,520,jailer?750:910);
  this.petals.forEach((p,k)=>{
   p.visible=v===3&&peel>.001&&close<1;
   if(!p.visible)return;const a=k*Math.PI/2+.24,positions=p.geometry.getAttribute('position') as T.BufferAttribute,uv=p.geometry.getAttribute('uv');
   for(let n=0;n<positions.count;n++){const s=uv.getX(n),h=uv.getY(n),rad=.54+h*.49,angle=a+(s-.5)*1.56*(1-h*.94)+Math.sin(h*4.)*peel*.22,bend=Math.sin(h*Math.PI)*peel*.37;
    positions.setXYZ(n,Math.cos(angle)*(rad+peel*.24*h),Math.sin(angle)*(rad+peel*.24*h)+.28,.23+bend+Math.sin(s*9.+h*11.)*.018*peel);
   }positions.needsUpdate=true;p.geometry.computeVertexNormals();p.geometry.computeBoundingSphere();p.scale.setScalar(radius);});
  const arrival=ramp(t,start,finish);this.shadow.scale.set(1.5+(1-land)*.45,2.1+(1-land)*.4,1);(this.shadow.material as T.MeshBasicMaterial).opacity=arrival*(.17+.17*land);
  this.contact.scale.set(1.5+state.contact*.42,1.9+state.contact*.3,1);(this.contact.material as T.MeshBasicMaterial).opacity=state.contact*.38;
  const cardPass=options.pass!=='ground';this.card.visible=this.card.visible&&cardPass;this.aperture.visible=this.aperture.visible&&cardPass;this.petals.forEach(p=>p.visible=p.visible&&cardPass);this.shadow.visible=options.pass!=='card';this.contact.visible=options.pass!=='card';
  this.gl.render(this.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(this.gl.domElement,0,0,canvas.width,canvas.height);canvas.dataset.debug=JSON.stringify({calls:this.gl.info.render.calls,triangles:this.gl.info.render.triangles});
 }
 get resources(){return {...this.gl.info.memory,selected:this.selected.resources};}
 dispose(){if(this.disposed)return;this.disposed=true;this.selected.dispose();const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);const map=(m as T.MeshBasicMaterial).map;if(map)ts.add(map);}}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());this.textures.forEach(t=>t.dispose());this.gl.dispose();this.gl.forceContextLoss();}
}
