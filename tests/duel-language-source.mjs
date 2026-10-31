import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';
const dir=await fs.mkdtemp('/tmp/lore-language-source-');
try {
 await build({stdin:{contents:`export {logToEn} from './client/src/shared/logEn';export * from './client/src/shared/pendingText';`,resolveDir:process.cwd()},outfile:dir+'/text.mjs',bundle:true,platform:'node',format:'esm',logLevel:'silent'});
 const {logToEn,CHOICE_TEXT,DYNAMIC_CHOICE_REASONS}=await import(dir+'/text.mjs');
 const source=await fs.readFile('client/src/shared/engine.ts','utf8'),tree=ts.createSourceFile('engine.ts',source,ts.ScriptTarget.Latest,true);let messages=0;const reasons=new Set();
 function texts(n){if(!n)return[];if(ts.isStringLiteralLike(n))return[n.text];if(ts.isTemplateExpression(n))return[n.head.text+n.templateSpans.map(p=>'1'+p.literal.text).join('')];if(ts.isConditionalExpression(n))return[...texts(n.whenTrue),...texts(n.whenFalse)];return[];}
 function visit(n){
  if(ts.isCallExpression(n)&&['ctx.log','log','questCtx.log','reason'].includes(n.expression.getText(tree))){
   for(const [idx,lang]of [[0,'ko'],[1,'ja'],[2,'en']]){let values=texts(n.arguments[idx]);if(lang==='en'&&!n.arguments[2])values=texts(n.arguments[0]).map(logToEn);for(const value of values){assert(!(lang==='ko'?/[ぁ-んァ-ヶ一-龯]/:lang==='ja'?/[가-힣]/:/[가-힣ぁ-んァ-ヶ一-龯]/).test(value),`${lang}: ${value}`);messages++;}}
  }
  if(ts.isPropertyAssignment(n)&&n.name.getText(tree)==='reason'&&ts.isStringLiteralLike(n.initializer)){if(n.initializer.text)reasons.add(n.initializer.text);}
  if(ts.isCallExpression(n)&&['offerEffectChoice','queueExpansionChoice'].includes(n.expression.getText(tree)))for(const value of texts(n.arguments[n.expression.getText(tree)==='offerEffectChoice'?3:2])){if(value)reasons.add(value)};
  ts.forEachChild(n,visit);
 }
 visit(tree);
 for(const reason of reasons)assert(reason in CHOICE_TEXT||DYNAMIC_CHOICE_REASONS.includes(reason)||reason==='RIFT_TRIGGER',`Missing choice locale: ${reason}`);
 for(const file of ['client/src/game/controller.ts','client/src/ui/boardView.ts'])assert(!/logToEn\([^)]*pending\.hint/.test(await fs.readFile(file,'utf8')),'Choice instructions must not use log translation');
 console.log(`PASS ${messages} static engine message variants; ${reasons.size} directly declared choice reasons have independent locale copy`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
