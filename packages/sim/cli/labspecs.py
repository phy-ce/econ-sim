# 0b 1차 실행 명세 만들기: python cli/labspecs.py  →  docs/overhaul/0B_SPECS.json  (packages/sim 에서)
# 항목과 실행 수는 docs/overhaul/01_VISION.md 10장 "0b 측정 항목 표", 판정 규칙은 0B_PREREG.md. 사전 등록에 없는 선택은 note 칸과 0B_SPECS.json 의 choices 에 적는다.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', '..', 'docs', 'overhaul', '0B_SPECS.json')
specs = []

def add(item, name, seeds, years, salts=(0,), **kw):
    for s in seeds:
        for salt in salts:
            d = {'item': item, 'name': name, 'seed': s, 'salt': salt, 'years': years}
            d.update(kw)
            specs.append(d)

S12, S14 = (1, 2), (1, 2, 3, 4)
add('X01-base', 'base', S14, 20)
add('X01-a', 'base', S14, 20, salts=(1, 2, 3))
add('X01-b', 'noplayer', S14, 20, withPlayer=False)
for r in (0, 0.025, 0.1, 0.2):
    add('X04-E1', f'e1.rent{r:g}', S12, 5, tune={'rentShare': r})
# 레버 반응 행렬 26칸 (예산 다이얼 3 × 단계 1~5, 세법 3, 투자법 4, 복지법 4), 법은 forceLaw
for item in ('tax', 'wages', 'welfare'):
    for v in range(1, 6):
        add('X01-m', f'm.{item}{v}', S12, 5, budget={item: v})
for law in ('land', 'poll', 'income'):
    add('X01-m', f'm.taxLaw.{law}', S12, 5, laws={'tax': law})
for law in ('nobles', 'upper', 'middle', 'lower'):
    add('X01-m', f'm.invest.{law}', S12, 5, laws={'invest': law})
for law in ('none', 'poor', 'wage', 'universal'):
    add('X01-m', f'm.welfareLaw.{law}', S12, 5, laws={'welfare': law})
for item in ('tax', 'wages', 'welfare'):
    for v in (1, 5):
        add('X01-e', f'be.{item}{v}', S12, 20, budget={item: v})
SCRIPTS = {
    'schools5': [{'t': 0, 'cmd': {'macro': 'schools', 'n': 5}}],
    'admins2': [{'t': 0, 'cmd': {'macro': 'admins', 'n': 2}}],
    'method': [{'t': 0, 'cmd': {'macro': 'methodStep'}}],
    'privatize': [{'t': 30, 'cmd': {'macro': 'buildPrivatize', 'wait': 90}}],
    'farm1': [{'t': 0, 'cmd': {'macro': 'farm', 'levels': 1}}],
    'farm3': [{'t': 0, 'cmd': {'macro': 'farm', 'levels': 3}}],
}
for k, sc in SCRIPTS.items():
    add('X01-s', f's.{k}', S12, 5, script=sc)
add('X03-e', 's.method20', S12, 20, script=SCRIPTS['method'])
add('X05-S0b', 's0.drain', S12, 10, shocks=[{'t': 1800, 'kind': 'drain'}], note='5년차 첫날 세 왕국 모두 국고 0·부채 한도')
add('X05-S0b', 's0.welOn', (1,), 10, laws={'welfare': 'poor'}, note='복지 켬 = 플레이어 왕국 구빈법 강제 (단계 3)')
add('X05-S0b', 's0.welOff', (1,), 10, laws={'welfare': 'none'}, note='복지 끔 = 플레이어 왕국 복지법 none 강제 (기준선과 같은 법)')
add('X05-S0b', 's0.ladderOff', S12, 10, withPlayer=False, pin={'kingdom': 1, 'tax': 3, 'wages': 3, 'welfare': 3}, note='withPlayer 끔에서 왕국 1 의 예산 단계를 시작값 3·3·3 에 고정. 대조는 noplayer (X01-b) 의 첫 10년')
add('X08-L', 'script4', S14, 20, script=SCRIPTS['schools5'] + SCRIPTS['admins2'] + SCRIPTS['method'] + SCRIPTS['privatize'])
for h in (0.03, 0.1):
    add('X08-W', f'hw.{h:g}', S12, 20, tune={'harvestChance': h})
add('X08-V', 'base', (5, 6, 7, 8), 10)
for k, vals in (('wageOutside', (1.0, 1.5)), ('wageCeil', (0.7, 1.0))):
    for v in vals:
        add('X07-A6', f'a6.{k}{v:g}', S12, 5, tune={k: v})
