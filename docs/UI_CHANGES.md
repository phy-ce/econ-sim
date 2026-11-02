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

### 우선순위
깨진 화면
- 2-78 코드 완료: officeLoad를 실제 투입량에 반영하고 사무소/그룹 가동 비율 표시. UI_DONE 참조.
- 2-69(왕실 임금 읽기 전용)는 코드 완료 (`e1d700f`, 화면 미검증, UI_DONE).
- 2-81 코드 완료: 방식 비교 wagesAt·왕국 지역 임금 범위·왕국 실업률, 왕실 읽기 전용. UI_DONE 참조.
- 2-80 코드 완료: 지역 시장 임금 × 단계, AI 웃돈은 있을 때만 식에 반영(2-84). UI_DONE 참조.

사용자 요청
0. **2-77 코드 완료**: 6bf2b2d 및 후속 최소크기 보강. UI_DONE·UI_STATUS의 헤드리스 확인 근거 참조.
1. **서브윈도우 이력 잔여**: 코드 완료, 화면 미검증. UI_DONE의 2026-11-01 내부 경로 명세 참조.
2. **2-51 클라이언트 공통 흐름 코드 완료**: 상세·상회 요약·그룹 합계·건설·방식 비교 공통 FlowRow. 사전 패키지 라벨은 수정 범위 밖. UI_DONE 참조.
3. **건물 그룹 (2-42·2-59)**: 서비스 합계·일간 폭포·미지정 배당 코드 완료(28df87c). 주간 폭포 내역은 막힘(sim week API 대기).
4. **철거 진행 (2-49)**: 일정·남는 레벨·취소 코드 완료(895f1de). 회수 자재는 막힘(SalvageLot buildingId 없음, 3장 요청).

오버홀 1a 단위 (09 7.2 순서 K → C → H → J)
5. **K 코드 완료**: 013001e (UI_DONE 참조).
6. **C 코드 완료**: 2822912 (UI_DONE 참조).
7. **H 코드 완료**: 8919ade (UI_DONE 참조).
8. **J 코드 완료**: 10db9d2 (UI_DONE 참조).

sim 변경 반영 (main c952e65, wt-labor 병합: 지역 시장 임금·저축의 부 반영)
9. **2-79 지역 시장 임금 표**: 지역 개요에 직종별 `Region.wages`·`wageAvg`·`stateWages`·실업 + 소작 1인 소득 (소작 줄만 sim 대기: `subsistenceWage` export).
10. **2-75 공급 ÷ 수요**: sim 대기 풀림 (`projectedSD`·`currentSD`·`mainOutput`이 main에 들어왔다). 절 본문대로 진행.
11. **2-83 재해 칩 (낮음)**: `quakeChance` 기본 0이라 지금은 안 보인다. 사건 열은 이미 나온다. 소작지 행·지역 머리 칩만.
12. **2-84 코드 완료**: 국영 임금 식에 웃돈이 있으면 표시. 별도 지역 표 열은 만들지 않음(선택 사항). UI_DONE 참조.
12b. **2-85 저택 지분 (wt-manor, `TUNE.manorShares` 켜졌을 때만)**: 저택 창 주인 목록을 금융가처럼 지분 수로 (`ownershipPortfolio.ts ownershipPeople` 저택 갈래), 지분 값·수익률 한 줄, pop 창 보유 지분에 저택 지분. 끈 동안은 화면이 그대로다.

정리
13. **2-50 코드 완료**: 6c8119a (UI_DONE 참조).
14. **왕국 통계·정책·연구·재정·에셋 감사** (2-35 코드 완료, UI_DONE; 2-26·2-28·2-34 완료; 2-30·2-60·2-31 코드 완료; 2-37 완료; 2-36·2-39 완료; 2-45·2-56 기술 링크·전환 상태·세율·투자 직종 보완, 전환 사건 화면 검증 잔여; 2-54 완료, UI_DONE): 1·2장 옛 절과 지금 코드를 대조. 오래된 목록만 보고 미구현/완료로 단정하지 않는다.

sim 대기 · 결정 대기
- **2-33 지도 정점 분포**: 연속 보간 구현. seed42·360일 부1.14~1.27/생활수준1.07~1.24가 고정 첫 정점2 아래에 몰림. 고정 정점 유지와 가운데 정점에 모이게 하라는 옛 요구의 범위 재선택은 결정 대기(UI_STATUS).
- **저축과 부 이동 (2-82)**: pop 상세의 부 이동 요인 표 (소득·현물·저축 몫·지금/다음 단계 생활비). sim 대기 (3장 `wealthDrivers`). 지금 할 일 없음.
- **인두세 부담 미리보기 (2-72 2항)**: 결정 대기 (05 C-2 세율 재교정·상한) + sim 대기 (S3). 지금 할 일 없음.

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
- 화면 미검증: 소유권 혼합·극소 지분 및 기관 소멸, OwnerSummary 전 경로, 모든 서브윈도우/정렬/상세 탭·툴팁 조합, 지도 전체 레이어·에셋. 2-76 첫 언어 선택·2-68 계통도·인구/토지/교육 이력·왕국 경제·재정의 주요 헤드리스 확인 범위는 UI_STATUS의 최신 기록/스크린샷 경로를 따른다.
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

### 2-32. 저택·금융가가 무엇을 가졌는지 (소유 관계 보기, 사용자 요청 2026-10-21)

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
- 실제 배당 필드는 들어왔다: `buildingEcon(w, b).owners[].dividendWeek` (2-59). 3번 칩은 2-59-3 주인 표가 대신하고, 1번 표의 `배당/주` 열은 2-59-5. (원문) 들어올 변경: 건물 유보 자산(2-31)이 들어오면 배당은 "이익 − 유보 적립"이 된다. 그때 표의 주간 이익 열 옆에 실제 배당을 따로 줄 수 있게 sim에서 필드를 더하고 이 절을 고친다.

### 2-33. 부·생활수준 지도는 끊기지 않는 그라데이션 (사용자 요청 2026-10-21)
**문제:** `RegionMap.tsx` 46~52행 `WEALTH_STEPS`가 4단계라 지역 색이 뚝뚝 끊긴다 (5.9와 6.0이 전혀 다른 색, 4.1과 5.9는 같은 색).
- `wealthColor(v)`를 연속 보간으로 바꾼다. 지금 네 색을 정점으로 그대로 쓴다: 값 2 `#b8573b` → 5 `#d9a35b` → 7.5 `#a9b38a` → 11 `#5f8592` (지금 구간의 가운데 값). 범위 밖은 양 끝 색으로 고정한다.
- 보간은 RGB 직선 대신 OKLab(또는 `color-mix(in oklab, …)`)으로 해서 가운데가 탁해지지 않게 한다. 함수 하나로 만들어 막대·칩에서도 같이 쓴다.
- 정점 값은 고정이다. 지금 화면에 보이는 지역의 최소·최대로 범위를 잡지 않는다 (틱마다 색이 바뀌어 비교가 안 된다).
- 생활수준(`sol`) 레이어는 지금 부와 같은 단계를 쓰고 있다. 생활수준 값의 범위가 부와 다르면 정점 값만 따로 둔다 (`SOL_STOPS`, 색은 같게). 두 레이어의 실제 분포를 한 번 찍어 보고 대부분 지역이 가운데 두 정점 사이에 오게 정한다.
- 범례(160~162행): 칸 네 개 대신 `linear-gradient` 막대 하나, 아래 눈금은 정점 값 네 개(양 끝은 `≤2`, `≥11`처럼).
- 지역 목록 표의 부·생활수준 칸에도 같은 색을 작은 점이나 배경 띠로 쓰면 지도와 맞춰 읽기 쉽다 (선택).
- sim 변경 없음.

