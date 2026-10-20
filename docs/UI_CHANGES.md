# UI 수정 요청 (sim 변경 반영 + 소유 구분)

이 문서는 `packages/sim` 게임 로직이 바뀐 내용과, 그에 맞춰 `packages/client` 화면을 어떻게 고쳐야 하는지 정리한 것이다.
여기에는 **아직 할 일만** 둔다. 화면에 다 반영된 절은 `docs/UI_DONE.md`로 옮긴다 (원문과 확인 근거를 같이 남긴다). 절 번호(2-xx)는 옮겨도 바꾸지 않는다.

## 공통 규칙
- 화면에 설명 문구를 넣지 않는다. 아이콘, 색, 숫자, 짧은 이름만 쓴다. 툴팁은 써도 된다.
- 한국어와 영어 UI를 모두 지원한다. 문자열은 `strings.ts`의 `T`와 `lang` 방식을 따른다.
- `packages/sim`은 고치지 않는다. 필요한 export가 없으면 이 문서의 "sim 쪽 필요 사항"에 적힌 대로 요청만 한다.
- 다크 모드(`:root[data-theme="dark"]`)에서도 구분이 되어야 한다.
- 검증
  - 루트에서 `npm run typecheck`가 통과해야 한다.
  - 개발 서버는 `cd packages/client && npx vite --port 5199`로 띄운다.

## 0. 지금 할 일 (2026-10-21 기준, 위에서부터)
지금 깨진 화면은 없다 (재정 단계 버튼 2-23은 반영됨). 아래는 모두 사용자 요청이거나 정리다.
1. **금고와 대출을 한 칸으로 (2-28).** 상단 칩 `App.tsx` 144~145, 재정 탭 `FinancePanel.tsx` 19의 `현금`·`대출` 두 칸을 `금고  순자산 / 한도` 한 칸으로. 2-35의 금고 상자도 같은 모양.
2. **재정 탭: 단계별 예산 미리보기 (2-30).** 지난주·이번주 열을 없애고 `budgetPreview(world, kingdomId)` 한 표로. 단계 버튼 아래에 `byLevel`. 안 쓰는 재정 문자열도 지운다.
3. **상회 상세 → 왕국 경제 창, 왕실 요약은 왕국 합계 (2-35, 사용자 요청 2026-10-21).** 왕실·민간 회사로 나눈 통계를 없애고 왕국 하나의 숫자 + 소유 구성 막대(왕실 / 민간 지분 / 저택 / 금융가)로. 통계의 `summary`(`BottomPanel.tsx` 39)도 정부 + 민간 합계로 바꾸고, 금고 상자만 왕실 것으로 둔다 (2-35-1).
4. **건물 유보 자산 (2-31).** 건물 패널에 `reserve / reserveCap(b)` 막대 (`hasReserve(b)`일 때). 2-35 건물 표에도 같은 막대.
5. **저택·금융가가 무엇을 가졌는지 (2-32).** 소유 건물 창에 `holdingsOf` 표, 지역 패널 세 묶음, 일반 건물 상세에 "→ 저택/금융가" 칩.
6. **부·생활수준 지도 그라데이션 (2-33).** `RegionMap.tsx` 46~52 `wealthColor`를 OKLab 보간으로, 범례 160~162를 연속 막대로.
7. **아래 창 버튼은 켜기/끄기 토글 (2-34).** `WindowWorkspace.tsx` 13·59·67~70: 최소화 상태와 왕국 지도 버튼을 없앤다.
8. **100배 값 필드로 옮기기 (2-27).** 남은 세 파일: `CompanyPanel.tsx` 46 `b.crew`, `PopTable.tsx` 23·24·28 `p.wealth`·`p.literacy`, `RegionPanel.tsx` 119 `r.education`. 끝나면 알려 달라 (sim이 사본을 지운다).
9. **광맥은 자원별 (2-26).** 지역 땅 표시(`RegionCircles.tsx` 22~29)의 광맥을 철·석탄 두 줄로.
- **아직 sim에 없음 (만들지 말 것, 들어오면 이 목록에 올린다):**
  - 건물별 임금·현금·보조금 (브랜치 wt-wage). 들어오면 국영 임금 손잡이(`budget.wages`)가 없어지고, 건물 패널에 임금·현금·보조금 켜기가 생기고, 저장 형식이 바뀐다(옛 저장은 `migrateWorld`로 변환). 그래서 2-30의 국영 임금 줄은 작게 두어도 된다.

---

## 1. 바뀐 시스템 요약

### 1-1. 회사 구조: 왕국마다 왕실 + 민간
- 왕국은 3개이고, 왕국마다 회사가 2개 있다 (`Kingdom.governmentId` = 왕실, `Kingdom.privateIds` = 민간).

| 왕국 | 왕실 (`Company.state = true`) | 민간 (`state = false`) |
|---|---|---|
| 에스테라 | 에스테라 왕실 `#e11d48` (플레이어) | 에스테라 민간 `#f59e0b` |
| 벨로니아 | 벨로니아 왕실 `#3b82f6` | 벨로니아 민간 `#60a5fa` |
| 카르텐 | 카르텐 왕실 `#10b981` | 카르텐 민간 `#34d399` |

- **민간**은 그 왕국 팝들의 투자 장부다. 화면에는 "XX 민간" 회사 이름을 보이지 않고 "민간"(또는 저택·금융가)으로 쓴다 (2-35).
  - 팝은 생활비 10일분이 넘는 현금을 조금씩 왕국 투자 풀(`Kingdom.investmentPool`)에 넣는다.
  - 풀은 매주 민간 회사의 자금이 된다 (아직 쓰지 않은 몫은 `Company.regionFunds`).
- 민간은 **연구를 하지 않는다.** 그 왕국 왕실이 아는 기술을 함께 쓴다.
- 민간은 **건축사무소가 없다.** 왕실의 건축사무소가 민간 공사도 맡고, 민간은 공사비를 왕실에 낸다.
- **행정청**(`admin`)과 학교는 왕실만 지을 수 있다(`BuildingTypeDef.stateOnly`).

