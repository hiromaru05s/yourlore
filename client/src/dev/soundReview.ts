import {SFX_NAMES,soundUrls,type SfxName} from '../ui/sound';
import {HOME_MUSIC_GAIN} from '../ui/backgroundMusic';
import './soundReview.css';

interface Clip {url:string;file:string;seconds:number;description?:string;decision?:string;sha256:string;}
interface Manifest {sounds:Record<SfxName,Clip[]>;}
const labels:Record<SfxName,string>={click:'HOME・共通クリック',pop:'確認・選択',error:'操作エラー',match:'対戦成立・対戦通知',coin:'HOMEの購入・クーポン',attack:'攻撃の振り抜き',summon:'召喚の着地',impact:'カードへの命中',facehit:'シーカーへの直接攻撃',damage:'効果によるダメージ','mana-pay':'マナの支払い',buy:'マーケット購入',draw:'カードを引く',play:'魔法・カードの発動',mana:'最大マナ増加',heal:'精神力回復',death:'モンスターの破壊',mimic:'ミミック召喚',trapSet:'トラップを伏せる',trap:'トラップ発動',void:'リフトへの吸収',shuffle:'デッキの再シャッフル',discard:'手札超過の破棄',turn:'自分のターン',coinToss:'先攻コインを投げる',coinLand:'先攻コインの着地',diceRoll:'ダイスを振る',diceLand:'ダイス結果',win:'勝利',lose:'敗北',drawGame:'引き分け',rankUp:'MMR上昇',rankDown:'MMR下降',rankPromote:'ティア昇格','duel-start':'開始SE・予備'};
const groups:Record<string,SfxName[]>={
 'まず確認してほしい音':['attack','summon','impact','facehit','damage','mana-pay'],
 '指定どおり残す音':['draw','buy'],
 'カード・魔法・資源':['play','mana','heal','death','mimic','trapSet','trap','void','shuffle','discard'],
 'ターン・コイン・ダイス':['turn','coinToss','coinLand','diceRoll','diceLand'],
 '勝敗・ランク':['win','lose','drawGame','rankUp','rankDown','rankPromote','duel-start'],
 'HOMEの音・維持':['click','pop','error','coin','match'],
};
const kept=new Set<SfxName>(['click','pop','error','coin','match','draw','buy']);
const oldUrls=(name:SfxName)=>name==='draw'?['/sfx/lore-v4/draw-3.mp3']:Array.from({length:['click','attack','impact'].includes(name)?3:1},(_,i)=>`/sfx/lore-v${['click','pop','error'].includes(name)?3:4}/${name}${['click','attack','impact'].includes(name)?'-'+(i+1):''}.mp3`);
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const root=document.getElementById('sound-review')!;
root.innerHTML=`<header><small>LORE / SOUND REVIEW · 2026.09.30</small><h1>TCGの効果音、作り直しました。</h1><p>攻撃・着弾・召喚を聞き分けられる、短く芯のある音へ。<br>HOMEの音は維持。Drawは③のみ、Buyは承認された音を購入に接続。</p><div class="review-stats"><span><b>28</b>種類を再制作</span><span><b>35</b>種類の割当を確認</span><span><b>LOCAL</b>ステージング未反映</span></div></header>
<div class="review-controls"><div><label>試聴音量 <input id="volume" type="range" min="0" max="100" value="70"><output id="volume-label">70%</output></label><button id="stop">■ 停止</button><input id="search" type="search" placeholder="音・シーンを検索" aria-label="音・シーンを検索"></div><p id="status" role="status" aria-live="polite">音を準備しています…</p></div>
<section class="review-chain"><small>連続試聴</small><h2>一連の動作で確認する</h2><p>召喚 → ドロー③ → 攻撃 → 命中 → 直接攻撃 → 支払い → 購入。同じ順序に旧／新の音源を並べた比較です。旧実装の再現や実戦録画ではありません。</p><div><button data-chain="new">▶ 新音の連続試聴</button><button data-chain="old">▶ 旧音の連続試聴</button><label><input type="checkbox" id="bgm"> 対戦BGMを重ねる</label></div><div id="timeline" aria-label="再生中のシーン"></div></section>
<div class="review-tabs"><button data-filter="all" aria-pressed="true">すべて</button><button data-filter="new" aria-pressed="false">作り直した音</button><button data-filter="keep" aria-pressed="false">維持する音</button></div><section id="catalog"></section>
<details><summary>リサーチから決めたこと</summary><p><a href="https://news.blizzard.com/en-us/article/23964694/inside-battle-net-meet-the-sound-team-behind-hearthstones-harmonic-design" target="_blank" rel="noreferrer">Hearthstone公式・音響チームのインタビュー</a>では、カードの動作に合わせた拍、発動と着弾の区別、何を鳴らすかの選択が重視されています。</p><p><a href="https://eprints.hud.ac.uk/id/eprint/30303/1/Final%20thesis.pdf#page=54" target="_blank" rel="noreferrer">Magic Duels制作者 Harry Boam の制作記録（pp.53–57）</a>では、アニメーションの接触点を先に決め、そこに音の厚みを集めています。TCG全体に一つの正解の音色がある、という意味ではありません。</p><p>今回のLOREでは、攻撃は風切り、命中は短い打撃、召喚は低い着地、マナ支払いは小さな結晶の接触に分けました。時間・音量・素材の選択は、このリサーチと今回の指摘に基づく制作判断です。</p></details>
<details><summary>適用範囲・確認状況</summary><p>分離したローカル作業環境でゲームの再生URLを差し替えています。主作業ツリー／ステージングへの反映はまだ行っていません。音源単体の試聴はゲームと同じ二乗ゲイン・コンプレッサーを使います。連続試聴は比較用の固定時刻で、ゲーム本体のアニメーションではありません。</p><p>HOMEのclick・pop・error・coin・match、およびDraw③・Buyは元ファイルのままです。draw①②は再生対象から外しました。購入時には支払い音の後にBuyを鳴らし、無料購入もBuyで確認します。BGMは既存曲を維持しています。</p><p>未適用だった能力・クエスト等に一律で音を足す変更は含めていません。duel-startは通常の開始BGMと重ねず、予備SEのままです。再生・停止・ファイル整合性の機能確認と、音色の採用判断は別です。</p><p>振り抜き素材：<a href="https://opengameart.org/content/swishes-sound-pack">artisticdude</a>。打撃素材：<a href="https://opengameart.org/content/thwack-sounds">Jordan Irwin / AntumDeluge</a>。ともにCC0。従来のKenney素材と独自の短い共鳴も使用しています。他作品のゲーム音声は使用していません。</p></details><footer>旧音／新音は同じ音量設定で再生。次のボタンを押すと前の音は止まります。最終的な音色はこのプレビューで確認してください。</footer>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let context:AudioContext|undefined,bus:GainNode|undefined,musicBus:GainNode|undefined,generation=0,filter='all';
const buffers=new Map<string,Promise<AudioBuffer>>(),sources=new Set<AudioBufferSourceNode>(),voiceGains=new WeakMap<AudioBufferSourceNode,GainNode>();
const timers=new Set<ReturnType<typeof setTimeout>>();
function getAudio(){if(!context){context=new AudioContext();bus=context.createGain();bus.gain.value=.49;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.1;bus.connect(limiter).connect(context.destination);musicBus=context.createGain();musicBus.gain.value=.147;musicBus.connect(context.destination);}if(context.state==='suspended')void context.resume();return context;}
function decode(url:string){const ctx=getAudio();let cached=buffers.get(url);if(!cached){cached=fetch(url).then(r=>{if(!r.ok)throw Error(`${r.status}: ${url}`);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b));buffers.set(url,cached);cached.catch(()=>buffers.delete(url));}return cached;}
function stop(message='停止しました。'){generation++;for(const timer of timers)clearTimeout(timer);timers.clear();for(const source of sources){try{const gain=voiceGains.get(source)!;gain.gain.setTargetAtTime(0,context!.currentTime,.004);source.stop(context!.currentTime+.025)}catch{}}sources.clear();document.querySelectorAll('.is-playing').forEach(n=>n.classList.remove('is-playing'));$('timeline').textContent='';$('status').textContent=message;}
function start(buffer:AudioBuffer,at:number,isMusic=false){const ctx=getAudio(),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain).connect(isMusic?musicBus!:bus!);voiceGains.set(source,gain);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};source.start(at);if(isMusic)source.stop(at+10);return source;}
function later(fn:()=>void,ms:number){const t=setTimeout(()=>{timers.delete(t);fn()},ms);timers.add(t)}
async function playOne(url:string,button:HTMLButtonElement){stop('音源を読み込み中…');getAudio();const ticket=generation;try{const buffer=await decode(url);if(ticket!==generation)return;button.classList.add('is-playing');$('status').textContent=`再生中：${button.dataset.title}`;const source=start(buffer,context!.currentTime);source.addEventListener('ended',()=>{if(ticket===generation){button.classList.remove('is-playing');$('status').textContent=`再生終了：${button.dataset.title}`}})}catch(e){if(ticket===generation)$('status').textContent=`再生できません：${e}`}}
const sequence:Array<{at:number;cue:SfxName}>=[{at:0,cue:'summon'},{at:1,cue:'draw'},{at:1.3,cue:'draw'},{at:1.6,cue:'draw'},{at:2.3,cue:'attack'},{at:2.57,cue:'impact'},{at:3.5,cue:'attack'},{at:3.77,cue:'facehit'},{at:4.8,cue:'mana-pay'},{at:5.13,cue:'buy'},{at:6.2,cue:'heal'},{at:7.3,cue:'death'},{at:8.2,cue:'turn'}];
async function chain(mode:string){stop('連続試聴を準備中…');getAudio();const ticket=generation;const music=$<HTMLInputElement>('bgm').checked;try{
 const clips=await Promise.all(sequence.map(x=>decode((mode==='old'?oldUrls(x.cue):soundUrls(x.cue))[0])));const bgm=music?await decode('/music/poised-opening.mp3'):undefined;if(ticket!==generation)return;
 const now=context!.currentTime+.06;if(bgm)start(bgm,now,true);$('status').textContent=`${mode==='old'?'旧音':'新音'}の連続試聴${music?' · BGMあり':''}`;
 sequence.forEach((x,i)=>{start(clips[i],now+x.at);later(()=>{if(ticket===generation){$('timeline').textContent=labels[x.cue];document.querySelectorAll('.is-playing').forEach(n=>n.classList.remove('is-playing'));document.querySelector(`[data-cue="${x.cue}"]`)?.classList.add('is-playing')}},60+x.at*1000)});
 later(()=>{if(ticket===generation)stop('連続試聴が終了しました。')},10060);
 }catch(e){if(ticket===generation)$('status').textContent=`再生できません：${e}`}}
$('stop').onclick=()=>stop();document.querySelectorAll<HTMLButtonElement>('[data-chain]').forEach(b=>b.onclick=()=>void chain(b.dataset.chain!));
$<HTMLInputElement>('volume').oninput=()=>{const v=Number($<HTMLInputElement>('volume').value)/100;getAudio();bus!.gain.setTargetAtTime(v*v,context!.currentTime,.015);musicBus!.gain.setTargetAtTime(HOME_MUSIC_GAIN*.6*v*v,context!.currentTime,.015);$('volume-label').textContent=Math.round(v*100)+'%'};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('pagehide',()=>{stop();void context?.close()});
async function boot(){
 const response=await fetch('/sfx/lore-v5/manifest.json');if(!response.ok)throw Error('manifest unavailable');const manifest=await response.json() as Manifest;
 for(const name of SFX_NAMES)if(JSON.stringify(manifest.sounds[name].map(c=>c.url))!==JSON.stringify(soundUrls(name)))throw Error('音源の割当が不一致：'+name);
 function render(){const q=$<HTMLInputElement>('search').value.toLowerCase();$('catalog').innerHTML=Object.entries(groups).map(([group,names])=>{
 const visible=names.filter(n=>(filter==='all'||(filter==='keep')===kept.has(n))&&`${n} ${labels[n]} ${manifest.sounds[n][0].description??''}`.toLowerCase().includes(q));if(!visible.length)return '';
 return `<h2 class="group">${esc(group)}</h2>`+visible.map(name=>{const clips=manifest.sounds[name],keep=kept.has(name);const note=name==='draw'?'承認された③だけを使用。①②への切替はありません。':name==='buy'?'音源はそのまま。購入の演出へ接続しました。':keep?'HOMEで使う既存の音をそのまま維持。':clips[0].description!;
 const buttons=(mode:string,urls:string[])=>urls.map((url,i)=>`<button data-url="${url}" data-title="${esc(labels[name])} · ${mode==='old'?'旧音':keep?'維持':'新音'}${urls.length>1?' '+(i+1):''}" class="clip ${mode==='new'?'primary':''}">▶ ${mode==='old'?'旧音':name==='draw'?'採用③':keep?'維持':'新音'}${urls.length>1?' '+(i+1):''}</button>`).join('');
 return `<article data-cue="${name}"><div><small>${keep?'PRESERVED':'REDESIGNED'} / ${name}</small><h3>${esc(labels[name])}</h3><p>${esc(note)}</p></div><div class="clip-controls">${keep?'':`<div>${buttons('old',oldUrls(name))}</div>`}<div>${buttons('new',soundUrls(name))}<span class="duration">${clips[0].seconds.toFixed(2)}秒</span></div></div></article>`}).join('');}).join('')||'<p>該当する音はありません。</p>';
 $('catalog').querySelectorAll<HTMLButtonElement>('[data-url]').forEach(b=>b.onclick=()=>void playOne(b.dataset.url!,b));}
 $('search').oninput=render;document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter!;document.querySelectorAll('[data-filter]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));render()});render();$('status').textContent='旧音／新音の再生ボタンで比較できます。';
}
void boot().catch(e=>{$('status').textContent=`準備できません：${e}`});
