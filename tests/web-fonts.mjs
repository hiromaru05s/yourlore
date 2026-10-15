import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='client/public/fonts/web',manifest=JSON.parse(await fs.readFile(root+'/sources.json','utf8')),css=await fs.readFile('client/src/styles/fonts.css','utf8');
assert.equal(manifest.entries.length,619);
for(const e of manifest.entries){const bytes=await fs.readFile('client/public'+e.url);assert.equal(bytes.length,e.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);assert(e.url.includes(e.sha256));assert(css.includes(e.url));assert(e.source.startsWith('https://fonts.gstatic.com/'));}
assert(!css.includes('https://fonts.gstatic.com/'));assert(!(await fs.readFile('client/index.html','utf8')).includes('fonts.googleapis.com'));
for(const family of ['alegreya','notosansjp','shipporimincho'])assert((await fs.readFile(root+'/'+family+'-OFL.txt','utf8')).includes('SIL OPEN FONT LICENSE'));
console.log('PASS: 619 exact original WOFF2 subsets, hash-named immutable paths, preserved licenses, no external font dependency');
