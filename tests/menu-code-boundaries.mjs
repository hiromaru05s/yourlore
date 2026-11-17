import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
// Follow emitted static imports only: type imports and deferred effects are not
// part of menu admission. Prevent a helper from pulling the reducer back in.
const seen=new Set();
async function visit(file,chain=[]){
 if(seen.has(file))return;seen.add(file);
 assert(!file.endsWith('/shared/engine.ts'),chain.concat(file).join(' -> '));
 const source=await fs.readFile(file,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const ast=ts.createSourceFile(file,js,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
 for(const n of ast.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier){
  const id=n.moduleSpecifier.text;
  if(!id.startsWith('.')||/\.(css|webp|png|svg|mp3)(\?|$)/.test(id))continue;
  const resolved=path.resolve(path.dirname(file),id)+(/\.ts$/.test(id)?'':'.ts');
  await visit(resolved,chain.concat(file));
 }
}
await visit(path.resolve('client/src/main.ts'));
console.log('PASS menu static graph excludes the action reducer; checked '+seen.size+' modules');