### 1-2. 소유주 = 일자리 (Victoria 3 방식)
- 별도의 "소유주" 개념은 없다. 자본가(`capitalist`)·귀족(`aristocrat`)·하급 귀족(`gentry`)도 생산 방식마다 정해진 **일자리**다.
- 받는 돈은 건물 소유에 따라 다르다.
  - **민간 건물**: 자본가와 귀족 자리는 임금 대신 **배당**(건물 이익의 몫)을 받는다. 배당은 지역의 저택·금융가를 거친다 (2-32).
  - **왕실 건물**: 모든 자리가 임금을 받는다. 민간 지분(`privateShare`)이 있으면 그 몫의 이익만 저택·금융가로 간다.
  - 판정 함수: `paysDividend(building.stateOwned, skill)`
- **소작지**(`subsistence`)는 그 왕국 **민간 소유**다. 일자리는 소작농뿐이고(`peasantSlots(b)`), 지대는 저택이 받는다.

### 1-3. 세금: 행정청 역량만큼만 걷힌다
- 세금은 세법(토지 기반 / 1인당)과 세금 수준 단계로 정한다 (2-22·2-23, `taxRates(kingdom)`).
- 실제로 걷히는 비율은 `Kingdom.taxRatio`다 (행정청 한도와 인구로 정하는 곡선, 100%에 닿지 않는다).
- 걷힌 세금은 행정청 건물의 수입(`last.revenue`)으로 잡힌다.

### 1-4. 돈의 공급: 주조와 국채
- 매주 화폐를 새로 찍어 국고에 넣는다(주조).
- 왕실이 빌리는 돈은 새로 발행되고, 갚는 돈과 이자는 소멸한다.
  - 왕실의 대출 한도는 기본 한도 + 왕국 GDP의 25%다(`creditLimit`).
- 장부: `World.mint` = `{ minted, issued, retired, interest }`

### 1-6. 부와 생활수준 분리 (빅토리아3 방식)
- **부**(`wealth`, 1~99)는 구매력 단계다. 소득과 생활비로만 오르내린다.
- **생활수준**(`sol`)은 `부 × 필요 충족률`이고, 최소 1이다. 물건이 시장에 없으면 생활수준만 떨어진다.
  - `Household.sol`, `HistoryPoint.sol`(`colonySol`), `popSol(p)`
- 시작 부는 시작 소득으로 감당할 수 있는 단계로 계산한다.

### 1-7. 속도 조정
- 기술 비용은 4배, 건물 건설 포인트는 5배가 됐다. 20년쯤 지나야 경제가 다 발전한다.
- 연구와 공사 진행 바는 지금보다 훨씬 느리게 찬다.

---

## 2. 화면별 수정 사항

### 2-26. 광맥은 자원별, 탐광으로 늘어난다 (산림·광맥 늘림)
- 산림: 지역 1~7 = 30/30/60/100/200/30/50칸. 광맥 잠재량(못 찾은 것 포함, `REGIONS[i].veins`): 철 0/0/60/0/0/200/150, 석탄 0/0/30/0/60/150/100.
- 찾은 광맥 = `region.deposits.iron`·`region.deposits.coal` (레벨 수). 시작은 잠재량의 30%이고, 계절(90일)마다 지역·자원마다 일정 확률로 잠재량의 10%씩 늘어난다 (탐광).
- 남은 칸: `depositFree(world, regionId, 'iron' | 'coal')`. 철광산·석탄광산은 자기 자원 광맥으로만 막힌다. `region.land.ore`는 두 자원 `deposits`의 합이라 지금 화면의 광맥 칸은 그대로 맞는다 (광맥 `landFree(…, 'ore')`는 두 광산을 합친 값).
- 넣을 곳: 지역 패널의 땅 표에서 광맥 한 줄을 철·석탄 두 줄로 (이름 `DEPOSIT_NAMES`/`DEPOSIT_NAMES_EN`, 쓴 칸/찾은 칸). 잠재량(`veins`)은 보이지 않는다 (탐광의 의미가 없어진다).
- 알림: 광맥을 찾으면 그 지역 왕국 왕실에 `info` 알림 (`regionId` 있음): `"북부 광산지대 철광맥 +20"` / `"Northern Mining District iron veins +20"` (석탄은 `탄맥` / `coal seams`, `VEIN_NAMES`·`VEIN_NAMES_EN`).
- 저장 형식 그대로. 옛 저장은 찾은 광맥이 적은 채로 이어서 탐광한다.

### 2-27. 100배 값 필드로 옮기기 (남은 것, 2026-10-21 확인)
- 저장 v6의 100배 값 필드(`Pop.wealth100`·`literacy100`, `Region.education100`, `Building.crew100`·`exp100`)는 sim 쪽 이야기이고, 불러오기(`sim.worker.ts` 71 `migrateWorld`)와 지역 개요(`RegionExplorer.tsx` 19·20 `literacyOf`·`educationOf`)는 이미 반영됐다.
- 남은 것: 옛 이름 사본(`p.wealth`·`p.literacy`·`r.education`·`b.crew`)을 읽는 세 파일을 읽는 함수로 바꾼다. 사본은 sim이 하루 끝에 다시 쓰는 소수 둘째 자리 값이라 지금도 맞게 보인다.
  - `CompanyPanel.tsx` 46 `b.crew ?? b.last.staffing` → `crewOf(b)` (작업 인원이 없으면 충원율을 돌려준다)
  - `PopTable.tsx` 28 부·문해력 칸 `p.wealth` → `wealthOf(p)`, `p.literacy` → `literacyOf(p)`. 23·24행 정렬도 `a.p[sort]`로 `wealth`·`literacy`를 읽으므로, 두 값을 행 객체(`incomeEma`처럼)에 계산해 넣고 거기서 정렬한다.
  - `RegionPanel.tsx` 119 교육 접근도 숫자와 막대 두 곳 `r.education` → `educationOf(r)`
- 다 바꾸면 3장에 "사본 지워도 됨"을 적는다. 그때 sim이 사본을 없앤다.
- 표시 규칙(그대로): 모든 저장값은 소수 둘째 자리, 0~1 비율은 소수 셋째 자리 이상을 보이지 않는다. 문해력·교육 접근도는 주 1회 바뀌어 그래프가 계단으로 보일 수 있다.

