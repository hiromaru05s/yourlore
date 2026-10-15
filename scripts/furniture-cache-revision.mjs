import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
/** Invalidate persisted previews for any renderer dependency, texture or model edit. */
export async function furnitureCacheRevision(root,menuRevision){
 const bundle=await build({entryPoints:[path.join(root,'src/ui/cosmetics/catalogRender.ts')],bundle:true,format:'esm',platform:'browser',write:false});
 const hash=createHash('sha256').update(bundle.outputFiles[0].contents).update(menuRevision);
 const models=path.join(root,'public/models/reading-board/v1');
 for(const name of (await readdir(models)).sort())if(/\.(glb|json)$/.test(name))hash.update(name).update(await readFile(path.join(models,name)));
 return hash.digest('hex').slice(0,24);
}
