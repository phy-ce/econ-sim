# 0b 측정 분석: python cli/labsum.py a.jsonl [b.jsonl ...] [--k 1] [--md 결과.md] [--empty 지표,지표,...]   (packages/sim 에서)
# 입력은 cli/lab.ts·lab.sh 의 jsonl. 판정 규칙은 docs/overhaul/0B_PREREG.md 를 그대로 따른다 (결과를 본 뒤 규칙을 바꾸지 않는다):
#   (a) 기준선 대역: 실행 'base' 의 salt 0..3, 해마다 지표마다 min–max (2장). K=4 대역 폭 ÷ 카드 기준 단위 한 줄.
#   (b) 단서: salt 0 실행 하나가 2년차부터 3년 이상 연속, 같은 부호로 같은 시드의 대역 밖 (2장). 국고 비용 누계를 같이.
#   (c) 효과: salt 1..3 이 있는 칸만, 5년차, 그 칸의 단서 지표에서 처방 4개와 대조(기준선) 4개가 완전히 갈리는가 (2장).
#   (d) E7: 기준선(salt 0) 시드 1~4 × 왕국 3 = 12칸, 19개 해마다 변화 중 기준 단위 × 0.5 이상이 5개 이상인 칸이 6칸 이상 (3장).
#   (e) 통과 기준 a)~e) (5장). (f) 거짓 단서율: base salt 4..7 이 있으면 (X01-f).
#   (g) 빈 해 (4장): --empty 로 E7 을 통과하고 사람이 확인한 지표 목록을 줄 때만 계산한다 (사전 등록 4장 순서).
# --k: 단서·효과·대역을 볼 범위 (기본 1 = 플레이어 왕국, 처방이 걸리는 곳. 'all' 이면 대륙).
import json, sys, os
from collections import defaultdict

CORE = [('solPeas', '소작농 생활수준'), ('solUnsk', '노동자 생활수준'), ('grain', '곡물 가격비'), ('gdp', '총생산'), ('stock.gov', '국고')]
# 기준 단위 (08 3.3.1, 사전 등록 3장: 단위 없는 비율 지표 0.25, 비중 지표 5%p). 지표 값의 단위: pop 백만, gdp·국고 백만
UNIT = {
    'peas': 0.05, 'solPeas': 0.25, 'solUnsk': 0.25, 'grain': 0.25, 'jobless': 0.05, 'pop': 0.1, 'gdp': 100, 'stock.gov': 100,
    'taxRatio': 0.05, 'lit': 0.05, 'classGap': 0.5, 'regionGap': 0.5, 'welShare': 0.05,
    'gdpPre': 100, 'debtLimit': 0.25, 'labShare': 0.05, 'wagePeas': 0.25, 'lowInc': 0.25, 'solLower': 0.25, 'fulfil': 0.25,
    'hub.tools': 0.25, 'hub.fuel': 0.25, 'hub.timber': 0.25, 'hub.metal': 0.25, 'hub.electronics': 0.25, 'hub.paper': 0.25,
    'realW.unskilled': None, 'backlog': None,
}
E7_GROUPS = [
    ('상단 바 후보 (04 S6)', ['pop', 'peas', 'wagePeas', 'lowInc']),
    ('비교용', ['solLower', 'fulfil', 'jobless']),
    ('카드 13 (08 3.3.1)', ['peas', 'solPeas', 'solUnsk', 'grain', 'jobless', 'pop', 'gdp', 'stock.gov', 'taxRatio', 'lit', 'classGap', 'regionGap', 'welShare']),
    ('검토 후보', ['realW.unskilled', 'gdpPre', 'debtLimit', 'hub.tools', 'hub.fuel', 'hub.timber', 'hub.metal', 'hub.electronics', 'hub.paper', 'labShare', 'backlog']),
    ('빈 해 다섯 (08 3.0)', ['peas', 'taxRatio', 'jobless', 'grain', 'solUnsk']),
]
EMPTY5 = ['peas', 'taxRatio', 'jobless', 'grain', 'solUnsk']
NAME = dict(CORE) | {'peas': '소작 비율', 'jobless': '실업', 'pop': '인구', 'taxRatio': '징수율', 'lit': '문해력', 'classGap': '계급 격차', 'regionGap': '지역 격차',
                     'welShare': '하층 소득 중 복지 비율', 'gdpPre': '세전 총생산', 'debtLimit': '한도 대비 부채', 'labShare': '노동 몫', 'wagePeas': '임금 ÷ 소작 소득',
                     'lowInc': '하층 소득 ÷ 생활비', 'solLower': '하층 생활수준', 'fulfil': '충족률', 'realW.unskilled': '실질 임금 (노동자, 고정 묶음)', 'backlog': '대기 일수'}
