/** All animation passes share one foreground stacking context above game UI.
 * Shadows stay behind the animated card, not behind unrelated board elements.
 * Never cut ordinary card/UI silhouettes out of either effect pass.
 */
export const ANIMATION_LAYER = { root: 2147483647, rear: 1, cards: 2, front: 3 } as const;
export function mountAnimationLayers(host:HTMLElement, fullscreen=false){
 const root=document.createElement('div');root.className='monster-animation-layer';root.dataset.layerPolicy='foreground';
 root.style.cssText=`position:${fullscreen?'fixed':'absolute'};inset:0;isolation:isolate;pointer-events:none;z-index:${ANIMATION_LAYER.root}`;
 const rear=document.createElement('canvas'),front=document.createElement('canvas'),cards=document.createElement('div');cards.className='cards';
 rear.dataset.animationPass='rear';front.dataset.animationPass='front';cards.dataset.animationPass='cards';
 for(const [node,z] of [[rear,ANIMATION_LAYER.rear],[cards,ANIMATION_LAYER.cards],[front,ANIMATION_LAYER.front]] as const)node.style.cssText=`position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;
 root.append(rear,cards,front);host.append(root);
 const back=rear.getContext('2d')!,foreground=front.getContext('2d')!;
 function clear(){for(const c of [back,foreground]){c.save();c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.restore();}}
 function begin(width:number,height:number){const dpr=Math.min(devicePixelRatio,2);for(const c of [back,foreground]){const canvas=c.canvas;if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);}clear();}
 return {root,rear,front,cards,back,foreground,begin,clear,dispose(){root.remove();}};
}
