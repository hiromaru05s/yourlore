import {DatabaseSync} from 'node:sqlite';
/** Compare only the application's required schema, preserving unrelated D1 tables. */
export function schemaGaps(schema,remote) {
 const expected=new DatabaseSync(':memory:'),actual=new DatabaseSync(':memory:');
 try {
  expected.exec(schema);
  const tables=expected.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
  const required=new Set(tables),remoteTables=new Map(remote.filter(r=>r.type==='table').map(r=>[r.name,r]));
  for(const row of remoteTables.values())if(required.has(row.name)&&row.sql)actual.exec(row.sql);
  const gaps=[];
  const columns=(db,name)=>db.prepare('SELECT name,type FROM pragma_table_info(?)').all(name);
  for(const table of tables){
   if(!remoteTables.has(table)){gaps.push('table '+table);continue;}
   const found=new Map(columns(actual,table).map(r=>[r.name,r.type.toUpperCase()]));
   for(const column of columns(expected,table)){
    if(!found.has(column.name))gaps.push('column '+table+'.'+column.name);
    else if(found.get(column.name)!==column.type.toUpperCase())gaps.push('type '+table+'.'+column.name);
   }
  }
  const indexes=new Set(remote.filter(r=>r.type==='index').map(r=>r.name));
  for(const row of expected.prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all())if(!indexes.has(row.name))gaps.push('index '+row.name);
  return gaps;
 } finally {expected.close();actual.close();}
}
