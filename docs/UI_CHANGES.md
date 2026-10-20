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
**깨진 화면 (먼저):**
0-1. **레벨 주인·민영화·저택·금융가 금고 (2-54, DECISIONS 7-16 1단계).** `privateShare`·`ownerBuildingOf`·투자 풀이 없어졌다. 소유 막대는 `levelOwnersOf(world, b)`로, 왕실 건물에 민영화 켜기(`setPrivatize`), `Kingdom.investmentPool` 칸 이름은 "저택·금융가 금고"로. 2-35-0 `stake` 몫은 지운다. sim 작업자가 클라이언트 두 줄을 지웠다 (컴파일 맞춤).
0. **창 크기 조절 없앰 + 좁은 고정 창 + 통계·소식 깨짐 (2-53, 사용자 요청).** 모서리·최대화를 지우고 창은 왼쪽/오른쪽 두 자리, 440×982 고정(1920×1080, 지도 x 530~1390을 안 가림). 분류 줄 88px을 위 탭으로, 인구 표 `min-width:1000/1100px`(`strategy.css` 66, `workspace.css` 243)을 고정 2열+보기 칩 4열로, 요약 세 칸을 세로로, 스크롤 안 스크롤 없앰.

아래는 사용자 요청이거나 정리다.
1. **아래 창 버튼 토글 + 왕국 지도 버튼 없애기 (2-34, 사용자 재요청).** `WindowWorkspace.tsx` 13·59·67~70: 최소화 상태와 dock의 지도 버튼을 없앤다.
2. **금고와 대출을 한 칸으로 (2-28).** 상단 칩 `App.tsx` 144~145, 재정 탭 `FinancePanel.tsx` 19의 `현금`·`대출` 두 칸을 `금고  순자산 / 한도` 한 칸으로. 2-35의 금고 상자도 같은 모양.
3. **재정 탭 (2-30) — sim 쪽에서 기본 반영함 (2026-10-21, `FinancePanel.tsx`).** 지난주·이번주 열과 정부 임금 표를 없애고 `budgetPreview` 한 표(항목 | 주간 예상 | 단계 1~5, 단계 버튼 툴팁에 그 단계의 줄 값과 순수지)로 바꿨다. 남은 일: 화면 다듬기(폭 좁은 창 2-53 기준), 안 쓰게 된 문자열(`previousWeek`, `currentWeek`, `weeklyAccounts`, `lastWeekPL`, `weeklyProfit`, `budgetRevenue`, `ledgerLabels`, `govWages`) 정리, 2-28 금고 한 칸과 맞추기.
4. **지역 창 하나로: 개요·인구·건물 탭 (2-46).** `App.tsx` 200의 `overview`·`industry` 두 창을 `region` 한 창으로, 머리 한 줄 공통, 지표는 개요 탭.
5. **지역 건물: 종류별 한 줄 + 전체/민영/국영, 건설 통합 (2-42).** 2-46의 건물 탭 내용. `RegionPanel.tsx` 182~196 칩 격자를 종류마다 한 행으로, 상세에 `전체`/`민영`/`국영`, 공사는 행·상세 안에, `+ 새 건물` 행.
6. **시세 창: 세계 / 왕국 / 지역 칩 (2-47).** 시세 창이 지도 선택을 따라가지 않고 자기 범위를 기억한다. 모으는 셈은 client.
7. **연구 트리 그래프 (2-48).** `CompanyPanel.tsx` 561~590 단계 열을 선행 관계 그래프로, 올리면 열리는 방식·건물·이익률.
8. **정책 창 (2-45).** 지금 할 수 있는 것: 창을 만들고 `FinancePanel.tsx` 20의 세법 `select`를 옮긴다 (두 법, 전환 없음). 세 세법·6개월 전환·조건·투자법은 sim이 3장을 넣은 뒤.
9. **상회 상세 → 왕국 경제 창, 왕실 요약은 왕국 합계 (2-35).** 왕실·민간 회사로 나눈 통계를 없애고 왕국 하나의 숫자 + 소유 구성 막대로. 통계의 `summary`(`BottomPanel.tsx` 39)도 합계로, 금고 상자만 왕실 것 (2-35-1).
10. **건물 유보 자산 (2-31).** 건물 패널에 `reserve / reserveCap(b)` 막대 (`hasReserve(b)`일 때). 2-35 건물 표에도 같은 막대.
11. **저택·금융가가 무엇을 가졌는지 (2-32).** 소유 건물 창에 `holdingsOf` 표, 일반 건물 상세에 "→ 저택/금융가" 칩 (지역 패널 묶음은 2-42로 대체).
12. **부·생활수준 지도 그라데이션 (2-33).** `RegionMap.tsx` 46~52 `wealthColor`를 OKLab 보간으로, 범례 160~162를 연속 막대로.
13. **저택 대 금융가 자산 비율 (2-44, sim 쪽 필요).** 통계·소식 창에 왕국·지역 비율 막대와 왕국 추이. sim의 `ownershipAssets`가 들어온 뒤.
14. **100배 값 필드로 옮기기 (2-27).** 남은 세 파일: `CompanyPanel.tsx` 46 `b.crew`, `PopTable.tsx` 23·24·28 `p.wealth`·`p.literacy`, `RegionPanel.tsx` 119 `r.education`. 끝나면 알려 달라 (sim이 사본을 지운다).
15. **광맥은 자원별 (2-26).** 지역 땅 표시(`RegionCircles.tsx` 22~29)의 광맥을 철·석탄 두 줄로.
16. **저택에 하급 귀족 자리 (2-29).** 저택 일자리에 하급 귀족이 보이고 둘 다 임금이 아니라 몫이다. 소유 건물 자리의 "배당" 표시는 `paysShare(b, s)`로 가린다.
17. **농부 계층 (2-37).** 새 직종 `farmer`. 색 토큰 `--c-farmer`와 아이콘, 계층·직종 목록에 노동자 옆으로. sim이 임시로 고친 곳: `ui.tsx` 8·11, `spriteAtlas.ts` 13.
18. **임시 아이콘을 전용 아이콘으로 (2-39).** 다른 아이콘을 빌려 쓰는 8개와 농부 색 토큰. 목록과 위치는 2-39.
19. **규칙 사전 (2-40, 급하지 않음).** 단독 앱 `packages/encyclopedia`. 지금은 도움말 버튼에서 `encyclopedia/#<항목 id>`로 잇기만 해도 된다 (2-48 연구 트리 링크도 같은 방식).
20. **은행 없앰, 민간은 빌리지 않음 (2-41).** 민간 상회의 대출·한도 줄(`CompanyPanel.tsx` 132~144)은 왕실(`c.state`)일 때만.
21. **지도 다시 그리기: 생성 이미지 + 지역 경계 벡터 (2-43).** 보로노이 지도(`RegionMap.tsx` 16~98·114~133)를 그림 한 장 + 지역 경로 7개로. 이미지 생성은 사용자, 따기·코드는 화면 작업자.
22. **철거 진행 보이기 (2-49).** 남는/대기/이번 주 레벨 막대, 다음 철거까지 날 수, 회수 자재, 망치 아이콘.
23. **저택·금융가에서 가동률·원료 충족 숨기기 (2-50).** 자리 충원 막대와 금고만.
24. **투입·산출 다시 설계 (2-51, 사용자 요청).** `FlowRow` 하나(투입 칩 → 건물 → 산출 칩, 하루 실제 양·단가·금액·충족/판매 막대·이익률)를 건물 상세·내 건물 행·상품 상세·건설 카드에 쓰고, 방식 `<select>`(`CompanyPanel.tsx` 421~428)를 열 비교로.
25. **아이콘을 지도 양식으로 새로 (2-52, 사용자 요청, 2-43과 같이).** `icons.json` 목록 → ChatGPT 6칸 시트 13장 → `pack.py`로 480 칸 아틀라스 7장(webp) → 별칭 없는 검사. 2-39를 대체한다.
- **아직 sim에 없음 (만들지 말 것, 들어오면 이 목록에 올린다):**
  - 건물별 임금·현금·보조금 (브랜치 wt-wage). 들어오면 국영 임금 손잡이(`budget.wages`)가 없어지고, 건물 패널에 임금·현금·보조금 켜기가 생기고, 저장 형식이 바뀐다(옛 저장은 `migrateWorld`로 변환). 그래서 2-30의 국영 임금 줄은 작게 두어도 된다.
  - 세 세법·6개월 전환·투자법·조건 (2-45), 저택·금융가 자산 비율 (2-44): 3장에 요청함.
  - 자본가 계층 없앰 (DECISIONS 7-19): 금융가는 투자 펀드, 자리는 전문가 직원뿐. 새 화면에 자본가를 넣지 않는다.

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
  - **들어올 변경 (DECISIONS 7-19):** 자본가 계층을 없앤다. 금융가는 투자 펀드가 되고 자리는 전문가 직원(기본 임금 + 성과급)뿐이다. 자본가 자리·자본가 색/아이콘을 새로 만들지 말고, 들어오면 이 줄의 자본가 언급을 지운다.
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
  - **들어올 변경 (DECISIONS 7-19):** 자본가 계층을 없앤다. 금융가는 투자 펀드가 되고 자리는 전문가 직원(기본 임금 + 성과급)뿐이다. 자본가 자리·자본가 색/아이콘을 새로 만들지 말고, 들어오면 이 절의 자본가 언급을 지운다.
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
2. **지역 패널** (2-42로 대체: 종류별 한 행 + 소유 비율 막대, 저택·금융가는 목록 맨 아래 두 행. 아래 원안은 쓰지 않는다) (`RegionPanel.tsx`): 건물 목록을 `저택` / `금융가` / `국영` 세 묶음으로 나눈다. 묶음 머리에 소유 건물 이름과 주간 수입, 그 아래 `holdingsOf` 건물들. 지분 없는 국영 건물은 `국영` 묶음. 소작지는 `저택` 묶음 맨 아래 한 줄(합친 레벨).
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
- **사용자 재요청 (2026-10-21): 왕국 지도 버튼을 아래 줄에서 뺀다. 0장 1번.** `WindowWorkspace.tsx` 67 `windows.map`에서 `win.id==='map'`을 거르고, 68행 지도 분기(열린 창 한꺼번에 숨기기)를 지운다. 새 창(정책 2-45, 지역 2-46)의 버튼도 이 규칙을 따른다.
**문제:** `WindowWorkspace.tsx` 67~70행 `desktop-dock`이 작업표시줄처럼 동작한다. 열린 창을 누르면 최소화, 다른 창 뒤에 있으면 앞으로, 최소화된 창은 점(`is-open`)으로 남는다. 상태가 셋(닫힘/최소화/보임)이라 헷갈린다.

**바꿀 동작 (상태는 둘: 열림/닫힘)**
- 닫힌 창의 버튼을 누르면 창이 열리고 맨 앞에 온다 (`focus`).
- 열린 창의 버튼을 누르면 창이 닫힌다 (`close`). 다른 창 뒤에 가려져 있어도 닫는다.
- 창 제목 줄의 닫기(X)와 Esc도 같은 `close`. 버튼 상태도 같이 바뀐다.
- 열린 창을 앞으로 가져오려면 창을 누른다. 버튼으로 앞으로 가져오지 않는다.
- 버튼 표시: 열린 창은 `aria-pressed=true`와 눌린 모양(배경색) 하나만 쓴다. `is-open` 점과 "맨 앞" 표시는 따로 두지 않는다.
- 왕국 지도 버튼은 아래 줄에서 없앤다. 지금은 누르면 열린 창이 한꺼번에 숨었다 나타나는데(68행), 사용자가 이상하다고 했다. 지도는 늘 바닥에 깔려 있으므로 버튼이 필요 없고, 다른 창에 손대는 버튼도 두지 않는다. 창은 각자 자기 버튼·X·Esc로만 닫힌다.
- 최소화 상태 `minimized`와 제목 줄의 최소화 버튼은 없앤다. 창 크기·최대화는 2-53에서 없앤다 (창은 왼쪽/오른쪽 자리만 기억).
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
  - **들어올 변경 (DECISIONS 7-19):** 자본가 계층을 없앤다. 금융가는 투자 펀드가 되고 자리는 전문가 직원(기본 임금 + 성과급)뿐이다. 자본가 자리·자본가 색/아이콘을 새로 만들지 말고, 들어오면 이 절의 자본가 언급을 지운다.
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

### 2-29. 저택의 하급 귀족 (gentry)
- 저택(`manor`) 1레벨 자리: 귀족 100 + 하급 귀족 100. 일자리 표·막대는 `slots(b, s)`·`b.employed`라 그대로 보인다.
- 저택 수입(배당·지대·철거 대금)은 몫으로 나뉜다: 귀족 1명 1몫, 하급 귀족 1명 `TUNE.gentryShare`(0.25) 몫. 저택·금융가 자리는 모두 임금이 없다.
- 새 export (`economy.ts`): `paysShare(b, s)` 이 자리가 임금 대신 몫을 받는가 (`paysDividend`는 그대로 있다), `shareWage(b, s)` 한 사람의 기대 하루 몫 (= labor `dividendWage`), `shareWeight(cls)` 1명 몫.
- 넣을 곳: 건물 카드에서 "배당" 표시를 `paysShare(b, s)`로 바꾸면 저택의 하급 귀족도 몫으로 보인다 (`CompanyPanel.tsx` 152행은 `paysDividend(c.state, s)`). 저택 툴팁에 직종별 1명 몫(`shareWage`)을 보일 수 있다 (선택).
- 저장 형식 그대로. 옛 저장은 다음 날 저택이 커지고 실업 하급 귀족이 차차 앉는다.

### 2-37. 농부 계층 (2026-10-21)
- 새 직종 `farmer` (농부 / Farmers, 하층, 기본 임금 10). `SKILLS`·`POP_CLASSES`에서 `unskilled` 바로 뒤에 있다. `SKILL_DEFS.farmer`, `CLASS_DEFS.farmer`에 이름이 있다.
- 곡물 농장·섬유 농장·목장(`farm`·`fiber_farm`·`ranch`)의 모든 방식에서 노동자 자리가 농부 자리가 되었다 (`workers.farmer`). 다른 건물은 그대로 노동자다.
- 자리 규칙은 노동자와 같다: 귀족·자본가 말고 누구나 자격 없이 들어간다. 임금은 회사가 직종별로 정한다 (`company.wages.farmer`, 플레이어 시장임금 정책 `wageOffset.farmer`). 국영 임금도 직종별로 나온다.
- 새 export: `LOWER_JOBS` (`['unskilled', 'farmer']`), `isLowerJob(cls)`.
- 지표: `KingdomMetrics.labor.farmer`, `popBy/solBy/wealthBy/foodBy/growthBy.farmer`, `HistoryPoint.sol/population/unemployment.farmer`, `region.households.farmer`, `building.employed.farmer`. 기아 알림에 농부가 생겼다 (`famine:<지역>:farmer`).
- 저장 형식 7판. 옛 6판은 `migrateWorld`가 농장·목장의 노동자를 농부로 바꾸고 농부 칸을 채운다 (임금은 그 회사 노동자 임금에서 시작).
- sim 작업자가 컴파일·테스트를 맞추려고 고친 곳 (임시, 화면 작업자가 다시 정한다):
  - `packages/client/src/ui.tsx` 8: `CLASS_COLOR.farmer = 'var(--c-farmer, #8a9a3c)'` (styles.css에 `--c-farmer` 토큰은 아직 없다, 다크 모드 값도 필요)
  - `packages/client/src/ui.tsx` 11: `SKILL_COLOR.farmer`
  - `packages/client/src/spriteAtlas.ts` 13: 별칭 `farmer:'peasant'` (전용 아이콘이 없어 소작농 아이콘을 쓴다. `uiRefresh.test.ts`가 모든 계층에 아이콘을 요구한다)
- 넣을 곳: 직종 목록을 손으로 적은 곳에 농부를 더한다. 예: `sprites.tsx` 23·26의 계층 아이콘 목록, `RegionPanel.tsx` 62~64 하층 합계(소작농 + 노동자 → + 농부)와 실업률, `RegionExplorer.tsx` 27 실업률(노동자만 본다), 그 밖에 `'unskilled'`를 직접 쓰는 곳.

---

### 2-36. 종이 (새 상품·종이 공장)
- 새 상품 `paper` (종이 / Paper, 기본가 4). `GOOD_IDS` 맨 끝에 붙였다. 상품 목록·시장 표는 `GOOD_IDS`·`GOODS`로 그리면 저절로 나온다.
- 새 건물 `paper_mill` (종이 공장 / Paper mill, 공장 부지, 1,000점). 방식 `pulp_press` (펄프 압착): 목재 2,500 → 종이 5,000, 노동자 800·기술자 200. 기술 없이 지을 수 있다.
- 전문 관료제(`admin_professional`)의 원료가 가구 100에서 종이 200으로 바뀌었다.
- 할 일: `spriteAtlas.ts`에 `paper`(상품)·`paper_mill`(건물) 그림을 넣는다. 그림이 생기기 전에는 별칭(예: `paper:'tools'`, `paper_mill:'workshop'`)으로 임시 표시해도 된다. 클라이언트 컴파일은 바꾸지 않아도 통과한다 (클라이언트 파일은 고치지 않았다).
- 옛 저장: `migrateWorld`가 지역 시장에 `paper`를 기본가로 넣는다. 불러오기 전 기록(`history[].prices`)에는 `paper`가 없으니 가격 그래프는 값이 없는 칸을 건너뛴다.
- 행정청 징세 한도는 이제 원료 충족률을 따른다 (`b.last.inputFill`). 건물 패널의 "원료 충족"이 행정청에도 실제 효과가 있다.

