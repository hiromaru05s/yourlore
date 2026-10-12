import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {BiteRig} from './bite-rig';
import {physics,DURATION,CONTACT,DENTAL_ROOT_EDGE,type Id} from './catalog';
type C=CanvasRenderingContext2D;
export class Renderer{
 readonly ready:Promise<void>;
 private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera();private preview=new T.OrthographicCamera(-230,230,270,-270,.1,2000);private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private materials=new BiteRig();private disposed=false;private env:T.WebGLRenderTarget;
 private cardMat=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:true,uniforms:{face:{value:null},time:{value:0},variant:{value:0},pressure:{value:0},wound:{value:0},focus:{value:0},impact:{value:0},count:{value:2},points:{value:Array.from({length:4},()=>new T.Vector2())},gaps:{value:new T.Vector4()}},vertexShader:`
 uniform vec2 points[4];uniform float pressure,count;varying vec2 uv0;varying vec2 local;
 void main(){uv0=uv;local=position.xy;vec3 p=position;float bend=0.;for(int i=0;i<4;i++){if(float(i)>=count)break;vec2 d=local-points[i];bend+=exp(-dot(d,d)/145.);}
 p.z-=min(1.,bend)*2.0*pressure;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`
 uniform sampler2D face;uniform vec2 points[4];uniform vec4 gaps;uniform float time,variant,pressure,wound,count,focus,impact;varying vec2 uv0;varying vec2 local;
 void main(){vec4 a=texture2D(face,uv0);if(a.a<.02)discard;vec3 c=a.rgb;float shadow=0.,holes=0.,rim=0.;
 for(int i=0;i<4;i++){if(float(i)>=count)break;vec2 d=local-points[i];float gap=max(0.,gaps[i]);float distance=length(d*vec2(1.,.77));
 shadow+=exp(-dot(d,d)/pow(8.+gap*.28,2.))*(.30-gap*.003)*smoothstep(.3,.75,time)*(1.-smoothstep(1.9,2.2,time));
 holes=max(holes,(1.-smoothstep(2.0,3.8,distance))*wound);rim+=exp(-pow((distance-4.5)/1.5,2.))*wound;

 }
 // A local value pocket separates red teeth from detailed red card art.
 float pocket=exp(-pow(length(local/vec2(106.,132.)),4.));
 c*=1.-focus*pocket*.55;c*=1.-min(.35,shadow);
 c=mix(c,c*vec3(.65,.30,.38)+vec3(.045,.0,.008),focus*.45);
 float rootFlow=exp(-pow((abs(local.x)-37.-4.*sin(local.y*.05+variant))/2.2,2.));
 float rootEdge=variant<.5?${DENTAL_ROOT_EDGE.toFixed(1)}:108.;
 float edgeFlow=exp(-pow((abs(local.y)-rootEdge)/2.8,2.))*(1.-smoothstep(62.,79.,abs(local.x)));
 c+=vec3(.18,.001,.014)*max(rootFlow*.34,edgeFlow)*focus;
 c=mix(c,vec3(.055,.001,.012),holes*.78);c+=vec3(.60,.015,.05)*rim*.30;
 float seam=exp(-local.y*local.y/6.)*(1.-smoothstep(52.,93.,abs(local.x)));
 c+=vec3(.90,.30,.36)*seam*impact;
 float sheen=pow(max(0.,1.-abs(uv0.x*.5+uv0.y-(time-1.9)*2.)/.09),3.)*smoothstep(1.9,2.,time)*(1.-smoothstep(2.2,2.4,time));c+=vec3(.20,.10,.12)*sheen;
 gl_FragColor=vec4(c,a.a);
 #include <colorspace_fragment>
 }`});
 private card=new T.Mesh(new T.PlaneGeometry(223.2,323.2,64,80),this.cardMat);private body=new T.Mesh(new T.BoxGeometry(178,278,1.8,32,48,1),new T.MeshStandardMaterial({color:0x31242a,roughness:.7}));
 private contactShadow=new T.Mesh(new T.PlaneGeometry(178,278),new T.ShadowMaterial({opacity:.28,depthWrite:false}));
 private shadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});private shadow=new T.Mesh(new T.PlaneGeometry(270,370),this.shadowMat);private table=new T.Group();private groundMat=new T.MeshStandardMaterial({color:0xe7e2da,roughness:.83});private size='';
 constructor(){
 this.body.material.onBeforeCompile=shader=>{shader.uniforms.bitePressure=this.cardMat.uniforms.pressure;shader.uniforms.biteCount=this.cardMat.uniforms.count;shader.uniforms.bitePoints=this.cardMat.uniforms.points;
 shader.vertexShader='uniform float bitePressure,biteCount;uniform vec2 bitePoints[4];\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float dent=0.;for(int i=0;i<4;i++){if(float(i)>=biteCount)break;vec2 d=position.xy-bitePoints[i];dent+=exp(-dot(d,d)/145.);}transformed.z-=min(1.,dent)*2.*bitePressure;`);};
 this.ready=this.materials.ready;this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setClearColor(0,0);this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFSoftShadowMap;this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.0;
 const pmrem=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.04);this.scene.environment=this.env.texture;room.dispose();pmrem.dispose();this.scene.add(new T.HemisphereLight(0xf4e8ea,0x282235,.45));const key=new T.DirectionalLight(0xffeee5,1.45);key.position.set(-130,200,430);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-180,right:180,top:210,bottom:-210,near:1,far:1000});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0002;key.shadow.normalBias=.1;this.scene.add(key);const rim=new T.DirectionalLight(0xb8c7ed,.7);rim.position.set(170,-70,240);this.scene.add(rim);
 this.contactShadow.receiveShadow=true;this.contactShadow.renderOrder=1;this.scene.add(this.card,this.body,this.materials.group,this.shadow,this.table,this.contactShadow);const sh=document.createElement('canvas');sh.width=256;sh.height=356;const sx=sh.getContext('2d')!;sx.filter='blur(13px)';sx.fillStyle='#12070b';sx.fillRect(37,37,182,282);this.shadowMat.map=new T.CanvasTexture(sh);this.shadow.position.z=.2;
 const slab=new T.Mesh(new T.BoxGeometry(365,438,6),this.groundMat);slab.position.z=-3.5;this.table.add(slab);const border=new T.LineSegments(new T.EdgesGeometry(slab.geometry),new T.LineBasicMaterial({color:0x827978,transparent:true,opacity:.3}));border.position.z=-3.5;this.table.add(border);}
 private prepare(face:HTMLCanvasElement,id:Id,v:number,ms:number,reduced:boolean){let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.textures.set(face,tex);}const t=reduced?DURATION:ms;const h=physics(ms,reduced).height;this.materials.draw(id,v,t,h);
 const u=this.cardMat.uniforms;u.face.value=tex;u.time.value=t/1000;u.variant.value=v;u.pressure.value=this.materials.pressure;u.wound.value=this.materials.wound;u.focus.value=this.materials.focus;u.impact.value=this.materials.impact;u.count.value=this.materials.count;u.points.value=this.materials.points;u.gaps.value=this.materials.gaps;
 this.contactShadow.position.z=h+2.05;this.contactShadow.visible=t>280&&t<CONTACT;this.card.position.z=h+2;this.body.position.z=h+.9;this.shadow.scale.set(1+h*.003,1+h*.002,1);this.shadowMat.opacity=.34-h*.0025;}

 private setSize(w:number,h:number){w=Math.round(w);h=Math.round(h);const key=w+':'+h;if(this.size!==key){this.gl.setSize(w,h,false);this.size=key;}}
 draw(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,x:number,y:number,w:number,reduced=false,dark=false,top=false){if(this.disposed)return;this.prepare(face,id,v,ms,reduced);this.table.visible=false;this.groundMat.color.set(dark?0x27202a:0xe7e2da);this.setSize(552,648);this.preview.up.set(0,top?1:0,top?0:1);this.preview.position.set(top?0:180,top?0:-650,top?900:1350);this.preview.lookAt(0,0,28);this.preview.updateMatrixWorld();this.gl.render(this.scene,this.preview);c.drawImage(this.gl.domElement,x-w*230/180,y-w*270/180,w*460/180,w*540/180);}
 drawBoard(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,matrix:DOMMatrix,width:number,height:number,reduced=false){if(this.disposed)return;this.prepare(face,id,v,ms,reduced);this.table.visible=false;this.setSize(width,height);const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);this.camera.matrixWorld.identity();this.camera.matrixWorldInverse.identity();this.camera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,0,0,width,height);}
 get status(){return{disposed:this.disposed,lowerClearance:this.materials.lowerClearance,textures:this.textures.size,geometries:this.gl.info.memory.geometries,programs:this.gl.info.programs?.length,contexts:1};}
 dispose(){if(this.disposed)return;this.disposed=true;this.materials.dispose();this.textures.forEach(t=>t.dispose());this.textures.clear();this.contactShadow.geometry.dispose();this.contactShadow.material.dispose();this.card.geometry.dispose();this.cardMat.dispose();this.body.geometry.dispose();this.body.material.dispose();this.shadow.geometry.dispose();this.shadowMat.map?.dispose();this.shadowMat.dispose();this.table.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(m.material as T.Material).dispose();});this.scene.traverse(o=>{if(o instanceof T.DirectionalLight)o.shadow.dispose();});this.env.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}
