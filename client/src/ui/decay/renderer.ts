import {fixedFaceGLSL} from './fixed-face';
export const DECAY_DURATION=2080;
const vertex=`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D face;uniform float t;
float sat(float a){return clamp(a,0.,1.);}float sm(float a,float b,float x){float v=clamp((x-a)/(b-a),0.,1.);return v*v*(3.-2.*v);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.58+noise(p*2.03)*.28+noise(p*4.1)*.14;}
float box(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}
${fixedFaceGLSL}
void main(){vec4 card=fixedFace((uv-.5)*3.4,t);if(t>=2.08)card.a=0.;gl_FragColor=vec4(card.rgb*card.a,card.a);}
`;
export class Renderer{
 private canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private program:WebGLProgram;private tex:WebGLTexture;private buffer:WebGLBuffer;private source:HTMLCanvasElement|null=null;
 constructor(resolution=600){this.canvas.width=this.canvas.height=resolution;const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');this.gl=gl;try{
 const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader');return s;};
 const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);this.program=gl.createProgram()!;gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program)||'link');gl.useProgram(this.program);
 this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);this.tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }catch(error){gl.getExtension('WEBGL_lose_context')?.loseContext();throw error;}
 }
 draw(c:CanvasRenderingContext2D,face:HTMLCanvasElement,ms:number,x:number,y:number,w:number){const gl=this.gl;if(this.source!==face){gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);this.source=face;}gl.uniform1f(gl.getUniformLocation(this.program,'t'),ms/1000);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);c.drawImage(this.canvas,x-w*1.7,y-w*1.7,w*3.4,w*3.4);}
 dispose(){this.gl.deleteTexture(this.tex);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.source=null;}
}