### 2-40. 규칙 사전 (2026-10-21, 급하지 않음)
- 데이터: `@econ/sim`의 `ENCYCLOPEDIA`(항목 79개), `ENC_CATEGORIES`(10개), `SEEN_IN`(창 이름), `fillText`, `defaultCtx`, `ENC_BUILDINGS`.
  항목 = `id, category, title{ko,en}, rule{ko,en}, formula?, params[{label, value(), unit}], example?() → {inputs, steps, result}, live?{pick, run(world, ctx)} → {rows, bars}, related, seenIn, source, design`.
  `rule`·`formula`의 `{0}`, `{1}`은 `params` 값이다 (`fillText(text, entry, format)`). 단위(`unit`): florin, pct(×100 %), x, day, week, people, pt, level, good.
- 단독 앱 `packages/encyclopedia` (Vite + React, 포트 5200, `npm run encyclopedia`): 왼쪽 분류·검색, 오른쪽 규칙·공식·값·예시·지금 게임(워커에서 도는 세계, 날짜 슬라이더·+30일·+1년·시드)·관련·보이는 곳. 테마는 CSS 변수(`:root[data-theme='dark']`), 언어 ko/en.
- 게임에 옮길 때: `src/components/*`(Sidebar, EntryView, LivePanel, Bars, Rows, ExampleView)는 작고 `@econ/sim`만 쓴다. 지금 게임 패널은 게임 화면의 `world`를 그대로 넘기면 워커가 필요 없다 (`LivePanel`의 `live.world` 자리).
- 딥링크: `…/encyclopedia/#price-formula`. 게임 창의 도움말 아이콘이 항목 id로 열면 된다. 항목의 `seenIn` 키(map, region, market, resource, pops, workforce, company, finance, alerts, charts)는 창 이름이다. 창 id와 다르면 `SEEN_IN`을 맞춰 달라고 3장에 적어 달라.
- GitHub Pages: `/econ-sim/encyclopedia/`에 함께 올린다 (`pages.yml`).

---

### 2-42. 지역 건물: 종류별 한 줄 + 전체/민영/국영 보기, 건설 통합 (사용자 요청 2026-10-21)

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

### 2-43. 지도 다시 그리기: 생성 이미지 + 지역 경계 벡터 (사용자 요청 2026-10-21)

> 2026-10-24 적용: 최신 사용자 지시에 따라 풍경 삽화 대신 단순한 평면 지도, 아이콘은 첨부 참조의 선명한 카툰 양식으로 교체했다. 아래 옛 그림체 프롬프트보다 최신 지시를 우선한다. 구현·규격·검증 범위는 [UI_ATLAS_2026-10-24.md](log/UI_ATLAS_2026-10-24.md), 실제 프롬프트는 `packages/client/public/ASSETS.md` 참조.

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

### 2-45. 정책 창 (세법·투자법, 사용자 요청 2026-10-21, 일부 sim 쪽 필요)

> 현재 상태 (2026-10-28): API 대기 해제: policyStatus export와 PolicyPanel 구현 존재. 아래 초기 두 세법/전환 없음 설명은 최신 시스템으로 간주하지 않는다. 기능별 검증 필요.
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
  | 잠김 (2-56) | `disabled`, 흐리게, 자물쇠 아이콘(lucide `Lock`) + 여는 기술 이름 (`TECH_BY_ID[o.tech].name`) | 없음 (툴팁 `기술: 이름`, 누르면 연구 창으로 가도 된다) |
- 전환 중에는 다른 선택지를 모두 `disabled`로 둔다 (취소만 된다). 전환 중에는 지금 법이 그대로 적용된다 (7-18).
- 전환 중 행 (2-56): 진행 막대 옆에 지금 비율 / 필요 비율 `금융가 NN% / NN%`. `pendingOk === false`면 막대와 숫자를 `neg` 색 (지금 끝나면 실패한다는 뜻). 기간이 끝날 때 조건이 안 맞으면 바뀌지 않고 지금 법이 남는다 (소식 `lawFailed`). 다시 누르면 다시 시작한다.
- 조건 미달 툴팁: `금융가 NN% / 필요 NN%`. 세법 선택지 툴팁: 그 법의 세율 (`taxRates(k, law)`: 토지세 = 소작농 1인당 ƒ, 인두세 = 1인당 ƒ, 소득세 = %).
- 확인 창은 두지 않는다 (전환 중 취소가 되므로).

#### 2-45-3. 세법
- 선택지: `토지세 / Land tax`, `인두세 / Poll tax`, `소득세 / Income tax`. 시작은 토지세. 조건은 sim이 준다 (예 인두세 30%, 소득세 60%, 비교로 정함 — 화면에 숫자를 박지 않는다). 순서 상관없이 기술로 열리고(2-56) 조건이 맞으면 고른다.
- **지금 할 수 있는 것:** 창을 만들고 `FinancePanel.tsx` 20의 `select`와 세율 문구를 이 섹션으로 옮긴다. 지금 sim은 `TaxLaw = 'land' | 'capita'` 둘이고 전환 없이 바로 바뀐다: 두 행 모두 "고를 수 있음", 조건 칸 비움. 3장 필드가 들어오면 세 행·조건·진행 막대로 바꾼다.
- 재정 창 20행에는 세법 칩 하나만 남긴다 (`토지세` + 전환 중이면 작은 진행 막대, 누르면 `showWindow('policy')`).

#### 2-45-4. 투자법 (금융가 지분을 살 수 있는 사람, sim 쪽 필요)
- 선택지 넷 (넓어지는 순): `귀족만 / Nobles only` (시작) → `상층 평민까지 / + Upper commoners` (전문가) → `중층까지 / + Middle` (기술자) → `하층까지 / + Lower` (노동자·농부). 행 툴팁에 포함 직종 아이콘.
- 넓히는 쪽은 기술로 열린 뒤(2-56) 조건(금융가 비율 ≥ 그 행의 값)이 맞아야 하고, 좁히는 쪽은 조건 없이 된다. 둘 다 6개월 전환.
- 조건 숫자는 행마다 `≥ NN%`, 위의 지금 비율과 비교된다 (값은 비교 실행으로 정함, sim이 준다).
- sim에 들어오기 전에는 섹션을 그리지 않는다.

#### 2-45-5. 소식
- 전환이 끝나면 sim 소식 `GameEvent.topic === 'lawChanged'`(바뀜, `info`) 또는 `'lawFailed'`(실패, `warn`, 문구에 금융가 비율 / 필요 비율)를 띄운다. 누르면 정책 창 (`eventDestination.ts`에 `topic`이 있으면 `policy` 목적지).
- 문자열: `policy` 정책 / Policies, `taxLawTitle` 세법 / Tax law, `investLaw` 투자법 / Investment law, `landTax`·`pollTax`·`incomeTax`(있는 것 재사용), `investNobles`·`investUpper`·`investMiddle`·`investLower`, `budgetSteps` 예산 단계 / Budget levels, `financeShare`(2-44).

### 2-46. 지역 창 하나로: 개요·인구·건물 (사용자 요청 2026-10-21)

> 현재 상태 (2026-10-28): 구현: 지역 창 개요·인구·건물 탭 통합. 최신 개요는 장부형이며 신규 구현 대상으로 다시 시작하지 않는다.
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

### 2-48. 연구 트리: 선행 관계 그래프 + 무엇이 열리는지 (사용자 요청 2026-10-21)

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

### 2-52. 아이콘 에셋을 지도와 같은 양식으로 ChatGPT에서 만들기 (사용자 요청 2026-10-21)

