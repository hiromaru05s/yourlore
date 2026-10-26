import {cloneCardNode} from './cardClone';
import {pileFace,marketHeight,STOCK_THICKNESS} from './readingBoardLayout';
import {CARD_RATIO,boardPoint,boardMatrix} from './boardProjection';
import * as T from 'three';
import {playMaterialReturn} from './shelfReturn';
import {bindBoardMotion,type BoardMotion} from './boardMotion';
import {type PileModel} from './pileModels';
import {boardLens,layoutRect,cardUnit,screenToBoard} from './boardProjection';
import {capturePileSurface} from './cardSurface';
type Item={group:T.Group;element:HTMLElement;pile?:PileModel;market:boolean;supply:boolean};
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
export function installSceneMotion(root:HTMLElement,scene:T.Scene,items:Map<string,Item>,texture:(url:string)=>T.Texture,refresh:()=>void,warm:()=>Promise<void>=async()=>{}){
  let disposed=false;
  const tasks=new Set<(now:number)=>void>(),cancels=new Set<()=>void>();
  const dust=(el:HTMLElement)=>window.dispatchEvent(new CustomEvent('lore:summon-dust',{detail:el.getBoundingClientRect()}));
  function timeline(ms:number,signal:AbortSignal,step:(t:number)=>void):Promise<void>{
    return new Promise(resolve=>{const start=performance.now();let done=false;
      const finish=()=>{if(done)return;done=true;step(1);tasks.delete(tick);cancels.delete(finish);signal.removeEventListener('abort',finish);resolve();};
      const tick=(now:number)=>{const t=sat((now-start)/ms);step(t);if(t===1)finish();};
      tasks.add(tick);cancels.add(finish);signal.addEventListener('abort',finish,{once:true});if(signal.aborted)finish();else step(0);
    });
  }
  const unbind=bindBoardMotion(async(req:BoardMotion)=>{
    if(disposed||!root.isConnected||req.signal.aborted)return false;
    refresh();const unit=cardUnit(root),{cx,cy,angle,focal}=boardLens();
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(req.kind==='arrival'||req.kind==='purchase'){
      const item=items.get(req.target.id);if(!item?.pile)return false;
      const count=Number(req.target.dataset.count)||0;
      // A rigid flight keeps the native print. There is no 3D rectangular stock
      // face, texture capture, or reconstructed DOM waiting at the destination.
      const moving=req.card,wasConnected=moving.isConnected,parent=moving.parentNode,next=moving.nextSibling,style=moving.style.cssText;
      const from=(req.kind==='purchase'?req.source:moving).getBoundingClientRect();
      const r=layoutRect(req.target),height=unit*pileFace(count+1,true);
      const purchase=req.kind==='purchase',origin=purchase?layoutRect(req.source):null;
      const elevation=purchase?unit*(marketHeight(!!req.source.closest('#supplyMarket'))+STOCK_THICKNESS/2):unit*4;
      const start=origin?{x:origin.left+origin.width/2,y:origin.top+origin.height/2}:screenToBoard(from.left+from.width/2,from.top+from.height/2,elevation);
      const depth=focal-Math.sin(angle)*(start.y-cy)-Math.cos(angle)*elevation;
      const size=origin?origin.width:from.width*depth/focal;
      const w=180,h=w/CARD_RATIO,ratio=1/CARD_RATIO;
      moving.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform-origin:0 0;pointer-events:none;visibility:visible;opacity:1;z-index:136;filter:none;transition:none`;
      moving.classList.add('native-card-flight');document.body.append(moving);req.target.dataset.motion='arrival';
      let landed=false;
      try{await timeline((reduced?100:purchase?620:420)*(req.kind==='arrival'?(req.durationScale??1):1),req.signal,t=>{
        const p=purchase?smooth(sat((t-.18)/.82)):smooth(t),lift=Math.sin(Math.PI*t)*unit*(purchase?1.15:.65);
        const x=start.x+(r.left+r.width/2-start.x)*p,y=start.y+(r.top+r.height/2-start.y)*p,z=elevation+(height-elevation)*p+lift,sz=size+(unit-size)*p;
        const matrix=boardMatrix(x,y,z).rotateAxisAngle(1,0,0,purchase?Math.sin(Math.PI*t)*4:18*(1-p)).translate(-sz/2,-sz*ratio/2).scale(sz/w,sz*ratio/h);
        moving.style.transform=matrix.toString();
        if(req.kind==='arrival'&&req.onFrame){const v=boardPoint(x,y,z);req.onFrame(new DOMRect(v.x-sz/2,v.y-sz*ratio/2,sz,sz*ratio));}
      });
      if(disposed||req.signal.aborted||!req.target.isConnected)return false;
      const print=document.createElement('div');print.className='pile-print';print.setAttribute('aria-hidden','true');
      // Move the same decoded children into the shelf's interaction owner.
      const copy=cloneCardNode(moving);copy.removeAttribute('style');copy.classList.remove('fx-card-flight','cast-reveal','native-card-flight');if(!moving.dataset.cardEffect&&!moving.dataset.cardFrame)copy.replaceChildren(...moving.childNodes);print.append(copy);
      req.target.querySelector('.pile-print')?.remove();req.target.append(print);
      req.target.dataset.face=copy.querySelector<HTMLImageElement>('.card-art img')?.src||req.target.dataset.sleeve!;
      req.target.dataset.count=String(count+1);const counter=req.target.querySelector('.pile-count');if(counter)counter.textContent=String(count+1);
      refresh();landed=true;moving.style.visibility='hidden';
      await timeline(34,req.signal,()=>{});if(!req.signal.aborted)dust(req.target);
      }finally{delete req.target.dataset.motion;moving.classList.remove('native-card-flight');moving.style.cssText=style;
        if(wasConnected&&parent)parent.insertBefore(moving,next?.parentNode===parent?next:null);else moving.remove();
        if(landed)moving.style.visibility='hidden';
      }
      return true;
    }
    if(req.kind==='shuffle'){
      const src=items.get(req.source.id),dest=items.get(req.target.id);if(!src?.pile||!dest?.pile)return false;
      const count=req.count;
      let face:T.CanvasTexture|undefined;
      const print=req.source.querySelector<HTMLElement>('.pile-print .card');
      if(print){try{const surface=await capturePileSurface(print,req.source.dataset.sleeve!);if(surface.face){face=new T.CanvasTexture(surface.face);face.colorSpace=T.SRGBColorSpace;}}catch{}}
      if(req.signal.aborted||disposed){face?.dispose();return false;}
      // The game gets an independent clock; the lab supplies its own scrubbable clock.
      const abort=new AbortController(),stop=()=>abort.abort();
      req.signal.addEventListener('abort',stop,{once:true});cancels.add(stop);
      window.addEventListener('resize',stop,{once:true});
      try{
        const args={root,scene,source:req.source,target:req.target,count,unit,cx,cy,texture,face,signal:abort.signal,warm,refresh};
        if(import.meta.env.DEV&&root.dataset.shelfReturnVariant){
          const {playShelfReturn}=await import('../dev/shelfReturnEffects');
          return await playShelfReturn(args);
        }
        return await playMaterialReturn(args);
      }finally{
        req.signal.removeEventListener('abort',stop);cancels.delete(stop);window.removeEventListener('resize',stop);face?.dispose();
      }
    }

    // Opening furniture flights were retired; the board starts fully assembled.
    return true;
  });
  return {tick(now:number){tasks.forEach(t=>t(now));return tasks.size>0;},dispose(){disposed=true;unbind();cancels.forEach(c=>c());}};
}
