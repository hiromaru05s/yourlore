/** Four full-card transformations. Albedo, contour, relief and flow share the native face UVs. */
const vertex = `attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 uv;
uniform sampler2D face;
uniform float phase;
uniform float variant;
uniform vec2 anchor;
float sat(float x){return clamp(x,0.,1.);}
float sm(float a,float b,float x){float t=sat((x-a)/(b-a));return t*t*(3.-2.*t);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+7.)*.28+noise(p*4.09+19.)*.15;}
float lum(vec3 c){return dot(c,vec3(.22,.70,.08));}
vec4 faceAt(vec2 p){return texture2D(face,clamp(p,.001,.999))*step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
vec3 cells(vec2 p){vec2 i=floor(p),f=fract(p);float a=9.,b=9.,seed=0.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(i+g),hash(i+g+91.));float d=length(g+.18+o*.64-f);if(d<a){b=a;a=d;seed=hash(i+g+37.);}else{b=min(b,d);}}}return vec3(a,b-a,seed);}
void main(){
 if(phase<=.001||phase>=1.){gl_FragColor=vec4(0.);return;}
 vec2 p=vec2(uv.x,1.-uv.y),q=p*vec2(1.,1.56);
 vec4 original=faceAt(p);
 float time=phase*2.2,charge=sm(.015,.16,phase),release=sm(.63,.94,phase);
 float live=charge*(1.-sm(.93,1.,phase));
 float coarse=fbm(q*5.),fine=fbm(q*29.);
 float contour=original.a;
 vec2 px=vec2(.004,.003);
 float nearA=max(max(faceAt(p+vec2(px.x,0.)).a,faceAt(p-vec2(px.x,0.)).a),max(faceAt(p+vec2(0.,px.y)).a,faceAt(p-vec2(0.,px.y)).a));
 float inner=min(min(faceAt(p+vec2(px.x,0.)).a,faceAt(p-vec2(px.x,0.)).a),min(faceAt(p+vec2(0.,px.y)).a,faceAt(p-vec2(0.,px.y)).a));
 float rim=max(0.,contour-inner),outer=max(0.,nearA-contour);
 float gx=lum(faceAt(p+vec2(px.x,0.)).rgb)-lum(faceAt(p-vec2(px.x,0.)).rgb);
 float gy=lum(faceAt(p+vec2(0.,px.y)).rgb)-lum(faceAt(p-vec2(0.,px.y)).rgb);
 float artDetail=sat(length(vec2(gx,gy))*3.2);
 float edgeDistance=min(min(p.x,1.-p.x),min(p.y,1.-p.y)*1.56);
 float coat=0.,ridge=0.,thin=0.,height=0.,wake=0.,grain=fine,drain=1.,edgeLight=0.,glaze=0.;
 vec2 offset=vec2(0.);
 vec3 deep=vec3(.018,.035,.024),body=vec3(.17,.25,.065),light=vec3(.71,.79,.31);
 // Each route occupies the complete original face. The final withdrawal exposes
 // the unchanged native art progressively, rather than scaling a sticker down.
 if(variant<.5){
  // NECROTIC VEINS: root system travels from the entire perimeter to the core.
  // Fine filaments branch from thick connected veins; both grow within the stain.
  vec2 warp=vec2(fbm(q*4.3+3.),fbm(q*4.3+17.));
  float flow=fbm(q*7.+warp*2.1);
  float branch=abs(flow-.50);
  float vein=1.-sm(.022,.068,branch);
  float filament=1.-sm(.006,.017,abs(fbm(q*21.+warp*3.)-.51));
  float arrival=edgeDistance*.90+coarse*.17;
  float front=sm(.07,.43,phase)*.78-.08-arrival;
  float spread=sm(-.035,.025,front);
  float distance=length((p-anchor)*vec2(1.,1.25));
  drain=1.-sm((1.-release)*1.55-.045,(1.-release)*1.55+.018,distance+(coarse-.5)*.10);
  coat=spread*drain;
  ridge=vein*coat;thin=filament*coat*(.3+.7*vein);
  edgeLight=exp(-abs(branch-.047)*170.)*coat;
  glaze=exp(-pow((arrival-phase*.78+.07)*19.,2.))*(1.-release);
  wake=exp(-abs(front)*85.)*(1.-release);
  height=(vein*.044+filament*.007)*coat;
  light=vec3(.69,.80,.30);body=vec3(.12,.20,.06);
  offset=vec2(gx,gy)*.004*coat;
 }else if(variant<1.5){
  // PUTRID TIDE: one heavy liquid front descends over the entire card width.
  // Convex meniscus, capillary fingers and reflective flow remain surface-bound.
  float waves=sin(p.x*12.+coarse*3.)*.028+sin(p.x*27.+1.4)*.012;
  float front=sm(.035,.49,phase)*1.43-.16-p.y+waves+coarse*.09;
  float wet=sm(-.018,.033,front);
  float retreat=sm(.62,.94,phase)*1.34-.12;
  drain=sm(retreat-.035,retreat+.055,p.y+waves*.65);
  coat=wet*drain;
  float streams=pow(.5+.5*sin(p.x*37.+fbm(q*7.+vec2(0.,-time*.22))*7.),7.);
  ridge=streams*.36*coat;thin=pow(.5+.5*sin(p.x*87.+coarse*14.),16.)*coat*.22;
  wake=exp(-abs(front)*100.)*(1.-release)+exp(-abs(p.y+waves*.65-retreat)*80.)*release;
  height=coat*(.13+streams*.010)+wake*.024;
  glaze=pow(sat(1.-abs(p.x*.62+p.y*.10-.38-sin(time*.8)*.09)*5.5),7.)*coat;
  edgeLight=(streams*.30+thin)*coat;
  offset=vec2(sin(q.y*19.+time*2.),cos(q.x*17.-time))*coat*.008+wake*vec2(0.,.008);
  deep=vec3(.015,.047,.027);body=vec3(.16,.29,.08);light=vec3(.80,.88,.43);
 }else if(variant<2.5){
  // OXIDATION: the actual illustration is etched into tarnished plates.
  // Whole-face mineral cells form, hold, and close in a diagonal annealing front.
  vec3 cell=cells(q*8.2+vec2(noise(q*5.),noise(q*5.+7.))*.3);
  float arrival=cell.x*.22+coarse*.20;
  float front=sm(.04,.40,phase)*.71-.13-arrival;
  float rust=sm(-.022,.024,front);
  float retreat=sm(.65,.95,phase)*1.30-.10;
  float platePhase=cell.z*.50+p.y*.45;
  drain=1.-sm(platePhase-.05,platePhase+.09,retreat);
  coat=rust*drain;
  ridge=(1.-sm(.015,.043,cell.y))*coat;
  thin=(1.-sm(.002,.01,cell.y))*coat;
  wake=exp(-abs(front)*88.)*(1.-release)+exp(-abs(platePhase-retreat)*35.)*release*.45;
  edgeLight=thin*.88;
  glaze=exp(-pow((p.x*.5+p.y-phase*2.4)*13.,2.))*coat;
  height=sm(.004,.10,cell.y)*coat*.039;
  grain=cell.x*.55+fine*.45;
  deep=vec3(.025,.057,.050);body=vec3(.18,.30,.20);light=vec3(.81,.65,.32);
 }else{
  // WITHERING LAMINA: the full card print becomes a folded, desiccated membrane.
  // Broad coherent wrinkles tighten vertically; no separate floating skin patch.
  float travel=sm(.045,.44,phase)*1.40-.13;
  float front=travel-(1.-p.y)+coarse*.10;
  float skin=sm(-.025,.028,front);
  float retreat=sm(.64,.96,phase);
  float foldedDistance=abs(p.x-anchor.x)*2.+abs(p.y-anchor.y)*.45;
  drain=1.-sm((1.-retreat)*1.55-.07,(1.-retreat)*1.55+.05,foldedDistance);
  coat=skin*drain;
  float folds=p.x*25.+sin(p.y*5.3+1.1)*2.8+sin(p.y*12.)*.45;
  float wrinkle=sin(folds+release*2.2*(1.-p.y));
  float crease=pow(.5+.5*sin(folds+1.3),14.);
  ridge=crease*coat;thin=pow(.5+.5*sin(folds*3.+coarse*3.),18.)*coat*.28;
  wake=exp(-abs(front)*85.)*(1.-release)+exp(-abs(foldedDistance-(1.-retreat)*1.55)*46.)*release;
  edgeLight=pow(.5+.5*sin(folds-.75),22.)*coat;
  glaze=pow(.5+.5*sin(folds-.70),4.)*coat*.30;
  height=(wrinkle*.024+sin(p.y*40.+p.x*8.)*.002)*coat;
  offset=vec2(wrinkle*.015,sin(folds+1.)*.005)*coat;
  deep=vec3(.038,.043,.018);body=vec3(.29,.27,.09);light=vec3(.83,.78,.43);
 }
 // Surface normals add narrow highlights and contact shadows, not uniform glow.
 vec3 normal=normalize(vec3(-dFdx(height)*250.,-dFdy(height)*360.,1.));
 vec3 lamp=normalize(vec3(-.48,.62,1.));
 float diffuse=max(0.,dot(normal,lamp));
 float spec=pow(max(0.,dot(reflect(-lamp,normal),vec3(0.,0.,1.))),variant>1.5&&variant<2.5?34.:20.);
 vec3 tex=faceAt(p+offset).rgb;
 float value=lum(tex);
 vec3 stained=mix(tex*vec3(.42,.62,.30),deep+body*(.25+value*.9),.52);
 stained*=.73+diffuse*.37+grain*.14;
 // Original etched detail remains readable under the corruption.
 stained+=light*artDetail*(.08+ridge*.16);
 if(variant<.5){stained=mix(stained,deep,ridge*.73);stained+=light*(thin*.17+spec*ridge*.26+edgeLight*(.18+glaze*.65));}
 else if(variant<1.5){stained+=light*(spec*.23+thin*.13+glaze*.39+edgeLight*.10);stained*=1.-ridge*.16;}
 else if(variant<2.5){stained=mix(stained,vec3(.16,.081,.027),ridge*.77);stained+=light*thin*(.30+glaze*.85)+light*spec*.10;}
 else{stained*=.82+diffuse*.32;stained+=light*(thin*.12+spec*.14+edgeLight*.24+glaze*.20);}
 vec3 color=mix(original.rgb,stained,coat*.93);
 color+=light*wake*.70;
 color+=light*rim*charge*(1.-release)*(.42+.22*sin(phase*3.14159));
 // The light follows the existing engraved frame and the actual image structure.
 float pre=charge*(1.-sm(.18,.39,phase));
 color+=light*artDetail*pre*.18;
 // Final arrival is a restrained, surface-aligned response at the native plaque.
 float contact=exp(-pow((phase-.80)/.045,2.));
 float arrival=exp(-length((p-anchor)*vec2(1.,1.56))*38.)*contact;
 color+=light*arrival*.33;
 float alpha=contour*live;
 color=mix(color,light,outer*.30);
 alpha=max(alpha,outer*live*(1.-release)*.48);
 gl_FragColor=vec4(color,alpha);
}`;