> 2026-10-24 적용: 최신 사용자 지시에 따라 풍경 삽화 대신 단순한 평면 지도, 아이콘은 첨부 참조의 선명한 카툰 양식으로 교체했다. 아래 옛 그림체 프롬프트보다 최신 지시를 우선한다. 구현·규격·검증 범위는 [UI_ATLAS_2026-10-24.md](log/UI_ATLAS_2026-10-24.md), 실제 프롬프트는 `packages/client/public/ASSETS.md` 참조.

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

> 현재 상태 (2026-10-28): 대체됨: 좌우 고정·최대 두 창·크기 조절 일괄 금지 요구는 최신 자유 이동 창 요구로 폐기. 아래 원문은 역사적 참고이며 새 작업의 기준이 아니다.
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
5. **순위 (`BottomPanel.tsx` 55~71):** 4열. `table-layout:fixed`, 상회 칸 46%, 배지는 `max-width:100%;overflow:hidden;text-overflow:ellipsis`.
6. **소식 (`Notifications.tsx` 51~):** `<h2>{T.news}</h2>` (53) 삭제 (탭 제목과 중복). 필터 칩과 `모두 읽음`을 한 줄 (`.notices-head {flex-wrap:nowrap}`, 칩 `min-height:24px;font-size:10px`). 창 안에서는 `.events {max-height:none;overflow:visible}` (`styles.css` 448, `.bell-panel`처럼 184). 행: 아이콘 26px, 본문 11px 두 줄까지 (`-webkit-line-clamp:2`, 전체는 `title`), 메타 줄(날짜·상회 배지·지역·건물)은 `flex-wrap:nowrap;overflow:hidden`이고 상회 배지는 아이콘+짧은 이름.
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

### 2-55. 세법 셋·투자법·금융가 펀드·지대·귀족 자리 (2026-10-21, DECISIONS 7-16~7-19 2~4단계)
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

### 2-56. 법은 기술로 열리고, 끝날 때 조건을 다시 본다 (2026-10-22, 사용자 규칙, DECISIONS 7-18·7-19)
**사용자 말:** "원래 정책은 기술로 먼저 열고, 조건이 맞으면 플레이어나 AI가 바꿔서 그때 조건이 맞으면 바뀌는거임".
- 규칙: 법 선택지마다 1) 여는 기술(`LAW_TECH`, `data.ts`) 2) 시작 조건(금융가 자산 비율 ≥ 기준) 3) 180일 전환 4) 끝날 때 조건이 아직 맞아야 바뀜, 아니면 실패하고 지금 법이 남는다. 토지세·귀족만은 처음부터 열림. 투자법 좁히기는 조건 없음.
- sim API:
  - `policyStatus(world, kingdomId)` 선택지(`LawOption`)에 `tech: string | null`(여는 기술 id), `unlocked: boolean`. `eligible`은 이제 `unlocked && 조건`. `LawStatus.pendingOk?: boolean` (전환 중일 때만: 지금 끝나면 바뀌는가).
  - `lawUnlocked(world, kingdom, law)`, `LAW_TECH: Record<TaxLaw | InvestLaw, string | null>`.
  - `unlocksOf(techId)` → `{ methods: { typeId; methodId }[]; buildings: string[]; policies: (TaxLaw | InvestLaw)[] }` (3장 2-48 요청분).
  - 명령 오류: 잠긴 법이면 `그 세법은 아직 기술로 열리지 않았습니다.` / 조건 미달이면 지금 문구.
  - 소식: `GameEvent.topic?: 'lawChanged' | 'lawFailed'`. 실패 소식은 `kind: 'warn'`.
  - `Kingdom.lawFail?: { tax?: number; invest?: number }` (실패한 틱, AI 쿨다운용. 화면에 안 써도 된다).
- 화면 (2-45-2 표의 `잠김` 행, 전환 중 행, 2-45-5 소식, 2-48 정책 줄): 위 절에 적었다. 조건 숫자는 `threshold`, 지금 값은 `financeRatio` 하나.
- 클라이언트 컴파일 수정 없음 (화면이 `policyStatus`를 아직 안 쓴다).

### 2-57. 복지법·복지 단계 (최저 생활수준 보장, 사용자 요청 2026-10-22)
**사용자 말:** "최저 생활수준을 타겟(예: 3)해서 보장하는 정책을 여러 개 만들어서 고를 수 있게 해 줘 (+ AI가 상황에 맞게 정책을 고르도록)".

- sim 변경 (DESIGN 9.5):
  - 복지법 `WelfareLaw = 'none' | 'poor' | 'wage' | 'universal'` (`WELFARE_LAWS`), 필드 `Kingdom.welfareLaw` (시작 `'none'`), 명령 `{ type: 'setWelfareLaw', law }`. 세법·투자법처럼 `TUNE.lawDays`(180)일 전환 (`Kingdom.lawChange.welfare = { to, startTick, endTick }`), 지금 법과 같은 값을 보내면 전환 취소. 조건 없이 늘 고를 수 있다.
  - 정책 단계 넷째 손잡이 `welfare` (`BUDGET_ITEMS = ['tax','wages','research','welfare']`, `Kingdom.budget.welfare` 1~5, 시작 3). 단계의 값은 배율이 아니라 **목표 생활수준** `TUNE.welfareLevels` = 2 / 2.5 / 3 / 3.5 / 4.
  - `budgetPreview` 줄에 `welfare` (지출, 0 이하, `knob: 'welfare'`, `byLevel` 단계 1~5). `netByLevel.welfare`. 복지법이 `'none'`이면 0. `Kingdom.lastBudget.welfare`, 장부 `Company.ledger.welfare`(왕실).
  - `policyStatus(w, kingdomId).welfare` = `{ current, pending?, options: { id, threshold: null, eligible: true, weekly }[] }`. `weekly` = 그 법을 지금 복지 단계로 켰을 때의 주간 예상액 (0 이하, 100·10 단위로 둥글게).
  - export: `welfareTarget(step)`, `welfareGroup(pop)` (`'poor'|'wage'|null`), `welfareCovers(law, group)`, `welfareIncome(region, target)`, `welfareWeekly(kingdom, law, step)`. 저장 10판.
- 화면 작업자가 할 일:
  1. **정책 창 (2-45) 복지법 섹션** `welfareLaw`: 2-45-2 `LawPicker` 그대로. 행 넷 `없음 / None`, `구빈법 / Poor laws`, `임금 보조 / Wage subsidies`, `보편 보장 / Universal welfare`. 조건 칸 대신 그 법의 주간 예상액 (`options[].weekly`, `signedMoney`, 0이면 비움). 전환 중이면 진행 막대 + `n일`. 행 툴팁: 받는 직종 아이콘 (구빈법 = 소작농 + 실업, 임금 보조 = 노동자·농부·기술자·전문가, 보편 = 둘 다. 귀족·자본가는 없음).
  2. **재정 창 예산 표** (2-60-2의 복지 묶음으로 대신한다. 툴팁 내용만 여기 것): `FinancePanel.tsx` 17의 지출 묶음 키 목록에 `'welfare'`를 더해 `복지 / Welfare` 줄을 그린다 (문자열 `budgetLines.welfare`). 단계 버튼 1~5 툴팁은 배율 `×` 대신 `목표 생활수준 3` 처럼 `TUNE.welfareLevels[level-1]`을 보인다 (`복지 3 · 생활수준 3 · −12,300 · 순수지 …`). 복지법이 `'none'`이면 줄은 0이고 버튼은 그대로 둔다 (법을 켜기 전에 단계를 정할 수 있다).
  3. 정책 창 아래 읽기 전용 칩(2-45-1)에 `복지 3`을 더한다.
  4. 소식: 전환이 끝나면 sim 이벤트 `복지법이 바뀌었습니다: poor` (`topic: 'lawChanged'`) (2-45-5와 같은 처리, 법 이름으로 바꿔 보이기).
