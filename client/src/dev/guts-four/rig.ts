import {paintMaterial} from './paint';
import {CONTACT,END,pulse,smooth,type Variant} from './catalog';
/** Owns exactly one surface, using the card's existing perspective and stacking.
 * No copy of the artwork, GPU context, global event listener or independent RAF. */
export class EnduranceRig {
 readonly canvas=document.createElement('canvas');
 private c:CanvasRenderingContext2D;
 private hp:HTMLElement|null;
 private icon:HTMLElement|null;
 private baseStatus:string;
 private status:HTMLElement|null;
 private style:string|null;
 private previousHit=false;
 private source:[number,number]=[100,274];
 private measuredWidth=0;
 private measuredHeight=0;
 private baseHp:string;
 active=false;
 constructor(readonly card:HTMLElement,readonly variant:Variant,readonly count=2,readonly direction=1){
  this.style=card.getAttribute('style');this.hp=card.querySelector('.ad-def .seal-value');this.baseHp=this.hp?.textContent??'9';
  this.status=card.querySelector('.card-status');this.baseStatus=this.status?.innerHTML??'';this.icon=card.querySelector('[data-psv="guts"]');
  this.measureSource();
  this.canvas.width=600;this.canvas.height=866;this.canvas.className='guts-surface';this.canvas.setAttribute('aria-hidden','true');
  this.c=this.canvas.getContext('2d')!;this.c.setTransform(2,0,0,2,100,110);this.card.append(this.canvas);
  this.card.classList.add('guts-rig');
 }
 private measureSource(){
  const w=this.card.offsetWidth,h=this.card.offsetHeight,badge=this.icon;
  if(!badge||w<=0||h<=0||w===this.measuredWidth&&h===this.measuredHeight)return;
  let x=badge.offsetLeft+badge.offsetWidth/2,y=badge.offsetTop+badge.offsetHeight/2,n=badge.offsetParent as HTMLElement|null;
  while(n&&n!==this.card){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent as HTMLElement|null;}
  this.source=[x/w*200,y/h*312.5];this.measuredWidth=w;this.measuredHeight=h;
 }
 render(t:number,reduced=false,trigger=true){
  this.measureSource();
  const hit=trigger&&t>=CONTACT;
  if(hit!==this.previousHit){
   if(this.hp)this.hp.textContent=hit?'1':this.baseHp;
   if(this.status){this.status.innerHTML=this.baseStatus;this.icon=this.status.querySelector('[data-psv="guts"]');if(hit&&this.icon){const b=this.icon.querySelector('b');if(b){if(this.count<=1)b.remove();else b.textContent=String(this.count-1)}const label=`気合 ${Math.max(0,this.count-1)}: 致命傷を耐え、体力1で生存`;this.icon.setAttribute('aria-label',label);this.icon.title=label;}}
   this.previousHit=hit;
  }
  const age=t-CONTACT,body=hit&&!reduced?pulse(0,65,620,age):0;
  const snap=hit&&!reduced?pulse(160,230,530,age):0;
  const displacements=[body*5-snap*1.8,body*7-snap*4,body*3.5-snap*.7,body*6.5-snap*2.5];
  const unit=Math.min(1.2,(this.card.offsetWidth||160)/160);
  this.card.style.translate=`0 ${displacements[this.variant]*this.direction*unit}px`;
  this.card.style.rotate=`${(this.variant===1?-.8:.38)*body}deg`;
  this.card.style.setProperty('--guts-contact',String(body));
  if(this.icon){const a=hit&&!reduced?pulse(0,40,280,age):0;this.icon.style.filter=a?`brightness(${1+a*1.3})`:'';this.icon.style.scale=String(1+a*.12)}
  this.c.save();
  if(this.direction<0){this.c.translate(0,312.5);this.c.scale(1,-1);}
  paintMaterial(this.c,this.variant,trigger?t:0,[this.source[0],this.direction<0?312.5-this.source[1]:this.source[1]],reduced,this.card.offsetWidth);
  this.c.restore();
  this.active=trigger&&t>=CONTACT&&t<END;
  this.card.dataset.endurance=hit?'survived':'ready';
 }
 reset(){this.render(0);this.active=false}
 dispose(){this.reset();this.canvas.remove();this.card.classList.remove('guts-rig');delete this.card.dataset.endurance;this.style===null?this.card.removeAttribute('style'):this.card.setAttribute('style',this.style);if(this.status)this.status.innerHTML=this.baseStatus;}
}

/** Close-up contact is a directional cut, confined to the target, in the same
 * clock as the real board attack. It intentionally carries no result numbers. */
export function closeupStrike(c:CanvasRenderingContext2D,t:number,reduced:boolean){
 c.clearRect(0,0,300,420);if(reduced||t<CONTACT-120||t>CONTACT+160)return;
 const approach=smooth(CONTACT-120,CONTACT,t),leave=smooth(CONTACT+10,CONTACT+160,t);
 const x=126+28*approach,y=-30+150*approach;
 c.save();c.globalAlpha=1-leave;c.beginPath();c.moveTo(x-9,y-76);c.lineTo(x+4,y-34);c.lineTo(x+13,y+12);c.lineTo(x-1,y+3);c.lineTo(x-4,y-35);c.closePath();
 const g=c.createLinearGradient(x-9,y-76,x+13,y+12);g.addColorStop(0,'#6b536b00');g.addColorStop(.7,'#6c4b61');g.addColorStop(1,'#ffdbb5');c.fillStyle=g;c.fill();c.restore();
}
