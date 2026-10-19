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

## 소작농 소득 (일부만 확인)
- 소작농은 필요의 5%만 시장에서 산다. 나머지는 "자급 산출" 묶음으로 받고, 이것은 시장과 상호작용하지 않는다 (https://vic3.paradoxwikis.com/Needs).
- 자급 농장 기본 방식: 레벨당 소작농 5,000명이다.
- **확인 못 함:** 산출이 돈으로 바뀌는 정확한 공식, 시장가로 매기는지 여부.

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