- 문자열: `welfareLaw` 복지법 / Welfare law, `welfareNone`·`welfarePoor`·`welfareWage`·`welfareUniversal` (위 이름), `budgetLines.welfare` 복지 / Welfare, `welfareTarget` 목표 생활수준 / Target SoL.

### 2-58. sim 저장값 반올림 없앰 (2026-10-22, 사용자 확인: 소수 둘째 자리는 보이는 값에만)
- sim 이 하루 끝에 모든 숫자를 소수 둘째 자리로 맞추던 일(`roundWorld`)을 없앴다. 저장값은 계산한 double 그대로다.
- 100배 저장 필드(`wealth100`·`literacy100`·`education100`·`exp100`·`crew100`)를 없앴다. 화면이 읽던 이름이 그대로 규칙 값이 된다:
  `Pop.wealth` 1~99, `Pop.literacy` 0~1, `Region.education` 0~1, `Building.crew` 0~1 (없으면 충원율), `Building.exp` 0~1 (새 이름, 화면은 안 씀). `wealthOf`·`literacyOf`·`educationOf`·`crewOf`·`expOf`는 그대로 있다.
- 여전히 소수 둘째 자리인 것: `history`·`metrics` 기록, `Kingdom.lastBudget`, `Kingdom.investmentPool`, 회사 임금(`wages`). 예산 미리보기는 둥근 수.
- 그 밖의 숫자(가격, 저축, 인구, 생활수준 `Pop.sol`·`growth`, 시장 이동평균 등)는 끝자리가 길 수 있다. 화면에서 숫자를 그대로 문자열로 찍는 곳이 있으면 형식을 붙인다. 확인한 곳(`App.tsx` 140, `CompanyPanel.tsx` 140·600, `RegionPanel.tsx` 149, `PopTable.tsx` 37)은 이미 `NumericValue`·`toFixed`를 쓴다.
- 없어진 export: `roundWorld`, `roundingDrift` (화면은 안 씀). 새 모듈 export (index에는 없음, 화면은 안 씀): `CARGO_MIN` (market.ts), `toward` (pops.ts, `weekToward` 대신).
- `Pop.fund` 모양이 바뀌었다 (저장 11판): `{ id: number[]; u: number[] }` (id 오름차순, u[i] = id[i] 금융가 지분 수). 지분 주인 수는 `pops.filter(p => p.fund?.id.includes(b.id))`. 타입 `FundUnits`.
- 저장 형식 12판. 10·11판 저장은 `migrateWorld`가 바꿔 불러온다 (저장 키 `estera-save-v7`은 바꿀 필요 없다). (wt-regionecon 이후 13판: 화면 전용 기록만 더했다. 12판도 그대로 불러온다)
- 규칙 사전: `rounding` 항목이 "보이는 소수 자리"로, `idle-market`(거래 없는 시장)·`trade`(화물 1단위 아래면 없어짐)·`literacy`(매일 움직임) 문구가 바뀌었다.

### 2-59. 지역 건물의 수지·지분·배당 (사용자 요청 2026-10-22)
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

#### 2-59-2. 목록 행 (440 px 창, 2-53)
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
### 2-63. 방식 사다리와 1레벨 약 500명 (2026-10-22, 사용자 결정, DESIGN 7.1)
- 모든 건물의 방식이 바뀌었다 (`data.ts BUILDING_TYPES`). 기본 방식 1레벨은 일꾼 약 500명(옛 1,000명)이고 산출도 약 절반이다. 단계가 오를수록 일꾼은 줄고 기술자·전문가와 공구·석탄·철·기계가 늘며, 레벨당 이익은 단계마다 2배다.
- 새 방식: 방직 공장 `textile_spin` (방적기, 철 가공). 방직 공장 방식 순서가 손베틀·방적기·증기 직기·맞춤 재단·증기 재단으로 바뀌었다 (방식 id는 그대로). 철·석탄 광산 방식 이름: `iron_shaft`·`coal_shaft` "곡괭이와 삽 / Picks and shovels", `iron_pick`·`coal_pick` "발파 / Blasting".
- 기본 방식 대부분이 공구를 10~30 쓴다 (광산 30, 2-64) (투입·산출 표시 2-51에 공구가 새로 보인다). 소작지가 공구를 낸다 (`SUBSISTENCE.output.tools`). (2026-10-23 sim 변경, DECISIONS 7-25: 소작지는 이제 곡물·술·의복·목재만 내고 가구·공구는 내지 않는다. 화면은 산출 키를 그대로 읽으면 따로 고칠 것이 없다.)
- 숫자가 바뀐 상수: `SUBSISTENCE.workersPerCell` 500, `OWNER_SEATS_PER_LEVEL` 5, `TUNE.financeStaff` 1, `START_OFFICE_LEVELS` 20, `MAX_LEVELS_PER_PROJECT` 100, 공사 포인트(`buildPoints`) 200~550 (2-64에서 바뀜), 건축사무소 목조 2점·비계 4점·철골 6점. 공사 레벨 입력 칸 상한이 50으로 박혀 있으면 `MAX_LEVELS_PER_PROJECT`를 읽는다.
- 이익률 막대(사전 `methods-rule`)는 이제 최대 약 55%라 눈금 상한을 0.6으로 했다.

### 2-64. 산업 유형 라벨과 방식 숫자 (사용자 요청 2026-10-22, DESIGN 7.1, 브랜치 wt-ind2)
- 새 sim 값 (`data.ts`): 타입 `Industry = 'primary' | 'processing' | 'heavy' | 'luxury'`, `INDUSTRIES[id]` (`name` 한국어 1차 산업·가공·중공업·숙련, `nameEn` Primary·Processing·Heavy industry·Skilled crafts, 기본 일꾼 `workers`, 숙련 비율 `skillShare`, 원료/매출 범위 `inputShare`), `BuildingTypeDef.industry`, `MethodDef.industry`(방직·가구 공방의 사치품 방식만), 함수 `industryOf(typeId, methodId?)` (없으면 null: 소작지·저택·금융가·학교·건축사무소·행정청).
- 화면 요청:
  1. 건물 상세 머리와 건설 카드에 유형 라벨 한 칸 (`INDUSTRIES[industryOf(b.typeId, b.methodId)].name`). 방직·가구 공방은 방식에 따라 라벨이 바뀐다 (손베틀 = 가공, 맞춤 재단 = 숙련).
  2. 방식 비교(2-51 열 비교)에 행 하나: 원료/매출 막대 (기본가 기준 원료비 ÷ 매출, 0~1). 사전 `methods-rule` live 가 같은 값을 쓴다 (`methodMarginAtBase(typeId, methodId)`의 `input / revenue`).
  3. 지역 건물 목록·새 건물 목록에 유형으로 묶거나 거르는 칩 (선택, 급하지 않음).
  설명 문구는 넣지 않는다 (규칙은 README·사전).
- 바뀐 숫자: 가공·중공업·숙련 기본 방식 일꾼 300 (옛 400), 가공 공장 원료·산출 약 2배 (예: 식료품 곡물 1,300 → 2,600, 식료품 2,150 → 2,650), 벌목·광산 일꾼에 기술자 50, 1차 윗단계 일꾼 350·200. 공사 포인트: 식료품·가구·종이 250 → 300, 공방 200 → 300, 운송 200 → 350, 제철소 300 → 500, 기계 공장 300 → 550 (`buildPointsOf`). 화면이 숫자를 박아 두었으면 데이터에서 읽는다. 방식 id·기술 연결은 그대로.

