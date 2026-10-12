import {destroyAnim,exileCard,exileGeneratedCards,absorbIntoRift,discardFromHand,animateReshuffle} from '../../../ui/anim';
import {moveOnBoard} from '../../../ui/boardMotion';import {cardEl} from '../../../ui/cardView';
import type {CardInst,PlayerState,Side} from '../../../shared/types';import type {Fixture} from './fixture';
export const allCards=(p:PlayerState):CardInst[]=>[...p.hand,...p.deck,...p.discard,...p.field,...(p.removed||[]),...p.enchants.map(e=>e.card),...p.traps.map(e=>e.card),...(p.quests||[]).map(q=>q.card)];
export function needsEndpoint(f:Fixture){return f.events.some(e=>e.type==='destroy'||e.type==='reshuffle')||f.after.players.some((p,s)=>p.removed?.some(c=>!f.before.players[s].removed?.some(x=>x.uid===c.uid))||p.discard.some(c=>f.before.players[s].removed?.some(x=>x.uid===c.uid)||c.uid!==f.source.uid&&f.before.players[s].hand.some(x=>x.uid===c.uid)));}
function freezeCanvases(node:HTMLElement){for(const canvas of node.querySelectorAll('canvas')){const image=new Image();image.src=canvas.toDataURL();image.style.cssText=canvas.style.cssText;image.className='d3-frozen-material';canvas.replaceWith(image);}}
async function proxy(card:CardInst,origin:Element|null){if(!origin)return null;const r=origin.getBoundingClientRect(),el=cardEl(card,{size:'hand',fullArt:true});const w=Math.max(60,Math.min(90,r.width)),h=w/0.64;el.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;z-index:183;transform-origin:0 0;transform:translate(${r.x}px,${r.y}px);pointer-events:none`;el.dataset.r3Endpoint='1';document.body.append(el);await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));return el;}
async function batches<T>(items:T[],run:(item:T)=>Promise<void>){for(let i=0;i<items.length;i+=3)await Promise.all(items.slice(i,i+3).map(run));}
export async function finishEndpoints(f:Fixture,floating:HTMLElement|null,find:(uid:string)=>HTMLElement|null,phase:(value:string)=>void,item:string){
 const destroyed=new Set<string>();
 for(const e of f.events){if(e.type!=='destroy'||destroyed.has(e.uid))continue;destroyed.add(e.uid);const removed=f.after.players[e.player].removed?.some(c=>c.uid===e.uid)??false;phase(removed?'破壊確定 → 既存の虚無退場':'破壊確定 → 既存の墓地退場');const target=find(e.uid);if(target)freezeCanvases(target);await destroyAnim(e.uid,e.player===0?'me':'opp',removed);}
 for(const s of [0,1]as Side[]){
  const before=f.before.players[s],after=f.after.players[s],previous=new Set((before.removed||[]).map(c=>c.uid));const newRemoved=(after.removed||[]).filter(c=>!previous.has(c.uid)&&!destroyed.has(c.uid));const known=new Set(f.before.players.flatMap(allCards).map(c=>c.uid));const generated:CardInst[]=[],existing:CardInst[]=[];
  for(const c of newRemoved){const isSource=c.uid===f.source.uid||(f.sourceZone==='market'&&c.id===f.source.id);if(isSource&&floating){phase('同じカード面を既定リフトへ引き渡す');floating.style.visibility='visible';await absorbIntoRift(floating,s===0?'me':'opp');floating.style.visibility='hidden';}else if(!known.has(c.uid))generated.push(c);else existing.push(c);}
  await batches(existing,async c=>{
   phase('元のゾーンから既定リフトへ');let source=find(c.uid),standIn:HTMLElement|null=null;
   if(!source){const owner=f.before.players.findIndex(p=>allCards(p).some(x=>x.uid===c.uid)) as Side,p=f.before.players[owner],prefix=owner===0?'my':'opp';const selector=p.removed?.some(x=>x.uid===c.uid)?`#rift-${owner===0?'me':'opp'}`:p.deck.some(x=>x.uid===c.uid)?`#pile-${prefix}Deck`:p.hand.some(x=>x.uid===c.uid)?(owner===0?'#hand':'#oppHand'):`#pile-${prefix}Disc`;standIn=await proxy(c,document.querySelector(selector));source=standIn;}
   if(source)freezeCanvases(source);try{await exileCard(c,s===0?'me':'opp',source);}finally{standIn?.remove();}
  });
  if(generated.length){phase(`新規生成 ${generated.length}枚 → 既定リフト`);await exileGeneratedCards(generated,s===0?'me':'opp',floating?.getBoundingClientRect());}
  const returned=after.discard.filter(c=>before.removed?.some(x=>x.uid===c.uid));
  await batches(returned,async c=>{phase('リフトから同じカードを墓地へ戻す');const el=await proxy(c,document.querySelector(`#rift-${s===0?'me':'opp'}`)),target=document.querySelector<HTMLElement>(`#pile-${s===0?'my':'opp'}Disc`);if(!el||!target){el?.remove();return;}const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4500);try{const moved=await moveOnBoard({kind:'arrival',target,card:el,signal:abort.signal});if(!moved){const r=target.getBoundingClientRect();await el.animate([{transform:el.style.transform},{transform:`translate(${r.x}px,${r.y}px) scale(.55)`}],{duration:650,fill:'forwards',easing:'ease-in-out'}).finished;}}finally{clearTimeout(timer);abort.abort();el.remove();}});
  if(item==='A144'){for(const c of before.hand.filter(c=>c.uid!==f.source.uid&&after.discard.some(x=>x.uid===c.uid))){phase('手札から墓地へ');await discardFromHand(c,s===0?'me':'opp');}}
 }
 for(const e of f.events)if(e.type==='reshuffle'){phase(`墓地${e.count}枚をデッキへ再構築`);await animateReshuffle(e.player===0?'me':'opp',e.count);}
}
