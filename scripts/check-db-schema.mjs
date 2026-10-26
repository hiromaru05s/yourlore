/** Read-only release preflight. Apply reviewed additive migrations explicitly first. */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {schemaGaps} from './db-schema-contract.mjs';
const environment=process.argv[2];
if(!['staging','production'].includes(environment))throw Error('Usage: node scripts/check-db-schema.mjs staging|production');
const args=['exec','--','wrangler','d1','execute',environment==='staging'?'lore-db-staging':'lore-db','--remote','-c','server/wrangler.toml',...(environment==='staging'?['--env','staging']:[]),'--command',"SELECT name,type,sql FROM sqlite_master WHERE type IN ('table','index')",'--json'];
const responses=JSON.parse(execFileSync('npm',args,{encoding:'utf8',maxBuffer:10*1024*1024}));
if(!responses.length||responses.some(r=>r.success===false)||!Array.isArray(responses[0].results))throw Error('Database schema inspection failed');
const gaps=schemaGaps(readFileSync('server/schema.sql','utf8'),responses[0].results);
if(gaps.length)throw Error('Database does not satisfy this release: '+gaps.join(', ')+'. Apply the reviewed migrations before deploying.');
console.log('PASS '+environment+' database tables, columns, types and required indexes');
