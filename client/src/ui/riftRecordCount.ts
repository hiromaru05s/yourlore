import './riftRecordCount.css';
import {riftOutline} from './riftGeometry';
export const RECORD_VARIANTS=['original'] as const;
export type RecordVariant=typeof RECORD_VARIANTS[number];
export function recordVariant(_value?:string):RecordVariant{return 'original';}
/** Shared meter-space placement for the live board and its close-up. */
export const RIFT_RECORD_PLACEMENT={me:{x:.712,z:.279},opp:{x:.715,z:.308},width:.044,depth:-.012} as const;
let serial=0;
/** Only the public count is drawn. The local typeface supplies all ten glyphs. */
export function createRiftRecordCount(count:number,_previous?:number,_variant:RecordVariant='original'):HTMLSpanElement{
 const n=Number.isFinite(count)?Math.max(0,Math.trunc(count)):0,id='rift-numeral-'+(++serial),el=document.createElement('span');
 el.className='rift-record-count';el.dataset.count=String(n);el.dataset.empty=String(n===0);el.setAttribute('aria-hidden','true');
 const digits=String(n).length,size=digits===1?76:digits===2?70:Math.max(12,150/digits);
 el.innerHTML=`<svg class="record-art" viewBox="0 0 112 180" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff2df"/><stop offset=".48" stop-color="#e7d5bb"/><stop offset="1" stop-color="#bca78e"/></linearGradient></defs><text class="record-number record-engraving" x="56" y="112" text-anchor="middle" font-size="${size}" fill="url(#${id})">${n}</text></svg>`;
 return el;
}
export function createRiftRecordWindow(count:number,previous:number|undefined,side:'me'|'opp',variant:RecordVariant='original'){
 const window=document.createElement('span');window.className='rift-record-window';
 window.style.clipPath='polygon('+riftOutline().map(([x,z])=>(((x-.6625)/.125)*100).toFixed(3)+'% '+((side==='me'?(z-.111)/.268:(.379-z)/.268)*100).toFixed(3)+'%').join(',')+')';
 const placement={...RIFT_RECORD_PLACEMENT,...RIFT_RECORD_PLACEMENT[side]};
 window.style.setProperty('--record-position-x',((placement.x-.6625)/.125*100)+'%');
 window.style.setProperty('--record-position-y',((side==='me'?placement.z-.111:.379-placement.z)/.268*100)+'%');
 window.style.setProperty('--record-world-width',String(placement.width));
 window.style.transform=`translateZ(calc(var(--board-meter,650px) * ${placement.depth-.012}))`;
 window.append(createRiftRecordCount(count,previous,variant));return window;
}
