import {readingScale} from './readingBoardLayout';
import { CARD_RATIO } from './boardProjection';
/** Single sizing pass: four field rows, one central market and two portraits.
 * Card sizes are bounded by both axes; no measure/reflow feedback loop. */
export function solveBoard(w: number, h: number, _underPile = false) {
  const phone = w < 700 && h > w;
  const scale=readingScale(w,h),tile=.110*scale,gap=.008*scale;
  const portrait=.184*scale,portraitReserve=0;
  const handH=Math.min(270,tile/.64/.42);
  const mktH=tile/CARD_RATIO;
  return {cardH:mktH,mktH,handH,tile,gap,portrait,railW:0,logW:0,portraitReserve,
    compact:w<1000,tiny:w<560||h<480,flatMkt:true,stackMkt:false,underPile:false,phone,capH:mktH,capMkt:mktH};
}
export function startBoardLayout(): () => void {
  const root = document.documentElement;
  let frame = 0;
  const apply = () => {
    const v = window.visualViewport;
    const m = solveBoard(v?.width || innerWidth, v?.height || innerHeight);
    const vars: Record<string, number> = {
      'card-h': m.cardH, 'card-w': m.cardH * CARD_RATIO,
      'card-h-mkt': m.mktH, 'card-w-mkt': m.mktH * CARD_RATIO,
      'card-h-hand': m.handH, 'card-w-hand': m.handH * .64,
      'field-card-size': m.tile, 'slot-gap': m.gap, pt: m.portrait,
      'pt-reserve':m.portraitReserve, 'rail-w': 0, 'log-w': 0, 'loggutter-w': 0,
    };
    for (const [k, n] of Object.entries(vars)) root.style.setProperty(`--${k}`, `${n}px`);
    for (const [name, on] of Object.entries({compact:m.compact,tiny:m.tiny,flatmkt:m.flatMkt,stackmkt:m.stackMkt,underpile:false,phone:m.phone})) root.classList.toggle(`board-${name}`, on);
    window.dispatchEvent(new CustomEvent('lore:layout', {detail:m}));
  };
  const resize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
  apply(); window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
  return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
}
