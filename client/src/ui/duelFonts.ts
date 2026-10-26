import {withDeadline} from '../net/deadline';
import {DB,STARTERS} from '../shared/cards';
import {getLang,localizedInterfaceText} from '../i18n';
let preparedLanguage:string|undefined,pending:Promise<void>|undefined;
/** Fetch the glyph subsets used by localized card names/text before gameplay.
 * Loading only the current visible hand misses later draws and generated cards. */
export function prepareDuelFonts():Promise<void>{
 if(!document.fonts?.load)return Promise.resolve();const language=getLang();
 if(preparedLanguage===language&&pending)return pending;
 preparedLanguage=language;
 const text=[...new Set(('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 精神力 マナ デッキ 墓地 リフト 購入 対戦 ターン 終了 先攻 後攻 あなたが 相手が '+localizedInterfaceText()+' '+Object.values({...DB,...STARTERS}).map(c=>language==='ja'?(c.nameJa??c.name)+' '+(c.textJa??c.text):language==='en'?(c.nameEn??c.name)+' '+(c.textEn??c.text):c.name+' '+c.text).join('')).split(''))].join('');
 const fonts=language==='ja'?['500 16px "Shippori Mincho"','600 16px "Shippori Mincho"','700 16px "Shippori Mincho"','800 16px "Shippori Mincho"','400 16px "Noto Sans JP"','500 16px "Noto Sans JP"','700 16px "Noto Sans JP"']:language==='en'?[500,600,700,800].map(w=>`${w} 16px Alegreya`):[];
 pending=withDeadline(Promise.all([...fonts.map(font=>document.fonts.load(font,text)),document.fonts.load('16px LoreBoardSerif','0123456789'),document.fonts.load('800 16px Alegreya','0123456789'),document.fonts.load('500 16px "LORE Rift Numerals"','0123456789')]),60000).then(()=>{}).catch(error=>{if(preparedLanguage===language){pending=undefined;preparedLanguage=undefined;}throw error;});
 return pending;
}
