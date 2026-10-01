"""Bundle only component 03 deliverables, retaining relative paths and SHA-256s."""
from pathlib import Path
import json,hashlib,shutil,zipfile
HERE=Path(__file__).resolve();ROOT=HERE.parents[2]
OUT=HERE.parent.parent if HERE.parent.name=='source' else ROOT/'docs/3d-assets/2026-09-20-blender-deck-place'
if HERE.parent.name!='source':
 for name in ['build_deck_place.py','render_deck_place_context.py','check_deck_place.cjs','package_deck_place.py']:
  shutil.copy2(ROOT/'scripts/blender'/name,OUT/'source'/name)
def included(p):
 return p.is_file() and not p.name.endswith(('.blend1','.blend2','.pyc')) and p.name not in ['.DS_Store','manifest.json'] and '__pycache__' not in p.parts
files=sorted(p for p in OUT.rglob('*') if included(p))
manifest={'component':'03 deck place','revision':'v1','files':[{'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
archive=OUT.parent/'LORE-deck-03-blender-delivery-v1.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files+[OUT/'manifest.json']:z.write(p,Path('LORE-deck-03')/p.relative_to(OUT))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(json.dumps({'zip':str(archive),'bytes':archive.stat().st_size,'files':len(files)+1},indent=2))