- 임시 (sim 쪽에서 컴파일·테스트용으로 넣음): `spriteAtlas.ts` 13행 별칭 `paper_mill:'workshop'`, `paper:'cloth'`. 전용 아이콘을 그리면 이 별칭을 지운다.

### 2-39. 임시 아이콘 목록 (2026-10-21 정리)
전용 그림이 없어서 다른 아이콘을 빌려 쓰는 것들이다. 모두 `packages/client/src/spriteAtlas.ts` 13행 `aliases`에 있다. 전용 그림을 아틀라스(`public/assets/*-v2.png`, 4×3칸)에 넣고 `sheets` 목록에 id를 더한 뒤 별칭을 지운다.

| id | 종류 | 지금 빌려 쓰는 그림 | 언제 넣었나 | 같은 그림을 쓰는 것 (헷갈림) |
|---|---|---|---|---|
| `paper` | 상품 (종이) | `cloth` 옷감 | 2026-10-21 sim (2-36) | 옷감·고급 옷감 |
| `paper_mill` | 건물 (종이 공장) | `workshop` 공방 | 2026-10-21 sim (2-36) | 공방 |
| `farmer` | 계층 (농부) | `peasant` 소작농 | 2026-10-21 sim (2-37) | 소작농 |
| `gentry` | 계층 (하급 귀족) | `aristocrat` 상급 귀족 | 이전 | 상급 귀족 |
| `ranch` | 건물 (목장) | `farm` 곡물 농장 | 이전 | 곡물 농장 |
| `meat` | 상품 (고기) | `food` 식료품 | 이전 | 식료품 |
| `luxury_furniture` | 상품 (고급 가구) | `furniture` 가구 | 이전 | 가구 |
| `luxury_cloth` | 상품 (고급 옷감) | `cloth` 옷감 | 이전 | 옷감·종이 |

- 그 밖의 별칭(`factory`, `locomotive`, `laborer`, `m-wheat`, `m-mine`, `fuelworks`)은 옛 이름을 지금 그림으로 잇는 것이라 새 그림이 필요 없다.
- 색: 농부 계층 색은 `ui.tsx` 8행 `var(--c-farmer, #8a9a3c)` 임시값이다. `styles.css` 토큰 `--c-farmer`(밝은·어두운 테마 둘 다)를 만든다.
- 우선순위: 같은 화면에 나란히 나와 헷갈리는 쌍부터 — 농부/소작농(계층 표·도넛), 하급/상급 귀족(저택 직원), 종이/옷감(시세 창).
- 테스트 `test/uiRefresh.test.ts`는 아이콘이 null이 아닌지만 본다. 전용 그림을 넣은 뒤에는 "서로 다른 칸"인지 확인하게 바꾸는 것을 권한다.

### 2-40. 규칙 사전 (2026-10-21, 급하지 않음)
- 데이터: `@econ/sim`의 `ENCYCLOPEDIA`(항목 79개), `ENC_CATEGORIES`(10개), `SEEN_IN`(창 이름), `fillText`, `defaultCtx`, `ENC_BUILDINGS`.
  항목 = `id, category, title{ko,en}, rule{ko,en}, formula?, params[{label, value(), unit}], example?() → {inputs, steps, result}, live?{pick, run(world, ctx)} → {rows, bars}, related, seenIn, source, design`.
  `rule`·`formula`의 `{0}`, `{1}`은 `params` 값이다 (`fillText(text, entry, format)`). 단위(`unit`): florin, pct(×100 %), x, day, week, people, pt, level, good.
- 단독 앱 `packages/encyclopedia` (Vite + React, 포트 5200, `npm run encyclopedia`): 왼쪽 분류·검색, 오른쪽 규칙·공식·값·예시·지금 게임(워커에서 도는 세계, 날짜 슬라이더·+30일·+1년·시드)·관련·보이는 곳. 테마는 CSS 변수(`:root[data-theme='dark']`), 언어 ko/en.
- 게임에 옮길 때: `src/components/*`(Sidebar, EntryView, LivePanel, Bars, Rows, ExampleView)는 작고 `@econ/sim`만 쓴다. 지금 게임 패널은 게임 화면의 `world`를 그대로 넘기면 워커가 필요 없다 (`LivePanel`의 `live.world` 자리).
- 딥링크: `…/encyclopedia/#price-formula`. 게임 창의 도움말 아이콘이 항목 id로 열면 된다. 항목의 `seenIn` 키(map, region, market, resource, pops, workforce, company, finance, alerts, charts)는 창 이름이다. 창 id와 다르면 `SEEN_IN`을 맞춰 달라고 3장에 적어 달라.
- GitHub Pages: `/econ-sim/encyclopedia/`에 함께 올린다 (`pages.yml`).

---

### 2-41. 은행 없앰, 민간은 빌리지 않음 (사용자 결정 2026-10-21)
- 규칙: 왕실만 빌린다. 국고가 모자라면 자동으로 국채를 찍어 빌리고, 남으면 갚는다. 민간 상회는 빌리지 않는다.
- sim 변경: `World.bank`(와 `Bank` 타입)를 없앴다. `MetricPoint.bank`도 없앴다 (화면은 읽지 않았다). `creditLimit(w, c)`는 민간이면 0이고, 민간 `Company.debt`는 늘 0이다 (필드는 왕실 국채 때문에 그대로 둔다). 옛 저장은 `migrateWorld`가 은행 현금을 투자 풀 쪽으로 옮기고 민간 빚을 0으로 만든다.
- 화면에서 할 일:
  - `CompanyPanel.tsx` 132~144: 대출 값과 한도 막대(`T.loanLimit`)는 `c.state`일 때만 그린다. 민간 상회 쪽에서는 줄을 뺀다.
  - `App.tsx` 125~145 상단 대출 칩, `FinancePanel.tsx` 19: 플레이어는 왕실이라 그대로 맞다. 2-28의 "금고 순자산 / 한도"도 왕실 국채 한도 그대로.
  - `BottomPanel.tsx` 34의 `c.cash - c.debt`: 민간은 빚이 0이라 현금과 같다. 그대로 두어도 된다.
- 컴파일 수정: 없음 (sim 이름·타입 중 화면이 쓰는 것은 바뀌지 않았다).

### 2-42. 지역 건물: 종류별 한 줄 + 전체/민영/국영 보기, 건설 통합 (사용자 요청 2026-10-21)
**사용자 말:** "지역 건물의 건물 부분에 민간/왕실의 소유가 처음부터 갈라져 있는데, 눌러서 세부에서 전체/민영/국영을 선택하고, 각각의 통계 및 전체나 국영에는 건설 등의 조작을 할 수 있도록. 지금은 건설이랑 전체 건설물이 분리되어 있는데 이걸 잘 통합."

**지금 화면 (main `465062a`)**
- 창: `App.tsx` 200 `industry` 창 = `RegionPanel mode='industry'`. 건설 창은 따로: `App.tsx` 203 `construction` = `Projects owner={me} projects={world.constructions}` (왕국 전체 공사, 왕실/민간 두 줄).
- 지역 건물 창 (`RegionPanel.tsx` 174~198)
  - 175: `T.construct` 버튼 → `BuildList`(`CompanyPanel.tsx` 486~520) 카드 격자를 펼친다. 카드를 누르면 `BuildCard`(522~558): 방식별 예상 이익, 공사비·기간·회수 기간, 이미 가진 레벨, 짓기(+1만).
  - 176: 그 지역 공사가 있으면 `Projects`(287~305, 왕실/민간 두 줄, 순서·일시정지·취소는 왕실 공사만).
  - 178: 고른 건물의 `BuildingInspector`(`ResourceInspector.tsx` 17~37). 조작은 35 `BuildingControls` → `Controls`(`CompanyPanel.tsx` 403~441, 593~596): −/+/+10, 철거 취소, 방식, 가동률, 정지. **플레이어 회사 건물일 때만** 나온다.
  - 179: `ListTools` 정렬(규모·이름·소유 회사·가동률·손익)과 검색(건물 이름 + 회사 이름, 57~61).
  - 182~196: 건물 칩 격자. **건물 하나 = 칩 하나**라 같은 종류가 왕실 칩과 민간 칩으로 처음부터 갈린다 (`OwnerBadge` 190, 테두리 색 189 = 회사 색).
  - 123: 머리 문구 "모든 상회 · 건물 n개 · 총 n레벨".
- sim 사실: 한 지역에서 한 회사는 한 종류의 건물을 하나만 가진다 (`commands.ts` 105 `build`가 있으면 그 건물 증설로 바뀐다). 왕국마다 회사는 왕실 하나와 민간 하나다 (1-1). 그래서 **지역 × 종류마다 건물은 많아야 둘**: 국영 `b`(회사 `state`, `b.stateOwned === true`)와 민영 `b`(그 왕국 민간 회사). 소작지·저택·금융가(`BUILDING_BY_ID[t].auto`)는 민영 하나뿐이다.

**바꿀 구조 (한 창에서 보기·짓기·공사)**

#### 2-42-1. 목록: 종류마다 한 줄
- 행 = 그 지역에 건물이 있거나 공사가 있는 **종류**: `typeIds = union(world.buildings.filter(b => b.regionId === r.id).map(b => b.typeId), world.constructions.filter(k => k.regionId === r.id).map(k => k.typeId))`.
- 칩 격자(182~196)를 행 목록으로 바꾼다 (`ResourceInspector`의 `industry-row` 모양에 가깝게). 한 행의 칸:

| 칸 | 내용 | 값 |
|---|---|---|
| 그림 | `BuildingSprite` 48 | |
| 이름 | `buildingName(t)` + `HarvestBadge` | |
| 레벨 | `×{Σ level}` + 공사 중 `+{Σ k.levels ?? 1}`(주황 작은 숫자) + 철거 대기 `T.demolitionQueue(Σ shrinking)` | 두 건물 합 |
| 소유 막대 | 가로 비율 막대 하나 (칸 나누기 아님), 너비 ∝ 레벨 | 2-35-0 몫 (아래) |
| 고용 | `Σ emp / Σ jobs` 숫자 + 얇은 막대 | `rowOf` 합 |
| 주간 이익 | `Σ profitEma × 7`, 음수 `neg` | 정부 건물(`isGovernment`)은 이익 대신 "—" |
| 공사 | 공사가 있으면 행 바닥에 2px 진행 막대 `Σ points / Σ required` | |

- 소유 막대 (2-35-0과 같은 규칙, 같은 색): 건물마다 레벨 × 몫을 더한다. 지금은 `royal`(국영 × `1 − privateShare`) · `stake`(국영 × `privateShare`) · `manor`/`finance`(민영 건물, `ownerBuildingOf(world, b, true)?.typeId`). 툴팁은 몫별 레벨과 %만. 국영만 있으면 왕실 색 한 칸 막대가 꽉 찬다.
  - **DECISIONS 7-16 대비 (레벨 소유):** 막대는 "몫 키 → 레벨 수" 맵 하나만 받아 그리게 만든다 (`ownerLevels(world, buildings): Record<'royal'|'stake'|'manor'|'finance', number>` 를 client 함수 하나로). 7-16이 sim에 들어오면 `stake`가 없어지고 레벨마다 주인(국가 / 어느 지역의 저택·금융가)이 생긴다. 그때 이 함수만 sim의 레벨 주인 함수(3장)로 바꾸면 막대는 그대로 `국가 / 저택 / 금융가` 세 칸이 된다. 툴팁에 주인 지역 이름을 붙인다 (다른 지역 저택이 산 레벨).
- 정렬 (`ListTools`): 규모(Σ level, 기본) · 이름 · 가동률(레벨 가중 평균, 2-42-3) · 고용률 · 주간 이익. `owner`(소유 회사) 정렬은 없앤다. 검색은 건물 이름만. 순서는 주마다만 다시 매긴다 (`House`처럼, 행이 뛰지 않게).
- 소유 건물(저택·금융가)은 목록 맨 아래 가는 줄 아래 두 행. 누르면 2-32의 소유 건물 표(`holdingsOf`). **2-32 보여줄 곳 2번(지역 패널 세 묶음)은 이 절로 대체한다.**
- 맨 아래 `+ 새 건물` 행 (2-42-5). 다른 왕국 지역(`r.kingdomId !== me.kingdomId`)이면 없다.
- 머리 123: 문구 대신 `종류 {n} · 레벨 {Σ}` 라벨+숫자. 175~176(`T.construct` 버튼, `BuildList`, `Projects`)은 이 창에서 지운다 (2-42-4·5로 옮겨 감).

#### 2-42-2. 상세: 전체 / 민영 / 국영
- 행을 누르면 그 행 바로 아래(또는 지금 178 자리)에 상세가 열린다. 맨 위 segmented 버튼 셋: `전체` · `민영` · `국영`, 각 버튼에 레벨 수 작은 숫자. 레벨 0이고 공사도 없는 쪽은 `disabled` (안 숨긴다: 자리가 흔들리지 않게).
  - 기본: `전체`. 단 `buildingRequest`(`App.tsx` 113 `openBuilding(id)`: 알림·통계에서 건물 하나를 열 때)로 왔으면 그 건물 쪽(국영/민영)으로 연다. `RegionPanel` 상태는 `buildingId` 대신 `{ typeId, view: 'all'|'private'|'state' }`.
- 보기마다 건물 집합: `S = 국영 [b]`, `P = 민영 [b]`, `A = S ∪ P`.
- 상세 내용 (지금 `BuildingInspector` 28~33을 "건물 집합"을 받게 고친다. 건물 하나면 지금 그대로):
  1. 머리: 그림 · 이름 `×{Σ level}` · 방식 (2-42-3) · 소유 막대(2-42-1과 같은 것, `국영`·`민영` 보기에서도 그 집합 몫만) · 국영 보기에서 지분이 있으면 지금 30의 `T.privateEquity NN%`.
  2. 지표 줄: 가동률 · 충원율 · 원료 충족 · 주간 이익 · (판매 건물이면) 유보 막대 (2-31).
  3. 직종별 인력 (`Workforce`): 직종마다 `Σ emp / Σ jobs` 막대.
  4. 투입 → 산출: 상품마다 `Σ cur / Σ max` (지금 `bag` 26은 `n × b.level` 기준량만 보인다. 기준량 `Σ (method.inputs[g] × b.level)`은 그대로 두고, 그 옆에 실제 충족 막대를 더한다).
  5. 손익 줄: 수입 · 원료 · 임금 · 이익 (`rowOf`의 `rev`·`raw`·`wage`·`profit` 합, 하루 값) + 주간 이익 `Σ profitEma × 7`.
  6. 공사 (2-42-4), 조작 (2-42-3).
- 소유 배지 링크(30)는 `국영` 보기에서는 `OwnerBadge`(왕실), `민영`에서는 2-32 칩 `→ 저택/금융가`. `전체`에서는 소유 막대가 대신한다.

#### 2-42-3. `전체` 합치는 규칙 (sim 필드 기준)
- 건물마다 `rowOf(world, b)`(`CompanyPanel.tsx` 42~80)를 구하고 아래처럼 더한다. 함수 하나 `aggregateRows(rows: Row[])`로 만들어 `국영`·`민영`(건물 하나)도 같은 함수를 지나게 한다.

| 값 | 합치는 법 |
|---|---|
| 레벨 | `Σ b.level`. 철거 대기 `Σ (b.shrinking ?? 0)`, 공사 중 `Σ queued` |
| 직종별 고용·일자리 | 직종 `s`마다 `Σ emp`, `Σ jobs` (`rowOf.staff`) |
| 충원율 | `Σ emp / Σ jobs` (일자리 가중) |
| 가동률 | `Σ (b.level × (b.active && !b.idle ? b.utilization : 0)) / Σ b.level` (레벨 가중) |
| 상품별 투입·산출 | 상품 `g`마다 `Σ cur`, `Σ max` (`rowOf.inputs/outputs`) |
| 원료 충족 | `Σ_g Σ cur × price / Σ_g Σ max × price` (값 가중, 원료 없으면 1) |
| 수입·원료·임금·이익 | 합. 이익률 = `Σ profit / Σ rev` (`Σ rev = 0`이면 "—") |
| 주간 이익 | `Σ b.profitEma × 7` |
| 유보 | `hasReserve(b)`인 건물만: `Σ (b.reserve ?? 0) / Σ reserveCap(b)` (막대는 100%에서 자른다) |
| 방식 | 두 건물 방식이 같으면 `methodName` 하나, 다르면 칩 두 개 `국영 · 방식A` / `민영 · 방식B` |
| 건설력·세수 역량·학교 자리 | 지금 33처럼 `method.x × b.level`의 합 |

- 정부 건물(`isGovernment`)·학교·건축사무소는 국영만 있으니 `전체` = `국영`.

#### 2-42-4. 조작: `전체`·`국영`은 왕실 건물을, `민영`은 보기만
- 조작 대상은 늘 **플레이어 왕실 건물** `S[0]` (`b.companyId === me.id`). `전체`와 `국영`은 같은 조작 줄을 쓰고, 숫자 옆에 `왕실 ×{S[0].level}` 라벨을 붙여 무엇이 바뀌는지 보이게 한다. `민영`에는 조작 줄이 없다. 다른 왕국 지역이면 세 보기 모두 조작 없음.
- 조작 줄 (지금 `Controls` 403~441을 고쳐 쓴다):

