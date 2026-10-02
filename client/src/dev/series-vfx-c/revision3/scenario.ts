import {DB,STARTERS} from '../../../shared/cards';
import type {Item} from './catalog';
const defs={...DB,...STARTERS};
export function action(i:Item,id:string):string{
 if(i.id==='A100')return 'chosen-summon';if(['A086','A087','A088','A089'].includes(i.id))return id.replace('FIRE_','fire-').toLowerCase();if(!i.id.startsWith('S'))return i.id;
 if(i.id==='S04')return id==='FIRE_MASTER'?'fire-summon':id==='FIRE_ART'?'fire-discount':id.replace('FIRE_','fire-').toLowerCase();
 if(i.id==='S12')return ({CHOSEN_AREA:'A174',COLOSSEUM:'A104',COLOSSEUM_REST:'chosen-heal',SORTER:'sorter-summon',QUICK_SORT:'quick-sort'} as Record<string,string>)[id]??'chosen-summon';
 if(i.id==='S21')return ({EXPANSION:'A126',TREASON:'A127',STABLE:'A128',REINFORCE:'A012',LEVY:'A007',QUICK_MUSTER:'A007',ADVANCE:'A059',INTERCEPT:'intercept',BUDGET:'budget',Q_CASTLE:'castle-reward',Q_TOWN:'town-reward'} as Record<string,string>)[id]??'S21';
 return i.id;
}
export function ownCards(i:Item,id:string,condition:boolean,choice='CHOSEN_KNIGHT',trigger='summon'):string[]{
 const a=action(i,id),mon=defs[id]?.t==='mon';
 if(id==='S3')return ['SOLDIER2','INFKNIGHT','MANA_GIANT','GOLEM1'];
 if(id==='Q_TOWN')return ['SOLDIER2','CASINO','INFKNIGHT','GOLEM1'];
 if(i.family==='S08')return id==='VITAL4'?['VITAL4','SOLDIER2','INFKNIGHT','GOLEM1']:[mon?id:'GOLEM1',condition?'GOLEM2':'INFKNIGHT',condition?'NWL3':'ELF','SOLDIER2'];
 if(i.family==='S12')return [mon?id:choice,'CHOSEN_MAGE','CHOSEN_ARCHER','CHOSEN_ROGUE'];
 if(i.family==='S22'){const art=id==='MERC_ART',count=art?4:trigger==='turn-start'||id==='MERCENARY'?1:2;return [art?'MERC_LEADER':id,...(art?['MERC_MASTER']:[]),...Array.from({length:count},()=> 'SOLDIER2'),...(condition?['CASINO']:[])].slice(0,7);}
 if(['A007','A012','castle-reward','intercept','budget','A128'].includes(a))return a==='A128'?['INFKNIGHT','CAVALRY','SOLDIER2','CASTLE']:a==='intercept'?[condition?'CASTLE':'ELF','GUNNER','HEAVY_GUNNER','GOLEM1']:a==='A012'||id==='REINFORCE'?['INFKNIGHT','SOLDIER2','GUNNER','CASTLE']:a==='castle-reward'?['INFKNIGHT','INFKNIGHT','INFKNIGHT','CASTLE']:['SCARECROW'===id?'TOKEN00':'SOLDIER2','SCARECROW'===id?'TOKEN00':'SOLDIER2','SCARECROW'===id?'TOKEN00':'SOLDIER2',condition?'CASTLE':'ELF'];
 if(a==='A126'&&id==='LAND_GRANT')return [condition?'CASTLE':'ELF','TAR2','INFKNIGHT','SOLDIER2'];
 if(i.family==='S21'){
  if(id==='M11')return condition?[id,'SOLDIER2','SOLDIER2','INFKNIGHT']:[id,'SOLDIER2','ELF','INFKNIGHT'];
  if(id==='GM6_8')return [id,...(trigger==='death'?['SOLDIER2']:[]),'INFKNIGHT','GOLEM1'];
  if(['GM6_7','GM5_2'].includes(id))return [id,id==='GM6_7'?'INFKNIGHT':'SOLDIER2','GOLEM1','ELF'];
  if(id==='ELITE')return [id,'SOLDIER2','SOLDIER2','ELF'];
  return [mon?id:condition?'CASTLE':'ELF','INFKNIGHT','SOLDIER2','GOLEM1'];
 }
 if(a==='A126'&&id==='LAND_GRANT')return ['CASTLE','TAR2','INFKNIGHT','SOLDIER2'];
 if(a==='A049'||a==='A050')return ['GOLEM1','INFKNIGHT','MANA_GIANT','SOLDIER2'];
 if(i.family==='S06'&&id==='AHEUK'&&condition)return [];
 return [mon?id:'ELF','INFKNIGHT','MANA_GIANT','SOLDIER2'];
}
export const implementedIds=new Set(['S04','S06','S08','S12','S21','S22','A001','A007','A012','A013','A023','A024','A025','A026','A027','A028','A029','A030','A031','A032','A033','A034','A036','A037','A038','A049','A050','A054','A059','A062','A063','A067','A068','A069','A070','A074','A076','A086','A087','A088','A089','A090','A100','A101','A102','A103','A104','A122','A126','A127','A128','A129','A162','A174']);

export function triggersFor(id:string):[string,string][]{return ({FIRE_MASTER:[['summon','召喚時とコスト軽減'],['death','破壊時の魔法回収']],MANA_GIANT:[['summon','召喚時'],['turn-start','自分のターン開始']],GOLEM2:[['summon','召喚時'],['ally-death','味方の破壊']],NWL3:[['summon','召喚時'],['hit','攻撃を受ける']],MERC_MASTER:[['summon','召喚時'],['turn-start','自分のターン開始']],GM6_7:[['summon','召喚時'],['enemy-summon','相手の召喚に反応']],GM6_8:[['summon','召喚時'],['death','破壊時']],CASTLE:[['summon','召喚時'],['block','攻撃を防ぐ'],['ally-summon','兵士召喚で補充']]} as Record<string,[string,string][]>)[id]??[['summon','基本場面']]}
