import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-critical-api-'));
let api;
try {
  await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';export {greedyDecide} from './client/src/shared/bot';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
  api=await import(path.join(dir,'engine.mjs'));
} finally {await rm(dir,{recursive:true,force:true});}
export const {DB,STARTERS,createGame,reduce,curHp,hasPassive,FIELD_MAX,effectChoices,greedyDecide,redactFor}=api;
