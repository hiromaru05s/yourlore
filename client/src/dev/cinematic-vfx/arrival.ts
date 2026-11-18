import {clamp,ease,out,lerp,rnd,type Rect} from './direction';
import {glow} from './paint';
import {haze} from './realistic';
type C=CanvasRenderingContext2D;
/** A bounded white core opens into a hollow rim, then contracts into trailing curls.
 * Measured from the normal Goblin entrance in the original Shadowverse tutorial. */
export function shadowverseArrival(c:C,p:Rect,t:number){
 const u=p.w,core=ease(.79,.90,t)*(1-ease(1.06,1.20,t));
 if(core>0){const radius=u*(.24+.82*ease(.80,.97,t));glow(c,p,radius*1.55,'#94dfe2',core*.85);glow(c,p,radius,'#f5fff5',core);glow(c,p,radius*.63,'#ffffff',core);}
 const rim=ease(1.08,1.14,t)*(1-ease(1.27,1.39,t));
 if(rim>0){const r=u*lerp(.40,1.12,out((t-1.08)/.22));c.save();c.translate(p.x,p.y);for(const [width,alpha]of[[u*.19,.13],[u*.08,.4],[u*.035,.95]]){c.beginPath();c.ellipse(0,0,r,r*1.03,0,0,Math.PI*2);c.lineWidth=width;c.strokeStyle='#e5fff1';c.globalAlpha=rim*alpha;c.shadowColor='#6acaca';c.shadowBlur=u*.05;c.stroke();}c.restore();}
 const curl=ease(1.31,1.42,t)*(1-ease(1.86,2.12,t));
 if(curl>0){const age=clamp((t-1.31)/.81),radius=u*(.80-.32*age);c.save();c.translate(p.x,p.y);c.scale(1,.88);
  for(let j=0;j<3;j++){
   const points=[];for(let i=0;i<=70;i++){const q=i/70,a=q*Math.PI*(j===2?1.05:1.46)+j*2.1-age*7.2,r=radius*(.30+.70*q)*(1+.04*Math.sin(q*16+j)),width=u*.12*Math.pow(Math.sin(q*Math.PI),.65)*(1-age*.65);points.push({x:Math.cos(a)*r,y:Math.sin(a)*r,w:width});}
   for(const [factor,color,alpha]of[[1.25,'#5c8788',.25],[1,'#d7f2ec',.80],[.67,'#ffffff',1]] as const){c.beginPath();for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.y-a.y)||1,x=p.x-(b.y-a.y)/l*p.w*factor,y=p.y+(b.x-a.x)/l*p.w*factor;i?c.lineTo(x,y):c.moveTo(x,y);}for(let i=points.length-1;i>=0;i--){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.y-a.y)||1;c.lineTo(p.x+(b.y-a.y)/l*p.w*factor,p.y-(b.x-a.x)/l*p.w*factor);}c.closePath();c.fillStyle=color;c.globalAlpha=curl*alpha;c.fill();}
  }c.restore();}

 if(t>1.20&&t<1.80){const q=(t-1.2)/.6;for(let i=0;i<6;i++)haze(c,{x:p.x+Math.cos(i)*u*q*.55,y:p.y+Math.sin(i)*u*q*.5},u*(.6+q*.4),u*(.5+q*.3),(1-q)*.34,i);}
}
/** Contact-bound blue motes break off the played card; no independent mana trail. */
export function hearthstoneArrival(c:C,p:Rect,t:number){const q=(t-.94)/.55;if(q<0||q>1)return;const a=1-ease(.02,1,q);glow(c,p,p.w*.78,'#6fcaff',a*.45,.85);for(let i=0;i<18;i++){const angle=i*2.399,r=p.w*(.40+out(q)*(.2+rnd(i)*.5)),x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r*.76+q*q*p.w*.15;glow(c,{x,y},p.w*(.014+rnd(i+9)*.02)*(1-q),'#c5f6ff',a*.8);}}
