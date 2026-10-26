/** Bring identical subset declarations for different weights into gzip's window.
 * The font files, descriptors and per-family/style/weight cascade stay identical. */
export function orderFontCss(css) {
 const plain=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const faces=[...plain.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m=>m[0]);
 if(plain.replace(/@font-face\s*\{[^}]*\}/g,'').trim())throw Error('Expected only font-face declarations');
 const groups=new Map();
 for(const face of faces){const key=face.replace(/font-weight\s*:[^;]+;/,'');const group=groups.get(key)??[];group.push(face);groups.set(key,group);}
 const ordered=[...groups.values()].flat();
 const cascade=rules=>{
  const map=new Map();
  for(const face of rules){const key=['font-family','font-style','font-weight','font-stretch'].map(name=>face.match(new RegExp(name+'\\s*:([^;]+);'))?.[1].trim()??'').join('|');const list=map.get(key)??[];list.push(face);map.set(key,list);}
  return JSON.stringify([...map].sort(([a],[b])=>a.localeCompare(b)));
 };
 if(cascade(faces)!==cascade(ordered))throw Error('Font cascade order would change');
 return '/* Original Google Fonts subsets; licenses and provenance: /fonts/web/ */\n/* Equivalent weight rules grouped for transport compression; glyphs and cascade preserved. */\n'+ordered.join('\n')+'\n';
}
