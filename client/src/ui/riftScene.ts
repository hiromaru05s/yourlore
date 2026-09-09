import * as T from 'three';
import {captureCardSurface} from './cardSurface';
import {PaperCard} from './paperCard';
import {foldIntoRift} from './riftFold';

/** One public card bends into the slit, front, reverse and stock edge together. */
export async function swallowRiftCard(node:HTMLElement,target:HTMLElement,start:DOMMatrix,signal:AbortSignal,onStart:()=>void):Promise<void>{
  const width=innerWidth,height=innerHeight,w=node.offsetWidth,h=node.offsetHeight;
  if(signal.aborted||!w||!h)return;
  const host=node.cloneNode(true) as HTMLElement;
  host.removeAttribute('id');host.classList.remove('fx-card-flight','cast-reveal','drag-ghost--hand');
  host.style.cssText=`position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;transform:none;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px`;
  document.body.append(host);
  const sleeve=document.querySelector<HTMLElement>('.pile--deck')?.dataset.sleeve||'/art/frames/back.webp';
  let surface;
  try{surface=await captureCardSurface(host,sleeve,true);}finally{host.remove();}
  if(signal.aborted||!node.isConnected)return;
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  const canvas=renderer.domElement;canvas.className='rift-fold-canvas';canvas.setAttribute('aria-hidden','true');
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(width,height);renderer.setClearColor(0,0);
  renderer.toneMapping=T.NoToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,4000);camera.position.z=2000;
  scene.add(new T.AmbientLight(0xffffff,1.5));
  const card=new PaperCard(surface,h/w);scene.add(card.group);
  const r=target.getBoundingClientRect(),sink={x:r.left+r.width/2,y:r.top+r.height/2,z:0};
  const project=(x:number,y:number,z=0)=>{const p=start.transformPoint(new DOMPoint(x*w,y*h,z));return {x:p.x/p.w,y:p.y/p.w,z};};
  const edges=[[.5,0],[.5,1],[0,.5],[1,.5]],nearest=edges.map(([x,y])=>project(x,y)).map(p=>Math.hypot(p.x-sink.x,p.y-sink.y));
  const edge=nearest.indexOf(Math.min(...nearest)),oldVisibility=node.style.visibility;
  let frame=0,finish=()=>{};
  const abort=()=>finish(),lost=(e:Event)=>{e.preventDefault();finish();};
  signal.addEventListener('abort',abort,{once:true});canvas.addEventListener('webglcontextlost',lost);
  try{
    document.body.append(canvas);const begun=performance.now();
    await new Promise<void>(resolve=>{
      let ended=false;finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);resolve();};
      const tick=(now:number)=>{
        if(signal.aborted||document.hidden||!node.isConnected||innerWidth!==width||innerHeight!==height){finish();return;}
        const t=Math.min(1,(now-begun)/1350);canvas.dataset.progress=t.toFixed(3);
        card.deformWith((x,y,z)=>{
          const nx=x+.5,ny=.5-y/(h/w);
          const q=edge===0?1-ny:edge===1?ny:edge===2?1-nx:nx;
          const row=project(edge<2?.5:nx,edge<2?ny:.5);
          const p=foldIntoRift(project(nx,ny,z*w),row,sink,q,t,w);
          return [p.x-width/2,height/2-p.y,p.z];
        });
        renderer.render(scene,camera);
        if(t===1){finish();return;}
        frame=requestAnimationFrame(tick);
      };
      tick(begun);node.style.visibility='hidden';onStart();
    });
  }finally{
    cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);canvas.removeEventListener('webglcontextlost',lost);
    card.dispose();renderer.dispose();canvas.remove();node.style.visibility=oldVisibility;
  }
}