FALSE_ALARM = '0a null 에서 5지표 × 5년 가족 오경보율 45% (docs/overhaul/0A_PROBE.md)'


def flat(d, pre=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, pre + k + '.'))
        elif isinstance(v, (int, float)) and not isinstance(v, bool): o[pre + k] = v
    return o


def load(files):
    data = defaultdict(dict)  # (run, seed, salt, k) -> {y: flat row}
    logs = {}
    for f in files:
        for line in open(f, encoding='utf-8'):
            if not line.startswith('{'): continue
            r = json.loads(line)
            if 'log' in r: logs[(r['run'], r['seed'], r.get('salt', 0))] = r; continue
            if 'y' not in r: continue
            data[(r['run'], r['seed'], r.get('salt', 0), str(r['k']))][r['y']] = flat(r)
    return data, logs


def fmt(v, d=3):
    if v is None: return '—'
    if abs(v) >= 1000: return f'{v:,.0f}'
    return f'{v:.{d}g}' if abs(v) < 1 else f'{v:.{d}f}'.rstrip('0').rstrip('.')


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


class Sum:
    def __init__(self, data, logs, k):
        self.d, self.logs, self.k = data, logs, k
        self.out = []

    def p(self, *s): self.out.append(' '.join(str(x) for x in s))

    def series(self, run, seed, salt, metric, k=None):
        t = self.d.get((run, seed, salt, k or self.k), {})
        return {y: r.get(metric) for y, r in t.items()}

    def band(self, seed, metric, k=None, salts=(0, 1, 2, 3)):
        """{y: (min, max)} 기준선 salt 0..3 이 모두 있는 해만"""
        ss = [self.series('base', seed, s, metric, k) for s in salts]
        if not all(ss): return {}
        out = {}
        for y in ss[0]:
            vals = [s.get(y) for s in ss]
            if all(v is not None for v in vals): out[y] = (min(vals), max(vals))
        return out

    def seeds_of(self, run, salt=0):
        return sorted({s for (r, s, sa, k) in self.d if r == run and sa == salt and k == self.k})

    # (a)
    def sec_band(self):
        self.p('## (a) 기준선 대역 (base salt 0..3, 범위 k =', self.k, ')\n')
        seeds = [s for s in self.seeds_of('base') if self.band(s, 'gdp')]
        if not seeds: self.p('salt 0..3 이 다 있는 시드가 없다.\n'); return
        rows = []
        for m, nm in CORE:
            ws = []
            for s in seeds:
                for y, (lo, hi) in self.band(s, m).items(): ws.append(hi - lo)
            u = UNIT.get(m)
            rows.append([nm, m, fmt(u), fmt(sum(ws) / len(ws)) if ws else '—', fmt(max(ws)) if ws else '—', fmt(sum(ws) / len(ws) / u) if ws and u else '—'])
        self.p('K=4 대역 폭 대 카드 기준 단위 (해·시드 평균과 최대):\n')
        self.p(table(['지표', '키', '기준 단위', '폭 평균', '폭 최대', '폭 평균 ÷ 단위'], rows))
        for m, nm in CORE:
            self.p(f'\n{nm} ({m}) 해마다 min–max:\n')
            ys = sorted({y for s in seeds for y in self.band(s, m)})
            self.p(table(['해'] + [f'시드 {s}' for s in seeds], [[y] + [('%s–%s' % (fmt(b[y][0]), fmt(b[y][1]))) if y in b else '—' for b in [self.band(s, m) for s in seeds]] for y in ys]))
        self.p('')

    def clue(self, run, seed, salt, metric, k=None):
        """(부호, 연속 해 수): 2년차부터 같은 부호로 대역 밖인 가장 긴 연속. 대역이 없으면 None"""
        b = self.band(seed, metric, k)
        s = self.series(run, seed, salt, metric, k)
        if not b or not s: return None
        best, cur, sign = (0, 0), 0, 0
        for y in sorted(s):
            if y < 2 or y not in b or s[y] is None: cur, sign = 0, 0; continue
            lo, hi = b[y]
            g = 1 if s[y] > hi else -1 if s[y] < lo else 0
            if g != 0 and g == sign: cur += 1
            elif g != 0: cur, sign = 1, g
            else: cur, sign = 0, 0
            if cur > best[1]: best = (sign, cur)
        return best

    def treasury_cost(self, run, seed):
        a, b = self.series('base', seed, 0, 'treasury'), self.series(run, seed, 0, 'treasury')
        ys = sorted(set(a) & set(b))
        return (a[ys[-1]] - b[ys[-1]], ys[-1]) if ys else (None, None)

    # (b)
    def sec_clues(self):
        self.p('## (b) 단서: salt 0 실행 하나 대 기준선 대역 (2년차부터 3년 이상 연속, 같은 부호)\n')
        self.p('칸: + / − 와 연속 해 수 (3 미만은 ·). 국고 비용 = 기준선 순국고 − 처방 순국고 (마지막 해, 백만). 대역이 없는 시드(5~8 등)는 뺀다.\n')
        runs = sorted({r for (r, s, sa, k) in self.d if r != 'base' and sa == 0 and k == self.k})
        rows, self.clues = [], {}
        for run in runs:
            for seed in self.seeds_of(run):
                cells, any_band = [], False
                for m, _ in CORE:
                    c = self.clue(run, seed, 0, m)
                    if c is None: cells.append('—'); continue
                    any_band = True
                    if c[1] >= 3:
                        cells.append(('+' if c[0] > 0 else '−') + str(c[1]))
                        self.clues.setdefault((run, seed), []).append((m, c[0]))
                    else: cells.append('·')
                if not any_band: continue
                cost, yy = self.treasury_cost(run, seed)
                rows.append([run, seed] + cells + [fmt(cost) + (f' ({yy}년)' if yy else '')])
        self.p(table(['실행', '시드'] + [nm for _, nm in CORE] + ['국고 비용'], rows))
        n = sum(len(v) for v in self.clues.values())
        self.p(f'\n단서 {n}개 / 칸 {len(rows)}. 단서만으로는 효과라고 쓰지 않는다 (10 3.8).\n')

    # (c)
    def sec_effects(self):
        self.p('## (c) 효과: 단서가 뜬 칸, salt 0..3 처방 4개 대 기준선 4개, 5년차 (사전 등록 2장)\n')
        rows, self.effects, n = [], [], 0
        for (run, seed), ms in sorted(self.clues.items()):
            for m, sign in ms:
                t = [self.series(run, seed, s, m).get(5) for s in range(4)]
                c = [self.series('base', seed, s, m).get(5) for s in range(4)]
                if None in t or None in c: rows.append([run, seed, NAME.get(m, m), '처방 salt 1..3 없음 (2차 실행 필요)', '']); continue
                n += 1
                eff = '+' if min(t) > max(c) else '−' if max(t) < min(c) else ''
                if eff: self.effects.append((run, seed, m, eff))
                rows.append([run, seed, NAME.get(m, m), f'처방 {fmt(min(t))}–{fmt(max(t))} / 대조 {fmt(min(c))}–{fmt(max(c))}', eff or '갈리지 않음'])
        self.p(table(['실행', '시드', '지표', '5년차 범위', '효과'], rows) if rows else '단서가 뜬 칸이 없다.')
        self.p(f'\n판정 {n}개, 효과 {len(self.effects)}개. 참고: {FALSE_ALARM}. 판정 하나의 교환 가능 오경보 확률 2/70 ≈ 2.9% (10 3.8).\n')

    # (d)
    def e7(self):
        cells = [(s, k) for (r, s, sa, k) in self.d if r == 'base' and sa == 0 and k != 'all' and s in (1, 2, 3, 4)]
        res = {}
        for m in sorted({m for _, ms in E7_GROUPS for m in ms}):
            u = UNIT.get(m)
            if u is None: res[m] = None; continue
            passed, detail = 0, []
            for s, k in sorted(set(cells)):
                ser = self.series('base', s, 0, m, k)
                ys = sorted(y for y in ser if ser[y] is not None)
                ch = [abs(ser[y] - ser[y - 1]) for y in ys if y - 1 in ser and ser[y - 1] is not None]
                big = sum(1 for x in ch if x >= u * 0.5)
                detail.append(big)
                if big >= 5: passed += 1
            res[m] = (passed, len(set(cells)), detail)
        return res

    def sec_e7(self):
        self.p('## (d) E7: 해마다 변하는가 (기준선 salt 0, 시드 1~4 × 왕국, 20년)\n')
        res = self.e7()
        self.p('칸마다 19개 연말 값 변화 중 기준 단위 × 0.5 이상인 해 수. 통과 = 그 수가 5 이상인 칸이 12칸 중 6칸 이상.\n')
        for g, ms in E7_GROUPS:
            self.p(f'\n### {g}\n')
            rows = []
            for m in ms:
                r = res.get(m)
                if r is None: rows.append([NAME.get(m, m), m, '없음', '판정 못 함 (기준 단위 근거 없음)', '', '']); continue
                p, n, det = r
                rows.append([NAME.get(m, m), m, fmt(UNIT[m]), f'{p}/{n}', '통과' if p >= 6 and n >= 12 else ('칸 부족' if n < 12 else '못 함'), ' '.join(map(str, det))])
            self.p(table(['지표', '키', '단위', '통과 칸', 'E7', '칸별 큰 변화 해 수'], rows))
        ok5 = [m for m in EMPTY5 if res.get(m) and res[m][0] >= 6]
        self.p(f'\n빈 해 다섯 중 E7 통과: {len(ok5)} ({", ".join(ok5) or "없음"}).' + (' 3개 미만이라 빈 해 판정을 하지 않고 E7 을 통과한 검토 후보로 채운다 (사람 확인 뒤, 사전 등록 3장).' if len(ok5) < 3 else ' 남은 목록을 HANDOFF 에 적고 사용자 확인 뒤 --empty 로 빈 해를 계산한다 (사전 등록 4장).') + '\n')

    # (e)
    def sec_pass(self):
        self.p('## (e) 통과 기준 a)~e) (사전 등록 5장, 기준선 salt 0)\n')
        seeds = [s for s in (1, 2, 3, 4) if ('base', s, 0, 'all') in self.d]
        # a)
        rows = []
        for s in seeds:
            t = self.d[('base', s, 0, 'all')]
            goods = sorted({k[3:] for r in t.values() for k in r if k.startswith('sd.')})
            for g in goods:
                run, best, start = 0, (0, None), None
                for y in sorted(t):
                    v = t[y].get('sd.' + g)
                    if v is not None and v >= 2: run += 1; start = y - run + 1
                    else: run = 0
                    if run > best[0]: best = (run, start)
                if best[0] >= 5: rows.append([g, s, best[0], f'{best[1]}~{best[1] + best[0] - 1}년'])
        self.p('a) 연평균 S/D ≥ 2 가 5년 이상 연속인 상품 (대륙, 수요 이동평균 ≤ FLOW_ZERO 인 날은 S/D 를 세지 않는다):\n')
        self.p(table(['상품', '시드', '연속 해', '구간'], rows) if rows else '없음')
        # b)
        self.p('\nb) 생활수준이 하한 1.0 에서 떨어진 해 수 (연평균 ≥ 1.05, 20년 중):\n')
        rows = []
        for s in seeds:
            for k in sorted({k for (r, ss, sa, k) in self.d if r == 'base' and ss == s and sa == 0}, key=str):
                t = self.d[('base', s, 0, k)]
                rows.append([s, k, sum(1 for r in t.values() if (r.get('solPeasAvg') or 0) >= 1.05), sum(1 for r in t.values() if (r.get('solUnskAvg') or 0) >= 1.05), len(t)])
        self.p(table(['시드', '왕국', '소작농', '노동자', '해 수'], rows))
        # c)
        self.p('\nc) 총생산 궤적 (대륙, 1년차 대비):\n')
        ys = [1, 2, 5, 10, 15, 20]
        rows = []
        for s in seeds:
            g = self.series('base', s, 0, 'gdp', 'all')
            b0 = g.get(1)
            rows.append([s] + [fmt(g[y]) + (f' ({g[y] / b0:.2f})' if b0 else '') if g.get(y) is not None else '—' for y in ys])
        self.p(table(['시드'] + [f'{y}년' for y in ys], rows))
        # d)
        self.p('\nd) 20년 완주:\n')
        rows = [[s, max(self.d.get(('base', s, 0, 'all'), {0: 0})), '예' if max(self.d.get(('base', s, 0, 'all'), {0: 0})) >= 20 else '아니오'] for s in (1, 2, 3, 4)]
        self.p(table(['시드', '마지막 해', '완주'], rows))
        # e)
        self.p('\ne) 생활수준을 움직이는 동사 (c 의 효과 중 소작농·노동자 생활수준):\n')
        e = [x for x in getattr(self, 'effects', []) if x[2] in ('solPeas', 'solUnsk')]
        self.p(table(['실행', '시드', '지표', '방향'], [[r, s, NAME[m], d] for r, s, m, d in e]) if e else '효과 판정 없음 (2차 실행 전이면 당연히 없다)')
        self.p('')

    # (f)
    def sec_false(self):
        seeds = [s for s in (1, 2) if all(('base', s, sa, self.k) in self.d for sa in range(8))]
        self.p('## (f) 거짓 단서율 (X01-f): base salt 4..7 각각 대 salt 0..3 대역, 2~5년차\n')
        if not seeds: self.p('salt 0..7 이 다 있는 시드가 없다 (OPTIONAL=1 로 X01-f 를 돌리거나 0a 산출을 쓴다).\n'); return
        hit, tot, n = 0, 0, 0
        for s in seeds:
            for sa in range(4, 8):
                tot += 1
                cs = []
                for m, _ in CORE:
                    b = self.band(s, m)
                    ser = {y: v for y, v in self.series('base', s, sa, m).items() if y <= 5}
                    best, cur, sign = 0, 0, 0
                    for y in sorted(ser):
                        if y < 2 or y not in b: continue
                        g = 1 if ser[y] > b[y][1] else -1 if ser[y] < b[y][0] else 0
                        cur = cur + 1 if g and g == sign else (1 if g else 0); sign = g
                        best = max(best, cur)
                    if best >= 3: cs.append(m)
                n += len(cs)
                if cs: hit += 1
        self.p(f'실행 {tot}개 중 단서가 하나라도 뜬 실행 {hit}개 ({hit / tot:.0%}), 단서 {n}개 / 판정 {tot * len(CORE)}.\n')

    # (g)
    def sec_empty(self, metrics):
        self.p('## (g) 빈 해 (사전 등록 4장, 5~15년차, 기준선 salt 0, 시드 1~4 × 왕국)\n')
        self.p('지표: ' + ', '.join(metrics) + '. 문턱 = 기준 단위 × 1, 그리고 같은 시드·왕국·해의 K=4 대역 폭보다 커야 센다.\n')
        rows, over = [], 0
        for s in (1, 2, 3, 4):
            for k in sorted({k for (r, ss, sa, k) in self.d if r == 'base' and ss == s and sa == 0 and k != 'all'}, key=str):
                empty = 0
                for y in range(5, 16):
                    moved = 0
                    for m in metrics:
                        ser, b = self.series('base', s, 0, m, k), self.band(s, m, k)
                        if ser.get(y) is None or ser.get(y - 1) is None: continue
                        dv = abs(ser[y] - ser[y - 1])
                        if dv >= UNIT[m] and (y not in b or dv > b[y][1] - b[y][0]): moved += 1
                    if moved == 0: empty += 1
                share = empty / 11
                if share >= 0.5: over += 1
                rows.append([s, k, empty, f'{share:.0%}'])
        self.p(table(['시드', '왕국', '빈 해 (11년 중)', '비율'], rows))
        self.p(f'\n빈 해 비율 50% 이상인 칸 {over}개 / {len(rows)}. 6칸을 넘으면 "중반 원천이 모자란다" → {"넘음" if over > 6 else "넘지 않음"}.\n')


def main():
    args = sys.argv[1:]
    def opt(n, d=None):
        if n in args:
            i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
        return d
    k, md, empty = opt('--k', '1'), opt('--md'), opt('--empty')
    data, logs = load(args)
    S = Sum(data, logs, k)
    S.p(f'# 0b 측정 분석 (cli/labsum.py, 입력 {", ".join(os.path.basename(a) for a in args)})\n')
    S.sec_band(); S.sec_clues(); S.sec_effects(); S.sec_e7(); S.sec_pass(); S.sec_false()
    if empty: S.sec_empty(empty.split(','))
    text = '\n'.join(S.out)
    if md:
        open(md, 'w', encoding='utf-8').write(text)
        print(md)
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print(text)


if __name__ == '__main__':
    main()
