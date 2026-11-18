import json, sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
A = json.load(open(os.path.join(a, 'dump.json'))); B = json.load(open(os.path.join(b, 'dump.json')))
bad = 0
for k in sorted(set(A['states']) | set(B['states'])):
    sa, sb = A['states'].get(k), B['states'].get(k)
    if sa is None or sb is None: print('MISSING STATE', k); bad += 1; continue
    sa.pop('__root',None); sb.pop('__root',None); keys = set(sa) | set(sb); diff = [p for p in keys if sa.get(p, [None]*6)[:6] != sb.get(p, [None]*6)[:6]]
    pix = ''
    pa, pb = os.path.join(a, k + '.png'), os.path.join(b, k + '.png')
    if os.path.exists(pa) and os.path.exists(pb):
        d = ImageChops.difference(Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')).getbbox()
        pix = 'pixels same' if d is None else f'pixels differ {d}'
    if diff or (pix and pix != 'pixels same'):
        bad += 1; print(f'DIFF {k}: {len(diff)} elements, {pix}')
        for p in sorted(diff)[:6]:
            x, y = sa.get(p), sb.get(p)
            what = 'only before' if y is None else 'only after' if x is None else ('rect' if x[:4] != y[:4] else '') + (' style' if x[4] != y[4] else '') + (' pseudo' if x[5] != y[5] else '')
            print('   ', what, p[-70:], (x or y)[6])
print(f'states {len(A["states"])}/{len(B["states"])}, differing {bad}')
sys.exit(1 if bad else 0)
