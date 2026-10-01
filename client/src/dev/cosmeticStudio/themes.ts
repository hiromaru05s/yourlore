export interface AtelierTheme {
 id:string;name:string;en:string;note:string;body:string;lining:string;metal:string;inlay:string;accent:string;
 surface:'wood'|'porcelain'|'lacquer'|'stone'|'glass';motif:'atlas'|'iris'|'falcon'|'fern'|'amber'|'tide'|'silver'|'ember';
 motion?:'foil_sweep'|'emissive_pulse';
}
export const THEMES:AtelierTheme[]=[
 {id:'nocturne',name:'星を綴る夜',en:'NOCTURNE ATLAS',note:'藍の織地 / 黒檀 / 古銀',body:'#182739',lining:'#102338',metal:'#9aabb6',inlay:'#d9dbd5',accent:'#b4cee0',surface:'wood',motif:'atlas'},
 {id:'porcelain',name:'白磁のアイリス',en:'PORCELAIN IRIS',note:'白磁 / 真珠母貝 / プラチナ',body:'#dddcd3',lining:'#b9ccd1',metal:'#9aa9b4',inlay:'#edf4f1',accent:'#779da9',surface:'porcelain',motif:'iris'},
 {id:'garnet',name:'緋翼の誓約',en:'GARNET COVENANT',note:'黒紅の漆 / 緋翼 / ローズブロンズ',body:'#30151d',lining:'#401827',metal:'#ac7d62',inlay:'#dbb397',accent:'#bb5156',surface:'lacquer',motif:'falcon'},
 {id:'verdigris',name:'翠銅の標本',en:'VERDIGRIS HERBARIUM',note:'深緑の革 / 蕨 / 緑青の銅',body:'#17362d',lining:'#1b4237',metal:'#a47c51',inlay:'#caab73',accent:'#8cbea4',surface:'wood',motif:'fern'},
 {id:'amber',name:'琥珀の記録',en:'AMBER RELIQUARY',note:'ウォルナット / 琥珀 / 真鍮',body:'#362a20',lining:'#51402a',metal:'#ba9458',inlay:'#efcb83',accent:'#efad50',surface:'wood',motif:'amber'},
 {id:'tidal',name:'潮硝子の庭',en:'TIDAL GLASS',note:'青磁 / 波の彫刻 / 銀',body:'#527c89',lining:'#254655',metal:'#9facb4',inlay:'#d0e6e6',accent:'#7ed6dc',surface:'glass',motif:'tide'},
 {id:'silverflow',name:'銀脈の流墨',en:'LIVING SILVER',note:'黒い鉱石の銀象嵌を、細い光が渡る',body:'#1b242e',lining:'#111e29',metal:'#aebac5',inlay:'#e1edf0',accent:'#b5dfef',surface:'stone',motif:'silver',motion:'foil_sweep'},
 {id:'emberheart',name:'熾火の心臓',en:'EMBER HEART',note:'黒曜石の亀裂へ熱が巡り、静かに冷える',body:'#261b19',lining:'#281817',metal:'#a07851',inlay:'#d4ad72',accent:'#eb8048',surface:'stone',motif:'ember',motion:'emissive_pulse'},
];
export const ASSET_ROOT='/cosmetics/atelier-v1/';
export const asset=(theme:AtelierTheme,file:string)=>`${ASSET_ROOT}${theme.id}/${file}`;
