/** Shared, bounded GPU atlas. Real volume integration, not a blurred disc.
 * Premultiplied absorption preserves charcoal smoke on a light board. */
const vertex=`attribute vec2 a; varying vec2 uv; void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv; uniform float time; uniform float mode;
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.37,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .53*noise(p)+.27*noise(p*2.03+4.1)+.13*noise(p*4.07+7.7)+.07*noise(p*8.13);}
void main(){
 vec2 xy=(uv-.5)*2.6; vec4 sum=vec4(0.);
 for(int i=0;i<22;i++){
  vec3 p=vec3(xy,1.12-float(i)*.104);
  vec3 adv=p*3.8+vec3(.3*time,-time*2.1,time*.35);
  float n=fbm(adv+vec3(.65*sin(p.y*3.+time),0.,0.));
  float detail=fbm(adv*1.8+vec3(0.,-time*1.4,3.));
  float shape;
  if(mode<.5){shape=1.-length(p*vec3(1.,1.,1.05));}
  else if(mode<1.5){float taper=.60-.30*clamp((p.y+.85)/1.8,0.,1.);vec3 q=p;q.x+=sin(p.y*4.-time*3.)*.09;shape=1.-length(vec3(q.x/taper,(q.y+.13)/1.08,q.z/.48));}
  else if(mode<2.5){shape=1.-length(p*vec3(1.,.87,1.1));}
  else{shape=1.-length(p*vec3(.94,.90,1.1));}
  float density=smoothstep(.05,.30,shape+(n-.5)*.72);
  float tendril=smoothstep(.19,.50,n+.12*detail);
  density*=tendril;
  float heat=clamp(shape*.97+n*.79+detail*.17-.37,0.,1.);
  if(mode>2.5)heat*=.12;
  if(mode>1.5&&mode<2.5)heat*=.83;
  vec3 smoke=mix(vec3(.055,.046,.052),vec3(.36,.30,.28),clamp(.42+p.y*.3+p.z*.24+(detail-.5)*.6,0.,1.));
  vec3 fire=mix(vec3(.37,.025,.006),vec3(1.,.19,.015),smoothstep(.12,.39,heat));
  fire=mix(fire,vec3(1.,.64,.10),smoothstep(.39,.65,heat));
  fire=mix(fire,vec3(1.,.96,.69),smoothstep(.66,.88,heat));
  vec3 col=mix(smoke,fire,smoothstep(.18,.36,heat));
  float alpha=density*(mode>2.5?.17:.23);
  sum.rgb+=(1.-sum.a)*col*alpha; sum.a+=(1.-sum.a)*alpha;
 }
 gl_FragColor=sum;
}`;
export class Combustion {
 readonly canvas=document.createElement('canvas');
 private gl:WebGLRenderingContext|null;private program?:WebGLProgram;private buffer?:WebGLBuffer;private uniforms:{time:WebGLUniformLocation|null;mode:WebGLUniformLocation|null}|undefined;
 readonly size=256; lost=false;
 constructor(){this.canvas.width=this.size*4;this.canvas.height=this.size;
  this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,preserveDrawingBuffer:true});
  const gl=this.gl;if(!gl)return;
  const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'Combustion shader');return s;};
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram()!;gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'Combustion program');this.program=p;gl.useProgram(p);
  const b=gl.createBuffer()!;this.buffer=b;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);this.uniforms={time:gl.getUniformLocation(p,'time'),mode:gl.getUniformLocation(p,'mode')};
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true});
 }
 get available(){return !!this.gl&&!this.lost}
 update(ms:number){const gl=this.gl;if(!gl||this.lost)return;gl.useProgram(this.program!);gl.uniform1f(this.uniforms!.time,ms*.001);for(let i=0;i<4;i++){gl.viewport(i*this.size,0,this.size,this.size);gl.uniform1f(this.uniforms!.mode,i);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}}
 draw(c:CanvasRenderingContext2D,kind:number,x:number,y:number,w:number,h=w,angle=0,alpha=1){if(alpha<=0||w<=0||h<=0)return;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=Math.max(0,Math.min(1,alpha));if(this.available)c.drawImage(this.canvas,kind*this.size,0,this.size,this.size,-w*.5,-h*.5,w,h);else{const g=c.createRadialGradient(0,0,0,0,0,w*.45);g.addColorStop(0,kind===3?'#645d58':'#fff0b9');g.addColorStop(.35,kind===3?'#554b4960':'#ec6c22');g.addColorStop(1,'#3f241b00');c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h)}c.restore()}
 dispose(){const gl=this.gl;if(gl){if(this.program)gl.deleteProgram(this.program);if(this.buffer)gl.deleteBuffer(this.buffer);gl.getExtension('WEBGL_lose_context')?.loseContext()}this.gl=null;this.canvas.width=1;this.canvas.height=1}
}
