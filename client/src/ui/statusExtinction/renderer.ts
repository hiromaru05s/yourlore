import * as T from 'three';
import {art,clamp,smooth,studies,type Family,type Study} from './catalog';

const V=`varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const F=`precision highp float;
uniform sampler2D face;uniform float t;uniform float mode;uniform float back;uniform vec3 tint;
varying vec2 vUv;varying vec3 vPos;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.6+noise(p*2.07)*.28+noise(p*4.19)*.12;}
void main(){
 vec2 p=vUv*2.-1.;float warm=smoothstep(0.,.17,t)*(1.-smoothstep(.78,1.,t));
 float liquid=step(3.5,mode)*(1.-step(8.5,mode));
 vec2 uv=vUv+liquid*warm*.005*vec2(sin(p.y*13.-t*17.),cos(p.x*11.+t*12.));
 vec4 tex=texture2D(face,uv);if(t==0.)tex=texture2D(face,vUv);
 if(tex.a<.004)discard;
 float field=fbm(vUv*15.);float cut=-1.;float width=.038;
 if(mode<.5){cut=smoothstep(.53,.99,t)*1.25-.14;}
 else if(mode<1.5){field=abs(p.x)*.45+field*.55;cut=smoothstep(.61,.97,t)*1.25-.15;}
 else if(mode<2.5){field=vUv.x*.62+field*.38;cut=smoothstep(.66,.99,t)*1.3-.16;}
 else if(mode<3.5){field=length(p*vec2(1.05,.95))*.70+field*.10;cut=smoothstep(.15,.99,t)*.94-.08;width=.018;}
 else if(mode<4.5){field=vUv.y*.7+field*.3;cut=smoothstep(.44,.99,t)*1.3-.16;}
 else if(mode<5.5){field=length(p-vec2(-.14,-.06))*.67+sin(atan(p.y,p.x)*7.+t*5.)*.055+field*.14;cut=smoothstep(.13,.99,t)*1.06-.10;width=.014;}
 else if(mode<6.5){field=abs(p.y)*.7+field*.3;cut=smoothstep(.58,.98,t)*1.3-.12;}
 else if(mode<7.5){field=(1.-vUv.y)*.7+field*.3;cut=smoothstep(.12,.99,t)*1.3-.17;}
 else if(mode<8.5){field=vUv.y*.55+field*.45;cut=smoothstep(.43,.99,t)*1.3-.17;}
 else if(mode<9.5){field=vUv.x*.30+vUv.y*.45+field*.25;cut=smoothstep(.06,.97,t)*1.3-.15;width=.023;}
 else if(mode<10.5){field=(1.-length(p)*.7)*.65+field*.35;cut=smoothstep(.43,.99,t)*1.3-.18;}
 else{cut=smoothstep(.48,.99,t)*1.3-.18;}
 float remain=smoothstep(cut-width,cut+width,field);
 if(mode>9.5&&mode<10.5){float spiral=fract(length(p)*3.6+atan(p.y,p.x)/6.28318);float slit=smoothstep(.20,.81,t)*.83;remain*=smoothstep(slit,slit+.025,spiral);}
float edge=(1.-smoothstep(width,width*3.5,abs(field-cut)))*warm;
 vec3 normal=normalize(cross(dFdx(vPos),dFdy(vPos)));if(!gl_FrontFacing)normal=-normal;
 vec3 light=normalize(vec3(-.5,.8,1.8));float diffuse=abs(dot(normal,light));
 float gloss=pow(max(0.,dot(reflect(-light,normal),vec3(0.,0.,1.))),34.);
 float relief=fbm(vUv*vec2(38.,11.)+vec2(t*.35,-t*.7));
 vec3 col=tex.rgb*(1.+warm*((diffuse-.82)*.43+(relief-.5)*.085));
 if(!gl_FrontFacing)col=mix(col,col*.29+tint*.13,warm*.9);
 float sweep=exp(-pow((p.x*.62+p.y*.38-(t*4.-1.45))/.09,2.));
 col+=vec3(.8,.91,1.)*sweep*warm*.15+gloss*warm*.11;
 // A narrow moving boundary carries the event. Broad areas retain their dark material.
 if(mode>8.5&&mode<9.5){float charBand=1.-smoothstep(.02,.21,field-cut);col=mix(col,vec3(.026,.014,.019),charBand*.90);}
 col=mix(col,tint*.75,edge*.65);col+=tint*edge*.33;
 if(mode>3.5&&mode<7.5){float fresnel=pow(1.-abs(normal.z),3.);col+=vec3(.55,.87,.83)*fresnel*warm*.12;}
 if(back>.5)col=tex.rgb*.18+tint*.06;gl_FragColor=vec4(col,tex.a*remain);}
