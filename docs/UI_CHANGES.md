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

## 0. 지금 할 일 — 2026-11-05

상태와 검증 범위는 [UI_STATUS.md](UI_STATUS.md). 과거 우선순위 원문은 [보관 파일](log/UI_BACKLOG_ARCHIVE_2026-10-28.md).
화면 작업자(Codex)는 사람처럼 브라우저를 쓰지는 못하지만, 2026-11-01부터 헤드리스 Edge/Chrome 스크린샷으로 화면을 확인한다 (UI_DESIGN 12장). 스크린샷으로 본 항목은 그 사실과 파일 이름을 적고, 보지 못한 항목만 "화면 미검증"을 붙여 UI_DONE으로 옮긴다. 남은 화면 검증은 맨 아래 "검증" 줄에 모은다.

### 최신 적용 기준
- 좌우 고정 두 자리/최대 두 창 규칙은 폐기. 여러 주 창 자유 이동, 창별 독립 탐색 이력.
- 대상 화면 1920×1080, 시각 테스트는 브라우저 CSS viewport 1920×1028. 창 이동 경계는 그 안에서 상단 바·도크를 뺀 workspace 실측값. 화면 외곽 해상도와 CSS viewport를 혼동하지 않는다.
- 기본 주 창 420×560 CSS px 상한, 장부형 정보 밀도. 상세는 이동·크기 조절 가능한 서브윈도우(DetailWindow)와 툴팁.

### 우선순위 (2026-11-05, main 0e00385 클라이언트 코드 대조. 끝난 절은 UI_DONE "2026-11-05 확인")
깨진 화면
- **2-82**: pop 상세에 부 이동 표가 두 번 나온다 (`BuildingPops.tsx:36`·`:46`). `:46` 을 지운다. 그 밖은 없음 (코드 대조 기준).

sim 변경 반영 (2026-11-05: wt-luxmix, 사용자 확인 전이라 main 에 없다)
0. **2-91 혼합 방식 (새)**: 산출이 둘인 방식의 공급 ÷ 수요 미리보기를 상품마다.

sim 변경 반영 (2026-11-05: wt-welfarefill)
1. **2-89 복지 상한 (새)**: 정책 창·예산 미리보기 복지 줄에 상한 숫자, `welfareCapDaily` × 7, 라벨과 숫자만. 복지 내역의 '평활 차이' 를 "상한으로 줄인 몫" 으로.

사용자 요청 잔여 (절 맨 위 "2026-11-05 반영 확인" 줄만 하면 된다)
2. **2-55**: 인구 표 직종 고르기에서 자본가 빼기.
3. **2-62**: 목록 행 비용 막대 툴팁의 사무소 매출을 "공사 수수료"로.
4. **2-83 재해 칩 (낮음)**: `quakeChance` 기본 0이라 지금은 안 보인다.

정리
5. 죽은 코드·문자열: 옛 `Research` 컴포넌트, `dailyBudget`·연구 장부 문자열 (2-61). 빈 파일 `windowGeometry.ts`·`windowLayout.ts`, `App.tsx:35` 옛 주석 "하루 24초" (UI_DESIGN 9·10장).

sim 변경 반영 (wt-batch2: wt-ig 이익집단 읽기 전용 층, main 병합 뒤)
6. **2-88 정치 창 (낮음)**: 왕국 이익집단 6줄 (영향력·승인·기분), 투표법 라벨. 읽기 전용, 효과 없음.

sim 대기 · 결정 대기
- **플레이어 왕실 국영 웃돈**: 사용자 결정 대기 (DECISIONS 7-42 결정 대기 1). (b)로 정해지면 새 절. 지금 할 일 없음.
- **2-33 지도 정점 범위**: 결정 대기 (UI_STATUS). 연속 보간은 끝남.
- **2-59 주간 폭포 / 2-49 회수 자재**: sim 대기 (3장).
- **2-72 2항 인두세 부담**: sim 대기 (S3). 05 C-2 는 2026-11-05 `pollTax` 0.1 로 결정 (DECISIONS 7-50).
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
- 화면 미검증 (2026-11-05 옮긴 절, 근거는 UI_DONE 각 절): 2-32 혼합 지역·양수 배당, 2-42 광맥 줄·공사 상한, 2-48 연구 완료·모든 노드 툴팁, 2-51 다른 건물 방식, 2-64 비율 행, 2-67 약정금 납부·환급·영문 상세, 2-75 실제 짓기·전 상품, 2-79 AI 웃돈 툴팁, 2-85 AI 왕실 웃돈·소작지 줄, 2-86 주간 경계, 2-87 배당 지급·지분 매매.
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

