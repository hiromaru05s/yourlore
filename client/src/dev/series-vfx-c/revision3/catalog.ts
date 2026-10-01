import {action,implementedIds} from './scenario';
import assignment from './assignment.json';
import {DB,STARTERS} from '../../../shared/cards';
export type Progress='未制作'|'制作中'|'2案再生可'|'要改稿'|'確認済み';
export type Item={id:string;name:string;cardIds:string[];scope?:string;status:Progress;family:string;directions:[string,string];};
const familyFor:Record<string,string>={A086:'S04',A087:'S04',A088:'S04',A089:'S04',A090:'S04',A100:'S12',A101:'S12',A102:'S12',A103:'S12',A104:'S12',A174:'S12',A037:'S08',A038:'S08',A054:'S08',A122:'S08',A067:'S06',A068:'S06',A069:'S06',A070:'S06',A034:'S21',A036:'S21',A126:'S21',A127:'S21',A128:'S21',A129:'S22'};
export const directions:Record<string,[string,string]>={S04:['火脈からほどける炎舌','焼成した金片の剥離'],S12:['武器へ流れ込む銀紫の縫線','試練の石型を割る刃'],S06:['刻線を渡るマナの水路','結晶面の組み替え'],S08:['石の継ぎ目が噛み合う','金属の留め具が締まる'],S21:['鉄の部材を組み上げる','軍旗の折り目を展開する'],S22:['蝋の契約印から招集','金属の契約札から隊列'],combat:['刃の圧力と反動','踏み込みと装甲の剪断'],stat:['刻線から能力印へ流入','能力印の材質を組み替え']};

export const items:Item[]=[...assignment.families,...assignment.cues].map(x=>{const family=x.id.startsWith('S')?x.id:familyFor[x.id]??(['A059','A062','A063','A074','A076'].includes(x.id)?'stat':'combat');return {...x,family,directions:directions[family]??directions.combat,status:implementedIds.has(x.id)?'制作中':'未制作'} as Item});
export const defs={...DB,...STARTERS};
export const item=(id:string)=>items.find(i=>i.id===id)??items[0];
export const cardsFor=(i:Item)=>(i.cardIds.length?i.cardIds:(["A027"].includes(i.id)?['CAVALRY']:i.id==='A162'?['FIRE_BALL']:['A069'].includes(i.id)?['S3']:['SOLDIER2'])).filter(id=>!!defs[id]);
export function mode(i:Item,id:string):string{return action(i,id)}
export const available=(i:Item)=>i.status==='2案再生可'||i.status==='制作中';
export function url(id:string,variant=0,card?:string,trigger?:string){return `/series-vfx-c.html?revision=3&item=${id}&variant=${variant}${card?'&card='+card:''}${trigger?'&trigger='+trigger:''}`}
