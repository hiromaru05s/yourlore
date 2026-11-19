import {combatRect} from './combatAnchor';
import './healingFeedback.css';
const stops=new Set<()=>void>();
let serial=0;
export function clearHealingFeedback(){for(const stop of [...stops])stop();}

function healingField(id:string){
 const silhouette='M-54 19 C-74 12-70-10-52-14 C-57-35-33-44-18-30 C-10-52 22-50 29-27 C48-38 67-21 59-5 C79 1 73 26 55 29 C43 44 23 40 12 33 C-4 45-24 42-34 32 C-46 38-60 31-54 19Z';
 const shade='M-57 12 C-45 27-28 15-20 27 C-10 36 5 23 14 29 C31 39 44 22 60 20 C54 37 33 42 14 34 C-6 45-26 41-34 32 C-47 38-61 29-57 12Z';
 const light='M-50-9 C-50-30-31-35-19-23 C-11-44 16-43 24-24 C9-32-6-23-8-13 C-20-24-36-22-39-8Z';
 const banks:[number,number,number][]=[[100,123,1.08],[64,84,.54],[143,83,.5]];
 return `<svg class="ch-field" viewBox="0 0 200 190" aria-hidden="true"><defs>
 <radialGradient id="${id}-cloud" cx=".37" cy=".22" r=".85"><stop stop-color="#ffffff"/><stop offset=".32" stop-color="#f0f3f6"/><stop offset=".66" stop-color="#dce2e8"/><stop offset="1" stop-color="#a0adba" stop-opacity=".45"/></radialGradient>
 <radialGradient id="${id}-bed"><stop stop-color="#ffffff" stop-opacity=".7"/><stop offset=".6" stop-color="#c2cbd5" stop-opacity=".25"/><stop offset="1" stop-color="#c2cbd5" stop-opacity="0"/></radialGradient>
 <filter id="${id}-soft" x="-25%" y="-35%" width="150%" height="170%"><feGaussianBlur stdDeviation="1.5"/></filter>
 ${banks.map((_,i)=>`<mask id="${id}-dissolve-${i}" maskUnits="userSpaceOnUse" x="-90" y="-70" width="180" height="130"><rect x="-90" y="-70" width="180" height="130" fill="white"/><circle class="ch-hole" data-hole="${i}" cx="24" cy="-36" r="50" fill="black"/><circle class="ch-hole ch-hole-late" data-hole="${i}" cx="-48" cy="10" r="58" fill="black"/></mask>`).join('')}
 </defs><ellipse class="ch-cloud-bed" cx="100" cy="142" rx="86" ry="43" fill="url(#${id}-bed)"/>
 ${banks.map(([x,y,scale],i)=>`<g transform="translate(${x} ${y}) scale(${scale})"><g class="ch-cloud-bank" data-bank="${i}"><g mask="url(#${id}-dissolve-${i})" filter="url(#${id}-soft)"><path class="ch-cloud-body" d="${silhouette}" fill="url(#${id}-cloud)"/><path d="${shade}" fill="#738393" opacity=".23"/><path d="${light}" fill="#ffffff" opacity=".57"/></g></g></g>`).join('')}</svg>`;
}

