import {mountFixture,prepareDrawFixture,resetFixtureHands} from './fixture';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {animateDraw,ghostSummon,attackStrike,revealSpell,setFxSkip,setPlayOrigin} from '../../ui/anim';
import {summonFaceFactory} from '../../ui/summon/face';
import type {Kind} from './direction';
const fixture=mountFixture();
const {root,view,g,stopLayout}=fixture;
const post=(x:object)=>parent.postMessage({type:'cinematic-current',...x},location.origin);
let generation=0,active=Promise.resolve(),ready=false,kind:Kind='summon',side:0|1=0,spell='S4';
function reset(){for(const n of root.querySelectorAll<HTMLElement>('.card'))n.style.visibility='';view.render(g);view.setHandOpen(true);clearMonsterStates(root);}
async function cancel(){generation++;setFxSkip(true);await active.catch(()=>{});if(ready)reset();}
async function run(options:{kind:Kind;side:number;spell:string;drawCount?:number}){
 const serial=++generation;setFxSkip(true);await active.catch(()=>{});if(serial!==generation||!ready)return;
 kind=options.kind;side=options.side===1?1:0;spell=['S3','S4','S8'].includes(options.spell)?options.spell:'S4';
 resetFixtureHands(g,spell);reset();
 const count=options.drawCount&&[1,2,4].includes(options.drawCount)?options.drawCount:2;
 const drawState=kind==='draw'?await prepareDrawFixture(fixture,count,side,spell):null;
 if(serial!==generation)return;setFxSkip(false);
 const owner=side?'opp':'me',started=performance.now();post({playing:true,kind});
 active=(async()=>{
  const field=root.querySelector<HTMLElement>(`.card[data-uid="field-${side}-0"]`)!;
  const hand=root.querySelector<HTMLElement>(`.card[data-uid="hand-0-${kind==='spell'?1:0}"]`)!;
  if(!side){const r=hand.getBoundingClientRect();setPlayOrigin({...r.toJSON(),dx:0,dy:0});}
  if(kind==='draw')await animateDraw(document.getElementById(side?'oppHand':'hand'),count,owner,{uids:side?undefined:drawState!.uids,previousHand:drawState!.previous});
  if(kind==='summon'){
   const slot=document.createElement('div');slot.className='slot';field.replaceWith(slot);if(!side)hand.style.visibility='hidden';
   await ghostSummon(g.players[side].field[0],owner,0,undefined,summonFaceFactory(g,side,0));
  }
  if(kind==='attack')await attackStrike(`field-${side}-0`,`field-${1-side}-1`,side?'me':'opp',undefined,false,0);
  if(kind==='spell'){if(!side)hand.style.visibility='hidden';await revealSpell(g.players[side].hand[1],owner,'discard');}
 })().catch(error=>{post({error:String(error)});console.error(error);}).finally(()=>{if(serial===generation)post({playing:false,ended:true,kind,elapsed:(performance.now()-started)/1000});});
 await active;
}
Object.assign(window,{currentVfx:{run,cancel,info:()=>({ready,kind,side,spell,source:'65f0775f7',implementation:'client/src/ui/anim.ts'})}});
void waitForDuel(root).then(()=>{ready=true;clearMonsterStates(root);post({ready:true});});
window.addEventListener('pagehide',()=>{generation++;setFxSkip(true);stopLayout();view.destroy();},{once:true});
