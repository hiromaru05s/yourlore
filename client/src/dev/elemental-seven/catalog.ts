import {DB} from '../../shared/cards';
export type Kind = 'cannon' | 'lightning' | 'berserk' | 'arrow' | 'meteor' | 'ball' | 'zone';
export interface Entry {kind:Kind; card:string; name:string; en:string; concept:string; duration:number; hits:number; damage:number; accent:string;}
export const entries:Entry[] = [
 {kind:'cannon',card:'GUNNER',name:'砲撃兵 / 大砲兵',en:'BRASS & BLACK POWDER',concept:'砲身の蓄熱 → 反動と砲煙 → 鉄弾の着弾',duration:3300,hits:1,damage:1,accent:'#dcb78a'},
 {kind:'lightning',card:'T13',name:'落雷',en:'FRACTURED HEAVEN',concept:'帯電するカード面 → 先行放電 → 三連落雷と残留電流',duration:3900,hits:3,damage:12,accent:'#b5bbff'},
 {kind:'berserk',card:'NGA4',name:'剣鬼',en:'CRIMSON CLEAVE',concept:'刃に集まる緋光 → 踏み込み → 鋼の斬撃と切断痕',duration:3000,hits:1,damage:DB.NGA4.atk??8,accent:'#e18e95'},
 {kind:'arrow',card:'FIRE_ARROW',name:'ファイアーアロー',en:'THREE EMBER LANCES',concept:'カード面から三本の炎槍 → 個別に射出 → 三回の着弾',duration:3600,hits:3,damage:1,accent:'#f8be79'},
 {kind:'meteor',card:'FIRE_METEOR',name:'ファイアーメテオ',en:'EIGHT FALLING SUNS',concept:'空へ立ち昇る熱 → 溶岩の核を持つ八つの隕石 → 連続爆燃',duration:5100,hits:8,damage:2,accent:'#ffa06c'},
 {kind:'ball',card:'FIRE_BALL',name:'ファイアーボール',en:'A SUN IN THE PALM',concept:'表面から炎を巻き上げる → 圧縮した火球 → 膨張と燃え残る煙',duration:3400,hits:1,damage:6,accent:'#ffbd73'},
 {kind:'zone',card:'FIRE_ZONE',name:'ファイアーゾーン',en:'FIELD OF CINDERS',concept:'カード面から地表へ流れる炎 → 敵陣全域が同時に噴炎 → 灰燼',duration:4100,hits:4,damage:5,accent:'#ed9b69'},
];
export const entry=(id:string)=>entries.find(e=>e.kind===id)??entries[0];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{const u=clamp(x);return u*u*(3-2*u)};
export const pulse=(t:number,a:number,b:number,c:number)=>ease((t-a)/(b-a))*(1-ease((t-b)/(c-b)));
export const hash=(x:number)=>{const f=Math.sin(x*127.1+311.7)*43758.5453;return f-Math.floor(f)};
export type Point={x:number;y:number};
export type Anchor=Point&{w:number;h:number;el:HTMLElement};
export interface Hit {target:number;at:number;amount:number;}
/** Targets are resolved by the fixture, never randomized by the renderer.
 * Slots 0..2 are enemy monsters, 3 enemy player, 4 an allied monster. */
export function hitPlan(e:Entry,friendly=false,heavy=false,enhanced=false,player=false):Hit[]{
 const indexes=e.kind==='lightning'?[0,4,3]:e.kind==='meteor'?[0,2,3,1,0,3,2,1]:e.kind==='arrow'?[0,2,3]:e.kind==='zone'?[0,1,2,3]:[friendly&&e.kind==='berserk'?4:player?3:1];
 return indexes.map((target,i)=>({target,at:e.kind==='zone'?1850:e.kind==='meteor'?1450+i*285:e.kind==='lightning'?1250+i*650:e.kind==='arrow'?1350+i*430:1550,amount:heavy&&e.kind==='cannon'?2:enhanced&&e.kind==='zone'?9:e.damage}));
}
