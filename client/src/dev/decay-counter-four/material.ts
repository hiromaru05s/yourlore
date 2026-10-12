// Four distinct surface fields share lighting and a single bounded WebGL context.
// The native card remains visible and owns its art, name, stats and count.
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 uv;uniform float phase;uniform float variant;uniform float strength;uniform vec2 anchor;
float sat(float x){return clamp(x,0.,1.);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.09)*.12+noise(p*8.3)*.05;}
float segment(vec2 p,vec2 a,vec2 b){vec2 d=b-a;float t=clamp(dot(p-a,d)/dot(d,d),0.,1.);return length(p-a-d*t);}
float smax(float a,float b,float k){float h=sat(.5+.5*(a-b)/k);return mix(b,a,h)+k*h*(1.-h);}
vec2 cells(vec2 p){vec2 i=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(i+g),hash(i+g+91.));float d=length(g+.16+o*.68-f);if(d<a){b=a;a=d;}else{b=min(b,d);}}}return vec2(a,b-a);}
vec3 field(vec2 p){
 float grow=smoothstep(.07,.51,phase),withdraw=smoothstep(.58,.94,phase);float grain=fbm(p*30.);float f=-1.,detail=0.,height=0.;
 if(variant<.5){
  // A rooted, branching network: length grows first, thickness follows.
  vec2 root=mix(vec2(.16,.50),anchor,withdraw);float reach=grow*(1.-withdraw);float d=1.;
  for(int i=0;i<6;i++){
   float fi=float(i),a=-1.13+fi*.40;vec2 dir=vec2(cos(a),sin(a));
   vec2 end=root+dir*vec2(.66,.49)*( .69+.25*hash(vec2(fi,3.)) );
   vec2 mid=mix(root,end,.52)+vec2(sin(fi*7.)*.09,cos(fi*3.)*.055);
   vec2 q=p+vec2(sin(p.y*39.+fi)*.004,sin(p.x*42.)*.003);
   float first=sat(reach*2.),last=sat(reach*2.-1.);
   float trunk=min(segment(q,root,mix(root,mid,max(.001,first))),segment(q,mid,mix(mid,end,max(.001,last))))+.001*fi;
   if(first<.999)trunk=segment(q,root,mix(root,mid,max(.001,first)))+.001*fi;
   d=min(d,trunk);
   for(int j=0;j<2;j++){
    float fj=float(j);float at=.38+fj*.26;vec2 start=at<.52?mix(root,mid,at/.52):mix(mid,end,(at-.52)/.48);vec2 tip=start+vec2(dir.x*.09+(fj-.5)*.11,dir.y*.13);
    float br=sat((reach-.34-fj*.23)*3.1);
    if(br>.001)d=min(d,segment(q,start,mix(start,tip,br))+.006);
   }
  }
  f=.018*min(1.,grow*3.)*(1.-withdraw*.72)-d+(grain-.5)*.006;
  detail=grain; height=sqrt(sat(f/.018));
 }else if(variant<1.5){
  // Wet capillary lobes merge into one sheet, then drain to the count.
  vec2 center=mix(vec2(.35,.39),anchor,withdraw);vec2 q=(p-center)/vec2(1.,1.12);
  float r=(.008+grow*.255)*(1.-withdraw);
  f=r-length(q)+(fbm(p*11.+vec2(phase*.15,0.))-.5)*.07*grow*(1.-withdraw);
  f=smax(f,r*.53-length(q-vec2(.19,-.065)*(1.-withdraw)),.055);
  f=smax(f,r*.64-length(q-vec2(-.06,.20)*(1.-withdraw)),.055);
  f=min(f,(1.-withdraw)*.1);detail=fbm(p*22.);height=sqrt(sat(f/.17))*(.85+.15*fbm(p*8.));
 }else if(variant<2.5){
  // Angular mineral islands with recessed Voronoi seams, no radial burst.
  vec2 center=mix(vec2(.66,.35),anchor,withdraw);vec2 q=(p-center)/vec2(.95,1.1);
  vec2 cell=cells(p*11.5+vec2(noise(p*5.),noise(p*5.+7.))*.45);float envelope=(grow*.36)*(1.-withdraw)-length(q)+(fbm(p*9.)-.5)*.13;
  float seam=cell.y-.037-(1.-grow)*.045;
  f=min(envelope,seam*.28);detail=cell.x; height=sat(cell.y*9.)*.65+noise(p*80.)*.15;
 }else{
  // A broad asymmetric skin peels upward with a raised curled lip.
  // The exposed original face remains under the membrane; no detached prop.
  float retract=withdraw;vec2 base=mix(vec2(.50,.72),anchor,retract);
  vec2 q=(p-base)/max(.025,1.-retract);
  float tip=-.56*grow,edgeY=q.y-tip;
  float width=.26*(.85+.15*sin(q.y*13.+1.4))*(.45+.55*smoothstep(0.,.13,edgeY));
  float torn=noise(q*37.)*.014+sin(q.y*61.)*.004;
  float envelope=min(width-abs(q.x+.055*sin(q.y*9.)),min(edgeY,-q.y+.01));
  float tear=length((q-vec2(-.13,-.20))/vec2(1.,1.2))-(.055*grow);
  f=min(envelope,tear)*(1.-retract)-torn*.18;
  float lip=exp(-pow((edgeY-.035)/.027,2.));
  detail=.5+.5*sin(q.y*55.+q.x*7.);
  height=sat(f/.018)*(.15+lip*.78+sin(q.y*46.+q.x*8.)*.05);

 }
 float edge=min(min(p.x-.085,.915-p.x),min(p.y-.11,.92-p.y));
 f=min(f,edge);return vec3(f,detail,height);
}
void main(){
 vec2 p=vec2(uv.x,1.-uv.y);vec3 m=field(p);float alpha=smoothstep(-.002,.003,m.x);
 if(phase<=.001||phase>=1.){gl_FragColor=vec4(0.);return;}
 float dx=dFdx(m.z)*92.,dy=-dFdy(m.z)*124.;
 vec3 n=normalize(vec3(-dx,-dy,1.));vec3 light=normalize(vec3(-.6,-.8,1.));
 float diffuse=max(0.,dot(n,light)),spec=pow(max(0.,dot(reflect(-light,n),vec3(0,0,1))),24.);
 float rim=exp(-abs(m.x)*210.);vec3 deep,body,bright;
 if(variant<.5){deep=vec3(.055,.082,.025);body=vec3(.26,.34,.075);bright=vec3(.82,.83,.40);}
 else if(variant<1.5){deep=vec3(.026,.075,.036);body=vec3(.18,.31,.072);bright=vec3(.75,.88,.46);}
 else if(variant<2.5){deep=vec3(.083,.075,.043);body=vec3(.18,.33,.21);bright=vec3(.62,.72,.40);}
 else{deep=vec3(.10,.084,.032);body=vec3(.40,.32,.13);bright=vec3(.87,.84,.52);}
 vec3 color=mix(deep,body,.36+diffuse*.55)+bright*spec*.85;
 color+=bright*rim*(.12+diffuse*.32);color*=.77+m.y*.37;
 if(variant>1.5&&variant<2.5)color=mix(vec3(.28,.13,.047),color,smoothstep(.012,.045,m.x));
 float opacity=variant> .5&&variant<1.5?.62:.91;
 if(variant>2.5)opacity=.87;
 float shadow=exp(-max(0.,-m.x)*145.)*(1.-alpha)*.24;
 alpha=max(alpha*opacity,shadow)*smoothstep(0.,.10,phase);
 color=mix(vec3(.025,.037,.015),color,smoothstep(-.001,.002,m.x));
 gl_FragColor=vec4(color,alpha*strength);
}`;
export const TILE_W=256,TILE_H=320;
export type Request={variant:number;phase:number;anchor:[number,number]};
export class Material {
 readonly canvas=document.createElement('canvas');
 private gl:WebGLRenderingContext;private program:WebGLProgram;private buffer:WebGLBuffer;private disposed=false;
 constructor(){
  this.canvas.width=TILE_W*4;this.canvas.height=TILE_H;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL unavailable');this.gl=gl;gl.getExtension('OES_standard_derivatives');
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram()!;
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Shader link failed');
  this.program=p;this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 }
 drawBatch(requests:Request[]){
  if(this.disposed)return;const g=this.gl;g.useProgram(this.program);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);
  const a=g.getAttribLocation(this.program,'position');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);
  for(const [i,r]of requests.entries()){
   g.viewport(i*TILE_W,0,TILE_W,TILE_H);
   g.uniform1f(g.getUniformLocation(this.program,'variant'),r.variant);g.uniform1f(g.getUniformLocation(this.program,'phase'),r.phase);g.uniform1f(g.getUniformLocation(this.program,'strength'),1);g.uniform2f(g.getUniformLocation(this.program,'anchor'),...r.anchor);
   g.drawArrays(g.TRIANGLES,0,6);
  }
  return this.canvas;
 }

 dispose(){if(this.disposed)return;this.disposed=true;const g=this.gl;g.deleteBuffer(this.buffer);g.deleteProgram(this.program);g.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=this.canvas.height=1;}
}
