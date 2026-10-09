/** Selected crown material, preserving the approved revision 2 shader. Generated alpha
 * assets retain their aspect ratio; no source card picture enters this renderer. */
const vertex=`attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 vUv;uniform sampler2D art;uniform vec2 resolution;uniform float time;uniform float variant;uniform float still;
float sat(float x){return clamp(x,0.,1.);}float ease(float a,float b,float x){return smoothstep(a,b,x);}mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.13)*.27+noise(p*4.2)*.13+noise(p*8.4)*.05;}
vec4 tex(vec2 uv){if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec4(0.);return texture2D(art,uv);}
void main(){float t=still>.5?3.7:time;float finish=ease(5.25,6.55,t);float alive=1.-ease(6.2,6.9,t);
// Coordinates are image-space, preserving 3:2 throughout.
vec2 p=(vUv-.5)*resolution;float span=min(resolution.x/960.,resolution.y/620.)*730.;vec2 q=p/vec2(span,span/1.5);q.y=-q.y;
float enter=ease(.85,2.35,t);float settle=1.+.023*sin((t-2.3)*11.)*exp(-max(0.,t-2.3)*3.)*step(2.3,t);float scale=mix(.75,1.,enter)*settle;q/=scale;
vec2 uv=q+.5;vec4 color=vec4(0.);float local=enter;
if(variant<.5){
 // Each crown blade has its own arrival and vertical weight.
 for(int i=0;i<7;i++){float fi=float(i),delay=abs(fi-3.)*.09;float f=ease(1.0+delay,2.35+delay,t);vec2 u=uv;u.y-=(1.-f)*(.4+abs(fi-3.)*.06);u.x+=(fi-3.)*.025*(1.-f);u.y+=finish*(.08+fi*.006);float lo=fi/7.,hi=(fi+1.)/7.;if(u.x>=lo&&u.x<hi){vec4 s=tex(u);s.a*=f;color=mix(color,s,s.a>0.?1.:0.);}}
}
// Material forms through its own surface, with a narrow emissive fracture edge.
float n=fbm(uv*vec2(15.,22.));float field=n*.46+(1.-uv.y)*.38+abs(uv.x-.5)*.2;
float amount=local*1.32-finish*1.5;float mask=smoothstep(field-.07,field+.04,amount);float edge=(1.-smoothstep(.0,.045,abs(field-amount)))*step(.08,local)*(1.-step(.99,local)*(1.-step(.01,finish)));
float sheen=exp(-pow((uv.x+uv.y*.23-(t-2.55)*.52),2.)/ .0015)*ease(2.6,2.9,t)*(1.-ease(4.5,4.9,t));
vec3 warm=variant>2.5&&variant<3.5?vec3(.6,.58,.94):vec3(1.,.79,.43);color.rgb+=warm*edge*1.2+vec3(1.,.91,.71)*sheen*.24;
color.a*=mask*alive;if(color.a<.004)discard;gl_FragColor=color;
}`;
export class MaterialRenderer{
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private program:WebGLProgram;private textures:WebGLTexture[]=[];private uniforms:Record<string,WebGLUniformLocation|null>={};private buffer:WebGLBuffer;
 constructor(images:HTMLImageElement[]){
 const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGLが利用できません');this.gl=gl;
 const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader');return s;};
 const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);this.program=gl.createProgram()!;gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program)||'link');gl.useProgram(this.program);
 this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 for(const name of ['art','resolution','time','variant','still'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);for(const image of images){const texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.textures.push(texture);}
 }
 draw(w:number,h:number,id:number,t:number,reduced=false){const gl=this.gl;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[id]);gl.uniform1i(this.uniforms.art,0);gl.uniform2f(this.uniforms.resolution,w,h);gl.uniform1f(this.uniforms.time,t);gl.uniform1f(this.uniforms.variant,id);gl.uniform1f(this.uniforms.still,reduced?1:0);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;}
 destroy(){for(const t of this.textures)this.gl.deleteTexture(t);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
