/** A deforming card mesh: albedo, real alpha, engraving, relief and emission share UVs.
 * No stationary card or detached VFX shapes are rendered below this surface. */
const vertex=`
precision highp float;
attribute vec3 grid;
uniform float clockMs,mode,ratio,scale;
varying vec2 uv;varying vec3 world;varying float fold;
float ease(float a,float b,float x){float q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
void main(){
 uv=grid.xy;float t=clockMs*.001;
 float a=ease(420.,1140.,clockMs)*(1.-ease(1590.,2240.,clockMs));fold=a;
 float x=uv.x-.5,y=(.5-uv.y)*ratio,z=0.;
 float side=sign(x),hinge=a*(0.94+.05*sin(t*2.+side*.5));
 float ax=abs(x);x=side*ax*cos(hinge);z=ax*sin(hinge);
 y+=a*.06*sin(ax*6.)*sin(y*3.);
 z+=a*.025*sin(y*8.)*ax;
 float turn=fold*-.12;
 float xx=x*cos(turn)+z*sin(turn);z=-x*sin(turn)+z*cos(turn);x=xx;
 float pitch=fold*-.12;float yy=y*cos(pitch)-z*sin(pitch);z=y*sin(pitch)+z*cos(pitch);y=yy;
 x*=scale;y*=scale;z*=scale;world=vec3(x,y,z);
 float perspective=3.5/(3.5-z);
 gl_Position=vec4(x*perspective/1.2,y*perspective/1.6,-z/3.,1.);
}`;
const fragment=`
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 uv;varying vec3 world;varying float fold;
uniform sampler2D face,tile,engraving;
uniform float clockMs,mode;
float sat(float x){return clamp(x,0.,1.);}
float ease(float a,float b,float x){float q=sat((x-a)/(b-a));return q*q*(3.-2.*q);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.54+noise(p*2.03+4.)*.29+noise(p*4.07+8.)*.17;}
float lum(vec3 c){return dot(c,vec3(.22,.7,.08));}
vec4 surface(vec2 q){return mix(texture2D(face,q),texture2D(tile,q),ease(1920.,2240.,clockMs));}
void main(){
 vec4 a=surface(uv);if(a.a<.012)discard;
 float t=clockMs*.001,charge=ease(90.,600.,clockMs)*(1.-ease(2340.,2920.,clockMs));
 vec2 px=vec2(.0028,.0019);float edge=max(max(a.a-surface(uv+vec2(px.x,0.)).a,a.a-surface(uv-vec2(px.x,0.)).a),max(a.a-surface(uv+vec2(0.,px.y)).a,a.a-surface(uv-vec2(0.,px.y)).a));
 float relief=length(vec2(lum(surface(uv+vec2(px.x,0.)).rgb)-lum(surface(uv-vec2(px.x,0.)).rgb),lum(surface(uv+vec2(0.,px.y)).rgb)-lum(surface(uv-vec2(0.,px.y)).rgb)));
 float n=fbm(uv*9.+vec2(t*.18,-t*.28)),fine=fbm(uv*27.-t*.08);
 float veins=pow(sat(1.-abs(n-.51)*17.),4.);
 float thread=pow(sat(1.-abs(fine-.5)*24.),5.);
 float etch=texture2D(engraving,uv).r;
 float sweep=exp(-pow((uv.y-mix(.95,.05,ease(120.,950.,clockMs)))*14.,2.));
 vec3 normal=normalize(cross(dFdx(world),dFdy(world)));normal*=sign(normal.z);
 vec3 light=normalize(vec3(-.45,.65,1.));
 float diffuse=max(0.,dot(normal,light));float spec=pow(max(0.,dot(reflect(-light,normal),vec3(0.,0.,1.))),22.);
 vec3 violet=vec3(.48,.25,.74),silver=vec3(.92,.85,1.);
 if(mode>.5&&mode<1.5){violet=vec3(.65,.43,.23);silver=vec3(1.,.92,.75);}
 if(mode>1.5&&mode<2.5){violet=vec3(.23,.46,.66);silver=vec3(.75,.93,1.);}
 if(mode>2.5&&mode<3.5){violet=vec3(.53,.28,.67);silver=vec3(.98,.83,1.);}
 if(mode>3.5){violet=vec3(.39,.35,.66);silver=vec3(.89,.89,1.);}
 vec3 color=a.rgb;
 float transformed=fold*(mode<.5?.78:mode<1.5?.12:mode<2.5?.55:.22);
 color=mix(color,color*.5+violet*.25,transformed);
 color*=mix(1.,.38+diffuse*.72,fold);
 color+=silver*spec*fold*.60;
 color+=violet*(veins*.29+thread*.13)*charge;
 color+=silver*(etch*.58+edge*1.3+relief*sweep*.9+sweep*.08)*charge;
 if(mode<.5)color+=silver*(veins*.32+thread*.13)*fold;
 if(mode>.5&&mode<1.5)color+=silver*exp(-abs(uv.x-.5)*110.)*fold*.52;
 if(mode>1.5&&mode<2.5){float facets=abs(normal.x)*.7+abs(normal.y)*.7;color+=silver*(facets*.25+spec*.5)*fold;}
 if(mode>2.5&&mode<3.5){float sel=abs(fract(uv.y*8.)-.5);color+=silver*pow(sat((sel-.43)/.07),2.)*fold*.65;}
 if(!gl_FrontFacing)color=mix(vec3(.15,.10,.23)+a.rgb*.33+silver*etch*.65,color,.30)+silver*(spec*.4+edge*charge*.7);
 gl_FragColor=vec4(color,a.a);
}`;

