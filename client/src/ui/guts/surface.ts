import {paintAmber} from './material';
import {CONTACT,pulse} from './timing';
import type {GutsSurvival} from '../../shared/types';
import {getLang} from '../../i18n';
/** Update presentation once from the authoritative outcome; never subtract locally. */
export function showGutsResult(card:HTMLElement,result:GutsSurvival){
 const hp=card.querySelector('.ad-def .seal-value');if(hp)hp.textContent='1';
 const icon=card.querySelector<HTMLElement>('[data-psv="guts"]');
 if(icon){const b=icon.querySelector('b');if(result.after<=0)b?.remove();else if(b)b.textContent=String(result.after);
 const label={ja:`気合 ${result.after} · 体力1で耐えた`,ko:`기합 ${result.after} · 체력 1로 버팀`,en:`Guts ${result.after} · Survived with 1 HP`}[getLang()];icon.title=label;icon.setAttribute('aria-label',label);}
}
/** A single canvas inside the projected card; the image, frame and material share a matrix. */
export class AmberSurface {
 readonly canvas=document.createElement('canvas');
 private context:CanvasRenderingContext2D|null;
 private source:[number,number]=[100,274];
 constructor(readonly card:HTMLElement,readonly direction:number){
  this.canvas.width=600;this.canvas.height=866;this.canvas.dataset.gutsSurface='04';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.style.cssText='position:absolute;left:-25%;top:-17.6%;width:150%;height:138.56%;pointer-events:none;z-index:8';
  card.append(this.canvas);card.style.isolation='isolate';
  for(const n of card.querySelectorAll<HTMLElement>('.card-status,.card-name,.ad-atk,.ad-def,.card-cost'))n.style.zIndex='26';
  this.context=this.canvas.getContext('2d');this.context?.setTransform(2,0,0,2,100,110);
  const badge=card.querySelector<HTMLElement>('[data-psv="guts"]');
  if(badge&&card.offsetWidth&&card.offsetHeight){let x=badge.offsetLeft+badge.offsetWidth/2,y=badge.offsetTop+badge.offsetHeight/2,n=badge.offsetParent as HTMLElement|null;
   while(n&&n!==card){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent as HTMLElement|null;}
   this.source=[x/card.offsetWidth*200,y/card.offsetHeight*312.5];}
 }
 render(age:number,reduced:boolean,width:number){
  const body=reduced?0:pulse(0,65,620,age),snap=reduced?0:pulse(160,230,530,age);
  this.card.style.translate=`0 ${(body*6.5-snap*2.5)*this.direction*Math.min(1.2,width/160)}px`;
  this.card.style.rotate=`${.38*body}deg`;
  const c=this.context;if(!c)return;c.save();
  if(this.direction<0){c.translate(0,312.5);c.scale(1,-1);}
  paintAmber(c,CONTACT+age,[this.source[0],this.direction<0?312.5-this.source[1]:this.source[1]],reduced,width);c.restore();
 }
 dispose(){this.canvas.remove();this.canvas.width=this.canvas.height=1;}
}
