import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {schemaGaps} from '../scripts/db-schema-contract.mjs';
const schema=readFileSync('server/schema.sql','utf8'),db=new DatabaseSync(':memory:');
try {
 db.exec(schema);
 const rows=db.prepare("SELECT name,type,sql FROM sqlite_master WHERE type IN ('table','index')").all();
 assert.deepEqual(schemaGaps(schema,rows),[]);
 assert(schemaGaps(schema,rows.filter(r=>r.name!=='ranked_match_decks')).includes('table ranked_match_decks'));
 assert(schemaGaps(schema,rows.filter(r=>r.name!=='idx_ranked_results_applied_a')).includes('index idx_ranked_results_applied_a'));
 assert(schemaGaps(schema,rows.map(r=>r.name==='users'?{...r,sql:r.sql.replace('starter_cards TEXT,','')}:r)).includes('column users.starter_cards'));
 assert(schemaGaps(schema,rows.map(r=>r.name==='users'?{...r,sql:r.sql.replace('starter_cards TEXT,','starter_cards INTEGER,')}:r)).includes('type users.starter_cards'));
 assert.deepEqual(schemaGaps(schema,[...rows,{name:'other_service',type:'table',sql:'CREATE TABLE other_service(id TEXT)'}]),[]);
 console.log('PASS release schema contract: missing table/column/index, wrong type, unrelated tables retained');
}finally{db.close()}
