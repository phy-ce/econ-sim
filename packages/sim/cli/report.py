# 실험 보고서 만들기: python cli/report.py <id> a.jsonl [b.jsonl ...]   (packages/sim 에서. id 예: 2026-10-22-arist10)
# tools/reports/public/data/<id>.json 을 쓰고 목록(index.json)을 고친다. 보기: npm run reports (포트 5201), 배포: GitHub Pages /econ-sim/reports/
# 입력은 sweep.ts 의 traj 줄이나 해마다 한 줄 진단 파일. 조정값(또는 이름)마다 실행 하나, 시드는 평균·시드별로 본다.
# --html out.html 을 id 자리에 주면 보고서 한 장짜리 HTML 파일을 만든다 (cli/trajhtml.template.html, 옛 형식 그대로).
# --convert : tools/reports/public/data/ 의 보고서를 모두 지금 형식(format 2)과 지금 이름표로 다시 쓴다.
# 환경 변수: L="main,새 규칙" 실행 이름, TITLE 제목, DESC 한 줄 설명, K="gdp levels" 처음 보일 지표, S="1 2" 시드
# 해마다 한 줄 파일({"y":1,"seed":1,"gdp":..,"stock":{..}} 처럼, 진단 스크립트 출력)도 읽는다: 인자를 "이름=파일"로 주면
# 같은 이름의 파일들이 시드별로 한 실행이 되고, 안쪽 사전은 "stock.gov" 처럼 펼친다
#
# 보고서 형식 2 (format: 2): 지표 이름은 keys 에 한 번만 쓰고, 실행마다 시드마다 해마다 한 줄 배열
#   runs[i].seeds["1"] = [[y, v(keys[0]), v(keys[1]), ...], ...]   (없는 값은 null)
# 값은 유효숫자 3자리로 줄인다 (정수는 그대로, 해는 그대로). labels[k] = {name, group, unit, desc?} (desc 는 화면에서 이름에 마우스를 올리면 보인다)
import json, os, re, sys, hashlib, math, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, '..', '..', '..', 'tools', 'reports', 'public', 'data')
FORMAT = 2

CLS = {'peasant': '소작농', 'unskilled': '노동자', 'farmer': '농부', 'skilled': '기술자', 'expert': '전문가', 'gentry': '하급 귀족',
       'capitalist': '자본가', 'aristocrat': '상급 귀족'}
GOODS = {'grain': '곡물', 'fiber': '섬유', 'timber': '목재', 'ore': '철광석', 'fuel': '석탄', 'food': '식료품', 'cloth': '의복', 'metal': '철',
         'tools': '공구', 'furniture': '가구', 'electronics': '기계', 'transport': '운송', 'luxury_furniture': '고급 가구', 'luxury_cloth': '고급 의복',
         'meat': '고기', 'paper': '종이'}
BLDG = {'subsistence': '소작지', 'manor': '저택', 'finance': '금융가', 'farm': '곡물 농장', 'fiber_farm': '섬유 농장', 'ranch': '목장', 'lumber': '벌목장',
        'mine': '철광산', 'coal_mine': '석탄광산', 'foodplant': '식료품 공장', 'textile': '방직 공장', 'smelter': '제철소', 'workshop': '공방',
        'furniture': '가구 공방', 'paper_mill': '종이 공장', 'fab': '기계 공장', 'railway': '운송 조합', 'school': '학교', 'builder': '건축사무소', 'admin': '행정청'}
LEDGER = {'sales': '매출', 'tax': '세금', 'mint': '주조', 'buildFees': '공사 수수료', 'wages': '임금', 'inputs': '원료', 'research': '연구',
          'interest': '이자', 'welfare': '복지', 'dividends': '배당', 'investment': '투자', 'buildPaid': '공사비 지출'}
