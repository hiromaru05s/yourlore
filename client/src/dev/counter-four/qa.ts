import {Renderer,point} from './renderer';
import {scene,pose} from './motion';
import {attackPlan,attackPose} from '../../ui/attackVisual';
import {TOTAL,designs} from './catalog';
const upload=(name:string,body:BodyInit)=>fetch('/__counter-evidence/'+name,{method:'POST',body});
export async function run(renderer:Renderer,face:HTMLCanvasElement){
 const results:{name:string;ok:boolean;value?:unknown}[]=[];
 const check=(name:string,ok:boolean,value?:unknown)=>results.push({name,ok,value});
 const plan=attackPlan({left:100,top:400,width:90,height:140},{left:100,top:80,width:90,height:140});
 for(let v=0;v<4;v++){
  const before=pose(plan,v,699.99),after=attackPose(plan,180);check(`handoff-${v}`,Math.hypot(before.x-after.x,before.y-after.y)<.001&&Math.abs(before.turn-after.turn)<.001);
  for(const t of [0,100,260,400,590,700])for(const x of [-90,-30,0,30,90])for(const y of [-140,0,140]){const p=point(v,t,x,y);check(`finite-${v}-${t}-${x}-${y}`,Number.isFinite(p.x)&&Number.isFinite(p.y));}
  for(const t of [0,700]){const p=point(v,t,35,40);check(`restore-${v}-${t}`,Math.abs(p.x-35)<.001&&Math.abs(p.y-40)<.001);}
 }
 const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=700;const c=sheet.getContext('2d')!;c.fillStyle='#eeeae1';c.fillRect(0,0,1440,700);for(let v=0;v<4;v++){c.save();c.translate(v*360,50);scene(c,renderer,face,v,380,360,610,false,false,false);c.restore();c.fillStyle='#373d41';c.font='20px sans-serif';c.fillText(`0${v+1} ${designs[v].name}`,v*360+25,38);}await new Promise<void>(r=>sheet.toBlob(async b=>{if(b)await upload('comparison.png',b);r();}));
 const movie=document.createElement('canvas');movie.width=1440;movie.height=660;const mc=movie.getContext('2d')!,stream=movie.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000}),chunks:Blob[]=[];recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.start();const start=performance.now();let frames=0,max=0,total=0;
 await new Promise<void>(resolve=>{function tick(now:number){const elapsed=now-start,t=elapsed<4400?(elapsed%2200):((elapsed-4400)%4400)/2,begin=performance.now();mc.fillStyle='#eeeae1';mc.fillRect(0,0,1440,660);for(let v=0;v<4;v++){mc.save();mc.translate(v*360,50);scene(mc,renderer,face,v,Math.min(TOTAL,t),360,590,false,true,false);mc.restore();mc.fillStyle='#343b40';mc.font='20px sans-serif';mc.fillText(`0${v+1} ${designs[v].name}`,v*360+25,36);}const dt=performance.now()-begin;max=Math.max(max,dt);total+=dt;frames++;if(elapsed<8800)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
 recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());await upload('comparison-playback.webm',new Blob(chunks,{type:'video/webm'}));
 await upload('report.json',JSON.stringify({checks:results.length,failed:results.filter(x=>!x.ok),render:{frames,meanDrawMs:total/frames,maxDrawMs:max,note:'4-up CPU draw time, not GPU or device FPS'},time:Date.now()},null,2));
 const status=document.getElementById('status');if(status)status.textContent=`QA保存完了: ${results.length}項目、失敗${results.filter(x=>!x.ok).length}`;
}
