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
 for(int i=0;i<10;i++){
  float fi=float(i),side=mod(fi,2.)*2.-1.,seed=hash(vec2(fi,kind+3.));
  float theta=fi*2.399963;float along=sin(theta);float delay=seed*.06;float a=max(0.,t-delay);
  float go=1.-exp(-a*(kind==4.?7.:3.8));float reach=kind==0.?.43:kind==1.?.44:kind==2.?.34:kind==3.?.52:kind==4.?.65:.36;
  // Ground-hugging lobes expand from the card's contact footprint.
  vec2 normal=vec2(cos(theta),sin(theta)*.34);
  vec2 center=vec2(normal.x*(.43+reach*go),.63+normal.y*(.20+go*.48));
  vec2 size=vec2(.20+.15*go,.105+.085*go);
  if(kind==0.){size=vec2(.24,.038+.025*go);center.y=.67+normal.y*(.17+go*.34);}
  if(kind==1.){size=vec2(.19,.15)*(.7+go);center.y-=sin(a*2.)*.10;}
  if(kind==2.){size*=.74;center.y+=a*.035;}
  if(kind==3.){size=vec2(.32,.045);center.y+=sin(go*4.+fi)*.055;}
  if(kind==4.){size=vec2(.17,.075);center.y=.68+normal.y*(.19+go*.70);}
  if(kind==5.){size=vec2(.17,.09);center.y-=a*.055;}
  vec2 q=(p-center)/size;float angle=atan(q.y,q.x),r=length(q);
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
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private p:WebGLProgram;private b:WebGLBuffer;
 constructor(){const g=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!g)throw Error('WebGL is unavailable');this.gl=g;
 const shader=(type:number,src:string)=>{const s=g.createShader(type)!;g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s)||'shader');return s;};const vs=shader(g.VERTEX_SHADER,vertex),fs=shader(g.FRAGMENT_SHADER,fragment);this.p=g.createProgram()!;g.attachShader(this.p,vs);g.attachShader(this.p,fs);g.linkProgram(this.p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(this.p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.p)||'link');g.useProgram(this.p);this.b=g.createBuffer()!;g.bindBuffer(g.ARRAY_BUFFER,this.b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const at=g.getAttribLocation(this.p,'position');g.enableVertexAttribArray(at);g.vertexAttribPointer(at,2,g.FLOAT,false,0,0);}
 draw(kind:number,age:number,front:boolean,size:number){const g=this.gl;const n=Math.max(256,Math.min(680,Math.round(size)));if(this.canvas.width!==n){this.canvas.width=this.canvas.height=n;}g.viewport(0,0,n,n);g.useProgram(this.p);g.uniform1f(g.getUniformLocation(this.p,'age'),age);g.uniform1f(g.getUniformLocation(this.p,'kind'),kind);g.uniform1f(g.getUniformLocation(this.p,'front'),front?1:0);g.drawArrays(g.TRIANGLES,0,6);return this.canvas;}
 dispose(){this.gl.deleteBuffer(this.b);this.gl.deleteProgram(this.p);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
