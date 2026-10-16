import type {GameState,Side} from '../shared/types';
import {DB,STARTERS} from '../shared/cards';
import {artUrl} from './cardArt';
import {waitAssets} from './assetReadiness';
import {decodeAsset,hasUnloadedAssets,warmImages} from './imageAssets';
import {getLang} from '../i18n';
/** Only public zones and our hand: never fetch identities from hidden opponent zones. */
export function prepareStateArtwork(state:GameState,you:Side,root:HTMLElement):Promise<void>|undefined{
 if(typeof Image==='undefined'||typeof Image.prototype.decode!=='function')return;
 const cards=[...state.market,...state.players[state.cur].supply,...state.players.flatMap(p=>[...p.field,...p.enchants.map(e=>e.card),...p.discard.slice(-1)]),...state.players[you].hand];
 void warmImages([...new Set(cards.filter(c=>c&&(DB[c.id]||STARTERS[c.id])).map(c=>artUrl.full(c!.id)))]);
 const urls=[...new Set(cards.filter(c=>c&&(DB[c.id]||STARTERS[c.id])).map(c=>artUrl.sm(c!.id)))].filter(url=>hasUnloadedAssets([url]));
 // Only our deck is known. Never speculate from the opponent's hidden cards.
 void warmImages(state.players[you].deck.filter(c=>DB[c.id]||STARTERS[c.id]).map(c=>artUrl.sm(c.id)));
 if(!urls.length)return;
 return (async()=>{
 const work=Promise.all(urls.map(url=>decodeAsset(url)));
 let loader:HTMLElement|undefined;
 const timer=setTimeout(()=>{if(!root.isConnected)return;loader=document.createElement('div');loader.className='state-art-loader';loader.setAttribute('role','status');loader.textContent=getLang()==='ja'?'カードを準備しています':getLang()==='ko'?'카드 준비 중':'Preparing cards';root.append(loader);},180);
 try{await work;}catch{clearTimeout(timer);if(!root.isConnected)return;if(!loader){loader=document.createElement('div');loader.className='state-art-loader';root.append(loader);}await waitAssets(urls,loader);}finally{clearTimeout(timer);loader?.remove();}
 })();
}
