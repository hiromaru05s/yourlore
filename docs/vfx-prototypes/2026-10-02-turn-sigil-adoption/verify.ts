import {draw as approved} from './references/2026-10-02-sigil-exit-two/render';
import {drawTurnSigil} from '../../../client/src/ui/turnSigil';
const a=document.createElement('canvas'),b=document.createElement('canvas');document.body.append(a,b);
const failures:unknown[]=[];let checks=0;
for(const width of [350,1168])for(const height of [280,720])for(const side of ['me','opp'] as const)for(const time of [0,1,90,240,420,800,1499,1500,1501,1600,1750,1900,2100,2250,2319,2320]){
 a.style.cssText=b.style.cssText=`width:${width}px;height:${height}px;display:block`;
 approved(a,'recall',side,time,{background:'none'});
 drawTurnSigil(b,side,time,{title:side==='me'?'あなたのターンです':'相手のターンです',subtitle:side==='me'?'YOUR TURN  ·  06':'OPPONENT’S TURN  ·  06'});
 const x=a.getContext('2d')!.getImageData(0,0,a.width,a.height).data,y=b.getContext('2d')!.getImageData(0,0,b.width,b.height).data;
 let mismatch=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])mismatch++;checks++;if(mismatch)failures.push({width,height,side,time,mismatch});
}
a.remove();b.remove();document.getElementById('result')!.textContent=JSON.stringify({status:failures.length?'FAIL':'PASS',checks,failures},null,2);
