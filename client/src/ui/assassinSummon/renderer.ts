import * as T from 'three';
import {DURATION} from './catalog';
export type View='oblique'|'top'|'side';
type C=CanvasRenderingContext2D;

// A single captured surface owns the illustration, its carved outline, material detail,
// deformation and reconstruction. No cloak, shutter or feather is placed over a static card.
const vertex=`
attribute float branch;
varying vec2 st;varying vec3 localPos;varying float amount;
uniform float clockMs,kind,rank,shadowPass,boardPass;
float sm(float a,float b,float x){float u=clamp((x-a)/(b-a),0.,1.);return u*u*(3.-2.*u);}
void main(){
 st=uv;float t=clockMs*.001;vec2 p=(uv-.5)*vec2(1.24,1.74),q=p;float z=0.,m=0.;
 if(kind<.5){
  m=sm(170.,650.,clockMs)*(1.-sm(1020.,1730.,clockMs));
  q.x=p.x*(1.-.82*m)+sin(p.y*5.2+t*1.2)*.30*m;
  q.y=p.y*(1.-.13*m);z=(.10+.08*sin(p.y*6.5+t)+.026*sin(p.x*37.+p.y*8.))*m;
 }else if(kind<1.5){
  m=sm(220.,650.,clockMs)*(1.-sm(890.,1330.,clockMs));
  q.x=p.x*(1.+.60*m)+(.22-.44*sm(600.,1080.,clockMs))*m;
  q.y=p.y*(1.-.96*m)+p.x*.40*m;z=(.025+.055*sin((p.x+.62)*2.53))*m;
 }else if(kind<2.5){
  m=sm(130.,640.,clockMs)*(1.-sm(950.,1850.,clockMs));
  q.x=p.x*mix(1.,sqrt(max(.1,1.-pow(p.y/.95,2.)*.46))*1.34,m);
  q.y=p.y*(1.-.80*m)*mix(1.,sqrt(max(.1,1.-pow(p.x/.72,2.)*.55)),m);
  q.x+=sin(p.y*6.+t*1.7)*.026*m;q.y+=sin(p.x*8.+t*1.6)*.043*m;
  z=(.014+.045*sin(uv.x*3.14159)*sin(uv.y*3.14159)+sin(p.x*18.+p.y*22.+t)*.004)*m;
 }else if(kind<3.5){
  m=sm(160.,650.,clockMs)*(1.-sm(880.,1780.,clockMs));
  q.x+=m*(sin(p.y*7.+t*1.3)*.14+sin(p.x*11.-t)*.045);
  q.y+=m*(.15*sin(p.x*4.+t)+p.x*.13);z=(.06+.07*sin(p.y*4.+t))*m;
 }else if(kind<4.5){
  m=sm(190.,700.,clockMs)*(1.-sm(1150.,1920.,clockMs));
  q.x+=sin(p.y*24.-t*6.)*.012*m;q.y+=sin(p.x*15.+t*4.)*.015*m;
  z=(.03+.04*sin(p.y*5.+p.x*8.-t*3.))*m;
 }else{
  m=sm(200.,700.,clockMs)*(1.-sm(1010.,1780.,clockMs));
  float count=rank>3.5?5.:3.;float part=branch,center=(part+.5)/count-.5;
  float delay=part*65.;m=sm(170.+delay,650.+delay,clockMs)*(1.-sm(930.+delay,1710.+delay,clockMs));
  float a=uv.y*7.+center*1.6+t*.25;
  vec2 stream=vec2(sin(a)*.23+center*.92,(uv.y-.5)*1.22+center*.20);
  stream.x+=(uv.x-(part+.5)/count)*.65;
  q=mix(p,stream,m);z=(.045+.08*(.5+.5*sin(a))+part*.006)*m;
 }
 amount=m;
 float lift=boardPass>.5?0.:.20*sm(0.,400.,clockMs)*(1.-sm(700.,1220.,clockMs));
 vec3 pos=vec3(q*180.,(z+lift)*180.+1.0);
 localPos=pos;
 if(shadowPass>.5){pos.xy+=vec2(.30,-.20)*pos.z;pos.z=-.1;}
 gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
}`;
const fragment=`
precision highp float;
varying vec2 st;varying vec3 localPos;varying float amount;
uniform sampler2D face;uniform float clockMs,kind,rank,shadowPass,boardPass;
float sat(float x){return clamp(x,0.,1.);}
float sm(float a,float b,float x){float t=sat((x-a)/(b-a));return t*t*(3.-2.*t);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.56+noise(p*2.03+7.)*.28+noise(p*4.09-3.)*.12+noise(p*8.11+11.)*.04;}
vec4 art(vec2 q){return texture2D(face,clamp(q,.001,.999));}
float lum(vec3 c){return dot(c,vec3(.22,.70,.08));}
void main(){
 float t=clockMs*.001,m=amount;vec2 p=(st-.5)*vec2(1.,1.5);
 vec2 drift=vec2(t*.07,-t*.12),warp=vec2(fbm(p*4.+drift),fbm(p*4.-drift+8.));
 float grain=fbm(p*18.+warp*2.);float flow=fbm(p*6.+warp*1.8+drift);
 vec2 coords=st;
 if(kind>3.5&&kind<4.5)coords+=vec2(sin(st.y*30.-t*5.),cos(st.x*21.+t*3.))*.014*m;
 vec4 tex=art(coords);if(tex.a<.003)discard;
 vec2 px=vec2(.0032,.0023);
 float edge=max(max(tex.a-art(st+vec2(px.x,0)).a,tex.a-art(st-vec2(px.x,0)).a),max(tex.a-art(st+vec2(0,px.y)).a,tex.a-art(st-vec2(0,px.y)).a));
 float detail=length(vec2(lum(art(st+vec2(px.x,0)).rgb)-lum(art(st-vec2(px.x,0)).rgb),lum(art(st+vec2(0,px.y)).rgb)-lum(art(st-vec2(0,px.y)).rgb)));
 float charge=sm(40.,260.,clockMs)*(1.-sm(1580.,2180.,clockMs));
 float coating=sm(.04,.70,m),restore=sm(1200.,2010.,clockMs);
 float band=exp(-pow((st.y-.10-t*.35)*15.,2.));
 float ridge=pow(sat(1.-abs(flow-.49)*11.),4.);
 float filament=pow(.5+.5*sin(st.y*175.+warp.x*14.+st.x*22.),14.);
 vec3 N=normalize(cross(dFdx(localPos),dFdy(localPos)));if(N.z<0.)N=-N;
 N=normalize(N+vec3((grain-.5)*.13,(flow-.5)*.09,0.)*coating);
 vec3 L=normalize(vec3(-.45,.60,1.2)),H=normalize(L+vec3(0.,-.18,1.));
 float ndl=max(0.,dot(N,L)),fres=pow(1.-N.z,2.4);
 float reflection=exp(-pow((sin(st.x*5.+st.y*2.-t*1.6)-.18)*10.,2.));
 float spec=pow(max(0.,dot(N,H)),kind>1.5&&kind<2.5?90.:kind<1.5&&kind>.5?70.:22.);
 vec3 dark=vec3(.012,.014,.025),mid=vec3(.095,.112,.155),silver=vec3(.67,.74,.85),red=vec3(.40,.028,.065);
 vec3 ink=mix(dark,mid,grain*.9+ridge*.12)*(.46+.7*ndl);
 ink+=silver*(detail*.95+filament*.10+ridge*.09)*(.60+rank*.15);
 if(kind<.5){ink+=silver*(spec*.12+fres*.24)+red*filament*.20;}
 else if(kind<1.5){ink+=silver*(reflection*.64+spec*.32+fres*.40);ink+=red*ridge*.11+silver*exp(-pow((clockMs-945.)/48.,2.))*.58;}
 else if(kind<2.5){ink+=silver*(reflection*.48+spec*.36+ridge*.11+fres*.28);ink+=vec3(.08,.10,.16)*flow;}
 else if(kind<3.5){ink=mix(vec3(.018,.023,.038),vec3(.13,.15,.20),flow*.65);ink+=silver*ridge*.025;}
 else if(kind<4.5){ink+=silver*(reflection*.11+detail*.45)+red*ridge*.025;}
 else{ink+=silver*(reflection*.15+fres*.24+filament*.12)+red*ridge*.09;}
 vec3 color=mix(tex.rgb,ink,coating);
 color+=silver*(detail*band*.40+edge*.42)*charge*(1.-coating*.35);
 color+=red*(edge*.33+filament*.05)*charge*coating;
 float opacity=tex.a;
 // Smoke erodes the captured surface itself; its surviving strands move with the same UV field.
 if(kind>2.5&&kind<3.5){float dissolve=sm(.20,.95,m);float cloud=sm(.32,.65,flow+grain*.15);opacity*=mix(1.,cloud*.82,dissolve);color+=silver*sm(.56,.62,flow)*.018*dissolve;}
 // Camouflage preserves the true carved silhouette and image relief, then restores from one edge.
 if(kind>3.5&&kind<4.5){float returnFront=sm(1160.,1920.,clockMs);float unveil=(1.-sm(returnFront-.12,returnFront+.08,st.y+(flow-.5)*.18))*sm(1110.,1280.,clockMs);float hidden=sm(.20,.9,m)*(1.-unveil);float boundary=exp(-abs(st.y-returnFront)*45.)*sm(1110.,1280.,clockMs);opacity*=mix(1.,sat(.07+edge*.88+detail*.40+ridge*.22+boundary*.2),hidden);color=mix(color,tex.rgb,unveil);color+=silver*(edge*.27+detail*.2)*hidden;}
 if(shadowPass>.5){float strength=boardPass>.5?sm(1010.,1220.,clockMs):1.;gl_FragColor=vec4(.028,.033,.047,opacity*.08*strength);return;}
 if(opacity<.003)discard;
 gl_FragColor=vec4(color,opacity);
}`;

