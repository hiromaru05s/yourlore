import {GrantMaterial} from '../../ui/statusGrant/material';
import {transferLight,luminousPath} from '../../ui/statusGrant/light';
import {Material,smooth} from './material';
import {Surface} from './surface';
import type {Study} from './catalog';
import {beforeCount,afterCount} from './catalog';
type C=CanvasRenderingContext2D;
export type Assets={shield:HTMLImageElement;brand:HTMLImageElement;blue:HTMLImageElement;red:HTMLImageElement;shieldCard:HTMLImageElement;brandCard:HTMLImageElement};
const load=(src:string)=>new Promise<HTMLImageElement>((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(Error('Asset failed: '+src));i.src=src;});
export async function loadAssets():Promise<Assets>{const [shield,brand,blue,red,shieldCard,brandCard]=await Promise.all(['/art/biblion/modular/shield-ui.webp','/art/biblion/modular/brand-seal-ui.png','/art/seekers/v2/blue-idle.webp','/art/seekers/v2/red-idle.webp','/art/cards/DEFENSIVE_STANCE.webp','/art/cards/QUICK_HELLFIRE.webp'].map(load));return{shield,brand,blue,red,shieldCard,brandCard};}
export class Renderer{
 surface=new Surface();approved:Record<'shield'|'brand',GrantMaterial>;materials:Record<'shield'|'brand',Material>;
 constructor(public assets:Assets){this.approved={shield:new GrantMaterial(assets.shield,this.surface),brand:new GrantMaterial(assets.brand,this.surface)};this.materials={shield:new Material(assets.shield,this.surface),brand:new Material(assets.brand,this.surface)};}
 dispose(){this.surface.dispose();}
 effect(c:C,s:Study,ms:number,x:number,y:number,size:number,reduced=false){c.save();c.translate(x,y);c.scale(size/200,size/200);if(reduced){this.materials[s.family].image=this.materials[s.family].original;this.materials[s.family].face(c,0,0,1,s.mode==='add'||ms>=s.contact?1:0);}else if(['SF3','SA1','BF3','BA4'].includes(s.id))this.approved[s.family].draw(c,s,ms);else this.materials[s.family].draw(c,s,ms);c.restore();}
 count(c:C,s:Study,ms:number,x:number,y:number,size:number){const n=ms>=s.contact?afterCount(s):beforeCount(s);if(!n)return;c.save();c.font=`600 ${size*.24}px Georgia,serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f8f4e6';c.shadowColor='#050510';c.shadowBlur=3;c.shadowOffsetY=1;c.fillText(String(n),x,y+size*.05);c.restore();}
 transfer(c:C,s:Study,ms:number,a:{x:number;y:number},b:{x:number;y:number},scale=1){
  if(['SF3','SA1','BF3','BA4'].includes(s.id)){transferLight(c,ms/s.duration,[a.x,a.y],[b.x,b.y],s.family==='brand',scale);return;}
  const t=ms/s.duration,p=smooth(.04,.33,t),end=smooth(.26,.45,t);if(p<=0||end>=1)return;
  const hot=s.family==='brand',color=hot?'#ed9d77':'#b9dcf6';c.save();c.globalAlpha=(1-end)*.85;
  for(let j=0;j<3;j++){const tail=Math.max(0,p-.22-j*.035),head=Math.max(0,p-j*.025);c.beginPath();for(let k=0;k<=24;k++){const u=tail+(head-tail)*k/24,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u-Math.sin(Math.PI*u)*(18+j*5)*scale;k?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=j?color:(hot?'#512036':'#224c71');c.lineWidth=(j?1:4)*scale;c.stroke();}c.restore();
 }
 draw(canvas:HTMLCanvasElement,s:Study,ms:number,dark:boolean,side:number,reduced=false){const c=canvas.getContext('2d')!;c.setTransform(canvas.width/640,0,0,canvas.height/370,0,0);c.clearRect(0,0,640,370);
  const g=c.createLinearGradient(0,0,640,370);g.addColorStop(0,dark?'#10151e':'#f5f1e8');g.addColorStop(1,dark?'#202936':'#dedbd3');c.fillStyle=g;c.fillRect(0,0,640,370);
  // Warm stone/table grounding with narrow engraved guides, not floating rings.
  c.strokeStyle=dark?'#ffffff08':'#54462710';c.lineWidth=.7;for(let j=0;j<5;j++){c.beginPath();c.moveTo(-50,295+j*13);c.lineTo(690,295+j*13);c.stroke();}
  const pc={x:416,y:161},badge={x:s.family==='shield'?333:490,y:242},sz=139;
  c.save();const shadowGradient=c.createRadialGradient(pc.x,264,3,pc.x,264,126);shadowGradient.addColorStop(0,dark?'#0008':'#2a293239');shadowGradient.addColorStop(1,'transparent');c.fillStyle=shadowGradient;c.translate(0,160);c.scale(1,.4);c.fillRect(265,100,315,300);c.restore();
  // Existing portrait gives the effect a concrete owner and a stable size reference.
  c.save();c.beginPath();c.arc(pc.x,pc.y,103,0,Math.PI*2);c.fillStyle='#172238';c.fill();c.clip();const portrait=side?this.assets.red:this.assets.blue;c.drawImage(portrait,0,0,portrait.naturalWidth/4,portrait.naturalHeight/4,pc.x-109,pc.y-109,218,218);c.restore();
  c.strokeStyle=dark?'#bbaa79':'#a9925e';c.lineWidth=3;c.beginPath();c.arc(pc.x,pc.y,105,0,Math.PI*2);c.stroke();c.strokeStyle=dark?'#e8e2c550':'#fff8e7';c.lineWidth=1;c.beginPath();c.arc(pc.x,pc.y,108,0,Math.PI*2);c.stroke();
  // Source art remains visible; its narrow embossed border feeds the actual destination.
  const img=s.family==='shield'?this.assets.shieldCard:this.assets.brandCard;const sx=84,sy=111,sw=96,sh=140;
  c.save();c.shadowColor='#10182755';c.shadowBlur=14;c.shadowOffsetY=7;c.fillStyle='#a18b5c';c.fillRect(sx-3,sy-3,sw+6,sh+6);c.shadowBlur=0;c.shadowOffsetY=0;c.beginPath();c.rect(sx,sy,sw,sh);c.clip();c.drawImage(img,sx,sy,sw,sh);c.restore();
  const t=ms/s.duration,charge=Math.sin(Math.PI*smooth(.02,.3,t))*(1-smooth(.22,.42,t));if(charge>0&&!reduced&&['SF3','SA1','BF3','BA4'].includes(s.id)){c.save();c.globalAlpha=charge;luminousPath(c,[[sx,sy+sh],[sx-1,sy+18],[sx+10,sy-1],[sx+sw-10,sy-1],[sx+sw+1,sy+18],[sx+sw,sy+sh]],smooth(.02,.26,t),s.family==='brand',1.2,.55);c.restore();}else if(charge>0&&!reduced){c.save();c.strokeStyle=s.family==='shield'?`rgba(179,226,255,${charge})`:`rgba(255,153,111,${charge})`;c.lineWidth=2;c.strokeRect(sx-1,sy-1,sw+2,sh+2);c.restore();}
  if(!reduced)this.transfer(c,s,ms,{x:sx+sw,y:sy+65},badge);
  this.effect(c,s,ms,badge.x,badge.y,sz,reduced);this.count(c,s,ms,badge.x,badge.y,sz);
  c.fillStyle=dark?'#9ea8b8':'#7f7970';c.font='11px system-ui';c.textAlign='center';c.fillText('発生源',sx+sw/2,278);c.fillText(side?'OPPONENT':'YOU',pc.x,35);
  c.textAlign='left';c.font='10px system-ui';c.fillStyle=dark?'#a8b3c4':'#777268';c.fillText(s.mode==='first'?'初回：未所持 → 付与':'追加：既存の状態を保持 → 加算',24,342);
  c.textAlign='right';c.fillText(`${beforeCount(s)} → ${afterCount(s)}`,615,342);
 }
}
