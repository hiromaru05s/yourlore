const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function run(){
 const api=(window as any).dualLab,checks:string[]=[],errors:string[]=[],report={checks,errors};
 const status=document.querySelector('#status')!;const check=(value:boolean,name:string)=>{if(!value)throw Error(name);checks.push(name);};
 const until=async(fn:()=>boolean,label:string)=>{for(let i=0;i<150;i++){if(fn())return;await wait(100);}throw Error('Timed out: '+label);};
 try{
  await until(()=>api.state.ready,'preview images');api.seek(620);
  for(const card of ['NGA4','DRAGON_RIDER','ANTIQUE_DK']){await api.setCard(card);check(document.querySelectorAll('.study-actors .duet-card').length===5,card+': five real cards');check([...document.querySelectorAll<HTMLImageElement>('.stage .card-art img')].every(i=>i.complete&&i.naturalWidth>0),card+': real artwork decoded');}
  await api.setCard('NGA4');
  for(const n of [2,1,0]){api.setCount(n);check([...document.querySelectorAll<HTMLElement>('.study-actors [data-remaining]')].every(e=>e.dataset.remaining===String(e.dataset.studyVariant==='baseline'&&n>0?1:n)),`count ${n}: all five state visuals`);}
  api.setCount(2);api.setReduced(true);const p=api.state.paintCount;await wait(140);check(api.state.paintCount===p,'reduced motion stops ready rendering');api.setReduced(false);api.play();const before=api.state.ms;await wait(220);check(api.state.ms>before,'continuous clock');api.seek(700);const paused=api.state.ms;await wait(120);check(api.state.ms===paused,'pause freezes clock');
  api.setMode('board');await until(()=>!!(document.querySelector('iframe')?.contentWindow as any)?.dualBoard?.state.ready,'real board readiness');const get=()=>(document.querySelector('iframe')!.contentWindow as any).dualBoard;
  for(const side of [0,1])for(let v=0;v<4;v++)for(const n of [2,1,0]){api.setSide(side);api.setVariant(v);api.setCount(n);api.seek(700);await wait(45);const b=get().state;check(b.variant===v&&b.side===side&&b.remaining===n&&b.actors===2,`board side=${side} variant=${v} count=${n}`);}
  api.setCount(2);api.setSide(0);api.setMulti(true);await wait(80);check(get().state.actors===4&&get().state.hidden===4,'three concurrent dual cards plus baseline');
  api.setMulti(false);api.setVariant(3);api.setCount(2);await wait(80);await get().attack();await wait(60);check(api.state.remaining===1&&get().state.remaining===1,'first attack returns ready with one use');await get().attack();await wait(60);check(api.state.remaining===0&&get().state.remaining===0,'second attack exhausts');await get().attack();check(get().state.remaining===0&&!get().state.busy,'exhausted cannot replay attack');
  api.setCount(2);await wait(50);const pending=get().attack();await wait(100);get().cancel();await pending;await wait(50);check(get().state.remaining===2&&!get().state.busy&&get().state.hidden===2,'cancel restores card without spending attack');
  api.setReduced(true);await wait(50);await get().attack();await wait(60);check(api.state.remaining===1,'reduced attack preserves count transition');api.setCount(2);api.setReduced(false);api.setMode('compare');check(document.querySelectorAll('iframe').length===0,'leaving board disposes frame');check(document.querySelectorAll('.study-actors .duet-card').length===5,'no accumulated comparison actors');
  api.seek(900);check(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');status.textContent=`検証完了 ${checks.length}項目 / エラー0`;
 }catch(e){errors.push(String(e));status.textContent='検証エラー: '+String(e);}
 await fetch('/__dual-evidence/report.json',{method:'POST',body:JSON.stringify({...report,date:'2026-10-12',userApproved:false,runtimeIntegrated:false},null,2)});document.body.dataset.qa=errors.length?'failed':'passed';
}
