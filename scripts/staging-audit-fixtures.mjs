/** Temporary isolated accounts for tests/backend-staging-audit.mjs. Staging only. */
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const action=process.argv[2],file=process.env.LORE_BACKEND_AUTH_FILE;
if(!['setup','cleanup'].includes(action)||!file)throw Error('setup|cleanup and LORE_BACKEND_AUTH_FILE are required');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
function execute(sql,read=false){
 const sqlFile=file+'.sql';fs.writeFileSync(sqlFile,sql,{mode:0o600});
 try{const output=execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','-c','server/wrangler.toml','--env','staging',...(read?['--command',sql]:['--file',sqlFile]),'--json'],{encoding:'utf8',maxBuffer:10*1024*1024});const start=output.search(/^\[/m);if(start<0)throw Error('Missing D1 response');const result=JSON.parse(output.slice(start));if(result.some(r=>r.success===false))throw Error('Staging fixture query failed');return result;}
 finally{fs.rmSync(sqlFile,{force:true});}
}
if(action==='setup'){
 if(fs.existsSync(file))throw Error('Existing fixture file must be cleaned up first');
 const run=randomBytes(8).toString('hex'),now=Date.now(),users=[0,1].map(i=>({id:`qa-backend-${run}-${i}`,email:`qa-backend-${run}-${i}@example.invalid`,token:randomBytes(32).toString('hex')}));
 const fixture={users,coupon:'QA-BACKEND-'+run.toUpperCase(),gift:'qa-backend-'+run};
 // Save before D1 writes so cleanup remains possible after a partial failure.
 fs.writeFileSync(file,JSON.stringify(fixture),{mode:0o600,flag:'wx'});
 const sql=users.flatMap((u,i)=>[
  `INSERT INTO users(id,email,password,display,username_set,created_at,verified,credits) VALUES (${quote(u.id)},${quote(u.email)},'qa-login-disabled',${quote('QA '+run+' '+i)},1,${now},1,5000);`,
  `INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES (${quote(u.token)},${quote(u.id)},${now},${now+3600000});`
 ]);
 sql.push(`INSERT INTO coupons(code,amount,max_uses,expires_at) VALUES (${quote(fixture.coupon)},13,1,${now+3600000});`,
  `INSERT INTO gift_messages(id,title,body,amount,created_at,expires_at,created_by,audience) VALUES (${quote(fixture.gift)},'Staging QA','Temporary integration check',11,${now},${now+3600000},${quote(users[0].id)},'selected');`,
  `INSERT INTO gift_deliveries(gift_id,user_id) VALUES (${quote(fixture.gift)},${quote(users[0].id)});`);
 execute(sql.join('\n'));console.log('Created two isolated staging QA accounts and one coupon/gift; credentials stay in private temporary file.');
}else{
 const fixture=JSON.parse(fs.readFileSync(file,'utf8'));
 if(fixture.users.length!==2||fixture.users.some(u=>!/^qa-backend-[a-f0-9]{16}-[01]$/.test(u.id))||!/^QA-BACKEND-[A-F0-9]{16}$/.test(fixture.coupon)||!/^qa-backend-[a-f0-9]{16}$/.test(fixture.gift))throw Error('Unexpected fixture identity');
 const ids=fixture.users.map(u=>quote(u.id)).join(','),db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/schema.sql','utf8'));
 const identityColumns=new Set(['user_id','a_id','b_id','player_a','player_b','winner','challenger','target','user_a','user_b','inviter_id','invitee_id','invited_by','created_by']);
 const conditions=[];
 for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name!='users'").all()){
  const columns=db.prepare('SELECT name FROM pragma_table_info(?)').all(name).filter(c=>identityColumns.has(c.name));
  if(columns.length)conditions.push({name,where:columns.map(c=>`"${c.name}" IN (${ids})`).join(' OR ')});
 }
 db.close();
 const statements=conditions.reverse().map(({name,where})=>`DELETE FROM "${name}" WHERE ${where};`);
 statements.unshift(`DELETE FROM gift_deliveries WHERE gift_id=${quote(fixture.gift)};`);
 statements.push(`DELETE FROM gift_messages WHERE id=${quote(fixture.gift)};`,`DELETE FROM coupon_claims WHERE code=${quote(fixture.coupon)};`,`DELETE FROM coupons WHERE code=${quote(fixture.coupon)};`,`DELETE FROM users WHERE id IN (${ids});`);
 execute(statements.join('\n'));
 const checks=[...conditions,{name:'users',where:`id IN (${ids})`},{name:'coupons',where:`code=${quote(fixture.coupon)}`},{name:'gift_messages',where:`id=${quote(fixture.gift)}`}];
 const results=execute(checks.map(({name,where})=>`SELECT '${name}' AS name,COUNT(*) AS remaining FROM "${name}" WHERE ${where}`).join('\nUNION ALL\n')+';',true);
 if(results[0]?.results?.length!==checks.length||results[0].results.some(row=>row.remaining!==0))throw Error('Staging fixture cleanup verification failed');
 fs.rmSync(file);console.log('Removed staging QA identities and all related application rows; verified zero remaining.');
}
