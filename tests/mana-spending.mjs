import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {createGame,reduce,DB}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for(const side of [0,1]){
  const g=createGame({mode:'online',seed:9,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  Object.assign(g,{cur:side,turn:4,phase:'main',pending:null});
  delete g.mulligan;
  const p=g.players[side],card={...DB.S12,uid:'payment'};
  Object.assign(p,{mana:6,maxMana:8,field:[],enchants:[],traps:[],hand:[card],refreshTokens:0,supply:[card,null,null]});
  g.market[0]=card;
  const refresh=reduce(g,{type:'refresh'});
  assert.deepEqual(refresh.events.filter(e=>e.type==='manaSpent'),[{type:'manaSpent',player:side,before:6,amount:1}]);
  p.refreshTokens=1;
  assert(!reduce(g,{type:'refresh'}).events.some(e=>e.type==='manaSpent'));
  for(const discount of [0,1,3]){
    p.enchants=Array.from({length:discount},(_,i)=>({card:{...DB.SHARED_MARKET,uid:'discount-'+i},turns:8}));
    for(const type of ['buyMarket','buySupply']){
      const result=reduce(g,{type,i:0});
      assert.equal(result.events.find(e=>e.type==='buy')?.paidMana,card.cost-discount);
      assert.equal(result.state.players[side].mana,6-card.cost+discount);
      assert(!result.events.some(e=>e.type==='manaSpent'),'purchase owns its entire payment');
    }
  }
  p.mana=0;p.enchants=[];
  assert(!reduce(g,{type:'buyMarket',i:0}).events.some(e=>e.type==='buy'||e.type==='manaSpent'));
}
console.log('PASS: actual payments, refresh tokens, both markets, discounted and free purchases, both players');
