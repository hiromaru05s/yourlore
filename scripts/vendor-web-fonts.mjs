/** Vendor the exact original Google Fonts subsets; no conversion or glyph edits. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='https://fonts.googleapis.com/css2?family=Alegreya:wght@500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@500;600;700;800&display=swap';
const root='client/public/fonts/web';await fs.mkdir(root+'/files',{recursive:true});
async function get(url){let error;for(let attempt=0;attempt<4;attempt++)try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer());}catch(e){error=e;}throw error;}
const css=process.env.LORE_FONT_CSS?await fs.readFile(process.env.LORE_FONT_CSS,'utf8'):(await get(source)).toString();
const urls=[...new Set([...css.matchAll(/url\((https[^)]+)\)/g)].map(m=>m[1]))],queue=[...urls],entries=[];let completed=0;
await Promise.all(Array.from({length:8},async()=>{while(queue.length){const url=queue.shift(),bytes=await get(url),hash=createHash('sha256').update(bytes).digest('hex'),name=hash+'.woff2';if(bytes.toString('ascii',0,4)!=='wOF2')throw Error('Expected original WOFF2');await fs.writeFile(root+'/files/'+name,bytes);entries.push({source:url,url:'/fonts/web/files/'+name,sha256:hash,bytes:bytes.length});if(++completed%100===0)console.log('Fonts',completed,'/',urls.length);}}));
for(const family of ['alegreya','notosansjp','shipporimincho'])await fs.writeFile(root+'/'+family+'-OFL.txt',await get('https://raw.githubusercontent.com/google/fonts/main/ofl/'+family+'/OFL.txt'));
entries.sort((a,b)=>a.url.localeCompare(b.url));const bySource=new Map(entries.map(e=>[e.source,e.url]));
await fs.writeFile('client/src/styles/fonts.css','/* Original Google Fonts subsets; licenses and provenance: /fonts/web/ */\n'+css.replace(/url\((https[^)]+)\)/g,(_,url)=>`url(${bySource.get(url)})`));
await fs.writeFile(root+'/sources.json',JSON.stringify({source,userAgent:'Chrome 155',entries},null,2));
await fs.writeFile('client/src/ui/fontAssets.ts','/** Exact original subsets used by styles/fonts.css. See public/fonts/web licenses. */\nexport const WEB_FONT_FILES='+JSON.stringify(entries.map(e=>e.url))+';\n');
console.log('Vendored',entries.length,'original WOFF2 files;',entries.reduce((n,e)=>n+e.bytes,0),'bytes');
