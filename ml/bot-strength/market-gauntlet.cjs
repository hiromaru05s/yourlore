// Controlled-market paired-seat regression. Both policies face the same opponent
// that deliberately acquires recovery. This is not an estimate of human win rate.
const fs=require('fs'),{createHash}=require('crypto');
if(!process.env.CANDIDATE||!process.env.BASELINE||!process.env.OUT)throw Error('Set CANDIDATE, BASELINE and a fresh OUT file');
const C=require(process.env.CANDIDATE),B=require(process.env.BASELINE);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modules={candidate:sha(process.env.CANDIDATE),baseline:sha(process.env.BASELINE)};const mode=process.env.MODE||'greedy',samples=+(process.env.SAMPLES||4),out=process.env.OUT;
if(fs.existsSync(out))throw Error('Do not overwrite completed evidence');
if(!Number.isInteger(samples)||samples<1)throw Error('SAMPLES must be positive');
const offset=+(process.env.OFFSET||0);
const natural=process.env.NATURAL==='1';
const markets=natural?{natural:[]}:{priest:['PRIEST','WALLBREAK2','WORLD_HEART','DESERTIFICATION','ARMOR_BREAK','M2','S3'],highPriest:['HIGH_PRIEST','BLACKSMITH','IRON_WALL','WALLBREAK2','DESERTIFICATION','M2','S3'],control:['M2','S3','S1','RUNE1','ARMOR_BREAK','DESERTIFICATION','WALLBREAK2']};
const opponents=[['RIFT','RIFT','TRIAL_AREA','SELECTED_SHIELD','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH'],['WORLD_CARE','ELF_HAVEN','HALF_ELF','HALF_ELF','STARTER_TRASH','STARTER_TRASH','STARTER_CHEST','STARTER_CHEST']];
let rows=[];const t=Date.now();const obs=g=>C.observationSample(g,g.pending?.owner??g.cur,0);
function opponent(g){const p=g.players[g.cur];if(!g.pending){
 const priest=p.hand.findIndex(c=>c.aura==='shieldDew'&&C.playCost(c,p)<=p.mana);
 if(priest>=0){const a={type:'play',idx:priest};if(C.actionChangesState(g,C.reduce(g,a).state))return a;}
 const count=[...p.hand,...p.deck,...p.discard,...p.field].filter(x=>x.aura==='shieldDew').length;
 const i=g.market.findIndex(c=>c.aura==='shieldDew'&&C.purchaseAllowed(g,p,c)&&C.buyCost(p,c)<=p.mana&&count<2&&(count===0||p.field.some(m=>m.aura==='shieldDew')));
 if(i>=0)return {type:'buyMarket',i};
 }return C.greedyStep(obs(g)).action;}
for(const [market,ids] of Object.entries(markets))for(let d=0;d<opponents.length;d++)for(let seed=0;seed<samples;seed++)for(let seat=0;seat<2;seat++)for(const version of ['before','after']){
const decks=seat?[opponents[d],C.BOT_HELL_DECKS[seed%3].cards]:[C.BOT_HELL_DECKS[seed%3].cards,opponents[d]];let g=C.createGame({mode:'bot',seed:202610130+offset+seed,starting:0,p0:{id:'a',name:'a',deck:decks[0]},p1:{id:'b',name:'b',deck:decks[1]}}).state;if(!natural){g.market=ids.map((id,i)=>({...C.DB[id],uid:g.market[i].uid}));g.marketStock=ids.map(()=>3);}const initialMarket=g.market.map(c=>c.id);g.players[seat].botTune={minBuyEarly:6,minBuy:11,chestTurn:6};let buys=[],invalid=0,steps=0,ms=[];
for(;!g.over&&steps<1200&&g.turn<101;steps++){const s=g.pending?.owner??g.cur,t0=Date.now();let a=s!==seat?opponent(g):mode==='greedy'?(version==='after'?C:B).greedyStep(obs(g)).action:(version==='after'?C:B).botDecide(g,mode);if(s===seat)ms.push(Date.now()-t0);const n=C.reduce(g,a).state;if(!C.actionChangesState(g,n)){invalid++;break;}if(s===seat&&(a.type==='buyMarket'||a.type==='buySupply'))buys.push((a.type==='buyMarket'?g.market:g.players[s].supply)[a.i]?.id);g=n;}
const r={market,initialMarket,d,seed:offset+seed,seat,version,mode,winner:g.winner,result:g.over?(g.winner===seat?1:g.winner==null?.5:0):null,turn:g.turn,steps,invalid,buys,maxMs:Math.max(0,...ms)};rows.push(r);fs.writeFileSync(out,JSON.stringify({seconds:(Date.now()-t)/1000,modules,mode,samples,offset,natural,markets,opponents,rows},null,2));console.log(JSON.stringify({...r,buys:undefined}));}

if(rows.some(r=>r.invalid||r.result===null))process.exitCode=1;
