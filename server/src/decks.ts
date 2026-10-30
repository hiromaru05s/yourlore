import {ONBOARDING_BUY,ONBOARDING_DECK,isOnboardingDeck} from '../../client/src/shared/onboarding';
import {starterCollection,ownsDeck} from '../../client/src/shared/collection';
import {deckStoreForUser,sanitizeDeck,sanitizeDecks,DECK_SIZE,DECK_SLOTS,DECK_POOL} from '../../client/src/shared/cards';
import {ownedCosmetics} from '../../client/src/shared/cosmetics';
import type {Env,SessionUser} from './env';
/** All five presets and the compatibility cache change in one atomic UPDATE. */
export async function saveUserDecks(env:Env,user:SessionUser,body:{deck?:unknown;decks?:unknown;tutorial?:unknown}){
 // Sanitizers repair legacy stored data; they must not turn malformed writes
 // into valid replacement decks. Validate the entire payload before any write.
 const validCards=(value:unknown):value is string[]=>Array.isArray(value)&&value.length===DECK_SIZE&&value.every(id=>typeof id==='string'&&DECK_POOL.includes(id));
 if(body.decks!==undefined){
  const value=body.decks as {sel?:unknown;list?:unknown}|null;
  if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isInteger(value.sel)||Number(value.sel)<0||Number(value.sel)>=DECK_SLOTS||!Array.isArray(value.list)||value.list.length!==DECK_SLOTS||!value.list.every(slot=>slot&&typeof slot==='object'&&!Array.isArray(slot)&&validCards(slot.cards)))return null;
 }else if(!validCards(body.deck))return null;
 const previous=deckStoreForUser(user);
 const store=body.decks!==undefined?sanitizeDecks(body.decks):previous;
 if(body.decks!==undefined){
  const raw=body.decks as {list?:Array<{sleeve?:unknown;furniture?:unknown;effect?:unknown;frame?:unknown}>}|null;
  // Old clients can still edit cards/names without resetting per-deck equipment.
  store.list.forEach((slot,i)=>{for(const key of ['sleeve','furniture','effect','frame'] as const)if(raw?.list?.[i]?.[key]===undefined)slot[key]=previous.list[i][key]??'default';});
 }else store.list[store.sel]={...store.list[store.sel],cards:sanitizeDeck(body.deck)};
 const row=await env.DB.prepare('SELECT sleeves, starter_cards FROM users WHERE id = ?').bind(user.id).first<{sleeves:string|null;starter_cards:string|null}>();
 if(!row||store.list.some(slot=>!ownsDeck(slot.cards,starterCollection(row.starter_cards))))return null;
 const owned=new Set(ownedCosmetics(row?.sleeves));
 if(store.list.some(slot=>!owned.has(slot.sleeve)||!owned.has(slot.furniture)||!owned.has(slot.effect??'default')||!owned.has(slot.frame??'default')))return null;
 const active=store.list[store.sel];
 const update=env.DB.prepare('UPDATE users SET decks = ?, deck = ?, sleeve = ?, furniture = ? WHERE id = ?')
  .bind(JSON.stringify(store),active.cards.join(','),active.sleeve,active.furniture,user.id);
 if(body.tutorial===true){
  if(!isOnboardingDeck(active.cards))return null;
  const ready=await env.DB.prepare('SELECT request_id FROM collection_transactions WHERE user_id=? AND request_id=?').bind(user.id,ONBOARDING_BUY).first();
  if(!ready)return null;
  await env.DB.batch([update,env.DB.prepare('INSERT OR IGNORE INTO rewards(user_id,key,amount,created_at) VALUES(?,?,0,?)').bind(user.id,ONBOARDING_DECK,Date.now())]);
 }else await update.run();
 return {ok:true as const,decks:store,deck:active.cards,sleeve:active.sleeve,furniture:active.furniture};
}
