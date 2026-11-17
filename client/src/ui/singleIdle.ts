import {createSeekerPainting} from './homeSeeker';
import {homeIsCovered} from './screenCovered';
import type {SingleDifficulty} from '../shared/botNpcs';

// The source paintings are full-length. Chest, cloth and hair coordinates are
// measured in each original image, with the origin at the upper left.
const poses = {
  easy:   {speed:1.40, chest:.286, sleeve:[.72,.33], hair:[.58,.145], hem:[.29,.62], lean:1.0},
  normal: {speed:1.22, chest:.278, sleeve:[.66,.29], hair:[.42,.105], hem:[.70,.63], lean:.83},
  hard:   {speed:1.52, chest:.267, sleeve:[.67,.33], hair:[.61,.165], hem:[.32,.65], lean:1.10},
} as const;

function standingVertex(key:SingleDifficulty) {
  const pose=poses[key];
  return `
    uniform float time;
    varying vec2 texCoord;
    float brush(vec2 uv,vec2 center,vec2 radius){
      vec2 gap=(uv-center)/radius;
      return exp(-dot(gap,gap));
    }
    void main(){
      texCoord=uv;
      vec2 art=vec2(uv.x,1.-uv.y);
      vec2 p=position.xy;
      float y=art.y, t=time*${pose.speed.toFixed(2)};
      float breath=sin(t);
      float upper=1.-smoothstep(.25,.65,y);
      float chest=brush(art,vec2(.5,${pose.chest}),vec2(.26,.15));
      // The torso transfers weight above the pelvis; legs and soles stay planted.
      p.x+=.015*${pose.lean.toFixed(2)}*upper*sin(time*.81);
      p.y+=.011*upper*sin(t-.18*upper);
      p.x+=(art.x-.50)*.051*chest*breath;
      float sleeve=brush(art,vec2(${pose.sleeve}),vec2(.15,.16));
      float hair=brush(art,vec2(${pose.hair}),vec2(.075,.09));
      float hem=brush(art,vec2(${pose.hem}),vec2(.16,.19));
      p.y+=.009*sleeve*sin(t-.40);
      p.x+=.009*hair*sin(t-.65)+.024*hem*sin(time*1.23-3.*y);
      gl_Position=vec4(p,0.,1.);
    }`;
}

export function mountSingleIdle(host:HTMLElement,key:SingleDifficulty):()=>void {
  const image=host.querySelector('img')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let painting:ReturnType<typeof createSeekerPainting>|undefined;
  let disposed=false,visible=false,decoded=false,failed=false;
  let frame=0,last=0,elapsed=0;
  function tick(now:number) {
    frame=requestAnimationFrame(tick);
    if(!homeIsCovered() && !document.querySelector('.sp-deck-sheet[open]')){
      elapsed+=last?Math.min(now-last,64)/1000:0;
      painting?.draw(elapsed);
    }
    last=now;
  }
  function sync(){
    cancelAnimationFrame(frame);last=0;
    const active=visible && !disposed && !document.hidden && decoded && !reduced.matches;
    if(active && !painting && !failed){
      try {
        painting=createSeekerPainting(host,image,standingVertex(key));
        painting.canvas.addEventListener('webglcontextlost',()=>{
          if(disposed)return;
          failed=true;painting?.destroy();painting=undefined;sync();
        },{once:true});
      }catch{failed=true;}
    }
    host.classList.toggle('is-painted',active && !!painting);
    host.classList.toggle('sp-idle-fallback',active && failed);
    if(active && painting)frame=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(host);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  void image.decode().then(()=>{if(!disposed){decoded=true;sync();}}).catch(()=>{});
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);observer.disconnect();
    reduced.removeEventListener('change',sync);
    document.removeEventListener('visibilitychange',sync);
    painting?.destroy();
  };
}
