import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {DURATION,phase,ease,timing,type Options,type Layout} from './catalog';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const NX=10,NY=14;
type Sheet={mesh:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>;back:T.Mesh;reveal:{value:number}};
/** Adopted 05: page hinge, curved stock and board-parallel arrival. */
export class InfinityRenderer {
 renderer:T.WebGLRenderer;scene=new T.Scene();world=new T.Group();effect=new T.Group();camera=new T.PerspectiveCamera();environment:T.WebGLRenderTarget;
 floor:T.Mesh;shadow:T.Mesh;source=new T.Group();rift=new T.Group();sheets:Sheet[]=[];key:T.DirectionalLight;light:T.PointLight;
 faces=new Map<string,T.CanvasTexture>();geometries=new Set<T.BufferGeometry>();materials=new Set<T.Material>();sourceFace:T.MeshStandardMaterial;floorMat:T.MeshBasicMaterial;ink:T.MeshPhysicalMaterial;
 dead=false;size='';unit=1;sourcePos=V();riftPos=V();
 constructor(faces:Map<string,HTMLCanvasElement>){
 this.renderer=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
 const pm=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pm.fromScene(room,.05);room.dispose();pm.dispose();this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.6;
 faces.forEach((face,id)=>{const tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.faces.set(id,tex);});
 this.scene.add(this.world);this.world.add(this.effect);
 this.key=new T.DirectionalLight(0xffe8d2,2.5);this.key.position.set(-4,9,5);this.key.castShadow=true;this.key.shadow.mapSize.set(512,512);this.key.shadow.bias=-.0004;
 const rim=new T.DirectionalLight(0xb6a2ef,1.3);rim.position.set(5,3,-5);this.light=new T.PointLight(0xb895ff,0,7,2);this.scene.add(this.key,this.key.target,rim,new T.HemisphereLight(0xf1eaf9,0x3a2e42,.9),this.light);
 this.floorMat=this.mat(new T.MeshBasicMaterial({color:0x24232a}));this.floor=this.mesh(new T.PlaneGeometry(200,200),this.floorMat,this.world);this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.08;
 this.shadow=this.mesh(new T.PlaneGeometry(200,200),this.mat(new T.ShadowMaterial({opacity:.28})),this.world);this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=-.07;
 this.ink=this.mat(new T.MeshPhysicalMaterial({color:0x28182e,metalness:.28,roughness:.36,clearcoat:.65,side:T.DoubleSide}));
 this.mesh(new T.BoxGeometry(1.05,.04,1.63),this.ink,this.source);
 this.sourceFace=this.mat(new T.MeshStandardMaterial({map:this.faces.get('BLACK_INFINITY'),roughness:.62,metalness:0,emissive:0x705491,emissiveIntensity:0}));const face=this.mesh(new T.PlaneGeometry(1.05,1.63),this.sourceFace,this.source);face.rotation.x=-Math.PI/2;face.position.y=.026;this.world.add(this.source);
 const brass=this.mat(new T.MeshStandardMaterial({color:0xa99aab,metalness:.65,roughness:.35}));const hole=this.mesh(new T.CylinderGeometry(.72,.65,.085,48),this.mat(new T.MeshStandardMaterial({color:0x09050f,roughness:.38})),this.rift);hole.scale.z=.58;const lip=this.mesh(new T.TorusGeometry(.70,.022,8,64),brass,this.rift);lip.rotation.x=Math.PI/2;lip.scale.y=.58;lip.position.y=.035;this.world.add(this.rift);
 for(let i=0;i<24;i++){
 const reveal={value:0};const mat=this.mat(new T.MeshPhysicalMaterial({color:0xffffff,map:this.faces.get('BLACK_INFINITY'),metalness:.04,roughness:.53,clearcoat:.3,clearcoatRoughness:.35,side:T.DoubleSide}));
 mat.onBeforeCompile=s=>{Object.assign(s.uniforms,{uReveal:reveal,uCull:{value:this.faces.get('STARTER_TRASH')}});s.fragmentShader='uniform float uReveal; uniform sampler2D uCull;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 src=texture2D(map,vMapUv);vec4 dst=texture2D(uCull,vMapUv);float reveal=smoothstep(vMapUv.y*.45,vMapUv.y*.45+.55,uReveal);diffuseColor*=mix(src,dst,reveal);`);};
 const g=new T.PlaneGeometry(1,1,NX,NY);(g.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);const mesh=this.mesh(g,mat);mesh.frustumCulled=false;const back=this.mesh(g.clone(),this.ink);back.frustumCulled=false;this.sheets.push({mesh,back,reveal});
 }

 }
 mat<M extends T.Material>(m:M){this.materials.add(m);return m;}
 mesh<M extends T.Material>(g:T.BufferGeometry,m:M,parent:T.Object3D=this.effect){this.geometries.add(g);const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=false;parent.add(mesh);return mesh;}
 project(x:number,y:number,w:number,h:number){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/w*2-1,1-y/h*2),this.camera);const out=V();ray.ray.intersectPlane(new T.Plane(V(0,1,0),0),out);return out;}
 setup(w:number,h:number,layout?:Layout){
 if(this.size!==`${w}:${h}`){this.renderer.setSize(w,h,false);this.size=`${w}:${h}`;}
 if(layout){const a=18*Math.PI/180,f=h*2.2;this.camera.fov=2*Math.atan(h/(2*f))*180/Math.PI;this.camera.aspect=w/h;this.camera.near=.1;this.camera.far=f*5;this.camera.position.set(0,f*Math.cos(a),f*Math.sin(a));this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();const p=(pt:{x:number;y:number})=>this.project(pt.x*w/layout.width,pt.y*h/layout.height,w,h);this.sourcePos.copy(p(layout.source));this.riftPos.copy(p(layout.rift));this.unit=Math.max(12,(layout.source.w??30)*w/layout.width/1.05);this.sourcePos.y=.035*this.unit;
 }else{this.unit=1;this.camera.fov=33;this.camera.aspect=w/h;this.camera.near=.1;this.camera.far=100;this.camera.position.set(0,7.7,7.7);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.sourcePos.set(-2.45,.05,.1);this.riftPos.set(2.6,0,.1);}
 }
 deform(sheet:Sheet,fn:(u:number,v:number)=>T.Vector3){const g=sheet.mesh.geometry,p=g.getAttribute('position') as T.BufferAttribute,b=sheet.back.geometry.getAttribute('position') as T.BufferAttribute;for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){const k=y*(NX+1)+x,pt=fn(x/NX,y/NY);p.setXYZ(k,pt.x,pt.y,pt.z);}p.needsUpdate=true;g.computeVertexNormals();const norm=g.getAttribute('normal');for(let k=0;k<p.count;k++)b.setXYZ(k,p.getX(k)-norm.getX(k)*.018*this.unit,p.getY(k)-norm.getY(k)*.018*this.unit,p.getZ(k)-norm.getZ(k)*.018*this.unit);b.needsUpdate=true;sheet.back.geometry.computeVertexNormals();}
 draw(canvas:HTMLCanvasElement,o:Options,layout?:Layout,append=false){if(this.dead)return;const w=canvas.width,h=canvas.height;if(!w||!h)return;this.setup(w,h,layout);const ctx=canvas.getContext('2d')!;if(!append)ctx.clearRect(0,0,w,h);const overlay=!!layout,t=o.ms,n=Math.max(0,Math.min(24,Math.trunc(o.amount))),active=t>0&&t<DURATION&&n>0,unit=this.unit;
 this.floor.visible=!overlay;this.shadow.visible=active&&!o.reduced;this.shadow.receiveShadow=true;this.shadow.scale.setScalar(unit);this.world.rotation.y=!overlay&&o.side?Math.PI:0;this.floorMat.color.setHex(o.dark?0x25212e:0xc9c3b9);this.renderer.setClearColor(o.dark?0x101018:0xddd8ce,overlay?0:1);
 // The source is the real enchantment surface, sampled from its board location.
 const cue=Math.sin(phase(t,0,900)*Math.PI)*(active?1:0);this.source.position.copy(this.sourcePos);this.source.scale.setScalar(unit);this.source.visible=!overlay||(active&&t<900);this.sourceFace.emissiveIntensity=cue*.48;
 this.rift.position.copy(this.riftPos);this.rift.scale.setScalar(unit);this.rift.visible=!overlay;
 this.key.position.set(-4*unit,9*unit,5*unit);Object.assign(this.key.shadow.camera,{left:-12*unit,right:12*unit,top:12*unit,bottom:-12*unit,near:.1,far:40*unit});this.key.shadow.camera.updateProjectionMatrix();this.key.shadow.normalBias=.025*unit;this.light.position.copy(this.sourcePos).add(V(0,unit*1.0,0));this.light.distance=5*unit;this.light.intensity=cue*2*unit*unit;this.effect.visible=active;
 for(let i=0;i<24;i++){
 const s=this.sheets[i];s.mesh.visible=s.back.visible=false;if(i>=n||!active)continue;const ti=timing(i,n);if(t<ti.form||t>=ti.arrive)continue;
 s.mesh.visible=s.back.visible=true;const f=ease(phase(t,ti.form,ti.depart)),p=ease(phase(t,ti.depart,ti.arrive)),landing=ease(phase(p,.88,1)),cw=.87*unit,ch=1.35*unit;
 s.reveal.value=phase(t,ti.form,ti.form+320);
 if(o.reduced){s.reveal.value=1;const show=t>=ti.arrive-220;s.mesh.visible=s.back.visible=show;if(show)this.deform(s,(u,v)=>V(this.riftPos.x+(u-.5)*cw,this.riftPos.y+.07*unit,this.riftPos.z+(v-.5)*ch));continue;}
 const from=this.sourcePos,rf=this.riftPos;const dir=rf.clone().sub(from);dir.y=0;dir.normalize();
 this.deform(s,(u,v)=>{
 const x=(u-.5)*cw,z=(v-.5)*ch;let pos=from.clone(),px=x,pz=z,y=.06*unit,turn=0,bend=0;
 const hinge=Math.PI*Math.sin(f*Math.PI/2)*(1-p);pos.lerp(rf,p);px=(u-.5)*cw*Math.cos(hinge);y+=Math.sin(hinge)*(u)*cw+Math.sin(p*Math.PI)*.32*unit;pos.addScaledVector(dir,.36*unit*f*(1-p));bend=Math.sin(u*Math.PI)*.23*unit*Math.sin(hinge);turn=-.12*Math.sin(p*Math.PI);
 const shrink=1-landing,cos=Math.cos(turn),sin=Math.sin(turn);return V(pos.x+(px*cos-pz*sin)*shrink,pos.y+(y+bend)*shrink,pos.z+(pz*cos+px*sin)*shrink);
 });
 }
 // No overlay remnants at time zero, zero count, or completion.
 if(overlay&&!active)return;
 this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,w,h);
 if(!overlay){const label=(pos:T.Vector3,text:string)=>{const pt=pos.clone().applyMatrix4(this.world.matrixWorld).project(this.camera);ctx.fillStyle=o.dark?'#c7b5d1':'#483b51';ctx.font=`${Math.max(10,w/48)}px sans-serif`;ctx.textAlign='center';ctx.fillText(text,(pt.x+1)*w/2,(1-pt.y)*h/2);};label(this.sourcePos.clone().add(V(0,0,1.18)),'INFINITY');let count=0;for(let i=0;i<n;i++)if(t>=timing(i,n).arrive)count++;label(this.riftPos.clone().add(V(0,0,.9)),`RIFT ${7+count}`);}
 }
 dispose(){if(this.dead)return;this.dead=true;this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.faces.forEach(t=>t.dispose());this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
 get stats(){return {geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,programs:this.renderer.info.programs?.length,disposed:this.dead};}
}
