import * as T from 'three';
// Authored fictional glyphs: a fixed stroke alphabet, no random Unicode or living-script text.
const strokes=[[[0,-1],[0,1],[-.6,.4],[.6,-.4]], [[-.6,-1],[.6,-1],[0,0],[0,1]], [[-.6,-.8],[.6,0],[-.6,.8],[-.6,-.8]], [[0,-1],[.6,0],[0,1],[-.6,0],[0,-1]], [[-.6,-1],[-.6,1],[.6,1],[.6,-.3],[-.6,-.3]], [[-.6,-.8],[0,-.3],[.6,-.8],[0,1],[-.6,-.8]], [[-.6,-1],[.6,1],[0,0],[-.6,1],[.6,-1]], [[0,1],[0,-1],[-.6,-.5],[.6,-.5]]];
export function glyph(c:CanvasRenderingContext2D,n:number,x:number,y:number,size:number){c.save();c.translate(x,y);c.beginPath();strokes[n%strokes.length].forEach(([a,b],i)=>i?c.lineTo(a*size,b*size):c.moveTo(a*size,b*size));c.stroke();c.restore();}
export function inscription(style=0,solid=false){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d')!;c.translate(512,512);
 if(solid){const g=c.createRadialGradient(-90,-120,40,0,0,500);g.addColorStop(0,'#354047');g.addColorStop(.65,'#1c272d');g.addColorStop(1,'#0b141c');c.fillStyle=g;c.beginPath();c.arc(0,0,493,0,Math.PI*2);c.fill();}
 c.strokeStyle='#bb9852';c.lineWidth=2;c.lineCap='square';
 const circle=(r:number)=>{c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();};
 [489,482,455,382,372,336,330,237].forEach(circle);
 c.lineWidth=5;circle(476);c.lineWidth=1.5;
 for(let i=0;i<64;i++){const a=i/64*Math.PI*2;c.save();c.rotate(a);c.beginPath();c.moveTo(0,-467);c.lineTo(0,i%4===0?-445:-454);c.stroke();c.restore();}
 for(let i=0;i<40;i++){const a=i/40*Math.PI*2;c.save();c.rotate(a);c.lineWidth=2.5;glyph(c,i*3+style,0,-418,14);c.restore();}
 const count=style===1?4:style===2?3:6;
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2;c.save();c.rotate(a);c.lineWidth=3;c.beginPath();c.moveTo(-170,-280);c.lineTo(0,-329);c.lineTo(170,-280);c.lineTo(0,19);c.closePath();c.stroke();c.lineWidth=1;circle(171);c.fillStyle='#162632';c.fillRect(-26,-337,52,54);c.strokeRect(-26,-337,52,54);c.lineWidth=3;glyph(c,i+style,0,-310,18);c.restore();}
 c.lineWidth=5;c.beginPath();c.moveTo(0,-166);c.lineTo(75,-40);c.lineTo(34,-40);c.lineTo(34,118);c.lineTo(-34,118);c.lineTo(-34,-40);c.lineTo(-75,-40);c.closePath();c.stroke();
 c.lineWidth=8;for(const y of [-15,25,65]){c.beginPath();c.moveTo(-82,y);c.lineTo(82,y);c.stroke();}
 c.lineWidth=2;circle(205);
 // Fine incised breaks age the edge without turning the seal into visual noise.
 c.globalCompositeOperation='destination-out';for(let i=0;i<48;i++){const a=i*2.399,r=355+(i%7)*19;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);c.fillRect(0,0,7+i%5,2);c.restore();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
export function tabletTexture(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;const c=canvas.getContext('2d')!;c.fillStyle='#172630';c.fillRect(0,0,256,1024);c.strokeStyle='#967747';c.lineWidth=3;c.strokeRect(16,16,224,992);c.lineWidth=1;c.strokeRect(24,24,208,976);for(let i=0;i<11;i++){c.lineWidth=i%3===0?5:3;glyph(c,i*5,128,85+i*85,25);c.lineWidth=1;c.beginPath();c.moveTo(67,126+i*85);c.lineTo(189,126+i*85);c.stroke();}const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;}

export function stoneRelief(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;c.fillStyle='#8d8b84';c.fillRect(0,0,512,512);let seed=619;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<14000;i++){const bright=rand()>.55;c.fillStyle=bright?'rgba(242,235,209,.13)':'rgba(22,29,30,.12)';c.fillRect(rand()*512,rand()*512,rand()*2.5+1,rand()*1.8+1);}
 for(let i=0;i<28;i++){c.beginPath();let x=rand()*512,y=rand()*512;c.moveTo(x,y);for(let j=0;j<5;j++){x+=rand()*21-7;y+=rand()*34;c.lineTo(x,y);}c.strokeStyle='rgba(21,25,29,.20)';c.lineWidth=.7;c.stroke();}
 const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex;
}