FLOWS = {'divIn': ('배당 받음', '가진 건물에서 들어온 배당'), 'toPops': ('주인에게 나눔', '배당 중 귀족·지분 가진 pop 에게 나눈 몫'),
         'keep': ('금고에 남김', '배당 중 금고에 남긴 몫'), 'noSeat': ('받을 사람 없음', '나눌 pop 이 없어 금고에 남은 배당'),
         'staff': ('직원 임금', '금융가 직원에게 준 임금'), 'idle': ('쉬는 돈 돌려줌', '쓸 데 없는 금고 돈을 지분 가진 pop 에게 돌려준 것'),
         'call': ('증설비 부담', '가진 건물의 증설비를 금고에서 낸 것'), 'build': ('공사비 지불', '공사 진행분을 금고에서 낸 것'),
         'priv': ('민영화 매입', '국영 건물 레벨을 사들인 값'), 'salvage': ('철거 자재 대금', '헐린 레벨의 자재를 판 돈'),
         'skim': ('소작농 저축 거둠', '소작농이 쓰고 남은 저축을 저택이 거둔 것'), 'units': ('지분 매입', 'pop 이 남는 현금으로 산 금융가 지분'),
         'ownerless': ('주인 없는 돈', '주인 없는 돈이 지역 금융가로 간 것'), 'noOwner': ('주인 없는 배당', '주인 없는 레벨의 이익'),
         'other': ('기타 입금', '이름 없는 입금')}
JOB = {'U': 'unskilled', 'F': 'farmer', 'S': 'skilled', 'E': 'expert', 'G': 'gentry'}

def L(name, group, unit='', desc=None):
    return (name, group, unit, desc)

