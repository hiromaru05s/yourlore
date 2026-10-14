const fs=require('fs');const input=process.argv[2],out=process.argv[3];if(!input||!out||fs.existsSync(out))throw Error('Input and fresh output required');
const data=JSON.parse(fs.readFileSync(input));const grouped=new Map();
for(const r of data.rows){const key=[r.name,r.tier,r.market,r.seed].join('/');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
const pairs=[];for(const rows of grouped.values()){
 if(rows.length!==4||rows.some(r=>!r.finished||r.invalid||r.result==null))throw Error('Incomplete or invalid paired trial');
 const keys=new Set(rows.map(r=>r.version+'/'+r.seat));if(keys.size!==4)throw Error('Duplicate pair legs');
 const score=version=>rows.filter(r=>r.version===version).reduce((n,r)=>n+r.result,0)/2;
 pairs.push({name:rows[0].name,tier:rows[0].tier,market:rows[0].market,seed:rows[0].seed,before:score('before'),after:score('after')});
}
let seed=129123;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
function summarize(p){const n=p.length,avg=key=>p.reduce((n,r)=>n+r[key],0)/Math.max(1,p.length);const boot=[];
 // All decks and both tiers with the same game seed share randomness. Keep
 // that whole cluster together instead of pretending those pairs independent.
 const clusters=[...new Set(p.map(r=>r.seed))].map(seed=>p.filter(r=>r.seed===seed));
 for(let i=0;i<5000&&clusters.length>1;i++){let sum=0,count=0;for(let j=0;j<clusters.length;j++){const cluster=clusters[Math.floor(rnd()*clusters.length)];for(const r of cluster){sum+=r.after-r.before;count++;}}boot.push(sum/count);}boot.sort((a,b)=>a-b);
 return {pairs:n,seedClusters:clusters.length,before:avg('before'),after:avg('after'),delta:avg('after')-avg('before'),pairedDelta95:boot.length?[boot[125],boot[4875]]:null,improved:p.filter(r=>r.after>r.before).length,worsened:p.filter(r=>r.after<r.before).length,tied:p.filter(r=>r.after===r.before).length};}
const slices={};for(const field of ['tier','market','name'])for(const value of new Set(pairs.map(p=>p[field])))slices[field+'/'+value]=summarize(pairs.filter(p=>p[field]===value));
const result={mode:data.mode,modules:data.modules,opponentTier:data.opponentTier,games:data.rows.length,invalid:data.rows.filter(r=>r.invalid||!r.finished).length,overall:summarize(pairs),slices,pairs};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,pairs:undefined},null,2));
