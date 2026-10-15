import * as T from 'three';
export function velvet(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!;
 const base='#4c0e20';
 x.fillStyle=base;x.fillRect(0,0,512,512);
 for(let y=0;y<512;y+=2){x.strokeStyle='rgba(225,197,143,.035)';x.lineWidth=1;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(160,y+Math.sin(y)*7,340,y-3,512,y);x.stroke()}
 const gold=x.createLinearGradient(0,0,512,450);gold.addColorStop(0,'#e6cd8e');gold.addColorStop(.28,'#7b5124');gold.addColorStop(.55,'#efdb9d');gold.addColorStop(.8,'#a57836');gold.addColorStop(1,'#e6c27c');x.strokeStyle=gold;x.fillStyle=gold;
 function star(cx:number,cy:number,r:number){x.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,rr=i%2?r*.25:i%4?r*.60:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.closePath();x.fill();x.stroke()}
 x.lineWidth=4;x.strokeRect(19,19,474,474);x.lineWidth=1;x.strokeRect(28,28,456,456);for(const a of [0,1,2,3]){x.save();x.translate(256,256);x.rotate(a*Math.PI/2);x.beginPath();x.moveTo(-225,-179);x.bezierCurveTo(-166,-182,-184,-220,-146,-224);x.stroke();x.restore()}
 x.globalAlpha=.36;for(let y=70;y<480;y+=84)for(let a=65;a<490;a+=84)star(a,y,18);x.globalAlpha=1;x.lineWidth=8;x.strokeRect(40,40,432,432)
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
