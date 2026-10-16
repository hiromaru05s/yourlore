import * as T from 'three';
import {SETS,type SetIndex} from './catalog';
const W=384,H=600;
export function sleeveArt(index:SetIndex){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const base=canvas.cloneNode() as HTMLCanvasElement,mask=canvas.cloneNode() as HTMLCanvasElement;
 const c=base.getContext('2d')!,m=mask.getContext('2d')!,ctx=canvas.getContext('2d')!,s=SETS[index];
 const round=(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
 const stroke=(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string,width:number)=>{round(g,x,y,w,h,r);g.strokeStyle=color;g.lineWidth=width;g.stroke();};
 const line=(g:CanvasRenderingContext2D,points:number[][],color:string,width:number)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=color;g.lineWidth=width;g.stroke();};
 const fill=c.createLinearGradient(0,0,384,600);
 const colors=index===0?['#30343c','#10141b','#20252d']:index===1?['#fffdf6','#d8dcd9','#f2f1e9']:['#235b4d','#092b28','#174f44'];
 colors.forEach((v,i)=>fill.addColorStop(i/2,v));c.fillStyle=fill;c.fillRect(0,0,W,H);m.fillStyle='#000';m.fillRect(0,0,W,H);
 // Opaque cut edge plus continuous metal bevel; both survive runtime UV cropping.
 stroke(c,16,23,352,554,39,'#0a1419',12);
 stroke(c,23,30,338,540,33,index===1?'#7f949e':'#e1cc9f',6);
 stroke(c,29,36,326,528,28,index===1?'#ffffff':'#5c523d',2);
 stroke(c,40,48,304,504,20,s.metal,1.2);
 stroke(m,40,48,304,504,20,'#888',2);
 if(index===0){
  // One asymmetric, uninterrupted inlay. No repeating ornamental pattern.
  line(c,[[92,75],[92,525]],'#59482d',6);line(c,[[92,75],[92,525]],'#d3b77d',2.2);
  line(m,[[92,75],[92,525]],'#fff',3);
  c.fillStyle=s.metal;c.fillRect(177,283,4,34);c.fillRect(177,313,27,4);
 }else if(index===1){
  // Broad folded porcelain planes are tonal; the outer contour stays fixed.
  c.fillStyle='#ffffff35';c.beginPath();c.moveTo(50,60);c.lineTo(334,60);c.lineTo(192,300);c.closePath();c.fill();
  c.fillStyle='#81949b12';c.beginPath();c.moveTo(50,540);c.lineTo(334,540);c.lineTo(192,300);c.closePath();c.fill();
  line(c,[[68,105],[192,300],[316,105]],'#bdc9cb',1);
  line(c,[[68,495],[192,300],[316,495]],'#bdc9cb',1);
  line(m,[[68,105],[192,300],[316,105]],'#999',1.8);
  line(m,[[68,495],[192,300],[316,495]],'#999',1.8);
  c.fillStyle='#778e99';c.beginPath();c.moveTo(192,281);c.lineTo(204,300);c.lineTo(192,319);c.lineTo(180,300);c.closePath();c.fill();
 }else{
  c.fillStyle='#91cfb416';c.beginPath();c.moveTo(48,66);c.lineTo(105,66);c.lineTo(336,490);c.lineTo(336,538);c.lineTo(279,538);c.closePath();c.fill();
  for(const y of [80,510]){const g=c.createLinearGradient(110,y,274,y+12);g.addColorStop(0,'#7d6b46');g.addColorStop(.45,'#f1deb1');g.addColorStop(1,'#a58d58');c.fillStyle=g;round(c,112,y,160,10,3);c.fill();m.fillStyle='#bbb';m.fillRect(112,y,160,10);}
  stroke(c,175,280,34,40,8,s.metal,2);c.fillStyle='#76b29b';round(c,181,286,22,28,5);c.fill();
 }
 c.textAlign='center';c.font='12px Georgia';c.fillStyle=index===1?'#617780':'#c9b78d';c.fillText('L O R E',192,536);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const finish=new T.CanvasTexture(mask);finish.anisotropy=8;
 const foil=canvas.cloneNode() as HTMLCanvasElement,f=foil.getContext('2d')!;
 const alpha=canvas.cloneNode() as HTMLCanvasElement,a=alpha.getContext('2d')!;
 a.drawImage(mask,0,0);const pix=a.getImageData(0,0,W,H);
 for(let j=0;j<pix.data.length;j+=4){pix.data[j+3]=pix.data[j];pix.data[j]=pix.data[j+1]=pix.data[j+2]=255;}a.putImageData(pix,0,0);
 let last=-100;
 function paint(time:number){
  if(Math.abs(last-time)<1/24)return;last=time;
  ctx.clearRect(0,0,W,H);ctx.drawImage(base,0,0);ctx.save();round(ctx,43,51,298,498,17);ctx.clip();
  const phase=time*Math.PI*2/[12,16,14][index];
  // Reflection is clipped to the material surface, never an external glow.
  const x=192+Math.sin(phase)*205;
  let reflection:CanvasGradient;
  if(index===0)reflection=ctx.createLinearGradient(x-95,0,x+95,600);
  else if(index===1)reflection=ctx.createLinearGradient(0,300+Math.sin(phase)*220-150,384,300+Math.sin(phase)*220+150);
  else reflection=ctx.createLinearGradient(x-125,600,x+125,0);
  reflection.addColorStop(0,'#ffffff00');reflection.addColorStop(.4,'#ffffff00');reflection.addColorStop(.5,index===1?'#ffffff80':index===0?'#dce8ff22':'#a9f4d834');reflection.addColorStop(.65,'#ffffff00');reflection.addColorStop(1,'#ffffff00');
  ctx.fillStyle=reflection;ctx.fillRect(0,0,W,H);ctx.restore();
  f.clearRect(0,0,W,H);f.globalCompositeOperation='source-over';f.drawImage(alpha,0,0);f.globalCompositeOperation='source-in';
  const band=f.createLinearGradient(0,0,0,H);for(let n=0;n<=48;n++){const y=n/48,v=Math.pow(.5+.5*Math.cos(y*Math.PI*2-phase),18);band.addColorStop(y,`rgba(255,245,215,${v*.65})`);}f.fillStyle=band;f.fillRect(0,0,W,H);
  ctx.drawImage(foil,0,0);map.needsUpdate=true;
 }
 paint(0);
 return {canvas,map,finish,paint,dispose(){map.dispose();finish.dispose();}};
}
export function animatedSleeve(index:SetIndex,art:ReturnType<typeof sleeveArt>,_clock:{value:number}){
 return new T.MeshPhysicalMaterial({map:art.map,metalnessMap:art.finish,metalness:index===1?.15:.45,roughness:.3,clearcoat:1,clearcoatRoughness:.18});
}
