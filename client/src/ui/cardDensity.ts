/** Fit complete rows plus a glimpse of the next, using the actual scroll viewport.
 * Only width changes: the flex viewport stays fixed, avoiding observer feedback. */
export function fitCardRows(grid:HTMLElement, rows:number, gap:number):()=>void {
  const update=()=>{
    const height=grid.clientHeight;if(!height)return;
    const style=getComputedStyle(grid),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
    const width=Math.max(48,Math.min(132,Math.floor((height-padding-gap*Math.floor(rows))/rows*.64)));
    grid.style.setProperty('--collection-card-width',`${width}px`);
  };
  const observer=new ResizeObserver(update);observer.observe(grid);update();
  return ()=>observer.disconnect();
}
