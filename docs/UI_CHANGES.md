# UI 수정 요청 (sim 변경 반영 + 소유 구분)


화면 규칙(지금 화면이 어떻게 생겼고 무엇을 따르는가)은 [UI_DESIGN.md](UI_DESIGN.md)를 기준으로 읽는다.
이 문서는 `packages/sim` 게임 로직이 바뀐 내용과, 그에 맞춰 `packages/client` 화면을 어떻게 고쳐야 하는지 정리한 것이다.
0장은 현재 작업 목록이다. 1·2장의 상세 설계에는 부분 구현과 대체된 요구가 함께 남아 있으므로 각 절의 상태 안내와 UI_STATUS를 먼저 따른다. 화면에 다 반영되고 검증된 절은 `docs/UI_DONE.md`로 옮긴다 (원문과 확인 근거를 같이 남긴다). 절 번호(2-xx)는 옮겨도 바꾸지 않는다.


## 공통 규칙
- 화면에 설명 문구를 넣지 않는다. 아이콘, 색, 숫자, 짧은 이름만 쓴다. 툴팁은 써도 된다.
- 한국어와 영어 UI를 모두 지원한다. 문자열은 `strings.ts`의 `T`와 `lang` 방식을 따른다.
- `packages/sim`은 고치지 않는다. 필요한 export가 없으면 이 문서의 "sim 쪽 필요 사항"에 적힌 대로 요청만 한다.
- 다크 모드(`:root[data-theme="dark"]`)에서도 구분이 되어야 한다.
- 검증
  - 루트에서 `npm run typecheck`가 통과해야 한다.
  - 개발 서버는 `cd packages/client && npx vite --port 5199`로 띄운다.

## 0. 지금 할 일 — 2026-11-02

상태와 검증 범위는 [UI_STATUS.md](UI_STATUS.md). 과거 우선순위 원문은 [보관 파일](log/UI_BACKLOG_ARCHIVE_2026-10-28.md).
화면 작업자(Codex)는 사람처럼 브라우저를 쓰지는 못하지만, 2026-11-01부터 헤드리스 Edge/Chrome 스크린샷으로 화면을 확인한다 (UI_DESIGN 12장). 스크린샷으로 본 항목은 그 사실과 파일 이름을 적고, 보지 못한 항목만 "화면 미검증"을 붙여 UI_DONE으로 옮긴다. 남은 화면 검증은 맨 아래 "검증" 줄에 모은다.

### 최신 적용 기준
- 좌우 고정 두 자리/최대 두 창 규칙은 폐기. 여러 주 창 자유 이동, 창별 독립 탐색 이력.
- 대상 화면 1920×1080, 시각 테스트는 브라우저 CSS viewport 1920×1028. 창 이동 경계는 그 안에서 상단 바·도크를 뺀 workspace 실측값. 화면 외곽 해상도와 CSS viewport를 혼동하지 않는다.
- 기본 주 창 420×560 CSS px 상한, 장부형 정보 밀도. 상세는 이동·크기 조절 가능한 서브윈도우(DetailWindow)와 툴팁.

### 우선순위 (2026-11-02, main 81494a1 클라이언트 코드 대조. 끝난 절은 UI_DONE "2026-11-02 확인")
깨진 화면
- wt-batch2 main 병합 뒤: 2-87 1항 저택 주인 목록 (`manorShares` 기본 켬이라 하급 귀족이 빠지고 지분이 아니라 앉은 몫으로 보인다). 그 밖은 없음 (코드 대조 기준).

sim 변경 반영 (2026-11-05: wt-welfarefill)
0. **2-89 복지 상한 (새)**: 정책 창·예산 미리보기 복지 줄에 상한 숫자, `welfareCapDaily` × 7, 라벨과 숫자만. 복지 내역의 '평활 차이' 를 "상한으로 줄인 몫" 으로.

sim 변경 반영 (오늘 병합: wt-wagelag·wt-admin·wt-wagespeed)
1. **2-79 지역 시장 임금 표**: 지역 개요에 직종별 시장 임금·52주 평균·국영·실업 + 소작 1인 소득. 6항 국영 칸 툴팁(AI 국영 웃돈) 추가됨.
2. **2-85 일꾼 줄 1인 임금·웃돈 (새)**: `Workforce` 줄에 `wagesAt` 1인 하루 임금, AI 상회·AI 왕실 정부 건물의 웃돈 칩 `+x%`.
3. **2-75 공급 ÷ 수요**: 건설 카드 지금/+1/+5, 로그 막대·AI 문턱 눈금, 시장 창 열 교체 (sim 준비됨).
4. **2-82 부 이동**: pop 상세 `<details>` 부 이동 표 (`wealthDrivers` sim 준비됨).

사용자 요청 잔여 (절 맨 위 "2026-11-02 반영 확인" 줄만 하면 된다)
5. **2-51**: 열 방식 비교 (차이 칩·잠긴 열·머리 클릭), FlowRow 툴팁 효율·기상.
6. **2-59**: 목록 행 비용 막대, 정렬 레벨당 이익·배당, 몫 툴팁, `b.last.staffing` 읽는 곳.
7. **2-42**: 상세 머리 땅·광맥 남은 수, 대기열 지역 링크·n/40.
8. **2-32**: 보유 표 주간 이익·배당 열, 이익 정렬, 합계 행.
9. **2-67**: 무역소 `postUsable`·약정금·`tradeReserveOf` 줄, 시장 창 `Region.trade` 막대.
10. **2-48**: 연구 노드 진행 막대·남은 주, 선행 경로 강조, 툴팁 숫자, 법 줄 링크.
11. **2-49**: 지역 건물 행·지도의 망치 아이콘 + 철거 대기 레벨.
12. **2-62**: 장부 라벨 "공사 수수료"로, 사무소 수수료·이익률 툴팁, `budgetLines.fees` 빼기.
13. **2-64**: 건설 카드 산업 유형 라벨.
14. **2-55**: 금융가 펀드 1좌 가치 `Building.nav`, 인구 표 직종 고르기에서 자본가 빼기.
15. **2-83 재해 칩 (낮음)**: `quakeChance` 기본 0이라 지금은 안 보인다.

정리
16. 죽은 코드·문자열: 옛 `Research` 컴포넌트 (2-61), `Bag`·`bag` (2-51), `BuildingEconomics.tsx:28` (2-32), `expandTen`·`myHouse` (2-42-7).

sim 변경 반영 (wt-batch2: wt-manor 저택 지분 기본 켬 + wt-ig 이익집단 읽기 전용 층, main 병합 뒤)
17. **2-87 저택 지분 (wt-manor, `TUNE.manorShares` 기본 켬)**: 저택 창 주인 목록을 금융가처럼 지분 수로 (`ownershipPortfolio.ts ownershipPeople` 저택 갈래), 지분 값·수익률 한 줄, pop 창 보유 지분에 저택 지분. 고침 셋(`nobleChoice`·`manorSellCap`·`lawSteer`)은 AI 판단이라 화면에 새 값이 없다.
18. **2-88 정치 창 (낮음)**: 왕국 이익집단 6줄 (영향력·승인·기분), 투표법 라벨. 읽기 전용, 효과 없음.

sim 대기 · 결정 대기
- **2-86 목표 임금**: sim 준비됨 (2026-11-02 wt-uiapi, `marketWageTargets` `labor.ts:537`, index `index.ts:15`). 규칙은 2026-11-02 사용자가 확인했다 (DECISIONS 7-43).
- **플레이어 왕실 국영 웃돈**: 사용자 결정 대기 (DECISIONS 7-42 결정 대기 1). (b)로 정해지면 새 절. 지금 할 일 없음.
- **2-33 지도 정점 범위**: 결정 대기 (UI_STATUS). 연속 보간은 끝남.
- **2-59 주간 폭포 / 2-49 회수 자재**: sim 대기 (3장).
- **2-72 2항 인두세 부담**: 결정 대기 (05 C-2) + sim 대기 (S3).
- **2-40 규칙 사전**: 단위 G로 넘어감 (sim S6).

오버홀 단위 대기 (09 7.2)
- A 상단 바 사람 칩 4: 대기 (칩 구성 04 S6·U11 결정, 단위 P의 상단 바 폭 실측 뒤).
- B 기본 자리·도크 재편: 대기 (단위 P의 창 폭 W 420/460 실측 뒤. 장부·기록 창(D·L)도 아직 없다).
- D 장부 창: 대기 (sim S1).
- E 분해 창: 대기 (sim S2, 단위 P의 행 폭 실측).
- F 1차 효과 미리보기·배지·지연 막대: 대기 (sim S3, 미리보기 오차 X17).
- G 게임 안 사전 창: 대기 (sim S6).
- I 성공 확인·처방 추적 핀·확인 팝오버: 대기 (핀이 달릴 상단 칩(A)·분해 값(E)과 핀·표지 줄 자리(B)가 아직 없다).
- L 기록 창: 대기 (1b, sim S4·S7·S8).
- M 자동 저장·슬롯: 대기 (1b, sim S5).
- N 목표 카드·표지: 대기 (1b·1c, V1 결정·08 문서. 1a 사람 시험 전에 하지 않는다).
- P 정적 시제품: 화면 작업자 일이 아니다 (보고서 앱 `tools/reports`, Claude 쪽).

검증 (헤드리스 스크린샷, 브라우저를 열 수 있는 작업자 또는 사용자)
- 화면 미검증: 2-45 법 전환 완료/실패 사건 클릭·영어/다크 새 아이콘, 2-80·2-84 AI 웃돈 지역 화면, 소유권 혼합·극소 지분 및 기관 소멸, OwnerSummary 전 경로, 모든 서브윈도우/정렬/상세 탭·툴팁 조합, 지도 전체 레이어·에셋. 2-76 첫 언어 선택·2-68 계통도·인구/토지/교육 이력·왕국 경제·재정의 주요 헤드리스 확인 범위는 UI_STATUS의 최신 기록/스크린샷 경로를 따른다.
- 실사용 환경: 일반 Edge 최대화, Windows 배율, 브라우저 확대, 영어/다크 모드. 내장 브라우저의 강제 viewport는 사용자 실환경 검증을 대체하지 않는다.

### 메모
- sim 준비 여부: `policyStatus`, `ownershipAssets`, `unlocksOf`는 export가 있다. 1·2장 옛 문구의 "sim 대기"만으로 멈추지 말고 필드와 사용처를 확인한다.
- `budget.test.ts:85` 실패 기록은 폐기 (UI_STATUS "검증 한계").

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
  - **민간 건물**: 귀족 자리는 임금이 없다. 레벨 이익은 배당으로 저택·금융가에 가고, 거기서 지분 주인에게 간다 (2-32, 2-87).
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

### 2-32. 저택·금융가가 무엇을 가졌는지 (소유 관계 보기, 사용자 요청 2026-10-21)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 보유 표(`OwnershipBrowser.tsx:20`)에 주간 이익·주간 배당 열, 이익 정렬, 합계 행이 없다. 머리 "받은 돈 / 주"(지금 `OwnerSummary` 는 하루). `BuildingEconomics.tsx:28` 은 `:18` 의 이른 return 때문에 그려지지 않는 죽은 코드라 지운다.

> 현재 상태 (2026-10-28): 부분 구현: 소유권 바·기관 링크·보유 건물·귀족/투자자 구성을 구현했다. 추가 탐색의 화면 검증은 미완료. UI_STATUS 참조.
**문제:** 저택과 금융가가 어느 건물을 가지고 어디서 돈을 받는지 한눈에 들어오지 않는다.

**sim 규칙 (지금 코드 기준, 바뀌면 이 절을 고친다)**
- 지역마다 저택(`typeId 'manor'`) 하나, 금융가(`'finance'`) 하나가 자동으로 있다. 둘 다 그 왕국 민간 소유다.
- 같은 지역의 건물 중
  - 농지·산림·광산 땅을 쓰는 **민간** 건물 → 저택 소유 (`kind 'full'`, 배당 전부)
  - 공장 부지(`land 'plot'`)를 쓰거나 땅을 쓰지 않는 **민간** 건물 → 금융가 소유 (`'full'`)
  - **국영** 건물 중 민간 지분(`privateShare` > 0)이 있는 것 → 같은 땅 규칙으로 저택/금융가가 그 지분만큼 가진다 (`'share'`, `share` = 0..1)
  - 지분이 없는 국영 건물 → 소유 건물 없음 (목록에 없다)
  - 소작지(`subsistence`) → 저택이 지대를 받는다 (`'rent'`)
- 저택·금융가가 받은 돈(배당·지대)의 저택 20%·금융가 30%(`KEEP_SHARE`)는 그 금고(`Building.cash`)에 남고, 나머지는 지분 주인에게 지분 수대로 간다 (저택 지분은 상급·하급 귀족만, `manorShares` 1 기본, 2-87. 금융가는 먼저 성과급 10% 를 전문가 직원에게). 지분 주인이 없으면 전부 금고로.
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
- 실제 배당 필드는 들어왔다: `buildingEcon(w, b).owners[].dividendWeek` (2-59). 3번 칩은 2-59-3 주인 표가 대신하고, 1번 표의 `배당/주` 열은 2-59-5. (원문) 들어올 변경: 건물 유보 자산(2-31)이 들어오면 배당은 "이익 − 유보 적립"이 된다. 그때 표의 주간 이익 열 옆에 실제 배당을 따로 줄 수 있게 sim에서 필드를 더하고 이 절을 고친다.

