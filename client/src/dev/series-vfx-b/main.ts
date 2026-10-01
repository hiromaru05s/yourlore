export {};
const params=new URLSearchParams(location.search);
if(params.get('revision')==='3'){
 if(params.has('board'))void import('./revision3/board');else void import('./revision3/preview');
}else if(params.get('revision')==='2'){
 if(params.has('board'))void import('./revision2/board');else void import('./revision2/preview');
}else if(params.has('board'))void import('./board');else void import('./preview');
