export const DURATION=3400;
export const ids=['MERCH1','MERCH2','DARK_MERCHANT'] as const;
export type Merchant=typeof ids[number];
export const names=['見習い商人','王都の商売人','闇商人'];
export const designs=[
 {name:'金綴じの帳簿',en:'01 / GILDED LEDGER',note:'絵柄を載せた紙面が背から湾曲。重なる薄い頁と箔押しの勘定線が、順に閉じて一枚へ戻る。',material:'紙・革・金箔',hit:2350},
 {name:'鋳金の契り',en:'02 / COIN RELIEF',note:'カードの絵柄が十二枚の金貨へ連続して打ち出される。厚い側面を見せて旋回し、同じ絵柄へ鋳戻る。',material:'打刻した金属',hit:2440},
 {name:'絹札の荷解き',en:'03 / SILK UNFURL',note:'印刷面が織り目のある絹へ変わり、三本の帯が時間差でたわむ。張力が抜けると枠の四辺が揃う。',material:'絹・金糸',hit:2500},
 {name:'天秤の商約',en:'04 / COUNTERWEIGHT',note:'中央の細い軸を残し、左右の絵柄が秤皿のように釣り合う。重い側から収まり、継ぎ目が封じられる。',material:'真鍮・彫金',hit:2530},
 {name:'金庫の解錠',en:'05 / VAULT MECHANISM',note:'カードの絵柄を載せた厚い象嵌扉が、蝶番を支点に開く。金属の枠へ二枚の扉が順に噛み合う。',material:'黒鉄・象嵌',hit:2400},
 {name:'夜市の開帳',en:'06 / MARKET CANOPY',note:'カード上部が天幕となり、左右の絵柄が幕のように引かれる。襞がほどけてカード面へ収束する。',material:'天幕・細い金縁',hit:2600},
];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const envelope=(t:number,a=.28,b=1.05,c=1.65,d=2.6)=>ease(a,b,t)*(1-ease(c,d,t));
export function motion(v:number,ms:number,reduced=false){const hit=designs[v].hit;return{hit,lift:reduced?0:.24*(1-ease(hit-650,hit,ms)),active:reduced?0:envelope(ms/1000)};}