### 2-28. 금고와 대출을 한 칸으로 (사용자 요청 2026-10-21)
- 회사는 현금(`cash`)과 빚(`debt`)을 따로 들고 있지만, 화면에서는 한 숫자로 보인다: **금고 = `cash - debt`**. 빚이 현금보다 크면 음수(`neg` 색)다.
- 옆에 한도를 붙인다: `금고 −1.2만 / 30만`처럼 `NumericValue(cash - debt) / NumericValue(creditLimit(world, c))`. 막대를 쓰면 `debt / limit`(지금 대출 막대)를 그대로 쓴다.
- 고칠 곳 (2026-10-21 main 기준)
  - `App.tsx` 144 현금 칩과 145 대출 칩을 하나로 (누르면 재정 창, `debtRatio` 색은 그대로)
  - `FinancePanel.tsx` 19 treasury 블록: `T.cash`·`T.loanLimit` 두 stat → 한 stat
  - `CompanyPanel.tsx` 140~146(`CompanyView`)과 600(`CompanySummary`)은 2-35에서 없어지고, 그 자리의 왕실 금고 상자가 이 모양을 쓴다.
- 문자열: `T.treasury`(금고/Treasury)를 라벨로 쓴다. `T.cash`·`T.loan`·`T.loanLimit`는 안 쓰게 되면 지운다.
- sim 변경 없음. 대출을 받으면 현금과 빚이 같이 늘어 금고 값은 그대로다 (이자·상환만 금고를 바꾼다).

### 2-30. 재정 탭: 단계별 예산 미리보기 (사용자 요청 2026-10-21)
사용자 말: 재정 화면이 보기 어렵다. 지난주·이번주 말고, 단계를 바꾸면 보여 주는 값(예산이 얼마 들지)이 바로 바뀌어야 한다. 숫자가 너무 막 바뀐다.
- **없앨 것** (`FinancePanel.tsx`): 지난주 `lastLedger[key]`·이번주 `ledger[key]` 열, 바닥줄의 `lastWeekProfit`/`weekProfit`, `lastBudget.revenue`/`revenueWeek`. 이번주 값은 날마다 쌓였다가 주가 바뀌면 0이 되고, 지난주 값은 단계를 바꾸고 한 주가 지나야 바뀐다.
- **새 표**: `budgetPreview(world, me.kingdomId)` (index에서 export, 세계를 바꾸지 않는 순수 함수). 화면은 100ms마다 world를 받으므로 매번 불러도 된다 (건물 한 번 훑기).
  ```ts
  budgetPreview(w: World, kingdomId: number, steps?: Partial<Record<BudgetItem, number>>): BudgetPreview
  BudgetPreview = { steps, lines: BudgetLine[], income, expense, net, netByLevel: Record<BudgetItem, number[]>, firmWages: { weekly, byLevel } }
  BudgetLine = { key: 'tax'|'tariffs'|'mint'|'fees'|'wages'|'goods'|'research'|'interest', weekly, knob?: BudgetItem, byLevel?: number[5] }
  ```
  - 모든 금액은 **주간 예상액**이고 이미 둥글다 (1,000 이상은 100 단위, 아래는 10 단위). 수입은 +, 지출은 −. `net = income + expense`.
  - 줄 순서: 세금(`tax`, 손잡이 tax) · 관세 · 주조 · 민간 공사 수수료(`fees`, knob wages) | 정부 건물 임금(`wages`, 손잡이 wages) · 정부 건물 원료(`goods`) · 연구비(`research`, 손잡이 research) · 국채 이자.
  - 단계 버튼 1~5는 `key === knob`인 세 줄(tax·wages·research)에만 둔다. `fees`도 `knob: 'wages'`와 `byLevel`을 가진다: 민간 공사비에 건축사무소 임금이 들어가서 국영 임금을 올리면 수수료 수입도 는다. 버튼 없이 값만 단계에 따라 바뀐다 (`netByLevel.wages`에 이미 들어 있다).
  - 표: `항목 | 주간 예상 | 단계 1~5`. 단계 버튼 아래(또는 툴팁)에 `byLevel[i]`를 작게 보인다. 바닥줄은 `net` (음수면 `neg` 색). 단계 버튼 툴팁에 `netByLevel[item][i]`(그 단계일 때 순수지)를 보여도 된다.
  - `firmWages`: 왕실 생산 건물(정부 건물 아닌 것)의 주간 임금. 국영 임금 손잡이가 이것도 올리지만 그 건물 매출로 내므로 `net`에는 없다. 임금 줄 아래 흐린 줄로 보이거나 빼도 된다.
