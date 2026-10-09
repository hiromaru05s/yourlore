export const DURATION=3400;
export const cards=[['ASSASSIN1','初級アサシン'],['ASSASSIN2','中級アサシン'],['ASSASSIN3','上級アサシン'],['ASSASSIN4','ナイトロード'],['ASSASSIN_SQUAD','アサシンスカッド']] as const;
export const designs=[
 {name:'夜装の解放',en:'MANTLE / UNVEIL',note:'肩口から黒い外套がひらく。重い裾が遅れて返り、緋色の裏地を見せて収まる。'},
 {name:'鋼鱗の抜刀',en:'STEEL / UNSHEATHE',note:'表面を覆う鋼の鱗が順に起きる。硬い反射を走らせ、側面へ引き抜かれる。'},
 {name:'黒漆の脱皮',en:'LACQUER / PEEL',note:'密着した漆膜の端が巻き上がる。曲面の艶を残しながら絵柄が現れる。'},
 {name:'夜霧の実体化',en:'MIST / MATERIALIZE',note:'輪郭にまとった深い霧がねじれながら薄れ、静かにカードの実体へ戻る。'},
 {name:'緋紐の解き目',en:'CORD / RELEASE',note:'織り目のある結びがゆるむ。張力が端へ伝わり、紐がしなってほどける。'},
 {name:'夜鴉の羽衣',en:'FEATHER / UNFURL',note:'重なった羽弁が根元から順に開く。軸と羽筋の光を残して側面へ畳まれる。'}
];
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
export const rank=(id:string)=>id==='ASSASSIN4'?1.32:id==='ASSASSIN3'?1.14:id==='ASSASSIN2'?1:id==='ASSASSIN_SQUAD'?1.16:.82;
