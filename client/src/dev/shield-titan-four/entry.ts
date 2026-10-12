const query=new URLSearchParams(location.search);
if(query.has('reference'))void import('./reference-preview');else if(query.has('board'))void import('./board');else void import('./preview');
