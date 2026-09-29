import '../styles/handCondition.css';
import {outlineFor} from './handConditionOutline';

const NS='http://www.w3.org/2000/svg';
let serial=0;
/** Owns only the local hand. CSS clocks keep the approved two tails moving without a per-frame DOM loop. */
export class HandConditionHighlights {
  private entries=new Map<HTMLElement,{effect:HTMLElement;frame:number}>();
  private disposed=false;
  sync(cards:HTMLElement[]):void {
    if(this.disposed)return;
    const keep=new Set(cards);
    for(const [card,entry] of this.entries)if(!keep.has(card)){
      cancelAnimationFrame(entry.frame);entry.effect.remove();card.classList.remove('has-play-condition');this.entries.delete(card);
    }
    for(const card of cards){
      if(this.entries.has(card))continue;
      const effect=document.createElement('div');effect.className='hand-condition-effect';effect.dataset.variant='golden-twin';effect.dataset.outline='loading';effect.setAttribute('aria-hidden','true');
      card.classList.add('has-play-condition');card.append(effect);
      const entry={effect,frame:0};this.entries.set(card,entry);
      entry.frame=requestAnimationFrame(()=>{
        entry.frame=0;if(!effect.isConnected||this.disposed)return;
        void outlineFor(card).then(outline=>{
          if(!effect.isConnected||this.disposed)return;
          const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${outline.width} ${outline.height}`);svg.setAttribute('preserveAspectRatio','none');
          const defs=document.createElementNS(NS,'defs'),mask=document.createElementNS(NS,'mask'),id=`hand-condition-outside-${++serial}`;
          mask.id=id;mask.setAttribute('maskUnits','userSpaceOnUse');
          for(const [key,value] of Object.entries({x:-40,y:-40,width:outline.width+80,height:outline.height+80}))mask.setAttribute(key,String(value));
          const rect=document.createElementNS(NS,'rect');
          for(const [key,value] of Object.entries({x:-40,y:-40,width:outline.width+80,height:outline.height+80,fill:'white'}))rect.setAttribute(key,String(value));
          const hole=document.createElementNS(NS,'path');hole.setAttribute('d',outline.d);hole.setAttribute('fill','black');mask.append(rect,hole);defs.append(mask);svg.append(defs);
          const outside=document.createElementNS(NS,'g');outside.setAttribute('mask',`url(#${id})`);svg.append(outside);
          const path=(name:string,parent:SVGElement=outside)=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',outline.d);p.setAttribute('pathLength','100');p.setAttribute('class',name);parent.append(p);return p;};
          path('hcond-aura');path('hcond-ground');path('hcond-base');
          for(let side=0;side<2;side++)for(let j=0;j<7;j++){
            const fade=(7-j)/7,p=path('hcond-stream');
            p.style.strokeDasharray=`${22/7+.2} ${100-22/7-.2}`;
            p.style.setProperty('--orbit-start',`${-(side*50-j*22/7)}px`);
            p.style.opacity=String(.16+fade*.84);p.style.strokeWidth=String(5+fade*9);
          }
          path('hcond-core',svg);effect.append(svg);effect.dataset.outline='ready';effect.dataset.layers=String(outline.layers.length);
        }).catch(()=>{effect.dataset.outline='error';});
      });
    }
  }
  dispose():void {this.sync([]);this.disposed=true;}
}
