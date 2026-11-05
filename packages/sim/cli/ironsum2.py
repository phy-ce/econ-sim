# 철 체인 비교 표: python cli/ironsum2.py a.jsonl [해 목록]
import json, sys
from collections import defaultdict
ys = [int(x) for x in (sys.argv[2].split(',') if len(sys.argv) > 2 else '1,3,5,10,15,20'.split(','))]
R = defaultdict(list)
for l in open(sys.argv[1], encoding='utf8'):
    d = json.loads(l)
    if d.get('k') == 'all' and 'y' in d: R[(d['run'], d['y'])].append(d)
def m(rows, f):
    v = [f(r) for r in rows]; v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else float('nan')
g = lambda r, a, *b: (lambda x: x)(r.get(a) if not b else (r.get(a) or {}).get(b[0]))
runs = sorted({k[0] for k in R})
for run in runs:
    print('==', run, 'n', len(R[(run, 1)]))
    print(' y   gdp   pop  lvProd peas  sPeas sUnsk sGent sArist| oreS oreD oreL metS metD metL  eleS eleD eleL | tSD  tP   gov')
    for y in ys:
        rows = R.get((run, y))
        if not rows: continue
        lv = lambda t: m(rows, lambda r: (r.get('capLv') or {}).get(t, 0))
        sup = lambda x: m(rows, lambda r: (r.get('cap') or {}).get(x) if False else (r.get('sup') or {}).get(x))
        print(f"{y:3d} {m(rows,lambda r:r['gdp']):6.0f} {m(rows,lambda r:r['pop']):5.2f} {m(rows,lambda r:r.get('lvProd')):6.0f} {m(rows,lambda r:r.get('peas')):5.2f} {m(rows,lambda r:r.get('solPeas')):5.2f} {m(rows,lambda r:r.get('solUnsk')):5.2f} {m(rows,lambda r:r.get('solGent')):5.2f} {m(rows,lambda r:r.get('solArist')):5.2f} |", end='')
        for x, t in (('ore', 'ore'), ('metal', 'metal'), ('electronics', 'electronics')):
            print(f" {m(rows,lambda r:(r.get('sup') or {}).get(x)):6.1f} {m(rows,lambda r:(r.get('dem') or {}).get(x)):6.1f} {lv(t):4.1f}", end='')
        print(f" | {m(rows,lambda r:(r.get('sd') or {}).get('tools')):4.2f} {m(rows,lambda r:(r.get('price') or {}).get('tools')):4.2f} {m(rows,lambda r:r.get('stock.gov')):5.0f}")
