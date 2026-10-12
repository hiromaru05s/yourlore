const fs=require('fs'),path=require('path'),root=path.resolve(process.env.BOT_LAB||'.bot-strength-v2'),C=require(process.env.BOT_MODULE||path.join(root,'candidate.cjs'));const initial=JSON.parse(fs.readFileSync('ml/bot-strength/builds.json')),evolved=JSON.parse(fs.readFileSync(root+'/evolution.json')).scores;process.chdir(root);
const decks=[...Object.values(initial),...C.BOT_ELITE_DECKS.map(x=>x.cards),...evolved.map(x=>x.cards)],X=[],Y=[],V=[];let seed=90831;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
let invalid=0;const start=Date.now();
for(let i=0;i<8000;i++){
 const da=decks[Math.floor(rnd()*decks.length)],db=decks[Math.floor(rnd()*decks.length)];
 let g=C.createGame({mode:'bot',seed:6100000+i,starting:i%2,p0:{id:'a',name:'a',deck:da},p1:{id:'b',name:'b',deck:db}}).state,records=[];
 for(let step=0;!g.over&&step<1000;step++){
  if(!g.pending&&step%5===0)records.push(C.valueFeatures(g,0));
  let {action,state}=C.greedyStep(g);
  if(rnd()<.08){const actions=C.botActions(g);const a=actions[Math.floor(rnd()*actions.length)],n=C.reduce(g,a).state;if(C.actionChangesState(g,n)){action=a;state=n;}}
  if(!C.actionChangesState(g,state))break;g=state;
 }
 if(!g.over){invalid++;continue;}
 for(const x of records){X.push(x);Y.push(g.winner == null ? 0.5 :g.winner===0?1:0);V.push(Math.floor(i/2)%10===0);}
 if((i+1)%500===0)console.error(JSON.stringify({games:i+1,invalid,samples:X.length,seconds:(Date.now()-start)/1000}));
}
const F=X[0].length,scale=Array(F).fill(0),weights=Array(F).fill(0),grad2=Array(F).fill(.01);let n=0;
for(let i=0;i<X.length;i++)if(!V[i]){n++;for(let j=0;j<F;j++)scale[j]+=X[i][j]**2;}
for(let j=0;j<F;j++)scale[j]=Math.sqrt(scale[j]/n)||1;
for(let i=0;i<X.length;i++)for(let j=0;j<F;j++)X[i][j]/=scale[j];
const ids=Array.from({length:X.length},(_,i)=>i).filter(i=>!V[i]);
for(let epoch=0;epoch<35;epoch++){
 for(let k=ids.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[ids[k],ids[j]]=[ids[j],ids[k]];}
 for(const i of ids){const x=X[i],z=x.reduce((s,v,j)=>s+v*weights[j],0),err=1/(1+Math.exp(-z))-Y[i];for(let j=0;j<F;j++){const grad=err*x[j]+.0005*weights[j];grad2[j]+=grad*grad;weights[j]-=.08*grad/Math.sqrt(grad2[j]);}}
}
const metric=(validation)=>{let loss=0,correct=0,n=0;for(let i=0;i<X.length;i++)if(V[i]===validation){const z=X[i].reduce((s,v,j)=>s+v*weights[j],0),p=1/(1+Math.exp(-z));loss+=-Y[i]*Math.log(Math.max(1e-9,p))-(1-Y[i])*Math.log(Math.max(1e-9,1-p));correct+=(p>=.5)===(Y[i]>=.5);n++;}return{n,loss:loss/n,accuracy:correct/n};};
const result={games:8000,invalid,samples:X.length,seedBase:6100000,features:F,weights,scale,train:metric(false),validation:metric(true),seconds:(Date.now()-start)/1000};fs.writeFileSync('./results/value-training-v2.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
