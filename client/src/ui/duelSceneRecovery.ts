/** Rebuild only presentation after GPU eviction; the controller and its DOM stay live. */
export function recoverDuelScene(root:HTMLElement,mount:(lost:()=>void)=>()=>void):()=>void {
 let disposed=false,cleanup:(()=>void)|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let attempts=0,lastAttempt=0;
 const fallback=()=>{delete root.dataset.sceneReady;root.dataset.tableState='fallback';root.dataset.widgetsReady='fallback';};
 const retry=()=>{
  if(disposed||timer!==undefined||!root.isConnected)return;
  fallback();
  if(Date.now()-lastAttempt>30000)attempts=0;
  if(attempts>=3)return;
  timer=setTimeout(()=>{
   timer=undefined;if(disposed||!root.isConnected)return;
   cleanup?.();cleanup=undefined;
   attempts++;lastAttempt=Date.now();root.dataset.sceneRecoveries=String(attempts);
   start();
  },300*2**attempts);
 };
 const start=()=>{
  delete root.dataset.sceneReady;
  cleanup=mount(retry);
  if(root.dataset.tableState==='fallback')retry();
 };
 start();
 return()=>{disposed=true;clearTimeout(timer);cleanup?.();};
}