| 조작 | 명령 (`types.ts` 575~594) | 막힘 |
|---|---|---|
| −1 | `{type:'demolish', buildingId, levels:1}` (마지막 레벨이면 지금처럼 confirm) | 증설 공사 중, `shrinking >= level` |
| +1 / +5 | `{type:'expand', buildingId, levels:1|5}` (+10을 +5로 바꾼다) | `landFree(world, r.id, def.land) < n`, `def.deposit`이면 `depositFree(world, r.id, def.deposit) < n` (지금 `Controls`는 광맥을 안 본다), `shrinking > 0`, 공사 수 `>= MAX_CONCURRENT_CONSTRUCTIONS` |
| 철거 취소 | `{type:'cancelDemolish', buildingId}` | `shrinking`이 있을 때만 보인다 |
| 방식 | `{type:'setMethod', buildingId, methodId}`, 선택지 옆 `estimateMethod(...).profit` (지금 그대로) | 정부 건물 |
| 가동률·정지 | `setUtilization`, `setActive` (지금 그대로) | 정부 건물은 없음 |
| 민영화 켜기 | **sim 쪽 필요** (DECISIONS 7-16): `{type:'setPrivatize', buildingId, on}` + `Building.privatize?: boolean`. 들어오기 전에는 그리지 않는다 | 판매 건물만 (`sellsShares`) |

- 왕실 건물이 아직 없을 때 (`S`가 비었는데 민영 건물만 있음): `국영`·`전체`의 조작 줄 자리에 짓기 줄 `+1` / `+5` → `{type:'build', typeId, regionId: r.id, levels}`. 옆에 2-42-5의 짓기 정보(공사비·기간·예상 이익).
- 단추 툴팁: 막힌 이유는 지금 `buildBlockers`(475~484) 문자열을 그대로 툴팁에 (화면 문구 아님).

#### 2-42-5. 공사를 같은 행·상세 안에
- 행: 2-42-1의 `+n` 숫자와 바닥 진행 막대. 새로 짓는 종류(아직 건물 0)도 행이 생기고 레벨 칸은 `×0 +n`.
- 상세의 공사 칸: `world.constructions.filter(k => k.regionId === r.id && k.typeId === t)`. 보기별로 `국영` = 왕실 공사(`companyById(k.companyId).state`), `민영` = 민간 공사, `전체` = 둘 다.
  - 한 공사 한 줄 (지금 `Projects` 299 `article`을 컴포넌트 `ProjectRow`로 떼어 두 곳에서 같이 쓴다): `+{levels}` · 증설/신축 칩 · 진행 막대 `points / required` · `points / required pt` · `spent` · `ticksElapsed`일 · 일시정지 표시 · `capped` ◆.
  - 순서 칸: `#{position + 1} / {own.length}` (`own` = 그 회사의 **왕국 전체** 공사 목록. 순서는 왕국 대기열 순서다).
  - 왕실 공사만 단추: 위/아래 `moveConstruction index ±1`, `pauseConstruction`, `cancelConstruction`(지금 confirm 그대로). 민간 공사는 줄만.
- `+ 새 건물` 행 (목록 맨 아래): 누르면 그 자리에 종류 고르기 목록이 펼쳐진다. 지금 `BuildList`(486~520)를 그대로 쓰되 **이 지역에 행이 없는 종류만** 보인다 (행이 있는 종류는 그 행 상세의 짓기·증설로). 카드 머리: 그림 · 이름 · 땅 `landName(land) landFree` 또는 광맥 `DEPOSIT_NAMES[deposit] depositFree` · 예상 이익/일(`estimateAfterEntry(world, r.id, t, m, me.wages).profit` 최대) · 회수 기간. 펼치면 `BuildCard`(522~558) 그대로 + 짓기 단추를 `+1` / `+5` 둘로 (`build` 명령의 `levels`). 짓고 나면 목록에 그 종류 행이 생기고 상세가 `국영`으로 열린다.
- 상세 머리에도 땅·광맥 남은 칸을 숫자로 둔다 (`+5`가 왜 막혔는지 보인다).

#### 2-42-6. 건설 창은 왕국 대기열 보기로 남긴다 (추천)
- **추천: 건설 창(`App.tsx` 203)을 없애지 않고 "왕국 공사" 대기열 하나로 둔다.** 이유: 건축사무소 포인트는 왕국 대기열 순서대로 지역을 가리지 않고 나뉘고(`moveConstruction`은 회사 전체 순서를 바꾼다), 공사 상한 40건도 왕국 단위다. 지역 창만으로는 순서를 볼 수 없다. 짓기는 지역 창 한 곳에서만 한다.
- 건설 창 제목 `T.construct` → `T.kingdomQueue`(있음, "왕국 공사"). 내용은 지금 `Projects`(왕실/민간 두 줄) 그대로 + 행마다 지역 이름 링크: 누르면 지역 건물 창이 그 지역·그 종류 상세(`국영` 또는 `민영`)로 열린다 (`App.tsx` 113 `openBuilding`과 같은 방식으로 `openType(regionId, typeId, view)`를 하나 더한다).
- 위에 합계 한 줄: `공사 {왕실 건수} / 40` · 받는 포인트/일 (지금 header의 `receivedToday`).
- 한 창으로 합치는 안(건설 창을 지우고 지역 창에 왕국 대기열 탭)은 지역 창이 두 일을 하게 되어 고르지 않았다.

#### 2-42-7. 지울 것, 문자열
- 지운다: `RegionPanel.tsx` 47 `buildingMenu`, 175~176, 182~196 칩 격자, 57~60의 회사 이름 검색·`owner` 정렬, 188 칩 `title`(`T.myHouse`). `Controls`의 +10 단추(`T.expandTen`). 다른 곳에서 안 쓰면 `T.expandTen`·`T.myHouse` 문자열도.
- 더할 문자열 (ko / en):

| 키 | ko | en |
|---|---|---|
| `viewAll` | 전체 | All |
| `viewPrivate` | 민영 | Private |
| `viewState` | 국영 | Crown |
| `newBuilding` | + 새 건물 | + New building |
| `expandFive` | 5레벨 증설 | Expand by 5 |
| `buildFive` | +5 | +5 |
| `ownership` | 소유 | Ownership |
| `typesCount` | 종류 | Types |
| `queuePosition` | 순서 | Queue |
| `privatize` | 민영화 | Privatize (7-16이 sim에 들어온 뒤) |

  - 2-35-8에서 더하는 것: `T.employment`·`T.reserve`. 있는 것: `T.weeklyProfit`, `T.expansion`, `T.newConstruction`, `T.kingdomQueue`, `T.demolitionQueue`, `T.cancelDemolition`, `T.cost`, `T.duration`, `T.payback`.
- 화면 규칙: 설명 문구 없음 (라벨·숫자·막대·칩, 막힌 이유는 툴팁). 소유 막대는 칸 나누기가 아니라 비율 막대. 왕실·지분·저택·금융가 색은 2-35-0과 같고 다크 모드에서 구분된다. 숫자는 이동평균(`profitEma`)·주 단위.
- sim 변경 없이 만들 수 있다 (민영화 단추와 레벨 주인 막대만 7-16 이후, 3장).

### 2-43. 지도 다시 그리기: 생성 이미지 + 지역 경계 벡터 (사용자 요청 2026-10-21)
**문제:** 지금 지도(`RegionMap.tsx`)는 지역 중심점 7개(`POS` 16~19)로 사각형 땅(`LAND` 21~24)을 보로노이로 자른 것(`clip` 28~42, `cells` 68~84)이다. 모양이 직선 다각형이라 엉성하고, 경계가 sim 이웃과 맞지 않는다 (예: 벨마르 항(1)과 북부 광산지대(6)가 위쪽에서 맞닿아 보이지만 sim에서는 이웃이 아니다). 바다·해안선(114~115, 94~98·129)도 손으로 찍은 점 몇 개다.
**바꿀 것:** 그린 지도 한 장(바탕 그림) + 그 그림에서 딴 지역 경계 벡터(상호작용·색 레이어). 순서: 2-43-1 이미지 생성(사용자) → 2-43-2 경계 따기 → 2-43-3 게임에 넣기 → 2-43-4 지울 것·확인.

**지역 수는 늘어난다 (사용자 2026-10-21).** 지금 7개는 임시이고 나중에 지역을 늘린다. 그래서 이 절의 작업은 "한 번 그리고 끝"이 아니라 다시 돌릴 수 있는 과정으로 만든다.
- 코드와 데이터 어디에도 지역 수 7을 박지 않는다. 지역 목록·이웃·이름은 늘 sim(`w.regions`, `neighbors`)에서 읽고, `regions.json`은 지역 id를 키로 한 사전으로 둔다 (빠진 지역은 원 표시로 대신 그려 게임이 깨지지 않게).
- 프롬프트(2-43-1)는 지역 목록 표에서 만들어지게 적는다: 지역이 늘면 표에 줄을 더하고 같은 틀로 다시 생성한다.
- 경계 따기(2-43-2)는 스크립트로 만든다 (단색 키 판 → 경로 → 검사). 손으로 딴 경우에도 같은 검사(이웃 = sim `neighbors`)를 빌드에서 돌린다.
- 나중 확장 방식은 둘 중 하나로 고를 수 있게 둔다: (가) 지도를 통째로 다시 생성, (나) 대륙 바깥에 새 땅을 이어 붙이기. 어느 쪽이든 지역 id는 바뀌지 않는다.

#### 2-43-0. 지도에 담을 사실 (sim 기준, 바꾸지 말 것)
- 지역 7개 (`packages/sim/src/data.ts` 505~540 `REGIONS`). 왕국 3개(에스테라·벨로니아·카르텐)는 **시드마다 무작위로 나뉜다** (`world.ts` 59 `splitKingdoms`: 왕국마다 이어진 2지역 이상). 그래서 그림에 왕국 색·왕국 경계를 넣지 않는다. 왕국 경계는 게임이 지역 경계 중에서 골라 그린다.
- 이웃 (`neighbors`, 이것과 정확히 같아야 한다. 이웃 9쌍):
  `1-2, 1-3, 2-3, 2-4, 3-5, 3-6, 4-5, 5-7, 6-7`.
  이웃이 **아닌** 쌍이 닿으면 안 된다. 특히 `1-6`, `3-4`, `2-5`, `3-7`, `5-6`.
- 평면에 이 그래프를 그리면 네 지역이 둘러싸는 고리가 두 개 생긴다 (2-3-5-4, 3-6-7-5). 마주 보는 지역이 닿지 않게 고리 가운데에 **주인 없는 땅**을 하나씩 둔다: 2·3·4·5 사이에 **호수**, 3·5·6·7 사이에 **높은 바위 산괴**. 둘 다 클릭되지 않는다.
- 배치(추천, 그래프와 맞음):

  | id | 이름 | 위치 | 땅 모양 (근거: perks, forest, veins) |
  |---|---|---|---|
  | 1 | 벨마르 항 / Port Belmar | 북서 해안 | 항구 도시, 부두·범선, 작업장 거리, 작은 밭 (항구는 이 지역뿐: `spaceport`) |
  | 2 | 강변 평야 / River Plain | 서쪽~남서 해안 | 큰 강이 바다로 나간다, 황금빛 밀밭·아마밭 (`farm`, `fiber_farm`) |
  | 3 | 중앙 고원 / Central Highlands | 가운데, 북쪽 끝까지 뻗어 1과 6을 가른다 | 낮은 고원, 풍차·밭, 숲 조금, 작은 철 언덕, 길이 모이는 곳 (`railway`) |
  | 4 | 남부 습지 / Southern Marshes | 남쪽 | 갈대·늪·물길, 습지 숲 (`fiber_farm` 0.15, forest 100) |
  | 5 | 동부 삼림 / Eastern Forest | 남동~동쪽 | 짙은 숲, 제재소 (forest 200, 석탄 조금) |
  | 6 | 북부 광산지대 / Northern Mining District | 북동 | 언덕·산, 갱도·제련 연기 (철 200, 석탄 150) |
  | 7 | 회색 협곡 / Grey Gorge | 동쪽 끝 | 회색 바위 협곡과 계곡 강 (철 150, 석탄 100) |

  바다는 서쪽과 북서쪽만. 해안에 닿는 지역은 1·2 (4는 남서 끝이 살짝 닿아도 된다). 동·남·북의 지도 끝은 그냥 땅이 이어지다 잘린 모양(또는 옅게 흐려짐)으로 둔다. 강: 고원(3)에서 시작해 평야(2)를 지나 바다로, 하나 더는 협곡(7)을 따라 남쪽으로.

#### 2-43-1. 이미지 생성 (사용자가 ChatGPT로)
- **참고 그림 확인:** 사용자가 준 나무위키 이미지(신성 로마 제국 지도, 500×410 webp)를 열어 봤다. 역사 지도책 양식이다: 나라마다 납작한 파스텔·원색 칠, 옅은 음영 기복, 연한 파란 바다와 해안 음영, 붉은 국경선과 점선, 파란 강, 글자가 아주 많다.
- **양식 결정 (추천):** 참고 그림의 지도책 구성(기복 음영, 또렷한 해안·강, 경계가 읽히는 땅)을 따르되, 게임의 양피지 색(지금 땅 `#d0c495`, 바다 `#93afb3`, `strategy.css` 51)으로 **손으로 칠한 양피지 지도책**으로 한다. 이유: (1) 왕국이 시드마다 바뀌므로 정치색은 게임이 위에 칠해야 하고, 바탕은 채도가 낮아야 그 색이 읽힌다. (2) 픽셀 아트는 지도 크기에서 확대(최대 300%)하면 계단이 지고 경계 따기가 어렵다. 픽셀 아트는 지금처럼 지역 아이콘(`region-1..7` 스프라이트)에만 쓴다. (3) 글자를 넣지 않아야 한·영 전환과 숫자 표시를 게임이 한다.
- **크기:** 가로 3:2, `1536×1024` (ChatGPT 가로형 크기). 시안을 3~4장 받아 2-43-0 배치와 이웃 조건을 가장 잘 지킨 한 장을 고른다. 고른 그림으로 같은 대화에서 깨끗한 판(아래 B)을 만든다.

**A. 그림 판 (바탕) — 한국어**
```
가로 3:2(1536×1024) 판타지-근세 왕국의 대륙 지도를 그려줘. 오래된 양피지에 수채와 잉크로 손으로 칠한 역사 지도책 양식. 위에서 내려다본 시점, 은은한 기복 음영, 채도 낮은 흙빛·올리브·청회색. 글자, 숫자, 지명, 범례, 나침반, 테두리 장식, 격자는 절대 넣지 마.
서쪽과 북서쪽은 바다(연한 청회색, 해안 음영). 땅은 7개 지역으로 나뉘고, 지역 사이 경계는 가늘고 또렷한 짙은 갈색 잉크 선으로 그려. 지역마다 땅 모양이 다르게:
1) 북서 해안: 성벽 있는 항구 도시, 부두와 범선, 작업장 지붕, 작은 밭.
2) 서쪽~남서 해안: 넓은 평야, 큰 강이 바다로 흐름, 황금빛 밀밭과 아마밭.
3) 지도 가운데 고원, 북쪽 끝까지 길게 뻗어 1과 6을 갈라놓음: 풍차, 밭, 작은 숲, 낮은 바위 언덕, 길이 모이는 곳.
4) 남쪽: 갈대 습지, 늪과 물길, 습지 숲.
5) 남동~동쪽: 아주 짙은 숲과 제재소.
6) 북동: 언덕과 산, 갱도 입구, 제련소 연기.
7) 동쪽 끝: 회색 바위 협곡, 협곡을 따라 남쪽으로 흐르는 강.
2·3·4·5가 만나는 곳에는 호수가 있어서 2와 5, 3과 4는 서로 닿지 않아. 3·5·6·7이 만나는 곳에는 아무 지역에도 속하지 않는 높은 바위 산괴가 있어서 3과 7, 5와 6은 서로 닿지 않아. 1은 2·3하고만, 6은 3·7하고만 닿아.
지도 동·남·북 가장자리는 땅이 이어지다 잘린 모양. 나라 색칠이나 국경 색은 넣지 마.
```
**A. Painted base — English**
```
A 3:2 landscape (1536x1024) continental map of an early-modern fantasy kingdom, hand-painted historical atlas style: watercolor and ink on aged parchment, top-down view, soft hillshade relief, muted earthy ochre, olive and slate-blue palette. Absolutely no text, letters, numbers, place names, legend, compass rose, decorative frame, or grid.
Sea to the west and north-west (pale slate-blue with coastal shading). The land is divided into exactly 7 regions separated by thin, crisp dark-brown ink border lines. Each region has distinct terrain:
1) North-west coast: walled harbour town, docks and sailing ships, workshop roofs, small fields.
2) West to south-west coast: broad plain, a large river flowing into the sea, golden wheat and flax fields.
3) Central plateau that extends north to the top edge, separating region 1 from region 6: windmills, fields, small woods, low rocky hills, a road junction.
4) South: reed marshes, bogs and channels, swamp woods.
5) South-east to east: very dense forest with sawmills.
6) North-east: hills and mountains, mine entrances, smelter smoke.
7) Far east: grey rocky gorge with a river running south through it.
Where regions 2, 3, 4 and 5 meet there is a lake, so 2 does not touch 5 and 3 does not touch 4. Where 3, 5, 6 and 7 meet there is a high rocky massif belonging to no region, so 3 does not touch 7 and 5 does not touch 6. Region 1 touches only 2 and 3; region 6 touches only 3 and 7.
The east, south and north map edges are land cut off by the frame. No political colors or colored national borders.
```
**B. 깨끗한 판 (경계 따기용) — 고른 그림으로 같은 대화에서**
```
방금 고른 지도와 구도·해안선·경계선 위치를 픽셀 단위로 똑같이 유지해서, 그림 없이 평면 색만 있는 판으로 바꿔줘. 7개 지역을 각각 하나의 단색으로 꽉 채워: 1 #FF0000, 2 #00FF00, 3 #0000FF, 4 #FFFF00, 5 #FF00FF, 6 #00FFFF, 7 #FF8000. 바다는 #FFFFFF, 호수는 #808080, 바위 산괴는 #404040, 강은 #000080 2픽셀 선. 지역 경계선, 음영, 질감, 그림자, 글자는 넣지 마. 안티앨리어싱 없이 가장자리를 또렷하게.
```
```
Keep the exact composition, coastline and every border position of the chosen map, pixel for pixel, but render it as a flat color-key map with no artwork. Fill each of the 7 regions with one solid color: 1 #FF0000, 2 #00FF00, 3 #0000FF, 4 #FFFF00, 5 #FF00FF, 6 #00FFFF, 7 #FF8000. Sea #FFFFFF, lake #808080, rocky massif #404040, rivers as 2-px #000080 lines. No border lines, shading, texture, shadows or text. Hard edges, no anti-aliasing.
```
- B가 A와 어긋나면(생성 모델은 다시 그릴 때 선이 조금 움직일 수 있다) B를 버리고 A 위에서 직접 딴다 (2-43-2의 "손으로 따기"). 어느 쪽이든 최종 벡터는 A 그림에 겹쳐 맞춘다.
- 사용자가 고른 A·B 원본 PNG를 `packages/client/public/assets/map/`에 `map-base.png`, `map-key.png`로 둔다 (원본 보관용, 빌드에는 webp만).

