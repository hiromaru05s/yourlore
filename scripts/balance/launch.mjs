import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [,,plan,out,count='6']=process.argv;
fs.mkdirSync(out,{recursive:true});
if(fs.readdirSync(out).some(name=>/^games-.*\.jsonl(?:\.gz)?$/.test(name)))throw Error('Result directory must be empty: '+out);
const children=Array.from({length:+count},(_,i)=>new Promise((resolve,reject)=>{
  const log=fs.openSync(`${out}/worker-${i}.log`,'w');
  const child=spawn(process.execPath,['scripts/balance/run.mjs','worker',plan,`${out}/games-${i}.jsonl`,String(i),count],{stdio:['ignore',log,log]});
  child.on('exit',code=>{fs.closeSync(log);code===0?resolve(i):reject(Error(`worker ${i}: ${code}`));});
}));
await Promise.all(children);console.log('All workers completed.');
