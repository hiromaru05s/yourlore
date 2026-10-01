import {DB} from '../../shared/cards';
export const DURATION=3600;
export const demons=['TDE1','TDE2','TDE3','TDE4'] as const;
export type Demon=typeof demons[number];
export interface Study {name:string;note:string;material:string;}
export const studies:Record<Demon,Study[]>={
 TDE1:[
  {name:'影縫いの侵入',note:'細い縦傷へカードが畳まれ、黒い膜を左右へ押し開いて忍び出る。',material:'裂ける薄膜'},
  {name:'底なしの浮上',note:'絵柄が黒い液体へ沈み、縁から垂れる魔力を引き上げて姿を結ぶ。',material:'粘る黒泥'},
  {name:'夜翼の繭',note:'カードの両端が翼状の膜となって閉じ、片翼ずつほどける。',material:'折り重なる翼膜'},
 ],
 TDE2:[
  {name:'枷砕きの顕現',note:'枠から伸びた重い鎖がカードを締め、召喚の圧で中央から引きちぎれる。',material:'黒鉄の鎖'},
  {name:'黒曜の鎧門',note:'絵柄ごと黒曜の装甲片へ分節し、重い板がせり合いながら実体に戻る。',material:'厚い黒曜板'},
  {name:'双刃の開闢',note:'カードの対角線から二枚の黒刃が抜け、交差した封を切り開く。',material:'鋭い影の刃'},
 ],
 TDE3:[
  {name:'三爪の破封',note:'内側から三本の爪痕が走り、表面の黒い皮膜が裂けてめくれる。',material:'裂ける皮膜'},
  {name:'脈動する魔胎',note:'黒い筋束がカードへ食い込み、二度の脈動を経て外へ反り返る。',material:'収縮する魔力の筋'},
  {name:'獄炎の噴出',note:'絵柄の明暗から黒い炎が立ち上がり、鋸状の火舌が上へ千切れる。',material:'厚い黒炎'},
 ],
 TDE4:[
  {name:'冥府の王門',note:'カードそのものが巨大な二枚扉へ折れ、内側の暗黒から魔王が顕現する。',material:'刻印された重い扉'},
  {name:'黒冠の降臨',note:'枠の魔力が五本の冠角へ育ち、上から垂れる黒衣がカードへ収束する。',material:'黒冠と王衣'},
  {name:'日蝕の玉座',note:'絵柄が渦巻く暗黒へ圧縮され、偏った光の縁を押し退けて再び現れる。',material:'圧縮された暗黒'},
 ]
};
export function title(id:Demon){return DB[id].nameJa||DB[id].name;}
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function ease(a:number,b:number,x:number){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
export function phase(ms:number){return ms<550?'予兆':ms<1200?'黒化':ms<1950?'変質':ms<2850?'顕現':ms<3300?'着地':'余韻';}
