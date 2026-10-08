// One GPU context; each material and the source artwork use the same deformation clock.
const vertex=`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D face;uniform float time,variant,kind,reduced;
float sat(float x){return clamp(x,0.,1.);}float sm(float a,float b,float x){float v=sat((x-a)/(b-a));return v*v*(3.-2.*v);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fb(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.13)*.12+noise(p*8.1)*.05;}
float box(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
void main(){
 float t=time*(kind>1.5?1.10:1.);vec2 p=(uv-.5)*3.4,q=p;float fire=1.-step(.5,kind),royal=1.-abs(kind-1.);float weight=mix(.78,1.,royal);
 float charge=sm(.05,.56,t),unfold=sm(.40,1.15,t),returning=sm(1.48,2.72,t),active=charge*(1.-returning),spread=unfold*(1.-returning);
 if(reduced>.5){active=sm(0.,.16,t)*(1.-sm(.18,.42,t));spread=0.;}
 float clock=t*mix(.46,1.25,fire);vec2 flow=p*vec2(4.,2.5)-vec2(0.,clock*1.8);
 float n=fb(flow),fine=fb(p*33.+vec2(clock,-clock*2.));float material=10.,facet=0.,front=0.,surface=0.;vec2 mp=p;
 // 01: thick tapered tongues grow directly from the vertical card edges. Upward advection for fire;
 // black lacquer curls more slowly and retains its dark core.
 if(variant<.5){
  float rise=spread*(.19+fire*.15)*weight;float yy=p.y+.72;float sway=sin(yy*5.-clock*3.)*.075*spread;
  float side=.45+sway+sin(yy*3.)*.16*spread;
  float taper=sm(.97+rise,.02,yy)*(.045+spread*.16);
  float d=abs(abs(p.x)-side)-taper+(n-.5)*.14*spread;
  material=max(d,max(-.79-p.y,p.y-(.78+rise)));

  q.x-=sin(p.y*5.-clock)*spread*.055;
  surface=sm(.0,.65,abs(q.x))*active;mp=vec2(p.x*1.3,p.y-clock);
  front=sm(.35,.7,abs(p.x));
 }else if(variant<1.5){
  // 02: counter-moving helical sheets, joined to opposite sides of the source surface.
  float yy=p.y/.86,twist=yy*3.1-clock*2.0;
  float radius=.41+spread*.22*weight;float center=sin(twist)*radius;
  float width=(.012+spread*.095)*(1.-sm(.55,1.1,abs(yy)));
  material=max(min(abs(p.x-center),abs(p.x+center))-width,abs(p.y)-.92);
  material+= (n-.5)*.025;front=step(0.,cos(twist));
  q=rot(sin(p.y*4.-clock)*spread*.06)*p;q.x+=sin(p.y*5.+clock)*spread*.04;
  surface=pow(abs(sin(q.y*5.-clock)),8.)*active;mp=vec2(p.x+sin(twist),p.y*2.-clock);
 }else if(variant<2.5){
  // 03: six bevelled mineral shutters grow from the frame. Their thickness shrinks as they return.
  float row=floor((p.y+.75)*2.),cy=(row+.5)/2.-.75;
  float local=spread*sm(.12,.62,unfold+hash(vec2(row,7.))*.25);
  vec2 a=vec2(abs(p.x)-(.44+local*.08*weight),p.y-cy);
  a=rot(sign(p.x)*(.1+local*.26))*a;
  material=max(box(a,vec2(.03+local*.12,.23)),abs(p.y)-.83-local*.12);
  material+=sin(row*3.+p.y*22.)*.014*local;facet=1.;front=1.;
  q.x/=1.-spread*.07;q.y+=sin(p.x*8.)*spread*.025;
  surface=pow(1.-abs(sin(q.x*18.+q.y*9.+fb(q*8.)*4.)),18.)*active;
  mp=vec2(a.x*3.+row,a.y*4.);
 }else if(variant<3.5){
  // 04: actual ink folds into six tapered leaves, with a moving crease and shaded reverse side.
  float row=floor((p.y+.75)*4.),cy=(row+.5)/4.-.75;
  float delay=hash(vec2(row,8.))*.16;
  float s=sm(.38+delay,1.20+delay,t)*(1.-sm(1.55+delay,2.64,t));
  float fold=s*(.38+royal*.08);float x=abs(p.x);
  vec2 a=vec2(x-.44-fold*.18,p.y-cy-sin(x*6.+row)*fold*.18);
  material=max(box(a,vec2(.035+fold*.60,.09*(1.-sm(.50,1.,x)))),abs(p.y)-.80);
  facet=1.;front=1.;q.x=p.x/(1.+s*.10);q.y+=sin(p.x*7.+row)*s*.045;
  surface=sm(.3,.5,abs(q.x))*active;mp=vec2(x*4.+row,a.y*12.);
 }else if(variant<4.5){
  // 05: the surface first contracts, then releases a concave four-lobed pressure skin.
  float inhale=sm(.15,.77,t)*(1.-sm(.85,1.13,t));float blast=sm(.84,1.2,t)*(1.-sm(1.4,2.55,t));
  float angle=atan(p.y,p.x),r=length(p*vec2(1.,.72));
  vec2 z=p;z.x+=sin(p.y*6.+clock)*blast*.045;z.y+=sin(p.x*7.-clock)*blast*.06;
  float shell=box(z,vec2(.46+blast*.12,.69+blast*.14));
  material=abs(shell)-(.012+blast*.06);material+=(n-.5)*.09*blast;
  front=sm(.0,.045,shell);q/=1.-inhale*.13;
  surface=(1.-sm(.04,.20,abs(length(q)-(.68-inhale*.55))))*active;
  mp=vec2(angle*2.,r*5.-clock);spread=blast;active=max(active,blast);
 }else{
  // 06: the existing printed face becomes warped strips. Ribbon pigment is sampled from that
  // same row; alternate rows lead, then settle into their exact original location.
  float row=floor((p.y+.75)*6.),cy=(row+.5)/6.-.75;
  float lead=sin(row*1.7),s=sm(.38,.95,t)*(1.-sm(1.48+row*.018,2.7,t));
  float bend=sin(p.x*4.2+clock+row*.55)*s*.10;
  float scale=1.+s*(.26+.09*lead)*weight;
  q.x=(p.x-s*lead*.045)/scale;q.y=cy+(p.y-cy+bend)/(1.+s*.10);
  vec2 a=vec2(p.x/(.52+s*.28), (p.y-cy+bend)/(.054*(1.-s*.13)));
  material=max((length(vec2(max(abs(a.x)-.75,0.)*4.,a.y))-1.)*.04,abs(p.y)-.79);facet=.45;front=1.;surface=active*.28;mp=vec2(q.x*3.,q.y*8.);
 }
 if(reduced>.5)q=p;
 float bd=box(q,vec2(.5,.75));float mask=(1.-sm(-.003,.005,bd));
 vec2 tuv=vec2(q.x+.5,.5-q.y/1.5);vec4 art=texture2D(face,clamp(tuv,.001,.999));mask*=art.a;
 vec3 dark=mix(vec3(.020,.009,.036),vec3(.15,.017,.004),fire);
 vec3 mid=mix(vec3(.25,.15,.36),vec3(.80,.12,.018),fire);
 vec3 lit=mix(vec3(.62,.47,.83),vec3(1.,.61,.13),fire);
 vec3 hot=mix(vec3(.90,.83,1.),vec3(1.,.95,.62),fire);
 float edges=1.-sm(.006,.034,abs(bd));
 // Light follows actual artwork contours (not a uniform colour wash).
 vec3 sample2=texture2D(face,clamp(tuv+vec2(.003,.002),.001,.999)).rgb;
 float detail=sat(length(art.rgb-sample2)*4.);
 float grain=pow(1.-abs(sin(q.x*24.+q.y*11.+fb(q*8.)*12.-clock)),16.);
 vec3 ac=art.rgb*(1.-surface*.26-active*.06)+lit*(detail*.5+grain*.085+edges*.32)*active;
 ac=mix(ac,mid,surface*.20);
 // Shape erosion follows velocity: flame tips separate; dark sheets keep polished lips.
 float erosion=(fb(mp*vec2(10.,7.)-vec2(0.,clock*2.))-.48)*fire*.07*spread;
 material+=erosion;
 float mm=(1.-sm(-.009,.008,material))*sm(.08,.43,t)*(1.-sm(2.35,2.83,t));
 if(reduced>.5)mm=0.;
 float tex=fb(mp*8.+vec2(clock*.3,-clock));float ribs=pow(1.-abs(sin(mp.y*15.+fb(mp*14.)*14.-clock*2.)),13.);
 float bevel=1.-sm(.001,.018,abs(material));
 vec3 mc=mix(dark,mid,sm(.16,.76,tex)*.9);
 mc+=lit*(bevel*.82+ribs*.16+pow(tex,7.)*.7);
 mc+=hot*(pow(bevel,5.)*.30+fire*pow(ribs,.4)*.58);
 // Fire has hot moving filaments; black magic has narrow silver specular lines over a dense body.
 mc=mix(mc,lit,fire*sm(.25,.82,tex)*.82);
 if(facet>.1){vec3 pigment=texture2D(face,vec2(clamp(mp.x*.13+.5,.03,.97),clamp(.5-p.y/1.5,.03,.97))).rgb;mc=mix(mc,pigment,facet*.30);mc+=hot*pow(1.-abs(sin(mp.x*21.+mp.y*6.)),35.)*active*.08;}
 float behind=mm*(1.-mask);float onTop=mm*mask*front*mix(.70,.50,fire);
 vec3 col=mc*behind+ac*mask;float alpha=max(mask,behind);
 col=mix(col,mc,onTop);alpha=max(alpha,onTop);
 // Subpixel soft optical edge, not a screen-sized glow.
 float glow=exp(-abs(material)*52.)*active*.13*(1.-alpha);
 col+=lit*glow;alpha+=glow;
 if(t>=2.84){col=art.rgb*mask;alpha=mask;}
 gl_FragColor=vec4(col,alpha);
}`;
export class Renderer {
 private canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private program:WebGLProgram;private buffer:WebGLBuffer;private textures=new Map<HTMLCanvasElement,WebGLTexture>();private uniforms:Record<string,WebGLUniformLocation|null>={};
 constructor(){this.canvas.width=this.canvas.height=640;const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGLを初期化できませんでした');this.gl=gl;
 const compile=(type:number,s:string)=>{const sh=gl.createShader(type)!;gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'shader');return sh;};
 const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);this.program=gl.createProgram()!;gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program)||'link');gl.useProgram(this.program);
 this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);for(const n of ['time','variant','kind','reduced'])this.uniforms[n]=gl.getUniformLocation(this.program,n);
 }
 draw(c:CanvasRenderingContext2D,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,reduced=false,kind=0,shadow=true){const gl=this.gl;let tex=this.textures.get(face);if(!tex){tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);this.textures.set(face,tex);}gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.uniform1f(this.uniforms.time,ms/1000);gl.uniform1f(this.uniforms.variant,v);gl.uniform1f(this.uniforms.kind,kind);gl.uniform1f(this.uniforms.reduced,Number(reduced));gl.viewport(0,0,640,640);gl.drawArrays(gl.TRIANGLES,0,6);
 if(shadow){c.save();c.translate(x,y+w*.79);c.scale(1,.20);const g=c.createRadialGradient(0,0,w*.08,0,0,w*.61);g.addColorStop(0,'#21192140');g.addColorStop(1,'#21192100');c.fillStyle=g;c.fillRect(-w,-w,w*2,w*2);c.restore();}
 c.drawImage(this.canvas,x-w*1.7,y-w*1.7,w*3.4,w*3.4);
 }
 dispose(){for(const t of this.textures.values())this.gl.deleteTexture(t);this.textures.clear();this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
