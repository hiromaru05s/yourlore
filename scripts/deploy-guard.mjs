/** Cooperative cross-worktree lock, exact remote-main guard and committed snapshot build. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
const env=process.argv[2];if(!['staging','production'].includes(env))throw Error('Usage: node scripts/deploy-guard.mjs staging|production');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const common=path.resolve(git('rev-parse','--git-common-dir')),lock=path.join(common,'lore-deploy-'+env+'.lock');
await fs.mkdir(lock).catch(()=>{throw Error('Another deployment holds '+lock+'; inspect its owner.json before removing a stale lock.');});
let snapshot;
const run=(cmd,args,cwd)=>{const r=spawnSync(cmd,args,{cwd,stdio:'inherit'});if(r.status!==0)throw Error(cmd+' failed');};
try{
 const sha=git('rev-parse','HEAD');await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,host:os.hostname(),sha,at:new Date().toISOString()}));
 if(git('status','--porcelain','--untracked-files=no'))throw Error('Commit or isolate tracked changes before deploying');
 const check=()=>{git('fetch','gh','main');if(git('rev-parse','gh/main')!==sha)throw Error('HEAD must equal current gh/main; integrate changes before deploying');};check();
 if(!process.argv.includes('--check')) {
 snapshot=await fs.mkdtemp(path.join(os.tmpdir(),'lore-release-'));git('worktree','add','--detach',snapshot,sha);
 run('npm',['ci','--no-fund'],snapshot);run('npm',['run','typecheck'],snapshot);run('npm',['run','test:production'],snapshot);run('npm',['run','build'],snapshot);check();
 const args=['exec','--','wrangler','deploy','-c','server/wrangler.toml','--message',sha+' guarded release'];if(env==='staging')args.push('--env','staging');
 run('npm',args,snapshot);console.log('Deployed committed snapshot',sha,env);
 } else console.log('Deployment guards passed',sha,env);
}finally{
 if(snapshot){try{git('worktree','remove','--force',snapshot);}catch{console.error('Snapshot cleanup required:',snapshot);}}
 await fs.rm(lock,{recursive:true,force:true});
}
