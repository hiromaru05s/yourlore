import {DB, STARTERS, TRIBES, RELATED_MANUAL} from './cards';
import type {CardDef} from './types';
import type {EffectLocale} from './cardEffectText';

export const REFERENCE_CARDS: Record<string, CardDef> = {...DB, ...STARTERS};
const all = Object.values(REFERENCE_CARDS);
export type CardReference = {kind:'card'|'series'; id:string};
export type ReferencePart = {text:string; reference?:CardReference};
type Series = {names:Record<EffectLocale,string>; aliases?:Partial<Record<EffectLocale,string[]>>; ids:string[]};
const ids = (test:(c:CardDef)=>boolean) => all.filter(test).map(c=>c.id);
const series = (ja:string,ko:string,en:string,members:string[]):Series => ({names:{ja,ko,en},ids:members});
// Membership mirrors rule predicates, not similarity of translated display names.
export const CARD_SERIES: Record<string,Series> = {
  golem:series('ゴーレム','골렘','Golem',ids(c=>/골램|골렘/.test(c.name))),
  assassin:series('アサシン','암살자','Assassin',ids(c=>c.name.includes('암살자'))),
  hexer:series('呪術師','주술사','Hexer',ids(c=>c.name.includes('주술사'))),
  vampire:series('吸血鬼','흡혈귀','Vampire',ids(c=>c.name.includes('흡혈귀')||c.id==='VAMP_BUTLER')),
  mimic:series('ミミック','미믹','Mimic',['MIMIC','MIMIC2','AWAKENED_MIMIC','MIMIC_KING','MIMIC_KING2','ORIGIN_MIMIC','MIMIC_LORD']),
  elf:series('エルフ','엘프','Elf',ids(c=>/엘프|エルフ/.test(c.name+(c.nameJa??'')))),
  worldtree:series('世界樹','세계수','World Tree',ids(c=>/세계수|世界樹/.test(c.name+(c.nameJa??'')))),
  mercenary:series('傭兵','용병','Mercenary',['MERCENARY','MERC_LEADER','MERC_MASTER']),
  knight:series('騎士','기사','Knight',['INFKNIGHT']),
  blood:series('血の魔法','피의 마법','Blood Magic',ids(c=>c.name.startsWith('피의 마법'))),
  black:series('黒魔法','흑마법','Black Magic',ids(c=>c.t==='spell'&&c.id.startsWith('BLACK_'))),
  fire:series('ファイアー魔法','파이어 마법','Fire Magic',['FLAME','FIRE_BALL','FIRE_ARROW','FIRE_ZONE','FIRE_METEOR']),
  chosen:series('選ばれし','선택받은','Chosen',ids(c=>c.id.startsWith('CHOSEN_')&&c.t==='mon')),
  armorer:series('装備職人','장비 장인','Armorer',['APPRENTICE_ARMORER','VETERAN_ARMORER','SALLY_WEAPONMASTER']),
  militarySoldier:series('兵士','병사','Soldier',ids(c=>c.t==='mon'&&/병사|兵士/.test(c.name+(c.nameJa??'')))),
  militaryKnight:series('騎士','기사','Knight',ids(c=>c.t==='mon'&&/기사|騎士/.test(c.name+(c.nameJa??'')))),
  militaryGunner:series('砲撃兵','포격병','Gunner',ids(c=>c.t==='mon'&&/포격병|砲撃兵/.test(c.name+(c.nameJa??'')))),
};
CARD_SERIES.golem.aliases={ko:['골램']};
CARD_SERIES.fire.aliases={en:['Fire spell']};
CARD_SERIES.elf.aliases={en:['Elves']};
for (const [key,tribe] of Object.entries(TRIBES)) CARD_SERIES['tribe:'+key]={names:{ja:tribe.ja.name,ko:tribe.ko.name,en:tribe.en.name},ids:ids(c=>c.tribe===key)};