export class QuestFoldMaterial {
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext|null;private program:WebGLProgram|null=null;
 private textures:WebGLTexture[]=[];private meshes:{buffer:WebGLBuffer;count:number}[]=[];private dead=false;
 constructor(face:HTMLCanvasElement,tile:HTMLCanvasElement,pattern:HTMLCanvasElement){
  this.canvas.width=900;this.canvas.height=1200;
  const g=this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!g||!g.getExtension('OES_standard_derivatives')){this.dispose();this.gl=null;return;}
  try {
  const shader=(type:number,code:string)=>{const s=g.createShader(type)!;g.shaderSource(s,code);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s)||'Quest shader compile failed');return s;};
  const vs=shader(g.VERTEX_SHADER,vertex),fs=shader(g.FRAGMENT_SHADER,fragment),p=this.program=g.createProgram()!;g.attachShader(p,vs);g.attachShader(p,fs);g.linkProgram(p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p)||'Quest shader link failed');g.useProgram(p);
  for(const img of [face,tile,pattern]){const tex=g.createTexture()!;this.textures.push(tex);g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);}
  // Selected folio: the original face is the folding mesh, with one crease.
  for(const [nx,ny,bands]of [[64,96,1]]){const vertices:number[]=[];
   for(let band=0;band<bands;band++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)for(const [dx,dy]of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]])vertices.push((x+dx)/nx,(band+(y+dy)/ny)/bands,band);
   const buffer=g.createBuffer()!;g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(vertices),g.STATIC_DRAW);this.meshes.push({buffer,count:vertices.length/3});}
  for(const [i,name]of ['face','tile','engraving'].entries())g.uniform1i(g.getUniformLocation(p,name),i);
  g.frontFace(g.CW);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);
  }catch(error){this.dispose();throw error;}
 }
 get available(){return !!this.gl&&!this.dead&&!this.gl.isContextLost();}
 draw(ms:number,ratio=1.5,scale=1):HTMLCanvasElement|null{
  const mode=1,g=this.gl,p=this.program;if(!g||!p||!this.available)return null;
  g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(p);
  for(const [unit,index]of [[0,0],[1,1],[2,2]]){g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,this.textures[index]);}
  const mesh=this.meshes[0];g.bindBuffer(g.ARRAY_BUFFER,mesh.buffer);const a=g.getAttribLocation(p,'grid');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,3,g.FLOAT,false,0,0);
  for(const [name,value]of Object.entries({mode,clockMs:ms,ratio,scale}))g.uniform1f(g.getUniformLocation(p,name),value);
  g.drawArrays(g.TRIANGLES,0,mesh.count);return this.canvas;
 }
 dispose(){if(this.dead)return;this.dead=true;const g=this.gl;if(g){for(const tex of this.textures)g.deleteTexture(tex);for(const mesh of this.meshes)g.deleteBuffer(mesh.buffer);g.deleteProgram(this.program);g.getExtension('WEBGL_lose_context')?.loseContext();}}
}
