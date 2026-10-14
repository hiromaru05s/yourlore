import {FRAME_BACK} from '../../shared/cards';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
export const RUNE_REPLAY_RELEASE=980;
const active=new Map<HTMLElement,()=>void>();
type Source={saved:{translate:string;scale:string;filter:string;zIndex:string};lift:number;pulses:Map<symbol,number>};
const sources=new Map<HTMLElement,Source>();
function paintSource(el:HTMLElement,s:Source){const a=Math.max(0,...s.pulses.values());if(a===0){Object.assign(el.style,s.saved);return;}el.style.translate=`0 ${-s.lift*a}px`;el.style.scale=String(1+.075*a);el.style.filter=`brightness(${1+.1*a})`;el.style.zIndex='12';}
/** Selected 03: one face -> one back -> the same face. No bridge from the permanent. */
export function playRuneReplay(card:HTMLElement,uids:string[],side:'me'|'opp',signal:AbortSignal,onReplay:()=>Promise<boolean>):Promise<boolean>{
 active.get(card)?.();
 if(signal.aborted||document.hidden||!card.isConnected)return Promise.resolve(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,r=card.getBoundingClientRect();
 if(r.width<=0||r.height<=0)return Promise.resolve(false);
 const savedVisibility=card.style.visibility,key=Symbol('rune-replay'),release=reduced?180:RUNE_REPLAY_RELEASE;
 const nodes=[...new Set(uids)].map(uid=>document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`)).filter((n):n is HTMLElement=>!!n);
 for(const el of nodes){if(!sources.has(el)){const rect=el.getBoundingClientRect(),ratio=rect.height/Math.max(1,el.offsetHeight);sources.set(el,{saved:{translate:el.style.translate,scale:el.style.scale,filter:el.style.filter,zIndex:el.style.zIndex},lift:reduced?0:Math.min(7,rect.height*.075)/Math.max(.1,ratio),pulses:new Map()});}sources.get(el)!.pulses.set(key,0);}
 const layer=document.createElement('div');layer.className='rune-replay-layer';layer.setAttribute('aria-hidden','true');
 Object.assign(layer.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,pointerEvents:'none',zIndex:'136',perspective:'1400px'});
 const turn=document.createElement('div');turn.className='rune-replay-turn';Object.assign(turn.style,{position:'absolute',inset:'0',transformStyle:'preserve-3d',willChange:'transform'});layer.append(turn);
 const front=document.createElement('div'),back=document.createElement('div');for(const face of [front,back])Object.assign(face.style,{position:'absolute',inset:'0',backfaceVisibility:'hidden',webkitBackfaceVisibility:'hidden'});
 const clone=card.cloneNode(true) as HTMLElement;clone.removeAttribute('id');clone.removeAttribute('data-uid');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));clone.classList.remove('cast-reveal');
 Object.assign(clone.style,{position:'absolute',left:'0',top:'0',margin:'0',opacity:'1',visibility:'visible',transition:'none',animation:'none',transformOrigin:'0 0',transform:`scale(${r.width/Math.max(1,card.offsetWidth)},${r.height/Math.max(1,card.offsetHeight)})`});front.append(clone);
 const sleeve=document.querySelector(side==='me'?'#pile-myDeck .pile-card':'#pile-oppDeck .pile-card');
 const sleeveImage=sleeve?getComputedStyle(sleeve).backgroundImage:'';
 Object.assign(back.style,{inset:'3%',borderRadius:'7%',backgroundImage:sleeveImage&&sleeveImage!=='none'?sleeveImage:`url("${FRAME_BACK}")`,backgroundSize:'100% 100%',transform:'rotateY(180deg)'});
 turn.append(front,back);document.body.append(layer);card.style.visibility='hidden';
 return new Promise(resolve=>{
  let raf=0,done=false,replayed=false,replayDone=false,replayOK=false;const start=performance.now();
  const finish=(complete:boolean)=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(deadline);layer.remove();card.style.visibility=savedVisibility;signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);observer.disconnect();if(active.get(card)===abort)active.delete(card);for(const el of nodes){const s=sources.get(el);if(!s)continue;s.pulses.delete(key);paintSource(el,s);if(!s.pulses.size)sources.delete(el);}resolve(complete);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const observer=new MutationObserver(()=>{if(!card.isConnected)abort();});observer.observe(document.body,{childList:true,subtree:true});
  const deadline=setTimeout(abort,4500);active.set(card,abort);signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden||!card.isConnected){abort();return;}
   const t=now-start,a=ease(0,reduced?100:240,t)*(1-ease(release+100,release+460,t));
   for(const el of nodes){const s=sources.get(el);if(s){s.pulses.set(key,a);paintSource(el,s);}}
   if(!replayed){const q=ease(140,880,t),wave=Math.sin(Math.PI*q),u=r.width/124,press=ease(880,930,t)*(1-ease(930,980,t));turn.style.transform=reduced?'none':`translate3d(${14*wave*u}px,${(-30*wave+5*press)*u}px,${25*wave}px) rotateX(${-8*wave}deg) rotateY(${360*q}deg) rotateZ(${2.58*wave}deg) scale(${1+.03*wave-.025*press})`;front.style.filter=`drop-shadow(0 ${3+8*wave}px ${3+5*wave}px #14203540)`;back.style.boxShadow=`0 ${3+8*wave}px ${3+5*wave}px #14203540`;}
   if(t>=release&&!replayed){replayed=true;layer.remove();card.style.visibility=savedVisibility;void Promise.resolve().then(()=>done?false:onReplay()).then(ok=>{replayDone=true;replayOK=ok;},()=>{replayDone=true;replayOK=false;});}
   if(t>=release+460&&replayDone){finish(replayOK);return;}raf=requestAnimationFrame(frame);
  };frame(start);
 });
}
