import {loadProfileArt,paintProfilePanel,profilePanelTop,type ProfileArt} from './profilePanel';
import type {DuelProfile} from '../../shared/duelProfile';
import {OPENING_PORTRAIT_URL,OPENING_PORTRAIT_CROP,OPENING_NAMEPLATE_URL} from './assets';
import {npcPortrait} from "../../shared/botNpcs";
import {resultScene,RESULT_TIMING,paintOrderSurface,paintOrder,orderMetal} from './result';
import {createOpeningCoin} from './coin';
import {createOpeningLight} from './light';
import {paintSeam,type Point} from './seam';
import {getLang} from '../../i18n';
import {OPENING_TOSS_MS} from '../../shared/opening';
import {OPENING_RECOIL_SECONDS,MOBILE_OPENING_COIN_SCALE} from './choreography';
import {createDuelWind,DUEL_WIND_BACKGROUND} from './windPortraits';
export type Options={first:boolean;light:boolean;reduced:boolean;board:boolean;names?:[string,string];avatars?:[string|null,string|null];medals?:[string|null,string|null];profiles?:[DuelProfile|null,DuelProfile|null];ranked?:boolean};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
const out=(n:number)=>1-(1-clamp(n))**3;
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
export function createOpeningRenderer(){
const {initCoin,coinImage,disposeCoin}=createOpeningCoin();
const {initLight,lightImage,seamImage,disposeLight}=createOpeningLight();
const duelWind=createDuelWind();
let windBackground:HTMLImageElement|undefined;
let profileArt:ProfileArt={ranks:new Map()};
let disposed=false;
let nameplate:HTMLImageElement|undefined;
let portraits:HTMLImageElement[]=[];let gpu=true;const hot=document.createElement("canvas");hot.width=hot.height=640;const hg=hot.getContext("2d")!;
const npcImages=new Map<string,HTMLImageElement>();
async function loadAssets(avatars:readonly (string|null)[]=[]){
 portraits=await Promise.all([0,1].map(()=>new Promise<HTMLImageElement>((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=OPENING_PORTRAIT_URL;}))).catch(()=>[]);
 if(disposed)return false;
 nameplate=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=OPENING_NAMEPLATE_URL;}).catch(()=>undefined);
 await Promise.all([...new Set(avatars)].map(async avatar=>{
  const url=npcPortrait(avatar);if(!url||!avatar)return;
  const image=new Image();image.src=url;
  try{await image.decode();if(!disposed)npcImages.set(avatar,image);}catch{/* Keep the existing seeker fallback if artwork cannot load. */}
 }));
 if(disposed)return false;
 await Promise.all([duelWind.load(avatars),avatars.some(a=>a&&['NPC_LUMI','NPC_NOEL','NPC_VERA'].includes(a))?new Promise<void>(resolve=>{const image=new Image();image.onload=()=>{if(!disposed)windBackground=image;resolve();};image.onerror=()=>resolve();image.src=DUEL_WIND_BACKGROUND;}):Promise.resolve()]);
 if(disposed)return false;
 profileArt=await loadProfileArt();
 if(disposed){profileArt.ranks.clear();return false;}
 try{initCoin();initLight();}catch{gpu=false;disposeCoin();disposeLight();}
 return gpu;
}
function dispose(){disposed=true;profileArt.ranks.clear();profileArt.empty=undefined;duelWind.dispose();windBackground=undefined;disposeCoin();disposeLight();portraits=[];nameplate=undefined;npcImages.clear();}

