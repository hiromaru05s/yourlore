export const DURATION=2700;
export const cards=[['ASSASSIN1','初級アサシン'],['ASSASSIN2','中級アサシン'],['ASSASSIN3','上級アサシン'],['ASSASSIN4','ナイトロード'],['ASSASSIN_SQUAD','アサシンスカッド']] as const;
export const designs=[
 {name:'影布の開帳',en:'SILK / UNVEIL',note:'カードの両端から黒絹が折れ、赤い裏地を返して裾へ収まる。'},
 {name:'抜刀の継ぎ目',en:'STEEL / DRAW',note:'絵柄ごと斜めにせり出す鋼の面。一閃の後、切り口が噛み合う。'},
 {name:'墨影の浮上',en:'INK / RISE',note:'絵柄の下端が粘りのある墨へ伸び、濡れた影からカードが立ち戻る。'},
 {name:'緋帯の解縛',en:'SCARLET / UNBIND',note:'装束に沿う赤い織布が締まり、左右へほどけて細い端に戻る。'},
 {name:'無音の合流',en:'SHADOW / CONVERGE',note:'同じ絵柄の影身が時間差で踏み込み、一枚の実体へ重なる。'},
 {name:'黒刃の折り羽',en:'OBSIDIAN / FOLD',note:'絵柄を残した薄い刃片が扇状に開き、順に折り畳まれて一枚へ戻る。'}
];
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
export const rank=(id:string)=>id==='ASSASSIN4'?1.32:id==='ASSASSIN3'?1.14:id==='ASSASSIN2'?1:id==='ASSASSIN_SQUAD'?1.16:.82;
