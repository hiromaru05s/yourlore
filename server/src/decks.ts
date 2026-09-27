import {deckStoreForUser,sanitizeDeck,sanitizeDecks} from '../../client/src/shared/cards';
import {ownedCosmetics} from '../../client/src/shared/cosmetics';
import type {Env,SessionUser} from './env';
/** All five presets and the compatibility cache change in one atomic UPDATE. */
export async function saveUserDecks(env:Env,user:SessionUser,body:{deck?:unknown;decks?:unknown}){
 const previous=deckStoreForUser(user);
 const store=body.decks!==undefined?sanitizeDecks(body.decks):previous;
 if(body.decks!==undefined){
  const raw=body.decks as {list?:Array<{sleeve?:unknown;furniture?:unknown}>}|null;
  // Old clients can still edit cards/names without resetting per-deck equipment.
  store.list.forEach((slot,i)=>{for(const key of ['sleeve','furniture'] as const)if(raw?.list?.[i]?.[key]===undefined)slot[key]=previous.list[i][key];});
 }else store.list[store.sel]={...store.list[store.sel],cards:sanitizeDeck(body.deck)};
 const row=await env.DB.prepare('SELECT sleeves FROM users WHERE id = ?').bind(user.id).first<{sleeves:string|null}>();
 const owned=new Set(ownedCosmetics(row?.sleeves));
 if(store.list.some(slot=>!owned.has(slot.sleeve)||!owned.has(slot.furniture)))return null;
 const active=store.list[store.sel];
 await env.DB.prepare('UPDATE users SET decks = ?, deck = ?, sleeve = ?, furniture = ? WHERE id = ?')
  .bind(JSON.stringify(store),active.cards.join(','),active.sleeve,active.furniture,user.id).run();
 return {ok:true as const,decks:store,deck:active.cards,sleeve:active.sleeve,furniture:active.furniture};
}
