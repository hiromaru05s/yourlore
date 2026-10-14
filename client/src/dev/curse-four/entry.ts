if(new URLSearchParams(location.search).has('runtime'))void import('./runtime-preview');else if(new URLSearchParams(location.search).has('board'))void import('./board');else void import('./preview');
