export const DURATION=2800;
export const cards=[['ASSASSIN1','初級アサシン'],['ASSASSIN2','中級アサシン'],['ASSASSIN3','上級アサシン'],['ASSASSIN4','ナイトロード'],['ASSASSIN_SQUAD','アサシンスカッド']] as const;
export const designs=[
 {name:'影織りの帰還',en:'SILK / REFORM',note:'絵柄と枠が一続きの黒い帯へ細まり、しなった面がほどけて実体に戻る。'},
 {name:'暗襲の一閃',en:'EDGE / FLASH',note:'カードそのものが一筋の刃影へ圧縮。一閃の鋭いピークから、すばやく面が開く。'},
 {name:'濡影の浮上',en:'INK / SURFACE',note:'絵柄が粘る黒い影へ潰れ、濡れた反射を保ったまま輪郭からカードへ戻る。'},
 {name:'煙影の凝集',en:'SMOKE / GATHER',note:'面がほぐれて曲がる煙影になる。残った筋から密度が戻り、絵柄がつながる。'},
 {name:'銀縁の潜行',en:'VEIL / REVEAL',note:'絵柄が薄れ、元の枠と装甲の細部だけが残る。表面を走る境界から姿が戻る。'},
 {name:'三影の帰陣',en:'STREAMS / CONVERGE',note:'同じ面が三筋の影流へほどけ、時間をかけて一枚へ戻る。スカッドは五筋。'}
];
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
export const rank=(id:string)=>id==='ASSASSIN4'?1.32:id==='ASSASSIN3'?1.14:id==='ASSASSIN2'?1:id==='ASSASSIN_SQUAD'?1.16:.82;
