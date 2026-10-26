import type {Cosmetic} from '../shared/cosmetics';
import {quietLuxuryFromUrl} from '../shared/quietLuxuryCosmetics';
import {gachaFromUrl} from '../shared/gachaCosmetics';
/** Borrow the same animated material used on equipped cards. */
export async function createRewardSleeve(host:HTMLElement,item:Cosmetic){
 if(gachaFromUrl(item.url)){
  const [{createDomSleeves},{retainArt}]=await Promise.all([import('./cosmetics/gachaTrio/domSleeves'),import('./cosmetics/gachaTrio/materials')]);
  const lease=retainArt();try{await lease.ready;}catch(error){lease.release();throw error;}
  const view=createDomSleeves(host.parentElement!);return {draw:(t:number)=>view.tick(t),dispose(){view.dispose();lease.release();}};
 }
 if(item.id==='sleeve:gacha-goldfault'){
  const [{retainGoldfaultArt},{mountDomSleeves}]=await Promise.all([import('./cosmetics/goldfault/sleeve'),import('./cosmetics/goldfault/domSleeve')]);
  const lease=retainGoldfaultArt(),view=mountDomSleeves(lease.art,host.parentElement!);return {draw:(t:number)=>view.tick(t),dispose(){view.dispose();lease.release();}};
 }
 let lease:{art:{canvas:HTMLCanvasElement;paint?:(t:number)=>void;draw?:(t:number)=>void};release:()=>void}|undefined;
 const quiet=quietLuxuryFromUrl(item.url);
 if(quiet)lease=(await import('./cosmetics/quietLuxury/sleeve')).retainQuietLuxuryArt(quiet.variant);

 else if(item.id==='sleeve:gacha-amethyst-cleft')lease=(await import('./cosmetics/amethyst/sleeve')).retainAmethystArt();
 else if(item.id==='sleeve:gacha-elfweave')lease=(await import('./cosmetics/elfweave/sleeve')).retainElfweaveArt();
 else if(item.id==='sleeve:gacha-mimic-coffer')lease=(await import('./cosmetics/coffer/sleeve')).retainCofferArt();
 if(!lease)return {draw:(_t:number)=>{},dispose:()=>{}};
 const canvas=document.createElement('canvas');canvas.width=lease.art.canvas.width;canvas.height=lease.art.canvas.height;canvas.setAttribute('aria-hidden','true');host.append(canvas);const ctx=canvas.getContext('2d')!;
 return {draw(t:number){lease!.art.paint?.(t);lease!.art.draw?.(t);ctx.drawImage(lease!.art.canvas,0,0,canvas.width,canvas.height);},dispose(){canvas.remove();lease!.release();}};
}
