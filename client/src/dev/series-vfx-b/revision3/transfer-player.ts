import {cardEl} from '../../../ui/cardView';
import type {NativeBridge} from './native-bridge';
import type {GameView} from '../../../ui/boardView';
import type {CardInst} from '../../../shared/types';
import {begin,native,smooth,type Surface} from './surface';
import type {TransferFixture} from './transfer-fixtures';
export function drawTransferSource(s:Surface,variant:number,p:number){
 const c=begin(s);native(s);c.restore();
 // A physical card stock cue, intentionally applied to its whole frame. It is
 // not a claim that the person's skin or the painted background becomes liquid.
 const pressure=Math.sin(Math.PI*smooth(.05,.85,p));
 s.card.style.rotate=variant===1?`x ${pressure*5}deg`:s.previousRotate;s.card.style.translate=variant===2?`0 ${pressure*1.5}px`:s.previousTranslate;
}
export type TransferHooks={view:GameView;root:HTMLElement;owner:0|1;variant:number;reduced:boolean;valid:()=>boolean;stable:()=>Promise<void>;phase:(value:string)=>void;signal:AbortSignal;bridge:NativeBridge};
export async function glide(card:CardInst,from:DOMRect,to:DOMRect,h:TransferHooks){
 if(!h.valid()||h.signal.aborted)return;
 const ghost=cardEl(card,{size:'mkt'}),w=Math.max(40,to.width),height=Math.max(60,to.height);
 ghost.classList.add('b-r3-transfer');ghost.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${height}px;--cw:${w}px;--ch:${height}px;z-index:125;pointer-events:none;transform-origin:50% 90%;`;
 document.body.append(ghost);await Promise.all([...ghost.querySelectorAll<HTMLImageElement>('img')].map(i=>i.decode().catch(()=>{})));
 const length=h.reduced?150:h.variant===1?1050:980,start=performance.now();let frame=0;
 try{
  await new Promise<void>(resolve=>{
   const finish=()=>{cancelAnimationFrame(frame);h.signal.removeEventListener('abort',finish);resolve();};h.signal.addEventListener('abort',finish,{once:true});
   const tick=(now:number)=>{
    if(!h.valid()||h.signal.aborted){finish();return;}
    const p=Math.min(1,(now-start)/length),travel=smooth(.08,.84,p),land=smooth(.78,1,p),lift=h.reduced?0:Math.sin(Math.PI*travel)*(h.variant===1?28:9);
    const x=from.x+(from.width-w)/2+(to.x-from.x-(from.width-w)/2)*travel,y=from.y+(from.height-height)/2+(to.y-from.y-(from.height-height)/2)*travel-lift;
    const tilt=h.reduced?0:h.variant===1?-65*(1-smooth(.18,.78,p)):8*Math.sin(Math.PI*travel)*(1-land),yaw=h.reduced?0:h.variant===2?60*(1-travel):0;
    ghost.style.transform=`translate3d(${x}px,${y}px,0) perspective(550px) rotateX(${tilt}deg) rotateY(${yaw}deg) rotateZ(${h.variant===2?-5*(1-travel):0}deg)`;
    ghost.style.boxShadow=`${lift*.16}px ${3+lift*.35}px ${3+lift*.22}px #17181b48`;
    if(p>=1)finish();else frame=requestAnimationFrame(tick);
   };frame=requestAnimationFrame(tick);
  });
 }finally{cancelAnimationFrame(frame);ghost.remove();}
}
export async function playTransfers(f:TransferFixture,h:TransferHooks){
 const source=h.root.querySelector<HTMLElement>(`.card[data-uid="${f.sourceUid}"]`),sourceRect=source?.getBoundingClientRect()||h.root.querySelector<HTMLElement>(h.owner===0?'#portraitMe':'#portraitOpp')!.getBoundingClientRect();
 const targets=new Map<string,DOMRect>();for(const e of f.events)if(e.type==='destroy'){const n=h.root.querySelector<HTMLElement>(`.card[data-uid="${e.uid}"]`);if(n)targets.set(e.uid,n.getBoundingClientRect());}
 if(f.returnedUid){
  const card=f.before.players[1-h.owner].field.find(m=>m.uid===f.returnedUid)!;
  const node=h.root.querySelector<HTMLElement>(`.card[data-uid="${f.returnedUid}"]`)!;
  const from=node.getBoundingClientRect(),destination=h.root.querySelector<HTMLElement>(h.owner===0?'#portraitOpp':'#hand')!;
  node.style.visibility='hidden';h.phase('選択したカードを持ち主の手札へ戻す');
  const target=destination.getBoundingClientRect(),to=new DOMRect(target.x+(target.width-from.width)/2,target.y+target.height*.4,from.width,from.height);
  try{await glide(card,from,to,h);}finally{node.style.visibility='';}
  if(h.valid()){h.bridge.render(h.view,structuredClone(f.after));await h.stable();}return;
 }

 for(const e of f.events)if(e.type==='destroy'){
  if(!h.valid())return;h.phase('元カードの破壊 · 既定墓地経路');
  await h.bridge.destroy(e.uid,e.player,f.after.players[e.player].removed?.some(c=>c.uid===e.uid)||false,h.signal,h.reduced);
 }
 if(!h.valid())return;
 h.bridge.render(h.view,structuredClone(f.after));await h.stable();if(!h.valid())return;
 h.bridge.claim();const receivers=f.events.filter((e):e is Extract<typeof e,{type:'summon'}>=>e.type==='summon');
 const hidden:HTMLElement[]=[];
 try{
  for(const e of receivers){const n=h.root.querySelector<HTMLElement>(`.card[data-uid="${e.uid}"]`);if(n){n.style.visibility='hidden';hidden.push(n);}}
  for(const e of receivers){
   if(!h.valid())return;const card=f.after.players[e.player].field.find(m=>m.uid===e.uid),node=h.root.querySelector<HTMLElement>(`.card[data-uid="${e.uid}"]`);if(!card||!node)continue;
   const origin=f.origins[e.uid],pile=origin==='deck'?(h.owner===0?'#pile-myDeck':'#pile-oppDeck'):origin==='shelf'?(h.owner===0?'#pile-myDisc':'#pile-oppDisc'):undefined;
   const from=pile?h.root.querySelector<HTMLElement>(pile)!.getBoundingClientRect():targets.values().next().value||sourceRect;
   h.phase(origin==='effect'?'効果から実カードが現れる':`${origin==='deck'?'デッキ':'墓地'}のカードが場へ現れる`);
   await glide(card,from,node.getBoundingClientRect(),h);if(h.valid())node.style.visibility='';
  }
 }finally{for(const node of hidden)node.style.visibility='';}
}
