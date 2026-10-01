/** Hand-authored local material shapes. No raster edge extraction, card copy or frame deformation. */
export const svg=(content:string,view='0 0 200 250')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" fill="none" aria-hidden="true">${content}</svg>`;
const defs=`<defs>
 <linearGradient id="heartCopper" x1="65" y1="65" x2="132" y2="126" gradientUnits="userSpaceOnUse"><stop stop-color="#fff4d8"/><stop offset=".18" stop-color="#e9bc96"/><stop offset=".4" stop-color="#bd7468"/><stop offset=".68" stop-color="#7f4242"/><stop offset="1" stop-color="#371f29"/></linearGradient>
 <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4e2ab"/><stop offset=".15" stop-color="#b79d66"/><stop offset=".34" stop-color="#6b573d"/><stop offset=".57" stop-color="#dfc492"/><stop offset=".63" stop-color="#92734f"/><stop offset="1" stop-color="#332e2b"/></linearGradient>
 <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9e8dc"/><stop offset=".25" stop-color="#718c8f"/><stop offset=".53" stop-color="#223d48"/><stop offset=".76" stop-color="#8ca6a1"/><stop offset="1" stop-color="#152934"/></linearGradient>
 <radialGradient id="hot"><stop stop-color="#fff9df"/><stop offset=".22" stop-color="#ffe2b2"/><stop offset=".52" stop-color="#cb7863" stop-opacity=".7"/><stop offset="1" stop-color="#813b4c" stop-opacity="0"/></radialGradient>
 <linearGradient id="cut" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff7d5"/><stop offset=".42" stop-color="#e9bda0"/><stop offset="1" stop-color="#b35e61" stop-opacity="0"/></linearGradient>
</defs>`;
// The heart is set into the GOLEM1 chest cavity, not over its face or its status bar.
export function heartArt(){return svg(defs+`
 <g class="heart-wrap" style="opacity:1" transform="translate(0 16)">
 <g class="core-light"><path d="M88 65 106 61 121 76 118 111 104 121 91 107Z" fill="url(#hot)"/><path d="m104 71 10 11-6 20-10 7-6-12 4-19z" fill="#fbd9b0" opacity=".55"/></g>
 <g class="heart-relief">
 <path d="M104 80C94 65 76 74 80 90c3 13 17 19 24 27 7-12 19-19 21-31 2-15-13-18-21-6Z" fill="#241923" transform="translate(1.5 3)"/>
 <path d="M104 80C94 65 76 74 80 90c3 13 17 19 24 27 7-12 19-19 21-31 2-15-13-18-21-6Z" fill="url(#heartCopper)"/>
 <path d="M104 83C95 71 80 77 85 90c3 8 12 15 18 21 6-11 16-15 17-25 2-11-8-11-16-3Z" fill="#392932"/>
 <path d="M105 82 96 96h7l-1 13 12-18h-8l4-12" fill="#ffe6c3"/>
 <path d="M81 88c-3-11 11-16 20-7m7-2c7-8 16-1 14 8" stroke="#fff4d1" stroke-width="1.4" stroke-linecap="round"/>
 <path d="m85 94 6 7m22 1 5-7" stroke="#edb6a0" stroke-width="1.1"/>
 </g>
 <g class="pulse-veins" stroke-linecap="round"><path d="M97 108 87 119 73 115 63 124m45-15 12 7 11-5 8 7M90 78l-14-7-9 4-5 13m52-11 11-8 14 9 3 11" stroke="#482630" stroke-width="6"/><path d="M97 108 87 119 73 115 63 124m45-15 12 7 11-5 8 7M90 78l-14-7-9 4-5 13m52-11 11-8 14 9 3 11" stroke="#ffe3bb" stroke-width="2.8"/></g>
 <g class="resist-cut"><path d="M48 64C58 29 99 27 137 48l22 25-28-13c-35-15-60-12-83 4Z" fill="#70404b"/><path d="M47 60C67 30 99 33 135 48l14 15-25-12c-32-9-57-5-77 9Z" fill="url(#cut)"/><path d="m146 61 18 22-7-17 19 11-29-28 5 12Z" fill="#ffe2bd"/><path d="m41 71-9 24 2-27 13-21-6 24Z" fill="#e8c79d"/></g></g>
 `);}
