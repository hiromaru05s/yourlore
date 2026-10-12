import {Material,TILE_W,TILE_H} from './material';import type {Request} from './material';
import {studies,countAt,clamp} from './catalog';
import type {Settings} from './catalog';
export class Layer {
 readonly canvas=document.createElement('canvas');readonly badge:HTMLElement;
 private madeBand=false;private madeBadge=false;private prior='';private originalText='';private originalLabel:string|null;private originalTitle='';
 constructor(readonly card:HTMLElement){
  this.canvas.width=TILE_W;this.canvas.height=TILE_H;this.canvas.className='decay-counter-surface';this.canvas.setAttribute('aria-hidden','true');this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none';
  card.append(this.canvas);let band=card.querySelector<HTMLElement>('.card-status');
  if(!band){band=document.createElement('div');band.className='card-status';card.append(band);this.madeBand=true;}
  let badge=band.querySelector<HTMLElement>('.ec-decay-state');
  if(!badge){badge=document.createElement('span');badge.className='ec ec-decay-state';badge.dataset.status='decay';band.append(badge);this.madeBadge=true;}
  this.badge=badge;this.prior=badge.style.cssText;this.originalText=badge.textContent||'';this.originalLabel=badge.getAttribute('aria-label');this.originalTitle=badge.title;
 }
 prepare(s:Settings):Request|null{
  const study=studies[s.variant],phase=clamp(s.ms/study.duration),n=countAt(s),c=this.canvas.getContext('2d')!;
  c.clearRect(0,0,this.canvas.width,this.canvas.height);
  if(this.card.dataset.decayCount!==String(n)){this.badge.textContent=`腐敗 ${n}/3`;this.badge.style.visibility=n?'visible':'hidden';this.badge.setAttribute('aria-label',`受けている腐敗 ${n}/3`);this.badge.title=`腐敗カウンター ${n}/3`;this.card.dataset.decayCount=String(n);}
  let x=0,y=0,node:HTMLElement|null=this.badge;while(node&&node!==this.card){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}
  const anchor:[number,number]=[(x+this.badge.offsetWidth/2)/this.card.offsetWidth,(y+this.badge.offsetHeight/2)/this.card.offsetHeight];
  if(!Number.isFinite(anchor[0])||!Number.isFinite(anchor[1]))return null;
  // The only settling flash belongs to the actual counter plaque.
  const contact=s.reduced?180:study.contact,p=clamp((s.ms-contact)/230),pulse=Math.sin(p*Math.PI);
  this.badge.style.transform=s.reduced?'':`scale(${1+pulse*.12})`;
  this.badge.style.filter=pulse>0?`brightness(${1+pulse*.65})`:'';
  const active=!s.reduced&&phase>0&&phase<1;this.canvas.dataset.active=String(active);return active?{variant:s.variant,phase,anchor}:null;
 }
 clear(){this.canvas.getContext('2d')!.clearRect(0,0,this.canvas.width,this.canvas.height);this.canvas.dataset.active='false';this.badge.style.transform='';this.badge.style.filter='';}
 dispose(){this.clear();this.canvas.remove();delete this.card.dataset.decayCount;if(this.madeBand)this.badge.parentElement?.remove();else if(this.madeBadge)this.badge.remove();else{this.badge.style.cssText=this.prior;this.badge.textContent=this.originalText;this.badge.title=this.originalTitle;if(this.originalLabel===null)this.badge.removeAttribute('aria-label');else this.badge.setAttribute('aria-label',this.originalLabel);}}
}

/** Submit all surfaces before copying: avoids four GPU readback barriers per frame. */
export function paint(layers:Layer[],states:Settings[],material:Material|null){
 const jobs:Array<{layer:Layer;request:Request}>=[];
 for(const [i,layer]of layers.entries()){const request=layer.prepare(states[i]);if(request)jobs.push({layer,request});}
 if(!jobs.length||!material)return;
 const atlas=material.drawBatch(jobs.map(j=>j.request));if(!atlas)return;
 for(const [i,{layer}]of jobs.entries())layer.canvas.getContext('2d')!.drawImage(atlas,i*TILE_W,0,TILE_W,TILE_H,0,0,TILE_W,TILE_H);
}
