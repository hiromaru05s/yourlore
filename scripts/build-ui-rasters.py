"""Generate lossless WebP UI derivatives; preserve every PNG master for zoom/artwork.
Run with Python + Pillow. Frames: 512px wide, small seals: 256px wide.
"""
from pathlib import Path
from PIL import Image
import json
root = Path(__file__).resolve().parent.parent
art = root / 'client/public/art/biblion/modular'
report = []
for name in [f'{kind}-{card}' for kind in ['base', 'field'] for card in ['mon', 'spell', 'quest', 'trap']] + ['cost','attack','health','shield','dew','plaque','infinity']:
    src = art / f'{name}.png'
    target = art / f'{name}-ui.webp'
    image = Image.open(src).convert('RGBA')
    width = 512 if name.startswith(('base-', 'field-')) else 256
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(target, lossless=True, method=6)
    report.append({'name': name, 'sourceBytes': src.stat().st_size, 'uiBytes': target.stat().st_size, 'sourceSize': list(image.size), 'uiSize': [width, height]})
out = root / 'docs/performance/2026-09-30/ui-assets.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2) + '\n')
print('UI bytes:', sum(r['sourceBytes'] for r in report), '->', sum(r['uiBytes'] for r in report))
