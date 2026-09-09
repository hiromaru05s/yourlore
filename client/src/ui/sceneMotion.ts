import * as T from 'three';
import {bindBoardMotion,type BoardMotion} from './boardMotion';
import {cardStock,type PileModel} from './pileModels';
import {boardLens,layoutRect,cardUnit,screenToBoard,projectBoardDOM} from './boardProjection';
import {capturePileSurface} from './cardSurface';
type Item={group:T.Group;element:HTMLElement;pile?:PileModel;market:boolean;supply:boolean};
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
export function installSceneMotion(root:HTMLElement,scene:T.Scene,items:Map<string,Item>,texture:(url:string)=>T.Texture,refresh:()=>void,surfaces:Map<string,T.Texture>,surfaceKey:(e:HTMLElement)=>string){
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
    if(req.kind==='arrival'){
      const item=items.get(req.target.id);if(!item?.pile)return false;
      const count=Number(req.target.dataset.count)||0;
      const capture=await capturePileSurface(req.card,req.target.dataset.sleeve!);if(req.signal.aborted)return false;
      const map=new T.CanvasTexture(capture.face!);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      const moving=cardStock(texture(req.target.dataset.sleeve!),map);scene.add(moving);
      const from=req.card.getBoundingClientRect(),r=layoutRect(req.target),height=unit*(.126+Math.min(count+1,40)*.004);
      const elevation=unit*4,start=screenToBoard(from.left+from.width/2,from.top+from.height/2,elevation);
      const depth=focal-Math.sin(angle)*(start.y-cy)-Math.cos(angle)*elevation;
      const size=from.width*depth/focal;
      req.card.style.visibility='hidden';req.target.dataset.motion='arrival';
      try{await timeline(reduced?100:620,req.signal,t=>{
        const p=smooth(t),lift=Math.sin(Math.PI*t)*unit*.65;
        moving.position.set(start.x-cx+(r.left+r.width/2-start.x)*p,elevation+(height-elevation)*p+lift,start.y-cy+(r.top+r.height/2-start.y)*p);
        moving.scale.setScalar(size+(unit-size)*p);moving.rotation.set(-Math.PI/2+angle*(1-p),0,0);
      });
      if(disposed||req.signal.aborted||!req.target.isConnected){map.dispose();return false;}
      const print=document.createElement('div');print.className='pile-print';print.setAttribute('aria-hidden','true');
      const copy=req.card.cloneNode(true) as HTMLElement;copy.removeAttribute('style');copy.classList.remove('fx-card-flight','cast-reveal');print.append(copy);
      req.target.querySelector('.pile-print')?.remove();req.target.append(print);
      req.target.dataset.face=copy.querySelector<HTMLImageElement>('.card-art img')?.src||req.target.dataset.sleeve!;
      req.target.dataset.count=String(count+1);const counter=req.target.querySelector('.pile-count');if(counter)counter.textContent=String(count+1);
      const key=surfaceKey(req.target);if(!surfaces.has(key))surfaces.set(key,map);else map.dispose();refresh();dust(req.target);
      }finally{delete req.target.dataset.motion;dispose(moving);req.card.style.visibility='';}
      return true;
    }
    if(req.kind==='shuffle'){
      const src=items.get(req.source.id),dest=items.get(req.target.id);if(!src?.pile||!dest?.pile)return false;
      const a=layoutRect(req.source),b=layoutRect(req.target),n=Math.min(req.count,20),cards:T.Group[]=[];
      // Reuse the exact resting stock, sleeve, lights and table camera throughout.
      for(let i=0;i<n;i++){const m=cardStock(texture(req.target.dataset.sleeve!));scene.add(m);cards.push(m);}
      req.source.classList.add('is-shuffling');req.target.classList.add('is-shuffling');root.dataset.shufflePhase='lift';
      try{await timeline(reduced?100:1950,req.signal,t=>{
        root.dataset.shufflePhase=t<.22?'lift':t<.46?'split':t<.73?'interleave':t<.9?'square':'land';
        cards.forEach((m,i)=>{
          const lift=smooth(t/.2),travel=smooth((t-.1)/.65),land=smooth((t-.78)/.22),merge=smooth((t-.38-i*.004)/.31);
          const split=smooth((t-.18)/.17)*(1-merge),side=i%2?1:-1;
          const x=a.left+a.width/2+(b.left+b.width/2-a.left-a.width/2)*travel;
          const z=a.top+a.height/2+(b.top+b.height/2-a.top-a.height/2)*travel;
          const rest=unit*(.144+(n<=1?0:i/(n-1))*Math.min(req.count,40)*.005);
          const fromY=unit*(.126+(n<=1?0:i/(n-1))*Math.min(req.count,40)*.004);
          m.position.set(x-cx+split*side*unit*.8,fromY+(rest-fromY)*travel+unit*1.3*lift*(1-land)+i*unit*.009*split,z-cy+side*split*unit*.15);
          m.scale.setScalar(unit);m.rotation.set(-Math.PI/2+split*.08,0,side*split*.16);
        });
      });
      if(disposed||req.signal.aborted)return false;
      req.target.dataset.count=String(req.count);req.source.dataset.count='0';
      for(const e of [req.source,req.target]){const c=e.querySelector('.pile-count');if(c)c.textContent=e.dataset.count!;}
      refresh();dust(req.target);
      }finally{cards.forEach(dispose);req.source.classList.remove('is-shuffling');req.target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;}
      return true;
    }
    const openingDecks=[...root.querySelectorAll<HTMLElement>('.pile--deck')].map(el=>({el,count:Number(el.dataset.count)||0}));
    for(const {el,count} of openingDecks){el.dataset.count=String(count+3);el.dataset.openingCount=String(count);}
    refresh();
    root.querySelector('.awaiting-board')?.classList.remove('awaiting-board');
    root.classList.add('duel-opening');root.dataset.openingPhase='market';
    try{await timeline(reduced?100:2600,req.signal,t=>{
      root.dataset.openingPhase=t<.28?'market':t<.5?'furniture':'decks';
      for(const item of items.values()){
        const delay=item.market||item.supply?0:.27;
        const p=sat((t-delay)/.24),height=p<1?3.8*(1-p*p):0;
        item.group.userData.introHeight=height*unit;
        item.group.visible=t>=delay;
        if(p===1&&!item.group.userData.introLanded){item.group.userData.introLanded=true;dust(item.element);}
        if(item.pile)item.pile.cards.children.forEach((c,i)=>{
          const start=.52+.34*Math.sqrt((i+1)/Math.max(1,item.pile!.cards.children.length));
          const v=sat((t-start)/.12);c.visible=t>=start;
          c.userData.restY??=c.position.y;c.position.y=c.userData.restY+4.5*(1-v*v);
          if(v===1&&!c.userData.introLanded){c.userData.introLanded=true;if(i%3===0)dust(item.element);}
        });
      }
      const market=root.querySelector<HTMLElement>('.market-counter');if(market){market.style.opacity=t<.02?'0':'1';market.dataset.introHeight=String(3.8*(1-sat(t/.24)**2)*unit);projectBoardDOM(root);}
    });}finally{
      items.forEach(item=>{item.group.visible=true;delete item.group.userData.introHeight;item.pile?.cards.children.forEach(c=>{c.visible=true;if(c.userData.restY!=null)c.position.y=c.userData.restY;});});
      const market=root.querySelector<HTMLElement>('.market-counter');market?.style.removeProperty('opacity');if(market)delete market.dataset.introHeight;projectBoardDOM(root);
      root.classList.remove('duel-opening');delete root.dataset.openingPhase;
    }
    return true;
  });
  return {tick(now:number){tasks.forEach(t=>t(now));return tasks.size>0;},dispose(){disposed=true;unbind();cancels.forEach(c=>c());}};
}
