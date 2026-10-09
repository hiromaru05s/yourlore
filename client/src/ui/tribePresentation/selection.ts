import {DB} from '../../shared/cards';
import {tier,type Tribe} from './catalog';
const selections:Record<string,{tribe:Tribe;variant:number;impact:number}>={
 '고독':{tribe:'solitude',variant:1,impact:1200},
 '포식':{tribe:'predation',variant:2,impact:865},
 '귀족':{tribe:'noble',variant:2,impact:1170},
 '마족':{tribe:'demon',variant:1,impact:1170},
 '시초':{tribe:'origin',variant:1,impact:1260},
};
export const selectedTribeSummon=(id:string|undefined)=>id?selections[DB[id]?.tribe??'']:undefined;
export const synergyTier=(threshold:number)=>tier(threshold-1);
