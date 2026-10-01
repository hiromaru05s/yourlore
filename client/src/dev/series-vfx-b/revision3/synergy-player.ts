import type {NativeBridge} from './native-bridge';
import type {GameView} from '../../../ui/boardView';
import {hpFeedback,manaDrop,deathShatter,setFxSkip} from '../../../ui/anim';
import {attach,dispose,type Surface} from './surface';
import {drawSummon} from './first-materials';
import type {SynergyFixture} from './synergy-fixtures';
export async function playSynergy(f:SynergyFixture,view:GameView,root:HTMLElement,variant:number,reduced:boolean,signal:AbortSignal,valid:()=>boolean,stable:()=>Promise<void>,bridge:NativeBridge,phase:(s:string)=>void){
 const staged=structuredClone(f.after);staged.over=false;staged.players.forEach((p,i)=>{p.hp=f.before.players[i].hp;p.maxMana=f.before.players[i].maxMana;p.mana=f.before.players[i].mana;});
 bridge.render(view,staged);await stable();if(signal.aborted||!valid())return;
 bridge.claim();const surfaces:Surface[]=[];
 for(const uid of f.participants){const n=root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`);if(n)surfaces.push(attach(n));}
 const start=performance.now(),length=reduced?240:1700;let frame=0;
 phase(`${f.threshold}種類のカードが応答する`);
 try{
  await new Promise<void>((resolve,reject)=>{
   const finish=()=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};signal.addEventListener('abort',finish,{once:true});
   const tick=(now:number)=>{try{
    if(signal.aborted||!valid()){finish();return;}
    const t=Math.min(1,(now-start)/length);
    surfaces.forEach((s,i)=>{
     const lag=variant===1?i*.055:Math.abs(i-(surfaces.length-1)/2)*.045;
     const local=Math.max(0,Math.min(1,(t-lag)/(1-lag)));
     // Explicit reuse: same family material, different group timing and actual
     // threshold consequences. These are not counted as bespoke extra assets.
     drawSummon(s,f.family,s.card.dataset.cardId!,variant,local,reduced);
    });
    if(t>=1)finish();else frame=requestAnimationFrame(tick);
   }catch(e){signal.removeEventListener('abort',finish);reject(e);}};frame=requestAnimationFrame(tick);
  });
 }finally{cancelAnimationFrame(frame);surfaces.forEach(dispose);}
 if(signal.aborted||!valid())return;
 bridge.render(view,structuredClone(f.after));await stable();if(signal.aborted||!valid())return;
 const side=f.owner===0?'me':'opp',foe=f.owner===0?'opp':'me';
 const heal=f.after.players[f.owner].hp-f.before.players[f.owner].hp,damage=f.before.players[1-f.owner].hp-f.after.players[1-f.owner].hp,mana=f.before.players[1-f.owner].maxMana-f.after.players[1-f.owner].maxMana;
 if(!reduced){if(heal>0)hpFeedback(side,'heal',heal);if(damage>0)hpFeedback(foe,'dmg',damage);if(mana>0)manaDrop(foe,mana);}
 if(f.events.some(e=>e.type==='win')){phase('始原6種類成立 · 既存の勝利演出へ');setFxSkip(reduced);await deathShatter(foe,f.owner===0,'始原6種類');}
}
