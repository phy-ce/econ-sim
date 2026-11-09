# UI 수정 요청

화면 규칙은 [UI_DESIGN.md](UI_DESIGN.md)를 기준으로 읽는다. 이 문서는 화면 작업자가 할 일만 둔다.
구현·검증 기록은 [UI_STATUS.md](UI_STATUS.md), 끝난 절의 원문과 근거는 [UI_DONE.md](UI_DONE.md)에 있다. 절 번호는 `UI-n` 이다 (2026-11-09 사용자: 2-101 까지 번호가 너무 커져 남은 절을 UI-1 부터 다시 매겼다). 제목의 "옛 2-xx" 가 다른 문서의 옛 번호다. 끝난 2-xx 절은 UI_DONE 에 옛 번호 그대로 있다. 새 절은 다음 UI 번호를 받고, 옮겨도 번호를 바꾸지 않는다.

## 공통 규칙
- 화면에 설명 문구를 넣지 않는다. 아이콘, 색, 숫자, 짧은 이름만 쓴다. 툴팁은 써도 된다.
- 한국어와 영어 UI를 모두 지원한다. 문자열은 `strings.ts`의 `T`와 `lang` 방식을 따른다.
- `packages/sim`은 고치지 않는다. 필요한 export가 없으면 3장에 요청만 적는다.
- 다크 모드(`:root[data-theme="dark"]`)에서도 구분이 되어야 한다.
- 창과 해상도 규칙은 UI_DESIGN 1·3장을 따른다.
- 검증: 루트에서 `npm run typecheck`가 통과해야 한다. 개발 서버는 `cd packages/client && npx vite --port 5199`로 띄운다. 스크린샷 확인은 UI_DESIGN 12장을 따른다.
- 화면을 끝내면 근거와 본 범위를 UI_STATUS에 적는다. 스크린샷으로 본 항목은 파일 이름을 적고, 보지 못한 항목에만 "화면 미검증"을 붙인다.

## 0. 지금 할 일 — 2026-11-07

main `3f4e89a`와 main 체크아웃의 커밋 안 한 클라이언트 변경을 코드로 대조했다. 줄 번호는 따로 적지 않으면 그 작업 트리 기준이다.

### 할 일 (위에서부터)
5. **UI-5** (정리): `(22+2)` 표기를 지키고, 쓰지 않는 +1·+5 코드를 지운다.
6. **UI-6** (정리): 계층 생활수준 차트 범례에서 자본가를 뺀다.
7. **UI-7** (정리): 부 이동 표의 합 행 라벨 `Σ`를 `합`/`Total`로 바꾼다.
8. **UI-8** (정리): 왕실 공사 자세히 보기의 라벨 셋을 명세 이름으로 바꾼다.
9. **UI-9** (정리): 쓰지 않는 문자열 `adjustFinance`를 지운다.

UI-2 말고 새로 반영할 sim 변경은 없다.

### 대기
지금 할 일 없음. 풀리면 위 목록으로 올린다.

- **UI-10 지도 정점 범위**: 사용자 결정 대기 (DECISIONS 7-61 결정 대기 1).
- **UI-4 글자 크기**: 사용자 답 대기 (DECISIONS 7-61 결정 대기 3).
- **UI-11 주간 폭포**: sim 대기 (3장 `BuildingEcon.week`).
- **UI-12 회수 자재**: sim 대기 (3장 `SalvageLot.buildingId`).
- **UI-13 인두세 부담**: sim 대기 (S3, 단위 F).
- **UI-14 규칙 사전**: 단위 G로 넘어감 (sim S6).
- **화면 문구 줄이기**: Claude 가 문구 목록을 만들어 사용자 승인을 받은 뒤 새 절로 넘긴다 (DECISIONS 7-62). 숫자 색은 지금 규칙을 유지한다.
- **툴팁 안의 표·Base UI**: 사용자 결정 대기.
- **플레이어 왕실 국영 웃돈**: 사용자 결정 대기 (DECISIONS 7-42 결정 대기 1). (b)로 정해지면 새 절.
- **빈 파일 `windowGeometry.ts`·`windowLayout.ts`**: 호출 0건이다. 파일 삭제 금지 규칙 때문에 남겨 두었다. 사용자 결정 대기 (DECISIONS 7-61 결정 대기 2).

