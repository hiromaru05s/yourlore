"""Check exported GLB geometry, not just Blender's source mesh. No dependencies."""
import json
import math
import struct
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'client/public/models/lore-table'
manifest = json.loads((OUT / 'manifest.json').read_text())
results = {}
for variant in ('standard', 'low'):
    meta = manifest['variants'][variant]
    path = ROOT / meta['file']
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    assert magic == 0x46546C67 and version == 2 and length == len(raw)
    json_length = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20+json_length])
    binary = raw[28+json_length:]
    assert hashlib.sha256(raw).hexdigest() == meta['sha256']
    assert len(raw) < 512 * 1024
    assert len(gltf['nodes']) == 1 and len(gltf['meshes']) == 1
    node = gltf['nodes'][0]
    assert node.get('translation', [0, 0, 0]) == [0, 0, 0]
    assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
    assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
    assert not any(gltf.get(key) for key in ('cameras', 'animations', 'skins', 'extensionsRequired'))
    assert all('uri' not in value for key in ('buffers', 'images') for value in gltf[key])
    assert len(gltf['materials']) == 3
    assert all(mat.get('alphaMode', 'OPAQUE') == 'OPAQUE' and 'normalTexture' not in mat for mat in gltf['materials'])

    def accessor(index):
        acc = gltf['accessors'][index]
        view = gltf['bufferViews'][acc['bufferView']]
        count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc['type']]
        fmt = '<' + {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[acc['componentType']] * count
        start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
        stride = view.get('byteStride', struct.calcsize(fmt))
        return [struct.unpack_from(fmt, binary, start + i*stride) for i in range(acc['count'])]

    positions, triangle_count, top_triangles = [], 0, 0
    for primitive in gltf['meshes'][0]['primitives']:
        assert primitive.get('mode', 4) == 4
        pos = accessor(primitive['attributes']['POSITION'])
        normals = accessor(primitive['attributes']['NORMAL'])
        indices = [value[0] for value in accessor(primitive['indices'])]
        positions.extend(pos)
        assert all(math.isfinite(value) for p in pos for value in p)
        assert all(abs(sum(v*v for v in normal)-1) < 1e-5 for normal in normals)
        for k in range(0, len(indices), 3):
            ids = indices[k:k+3]
            points = [pos[i] for i in ids]
            a = [points[1][j]-points[0][j] for j in range(3)]
            b = [points[2][j]-points[0][j] for j in range(3)]
            cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
            assert sum(v*v for v in cross) > 1e-18, 'Degenerate triangle'
            if all(abs(p[1]) < 1e-9 for p in points):
                assert cross[1] > 0, 'Top triangle faces down'
                assert all(abs(normals[i][1]-1) < 1e-7 for i in ids), 'Non-flat top normal'
                top_triangles += 1
            triangle_count += 1
    mins = [min(p[i] for p in positions) for i in range(3)]
    maxs = [max(p[i] for p in positions) for i in range(3)]
    assert all(abs(a-b) < 1e-6 for a, b in zip(mins, [-.8, -.075, -.51]))
    assert all(abs(a-b) < 1e-6 for a, b in zip(maxs, [.8, 0, .51]))
    assert top_triangles > 0 and triangle_count == meta['triangles']
    results[variant] = {'passed': True, 'bytes': len(raw), 'triangles': triangle_count,
                        'flat_top_triangles': top_triangles, 'bounds_min': mins, 'bounds_max': maxs,
                        'external_resources': 0, 'materials': len(gltf['materials'])}
path = ROOT / 'docs/3d-assets/2026-09-08-blender-table/geometry-check.json'
path.write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
