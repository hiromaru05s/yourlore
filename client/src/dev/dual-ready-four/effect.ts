import {Actor} from '../../ui/monster/actor';
import {drawEffect} from '../../ui/monster/renderer';
import {projectedPlacement} from '../../ui/boardProjection';
import type {Rect} from '../../ui/monster/catalog';
import {designs,pulse,smooth,type Remaining} from './designs';
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
// Rendered inside the actor, so all geometry shares its exact projective matrix.
function decorate(c:C,w:number,h:number,variant:number,t:number,reduced:boolean,side:number){
 const breath=.5-.5*Math.cos(t*Math.PI*2);
 c.save();if(side<0){c.translate(w,h);c.rotate(Math.PI);}
 if(variant===0){
  rail(c,w,h,-1,.72+.23*breath);rail(c,w,h,1,.72+.23*breath);
  const q=reduced?.5:smooth(.08,.84,t),fade=reduced?.7:pulse(0,.13,.79,.99,t);
  for(const s of [-1,1])glint(c,w*(s<0?.039:.961),h*(.75-.5*q),w*.017,h*.22,fade);
  // Two fine shoulders originate from the existing top frame, with an open centre.
  for(const s of [-1,1]){c.save();c.globalAlpha=.5+.35*breath;stroke(c,[[w*(.5+s*.16),h*.036],[w*(.5+s*.36),h*.047]],GOLD,w*.016);c.restore();}
  arrow(c,w,h,-h*(.08+.008*breath),.78+.18*breath);
 }else if(variant===1){
  for(const s of [-1,1]){
   const q=reduced?.55:pulse(s<0?.04:.18,s<0?.25:.39,.6,.91,t),x=s<0?w*.027:w*.973;
   c.save();c.translate(x,h*.64);c.scale(s,1);
   const length=h*(.43+.075*q),spread=w*(.027+.027*q);
   // Bevel, shadow and spine describe one continuous piece of the card frame.
   const g=c.createLinearGradient(0,0,spread*1.9,0);g.addColorStop(0,DARK);g.addColorStop(.35,'#bb8a35');g.addColorStop(.62,LIGHT);g.addColorStop(.7,GOLD);g.addColorStop(1,'#a57b31');
   polygon(c,[[0,h*.075],[spread,-length*.40],[spread*.55,-length],[0,-length*.88],[-w*.008,0]],g);
   stroke(c,[[spread*.55,-length],[spread,-length*.40],[0,h*.075]],LIGHT,w*.006);
   glint(c,spread*.55,-length*(.4+.25*q),w*.016,h*.17,.5+.4*q);c.restore();
  }
  // The two arrows are the primary count read; opposite phases avoid simultaneous flashes.
  arrow(c,w,h,-h*(.049+.012*breath),.88,.84);
  arrow(c,w,h,-h*(.118+.018*breath),.61+.27*breath,.70);
 }else if(variant===2){
  rail(c,w,h,-1,.64);rail(c,w,h,1,.64);
  // Thin film is clipped to the artwork, away from all numerical badges.
  c.save();c.beginPath();c.roundRect(w*.13,h*.20,w*.74,h*.50,w*.08);c.clip();
  for(const s of [-1,1]){
   const u=reduced?.49:(t-(s<0?.03:.23))/.55,env=reduced?.35:pulse(0,.12,.80,1,u);
   if(env<=0)continue;const q=smooth(0,1,u);
   c.save();c.translate(w*(s<0?-.18+q*1.36:1.18-q*1.36),h*.46);c.rotate(s*.36);
   const g=c.createLinearGradient(-w*.11,0,w*.11,0);g.addColorStop(0,'#f6d77b00');g.addColorStop(.41,'#f4d57616');g.addColorStop(.49,'#fff9da95');g.addColorStop(.51,'#fff6bf60');g.addColorStop(.61,'#eabd6020');g.addColorStop(1,'#f6d77b00');c.globalAlpha=env;c.fillStyle=g;c.fillRect(-w*.11,-h,w*.22,h*2);c.restore();
  }c.restore();
  for(const s of [-1,1])glint(c,w*(s<0?.038:.962),h*(.25+.42*(s<0?breath:1-breath)),w*.025,h*.15,.85);
  arrow(c,w,h,-h*.08,.82);
  // Two notches in the frame retain identity between moving reflections.
  for(const s of [-1,1])polygon(c,[[w*(.5+s*.17),h*.045],[w*(.5+s*.13),h*.067],[w*(.5+s*.17),h*.087],[w*(.5+s*.20),h*.066]],LIGHT);
 }else{
  const a=reduced?.65:pulse(.03,.15,.20,.40,t),b=reduced?.65:pulse(.29,.41,.47,.70,t);
  rail(c,w,h,-1,.43+.57*a);rail(c,w,h,1,.43+.57*b);
  for(const [s,q]of [[-1,a],[1,b]]){
   const x=w*(s<0?.04:.96);glint(c,x,h*(.70-.43*q),w*.025,h*.18,.4+.6*q);
   // An attached forward-pointing shoulder, not a detached particle trail.
   c.save();c.globalAlpha=.4+.6*q;polygon(c,[[x,h*.22],[x-s*w*.067,h*.09],[x-s*w*.1,h*.14],[x-s*w*.022,h*.26]],GOLD);stroke(c,[[x,h*.22],[x-s*w*.067,h*.09]],LIGHT,w*.007);c.restore();
  }
  arrow(c,w,h,-h*(.071+.019*Math.max(a,b)),.72+.28*Math.max(a,b));
 }
 c.restore();
}
export class ReadyStudy{
 readonly actor:Actor;readonly canvas=document.createElement('canvas');private rect?:Rect;private originalOpacity:string;private disposed=false;private suspended=false;
 remaining:Remaining=2;variant=0;side=1;baseline=false;paintCount=0;
 constructor(readonly source:HTMLElement,readonly root:HTMLElement){
  this.originalOpacity=source.style.opacity;this.actor=new Actor(source,root);this.actor.el.setAttribute('aria-hidden','true');this.canvas.className='dual-ready-surface';this.canvas.style.cssText='position:absolute;pointer-events:none;z-index:8;max-width:none';this.actor.el.append(this.canvas);this.measure();
 }
 measure(){const b=this.source.getBoundingClientRect();this.rect={x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height,matrix:projectedPlacement(this.source,b.width,b.height)};}
 paint(ms:number,reduced=false){
  if(this.disposed||this.suspended||!this.rect||!this.source.isConnected||document.hidden){this.restore();return;}
  const r=this.rect,w=r.w,h=r.h;if(!w||!h)return;this.source.style.opacity='0';this.actor.el.style.opacity='1';
  const standard=this.baseline||this.remaining<2,period=standard?2200:designs[this.variant].period,t=reduced?.24:(ms%period)/period;
  this.actor.paint(this.remaining===0?'blocked':'ready',this.remaining===0?'B':'C',t,r,r,reduced,true,this.side);
  if(!standard){
   let dy=0,dx=0;
   if(!reduced){if(this.variant===0)dy=-this.side*w*.013*pulse(.10,.30,.40,.80,t);
    if(this.variant===1)dy=-this.side*w*.012*pulse(.12,.37,.57,.88,t);
    if(this.variant===3){const a=pulse(.03,.15,.20,.40,t),b=pulse(.29,.41,.47,.70,t);dy=-this.side*w*(.019*a+.026*b);dx=w*.005*(b-a);}}
   this.actor.matrix=this.actor.style(this.actor.el,r,r.x+dx,r.y+dy,0,1);this.actor.el.style.display='block';
   const glow=reduced?.6:.45+.35*(.5-.5*Math.cos(t*Math.PI*2));
   this.actor.el.style.setProperty('filter',`drop-shadow(0 2px 3px #0007) drop-shadow(0 0 ${w*.025}px rgba(236,181,61,${glow}))`,'important');
  }
  const pad=w*.22,dpr=Math.min(devicePixelRatio,2),cw=w+pad*2,ch=h+pad*2;
  if(this.canvas.width!==Math.ceil(cw*dpr)||this.canvas.height!==Math.ceil(ch*dpr)){this.canvas.width=Math.ceil(cw*dpr);this.canvas.height=Math.ceil(ch*dpr);Object.assign(this.canvas.style,{left:`${-pad}px`,top:`${-pad}px`,width:`${cw}px`,height:`${ch}px`});}
  const c=this.canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);c.translate(pad,pad);
  if(this.remaining>0){if(standard){const local={x:w/2,y:h/2,w,h};drawEffect(c,'ready','C',t,local,local,{active:true,reduced,side:this.side,pass:'front'});}else decorate(c,w,h,this.variant,t,reduced,this.side);}
  this.actor.el.dataset.studyVariant=this.baseline?'baseline':String(this.variant);this.actor.el.dataset.remaining=String(this.remaining);this.paintCount++;
 }
 restore(){this.source.style.opacity=this.originalOpacity;this.actor.hide();}
 suspend(value:boolean){this.suspended=value;if(value)this.restore();}
 dispose(){if(this.disposed)return;this.restore();this.actor.dispose();this.disposed=true;}
}
