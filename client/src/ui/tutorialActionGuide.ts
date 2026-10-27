import {getLang} from '../i18n';
import type {TourPlacement} from '../shared/tutorialParts';
import '../styles/tutorialActionGuide.css';
export type GuideBox={left:number;top:number;right:number;bottom:number};
export const guideElement=(selector?:string):HTMLElement|null=>selector?[...document.querySelectorAll<HTMLElement>(selector)].find(e=>{const b=e.getBoundingClientRect();return b.width>2&&b.height>2&&b.right>0&&b.bottom>0&&b.left<innerWidth&&b.top<innerHeight;})??null:null;
export function placeTutorialCoach(coach:HTMLElement,avoid:GuideBox[],preferred:TourPlacement='top-right'):void{
 // Do not move a reply out from under the pointer while the learner clicks it.
 if(coach.matches(':hover')&&coach.dataset.placement)return;
 const w=coach.offsetWidth,h=coach.offsetHeight,m=12;
 const choices:TourPlacement[]=[preferred,'top-left','top-right','bottom-left','bottom-right'];
 const rect=(p:TourPlacement):GuideBox=>({left:p.endsWith('left')?m:innerWidth-m-w,right:p.endsWith('left')?m+w:innerWidth-m,top:p.startsWith('top')?m:innerHeight-m-h,bottom:p.startsWith('top')?m+h:innerHeight-m});
 const area=(p:TourPlacement)=>avoid.reduce((sum,b)=>{const a=rect(p);return sum+Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));},0);
 const best=choices.reduce((a,b)=>area(b)<area(a)?b:a),b=rect(best);
 coach.dataset.placement=best;Object.assign(coach.style,{left:`${Math.max(m,b.left)}px`,top:`${Math.max(m,b.top)}px`,right:'auto',bottom:'auto'});
}
/** DOM geometry is sampled by the owner's RAF, including hover transforms and drag ghosts. */
export class TutorialActionGuide {
 readonly layer=document.createElement('div');
 private ring:HTMLElement;private destination:HTMLElement;private pointer:HTMLElement;private svg:SVGSVGElement;private path:SVGPathElement;private label:HTMLElement;
 constructor(){
  this.layer.className='tutorial-action-guide';this.layer.setAttribute('aria-hidden','true');
  this.layer.innerHTML='<div class="tutorial-action-ring"></div><div class="tutorial-drop-ring"></div><svg><defs><marker id="tutorial-arrow" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#d4f5ff" stroke-width="2"/></marker></defs><path class="tutorial-drag-path" marker-end="url(#tutorial-arrow)"/></svg><div class="tutorial-drop-label"></div><div class="tutorial-action-pointer">☟</div>';
  document.body.append(this.layer);this.ring=this.layer.querySelector('.tutorial-action-ring')!;this.destination=this.layer.querySelector('.tutorial-drop-ring')!;this.pointer=this.layer.querySelector('.tutorial-action-pointer')!;this.svg=this.layer.querySelector('svg')!;this.path=this.layer.querySelector('.tutorial-drag-path')!;this.label=this.layer.querySelector('.tutorial-drop-label')!;
 }
 update(source:HTMLElement|null,dest:HTMLElement|null,ring=true):GuideBox[]{
  const ghost=source?.dataset.uid?guideElement(`.drag-ghost[data-uid="${source.dataset.uid}"]`):null;
  const a=(ghost??source)?.getBoundingClientRect(),raw=dest?.getBoundingClientRect();
  const active=!!a&&a.width>2&&a.height>2;this.layer.hidden=!active;if(!active)return[];
  // Empty field rows are wide. Mark a real, compact drop area inside the actual hitbox.
  const b=raw?{left:raw.left+Math.max(0,(raw.width-160)/2),right:raw.right-Math.max(0,(raw.width-160)/2),top:raw.top+Math.max(0,(raw.height-96)/2),bottom:raw.bottom-Math.max(0,(raw.height-96)/2)}:null;
  const paint=(el:HTMLElement,r:GuideBox,pad=4)=>Object.assign(el.style,{left:`${r.left-pad}px`,top:`${r.top-pad}px`,width:`${r.right-r.left+pad*2}px`,height:`${r.bottom-r.top+pad*2}px`});
  paint(this.ring,a!);this.ring.hidden=!ring;this.destination.hidden=!b;this.svg.style.display=b?'block':'none';this.label.hidden=!b;this.pointer.hidden=!!b||!!ghost;
  Object.assign(this.pointer.style,{left:`${(a!.left+a!.right)/2-18}px`,top:`${Math.max(2,a!.top-40)}px`});
  if(b){
   paint(this.destination,b);const x=(a!.left+a!.right)/2,y=a!.top+12,tx=(b.left+b.right)/2,ty=(b.top+b.bottom)/2;
   this.svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);this.path.setAttribute('d',`M${x} ${y} C${x-65} ${y-80},${tx-65} ${ty+40},${tx} ${ty}`);
   this.label.textContent=getLang()==='ja'?'ここで離す':getLang()==='en'?'Release here':'여기에 놓기';Object.assign(this.label.style,{left:`${tx}px`,top:`${b.top+6}px`});
  }
  return[a!,...(b?[b]:[])];
 }
 hide():void{this.layer.hidden=true;}
 destroy():void{this.layer.remove();}
}
