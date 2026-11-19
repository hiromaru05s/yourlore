import {cloneCardNode} from '../../ui/cardClone';
import {ensureCardFrameReady} from '../../ui/cardFrame';
import type {Rect} from './direction';
import type {Pose} from './material';
/** Reveal with the native DOM; land using the actual board node, never a raster substitute. */
export class SummonPrint {
 private reveal?:HTMLElement;private focus?:HTMLElement;private field?:HTMLElement;
 private carried?:{node:HTMLElement;placeholder:HTMLElement;style:string;classes:string};
 private density:Array<[HTMLElement,string]>=[];
 private changed:Array<[HTMLElement,string,string,string]>=[];
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
 resetDensity(){for(const [layer,style]of this.density)layer.style.cssText=style;this.density=[];}
 highDensity(){if(this.density.length||!this.field)return;const fieldStyle=getComputedStyle(this.field),sampling=Math.max(6,Math.ceil(2*Math.min(innerHeight*.55/parseFloat(fieldStyle.height),innerWidth*.58/parseFloat(fieldStyle.width))));for(const layer of this.field.querySelectorAll<HTMLElement>('.card-art,.card-frame')){const cs=getComputedStyle(layer);if(cs.scale!=='.5'&&cs.scale!=='0.5')continue;this.density.push([layer,layer.style.cssText]);layer.style.width=parseFloat(cs.width)*sampling/2+'px';layer.style.height=parseFloat(cs.height)*sampling/2+'px';layer.style.scale=String(1/sampling);}}
 private size(node:HTMLElement,w:number,h:number){
  node.style.width=w+'px';node.style.height=h+'px';node.style.setProperty('--cw',w+'px');node.style.setProperty('--ch',h+'px');
 }
 reset(){
  if(this.carried){const {node,placeholder,style,classes}=this.carried;placeholder.replaceWith(node);node.style.cssText=style;node.className=classes;this.carried=undefined;}
  // Restore the native pose while transitions are still disabled. Otherwise the
  // browser interpolates the reset and the next frame compounds the previous tilt.
  for(const [node,key,value,priority]of this.changed){if(key==='transition')continue;if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}
  for(const [node,key,value,priority]of this.changed){if(key!=='transition')continue;void node.offsetWidth;if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}
  this.changed=[];
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
  for(const key of['transform','opacity','transition'])this.changed.push([node,key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);
  node.style.setProperty('transition','none','important');
  const plane=node.parentElement!;
  this.changed.push([plane,'transform-style',plane.style.getPropertyValue('transform-style'),plane.style.getPropertyPriority('transform-style')]);
  plane.style.transformStyle='preserve-3d';
  const cs=getComputedStyle(node),origin=cs.transformOrigin.split(' ').map(parseFloat);
  const transform=new DOMMatrix(cs.transform==='none'?undefined:cs.transform)
   .translate(-origin[0],-origin[1]).translate(0,0,height).rotateAxisAngle(1,-1,0,angle).translate(origin[0],origin[1]);
  node.style.transform=transform.toString();node.style.opacity=String(alpha);
  // Follow the actual frame alpha, including its chamfers. A subpixel bevel and
  // tight contact shadow give the rigid print depth without adding a rectangle.
  const frame=node.querySelector<HTMLElement>('.card-frame');
  if(frame){
   const amount=Math.min(1,angle/2.2+height/3),density=frame.offsetWidth/node.offsetWidth;
   const edge=.55*density*amount,offset=(.4+angle*.3+height*.15)*density,blur=(.5+angle*.24)*density;
   const previous=getComputedStyle(frame).filter;
   this.changed.push([frame,'filter',frame.style.getPropertyValue('filter'),frame.style.getPropertyPriority('filter')]);
   frame.style.setProperty('filter',`${previous==='none'?'':previous} drop-shadow(0 ${edge}px 0 rgba(43,48,52,${amount*.46})) drop-shadow(0 ${offset}px ${blur}px rgba(12,20,28,${amount*.25}))`,'important');
  }
 }
 /** Carry the same DOM print in a temporary screen layer. Its empty slot
  * reserves layout; reattachment occurs before paint, without a replacement image. */
 nativePose(target:DOMMatrix,alpha=1,foreground=false){
  const n=this.field;if(!n||!n.parentElement)return;
  const cs=getComputedStyle(n),w=parseFloat(cs.width),h=parseFloat(cs.height),fontSize=cs.fontSize,fontFamily=cs.fontFamily,lineHeight=cs.lineHeight,style=n.style.cssText,classes=n.className;
  const placeholder=n.cloneNode(false) as HTMLElement;placeholder.removeAttribute('data-uid');placeholder.removeAttribute('id');placeholder.style.visibility='hidden';
  n.replaceWith(placeholder);document.body.append(n);this.carried={node:n,placeholder,style,classes};
  n.classList.remove('is-attacker','is-playable','is-targetable','selected','hovered');n.classList.add('fx-card-flight');
  n.style.cssText=`position:fixed;inset:auto;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;--card-w:${w}px;margin:0;transform-origin:0 0;translate:none;rotate:none;scale:none;transition:none;animation:none;overflow:visible;visibility:visible;pointer-events:none;z-index:${foreground?200:135};font-size:${fontSize};font-family:${fontFamily};line-height:${lineHeight};`;
  n.style.setProperty('box-shadow','none','important');n.style.transform=target.toString();n.style.opacity=String(alpha);
 }
 focusAt(p:Pose){
  const node=this.focus;if(!node)return;this.size(node,p.w,p.h);node.style.visibility='visible';node.style.opacity=String(p.alpha??1);
  node.style.transform=`translate(${p.x-p.w/2}px,${p.y-p.h/2}px) perspective(1400px) rotateX(${p.rx??0}rad) rotateY(${p.ry??0}rad)`;
 }
 dispose(){this.reset();this.resetDensity();this.reveal?.remove();this.focus?.remove();this.reveal=undefined;this.focus=undefined;this.field=undefined;}
}
