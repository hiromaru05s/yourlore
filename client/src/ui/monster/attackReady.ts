/** Adopted study 03 (2026-11-19), including the approved 0.8 arrow scale.
 * Card-local light is below cost/combat seals, and follows the owning card. */
export const ATTACK_READY_PERIOD=2600;
const smooth=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
const pulse=(a:number,b:number,c:number,d:number,t:number)=>smooth(a,b,t)*(1-smooth(c,d,t));
type C=CanvasRenderingContext2D;
function path(c:C,points:number[][],fill:string|CanvasGradient){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function line(c:C,points:number[][],color:string,width:number){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.stroke();}
function arrow(c:C,x:number,y:number,u:number,kind:3,a:number){
 c.save();c.translate(x,y);c.globalAlpha*=a;
 const g=c.createLinearGradient(0,-u*.33,0,u*.31);g.addColorStop(0,'#f1fcff');g.addColorStop(.25,'#9deeff');g.addColorStop(.30,'#42bdff');g.addColorStop(.72,'#238bdb');g.addColorStop(1,'#12508f');
 const pts=kind===3?[[-.58,.16],[-.15,-.12],[0,-.36],[.15,-.12],[.58,.16],[.45,.26],[.12,.04],[0,.13],[-.12,.04],[-.45,.26]]:[[-.50,.20],[0,-.30],[.50,.20],[.34,.32],[0,-.015],[-.34,.32]];
 const p=pts.map(([x,y])=>[x*u,y*u]);c.shadowColor='#147ac9';c.shadowBlur=u*.13;c.shadowOffsetY=u*.025;path(c,p,g);c.shadowBlur=0;c.shadowOffsetY=0;
 line(c,kind===3?[[-u*.56,u*.15],[-u*.15,-u*.12],[0,-u*.35],[u*.15,-u*.12],[u*.56,u*.15]]:[[-u*.49,u*.19],[0,-u*.29],[u*.49,u*.19]],'#ddf9ff',u*.026);
 if(kind===3){path(c,[[0,-u*.31],[u*.10,-u*.08],[0,u*.07],[-u*.10,-u*.08]],'#bff5ff');line(c,[[0,-u*.27],[0,u*.04]],'#fff',u*.018);}
 c.restore();
}
/** The path follows the adopted base-mon-print's outer silver rail, including its arched crown. */
function rail(c:C,w:number,h:number,side:number,orientation=1){
 if(orientation<0){c.save();c.translate(w,h);c.rotate(Math.PI);}
 c.beginPath();c.moveTo(w*.50,h*.973);c.bezierCurveTo(w*.28,h*.971,w*.04,h*.974,w*.032,h*.943);c.lineTo(w*.032,h*.091);c.bezierCurveTo(w*.045,h*.037,w*.27,h*.033,w*.50,h*.030);
 if(side>0){c.beginPath();c.moveTo(w*.50,h*.973);c.bezierCurveTo(w*.72,h*.971,w*.96,h*.974,w*.968,h*.943);c.lineTo(w*.968,h*.091);c.bezierCurveTo(w*.955,h*.037,w*.73,h*.033,w*.50,h*.030);}
 if(orientation<0)c.restore();
}
export function attackReadyOffset(ms:number,reduced:boolean,w:number,side:number){
 const t=(ms%ATTACK_READY_PERIOD)/ATTACK_READY_PERIOD;
 return reduced?0:-side*w*.018*pulse(.32,.53,.61,.88,t);
}
export function attackReadyShadow(w:number,ms:number,reduced:boolean){
 const t=reduced?.42:(ms%ATTACK_READY_PERIOD)/ATTACK_READY_PERIOD,b=.5-.5*Math.cos(t*Math.PI*2);
 return `drop-shadow(0 2px 3px #0005) drop-shadow(0 0 ${w*(.012+.010*b)}px rgba(28,148,255,${.48+.18*b}))`;
}
export class AttackReadySurface{
 readonly canvas=document.createElement('canvas');
 constructor(readonly el:HTMLElement){
  this.canvas.className='attack-ready-surface';this.canvas.setAttribute('aria-hidden','true');
  // The existing mana, attack and health seals are z=5; never draw over them.
  this.canvas.style.cssText='position:absolute;pointer-events:none;z-index:4;max-width:none';el.append(this.canvas);
 }
 paint(w:number,h:number,ms:number,reduced=false,side=1){
  if(!w||!h)return;
  const t=reduced?.42:(ms%ATTACK_READY_PERIOD)/ATTACK_READY_PERIOD,b=.5-.5*Math.cos(t*Math.PI*2),pad=w*.30,dpr=Math.min(devicePixelRatio,2);
  const cw=w+pad*2,ch=h+pad*2;
  if(this.canvas.width!==Math.ceil(cw*dpr)||this.canvas.height!==Math.ceil(ch*dpr)){
   this.canvas.width=Math.ceil(cw*dpr);this.canvas.height=Math.ceil(ch*dpr);
   Object.assign(this.canvas.style,{left:`${-pad}px`,top:`${-pad}px`,width:`${cw}px`,height:`${ch}px`});
  }
  this.canvas.style.display='block';
  const c=this.canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);
  c.translate(pad,pad);if(side<0){c.translate(w,h);c.rotate(Math.PI);}
  for(const s of [-1,1]){c.save();rail(c,w,h,s,side);c.strokeStyle=`rgba(8,72,139,${.45+.15*b})`;c.lineWidth=w*.026;c.stroke();c.strokeStyle=`rgba(54,170,255,${.40+.25*b})`;c.lineWidth=w*.012;c.shadowColor='#249eff';c.shadowBlur=w*.025;c.stroke();c.shadowBlur=0;c.strokeStyle=`rgba(183,236,255,${.28+.27*b})`;c.lineWidth=w*.0038;c.stroke();c.restore();}
  // The shoulders remain rooted in the curved crown and gather into a spear-shaped chevron.
  const charge=pulse(.06,.36,.52,.82,t),release=pulse(.34,.52,.66,.94,t);
  for(const s of [-1,1]){
   c.save();c.translate(w/2,0);c.scale(s,1);
   const g=c.createLinearGradient(w*.46,h*.28,0,-w*.12);g.addColorStop(0,'#1376be00');g.addColorStop(.52,'#2eacfa88');g.addColorStop(1,'#c1f5ff');
   path(c,[[w*.448,h*.28],[w*.446,h*.125],[w*.36,h*.065],[w*.17,h*.027],[w*.08,-w*.055],[w*.18,h*.012],[w*.38,h*.039],[w*.47,h*.118]],g);
   c.globalAlpha=.4+.6*charge;line(c,[[w*.456,h*.25],[w*.455,h*.123],[w*.367,h*.057],[w*.18,h*.02],[w*.075,-w*.06]],'#a4eaff',w*.006);c.restore();
  }
  arrow(c,w/2,-w*(.070+.032*release),w*(.49+.025*charge)*.8,3,.84+.16*release);
 }
 hide(){this.canvas.style.display='none';}
 dispose(){this.canvas.remove();}
}
