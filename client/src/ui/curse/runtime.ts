import {SPECIAL_FX} from '../animationTempo';
import {DURATION,SPELL_LAND,stateAt,type Rect,type Layout} from './model';
import {placeSource} from './nativeCard';
import {cardEl} from '../cardView';
import {DB} from '../../shared/cards';
import type {createRenderer} from './renderer';
const active=new Map<HTMLElement,()=>void>();
export function warmCurse(){void Promise.all([import('./renderer'),import('./assets').then(m=>m.loadCurseAssets())]).catch(()=>{});}
export function cancelCurse(){for(const stop of [...active.values()])stop();}
export function playCurse(source:HTMLElement,side:'me'|'opp',signal?:AbortSignal,origin?:DOMRect,targetBefore?:number):Promise<boolean>{
 const own=document.querySelector<HTMLElement>(side==='me'?'#pile-myDisc':'#pile-oppDisc'),target=document.querySelector<HTMLElement>(side==='me'?'#pile-oppDisc':'#pile-myDisc');
 if(!own||!target||signal?.aborted||document.hidden)return Promise.resolve(false);
 active.get(target)?.();
 const rect=(el:Element):Rect=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};};
 const r=origin??source.getBoundingClientRect(),startRect={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
 const originals=[own,target].map(p=>({p,print:p.querySelector<HTMLElement>('.pile-print')!,count:p.querySelector<HTMLElement>('.pile-count')!,label:p.getAttribute('aria-label')}));
 const saved=originals.map(x=>({...x,children:[...x.print.childNodes],text:x.count.textContent??'0'}));
 const originalStyle=source.style.cssText,originalHidden=source.hidden,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return new Promise(resolve=>{
  let done=false,raf=0,start=0,renderer:ReturnType<typeof createRenderer>|undefined,canvas:HTMLCanvasElement|undefined,shown=-1,spent=false;
  const finish=(ok:boolean)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);
   if(active.get(target)===abort){active.delete(target);for(const x of saved){x.print.replaceChildren(...x.children);x.count.textContent=x.text;if(x.label===null)x.p.removeAttribute('aria-label');else x.p.setAttribute('aria-label',x.label);}}
   source.style.cssText=originalStyle;source.hidden=originalHidden;canvas?.remove();renderer?.dispose();resolve(ok);
  };
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const deadline=setTimeout(abort,12000);active.set(target,abort);signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
  const setPile=(i:number,n:number,id:string)=>{const x=saved[i];x.count.textContent=String((i===1&&targetBefore!==undefined?targetBefore:parseInt(x.text)||0)+n);x.print.replaceChildren(cardEl({...DB[id],uid:`curse-arrived-${i}`},{size:'hand',fullArt:true}));};
  const tick=(now:number)=>{
   if(done)return;if(signal?.aborted||!source.isConnected||!target.isConnected||!own.isConnected||document.hidden){abort();return;}
   try{
    const ms=Math.min(DURATION,now-start),targetRect=rect(saved[1].print),ownRect=rect(saved[0].print),row=document.querySelector(side==='me'?'#meRow .zone-mon':'#oppRow .zone-mon');
    const cw=Math.min(122,Math.max(74,innerWidth*.11)),layout:Layout={source:startRect,target:targetRect,ownGrave:ownRect,played:{x:innerWidth*.52,y:row?rect(row).y:innerHeight*(side==='me'?.6:.4),w:cw,h:cw*1.5}};
    placeSource(source,layout,ms);
    const deposited=stateAt({variant:0,ms}).deposited;
    if(deposited!==shown){shown=deposited;if(deposited)setPile(1,deposited,'CURSE');}
    if(!spent&&ms>=SPELL_LAND){spent=true;setPile(0,1,'BLACK_CURSE');}
    renderer!.draw(canvas!,{ms,variant:0,side:side==='me'?0:1,dark:false,reduced,concurrent:false,hideSource:true,skullOpacity:.45,pixelRatio:Math.min(2,devicePixelRatio),board:layout});
    canvas!.dataset.deposited=String(deposited);
    if(ms>=DURATION)finish(true);else raf=SPECIAL_FX.requestFrame(tick);
   }catch{abort();}
  };
  void Promise.all([import('./renderer'),import('./assets').then(m=>m.loadCurseAssets())]).then(([m,a])=>{
   if(done)return;renderer=m.createRenderer(a.faces,a.skull);
   canvas=document.createElement('canvas');canvas.className='curse-fx';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:145';const d=Math.min(2,devicePixelRatio);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);document.body.append(canvas);
   start=SPECIAL_FX.now();tick(start);
  }).catch(abort);
 });
}
