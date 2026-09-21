import * as T from 'three';
/** One small shared optical texture. The board itself stays cached while this
 * material flows; exile cards sample the same depth and refraction vocabulary. */
let shared:ReturnType<typeof createOptics>|undefined,users=0;
function createOptics(){
 const renderer=new T.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setSize(192,320,false);renderer.setPixelRatio(1);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
 const material=new T.ShaderMaterial({uniforms:{time:{value:0},collapse:{value:0}},vertexShader:'varying vec2 uvp;void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 precision highp float;varying vec2 uvp;uniform float time;uniform float collapse;
 float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float field(vec3 p){return noise(p)*.57+noise(p*2.04+4.3)*.28+noise(p*4.17)*.15;}
 void main(){
  vec2 p=(uvp-.5)*vec2(1.35,2.);float radius=length(p),angle=atan(p.y,p.x);
  float turn=.32/(radius+.22)+time*.045+collapse*.7;
  mat2 rot=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));vec2 warped=rot*p;
  vec3 sum=vec3(0);float trans=1.;
  for(int i=0;i<7;i++){
   float depth=float(i)*.19;vec3 q=vec3(warped*(2.7+depth*1.2)+vec2(depth*.3,time*.07),depth-time*.11);
   float density=field(q);float fold=abs(density-.49);
   float cloud=(1.-smoothstep(.015,.16,fold))*.17;
   vec3 hue=mix(vec3(.018,.027,.075),vec3(.23,.12,.39),density);
   sum+=trans*cloud*hue;trans*=1.-cloud*.6;
  }
  float glass=field(vec3(warped*4.,time*.06));
  float contour=pow(max(0.,1.-abs(glass-.50)*32.),8.);
  float filigree=pow(max(0.,1.-abs(field(vec3(warped*9.+glass,time*.03))-.51)*40.),12.);
  float rim=pow(max(0.,sin(angle*2.+radius*7.-time*.10+glass*3.)),20.);
  float core=1.-smoothstep(.035,.38,radius+sin(angle*3.+time*.08)*.035);
  vec3 col=vec3(.007,.010,.030)+sum*1.6;
  col+=vec3(.31,.34,.58)*contour*(.16+.35*rim)+vec3(.18,.14,.38)*filigree*.15;
  col+=vec3(.12,.12,.23)*rim*(1.-core)*.45;col*=1.-core*.93;
  float star=pow(noise(vec3(floor(uvp*vec2(105.,170.)),7.)),110.)*.38;
  col+=star*vec3(.52,.60,.83)*(1.-core);
  gl_FragColor=vec4(pow(col,vec3(.66)),1.);
 }`});
 const geometry=new T.PlaneGeometry(2,2);scene.add(new T.Mesh(geometry,material));
 return {draw(time:number,collapse:number){material.uniforms.time.value=time;material.uniforms.collapse.value=collapse;renderer.render(scene,camera);return renderer.domElement;},dispose(){geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
export function acquireVoidSurface(){users++;try{shared??=createOptics();}catch{/* A quiet gradient remains available without WebGL. */}let released=false;return ()=>{if(released)return;released=true;if(--users===0){shared?.dispose();shared=undefined;}};}
export function drawVoidSurface(c:CanvasRenderingContext2D,w:number,h:number,time:number,collapse=0){
 if(shared){c.drawImage(shared.draw(time,collapse),0,0,w,h);return;}
 const g=c.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,h*.6);g.addColorStop(0,'#030714');g.addColorStop(.4,'#211c44');g.addColorStop(.7,'#514477');g.addColorStop(1,'#080e24');c.fillStyle=g;c.fillRect(0,0,w,h);
}
