"""Hash and ZIP a validated mana delivery; standard-library Python only."""
from pathlib import Path
import json,hashlib,struct,zipfile,shutil
HERE=Path(__file__).resolve();OUT=HERE.parents[2]/'docs/3d-assets/2026-09-20-blender-mana-ui'
if HERE.parent.name=='source':OUT=HERE.parent.parent
else:
 for name in ['build_mana_ui.py','render_mana_context.py','check_mana_ui.cjs','package_mana_ui.py']:
  shutil.copy2(HERE.parent/name,OUT/'source'/name)
geometry=json.loads((OUT/'checks/geometry.json').read_text())
web=json.loads((OUT/'checks/webgl.json').read_text());fit=json.loads((OUT/'checks/board-fit.json').read_text())
assert web['passed'] and web['statesTested']==231 and fit['passed'] and not geometry['nonmanifold']
assert web['empty'] and web['optics']['cut']['bounces']==6
assert (OUT/'lore-mana-empty-frames.blend').is_file()
for asset in geometry['exports']:
 p=OUT/'web'/asset['file'];assert p.stat().st_size==asset['bytes']
 r=json.loads((OUT/'checks'/(asset['file']+'.validation.json')).read_text())
 assert not r['issues']['numErrors'] and not r['issues']['numWarnings']
manifest={'asset':'LORE Mana UI / component 02','version':'2.0','date':'2026-09-20','blender':'5.2.1 LTS','units':'meters','scope':'Editable model and isolated runtime preview; gameplay integration not performed','validation':{'gltf_errors':0,'gltf_warnings':0,'resource_states_passed':231,'board_fit_passed':True,'source_nonmanifold_edges':0},'files':[]}
for p in sorted(OUT.rglob('*')):
 if not p.is_file() or p.name in ['.DS_Store','manifest.json'] or p.suffix=='.blend1':continue
 data=p.read_bytes();e={'path':p.relative_to(OUT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 if p.suffix=='.png':e['image_size']=list(struct.unpack('>II',data[16:24]))
 manifest['files'].append(e)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
archive=OUT.parent/'LORE-mana-02-blender-delivery-v2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for e in manifest['files']:z.write(OUT/e['path'],'LORE-mana-02/'+e['path'])
 z.write(OUT/'manifest.json','LORE-mana-02/manifest.json')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for e in manifest['files']:
  data=z.read('LORE-mana-02/'+e['path']);assert len(data)==e['bytes'] and hashlib.sha256(data).hexdigest()==e['sha256']
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files_verified':len(manifest['files']),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},indent=2))
