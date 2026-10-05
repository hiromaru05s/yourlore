import {createRiftEngraving} from './riftInkGlyphs';
/** A shared GPU surface. Card albedo, alpha, engraving, emissive flow and ink share one UV field. */
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`
precision highp float;
varying vec2 uv;
uniform sampler2D card;
uniform sampler2D engraving;
uniform float clockMs;
uniform float aspect;
float sat(float x){return clamp(x,0.,1.);}
float ease(float a,float b,float x){float t=sat((x-a)/(b-a));return t*t*(3.-2.*t);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p*2.03+vec2(7.1,3.8);a*=.5;}return v;}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float lum(vec3 c){return dot(c,vec3(.22,.70,.08));}
float alphaAt(vec2 p){return texture2D(card,clamp(p,vec2(.001),vec2(.999))).a*step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
vec4 faceAt(vec2 p){return texture2D(card,clamp(p,vec2(.001),vec2(.999)))*step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
void main(){
 float ms=clockMs,t=ms*.001;
 float charge=ease(100.,720.,ms),coat=ease(620.,1150.,ms),ink=ease(860.,1320.,ms);
 float start=1110.;
 float swirl=ease(start,1870.,ms),collapse=ease(1660.,1990.,ms),alive=1.-collapse;
 vec2 p=(uv-.5)*vec2(2.8,-3.4);p=rot(-.035*charge)*p;
 float rad=length(p),ang=atan(p.y,p.x),scale=pow(max(.0001,alive),.67);
 float rf=rad/scale;
 // Inverse of the card's rounded radial deformation. The card never swaps to a separate disk.
 float roundness=ease(0.,.48,swirl),lo=rf,hi=rf+3.5;
 for(int i=0;i<9;i++){float mid=(lo+hi)*.5;float mapped=mix(mid,.53*(1.-exp(-mid/.53*1.45)),roundness);if(mapped<rf)lo=mid;else hi=mid;}
 float orig=mix(rf,(lo+hi)*.5,step(.0001,roundness));
 // Material-specific folding changes the silhouette without moving the source center.
 float fold=swirl*(1.-collapse);
 orig*=1.+fold*.18*sin(ang*2.+t*.4);

 float angle=ang-swirl*4.5-swirl*4.2*(1.-sat(orig));
 vec2 local=vec2(cos(angle),sin(angle))*orig;
 local.x/=1.-charge*.04;local.y/=1.-charge*.04;
 vec2 st=vec2(local.x+.5,.5-local.y/aspect);
 vec4 tex=faceAt(st);
 float a=tex.a;
 vec3 violet=vec3(.31,.19,.49),lavender=vec3(.63,.49,.80),white=vec3(.91,.87,1.);
 float pulse=exp(-pow((ms-790.)/180.,2.))*.8+exp(-pow((ms-1200.)/130.,2.))*.35;
 vec3 premul=vec3(0.);float alpha=0.;
 // Only the card contributes this material. Preserve the separate contour halo
 // and folded laminae below, including their transparent-space emission.
 if(a>0.&&alive>=.006){
 vec2 drift=vec2(t*.18,-t*.27),nuv=local*5.;
 float n=fbm(nuv+vec2(fbm(nuv+drift),fbm(nuv-drift+7.))*1.6+drift);
 float n2=fbm(nuv*2.3+vec2(-t*.14,t*.2));
 float ridges=pow(sat(1.-abs(n-.51)*12.),3.);
 float fine=pow(sat(1.-abs(n2-.50)*26.),5.);
 float progress=coat*1.5-.15;
 float reveal=1.-smoothstep(progress-.14,progress+.10,n+local.y*.18);
 float front=exp(-abs(n+local.y*.18-progress)*28.);
 float etch=texture2D(engraving,clamp(st,vec2(.001),vec2(.999))).r;
 vec2 px=vec2(.004,.0027);
 float cardEdge=max(max(a-alphaAt(st+vec2(px.x,0.)),a-alphaAt(st-vec2(px.x,0.))),max(a-alphaAt(st+vec2(0.,px.y)),a-alphaAt(st-vec2(0.,px.y))));
 float dx=lum(faceAt(st+vec2(px.x,0.)).rgb)-lum(faceAt(st-vec2(px.x,0.)).rgb);
 float dy=lum(faceAt(st+vec2(0.,px.y)).rgb)-lum(faceAt(st-vec2(0.,px.y)).rgb);
 float artDetail=sat(length(vec2(dx,dy))*3.);
 float band=pow(sat(1.-abs(local.y+.68-t*.75)*6.),3.);
 float pattern=ridges*.06+etch*(1.15+.35*sin(t*2.+local.y*4.))+artDetail*band*.28;
 vec3 base=tex.rgb;
 // Keep the illustration legible under the first energy pass, then coat it with liquid ink.
 vec3 charged=base*vec3(.72,.49,1.08)+violet*.12;
 vec3 inkColor=mix(vec3(.012,.004,.028),vec3(.10,.035,.17),n)*(.55+.45*ridges);
 vec3 color=mix(base,charged,charge*.55);
 color=mix(color,inkColor,reveal*ink);
 color+=lavender*(pattern*(.16+coat*.24)+artDetail*band*.25)*charge;
 float frontStrength=.16;
 color+=white*(front*frontStrength+cardEdge*(.5+pulse)*1.8+band*.20)*charge*(1.-swirl*.7);
 color+=white*pattern*pulse*.38;

 float open=ease(.06,.72,swirl);
 float f=local.y*26.+sin(local.x*9.+t)*1.6;
 float fiber=pow(.5+.5*sin(f*3.14159),10.);
 float cuts=smoothstep(.10,.90,fbm(local*4.+vec2(0.,t*.15)));
 float architecture=.12+cuts*.20;
 color=mix(color,color*.9+white*fiber*.008,open);
 float cardAlpha=a*step(.006,alive)*mix(1.,architecture,open);

 premul=color*cardAlpha;
 alpha=cardAlpha;
 }
 // Emission follows the actual card alpha contour, including the carved frame.
 float nearby=max(max(alphaAt(st+vec2(.018,0.)),alphaAt(st-vec2(.018,0.))),max(alphaAt(st+vec2(0.,.012)),alphaAt(st-vec2(0.,.012))));
 float rim=max(0.,nearby-a)*charge*(1.-swirl)*(.45+pulse*.4)*step(.006,alive);
 premul+=lavender*rim;alpha=max(alpha,rim*.85);
 float broad=max(max(alphaAt(st+vec2(.045,0.)),alphaAt(st-vec2(.045,0.))),max(alphaAt(st+vec2(0.,.03)),alphaAt(st-vec2(0.,.03))));
 float halo=max(0.,broad-a)*charge*(1.-swirl)*.12*step(.006,alive);
 premul+=violet*halo;alpha=max(alpha,halo);
 // Folded laminae share the card's shrinking coordinate field.
 float grow=ease(950.,1280.,ms)*(1.-ease(1940.,2020.,ms));
 vec2 fluidP=p/max(.025,scale);float fr=length(fluidP),fa=atan(fluidP.y,fluidP.x);
 float twist=fa-fr*5.5+t*2.3+swirl*3.;
 vec3 flowPremul=vec3(0.);float flowA=0.;
 if(grow>0.){
 for(int j=0;j<5;j++){
  float k=float(j),angle=twist+k*1.256;
  float curl=sin(angle*2.+k*.6)*.05+sin(angle*5.-t*.6+k)*.012;
  float radius=.24+k*.058+curl,width=.014+k*.002;
  float gate=smoothstep(.12,.75,.5+.5*sin(angle*2.+k)),opacity=.92;
  width*=2.8;opacity=.54;radius+=sin(angle+t*.65)*.036;
  float d=(fr-radius)/width,body=exp(-d*d*1.1)*gate;
  float ed=exp(-pow((d-.61)*9.,2.))*gate;
  float micro=(.65*noise(vec2(angle*12.+k,fr*170.-t*.5))+.35*noise(vec2(angle*23.-k,fr*310.+t*.7)));
  float threads=pow(.5+.5*sin(fr*780.+angle*6.+micro*6.),12.);
  float grazing=pow(.5+.5*sin(angle+k*.7),5.);
  vec3 baseInk=mix(vec3(.03,.018,.06),vec3(.37,.24,.51),sat(d*.3+.4));
  vec3 surface=baseInk+lavender*(threads*.35+micro*.16)+white*(ed*1.55+grazing*body*.55);
  float layerA=body*opacity*grow*(.55+.45*micro);
  flowPremul=flowPremul*(1.-layerA)+surface*layerA;
  flowA=flowA+(1.-flowA)*layerA;
  float gl=exp(-d*d*.12)*gate*grow*.014*grazing;
  flowPremul+=lavender*gl+white*ed*grow*.20;flowA=max(flowA,max(gl,ed*grow*.35));
 }
 }
 premul=premul*(1.-flowA)+flowPremul;alpha=alpha+(1.-alpha)*flowA;
 // A small light pulse at the collapse point, never a full-screen flash.
 float pinch=exp(-pow((ms-1940.)/42.,2.));
 float glint=exp(-abs(p.x)*45.-abs(p.y)*9.)*pinch;
 premul+=white*glint;alpha=max(alpha,glint);
 float finalFade=1.-ease(1980.,2040.,ms);premul*=finalFade;alpha*=finalFade;
 gl_FragColor=vec4(premul/max(alpha,.0001),alpha);
}`;

