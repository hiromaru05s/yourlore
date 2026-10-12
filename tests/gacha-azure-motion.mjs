import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const moduleUrl=name=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(`client/src/ui/gachaAzure/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace("'./kinematics'",JSON.stringify(name==='kinematics'?'':moduleUrl('kinematics')))).toString('base64');
const load=async name=>import(moduleUrl(name));
const {bookmarkPoint,flightPoint,flightRotation,leafPoint,coverAngle,leafAngle}=await load('kinematics');
const {DURATION,storyTime,playbackTime}=await load('timing');
for(let frame=0;frame<=1000;frame++){
 const open=frame/1000,tip=bookmarkPoint(1,open,8);
 assert(Object.values(bookmarkPoint(0,open,8)).every(v=>Math.abs(v)<1e-12),'Ribbon remains sewn to the head');
 if(open<=.30)assert(tip.y+1.57 < -1.8,'Ribbon must remain hanging during initial page opening');
 if(frame){const prior=bookmarkPoint(1,open-.001,8);assert(Math.hypot(tip.x-prior.x,tip.y-prior.y,tip.z-prior.z)<.008,'No ribbon teleport');}
 for(let i=0;i<8;i++){assert(leafAngle(open,i)<=coverAngle(open)+1e-8,'A leaf cannot cross the front cover');for(const u of [0,.5,1])assert(Object.values(leafPoint(open,i,u,.5)).every(Number.isFinite));}
 const p=flightPoint(open,0);assert(Object.values(flightRotation(open,0)).every(Number.isFinite));if(open>=.65)assert(Math.abs(p.x)<1e-8,'Arrival stays centered');
}
for(let n=0;n<=1000;n++){const q=bookmarkPoint(n/1000,1,19);assert(q.y+1.57>=-1.5,'Final ribbon stays above lower cover edge');if(n>=200)assert(q.z-.16<-.323,'Final ribbon stays behind the back board');}
assert.equal(DURATION,17.95);
assert(Math.abs(storyTime(1.95)-3)<1e-8,'The loose 1.5–3 second interval remains shortened');
for(const t of [0,1.5,1.7,1.95,6.4,10.35,DURATION])assert(Math.abs(playbackTime(storyTime(t))-t)<.0001);
console.log('PASS Azure Wake: continuous attached ribbon, visible early opening, tucked final state, cover/page order, centered arrival, compressed timing');
