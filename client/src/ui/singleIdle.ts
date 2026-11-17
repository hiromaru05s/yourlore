import {SRGBColorSpace,Texture} from 'three';
import {createSeekerPainting} from './homeSeeker';
import {homeIsCovered} from './screenCovered';
import {loadAssetImage} from './imageAssets';
import {createSingleIdleMotion} from './singleIdleMotion';
import type {SingleDifficulty} from '../shared/botNpcs';

// All coordinates are measured on the adopted 1024 × 1536 standing paintings.
// The full figure remains one continuous mesh: hands carry their cards, while
// cloth and hair receive smaller, delayed displacements within that same mesh.
const poses = {
  easy: {
    id:'lumi',neck:[.50,.19],hand:[.50,.27],sleeve:[.76,.34],
    hair:[.62,.17],hairRadius:[.10,.09],hem:[.27,.60],tilt:-.035,
    eyeA:[460,162,26,15],eyeB:[527,143,26,15],crop:[330,70,330,210],
  },
  normal: {
    id:'noel',neck:[.51,.18],hand:[.44,.30],sleeve:[.64,.32],
    hair:[.43,.085],hairRadius:[.15,.08],hem:[.72,.60],tilt:.032,
    eyeA:[467,149,23,12],eyeB:[521,132,24,12],crop:[330,60,330,210],
  },
  hard: {
    id:'vera',neck:[.51,.20],hand:[.47,.29],sleeve:[.66,.35],
    hair:[.64,.21],hairRadius:[.09,.15],hem:[.30,.60],tilt:-.037,
    eyeA:[460,182,24,13],eyeB:[520,161,25,14],crop:[330,70,330,230],
  },
} as const;

function standingVertex(key:SingleDifficulty) {
  const p=poses[key];
  return `
    uniform float time;
    uniform float gesture;
    varying vec2 texCoord;
    float brush(vec2 uv,vec2 center,vec2 radius){
      vec2 gap=(uv-center)/radius;
      return exp(-dot(gap,gap));
    }
    void main(){
      texCoord=uv;
      vec2 art=vec2(uv.x,1.-uv.y);
      vec2 pos=position.xy;
      float y=art.y;
      float hair=brush(art,vec2(${p.hair}),vec2(${p.hairRadius}));
      float hem=brush(art,vec2(${p.hem}),vec2(.15,.23));
      float sleeve=brush(art,vec2(${p.sleeve}),vec2(.14,.15));
      // A slow draught passes through the loose edges; the chest stays still.
      pos.x+=.009*hair*sin(time*1.15-3.*y);
      pos.x+=.010*hem*sin(time*.83-4.*y)+.003*sleeve*sin(time*.96-.8);
      pos.y+=.002*sleeve*sin(time*.96-.4);
      // A brief acknowledgement: tilt the head and lift the card with its hand.
      float head=1.-smoothstep(.16,.25,y);
      vec2 pivot=vec2(${p.neck})*vec2(2.,-2.)+vec2(-1.,1.);
      float angle=${p.tilt}*gesture;
      mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
      pos+=head*((rotation*(pos-pivot)+pivot)-pos);
      float hand=brush(art,vec2(${p.hand}),vec2(.12,.14));
      pos.y+=.034*hand*gesture;
      pos.x+=.009*hand*gesture;
      gl_Position=vec4(pos,0.,1.);
    }`;
}

function blinkFragment(key:SingleDifficulty){
  const p=poses[key];
  return `
    uniform sampler2D painting;
    uniform sampler2D eyelids;
    uniform float blink;
    varying vec2 texCoord;
    float eyeMask(vec2 pixel,vec4 eye){
      vec2 d=(pixel-eye.xy)/eye.zw;
      return 1.-smoothstep(.72,1.12,length(d));
    }
    void main(){
      vec4 paint=texture2D(painting,texCoord);
      vec2 pixel=vec2(texCoord.x,1.-texCoord.y)*vec2(1024.,1536.);
      vec4 region=vec4(${p.crop});
      vec2 lidUV=(pixel-region.xy)/region.zw;
      vec4 closed=texture2D(eyelids,vec2(lidUV.x,1.-lidUV.y));
      float mask=max(eyeMask(pixel,vec4(${p.eyeA})),eyeMask(pixel,vec4(${p.eyeB})));
      gl_FragColor=vec4(mix(paint.rgb,closed.rgb,mask*blink),paint.a);
      #include <colorspace_fragment>
      #include <premultiplied_alpha_fragment>
    }`;
}

export function mountSingleIdle(host:HTMLElement,key:SingleDifficulty):()=>void {
  const image=host.querySelector('img')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=createSingleIdleMotion();
  const uniforms={blink:{value:0},gesture:{value:0},eyelids:{value:null as Texture|null}};
  let painting:ReturnType<typeof createSeekerPainting>|undefined;
  let disposed=false,visible=false,decoded=false,failed=false;
  let frame=0,last=0;
  function tick(now:number) {
    frame=requestAnimationFrame(tick);
    if(!homeIsCovered() && !document.querySelector('.sp-deck-sheet[open]')){
      const state=motion.advance(last?Math.min(now-last,64)/1000:0);
      uniforms.blink.value=state.blink;
      uniforms.gesture.value=state.gesture;
      painting?.draw(state.time);
    }
    last=now;
  }
  function sync(){
    cancelAnimationFrame(frame);last=0;
    const active=visible && !disposed && !document.hidden && decoded && !reduced.matches;
    if(active && !painting && !failed){
      try {
        painting=createSeekerPainting(host,image,{
          vertexShader:standingVertex(key),fragmentShader:blinkFragment(key),uniforms,
        });
        painting.canvas.addEventListener('webglcontextlost',()=>{
          if(disposed)return;
          failed=true;painting?.destroy();painting=undefined;sync();
        },{once:true});
      }catch{failed=true;}
    }
    host.classList.toggle('is-painted',active && !!painting);
    if(active && painting)frame=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(host);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  void Promise.all([image.decode(),loadAssetImage('/art/single-standing/'+poses[key].id+'-eyelids.webp')]).then(([,lids])=>{
    if(disposed)return;
    const texture=new Texture(lids);
    texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;
    uniforms.eyelids.value=texture;decoded=true;sync();
  }).catch(()=>{});
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);observer.disconnect();
    reduced.removeEventListener('change',sync);
    document.removeEventListener('visibilitychange',sync);
    painting?.destroy();uniforms.eyelids.value?.dispose();
  };
}
