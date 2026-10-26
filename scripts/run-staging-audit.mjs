import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.env.LORE_BACKEND_STAGING_OUT)throw Error('Set LORE_BACKEND_STAGING_OUT to the audit report path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lore-live-staging-'));
const env={...process.env,LORE_BACKEND_AUTH_FILE:path.join(dir,'auth.json')};
const run=args=>{const r=spawnSync(process.execPath,args,{env,stdio:'inherit',timeout:600000});if(r.status!==0)throw Error(args[0]+' failed; see the check output');};
try{
 run(['scripts/check-db-schema.mjs','staging']);
 run(['scripts/staging-audit-fixtures.mjs','setup']);
 run(['tests/backend-staging-audit.mjs']);
}finally{
 if(fs.existsSync(env.LORE_BACKEND_AUTH_FILE)){
  try{run(['scripts/staging-audit-fixtures.mjs','cleanup']);}
  catch(error){console.error('Cleanup recovery file retained at '+env.LORE_BACKEND_AUTH_FILE);throw error;}
 }
 fs.rmSync(dir,{recursive:true,force:true});
}
