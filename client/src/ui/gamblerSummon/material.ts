import * as T from 'three';

// The design is authored in the wheel's own polar surface. No text or outcome numbers.
export function wheelTexture(style:number,legend:boolean):T.CanvasTexture {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d')!,mid=512;
 c.fillStyle=['#281019','#27221d','#3b121d','#151820','#100f1a'][style];c.fillRect(0,0,1024,1024);
 c.translate(mid,mid);
 const circle=(r:number,fill:string,line?:string,width=1)=>{c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(line){c.strokeStyle=line;c.lineWidth=width;c.stroke()}};
 const gold=legend?'#d5ae61':'#b58a44',light=legend?'#ead198':'#d2b57a';
 circle(502,'#281d18',gold,6);circle(481,gold,'#e1c786',3);circle(464,'#3e2c1c',light,2);circle(444,gold);
 circle(426,'#18131b',light,4);
 const n=legend?24:16;
 for(let i=0;i<n;i++){
  const a=(i+.03)/n*Math.PI*2,b=(i+.97)/n*Math.PI*2;
  const red=style===1?'#e0cda3':style===4?'#252238':'#742738';const black=style===1?'#302a25':'#1c1920';
  c.beginPath();c.arc(0,0,413,a,b);c.arc(0,0,202,b,a,true);c.closePath();c.fillStyle=i%2?red:black;c.fill();c.strokeStyle=gold;c.lineWidth=2;c.stroke();
  c.save();c.rotate((a+b)/2);c.translate(315,0);c.rotate(Math.PI/2);c.strokeStyle=light;c.lineWidth=2.5;
  c.beginPath();c.moveTo(0,-35);c.bezierCurveTo(18,-14,18,6,0,27);c.bezierCurveTo(-18,6,-18,-14,0,-35);c.stroke();
  c.beginPath();c.moveTo(-8,34);c.lineTo(0,42);c.lineTo(8,34);c.stroke();c.restore();
 }
 circle(198,gold,light,3);circle(181,'#261d22',gold,4);circle(151,style===1?'#d9c6a4':'#422332',light,3);
 for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.strokeStyle=gold;c.lineWidth=2;c.beginPath();c.moveTo(0,132);c.bezierCurveTo(25,87,35,72,0,45);c.bezierCurveTo(-35,72,-25,87,0,132);c.stroke();c.restore()}
 circle(58,gold,light,4);circle(41,'#382630',gold,2);c.strokeStyle=light;c.lineWidth=4;c.beginPath();c.moveTo(0,-25);c.lineTo(16,0);c.lineTo(0,25);c.lineTo(-16,0);c.closePath();c.stroke();
 // Radial milling, very fine tool marks and engraved rim notches.
 for(let i=0;i<192;i++){c.save();c.rotate(i/192*Math.PI*2);c.strokeStyle=i%4?'#5c452740':light;c.lineWidth=i%4?1:2;c.beginPath();c.moveTo(0,470);c.lineTo(0,i%4?479:492);c.stroke();c.restore()}
 c.globalAlpha=.13;for(let i=0;i<16000;i++){const a=Math.sin(i*127.1)*43758.5453,x=(a-Math.floor(a))*1024-512;const b=Math.sin(i*311.7)*71317.112,y=(b-Math.floor(b))*1024-512;c.fillStyle=i%2?'#fff1bc':'#000000';c.fillRect(x,y,1.5,.6)}c.globalAlpha=1;
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
export function surfaceMaterial(card:T.Texture,wheel:T.Texture,legend:boolean){
 const uniforms={material:{value:0},wheel:{value:wheel}};
 const material=new T.MeshStandardMaterial({map:card,metalness:.54,roughness:.34,envMapIntensity:.65,side:T.FrontSide,color:0xffffff});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uMaterial=uniforms.material;shader.uniforms.uWheel=uniforms.wheel;
  shader.vertexShader='attribute vec2 wheelUv; varying vec2 vWheelUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvWheelUv=wheelUv;');
  shader.fragmentShader='uniform float uMaterial;uniform sampler2D uWheel;varying vec2 vWheelUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 polar=vWheelUv*2.0-1.0;
   float rad=length(polar);
   float tooling=sin(atan(polar.y,polar.x)*24.0+rad*18.0)*0.014;
   float transition=smoothstep(0.02,0.22,uMaterial-(1.0-rad)*0.30+tooling);
   vec3 enamel=texture2D(uWheel,vWheelUv).rgb;
   diffuseColor.rgb=mix(diffuseColor.rgb,enamel,transition);
  `);
 };
 material.customProgramCacheKey=()=>`gambler-solid-surface-${legend}`;
 return {material,uniforms};
}
