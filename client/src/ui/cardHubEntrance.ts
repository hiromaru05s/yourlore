const entrances=new WeakMap<HTMLElement,()=>void>();

/** Turn the existing artwork, lettering and chamfered edge as one solid face. */
export function playCardHubEntrance(root:HTMLElement, rate=1):()=>void {
  entrances.get(root)?.();
  const stop=()=>entrances.get(root)?.();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches)return stop;
  const tiles=[...root.querySelectorAll<HTMLElement>('.card-hub-tile')];
  let cancelled=false;
  let frame=0;
  let deadline=0;
  const animations:Animation[]=[];
  tiles.forEach(tile=>tile.style.opacity='0');
  const cancel=()=>{
    cancelled=true;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    document.removeEventListener('lore:screen-ready',ready);
    reduced.removeEventListener('change',cancel);
    animations.forEach(animation=>animation.cancel());
    tiles.forEach(tile=>tile.style.removeProperty('opacity'));
    if(entrances.get(root)===cancel)entrances.delete(root);
  };
  const ready=()=>{
    if(cancelled)return;
    // The router's first-visit cover must finish before the visible turn begins.
    if(root.closest('[inert]')){
      document.addEventListener('lore:screen-ready',ready,{once:true});
      return;
    }
    tiles.forEach((tile,index)=>{
      const animation=tile.animate([
        {transform:'perspective(1600px) translate3d(-16px,10px,-32px) rotateY(28deg) rotateZ(-.65deg)',opacity:0,offset:0},
        {opacity:1,offset:.18},
        {transform:'perspective(1600px) translate3d(0,0,0) rotateY(0deg) rotateZ(0deg)',opacity:1,offset:1},
      ],{duration:620,delay:index*75,easing:'cubic-bezier(.2,.72,.24,1)',fill:'both'});
      animation.playbackRate=rate;
      animations.push(animation);
      void animation.finished.then(()=>{
        tile.style.removeProperty('opacity');
        animation.cancel();
        if(index===tiles.length-1)cancel();
      }).catch(()=>{});
    });
  };
  // Cached art starts immediately; cold art gets a bounded decode opportunity.
  const images=[...root.querySelectorAll('img')];
  const decoded=Promise.all(images.map(image=>image.decode().catch(()=>{})));
  const timeout=new Promise<void>(resolve=>{deadline=window.setTimeout(resolve,350);});
  void Promise.race([decoded,timeout]).then(()=>{
    clearTimeout(deadline);
    if(!cancelled)frame=requestAnimationFrame(ready);
  });
  reduced.addEventListener('change',cancel);
  entrances.set(root,cancel);
  return stop;
}
