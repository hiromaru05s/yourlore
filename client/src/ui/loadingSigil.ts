/** Inline engraving: available on the very first paint, even on a cold connection. */
export function loadingSigil():string {
  const ticks=Array.from({length:40},(_,i)=>{
    const a=i*Math.PI/20,x=80+Math.sin(a)*44,y=116-Math.cos(a)*44;
    const r=i%5===0?38:41;
    return `<path d="M${x.toFixed(2)} ${y.toFixed(2)}L${(80+Math.sin(a)*r).toFixed(2)} ${(116-Math.cos(a)*r).toFixed(2)}"/>`;
  }).join('');
  return `<svg viewBox="0 0 160 232" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path class="sigil-border" d="M18 7H142L153 18V214L142 225H18L7 214V18Z M23 15H137L145 23V209L137 217H23L15 209V23Z"/>
    <path class="sigil-filigree" d="M25 53V30H48M112 30H135V53M25 179V202H48M112 202H135V179 M19 65L29 55L19 45 M141 65L131 55L141 45 M19 167L29 177L19 187 M141 167L131 177L141 187 M40 21L50 31L60 21M100 21L110 31L120 21 M40 211L50 201L60 211M100 211L110 201L120 211"/>
    <path class="sigil-axis" d="M80 26V63M80 169V206M25 116H35M125 116H135 M80 34L87 46L80 58L73 46Z M80 174L87 186L80 198L73 186Z M80 56L129 116L80 176L31 116Z"/>
    <g class="sigil-dial" stroke-width=".7"><circle cx="80" cy="116" r="48"/><circle cx="80" cy="116" r="35"/>${ticks}</g>
    <g class="sigil-etch" pathLength="1">
      <path d="M80 70L91 100L122 116L91 132L80 162L69 132L38 116L69 100Z"/>
      <path d="M45 116Q80 84 115 116Q80 148 45 116Z"/>
      <circle cx="80" cy="116" r="12"/><circle cx="80" cy="116" r="5"/>
      <path d="M52 84L61 93M108 84L99 93M52 148L61 139M108 148L99 139"/>
    </g>
    <g class="sigil-script"><path d="M53 181H62M68 181H74M86 181H92M98 181H107M57 187H67M93 187H103 M53 51H62M68 51H74M86 51H92M98 51H107"/></g>
    <g class="sigil-jewels" fill="currentColor" stroke="none"><path d="M80 17L83 21L80 25L77 21ZM80 207L83 211L80 215L77 211ZM17 112L20 116L17 120L14 116ZM143 112L146 116L143 120L140 116Z"/></g>
  </svg>`;
}

export function loadingRitual():string {
  const face=loadingSigil();
  return `<div class="loading-ritual" aria-hidden="true"><div class="loading-plinth"></div><div class="loading-deck"><div class="loading-card loading-card--under">${face}</div><div class="loading-card loading-card--middle">${face}</div><div class="loading-card loading-card--hero">${face}<div class="loading-inscription">${face}</div><div class="loading-sheen"></div></div></div><div class="loading-contact"></div></div>`;
}