/** Explicit creation/summon/deploy results. Existing-card retrieval is not creation. */
export const CARD_GENERATES: Record<string,string[]> = {
  FARM:['APPLE'], FARMER:['FARMER_PRAYER'], HARVEST:['GOLDEN_APPLE'], FARMER_PRAYER:['GOLDEN_APPLE'],
  SCARECROW:['TOKEN00'], LEVY:['SOLDIER2'], BUDGET:['SOLDIER2'], HALF_ELF:['WORLD_CARE'], BREWING:['WINE'],
  FORBIDDEN:ids(c=>c.t==='mon'&&!!c.tribe&&c.tribe!=='시초'), Q_TRIBE:ids(c=>c.t==='mon'&&!!c.tribe),
  M11:['INFKNIGHT'], NHEX:['CURSE'], AJIN:['STARTER_MANA'], GM6_0:['DRAGON_RIDER','ANTIQUE_DK'],
  GM6_7:['INFKNIGHT','SOLDIER2'], GM6_8:['SOLDIER2','HEAVY_GUNNER'], TGE5:['ORIGIN_RITE'],
  TGE1:ids(c=>c.t==='mon'&&c.tribe==='시초'&&c.id!=='TGE1'&&c.cost<=7),
  LUCKY_CHEST:['MIMIC'], STARTER_CHEST:['MIMIC'], GUILD_CHEST:['GUILD_EYE','ASSASSIN1','ASSASSIN2','ASSASSIN3'],
  AWAKENED_MIMIC:['MIMIC'], MIMIC_KING:['MIMIC2'], MIMIC_KING2:['MIMIC_HIDEOUT'], MIMIC_HIDEOUT:['MIMIC2'],
  VOID_APOSTLE:['STARTER_TRASH'], SORTER:['STARTER_TRASH',...CARD_SERIES.chosen.ids],
  CULL_FLOOD:['STARTER_TRASH'], PAIN_HARVEST:['STARTER_TRASH'], CULL_FARM:['STARTER_TRASH'],
  GREED_PRICE:['MIMIC'], ELITE:['SOLDIER2'], DRAGON_EGG:['D_BLACK','D_RED','D_BLUE'], BEAST_EGG:['DIVINE'],
  VAMP_PACT:['VAMP1'], VAMP_PACT2:['VAMP2'], VAMP_BUTLER:['VAMP1'], VAMP1:['VAMP2'], VAMP2:['VAMP3'], VAMP3:['VAMP4'], VAMP4:['VAMP5'],
  CROSSROADS:['STARTER_TRASH'], TRIAL_AREA:['STARTER_TRASH'], ANCIENT_CIV:['DRAGON_EGG','BEAST_EGG'],
  GUILD_CO:['DARK_MERCHANT'], DUNGEON_FLOOR:['MIMIC'],
  LAND_GRANT:ids(c=>c.t==='mon'&&c.tribe==='귀족'&&c.cost<=3),
  HEXER1:['CURSE'], HEXER2:['CURSE'], HEXER3:['CURSE'], COLOSSEUM:CARD_SERIES.chosen.ids,
  Q_RIFT:['STARTER_TRASH'], Q_CASTLE:['INFKNIGHT'], QUICK_MIMIC:['MIMIC'], QUICK_SURVIVAL:['DUNGEON'],
  QUICK_WORLD:['WORLD_HEART'], QUICK_MUSTER:['SOLDIER2'], INTERCEPT:['GUNNER','HEAVY_GUNNER'],
  REINFORCE:['INFKNIGHT','SOLDIER2','GUNNER'], FARM_KEEPER:['TOKEN00'], STABLE:['CAVALRY'],
  MERCENARY:['SOLDIER2'], MERC_LEADER:['SOLDIER2'], MERC_MASTER:['SOLDIER2'], Q_TOWN:['DOMINION'], EMPTY_MIND:['CREATION'], CREATION:['CREATION'],
  BLACK_INFINITY:['STARTER_TRASH'], BLACK_CURSE:['CURSE'], BLACK_ELSA:['CURSE'], BLACK_ALICE:['CURSE'], QUICK_CURSE:['CURSE'],
  ASSASSIN_SQUAD:['ASSASSIN2'], WINE_COLLECTOR:['DARK_MERCHANT'], NIGHT_CASTLE_GIFT:['VAMP_PACT','VAMP_WARD'],
};

