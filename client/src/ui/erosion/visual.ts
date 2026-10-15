// Selected revision 3, direction 03: microfracture. No other comparison variants.
export type Rect={x:number;y:number;w:number;h:number};
type Point={x:number;y:number};
export const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
const point=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export const EROSION_HIT=280,EROSION_DURATION=700;
export const erosionActivation=(ms:number)=>smooth(0,100,ms)*(1-smooth(230,580,ms));
export function erosionImpact(ms:number,reduced:boolean){const t=ms-EROSION_HIT,power=t>=0&&t<300?1-smooth(25,300,t):0;return {power,scale:reduced?1:1+.12*power,dx:reduced?0:Math.sin(t*.065)*3*power,dy:reduced?0:-2*power};}
type C=CanvasRenderingContext2D;
function line(c:C,pts:Point[],color:string,width:number){if(pts.length<2)return;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
export function drawErosion(c:C,r:Rect,t:number,reduced:boolean,u:number,amount:number){
 if(t < -100 || t>410)return;
 const reveal=smooth(-70,15,t),end=1-smooth(200,410,t),a=reveal*end;
 const kick=t>=0?(1-smooth(30,160,t)):0;
 const w=r.w/2,h=r.h/2;
 c.save();c.translate(r.x,r.y);c.globalAlpha=a;
 // A bevel-bound impact follows the target silhouette. Keep the central HP digits clear.
 const rim=()=>{c.beginPath();if(r.h>r.w){c.moveTo(-w*.82,-h*.8);c.lineTo(-w*.3,-h*.86);c.lineTo(0,-h);c.lineTo(w*.3,-h*.86);c.lineTo(w*.82,-h*.8);c.lineTo(w*.85,h*.05);c.quadraticCurveTo(w*.6,h*.62,0,h);c.quadraticCurveTo(-w*.6,h*.62,-w*.85,h*.05);c.closePath();}else c.roundRect(-w,-h,r.w,r.h,7);};
 rim();c.strokeStyle='#3e211a';c.lineWidth=3.5+kick*2;c.stroke();
 rim();c.strokeStyle=`rgba(242,184,119,${.45+kick*.55})`;c.lineWidth=1.5+kick*1.5;c.shadowColor='#dc5b32';c.shadowBlur=kick*13;c.stroke();c.shadowBlur=0;
 c.save();c.beginPath();c.rect(-w-19,-h-19,r.w+38,r.h+38);c.rect(-w*.48,-h*.43,w*.96,h*.86);c.clip('evenodd');

  const paths=[[[-1,-.4],[-.55,-.6],[-.2,-.35],[.15,-.62],[.6,-.45],[1,-.8]],[[-.6,-.58],[-.75,-.1],[-.5,.28],[-.64,.7],[-.3,1]],[[.12,-.6],[.4,-.1],[.7,.12],[.4,.5],[.7,.8]],[[.7,.12],[1,.3]],[[.4,.5],[0,.72],[-.2,1]]];
  for(const path of paths){const pts=path.map(([x,y])=>({x:x*w,y:y*h})),count=(pts.length-1)*(reduced?1:smooth(-10,80,t)),draw=pts.slice(0,Math.floor(count)+1);if(count%1&&pts[Math.ceil(count)])draw.push(point(pts[Math.floor(count)],pts[Math.ceil(count)],count%1));line(c,draw,'#281c1b',4);line(c,draw.map(p=>({x:p.x+1.1,y:p.y-1.1})),kick>.5?'#ffe7bc':'#c7a17b',1.5);}

 c.restore();c.restore();
 if(t>=0&&t<340){const opacity=1-smooth(160,340,t),move=reduced?0:smooth(0,250,t)*10*u;c.save();c.globalAlpha=opacity;c.font=`700 ${Math.max(18,25*u)}px Georgia`;c.textAlign='left';c.lineWidth=3;c.strokeStyle='#f8e7cb';c.strokeText(`−${amount}`,r.x+r.w*.5+7*u,r.y-4*u-move);c.fillStyle='#862e25';c.fillText(`−${amount}`,r.x+r.w*.5+7*u,r.y-4*u-move);c.restore();}
 }
