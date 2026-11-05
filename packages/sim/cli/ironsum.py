# irondiag 요약: python cli/ironsum.py 파일.jsonl [해 목록]
import json, sys
ys = [int(x) for x in (sys.argv[2].split(',') if len(sys.argv) > 2 else '1,3,5,7,10'.split(','))]
for l in open(sys.argv[1], encoding='utf8'):
    d = json.loads(l)
    if d['y'] not in ys: continue
    if 'goods' in d:
        print('Y', d['y'], {k: (v['S'], v['D'], v['p']) for k, v in d['goods'].items()})
    else:
        print('  k', d['k'], d['lv'], 'LAT', {k: v for k, v in d['latent'].items() if 'metal' in k or 'ore' in k or 'electronics' in k}, {k: v.split(' sites')[0] + ' s' + v.split('sites ')[1].replace(' staffed ', '/') for k, v in d['supply'].items()})
