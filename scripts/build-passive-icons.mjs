// Small-size artwork: a single silhouette on an opaque, chamfered enamel plate.
// Native SVG keeps the 16–32px board glyphs sharp at every device pixel ratio.
import {mkdir, writeFile} from 'node:fs/promises';
const icons = {
  counter: ['#f1c5a4', '<path d="M9 2 1 9l8 7v-5h6a4 4 0 0 1 0 8h-3v4h3a8 8 0 0 0 0-16H9z"/>'],
  dual: ['#e8dfbf', '<path d="m3 1 4 2 8 11-3 2L3 5zm18 0-4 2-8 11 3 2 9-11zM6 13l5 4-2 2-1-1-3 4-2-2 3-4-1-1zm12 0-5 4 2 2 1-1 3 4 2-2-3-4 1-1z"/>'],
  ambush: ['#d8c2ea', '<circle cx="18" cy="5" r="3"/><path d="M14 10q4-3 8 0v10h-8v-5h-4v4l-8-6 8-6v4h4z"/>'],
  aura: ['#b7dcea', '<path d="M12 1 22 5v7q-1 7-10 11Q3 19 2 12V5z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="m12 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>'],
  void: ['#d4c2e8', '<path d="M4 2h9v4H8v12h5v4H4zM16 5l7 7-7 7v-5H9v-4h7z"/><path d="M1 5h2v3H1zM0 11h3v3H0zm1 6h2v3H1z"/>'],
  guts: ['#f0b7ac', '<path d="M12 22C8 18 1 13 1 7c0-6 8-8 11-2 3-6 11-4 11 2 0 6-7 11-11 15"/><path d="m13 5-5 8h4l-1 6 6-9h-4z" fill="#10232f"/>'],
  decay: ['#c8d69f', '<path d="M12 1C5 1 2 5 2 10c0 4 2 6 5 7v5h10v-5c3-1 5-3 5-7 0-5-3-9-10-9"/><path d="M5 8h5v5H6zm9 0h5l-1 5h-4zm-2 5-2 4h4zm-3 6h2v3H9zm4 0h2v3h-2z" fill="#10232f"/>'],
  majesty: ['#edd49c', '<path d="m2 5 6 5 4-8 4 8 6-5-3 13H5zM5 20h14v3H5z"/><path d="m12 10 2 3-2 3-2-3z" fill="#10232f"/>'],
  taunt: ['#bbd9e2', '<path d="m13 2 9 3v7q-1 7-9 11-6-3-8-8h5q1 2 3 3 5-3 5-7V8l-5-2z"/><path d="M1 7h7V3l7 7-7 7v-5H1z"/>'],
  evade: ['#b8dece', '<path d="M13 2h7l-2 10 5 4v5H9l-3-4 5-6z"/><path d="M2 5h7M0 10h7M1 15h4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M10 18h10" fill="none" stroke="#10232f" stroke-width="2"/>'],
  relic: ['#c1def0', '<path d="m12 1 8 10-8 12-8-12z"/><path d="m12 5 4 6-4 7-4-7z" fill="#10232f"/><path d="M3 4v5M1 6.5h4M21 16v5M19 18.5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
};
const out = new URL('../client/public/ui/passives/v2/', import.meta.url);
await mkdir(out, {recursive:true});
for (const [key, [color, glyph]] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<defs><linearGradient id="rim" x2=".3" y2="1"><stop stop-color="#d6c197"/><stop offset=".45" stop-color="#8b816b"/><stop offset="1" stop-color="#514d43"/></linearGradient><linearGradient id="enamel" x2="0" y2="1"><stop stop-color="#213b49"/><stop offset="1" stop-color="#08141e"/></linearGradient></defs>
<path d="M6 .5h20L31.5 6v20L26 31.5H6L.5 26V6z" fill="#030a10"/>
<path d="M6 1.5h20l4.5 4.5v20l-4.5 4.5H6L1.5 26V6z" fill="url(#rim)"/>
<path d="M6.5 3h19L29 6.5v19L25.5 29h-19L3 25.5v-19z" fill="url(#enamel)"/>
<path d="M7 4h18l3 3" fill="none" stroke="#ffffff" stroke-opacity=".13"/>
<g transform="translate(5 5) scale(.91667)" fill="${color}" color="${color}">${glyph}</g>
</svg>\n`;
  await writeFile(new URL(`${key}.svg`, out), svg);
}
console.log(`Built ${Object.keys(icons).length} passive emblems.`);
