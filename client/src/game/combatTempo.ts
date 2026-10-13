/** Contact is the gameplay presentation barrier; recovery may keep playing. */
export function contactPlayback(start:(contact:()=>void)=>Promise<void>,onContact:()=>void){
 let resolve!:()=>void,contacted=false;
 const contact=new Promise<void>(done=>{resolve=done;});
 const impact=()=>{if(contacted)return;contacted=true;try{onContact();}finally{resolve();}};
 const finished=Promise.resolve().then(()=>start(impact)).finally(resolve);
 // A renderer that is skipped, removed or fails must never strand the event queue.
 void finished.catch(()=>{});
 return{contact,finished};
}
