import {deckMasterArt as masterArt} from './deckMasterArt';

export function prepareDeckCard(face:HTMLElement,id:string){
 const title=face.querySelector<HTMLElement>('.card-name');
 if(title){title.style.removeProperty('font-size');const units=[...title.textContent??''].reduce((n,ch)=>n+(/\s/.test(ch)?.32:ch.codePointAt(0)!>=0x2e80?1:.6),0);face.style.setProperty('--title-units',String(Math.max(1,units)));}
 const image=face.querySelector<HTMLImageElement>('.card-art img');
 if(image&&masterArt[id]){
  const loaded=()=>{const art=image.parentElement;if(art){art.style.backgroundImage='none';art.dataset.artWidth=String(image.naturalWidth);}};
  image.addEventListener('load',loaded,{once:true});if(image.complete&&image.naturalWidth)loaded();
 }
 const frame=face.querySelector<HTMLElement>('.card-frame');
 const frameUrl=frame?.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
 const layers:[HTMLElement,string][]=[];
 if(frame&&frameUrl)layers.push([frame,frameUrl]);
 for(const [selector,file] of [['.card-cost .seal-face','cost'],['.ad-atk .seal-face','attack'],['.ad-def .seal-face','health']]){
  const layer=face.querySelector<HTMLElement>(selector);if(layer)layers.push([layer,`/art/biblion/modular/${file}.png`]);
 }
 // Apply the same source-resolution alpha key ahead of time. No PNG download,
 // readback, pixel loop, PNG encoding or temporary blob is needed on entry.
 for(const [layer,src] of layers){
  const file=src.split('/').pop()!.split('?')[0].replace(/\.png$/,'.webp');
  layer.style.backgroundImage=`url("/art/deck-mattes-v1/${file}")`;layer.classList.add('native-matte');
 }
}
