"""Build runtime texture tiers from our authored source textures (Pillow + NumPy)."""
from PIL import Image
from pathlib import Path
import numpy as np
base=Path(__file__).resolve().parents[2]/'docs/3d-assets/2026-09-15-blender-reading-board/textures'
if (Path(__file__).parent/'layout-spec.json').exists():base=Path(__file__).resolve().parent.parent/'textures'
for level,color_size,data_size in [('lod0',2048,1024),('lod1',1024,512)]:
 dst=base/level;dst.mkdir(exist_ok=True)
 for f in base.glob('*.png'):
  im=Image.open(f);size=color_size if 'color' in f.stem else data_size
  im=im.resize((size,size),Image.Resampling.LANCZOS)
  if 'color' in f.stem:im.save(dst/(f.stem+'.jpg'),quality=94,subsampling=0,optimize=True)
  else:
   if 'normal' in f.stem:
    a=np.array(im).astype(float)/127.5-1
    a/=np.maximum(np.linalg.norm(a,axis=2,keepdims=True),1e-8)
    im=Image.fromarray(np.uint8(np.clip((a+1)*127.5,0,255)))
   im.save(dst/f.name,optimize=True)
