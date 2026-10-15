import * as T from 'three';
import {DURATION,WIDTH,HEIGHT} from './catalog';
export type View='oblique'|'top'|'low';
type C=CanvasRenderingContext2D;
const vertex=`
varying vec2 st;varying vec3 point;varying float motion;
uniform float timeMs,kind,pass,success,reduced,direction;
float sm(float a,float b,float x){float q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
void main(){
 st=uv;float t=timeMs;vec2 p=position.xy;vec3 q=position;float m=0.;float fade=1.-sm(440.,700.,t);
 float ready=sin(sm(0.,170.,t)*3.14159)*(1.-sm(160.,260.,t));
 if(reduced>.5){q.z=0.;m=0.;}
 else if(success<.5){q.y-=ready*3.;q.z+=ready*2.;}
 else if(kind<.5){
  float delayed=t-(pass>1.5?(pass-1.)*30.:0.);
  m=sm(80.,195.,delayed)*(1.-sm(365.,700.,delayed));
  float anticipation=sm(0.,80.,delayed)*(1.-sm(80.,160.,delayed));
  float move=59.*m-8.*anticipation;
  float theta=(-.07*anticipation+.11*m)*direction;
  q.xy=mat2(cos(theta),-sin(theta),sin(theta),cos(theta))*p;
  q.x+=move*direction;q.y+=-9.*m;q.z+=3.*m;
  // A short shear follows the actual front edge, rather than a detached speed-line emitter.
  q.x+=sin(uv.y*3.14159)*4.*m*direction;
 }else if(kind<1.5){
  float lead=(1.-uv.y)*54.;m=sm(70.+lead,260.+lead,t)*(1.-sm(365.+lead,645.+lead,t));
  float angle=m*.92*direction;
  q.x=p.x*cos(angle)+sin(uv.y*3.14159)*21.*m*direction;
  q.y=p.y-20.*m;
  q.z=(p.x+90.)*.42*sin(angle*direction)+sin(uv.y*3.14159)*24.*m;
  float twist=(uv.y-.5)*.48*m*direction;
  q.xy=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*q.xy;
 }else if(kind<2.5){
  m=sm(45.,210.,t)*(1.-sm(395.,700.,t));
  float wave=sin(uv.y*5.8-t*.011)*m;
  q.x+=direction*(30.*m+wave*13.);q.y+=cos(uv.x*3.14159)*m*8.;
  q.z+=m*(13.+13.*sin(uv.y*5.8-t*.011)+5.*sin(uv.x*5.+t*.006));
  q.x*=1.-.06*m;
 }else{
  m=sm(65.,220.,t)*(1.-sm(365.,685.,t));
  float curl=sm(90.,245.,t)*(1.-sm(360.,610.,t));
  q.x+=direction*(25.*m+sin(uv.y*4.-t*.006)*6.*m);
  q.y=p.y*(1.-.33*m)-20.*m;
  q.z=sin(uv.x*3.14159)*sin(uv.y*3.14159)*curl*9.-1.0*m;
 }
 if(reduced>.5||success<.5)m=0.;
 motion=m;point=q;
 if(pass>.5&&pass<1.5){q.xy+=vec2(3.,-4.)+vec2(.22,-.28)*max(q.z,0.);q.z=-2.;}
 gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);
}`;
const fragment=`
precision highp float;
varying vec2 st;varying vec3 point;varying float motion;
uniform sampler2D face;uniform float timeMs,kind,pass,success,reduced,direction;
float sat(float x){return clamp(x,0.,1.);}
float sm(float a,float b,float x){float q=sat((x-a)/(b-a));return q*q*(3.-2.*q);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
vec4 art(vec2 p){return texture2D(face,clamp(p,.001,.999));}
float evadeLuma(vec3 c){return dot(c,vec3(.22,.70,.08));}
void main(){
 float m=motion,t=timeMs*.001;vec2 coords=st;
 float envelope=sm(15.,95.,timeMs)*(1.-sm(565.,700.,timeMs));
 float grain=noise(st*vec2(70.,110.));
 float wave=sin(st.y*12.-t*17.+sin(st.x*9.)*.55);
 if(kind>1.5&&kind<2.5)coords+=vec2(wave*.033,sin(st.x*10.+t*11.)*.008)*m;
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
 if(pass>1.5){
  if(kind>.5||success<.5||reduced>.5)discard;
  float trailing=sm(95.,170.,timeMs)*(1.-sm(315.,510.,timeMs));
  // Thin, masked residual surface. It converges with the single actor before recovery.
  float alpha=tex.a*trailing*(edge*.35+detail*.17+.025)/(pass-1.);
  gl_FragColor=vec4(mix(vec3(.25,.38,.40),vec3(.79,.94,.90),sat(edge*2.+detail)),alpha);return;
 }
 vec3 N=normalize(cross(dFdx(point),dFdy(point)));if(N.z<0.)N=-N;
 vec3 L=normalize(vec3(-.45,.60,1.)),H=normalize(L+vec3(0.,0.,1.));
 float spec=pow(max(0.,dot(N,H)),48.),fres=pow(1.-abs(N.z),2.);
 float band=exp(-pow((st.x+st.y*.32-t*1.6+.20)*17.,2.));
 vec3 col=tex.rgb;float alpha=tex.a;
 if(kind<.5){
  col*=1.+m*.05;col+=vec3(.66,.83,.82)*(edge*.68+detail*band*.58)*envelope;
  col+=vec3(.51,.69,.73)*band*.10*envelope;
 }else if(kind<1.5){
  float lambert=.66+.34*max(0.,dot(N,L));
  col*=mix(1.,lambert,m);col+=vec3(.94,.85,.66)*(spec*.29+fres*.13+edge*.48)*m;
  float edgeGrain=sin(st.y*370.+st.x*90.)*.5+.5;
  col+=vec3(.86,.78,.61)*detail*edgeGrain*.30*m;
 }else if(kind<2.5){
  vec3 lens=mix(vec3(.07,.20,.24),vec3(.36,.60,.61),wave*.5+.5);
  col=mix(col,col*.69+lens*.21,m*.76);
  float reflection=pow(sat(.5+.5*wave),20.);
  col+=vec3(.80,.96,.94)*(reflection*.34+spec*.45+edge*.80+detail*.15)*m;
  col+=vec3(.43,.73,.77)*fres*.13*m;
 }else{
  float ink=noise(st*8.+vec2(t*.4,-t*.7))*.7+grain*.3;
  float returnFront=sm(375.,640.,timeMs);
  float restore=(1.-sm(returnFront-.06,returnFront+.06,1.-st.y+(ink-.5)*.10))*sm(340.,405.,timeMs);
  float coat=sm(.04,.65,m)*(1.-restore);
  vec3 shadow=mix(vec3(.021,.025,.038),vec3(.09,.11,.16),ink);
  shadow+=vec3(.50,.61,.75)*(edge*.52+detail*.23+pow(ink,7.)*.08);
  col=mix(col,shadow,coat*.94);
  float crest=exp(-abs(1.-st.y-returnFront)*60.)*sm(350.,400.,timeMs)*(1.-sm(595.,690.,timeMs));
  col+=vec3(.61,.73,.84)*(crest*.24+edge*.23*m);
  alpha*=1.-coat*.15;
 }
 if(success<.5||reduced>.5){col=tex.rgb+vec3(.55,.66,.67)*(edge*.25+detail*.08)*envelope;alpha=tex.a;}
 gl_FragColor=vec4(col,alpha);
}`;
export class Renderer{
 private gl:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-245,245,210,-210,.1,2000);
 private boardCamera=new T.Camera();
 private geometry=new T.PlaneGeometry(WIDTH,HEIGHT,40,60);
 private materials:T.ShaderMaterial[]=[];
 private maps=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private disposed=false;
 constructor(){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.gl.setPixelRatio(1);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;
  for(const pass of [1,3,2,0]){
   const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:T.DoubleSide,depthWrite:pass===0,uniforms:{face:{value:null},timeMs:{value:0},kind:{value:0},pass:{value:pass},success:{value:1},reduced:{value:0},direction:{value:1}}});
   const mesh=new T.Mesh(this.geometry,mat);mesh.frustumCulled=false;mesh.renderOrder=this.materials.length;this.scene.add(mesh);this.materials.push(mat);
  }
 }
 private prepare(face:HTMLCanvasElement,v:number,ms:number,success:boolean,reduced:boolean,direction:number){
  let texture=this.maps.get(face);if(!texture){texture=new T.CanvasTexture(face);texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;this.maps.set(face,texture);}
  for(const m of this.materials){m.uniforms.face.value=texture;m.uniforms.kind.value=v;m.uniforms.timeMs.value=Math.min(DURATION,Math.max(0,ms));m.uniforms.success.value=Number(success);m.uniforms.reduced.value=Number(reduced);m.uniforms.direction.value=direction;}
 }
 draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,success=true,reduced=false,view:View='oblique',direction=1){
  if(this.disposed||w<=0)return;this.prepare(face,v,ms,success,reduced,direction);
  this.gl.setSize(735,630,false);this.camera.up.set(0,1,0);
  this.camera.position.set(view==='top'?0:45,view==='top'?0:view==='low'?-650:-390,view==='low'?700:1200);
  this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();this.gl.render(this.scene,this.camera);
  c.drawImage(this.gl.domElement,x-w*245/WIDTH,y-w*210/WIDTH,w*490/WIDTH,w*420/WIDTH);
 }
 drawBoard(c:C,face:HTMLCanvasElement,v:number,ms:number,matrix:DOMMatrix,width:number,height:number,success=true,reduced=false,direction=1){
  if(this.disposed||width<1||height<1)return;this.prepare(face,v,ms,success,reduced,direction);
  this.gl.setSize(Math.round(width),Math.round(height),false);
  const local=matrix.translate(WIDTH/2,HEIGHT/2,0).scale(1,-1,1);
  const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(local.toFloat64Array()))));
  this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.boardCamera.updateMatrixWorld();
  this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 get resources(){return {textures:this.maps.size,geometries:this.gl.info.memory.geometries,programs:this.gl.info.programs?.length??0};}
 dispose(){if(this.disposed)return;this.disposed=true;this.geometry.dispose();this.materials.forEach(m=>m.dispose());this.maps.forEach(m=>m.dispose());this.maps.clear();this.gl.dispose();this.gl.forceContextLoss();}
}