LABELS = {
    # 경제
    'gdp': L('총생산', '경제', '백만/주'), 'levels': L('건물 레벨', '경제'), 'gdpY': L('총생산 (연간)', '경제', '백만/년', '해마다 마지막 날의 연간 총생산'),
    'util': L('가동률', '경제', '', '민간 생산 건물의 가동률 (레벨 가중, 하루 평균)'), 'privSh': L('민간 레벨 비율', '경제', '', '전체 건물 레벨 중 민간 몫'),
    'mineLv': L('철광산 레벨', '경제'), 'mineSt': L('철광산 충원율', '경제', '', '철광산 일자리 중 채운 비율 (레벨 가중)'),
    'lv.priv': L('민간 레벨', '경제'), 'lv.state': L('국영 레벨', '경제'), 'lv.office': L('건축사무소 레벨', '경제'),
    'cons.priv': L('민간 공사 수', '경제', '', '진행 중인 민간 공사 수 (하루 평균)'), 'cons.state': L('왕실 공사 수', '경제', '', '진행 중인 왕실 공사 수 (하루 평균)'),
    # 인구
    'pop': L('인구', '인구', '백만'), 'peas': L('소작농 비율', '인구'), 'jobless': L('실업률', '인구', '', '일자리 없는 인구 ÷ 인구'),
    'joblessSk': L('기술자 실업률', '인구', '', '기술자 실업 ÷ (고용 + 실업)'),
    'ariK': L('상급 귀족 인구', '인구', '천'), 'genK': L('하급 귀족 인구', '인구', '천'), 'genWkK': L('하급 귀족 노동 인구', '인구', '천'),
    'cells': L('소작지 칸', '인구', '', '소작지 레벨 합'),
    # 생활수준
    'solPeas': L('소작농 생활수준', '생활수준'), 'solUnsk': L('노동자 생활수준', '생활수준'), 'solSk': L('기술자 생활수준', '생활수준'),
    'solEx': L('전문가 생활수준', '생활수준'), 'solArist': L('상급 귀족 생활수준', '생활수준'),
    'solGen': L('하급 귀족 생활수준', '생활수준', '', '노동 인구 가중 (sol.gentry 는 인구 가중)'), 'solFarm': L('농부 생활수준', '생활수준'),
    'foodPeas': L('소작농 식량 충족', '생활수준'), 'food': L('식량 충족', '생활수준', '', '모든 pop 의 식량 충족 (인구 가중, 하루 평균)'),
    'below3': L('생활수준 3 미만 비율', '생활수준', '', '귀족·자본가를 뺀 인구 중'),
    # 소득
    'incAri': L('상급 귀족 1인 소득', '소득', '/일'), 'incGen': L('하급 귀족 1인 소득', '소득', '/일'), 'incSk': L('기술자 1인 소득', '소득', '/일'), 'incEx': L('전문가 1인 소득', '소득', '/일'),
    'resPts': L('주간 연구 포인트', '연구', '', '왕국 평균, 지난주 쌓은 포인트'), 'lit': L('문해력', '연구', '', '인구 가중 평균'),
    'techs': L('아는 기술 수', '연구', '', '왕국 평균'), 'techsMin': L('아는 기술 수 (가장 적은 왕국)', '연구'),
    'incUnsk': L('노동자 1인 소득', '소득', '/일'), 'ariSk': L('귀족 ÷ 기술자 소득', '소득', '배', '상급 귀족 1인 소득 ÷ 기술자 1인 소득'),
    # 돈
    'mCrown': L('왕실 (국고 − 빚)', '돈', '백만'), 'mFin': L('금융가 금고', '돈', '백만'), 'mMan': L('저택 금고', '돈', '백만'),
    'mFirm': L('상회 금고', '돈', '백만'), 'mHh': L('가계 현금', '돈', '백만'), 'minted': L('한 해 주조', '돈', '백만/년'),
    'privCash': L('민간 현금', '돈', '백만', '민간 상회 현금 (지표 기록)'), 'treasury': L('왕실 순국고', '돈', '백만', '국고 − 빚'),
    'manCash': L('저택 금고 (지표)', '돈', '백만'), 'finCash': L('금융가 금고 (지표)', '돈', '백만'),
    'savPeas': L('소작농 저축', '돈', '백만'), 'savUnsk': L('노동자 저축', '돈', '백만'), 'savFarm': L('농부 저축', '돈', '백만'),
    'savSk': L('기술자 저축', '돈', '백만'), 'savEx': L('전문가 저축', '돈', '백만'),
    'stock.savAll': L('가계 현금 합', '돈', '백만'), 'stock.gov': L('왕실 국고', '돈', '백만'), 'stock.govDebt': L('왕실 빚', '돈', '백만'),
    'stock.firm': L('상회 금고', '돈', '백만'), 'stock.man': L('저택 금고', '돈', '백만'), 'stock.fin': L('금융가 금고', '돈', '백만'),
    'stock.pool': L('저택+금융가 금고 (사본)', '돈', '백만', '옛 투자 풀 칸: 지금은 저택·금융가 금고 합의 화면용 사본(round.ts writePool). 2026-10-22 이전 sweep 의 총통화는 이 값을 두 번 셌다'), 'stock.traders': L('상인 현금', '돈', '백만'),
    'stock.total': L('총통화', '돈', '백만', '가계 + 국고 + 상회 + 저택 + 금융가 + 상인 + 주인 없는 돈 (빚은 빼지 않음). 2026-10-22 이전 보고서는 투자 풀 사본(stock.pool)을 한 번 더 셌다'),
    'stock.minted': L('주조 누계', '돈', '백만', '처음부터 주조한 돈 합'), 'stock.fundVal': L('금융가 지분 가치', '돈', '백만', 'pop 이 가진 지분 × 금융가 지분값'),
    'stock.wfund': L('주인 없는 돈', '돈', '백만', '금융가가 없는 곳에 쌓인 돈'),
    # 돈 ÷ 총생산
    'rCrown': L('왕실 (국고 − 빚)', '돈 ÷ 총생산', '', '해마다 마지막 날 재고 ÷ 연간 총생산'), 'rFin': L('금융가 금고', '돈 ÷ 총생산'),
    'rMan': L('저택 금고', '돈 ÷ 총생산'), 'rFirm': L('상회 금고', '돈 ÷ 총생산'), 'rHh': L('가계 현금', '돈 ÷ 총생산'),
    # 왕실
    'taxStep': L('세금 단계', '왕실', '1~5', '날마다 왕국 평균'), 'tight': L('조임 비율', '왕실', '', '국고가 빠듯하다고 본 날 비율 (왕국 평균)'),
    'tWeeks': L('국고 (지출 몇 주치)', '왕실', '주'), 'taxUps': L('세금 올림 횟수', '왕실', '/년'),
    # 건축사무소 (sweep.ts aiY, 해마다 마지막 날, 왕국 합)
    'ofLevel': L('사무소 레벨', '건축사무소'), 'ofPts': L('사무소 하루 포인트', '건축사무소', '점'),
    'ofUsed': L('쓰인 포인트', '건축사무소', '점', '공사에 실제로 쓰인 하루 포인트 (buildUsed 이동평균)'),
    'ofBacklog': L('공사 대기', '건축사무소', '일', '남은 공사 포인트 ÷ 하루 포인트 (왕국 평균)'),
    'ofProfit': L('사무소 손익', '건축사무소', '천/주', '지난주 사무소 매출(수수료) − 원료 − 임금 (옛 sim 은 0)'),
    'ofFees': L('민간 공사 수수료', '건축사무소', '천/주'), 'ofBuild': L('왕실 공사 수수료', '건축사무소', '천/주', '왕실 공사가 자기 사무소에 낸 수수료 (옛 sim 은 0)'),
    'ofRes': L('사무소 유보 자산', '건축사무소', '천'),
    'revWk': L('왕실 세입', '왕실', '천/주'), 'taxRatio': L('징수율', '왕실', '', '세금 ÷ 과세 대상 (인구 가중)'),
    'taxIdx': L('세법 단계', '왕실', '0~2', '토지 0 / 인두 1 / 소득 2, 왕국 평균'), 'invIdx': L('투자법 단계', '왕실', '0~3', '귀족 0 … 노동자·농부 3, 왕국 평균'),
    'wIdx': L('국영 임금 지수', '왕실', '', '왕국 중 최대'), 'wIdxAvg': L('국영 임금 지수 (평균)', '왕실', '', '왕국 평균'),
    'wStep': L('국영 임금 배율', '왕실', '', '하급 귀족 국영 임금 ÷ 기본 임금 ÷ 임금 지수, 왕국 평균'),
    # 복지
    'welY': L('복지 지급', '복지', '백만/년'), 'welS': L('복지 단계', '복지', '1~5'), 'welOn': L('복지법 켜진 비율', '복지', '', '날마다 왕국 평균'),
    'welStp': L('복지 단계 (켜진 왕국)', '복지', '1~5'), 'welFlips': L('복지법 켜기·끄기', '복지', '/년'),
    # 시장
    'grain': L('곡물값 (기준 대비)', '시장', '', '장기 기준값 대비'), 'oreP': L('철광석 값 (기준 대비)', '시장', '', '장기 기준값 대비'),
    'metalP': L('철 값 (기준 대비)', '시장', '', '장기 기준값 대비'),
    'oreSup': L('철광석 공급 (이동평균)', '시장', '천/일'), 'oreDem': L('철광석 수요 (이동평균)', '시장', '천/일'),
    'metalSup': L('철 공급 (이동평균)', '시장', '천/일'), 'metalDem': L('철 수요 (이동평균)', '시장', '천/일'),
    'sellThru': L('팔린 비율 (가치)', '시장', '', '체결 가치 ÷ 판매 제안 가치, 한 해 합'),
    # 소유
    'manOwn': L('저택 소유 레벨', '소유', '', '저택이 가진 건물 레벨 합'), 'ariSeat': L('저택 상급 귀족 자리', '소유', '천'),
    'lvMan': L('저택이 가진 레벨', '소유'), 'lvFin': L('금융가가 가진 레벨', '소유'),
    'finR': L('금융가 자산 비율', '소유', '', '금융가 자산 ÷ (저택 + 금융가 자산)'),
    # 정부
    'admHer': L('세습 관료제 레벨', '정부'), 'admPro': L('전문 관료제 레벨', '정부'), 'admFill': L('행정청 충원율', '정부', '', '자리 가중'),
    'admWage': L('행정청 임금', '정부', '천/일'), 'admSk': L('행정청 기술자', '정부', '천'), 'admGen': L('행정청 하급 귀족', '정부', '천'),
    # 하급 귀족 일자리
    'gAdmSh': L('하급 귀족: 행정청', '하급 귀족 일자리', '', '하급 귀족 노동 인구 중 비율'), 'gManSh': L('하급 귀족: 저택', '하급 귀족 일자리'),
    'gTutSh': L('하급 귀족: 가정교사', '하급 귀족 일자리'), 'gIdleSh': L('하급 귀족: 실업', '하급 귀족 일자리'),
}
for i in range(3):
    LABELS[f'tax{i}'] = L(f'왕국 {i + 1} 세금 단계', '왕실', '1~5')
    LABELS[f'welL{i}'] = L(f'왕국 {i + 1} 복지법', '복지', '0~3', '없음 0 / 구빈 1 / 임금 2 / 보편 3')
