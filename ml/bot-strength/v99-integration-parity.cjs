const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),ts=require('typescript'),{createHash}=require('node:crypto');
const [beforePath,afterPath,out]=process.argv.slice(2);assert(beforePath&&afterPath&&out);
const before=require(beforePath),after=require(afterPath),ref='ceb99a3daa18ccef9031c39b35e23e8c790668b9';
const parse=(name,source)=>ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),printer=ts.createPrinter({removeComments:true});
const oldSource=parse('engine.ts',execFileSync('git',['show',ref+':client/src/shared/engine.ts'],{encoding:'utf8',maxBuffer:8e6}));
const moved=parse('cardStats.ts',fs.readFileSync('client/src/shared/cardStats.ts','utf8')),engine=parse('engine.ts',fs.readFileSync('client/src/shared/engine.ts','utf8'));
const declarations=file=>{const result=new Map();for(const n of file.statements){if(ts.isFunctionDeclaration(n)&&n.name)result.set(n.name.text,{signature:n.parameters.map(p=>printer.printNode(ts.EmitHint.Unspecified,p,file)),body:n.body&&printer.printNode(ts.EmitHint.Unspecified,n.body,file)});if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer)result.set(d.name.text,printer.printNode(ts.EmitHint.Unspecified,d.initializer,file));}return result;};
const original=declarations(oldSource),extracted=declarations(moved),remaining=declarations(engine);
for(const [name,body] of extracted)assert.deepEqual(body,original.get(name),'extracted '+name);
for(const [name,body] of original)if(!extracted.has(name))assert.deepEqual(remaining.get(name),body,'unchanged engine '+name);
const snapshots=[],rosters=[...before.BOT_HELL_DECKS,...before.botNpc('normal').decks];let g,steps=0,game=0;
while(steps<1200){
 if(!g||g.over){const opts={seed:194000+game,mode:'bot',mulligan:true,starting:game%2,p0:{id:'a',name:'A',deck:rosters[game%rosters.length].cards},p1:{id:'b',name:'B',deck:rosters[(game+3)%rosters.length].cards}};g=before.createGame(opts).state;assert.deepEqual(after.createGame(opts).state,g);for(const side of [0,1]){const a=before.botOpeningHand(g,side);assert.deepEqual(after.reduce(g,a),before.reduce(g,a));g=before.reduce(g,a).state;}game++;}
 if(snapshots.length<12&&g.turn<=10&&steps%13===0)snapshots.push(structuredClone(g));
 const action=before.safeGreedy(g),oldResult=before.reduce(g,action),newResult=after.reduce(g,action);assert.deepEqual(newResult,oldResult,'reducer step '+steps);g=oldResult.state;steps++;
}
let decisions=0;for(const state of snapshots)for(const tier of ['normal','hard']){assert.deepEqual(after.botDecide(state,tier),before.botDecide(state,tier),'decision '+decisions);decisions++;}
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result={scope:'Identical extracted function bodies/initializers and remaining engine declarations; reachable-state reducer and bot-decision differential checks, not a new strength tournament',ref,integratedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),beforeSHA256:hash(beforePath),afterSHA256:hash(afterPath),extractedDeclarations:[...extracted.keys()],unchangedEngineDeclarations:original.size-extracted.size,reducerTransitions:steps,games:game,decisions};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
