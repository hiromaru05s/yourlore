import type {GuideBox} from './tutorialActionGuide';
import type {TourPlacement} from '../shared/tutorialParts';

const overlap=(a:GuideBox,b:GuideBox)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
/** Move the same Zeno + speech surface to the lesson target, keeping the tail attached.
 * Geometry stays authoritative; a compositor transform supplies the eased flight. */
export class TutorialCompanionFlight {
 private animation:Animation|null=null;
 private x=NaN;private y=NaN;private step=-1;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 place(coach:HTMLElement,target:GuideBox|null,avoid:GuideBox[],step:number,preferred:TourPlacement='top-right'):void{
  const changed=step!==this.step;
  if(!changed&&coach.matches(':hover')&&Number.isFinite(this.x))return;
  const w=coach.offsetWidth,h=coach.offsetHeight,m=10,gap=18;
  const bound=(x:number,y:number)=>({x:Math.max(m,Math.min(innerWidth-w-m,x)),y:Math.max(m,Math.min(innerHeight-h-m,y))});
  const corners=[preferred,'top-left','top-right','bottom-left','bottom-right'].map(p=>bound(p.endsWith('left')?m:innerWidth-w-m,p.startsWith('top')?m:innerHeight-h-m));
  const spirit=coach.querySelector<HTMLElement>('.tutorial-tour-spirit')!;
  const sx=spirit.offsetWidth/2,sy=h-spirit.offsetHeight/2;
  const tx=target?(target.left+target.right)/2:0,ty=target?(target.top+target.bottom)/2:0;
  const choices=target?[
   bound(target.right+gap,ty-sy),bound(target.left-w-gap,ty-sy),
   bound(tx-sx,target.top-h-gap),bound(tx-sx,target.bottom+gap),...corners,
  ]:corners;
  const score=(p:{x:number;y:number})=>{
   const box={left:p.x,top:p.y,right:p.x+w,bottom:p.y+h};
   const covered=avoid.reduce((sum,b)=>sum+overlap(box,{left:b.left-8,top:b.top-8,right:b.right+8,bottom:b.bottom+8}),0);
   return covered*10000+(target?Math.hypot(p.x+sx-tx,p.y+sy-ty):choices.indexOf(p));
  };
  const best=choices.reduce((a,b)=>score(b)<score(a)?b:a);
  if(!changed&&Math.abs(best.x-this.x)<3&&Math.abs(best.y-this.y)<3){if(this.reduced.matches)this.animation?.cancel();return;}
  const previous=coach.getBoundingClientRect(),ready=Number.isFinite(this.x);
  this.animation?.cancel();this.animation=null;
  this.x=best.x;this.y=best.y;this.step=step;
  coach.dataset.placement='near-target';
  Object.assign(coach.style,{left:`${best.x}px`,top:`${best.y}px`,right:'auto',bottom:'auto'});
  // Retarget from the currently rendered point, including an interrupted flight.
  if(ready&&!this.reduced.matches){
   const dx=previous.left-best.x,dy=previous.top-best.y;
   if(Math.hypot(dx,dy)>3)this.animation=coach.animate([
    {transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'},
   ],{duration:680,easing:'cubic-bezier(0.16,1,0.3,1)'});
  }
 }
 destroy():void{this.animation?.cancel();this.animation=null;}
}