### 2-65. 국영 임금은 정부 건물만, 왕실 생산 건물은 시장 임금 (사용자 결정 2026-10-23, DECISIONS 6-2, DESIGN 7.3·9.2, 브랜치 wt-statewage)
- 2026-11-02 상태: 1항(왕실 슬라이더)은 2-69가 뒤집었다 (플레이어 왕실 `setWage`·`setWageOffset`은 오류, `commands.ts:148~161`). main c952e65부터 지역 시장 임금이 기본이라 아래 "AI `adjustWages`가 매주 움직인다"·"국영 임금 = 기본 임금 × 임금 지수 × 단계"는 지금 규칙이 아니다 (`ai.ts:87`은 `wageMarket` 0일 때만). 남은 일은 2-79~2-81로 옮겼다. 이 절은 원문 보관용이다.
- sim에서 바뀐 것:
  - `Company.wages`: 모든 회사의 생산 건물 임금표. 왕실도 생산 건물(농장·공장·무역 등)은 이것을 준다. AI 왕실은 민간과 같은 규칙(`adjustWages`)으로 매주 움직인다.
  - 새 칸 `Company.stateWages?` (왕실만): 국영 임금표 = 기본 임금 × 임금 지수 × 국영 임금 단계 배율. 정부 건물(행정청·건축사무소·학교)만 이것을 준다. 건물 하나의 실제 임금표는 새 export `wagesAt(company, typeId)`.
  - `setWage`·`setWageOffset`이 왕실에도 된다 (예전에는 오류). 플레이어 왕실은 시장임금 정책 +0% (`wageOffset` = 모두 0)으로 시작한다.
  - 예산 미리보기: `stateFirms` 줄의 왕실 생산 건물 임금은 지금 임금(단계와 상관없음), 건축사무소 임금만 국영 임금 단계를 따른다. `budgetDrill` `stateFirms` 행의 `wages`도 같다. `firmWages`(옛 사본)는 생산 건물 임금 + 그 단계의 사무소 임금.
  - 지표 `KingdomMetrics.wageUnskilled`·`wageSkilled`는 국영 임금(`stateWages`) 그대로.
  - 저장 17판 (16판까지는 `wages`를 `stateWages`로 베낀다).
- 화면에서 할 일:
  1. 임금 탭 (`CompanyPanel.tsx` 444~470 `Wages`): 458의 `!me.state &&` 를 지워 왕실도 직종별 슬라이더(시장 임금 대비 −50~+100%)를 쓴다. 값과 시장 임금·실업 막대는 그대로.
  2. 같은 탭 아래에 왕실(`me.state`)일 때만 국영 임금 줄: 직종별 `me.stateWages[s]` (슬라이더 없음, 단계는 재정 창 국영 임금 손잡이). 라벨은 `T.govWages`(이미 있는 문자열 '정부 임금'/'Government wages')를 써도 된다.
  3. 회사 요약의 임금 칸(`CompanyPanel.tsx` 149~153)은 그대로 `c.wages` (생산 건물 임금).
  4. 건물 상세에서 건물 임금을 보이는 곳이 있으면 `wagesAt(owner, b.typeId)[s]`로 읽는다 (정부 건물은 국영 임금).
  5. 재정 창 국영 임금 묶음 툴팁·자세히 보기: 왕실 생산 건물의 임금은 단계 버튼으로 바뀌지 않는다 (값은 `budgetDrill`이 이미 그렇게 준다).
  설명 문구는 넣지 않는다 (규칙은 README·사전).

### 2-66. 술·기호품·양조장 (사용자 요청 2026-10-23 "술을 만드는 건 괜찮은 것 같은데", DESIGN 4·5·7.1, 브랜치 wt-liquor2)
- 새 sim 값 (`data.ts`): `GoodId`에 `'liquor'` (`GOODS.liquor`: 술 / Liquor, 기본가 3, `GOOD_IDS` 맨 끝), `NeedId`에 `'intoxicants'` (`NEEDS` 맨 끝: 기호품 / Intoxicants, 선택지 술 하나),
  건물 `distillery` (양조장 / Distillery, 가공, 공장 부지, 포인트 300): 방식 `liquor_pot` 단식 증류 / Pot stills (기술 없음), `liquor_column` 연속식 증류 / Column stills (기술 `food_machinery`).
  소작지 수확(`SUBSISTENCE.output`)에 술이 들어간다. 조정값 `TUNE.intoxLinear` (기호품 필요 계수, 식량 필요에서 같은 만큼 빠진다).
- 옛 저장: `migrateWorld`가 지역 시장에 술을 기본가로 넣는다 (판 번호는 그대로).
- 화면 요청:
  1. 아이콘: `spriteAtlas.ts` 13의 `aliases`에 `liquor`(예: `food`)와 `distillery`(예: `foodplant`)를 넣거나 새 그림. 지금은 별칭이 없어 빈 그림일 수 있다.
  2. 상품을 `GOOD_IDS`·`GOODS`로 돌며 그리는 곳(시세 창, 지역 시장, 건설 카드 원료·산출)은 저절로 술이 나온다. 상품 목록을 손으로 적은 곳이 있으면 술을 더한다.
  3. 필요를 `NEEDS`로 돌며 그리는 곳(pop 필요·충족 막대)은 저절로 기호품이 나온다. 손으로 적은 목록이 있으면 기호품을 더한다.
  설명 문구는 넣지 않는다 (규칙은 README·사전).

### 2-67. 무역소 (사용자 승인 설계 2026-10-23, DESIGN 6 교역·8, 브랜치 wt-trade)
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
1. **복지 다이얼은 복지법이 없으면 아무 일도 안 한다 (지금 할 일, 2-71과 같이).**
   - 사실: 플레이어 왕국의 복지법은 시작부터 `none` (`world.ts:173`). `welfareCovers('none', g)`는 어느 무리도 덮지 않아 (`welfare.ts:25~27`) 복지 단계 `k.budget.welfare`는 읽히지 않는다 (`welfare.ts:87~88`). 0b (main be7e72f, 20년 × 시드 1·2 × salt 0..3)에서 복지 단계 1과 5의 결과가 기준선과 같았다.
   - 지금 화면: `FinancePanel.tsx:34` 복지 줄의 단계 버튼 1~5가 늘 눌리고, 눌러도 수지가 0으로 그대로라 왜 안 바뀌는지 읽히지 않는다.
   - 바꿀 것 (추천안): `k.welfareLaw === 'none'`이면 복지 줄의 단계 버튼 다섯 개를 `disabled`로 (지금 단계는 눌린 모양 그대로 회색). 줄 머리에 잠금 칩 하나: 자물쇠 아이콘 + `{S.welfareLaw}: {법 이름}` (법 이름은 PolicyPanel이 쓰는 `names[st.welfare.current]`). 칩을 누르면 국가 창 법 탭, 분야 `welfare` 선택. 툴팁은 라벨만 ("복지법: 없음").
   - 이유: 움직여도 결과가 0인 손잡이는 읽히지 않는다 (0B 2.4 해석). 규칙은 바꾸지 않는다. 버린 안: 버튼은 살리고 수치 0만 보이기 (법을 고르기 전에 단계를 미리 정할 이유가 작고, 눌러도 안 바뀌는 혼동이 남는다). 사용자가 반대하면 버린 안으로 바꾼다.
   - 데이터: `world.kingdoms.find(k => k.id === me.kingdomId).welfareLaw` (`WelfareLaw`), 법 이름은 `policyStatus(world, kingdomId).welfare`.
   - 문자열: 새 문자열 없음 (복지법 라벨·법 이름 재사용).
