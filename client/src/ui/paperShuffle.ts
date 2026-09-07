import * as T from 'three';
import { captureCardBack } from './cardSurface';
import { PaperCard } from './paperCard';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};

/** Choreographed physical packets: lift from the rack, split, interleave, land.
 * Indices are visual layers only, unrelated to the hidden shuffled card order. */
export function shufflePose(t:number,i:number,n:number){
  const lift=ease(0,.23,t),merge=ease(.38+i*.009,.70+i*.009,t),land=ease(.79,1,t);
  const spread=Math.sin(Math.PI*ease(.12,.76,t));
  return {
    travel:ease(.08,.86,t),
    lift:(1-land)*lift,
    spread:(i%2?1:-1)*spread*(1-merge),
    fan:(i-(n-1)/2)*.016*spread,
    stack:i*.65,
    rx:-.15*lift-(.95-.15)*land,
    rz:Math.PI/2*(1-lift)+(i%2?-.15:.15)*spread*(1-merge),
    bend:.3*Math.sin(Math.PI*merge)*Math.sin(Math.PI*t),
    settle:Math.sin(land*Math.PI)*2,
  };
}
export async function shufflePaperCards(shelf:HTMLElement,deck:HTMLElement,count:number,signal:AbortSignal):Promise<void>{
  if(signal.aborted)return;
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
  const canvas=renderer.domElement;canvas.className='paper-draw-canvas paper-shuffle-canvas';canvas.setAttribute('aria-hidden','true');
  const w=innerWidth,h=innerHeight,distance=1200;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(2*Math.atan(h/(2*distance))*180/Math.PI,w/h,.1,3000);camera.position.z=distance;
  scene.add(new T.AmbientLight(0xffffff,1.75));
  const light=new T.DirectionalLight(0xffeed9,1.7);light.position.set(-250,500,900);scene.add(light);
  const models:PaperCard[]=[];let frame=0,stop=()=>{},aborted=false;
  const cancelled=new Promise<null>(resolve=>{stop=()=>{aborted=true;resolve(null);};});
  const lost=(e:Event)=>{e.preventDefault();stop();};
  signal.addEventListener('abort',stop,{once:true});canvas.addEventListener('webglcontextlost',lost);
  const timeout=setTimeout(stop,1800);
  try{
    // No deck faces or ordering are read, even for the local player.
    const surface=await Promise.race([captureCardBack(deck.dataset.sleeve!),cancelled]);
    clearTimeout(timeout);if(!surface||aborted||signal.aborted||!deck.isConnected)return;
    const origin=(shelf.querySelector('.pile-draw-anchor')||shelf).getBoundingClientRect();
    const target=(deck.querySelector('.pile-draw-anchor')||deck).getBoundingClientRect();
    const n=Math.min(12,count),size=target.width;
    for(let i=0;i<n;i++){const card=new PaperCard(surface,1/.64);models.push(card);scene.add(card.group);}
    shelf.classList.add('is-shuffling');deck.classList.add('is-shuffling');document.body.append(canvas);
    const start=performance.now();
    await new Promise<void>(resolve=>{
      const finish=()=>{cancelAnimationFrame(frame);resolve();};void cancelled.then(finish);
      const tick=(now:number)=>{
        if(aborted||signal.aborted||document.hidden||innerWidth!==w||innerHeight!==h||!deck.isConnected||!shelf.isConnected){finish();return;}
        const t=clamp((now-start)/1850);
        models.forEach((m,i)=>{
          const p=shufflePose(t,i,n);
          const x=origin.left+origin.width/2+(target.left+target.width/2-origin.left-origin.width/2)*p.travel+p.spread*size*.7;
          const y=origin.top+origin.height/2+(target.top+target.height/2-origin.top-origin.height/2)*p.travel-p.lift*size*1.65-p.stack*p.lift-p.settle;
          m.group.position.set(x-w/2,h/2-y,35*p.lift+i*.25);
          const carriedSize=origin.width*.64+(size-origin.width*.64)*ease(0,.3,t);
          m.group.scale.setScalar(carriedSize);m.group.rotation.set(p.rx,Math.PI,p.rz+p.fan);
          m.deform(p.bend,p.fan*.16);
        });
        try{renderer.render(scene,camera);}catch{finish();return;}
        if(t<1)frame=requestAnimationFrame(tick);else finish();
      };frame=requestAnimationFrame(tick);
    });
  }catch{/* Decorative GPU failures never delay or change game state. */}
  finally{
    clearTimeout(timeout);cancelAnimationFrame(frame);signal.removeEventListener('abort',stop);canvas.removeEventListener('webglcontextlost',lost);
    shelf.classList.remove('is-shuffling');deck.classList.remove('is-shuffling');
    models.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
}
