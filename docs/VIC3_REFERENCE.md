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

## 건물 임금 (https://vic3.paradoxwikis.com/Profession, https://vic3.paradoxwikis.com/Vickypedia, https://vic3.paradoxwikis.com/Defines)
- 건물마다 기본 임금이 있고 직종 배수를 곱한다. 직종 사이 비율은 고정이다.
- 올리는 신호는 빈자리다: "Buildings raise their base wage primarily to attract employees when it cannot otherwise fill empty positions."
- 고용이 임금에 막히면 "it will increase Wages for as long as its Balance remains positive" (Vickypedia, Occupancy).
- 내리는 신호는 적자다: "If a Building's Balance is negative, it will consider lowering Wages" (Vickypedia, Wage).
  - "unprofitable and moderately profitable buildings decrease wages to restore profitability" (Profession).
- 1.1 패치부터 경쟁 중이거나 기대 생활수준 기반 목표보다 낮을 때만 올린다 (https://vic3.paradoxwikis.com/Patch_1.1).
- 1.13 defines:
  - MAX_WAGE_STEP_CHANGE 0.1 (주마다 최대 변화)
  - BUILDING_INITIAL_WAGE_WEEKS 2 (새 건물은 2주 동안 임금 고정)
  - BUILDING_PREFER_LAYOFFS_TARGET_WEALTH_MULT 0.66 (직원 재산이 목표의 0.66 이하면 임금 삭감 대신 해고)
  - MINIMUM_WAGE_RATE 10 (100명 묶음당 주간 £, 기술적 하한)
- 정상 임금(normal wage) = 편입 주 기본 임금의 나라 평균. 정부 자금 건물의 기본 임금이다 (Profession, Vickypedia "Normal Wage").
- **확인 못 함:** MAX_WAGE_STEP_CHANGE가 비율인지 절대값인지.

## 건물 현금 보유고 (https://vic3.paradoxwikis.com/Treasury, https://vic3.paradoxwikis.com/Building)
- 최대치는 레벨당 £25k다 (소유 건물 £10k, 교역소 £5k).
- 흑자 건물은 보유고가 최대치로, 적자 건물은 0으로 간다.
- 흑자일 때 이익의 25~50%를 쌓고 나머지를 배당한다. "Buildings with full cash reserves pay their entire weekly profit as dividends."
- 보유고가 최대치의 50%를 넘으면 적자라도 비용을 줄이지 않는다 (BUILDING_HIGH_CASH_RESERVES_THRESHOLD 0.5, Defines).
- **확인 못 함:** 건물이 빌릴 수 있는지(찾은 자료에 건물 대출은 없다), 보유고 0인 적자 건물이 투입재를 덜 사는지.

## 보조금 (https://vic3.paradoxwikis.com/Vickypedia, https://vic3.paradoxwikis.com/Defines)
- 보조금 건물이 임금을 못 주거나 투입재 비용이 매출을 넘으면 "the Treasury will cover the difference" (Vickypedia, Subsidies).
- SUBSIDIES_MIN_GAIN 0: 보조금 건물은 주간 보유고 증가가 적어도 0이 될 만큼 보조금을 받는다 (1.13 defines). 국고가 적자를 딱 메운다는 뜻이다.
- 보조금은 "can be expensive and does not solve the underlying issue" (Profession).
- 국고 지출 항목 "Subsidies" (Treasury).
- 정부 자금 건물(is_government_funded: 정부 건물, 항구)은 비용 전부를 정부가 낸다. 보조금과 따로다 (https://vic3.paradoxwikis.com/Building_modding).
- **확인 못 함:** AI가 보조금을 고르는 비용 한도.

## 투자 풀과 정부 배당 (https://vic3.paradoxwikis.com/Building, https://paradoxinteractive.com/games/victoria-3/news/dev-diary-71-autonomous-investment-in-1-2)
- 민간 건설은 단일 주체가 아니다: "anything the Pops themselves are building". 투자하는 pop 직종에 좋은 일자리를 만드는 수익 건물을 고른다 (DD71).
- 다른 건물이 소유한 레벨의 배당은 소유 건물(장원, 금융가)로 가고, 거기서 pop에게 나눈다 (Building).
- 국고 수입 "Government Dividends": 정부 소유 건물의 이익 (Treasury).
