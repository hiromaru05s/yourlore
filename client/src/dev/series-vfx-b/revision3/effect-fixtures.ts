import {createGame,reduce,effectChoices,effAtk,effDef,curHp,buyCost,playCost} from '../../../shared/engine';
import type {GameState,GameEvent,Action} from '../../../shared/types';
import {card} from './fixtures';
export const effectCues=new Set(['A047','A053','A060','A061','A064','A065','A072','A075','A111','A112','A123','A124','A125','A130','A131','A132','A133','A137','A138','A146','A147','A148','A149','A150','A151','A181']);
export type EffectStep={label:string;before:GameState;after:GameState;events:GameEvent[];action:Action};
export type EffectFixture={cue:string;selected:string;owner:0|1;sourceUid:string;before:GameState;after:GameState;events:GameEvent[];steps:EffectStep[];notes:string[]};
export function effectFixture(cue:string,selected:string,owner:0|1):EffectFixture{
 let g=createGame({mode:'bot',seed:724,starting:owner,p0:{id:'bself',name:'YOU'},p1:{id:'bopp',name:'OPPONENT'}}).state;
 g.cur=owner;g.turn=3;g.pending=null;g.opening=undefined;
 for(const [i,p] of g.players.entries()){p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.hand=[];p.discard=[];p.removed=[];p.mana=30;p.maxMana=30;p.hp=120;p.dew=0;p.shield=0;p.deck=Array.from({length:36},(_,j)=>card('M2',`bdeck-${i}-${j}`));}
 const pending=():GameState['pending']=>g.pending;
 const foe=(1-owner) as 0|1,steps:EffectStep[]=[],notes:string[]=[];let serial=0,record=false,sourceUid='r3-effect-source';
 const apply=(action:Action,label:string)=>{const before=structuredClone(g),r=reduce(g,action);g=r.state;if(record)steps.push({before,after:structuredClone(g),events:r.events,action,label});return r.events;};
 const play=(id:string,side:0|1=owner,uid=`bseed-${serial++}`,label=`${card(id,'').nameJa||id}を発動`)=>{g.cur=side;if(['WORLD_TREE','ELDER_ELF_KING'].includes(id))g.players[side].dew=Math.max(20,g.players[side].dew||0);g.players[side].mana=g.players[side].maxMana;g.players[side].hand.push(card(id,uid));const idx=g.players[side].hand.length-1;const ev=apply({type:'play',idx},label);if(!ev.some(e=>e.type==='summon'&&e.uid===uid||e.type==='playSpell'&&e.id===id||e.type==='trapSet')&&g.players[side].hand.some(c=>c.uid===uid))throw Error(`${cue}/${id}: play rejected (${pending()?.reason})`);return uid;};
 const choose=(uid:string|null,label='対象を選択して効果を解決')=>apply({type:'chooseTarget',uid},label);
 const cancel=()=>{if(pending()?.allowCancel)choose(null);};
 const end=(label='ターン経過')=>{if(g.pending)cancel();if(g.pending&&g.pending.reason!=='handCap')throw Error(`${cue}: unresolved ${g.pending.reason}`);apply({type:'endTurn'},label);if(pending()?.reason==='handCap')apply({type:'endTurn'},'持ち越し上限で手札を整理してターン終了');};
 const cycle=(label='自分のターン開始')=>{end('相手のターンへ');end(label);};
 const attack=(uid:string,target:string|null,label='対象へ攻撃')=>{apply({type:'attack',uid},label);if(pending()?.reason==='attack')choose(target,label);while(pending()?.reason?.startsWith('WORLD_TREE'))choose('pass');};
 const begin=()=>{record=true;};
 const cast=()=>play(selected,owner,sourceUid);
 const buffTarget=()=>{const uid=play('TGE7',owner,'b-target');cancel();return uid;};
 if(['A060','A061','A064','A065','A072','A075'].includes(cue)){
  if(cue==='A060'){const t=buffTarget();play('M2',owner,'b-target2');begin();cast();if(g.pending)choose(t,'赤い体力表示へ強化が届く');}
  if(cue==='A061'){if(selected==='PACK_INSTINCT'){play('M2',owner,'b-target');play('M2',owner,'b-target2');}else{play('TGE3',owner,'b-target');}begin();cast();}
  if(cue==='A064'&&selected==='S14'){const t=buffTarget();const a=play('M2',foe,'b-wound');attack(a,t);g.cur=owner;begin();cast();}
  if(cue==='A064'&&selected==='WORLD_TREE'){play(selected,owner,sourceUid);notes.push('旧台帳の蓄積ダメージ除去は現行世界樹に存在しない。現行の雫回復を表示。');begin();cycle('世界樹の雫回復と雫3獲得');}
  if(cue==='A065'){g.players[owner].hp=12;g.players[foe].hp=18;if(selected==='MEDITATE')g.players[owner].maxMana=11;begin();cast();}
  if(cue==='A072'){g.players[owner].hand=[card(selected==='ELF_HAVEN'?'WORLD_SEED':selected==='DOMINION'?'M7':'FIRE_BALL','b-discount-card')];if(selected==='QUICK_GRIMOIRE'){g.players[owner].supply[0]=card(selected,sourceUid);begin();apply({type:'buySupply',i:0},'購入で魔法の発動コストを軽減');}else{begin();cast();}if(selected==='FIRE_ART'||selected==='QUICK_GRIMOIRE')cycle('ターンを越えて軽減が終了');}
  if(cue==='A075'){play(selected==='GEM_RAIN'?'MIMIC':'TGE3',owner,'b-target');play(selected,owner,sourceUid);cancel();begin();if(selected==='S7')end('ターン強化が終了');else{g.cur=foe;play(selected==='GEM_RAIN'?'DISARM1':'RUNE1',foe,'b-remove-source');if(g.pending)choose(sourceUid);}}
 }else if(cue==='A047'){
  if(selected==='ND5'){play('M7',owner,'b-target');begin();cast();}else{begin();cast();cancel();}
  // A real targeted effect demonstrates that Aura removes these nodes from target candidates.
  const old=record;record=false;g.cur=foe;play('M2',foe,'b-other-target');record=old;play('S15',foe,'b-target-attempt','対象候補からオーラ保持者が外れる');if(g.pending){const target=selected==='ND5'?'b-target':sourceUid;choose(target,'オーラ保持者への対象指定は成立しない');cancel();}notes.push(selected==='DRAGON_EGG'?'現行ドラゴンの卵はward。オーラと同一効果には扱わない。':'オーラの有効な対象制約を現行reduceで検証');play('ELDER_ELF_KING',foe,'b-aura-end','対象指定を伴わない全体破壊で常在表示が終了');
 }else if(cue==='A053'){
  play(selected,owner,sourceUid);cancel();
  if(selected==='GUILD_CO'){begin();play('MERCH2');}
  else if(selected==='CASTLE'){begin();play('SOLDIER2');g.cur=foe;const a=play('M2',foe);attack(a,sourceUid,'城のカウンターを消費して受ける');}
  else if(selected==='CASINO'){begin();for(let i=0;i<2;i++)play('GAMBLE',owner,`b-casino-roll-${i}`,'通常ダイスを蓄積し、12個でカジノ効果');}
  else if(selected==='GUILD_HALL'){const attackers=[play('ASSASSIN2'),play('ASSASSIN2'),play('ASSASSIN2')];begin();for(const a of attackers){g.cur=owner;attack(a,null,'命中でカウンター蓄積、3個で消費');}}
  else{notes.push('現行世界樹は専用カウンターではなく雫を用いる。');begin();cycle('世界樹が雫3を獲得');}
 }else if(cue==='A111'){
  play('M7',foe,'b-dragon-target');g.players[foe].removed=[card('M2','b-rift-return')];g.cur=owner;begin();cast();if(pending()?.reason==='blackDragon'){choose('b-rift-return','リフトから相手シェルフへ戻す');cancel();}
 }else if(cue==='A112'){
  play(selected==='ANTIQUE_DK'?'INFKNIGHT':'SOLDIER2',owner,'b-fusion-partner');begin();sourceUid='b-fusion-dragon';play('GM6_0',owner,sourceUid,'竜と兵士／騎士が合体');
 }else if(cue==='A123'){
  play('M7',foe,'b-wipe-1');play('M2',foe,'b-wipe-2');play('BREWING',foe,'b-wipe-enchant');g.cur=owner;begin();cast();
 }else if(cue==='A124'){
  play('WORLD_TREE',owner,sourceUid);const t=play('TGE3',owner,'b-tree-ally');play('M7',foe,'b-tree-enemy');g.cur=owner;begin();cycle('雫回復が2倍になり、雫3を獲得');apply({type:'attack',uid:t},'世界樹の雫強化を選択');if(pending()?.reason==='attack')choose('b-tree-enemy');if(pending()?.reason==='WORLD_TREE_ATTACK')choose('grow','雫1を消費し攻撃力+6');notes.push('現行世界樹：雫回復2倍・ターン開始雫3・攻撃時雫1で永続強化。旧32回復は廃止。');
 }else if(cue==='A125'){play('WORLD_SEED',owner,'b-tree-support');begin();cast();}
 else if(cue==='A130'){play('GUILD_CO',owner,sourceUid);for(let i=0;i<2;i++)play('MERCH2');begin();for(let i=0;i<8&&!g.players[owner].hand.some(c=>c.id==='DARK_MERCHANT');i++)play('MERCH2',owner,`b-merchant-${i}`,'商会の蓄積から20個を消費し闇商人を獲得');}
 else if(cue==='A131'){play('BREWING',owner,sourceUid);g.players[owner].hand.push(card('GRAPE','b-grape'),card('GRAPE2','b-grape2'));begin();for(let i=0;i<6&&g.players[owner].enchants.some(e=>e.card.id==='BREWING');i++)cycle(i===5?'熟成完了、ワインを手札へ':'ぶどうの仕込み・熟成');}
 else if(cue==='A132'){play('BREWING',owner,'b-brewing');play('FARM_KEEPER',owner,sourceUid);begin();end('醸造のある場で、かかし2体が現れる');}
 else if(cue==='A133'){play('ANCIENT_CIV',owner,sourceUid);for(let i=0;i<4;i++)cycle();begin();cycle('古代文明の期間が終了し、卵を選ぶ');if(pending()?.reason==='civChoice')choose('DRAGON_EGG','選択した卵が手札に加わる');}
 else if(cue==='A137'){play('TPO2',owner,sourceUid);play('M7',foe,'b-prey');g.cur=owner;begin();attack(sourceUid,'b-prey','捕食したカードのコストを能力に取り込む');}
 else if(cue==='A138'){begin();if(selected==='TGE5')cast();else play('ORIGIN_RITE',owner,sourceUid);const was=record;record=false;play('M2',foe,'b-rite-target');record=was;g.cur=owner;play('TGE2',owner,'b-rite-trigger','始原の召喚から術式が反応');if(g.pending)choose('b-rite-target');}
 else if(cue==='A146'){g.players[owner].supply[0]=card('M7','b-buy');sourceUid='b-buy';begin();apply({type:'buySupply',i:0},'提示カードを購入しシェルフへ');}
 else if(cue==='A147'){play('M9',owner,sourceUid);begin();apply({type:'refresh'},'レリック・ハンターのカウンターで提示を更新');}
 else if(cue==='A148'){begin();cast();}
 else if(cue==='A149'){begin();cast();end('相手の提示が2枚になり更新が封じられる');apply({type:'refresh'},'更新禁止中の操作');end();end('次の相手ターンで制限が解除');}
 else if(cue==='A150'){
  g.players[owner].supplyHist=[{turn:g.turn,ids:['M7','M2']}];begin();cast();if(selected==='GUILD_HQ')cycle('ナイトマーケットを開く');const choices=pending()?.kind==='giantShop'?((pending()?.data?.ids||[]) as string[]).map(id=>card(id,id)):effectChoices(g);if(!g.pending||!choices.length)throw Error(`${selected}: no shop choices`);choose(choices[0].id,'特殊マーケットの実カードを購入');
 }else if(cue==='A151'){
  if(selected==='KIN_CALL')play('TGE3');g.players[owner].supply[0]=card(selected==='ELF_HAVEN'?'WORLD_SEED':'TGE3','b-discount-buy');begin();cast();if(selected==='M9')apply({type:'refresh'},'無料更新権を1つ使う');else apply({type:'buySupply',i:0},'適用された購入コストでカードを取得');
 }else if(cue==='A181'){play('Q_TOWN',owner,sourceUid);begin();play('SOLDIER2',owner,'b-town-soldier','兵士の条件を満たす');play('CASINO',foe,'b-town-casino','相手のカジノで2条件目');play('WINE',owner,'b-town-wine','ワインで3条件成立、支配を獲得');}
 else throw Error(`No R3 effect fixture: ${cue}`);
 if(!steps.length)throw Error(`${cue}: no real reducer steps`);
 return {cue,selected,owner,sourceUid,before:steps[0].before,after:structuredClone(g),events:steps.flatMap(s=>s.events),steps,notes};
}
export function effectValues(g:GameState){return g.players.map(p=>({hp:p.hp,dew:p.dew,mana:p.mana,maxMana:p.maxMana,refreshTokens:p.refreshTokens,field:p.field.map(m=>({uid:m.uid,id:m.id,atk:effAtk(p,m,g),hp:curHp(p,m),max:effDef(p,m),counter:m.gcount,passives:m.passivesG})),enchants:p.enchants.map(e=>({id:e.card.id,uid:e.card.uid,count:e.cnt,turns:e.turns})),hand:p.hand.map(c=>({id:c.id,uid:c.uid,cost:playCost(c,p)})),supply:p.supply.map(c=>c?{id:c.id,cost:buyCost(p,c)}:null),quest:p.quests?.map(q=>({id:q.card.id,progress:q.progress,seen:q.townSeen})),discard:p.discard.map(c=>c.id),removed:p.removed?.map(c=>c.id)}));}
