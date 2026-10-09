import './riftRecordCount.css';
import {riftOutline} from './riftGeometry';
export const RECORD_VARIANTS=['original'] as const;
export type RecordVariant=typeof RECORD_VARIANTS[number];
export function recordVariant(_value?:string):RecordVariant{return 'original';}
export const recordLayerCount=(n:number)=>n<=1?1:n===2?3:n<=5?5:7;
/** Shared physical placement for GameView and the close-up. The complete stack
 * has clearance inside the aperture, below the ivory rim rather than on its edge. */
export const RIFT_RECORD_PLACEMENT={me:{x:.712,z:.279},opp:{x:.715,z:.308},width:.044,depth:-.012} as const;
let serial=0;
/** Original artwork reconstruction: narrow, softly bevelled sheets with individually
 * authored poses. Layers convey density; the numeral is the exact public count. */
export function createRiftRecordCount(count:number,previous?:number,_variant:RecordVariant='original'):HTMLSpanElement{
 const n=Number.isFinite(count)?Math.max(0,Math.trunc(count)):0,id='rr'+(++serial),el=document.createElement('span');
 el.className='rift-record-count';el.dataset.variant='original';el.dataset.count=String(n);el.dataset.empty=String(n===0);
 el.dataset.change=previous==null||previous===n?'none':n>previous?'gain':'loss';el.setAttribute('aria-hidden','true');
 const layers=recordLayerCount(n),poses=layers===7?[[24,61,9],[22,50,8],[23,38,1],[23,27,-1],[27,17,-2],[31,6,1],[34,12,-4]]:[[24,61,9],[22,39,2],[27,17,-1],[32,22,1],[34,12,-4],[48,6,-4],[52,2,-2]];
 const path='M4 .8 H53.8 Q55.4 .8 56.6 2 L58.2 3.8 Q59 4.6 59 6 V103 Q59 106.8 55.3 106.8 H4 Q.8 106.8 .8 103.4 V4 Q.8 .8 4 .8 Z';
 const digits=String(n).length,fs=digits===1?49:digits===2?47:Math.max(12,105/digits);
 let cards='';
 for(let i=layers-1;i>=0;i--){const [x,y,r]=poses[i];cards+=`<g class="record-card ${i===0?'record-front':''}" transform="translate(${x} ${y}) rotate(${r})">
 <path d="${path}" fill="#07050d" stroke="#060409" stroke-width="2.2" transform="translate(.35 1.3)"/>
 <path d="${path}" fill="url(#${id}-face)" stroke="url(#${id}-rim)" stroke-width="1.25"/>
 <path d="M5 3.6 H52.7 Q54.1 3.6 55.3 5.4 L56 7 V102.5 Q56 104 54.5 104 H5 Q3.6 104 3.6 102.4 V5.3 Q3.6 3.6 5 3.6Z" fill="none" stroke="#c6b5c2" stroke-width=".46" opacity=".57"/>
 <path d="M4.5 2 H52.5 Q54.2 2 55.4 3.5" fill="none" stroke="#eee0dc" stroke-width=".6" opacity=".65"/>
 <path d="M5 5 H54 V102 H5Z" fill="#b0a1b7" filter="url(#${id}-grain)" opacity=".052"/>
 ${i>1?'<path d="M5 41 Q27 27 54 20 V34 Q31 30 5 45Z" fill="#bca4d7" opacity=".055"/>':''}
 <path class="record-reflection" d="M4 3 H55 V104 H4Z" fill="url(#${id}-sheen)"/>
 ${i===0?`<text class="record-number record-engraving" x="30" y="69" text-anchor="middle" font-size="${fs}" fill="url(#${id}-ink)">${n}</text><path class="record-star" transform="translate(5.4 15.66) scale(.82)" d="M30 80 Q30.8 85.8 35.3 86.8 Q30.8 88.2 29 94 Q28.8 88.8 24 87.6 Q28.8 86.3 30 80Z" fill="#c6b3ad"/>`:''}
 </g>`;}
 el.innerHTML=`<svg class="record-art" viewBox="0 0 112 180" overflow="visible" aria-hidden="true"><defs>
 <linearGradient id="${id}-ink" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#c6b7aa"/><stop offset=".45" stop-color="#ede2d4"/><stop offset="1" stop-color="#d4c7b9"/></linearGradient>
 <linearGradient id="${id}-face" x1="0" y1="1" x2=".87" y2="0"><stop stop-color="#0d0b10"/><stop offset=".47" stop-color="#15111b"/><stop offset="1" stop-color="#211927"/></linearGradient>
 <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2=".9"><stop stop-color="#c6afb3"/><stop offset=".32" stop-color="#d1babe"/><stop offset=".59" stop-color="#93728f"/><stop offset=".83" stop-color="#d0b5ca"/><stop offset="1" stop-color="#6b566b"/></linearGradient>
 <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#b9a8d0" stop-opacity="0"/><stop offset=".5" stop-color="#dbc4e1" stop-opacity=".12"/><stop offset="1" stop-color="#b9a8d0" stop-opacity="0"/></linearGradient>
 <filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".73" numOctaves="2" seed="17" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
 </defs>${cards}</svg>`;
 return el;
}
/** Clip the cards to the real through-cut: ivory edges stay in front, not under a badge. */
export function createRiftRecordWindow(count:number,previous:number|undefined,side:'me'|'opp',variant:RecordVariant='original'){
 const window=document.createElement('span');window.className='rift-record-window';window.dataset.side=side;
 window.style.clipPath='polygon('+riftOutline().map(([x,z])=>(((x-.6625)/.125)*100).toFixed(3)+'% '+((side==='me'?(z-.111)/.268:(.379-z)/.268)*100).toFixed(3)+'%').join(',')+')';
 const placement={...RIFT_RECORD_PLACEMENT,...RIFT_RECORD_PLACEMENT[side]};
 window.style.setProperty('--record-position-x',((placement.x-.6625)/.125*100)+'%');
 window.style.setProperty('--record-position-y',((side==='me'?placement.z-.111:.379-placement.z)/.268*100)+'%');
 window.style.setProperty('--record-world-width',String(placement.width));
 window.style.transform=`translateZ(calc(var(--board-meter,650px) * ${placement.depth-.012}))`;
 window.append(createRiftRecordCount(count,previous,variant));return window;
}
