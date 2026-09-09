/** Screen-space aim ribbon. The attacker stays on the board while targeting. */
export function createAttackAim() {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.classList.add('attack-aim');
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<defs><linearGradient id="attack-ribbon" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#487baf"/><stop offset="1" stop-color="#f6d990"/></linearGradient></defs><path class="aim-halo"/><path class="aim-ribbon"/><path class="aim-flow"/><path class="aim-head"/><circle class="aim-source" r="9"/><circle class="aim-lock" r="19"/>';
  document.body.append(svg);
  const paths=svg.querySelectorAll('path'),rings=svg.querySelectorAll('circle');
  return {
    update(x:number,y:number,tx:number,ty:number,valid:boolean,blocked:boolean) {
      svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
      svg.dataset.valid=String(valid);svg.classList.toggle('is-locked',valid);svg.classList.toggle('is-blocked',blocked);
      const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1;
      const bend=Math.min(45,len*.11),cx=(x+tx)/2-dy/len*bend,cy=(y+ty)/2+dx/len*bend;
      const ex=tx-cx,ey=ty-cy,el=Math.hypot(ex,ey)||1,ux=ex/el,uy=ey/el;
      const bx=tx-ux*18,by=ty-uy*18;
      const d=`M${x},${y} Q${cx},${cy} ${bx},${by}`;
      for(let i=0;i<3;i++)paths[i].setAttribute('d',d);
      paths[3].setAttribute('d',`M${tx},${ty} L${bx-uy*10},${by+ux*10} L${bx-ux*4},${by-uy*4} L${bx+uy*10},${by-ux*10} Z`);
      rings[0].setAttribute('cx',String(x));rings[0].setAttribute('cy',String(y));
      rings[1].setAttribute('cx',String(tx));rings[1].setAttribute('cy',String(ty));
    },
    remove(){svg.remove();},
  };
}
