/** The approved effect is active in ordinary matches; labs may override it in DEV. */
import {facetPreview} from './manaFacetVariants';
import type {FormationPreview} from './manaFormationTypes';
export * from './manaFormationTypes';
export const APPROVED_MANA_FORMATION=facetPreview('facet-swift');
let preview:FormationPreview|null|undefined;
/** null selects the legacy comparison; undefined restores the approved default. */
export function setManaFormationPreview(value?:FormationPreview|null){if(import.meta.env.DEV)preview=value;}
export function getManaFormation(){return import.meta.env.DEV&&preview!==undefined?preview??undefined:APPROVED_MANA_FORMATION;}
