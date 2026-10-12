import {DB} from '../../shared/cards';
export const ids=['HALF_ELF','ELF','DARK_ELF','HIGH_ELF','ELDER_ELF_KING','WORLD_TREE','VITAL2','VITAL3'] as const;
export type Id=typeof ids[number];
export const DURATION=4200;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function ease(a:number,b:number,x:number){const p=clamp((x-a)/(b-a));return p*p*(3-2*p);}
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank:Record<Id,number>={HALF_ELF:0,ELF:1,DARK_ELF:2,HIGH_ELF:3,ELDER_ELF_KING:4,WORLD_TREE:4,VITAL2:0,VITAL3:2};
export const names:Record<Id,string[]>={
HALF_ELF:['若葉の目覚め','木漏れ日の綾','双葉の迎え'],
ELF:['翠葉の開花','月織りの顕現','枝紋の聖域'],
DARK_ELF:['夜棘の脱殻','黒月の裂帛','逆棘の玉座'],
HIGH_ELF:['銀葉の聖冠','白銀の光織門','結晶樹の宮殿'],
ELDER_ELF_KING:['千葉の戴冠','王衣の降臨','王樹の即位'],
WORLD_TREE:['根幹の覚醒','天蓋の展葉','琥珀の樹液'],
VITAL2:['祈りの芽吹き','一葉の庇護','聖露の祝福'],
VITAL3:['絡根の守り','葉盾の展開','樹液の鎧']};
export const notes:Record<Id,string[]>={
HALF_ELF:['カードの葉脈が芽になり、小さな二枚の葉が開く。','カードの絵柄を細い光布に写し、一度ひるがえって戻す。','両側の枠から枝が伸び、若葉が足元へ収まる。'],
ELF:['絵柄に走る葉脈が厚い葉の繭となり、四方へほどける。','銀緑の絵柄を帯に織り込み、左右の帷を開いて顕現。','枠から伸びた枝が背後で交わり、表面へ紋様を戻す。'],
DARK_ELF:['黒紫の葉がカードを封じ、棘の先から裂けて脱殻する。','絵柄を映す黒い帛が斜めに裂け、欠けた月の形へ反る。','下端から逆向きの棘が生え、黒い玉座が背後に沈む。'],
HIGH_ELF:['透ける銀葉の繭を長く溜め、三叉の冠へ開く。','絵柄を宿した白銀の二重帷が折れ、尖頭の門を開く。','細い結晶枝と薄い葉が宮殿の尖塔を作り、枠へ還る。'],
ELDER_ELF_KING:['厚い金緑の葉を二重に重ね、五叉の大冠と王衣へ展開。','金糸の王衣にカードの絵を織り、三層を順に開いて降臨。','根の座から大樹の背凭れが育ち、王冠を結んで重く着地。'],
WORLD_TREE:['カードの樹皮に亀裂が灯り、太い根と分岐した幹が伸びる。','カードから大きな葉の天蓋が開き、枝先から順に還る。','琥珀の樹液がカードの縦筋を満たし、樹皮の殻から実体が現れる。'],
VITAL2:['カードの足元から芽が伸び、小さな祈りの枝を結ぶ。','頭上に一枚の大葉が開き、葉脈の光がカードへ降りる。','表面に溜まる樹液が一つの露へ凝り、輪郭へ戻る。'],
VITAL3:['根がカードの両脇へ編まれ、厚い守護の支柱になる。','左右の葉盾がカードを包み、前後差をつけて開く。','樹液が表面を鎧の板に変え、両脇へ割れて姿を現す。']};
export const dewNames=['葉先の一滴','肖像への還流','雫槽の結露','根脈の導水','花杯の受露'];
export const dewNotes=['発生カードの葉先に凝った一滴が、雫欄へ飛んで合流。','発生カードの樹液が肖像の縁を巡り、雫欄へ流れ込む。','雫欄の内側に水面が生まれ、結露がまとまって増加を示す。','カードの下端から細い根脈が伸び、雫欄へ水が走る。','肖像の上に花杯が開き、受けた露を雫欄へ注いで閉じる。'];
export const condition=(id:Id)=>({HALF_ELF:'追加の召喚条件なし',ELF:'雫4以上 / 召喚時 +2',DARK_ELF:'雫4以上・他のエルフ不在 / 雫4消費',HIGH_ELF:'雫10以上 / 召喚時 雫2倍',ELDER_ELF_KING:'雫12以上 / 召喚時 雫3倍',WORLD_TREE:'雫8以上 / ターン開始時 +3',VITAL2:'召喚時のダイス5以上で 雫+1',VITAL3:'世界樹・エルフ系のプレイで 雫+1'}[id]);