오버홀 단위 (09 7.2):
- A 상단 바 사람 칩 4: 칩 구성 04 S6·U11 결정, 단위 P의 상단 바 폭 실측 뒤.
- B 기본 자리·도크 재편: 단위 P의 창 폭 W 실측 뒤. 장부·기록 창(D·L)도 아직 없다.
- D 장부 창: sim S1.
- E 분해 창: sim S2, 단위 P의 행 폭 실측.
- F 1차 효과 미리보기·배지·지연 막대: sim S3, 미리보기 오차 X17.
- G 게임 안 사전 창: sim S6.
- I 성공 확인·처방 추적 핀·확인 팝오버: 핀이 달릴 상단 칩(A)·분해 값(E)과 핀·표지 줄 자리(B)가 아직 없다.
- L 기록 창: 1b, sim S4·S7·S8.
- M 자동 저장·슬롯: 1b, sim S5.
- N 목표 카드·표지: 1b·1c, V1 결정·08 문서. 1a 사람 시험 전에 하지 않는다.
- P 정적 시제품: 화면 작업자 일이 아니다 (보고서 앱 `tools/reports`, Claude 쪽).

### 검증 (남은 화면 확인)
- 각 절에서 못 본 조합은 UI_DONE의 "확인" 줄에 있다.
- 화면 미검증: 2-45 법 전환 완료/실패 사건 클릭·영어/다크 새 아이콘, 2-80·2-84 AI 웃돈 지역 화면, 소유권 혼합·극소 지분 및 기관 소멸, OwnerSummary 전 경로, 모든 서브윈도우/정렬/상세 탭·툴팁 조합, 지도 전체 레이어·에셋.
- 실사용 환경: 일반 Edge 최대화, Windows 배율, 브라우저 확대, 영어/다크 모드. 내장 브라우저의 강제 viewport는 사용자 실환경 검증을 대체하지 않는다.

### 메모
- "sim 대기"라는 말만 보고 멈추지 않는다. 필드와 사용처를 코드에서 먼저 확인한다.

---

## 1. sim과 화면 연결

규칙은 `docs/DESIGN.md`를 읽고, 값은 코드에서 읽는다. 이 문서에는 옮겨 적지 않는다. 내보내는 이름은 `packages/sim/src/index.ts`를 본다.

| 내용 | DESIGN | 화면이 쓰는 이름 |
|---|---|---|
| 왕국과 회사 | 1장 | `Kingdom.governmentId`, `Kingdom.privateIds`, `Company.state`, 색은 `Kingdom.color`·`Company.color` |
| 소유·배당 | 9.3 | `paysDividend(stateOwned, skill)`, `holdingsOf`, `buildingEcon` |
| 소작지 | 4장 | `peasantSlots(b)` |
| 왕실 전용 건물 | 1장, 8장 | `BuildingTypeDef.stateOnly`, `isGovernment` |
| 세금 | 9.1 | `taxRates(k)`, `Kingdom.taxRatio`, `taxCapacity` |
| 주조·국채 | 9.4 | `World.mint`, `creditLimit` |
| 부·생활수준 | 5장 | `wealthOf`, `wealthDrivers`, `Household.sol`, `HistoryPoint.sol` |

DESIGN에 없는 화면 규칙: 민간 회사 이름("XX 민간")은 화면에 보이지 않는다. "민간" 또는 저택·금융가로 쓴다 (2-35, UI_DONE).

---

## 2. 화면별 수정 사항

끝난 절은 UI_DONE으로 옮겼다. 줄인 절의 원문은 UI_DONE "2026-11-07 확인"에 있다.





### UI-5. 건설 창 남은 정리 (옛 2-92, 사용자 2026-11-05)
건설 창 합치기는 끝났다 (커밋 `49e1a63`). 가동률 조작은 UI-2가 대신한다.
- 건물 이름 뒤 표기: 사용자가 정한 형태는 `(22+2)`다 (6번). 커밋된 코드는 이 형태다. 커밋 안 한 `ConstructionPanel.tsx:43`은 `×22 +2`로 바꾸고 있다. 사용자 결정 없이 바꾸지 않는다. 작업 중 (커밋 안 됨).
- +1·+5는 뺐지만 코드가 남았다 (10번). 지운다.
  - `supplyDemand.ts:6` `supplyDemandProjection`: 화면 호출 0건, 시험 `test/supplyDemand.test.ts:10`·`:12`·`:16`만 쓴다. 시험도 같이 고친다.
  - `views/SupplyDemand.tsx:9` `SupplyDemandBar`의 `one`·`five` props와 `:14` 그리기: 넘기는 곳이 없다.

