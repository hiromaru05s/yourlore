/** A shared GPU surface. Card albedo, alpha, engraving, emissive flow and ink share one UV field. */
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`
precision highp float;
varying vec2 uv;
uniform sampler2D card;
uniform sampler2D engraving;
uniform float clockMs;
const float mode=1.;
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
 float start=mode<.5?1020.:mode<1.5?1110.:mode<2.5?1010.:mode<3.5?960.:1190.;
 float swirl=ease(start,1870.,ms),collapse=ease(mode>3.5?1770.:1660.,1990.,ms),alive=1.-collapse;
 vec2 p=(uv-.5)*vec2(2.8,-3.4);p=rot(-.035*charge)*p;
 float rad=length(p),ang=atan(p.y,p.x),scale=pow(max(.0001,alive),.67);
 float rf=rad/scale;
 // Inverse of the card's rounded radial deformation. The card never swaps to a separate disk.
 float roundness=ease(0.,.48,swirl),lo=rf,hi=rf+3.5;
 for(int i=0;i<9;i++){float mid=(lo+hi)*.5;float mapped=mix(mid,.53*(1.-exp(-mid/.53*1.45)),roundness);if(mapped<rf)lo=mid;else hi=mid;}
 float orig=mix(rf,(lo+hi)*.5,step(.0001,roundness));
 float angle=ang-swirl*4.5-swirl*4.2*(1.-sat(orig));
 vec2 local=vec2(cos(angle),sin(angle))*orig;
 local.x/=1.-charge*.04;local.y/=1.-charge*.04;
 vec2 st=vec2(local.x+.5,.5-local.y/aspect);
 vec4 tex=faceAt(st);
 float a=tex.a;
 vec2 drift=vec2(t*.18,-t*.27),nuv=local*5.;
 float n=fbm(nuv+vec2(fbm(nuv+drift),fbm(nuv-drift+7.))*1.6+drift);
 float n2=fbm(nuv*2.3+vec2(-t*.14,t*.2));
 float ridges=pow(sat(1.-abs(n-.51)*12.),3.);
 float fine=pow(sat(1.-abs(n2-.50)*26.),5.);
 float progress=coat*1.5-.15;
 float reveal=1.-smoothstep(progress-.14,progress+.10,n+local.y*.18);
 float front=exp(-abs(n+local.y*.18-progress)*28.);
 float pulse=exp(-pow((ms-790.)/180.,2.))*.8+exp(-pow((ms-1200.)/130.,2.))*.35;
 vec3 violet=vec3(.43,.13,.80),lavender=vec3(.73,.39,1.0),white=vec3(.94,.84,1.);
 if(mode>1.5&&mode<2.5){lavender=vec3(.57,.49,1.);white=vec3(.82,.94,1.);}
 if(mode>2.5&&mode<3.5){violet=vec3(.58,.12,.82);lavender=vec3(.87,.36,1.);}
 float etch=texture2D(engraving,st).r;
 vec2 px=vec2(.004,.0027);
 float cardEdge=max(max(a-alphaAt(st+vec2(px.x,0.)),a-alphaAt(st-vec2(px.x,0.))),max(a-alphaAt(st+vec2(0.,px.y)),a-alphaAt(st-vec2(0.,px.y))));
 float dx=lum(faceAt(st+vec2(px.x,0.)).rgb)-lum(faceAt(st-vec2(px.x,0.)).rgb);
 float dy=lum(faceAt(st+vec2(0.,px.y)).rgb)-lum(faceAt(st-vec2(0.,px.y)).rgb);
 float artDetail=sat(length(vec2(dx,dy))*3.);
 float band=pow(sat(1.-abs(local.y+.68-t*.75)*6.),3.);
 float pattern=ridges*.65+fine*.32;
 if(mode>.5&&mode<1.5)pattern=ridges*.06+etch*(1.15+.35*sin(t*2.+local.y*4.))+artDetail*band*.28;
 if(mode>1.5&&mode<2.5){vec2 cells=st*vec2(38.,56.);float star=step(.94,hash(floor(cells)))*pow(sat(1.-length(fract(cells)-.5)*2.),3.);pattern=ridges*.20+fine*.14+star*4.;}
 if(mode>2.5&&mode<3.5)pattern=pow(sat(1.-abs(fbm(nuv+vec2(0.,t*1.5))-.48)*11.),3.)*.95+fine*.3;
 if(mode>3.5)pattern=pow(sat(1.-abs(n-.50)*23.),5.)*1.6+artDetail*.25+fine*.2;
 vec3 base=tex.rgb;
 // Keep the illustration legible under the first energy pass, then coat it with liquid ink.
 vec3 charged=base*vec3(.72,.49,1.08)+violet*.12;
 vec3 inkColor=mix(vec3(.012,.004,.028),vec3(.10,.035,.17),n)*(.55+.45*ridges);
 vec3 color=mix(base,charged,charge*.55);
 color=mix(color,inkColor,reveal*ink);
 color+=lavender*(pattern*(.20+coat*.40)+artDetail*band*.25)*charge;
 float frontStrength=mode<.5?.65:mode<1.5?.16:mode<2.5?.23:mode<3.5?.45:.85;
 color+=white*(front*frontStrength+cardEdge*(.5+pulse)*1.8+band*.20)*charge*(1.-swirl*.7);
 color+=white*pattern*pulse*.38;
 float cardAlpha=a*step(.006,alive);
 vec3 premul=color*cardAlpha;
 float alpha=cardAlpha;
 // Emission follows the actual card alpha contour, including the carved frame.
 float nearby=max(max(alphaAt(st+vec2(.018,0.)),alphaAt(st-vec2(.018,0.))),max(alphaAt(st+vec2(0.,.012)),alphaAt(st-vec2(0.,.012))));
 float rim=max(0.,nearby-a)*charge*(1.-swirl)*(.45+pulse*.4)*step(.006,alive);
 premul+=lavender*rim;alpha=max(alpha,rim*.85);
 float broad=max(max(alphaAt(st+vec2(.045,0.)),alphaAt(st-vec2(.045,0.))),max(alphaAt(st+vec2(0.,.03)),alphaAt(st-vec2(0.,.03))));
 float halo=max(0.,broad-a)*charge*(1.-swirl)*.12*step(.006,alive);
 premul+=violet*halo;alpha=max(alpha,halo);
 // Ink tendrils are continuous broad surfaces with eroded edges, specular ridges and an opaque core.
 float grow=ease(760.,1160.,ms)*(1.-ease(1900.,2020.,ms));
 vec2 fluidP=p/max(.06,scale);float fr=length(fluidP),fa=atan(fluidP.y,fluidP.x);
 float twist=fa-fr*5.5+t*2.3+swirl*3.;
 vec2 polar=vec2(cos(twist),sin(twist))*(2.2+fr*3.);
 float flow=fbm(polar+vec2(t*.12,-t*.34));
 float edgeWave=sin(twist*3.+flow*3.1)*.095+sin(twist*5.-t*.5)*.04;
 float radius=.46+edgeWave;
 if(mode>2.5&&mode<3.5)radius+=pow(max(0.,sin(twist*6.+flow*4.)),5.)*.22;
 if(mode>.5&&mode<1.5)radius+=sin(twist*2.)*.025;
 float shell=1.-smoothstep(radius-.035,radius+.025,fr);
 float inner=smoothstep(.16,.32,fr);
 float shape=shell*inner;
 float cut=sin(twist*3.+flow*2.)*.5+.5;
 shape*=smoothstep(.14,.25,cut+flow*.21);
 float fineFlow=fbm(polar*2.7+flow*2.-t*.2);
 float ridge=pow(sat(1.-abs(fineFlow-.49)*19.),4.);
 float sheen=pow(max(0.,sin(twist*2.+flow*5.-.7)),8.);
 float edge=exp(-abs(fr-radius)*105.);
 float layered=smoothstep(.32,.63,flow);
 vec3 inkBody=mix(vec3(.026,.010,.043),vec3(.31,.14,.43),layered);
 inkBody+=lavender*(ridge*.35+sheen*.40)+white*edge*.67;
 float flowAlpha=shape*grow;
 // Front/back depth is implied by alternating illuminated crests; a dark center is retained.
 float frontLayer=smoothstep(-.2,.5,sin(fa*2.+t));
 float over=flowAlpha*(.5+.5*frontLayer);
 premul=premul*(1.-over)+inkBody*over;alpha=alpha+(1.-alpha)*over;
 float glow=exp(-abs(fr-radius)*17.)*grow*.14*(.5+sheen);
 premul+=lavender*glow;alpha=max(alpha,glow*.7);
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
  const etch=document.createElement('canvas');etch.width=512;etch.height=768;const c=etch.getContext('2d')!;c.fillStyle='black';c.fillRect(0,0,512,768);c.strokeStyle='white';c.lineWidth=1.5;
  for(const x of [66,446]){c.beginPath();c.moveTo(x,104);c.bezierCurveTo(x-20,250,x+20,490,x,664);c.stroke();for(let j=0;j<10;j++){const y=132+j*52;c.beginPath();c.moveTo(x-8,y-9);c.lineTo(x+7,y);c.lineTo(x-8,y+9);c.lineTo(x-3,y);c.stroke();}}
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(256,360,98+i*13,180+i*17,0,0,Math.PI*2);c.stroke();}
  for(let j=0;j<18;j++){const a=j*Math.PI/9;c.save();c.translate(256+Math.cos(a)*113,360+Math.sin(a)*200);c.rotate(a);c.beginPath();c.moveTo(-4,-7);c.lineTo(3,0);c.lineTo(-4,7);c.moveTo(3,0);c.lineTo(9,0);c.stroke();c.restore();}
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
