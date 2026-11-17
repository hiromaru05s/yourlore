import {manaReaction} from '../../ui/seekerArt/mana';
import {createLayer,type Illustration} from '../../ui/seekerArt/layer';
import {envelope} from '../../ui/seekerArt/ink';
import {votive,dew,pinions} from './heal';

export type Kind=Illustration['kind'];
export const studies:Illustration[]=[
  manaReaction,
  {id:'H4',kind:'heal',name:'命の灯火',duration:1800,paint:votive,
    pose:t=>[0,2*envelope(t,0,.18,.22,.42)-3*envelope(t,.29,.56,.65,1),-1.3*envelope(t,.15,.4,.55,.94)]},
  {id:'H5',kind:'heal',name:'癒やしの雫',duration:1880,paint:dew,
    pose:t=>[0,3*envelope(t,.30,.48,.52,.74)-1.8*envelope(t,.62,.76,.79,1),1.6*envelope(t,.04,.29,.41,.65)]},
  {id:'H6',kind:'heal',name:'白翼の祝福',duration:2000,paint:pinions,
    pose:t=>[0,2.2*envelope(t,0,.16,.24,.42)-4*envelope(t,.30,.57,.67,.98),-1.2*envelope(t,.18,.43,.65,.98)]},
];
export function mountStudy(image:HTMLImageElement){
  const layer=createLayer(image);
  const overlay=layer.canvas;
  image.after(overlay);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,finish=()=>{};
  function stop(){
    cancelAnimationFrame(raf);raf=0;layer.clear();finish();finish=()=>{};
  }
  function visibility(){if(document.hidden || reduced.matches)stop();}
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);
  function play(study:Illustration,speed=1){
    stop();if(document.hidden || reduced.matches)return Promise.resolve();
    const complete=new Promise<void>(resolve=>{finish=resolve;});
    const start=performance.now();
    function draw(now:number){
      const t=Math.max(0,(now-start)*speed/study.duration);
      if(t>=1||!image.isConnected){stop();return;}
      layer.paint(study,t);
      raf=requestAnimationFrame(draw);
    }
    draw(start);return complete;
  }
  stop();return {play,stop,destroy(){stop();overlay.remove();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);}};
}
