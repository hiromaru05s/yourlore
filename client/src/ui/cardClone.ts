/** cloneNode does not copy canvas pixels. Keep the live finish when a public
 * card becomes a flying face or a native summon layer. */
export function cloneCardNode(source:HTMLElement):HTMLElement {
 const copy=source.cloneNode(true) as HTMLElement;
 const originals=source.querySelectorAll<HTMLCanvasElement>('canvas');
 copy.querySelectorAll<HTMLCanvasElement>('canvas').forEach((canvas,index)=>{
  const original=originals[index];
  if(original?.width&&original.height)canvas.getContext('2d')!.drawImage(original,0,0);
 });
 return copy;
}
