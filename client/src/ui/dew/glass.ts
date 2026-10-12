/** Frozen optical material from approved T2, 2026-10-08.
 * Authored implicit liquid surfaces, optical shading, and background refraction.
 * Shape animation is deterministic art direction, not a fluid dynamics solver. */
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D backdrop;uniform vec2 resolution;uniform vec2 center;uniform float extent;uniform float kind;uniform float time;uniform float settle;uniform float dark;uniform float design;
float sm(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float ell(vec3 p,vec3 r){float a=length(p/r),b=length(p/(r*r));return a*(a-1.)/max(b,.0001);}
float shape(vec3 p){
 float w=sin(time*2.),v=cos(time*2.);p.x+=.045*sin(p.y*3.6+time*3.)*(1.-settle);float d;
 if(kind<.5){vec3 r=vec3(.67+w*.035,.77-w*.03,.66);d=ell(p,r);d+=sin(p.x*6.+time*3.)*sin(p.y*5.-time*2.)*.008;}
 else if(kind<1.5){float neck=.5+.5*sin(time*1.);vec3 q=p;q.x-=.06*sin(p.y*2.+time*2.);d=ell(q-vec3(0.,-.28,0.),vec3(.62,.59,.57));d=sm(d,ell(q-vec3(.025,.25+neck*.08,0.),vec3(.34,.53+neck*.18,.32)),.25);d=sm(d,ell(q-vec3(.07,.81+neck*.12,0.),vec3(.12,.26,.12)),.18);}
 else if(kind<2.5){float pinch=.5+.5*sin(time*1.);d=ell(p-vec3(.07,-.27,0.),vec3(.60,.58,.55));d=sm(d,ell(p-vec3(-.06,.34,0.),vec3(.12+.13*(1.-pinch),.63,.17)),.22);d=sm(d,ell(p-vec3(-.11,.91+pinch*.42,0.),vec3(.17,.22,.16)),.11*(1.-pinch)+.015);}
 else if(kind<3.5){float s=.5+.5*sin(time*2.);vec3 q=p;q.x-=sin(p.y*3.+time*1.)*.09;d=ell(q-vec3(.02,-.50,0.),vec3(.44,.45,.42));d=sm(d,ell(q-vec3(-.06,.70,0.),vec3(.27,.32,.25)),.18);d=sm(d,ell(q-vec3(0.,.08,0.),vec3(.095+.06*s,.68,.10+.04*s)),.17);}
 else{float sep=.06+.64*(.5+.5*cos(time*2.));float bend=sin(time*2.)*.12;d=sm(ell(p-vec3(-sep,.13+bend,.03),vec3(.45,.60,.46)),ell(p-vec3(sep,-.13-bend,-.03),vec3(.49,.57,.47)),.20+.22*(1.-sep));}
 return d;
}
vec3 normal(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
vec3 env(vec3 r){
 vec3 base=mix(vec3(.20,.25,.28),vec3(.72,.79,.81),smoothstep(-.2,.85,r.y));
 // Finite area lights produce broad reflected windows with soft boundaries.
 float panel=smoothstep(.77,.82,dot(r,normalize(vec3(-.65,.9,1.1))))*(1.-smoothstep(.22,.31,abs(r.x+.42)));
 float stripe=smoothstep(.88,.91,dot(r,normalize(vec3(.85,.18,.65))))*(1.-smoothstep(.12,.20,abs(r.y-.13)));
 float top=pow(max(dot(r,normalize(vec3(-.3,.95,.2))),0.),70.);
 return base+vec3(2.4,2.65,2.6)*panel+vec3(1.05,.87,.62)*stripe+vec3(2.)*top;
}
vec3 back(vec2 p){return pow(texture2D(backdrop,clamp(p,vec2(.001),vec2(.999))).rgb,vec3(2.2));}
void main(){vec2 xy=(uv-.5)*3.2;vec3 ro=vec3(xy,3.0),rd=vec3(0.,0.,-1.);float dist=0.;float hit=0.;vec3 p;
 for(int i=0;i<64;i++){p=ro+rd*dist;float d=shape(p);if(d<.0018){hit=1.;break;}dist+=max(d*.8,.001);if(dist>5.)break;}
 if(hit<.5){gl_FragColor=vec4(0.);return;}
 vec3 n=normal(p),v=-rd;float facing=max(dot(n,v),0.);float fres=.0204+.9796*pow(1.-facing,5.);
 vec3 into=refract(rd,n,1./1.333);vec3 inside=p+into*.014;float travel=.014;
 for(int i=0;i<40;i++){float d=shape(inside);if(d>0.&&travel>.03)break;float stepSize=max(abs(d)*.72,.012);inside+=into*stepSize;travel+=stepSize;}
 vec3 exitN=normal(inside);vec3 outgoing=refract(into,-exitN,1.333);float tir=step(length(outgoing),.001);outgoing=mix(outgoing,reflect(into,-exitN),tir);
 vec2 screen=center+vec2(xy.x,-xy.y)*extent/3.2;
 vec2 offset=vec2(into.x,-into.y)*travel*extent*.22+vec2(outgoing.x,-outgoing.y)*extent*.09;
 vec3 transmitted=back((screen+offset)/resolution);
 vec3 attenuation=kind>2.5&&kind<3.5?vec3(.48,.075,.16):vec3(.055,.012,.024);
 transmitted*=exp(-attenuation*travel);
 vec3 reflected=env(reflect(rd,n));vec3 col=mix(transmitted,reflected,min(.92,fres+tir*.25));
 vec3 halfV=normalize(normalize(vec3(-.45,.85,1.3))+v);float spec=pow(max(dot(n,halfV),0.),180.);col+=vec3(1.,1.,.94)*spec*.7;
 // Folded transmitted light on the rear surface. No painted outline or glow.
 float focus=pow(max(dot(exitN,normalize(vec3(.4,-.7,-1.))),0.),45.);col+=vec3(.12,.17,.14)*focus*(1.-fres);

 // A restrained stylized layer is applied to the liquid surface, after optical shading.
 // design=-1 is the unchanged transparent reference.
 if(design>-.5){
  float light=dot(n,normalize(vec3(-.45,.8,.7)))*.5+.5;
  float cel=.22+.32*smoothstep(.32,.39,light)+.30*smoothstep(.69,.76,light);
  vec3 jade=mix(vec3(.017,.12,.11),vec3(.22,.61,.40),cel);
  float rim=1.-smoothstep(.10,.48,facing);
  float litRim=pow(1.-facing,1.8)*smoothstep(-.2,.4,-n.x+n.y*.65);
  if(design<.5){
   col=mix(col,jade,.32);col=mix(col,vec3(.016,.14,.12),rim*.27);
   col+=vec3(.32,.48,.31)*smoothstep(.70,.78,light)*.08;
  }else if(design<1.5){
   col=mix(col,jade,.075);col=mix(col,vec3(.009,.12,.11),rim*.72);
   col+=vec3(.68,.85,.60)*litRim*.66;
  }else if(design<2.5){
   col=mix(col,jade,.12);
   float wave=p.y+.18*sin(p.x*4.+time);
   float band=(1.-smoothstep(.07,.11,abs(wave+.29)))*.6+(1.-smoothstep(.028,.053,abs(wave-.34)))*.55;
   col=mix(col,vec3(.026,.31,.24),clamp(band,0.,1.)*.64);
   float edge=(1.-smoothstep(.011,.025,abs(wave+.19)))*(1.-smoothstep(.3,.95,abs(p.x)));
   col+=vec3(.32,.50,.32)*edge*.40;col=mix(col,vec3(.016,.14,.12),rim*.22);
  }else if(design<3.5){
   col=mix(col,jade,.065);
   vec2 heart=p.xy-vec2(.035*sin(time*1.5),-.08);heart.x-=heart.y*.24;
   float core=1.-smoothstep(.55,1.25,length(heart/vec2(.24-.10*heart.y,.43)));
   col=mix(col,vec3(.008,.24,.14),core*.63);
   float ember=exp(-dot((heart-vec2(-.055,.11))*vec2(11.,6.),(heart-vec2(-.055,.11))*vec2(11.,6.)));
   col+=vec3(.13,.33,.10)*ember*.45;
   col=mix(col,vec3(.014,.13,.11),rim*.30);
  }else if(design<4.5){
   col=mix(col,jade,.18);col=mix(col,vec3(.017,.15,.13),rim*.32);col+=vec3(.36,.56,.38)*litRim*.27;
  }else{
   col=mix(col,jade,.13);float fold=1.-smoothstep(.012,.04,abs(p.x+.24*sin(p.y*3.-time)));
   col+=vec3(.16,.31,.20)*fold*.23;col=mix(col,vec3(.016,.16,.12),rim*.25);
  }
 }
 col=pow(max(col,vec3(0.)),vec3(1./2.2));gl_FragColor=vec4(col,1.);
}`;
export class Glass{
 canvas=document.createElement('canvas');gl:WebGLRenderingContext|null;program?:WebGLProgram;texture?:WebGLTexture;buffer?:WebGLBuffer;disposed=false;
 constructor(){this.canvas.width=this.canvas.height=320;const g=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});if(!g)return;
 const shader=(type:number,source:string)=>{const s=g.createShader(type)!;g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s)||'Liquid shader');return s};
 const p=this.program=g.createProgram()!,v=shader(g.VERTEX_SHADER,vertex),f=shader(g.FRAGMENT_SHADER,fragment);g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p)||'Liquid link');g.useProgram(p);
 this.buffer=g.createBuffer()!;g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const a=g.getAttribLocation(p,'position');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);
 this.texture=g.createTexture()!;g.bindTexture(g.TEXTURE_2D,this.texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
 }
 draw(bg:HTMLCanvasElement,x:number,y:number,extent:number,kind:number,time:number,dark:boolean,pixels=320,design=-1){const g=this.gl,p=this.program;if(!g||!p||this.disposed||g.isContextLost())return null;const size=Math.max(64,Math.min(640,Math.round(pixels)));if(this.canvas.width!==size)this.canvas.width=this.canvas.height=size;g.viewport(0,0,size,size);g.useProgram(p);g.bindTexture(g.TEXTURE_2D,this.texture!);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,bg);g.uniform2f(g.getUniformLocation(p,'resolution'),bg.width,bg.height);g.uniform2f(g.getUniformLocation(p,'center'),x,y);for(const [key,value]of Object.entries({extent,kind,time,settle:0,dark:dark?1:0,design}))g.uniform1f(g.getUniformLocation(p,key),value);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,6);return this.canvas;}
 dispose(){if(this.disposed)return;this.disposed=true;const g=this.gl;if(g){g.deleteBuffer(this.buffer!);g.deleteTexture(this.texture!);g.deleteProgram(this.program!);g.getExtension('WEBGL_lose_context')?.loseContext();}}
}
