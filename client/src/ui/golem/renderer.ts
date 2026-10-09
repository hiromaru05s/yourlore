import * as T from 'three';
import {DURATION,designs,ease,weight} from './catalog';import type {Id} from './catalog';
import {cells,rock,mineralTexture,noise} from './mineral';
const H=1.5625;
type Stone={mesh:T.Mesh;home:T.Vector3;index:number;birth:{value:number};decay:{value:number};core:{value:number}};
type Rig={scene:T.Scene;body:T.Group;face:T.Mesh;faceMat:T.MeshBasicMaterial;pieces:Stone[];table:T.Group;shadow:T.Mesh;key:T.DirectionalLight;v:number};
/** Shared context, preallocated geometry; physical shadows land on both card and tabletop. */
export class GolemRenderer{
 readonly renderer:T.WebGLRenderer;private rigs:Rig[]=[];private textures=new Map<Id,T.CanvasTexture>();private geometries:T.BufferGeometry[]=[];private materials:T.Material[]=[];private maps:T.Texture[]=[];
 private camera=new T.OrthographicCamera(-1.5,1.5,1, -1,.01,30);private boardCamera=new T.Camera();private current:Id='GOLEM3';private stoneMap:T.Texture;private heightMap:T.Texture;
 constructor(id:Id='GOLEM3'){this.current=id;this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.stoneMap=mineralTexture('color');this.heightMap=mineralTexture('height');this.maps.push(this.stoneMap,this.heightMap);this.rigs.push(this.make(0));}
 private mat<M extends T.Material>(m:M):M{this.materials.push(m);return m;}
 private geo<G extends T.BufferGeometry>(g:G):G{this.geometries.push(g);return g;}
 private make(v:number):Rig{
  const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff9ec','#727774',1.85));const key=new T.DirectionalLight('#fff3dc',2.6);key.position.set(-2.5,1.5,5);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-1.8,right:1.8,top:2,bottom:-2,near:.1,far:12});key.shadow.bias=-.00015;key.shadow.normalBias=.006;key.shadow.radius=3;scene.add(key);const fill=new T.DirectionalLight('#c5dfec',.75);fill.position.set(2,-2,3);scene.add(fill);
  const table=new T.Group();scene.add(table);const slab=new T.Mesh(this.geo(new T.BoxGeometry(2.92,3.18,.05)),this.mat(new T.MeshStandardMaterial({color:'#e6e6df',roughness:.97})));slab.position.z=-.041;slab.receiveShadow=true;table.add(slab);
  const lines=new T.LineSegments(this.geo(new T.BufferGeometry().setFromPoints([new T.Vector3(-1.45,.99,-.014),new T.Vector3(1.45,.99,-.014),new T.Vector3(-.98,-1.58,-.014),new T.Vector3(-.98,1.58,-.014)])),this.mat(new T.LineBasicMaterial({color:'#c7ccc5',transparent:true,opacity:.32})));table.add(lines);
  const body=new T.Group();scene.add(body);const thickness=new T.Mesh(this.geo(new T.BoxGeometry(.993,H-.009,.018)),this.mat(new T.MeshStandardMaterial({color:'#655b43',roughness:.65})));thickness.position.z=.002;thickness.castShadow=true;body.add(thickness);
  const faceMat=this.mat(new T.MeshBasicMaterial({transparent:true,toneMapped:false}));const face=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),faceMat);face.position.z=.013;body.add(face);
  const catcher=new T.Mesh(this.geo(new T.PlaneGeometry(1,H)),this.mat(new T.ShadowMaterial({opacity:.4,depthWrite:false})));catcher.position.z=.014;catcher.receiveShadow=true;body.add(catcher);
  const shadow=new T.Mesh(this.geo(new T.PlaneGeometry(3.4,3.8)),this.mat(new T.ShadowMaterial({opacity:.22,depthWrite:false})));shadow.position.z=-.012;shadow.receiveShadow=true;scene.add(shadow);
  const pieces:Stone[]=[];
  cells(v).forEach((polygon,i)=>{const {g,cx,cy}=rock(polygon,i,v);this.geo(g);const birth={value:0},decay={value:0},core={value:0};
   const material=this.mat(new T.MeshStandardMaterial({map:this.stoneMap,bumpMap:this.heightMap,bumpScale:.020,roughness:.9,metalness:.025,vertexColors:true,color:v===3?'#d1dcdb':v===1?'#d7d0bc':'#e8e3d6'}));
   // The crust grows from the card's perimeter, and weathers along the same mineral grain.
   const patch=(shader:any,depth=false)=>{shader.uniforms.birth=birth;shader.uniforms.decay=decay;shader.uniforms.core=core;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 stoneUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nstoneUV=uv;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec2 stoneUV;uniform float birth,decay,core;
    float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float veins(vec2 p){vec2 q=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grain(q),grain(q+vec2(1,0)),f.x),mix(grain(q+vec2(0,1)),grain(q+vec2(1)),f.x),f.y);}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    float grit=veins(stoneUV*54.)*.6+veins(stoneUV*139.)*.4;
    float edge=min(min(stoneUV.x,1.-stoneUV.x),min(stoneUV.y,1.-stoneUV.y));
    if(edge+grit*.06>birth*.65 || grit<decay)discard;`);
    if(!depth)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     float channel=pow(max(0.,1.-abs(stoneUV.x-.5-sin(stoneUV.y*15.)*.07)*40.),3.);
     totalEmissiveRadiance+=vec3(.05,.5,.56)*channel*core*.45;`);
   };
   material.onBeforeCompile=s=>patch(s);const depth=this.mat(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));depth.onBeforeCompile=s=>patch(s,true);
   const mesh=new T.Mesh(g,material);mesh.customDepthMaterial=depth;mesh.castShadow=true;mesh.receiveShadow=true;mesh.position.set(cx,cy,.025);scene.add(mesh);pieces.push({mesh,home:mesh.position.clone(),index:i,birth,decay,core});
  });
  return {scene,body,face,faceMat,pieces,table,shadow,key,v};
 }
 setFace(id:Id,canvas:HTMLCanvasElement){if(!this.textures.has(id)){const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;this.textures.set(id,texture);}this.current=id;for(const r of this.rigs){r.faceMat.map=this.textures.get(id)!;r.faceMat.needsUpdate=true;}}
 private update(v:number,t:number,reduced:boolean){const r=this.rigs[v],hit=designs[v].hit,mass=weight(this.current);if(reduced)t=DURATION;
  const fall=ease(550,hit,t);const height=(.31+.065*mass)*(1-fall*fall);const rebound=t>=hit?.009*Math.sin(ease(hit,hit+170,t)*Math.PI):0;
  r.body.visible=v!==0||t>=620;r.body.position.z=height+rebound;r.body.rotation.set(0,0,0);
  for(const p of r.pieces){const {mesh:m,index:i,home}=p;const x=home.x,y=home.y;const dir=new T.Vector2(x,y*.74).normalize();const seed=noise(i+v*20);let release=0,dx=0,dy=0,dz=0,rx=0,ry=0,rz=0;
   if(v===0){release=ease(620+seed*130,1530+seed*100,t);dx=dir.x*(.30+seed*.11)*release;dy=dir.y*.30*release;dz=Math.sin(release*Math.PI)*.10;rx=dir.y*release*.65;ry=-dir.x*release*.85;rz=(seed-.5)*release*.42;}
   if(v===1){release=ease(500+i*85,1210+i*85,t);dy=(i<3?-1:1)*release*.055;dx=(i%2?1:-1)*.94*release;dz=Math.sin(release*Math.PI)*(.13+seed*.07);ry=(i%2?-1:1)*release*2.94;rz=(seed-.5)*release*.22;}
   if(v===2){release=ease(560+Math.abs(y)*340,1480+Math.abs(y)*230,t);dx=dir.x*release*.42;dy=dir.y*release*.45;dz=Math.sin(release*Math.PI)*(.20+seed*.14);rx=dir.y*release*1.45;ry=-dir.x*release*1.4;rz=(seed-.5)*release*.7;}
   if(v===3){const center=Math.hypot(x,y)<.25;release=ease(center?1050:550+seed*160,center?1800:1430+seed*180,t);dx=dir.x*release*(center?.59:.26);dy=dir.y*release*.28;dz=Math.sin(release*Math.PI)*(center?.24:.08);rx=dir.y*release*.48;ry=-dir.x*release*.6;rz=(center?.48:seed*.25)*release;}
   if(v===4){release=ease(610+Math.abs(y)*250,1610+Math.abs(y)*150,t);dx=Math.sign(x)*.61*release;dy=Math.sign(y)*.08*release;dz=Math.sin(release*Math.PI)*.08;ry=-Math.sign(x)*release*3.08;rz=Math.sign(x)*Math.sign(y)*release*.12;}
   if(v===5){release=ease(390+(y+.8)*360,1060+(y+.8)*390,t);dx=dir.x*release*.37;dy=-release*(.43+seed*.12);dz=Math.sin(release*Math.PI)*.035;rx=release*(seed-.5)*.65;ry=release*(seed-.5)*.45;rz=release*(seed-.5)*.5;}
   // Release joins the tabletop with a damped contact response, never uniform scale-to-zero.
   const grounded=ease(.55,1,release);const settle=.008*Math.sin(release*22+seed)*Math.sin(release*Math.PI);m.position.set(x+dx,y+dy,.025+height*(1-grounded)+dz+Math.max(0,settle));m.rotation.set(rx,ry,rz);
   // Keep the lowest transformed vertex on the table as each shard tips over.
   m.updateMatrix();const positions=m.geometry.getAttribute('position');let bottom=Infinity;const e=m.matrix.elements;for(let j=0;j<positions.count;j++)bottom=Math.min(bottom,e[2]*positions.getX(j)+e[6]*positions.getY(j)+e[10]*positions.getZ(j));m.position.z=Math.max(m.position.z,-bottom+.005);
   p.birth.value=v===0?1:ease(30,430,t);p.decay.value=ease(2050+seed*230,2940+seed*220,t);p.core.value=ease(320,630,t)*(1-ease(1100,1530,t))*(v===3?2:this.current==='M10'?1:.25);
   m.visible=t<DURATION&&p.birth.value>0&&p.decay.value<.999;
  }
  if(t>=DURATION||reduced){r.body.position.z=0;r.pieces.forEach(p=>p.mesh.visible=false);}
  return r;
 }
 draw(canvas:HTMLCanvasElement,v:number,t:number,reduced=false){const w=canvas.width,h=canvas.height;if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);const r=this.update(v,t,reduced);r.table.visible=true;r.shadow.visible=false;const aspect=w/h;this.camera.left=-1.08*aspect;this.camera.right=1.08*aspect;this.camera.top=1.08;this.camera.bottom=-1.08;this.camera.position.set(.38,-3.65,3.9);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.04);this.camera.updateProjectionMatrix();this.renderer.render(r.scene,this.camera);const c=canvas.getContext('2d')!;c.clearRect(0,0,w,h);c.drawImage(this.renderer.domElement,0,0);}
 drawBoard(canvas:HTMLCanvasElement,v:number,t:number,matrix:DOMMatrix,reduced=false){const w=innerWidth,h=innerHeight;if(this.renderer.domElement.width!==canvas.width||this.renderer.domElement.height!==canvas.height)this.renderer.setSize(canvas.width,canvas.height,false);const ndc=new T.Matrix4().set(2/w,0,0,-1,0,-2/h,0,1,0,0,-.0001,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(ndc.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();const r=this.update(v,t,reduced);r.table.visible=false;r.shadow.visible=true;this.renderer.render(r.scene,this.boardCamera);canvas.getContext('2d')!.drawImage(this.renderer.domElement,0,0);}
 get stats(){return {contexts:1,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls};}
 dispose(){this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.maps.forEach(t=>t.dispose());this.textures.forEach(t=>t.dispose());this.textures.clear();for(const r of this.rigs)r.key.shadow.map?.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
