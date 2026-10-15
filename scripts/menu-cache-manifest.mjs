import {build} from 'esbuild';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const mime={'.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg'};
/** Original files, grouped into bounded immutable transfers. Entries retain their
 * own hash: a patch can fetch just its changed files instead of the whole pack. */
export async function menuCacheManifest(root) {
 const bundle=await build({entryPoints:[path.join(root,'src/ui/menuAssets.ts')],bundle:true,platform:'node',format:'esm',write:false});
 const {menuAssetUrls,duelFileAssets}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const extra=duelFileAssets(),media=new Map(extra.map(e=>[new URL(e.url,'https://lore.invalid').pathname,e.media]));
 // CSS backgrounds/cursors can be requested by transitional/fallback styles too.
 const cssImages=new Set();
 async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await scan(file);else if(e.name.endsWith('.css')){const text=await readFile(file,'utf8');for(const match of text.matchAll(/url\(\s*['"]?(\/[^\s'"\)]+)/g)){const url=new URL(match[1],'https://lore.invalid').pathname;if(/\.(png|webp|svg|jpe?g)$/.test(url))cssImages.add(url);}}}}
 await scan(path.join(root,'src'));
 const paths=[...new Set([...menuAssetUrls(),...cssImages,...extra.map(e=>e.url)].map(u=>new URL(u,'https://lore.invalid').pathname))].sort();
 const contents=new Map();
 const entries=await Promise.all(paths.map(async url=>{
  const bytes=await readFile(path.join(root,'public',url)),hash=sha(bytes);contents.set(hash,bytes);
  return {url,hash,bytes:bytes.length,media:media.get(url),type:mime[path.extname(url)]||'application/octet-stream'};
 }));
 const packs=[],assets=[];let batch=[],size=0;
 const flush=()=>{if(!batch.length)return;const source=Buffer.concat(batch.map(e=>contents.get(e.hash))),fileName=`assets/art-pack-${sha(source).slice(0,24)}.bin`;
  let offset=0;for(const e of batch){e.pack=packs.length;e.offset=offset;offset+=e.bytes;}
  packs.push({url:'/'+fileName,bytes:source.length});assets.push({fileName,source});batch=[];size=0;
 };
 // Deduplicate identical masters/thumbnail aliases without changing URL identity.
 const unique=new Map();for(const e of entries){if(unique.has(e.hash))continue;unique.set(e.hash,e);if(size+e.bytes>4*1024*1024)flush();batch.push(e);size+=e.bytes;}flush();
 for(const e of entries){const first=unique.get(e.hash);e.pack=first.pack;e.offset=first.offset;}
 const json=JSON.stringify({entries,packs}),revision=sha(json).slice(0,20);
 return {entries,packs,assets,json,fileName:`assets/menu-manifest-${revision}.json`};
}