#### 2-43-2. 경계를 벡터로 따기
- **좌표계:** 벡터 좌표 = 그림 픽셀 좌표. `viewBox="0 0 1536 1024"`. 그림을 자르거나 늘리지 않는다 (자를 거면 벡터 따기 전에 자르고 크기를 기록).
- **자동 따기 (B가 있을 때, 추천):** 색 키 그림을 지역 번호 래스터로 바꾼다 (색마다 가장 가까운 키 색으로 반올림, 경계의 섞인 픽셀 정리). 같은 래스터에서 다각형을 뽑으면 이웃끼리 경계가 **같은 점**을 공유한다 (예: Python `rasterio.features.shapes` → GeoJSON). 그다음 위상을 지키는 단순화(예: `mapshaper -simplify` 는 공유 경계를 한 번만 단순화해 틈·겹침이 안 생긴다)로 점 수를 줄인다. 지역마다 300점 안팎이면 충분하다.
- **손으로 따기 (B가 어긋날 때):** Inkscape(또는 Figma)에서 A를 잠근 바탕으로 깔고 경계선을 따라 펜으로 그린다. 공유 경계는 **한 번만** 그리고 양쪽 지역이 그 선을 같이 쓴다 (Inkscape: 경계선들을 그린 뒤 해안선 닫힌 도형과 함께 `Path > Split Path`/도형 빌더로 조각을 만든다, 또는 스냅을 켜고 노드를 같은 점에 붙인다). 틈·겹침이 0.5px 넘으면 안 된다.
- **만들 레이어:** 지역 7개(닫힌 경로 하나씩, `id = region id`), 주인 없는 땅 2개(호수 `lake`, 산괴 `massif`), 해안선(열린 선), 강(열린 선 여러 개), **이웃 쌍마다 공유 경계 선**(9개, `a<b`), 바다 영역.
- **기준점 (지역마다, 그림을 보고 손으로 찍는다):** `label`(이름표 자리, 넓고 빈 곳), `icon`(지금 `region-N` 스프라이트 자리), `city`·`farm`·`forest`·`mine` 중 그 지역에 있는 것(건물 칩·광맥 표시 자리), `rail`(철도 선이 닿는 점). 겹치지 않게 최소 60px 띄운다.
- **저장 파일:** `packages/client/src/map/regions.json` (코드가 읽음) 하나. 모양:
  ```ts
  type MapData = {
    viewBox: [0, 0, 1536, 1024];
    image: { light: string; dark?: string };          // public 경로, 예 'assets/map/map-base.webp'
    regions: { id: number; d: string;                  // SVG path, 좌표 소수 1자리
      bbox: [number, number, number, number];          // x, y, w, h
      centroid: [number, number]; label: [number, number]; icon: [number, number];
      anchors: Partial<Record<'city'|'farm'|'forest'|'mine'|'rail', [number, number]>> }[];
    borders: { a: number; b: number; d: string }[];   // 이웃 쌍마다 공유 경계 (열린 선)
    unclaimed: { id: 'lake'|'massif'; d: string }[];
    coast: string; rivers: string[]; sea: string;
  };
  ```
  편집 원본 `packages/client/src/map/regions.svg`(Inkscape 파일, 그룹 id = 위 이름)도 같이 둔다. json은 svg에서 스크립트(`packages/client/scripts/build-map.ts`)로 만든다. 손으로 json을 고치지 않는다.
- **이웃 검사 (필수, 스크립트에 넣는다):** 두 지역 경로가 길이 20px 넘게 경계를 공유하면 이웃이다. 이 집합이 `REGIONS`(`@econ/sim`)의 `neighbors` 9쌍과 정확히 같아야 하고, 다르면 빌드가 실패한다. `borders`의 쌍도 같은 9쌍이어야 한다. 이웃 아닌 쌍은 꼭짓점 하나(길이 0)로도 닿지 않게 한다.

#### 2-43-3. 게임에 넣기 (`RegionMap.tsx`)
- **층 (아래부터):**
  1. 바탕 그림: `<image href=… x=0 y=0 width=1536 height=1024 preserveAspectRatio="none">`. 클릭 없음.
  2. 데이터 칠: 지역 경로 7개에 레이어 색. `territory`는 왕국 색 `fill-opacity .35`, `wealth`·`sol`은 2-33의 연속 색(`wealthColor`) `fill-opacity .55`. `mix-blend-mode: multiply`로 그림의 질감이 비치게 한다. 경계선은 칠하지 않는다(그림에 있음).
  3. 왕국 경계: `borders` 중 `kingdomId`가 다른 쌍만, 지금처럼 밝은 선 위 어두운 선 두 겹(128행 모양 그대로, 굵기만 새 좌표에 맞게 약 ×15). 왕국은 시드마다 다르므로 매번 계산.
  4. 상호작용: 같은 지역 경로를 투명 칠(`fill: transparent; pointer-events: all`)로 한 번 더. hover는 밝게(`filter: brightness(1.08)` 또는 흰 칠 .12), 선택은 굵은 테두리(선택 지역을 맨 위로 그리는 지금 방식 `order` 유지), 포커스는 `--accent` 테두리.
  5. 철도: 이웃 쌍마다 두 지역 `anchors.rail`을 잇는 선(지금 `edges`와 같은 9쌍). 직선 대신 살짝 굽힌 2차 곡선.
  6. 글자·숫자·아이콘: 게임이 그린다. 이름표는 `label`, 지역 아이콘은 `icon`, 소유 막대·내 건물 배지는 `label` 기준 아래. 글자는 화면 크기가 줌과 무관하게 일정하도록 `font-size`를 `1/zoom`로 맞추거나 `vector-effect`를 쓴다. 글자에 양피지색 테두리(`paint-order: stroke`)를 둬 그림 위에서 읽히게.
- **줌·이동:** 지금 카메라 코드(55~58, 107~112)를 그대로 쓰되 단위를 1536×1024에 맞춘다: 기본 보기는 그림 전체, 줌 100~300%, 이동은 그림 밖으로 10% 넘게 나가지 않게 고정. 줌 300%에서 흐리면 그림을 2배(3072×2048)로 키운 판을 쓴다 (아래 용량 안에서).
- **다크 모드:** 그림을 바꾸지 않고 바탕 그림 위에 어두운 막(`rect` 칠 `#101418` 불투명 .45, 또는 `filter: brightness(.6) saturate(.8)`)을 깐다. 데이터 칠·경계·글자는 그 위라 다크에서도 또렷하다. 다크 전용 그림(`image.dark`)은 선택.
- **성능:** 그림 한 장 + 경로 7×2 + 선 20개 안팎. 경로 문자열은 모듈에서 한 번 읽고, 틱마다 바뀌는 것은 `fill`뿐. 그림은 `decoding="async"`, 한 번만 불러온다.
- **파일·용량:** `packages/client/public/assets/map/map-base.webp` (품질 80 안팎, **2MB 이하**, 1536×1024면 보통 0.5MB 안). `regions.json` 100KB 이하.
- **출처 기록:** `packages/client/public/ASSETS.md`에 "지도 바탕: 사용자가 ChatGPT 이미지 생성으로 만듦 (날짜), 프롬프트 원문은 docs/UI_CHANGES 2-43-1, 고른 시안, 후처리(webp 변환·크기)"를 적는다. 사용자 계정에서 만든 그림이라 이용 조건은 사용자가 확인한다 (공개 배포 전에 결정 필요 표시).
- 왼쪽 범례(`map-keys` 163~)의 바다·땅 표시는 그대로, 철도·광산 표시는 새 선 모양과 맞춘다.

#### 2-43-4. 지울 것과 확인
- **지울 것 (`RegionMap.tsx`):** `POS` 16~19, `LAND` 21~24, `Pt`·`clip`·`toPath` 26~43, `cells` 68~84, `borders` 계산 85~93(→ `borders` 데이터 + 왕국 비교), `coast` 94~98, `map-bg`·`sea` 114~115, `coast-line` 129, 철도의 `POS` 사용 130~133, 이름표·아이콘의 `POS` 사용 136~(→ `label`·`icon`), `viewBox` 계산 107의 `-24`,`-8`,`148`,`116` 상수.
- **CSS:** `strategy.css` 51의 `.map-bg`·`.sea` 칠, `styles.css` 234~236(`.map-bg`, `.sea`, `.coast-line`)은 쓰지 않으면 지운다. `.cell-fill`(238~241)은 새 층 규칙으로 바꾼다.
- **그대로 둘 것:** 레이어 버튼·범례·지역 목록 표(`map-directory`), 소유 막대·내 건물 배지 모양, `RegionCircles.tsx`(지역 패널의 땅 고리, 지도와 무관).
- **확인:**
  - 7지역 모두 클릭·키보드(Enter/Space) 선택이 되고, 호수·산괴·바다는 눌러도 선택이 바뀌지 않는다.
  - 경계에 틈·겹침이 없다 (300% 확대에서 바탕색이 새지 않음, 투명 칠 겹침 없음).
  - 빌드 스크립트의 이웃 검사가 통과한다 (`neighbors` 9쌍과 같음). 시드 1·2·3에서 왕국 경계가 실제 왕국이 다른 이웃 사이에만 그려진다.
  - 세 레이어(영토·부·생활수준) 색이 그림 위에서 구분되고, 다크 모드에서도 구분된다.
  - 그림에 글자가 없다. 한·영 전환 때 이름표만 바뀐다.
  - 그림 용량 2MB 이하, 첫 표시 지연이 눈에 띄지 않는다.
- sim 변경 없음.

### 2-44. 저택 대 금융가 자산 비율 (통계·소식, 사용자 요청 2026-10-21, sim 쪽 필요)
**사용자 말:** 통계·소식에 저택 대 금융가 자산 비율을 지역별·왕국별로 보인다. 세법 조건선은 그리지 않는다 (DECISIONS 7-19 마지막 줄).
- **값 (DECISIONS 7-18 "저택 크기"와 같은 셈):** 자산 = 가진 레벨의 주간 산출 가치(기본가, 레벨 × `weeklyOutputValue(typeId, methodId)`, 지분이면 × 지분) + 저택만 그 지역 소작지 수확의 주간 가치(기본가). 비율 = 금융가 ÷ (저택 + 금융가). 주간 값, 100 단위로 둥글게.
- "지역별"은 **주인(저택·금융가)이 있는 지역** 기준이다. 7-16·7-19가 들어오면 저택·금융가가 다른 지역 레벨도 사므로 건물 위치로 묶지 않는다.
- **sim 쪽 필요 (3장):** `ownershipAssets(world)` 순수 함수와 `KingdomMetrics.assetsManor`·`assetsFinance` (30일마다). 들어오기 전에는 만들지 않는다 (지금 `holdingsOf`로 흉내 내면 7-16 뒤 숫자가 달라진다).
- **보여줄 곳:** 통계·소식 창 `BottomPanel.tsx` 38~72 `SectionStack`에 새 섹션 `assets`를 `kingdoms`(42) 바로 뒤에.
  1. 머리 오른쪽 칩 두 개 `왕국 | 지역` (보기 전환, 고른 것은 localStorage `trends-assets-scope`, try/catch).
  2. 막대 목록: 한 행 = 왕국(왕국 색 점 + 이름) 또는 지역(지역 이름 + 왕국 색 점). 내 왕국(지역은 내 왕국 지역)이 위. 행마다 가로 비율 막대 하나: 저택 색 | 금융가 색 (2-32-4의 두 고정 색), 너비 ∝ 자산. 오른쪽에 금융가 비율 `NN%` (정수). 툴팁: `저택 ƒ/주 · 금융가 ƒ/주`.
  3. 추이: `TimeChart`로 왕국별 금융가 비율 선 (0~100%, 왕국 색, 내 왕국 굵게). 데이터 `metrics[].kingdoms[k].assetsFinance / (assetsManor + assetsFinance)`. 지역 보기일 때도 추이는 왕국 선만 (지역 추이는 두지 않는다).
  - 세법·투자법 조건 값(가로선, 눈금, 색 띠)을 막대·차트에 그리지 않는다. 조건 숫자는 정책 창(2-45)에만 있다.
- 문자열: `assetsTitle` 저택·금융가 자산 / Manor vs finance assets, `scopeKingdom` 왕국 / Kingdoms, `scopeRegion` 지역 / Regions, `financeShare` 금융가 비율 / Finance share.

### 2-45. 정책 창 (세법·투자법, 사용자 요청 2026-10-21, 일부 sim 쪽 필요)
**사용자 말:** 정책 탭(창)을 새로 만든다. 세법(토지세/인두세/소득세 중 하나, 시작 토지세)을 고르고, 바꾸면 6개월에 걸쳐 바뀌며 진행 막대가 보인다. 고를 수 있는지는 금융가 자산 비율 조건으로 정해진다. 투자법도 같은 모양 (DECISIONS 7-18 세법, 7-19 투자법).

**지금 화면:** 세법은 재정 창 `FinancePanel.tsx` 20의 `select` (`land`/`capita` 둘, 누르면 바로 바뀜, `setTaxLaw`). 예산 단계 버튼 1~5는 같은 표 24 (2-23·2-30).

#### 2-45-1. 창
- `WindowWorkspace.tsx` 7 `WindowId`에 `'policy'`, `App.tsx` 201 `finance` 다음에 `{ id:'policy', title:T.policy, icon:<Scale size={18}/> }` (lucide `Scale`). dock 버튼도 생긴다 (2-34 토글 규칙).
- 내용: `SectionStack storageKey="policy"`, 섹션은 법마다 하나: `taxLaw`, `investLaw`. 나중 정책은 같은 모양의 섹션을 하나씩 더한다 (빈 자리·"준비 중" 칸은 그리지 않는다).
- 맨 위 한 줄(섹션 밖): `금융가 비율 NN%` + 2-44와 같은 저택|금융가 비율 막대 (내 왕국). 모든 조건이 이 값 하나를 쓴다.
- 예산 단계(세금·국영 임금·연구비)는 **재정 창에 둔다 (추천).** 단계 버튼은 2-30 미리보기 숫자와 붙어 있어야 효과가 보이고, 빅토리아3도 세금 수준·정부 임금은 예산 화면, 법은 법 화면이다. 정책 창 맨 아래에 한 줄 `예산 단계  세금 3 · 임금 3 · 연구 3  ↗` (읽기 전용 칩, ↗ 누르면 `showWindow('finance')`). 사용자가 옮기기를 원하면 2-30 표째 옮긴다 (사용자 결정, DECISIONS에 올리지 않음: 화면 배치라서).

#### 2-45-2. 법 섹션 하나의 모양 (공통 컴포넌트 `LawPicker`)
- 행 = 선택지 하나. 칸: 이름 · 조건 숫자 `≥ NN%` (조건 없으면 비움) · 상태.
- 상태 넷:
  | 상태 | 모양 | 누르면 |
  |---|---|---|
  | 지금 법 | `aria-pressed=true`, 채운 배경 | 전환 중이면 전환 취소, 아니면 없음 |
  | 전환 중 (목표) | 테두리 accent + 행 바닥 진행 막대 `(tick − startTick) / (endTick − startTick)` + `n일` | 없음 |
  | 고를 수 있음 | 보통 버튼 | 전환 시작 (명령) |
  | 조건 미달 | `disabled`, 조건 숫자를 `neg` 색 | 없음 |
- 전환 중에는 다른 선택지를 모두 `disabled`로 둔다 (취소만 된다). 전환 중에는 지금 법이 그대로 적용된다 (7-18).
- 조건 미달 툴팁: `금융가 NN% / 필요 NN%`. 세법 선택지 툴팁: 그 법의 세율 (`taxRates(k, law)`: 토지세 = 소작농 1인당 ƒ, 인두세 = 1인당 ƒ, 소득세 = %).
- 확인 창은 두지 않는다 (전환 중 취소가 되므로).

#### 2-45-3. 세법
- 선택지: `토지세 / Land tax`, `인두세 / Poll tax`, `소득세 / Income tax`. 시작은 토지세. 조건은 sim이 준다 (예 인두세 30%, 소득세 60%, 비교로 정함 — 화면에 숫자를 박지 않는다). 순서 상관없이 조건만 맞으면 고른다.
- **지금 할 수 있는 것:** 창을 만들고 `FinancePanel.tsx` 20의 `select`와 세율 문구를 이 섹션으로 옮긴다. 지금 sim은 `TaxLaw = 'land' | 'capita'` 둘이고 전환 없이 바로 바뀐다: 두 행 모두 "고를 수 있음", 조건 칸 비움. 3장 필드가 들어오면 세 행·조건·진행 막대로 바꾼다.
- 재정 창 20행에는 세법 칩 하나만 남긴다 (`토지세` + 전환 중이면 작은 진행 막대, 누르면 `showWindow('policy')`).

