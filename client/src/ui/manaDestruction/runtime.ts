import {DB,FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface,captureQuestTile,CARD_PADDING} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {makeMaterial} from './material';
import {makeSkin} from './illumination';
import {draw} from './renderer';
import {variants,type Quad} from './catalog';

const active=new Map<HTMLElement,()=>void>();
export function cancelManaDestruction(root?:HTMLElement){for(const [node,cancel]of [...active])if(!root||root.contains(node))cancel();}
function project(node:HTMLElement):Quad{
 const w=node.offsetWidth,h=node.offsetHeight,mat=projectedPlacement(node,w,h),pad=w*CARD_PADDING;
 const mount=node.parentElement;
 if(mount?.classList.contains('pile-print')){const transform=getComputedStyle(mount).transform;if(transform!=='none')mat.multiplySelf(new DOMMatrix(transform));}
 return [[-pad,-pad],[w+pad,-pad],[w+pad,h+pad],[-pad,h+pad]].map(([x,y])=>{const p=mat.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};}) as Quad;
}
function small(surface:HTMLCanvasElement){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*surface.height/surface.width);c.getContext('2d',{willReadFrequently:true})!.drawImage(surface,0,0,c.width,c.height);return c;}
async function capture(source:HTMLElement,signal:AbortSignal){
 const id=source.dataset.cardId,def=id?DB[id]:undefined;if(!def)return null;
 const clone=source.cloneNode(true) as HTMLElement,full=cardEl({...def,uid:'mana-return'},{size:'hand',fullArt:true});
 const w=180,h=w*source.offsetHeight/source.offsetWidth;
 clone.style.cssText=`position:fixed;left:-5000px;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform:none;opacity:1;visibility:visible`;
 clone.removeAttribute('id');clone.removeAttribute('data-uid');
 full.style.cssText='position:fixed;left:-5500px;top:0;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none';
 // Tile capture shares the real frame, artwork, cost and current duration label.
 if(clone.matches('.buff-icon')){let label=clone.querySelector<HTMLElement>('.buff-duration,.quest-progress');if(!label){label=document.createElement('span');clone.append(label);}label.classList.add('quest-progress');}
 document.body.append(clone,full);
 const clean=()=>{clone.remove();full.remove();};signal.addEventListener('abort',clean,{once:true});
 try{
  const [a,b]=await Promise.all([clone.matches('.buff-icon')?captureQuestTile(clone):captureCardSurface(clone,FRAME_BACK,true,false).then(x=>x.face!),captureCardSurface(full,FRAME_BACK,true,false)]);
  if(signal.aborted||!a||!b.face)return null;
  return{source:small(a),return:small(b.face)};
 }finally{signal.removeEventListener('abort',clean);clean();}
}

/** One selected material and timeline, shared by normal and online public exits. */
export function playManaDestruction(source:HTMLElement,destination:HTMLElement,signal?:AbortSignal):Promise<boolean>{
 active.get(source)?.();
 if(!source.isConnected||!destination.isConnected||signal?.aborted||document.hidden)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve(true);
 return new Promise(resolve=>{
  const began=performance.now(),load=new AbortController();let done=false,raf=0,canvas:HTMLCanvasElement|undefined,sourceHidden=false,targetHidden=false;
  const visibility=source.style.visibility,targetVisibility=destination.style.visibility;
  const finish=(complete:boolean)=>{
   if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);load.abort();canvas?.remove();
   if(sourceHidden)source.style.visibility=visibility;if(targetHidden)destination.style.visibility=targetVisibility;
   signal?.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);
   if(active.get(source)===cancel)active.delete(source);
   window.dispatchEvent(new CustomEvent('lore:mana-destruction-finished',{detail:{complete,elapsed:Math.round(performance.now()-began),prepareMs:Number(canvas?.dataset.prepareMs||0),phase:canvas?.dataset.phase??'prepare'}}));resolve(complete);
  };
  const cancel=()=>finish(false),hidden=()=>{if(document.hidden)cancel();};
  const deadline=setTimeout(cancel,6000);
  active.set(source,cancel);signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
  void capture(source,load.signal).then(surfaces=>{
   if(done||!surfaces){cancel();return;}
   const material=makeMaterial(surfaces.source),returned={...material,face:surfaces.return,skins:[makeSkin(surfaces.return,0,true)]};
   if(done||!source.isConnected||!destination.isConnected){cancel();return;}
   const start=performance.now(),timing=variants[0],dpr=Math.min(devicePixelRatio,2);
   canvas=document.createElement('canvas');canvas.className='mana-destruction';canvas.dataset.variant='vein-01';canvas.setAttribute('aria-hidden','true');
   canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:136';const points=[...project(source),...project(destination)],margin=source.getBoundingClientRect().width*.85;
   const left=Math.max(0,Math.min(...points.map(p=>p.x))-margin),top=Math.max(0,Math.min(...points.map(p=>p.y))-margin);
   const width=Math.min(innerWidth-left,Math.max(...points.map(p=>p.x))+margin-left),height=Math.min(innerHeight-top,Math.max(...points.map(p=>p.y))+margin-top);
   canvas.style.left=left+'px';canvas.style.top=top+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);canvas.dataset.prepareMs=String(Math.round(start-began));document.body.append(canvas);
   const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
   source.style.visibility='hidden';sourceHidden=true;
   const tick=(now:number)=>{
    if(done)return;if(!source.isConnected||!destination.isConnected||signal?.aborted||document.hidden){cancel();return;}
    try{
    const ms=Math.min(timing.duration,now-start);
    if(ms>=timing.arriveAt&&destination.matches('.card')&&!targetHidden){destination.style.visibility='hidden';targetHidden=true;}
    ctx.resetTransform();ctx.clearRect(0,0,canvas!.width,canvas!.height);ctx.setTransform(dpr,0,0,dpr,-left*dpr,-top*dpr);
    draw(ctx,ms>=timing.arriveAt?returned:material,0,ms,project(source),project(destination));
    canvas!.dataset.phase=ms<timing.breakAt?'charge':ms<timing.joinAt?'fracture':ms<timing.arriveAt?'flight':'reform';
    if(ms===timing.duration)finish(true);else raf=requestAnimationFrame(tick);
    }catch{cancel();}
   };tick(start);
  }).catch(cancel);
 });
}
