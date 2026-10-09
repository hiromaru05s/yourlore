import {DB,STARTERS} from '../../shared/cards';
export const defs={...DB,...STARTERS};
export type Config={cue:string;card:string;variant:number;side:number;outcome:string;reduced:boolean;simultaneous:boolean;background:string;speed:number;loop:boolean;origin?:string;rewardChoice?:string};
export type Op={kind:'arrive'|'depart'|'transfer'|'ability'|'counter'|'collapse'|'reward'|'lock'|'protect'|'dice'|'open';family:string;from:string;to:string;card:string;start:number;duration:number;count?:number;label?:string;delay?:number;rolls?:number[]};
export type Scene={ops:Op[];stages:[number,string][];spawn:Record<string,string>;family:string;result:string};
export function family(id:string){return id.startsWith('S')?id:['A039','A040','A041','A042'].includes(id)?'S23':['A011','A058','A117','A118','A119','A120','A121'].includes(id)?'S07':['A153','A154','A155','A156','A157'].includes(id)?'S24':id==='A152'?'S25':'S15';}
export function scene(cfg:Config):Scene{
 const f=family(cfg.cue),s:Scene={ops:[],stages:[[0,'カードの記録を読む']],spawn:{},family:f,result:'完了'};
 const add=(kind:Op['kind'],from:string,to:string,start:number,duration:number,card=cfg.card,count=1,label='',fam=f)=>s.ops.push({kind,from,to,start,duration,card,count,label,family:fam});
 const mark=(t:number,label:string)=>s.stages.push([t,label]);
 const summon=(target:string,card:string,t=1700)=>{s.spawn[target]=card;add('arrive',target,target,t,1800,card);};
 const exile=(from:string,t=500,card=cfg.card,to='rift')=>add('depart',from,to,t,2800,card,1,'','S15');
 const counter=(target:string,n:number,t=1000)=>add('counter','source',target,t,1600,'ELF',n,'腐敗カウンター','S23');
 const reward=(target:string,label:string,t=3600,card=cfg.card)=>{add('reward','source',target,t,1600,card,1,label);s.result=label;};
 const dice=(n=1,t=450)=>{add('dice','source','source',t,2400,cfg.card,n);const result=cfg.outcome==='miss'?1:cfg.outcome==='two'?3:6;let rolls:number[]=Array.from({length:n},()=>result);if(cfg.card==='LUCKY_CHEST')rolls=cfg.outcome==='miss'?[2,2]:cfg.outcome==='two'?[5,5]:[6,6];if(cfg.card==='GUILD_CHEST')rolls=cfg.outcome==='miss'?[5,6]:cfg.outcome==='two'?[4,4]:[3,4];if(cfg.card==='DUNGEON_FLOOR')rolls=[cfg.outcome==='miss'?1:3];if(cfg.cue==='A156'||cfg.card==='FATE_WHEEL')rolls=[t<3000?1:result];s.ops[s.ops.length-1].rolls=rolls;};
 const key=cfg.cue.startsWith('S')?cfg.card:cfg.cue;
 switch(key){
 case 'A039':case 'DECAY_CRAFT':
  add('ability','source','ally1',400,2000,'ELF',1,'腐敗');add('ability','source','ally2',850,2000,'M4',1,'腐敗');counter('enemy0',1,2100);counter('enemy1',1,2300);counter('enemy2',1,2500);mark(700,'自分2体へ腐敗の攻撃能力を刻む');mark(2700,'敵全体へカウンター1個 — 能力付与とは別処理');s.result='自分2体: 腐敗能力 / 敵全体: カウンター1';break;
 case 'A040':case 'QUICK_POISON':case 'RUST_SLUG':case 'POISON_MASTER':
  if(key==='RUST_SLUG'){counter('enemy0',1,800);counter('enemy1',1);counter('enemy2',1,1200);mark(1000,'召喚時: 敵全体へカウンター1個');}
  else if(key==='POISON_MASTER'){counter('enemy1',3);add('collapse','enemy1','enemyHp',2700,1900,'ELF',3);mark(2500,'ポイズンマスターの攻撃: 一度に3個 → 崩壊');}
  else {const n=key==='QUICK_POISON'||cfg.card==='QUICK_POISON'?2:cfg.outcome==='two'?2:1;counter('enemy1',n);mark(1000,`敵へカウンター${n}個追加`);s.result=`カウンター${n}/3保持（攻撃能力の付与ではない）`;}
  break;
 case 'A041':case 'A042':
  counter('enemy1',1,300);counter('enemy1',2,1100);counter('enemy1',3,2000);add('collapse','enemy1','enemyHp',2900,1700,'ELF',3);mark(300,'蓄積1個');mark(1300,'蓄積2個');mark(2200,'3個到達');mark(3100,'対象破壊 → 持ち主に3ダメージ');s.result='3個到達: モンスター破壊 / 持ち主に3ダメージ';
  if(key==='A042'){const label=cfg.card==='RUST_SLUG'?'最大マナ+1 / 体力+5':cfg.card==='ACID_RAIN'?'敵に烙印+1':cfg.card==='STRONG_ACID'?'敵に追加7ダメージ / 烙印+1':'最大マナ+1';reward(['ACID_RAIN','STRONG_ACID'].includes(cfg.card)?'enemyHp':'mana',label,4200);mark(4400,'腐敗撃破を受けて '+label);}
  break;
 case 'ACID_RAIN':
  add('arrive','source','source',100,1500);add('counter','ally1','enemy1',1300,1600,'ELF',3,'攻撃で3個到達','S23');add('collapse','enemy1','enemyHp',2600,1400,'ELF',3);reward('enemyHp','腐敗撃破 → 烙印+1',4200);break;
 case 'STRONG_ACID':add('arrive','source','source',100,1200);counter('enemy0',2,800);counter('enemy1',2,1000);counter('enemy2',2,1200);add('counter','ally1','enemy1',2400,1200,'ELF',3,'攻撃で3個到達','S23');add('collapse','enemy1','enemyHp',3400,1000,'ELF',3);reward('enemyHp','腐敗撃破 → 7ダメージ / 烙印+1',4400);break;
 case 'ROTTEN_GROUND':add('arrive','source','source',100,1200);summon('ally1','MIMIC',1300);counter('ally1',2,3000);summon('enemy2','MIMIC',1900);counter('enemy2',2,3600);mark(1400,'両者の新規召喚にカウンター2個');s.result='召喚された対象のみ2個付与';break;
 case 'A011':add('open','source','enemy2',200,2400,'STARTER_CHEST');summon('enemy2',cfg.card==='GUILD_CHEST'?'ASSASSIN1':'MIMIC',2700);if(cfg.card==='GUILD_CHEST'){summon('enemy1','ASSASSIN2',3100);summon('enemy3','ASSASSIN3',3500);reward('hp','自分10ダメージ',4200);}mark(2500,cfg.card==='GUILD_CHEST'?'ギルド宝箱の合計11: 敵にアサシン3体':'宝箱の外れ → 相手の場にミミック');s.result=cfg.card==='GUILD_CHEST'?'敵側アサシン3体 / 自分10ダメージ':'敵側ミミック召喚';break;
 case 'A117':case 'AWAKENED_MIMIC':case 'QUICK_MIMIC':case 'DUNGEON_FLOOR':case 'GREED_PRICE':{
  const id=cfg.card;add('open','source','ally1',150,1500);const count=id==='QUICK_MIMIC'?1:id==='DUNGEON_FLOOR'?(cfg.outcome==='miss'?1:3):2;
  if(id==='DUNGEON_FLOOR'){dice(1,0);mark(0,'相手最大マナ7以上 / 自分最大マナ-1（3未満不可）');}
  for(let i=0;i<count;i++)summon('ally'+(i+1),'MIMIC',1600+i*450);
  if(id==='QUICK_MIMIC'||id==='GREED_PRICE')for(let i=0;i<(id==='QUICK_MIMIC'?2:5);i++)add('arrive','rift','rift',3300+i*180,1400,'MIMIC',1,'新規生成','S15');
  mark(1600,`${count}体を召喚`);s.result=id==='QUICK_MIMIC'?'1体召喚 / 新規ミミック2枚をリフトへ':id==='GREED_PRICE'?'2体召喚 / 新規ミミック5枚をリフトへ':`${count}体召喚`;break;}
 case 'A118':case 'MIMIC_KING':add('transfer','rift','source',200,1800,'MIMIC',6,'リフト6枚');add('ability','source','source',1700,1600,cfg.card,1,'強化');summon('ally1','MIMIC2',3300);mark(1800,'リフトのミミック系6枚を参照 → 強化');s.result='6枚以上: マスターミミック召喚';break;
 case 'A119':case 'MIMIC_KING2':add('transfer','rift','source',200,1800,'MIMIC',6);summon('spell','MIMIC_HIDEOUT',2200);mark(1900,'リフトのミミック系6枚以上 → 隠れ家を魔法ゾーンへ');s.result='v54: 隠れ家を展開（旧キング2世の説明は不使用）';break;
 case 'A120':case 'MIMIC_HIDEOUT':add('open','source','ally1',200,1800);summon('ally1','MIMIC2',2100);mark(200,'自分ターン終了・ミミック系がいる条件');s.result='マスターミミック追加召喚';break;
 case 'A121':case 'MIMIC_HUNTER':add('ability','source','source',0,1200);exile('ally1',1100,'MIMIC');exile('enemy1',1600,'MIMIC','enemyRift');mark(1000,'両者の通常ミミックのみ掃討');s.result='通常ミミック2体破壊 / 上級ミミックは残る';break;
 case 'A058':case 'MIMIC2':add('lock','source','chest',500,3500,'STARTER_CHEST');add('lock','source','enemyChest',650,3500,'STARTER_CHEST');mark(600,'マスターミミックがいる間: 両者の宝箱を封鎖');mark(4100,'発生源が退場 → 封鎖解除');s.result='封鎖解除';break;
 case 'A004':add('transfer','market','source',100,1100);if(cfg.card==='QUICK_POISON')counter('enemy1',2,1300);else if(cfg.card==='QUICK_MIMIC'){summon('ally1','MIMIC',1300);for(let i=0;i<2;i++)add('arrive','rift','rift',1700+i*450,1500,'MIMIC',1,'新規生成');}else summon('ally1','DUNGEON',1300);exile('source',3200);mark(100,'購入: マーケットから即発動');mark(1700,'対象へ効果');mark(3200,'効果終了後に除外');break;
 case 'A014':case 'A017':case 'STARTER_TRASH':exile(cfg.cue==='A017'?(cfg.origin==='field'?'ally1':cfg.origin==='hand'?'hand0':cfg.origin||'source'):'source',500,cfg.cue==='A017'&&cfg.origin==='field'?'ELF':cfg.cue==='A017'?'STARTER_TRASH':cfg.card);mark(1000,'カード絵と刻印が同じ物質として変化');mark(2700,'墓地を経由せずリフトへ');s.result='リフト到着';break;
 case 'FOCUS':for(let i=0;i<3;i++)exile(i%2?'deck':'shelf',500+i*500,'STARTER_TRASH');s.result='デッキ/墓地から最大3枚除外';break;
 case 'PURGE_TOUCH':exile('shelf',100,'STARTER_TRASH');add('transfer','deck','hand0',3300,1800,'ELF');reward('hp','自分の烙印を全て除去',3800);break;
 case 'SCRAPPER':exile('shelf',200,'STARTER_TRASH');exile('deck',800,'STARTER_TRASH');reward('mana','コスト1以下2枚を除外 → 最大マナ+1',3900);break;
 case 'A018':case 'Q_RIFT':for(let i=0;i<(cfg.card==='Q_RIFT'?7:cfg.card==='GREED_PRICE'?5:2);i++)add('arrive','rift','rift',400+i*330,1800,cfg.card==='Q_RIFT'?'STARTER_TRASH':'MIMIC',1,'新規生成','S15');mark(400,'リフト内へ新規生成 — 場のカードを移動しない');s.result='リフトのカード数増加';break;
 case 'A019':for(let i=0;i<(cfg.card==='D_BLACK'?3:1);i++)add('transfer',cfg.card==='D_BLACK'?'enemyRift':'rift',cfg.card==='D_BLACK'?'enemyShelf':'shelf',300+i*400,3000,'STARTER_TRASH');mark(300,cfg.card==='D_BLACK'?'相手リフトから最大8枚を相手墓地へ（デモ3枚）':'自分のカル1枚を墓地へ');s.result='墓地へ帰還';break;
 case 'A020':for(let i=0;i<3;i++)add('transfer','enemyRift','rift',300+i*450,3000,'STARTER_TRASH');mark(300,'相手リフト → 自分リフトへ所有側を移送');s.result='自分リフトへ移送';break;
 case 'A051':case 'VOID_RITE':if(cfg.card==='QUICK_REBIRTH'){add('transfer','shelf','ally1',100,1400,'ELF');summon('ally1','ELF',900);add('ability','source','ally1',2300,1100,'ELF',1,'虚無');mark(0,'墓地のコスト7以下モンスターを選択');}else for(const [i,k]of ['ally0','ally1','ally2','enemy0','enemy1','enemy2'].entries())add('ability','source',k,200+i*170,1400,k.endsWith('1')?'ELF':'M4',1,'虚無');mark(3400,'虚無を保持');exile('ally1',3400,'ELF');s.result='破壊時: リフトへ（墓地には戻らない）';break;
 case 'A052':add('protect','source','source',500,2700,'STARTER_MANA');mark(1000,'除外要求を神器が受け止める');s.result='カードを保持・除外しない';break;
 case 'A080':add('protect','source','source',100,1400);for(let i=0;i<3;i++)add('arrive','rift','rift',1700+i*550,1800,'STARTER_TRASH',1,'カル新規生成');mark(1500,'魔法ダメージ3を無効化');s.result='同数のカル3枚をリフトへ生成';break;
 case 'A135':for(let i=0;i<3;i++)exile('hand'+i,300+i*500,'STARTER_TRASH');exile('shelf',2500,'STARTER_TRASH');mark(300,'カル3枚の連続除外');mark(2600,'条件成立 → 追加除外');s.result='順序を保って4枚除外';break;
 case 'A144':for(let i=0;i<(cfg.card==='AMA'?1:4);i++)add('transfer',cfg.card==='AMA'||i===3?'chest':'hand'+i,'shelf',300+i*350,2000,cfg.card==='AMA'||i===3?'STARTER_CHEST':'STARTER_TRASH');if(cfg.card==='AMA')reward('mana','最大マナ+1',3400);if(cfg.card==='HANDRESET')for(let i=0;i<5;i++)add('transfer','deck','hand0',3100+i*200,1300,'ELF');mark(300,'指定/余剰の手札を墓地へ整理');s.result='手札 → 墓地';break;
 case 'A145':for(let i=0;i<4;i++)add('transfer','shelf','deck',300+i*280,2600,['ELF','STARTER_TRASH','MIMIC','STARTER_CHEST'][i],1,'再構築');mark(400,'墓地を束ねる → 交互に組み替える → デッキ');s.result='デッキ再構築';break;
 case 'A152':case 'STARTER_CHEST':case 'LUCKY_CHEST':case 'GUILD_CHEST':{
  add('open','source','source',100,1700);dice(cfg.card==='STARTER_CHEST'?1:2,1800);
  if(cfg.outcome==='miss'){summon('enemy2',cfg.card==='GUILD_CHEST'?'ASSASSIN1':'MIMIC',3500);if(cfg.card==='GUILD_CHEST'){summon('enemy1','ASSASSIN2',3900);summon('enemy3','ASSASSIN3',4300);reward('hp','自分10ダメージ',4300);}s.result=cfg.card==='GUILD_CHEST'?'合計11: 敵に初・中・上級アサシン / 自分10ダメージ':'通常1 / 幸運4: 敵にミミック';}
  else {const lucky=cfg.card==='LUCKY_CHEST',guild=cfg.card==='GUILD_CHEST';const heal=lucky&&cfg.outcome==='hit'||cfg.outcome==='two';reward(heal?'hp':'mana',lucky?(cfg.outcome==='hit'?'合計12: 体力+12':'合計10: 体力+8'):guild?(cfg.outcome==='two'?'合計8: 体力+10':'合計7: 最大マナ+1'):cfg.outcome==='two'?'出目3: 体力+5':'出目6: 最大マナ+1',3800);}
  mark(1800,'開封 → ダイス');mark(3800,s.result);break;}
 case 'A153':case 'GAMBLER':case 'GAMBLE':case 'S1':{
  dice(cfg.card==='GAMBLE'?10:1);const label=cfg.card==='GAMBLER'?(cfg.outcome==='miss'?'出目1: 効果なし':'出目4以上: 最大マナ+1'):cfg.card==='GAMBLE'?(cfg.outcome==='hit'?'10回の合計60: 最大マナ+3':cfg.outcome==='two'?'10回の合計30: 失敗':'10回の合計10: 失敗'):cfg.outcome==='miss'?'出目1: 相手3ダメージ':cfg.outcome==='two'?'出目3: 相手の次ターンマナ-1':'出目6: 相手は次ターンコスト3以下を召喚不可';reward(cfg.card==='S1'?'enemyHp':'mana',label,3500);mark(700,'賽が減速して確定');break;}
 case 'A154':case 'ND3':case 'LEGEND_GAMBLER':{
  const legend=cfg.card==='LEGEND_GAMBLER';add('ability','source','source',0,800,cfg.card,1,legend?'予測3':'相手予測3');dice(legend?3:2,900);const label=legend?(cfg.outcome==='two'?(cfg.rewardChoice==='heal'?'予測的中: 体力+35を選択':cfg.rewardChoice==='destroy'?'予測的中: 敵カード2枚破壊を選択':'予測的中: 最大マナ+4を選択'):'予測不的中'):cfg.outcome==='two'?'相手の予測が出目に一致: 報酬なし':'両方の出目と相手予測が異なる: 最大マナ+4';if(legend&&cfg.outcome==='two'&&cfg.rewardChoice==='destroy'){exile('enemy1',3000,'ELF','enemyShelf');exile('enemy2',3300,'M4','enemyShelf');s.result=label;}else reward(cfg.rewardChoice==='heal'?'hp':'mana',label,3800);mark(100,legend?'自分が予測 → 3個の賽':'相手が予測 → 2個の賽');break;}
 case 'A155':case 'CASINO':add('counter','source','source',0,1400,cfg.card,12,'カジノ12','S24');dice(1,1400);reward(cfg.outcome==='miss'?'hp':'enemyHp',cfg.outcome==='hit'?'相手の最大マナを3に':cfg.outcome==='miss'?'自分30ダメージ':'相手30ダメージ',4200);mark(1400,'12カウンター消費 → カジノダイス');break;
 case 'A156':case 'FATE_WHEEL':dice();add('transfer','source','source',2300,800,cfg.card,1,'前結果を巻き戻す');dice(1,3100);mark(2300,'確定前の結果を巻き戻す');s.result='振り直した結果を採用';break;
 case 'A157':case 'LUCKY_ECHO':case 'Q_CHEAT':dice();if(cfg.card==='Q_CHEAT'||cfg.outcome==='hit')reward(cfg.card==='Q_CHEAT'?'spell':'enemyHp',cfg.card==='Q_CHEAT'?'出目を問わず1個分のクエスト進行':'6の出目 → 相手に6ダメージ',3500);mark(3000,cfg.card==='Q_CHEAT'?'振った個数がクエストを進める':'6の出目だけ連動');break;
 case 'EXILE_NUKE1':case 'EXILE_NUKE2':add('transfer','rift','source',0,2000,'STARTER_TRASH',6);reward('enemyHp',cfg.card==='EXILE_NUKE2'?'リフト6枚 × 2ダメージ':'リフト6枚 × 1ダメージ',2200);break;
 case 'PURGE_ALL':for(let i=0;i<3;i++)exile('hand'+i,300+i*500,'STARTER_TRASH');break;
 case 'CROSSROADS':for(let i=0;i<2;i++)add('arrive','shelf','shelf',500+i*500,1600,'STARTER_TRASH');mark(600,'カル2枚を墓地に生成');break;
 case 'CULL_FLOOD':for(let i=0;i<4;i++)add('arrive','shelf','shelf',200+i*280,1200,'STARTER_TRASH');for(let i=0;i<3;i++)exile(i%2?'deck':'shelf',2100+i*350,'STARTER_TRASH');mark(2200,'墓地にカル4枚 → デッキ/墓地から3枚除外');break;
 case 'CULL_FARM':add('arrive','hand0','hand0',600,2300,'STARTER_TRASH');mark(600,'自分ターン開始 → 手札にカル1枚');break;
 case 'QUICK_SURVIVAL':summon('ally1','DUNGEON',900);mark(0,'購入条件: 自分の体力15以下');s.result='生きているダンジョンを召喚';break;
 case 'MIMIC_LORD':case 'ORIGIN_MIMIC':add('arrive','source','source',100,1400);for(const [i,k]of (key==='MIMIC_LORD'?['ally1','enemy1']:['ally1','shelf','rift']).entries())add('transfer',k,'source',1700+i*280,1800,'MIMIC');add('ability','source','source',3800,1600,cfg.card,1,'強化');mark(1700,key==='MIMIC_LORD'?'自身を除く両者の場: 1体につき+3/+3':'自分の場・墓地・リフト: 1枚につき+2/+2');break;
 case 'DUNGEON':add('arrive','source','source',100,1700);add('lock','source','enemy1',1900,2400,'ELF');mark(1900,'気合・回避のない攻撃モンスター: 攻撃力1');s.result='気合・回避を持つ対象は影響なし';break;
 case 'GEM_RAIN':add('arrive','source','source',100,1400);for(const [i,k]of ['ally0','ally1','enemy0','enemy1'].entries())add('ability','source',k,1600+i*300,2200,'MIMIC',1,'攻撃力+3');mark(1700,'両者のミミック系の攻撃力+3');break;
 case 'PAIN_HARVEST':reward('enemyHp','相手がダメージを受ける',200);for(let i=0;i<2;i++)add('arrive','rift','rift',1900+i*500,2100,'STARTER_TRASH');s.result='新規カル2枚を自分リフトへ';break;
 case 'FURNACE':exile('shelf',700,'STARTER_TRASH');mark(700,'ターン開始: 墓地の最小コスト1枚を除外');break;
 case 'TRIAL_AREA':reward('hp','発動時: 自分6ダメージ',100);add('arrive','shelf','shelf',1500,1300,'STARTER_TRASH');exile('shelf',2800,'STARTER_TRASH');mark(2800,'毎ターン: カル1枚を置く → 最大2枚除外');break;
 case 'VOID_FRUIT':add('reward','rift','hp',500,2700,'STARTER_TRASH',6,'体力+6');s.result='ターン開始: 自分リフト6枚分の体力+6';break;
 case 'VOID_APOSTLE':add('arrive','source','source',0,1600);reward('hp','召喚: 自分13ダメージ',1400);add('transfer','rift','source',1900,1800,'STARTER_TRASH',6);dice(1,2700);if(cfg.outcome==='miss'){add('collapse','source','hp',4400,1400,cfg.card);s.result='出目1: 自分10ダメージ / 自身破壊';}else s.result='除外6枚参照: +6/+6 / 出目1以外は生存';break;
 case 'REFRESH_HAND':add('transfer','deck','hand0',100,1500,'ELF');exile('hand0',1800,'STARTER_TRASH');exile('hand2',2400,'STARTER_TRASH');mark(1800,'1枚ドロー後、手札から最大2枚除外');break;
 case 'RIFT':exile('hand0',200,'STARTER_TRASH');reward('hp','リフト追加に連動: 体力+5',3500);break;
 case 'FREE_REWARD':add('ability','hand0','hand0',100,1200,'STARTER_TRASH',1,'コスト0プレイ');add('transfer','deck','hand1',1700,2300,'ELF');s.result='コスト0のプレイ → 1枚ドロー';break;
 case 'ORIGIN_QUEST':for(let i=0;i<2;i++)add('transfer','deck','hand'+i,800+i*700,2200,'ELF');s.result='場のコスト0カード2枚 → 2枚ドロー';break;
 case 'Q_DECAY':counter('enemy1',3,200);add('collapse','enemy1','enemyHp',2100,1500,'ELF',3);reward('enemyHp','腐敗撃破4回目: 相手30ダメージ',4000);break;
 case 'NO_PAIN':reward('hp','自分がダメージを受ける',0);dice(1,1700);if(cfg.outcome==='hit')reward('mana','出目6: 最大マナ+1',4200);break;
 default:
  add('arrive','source','source',150,2400,cfg.card);mark(500,'カード固有の絵・枠を残して材質が目覚める');
  if(f==='S23'){add('ability','source','source',2500,1700,cfg.card,1,'腐敗');s.result='腐敗能力を持つ召喚';}
  else if(f==='S07'){add('open','source','source',2500,1600);s.result='召喚 / 設置の表面反応';}
  else if(f==='S15'){add('transfer','rift','source',2800,1900,'STARTER_TRASH');s.result='リフト由来の力を受ける';}
  else if(f==='S24'){dice(1,2700);s.result='召喚 → ダイス連動';}
 }
 if(cfg.simultaneous){s.ops.push(...s.ops.filter(o=>['counter','arrive','ability'].includes(o.kind)).slice(0,2).map(o=>({...o,from:'enemy2',to:'enemy2',start:o.start+90})));}
 s.stages.push([6200,s.result]);s.stages.sort((a,b)=>a[0]-b[0]);return s;
}
