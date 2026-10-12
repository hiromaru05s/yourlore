if(new URLSearchParams(location.search).has('runtime')) void import('./runtime-qa');
else if(new URLSearchParams(location.search).has('board')) void import('./board');
else void import('./preview');