### UI-6. 자본가 숨기기 (옛 2-55, 2026-10-21, DECISIONS 7-16~7-19)
인구 표 직종 고르기는 끝났다 (`PopTable.tsx:26`·`:43`). 절의 나머지도 끝났다.
- 남은 것: `views/BottomPanel.tsx:31`의 `series`가 `POP_CLASSES`를 그대로 돈다. 계층 생활수준 차트 범례(`:44`)와 선에 자본가가 남는다. 자본가는 인구 0이다.
- 고칠 것: `capitalist`를 뺀다 (`PopTable.tsx:43`과 같게).
- 코드로만 봤다. 범례가 실제로 어떻게 보이는지는 확인 못 함.

### UI-7. 부 이동 표 합 행 라벨 (옛 2-82, DESIGN 5장 부 이동, DECISIONS 7-37·7-38)
부 이동 표와 중복 제거는 끝났다.
- 남은 것: 합 행 라벨이 `Σ`다 (`WealthDrift.tsx:16`). 명세 문자열은 "합"/"Total"이다.

### UI-8. 왕실 공사 자세히 보기 라벨 (옛 2-62, 사용자 요청 2026-10-22)
장부 라벨·수수료 표시는 끝났다. `build` 자세히 보기(`FinancePanel.tsx:60`·`:70`)의 라벨만 명세와 다르다.

| 자리 | 지금 | 명세 (ko / en) |
|---|---|---|
| `share` 칩 | `T.share` "비율" | 왕실 몫 / Crown share |
| `wage` 행 | `S.wages` | 사무소 임금 몫 / Office wages |
| `other` 행 | `S.other` | 자재·이익 몫 / Materials and margin |

- `T.share`는 `ClassDonut.tsx:108`도 쓴다. 값을 바꾸지 말고 새 키를 더한다. `build` 칩과 행에만 쓴다.

### UI-9. 연구는 돈 대신 문해력 포인트 (옛 2-61, 사용자 결정 2026-10-22, DECISIONS 7-20)
연구 창과 옛 코드 정리는 끝났다.
- 남은 것: `T.adjustFinance` (`strings.ts:357`·`:933`)를 부르는 곳이 없다. 지운다.

### UI-10. 부·생활수준 지도 정점 범위 (옛 2-33, 사용자 요청 2026-10-21) — 대기: 사용자 결정
연속 보간과 범례는 끝났다 (`RegionMap.tsx:26~31`, `:89~90`). 지역 목록 점은 선택 항목이라 하지 않아도 된다.
- 남은 것: 지역 값이 첫 정점 아래에 몰린다 (UI_STATUS 2026-11-01, seed42·360일). 정점 범위를 어떻게 잡을지 사용자가 정한다.
- 정점은 고정이다. 지금 보이는 지역의 최소·최대로 범위를 잡지 않는다.
- sim 변경 없음.

### UI-11. 지역 건물의 주간 수지 폭포 (옛 2-59, 사용자 요청 2026-10-22) — 대기: sim
사용자 말: "지역건물탭에 수지랑 지분이랑 뭐 그런 경제적인 부분이 가구별로 표시되어야되는데 아직안된듯".
화면 쪽은 끝났다. 남은 것은 주간 폭포 하나다.
- sim 쪽 필요 (3장): `BuildingEcon.week`가 없다 (`finance.ts:1051`). 하루 값(`day`)을 주간으로 바꿔 쓰지 않는다.
- 화면 (sim이 들어온 뒤): 상세 수지 폭포(`BuildingEconomics.tsx:29`, `GroupDetail.tsx:37`)가 `week`를 읽는다. 머리 라벨은 `T.balance` 대신 새 키 `balanceWeek`로 쓴다.
- 문자열: `balanceWeek` = "수지 /주" / "Balance /wk".

### UI-12. 철거 중 회수 자재 표시 (옛 2-49, 사용자 요청 2026-10-21) — 대기: sim
철거 아이콘·막대·취소는 끝났다. 남은 것은 3항 회수 자재 하나다.
- sim 쪽 필요 (3장): `SalvageLot`에 `buildingId`가 없다 (`types.ts:349`). `companyId`·`regionId`로 거르면 같은 지역 다른 건물 철거와 섞일 수 있다.
- 화면 (sim이 들어온 뒤): `w.salvage` 중 그 건물 몫을 상품 아이콘 + 남은 양 + 남은 날로 보인다. 옆에 남은 날 ÷ `TUNE.salvageDays` 작은 막대.

