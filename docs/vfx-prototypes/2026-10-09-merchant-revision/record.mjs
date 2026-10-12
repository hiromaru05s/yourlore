const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/lore-target-browser-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname.replace(/\/$/,'');
const b=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1440,height:1600},deviceScaleFactor:1});
await p.addInitScript(()=>{const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...args){if(args[0]===this.context.destination){window.captureAudio??=this.context.createMediaStreamDestination();connect.call(this,window.captureAudio);}return connect.apply(this,args);};});
await p.goto('http://127.0.0.1:55143/merchant-six.html?capture');await p.waitForFunction(()=>window.merchantLab?.ready,null,{timeout:90000});
await p.click('#play');await p.waitForFunction(()=>merchantLab.state.audio.loaded&&window.captureAudio);await p.click('#reset');
for(const id of ['MERCH1','MERCH2','DARK_MERCHANT']){
 await p.evaluate(id=>{merchantLab.setCard(id);merchantLab.seek(0,0);},id);
 const result=await p.evaluate(async id=>{
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1200;const c=canvas.getContext('2d');const dark=id==='DARK_MERCHANT',total=dark?7100:3600;
  const stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...window.captureAudio.stream.getAudioTracks()]);const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:6500000});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);let raf=0,frames=0;const times=[];let prev=performance.now();
  function draw(){const now=performance.now();times.push(now-prev);prev=now;frames++;c.fillStyle=dark?'#100e17':'#eeeae2';c.fillRect(0,0,1440,1200);c.fillStyle=dark?'#dfd0ae':'#393329';c.font='26px sans-serif';c.fillText((id==='MERCH1'?'見習い商人 · 2枚':id==='MERCH2'?'王都の商売人 · 6枚':'闇商人 · 拡大プレイ演出')+' / 4案比較',30,42);c.font='16px sans-serif';c.fillText('音声：01のコイン音　｜　各案の音はブラウザで個別再生できます',30,71);
   document.querySelectorAll('[data-v]').forEach((source,i)=>{const x=(i%2)*720,y=95+Math.floor(i/2)*540;const ratio=Math.min(690/source.width,485/source.height);c.drawImage(source,x+(720-source.width*ratio)/2,y+26,source.width*ratio,source.height*ratio);c.fillStyle=dark?'#ddc594':'#685537';c.font='22px sans-serif';c.fillText('0'+(i+1)+'  '+document.querySelector(`[data-name="${i}"]`).textContent,x+25,y+23);});c.font='18px sans-serif';c.fillText((merchantLab.state.ms/1000).toFixed(2)+'s',1350,1180);raf=requestAnimationFrame(draw);
  }
  draw();rec.start();await merchantLab.play();await new Promise(r=>setTimeout(r,total));merchantLab.pause();cancelAnimationFrame(raf);rec.stop();await done;stream.getVideoTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'});const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));times.sort((a,b)=>a-b);return{base64:btoa(binary),frames,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],audio:merchantLab.state.audio};
 },id);
 await fs.writeFile(out+'/'+id+'-continuous.webm',Buffer.from(result.base64,'base64'));delete result.base64;await fs.writeFile(out+'/'+id+'-capture.json',JSON.stringify(result,null,2));console.log(id,result);
}
await b.close();