- **즉시 반영**: 단계 버튼은 지금처럼 `setBudget` 명령을 보낸다. 워커가 틱 사이에 바로 적용하므로 다음 publish(100ms 안)에 `budgetPreview`가 새 단계 값으로 바뀐다. 명령을 보내기 전에 보여 주려면(마우스를 올렸을 때) `budgetPreview(world, kid, { tax: 4 })`처럼 가상 단계를 넘기거나 `byLevel`을 쓴다.
- **안정성**: 세금은 단계마다 따로 잰 하루 세입의 이동평균, 주조는 지난 주조액, 관세·수수료·원료는 주간 이동평균, 임금은 지금 고용 × 기본 임금 × 임금 지수(주 1회 바뀜), 연구비는 경제 규모 이동평균이다. 잰 값 (시드 42 100~250일, 시드 2 1800~1920일): 순수지(총 흐름 대비) 하루 변화 중앙값 0.03~0.08%, 90%가 0.7% 아래, 가장 큰 변화는 주 경계에서 7~12%. 줄별로는 주조·수수료·원료가 주 경계에서만 바뀌고(최대 7~22%), 연구비는 기술이 끝나거나 새로 시작할 때 크게 바뀐다.
- 정확도 (주초 미리보기 vs 그 주 실제, 시드 1·2, 10~53주, 주마다 평균 절대 오차): 임금 0~1%, 주조 1~4%, 세금 3~5%, 연구비 1.5~2%, 원료 4~10%, 수수료 4~19%(민간 착공이 들쭉날쭉한 AI 왕국이 큼). 세금 단계를 1·5로 바꾼 다음 주 실제 세입과 `byLevel` 차이 −5%·−1%, 국영 임금 3→5의 순수지 변화 예상 −143,400 vs 실제 −141,900. 처음 2~9주는 경제가 빨리 자라 수입을 10~15% 낮게 본다 (이 동안은 이동평균을 세 배 빨리 따라가게 했다).
- 기준값이 아직 없을 때(새 게임 첫 주, 옛 저장): 지난주 장부, 그것도 없으면 이번 주 지금까지를 7일로 늘린 값을 쓴다.
- 실제 지난주 수지(`kingdom.lastBudget`)를 보이고 싶으면 접힌 칸 하나에만 둔다. 금고 블록(2-28)은 그대로.
- 새 저장 필드 (화면은 읽지 않아도 된다): `Kingdom.budgetBase { taxBy[5], mint, tariffs, feesWage, feesOther, goods }`, `Kingdom.tariffWeek`, `Kingdom.feeWageWeek`. sim은 이것을 읽지 않는다.
- **함께 지울 문자열** (2-23 정리분, 지금 어디서도 안 쓴다): `strings.ts` 74·368의 `budgetShare`·`retainedBudget`·`educationPending`, 79·373의 `ledgerLabels.welfare`, 106·399의 `distressWeeks`. 표를 바꾼 뒤 `previousWeek`·`currentWeek`·`budgetRevenue`도 안 쓰면 지운다.

### 2-31. 건물 유보 자산
- 파는 건물(정부 건물·학교·건축사무소 제외)은 이익의 35%를 유보 자산에 쌓는다. 상한 = 레벨 × 레벨당 주간 산출 가치(기본가) × 0.5주 (`TUNE.reserveWeeks`, 2026-10-21 변경: 레벨당 고정 50,000을 없앴다). 방식을 바꾸면 상한이 바뀐다 (줄면 다음 주 정산 전까지 잠깐 상한을 넘을 수 있으니 막대는 100%에서 자른다). 다 차면 이익을 모두 배당한다. 적자는 유보 자산에서 먼저 빠지고, 바닥나면 가동률을 줄이고 철거한다.
- 필드: `Building.reserve?: number` (없으면 0, 소수 둘째 자리). index에서 `reserveCap(b)`(상한), `hasReserve(b)`(쌓는 건물인가), `weeklyOutputValue(typeId, methodId)`(방식 1레벨의 주간 산출 가치, 기본가)를 export한다.
- 건물 패널 (`ResourceInspector.tsx` `BuildingInspector`, 32행 지표 줄 근처): `hasReserve(b)`이면 "유보 자산" 라벨과 `reserve / reserveCap(b)` 막대, 숫자 두 개.
- 합계는 2-35 왕국 경제 창의 민간 자금 상자와 건물 표에 둔다 (회사 현금 안의 몫이다. 현금에 더하지 않는다).
- 저장 형식은 그대로(v6). 옛 저장은 `reserve`가 없어 0으로 시작한다.

### 2-32. 저택·금융가가 무엇을 가졌는지 (소유 관계 보기, 사용자 요청 2026-10-21)
**문제:** 저택과 금융가가 어느 건물을 가지고 어디서 돈을 받는지 한눈에 들어오지 않는다.

**sim 규칙 (지금 코드 기준, 바뀌면 이 절을 고친다)**
- 지역마다 저택(`typeId 'manor'`) 하나, 금융가(`'finance'`) 하나가 자동으로 있다. 둘 다 그 왕국 민간 소유다.
- 같은 지역의 건물 중
  - 농지·산림·광산 땅을 쓰는 **민간** 건물 → 저택 소유 (`kind 'full'`, 배당 전부)
  - 공장 부지(`land 'plot'`)를 쓰거나 땅을 쓰지 않는 **민간** 건물 → 금융가 소유 (`'full'`)
  - **국영** 건물 중 민간 지분(`privateShare` > 0)이 있는 것 → 같은 땅 규칙으로 저택/금융가가 그 지분만큼 가진다 (`'share'`, `share` = 0..1)
  - 지분이 없는 국영 건물 → 소유 건물 없음 (목록에 없다)
  - 소작지(`subsistence`) → 저택이 지대를 받는다 (`'rent'`)
- 저택·금융가의 돈(배당·지분 배당·지대)은 그 안에 앉은 귀족·자본가(직원 목록)에게 가고, 일부(귀족 20%, 자본가 30%)는 왕국 투자 풀로 간다. 아무도 없으면 전부 투자 풀로 간다.
- 하루 받은 돈의 이동평균은 소유 건물의 `profitEma`(하루 값)다.

**API**
- `holdingsOf(world, ownerBuilding): Holding[]` (index에서 export, 순수 함수)
  - `Holding = { building: Building; kind: 'full' | 'share' | 'rent'; share: number }`
- 거꾸로 (이 건물의 주인): `ownerBuildingOf(world, b, true)` → 저택/금융가 건물 또는 `undefined`. 국영이면 `b.privateShare`가 그 지분이다.

**보여줄 곳**
1. **소유 건물 창** (저택·금융가를 열었을 때, `ResourceInspector.tsx`의 `BuildingInspector`):
   - 맨 위 한 줄: `받는 돈/주 = profitEma × 7`, `자리: 앉은 인원 / 자리 수` (하급 귀족 자리가 생기면 직종별 두 줄, 2-29).
   - 그 아래 표 `holdingsOf` 한 행에 하나: 아이콘 · 건물 이름 · 레벨 · 종류 칩(`배당` / `지분 NN%` / `지대`) · 그 건물의 주간 이익(`profitEma × 7`, 지분이면 × share). 행을 누르면 그 건물로 간다.
   - 정렬: 주간 이익 큰 순. 표 맨 아래 합계.
