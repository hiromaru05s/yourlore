import {mountSingleIdle} from './singleIdle';
import type {SingleDifficulty} from '../shared/botNpcs';

/** GIFs stop offscreen; the source painting remains the reduced-motion poster. */
export function mountStoryArt(root:HTMLElement):()=>void {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const images=Array.from(root.querySelectorAll<HTMLImageElement>('[data-chapter-art]'));
 const visible=new Set<HTMLImageElement>();
 const sync=()=>images.forEach(img=>{
  const active=visible.has(img)&&!document.hidden&&!reduced.matches&&!document.querySelector('dialog[open]');
  const src=`/art/single-story/chapters-v2/chapter-${img.dataset.chapterArt}.${active?'gif':'webp'}`;
  if(img.getAttribute('src')!==src)img.src=src;
 });
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const img=entry.target as HTMLImageElement;if(entry.isIntersecting)visible.add(img);else visible.delete(img);}
  sync();
 },{root:root.querySelector('.ss-gallery-track'),threshold:.01});
 images.forEach(img=>observer.observe(img));
 const dialogs=new MutationObserver(sync);dialogs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 const keys:Record<string,SingleDifficulty>={lumi:'easy',noel:'normal',vera:'hard'};
 const stops=Array.from(root.querySelectorAll<HTMLElement>('[data-idle]')).map(host=>mountSingleIdle(host,keys[host.dataset.idle!]));
 return()=>{observer.disconnect();dialogs.disconnect();reduced.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);stops.forEach(stop=>stop());};
}
