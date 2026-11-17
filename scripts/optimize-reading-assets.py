"""Rebuild lossless runtime assets from the adopted originals.

Requires Pillow and cwebp. Geometry, animation, materials and decoded RGBA pixels
are preserved. Shared content-addressed textures avoid downloading the same
paint repeatedly inside separate GLBs. Originals remain available for authoring.
"""
import hashlib
import io
import json
from pathlib import Path
import struct
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'client/public'
SOURCE = PUBLIC / 'models/reading-board/v1'
DEST = PUBLIC / 'models/reading-board/v2-shared'
TEXTURES = PUBLIC / 'models/reading-board/shared-textures'
DEST.mkdir(exist_ok=True)
TEXTURES.mkdir(exist_ok=True)
report = {'models': [], 'images': [], 'ui': []}
converted = {}

def lossless(data):
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp)/'source.png', Path(tmp)/'output.webp'
        src.write_bytes(data)
        subprocess.run(['cwebp', '-quiet', '-lossless', '-exact', '-metadata', 'icc', '-m', '6', str(src), '-o', str(dst)], check=True)
        result = dst.read_bytes()
    a, b = Image.open(io.BytesIO(data)).convert('RGBA'), Image.open(io.BytesIO(result)).convert('RGBA')
    assert a.size == b.size and a.tobytes() == b.tobytes(), 'Lossless pixel parity'
    return result

def shared_image(data, mime):
    key = hashlib.sha256(data).hexdigest()
    if key in converted:
        return converted[key]
    if mime == 'image/png':
        webp = lossless(data)
        if len(webp) < len(data):
            data, mime = webp, 'image/webp'
    suffix = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'}[mime]
    path = TEXTURES / (hashlib.sha256(data).hexdigest() + suffix)
    path.write_bytes(data)
    result = ('/' + str(path.relative_to(PUBLIC)), mime)
    report['images'].append({'url': result[0], 'bytes': len(data), 'sourceHash': key})
    converted[key] = result
    return result

for source in sorted(SOURCE.glob('*.glb')):
    raw = source.read_bytes()
    assert raw[:4] == b'glTF'
    json_size = struct.unpack_from('<I', raw, 12)[0]
    model = json.loads(raw[20:20+json_size])
    binary = raw[28+json_size:]
    views = model.get('bufferViews', [])
    image_views = set()
    webp_sources = set()
    for index, image in enumerate(model.get('images', [])):
        old = image.pop('bufferView')
        image_views.add(old)
        view = views[old]
        assert view['buffer'] == 0
        start, size = view.get('byteOffset', 0), view['byteLength']
        url, image['mimeType'] = shared_image(binary[start:start+size], image['mimeType'])
        image['uri'] = '../shared-textures/' + url.rsplit('/', 1)[1]
        if image['mimeType'] == 'image/webp':
            webp_sources.add(index)
    # Keep every vertex/index byte; only remove image buffers and padding.
    data = bytearray()
    mapping, new_views = {}, []
    for index, view in enumerate(views):
        if index in image_views:
            continue
        assert view['buffer'] == 0
        while len(data) % 4:
            data.append(0)
        start, size = view.get('byteOffset', 0), view['byteLength']
        new_view = {**view, 'byteOffset': len(data)}
        data.extend(binary[start:start+size])
        assert data[new_view['byteOffset']:new_view['byteOffset']+size] == binary[start:start+size]
        mapping[index] = len(new_views)
        new_views.append(new_view)
    def remap(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == 'bufferView':
                    value[key] = mapping[child]
                else:
                    remap(child)
        elif isinstance(value, list):
            for child in value:
                remap(child)
    remap(model)
    model['bufferViews'] = new_views
    model['buffers'] = [{'byteLength': len(data)}]
    for texture in model.get('textures', []):
        if texture.get('source') in webp_sources:
            texture.setdefault('extensions', {})['EXT_texture_webp'] = {'source': texture.pop('source')}
    if webp_sources:
        for field in ['extensionsUsed', 'extensionsRequired']:
            if 'EXT_texture_webp' not in model.setdefault(field, []):
                model[field].append('EXT_texture_webp')
    encoded = json.dumps(model, ensure_ascii=False, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    data += b'\0' * (-len(data) % 4)
    output = struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(data)) + struct.pack('<I4s', len(encoded), b'JSON') + encoded + struct.pack('<I4s', len(data), b'BIN\0') + data
    (DEST/source.name).write_bytes(output)
    report['models'].append({'name': source.name, 'before': len(raw), 'after': len(output), 'geometryBytesVerified': sum(v['byteLength'] for v in new_views)})

for source in SOURCE.glob('*.json'):
    (DEST/source.name).write_bytes(source.read_bytes())

for name in ['stat-cost', 'button-idle', 'portrait-self', 'portrait-opp']:
    source = PUBLIC / f'art/biblion/refined/{name}.png'
    raw = source.read_bytes()
    result = lossless(raw)
    assert len(result) < len(raw)
    source.with_suffix('.webp').write_bytes(result)
    report['ui'].append({'name': name, 'before': len(raw), 'after': len(result), 'rgbaIdentical': True})

urls = sorted(x['url'] for x in report['images'])
(ROOT/'client/src/ui/readingTextureAssets.ts').write_text('/** Generated by scripts/optimize-reading-assets.py; exact shared model pixels. */\nexport const READING_TEXTURE_ASSETS = '+json.dumps(urls)+';\n')
out = ROOT/'docs/performance/2026-11-18'
out.mkdir(parents=True, exist_ok=True)
(out/'lossless-assets.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'modelsBefore': sum(x['before'] for x in report['models']), 'modelsAfter': sum(x['after'] for x in report['models']), 'sharedTextures': sum(x['bytes'] for x in report['images']), 'uiBefore': sum(x['before'] for x in report['ui']), 'uiAfter': sum(x['after'] for x in report['ui'])}))
