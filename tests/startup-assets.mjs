import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startupAssets} from '../scripts/startup-assets.mjs';
const root=new URL('../client/',import.meta.url).pathname;
const first=await startupAssets(root),second=await startupAssets(root);
assert.deepEqual(first.urls,second.urls,'Unchanged art keeps its immutable URL across builds');
for(const [original,url] of Object.entries(first.urls)){
 const source=await readFile(root+'public'+original),asset=first.assets.find(a=>'/'+a.fileName===url);
 assert(source.equals(asset.source),'Emitted image must preserve the original bytes');
 assert(url.includes(createHash('sha256').update(source).digest('hex').slice(0,20)),'URL must change with image content');
 assert(url.startsWith('/assets/'),'Use the existing immutable cache policy');
 assert.equal(first.rewrite(`url('${original}') src="${original}"`),`url('${url}') src="${url}"`);
}
assert.equal(first.rewrite('/art/unrelated.webp'),'/art/unrelated.webp');
assert.equal(first.rewrite(first.rewrite(Object.keys(first.urls).join('\n'))),Object.values(first.urls).join('\n'));
console.log('startup assets: stable content hashes, exact bytes, shared CSS/DOM URLs');
