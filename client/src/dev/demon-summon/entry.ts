import './style.css';
if(new URLSearchParams(location.search).has('board'))void import('./board');else void import('./preview');
