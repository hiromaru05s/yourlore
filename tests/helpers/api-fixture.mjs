/** API-only fixture without Playwright routing, which disables the browser HTTP
 * cache even for unrelated static artwork. Assets retain real browser behavior. */
export async function apiFixture(page,respond){
 await page.exposeFunction('__loreTestApi',respond);
 await page.addInitScript(()=>{
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const request=new Request(input instanceof Request?input:new URL(String(input),location.href),init);
   if(new URL(request.url).origin===location.origin&&new URL(request.url).pathname.startsWith('/api/')){
    const text=request.method==='GET'||request.method==='HEAD'?null:await request.clone().text();
    const data=await window.__loreTestApi({url:request.url,method:request.method,body:text?JSON.parse(text):null});
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
   }
   return nativeFetch(input,init);
  };
 });
}
