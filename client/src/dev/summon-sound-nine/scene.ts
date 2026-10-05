import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/duel-opening.css';import '../../styles/presentation.css';import '../../styles/reading-board.css';
import manifest from './assets/manifest.json';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB} from '../../shared/cards';
import type {Action,GameState,ReduceResult} from '../../shared/types';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {setLang} from '../../i18n';
import {initSound,warmSounds,setSfxVolume,stopSounds,soundUrls} from '../../ui/sound';
import {setFxSkip} from '../../ui/anim';
const files=import.meta.glob('./assets/*.mp3',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const clips=new Map<string,AudioBuffer>();
const decoder=new AudioContext();
const fingerprint=(b:AudioBuffer)=>{const x=b.getChannelData(0);let h=0;for(let i=0;i<128;i++)h=(h*31+Math.round(x[Math.floor(i*x.length/128)]*1e7))|0;return b.length+':'+h;};
let original='',selected='',mono=false,epoch=0,ready=false,pending:Promise<void>|undefined;
const post=(message:string,finished=false)=>parent.postMessage({kind:'summon-scene',ready,message,finished},location.origin);
const trace:Array<{selected:string;at:number;fingerprint:string;impactMs:number|null}>=[];
// Preview only: replace the exact summon buffer at the real controller's trigger.
// Other effects, animation timing, and the runtime source files stay unchanged.
const start=AudioBufferSourceNode.prototype.start;
const bufferProperty=Object.getOwnPropertyDescriptor(AudioBufferSourceNode.prototype,'buffer')!;
const substitutions=new WeakMap<AudioBufferSourceNode,string>();
Object.defineProperty(AudioBufferSourceNode.prototype,'buffer',{...bufferProperty,set(value:AudioBuffer|null){
 if(value&&original&&fingerprint(value)===original){
  const replacement=clips.get(selected);
  if(replacement){
   substitutions.set(this,selected);
   if(mono){const b=this.context.createBuffer(2,replacement.length,replacement.sampleRate);for(let i=0;i<b.length;i++){const v=(replacement.getChannelData(0)[i]+replacement.getChannelData(1)[i])*.5;b.getChannelData(0)[i]=v;b.getChannelData(1)[i]=v;}value=b;}else value=replacement;
  }
 }
 bufferProperty.set!.call(this,value);
}});
AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof start>){
 const id=substitutions.get(this);
 if(id&&this.buffer)trace.push({selected:id,at:performance.now(),fingerprint:fingerprint(this.buffer),impactMs:document.querySelector<HTMLElement>('.slate-summon')?Number(document.querySelector<HTMLElement>('.slate-summon')!.dataset.time):null});
 return start.apply(this,args);
};
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const style=document.createElement('style');style.textContent='body{overflow:hidden}.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(style);
class Harness extends BaseController{
 protected submit(_action:Action){}
 skip(){this.fastForward();}
 show(g:GameState){this.introShown=true;this.applyResult({state:g,events:[]},false);}
}
type PreviewApi={playEvents:(prev:GameState,res:ReduceResult)=>Promise<void>};
const controller=new Harness(document.querySelector('#app')!,0,{onHome(){},onRematch(){}});
const stopLayout=startBoardLayout();
function fixture(card='M2'){
 const g=createGame({mode:'online',seed:31,starting:0,p0:{id:'preview',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;
 g.turn=3;g.phase='main';g.cur=0;g.pending=null;
 for(const p of g.players){p.hand=[];p.field=[];p.traps=[];p.enchants=[];p.quests=[];p.mana=10;p.maxMana=10;p.hp=30;}
 g.players[0].hand=[{...DB[card],uid:'preview-summon'}];return g;
}
async function cancel(){epoch++;stopSounds();controller.skip();setFxSkip(true);await pending?.catch(()=>{});setFxSkip(false);}
async function play(id:string,card:string,volume:number,isMono:boolean,side:0|1){
 await cancel();const token=epoch;selected=id;mono=isMono;trace.length=0;setSfxVolume(volume);
 document.dispatchEvent(new PointerEvent('pointerdown'));await warmSounds();if(token!==epoch)return;
 const g=fixture(card);if(side===1){g.cur=1;g.players[1].hand=g.players[0].hand;g.players[0].hand=[];}controller.show(g);await waitForDuel(document.querySelector('#app')!);await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(token!==epoch)return;
 const result=reduce(g,{type:'play',idx:0});if(!result.events.some(e=>e.type==='summon'))throw Error('召喚が成立しませんでした');
 ready=false;post('ゲーム本体の召喚を再生中');
 pending=(controller as unknown as PreviewApi).playEvents(g,result);await pending;pending=undefined;
 if(token!==epoch)return;controller.show(result.state);ready=true;post('再生完了 · 着地音のみ候補へ差し替え',true);
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='summon-review')return;const d=e.data;if(d.action==='stop'){void cancel().then(()=>{ready=true;post('停止しました。');});}else if(d.action==='volume')setSfxVolume(d.volume);else if(d.action==='play'&&clips.has(d.id)&&['M2','M12'].includes(d.card)){void play(d.id,d.card,d.volume,d.mono,d.side===1?1:0).catch(error=>{ready=true;parent.postMessage({kind:'summon-scene',ready,message:String(error),error:true},location.origin);});}});
void(async()=>{initSound();controller.show(fixture());await Promise.all([waitForDuel(document.querySelector('#app')!),...manifest.map(async c=>{clips.set(c.id,await decoder.decodeAudioData(await(await fetch(files['./assets/'+c.file])).arrayBuffer()));}),fetch(soundUrls('summon')[0]).then(r=>r.arrayBuffer()).then(b=>decoder.decodeAudioData(b)).then(b=>{original=fingerprint(b);clips.set('current',b)})]);await decoder.close();ready=true;post('準備完了 · 候補の「実盤面」を押してください。');})().catch(e=>post(String(e)));
Object.assign(window,{summonSoundQA:{trace,clips,controller,get ready(){return ready}}});
window.addEventListener('pagehide',()=>{void cancel();controller.destroy();stopLayout();AudioBufferSourceNode.prototype.start=start;Object.defineProperty(AudioBufferSourceNode.prototype,'buffer',bufferProperty);});
