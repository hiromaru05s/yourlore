import {resultScene,RESULT_TIMING} from './result';
import {createOpeningCoin} from './coin';
import {createOpeningLight} from './light';
import {paintSeam,type Point} from './seam';
import {getLang} from '../../i18n';
export type Options={first:boolean;light:boolean;reduced:boolean;board:boolean;names?:[string,string];avatars?:[string|null,string|null]};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
const out=(n:number)=>1-(1-clamp(n))**3;
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
export function createOpeningRenderer(){
const {initCoin,coinImage,disposeCoin}=createOpeningCoin();
const {initLight,lightImage,disposeLight}=createOpeningLight();
let disposed=false;
let portraits:HTMLImageElement[]=[];let gpu=true;const hot=document.createElement("canvas");hot.width=hot.height=640;const hg=hot.getContext("2d")!;
async function loadAssets(){
 portraits=await Promise.all(['blue','red'].map(c=>new Promise<HTMLImageElement>((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src='/art/biblion/seeker-'+c+'.png';}))).catch(()=>[]);
 if(disposed)return false;
 try{initCoin();initLight();}catch{gpu=false;disposeCoin();disposeLight();}
 return gpu;
}
function dispose(){disposed=true;disposeCoin();disposeLight();portraits=[];}

function draw(c:HTMLCanvasElement,time:number,o:Options){
 const g=c.getContext('2d')!,W=1280,H=W*c.height/c.width,M=H>1000,U=M?1.25:1;
 g.setTransform(c.width/W,0,0,c.width/W,0,0);g.clearRect(0,0,W,H);
 const v={duration:RESULT_TIMING.end,exit:RESULT_TIMING.exit,land:RESULT_TIMING.land,toss:1.46},t=Math.max(0,time),cx=W/2,cy=H*(M?.475:.47);
 const gold='#e1ceac',ivory='#fff9e9',blue='#91c5df',red='#e8a093';
 const boardReveal=smooth((t-v.exit)/(v.duration-v.exit));
 const fill=(a:number)=>{g.fillStyle=o.light?`rgba(224,219,208,${a})`:`rgba(5,10,17,${a})`;g.fillRect(0,0,W,H);};
 const poly=(points:number[][],color:string)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();};
 const text=(s:string,x:number,y:number,size:number,color=ivory,font='Georgia',spacing=0)=>{g.fillStyle=color;g.textBaseline='middle';g.font=`${font==='sans-serif'?'500':'400'} ${size}px ${font}`;g.textAlign='center';if(!spacing){g.fillText(s,x,y);return;}const letters=[...s],widths=letters.map(c=>g.measureText(c).width),total=widths.reduce((a,b)=>a+b,0)+spacing*(letters.length-1);let pos=x-total/2;g.textAlign='left';letters.forEach((ch,i)=>{g.fillText(ch,pos,y);pos+=widths[i]+spacing;});};
 const coin=(x:number,y:number,r:number,rx:number,ry:number,rz:number,alpha=1,heat=0)=>{if(r<1||alpha<.001)return;const im=coinImage(rx,ry,rz,o.first);g.save();g.globalAlpha*=alpha;if(im){const sz=r*2.82;g.drawImage(im,x-sz/2,y-sz/2,sz,sz);if(heat>0){hg.clearRect(0,0,640,640);hg.globalCompositeOperation='source-over';hg.drawImage(im,0,0);hg.globalCompositeOperation='source-in';hg.fillStyle='#fff3cd';hg.fillRect(0,0,640,640);hg.globalCompositeOperation='source-over';g.save();g.globalAlpha*=heat;g.globalCompositeOperation='screen';g.shadowColor='#ffe3a2';g.shadowBlur=20*heat;g.drawImage(hot,x-sz/2,y-sz/2,sz,sz);g.restore();}}else{g.translate(x,y);g.rotate(rz);g.scale(Math.max(.06,Math.abs(Math.cos(ry))),1);g.fillStyle='#bca273';g.beginPath();g.arc(0,0,r,0,7);g.fill();g.strokeStyle=ivory;g.lineWidth=3;g.stroke();text(o.first?'I':'II',0,0,r*.75,'#18252b');}g.restore();};
 const portrait=(side:number,x:number,y:number,w:number,h:number,zoom=1)=>{const avatar=o.avatars?.[side];const im=portraits[avatar==='SEEKER_RED'?1:avatar==='SEEKER_BLUE'?0:side];if(!im)return;const sw=im.height*.86,sh=Math.min(im.height,sw*h/w);g.drawImage(im,(im.height-sw)/2,(im.height-sh)*.35,sw,sh,x-w*zoom/2,y-h*zoom/2,w*zoom,h*zoom);};
 if(t>=v.duration)return;
 fill((1-boardReveal)*.99);
 if(o.reduced&&t<v.land){portrait(0,W*.26,H*.36,480,440);portrait(1,W*.74,H*.36,480,440);text('DUEL',cx,H*.73,70,gold,'Georgia',12);return;}
 const launch=clamp((t-v.toss)/(v.land-v.toss));
 const exit=out((t-v.toss)/.60),anticipate=smooth((t-1.12)/.19),hit=clamp((t-1.36)/.055);
 const contact=t>=1.36&&t<1.46;
 const impact=Math.exp(-Math.max(0,t-1.46)*14)*Number(t>=1.46);
 const enter=out(t/.5),recoil=contact?0:Math.sin(clamp((t-1.46)/.34)*Math.PI)*14;
 const shake=t>=1.46&&t<1.72?Math.sin((t-1.46)*95)*impact*4:0;
 const scale=1+anticipate*.018+impact*.035;
 // No coin is rendered before contact. VS light is the sole source of its reveal.
 if(exit<1){
  g.save();g.translate(cx+shake,cy+shake*.4);g.scale(scale,scale);g.translate(-cx,-cy);
  const open=out(t/.26),letterbox=(1-open)*H*.25+H*.055;
  for(let s=0;s<2;s++){
   const sign=s?1:-1;
   let dx=sign*((1-enter)*W*.64-anticipate*15+hit*12+recoil+exit*760);
   let dy=sign*exit*H*.025;
   if(M){dx=sign*((1-enter)*W*.7+exit*700);dy=sign*exit*H*.18;}
   const yy=M?H*(s?.29:.69):H*.50,xx=M?cx:W*(s?.755:.245);
   g.save();g.translate(dx,dy);
   const edge:Point[]=Array.from({length:41},(_,i)=>{const q=i/40;return M?[28+q*(W-60),cy+(s?-32:32)-.04*(28+q*(W-60)-cx)]:[cx+(s?66:37)-119*q,letterbox+q*(H-2*letterbox)];});
   const pts=M?(s?[[28,yy-260],[W-32,yy-305],...edge.slice().reverse()]:[...edge,[W-12,yy+245],[48,yy+290]]):s?[...edge,[W+80,H-letterbox],[W+80,letterbox]]:[[-80,letterbox],...edge,[-80,H-letterbox]];
   poly(pts,s?'#412730':'#192d45');g.clip();
   const z=1+out(t/1.2)*.045+exit*.035;
   portrait(s,xx-sign*anticipate*8,yy,M?1120:780,M?Math.max(660,H*.45):H*1.05,z);
   // Light wraps only the contact-facing edge of the source surface.
   const shade=g.createLinearGradient(s?W:0,0,cx,0);shade.addColorStop(0,'#05091400');shade.addColorStop(.68,'#05091400');shade.addColorStop(1,'#0509148a');g.fillStyle=shade;g.fillRect(0,0,W,H);
   const irradiance=smooth((t-1.34)/.065)*Math.exp(-Math.max(0,t-1.395)*9);const rim=anticipate*.12+impact*.35+irradiance*.95;if(rim>0){g.save();g.globalCompositeOperation='screen';g.globalAlpha=rim;const lg=g.createLinearGradient(cx-150,0,cx+150,0);lg.addColorStop(0,'#d2e4ff00');lg.addColorStop(.43,s?'#f6c4a345':'#b8dcff60');lg.addColorStop(.52,'#fff6d190');lg.addColorStop(1,'#f6c4a300');g.fillStyle=lg;g.fillRect(cx-150,0,300,H);g.restore();}
   const bottom=g.createLinearGradient(0,yy+70,0,yy+(M?280:H*.42));bottom.addColorStop(0,'#03081300');bottom.addColorStop(1,'#030813bd');g.fillStyle=bottom;g.fillRect(0,yy,W,H);
   g.restore();
   g.save();g.translate(dx,dy);g.globalAlpha=(1-exit);paintSeam(g,edge,t);g.restore();
   if(t<1.4){g.save();g.globalAlpha=out((t-.3)/.4)*(1-smooth((t-1.1)/.28));const ny=M?yy+202:H*.81;text(s?'OPPONENT':'YOU',xx,ny,14*U,s?red:blue,'sans-serif',4);text(o.names?.[s]??(getLang()==='ja'?(s?'紅のシーカー':'蒼のシーカー'):(s?'RED SEEKER':'BLUE SEEKER')),xx,ny+33*U,25*U,ivory,'"Yu Mincho",serif',2);g.restore();}
  }
  g.restore();
 }
 // A dark local backing and a keyline protect VS from both portraits and bright seams.
 // The lettering is read first, then grows, burns white, and contracts into the same light as the coin.
 const vsCharge=smooth((t-1.08)/.28),vsBurst=smooth((t-1.35)/.10),vsFold=smooth((t-1.40)/.14);
 if(t<1.77){
  const fp=launch,fx=cx+Math.sin(fp*Math.PI)*65*U,fy=cy-Math.sin(fp*Math.PI)*155*U;
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
  x=cx+Math.sin(p*Math.PI)*65*U;y=cy-flight*155*U;r=baseR*(1+.12*flight);rx=.28*Math.sin(p*Math.PI);ry=1.28+(Math.PI*6-1.28)*out(p);rz=-.22+.30*flight;
  // A final small rocking settle keeps the stop from looking like a frozen texture.
  if(t>=v.land){const q=t-v.land;x=cx;y=cy;r=122*U;rx=Math.sin(q*23)*Math.exp(-q*12)*.15;ry=Math.PI*6;rz=-.22*Math.exp(-q*9);}
  if(t<v.land){rz*=1-smooth((p-.85)/.15);}
  // Short authored motion arcs are anchored to the projected rim and die before apex.
  if(p<.3){const a=Math.sin(clamp(p/.3)*Math.PI)*.3;g.save();g.globalAlpha=a;g.translate(x,y);g.rotate(rz);for(let n=0;n<3;n++){g.strokeStyle=n?'#8eacc577':'#e8d7b0';g.lineWidth=n?1:2;g.beginPath();g.ellipse(-22*n,25+16*n,r*(.9+n*.15),r*(.40+n*.12),-.2,.1,1.6);g.stroke();}g.restore();}
  coin(x,y,r,rx,ry,rz,smooth((t-v.toss)/.13),1-smooth((t-v.toss-.06)/.32));
 }
 resultScene(g,t,W,H,o,coin);
 // Quiet framing, with no floating decorative rings or random particle field.
 if(t<1.16){g.save();g.globalAlpha=out(t/.4)*.8;text('L O R E',cx,M?78:46,13,gold,'Georgia',4);g.restore();}
}

return {loadAssets,draw,dispose};
}
