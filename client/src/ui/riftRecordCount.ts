import './riftRecordCount.css';
import {riftOutline} from './riftGeometry';
export const RECORD_VARIANTS=['original'] as const;
export type RecordVariant=typeof RECORD_VARIANTS[number];
export function recordVariant(_value?:string):RecordVariant{return 'original';}
export const recordLayerCount=(n:number)=>n<=1?1:n===2?3:n<=5?5:7;
// Thin engraved numerals follow the reference's nearly monoline, calligraphic drawing.
// Paths keep the same weight on every platform instead of falling back to a bold system serif.
const numeralPaths=[
 'M12 1 C24 0 23 32 14 39 C1 46 -1 10 9 2 Q10 1 12 1Z',
 'M5 8 Q11 5 14 1 L11 39 M5 40 L18 40',
 'M2 9 C4 -3 23 -2 22 10 C21 18 6 28 1 39 Q12 38 22 39 L24 35',
 'M3 7 C8 -3 19 -2 20 8 C20 14 15 18 10 20 C20 18 23 28 16 35 C11 42 4 43 0 36',
 'M20 1 L2 27 L24 27 M19 1 L15 40 M10 40 L21 40',
 'M23 2 L7 2 L4 19 C15 12 24 21 20 31 C16 42 5 44 1 35',
 'M22 3 C8 -6 -2 20 2 33 C6 48 22 40 23 28 C24 13 4 15 3 27',
 'M1 6 L3 1 L24 1 Q14 18 8 40',
 'M13 19 C-4 12 5 -3 17 2 C29 7 20 17 13 19 C-7 28 2 45 15 39 C29 32 24 24 13 19Z',
 'M2 37 C16 46 27 20 23 7 C19 -8 3 0 2 12 C1 27 21 25 22 13'
];
const engravedPaths:Record<string,string>={
 '0':'M14 0 C30 0 21 40 9 40 C-7 40 2 0 14 0Z M14 1.5 C6 2 0 38 9 38.5 C17 39 23 2 14 1.5Z',
 '1':'M5 6 Q12 4 16 0 L11 38 Q12 39 18 39 L18 40 H3 L3 39 Q8 39 8 37 L13 5 Q10 6 5 7Z',
 '2':'M2 8 C6 -3 24 -3 24 8 C24 17 9 28 4 36 L18 36 Q21 36 24 32 L21 40 H0 V38 C8 29 21 14 20 7 C19 -1 8 0 4 10Z',
 '3':'M9.17 7.08 C12.08 -.83 22.08 -.83 22.92 6.67 C24.17 11.67 20.42 15.83 15.42 18.33 C22.08 18.33 24.17 25 20.42 31.25 C16.25 39.17 5.83 41.25 0 35 L1.25 32.92 C7.5 38.75 14.17 36.25 17.08 30.83 C21.25 23.33 17.5 19.17 11.67 20.42 L12.08 18.75 C17.92 16.25 21.67 10.42 19.17 5.42 C17.08 .42 11.25 5 10 7.92Z'
};
function drawNumerals(n:number,id:string){
 const chars=String(n).split(''),scale=chars.length<3?.74:Math.max(.24,1.68/chars.length),sx=scale*.86,sy=scale*1.06,width=(chars.length*27-3)*sx;
 return `<g class="record-engraving" transform="translate(${30-width/2} ${68-40*sy}) scale(${sx} ${sy})" fill="none" stroke="url(#${id}-ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${chars.map((c,i)=>engravedPaths[c]?`<path fill="url(#${id}-ink)" fill-rule="evenodd" stroke="none" d="${engravedPaths[c]}" transform="translate(${i*27} 0)"/>`:`<path d="${numeralPaths[Number(c)]}" transform="translate(${i*27} 0)"/>`).join('')}</g>`;
}
let serial=0;
/** Original artwork reconstruction: narrow, softly bevelled sheets with individually
 * authored poses. Layers convey density; the numeral is the exact public count. */
export function createRiftRecordCount(count:number,previous?:number,_variant:RecordVariant='original'):HTMLSpanElement{
 const n=Number.isFinite(count)?Math.max(0,Math.trunc(count)):0,id='rr'+(++serial),el=document.createElement('span');
 el.className='rift-record-count';el.dataset.variant='original';el.dataset.count=String(n);el.dataset.empty=String(n===0);
 el.dataset.change=previous==null||previous===n?'none':n>previous?'gain':'loss';el.setAttribute('aria-hidden','true');
 const layers=recordLayerCount(n),poses=layers===7?[[24,61,9],[22,50,8],[23,38,1],[23,27,-1],[27,17,-2],[31,6,1],[43,12,-6]]:[[24,61,9],[22,39,2],[27,17,-1],[38,22,1],[43,12,-6],[48,6,-4],[52,2,-2]];
 const path='M4 .8 H53.8 Q55.4 .8 56.6 2 L58.2 3.8 Q59 4.6 59 6 V103 Q59 106.8 55.3 106.8 H4 Q.8 106.8 .8 103.4 V4 Q.8 .8 4 .8 Z';
 const digits=String(n).length,fs=digits<=2?43:Math.max(12,96/digits);
 let cards='';
 for(let i=layers-1;i>=0;i--){const [x,y,r]=poses[i];cards+=`<g class="record-card ${i===0?'record-front':''}" transform="translate(${x} ${y}) rotate(${r})">
 <path d="${path}" fill="#07050d" stroke="#060409" stroke-width="2.2" transform="translate(.35 1.3)"/>
 <path d="${path}" fill="url(#${id}-face)" stroke="url(#${id}-rim)" stroke-width="1.25"/>
 <path d="M5 3.6 H52.7 Q54.1 3.6 55.3 5.4 L56 7 V102.5 Q56 104 54.5 104 H5 Q3.6 104 3.6 102.4 V5.3 Q3.6 3.6 5 3.6Z" fill="none" stroke="#c6b5c2" stroke-width=".46" opacity=".57"/>
 <path d="M4.5 2 H52.5 Q54.2 2 55.4 3.5" fill="none" stroke="#eee0dc" stroke-width=".6" opacity=".65"/>
 <path d="M5 5 H54 V102 H5Z" fill="#b0a1b7" filter="url(#${id}-grain)" opacity=".052"/>
 ${i>1?'<path d="M5 41 Q27 27 54 20 V34 Q31 30 5 45Z" fill="#bca4d7" opacity=".055"/>':''}
 <path class="record-reflection" d="M4 3 H55 V104 H4Z" fill="url(#${id}-sheen)"/>
 ${i===0?`<text class="record-number" x="30" y="68" text-anchor="middle" font-family="'Times New Roman',Times,serif" font-size="${fs}" font-weight="400" font-style="normal" opacity="0" transform="rotate(-3 30 58)">${n}</text>${drawNumerals(n,id)}<path class="record-star" transform="translate(5.4 15.66) scale(.82)" d="M30 80 Q30.8 85.8 35.3 86.8 Q30.8 88.2 29 94 Q28.8 88.8 24 87.6 Q28.8 86.3 30 80Z" fill="#c6b3ad"/>`:''}
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
 const window=document.createElement('span');window.className='rift-record-window';
 window.style.clipPath='polygon('+riftOutline().map(([x,z])=>(((x-.6625)/.125)*100).toFixed(3)+'% '+((side==='me'?(z-.111)/.268:(.379-z)/.268)*100).toFixed(3)+'%').join(',')+')';
 window.append(createRiftRecordCount(count,previous,variant));return window;
}
