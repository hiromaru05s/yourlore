/** Cooperative cross-worktree lock, source/version guards and committed snapshot build. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync,spawn} from 'node:child_process';
const env=process.argv[2];if(!['staging','production'].includes(env))throw Error('Usage: node scripts/deploy-guard.mjs staging|production');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const common=path.resolve(git('rev-parse','--git-common-dir')),lock=path.join(common,'lore-deploy-'+env+'.lock');
await fs.mkdir(lock).catch(()=>{throw Error('Another deployment holds '+lock+'; inspect its owner.json before removing a stale lock.');});
let snapshot,child,stopped=false;
const stop=()=>{stopped=true;if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{}}};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
const run=(cmd,args,cwd)=>new Promise((resolve,reject)=>{
 if(stopped){reject(Error('Deployment interrupted'));return;}
 child=spawn(cmd,args,{cwd,stdio:'inherit',detached:true});
 child.on('error',reject);child.on('exit',code=>{child=null;code===0&&!stopped?resolve():reject(Error(cmd+' failed or was interrupted'));});
});
try{
 const sha=git('rev-parse','HEAD');await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,host:os.hostname(),sha,at:new Date().toISOString()}));
 if(git('status','--porcelain','--untracked-files=no'))throw Error('Commit or isolate tracked changes before deploying');
 const check=()=>{
  if(stopped)throw Error('Deployment interrupted');git('fetch','gh','main');
  if(git('rev-parse','gh/main')!==sha)throw Error('HEAD must equal current gh/main; integrate changes before deploying');
  try{git('merge-base','--is-ancestor','main',sha);}catch{throw Error('Local main has unintegrated commits; inspect it before deploying');}
 };check();
 if(!process.argv.includes('--check')){
  snapshot=await fs.mkdtemp(path.join(os.tmpdir(),'lore-release-'));git('worktree','add','--detach',snapshot,sha);
  await run('npm',['ci','--no-fund'],snapshot);
  const status=()=>JSON.parse(execFileSync('npm',['exec','--','wrangler','deployments','status','-c','server/wrangler.toml',...(env==='staging'?['--env','staging']:[]),'--json'],{cwd:snapshot,encoding:'utf8'}));
  const before=status();
  const message=before.annotations?.['workers/message']??'';
  for(const candidate of message.match(/\b[a-f0-9]{7,40}\b/g)??[]){
   let known;try{known=git('rev-parse','--verify',candidate+'^{commit}');}catch{continue;}
   try{git('merge-base','--is-ancestor',known,sha);}catch{throw Error('Deployed source '+candidate+' is not included in this release');}
  }
  await run('npm',['run','typecheck'],snapshot);await run('npm',['run','test:production'],snapshot);await run('npm',['run','build'],snapshot);check();
  if(status().id!==before.id)throw Error('Deployment changed during validation; inspect the new version before retrying');
  const args=['exec','--','wrangler','deploy','-c','server/wrangler.toml','--message',sha+' guarded release'];if(env==='staging')args.push('--env','staging');
  await run('npm',args,snapshot);console.log('Deployed committed snapshot',sha,env);
 }else console.log('Deployment guards passed',sha,env);
}finally{
 if(snapshot){try{git('worktree','remove','--force',snapshot);}catch{console.error('Snapshot cleanup required:',snapshot);}}
 await fs.rm(lock,{recursive:true,force:true});
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
}
