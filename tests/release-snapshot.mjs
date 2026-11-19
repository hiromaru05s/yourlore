import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {checkoutReleaseSnapshot} from '../scripts/release-snapshot.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'lore-snapshot-test-')),repo=path.join(root,'repo'),snapshot=path.join(root,'release');
await fs.mkdir(repo);
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const kept=['package.json','client/src/main.ts','client/public/art/card.webp','client/public/docs/help.png','server/index.ts','tests/fixture.png','docs/design.md','docs/releases/nested/report.json'];
const omitted=['docs/reference.png','docs/releases/nested/before.webp','docs/releases/nested/clip.webm'];
try{
 git('init','-q');
 for(const file of [...kept,...omitted]){await fs.mkdir(path.dirname(path.join(repo,file)),{recursive:true});await fs.writeFile(path.join(repo,file),file);}
 git('add','.');git('-c','user.name=Snapshot test','-c','user.email=snapshot@example.invalid','commit','-qm','fixture');
 const sha=git('rev-parse','HEAD');
 // An uncommitted edit in the caller must never leak into the release.
 await fs.writeFile(path.join(repo,'client/src/main.ts'),'uncommitted');
 checkoutReleaseSnapshot(snapshot,sha,repo);
 for(const file of kept)assert.equal(await fs.readFile(path.join(snapshot,file),'utf8'),file);
 for(const file of omitted)await assert.rejects(fs.access(path.join(snapshot,file)),{code:'ENOENT'});
 assert.equal(git('-C',snapshot,'rev-parse','HEAD'),sha);
 assert.equal(git('-C',snapshot,'status','--porcelain'),'');
 assert.equal(await fs.readFile(path.join(repo,'client/src/main.ts'),'utf8'),'uncommitted');
 assert.equal(await fs.readFile(path.join(repo,omitted[0]),'utf8'),omitted[0]);
 assert(git('status','--porcelain').includes('client/src/main.ts'));
 console.log('PASS committed release snapshot keeps build inputs and leaves caller untouched');
}finally{
 try{git('worktree','remove','--force',snapshot);}catch{}
 await fs.rm(root,{recursive:true,force:true});
}