### 2-33. 부·생활수준 지도는 끊기지 않는 그라데이션 (사용자 요청 2026-10-21)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 결정 대기만 남음: 정점 범위 (seed42·360일 실제 값이 첫 정점 2 아래에 몰림, UI_STATUS). 연속 보간은 됨 (`RegionMap.tsx:23~28`, 범례 `:91`). 지역 목록 점(선택 항목)은 하지 않아도 된다.
**문제:** `RegionMap.tsx` 46~52행 `WEALTH_STEPS`가 4단계라 지역 색이 뚝뚝 끊긴다 (5.9와 6.0이 전혀 다른 색, 4.1과 5.9는 같은 색).
- `wealthColor(v)`를 연속 보간으로 바꾼다. 지금 네 색을 정점으로 그대로 쓴다: 값 2 `#b8573b` → 5 `#d9a35b` → 7.5 `#a9b38a` → 11 `#5f8592` (지금 구간의 가운데 값). 범위 밖은 양 끝 색으로 고정한다.
- 보간은 RGB 직선 대신 OKLab(또는 `color-mix(in oklab, …)`)으로 해서 가운데가 탁해지지 않게 한다. 함수 하나로 만들어 막대·칩에서도 같이 쓴다.
- 정점 값은 고정이다. 지금 화면에 보이는 지역의 최소·최대로 범위를 잡지 않는다 (틱마다 색이 바뀌어 비교가 안 된다).
- 생활수준(`sol`) 레이어는 지금 부와 같은 단계를 쓰고 있다. 생활수준 값의 범위가 부와 다르면 정점 값만 따로 둔다 (`SOL_STOPS`, 색은 같게). 두 레이어의 실제 분포를 한 번 찍어 보고 대부분 지역이 가운데 두 정점 사이에 오게 정한다.
- 범례(160~162행): 칸 네 개 대신 `linear-gradient` 막대 하나, 아래 눈금은 정점 값 네 개(양 끝은 `≤2`, `≥11`처럼).
- 지역 목록 표의 부·생활수준 칸에도 같은 색을 작은 점이나 배경 띠로 쓰면 지도와 맞춰 읽기 쉽다 (선택).
- sim 변경 없음.

### 2-40. 규칙 사전 (2026-10-21, 급하지 않음)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 오버홀 단위 G(게임 안 사전 창, sim S6)로 넘어갔다. 지금 할 일 없음. 게임 안 링크는 `PolicyPanel.tsx:44` 하나.
- 데이터: `@econ/sim`의 `ENCYCLOPEDIA`(항목 79개), `ENC_CATEGORIES`(10개), `SEEN_IN`(창 이름), `fillText`, `defaultCtx`, `ENC_BUILDINGS`.
  항목 = `id, category, title{ko,en}, rule{ko,en}, formula?, params[{label, value(), unit}], example?() → {inputs, steps, result}, live?{pick, run(world, ctx)} → {rows, bars}, related, seenIn, source, design`.
  `rule`·`formula`의 `{0}`, `{1}`은 `params` 값이다 (`fillText(text, entry, format)`). 단위(`unit`): florin, pct(×100 %), x, day, week, people, pt, level, good.
- 단독 앱 `packages/encyclopedia` (Vite + React, 포트 5200, `npm run encyclopedia`): 왼쪽 분류·검색, 오른쪽 규칙·공식·값·예시·지금 게임(워커에서 도는 세계, 날짜 슬라이더·+30일·+1년·시드)·관련·보이는 곳. 테마는 CSS 변수(`:root[data-theme='dark']`), 언어 ko/en.
- 게임에 옮길 때: `src/components/*`(Sidebar, EntryView, LivePanel, Bars, Rows, ExampleView)는 작고 `@econ/sim`만 쓴다. 지금 게임 패널은 게임 화면의 `world`를 그대로 넘기면 워커가 필요 없다 (`LivePanel`의 `live.world` 자리).
- 딥링크: `…/encyclopedia/#price-formula`. 게임 창의 도움말 아이콘이 항목 id로 열면 된다. 항목의 `seenIn` 키(map, region, market, resource, pops, workforce, company, finance, alerts, charts)는 창 이름이다. 창 id와 다르면 `SEEN_IN`을 맞춰 달라고 3장에 적어 달라.
- GitHub Pages: `/econ-sim/encyclopedia/`에 함께 올린다 (`pages.yml`).

---

### 2-42. 지역 건물: 종류별 한 줄 + 전체/민영/국영 보기, 건설 통합 (사용자 요청 2026-10-21)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 2-42-1: 상세 머리에 땅·광맥 남은 수 없음. 2-42-5: 대기열 행의 지역이 글자뿐(`CompanyPanel.tsx:223`), 지역 링크와 "n/40" 합계 없음. 2-42-7: 안 쓰는 문자열 `expandTen`·`myHouse` (`strings.ts:528`·`:371`). 2-42-6 "건설 창은 대기열만"은 2-73(H, 건설 창 짓기 입구)이 대신했다 (지금 `ConstructionPanel.tsx:12` 짓기/대기열 탭이 맞다). 2-42-2~4 끝남.

> 현재 상태 (2026-10-28): 부분 구현: 종류별 그룹/필터/공사 연결은 구현. [UI_BUILDING_GROUPS_2026-10-26](log/UI_BUILDING_GROUPS_2026-10-26.md) 및 UI_STATUS의 잔여 범위를 따른다.
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
| 주간 이익 | **2-59-2가 대신한다** (`buildingEcon`: 소유 막대·수지 막대·주간 이익·레벨당·유보) | |
| 공사 | 공사가 있으면 행 바닥에 2px 진행 막대 `Σ points / Σ required` | |

- 소유 막대: **2-59-2가 대신한다** (`buildingEcon().owners`, 국가·저택·금융가 세 색). 아래 원안은 쓰지 않는다. (원안) 건물마다 레벨 × 몫을 더한다. 지금은 `royal`(국영 × `1 − privateShare`) · `stake`(국영 × `privateShare`) · `manor`/`finance`(민영 건물, `ownerBuildingOf(world, b, true)?.typeId`). 툴팁은 몫별 레벨과 %만. 국영만 있으면 왕실 색 한 칸 막대가 꽉 찬다.
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
  5. 손익 줄 (**1번의 소유 막대·지분 칩, 2번의 주간 이익·유보 막대, 5번 손익은 2-59-3이 대신한다**): 수입 · 원료 · 임금 · 이익 (`rowOf`의 `rev`·`raw`·`wage`·`profit` 합, 하루 값) + 주간 이익 `Σ profitEma × 7`.
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

### 2-48. 연구 트리: 선행 관계 그래프 + 무엇이 열리는지 (사용자 요청 2026-10-21)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 계통도 배치는 2-68이 대신했다. 남은 것: 노드에 연구 진행 막대·남은 주, 휠 확대·`0` 키·보기 저장, 마우스를 올린 노드의 선행 전체 경로 강조, 툴팁의 이익률·일자리·투입→산출, 법 줄 클릭 → 국가 창 법 탭. 현재 `ResearchPanel.tsx:49~54`.

> 현재 상태 (2026-10-28): 부분 구현/감사 필요: ResearchPanel과 unlocksOf export 존재. 그래프 이동·확대 등 상세 목표와 대조한다.
**사용자 말:** 단계 열이 아니라 진짜 트리. 노드에 비용·진행·상태, 선행 기술로 가는 선, 끌기·확대, 지금 연구 강조. 노드에 마우스를 올리면 정확히 무엇이 열리는지(방식: 건물·방식 이름, 레벨당 일자리·원료·산출, 이익률 / 새 건물 / 정책). 사전 항목으로 잇는다.

**지금:** `CompanyPanel.tsx` 561~590 `Research`: 비용(`x.cost`)별 단계 열, 선행은 `← 이름` 글자(578), 버튼 `연구`/`중지`.

**데이터 (sim에 이미 있음)**
- `TECHS` (`data.ts` 87~110, 17개, `requires: string[]`), `me.research.{known, current, progress, budget}`, `researchableTechs(me)` (`economy.ts` 237).
- 열리는 방식: `BUILDINGS`의 방식 중 `m.tech === techId` (`types.ts` 93). 레벨당 하루 값: `m.workers`(직종별 인원), `m.inputs`, `m.outputs`. 이익률: `methodMarginAtBase(typeId, m.id).margin` (`encyclopedia.ts` 125, index에서 export됨).
- 새 건물: 그 종류의 방식이 모두 `tech`를 가지고 그중 하나가 이 기술 (`canBuildType`, `economy.ts` 233와 같은 뜻). 이미 다른 방식 기술을 알면 "새 건물" 표시 없이 방식만.
- 정책 (2-56): `unlocksOf(techId).policies` (세법·투자법 선택지 id: `poll`·`income`·`upper`·`middle`·`lower`). 이름은 2-45-3·2-45-4 문자열. 빈 배열이면 줄을 그리지 않는다.
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
- 정책 줄: `정책` 칩 + 법 이름 (예 `정책 · 인두세`). 누르면 정책 창.
- 오른쪽 위 `?` 링크: 규칙 사전 `encyclopedia/#tech` (항목 id `tech`, `encyclopedia.ts` 476). 방식 줄의 건물 이름 링크는 `#buildings`. 2-40처럼 지금은 단독 앱으로 새 탭.
- 연구 창 기본 크기를 키운다 (`WindowWorkspace.tsx` 56 최소 너비 분기에 `research` 640).
- 문자열: `fitView` 맞춤 / Fit, `newBuilding` 새 건물 / New building, `unlockPolicy` 정책 / Policy. 지울 것: `T.stage` (단계 머리, 569)를 다른 곳에서 안 쓰면.
- sim 변경 없음 (unlocksOf는 있으면 좋음).


### 2-49. 철거 중인 건물이 무엇을 하고 있는지 보이기 (사용자 요청 2026-10-21)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 회수 자재는 sim 대기 (3장, `SalvageLot` 에 `buildingId` 없음). 화면 쪽 남은 것: 지역 건물 행·지도에 망치 아이콘 + 철거 대기 레벨 수 (지금 행은 글자, `RegionIndustry.tsx:59`; `demolish` 그림은 있으나 안 씀).
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


### 2-51. 투입·산출 표시 다시 설계 (사용자 요청 2026-10-21: "투입·산출 지금 조잡함")
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 열 방식 비교(차이 칩, `expDrop`, 잠긴 열, 머리 클릭으로 고르기) 없음: `CompanyPanel.tsx:302` 은 아직 `<select>`, `:312` 은 방식별 FlowRow 목록. FlowRow 툴팁에 `efficiencyParts`·기상 없음. 죽은 `Bag`(`CompanyPanel.tsx:30`)·`bag`(`ResourceInspector.tsx:35`). 사전 패키지 "입력" 라벨은 화면 작업자 범위 밖.
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
| 이익률 | `(b.last.revenue − b.last.inputCost − b.last.wageCost) / b.last.revenue` (매출 0이면 `—`). `methods_audit`의 이익률(기본 방식 20%, 단계마다 레벨당 이익 2배)과 같은 정의. `estimateMethod().margin`(이익/비용)은 쓰지 않는다 | |
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
- 바꾸면 경험이 절반이 된다 (`commands.ts` 118 `b.exp *= 0.5`): 다른 열 머리에 `경험 −50%` 칩.
- 기술이 없는 방식은 열을 흐리게 + 자물쇠 + 기술 이름(툴팁). 열 머리 클릭 = `setMethod`.
- 건설 카드(537)의 방식 목록도 같은 열 비교 (값 = `estimateAfterEntry`, 1레벨이라 머리에 `×1`). 좁으면 열 대신 `FlowRow` 축소판을 줄로 쌓는다.

**고칠 곳:** `ResourceInspector.tsx` 24~27·33 (레시피 → `FlowRow`, 32의 원료 충족 지표는 투입 막대로 옮기고 지움), 71 (상품 상세의 양을 `b.last.output[g]` / 위 투입 식으로, "기준 / 일" → `T.colDaily`), `CompanyPanel.tsx` 43~77 `rowOf`(분모 정리, `Flow`에 `buyFill`·`sold` 추가), 329~333 (행 요약 = 24 px `FlowRow`), 356~387 (펼침 표 → 32 px `FlowRow`), 421~428 (방식 비교), 24~28·537 (건설 카드). 규칙 사전은 라벨만 `투입`/`산출`·`Inputs`/`Outputs`.
**문자열 (툴팁·칩):** `expDrop` `경험 −50%` / `Experience −50%`, `sold` `판매` / `Sold`, `buyFill` `구매 충족` / `Bought`, `perLevel` `1레벨` / `Per level`. 표 머리가 없어지면 `T.colUnit`·`colDaily`, `<select>`를 없애면 `optProfit`·`optOffice`·`optNeedsTech`를 지운다.
**다크 모드:** 막대는 지금 `tone="in"`/`"out"` 토큰, 빨간 점·차이 칩은 `--neg`/`--pos`. 아이콘은 2-52의 다크 모드 규칙.
**지울 것:** `Bag`(24~28), `.recipe`·`.recipe-goods`·`.flow`·`.flow-q`·`.flow-rule`·`.service-output` CSS 중 안 쓰이는 것.
- sim 변경 없음 (주간 평균 필드는 선택).

### 2-55. 세법 셋·투자법·금융가 펀드·지대·귀족 자리 (2026-10-21, DECISIONS 7-16~7-19 2~4단계)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 펀드 1좌 가치 `Building.nav` 를 어디에도 보이지 않는다 (금융가 상세에 한 칸). 인구 표 직종 고르기에 자본가가 남아 있다 (`PopTable.tsx:40`, 자본가 계층은 없앴다).
- sim 변경:
  - 세법 `TaxLaw = 'land' | 'poll' | 'income'` (하나만). `setTaxLaw`는 바로 바꾸지 않고 `TUNE.lawDays`(180)일 전환을 시작한다. 지금 법과 같은 값을 보내면 전환 취소. 고를 수 없는 법이면 명령 오류.
  - 투자법 `InvestLaw = 'nobles' | 'upper' | 'middle' | 'lower'`, 명령 `{ type: 'setInvestLaw', law }`, 필드 `Kingdom.investLaw`, `Kingdom.lawChange?: { tax?, invest? }` (`{ to, startTick, endTick }`).
  - `policyStatus(world, kingdomId)` → `{ financeRatio, tax: LawStatus<TaxLaw>, invest: LawStatus<InvestLaw> }` (3장 요청 모양 그대로, 조건 값 `threshold` 0..1). `ownershipAssets(world)` → `{ kingdoms, regions }` 각 `{ manor, finance, ratio }` (100 단위). 지표 `KingdomMetrics.assetsManor`·`assetsFinance`·`taxLaw`·`investLaw`.
  - 금융가 = 펀드: `Pop.fund?: FundUnits` (`{id, u}` 배열 묶음, 2-58), `Building.nav` (지분 1개 값). 금융가 일꾼은 전문가 (`b.employed.expert`), 자본가 자리는 없다 (`capitalist` 타입·문자열은 남아 있지만 인구 0).
  - 지대: 수확의 5%를 바로 팔아 저택으로 (판매 대금의 몫이 아니다). 토지세는 소작농 1인당 정액이라 `harvestShares(w, r).tax`는 이제 노동 인구 1명의 하루 토지세(플로린)다.
  - 저택 상급 귀족 자리 `b.nobleSeats` (늘 있다, 경제 규모 ÷ 16,000).
  - 저장 9판.