SAV = {'peasant': 'savPeas', 'unskilled': 'savUnsk', 'farmer': 'savFarm', 'skilled': 'savSk', 'expert': 'savEx', 'gentry': 'savGen', 'capitalist': 'savCap', 'aristocrat': 'savAri'}
for c, ko in CLS.items():
    LABELS['stock.' + SAV[c]] = L(ko + ' 현금', '돈', '백만')
    LABELS['popK.' + c] = L(ko + ' 인구', '계층 인구', '천')
    LABELS['wfK.' + c] = L(ko + ' 노동 인구', '계층 노동 인구', '천', '일하는 나이의 인구 (인구 × 노동 비율)')
    LABELS['sol.' + c] = L(ko + ' 생활수준', '생활수준', '', '인구 가중')
    LABELS['inc.' + c] = L(ko + ' 1인 소득', '소득', '/일', '현금 소득 이동평균 ÷ 인구')
    LABELS['emp.' + c] = L(ko + ' 고용', '일자리', '천', '일하는 노동 인구')
    LABELS['idle.' + c] = L(ko + ' 실업', '일자리', '천', '일 없는 노동 인구')
for l, c in JOB.items():
    LABELS['wage.p' + l] = L(CLS[c] + ' 임금 (민간)', '임금', '/일', '고용 가중 평균')
    LABELS['wage.s' + l] = L(CLS[c] + ' 임금 (국영)', '임금', '/일', '고용 가중 평균')