add('X08-F', 'base40', (1, 3), 40)
add('X01-f', 'base', S12, 5, salts=(4, 5, 6, 7), optional=True, note='거짓 단서율 null: 0a 산출을 쓰면 안 돌려도 된다 (OPTIONAL=1)')

CHOICES = [
    '연구: withPlayer 켬이면 플레이어 왕실이 사전 등록 1장 순서로 고른다. 매일 step 직전에 연구가 비었는지 보고 비었으면 그날 고른다 ("그 주에 바로").',
    '예산·법·처방은 모두 플레이어 왕국(왕국 1, 왕실 100)에 건다. 처방 효과·단서의 기본 비교 범위도 왕국 1 이다 (labsum --k).',
    '학교 5개·행정청 2개 = 각 5·2 레벨, 플레이어 지역을 인구 많은 순으로 돌아가며 1레벨씩 (같은 지역에 같은 건물이 있으면 증설). 국고 부족·동시 공사 상한이면 날마다 다시 시도.',
    '방식 한 단계: 왕실은 생산 건물 없이 시작하므로 공방 1레벨(목공구)을 건축사무소 지역에 짓고, 다음 방식(철공구, ironworking)이 고정 연구 순서로 열리면 바꾼다. 5년 안에 안 열릴 수 있다 (log 줄의 setMethod 시점).',
    '짓고 민영화: 30일에 (손익 이동평균이 쌓인 뒤) 시작 생산 건물 종류(곡물 농장·섬유 농장·벌목장·공방) 중 그 왕국 민간 건물의 레벨당 손익 이동평균이 가장 큰 종류를 그 땅이 가장 많이 빈 지역에 1레벨 짓고, 완공 90일 뒤 민영화를 켠다.',
    '곡물 농장 1·3레벨 증설: 왕실 농장이 없어 빈 농지가 가장 많은 플레이어 지역에 새로 짓는다 (build).',
    '복지 켬/끔(X05-S0b): 플레이어 왕국 복지법을 구빈(poor)/none 으로 강제, 복지 단계는 기본 3.',
    '정책 사다리 끈 판: withPlayer 끔에서 왕국 1 예산을 날마다 3·3·3 으로 되돌린다 (명령 길). 대조는 noplayer 의 첫 10년.',
    '고갈 처방: 5년차 첫날(1800일) 세 왕국 모두 국고 현금을 소멸(w.mint.retired 에 적음)시키고 부채를 한도로. 화폐 항등식은 지킨다.',
    '행렬의 단계 3·시작 법 칸(m.tax3, m.wages3, m.welfare3, m.taxLaw.land, m.invest.nobles, m.welfareLaw.none)은 기준선과 같은 설정이지만 명령·강제를 거친 판으로 그대로 돌린다 (점검용).',
    'X03-D(S/D 분해)는 기준선 실행의 대륙 줄(subSup·bldSup·cap·capLv·tIn·tOut·hh)로 잰다: 실행 추가 없음.',
    'X07-A6 의 20년 8회는 5년 거름 뒤 단서가 뜬 변수만이라 1차 명세에 넣지 않는다.',
    'X08-F 40년은 이름 base40 (기준선 20년과 같은 앞 20년).',
]

out = {
    'about': '0b 1차 실행 명세 (cli/labspecs.py 가 만든다). docs/overhaul/01_VISION.md 10장 0b 측정 항목 표, 0B_PREREG.md. 돌리기: cd packages/sim && bash cli/lab.sh <out.jsonl> ../../docs/overhaul/0B_SPECS.json',
    'code': 'main be7e72f + 0b 사전 등록 7c45da7 (sim 세계 코드 그대로)',
    'counts': {},
    'excluded': [
        {'item': 'X01-d 브라우저 비용', 'why': '사용자 PC 브라우저가 필요하다 (0B_PREREG 머리말)'},
        {'item': 'X10-A0', 'why': 'A0 단계에서 끝났다 (0 회)'},
        {'item': 'X03-A', 'why': '0b′ 의 5-1 비교에서 잰다 (0 회)'},
        {'item': 'X07-A6 20년', 'why': '5년 거름 뒤 2차'},
    ],
    'choices': CHOICES,
    'specs': specs,
}
for s in specs:
    key = s['item'] + (' (optional)' if s.get('optional') else '')
    out['counts'][key] = out['counts'].get(key, 0) + 1
out['counts']['total (optional 제외)'] = sum(1 for s in specs if not s.get('optional'))
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(OUT, out['counts'])