2. **지역 패널** (`RegionPanel.tsx`): 건물 목록을 `저택` / `금융가` / `국영` 세 묶음으로 나눈다. 묶음 머리에 소유 건물 이름과 주간 수입, 그 아래 `holdingsOf` 건물들. 지분 없는 국영 건물은 `국영` 묶음. 소작지는 `저택` 묶음 맨 아래 한 줄(합친 레벨).
3. **일반 건물 상세**: 소유 배지(2-1 `OwnerBadge`) 옆에 `→ 저택` 또는 `→ 금융가` 링크 칩 (`ownerBuildingOf(world, b, true)`). 국영이면서 지분이 있으면 `국영 · 저택 NN%`.
4. 색: 저택과 금융가에 고정 색 두 개를 정해 칩·묶음 머리·지도 원에 같이 쓴다 (다크 모드에서도 구분).
- 설명 문구 금지: 라벨·숫자·칩만.
- 들어올 변경: 건물 유보 자산(2-31)이 들어오면 배당은 "이익 − 유보 적립"이 된다. 그때 표의 주간 이익 열 옆에 실제 배당을 따로 줄 수 있게 sim에서 필드를 더하고 이 절을 고친다.

### 2-33. 부·생활수준 지도는 끊기지 않는 그라데이션 (사용자 요청 2026-10-21)
**문제:** `RegionMap.tsx` 46~52행 `WEALTH_STEPS`가 4단계라 지역 색이 뚝뚝 끊긴다 (5.9와 6.0이 전혀 다른 색, 4.1과 5.9는 같은 색).
- `wealthColor(v)`를 연속 보간으로 바꾼다. 지금 네 색을 정점으로 그대로 쓴다: 값 2 `#b8573b` → 5 `#d9a35b` → 7.5 `#a9b38a` → 11 `#5f8592` (지금 구간의 가운데 값). 범위 밖은 양 끝 색으로 고정한다.
- 보간은 RGB 직선 대신 OKLab(또는 `color-mix(in oklab, …)`)으로 해서 가운데가 탁해지지 않게 한다. 함수 하나로 만들어 막대·칩에서도 같이 쓴다.
- 정점 값은 고정이다. 지금 화면에 보이는 지역의 최소·최대로 범위를 잡지 않는다 (틱마다 색이 바뀌어 비교가 안 된다).
- 생활수준(`sol`) 레이어는 지금 부와 같은 단계를 쓰고 있다. 생활수준 값의 범위가 부와 다르면 정점 값만 따로 둔다 (`SOL_STOPS`, 색은 같게). 두 레이어의 실제 분포를 한 번 찍어 보고 대부분 지역이 가운데 두 정점 사이에 오게 정한다.
- 범례(160~162행): 칸 네 개 대신 `linear-gradient` 막대 하나, 아래 눈금은 정점 값 네 개(양 끝은 `≤2`, `≥11`처럼).
- 지역 목록 표의 부·생활수준 칸에도 같은 색을 작은 점이나 배경 띠로 쓰면 지도와 맞춰 읽기 쉽다 (선택).
- sim 변경 없음.

### 2-34. 아래 창 버튼은 켜기/끄기 토글 (사용자 요청 2026-10-21)
**문제:** `WindowWorkspace.tsx` 67~70행 `desktop-dock`이 작업표시줄처럼 동작한다. 열린 창을 누르면 최소화, 다른 창 뒤에 있으면 앞으로, 최소화된 창은 점(`is-open`)으로 남는다. 상태가 셋(닫힘/최소화/보임)이라 헷갈린다.

**바꿀 동작 (상태는 둘: 열림/닫힘)**
- 닫힌 창의 버튼을 누르면 창이 열리고 맨 앞에 온다 (`focus`).
- 열린 창의 버튼을 누르면 창이 닫힌다 (`close`). 다른 창 뒤에 가려져 있어도 닫는다.
- 창 제목 줄의 닫기(X)와 Esc도 같은 `close`. 버튼 상태도 같이 바뀐다.
- 열린 창을 앞으로 가져오려면 창을 누른다. 버튼으로 앞으로 가져오지 않는다.
- 버튼 표시: 열린 창은 `aria-pressed=true`와 눌린 모양(배경색) 하나만 쓴다. `is-open` 점과 "맨 앞" 표시는 따로 두지 않는다.
- 왕국 지도 버튼은 아래 줄에서 없앤다. 지금은 누르면 열린 창이 한꺼번에 숨었다 나타나는데(68행), 사용자가 이상하다고 했다. 지도는 늘 바닥에 깔려 있으므로 버튼이 필요 없고, 다른 창에 손대는 버튼도 두지 않는다. 창은 각자 자기 버튼·X·Esc로만 닫힌다.
- 최소화 상태 `minimized`와 제목 줄의 최소화 버튼은 없앤다. 창 크기·위치(`rects`)와 최대화는 닫았다 다시 열어도 기억한다.
- 다른 화면에서 창을 여는 경로(`showWindow`: 대출 칩, 지역 선택, 건물 링크 등)는 지금처럼 열기만 한다. 이미 열려 있으면 앞으로 가져오고 닫지 않는다.
- `dock-hint` 문구와 `T.windowTaskHelp`·`T.windowDesktopHelp` 툴팁은 새 동작에 맞게 줄이거나 없앤다 (설명 문구 금지 규칙).
- sim 변경 없음.

### 2-35. 상회 상세 → 왕국 경제 창 (왕실·민간 통계를 따로 내지 않기, 사용자 요청 2026-10-21)
**사용자 말:** "상회 상세 같은 데 보면 민간이랑 왕실을 통계를 따로 내는데 이것도 좀 이상한 거 같음." / "왕실 요약에도 플레이어의 정부+민간을 함께 통계로 잡을 것."

**왜:** 민간 회사는 독립한 상회가 아니라 그 왕국 팝들의 투자 장부다 (1-1). 그래서 왕국의 경제는 왕실 + 민간을 합친 한 숫자로 보이고, 누가 가졌는지는 그 숫자 안의 구성(막대)으로 보인다. 돈 상자(왕실 국고와 민간 투자 자금)만 따로 둔다. 국고는 플레이어가 쓰는 돈이고, 민간 자금은 플레이어가 쓸 수 없는 돈이기 때문이다.

