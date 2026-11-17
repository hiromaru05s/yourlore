import {manuscript,sapphire,twinQuills} from './mana';
import {mending,laurel,mantle} from './heal';
import {envelope,type Brush} from './ink';
export type Kind='mana'|'heal';
type Study={id:string; kind:Kind; name:string; duration:number; paint:(c:Brush,t:number)=>void; pose:(t:number)=>[number,number,number]};
export const studies:Study[]=[
  {id:'M1',kind:'mana',name:'双筆の金縁',duration:1550,paint:twinQuills,pose:t=>[0,-2.6*envelope(t,.13,.50,.65,1),-1.5*envelope(t,.04,.24,.44,.93)]},
  {id:'M2',kind:'mana',name:'留め金の蒼晶',duration:1710,paint:sapphire,pose:t=>[0,2*envelope(t,0,.16,.19,.4)-2*envelope(t,.22,.48,.65,.98),0]},
  {id:'M3',kind:'mana',name:'魔導書の一葉',duration:1820,paint:manuscript,pose:t=>[-2*envelope(t,.10,.36,.67,1),3*envelope(t,.04,.32,.64,.96),2.6*envelope(t,0,.40,.61,1)]},
  {id:'H1',kind:'heal',name:'銀糸の繕い',duration:1750,paint:mending,pose:t=>[2*envelope(t,.03,.20,.55,.93),1.8*envelope(t,0,.22,.58,.98),-2.3*envelope(t,.07,.23,.47,1)]},
  {id:'H2',kind:'heal',name:'月桂の刺繍',duration:2040,paint:laurel,pose:t=>[0,-2.8*envelope(t,.15,.55,.68,.98),1.3*envelope(t,.06,.35,.49,.90)]},
  {id:'H3',kind:'heal',name:'外套の抱擁',duration:1960,paint:mantle,pose:t=>[0,4.3*envelope(t,.02,.40,.57,.97),-1.8*envelope(t,.12,.48,.68,.98)]},
];
export function mountStudy(image:HTMLImageElement){
  const overlay=document.createElement('canvas');overlay.className='seeker-study-ink';
  overlay.setAttribute('aria-hidden','true');overlay.width=overlay.height=384;image.after(overlay);
  const ctx=overlay.getContext('2d')!,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,finish=()=>{};
  function stop(){
    cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,384,384);overlay.hidden=true;
    for(const el of [image,overlay]){el.style.removeProperty('transform');el.style.removeProperty('transform-origin');}
    delete overlay.dataset.playing;finish();finish=()=>{};
  }
  function visibility(){if(document.hidden || reduced.matches)stop();}
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);
  function play(study:Study,speed=1){
    stop();if(document.hidden || reduced.matches)return Promise.resolve();
    const complete=new Promise<void>(resolve=>{finish=resolve;});
    const start=performance.now();overlay.hidden=false;overlay.dataset.playing=study.id;
    function draw(now:number){
      const t=Math.max(0,(now-start)*speed/study.duration);
      if(t>=1||!image.isConnected){stop();return;}
      const [x,y,angle]=study.pose(t);
      for(const el of [image,overlay]){
        el.style.transformOrigin='44% 78%';el.style.transform=`translate(${x/2.56}%,${y/2.56}%) rotate(${angle}deg)`;
      }
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,384,384);
      ctx.save();ctx.scale(1.5,1.5);study.paint(ctx,t);ctx.restore();
      raf=requestAnimationFrame(draw);
    }
    draw(start);return complete;
  }
  stop();return {play,stop,destroy(){stop();overlay.remove();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);}};
}
