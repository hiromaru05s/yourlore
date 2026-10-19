import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {portalFragment} from './portal';
import {VOID_SUMMON_IMPACT} from './selection';
const ramp=(t:number,a:number,b:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
const envelope=(t:number,a:number,b:number,c:number,d:number)=>ramp(t,a,b)*(1-ramp(t,c,d));
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// The captured alpha is the only card contour: no rectangular stock, outer frame,
// edge mesh, glow or contact flash. The portal merely reveals the unchanged face.
const fragment=`precision highp float;varying vec2 vUv;uniform sampler2D face;uniform float reveal;
void main(){vec4 c=texture2D(face,vUv);if(c.a<.025||1.-vUv.y>reveal*1.35-.13)discard;gl_FragColor=c;
#include <colorspace_fragment>
}`;
export class VoidRenderer {
 readonly gl:T.WebGLRenderer;
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-2.4,2.4,2.4,-2.4,.1,30);
 private faces=new Map<HTMLCanvasElement,T.CanvasTexture>();private material:T.ShaderMaterial;
 private card=new T.Group();private aperture=new T.Group();private back:T.Mesh;private front:T.Mesh;private shadow:T.Mesh;
 private disposed=false;
 constructor(){
  this.gl=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setPixelRatio(1);this.gl.setSize(512,512);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  this.camera.position.z=10;this.camera.updateProjectionMatrix();const m=this.camera.projectionMatrix.elements;m[9]=.6/2.4;m[8]=.07/2.4;m[13]=6/2.4;m[12]=.7/2.4;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.material=new T.ShaderMaterial({uniforms:{face:{value:null},reveal:{value:0}},vertexShader:vertex,fragmentShader:fragment,side:T.DoubleSide,transparent:true});
  const face=new T.Mesh(new T.PlaneGeometry(1,1.5),this.material);face.position.z=.016;face.renderOrder=3;this.card.add(face);this.scene.add(this.card);
  const portal=(front:number)=>{const material=new T.ShaderMaterial({uniforms:{time:{value:0},opening:{value:0},closing:{value:0},frontPass:{value:front},release:{value:0}},vertexShader:vertex,fragmentShader:portalFragment,side:T.DoubleSide,transparent:true,depthWrite:false,depthTest:false});const mesh=new T.Mesh(new T.PlaneGeometry(2.65,2.65),material);mesh.renderOrder=front?5:1;return mesh;};
  this.back=portal(0);this.front=portal(1);this.aperture.add(this.back,this.front);this.scene.add(this.aperture);
  const radial=document.createElement('canvas');radial.width=radial.height=128;const c=radial.getContext('2d')!,g=c.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(.4,'rgba(255,255,255,.25)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  this.shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(radial),color:'#100719',transparent:true,depthWrite:false}));this.shadow.position.z=-.08;this.scene.add(this.shadow);
  this.gl.compile(this.scene,this.camera);
 }
 private texture(face:HTMLCanvasElement){let texture=this.faces.get(face);if(!texture){texture=new T.CanvasTexture(face);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.gl.capabilities.getMaxAnisotropy());this.faces.set(face,texture);}return texture;}
 warmup(face:HTMLCanvasElement){this.material.uniforms.face.value=this.texture(face);this.gl.render(this.scene,this.camera);this.gl.getContext().finish();}
 render(canvas:HTMLCanvasElement,face:HTMLCanvasElement,id:string,ms:number,options:{reduced?:boolean;pass?:'card'|'ground'}={}){
  if(this.disposed)return;const t=options.reduced?4000:ms,jailer=id==='GM6_1',finish=jailer?585:550,emerge=ramp(t,150,finish),land=ramp(t,690,VOID_SUMMON_IMPACT),after=1-land;
  this.card.visible=t>156&&options.pass!=='ground';this.card.position.set(0,.28*(1-emerge)*after,.54*after);this.card.rotation.x=-(1-emerge)*.55;this.card.scale.setScalar(.46+.54*emerge+.07*envelope(t,190,440,610,VOID_SUMMON_IMPACT));
  this.material.uniforms.face.value=this.texture(face);this.material.uniforms.reveal.value=emerge;
  const opening=ramp(t,35,135),closing=ramp(t,460,860),radius=opening*Math.pow(1-closing,.65);
  this.aperture.visible=opening>0&&closing<1&&options.pass!=='ground';this.aperture.position.set(0,.28,.18);this.aperture.scale.set(radius,radius,1);
  for(const mesh of [this.back,this.front]){const u=(mesh.material as T.ShaderMaterial).uniforms;u.time.value=t/1000*(jailer?-.88:1);u.opening.value=opening;u.closing.value=closing;u.release.value=ramp(t,180,finish+70);}
  this.shadow.visible=options.pass!=='card';this.shadow.scale.set(1.5+after*.45,2.1+after*.4,1);(this.shadow.material as T.MeshBasicMaterial).opacity=emerge*(.17+.17*land);
  if(this.gl.domElement.width!==canvas.width||this.gl.domElement.height!==canvas.height)this.gl.setSize(canvas.width,canvas.height,false);this.gl.render(this.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(this.gl.domElement,0,0,canvas.width,canvas.height);
 }
 get resources(){return {...this.gl.info.memory};}
 releaseFace(face:HTMLCanvasElement){this.faces.get(face)?.dispose();this.faces.delete(face);}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as T.MeshBasicMaterial).map?.dispose();m.dispose();}}});this.faces.forEach(t=>t.dispose());this.faces.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
