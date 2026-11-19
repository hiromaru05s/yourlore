import {createFrameTransfer} from '../../ui/summon/manaTransfer';
import {warmTransferSounds} from '../../ui/summon/manaTransferSound';
import {initSound,warmSounds,stopSounds,getSfxVolume,setSfxVolume} from '../../ui/sound';
import {mountFixture,prepareDrawFixture,resetFixtureHands} from './fixture';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {animateDraw,ghostSummon,summonFromHand,attackStrike,revealSpell,setFxSkip,setPlayOrigin} from '../../ui/anim';
import {summonFaceFactory} from '../../ui/summon/face';
import {DB} from '../../shared/cards';
import {cardName} from '../../i18n';
type Kind='draw'|'summon'|'attack'|'spell';
const fixture=mountFixture();
const {root,view,g,stopLayout}=fixture;
const post=(x:object)=>parent.postMessage({type:'cinematic-current',...x},location.origin);
const transferStudy=new URLSearchParams(location.search).has('mana-transfer');
initSound();
void (transferStudy?warmTransferSounds():warmSounds(['summon']));
let volumeFromStudio=false;
const setPreviewVolume=(value:number)=>{volumeFromStudio=true;try{setSfxVolume(value);}finally{volumeFromStudio=false;}};
document.addEventListener('lore:volume-change',()=>{if(!volumeFromStudio)post({volume:getSfxVolume()});});
let transferTime:number|undefined;
let playing=false,phase='',trace:Array<{phase:string;at:number}>=[],runStart=0;
function report(value:string,detail?:object){if(value!==phase){phase=value;trace.push({phase,at:performance.now()-runStart});}document.body.dataset.phase=value;post({phase,...detail});}
let generation=0,active=Promise.resolve(),ready=false,kind:Kind='summon',side:0|1=0,spell='S4';
function reset(){for(const n of root.querySelectorAll<HTMLElement>('.card'))n.style.visibility='';view.render(g);view.setHandOpen(true);clearMonsterStates(root);}
async function cancel(){generation++;stopSounds();setFxSkip(true);await active.catch(()=>{});if(ready)reset();playing=false;}
async function run(options:{kind:Kind;side:number;spell:string;drawCount?:number;id?:string;path?:'hand'|'generated'}){
 const serial=++generation;stopSounds();setFxSkip(true);await active.catch(()=>{});if(serial!==generation||!ready)return;
 kind=options.kind;side=options.side===1?1:0;spell=['S3','S4','S8'].includes(options.spell)?options.spell:'S4';
 resetFixtureHands(g,spell);
 const id=options.id??'M4';if(DB[id])g.players[side].field[0]={...DB[id],uid:`field-${side}-0`,gcount:3,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0};
 reset();
 const count=options.drawCount&&[1,2,4].includes(options.drawCount)?options.drawCount:2;
 const drawState=kind==='draw'?await prepareDrawFixture(fixture,count,side,spell):null;
 if(serial!==generation)return;setFxSkip(false);
 const owner=side?'opp':'me',started=performance.now();runStart=started;trace=[];phase='';playing=true;report('中央拡大（現行）');post({playing:true,kind});
 active=(async()=>{
  const field=root.querySelector<HTMLElement>(`.card[data-uid="field-${side}-0"]`)!;
  const hand=root.querySelector<HTMLElement>(`.card[data-uid="hand-0-${kind==='spell'?1:0}"]`)!;
  if(!side){const r=hand.getBoundingClientRect();setPlayOrigin({...r.toJSON(),dx:0,dy:0});}
  if(kind==='draw')await animateDraw(document.getElementById(side?'oppHand':'hand'),count,owner,{uids:side?undefined:drawState!.uids,previousHand:drawState!.previous});
  if(kind==='summon'){
   if(options.path==='hand'){await summonFromHand(g.players[side].field[0],`field-${side}-0`,owner);return;}
   const slot=document.createElement('div');slot.className='slot';field.replaceWith(slot);
   await ghostSummon(g.players[side].field[0],owner,0,undefined,summonFaceFactory(g,side,0),transferStudy?createFrameTransfer(report,()=>transferTime):new URLSearchParams(location.search).has('baseline')?null:undefined);
  }
  if(kind==='attack')await attackStrike(`field-${side}-0`,`field-${1-side}-1`,side?'me':'opp',undefined,false,0);
  if(kind==='spell'){if(!side)hand.style.visibility='hidden';await revealSpell(g.players[side].hand[1],owner,'discard');}
 })().catch(error=>{post({error:String(error)});console.error(error);}).finally(()=>{if(serial===generation){playing=false;post({playing:false,ended:true,kind,elapsed:(performance.now()-started)/1000});}});
 await active;
}
Object.assign(window,{currentVfx:{run,cancel,setVolume:setPreviewVolume,volume:getSfxVolume,reviewTime:(ms?:number)=>{transferTime=ms;},info:()=>({ready,kind,side,spell,source:'e3f4a6ca6 + mana summon adoption',playing,phase,trace,transferStudy,implementation:'client/src/ui/anim.ts'})}});
void waitForDuel(root).then(()=>{ready=true;clearMonsterStates(root);post({ready:true});});
window.addEventListener('pagehide',()=>{generation++;stopSounds();setFxSkip(true);stopLayout();view.destroy();},{once:true});

// Optional review controls; the board and production summon routes stay unchanged.
if(new URLSearchParams(location.search).has('preview')){
 const controls=document.createElement('div');controls.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:400;display:flex;gap:6px;align-items:center;padding:7px 10px;border:1px solid #90b8cd55;border-radius:8px;background:#101e2eeb;color:#eff8ff;font:12px sans-serif;white-space:nowrap';
 controls.innerHTML='<select aria-label="召喚するカード"><option value="M4">通常召喚</option><option value="CASTLE">城</option><option value="POISON_MASTER">ポイズンマスター</option><option value="RUST_SLUG">腐敗ナメクジ</option><option value="RUST_SHROOM">腐敗キノコ</option><option value="GOLEM1">ゴーレム I</option><option value="GOLEM2">ゴーレム II</option><option value="GOLEM3">ゴーレム III</option><option value="M10">M10</option><option value="NGA3">NGA3</option><option value="NWL3">NWL3</option><option value="MANA_GIANT">マナの巨人</option></select><select aria-label="召喚側"><option value="0">自分</option><option value="1">相手</option></select><button type="button">再生 ▶</button>';
 const selects=controls.querySelectorAll('select');for(const option of selects[0].options)if(DB[option.value])option.textContent=cardName({...DB[option.value],uid:'preview-label'});controls.querySelector('button')!.onclick=()=>void run({kind:'summon',side:Number(selects[1].value),spell:'S4',id:selects[0].value,path:'generated'});document.body.append(controls);
}