const nameKey = {ja:'nameJa',ko:'name',en:'nameEn'} as const;
const textKey = {ja:'textJa',ko:'text',en:'textEn'} as const;
export function referenceTitle(ref:CardReference,lang:EffectLocale):string {
  return ref.kind==='series' ? CARD_SERIES[ref.id]?.names[lang]??ref.id : REFERENCE_CARDS[ref.id]?.[nameKey[lang]]??ref.id;
}
export function referenceCardIds(ref:CardReference):string[] { return ref.kind==='series' ? CARD_SERIES[ref.id]?.ids??[] : REFERENCE_CARDS[ref.id]?[ref.id]:[]; }
type Candidate = {text:string; reference:CardReference};
// Localized shorthand is scoped where ordinary words would otherwise be ambiguous.
const CARD_ALIASES:Partial<Record<EffectLocale,Record<string,string[]>>>={
  ko:{GUILD_EYE:['길드 정보망'],MANA_GIANT:['자이언트 골렘']},
  en:{GRAPE2:['Premium Grape'],GUILD_HALL:['Assassin Guild Branch'],DARK_ELF:['Dark Elves'],STARTER_CHEST:['treasure chest']},
};
const SHORTHAND:Record<string,Partial<Record<EffectLocale,Record<string,string>>>>={
  GUILD_CHEST:{ko:{'초급':'ASSASSIN1','중급':'ASSASSIN2','상급':'ASSASSIN3'},en:{Novice:'ASSASSIN1',Adept:'ASSASSIN2',Elite:'ASSASSIN3'}},
  DRAGON_EGG:{en:{Black:'D_BLACK',Red:'D_RED',Blue:'D_BLUE'}},
};
const candidates = new Map<EffectLocale,Candidate[]>();
function localizedCandidates(lang:EffectLocale):Candidate[] {
  let cached=candidates.get(lang); if(cached)return cached;
  cached=all.flatMap(c=>{const text=c[nameKey[lang]];return text?[{text,reference:{kind:'card' as const,id:c.id}}]:[];});
  for(const [id,names] of Object.entries(CARD_ALIASES[lang]??{}))for(const text of names)cached.push({text,reference:{kind:'card',id}});
  for(const [id,s] of Object.entries(CARD_SERIES)) {
    if(id.startsWith('military'))continue;
    for(const name of [s.names[lang],...(s.aliases?.[lang]??[])])cached.push({text:name,reference:{kind:'series',id}});
  }
  cached.sort((a,b)=>b.text.length-a.text.length||(a.reference.kind==='series'?-1:1));candidates.set(lang,cached);return cached;
}
/** Longest names win; a family token must not turn a named member into a family. */
export function effectReferenceParts(text:string,lang:EffectLocale,sourceId:string):ReferencePart[] {
  const out:ReferencePart[]=[];let plain='';
  const scoped=Object.entries(SHORTHAND[sourceId]?.[lang]??{}).map(([text,id])=>({text,reference:{kind:'card' as const,id}}));
  const choices=[...localizedCandidates(lang),...scoped].sort((a,b)=>b.text.length-a.text.length);
  const sourceJa=REFERENCE_CARDS[sourceId]?.textJa??'';
  const familyNames=new Set([...sourceJa.matchAll(/((?:「[^」]+」)+)系/g)].flatMap(m=>[...m[1].matchAll(/「([^」]+)」/g)].map(n=>n[1])));

  for(let i=0;i<text.length;) {
    const candidate=choices.find(c=>{
      if(!text.startsWith(c.text,i))return false;
      const before=text.slice(0,i),after=text.slice(i+c.text.length);
      if(lang==='en'&&(/[A-Za-z]$/.test(before)||/^[A-Za-z]/.test(after)&&!/^s\b/.test(after)))return false;
      if(lang==='ja'&&c.reference.kind==='card'&&!/^($|[」\s0-9０-９(（、。・：:]|は|を|が|に|の|で|と|から|へ)/.test(after))return false;
      if(lang==='ja'&&c.text.length===1&&!(before.endsWith('「')&&after.startsWith('」')))return false;
      if(lang==='ko'&&c.text.length===1&&(!/(^|\s|['·])$/.test(before)||!/^($|[\s'·]|[이을를의에은와과])/u.test(after)))return false;
      if(c.reference.kind==='series') {
        const id=c.reference.id;
        if(id.startsWith('tribe:')||['blood','black','fire','chosen','armorer'].includes(id))return true;
        if(lang!=='ja'&&familyNames.has(CARD_SERIES[id].names.ja))return true;
        if(lang==='ja')return /^」(?:「[^」]+」)*系/.test(after)||sourceId==='VITAL3';
        if(lang==='ko')return /^(?:['’]?\s*|·[가-힣]+\s*)계열/.test(after)||!all.some(x=>x.name===c.text);
        return /^-family|^ family|^- or /.test(after)||['VITAL3','VETERAN_ARMORER'].includes(sourceId)||!all.some(x=>x.nameEn===c.text);
      }
      return true;
    });
    if(!candidate){plain+=text[i++];continue;}
    if(plain){out.push({text:plain});plain='';}
    let reference=candidate.reference;
    if(sourceId==='VETERAN_ARMORER') {
      const key=({兵士:'militarySoldier',騎士:'militaryKnight',砲撃兵:'militaryGunner',병사:'militarySoldier',기사:'militaryKnight',포격병:'militaryGunner',Soldier:'militarySoldier',Knight:'militaryKnight',Gunner:'militaryGunner'} as Record<string,string>)[candidate.text];
      if(key)reference={kind:'series',id:key};
    }
    const token=candidate.text+(lang==='en'&&/^s\b/.test(text.slice(i+candidate.text.length))?'s':'');
    out.push({text:token,reference});i+=token.length;
  }
  if(plain)out.push({text:plain});return out;
}
let graph:Map<string,Set<string>>|undefined;
function referenceGraph():Map<string,Set<string>> {
  if(graph)return graph;graph=new Map();
  for(const c of all) {
    const outgoing=new Set((RELATED_MANUAL[c.id]??[]).filter(id=>!!REFERENCE_CARDS[id]));
    for(const lang of ['ja','ko','en'] as const)for(const p of effectReferenceParts(c[textKey[lang]]??'',lang,c.id))if(p.reference)for(const id of referenceCardIds(p.reference))if(id!==c.id)outgoing.add(id);
    for(const id of CARD_GENERATES[c.id]??[])if(id!==c.id)outgoing.add(id);
    graph.set(c.id,outgoing);
  }
  return graph;
}
export function cardRelations(id:string):{generated:string[];sources:string[];references:string[];referencedBy:string[]} {
  const generated=CARD_GENERATES[id]??[],sources=Object.keys(CARD_GENERATES).filter(key=>CARD_GENERATES[key].includes(id));
  return {generated,sources,references:[...(referenceGraph().get(id)??[])].filter(x=>!generated.includes(x)),referencedBy:[...referenceGraph()].filter(([key,values])=>key!==id&&values.has(id)&&!sources.includes(key)).map(([key])=>key)};
}
