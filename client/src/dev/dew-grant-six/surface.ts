/** One shared material pass per renderer. Surface relief and refraction stay in the
 * icon's own UVs; the authored assembly player owns geometry and timing. */
const V=`attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const F=`precision highp float;varying vec2 uv;uniform sampler2D art;uniform float time;uniform float kind;uniform float heat;uniform float brand;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(hash(a),hash(a+vec2(1,0)),b.x),mix(hash(a+vec2(0,1)),hash(a+1.),b.x),b.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.11)*.13;}
float line(float d,float w){return 1.-smoothstep(w,w*2.,abs(d));}
float relief(vec2 p){
 if(kind<.5)return noise(p*vec2(5.,110.))*.05+pow(max(0.,1.-length((p-.5)*1.4)),3.)*.7;
 if(kind<1.5)return sin(length((p-vec2(.5,.52))*vec2(1.,1.1))*35.-time*9.)*.075+fbm(p*5.+vec2(time*.3,-time*.4))*.22;
 if(kind<2.5){vec2 f=fract(p*9.);return max(abs(f.x-.5),abs(f.y-.5))*.3+noise(floor(p*9.))*.22;}
 if(kind<3.5)return sin(p.x*80.)*sin(p.y*80.)*.03+sin(p.x*12.+time)*.2;
 if(kind<4.5)return pow(abs(sin(p.x*15.+p.y*11.+fbm(p*7.)*9.)),16.)*.25;
 return fbm(p*12.+vec2(0.,time*.15))*.2+pow(1.-abs(sin(p.x*9.+p.y*13.+fbm(p*9.)*12.)),8.)*.17;
}
void main(){vec2 p=vec2(uv.x,1.-uv.y);vec4 original=texture2D(art,p);if(original.a<.005){gl_FragColor=vec4(0.);return;}
 float h=relief(p);float e=.0025;vec2 grad=vec2(relief(p+vec2(e,0.))-relief(p-vec2(e,0.)),relief(p+vec2(0.,e))-relief(p-vec2(0.,e)))/(.012);
 float interior=smoothstep(.10,.24,p.x)*smoothstep(.10,.24,1.-p.x)*smoothstep(.07,.23,p.y)*smoothstep(.07,.23,1.-p.y);
 vec2 warped=p+grad*.0018*heat*interior;vec4 tex=texture2D(art,warped);vec3 n=normalize(vec3(-grad*.48,1.));vec3 l=normalize(vec3(-.55,-.7,1.));float spec=pow(max(dot(reflect(-l,n),vec3(0.,0.,1.)),0.),32.);
 float diffuse=dot(n,l);vec3 cool=mix(vec3(.34,.94,.74),vec3(.93,.31,.12),brand);float vein=pow(max(0.,1.-abs(sin(p.x*17.+p.y*13.+fbm(p*8.)*8.))),24.);
 float travel=exp(-pow((p.y-(time*.38-.13))/ .13,2.));
 vec3 col=tex.rgb*(1.+(diffuse-.70)*heat*.36*interior)+cool*spec*heat*.24*interior;
 col+=cool*vein*travel*heat*.18*interior;
 // Small grazing highlights and fine scratches, not a uniform emissive fill.
 float scratch=pow(noise(p*vec2(18.,490.)),18.);col+=vec3(1.,.94,.8)*scratch*heat*.13*interior;
 gl_FragColor=vec4(mix(original.rgb,col,heat),original.a);
}`;
export class Surface{
 canvas=document.createElement('canvas');gl:WebGLRenderingContext|null;program?:WebGLProgram;textures=new Map<HTMLImageElement,WebGLTexture>();disposed=false;
 constructor(){this.canvas.width=this.canvas.height=256;this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});const g=this.gl;if(!g)return;
  const compile=(type:number,src:string)=>{const s=g.createShader(type)!;g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s)||'Shader failed');return s};
  const v=compile(g.VERTEX_SHADER,V),f=compile(g.FRAGMENT_SHADER,F),p=g.createProgram()!;g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error('Surface link failed');this.program=p;g.useProgram(p);const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const a=g.getAttribLocation(p,'p');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);g.viewport(0,0,256,256);
 }
 draw(image:HTMLImageElement,kind:number,time:number,heat:number,brand:boolean):HTMLImageElement|HTMLCanvasElement{const g=this.gl,p=this.program;if(!g||!p||this.disposed||g.isContextLost())return image;
  let tex=this.textures.get(image);if(!tex){tex=g.createTexture()!;this.textures.set(image,tex);g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);}else g.bindTexture(g.TEXTURE_2D,tex);
  for(const [key,value]of Object.entries({kind,time,heat,brand:brand?1:0}))g.uniform1f(g.getUniformLocation(p,key),value);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,6);return this.canvas;
 }
 dispose(){if(this.disposed)return;this.disposed=true;const g=this.gl;if(g){for(const t of this.textures.values())g.deleteTexture(t);if(this.program)g.deleteProgram(this.program);g.getExtension('WEBGL_lose_context')?.loseContext();}this.textures.clear();}
}
