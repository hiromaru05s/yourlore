import {botDecide} from '../shared/bot';
import type {BotRequest,BotReply} from './botPlanner';
// The same policy and search budget as the synchronous bot. Only its execution
// thread changes, so thinking cannot block input, loading or animation frames.
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<BotRequest>)=>void)|null;postMessage:(reply:BotReply)=>void};
scope.onmessage=({data})=>{
 try{scope.postMessage({id:data.id,action:botDecide(data.state,data.difficulty)});}
 catch{scope.postMessage({id:data.id,error:true});}
};