### UI-13. 인두세 부담 표시 (옛 2-72, docs/overhaul/0B_RESULTS.md 2.4·2.9·2.10) — 대기: sim
- 사실: `setTaxLaw`는 기술 해금과 금융가 자산 비율만 본다 (`commands.ts:249`). 소득 대비 상한 `TUNE.pollTaxIncomeCap`은 AI 판단에만 있다 (`ai.ts:471~472`).
- 화면이 할 것: 지금은 없다. 단위 F의 "부담률" 줄(05 L-S1: 걷힘 ÷ 세금·복지 전 소득, 직종별)이 이 값을 보인다. sim 대기: S3 (3장).
- 화면 쪽에서 미리 계산식을 만들지 않는다. sim 함수가 생기면 그것을 읽는다.

### UI-14. 규칙 사전 (옛 2-40, 2026-10-21) — 대기: 단위 G
오버홀 단위 G(게임 안 사전 창, sim S6)로 넘어갔다. 지금 할 일 없음. 게임 안 링크는 `PolicyPanel.tsx:46` 하나다.
데이터와 단독 앱 설명은 UI_DONE 원문에 있다.

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
2026-11-07 `packages/sim/src`와 대조했다.

- **UI-11 주 단위 수지 (요청됨, 2026-10-22):** `BuildingEcon`에 `week: { sales, tax, inputs, wages, profit }` (건물 `revenue`·`tax`·`inputCost`·`wageCost`의 이동평균 × 7, `profitEma`와 같은 기간). 들어오면 UI-11 폭포 라벨을 `/주`로. (2026-11-02 wt-uiapi 보류: 지금 건물에 있는 이동평균은 `profitEma`·`firmEma`(왕실 생산 건물·건축사무소만) 뿐이라 매출·세금·원료비·임금 이동평균을 건물 상태에 새로 저장해야 한다. 읽기 전용이 아니고 골든이 바뀐다.)
- **UI-12 (선택):** 회수 자재 lot에 `buildingId`를 넣고 `salvageOf(w, b)` export. (2026-11-02 wt-uiapi 보류: `SalvageLot` 에 저장 칸을 더해야 해 읽기 전용이 아니다.)
- **2-17 정리 (UI 반영 끝):** 클라이언트가 `isDistressed`·`SEIZURE_WEEKS`·`DISTRESS_DEBT_RATIO`·`landlordJobs`·`Company.distressWeeks`를 쓰지 않는다 (2026-11-07 grep 0건). sim은 `compat.ts:9~18`의 껍데기와 `index.ts` export, `types.ts`·`world.ts`의 `distressWeeks`를 지워도 된다.
- **2-74 경보 키 (선택, 2026-11-01):** `GameEvent.key?: string` = `alertOnce`가 쓰는 키 (`economy.ts:919`, 예 `unpaid:<건물 id>`). 없으면 화면이 회사·건물·지역·글로 키를 만든다 (`dangerPause.ts:5`). (2026-11-02 wt-uiapi 보류: 저장되는 `GameEvent` 에 칸을 더해야 해 읽기 전용이 아니다.)
- **UI-13·단위 F 인두세 부담 (2026-11-01):** S3 안에 직종별 부담률(걷힘 ÷ 세금·복지 전 소득, 05 L-S1)을 읽는 함수.
- **오버홀 1a·1b 선행 (09 7.1 S1~S8, 2026-11-01 옮김):** S1 몫의 장부(단위 D), S2 분해 체인(E), S3 1차 효과 미리보기·바닥 전후 값(F), S4 `GameEvent` 종류 코드·숫자 칸(L), S5 슬롯 메타(M), S6 사전 "처음 하는 법"·말단 항목 id 테스트(G), S7 출생·사망·순이주 월 지표(L), S8 노드 월 경계 기록(L). 정의는 09 7.1.
- **2-51 사전 라벨 (2026-11-05):** `packages/encyclopedia/src/strings.ts:11` `inputs` 한국어 `입력` → `투입`. 사전 패키지는 화면 작업자 범위 밖이라 여기로 옮겼다 (2-51 은 UI_DONE).

- **UI-2 (2026-11-09):** 클라이언트 setUtilization 호출 제거. sim의 setUtilization 타입과 거부 분기(types.ts, commands.ts)는 지워도 됨.
