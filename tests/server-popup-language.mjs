import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';import {build} from 'esbuild';
const dir=await fs.mkdtemp('/tmp/lore-server-popup-locales-');
try {
 await build({stdin:{contents:`export {localizeServerMsg} from './client/src/net/serverMsg';export {setLang} from './client/src/i18n';export {api} from './client/src/net/api';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/api.mjs',logLevel:'silent'});
 const {localizeServerMsg,setLang,api}=await import(dir+'/api.mjs');const codes=new Set(['starter not offered today','daily starter limit reached','request timed out']);
 const literals=n=>ts.isStringLiteralLike(n)?[n.text]:ts.isConditionalExpression(n)?[...literals(n.whenTrue),...literals(n.whenFalse)]:[];
 async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await scan(path);else if(path.endsWith('.ts')){const tree=ts.createSourceFile(path,await fs.readFile(path,'utf8'),99,true);const visit=n=>{if(ts.isPropertyAssignment(n)&&n.name.getText(tree)==='error')for(const code of literals(n.initializer))codes.add(code);ts.forEachChild(n,visit);};visit(tree);}}}
 await scan('server/src');let count=0;
 for(const lang of ['ja','ko','en']){setLang(lang);const fallback=localizeServerMsg('unknown error');
  for(const code of codes){const text=localizeServerMsg(code);assert.notEqual(text,fallback,`Missing localized server error: ${code}`);assert(!(lang==='en'?/[가-힣ぁ-んァ-ヶ一-龯]/:lang==='ja'?/[가-힣]/:/[ぁ-んァ-ヶ一-龯]/).test(text),`${lang}: ${code} => ${text}`);count++;}
  assert.equal(localizeServerMsg('새로운 서버 오류'),fallback);
  globalThis.fetch=async()=>({ok:false,status:400,json:async()=>({error:'未所持の商品です'})});await assert.rejects(api.me({strict:true}),e=>e.message===localizeServerMsg('未所持の商品です'));
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(api.me({strict:true}),e=>e.message===localizeServerMsg('network unavailable'));
 }
 console.log(`PASS ${count} server error translations; real API error and network failure in JA/KO/EN`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
