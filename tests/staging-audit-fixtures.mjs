import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lore-qa-lifecycle-')),file=dir+'/auth.json',database=dir+'/test.db';
try{
 const db=new DatabaseSync(database);db.exec(fs.readFileSync('server/schema.sql','utf8'));db.exec("INSERT INTO users(id,email,password,display,created_at) VALUES('keep','keep@example.invalid','disabled','Keep',1)");db.close();
 // Exercise the real CLI SQL against SQLite, including Wrangler import progress.
 fs.writeFileSync(dir+'/npm',`#!/usr/bin/env node
const fs=require('node:fs'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const args=process.argv.slice(2);assert(args.includes('lore-db-staging'));assert(!args.includes('lore-db'));assert.equal(args[args.indexOf('--env')+1],'staging');assert(args.includes('--remote'));
const db=new DatabaseSync(process.env.QA_TEST_DB);let result;
if(args.includes('--file')){db.exec(fs.readFileSync(args[args.indexOf('--file')+1],'utf8'));console.log('├ Upload complete');result=[{success:true,results:[{'Total queries executed':1}]}];}
else result=[{success:true,results:db.prepare(args[args.indexOf('--command')+1]).all()}];
db.close();console.log(JSON.stringify(result,null,2));
`,{mode:0o700});
 const run=action=>spawnSync(process.execPath,['scripts/staging-audit-fixtures.mjs',action],{encoding:'utf8',env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,QA_TEST_DB:database,LORE_BACKEND_AUTH_FILE:file}});
 let r=run('setup');assert.equal(r.status,0,r.stderr);assert.equal(fs.statSync(file).mode&0o777,0o600);assert.equal(run('setup').status,1,'Never overwrite recovery credentials');
 const fixture=JSON.parse(fs.readFileSync(file,'utf8')),check=new DatabaseSync(database);
 assert.equal(check.prepare('SELECT COUNT(*) AS n FROM users').get().n,3);
 check.prepare('INSERT INTO rewards VALUES(?,?,?,?)').run(fixture.users[0].id,'qa',11,1);
 check.prepare('INSERT INTO matches(id,player_a,player_b,mode,created_at) VALUES(?,?,?,?,?)').run('qa-match',fixture.users[0].id,fixture.users[1].id,'ranked',1);
 check.prepare('INSERT INTO ranked_match_decks VALUES(?,?,?)').run('qa-match',fixture.users[0].id,'[]');check.close();
 r=run('cleanup');assert.equal(r.status,0,r.stderr);assert(!fs.existsSync(file));assert(!fs.existsSync(file+'.sql'));
 const final=new DatabaseSync(database);assert.deepEqual(final.prepare('SELECT id FROM users').all().map(r=>r.id),['keep']);for(const table of ['sessions','rewards','matches','ranked_match_decks','coupons','gift_messages','gift_deliveries'])assert.equal(final.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0,table);final.close();
 fs.writeFileSync(file,JSON.stringify({...fixture,users:[{id:'keep'},fixture.users[1]]}));assert.equal(run('cleanup').status,1,'Cleanup cannot target an ordinary account');
 console.log('PASS staging-only QA setup, private recovery file, dependent row cleanup and unrelated-account preservation');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
