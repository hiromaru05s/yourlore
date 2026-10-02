"""Package component 05 and the self-contained 01--05 assembly review."""
from pathlib import Path
import json,hashlib,shutil,zipfile
HERE=Path(__file__).resolve();ROOT=HERE.parents[2]
OUT=HERE.parent.parent if HERE.parent.name=='source' else ROOT/'docs/3d-assets/2026-09-21-blender-turn-button'
if HERE.parent.name!='source':
 for name in ['build_turn_button.py','assemble_lore_board.py','check_turn_button.cjs','package_turn_button.py']:
  shutil.copy2(ROOT/'scripts/blender'/name,OUT/'source'/name)
def included(p):
 return p.is_file() and not p.name.endswith(('.blend1','.blend2','.pyc')) and p.name not in ['.DS_Store','manifest.json'] and '__pycache__' not in p.parts
files=sorted(p for p in OUT.rglob('*') if included(p))
manifest={'asset':'LORE 05 end turn + 01--05 board assembly','revision':'v1','files':[{'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
archive=OUT.parent/'LORE-turn-button-05-and-board-assembly-v1.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files+[OUT/'manifest.json']:z.write(p,Path('LORE-turn-button-05-and-assembly')/p.relative_to(OUT))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for row in manifest['files']:assert hashlib.sha256(z.read('LORE-turn-button-05-and-assembly/'+row['path'])).hexdigest()==row['sha256']
print(json.dumps({'zip':str(archive),'bytes':archive.stat().st_size,'files':len(files)+1,'archive_hashes_verified':True},indent=2))
