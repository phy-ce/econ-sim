# 빅토리아3 참고 (웹 확인, 2026-10-19)

설계 판단의 근거로 쓰는 빅토리아3의 실제 동작. 위키 문서는 모두 1.13 패치 기준이다. 확인하지 못한 것은 따로 적었다.

## 예산·지출 (https://vic3.paradoxwikis.com/Budget)
- 예산 금액을 항목별로 편성하지 않는다. 지출은 건물에서 아래로부터 쌓인다:
  - 건설 물자, 정부 임금, 정부 건물 물자
  - 군 임금·물자, 복지, 보조금, 이자 등
- 플레이어가 돌리는 손잡이는 세금 단계, 정부 임금 단계, 군 임금 단계다.
- 수입: 세금, 관세, 주조(주마다 연 GDP의 1/1000, 기본 상한 20만), 국영 배당, 투자 풀 이전.

## 세금 단계·세법 (https://vic3.paradoxwikis.com/Taxation, https://vic3.paradoxwikis.com/Economy_laws)
- 세금 단계(매우 낮음~매우 높음)가 지금 세법 안의 세율을 고른다.

| 세법 | 단계별 세율 |
|---|---|
| 토지 기반 | 토지세 0.4~1.0 (소작농 1인당 정액) |
| 인두 기반 | 토지세 0.2~0.5 (소작농은 절반), 인두세 0.4~1.0, 소득세 5~15% |
| 비례 | 소득 10~30%, 배당 2.5~20%. 토지세가 없다 |
| 누진 | 소득 10~20%, 배당 10~30% |
| 소비 기반 | 소비세 15~35% |

- 정액세는 1인당 연 금액이다. 예: 토지 기반 보통 단계에서 소작농 5,000명이 주 £67.3(= 0.7 × 5000 / 52)을 낸다.
- 인두세는 소작농·노예를 뺀 모두가 낸다. 소득세는 임금에만 붙고, 자급 소득은 면제다.
- 세금 단계의 다른 효과:
  - 정통성: +10/+5/0/−10/−20%
  - 기대 생활수준 하층: −1/−0.5/0/+1.5/+3

## 정부 임금 단계 (Budget 문서, https://vic3.paradoxwikis.com/Peasants)
- 임금 배율 −30/−15/0/+15/+30%.
- 기준은 "보통 임금"(편입 주 기본 임금의 나라 평균)이다. 정부 건물의 기본 임금이고, 복지·최저임금의 기준이기도 하다.
- 직종 배율:

| 직종 | 배율 |
|---|---|
| 소작농 | 0.2 |
| 노동자 | 1 |
| 사무원·서비스직 | 1.5 |
| 관료·학자 | 4 |
| 장교·귀족·자본가 | 5 |

## 건설 (https://vic3.paradoxwikis.com/Construction)
- 기본 건설 포인트 10에 건설 부문 건물이 더한다.
- 대기열이 정부(국가 예산)와 민간(투자 풀)으로 나뉜다. 경제 체제 법이 민간 몫을 정하고(전통주의 +25%, 자유방임 +75% 등), 한쪽이 못 쓴 몫은 다른 쪽으로 간다.
- 건설 부문 비용은 건설 물자와 정부 임금으로 잡힌다.
  - 놀고 있어도 임금은 나간다. 쓰지 않은 용량은 물자를 쓰지 않는다.
  - 민간 공사는 투자 풀이 물자만 내고, 부문 임금은 국가가 낸다.
- 생산 방식은 레벨당 2/5/10/15 포인트다. 레벨당 노동자 약 800→600명, 사무원 100명, 관료 100명이다 (Building 문서, 1.12 확인).

## 투자 풀 (https://vic3.paradoxwikis.com/Treasury, 1.13, 2026-10-19 직접 확인)
- 재원: "The investment pool gains funds from pop contributions. These contributions are based on dividends paid to certain professions with ownership shares". 임금은 들어가지 않는다.
- 남으면 쌓인다: "If investment pool contributions exceed expenses, the contributions accumulate and can be spent later."
- 민간 공사: "Buildings constructed from the investment pool use a separate, private construction queue." 건설 부문 임금은 국고가 낸다: "the wages of construction sector employees are always paid by the national treasury."
- 이 게임과 다른 점: 이 게임에는 투자 풀이 없다 (2026-10-22 소유 개편 4단계). 투자법이 허용한 계층의 남는 현금(생활비·세금 10일치 초과분의 하루 5%)은 그 지역 금융가 지분을 사고, 소작농의 8주치를 넘는 저축은 그 지역 저택 금고로 간다 (`DESIGN.md` 9.3). 예전 투자 풀 시절에는 이 남는 현금이 측정한 유입의 61~93%였다 (`DECISIONS.md` 7-8).

## 건물 유보 자산 (cash reserves, 2026-10-21 확인)
출처: https://vic3.paradoxwikis.com/Treasury, https://vic3.paradoxwikis.com/Defines, https://vic3.paradoxwikis.com/Building, https://vic3.paradoxwikis.com/Patch_1.2, https://vic3.paradoxwikis.com/Patch_1.3, https://vic3.paradoxwikis.com/Patch_1.8
- 건물마다 유보 자산 상한이 레벨당 상수다 (£25,000/레벨, 소유 건물은 £10,000/레벨).
- 이익이 나면 주간 이익의 25~50%를 유보 자산에 넣는다 (수익률에 따라 26~78주에 다 찬다). 나머지는 배당이다. 다 차면 이익을 100% 배당한다.
- 적자일 때 유보 자산이 50% 넘으면 임금을 깎지 않는다. 50% 아래이고 적자면 임금을 깎거나 해고한다 (임금은 주마다 최대 10%).
- 유보 자산이 적으면 채용을 멈추고, 자동 증설은 유보 자산이 95% 이상일 때만 한다.
- 이 게임: 상한 = 레벨 × 레벨당 주간 산출 가치(기본가) × 0.5주 (`TUNE.reserveWeeks`), 이익의 35%를 쌓고, 다 차면 100% 배당, 적자는 유보 자산에서 먼저 뺀다. 유보 자산이 남아 있으면 적자만으로는 가동률이 내려가지 않고 철거 주 수를 세지 않는다 (`DESIGN.md` 7.1, 9.3). 임금 깎기·채용 멈춤·증설 조건은 유보 자산과 잇지 않았다 (임금은 회사 단위다).

