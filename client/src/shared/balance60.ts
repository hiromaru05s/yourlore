import type { CardDef } from './types';

/** Approved October 21 rework. Canonical effects are in cardEffectText.ts. */
export function applyBalance60(db: Record<string, CardDef>): void {
  for (const [id, cost] of Object.entries({RIFT:3, NOURISHING_RAIN:4, FATE_WHEEL:4, SLUM:3, AMBUSH:3, SELECTED_SWORD:3, COUNTERCALC:2, FOCUS:1})) db[id].cost = cost;
  db.ACID_RAIN.play = 5;
  for (const [id, atk, def] of [['TDE1',2,3],['TDE2',4,4],['TDE3',5,7],['TDE4',12,10]] as const) Object.assign(db[id], {atk,def});
  db.COUNTERCALC.maxUsesPerTurn = 1;
  Object.assign(db.GUILD_HALL, {atk:0, def:3});
  db.FARM_KEEPER.aura = 'farmerHealth';
  db.WORLD_CARE.passive = [...new Set([...(db.WORLD_CARE.passive ?? []), 'void'])];
  db.WORLD_CARE.exileOnDestroy = true;
  for (const c of FARM_CARDS) db[c.id] = c;
}

const FARM_CARDS: CardDef[] = [
  {id:'FARM', t:'spell', cost:1, ench:'farm', val:7, name:'농장', nameJa:'農場', nameEn:'Farm', text:''},
  {id:'FARMER', t:'mon', cost:1, atk:1, def:1, onSummon:'expansion', name:'농민', nameJa:'農民', nameEn:'Farmer', text:''},
  {id:'HARVEST', t:'spell', cost:1, ench:'harvest', val:99, name:'수확', nameJa:'収穫', nameEn:'Harvest', text:''},
  {id:'APPLE', t:'spell', cost:3, act:'apple', name:'사과', nameJa:'りんご', nameEn:'Apple', text:''},
  {id:'GOLDEN_APPLE', t:'spell', cost:0, noShop:true, passive:['void'], act:'dew', val:8, name:'황금 사과', nameJa:'黄金のりんご', nameEn:'Golden Apple', text:''},
  {id:'FARMER_PRAYER', t:'spell', cost:0, noShop:true, passive:['void'], exileOnDestroy:true, ench:'farmerPrayer', val:99, name:'농민의 기도', nameJa:'農民の祈り', nameEn:"Farmer’s Prayer", text:''},
];
