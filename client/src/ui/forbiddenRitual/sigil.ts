import * as T from 'three';
const TAU=Math.PI*2;
/** Authored fictional glyph strokes; no borrowed occult/game textures. */
export function sigilTexture(){
 const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d')!;g.translate(512,512);g.strokeStyle='white';g.fillStyle='white';g.lineCap='round';
 const arc=(r:number,a=0,b=TAU,w=1.7)=>{g.lineWidth=w;g.beginPath();g.arc(0,0,r,a,b);g.stroke();};
 const line=(points:number[][],w=1.6,closed=false)=>{g.lineWidth=w;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(closed)g.closePath();g.stroke();};
 const poly=(r:number,n:number,skip=1,rot=0)=>{const pts=Array.from({length:n},(_,i)=>[Math.cos(i*skip/n*TAU+rot)*r,Math.sin(i*skip/n*TAU+rot)*r]);line(pts,1.6,true);};
 const glyphs=(r:number,n:number,size:number,seed:number)=>{for(let i=0;i<n;i++){g.save();g.rotate(i/n*TAU);g.translate(0,-r);g.scale(size,size);const k=(i*7+seed)%9;line([[-.35,.65],[.08,-.65],[.35,.35]],.12);if(k%2)line([[-.35,.15],[.4,-.25]],.10);if(k%3===0)line([[-.25,-.4],[.28,-.1],[-.22,.3]],.09);if(k%3===1)line([[-.32,-.55],[-.52,-.2],[-.15,.05]],.08);if(k>4){g.beginPath();g.arc(.34,-.5,.12,0,TAU);g.fill();}g.restore();}};
 {[449,440,386,364,300,291].forEach(r=>arc(r));glyphs(413,56,20,7);glyphs(333,32,16,1);poly(278,9,4);poly(262,3);for(let i=0;i<9;i++){g.save();g.rotate(i/9*TAU);arc(259,-.04,.04,6);line([[285,0],[365,0]],1);g.restore();}}
 // Dense graduated ticks provide scale without obscuring the primary topology.
 for(let i=0;i<180;i++){const a=i/180*TAU,r=455;line([[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(a)*(r+(i%5?4:12)),Math.sin(a)*(r+(i%5?4:12))]],i%5?1:2);}
 const map=new T.CanvasTexture(c);map.anisotropy=4;return map;
}
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
export function sigilMaterial(map:T.Texture,halo=false){
 const uniforms={ink:{value:map},open:{value:0},opacity:{value:0},time:{value:0},halo:{value:halo?1:0}};
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:halo?T.AdditiveBlending:T.NormalBlending,toneMapped:false,uniforms,vertexShader:vertex,fragmentShader:`
 varying vec2 vUv;uniform sampler2D ink;uniform float open,opacity,time,halo;
 void main(){vec2 p=vUv-.5;float radius=length(p);float angle=mod(atan(p.y,p.x)+6.2831853,6.2831853)/6.2831853;
 float traced=smoothstep(angle-.06,angle+.03,open*1.35-.04)*smoothstep(radius-.07,radius+.01,open*.72);
 float a=texture2D(ink,vUv).a;
 if(halo>.5){float b=0.;for(int i=0;i<8;i++){float f=float(i)*.785398;vec2 d=vec2(cos(f),sin(f));b+=texture2D(ink,vUv+d*.004).a*.055+texture2D(ink,vUv+d*.01).a*.032;}a=b;}
 float pulse=.87+.13*sin(time*2.7-radius*24.+angle*7.);
 vec3 color=halo>.5?vec3(1.,.016,.028):mix(vec3(.67,.012,.045),vec3(1.,.29,.24),a*a*.65);
 gl_FragColor=vec4(color,a*traced*opacity*pulse*(halo>.5?1.8:1.));
 }`});return {mat,uniforms};
}
export function lightSkin(map:T.Texture){
 const uniforms={face:{value:map},energy:{value:0},opacity:{value:1},time:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,vertexShader:vertex,fragmentShader:`
 varying vec2 vUv;uniform sampler2D face;uniform float energy,opacity,time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 void main(){vec2 p=(vUv-.5)*vec2(1.6,2.24),q=abs(p)-vec2(.49,.69);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.025;
 float inside=1.-smoothstep(-.003,.008,d),rim=exp(-abs(d)*100.);float halo=exp(-max(d,0.)*21.)*(1.-inside);
 vec2 uv=(p/vec2(1.03,1.43))+.5;vec3 art=pow(texture2D(face,clamp(uv,0.,1.)).rgb,vec3(1./2.2));
 float n=noise(p*4.+vec2(time*.22,-time*.7))*.6+noise(p*11.-time*.4)*.4;float veins=pow(1.-abs(sin(p.y*13.+p.x*8.+n*9.-time*2.)),16.);
 vec3 red=vec3(.12,.002,.013)+vec3(.46,.018,.034)*n+vec3(.23,.023,.024)*veins;red+=vec3(.45,.017,.03)*exp(-abs(d)*13.);
 vec3 body=mix(art,red,energy);body+=vec3(1.,.34,.26)*rim*energy*1.15;
 vec3 color=mix(vec3(.9,.013,.035),body,inside);float a=inside+halo*energy*.65;gl_FragColor=vec4(color,a*opacity);
 }`});return {mat,uniforms};
}