for g, ko in GOODS.items():
    LABELS['price.' + g] = L(ko + ' 값', '값 (기본가 대비)', '', '지역 평균 값 ÷ 기본가, 한 해 평균')
    LABELS['sup.' + g] = L(ko + ' 공급', '공급', '천/일', '판매 제안량 합, 한 해 하루 평균')
    LABELS['dem.' + g] = L(ko + ' 수요', '수요', '천/일', '구매 주문량 합, 한 해 하루 평균')
    LABELS['sold.' + g] = L(ko + ' 거래량', '거래량', '천/일', '체결량 합, 한 해 하루 평균')
    LABELS['hh.' + g] = L(ko + ' 가계 수요', '가계 수요', '천/일', 'pop 의 구매 주문량 합, 한 해 하루 평균')
for b, ko in BLDG.items():
    LABELS['lvT.' + b] = L(ko, '건물 레벨')
for side, nm in (('govL', '왕실'), ('privL', '민간')):
    for k, ko in LEDGER.items():
        LABELS[f'{side}.{k}'] = L(ko, nm + ' 장부', '백만/년', f'{nm} 회사 장부의 한 해 합')
for f, (ko, desc) in FLOWS.items():
    for o, oko in (('manor', '저택'), ('finance', '금융가')):
        LABELS[f'flows.{f}.{o}'] = L(f'{oko}: {ko}', '소유 건물 흐름', '백만/년', desc)

GROUPS = ['경제', '생활수준', '소득', '인구', '계층 인구', '계층 노동 인구', '일자리', '임금', '돈', '돈 ÷ 총생산', '왕실', '연구', '건축사무소', '복지', '왕실 장부', '민간 장부',
          '소유 건물 흐름', '시장', '값 (기본가 대비)', '공급', '수요', '거래량', '가계 수요', '건물 레벨', '소유', '정부', '하급 귀족 일자리', '기타']
# 해마다 한 줄 진단 파일(.tmp/col/collapse.ts)에서만 뜻이 다른 이름
FLAT = {'peas': L('소작농 수', '인구', '백만')}
FLAT_DEFAULTS = ['gdp', 'pop', 'peas', 'food', 'stock.savAll', 'stock.gov', 'stock.fin', 'stock.total', 'wage.pU', 'price.grain', 'sellThru', 'util']
DEFAULTS = ['gdp', 'levels', 'solUnsk', 'solPeas', 'peas', 'rCrown', 'rFin', 'rHh', 'taxStep', 'tight', 'sellThru', 'revWk', 'taxRatio', 'privCash', 'jobless']

def label(k, flat_mode=False):
    v = (FLAT.get(k) if flat_mode else None) or LABELS.get(k)
    if v is None:
        v = L(k, '소유 건물 흐름', '백만/년') if k.startswith('flows.') else L(k, '기타')
    o = {'name': v[0], 'group': v[1], 'unit': v[2]}
    if v[3]: o['desc'] = v[3]
    return o

def r3(v):
    """유효숫자 3자리 (정수는 그대로)"""
    if v is None or isinstance(v, bool): return None
    if isinstance(v, int): return v
    if not isinstance(v, float) or not math.isfinite(v): return None
    if v.is_integer() and abs(v) < 1e15: return int(v)
    x = float('%.3g' % v)
    return int(x) if x.is_integer() and abs(x) < 1e15 else x

