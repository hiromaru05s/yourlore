import {ensureCardFrameReady} from './cardFrame';
/** Capture the browser's actual card print, including every badge and CSS clip.
 * The previous hand-written Canvas painter was a second card renderer: it omitted
 * counters and guessed text alignment/shadows, so its result could never land
 * on the native card without changing the outline. */
const assets=new Map<string,Promise<string>>();
function dataUrl(url:string):Promise<string>{
 if(url.startsWith('data:'))return Promise.resolve(url);
 let pending=assets.get(url);
 if(!pending){
  pending=fetch(url).then(r=>{if(!r.ok)throw Error('Card layer '+r.status);return r.blob();}).then(async blob=>{
   let value=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
   // WebKit resolves the outer SVG before its first embedded WebP decode.
   // Warm this exact data URL, not just the original network URL, first.
   if(blob.type.startsWith('image/')){
    const image=new Image();image.src=value;await image.decode();
    // WebKit's SVG foreignObject can race its embedded WebP decoder even after
    // decode(). A lossless PNG snapshot of the decoded pixels is deterministic.
    // This is capture-only and cached; the game still transfers compact WebP.
    if(blob.type==='image/webp'){const pixels=document.createElement('canvas');pixels.width=image.naturalWidth;pixels.height=image.naturalHeight;pixels.getContext('2d')!.drawImage(image,0,0);value=pixels.toDataURL();}
   }
   return value;
  });assets.set(url,pending);void pending.catch(()=>assets.delete(url));if(assets.size>48)assets.delete(assets.keys().next().value!);
 }
 return pending;
}
const visualProperty=/^(?:position|inset|top|right|bottom|left|width|height|min-|max-|box-sizing|display|margin|padding|font|line-height|color|letter-spacing|word-spacing|white-space|text-|vertical-align|direction|writing-mode|align-|justify-|place-|flex|grid|gap|row-gap|column-gap|overflow|background|border|outline|box-shadow|opacity|filter|clip|mask|transform|translate|rotate|scale|object-|z-index|isolation|mix-blend-mode|contain|content-visibility|fill|stroke|-webkit-text)/;
const urls=/url\(["']?([^"')]+)["']?\)/g;
async function inlineValue(value:string){
 const matches=[...value.matchAll(urls)];
 for(const match of matches){const url=match[1];if(url.includes('#')){const id=url.slice(url.indexOf('#'));if(document.querySelector(id))value=value.replace(match[0],`url(${id})`);continue;}value=value.replace(match[0],`url("${await dataUrl(url)}")`);}
 return value;
}
/** SVG image documents have their own font environment. Embed only families
 * and Unicode subsets used by this print, rather than loading the whole font set. */
