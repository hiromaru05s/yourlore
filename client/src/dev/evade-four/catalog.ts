export const DURATION=700;
export const CYCLE=1700;
export const WIDTH=180;
export const HEIGHT=281.25;
export const cards=['CHOSEN_ROGUE','CHOSEN_ARCHER','HIGH_ELF','DRAGON_RIDER','ANTIQUE_DK','ASSASSIN4','HEXER4'] as const;
export const designs=[
 {name:'銀縁の瞬歩',en:'SILVER SLIP',note:'重心を逆へ溜め、一息で横へ。銀の縁と薄い残身が、移動の最後を追う。',timing:'80ms 溜め → 180ms 急加速 → 360ms 見切り → 700ms 復帰'},
 {name:'弧身の見切り',en:'TORSION',note:'カード面を一枚のまま弓なりにひねる。先端と裾が遅れて返り、攻撃の軸を外す。',timing:'110ms 端の予兆 → 300ms 最大ひねり → 520ms 返し → 700ms 復帰'},
 {name:'水鏡の偏位',en:'REFRACTION',note:'輪郭を保った水膜が面を横切る。絵柄と反射が違う速度で流れ、元の位置へ戻る。',timing:'90ms 膜の立ち上がり → 320ms 屈折の峰 → 570ms 波の収束 → 700ms 復帰'},
 {name:'影潜り',en:'SHADOW DIVE',note:'表面が足元の影へ薄く沈み、低く滑る。明るい輪郭から同じ絵柄が立ち戻る。',timing:'100ms 影を含む → 300ms 沈潜 → 480ms 浮上 → 700ms 復帰'},
] as const;
export const sat=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,x:number)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
export function phase(ms:number,success=true){return ms<DURATION?(success?(ms<100?'予兆':ms<390?'回避': '戻り'):'回避判定'):success?'攻撃無効':ms<1580?'通常攻撃':'復帰';}