- sim 작업자가 고친 클라이언트: `FinancePanel.tsx` 24 세법 `select` 옵션을 `land`/`poll`/`income`으로 (문자열은 있는 `T.landBased`·`T.pollTax`·`T.incomeTax`). `T.perCapita`는 안 쓰게 됐다.
- 화면 작업자가 할 일: 2-45 정책 창 (세법 셋·투자법·전환 막대·조건선은 그리지 않고 고를 수 있는지만), 2-44 자산 비율 막대 (`ownershipAssets`), 금융가 상세에 지분 값 `nav`·지분 주인(`Pop.fund`) 수, 자본가 계층을 목록에서 숨기기 (인구 0).

### 2-59. 지역 건물의 수지·지분·배당 (사용자 요청 2026-10-22)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 주간 폭포는 sim 대기 (3장 `BuildingEcon.week`). 화면 쪽 남은 것: 목록 행의 비용 막대(원료·임금·이익 SegBar), 정렬 "레벨당 이익"·"배당" (`RegionIndustry.tsx:52`), `KEEP_SHARE`·`RESERVE_SHARE` 툴팁, 상세가 아직 `b.last.staffing` 을 읽는 곳(`ResourceInspector.tsx:43`).
> **2-62-3이 고치는 부분:** 건축사무소는 `hasReserve: true`, 매출(`day.fee`)·유보·국고 몫이 있다.
**사용자 말:** "지역건물탭에 수지랑 지분이랑 뭐 그런 경제적인 부분이 가구별로 표시되어야되는데 아직안된듯". "가구별"은 건물별(행마다), 주인별(상세 표 한 줄마다)로 읽는다.

**지금 화면 (main `3faa68c`)**
- `RegionPanel.tsx` 182~196 칩: 그림, 이름, `OwnerBadge`, `×level`, 철거 대기뿐. 돈 숫자·막대가 없다. 179 정렬의 `profit`(`profitEma`)은 정렬에만 쓰고 보이지 않는다.
- `ResourceInspector.tsx` 17~37 `BuildingInspector`: 가동률·충원·원료 충족 %(32), `Workforce`(33), 기준 투입·산출(33). 매출·원료비·임금·이익·이익률·유보·주인·배당이 없다.
- 건물별 손익은 `CompanyPanel.tsx` `rowOf`(42~80)·`BuildingRow`(307~401)에만 있고 export되지 않는다.
- client는 `levelOwnersOf`·`reserveCap`·`hasReserve`·`b.reserve`를 한 번도 부르지 않는다 (grep 0건).

**이 절이 대신하는 것 (겹치는 미완료 항목)**
- 2-42-1 표의 `주간 이익` 칸과 소유 막대 설명(`royal`/`stake`/`ownerBuildingOf`, `ownerLevels` client 함수) → 아래 2-59-2.
- 2-42-2 상세 1번의 `T.privateEquity` 칩, 2번 지표 줄의 주간 이익·유보 막대, 5번 손익 줄 → 아래 2-59-3.
- 2-42-3 표의 `수입·원료·임금·이익`, `주간 이익`, `유보` 줄 → `buildingEcon` 합 (2-59-1). 나머지 줄(가동률·투입 산출·방식 등)은 2-42-3 그대로.
- 2-31 건물 패널 막대 → 2-59-3의 유보 줄. (2-35 표의 유보 막대는 2-35에 남는다.)
- 2-32 보여줄 곳 3번(`→ 저택/금융가` 칩)과 마지막 줄(실제 배당 필드) → 2-59-3 주인 표. 2-32 1번(소유 건물 창의 `holdingsOf` 표)은 그대로 남고, 그 표에 `배당/주` 열을 더할 수 있다 (2-59-5).
- 0-1의 "소유 막대는 `levelOwnersOf`로" → 이 절에서 그린다.
- 2-42의 행·상세 구조(종류마다 한 줄, `전체`/`민영`/`국영`)는 그대로 쓴다. 2-42를 아직 안 했으면 지금 칩 격자를 행 목록으로 바꾸며 같은 값을 쓴다 (건물 집합이 하나).

#### 2-59-1. sim API (wt-regionecon `2300768`, index에서 export)
- `buildingEcon(world, b): BuildingEcon` (순수 함수, 읽기만). 돈은 소수 둘째 자리. 타입 `BuildingEcon`, `OwnerShare`도 export.

| 필드 | 뜻 | 기간·단위 |
|---|---|---|
| `day.sales` | 매출 (행정청은 세금 몫 포함) | 하루(`b.last`), ƒ |
| `day.tax` | 그중 세금 몫 (행정청만, 아니면 0) | 하루 |
| `day.inputs` | 원료비 | 하루 |
| `day.wages` | 임금 (민간 건물의 소유 직종은 빠진다: 배당으로 받는다) | 하루 |
| `day.profit` | `sales − inputs − wages` | 하루 |
| `margin` | `day.profit / day.sales` 0..1, 매출 0이면 `null` | |
| `profitWeek` | `profitEma × 7` (이동평균) | 주 |
| `profitWeekPerLevel` | `profitWeek / level` | 주, 레벨당 |
| `hasReserve` | 유보 자산을 쌓는 건물인가 (정부·학교·건축사무소·소작지·저택·금융가는 false) | |
| `reserve`, `reserveCap` | 지금 유보 자산, 상한 (`hasReserve`가 false면 상한 0) | ƒ |
| `reserveWeek` | 지난 주간 정산의 유보 증감 (적자를 메웠으면 음수) | 주 |
| `dividendsWeek` | 지난 주간 정산의 배당 합. 국영은 늘 0 (이익이 국고에 남는다). 민간도 상회 운영 자금이 모자란 주는 0 | 주 |
| `owners[]` | `levelOwnersOf` 한 줄마다 `{ owner: 'state' / 'manor' / 'finance', ownerBuildingId?, regionId?, levels, share, dividendWeek }`. `share` = levels ÷ level (합 1). `dividendWeek` = 그 저택·금융가가 지난주 받은 배당 (국가 줄은 0). 소작지·저택·금융가는 빈 배열 | 주 |
| `ownerless` | 목록에 없는 곳(주인 없는 레벨 → 그 지역 금융가)으로 간 지난주 배당: 받은 건물 id → 금액 (id 0 = 그 지역에 금융가 없음) | 주 |
| `staffing` | 충원율 0..1 (`crewOf`, 지금 충원의 이동평균이라 `employed / jobs`와 다를 수 있다. 지금 `BuildingInspector` 32의 `b.last.staffing` 대신 쓴다) | |
| `employed`, `jobs` | 고용, 일자리 (노동 인구, 일자리는 가동률 반영) | 합계 |

- 상수: `RESERVE_SHARE` (0.35, 유보가 비었을 때 이익 중 적립 몫, 찰수록 0으로 준다), `KEEP_SHARE` (`{ manor: 0.2, finance: 0.3 }`, 받은 배당 중 금고에 남는 몫). 툴팁에만 쓴다.
- `b.payout`은 직접 읽지 않는다 (`buildingEcon`이 읽는다).
- 건물 집합(2-42 `전체`/`민영`/`국영`)은 건물마다 `buildingEcon`을 구해 더한다: 돈·고용·일자리·`reserve`·`reserveCap`·`reserveWeek`·`dividendsWeek`는 합, 이익률 = `Σ day.profit / Σ day.sales` (매출 0이면 "—"), 레벨당 = `Σ profitWeek / Σ level`, 충원율 = `Σ (staffing × jobs) / Σ jobs` (일자리 가중, 일자리 0이면 "—"). `owners`는 키 (`owner === 'state'`이면 `'state'`, 아니면 `ownerBuildingId`)로 모아 `levels`·`dividendWeek`를 더하고 `share` = levels ÷ Σ level로 다시 센다. `ownerless`는 받은 건물 id별 합. client 함수 하나 `sumEcon(econs: BuildingEcon[], levels: number)`로 만든다.
- 다시 구하는 때: 열려 있는 행·상세만, 주 1회(정산 다음 틱)면 된다. `day.*`만 매일 바뀐다.

#### 2-59-2. 목록 행 (주 창 420 px 상한, 0장 '최신 적용 기준'. 옛 2-53 440 px 고정 창은 폐기)
- 한 행 높이 44 px, 칸 넷: 그림 32 | 이름 칸 (유연) | 막대 칸 120 | 숫자 칸 96 (오른쪽 정렬, `tabular-nums`).

| 칸 | 위 줄 | 아래 줄 |
|---|---|---|
| 이름 | `buildingName` + `HarvestBadge` | `×{Σ level}` + 공사 `+n` + 철거 대기 (2-42-1 그대로) |
| 막대 | **소유 막대** 6 px: 주인별 너비 ∝ `levels`, 색 = 주인 종류 | **수지 막대** 6 px: 너비 100% = `Σ day.sales`, 칸 셋 `원료비 / 임금 / 이익` (`SegBar`). 적자면 이익 칸 없음 + 막대 오른쪽 끝 2 px `neg` 띠 |
| 숫자 | `profitWeek` (`signedCompactMoney`) + 작은 `/주`, 음수 `neg` | `profitWeekPerLevel` 작은 회색 + `/lv` · 유보 막대 3 px × 32 px (`reserve / reserveCap`, 100%에서 자름, `hasReserve`일 때만) |

- 소유 막대 색 토큰 (새로, `workspace.css` 160~161 옆): `--own-state` = `--royal-owner`와 같은 값, `--own-manor` 라이트 `#6d8b3a` / 다크 `#a9c46f`, `--own-finance` 라이트 `#3f6f9a` / 다크 `#82b1db`. 같은 종류 주인이 여럿(다른 지역 저택)이면 같은 색, 칸 사이 1 px 틈. 2-32·2-35-0이 정하기로 한 저택·금융가 색은 이 둘로 한다.
- 수지 막대 색: `Waterfall`(`ui.tsx` 70~73)과 같은 토큰. 원료비 `--wf-raw`, 임금 `--wf-wage`, 이익 `--good` (`styles.css` 25~27, 12). `SegBar`(`ui.tsx` 39)는 칸마다 `grow` = 금액, `value` = 1. 다크 모드에서 세 칸이 구분되는지 확인.
- 정부 건물(`isGovernment`): 수지 막대 칸 비움(매출 0), 숫자 칸 위 줄 `profitWeek`(음수 = 운영비)만, 아래 줄 비움. 소유 막대는 국가 한 색.
- 소작지·저택·금융가(`owners` 빈 배열): 소유 막대 자리 비움. 저택·금융가는 2-42-1처럼 맨 아래 두 행, 숫자 칸 위 줄 = 받는 돈 `profitWeek` `/주`, 아래 줄 금고 `b.cash` (`compactMoney`).
- 행 툴팁 (정확한 값, `money` 둘째 자리):
  - 소유 막대: 주인마다 한 줄 `국가 · 12 lv · 60% · 배당 —` / `저택 (북부) · 8 lv · 40% · 배당 ƒ1,234.56`. 주인 지역 = `regionById(regionId).name`, 같은 지역이면 생략. `ownerless`가 있으면 끝 줄 `주인 없음 → 금융가 · ƒ…`.
  - 수지 막대: `/일 · 매출 ƒ… (세금 ƒ…) · 원료비 −ƒ… · 임금 −ƒ… · 이익 ±ƒ… · 이익률 NN%`.
  - 숫자 칸: `주간 이익 ±ƒ… · 레벨당 ±ƒ… · 유보 ƒ… / ƒ… · 지난주 유보 ±ƒ… · 지난주 배당 ƒ…`.
- 정렬 (`ListTools`, 2-42-1 목록에 더함): `규모`(기본) · `이름` · `가동률` · `고용률` · `주간 이익` · `레벨당 이익`(새) · `배당`(새, `dividendsWeek`). 순서는 주마다만 다시 매긴다 (2-42-1).

#### 2-59-3. 상세 (2-42-2 상세 안, 보기 `전체`/`민영`/`국영`의 건물 집합)
위에서 아래로, 모두 라벨 + 숫자 + 막대. 2-42-2의 1·2·5번 자리.
1. **머리 소유 막대** (행과 같은 막대, 높이 10 px) + 범례 칩 `■ 국가 n lv` `■ 저택 n lv` `■ 금융가 n lv` (0인 칩은 숨김). `T.privateEquity` 칩은 없다.
2. **수지 폭포**: `Waterfall`(`ui.tsx` 60) `rev = Σ day.sales`, `raw = Σ day.inputs`, `wage = Σ day.wages`, 라벨 `T.wfRev`·`T.wfRaw`·`T.wfWage`·`T.wfProfit`. 머리 라벨 `T.balance` + 오른쪽 `이익률 NN%`. 행정청이면 매출 막대 아래 작은 줄 `세금 ƒ…` (`day.tax`).
   - **주 단위 폭포는 sim 쪽 필요** (3장): `day`는 하루 값이라 흔들린다. sim이 `week: { sales, tax, inputs, wages, profit }`(이동평균 × 7)를 더하면 라벨을 `T.balanceWeek`로 바꾸고 그 값을 쓴다. 그 전에는 `T.balance`.
3. **이익 줄**: `주간 이익 ±ƒ /주` · `레벨당 ±ƒ /lv` (칩 둘, 음수 `neg`).
4. **유보 줄** (`hasReserve`인 건물이 하나라도 있을 때): 라벨 `유보` · 막대 `Σ reserve / Σ reserveCap` (100%에서 자름) · `ƒ… / ƒ…` · 지난주 증감 `±ƒ…` (음수 `neg`). 툴팁 `적립 35%` (`RESERVE_SHARE`).
5. **주인 표** (`owners`가 있을 때. 국영 보기는 국가 한 줄):

