/** DOM clones do not copy canvas pixels. Keep the authored face through both
 * the default destruction actor and its subsequent fragment clones. */
export async function freezeMaterial(node:HTMLElement,current:()=>boolean):Promise<(()=>void)|null>{
 const pairs=await Promise.all([...node.querySelectorAll<HTMLCanvasElement>('canvas.r3-surface')].map(async canvas=>{
  const image=new Image();
  image.className=canvas.className+' r3-frozen-material';
  image.style.cssText=canvas.style.cssText;
  image.width=canvas.width;image.height=canvas.height;image.alt='';
  image.src=canvas.toDataURL('image/png');
  await image.decode();
  return {canvas,image};
 }));
 if(!current()||!node.isConnected)return null;
 for(const {canvas,image} of pairs)canvas.replaceWith(image);
 let restored=false;
 return ()=>{
  if(restored)return;restored=true;
  for(const {canvas,image} of pairs)if(image.parentNode)image.replaceWith(canvas);
 };
}