**지금 구조 (main `da005db`)**
- 통계 창(`App.tsx` 204 `BottomPanel`)의 섹션
  - `summary` "왕실 요약" (`BottomPanel.tsx` 39): `CompanySummary` (`CompanyPanel.tsx` 598~601) = 왕실 회사 하나의 현금·대출·지난주 손익 + `Summary`(233~285: 인력, 원료 부족, 손익 폭포). **왕실 건물만** 센다.
  - `company` "상회 상세" (41): `CompanyView` (126~163) = 회사 하나(왕실 또는 "XX 민간")의 현금·대출·손익·임금·연구 + 그 회사 건물 목록(`House`). 위의 `ViewSelect`(83~92)로 회사 6개 중 하나를 고른다.
  - `kingdoms` "왕국 재정" (42): 왕국별 투자 풀·연 GDP 표
  - `rankings` "상회 순위" (55~71): 회사 6개(왕실 3 + 민간 3)의 순자산·레벨·지난주 손익
- `App.tsx` 69 `viewId`(회사 id), 110 `viewCompany(id)`가 통계 창을 열고 그 회사를 상세에 띄운다. 부르는 곳: 알림 회사 링크(`Notifications.tsx` 77, `App.tsx` 165), 건물 상세의 소유 배지 링크(`ResourceInspector.tsx` 30), 지역 패널(`App.tsx` 200 `onViewCompany`), 소식 이동(`eventDestination.ts` 8 `kind:'company'`).
- `OwnerBadge.tsx` 9~11이 회사 이름("에스테라 민간")을 그린다.
- `CompanyPanel` 컴포넌트(`CompanyPanel.tsx` 96~123)는 어디서도 쓰지 않는 옛 "상회 관리" 창 코드다 (2-0 잔여).

**바꿀 구조**
1. 통계 창 섹션을 이렇게 바꾼다.

| 지금 | 바꾼 뒤 |
|---|---|
| `summary` 왕실 요약 (왕실 회사만) | `summary` 왕국 요약: 플레이어 왕국의 정부 + 민간 합계 (2-35-1) |
| `company` 상회 상세 + 회사 고르기 | `kingdom` 왕국 경제: 왕국 고르기 + 합계 + 돈 상자 + 건물 표 + 추이 (2-35-2~5) |
| `kingdoms` 왕국 재정 + `rankings` 상회 순위 | `kingdoms` 왕국 비교: 왕국 3줄 한 표 (2-35-6) |

2. 회사 단위 화면(`CompanyView`, `ViewSelect`, `CompanySummary`, 죽은 `CompanyPanel`)은 지운다. `House`·`BuildingRow`·`Summary`·`rowOf`는 왕국 건물에 다시 쓴다.
3. "XX 민간" 회사 이름은 화면 어디에도 보이지 않는다. 라벨은 "민간"(왕국 색 띠·문장과 함께), 건물 단위로는 저택/금융가 (2-32 색).

#### 2-35-0. 소유 구성 계산 (모든 화면이 같은 규칙)
- 왕국 `k`의 건물 = `world.buildings` 중 `regionById(world, b.regionId).kingdomId === k.id` (지표 `recordMetrics`와 같은 기준).
- 소유 건물 자신(`typeId` `'manor'`·`'finance'`)은 레벨·이익·산출 합계에서 뺀다 (받는 돈이 다른 건물 이익의 이중 계산이다). 그 건물의 자리(귀족·자본가 고용)만 고용 합계에 저택·금융가 몫으로 넣는다.
- 건물 하나의 소유 몫 (합이 1):

| 몫 | 키 | 값 |
|---|---|---|
| 왕실 | `royal` | `b.stateOwned`이면 `1 − (b.privateShare ?? 0)`, 아니면 0 |
| 민간 지분 | `stake` | `b.stateOwned`이면 `b.privateShare ?? 0`, 아니면 0 |
| 저택 | `manor` | 민간 건물이고 `ownerBuildingOf(world, b, true)?.typeId === 'manor'` (소작지 포함, 농지·산림·광산) |
| 금융가 | `finance` | 그 밖의 민간 건물 (공장 부지·땅 없는 건물) |

  - 민간 지분은 툴팁에서 저택/금융가로 한 번 더 나눈다 (`ownerBuildingOf(world, b, true)`).
- 값마다 건물 값 × 몫을 더한다.
  - 건물 레벨: `b.level`
  - 고용: `Σ b.employed[s]` (소작지는 `b.tenants`), 일자리: `Σ slots(b, s)` (소작지는 `peasantSlots(b)`)
  - 주간 이익: `b.profitEma × 7`. **정부 건물(`isGovernment(b.typeId)`)은 뺀다** (그 돈은 국고 수지이고 2-30 재정 탭에 있다). 음수 몫은 막대에서 0으로 그리고 툴팁에 `neg` 색 숫자로 둔다.
  - 유보 자산: `b.reserve ?? 0` (2-31)
- 몫으로 나누지 않는 값 (숫자 하나만): 인구 `Σ regionPopulation(r)` (왕국 지역), 주간 GDP `kingdomGdp(world, k.id) / 360 × 7` (팝 소득 합이라 소유로 나눌 수 없다).
- 이 계산은 함수 하나(예: `client/src/kingdomEconomy.ts`의 `ownershipOf(world, kingdomId)`)로 만들어 요약·왕국 경제·비교 표·지도가 같이 쓴다. sim이 같은 함수를 export하면 그것으로 바꾼다 (3장 요청).
- 색: 왕실 `--royal-owner`(있음), 민간 지분 = 왕실 색에 빗금 또는 두 색 사이, 저택·금융가 = 2-32에서 정하는 고정 색 두 개. 지금 `--private-owner`(`workspace.css` 160~161)는 "민간 합계"가 필요한 곳(지도 막대)에만 남긴다.