| 열 | 값 |
|---|---|
| 주인 | 색 칩 + `국가` / `저택` / `금융가` + 다른 지역이면 지역 이름. 저택·금융가 줄을 누르면 그 소유 건물 상세(2-32)로 간다 |
| 레벨 | `levels` |
| 지분 | `share` % (정수) + 40 px 막대 |
| 배당/주 | `dividendWeek` (`money`). 국가 줄은 `—` |

   - 합계 줄: `Σ levels` · 100% · `dividendsWeek`. `ownerless` 금액이 있으면 합계 위에 줄 하나 `주인 없음 → {지역} 금융가` · — · — · 금액.
   - 배당 칸 툴팁: `금고 20%` / `금고 30%` (`KEEP_SHARE[owner]`).
   - 순서: 국가 줄 맨 위, 그다음 레벨 큰 순.
6. 소유 배지 링크(2-42-2 끝): `국영` 보기는 `OwnerBadge`, `민영`·`전체` 보기는 주인 표의 줄 링크가 대신한다 (2-32 3번 `→ 저택/금융가` 칩을 따로 두지 않는다).

#### 2-59-4. 빈 상태
- 국영 건물(`b.stateOwned`): 주인 표 국가 한 줄, 배당 `—`, 합계 배당 `—`. 수지·이익·유보는 그대로 보인다 (이익은 국고로 간다).
- 정부 건물·학교·건축사무소: 유보 줄 없음, 주인 표 국가 한 줄. 매출 0이면 폭포 대신 칩 둘 `임금 −ƒ…` `원료비 −ƒ…`.
- 첫 주 정산 전 (`dividendsWeek === 0 && reserveWeek === 0` 이고 민간 건물): 배당 칸 `—`, 증감 칩 숨김.
- 민간인데 그 주 배당 0 (운영 자금 부족, 적자)이면서 `reserveWeek ≠ 0`: `ƒ0` 그대로.
- 매출 0 (`margin === null`): 이익률 `—`, 수지 막대 빈 칸.
- 소작지·저택·금융가: 주인 표·수지 폭포 없음 (2-50). 저택·금융가는 받는 돈/주와 금고만.

#### 2-59-5. 다른 곳 (같은 함수로, 급하지 않음)
- 2-32 소유 건물 창 `holdingsOf` 표에 열 `배당/주` = `buildingEcon(w, h.building).owners.find(o => o.ownerBuildingId === 그 저택·금융가 id)?.dividendWeek`, 합계 줄 `Σ`.
- 2-35-4 왕국 건물 표의 주간 이익·유보 막대도 `buildingEcon` 값으로.

#### 2-59-6. 문자열 (ko / en)

| 키 | ko | en |
|---|---|---|
| `balanceWeek` | 수지 /주 | Balance /wk (3장 주 단위 값이 들어온 뒤) |
| `perWeek` | /주 | /wk |
| `perLevel` | /lv | /lv |
| `profitPerLevel` | 레벨당 이익 | Profit per level |
| `reserve` | 유보 | Reserve |
| `reserveChange` | 지난주 유보 | Reserve last week |
| `dividendsWeek` | 배당/주 | Dividends/wk |
| `owner` | 주인 | Owner |
| `ownerShare` | 지분 | Share |
| `ownerState` | 국가 | Crown |
| `ownerManor` | 저택 | Manor |
| `ownerFinance` | 금융가 | Finance district |
| `ownerless` | 주인 없음 | No owner |
| `keepShare` | 금고 | Kept |
| `reserveRate` | 적립 | Set aside |
| `sortPerLevel` | 레벨당 이익 | Profit/level |
| `sortDividends` | 배당 | Dividends |

- 있는 것: `T.balance`(수지 (하루) / Balance (daily): 2-59-3 폭포 머리 라벨로 그대로 쓴다), `T.perDay`, `T.share`(비율, `ClassDonut`이 쓴다: 지분은 새 키 `ownerShare`), `T.dividend`(배당), `T.wfRev`·`wfRaw`·`wfWage`·`wfProfit`, `T.margin`, `T.weeklyProfit`, `T.ownership`(2-42 표). 2-35-8의 `T.reserve`와 같은 키면 하나만 둔다.
- 지울 것: `T.privateEquity` (2-54에서 이미 지시), `RegionPanel.tsx` 179 정렬의 `owner` (2-42-7).
- 화면 규칙: 설명 문구 없음 (라벨·숫자·막대·칩, 정확한 값과 상수는 툴팁). 숫자는 주 단위(`profitWeek`·지난주 정산 값)가 기본, 하루 값은 `/일` 라벨을 붙인 폭포와 툴팁에만.
- sim 변경: `buildingEcon`은 wt-regionecon에 있다 (main 병합 전). 주 단위 폭포만 3장 요청.

### 2-61. 연구는 돈 대신 문해력 포인트 (사용자 결정 2026-10-22, DECISIONS 7-20)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 정리만 남음: 안 쓰는 옛 `Research` 컴포넌트 (`CompanyPanel.tsx:460~489`, ƒ 비용·`dailyBudget` 표시, `App.tsx:30` 에서 import 만), 문자열 `dailyBudget` (`strings.ts:554`)과 연구 장부 라벨. 연구 창(`ResearchPanel.tsx:26`·`:38` 주당 포인트·문해력·주)은 끝남.
sim 변경 (wt-research):
- 연구에 돈이 들지 않는다. 주간 연구 포인트 = `TUNE.researchBase` + `TUNE.researchPerLiteracy` × 왕국 문해력(%). 왕국 문해력은 sim export `kingdomLiteracy(world, kingdomId)`(0..1), 이번 문해력 기준 주간 포인트는 `researchPoints(world, kingdomId)`.
- `Research` = `{ points, current, progress, known }`. `points` = 지난주 쌓은 포인트(주간, 고른 기술이 없으면 0). `progress`는 포인트. `budget`은 없어졌다.
- 기술 값 `TechDef.cost`·`TECH_COST`는 포인트다 (4,500 / 9,000 / 15,000 / 26,250, 예전 연구비와 같은 비율).
- 정책 손잡이 `BUDGET_ITEMS` = `tax`·`wages`·`welfare` (연구비 없음). `BudgetLineKey`에서 `research`, `BUDGET_GROUPS`에서 연구비 묶음, `drillResearch`·`ResearchDrill`, `Kingdom.lastBudget.research`, 장부 `ledger.research`, 명령 `setResearchBudget`, `MAX_RESEARCH_BUDGET`, `TUNE.researchShare`·`researchLevels`가 없어졌다.
- 지표 `KingdomMetrics.research`(연구비) 대신 `researchPts`(지난주 포인트)와 `literacy`(왕국 문해력)가 생겼다.
- 왕실마다 시작 학교 1레벨(귀족 가정교사, 인구가 가장 많은 지역, `START_SCHOOL_LEVELS`).
- 저장 형식 14판 (13판은 `migrateWorld`가 바꾼다: 쌓인 연구비는 포인트로).

화면:
1. 재정 창(`FinancePanel.tsx`, 2-60): 연구비 묶음·단계 버튼·연구비 문자열을 지운다: `strings.ts` 43·334 (`"research"` 줄 설명), 73·364 (장부 라벨 `research`, LEDGER_KEYS에서 빠짐), 86·376 (`T.budgetLines.research`), 291·572 (`T.dailyBudget` '하루 연구비' → 주간 포인트 라벨), 68·359 (`T.adjustFinance`, 연구 창 링크를 지우면 안 쓰임). 묶음은 넷(세금 수준·국영 임금·복지·고정). 2-60의 `research` 묶음·드릴 행·문자열 `budgetGroups.research`·`drill.wanted`는 만들지 않는다 (`drillResearch`·`ResearchDrill` 없음, 2-60에서 지웠다).
2. 연구 창(`CompanyPanel.tsx` `Research`): 머리 줄에 `주간 포인트`(`me.research.points`), `문해력`(`kingdomLiteracy`, %), 진행 중 기술의 `남은 주`(⌈(값 − 진행) ÷ points⌉). 재정 창으로 가는 링크(`onFinance`)는 지운다 (연구는 재정과 상관없다). 기술 칸의 값은 `ƒ`(돈) 기호 없이 포인트로, 남은 시간은 주 단위로. 왕실 요약(156)의 `ƒ…/일`도 포인트/주로.
3. 연구 트리(2-48)·백과 링크: 기술 값은 포인트.

컴파일 맞춤으로 sim 작업자가 고친 곳 (최소한, 화면 모양은 그대로):
- `CompanyPanel.tsx` 156: `c.research.budget` → `c.research.points/7` (하루 포인트, 라벨 `T.perDay`와 `ƒ`는 그대로라 틀린 표시: 위 2번에서 고친다).
- `CompanyPanel.tsx` 567: `r.budget`(money) → `r.points/7`(int).
- `CompanyPanel.tsx` 577: 남은 일수 = ⌈남은 값 ÷ (r.points/7)⌉ (값이 맞다. 주 단위로 바꾸는 것은 2번).
- `FinancePanel.tsx` 15: `multipliers`에서 `research:TUNE.researchLevels` 칸을 지웠다. 같은 파일 17의 `'research'` 줄 필터는 컴파일되므로 남겨 두었다 (줄이 없어 빈 칸).

### 2-62. 건축사무소는 공사 수수료로 버는 국영 사업 (사용자 요청 2026-10-22)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 장부 라벨 `ledgerLabels.buildFees` 가 아직 "민간 공사 수수료"와 옛 툴팁 (`strings.ts:339`·`:308`, 영어 `:893`·`:862`). 사무소 `day.fee` 툴팁, 폭포 라벨 "공사 수수료", `officeMargin` 툴팁 없음. `budgetLines.fees` 를 빼지 않았다.
**사용자 말:** "민간 공사 수수료가 직접 국고에 들어오는 게 아니라, 건축사무소에 먼저 들어가서 원래의 수익 건물처럼 작동하고, 배당으로서 국고에 들어오게 해 주삼".

**규칙 (sim, wt-office):** 건축사무소는 모든 공사(왕실 것도)에 쓴 포인트 × 포인트당 운영비 ÷ (1 − 이익률)을 수수료로 받는다. 이익률은 방식 단계별로 목조 20%, 목재 비계 30%, 철골 40%다 (`officeMargin(methodId)`). 수수료는 사무소의 매출이고, 사무소는 다른 왕실 건물처럼 이익을 유보 자산에 쌓고 나머지는 국고 몫(배당)으로 국고에 남는다. 왕실 공사는 국고가 자기 사무소에 내므로 현금은 그대로다 (수지 표에는 `왕실 공사` 줄과 사무소 매출로 함께 보인다).

**지금 화면 (main `d34ecd0`)**
- 재정 창 수지 표: `fees`(민간 공사 수수료) 줄이 국영 임금 묶음에 있고, 건축사무소의 임금·원료는 `wages`(정부 건물 인건비)·`goods`(정부 건물 물자) 줄에 들어 있다 (2-60).
- 지역 건물 탭(2-59): 건축사무소는 매출 0, 유보 없음(`hasReserve false`), 배당 없음으로 보인다.

#### 2-62-1. sim API 바뀐 점 (index export)
- `BudgetLineKey`: **`fees` 없어짐**, 새 줄 **`build`** (왕실 공사 = 왕실 공사가 자기 사무소에 낸 수수료, 지출 −). `BUDGET_GROUPS`의 국영 임금 묶음은 `[wages, stateFirms, build]`.
  - `wages`·`goods`: 이제 행정청·학교만 (건축사무소 빠짐).
  - `stateFirms`: 왕실 생산 건물 + **건축사무소** (매출 = 공사 수수료). `drillStateFirms` 행에 `typeId: 'builder'` 행이 생긴다.
  - `build`의 자세히 보기 `drillBuild` (옛 `drillFees`·`FeesDrill` 대신 `BuildDrill`): `{ key: 'build', weekly, smoothing, stepMult, share, officeSales, rows: [{ part: 'wage'|'other', weekly }] }`. `share` = 이번 주 예상 사무소 매출 중 왕실 공사 몫 0..1 (지금 공사 목록으로 센 포인트 비율, wt-ind3. 기록이 없으면 `null`, 그때 행은 지난주 장부 한 줄), `officeSales` = 그 단계의 사무소 주간 예상 매출. 행 `wage` = 사무소 임금 몫(국영 임금 단계를 따름), `other` = 자재·이익 몫.
- `Kingdom.lastBudget`: `fees` = 사무소가 **민간** 공사에서 받은 수수료 (지표용, `firms` 안에 들어 있다). 새 `office` = 그중 건축사무소 손익, `build` = 왕실 공사. 국고 순변화 ≈ `revenue − wages − goods − interest − welfare − build + firms`.
- `buildingEcon(world, b)`: `day.fee` 새 칸 (그날 매출 중 공사 수수료, 사무소만). 사무소는 `hasReserve: true`, `reserve`·`reserveCap` 있음. 국영 건물의 `dividendsWeek` = 지난주 국고 몫(`b.payout.crown`, 유보 자산을 뺀 이익), 주인 표의 `state` 줄 `dividendWeek`도 같은 값 (예전에는 0).
- `Building.payout.crown` (국영 건물만, 지난주 국고 몫). `ConstructionEstimate.feeMult` (그 회사가 내는 돈 ÷ 사무소 운영비: 민간은 수수료 배율, 왕실 1).
- 장부 `ledger.buildFees`: 왕실은 이제 모든 공사 수수료(왕실 자기 공사 포함), `ledger.buildPaid`에 왕실 자기 공사비도 들어간다. `ledgerLabels.buildFees` 이름은 `공사 수수료`/`Construction fees`로.
  고칠 곳: `strings.ts` 73·364 `ledgerLabels.buildFees` → `공사 수수료`/`Construction fees`; 40·331 장부 툴팁 → `건축사무소가 모든 공사(왕실 공사 포함)에서 받은 수수료입니다.` / `Construction fees the crown's offices received from all projects, including the crown's own.`
- 저장 형식 15판 (14판은 `migrateWorld`가 옛 수수료 기준값만 지운다). 저장 키는 그대로 둬도 된다.
- 컴파일 수정 없음 (`FinancePanel.tsx` 17은 줄 이름을 문자열로 걸러서 `fees`가 그냥 빠진다).