2. **인두세에는 플레이어 쪽 부담 상한이 없다 (결정 대기, 단위 F의 재료).**
   - 사실: `setTaxLaw`는 기술 해금과 금융가 자산 비율만 본다 (`commands.ts:249~255`). 소득 대비 30% 상한(`pollTaxIncomeCap` 0.3)은 AI 판단에만 있다 (`ai.ts:343~344`). 0b (같은 조건, 인두세를 개발용으로 강제)에서 시드 1의 5년차 총생산이 13.6 (대조 101~122), 노동자 세금 ÷ 소득이 0.70~0.97까지 올랐다. 플레이어 왕국은 고정 연구 순서에서 5.7~6.3년차에 인두세를 열었다.
   - 화면이 할 것: 지금은 없다. 단위 F(1차 효과 미리보기)의 "부담률" 줄(05 L-S1: 걷힘 ÷ 세금·복지 전 소득, 직종별)이 이 값을 보인다. 결정 대기: 05 C-2 (`pollTax` 세율 재교정 또는 "인두세는 소득의 30%까지" 정책 예외, 사용자 결정). sim 대기: S3 (3장).
   - 화면 쪽에서 미리 계산식을 만들지 않는다 (sim 함수가 생기면 그것을 읽는다).

### 2-75. 공급 ÷ 수요: 건설 카드의 지금·예상 값, 시장 창 열, AI 문턱 눈금 (오버홀 03 5-1·5-2·6장, sim 대기 풀림: main c952e65)
- 2026-11-02 갱신: wt-0bp 가 wt-labor 를 거쳐 main 에 들어왔다 (c952e65). 아래 sim 줄 번호는 main 기준으로 고쳤다: `projectedSD` `economy.ts:584`, `currentSD` `:600`, `mainOutput` `:609`, TUNE `aiGlutSD` `data.ts:667` (기본 1.5), `aiCutSD`·`aiDemoSD` `:673~674` (기본 0), `aiExitWeeks` `:675`. 클라이언트 줄 번호도 지금 기준: `BuildCard` `CompanyPanel.tsx:414`, 시장 창 정렬 `MarketWindow.tsx:40`, 공급/수요 열 `:57`. 본문의 옛 줄 번호(`:506`·`:532~`·`:56` 등)는 이 줄로 읽는다.
- sim (원문: 브랜치 wt-0bp `cd97f1b` 기준으로 쓴 설명, 함수 뜻은 main 과 같다):
  - `projectedSD(w, regionId, g, addOutput = 0): number | null` (`economy.ts:506`): (지역 공급 이동평균 `market[g].supplyEma` + 그 지역에서 g를 내는 모든 회사의 공사 중 레벨 산출 + `addOutput`) ÷ 지역 수요 이동평균 `demandEma`. 공사 중 레벨 산출 = 공사마다 레벨 수 × 그 방식의 g 산출 × (1 + `regionPerk(regionId, typeId)`). 수요 이동평균 ≤ `FLOW_ZERO`(1e-6)이면 `null`. 세계를 바꾸지 않는다. AI 증설 검사와 같은 함수다.
  - `currentSD(w, regionId, g): number | null` (`:522`): `supplyEma ÷ demandEma` (공사 중 제외). 같은 `null` 규칙.
  - `mainOutput(typeId, methodId): GoodId | null` (`:531`): 그 방식의 산출 중 기본가로 잰 값이 가장 큰 상품 (산출이 없으면 `null`).
  - 단위: `supplyEma`·`demandEma`는 지역 합계 하루 양의 이동평균, S/D는 단위 없는 비율.
  - 조정값 (`TUNE`, `data.ts:590~601`): `aiGlutSD` 1.5 = AI가 증설을 멈추는 예상 S/D. `aiCutSD`·`aiDemoSD` = AI가 가동률을 줄이기 / 1레벨 헐기 시작하는 지금 S/D (기본 0 = 끔), `aiExitWeeks` 26 = 그 상태가 이어져야 하는 주.
- 화면:
  1. **건설 카드** (`BuildCard`, `CompanyPanel.tsx:532~`): 방식 목록 아래 한 줄 "공급 ÷ 수요". 상품 `g = mainOutput(bt.id, m.id)`, 방식 `m = availableMethods(me, bt.id)[0]` (`build` 명령이 방식을 안 주면 쓰는 것, `commands.ts:122`). `g`가 없으면 (학교·행정청·건축사무소 등) 줄을 그리지 않는다. 레벨당 산출 `per = getMethod(bt.id, m.id).outputs[g] × (1 + regionPerk(region.id, bt.id))`. 숫자 셋: 지금 `currentSD(world, region.id, g)`, +1 `projectedSD(world, region.id, g, per)`, +5 `projectedSD(world, region.id, g, 5 × per)` (카드의 짓기·+5 버튼과 같은 N). 소수 둘째 자리. `null`이면 "—".
  2. **막대**: 위 숫자 옆에 로그 눈금 막대 하나 (0.25 ~ 4, 위치 = (log2(x) + 2) ÷ 4, 범위 밖은 끝에 붙임). 눈금 0.5 · 1 · 2 (가운데 1, 03 6장). 지금 값은 채운 점, +1·+5 뒤 값은 빈 점. 1보다 크고 작음에 좋음/나쁨 색을 쓰지 않는다 ("과잉" 같은 말도 쓰지 않는다, 03 6장).
  3. **AI 문턱 눈금 (추천안)**: 같은 막대에 `TUNE.aiGlutSD` 눈금 (> 0일 때), `aiCutSD`·`aiDemoSD`는 > 0일 때만. 눈금 툴팁은 라벨과 숫자만: "AI 증설 멈춤 1.50" / "AI stops expanding 1.50", "AI 감축 시작" / "AI starts cutting", "AI 철거 시작" / "AI starts demolishing". 이유: 같은 지역의 AI가 언제 증설을 멈추는지는 플레이어의 짓기 판단 재료이고, 값은 사전(`ai-reserve`·`ai-construction` live)에 이미 공개된 AI 상수다. 09 3.4가 막는 것은 특정 시드에서 잰 레버 반응 부호이지 규칙 상수가 아니다. 반대하면 눈금을 빼고 숫자만 둔다 (사용자 결정 필요 없음으로 봄).
  4. **줄 툴팁**: 공급 `supplyEma`, 수요 `demandEma` (하루 양, compact)와 지금·+1·+5 세 비율. 라벨과 숫자만. 공사 중 산출은 화면에서 다시 계산하지 않는다 (+N 값에 이미 들어 있다).
  5. **지역 건물 증설 버튼** (`CompanyPanel.tsx:416~419`의 + / +5): `title`(툴팁)에 "공급 ÷ 수요 1.23 → 1.31". 상품 `mainOutput(b.typeId, b.methodId)`, 레벨당 산출은 `b.methodId` 기준으로 1.과 같다.
  6. **시장 창 상품 줄 (추천안)**: `MarketWindow.tsx:56`의 `balance` 열(공급 − 수요, 양)을 "공급 ÷ 수요" 열로 바꾼다. 지역 범위는 `currentSD`, 왕국·세계 범위는 합산 시장(`marketScope.ts:16~19`)의 Σ`supplyEma` ÷ Σ`demandEma` (Σ수요 ≤ `FLOW_ZERO`면 "—"). 칸 = 숫자 + 작은 로그 막대(2.과 같은 눈금, AI 눈금 없음). 정렬 키 `balance` → 이 비율 (`MarketWindow.tsx:39`). 이유: 양의 차이는 상품끼리 견줄 수 없고, 03 6장이 기본 열을 "값과 공급 ÷ 수요"로 정했다. 지역 개요 시장 표(`RegionPanel.tsx:142` 공급 / 수요 숫자)는 그대로.
