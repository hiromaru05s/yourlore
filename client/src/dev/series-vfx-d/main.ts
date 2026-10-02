export {};
const params=new URLSearchParams(location.search);
async function start(){
 if(params.has('r2')){if(params.has('board'))await import('./revision2/board');else await import('./revision2/studio');}
 else if(params.has('r1')||(params.has('board')&&!params.has('revision'))){await import('./style.css');if(params.has('board'))await import('./board');else await import('./studio');}
 else {if(params.has('board'))await import('./revision3/board');else await import('./revision3/studio');}
}
void start().catch(error=>{
 const message=document.createElement('p');message.textContent=`プレビューを読み込めませんでした。再読み込みしてください。 ${String(error)}`;
 message.style.cssText='padding:24px;color:#f0e4d0;background:#172027;font:16px system-ui';document.body.replaceChildren(message);
 if(window.parent!==window)parent.postMessage({kind:'d3-status',error:String(error)},location.origin);
});