function draw(c:HTMLCanvasElement,time:number,o:Options){
 const g=c.getContext('2d')!,W=1280,H=W*c.height/c.width,M=H>1000,U=M?MOBILE_OPENING_COIN_SCALE:1;
 g.setTransform(c.width/W,0,0,c.width/W,0,0);g.clearRect(0,0,W,H);
 const v={duration:RESULT_TIMING.end,exit:RESULT_TIMING.exit,land:RESULT_TIMING.land,toss:OPENING_TOSS_MS/1000},t=Math.max(0,time),cx=W/2,cy=H*(M?.475:.47);
 const ivory='#fff9e9';
 const boardReveal=smooth((t-v.exit)/(v.duration-v.exit));
 const fill=(a:number)=>{g.fillStyle=o.light?`rgba(224,219,208,${a})`:`rgba(5,10,17,${a})`;g.fillRect(0,0,W,H);};
 const poly=(points:number[][],color:string)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();};
 const text=(s:string,x:number,y:number,size:number,color=ivory,font='Georgia',spacing=0)=>{g.fillStyle=color;g.textBaseline='middle';g.font=`${font==='sans-serif'?'500':'400'} ${size}px ${font}`;g.textAlign='center';if(!spacing){g.fillText(s,x,y);return;}const letters=[...s],widths=letters.map(c=>g.measureText(c).width),total=widths.reduce((a,b)=>a+b,0)+spacing*(letters.length-1);let pos=x-total/2;g.textAlign='left';letters.forEach((ch,i)=>{g.fillText(ch,pos,y);pos+=widths[i]+spacing;});};
 const coin=(x:number,y:number,r:number,rx:number,ry:number,rz:number,alpha=1,heat=0)=>{if(r<1||alpha<.001)return;const im=coinImage(rx,ry,rz,o.first);g.save();g.globalAlpha*=alpha;if(im){const sz=r*2.82;g.drawImage(im,x-sz/2,y-sz/2,sz,sz);if(heat>0){hg.clearRect(0,0,640,640);hg.globalCompositeOperation='source-over';hg.drawImage(im,0,0);hg.globalCompositeOperation='source-in';hg.fillStyle='#fff3cd';hg.fillRect(0,0,640,640);hg.globalCompositeOperation='source-over';g.save();g.globalAlpha*=heat;g.globalCompositeOperation='screen';g.shadowColor='#ffe3a2';g.shadowBlur=20*heat;g.drawImage(hot,x-sz/2,y-sz/2,sz,sz);g.restore();}}else{
   const projection=Math.cos(ry+(o.first?0:Math.PI)),front=projection>=0;
   g.translate(x,y);g.rotate(rz);g.scale(Math.max(.06,Math.abs(projection)),1);
   g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fillStyle=front?'#172c3c':'#39232e';g.fill();
   g.strokeStyle='#d2bd94';g.lineWidth=r*.08;g.stroke();
   g.beginPath();g.arc(0,0,r*.84,0,Math.PI*2);g.lineWidth=1.5;g.stroke();
   text(front?'I':'II',0,0,r*.75,ivory);
  }g.restore();};
 const portrait=(side:number,x:number,y:number,w:number,h:number,zoom=1)=>{
  const avatar=o.avatars?.[side],npc=avatar?npcImages.get(avatar):undefined;
  const wind=duelWind.frame(avatar,t,o.reduced);
  if(wind){
   if(npc&&windBackground){
    const im=windBackground,sw=Math.min(im.width,im.height*w/h),sh=Math.min(im.height,im.width*h/w);
    g.drawImage(im,(im.width-sw)/2,(im.height-sh)*.35,sw,sh,x-w*zoom/2,y-h*zoom/2,w*zoom,h*zoom);
   }
   const size=(M?Math.max(w,h):Math.min(w,h))*zoom;
   g.save();g.translate(x,y);if(side===1)g.scale(-1,1);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   g.drawImage(wind,-size/2,-size/2,size,size);g.restore();return;
  }
  const im=npc??portraits[side];if(!im)return;
  if(npc){
   const sw=Math.min(im.width,im.height*w/h),sh=Math.min(im.height,im.width*h/w);
   g.drawImage(im,(im.width-sw)/2,(im.height-sh)*.35,sw,sh,x-w*zoom/2,y-h*zoom/2,w*zoom,h*zoom);
  }else{const size=(M?Math.max(w,h):Math.min(w,h))*zoom;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const crop=OPENING_PORTRAIT_CROP;g.drawImage(im,crop.x,crop.y,crop.width,crop.height,x-size/2,y-size/2,size,size);}
 };
 if(t>=v.duration)return;
 fill((1-boardReveal)*.99);
 const launch=clamp((t-v.toss)/(v.land-v.toss));
 const age=t-v.land,assigned=age>=0;
 const enter=out(t/.52),anticipate=smooth((t-1.06)/.22),hit=out((t-1.29)/.17);
 const impact=t<v.toss?0:Math.exp(-(t-v.toss)*15);
 const recoil=Math.sin(clamp((t-v.toss)/OPENING_RECOIL_SECONDS)*Math.PI)*10;
 const contactGap=(1-enter)*W*.70+anticipate*19-hit*19+recoil;
 // Both panels bleed past the viewport: no letterbox or exposed outer corners.
 const bars=-4;
 const scale=1+(o.reduced?0:impact*.022);
 g.save();if(o.reduced)g.globalAlpha*=1-boardReveal;g.translate(cx,cy);g.scale(scale,scale);g.translate(-cx,-cy);
 for(let s=0;s<2;s++){
   const sign=s?1:-1, first=s===0?o.first:!o.first;
   const away=contactGap+(o.reduced?0:boardReveal*(M?H*.50:W*.55));
   const dx=M?0:sign*away,dy=M?-sign*away:0;
   const yy=M?(s?cy/2:(cy+H)/2):H*.50,xx=M?cx:W*(s?.755:.245);
   const edge:Point[]=M?[[-4,cy+30],[W+4,cy-30]]:[[cx+58,bars],[cx-67,H-bars]];
   const top=bars,base=H-bars;
   const pts=M?(s?[[-4,top],[W+4,top],...edge.slice().reverse()]:[...edge,[W+4,base],[-4,base]]):
     s?[...edge,[W+2,H-bars],[W+2,bars]]:[[-2,bars],...edge,[-2,H-bars]];
   g.save();g.translate(dx,dy);
   poly(pts,'#19212d');g.clip();
   portrait(s,xx,yy,M?W+8:780,M?(s?cy:H-cy)+64:H*1.15,1+out(t/1.2)*.045);
   // Local shading keeps the artwork legible behind the coin and nameplate.
   const bottom=M?(s?cy:base):H-bars;
   const foot=g.createLinearGradient(0,bottom-(M?H*.15:H*.37),0,bottom);
   foot.addColorStop(0,'#05091300');foot.addColorStop(.62,'#070e1db5');foot.addColorStop(1,'#030812ed');
   g.fillStyle=foot;g.fillRect(0,top,W,base-top);
   const charge=smooth((t-1.31)/.12)*Math.exp(-Math.max(0,t-1.45)*11);
   if(charge>.002){
     const glow=g.createRadialGradient(cx,cy,0,cx,cy,W*.30);glow.addColorStop(0,'#d8efffba');glow.addColorStop(.55,'#8acaff28');glow.addColorStop(1,'#8acaff00');
     g.save();g.globalAlpha*=charge;g.fillStyle=glow;g.fillRect(0,top,W,base-top);g.restore();
   }
   const reach=Math.hypot(W*(M?.53:.54),M?H*.4:H*.52);
   paintOrderSurface(g,cx,cy,reach,age,first);
   // Engraved perimeter carries the new colour even after the travelling front settles.
   const metal=orderMetal(first);
   if(age>0){
     g.save();g.globalAlpha*=smooth(age/.5);
     const enamel=g.createLinearGradient(0,bottom-(M?H*.17:H*.29),0,bottom);
     enamel.addColorStop(0,metal.deep+'00');enamel.addColorStop(.72,metal.deep+'6b');enamel.addColorStop(1,metal.enamel+'ad');
     g.fillStyle=enamel;g.fillRect(0,top,W,base-top);g.restore();
   }
   g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
   g.strokeStyle=assigned?metal.rim:'#bfc7c9';g.lineWidth=M?4:2.2;g.stroke();
   paintSeam(g,edge,o.reduced?1.1:t,seamImage,o.reduced);
   const panelTop=profilePanelTop(H,bottom,M,s===1);
   const orderSize=M?64:Math.min(54,H*.075);
   paintOrder(g,xx,panelTop-(M?65:36),orderSize,age,first);
   const fallbackName=getLang()==='ja'?'シーカー':getLang()==='ko'?'시커':'SEEKER';
   paintProfilePanel(g,{x:xx,top:panelTop,bottom,height:H,mobile:M,name:o.names?.[s]??fallbackName,profile:o.profiles?.[s],medal:o.medals?.[s],ranked:o.ranked,plate:nameplate,art:profileArt});
   g.restore();
 }
 g.restore();
 // A dark local backing and a keyline protect VS from both portraits and bright seams.
 // The lettering is read first, then grows, burns white, and contracts into the same light as the coin.
 const vsCharge=smooth((t-1.08)/.28),vsBurst=smooth((t-1.35)/.10),vsFold=smooth((t-1.40)/.14);
 if(t<1.77){
  const fp=launch,fx=cx+Math.sin(fp*Math.PI)*65*U,fy=cy-Math.sin(fp*Math.PI)*(M?55:155)*U;
  const backing=1-smooth((t-1.54)/.24);
  g.save();g.translate(cx,cy);g.scale(1,.7);const shade=g.createRadialGradient(0,0,20,0,0,210*U);shade.addColorStop(0,'#020913e8');shade.addColorStop(.58,'#020913bb');shade.addColorStop(1,'#02091300');g.globalAlpha=out(t/.32)*backing;g.fillStyle=shade;g.fillRect(-220*U,-220*U,440*U,440*U);g.restore();
  g.save();g.translate(fx,fy);g.rotate(-.14*(1-vsFold));
  const swell=(1+vsBurst*.30)*(1-vsFold*.84);g.scale(swell,swell);
  g.globalAlpha=out((t-.15)/.32)*(1-vsFold);
  g.font=`italic ${M?148:132}px Georgia`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  g.strokeStyle='#030a15';g.lineWidth=11*U;g.strokeText('VS',0,0);
  g.shadowColor='#ffd78c';g.shadowBlur=vsCharge*5+vsBurst*8;
  g.strokeStyle=vsBurst>.1?'#ffdb90':'#a28355';g.lineWidth=2.4;g.strokeText('VS',0,0);
  const ink=g.createLinearGradient(0,-80,0,80);ink.addColorStop(0,vsCharge>.5?'#ffffff':'#fff3d7');ink.addColorStop(.48,vsBurst>.1?'#ffffff':'#e7ce9e');ink.addColorStop(.55,vsBurst>.1?'#fff9dc':'#ae8953');ink.addColorStop(1,vsCharge>.5?'#ffe5a8':'#e9d7b7');g.fillStyle=ink;g.fillText('VS',0,0);g.restore();
 }
 const light=lightImage(t,H,U);if(light){g.save();g.globalCompositeOperation='screen';g.drawImage(light,0,0,W,H);g.restore();}
 if(t>=v.toss&&t<v.land){
  const p=launch,flight=Math.sin(p*Math.PI);
  let x=cx,y=cy,r=0,rx=0,ry=0,rz=0;
  const baseR=U*mix(48,122,out(p/.30));
  x=cx+Math.sin(p*Math.PI)*65*U;y=cy-flight*(M?55:155)*U;r=baseR*(1+.12*flight);rx=.28*Math.sin(p*Math.PI);ry=1.28+(Math.PI*6-1.28)*out(p);rz=-.22+.30*flight;
  rz*=1-smooth((p-.85)/.15);
  // Short authored motion arcs are anchored to the projected rim and die before apex.
  if(p<.3){const a=Math.sin(clamp(p/.3)*Math.PI)*.3;g.save();g.globalAlpha=a;g.translate(x,y);g.rotate(rz);for(let n=0;n<3;n++){g.strokeStyle=n?'#8eacc577':'#e8d7b0';g.lineWidth=n?1:2;g.beginPath();g.ellipse(-22*n,25+16*n,r*(.9+n*.15),r*(.40+n*.12),-.2,.1,1.6);g.stroke();}g.restore();}
  coin(x,y,r,rx,ry,rz,smooth((t-v.toss)/.13),1-smooth((t-v.toss-.06)/.32));
 }
 resultScene(g,t,W,H,o,coin);

}

return {loadAssets,draw,dispose};
}
