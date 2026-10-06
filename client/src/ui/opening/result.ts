/** Approved 05 Lumen Weave: the coin reflection unfolds into the result lettering. */
import {OPENING_REVEAL_MS,OPENING_EXIT_MS,OPENING_VISUAL_MS} from '../../shared/opening';
import {getLang} from '../../i18n';
export const RESULT_TIMING={land:OPENING_REVEAL_MS/1000,exit:OPENING_EXIT_MS/1000,end:OPENING_VISUAL_MS/1000} as const;
export type CoinDraw=(x:number,y:number,r:number,rx:number,ry:number,rz:number,alpha?:number,heat?:number)=>void;
export type PortraitDraw=(side:number,x:number,y:number,w:number,h:number,zoom?:number)=>void;
export type ResultOptions={first:boolean;light:boolean;reduced:boolean};
const cl=(x:number)=>Math.min(1,Math.max(0,x));
const sm=(x:number)=>{x=cl(x);return x*x*(3-2*x);};
const out=(x:number)=>1-(1-cl(x))**3;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function resultScene(g:CanvasRenderingContext2D,t:number,W:number,H:number,o:ResultOptions,coin:CoinDraw){
 const {land,exit:exitAt,end}=RESULT_TIMING;if(t<land||t>=end)return;
 const a=o.reduced?1.05:t-land,exit=sm((t-exitAt)/(end-exitAt)),mobile=H>1000,U=mobile?1.18:1,tossU=mobile?1.25:1,cx=W/2,cy=H*(mobile?.475:.47);
 const p=out(a/.54),late=out((a-.31)/.37);
 const gold='#dac398',white='#fff4dc',ink=o.light?'#192937':'#f8efdb',muted=o.light?'#52616b':'#acb9c2',accent=o.first?'#9bcdeb':'#e8aa9f',deep=o.first?'#172f45':'#44252e';
 const lang=getLang(),who=lang==='ja'?(o.first?'あなたが':'相手が'):lang==='ko'?(o.first?'당신이':'상대가'):(o.first?'YOU GO':'OPPONENT GOES'),first=lang==='ja'?'先攻':lang==='ko'?'선공':'FIRST',eng=o.first?'YOU GO FIRST':'OPPONENT GOES FIRST';
 const txt=(s:string,x:number,y:number,size:number,col:string|CanvasGradient=ink,spacing=0,font='"Shippori Mincho", "Yu Mincho", serif',weight=600)=>{g.save();g.font=`${weight} ${size}px ${font}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=col;let width=g.measureText(s).width+spacing*([...s].length-1);let xx=x-width/2;g.textAlign='left';for(const c of s){g.fillText(c,xx,y);xx+=g.measureText(c).width+spacing;}g.restore();};
 const small=(s:string,x:number,y:number,col=muted)=>txt(s,x,y,13*U,col,3*U,'Arial',500);
 const line=(x:number,y:number,x1:number,y1:number,color=gold,width=1)=>{g.beginPath();g.moveTo(x,y);g.lineTo(x1,y1);g.strokeStyle=color;g.lineWidth=width;g.stroke();};
 const glow=(x:number,y:number,rx:number,ry:number,color:string,alpha=1)=>{g.save();g.globalAlpha*=cl(alpha);g.translate(x,y);g.scale(1,ry/rx);const z=g.createRadialGradient(0,0,0,0,0,rx);z.addColorStop(0,color);z.addColorStop(.28,color+'88');z.addColorStop(1,color+'00');g.fillStyle=z;g.fillRect(-rx,-rx,rx*2,rx*2);g.restore();};
 const material=(y:number,h:number)=>{let z=g.createLinearGradient(0,y-h/2,0,y+h/2);([[0,'#f8eac9'],[.08,'#ae9160'],[.46,'#d9c393'],[.5,'#f8e9c3'],[.55,'#a88757'],[1,'#efdcb0']]).forEach(([n,c])=>z.addColorStop(n as number,c as string));return z;};
 const lettering=(s:string,x:number,y:number,size:number,q=late,col?:string|CanvasGradient)=>{g.save();g.font=`600 ${size}px "Shippori Mincho", "Yu Mincho", serif`;
 // Keep the approved Japanese reveal width; longer translations must reveal every glyph.
 const ww=Math.max(size*2.6,g.measureText(s).width+size*.09*([...s].length-1)+size*.15);g.beginPath();g.rect(x-ww/2,y-size*.7,ww*cl(q),size*1.5);g.clip();txt(s,x,y+2,size,'#00000090',size*.09);txt(s,x,y,size,col??material(y,size),size*.09);g.restore();};
 const flare=(x:number,y:number,power:number,width=300)=>{if(power<.001)return;g.save();g.globalCompositeOperation='screen';glow(x,y,width,9,white,power);glow(x,y,42,42,'#ffdfa2',power*.8);line(x-width*.6,y,x+width*.6,y,`rgba(255,244,207,${cl(power)})`,1.4);g.restore();};
 const seat=(x:number,y:number,r:number,alpha=1)=>{g.save();g.globalAlpha*=alpha;glow(x+6,y+12,r*1.15,r*.95,'#000000',.85);g.restore();};
 g.save();g.globalAlpha=1-exit*.8;
 glow(cx,cy,760,520,o.light?'#ffffff':deep,p*.65);
  const tx=cx,ty=cy-144*U,rr=91*U,spread=out(a/.72);
  g.save();g.globalCompositeOperation='screen';g.globalAlpha*=Math.sin(cl(a/1.55)*Math.PI)*.82;
  // Two folded sheets emerge from the rim; their thickness and inner shadow stay coherent.
  for(let side of [-1,1]){g.save();g.translate(cx,cy-55*U);g.scale(side,1);const len=570*spread;
   const z=g.createLinearGradient(0,-100,len,160);z.addColorStop(0,white);z.addColorStop(.13,'#e7bc72b0');z.addColorStop(.42,accent+'80');z.addColorStop(1,accent+'00');
   g.beginPath();g.moveTo(0,-38);g.bezierCurveTo(len*.27,-105,len*.62,260*(1-spread)-40,len,10);g.bezierCurveTo(len*.6,55,len*.28,-17,0,11);g.closePath();g.fillStyle=z;g.fill();
   g.beginPath();g.moveTo(3,-35);g.bezierCurveTo(len*.3,-101,len*.61,-42,len,10);g.strokeStyle=white;g.lineWidth=1.7;g.stroke();g.restore();}
  g.restore();g.save();g.globalAlpha*=late;txt(who,cx,cy+47*U,25*U,o.light?'#324956':accent,3);lettering(first,cx,cy+128*U,(lang==='en'?85:117)*U,late,o.light?'#213342':undefined);small(eng,cx,cy+226*U,o.light?'#665944':gold);g.restore();
  flare(cx,cy+205*U,Math.sin(cl((a-.38)/.75)*Math.PI)*.6,290);

 g.restore();
 // The incoming radius matches the unchanged toss, including its mobile scale.
 const x=mix(cx,tx,p),y=mix(cy,ty,p)+(o.reduced?0:exit*42),r=mix(122*tossU,rr,p);
 g.save();g.globalAlpha=1-exit;seat(x,y,r,sm(a/.3)*.6);g.restore();
 const settle=o.reduced?0:Math.sin(a*23)*Math.exp(-a*12);
 coin(x,y,r,settle*.15,Math.PI*6,-.06*settle,1-exit,0);
}
