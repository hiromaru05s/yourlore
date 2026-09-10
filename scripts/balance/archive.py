"""Archive completed JSONL logs losslessly; verify row counts and hashes."""
import gzip,hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]);manifest={}
for p in sorted((root/'raw').glob('*/games-*.jsonl*')):
 if p.name.endswith('.gz'):
  raw=gzip.decompress(p.read_bytes());gz=p
 else:
  raw=p.read_bytes();gz=p.with_suffix('.jsonl.gz')
  assert raw.endswith(b'\n'),p
  if gz.exists():raise RuntimeError(f'Both raw and compressed copies exist: {p}')
  gz.write_bytes(gzip.compress(raw,mtime=0))
  assert gzip.decompress(gz.read_bytes())==raw
  p.unlink()
 rows=raw.splitlines();ids=[json.loads(line)['id'] for line in rows];assert len(set(ids))==len(ids),p
 manifest[str(gz.relative_to(root))]={'games':len(rows),'rawSha256':hashlib.sha256(raw).hexdigest(),'gzipSha256':hashlib.sha256(gz.read_bytes()).hexdigest(),'bytes':len(raw)}
(root/'raw-manifest.json').write_text(json.dumps(manifest,indent=2));print('Archived',sum(v['games'] for v in manifest.values()),'games')
