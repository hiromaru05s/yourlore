/** Menu-only galleries and locale font files are not duel admission requirements.
 * Fonts are selected by the browser from the current language's actual glyphs. */
export function assetScope(url:string):'menu'|'duel'|'font'{
 // Originals remain available at full quality for inspection. The live card
 // surface uses sm/xs; unselected cosmetic galleries are not admission assets.
 if(url.startsWith('/art/cards/')||url.startsWith('/cosmetics/')||url==='/art/biblion/duel-table.png')return 'menu';
 if(url.startsWith('/art/lounge/icons/'))return 'duel';
 if(url.startsWith('/fonts/web/'))return 'font';
 if(/^\/(art\/(lounge|key-visuals)|bg)\//.test(url)||url==='/music/yohaku-to-zankyo.mp3')return 'menu';
 return 'duel';
}
