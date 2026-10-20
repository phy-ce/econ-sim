# 해마다 그래프: python cli/trajchart.py out.png out.jsonl [...]  (sweep.ts 의 traj)
# 조정값마다 시드 평균 선 하나, 지표마다 칸 하나. 환경 변수 K="gdp pop" 로 지표를, S="1 2" 로 시드를, L="main,new" 로 선 이름을 고른다
import json, os, sys
from collections import defaultdict
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

for font in ('Malgun Gothic', 'NanumGothic', 'Noto Sans CJK KR'):
    if any(font == f.name for f in matplotlib.font_manager.fontManager.ttflist):
        plt.rcParams['font.family'] = font
        break
plt.rcParams['axes.unicode_minus'] = False

out, files = sys.argv[1], sys.argv[2:]
seeds = set(int(x) for x in os.environ['S'].split()) if os.environ.get('S') else None
runs = defaultdict(list)
for f in files:
    for l in open(f, encoding='utf-8'):
        if not l.startswith('{'): continue
        r = json.loads(l)
        if 'traj' in r and (seeds is None or r['seed'] in seeds): runs[json.dumps(r['tune'])].append(r['traj'])
if not runs: sys.exit('traj 가 있는 줄이 없다')
keys = os.environ['K'].split() if os.environ.get('K') else sorted({k for rs in runs.values() for tr in rs for p in tr for k in p if k != 'y'})
names = os.environ['L'].split(',') if os.environ.get('L') else list(runs)

cols = min(3, len(keys)); rows = (len(keys) + cols - 1) // cols
fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 3.2 * rows), squeeze=False)
for i, k in enumerate(keys):
    ax = axes[i // cols][i % cols]
    for j, (t, rs) in enumerate(runs.items()):
        years = sorted({p['y'] for tr in rs for p in tr})
        ys = []
        for y in years:
            v = [p[k] for tr in rs for p in tr if p['y'] == y and k in p]
            ys.append(sum(v) / len(v) if v else float('nan'))
        ax.plot(years, ys, marker='.', label=names[j] if j < len(names) else t)
    ax.set_title(k); ax.set_xlabel('년'); ax.grid(alpha=.3)
    ax.set_xticks(range(0, max(p['y'] for rs in runs.values() for tr in rs for p in tr) + 1, 2))
for i in range(len(keys), rows * cols): axes[i // cols][i % cols].axis('off')
axes[0][0].legend(fontsize=8)
fig.tight_layout(); fig.savefig(out, dpi=110)
print(out)