- 보이지 않는 것: `Region.cutWeeks`·`demoWeeks`(AI 내부 셈), 증설이 막혔다는 표시.
- 문자열: "공급 ÷ 수요"/"Supply ÷ demand", "지금"/"Now", "+1", "+5", "공급"/"Supply", "수요"/"Demand", 위 AI 눈금 셋.
- 완료 기준: 카드의 세 숫자가 같은 날 `projectedSD`/`currentSD` 직접 호출 값과 같다 (소수 둘째 자리). 수요 0 상품은 "—". 다크 모드에서 점·눈금이 구분된다. 420×560에서 넘침 없음 (ko/en). typecheck.
- 사용자 결정이 필요한 것: 없음 (3·6항은 추천안, 반대하면 바꾼다).

### 2-79. 지역 시장 임금 표 (main c952e65, wt-labor 병합, DESIGN 7.3, DECISIONS 7-32·7-38, 사전 `market-wage`)
- sim에서 바뀐 것: `TUNE.wageMarket` 1이 기본이다. 지역마다 직종마다 시장 임금이 하나 있고, 그 지역의 모든 임금 건물(왕실 생산 건물 포함)이 그 값을 준다 (`labor.ts:436 updateMarketWages`, `economy.ts:349 wagesAt`). AI 임금 판단(`ai.ts:87 adjustWages`)은 돌지 않는다. (wt-wagelag 부터 AI 민간 상회 건물은 시장 임금 × (1 + `Company.aiPremium[지역 id].off[직종]`) 를 준다. 건물 임금을 보일 때는 `Region.wages` 가 아니라 `wagesAt(c, b.typeId, w, b.regionId)` 를 읽는다, 사전 `ai-wage-premium`).
- 쓸 필드 (모두 1인 하루 ƒ, 지역 값):
  - `Region.wages?: Record<Skill, number>` (`types.ts:527`): 지금 시장 임금. 날마다 맞는 임금 쪽으로 차이의 `wageTargetSpeed` 만큼 움직인다 (2026-11-02 wt-wagespeed, DESIGN 7.3 '목표 임금'; 그 전에는 하루 최대 ±0.25% `wageMarketRate`). 저장값은 반올림하지 않는다.
  - `Region.wageAvg?: Record<Skill, number>` (`:529`): `wages`의 52주 이동평균 (`WAGE_AVG_DAYS` 364일, 날마다 1/364씩 다가감). AI 투자 판단 임금.
  - `Region.stateWages?: Record<Skill, number>` (`:531`): 그 지역 정부 건물(행정청·건축사무소·학교)의 국영 임금 = `wages` × 국영 임금 단계 배율, 매주, 소수 둘째 자리로 저장 (`finance.ts:147~151`).
  - 소작 1인 소득: `subsistenceWage(w, r)` (`labor.ts:93`). 소작농 1인 하루 소득 가치 (판매 대금 − 지대·토지세 + 쓴 현물, 기상 조건 포함). 노동자·농부 시작 임금과 고용 0 대체값의 기준 (× `switchPremium` 1.1). **sim 준비됨 (`subsistenceWage`, wt-sim2).**
  - 실업: `regionUnemployment(world, r.id, s)` (`economy.ts:726`, 0~1, 노동 인구 기준).
  - 세 `Region` 칸은 `wageMarket` 0이거나 옛 저장의 첫날이면 없다 (`undefined`).
- 지금 화면: 지역 시장 임금이 어디에도 없다. 지역 개요 칸(`RegionPanel.tsx:96~113`)에는 임금이 없고, 재정 창의 `Wages`(`CompanyPanel.tsx:326~349`)가 보이는 "시장임금"은 `marketWage(world, s, me.id)` (`economy.ts:716`) = 세계 전체(다른 왕국 포함) 회사들의 고용 가중 평균이라 어느 지역의 지급액도 아니다 (2-81).
- 바꿀 것:
  1. 지역 개요 원장 `RegionExplorer.tsx:35~38` (교육 `DetailWindow` 다음)에 `DetailWindow` 하나: 제목 "임금", 요약 `ƒ{r.wages.unskilled}` (노동자 시장 임금). `r.wages`가 없으면 이 창을 그리지 않는다. 다른 왕국 지역도 그대로 보인다 (읽기 전용).
  2. 창 안 맨 위 칸 하나: "소작 1인 소득" `ƒ` 값. 툴팁: "노동자 ÷ 소작 x.xx" (`r.wages.unskilled ÷ 소작 1인 소득`). sim export가 들어오기 전에는 이 칸을 그리지 않는다.
  3. 그 아래 표: 행 = `SKILLS` 순서 7개 (`ClassSprite` + 직종 이름), 열 = 시장 임금 `r.wages[s]` · 52주 평균 `r.wageAvg?.[s]` · 국영 `r.stateWages?.[s]` (없으면 "—") · 실업 (퍼센트 + `Bar tone="neg" size="sm"`). 정렬 없음. 칸마다 툴팁은 정확한 값 (`NumericValue`가 이미 한다).
  4. 값 표시는 `NumericValue format="money"` (100 아래 소수 둘째 자리). 시장 임금과 52주 평균의 차이에 좋음/나쁨 색을 쓰지 않는다.
  5. 소작 1인 소득은 가격·기상 조건에 따라 날마다 바뀐다. 화면은 주가 바뀔 때만 다시 센다 (`Math.floor(world.tick / 7)`을 키로 기억). 시장 임금 셋은 날마다 그대로 읽는다 (하루 변화가 작다).
- 문자열 (ko/en): "임금"/"Wages", "시장 임금"/"Market wage" (`T.marketWage` 재사용 가능), "52주 평균"/"52-week avg", "국영"/"State", "소작 1인 소득"/"Tenant income / head", "실업"/"Unemployment" (재사용), 툴팁 "노동자 ÷ 소작"/"Labourer ÷ tenant".
- 빼는 것: 없음.
- 완료 기준: 같은 날 표의 값이 `r.wages`·`r.wageAvg`·`r.stateWages`를 소수 둘째 자리로 반올림한 값과 같다. `TUNE.wageMarket = 0` 세계에서 창이 없다. 420×560 창에서 다섯 열이 넘치지 않는다 (ko/en). 다크 모드에서 실업 막대가 보인다. typecheck.
- 사용자 결정: 필요 없음. 자리는 추천안이다: 지역 개요가 지역 사실을 모으는 곳이고 시장 임금은 지역 값이다. 노동 상세(`Workforce.tsx`)는 건물 하나의 일꾼 표라 지역 표를 넣을 자리가 아니다.

### 2-82. 저축과 부 이동 (main c952e65, DESIGN 5장 부 이동, DECISIONS 7-37·7-38, sim 준비됨 (`wealthDrivers`, wt-sim2))
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
- sim: `TUNE.quakeChance` 기본 0 (`data.ts:633`)이라 지금 게임에서는 재해가 나지 않는다. 켜면 지역마다 해마다 그 확률로 지진·홍수가 나고, 그 지역 소작지 칸의 `quakeLoss`(반올림)가 `quakeYears`년 동안 소작농을 받지 못한다.
  - `quakeAt(w, regionId): Quake | null` (`economy.ts:208`): `{ kind, regionId, loss (0~1), start, end }` (틱). `quakeLabel(w, regionId, en)` (`:227`): "지진 소작지 −25% (3칸) · 1080일" / "Earthquake tenant land −25% (3 cells) · 1080 d" (지역 이름 없음), 재해가 없으면 `null`.
  - 시작하는 날과 끝나는 날 사건 (`production.ts:28`, `logEvent` kind `warn`, `regionId` 있음). 사건 열(`Notifications.tsx`)에는 이미 그대로 나온다. 할 일 없음.
