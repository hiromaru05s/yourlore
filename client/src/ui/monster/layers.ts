/** Transient animation passes share one foreground stacking context above game UI.
 * Shadows stay behind the animated card, not behind unrelated board elements.
 * Never cut ordinary card/UI silhouettes out of either effect pass.
 */
export const ANIMATION_LAYER = { root: 127, rear: 1, cards: 2, front: 3 } as const;
// Persistent field states share the stage with portrait (18) and HP (22).
export const FIELD_STATE_LAYER = 16;
export function mountAnimationLayers(host:HTMLElement, fullscreen=false,policy:'foreground'|'field'='foreground'){
 const root=document.createElement('div');root.className='monster-animation-layer';root.dataset.layerPolicy=policy;
 root.style.cssText=`position:${fullscreen?'fixed':'absolute'};inset:0;isolation:isolate;pointer-events:none;z-index:${policy==='field'?FIELD_STATE_LAYER:ANIMATION_LAYER.root}`;
 const rear=document.createElement('canvas'),front=document.createElement('canvas'),cards=document.createElement('div');cards.className='cards';
 rear.dataset.animationPass='rear';front.dataset.animationPass='front';cards.dataset.animationPass='cards';
 for(const [node,z] of [[rear,ANIMATION_LAYER.rear],[cards,ANIMATION_LAYER.cards],[front,ANIMATION_LAYER.front]] as const)node.style.cssText=`position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;
 root.append(rear,cards,front);host.append(root);
 // Field states normally need only the foreground chevrons. Allocate a full-size
 // drawing surface only when that pass is actually used, at the same DPR as before.
 rear.width=rear.height=front.width=front.height=1;
 let width=innerWidth,height=innerHeight,back:CanvasRenderingContext2D|undefined,foreground:CanvasRenderingContext2D|undefined;
 function resize(c:CanvasRenderingContext2D){const dpr=Math.min(devicePixelRatio,2),canvas=c.canvas;if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);}
 function context(canvas:HTMLCanvasElement){const c=canvas.getContext('2d')!;resize(c);return c;}
 function clear(){for(const c of [back,foreground])if(c){c.save();c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.restore();}}
 function begin(w:number,h:number){width=w;height=h;for(const c of [back,foreground])if(c)resize(c);clear();}
 return {root,rear,front,cards,get back(){return back??=context(rear);},get foreground(){return foreground??=context(front);},begin,clear,dispose(){root.remove();rear.width=rear.height=front.width=front.height=1;}};
}
