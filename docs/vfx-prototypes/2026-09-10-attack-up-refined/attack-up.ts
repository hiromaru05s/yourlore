import * as T from 'three';
import {boardLens,layoutRect} from '../../../client/src/ui/boardProjection';
import {createStatRiseVisual} from '../../../client/src/ui/statRiseVisual';

const DURATION=2.8;


/** No labels, no numbers, no stat mutation. All positions use the actual board lens. */
export function mountAttackUp(initial:HTMLElement){
const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.domElement.className='vfx-layer';renderer.domElement.setAttribute('aria-hidden','true');document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),visual=createStatRiseVisual(),group=visual.group;scene.add(group);
const slider=document.querySelector<HTMLInputElement>('#vfx-seek')!,phaseLabel=document.querySelector('#vfx-phase')!,slow=document.querySelector<HTMLInputElement>('#vfx-slow')!,loop=document.querySelector<HTMLInputElement>('#vfx-loop')!,sound=document.querySelector<HTMLInputElement>('#vfx-sound')!,pauseButton=document.querySelector('#vfx-pause')!;
let target=initial,age=0,playing=false,last=performance.now(),frame=0,w=0,h=0,dead=false;let audioCtx:AudioContext|undefined;
function playSound(){if(!sound.checked)return;audioCtx??=new AudioContext();void audioCtx.resume();const now=audioCtx.currentTime;const master=audioCtx.createGain();master.gain.value=.08;master.connect(audioCtx.destination);for(const [i,freq] of [440,660,990].entries()){const o=audioCtx.createOscillator(),gain=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq*.72,now);o.frequency.exponentialRampToValueAtTime(freq,now+.28);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.22/(i+1),now+.22+i*.055);gain.gain.exponentialRampToValueAtTime(.0001,now+1.1+i*.12);o.connect(gain);gain.connect(master);o.start(now);o.stop(now+1.6);}const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.5,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.sin(i/data.length*Math.PI);const n=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();n.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(500,now);filter.frequency.exponentialRampToValueAtTime(3000,now+.4);g.gain.value=.18;n.connect(filter);filter.connect(g);g.connect(master);n.start(now);}
function setTarget(el:HTMLElement){target=el;age=0;renderer.domElement.dataset.target=el.dataset.uid||'';}
function play(){age=0;playing=true;last=performance.now();pauseButton.textContent='停止';playSound();}
function render(){
if(!target.isConnected){renderer.clear();return;}
if(w!==innerWidth||h!==innerHeight){w=innerWidth;h=innerHeight;renderer.setSize(w,h);const {focal,angle}=boardLens(w,h);camera.fov=T.MathUtils.radToDeg(2*Math.atan(h/(2*focal)));camera.aspect=w/h;camera.near=focal*.25;camera.far=focal*3;camera.position.set(0,focal*Math.cos(angle),focal*Math.sin(angle));camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
const r=layoutRect(target),unit=r.width;group.position.set(r.left+r.width/2-w/2,0,r.top+r.height/2-h/2);group.scale.setScalar(unit);
visual.update(age,camera);
phaseLabel.textContent=age<.2?'集束':age<.4?'解放':age<1.2?'上昇':age<2.2?'余韻':'完了';slider.value=String(Math.min(DURATION,age));renderer.domElement.dataset.time=age.toFixed(3);renderer.domElement.dataset.numericOverlay='none';renderer.render(scene,camera);
}
function tick(now:number){if(dead)return;const dt=Math.min((now-last)/1000,.08);last=now;if(playing&&!document.hidden){age+=dt*(slow.checked?.25:1);if(age>DURATION){age=DURATION;if(loop.checked)age=0;else{playing=false;pauseButton.textContent='再開';}}}render();frame=requestAnimationFrame(tick);}
const stop=()=>{playing=!playing;last=performance.now();pauseButton.textContent=playing?'停止':'再開';};const seek=()=>{playing=false;age=Number(slider.value);pauseButton.textContent='再開';render();};
document.querySelector('#vfx-play')!.addEventListener('click',play);pauseButton.addEventListener('click',stop);slider.addEventListener('input',seek);setTarget(initial);frame=requestAnimationFrame(tick);
return {play,setTarget,dispose(){dead=true;cancelAnimationFrame(frame);document.querySelector('#vfx-play')?.removeEventListener('click',play);pauseButton.removeEventListener('click',stop);slider.removeEventListener('input',seek);visual.dispose();renderer.dispose();renderer.domElement.remove();void audioCtx?.close();}};
}
