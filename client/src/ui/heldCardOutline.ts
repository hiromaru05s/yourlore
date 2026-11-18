import {outlineFor,type Outline} from './handConditionOutline';
const NS='http://www.w3.org/2000/svg';
let serial=0;
/** Use the actual printed frame + seal silhouette, including transparent cutouts. */
export function prepareHeldOutline(card:HTMLElement):Promise<Outline|null>{return outlineFor(card).catch(()=>null);}
export function showHeldOutline(card:HTMLElement,outline:Promise<Outline|null>):()=>void {
 let disposed=false;const layer=document.createElement('div');layer.className='held-card-outline';layer.setAttribute('aria-hidden','true');card.append(layer);
 void outline.then(shape=>{
  if(disposed||!shape||!layer.isConnected)return;
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${shape.width} ${shape.height}`);svg.setAttribute('preserveAspectRatio','none');
  const defs=document.createElementNS(NS,'defs'),mask=document.createElementNS(NS,'mask');const id=`held-card-outside-${++serial}`;mask.id=id;mask.setAttribute('maskUnits','userSpaceOnUse');
  const rect=document.createElementNS(NS,'rect');
  for(const [key,value] of Object.entries({x:-40,y:-40,width:shape.width+80,height:shape.height+80})){mask.setAttribute(key,String(value));rect.setAttribute(key,String(value));}rect.setAttribute('fill','white');
  const hole=document.createElementNS(NS,'path');hole.setAttribute('d',shape.d);hole.setAttribute('fill','black');mask.append(rect,hole);defs.append(mask);svg.append(defs);
  const outside=document.createElementNS(NS,'g');outside.setAttribute('mask',`url(#${id})`);svg.append(outside);
  for(const name of ['held-aura','held-rim','held-travel','held-core']){
   const path=document.createElementNS(NS,'path');path.setAttribute('d',shape.d);path.setAttribute('pathLength','100');path.setAttribute('class',name);path.setAttribute('vector-effect','non-scaling-stroke');(name==='held-core'?svg:outside).append(path);
  }
  layer.append(svg);
 });
 return()=>{disposed=true;layer.remove();};
}
