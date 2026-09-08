from pathlib import Path
import re,html,base64,json
folder=Path('docs/research/2026-09-09-duel-ux');text=(folder/'report.md').read_text();lines=text.splitlines();toc=[];out=[];sources=[]
def inline(s):
 s=html.escape(s,quote=False)
 s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:f'<a href="{html.escape(m[2],quote=True)}">{m[1]}</a>',s)
 s=re.sub(r'\[\^(\d+)\]',r'<sup><a href="#source-\1">[\1]</a></sup>',s)
 s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
def image(name,caption):
 data=base64.b64encode((Path('docs/ui-rework/2026-09-09-shared-perspective')/name).read_bytes()).decode()
 return f'<figure><img alt="{caption}" src="data:image/png;base64,{data}"><figcaption>{caption}</figcaption></figure>'
i=0
while i<len(lines):
 s=lines[i]
 if not s.strip():i+=1;continue
 if s.startswith('#'):
  n=len(s)-len(s.lstrip('#'));title=s[n:].strip();anchor='section-'+str(len(toc)) if n==2 else ''
  if n==2:toc.append((anchor,title))
  out.append(f'<h{n}'+(f' id="{anchor}"' if anchor else '')+f'>{inline(title)}</h{n}>')
  if title=='今回の修正と限界':out.append(image('desktop-1920.png','修正後のLORE：1920×1080、最大7モンスター・14魔法罠の確認画面。'))
  if title=='学習・モバイル・アクセシビリティ':out.append('<div class="phone">'+image('phone.png','390×844の縦持ち画面。寸法の整合後も小さな状態表示の判読性は課題。')+'</div>')
  i+=1;continue
 if s.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   r=[x.strip() for x in lines[i].strip('|').split('|')]
   if not all(re.fullmatch(r'[-: ]+',x) for x in r):rows.append(r)
   i+=1
  out.append('<div class="table-wrap"><table><thead><tr>'+''.join('<th>'+inline(x)+'</th>' for x in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(x)+'</td>' for x in r)+'</tr>' for r in rows[1:])+'</tbody></table></div>');continue
 m=re.match(r'\[\^(\d+)\]: (.*)',s)
 if m:
  out.append(f'<p class="source" id="source-{m[1]}"><b>[{m[1]}]</b> {inline(m[2])}</p>');sources.append({'id':int(m[1]),'description':m[2],'urls':re.findall(r'\]\(([^)]+)\)',m[2]),'accessed':'2026-09-09'});i+=1;continue
 para=[s];i+=1
 while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','|','[^')):para.append(lines[i]);i+=1
 out.append('<p>'+inline(' '.join(para))+'</p>')
css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:#202124;background:#fff;font:16px/1.95 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}nav{position:fixed;left:0;top:0;width:240px;height:100vh;padding:36px 24px;border-right:1px solid #ddd;overflow:auto;font-size:12px;line-height:1.6}nav a{display:block;padding:7px 0;color:#555;text-decoration:none}nav a:hover{color:#000;text-decoration:underline}main{max-width:1070px;margin:0 auto 0 260px;padding:56px 54px 100px}h1{font-size:34px;line-height:1.4;letter-spacing:-.03em;margin:0 0 44px}h2{font-size:25px;line-height:1.5;margin:58px 0 22px;padding-top:20px;border-top:1px solid #aaa;scroll-margin-top:20px}h3{font-size:19px;margin:32px 0 12px}p{margin:0 0 22px}a{color:#315572;text-underline-offset:3px}strong{font-weight:700}code{font-size:.85em;overflow-wrap:anywhere}sup{font-size:10px;white-space:nowrap}table{border-collapse:collapse;width:100%;font-size:12px;line-height:1.65;margin:10px 0 30px}th,td{padding:12px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #ddd}th{background:#eee;color:#111}th:first-child,td:first-child{min-width:130px}tr:nth-child(even){background:#fafafa}.table-wrap{overflow-x:auto}figure{margin:22px 0 30px}img{max-width:100%;height:auto;border:1px solid #ccc}figcaption{font-size:12px;color:#666;line-height:1.7;padding-top:8px}.phone{max-width:320px;margin:auto}.source{font-size:12px;line-height:1.8;overflow-wrap:anywhere}nav .label{color:#222;font-weight:700;margin-bottom:18px}@media(min-width:1600px){main{margin-left:auto;margin-right:auto;padding-left:80px}}@media(max-width:900px){nav{position:static;width:auto;height:auto;padding:20px;border-right:0;border-bottom:1px solid #ddd;display:flex;gap:12px;flex-wrap:wrap}nav .label{display:none}nav a{padding:0}main{margin:0;padding:28px 22px}h1{font-size:27px}h2{font-size:22px}}@media print{nav{display:none}main{margin:0;padding:0;max-width:none}body{font-size:10pt;line-height:1.75}h1{font-size:22pt}h2{font-size:16pt;break-after:avoid}h3{break-after:avoid}figure,table{break-inside:avoid}.phone{max-width:180px}a{color:inherit}sup{font-size:7pt}@page{size:A4;margin:17mm}}'''
markup='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LORE対戦画面のデザイン・UX品質比較</title><style>'+css+'</style><nav aria-label="目次"><span class="label">目次</span>'+''.join(f'<a href="#{a}">{html.escape(t)}</a>' for a,t in toc)+'</nav><main>'+''.join(out)+'</main></html>'
(folder/'report.html').write_text(markup)
(folder/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
print('Rendered',len(toc),'sections and',len(sources),'sources')
