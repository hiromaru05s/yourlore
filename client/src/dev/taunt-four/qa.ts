import * as T from 'three';
import {moveShield} from './shields';
import {pose,pulse,designs} from './catalog';
const fixture=document.querySelector<HTMLIFrameElement>('#fixture')!;
const report=document.querySelector<HTMLElement>('#report')!,status=document.querySelector<HTMLElement>('#status')!,button=document.querySelector<HTMLButtonElement>('#run')!;
const wait=(test:()=>boolean,timeout=60000)=>new Promise<void>((resolve,reject)=>{const start=performance.now();const tick=()=>{if(test())resolve();else if(performance.now()-start>timeout)reject(Error('timeout'));else setTimeout(tick,50);};tick();});
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const assert=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const checks:Record<string,unknown>[]=[];
const record=(name:string,data:Record<string,unknown>={})=>{checks.push({name,...data});report.textContent=JSON.stringify(checks,null,2);};
const win=()=>fixture.contentWindow as any;
await wait(()=>win()?.tauntStudy?.state.ready);button.disabled=false;document.querySelector<HTMLButtonElement>('#capture')!.disabled=false;status.textContent='準備完了';
button.onclick=()=>void(async()=>{
 button.disabled=true;checks.length=0;report.dataset.pass='false';status.textContent='実行中';
 try{
  const rig={left:new T.Group(),right:new T.Group(),boss:new T.Group()};
  for(let t=0;t<=1000;t++){
   moveShield(rig,t);const open=pulse(80,390,670,960,t),hold=pulse(20,180,800,1000,t);
   for(const [sign,g]of [[-1,rig.left],[1,rig.right]] as const){
    assert(g.position.equals(new T.Vector3(sign*78*(1-open),26+86*(1-open),4+open*40)),'original position');
    assert(g.rotation.x===.05*open&&g.rotation.y===sign*(1-open)*1.48&&g.rotation.z===sign*.06*(1-open),'original rotation');
    assert(g.scale.x===.08+.92*hold&&g.scale.y===g.scale.x&&g.scale.z===g.scale.x,'original scale');
   }
   assert(rig.boss.position.equals(new T.Vector3(0,26,71))&&rig.boss.scale.x===pulse(280,420,650,870,t),'original boss clock');
   for(let v=0;v<5;v++)assert(pose(v,t).lift===3*pulse(120,330,690,950,t),'original card clock');
  }
  record('approved 01 motion unchanged for all four designs and reference',{sampledTimes:1001});
  const w=win(),d=fixture.contentDocument!;w.tauntStudy.stop();await pause(300);w.tauntStudy.seek(470);
  const shots=document.querySelector('#shots')!;shots.innerHTML='';for(const canvas of d.querySelectorAll<HTMLCanvasElement>('article canvas')){const img=document.createElement('img');img.src=canvas.toDataURL();shots.append(img);}record('four rendered comparison surfaces');
  (d.querySelector('#open-board') as HTMLButtonElement).click();await wait(()=>!!(d.querySelector<HTMLIFrameElement>('#board')!.contentWindow as any)?.tauntBoard?.state.ready);
  const board=d.querySelector<HTMLIFrameElement>('#board')!,bw=board.contentWindow as any;await pause(300);const modal=d.querySelector('#board-section')!.getBoundingClientRect(),box=board.getBoundingClientRect();assert(modal.top===0&&box.top>=0&&box.bottom<=w.innerHeight+1,'board inside viewport');assert(bw.tauntBoard.state.activeSources===1,'first open holds visible source');record('modal and entire board fit viewport; first open holds peak',{box:{top:box.top,bottom:box.bottom},viewport:w.innerHeight});
  for(let variant=0;variant<4;variant++)for(const side of [0,1]){
   await bw.tauntBoard.configure({variant,side,card:'SHIELD_TITAN',result:5,speed:1});bw.tauntBoard.seek(470);const s=bw.tauntBoard.state;assert(s.activeSources===1&&s.hidden===0&&s.overlay,'source visible');
   const c=bw.document.querySelector('.taunt-overlay') as HTMLCanvasElement,p=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<p.length;i+=4)if(p[i]>30)count++;assert(count>80,'effect pixels rendered');record('both sides: visible effect pixels and native source',{variant,side,pixels:count});
  }
  await bw.tauntBoard.configure({variant:4,side:0,card:'SHIELD_TITAN'});bw.tauntBoard.seek(470);assert(bw.tauntBoard.state.variant===4&&bw.tauntBoard.state.activeSources===1,'original reference visible on board');record('original 01 available on actual board');
  for(const result of [2,5]){await bw.tauntBoard.configure({variant:2,side:0,card:'SHIELD_TITAN',result,speed:1});await bw.tauntBoard.play();const s=bw.tauntBoard.state,events=s.events.filter((e:any)=>e.type==='dice-start');assert(events.at(-1).elapsed>=1000,'dice after 1s');assert(s.activeSources===0&&s.hidden===0,'restored');record('pre-roll before dice and restores',{result,elapsed:events.at(-1).elapsed});}
  for(const variant of [0,1,2,3]){await bw.tauntBoard.configure({variant,side:1,card:'ELF',multi:true,reduced:false,speed:.25});const p=bw.tauntBoard.play();await pause(280);bw.tauntBoard.stop();await p;assert(bw.tauntBoard.state.activeSources===0,'cancel restore');}record('all four cancel and settle without source hiding');
  await bw.tauntBoard.configure({variant:2,side:1,card:'ELF',multi:true,reduced:true});bw.tauntBoard.seek(500);assert(bw.tauntBoard.state.activeSources===2,'two sources reduced');record('granted taunt plus reduced motion plus two sources');bw.tauntBoard.stop();
  for(let v=0;v<4;v++){await bw.tauntBoard.configure({variant:v,side:1,card:'ELF',multi:true,reduced:false});bw.tauntBoard.seek(470);}const before=bw.tauntBoard.state.stats;for(let i=0;i<16;i++){await bw.tauntBoard.configure({variant:i%4,card:'ELF',side:1,multi:true,reduced:false});bw.tauntBoard.seek(120+i*49);bw.tauntBoard.stop();}const after=bw.tauntBoard.state.stats;assert(before.geometries===after.geometries&&before.textures===after.textures,'resources stable');record('repeat stable resources',{before,after});
  for(const [width,height] of [[390,844],[320,720],[844,390]]){fixture.style.width=width+'px';fixture.style.height=height+'px';await pause(300);const b=board.getBoundingClientRect();assert(b.height>120&&b.top>=0&&b.bottom<=height+1,'responsive visible board');assert(d.documentElement.scrollWidth<=width+1,'no horizontal overflow');record('responsive board visible',{width,height,boardHeight:b.height});}
  fixture.style.width='1280px';fixture.style.height='900px';await pause(300);await bw.tauntBoard.configure({variant:2,side:0,card:'SHIELD_TITAN'});bw.tauntBoard.seek(470);
  status.textContent='PASS · '+checks.length+' checks';report.dataset.pass='true';
 }catch(e){status.textContent='FAIL';report.textContent+='\n'+String(e);report.dataset.pass='false';console.error(e);}finally{button.disabled=false;}
})();