### 2-33. 부·생활수준 지도는 끊기지 않는 그라데이션 (사용자 요청 2026-10-21)
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 결정 대기만 남음: 정점 범위 (seed42·360일 실제 값이 첫 정점 아래에 몰림, UI_STATUS). 연속 보간은 됨 (`RegionMap.tsx:24~26`, 범례 `:87~88`). 지역 목록 점(선택 항목)은 하지 않아도 된다. ebac485 는 지도 윤곽·휠 확대 수정이라 이 절과 상관없다.
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

### 2-49. 철거 중인 건물이 무엇을 하고 있는지 보이기 (사용자 요청 2026-10-21)
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 화면 쪽은 끝났다: 망치 아이콘 + 대기 레벨 `DemolitionBadge.tsx:4~6` (행 `RegionIndustry.tsx:60`, 상품 관련 행 `ResourceInspector.tsx:82`, 지도 `RegionMap.tsx:77`·`:81`), 레벨 막대·다음 철거·취소 `DemolitionProgress.tsx:7~15`. 남은 것은 3항 회수 자재뿐이고 sim 대기다 (3장, `SalvageLot` 에 `buildingId` 없음 `types.ts:343`). 지금 화면 작업자가 할 일은 없다.
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


### 2-55. 세법 셋·투자법·금융가 펀드·지대·귀족 자리 (2026-10-21, DECISIONS 7-16~7-19 2~4단계)
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 펀드 1좌 가치 `Building.nav` 는 됨 (금융가 상세 `OwnershipBrowser.tsx:37`, `ownershipPortfolio.ts:4`·`:7`). 남은 것: 인구 표 직종 고르기에 자본가가 남아 있다 (`PopTable.tsx:40` 이 `POP_CLASSES` 를 그대로 돈다, 자본가 계층은 없앴다).
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
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 화면 쪽은 끝났다: 목록 행 비용 막대 `BuildingCostBar.tsx:6~13` (`RegionIndustry.tsx:48`), 정렬 레벨당 이익·배당 `RegionIndustry.tsx:43`·`:53`, `RESERVE_SHARE` 툴팁 `ReserveBar.tsx:13`, `KEEP_SHARE` 툴팁 `BuildingEconomics.tsx:28`·`GroupDetail.tsx:37`, 충원 `econ.staffing` `ResourceInspector.tsx:42`. 남은 것은 주간 폭포뿐이고 sim 대기다 (3장 `BuildingEcon.week`). 지금 화면 작업자가 할 일은 없다.
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
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 정리만 남음: 안 쓰는 옛 `Research` 컴포넌트 (`CompanyPanel.tsx:451~480`, ƒ 비용·`dailyBudget` 표시, `App.tsx:30` 에서 import 만), 문자열 `dailyBudget` (`strings.ts:561`·`:1112`), 연구 장부 라벨·툴팁 (`strings.ts:316`·`:344`·`:877`·`:905`), 정책 도움말의 연구 말 (`strings.ts:309`·`:870`). 연구 창(`ResearchPanel.tsx:38`)은 끝남.
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
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 됨: 장부 라벨·툴팁 (`strings.ts:344`·`:313`·`:905`·`:874`), `budgetLines.fees` 지움, 상세 `day.fee`·`officeMargin` 툴팁과 "공사 수수료" 라벨 (`officeFees.ts:4~6`, `BuildingEconomics.tsx:26`, `GroupDetail.tsx:35`, `RegionIndustry.tsx:63`, 재정 `FinancePanel.tsx:70`). 남은 것: 목록 행 비용 막대 툴팁이 사무소 매출도 "판매"로 보인다 (`BuildingCostBar.tsx:10`, 2-62-3 첫 줄). `d.fee > 0` 이면 라벨을 `T.constructionFees` 로.
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