async function printFonts(source:HTMLElement):Promise<string>{
 const nodes=[source,...source.querySelectorAll('*')],families=new Set(nodes.flatMap(n=>getComputedStyle(n).fontFamily.split(',').map(x=>x.trim().replace(/^["']|["']$/g,''))));
 const points=[...new Set([...(source.textContent??'')].map(c=>c.codePointAt(0)!))];
 const rules:CSSFontFaceRule[]=[];
 const visit=(list:CSSRuleList)=>{for(const rule of list){if(rule instanceof CSSFontFaceRule)rules.push(rule);else if('cssRules' in rule)visit((rule as CSSGroupingRule).cssRules);}};
 for(const sheet of document.styleSheets){try{visit(sheet.cssRules);}catch{/* External sheets are not used by the card print. */}}
 const needed=rules.filter(rule=>{
  if(!families.has(rule.style.fontFamily.replace(/^["']|["']$/g,'')))return false;
  const ranges=rule.style.getPropertyValue('unicode-range');if(!ranges)return true;
  return ranges.split(',').some(range=>{const [a,b]=range.trim().replace(/^U\+/i,'').split('-');const lo=parseInt(a.replace(/\?/g,'0'),16),hi=parseInt((b??a).replace(/\?/g,'F'),16);return points.some(p=>p>=lo&&p<=hi);});
 });
 return (await Promise.all(needed.map(async r=>'@font-face{'+await inlineValue(r.style.cssText)+'}'))).join('');
}
export async function captureNativePrint(source:HTMLElement,width:number,padding:number,liveSource=source):Promise<HTMLCanvasElement>{
 await Promise.all([ensureCardFrameReady(source),...(liveSource===source?[]:[ensureCardFrameReady(liveSource)])]);
 const rootStyle=getComputedStyle(source),w=parseFloat(rootStyle.width)||source.offsetWidth,h=parseFloat(rootStyle.height)||source.offsetHeight;if(!w||!h)throw Error('Card print has no layout');
 const scale=width/w,pad=width*padding,height=width*h/w;
 const scaled=(key:string,value:string,factor=scale)=>{
  if(key==='transform'&&value!=='none'){const matrix=new DOMMatrix(value);matrix.m41*=factor;matrix.m42*=factor;matrix.m43*=factor;return matrix.toString();}
  return value.replace(/url\([^)]*\)|(-?[\d.]+)px\b/g,(whole,n)=>n===undefined?whole:`${Number(n)*factor}px`);
 };
 await document.fonts.ready;
 await Promise.all([...source.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));
 const originals=[source,...source.querySelectorAll('*')];
 const copy=source.cloneNode(true) as HTMLElement,copies=[copy,...copy.querySelectorAll('*')];
 // Native layers supersample at 2x then scale down. This document already lays
 // out in output pixels: normalize that extra layer scale to avoid a 4800px
 // filtered intermediate on WebKit and four times the unnecessary raster work.
 const sampled=originals.filter(n=>n.matches('.card-art,.card-frame,.buff-art,.buff-frame')&&getComputedStyle(n).scale==='0.5');
 const liveCanvases=[...liveSource.querySelectorAll('canvas')],sourceCanvases=[...source.querySelectorAll('canvas')];
 await Promise.all(originals.map(async(node,i)=>{
  let target=copies[i];const cs=getComputedStyle(node),style=(target as HTMLElement|SVGElement).style,factor=scale*(sampled.some(layer=>layer===node||layer.contains(node))?.5:1);
  if(!style)return;
  const declarations:string[]=[];
  for(const key of cs){if(!visualProperty.test(key))continue;const value=cs.getPropertyValue(key);declarations.push(`${key}:${(node instanceof SVGElement&&!(node instanceof SVGSVGElement))?value:scaled(key,value.includes('url(')?await inlineValue(value):value,factor)}`);}
  style.cssText=declarations.join(';')+';animation:none!important;transition:none!important;visibility:visible!important';
  if(sampled.includes(node)){style.scale='1';style.right='auto';style.bottom='auto';}
  if(i===0)target.removeAttribute('id');target.removeAttribute('data-uid');
  if(node instanceof HTMLImageElement){(target as HTMLImageElement).removeAttribute('srcset');(target as HTMLImageElement).removeAttribute('sizes');(target as HTMLImageElement).src=await dataUrl(node.currentSrc||node.src);}
  if(node instanceof HTMLCanvasElement){const original=liveCanvases[sourceCanvases.indexOf(node)]??node;if(original.width&&original.height){const img=document.createElement('img');img.style.cssText=style.cssText;img.src=original.toDataURL();await img.decode();target.replaceWith(img);target=img;}}
  // Pseudo-elements (quest labels, badge plates) are part of the print too.
  for(const pseudo of ['::before','::after']){const ps=getComputedStyle(node,pseudo);if(ps.content==='none'||ps.content==='normal'||ps.display==='none')continue;const el=document.createElement('span');const ds=[];for(const key of ps){if(!visualProperty.test(key))continue;const value=ps.getPropertyValue(key);ds.push(`${key}:${scaled(key,value.includes('url(')?await inlineValue(value):value,factor)}`);}el.style.cssText=ds.join(';');el.textContent=ps.content.replace(/^["']|["']$/g,'');pseudo==='::before'?target.prepend(el):target.append(el);}
 }));
 copy.style.cssText+=`;position:absolute!important;left:${pad}px!important;top:${pad}px!important;width:${width}px!important;height:${height}px!important;margin:0!important;transform:none!important;translate:none!important;rotate:none!important;scale:none!important;opacity:1!important`;
 copy.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 const defs=document.getElementById('celestial-compositing')?.innerHTML??'',fonts=await printFonts(source);
 const cw=Math.ceil(width+pad*2),ch=Math.ceil(height+pad*2);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">${defs}<style>${fonts}</style><foreignObject width="${cw}" height="${ch}">${new XMLSerializer().serializeToString(copy)}</foreignObject></svg>`;
 const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;const context=canvas.getContext('2d')!;
 for(let pass=0;pass<5;pass++){
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('</svg>',`<!-- decode ${pass} --></svg>`));await image.decode();
  context.clearRect(0,0,cw,ch);context.drawImage(image,0,0);
  const artReady=context.getImageData(Math.floor(cw*.5),Math.floor(ch*.5),1,1).data[3]>10;
  const frameReady=context.getImageData(Math.floor(pad+width*.5),Math.floor(pad+height*.10),1,1).data[3]>10;
  if(artReady&&frameReady&&(pass===0||pass>=3))return canvas;
  // Some WebKit builds defer foreignObject subimages until the first paint.
  // A new image document then consumes that decoded image cache atomically.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 }
 throw Error(`Card print did not decode its illustration: ${source.dataset.cardId??source.className} ${width}x${height}`);
}

/** Reserve enough texels for the largest projected pose without giving every
 * tiny field card a 5-million-pixel texture. Round to reusable density tiers. */
export function cardPrintWidth(node:HTMLElement):number{
 const projected=node.getBoundingClientRect().width*(globalThis.devicePixelRatio||1)*2;
 return Math.min(1536,Math.max(768,Math.ceil(projected/256)*256));
}