#### 2-62-2. 재정 창 수지 표 (2-60-2를 고친다)
- 국영 임금 묶음 줄: `정부 건물 인건비`(wages) · `국영 사업 손익`(stateFirms) · `왕실 공사`(build). `민간 공사 수수료` 줄은 지운다.
- `stateFirms` 줄은 왕실 생산 건물이 없어도 건축사무소가 있으면 보인다 (2-60-2의 "행이 0이면 숨김" 그대로).
- `build` 줄: 값이 0이면 흐리게. 툴팁: `사무소 매출 × 왕실 몫 (share)`.
- `stateFirms` 자세히 보기(2-60-3): 건축사무소 행은 매출 칸 툴팁에 `수수료 = 운영비 ÷ (1 − 이익률)`, 이익률은 `officeMargin(b.methodId)`. 행을 누르면 그 사무소 건물 상세(2-59-3).
- `build` 자세히 보기: 칩 `단계 ×1.15` `왕실 몫 62%`(share), 줄 둘 `사무소 임금 몫` · `자재·이익 몫`. `share`가 `null`이면 칩 `—`.
- 문자열: `budgetLines.build` 왕실 공사 / Crown construction, `drill.crownShare` 왕실 몫 / Crown share, `drill.feeOther` 자재·이익 몫 / Materials and margin. `budgetLines.fees`·`drill.feeWage`는 지운다 (`drill.feeWage` 이름은 `사무소 임금 몫`으로 build 행에 다시 써도 된다).

#### 2-62-3. 지역 건물 탭·건물 상세 (2-59를 고친다)
- 건축사무소 행: 수지 막대·주간 이익·레벨당 이익·유보 막대가 이제 값이 있다 (다른 국영 건물과 같게 그린다). 매출 칸 툴팁에 `공사 수수료` (`day.fee`).
- 건물 상세 수지 폭포: 사무소는 첫 칸 이름을 `공사 수수료`로 (`day.fee === day.sales`).
- 주인 표: 국영 건물의 `국가` 줄에 `배당/주` = `dividendWeek` (국고 몫). 바닥 합계 `dividendsWeek`.
- 문자열: `econ.fee` 공사 수수료 / Construction fees, `econ.crownShare` 국고 몫 / To treasury.
### 2-64. 산업 유형 라벨과 방식 숫자 (사용자 요청 2026-10-22, DESIGN 7.1, 브랜치 wt-ind2)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 건설 카드에 산업 유형 라벨 없음 (건물 상세에는 있음 `BuildingEconomics.tsx:24`). 방식 비교의 투입·매출 줄은 2-51 열 비교와 같이 한다. 유형 칩(선택)은 하지 않아도 된다.
- 새 sim 값 (`data.ts`): 타입 `Industry = 'primary' | 'processing' | 'heavy' | 'luxury'`, `INDUSTRIES[id]` (`name` 한국어 1차 산업·가공·중공업·숙련, `nameEn` Primary·Processing·Heavy industry·Skilled crafts, 기본 일꾼 `workers`, 숙련 비율 `skillShare`, 원료/매출 범위 `inputShare`), `BuildingTypeDef.industry`, `MethodDef.industry`(방직·가구 공방의 사치품 방식만), 함수 `industryOf(typeId, methodId?)` (없으면 null: 소작지·저택·금융가·학교·건축사무소·행정청).
- 화면 요청:
  1. 건물 상세 머리와 건설 카드에 유형 라벨 한 칸 (`INDUSTRIES[industryOf(b.typeId, b.methodId)].name`). 방직·가구 공방은 방식에 따라 라벨이 바뀐다 (손베틀 = 가공, 맞춤 재단 = 숙련).
  2. 방식 비교(2-51 열 비교)에 행 하나: 원료/매출 막대 (기본가 기준 원료비 ÷ 매출, 0~1). 사전 `methods-rule` live 가 같은 값을 쓴다 (`methodMarginAtBase(typeId, methodId)`의 `input / revenue`).
  3. 지역 건물 목록·새 건물 목록에 유형으로 묶거나 거르는 칩 (선택, 급하지 않음).
  설명 문구는 넣지 않는다 (규칙은 README·사전).
- 바뀐 숫자: 가공·중공업·숙련 기본 방식 일꾼 300 (옛 400), 가공 공장 원료·산출 약 2배 (예: 식료품 곡물 1,300 → 2,600, 식료품 2,150 → 2,650), 벌목·광산 일꾼에 기술자 50, 1차 윗단계 일꾼 350·200. 공사 포인트: 식료품·가구·종이 250 → 300, 공방 200 → 300, 운송 200 → 350, 제철소 300 → 500, 기계 공장 300 → 550 (`buildPointsOf`). 화면이 숫자를 박아 두었으면 데이터에서 읽는다. 방식 id·기술 연결은 그대로.

### 2-67. 무역소 (사용자 승인 설계 2026-10-23, DESIGN 6 교역·8, 브랜치 wt-trade)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** `postUsable` 줄, 건설 카드의 약정금 줄(`tradeEscrowPerLevel`), `tradeReserveOf` 행, 시장 창의 `Region.trade` 사고/끊김 막대·마진 (클라이언트가 `Region.trade` 를 읽지 않는다), 흐름이 없을 때 "–" 없음. 무역소 금고 대 `postCap` 막대는 됨 (`BuildingEconomics.tsx:26`).
- 바뀐 sim:
  - 상인(`w.traders.cash` 1억, `capital`)이 없어졌다. `w.traders.cash`·`capital`은 늘 0 (저장 모양 때문에 칸만 남았다). `world.ts TRADER_CAPITAL`은 지워지고 `START_TRADE_LEVELS`(왕국마다 시작 무역소 레벨)가 생겼다.
  - 새 건물 `trading_post` (무역소, 공장 부지, 공사 포인트 `buildPointsOf('trading_post')`). 방식 셋: `trade_house` 상단 (하급 귀족 10·노동자 90), `trade_ledger` 장부 상회 (인쇄술, 하급 귀족 10·기술자 30·노동자 40), `trade_company` 무역 회사 (증기 철도, 전문가 10·기술자 20·노동자 20). 투입·산출 상품이 없다 (`industryOf` 는 null).
  - 금고 `Building.cash` (저택·금융가와 같은 칸, 무역소에도 생긴다). 상한 = `postCap(b)` (`market.ts`, 레벨 × `tradeReserveOf(b.methodId)`, 기본 `TUNE.tradeReserve`, 방식 단계마다 ×`TRADE_STEP_MULT`). 상한을 넘는 돈은 그날 건물 매출(`b.last.revenue`)로 회사에 간다. 쓸 수 있는 금고 = `postUsable(b)` (금고 × 가동률 × 작업 인원).
  - 공사: 무역소 공사는 레벨당 `tradeEscrowPerLevel()` 을 착공 때 따로 내서 `Construction.escrow`(낸 금고별 `escrowFrom`)에 묶는다. 완공되면 금고 시작 돈, 취소하면 돌려받는다. 무역소는 민영화하지 않는다 (`sellsShares` false).
  - 지역 교역 기록 `Region.trade = { buy, cut, margin }` (하루 이동평균): 무역소가 산 주문액, 금고가 모자라 잘린 주문액(무역소가 없으면 내려던 주문 전부), 기대 이익률.
  - 화물 `Shipment.post` = 산 무역소 id.
  - `Kingdom.investmentPool`(저택·금융가 금고 사본)에는 무역소 금고가 들어가지 않는다. `MetricPoint.traders` = 무역소 금고 합 (이름은 그대로).
- 화면 요청:
  1. 건설 목록·건물 상세에 무역소가 보이는지 확인 (방식 셋, 투입·산출 칸이 비어 있다). 투입·산출이 비면 막대 대신 "–".
  2. 무역소 상세: 금고 막대 `b.cash` / `postCap(b)` (숫자 둘), 그 아래 쓸 수 있는 금고 `postUsable(b)` 한 줄. 레벨당 유보액(`tradeReserveOf(b.methodId)`)은 방식 비교 행 하나.
  3. 건설 카드의 공사비 칸: 무역소는 공사비 + 묶는 돈(`tradeEscrowPerLevel() × 레벨`)을 따로 한 줄.
  4. 시장 창(지역): 교역 수요 막대 둘 (`Region.trade.buy` 산 주문, `cut` 잘린 주문) + 기대 이익률 숫자. 무역소가 없는 지역은 `buy` 0.
  5. 상인 현금을 보이던 곳(통계의 `traders` 선 등)이 있으면 이름을 "무역소 금고"로.
  설명 문구는 넣지 않는다 (규칙은 README·사전 `trade`·`trading-post`).

### 2-72. 0b 결과에서 화면이 알아야 할 것: 복지 다이얼, 인두세 부담 (docs/overhaul/0B_RESULTS.md 2.4·2.9·2.10)
- 2026-11-02: 1항(복지 다이얼 잠금)은 끝나 UI_DONE으로 옮겼다. 남은 것은 아래 2항(결정 대기)뿐이다.
2. **인두세에는 플레이어 쪽 부담 상한이 없다 (결정 대기, 단위 F의 재료).**
   - 사실: `setTaxLaw`는 기술 해금과 금융가 자산 비율만 본다 (`commands.ts:249~255`). 소득 대비 30% 상한(`pollTaxIncomeCap` 0.3)은 AI 판단에만 있다 (`ai.ts:343~344`). 0b (같은 조건, 인두세를 개발용으로 강제)에서 시드 1의 5년차 총생산이 13.6 (대조 101~122), 노동자 세금 ÷ 소득이 0.70~0.97까지 올랐다. 플레이어 왕국은 고정 연구 순서에서 5.7~6.3년차에 인두세를 열었다.
   - 화면이 할 것: 지금은 없다. 단위 F(1차 효과 미리보기)의 "부담률" 줄(05 L-S1: 걷힘 ÷ 세금·복지 전 소득, 직종별)이 이 값을 보인다. 결정 대기: 05 C-2 (`pollTax` 세율 재교정 또는 "인두세는 소득의 30%까지" 정책 예외, 사용자 결정). sim 대기: S3 (3장).
   - 화면 쪽에서 미리 계산식을 만들지 않는다 (sim 함수가 생기면 그것을 읽는다).

### 2-75. 공급 ÷ 수요: 건설 카드의 지금·예상 값, 시장 창 열, AI 문턱 눈금 (오버홀 03 5-1·5-2·6장, sim 대기 풀림: main c952e65)
- 2026-11-02 반영 확인 (main 81494a1): 안 됨. 클라이언트에 `projectedSD`·`currentSD`·`mainOutput` 호출이 없고 (grep 0건), 시장 창은 여전히 `balance` 정렬(`MarketWindow.tsx:40`)과 공급 / 수요 양 칸(`:57`)이다.
- 줄 번호 (main 81494a1 기준, 본문의 옛 줄 번호 `:506`·`:532~`·`:56` 등은 이 줄로 읽는다): `projectedSD` `economy.ts:603`, `currentSD` `:619`, `mainOutput` `:628`, TUNE `aiGlutSD` `data.ts:677` (기본 1.5; `aiCutSD`·`aiDemoSD`·`aiExitWeeks` 는 2026-11-02 wt-simplify 1-G 에서 지웠다, DECISIONS 7-46). 클라이언트: `BuildCard` `CompanyPanel.tsx:418` (+5 짓기 버튼 `:452`), 지역 건물 +5 증설 버튼 `:299`, 시장 창 정렬 `MarketWindow.tsx:40`, 공급/수요 열 `:57`.
- sim (원문: 브랜치 wt-0bp `cd97f1b` 기준으로 쓴 설명, 함수 뜻은 main 과 같다):
  - `projectedSD(w, regionId, g, addOutput = 0): number | null` (`economy.ts:506`): (지역 공급 이동평균 `market[g].supplyEma` + 그 지역에서 g를 내는 모든 회사의 공사 중 레벨 산출 + `addOutput`) ÷ 지역 수요 이동평균 `demandEma`. 공사 중 레벨 산출 = 공사마다 레벨 수 × 그 방식의 g 산출 × (1 + `regionPerk(regionId, typeId)`). 수요 이동평균 ≤ `FLOW_ZERO`(1e-6)이면 `null`. 세계를 바꾸지 않는다. AI 증설 검사와 같은 함수다.
  - `currentSD(w, regionId, g): number | null` (`:522`): `supplyEma ÷ demandEma` (공사 중 제외). 같은 `null` 규칙.
  - `mainOutput(typeId, methodId): GoodId | null` (`:531`): 그 방식의 산출 중 기본가로 잰 값이 가장 큰 상품 (산출이 없으면 `null`).
  - 단위: `supplyEma`·`demandEma`는 지역 합계 하루 양의 이동평균, S/D는 단위 없는 비율.
  - 조정값 (`TUNE`, `data.ts:590~601`): `aiGlutSD` 1.5 = AI가 증설을 멈추는 예상 S/D.
