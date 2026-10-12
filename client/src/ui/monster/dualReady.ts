import type {FieldMon} from '../../shared/types';
import type {Actor} from './actor';
import type {Rect} from './catalog';

// Selected study 04, preserved from the comparison lab (2026-10-12).
export const DUAL_READY_PERIOD = 2800;
export function dualReadyActive(m: Pick<FieldMon, 'mult' | 'attacksUsed'>, canAttack: boolean): boolean {
 return canAttack && (m.mult ?? 1) - (m.attacksUsed ?? 0) >= 2;
}
const smooth=(a:number,b:number,n:number)=>{const t=Math.max(0,Math.min(1,(n-a)/(b-a)));return t*t*(3-2*t);};
const pulse=(a:number,b:number,c:number,d:number,t:number)=>smooth(a,b,t)*(1-smooth(c,d,t));
export function dualReadyPose(w:number,t:number,reduced:boolean,side:number){
 const a=reduced?0:pulse(.03,.15,.20,.40,t),b=reduced?0:pulse(.29,.41,.47,.70,t);
 return {dx:w*.005*(b-a),dy:-side*w*(.019*a+.026*b)};
}
type C=CanvasRenderingContext2D;
const GOLD='#e1b451',LIGHT='#fff4c7',DARK='#765626';
const polygon=(c:C,p:number[][],fill:string|CanvasGradient)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();};
function stroke(c:C,p:number[][],color:string,width:number){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
// These tracks follow the field frame; the number/cost/passive plates stay clear.
function rail(c:C,w:number,h:number,sign:number,strength:number,start=.22,end=.76){
 c.save();c.globalAlpha*=strength;const x=sign<0?w*.038:w*.962;
 stroke(c,[[x,h*end],[x,h*start],[x+sign*w*.006,h*(start-.035)]],DARK,w*.032);
 stroke(c,[[x,h*end],[x,h*start],[x+sign*w*.006,h*(start-.035)]],GOLD,w*.017);
 stroke(c,[[x-sign*w*.005,h*(end-.018)],[x-sign*w*.005,h*(start+.008)]],LIGHT,w*.0055);c.restore();
}
function glint(c:C,x:number,y:number,w:number,h:number,alpha:number){
 c.save();c.globalAlpha*=alpha;const g=c.createLinearGradient(x,y-h/2,x,y+h/2);g.addColorStop(0,'#fff8d000');g.addColorStop(.48,LIGHT);g.addColorStop(.52,LIGHT);g.addColorStop(1,'#fff8d000');c.fillStyle=g;c.fillRect(x-w/2,y-h/2,w,h);c.restore();
}
function arrow(c:C,w:number,h:number,y:number,alpha:number,scale=1){
 c.save();c.globalAlpha*=alpha;c.translate(w/2,y);c.scale(scale,scale);
 const u=w*.34,g=c.createLinearGradient(0,-u*.27,0,u*.22);g.addColorStop(0,LIGHT);g.addColorStop(.38,GOLD);g.addColorStop(.4,'#bd913f');g.addColorStop(1,DARK);
 polygon(c,[[-u*.5,u*.16],[0,-u*.27],[u*.5,u*.16],[u*.35,u*.28],[0,-u*.035],[-u*.35,u*.28]],g);
 stroke(c,[[-u*.47,u*.15],[0,-u*.26],[u*.47,u*.15]],LIGHT,Math.max(.7,w*.007));c.restore();void h;
}
function decorate(c:C,w:number,h:number,t:number,reduced:boolean,side:number){
 c.save();if(side<0){c.translate(w,h);c.rotate(Math.PI);}
  const a=reduced?.65:pulse(.03,.15,.20,.40,t),b=reduced?.65:pulse(.29,.41,.47,.70,t);
  rail(c,w,h,-1,.43+.57*a);rail(c,w,h,1,.43+.57*b);
  for(const [s,q]of [[-1,a],[1,b]]){
   const x=w*(s<0?.04:.96);glint(c,x,h*(.70-.43*q),w*.025,h*.18,.4+.6*q);
   // An attached forward-pointing shoulder, not a detached particle trail.
   c.save();c.globalAlpha=.4+.6*q;polygon(c,[[x,h*.22],[x-s*w*.067,h*.09],[x-s*w*.1,h*.14],[x-s*w*.022,h*.26]],GOLD);stroke(c,[[x,h*.22],[x-s*w*.067,h*.09]],LIGHT,w*.007);c.restore();
  }
  arrow(c,w,h,-h*(.071+.019*Math.max(a,b)),.72+.28*Math.max(a,b));
 c.restore();
}
/** This surface is a child of the actor: projection, drag hiding and disposal stay atomic. */
export class DualReadySurface {
 readonly canvas=document.createElement('canvas');
 constructor(readonly actor:Actor,private readonly density=1){
  this.canvas.className='dual-ready-surface';
  this.canvas.style.cssText='position:absolute;pointer-events:none;z-index:8;max-width:none';
  actor.el.append(this.canvas);
 }
 paint(r:Rect,now:number,reduced:boolean,side:number){
  const {w,h}=r,t=reduced?.24:(now%DUAL_READY_PERIOD)/DUAL_READY_PERIOD;
  const {dx,dy}=dualReadyPose(w,t,reduced,side);
  this.actor.matrix=this.actor.style(this.actor.el,r,r.x+dx,r.y+dy,0,1);
  this.actor.el.style.display='block';
  const glow=reduced?.6:.45+.35*(.5-.5*Math.cos(t*Math.PI*2)),density=this.density;
  this.actor.el.style.setProperty('filter',`drop-shadow(0 ${2*density}px ${3*density}px #0007) drop-shadow(0 0 ${w*.025*density}px rgba(236,181,61,${glow}))`,'important');
  const pad=w*.22,dpr=Math.min(devicePixelRatio,2)*density,cw=w+pad*2,ch=h+pad*2;
  if(this.canvas.width!==Math.ceil(cw*dpr)||this.canvas.height!==Math.ceil(ch*dpr)){
   this.canvas.width=Math.ceil(cw*dpr);this.canvas.height=Math.ceil(ch*dpr);
   Object.assign(this.canvas.style,{left:`${-pad*density}px`,top:`${-pad*density}px`,width:`${cw*density}px`,height:`${ch*density}px`});
  }
  this.canvas.style.display='block';
  const c=this.canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);c.translate(pad,pad);
  decorate(c,w,h,t,reduced,side);
 }
 hide(){this.canvas.style.display='none';}
}
