import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {setMyAvatar,setOppAvatar} from '../../ui/boardView';import {setLang} from '../../i18n';import {synergyFixture} from '../series-vfx-b/revision3/synergy-fixtures';import type {Action} from '../../shared/types';import {setFxSkip} from '../../ui/anim';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
let instance:QA,stop=()=>{};let fixture=synergyFixture('A170','TGE6',0);
class QA extends BaseController{
 constructor(){super(document.getElementById('app')!,0,{onHome:()=>{},onRematch:()=>{}});this.state=structuredClone(fixture.before);this.introShown=true;this.view.render(this.state);this.view.setHandOpen(true);}
 protected submit(_a:Action){this.run();}
 run(){this.applyResult({state:structuredClone(fixture.after),events:fixture.events});}
}
const bar=document.createElement('div');bar.style.cssText='position:fixed;z-index:99999;top:8px;left:8px;background:white;padding:8px;color:black;font:13px sans-serif';bar.innerHTML='<select id="cue"><option value="A170">FIX 段階1</option><option value="A173">FIX 始原勝利</option></select><select id="owner"><option value="0">自分</option><option value="1">相手</option></select><button id="resetqa">準備</button><button id="runqa">エンジン結果を再生</button><button id="skipqa">スキップ</button><span id="qa-status">準備中</span>';document.body.append(bar);
const status=bar.querySelector('#qa-status')!;
async function reset(){instance?.destroy();stop();document.querySelectorAll('.modal-overlay,.outcome-overlay').forEach(el=>el.remove());fixture=synergyFixture((bar.querySelector('#cue') as HTMLSelectElement).value,'TGE6',Number((bar.querySelector('#owner') as HTMLSelectElement).value) as 0|1);instance=new QA();stop=startBoardLayout();await waitForDuel(document.getElementById('app')!);status.textContent='準備完了';}
bar.querySelector<HTMLButtonElement>('#resetqa')!.onclick=()=>void reset();bar.querySelector<HTMLButtonElement>('#runqa')!.onclick=()=>instance.run();bar.querySelector<HTMLButtonElement>('#skipqa')!.onclick=()=>setFxSkip(true);
(window as any).tribeApprovedQA={get fixture(){return {events:fixture.events,over:fixture.after.over,winner:fixture.after.winner,participants:fixture.participants};}};
void reset();

const proof=document.createElement('output');proof.id='qa-proof';proof.style.cssText='position:fixed;bottom:0;left:0;z-index:9999;font:11px monospace;color:white;background:#111;padding:5px';document.body.append(proof);
let max=0,frames=0,magicSeen=false;
function inspect(){const rigs=[...document.querySelectorAll<HTMLElement>('[data-tribe-synergy]')];max=Math.max(max,rigs.length);if(rigs.length)frames++;magicSeen ||= !!document.querySelector('[data-tribe-victory]');proof.textContent=JSON.stringify({max,frames,magicSeen,live:rigs.length,hidden:document.querySelectorAll('.zone-mon .card[style*="visibility: hidden"]').length});requestAnimationFrame(inspect);}inspect();