## 정부 건물과 땅, 건설 부문 레벨 상한 (2026-10-19 확인)
- "Most urban buildings have no limit on their total levels and can be built in any state." (https://vic3.paradoxwikis.com/Buildings, 직접 확인)
  - 같은 문서에서 농지(arable land) 상한은 농촌 건물에만 나온다. 행정청·대학에는 땅이나 도시화 상한이 없다.
- 건설 부문: "Wages must be paid regardless of whether the construction is used or not." (같은 문서, 직접 확인)
- 아래는 게임 스크립트 원본을 옮긴 GitHub 미러에서 확인했다 (조사 보고, 1.13.11):
  - `bg_government`(행정청, 대학)와 `bg_urban_facilities`는 `always_possible = yes`이고 `land_usage`가 없다. 땅도 도시화 자원도 쓰지 않는다 (https://github.com/jink47787/Historical_MP_Series_Vic3/blob/main/basegame-ver/common/building_groups/00_building_groups.txt).
  - 레벨 상한(`has_max_level = yes`)이 있는 도시 건물은 건설 부문뿐이다 (같은 저장소 `common/buildings/13_construction.txt`).
  - 주(state)당 건설 부문 상한은 기술로 늘어난다: urbanization +10, urban_planning·modern_sewerage·steel_frame_buildings·elevator 각 +5, 최대 30 (같은 저장소 `common/technology/technologies/30_society.txt`).
  - `bg_government`는 `urbanization = 20`(레벨당 도시화 +20)이다. `land_usage = urban`은 `bg_service`에만 있다 (같은 저장소 `00_building_groups.txt`, 2026-10-19 직접 확인).
  - 위키 Building 문서는 "Most buildings contribute between +5 and +20 urbanization per level."라고만 쓴다. 정부 건물의 값이나 `land_usage`는 위키에 없다 (https://vic3.paradoxwikis.com/Building, 직접 확인).
- 이 게임에 옮긴 것: 행정청·학교는 땅을 쓰지 않는다. 건축사무소는 공장 부지를 쓴다 (빅토리아3의 주당 레벨 상한 대신 지역 부지가 상한이다).
- **확인 못 함:** 건설 부문이 쓰지 않은 용량의 자재를 사는지 (위 "건설"의 "쓰지 않은 용량은 물자를 쓰지 않는다"는 Construction 문서 기준).

## 국고 (Budget 문서)
- 금 보유고 소프트 상한은 GDP의 20%다. 넘으면 효과가 줄어든다.
- 보유고가 비고 적자면 자동으로 빚을 낸다. 흑자로 원금을 갚는다.
- 기본 이자 20%에서 금융 기술마다 −2%다.
- 신용 한도 = 건물 현금 + 10만 + GDP의 50%. 원금이 한도의 50%를 넘으면 "건강하지 않은" 경제다.
- 채무 불이행이 되면 건설이 멈추고 벌칙이 주마다 커진다.

## 교육 (https://vic3.paradoxwikis.com/Pops, https://vic3.paradoxwikis.com/Institutions)
- 기본 교육 접근도는 부 1당 +0.5%다. 교육 제도가 더한다:
  - 공립: 레벨당 +12.5%
  - 사립: 레벨당 부 1당 +0.5%
  - 종교: 레벨당 +10%
- 대학은 정부 건물이다. 기본 방식은 사무원 250 + 노동자 250, 혁신 1, 자격 +10%다.

## 소작농 소득
게임 스크립트 원본은 GitHub 미러에서 확인했다.
- G = https://github.com/jink47787/Historical_MP_Series_Vic3/blob/main/basegame-ver/common/ (커밋 "base latest 1.13.11")
- T = https://github.com/tjysdsg/Victoria-3-files/blob/master/game/ (1.9.0)

**산출은 두 갈래다**
- 시장에 파는 소량의 상품과, 소작농이 직접 쓰는 현물 소득(Subsistence Output)으로 나뉜다 (T localization/english/concepts_l_english.yml `concept_subsistence_building_desc`).
- Subsistence Output은 건물 수입에서 나가지 않고 소득세도 붙지 않는다 (같은 파일 `concept_subsistence_output_desc`). 위키도 "시장과 상호작용하지 않는다"고 쓴다 (https://vic3.paradoxwikis.com/Needs).

**시장 판매분은 생산 방식이 정한 고정 수량이다** (G production_methods/12_subsistence.txt)
- 자급 농장 기본: 노동자 규모에 비례해 grain 1.0, fabric 0.5, wood 0.5, services 0.5. 레벨당 소작농 5,000명.
- 가내수공업 방식: clothes, furniture, liquor 각 0.25.
- 판매 몫은 가격에 반응하지 않는다. 금액만 시장가로 변한다. 비율을 가격으로 정하는 규칙은 못 찾았다.

**현물 몫은 토지법이 정한다** (같은 파일)
- 소작·상업농·집단농 등 (`pm_serfdom_no`): `building_subsistence_output_add = 4`.
- 농노제: 3, 대신 시장용 grain +0.5. 부역(장원제): 3, grain +0.25. 자영농지: 4, grain +0.25.
- 농노제·장원제는 현물 몫을 시장 판매로 옮긴다.

**시장 구매** (G pop_types/peasants.txt)
- `consumption_mult = 0.05`: 소작농 구매 묶음의 5%만 주(州) 시장 수요로 들어간다 (https://vic3.paradoxwikis.com/Needs 와 같다).
- `subsistence_income = yes`, `pays_land_tax = yes`, `wage_weight = 0.2`.

**토지세는 1인당이다** (https://vic3.paradoxwikis.com/Treasury, https://vic3.paradoxwikis.com/Vickypedia)
- 소작농은 인두세 대신 토지세를 낸다.
- 토지 기반 과세의 토지세: 1인당 연 0.4 / 0.55 / 0.7 / 0.85 / 1.0 (세금 단계별). 위키 예시(5천 명, 중간 단계 → 주 £67.3)로 검산한 값이다. 수확 비율로 걷는 것이 아니다.

**확인 못 함:** 현물 소득이 돈 가치로 바뀌는 정확한 공식, 그것을 시장가로 매기는지 여부.

**이 게임과 다른 점**: 빅토리아3는 판매량이 방식마다 고정이다. 이 게임은 지대·세금을 낸 뒤 쓰고 남는 것을 판다 (DESIGN 4장). 두 방식 모두 판매량이 가격에 반응하지 않는다.

## 기상 조건 (harvest conditions, 1.8 도입)
- 1.8 패치 노트: "Added 13 harvest conditions that can trigger around the world affecting rural buildings and infrastructure" (https://vic3.paradoxwikis.com/Patch_1.8).
- 아래는 게임 스크립트 원본(1.13.11 미러)에서 확인했다. G = https://github.com/jink47787/Historical_MP_Series_Vic3/blob/main/basegame-ver/common/
  - 조건 정의: G `harvest_condition_types/00_harvest_condition_types.txt`, 형식 설명: 같은 폴더의 `harvest_condition_types.md`
  - 검사 주기: G `defines/00_defines.txt`의 `NHarvestConditions`
- 작동 방식:
  - 각 주(state)는 3개월에 한 번 검사한다 (`HARVEST_CONDITION_PERIOD = 3`). 굴린 값이 0.2(`HARVEST_CONDITION_CHANCE_THRESHOLD`)보다 크면 그 검사는 건너뛴다.
  - `range`: 0은 진원지만, 1은 바로 이웃까지, 2는 그다음까지. `duration`은 주 단위. `intensity`는 modifier 숫자에 곱하는 배수 (`HARVEST_CONDITION_MIN_INTENSITY` 0 ~ `MAX` 9).
  - `incompatible_with`: 그 조건이 이미 있는 주에는 생기지 않는다. 예: 가뭄은 홍수·서리·우박·폭우·적당한 강우와 함께 오지 않는다.
  - 다른 조건이 있으면 확률이 오른다. 예: 폭염 중이면 가뭄 확률 ×1.5.
- 우리 게임과 관련된 세 조건 (강도 1 기준 효과):

| 조건 | 범위 | 기간(주) | 강도 | 확률 | 산출(throughput) | 그 밖의 효과 |
|---|---|---|---|---|---|---|
| 가뭄 drought | 1~2 | 36~104 | 2~6 | 0.0025 | 농업·플랜테이션·목축 −5% | 기반시설 사용 +10%, 소작농 소비 +0.025 |
| 홍수 flood | 1~2 | 36~104 | 3~6 | 0.0025 | 농업·플랜테이션·목축·채취 −5% | 주 기반시설 −5%, 시장 접근 가격 영향 −5%, 소작농 소비 +0.03 |
| 산불 wildfire | 1~2 | 24~94 | 4~8 | 0.0008 | 농업·플랜테이션·목축·채취 −5% | 기반시설 사용 +10%, 주 기반시설 −5%, 소작농 소비 +0.03 |

- 강도 2~6이면 산출 −10%~−30%다.
- throughput은 투입과 산출을 함께 바꾸고 일자리는 그대로 둔다: "Both input and output goods are modified by the throughput percentage while required workers remains the same" (https://vic3.paradoxwikis.com/Buildings). 그래서 기상 조건이 걸린 건물은 원료도 덜 쓴다. 이 게임도 같다 (DESIGN 7.1, 7.4).
- 채취(`bg_extraction`)는 광산(`bg_mining`)과 벌목(`bg_logging`)의 부모 그룹이다 (G `building_groups/00_building_groups.txt`). 자급 농업(`bg_subsistence_agriculture`)은 농업(`bg_agriculture`)의 자식이라 농업 보정이 소작지에도 붙는다고 보았다. 상속 규칙 자체는 문서로 확인 못 함.
- **확인 못 함:** 확률이 무엇에 대한 확률인지(검사당·종류별), 임계값 0.2와의 결합, 진원지에서 멀어질 때 강도가 얼마나 줄어드는지. 공식 개발 일지 DD#131 (https://admin-forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-131-famines-starvation-harvest-conditions.1708680)은 열리지 않았다.

## 저택(Manor House)의 일자리와 몫 (2026-10-21 확인)
- 출처: https://vic3.paradoxwikis.com/Building (소유 건물 절과 Manor Houses·Financial Districts 표), https://vic3.paradoxwikis.com/Treasury
- 저택 방식별 레벨당 일자리: Privately Owned 귀족 50 / Clergy Oversight 성직자 100 / Increased Clergy Oversight 귀족 50·성직자 50 / Bureaucrat Oversight 관료 100.
- 몫(ownership shares): 귀족 +10, 성직자 +1, 관료 +1. 금융가: 자본가 50·상점주 25·서기 25, 자본가 +10, 상점주 +1 (교회 감독이면 성직자 +2).
- 배당 분배: "Dividends are divided and paid per share.", "Shares are per employee". 즉 한 사람 몫은 직종 몫 비율대로다 (귀족 1명 = 성직자 10명).
- 투자 풀 기여율 (Treasury): 자본가 30%, 귀족 20%, 성직자 20%, 상점주 20%.
- 소유 건물에서 몫이 없는 직원(서기 등)이 임금을 따로 받는지: 확인 못 함.
- 이 게임: 저택에 하급 귀족 자리(귀족과 같은 수)를 두고, 하급 귀족 1명 몫을 귀족 1명의 `gentryShare`로 둔다 (빅토리아3 성직자 1/10에 해당). 투자 풀 기여는 저택 몫 모두 20%.
- 확인한 개발 일지(https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-110-building-ownership-foreign-investment.1647879/)는 본문을 열지 못했다 (브라우저 확인 페이지). 검색 요약만 봤다: 저택은 소유한 건물의 배당으로 직원에게 준다. 원문 확인 못 함.

## 시장과 시장 접근성 (2026-10-21 확인, 위키는 1.13 기준)
출처: https://vic3.paradoxwikis.com/Market
- 시장 가격 = 기본가 × [1 + 0.75 × clamp((구매 − 판매) ÷ min(구매, 판매), ±1)]. 기본가의 25~175%.
- 주(state) 가격: 같은 공식을 그 주의 주문만으로 계산한다 ("주가 따로 시장인 것처럼").
- 지역 가격 = MAPI × 시장 가격 + (1 − MAPI) × 주 가격.
  - MAPI(시장 접근 가격 영향) 기본 75%. 비편입 주 −10%, 전통주의 법 −15%, 증권거래소 기술 +10%, 체펠린 +5%, 거시경제학 +5%, 큰 강 주 특성 +5%.
  - 실제로 쓰는 MAPI = MAPI × 그 주의 시장 접근성.
- 시장 접근성: 기반시설 ≥ 기반시설 사용량이면 100%, 모자라면 비례로 줄어든다 (기반시설 45, 사용량 90 → 최대 50%). 수도와 땅으로 이어지지 않은 주는 항구와 수송선이 모자라면 더 줄고, 고립된 주는 0%.
- 접근성은 그 주가 시장에 내는 구매·판매 주문의 크기도 줄인다. 운송·전기 같은 현지 상품은 늘 주 가격을 쓴다.
- 예: 철(기본가 40)을 만들기만 하고 쓰지 않는 주는 주 가격 10, MAPI 85%면 지역 가격 35.5.
- 기반시설 사용량이 건물·pop마다 어떻게 생기는지는 이 문서에 없어 확인 못 함 (Infrastructure 문서).

## 종이와 종이 공장 (2026-10-21 확인)
- 종이 기본가 30 (https://vic3.paradoxwikis.com/Paper). 쓰는 곳: pop 소비, 폭약 공장, 예술 학교, 정부 행정청(Government Administration), 대학, 마천루 (같은 문서).
- 종이 공장(Paper Mills): 필요 기술 Manufacturies, 건설비 600. 방식 이름 Hand Assembly, Pulp Pressing, Sulfite Pulping, Paper Bleaching, Water-tube Boiler, Rotary Valve Engine (https://vic3.paradoxwikis.com/Paper_Mills, 건물 목록으로 넘어간다).
- Pulp Pressing: 목재 30 → 종이 40, 상점주 500·노동자 4,500, 기술 요건 표시 없음 (https://vic3.paradoxwikis.com/List_of_production_methods).
- 행정청 방식 이름: Simple Organization, Filing Cabinets, Standardized Filing System, Telephone Switchboards, Hereditary/Professional Bureaucrats 등 (https://vic3.paradoxwikis.com/Government_Administration). Filing Cabinets 줄에 "Paper 10"이 있으나 투입인지는 평탄화된 표에서 **확인 못 함**.
- 이 게임: 목재 2,500 → 종이 5,000 (기본가 목재 2, 종이 4, 이익률 20%). 기술 없이 짓는다. 전문 관료제가 종이 200을 쓴다 (가구 100과 같은 값).

## 술과 기호품 (2026-10-23 확인, 위키 1.13)
- 술(Liquor) 기본가 30 (곡물 20의 1.5배). 만드는 곳: 식품 공업(Food Industries), 호밀 농장(Rye Farms), 자급 농장(Subsistence). 쓰는 곳: pop 필요, 동원 선택지 둘 (https://vic3.paradoxwikis.com/Liquor, Goods 문서로 넘어간다).
- 식품 공업의 증류 방식 묶음 (https://vic3.paradoxwikis.com/List_of_production_methods, 평탄화된 표라 건물 이름 줄은 못 읽었다):
  - Pot Stills (기술 Distillation): 상점주 100·기계공 250, 설탕 25 → 술 60, 식료품 −30 (식료품 산출을 줄이고 술을 낸다).
  - Patent Stills (기술 Fractional Distillation): 상점주 200·기계공 500·기술자 200, 설탕 25·유리 10 → 술 100 (나머지 산출은 표가 잘려 확인 못 함).
- 호밀 농장 Potatoes 줄에 곡물 10 → 술 10이 보이나, 이것이 투입·산출인지는 평탄화된 표에서 **확인 못 함** (같은 문서).
- 자급 농장 가내수공업 방식이 clothes·furniture·liquor를 각 0.25 낸다 (위 "소작농 소득", G production_methods/12_subsistence.txt).
- 기호품(Intoxicants) 필요 (https://vic3.paradoxwikis.com/Needs): 술(기본, 공급 상한 0.75), 담배(무게 ×0.9), 아편(×0.75), 와인(×0.25, 상한 0.25).
  부 10의 구매 묶음 popneed_intoxicants = 50, 같은 부의 기본 식량 131 (기호품이 식량 값의 약 38%). 부 30에서 216으로 멈춘다. 기호품이 생기는 부와 다른 부의 값은 표가 깨져 **확인 못 함** (1.10 기준 절).
- 이 게임: 술 기본가 3 (곡물 2의 1.5배), 기호품은 술 하나로만 채운다. 양조장은 곡물을 쓴다 (설탕·유리가 없다). DESIGN 4장·5장·11장 "기호품".

## 필요 (2026-11-05 확인, 위키의 부 절은 1.10 기준 표시)
출처: https://vic3.paradoxwikis.com/Needs (페이지를 받아 요약 모델로 읽었다. 부 단계별 격자 표는 추출에서 빠져 부 값별 양은 **확인 못 함**)
- Household Items: 가구(기본, 최소 0.1·최대 0.75), 유리(최대 0.5), 종이(무게 ×0.5, 최대 0.5). 부 10부터, 부 44 뒤 없어진다.
- Free Movement: 운송(기본, 최대 0.75), 자동차(×1.25). 부 10부터. Communication: 운송(기본, 최대 0.75), 전화(×2). 부 20부터.
- Luxury Items: 비단, 고급 의복, 고급 가구, 도자기, 라디오(최대 0.5). 부 15부터. Standard Clothing·Services 도 부 10부터.
- 공구(Tools)·엔진(Engines)은 이 페이지의 어느 필요에도 없다. 정밀 기기에 해당하는 상품도 없다 (이 게임의 정밀 기기는 라디오 자리를 빌린 것이다).
- 시장에 안 팔리는 상품은 최소 몫이 없으면 pop 이 사지 않고, 필요의 어떤 상품도 안 팔리면 기본 상품을 산다. 빅토리아3의 수요 조건은 시장 판매 여부이고 기술이 아니다. 기술로 여는 규칙은 이 게임의 규칙이다 (사용자 2026-11-05).
- 대체 비중은 시장 몫(판매 주문 − 비pop 구매 주문의 절반) × 무게로 정하고, pop 은 값을 보지 않는다고 적혀 있다. 이 게임은 값으로 나눈다 (DESIGN 5장 대체).

## 대출과 신용 (2026-10-21 확인, 위키 1.13)
출처: https://vic3.paradoxwikis.com/Treasury
- 금 보유고가 비면 재정 적자는 자동으로 국가 신용 대출이 된다. 흑자는 자동으로 원금을 갚는다.
- 빌려주는 쪽은 문서에 없다 (외국인지, 새로 만든 돈인지 확인 못 함). 이자는 "소유 지분을 가진 pop"에게 간다.
- 신용 한도 = 건물 유보 자산 합 + £100K + GDP의 50%. 원금이 한도의 50% 이상이면 "건강하지 않은 경제".
- 이자율: 기본 20%에서 은행 관련 기술마다 −2% (최대 다섯 개 → 10%), 강대국 −50%·약소국 +25% 같은 배율.
- 디폴트(보유고 0, 신용 소진): 공사 전부 멈춤, 처리량 등 벌칙이 주마다 −1%씩 최대 −50%. 파산 선언은 빚을 지우는 대신 공사 대기열 취소, 모든 건물 유보 자산 소멸, 급진화, 10년 벌칙.
- 민간 건물·회사가 빌린다는 내용은 없다. 대출은 국가 단위다.

## 세법 (2026-10-21 확인, 위키 1.13)
출처: https://vic3.paradoxwikis.com/Taxation
- 토지세: 비율이 아니라 1인당 고정액(연간)이다. 자급 농장의 소작농·농민만 낸다. 토지 기반 과세법에서 1인당 연 +0.4 / 0.55 / 0.7 / 0.85 / 1 (매우 낮음~매우 높음). 예: 소작농 5천 명, 보통 → 주 £67.3 (= 5,000 × 0.7 ÷ 52).
- 인두세(per capita): 소작농·노예를 뺀 모든 pop, 1인당 연 +0.4~1.
- 소득세: 임금에만 붙는 비율 (자급 소득은 면제). 배당세: pop 배당에 붙는 비율. 소비세: 특정 상품 구매에 붙는 비율 (권위 소모).
- 법별: 토지 기반 = 토지세만 / 1인당 과세 = 토지세 0.2~0.5 + 인두세 0.4~1 + 소득세 5~15% / 비례 과세 = 소득세 10~30% + 배당세 2.5~20% / 누진 과세 = 소득세 10~20% + 배당세 10~30% (위키 표 읽기, 일부 칸은 확인 못 함).
- 세금 수준이 높으면 정당성 −, 급진화 +.

## 복지법·사회 보장 (2026-10-22, 위키 1.13)
출처: https://vic3.paradoxwikis.com/Human_rights_laws
- 복지(Welfare) 법 그룹: 사회 보장 없음 / 구빈법(Poor Laws) / 임금 보조(Wage Subsidies) / 노령 연금(Old Age Pension). 사회 보장 없음이 아닌 법은 사회 보장(Social Security) 기관을 연다.
- 기관 레벨당 효과 (위키 표): 구빈법 복지 지급 +20%·식량 안보 +2%·받는 pop 정치력 −15% / 임금 보조 복지 지급 +20%·식량 안보 +2%·건물 임금 목표 +10% / 노령 연금 복지 지급 +30%·식량 안보 +3%·노동 인구 비율 −1%·부양가족 소득 +20%·건물 임금 목표 +15%. 그룹 설명은 "소득이 모자란 사람에 대한 정부 지원".
- 지급 공식(누구에게 얼마를, 어떤 생활수준을 목표로 주는지)은 확인 못 함. 이 게임은 목표 생활수준을 단계(2~4)로 직접 고르고, 모자란 소득을 채우는 규칙을 쓴다 (DESIGN 9.5).

## 복지 지급과 국고 (2026-11-02 확인, 이슈 #9)
- 국가 지출 항목: "Welfare Payments – The cost of subsidies paid to pops with wages below the threshold defined by the Social Security institution." 출처: https://vic3.paradoxwikis.com/Budget (Treasury 문서로 이어짐). 문턱의 크기·지급 비율 식은 이 문서에 없다.
- 보유고가 비면 적자는 자동으로 국가 신용 대출이 된다. 돈이 없을 때 지출을 자동으로 줄인다는 내용은 없다 (같은 문서). 파산 선언 벌칙에 "−100% Welfare payments"(10년에 걸쳐 줄어듦)가 있다.
- 사회 보장 기관: 기본 효과 복지 지급 +20%·식량 안보 +2%, "기관 레벨이 효과와 관료 비용을 함께 곱한다". 출처: https://vic3.paradoxwikis.com/Institutions. 구빈법·임금 보조는 레벨당 복지 지급 +20%, 노령 연금 +30% (https://vic3.paradoxwikis.com/Human_rights_laws). 그래서 빅토리아3의 복지 크기는 법 + 기관 레벨(관료 비용을 내고 올림)로 정해지고, 지급 상한이나 세입 비율 항목은 확인 못 함.
- 게임 정의 파일 (`common/defines/00_defines.txt`, https://raw.githubusercontent.com/jink47787/Historical_MP_Series_Vic3/main/basegame-ver/common/defines/00_defines.txt, 1.13.11)에서 복지 관련 줄은 `BUILDING_WAGES_WELFARE_INCOME_FACTOR = 0.8` (복지 소득 비율만큼 건물이 보는 부를 줄여 임금 덤핑을 막는다) 하나만 찾았다. 지급 식은 확인 못 함.

## 생산 방식의 공구 (2026-10-22, 위키 List of production methods)
출처: https://vic3.paradoxwikis.com/List_of_production_methods
- 광산 기본 방식 곡괭이와 삽(Picks and Shovels): 상점주 500·노동자 4,500, 공구 5 투입 → 석탄 25 (철·납·유황 광산은 각 20). 기본 방식도 공구를 쓴다.
- 증기 양수기(Atmospheric Engine Pump): 상점주 500·노동자 3,750·기계공 500·기술자 250, 공구 10 → 석탄 40 (철 등 40). 위 방식은 노동자가 줄고 숙련 직종이 생긴다.
- 농장 2차 방식 수확 도구(Harvesting Tools): 노동자 −1,000, 공구 2.0 (위키 요약이 투입·산출 칸을 구분해 주지 않아 투입인지 확인 못 함. 이름과 방식 성격상 투입으로 본다).
- 이 게임의 방식 사다리(DESIGN 7.1: 기본 방식도 공구 10~30, 단계가 오르면 일꾼이 줄고 숙련 비율·공구가 는다)는 이 동작을 따른다. 레벨당 이익 2배 규칙은 빅토리아3가 아니라 사용자 결정(2026-10-22)이다.

## 기본 방식의 원료 비중 (2026-10-22 확인, 산업 유형 근거)
출처: https://vic3.paradoxwikis.com/List_of_production_methods (방식), https://vic3.paradoxwikis.com/Goods (기본가).
기본가: 곡물 20, 목재 20, 철광석(Iron) 40, 석탄 30, 공구 40, 직물 20, 의복 30, 가구 30, 종이 30, 강철 50, 엔진 60, 식료품 30.

| 건물 · 기본 방식 | 일꾼 (5,000명 기준) | 투입 | 산출 | 원료비 / 매출 |
|---|---|---|---|---|
| 밀 농장 · Simple Farming | 노동자 4,000, 농부 1,000 | 없음 | 곡물 20 (400) | 0% |
| 벌목장 · Simple Forestry | 노동자 4,500, 상점주 500 | 없음 | 목재 30 (600) | 0% |
| 철광산 · Picks and Shovels | 노동자 4,500, 상점주 500 | 공구 5 (200) | 철광석 20 (800) | 25% |
| 석탄광산 · Picks and Shovels | 노동자 4,500, 상점주 500 | 공구 5 (200) | 석탄 25 (750) | 27% |
| 종이 공장 · Pulp Pressing | 노동자 4,500, 상점주 500 | 목재 30 (600) | 종이 40 (1,200) | 50% |
| 공구 작업장 · Crude Tools | 노동자 4,500, 상점주 500 | 목재 30 (600) | 공구 30 (1,200) | 50% |
| 가구 공장 · Handcrafted Furniture | 노동자 4,500, 상점주 500 | 목재 30·직물 10 (800) | 가구 45 (1,350) | 59% |
| 엔진 공장 · Steam Engines | 노동자 2,500, 기계공 1,500, 기술자 500, 상점주 500 | 강철 30 (1,500) | 엔진 40 (2,400) | 63% |
| 제강소 · Blister Steel Process | 노동자 3,500, 기계공 750, 기술자 250, 상점주 500 | 철광석 40·석탄 30 (2,500) | 강철 65 (3,250) | 77% |

- 일꾼 수는 모두 5,000명으로 같고 원료 비중이 0%에서 77%까지 다르다. 중공업만 숙련 직종(기계공·기술자)이 20~40% 있다.
- 식료품 공장과 방직 공장 기본 방식은 위키 표를 읽는 도구가 찾지 못했다 (확인 못 함).
- 이 게임의 산업 유형(DESIGN 7.1, `data.ts INDUSTRIES`)은 이 모양을 따른다: 1차 0~5%, 가공 약 50%, 중공업 약 60%. 다만 이익률을 모두 20%로 묶어서 원료가 많은 유형은 일꾼이 적다 (빅토리아3는 일꾼 수가 같고 이익률이 다르다). 광산은 빅토리아3(25%)보다 원료가 적다 (공구 30, 4%). 사치품(숙련) 유형 숫자는 빅토리아3 근거가 없다 (추정).

## 연구·혁신·기술 전파 (2026-10-22 확인, 위키 1.13)
출처: https://vic3.paradoxwikis.com/Technology
- 연구에 돈이 들지 않는다. 혁신(innovation)이 연구 포인트다. 모든 나라가 기본 50을 내고, 대학 레벨마다(다 채웠을 때) 방식에 따라 1~2를 더 낸다.
- 고른 연구에 쓸 수 있는 혁신은 상한이 있다: 50 + 나라 문해력 1%당 1.5. 상한을 넘는 혁신은 기술 전파에 쓰인다.
- 기술 전파(tech spread): 트리마다 한 기술씩, 다른 나라가 아는 기술이 퍼져 온다. 속도 = (25 + 0.2 × 쓰지 못한 혁신 + 0.75 × 문해력%) × 법 배율(언론 보호 +25%, 검열 −10% 등) × 무작위 0.5~1.5.
- 기술 값: 시대별 7,500 / 10,000 / 12,500 / 15,000 / 17,500. 같은 트리의 앞 시대 미연구 기술 수만큼 비싸진다.
- 다른 나라가 아는 기술이 싸진다는 내용은 위키에서 확인 못 함 (전파는 값을 깎지 않고 포인트를 쌓는다).

## 임금 조정·채용·가격 속도·임금 바닥 (2026-11-02 확인)
출처 (모두 직접 열어 확인):
- G2 = https://github.com/jink47787/Historical_MP_Series_Vic3/blob/main/basegame-ver/ (게임 원본 미러, defines 마지막 커밋 cb2d2ff "base latest 1.13.11"). 위 "소작농 소득"의 G와 같은 저장소다.
- T = https://github.com/tjysdsg/Victoria-3-files/blob/master/game/ (1.9.0). 같은 defines 키를 견주었다.
- 개발 일지: 포럼(forum.paradoxplaza.com)은 브라우저 확인 페이지만 준다. web.archive.org 사본으로 열었다 (링크마다 사본 시각).
- 패치 노트: https://vic3.paradoxwikis.com/Patch_1.1 ~ https://vic3.paradoxwikis.com/Patch_1.8 (1.4에는 해당 줄이 없다).
- 소유 건물 규칙 정리는 wt-manor 의 "소유 건물·소유 이동·임금 조정 (2026-11-02)" 절이 맡는다. 여기서는 개발 일지 원문 인용(5)만 둔다.

### 1. 건물 임금이 오르내리는 규칙
- 개발 일지 #11 (2021-08-19, 출시 전, https://web.archive.org/web/20221028033826/https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-11-employment-and-qualifications.1487723/):
  - "Wages are set by individual buildings in response to market conditions. A building that is losing money will decrease wages until it's back in the black. A building that has open jobs it can't seem to fill will raise wages until it either fills the necessary positions or runs out of excess profits."
  - "buildings won't increase wages due to labor competition if this would cause them to go into deficit"
  - 옮기는 조건: "they must be offered a measurably higher wage than the wage they're currently getting from their current employment."
- 게임 안 설명 (G2 `localization/english/concepts_l_english.yml` `concept_building_wage_desc`, 변수는 풀어 씀): "If a building's balance allows for raising wages at all, the building will only do so if it needs to in order to attract more pops to its workforce. If a building's balance is negative, it will consider lowering wages to return to profitability."
- 임금은 건물마다 기본 임금 하나다: "As a building can only adjust its base wage, all professions maintain the same ratio." (https://vic3.paradoxwikis.com/Peasants, 1.13)
- Defines (G2 `common/defines/00_defines.txt` NEconomy 484~547행, 1.13.11). 값과 주석 요지:

| 키 | 값 | 주석 요지 |
|---|---|---|
| MAX_WAGE_STEP_CHANGE | 0.1 | "Wage rates can change at most this much each week" |
| BUILDING_WEEKS_BETWEEN_PAY_CHANGES (적자일 때 `_WHEN_UNPROFITABLE`) | 0 (0) | 임금을 바꾼 뒤 쉬는 주. 0이라 매주 바꿀 수 있다 |
| BUILDING_INITIAL_WAGE_WEEKS | 2 | 새 건물은 처음 2주 임금을 바꾸지 않는다 |
| BUILDING_PROFIT_TARGET_TO_RAISE_WAGES | 0.25 | 이익률이 이 이상이어야 생활수준·채용 때문에 올리기를 검토한다 (소유 건물 0.5, 자급 건물 0.7) |
| BUILDING_PROFIT_TARGET_TO_LOWER_WAGES | 0.15 | 이익률이 이 이하면 내린다 (소유 건물 0.3, 자급 건물 0.5) |
| BUILDING_RAISE_WAGES_TARGET_WEALTH_MULT | 0.9 | "significant pops" 중 하나라도 부가 (기대 생활수준에 맞는 목표 부) × 0.9 이하면 올리기를 검토한다 |
| BUILDING_LOWER_WAGES_TARGET_WEALTH_MULT | 1.2 | 모두 목표 부 × 1.2 이상이면 내리기를 검토한다 |
| BUILDING_PREFER_LAYOFFS_TARGET_WEALTH_MULT | 0.66 | 하나라도 목표 부 × 0.66 이하면 임금을 깎기보다 해고를 택한다 (1.9.0은 0.5) |
| BUILDING_MAX_EMPLOYMENT_FRACTION_TO_RAISE_WAGES | 0.5 | 고용률이 이보다 높으면 다른 건물 일꾼을 빼 오려고 올리지 않는다 |
| BUILDING_HIGH_CASH_RESERVES_THRESHOLD | 0.5 | 유보 자산이 상한의 50%를 넘으면 적자여도 비용을 줄이지 않는다 |
| BUILDING_WAGES_OWNERSHIP_BUILDING_FACTOR | 0.75 | 다른 건물을 소유한 건물은 목표 임금 × 0.75 |
| BUILDING_FOREIGN_OWNERSHIP_WAGE_FACTOR | −0.25 | 외국 소유 비율만큼 목표 임금 −25% |
| BUILDING_WAGES_AVERAGE_PRODUCTIVITY_FACTOR (THRESHOLD 0.5, MAX 2.5) | 0.5 | 같은 종류 평균보다 생산성이 높은 건물은 이익이 괜찮으면 임금을 더 후하게 준다 |
| BUILDING_WAGES_MIN_RELEVANT_POP_SIZE | 50 | 노동력 50 미만 pop은 판정에서 뺀다 (직원 200 이상인 건물만, `_MIN_EMPLOYEES_FOR_RELEVANT_POP_SIZE_CHECK`) |
| MINIMUM_WAGE_RATE / MAXIMUM_WAGE_RATE | 10 / 100,000 | 임금률(직원 10,000명당 주급 £)의 절대 하한·상한 |

- T (1.9.0)도 MAX_WAGE_STEP_CHANGE, 쉬는 주, 이익률 문턱(0.25/0.15, 소유 0.5/0.3, 자급 0.7/0.5), LOWER 1.2가 같다. RAISE 0.9, 생산성 배율, 외국 소유 배율은 1.9.0 파일에 없다.
- 패치 노트로 본 바뀐 과정:
  - 1.1: "Buildings will now only raise wages if they are either competing for wages or are below their minimum wage target; the target is based on employees' Expected Standard of Living to prevent too much active radicalization", "Building wage targets are lowered in unincorporated states (e.g. colonies) and for discriminated pops"
  - 1.2: "Buildings will now lower wages or lay off employees if they are running a deficit and have <50% cash reserves…", "Buildings will no longer raise wages to attract new employees if no qualifying employees exist"
  - 1.5: "Buildings will no longer raise their wages to try and hire additional employees unless they can maintain a decent profitability after accounting for the increased employment", "A new building's wage rate is now initialized to whatever the average needed wage would be to sustain wealth levels in the state", "Buildings now evaluate wages more frequently when they're unprofitable"
  - 1.8: "Fixed an issue where non-ownership buildings had a too high profit target below which they'd lower wages… resulting in them lowering wages too soon"
- 위를 합쳐 읽으면: 임금은 주 단위로 많아야 0.1씩 움직이고, 올리는 쪽은 이익률 25% 이상일 때 빈자리나 직원 생활수준 때문에, 내리는 쪽은 이익률 15% 이하(1.2부터 유보 자산 50% 미만)일 때와 직원 부가 목표의 1.2배 이상일 때다 (두 조건의 결합은 아래 확인 못 함).
- **확인 못 함:** MAX_WAGE_STEP_CHANGE 0.1이 비율(10%)인지 임금률 절대값인지 (주석은 "this much"), 임금 검토가 매주 일어나는지 (쉬는 주 0과 1.5 "적자일 때 더 자주"만 확인), 올리기·내리기 조건이 서로 "그리고"인지 "또는"인지, "이익률"의 분모 (BUILDING_MAX_PROFIT_TO_PAUSE_HIRES 주석은 "fraction of revenue in profit"이라 매출 대비로 보인다).

**채용·해고 속도** (같은 파일 487~491·504·508·519·544~547·597~601행, 1.13.11)

| 키 | 값 | 주석 요지 |
|---|---|---|
| DEFAULT_MIN_HIRING_RATE / DEFAULT_MAX_HIRING_RATE | 0.01 / 0.1 | 건물·직종마다 한 주에 뽑는 양의 하한·상한, 완전 고용 대비 비율 |
| HIRING_RANGE_WEEKLY_CHANGE | 0.01 | 지금 속도로 뽑지 못하는지에 따라 채용 범위를 주마다 0.01씩 줄이거나 늘린다 |
| EMPLOYMENT_PROPORTIONALITY_LIMIT | 0.1 | 두 직종의 충원율 차가 0.1을 넘을 수 없다 |
| MINIMUM_EMPLOYEES | 10 | 직원이 10명 미만이면 늘 뽑으려 한다 |
| BUILDING_PROFIT_TARGET_TO_HIRE_EMPLOYEES | 0.25 | 이익률 25% 이상이면 더 뽑으려 한다 (소유 건물 0.5) |
| BUILDING_DEFAULT_MIN_EARNINGS_TO_HIRE_EMPLOYEES | 3 | 보조금 없는 건물은 직원 1인당 연 수익이 3 아래로 떨어지게 되면 뽑지 않는다 |
| BUILDING_PAUSE_HIRES_* | 0.75 / 0.1 / 0.5 / 0.2 | 이익이 매출의 20% 미만이고 고용률 10% 이상이면 채용을 멈출 수 있다. 유보 자산 75% 초과이고 고용률 50% 미만이면 이익이 낮아도 뽑는다 |
| BUILDING_FAILED_HIRE_COOLDOWN_WEEKS_WITHOUT_WAGE_RAISE | 4 | 채용에 실패하면 4주 쉰다. 그 사이 임금을 올리거나 채용 속도를 바꾸면 다시 시도 |
| BUILDING_LAYOFFS_DECREASE_BY | 0.05 | 해고는 고용률에 (1 − 0.05)를 곱한다 (주석 예: 0.15면 57% → 48.45%) |
| BUILDING_LAYOFF_HIRING_COOLDOWN_WEEKS | 4 | 해고한 건물은 4주 동안 뽑지 않는다 |
| MIN_RAISE_TO_HIRE | 0.10 | pop이 일자리를 옮기려면 임금이 10% 이상 높아야 한다 ("1.0 = +100% = x2") |

- T (1.9.0)도 채용 하한·상한, 범위 변화, 쉬는 주 4·4, 해고 0.05, MIN_RAISE_TO_HIRE 0.10이 같다.
- 패치 노트: 1.3 "Buildings with low cash reserves, at least 10% employment, and low profits will now avoid hiring more employees as this would often result in those employees then being fired a few weeks later". 1.5 "Buildings that want to hire more employees but do not succeed will now wait 4 weeks before trying again.", "If a building in hiring cooldown raises its wages, it will reset the cooldown."
- 이 게임과 다른 점: 이 게임은 건물마다가 아니라 지역·직종마다 시장 임금이 하나이고, 맞는 임금 쪽으로 날마다 거리의 `wageTargetSpeed` 비율씩 움직인다 (DESIGN 7.3). 채용은 날마다 자리별 상한이 있고, 재직자가 옮기는 문턱은 `switchPremium` 이다 (DESIGN 7.2). 빅토리아3의 옮기는 문턱 MIN_RAISE_TO_HIRE 와 같은 자리의 값이다.

### 2. 시장 가격이 움직이는 속도
- 개발 일지 #9 (2021-08-05, 출시 전, https://web.archive.org/web/20210821203738/https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-9-national-markets.1484917/): "In Victoria 3, a single unit of goods is produced and immediately sold at a price determined by how many consumers are willing to buy it at the moment of production. When this happens prices shift right away along with actual supply and demand". 재고도 없다: "there are no goods stockpiles involved in this system."
- Defines (G2 00_defines.txt 415~417행, 1.13.11): 가격 키는 MIN_GOODS_PRICE 1, PRICE_RANGE 0.75, BUY_SELL_DIFF_AT_MAX_FACTOR 2 ("if set to 4 then if buy orders are 4x sell orders price is maxed")뿐이다. "price"·"smooth"·"speed"로 찾았을 때 가격을 천천히 따라가게 하는 키는 없었다. T (1.9.0)도 PRICE_RANGE 0.75, BUY_SELL_DIFF_AT_MAX_FACTOR 2.
- 위키 Market (1.13)도 공식만 쓰고 갱신 주기·평활은 쓰지 않는다 (https://vic3.paradoxwikis.com/Market).
- 가격을 만드는 주문 쪽은 천천히 움직인다. 키는 확인했고, 이것이 가격을 느리게 만든다는 것은 해석이다:
  - 고용: 위 채용 상한(직종마다 주 10%). 산출은 고용을 따라 오른다.
  - pop 소비: 부 단계가 천천히 오르내린다 (NPops WEALTH_PROGRESS_INCREASE 0.2, WEALTH_PROGRESS_DECREASE 0.1, 1395~1399행).
  - 대체재 수요: 한 번 갱신에 MAX_DEMAND_ADJUSTMENT_BASE_AMOUNT 0.01 + MAX_DEMAND_ADJUSTMENT_SCALED_AMOUNT 0.09까지만 바뀐다.
  - 품귀 벌칙: 하루 0.01씩 오르내린다 (GOODS_SHORTAGE_PENALTY_INCREASE_SPEED / DECREASE_SPEED).
- **확인 못 함:** 가격을 매일 계산하는지 매주 계산하는지.
- 이 게임과 다른 점: 이 게임은 가격이 날마다 `PRICE_SPEED` 비율씩 따라간다 (DESIGN 11장 `PRICE_SPEED` 행). 빅토리아3는 가격 자체에 따라가는 속도가 없고, 주문이 느리게 바뀐다.

### 3. 최저임금·자급 소득·임금 바닥
- 기본 게임 1.13.11 법 파일(G2 `common/laws/`)에 "최저임금" 법은 없다. 임금에 닿는 법은 노동권(Labor Rights: No Workers' Rights / Regulatory Bodies / Workers' Protections)과 복지(Welfare: Poor Laws / Wage Subsidies / Old Age Pension 등)다. 같은 저장소의 `Historical MP Series/common/laws/HMPS_minimum_wage.txt`는 모드 파일이다.
- 이 법들이 주는 것은 "건물 임금 목표" 배율 `building_minimum_wage_mult`다. 화면 이름 "Building Wage Target", 설명 "A bonus or penalty to what is considered an acceptable wage for a [concept_building] to pay to its employees. Increasing this will result in higher average wages over time." (G2 `localization/english/modifiers_l_english.yml`)
  - Workers' Protections: 작업장 안전 기관 레벨당 +10% (`common/laws/02_labor_rights.txt` `institution_modifier`). Regulatory Bodies에는 없다.
  - Wage Subsidies: 사회 보장 기관 레벨당 +10%, Old Age Pension: +15% (`common/laws/02_welfare.txt`). Poor Laws에는 없다.
  - 비편입 주: −20%, 자급 산출도 −20% (`common/static_modifiers/00_code_static_modifiers.txt` `unincorporated_state`, 주석 "To balance for unincorporated states not paying taxes").
  - 이벤트 수정치 "Temporary Minimum Wages": +20% (`common/static_modifiers/105_modifiers.txt` `temporary_minimum_wages`).
- 그래서 빅토리아3의 "최저임금"은 법정 바닥이 아니라, 건물 AI가 받아들일 만하다고 보는 임금 목표를 올리는 배율이다. 목표 자체는 1.1 패치 노트대로 직원의 기대 생활수준에서 온다 (위 1절).
- Peasants 문서 (1.13): 보통 임금은 "used as the base wage of government-funded buildings as well as the baseline for welfare payments and minimum wage." 보통 임금이 임금 목표의 기준이라는 뜻으로 읽히나, 1.1의 "기대 생활수준 기준"과 어떻게 합쳐지는지는 **확인 못 함**.
- 보조금 건물에만 보통 임금이 바닥이 된다 (concepts `concept_subsidized_wage_desc`, 태그는 풀어 씀): "When a Subsidized Building cannot pay their Workforce at least the Normal Wage, the remainder is covered by government Subsidies through the Treasury. In return the Building will never fire its Workforce and aim to keep Throughput maximized at all times."
- 자급 소득과 임금: SUBSISTENCE_OUTPUT_AVERAGE_WAGE_RATE_FACTOR = 150, "Each 1.0 of subsistence output counts as this much wage rate when setting normal wages" (00_defines.txt 530행, 1.9.0도 150). 소작농 현물 소득이 보통 임금 계산에 임금으로 들어가고, 보통 임금은 정부 임금·복지·(위키 표현의) 최저임금의 기준이 된다. 자급 산출이 민간 건물 임금의 바닥으로 직접 쓰인다는 내용은 못 찾았다.
  - 시작 임금: STARTING_WAGE_RATE_SUBSISTENCE_MULTIPLIER 0.5 (자급 건물 시작 임금률 × 0.5), PEASANT_STARTING_WAGE_RATE_FACTOR 1.0 (시작 보통 임금을 셀 때 소작농 직종 배율을 1로 본다).
  - 절대 하한은 MINIMUM_WAGE_RATE 10 (직원 10,000명당 주 £10)뿐이다.
- 이 게임과 다른 점: 이 게임은 최저임금·곡물 최저가를 두지 않는다 (CLAUDE.md). 빅토리아3도 법정 임금 바닥은 없고 (엔진 하한 MINIMUM_WAGE_RATE 와 보조금 건물의 보통 임금만 예외), 법은 건물이 임금을 올리는 목표를 바꾼다.

### 4. 정부 임금 단계와 보통 임금
- 단계 값 (G2 `common/static_modifiers/00_code_static_modifiers.txt`): `government_wages_very_low` −0.3 / `low` −0.15 / `medium` (비어 있음 = 0) / `high` +0.15 / `very_high` +0.3 (`country_government_wages_mult`). 위 "정부 임금 단계"의 −30~+30%가 맞다. 군 임금도 같은 다섯 값이다 (`country_military_wages_mult`).
  - 다른 효과: 지식인·소부르주아 이익집단 지지 −2/−1/0/+1/+2, 매우 낮음·낮음은 위신 −20%/−10%, 높음·매우 높음은 권위 +5%/+10%.
- 나라 하나에 한 단계다: "All [Government Buildings] except [Military Buildings] pay their [workforce] according to the same standardized Government Wage rate. This rate is based on the [Normal Wage] in the [country], with any adjustments set in the Budget panel." (concepts `concept_government_wage_desc`, 태그 줄임). 수정치 설명: "How much more or less than the [concept_normal_wage] government employees get paid." (modifiers `country_government_wages_mult_desc`)
- 보통 임금 = 편입 주 산업 건물 임금의 나라 평균: "It is determined from the average $concept_building_wages$ paid by [Concept('concept_building','$concept_building_industries$')] across [Concept('concept_incorporated_state', '$concept_incorporated_states$')]." (concepts `concept_normal_wage_desc`). Peasants 문서: "The country-wide average of base wages in incorporated states is called the normal wage."
- 위 인용을 합친 식: 정부 건물 임금 = 보통 임금 × (1 + 단계 배율) × 직종 배율 (위 직종 배율 표). 민간 임금이 오르면 보통 임금을 거쳐 정부 임금도 오른다. 정부 건물은 매출이 없고 국고에서 받는다 (concepts `concept_government_building_desc`).
- **확인 못 함:** 보통 임금 평균이 사람 수 가중인지, 얼마나 자주 다시 계산하는지, 자급 산출 150 환산이 소작농을 어떤 무게로 넣는지.

### 5. 개발 일지 원문 (#110, #71, web.archive.org)
- DD#110 "Building Ownership & Foreign Investment" (2024-03-28, 1.7 대상, https://web.archive.org/web/20240914145639/https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-110-building-ownership-foreign-investment.1647879/). 위 "저택" 절의 "원문 확인 못 함"을 채운다:
  - "Manor Houses are able to own levels of other buildings, in our case at game start all the levels of Subsistence Farms in their own states. They pay their wages and dividends by collecting dividends from the buildings they own and distributing them among their employees."
  - 금융가: "They too have different employment PMs, can own levels of other buildings and pay their employees by collecting dividends from owned building levels."
  - "In worker-owned buildings employees work for themselves basically. So any dividends they may accumulate, they split amongst themselves."
  - "Both new buildings expand automatically, depending on how many levels they own."
  - "All building levels that you construct are country-owned. Under certain laws, this status can change soon after they are finished constructing."
  - "When a building is about to be constructed by private investment, we randomly determine who is building it, favoring already existing Financial Districts and Manor Houses over creating new ones."
  - "In a worker-owned economy, the private investment pool will continue to function, but they will only expand their own buildings, not create new ones."
  - 임금 수치나 임금 규칙 변경은 이 일지에 없다.
- DD#71 "Autonomous Investment in 1.2" (2023-01-18, https://web.archive.org/web/20230120172750/https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-71-autonomous-investment-in-1-2.1565414/, 요약본 https://paradoxinteractive.com/games/victoria-3/news/dev-diary-71-autonomous-investment-in-1-2):
  - "Certain Pop Types with ownership shares in buildings pay part of their dividends into the Investment Pool"
  - "Capitalists invest the highest percentage of their dividends (20%), followed by Aristocrats at 10%, with Farmers and Shopkeepers investing only 5% each." 1.2 일지의 값이다. 위 "저택" 절의 1.13 Treasury 위키 값(자본가 30%, 귀족·성직자·상점주 20%)과 버전이 달라 값이 다르다.
  - "The Construction capacity of the country will be split between the Private and Government queues in a proportion based on your economic law, though if there isn't enough constructions queued of one type to use its full allocation, the excess can be used by the other queue instead."
  - "Private Constructions, unlike Government ones, cannot be reprioritized or canceled"
  - 민간 공사 AI는 "prioritizes the creation of profitable buildings which will create lucrative jobs for the investing Pop types"
  - 임금에 관한 문장은 없다.
- DD#11은 1절에 인용했다. DD#131(기상 조건)은 이번에 다시 시도하지 않았다.

## 이익집단 (2026-11-02 확인, 위키 1.13)
출처: https://vic3.paradoxwikis.com/Interest_groups (끌림 가중치, 영향력 문턱, 승인 항, 특성), https://vic3.paradoxwikis.com/Landowners, https://vic3.paradoxwikis.com/Power_structure_laws (권력 분배법), https://vic3.paradoxwikis.com/Economy_laws (세법·경제 체제 입장), https://vic3.paradoxwikis.com/Human_rights_laws (복지법 입장), https://vic3.paradoxwikis.com/Laws (법 제정), https://vic3.paradoxwikis.com/Pops (급진·충성), 개발 일지 요약 https://www.gamewatcher.com/news/victoria-3-dev-diary-6-interest-groups-political-parties
- 집단 8개 (군부, 종교, 자본가 Industrialists, 지식인, 지주, 소시민 Petite Bourgeoisie, 농민 Rural Folk, 노동조합). pop 의 개인이 집단을 고르고, pop 은 정치 힘을 끌림 가중치 비율대로 나눈다 ("divide up their political strength proportionally").
- 영향력(clout) = 집단 정치 힘 ÷ 모든 집단의 합 (합 100%). 개발 일지 예: 벨기에 전체 10만 중 지주 3만이면 30%. 힘셈: 20% 넘음 (18% 아래로 내려가면 되돌아감). 소외: 4% 아래 (5% 넘으면 되돌아감). 정부에 든 집단은 소외되지 않는다.
- 정치 힘: "primarily their wealth, acceptance and the status (and votes) they are offered under the nation's power structure". 과두정의 부유한 귀족 한 명이 가난한 노동자의 수백~수천 배. 투표권이 없는 사람(차별받는 사람, 여성 참정권·노령 연금이 없는 나라의 부양가족)은 정치 힘이 없다. **부와 정치 힘의 식은 확인 못 함** (Pops 문서도 "based primarily on its wealth level" 까지만).
- 끌림 가중치 (직종): 자본가 집단 = 자본가 +250 (+ 생활수준 1당 1), 기술자(Engineers) +50 (+2/생활수준), 상점주 +25 (+2.5/생활수준). 지주 = 귀족 +250, 성직자 +50, 장교 +25, 농부 +25 (+ 생활수준). 농민 = 농업·목축·대농장·벌목·어업·포경·저택에서 일하면 기본 100. 노동조합 = 농업·목축·대농장 밖이면 +50, 기계공 +150, 노동자 +50, 중층 −10 (−1/생활수준). 소시민 = 하층 +2/생활수준 (10 이하 0), 중층 +3/생활수준, 농업 밖 +2/생활수준 (10 미만 0). 지식인 = 문해력 1%당 +0.2 (50% 미만 0, 문해력 25% 넘어야 회원). 종교 = 기본 25, 문해력 1%당 −0.15. 군부 = 군 관련 직종·산업.
- 승인 항: 법 입장 (강하게 반대 −2 … 강하게 찬성 +2, 합 ±5), 법 바꾸기 (제안 중이거나 최근에 바뀐 법, 1칸 ±5·2칸 ±10·3칸 이상 ±20, 5년 동안 줄어듦, 통치 원칙·노예제 ×2·토지 개혁 ×1.5, 합 ±20), 충성·급진 (지지 pop 이 모두 충성이거나 급진이면 ±15, 약 6%마다 1), 임금 (정부 임금 → 지식인·소시민, 군 임금 → 군부, 단계마다 ±1), 힘센 야당 −1, 사건, 로비 달래기 (−10~+10). 합 ±20.
- 기분: 성남 −10 이하, 불만 −9~−5 (부정 특성), 중립 −4~+4, 만족 +5~+9 (첫 긍정 특성), 충성 +10 이상 (둘째 긍정 특성). 특성은 −5/+5/+10 에서 켜지고 −2/+2/+7 에서 꺼진다. 힘센 집단은 효과 2배, 소외된 집단은 특성 없음.
- 특성 (불만 / 만족 / 충성): 자본가 제조업 세입 −10% / 생산 연구 +10% / 자본가 투자 풀 기여 효율 +10%. 지주 농업·목축·대농장 세입 −10% / 영향력 +10% / 귀족 투자 풀 기여 효율 +10%. 소시민 영향력 −10% (차별받는 집단 급진화 +10%) / 관료제 +10% / 대출 이자 −10%. 농민 기술 전파 −10% / 농업·목축·대농장 처리량 +10% / 기반 시설 +10%. 노동조합 국가 공사 효율 −10% / 제조업 처리량 +10% / 노동 인구 비율 +5%. 지식인 위신 −10% / 사회 연구 +10% / 이주 끌림 +15%. 종교 교육 접근 −10% / 권위 +10% / 출생률 +2.5%. 군부 군수품 값 +15% / 군사 연구 +10% / 부대 공격·방어 +10%.
- 권력 분배법 (정치 힘, https://vic3.paradoxwikis.com/Power_structure_laws): 전제 귀족·장교 +50%. 기술 관료제 학자·기술자·장교 +33%. 과두정 귀족 +50%, 자본가 +25%, 장교 +50%. 지주 투표 표의 정치 힘 귀족 +100, 자본가·성직자·장교 +50 (땅·자본 가진 사람이 투표). 재산 투표 표당 +50, 투표 부 문턱 20 (부유할수록 표가 많다). 인구 조사 선거 표당 +50 × 문해력, 부 문턱 10 (일정 신분의 글 아는 남자). 보통 선거 표당 +50 (성인 남자 모두 같은 표). 무정부 모든 pop +1, 부에서 오는 정치 힘 −75%. 입장 (자본가/지식인/지주/소시민/노동조합): 전제 −1/−1/+2/−1/−2, 과두정 +1/−1/+1/−1/−2, 지주 투표 0/0/+2/−1/−1, 재산 투표 +1/+1/0/0/−1, 인구 조사 0/+2/−1/+1/0, 보통 선거 −2/+2/−2/−1/+2. 농민·종교·군부 입장은 이 문서에서 확인 못 함.
- 세법 입장 (군부/자본가/지주/소시민/농민/노동조합): 소비세 −1/0/+1/0/+1/0, 토지세 0/0/+1/−1/−1/0, 인두세 +1/+1/0/+1/0/−1, 비례세 +1/0/−1/+1/0/0, 누진세 +1/−1/−2/−1/0/+1. 지식인 입장은 확인 못 함.
- 복지법 입장 (종교/자본가/지주/노동조합): 사회 보장 없음 −1/0/+1/−2, 구빈법 0/+1/0/0, 임금 보조 +1/−1/−1/+1, 노령 연금 0/−2/−1/+2. 소시민·농민·지식인·군부는 확인 못 함.
- 법 제정 (https://vic3.paradoxwikis.com/Laws, 2026-11-02 두 번 읽음):
  - 시작: 정부에 든 이익집단, 통치자, 또는 활동성 25 이상의 운동이 그 바꾸기를 지지해야 한다. 정당성 25 미만이면 운동이 지지한 법만.
  - 단계 셋 (전제는 Introduction·Consideration·Adoption). 검문 사이 기본 100일, 통치 원칙 200일, 권력 분배·경제 체제·노예제는 150일로 보인다 (위키 표가 흐려 확실하지 않음).
  - 검문마다 넷 중 하나: 성공 (다음 단계, 마지막이면 바로 시행), 전진 (보통 성공 확률을 올리는 사건), 논쟁 (좋거나 나쁜 사건), 정체 (보통 성공 확률을 내리는 사건). 확률 보정은 남은 단계에 이어진다. 사건 중이나 성공 확률이 0% 가 되면 차질이 생기고, 차질 3번이면 실패한다.
  - 식: 기본 성공 = 지지하는 정부 이익집단의 영향력 + 지지하는 운동의 지지 + 통치자 지지. 기본 정체 = 0.5 × 중립 이상 반대 집단 영향력 + 불만 반대 집단 + 1.5 × 성난 반대 집단 + 반대 운동 + 통치자 반대. 전진 = 2 × 기본 성공 − 기본 정체. 논쟁 = 100 − (전진 + 성공 + 정체). 논쟁이 0% 아래로 가면 성공과 정체 중 작은 쪽을 줄여 합을 100% 로 맞춘다. 그 밖의 최소·최대는 위키에 없다.
  - 반대는 소외되지 않은 집단만 센다 ("Non-marginal opposing groups add stall"). 집단은 지금 법보다 좋아하는 법을 지지하고 덜 좋아하는 법에 반대한다.
  - 통치자: 지금 법과 다른 칸 수마다 ±5%. 법 약속 조약: 상대 순위 단계마다 +5%.
  - 취소는 언제든 된다. 취소하거나 차질 3번으로 실패하면 그 법을 2년 동안 다시 내지 못한다. 취소의 승인 벌은 위키에 없다 (확인 못 함).
  - 단계마다 성공·정체가 실제로 몇 % 인지 예시 숫자는 위키에 없다 (확인 못 함).
- 급진·충성: 생활수준이 오르면 덜 급진·더 충성, 내리면 급진 ("a quick route to increased radicalism"). 기대 생활수준 아래에 머물면 급진이 쌓인다. 변하는 속도 숫자는 문서에 없다 (확인 못 함).

## 소유 건물·소유 이동·임금 조정 (2026-11-02 확인, 위키 1.13, 저택 지분 설계 `docs/overhaul/MANOR_SHARES.md`)
출처: https://vic3.paradoxwikis.com/Patch_1.7, https://vic3.paradoxwikis.com/Building, https://vic3.paradoxwikis.com/Investment_pool, https://vic3.paradoxwikis.com/Companies, https://vic3.paradoxwikis.com/Characters, https://vic3.paradoxwikis.com/Profession, https://vic3.paradoxwikis.com/Building_modding, https://www.thegamer.com/victoria-3-sphere-of-influence-guide-to-nationalization/ (공식이 아닌 안내서).
- 소유 개편은 1.5 가 아니라 **1.7** (Sphere of Influence) 이다. 1.7 패치 노트: "Ownership is represented by two new buildings, Manor Houses (housing the Aristocracy) and Financial Sectors (housing Capitalists)", 이들은 "can own buildings outside their own states or even their country" (Patch_1.7, 직접 확인).
  - 그래서 **저택이 자기 주(state) 건물만 갖는다는 제한은 없다.** 같은 주·다른 주 소유에 대한 산출·배당 보정은 찾지 못했다 (확인 못 함).
  - 외국 투자: 투자권 협정·세력권 원칙으로 다른 나라에 민간 산업을 지을 수 있다. 종주국은 늘 속국에 지을 수 있다. 외국 소유 산업은 외교 요구로 국유화할 수 있다 (Patch_1.7, 직접 확인). 외국 소유 건물의 생산 방식은 주인 나라만 바꾼다: "Only the owner of a state can change the PMs, regardless of percentage of foreign ownership." (Building, 직접 확인).
  - 회사의 지역 본부: 투자권 특허가 있으면 외국에 건물 5개를 가진 뒤 지역 본부를 세우고, 지역 본부는 수입 일부를 본사 투자 풀로 보낸다 (Companies, 조사 에이전트 확인).
  - TheGamer 안내서: 관세 동맹이 아니면 외국 건물의 이익은 해외로 간다 (공식 아님).
- 주인: "Each building level has a certain owner" — 정부, 그 건물 직원, 소유 건물 (회사·상층 pop 도 나온다) (Building, 직접 확인). 레벨 하나에 주인 하나.
- 몫: pop 소유 레벨은 "ownership shares which entitle that pop to a proportion of a building's cash reserve and dividends". 배당은 몫마다, "Shares are per employee" (금융가 사유: 자본가 10, 상점주 1) (Building, 직접 확인). 소유 건물이 가진 레벨의 배당은 그 소유 건물로 가고, 거기 고용된 pop 에게만 나눈다 (Building_modding `other` = "pays dividends only to own pops", 조사 에이전트 확인). 즉 **빅토리아3의 귀족은 저택에 고용되어야 배당을 받는다** (개인 지분이 없다).
- 국영: "Buildings owned by a government split dividends between the treasury and investment pool" (경제 체제 법), 일부는 정부 배당 효율로 사라진다 (Building, 직접 확인). 1.7: "State-owned enterprises ... yield dividends directly to state coffers (or drain them, if unprofitable)" (Patch_1.7, 직접 확인).
- 협동 소유: 자영농지법은 농업 건물을 시간이 지나며 50% 자기 소유로 바꾼다 (Patch_1.7, 직접 확인). 협동 소유 회사 레벨은 배당의 75% 를 일꾼에게 (Building, 조사 에이전트 확인).
- 소유가 바뀌는 길:
  - 투자 풀은 공사와, 국유·일꾼 소유 건물의 민영화에 쓴다. 민영화 값은 국고로 간다 (Investment_pool, 조사 에이전트 확인).
  - 국가가 지은 건물은 대부분의 경제 체제에서 완공 뒤 매물로 나온다. 다른 체제는 보상하거나 하지 않고 국유화할 수 있다 (Patch_1.7, 직접 확인).
  - 1.7: 일꾼이 없는 레벨이 여럿이고 50% 이상 민간 소유인 건물은 오래 못 뽑으면 민간 소유 레벨을 스스로 줄인다 (Patch_1.7, 직접 확인).
  - pop 사이에 몫을 사고파는 시장: 찾지 못했다 (확인 못 함). 새 레벨이 어느 주의 저택·금융가 것이 되는지: 확인 못 함.
- 가문·인물: 건물을 가진 가문·왕조는 찾지 못했다. 거물(Magnate)은 "tied to a holding in their home state, either Manor Houses or Financial Districts", 그 소유 건물의 수입이 거물의 명성(10~50)을 올린다. 경영자(Executive)는 회사를 이끌고 특성이 회사 소유 건물에 영향을 준다 (Characters, 직접 확인). 거물이 소득을 받거나 건물을 갖는지는 문서에 없다 (확인 못 함).
- 임금 (Profession, 직접 확인):
  - "Buildings raise their base wage primarily to attract employees when it cannot otherwise fill empty positions." 이익이 아주 크면 직원 생활수준이 기대보다 낮을 때도 올린다. "unprofitable and moderately profitable buildings decrease wages to restore profitability".
  - 직종 배율: 소작농 0.2, 노동자 1, 사무원·기계공·서비스직 1.5, 농부 2, 성직자·상점주·기술자 3, 관료·학자 4, 귀족·자본가·장교 5. 귀족·자본가는 "Not paid wages outside government-funded buildings."
  - 자격이 없는 pop 은 뽑지 않는다.
  - 채용 속도: 건물 정의 키 `min/max_hiring_rate` = 한 주에 뽑을 수 있는 인원 비율, 소유 건물은 `hiring_rate = 1.0`, `min_raise_to_hire` = 옮기는 데 필요한 최소 임금 인상 (Building_modding, 조사 에이전트 확인). 기본값 숫자와 주마다 임금 변동 폭: 확인 못 함 (유보 자산 절의 "주마다 최대 10%" 는 Treasury·Defines 문서 기준).
- 이 게임과 다른 점: 저택 지분 설계는 몫을 "고용"이 아니라 pop 의 재산(`Pop.fund`)으로 둔다. 빅토리아3 와 다르다 (사용자 결정 2026-11-02).