### 2-72. 0b 결과에서 화면이 알아야 할 것: 복지 다이얼, 인두세 부담 (docs/overhaul/0B_RESULTS.md 2.4·2.9·2.10)
- 2026-11-02: 1항(복지 다이얼 잠금)은 끝나 UI_DONE으로 옮겼다. 남은 것은 아래 2항(sim 대기)뿐이다.
2. **인두세에는 플레이어 쪽 부담 상한이 없다 (단위 F의 재료).**
   - 사실: `setTaxLaw`는 기술 해금과 금융가 자산 비율만 본다 (`commands.ts:249~255`). 소득 대비 30% 상한(`pollTaxIncomeCap` 0.3)은 AI 판단에만 있다 (`ai.ts:447~448`). 0b (그때 `pollTax` 0.6, 인두세를 개발용으로 강제)에서 시드 1의 5년차 총생산이 13.6 (대조 101~122), 노동자 세금 ÷ 소득이 0.70~0.97까지 올랐다. 플레이어 왕국은 고정 연구 순서에서 5.7~6.3년차에 인두세를 열었다.
   - 화면이 할 것: 지금은 없다. 단위 F(1차 효과 미리보기)의 "부담률" 줄(05 L-S1: 걷힘 ÷ 세금·복지 전 소득, 직종별)이 이 값을 보인다. 05 C-2 는 `pollTax` 0.1 로 결정됐다 (DECISIONS 7-50). sim 대기: S3 (3장).
   - 화면 쪽에서 미리 계산식을 만들지 않는다 (sim 함수가 생기면 그것을 읽는다).

### 2-82. 저축과 부 이동 (main c952e65, DESIGN 5장 부 이동, DECISIONS 7-37·7-38, sim 준비됨 (`wealthDrivers`, wt-sim2))
- **2026-11-05 반영 확인 (main 0e00385): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 1~4항은 됨 (`WealthDrift.tsx:7~20`, `wealthSummary.ts:3~7`, 칸 `BuildingPops.tsx:34`, 스크린샷 nov5-wealth-drift-ko-light.png·nov5-wealth-drift-en-dark.png·nov5-wealth-total-en-dark.png). 남은 것: 부 이동 표가 두 번 나온다 (`BuildingPops.tsx:36`·`:46`). `:46` 소득·세금 내역 안의 것을 지운다. 합 행 라벨이 `Σ` 다 (`WealthDrift.tsx:15`, 아래 문자열은 "합"/"Total"). 아래 "sim 쪽 필요 (3장)" 줄은 기록이다 (`wealthDrivers` 있음). 화면 미검증: 값이 0 이 아닌 부 변화의 다음 날 화면, 상층 pop 상세.
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

### 2-90. 저택 지분 값에 지대 (wt-manornav, DESIGN 9.3, DECISIONS 7-44, 사전 `manor-shares` 항목, main 합치기 전 사용자 확인 대기)
- API·타입 변화 없음. `Building.nav` 를 그대로 읽으면 된다. 저택 지분 값이 약 1.1~1.6 높아져 지분 평가액도 그만큼 크게 보인다. 이 평가액에는 현금이 아닌 지대 몫이 들어 있어, 금고보다 클 수 있다. 화면 코드는 고칠 것이 없다.

