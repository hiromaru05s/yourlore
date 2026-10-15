import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeHourglass } from './hourglass';
import type { Hourglass } from './hourglass';
export type Phase='idle'|'dice'|'cast'|'hold'|'release'|'done'|'failed';
export const CAST_MS=4400,RELEASE_MS=2600;
const ease=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b);

const fragment=`
uniform sampler2D uMap;uniform vec2 uResolution;uniform vec2 uCenter;
uniform float uAspect,uStrength,uRadius,uTime,uRelease,uAlpha,uTransmission;
varying vec2 vUv;
vec2 rotate(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
void main(){
 vec2 uv=vUv;
 vec2 p=(uv-uCenter)*vec2(uAspect,1.);float r=length(p),ang=atan(p.y,p.x);
 float q=r/max(.001,uRadius);float mask=1.-smoothstep(.76,1.04,q);
 vec2 warped=p;float edge=0.;vec3 light=vec3(.56,.76,.91);
   float winding=uStrength*(1.35+.15*sin(uTime*.9))*pow(max(0.,1.-q),1.2);
   warped=rotate(p,-winding);warped*=1.-.10*uStrength*mask;
   float spiral=sin(ang*2.+r*58.-uTime*.8);
   edge=pow(max(0.,spiral),85.)*mask*.15;
   light=vec3(.64,.70,.95);

 vec2 sampleUV=clamp(uCenter+warped/vec2(uAspect,1.),vec2(.002),vec2(.998));
 float aberration=.0017*uStrength*mask;
 vec2 dir=normalize(p+vec2(.0001))/vec2(uAspect,1.);
 vec3 col;col.r=texture2D(uMap,sampleUV+dir*aberration).r;col.g=texture2D(uMap,sampleUV).g;col.b=texture2D(uMap,sampleUV-dir*aberration).b;
 col*=1.-uStrength*.20*mask;col+=light*edge*uStrength;
 // Only the lens area replaces the live board. No opaque fullscreen vignette.
 gl_FragColor=vec4(col,uTransmission>.5?1.:mask*uAlpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 gl_FragColor.rgb*=gl_FragColor.a;
}`;

