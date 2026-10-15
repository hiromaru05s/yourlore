import {CastleRenderer as SelectedRenderer} from '../../ui/castleSummon/renderer';
/** Comparison keeps all four directions; gameplay allocates only selected 01. */
export class CastleRenderer extends SelectedRenderer{constructor(){super([0,1,2,3]);}}
