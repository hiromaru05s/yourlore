import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
/** Room fixtures need the same persisted daily assignment as deployed rooms. */
export function rewardTestEnv(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../../server/schema.sql',import.meta.url),'utf8'));
 for(const id of ['a','b','qa-a','qa-b'])db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(id,id+'@fixture.invalid','disabled',id,0);
 const prepare=(sql,args=[])=>({bind(...values){return prepare(sql,values)},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},async first(){return db.prepare(sql).get(...args)??null},async all(){return {results:db.prepare(sql).all(...args)}}});
 return {DB:{prepare,async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results}catch(error){db.exec('ROLLBACK');throw error}}}};
}
