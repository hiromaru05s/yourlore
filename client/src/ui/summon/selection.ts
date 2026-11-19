import {isCastle} from '../castleSummon/catalog';
import {isPoisonSummon} from '../poisonSummon/selection';
import {isWeaponmaster} from '../weaponmasterSummon/selection';
import {isShieldTitan} from '../shieldTitanSummon/selection';
import {isSilenceSummon} from '../silenceSummon/selection';
import {isVoidSummon} from '../voidSummon/selection';
import {isCasino} from '../casinoSummon/selection';
import {isDungeon} from '../dungeonSummon/selection';
import {isVampire} from '../vampireSummon/selection';
import {isAssassin} from '../assassinSummon/selection';
import {isMage} from '../mageSummon/selection';
import {isMercenary} from '../mercenarySummon/selection';
import {isGambler} from '../gamblerSummon/selection';
import {isHexer} from '../hexerSummon/selection';
import {isGolem} from '../golem/selection';
import {isChosenHero} from '../chosenSummon/selection';
import {isVerdant} from '../verdant/selection';
import {isMimic} from '../mimic/selection';
import {selectedTribeSummon} from '../tribePresentation/selection';
import {merchantCount} from '../merchant/selection';

/** Ordinary summon adoption, including the temporarily replaced dedicated families. */
export const replacesDedicatedSummon=(id:string|undefined)=>isCastle(id)||isPoisonSummon(id)||isGolem(id);
export function hasSpecialSummon(id:string|undefined){
 if(!id||replacesDedicatedSummon(id))return false;
 return isCastle(id)||isPoisonSummon(id)||isWeaponmaster(id)||isShieldTitan(id)||isSilenceSummon(id)||isVoidSummon(id)||isCasino(id)||isDungeon(id)||isVampire(id)||isAssassin(id)||isMage(id)||isMercenary(id)||isGambler(id)||isHexer(id)||isGolem(id)||isChosenHero(id)||isVerdant(id)||isMimic(id)||selectedTribeSummon(id)||merchantCount(id);
}
