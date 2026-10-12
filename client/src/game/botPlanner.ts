import type {Action,GameState} from '../shared/types';
import type {BotDifficulty} from '../shared/bot';
export interface BotRequest{id:number;state:GameState;difficulty:BotDifficulty;}
export interface BotReply{id:number;action?:Action;error?:boolean;}
/** One worker per local match, with cancellation and no stale reply delivery. */
export class BotPlanner{
 private worker:Worker|undefined;
 private pending:{id:number;resolve:(action:Action|undefined)=>void;reject:()=>void}|undefined;
 private sequence=0;
 private dead=false;
 async decide(state:GameState,difficulty:BotDifficulty):Promise<Action|undefined>{
  if(this.dead)return;
  const generation=++this.sequence;
  // Superseded searches must not consume CPU or resolve into the next state.
  if(this.pending)this.stopWorker();
  try{
   if(!this.worker){
    this.worker=new Worker(new URL('./botPlanner.worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=({data}:MessageEvent<BotReply>)=>{
     const pending=this.pending;if(!pending||pending.id!==data.id)return;
     this.pending=undefined;
     if(data.error||!data.action)pending.reject();else pending.resolve(data.action);
    };
    const fail=()=>{const pending=this.pending;this.pending=undefined;this.worker?.terminate();this.worker=undefined;pending?.reject();};
    this.worker.onerror=event=>{event.preventDefault();fail();};
    this.worker.onmessageerror=fail;
   }
   return await new Promise<Action|undefined>((resolve,reject)=>{
    this.pending={id:generation,resolve,reject:()=>reject(Error('Bot worker unavailable'))};
    this.worker!.postMessage({id:generation,state,difficulty} satisfies BotRequest);
   });
  }catch{
   if(this.dead||generation!==this.sequence)return;
   this.stopWorker();
   // Keep the existing policy on environments that cannot create a Worker.
   const {botDecide}=await import('../shared/bot');
   if(!this.dead&&generation===this.sequence)return botDecide(state,difficulty);
  }
 }
 private stopWorker(){this.worker?.terminate();this.worker=undefined;this.pending?.resolve(undefined);this.pending=undefined;}
 dispose(){this.dead=true;this.sequence++;this.stopWorker();}
}