export {};

document.querySelector<HTMLButtonElement>('#capture')!.onclick=()=>void(async()=>{
 const button=document.querySelector<HTMLButtonElement>('#capture')!,w=win(),d=fixture.contentDocument!,frames=document.querySelector('#frames')!;button.disabled=true;frames.innerHTML='';
 (d.querySelector('#board-close') as HTMLButtonElement).click();w.tauntStudy.stop();
 const canvas=document.createElement('canvas');canvas.width=1320;canvas.height=1080;const c=canvas.getContext('2d')!;
 const titles=designs.map((d,i)=>`0${i+1} ${d.name}`);
 for(let i=0;i<46;i++){
  const time=Math.min(1000,i*1000/30);w.tauntStudy.seek(time);c.fillStyle='#efede4';c.fillRect(0,0,1320,1080);
  const sources=d.querySelectorAll<HTMLCanvasElement>('article canvas');sources.forEach((source,k)=>{const x=k%2*660,y=Math.floor(k/2)*540;c.drawImage(source,x,y+35);c.fillStyle='#444d50';c.font='18px sans-serif';c.fillText(titles[k],x+28,y+28);});
  const img=document.createElement('img');img.alt='共通時計 '+Math.round(time)+'ms';img.dataset.frame=String(i);img.src=canvas.toDataURL('image/png');frames.append(img);status.textContent='フレーム '+(i+1)+' / 46';await new Promise(requestAnimationFrame);
 }
 w.tauntStudy.seek(470);status.textContent='46 frames · 30fps timeline / 1s + 0.5s idle';button.disabled=false;
})();
