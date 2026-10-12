import * as T from 'three';
import {designs,envelope,ramp,motion} from './catalog';
const vertex=`varying vec2 vUv; varying vec3 vPos; void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;
uniform sampler2D face; uniform float charge; uniform float time; uniform vec3 accent;
varying vec2 vUv; varying vec3 vPos;
void main(){
 vec4 c=texture2D(face,vUv); if(c.a<.025)discard;
 vec3 normal=normalize(cross(dFdx(vPos),dFdy(vPos)));
 float shade=.56+.44*abs(dot(normal,normalize(vec3(-.35,.4,1.))));
 float lum=dot(c.rgb,vec3(.21,.71,.08));
 float cracks=pow(max(0.,1.-abs(sin(vUv.y*38.+sin(vUv.x*17.)*3.+vUv.x*25.))),35.);
 float moving=pow(max(0.,1.-abs(vUv.y-fract(time*.27+vUv.x*.23))*8.),4.);
 float detail=pow(abs(lum-texture2D(face,vUv+vec2(.002,0.)).r),.6);
 vec3 base=c.rgb*shade*(1.-charge*.48);
 base+=accent*charge*(cracks*.13+detail*.4+moving*.2);
 if(!gl_FrontFacing)base=mix(vec3(.055,.041,.085),accent*.36,pow(abs(normal.z),6.)) +accent*cracks*.12*charge;
 gl_FragColor=vec4(base,c.a);
 #include <colorspace_fragment>
}`;
interface Part{mesh:T.Mesh;wall:T.Mesh;edge:T.LineLoop;original:Float32Array;perimeter:number[];index:number;}
function gridPart(x0:number,y0:number,x1:number,y1:number,nx:number,ny:number,material:T.Material,index:number):Part{
 const pos:number[]=[],uv:number[]=[],indices:number[]=[],perimeter:number[]=[];
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const px=x0+(x1-x0)*x/nx,py=y0+(y1-y0)*y/ny;pos.push(px,py,0);uv.push(px+.5,py/1.5+.5);}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,d,a,d,c);}
 for(let x=0;x<=nx;x++)perimeter.push(x);
 for(let y=1;y<=ny;y++)perimeter.push(y*(nx+1)+nx);
 for(let x=nx-1;x>=0;x--)perimeter.push(ny*(nx+1)+x);
 for(let y=ny-1;y>0;y--)perimeter.push(y*(nx+1));
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const eg=new T.BufferGeometry();eg.setAttribute('position',new T.BufferAttribute(new Float32Array(perimeter.length*3),3).setUsage(T.DynamicDrawUsage));
 const edge=new T.LineLoop(eg,new T.LineBasicMaterial({color:'#e6dafa',transparent:true,opacity:0}));
 const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(perimeter.length*6),3).setUsage(T.DynamicDrawUsage));const wi:number[]=[];perimeter.forEach((_,i)=>{const a=i*2,b=((i+1)%perimeter.length)*2;wi.push(a,b,b+1,a,b+1,a+1);});wallGeo.setIndex(wi);const wall=new T.Mesh(wallGeo,new T.MeshStandardMaterial({color:'#82738f',metalness:.3,roughness:.3,side:T.DoubleSide}));return {mesh:new T.Mesh(g,material),wall,edge,original:new Float32Array(pos),perimeter,index};
}
export class Renderer {
 readonly gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-2.4,2.4,2.4,-2.4,.1,30);
 private textures=new Map<string,T.CanvasTexture>();private material:T.ShaderMaterial;private groups:T.Group[]=[];private parts:Part[][]=[];private root=new T.Group();
 private bars:T.Mesh[]=[];private cage=new T.Group();private core:T.Mesh;private glow:T.Mesh;private contact:T.Mesh;private shadow:T.Mesh;
 private disposed=false;private accent=new T.Color();
 constructor(faces:Map<string,HTMLCanvasElement>){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setPixelRatio(1);this.gl.setSize(768,768);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  this.camera.position.z=10;this.camera.updateProjectionMatrix();this.camera.projectionMatrix.elements[9]=.6/2.4;this.camera.projectionMatrix.elements[8]=.07/2.4;this.camera.projectionMatrix.elements[13]=6/2.4;this.camera.projectionMatrix.elements[12]=.7/2.4;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  for(const[id,canvas]of faces){const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(4,this.gl.capabilities.getMaxAnisotropy());this.textures.set(id,tex);}
  this.material=new T.ShaderMaterial({uniforms:{face:{value:this.textures.values().next().value},charge:{value:0},time:{value:0},accent:{value:new T.Color('#d4b4ff')}},vertexShader:vertex,fragmentShader:fragment,side:T.DoubleSide,transparent:true,depthWrite:true});
  const specs=[[[ -.5,-.75,0,.75,14,38],[0,-.75,.5,.75,14,38]],
   [[-.5,-.75,0,0,12,18],[0,-.75,.5,0,12,18],[-.5,0,0,.75,12,18],[0,0,.5,.75,12,18]],
   Array.from({length:9},(_,i)=>[-.5,-.75+i/6,.5,-.75+(i+1)/6,24,3]),
   [[-.5,-.75,.5,.75,24,36]]];
  for(const spec of specs){const group=new T.Group(),parts=spec.map((s,i)=>gridPart(s[0],s[1],s[2],s[3],s[4],s[5],this.material,i));for(const p of parts)group.add(p.wall,p.mesh,p.edge);this.groups.push(group);this.parts.push(parts);this.root.add(group);}
  this.scene.add(this.root);
  const noiseShader=`precision highp float;varying vec2 vUv;uniform float time;uniform float open;uniform vec3 accent;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec2 p=(vUv-.5)*2.;float shape=max(abs(p.x),abs(p.y));float inner=pow(1.-shape,2.);float n=noise(p*5.+vec2(time*.14,-time*.21));float fil=pow(abs(sin((p.x*5.+p.y*2.+n*3.-time*.5))),22.);float edge=pow(shape,22.);float fine=pow(abs(sin(p.x*24.+n*6.+p.y*8.)),45.);vec3 c=vec3(.016,.009,.038)+accent*(fil*.10+fine*.07+edge*.62)*open;gl_FragColor=vec4(c,smoothstep(1.,.94,shape));}`;
  this.core=new T.Mesh(new T.PlaneGeometry(1,1.5,24,36),new T.ShaderMaterial({uniforms:{time:{value:0},open:{value:0},accent:{value:this.accent}},vertexShader:vertex,fragmentShader:noiseShader,transparent:true,side:T.DoubleSide}));this.core.position.z=-.04;this.root.add(this.core);
  const radial=document.createElement('canvas');radial.width=radial.height=128;const cx=radial.getContext('2d')!,gr=cx.createRadialGradient(64,64,1,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.35,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,128,128);const map=new T.CanvasTexture(radial);
  const plane=(color:string)=>new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,color,transparent:true,depthWrite:false}));
  this.glow=plane('#a075ce');this.glow.position.z=-.08;this.root.add(this.glow);
  this.shadow=plane('#0c0415');this.shadow.position.z=-.09;this.scene.add(this.shadow);
  this.contact=plane('#d5b5fa');this.contact.position.z=-.06;this.scene.add(this.contact);
  const metal=new T.MeshStandardMaterial({color:'#a896b9',metalness:.28,roughness:.25});
  const barGeometry=new T.BoxGeometry(1,1,1);for(let i=0;i<32;i++){const bar=new T.Mesh(barGeometry,metal);this.bars.push(bar);this.cage.add(bar);}this.root.add(this.cage);
  this.scene.add(new T.AmbientLight('#cab4e3',2.5));const key=new T.DirectionalLight('#fff1cf',4);key.position.set(-2,3,4);this.scene.add(key);const rim=new T.DirectionalLight('#9c65f6',3);rim.position.set(3,-2,1);this.scene.add(rim);
 }
 private bar(i:number,a:T.Vector3,b:T.Vector3,width:number){const bar=this.bars[i],diff=b.clone().sub(a);bar.position.copy(a).add(b).multiplyScalar(.5);bar.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.clone().normalize());bar.scale.set(width,diff.length(),width);bar.visible=diff.length()>.002;}
 private poseCage(t:number,jailer:boolean){
  const grow=envelope(t,360,1110,1510,2180),burst=jailer?0:envelope(t,1030,1460,1580,2180);let i=0;
  const corners=[[-.5,-.75],[.5,-.75],[.5,.75],[-.5,.75]];
  const height=grow*(jailer?.88:.97);
  const top=corners.map(([x,y],k)=>new T.Vector3(x*(1+burst*.5),y*(1+burst*.24),height*(1-burst*.28)+Math.sin(k*2.1)*burst*.12));
  corners.forEach(([x,y],k)=>{this.bar(i++,new T.Vector3(x,y,0),top[k],.025);this.bar(i++,top[k],top[(k+1)%4],.028);});
  for(let side=0;side<2;side++)for(let j=1;j<5;j++){
   const y=-.75+j*.3,x=side? .5:-.5;this.bar(i++,new T.Vector3(x,y,0),new T.Vector3(x*(1+burst*.5),y*(1+burst*.24),height),.012);
  }
  for(let j=0;j<4;j++){
   const x=-.36+j*.24,slide=(1-ramp(t,790+j*55,1300+j*30))*grow;
   this.bar(i++,new T.Vector3(x,-.75,height),new T.Vector3(x,.75-slide*1.45,height-burst*.35),.016);
  }
  // Four locks grow out of the frame; no floating ornaments.
  corners.forEach(([x,y],k)=>{this.bar(i++,new T.Vector3(x,y,0),new T.Vector3(x*(1+grow*.09),y*(1+grow*.07),grow*.065),.07);void k;});
  while(i<this.bars.length)this.bars[i++].visible=false;
 }
 render(canvas:HTMLCanvasElement,id:string,v:number,ms:number,options:{reduced?:boolean;board?:boolean;pass?:'card'|'ground';size?:number}={}){
  if(this.disposed)return;const jailer=id==='GM6_1',reduced=!!options.reduced,d=designs[v],state=motion(v,ms,reduced),t=reduced?DUMMY:ms;
  this.accent.set(jailer?'#aaa1ff':'#e6a3d5');this.material.uniforms.face.value=this.textures.get(id);this.material.uniforms.accent.value.copy(this.accent);this.material.uniforms.time.value=t/1000;
  const charge=reduced?0:envelope(t,90,420,1700,d.duration-120);this.material.uniforms.charge.value=charge;
  this.root.position.set(0,0,options.board?0:state.lift);this.root.rotation.z=0;
  this.groups.forEach((g,i)=>g.visible=i===v);
  const open=reduced?0:envelope(t,340,920,1190,1760);
  const tension=jailer?open:open*(1+.075*Math.sin(t*.012));
  for(const part of this.parts[v]){
   const arr=part.mesh.geometry.getAttribute('position') as T.BufferAttribute;
   for(let n=0;n<arr.count;n++){
    const x=part.original[n*3],y=part.original[n*3+1];let px=x,py=y,z=.012;
    if(v===0){const side=part.index===0?-1:1,edge=1-Math.abs(x)*2,curve=Math.sin(edge*Math.PI*.55);
     px=x+side*tension*(.25+curve*.3)*(jailer?.8:1);py=y+Math.sin(y*4.1+t*.002)*tension*.045*edge;
     z+=tension*curve*.45+Math.sin(y*6+edge*3)*tension*.028;
    }else if(v===1){
     const ix=part.index%2,iy=Math.floor(part.index/2),sx=ix?1:-1,sy=iy?1:-1;
     const fold=envelope(t,250+part.index*(jailer?90:35),850+part.index*40,1130+part.index*65,1810+part.index*25);
     const angle=fold*1.04,ax=Math.abs(x),ay=Math.abs(y);
     px=sx*ax*Math.cos(angle);py=sy*ay*Math.cos(angle*.92);z+=ax*Math.sin(angle)+ay*Math.sin(angle*.92);
     this.root.rotation.z=jailer?-.13*open:.34*open;
    }else if(v===2){
     const k=part.index,delay=(jailer?8-k:k)*57,split=envelope(t,230+delay,820+delay*.35,1310+delay*.45,1780+delay*.35);
     const direction=jailer?1:Math.sin(k*1.64+.35),theta=split*(jailer?.2:.65)*Math.cos(k*.71);
     px=x*Math.cos(theta)+direction*split*.43;z+=.26*split+x*Math.sin(theta)+(k/8)*split*.3;
     py=y+(k-4)*split*.027;
    }else{
     z+=.05*open*(1-(x*x+y*y)*.6);px+=Math.sin(y*9+t*.002)*open*.009;
    }
    arr.setXYZ(n,px,py,z);
   }
   arr.needsUpdate=true;part.mesh.geometry.computeBoundingSphere();
   const edge=part.edge.geometry.getAttribute('position') as T.BufferAttribute;part.perimeter.forEach((p,i)=>edge.setXYZ(i,arr.getX(p),arr.getY(p),arr.getZ(p)+.003));edge.needsUpdate=true;part.edge.geometry.computeBoundingSphere();
   const wp=part.wall.geometry.getAttribute('position') as T.BufferAttribute;part.perimeter.forEach((p,i)=>{wp.setXYZ(i*2,arr.getX(p),arr.getY(p),arr.getZ(p)-.018);wp.setXYZ(i*2+1,arr.getX(p),arr.getY(p),arr.getZ(p));});wp.needsUpdate=true;part.wall.geometry.computeVertexNormals();part.wall.geometry.computeBoundingSphere();
   const em=part.edge.material as T.LineBasicMaterial;em.color.copy(this.accent).lerp(new T.Color('#fff6e5'),.5);em.opacity=charge*(v===2?.62:.9);
  }
  const coreMat=this.core.material as T.ShaderMaterial;coreMat.uniforms.time.value=t/1000;coreMat.uniforms.open.value=open;
  this.core.visible=open>.002&&v===0;this.core.scale.set(open*1.05,1,1);this.core.position.z=.012;const cp=this.core.geometry.getAttribute('position') as T.BufferAttribute;for(let k=0;k<cp.count;k++){const uv=this.core.geometry.getAttribute('uv'),u=uv.getX(k),y=(uv.getY(k)-.5)*1.5;cp.setXYZ(k,(u-.5)*(1-.14*Math.cos(y*3.1)),y,open*.2*(1-Math.abs(u-.5)*2));}cp.needsUpdate=true;this.core.geometry.computeBoundingSphere();
  this.cage.visible=v===3&&!reduced&&t>240&&t<2180; if(this.cage.visible)this.poseCage(t,jailer);
  this.glow.scale.set(1.8+open*.3,2.3+open*.2,1);(this.glow.material as T.MeshBasicMaterial).opacity=charge*.43;
  this.shadow.scale.set(1.55+state.lift,2.15+state.lift,1);(this.shadow.material as T.MeshBasicMaterial).opacity=.32-state.lift*.3;
  this.contact.scale.set(1.5+state.contact*.7,1.95+state.contact*.6,1);(this.contact.material as T.MeshBasicMaterial).opacity=state.contact*.62;
  this.root.visible=options.pass!=='ground';this.shadow.visible=options.pass!=='card';this.contact.visible=options.pass!=='card';
  this.gl.render(this.scene,this.camera);
  const c=canvas.getContext('2d')!;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(this.gl.domElement,0,0,canvas.width,canvas.height);canvas.dataset.debug=JSON.stringify({calls:this.gl.info.render.calls,triangles:this.gl.info.render.triangles});
 }
 get resources(){return {...this.gl.info.memory};}
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);const map=(m as T.MeshBasicMaterial).map;if(map)ts.add(map);}}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());this.textures.forEach(t=>t.dispose());this.gl.dispose();this.gl.forceContextLoss();}
}
const DUMMY=4000;
