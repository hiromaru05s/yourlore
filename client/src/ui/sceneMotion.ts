import {pileCenter,marketHeight,STOCK_THICKNESS} from './readingBoardLayout';
import {boardPoint} from './boardProjection';
import * as T from 'three';
import {playMaterialReturn} from './shelfReturn';
import {bindBoardMotion,type BoardMotion} from './boardMotion';
import {cardStock,type PileModel} from './pileModels';
import {boardLens,layoutRect,cardUnit,screenToBoard} from './boardProjection';
import {capturePileSurface} from './cardSurface';
type Item={group:T.Group;element:HTMLElement;pile?:PileModel;market:boolean;supply:boolean};
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
export function installSceneMotion(root:HTMLElement,scene:T.Scene,items:Map<string,Item>,texture:(url:string)=>T.Texture,refresh:()=>void,warm:()=>Promise<void>=async()=>{}){
  let disposed=false;
  const tasks=new Set<(now:number)=>void>(),cancels=new Set<()=>void>();
  const dust=(el:HTMLElement)=>window.dispatchEvent(new CustomEvent('lore:summon-dust',{detail:el.getBoundingClientRect()}));
  function dispose(g:T.Group){scene.remove(g);g.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});}
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
      const capture=await capturePileSurface(req.card,req.target.dataset.sleeve!);if(req.signal.aborted)return false;
      const map=new T.CanvasTexture(capture.face!);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
      const moving=cardStock(texture(req.target.dataset.sleeve!),map);scene.add(moving);
      const from=req.card.getBoundingClientRect(),r=layoutRect(req.target),height=unit*pileCenter(count+1,true);
      const purchase=req.kind==='purchase',origin=purchase?layoutRect(req.source):null;
      const elevation=purchase?unit*(marketHeight(!!req.source.closest('#supplyMarket'))+STOCK_THICKNESS/2):unit*4;
      const start=origin?{x:origin.left+origin.width/2,y:origin.top+origin.height/2}:screenToBoard(from.left+from.width/2,from.top+from.height/2,elevation);
      const depth=focal-Math.sin(angle)*(start.y-cy)-Math.cos(angle)*elevation;
      const size=purchase?unit:from.width*depth/focal;
      req.card.style.visibility='hidden';req.target.dataset.motion='arrival';
      try{await timeline(reduced?100:purchase?620:420,req.signal,t=>{
        const p=purchase?smooth(sat((t-.18)/.82)):smooth(t),lift=Math.sin(Math.PI*t)*unit*(purchase?1.15:.65);
        moving.position.set(start.x-cx+(r.left+r.width/2-start.x)*p,elevation+(height-elevation)*p+lift,start.y-cy+(r.top+r.height/2-start.y)*p);
        moving.scale.setScalar(size+(unit-size)*p);
        if(req.kind==='arrival'&&req.onFrame){const v=boardPoint(moving.position.x+cx,moving.position.z+cy,moving.position.y),sz=moving.scale.x;req.onFrame(new DOMRect(v.x-sz/2,v.y-sz/.64/2,sz,sz/.64));}
        moving.rotation.set(-Math.PI/2+(purchase?Math.sin(Math.PI*t)*.07:angle*(1-p)),0,0);
      });
      if(disposed||req.signal.aborted||!req.target.isConnected){return false;}
      const print=document.createElement('div');print.className='pile-print';print.setAttribute('aria-hidden','true');
      const copy=req.card.cloneNode(true) as HTMLElement;copy.removeAttribute('style');copy.classList.remove('fx-card-flight','cast-reveal');copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*unit/(req.card.offsetWidth||unit)}px`;});print.append(copy);
      req.target.querySelector('.pile-print')?.remove();req.target.append(print);
      req.target.dataset.face=copy.querySelector<HTMLImageElement>('.card-art img')?.src||req.target.dataset.sleeve!;
      req.target.dataset.count=String(count+1);const counter=req.target.querySelector('.pile-count');if(counter)counter.textContent=String(count+1);
      refresh();
      await timeline(34,req.signal,()=>{});if(!req.signal.aborted)dust(req.target);
      }finally{delete req.target.dataset.motion;dispose(moving);map.dispose();req.card.style.visibility='';}
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