export class Spacetime {
  readonly renderer:T.WebGLRenderer;
  readonly scene=new T.Scene();
  readonly camera=new T.OrthographicCamera();
  private model:Hourglass;
  private background:T.Mesh;
  private map:T.CanvasTexture;
  private environment:T.WebGLRenderTarget;
  private material:T.ShaderMaterial;
  private card:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
  private cardMap:T.CanvasTexture;
  private shadow:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
  private shadowMap:T.CanvasTexture;
  private rim:T.PointLight;
  private span=6.4;
  private width=1;private height=1;private dead=false;
  constructor(board:HTMLCanvasElement,face:CanvasImageSource){
    this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(1400000/(innerWidth*innerHeight))));this.renderer.transmissionResolutionScale=.5;this.renderer.setClearColor(0,0);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.renderer.domElement.className='timewarp-optics';this.renderer.domElement.style.cssText='position:fixed;inset:0;z-index:180;pointer-events:none;width:100%;height:100%';this.renderer.domElement.dataset.selection='reverse-helix-03';this.renderer.domElement.setAttribute('aria-hidden','true');document.body.append(this.renderer.domElement);
    this.map=new T.CanvasTexture(board);this.map.colorSpace=T.SRGBColorSpace;this.map.minFilter=T.LinearFilter;
    this.material=new T.ShaderMaterial({uniforms:{uMap:{value:this.map},uResolution:{value:new T.Vector2()},uAspect:{value:1},uCenter:{value:new T.Vector2(.5,.5)},uStrength:{value:0},uRadius:{value:.38},uTime:{value:0},uRelease:{value:0},uAlpha:{value:0},uTransmission:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:fragment,depthWrite:false,toneMapped:false});
    this.background=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.background.position.z=-4;this.background.renderOrder=-10;this.background.onBeforeRender=()=>{this.material.uniforms.uTransmission.value=this.renderer.getRenderTarget()?1:0;};this.scene.add(this.background);
    const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();
    // Wide window and slim strip reflections articulate both glass walls and metal machining.
    const strip=new T.Mesh(new T.PlaneGeometry(2,8),new T.MeshBasicMaterial({color:new T.Color(5,6,7)}));strip.position.set(-3,2,3);strip.lookAt(0,0,0);room.add(strip);
    this.environment=pmrem.fromScene(room,.035);room.dispose();strip.geometry.dispose();strip.material.dispose();pmrem.dispose();this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.9;
    this.scene.add(new T.HemisphereLight(0xdeeafa,0x282432,.65));
    const key=new T.DirectionalLight(0xffedcf,3.4);key.position.set(-3,5,6);this.scene.add(key);
    const fill=new T.DirectionalLight(0xa2bedf,2);fill.position.set(3,1,-2);this.scene.add(fill);
    this.rim=new T.PointLight(0xbacfff,5,8,2);this.rim.position.set(0,-1,1);this.scene.add(this.rim);
    this.model=makeHourglass();this.scene.add(this.model.object);
    const faceCanvas=document.createElement('canvas');faceCanvas.width=720;faceCanvas.height=1080;faceCanvas.getContext('2d')!.drawImage(face,0,0,720,1080);this.cardMap=new T.CanvasTexture(faceCanvas);this.cardMap.colorSpace=T.SRGBColorSpace;
    this.card=new T.Mesh(new T.PlaneGeometry(1.2,1.8),new T.MeshBasicMaterial({map:this.cardMap,transparent:true,depthWrite:false,side:T.DoubleSide}));this.card.position.z=.2;this.scene.add(this.card);
    const sc=document.createElement('canvas');sc.width=sc.height=256;const c=sc.getContext('2d')!,g=c.createRadialGradient(128,128,8,128,128,128);g.addColorStop(0,'rgba(0,0,0,.8)');g.addColorStop(.4,'rgba(0,0,0,.37)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,256,256);this.shadowMap=new T.CanvasTexture(sc);
    this.shadow=new T.Mesh(new T.PlaneGeometry(2.7,.75),new T.MeshBasicMaterial({map:this.shadowMap,transparent:true,depthWrite:false,opacity:.6}));this.shadow.position.set(0,-1.7,-.5);this.scene.add(this.shadow);
    this.resize();
  }
  resize(){
    this.width=innerWidth;this.height=innerHeight;const aspect=this.width/this.height;this.span=Math.max(6.5,4.2/aspect);
    this.camera.left=-this.span*aspect/2;this.camera.right=this.span*aspect/2;this.camera.top=this.span/2;this.camera.bottom=-this.span/2;this.camera.near=.1;this.camera.far=30;this.camera.position.set(0,0,10);this.camera.updateProjectionMatrix();
    this.background.scale.set(this.span*aspect/2,this.span/2,1);this.renderer.setSize(this.width,this.height);this.renderer.getDrawingBufferSize(this.material.uniforms.uResolution.value);this.material.uniforms.uAspect.value=aspect;
  }
  updateBackground(board:HTMLCanvasElement){const old=this.map.image as HTMLCanvasElement;this.map.image=board;this.map.needsUpdate=true;old.width=old.height=1;}
  draw(phase:Phase,ms:number,source:{x:number;y:number},anchor:{x:number;y:number},reduced=false){
    if(this.dead)return;
    if(phase==='idle'||phase==='dice'||phase==='failed'||phase==='done'){this.renderer.clear();this.renderer.domElement.hidden=true;return;}
    this.renderer.domElement.hidden=false;this.renderer.domElement.dataset.phase=phase;this.renderer.domElement.dataset.time=String(Math.round(ms));
    const t=ms/1000,cast=phase==='cast',hold=phase==='hold',release=phase==='release',p=release?Math.min(1,ms/RELEASE_MS):0;
    const enter=cast?ease(0,.85,t):1,park=cast?ease(3.0,4.4,t):hold?1:1-ease(0,.25,p);
    const leave=release?1-ease(.68,1,p):1;
    const anchorX=(anchor.x/this.width-.5)*this.span*this.width/this.height,anchorY=(.5-anchor.y/this.height)*this.span;
    const sourceX=(source.x/this.width-.5)*this.span*this.width/this.height,sourceY=(.5-source.y/this.height)*this.span;
    const travel=cast?ease(.08,.95,t):1;
    const posX=T.MathUtils.lerp(sourceX,0,travel)+anchorX*park,posY=T.MathUtils.lerp(sourceY,.08,travel)+(anchorY-.08)*park;
    const scale=(.08+.92*enter)*(1-.81*park)*leave;
    this.model.object.position.set(posX,posY,1);this.model.object.scale.setScalar(Math.max(.0001,scale));
    const turn=release?ease(.1,.73,p):0;
    this.model.object.rotation.set(.12,cast?.32*(1-ease(.2,2,t)):.12,0);
    this.model.object.rotation.z=cast?-.22*Math.sin(ease(0,3,t)*Math.PI):release?-.3*Math.sin(p*Math.PI):0;
    this.model.animate(hold?3:t,turn,hold);
    this.card.visible=cast&&t<1.15;this.card.material.opacity=(1-ease(.2,1.12,t));
    this.card.position.set(T.MathUtils.lerp(sourceX,0,travel),T.MathUtils.lerp(sourceY,-1.45,travel),.2);this.card.rotation.x=-ease(0,.6,t)*1.04;this.card.rotation.z=.08*(1-travel);this.card.scale.setScalar(.74+.3*travel);
    this.shadow.visible=!hold;this.shadow.position.set(posX,posY-1.7*scale,-.5);this.shadow.scale.setScalar(scale);this.shadow.material.opacity=.5*enter*leave;
    const energy=cast?ease(.12,1.2,t)*(1-.84*park):hold?.055:Math.sin(Math.PI*ease(0,1,p))*.96;
    const center=this.material.uniforms.uCenter.value as T.Vector2;center.set(posX/(this.span*this.width/this.height)+.5,posY/this.span+.5);
    this.material.uniforms.uStrength.value=reduced?energy*.08:energy;
    this.material.uniforms.uAlpha.value=hold?0:enter*leave;
    this.material.uniforms.uRadius.value=(cast?.35*(1-.78*park):hold?.055:.12+.48*ease(0,.63,p))*Math.min(1,6.5/this.span);
    this.material.uniforms.uTime.value=reduced?1:t;
    this.material.uniforms.uRelease.value=release?turn:0;
    this.rim.intensity=2+energy*3;
    this.model.object.visible=true;
    if(reduced){this.model.object.position.set(hold?anchorX:0,hold?anchorY:.08,1);this.model.object.scale.setScalar(hold?.19:1);this.model.object.visible=!(release&&p>.75);this.model.object.rotation.set(.12,.12,0);this.model.vessel.rotation.set(0,0,0);this.model.stream.visible=false;this.card.visible=false;this.shadow.visible=false;this.material.uniforms.uAlpha.value=0;this.material.uniforms.uStrength.value=0;}
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){if(this.dead)return;this.dead=true;this.model.dispose();this.map.dispose();this.cardMap.dispose();this.shadowMap.dispose();this.environment.dispose();[this.background,this.card,this.shadow].forEach(o=>{o.geometry.dispose();(o.material as T.Material).dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
