# 비교 결과 요약: python cli/sweepsum.py out.jsonl
import json, sys
from collections import defaultdict
g = defaultdict(list)
for l in open(sys.argv[1], encoding='utf-8'):
    if l.strip().startswith('{'): r = json.loads(l); g[json.dumps(r['tune'])].append(r)
keys = ['classGap', 'regionGap', 'taxRatio', 'pop', 'peas', 'jobless', 'levels', 'techs', 'grain', 'solPeas', 'foodPeas', 'solUnsk']
print('tune | ' + ' | '.join(f'{k} y5/y10/y20' for k in keys))
for t, v in g.items():
    cells = []
    for k in keys:
        cells.append('/'.join(f"{sum(r[y][k] for r in v) / len(v):.2f}".rstrip('0').rstrip('.') for y in ('y5', 'y10', 'y20')))
    print(t + ' | ' + ' | '.join(cells))
# 왕실 정책 요약 (sweep.ts 의 pol, 시드 평균)
pk = ['t5', 't1', 'run5', 'run1', 'chg', 'flip', 'wchg', 'debt', 'hoard']
if any('pol' in r for v in g.values() for r in v):
    print()
    print('tune | ' + ' | '.join(pk))
    for t, v in g.items():
        rs = [r['pol'] for r in v if 'pol' in r]
        print(t + ' | ' + ' | '.join(f"{sum(r.get(k, 0) for r in rs) / len(rs):.2f}" for k in pk))
