import rows from './manifest.json';
import {DB,STARTERS} from '../../../shared/cards';
export const definitions={...STARTERS,...DB};
const defaults:Record<string,string[]>={A002:['S10'],A003:['E3'],A005:['Q_ASSASSIN'],A022:['BLACK_NOVA'],A163:['RUNE1'],A178:['Q_CASTLE'],A179:['Q_CASTLE']};
export const entries=rows.map(row=>({...row,cards:row.cards.length?row.cards:defaults[row.id]||[]}));
export type Config={item:string;card:string;variant:1|2;side:0|1;outcome:'hit'|'miss';reduced:boolean};
export const readyItems=new Set(entries.map(x=>x.id));
// Playback readiness is separate from visual approval and full-matrix QA.
export const verifiedItems=new Set(entries.map(x=>x.id));
export const blackCards=entries.find(x=>x.id==='S05')!.cards;
export const hexCards=entries.find(x=>x.id==='S11')!.cards;
export const available=(id:string,card:string)=>readyItems.has(id)&&!!definitions[card];
const labels=(id:string)=>['A022','A048','A055','A056','A057','A071','A073','A077','A078','A081','A082','A083','A084','A161','A163'].includes(id)?['面の閉鎖','層の圧着']:id==='S01'?['刃と外套','夜景の重なり']:id==='S17'?['風を受ける外套','擦れた折り目']:id==='S20'?['重装のせり出し','鎧の裂け目']:id==='S28'?['術葉の開き','刻印の屈折']:id==='S29'?['頁の発見','光学の余白']:id==='S13'||['A113','A114'].includes(id)?['紅衣の開帳','血膜の転写']:id==='S14'||id==='A116'?['血筆の払い','杯の液膜']: id==='S11'||['A084','A092'].includes(id)?['呪布の展開','呪糸の縫合']:id==='S05'?['黒鏡の開折','墨膜の脈動']:['頁からの作用','像の転写'];
export const theme=(id:string)=>hexCards.includes(id)?'hex':'black';

export function directions(id:string,card=''){const custom=['A022','A048','A055','A056','A057','A071','A073','A077','A078','A081','A082','A083','A084','A161','A163'];return labels(custom.includes(id)?id:entries.find(e=>e.id.startsWith('S')&&e.cards.includes(card))?.id||id);}