def flat(d, pre=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, pre + k + '.'))
        elif isinstance(v, (int, float)) and not isinstance(v, bool): o[pre + k] = v
    return o

def pack(seeds, keys):
    """{seed: [{y, k: v}]} -> {seed: [[y, v...]]}"""
    return {s: [[p['y']] + [r3(p.get(k)) for k in keys] for p in sorted(pts, key=lambda p: p['y'])] for s, pts in seeds.items()}

def finish(runs, flat_mode, defaults=None):
    """runs: [(이름, 조정값, {seed: [점]})] -> 보고서 사전 (제목·날짜 빼고)"""
    keys = sorted({k for _, _, s in runs for tr in s.values() for p in tr for k in p if k != 'y'},
                  key=lambda k: (GROUPS.index(label(k, flat_mode)['group']), k))
    if defaults is None:
        defaults = os.environ['K'].split() if os.environ.get('K') else [k for k in (FLAT_DEFAULTS if flat_mode else DEFAULTS) if k in keys]
    return {
        'format': FORMAT,
        'desc': os.environ.get('DESC', ''),
        'seeds': sorted({int(x) for _, _, s in runs for x in s}),
        'years': sorted({p['y'] for _, _, s in runs for tr in s.values() for p in tr}),
        'keys': keys,
        'labels': {k: label(k, flat_mode) for k in keys},
        'groupOrder': GROUPS,
        'defaults': defaults,
        'runs': [{'label': lb, 'tune': t, 'seeds': pack(s, keys)} for lb, t, s in runs],
    }

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
    if not runs: sys.exit('traj 나 해마다 한 줄(y)이 있는 줄이 없다')
    names = os.environ['L'].split(',') if os.environ.get('L') else []
    return finish([(names[i] if i < len(names) else ('기준' if t == '{}' else t), t, s) for i, (t, s) in enumerate(runs.items())], flat_mode)

def unpack(data):
    """형식 2 -> 옛 형식 (점 목록). 옛 형식이면 그대로"""
    if data.get('format', 1) < 2: return data
    keys = data['keys']
    d = {k: v for k, v in data.items() if k != 'format'}
    d['runs'] = [{**r, 'seeds': {s: [{'y': row[0], **{k: v for k, v in zip(keys, row[1:]) if v is not None}} for row in rows]
                                 for s, rows in r['seeds'].items()}} for r in data['runs']]
    return d

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'), allow_nan=False)

def convert_all():
    for path in sorted(glob.glob(os.path.join(DATA_DIR, '*.json'))):
        if os.path.basename(path) == 'index.json': continue
        before = os.path.getsize(path)
        old = unpack(json.load(open(path, encoding='utf-8')))
        keys = set(old['keys'])
        flat_mode = 'stock.total' in keys and 'levels' not in keys
        new = finish([(r['label'], r.get('tune', r['label']), r['seeds']) for r in old['runs']], flat_mode, old.get('defaults'))
        new['desc'] = old.get('desc', '')
        new['title'], new['date'] = old.get('title', ''), old.get('date', '')
        write_json(path, new)
        print(f'{os.path.basename(path)}: {before:,} -> {os.path.getsize(path):,} 바이트, 지표 {len(new["keys"])}, 기타 {sum(1 for v in new["labels"].values() if v["group"] == "기타")}')

if __name__ == '__main__':
    if sys.argv[1] == '--convert':
        convert_all()
    elif sys.argv[1] == '--html':
        out, files = sys.argv[2], sys.argv[3:]
        data = unpack(build(files))
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
        write_json(os.path.join(DATA_DIR, rid + '.json'), data)
        idx_path = os.path.join(DATA_DIR, 'index.json')
        idx = json.load(open(idx_path, encoding='utf-8')) if os.path.exists(idx_path) else {'reports': []}
        idx['reports'] = [r for r in idx['reports'] if r['id'] != rid] + [{'id': rid, 'title': data['title'], 'desc': data['desc'], 'date': data['date']}]
        idx['reports'].sort(key=lambda r: (r['date'], r['id']), reverse=True)
        json.dump(idx, open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(os.path.join(DATA_DIR, rid + '.json'))