- 화면:
  1. **건설 카드** (`BuildCard`, `CompanyPanel.tsx:532~`): 방식 목록 아래 한 줄 "공급 ÷ 수요". 상품 `g = mainOutput(bt.id, m.id)`, 방식 `m = availableMethods(me, bt.id)[0]` (`build` 명령이 방식을 안 주면 쓰는 것, `commands.ts:122`). `g`가 없으면 (학교·행정청·건축사무소 등) 줄을 그리지 않는다. 레벨당 산출 `per = getMethod(bt.id, m.id).outputs[g] × (1 + regionPerk(region.id, bt.id))`. 숫자 셋: 지금 `currentSD(world, region.id, g)`, +1 `projectedSD(world, region.id, g, per)`, +5 `projectedSD(world, region.id, g, 5 × per)` (카드의 짓기·+5 버튼과 같은 N). 소수 둘째 자리. `null`이면 "—".
  2. **막대**: 위 숫자 옆에 로그 눈금 막대 하나 (0.25 ~ 4, 위치 = (log2(x) + 2) ÷ 4, 범위 밖은 끝에 붙임). 눈금 0.5 · 1 · 2 (가운데 1, 03 6장). 지금 값은 채운 점, +1·+5 뒤 값은 빈 점. 1보다 크고 작음에 좋음/나쁨 색을 쓰지 않는다 ("과잉" 같은 말도 쓰지 않는다, 03 6장).
  3. **AI 문턱 눈금 (추천안)**: 같은 막대에 `TUNE.aiGlutSD` 눈금 하나 (> 0일 때). 눈금 툴팁은 라벨과 숫자만: "AI 증설 멈춤 1.50" / "AI stops expanding 1.50". 이유: 같은 지역의 AI가 언제 증설을 멈추는지는 플레이어의 짓기 판단 재료이고, 값은 사전(`ai-reserve`·`ai-construction` live)에 이미 공개된 AI 상수다. 09 3.4가 막는 것은 특정 시드에서 잰 레버 반응 부호이지 규칙 상수가 아니다. 반대하면 눈금을 빼고 숫자만 둔다 (사용자 결정 필요 없음으로 봄).
  4. **줄 툴팁**: 공급 `supplyEma`, 수요 `demandEma` (하루 양, compact)와 지금·+1·+5 세 비율. 라벨과 숫자만. 공사 중 산출은 화면에서 다시 계산하지 않는다 (+N 값에 이미 들어 있다).
  5. **지역 건물 증설 버튼** (`CompanyPanel.tsx:416~419`의 + / +5): `title`(툴팁)에 "공급 ÷ 수요 1.23 → 1.31". 상품 `mainOutput(b.typeId, b.methodId)`, 레벨당 산출은 `b.methodId` 기준으로 1.과 같다.
  6. **시장 창 상품 줄 (추천안)**: `MarketWindow.tsx:56`의 `balance` 열(공급 − 수요, 양)을 "공급 ÷ 수요" 열로 바꾼다. 지역 범위는 `currentSD`, 왕국·세계 범위는 합산 시장(`marketScope.ts:16~19`)의 Σ`supplyEma` ÷ Σ`demandEma` (Σ수요 ≤ `FLOW_ZERO`면 "—"). 칸 = 숫자 + 작은 로그 막대(2.과 같은 눈금, AI 눈금 없음). 정렬 키 `balance` → 이 비율 (`MarketWindow.tsx:39`). 이유: 양의 차이는 상품끼리 견줄 수 없고, 03 6장이 기본 열을 "값과 공급 ÷ 수요"로 정했다. 지역 개요 시장 표(`RegionPanel.tsx:142` 공급 / 수요 숫자)는 그대로.
- 보이지 않는 것: `Region.trim`·`demoAt`(AI 내부 셈), 증설이 막혔다는 표시.
- 문자열: "공급 ÷ 수요"/"Supply ÷ demand", "지금"/"Now", "+1", "+5", "공급"/"Supply", "수요"/"Demand", 위 AI 눈금 하나.
- 완료 기준: 카드의 세 숫자가 같은 날 `projectedSD`/`currentSD` 직접 호출 값과 같다 (소수 둘째 자리). 수요 0 상품은 "—". 다크 모드에서 점·눈금이 구분된다. 420×560에서 넘침 없음 (ko/en). typecheck.
- 사용자 결정이 필요한 것: 없음 (3·6항은 추천안, 반대하면 바꾼다).

### 2-79. 지역 시장 임금 표 (main c952e65, wt-labor 병합, DESIGN 7.3, DECISIONS 7-32·7-38, 사전 `market-wage`)
- 2026-11-02 반영 확인 (main 81494a1): 안 됨 (커밋된 클라이언트에 지역 임금 표가 없다. `RegionExplorer.tsx:30~38` 은 인구·토지·교육 `DetailWindow` 셋뿐). 화면 작업자가 작업 중인 것으로 보인다 (커밋 전). 들어오면 아래 완료 기준으로 본다.
- 2026-11-02 덧붙임: 소작 1인 소득 `subsistenceWage` 는 sim 준비됨 (index export, wt-sim2). 아래 2.는 그에 맞게 고쳤다 (옛 '그리지 않는다' 조건은 뺐다). 국영 칸 툴팁은 6., 시장 임금이 가는 쪽(목표 임금)은 2-86.
- sim에서 바뀐 것: 지역 시장 임금 규칙 하나만 있다 (옛 스위치 `TUNE.wageMarket` 은 2026-11-02 wt-simplify 1-E 에서 지웠다). 지역마다 직종마다 시장 임금이 하나 있고, 그 지역의 모든 임금 건물(왕실 생산 건물 포함)이 그 값을 준다 (`labor.ts:481 updateMarketWages`, `economy.ts:367 wagesAt`). 회사 임금표를 움직이던 옛 AI 임금 판단(`adjustWages`)은 wt-simplify 1-E 에서 지웠다. (wt-wagelag 부터 AI 민간 상회 건물은 시장 임금 × (1 + `Company.aiPremium[지역 id].off[직종]`) 를 준다. 건물 임금을 보일 때는 `Region.wages` 가 아니라 `wagesAt(c, b.typeId, w, b.regionId)` 를 읽는다, 사전 `ai-wage-premium`).
- 쓸 필드 (모두 1인 하루 ƒ, 지역 값):
  - `Region.wages?: Record<Skill, number>` (`types.ts:532`): 지금 시장 임금. 날마다 맞는 임금 쪽으로 차이의 `wageTargetSpeed` 만큼 움직인다 (2026-11-02 wt-wagespeed, DESIGN 7.3 '목표 임금'; 그 전에는 하루 최대 ±0.25% `wageMarketRate`). 저장값은 반올림하지 않는다.
  - `Region.wageAvg?: Record<Skill, number>` (`:534`): `wages`의 52주 이동평균 (`WAGE_AVG_DAYS` 364일, 날마다 1/364씩 다가감). AI 투자 판단 임금.
  - `Region.stateWages?: Record<Skill, number>` (`:536`): 그 지역 정부 건물(행정청·건축사무소·학교)의 국영 임금 = `wages` × 국영 임금 단계 배율, 매주, 소수 둘째 자리로 저장 (`finance.ts:142~148`).
  - 소작 1인 소득: `subsistenceWage(w, r)` (`labor.ts:93`). 소작농 1인 하루 소득 가치 (판매 대금 − 지대·토지세 + 쓴 현물, 기상 조건 포함). 노동자·농부 시작 임금과 고용 0 대체값의 기준 (× `switchPremium` 1.1). **sim 준비됨 (`subsistenceWage`, wt-sim2).**
  - 실업: `regionUnemployment(world, r.id, s)` (`economy.ts:737`, 0~1, 노동 인구 기준).
  - 세 `Region` 칸은 옛 저장의 첫날이면 없다 (`undefined`). (`wageMarket` 0 세계는 스위치를 지워 없어졌다, wt-simplify 1-E)
- 지금 화면: 지역 시장 임금이 어디에도 없다. 지역 개요 칸(`RegionPanel.tsx:96~113`)에는 임금이 없고, 재정 창의 `Wages`(`CompanyPanel.tsx:326~349`)가 보이는 "시장임금"은 `marketWage(world, s, me.id)` (`economy.ts:727`) = 세계 전체(다른 왕국 포함) 회사들의 고용 가중 평균이라 어느 지역의 지급액도 아니다 (2-81).
- 바꿀 것:
  1. 지역 개요 원장 `RegionExplorer.tsx:35~38` (교육 `DetailWindow` 다음)에 `DetailWindow` 하나: 제목 "임금", 요약 `ƒ{r.wages.unskilled}` (노동자 시장 임금). `r.wages`가 없으면 이 창을 그리지 않는다. 다른 왕국 지역도 그대로 보인다 (읽기 전용).
  2. 창 안 맨 위 칸 하나: "소작 1인 소득" `ƒ` 값. 툴팁: "노동자 ÷ 소작 x.xx" (`r.wages.unskilled ÷ 소작 1인 소득`). 값은 `subsistenceWage(world, r)` (index export).
  3. 그 아래 표: 행 = `SKILLS` 순서 7개 (`ClassSprite` + 직종 이름), 열 = 시장 임금 `r.wages[s]` · 52주 평균 `r.wageAvg?.[s]` · 국영 `r.stateWages?.[s]` (없으면 "—") · 실업 (퍼센트 + `Bar tone="neg" size="sm"`). 정렬 없음. 칸마다 툴팁은 정확한 값 (`NumericValue`가 이미 한다).
  4. 값 표시는 `NumericValue format="money"` (100 아래 소수 둘째 자리). 시장 임금과 52주 평균의 차이에 좋음/나쁨 색을 쓰지 않는다.
  5. 소작 1인 소득은 가격·기상 조건에 따라 날마다 바뀐다. 화면은 주가 바뀔 때만 다시 센다 (`Math.floor(world.tick / 7)`을 키로 기억). 시장 임금 셋은 날마다 그대로 읽는다 (하루 변화가 작다).
  6. (2026-11-02 wt-admin) 국영 칸 툴팁: 식 하나. `시장 임금 ƒa × 단계 b` 이고, 그 지역 왕실의 국영 웃돈 `p = companyById(world, kingdom.governmentId)?.statePremium?.[r.id]?.[s]` 가 > 0 이면 `× (1 + 웃돈 p)` 를 붙인다 (`BudgetJobs.tsx:12` 와 같은 꼴, 문자열 `T.marketWage`·`T.stage`·`T.wagePremium` 재사용). 단계 b = `TUNE.govWageLevels[kingdom.budget.wages − 1]` (`kingdom` = 그 지역의 왕국). `Region.stateWages` 는 이미 웃돈이 든 값이라 칸 숫자는 그대로 읽는다 (`types.ts:536`). 플레이어 왕실은 웃돈이 없다 (DECISIONS 7-42 결정 대기 1).
- 문자열 (ko/en): "임금"/"Wages", "시장 임금"/"Market wage" (`T.marketWage` 재사용 가능), "52주 평균"/"52-week avg", "국영"/"State", "소작 1인 소득"/"Tenant income / head", "실업"/"Unemployment" (재사용), 툴팁 "노동자 ÷ 소작"/"Labourer ÷ tenant".
- 빼는 것: 없음.
- 완료 기준: 같은 날 표의 값이 `r.wages`·`r.wageAvg`·`r.stateWages`를 소수 둘째 자리로 반올림한 값과 같다. `Region.wages` 가 없으면 (옛 저장의 첫날) 창이 없다. 420×560 창에서 다섯 열이 넘치지 않는다 (ko/en). 다크 모드에서 실업 막대가 보인다. typecheck.
- 사용자 결정: 필요 없음. 자리는 추천안이다: 지역 개요가 지역 사실을 모으는 곳이고 시장 임금은 지역 값이다. 노동 상세(`Workforce.tsx`)는 건물 하나의 일꾼 표라 지역 표를 넣을 자리가 아니다.

### 2-82. 저축과 부 이동 (main c952e65, DESIGN 5장 부 이동, DECISIONS 7-37·7-38, sim 준비됨 (`wealthDrivers`, wt-sim2))
- 2026-11-02 반영 확인 (main 81494a1): 안 됨 (클라이언트에 `wealthDrivers` 호출 0건, `BuildingPops.tsx:30` 칸 줄 그대로). sim 대기는 풀렸다: `wealthDrivers(w, p)` 는 `market.ts:1035`, index export (`index.ts:14`), 반환 칸은 아래 "sim 쪽 필요" 줄과 같다. 아래 "sim 쪽 필요 (3장)" 줄은 기록으로만 읽는다.
- sim에서 바뀐 것: 부 이동(`market.ts:1007 updateWealth`)의 소득 = 현금 소득 이동평균(`Pop.incomeEma`) + 그날 쓴 현물의 시장가. c952e65부터 하층(소작농·노동자·농부, `CLASS_DEFS[prof].stratum === 'lower'`)은 여기에 max(0, `savings` − 지금 단계 하루 생활비 × 7 × `wealthSavBuffer` 8) ÷ (`wealthSavWeeks` 52 × 7)을 더한다 (`:1012~1015`). 이 소득이 다음 단계 생활비의 102%를 넘으면 하루 최대 +0.03, 지금 단계의 98%에 못 미치면 하루 최대 −0.03.
- 지금 화면: pop 상세(`BuildingPops.tsx:30~38`)에 부 단계(`:30`, `toFixed(1)`)와 저축(`:37`)은 있지만 생활비와 저축 몫이 없어 부가 왜 오르고 내리는지 숫자로 읽을 수 없다. 생활비 함수(`market.ts:953 basketCostAt`)는 `index.ts`가 내보내지 않는다.
- sim 쪽 필요 (3장): `wealthDrivers(w: World, p: Pop): { income: number; inKind: number; fromSavings: number; costNow: number; costNext: number; drift: number }`. 돈 칸은 모두 그 pop 합계 하루 값 (ƒ/일), `drift`는 하루 부 변화 (단계/일, `updateWealth`와 같은 식, 세계를 바꾸지 않는다). `fromSavings`는 하층이 아니면 0. `costNext`는 최고 단계면 `costNow`와 같게.
- 화면 (sim이 들어온 뒤): `BuildingPops.tsx:30` 칸 줄 다음에 `<details>` "부 이동", 기본 닫힘. 행:
  1. 소득 `income`, 현물 `inKind`, 저축 몫 `fromSavings` (하층이 아니면 "—"), 합 (세 값의 합).
  2. 지금 단계 생활비 `costNow`, 다음 단계 생활비 `costNext`.
  3. 부 / 주: `drift × 7` (`toFixed(2)`, 부호 `pos`/`neg` 색). 주 단위로 보여 숫자가 덜 흔들리게 한다.
  4. 칸 줄(`:30`)에 칸 하나 더: "저축 / 생활비" = `savings ÷ (costNow × 7)` 주 (`toFixed(1)`, 단위 "주"). 8주 선은 저축 몫 행의 툴팁 식에만 쓴다: "max(0, 저축 − 생활비 × 7 × 8) ÷ 364".
  - 1인당/합계 토글(`:31`)을 따른다 (기본 1인당. 돈 행만 나눈다. 부 / 주와 주 수는 나누지 않는다). 같은 직종 pop 여럿은 돈 행을 더하고, 부 / 주는 인원 가중 평균.
- 문자열 (ko/en): "부 이동"/"Wealth drift", "소득"/"Income", "현물"/"In kind" (재사용), "저축 몫"/"From savings", "합"/"Total", "지금 단계 생활비"/"Cost at level", "다음 단계 생활비"/"Cost at next level", "부 / 주"/"Wealth / wk", "저축 / 생활비"/"Savings / costs", "주"/"wk".
- 빼는 것: 없음.
- 완료 기준: 한 pop의 "부 / 주"가 하루 뒤 `p.wealth` 변화 × 7과 같은 부호·크기 (소수 둘째 자리). 상층·중층 pop은 저축 몫 "—". typecheck.