#### 2-45-4. 투자법 (금융가 지분을 살 수 있는 사람, sim 쪽 필요)
- 선택지 넷 (넓어지는 순): `귀족만 / Nobles only` (시작) → `상층 평민까지 / + Upper commoners` (전문가) → `중층까지 / + Middle` (기술자) → `하층까지 / + Lower` (노동자·농부). 행 툴팁에 포함 직종 아이콘.
- 넓히는 쪽은 조건(금융가 비율 ≥ 그 행의 값)이 맞아야 하고, 좁히는 쪽은 조건 없이 된다. 둘 다 6개월 전환.
- 조건 숫자는 행마다 `≥ NN%`, 위의 지금 비율과 비교된다 (값은 비교 실행으로 정함, sim이 준다).
- sim에 들어오기 전에는 섹션을 그리지 않는다.

#### 2-45-5. 소식
- 전환이 끝나면 sim 알림(3장 `lawChanged`)을 소식에 띄운다: `세법: 인두세` 처럼 라벨+이름. 누르면 정책 창 (`eventDestination.ts`에 `policy` 목적지).
- 문자열: `policy` 정책 / Policies, `taxLawTitle` 세법 / Tax law, `investLaw` 투자법 / Investment law, `landTax`·`pollTax`·`incomeTax`(있는 것 재사용), `investNobles`·`investUpper`·`investMiddle`·`investLower`, `budgetSteps` 예산 단계 / Budget levels, `financeShare`(2-44).

### 2-46. 지역 창 하나로: 개요·인구·건물 (사용자 요청 2026-10-21)
**사용자 말:** 지역 개요 창과 지역 건물 창을 합친다.

**지금:** `App.tsx` 200이 `RegionPanel`을 `mode` 셋(`overview`·`market`·`industry`)으로 세 창에 띄운다. 창마다 같은 머리(`RegionPanel.tsx` 88~124: 이름·작황·특산·지표 6칸)가 반복된다. 개요 창은 `RegionExplorer`(43줄)와 "지역 건물 전체 보기" 링크(122), 건물 창은 2-42 목록. `RegionPanel`에는 `!mode`일 때 쓰는 탭 줄(127~131)이 이미 있지만 쓰이지 않는다.

**바꿀 것**
- 창 `overview`·`industry`를 `region` 하나로 (`WindowId`에서 둘을 빼고 `'region'`, 제목 = 지역 이름, 아이콘 `MapPin`). 시세 창은 지역 창에서 떼어 따로 둔다 (2-47). localStorage의 창 위치(`rects`)는 `industry` 것을 `region`으로 한 번 옮긴다.
- 창 머리 (모든 탭 공통, 한 줄): 지역 그림 · 이름 · `HarvestBadge` · 특산 칩 · 왕국 색 점. 지표 6칸(103~121)은 개요 탭으로 내린다.
- 탭 셋 (`role="tablist"`, ←/→로 이동, 고른 탭은 localStorage `region-tab`):
  1. **개요**: 지표 6칸(생활수준·인구·1인당 부·노동자 부·실업·교육, 지금 막대 그대로) + `RegionExplorer`의 땅·원 그림(`RegionCircles`). 건물 종류 요약(RegionExplorer 16의 `groups`)과 "지역 건물 전체 보기" 링크(122)는 지운다 (건물 탭이 같은 창에 있다).
  2. **인구**: 직종별 인구 막대(`ClassDonut` 또는 RegionExplorer의 직종 줄) + 그 지역으로 고정한 `PopTable` (지역 필터를 잠근다). 직종을 누르면 같은 탭에서 표를 그 직종으로 거른다. 지금 `openPops`(`App.tsx` 112)는 통계 창으로 가는데, 이 탭으로 바꾼다.
  3. **건물**: 2-42 전부 (종류별 행, 전체/민영/국영 상세, `+ 새 건물`, 소유 건물 두 행 → 2-32 표). 탭 이름 옆 숫자는 종류 수.
- 여는 길:
  - 지도 클릭(`selectRegion`, `App.tsx` 111): `region` 창을 열고 **탭은 그대로** (처음엔 `건물`, 2-0-1 유지).
  - 건물 링크·소식의 건물(`openBuilding` 113, 117): `건물` 탭 + 그 건물 상세.
  - 직종 링크(`openPops` 112): `인구` 탭.
- `RegionPanel`의 `mode` prop, `onViewBuildings`, `region-buildings-link`(122), 머리 문구(123)를 지운다. 2-32 "보여줄 곳 2"는 이미 2-42로 대체됐고 2-42는 이 창의 건물 탭이 된다.
- 문자열: `regionTabOverview` 개요 / Overview, `regionTabPeople` 인구 / People, `regionTabBuildings` 건물 / Buildings. 쓰지 않게 되는 `'지역 개요'`·`'지역 건물'`·`'지역 건물 전체 보기'` 인라인 문자열(`App.tsx` 200, `RegionPanel.tsx` 122·128)은 지운다.
- sim 변경 없음.

### 2-47. 시세 창: 전체 / 왕국 / 지역 고르기 (사용자 요청 2026-10-21)
**사용자 말:** 시세 창에서 전체(왕국/세계 평균)와 각 지역을 빨리 고른다. 마지막 고른 것을 기억한다.

**지금:** 시세 창 = `RegionPanel mode='market'` (`App.tsx` 200), 표는 `r.market[g]` (`RegionPanel.tsx` 76 근처). 보는 지역은 앱 전체의 `regionId`(`App.tsx` 66)라 지도에서 지역을 누르면 열린 시세 창도 말없이 그 지역으로 바뀐다. 2-0-1에서 지도 클릭이 시세 창을 열지 않게 했던 것과 같은 이유로, 시세 창은 지도 선택을 따라가지 않게 한다.

**바꿀 것**
- 시세 창은 자기 범위 상태를 가진다: `scope: 'world' | 'kingdom' | regionId`. `App.tsx`의 `regionId`와 상관없다. localStorage `market-scope`에 기억 (try/catch, 없는 지역이면 `world`).
- 창 맨 위 칩 줄 (`role="radiogroup"`): `세계` · `왕국` · 가는 세로선 · 지역 7개(내 왕국 지역 먼저, 이름 앞에 왕국 색 점). ←/→로 이동, Home = 세계. 좁으면 가로 스크롤 한 줄 (줄바꿈 금지).
- 칩 줄 오른쪽 `⌖` 아이콘 버튼 하나: 지도에서 고른 지역으로 범위를 맞춘다 (툴팁 `지도 선택 지역`). 따라가기는 이 버튼으로만 한다.
- 모으는 셈 (client 순수 함수 `marketOf(world, scope)`, sim 변경 없음): 범위 지역들의 `market[g]`에서 가격 = `volumeEma` 가중 평균 (합이 0이면 단순 평균), `supplyEma`·`demandEma`·`volumeEma`는 합, 기본가 대비 = 가격 ÷ `GOODS[g].basePrice`. `왕국` = 내 왕국 지역들.
- 상세(상품 하나): 지역 범위면 지금 상세 그대로. `세계`·`왕국`이면 범위 안 지역별 가격 막대 (지역 이름 · 가격 · 기본가 대비 막대, 비싼 순)를 더한다. 추이 차트는 세계면 `metrics[].goods[g].ratio`(30일), 그 밖은 지금 쓰는 값.
- 창 머리의 지역 지표 6칸(`RegionPanel.tsx` 103~121)은 시세 창에서 뺀다 (2-46에서 지역 창으로 감). 창 제목은 `시세 · {범위 이름}`.
- `selectGood`(`App.tsx` 122)는 지금처럼 시세 창을 열고 상품만 바꾼다. 범위는 바꾸지 않는다.
- 문자열: `scopeWorld` 세계 / World, `scopeKingdom`(2-44와 같이 씀), `followMap` 지도 선택 지역 / Selected region.
- sim 변경 없음.

### 2-48. 연구 트리: 선행 관계 그래프 + 무엇이 열리는지 (사용자 요청 2026-10-21)
**사용자 말:** 단계 열이 아니라 진짜 트리. 노드에 비용·진행·상태, 선행 기술로 가는 선, 끌기·확대, 지금 연구 강조. 노드에 마우스를 올리면 정확히 무엇이 열리는지(방식: 건물·방식 이름, 레벨당 일자리·원료·산출, 이익률 / 새 건물 / 정책). 사전 항목으로 잇는다.

**지금:** `CompanyPanel.tsx` 561~590 `Research`: 비용(`x.cost`)별 단계 열, 선행은 `← 이름` 글자(578), 버튼 `연구`/`중지`.

**데이터 (sim에 이미 있음)**
- `TECHS` (`data.ts` 87~110, 17개, `requires: string[]`), `me.research.{known, current, progress, budget}`, `researchableTechs(me)` (`economy.ts` 237).
- 열리는 방식: `BUILDINGS`의 방식 중 `m.tech === techId` (`types.ts` 93). 레벨당 하루 값: `m.workers`(직종별 인원), `m.inputs`, `m.outputs`. 이익률: `methodMarginAtBase(typeId, m.id).margin` (`encyclopedia.ts` 125, index에서 export됨).
- 새 건물: 그 종류의 방식이 모두 `tech`를 가지고 그중 하나가 이 기술 (`canBuildType`, `economy.ts` 233와 같은 뜻). 이미 다른 방식 기술을 알면 "새 건물" 표시 없이 방식만.
- 정책: 아직 기술로 열리는 정책이 없다. 칸은 sim 함수가 빈 배열을 줄 때 그리지 않는다.
- **sim 쪽 필요 (3장):** `unlocksOf(techId)` → `{ methods: { typeId, methodId }[]; buildings: string[]; policies: string[] }` 한 곳에서 셈하게 (사전과 같이 씀). 들어오기 전에는 위 규칙으로 client에서 셈해도 된다 (함수 하나로 두고 나중에 바꾼다).

**그래프**
- 배치 (client, 한 번 계산해 메모): 열 = 뿌리에서 가장 긴 선행 경로 길이(`requires` 없으면 0). 열 안 순서 = 선행 노드 세로 위치 평균(교차를 줄이는 barycenter 2회). 노드 160×56, 열 간격 80, 행 간격 16. 왼쪽 → 오른쪽.
- 선: 선행 → 기술, SVG 곡선 (노드 뒤). 둘 다 앎 = 실선 muted, 그 밖 = 점선. 마우스를 올린 노드의 선행 경로 전체를 accent로.
- 노드: 이름 · `ƒ비용` · 남은 일 수(`budget>0`일 때, 지금 578의 셈) · 진행 막대(`progress / cost`, 0이면 없음). 상태 넷:
  | 상태 | 조건 | 모양 |
  |---|---|---|
  | 앎 | `known` | 채운 muted 배경, 체크 아이콘 |
  | 연구 중 | `current` | accent 테두리 2px + 진행 막대 accent, 창을 열면 이 노드가 가운데 |
  | 가능 | `researchableTechs` | 보통 |
  | 잠김 | 그 밖 | 흐리게(opacity .5), 점선 테두리 |
- 조작: 끌기 = 이동, 휠 = 확대(50~150%, 마우스 위치 기준), 머리 오른쪽 `맞춤` 버튼. 키보드: Tab으로 노드 이동(열 순서), Enter = 아래 동작, `+`/`-` 확대, `0` 맞춤. 위치·배율은 localStorage `research-view`.
- 누르기: 노드를 고르면 창 아래 띠(고정 높이)에 그 기술의 열리는 것 목록 + 버튼 (`가능` → `연구`, `연구 중` → `중지`, 명령은 지금과 같은 `setResearch`). 노드 안에 버튼을 두지 않는다.
- 맨 위 일일 연구비 줄(567)은 그대로.

**올렸을 때 툴팁 (= 아래 띠와 같은 내용)**
- 방식 한 줄씩: 건물 그림 · `건물 이름 · 방식 이름` · 이익률 `NN%` · 레벨당 일자리(직종 아이콘 + 인원) · 원료 → 산출 (상품 아이콘 + 하루 양). 숫자는 `NumericValue`. 같은 건물의 지금 방식보다 나은지 비교는 넣지 않는다.
- 새 건물 줄: `새 건물` 칩 + 건물 이름.
- 정책 줄 (생기면): `정책` 칩 + 이름.
- 오른쪽 위 `?` 링크: 규칙 사전 `encyclopedia/#tech` (항목 id `tech`, `encyclopedia.ts` 476). 방식 줄의 건물 이름 링크는 `#buildings`. 2-40처럼 지금은 단독 앱으로 새 탭.
- 연구 창 기본 크기를 키운다 (`WindowWorkspace.tsx` 56 최소 너비 분기에 `research` 640).
- 문자열: `fitView` 맞춤 / Fit, `newBuilding` 새 건물 / New building, `unlockPolicy` 정책 / Policy. 지울 것: `T.stage` (단계 머리, 569)를 다른 곳에서 안 쓰면.
- sim 변경 없음 (unlocksOf는 있으면 좋음).


### 2-49. 철거 중인 건물이 무엇을 하고 있는지 보이기 (사용자 요청 2026-10-21)
**문제:** 철거를 걸면 `철거 중 N레벨` 글자 칩(`RegionPanel.tsx` 191, `ResourceInspector.tsx` 31·70)과 정적인 막대(31)만 보인다. 언제 한 레벨이 헐리는지, 몇 레벨이 남는지, 자재가 어디로 가는지 알 수 없다.

**sim 규칙 (지금 코드)**
- 철거 대기 `b.shrinking`: 주간 처리(`w.tick % 7 === 0`, `tick.ts` 61·106 `progressDemolition`)마다 1레벨씩 헐린다. 다음 철거까지 남은 날 = `7 − (w.tick % 7)` (0이면 7).
- 헐린 레벨 자재의 `TUNE.salvageShare`(50%)가 `w.salvage`에 들어가 `TUNE.salvageDays`(28일) 동안 그 지역 시장에 매일 같은 양씩 나온다 (`{regionId, good, q, days, companyId, ownerId}`). 못 판 몫은 사라진다.
- 레벨이 0이 되면 건물이 없어진다 (소식 "철거 완료"). 취소(`cancelDemolish`)는 남은 대기 전부를 없앤다.

**보일 것**
1. **레벨 막대 (건물 상세, 지역 건물 행):** 비율 막대: 남는 레벨(보통 색) | 철거 대기(빗금, 천천히 흐르는 줄무늬) | 이번 주 헐릴 1레벨(점점 옅어짐). 숫자 `10 → 6`.
2. **다음 철거까지:** 7일 주기 진행 막대와 `n일`. 한 레벨이 헐리는 순간 막대가 한 칸 줄어드는 짧은 전환(0.3초).
3. **회수 자재:** `w.salvage` 중 그 건물 몫을 상품 아이콘 + 남은 양 + 남은 날 `목재 1.2만 · 21일`, 옆에 남은 날/28 작은 막대.
4. **목록 아이콘:** 지역 건물 행(2-42)과 지도 지역 아이콘에 작은 망치 아이콘 + 남은 철거 레벨 수.
5. **조작:** 막대 옆에 `철거 취소` 버튼(지금 있음). 누르면 빗금 칸이 사라지는 전환.
6. **소식:** 철거 시작·완료만 소식에 남기고, 한 레벨씩의 진행은 막대로만.
- 설명 문구 금지 (숫자·막대·아이콘). `prefers-reduced-motion`이면 애니메이션 끔. 다크 모드에서 빗금 대비 확인.
- sim 쪽 필요(선택): 회수 자재 lot에 `buildingId`, `salvageOf(w, b)` export (지금은 `companyId`·`regionId`로 거르면 되지만 같은 지역 다른 건물 철거와 섞일 수 있다) → 3장.


### 2-50. 저택·금융가에는 가동률·원료 충족을 보이지 않는다 (사용자 2026-10-21)
- 저택(`manor`)과 금융가(`finance`) 건물 상세·목록에서 가동률 막대·손잡이와 원료 충족(`inputFill`) 표시를 모두 없앤다. sim에서 둘 다 늘 100%로 고정이다 (DECISIONS 7-19).
- 대신 보이는 것: 자리 충원 `앉은 인원 / 자리` 막대(저택은 상급·하급 귀족 두 줄, 금융가는 전문가 직원), 금고 금액, 주간 수입(2-32).
- 고칠 곳: 건물 상세(`ResourceInspector.tsx` BuildingInspector)와 지역 건물 목록에서 `BUILDING_BY_ID[b.typeId].ownership`인 건물은 가동률·원료 줄을 그리지 않는다.

### 2-51. 투입·산출 표시 다시 설계 (사용자 요청 2026-10-21: "투입·산출 지금 조잡함")
**문제 (2026-10-21 main 기준).** 투입·산출이 여러 곳에서 서로 다른 모양·단위·분모로 나온다.

