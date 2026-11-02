# 저택 지분 비교 요약 (wt-manor): python cli/manorsum.py out.jsonl [--k all|1|2|3] [--metrics a,b,...] [--runs ctl,on]
# cli/lab.sh 의 jsonl 에서 실행마다 해마다 시드·salt 평균 (min~max) 을 지표마다 표로 낸다. 기본 지표는 저택 지분 1단계 비교용.
import json, sys
from collections import defaultdict

args = sys.argv[1:]
def opt(k, d=None):
    return args[args.index(k) + 1] if k in args else d
files = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
K = opt('--k', 'all')
METRICS = opt('--metrics', 'adminSt,taxRatioAvg,gJobless,incArist,incGent,solArist,solGent,solPeas,solUnsk,gdpPre,treasury,manorCash,manorNav,mflow.mbuy.home,mflow.mbuy.away,mflow.mbuy.foreign,mflow.msell,mflow.mbuyback,mflow.absentee').split(',')
RUNS = opt('--runs')

def flat(d, pre=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, pre + k + '.'))
        elif isinstance(v, (int, float)) and not isinstance(v, bool): o[pre + k] = v
    return o

data = defaultdict(lambda: defaultdict(list))  # (run, metric) -> y -> [values]
order = []
for f in files:
    for line in open(f, encoding='utf-8'):
        if not line.startswith('{'): continue
        r = json.loads(line)
        if 'y' not in r or str(r['k']) != K: continue
        if r['run'] not in order: order.append(r['run'])
        fr = flat(r)
        for m in METRICS:
            if m in fr and fr[m] is not None: data[(r['run'], m)][r['y']].append(fr[m])
runs = RUNS.split(',') if RUNS else order
years = sorted({y for (run, m), ys in data.items() for y in ys})
for m in METRICS:
    print(f'\n## {m} (k={K}): 해마다 평균 (min~max)')
    print('run'.ljust(8) + ''.join(str(y).rjust(20) for y in years))
    for run in runs:
        ys = data.get((run, m))
        if not ys: continue
        cells = []
        for y in years:
            v = ys.get(y, [])
            cells.append((f'{sum(v)/len(v):.3g} ({min(v):.3g}~{max(v):.3g})' if len(v) > 1 else f'{v[0]:.3g}' if v else '-').rjust(20))
        print(run.ljust(8) + ''.join(cells))
