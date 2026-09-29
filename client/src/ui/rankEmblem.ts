/** Articulated, original LORE crests. Each metal piece has its own hinge. */
import { TIERS } from '../shared/rank';
let serial = 0;
const materials = [
  ['#e4dcd0','#938c85','#383a40','#201e22','#c4baa7','#554b46'],
  ['#ffe4b3','#b77948','#613820','#231b1b','#f9af65','#9a442a'],
  ['#f0fbff','#a6c4d5','#46637d','#142333','#d0f4ff','#577ba2'],
  ['#fff4c4','#e7b852','#8c521c','#38241b','#fff4a0','#d17a17'],
  ['#e0fff7','#6ebbaa','#2a6a71','#112c37','#96ffdf','#127b83'],
  ['#f2ffff','#8dccea','#3b658e','#142542','#c0ffff','#427fdf'],
  ['#fff0d4','#d9b16f','#755139','#261d37','#ebacff','#8a38c8'],
  ['#fff3c4','#e5b05c','#8d482b','#321727','#ffb0bc','#c42454'],
];
const bodies = [
 'M120 69 151 87 155 131 120 172 85 131 89 87Z',
 'M120 59 153 72 170 107 156 146 120 174 84 146 70 107 87 72Z',
 'M120 48 163 85 153 143 120 186 87 143 77 85Z',
 'M120 46 144 70 172 83 163 128 146 161 120 188 94 161 77 128 68 83 96 70Z',
 'M120 42C139 64 164 61 168 87L158 144 120 190 82 144 72 87C76 61 101 64 120 42Z',
 'M120 39 175 98 155 144 120 195 85 144 65 98Z',
 'M120 41 145 64 174 72 167 127 146 168 120 191 94 168 73 127 66 72 95 64Z',
 'M120 38 145 61 172 65 179 96 159 149 138 176 120 198 102 176 81 149 61 96 68 65 95 61Z',
];
const feathers: string[][] = [
 ['M89 97 68 88 73 130 93 145 87 123Z'],
 ['M84 86C60 86 55 115 76 139L91 148 85 133C64 121 72 107 85 108Z','M88 139 63 127 70 150 99 163Z'],
 ['M86 95 48 63 55 109 88 140Z','M88 124 53 112 66 147 99 167Z'],
 ['M83 89 36 52 46 91 85 125Z','M82 114 35 87 51 122 90 145Z','M91 141 51 123 72 155 106 174Z'],
 ['M85 87 51 39 42 80 75 122Z','M77 112 29 79 42 123 88 150Z','M91 140 51 133 70 170 110 181Z'],
 ['M83 89 44 29 37 76 70 124Z','M72 113 18 70 31 115 86 151Z','M91 137 39 128 64 174 107 185Z'],
 ['M85 86C65 78 48 43 38 25L37 72C38 99 57 123 80 136L66 104Z','M75 117 18 77 32 121 84 156 102 168 75 137Z','M94 151 50 135 67 172 108 188Z'],
 ['M85 88C61 66 43 26 29 17L33 69 62 112 85 133 68 91Z','M73 112 13 61 25 112 55 142 94 160 66 129Z','M90 142 26 113 46 151 82 178 110 190Z','M103 169 64 164 89 195 119 207Z'],
];
export function rankEmblem(tier: string): string {
  const level = tier === 'gm' ? 7 : Math.max(0, TIERS.findIndex(t => t.key === tier));
  const key = level === 7 ? 'gm' : TIERS[level].key;
  const id = `rk-${++serial}`, [light, metal, shade, dark, gemLight, gemDark] = materials[level];
  const url=(name:string)=>`url(#${id}-${name})`;
  const piece=(d:string,extra='')=>`<path d="${d}" fill="${url('metal')}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${light}" stroke-width=".8" opacity=".85"/>${extra}`;
  const wing=(side:string)=>`<g class="rank-wing-${side}"><g ${side==='right'?'transform="translate(240 0) scale(-1 1)"':''}>${feathers[level].map((d,i)=>`<g class="rank-feather rank-feather-${i}">${piece(d)}<path d="M${level<2?78:49+i*8} ${level<2?102:77+i*25}Q63 ${108+i*12} ${86+i*7} ${130+i*14}" fill="none" stroke="${shade}" stroke-width="2"/><path d="M${level<2?76:46+i*8} ${level<2?101:73+i*25}Q60 ${105+i*12} ${84+i*7} ${126+i*14}" fill="none" stroke="${light}" stroke-width="1" opacity=".65"/></g>`).join('')}</g></g>`;
  const crown=level<3?'':piece(level<5?'M95 66 89 41 109 51 120 28 131 51 151 41 145 66 120 76Z':level===5?'M90 63 81 33 108 47 120 14 132 47 159 33 150 63 120 73Z':'M86 67 73 24 104 44 120 7 136 44 167 24 154 67 120 78Z',`<path d="m120 ${level<5?35:17} 7 28-7 12-7-12Z" fill="${url('gem')}" stroke="${light}" stroke-width="1"/>`);
  return `<svg class="rank-emblem rank-emblem-${key}" viewBox="0 0 240 232" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-metal" x1=".2" y1="0" x2=".85" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${light}"/><stop offset=".19" stop-color="${metal}"/><stop offset=".43" stop-color="${shade}"/><stop offset=".47" stop-color="${light}"/><stop offset=".58" stop-color="${metal}"/><stop offset=".88" stop-color="${shade}"/><stop offset="1" stop-color="${light}"/></linearGradient>
      <linearGradient id="${id}-inset" x2=".8" y2="1"><stop stop-color="${shade}"/><stop offset=".48" stop-color="${dark}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
      <linearGradient id="${id}-gem" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff"/><stop offset=".22" stop-color="${gemLight}"/><stop offset=".55" stop-color="${gemDark}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <radialGradient id="${id}-shine"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".3" stop-color="${gemLight}" stop-opacity=".3"/><stop offset="1" stop-color="${gemLight}" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="120" cy="210" rx="${40+level*4}" ry="5" fill="#030814" opacity=".5"/>
    <g class="rank-body">
      ${wing('left')}${wing('right')}
      <g class="rank-crown">${crown}</g>
      <g class="rank-base">${piece(level<2?'M99 145 120 159 141 145 139 164 120 187 101 164Z':'M92 159 120 178 148 159 140 186 120 207 100 186Z')}<path d="m120 180 6 6-6 12-6-12Z" fill="${gemLight}" opacity="${level<2?0:.8}"/></g>
      <g class="rank-frame">${piece(bodies[level])}<path d="${bodies[level]}" transform="translate(120 119) scale(.85) translate(-120 -119)" fill="${url('inset')}" stroke="${dark}" stroke-width="3"/><path d="${bodies[level]}" transform="translate(120 119) scale(.77) translate(-120 -119)" fill="none" stroke="${metal}" stroke-width="1"/>
      ${[-1,1].map(s=>`<g transform="translate(120 118) scale(${s} 1)"><path d="M22-30 29-15 26 17 11 39" stroke="${light}" opacity=".5"/><path d="M29-7 34-1 29 5 24-1Z" fill="${url('metal')}" stroke="${dark}"/></g>`).join('')}</g>
      <g class="rank-core">
       <path d="M120 73 145 101 144 133 120 163 96 133 95 101Z" fill="${url('metal')}" stroke="${dark}" stroke-width="3"/>
       <path d="m120 81 19 23-2 26-17 25-17-25-2-26Z" fill="${url('gem')}" stroke="${light}" stroke-width="1"/>
       <path d="m120 81-7 27 7 12 19-16Z" fill="${gemLight}" opacity=".85"/>
       <path d="m120 81-19 23 12 4Z" fill="#fff" opacity=".72"/>
       <path d="m101 104 2 26 17 25-7-47Z" fill="${gemDark}"/>
       <path d="m120 120 17 10-17 25Z" fill="${gemLight}" opacity=".5"/>
       <path d="m113 108 7 12 17 10 2-26" fill="none" stroke="${gemLight}" opacity=".6"/>
       <path d="M109 111 120 99 131 111 120 139Z" fill="${dark}" opacity=".65"/>
       <path d="m120 104 5 8-5 19-5-19Z" fill="${gemLight}"/>
       <path d="m120 106 1 11-1 10-1-10Z" fill="#fff"/>
       <ellipse class="rank-core-light" cx="116" cy="105" rx="29" ry="35" fill="${url('shine')}"/>
      </g>
      <g class="rank-clasp">${piece('M89 93 101 98 105 108 96 113 89 106ZM151 93 139 98 135 108 144 113 151 106Z')}<path d="M110 151 120 144 130 151 120 168Z" fill="${url('metal')}" stroke="${dark}" stroke-width="2"/></g>
    </g>
  </svg>`;
}
