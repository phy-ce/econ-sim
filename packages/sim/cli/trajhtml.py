# 해마다 그래프를 브라우저에서 보는 HTML 한 장: python cli/trajhtml.py out.html a.jsonl [b.jsonl ...]  (sweep.ts 의 traj)
# 조정값마다 실행 하나(시드 평균 또는 시드별), 지표는 왼쪽 목록에서 고른다. 그래프 위에 마우스를 올리면 그해 값, "표 보기"는 해마다 표.
# 환경 변수: L="main,새 규칙" 실행 이름, TITLE 제목, DESC 한 줄 설명, K="gdp levels" 처음 보일 지표, S="1 2" 시드
# 해마다 한 줄 파일({"y":1,"seed":1,"gdp":..,"stock":{..}} 처럼, 진단 스크립트 출력)도 읽는다: 인자를 "이름=파일"로 주면
# 같은 이름의 파일들이 시드별로 한 실행이 되고, 안쪽 사전은 "stock.gov" 처럼 펼친다
import json, os, sys, hashlib

LABELS = {
    # 경제
    'gdp': ('총생산', '경제', '백만/주'), 'levels': ('건물 레벨', '경제', ''), 'revWk': ('왕실 세입', '재정', '천/주'),
    'privCash': ('민간 현금', '재정', '백만'), 'taxRatio': ('징수율', '재정', ''), 'grain': ('곡물값 (기준 대비)', '시장', ''),
    'oreP': ('철광석 값 (기준 대비)', '시장', ''), 'metalP': ('철 값 (기준 대비)', '시장', ''),
    'oreSup': ('철광석 공급', '시장', '천/일'), 'oreDem': ('철광석 수요', '시장', '천/일'),
    'metalSup': ('철 공급', '시장', '천/일'), 'metalDem': ('철 수요', '시장', '천/일'),
    'mineLv': ('철광산 레벨', '경제', ''), 'mineSt': ('철광산 충원율', '경제', ''),
    # 인구
    'pop': ('인구', '인구', '백만'), 'peas': ('소작농 비율', '인구', ''), 'jobless': ('실업률', '인구', ''), 'joblessSk': ('기술자 실업률', '인구', ''),
    'ariK': ('상급 귀족 수', '인구', '천'), 'genK': ('하급 귀족 수', '인구', '천'), 'cells': ('소작지 칸', '인구', ''),
    # 생활수준
    'solPeas': ('소작농 생활수준', '생활수준', ''), 'solUnsk': ('노동자 생활수준', '생활수준', ''), 'solSk': ('기술자 생활수준', '생활수준', ''),
    'solGen': ('하급 귀족 생활수준', '생활수준', ''), 'foodPeas': ('소작농 식량 충족', '생활수준', ''),
    'incAri': ('상급 귀족 1인 소득', '소득', '/일'), 'incGen': ('하급 귀족 1인 소득', '소득', '/일'), 'incSk': ('기술자 1인 소득', '소득', '/일'),
    'incUnsk': ('노동자 1인 소득', '소득', '/일'), 'ariSk': ('귀족 ÷ 기술자 소득', '소득', '배'),
    # 소유
    'manOwn': ('저택 소유 레벨', '소유', ''), 'ariSeat': ('저택 상급 귀족 자리', '소유', '천'),
    # 행정·정부
    'admHer': ('세습 관료제 레벨', '정부', ''), 'admPro': ('전문 관료제 레벨', '정부', ''), 'admFill': ('행정청 충원율', '정부', ''),
    'admWage': ('행정청 임금', '정부', '천/일'), 'admSk': ('행정청 기술자', '정부', '천'), 'admGen': ('행정청 하급 귀족', '정부', '천'),
    'wIdx': ('국영 임금 지수', '정부', ''), 'wStep': ('국영 임금 배율', '정부', ''),
    'gAdmSh': ('하급 귀족: 행정청', '하급 귀족 일자리', ''), 'gManSh': ('하급 귀족: 저택', '하급 귀족 일자리', ''),
    'gTutSh': ('하급 귀족: 가정교사', '하급 귀족 일자리', ''), 'gIdleSh': ('하급 귀족: 실업', '하급 귀족 일자리', ''),
}
GROUPS = ['경제', '생활수준', '소득', '인구', '돈', '임금', '재정', '시장', '일자리', '왕실 장부', '민간 장부', '소유', '정부', '하급 귀족 일자리', '기타']
# 해마다 한 줄 파일 (cli 진단: .tmp/col/collapse.ts) 의 지표 이름
FLAT = {
    'peas': ('소작농 수', '인구', '백만'), 'sellThru': ('팔린 비율', '시장', ''), 'util': ('가동률', '경제', ''), 'food': ('식량 충족', '생활수준', ''),
    'stock.savAll': ('가계 현금 합', '돈', '백만'), 'stock.gov': ('왕실 국고', '돈', '백만'), 'stock.govDebt': ('왕실 빚', '돈', '백만'),
    'stock.firm': ('상회 금고', '돈', '백만'), 'stock.man': ('저택 금고', '돈', '백만'), 'stock.fin': ('금융가 금고', '돈', '백만'),
    'stock.pool': ('투자 풀', '돈', '백만'), 'stock.traders': ('상인 현금', '돈', '백만'), 'stock.total': ('총통화', '돈', '백만'), 'stock.minted': ('주조', '돈', '백만'),
    'stock.savPeas': ('소작농 현금', '돈', '백만'), 'stock.savUnsk': ('노동자 현금', '돈', '백만'), 'stock.savFarm': ('농부 현금', '돈', '백만'),
    'stock.savSk': ('기술자 현금', '돈', '백만'), 'stock.savEx': ('전문가 현금', '돈', '백만'), 'stock.savGen': ('하급 귀족 현금', '돈', '백만'),
    'stock.savAri': ('상급 귀족 현금', '돈', '백만'), 'stock.fundVal': ('금융가 지분 가치', '돈', '백만'), 'stock.wfund': ('주인 없는 돈', '돈', '백만'),
    'wage.pU': ('노동자 임금 (민간)', '임금', '/일'), 'wage.pS': ('기술자 임금 (민간)', '임금', '/일'), 'wage.pF': ('농부 임금 (민간)', '임금', '/일'),
    'wage.sU': ('노동자 임금 (국영)', '임금', '/일'), 'wage.sS': ('기술자 임금 (국영)', '임금', '/일'),
    'lv.priv': ('민간 레벨', '경제', ''), 'lv.state': ('국영 레벨', '경제', ''), 'lv.office': ('건축사무소 레벨', '경제', ''),
    'cons.priv': ('민간 공사', '경제', ''), 'cons.state': ('국영 공사', '경제', ''),
}
for g in ['grain', 'food', 'cloth', 'furniture', 'timber', 'fiber', 'tools', 'metal', 'fuel', 'ore', 'meat', 'paper']:
    FLAT['price.' + g] = (g + ' 값 (기본가 대비)', '시장', '')
