import {cloneCardNode} from '../cardClone';
import {SPECIAL_FX} from '../animationTempo';
import {DB,FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface,captureQuestTile,CARD_PADDING} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {makeMaterial} from './material';
import {makeSkin} from './illumination';
import {draw} from './renderer';
import {variants,type Quad} from './catalog';

type Prepared={material:ReturnType<typeof makeMaterial>;returned:ReturnType<typeof makeMaterial>};
const prepared=new Map<HTMLElement,{value:Prepared;clear:()=>void}>();
const active=new Map<HTMLElement,()=>void>();
/** Optional batch warmup. Call before a choreographed sequence, while its clock is stopped.
 * The captured material belongs to this exact DOM state and is consumed once. */
export async function prepareManaDestruction(source:HTMLElement,signal:AbortSignal):Promise<boolean>{
 prepared.get(source)?.clear();
 if(signal.aborted||!source.isConnected)return false;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return true;
 try{
  const value=await prepare(source,signal);
  if(!value||signal.aborted||!source.isConnected)return false;
  const clear=()=>{if(prepared.get(source)?.value===value)prepared.delete(source);signal.removeEventListener('abort',clear);};
  prepared.set(source,{value,clear});signal.addEventListener('abort',clear,{once:true});return true;
 }catch{return false;}
}
async function prepare(source:HTMLElement,signal:AbortSignal):Promise<Prepared|null>{
 const surfaces=await capture(source,signal);if(!surfaces||signal.aborted)return null;
 const material=makeMaterial(small(surfaces.source));material.face=surfaces.source;const returned={...material,face:surfaces.return,skins:[makeSkin(surfaces.return,0,true)]};
 return{material,returned};
}
export function cancelManaDestruction(root?:HTMLElement){for(const [node,item]of [...prepared])if(root?root.contains(node):node.dataset.combatExit!=='true')item.clear();for(const [node,cancel]of [...active])if(root?root.contains(node):node.dataset.combatExit!=='true')cancel();}
function project(node:HTMLElement):Quad{
 const w=node.offsetWidth,h=node.offsetHeight,pad=w*CARD_PADDING,cs=getComputedStyle(node),plane=node.closest<HTMLElement>('[data-board-plane]');
 let mat=projectedPlacement(node,w,h);
 if(cs.transform!=='none'&&plane!==node){
  const [ox,oy]=cs.transformOrigin.split(' ').map(Number.parseFloat),local=new DOMMatrix().translate(ox||0,oy||0).multiply(new DOMMatrix(cs.transform)).translate(-(ox||0),-(oy||0));
  if(cs.position==='fixed'&&!plane)mat=new DOMMatrix().translate(parseFloat(cs.left)||0,parseFloat(cs.top)||0).multiply(local);
  else mat.multiplySelf(local);
 }
 const mount=node.parentElement;
 if(mount?.classList.contains('pile-print')){const transform=getComputedStyle(mount).transform;if(transform!=='none')mat.multiplySelf(new DOMMatrix(transform));}
 return [[-pad,-pad],[w+pad,-pad],[w+pad,h+pad],[-pad,h+pad]].map(([x,y])=>{const p=mat.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};}) as Quad;
}
function small(surface:HTMLCanvasElement){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*surface.height/surface.width);c.getContext('2d',{willReadFrequently:true})!.drawImage(surface,0,0,c.width,c.height);return c;}
async function capture(source:HTMLElement,signal:AbortSignal){
 const id=source.dataset.cardId,def=id?DB[id]:undefined;if(!def)return null;
 const clone=cloneCardNode(source),full=cardEl({...def,uid:'mana-return'},{size:'hand',fullArt:true,effect:source.dataset.cardEffect});
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
  return{source:a,return:b.face};
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
  let pile=destination.closest<HTMLElement>('.pile--shelf')??(destination.dataset.shelfId?document.getElementById(destination.dataset.shelfId):null);
  const initialPile=pile,pileId=pile?.id,sourceUid=source.dataset.uid??source.dataset.exitUid,hiddenPrints=new Map<HTMLElement,string>();
  let landing:HTMLElement|undefined,landingMount:HTMLElement|undefined;
  const def=source.dataset.cardId?DB[source.dataset.cardId]:undefined;
  if(pile&&def){
   landingMount=document.createElement('div');landingMount.className='pile-print';landingMount.dataset.manaLanding='true';landingMount.style.visibility='hidden';landingMount.setAttribute('aria-hidden','true');
   landing=cardEl({...def,uid:sourceUid??'return-'+def.id},{size:'hand',fullArt:true,effect:source.dataset.cardEffect});landingMount.append(landing);pile.append(landingMount);
  }
  const ensureLanding=()=>{
   if(!landingMount||!pileId)return;
   const current=document.getElementById(pileId);if(!current)return;
   if(current!==pile||!landingMount.isConnected){pile=current;current.append(landingMount);}
   // The authoritative snapshot can arrive while this public exit is still
   // moving. Keep its matching final face hidden until re-formation ends.
   for(const print of current.querySelectorAll<HTMLElement>('.pile-print'))if(print!==landingMount&&print.querySelector<HTMLElement>('.card')?.dataset.uid===sourceUid&&!hiddenPrints.has(print)){hiddenPrints.set(print,print.style.visibility);print.style.visibility='hidden';}
  };
  const arrival=()=>{ensureLanding();return project(landing?.isConnected?landing:destination);};
  const finish=(complete:boolean)=>{
   if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);load.abort();
   ensureLanding();const top=pile?.querySelector<HTMLElement>('.pile-print:not([data-mana-landing]) .card');
   const authoritative=pile!==initialPile;
   if(complete&&landingMount&&pile?.isConnected&&(!authoritative||top?.dataset.uid===sourceUid)){for(const old of pile.querySelectorAll('.pile-print'))if(old!==landingMount&&!old.hasAttribute('data-mana-landing'))old.remove();landingMount.style.visibility='visible';delete landingMount.dataset.manaLanding;}
   else landingMount?.remove();
   for(const [print,visibility]of hiddenPrints)print.style.visibility=visibility;
   canvas?.remove();
   if(sourceHidden)source.style.visibility=visibility;if(targetHidden)destination.style.visibility=targetVisibility;
   signal?.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);
   if(active.get(source)===cancel)active.delete(source);
   window.dispatchEvent(new CustomEvent('lore:mana-destruction-finished',{detail:{complete,elapsed:Math.round(performance.now()-began),prepareMs:Number(canvas?.dataset.prepareMs||0),phase:canvas?.dataset.phase??'prepare'}}));resolve(complete);
  };
  const cancel=()=>finish(false),hidden=()=>{if(document.hidden)cancel();};
  const deadline=setTimeout(cancel,6000);
  active.set(source,cancel);signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
  const cached=prepared.get(source);cached?.clear();
  void (cached?Promise.resolve(cached.value):prepare(source,load.signal)).then(value=>{
   if(done||!value){cancel();return;}
   const {material,returned}=value;
   if(done||!source.isConnected||!destination.isConnected){cancel();return;}
   let start:number|undefined;const timing=variants[0],dpr=Math.min(devicePixelRatio,2);
   canvas=document.createElement('canvas');canvas.className='mana-destruction';canvas.dataset.variant='vein-01';canvas.setAttribute('aria-hidden','true');
   canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:136';const points=[...project(source),...arrival()],margin=source.getBoundingClientRect().width*.85;
   const left=Math.max(0,Math.min(...points.map(p=>p.x))-margin),top=Math.max(0,Math.min(...points.map(p=>p.y))-margin);
   const width=Math.min(innerWidth-left,Math.max(...points.map(p=>p.x))+margin-left),height=Math.min(innerHeight-top,Math.max(...points.map(p=>p.y))+margin-top);
   canvas.style.left=left+'px';canvas.style.top=top+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);canvas.dataset.prepareMs=String(Math.round(performance.now()-began));canvas.dataset.prepared=String(!!cached);document.body.append(canvas);
   const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
   source.style.visibility='hidden';sourceHidden=true;
   const tick=(now:number)=>{
    if(done)return;if(!source.isConnected||!destination.isConnected||signal?.aborted||document.hidden){cancel();return;}
    try{
    // Begin on the first display frame, after all batch canvases have been installed.
    start??=now;const ms=Math.min(timing.duration,now-start);
    if(ms>=timing.arriveAt&&destination.matches('.card')&&!targetHidden){destination.style.visibility='hidden';targetHidden=true;}
    ctx.resetTransform();ctx.clearRect(0,0,canvas!.width,canvas!.height);ctx.setTransform(dpr,0,0,dpr,-left*dpr,-top*dpr);
    draw(ctx,ms>=timing.arriveAt?returned:material,0,ms,project(source),arrival());
    canvas!.dataset.phase=ms<timing.breakAt?'charge':ms<timing.joinAt?'fracture':ms<timing.arriveAt?'flight':'reform';
    if(ms===timing.duration)finish(true);else raf=SPECIAL_FX.requestFrame(tick);
    }catch(error){console.warn('[mana-destruction] Render failed',error);cancel();}
   };raf=SPECIAL_FX.requestFrame(tick);
  }).catch(cancel);
 });
}
