import type {GameState} from '../shared/types';
import {cardFrameId,frameMaterial,isCardFrame} from '../shared/cardFrames';
import {CardFrameMaterial} from './cardFrameMaterial';
const ownership=new Map<string,string>();
let local='default';
export const localCardFrame=()=>local;
export const setLocalCardFrame=(id?:string)=>{local=cardFrameId(id);};
export const frameForCard=(uid:string)=>ownership.get(uid)??'default';
export function clearCardFrameContext(){ownership.clear();local='default';}
/** Keep departed UIDs for exit effects. Offers/hidden opponent identities are never inspected. */
export function syncCardFrames(g:GameState,you=0){
 for(const side of [0,1] as const){const p=g.players[side],id=cardFrameId(g.frames?.[side]??(side===you?local:'default'));
  const cards=[...p.deck,...p.hand,...p.discard,...p.field,...(p.removed??[]),...p.exile.map(x=>x.card),...p.traps.map(x=>x.card),...p.enchants.map(x=>x.card),...(p.quests??[]).map(x=>x.card)];
  for(const c of cards)if(c.uid)ownership.set(c.uid,id);
 }
}
/** Purchase reveal uses the new instance UID; never coat an unbought market offer. */
export function rememberCardFrame(uid:string,id?:string){ownership.set(uid,cardFrameId(id));}
interface Entry {node:HTMLElement;id:string;ready:Promise<void>;connected:boolean;created:number;cancelled:boolean;layers:HTMLCanvasElement[];}
const entries=new Map<HTMLElement,Entry>();
let renderer:CardFrameMaterial|undefined,mutation:MutationObserver|undefined,raf=0,last=0;
const motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
const now=()=>motion?.matches?1.5:performance.now()/1000;
function stop(){cancelAnimationFrame(raf);raf=0;}
function wake(){stop();if(entries.size&&!document.hidden)raf=requestAnimationFrame(tick);}
function release(){if(entries.size)return;stop();mutation?.disconnect();mutation=undefined;renderer?.dispose();renderer=undefined;document.removeEventListener('visibilitychange',wake);motion?.removeEventListener('change',wake);}
function detach(e:Entry){e.cancelled=true;for(const layer of e.layers){const part=layer.parentElement;if(part)renderer?.detach(part);}entries.delete(e.node);release();}
function tick(t:number){raf=0;if(document.hidden)return;
 for(const e of entries.values()){
  if(e.node.isConnected)e.connected=true;
  // Borrowed print layers can remain live while their original interaction owner is detached.
  if(!e.node.isConnected&&!e.layers.some(c=>c.isConnected)&&(e.connected||t-e.created>10000))detach(e);
 }
 if(t-last>=1000/24||motion?.matches){renderer?.draw(now());last=t;}
 if(entries.size&&!motion?.matches)raf=requestAnimationFrame(tick);
}
function install(){if(mutation)return;renderer=new CardFrameMaterial();
 mutation=new MutationObserver(records=>{
  for(const record of records)for(const added of record.addedNodes){if(!(added instanceof HTMLElement))continue;
   for(const node of [ ...(added.matches('[data-card-frame]')?[added]:[]),...added.querySelectorAll<HTMLElement>('[data-card-frame]')]){
    if(node.dataset.cardFrameBorrowed==='true')continue;
    if(!entries.has(node)){attachCardFrame(node,node.dataset.uid??'',node.dataset.cardFrame);}
    else if(node.isConnected&&!entries.get(node)!.connected){entries.get(node)!.connected=true;}
   }
  }
  wake();
 });mutation.observe(document.body,{childList:true,subtree:true});document.addEventListener('visibilitychange',wake);motion?.addEventListener('change',wake);
}
/** Called by the shared public-face builder. Resolves once the material has real pixels. */
export function attachCardFrame(node:HTMLElement,uid:string,explicit?:string):Promise<void>{
 const id=cardFrameId(explicit??frameForCard(uid)),previous=entries.get(node);
 if(previous?.id===id)return previous.ready;
 if(previous)detach(previous);
 if(!isCardFrame(id)){delete node.dataset.cardFrame;return Promise.resolve();}
 node.dataset.cardFrame=id;install();
 const e:Entry={node,id,ready:Promise.resolve(),connected:node.isConnected,created:performance.now(),cancelled:false,layers:[]};entries.set(node,e);
 // Wait one microtask for the builder to append/finish spell and quest frame styles.
 e.ready=Promise.resolve().then(()=>renderer?.attach(node,frameMaterial(id)!,()=>!e.cancelled)).then(()=>{
  if(e.cancelled)return;e.layers=[...node.querySelectorAll<HTMLCanvasElement>('.card-frame-material')];renderer?.draw(now(),true);wake();
 }).catch(error=>{if(!e.cancelled)console.warn('Card frame could not be prepared',error);});
 wake();return e.ready;
}
export async function ensureCardFrameReady(node:HTMLElement):Promise<void>{
 if(node.dataset.cardFrameBorrowed==='true')return;
 const id=node.dataset.cardFrame??frameForCard(node.dataset.uid??'');
 if(isCardFrame(id))await attachCardFrame(node,node.dataset.uid??'',id);
}
export function disposeCardFrames(root?:HTMLElement){for(const e of [...entries.values()])if(!root||root===e.node||root.contains(e.node))detach(e);}