export class RiftInkMaterial {
 readonly canvas=document.createElement('canvas');
 private gl:WebGLRenderingContext;
 private program:WebGLProgram;
 private cardTexture:WebGLTexture;
 private faces=new Map<HTMLCanvasElement,WebGLTexture>();
 private time:WebGLUniformLocation|null;
 private aspect:WebGLUniformLocation|null;
 private textures:WebGLTexture[]=[];
 private buffer:WebGLBuffer;
 constructor(){
  this.canvas.width=640;this.canvas.height=776;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw new Error('WebGL is unavailable');this.gl=gl;
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);gl.getExtension('WEBGL_lose_context')?.loseContext();throw new Error(message||'Shader compile failure');}return s;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();throw new Error(message||'Shader link failure');}gl.useProgram(program);this.program=program;
  this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const texture=(unit:number)=>{const tx=gl.createTexture()!;this.textures.push(tx);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tx);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tx;};
  this.cardTexture=texture(0);gl.uniform1i(gl.getUniformLocation(program,'card'),0);
  texture(1);gl.uniform1i(gl.getUniformLocation(program,'engraving'),1);
  const etch=createRiftEngraving();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,etch);
  this.time=gl.getUniformLocation(program,'clockMs');this.aspect=gl.getUniformLocation(program,'aspect');
 }
 draw(face:HTMLCanvasElement,ms:number,aspect=1.5,size=640){
  const gl=this.gl;if(gl.isContextLost())throw new Error('WebGL context lost');
  const w=Math.max(224,Math.min(768,Math.ceil(size/32)*32)),h=Math.round(w*3.4/2.8);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);
  let texture=this.faces.get(face);
  if(!texture){
   // Simultaneous removals share the shader, but retain their immutable faces
   // on the GPU instead of uploading every card again on every frame.
   if(this.faces.size>=8){const [old,tx]=this.faces.entries().next().value!;this.faces.delete(old);if(tx!==this.cardTexture)gl.deleteTexture(tx);}
   texture=this.faces.size===0?this.cardTexture:gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);this.faces.set(face,texture);
  }else gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.uniform1f(this.time,ms);gl.uniform1f(this.aspect,aspect);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;
 }
 forgetFace(){for(const texture of this.faces.values())if(texture!==this.cardTexture)this.gl.deleteTexture(texture);this.faces.clear();}
 dispose(){this.forgetFace();const gl=this.gl;this.textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
