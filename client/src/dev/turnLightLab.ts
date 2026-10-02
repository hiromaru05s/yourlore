import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createTurnLights,TURN_LIGHTS} from './turnLightEffects';
import './turnLightLab.css';
if(import.meta.env.DEV)void mount();
async function mount(){
 const root=document.getElementById('lab')!;
 root.innerHTML=`<header><div class="eyebrow">LORE / INTERACTION STUDIES · 01—03</div><h1>ターンを渡す、その光。</h1><p>面・刻印・ガラス。押せることを伝える、3つの仕上げ。</p></header><nav><button id="self" aria-pressed="true">自分のターン</button><button id="enemy">相手のターン</button><button id="blocked">操作不可</button><label>残り <input id="time" type="range" min="0" max="90" value="64"><output id="seconds">64秒</output></label><button id="play">一時停止</button><select id="speed" aria-label="再生速度"><option value="1">1倍速</option><option value="0.25">0.25倍速</option></select><button id="surface">暗い背景</button></nav><section class="studies">${TURN_LIGHTS.map((v,i)=>`<article data-id="${v.id}"><div class="study-head"><span>0${i+1}</span><h2>${v.name}</h2></div><div class="stage"><canvas aria-hidden="true"></canvas><button class="cap" aria-label="${v.name} ターン終了"><span>END<br>TURN</span></button><output class="timer">64</output><span class="state">YOUR TURN · タップ可能</span></div><p>${v.caption}</p><button class="board-link" data-variant="${v.id}">この案を実盤面で見る <span>↗</span></button></article>`).join('')}</section><section class="board-section"><div class="board-title"><h2 id="board-title">01 / 蒼白の磁器 — 実盤面</h2><a id="full" href="/duel-lab.html?polish&turnlight=porcelain" target="_blank">別タブで開く ↗</a></div><iframe title="実盤面で比較" src="/duel-lab.html?polish&turnlight=porcelain"></iframe></section><footer>ローカル比較用 / 実際のボタン・タイマーGLBを使用 / 上段は拡大、下段は既存の実盤面 / 光の採用は未確定</footer>`;
 let enemy=false,blocked=false,remaining=64,playing=true,elapsed=0,speed=1,dead=false,last=performance.now(),lastPaint=-Infinity;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const cleanup:(()=>void)[]=[];
 const views=await Promise.all(TURN_LIGHTS.map(async(v)=>{
  const article=root.querySelector<HTMLElement>(`[data-id=${v.id}]`)!,canvas=article.querySelector('canvas')!,cap=article.querySelector<HTMLButtonElement>('.cap')!;
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.AgXToneMapping;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-.09,.09,.08,-.08,.01,2);camera.position.set(0,.25,.12);camera.lookAt(0,0,0);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  const light=new T.DirectionalLight(0xffeed9,2.3);light.position.set(-.1,.3,.2);scene.add(light);const fill=new T.DirectionalLight(0xc4daff,.7);fill.position.set(.2,.2,-.1);scene.add(fill);
  const loader=new GLTFLoader();const [button,timer]=await Promise.all(['turn-button.glb','timer-inserts.glb'].map(n=>loader.loadAsync('/models/reading-board/v1/'+n)));
  const turn=button.scene;scene.add(turn,timer.scene);const segments:T.Mesh[]=[];timer.scene.traverse(o=>{if(o instanceof T.Mesh)segments.push(o);});
  // Preview housing follows the existing socket dimensions; the board below uses its authored furniture.
  const body=new T.Mesh(new T.CylinderGeometry(.065,.066,.009,96),new T.MeshStandardMaterial({color:0x263645,metalness:.65,roughness:.3}));body.position.y=-.001;scene.add(body);
  const rim=new T.Mesh(new T.TorusGeometry(.062,.0013,8,96),new T.MeshStandardMaterial({color:0xc6af82,metalness:.7,roughness:.28}));rim.rotation.x=Math.PI/2;rim.position.y=.005;scene.add(rim);
  const fx=createTurnLights(turn,segments,()=>v.id),movingCap=turn.getObjectByName('PRESS_CAP')!;
  let pressedAt=-10000,hover=false,press=false;
  cap.onpointerenter=()=>hover=true;cap.onpointerleave=()=>{hover=false;press=false;};cap.onpointerdown=()=>press=true;cap.onpointerup=()=>press=false;cap.onpointercancel=()=>press=false;
  cap.onclick=()=>{pressedAt=elapsed;enemy=true;blocked=false;updateDOM();};
  const resize=()=>{const stage=canvas.parentElement!,w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.left=-.08*w/h;camera.right=.08*w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement!);resize();
  cleanup.push(()=>{observer.disconnect();fx.dispose();const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());environment.dispose();renderer.dispose();});
  return {render(){const age=elapsed-pressedAt;const depression=reduced.matches?0:age<450?Math.sin(Math.min(1,age/450)*Math.PI)*.004:press?.003:0;movingCap.position.y=-depression;cap.style.setProperty('--press',`${depression*1500}px`);fx.update({now:elapsed,active:!enemy&&!blocked,enemy,remaining:remaining/90,hover:hover||document.activeElement===cap,pressed:press,reduced:reduced.matches});renderer.render(scene,camera);}};
 }));
 function updateDOM(){
  root.dataset.state=enemy?'enemy':blocked?'blocked':'self';
  root.querySelectorAll<HTMLButtonElement>('.cap').forEach(b=>{b.disabled=enemy||blocked;b.querySelector('span')!.innerHTML=enemy?'ENEMY<br>TURN':'END<br>TURN';});
  root.querySelectorAll('.state').forEach(e=>e.textContent=enemy?'ENEMY TURN · 待機':blocked?'操作不可 · 消灯':'YOUR TURN · タップ可能');
  root.querySelectorAll('.timer').forEach(e=>e.textContent=String(Math.ceil(remaining)));
  root.querySelector<HTMLOutputElement>('#seconds')!.value=`${Math.ceil(remaining)}秒`;
  for(const id of ['self','enemy','blocked'])root.querySelector('#'+id)!.setAttribute('aria-pressed',String(id===root.dataset.state));
 }
 root.querySelector<HTMLButtonElement>('#self')!.onclick=()=>{enemy=false;blocked=false;updateDOM();};
 root.querySelector<HTMLButtonElement>('#enemy')!.onclick=()=>{enemy=true;blocked=false;updateDOM();};
 root.querySelector<HTMLButtonElement>('#blocked')!.onclick=()=>{enemy=false;blocked=true;updateDOM();};
 root.querySelector<HTMLInputElement>('#time')!.oninput=e=>{remaining=Number((e.target as HTMLInputElement).value);updateDOM();};
 root.querySelector<HTMLButtonElement>('#play')!.onclick=e=>{playing=!playing;(e.target as HTMLButtonElement).textContent=playing?'一時停止':'再生';};
 root.querySelector<HTMLSelectElement>('#speed')!.onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
 root.querySelector<HTMLButtonElement>('#surface')!.onclick=e=>{root.classList.toggle('dark');(e.target as HTMLButtonElement).textContent=root.classList.contains('dark')?'白い背景':'暗い背景';};
 root.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>{const i=TURN_LIGHTS.findIndex(v=>v.id===b.dataset.variant),v=TURN_LIGHTS[i],url='/duel-lab.html?polish&turnlight='+v.id;root.querySelector('iframe')!.src=url;root.querySelector('#board-title')!.textContent=`0${i+1} / ${v.name} — 実盤面`;root.querySelector<HTMLAnchorElement>('#full')!.href=url;});
 updateDOM();root.dataset.ready='true';
 function frame(now:number){if(dead)return;const dt=Math.min(80,now-last);last=now;if(playing)elapsed+=dt*speed;if(now-lastPaint>=32){views.forEach(v=>v.render());lastPaint=now;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{dead=true;cleanup.forEach(fn=>fn());},{once:true});
}
