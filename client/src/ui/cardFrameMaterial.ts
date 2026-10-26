const vertex=`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a.x,-a.y,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D art;uniform float time;uniform float kind;uniform vec2 resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float band(float x,float width){return exp(-x*x/width);}
vec3 ramp(float l,vec3 dark,vec3 mid,vec3 light){return l<.63?mix(dark,mid,smoothstep(.12,.63,l)):mix(mid,light,smoothstep(.63,.97,l));}
// Fixed fracture planes: only the reflected light and buried heat move.
vec3 glassCells(vec2 p){
 vec2 cell=floor(p),f=fract(p);float first=10.,second=10.,facet=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 offset=vec2(float(x),float(y)),id=cell+offset;
  vec2 point=.18+.64*vec2(hash(id),hash(id+vec2(63.7,19.1)));
  float d=length(offset+point-f);
  if(d<first){second=first;first=d;facet=hash(id+7.3);}else second=min(second,d);
 }
 return vec3(second-first,facet,first);
}
void main(){
 vec4 src=texture2D(art,uv);float mask=src.a;if(mask<.001){gl_FragColor=vec4(0.);return;}
 float lum=dot(src.rgb,vec3(.2126,.7152,.0722));vec2 px=1./resolution;
 float dx=dot(texture2D(art,uv+vec2(px.x,0)).rgb-texture2D(art,uv-vec2(px.x,0)).rgb,vec3(.333));
 float dy=dot(texture2D(art,uv+vec2(0,px.y)).rgb-texture2D(art,uv-vec2(0,px.y)).rgb,vec3(.333));
 float emboss=clamp((dx*.8-dy)*5.,-.3,.3);
 float angle=atan((uv.y-.5)*1.5,uv.x-.5);
 float travel=pow(max(0.,cos(angle-time*.72)),22.);
 float travel2=pow(max(0.,cos(angle+time*.47+2.4)),38.);
 float sweep=pow(.5+.5*sin(uv.x*4.5+uv.y*5.5-time*1.8),18.);
 float fine=pow(.5+.5*sin(uv.x*5.+uv.y*7.-time*1.8+.17),120.);
 float grain=noise(uv*vec2(700.,1100.))-.5;
 vec3 color;
 if(kind<.5){
  color=ramp(lum,vec3(.075,.083,.098),vec3(.55,.565,.59),vec3(.91,.925,.945));
  float reflection=uv.y*13.+uv.x*5.+.55*sin(time*.42);
  float environment=.79+.16*sin(reflection)-.13*pow(.5+.5*cos(reflection*1.7+.5),8.);
  color*=environment;
  color+=vec3(.15,.16,.18)*(travel+travel2*.55);
  color+=vec3(.28,.285,.29)*sweep+vec3(.36,.37,.39)*fine;
  color+=emboss*vec3(.61,.63,.66)+grain*.012;
 }else if(kind<1.5){
  color=ramp(lum,vec3(.16,.055,.014),vec3(.66,.36,.055),vec3(1.,.8,.34));
  color*=.74+.16*sin(uv.y*13.-uv.x*3.);
  color+=vec3(.36,.25,.08)*travel+vec3(.6,.44,.19)*sweep+vec3(.63,.59,.42)*fine;
  color+=emboss*vec3(.75,.52,.23)+grain*vec3(.05,.035,.01);
 }else if(kind<2.5){
  vec3 stone=glassCells(uv*vec2(13.,20.));
  float crack=1.-smoothstep(.01,.042,stone.x);
  float heat=.3+.7*pow(.5+.5*sin(uv.y*9.-uv.x*5.-time*.72+stone.y*2.),3.);
  float molten=smoothstep(.3,.65,noise(uv*vec2(7.,11.)));
  color=ramp(lum,vec3(.003,.004,.006),vec3(.014,.016,.021),vec3(.065,.071,.083));
  color*=.68+stone.y*.55;
  float gloss=pow(.5+.5*sin(uv.y*6.+uv.x*9.+stone.y*3.-time*.62),36.);
  color+=vec3(.45,.47,.51)*gloss*(.32+.68*lum);
  color+=vec3(.025,.031,.04)*sweep+emboss*.12;
  float edge=(1.-smoothstep(.025,.095,stone.x))*(1.-crack);
  color+=vec3(.21,.23,.27)*edge*gloss;
  color+=vec3(.9,.16,.018)*crack*molten*heat;
  color+=vec3(.25,.028,.004)*(1.-smoothstep(.02,.14,stone.x))*molten*heat*.38;
 }else if(kind<3.5){
  float interference=uv.x*8.+uv.y*5.+noise(uv*vec2(5.,8.))*3.+time*.55;
  vec3 pearl=.7+.3*cos(interference+vec3(0.,2.1,4.2));
  color=ramp(lum,vec3(.15,.19,.28),vec3(.65,.69,.77),vec3(.95,.96,.94));
  color*=mix(vec3(1.),pearl,.56);
  color+=vec3(.23,.28,.31)*sweep+vec3(.19,.25,.3)*travel+emboss*.48;
  color+=vec3(.16,.18,.23)*pow(.5+.5*sin(uv.y*170.+noise(uv*12.)*7.-time*.4),18.)*.35;
 }else{
  float patina=smoothstep(.28,.7,noise(uv*vec2(24.,38.))*.6+noise(uv*vec2(53.,74.))*.4);
  vec3 copper=ramp(lum,vec3(.085,.036,.02),vec3(.43,.215,.092),vec3(.77,.49,.245));
  vec3 verdigris=ramp(lum,vec3(.016,.079,.065),vec3(.075,.38,.29),vec3(.28,.65,.5));
  color=mix(copper,verdigris,patina*.85)+emboss*.3;
  float cell=floor(uv.y*30.);
  float glyph=smoothstep(.022,.09,abs(dx)+abs(dy));
  float on=pow(.5+.5*sin(angle*2.-time*.95+cell*.12),8.);
  color+=vec3(.17,.76,.56)*glyph*(.08+.66*on);
  color+=vec3(.25,.38,.23)*travel*.33+vec3(.2,.16,.08)*fine;
 }
 gl_FragColor=vec4(clamp(color,0.,1.),mask);
}`;

