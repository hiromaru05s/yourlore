import {absorbIntoRift,destroyAnim,ghostDie,exileCard} from '../../../ui/anim';
/** Snapshot only A-owned material, with decoded pixels available to native clones. */
export async function freezeMaterial(node:HTMLElement){
 const swaps:{canvas:HTMLCanvasElement;image:HTMLImageElement}[]=[];
 try{for(const canvas of node.querySelectorAll<HTMLCanvasElement>('canvas.a3-material')){const image=new Image();for(const a of canvas.attributes)image.setAttribute(a.name,a.value);image.classList.add('a3-frozen');image.src=canvas.toDataURL();await image.decode();swaps.push({canvas,image});}for(const {canvas,image}of swaps)canvas.replaceWith(image);}
 catch(error){for(const{canvas,image}of swaps)if(image.parentNode)image.replaceWith(canvas);throw error;}
 return()=>{for(const{canvas,image}of swaps)if(image.parentNode)image.replaceWith(canvas);};
}
export async function nativeExit(node:HTMLElement,side:0|1,kind:'rift'|'destroy',uid?:string,voided=false){
 const restore=await freezeMaterial(node);try{if(kind==='rift')await absorbIntoRift(node,side===0?'me':'opp');else{if(!uid)throw Error('Native destroy requires uid');if(node.matches('.card'))await destroyAnim(uid,side===0?'me':'opp',voided);else await ghostDie(node,side===0?'me':'opp',voided);}}finally{restore();}
}

export {exileCard};
