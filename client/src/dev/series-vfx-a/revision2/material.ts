import {maskTexture} from './masks';
export type Direction='blade'|'shadow'|'normal';
export const DURATION=1080;
/** Only the illustrated aperture is painted. Frame/name/stats remain native DOM. */
export class AssassinMaterial {
 readonly canvas=document.createElement('canvas');private gl:WebGLRenderingContext;private p:WebGLProgram;private tex:WebGLTexture[]=[];private buffer:WebGLBuffer;
 constructor(image:HTMLImageElement,veil:HTMLImageElement){
 this.canvas.width=512;this.canvas.height=468;const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false})!;if(!gl)throw Error('R2 material requires WebGL; normal summon remains available');this.gl=gl;
 const vs=`attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p.x,-p.y,0.,1.);}`;
 const fs=`precision highp float;varying vec2 uv;uniform sampler2D art;uniform sampler2D mask;uniform sampler2D veil;uniform float t;uniform float mode;
 float S(float a,float b,float x){return smoothstep(a,b,x);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(123.7,289.3)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(123.7,289.3)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(123.7,289.3)))*43758.5),d=fract(sin(dot(i+1.,vec2(123.7,289.3)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
 void main(){vec3 orig=texture2D(art,uv).rgb;vec3 m=texture2D(mask,uv).rgb;vec3 rgb=orig;float face=1.-S(.040,.092,distance((uv-vec2(.649,.243))*vec2(1.,.85),vec2(0)));float enter=S(0.,.16,t),end=1.-S(.70,1.,t);
 if(mode<.5){
 // Cloth folds move along the scarf, delayed behind the steel response.
 float force=S(.08,.34,t)*(1.-S(.38,.96,t));float along=uv.x*.75+uv.y*.45;
 float fold=sin(along*15.-t*5.2);float anchor=S(.015,.32,distance(uv,vec2(.568,.310)));vec2 offset=vec2(-.030*fold,.026*sin(along*12.-t*4.))*force*m.r*anchor;
 vec3 cloth=texture2D(art,uv+offset).rgb;float foldLight=pow(max(0.,sin(along*13.-t*4.8)),5.);
 cloth*=1.+force*(foldLight*.22-.08);cloth+=vec3(.10,.009,.006)*force*foldLight;
 rgb=mix(rgb,cloth,m.r*(1.-face)*enter*end);
 // A narrow reflection runs down the two registered steel blades.
 float pass=S(.1,.43,t);float axis=uv.y+uv.x*.22;float reflection=exp(-pow((axis-(.21+pass*.72))*20.,2.))*enter*end;
 float rough=pow(max(max(orig.r,orig.g),orig.b),1.4);rgb+=vec3(.30,.38,.43)*reflection*m.g*(.15+rough*.85)*enter*end;
 float glint=pow(reflection,4.)*m.g*rough;rgb+=vec3(.13,.16,.18)*glint;
 }else{
 // Authored painted shadow sheet, with distinct rear/front depth ownership.
 // Both sheets contract sideways as they relinquish the character silhouette.
 float opening=S(.50,.94,t),recede=S(.50,.98,t);
 vec2 backSize=vec2(mix(.46,.15,recede),.97);
 vec2 backUV=(uv-vec2(.47-opening*.26,.44-opening*.025))/backSize+vec2(.5);
 vec4 rear=texture2D(veil,backUV);float inside=step(0.,backUV.x)*step(backUV.x,1.)*step(0.,backUV.y)*step(backUV.y,1.);
 float backAlpha=rear.a*inside*(1.-m.b)*enter*(1.-S(.82,1.,t));
 rgb=mix(rgb,rear.rgb*vec3(.75,.80,.85),backAlpha*.78);
 float frontOpen=S(.14,.61,t);vec2 frontSize=vec2(mix(.37,.075,S(.24,.68,t)),.82);
 vec2 frontUV=(uv-vec2(.34+frontOpen*.40,.49+frontOpen*.04))/frontSize+vec2(.5);
 // Offset the painted section to avoid mirrored/identical silhouette repetition.
 frontUV.y=frontUV.y*.83+.10;
 vec4 front=texture2D(veil,frontUV);inside=step(0.,frontUV.x)*step(frontUV.x,1.)*step(0.,frontUV.y)*step(frontUV.y,1.);
 float frontAlpha=front.a*inside*m.b*(1.-face)*enter*(1.-S(.54,.75,t));
 rgb=mix(rgb,front.rgb*vec3(.69,.72,.78),frontAlpha*.78);
 float steel=S(.29,.43,t)*(1.-S(.51,.76,t));float rough=pow(max(max(orig.r,orig.g),orig.b),1.4);rgb+=vec3(.16,.22,.26)*m.g*steel*(.15+rough*.85);
 }
 gl_FragColor=vec4(clamp(rgb,0.,1.),1.);}`;
 const compile=(type:number,s:string)=>{const sh=gl.createShader(type)!;gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'shader');return sh;};this.p=gl.createProgram()!;const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(this.p,v);gl.attachShader(this.p,f);gl.linkProgram(this.p);if(!gl.getProgramParameter(this.p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.p)||'program');gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(this.p);
 this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.p,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 for(const [i,img]of [image,maskTexture(),veil].entries()){const tex=gl.createTexture()!;this.tex.push(tex);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.uniform1i(gl.getUniformLocation(this.p,['art','mask','veil'][i]),i);}
 }
 draw(ms:number,direction:Direction){const gl=this.gl;gl.useProgram(this.p);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.uniform1f(gl.getUniformLocation(this.p,'t'),Math.max(0,Math.min(1,ms/DURATION)));gl.uniform1f(gl.getUniformLocation(this.p,'mode'),direction==='blade'?0:1);gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;}
 dispose(){for(const t of this.tex)this.gl.deleteTexture(t);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.p);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
