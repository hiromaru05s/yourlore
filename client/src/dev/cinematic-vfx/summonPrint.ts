import {cloneCardNode} from '../../ui/cardClone';
import {ensureCardFrameReady} from '../../ui/cardFrame';
import type {Rect} from './direction';
import type {Pose} from './material';
/** Reveal with the native DOM; land using the actual board node, never a raster substitute. */
export class SummonPrint {
 private reveal?:HTMLElement;private focus?:HTMLElement;private field?:HTMLElement;
 private changed:Array<[string,string,string]>=[];
 async prepare(hand:HTMLElement,field:HTMLElement){
  this.dispose();this.field=field;
  this.reveal=this.clone(hand,'study-summon-reveal');this.focus=this.clone(field,'study-summon-focus');
  await Promise.all([ensureCardFrameReady(this.reveal),ensureCardFrameReady(this.focus)]);
 }
 private clone(source:HTMLElement,kind:string){
  const copy=cloneCardNode(source);copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.removeAttribute('data-hand-snapshot');
  copy.classList.remove('is-playable','is-attacker','selected','hovered');copy.classList.add('fx-card-flight',kind);
  copy.querySelectorAll('[data-uid]').forEach(n=>n.removeAttribute('data-uid'));
  copy.style.cssText='position:fixed;inset:auto;left:0;top:0;margin:0;transform-origin:0 0;pointer-events:none;z-index:200;visibility:hidden;transition:none;animation:none;overflow:visible;';
  document.body.append(copy);return copy;
 }
 private size(node:HTMLElement,w:number,h:number){
  node.style.width=w+'px';node.style.height=h+'px';node.style.setProperty('--cw',w+'px');node.style.setProperty('--ch',h+'px');
 }
 reset(){
  if(this.field)for(const [key,value,priority]of this.changed){if(value)this.field.style.setProperty(key,value,priority);else this.field.style.removeProperty(key);}this.changed=[];
  if(this.reveal)this.reveal.style.visibility='hidden';if(this.focus)this.focus.style.visibility='hidden';
 }
 revealAt(p:Rect,hero:Rect,rx=0,ry=0,alpha=1,light=false){
  const node=this.reveal;if(!node)return;this.size(node,hero.w,hero.h);
  node.style.visibility='visible';node.style.opacity=String(alpha);
  node.style.setProperty('filter',light?'brightness(2.8) sepia(.4) saturate(.3)':'none','important');
  node.style.transform=`translate(${p.x-p.w/2}px,${p.y-p.h/2}px) perspective(1400px) rotateX(${rx}rad) rotateY(${ry}rad) scale(${p.w/hero.w},${p.h/hero.h})`;
 }
 land(height:number,angle:number,alpha:number){
  const node=this.field;if(!node)return;
  // Once grounded, leave every native property untouched. There is no end-of-effect handoff.
  if(height===0&&angle===0&&alpha===1)return;
  const cs=getComputedStyle(node),origin=cs.transformOrigin.split(' ').map(parseFloat);
  const transform=new DOMMatrix(cs.transform==='none'?undefined:cs.transform)
   .translate(-origin[0],-origin[1]).translate(0,0,height).rotateAxisAngle(1,-1,0,angle).translate(origin[0],origin[1]);
  for(const key of['transform','opacity','transition'])this.changed.push([key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);
  node.style.setProperty('transition','none','important');node.style.transform=transform.toString();node.style.opacity=String(alpha);
 }
 focusAt(p:Pose){
  const node=this.focus;if(!node)return;this.size(node,p.w,p.h);node.style.visibility='visible';node.style.opacity=String(p.alpha??1);
  node.style.transform=`translate(${p.x-p.w/2}px,${p.y-p.h/2}px) perspective(1400px) rotateX(${p.rx??0}rad) rotateY(${p.ry??0}rad)`;
 }
 dispose(){this.reset();this.reveal?.remove();this.focus?.remove();this.reveal=undefined;this.focus=undefined;this.field=undefined;}
}
