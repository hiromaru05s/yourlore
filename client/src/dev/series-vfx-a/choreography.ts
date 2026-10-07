import catalog from './catalog.json';
import {DB} from '../../shared/cards';
export type Anchor='source'|'ally'|'ally2'|'enemy'|'hp'|'enemyHp'|'mana'|'enemyMana'|'shelf'|'enemyShelf'|'rift'|'enemyRift'|'deck'|'hand'|'spell'|'quest'|'enemyDeck';
export type Shape='awaken'|'transfer'|'strike'|'seal'|'unseal'|'shatter'|'summon'|'heal'|'cost'|'echo'|'inscribe'|'deny'|'progress'|'reset'|'complete'|'buffAtk'|'buffHp';
export interface Beat {kind:Shape;from:Anchor;to:Anchor;at:number;duration:number;label:string;card?:string;count?:number;}
export interface Scene {id:string;name:string;cardIds:string[];stages?:string;animation?:string;}
export const scenes=catalog as Scene[];
export const families=[
 {id:'S01',name:'影の縫刃',other:'影絹の編成',color:'#8874cf',dark:'#1a1635',light:'#f0dfff',intent:['輪郭に沿う縫い目を開き、短い刃の面へ分解・接合する。','カード面を薄い影絹へほどき、中央の縦目から織り戻す。']},
 {id:'S05',name:'黒鏡の反照',other:'蝕字の墨流',color:'#8870ba',dark:'#170d29',light:'#e9dbff',intent:['黒鏡の硬い反射面が折れて、亀裂に沿って効果を返す。','カード文字の筆跡を芯にした墨膜が、溜めの後に流れ出す。']},
 {id:'S11',name:'転写呪符',other:'縛糸の織呪',color:'#b779c6',dark:'#2f173d',light:'#f6dbff',intent:['細かな呪字を紙面から剥がし、対象面へ順番に押し付ける。','斜めの呪糸が絵柄と枠を一緒に編み、対象まで張り渡される。']},
 {id:'S13',name:'脈枝の系譜',other:'紅膜の肖像',color:'#cc445f',dark:'#3a102b',light:'#ffd6e7',intent:['肖像内の枝状の脈光が分岐し、次段階の肖像へ接続する。','元の肖像を残して紅い薄膜を採り、次の肖像の外形へ定着させる。']},
 {id:'S14',name:'朱筆の代償',other:'心膜の還流',color:'#d43c58',dark:'#390e24',light:'#ffceda',intent:['太い朱の筆致と細い白縁が、支払いと報酬を順に描く。','脈動する液膜を一度圧縮し、代価の接触後に報酬へ広げる。']},
 {id:'S17',name:'孤線の収束',other:'残照の剥離',color:'#658ba1',dark:'#1a2839',light:'#d5f4fa',intent:['外周の傷から一筋の銀青線へ収束し、一体の輪郭を強調する。','傷のある表層を静かに剥がし、残った縦の光だけを戻す。']},
 {id:'S20',name:'裂封の顕現',other:'角鎧の圧印',color:'#9c5bae',dark:'#271329',light:'#edd4ff',intent:['深い亀裂がカード面を押し開き、暗い芯と細い縁を見せる。','角を思わせる左右の鎧面を重く折り畳み、対象の面へ押印する。']},
 {id:'S28',name:'筆順の刻印',other:'折字の術式',color:'#4b92b8',dark:'#142c45',light:'#dbf6ff',intent:['線の筆順を追って術式を刻み、最後の一筆が作用へつながる。','文字列を持つ面が帯状に折れ、二度目の展開で再発動を示す。']},
 {id:'S29',name:'余白の発見',other:'光頁の定着',color:'#b69a59',dark:'#302535',light:'#fff1c8',intent:['余白を掻き出すように面が開き、その奥から記録が現れる。','書頁の細い層を時間差で折り返し、新しいカード面へ重ねる。']},
];
export function familyFor(scene:Scene,id:string){return families.findIndex(f=>f.id===scene.id)>=0?families.findIndex(f=>f.id===scene.id):Math.max(0,families.findIndex(f=>scenes.find(s=>s.id===f.id)?.cardIds.includes(id)));}
const defaults:Record<string,string[]>={A002:['S10','BLACK_CURSE','BLOOD1'],A003:['BLACK_REVERSE','RUNE3','E3'],A005:['Q_ASSASSIN','Q_CASTLE','Q_RIFT'],A022:['ASSASSIN4','HEXER4','BLACK_NOVA'],A163:['BLOOD_SECRET','S8','QUICK_REBIRTH'],A178:['Q_ASSASSIN','Q_CASTLE','Q_RIFT'],A179:['Q_ASSASSIN','Q_CASTLE','Q_RIFT']};
export function cardsFor(s:Scene){return s.cardIds.length?s.cardIds:defaults[s.id]||['S10'];}
const B=(kind:Shape,from:Anchor,to:Anchor,label:string,at=850,duration=1000,card?:string,count=1):Beat=>({kind,from,to,label,at,duration,card,count});
export function plan(s:Scene,id:string,branch='success'):Beat[]{
 const c=DB[id];const begin=B('awaken','source','source','表面が応答',0,550);
 const summon=(card?:string,at=1500)=>B('summon','source','ally','記録が場に定着',at,1150,card||c.evolveTo||'VAMP1');
 const hit=(at=1050)=>B('strike','source','enemyHp','相手へ作用',at,900);
 const heal=(at=2150)=>B('heal','enemyHp','hp','体力を獲得',at,900);
 const cost=B('cost','source','hp',id==='BLACK_NOVA'||id==='FORBIDDEN'?'体力を1にする':'自傷の代価',500,700);
 const seal=(to:Anchor='enemy',label='制限が定着')=>B('seal','source',to,label,950,1350);
 const deny=B('deny','source','source','条件不成立・成功へ進まない',300,1000);
 if(s.id.startsWith('S')){
  const route:Record<string,string>={ASSASSIN4:'A096',ASSASSIN_SQUAD:'A097',GUILD_HALL:'A098',GUILD_HQ:'A099',BLACK_REVERSE:'A079',BLACK_CURSE:'A091',SOUL_HARVEST:'A094',QUICK_CURSE:'A093',HEXER1:'A091',HEXER2:'A091',HEXER3:'A091',HEXER4:'A084',CURSE:'A092',VAMP1:'A113',VAMP2:'A113',VAMP3:'A113',VAMP4:'A113',VAMP5:'A114',VAMP_BUTLER:'A115',VAMP_WARD:'A057',BLOOD_SECRET:'A116',BLOOD_SHIELD:'A078',BLOOD_RITE:'A077',TSO1:'A081',TDE4:'A071',DEMON_REALM:'A055',RUNE3:'A136',S6:'A140',CREATION:'A134'};
  if(route[id])return plan({...s,id:route[id]},id,branch);
  const summonSelf=B('summon','source','source','カードの肖像が実体を持つ',500,1150);
  const draw=(count:number,at=1600)=>B('transfer','deck','hand','デッキから手札に記録を迎える',at,1700,'S10',count);
  const finish=(...b:Beat[])=>[begin,...(c.t==='mon'?[summonSelf]:[]),...b];
  if(id==='ASSASSIN1'||id==='ASSASSIN2'||id==='ASSASSIN3')return finish(B('strike','source','enemyHp','暗襲・プレイヤーに直接命中',2100,1150));
  if(id==='NL_SECRET')return finish(B('seal','source','ally',branch==='alternate'?'回避を付与':'暗襲を付与',650,1100),B('buffAtk','source','ally2','アサシン2体の攻撃力を上げる',1950,1200));
  if(id==='ROGUE_ART')return finish(B('seal','source','ally','回避を付与',800,1400),...(branch==='alternate'?[B('seal','source','ally2','アサシン条件成立・味方全体へ',1100,1400)]:[]));
  if(id==='BLACK_ELSA'||id==='BLACK_ALICE')return finish(B('transfer','source','enemyShelf','召喚に伴う呪いの注入',1700,1600,'CURSE',id==='BLACK_ELSA'?7:2));
  if(id==='BLACK_INFINITY')return finish(seal('hp','魔法ダメージを無効化'),B('deny','enemy','hp','魔法ダメージを受け止める',1750,650),B('transfer','hp','rift','防いだ数だけ新しいカルをリフトへ',2400,1000,'STARTER_TRASH',3));
  if(id==='BLACK_NOVA')return finish(cost,B('reset','source','enemyHp','相手の次のターンを一回スキップ',1800,1400));
  if(id==='NHEX')return finish(B(branch==='alternate'?'deny':'progress','source','source',branch==='alternate'?'条件またはダイス未達成':'自分ターン・ダイス5以上',1650,700),...(branch==='alternate'?[]:[B('transfer','source','enemyShelf','呪い3枚を注入',2450,950,'CURSE',3)]));
  if(id==='QUICK_GRIMOIRE'||id==='NMD6')return finish(B('inscribe','source','hand','手札からの魔法の発動コストを軽減',1600,1600));
  if(id==='VAMP_PACT'||id==='VAMP_PACT2')return finish(cost,B('summon','source','ally','代価を払い吸血鬼を召喚',1500,1600,id==='VAMP_PACT'?'VAMP1':'VAMP2'));
  if(id==='BLOOD1')return finish(cost,draw(6));
  if(id==='BLOOD_JOY')return finish(cost,B('heal','source','hp','自分の体力を獲得',1600,1200),B('heal','source','enemyHp','相手の体力も獲得',1800,1200));
  if(id==='BLOOD_ANGER')return finish(cost,B('buffAtk','source','ally','味方モンスターの攻撃力増加',1600,1250),B('buffAtk','source','enemy','相手モンスターも攻撃力増加',1700,1250));
  if(id==='BLOOD_SORROW')return finish(cost,B('shatter','shelf','rift','墓地の最高コストをリフトへ',1500,1800));
  if(id==='BLOOD_PLEASURE'||id==='BLOOD_FEST')return finish(...(id==='BLOOD_PLEASURE'?[cost]:[B('echo','spell','source','血の魔法に連動',600,800)]),B('transfer','source','mana','自分の最大マナを増加',1650,1550));
  if(id==='TSO2')return finish(...(branch==='alternate'?[B('deny','source','source','他の場札が多く強化不成立',1800,1400)]:[B('buffAtk','source','source','孤立条件・攻撃力強化',1700,1100),B('buffHp','source','source','孤立条件・体力強化',2250,1100)]));
  if(id==='TSO3')return finish(...(branch==='alternate'?[B('deny','shelf','source','墓地にモンスター・ドローなし',1800,1200)]:[draw(6,1650)]));
  if(id==='TSO5')return branch==='alternate'?[deny]:finish(B('seal','source','source','孤独以外の味方がいない条件を示す',1800,1300));
  if(['TDE1','TDE2','TDE3'].includes(id))return finish(B('inscribe','source','mana',id==='TDE3'?'ダイスに応じて最大マナ減少':id==='TDE1'?'自分5ターンの最大マナ減少':'常時の最大マナ減少',1750,1450));
  if(id==='RUNE1')return finish(B('shatter','enemy','enemyShelf','コスト5以上の対象を破壊',850,2050));
  if(id==='RUNE2')return branch==='alternate'?[deny]:finish(B('transfer','source','mana','デッキ半分以上が魔法・最大マナを増幅',850,2100));
  if(id==='ND2')return finish(draw(2,800),B('heal','source','hp','体力3回復',2450,950));
  if(['EROSION','GROWTH'].includes(id))return finish(draw(1,400),B(id==='EROSION'?'strike':'heal','source',id==='EROSION'?'enemyHp':'hp','追加ドロー1枚に連動',2050,1250));
  if(id==='EMPTY_MIND')return branch==='alternate'?[deny]:finish(B('transfer','source','hand','魔法4枚条件・創造を手札へ生成',850,2100,'CREATION'));
  if(id==='BEGINNER_MIND'&&branch==='alternate')return[deny];
  if(c.t==='quest')return finish(B('transfer','source','quest','公開配置と条件を刻む',650,1900));
  const count:Record<string,number>={NMD2:2,M3:1,S10:2,S4:4,DISCOVERY_SMALL:2,DISCOVERY:branch==='alternate'?4:3,DISCOVERY_LARGE:branch==='alternate'?6:4,BEGINNER_MIND:4,GUILD_EYE:1,E3:1,PREPARATION:1};
  if(count[id])return finish(...(c.ench?[B('echo','spell','source','ターン開始の追加ドロー',350,700)]:[]),draw(count[id],c.t==='mon'?1700:1100));
 }
 let beats:Beat[]=[];
 switch(s.id){
 case'A002':{const family=scenes.find(x=>x.id.startsWith('S')&&x.cardIds.includes(id))||scenes.find(x=>x.id==='S29')!;return [...plan(family,id,branch).map(b=>({...b,at:b.at*.77,duration:b.duration*.77})),B('transfer','source','shelf','使ったカードを墓地へ',2850,650)];}
 case'A003':beats=[B('transfer','source','spell','魔法ゾーンに定着',800,1250),B('inscribe','spell','spell','期間・常在の表示',2250,900)];break;
 case'A005':beats=[B('transfer','source','quest','クエストを公開配置',700,1300),B('progress','quest','quest','条件の記録を開始',2250,800)];break;
 case'A009':beats=[B('summon','shelf','ally','墓地から蘇生・虚無を付与',700,1800,'M4')];break;
 case'A015':beats=[B('shatter','enemy',id==='DISARM3'?'enemyRift':'enemyShelf','場の魔法・クエストを除去',700,1900,undefined,id==='DISARM2'?2:1)];break;
 case'A021':beats=[B('shatter','source','shelf','発生源が退場',450,900),B(id==='FIRE_MASTER'?'transfer':'summon','shelf',id==='FIRE_MASTER'?'hand':'ally','破壊後の後続効果',1600,1250,id==='FIRE_MASTER'?'FIRE_BALL':'SOLDIER2')];break;
 case'A022':case'A163':return[deny];
 case'A035':beats=[hit(),heal()];break;
 case'A043':beats=[B('inscribe','source','enemyHp','烙印を付与・蓄積',850,1600,undefined,id==='ASSASSIN4'?3:branch==='alternate'?3:1)];break;
 case'A044':beats=[B('progress','hp','hp','烙印の数だけ判定',550,800,undefined,3),B('cost','hp','hp','判定に応じた自傷',1700,900)];break;
 case'A045':beats=[B('unseal','hp','hp',id==='UNBRANDER'?'烙印を1個解除':'自分の烙印を全解除',550,1600,undefined,id==='UNBRANDER'?1:3),...(id==='UNBRAND'?[B('unseal','enemyHp','enemyHp','相手の烙印も全解除',750,1600,undefined,3)]:[])];break;
 case'A046':beats=[B('strike','source','enemyHp','暗襲・相手プレイヤーへの直撃',900,1100)];break;
 case'A048':beats=[seal('enemy','新規召喚への攻撃制限'),B('unseal','enemy','enemy','威厳の制限解除',2750,750)];break;
 case'A055':beats=[B('unseal','source','ally','自分の魔族の能力・効果を無効化',700,1800)];break;
 case'A056':case'A057':case'A078':beats=[seal(s.id==='A057'?'ally':'hp',s.id==='A078'?'血の魔法の自傷のみ防止':'防止が定着'),B('deny',s.id==='A078'?'source':'enemy',s.id==='A057'?'ally':'hp',s.id==='A078'?'血の魔法の自傷を防ぐ':'損傷を遮り、対象を残す',1950,800),...(s.id==='A056'?[B('unseal','hp','hp','ターン終了で解除',2900,650)]:[])];break;
 case'A066':beats=[cost];break;
 case'A071':beats=[seal('mana','自分の最大マナ増加を封鎖'),B('deny','mana','mana','増加を止める',2150,650),B('unseal','mana','mana','源の退場で解除',2900,650)];break;
 case'A073':beats=[seal('enemyMana','相手マナ消費を3倍にする')];break;
 case'A077':beats=[B('strike','enemy','hp','ダメージが到来',650,700),B('heal','hp','hp','体力獲得へ変換',1500,1400)];break;
 case'A079':beats=[B('strike','enemy','hp','ダメージが到来',550,750),B('echo','hp','enemyHp','結界が被害の向きを反転',1350,1350)];break;
 case'A081':beats=[seal(id==='TSO1'?'ally':'enemy','召喚の条件・場上限を制限'),B('deny','hand',id==='TSO1'?'ally':'enemy','条件外の召喚を戻す',2400,700)];break;
 case'A082':beats=[seal('enemy','攻撃経路の制限'),B('deny','enemy','hp','攻撃は到達しない',2250,850)];break;
 case'A083':beats=[seal('enemy','魔法使用を制限'),B('deny','enemy','source','使用条件外を止める',2250,800)];break;
 case'A084':beats=branch==='alternate'?[B('progress','source','source','ダイス1〜2・魔法は通る',700,700),B('transfer','enemy','hp','無効化不成立',1750,1000)]:[B('progress','source','source','ダイス3以上',650,700),B('shatter','enemy','enemyShelf','魔法を打ち消す',1550,1300)];break;
 case'A085':beats=[B('inscribe','source','enemyHp','次ターンのスキップを予約',750,1200),B('reset','enemyHp','enemyHp','対象ターンを飛ばす',2300,900)];break;
 case'A091':beats=[B('transfer','source','enemyShelf','呪いを相手墓地に注入',750,2000,'CURSE',({BLACK_CURSE:5,BLACK_ELSA:7,BLACK_ALICE:2,HEXER1:3,HEXER2:4,HEXER3:5} as Record<string,number>)[id]||3)];break;
 case'A092':beats=[cost,B('transfer','source','shelf','使った呪いを戻す',1900,850)];break;
 case'A093':beats=[B('echo','enemyRift','source','リフトの呪いを参照',500,700,'CURSE'),B('transfer','source','enemyShelf','新しい呪いを生成',1550,1500,'CURSE')];break;
 case'A094':beats=[B('transfer',id.startsWith('EXILE')?'rift':'enemyShelf','source','参照する記録を集積',500,1000),hit(1750)];break;
 case'A095':beats=[B('echo','spell','source','黒魔法に連動',500,1000),B('inscribe','source',id==='BLACK_ELSA'?'enemyHp':'mana',id==='BLACK_ELSA'?'烙印を追加':'マナを獲得',1800,1300)];break;
 case'A096':beats=[B('summon','source','source','ナイトロード降臨',450,1400),B('inscribe','source','enemyHp','烙印3個を刻む',2000,1200,undefined,3)];break;
 case'A097':beats=[summon('ASSASSIN2'),B('seal','source','ally2','味方全体に回避を付与',2450,800)];break;
 case'A098':beats=[B('inscribe','ally','source','命中を蓄積・3個到達',650,1000,undefined,3),hit(2050)];break;
 case'A099':beats=branch==='alternate'?[B('complete','source','deck','ターン開始・ナイトマーケット開店',950,1700)]:[B('strike','ally','enemyHp','アサシンが命中',450,850),B('inscribe','source','enemyHp','本部連動の烙印',1700,1200)];break;
 case'A113':beats=[B('echo','spell','source','血の魔法に反応',450,850),summon()];break;
 case'A114':beats=[B('summon','source','source','特級吸血鬼の顕現',300,1100),hit(1500),heal(2450)];break;
 case'A115':beats=[B('inscribe','source','source','攻撃3回の蓄積',450,900,undefined,3),summon('VAMP1')];break;
 case'A116':beats=branch==='alternate'?[cost,B('deny','source','ally','破壊防止・代価未払い、報酬なし',1550,1300)]:[cost,B('shatter','ally','shelf','吸血鬼を生贄にする',1300,900),B('heal','shelf','hp','支払い後に体力を得る',2450,900),B('transfer','shelf','mana','支払い後に最大マナを得る',2450,900)];break;
 case'A134':beats=[B('transfer','deck','hand','1枚ドロー',350,900),B('heal','source','hp','体力を回復',1300,750),B('transfer',branch==='alternate'?'enemyDeck':'source','shelf',branch==='alternate'?'リフト条件達成・相手カードを複製':'創造を墓地に生成',2200,1200,branch==='alternate'?'M4':'CREATION')];break;
 case'A136':beats=[B('transfer','spell','enemy','最初の魔法が解決',450,1000),B('echo','source','spell','ルーンが再発動を刻む',1600,700),B('transfer','spell','enemy','マナなしで一度再発動',2450,900)];break;
 case'A139':beats=[B('transfer','deck','hand','デッキから手札へ',700,2000,'S10',id==='DISCOVERY_LARGE'?(branch==='alternate'?6:4):id==='DISCOVERY'?(branch==='alternate'?4:3):2)];break;
 case'A140':beats=[B('progress','deck','deck','デッキ内から選択',450,900),B('transfer','deck','hand','選んだカードを手札へ',1650,1300,'S10')];break;
 case'A141':beats=[B('transfer','shelf','hand','墓地から回収',700,2000,'M4')];break;
 case'A142':beats=[B('transfer','hand','shelf','手札を全て捨てる',450,1000,undefined,3),B('transfer','deck','hand','新しい5枚を引く',1700,1650,'S10',5)];break;
 case'A143':beats=[B('transfer','source',id==='CULL_FARM'?'hand':id==='BLACK_CURSE'?'enemyShelf':'shelf','新しいカードを生成',700,2000,id==='BLACK_CURSE'?'CURSE':id==='CULL_FARM'?'STARTER_TRASH':'CREATION')];break;
 case'A158':beats=[B('echo','spell','source','永続魔法の発動元を示す',450,900),B(id==='EROSION'?'strike':'heal','source',id==='EROSION'?'enemyHp':'hp','対象効果へ接続',1750,1300)];break;
 case'A159':beats=[B('progress','spell','spell','残り期間が減る',400,750),B('shatter','spell','shelf','満了して墓地へ',1350,900),B('transfer','spell',id==='E3'?'mana':'hand',id==='E3'?'翌ターンの最大マナ増加':id==='BREWING'?'蓄積分のワインを手札へ':'最大マナ減少・選んだ卵を手札へ',2400,1000,id==='BREWING'?'WINE':id==='ANCIENT_CIV'?'DRAGON_EGG':undefined)];break;
 case'A160':beats=[B('echo','source','source','ターン境界で発動',500,750),B(id==='GM5_3'?'strike':id==='WORLD_CARE'?'inscribe':'summon','source',id==='GM5_3'?'enemyHp':id==='WORLD_CARE'?'hp':'ally',id==='WORLD_CARE'?'雫1を獲得（保持表示へ接続）':'カード固有の後続効果',1550,1400,'SOLDIER2')];break;
 case'A161':beats=branch==='alternate'?[B('deny','source','source','使用回数上限に到達',650,1400)]:[B('complete','source','source','条件が成立・使用可能',650,1400)];break;
 case'A164':case'A167':case'A168':case'A169':beats=[B('echo','ally','source','異なる種族カードが接続',450,1100),B('echo','ally2','source','種族の段階成立',650,1000),seal(s.id==='A169'?'enemyMana':'enemy',s.id==='A164'?'相手の場上限2体':s.id==='A167'?'相手魔法2枚まで':s.id==='A168'?'相手魔法使用不可':'相手マナ消費3倍')];beats[2].at=2100;break;
 case'A175':beats=[B('reset','spell','spell','期限到達・シナジー未成立',700,1300),B('shatter','spell','hp','敗北確定の接続点（結果演出は既存担当）',2200,900)];break;
 case'A176':beats=branch==='alternate'?[cost,B('deny','source','source','ダイス4以下・召喚なし',1600,1000)]:[cost,B('progress','source','source','ダイス5以上',1300,700),summon('TDE1',2200),B('summon','source','ally2','不足種族を同時に召喚',2300,1000,'TDE2')];break;
 case'A178':beats=[B('progress','source','quest','条件達成・進捗を一段刻む',700,1900)];break;
 case'A179':beats=[B('complete','quest','quest','目標を達成',550,1250),B(id==='Q_ASSASSIN'?'shatter':id==='Q_RIFT'?'transfer':'summon',id==='Q_ASSASSIN'?'enemy':'quest',id==='Q_ASSASSIN'?'enemyRift':id==='Q_RIFT'?'rift':'ally','クエストの報酬に接続',2100,1300,id==='Q_CASTLE'?'INFKNIGHT':'STARTER_TRASH',id==='Q_CASTLE'?3:id==='Q_RIFT'?7:1)];break;
 case'A180':beats=[B('shatter','ally','shelf','城が場から消える',400,1000),B('reset','quest','quest','継続条件を失い進捗0へ',1750,1300)];break;
 default:
 if(c.t==='mon')beats=[B('summon','source','source','肖像が実体を持つ',600,1600),...(c.evolveTo?[summon(c.evolveTo,2350)]:[])];
 else if(id.startsWith('BLOOD'))beats=[cost,B(id==='BLOOD_ANGER'?'inscribe':id==='BLOOD_PLEASURE'?'transfer':id==='BLOOD_SORROW'?'shatter':'heal',id==='BLOOD_SORROW'?'shelf':'source',id==='BLOOD_ANGER'?'ally':id==='BLOOD_PLEASURE'?'mana':id==='BLOOD_SORROW'?'rift':'hp','血の魔法の報酬',1550,1450)];
 else if(c.t==='quest')beats=[B('transfer','source','quest','クエストを設置',650,1600)];
 else if(c.ench)beats=[B('transfer','source','spell','場に術式を定着',650,1700)];
 else if(id.includes('CURSE'))beats=[B('transfer','source','enemyShelf','呪いを注入',650,1800,'CURSE')];
 else if(id==='BLACK_NOVA')beats=[cost,B('reset','source','enemyHp','次ターンを飛ばす',1800,1300)];
 else beats=[B('transfer','deck','hand','記録を手札へ迎える',800,1900,'S10')];
 }
 return [begin,...beats];
}
export const DURATION=3900;
