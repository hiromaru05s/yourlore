const {C,decks}=require('./sim.cjs'),fs=require('fs');
const dir='/tmp/lore-card-audit-20261026';const jobs=[];let serial=0;
function add(x){jobs.push({job:serial++,...x});}
// Six varied seven-card backgrounds, balanced opponents, paired seats and 16 seeds per background.
const names=['rally','mixed','control','ghost','elf','rift'];
for(let b=0;b<names.length;b++)for(let r=0;r<16;r++)for(const seat of [0,1])for(const id of C.DECK_POOL){
 const base=decks[names[b]].slice(0,7);add({experiment:'starter',cardId:id,bg:names[b],deck:[...base,id],other:decks[names[(b+1+r)%names.length]],seed:6261000+b*1000+r,seat,market:Object.keys(require('./sim.cjs').markets)[r%4],coverage:r%2===1});
}
fs.writeFileSync(dir+'/starter-plan.json',JSON.stringify(jobs));jobs.length=0;
for(const [name,deck] of Object.entries(decks))for(const noBuy of [false,true])for(let r=0;r<24;r++)for(const seat of [0,1])add({experiment:'deck',name,deck,other:decks[names[r%names.length]],opponent:names[r%names.length],seed:6269000+r,seat,market:Object.keys(require('./sim.cjs').markets)[r%4],noBuy,coverage:r%2===1});
fs.writeFileSync(dir+'/deck-plan.json',JSON.stringify(jobs));jobs.length=0;
for(const card of C.BUYABLE_POOL)for(let r=0;r<24;r++)for(const seat of [0,1])for(const priority of [false,true])add({experiment:'market',card,priority,deck:decks[names[r%6]],other:decks[names[(r+1)%6]],seed:6271000+r,seat,market:'natural',coverage:r%2===1});
fs.writeFileSync(dir+'/market-plan.json',JSON.stringify(jobs));console.log('plans: starter',44*6*16*2,'deck',Object.keys(decks).length*2*24*2,'market',C.BUYABLE_POOL.length*24*2*2);
