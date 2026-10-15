import {Actor,corners} from '../monster/actor';
import {monsterRect} from '../monster/runtime';
import {fragmentPose,SPLIT,DEBRIS_END} from './motion';
/** Use the original DOM imagery and projection, like ordinary monster death.
 * No bitmap downscale, environment lighting, bloom or replacement face. */
export class NativeMarketBreak{
 root=document.createElement('div');actors:Actor[]=[];filters:string[]=[];
 constructor(cards:HTMLElement[]){
  this.root.className='crisis-native-break';this.root.setAttribute('aria-hidden','true');this.root.style.cssText='position:fixed;inset:0;z-index:9000;pointer-events:none';document.body.append(this.root);
  for(const source of cards){const actor=new Actor(source,this.root);this.filters.push(getComputedStyle(source).filter);
   for(const poly of actor.polygons){const n=actor.el.cloneNode(true) as HTMLElement;n.querySelector('.stat-surface')?.remove();n.querySelector('.mkt-stock')?.remove();n.classList.remove('crisis-hidden');n.classList.add('crisis-fragment');n.style.clipPath=`polygon(${poly.map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`;n.style.display='none';this.root.append(n);actor.pieces.push(n)}
   actor.pieces.forEach(piece=>piece.querySelectorAll('img').forEach(img=>{img.decoding='sync';img.loading='eager'}));
   this.actors.push(actor);
  }
 }
 paint(cards:HTMLElement[],t:number,dark:boolean){
  this.root.dataset.time=String(t);this.root.style.filter=dark?'brightness(.62)':'none';this.hide();if(t<SPLIT||t>=DEBRIS_END)return;
  cards.forEach((n,slot)=>{const r=monsterRect(n),a=this.actors[slot];
   // The responsive board can scale an ancestor after board projection.
   // Keep the projected face, fitting its bounds to the actual screen card.
   if(r.matrix){const pts=corners(r.matrix,r.w,r.h),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
    if(w>0&&h>0)r.matrix=new DOMMatrix().translate(r.x-r.w/2,r.y-r.h/2).scale(r.w/w,r.h/h).translate(-left,-top).multiply(r.matrix);
   }
   a.pieces.forEach((piece,i)=>{const p=fragmentPose(t,slot,i);if(!p.visible)return;a.style(piece,r,r.x+p.x*r.w,r.y+p.y*r.h,p.angle,p.scale);piece.style.clipPath=`polygon(${a.polygons[i].map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`;piece.style.setProperty('filter',this.filters[slot],'important');piece.style.opacity=String(p.opacity);piece.style.display='block';piece.dataset.sourceUid=n.dataset.uid??'';});});
 }
 hide(){this.actors.forEach(a=>a.hide())}
 dispose(){this.actors.forEach(a=>a.dispose());this.root.remove()}
}
