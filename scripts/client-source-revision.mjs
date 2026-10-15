import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
/** Stable preload-manifest URL without coupling it to generated chunk hashes. */
export async function clientSourceRevision(root,assetRevision){
 const hash=createHash('sha256').update(assetRevision);
 async function visit(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else if(entry.isFile()){hash.update(path.relative(root,file));hash.update(await readFile(file));}}}
 await visit(path.join(root,'src'));for(const name of ['index.html','vite.config.ts','../package-lock.json'])hash.update(await readFile(path.join(root,name)));
 return hash.digest('hex').slice(0,24);
}
