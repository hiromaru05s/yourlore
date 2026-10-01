import {cardEl} from '../../../ui/cardView';
import {effectChoices} from '../../../shared/engine';
import type {GameState} from '../../../shared/types';
import {card} from './fixtures';
import {attach,dispose,freezeSurface,type Surface} from './surface';
import {drawSummon} from './first-materials';
import {drawTransferSource,glide,type TransferHooks} from './transfer-player';
import {effectValues,type EffectFixture} from './effect-fixtures';
import assignments from './assignments.json';
const familyById=new Map(assignments.filter(e=>e.kind==='series').flatMap(e=>(e.cardIds||[]).map(id=>[id,e.id] as const)));
export function drawEffectSource(s:Surface,selected:string,variant:number,p:number,reduced:boolean){
 const family=familyById.get(selected);
 if(family)drawSummon(s,family,selected,variant,p,reduced);else drawTransferSource(s,variant,reduced?0:p);
}
const rect=(node:HTMLElement|null)=>node?.getBoundingClientRect();
const uidNode=(root:HTMLElement,uid:string)=>root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`);
const presentCards=(g:GameState)=>g.players.flatMap(p=>[...p.field,...p.enchants.map(e=>e.card),...(p.quests||[]).map(q=>q.card)]);
async function animate(nodes:HTMLElement[],variant:number,h:TransferHooks,mode:'in'|'out'|'number'='number'){
 const animations:Animation[]=[];
 try{
  const duration=h.reduced?90:mode==='number'?480:620;
  nodes.forEach((node,i)=>{
   const sign=mode==='out'?-1:1,delay=h.reduced?0:variant===1?i*35:Math.abs(i-(nodes.length-1)/2)*45;
   // These transforms move the actual printed card/panel/number, preserving art,
   // text and its projected board plane. No detached decorative particles.
   const keys:Keyframe[]=variant===1?
    [{translate:mode==='out'?'0 0':`0 ${sign*8}px`,rotate:mode==='number'?'x -52deg':'x -16deg',scale:'1 .92'},{translate:'0 -2px',rotate:'x 3deg',scale:'1 1.015',offset:.7},{translate:'0 0',rotate:'x 0deg',scale:'1 1'}]:
    [{translate:`${(i%2?1:-1)*sign*(mode==='number'?5:15)}px 0`,rotate:mode==='number'?'y 42deg':'y 20deg',scale:'.9 1'},{translate:'0 0',rotate:'y -3deg',scale:'1.02 1',offset:.74},{translate:'0 0',rotate:'y 0deg',scale:'1 1'}];
   if(mode==='out')keys.reverse();
   animations.push(node.animate(h.reduced?[{opacity:1},{opacity:1}]:keys,{duration,delay,easing:'cubic-bezier(.22,.7,.22,1)',fill:'none'}));
  });
  const abort=()=>animations.forEach(a=>a.cancel());h.signal.addEventListener('abort',abort,{once:true});
  try{await Promise.all(animations.map(a=>a.finished.catch(()=>{})));}finally{h.signal.removeEventListener('abort',abort);}
 }finally{animations.forEach(a=>a.cancel());}
}
async function materialMotion(s:Surface,f:EffectFixture,h:TransferHooks,departing:boolean){
 let frame=0;const start=performance.now(),length=h.reduced?100:680;
 await new Promise<void>((resolve,reject)=>{
  const finish=()=>{cancelAnimationFrame(frame);h.signal.removeEventListener('abort',finish);resolve();};h.signal.addEventListener('abort',finish,{once:true});
  const tick=(now:number)=>{try{if(!h.valid()||h.signal.aborted){finish();return;}const p=Math.min(1,(now-start)/length);drawEffectSource(s,s.card.dataset.cardId||f.selected,h.variant,p*(departing?.6:1),h.reduced);if(p>=1)finish();else frame=requestAnimationFrame(tick);}catch(e){h.signal.removeEventListener('abort',finish);reject(e);}};frame=requestAnimationFrame(tick);
 });
}
async function choices(g:GameState,h:TransferHooks){
 const pending=g.pending;if(!pending)return;
 const ids=pending.kind==='giantShop'?((pending.data?.ids||[]) as string[]):effectChoices(g).map(c=>c.id);
 if(!ids.length)return;
 const tray=document.createElement('div');tray.className='b-r3-choice';tray.style.cssText='position:fixed;left:12%;right:12%;bottom:8%;z-index:130;padding:8px;background:#f5f0e4f5;border:1px solid #85765c;border-radius:8px;display:flex;gap:8px;overflow:auto;box-shadow:0 6px 20px #0003';
 tray.setAttribute('aria-label',pending.hintJa||'実際の選択候補');
 for(const id of ids.slice(0,8)){const n=cardEl(card(id,`bchoice-${id}`),{size:'mkt'});n.style.cssText='flex:0 0 66px;width:66px;height:99px;--cw:66px;--ch:99px';tray.append(n);}
 document.body.append(tray);
 try{await Promise.all([...tray.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));await animate([...tray.children] as HTMLElement[],h.variant,h,'in');}
 finally{tray.remove();}
}
function changedSeals(f:EffectFixture,before:GameState,after:GameState,root:HTMLElement){
 const a=effectValues(before),b=effectValues(after),nodes=new Set<HTMLElement>();
 const add=(s:string)=>root.querySelectorAll<HTMLElement>(s).forEach(n=>nodes.add(n));
 for(const side of [0,1]){
  const suffix=side===0?'me':'opp',portrait=side===0?'portraitMe':'portraitOpp';
  if(a[side].hp!==b[side].hp)add(`#hp-${suffix}`);
  if(a[side].dew!==b[side].dew)add(`#dew-${suffix}`);
  if(a[side].mana!==b[side].mana||a[side].maxMana!==b[side].maxMana)add(`#${portrait} .pt-mana`);
  for(const m of b[side].field){const old=a[side].field.find(x=>x.uid===m.uid);if(!old)continue;const node=uidNode(root,m.uid);if(!node)continue;
   if(old.atk!==m.atk)node.querySelectorAll<HTMLElement>('.ad-atk').forEach(n=>nodes.add(n));
   if(old.hp!==m.hp||old.max!==m.max)node.querySelectorAll<HTMLElement>('.ad-def').forEach(n=>nodes.add(n));
   if(old.counter!==m.counter||JSON.stringify(old.passives)!==JSON.stringify(m.passives))node.querySelectorAll<HTMLElement>('.card-status').forEach(n=>nodes.add(n));
  }
  for(const e of b[side].enchants){const old=a[side].enchants.find(x=>x.uid===e.uid);if(old&&(old.count!==e.count||old.turns!==e.turns)){const n=uidNode(root,e.uid);if(n)nodes.add(n);}}
  if(JSON.stringify(a[side].quest)!==JSON.stringify(b[side].quest)){for(const q of (after.players[side].quests||[])){const n=uidNode(root,q.card.uid);if(n)nodes.add(n);}}
 }
 if(['A072','A151'].includes(f.cue))add('.card-cost,.card-play-cost,.refresh-btn');
 if(f.cue==='A149')add('#refreshBtn,.market-sub--supply');
 return [...nodes];
}
export async function playEffect(f:EffectFixture,h:TransferHooks,stepChanged:(index:number)=>void){
 for(const [index,step] of f.steps.entries()){
  if(!h.valid()||h.signal.aborted)return;stepChanged(index);h.phase(`${index+1}/${f.steps.length} · ${step.label}`);
  h.bridge.render(h.view,structuredClone(step.before));await h.stable();if(!h.valid())return;h.bridge.claim();
  const source=uidNode(h.root,f.sourceUid)||h.root.querySelector<HTMLElement>(`.card[data-card-id="${f.selected}"]`),sourceRect=rect(source)||h.root.querySelector<HTMLElement>(f.owner===0?'#portraitMe':'#portraitOpp')!.getBoundingClientRect();
  const oldCards=presentCards(step.before),newCards=presentCards(step.after);
  const departing=oldCards.filter(c=>!newCards.some(n=>n.uid===c.uid));
  const material:Surface[]=[];
  try{
   if(source?.querySelector('.card-art img')){
    const s=attach(source);material.push(s);await materialMotion(s,f,h,departing.some(c=>c.uid===source.dataset.uid));
   }
   if(!h.valid())return;
   if(f.cue==='A131'){for(const c of step.before.players[f.owner].hand.filter(c=>['GRAPE','GRAPE2'].includes(c.id)&&step.after.players[f.owner].discard.some(n=>n.uid===c.uid))){const node=uidNode(h.root,c.uid);if(node){node.style.visibility='hidden';try{await glide(c,node.getBoundingClientRect(),sourceRect,h);}finally{node.style.visibility='';}}}}
   if(['A147','A148'].includes(f.cue))await animate([...h.root.querySelectorAll<HTMLElement>(`${f.cue==='A148'?'#fixedMarket':'#supplyMarket'} .card`)],h.variant,h,'out');
   for(const event of step.events)if(event.type==='attack'){const s=material.find(s=>s.card.dataset.uid===event.uid);if(s)await freezeSurface(s);await h.bridge.attack(event.uid,event.player,event.targetUid,h.signal,h.reduced);}
   for(const c of departing){
    if(!h.valid())return;const n=uidNode(h.root,c.uid);if(!n)continue;
    const side=step.before.players.findIndex(p=>p.field.some(m=>m.uid===c.uid)||p.enchants.some(e=>e.card.uid===c.uid)||(p.quests||[]).some(q=>q.card.uid===c.uid));
    const destroyed=step.events.some(e=>e.type==='destroy'&&e.uid===c.uid)||step.after.players[side].discard.some(x=>x.uid===c.uid)||step.after.players[side].removed?.some(x=>x.uid===c.uid);
    if(destroyed){const s=material.find(s=>s.card===n);if(s)await freezeSurface(s);await h.bridge.destroy(c.uid,side,!!step.after.players[side].removed?.some(x=>x.uid===c.uid),h.signal,h.reduced);}
   }
  }finally{material.forEach(dispose);}
  if(!h.valid())return;
  h.bridge.render(h.view,structuredClone(step.after));await h.stable();if(!h.valid())return;h.bridge.claim();
  const added=newCards.filter(c=>!oldCards.some(n=>n.uid===c.uid));
  const hidden:HTMLElement[]=[];
  try{
   for(const c of added){const n=uidNode(h.root,c.uid);if(n){n.style.visibility='hidden';hidden.push(n);}}
   for(const c of added){if(!h.valid())return;const n=uidNode(h.root,c.uid);if(!n)continue;await glide(c,sourceRect,n.getBoundingClientRect(),h);if(h.valid())n.style.visibility='';}
   // Purchases/rewards are real acquired cards, with the real destination pile.
   for(const side of [0,1]){
    const p0=step.before.players[side],p1=step.after.players[side];
    const earned=p1.hand.filter(c=>!p0.hand.some(x=>x.uid===c.uid)&&!p0.deck.some(x=>x.uid===c.uid)&&!p0.discard.some(x=>x.uid===c.uid));
    const bought=p1.discard.filter(c=>!p0.discard.some(x=>x.uid===c.uid)&&!oldCards.some(x=>x.uid===c.uid)&&!p0.hand.some(x=>x.uid===c.uid));
    for(const [zone,list] of [['hand',earned],['shelf',bought]] as const){for(const c of list){if(!h.valid())return;const to=h.root.querySelector<HTMLElement>(zone==='hand'?(side===0?'#hand':'#oppHand'):(side===0?'#pile-myDisc':'#pile-oppDisc'));if(!to)continue;const target=to.getBoundingClientRect();const from=p0.removed?.some(x=>x.uid===c.uid)?h.root.querySelector<HTMLElement>(side===0?'#rift-me':'#rift-opp')!.getBoundingClientRect():sourceRect;await glide(c,from,new DOMRect(target.x+target.width/2-24,target.y,48,72),h);}}
   }
   if(['A147','A148'].includes(f.cue))await animate([...h.root.querySelectorAll<HTMLElement>(`${f.cue==='A148'?'#fixedMarket':'#supplyMarket'} .card`)],h.variant,h,'in');
   await animate(changedSeals(f,step.before,step.after,h.root),h.variant,h);
   if(h.valid())await choices(step.after,h);if(h.valid())h.bridge.restore();
  }finally{hidden.forEach(n=>n.style.visibility='');}
 }
}