export class ArtLayer {
 readonly canvas=document.createElement('canvas');readonly accent=document.createElement('canvas');private ctx:CanvasRenderingContext2D;private img:HTMLImageElement;
 constructor(readonly node:HTMLElement){this.img=node.querySelector<HTMLImageElement>('.card-art img')!;if(!this.img)throw Error('Actual card art image missing');this.canvas.width=512;this.canvas.height=768;this.canvas.className='r2-art-layer';this.canvas.style.cssText='position:absolute;pointer-events:none;z-index:2';this.ctx=this.canvas.getContext('2d')!;this.img.parentElement!.append(this.canvas);this.accent.className='r2-blade-face';this.accent.style.cssText='position:absolute;pointer-events:none;left:-25%;top:0;width:150%;height:100%;z-index:4';node.append(this.accent);this.align();}
 align(){const s=getComputedStyle(this.img);for(const k of ['left','top','width','height','borderRadius']as const)this.canvas.style[k]=s[k];const w=this.img.clientWidth,h=this.img.clientHeight;if(w&&h){this.canvas.width=Math.round(w*Math.min(devicePixelRatio||1,2)*2);this.canvas.height=Math.round(h*Math.min(devicePixelRatio||1,2)*2);}}
 paint(source:HTMLCanvasElement,active:boolean,ms=0,direction:Direction='normal'){this.canvas.style.visibility=active?'visible':'hidden';this.accent.style.visibility=active&&direction==='blade'?'visible':'hidden';if(!active)return;this.align();const w=this.canvas.width,h=this.canvas.height;const scale=Math.max(w/source.width,h/source.height),dw=source.width*scale,dh=source.height*scale;const pos=getComputedStyle(this.img).objectPosition.split(' ');const ox=parseFloat(pos[0])/100||.5,oy=parseFloat(pos[1])/100||.22;this.ctx.clearRect(0,0,w,h);this.ctx.drawImage(source,(w-dw)*ox,(h-dh)*oy,dw,dh);
 if(direction==='blade')this.blade(ms);
 }
 private blade(ms:number){
  const s=(a:number,b:number,t:number)=>{const k=Math.max(0,Math.min(1,(t-a)/(b-a)));return k*k*(3-2*k);};const t=ms/DURATION;const power=s(.16,.34,t)*(1-s(.43,.76,t));
  const nw=this.node.offsetWidth,nh=this.node.offsetHeight,d=Math.min(devicePixelRatio||1,2)*2;this.accent.width=Math.round(nw*1.5*d);this.accent.height=Math.round(nh*d);const c=this.accent.getContext('2d')!;c.setTransform(d,0,0,d,nw*.25*d,0);c.clearRect(-nw*.25,0,nw*1.5,nh);if(power<.005)return;
  c.save();c.beginPath();c.rect(-nw*.10,nh*.17,nw*1.2,nh*.61);c.clip();
  const st=getComputedStyle(this.img),iw=this.img.clientWidth,ih=this.img.clientHeight,scale=Math.max(iw/832,ih/759),pos=st.objectPosition.split(' ');const ox=parseFloat(pos[0])/100||.5,oy=parseFloat(pos[1])/100||.22;
  c.translate(this.img.offsetLeft+(iw-832*scale)*ox,this.img.offsetTop+(ih-759*scale)*oy);c.scale(scale,scale);
  const reach=power*38;
  // The hilt is registered to the actual lower-right hand and blade. A short
  // steel plane extends from that edge, then contracts into the same blade.
  const tipX=670+reach,tipY=599+reach*.28;
  c.globalAlpha=power*.87;
  const face=new Path2D();face.moveTo(598,505);face.bezierCurveTo(620+power*8,516,654+power*35,547,tipX,tipY);face.bezierCurveTo(654+power*7,578,616,536,598,505);face.closePath();
  const g=c.createLinearGradient(608,506,667,573);g.addColorStop(0,'#172631');g.addColorStop(.35,'#48616b');g.addColorStop(.66,'#8eafb5');g.addColorStop(.76,'#cfddd9');g.addColorStop(.81,'#536b73');g.addColorStop(1,'#17232f');c.fillStyle=g;c.fill(face);
  c.beginPath();c.moveTo(601,508);c.bezierCurveTo(623+power*8,520,657+power*35,551,tipX,tipY);c.strokeStyle='#d7e4df';c.lineWidth=1.8;c.stroke();
  // A receding second edge is dark metal, not a second detached projectile.
  c.beginPath();c.moveTo(611,527);c.quadraticCurveTo(645+power*12,566,tipX-8*power,tipY-8);c.strokeStyle='#23313b';c.lineWidth=2.6;c.stroke();c.restore();
 }
 dispose(){this.canvas.remove();this.accent.remove();}
}