- 화면:
  1. 소작지 행 (`FlowRow.tsx:29`의 `HarvestBadge` 옆)과 지역 머리 (`RegionPanel.tsx:85` `HarvestBadge` 옆)에 칩 하나: `quakeAt`이 있을 때만. 경고 아이콘 + `−{pct(q.loss)} · {q.end − world.tick}일`. 툴팁 = `quakeLabel(world, regionId, lang === 'en')` 전체.
  2. 색은 `harvest-badge`의 나쁜 조건 색과 같은 계열 (다크 모드 구분).
- 문자열: "일"/"d" (기존 날 단위 재사용). 종류 이름과 문장은 `quakeLabel`이 준다.
- 완료 기준: `TUNE.quakeChance = 1` 개발 세계 2년차에 칩이 나오고 사건 열 문장과 같은 % · 남은 날. 0이면 칩 없음. typecheck.

### 2-85. 저택 지분 (wt-manor, DESIGN 9.3 `manorShares`·`absenteeShare`·`manorBuyScope`, 사전 `manor-shares`, DECISIONS 7-44)
- 상태: sim 은 스위치 뒤에 있다 (`TUNE.manorShares` 기본값은 HANDOFF 0-1102h 참조). 켜지 않으면 화면이 바꿀 것은 없다. 클라이언트 코드는 sim 작업자가 고치지 않았다.
- sim:
  - 저택 지분은 금융가 지분과 같은 `Pop.fund` (`{ id: number[]; u: number[] }`, 건물 id 오름차순) 에 든다. 저택 id 와 금융가 id 는 겹치지 않는다. 한 pop 이 여러 저택(다른 지역·다른 왕국 포함)과 금융가 지분을 함께 가질 수 있다.
  - 저택 지분 값: `Building.nav` (저택에도 생긴다, 매주). 지분 주인 = 저택 id 지분이 0 보다 큰 pop (상급·하급 귀족, 되사기 전의 다른 직종이 잠깐 있을 수 있다). 저택에 앉은 pop 은 상급 귀족뿐이고, 앉은 자리는 몫과 상관없다.
  - 하급 귀족은 저택에 앉지 않는다. 일자리가 없는 하급 귀족은 실업(`work === 0`)이고 배당으로 산다 (실업률에 들어간다).
  - `TUNE.absenteeShare` > 0 이면 다른 지역 건물의 배당 일부가 그 건물 지역 저택으로 간다. `Building.payout.paid` 에 그 저택 id 줄이 생긴다 (배당 기록과 같은 모양).
- 화면:
  1. 저택 창 주인 목록 (`packages/client/src/ownershipPortfolio.ts:4 ownershipPeople`): 지금은 `b.typeId === 'finance'` 일 때만 지분 수를 쓰고 저택은 `p.work === b.id ? p.size * shareWeight(p.prof) : 0` 이다. `TUNE.manorShares` 가 켜져 있으면 저택도 금융가처럼 `p.fund` 의 지분 수를 무게로 쓴다 (`TUNE` 은 sim export). 끄면 지금 식 그대로.
  2. 저택 창 머리 한 줄: 지분 합, 지분 값(`b.nav`), 지분 1개당 주간 배당 (사전 `manor-shares` live 와 같은 값). 라벨만, 설명 문구 없음.
  3. pop 창(또는 계층 표)의 보유 지분: 저택 지분도 금융가 지분처럼 건물 이름·지역과 지분 수·값(지분 × nav)으로. 다른 왕국 저택이면 왕국 이름.
  4. 실업 표에서 하급 귀족을 따로 볼 수 있게 (선택): 지분을 켜면 하급 귀족 실업률이 70~90% 로 보인다 (배당으로 산다). 실업률에는 하급 귀족을 그대로 넣는다 (DECISIONS 7-44 결정 2, 사용자 2026-11-02).
  5. `OwnerSummary` 'nobleSeats' 라벨: 상급 귀족 자리만 남는다 (하급 귀족 자리 없음).
- 문자열: "지분"/"Units", "지분 값"/"Unit value", "수익률"/"Yield" (이미 있으면 그것). 완료 기준: typecheck. 낮은 우선순위 (기본 끔이면).

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- **2-59 주 단위 수지 (요청됨, 2026-10-22):** `BuildingEcon`에 `week: { sales, tax, inputs, wages, profit }` (건물 `revenue`·`tax`·`inputCost`·`wageCost`의 이동평균 × 7, `profitEma`와 같은 기간). 들어오면 2-59-3 폭포 라벨을 `/주`로.
- **2-49 (선택):** 회수 자재 lot에 `buildingId`를 넣고 `salvageOf(w, b)` export.
- **2-17 정리 (UI 반영 끝, 2026-10-21 확인):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`setResearchBudget`·`MAX_RESEARCH_BUDGET`·`Company.distressWeeks`를 더 쓰지 않는다 (grep 0건). sim은 `compat.ts`의 이 껍데기를 지워도 된다. 100배 값 사본(2-27)은 2026-10-22 클라이언트 전환 완료. UI_DONE의 근거 참조.
- **2-74 경보 키 (선택, 2026-11-01):** `GameEvent.key?: string` = `alertOnce`가 쓰는 키 (`economy.ts:765~773`, 예 `unpaid:<건물 id>`). 없으면 화면이 회사·건물·지역·글로 키를 만든다.
- **2-72·단위 F 인두세 부담 (2026-11-01):** S3 안에 직종별 부담률(걷힘 ÷ 세금·복지 전 소득, 05 L-S1)을 읽는 함수. 05 C-2 결정 뒤.
- **오버홀 1a·1b 선행 (09 7.1 S1~S8, 2026-11-01 옮김):** S1 몫의 장부(단위 D), S2 분해 체인(E), S3 1차 효과 미리보기·바닥 전후 값(F), S4 `GameEvent` 종류 코드·숫자 칸(L), S5 슬롯 메타(M), S6 사전 "처음 하는 법"·말단 항목 id 테스트(G), S7 출생·사망·순이주 월 지표(L), S8 노드 월 경계 기록(L). 정의는 09 7.1.
- 이미 export되는 것: `paysDividend`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`, `peasantSlots`, `disbanded`, `slots`, `harvestCondition`, `harvestLabel`, `HARVEST_KINDS`, `taxRates`, `taxCapacity`, `holdingsOf`, `levelOwnersOf`, `buildingEcon` (2-59, wt-regionecon), `RESERVE_SHARE`, `KEEP_SHARE`, `budgetPreview`, `reserveCap`, `hasReserve`, `weeklyOutputValue`, `creditLimit`, `isGovernment`, `crewOf`, `wealthOf`, `literacyOf`, `educationOf`


- K(2-70): 코드 완료, 화면 미검증. UI_DONE 참조.


- 진행 C(2-71·2-72 1항): 국가 예산/법 탭 통합, 외부 링크 탭 목적지, 복지법 없음 잠금. 본문/명령 재사용.


- 진행 H(2-73): 지역 칩·짓기/대기열·지도 선택 연동·BuildList 재사용.


- 진행 J(2-74): 워커 틱 경계 목표 정지, 이유 칩, 위험 에피소드 35틱 거르기. sim 파일 변경 없음.


- 진행 2-50 잔여: 옛 상회 저택·금융가 행을 OwnerSummary/자리/금고 전용으로 분기.

