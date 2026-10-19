# 비교 결과 요약: python cli/sweepsum.py out.jsonl
# 열은 y5/y10/y20 (20년 실행). 더 짧은 실행(YEARS)이면 결과에 있는 해를 모두 쓴다
import json, re, sys
from collections import defaultdict
g = defaultdict(list)
for l in open(sys.argv[1], encoding='utf-8'):
    if l.strip().startswith('{'): r = json.loads(l); g[json.dumps(r['tune'])].append(r)
rows = [r for v in g.values() for r in v]
ys = [y for y in ('y5', 'y10', 'y20') if rows and all(y in r for r in rows)]
if not ys:
    ys = sorted({k for r in rows for k in r if re.fullmatch(r'y\d+', k) and all(k in x for x in rows)}, key=lambda k: int(k[1:]))
keys = ['classGap', 'regionGap', 'taxRatio', 'pop', 'peas', 'jobless', 'levels', 'techs', 'grain', 'solPeas', 'foodPeas', 'solUnsk']
print('tune | ' + ' | '.join(f'{k} {"/".join(ys)}' for k in keys))
for t, v in g.items():
    cells = []
    for k in keys:
        cells.append('/'.join(f"{sum(r[y][k] for r in v) / len(v):.2f}".rstrip('0').rstrip('.') for y in ys))
    print(t + ' | ' + ' | '.join(cells))
# 임금·건물 현금 (있을 때만): 노동자·기술자 평균 임금, 건물 현금 합(M), 민간 투자 자금(M), 주간 보조금(k), 적자 건물 레벨
wk = ['wUnsk', 'wSk', 'bcash', 'pcash', 'subWk', 'lossLv']
if any('wUnsk' in r.get('y5', {}) for v in g.values() for r in v):
    print()
    print('tune | ' + ' | '.join(f'{k} y5/y10/y20' for k in wk))
    for t, v in g.items():
        print(t + ' | ' + ' | '.join('/'.join(f"{sum(r[y].get(k, 0) for r in v) / len(v):.2f}".rstrip('0').rstrip('.') for y in ('y5', 'y10', 'y20')) for k in wk))
# 보조금/국고 수입, 노동자 임금 흩어짐(변동계수), 왕실 건물 충원율 (있을 때만)
ek = ['subRev', 'wCv', 'fill_admin', 'fill_school', 'fill_builder']
if any('wCv' in r.get('y5', {}) for v in g.values() for r in v):
    print()
    print('tune | ' + ' | '.join(f'{k} y5/y10/y20' for k in ek) + ' | flipW | foodMin')
    for t, v in g.items():
        print(t + ' | ' + ' | '.join('/'.join(f"{sum(r[y].get(k, 0) for r in v) / len(v):.3f}".rstrip('0').rstrip('.') for y in ('y5', 'y10', 'y20')) for k in ek)
              + f" | {sum(r.get('flipW', 0) for r in v) / len(v):.3f} | {sum(float(r.get('foodMin', 0)) for r in v) / len(v):.2f}")
# 왕실 정책 요약 (sweep.ts 의 pol, 시드 평균)
pk = ['t5', 't1', 'run5', 'run1', 'chg', 'flip', 'sub', 'debt', 'hoard']
if any('pol' in r for v in g.values() for r in v):
    print()
    print('tune | ' + ' | '.join(pk))
    for t, v in g.items():
        rs = [r['pol'] for r in v if 'pol' in r]
        print(t + ' | ' + ' | '.join(f"{sum(r.get(k, 0) for r in rs) / len(rs):.2f}" for k in pk))
# 실행 시간 (TIMING=1 로 돌렸을 때만): 실행 수, 시뮬레이션 초 평균·최대, 하루 평균 ms
if any('time' in r for r in rows):
    print()
    print('tune | runs | sim s mean/max | ms/day')
    for t, v in g.items():
        ts = [r['time'] for r in v if 'time' in r]
        if not ts: continue
        ms = [x['ms'] for x in ts]
        print(f"{t} | {len(ts)} | {sum(ms) / len(ms) / 1000:.1f}/{max(ms) / 1000:.1f} | {sum(x['msPerDay'] for x in ts) / len(ts):.2f}")