| 곳 | file:line | 지금 | 문제 |
|---|---|---|---|
| 건물 상세 레시피 | `ResourceInspector.tsx` 24~27 `bag`, 33 `.recipe` | 방식 레시피 × 레벨 (`method.inputs[g] × b.level`), 아이콘 32 + 이름 + 숫자 | 실제 양이 아니다 (가동률·충원·기상·효율·원료 충족 무시). 단가·금액 없음. 원료 충족은 32행 지표 줄에 따로. 행정청·학교·사무소의 `service-output` 세 줄이 같은 칸에 섞인다 |
| 상품 상세의 생산/소비 건물 | `ResourceInspector.tsx` 50~52·71 | `방식 × 레벨` + "기준 / 일" | 같은 이름의 양이 건물 상세·내 건물 표와 다르다 |
| 내 건물 행 요약 | `CompanyPanel.tsx` 329~333 | 원료 막대 + 산출 막대 `cur/max` | 산출 분모 `outMax = 방식 × level × utilization`(66)은 충원·기상·효율을 빼서, 막대가 효율(경험·규모·지역 특성)과 충원을 섞어 보인다. 효율이 1을 넘으면 100%를 넘는다 |
| 내 건물 펼침 표 | `CompanyPanel.tsx` 43~77 `rowOf`, 356~387 | 5열 표: 아이콘·이름·`qty/qty` 막대·`ƒ단가`·금액 | 투입 분모(56) = `방식 × run × crew` (기상 빠짐), 산출 분모 = `방식 × run` (충원 빠짐). 둘이 다른 기준. 사무소 줄은 단가 `—`, 금액 `ƒ0`. 세금 한도는 글 한 줄(368) |
| 방식 고르기 | `CompanyPanel.tsx` 421~428 `<select>` | 옵션 글 `이름 +ƒ…/일` | 무엇이 들어가고 나오는지 비교할 수 없다. `estimateMethod`는 1레벨 값인데 그대로 보인다 |
| 건설 카드 | `CompanyPanel.tsx` 24~28 `Bag`, 537 | 1레벨 레시피, 아이콘 16 인라인, `→` | 1레벨 값이라 건물 상세(×레벨)와 단위가 다르다. 단가 없음 |
| 규칙 사전 | `packages/encyclopedia/src/components/ExampleView.tsx` 9~10, `strings.ts` 11 | 라벨 "입력" | 게임 라벨 "투입"과 다르다 |

**바꿀 것: 컴포넌트 하나 `FlowRow` (새 파일 `views/FlowRow.tsx`)를 모든 곳에서 쓴다.**
```
[투입 아이콘 + 양]…  ─▶  [건물 아이콘 ×레벨]  ─▶  [산출 아이콘 + 양]…     이익률
 ƒ단가 · 금액                                     ƒ단가 · 금액
 ▔▔▔▔ 충족 막대                                    ▔▔▔▔ 판매 막대
```
- 칩 하나 = 상품 하나: 아이콘(상세 32 px, 행 24 px), 아래에 하루 양(굵게), 그 아래 `ƒ단가 · 금액`(작게), 맨 아래 3 px 막대. 투입은 왼쪽, 산출은 오른쪽, 가운데 건물 아이콘 + `×레벨`. 화살표 두 개만. "투입"/"산출" 글 머리는 넣지 않는다 (화살표 방향으로 읽힌다, 툴팁에만 `T.hInputs`·`T.hOutput`).
- 오른쪽 끝에 이익률 칩 하나 (`pos`/`neg` 색). 손익 폭포(`Waterfall`)는 펼침 표에만 그대로 둔다.
- 칩을 누르면 지금처럼 상품 상세(`onGood`)로 간다.
- 상품이 없는 건물은 산출 칩 자리에 서비스 칩 하나: 행정청 = 세금 한도(`method.taxCapacity × b.level × TUNE.adminScale`, 아이콘 `admin`), 학교 = 자리(`method.seats × b.level`, 아이콘 `school`), 건축사무소 = 건설력(`b.last.points`/일, 아이콘 `builder`, 단가·금액 없음). 소작지는 산출 칩 대신 수확 칩(지금 `HarvestBadge`)만.
- 저택·금융가(`BUILDING_BY_ID[typeId].ownership`)는 `FlowRow`를 그리지 않는다 (2-50).

**숫자 (모두 그 건물 전체의 하루 값, 1레벨 값은 툴팁).**

| 칸 | 값 | sim |
|---|---|---|
| 산출 양 | `b.last.output[g]` (오늘 실제. 가동률·충원·기상·충족·효율이 다 들어간 값) | `produce` (`production.ts` 133~150) |
| 투입 양 | `method.inputs[g] × b.level × b.utilization × crewOf(b) × harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) × b.last.inputFill` (sim이 실제로 쓴 양과 같은 식) | `getMethod`, `crewOf`, `harvestFactor` (index export) |
| 단가 | `regionById(w, b.regionId).market[g].price` | |
| 금액 | 양 × 단가 (투입 `−`, 산출 `+`) | |
| 투입 막대 | 묶음 전체에 `b.last.inputFill` 하나 (sim의 충족은 투입 중 가장 모자란 것 하나로 정해진다). 칩마다는 그 상품 시장의 구매 충족 `min(1, supplyEma / demandEma)`이 0.99 아래면 빨간 점 (무엇이 모자란지) | `MarketGood.supplyEma`·`demandEma` |
| 산출 막대 | `sellThrough(region.market[g])` (그 지역 시장에서 팔리는 비율의 추정, AI 전망과 같은 값) | `sellThrough` (economy, index export) |
| 이익률 | `(b.last.revenue − b.last.inputCost − b.last.wageCost) / b.last.revenue` (매출 0이면 `—`). `methods_audit`의 이익률(20/30/40%)과 같은 정의. `estimateMethod().margin`(이익/비용)은 쓰지 않는다 | |
| 툴팁 | 1레벨 레시피(`method.inputs[g]`/`outputs[g]`), 효율 `efficiencyParts(b)`(경험·규모·지역 특성), 기상 배율, 구매 충족·판매율 % | `efficiencyParts` |

- **산출 막대에 `cur / max`를 쓰지 않는다.** "최대"는 효율 때문에 정의가 흔들린다. 덜 만드는 이유는 충원(인력 칸)·충족(투입 막대)·가동률(손잡이)에서 따로 보인다.
- 건물이 멈췄거나(`!b.active`) 대기(`b.idle`)면 양 0, 칩을 흐리게, 막대 숨김.

**반올림 (모든 곳 같게, `format.ts`).**
- 양: `qty` 하나로. 1,000 이상은 `compact`(1.2천 / 1.2k), 그 아래는 유효 숫자 2자리 정수 (87.6 → 88).
- 단가: 유효 숫자 2자리 `ƒ3.4`, `ƒ12`, `ƒ150` (지금 362·383의 `one`/`int` 혼용 정리). 금액: `money` compact.
- 비율: 정수 %.
- 값이 날마다 조금 흔들린다 (가격·충원 EMA). 주 단위 값이 필요해지면 sim 쪽 선택 요청 "건물 산출·투입 주간 평균"을 3장에 올린다 (지금은 하루 값으로 시작).

**방식 비교 (`CompanyPanel.tsx` 421~428 `<select>` 대신).**
- 방식 칩을 누르면 펼쳐지는 비교 칸: 방식마다 한 열, 지금 방식이 첫 열(테두리 강조). 줄: 투입 상품마다, 산출 상품마다, 직종별 일자리, 하루 손익, 이익률.
- 값 = `estimateMethod(world, b.regionId, b.typeId, m.id, owner.wages, owner.state)` × `b.level` (만원 가동 추정, 효율 미포함). 모든 열이 같은 기준이라 비교용이다. 일자리 = `method.workers[s] × b.level`. 양 = 레시피 × `b.level` (산출은 `× (1 + regionPerk(regionId, typeId))`, `estimateMethod`와 같게). 이익률 = 손익 / 매출.
- 지금 방식이 아닌 열은 차이를 칩으로: `+1.2천`(초록) / `−300`(빨강), 같으면 비움. 새로 생기는 상품 줄은 `+`, 없어지는 상품 줄은 `−`.
- 바꾸면 경험이 절반이 된다 (`commands.ts` 123 `exp100 *= 0.5`): 다른 열 머리에 `경험 −50%` 칩.
- 기술이 없는 방식은 열을 흐리게 + 자물쇠 + 기술 이름(툴팁). 열 머리 클릭 = `setMethod`.
- 건설 카드(537)의 방식 목록도 같은 열 비교 (값 = `estimateAfterEntry`, 1레벨이라 머리에 `×1`). 좁으면 열 대신 `FlowRow` 축소판을 줄로 쌓는다.

**고칠 곳:** `ResourceInspector.tsx` 24~27·33 (레시피 → `FlowRow`, 32의 원료 충족 지표는 투입 막대로 옮기고 지움), 71 (상품 상세의 양을 `b.last.output[g]` / 위 투입 식으로, "기준 / 일" → `T.colDaily`), `CompanyPanel.tsx` 43~77 `rowOf`(분모 정리, `Flow`에 `buyFill`·`sold` 추가), 329~333 (행 요약 = 24 px `FlowRow`), 356~387 (펼침 표 → 32 px `FlowRow`), 421~428 (방식 비교), 24~28·537 (건설 카드). 규칙 사전은 라벨만 `투입`/`산출`·`Inputs`/`Outputs`.
**문자열 (툴팁·칩):** `expDrop` `경험 −50%` / `Experience −50%`, `sold` `판매` / `Sold`, `buyFill` `구매 충족` / `Bought`, `perLevel` `1레벨` / `Per level`. 표 머리가 없어지면 `T.colUnit`·`colDaily`, `<select>`를 없애면 `optProfit`·`optOffice`·`optNeedsTech`를 지운다.
**다크 모드:** 막대는 지금 `tone="in"`/`"out"` 토큰, 빨간 점·차이 칩은 `--neg`/`--pos`. 아이콘은 2-52의 다크 모드 규칙.
**지울 것:** `Bag`(24~28), `.recipe`·`.recipe-goods`·`.flow`·`.flow-q`·`.flow-rule`·`.service-output` CSS 중 안 쓰이는 것.
- sim 변경 없음 (주간 평균 필드는 선택).

### 2-52. 아이콘 에셋을 지도와 같은 양식으로 ChatGPT에서 만들기 (사용자 요청 2026-10-21)
**목표:** 2-39의 빌린 아이콘을 모두 없애고, 2-43 지도 바탕(손으로 칠한 양피지 지도책)과 같은 그림체로 아이콘 전체를 한 번에 다시 만든다. 그림 생성은 사용자(ChatGPT), 목록·자르기·묶기·검사는 화면 작업자. 상품·건물·지역이 늘면 목록에 줄을 더하고 같은 과정을 다시 돌린다.
- **양식 결정 (추천):** 픽셀 아트(지금 v2 아틀라스)를 버리고 **잉크 윤곽 + 수채 칠 양피지 스티커** 양식으로 통일. 이유: 지도와 같은 화면에 나란히 나온다 (2-43-1의 "픽셀 아트는 지역 아이콘에만"도 이 절이 바꾼다). 굵은 짙은 갈색 잉크 윤곽이 있어야 16~24 px에서 모양이 읽히고 배경 따기가 깨끗하다. 픽셀 아트를 남기고 싶으면 과정은 같고 프롬프트의 양식 줄만 바꾼다 (사용자 결정 가능).

#### 2-52-0. 필요한 아이콘 id 전체 (2026-10-21 sim·client 기준, 69개)
sim에서 읽는 것 (`packages/sim/src/data.ts`, `types.ts`):

| 묶음 | id | 출처 |
|---|---|---|
| 상품 16 | `grain fiber timber ore fuel food cloth metal tools furniture electronics transport luxury_furniture luxury_cloth meat paper` | `GOOD_IDS` (data.ts 25) |
| 건물 20 | `subsistence manor finance farm fiber_farm ranch lumber mine coal_mine foodplant textile smelter workshop furniture paper_mill fab railway school builder admin` | `BUILDING_TYPES` (data.ts 131~282) |
| 계층 8 | `peasant farmer unskilled skilled expert gentry aristocrat capitalist` (화면 id는 `c-` 앞붙임) | `POP_CLASSES` (types.ts 29). `capitalist`는 DECISIONS 7-19로 없어질 수 있다 |
| 지역 7 | `region-1` … `region-7` (땅 모양은 2-43-0 표) | `REGIONS` (data.ts 514) |
| 기상 3 | `drought flood wildfire` (지금 그림 없음, `HarvestBadge`용) | `HARVEST_KINDS` (data.ts 461) |

client에서만 쓰는 상징 15 (`spriteAtlas.ts` 7·8행 시트, `Notifications.tsx` 25~30, `App.tsx`):
`crest royal-crown private-purse coin bell sun ev-famine ev-migrate ev-build ev-price ev-seize ev-research m-ship m-tree demolish`
- `demolish`(망치)는 2-49용 새 id. `m-wheat`·`m-mine`·`factory`·`locomotive`·`laborer`·`fuelworks`는 옛 이름 별칭이라 남겨도 된다 (sim id가 아니다). **sim id의 별칭은 0개**여야 한다.
- `furniture`는 상품(가구 더미)과 건물(가구 공방) 두 칸 (지금처럼 `family`로 가른다).

#### 2-52-1. 시트 배치 (목록에서 생성)
- 목록 파일 `packages/client/assets-src/icons.json`: `[{ id, family: 'goods'|'building'|'general', sheet, subject_ko, subject_en }]`. 프롬프트·자르기·`spriteAtlas.ts` `sheets`·검사의 유일한 원본.
- ChatGPT 한 장 = `1536×1024`(가로형) **3열 × 2행 = 6칸, 칸 512×512** (정사각. ChatGPT가 4:3 크기를 주지 않아서). 한 장에 6개라 칸마다 그림이 크고 고르게 나온다.
- 게임 아틀라스는 지금 형식 그대로 4×3칸 × 480 px (`ATLAS_CELL`·`ATLAS_COLUMNS`·`ATLAS_ROWS` 그대로). 생성 두 장(12칸) = 아틀라스 한 장.

| 아틀라스 | 칸 (순서대로, `/` = 생성 장 경계) |
|---|---|
| `goods-a` | grain fiber timber ore fuel food / cloth metal tools furniture electronics transport |
| `goods-b` | luxury_furniture luxury_cloth meat paper (+ 빈 8칸, 새 상품 자리) |
| `buildings-a` | subsistence farm fiber_farm ranch lumber mine / coal_mine foodplant textile smelter workshop furniture |
| `buildings-b` | paper_mill fab railway school builder admin / manor finance (+ 빈 4칸) |
| `people` | peasant farmer unskilled skilled expert gentry / aristocrat capitalist royal-crown private-purse crest coin |
| `places` | region-1 … region-6 / region-7 drought flood wildfire demolish bell |
| `events` | ev-famine ev-migrate ev-build ev-price ev-seize ev-research / sun m-ship m-tree (+ 빈 3칸) |

- 생성 13장. 빈 칸은 투명.

#### 2-52-2. ChatGPT 프롬프트 (붙여 넣기용, 6칸 한 장)
처음 한 장(`goods-a` 앞 6개)을 골라 둔 뒤, **같은 대화에서** 그 그림을 첨부하고 "첨부한 그림과 똑같은 양식으로"를 앞에 붙여 나머지를 만든다 (장마다 양식이 흔들리는 것을 줄인다). 지도 바탕(2-43)을 먼저 만들었다면 그것도 첨부한다. `{CELLS}`는 스크립트(2-52-4)가 목록에서 채운다.

**한국어**
```
가로 1536×1024 아이콘 시트를 그려줘. 보이지 않는 3열 × 2행 격자, 똑같은 정사각 칸 6개(각 512×512). 칸마다 아이콘 하나, 칸 가운데에 두고 칸의 가운데 70% 안에만 그려. 칸 밖으로 넘치거나 다른 아이콘과 닿으면 안 돼.
양식: 오래된 양피지 지도책에 그린 손그림 아이콘. 굵고 고른 짙은 갈색 잉크 윤곽선(모든 아이콘 같은 굵기), 안은 채도 낮은 수채 칠(황토·올리브·청회색·벽돌색), 왼쪽 위에서 오는 부드러운 빛, 정면에서 살짝 위로 본 시점. 모양은 단순하고 실루엣이 또렷해서 24픽셀로 줄여도 알아볼 수 있게. 근세(17~19세기 초) 유럽 분위기.
배경은 완전히 투명(PNG 알파). 투명이 안 되면 칸 전체를 순수한 단색 #FF00FF로 칠하고 그림에는 그 색을 쓰지 마.
글자, 숫자, 라벨, 테두리, 격자선, 바닥 그림자, 장식은 절대 넣지 마.
칸 순서 (윗줄 왼쪽부터 오른쪽, 그다음 아랫줄):
{CELLS}
```
**English**
```
A 1536x1024 landscape icon sheet. Invisible 3-column x 2-row grid of six identical square cells (512x512 each). One icon per cell, centered, drawn only inside the central 70% of its cell; nothing may cross a cell edge or touch another icon.
Style: hand-drawn icons from an old parchment atlas. Bold, even dark-brown ink outline (same stroke weight on every icon), muted watercolor fills (ochre, olive, slate blue, brick red), soft light from the top left, front view tilted slightly from above. Simple shapes with a strong silhouette that stays readable at 24 pixels. Early-modern European (17th to early 19th century) mood.
Fully transparent background (PNG alpha). If transparency is not possible, fill every cell with flat pure #FF00FF and never use that color in the art.
Absolutely no text, numbers, labels, frames, grid lines, ground shadows or decorations.
Cells, top row left to right, then bottom row:
{CELLS}
```
- `{CELLS}` 예 (`goods-a` 1장): `1) 묶은 밀 단 / a tied sheaf of wheat  2) 아마 섬유 다발 / a bundle of flax fibre  3) 통나무 더미 / a stack of logs  4) 붉은 철광석 덩이 / a lump of reddish iron ore  5) 석탄 자루 / a sack of coal  6) 빵과 치즈 바구니 / a basket of bread and cheese`.
- 피사체 줄(`subject_ko`/`subject_en`) 규칙: 상품 = 그 물건 한 무더기, 건물 = 그 건물 한 채(건물마다 지붕 색을 다르게), 계층 = 상반신 인물 한 명(옷·모자로 구분: 소작농 누더기 두건, 농부 밀짚모자와 낫, 노동자 작업모, 기술자 앞치마와 망치, 전문가 안경과 책, 하급 귀족 소박한 상의와 지팡이, 상급 귀족 깃 장식과 칼, 자본가 실크해트), 지역 = 2-43-0 표의 땅 모양을 둥근 메달 안에, 기상 = 갈라진 땅 / 넘친 강 / 불붙은 숲, 사건 = 지금 v2 그림의 뜻(굶주림 빈 그릇, 이주 보따리와 길, 건설 비계, 가격 저울, 압류 봉인된 문서, 연구 펼친 책과 컴퍼스), `demolish` = 망치와 무너진 벽돌.
- 헷갈리기 쉬운 쌍은 피사체 줄에 차이를 적는다: 농부/소작농, 하급/상급 귀족, 종이(흰 종이 묶음)/옷감(천 두루마리)/고급 옷감(자주색 비단과 금실), 가구/고급 가구(금박 장식), 고기/식료품, 목장(울타리와 소)/곡물 농장, 철광산(붉은 바위)/석탄광산(검은 더미).
- 장마다 3~4번 뽑아 고른다. 고른 원본은 `packages/client/assets-src/icons/raw/<sheet>-<1|2>.png` (보관용, 배포 안 함).

