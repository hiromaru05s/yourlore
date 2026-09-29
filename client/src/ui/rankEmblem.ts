/** Native engraved metal crests: one visual family, eight readable silhouettes. */
import { TIERS } from '../shared/rank';
export function rankEmblem(tier: string): string {
  const level = tier === 'gm' ? 7 : Math.max(0, TIERS.findIndex(t => t.key === tier));
  const wings = level < 2 ? '' : `<g class="rank-wings" fill="var(--rank-metal)" stroke="#101c31" stroke-width="2">${[-1,1].map(s=>`<g transform="translate(80 80) scale(${s} 1)">${Array.from({length:Math.min(4,level-1)},(_,i)=>`<path d="M22 ${8-i*7}  ${62-i*4} ${-26-i*9} ${53-i*4} ${8-i*5} 29 ${25-i*7}Z"/>`).join('')}</g>`).join('')}</g>`;
  const crown = level < 5 ? '' : `<path d="m51 39-7-22 23 10L80 ${level===7?2:9}l13 18 23-10-7 22" fill="var(--rank-metal)" stroke="#f4edcf" stroke-width="1.5"/>`;
  return `<svg class="rank-emblem rank-emblem-${tier}" viewBox="0 0 160 164" fill="none" aria-hidden="true">
    <ellipse cx="80" cy="148" rx="37" ry="6" fill="#020b19" opacity=".65"/>
    ${wings}${crown}
    <path d="m80 24 40 20-5 60-35 39-35-39-5-60Z" fill="#071321" stroke="var(--rank-metal)" stroke-width="3"/>
    <path d="m80 30 34 18-5 53-29 34-29-34-5-53Z" fill="var(--rank-metal)"/>
    <path d="M80 30v105l-29-34-5-53Z" fill="#fff" opacity=".13"/>
    <path d="m80 38 26 15-4 45-22 27-22-27-4-45Z" fill="#10233a" stroke="#0b101f" stroke-width="2"/>
    <path d="m80 38 26 15-4 45-22 27V38" fill="#29415a" opacity=".7"/>
    <path d="m80 49 19 29-19 35-19-35Z" fill="var(--rank-metal)"/>
    <path d="m80 49 19 29-19 7-19-7Z" fill="#fff" opacity=".28"/>
    <path d="m80 85 19-7-19 35Z" fill="#071322" opacity=".42"/>
    <path d="M63 78q17-18 34 0-17 16-34 0Z" fill="#0a1a2c" stroke="#f8f5e7" stroke-width="1"/>
    <path d="m80 68 5 10-5 10-5-10Z" fill="#fff8db"/>
    <g class="rank-engraving" stroke="#fff4d5" stroke-width="1.2" opacity=".78"><path pathLength="1" d="m80 27 37 19-5 57-32 37-32-37-5-57Z"/><path d="M53 51v18m54-18v18M57 101l15 18m31-18-15 18"/>
    ${Array.from({length:Math.min(4,level+1)},(_,i)=>`<path d="m${68+i*8-(Math.min(4,level+1)-4)*4} 130 2 3-2 3-2-3Z" fill="#fff4d5"/>`).join('')}</g>
    ${level===7?'<path d="m80 2 5 10-5 9-5-9ZM22 59l5 8-5 8-5-8Zm116 0 5 8-5 8-5-8Z" fill="#fff2c5"/>':''}
  </svg>`;
}
