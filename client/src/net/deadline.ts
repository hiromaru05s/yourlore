export function withDeadline<T>(promise:Promise<T>,ms=20000,signal?:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const finish=(fn:()=>void)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);fn();};
  const abort=()=>finish(()=>reject(new DOMException('Aborted','AbortError')));
  const timer=setTimeout(()=>finish(()=>reject(new DOMException('Timed out','TimeoutError'))),ms);
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  promise.then(v=>finish(()=>resolve(v)),e=>finish(()=>reject(e)));
 });
}
