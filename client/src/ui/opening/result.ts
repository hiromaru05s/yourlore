import {OPENING_REVEAL_MS,OPENING_EXIT_MS,OPENING_VISUAL_MS} from '../../shared/opening';
import {getLang} from '../../i18n';

export const RESULT_TIMING={land:OPENING_REVEAL_MS/1000,exit:OPENING_EXIT_MS/1000,end:OPENING_VISUAL_MS/1000} as const;
export type CoinDraw=(x:number,y:number,r:number,rx:number,ry:number,rz:number,alpha?:number,heat?:number)=>void;
type ResultOptions={first:boolean;light:boolean;reduced:boolean};
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const ease=(x:number)=>1-(1-clamp(x))**3;

const blue={deep:'#10376a',enamel:'#297ac8',rim:'#93dcff',metal:'#e0f5ff'};
const red={deep:'#651c30',enamel:'#ad3849',rim:'#ff9c9c',metal:'#ffe6de'};
export const orderMetal=(first:boolean)=>first?blue:red;

/** The advancing edge is clipped to the same face as the portrait. */
export function paintOrderSurface(g:CanvasRenderingContext2D,x:number,y:number,reach:number,age:number,first:boolean){
  if(age<=0)return;
  const metal=orderMetal(first);
  const travel=ease(age/.64), radius=Math.max(1,travel*reach);
  const lacquer=g.createRadialGradient(x,y,0,x,y,radius);
  lacquer.addColorStop(0,metal.enamel+'44');
  lacquer.addColorStop(.75,metal.deep+'36');
  lacquer.addColorStop(.96,metal.enamel+'48');
  lacquer.addColorStop(.989,metal.rim+(travel>.99?'55':'bf'));
  lacquer.addColorStop(1,metal.rim+'00');
  g.fillStyle=lacquer;
  g.fillRect(x-radius,y-radius,radius*2,radius*2);
}

/** Foil lettering sits in the lower field of each battle card. */
export function paintOrder(g:CanvasRenderingContext2D,x:number,y:number,size:number,age:number,first:boolean){
  if(age<=.14)return;
  const progress=ease((age-.14)/.38),metal=orderMetal(first),lang=getLang();
  const word=lang==='ja'?(first?'先攻':'後攻'):lang==='ko'?(first?'선공':'후공'):(first?'FIRST':'SECOND');
  g.save();g.translate(x,y+(1-progress)*size*.13);g.globalAlpha*=progress;
  g.font=`600 ${size}px "Shippori Mincho","Yu Mincho",serif`;
  g.textAlign='center';g.textBaseline='middle';
  const half=g.measureText(word).width/2;
  for(const dir of [-1,1]){
    g.save();g.scale(dir,1);
    const start=half+size*.24,end=start+size*.88*progress;
    const line=g.createLinearGradient(start,0,end,0);
    line.addColorStop(0,metal.rim);line.addColorStop(1,metal.rim+'00');
    g.fillStyle=line;g.beginPath();g.moveTo(start,0);g.lineTo(start+5,-2);
    g.lineTo(end,0);g.lineTo(start+5,2);g.closePath();g.fill();g.restore();
  }
  const ink=g.createLinearGradient(0,-size*.48,0,size*.47);
  ink.addColorStop(0,metal.rim);ink.addColorStop(.38,'#fffefa');ink.addColorStop(.54,metal.metal);ink.addColorStop(1,metal.rim);
  g.lineWidth=Math.max(1,size*.035);g.strokeStyle=metal.deep;g.strokeText(word,0,0);
  g.fillStyle=ink;g.shadowColor=metal.deep;g.shadowBlur=size*.11;g.fillText(word,0,0);
  g.restore();
}

export function resultScene(g:CanvasRenderingContext2D,t:number,W:number,H:number,o:ResultOptions,coin:CoinDraw){
  const {land,exit,end}=RESULT_TIMING;
  if(t<land||t>=end)return;
  const mobile=H>1000,unit=mobile?1.25:1,cx=W/2,cy=H*(mobile?.475:.47);
  const age=o.reduced?1:t-land,settle=ease(age/.52);
  const visible=1-clamp((t-exit)/(end-exit));
  const radius=(122-64*settle)*unit*(o.reduced?1:visible);
  const rock=o.reduced?0:Math.sin(age*23)*Math.exp(-age*12);
  g.save();g.globalAlpha*=visible*settle;
  const shadow=g.createRadialGradient(cx,cy+5,0,cx,cy+5,radius*1.4);
  shadow.addColorStop(0,'#000815cb');shadow.addColorStop(.7,'#00081580');shadow.addColorStop(1,'#00081500');
  g.fillStyle=shadow;g.fillRect(cx-radius*1.4,cy+5-radius*1.4,radius*2.8,radius*2.8);g.restore();
  coin(cx,cy,radius,rock*.15,Math.PI*6,-.06*rock,visible);
}
