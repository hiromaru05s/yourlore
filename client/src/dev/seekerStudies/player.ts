import {manaReaction} from '../../ui/seekerArt/mana';
import {createSeekerReaction} from '../../ui/seekerReaction';
import {createLayer} from '../../ui/seekerArt/layer';
import {createGreenLight,greenStudies} from './heal';

const baseline={id:'BASE' as const,kind:'heal' as const,name:'新アバターの基準光',duration:1780};
export const studies=[manaReaction,baseline,...greenStudies];
type Study=typeof studies[number];
export type Kind=Study['kind'];

export function mountStudy(image:HTMLImageElement){
  const state=document.createElement('canvas');
  let reference:ReturnType<typeof createSeekerReaction>|undefined;
  let mana:ReturnType<typeof createLayer>|undefined;
  let green:ReturnType<typeof createGreenLight>|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,finish=()=>{};
  function stop(){
    cancelAnimationFrame(raf);raf=0;
    reference?.reset();green?.clear();mana?.clear();
    delete image.dataset.playing;
    finish();finish=()=>{};
  }
  function visibility(){if(document.hidden || reduced.matches)stop();}
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);
  function play(study:Study,speed=1){
    stop();if(document.hidden || reduced.matches)return Promise.resolve();
    const complete=new Promise<void>(resolve=>{finish=resolve;});
    image.dataset.playing=study.id;
    if(study===baseline){
      if(!reference){reference=createSeekerReaction(image,state);image.after(reference.svg);}
      reference.play('heal',speed);
    }else if('exposure' in study){green??=createGreenLight(image);}
    else if(!mana){mana=createLayer(image);image.after(mana.canvas);}
    const start=performance.now();
    function draw(now:number){
      const t=Math.max(0,(now-start)*speed/study.duration);
      const done=study===baseline?state.dataset.action==='idle':t>=1;
      if(done||!image.isConnected){stop();return;}
      if('exposure' in study)green!.paint(study,t);
      else if('paint' in study)mana!.paint(study,t);
      raf=requestAnimationFrame(draw);
    }
    draw(start);return complete;
  }
  return {play,stop,destroy(){
    stop();reference?.svg.remove();green?.destroy();mana?.canvas.remove();
    document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);
  }};
}
