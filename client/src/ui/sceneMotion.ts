import {reformVeil} from './reformVeil';
import {pileCenter,pileFace,marketHeight,STOCK_THICKNESS} from './readingBoardLayout';
import {boardPoint} from './boardProjection';
import * as T from 'three';
import {reformState,REFORM_DURATION} from './deckReform';
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
      const a=layoutRect(req.source),b=layoutRect(req.target),count=req.count;
      let face:T.CanvasTexture|undefined;
      const print=req.source.querySelector<HTMLElement>('.pile-print .card');
      if(print){try{const surface=await capturePileSurface(print,req.source.dataset.sleeve!);if(surface.face){face=new T.CanvasTexture(surface.face);face.colorSpace=T.SRGBColorSpace;}}catch{}}
      if(req.signal.aborted||disposed){face?.dispose();return false;}
      type Surface={material:T.MeshBasicMaterial|T.MeshStandardMaterial;color:T.Color};
      const build=(shelf:boolean)=>{
        const group=new T.Group(),surfaces:Surface[]=[],n=Math.min(count,shelf?12:20),height=Math.max(0,Math.min(count,40)-1)*STOCK_THICKNESS;
        for(let i=0;i<n;i++){
          const card=cardStock(texture((shelf?req.source:req.target).dataset.sleeve!),shelf&&i===n-1?face:undefined,shelf&&i<n-1);card.rotation.x=-Math.PI/2;
          card.position.y=pileCenter(1,shelf)+(n<=1?0:i/(n-1)*height);group.add(card);
          card.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof T.MeshBasicMaterial||material instanceof T.MeshStandardMaterial){material.transparent=true;surfaces.push({material,color:material.color.clone()});}});
        }
        group.scale.setScalar(unit);scene.add(group);return {group,surfaces};
      };
      const source=build(true),target=build(false),sparkGroup=new T.Group();scene.add(sparkGroup);
      source.group.position.set(a.left+a.width/2-cx,0,a.top+a.height/2-cy);target.group.position.set(b.left+b.width/2-cx,0,b.top+b.height/2-cy);sparkGroup.position.copy(target.group.position);
      const sparks=Array.from({length:12},(_,i)=>{const m=new T.Mesh(new T.OctahedronGeometry(unit*.026,0),new T.MeshBasicMaterial({color:i%3?0x63c7ff:0xe1faff,transparent:true,depthWrite:false}));sparkGroup.add(m);return m;});
      const coat=(actor:typeof source,charge:number,opacity:number)=>{actor.group.visible=opacity>.001;for(const {material,color} of actor.surfaces){material.color.copy(color).lerp(new T.Color('#409fe9'),charge);material.opacity=opacity;if(material instanceof T.MeshStandardMaterial){material.emissive.set('#2baeff');material.emissiveIntensity=charge*1.7;}else if(material.map){material.color.lerp(new T.Color('#c6f5ff'),charge*.4);}}};
      const veil=(actor:typeof source,shelf:boolean)=>{const v=reformVeil(unit);v.mesh.position.copy(actor.group.position);v.mesh.position.y=unit*(pileFace(count,shelf)+.006);scene.add(v.mesh);return v;};
      const sourceVeil=veil(source,true),targetVeil=veil(target,false);
      req.source.classList.add('is-shuffling');req.target.classList.add('is-shuffling');
      try{await timeline(reduced?100:REFORM_DURATION,req.signal,t=>{
        const state=reformState(t);root.dataset.shufflePhase=state.phase;
        coat(source,state.sourceCharge,state.sourceAlpha);coat(target,state.destinationCharge,state.destinationAlpha);
        sourceVeil.update(state.sourceCharge,state.sourceAlpha*.96,t);targetVeil.update(state.destinationCharge,state.destinationAlpha*.98,t);
        const burst=state.burst,travel=sat((t-.59)/.38);sparks.forEach((m,i)=>{const angle=i*2.399;m.position.set(Math.cos(angle)*unit*(.25+travel*.8),unit*(pileCenter(count,false)+.12+Math.sin(travel*Math.PI)*.4),Math.sin(angle)*unit*(.38+travel*.7));m.scale.set(.45*burst,(1.3+travel)*burst,.45*burst);m.rotation.z=angle;m.material.opacity=burst*.85;});
      });
      if(disposed||req.signal.aborted)return false;
      req.target.dataset.count=String(count);req.source.dataset.count='0';req.source.querySelector('.pile-print')?.remove();delete req.source.dataset.face;
      for(const e of [req.source,req.target]){const c=e.querySelector('.pile-count');if(c)c.textContent=e.dataset.count!;}
      refresh();
      }finally{[source.group,target.group,sparkGroup].forEach(dispose);sourceVeil.dispose();targetVeil.dispose();face?.dispose();req.source.classList.remove('is-shuffling');req.target.classList.remove('is-shuffling');delete root.dataset.shufflePhase;}
      return true;
    }
    // Opening furniture flights were retired; the board starts fully assembled.
    return true;
  });
  return {tick(now:number){tasks.forEach(t=>t(now));return tasks.size>0;},dispose(){disposed=true;unbind();cancels.forEach(c=>c());}};
}
