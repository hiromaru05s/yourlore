import * as T from 'three';
// Translucent, weathered ink. No bright halo and no opaque plate across the face.
export function sigilTexture(variant:number){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=768;const c=canvas.getContext('2d')!;c.translate(384,384);c.strokeStyle='#09070e';c.lineCap='round';c.shadowColor='#c1b7b6';c.shadowBlur=1.5;c.shadowOffsetX=.8;c.shadowOffsetY=1.2;
 const ring=(r:number,w:number,alpha:number,start=0,end=Math.PI*2)=>{c.globalAlpha=Math.min(.75,alpha*1.65);c.lineWidth=w*1.65;c.beginPath();c.arc(0,0,r,start,end);c.stroke()};
 ring(323,1.5,.38);ring(312,3,.42);ring(282,1.4,.28);ring(270,1,.24);ring(207,2,.34);
 for(let j=0;j<72;j++){const a=j/72*Math.PI*2;c.save();c.rotate(a);c.globalAlpha=j%6===0?.4:.22;c.lineWidth=j%6===0?2:1;c.beginPath();c.moveTo(286,0);c.lineTo(j%6===0?309:298,0);c.stroke();c.restore()}
 for(let j=0;j<24;j++){c.save();c.rotate(j*Math.PI/12);c.translate(240,0);c.globalAlpha=.52;c.lineWidth=2.5;c.beginPath();c.moveTo(-8,-9);c.lineTo(6,-9);c.lineTo(-2,0);c.lineTo(8,8);c.moveTo(j%2?-5:7,-4);c.lineTo(-6,8);c.stroke();c.restore()}
 const n=[4,3,6,8][variant];for(let j=0;j<n;j++){const a=j/n*Math.PI*2;c.save();c.rotate(a);c.globalAlpha=.5;c.lineWidth=2.8;c.beginPath();if(variant===1){c.moveTo(0,-150);c.bezierCurveTo(175,-160,190,140,0,170)}else if(variant===2){c.moveTo(0,-195);c.lineTo(48,-90);c.lineTo(-16,-50);c.lineTo(0,0)}else{c.moveTo(0,-202);c.lineTo(variant===3?32:78,-72);c.lineTo(0,-28);c.lineTo(variant===3?-32:-78,-72);c.closePath()}c.stroke();c.restore()}
 ring(90,1,.22);ring(26,2,.35);for(let j=0;j<8;j++)ring(180+j*5,.7,.12,j*.78,j*.78+.35);
 // Fine erosion in the engraved strokes; deterministic, stationary surface detail.
 c.globalCompositeOperation='destination-out';for(let i=0;i<1500;i++){const a=i*2.399963,r=Math.sqrt((i*7919%1499)/1499)*337;c.globalAlpha=.12+(i%7)*.035;c.fillRect(Math.cos(a)*r,Math.sin(a)*r,1+i%3,.5+i%2)}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;return texture;
}
export function smokeMaterial(){return new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,depthTest:false,uniforms:{clock:{value:0},kind:{value:0},strength:{value:1},burst:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float clock,kind,strength,burst;
 float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){return noise(p)*.55+noise(p*2.03+4.)*.28+noise(p*4.1)*.17;}
 float density(vec3 p){float n=fbm(p*4.2+vec3(clock*.22,-clock*.6,clock*.13));float r=length(p*vec3(1.,1.,.85));float shape=1.-smoothstep(.18,.94,r+(n-.48)*.6);return shape*smoothstep(.24,.66,n)*(1.-smoothstep(.90,1.1,r));}
 void main(){vec2 uv=vUv*2.-1.;vec3 acc=vec3(0.);float alpha=0.;for(int i=0;i<28;i++){float z=1.1-float(i)*.0815;vec3 p=vec3(uv,z);p.xy+=vec2(sin(z*5.+clock),cos(z*4.-clock))*.035;float d=density(p);float shade=clamp((density(p)-density(p+vec3(-.09,.12,.16)))*6.+.12,0.,1.);vec3 color=vec3(.008,.006,.013)+shade*vec3(.22,.20,.24);float a=1.-exp(-d*.38*strength);acc+=(1.-alpha)*a*color;alpha+=(1.-alpha)*a;if(alpha>.975)break;}float edge=1.-smoothstep(.95,1.1,length(uv));alpha*=edge;gl_FragColor=vec4(acc/max(alpha,.001),alpha);}
`})}
