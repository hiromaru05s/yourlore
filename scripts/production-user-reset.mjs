/** One-time, user-authorized 2026-10-27 production reset. Never run before
 * both production DO cutover/retirement releases have completed. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const execute=process.argv.includes('--execute-authorized-reset');
const output=process.env.LORE_RESET_REPORT;
if(execute&&!output)throw Error('LORE_RESET_REPORT is required to retain count-only evidence');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const cli=args=>{
 const out=execFileSync('npm',['exec','--','wrangler',...args],{encoding:'utf8',maxBuffer:10*1024*1024});
 const start=out.search(/^[\[{]/m);if(start<0)throw Error('Missing Wrangler JSON result');return JSON.parse(out.slice(start));
};
const query=sql=>{const r=cli(['d1','execute','lore-db','--remote','-c','server/wrangler.toml','--command',sql,'--json']);assert(r.length&&r.every(x=>x.success!==false));return r[0].results};
const status=()=>cli(['deployments','status','-c','server/wrangler.toml','--json']);
const lock=path.join(path.resolve(git('rev-parse','--git-common-dir')),'lore-deploy-production.lock');
fs.mkdirSync(lock);
try{
 const sha=git('rev-parse','HEAD');fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,host:os.hostname(),sha,operation:'authorized-user-reset',at:new Date().toISOString()}));
 assert.equal(git('status','--porcelain','--untracked-files=no'),'','Commit source changes before resetting');git('fetch','gh','main');assert.equal(git('rev-parse','gh/main'),sha);
 const config=fs.readFileSync('server/wrangler.toml','utf8').split('[env.staging]')[0],entry=fs.readFileSync('server/src/production.ts','utf8');
 assert.match(config,/USER_DATA_RESET\s*=\s*"1"/);
 for(const name of ['MatchmakerFresh20261027','GameRoomFresh20261027']){assert(config.includes('class_name = "'+name+'"'));assert(entry.includes(name));}
 assert.match(config,/tag\s*=\s*"v5-production-retire-20261027"\s+deleted_classes\s*=\s*\["MatchmakerLive", "GameRoomLive"\]/);
 assert(!/\b(MatchmakerLive|GameRoomLive)\b/.test(entry),'Retired classes must no longer be exported');
 const deployed=status();assert.equal(deployed.annotations?.['workers/message'],sha+' guarded release');assert.equal(deployed.versions.length,1);assert.equal(deployed.versions[0].percentage,100);
 const maintenance=async()=>{for(const origin of ['https://yourlore.xyz','https://www.yourlore.xyz','https://admin.yourlore.xyz']){
  const r=await fetch(origin+'/api/auth/me',{cache:'no-store',signal:AbortSignal.timeout(15000)});assert.equal(r.status,503,origin);assert.equal((await r.json()).maintenance,true,origin);
 }};
 await maintenance();
 const schema=fs.readFileSync('server/schema.sql','utf8'),wipe=fs.readFileSync('scripts/sql/production-user-wipe-20261027.sql','utf8');
 const db=new DatabaseSync(':memory:');db.exec(schema);const expected=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name).sort();db.close();
 const remote=query("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name).filter(n=>!n.startsWith('_cf_')&&!n.startsWith('sqlite_')&&n!=='d1_migrations').sort();assert.deepEqual(remote,expected,'Unclassified remote table: review before wiping');
 const tables=[...wipe.matchAll(/DELETE FROM (\w+);/g)].map(m=>m[1]).sort();assert.deepEqual(tables,expected.filter(n=>n!=='coupons'));
 const countSql=tables.map(n=>`SELECT '${n}' AS name,COUNT(*) AS count FROM "${n}"`).join(' UNION ALL ');
 const report={at:new Date().toISOString(),source:sha,deployment:deployed.id,productionDatabase:'lore-db',before:query(countSql),executed:false};
 if(!execute){console.log(JSON.stringify(report,null,2));}
 else{
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  // Recheck immediately before the destructive step, while the shared lock is held.
  assert.equal(status().id,deployed.id);await maintenance();
  const result=cli(['d1','execute','lore-db','--remote','-c','server/wrangler.toml','--file','scripts/sql/production-user-wipe-20261027.sql','--json']);assert(result.length&&result.every(r=>r.success!==false));
  report.executed=true;report.after=query(countSql);assert(report.after.every(r=>r.count===0));
  assert.equal(query('SELECT COALESCE(SUM(uses),0) AS uses FROM coupons')[0].uses,0);
  await new Promise(r=>setTimeout(r,5000));await maintenance();report.afterQuietPeriod=query(countSql);assert(report.afterQuietPeriod.every(r=>r.count===0),'Old activity repopulated user data');
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('PASS all '+tables.length+' production user tables empty; coupon usage reset; maintenance remains enabled.');
 }
}finally{fs.rmSync(lock,{recursive:true,force:true})}