#### 2-35-1. 왕국 요약 (통계 `summary`, 지금 "왕실 요약")
- `BottomPanel.tsx` 39의 `CompanySummary world company={me}` → `KingdomSummary world kingdomId={me.kingdomId}`.
- 맨 위: 2-35-2의 합계 타일 한 줄 (플레이어 왕국, 소유 구성 막대 포함). 왕국 경제 창의 맨 위와 같은 컴포넌트를 쓴다.
- 그 아래 `Summary`(`CompanyPanel.tsx` 233~285)의 세 타일(인력, 원료 부족, 손익 폭포)을 **왕국 건물 전체**(2-35-0 기준, 소유 건물 제외)의 `rowOf`로 계산한다. 지금은 `b.companyId === company.id`(600행)라 왕실 건물만 든다.
  - 손익 폭포는 합계 하나. 그 아래에 이익 몫 막대(왕실 / 지분 / 저택 / 금융가) 한 줄.
- 금고 상자는 **왕실 것만** 둔다: `왕실 금고  (cash − debt) / creditLimit` (2-28 모양) + 지난주 손익(`lastWeekProfit`). 누르면 재정 창(`showWindow('finance')`). 민간 현금은 여기에 더하지 않는다 (2-35-3에만).
- 섹션 제목: `T.mySummary` "왕실 요약" / "Royal summary" → "왕국 요약" / "Kingdom summary" (`strings.ts` 78·372 값만 바꾼다).

#### 2-35-2. 왕국 경제 창: 머리와 합계 타일
- 섹션 id `kingdom` (지금 `company`), 제목 "왕국 경제" / "Kingdom economy". `revealId`(`BottomPanel.tsx` 38)도 `kingdom`으로.
- 머리: 왕국 고르기 = 왕국 3개 버튼(segmented, `RegionMap.tsx` 145와 같은 문장 ●◆▲ + 왕국 색 + 이름, 플레이어 왕국에 ★). 기본은 플레이어 왕국. 다른 왕국도 같은 화면이다 (조작 버튼이 없을 뿐, "읽기 전용" 꼬리표 없음).
- 합계 타일 한 줄 (값 하나 + 아래 4색 막대 하나, 막대 툴팁에 몫별 숫자와 %):

| 타일 | 값 | 막대 |
|---|---|---|
| 인구 | `Σ regionPopulation` | 없음 |
| 주간 GDP | `kingdomGdp / 360 × 7` | 없음 |
| 건물 레벨 | 레벨 합 | 소유 몫 |
| 고용 | 고용 / 일자리 | 소유 몫 |
| 주간 이익 | 이익 합 (정부 건물 제외) | 소유 몫 |

#### 2-35-3. 돈 상자 두 개 (같은 창, 따로)
- **왕실 국고**: `gov = companyById(world, k.governmentId)`. `(gov.cash − gov.debt) / creditLimit(world, gov)` (2-28), 지난주 손익. 플레이어 왕국이면 누르면 재정 창.
- **민간 자금**: `k.privateIds`의 회사 합. `Σ (c.cash − c.debt)`, 그 안의 유보 자산 `Σ reserve` (민간 건물), 투자 대기 `Σ Object.values(c.regionFunds ?? {})`, 투자 풀 `k.investmentPool`. 라벨은 "민간" 계열만 쓰고 회사 이름은 쓰지 않는다. 조작 없음.

#### 2-35-4. 건물 표 (왕국 건물 하나의 표)
- 행 = 2-35-0의 왕국 건물 (소유 건물 `manor`·`finance` 제외, 소작지 포함).
- 열: 건물(그림·이름·×레벨, 철거 대기 표시) · 지역 · 소유 칩 · 고용/일자리 막대 · 주간 이익 · 유보 막대(`hasReserve(b)`일 때 `reserve / reserveCap(b)`, 아니면 "—").
- 소유 칩: `왕실` / `왕실 · 저택 NN%`·`왕실 · 금융가 NN%` (지분이 있을 때, NN = `privateShare`) / `저택` / `금융가` / 소작지는 `저택 · 지대`. 칩 색은 2-35-0.
- 위에 소유 걸러 보기 칩(전체 / 왕실 / 민간 지분 / 저택 / 금융가, 개수)과 `ListTools`(정렬·검색). 정렬: 이익(기본, 큰 순) · 레벨 · 이름 · 지역 · 고용률 · 유보율. 순서는 `House`처럼 주마다만 다시 매긴다.
- 행을 누르면 `onBuilding(b.id)` (`App.tsx` 113 `openBuilding`: 지역 건물 창에서 그 건물을 연다. 조작은 거기서). 이 표에는 조작 버튼을 두지 않는다.
- 지금 `House`(170~227)를 고쳐 쓰면 된다: `owner` 대신 `kingdomId`, `mine` 대신 왕국 건물, `Projects`는 건설 창에 있으니 빼고, `BuildingRow` 펼친 상세의 `Controls`는 플레이어 건물에만 (지금 `game &&` 조건 그대로).

#### 2-35-5. 추이 차트
- 쓸 수 있는 기록
  - `world.metrics` (`MetricPoint`, 30일마다, 최대 360개): `kingdoms[k].gdp`(연), `treasury`, `debt`, `privateCash`, `pool`, `levelsState`, `levelsPrivate`(둘 다 소작지·소유 건물 제외)
  - `game.history` (`HistoryPoint`, 매일, 최대 1500개): `companyCash[id]`, `companyDebt[id]` (회사별)
- 그릴 것 (선택한 왕국)
  1. 건물 레벨 쌓은 면적: 지금은 `levelsState`(왕실) / `levelsPrivate`(민간) 두 층. sim이 4몫 기록을 주면(3장) 왕실 / 지분 / 저택 / 금융가 네 층으로.
  2. 돈 두 선: 왕실 국고 `treasury − debt`, 민간 자금 `privateCash + pool`.
  3. 연 GDP 선 `gdp`.
- `TimeChart`(`views/Chart.tsx`)는 선 그래프만 그린다. `stacked` 옵션(recharts `AreaChart` + `stackId`)을 하나 더한다.
- 회사별 두 선(왕실·민간 회사 현금)을 나란히 그리는 차트는 만들지 않는다.