### 2-83. 소작지 재해 칩 (main c952e65, DESIGN 4장, DECISIONS 7-34, 사전 `tenant-disaster`, 낮은 우선순위)
- 2026-11-02 반영 확인 (main 81494a1): 안 됨 (`quakeAt`·`quakeLabel` 호출 0건). 줄 번호: `quakeAt` `economy.ts:224`, `quakeLabel` `:243`, `quakeChance` `data.ts:648`. `HarvestBadge` 자리: `FlowRow.tsx:29`, `RegionPanel.tsx:85`, `ResourceInspector.tsx:83`, `RegionMap.tsx:103`.
- sim: `TUNE.quakeChance` 기본 0 (`data.ts:633`)이라 지금 게임에서는 재해가 나지 않는다. 켜면 지역마다 해마다 그 확률로 지진·홍수가 나고, 그 지역 소작지 칸의 `quakeLoss`(반올림)가 `quakeYears`년 동안 소작농을 받지 못한다.
  - `quakeAt(w, regionId): Quake | null` (`economy.ts:208`): `{ kind, regionId, loss (0~1), start, end }` (틱). `quakeLabel(w, regionId, en)` (`:227`): "지진 소작지 −25% (3칸) · 1080일" / "Earthquake tenant land −25% (3 cells) · 1080 d" (지역 이름 없음), 재해가 없으면 `null`.
  - 시작하는 날과 끝나는 날 사건 (`production.ts:28`, `logEvent` kind `warn`, `regionId` 있음). 사건 열(`Notifications.tsx`)에는 이미 그대로 나온다. 할 일 없음.
- 화면:
  1. 소작지 행 (`FlowRow.tsx:29`의 `HarvestBadge` 옆)과 지역 머리 (`RegionPanel.tsx:85` `HarvestBadge` 옆)에 칩 하나: `quakeAt`이 있을 때만. 경고 아이콘 + `−{pct(q.loss)} · {q.end − world.tick}일`. 툴팁 = `quakeLabel(world, regionId, lang === 'en')` 전체.
  2. 색은 `harvest-badge`의 나쁜 조건 색과 같은 계열 (다크 모드 구분).
- 문자열: "일"/"d" (기존 날 단위 재사용). 종류 이름과 문장은 `quakeLabel`이 준다.
- 완료 기준: `TUNE.quakeChance = 1` 개발 세계 2년차에 칩이 나오고 사건 열 문장과 같은 % · 남은 날. 0이면 칩 없음. typecheck.

### 2-85. 건물 일꾼 줄의 1인 임금과 웃돈 (main 81494a1, wt-wagelag·wt-admin, DESIGN 7.3 '상회 웃돈'·'국영 웃돈', 9.2, 사전 `ai-wage-premium`·`ai-state-premium`)
- sim에서 바뀐 것: 같은 지역 같은 직종이라도 건물마다 1인 임금이 다를 수 있다.
  - AI 민간 상회 건물: 지역 시장 임금 × (1 + `Company.aiPremium[지역 id].off[직종]`) (`ai.ts adjustPremium`, 늘 켜짐: 스위치 `aiWagePremium` 은 wt-simplify 1-C 에서 지움, `types.ts:422`).
  - 왕실 정부 건물(행정청·건축사무소·학교): `Region.stateWages[직종]` = 시장 임금 × 국영 임금 단계 배율 × (1 + `Company.statePremium[지역 id][직종]`) (AI 왕실만, `aiStatePremium` 1 기본, `finance.ts applyStateWages`, `types.ts:427`).
  - 그 밖(왕실 생산 건물, 웃돈 없는 상회): 지역 시장 임금 `Region.wages[직종]`.
  - 세 경우를 모두 내는 함수가 `wagesAt(c, typeId, w, regionId)` (`economy.ts:367~379`, index export). 건물 하나의 1인 하루 임금 = `wagesAt(companyById(world, b.companyId)!, b.typeId, world, b.regionId)[s]` (ƒ/일, 1인).
- 지금 화면: 건물 하나의 1인 임금이 어디에도 없다. 일꾼 줄(`Workforce.tsx:15~19`)은 직종·충원 막대·인원/자리뿐이고, 건물 수지(`BuildingEconomics.tsx:25`)의 임금은 하루 합계(`e.day.wages`, 웃돈이 든 실제 지급액)다. 그래서 AI 상회가 웃돈으로 사람을 끌어가는 것이 보이지 않는다.
- 바꿀 것:
  1. `Workforce` 줄 끝에 1인 하루 임금 칸 하나 (`NumericValue format="money"`). 줄 격자 `workspace.css:168` 의 세 칸 → 네 칸 (`... auto auto`).
     - 배당 자리(`paysShare(b, s)` 가 참, 동전 아이콘이 이미 붙는 줄): "—" (임금이 없다).
     - 소작지 줄: `subsistenceWage(world, region)` (소작 1인 소득, 주마다 다시 셈: `Math.floor(world.tick / 7)` 키). 2-79 표의 "소작 1인 소득"과 같은 값.
     - `Region.wages` 가 없는 세계(옛 저장의 첫날)는 `wagesAt` 이 회사 임금표를 돌려준다. 그대로 쓴다.
  2. 웃돈 칩: 그 줄의 웃돈 `p` 가 0.005 이상이면 임금 옆에 `+{pct(p)}` 작은 칩 (라벨 없음, 툴팁만). 색은 중립(강조색 한 가지). 오르면 좋음/나쁨 색을 쓰지 않는다 (일꾼에게는 좋고 주인에게는 나쁘다).
     - AI 민간 상회: `p = owner.aiPremium?.[b.regionId]?.off[s] ?? 0`.
     - 왕실 정부 건물(`owner.state && isGovernment(b.typeId)`): `p = owner.statePremium?.[b.regionId]?.[s] ?? 0`.
     - 그 밖: 칩 없음.
  3. 임금 칸 툴팁: 식 하나 (`BudgetJobs.tsx:12` 와 같은 꼴, 소수 둘째 자리 `exactNumber`).
     - 상회: `시장 임금 ƒa × (1 + 웃돈 p)` (웃돈이 0이면 `시장 임금 ƒa`).
     - 정부 건물: `시장 임금 ƒa × 단계 b × (1 + 웃돈 p)` (b = `TUNE.govWageLevels[kingdom.budget.wages − 1]`, 그 건물 주인 왕국).
     - a = `regionById(world, b.regionId).wages?.[s]`.
  4. `Workforce` 는 지금 `building` 만 받는다. `world` 를 넘긴다 (호출처 `CompanyPanel.tsx:236`·`:262`, `ResourceInspector.tsx:44`). 그룹 상세의 일꾼 줄(`GroupDetail.tsx:29`, 같은 `workforce-row`)도 같은 칸을 쓰되, 건물마다 임금이 다르면 인원 가중 평균을 보이고 툴팁에 최저~최고.
- 문자열 (ko/en): 새 문자열 없음 (`T.marketWage`, `T.wagePremium` "웃돈"/"Premium", `T.stage` 재사용). 줄 칸 머리가 없으므로 `aria-label` 에 "1인 임금"/"Wage / head" 하나 (새 문자열).
- 빼는 것: 없음.
- 완료 기준: 같은 날 일꾼 줄 숫자 = `wagesAt(...)[s]` 를 소수 둘째 자리로 반올림한 값. AI 왕국 상회 건물에 웃돈이 있는 지역에서 칩이 보이고 `aiPremium` 과 같은 %, 플레이어 왕실 건물에는 칩이 없다. 배당 자리는 "—". 420×560 창에서 넘침 없음 (ko/en), 다크 모드에서 칩이 구분된다. typecheck.
- 사용자 결정: 필요 없음 (자리 추천안: 일꾼 줄이 직종별 줄이라 1인 임금이 그 줄의 값이다. 별도 표를 만들지 않는다).
- sim 준비됨 (2026-11-02 wt-uiapi 확인, 새 export 필요 없음): `wagesAt` (`economy.ts:367`), `paysShare` (`economy.ts:478`), `isGovernment` (`economy.ts:350`), `companyById` (`economy.ts:860`), `regionById` (`economy.ts:16`) 는 `index.ts:3` `export * from './economy'` 로, `subsistenceWage` (`labor.ts:93`) 는 `index.ts:15` 로 나간다. 웃돈은 `Company.aiPremium`·`statePremium` (`types.ts`), 단계 배율은 `TUNE.govWageLevels` (`data.ts:627`).

### 2-86. 시장 임금이 가는 쪽: 목표 임금 (main 81494a1, wt-wagespeed, DESIGN 7.3 '목표 임금', DECISIONS 7-43, 사전 `market-wage`, sim 준비됨)
- sim에서 바뀐 것: 맞는 임금 규칙 하나 (옛 스위치 `TUNE.wageTarget` 은 2026-11-02 wt-simplify 1-E 에서 지웠다), `wageTargetSpeed` 0.1. 시장 임금은 날마다 목표 임금(맞는 임금) 쪽으로 차이의 10%씩 움직인다 (`labor.ts updateMarketWages` `:481~493`, 지역 하나의 셈은 `moveRegionWages` `:502~528`, wt-uiapi 에서 나눔). 목표 = 아래 끝(`startWage`: 한 칸 아래 직종 × `switchPremium`, 노동자·농부는 소작 1인 소득 × `switchPremium`)과 위 끝(바깥 소득 `outsideWage` × `TUNE.wageTargetSpan` 2 (기본, `data.ts:550`, 근거는 DESIGN 11장 `wageTargetSpan` 행), 기본 임금 × `MARKET_WAGE_RANGE` 위 끝 이하) 사이에서 오려는 사람이 자리를 채우는 가장 낮은 임금 (`clearingWage`, `:461`). 아래 끝은 최저임금이 아니다 (수렴값, 그 아래 임금도 둔다).
- 지금 화면: 목표 임금이 어디에도 없다. 플레이어는 시장 임금이 오를지 내릴지 알 수 없다. 목표 임금과 자리·오려는 사람은 sim 안에서만 세고 저장하지 않는다 (화면은 아래 `marketWageTargets` 로 읽는다).
- sim 준비됨 (2026-11-02 wt-uiapi): `marketWageTargets(w: World, regionId: number): Record<Skill, WageTarget> | null` (`labor.ts:537`, index `index.ts:15`, 타입 `WageTarget = { target; lo; hi; jobs; willing }` `labor.ts:496`, index `index.ts:16`). 세계를 바꾸지 않는다 (`updateMarketWages` 와 같은 `moveRegionWages` 를 지역 임금표 사본에 돌린다. 위 직종의 아래 끝은 아래 직종이 그날 움직인 뒤 값, `updateMarketWages` 와 같다. 시험 `test/core/wageTarget.test.ts:73`·`readonly.test.ts`, 골든 같음). 그 지역이 없어도 `null`. `updateMarketWages` 와 같은 식: `lo`·`hi` 는 위 아래·위 끝 (1인 하루 ƒ), `target` 은 `clearingWage` (자리가 없으면 `startWage`, 자격자가 없으면 지금 임금), `jobs` = 그 지역 채울 수 있는 자리 (명, 지역 합계), `willing` = 지금 시장 임금에서 오려는 사람 (명, 지역 합계, `labourTable` 의 `willing`). `Region.wages` 가 없어도 `null` (`wageMarket`·`wageTarget` 스위치는 2026-11-02 wt-simplify 1-E 에서 지웠다).
- 화면 (sim이 들어온 뒤, 2-79 표 안):
  1. 시장 임금 칸 숫자 옆 방향 아이콘 하나: `target > wage × 1.005` 이면 위 화살표, `target < wage × 0.995` 이면 아래 화살표, 그 사이는 없음 (lucide `ArrowUp`/`ArrowDown` 14px, 중립색. 좋음/나쁨 색 없음).
  2. 시장 임금 칸 툴팁: `목표 ƒt · 아래 끝 ƒlo · 위 끝 ƒhi · 자리 n · 오려는 사람 m` (라벨과 숫자만, 돈은 소수 둘째 자리, 사람은 compact).
  3. `marketWageTargets` 는 주가 바뀔 때만 다시 부른다 (`Math.floor(world.tick / 7)` 키, 지역 하나에 `labourTable` 한 번이라 무겁다). 목표는 자리 수에 따라 크게 뛸 수 있어 화살표가 날마다 깜빡이지 않게 한다. 시장 임금 숫자 자체는 2-79 대로 날마다 읽는다.
- 이유 (추천안): 이 규칙에서 임금이 움직이는 까닭을 숫자 하나로 보여 주는 것이 목표 임금이다. 420×560 창에 2-79 의 다섯 열이 이미 차 있어 열을 늘리지 않고 아이콘 + 툴팁으로 둔다. 버린 안: "목표" 열 추가 (영어에서 넘침), 하루 이동량 표시 (= 0.1 × 차이라 목표와 겹친다).
- 문자열 (ko/en): "목표"/"Target", "아래 끝"/"Low end", "위 끝"/"High end", "자리"/"Jobs", "오려는 사람"/"Willing". ("바닥"/"Floor" 는 쓰지 않는다: 최저임금으로 읽힌다.)
- 빼는 것: 없음.
- 완료 기준: 툴팁 목표가 같은 날 `marketWageTargets` 값과 소수 둘째 자리까지 같다. 화살표 방향이 다음 날 `r.wages[s]` 변화 부호와 같다 (차이 0.5% 넘을 때). `marketWageTargets` 가 `null` 이면 (그 지역이 없거나 `Region.wages` 가 없을 때) 화살표·툴팁 줄이 없다 (`wageMarket`·`wageTarget` 이 아니면 `null` 이던 경우는 wt-batch3 에서 두 스위치와 함께 없어졌다). typecheck.
- 사용자 결정: 규칙은 2026-11-02 사용자가 확인했다 (DECISIONS 7-43). 위 끝 배율 `TUNE.wageTargetSpan`·속도 `wageTargetSpeed` 는 값 손잡이로 남는다 ( 2026-11-02 wt-span 비교에서 배율 1.5·3, 속도 0.2 모두 기본값보다 고르게 낫지 않아 2·0.1 그대로, DESIGN 11장 두 행, 보고서 2026-11-02-wagespan). 화면 설계는 규칙이 바뀌어도 같다 (목표·끝 값만 sim 이 준다). 7-42 결정 대기 1 이 (b) "플레이어 왕실에 정부 건물 지역 웃돈 손잡이"로 정해지면 그때 새 절을 쓴다.

