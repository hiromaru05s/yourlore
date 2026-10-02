import {cardEl} from '../../../ui/cardView';
import type {CardInst,Side} from '../../../shared/types';import type {Fixture,Config} from './fixture';import {ease} from './material';
const pile=(s:Side,zone:string)=>document.querySelector<HTMLElement>(zone==='Rift'?`#rift-${s===0?'me':'opp'}`:`#pile-${s===0?'my':'opp'}${zone}`);
/** Two constructions for *departure preparation*, with the original endpoints owning travel. */
export class Handling {
 private cards:{el:HTMLElement;source:HTMLElement;side:Side;card:CardInst}[]=[];
 async prepare(f:Fixture,cfg:Config,find:(uid:string)=>HTMLElement|null){
  const entries:{card:CardInst;side:Side;source:HTMLElement|null}[]=[];
  if(cfg.item==='A019'||cfg.item==='A020')for(const [s,p]of f.before.players.entries())for(const c of p.removed||[])if(!(f.after.players[s].removed||[]).some(x=>x.uid===c.uid))entries.push({card:c,side:s as Side,source:pile(s as Side,'Rift')});
  if(cfg.item==='A144')for(const [s,p]of f.before.players.entries())for(const c of p.hand)if(c.uid!==f.source.uid&&f.after.players[s].discard.some(x=>x.uid===c.uid))entries.push({card:c,side:s as Side,source:find(c.uid)});
  if(cfg.item==='A145')for(const [s,p]of f.before.players.entries())for(const c of p.discard)entries.push({card:c,side:s as Side,source:pile(s as Side,'Disc')});
  for(const e of entries){if(!e.source)continue;const el=cardEl(e.card,{size:'hand',fullArt:true});el.dataset.r3Handling=e.card.uid;el.style.cssText='position:fixed;left:0;top:0;width:90px;height:140px;--cw:90px;--ch:140px;z-index:182;transform-origin:0 0;pointer-events:none;visibility:hidden';document.body.append(el);this.cards.push({...e,source:e.source,el});}
  await Promise.all(this.cards.flatMap(c=>[...c.el.querySelectorAll('img')].map(i=>i.decode())));
 }
 draw(time:number,variant:number,reduced:boolean){for(const [i,e]of this.cards.entries()){
  const u=ease(1400+i*65,2550+i*55,time)*(1-ease(2770,3380,time)),r=e.source.getBoundingClientRect(),lift=reduced?0:(variant===1?Math.sin(u*Math.PI)*18:u*12),spread=variant===1?i*3*u:(i-(this.cards.length-1)/2)*16*u;
  e.el.style.visibility=time>=1400+i*65&&time<3390?'visible':'hidden';const scale=Math.min(1,r.width/e.el.offsetWidth);e.el.style.transform=new DOMMatrix().translate(r.x+spread,r.y-lift).scale(scale).rotate(variant===1?-9*Math.sin(u*Math.PI):(i-(this.cards.length-1)/2)*7*u).toString();
 }}
 dispose(){for(const c of this.cards)c.el.remove();this.cards=[];}
}
