import {DB} from '../../shared/cards';
export const ids=['MIMIC_LORD','AWAKENED_MIMIC','MIMIC_KING','MIMIC_KING2','ORIGIN_MIMIC'] as const;
export type FamilyId=typeof ids[number];
export const descriptions:Record<FamilyId,string[]>={
 MIMIC_LORD:['鍵が一度回って顎を解錠。細い舌で横へ探る。','鍵束が扇状に分かれ、上下の顎を揃えて号令する。','鍵を振り上げ、短く噛んでから不敵に口を開く。'],
 AWAKENED_MIMIC:['伏せた顎が一気に開き、太い舌が前へ鞭のように伸びる。','左右の爪が順に起き、舌が大きく巻き上がる。','爪で踏み込み、斜めの顎から舌を横へ薙ぐ。'],
 MIMIC_KING:['冠の尖塔が立ち上がり、ゆっくり大口を開いて王の威厳を示す。','巨大な下牙をせり上げ、重い噛み合わせで威嚇する。','冠を傾けて身を捻り、舌と牙で大きな弧を描く。'],
 MIMIC_KING2:['舌先が王冠をすくい上げ、頭上へ運んで戴冠する。','二段の蓋が時間差で開き、王冠を掲げて大きく咆哮する。','舌で王冠を巻き取り、左右へ見せてから胸元へ戻す。'],
 ORIGIN_MIMIC:['琥珀の喉が内側から灯り、結晶の牙と根が目覚める。','喉奥へ根が締まり、琥珀の牙を見せて吸い込むように口が開く。','先に太い根が張り、顎全体が持ち上がる。核の明暗とともに閉じる。'],
};
export const names:Record<FamilyId,string[]>={MIMIC_LORD:['鍵の解錠','鍵束の号令','鍵噛みの笑み'],AWAKENED_MIMIC:['覚醒の一吼','爪の目覚め','踏込みの薙舌'],MIMIC_KING:['王冠の顕現','巨牙の威令','王の旋回'],MIMIC_KING2:['舌先の戴冠','双蓋の咆哮','王冠の戯れ'],ORIGIN_MIMIC:['琥珀の胎動','喉奥の引力','根源の顎']};
export const duration:Record<FamilyId,number>={MIMIC_LORD:3400,AWAKENED_MIMIC:3800,MIMIC_KING:4200,MIMIC_KING2:4500,ORIGIN_MIMIC:4800};
export const currentId:FamilyId=ids.includes(new URLSearchParams(location.search).get('card')as FamilyId)?new URLSearchParams(location.search).get('card')as FamilyId:'MIMIC_LORD';
export const patterns=names[currentId].map((name,i)=>({name,description:descriptions[currentId][i]}));
export const cardInfo=(id:FamilyId)=>({id,name:DB[id].nameJa,cost:DB[id].cost,text:DB[id].textJa});
