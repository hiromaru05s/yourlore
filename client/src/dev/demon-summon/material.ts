const vert=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const frag=`precision highp float;
varying vec2 uv;uniform sampler2D face;uniform float time,kind;
float sat(float x){return clamp(x,0.,1.);}
float e(float a,float b,float x){float t=sat((x-a)/(b-a));return t*t*(3.-2.*t);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fb(vec2 p){return n(p)*.57+n(p*2.07+7.)*.28+n(p*4.13-3.)*.15;}
vec4 sampleFace(vec2 p){return texture2D(face,clamp(p,.001,.999))*step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
void main(){
 float t=time/1000.;float cover=e(.28,1.15,t)*(1.-e(1.85,2.95,t));float bend=e(.65,1.42,t)*(1.-e(1.85,2.85,t));
 vec2 p=(uv-.5)*vec2(2.35,-3.55),q=p;float r=length(p),a=atan(p.y,p.x);
 // Twelve deformations act on the illustration, frame, veins and silhouette together.
 if(kind<.5){q.x/=(1.-bend*.91);q.y+=sin(q.y*5.+t)*bend*.06;}
 else if(kind<1.5){q.y=(p.y-bend*.45)/(1.-bend*.48);q.x+=sin(p.y*9.-t*2.)*bend*.075;}
 else if(kind<2.5){q.x/=1.-bend*.60;q.y+=abs(q.x)*bend*.58;}
 else if(kind<3.5){q*=1.+bend*.17;q.x+=sin(p.y*14.)*bend*.024;}
 else if(kind<4.5){float row=floor((p.y+.78)*5.);q.x-=sin(row*2.+t)*bend*.16;q.y/=1.-bend*.18;}
 else if(kind<5.5){q.x-=sign(p.x+p.y*.6)*bend*.17;q.y+=q.x*bend*.48;}
 else if(kind<6.5){q.x+=sin(floor((p.x+.5)*3.)*2.+t)*bend*.18;q.y+=sign(q.x)*bend*.13;}
 else if(kind<7.5){q/=1.+bend*(.12+.085*sin(t*13.));q.x+=sin(p.y*7.+t*3.)*bend*.05;}
 else if(kind<8.5){q.x+=sin(p.y*10.+t*5.)*bend*.065;q.y=(p.y+bend*.22)/(1.+bend*.18);}
 else if(kind<9.5){q.x=sign(p.x)*(abs(p.x)-bend*.25)/(1.-bend*.68);q.y+=abs(q.x)*bend*.16;}
 else if(kind<10.5){q.y+=bend*.23;q.x/=1.-bend*.22+max(0.,p.y)*bend*.22;}
 else{float angle=a-bend*4.5*(1.-min(1.,r));q=vec2(cos(angle),sin(angle))*r/(1.-bend*.64);}
 vec2 st=vec2((q.x+.62)/1.24,.5-q.y/1.79556);vec4 tex=sampleFace(st);
 float noise=fb(q*6.+vec2(t*.13,-t*.32));float fine=fb(q*19.+noise*2.-t*.2);
 float veins=pow(sat(1.-abs(noise-.49)*19.),3.);float hair=pow(sat(1.-abs(fine-.5)*35.),4.);
 float sweep=cover*1.65-.22;float coating=1.-smoothstep(sweep-.10,sweep+.08,noise+q.y*.14);
 float edge=exp(-abs(noise+q.y*.14-sweep)*55.);
 vec3 ink=vec3(.019,.014,.030)+vec3(.049,.023,.065)*noise;
 vec3 accent=kind<3.?vec3(.55,.37,.75):kind<6.?vec3(.62,.39,.52):kind<9.?vec3(.76,.16,.36):vec3(.64,.40,.77);
 float dx=length(sampleFace(st+vec2(.003,0.)).rgb-sampleFace(st-vec2(.003,0.)).rgb);
 float dy=length(sampleFace(st+vec2(0.,.002)).rgb-sampleFace(st-vec2(0.,.002)).rgb);
 float detail=sat((dx+dy)*1.8);
 float runes=step(.93,sin(st.y*190.))*step(.42,abs(st.x-.5))*step(abs(st.x-.5),.47);
 vec3 color=mix(tex.rgb,ink,coating*.87);
 color+=accent*(veins*.24+hair*.13+detail*.10+runes*.18)*cover;
 color+=accent*edge*.75;
 float alpha=tex.a;
 float ridge=max(max(tex.a-sampleFace(st+vec2(.008,0.)).a,tex.a-sampleFace(st-vec2(.008,0.)).a),max(tex.a-sampleFace(st+vec2(0.,.005)).a,tex.a-sampleFace(st-vec2(0.,.005)).a));
 color+=accent*ridge*cover*.9;
 gl_FragColor=vec4(color,alpha);
}`;
/** One shared context and bounded texture per card: repeated playback allocates no GPU resources. */
export class DemonMaterial{
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private program:WebGLProgram;private buffer:WebGLBuffer;private textures=new Map<HTMLCanvasElement,WebGLTexture>();
 constructor(){const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
 const compile=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader error');return s;};
 const vs=compile(gl.VERTEX_SHADER,vert),fs=compile(gl.FRAGMENT_SHADER,frag),p=gl.createProgram()!;gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Link error');gl.useProgram(p);this.program=p;
 this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.uniform1i(gl.getUniformLocation(p,'face'),0);}
 draw(face:HTMLCanvasElement,kind:number,time:number,size:number){const gl=this.gl;if(gl.isContextLost())throw new Error('WebGL context lost');const w=Math.min(800,Math.max(256,Math.round(size/16)*16)),h=Math.round(w*3.55/2.35);if(this.canvas.width!==w){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.useProgram(this.program);
 let tex=this.textures.get(face);if(!tex){tex=gl.createTexture()!;this.textures.set(face,tex);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);}else gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.uniform1f(gl.getUniformLocation(this.program,'time'),time);gl.uniform1f(gl.getUniformLocation(this.program,'kind'),kind);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;}
 dispose(){const gl=this.gl;this.textures.forEach(t=>gl.deleteTexture(t));this.textures.clear();gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
