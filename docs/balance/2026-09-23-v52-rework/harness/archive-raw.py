import gzip,json,shutil,hashlib
from pathlib import Path
v=json.load(open('study-validation.json'));s=json.load(open('supplement/validation.json'));f=json.load(open('focused/results.json'));assert v['passed'] and s['passed'] and f['passed']
entries=[dict(path=x['path'],sha256=x['sha256']) for x in v['rawFiles']]+[dict(path=x['file'],sha256=x['sha256']) for x in s['files']]+[dict(path='focused/raw/games-0.jsonl',sha256=f['rawSha256'])]
archived=[]
for x in entries:
 p=Path(x['path']);assert p.suffix=='.jsonl'
 assert hashlib.file_digest(p.open('rb'),'sha256').hexdigest()==x['sha256']
 q=p.with_suffix('.jsonl.gz');assert not q.exists()
 with p.open('rb') as src,gzip.open(q,'wb',compresslevel=3) as dst:shutil.copyfileobj(src,dst)
 with gzip.open(q,'rb') as z:assert hashlib.file_digest(z,'sha256').hexdigest()==x['sha256']
 archived.append(dict(original=str(p),originalBytes=p.stat().st_size,originalSha256=x['sha256'],archive=str(q),archiveBytes=q.stat().st_size,archiveSha256=hashlib.file_digest(q.open('rb'),'sha256').hexdigest(),decompressionVerified=True));p.unlink()
 Path('archive-validation.json').write_text(json.dumps(dict(passed=len(archived)==len(entries),files=archived),indent=2)+'\n')
print('PASS lossless archive',len(archived),'files;',sum(x['originalBytes'] for x in archived),'->',sum(x['archiveBytes'] for x in archived),'bytes')
