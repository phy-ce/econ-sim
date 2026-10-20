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
- 이 게임과 다른 점: 이 게임은 모든 pop의 남는 현금(생활비·세금 10일치 초과분의 하루 5%)도 투자 풀로 간다 (`DESIGN.md` 9.3). 측정한 유입의 61~93%가 이것이다 (`DECISIONS.md` 7-8).

## 건물 유보 자산 (cash reserves, 2026-10-21 확인)
출처: https://vic3.paradoxwikis.com/Treasury, https://vic3.paradoxwikis.com/Defines, https://vic3.paradoxwikis.com/Building, https://vic3.paradoxwikis.com/Patch_1.2, https://vic3.paradoxwikis.com/Patch_1.3, https://vic3.paradoxwikis.com/Patch_1.8
- 건물마다 유보 자산 상한이 레벨당 상수다 (£25,000/레벨, 소유 건물은 £10,000/레벨).
- 이익이 나면 주간 이익의 25~50%를 유보 자산에 넣는다 (수익률에 따라 26~78주에 다 찬다). 나머지는 배당이다. 다 차면 이익을 100% 배당한다.
- 적자일 때 유보 자산이 50% 넘으면 임금을 깎지 않는다. 50% 아래이고 적자면 임금을 깎거나 해고한다 (임금은 주마다 최대 10%).
- 유보 자산이 적으면 채용을 멈추고, 자동 증설은 유보 자산이 95% 이상일 때만 한다.
- 이 게임: 상한 = 레벨 × 레벨당 주간 산출 가치(기본가) × 0.5주 (`TUNE.reserveWeeks`), 이익의 35%를 쌓고, 다 차면 100% 배당, 적자는 유보 자산에서 먼저 뺀다. 유보 자산이 남아 있으면 가동률을 줄이지 않고 철거 주 수를 세지 않는다 (`DESIGN.md` 9.3). 임금 깎기·채용 멈춤·증설 조건은 유보 자산과 잇지 않았다 (임금은 회사 단위다).

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
