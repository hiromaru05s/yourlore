import {CONNECTED_STUDIES} from './connectedReturnPresets';
import {PORTAL_STUDIES} from './portalReturnPresets';
import {previewClock} from './shelfReturnEffects';
import {playMaterialReturn,type ShelfReturnArgs} from '../ui/shelfReturn';
/** The comparison lab and adopted game effect share the exact same renderer. */
export function playConnectedReturn(args:ShelfReturnArgs):Promise<boolean>{
 const study=PORTAL_STUDIES.find(x=>x.id===args.root.dataset.shelfReturnVariant)??CONNECTED_STUDIES.find(x=>x.id===args.root.dataset.shelfReturnVariant)??CONNECTED_STUDIES[0];
 return playMaterialReturn(args,study,previewClock);
}
