import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// Run each archived plan into a separate directory so the analyzer can combine
// them without duplicating observations. Output folders must start empty.
const [,,root,workers='6',...names]=process.argv;
if(!root||!names.length)throw Error('Usage: node scripts/balance/suite.mjs ROOT WORKERS PLAN_NAME...');
for(const name of names){
 const plan=name==='main'?'plan':`${name}-plan`,out=path.join(root,'raw',name);
 if(fs.existsSync(out)&&fs.readdirSync(out).some(x=>x.startsWith('games-')))throw Error(`Existing results: ${out}`);
 console.log(`Starting ${name}`);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/balance/launch.mjs',path.join(root,plan+'.json'),out,workers],{stdio:'inherit',env:{...process.env,BALANCE_FAST_CLONE:'1'}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${name}: ${code}`)));});
}
