import {cloneCardNode} from '../../ui/cardClone';
import {createFrameScene,type FrameScene} from '../../ui/spellFrame/scene';
import {clamp,ease,type Rect} from './direction';
/** Keep the adopted DOM print, raster frame stencil and four-corner HDR renderer. */
export class SpellPresentation {
 private node?:HTMLElement;private frame?:FrameScene;private sweep?:HTMLElement;private serial=0;
 async prepare(source:HTMLElement){const serial=++this.serial;this.frame?.dispose();this.node?.remove();this.frame=undefined;
  const node=cloneCardNode(source);node.removeAttribute('data-uid');node.classList.remove('playable','selected','hovered');node.classList.add('study-spell-print');
  const w=240,h=w*source.offsetHeight/source.offsetWidth;node.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform-origin:0 0;pointer-events:none;z-index:203;opacity:0;visibility:visible;transition:none;margin:0;`;
  node.querySelectorAll('[data-uid]').forEach(n=>n.removeAttribute('data-uid'));document.body.append(node);this.node=node;
  const sweep=document.createElement('div');sweep.className='study-spell-sweep';node.querySelector('.card-art')?.append(sweep);this.sweep=sweep;
  try{const frame=await createFrameScene(node);if(serial!==this.serial){frame.dispose();return;}this.frame=frame;frame.draw(0,false);}catch{parent.postMessage({type:'cinematic-vfx',fallback:true},location.origin);}
 }
 pose(p:Rect,t:number,opacity=1,ry=0,rx=0){const node=this.node;if(!node)return;node.style.opacity=String(opacity);node.style.transform=`translate(${p.x-p.w/2}px,${p.y-p.h/2}px) perspective(800px) rotateY(${ry}rad) rotateX(${rx}rad) scale(${p.w/node.offsetWidth},${p.h/node.offsetHeight})`;
  // Same approved 03 clock and stencil; a longer hold makes the engraved propagation readable.
  this.frame?.draw(clamp((t-.34)/1.18)*3200,false);
  const charge=ease(.50,.80,t)*(1-ease(1.10,1.43,t));node.style.filter=`drop-shadow(0 10px 14px #07142655) drop-shadow(0 0 ${charge*8}px rgba(99,184,255,${charge*.55}))`;
  if(this.sweep){const q=clamp((t-.67)/.48);this.sweep.style.transform=`translateY(${(q*2-1)*110}%) rotate(-18deg)`;this.sweep.style.opacity=String(Math.sin(q*Math.PI)*.35);}
 }
 hide(){if(this.node)this.node.style.opacity='0';}
 dispose(){this.serial++;this.frame?.dispose();this.node?.remove();this.node=undefined;this.frame=undefined;}
}
