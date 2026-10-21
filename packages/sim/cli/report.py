# 실험 보고서 만들기: python cli/report.py <id> a.jsonl [b.jsonl ...]   (packages/sim 에서. id 예: 2026-10-22-arist10)
# tools/reports/public/data/<id>.json 을 쓰고 목록(index.json)을 고친다. 보기: npm run reports (포트 5201), 배포: GitHub Pages /econ-sim/reports/
# 입력은 sweep.ts 의 traj 줄이나 해마다 한 줄 진단 파일. 조정값(또는 이름)마다 실행 하나, 시드는 평균·시드별로 본다.
# --html out.html 을 id 자리에 주면 보고서 한 장짜리 HTML 파일을 만든다 (cli/trajhtml.template.html).
# 환경 변수: L="main,새 규칙" 실행 이름, TITLE 제목, DESC 한 줄 설명, K="gdp levels" 처음 보일 지표, S="1 2" 시드
# 해마다 한 줄 파일({"y":1,"seed":1,"gdp":..,"stock":{..}} 처럼, 진단 스크립트 출력)도 읽는다: 인자를 "이름=파일"로 주면
# 같은 이름의 파일들이 시드별로 한 실행이 되고, 안쪽 사전은 "stock.gov" 처럼 펼친다
import json, os, re, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, '..', '..', '..', 'tools', 'reports', 'public', 'data')

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
    # 돈 ÷ 총생산 (sweep.ts aiY: 해마다 마지막 날 재고 ÷ 연간 총생산)
    'gdpY': ('총생산 (연간)', '경제', '백만/년'),
    'rCrown': ('왕실 (국고 − 빚)', '돈 ÷ 총생산', ''), 'rFin': ('금융가 금고', '돈 ÷ 총생산', ''), 'rMan': ('저택 금고', '돈 ÷ 총생산', ''),
    'rFirm': ('상회 금고', '돈 ÷ 총생산', ''), 'rHh': ('가계 현금', '돈 ÷ 총생산', ''),
    'mCrown': ('왕실 (국고 − 빚)', '돈', '백만'), 'mFin': ('금융가 금고', '돈', '백만'), 'mMan': ('저택 금고', '돈', '백만'),
    'mFirm': ('상회 금고', '돈', '백만'), 'mHh': ('가계 현금', '돈', '백만'), 'minted': ('한 해 주조', '돈', '백만/년'),
    # 왕실 (AI 정책 단계, 해마다 날마다 왕국 평균)
    'taxStep': ('세금 단계', '왕실', '1~5'), 'tight': ('조임 비율', '왕실', ''), 'tWeeks': ('국고 (지출 몇 주치)', '왕실', '주'),
    'taxUps': ('세금 올림 횟수', '왕실', '/년'), 'welY': ('복지 지급', '왕실', '백만/년'), 'welS': ('복지 단계', '왕실', '1~5'),
    'sellThru': ('팔린 비율 (가치)', '시장', ''), 'below3': ('생활수준 3 미만 비율', '생활수준', ''), 'solFarm': ('농부 생활수준', '생활수준', ''),
}
GROUPS = ['경제', '생활수준', '소득', '인구', '돈 ÷ 총생산', '왕실', '돈', '임금', '재정', '시장', '일자리', '왕실 장부', '민간 장부', '소유', '정부', '하급 귀족 일자리', '기타']
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
FLAT_DEFAULTS = ['gdp', 'pop', 'peas', 'food', 'stock.savAll', 'stock.gov', 'stock.fin', 'stock.total', 'wage.pU', 'price.grain', 'sellThru', 'util']
DEFAULTS = ['gdp', 'levels', 'solUnsk', 'solPeas', 'peas', 'rCrown', 'rFin', 'rHh', 'taxStep', 'tight', 'sellThru', 'revWk', 'taxRatio', 'privCash', 'jobless']

def flat(d, pre=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, pre + k + '.'))
        elif isinstance(v, (int, float)) and not isinstance(v, bool): o[pre + k] = v
    return o

def build(files):
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
    labels = {**LABELS, **(FLAT if flat_mode else {})}
    if not runs: sys.exit('traj 나 해마다 한 줄(y)이 있는 줄이 없다')
    names = os.environ['L'].split(',') if os.environ.get('L') else []
    keys = sorted({k for rs in runs.values() for tr in rs.values() for p in tr for k in p if k != 'y'},
                  key=lambda k: (GROUPS.index(labels[k][1]) if k in labels else len(GROUPS), k))
    return {
        'desc': os.environ.get('DESC', ''),
        'runs': [{'label': names[i] if i < len(names) else ('기준' if t == '{}' else t), 'tune': t, 'seeds': s} for i, (t, s) in enumerate(runs.items())],
        'seeds': sorted({int(x) for s in runs.values() for x in s}),
        'years': sorted({p['y'] for s in runs.values() for tr in s.values() for p in tr}),
        'keys': keys,
        'labels': {k: {'name': v[0], 'group': v[1], 'unit': v[2]} for k, v in labels.items() if k in keys},
        'groupOrder': GROUPS,
        'defaults': os.environ['K'].split() if os.environ.get('K') else [k for k in (FLAT_DEFAULTS if flat_mode else DEFAULTS) if k in keys],
    }

if __name__ == '__main__':
    if sys.argv[1] == '--html':
        out, files = sys.argv[2], sys.argv[3:]
        data = build(files)
        data['title'] = os.environ.get('TITLE', os.path.basename(out).rsplit('.', 1)[0])
        data['id'] = hashlib.md5(data['title'].encode()).hexdigest()[:8]
        tpl = open(os.path.join(HERE, 'trajhtml.template.html'), encoding='utf-8').read()
        open(out, 'w', encoding='utf-8').write(tpl.replace('__TITLE__', data['title']).replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')))
        print(out)
    else:
        rid, files = sys.argv[1], sys.argv[2:]
        data = build(files)
        data['title'] = os.environ.get('TITLE', rid)
        data['date'] = os.environ.get('DATE', rid[:10] if re.match(r'\d{4}-\d{2}-\d{2}', rid) else '')
        os.makedirs(DATA_DIR, exist_ok=True)
        json.dump(data, open(os.path.join(DATA_DIR, rid + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        idx_path = os.path.join(DATA_DIR, 'index.json')
        idx = json.load(open(idx_path, encoding='utf-8')) if os.path.exists(idx_path) else {'reports': []}
        idx['reports'] = [r for r in idx['reports'] if r['id'] != rid] + [{'id': rid, 'title': data['title'], 'desc': data['desc'], 'date': data['date']}]
        idx['reports'].sort(key=lambda r: (r['date'], r['id']), reverse=True)
        json.dump(idx, open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(os.path.join(DATA_DIR, rid + '.json'))
