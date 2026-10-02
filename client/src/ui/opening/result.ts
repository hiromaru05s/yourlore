/** Result designs share the same finished physical coin and only begin after landing. */
import {OPENING_REVEAL_MS,OPENING_EXIT_MS,OPENING_VISUAL_MS} from '../../shared/opening';
import {getLang} from '../../i18n';
export const RESULT_TIMING={land:OPENING_REVEAL_MS/1000,exit:OPENING_EXIT_MS/1000,end:OPENING_VISUAL_MS/1000} as const;
export type CoinDraw=(x:number,y:number,r:number,rx:number,ry:number,rz:number,alpha?:number,heat?:number)=>void;
export type PortraitDraw=(side:number,x:number,y:number,w:number,h:number,zoom?:number)=>void;
export type ResultOptions={first:boolean;light:boolean;reduced:boolean};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const out=(x:number)=>1-(1-clamp(x))**3;
const sm=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
export function resultScene(g:CanvasRenderingContext2D,t:number,W:number,H:number,o:ResultOptions,coin:CoinDraw){
 const {land,exit,end}=RESULT_TIMING;if(t<land||t>=end)return;
 const M=H>1000,U=M?1.25:1,cx=W/2,cy=H*(M?.475:.47),age=t-land,p=o.reduced?1:out(age/.52),read=o.reduced?1:out((age-.12)/.35),leave=sm((t-exit)/(end-exit)),ink=o.light?'#182735':'#f1eadc',muted=o.light?'#52606c':'#91a3ad',gold='#d8c196',accent=o.first?'#9dcce6':'#efb1a4';
 const lang=getLang(),who=lang==='ja'?(o.first?'あなたが':'相手が'):lang==='ko'?(o.first?'당신이':'상대가'):(o.first?'YOU GO':'OPPONENT GOES'),first=lang==='ja'?'先攻':lang==='ko'?'선공':'FIRST',english=o.first?'YOU GO FIRST':'OPPONENT GOES FIRST';
 let tx=cx,ty=cy,tr=122*U;
 const polygon=(points:number[][],fill:string)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();};
 const line=(x:number,y:number,x2:number,y2:number,col:string=gold,w=1)=>{g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.strokeStyle=col;g.lineWidth=w;g.stroke();};
 const text=(s:string,x:number,y:number,size:number,col=ink,font='"Yu Mincho", "Hiragino Mincho ProN",serif',space=0)=>{g.fillStyle=col;g.textBaseline='middle';g.font=`${size}px ${font}`;g.textAlign='center';if(!space){g.fillText(s,x,y);return;}let total=g.measureText(s).width+space*(s.length-1);g.textAlign='left';let pos=x-total/2;for(const ch of s){g.fillText(ch,pos,y);pos+=g.measureText(ch).width+space;}};
 const small=(s:string,x:number,y:number,col=muted)=>text(s,x,y,(M?16:12)*U,col,'Arial',2.5*U);
 const diamond=(x:number,y:number,r:number,col=gold)=>polygon([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],col);
 const reveal=(x:number,y:number,w:number,h:number,q:number,fn:()=>void)=>{g.save();g.beginPath();g.rect(x-w/2,y-h/2,w*q,h);g.clip();fn();g.restore();};
 g.save();g.globalAlpha=1-leave;
 // Depth belongs to the result's material plane, with a restrained contact pool beneath the coin.
 {g.save();g.globalAlpha*=p*.38;let bg=g.createRadialGradient(cx,cy,30,cx,cy,600*U);bg.addColorStop(0,o.light?'#ffffff':'#263b4b');bg.addColorStop(1,o.light?'#ffffff00':'#263b4b00');g.fillStyle=bg;g.fillRect(0,0,W,H);g.restore();}
 {
  // Typography is the main shape; a fine engraved rule grows from the coin axis.
  tx=cx;ty=cy-102*U;tr=96*U;
  g.save();g.globalAlpha*=read;small('TURN ORDER',cx,cy-260*U);text(who,cx,cy+54*U,24*U,muted);reveal(cx,cy+136*U,480*U,130*U,read,()=>text(first,cx,cy+132*U,(lang==='en'?85:108)*U,ink));small(english,cx,cy+231*U,accent);
  line(cx-196*U*read,cy+279*U,cx-18*U,cy+279*U,gold+'80');line(cx+18*U,cy+279*U,cx+196*U*read,cy+279*U,gold+'80');diamond(cx,cy+279*U,4*U);g.restore();
 }
 g.restore();
 // Coin pose is continuous with the last toss frame, then physically seats into each design.
 const settle=o.reduced?0:Math.sin(age*23)*Math.exp(-age*12)*.15;
 let x=mix(cx,tx,p),y=mix(cy,ty,p),r=mix(122*U,tr,p);y+=o.reduced?0:leave*18*U;r*=o.reduced?1:1-leave*.025;
 coin(x,y,r,settle,Math.PI*6,-.22*Math.exp(-age*9),1-leave,0);
}
