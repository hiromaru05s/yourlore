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
    if(req.kind==='arrival'||req.kind==='purchase'){
      const item=items.get(req.target.id);if(!item?.pile)return false;
      const count=Number(req.target.dataset.count)||0;
      const capture=await capturePileSurface(req.card,req.target.dataset.sleeve!);if(req.signal.aborted)return false;
      const map=new T.CanvasTexture(capture.face!);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      const moving=cardStock(texture(req.target.dataset.sleeve!),map);scene.add(moving);
      const from=req.card.getBoundingClientRect(),r=layoutRect(req.target),height=unit*(.126+Math.min(count+1,40)*.004);
      const purchase=req.kind==='purchase',origin=purchase?layoutRect(req.source):null;
      const elevation=purchase?unit*(req.source.closest('#supplyMarket')?.30:.22)+unit*.0075:unit*4;
      const start=origin?{x:origin.left+origin.width/2,y:origin.top+origin.height/2}:screenToBoard(from.left+from.width/2,from.top+from.height/2,elevation);
      const depth=focal-Math.sin(angle)*(start.y-cy)-Math.cos(angle)*elevation;
      const size=purchase?unit:from.width*depth/focal;
      req.card.style.visibility='hidden';req.target.dataset.motion='arrival';
      try{await timeline(reduced?100:purchase?960:620,req.signal,t=>{
        const p=purchase?smooth(sat((t-.18)/.82)):smooth(t),lift=Math.sin(Math.PI*t)*unit*(purchase?1.15:.65);
        moving.position.set(start.x-cx+(r.left+r.width/2-start.x)*p,elevation+(height-elevation)*p+lift,start.y-cy+(r.top+r.height/2-start.y)*p);
        moving.scale.setScalar(size+(unit-size)*p);moving.rotation.set(-Math.PI/2+(purchase?Math.sin(Math.PI*t)*.07:angle*(1-p)),0,0);
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
      try{await timeline(reduced?100:2450,req.signal,t=>{
        const cycle=sat((t-.15)/.65)*8,round=Math.min(7,Math.floor(cycle)),phase=cycle-round;
        root.dataset.shufflePhase=t<.15?'lift':t<.8?(phase<.45?'split':'interleave'):t<.93?'square':'land';
        root.dataset.shuffleRound=String(round+1);
        cards.forEach((m,i)=>{
          const lift=smooth(t/.15),travel=smooth((t-.08)/.77),land=smooth((t-.8)/.2);
          const local=sat((phase-(i%4)*.025)/.9),split=t>=.15&&t<.8?Math.sin(local*Math.PI)**.7:0;
          const side=(i+round)%2?1:-1;
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
      }finally{cards.forEach(dispose);req.source.classList.remove('is-shuffling');req.target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;delete root.dataset.shuffleRound;}
      return true;
    }
    const openingDecks=[...root.querySelectorAll<HTMLElement>('.pile--deck')].map(el=>({el,count:Number(el.dataset.count)||0}));
    const marketCards=[...root.querySelectorAll<HTMLElement>('#fixedMarket .card,#supplyMarket .card')];
    const movingCards:Array<{element:HTMLElement;mesh:T.Group;map:T.Texture;index:number;supply:boolean;landed:boolean}>=[];
    // Capture only the already-public market. Faces remain absent until their own flight.
    try { await Promise.allSettled(marketCards.map(async(element)=>{
      const surface=await capturePileSurface(element,openingDecks[0]?.el.dataset.sleeve||'/art/frames/back.webp',true);
      if(disposed||req.signal.aborted||!surface.face)return;
      const map=new T.CanvasTexture(surface.face);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
      const mesh=cardStock(texture(openingDecks[0].el.dataset.sleeve!),map);mesh.visible=false;scene.add(mesh);
      const supply=element.parentElement?.id==='supplyMarket',siblings=[...element.parentElement!.querySelectorAll('.card')];
      const index=supply?siblings.indexOf(element):siblings.length-1-siblings.indexOf(element);
      movingCards.push({element,mesh,map,index,supply,landed:false});element.style.visibility='hidden';
    }));
    if(disposed||req.signal.aborted)return false;
    for(const {el,count} of openingDecks){el.dataset.count=String(count+3);el.dataset.openingCount=String(count);}
    refresh();root.querySelector('.awaiting-board')?.classList.remove('awaiting-board');
    root.classList.add('duel-opening');root.dataset.openingPhase='market';
    const duration=4300,above=-innerHeight*.45,flightHeight=innerHeight*.45;
    // Project a start point outside the viewport instead of spawning at a fixed
    // small world height. This works at every viewport and for the back/front rows.
    const fromAbove=(r:DOMRect)=>screenToBoard(r.left+r.width/2,above,flightHeight);
    try{await timeline(reduced?100:duration,req.signal,t=>{
      const ms=t*duration;
      root.dataset.openingPhase=ms<700?'market':ms<2100?'market-cards':ms<2900?'furniture':'decks';
      for(const item of items.values()){
        const isMarket=item.market||item.supply,delay=isMarket?0:2100;
        const p=sat((ms-delay)/650),travel=p*p,r=layoutRect(item.element),from=fromAbove(r);
        item.group.userData.introHeight=flightHeight*(1-travel);
        item.group.userData.introZ=(from.y-(r.top+r.height/2))*(1-travel);
        item.group.visible=ms>=delay;
        if(p===1&&!item.group.userData.introLanded){item.group.userData.introLanded=true;dust(item.element);}
        if(item.pile)item.pile.cards.children.forEach((c,i)=>{
          const start=2900+950*Math.sqrt((i+1)/Math.max(1,item.pile!.cards.children.length));
          const v=sat((ms-start)/350);c.visible=ms>=start;c.userData.restY??=c.position.y;
          c.position.y=c.userData.restY+(flightHeight/unit)*(1-v*v);
          c.position.z=(from.y-(r.top+r.height/2))/unit*(1-v*v);
          if(v===1&&!c.userData.introLanded){c.userData.introLanded=true;if(i%3===0)dust(item.element);}
        });
      }
      for(const card of movingCards){
        const start=700+(card.supply?card.index*160+80:card.index*80),v=sat((ms-start)/650),p=v*v*v*v;
        const r=layoutRect(card.element),h=unit*(card.supply?.30:.22),sx=card.supply?-unit*2:innerWidth+unit*2;
        const from=screenToBoard(sx,-innerHeight*.2,flightHeight),x=r.left+r.width/2,z=r.top+r.height/2;
        card.mesh.visible=ms>=start&&ms<1960;card.mesh.scale.setScalar(unit);
        card.mesh.position.set(from.x-cx+(x-from.x)*p,flightHeight+(h-flightHeight)*p,from.y-cy+(z-from.y)*p);
        card.mesh.rotation.set(-Math.PI/2+(1-v)*.25,0,(card.supply?1:-1)*(1-v)*.16);
        if(v===1&&!card.landed){card.landed=true;card.element.dataset.introLanded='true';dust(card.element);}
        if(ms>=1960)card.element.style.visibility='';
      }
      const market=root.querySelector<HTMLElement>('.market-counter');if(market){
        // Empty furniture falls first; DOM controls are revealed after it lands.
        market.style.visibility=ms<650?'hidden':'';
        market.querySelectorAll<HTMLElement>('.sub-head,.reroll-hint').forEach(e=>e.style.visibility=ms<2050?'hidden':'');
      }
    });}finally{
      items.forEach(item=>{item.group.visible=true;delete item.group.userData.introHeight;delete item.group.userData.introZ;delete item.group.userData.introLanded;item.pile?.cards.children.forEach(c=>{c.visible=true;c.position.z=0;if(c.userData.restY!=null)c.position.y=c.userData.restY;delete c.userData.introLanded;});});
      const market=root.querySelector<HTMLElement>('.market-counter');market?.style.removeProperty('visibility');market?.querySelectorAll<HTMLElement>('.sub-head,.reroll-hint').forEach(e=>e.style.removeProperty('visibility'));
      projectBoardDOM(root);root.classList.remove('duel-opening');delete root.dataset.openingPhase;
    }
    }finally{movingCards.forEach(c=>{c.element.style.removeProperty('visibility');delete c.element.dataset.introLanded;dispose(c.mesh);c.map.dispose();});}
    return true;
  });
  return {tick(now:number){tasks.forEach(t=>t(now));return tasks.size>0;},dispose(){disposed=true;unbind();cancels.forEach(c=>c());}};
}
