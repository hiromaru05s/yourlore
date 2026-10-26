export const materials=[
 {id:0,name:'鏡面の銀',en:'MIRROR SILVER',tag:'SILVER',color:'#d8dce1',description:'磨いた白銀。深い彫り込みに、澄んだ光が滑る。'},
 {id:1,name:'流光の金',en:'FLOWING GOLD',tag:'GOLD',color:'#eec56d',description:'深い金の彫り込みを、暖かな光が磨いていく。'},
 {id:2,name:'黒曜の熔脈',en:'OBSIDIAN EMBER',tag:'OBSIDIAN',color:'#f58d5a',description:'艶やかな黒曜石。細い裂け目の奥に、熔岩が灯る。'},
 {id:3,name:'虹彩の真珠',en:'NACRE PRISM',tag:'PEARL',color:'#c9b6ee',description:'真珠の層に、青・桃・淡金の干渉色が揺れる。'},
 {id:4,name:'翠銅の秘紋',en:'VERDIGRIS RUNES',tag:'VERDIGRIS',color:'#77d2b6',description:'古びた銅と緑青。刻まれた細い紋が順に灯る。'},
] as const;
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
interface Surface {texture:WebGLTexture;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;width:number;height:number;key:string;kind:number;time:number;}
interface Binding {node:HTMLElement;surface:Surface;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;visible:boolean;}
/** Material lives only on the existing light frame pixels. There is no new outer
 * geometry, blur, filter extent, or replacement card asset. */
export class FrameMaterials {
 private gl:WebGLRenderingContext;private canvas=document.createElement('canvas');private program:WebGLProgram;
 private surfaces=new Map<string,Promise<Surface>>();private bindings=new Set<Binding>();private textures=new Map<string,Promise<{texture:WebGLTexture;width:number;height:number}>>();
 private observer:IntersectionObserver;private dead=false;
 enabled=true;
 constructor(){
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('フレーム材質のプレビューにはWebGLが必要です。');this.gl=gl;
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'shader');return s;};
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram()!;gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'link');this.program=p;gl.useProgram(p);
  const b=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.disable(gl.BLEND);
  this.observer=new IntersectionObserver(entries=>{for(const e of entries)for(const b of this.bindings)if(b.node===e.target)b.visible=e.isIntersecting;},{rootMargin:'100px'});
 }
 private texture(url:string){
  let pending=this.textures.get(url);if(pending)return pending;
  pending=(async()=>{const img=new Image();img.src=url;await img.decode();if(this.dead)throw new Error('disposed');const w=img.width,h=img.height,source=document.createElement('canvas');source.width=w;source.height=h;const ctx=source.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,w,h);
   for(let p=0;p<data.data.length;p+=4){const r=data.data[p]/255,g=data.data[p+1]/255,b=data.data[p+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?((max-min)/max):1;
    // Neutral ivory and its warm carved shadows only. Saturated type colors,
    // navy art aperture, colored stat seals and transparent exterior stay exact.
    const neutral=1-smooth(.17,.32,sat),warm=r>=g&&g>=b&&g/Math.max(r,.001)>.67?1-smooth(.42,.64,sat):0;
    const lit=smooth(.14,.32,max),matte=Math.min(1,Math.max(0,(r+g+b)*10-.65));
    const x=(p/4)%w,y=Math.floor(p/4/w);
    const titleInterior=url.includes('/base-')&&x>w*.16&&x<w*.84&&y>h*.083&&y<h*.186;
    data.data[p+3]=titleInterior?0:Math.round(data.data[p+3]*Math.max(neutral,warm)*lit*matte);
   }
   ctx.putImageData(data,0,0);const gl=this.gl,texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);source.width=0;return {texture,width:w,height:h};})();this.textures.set(url,pending);return pending;
 }
 private surface(url:string,kind:number){const key=`${url}|${kind}`;let p=this.surfaces.get(key);if(p)return p;p=(async()=>{const tx=await this.texture(url),width=tx.width>tx.height?256:tx.width===tx.height?160:512,height=Math.round(width*tx.height/tx.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return {...tx,width,height,canvas,ctx:canvas.getContext('2d')!,key,kind,time:NaN};})();this.surfaces.set(key,p);return p;}
 async attach(card:HTMLElement,kind:number){
  const parts=[...card.querySelectorAll<HTMLElement>('.card-frame,.seal-face')];
  for(const node of parts){const url=getComputedStyle(node).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!url)continue;const surface=await this.surface(url,kind);if(this.dead||!card.isConnected||!node.isConnected)return;
   const canvas=document.createElement('canvas');canvas.width=surface.width;canvas.height=surface.height;canvas.className='frame-material';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';node.append(canvas);const binding={node,surface,canvas,ctx:canvas.getContext('2d')!,visible:true};this.bindings.add(binding);this.observer.observe(node);
  }
  card.dataset.frameMaterial=String(kind);
 }
 draw(time:number){if(this.dead)return;const active=new Set<Surface>();for(const b of this.bindings){b.canvas.style.visibility=this.enabled?'':'hidden';if(b.visible&&b.node.isConnected&&this.enabled)active.add(b.surface);}
  const gl=this.gl;gl.useProgram(this.program);
  for(const s of active){if(s.time===time)continue;s.time=time;this.canvas.width=s.width;this.canvas.height=s.height;gl.viewport(0,0,s.width,s.height);gl.bindTexture(gl.TEXTURE_2D,s.texture);gl.uniform1i(gl.getUniformLocation(this.program,'art'),0);gl.uniform1f(gl.getUniformLocation(this.program,'time'),time);gl.uniform1f(gl.getUniformLocation(this.program,'kind'),s.kind);gl.uniform2f(gl.getUniformLocation(this.program,'resolution'),s.width,s.height);gl.drawArrays(gl.TRIANGLES,0,6);s.ctx.clearRect(0,0,s.width,s.height);s.ctx.drawImage(this.canvas,0,0);}
  for(const b of this.bindings){if(!b.visible||!b.node.isConnected||!this.enabled)continue;b.ctx.clearRect(0,0,b.canvas.width,b.canvas.height);b.ctx.drawImage(b.surface.canvas,0,0);}
 }
 clear(root?:HTMLElement){for(const b of this.bindings){if(root&&!root.contains(b.node))continue;this.observer.unobserve(b.node);b.canvas.remove();b.canvas.width=0;this.bindings.delete(b);}}
 get count(){return this.bindings.size;}
 dispose(){if(this.dead)return;this.clear();this.dead=true;this.observer.disconnect();for(const p of this.textures.values())void p.then(t=>this.gl.deleteTexture(t.texture)).catch(()=>{});for(const p of this.surfaces.values())void p.then(s=>s.canvas.width=0).catch(()=>{});this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=0;}
}
function smooth(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
