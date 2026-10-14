import type {createNovaRenderer} from './visual';
import {getLang} from '../../i18n';
const DURATION=6200;
type Renderer=ReturnType<typeof createNovaRenderer>;
let artwork:Promise<HTMLImageElement>|undefined;
function art(){return artwork??=new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(Error('Nova art timeout')),2500);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Nova art unavailable'))};img.src='/art/cards/BLACK_NOVA.webp';}).catch(error=>{artwork=undefined;throw error});}
export function warmNova(){void Promise.all([import('./visual'),art()]).catch(()=>{});}
const point=(el:Element)=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}};
const ease=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q)};
/** One lifecycle owns loading, source visibility, HP interpolation, and all temporary resources. */
export function playNova(source:HTMLElement,side:'me'|'opp',fromHp:number,onHp:(hp:number)=>void,signal:AbortSignal):Promise<boolean>{
 const hp=document.getElementById(`hp-${side}`),enemyHp=document.getElementById(`hp-${side==='me'?'opp':'me'}`);
 const target=document.querySelector(side==='me'?'#portraitOpp .pt-ring':'#portraitMe .pt-ring');
 const meField=document.querySelector('#meRow .zone-mon'),oppField=document.querySelector('#oppRow .zone-mon');
 if(signal.aborted||document.hidden||!source.isConnected||!hp||!target||!meField||!oppField)return Promise.resolve(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=document.createElement('canvas');canvas.className='nova-time-theft';canvas.dataset.variant='04';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'125'});
 const ctx=canvas.getContext('2d');if(!ctx)return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false,raf=0,renderer:Renderer|undefined,lastHp=fromHp,start=0;const old=source.style.visibility;
  const marker=document.createElement('div');marker.className='nova-time-seal';marker.setAttribute('role','status');
  marker.textContent=getLang()==='ja'?'次ターンをスキップ':getLang()==='en'?'NEXT TURN SKIPPED':'다음 턴 건너뜀';
  Object.assign(marker.style,{position:'fixed',pointerEvents:'none',zIndex:'126',font:'600 12px serif',color:'#ead5e1',background:'#271b30e8',border:'1px solid #90778b',borderRadius:'4px',padding:'5px 9px',whiteSpace:'nowrap',transform:'translateX(-50%)'});
  const finish=(complete=false)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);observer.disconnect();signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);canvas.remove();marker.remove();renderer?.dispose();source.style.visibility=old;resolve(complete);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort()};
  const observer=new MutationObserver(()=>{if(!source.isConnected||!hp.isConnected||!target.isConnected)abort()});observer.observe(document.body,{childList:true,subtree:true});
  const deadline=setTimeout(abort,9500);signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  const draw=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden||!source.isConnected||!hp.isConnected||!target.isConnected){abort();return;}
   try{
    const age=now-start,t=reduced?age<150?1000:age<350?2450:5350:Math.min(DURATION,age),end=reduced?650:DURATION;
    canvas.dataset.elapsed=String(Math.round(t));
    if(age>=end){onHp(1);finish(true);return;}
    const current=Math.max(1,Math.round(fromHp-(fromHp-1)*ease(1350,2450,t)));if(current!==lastHp){lastHp=current;onHp(current);}
    const w=innerWidth,h=innerHeight,u=Math.min(1.05,w/670,h/570),dpr=Math.min(1.5,devicePixelRatio||1),a=point(meField),b=point(oppField),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2-38*u},life=point(hp),enemy=point(target),r=source.getBoundingClientRect();
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(renderer&&!renderer.lost){renderer.draw(t,{source:point(source),life,target:enemy,center,scale:r.width/105+(u-r.width/105)*ease(0,250,t),hp:fromHp,reduced},w,h);ctx.drawImage(renderer.canvas,0,0,w,h);}
    else{canvas.dataset.fallback='true';ctx.fillStyle='#17111fea';ctx.beginPath();ctx.arc(center.x,center.y,48*u,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bba0b3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(center.x,center.y,30*u,0,Math.PI*2);ctx.moveTo(center.x,center.y-23*u);ctx.lineTo(center.x,center.y);ctx.lineTo(center.x+15*u,center.y);ctx.stroke();}
    for(const stat of [hp,enemyHp])if(stat){const r=stat.getBoundingClientRect();ctx.clearRect(r.x-2,r.y-2,r.width+4,r.height+4);}
    if(t>=5150){if(!marker.isConnected)document.body.append(marker);marker.style.left=Math.max(85,Math.min(w-85,enemy.x))+'px';marker.style.top=Math.max(5,Math.min(h-35,enemy.y+63*u))+'px';}
    raf=requestAnimationFrame(draw);
   }catch{finish(false);}
  };
  void Promise.all([import('./visual'),art()]).then(([m,img])=>{if(done)return;try{renderer=m.createNovaRenderer(img)}catch{/* Canvas fallback retains state timing. */}begin();}).catch(()=>{if(!done)begin()});
  function begin(){if(done||signal.aborted)return;source.style.visibility='hidden';document.body.append(canvas);start=performance.now();draw(start);}
 });
}