interface Surface {canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;width:number;height:number;texture:WebGLTexture|null;kind:number;time:number;}
interface Binding {part:HTMLElement;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;surface:Surface;visible:boolean;}
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** One context and cached material prints for all cards. No layout, clips or filters are replaced. */
export class CardFrameMaterial {
 private output=document.createElement('canvas');
 private gl:WebGLRenderingContext|null;private program:WebGLProgram|null=null;
 private surfaces=new Map<string,Promise<Surface>>();private bindings=new Set<Binding>();
 private observer:IntersectionObserver;private dead=false;
 constructor(){
  this.gl=this.output.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  const gl=this.gl;
  if(gl){try{
   const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Frame shader');return shader;};
   const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram()!;gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Frame material link');this.program=p;gl.useProgram(p);
   const b=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.disable(gl.BLEND);
  }catch{this.gl=null;}}
  this.observer=new IntersectionObserver(entries=>{for(const e of entries)for(const b of this.bindings)if(b.part===e.target)b.visible=e.isIntersecting;},{rootMargin:'80px'});
 }
 private surface(url:string,kind:number){
  const key=url+'|'+kind;let pending=this.surfaces.get(key);if(pending)return pending;
  pending=(async()=>{
   const img=new Image();img.src=url;await img.decode();if(this.dead)throw Error('Frame renderer disposed');
   const width=img.width===img.height?192:512,height=Math.round(width*img.height/img.width),source=document.createElement('canvas');source.width=img.width;source.height=img.height;const sc=source.getContext('2d')!;sc.drawImage(img,0,0);const data=sc.getImageData(0,0,source.width,source.height),w=source.width,h=source.height;
   for(let p=0;p<data.data.length;p+=4){const r=data.data[p]/255,g=data.data[p+1]/255,b=data.data[p+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?(max-min)/max:1;
    const neutral=1-smooth(.17,.32,sat),warm=r>=g&&g>=b&&g/Math.max(r,.001)>.67?1-smooth(.42,.64,sat):0;
    const x=(p/4)%w,y=Math.floor(p/4/w),title=url.includes('/base-')&&x>w*.16&&x<w*.84&&y>h*.083&&y<h*.186;
    data.data[p+3]=title?0:Math.round(data.data[p+3]*Math.max(neutral,warm)*smooth(.14,.32,max)*Math.min(1,Math.max(0,(r+g+b)*10-.65)));
   }
   sc.putImageData(data,0,0);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;
   const gl=this.gl?.isContextLost()?null:this.gl;let texture:WebGLTexture|null=null;
   if(gl){texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}
   else{
    // Static material fallback preserves ownership and the same protected pixels.
    const tint=[[.91,.93,.96],[1.,.72,.23],[.08,.09,.11],[.87,.81,.95],[.24,.62,.43]][kind];
    for(let p=0;p<data.data.length;p+=4){const l=(data.data[p]+data.data[p+1]+data.data[p+2])/765;for(let k=0;k<3;k++)data.data[p+k]=Math.round(255*tint[k]*l);}
    sc.putImageData(data,0,0);ctx.drawImage(source,0,0,width,height);
   }
   source.width=0;return {canvas,ctx,width,height,texture,kind,time:NaN};
  })();this.surfaces.set(key,pending);return pending;
 }
 async attach(node:HTMLElement,kind:number,valid:()=>boolean){
  for(const part of node.querySelectorAll<HTMLElement>('.card-frame,.seal-face,.buff-frame,.buff-cost')){
   const style=getComputedStyle(part),url=(style.backgroundImage||part.style.backgroundImage).match(/url\(["']?(.*?)["']?\)/)?.[1]??(part.matches('.buff-cost')?getComputedStyle(part,'::before').backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]:undefined);
   const seal=part.matches('.buff-cost')||part.parentElement?.matches('.card-cost')?'cost':part.parentElement?.matches('.ad-atk')?'attack':part.parentElement?.matches('.ad-def')?'health':null;
   const source=url??(seal?`/art/biblion/modular/${seal}-print.webp`:undefined);
   if(!source)continue;const surface=await this.surface(source,kind);if(this.dead||!valid())return;
   if([...this.bindings].some(b=>b.part===part))continue;
   const canvas=part.querySelector<HTMLCanvasElement>(':scope > .card-frame-material')??document.createElement('canvas');canvas.className='card-frame-material';canvas.width=surface.width;canvas.height=surface.height;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';part.append(canvas);
   const b={part,canvas,ctx:canvas.getContext('2d')!,surface,visible:true};this.bindings.add(b);this.observer.observe(part);
  }
  this.draw(performance.now()/1000,true);
 }
 draw(time:number,force=false){
  if(this.dead)return;const active=new Set<Surface>();for(const b of this.bindings)if(force||(b.visible&&b.part.isConnected))active.add(b.surface);
  const gl=this.gl,p=this.program;if(gl&&p&&!gl.isContextLost()){gl.useProgram(p);for(const s of active){if(s.time===time)continue;s.time=time;this.output.width=s.width;this.output.height=s.height;gl.viewport(0,0,s.width,s.height);gl.bindTexture(gl.TEXTURE_2D,s.texture);gl.uniform1i(gl.getUniformLocation(p,'art'),0);gl.uniform1f(gl.getUniformLocation(p,'time'),time);gl.uniform1f(gl.getUniformLocation(p,'kind'),s.kind);gl.uniform2f(gl.getUniformLocation(p,'resolution'),s.width,s.height);gl.drawArrays(gl.TRIANGLES,0,6);s.ctx.clearRect(0,0,s.width,s.height);s.ctx.drawImage(this.output,0,0);}}
  for(const b of this.bindings)if(force||(b.visible&&b.part.isConnected)){b.ctx.clearRect(0,0,b.canvas.width,b.canvas.height);b.ctx.drawImage(b.surface.canvas,0,0);}
 }
 detach(node:HTMLElement){for(const b of this.bindings)if(node.contains(b.part)){this.observer.unobserve(b.part);b.canvas.remove();b.canvas.width=0;this.bindings.delete(b);}}
 dispose(){this.dead=true;this.observer.disconnect();for(const b of this.bindings){b.canvas.remove();b.canvas.width=0;}this.bindings.clear();for(const pending of this.surfaces.values())void pending.then(s=>{if(s.texture)this.gl?.deleteTexture(s.texture);s.canvas.width=0;}).catch(()=>{});this.surfaces.clear();this.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.output.width=0;}
}
