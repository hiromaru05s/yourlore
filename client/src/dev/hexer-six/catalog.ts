export const cards = ['NHEX','HEXER1','HEXER2','HEXER3','HEXER4'] as const;
export type Id = typeof cards[number];
export const names = ['見習い呪術師','初級呪術師','中級呪術師','上級呪術師','ケロイド'];
export const designs = [
 {name:'黒蝋の封解',en:'THE BROKEN SEAL',note:'絵柄の上を薄い黒蝋が伝い、亀裂を境に反り返る。重い蝋片が四辺へ溶け戻る。',material:'黒蝋 / 彫刻 / 低い反射'},
 {name:'呪糸の抜縫',en:'THE UNSTITCHING',note:'カード枠から伸びた銀紫の糸が面を縫い留める。張力を溜め、一針ずつ抜けて枠へ帰る。',material:'撚り糸 / 張力 / 細い金属光'},
 {name:'影絹の脱皮',en:'THE SHADOW SHROUD',note:'カードの左右から薄絹が沿って被さり、滑らかにめくれる。透ける襞が細い裾へほどける。',material:'薄絹 / 透過 / 波打つ襞'},
 {name:'呪脈の還流',en:'THE RETURNING VEINS',note:'カード面の細い溝から黒い呪液が盛り上がる。枝分かれした脈が、先端から面へ吸い戻る。',material:'黒い呪液 / 濡れた芯 / 毛細管'},
 {name:'黒曜の開扉',en:'THE OBSIDIAN FOLIO',note:'表面の細長い黒曜層が厚みを持ち、左右へ開く。薄片が順に折り畳まれ、枠へ沈む。',material:'黒曜石 / 切断面 / 狭い稜線'},
 {name:'呪札の折解',en:'THE FOLDED VOW',note:'枠の紋様が細い呪札へ伸び、四隅から面を封じる。折り目が連鎖し、札が枠へ収まる。',material:'古い繊維紙 / 架空の文字 / 折り目'},
];
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
export const duration=(id:Id)=>[2600,2900,3150,3400,3700][cards.indexOf(id)];
export function motion(id:Id,ms:number,reduced=false){const t=clamp(ms/duration(id)),level=cards.indexOf(id);const fall=clamp((t-.58)/.18);return {t,level,height:reduced?0:(44+level*5)*ease(0,.14,t)*(1-fall*fall),grow:reduced?0:ease(.1,.34,t),open:reduced?1:ease(.40,.70,t),return:reduced?1:ease(.68,.92,t),contact:.76*duration(id)};}
