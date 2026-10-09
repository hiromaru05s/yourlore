import * as T from 'three';
export function pactTexture(ink=false){
 const c=document.createElement('canvas');c.width=768;c.height=1080;const p=c.getContext('2d')!;
 if(!ink){const g=p.createLinearGradient(0,0,768,1080);g.addColorStop(0,'#31203f');g.addColorStop(.45,'#59426e');g.addColorStop(1,'#21192f');p.fillStyle=g;p.fillRect(0,0,768,1080);for(let i=0;i<8000;i++){const x=(Math.sin(i*73.13)*43123%1+1)%1*768,y=(Math.sin(i*97.41)*65437%1+1)%1*1080;p.fillStyle=i%2?'#03020a18':'#f2d7ff0c';p.fillRect(x,y,1+i%3,1);}}
 p.strokeStyle=ink?'#ca91ff':'#a190b7';p.fillStyle=ink?'#dbb4ff':'#d8c8e8';p.lineWidth=ink?2:1.5;p.shadowColor='#a648ff';p.shadowBlur=ink?12:0;
 p.strokeRect(37,37,694,1006);p.strokeRect(48,49,672,982);
 for(const [x,y,s]of [[70,72,1],[698,72,-1],[70,1008,1],[698,1008,-1]]){p.beginPath();p.moveTo(x,y+30);p.lineTo(x,y);p.lineTo(x+s*40,y);p.moveTo(x,y+17);p.lineTo(x+s*17,y);p.stroke();}
 // Authored paths, not font glyphs: identical across languages and platforms.
 const row=(y:number,count:number,size:number,seed:number)=>{p.save();p.lineWidth=1.8;const step=33*size,start=384-(count-1)*step/2-9*size;for(let i=0;i<count;i++){p.save();p.translate(start+i*step,y);p.scale(size,size);const n=(i*13+seed*7)%6;p.beginPath();if(n===0){p.moveTo(3,13);p.lineTo(3,-12);p.lineTo(18,-3);p.lineTo(3,4);}else if(n===1){p.moveTo(8,-12);p.lineTo(18,0);p.lineTo(8,12);p.lineTo(-2,0);p.closePath();}else if(n===2){p.moveTo(0,-9);p.lineTo(17,-9);p.lineTo(1,11);p.lineTo(19,11);}else if(n===3){p.moveTo(0,12);p.lineTo(8,-12);p.lineTo(17,12);p.moveTo(3,4);p.lineTo(14,4);}else if(n===4){p.moveTo(9,-12);p.lineTo(9,13);p.moveTo(0,-4);p.lineTo(9,3);p.lineTo(19,-4);}else{p.moveTo(0,-10);p.lineTo(18,10);p.moveTo(18,-10);p.lineTo(0,10);p.moveTo(-2,0);p.lineTo(21,0);}p.stroke();p.restore();}p.restore();};
 row(110,17,.58,11);row(187,7,1.65,19);
 for(let j=0;j<5;j++)row(309+j*66,18,1,j);
 p.shadowBlur=ink?10:0;row(704,7,.95,23);row(760,21,.72,29);row(953,16,.58,37);
 // A personal mark rather than a free-floating decoration: authored onto paper UVs.
 p.lineWidth=3;p.beginPath();p.moveTo(238,864);p.bezierCurveTo(440,737,419,976,310,859);p.bezierCurveTo(267,814,544,893,512,830);p.stroke();
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
}
export function sealTexture(){const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d')!;p.translate(256,256);p.strokeStyle='#edd1ff';p.shadowColor='#a957ff';p.shadowBlur=16;p.lineWidth=3;for(const r of [166,180]){p.beginPath();p.arc(0,0,r,0,Math.PI*2);p.stroke();}for(let i=0;i<8;i++){p.save();p.rotate(i*Math.PI/4);p.beginPath();p.moveTo(0,-154);p.lineTo(17,-129);p.lineTo(0,-108);p.lineTo(-17,-129);p.closePath();p.stroke();p.restore();}p.lineWidth=5;p.beginPath();p.moveTo(0,-95);p.lineTo(80,48);p.lineTo(-80,48);p.closePath();p.moveTo(0,96);p.lineTo(0,-95);p.moveTo(-90,0);p.bezierCurveTo(-30,-60,30,-60,90,0);p.bezierCurveTo(30,60,-30,60,-90,0);p.stroke();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
