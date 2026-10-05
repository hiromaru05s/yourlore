const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform float age,kind,front;
float sat(float x){return clamp(x,0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fb(vec2 p){return .57*noise(p)+.28*noise(p*2.03+12.)+.15*noise(p*4.07-7.);}
void main(){
 vec2 p=(uv-.5)*vec2(3.8,-3.8);float t=age; if(t<0.||t>1.8){gl_FragColor=vec4(0.);return;}
 float spread=1.-exp(-t*4.2),fade=1.-smoothstep(.35,1.65,t);float density=0.,rim=0.;
 // A coherent pressure front originates at the rectangular contact perimeter.
 for(int i=0;i<12;i++){
  float fi=float(i),edge=mod(fi,4.),seed=hash(vec2(fi,kind+3.));
  float side=mod(edge,2.)*2.-1.,along=(floor(fi/4.)-1.)*.55;
  vec2 normal=edge<2.?vec2(side,0.):vec2(0.,side);
  vec2 tangent=vec2(-normal.y,normal.x);
  vec2 anchor=edge<2.?vec2(side*.5,along):vec2(along*.62,side*.75);
  float a=max(0.,t-seed*.035),go=1.-exp(-a*(kind==4.?7.:3.8));
  float reach=kind==0.?.25:kind==1.?.29:kind==2.?.21:kind==3.?.32:kind==4.?.42:.24;
  vec2 center=anchor+normal*(.012+reach*go);
  vec2 size=vec2(.075+.08*go,.16+.08*go);
  if(kind==0.)size=vec2(.035+.04*go,.22);
  if(kind==1.)size=vec2(.13,.20)*(.7+go*.5);
  if(kind==2.)size*=.72;
  if(kind==3.){size=vec2(.045,.28);center+=tangent*sin(go*4.+fi)*.04;}
  if(kind==4.)size=vec2(.055,.20);
  if(kind==5.)size=vec2(.09,.14);
  vec2 delta=p-center;vec2 q=vec2(dot(delta,normal),dot(delta,tangent))/size;
  // fb() is in [0,1], so the outer smoothstep edge is at most 1.85.
  // Outside it both density and relief are exactly zero; keep every visible sample.
  float r=length(q);if(r>=1.85)continue;
  float angle=atan(q.y,q.x);
  float curl=angle+a*(kind==1.?3.:1.1)+fi;
  vec2 flow=q*.55+vec2(sin(curl),cos(curl))*.25;
  float n=fb(flow*2.+vec2(fi*7.,-a*.8));
  float silhouette=1.-smoothstep(.62+n*.45,1.45+n*.4,r);
  float erode=smoothstep(.05+a*.23,.28+a*.25,n);
  float hollow=kind==1.?smoothstep(.0,.48+a*.15,length(q-vec2(-side*.55,.14))):1.;
  float d=silhouette*erode*hollow*(.48+n*.35);
  density+=d;rim+=d*(fb(flow*2.+vec2(fi*7.-.16,-a*.8-.20))-n);
 }
 float born=smoothstep(0.,.055,t);float alpha=(1.-exp(-density*.95))*fade*born;
 vec3 dark=kind==5.?vec3(.31,.40,.46):kind==1.?vec3(.29,.30,.34):vec3(.33,.28,.22);
 vec3 light=kind==5.?vec3(.83,.91,.93):kind==1.?vec3(.79,.80,.82):vec3(.86,.80,.68);
 float relief=sat(.65+rim*1.8+fb(p*9.+t)*.10-density*.13);
 vec3 color=mix(dark,light,relief);
 if(kind==3.){color=mix(vec3(.39,.37,.32),vec3(.94,.89,.74),sat(relief+rim*5.));alpha*=.75;}
 if(kind==0.)alpha*=.72;
 gl_FragColor=vec4(color,alpha*.74);
}`;
export class DustMaterial{
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private p:WebGLProgram;private b:WebGLBuffer;private age:WebGLUniformLocation|null;private kind:WebGLUniformLocation|null;
 constructor(){const g=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!g)throw Error('WebGL is unavailable');this.gl=g;
 const shader=(type:number,src:string)=>{const s=g.createShader(type)!;g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s)||'shader');return s;};const vs=shader(g.VERTEX_SHADER,vertex),fs=shader(g.FRAGMENT_SHADER,fragment);this.p=g.createProgram()!;g.attachShader(this.p,vs);g.attachShader(this.p,fs);g.linkProgram(this.p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(this.p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.p)||'link');g.useProgram(this.p);this.b=g.createBuffer()!;g.bindBuffer(g.ARRAY_BUFFER,this.b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const at=g.getAttribLocation(this.p,'position');g.enableVertexAttribArray(at);g.vertexAttribPointer(at,2,g.FLOAT,false,0,0);this.age=g.getUniformLocation(this.p,'age');this.kind=g.getUniformLocation(this.p,'kind');}
 draw(kind:number,age:number,_front:boolean,size:number){const g=this.gl;const n=Math.max(256,Math.min(680,Math.round(size)));if(this.canvas.width!==n){this.canvas.width=this.canvas.height=n;}g.viewport(0,0,n,n);g.useProgram(this.p);g.uniform1f(this.age,age);g.uniform1f(this.kind,kind);g.drawArrays(g.TRIANGLES,0,6);return this.canvas;}
 isContextLost(){return this.gl.isContextLost();}
 dispose(){this.gl.deleteBuffer(this.b);this.gl.deleteProgram(this.p);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}

// All callers copy the result into their own Canvas2D plane before the next
// draw. Concurrent summons can share one shader/context without sharing faces.
let shared:DustMaterial|undefined,users=0,idle:ReturnType<typeof setTimeout>|undefined;
export function acquireDustMaterial(){
 clearTimeout(idle);if(shared?.isContextLost()){shared.dispose();shared=undefined;}shared??=new DustMaterial();users++;
 const material=shared;let released=false;
 return {material,release(){if(released)return;released=true;if(--users===0)idle=setTimeout(()=>{shared?.dispose();shared=undefined;},30000);}};
}
