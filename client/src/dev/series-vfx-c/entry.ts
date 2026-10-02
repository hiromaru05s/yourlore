const search=new URLSearchParams(location.search);
if(search.get('revision')==='3'){void import('./revision3/main');}
else if(search.has('r1')||search.get('stage')==='1'){
 void import('./main').then(()=>{const label=document.createElement('div');label.textContent='R1 旧案 — ユーザー不採用 / 比較証拠';label.style.cssText='position:fixed;top:0;right:0;background:#5d2525;color:#fff8ea;padding:5px 12px;z-index:9999;font:12px sans-serif;pointer-events:none';document.body.append(label);});
}else void import('./revision2/main');
