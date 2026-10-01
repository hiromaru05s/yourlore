import type {Action,CardInst,GameState} from '../../../shared/types';
import {definitions,type Config} from './catalog';
import {inst,mon} from './fixture';
export const fallbackCards:Record<string,string[]>={A002:['S10'],A003:['E3'],A005:['Q_ASSASSIN'],A022:['BLACK_NOVA'],A163:['RUNE1'],A178:['Q_CASTLE'],A179:['Q_CASTLE']};
export const cueScenarios=new Set(['A002','A003','A005','A009','A015','A021','A022','A035','A043','A044','A045','A046','A048','A055','A056','A057','A066','A071','A073','A077','A078','A079','A081','A082','A083','A084','A085','A091','A092','A093','A094','A095','A096','A097','A098','A099','A113','A114','A115','A116','A134','A136','A139','A140','A141','A142','A143','A158','A159','A160','A161','A163','A164','A167','A168','A169','A175','A176','A178','A179','A180']);
export function configureCue(g:GameState,cfg:Config,source:CardInst):{zone:'hand'|'field'|'market';action:Action}|null{
 if(!cueScenarios.has(cfg.item))return null;
 const p=g.players[cfg.side],o=g.players[1-cfg.side];let zone:'hand'|'field'|'market'=source.quick?'market':'hand';let action:Action=source.quick?{type:'buyMarket',i:0}:{type:'play',idx:0};
 const fieldSource=()=>{zone='field';p.hand=p.hand.filter(c=>c.uid!==source.uid);p.field.push(mon(source.id,source.uid));return p.field.at(-1)!;};
 const enchantSource=(turns=99)=>{zone='field';p.hand=p.hand.filter(c=>c.uid!==source.uid);p.enchants.push({card:source,turns});};
 const trigger=(id:string)=>{p.hand.unshift(inst(id,'a3-trigger'));action={type:'play',idx:0};};
 const incoming=()=>{g.cur=(1-cfg.side)as 0|1;o.hand.unshift(inst('BLOOD1','a3-trigger'));action={type:'play',idx:0};};
 switch(cfg.item){
 case'A015':o.enchants=[{card:inst('E3','a3-dispel-1'),turns:4},{card:inst('BLOOD_FEST','a3-dispel-2'),turns:99}];p.removed=Array.from({length:10},(_,i)=>inst('STARTER_TRASH',`a3-ex-${i}`));break;
 case'A021':fieldSource();g.cur=(1-cfg.side)as 0|1;o.hand.unshift(inst('RUNE1','a3-trigger'));p.field=p.field.filter(m=>m.uid===source.uid);p.deck.push(inst('FIRE_BALL','a3-death-fire'));action={type:'play',idx:0};break;
 case'A022':p.field=[mon('M4','a3-blocking')];break;
 case'A035':case'A046':{if(source.t==='mon'){fieldSource();o.field=[];action={type:'attack',uid:source.uid};}break;}
 case'A043':if(source.id==='BLACK_ELSA'){fieldSource();trigger('BLACK_CURSE');}break;
 case'A044':p.brand=2;g.cur=(1-cfg.side)as 0|1;p.hand.shift();zone='field';p.field.push(mon('ASSASSIN4',source.uid));action={type:'endTurn'};break;
 case'A045':p.brand=3;o.brand=2;break;
 case'A048':if(source.id==='MAJESTY_RITE')p.field=[mon('M4','a3-grant')];break;
 case'A056':p.field=[mon('M4','a3-protected-1'),mon('HEXER1','a3-protected-2')];break;
 case'A066':if(source.id==='FORBIDDEN')p.field=[mon('TSO2','a3-forbidden')];break;
 case'A057':enchantSource();p.field=[mon('VAMP5','a3-protected')];g.cur=(1-cfg.side)as 0|1;o.hand.unshift(inst('MASSACRE','a3-trigger'));action={type:'play',idx:0};break;
 case'A071':fieldSource();trigger('RUNE2');break;
 case'A073':p.field=['TDE1','TDE2','TDE3'].map((id,i)=>mon(id,`a3-demon-${i}`));p.deck.push(inst('TDE1','a3-owned-demon'));break;
 case'A077':case'A078':enchantSource();trigger('BLOOD1');break;
 case'A079':enchantSource(6);trigger('CURSE');break;
 case'A081':if(source.id==='SPACE_RITE')o.field=Array.from({length:6},(_,i)=>mon('M4',`a3-filled-${i}`));break;
 case'A083':if(source.id==='TDE3')p.field=[mon('TDE1','a3-restrict-1'),mon('TDE2','a3-restrict-2')];if(source.id==='SPACE_RITE')o.field=Array.from({length:6},(_,i)=>mon('M4',`a3-filled-${i}`));break;
 case'A084':fieldSource();incoming();break;
 case'A094':o.discard=Array.from({length:4},(_,i)=>inst('CURSE',`a3-harvest-${i}`));p.removed=Array.from({length:12},(_,i)=>inst('STARTER_TRASH',`a3-nuke-${i}`));p.field=[mon('TDE1','a3-tribe')];o.field=[mon(source.id==='GS5_3'?'TDE1':'TSO2','a3-enemy-tribe')];break;
 case'A095':fieldSource();trigger('BLACK_CURSE');break;
 case'A099':case'A098':{if(cfg.item==='A099'&&cfg.outcome==='miss'){fieldSource();g.cur=(1-cfg.side)as 0|1;action={type:'endTurn'};break;}const m=fieldSource();m.gcount=2;o.field=[];const attacker=mon('ASSASSIN1','a3-attacker');p.field.push(attacker);action={type:'attack',uid:attacker.uid};break;}
 case'A113':fieldSource();trigger('BLOOD_PLEASURE');break;
 case'A115':{const m=fieldSource();m.gcount=2;o.field=[];action={type:'attack',uid:m.uid};break;}
 case'A134':p.removed=Array.from({length:10},(_,i)=>inst('CREATION',`a3-create-${i}`));break;
 case'A136':enchantSource();trigger('S10');break;
 case'A143':if(source.id==='CULL_FARM'){enchantSource();g.cur=(1-cfg.side)as 0|1;action={type:'endTurn'};}break;
 case'A158':enchantSource();trigger(source.id==='NHEAL'?'M4':'S10');break;
 case'A159':enchantSource(1);if(source.id==='ANCIENT_CIV'){g.turn=11;p.enchants[0].bornTurn=1;}g.cur=(1-cfg.side)as 0|1;action={type:'endTurn'};break;
 case'A160':if(source.t==='mon')fieldSource();else enchantSource();g.cur=(1-cfg.side)as 0|1;action={type:'endTurn'};break;
 case'A161':if(source.id==='CREATION')p.usesTurn.CREATION=3;if(source.id==='DISCOVERY')p.usesTurn.DISCOVERY=1;if(source.id==='BLACK_REVERSE')p.expansion={turn:g.turn,extraDraw:0,firePlayed:[],fireDiscount:0,dominion:0,reversePlays:2};break;
 case'A163':o.field=[];break;
 case'A164':p.field=[mon('TSO1','a3-solitude-1')];if(source.id==='TSO1')p.field=[mon('TSO2','a3-solitude-2')];break;
 case'A167':case'A168':case'A169':{const n=cfg.item==='A167'?1:cfg.item==='A168'?2:3;const ids=['TDE1','TDE2','TDE3','TDE4'].filter(id=>id!==source.id);p.field=ids.slice(0,n).map((id,i)=>mon(id,`a3-synergy-${i}`));p.deck.push(inst('TDE1','a3-demon-owned'));break;}
 case'A175':enchantSource();g.turn=45;g.cur=(1-cfg.side)as 0|1;action={type:'endTurn'};break;
 case'A176':p.field=[mon('TSO2','a3-forbidden')];break;
 case'A178':case'A179':case'A180':{zone='field';p.hand.shift();const castle=mon('CASTLE','a3-castle');p.field=[castle];p.quests=[{card:inst('Q_CASTLE',source.uid),progress:cfg.item==='A179'?8:4,startedTurn:1,anchorUid:castle.uid}];if(cfg.item==='A180')p.field=[];action={type:'endTurn'};break;}
 }
 // All alternate state values are fixture setup, never a redefinition of card rules.
 if(source.quick)g.market[0]=source;
 if(!definitions[source.id])throw Error('Unknown assigned card '+source.id);
 return{zone,action};
}
