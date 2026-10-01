import verification from './verification.json';
import {studies} from './void/material';
import assignment from './assignment.json';
import {DB,STARTERS} from '../../../shared/cards';
export const definitions={...DB,...STARTERS};
export const families=assignment.families;
export const cues=assignment.cues;
export type Theme='mimic'|'chest'|'dungeon'|'void'|'corrosion'|'dice'|'handling';
export interface Recipe {theme:Theme;directions:[string,string];status:'制作中'|'2案再生可'|'要改稿';note:string}
const mimic:Recipe={theme:'mimic',directions:['顎の噛み合わせ','舌の巻き戻し'],status:'制作中',note:'絵の顎と舌を個別マスクで変形。カード枠・数値は実DOMのまま。'};
const chest:Recipe={theme:'chest',directions:['蓋の持ち上げ','前板の展開'],status:'制作中',note:'既存絵の蓋／前板を実際に開き、実エンジンの出目と結果へ接続。'};
export const recipes:Record<string,Recipe>={MIMIC:mimic,MIMIC2:mimic,MIMIC_LORD:mimic,AWAKENED_MIMIC:mimic,MIMIC_KING:mimic,MIMIC_KING2:mimic,ORIGIN_MIMIC:mimic,STARTER_CHEST:chest,LUCKY_CHEST:chest,GUILD_CHEST:chest};
for(const id of ['DUNGEON_FLOOR','GEM_RAIN','GREED_PRICE','QUICK_MIMIC'])recipes[id]={...mimic};
for(const id of ['DUNGEON','QUICK_SURVIVAL'])recipes[id]={theme:'dungeon',directions:['石の牙が噛み合う','坑道が奥へ縮む'],status:'制作中',note:'坑道の上下の岩牙と奥行きを別々に変形。'};
recipes.MIMIC_HIDEOUT={...chest,directions:['親箱の蓋を持ち上げる','前板が開いて子箱へ']};
recipes.MIMIC_HUNTER={theme:'dungeon',directions:['斧の振り下ろし','踏み割りと引き剥がし'],status:'制作中',note:'絵に描かれた斧・壊れた箱を別々に動かす。通常ミミックだけを対象にする現行終了時効果。'};
const diceCards=['GAMBLER','LEGEND_GAMBLER','CASINO','GAMBLE','ND3','FATE_WHEEL','LUCKY_ECHO','NO_PAIN','Q_CHEAT','S1'];
for(const id of diceCards)recipes[id]={theme:'dice',directions:['象牙の賽を投げる','象嵌の面を組み立てる'],status:'制作中',note:'カード絵の賽と台座を起点に変形。能力の出目・予測・振り直しは現行reduceの実結果。'};
for(const id of families.find(f=>f.id==='S23')!.cardIds)recipes[id]={theme:'corrosion',directions:['菌糸が伸び、傘が開く','錆殻が隆起して剥がれる'],status:'制作中',note:'カード絵の菌傘・刃・毒瓶に沿う局所変形。能力付与と敵の腐敗カウンターを別の実エンジン操作で再現。'};
for(const [id,study]of Object.entries(studies))recipes[id]={theme:'void',directions:study.names,status:'制作中',note:'現在のカード絵の物体を個別マスクで変形し、実エンジンの結果へ接続。リフトへの吸収と軌道は既定のまま。'};
for(const id of ['VOID_RITE','QUICK_REBIRTH'])recipes[id]={theme:'void',directions:['黒曜の割れ目が刻まれる','銀の面が重なって定着'],status:'制作中',note:'虚無を得た実カード面へ刻印。能力の付与とリフトへの移送を区別する。'};
for(const id of ['D_BLACK','CHOSEN_MAGE','GM6_1','Q_ASSASSIN','SOLDIER2','TOKEN00','AMA','HANDRESET'])recipes[id]={theme:'handling',directions:['一枚ずつ縁が起きる','重なった面がほどける'],status:'制作中',note:'対象カードの実際の移動元・移動先を使う効果試作。発生源の召喚演出とは別。'};
export function fixed(item:string){return item==='A017'||item==='A018';}
export function directions(item:string,card:string){return card==='QUICK_REBIRTH'?['蘇生した面に一つの裂け目','蘇生した面へ一枚の銀葉']:card==='VOID_RITE'?['一つの裂け目が開いて閉じる','一枚の銀面が覆って定着']:fixed(item)?['既定リフト接続']:item==='A014'?['虚無の裂け目を刻む','銀の接合面が開く']:item==='A052'?['結晶面が除外を受け止める','結晶の層が閉じて保護する']:item==='A144'?['札の縁を一枚ずつ起こす','重なりをほどいて捨てる']:item==='A145'?['棚の札を起こして再構築','扇状にほどいて再構築']:item==='A041'?['菌の浸潤','錆の剥離']:item==='A058'?['鎖が錠に噛み合う','金属の押さえが閉じる']:recipes[card]?.directions||['未制作','未制作'];}
export const cueSources:Record<string,string[]>={A004:['QUICK_MIMIC','QUICK_SURVIVAL','QUICK_POISON','QUICK_REBIRTH'],A145:['ORIGIN_QUEST'],A011:['STARTER_CHEST','LUCKY_CHEST','GUILD_CHEST'],A058:['MIMIC2'],A157:['LUCKY_ECHO','Q_CHEAT','NO_PAIN'],A152:['STARTER_CHEST','LUCKY_CHEST','GUILD_CHEST']};
export const rows=[...families,...cues];
export function sources(id:string){return cueSources[id]||rows.find(r=>r.id===id)?.cardIds||[];}
export function available(id:string,card:string){return !!recipes[card] && (id.startsWith('S')||id==='A011'||id==='A152'||['A153','A154','A155','A156','A157','A039','A040','A041','A042','A058','A117','A118','A119','A120','A121','A004','A014','A017','A018','A019','A020','A051','A052','A080','A135','A144','A145'].includes(id));}
export function needsRevision(id:string,card:string){return card==='VOID_APOSTLE'||card==='VOID_RITE'||card==='QUICK_REBIRTH'||id==='A051';}
export function cardStatus(id:string,card:string){if(needsRevision(id,card))return '要改稿';if(fixed(id))return verification.fixed.includes(`${id}/${card}/1`)?'確認済み':'制作中';const done=(verification.material as Record<string,number[]>)[`${id}/${card}`];return [1,2].every(v=>done?.includes(v))?'2案再生可':available(id,card)?'制作中':'未制作';}
export function status(id:string){const states=sources(id).map(c=>cardStatus(id,c));return states.includes('要改稿')?'要改稿':states.length&&states.every(s=>s==='確認済み')?'確認済み':states.length&&states.every(s=>s==='2案再生可')?'2案再生可':states.some(s=>s!=='未制作')?'制作中':'未制作';}
export const url=(item:string,card:string,variant:number)=>`?revision=3&item=${encodeURIComponent(item)}&card=${encodeURIComponent(card)}&variant=${variant}`;

export function outcomes(item:string,card:string):[string,string][]{
 if(['STARTER_CHEST','LUCKY_CHEST','GUILD_CHEST'].includes(card))return item==='A011'?[['miss','ハズレ・敵召喚']]:[['hit','成功・報酬'],['miss','ハズレ・敵召喚'],['heal','回復']];
 if(['A118','A119'].includes(item))return [['hit','除外6枚で成立'],['miss','除外5枚で不成立']];
 if(item==='A156')return [['hit','振り直す'],['miss','最初の結果を採用']];
 if(item==='A157'&&card==='Q_CHEAT')return [['hit','条件達成'],['miss','進行中']];
 if(item==='A153'&&card==='S1')return [['hit','①② ダメージ'],['miss','③〜⑥ 次ターン妨害']];
 if(['GAMBLE','ND3'].includes(card)||item.startsWith('A')&&recipes[card]?.theme==='dice')return [['hit','条件成功'],['miss','条件不成立']];
 return [['hit','通常']];
}