### 2-87. 저택 지분 (wt-manor, DESIGN 9.3 `manorShares`·`absenteeShare`·`manorBuyScope`, 사전 `manor-shares`, DECISIONS 7-44)
- sim 쪽 최소 수정 (2026-11-02, CLAUDE.md 예외: sim 기본값이 바뀌어 클라이언트 시험이 깨짐): `packages/client/test/ownerSummary.test.tsx:10~18` "marks the manor gentry position as receiving a share" 가 `TUNE.manorShares` 0 으로 돌게 했다 (기본 1 이면 하급 귀족이 저택에 앉지 않아 그 줄이 없다). 화면 작업자는 지분 표시(아래 1~4)를 넣을 때 이 시험을 지분 기준으로 바꾼다.
- 상태: 2026-11-02 wt-manor 에서 `TUNE.manorShares` 기본 켬 (HANDOFF 0-1102h, DECISIONS 7-44, main 병합 뒤 적용). 0 으로 끄면 화면이 바꿀 것은 없다. 클라이언트 코드는 sim 작업자가 고치지 않았다.
- sim:
  - 저택 지분은 금융가 지분과 같은 `Pop.fund` (`{ id: number[]; u: number[] }`, 건물 id 오름차순) 에 든다. 저택 id 와 금융가 id 는 겹치지 않는다. 한 pop 이 여러 저택(다른 지역·다른 왕국 포함)과 금융가 지분을 함께 가질 수 있다.
  - 저택 지분 값: `Building.nav` (저택에도 생긴다, 매주). 지분 주인 = 저택 id 지분이 0 보다 큰 pop (상급·하급 귀족, 되사기 전의 다른 직종이 잠깐 있을 수 있다). 저택에 앉은 pop 은 상급 귀족뿐이고, 앉은 자리는 몫과 상관없다.
  - 하급 귀족은 저택에 앉지 않는다. 일자리가 없는 하급 귀족은 실업(`work === 0`)이고 배당으로 산다 (실업률에 들어간다).
  - `TUNE.absenteeShare` > 0 이면 다른 지역 건물의 배당 일부가 그 건물 지역 저택으로 간다. `Building.payout.paid` 에 그 저택 id 줄이 생긴다 (배당 기록과 같은 모양).
- 화면:
  1. 저택 창 주인 목록 (`packages/client/src/ownershipPortfolio.ts:4 ownershipPeople`): 지금은 `b.typeId === 'finance'` 일 때만 지분 수를 쓰고 저택은 `p.work === b.id ? p.size * shareWeight(p.prof) : 0` 이다. `TUNE.manorShares` 가 켜져 있으면 저택도 금융가처럼 `p.fund` 의 지분 수를 무게로 쓴다 (`TUNE` 은 sim export). 끄면 지금 식 그대로.
  2. 저택 창 머리 한 줄: 지분 합, 지분 값(`b.nav`), 지분 1개당 주간 배당 = max(0, `b.profitEma`) × 7 × (1 − `KEEP_SHARE.manor`) ÷ 지분 합 (= `finance.ts unitYield` × `b.nav`; `unitYield` 는 index 가 내보내지 않으므로 이 식으로 센다. 지분 합은 그 저택 id 의 `p.fund.u` 합, 사전 `manor-shares` live 의 지분 수와 같다). 라벨만, 설명 문구 없음.
  3. pop 창(또는 계층 표)의 보유 지분: 저택 지분도 금융가 지분처럼 건물 이름·지역과 지분 수·값(지분 × nav)으로. 다른 왕국 저택이면 왕국 이름.
  4. 실업 표에서 하급 귀족을 따로 볼 수 있게 (선택): 지분을 켜면 하급 귀족 실업률이 70~90% 로 보인다 (배당으로 산다). 실업률에는 하급 귀족을 그대로 넣는다 (DECISIONS 7-44 결정 2, 사용자 2026-11-02).
  5. `OwnerSummary` 'nobleSeats' 라벨: 상급 귀족 자리만 남는다 (하급 귀족 자리 없음).
- 문자열: "지분"/"Units", "지분 값"/"Unit value", "수익률"/"Yield" (이미 있으면 그것). 완료 기준: `TUNE.manorShares` 1 세계에서 저택 창 주인 목록의 무게 합 = 그 저택 id 의 `p.fund.u` 합, typecheck. 기본 켬이라 main 병합 뒤 1항 전에는 저택 주인 목록이 앉은 상급 귀족만 보인다 (하급 귀족 빠짐): 1항을 먼저 한다 (0장 깨진 화면).

### 2-88. 정치 창: 이익집단 (wt-ig, DESIGN 9.6, DECISIONS 7-45, 사전 `interest-groups`, sim 준비됨 (`interestGroups`), 낮은 우선순위: 읽기 전용 층)
- sim: `interestGroups(w, kingdomId): IgStatus` = `{ kingdomId, votingLaw, groups: IgRow[] }` (`interestGroups.ts`). 세계를 바꾸지 않는다. 값은 반올림하지 않았다 (화면이 소수 둘째 자리로 반올림, % 는 정수).
  - `IgRow`: `id` (`IG_IDS`: landowners·industrialists·petite·rural·unions·intelligentsia, 이 순서), `name`·`nameEn`, `members` (회원 수, 명), `clout` (0~1, 왕국 합 1), `status` ('powerful' | 'influential' | 'marginal'), `approval` (−20~20), `parts` `{ stances, change, sol }` (승인을 이루는 셋, 합은 한도 ±20 전 값), `pending` (`change` 중 지금 바뀌는 중인 법의 몫), `mood` ('angry' | 'unhappy' | 'neutral' | 'happy' | 'loyal'), `stance` `{ tax, invest, welfare, voting }` (−2~+2).
  - `votingLaw`: `VOTING_LAWS` 여섯 중 하나 (지금 모든 왕국 'autocracy' 전제. 플레이어 명령 없음, 단계 3 전까지 읽기 전용 라벨). 이름은 `VOTING_NAMES`.
  - 화면은 `lawHist` 를 넘기지 않는다 → `parts.change` 에는 바뀌는 중인 법의 충격만 들어 있다 (이미 바뀐 법의 충격은 단계 1 에서 세계가 기록한 뒤).
  - 상수: `IG_NAMES`, `VOTING_NAMES`, `IG_POWERFUL`, `IG_MARGINAL`, `IG_MOOD_AT`, `IG_APPROVAL_CAP`, `VOTING_LAWS`. 값은 코드에서 읽는다.
  - `lawChance(w, kingdomId, kind, to)` → `{ chance, support, oppose, crown, groups }` (법이 바뀔 확률, 단계 2 규칙의 읽기용 값) 도 있지만 단계 2 전에는 화면에 넣지 않는다 (아직 확률로 바뀌지 않으므로 보이면 헷갈린다).
- 화면: 정책 창 (진행 C 의 국가 예산/법 탭 묶음) 에 탭 하나 "정치". 고른 왕국 (기본 플레이어 왕국).
  1. 머리 줄: "투표법" 라벨 + 이름 (`VOTING_NAMES[votingLaw]`).
  2. 집단 6줄 (`groups` 순서). 칸: 이름 | 영향력 막대 (0~100%) + `pct(clout)` + 칩 (`status` 힘셈/소외, 보통은 칩 없음) | 승인 막대 (−20~+20, 0 가운데, 음수 `neg`·양수 `pos` 색) + 숫자 (`toFixed(1)`) | 기분 칩 (`mood`) | 회원 수.
  3. 줄을 누르면 펼침: 승인 셋 `parts` (법 입장 / 법 바꾸기 / 생활수준, 각 `toFixed(1)`), 법 입장 넷 `stance` (세법·투자법·복지법·투표법, −2~+2 를 아이콘이나 부호 숫자로), `pending` 이 0 이 아니면 "바뀌면" + 부호 숫자.
  4. 설명 문구는 넣지 않는다 (라벨·숫자·막대만, 툴팁 가능).
- 넣지 않는 것 (단계 2 전): 법 버튼 옆 "바뀔 확률" 과 찬반 집단. `lawChance` 는 있지만 지금은 법이 확률로 바뀌지 않는다.
- 문자열 (ko/en): "정치"/"Politics", "투표법"/"Voting law" (투표법 이름은 `VOTING_NAMES`), 집단 이름은 `IG_NAMES`, "영향력"/"Clout", "승인"/"Approval", "회원"/"Members", "힘셈"/"Powerful", "소외"/"Marginalised", "성남"/"Angry", "불만"/"Unhappy", "중립"/"Neutral", "만족"/"Happy", "충성"/"Loyal", "법 입장"/"Stances", "법 바꾸기"/"Law changes", "생활수준"/"Living standard", "바뀌면"/"If enacted".
- 완료 기준: 왕국마다 영향력 % 합 100 (반올림 ±1). 승인 숫자 = `parts` 셋의 합을 ±20 으로 자른 값. 같은 날 사전 `interest-groups` live 값과 같다. typecheck.

### 2-89. 복지 상한 (wt-welfarefill, DESIGN 9.5, DECISIONS 7-47, 사전 `welfare`, sim 준비됨, 이슈 #9)
- 규칙: 복지는 하루에 지난주 세입의 단계 × 40% ÷ 7 까지만 쓴다 (`TUNE.welfareCap` 기본 2). 넘으면 받는 사람마다 같은 비율로 줄인다.
- sim: `welfareCapDaily(k, step?)` (`packages/sim/src/welfare.ts`, 하루 상한. 끄면 `Infinity`, 첫 주는 0). 주간 값은 × 7. `welfareWeekly(k, law, step)` 은 이미 상한을 넘지 않으므로 미리보기 숫자는 저절로 바뀐다.
- 화면 (라벨·숫자만, 설명 문구 없음):
  1. 정책 창의 복지 줄과 예산 미리보기의 복지 줄에 "상한"/"Cap" 라벨 + 지금 단계의 주간 상한 숫자 (소수 둘째 자리까지).
  2. 단계 1~5 버튼 툴팁에 그 단계의 주간 상한 (`welfareCapDaily(k, step)` × 7).
  3. `Infinity` 면 상한 줄을 숨긴다.
  4. 복지 내역 `drillWelfare`: 상한이 기본 켬이라 지역 줄 합(상한 전 필요액)이 줄 값보다 크게 많고, 그 차이가 '평활 차이' 로 보인다 (`FinancePanel.tsx:38`, 도움말이 이동평균 차이라고 말해 틀린 뜻이 된다). 복지 내역에서는 이 줄 이름을 "상한으로 줄인 몫"/"Cut by cap" 으로 바꾼다.
- 완료 기준: 단계를 바꾸면 상한 숫자가 단계에 비례해 바뀌고, 지난주 복지가 상한을 넘지 않는다.

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- **2-59 주 단위 수지 (요청됨, 2026-10-22):** `BuildingEcon`에 `week: { sales, tax, inputs, wages, profit }` (건물 `revenue`·`tax`·`inputCost`·`wageCost`의 이동평균 × 7, `profitEma`와 같은 기간). 들어오면 2-59-3 폭포 라벨을 `/주`로. (2026-11-02 wt-uiapi 보류: 지금 건물에 있는 이동평균은 `profitEma`·`firmEma`(왕실 생산 건물·건축사무소만) 뿐이라 매출·세금·원료비·임금 이동평균을 건물 상태에 새로 저장해야 한다. 읽기 전용이 아니고 골든이 바뀐다.)
- **2-49 (선택):** 회수 자재 lot에 `buildingId`를 넣고 `salvageOf(w, b)` export. (2026-11-02 wt-uiapi 보류: `SalvageLot` 에 저장 칸을 더해야 해 읽기 전용이 아니다.)
- **2-17 정리 (UI 반영 끝, 2026-10-21 확인):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`setResearchBudget`·`MAX_RESEARCH_BUDGET`·`Company.distressWeeks`를 더 쓰지 않는다 (grep 0건). sim은 `compat.ts`의 이 껍데기를 지워도 된다. 100배 값 사본(2-27)은 2026-10-22 클라이언트 전환 완료. UI_DONE의 근거 참조.
- **2-74 경보 키 (선택, 2026-11-01):** `GameEvent.key?: string` = `alertOnce`가 쓰는 키 (`economy.ts:906~915`, wt-batch2 86dcebc 줄 번호, 예 `unpaid:<건물 id>`). 없으면 화면이 회사·건물·지역·글로 키를 만든다. (2026-11-02 wt-uiapi 보류: 저장되는 `GameEvent` 에 칸을 더해야 해 읽기 전용이 아니다.)
- **2-72·단위 F 인두세 부담 (2026-11-01):** S3 안에 직종별 부담률(걷힘 ÷ 세금·복지 전 소득, 05 L-S1)을 읽는 함수. 05 C-2 결정 뒤.
- **오버홀 1a·1b 선행 (09 7.1 S1~S8, 2026-11-01 옮김):** S1 몫의 장부(단위 D), S2 분해 체인(E), S3 1차 효과 미리보기·바닥 전후 값(F), S4 `GameEvent` 종류 코드·숫자 칸(L), S5 슬롯 메타(M), S6 사전 "처음 하는 법"·말단 항목 id 테스트(G), S7 출생·사망·순이주 월 지표(L), S8 노드 월 경계 기록(L). 정의는 09 7.1.
- 이미 export되는 것: `paysDividend`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`, `peasantSlots`, `disbanded`, `slots`, `harvestCondition`, `harvestLabel`, `HARVEST_KINDS`, `taxRates`, `taxCapacity`, `holdingsOf`, `levelOwnersOf`, `buildingEcon` (2-59, wt-regionecon), `RESERVE_SHARE`, `KEEP_SHARE`, `budgetPreview`, `reserveCap`, `hasReserve`, `weeklyOutputValue`, `creditLimit`, `isGovernment`, `crewOf`, `wealthOf`, `literacyOf`, `educationOf`, `wagesAt`, `subsistenceWage`, `wealthDrivers`, `projectedSD`, `currentSD`, `mainOutput`, `quakeAt`, `quakeLabel`, `regionUnemployment`, `marketWageTargets`·`WageTarget` (2-86, wt-uiapi)
