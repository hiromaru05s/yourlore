import {configureCue} from './cues';
import {createGame,reduce,effectChoices} from '../../../shared/engine';
import type {CardInst,FieldMon,GameState,GameEvent,Action} from '../../../shared/types';
import {definitions,type Config} from './catalog';
export const inst=(id:string,uid:string):CardInst=>({...definitions[id],uid});
export const mon=(id:string,uid:string):FieldMon=>({...inst(id,uid),exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0} as FieldMon);
export interface Fixture{before:GameState;after:GameState;events:GameEvent[];source:CardInst;zone:'hand'|'field'|'market';seed:number;accepted:boolean;note:string}
export function makeFixture(cfg:Config):Fixture{
 for(let seed=1;seed<=128;seed++){
 const g=createGame({mode:'bot',seed,starting:cfg.side,p0:{id:'a3-self',name:'YOU'},p1:{id:'a3-other',name:'OPPONENT'}}).state;
 g.turn=3;g.cur=cfg.side;g.phase='main';g.pending=null;g.opening=undefined;g.spellDamageTurn=g.turn;g.spellDamageAmount=5;
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=20;p.maxMana=20;p.hp=32;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('M4',`a3-field-${i}`)];p.discard=[inst('CURSE',`a3-old-curse-${i}`),inst('M4',`a3-discard-${i}`)];p.removed=[inst('CURSE',`a3-removed-${i}`)];p.hand=[inst('S10',`a3-hand-${i}`)];p.deck=Array.from({length:18},(_,j)=>inst(j%2?'S10':'BLACK_CURSE',`a3-deck-${i}-${j}`));}
 const p=g.players[cfg.side],o=g.players[1-cfg.side];const source=inst(cfg.card,'a3-source');let zone:Fixture['zone']='hand';let action:Action={type:'play',idx:0};p.hand.unshift(source);
 if(source.id==='ASSASSIN_SQUAD')p.field.push(mon('ASSASSIN1','a3-squad-ally'));
 if(source.id.startsWith('ASSASSIN'))p.deck.push(...['ASSASSIN1','ASSASSIN2','ASSASSIN3'].map((id,i)=>inst(id,`a3-condition-${i}`)));
 if(['TSO2','TSO5'].includes(source.id))p.field=[];
 if(source.id==='TSO3')p.discard=[];
 if(source.id==='TDE4')p.deck.push(inst('TDE1','a3-demon-condition'));
 if(source.id==='DEMON_REALM')p.field=[mon('TDE1','a3-demon-1'),mon('TDE2','a3-demon-2')];
 if(source.id==='RUNE1')o.field=[mon('BLACK_ELSA','a3-rune-target')];
 if(source.id==='EMPTY_MIND')p.spellsCastTurn=4;
 if(source.id==='BEGINNER_MIND')p.hand=[source];
 if(source.id==='BLOOD_SECRET')p.field=[mon('VAMP2','a3-sacrifice')];
 if(source.id==='BLACK_NOVA')p.field=[];
 if(source.quick){zone='market';p.hand.shift();g.market[0]=source;action={type:'buyMarket',i:0};}
 const cue=configureCue(g,cfg,source);if(cue){zone=cue.zone;action=cue.action;}let result=reduce(g,action);for(let k=0;k<4&&result.state.pending;k++){const pending=result.state.pending;const pp=result.state.players[cfg.side],oo=result.state.players[1-cfg.side];const uid=pending.kind==='giantShop'?(pending.data?.ids as string[]|undefined)?.[0]:pending.kind==='cardChoice'?effectChoices(result.state)[0]?.uid:pending.kind==='seek'?pp.deck[0]?.uid:pending.kind==='recall'?pp.discard[0]?.uid:pending.kind==='myMon'?pp.field[0]?.uid:pending.kind==='oppBoard'?oo.enchants[0]?.card.uid||oo.field[0]?.uid:pending.kind==='purge'?pp.discard[0]?.uid:oo.field[0]?.uid;if(!uid)break;const more=reduce(result.state,{type:'pick',uid});result={state:more.state,events:[...result.events,...more.events]};}const dice=result.events.find((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice');
 if(dice&&((cfg.item==='A043'&&source.id==='S12')||(cfg.item==='A081'&&source.id==='S1'))&&Math.max(...dice.rolls)<5)continue;
 if(dice&&dice.success!==undefined&&dice.success!==(cfg.outcome==='hit'))continue;
 const accepted=(['A022','A163','A161'].includes(cfg.item))?result.events.some(e=>e.type==='log'):result.events.some(e=>['summon','playSpell','buy','dice','damage','heal','attack','draw','enchantActivate','monsterActivate','win'].includes(e.type));
 return{before:g,after:result.state,events:result.events,source,zone,seed,accepted,note:'現行reduceの結果。条件を満たした公開fixtureであり、実対戦への統合ではありません。'};
 }throw Error('指定されたダイス結果のfixtureが見つかりません');
}
