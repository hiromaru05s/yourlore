const params=new URLSearchParams(location.search);
if(params.has('board'))void import('./board');else if(params.has('arena'))void import('./board-review');else void import('./preview');
