// One reusable GPU surface: artwork, relief, engravings and deformation share UVs.
export class Material {
 readonly canvas=document.createElement('canvas');
 private gl:WebGLRenderingContext;private program:WebGLProgram;private tex:WebGLTexture;private buffer:WebGLBuffer;private textures=new WeakMap<HTMLCanvasElement,WebGLTexture>();private allocated:WebGLTexture[]=[];
 constructor(){
  this.canvas.width=512;this.canvas.height=640;
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable: use reduced motion');this.gl=gl;
  const vert=`attribute vec2 a;varying vec2 uv;uniform float power;uniform float family;uniform float variant;uniform float time;
  void main(){uv=a;vec2 p=(a-.5)*vec2(1.35,1.70);float v=a.y;float u=a.x;float k=power;float f=family;
   if(variant<.5){
    if(f<.5){float strip=floor(v*6.);p.x+=k*(mod(strip,2.)-.5)*.40;p.y-=k*.12*(u-.5);}
    else if(f<1.5){p.x*=cos(k*(1.2+floor(v*5.)*.14));p.y+=k*.07*sin(u*30.+v*11.);}
    else if(f<2.5){p.x+=k*.055*sin(floor(v*14.)*1.7);p.y+=k*.16*sin(u*7.);}
    else if(f<3.5){p.x+=k*.10*sin(v*15.+time*2.)*sin(u*3.1416);p.y-=k*.12*cos(u*8.);}
    else if(f<4.5){p.x+=k*.16*sin(v*7.);p.y+=k*.14*sin(u*3.1416);}
    else if(f<5.5){p.x*=1.-k*.6;p.y*=1.+k*.09;}
    else if(f<6.5){p.x+=sign(p.x)*k*.15*sin(v*9.);p.y-=k*.14*abs(p.x);}
    else if(f<7.5){p.x+=k*.04*sin(floor(v*12.)*3.);p.y+=k*.05*cos(floor(u*10.)*2.);}
    else {p.x+=k*.10*sin(v*3.1416);p.y-=k*.19*sin(u*3.1416);}
   }else{
    if(f<.5){p.x+=k*.22*sin(v*8.+time*1.1);p.x*=1.-k*.2*sin(v*3.1416);p.y+=k*.1*sin(u*6.);}
    else if(f<1.5){p.x+=k*.15*sin(v*8.+time);p.y+=k*.13*sin(u*8.+v*4.);}
    else if(f<2.5){p.x+=k*.10*sin(v*9.+time*1.2);p.y+=k*.11*sin(u*8.-time);}
    else if(f<3.5){p.x*=1.+k*.15*cos(v*6.);p.y+=k*.18*sin(u*3.1416)*sin(v*3.1416);}
    else if(f<4.5){p.x*=1.-k*.3*sin(v*3.1416);p.y+=k*.20*sin(u*3.1416);}
    else if(f<5.5){p.x+=k*.1*sin(v*6.);p.y-=k*.22*sin(u*3.1416);}
    else if(f<6.5){p.x*=1.-k*.23;p.y-=k*.18*abs(sin(u*6.283));}
    else if(f<7.5){p.x+=k*.16*sin(floor(v*9.)*1.5);p.y+=k*.04*cos(u*8.);}
    else {p.x+=k*.18*sin(u*3.1416+v*6.);p.y+=k*.12*cos(v*9.);}
   }
   gl_Position=vec4(p.x,-p.y,0.,1.);}`;
  const frag=`precision highp float;varying vec2 uv;uniform sampler2D face;uniform float power;uniform float time;uniform float family;uniform float variant;uniform vec3 hue;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec4 art=texture2D(face,uv);if(art.a<.015)discard;
   vec2 d=vec2(.002);float l=dot(art.rgb,vec3(.299,.587,.114));float edge=length(vec2(dot(texture2D(face,uv+vec2(d.x,0.)).rgb,vec3(.299,.587,.114))-l,dot(texture2D(face,uv+vec2(0.,d.y)).rgb,vec3(.299,.587,.114))-l));
   vec2 p=uv-.5;float rune=0.;float f=family;float pattern=0.;
   if(f<.5)pattern=abs(sin((p.x+p.y*.55)*80.))*abs(sin(p.y*80.));
   else if(f<1.5)pattern=abs(sin(p.x*33.+sin(p.y*17.)*2.));
   else if(f<2.5)pattern=min(abs(sin(p.x*76.+floor(p.y*45.)*2.)),abs(sin(p.y*88.+floor(p.x*38.)*3.)));
   else if(f<4.5)pattern=abs(sin((p.x+.12*sin(p.y*23.))*44.));
   else if(f<5.5)pattern=abs(p.x*18.+sin(p.y*45.)*.2);
   else if(f<6.5)pattern=abs(sin(abs(p.x)*33.-p.y*18.));
   else if(f<7.5)pattern=min(abs(sin(p.x*54.)),abs(sin(p.y*74.+floor(p.x*54.)*1.2)));
   else pattern=abs(sin(p.y*110.+floor(p.x*70.)*.2));
   rune=1.-smoothstep(.02,.105,pattern);
   float sweep=exp(-pow((uv.y-fract(time*.28))*8.,2.));float ink=power*(.57+.23*(1.-l));
   vec3 color=mix(art.rgb,art.rgb*.22+hue*.16,ink);
   color+=hue*power*(rune*.25+edge*1.15+sweep*.09);
   color+=vec3(1.,.92,1.)*power*rune*.18*sweep;float rim=max(0.,art.a-min(texture2D(face,uv+vec2(.004,0.)).a,texture2D(face,uv-vec2(.004,0.)).a));color+=hue*rim*power*.65;
   float striation=1.-smoothstep(.005,.018,abs(sin(uv.y*90.+uv.x*25.)));color+=hue*striation*power*.07;
   float cut=1.;if(variant<.5&&family<.5){float seam=abs(fract(uv.y*6.)-.5);cut=1.-smoothstep(.485-power*.014,.498-power*.007,seam)*power*.9;}if(variant>.5&&family>1.5&&family<2.5){float seam=abs(sin((uv.y+uv.x*.38)*120.));cut=1.-(1.-smoothstep(.01,.11,seam))*power*.45;}gl_FragColor=vec4(color,art.a*cut);
  }`;
  const shader=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader');return s;};
  const vs=shader(gl.VERTEX_SHADER,vert),fs=shader(gl.FRAGMENT_SHADER,frag),program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Link');gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;
  const vertices:number[]=[];for(let y=0;y<48;y++)for(let x=0;x<32;x++){const x0=x/32,x1=(x+1)/32,y0=y/48,y1=(y+1)/48;vertices.push(x0,y0,x1,y0,x0,y1,x1,y0,x1,y1,x0,y1);}
  this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);this.tex=gl.createTexture()!;gl.deleteTexture(this.tex);
 }
 draw(face:HTMLCanvasElement,family:number,variant:number,power:number,time:number,color:string):HTMLCanvasElement{const gl=this.gl;gl.viewport(0,0,512,640);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 let tex=this.textures.get(face);if(!tex){tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);this.textures.set(face,tex);this.allocated.push(tex);if(this.allocated.length>12){this.clearTextures();return this.draw(face,family,variant,power,time,color);}}
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(this.program,'face'),0);
 for(const [name,value]of Object.entries({family,variant,power,time}))gl.uniform1f(gl.getUniformLocation(this.program,name),value);
 gl.uniform3f(gl.getUniformLocation(this.program,'hue'),...([1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255) as [number,number,number]));gl.drawArrays(gl.TRIANGLES,0,32*48*6);return this.canvas;}
 clearTextures(){for(const t of this.allocated)this.gl.deleteTexture(t);this.allocated=[];this.textures=new WeakMap();}
 dispose(){this.clearTextures();this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
