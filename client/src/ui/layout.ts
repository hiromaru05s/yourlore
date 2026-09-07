/** Single sizing pass: four field rows, one central market and two portraits.
 * Card sizes are bounded by both axes; no measure/reflow feedback loop. */
export function solveBoard(w: number, h: number, _underPile = false) {
  const phone = w < 700 && h > w;
  const short = h <= 550;
  const gap = w < 700 ? 3 : 8;
  const portrait = Math.max(42, Math.min(108, h * .118, w * .16));
  const mktH = Math.max(34, Math.min(120, (w * .94 - 11 * gap - (phone ? 87 : 180)) / (phone ? 6 : 12) / .64, h * (phone ? .09 : short ? .115 : .14)));
  const verticalTile = (h * (phone ? .94 : short ? .91 : .955) - portrait * 2 - mktH * (phone ? 2 : 1) - (phone ? 146 : short ? 76 : 132)) / 3.5;
  const tile = Math.max(20, Math.min(100, (w * .94 - (phone ? 10 : 12) * gap) / (phone ? 9.2 : 10.5), verticalTile));
  const handH = Math.min(270, h * .32, w * .44);
  return { cardH: tile / .64, mktH, handH, tile, gap, portrait, railW: 0, logW: 0,
    compact: w < 1000, tiny: w < 560 || h < 480, flatMkt: !phone, stackMkt: phone,
    underPile: false, phone, capH: tile / .64, capMkt: mktH };
}
export function startBoardLayout(): () => void {
  const root = document.documentElement;
  let frame = 0;
  const apply = () => {
    const v = window.visualViewport;
    const m = solveBoard(v?.width || innerWidth, v?.height || innerHeight);
    const vars: Record<string, number> = {
      'card-h': m.cardH, 'card-w': m.cardH * .64,
      'card-h-mkt': m.mktH, 'card-w-mkt': m.mktH * .64,
      'card-h-hand': m.handH, 'card-w-hand': m.handH * .64,
      'field-card-size': m.tile, 'slot-gap': m.gap, pt: m.portrait,
      'rail-w': 0, 'log-w': 0, 'loggutter-w': 0,
    };
    for (const [k, n] of Object.entries(vars)) root.style.setProperty(`--${k}`, `${n}px`);
    for (const [name, on] of Object.entries({compact:m.compact,tiny:m.tiny,flatmkt:m.flatMkt,stackmkt:m.stackMkt,underpile:false,phone:m.phone})) root.classList.toggle(`board-${name}`, on);
    window.dispatchEvent(new CustomEvent('lore:layout', {detail:m}));
  };
  const resize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
  apply(); window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
  return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
}
