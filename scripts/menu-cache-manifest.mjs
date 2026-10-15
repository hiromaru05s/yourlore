import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export async function menuCacheManifest(root) {
 const bundle=await build({entryPoints:[path.join(root,'src/ui/menuAssets.ts')],bundle:true,platform:'node',format:'esm',write:false});
 const {menuAssetUrls}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const paths=[...new Set(menuAssetUrls().map(u=>new URL(u,'https://lore.invalid').pathname))].sort();
 const entries=await Promise.all(paths.map(async url=>{
  const bytes=await readFile(path.join(root,'public',url));
  return {url,hash:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 }));
 const json=JSON.stringify({entries}),revision=createHash('sha256').update(json).digest('hex').slice(0,20);
 return {entries,json,fileName:`assets/menu-manifest-${revision}.json`};
}
