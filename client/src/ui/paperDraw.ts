import * as T from 'three';
import { captureCardSurface } from './cardSurface';
import { PaperCard, drawPose } from './paperCard';

export interface PaperDrawOptions {
  cards: HTMLElement[];
  origin: DOMRect;
  sleeve: string;
  reveal: boolean;
  signal: AbortSignal;
  onLand: (node:HTMLElement) => void;
}
const DURATION=860, STAGGER=135;

/** A batch shares one GPU context. The idle UI remains semantic DOM; only
 * moving cards are replaced by deformable meshes, then handed back exactly. */
export async function drawPaperCards({cards,origin,sleeve,reveal,signal,onLand}:PaperDrawOptions):Promise<void> {
  if(signal.aborted || typeof WebGL2RenderingContext==='undefined')return;
  let renderer:T.WebGLRenderer;
  try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch {return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0,0);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const canvas=renderer.domElement;canvas.className='paper-draw-canvas';canvas.setAttribute('aria-hidden','true');
  const scene=new T.Scene(), distance=1200;
  const camera=new T.PerspectiveCamera(2*Math.atan(innerHeight/(2*distance))*180/Math.PI,innerWidth/innerHeight,.1,3000);
  camera.position.z=distance;
  scene.add(new T.AmbientLight(0xffffff,1.75));
  const light=new T.DirectionalLight(0xfff4e3,1.55);light.position.set(-250,500,900);scene.add(light);
  const rim=new T.DirectionalLight(0xc7ddff,.7);rim.position.set(350,50,-500);scene.add(rim);
  const models:PaperCard[]=[];
  const shadows:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>[]=[];
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,8,64,64,64);
  gradient.addColorStop(0,'rgba(8,15,24,.35)');gradient.addColorStop(1,'rgba(8,15,24,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowTexture=new T.CanvasTexture(shadowCanvas);
  let frame=0,stop=()=>{},aborted=false;
  const cancelled=new Promise<null>(resolve=>{stop=()=>{aborted=true;resolve(null);};});
  const lost=(e:Event)=>{e.preventDefault();stop();};
  signal.addEventListener('abort',onAbort,{once:true});
  canvas.addEventListener('webglcontextlost',lost);
  // A slow/missing texture must never hold the game's event playback hostage.
  const deadline=setTimeout(stop,1800);
  try {
    const surfaces=await Promise.race([Promise.all(cards.map(node=>captureCardSurface(node,sleeve,reveal))),cancelled]);
    clearTimeout(deadline);
    if(!surfaces || aborted || signal.aborted || cards.some(n=>!n.isConnected))return;
    cards.forEach((node,i)=>{
      const rect=node.getBoundingClientRect();
      const model=new PaperCard(surfaces[i],rect.height/rect.width);models.push(model);scene.add(model.group);
      const shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));
      shadow.position.z=-40;shadows.push(shadow);scene.add(shadow);
    });
    document.body.appendChild(canvas);
    const width=innerWidth,height=innerHeight,start=performance.now();
    await new Promise<void>(resolve=>{
      const finish=()=>{cancelAnimationFrame(frame);resolve();};
      // Abort also releases a frame wait when the tab stops receiving rAF.
      void cancelled.then(finish);
      const tick=(now:number)=>{
        if(aborted || signal.aborted || document.hidden || innerWidth!==width || innerHeight!==height || cards.some(n=>!n.isConnected)) {finish();return;}
        let running=false;
        models.forEach((model,i)=>{
          const elapsed=now-start-i*STAGGER,t=Math.min(1,Math.max(0,elapsed/DURATION));
          const visible=elapsed>=0 && t<1;model.group.visible=visible;shadows[i].visible=visible;
          if(elapsed<DURATION)running=true;
          if(!visible){if(t===1)onLand(cards[i]);return;}
          const target=cards[i].getBoundingClientRect(),pose=drawPose(t,reveal);
          const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
          const tx=target.left+target.width/2,ty=target.top+target.height/2;
          // The lead edge lifts before translation. The carried card follows a
          // shallow arc; it is not a tumbling projectile or a repeating wave.
          const x=ox+(tx-ox)*pose.travel;
          const y=oy+(ty-oy)*pose.travel-32*pose.lift;
          const size=origin.width+(target.width-origin.width)*pose.travel;
          model.group.position.set(x-width/2,height/2-y,65*pose.lift);
          model.group.scale.set(size,size, size);
          model.group.rotation.set(pose.rx,pose.ry,pose.rz);
          model.deform(pose.bend,pose.twist);
          const shadow=shadows[i];shadow.position.x=x-width/2+7*pose.lift;shadow.position.y=height/2-y-12*pose.lift;
          shadow.scale.set(size*(1.25+.4*pose.lift),size*target.height/target.width*(1.1+.25*pose.lift),1);
          shadow.material.opacity=.8-.35*pose.lift;
        });
        try {renderer.render(scene,camera);}catch{finish();return;}
        if(running)frame=requestAnimationFrame(tick);else finish();
      };
      frame=requestAnimationFrame(tick);
    });
  } catch {
    // A missing image/context skips decorative playback; gameplay still commits.
  } finally {
    clearTimeout(deadline);cancelAnimationFrame(frame);
    signal.removeEventListener('abort',onAbort);
    canvas.removeEventListener('webglcontextlost',lost);
    models.forEach(m=>m.dispose());shadows.forEach(s=>{s.geometry.dispose();s.material.dispose();});
    shadowTexture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
  function onAbort():void {stop();}
}