// Duplicate seam vertices so the three/five streams never acquire stretched bridge triangles.
function surfaceGeometry(count:number){
 const positions:number[]=[],uvs:number[]=[],branches:number[]=[],indices:number[]=[],nx=32,ny=112;
 for(let k=0;k<count;k++){const offset=positions.length/3;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=(k+i/nx)/count,v=j/ny;positions.push((u-.5)*223.2,(v-.5)*313.2,0);uvs.push(u,v);branches.push(k);}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=offset+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,c,b,d,c);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('branch',new T.Float32BufferAttribute(branches,1));g.setIndex(indices);return g;
}
export class Renderer{
 private gl:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-240,240,270,-270,.1,2000);
 private boardCamera=new T.Camera();
 private geometry=surfaceGeometry(3);
 private squadGeometry=surfaceGeometry(5);
 private meshes:T.Mesh[]=[];
 private maps=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private main:T.ShaderMaterial;
 private shadow:T.ShaderMaterial;
 private disposed=false;
 constructor(){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setPixelRatio(1);this.gl.setSize(480,540,false);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  const material=(shadowPass:number)=>new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,depthWrite:shadowPass===0,uniforms:{face:{value:null},clockMs:{value:0},kind:{value:0},rank:{value:1},shadowPass:{value:shadowPass},boardPass:{value:0}}});
  this.main=material(0);this.shadow=material(1);
  for(const mat of [this.shadow,this.main]){const mesh=new T.Mesh(this.geometry,mat);mesh.frustumCulled=false;mesh.renderOrder=mat===this.shadow?0:1;this.scene.add(mesh);this.meshes.push(mesh);}
 }
 private prepare(face:HTMLCanvasElement,v:number,ms:number,id:string,reduced:boolean,board:boolean){
  let texture=this.maps.get(face);if(!texture){texture=new T.CanvasTexture(face);texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;this.maps.set(face,texture);}
  this.meshes.forEach(mesh=>mesh.geometry=id==='ASSASSIN_SQUAD'?this.squadGeometry:this.geometry);
  const rank=id==='ASSASSIN_SQUAD'?4:id==='ASSASSIN4'?3:id==='ASSASSIN3'?2:id==='ASSASSIN2'?1.5:1;
  for(const mat of [this.main,this.shadow]){mat.uniforms.face.value=texture;mat.uniforms.kind.value=v;mat.uniforms.clockMs.value=reduced?DURATION:ms;mat.uniforms.rank.value=rank;mat.uniforms.boardPass.value=Number(board);}
 }
 draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,id:string,reduced=false,view:View='oblique'){
  if(this.disposed||w<=0)return;this.prepare(face,v,ms,id,reduced,false);this.gl.setSize(480,540,false);
  this.camera.up.set(0,0,1);if(view==='top'){this.camera.up.set(0,1,0);this.camera.position.set(0,0,900);}else if(view==='side')this.camera.position.set(170,-750,390);else this.camera.position.set(80,-530,1000);
  this.camera.lookAt(0,0,12);this.camera.updateMatrixWorld();this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,x-w*240/180,y-w*270/180,w*480/180,w*540/180);
 }
 drawBoard(c:C,face:HTMLCanvasElement,v:number,ms:number,id:string,matrix:DOMMatrix,width:number,height:number){
  if(this.disposed||width<1||height<1)return;this.prepare(face,v,ms,id,false,true);this.gl.setSize(width,height,false);
  const local=matrix.translate(90,135,0).scale(1,-1,1),screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(local.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.boardCamera.updateMatrixWorld();this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 releaseFace(face:HTMLCanvasElement){this.maps.get(face)?.dispose();this.maps.delete(face);}
 dispose(){if(this.disposed)return;this.disposed=true;this.geometry.dispose();this.squadGeometry.dispose();this.main.dispose();this.shadow.dispose();this.maps.forEach(t=>t.dispose());this.maps.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
let renderer:Renderer|undefined;
function instance(){return renderer??=new Renderer();}
export function draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,id:string,reduced=false,view:View|boolean='oblique'){instance().draw(c,face,v,ms,x,y,w,id,reduced,typeof view==='string'?view:'top');}
export function drawBoard(c:C,face:HTMLCanvasElement,v:number,ms:number,id:string,matrix:DOMMatrix,width:number,height:number){instance().drawBoard(c,face,v,ms,id,matrix,width,height);}
export function dispose(){renderer?.dispose();renderer=undefined;}
if(import.meta.hot)import.meta.hot.dispose(dispose);