### 2-91. 혼합 방식: 산출이 둘인 방식 (wt-luxmix, DESIGN 혼합 방식, DECISIONS 7-52, 사전 `methods-rule`, sim 준비됨)
- sim: `textile_tailor`·`textile_tailor_steam`·`furniture_luxury`·`furniture_luxury_tools` 는 이제 산출이 둘이다 (`outputs` 에 사치품과 일반품). 방식 id·이름은 그대로라 저장 파일은 그대로 읽힌다.
- 고칠 곳: `supplyDemand.ts:7` `supplyDemandProjection` 은 `mainOutput` 하나만 보여 준다. 산출 상품마다 지금·+1·+5 레벨 값을 낸다 (`projectedSD(w, regionId, g, per)` 를 상품마다 부르면 된다). 한 줄에 합치려면 `methodSD` (기본가 가중)가 AI 가 보는 값이다.
- 건설 미리보기의 `outputPriceChange` 는 이제 대표 산출(`mainOutput`, 기본가 값이 큰 쪽)의 값이다. 그 전에는 `GOOD_IDS` 순서의 첫 상품이었다. 화면 할 일 없음.
- 그대로 되는 곳 (코드 대조): `CompanyPanel.tsx:65`, `FlowRow.tsx:19`, `MethodComparison.tsx:28`, `ResearchPanel.tsx:27` 는 산출을 상품마다 돈다.
- 완료 기준: 방직 공장 건설 미리보기에서 맞춤 재단을 고르면 의복과 고급 의복 S/D 가 둘 다 보인다. typecheck.

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- **2-59 주 단위 수지 (요청됨, 2026-10-22):** `BuildingEcon`에 `week: { sales, tax, inputs, wages, profit }` (건물 `revenue`·`tax`·`inputCost`·`wageCost`의 이동평균 × 7, `profitEma`와 같은 기간). 들어오면 2-59-3 폭포 라벨을 `/주`로. (2026-11-02 wt-uiapi 보류: 지금 건물에 있는 이동평균은 `profitEma`·`firmEma`(왕실 생산 건물·건축사무소만) 뿐이라 매출·세금·원료비·임금 이동평균을 건물 상태에 새로 저장해야 한다. 읽기 전용이 아니고 골든이 바뀐다.)
- **2-49 (선택):** 회수 자재 lot에 `buildingId`를 넣고 `salvageOf(w, b)` export. (2026-11-02 wt-uiapi 보류: `SalvageLot` 에 저장 칸을 더해야 해 읽기 전용이 아니다.)
- **2-17 정리 (UI 반영 끝, 2026-10-21 확인):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`setResearchBudget`·`MAX_RESEARCH_BUDGET`·`Company.distressWeeks`를 더 쓰지 않는다 (grep 0건). sim은 `compat.ts`의 이 껍데기를 지워도 된다. 100배 값 사본(2-27)은 2026-10-22 클라이언트 전환 완료. UI_DONE의 근거 참조.
- **2-74 경보 키 (선택, 2026-11-01):** `GameEvent.key?: string` = `alertOnce`가 쓰는 키 (`economy.ts:906~915`, wt-batch2 86dcebc 줄 번호, 예 `unpaid:<건물 id>`). 없으면 화면이 회사·건물·지역·글로 키를 만든다. (2026-11-02 wt-uiapi 보류: 저장되는 `GameEvent` 에 칸을 더해야 해 읽기 전용이 아니다.)
- **2-72·단위 F 인두세 부담 (2026-11-01):** S3 안에 직종별 부담률(걷힘 ÷ 세금·복지 전 소득, 05 L-S1)을 읽는 함수.
- **오버홀 1a·1b 선행 (09 7.1 S1~S8, 2026-11-01 옮김):** S1 몫의 장부(단위 D), S2 분해 체인(E), S3 1차 효과 미리보기·바닥 전후 값(F), S4 `GameEvent` 종류 코드·숫자 칸(L), S5 슬롯 메타(M), S6 사전 "처음 하는 법"·말단 항목 id 테스트(G), S7 출생·사망·순이주 월 지표(L), S8 노드 월 경계 기록(L). 정의는 09 7.1.
- **2-51 사전 라벨 (2026-11-05):** `packages/encyclopedia/src/strings.ts:11` `inputs` 한국어 `입력` → `투입`. 사전 패키지는 화면 작업자 범위 밖이라 여기로 옮겼다 (2-51 은 UI_DONE).
- 이미 export되는 것: `paysDividend`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`, `peasantSlots`, `disbanded`, `slots`, `harvestCondition`, `harvestLabel`, `HARVEST_KINDS`, `taxRates`, `taxCapacity`, `holdingsOf`, `levelOwnersOf`, `buildingEcon` (2-59, wt-regionecon), `RESERVE_SHARE`, `KEEP_SHARE`, `budgetPreview`, `reserveCap`, `hasReserve`, `weeklyOutputValue`, `creditLimit`, `isGovernment`, `crewOf`, `wealthOf`, `literacyOf`, `educationOf`, `wagesAt`, `subsistenceWage`, `wealthDrivers`, `projectedSD`, `currentSD`, `mainOutput`, `quakeAt`, `quakeLabel`, `regionUnemployment`, `marketWageTargets`·`WageTarget` (2-86, wt-uiapi), `welfareCapDaily` (2-89), `interestGroups` (2-88)