export const TILE_W = 320, TILE_H = 500;
export type Request = {variant:number;phase:number;anchor:[number,number];face:HTMLCanvasElement};
export class Material {
 readonly canvas = document.createElement('canvas');
 private gl:WebGLRenderingContext;
 private program:WebGLProgram;
 private buffer:WebGLBuffer;
 private textures = new Map<HTMLCanvasElement,WebGLTexture>();
 private disposed = false;
 constructor(){
  this.canvas.width=TILE_W*4;this.canvas.height=TILE_H;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL unavailable');this.gl=gl;gl.getExtension('OES_standard_derivatives');
  const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Shader compile failed');return shader;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader link failed');
  this.program=program;this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 }
 drawBatch(requests:Request[]){
  if(this.disposed)return;const gl=this.gl;gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  const a=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.uniform1i(gl.getUniformLocation(this.program,'face'),0);
  for(const [i,r] of requests.entries()){
   let texture=this.textures.get(r.face);
   if(!texture){
    if(this.textures.size>=12){const [key,old]=this.textures.entries().next().value!;gl.deleteTexture(old);this.textures.delete(key);}
    texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,r.face);this.textures.set(r.face,texture);
   }else gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.viewport(i*TILE_W,0,TILE_W,TILE_H);
   gl.uniform1f(gl.getUniformLocation(this.program,'variant'),r.variant);gl.uniform1f(gl.getUniformLocation(this.program,'phase'),r.phase);gl.uniform2f(gl.getUniformLocation(this.program,'anchor'),...r.anchor);
   gl.drawArrays(gl.TRIANGLES,0,6);
  }
  return this.canvas;
 }
 dispose(){if(this.disposed)return;this.disposed=true;const gl=this.gl;this.textures.forEach(t=>gl.deleteTexture(t));this.textures.clear();gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=this.canvas.height=1;}
}
