import '../../styles/tokens.css';
import '../../styles/card.css';
import {setLang} from '../../i18n';
setLang('ja');
import {loadCurseAssets} from '../../ui/curse/assets';
export async function loadAssets(){return (await loadCurseAssets()).faces;}
export async function loadSkull(){return (await loadCurseAssets()).skull;}