`;

type Point=[number,number];
type Vertex={x:number;y:number;cx:number;cy:number;part:number};
type Rig={mesh:T.Mesh;back:T.Mesh;vertices:Vertex[];position:T.BufferAttribute;material:T.ShaderMaterial};
export type Assets=Record<Family,HTMLImageElement>;
export async function loadAssets():Promise<Assets>{
 const pairs=await Promise.all(Object.entries(art).map(async([id,url])=>{const image=new Image();image.src=url;await image.decode();return [id,image] as const;}));
 return Object.fromEntries(pairs) as Assets;
}
const seeds:Point[]=[[-.66,.62],[-.1,.76],[.56,.67],[-.57,.12],[.04,.18],[.66,.18],[-.6,-.42],[.03,-.33],[.57,-.53],[-.17,-.84],[.61,-.91]];
function cell(index:number):Point[]{
 let out:Point[]=[[-1,-1],[1,-1],[1,1],[-1,1]];const a=seeds[index];
 for(let j=0;j<seeds.length;j++)if(j!==index){const b=seeds[j],nx=b[0]-a[0],ny=b[1]-a[1],d=(b[0]*b[0]+b[1]*b[1]-a[0]*a[0]-a[1]*a[1])/2,inside=(p:Point)=>p[0]*nx+p[1]*ny-d;const next:Point[]=[];
  for(let k=0;k<out.length;k++){const p=out[k],q=out[(k+1)%out.length],f=inside(p),g=inside(q);if(f<=0)next.push(p);if((f<=0)!==(g<=0)){const u=f/(f-g);next.push([p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u]);}}out=next;
 }return out;
}
function geometry(mode:number){
 const vertices:Vertex[]=[],uv:number[]=[],pos:number[]=[];
 const emit=(p:Point,c:Point,part:number)=>{vertices.push({x:p[0],y:p[1],cx:c[0],cy:c[1],part});pos.push(p[0],p[1],0);uv.push((p[0]+1)/2,(p[1]+1)/2);};
 if(mode===0||mode===11){
  for(let i=0;i<seeds.length;i++){const points=cell(i),center:Point=[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];
   for(let j=1;j<points.length-1;j++){emit(points[0],center,i);emit(points[j],center,i);emit(points[j+1],center,i);}}
 }else{
  const cols=mode===1?24:48,rows=mode===2?48:52;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const x0=x/cols*2-1,x1=(x+1)/cols*2-1,y0=y/rows*2-1,y1=(y+1)/rows*2-1;
   const part=mode===1?Math.floor(x/4):mode===2?Math.floor(y/6):mode===7?Math.floor(x/8):0;
   const center:Point=mode===1?[-1+(part+.5)/3,0]:mode===2?[0,-1+(part+.5)/4]:[0,0];
   for(const p of [[x0,y0],[x1,y0],[x1,y1],[x0,y0],[x1,y1],[x0,y1]] as Point[])emit(p,center,part);
  }
 }
 const geo=new T.BufferGeometry();const position=new T.BufferAttribute(new Float32Array(pos),3).setUsage(T.DynamicDrawUsage);geo.setAttribute('position',position);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeBoundingSphere();return{geo,position,vertices};
}

/** One shared WebGL context; the three approved studies preserve the same source UVs. */
export class Renderer{
 private gl:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-1.9,1.9,1.9,-1.9,.1,30);
 private rigs=new Map<number,Rig>();
 private textures=new Map<string,T.CanvasTexture>();
 private lastSize=0;
 disposed=false;
 constructor(public assets:Assets){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false,powerPreference:'low-power'});
  this.gl.setClearColor(0,0);this.gl.setPixelRatio(1);this.gl.outputColorSpace=T.LinearSRGBColorSpace;this.camera.position.z=10;
 }
 async warm(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;for(const s of studies){this.draw(ctx,s,1,64,64,40);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}}
 get info(){return{geometries:this.gl.info.memory.geometries,textures:this.gl.info.memory.textures,rigs:this.rigs.size,disposed:this.disposed};}
 private texture(family:Family,count:number){
  const key=family+count;let tex=this.textures.get(key);if(tex)return tex;
  if(this.textures.size>=12){const oldest=this.textures.keys().next().value!;this.textures.get(oldest)!.dispose();this.textures.delete(oldest);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;c.drawImage(this.assets[family],0,0,512,512);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff8e7';c.font=`600 ${Math.min(.14,.32/String(count).length)/(family==='dew'?.33:family==='brand'?.32:.3)*512}px LoreBoardSerif, Georgia, serif`;
  // Match the native counter proportions; the number shares deformation and extinction.
  c.shadowColor='#000b';c.shadowBlur=5;c.shadowOffsetY=2;c.fillText(String(count),256,512*(family==='shield'?.46:family==='dew'?.535:.5));
  tex=new T.CanvasTexture(canvas);tex.colorSpace=T.NoColorSpace;tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;this.textures.set(key,tex);return tex;
 }
 private rig(mode:number){let rig=this.rigs.get(mode);if(rig)return rig;
  const {geo,position,vertices}=geometry(mode),material=new T.ShaderMaterial({vertexShader:V,fragmentShader:F,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,uniforms:{face:{value:null},t:{value:0},mode:{value:mode},back:{value:0},tint:{value:new T.Vector3()}}});
  const mesh=new T.Mesh(geo,material),backMaterial=material.clone();backMaterial.uniforms={...material.uniforms,back:{value:1}};const back=new T.Mesh(geo,backMaterial);back.frustumCulled=false;back.renderOrder=0;mesh.renderOrder=1;mesh.frustumCulled=false;rig={mesh,back,vertices,position,material};this.rigs.set(mode,rig);return rig;
 }
 private pose(rig:Rig,mode:number,t:number){
  const q=smooth(.11,.83,t),late=smooth(.64,1,t),out=rig.position.array as Float32Array;
  for(let i=0;i<rig.vertices.length;i++){
   const v=rig.vertices[i],{x,y,cx,cy,part}=v;let X=x,Y=y,Z=0;
   if(mode===0){
    const k=smooth(.16+(part%3)*.018,.66,t),pull=k*(1-late*.28),sc=1-late*.76,a=(part%2?1:-1)*k*(.12+(part%4)*.09),dx=x-cx,dy=y-cy;
    X=cx*(1+pull*.53)+(dx*Math.cos(a)-dy*Math.sin(a))*sc;Y=cy*(1+pull*.43)+(dx*Math.sin(a)+dy*Math.cos(a))*sc-k*k*.16;Z=k*(.04+(part%3)*.07)+dx*Math.sin(k*(part%2?1.1:-.9));X=cx*(1+pull*.53)+(X-cx*(1+pull*.53))*Math.cos(k*.6);
   }else if(mode===1){
    const k=smooth(.10+Math.abs(cx)*.10,.80,t),a=k*1.57,sc=1-smooth(.72,1,t);X=(cx*(1-k)+Math.cos(a)*(x-cx))*sc;Y=y*(1-k*.18)*sc;Z=Math.sin(a)*((part%2?-1:1)*(x-cx)*2.1+.14);Y+=Math.sin(a)*Math.sin(part*1.4)*.07;
   }else if(mode===2){
    const k=smooth(.08+part*.052,.91,t),u=(x+1)/2,a=k*(u*3.5+part*.12),thin=1-smooth(.68,1,t);
    X=-1+Math.sin(a)*(.7/(k+.07))*.5+u*(1-k)*2+k*.85;Y=cy+(y-cy)*thin+k*(.66+u*.35)+Math.sin(part*.9)*k*.13;Z=(1-Math.cos(a))*.30;
    // Exact undeformed UV plane at zero; smooth handoff to the curled foil.
    X=x+(X-x)*smooth(.0,.10,k)+k*(part-3.5)*.032;Y+=Math.sin(part*.9)*k*.19;
   }else if(mode===3){
    const k=smooth(.48,.99,t),r=Math.hypot(x,y),a=Math.atan2(y,x)+k*.13;X=Math.cos(a)*r*(1-k*.55);Y=Math.sin(a)*r*(1-k*.55);Z=Math.sin(r*8-t*5)*q*.025;
   }else if(mode===4){
    const front=smooth(.06,.93,t),local=smooth(-.15,1.2,front*1.65-(y+1)*.30),neck=1-local*.93;
    X=x*neck+Math.sin((y+1)*4+t*9)*.016*q;Y=y+(-1.1-y)*local*.78;Z=Math.sin((y+1)*Math.PI/2)*q*.15;
   }else if(mode===5){
    const r=Math.hypot(x,y),a=Math.atan2(y,x),wave=Math.sin(a*7+t*5)*.024*q,sc=1+q*.20-late*.37;X=x*(sc+wave);Y=y*(sc+wave);Z=Math.sin(r*10-t*8)*q*.048;
   }else if(mode===6){
    const neck=Math.exp(-y*y*17),k=smooth(.10,.74,t),end=1-smooth(.72,1,t);X=x*(1-neck*k*.97)*end;Y=(y*(1+k*.40)+Math.tanh(y*7)*k*.09)*end;Z=q*.14*(1-neck);
   }else if(mode===7){
    const k=smooth(.08+part*.015,.96,t),tip=smooth(-1,1,y),w=k*tip;X=x*(1-q*.26)+Math.sin(y*4+k*5+part)*w*.16;Y=y+w*.72;Z=Math.sin(y*3+k*5)*w*.14;
   }else if(mode===8){
    const k=smooth(.10,.85,t),weight=(1-y)/2,flow=.5+.5*Math.sin(x*13+Math.sin(x*7));
    X=x*(1-k*.21)+Math.sin(y*4+x*7)*k*.025;Y=y-k*weight*weight*(.34+flow*.34);Z=k*Math.sin(x*7)*.065;
    const e=1-smooth(.73,1,t);X*=e;Y=-.8+(Y+.8)*e;
   }else if(mode===9){
    const k=smooth(.10,.87,t),front=smooth(-.1,.8,k-(x+y+2)*.24);X=x+front*Math.sin(y*5)*.10;Y=y+front*.15;Z=front*(.2+.18*Math.sin(x*6));
   }else if(mode===10){
    const r=Math.hypot(x,y),k=smooth(.10,.94,t),angle=Math.atan2(y,x)-k*(3.8-r*2.2),sc=1-smooth(.67,1,t);
    X=Math.cos(angle)*r*(1-k*.28)*sc+k*k*.20;Y=Math.sin(angle)*r*(1-k*.28)*sc+k*k*.32;Z=Math.sin(r*15-k*9)*k*.09;
   }else{
    const sector=Math.floor((Math.atan2(cy,cx)+Math.PI)/(Math.PI*2)*3),delay=sector*.045,k=smooth(.10+delay,.83,t),dx=x-cx,dy=y-cy,sc=1-smooth(.67,1,t)*.88,a=k*(sector===1?-2.3:2.1);
    X=cx*(1+k*.28)+dx*Math.cos(a)*sc;Y=cy*(1+k*.25)+dy*sc-k*k*.27;Z=dx*Math.sin(a)+k*.05;
   }
   out[i*3]=X;out[i*3+1]=Y;out[i*3+2]=Z;
  }rig.position.needsUpdate=true;
 }
 draw(c:CanvasRenderingContext2D,s:Study,ms:number,x:number,y:number,w:number,h=w,count=8,reduced=false){
  if(this.disposed||ms>=s.duration)return;const t=clamp(ms/s.duration);
  if(reduced){if(ms<160){c.save();c.globalAlpha=1-smooth(0,160,ms);const face=this.texture(s.family,count).image;c.drawImage(face,x-w/2,y-h/2,w,h);c.restore();}return;}
  const rig=this.rig(s.mode);rig.material.uniforms.face.value=this.texture(s.family,count);rig.material.uniforms.t.value=t;
  rig.material.uniforms.tint.value.set(...(s.family==='shield'?[.56,.84,1]:s.family==='dew'?[.52,.95,.82]:[1,.51,.22]) as [number,number,number]);
  this.pose(rig,s.mode,t);this.scene.clear();if(s.family!=='dew'&&t>0){const relief=smooth(0,.2,t);rig.back.position.set(.018*relief,-.024*relief,-.03);this.scene.add(rig.back);}this.scene.add(rig.mesh);
  const target=Math.max(w,h)*1.9*Math.min(2,devicePixelRatio||1);const size=target<=128?128:target<=256?256:target<=512?512:640;
  if(this.lastSize!==size){this.gl.setSize(size,size,false);this.lastSize=size;}
  this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,x-w*.95,y-h*.95,w*1.9,h*1.9);
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const r of this.rigs.values()){r.mesh.geometry.dispose();r.material.dispose();(r.back.material as T.ShaderMaterial).dispose();}for(const t of this.textures.values())t.dispose();this.scene.clear();this.rigs.clear();this.textures.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
