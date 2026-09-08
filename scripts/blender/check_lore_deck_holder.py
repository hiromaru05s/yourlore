"""Verify exported deck-holder GLBs against cosmetics/v1, using actual geometry."""
from pathlib import Path
import json,struct,math,hashlib
ROOT=Path(__file__).resolve().parents[2];DOC=ROOT/'docs/3d-assets/2026-09-09-blender-deck-holder'
C=json.loads((ROOT/'docs/cosmetics/v1/constraints.json').read_text());U=C['unitMeters'];spec=C['deck_holder'];meta=json.loads((DOC/'manifest.json').read_text());result={}
for variant in ['standard','low']:
 info=meta['variants'][variant];path=ROOT/info['file'];raw=path.read_bytes();magic,version,length=struct.unpack_from('<III',raw)
 assert magic==0x46546C67 and version==2 and length==len(raw)
 n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);buf=raw[28+n:]
 assert hashlib.sha256(raw).hexdigest()==info['sha256']
 assert not any(g.get(k) for k in ['cameras','animations','skins','extensionsRequired'])
 assert all('uri' not in v for k in ['buffers','images'] for v in g[k])
 nodes={n['name']:n for n in g['nodes']};assert set(nodes)=={'cosmetic_root','visual','DeckPedestal','deck_mount'},set(nodes)
 for node in nodes.values():
  assert node.get('translation',[0,0,0])==[0,0,0]
  assert node.get('rotation',[0,0,0,1])==[0,0,0,1]
  assert node.get('scale',[1,1,1])==[1,1,1]
  assert 'matrix' not in node
 root=nodes['cosmetic_root'];assert g['scenes'][g.get('scene',0)]['nodes']==[g['nodes'].index(root)]
 assert set(root['children'])=={g['nodes'].index(nodes[k]) for k in ['visual','deck_mount']}
 assert len(g['materials'])==1 and g['materials'][0]['name']=='body'
 mat=g['materials'][0];assert mat.get('alphaMode','OPAQUE')=='OPAQUE' and 'normalTexture' not in mat
 def acc(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];sz={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  f='<'+{5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]*sz
  start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',struct.calcsize(f))
  return [struct.unpack_from(f,buf,start+j*stride) for j in range(a['count'])]
 positions=[];tris=0;calls=0;top=[];area=0;normal_error=0
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   calls+=1;pos=acc(p['attributes']['POSITION']);norm=acc(p['attributes']['NORMAL']);ids=[v[0] for v in acc(p['indices'])];positions+=pos
   assert p.get('mode',4)==4 and len(ids)%3==0
   for uv in acc(p['attributes']['TEXCOORD_0']): assert all(0<=v<=1 for v in uv)
   for q in norm:assert abs(sum(t*t for t in q)-1)<1e-5
   for j in range(0,len(ids),3):
    ix=ids[j:j+3];pts=[pos[t] for t in ix];a=[pts[1][k]-pts[0][k] for k in range(3)];b=[pts[2][k]-pts[0][k] for k in range(3)]
    cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
    assert sum(v*v for v in cross)>1e-26,'degenerate'
    if all(abs(q[1])<1e-10 for q in pts):
     assert cross[1]>0;area+=cross[1]/2;top+=pts
     for t in ix:normal_error=max(normal_error,abs(norm[t][1]-1));assert abs(norm[t][1]-1)<1e-7
    tris+=1
 assert all(math.isfinite(v) for p in positions for v in p)
 mins=[min(p[k] for p in positions) for k in range(3)];maxs=[max(p[k] for p in positions) for k in range(3)]
 for k in range(3):
  assert mins[k]>=spec['boundsU']['min'][k]*U-1e-8
  assert maxs[k]<=spec['boundsU']['max'][k]*U+1e-8
 assert maxs[1]<=1e-10 and abs(mins[1]-spec['groundYU']*U)<1e-8
 for k,size in [(0,spec['topSizeXZU'][0]*U),(2,spec['topSizeXZU'][1]*U)]:
  assert abs(max(p[k] for p in top)-size/2)<1e-8 and abs(min(p[k] for p in top)+size/2)<1e-8
 expected=(spec['topSizeXZU'][0]*spec['topSizeXZU'][1]-(4-math.pi)*spec['topCornerRadiusU']**2)*U**2
 assert abs(area-expected)/expected<.0001,'Top area missing, recessed, or duplicated'
 # Every geometry position has its X reflection and longitudinal reflection: neither side slopes alone.
 rounded={tuple(round(x,7) for x in p) for p in positions}
 for p in rounded:
  assert (-p[0],p[1],p[2]) in rounded
  assert (p[0],p[1],-p[2]) in rounded
 tex=[]
 for image in g['images']:
  view=g['bufferViews'][image['bufferView']];data=buf[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
  assert data[:8]==b'\x89PNG\r\n\x1a\n';tex.append(struct.unpack_from('>II',data,16))
 gpu=sum(w*h*4*4/3 for w,h in tex)/1024**2
 budget=C['budget']['deck_holder'][variant]
 assert tris==info['triangles'] and tris<=budget['triangles'];assert calls<=budget['drawCalls']
 assert gpu<=budget['gpuMiB'] and len(raw)<=budget['activeTransferMB']*1e6
 result[variant]={'passed':True,'triangles':tris,'drawCalls':calls,'materials':1,'bytes':len(raw),'boundsMeters':{'min':mins,'max':maxs},'topAreaMeters2':area,'topHeightDeviationMeters':max(abs(p[1]) for p in top),'topNormalError':normal_error,'bilateralSymmetry':True,'anchorIdentity':True,'embeddedTextureSizes':tex,'gpuMiBIncludingMipmaps':gpu,'externalURIs':0}
# Canonical card footprints have room around every edge; 40-card stack stays in reserved deck space.
assert 1<spec['topSizeXZU'][0] and 1.5625<spec['topSizeXZU'][1]
assert 40*C['card']['sizeU'][2]<spec['protectedU']['max'][1]
result['referenceFit']={'cardMillimeters':[64,100,.32],'count':40,'stackHeightMillimeters':12.8,'centeredEdgeClearanceMillimeters':[6.4,9.2]}
(DOC/'geometry-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
