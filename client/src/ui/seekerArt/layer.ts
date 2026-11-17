import type {Brush} from './ink';

export type Illustration = {
  id:string; kind:'mana'|'heal'; name:string; duration:number;
  paint:(ctx:Brush, t:number)=>void;
  pose:(t:number)=>[number,number,number];
};

export function createLayer(image:HTMLImageElement) {
  const canvas=document.createElement('canvas');
  canvas.className='seeker-study-ink';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden=true;
  canvas.width=canvas.height=384;
  const ctx=canvas.getContext('2d');
  function clear(){
    if(canvas.hidden)return;
    canvas.hidden=true;
    delete canvas.dataset.playing;
    for(const el of [image,canvas]){
      el.style.removeProperty('transform');
      el.style.removeProperty('transform-origin');
    }
  }
  function paint(study:Illustration,t:number){
    if(!ctx)return;
    canvas.hidden=false;
    canvas.dataset.playing=study.id;
    const [x,y,angle]=study.pose(t);
    for(const el of [image,canvas]){
      el.style.transformOrigin='44% 78%';
      el.style.transform=`translate(${x/2.56}%,${y/2.56}%) rotate(${angle}deg)`;
    }
    ctx.setTransform(1.5,0,0,1.5,0,0);
    ctx.clearRect(0,0,256,256);
    ctx.save();
    study.paint(ctx,t);
    ctx.restore();
  }
  return {canvas,paint,clear};
}
