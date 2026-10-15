import type {GameState} from '../../shared/types';
export const ANESTHESIA_EXIT_MS=420;
export type EchoState={turn:number;start:number;end?:number};
/** Authoritative per-instance state. Never infer protection from the spell's owner. */
export class AnesthesiaState {
 readonly entries=new Map<string,EchoState>();
 private turn=-1;
 advance(turn:number,now:number){
  if(turn<this.turn)return;this.turn=turn;
  for(const entry of this.entries.values())if(entry.turn!==turn&&entry.end===undefined)entry.end=now;
 }
 sync(g:GameState,now:number){
  if(g.turn<this.turn)return;
  this.advance(g.turn,now);
  if(g.over){this.entries.clear();return;}
  const field=g.players.flatMap(p=>p.field),present=new Set(field.map(m=>m.uid));
  for(const uid of this.entries.keys())if(!present.has(uid))this.entries.delete(uid);
  for(const m of field){
   const entry=this.entries.get(m.uid);
   if(m.immuneDamageTurn===g.turn){
    if(!entry||entry.turn!==g.turn)this.entries.set(m.uid,{turn:g.turn,start:now});
    else if(entry.end!==undefined)delete entry.end;
   }else if(entry&&entry.end===undefined)entry.end=now;
  }
 }
 prune(now:number){for(const [uid,e]of this.entries)if(e.end!==undefined&&now-e.end>=ANESTHESIA_EXIT_MS)this.entries.delete(uid);}
 clear(){this.entries.clear();}
}
