import {runVoid} from './void/fixture';
import {runMimic} from './mimic/fixture';
import {runCorrosion} from './corrosion/fixture';
import {runDice} from './dice/fixture';
import {createGame,reduce} from '../../../shared/engine';
import type {GameState,FieldMon,CardInst,GameEvent,Side} from '../../../shared/types';
import {definitions} from './catalog';
export interface Config {item:string;card:string;variant:number;side:Side;outcome:string;reduced:boolean;background:string}
export const inst=(id:string,uid:string):CardInst=>{if(!definitions[id])throw new Error(`現行DBに存在しないカード: ${id}`);return {...definitions[id],uid};};
export const mon=(id:string,uid:string):FieldMon=>({...inst(id,uid),exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0} as FieldMon);
export interface Fixture {before:GameState;after:GameState;events:GameEvent[];source:CardInst;seed:number;note:string;sourceZone?:'hand'|'field'|'enchant'|'quest'|'market'|'deck';initialRolls?:number[];prediction?:number}
export function makeFixture(cfg:Config):Fixture {
 for(let seed=1;seed<=256;seed++){
  const g=createGame({mode:'bot',seed,starting:cfg.side,p0:{id:'d3-self',name:'YOU'},p1:{id:'d3-other',name:'OPPONENT'}}).state;
  g.turn=3;g.cur=cfg.side;g.pending=null;g.phase='main';
  for(const [i,p]of g.players.entries()) {p.openingDrawReady=false;p.mana=20;p.maxMana=20;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('ELF',`r3-elf-${i}`),mon('M4',`r3-hare-${i}`)];p.hand=[inst('STARTER_TRASH',`r3-h-${i}`)];p.discard=[inst('STARTER_TRASH',`r3-d-${i}`)];p.deck=['ELF','M4','S1','STARTER_MANA'].map((id,n)=>inst(id,`r3-deck-${i}-${n}`));p.removed=Array.from({length:6},(_,n)=>inst('MIMIC',`r3-rift-${i}-${n}`));}
  const source=inst(cfg.card,'r3-source');g.players[cfg.side].hand.unshift(source);
  const isDice=['S24','A153','A154','A155','A156','A157'].includes(cfg.item);
  const diceRun=isDice?runDice(g,cfg,source):undefined;
  const corrosionRun=(['S23','A039','A040','A041','A042'].includes(cfg.item)||cfg.item==='A004'&&cfg.card==='QUICK_POISON')?runCorrosion(g,cfg,source):undefined;
  const mimicRun=(['S07','A058','A117','A118','A119','A120','A121'].includes(cfg.item)||['A004','A018'].includes(cfg.item)&&['QUICK_MIMIC','QUICK_SURVIVAL','GREED_PRICE'].includes(cfg.card))?runMimic(g,cfg,source):undefined;
  const voidRun=!diceRun&&!corrosionRun&&!mimicRun&&!['S25','A011','A152'].includes(cfg.item)?runVoid(g,cfg,source):undefined;
  const result=voidRun??diceRun??corrosionRun??mimicRun??reduce(g,{type:'play',idx:0});
  const dice=result.events.find((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice');
  const enemySummons=result.events.some(e=>e.type==='summon'&&e.player!==cfg.side);
  const healing=result.events.some(e=>e.type==='heal');
  const desired=cfg.item==='A011'?'miss':cfg.outcome;
  if(diceRun&&dice&&((desired==='miss'&&diceRun.success)||(desired==='hit'&&!diceRun.success)))continue;
  if(!isDice&&['STARTER_CHEST','LUCKY_CHEST','GUILD_CHEST'].includes(cfg.card)&&dice&&((desired==='miss'&&!enemySummons)||(desired==='heal'&&!healing)||(desired==='hit'&&(enemySummons||healing))))continue;
  return {...(voidRun?{sourceZone:voidRun.sourceZone}:{}),...(mimicRun?{sourceZone:mimicRun.sourceZone}:{}),...(corrosionRun?{sourceZone:corrosionRun.sourceZone}:{}),...(diceRun?{sourceZone:diceRun.sourceZone,initialRolls:diceRun.initialRolls,prediction:diceRun.prediction}:{}),before:g,after:result.state,events:result.events,source,seed,note:'現行reduceのplay結果。出目は指定した結果に一致するseedを選択し、ルール値は演出側で再定義しない。'};
 }
 throw new Error('指定条件の実エンジン結果を作成できませんでした');
}