#### 2-52-3. 자르기·묶기 (`packages/client/scripts/icons/pack.py`, PIL)
1. 원본을 3×2로 나눠 512 칸 6개. 배경이 `#FF00FF`면 그 색(허용 오차 40)을 투명으로, 가장자리에 남은 분홍 1 px를 지운다.
2. 칸마다 알파 경계 상자를 찾아 **긴 변 384 px**로 같은 비율로 맞추고 480 칸 가운데에 둔다 (사방 48 px 이상 여백). 모든 아이콘 크기가 같아진다. (`ASSETS.md`의 "안쪽으로 자르지 않음"은 표시 규칙이다: 화면은 지금처럼 480 칸 전체를 그린다. 이 정규화는 묶을 때 한 번만.)
3. `icons.json` 순서로 4×3 아틀라스(1920×1440)에 넣고 `public/assets/icons/<sheet>.webp`(알파 포함, 품질 85)로 저장.
4. `public/assets/icons/manifest.json` (`{ cell, columns, rows, sheets: { name: ids[] } }`)과 `src/spriteSheets.gen.ts`(지금 `spriteAtlas.ts` 4~11의 `sheets` 대신)를 생성. `spriteAtlas.ts`는 생성 파일을 읽고 시트 이름으로 `family` 후보를 고른다 (`goods-*` = goods, `buildings-*` = building, 나머지 = general).
5. `sprites.tsx` 10의 주소를 `assets/icons/${a.file}.webp?v=<manifest 해시>`로 (지금 `.png?v=3`).
- **용량:** 시트 한 장 400KB 이하, 전체 3MB 이하 (지금 v2 png 6장 약 5MB). 넘으면 품질 80.
- 옛 그림(`*-v2.png`, `buildings-generated.png`, `buildings-grid.png`, `goods.png`, `symbols.png`, `portraits.png`, `sprite-grid-guide.png`)은 새 시트가 다 들어간 뒤 쓰는 곳이 없으면(grep) 지운다.

#### 2-52-4. 목록·프롬프트 생성과 검사 (다시 돌릴 수 있게)
- `packages/client/scripts/icons/list.ts` (tsx): sim의 `GOOD_IDS`·`BUILDING_TYPES`·`POP_CLASSES`·`REGIONS`·`HARVEST_KINDS`와 client 상징 목록(2-52-0)을 `icons.json`과 비교해 (1) 빠진 id, (2) 목록에만 있는 id, (3) 빈 칸 위치를 찍고, (4) 빠진 id로 다음 장 프롬프트(ko·en, `{CELLS}` 채움)를 출력한다. sim에 상품·건물·지역이 더해지면 이것만 돌리면 된다.
- 테스트 `test/uiRefresh.test.ts` 17~23을 바꾼다 (2-39의 별칭 방식 대체):
  - 모든 sim id(상품·건물·`c-`계층·`region-n`·기상)가 `spriteAsset`에서 null이 아니고, **별칭을 거치지 않으며**(`aliases`에 sim id 키가 없다), 같은 `family` 안에서 `(file, index)`가 서로 다르다.
  - `icons.json`의 id 집합 = sim id ∪ client 상징 (빠짐·남음 0).
  - 지역 수는 `REGIONS.length`로 센다 (7을 박지 않는다, 2-43).
- 그림 검사 `scripts/icons/check.py` (묶은 뒤 수동): 칸마다 알파가 비어 있지 않고, 칸 가장자리 8 px에 그림이 없고, 두 칸의 8×8 평균 해시가 너무 가까우면(같은 그림 복사) 경고.
- **다크 모드:** 짙은 갈색 윤곽이 어두운 바탕에 묻힌다. 그림은 그대로 두고 CSS로 `:root[data-theme="dark"] .generated-sprite { filter: drop-shadow(0 0 1px #e8dcc0) drop-shadow(0 0 1px #e8dcc0); }` (양피지색 테두리). 개발용 확인 화면(`?icons`)에 모든 id를 16·24·32·48 px로 밝은·어두운 바탕에 나란히 (id 라벨만). 2-39의 헷갈리는 쌍이 24 px에서 구분돼야 한다.
- **출처 기록:** `packages/client/public/ASSETS.md`의 "Pixel sprite atlas v2" 절을 새 절로 바꾼다: 생성 도구(ChatGPT 이미지 생성, 날짜), 프롬프트 원문 = 이 절 + `icons.json` 피사체 줄, 원본 위치, 후처리(배경 제거·384 정규화·webp 85). `docs/sprite-generation-prompts.json`은 장마다 실제로 넣은 프롬프트 원문으로 채운다. **이용 조건:** 사용자 계정에서 만든 그림이다. 공개 배포 전에 사용자가 OpenAI 이용 약관(산출물 권리·상업적 이용)을 직접 확인한다 (확인 못 함, 결정 필요).
- 끝나면 2-39는 UI_DONE으로 옮기고, `spriteAtlas.ts` 13의 sim id 별칭 8개와 `ui.tsx` 8의 농부 임시 색은 없어진다 (색 토큰 `--c-farmer`는 2-39대로 따로).
- sim 변경 없음.

### 2-53. 창 크기 조절 없앰 + 좁은 고정 창 + 통계·소식 깨짐 (사용자 요청 2026-10-21: "윈도우 창 조절하는 거 없애고 깨지는 거 해결. 통계·소식이 깨짐.")
**전제 (사용자):** 화면은 늘 1920×1080. 이 크기만 맞춘다. 창 하나는 왼쪽, 하나는 오른쪽에 동시에 두고도 가운데 지도가 다 보여야 한다. 그래서 창은 좁고 정보 밀도가 높아야 한다 (짧은 행, 작지만 읽히는 글자, 긴 목록 대신 탭, 문장 대신 숫자·막대).

**확인 방법.** 개발 서버(5199)를 1920×1080 headless Chrome으로 열어 통계·소식 창을 띄우고, 오른쪽 모서리를 왼쪽으로 끌어 **최소 너비(560px)** 로 만든 뒤 탭 8개와 `전체 보기`를 찍었다. 제안 너비 440px도 같은 방법으로 찍었다 (게임을 500배속으로 40초 돌려 3년 4월 데이터). 스크립트 `.tmp/reports/ui-shot.mjs` (Chrome DevTools 프로토콜, `node ui-shot.mjs <출력 폴더>`, 환경변수 `PROF`=임시 프로필 폴더). 스크린샷은 커밋하지 않는다.
- 최소 너비 560: `.tmp/reports/1920b/ui-trends-min-{0..7}.png`, `ui-trends-min-all.png` (0 요약, 1 인구, 2 상회, 3 왕국 재정, 4 생활수준, 5 기상, 6 순위, 7 소식)
- 440 (제안 너비, 지금 CSS 그대로): `.tmp/reports/1920b/ui-trends-w440-{0..7}.png`, `ui-trends-w440-all.png`
- 다른 창 440×1000: `.tmp/reports/1920b/ui-win440-{1..7}.png` (1 지역 개요, 2 시세, 3 지역 건물, 4 재정, 5 연구, 6 건설, 7 통계·소식). 측정값 `.tmp/reports/1920b/ui-report.json`

#### 2-53-1. 지금 무엇이 깨지는가 (1920×1080, 원인 file:line)
1. **인구 상세 표가 창 밖으로 나간다 (가장 큰 깨짐).** `.pop-table {min-width:1100px}` (`workspace.css` 243)와 `.strategy-panel .pop-table {min-width:1000px}` (`strategy.css` 66), 열 12개 (`PopTable.tsx` 17). 560 창에서 표 칸이 422px라 578px가 가로 스크롤 뒤로 숨고, 오른쪽 끝 숫자가 잘린다(`902.4k`가 `902.4l`로 보임, `min-1.png`). 높이도 `pop-directory {height:360px}` (`strategy.css` 43, 66은 280)로 고정이라 창 스크롤 안에 표 스크롤이 또 있고, 가로·세로 스크롤바가 둘 다 생긴다. `전체 보기`에서도 같다 (`min-all.png`).
2. **왼쪽 분류 줄이 너비를 먹는다.** 탐색 모드 `.information-explorer {grid-template-columns:88px minmax(0,1fr)}` (`strategy.css` 5)에 테두리·여백까지 더해 상세 칸은 창 너비 −114px다 (560→446, 440→326). 그래서 아래 3·4번이 생긴다.
3. **왕실 요약·상회 상세의 세 칸(인력/투입 부족/수지)이 좁은 칸에서 넘친다.** `.strategy-panel .hsum {grid-template-columns:repeat(3,minmax(0,1fr))}`, `.srow {grid-template-columns:60px minmax(30px,1fr) auto}` (`strategy.css` 70), `.wf-val {min-width:64px}` (`styles.css` 134). 560에서는 가운데 `투입 부족` 칸이 거의 비어 있는데 `수지` 칸은 `이익률 −896%`가 두 줄로 꺾인다 (`min-0.png`). 440에서는 수지 금액이 잘리고 창 전체에 가로 스크롤바가 생긴다 (window-body 469/438, `w440-0.png`, `w440-2.png`).
4. **상회 상세 머리:** 상회 선택 `<select>`가 배지 아래로 떨어지고, 임금 목록이 두 칸으로 꺾여 7줄이 된다 (`w440-2.png`).
5. **생활수준 그래프:** `ResponsiveContainer`는 칸 너비(437/317px)를 잘 따른다. 다만 범례 8개가 두 줄(43px)이고, `빈곤선` 글자(`Chart.tsx` 36~37, `position:'insideTopRight'`)가 오른쪽 끝 선들 위에 겹친다 (`min-4.png`). Y축 폭 52px (`Chart.tsx` 27)도 좁은 창에는 크다.
6. **소식:** 탭 제목 `소식` 아래에 `<h2>소식</h2>` (`Notifications.tsx` 53)가 한 번 더 나와 한 줄을 버린다. `.events {max-height:300px; overflow-y:auto}` (`styles.css` 448) 때문에 창 스크롤 안에 목록 스크롤이 또 있다 (스크롤 갇힘).
7. **스크롤바가 생기면 내용이 옆으로 밀린다.** `.strategy-panel .window-body {scrollbar-gutter:auto}` (`strategy.css` 57). 상회 상세처럼 내용이 길어지면 스크롤바 15px가 생기며 `탐색/전체 보기` 버튼과 표가 왼쪽으로 밀린다 (`min-0.png`와 `min-2.png` 비교).
8. **최소 높이 280** (`windowGeometry.ts` 11·13)에서는 분류 줄(279px)만으로 창이 찬다. 크기 조절을 없애면 이 경우는 사라진다.
9. **다른 창 (440×1000에서 확인):** 지역 개요·시세도 같은 88px 분류 줄(상세 326px)을 쓴다. 재정 표·연구·건설은 440에서 넘침 없음. 지역 건물은 넘침 없음. 재정의 `정보 구역 / 초기화` 줄과 구역 높이 손잡이(`workspace.css` 146)는 좁은 창에서 공간만 먹는다.

#### 2-53-2. 바꿀 동작: 크기 조절 없앰, 왼쪽·오른쪽 두 자리
- **창 크기는 사용자가 바꾸지 않는다.** 모서리·변 끌기, 최대화 버튼, 제목 줄 두 번 누르기(최대화), Enter(최대화), Shift+방향키(크기)를 모두 없앤다.
- **창 자리는 둘: 왼쪽, 오른쪽.** 모든 창이 같은 크기다.
  - 1920×1080에서 작업 영역은 1920×998 (위 띠 44 + 아래 줄 38, `strategy.css` 47·58). 지도 사각형은 스크린샷에서 x 530~1390 (860px)이다. 창이 지도를 가리지 않으려면 `8 + 너비 ≤ 530` → 너비 ≤ 522.
  - **너비 440px, 높이 982px (위아래 8px 여백)**, 왼쪽 자리 x=8, 오른쪽 자리 x=1920−8−440=1472, y=8. 지도 양옆에 82px씩 남아 가장자리 지역 이름까지 보인다. 440은 위 측정에서 재정·연구·건설·지역 건물이 이미 넘침 없이 들어가는 너비이고, 480보다 지도 여유가 두 배다.
  - 식: `slotRect(side, bounds) = {x: side==='left' ? 8 : bounds.width-8-W, y: 8, width: W, height: bounds.height-16}`, `W = Math.min(440, bounds.width-16)`. 창 종류마다 너비를 다르게 두지 않는다 (규칙 하나).
- **어느 자리에 여는가.** 창마다 기본 자리가 있다: 왼쪽 = 지역(2-46)·건설·연구·정책(2-45), 오른쪽 = 시세·재정·통계·소식. 기본 자리가 차 있고 반대쪽이 비어 있으면 반대쪽에 연다. 둘 다 차 있으면 기본 자리의 창을 닫고 그 자리에 연다. 그래서 한 번에 보이는 창은 최대 둘이다 (가려진 창이 없으니 2-34의 "버튼 = 열기/닫기"가 그대로 맞는다).
- **옮기기는 남긴다 (자리 바꾸기만).** 제목 줄을 끌다 놓으면 놓은 곳이 화면 왼쪽 절반이면 왼쪽, 오른쪽 절반이면 오른쪽 자리로 붙는다. 그 자리에 다른 창이 있으면 두 창이 자리를 바꾼다. 끄는 동안에는 창을 따라 움직여도 되지만 놓으면 반드시 자리에 붙는다. 키보드: 제목 줄에 초점이 있을 때 ←/→로 자리 바꾸기. 이유: 사용자는 크기 조절을 없애라고 했고, 어느 쪽에 둘지는 지도에서 보는 곳에 따라 달라서 남긴다. 자유 위치는 지도를 가리므로 두지 않는다.
- 자리는 닫았다 다시 열어도 기억한다 (창마다 `side`).

#### 2-53-3. 고칠 곳: 창 틀
- `WindowWorkspace.tsx`
  - 14 `maximized`, 23 `toggleMax`, 35~40 (최대화에서 끌기), 42·56의 `resizeWindow` 호출, 49 최대화 크기, 51 `onDoubleClick`, 53 Enter, 60 최대화 버튼, 64 `window-edge` 8개를 지운다. 13·59 최소화는 2-34대로 지운다.
  - 12 `rects`를 `side: Partial<Record<WindowId,'left'|'right'>>`로 바꾸고, 19 `base`·20 `rect`는 `slotRect(side[id] ?? DEFAULT_SIDE[id], bounds)`로. 27~45 끌기는 `edge==='move'`만 남기고, `end`에서 `e.clientX - areaLeft < bounds.width/2`로 자리를 정한다 (같은 자리 창과 맞바꾸기).
  - `focus`(21)·`showWindow`(`App.tsx` 63)에서 2-53-2의 "어느 자리에 여는가" 규칙을 적용한다 (그 자리 창을 `opened`에서 뺀다).
- `windowGeometry.ts` 7~15 `resizeWindow`를 지우고 `slotRect`를 넣는다. `fitWindow`(3~6)는 안 쓰면 지운다. `test/windowGeometry.test.ts`의 크기 조절 시험을 `slotRect` 시험으로 바꾼다: 1920×998 → 왼쪽 `{x:8,y:8,width:440,height:982}`, 오른쪽 `{x:1472,...}`, 그리고 두 창 사이(448~1472)가 지도 사각형(530~1390)을 덮지 않는다.
- `strategy.css` 55·82의 고정 `width/height`(460·520·600×560)와 `max-height`를 지운다 (크기는 inline style 하나). 97 `.is-maximized`, 98 `.window-edge` 규칙을 지운다. 57 `scrollbar-gutter:auto` → `stable` (2-53-1의 7번).
- **지도 위 도구를 가운데로.** 오른쪽 창이 지도 도구를 가린다: 층 버튼 `.world-map .map-layers {right:18px;top:12px}` (51), 확대 `.map-camera-tools` (52), 범례 `.map-legend` (53), `지역 목록` `.map-directory` (54)가 모두 오른쪽 위·아래(x 1592~1902)에 있다. 가운데 열(x 448~1472) 안으로 옮긴다: 층 버튼+확대를 한 줄로 위 가운데(`left:50%;transform:translateX(-50%)`), 범례를 아래 가운데. `지역 목록`은 2-46 지역 창이 같은 일을 하므로 없애는 것을 추천 (남기면 층 버튼 줄 아래 가운데).
- 문자열 (`strings.ts` 11~21, 영어 308~): `windowMaximize`·`windowRestore`·`windowMinimize`·`windowMinimizeHelp`를 지운다. `windowDragHelp`는 툴팁이라 남기되 `제목줄을 끌어 왼쪽·오른쪽 자리 바꾸기` / `Drag the title bar to switch sides`로 줄인다. `windowDockHint`(`제목줄 이동 · 모서리 크기 조절 · Esc 앞 창 닫기`)는 설명 문구라 지운다 (`dock-hint` span도).
- 2-34의 "창 크기·위치(`rects`)와 최대화는 기억한다"는 이 절로 대체된다 (자리만 기억).