const clasp=(right=false)=>`<g transform="${right?'translate(200 0) scale(-1 1)':''}">
 <path d="M19 125 31 117 44 119 52 135 46 157 34 171 18 161 12 146Z" fill="#14212a"/>
 <path d="M16 125 29 115 43 117 50 132 43 152 32 166 15 155 9 142Z" fill="url(#brass)" stroke="#554632" stroke-width="1.5"/>
 <path d="M17 130 29 122 37 124 40 136 35 146 28 153 18 147 14 140Z" fill="url(#steel)" stroke="#d9c59a" stroke-width="1"/>
 <path d="m16 125 12-9 13 3m-30 22 4 13 17 11" stroke="#ffe6b9" stroke-width="1.7"/>
 <path d="m30 151 5-17 8-2 12 9-7 34-13 19-14-5 1-13z" fill="#222c2d"/>
 <path d="m26 149 6-17 8-2 11 10-7 33-13 17-13-5 1-12z" fill="url(#brass)" stroke="#413728" stroke-width="1.4"/>
 <path d="m30 142 5-6 7 4-7 29-8 12-4-3z" fill="url(#steel)"/>
 <path d="m27 149 6-15 7-2 9 9m-29 41 9 6 13-17" stroke="#f3d8a7" stroke-width="1.4"/>
 <path d="m28 187-10 2-10 13 8 8 24-4 13-8-5-8-13-3Z" fill="#18212a"/>
 <path d="m26 184-10 2-10 13 8 7 24-4 13-7-5-8-13-3Z" fill="url(#brass)" stroke="#413a30" stroke-width="1.6"/>
 <path d="m12 198 8-8 12-1 10 3-8 5-16 4Z" fill="#c1b084"/><path d="m8 199 7 5 22-4 10-6" stroke="#ffeece" stroke-width="1.4"/>
 <ellipse cx="28" cy="135" rx="5" ry="6" fill="#282c29" stroke="#e9c488" stroke-width="1.5"/><path d="m26 132 4 6" stroke="#879c9b" stroke-width="1.4"/>
 <path d="m28 117-1 6m8 38 5 2m-20 32 1 5" stroke="#fff4d0" stroke-opacity=".6"/>
 </g>`;
export function claspArt(){return svg(defs+`<g class="clasp-left">${clasp()}</g><g class="clasp-right">${clasp(true)}</g><g class="metal-stress" stroke-linecap="round"><path d="m31 134 5 12-5 23-8 15m144-50-3 15 5 22 7 12" stroke="#e7deb1" stroke-width="2.3"/><path d="m27 144 6 10m133-2 5-8" stroke="#fff9dc" stroke-width="1"/></g>`);}
// Three separately authored torn silhouettes, with hollow centers rather than a uniform radial burst.
export const groundArt=svg(`<g class="contact-shadow"><path d="M17 59C31 49 62 48 89 51c33-6 63-2 89 7-7 13-50 17-77 15-36 6-76-1-84-14Z" fill="#24272e" opacity=".36"/></g><g class="ground-shear"><path d="m14 61 26-12-9 9 30-10-10 10 33-4-18 9-22 1-14 6-16-9Zm102-1 27-10-5 8 30-2 18 10-23-3-14 9-15-6-18-6Z" fill="#8d7654"/><path d="m17 60 23-9-9 8 29-8-15 10-19 5Zm104 0 22-7-5 7 27-2 17 7-26-2-8 5Z" fill="#f2dfb7"/></g><g class="ground-fragments"><path d="m9 57 12-6-6 8Zm34 16 16-3-7 8Zm114 0 15 7-2-7Zm22-21 10 5-4 5Z" fill="#bcab8e"/></g>`,'0 0 200 100');
