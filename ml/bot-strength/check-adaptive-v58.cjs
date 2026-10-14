const fs=require('fs'),assert=require('assert/strict'),{createHash}=require('crypto');
const [beforePath,frozenPath,finalPath,out]=process.argv.slice(2);if(!out||fs.existsSync(out))throw Error('3 bundles and fresh output required');
const B=require(beforePath),F=require(frozenPath),C=require(finalPath);const hash=x=>createHash('sha256').update(x).digest('hex');
const definitions=m=>JSON.stringify({balance:m.BALANCE_VERSION,DB:m.DB,STARTERS:m.STARTERS,DECK_POOL:m.DECK_POOL,BUYABLE_POOL:m.BUYABLE_POOL});
assert.equal(definitions(B),definitions(C));assert.equal(definitions(F),definitions(C));
let g=C.createGame({mode:'bot',seed:992100,starting:0,p0:{id:'a',name:'a',deck:C.BOT_HELL_DECKS[0].cards},p1:{id:'b',name:'b',deck:C.BOT_HELL_DECKS[4].cards}}).state;
let positions=0,purchases=0,searches=0;
for(let i=0;i<1200;i++){
 const side=C.actingSide(g),view=C.observationSample(g,side,0);assert.deepEqual(view,F.observationSample(g,side,0));
 const p=view.players[view.cur];const final=C.purchaseEvaluator(view,p),frozen=F.purchaseEvaluator(view,p);
 for(const c of [...view.market,...p.supply].filter(Boolean)){assert.deepEqual(final(c),frozen(c));purchases++;}
 assert.equal(C.refreshValue(view,p),F.refreshValue(view,p));
 const a=C.safeGreedy(view);assert.deepEqual(a,F.safeGreedy(view));positions++;
 if(i%60===0){for(const tier of ['hard','hell']){assert.deepEqual(C.botDecide(g,tier),F.botDecide(g,tier));searches++;}}
 const legal=C.legalBotAction(g,a,view),next=C.reduce(g,legal).state;assert.deepEqual(next,F.reduce(g,legal).state,'Presentation integration must preserve game state');g=next;
 if(g.over)g=C.createGame({mode:'bot',seed:992100+i,starting:i%2,p0:{id:'a',name:'a',deck:C.BOT_HELL_DECKS[i%7].cards},p1:{id:'b',name:'b',deck:C.BOT_HELL_DECKS[(i+3)%7].cards}}).state;
}
const result={cards:Object.keys(C.DB).length,balance:C.BALANCE_VERSION,definitionsSHA256:hash(definitions(C)),cardDefinitionsAndPoolsUnchanged:true,positions,purchases,searches,matchingDefaultPolicy:true,reducerStateParity:true,modules:{baseline:hash(fs.readFileSync(beforePath)),evaluated:hash(fs.readFileSync(frozenPath)),final:hash(fs.readFileSync(finalPath))}};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(result);