/** Adopted 03: compact white clouds and a green numeral share the recovery contact clock. */
export function healingNumber(anchor:HTMLElement|null,amount:number,follow?:()=>DOMRect|null){
 if(!anchor||!combatRect(anchor)||!Number.isFinite(amount)||amount<=0||document.hidden)return;
 const rate=1;
 const node=document.createElement('div');node.className='combat-heal';node.dataset.healUid=anchor.dataset.uid??'';node.dataset.amount=String(amount);if(amount>=10)node.classList.add('heavy');node.setAttribute('aria-hidden','true');
 node.innerHTML=healingField(`heal-cloud-${++serial}`)+'<div class="ch-local"><span class="ch-digit"><span class="ch-value"></span></span><span class="ch-infill"><span class="ch-value"></span></span></div>';
 node.querySelectorAll('.ch-value').forEach(e=>e.textContent=String(amount));document.body.append(node);
 let frame=0,timer=0,ended=false;const animations:Animation[]=[];
 const stop=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);clearTimeout(timer);animations.forEach(a=>a.cancel());node.remove();stops.delete(stop);};stops.add(stop);
 const track=()=>{const r=follow?follow():combatRect(anchor);if(!anchor.isConnected||!r||r.width<=0||r.height<=0||![r.x,r.y,r.width,r.height].every(Number.isFinite)){stop();return;}
 const size=Math.max(22,Math.min(86,r.width*.68/(String(amount).length>2?1.32:1)));
 node.style.left=`${r.x+r.width/2}px`;node.style.top=`${r.y+r.height*.54}px`;node.style.setProperty('--size',`${size}px`);node.style.setProperty('--anchor-w',`${r.width}px`);node.style.setProperty('--anchor-h',`${r.height}px`);frame=requestAnimationFrame(track);};track();if(ended)return stop;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const local=node.querySelector<HTMLElement>('.ch-local')!,digit=node.querySelector<HTMLElement>('.ch-digit')!,fill=node.querySelector<HTMLElement>('.ch-infill')!,field=node.querySelector<SVGElement>('.ch-field')!;
 const duration=1500/rate;
 const animate=(el:Element,frames:Keyframe[],ms:number,delay=0)=>animations.push(el.animate(frames,{duration:ms/rate,delay:delay/rate,fill:'both',easing:'linear'}));
 // Preserve the approved numeral weight, centering and motion.
 animate(local,reduced?[{opacity:1},{opacity:1,offset:.83},{opacity:0}]:[
  {transform:'translateY(.06em) scale(.96)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1,offset:.12},
  {transform:'translateY(-.025em) scale(1.035)',offset:.38},{transform:'translateY(-.045em) scale(1)',opacity:1,offset:.76},{transform:'translateY(-.12em) scale(.98)',opacity:0}
 ],1500);
 if(reduced){field.style.display='none';fill.style.display='none';node.classList.add('reduced');}
 else{
  animate(fill,[{backgroundPosition:'50% 100%',clipPath:'inset(100% 0 0 0)'},{backgroundPosition:'50% 15%',clipPath:'inset(0 0 0 0)',offset:.32},{backgroundPosition:'50% 75%',clipPath:'inset(0 0 0 0)',offset:.48},{backgroundPosition:'50% 0%',clipPath:'inset(0 0 0 0)',offset:.72},{backgroundPosition:'50% 0%',clipPath:'inset(0 0 0 0)',offset:.83},{backgroundPosition:'50% 0%',clipPath:'inset(0 0 100% 0)'}],1500);
  animate(digit,[{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 0 0)',offset:.83},{clipPath:'inset(0 0 100% 0)'}],1500);
  animate(field.querySelector('.ch-cloud-bed')!,[{opacity:0,transform:'scale(.4,.45)'},{opacity:.65,transform:'scale(.9,.85)',offset:.24},{opacity:.34,transform:'translateY(-9px) scale(1.03,.94)',offset:.55},{opacity:0,transform:'translateY(-20px) scale(1.1,.7)'}],1300);
  field.querySelectorAll<SVGElement>('.ch-cloud-bank').forEach((bank,i)=>{
   const outward=i===1?-1:i===2?1:0;
   const start=`translate(${-outward*22}px,20px) scale(.35,.45)`;
   const expand=`translate(${outward*4}px,0) scale(1.04,1)`;
   const end=`translate(${outward*16}px,-39px) scale(1.13,1.08)`;
   animate(bank,[{transform:start,opacity:0},{transform:expand,opacity:i===0?.82:.74,offset:.29},{transform:`translate(${outward*10}px,-17px) scale(1.12,1.04)`,opacity:.66,offset:.59},{transform:end,opacity:0}],1280,i*65);
  });
  field.querySelectorAll<SVGCircleElement>('.ch-hole').forEach(hole=>{
   const i=Number(hole.dataset.hole),late=hole.classList.contains('ch-hole-late');
   hole.style.transformOrigin=late?'-48px 10px':'24px -36px';
   animate(hole,[{transform:'scale(0)'},{transform:'scale(0)',offset:.52},{transform:'scale(.5)',offset:.74},{transform:'scale(1.5)'}],1280,i*65+(late?75:0));
  });
 }
 timer=window.setTimeout(stop,duration+40);return stop;
}
if(typeof window!=='undefined'){
addEventListener('pagehide',clearHealingFeedback);addEventListener('resize',clearHealingFeedback);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHealingFeedback();});

}