#### 2-53-4. 고칠 곳: 좁은 창 공통 (모든 창, 안쪽 너비 422px = 440 − 테두리 2 − 여백 16)
- **글자:** 본문 11px, 숫자 12px, 가장 작은 라벨 10px. 지금 9px인 곳(`strategy.css` 62 `.stat-label`·`.tag-soft`, 63 `.owner-badge`, 64 `.industry-name small`, 66 `.tax-controls label`, 85 `.gauge-label`)은 10px로 올린다. 대신 행 높이·여백을 줄인다 (행 24~28px, 칸 여백 2~4px).
- **탭은 위 한 줄.** 탐색 모드의 왼쪽 분류 줄(`SectionStack.tsx` 94~97, `strategy.css` 5~10)을 창 위쪽 가로 탭으로 바꾼다: `.information-explorer {grid-template-columns:minmax(0,1fr)}`, `.explorer-rail {flex-direction:row;flex-wrap:wrap;position:sticky;top:0;z-index:2;background:var(--sheet);border-bottom:1px solid var(--rule)}`, 버튼은 `flex:1 1 auto;min-width:0;min-height:26px;padding:3px 6px;border-left:0;border-bottom:2px solid transparent`, 고른 탭은 `border-bottom-color:var(--gold)`. 꺾쇠 아이콘(`ChevronRight`, 96)은 뺀다. `.explorer-detail {border-left:0;padding-left:0}` (10). 상세 칸이 326 → 422px로 넓어진다.
  - 탭 글자는 `shortTitle`(짧게)을 쓴다. 통계·소식: `요약 · 인구 · 상회 · 왕국 · 생활 · 기상 · 순위 · 소식` / `Summary · Pops · House · Kingdoms · Living · Weather · Ranks · News` (`BottomPanel.tsx` 39~72의 각 항목에 `shortTitle`). 8개가 한 줄(약 52px씩)에 들어가고, 영어가 넘치면 두 줄로 꺾여도 된다 (`flex-wrap`). 지역 개요·시세 창도 같은 탭 모양.
  - `탐색 / 전체 보기` 전환(`SectionStack.tsx` 90~93)은 창 안에서는 없앤다 (탭만). 긴 목록 대신 탭 규칙.
- **구역 높이 손잡이 없앰.** `section-resize` (`SectionStack.tsx` 117~120, `workspace.css` 146~148)와 `section-content`의 `maxHeight`(116)·`overflow:auto`(`workspace.css` 139)를 없애 내용이 창 스크롤 하나로 흐르게 한다 (스크롤 안의 스크롤 없앰). 재정 창(`FinancePanel.tsx` 22)처럼 쌓는 창은 접기·순서는 남기고 높이만 없앤다. `정보 구역 / 초기화` 줄(102)은 접기·순서만 초기화하므로 작은 아이콘 버튼 하나로 줄인다.
- **가로 스크롤 금지.** 창 안에서 가로 스크롤이 생기면 깨진 것으로 본다. 표는 `table-layout:fixed;width:100%;min-width:0`, 칸 안 글자는 `overflow:hidden;text-overflow:ellipsis` (+`title`).
- **flex/grid 자식은 `min-width:0`.** `.hsum > *`, `.srow > *`, `.notices-head > *`, `.ev-main`, `.explorer-detail > div`.

#### 2-53-5. 고칠 곳: 통계·소식 각 탭 (422px 안에)
1. **요약 / 상회 (`CompanySummary`, `CompanyPanel.tsx` 251~280):** 좁은 창에서는 세 칸을 세로로 쌓는다. `.strategy-panel .hsum {grid-template-columns:minmax(0,1fr)}` (`strategy.css` 70). 순서는 수지 → 인력 → 투입 부족. 투입 부족이 0이면 칸 대신 머리 줄 배지(`0`)만. `.srow {grid-template-columns:72px minmax(0,1fr) 72px}`, `.wf-val {min-width:0}` (`styles.css` 134 덮어쓰기). 수지 머리 `−ƒ220.7k  이익률 −896%`는 한 줄 (`.htile-h {flex-wrap:nowrap}`, 이익률은 `white-space:nowrap`).
   - 상회 상세 머리: 배지와 상회 `<select>`를 한 줄 grid `minmax(0,1fr) auto`로, `<select> {max-width:160px}`. 임금은 2칸 grid로 고정 (`.strategy-panel .wages {grid-template-columns:repeat(2,minmax(0,1fr))}` 81은 이미 있음, 상회 상세의 임금 목록도 같은 grid).
2. **인구 (`PopTable.tsx` 17·27~28):** 12열을 422px에 넣지 않는다. 고정 2열 + 보기 칩으로 고른 숫자 4열.
   - 고정: `지역` (아래 작은 둘째 줄에 `일터 ↗` 링크), `직종` (계층 아이콘 16px + 색, 이름은 `title`).
   - 보기 칩 (필터 줄 오른쪽, `pxseg`): `생활` = 인구·생활수준·식량·충족, `소득` = 인구·부·소득·현물, `교육` = 인구·문해·증감. 정렬은 보이는 열 머리로. 칩 상태는 localStorage.
   - 열 너비: 지역 34%, 직종 28px, 숫자 4열 나머지 등분. `.pop-table {min-width:0;table-layout:fixed;width:100%}` (`workspace.css` 243·`strategy.css` 66의 `min-width:1100/1000px` 삭제).
   - 높이: `.pop-directory {height:auto}` (`strategy.css` 43·66의 360/280 삭제), 표 스크롤을 없애고 창 스크롤 하나로. 머리 줄은 `position:sticky;top:<탭 줄 높이>`.
3. **왕국 (`BottomPanel.tsx` 42 `kingdom-accounts`):** 3열이라 그대로 들어간다. `width:100%;table-layout:fixed`만.
4. **생활수준·기상 그래프 (`Chart.tsx`):** `ResponsiveContainer width="100%"`는 그대로. 부모에 `min-width:0` (`.explorer-detail > div`). `YAxis width` 52 → 34 (27), `XAxis minTickGap` 36 → 48 (26). `빈곤선` 글자는 그래프 안에 두지 않고 범례 줄 끝에 점선 표본 + `빈곤선 5`로 (36~37의 `label` 삭제, 선은 남김). 범례(`BottomPanel.tsx` 46~50)는 아이콘 14px·글자 10px·간격 2px 8px로 8개가 두 줄 안에. 높이: 생활수준 200 → 220, 기상 145 → 120 (탭이라 세로 여유가 있다, 982px 창).
5. **순위 (`BottomPanel.tsx` 55~71):** 4열. `table-layout:fixed`, 상회 칸 46%, 배지는 `max-width:100%;overflow:hidden;text-overflow:ellipsis`.
6. **소식 (`Notifications.tsx` 51~):** `<h2>{T.news}</h2>` (53) 삭제 (탭 제목과 중복). 필터 칩과 `모두 읽음`을 한 줄 (`.notices-head {flex-wrap:nowrap}`, 칩 `min-height:24px;font-size:10px`). 창 안에서는 `.events {max-height:none;overflow:visible}` (`styles.css` 448, `.bell-panel`처럼 184). 행: 아이콘 26px, 본문 11px 두 줄까지 (`-webkit-line-clamp:2`, 전체는 `title`), 메타 줄(날짜·상회 배지·지역·건물)은 `flex-wrap:nowrap;overflow:hidden`이고 상회 배지는 아이콘+짧은 이름.

#### 2-53-6. 다른 창 (같은 종류의 깨짐, 440×982 기준)
- **지역 개요 / 시세 (`RegionExplorer.tsx` 25, `RegionPanel.tsx` 133):** 같은 88px 분류 줄 → 2-53-4의 위 탭으로. 지역 개요 도넛은 상세가 넓어지므로 `.strategy-panel .explorer-detail .donut {width:154px}` (`strategy.css` 17) 그대로, 계층 줄 숫자는 한 줄.
- **재정 (`FinancePanel.tsx`):** 440에서 넘침 없음. 구역 높이 손잡이·`정보 구역` 줄만 2-53-4대로. `.strategy-panel .finance-table` 칸 여백 그대로.
- **연구·건설·지역 건물:** 넘침 없음. 2-48 연구 그래프는 이 너비(422px)에서 세로로 단계를 쌓는 모양으로 설계한다 (가로 스크롤 금지 규칙).
- **2-42·2-46·2-45·2-51처럼 앞으로 만드는 창도 422px 안쪽 너비를 기준으로 짠다.**

#### 2-53-7. 받아들임 기준
- 1920×1080에서 왼쪽 창 하나 + 오른쪽 창 하나를 열었을 때 지도 사각형(x 530~1390)이 하나도 가려지지 않는다. 층 버튼·확대·범례가 보인다.
- 모든 창·모든 탭에서 `.window-body`와 그 안의 어떤 요소도 `scrollWidth > clientWidth`가 아니다 (가로 스크롤 0). 창 밖으로 나가는 요소 0. 스크롤 영역은 창 몸통 하나뿐 (`.events`, `.pop-table-scroll`, `.section-content`에 자체 세로 스크롤 없음).
- 모서리 끌기·최대화·더블클릭이 없다. 제목 줄을 끌어 놓으면 왼쪽/오른쪽 자리에 붙는다.
- 시험: `test/windowGeometry.test.ts`에 `slotRect` 시험 (2-53-3). 화면 확인은 `.tmp/reports/ui-shot.mjs`를 고쳐(크기 끌기 부분 빼고) 각 창·탭을 찍고 `ui-report.json`의 `SCROLLX`·`OUT` 항목이 비었는지 본다. 다크 모드에서도 한 번.
- 문자열: 탭 짧은 이름 ko/en (2-53-5), 지울 것 (2-53-3). 새 설명 문구 없음.
- sim 변경 없음.

### 2-54. 레벨 주인·민영화·저택·금융가 금고 (2026-10-21, DECISIONS 7-16 1단계)
- sim 변경:
  - 레벨마다 주인이 하나다: 국가, 또는 어느 지역의 저택·금융가. 왕실 건물의 레벨은 모두 국가 것, 민간 건물의 레벨은 `Building.owners` (소유 건물 id → 레벨 수, 합 = `level`). 공사비를 낸 곳이 주인이다. "땅 건물은 저택, 부지 건물은 금융가" 규칙은 없어졌다 (다른 지역 저택이 산 레벨도 있다).
  - `Building.privateShare`, `Construction.privateShare`·`privatePaid`, `SalvageLot.ownerShare`, `Company.regionFunds`, `Kingdom.poolByRegion`, `ownerBuildingOf`, `TUNE.privateShare` 를 지웠다.
  - 저택·금융가에 금고 `Building.cash`가 생겼다 (돈 계정). 투자 풀은 없앴다. `Kingdom.investmentPool`은 화면 호환용 사본으로 남겼고 값은 그 왕국 저택·금융가 금고의 합이다.
  - 민간 공사는 저택·금융가 금고가 낸다: `Construction.funders` (소유 건물 id → 약정액). 완공 레벨은 약정 비율로 나눈다.
  - 민영화: 명령 `{ type: 'setPrivatize', buildingId, on }` (왕실 건물만, 정부 건물 제외 = `sellsShares(typeId)`), 필드 `Building.privatize?: boolean`. 켜 두면 저택·금융가가 매주 1레벨씩 사 간다. 값은 `privatizePrice(world, gov, b)` → `{ price, yearProfit }`.
  - 장부 `ledger.investment`: 왕실은 민영화 대금, 민간 상회는 레벨 주인이 채운 운영 자금 (투자 풀 유입은 없다). 라벨은 "자본 유입" / "Capital inflow".
  - 지표 `KingdomMetrics`에 `levelsManor`·`levelsFinance`(민간 레벨 중 저택·금융가 몫), `manorCash`·`financeCash`(금고 합)를 더했다. `pool` = 두 금고 합.
  - 새 export: `levelOwnersOf(world, b)` → `{ owner: 'state' | 'manor' | 'finance'; ownerBuildingId?: number; regionId?: number; levels: number }[]` (3장 요청 그대로), `treasuryFree(world, o)` (금고 − 진행 공사 약정), `privatizePrice`, `isOwnerBuilding`, `addOwnerLevels`(sim 내부용).
  - 저장 형식 8판. 옛 저장은 `migrateWorld`가 null을 돌려준다 (불러오지 않는다).
- sim 작업자가 고친 클라이언트 (컴파일 맞춤만):
  - `CompanyPanel.tsx` 299: 공사 카드의 `민간 지분` 칩(`k.privateShare`·`k.privatePaid`)을 지웠다.
  - `ResourceInspector.tsx` 30: 건물 상세의 `민간 지분` 칩(`b.privateShare`)을 지웠다.
- 화면 작업자가 할 일:
  - 2-35-0 소유 몫: `stake`를 없애고 `royal`(= `owner: 'state'`) · `manor` · `finance` 세 몫을 `levelOwnersOf`로 센다. 툴팁에 주인 지역 이름 (`regionId`).
  - 왕실 건물 상세(2-42)에 민영화 켜기 단추 (`b.privatize`). 문자열 `privatize` (2-42 표). 툴팁에 `privatizePrice` 값.
  - `strings.ts`: `investmentPool` 라벨을 "저택·금융가 금고" / "Owner treasuries"로, `ledgerLabels.investment`를 "자본 유입" / "Capital inflow"로. 안 쓰는 `privateEquity` 문자열은 지운다.
  - 저택·금융가 상세에 금고 `b.cash` 숫자.
  - 1-x·2-32·2-35 본문 중 `privateShare`·`ownerBuildingOf`·투자 풀 설명은 이 절이 대신한다.

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- **2-49 (선택):** 회수 자재 lot에 `buildingId`를 넣고 `salvageOf(w, b)` export.
- **2-35 소유 구성 (2026-10-21, 요청됨):**
  - 순수 함수 export: `ownershipOf(world, kingdomId, regionId?)` → `Record<'royal'|'stake'|'manor'|'finance', { levels, employed, jobs, profitWeek, reserve }>` (2-35-0 규칙 그대로, 지역을 주면 그 지역만). 화면·지표가 같은 계산을 쓰게 한다.
  - 지표 기록: `KingdomMetrics`에 같은 4몫의 `levels`·`employed`·`profitWeek` (30일마다). 지금 있는 `levelsState`·`levelsPrivate`는 두 몫뿐이라 2-35-5 네 층 차트를 그릴 수 없다.
- **2-44 자산 비율 (2026-10-21):** 순수 함수 `ownershipAssets(world)` → `{ kingdoms: { kingdomId, manor, finance, ratio }[]; regions: { regionId, kingdomId, manor, finance, ratio }[] }`. 자산 = 가진 레벨의 주간 산출 가치(기본가, 지분이면 × 지분) + 저택은 소작지 수확 주간 가치(기본가), 100 단위. 지역 = 주인(저택·금융가)이 있는 지역. 지표: `KingdomMetrics.assetsManor`·`assetsFinance` (30일마다). 세법·투자법 조건도 이 `ratio`를 쓰게 한다.
- **2-45 정책 창 (2026-10-21, DECISIONS 7-18·7-19):**
  - 세법: `TaxLaw = 'land' | 'poll' | 'income'` (지금 `'capita'`를 나눈다). `setTaxLaw`는 바로 바꾸지 않고 6개월 전환을 시작한다. 지금 법과 같은 값을 보내면 전환 취소.
  - 투자법: `InvestLaw = 'nobles' | 'upper' | 'middle' | 'lower'` (upper = 전문가, middle = + 기술자, lower = + 노동자·농부), 시작 `nobles`. `Command { type: 'setInvestLaw'; law: InvestLaw }`. 넓히기는 조건, 좁히기는 조건 없음, 둘 다 6개월.
  - 필드: `Kingdom.investLaw`, `Kingdom.lawChange?: { tax?: { to: TaxLaw; startTick; endTick }; invest?: { to: InvestLaw; startTick; endTick } }`.
  - 순수 함수 `policyStatus(world, kingdomId)` → `{ financeRatio; tax: LawStatus<TaxLaw>; invest: LawStatus<InvestLaw> }`, `LawStatus<L> = { current: L; pending?: { to: L; startTick; endTick }; options: { id: L; threshold: number | null; eligible: boolean }[] }`. 조건 값은 5% 단위.
  - 알림: 전환이 끝나면 `lawChanged { kingdomId, law: 'tax' | 'invest', to }` (내 왕국만 소식).
- **2-48 연구 트리 (2026-10-21, 있으면 좋음):** 순수 함수 `unlocksOf(techId)` → `{ methods: { typeId; methodId }[]; buildings: string[]; policies: string[] }` (`buildings` = 모든 방식이 기술을 요구하고 그중 하나가 이 기술인 종류). 사전도 같이 쓴다.
- **2-17 정리 (UI 반영 끝, 2026-10-21 확인):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`setResearchBudget`·`MAX_RESEARCH_BUDGET`·`Company.distressWeeks`를 더 쓰지 않는다 (grep 0건). sim은 `compat.ts`의 이 껍데기를 지워도 된다. 100배 값 사본(2-27)은 아직 지우지 않는다.
- 이미 export되는 것: `paysDividend`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`, `peasantSlots`, `disbanded`, `slots`, `harvestCondition`, `harvestLabel`, `HARVEST_KINDS`, `taxRates`, `taxCapacity`, `holdingsOf`, `levelOwnersOf`, `budgetPreview`, `reserveCap`, `hasReserve`, `weeklyOutputValue`, `creditLimit`, `isGovernment`, `crewOf`, `wealthOf`, `literacyOf`, `educationOf`
