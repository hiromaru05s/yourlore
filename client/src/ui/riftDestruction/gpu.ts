import {createRiftEngraving} from '../riftInkGlyphs';
type P={x:number;y:number};
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec2 aUV;
layout(location=1) in vec2 aCenter;
layout(location=2) in float aDepth;
layout(location=3) in float aId;
layout(location=4) in float aLayer;
uniform float clockMs,aspect,style;
out vec2 uv;out vec3 world;out float side;flat out int pieceId;
float ease(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec3 pressure(vec2 st,float t){
 vec2 d=st-vec2(.47,.44);float hold=ease(.27,.46,t)*(1.-ease(.63,.73,t)),release=ease(.63,1.,t),tension=release*release;
 float dome=exp(-dot(d/vec2(.43,.54),d/vec2(.43,.54))*1.2);
 vec2 r=st-.5-(st-.5)*vec2(.026,.018)*hold+d*vec2(.055+.24*dome,.035+.17*dome)*tension;
 return vec3(r.x,r.y*aspect-.015*ease(.10,.45,t)-.055*dome*tension,dome*.11*tension);
}
void main(){
 float ms=clockMs;uv=aUV;pieceId=int(aId+.5);side=aLayer;
 vec3 pos=pressure(aUV,min(1.,ms/440.));
 float release=ease(440.,650.,ms),contract=1.-ease(1190.,1590.,ms);
 if(ms>=440.&&ms<1590.){
  vec3 origin=pressure(aCenter,1.);vec2 delta=aCenter-.5;
  float delay=abs(delta.x)*190.,open=ease(440.+delay,730.+delay,ms),curl=ease(660.+delay,1130.+delay,ms),signX=delta.x<0.?-1.:1.;
  float angle=signX*.42*open;mat2 rot=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
  vec2 broken=origin.xy+vec2(signX*.17,-signX*.1*aspect)*open+rot*(pos.xy-origin.xy);
  float turn=ease(680.,1590.,ms)*3.1,a=atan(delta.y,delta.x)+turn+(aUV.x-aCenter.x)*3.1;
  float rad=(.40+aDepth*.055+(aUV.y-aCenter.y)*.32)*contract;
  rad+=sin((aUV.x-aCenter.x)*20.+ms*.004+aDepth*5.)*.011*curl*contract;
  pos.xy=mix(broken,vec2(cos(a),sin(a)*.92)*rad,curl);
  pos.z=mix(origin.z+(aUV.x-aCenter.x)*signX*.52*open, sin(a)*.095*contract+(aUV.y-aCenter.y)*.24*contract,curl);
 }
 float thick=mix(.023,.032,step(1.5,style))*release*contract;
 pos.z-=aLayer*thick;
 pos.xy+=vec2(.38,.72)*aLayer*thick;
 if(ms>=1590.){
  float grow=ease(1590.,1670.,ms),vanish=1.-ease(1900.,1970.,ms);
  pos=vec3((uv.x-.5)*.82*grow*vanish,(uv.y-.5)*.03*sin(uv.x*3.141593)*vanish,0.);
 }
 world=pos;gl_Position=vec4(pos.x/1.4,-pos.y/1.7,-pos.z*.65,1.);
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 uv;in vec3 world;in float side;flat in int pieceId;
uniform sampler2D art,engraving;
uniform float clockMs,style;
uniform vec4 edges[72];uniform int edgeCounts[6];
out vec4 color;
float ease(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.07+8.)*.28+noise(p*4.13-5.)*.15;}
void main(){
 float ms=clockMs,t=ms*.001,coat=ease(30.,420.,ms),unseal=ease(360.,600.,ms);
 vec4 tex=texture(art,uv);if(tex.a<.025)discard;
 float d=2.;for(int j=0;j<12;j++){if(j>=edgeCounts[pieceId])break;vec4 e=edges[pieceId*12+j];vec2 q=e.zw-e.xy;float f=clamp(dot(uv-e.xy,q)/max(dot(q,q),.0000001),0.,1.);d=min(d,length(uv-e.xy-q*f));}
 float bevel=(1.-ease(.001,.014,d))*unseal,edge=(1.-ease(.0007,.0028,d))*unseal;
 vec2 drift=vec2(t*.035,-t*.047),warp=vec2(fbm(uv*5.+drift),fbm(uv*5.-drift+9.));
 float grain=fbm(uv*19.+warp*2.4),wave=sin(uv.x*27.+sin(uv.y*13.+warp.x*3.)*3.8+uv.y*9.);
 float veins=1.-smoothstep(.035,.09+max(fwidth(wave),.025),abs(wave));
 float fineWave=sin(uv.y*73.+uv.x*29.+warp.y*12.);float fine=1.-smoothstep(.015,.045+max(fwidth(fineWave),.03),abs(fineWave));
 float engravingInk=texture(engraving,uv).r;
 float under=texture(engraving,uv+vec2(.006,-.008)*(1.+sin(t*1.3)*.25)).r;
 vec3 N=normalize(cross(dFdx(world),dFdy(world)));if(N.z<0.)N=-N;
 N=normalize(N+vec3((grain-.5)*.22,(wave*.08)*coat,0.));
 vec3 L=normalize(vec3(-.48,-.66,1.2)),H=normalize(L+vec3(0,0,1));
 float ndl=max(0.,dot(N,L)),fres=pow(1.-max(0.,N.z),2.6);
 float sweep=uv.x*.80+uv.y*.53-t*.37+float(pieceId)*.038;
 float reflection=exp(-pow((sin(sweep*4.6)-.1)*9.,2.));
 float spec=pow(max(0.,dot(N,H)),mix(34.,90.,step(.5,style)*(1.-step(1.5,style))));
 vec3 ink=mix(vec3(.014,.010,.024),vec3(.085,.055,.12),grain*.8);
 ink*=.50+ndl*.78;
 // Five coupled surface scales: substrate, relief, engraving, capillary light, optical reflection.
 ink+=vec3(.13,.09,.19)*veins*(.25+.35*sin(t*1.8+uv.y*4.)*sin(t*1.8+uv.y*4.));
 ink+=vec3(.15,.11,.21)*fine*.20;
 ink+=vec3(.55,.46,.68)*engravingInk*(.32+.44*ease(200.,850.,ms));
 ink+=vec3(.68,.59,.79)*(edge*(.28+.45*reflection)+bevel*ndl*.12);
 if(style<.5){ink+=vec3(.68,.60,.77)*(spec*.25+reflection*.16+fres*.18);}
 else if(style<1.5){ink+=vec3(.82,.75,.91)*(spec*.44+reflection*.39+fres*.25);ink+=vec3(.21,.12,.31)*veins*.3;}
 else{ink+=vec3(.39,.24,.58)*under*.60;ink+=vec3(.65,.56,.78)*(reflection*.23+fres*.28+spec*.24);}
 if(side>.15){ink*=.42+ndl*.30;ink+=vec3(.29,.20,.39)*edge*.27;ink+=vec3(.18,.13,.23)*pow(max(0.,sin(side*25.+uv.y*8.)),14.)*unseal;}
 vec3 result=mix(tex.rgb,ink,coat);
 // The material and its marks stay visible on the narrowing transfer ribbon.
 if(ms>=1590.)result=mix(result,vec3(.58,.43,.73),.45)+vec3(.22,.18,.26)*veins;
 color=vec4(result,tex.a);
}`;
function clip(poly:P[],a:number,b:number,d:number){const out:P[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],u=p.x*a+p.y*b-d,v=q.x*a+q.y*b-d;if(u<=0)out.push(p);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}}return out;}
function geometry(){
 const sites=[{x:.21,y:.23},{x:.22,y:.76},{x:.49,y:.12},{x:.50,y:.55},{x:.80,y:.37},{x:.79,y:.84}],vertices:number[]=[],edges=new Float32Array(72*4),counts=new Int32Array(6);
 sites.forEach((s,id)=>{
  let poly:P[]=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];sites.forEach((q,j)=>{if(j!==id)poly=clip(poly,2*(q.x-s.x),2*(q.y-s.y),q.x*q.x+q.y*q.y-s.x*s.x-s.y*s.y);});
  const center={x:poly.reduce((a,p)=>a+p.x,0)/poly.length,y:poly.reduce((a,p)=>a+p.y,0)/poly.length};
  // The original capture's card silhouette, rounded in the sampled albedo.
  for(const [a,b,d]of [[-1,0,-.098],[1,0,.902],[0,-1,-.061],[0,1,.939]])poly=clip(poly,a,b,d);
  const depth=(()=>{const n=Math.sin((id*4.7+404)*127.1+311.7)*43758.5453;return n-Math.floor(n);})();
  const emit=(p:P,layer:number)=>vertices.push(p.x,p.y,center.x,center.y,depth,id,layer);
  const c={x:poly.reduce((a,p)=>a+p.x,0)/poly.length,y:poly.reduce((a,p)=>a+p.y,0)/poly.length};
  counts[id]=poly.length;poly.forEach((p,j)=>{const q=poly[(j+1)%poly.length];edges.set([p.x,p.y,q.x,q.y],(id*12+j)*4);});
  // Static tessellation; deformation and every material detail are evaluated on the GPU.
  for(const layer of [0,1])for(let e=0;e<poly.length;e++){
   const a=poly[e],b=poly[(e+1)%poly.length],n=10,point=(i:number,j:number)=>({x:c.x+(a.x-c.x)*i/n+(b.x-c.x)*j/n,y:c.y+(a.y-c.y)*i/n+(b.y-c.y)*j/n});
   for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){emit(point(i,j),layer);emit(point(i+1,j),layer);emit(point(i,j+1),layer);if(i+j<n-1){emit(point(i+1,j),layer);emit(point(i+1,j+1),layer);emit(point(i,j+1),layer);}}
  }
  for(let e=0;e<poly.length;e++){const a=poly[e],b=poly[(e+1)%poly.length];for(let j=0;j<16;j++){const p={x:a.x+(b.x-a.x)*j/16,y:a.y+(b.y-a.y)*j/16},q={x:a.x+(b.x-a.x)*(j+1)/16,y:a.y+(b.y-a.y)*(j+1)/16};emit(p,0);emit(q,0);emit(q,1);emit(p,0);emit(q,1);emit(p,1);}}
 });return{vertices:new Float32Array(vertices),edges,counts};
}
export class RiftGPU{
 readonly canvas=document.createElement('canvas');private gl:WebGL2RenderingContext;private program:WebGLProgram;private buffer:WebGLBuffer;private textures:WebGLTexture[]=[];private face?:HTMLCanvasElement;private faces=new Map<HTMLCanvasElement,WebGLTexture>();private count=0;private loc:Record<string,WebGLUniformLocation|null>={};
 constructor(){
  const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});if(!gl)throw new Error('WebGL2 unavailable');this.gl=gl;this.canvas.width=Math.ceil(672*Math.min(devicePixelRatio||1,2)/128)*128;this.canvas.height=Math.ceil(this.canvas.width*3.4/2.8);
  const compile=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;};
  const vs=compile(gl.VERTEX_SHADER,VERT),fs=compile(gl.FRAGMENT_SHADER,FRAG),program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Link failed');gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;gl.useProgram(program);
  this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const mesh=geometry();gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);this.count=mesh.vertices.length/7;
  [2,2,1,1,1].forEach((size,index)=>{const offsets=[0,2,4,5,6];gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,28,offsets[index]*4);});
  for(const name of ['clockMs','aspect','style','art','engraving','edges[0]','edgeCounts[0]'])this.loc[name]=gl.getUniformLocation(program,name);
  gl.uniform4fv(this.loc['edges[0]'],mesh.edges);gl.uniform1iv(this.loc['edgeCounts[0]'],mesh.counts);gl.uniform1i(this.loc.art,0);gl.uniform1i(this.loc.engraving,1);
  this.upload(createRiftEngraving(),1);gl.enable(gl.SCISSOR_TEST);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
 }
 private upload(image:HTMLCanvasElement,unit:number){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);const t=this.textures[unit]??=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 draw(face:HTMLCanvasElement,ms:number,style:number,aspect:number,width:number){
  const gl=this.gl;if(gl.isContextLost())throw new Error('WebGL context lost');const w=Math.max(8,Math.ceil(width*2.8)),h=Math.max(8,Math.ceil(width*3.4));if(this.canvas.width<w||this.canvas.height<h){this.canvas.width=Math.max(this.canvas.width,w);this.canvas.height=Math.max(this.canvas.height,h);}gl.viewport(0,this.canvas.height-h,w,h);gl.scissor(0,this.canvas.height-h,w,h);
  if(this.face!==face){const cached=this.faces.get(face);if(cached){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cached);}else{this.textures[0]=gl.createTexture()!;this.upload(face,0);this.faces.set(face,this.textures[0]);}this.face=face;}
  gl.useProgram(this.program);gl.uniform1f(this.loc.clockMs,ms);gl.uniform1f(this.loc.aspect,aspect);gl.uniform1f(this.loc.style,style);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,this.count);return {canvas:this.canvas,width:w,height:h};
 }
 forgetFace(face:HTMLCanvasElement){const texture=this.faces.get(face);if(texture)this.gl.deleteTexture(texture);this.faces.delete(face);if(this.face===face)this.face=undefined;}
 dispose(){const gl=this.gl;this.faces.forEach(t=>gl.deleteTexture(t));this.faces.clear();gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);this.textures.forEach(t=>gl.deleteTexture(t));gl.getExtension('WEBGL_lose_context')?.loseContext();}
 get info(){return{renderer:this.gl.getParameter(this.gl.RENDERER),vertices:this.count,path:'WebGL2 static mesh / continuous procedural material'};}
}
