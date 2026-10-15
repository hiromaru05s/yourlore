import assignment from './assignment.json';
import {DB,STARTERS} from '../../shared/cards';
export const cards={...DB,...STARTERS};
export const families=assignment.families;
export const cues=assignment.cues;
export const variants:Record<string,[string,string]>={S04:['熔脈の焔','炎箔の翼'],S06:['刻流の共鳴','組晶の機関'],S08:['岩層の心臓','鋼殻の起動'],S12:['リフトの職紋','試練の武装'],S21:['石紋の軍勢','織旗の進軍'],S22:['血蝋の契約','鉄札の隊列']};
export type Kind='surface'|'summon'|'shot'|'hit'|'break'|'shield'|'charge'|'buff'|'swap'|'dice'|'mark'|'zone'|'move';
export type Anchor='source'|'ally0'|'ally1'|'ally2'|'ally3'|'ally4'|'enemy0'|'enemy1'|'enemy2'|'me'|'opponent'|'mana'|'enemyMana'|'rift'|'shelf'|'hand';
export interface Cue {kind:Kind;from:Anchor;to:Anchor;at:number;duration:number;label:string;count?:number;shape?:string;amount?:number}
export interface Plan {id:string;card:string;family:string;title:string;events:Cue[];duration:number;note:string}
export interface Options {outcome:boolean;boost:boolean;choice:string}
export function familyOf(card:string){return families.find(f=>f.cardIds.includes(card))?.id||'S08';}
export function planFor(id:string,card:string,opt:Options):Plan{
 const family=id.startsWith('S')?id:familyOf(card),events:Cue[]=[];
 const add=(kind:Kind,from:Anchor,to:Anchor,at:number,duration:number,label:string,extra:Partial<Cue>={})=>events.push({kind,from,to,at,duration,label,...(kind==='dice'?{amount:opt.outcome?4:1}:{}),...extra});
 const surface=()=>add('surface','source','source',0,900,'表面の刻印が力を蓄える');
 const shot=(from:Anchor,to:Anchor,at=800,shape='blade',amount=3)=>{add('shot',from,to,at,650,'力を対象へ伝える',{shape});add('hit',to,to,at+650,550,'接触と数値への反映',{amount});};
 const summon=(to:Anchor='ally0',at=600,shape=card)=>add('summon','source',to,at,1250,'材質の組み上げから接地',{shape});
 const charge=(to:Anchor='ally0',at=650,n=1)=>add('charge','source',to,at,1050,'気合の獲得／補充',{count:n});
 const buff=(to:Anchor='ally0',at=700,amount=2,shape='atk')=>add('buff','source',to,at,1100,shape==='hp'?'体力変化':'数値の変化',{amount,shape});
 const fire=(which:string)=>{
  if(which==='FIRE_ART'){for(const a of ['ally0','ally1','ally2'] as Anchor[])add('mark','source',a,650,1000,'ファイアー魔法の発動コスト軽減',{shape:'flame'});return;}
  if(which==='FIRE_MASTER'){summon();add('mark','ally0','ally1',1600,750,'常時の発動コスト軽減',{shape:'flame'});if(opt.boost){add('break','ally0','shelf',2450,1000,'ファイアーマスター破壊');for(let i=0;i<2;i++)add('move','shelf','hand',3400+i*250,650,'ファイアー魔法を手札へ回収',{shape:'card'});}return;}
  if(which==='FIRE_BALL'||which==='FIRE_ARROW')add('hit','me','me',320,430,'自傷を先に解決',{amount:which==='FIRE_BALL'?2:1});
  if(which==='FIRE_METEOR')buff('mana',250,-1,'mana');
  if(which==='FIRE_ZONE')add('move','hand','rift',180,600,'手札1枚をリフトへ',{shape:'exile'});
  const n=which==='FIRE_ARROW'?3:which==='FIRE_METEOR'?8:which==='FIRE_ZONE'?4:1;
  for(let i=0;i<n;i++){const target=(which==='FIRE_BALL'?(opt.choice==='player'?'opponent':'enemy0'):['enemy0','enemy1','enemy2','opponent'][i%4]) as Anchor;const at=850+i*(which==='FIRE_METEOR'?210:which==='FIRE_ZONE'?60:330);shot('source',target,at,which==='FIRE_METEOR'?'meteor':which==='FIRE_ARROW'?'arrow':which==='FIRE_ZONE'?'flame':'fireball',which==='FIRE_BALL'?6:which==='FIRE_ARROW'?1:which==='FIRE_METEOR'?2:opt.boost?9:5);}
 };
 surface();
 let action=id;
 if(id.startsWith('S')){
  if(family==='S04')action='fire';
  if(family==='S06')action='attune';
  if(family==='S08')action=card==='MIND_BURST'?'A122':card==='KNIGHT_TEACH'?'A037':'golem';
  if(family==='S12')action=card==='CHOSEN_AREA'?'A174':card==='COLOSSEUM'?'A104':card.startsWith('CHOSEN_')?'chosen':card==='COLOSSEUM_REST'?'rest':card==='QUICK_SORT'?'quicksort':'sort';
  if(family==='S21')action=({EXPANSION:'A126',TREASON:'A127',STABLE:'A128',REINFORCE:'A012',LEVY:'A007',QUICK_MUSTER:'A007',ADVANCE:'A059',INTERCEPT:'intercept',BUDGET:'budget',Q_CASTLE:'quest',Q_TOWN:'quest'} as Record<string,string>)[card]||'army';
  if(family==='S22')action='A129';
 }
 switch(action){
 case 'fire':case 'A086':case 'A087':case 'A088':case 'A089':fire(card);break;
 case 'attune':
  if(card==='AHEUK'){buff('enemyMana',900,opt.boost?-2:-1,'mana');break;}
  if(card==='AMA')add('move','hand','shelf',300,700,'宝箱を墓地へ',{shape:'card'});
  buff('mana',950,1,'mana');
  if(card==='AJIN'){add('dice','source','source',450,600,'ダイス判定',{count:1});if(opt.outcome)add('move','source','shelf',1600,700,'4以上：アチューンを追加',{shape:'card'});}
  if(card==='STARTER_MANA'){buff('mana',150,-3,'spend');add('shield','source','source',1700,700,'神器：除外されない',{shape:'relic'});}
  if(card==='QUICK_ATTUNE')buff('me',1300,2,'hp');break;
 case 'golem':if(cards[card]?.t==='mon'){summon();if(card==='M10')buff('mana',1650,2,'mana');else if(card==='MANA_GIANT')buff('me',1650,10,'hp');else add('charge','source','ally0',1550,1050,'召喚時の気合を定着',{count:card==='NGA3'?4:1,shape:'setguts'});}else{buff('ally0',700,7);buff('ally1',850,7);}break;
 case 'chosen':case 'A100':summon('ally0',650,card);break;
 case 'army':summon();if(card==='CASTLE')add('shield','ally0','ally0',1500,900,'召喚時カウンター2個',{count:2});if(card==='HORDE')for(const a of ['ally1','ally2'] as Anchor[])buff(a,1550,4);if(card==='VITAL4')for(const a of ['ally1','ally2'] as Anchor[])charge(a,1550,1);if(card==='ELITE'){summon('ally1',1600,'SOLDIER2');summon('ally2',1850,'SOLDIER2');}if(card==='M11'||card==='GM6_7')summon('ally1',1600,'INFKNIGHT');if(card==='GM6_7'&&opt.boost){add('dice','enemy0','ally0',2500,850,'相手の召喚にダイス判定',{count:1});if(opt.outcome)summon('ally2',3300,'INFKNIGHT');}if(card==='GM5_2'){summon('ally1',1600,'SOLDIER2');buff('ally1',2300,2,'hp');}if(card==='GM6_8'){add('break','ally0','shelf',1800,900,'破壊');summon('ally1',2600,'SOLDIER2');}break;
 case 'A001':summon();break;
 case 'A007':for(let i=0;i<3;i++)summon(('ally'+i) as Anchor,600+i*340,card==='SCARECROW'?'TOKEN00':card==='REINFORCE'?['INFKNIGHT','SOLDIER2','GUNNER'][i]:'SOLDIER2');break;
 case 'A012':for(let i=0;i<3;i++){summon(('ally'+i) as Anchor,500+i*220,['INFKNIGHT','SOLDIER2','GUNNER'][i]);add('mark','source',('ally'+i) as Anchor,1650,700,'相手ターン終了まで',{shape:'hourglass'});add('break',('ally'+i) as Anchor,'shelf',2800+i*120,1000,'期限到来で退場');}break;
 case 'A013':add('break','enemy0','shelf',650,1500,'表面から崩壊し墓地へ');break;
 case 'A023':case 'A025':shot('ally0','enemy0');break;
 case 'A024':case 'A026':shot('ally0','opponent');break;
 case 'A027':shot('ally0','enemy0');shot('enemy0','opponent',1330,'pierce',2);break;
 case 'A028':case 'A029':shot('ally0','enemy0');if(action==='A029')add('break','enemy0','shelf',1360,700,'撃破');add('mark','ally0','ally0',1450,500,'再攻撃の解放',{shape:'swords'});shot('ally0','enemy1',2000,'blade',card==='DRAGON_RIDER'?Math.floor((cards[card].atk||0)/2):4);break;
 case 'A030':shot('ally0','enemy0');if(opt.boost)add('break','enemy0','shelf',1370,1000,'倒された後にも反撃');shot('enemy0','ally0',1530,'counter',2);break;
 case 'A031':shot('ally0','enemy0');add('shot','enemy0','ally0',1500,700,'返撃');add('shield','ally0','ally0',1950,700,'騎馬兵：反撃を受けない',{shape:'immune'});break;
 case 'A032':add('mark','source',opt.outcome?'ally1':'enemy1',300,700,'抽選した攻撃先',{shape:'target'});shot('ally0',opt.outcome?'ally1':'enemy1',1000);break;
 case 'A033':shot('ally0','enemy0',800,'arrow');if(opt.outcome)add('break','enemy0','shelf',1350,1200,'体力15以上：即時撃破');break;
 case 'A034':shot('enemy0','ally0');add('shield','ally0','ally0',1260,1100,'城のカウンターを消費し無効化',{count:-1});break;
 case 'A036':shot('ally0',opt.choice==='player'?'opponent':'enemy1',900,'cannon',card==='HEAVY_GUNNER'?2:1);break;
 case 'A037':for(const a of (card==='KNIGHT_TEACH'?['ally0','ally1','ally2']:['ally0']) as Anchor[])charge(a,650,card==='KNIGHT_TEACH'?(a==='ally0'?3:1):opt.boost?3:1);break;
 case 'A038':shot('enemy0','ally0',800,'blade',30);add('shield','ally0','ally0',1260,1300,'気合を1消費して体力1で耐える',{shape:'guts',count:-1});break;
 case 'A049':case 'A050':add('dice','ally0','ally0',250,900,'能力のダイス判定',{count:1});if(opt.outcome){add('shield','ally0','ally0',1000,900,action==='A049'?'挑発成功：攻撃先を引き受ける':'回避成功：接触を避ける',{shape:action==='A049'?'taunt':'evade'});if(action==='A049')shot('enemy0','ally0',1500);else add('shot','enemy0','ally0',1150,650,'回避したカードの元の位置を通過',{shape:'blade'});}else shot('enemy0',action==='A049'?'ally1':'ally0',1250);break;
 case 'A054':if(card==='NWL3')shot('enemy0','ally0',550);else add('break','ally1','shelf',450,900,'味方の退場');add('charge',card==='NWL3'?'ally0':'ally1','ally0',1500,1000,'原因から気合が蓄積',{count:1});break;
 case 'A059':for(const a of (['S7','ADVANCE'].includes(card)||opt.boost?['ally0','ally1','ally2']:['ally0']) as Anchor[])buff(a,800,card==='ADVANCE'?(a==='ally0'?2:3):cards[card].val||3);break;
 case 'A062':for(const a of (card==='WEAKEN_ALL'?['ally0','ally1','ally2','enemy0','enemy1','enemy2']:['enemy0']) as Anchor[])buff(a,800,card==='M12'?-1:card==='DUNGEON'?1:-2,card==='DUNGEON'?'setatk':'atk');break;
 case 'A063':if(card==='SHATTER')add('hit','me','me',250,450,'自傷5',{amount:5});for(const a of (['SHATTER','LAWLESS'].includes(card)?['ally0','ally1','ally2','enemy0','enemy1','enemy2']:card==='D_BLACK'?['enemy0','enemy1','enemy2']:['enemy0']) as Anchor[])buff(a,800,['SHATTER','LAWLESS'].includes(card)?1:card==='D_BLACK'?-3:-2,['SHATTER','LAWLESS'].includes(card)?'sethp':'hp');break;
 case 'A067':buff('mana',850,1,'mana');break;
 case 'A068':buff(['TDE1','TDE4'].includes(card)?'mana':'enemyMana',850,['CASINO','TDE4'].includes(card)?3:card==='AHEUK'&&opt.boost?-2:-1,['CASINO','TDE4'].includes(card)?'setmana':'mana');if(card==='TDE1')buff('mana',2700,1,'mana');break;
 case 'A069':buff('mana',650,-3,'spend');buff('mana',2000,3,'refill');break;
 case 'A070':add('mark','source','enemyMana',500,900,'次ターン減少の予約',{shape:'hourglass'});buff('enemyMana',2000,-1,'spend');break;
 case 'A074':for(const a of ['ally0','ally1','ally2','enemy0','enemy1','enemy2'] as Anchor[]){add('swap',a,a,600,1300,'攻撃力と現在体力を交換');add('swap',a,a,2400,1000,'持続終了：交換解除');}break;
 case 'A076':shot('source',card==='DOUBLE_UP'?'enemy0':'opponent',800,'sigil',3);shot('source',card==='DOUBLE_UP'?'enemy0':'opponent',1250,'amplify',3);break;
 case 'A090':if(card==='SHATTER')add('hit','me','me',250,450,'自傷5',{amount:5});for(const [i,a] of (['ally0','ally1','ally2','enemy0','enemy1','enemy2'] as Anchor[]).entries()){add('zone','source',a,700+i*100,1000,card==='MAGMA_RAIN'?'マグマの雨：両陣営':'地震：両陣営',{shape:card==='MAGMA_RAIN'?'flame':'stone'});add('hit',a,a,1100+i*100,500,'範囲命中',{amount:card==='SHATTER'?0:card==='MAGMA_RAIN'?6:4});if(card==='SHATTER')buff(a,1550,1,'sethp');}break;
 case 'A101':for(const a of ['ally0','ally1','ally2'] as Anchor[]){add('charge','rift',a,650,1100,'除外カルから職紋へ流入',{count:2});const role=a==='ally0'?card:a==='ally1'?'CHOSEN_MAGE':'CHOSEN_ARCHER',n=(opt.boost?-1:1)*(['CHOSEN_ARCHER','CHOSEN_ROGUE'].includes(role)?2:1);buff(a,1500,n);if(['CHOSEN_MAGE','CHOSEN_KNIGHT'].includes(role))buff(a,1680,opt.boost?-1:1,'hp');}break;
 case 'A102':shot('ally0','enemy0');for(let i=0;i<2;i++)add('move','hand','rift',1300+i*220,700,'カルを2枚除外',{shape:'card'});buff('ally0',2000,1);buff('ally0',2150,1,'hp');break;
 case 'A103':add('move','rift','shelf',350,700,'カルをリフトから戻す',{shape:'card'});shot('ally0','opponent',1200,'sigil',8);break;
 case 'A104':for(const [i,a] of (['source','ally0','ally1','ally2'] as Anchor[]).entries())add('mark','source',a,300+i*100,1000,'4職の選択候補',{shape:['CHOSEN_KNIGHT','CHOSEN_MAGE','CHOSEN_ARCHER','CHOSEN_ROGUE'][i]});summon('ally0',1500,opt.choice.startsWith('CHOSEN')?opt.choice:'CHOSEN_KNIGHT');break;
 case 'A122':for(let i=0;i<3;i++)charge(('ally'+i) as Anchor,400+i*180,2);for(let i=0;i<3;i++)add('charge',('ally'+i) as Anchor,'source',1700+i*100,800,'気合を集積し全消費',{count:-2});shot('source','opponent',2500,'sigil',24);break;
 case 'A126':if(card==='LAND_GRANT')summon('ally1',850,'TAR2');else add('shield','source','ally0',650,1400,'城にカウンターを増設',{count:5});break;
 case 'A127':for(const a of ['enemy0','enemy1','enemy2'] as Anchor[])add('break',a,'shelf',900,1300,'敵の城条件：相手の場を一掃');add('mark','source','opponent',1900,900,'烙印付与',{shape:'brand'});break;
 case 'A128':add('break','ally0','shelf',350,1000,'騎士を破壊');summon('ally1',1400,'CAVALRY');break;
 case 'A129':if(card!=='MERC_ART')summon();for(let i=1;i<=(card==='MERCENARY'?1:2);i++)summon(('ally'+i) as Anchor,1800+i*240,'SOLDIER2');if(card==='MERC_ART'){for(let i=3;i<5;i++)summon(('ally'+i) as Anchor,2300+(i-2)*220,'SOLDIER2');buff('ally0',3200,3);buff('ally0',3350,3,'hp');}if(opt.boost)add('dice','source','ally0',2350,1500,'カジノ連動：確定した出目を表示',{count:card==='MERC_MASTER'?10:card==='MERC_LEADER'?5:3});if(card==='MERC_MASTER'&&opt.boost){summon('ally3',4100,'SOLDIER2');add('dice','source','ally0',5000,1200,'次の自分ターン開始：兵士1体とダイス10個',{count:10});}break;
 case 'A162':for(const a of ['enemy0','enemy1','enemy2'] as Anchor[])add('mark','source',a,300,1000,'対象候補',{shape:'target'});if(opt.outcome)shot('source','enemy1',1300,'sigil');break;
 case 'A174':add('charge','rift','source',300,1400,'除外カル25枚条件から領域完成',{count:5});add('mark','source','source',1300,1300,'選ばれし領域の成立',{shape:'crown'});add('shot','source','opponent',2250,850,'既存決着演出への受け渡し',{shape:'sigil'});break;
 case 'sort':summon();for(let i=0;i<3;i++)add('move','hand','rift',1300+i*220,650,'カル3枚を除外',{shape:'card'});add('move','hand','rift',2200,650,'常時：追加のカルを除外',{shape:'card'});break;
 case 'quicksort':add('charge','rift','source',300,750,'カル10枚以上：購入条件');add('break','enemy0','shelf',1200,1100,'選んだ相手の場のカードを破壊');break;
 case 'rest':add('charge','rift','source',500,900,'リフトのカル枚数を参照');buff('me',1450,6,'hp');break;
 case 'intercept':summon('ally1',650,'GUNNER');if(opt.boost)summon('ally2',1100,'HEAVY_GUNNER');break;
 case 'budget':add('dice','source','source',350,800,'ダイス2以上で召喚',{count:1});if(opt.outcome)summon('ally1',1250,'SOLDIER2');break;
 case 'quest':add('mark','source','source',600,1000,'クエストの配置と条件接続',{shape:'crown'});if(card==='Q_CASTLE')for(let i=0;i<3;i++)summon(('ally'+i) as Anchor,1700+i*250,'INFKNIGHT');break;
 default:throw new Error('Unmapped scene '+id+'/'+card);
 }
 if(card==='MERC_ART')for(const e of events)if(e.kind==='summon')e.from='ally0';
 if(cards[card]?.t==='mon'&&events.some(e=>e.kind==='summon'&&e.to==='ally0'))for(const e of events){if(e.from==='source'&&e.at>=1500){e.from='ally0';if(e.kind==='summon')e.at=Math.max(e.at,1950);}}
 return {id,card,family,title:families.find(f=>f.id===id)?.name||cues.find(c=>c.id===id)?.name||id,events,duration:Math.max(...events.map(e=>e.at+e.duration))+350,note:(cards[card]?.textJa||'')+(card==='AHEUK'?' 【監査注記】本文と実処理に不一致。現在のengineでは空盤面時に合計−2。この試作は実処理を表示。':'')};
}
