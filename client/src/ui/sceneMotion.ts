import {pileCenter,marketHeight,STOCK_THICKNESS} from './readingBoardLayout';
import {boardPoint} from './boardProjection';
import * as T from 'three';
import {overhandPose} from './shufflePose';
import {bindBoardMotion,type BoardMotion} from './boardMotion';
import {cardStock,type PileModel} from './pileModels';
import {boardLens,layoutRect,cardUnit,screenToBoard} from './boardProjection';
import {capturePileSurface} from './cardSurface';
type Item={group:T.Group;element:HTMLElement;pile?:PileModel;market:boolean;supply:boolean};
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
export function installSceneMotion(root:HTMLElement,scene:T.Scene,items:Map<string,Item>,texture:(url:string)=>T.Texture,refresh:()=>void){
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
      try{await timeline(reduced?100:purchase?960:620,req.signal,t=>{
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
      const a=layoutRect(req.source),b=layoutRect(req.target),n=Math.min(req.count,20),cards:T.Group[]=[];
      // Reuse the exact resting stock, sleeve, lights and table camera throughout.
      for(let i=0;i<n;i++){const m=cardStock(texture(req.target.dataset.sleeve!));scene.add(m);cards.push(m);}
      req.source.classList.add('is-shuffling');req.target.classList.add('is-shuffling');root.dataset.shufflePhase='lift';
      let impacted=false;
      try{await timeline(reduced?100:2800,req.signal,t=>{
        // Lift together, mix faster while carrying, square above the deck, then
        // release the entire stack. No card drifts down during the mixing phase.
        const mixing=sat((t-.19)/.51),motion=overhandPose(t,0,n);
        root.dataset.shufflePhase=motion.phase;root.dataset.shuffleRound=String(motion.round);
        const lift=smooth(t/.19),travel=Math.pow(smooth(mixing),1.4),fall=sat((t-.8)/.15)**3;
        const rebound=t>.95?Math.sin((t-.95)/.05*Math.PI)*unit*.04:0;
        const square=smooth((t-.70)/.10);
        cards.forEach((m,i)=>{
          const pose=overhandPose(t,i,n);
          const x=a.left+a.width/2+(b.left+b.width/2-a.left-a.width/2)*travel;
          const z=a.top+a.height/2+(b.top+b.height/2-a.top-a.height/2)*travel;
          const rank=(i-8*Math.max(1,Math.floor(n/3))%n+n)%n;
          const rest=unit*(pileCenter(1,false)+(n<=1?0:rank/(n-1))*(pileCenter(req.count,false)-pileCenter(1,false)));
          const fromY=unit*(pileCenter(1,true)+(n<=1?0:i/(n-1))*(pileCenter(req.count,true)-pileCenter(1,true)));
          const stack=unit*(pileCenter(1,false)+pose.y);
          const level=fromY+(stack-fromY)*smooth(t/.19)+(rest-stack)*square;
          m.position.set(x-cx+pose.x*unit,level+unit*1.4*lift*(1-fall)+rebound,z-cy+pose.z*unit);
          m.scale.setScalar(unit);m.rotation.set(-Math.PI/2+pose.tilt,0,pose.roll);
        });
        if(t>=.95&&!impacted&&!req.signal.aborted){impacted=true;if(!reduced){
          window.dispatchEvent(new CustomEvent('lore:summon-impact',{detail:req.target.getBoundingClientRect()}));
          root.querySelector('.stage')?.animate([{translate:'0 0'},{translate:'0 2px'},{translate:'0 -1px'},{translate:'0 0'}],{duration:180});
        }}
      });
      if(disposed||req.signal.aborted)return false;
      req.target.dataset.count=String(req.count);req.source.dataset.count='0';
      req.source.querySelector('.pile-print')?.remove();delete req.source.dataset.face;
      for(const e of [req.source,req.target]){const c=e.querySelector('.pile-count');if(c)c.textContent=e.dataset.count!;}
      refresh();dust(req.target);
      }finally{cards.forEach(dispose);req.source.classList.remove('is-shuffling');req.target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;delete root.dataset.shuffleRound;}
      return true;
    }
    // Opening furniture flights were retired; the board starts fully assembled.
    return true;
  });
  return {tick(now:number){tasks.forEach(t=>t(now));return tasks.size>0;},dispose(){disposed=true;unbind();cancels.forEach(c=>c());}};
}
