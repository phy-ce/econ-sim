# 흐름 요약: python cli/flowsum.py out.jsonl [...]  (sweep.ts 의 traj, 해마다 기록)
# 조정값마다 시드 평균으로, 지표별 기간 평균(1~5년 / 6~10년 / 11년~끝)과 전체 평균, 가장 낮은 해의 값(min)을 낸다.
# 환경 변수 S="1 2" 로 시드를 고른다
import json, os, sys
from collections import defaultdict
keys = ['pop', 'solPeas', 'solUnsk', 'foodPeas', 'gdp', 'levels', 'grain', 'peas']
seeds = set(int(x) for x in os.environ['S'].split()) if os.environ.get('S') else None
g = defaultdict(list)
for f in sys.argv[1:]:
    for l in open(f, encoding='utf-8'):
        if not l.startswith('{'): continue
        r = json.loads(l)
        if 'traj' in r and (seeds is None or r['seed'] in seeds): g[json.dumps(r['tune'])].append(r['traj'])
fmt = lambda x: f'{x:.3g}'
print('tune n | ' + ' | '.join(f'{k} 1-5/6-10/11-/all/min' for k in keys))
for t, runs in g.items():
    cells = []
    for k in keys:
        def avg(lo, hi):
            v = [p[k] for tr in runs for p in tr if lo <= p['y'] <= hi]
            return sum(v) / len(v) if v else float('nan')
        years = sorted({p['y'] for tr in runs for p in tr})
        per = [sum(p[k] for tr in runs for p in tr if p['y'] == y) / len(runs) for y in years]
        cells.append('/'.join(fmt(x) for x in (avg(1, 5), avg(6, 10), avg(11, 99), avg(1, 99), min(per))))
    print(f'{t} {len(runs)} | ' + ' | '.join(cells))
