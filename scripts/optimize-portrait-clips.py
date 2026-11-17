"""Lossless animated WebP copies of adopted GIFs, with frame/timing validation.
Requires Pillow and gif2webp. GIF authoring sources are retained unchanged.
"""
import hashlib
import json
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT/'client/public'
pairs = [(PUBLIC/'art/seekers/daylight-v1/idle.gif', PUBLIC/'art/seekers/daylight-v1/idle-loop.webp')]
pairs += [(p, PUBLIC/'art/npcs/reactions-webp-v1'/p.parent.name/(p.stem+'.webp')) for p in sorted((PUBLIC/'art/npcs/reactions-v1').glob('*/*.gif'))]
report = []
for src, dst in pairs:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['gif2webp', '-quiet', '-min_size', '-m', '6', str(src), '-o', str(dst)], check=True)
    a, b = Image.open(src), Image.open(dst)
    assert a.n_frames == b.n_frames and a.size == b.size
    # GIF repeats count excludes the initial play; WebP loop count includes it.
    loop = a.info.get('loop')
    expected_loop = 1 if loop is None else 0 if loop == 0 else loop+1
    assert b.info['loop'] == expected_loop
    delays = []
    for frame in range(a.n_frames):
        a.seek(frame); b.seek(frame)
        left, right = a.convert('RGBA'), b.convert('RGBA')
        assert left.getchannel('A').tobytes() == right.getchannel('A').tobytes()
        # RGB below fully transparent pixels is not visible. Verify on both
        # black and white, preserving every visible pixel and transparency.
        for color in ['black', 'white']:
            bg = Image.new('RGBA', a.size, color)
            assert Image.alpha_composite(bg,left).tobytes() == Image.alpha_composite(bg,right).tobytes(), (src,frame)
        assert a.info['duration'] == b.info['duration'], (src,frame,'timing')
        delays.append(a.info['duration'])
    before, after = src.stat().st_size, dst.stat().st_size
    assert after < before, src
    report.append({'source':'/'+str(src.relative_to(PUBLIC)), 'url':'/'+str(dst.relative_to(PUBLIC)), 'before':before, 'after':after, 'frames':a.n_frames, 'durations':delays, 'loop':expected_loop, 'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(), 'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(), 'visiblePixelsIdentical':True})
(ROOT/'docs/performance/2026-11-18/portrait-clips.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'clips':len(report),'frames':sum(x['frames'] for x in report),'before':sum(x['before'] for x in report),'after':sum(x['after'] for x in report)}))