#### 2-35-6. 왕국 비교 표 (`kingdoms`, 지금 "왕국 재정" + "상회 순위")
- `BottomPanel.tsx` 42의 표와 55~71의 회사 순위를 한 표로: 행 = 왕국 3개.
- 열: 왕국(문장·색, 플레이어 ★) · 왕실 금고 · 민간 자금 · 건물 레벨(4색 작은 막대) · 주간 이익 · 연 GDP · 투자 풀. 모든 열 정렬 (`SortHeader`).
- 행을 누르면 왕국 경제 섹션이 그 왕국으로 바뀌고 열린다.
- 33~35행의 회사 `rows`, 26~27행 `viewed`는 지운다.

#### 2-35-7. 연결 바꾸기 (App·링크)
- `App.tsx` 69 `viewId`(회사 id) → `viewKingdomId: number | null`. 110 `viewCompany(id)` → `viewKingdom(kingdomId)` (통계 창을 열고 `kingdom` 섹션을 보인다). 112·175의 `setViewId(null)`도 같이.
- 회사 id를 넘기던 곳은 `companyById(world, id)?.kingdomId`로 바꿔 `viewKingdom`을 부른다: 알림(`Notifications.tsx` 77, `App.tsx` 165), 건물 상세 소유 링크(`ResourceInspector.tsx` 30), 지역 패널(`App.tsx` 200), 소식 이동(`App.tsx` 119, `eventDestination.ts` 8 `kind:'company'`는 이름만 `kingdom`으로 바꿔도 된다).
- `BottomPanel` props: `viewedId`·`onViewCompany` → `kingdomId`·`onViewKingdom`.
- `OwnerBadge.tsx`: 민간 회사면 `companyName` 대신 "민간"(`T.privateOwner`)과 왕국 색 띠·문장. 툴팁은 "벨로니아 · 민간". 왕실은 "왕실"(`T.stateOwner`) + 왕국 색, 플레이어 ★ 그대로. 건물 맥락(지역 칩, 건물 상세)에서는 2-32가 들어오면 민간 대신 저택/금융가 칩.
- 지역 건물 목록(`RegionPanel.tsx` 57~60)·자원 건물 목록(`ResourceInspector.tsx` 51~53)의 "소유 회사" 정렬·검색은 회사 이름 대신 소유 몫 이름(왕실/저택/금융가)으로. `RegionPanel.tsx` 188 칩 `title`의 회사 이름도.
- 지도 지역 막대(`RegionMap.tsx` 138~147)와 지역 소유 고리(`RegionCircles.tsx` 18~34)는 지금 왕실/민간 두 색이다. 2-35-0 함수를 지역 하나에 쓰면 네 몫이 된다 (선택, 작은 막대라 두 색으로 두어도 된다).

#### 2-35-8. 지울 것과 문자열
- 지운다: `CompanyPanel.tsx`의 `ViewSelect`(83~92), `CompanyPanel`(96~123, 안 쓰임), `CompanyView`(126~163), `CompanySummary`(598~601). `BottomPanel.tsx` 4의 import와 41·55~71 섹션. `CompanyPanel.tsx` 22 `spct`는 `Wages`가 계속 쓴다.
- 안 쓰게 되는 문자열 (지운다): `companyDetails`, `viewOther`, `myHouseNamed`, `readOnly`, `rankings`, `colHouse`, `colNet`, `sharedResearch`, `kingdomAccounts`(비교 표 이름으로 바꾸면). 지우기 전에 grep으로 다른 쓰임을 확인한다.
- 더할 문자열 (ko / en):

| 키 | ko | en |
|---|---|---|
| `kingdomEconomy` | 왕국 경제 | Kingdom economy |
| `mySummary` (값 변경) | 왕국 요약 | Kingdom summary |
| `kingdomCompare` | 왕국 비교 | Kingdoms |
| `ownRoyal` | 왕실 | Crown |
| `ownStake` | 민간 지분 | Private stake |
| `ownRent` | 지대 | Rent |
| `privateFunds` | 민간 자금 | Private funds |
| `royalTreasury` | 왕실 금고 | Royal treasury |
| `awaitingInvestment` | 투자 대기 | Awaiting investment |
| `weeklyGdp` | 주간 GDP | GDP / week |
| `buildingLevels` | 건물 레벨 | Building levels |
| `employment` | 고용 | Employment |
| `reserve` | 유보 자산 | Reserve |

  - 저택·금융가 이름은 `buildingName('manor')`·`buildingName('finance')`를 쓴다. 인구·주간 이익·투자 풀은 있는 `T.population`·`T.weeklyProfit`·`T.investmentPool`.
- 설명 문구 금지: 라벨·숫자·막대·칩만. 소유 규칙 설명은 README에 둔다 (툴팁은 숫자만).
- sim 변경 없이 만들 수 있다. 4몫 추이와 공용 계산 함수는 3장 요청이 들어오면 바꾼다.

---

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- **2-35 소유 구성 (2026-10-21, 요청됨):**
  - 순수 함수 export: `ownershipOf(world, kingdomId, regionId?)` → `Record<'royal'|'stake'|'manor'|'finance', { levels, employed, jobs, profitWeek, reserve }>` (2-35-0 규칙 그대로, 지역을 주면 그 지역만). 화면·지표가 같은 계산을 쓰게 한다.
  - 지표 기록: `KingdomMetrics`에 같은 4몫의 `levels`·`employed`·`profitWeek` (30일마다). 지금 있는 `levelsState`·`levelsPrivate`는 두 몫뿐이라 2-35-5 네 층 차트를 그릴 수 없다.
- **2-17 정리 (UI 반영 끝, 2026-10-21 확인):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`setResearchBudget`·`MAX_RESEARCH_BUDGET`·`Company.distressWeeks`를 더 쓰지 않는다 (grep 0건). sim은 `compat.ts`의 이 껍데기를 지워도 된다. 100배 값 사본(2-27)은 아직 지우지 않는다.
- 이미 export되는 것: `paysDividend`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`, `peasantSlots`, `disbanded`, `slots`, `harvestCondition`, `harvestLabel`, `HARVEST_KINDS`, `taxRates`, `taxCapacity`, `holdingsOf`, `ownerBuildingOf`, `budgetPreview`, `reserveCap`, `hasReserve`, `weeklyOutputValue`, `creditLimit`, `isGovernment`, `crewOf`, `wealthOf`, `literacyOf`, `educationOf`
