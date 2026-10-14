import { captureCardSurface, CARD_PADDING } from '../cardSurface';
import { FRAME_BACK } from '../../shared/cards';

/** Public board only. Opposing hidden hands are never read or rasterized. */
export async function snapshotBoard(root:HTMLElement,signal:AbortSignal):Promise<HTMLCanvasElement> {
  const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio,1.5);
  const out=document.createElement('canvas');out.width=Math.round(w*d);out.height=Math.round(h*d);const ctx=out.getContext('2d')!;ctx.scale(d,d);
  const bg=ctx.createRadialGradient(w*.5,h*.35,0,w*.5,h*.35,h);bg.addColorStop(0,'#303b49');bg.addColorStop(1,'#151b24');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const nodes=[...root.querySelectorAll<HTMLElement>('.card')].filter(n=>!n.closest('#oppHand,#hand,.pile-print,.card-zoom,.card-detail,.is-played,.card--back')&&n.getBoundingClientRect().width>15&&getComputedStyle(n).visibility!=='hidden');
  const surfaces:{r:DOMRect;s:HTMLCanvasElement}[]=[];
  // Rasterize sequentially and immediately release the full-resolution card buffers.
  // Parallel 1536px card captures can exhaust a 16GB machine during a board transition.
  try {
  for(const node of nodes){
    signal.throwIfAborted();
    try{const r=node.getBoundingClientRect(),full=await captureCardSurface(node,FRAME_BACK,true,false);
      if(full.face){const s=document.createElement('canvas');s.width=512;s.height=Math.round(512*full.face.height/full.face.width);s.getContext('2d')!.drawImage(full.face,0,0,s.width,s.height);full.face.width=1;full.face.height=1;surfaces.push({r,s});}
      full.back.width=1;full.back.height=1;
    }catch{/* An unavailable optional public card must not block the effect. */}
  }
  // Request the existing renderer to present its cached table, then copy during the same paint.
  for(let pass=0;pass<3;pass++){
    signal.throwIfAborted();
    window.dispatchEvent(new Event('lore:layout'));
    await new Promise<void>(resolve=>requestAnimationFrame(()=>{
      const table=root.querySelector<HTMLCanvasElement>('.duel-objects-3d');
      if(table){const r=table.getBoundingClientRect();ctx.drawImage(table,r.x,r.y,r.width,r.height);}resolve();
    }));
  }
  for(const {r,s} of surfaces){const p=s.width/(1+2*CARD_PADDING)*CARD_PADDING;ctx.drawImage(s,p,p,s.width-p*2,s.height-p*2,r.x,r.y,r.width,r.height);s.width=s.height=1;}
  signal.throwIfAborted();return out;
  } catch(e){out.width=out.height=1;throw e;} finally{for(const {s} of surfaces)s.width=s.height=1;}
}
