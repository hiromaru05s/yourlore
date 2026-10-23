import {SPECIAL_FX} from '../animationTempo';
import type {GameState} from '../../shared/types';
import {getLang} from '../../i18n';
import type {MarketCrashIris,Target,Rect} from './renderer';
import './style.css';

export function crashTurn(g:GameState):string|null {
 return !g.over && g.players[g.cur].refreshBlockTurn ? `${g.turn}:${g.cur}` : null;
}
export function crashReason(offer:boolean):string {
 const lang=getLang();
 return lang==='ja' ? offer?'マーケット・クラッシュにより、このターンは提示が最大2枚になります。':'マーケット・クラッシュにより、このターンは提示を更新できません。'
  :lang==='en' ? offer?'Market Crash limits this turn’s offer to at most 2 cards.':'Market Crash prevents refreshing the offer this turn.'
  :offer?'마켓 크래시로 이번 턴의 제시는 최대 2장입니다.':'마켓 크래시로 이번 턴에는 제시를 갱신할 수 없습니다.';
}
let serial=0;
/** One owner per GameView. The active player's public state, never the cast, owns this effect. */
export class MarketCrashPresentation {
 private key:string|null=null;private seen=false;private dead=false;private start=0;private end:number|null=null;
 private frame=0;private generation=0;private loading=false;private failed=false;
 private stage?:MarketCrashIris;private canvas?:HTMLCanvasElement;private targets:Target[]=[];
 private hits:HTMLButtonElement[]=[];private tooltip?:HTMLDivElement;private tipId=`market-crash-reason-${++serial}`;
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private observer:ResizeObserver;
 constructor(private root:HTMLElement){
  this.observer=new ResizeObserver(this.redraw);
  window.addEventListener('resize',this.redraw);window.addEventListener('lore:layout',this.redraw);
  document.addEventListener('visibilitychange',this.visibility);document.addEventListener('pointerdown',this.outside);
  this.motion.addEventListener('change',this.redraw);
 }
 sync(g:GameState){
  if(this.dead)return;
  const key=crashTurn(g),now=SPECIAL_FX.now();
  if(key!==this.key){
   if(key){this.start=this.seen?now:now-1600;this.end=null;this.failed=false;}
   else if(this.key){this.end=now;this.hideTip();}
   this.key=key;
  }
  this.seen=true;
  this.observer.disconnect();
  if(key){
   const supply=this.root.querySelector<HTMLElement>('#supplyMarket');
   const bay=supply?.lastElementChild as HTMLElement|null;
   // Only the reserved empty slot is covered. Bought cards may leave other empty slots.
   if(bay && !bay.matches('.card[data-uid]')){bay.classList.add('market-crash-slot');bay.dataset.label='';bay.setAttribute('aria-label',crashReason(true));}
   const refresh=this.root.querySelector<HTMLButtonElement>('#refreshBtn');
   if(refresh){refresh.disabled=true;refresh.removeAttribute('title');refresh.setAttribute('aria-label',crashReason(false));}
   this.mountHits();this.hideTip();
   for(const node of [bay,refresh])if(node)this.observer.observe(node);
   this.ensureStage();
  }else for(const hit of this.hits)hit.hidden=true;
  this.redraw();
 }
 private mountHits(){
  if(this.hits.length)return;
  const tip=document.createElement('div');tip.className='market-crash-tooltip';tip.id=this.tipId;tip.role='tooltip';tip.hidden=true;document.body.append(tip);this.tooltip=tip;
  this.hits=[true,false].map(offer=>{
   const hit=document.createElement('button');hit.type='button';hit.className='market-crash-hit';hit.dataset.target=offer?'offer':'refresh';hit.hidden=true;
   const show=()=>{if(!this.key)return;tip.textContent=crashReason(offer);tip.hidden=false;hit.setAttribute('aria-describedby',this.tipId);this.placeTip(hit);};
   hit.onpointerenter=show;hit.onpointerleave=this.hideTip;hit.onfocus=show;hit.onblur=this.hideTip;hit.onclick=show;
   hit.onkeydown=e=>{if(e.key==='Escape')this.hideTip();};document.body.append(hit);return hit;
  });
 }
 private placeTip(hit:HTMLElement){if(!this.tooltip)return;const r=hit.getBoundingClientRect(),tip=this.tooltip;
  tip.style.left=`${Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))}px`;
  tip.style.top=`${Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,r.bottom+10))}px`;
 }
 private hideTip=()=>{if(this.tooltip)this.tooltip.hidden=true;for(const h of this.hits)h.removeAttribute('aria-describedby');};
 private outside=(e:Event)=>{if(!this.hits.some(h=>h.contains(e.target as Node)))this.hideTip();};
 private ensureStage(){
  if(this.stage||this.loading||this.failed||this.dead||!this.key||document.hidden)return;
  const generation=++this.generation;this.loading=true;
  void import('./renderer').then(({MarketCrashIris})=>{
   if(this.dead||generation!==this.generation||!this.key||document.hidden)return;
   const canvas=document.createElement('canvas');canvas.className='market-crash-canvas';canvas.setAttribute('aria-hidden','true');
   const stage=new MarketCrashIris(canvas);this.canvas=canvas;this.stage=stage;document.body.append(canvas);
   canvas.addEventListener('webglcontextlost',this.contextLost,{once:true});
   // Loading never consumes the entrance motion; reconnection restores the settled pose.
   if(SPECIAL_FX.now()-this.start<1600)this.start=SPECIAL_FX.now();
  }).catch(()=>{this.failed=true;}).finally(()=>{
   if(generation!==this.generation)return;this.loading=false;this.redraw();
  });
 }
 private measure(){
  if(!this.key)return;
  const bay=this.root.querySelector<HTMLElement>('.market-crash-slot'),refresh=this.root.querySelector<HTMLElement>('#refreshBtn');
  const rect=(n:HTMLElement):Rect=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};};
  this.targets=[];
  for(const [i,node]of [bay,refresh].entries()){
   const hit=this.hits[i];if(!hit)continue;
   hit.hidden=!node||document.hidden;if(!node)continue;const r=rect(node);hit.hidden ||=r.w===0||r.h===0;
   hit.style.left=`${r.x-r.w/2}px`;hit.style.top=`${r.y-r.h/2}px`;hit.style.width=`${r.w}px`;hit.style.height=`${r.h}px`;
   hit.setAttribute('aria-label',crashReason(i===0));hit.classList.toggle('market-crash-fallback',this.failed);
   this.targets.push({rect:r,small:i===1});
   if(hit.hasAttribute('aria-describedby'))this.placeTip(hit);
  }
 }
 private redraw=()=>{
  if(this.dead||document.hidden)return;
  if(!this.root.isConnected){this.dispose();return;}
  if(!this.key&&this.end===null)return;
  this.measure();const now=SPECIAL_FX.now();
  if(this.end!==null&&(this.motion.matches||now-this.end>=1300)){this.end=null;this.dropStage();return;}
  const time=this.end===null?800+Math.min(1600,now-this.start):4600+now-this.end;
  try{this.stage?.draw(this.targets,time,innerWidth,innerHeight,this.motion.matches);}catch{this.dropStage();this.failed=true;this.measure();}
  if((this.end!==null||(!this.motion.matches&&now-this.start<1600))&&!this.frame)this.frame=SPECIAL_FX.requestFrame(this.tick);
 };
 private tick=()=>{this.frame=0;this.redraw();};
 private visibility=()=>{
  if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.hideTip();this.hits.forEach(h=>h.hidden=true);this.dropStage();}
  else {this.ensureStage();this.redraw();}
 };
 private contextLost=(e:Event)=>{e.preventDefault();this.dropStage();this.failed=true;this.redraw();};
 private dropStage(){this.canvas?.removeEventListener('webglcontextlost',this.contextLost);++this.generation;this.loading=false;this.stage?.dispose();this.stage=undefined;this.canvas?.remove();this.canvas=undefined;}
 dispose(){
  if(this.dead)return;this.dead=true;cancelAnimationFrame(this.frame);this.frame=0;this.dropStage();this.observer.disconnect();
  this.tooltip?.remove();this.hits.forEach(h=>h.remove());this.hits=[];
  window.removeEventListener('resize',this.redraw);window.removeEventListener('lore:layout',this.redraw);document.removeEventListener('visibilitychange',this.visibility);document.removeEventListener('pointerdown',this.outside);this.motion.removeEventListener('change',this.redraw);
 }
}