for side, nm in (('govL', '왕실'), ('privL', '민간')):
    for k, ko in (('sales', '매출'), ('tax', '세금'), ('mint', '주조'), ('buildFees', '공사비 수입'), ('wages', '임금'), ('inputs', '원료'), ('research', '연구'),
                  ('interest', '이자'), ('dividends', '배당'), ('investment', '투자'), ('buildPaid', '공사비 지출')):
        FLAT[f'{side}.{k}'] = (f'{nm} 장부: {ko}', nm + ' 장부', '백만/년')
for k in ['unskilled', 'farmer', 'skilled', 'expert', 'gentry']:
    FLAT['jobs.' + k] = (k + ' 일자리', '일자리', '천')
DEFAULTS = ['gdp', 'levels', 'solUnsk', 'solPeas', 'peas', 'revWk', 'taxRatio', 'privCash', 'jobless']

def flat(d, pre=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, pre + k + '.'))
        elif isinstance(v, (int, float)) and not isinstance(v, bool): o[pre + k] = v
    return o

out, files = sys.argv[1], sys.argv[2:]
seeds_only = set(int(x) for x in os.environ['S'].split()) if os.environ.get('S') else None
runs, flat_mode = {}, False
for a in files:
    name, f = a.split('=', 1) if '=' in a and not os.path.exists(a) else (None, a)
    for l in open(f, encoding='utf-8'):
        if not l.startswith('{'): continue
        r = json.loads(l)
        if seeds_only and r.get('seed') not in seeds_only: continue
        if 'traj' in r:
            t = name or json.dumps(r['tune'], ensure_ascii=False)
            runs.setdefault(t, {})[str(r['seed'])] = r['traj']
        elif 'y' in r:
            flat_mode = True
            p = flat(r); p.pop('seed', None)
            runs.setdefault(name or os.path.basename(f), {}).setdefault(str(r.get('seed', 0)), []).append(p)
if flat_mode: LABELS.update(FLAT)
if not runs: sys.exit('traj 가 있는 줄이 없다')
names = os.environ['L'].split(',') if os.environ.get('L') else []
keys = sorted({k for rs in runs.values() for tr in rs.values() for p in tr for k in p if k != 'y'},
              key=lambda k: (GROUPS.index(LABELS[k][1]) if k in LABELS else len(GROUPS), k))
data = {
    'title': os.environ.get('TITLE', os.path.basename(out).rsplit('.', 1)[0]),
    'desc': os.environ.get('DESC', ''),
    'runs': [{'label': names[i] if i < len(names) else ('기준' if t == '{}' else t), 'tune': t, 'seeds': s} for i, (t, s) in enumerate(runs.items())],
    'seeds': sorted({int(x) for s in runs.values() for x in s}),
    'years': sorted({p['y'] for s in runs.values() for tr in s.values() for p in tr}),
    'keys': keys,
    'labels': {k: {'name': v[0], 'group': v[1], 'unit': v[2]} for k, v in LABELS.items()},
    'groupOrder': GROUPS,
    'defaults': os.environ['K'].split() if os.environ.get('K') else (['gdp', 'pop', 'peas', 'food', 'stock.savAll', 'stock.gov', 'stock.fin', 'stock.total', 'wage.pU', 'price.grain', 'sellThru', 'util'] if flat_mode else DEFAULTS),
}
data['id'] = hashlib.md5(data['title'].encode()).hexdigest()[:8]
tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'trajhtml.template.html'), encoding='utf-8').read()
html = tpl.replace('__TITLE__', data['title']).replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
open(out, 'w', encoding='utf-8').write(html)
print(out)
