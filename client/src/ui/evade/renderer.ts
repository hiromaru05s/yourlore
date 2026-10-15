import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {EVADE_DURATION,WIDTH,HEIGHT} from './timing';
type C=CanvasRenderingContext2D;
// Frozen material and motion from the user-selected 03 水鏡の偏位.
const vertex=`
varying vec2 st;varying vec3 point;varying float motion;
uniform float timeMs,pass,success,reduced,direction;
float sm(float a,float b,float x){float q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
void main(){
 st=uv;float t=timeMs;vec2 p=position.xy;vec3 q=position;float m=0.;
 float ready=sin(sm(0.,170.,t)*3.14159)*(1.-sm(160.,260.,t));
 if(reduced>.5){q.z=0.;m=0.;}
 else if(success<.5){q.y-=ready*3.;q.z+=ready*2.;}
 else {
  m=sm(45.,210.,t)*(1.-sm(395.,700.,t));
  float wave=sin(uv.y*5.8-t*.011)*m;
  q.x+=direction*(30.*m+wave*13.);q.y+=cos(uv.x*3.14159)*m*8.;
  q.z+=m*(13.+13.*sin(uv.y*5.8-t*.011)+5.*sin(uv.x*5.+t*.006));
  q.x*=1.-.06*m;
 }
 if(reduced>.5||success<.5)m=0.;
 motion=m;point=q;
 if(pass>.5&&pass<1.5){q.xy+=vec2(3.,-4.)+vec2(.22,-.28)*max(q.z,0.);q.z=-2.;}
 gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);
}`;
const fragment=`
precision highp float;
varying vec2 st;varying vec3 point;varying float motion;
uniform sampler2D face;uniform float timeMs,pass,success,reduced,direction;
float sat(float x){return clamp(x,0.,1.);}
float sm(float a,float b,float x){float q=sat((x-a)/(b-a));return q*q*(3.-2.*q);}
vec4 art(vec2 p){return texture2D(face,clamp(p,.001,.999));}
float evadeLuma(vec3 c){return dot(c,vec3(.22,.70,.08));}
void main(){
 float m=motion,t=timeMs*.001;vec2 coords=st;
 float envelope=sm(15.,95.,timeMs)*(1.-sm(565.,700.,timeMs));
 float wave=sin(st.y*12.-t*17.+sin(st.x*9.)*.55);
 coords+=vec2(wave*.033,sin(st.x*10.+t*11.)*.008)*m;
 vec4 tex=art(coords);if(tex.a<.005&&!(pass>.5&&pass<1.5))discard;
 vec2 px=vec2(.0027,.0017);
 float edge=max(max(tex.a-art(st+vec2(px.x,0.)).a,tex.a-art(st-vec2(px.x,0.)).a),max(tex.a-art(st+vec2(0.,px.y)).a,tex.a-art(st-vec2(0.,px.y)).a));
 float detail=length(vec2(evadeLuma(art(coords+vec2(px.x,0.)).rgb)-evadeLuma(art(coords-vec2(px.x,0.)).rgb),evadeLuma(art(coords+vec2(0.,px.y)).rgb)-evadeLuma(art(coords-vec2(0.,px.y)).rgb)));
 if(pass>.5&&pass<1.5){
  float radius=.003+m*.016;
  float soft=tex.a*.28;
  soft+=(art(st+vec2(radius,0.)).a+art(st-vec2(radius,0.)).a+art(st+vec2(0.,radius)).a+art(st-vec2(0.,radius)).a)*.12;
  soft+=(art(st+vec2(radius,radius)).a+art(st-vec2(radius,radius)).a+art(st+vec2(radius,-radius)).a+art(st+vec2(-radius,radius)).a)*.06;
  gl_FragColor=vec4(.018,.027,.039,soft*(.15+.12*m));return;
 }
 vec3 N=normalize(cross(dFdx(point),dFdy(point)));if(N.z<0.)N=-N;
 vec3 L=normalize(vec3(-.45,.60,1.)),H=normalize(L+vec3(0.,0.,1.));
 float spec=pow(max(0.,dot(N,H)),48.),fres=pow(1.-abs(N.z),2.);

 vec3 col=tex.rgb;float alpha=tex.a;
  vec3 lens=mix(vec3(.07,.20,.24),vec3(.36,.60,.61),wave*.5+.5);
  col=mix(col,col*.69+lens*.21,m*.76);
  float reflection=pow(sat(.5+.5*wave),20.);
  col+=vec3(.80,.96,.94)*(reflection*.34+spec*.45+edge*.80+detail*.15)*m;
  col+=vec3(.43,.73,.77)*fres*.13*m;

 if(success<.5||reduced>.5){col=tex.rgb+vec3(.55,.66,.67)*(edge*.25+detail*.08)*envelope;alpha=tex.a;}
 gl_FragColor=vec4(col,alpha);
}`;
export class Renderer{
 private gl:T.WebGLRenderer;
 private scene=new T.Scene();
 private boardCamera=new T.Camera();
 private geometry=new T.PlaneGeometry(WIDTH,HEIGHT,40,60);
 private materials:T.ShaderMaterial[]=[];
 private maps=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private disposed=false;
 constructor(){
  this.gl=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.gl.setPixelRatio(1);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  for(const pass of [1,0]){
   const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,depthWrite:pass===0,uniforms:{face:{value:null},timeMs:{value:0},pass:{value:pass},success:{value:1},reduced:{value:0},direction:{value:1}}});
   const mesh=new T.Mesh(this.geometry,mat);mesh.frustumCulled=false;mesh.renderOrder=this.materials.length;this.scene.add(mesh);this.materials.push(mat);
  }
 }
 private prepare(face:HTMLCanvasElement,ms:number,success:boolean,reduced:boolean,direction:number){
  let texture=this.maps.get(face);if(!texture){texture=new T.CanvasTexture(face);texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;this.maps.set(face,texture);}
  for(const m of this.materials){m.uniforms.face.value=texture;m.uniforms.timeMs.value=Math.min(EVADE_DURATION,Math.max(0,ms));m.uniforms.success.value=Number(success);m.uniforms.reduced.value=Number(reduced);m.uniforms.direction.value=direction;}
 }
 drawBoard(c:C,face:HTMLCanvasElement,ms:number,matrix:DOMMatrix,width:number,height:number,success=true,reduced=false,direction=1){
  if(this.disposed||width<1||height<1)return;this.prepare(face,ms,success,reduced,direction);
  this.gl.setSize(Math.round(width),Math.round(height),false);
  const local=matrix.translate(WIDTH/2,HEIGHT/2,0).scale(1,-1,1);
  const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(local.toFloat64Array()))));
  this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.boardCamera.updateMatrixWorld();
  this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 releaseFace(face:HTMLCanvasElement){this.maps.get(face)?.dispose();this.maps.delete(face);}
 get resources(){return {textures:this.maps.size,geometries:this.gl.info.memory.geometries,programs:this.gl.info.programs?.length??0};}
 dispose(){if(this.disposed)return;this.disposed=true;this.geometry.dispose();this.materials.forEach(m=>m.dispose());this.maps.forEach(m=>m.dispose());this.maps.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
