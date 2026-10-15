const fs=require('fs'),assert=require('assert/strict'),C=require(process.env.BOT_MODULE),P=require(process.env.BOT_BASELINE);
const states=[];
for(let seed=0;seed<6;seed++){
 let g=C.createGame({mode:'bot',seed:841001+seed,starting:seed%2,p0:{id:'a',name:'A',deck:C.BOT_HELL_DECKS[seed%3].cards},p1:{id:'b',name:'B',deck:C.BOT_ELITE_DECKS[(seed+1)%3].cards}}).state;
 for(let i=0;i<80&&!g.over;i++){if([3,17,39,65].includes(i))states.push(g);g=C.reduce(g,C.safeGreedy(g)).state;}
}
states.push(JSON.parse(fs.readFileSync('tests/fixtures/bot-tactical-heavy.json')));
const rows=[];
for(const [i,g]of states.entries())for(const tier of ['hard','hell']){
 const old=P.botDecide(g,tier),now=C.botDecide(g,tier);assert.deepEqual(now,old,`case ${i} ${tier}`);rows.push({i,tier,turn:g.turn,action:now});
 if(process.env.BOT_PROGRESS)fs.writeFileSync(process.env.BOT_PROGRESS,JSON.stringify({completed:rows.length,planned:states.length*2}));
}
fs.writeFileSync(process.env.BOT_CONFORMANCE_OUT,JSON.stringify({cases:rows.length,actionParity:true,scope:'Representative states only; not exhaustive policy equivalence. Release also rejects proof paths drawing from sampled own deck.',rows},null,2));console.log(rows.length+' cases match');
