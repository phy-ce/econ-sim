# 반영된 UI 변경 (보관)

> 과거 시점의 구현·검증 기록입니다. 최신 구현 전체의 검증 완료를 뜻하지 않습니다. 현재 상태와 우선순위는 [UI_STATUS](UI_STATUS.md), [UI_CHANGES](UI_CHANGES.md) 참조.


`docs/UI_CHANGES.md`에서 화면에 다 반영된 항목을 옮겨 둔 보관 문서다. 할 일은 UI_CHANGES에만 있다. 절 번호(2-xx)는 UI_CHANGES와 같다.

## 2026-10-21 확인 (main `da005db` 기준 클라이언트 코드)

### 확인 근거
| 절 | 근거 (파일:행) |
|---|---|
| 2-0 | "상회 관리" 창 없음, 창 목록 finance·research·construction·trends (`App.tsx` 199~204). 건설 버튼·대기열·건물 조작은 지역 건물 창 (`RegionPanel.tsx` 175~178, `ResourceInspector.tsx` 35). 남은 죽은 코드(`CompanyPanel` 컴포넌트 96~123행)는 2-35에서 지운다. |
| 2-0-1 | `App.tsx` 111 `selectRegion` → `showWindow('industry')`. |
| 2-1 | `OwnerBadge.tsx` (왕관/돈주머니 아이콘, 왕국 색 띠, 플레이어 별). 지역 칩 `RegionPanel.tsx` 190, 자원 목록 `ResourceInspector.tsx` 70, 건물 상세 30, 순위 `BottomPanel.tsx` 62, 알림 `Notifications.tsx` 77, 지도 지분 막대 `RegionMap.tsx` 147. |
| 2-2 | `CompanyPanel.tsx` 152 배당 표시, `Workforce.tsx` 14 동전 아이콘, 소작지는 소작농 한 줄 (`Workforce.tsx` 12). |
| 2-3 | `CompanyPanel.tsx` 155 민간은 `sharedResearch`, 158 왕실 기술 목록. |
| 2-4 | `CompanyPanel.tsx` 291~302 `Projects` 왕실·민간 두 줄, 하루 포인트, 상한 ◆. |
| 2-5 | `App.tsx` 147 징수율 칩(`taxRatio`), `systemMetrics.ts` 10, 행정청 세금 역량 `CompanyPanel.tsx` 333·368, `ResourceInspector.tsx` 33. |
| 2-6 | `BottomPanel.tsx` 42 왕국 재정 표 (투자 풀, 연 GDP). |
| 2-7 | 항구 배지·`PORTS_OPEN` 모두 없음 (grep 0건). |
| 2-8 | `useGame.ts` 8 `estera-save-v7`. |
| 2-9 | `spriteAtlas.ts` 6·10 `admin` 그림. |
| 2-10 | `PopTable.tsx` 전체 (열·필터·정렬·강조), 계층 클릭 `App.tsx` 112 `openPops`. |
| 2-11 | 건설 창 `App.tsx` 203, 순서·정지·취소·확인 창 `CompanyPanel.tsx` 299. |
| 2-12 | 2-23으로 대체됨 (금액 편성 없음). |
| 2-13 | `format.ts` 54 `moneyAmount` (100 미만 소수 2자리), 축 `RegionPanel.tsx` 168. |
| 2-14 | `spriteAtlas.ts` 13 `luxury`·`meat`·`ranch`. |
| 2-15 | `ResourceInspector.tsx` 30, `CompanyPanel.tsx` 299 `privateEquity`. |
| 2-16 | `App.tsx` 145 대출 칩 한 버튼, 138 날짜·시각 한 줄, 162 종 20px. (금고 합치기는 2-28) |
| 2-17 | 부실 배너·압류 막대·연구비 슬라이더·지주 행 없음, `research.budget` 읽기 전용 `CompanyPanel.tsx` 567, 예상 일수 577, 철거 자재 `SourceBreakdown.tsx` 24. sim `compat.ts` 껍데기는 이제 지워도 된다 (3장). |
| 2-18 | `RegionPanel.tsx` 191, `ResourceInspector.tsx` 31·70 철거 표시, `CompanyPanel.tsx` 420 철거 취소. |
| 2-19 | 2-23으로 대체됨 (단계 손잡이는 tax·wages·research). |
| 2-20 | `ui.tsx` 9·11, `strategy.css` 74 `--c-gentry`, `spriteAtlas.ts` 13. |
| 2-21 | `ResourceInspector.tsx` 33, `CompanyPanel.tsx` 505·537 `seats`. |
| 2-22 | `FinancePanel.tsx` 20 세법 선택과 세율 표시. |
| 2-23 | `FinancePanel.tsx` 24 단계 버튼 1~5 (`setBudget`), 머리줄 `policyLevel`, 국고 적립·합계 없음, `ledgerLabels.tax` 세금, 정부 건물 가동률·끄기 숨김 `CompanyPanel.tsx` 431, 왕실 임금 슬라이더 숨김 458. 안 쓰는 문자열 정리는 2-30으로 넘김. |
| 2-24 | `CompanyPanel.tsx` 505 땅 없는 건물은 학생 수·세금 역량 표시, 47·`Workforce.tsx` 14 `slots`. |
| 2-25 | `HarvestBadge.tsx`, 지역 목록 `RegionMap.tsx` 173, 지역 머리 `RegionPanel.tsx` 92, 건물 칩 190, `ResourceInspector.tsx` 33·70, 통계 `BottomPanel.tsx` 53 `harvestRegions`. |

### 옛 "0. 지금 할 일"에서 끝난 줄
- (옛 2번, 2-23) **재정 탭 정책 단계 (2-23). 지금 재정 조작이 전부 막혀 있다.** `FinancePanel.tsx` 22행 슬라이더가 0~1 비율을 보내는데 sim의 `setBudget`은 정수 1~5만 받는다. 세 손잡이(`tax`·`wages`·`research`)를 1~5단계 선택으로 바꾼다.
- (옛 3번, 2-24) **행정청·학교는 땅이 없다 (2-24).** 짓기 카드에서 땅 칸 대신 무엇을 보일지 정한다. 건축사무소 일자리 표시는 컴파일용으로 `slots(b, s)`를 쓰게 고쳐 두었다 (`CompanyPanel.tsx` 47행, `Workforce.tsx` 14행). 이제 `disbanded(b)`도 export된다.
- (옛 4번, 2-25) **기상 조건 (2-25).** 지역 목록·지역 패널에 `harvestLabel` 칩, 깎이는 건물의 산출 옆 `−20%`, 통계에 `harvestRegions` 선.
- (옛 5번, 2-7) **항구 표시 정리.** sim에서 항구·해외 무역 코드를 없앴다 (`PORTS_OPEN`은 sim에 없다). 클라이언트 `systemMetrics.ts`의 `PORTS_OPEN = false`와 `RegionMap.tsx`·`RegionPanel.tsx`의 항구 배지는 지우거나 장식으로만 둔다. `Region.spaceport`(항구 지역 표시)는 데이터에 남아 있다.
- (옛 6번, 2-5) **행정청 세금 역량.** `taxCapacity(world, kingdomId)`를 index에서 export했다. 필드 `Kingdom.taxCapacity`·`taxDue`로 읽어도 된다.
- (옛 8번, (설명만)) **소작지는 수확의 20%를 판다 (DECISIONS 7-11 F50).** 지대(대금의 50%)와 토지세(대금 × 토지세율)는 판매 대금의 몫이고, 나머지 80%에서 먹고 쓰며 남으면 사라진다. 클라이언트에 "수확의 %"라는 토지세 라벨은 없어서 고칠 코드는 없다. 토지세 툴팁·설명을 넣는다면 "소작지 판매 대금의 %"로 쓴다.

### 옛 1장에서 옮긴 것
- 1-5. 항구 폐쇄: sim에서 항구·해외 무역 코드를 지웠고 화면의 항구 표시도 없다. `Region.spaceport`만 데이터에 남아 있다.
- 1-6의 화면 수정: 지역 패널 생활수준 (`RegionPanel.tsx` 104), 계층 표의 부·생활수준 (`ClassDonut.tsx` 120~122), 지도 생활수준 레이어 (`RegionMap.tsx` 64).

### 옮긴 절 (원문)

### 2-0. "상회 관리" 창 해체: 통계와 지역 건물로 나눠 옮김 (가장 큼)
**지금 구조:** `views/CompanyPanel.tsx`의 `CompanyPanel`(창 제목 "상회 관리", `App.tsx` 193행)에 탭이 4개 있다.

| 탭 | 컴포넌트 | 내용 |
|---|---|---|
| 건물 | `House` → `Summary`, `Projects`, `BuildingRow` + `Controls` | 내 건물 요약(인력, 투입 부족, 손익), 공사 대기열, 건물별 상세와 조작(방식 변경, 확장, 철거, 가동/정지) |
| 건설 (지역명) | `BuildList` → `BuildCard` | 선택 지역에 지을 수 있는 건물 목록, 예상 비용·기간·회수, 막힌 이유(`buildBlockers`) |
| 연구 | `Research` | 연구 주제와 하루 연구비 |
| 임금 | `Wages` | 직종별 임금 조정 |

다른 회사를 볼 때는 `CompanyView`(읽기 전용)가 같은 창에 뜬다.

**바꿀 구조**
1. **지역 건물로 옮길 것** (`views/RegionPanel.tsx`의 `industry` 탭과 `ResourceInspector.tsx`의 `BuildingInspector`)
   - **건물 조작:** 지역 건물 목록에서 내 건물을 고르면, 상세(`BuildingInspector`) 아래에 지금 `Controls`의 조작을 붙인다. 조작은 방식 변경, 확장, 철거, 가동/정지다.
     - 남의 건물은 조작 없이 상세만 보여 준다.
   - **바로 건설:** 산업 탭 상단에 "건설" 버튼을 두고, 누르면 그 지역의 `BuildList`/`BuildCard`를 펼친다.
     - 지역은 지금 보고 있는 지역으로 고정이다. 따로 고르지 않는다.
     - 빈 땅 칸 수(`landFree`)를 같이 보여 준다.
   - **공사 대기열:** 그 지역에서 진행 중인 공사를 산업 탭에 보여 준다. 왕실과 민간을 `OwnerBadge`로 구분한다(2-4 참고).
     - 왕국 전체 대기열은 아래 통계 쪽에도 둔다.
   - 지도에서 지역을 누르면 바로 이 화면으로 가므로, "지역 고르기 → 건물 보기 → 짓기/조작"이 한 창에서 끝난다.
2. **통계로 옮길 것** (`views/BottomPanel.tsx`, 창 제목 "통계 · 소식")
   - 내 상회 요약: `Summary`의 인력 충원, 투입 부족, 손익과 현금·부채·지난주 손익
   - 왕국 전체 공사 대기열(`Projects`): 순서, 진행률, 소유 배지
   - 회사 비교 표(이미 있음)와 다른 회사 보기(`CompanyView`의 읽기 전용 내용)
   - 세금 징수율, 투자 풀, GDP(2-5, 2-6)
3. **"상회 관리" 창은 없앤다.** 대신 **재정** 창과 **연구** 창을 새로 둔다(사용자 결정).
   - **재정 창**
     - 직종별 임금 조정: 지금 `Wages` 컴포넌트를 그대로 옮긴다.
     - 국고: 현금, 부채와 대출 한도(`creditLimit`), 지난주 손익(`lastWeekProfit`)
     - **주간 수지표:** `Company.lastLedger`(지난주)와 `Company.ledger`(이번 주 진행분)를 그대로 보여 준다. 항목 정의는 `packages/sim/src/types.ts`의 `LEDGER_KEYS`에 있다.
       - 수입(손익에 포함): `sales` 판매, `tax` 소득세, `mint` 주조, `buildFees` 민간 공사 수수료
       - 지출(손익에 포함): `wages` 임금, `inputs` 원자재, `research` 연구, `interest` 이자, `welfare` 복지 (`welfare`는 2-23에서 없어짐)
       - 손익 밖(자본 흐름): `dividends` 배당 지급, `investment` 투자 풀 유입, `buildPaid` 민간이 낸 공사비
       - 합계: 손익 = `lastWeekProfit`. 수입 합계 − 지출 합계와 같다.
       - 소득세 옆에 징수율(`taxCapacity / taxDue`)을 표시한다.
     - 계층별 소득세율(`Kingdom.incomeTax`): 지금은 표시만 한다. 조정 명령이 생기면 여기에 붙인다. (2-23에서 없어짐: 세금 수준 단계로 대신)
     - 상단 상태 바의 대출 chip(`App.tsx` 127~130행)은 그대로 두고, 누르면 재정 창이 열리게 한다.
   - **연구 창**: 지금 `Research` 컴포넌트를 그대로 옮긴다(연구 주제, 하루 연구비, 아는 기술). 기술 트리를 단계별(1~4단계)로 보여 주면 좋다.
   - `App.tsx` 창 목록에서 `id:'company'`를 지우고 `id:'finance'`, `id:'research'`를 추가한다.
4. `CompanyPanel`의 `House`, `BuildList`는 위치만 옮기고 로직은 재사용한다. `game.command(...)` 호출 방식은 그대로다.
5. `App.tsx`의 창 목록(`id:'company'`)과 `viewCompany`를 위 구조에 맞게 고친다. 다른 회사 이름을 누르면 통계의 회사 보기로 간다.

### 2-0-1. 지도 클릭 → 지역 건물
- **지금:** 지도에서 지역을 누르면 시세 창이 열린다. `App.tsx` 105행 `selectRegion`이 `showWindow('market')`을 부르기 때문이다.
- **고칠 것:** `showWindow('industry')`로 바꿔 **지역 건물 창**이 열리게 한다.
  - 통계의 소식 목록에서 지역으로 이동하는 `onJump`도 같은 함수를 쓰므로 같이 바뀐다.
  - 상품을 누를 때(`selectGood`)는 지금처럼 시세 창을 연다.

### 2-1. 소유 구분
**문제:** 건물이 누구 소유인지 한눈에 보이지 않는다.
- 지금 소유 표시는 아이콘의 1px 테두리색, 작은 회사 이름 글자, 툴팁뿐이다.
- 같은 왕국의 왕실과 민간은 비슷한 계열 색이라(벨로니아, 카르텐) 테두리색만으로 구분하기 어렵다.

**수정 방법**
1. 공통 컴포넌트 `OwnerBadge`를 하나 만들고, 소유가 보이는 모든 곳에 같은 표기로 쓴다.
   - **국영과 민간**은 색이 아니라 **모양**으로 구분한다(예: 왕관과 돈주머니 마크, 또는 서로 다른 테두리 모양).
   - **어느 왕국** 소유인지는 왕국 색 띠나 문장으로 보여 준다.
   - **플레이어 소유**는 더 굵고 눈에 띄게 표시한다.
2. 적용할 곳

| 화면 | 파일 | 지금 표시 |
|---|---|---|
| 지역 → 산업 탭의 건물 칩 | `views/RegionPanel.tsx` (약 188–197행) | `.b-chip-icon` 테두리색과 작은 이름 |
| 자원 → 생산·소비 건물 목록 | `views/ResourceInspector.tsx` (약 55–62행) | 작은 회사 이름 |
| 건물 상세 | `ResourceInspector.tsx`의 `BuildingInspector` | 소유 회사 링크 |
| 지도 | `views/RegionMap.tsx` (약 106행, `badge-mine`) | 플레이어 레벨 합만 표시 |
| 통계 → 회사 표 | `views/BottomPanel.tsx` | 색 견본과 이름 |
| 알림 | `views/Notifications.tsx` | 색 견본과 이름 |

3. 지도에는 지역별로 왕실과 민간의 지분(건물 레벨 합의 비율)을 작은 막대로 보여 준다.

- 쓸 수 있는 데이터
  - `Building.companyId`, `Building.stateOwned`
  - `Company.state`, `Company.kingdomId`, `Company.color`, `Company.isPlayer`
  - `companyById`
- 스타일 파일은 `styles.css`(`.b-chip*`)와 `workspace.css`다.

### 2-2. 직원과 임금 표시 (`views/CompanyPanel.tsx`)
- 직원 목록과 임금 탭은 이미 `SKILLS`를 돌기 때문에 자본가와 귀족도 나온다. 별도의 소유주 행은 이미 지웠다.
- 고칠 것
  1. **민간 회사 화면**(`CompanyView`, 약 123–151행)에서는 자본가·귀족 임금을 "배당"으로 표시하고 임금 비교(`spct`)를 숨긴다.
     - 판정은 `paysDividend(false, s)`로 한다.
  2. 건물 직원 목록(약 43행, 228행)도 같다. 그 건물이 `stateOwned`가 아니면 자본가·귀족 칸에 배당 아이콘을 붙인다.
  3. 소작지 상세에는 소작농과 지주 두 칸만 보여 준다.

### 2-3. 연구 (`CompanyPanel.tsx`의 `Research` 탭, `CompanyView` 연구 행)
- 민간 회사에서는 연구 진행 바와 예산 대신 "왕실 기술 공유" 아이콘과 아는 기술 목록만 보여 준다.
- 플레이어(왕실)의 연구 탭은 그대로 둔다.

### 2-4. 건설 대기열 (`CompanyPanel.tsx` 95행 `projects`)
- 지금은 자기 회사 공사(`companyId === me.id`)만 보인다.
- 그런데 플레이어의 건축사무소는 **같은 왕국 민간 공사도 함께 처리**한다.
  - 하루 포인트는 **왕실 50%, 민간 50%**로 나뉜다.
  - 한쪽이 다 못 쓰면 남은 몫은 다른 쪽이 쓴다.
- 고칠 것
  1. 대기열을 **왕실 줄과 민간 줄 두 개**로 나눠 보여 준다. 각 줄 머리에 `OwnerBadge`와 그 줄이 오늘 받은 포인트를 표시한다.
  2. 각 줄 안의 순서는 `world.constructions` 순서를 따른다.
  3. 공사마다 한 건물 상한(하루 10/7포인트)에 걸렸는지 작은 아이콘으로 표시한다.
  - 같은 왕국 판정: `companyById(world, k.companyId).kingdomId === me.kingdomId`

### 2-5. 세금 역량 (새 표시)
- 상단 상태 바(`App.tsx` 약 120–130행 chip들)에 "세금 징수율" chip을 하나 추가한다.
  - 값: `Kingdom.taxRatio` (0~1, %)와 막대. **`taxCapacity / taxDue`로 직접 계산하지 않는다.** 징수율은 곡선(한도/인구 = x 일 때 x / (1 + x))이라 100%에 닿지 않는다.
  - `systemMetrics.ts`의 `taxCollectionRatio()`도 `kingdom.taxRatio ?? 1`을 돌려주도록 바꾼다.
  - 80% 미만이면 `warn` 톤
- 행정청 건물 상세에는 산출 상품 대신 "세금 역량" 숫자를 보여 준다.
  - 값: 방식의 `taxCapacity` × 레벨 (sim의 `TUNE.adminScale`이 1이 아니면 그 배율도 곱한다)
  - 방식 정의: `MethodDef.taxCapacity`

### 2-6. 투자 풀과 GDP (통계, `views/BottomPanel.tsx`)
- 회사 표 위나 옆에 왕국별로 다음 값을 작게 보여 준다.
  - 투자 풀: `Kingdom.investmentPool`
  - GDP: `kingdomGdp(world, kingdomId)`, 연 단위
- 화폐 장부(`World.mint`)는 넣지 않아도 된다. 넣는다면 통계의 접힌 섹션에 둔다.

### 2-7. 항구
- 항구가 닫혀 있으므로 지도 항구 배지(`RegionMap.tsx` 113행)와 지역 패널의 "항구" pill(`RegionPanel.tsx` 80행)을 **닫힘 상태**로 표시한다(흐리게, 자물쇠).
- `PORTS_OPEN`이 export되면 그 값에 따라 열림/닫힘을 바꾼다.

### 2-8. 저장 호환
- `useGame.ts`의 `SAVE_KEY`를 `'estera-save-v5'`에서 `'estera-save-v6'`로 올린다.
- 건물 고용 구조와 회사 임금 구조가 바뀌어서, 예전 저장을 불러오면 화면이 멈출 수 있다.

### 2-9. 스프라이트
- `sprites.tsx`의 `ALIAS`에 `admin: 'school'`이 임시로 들어가 있다.
- 행정청 전용 그림이 생기면 교체한다.

### 2-10. pop 목록 (통계, 새 섹션)
- 지금 화면은 `region.households`(계층별 합산)만 보여 준다. 실제 pop은 `World.pops`에 따로 있다.
  - pop 하나 = 지역 × 직종 × 일터. 같은 지역·직종이라도 일터가 다르면 다른 pop이다.
  - `work`가 0이면 실업 pop이다.
- 통계에 pop 표를 넣는다. 열은 다음과 같다.
  - 지역: `regionId` → `regionById(world, id).name`
  - 직종: `prof` → `CLASS_DEFS`
  - 일터: `work` → `world.buildings`에서 찾은 건물 이름. 0이면 "실업"
  - 인구: `size` (부양가족 포함)
  - 부 단계: `wealth`
  - 생활수준: `sol`
  - 식량 충족: `food` (0~1, %로 표시)
  - 소비 충족: `fulfillment` (0~1, %로 표시)
  - 소득: `incomeEma` (하루)
  - 현물: `inKind` (상품별 양, 툴팁으로)
  - 문해력: `literacy` (%로 표시)
  - 연 증감률: `growth` (이미 연 % 단위. 예: -12.2 → "-12.2%")
- 필터: 지역, 직종, 실업만 보기
- 정렬: 모든 열. 기본은 인구 내림차순
- 실업 pop과 식량 충족 40% 미만인 행은 빨간색으로 강조한다.
- 실업 pop은 예산 편성의 복지 몫(2-12)을 매주 나눠 받는다. 국고 장부의 `welfare` 항목에 합쳐진다. (2-23에서 없어짐: 복지 없음)
- 지역 패널의 계층 행을 클릭하면 이 표가 그 지역·계층으로 필터되어 열리게 한다.

### 2-11. 건설 탭 (새 창)
- 2-4의 대기열을 회사 패널에서 꺼내 **독립된 "건설" 탭**으로 만든다. 왕실 줄과 민간 줄, 오늘 받은 포인트 표시는 2-4대로 한다.
- 행마다 보여 줄 것
  - 건물 스프라이트와 이름, 지역(`regionId`), 신규/증설(`targetBuildingId`), 레벨 수(`levels ?? 1`)
  - 진행 바: `points / required`, 들어간 돈 `spent`, 경과 일수 `ticksElapsed`
  - 일시정지 상태: `paused`가 true면 행을 흐리게 하고 일시정지 아이콘을 붙인다.
- 내 공사(`companyId === me.id`)에만 조작 버튼을 단다. 민간 공사는 보기만 한다.
  - 순서 바꾸기: 드래그 또는 위/아래 버튼 → `{ type: 'moveConstruction', constructionId, index }`. `index`는 **내 공사 목록 안에서의 위치**다(0 = 맨 앞).
  - 일시정지/재개 → `{ type: 'pauseConstruction', constructionId, paused: true | false }`. 정지된 공사는 포인트를 받지 않고, 그 몫은 다음 공사로 간다.
  - 취소 → `{ type: 'cancelConstruction', constructionId }`. 들어간 돈은 돌려받지 못하므로 `spent`를 보여 주는 확인 창을 띄운다.
- 포인트는 위에서부터 순서대로 배분된다. 그래서 순서가 곧 우선순위다.

### 2-12. 예산 편성 (재정 탭, `views/FinancePanel.tsx`)
- 국고 지출 중 **연구, 교육, 복지**는 매주 세입(세금 + 관세 + 주조)의 정해진 비율만큼 한 번에 나간다. 건설은 예산 항목이 아니다(건축사무소 공사비로 나간다).
- 정책 값: `Kingdom.budget` = `{ research, education, welfare }`, 각각 0~1, 합 1 이하. 기본값은 0.2 / 0.1 / 0.1이다. 나머지는 국고에 남는다.
- 바꾸기: `{ type: 'setBudget', item: 'research' | 'education' | 'welfare', value }`. 합이 1을 넘으면 오류 메시지가 돌아온다.
- **예산 조절은 따로 섹션을 만들지 말고, 주간 수지 표(`FinancePanel.tsx`의 `accounts` 표) 안에 합친다.**
  - 지출 그룹의 연구·교육·복지 행마다 오른쪽에 비율 조절 칸(슬라이더 또는 −/+ 버튼과 % 숫자)을 붙인다.
  - 수입 그룹 위에 세금 조절 행(인두세, 신분별 소득세 → `setTax`)을 같은 방식으로 둔다.
  - 지금 화면에는 플레이어가 재정에서 조절할 수 있는 것이 하나도 없다. 이 표가 재정 조작의 유일한 자리다.
- **표 규격 고정:** 숫자 길이에 따라 열 너비가 움직이지 않게 한다.
  - `table-layout: fixed`, 열마다 고정 너비(`<colgroup>`), 숫자는 오른쪽 정렬 + `font-variant-numeric: tabular-nums`
  - 금액은 2-13 규칙의 고정 자리 형식(k/M 단위)으로 써서 칸을 넘지 않게 한다.
- 표에 함께 보여 줄 값
  - 항목마다 슬라이더(1% 단위)와 지난주 실제 지출을 표시한다.
  - 지난주 결과: `Kingdom.lastBudget` = `{ revenue, research, education, welfare }` (금액)
  - 이번 주 쌓이는 세입: `Kingdom.revenueWeek`
  - 남는 몫(1 − 합)은 "국고 적립"으로 보여 준다.
- 각 항목이 쓰이는 곳
  - 연구: 진행 중인 기술에 들어간다. 기술이 다 끝나 남는 돈은 국고에 남는다.
  - 교육: 왕국 학교들에 인건비 비례로 나눠 준다.
  - 복지: 왕국의 실업 pop에게 인원 비례로 나눠 준다.
- 연구 탭의 연구비 슬라이더(`CompanyPanel.tsx` 564행 `setResearchBudget`)는 없앤다. 이 명령은 이제 오류를 돌려준다.
  - 그 자리에는 `research.budget`(지난주 연구비의 하루 평균, 읽기 전용)과 "재정 탭에서 조정" 링크를 둔다.

### 2-13. 금액 표시 소수점 (`format.ts`)
- 지금 `compact()`는 1000 미만을 정수로 반올림한다(26행). 그래서 `money(0.56)`이 "ƒ1"로 보인다. 곡물 시세 0.56이 가격표에 ƒ1로 나오는 버그다.
- sim은 가격, 임금, 세율을 소수 2자리까지 쓴다. 표시도 그에 맞춘다.
  - `money`, `compactMoney`, `signedMoney`, `signedCompactMoney`: 절댓값 100 미만이면 소수 2자리, 100~1000이면 정수, 1000 이상이면 지금처럼 k/M/B
  - `int`, `compact`(인구, 수량)는 지금 그대로 둔다.
- 차트 축 라벨(`RegionPanel.tsx` 185행 `toFixed(v < 10 ? 1 : 0)`)도 10 미만은 소수 2자리로 바꾼다.

### 2-14. 사치품과 고기 (새 상품 3개, 새 건물 1개)
- 새 상품 id: `luxury_furniture`(고급 가구, 기본가 40), `luxury_cloth`(고급 의복, 기본가 30)
- 새 건물은 없다. 가구 공방의 방식 `furniture_luxury`·`furniture_luxury_tools`가 고급 가구를, 방직 공장의 방식 `textile_tailor`·`textile_tailor_steam`이 고급 의복을 만든다. 건물 상세의 방식 선택에서 일반품/사치품을 고른다.
- 새 필요 id: `luxury`(사치품). 부 10부터 생긴다.
- 고칠 것
  - `spriteAtlas.ts`의 상품 목록과 `sprites.tsx`의 `ALIAS`에 임시 그림을 연결한다. 고급 가구는 `furniture`, 고급 의복은 `cloth` 그림을 쓴다.
  - 상품 표, 건설 메뉴, 필요 표시가 `GOOD_IDS`, `BUILDING_TYPES`, `NEEDS`를 돌며 그린다면 따로 할 일은 없다. id를 직접 나열한 곳이 있으면 두 상품과 건물을 추가한다.
- 고기도 같은 방식으로 추가한다: 상품 `meat`(기본가 16), 건물 `ranch`(목장, 경작지), 필요 `meat`(부 8부터). 임시 그림은 고기 `food`, 목장 `farm`.

### 2-15. 국영 건물의 민간 지분
- 왕실이 짓는 건물 중 행정청과 건축사무소를 뺀 모든 건물(학교 포함)은 착공 때 그 왕국 민간 상회가 공사비 일부를 내고 지분을 갖는다.
  - 공사: `Construction.privatePaid`(민간이 낸 돈), `Construction.privateShare`(그 돈이 사는 지분 0~1)
  - 건물: `Building.privateShare`(0~1). 없으면 0이다.
- 건물 상세의 소유 표시(`OwnerBadge`) 옆에 "민간 지분 NN%"를 작게 보여 준다. 0이면 숨긴다.
- 건설 탭(2-11)의 왕실 공사 행에도 `privateShare`가 있으면 같은 표시를 붙인다.
- 왕실 장부: 민간이 낸 공사비는 `ledger.investment`(투자 풀 유입), 지분 배당은 `ledger.dividends`(배당 지급)에 잡힌다.

### 2-16. 상단 바 정리 (`App.tsx` 130~165행, `workspace.css`)
- **대출/한도 chip을 다른 chip과 같은 모양으로 맞춘다** (142~143행).
  - 다른 chip은 `<dt>`에 아이콘 + 글자, `<dd>`에 숫자 하나다. 대출 chip만 `<dt>`·`<dd>` 안에 `button.chip-link`가 들어 있고, `/ 한도`가 `<small>`로 붙어 모양과 높이가 다르다.
  - 고칠 것: 버튼을 chip 전체를 감싸는 하나로 옮기고(또는 chip에 `onClick`), `<dt>`에 아이콘 + "대출", `<dd>`에 "부채 / 한도"를 같은 글꼴 크기로 둔다. 다른 chip과 높이, 안쪽 여백, 글꼴을 같게 한다.
- **왕국력(날짜) 영역을 촘촘하게 한다** (134~135행 `brand-text`).
  - 제목·회사 이름 줄과 날짜 줄 사이 간격을 줄이고, 날짜와 시각을 한 줄에 붙인다.
  - 문장은 바꾸지 않고 줄 간격(`line-height`), 여백만 줄인다.
- **알림 종(벨)이 너무 크다** (160~161행 `Sprite name="bell" size={32}`).
  - 다른 상단 아이콘 크기(동전 16, 문장 48 중 chip 아이콘 기준 16~20)에 맞춰 20 안팎으로 줄이고, 배지 위치를 다시 맞춘다.

### 2-17. sim에서 없앤 제도 (화면 정리)
sim이 아래 제도를 없앴다. 화면이 계속 컴파일되도록 `packages/sim/src/compat.ts`에 빈 껍데기를 남겨 두었다. 화면을 고친 뒤 sim에서 그 파일을 지운다.
- **부실·압류·파산**: `isDistressed`(늘 false), `SEIZURE_WEEKS`, `DISTRESS_DEBT_RATIO`, `Company.distressWeeks`(늘 0)
  - `App.tsx` 10·123·142·199~202행의 부실 배너와 압류 진행 막대를 지운다. 대출/한도 chip은 부채 ÷ 한도 비율로만 색을 정한다(70% 이상 warn, 90% 이상 bad).
- **연구비 슬라이더**: `setResearchBudget`(오류를 돌려준다), `MAX_RESEARCH_BUDGET`
  - `CompanyPanel.tsx` 563~564행 슬라이더를 지우고 `research.budget`(지난주 연구비의 하루 평균)을 읽기 전용으로 보여 준다. 연구비는 재정 탭 예산에서 정한다(2-12).
  - 575행 예상 일수는 `Math.ceil(남은 비용 / research.budget)`으로 계산한다(budget이 0이면 "—").
- **소작지 지주 자리**: `landlordJobs`(늘 0)
  - `CompanyPanel.tsx` 50행, `Workforce.tsx` 13행의 소작지 지주 행을 지운다. 지대는 저택 귀족이 현금으로 받는다.
- **항구·해외 무역**: sim에서 코드 전체를 지웠다. 지도와 지역 패널의 항구 표시(`systemMetrics.ts`의 `PORTS_OPEN`)는 닫힘으로 두거나 지운다. `SourceBreakdown.tsx`의 `import`/`export` 출처는 더 나오지 않는다.
- **건설 미리보기 추정**: `estimateAfterEntry`는 이제 AI가 짓기 전에 보는 계산(`valueMethod`)과 같다. 반환값에 `utilization`이 더해졌고, 쓰는 쪽은 그대로 써도 된다.
- **이주 알림**: 지역 이주 알림(기근 이주·임금 이주)은 없앴다. 관련 지역 필드(`famineOut` 등)도 없다.
- **설명 문구**: 지역·직종·기술 설명이 모두 빈 문자열이다. 빈 설명은 화면에서 줄을 그리지 않는다.

### 2-18. 철거는 주마다 1레벨씩 (철거 대기)
- `demolish` 명령은 이제 바로 헐지 않고 `Building.shrinking`(철거 대기 레벨)에 더한다. 매주 1레벨씩 헐린다.
  - 건물 목록과 건물 패널에 "철거 중 n레벨" 표시를 넣는다. 레벨 막대에서 헐릴 칸을 다른 색으로 보여 주면 좋다.
  - `CompanyPanel.tsx` 411행의 −버튼은 그대로 `demolish`를 보낸다. 마지막 레벨 확인 창도 그대로 둔다.
- 새 명령 `{ type: 'cancelDemolish', buildingId }`: 철거 대기를 0으로 되돌린다. 철거 중인 건물에 "철거 취소" 버튼을 둔다.
- 철거 중인 건물은 증설할 수 없고, 증설 공사 중인 건물은 철거할 수 없다. 이때 명령이 오류 문구를 돌려준다.
- 헐린 레벨의 자재 일부를 시장에 판다. 공급 출처 키는 `salvage`다.
  - `SourceBreakdown.tsx`에 이 출처의 이름("철거 자재" / "Salvage")을 더한다.
- `World.salvage`: 팔고 있는 회수 자재 목록이다. 화면에 꼭 보일 필요는 없다.

### 2-19. 예산은 항목별 1~5단계 (건설 항목 추가)
- `Kingdom.budget[항목]`은 이제 비율이 아니라 **단계 1~5**(정수)다. 기본은 3이다.
  - 항목은 `BUDGET_ITEMS` = 연구 `research`, 교육 `education`, 복지 `welfare`, **건설 `construction`(새 항목)**이다.
  - 주간 편성액 = `Kingdom.output`(주간 경제 규모) × 항목별 기본 비율 × `BUDGET_LEVELS[단계 − 1]`(×0.5 / 0.75 / 1 / 1.5 / 2).
- `FinancePanel.tsx` 14·23행: 비율 슬라이더(합 100%)와 "국고 적립" 줄을 지운다. 항목마다 1~5단계 선택(버튼 5개나 단계 슬라이더)을 두고 `{ type: 'setBudget', item, value: 1~5 }`를 보낸다.
  - 단계 이름 예: 매우 낮음 / 낮음 / 보통 / 높음 / 매우 높음 (Very low … Very high)
  - "지난주" 열은 `kingdom.lastBudget[항목]`(실제 지출)을 그대로 쓴다. `construction`은 `LedgerKey`가 아니므로 이번 주 열은 "—"로 둔다.
  - 건설 항목 이름: "건설" / "Construction"
- 건설 예산은 왕실 건축사무소의 가동률을, 교육 예산은 왕실 학교의 가동률을 정한다. 이 건물들의 가동률 조절 UI는 막거나 "예산에서 정함"으로 보여 준다.
- `Kingdom.output`: 예산 기준이 되는 주간 경제 규모(소작 현물 시장가 + 생산 건물 부가가치). 재정 탭에 보여 주면 좋다.

### 2-20. 새 직종 "하급 귀족" (gentry), 귀족 이름 변경
- `POP_CLASSES`, `SKILLS`에 `gentry`(하급 귀족 / Gentry, 중층)가 더해졌다. 기존 `aristocrat`의 이름은 "상급 귀족" / "High nobility"다.
- `ui.tsx`의 `CLASS_COLOR`, `SKILL_COLOR`에 `gentry`를 임시 색(`var(--c-gentry, #7c6fd6)`)으로 넣어 두었다. `styles.css`에 `--c-gentry` 토큰을 정하고, 직종 아이콘(`spriteAtlas.ts`의 society 목록 등)에 `gentry`를 더한다.
- 하급 귀족은 행정청(세습 관료제)과 학교(귀족 가정교사)에서 일한다.

### 2-21. 학교 방식 두 가지
- `school_tutor` "귀족 가정교사"(기술 없음, 하급 귀족 100명, 1레벨 2만 명)와 `school_basic` "공립 학교"(인쇄술, 1레벨 10만 명).
- `MethodDef.seats`: 학교 1레벨이 가르치는 인구. 건물 패널에 보여 주면 좋다. `SCHOOL_CAPACITY` 상수는 없어졌다.

### 2-22. 세법 두 가지 (토지 기반 / 1인당)
- `Kingdom.taxLaw`: `'land'`(토지 기반 과세, 시작) 또는 `'capita'`(1인당 과세). AI 왕국은 스스로 고른다.
  - 토지 기반: 소작지 수확의 `Kingdom.landTax` 비율(0~25%)을 국고가 가져가 시장에 판다. 인두세·소득세는 걷지 않는다.
  - 1인당: 지금처럼 인두세 + 소득세. 소작농은 인두세를 1/4만 낸다.
- 재정 탭 세금 영역에 세법 선택을 넣고 `{ type: 'setTaxLaw', law: 'land' | 'capita' }`를 보낸다. 바꾼 틱은 `Kingdom.lawTick`이다.
  - 토지 기반일 때: 토지세율 슬라이더(0~25%)를 보여 주고 `{ type: 'setLandTax', value }`를 보낸다. 인두세·소득세 조절은 숨기거나 막는다.
  - 1인당일 때: 지금의 인두세·소득세 조절을 그대로 쓴다. 토지세율은 숨긴다.
- 이름: 토지 기반 과세 / Land-based taxation, 1인당 과세 / Per-capita taxation, 토지세 / Land tax
- 공급 출처 `subsistence`에는 토지세로 팔린 몫도 들어간다(새 출처 키 없음).

### 2-23. 예산은 빅토리아3식 정책 단계 세 개 (재정 탭, `views/FinancePanel.tsx`)
2-12와 2-19의 예산 편성(항목별 금액, 연구·교육·복지·건설)은 없어졌다. 이 절이 그 둘과 1-3·1-4·2-0·2-10의 세율·복지 부분을 대신한다.
- **가장 먼저 (머지 직후 재정 조작이 모두 막힌다):** 세율 입력 행은 지워졌고, 남은 비율 슬라이더는 `setBudget`이 늘 거부하는 값(0~100% 소수)을 보낸다. 세 손잡이의 1~5단계 선택을 가장 먼저 넣는다. 화면 작업 전에 급하면 `range`를 `min=1 max=5 step=1 value={단계}`로 바꾸는 속성 수정만 해도 동작한다.
- 장부 항목 이름: `ledgerLabels.tax`는 이제 토지세·인두세·소득세를 다 담는다. "소득세" → "세금" / "Taxes"로 바꾼다.
- 저장 호환: 저장 형식이 바뀌었다(`World.version` 4). `useGame.ts`의 `SAVE_KEY`를 `'estera-save-v7'`로 올려 두었다 (2-8과 같은 방식). 예전 저장은 열리지 않는다.
- 금액 편성이 없다. 왕실 정부 건물(행정청·건축사무소·학교)은 늘 100% 가동하고 임금과 원료를 국고에서 낸다. 국고가 모자라면 국채로 낸다.
- 정책 손잡이는 세 개다. `Kingdom.budget` = `{ tax, wages, research }`, 각각 정수 1~5(3이 보통). `BUDGET_ITEMS` = `['tax', 'wages', 'research']`, 단계 수는 `BUDGET_STEPS`(5).
  - 바꾸기: `{ type: 'setBudget', item: 'tax' | 'wages' | 'research', value: 1~5 }`
  - 이름: 세금 수준 / Tax level, 국영 임금 / Government wages, 연구비 / Research
  - 단계 이름: 매우 낮음 / 낮음 / 보통 / 높음 / 매우 높음 (Very low / Low / Normal / High / Very high)
  - 세금 수준: 지금 세법의 모든 세율 × 0.6 / 0.8 / 1 / 1.2 / 1.4 (`TUNE.taxLevels`)
  - 국영 임금: 기본 임금 × 임금 지수(`Kingdom.wageIndex`) × 0.7 / 0.85 / 1 / 1.15 / 1.3 (`TUNE.govWageLevels`). 바꾸면 왕실 임금(`me.wages`)이 바로 바뀐다.
    - 임금 지수 = 그 왕국 민간 노동자 평균 임금 ÷ 노동자 기본 임금 10 (빅토리아3의 '보통 임금'). 직종별 국영 임금은 이 지수 × 기본 임금(노동자 10, 기술자 20, 전문가 40 …)이다.
  - 연구비: 주간 경제 규모(`Kingdom.output`) × `TUNE.researchShare` × 0.5 / 0.75 / 1 / 1.5 / 2 (`TUNE.researchLevels`). `research.budget`은 지난주 연구비의 하루 평균 그대로다.
- `FinancePanel.tsx`에서 고칠 것
  - 비율 슬라이더(0~100%)를 1~5단계 선택(버튼 5개나 단계 슬라이더)으로 바꾼다. `BUDGET_ITEMS` 이름이 장부 항목 `tax`·`wages`·`research`와 같으니, 주간 수지 표의 그 세 행 오른쪽 칸에 둔다.
  - 머리줄 "비율"(`budgetShare`)은 "단계"로, 표 아래 "국고 적립" 줄(`retainedBudget`)과 합계(`total`)는 지운다.
  - 신분별 인두세·소득세 입력 행은 sim에서 없앴다. 화면이 컴파일되도록 그 행은 이미 뺐다. `setTax`·`setLandTax` 명령과 `Kingdom.pollTax`·`incomeTax`·`landTax` 필드는 없다. 세법 선택(`setTaxLaw`)은 그대로다(2-22).
  - 지금 세율은 `taxRates(kingdom)` → `{ land, poll, income }`로 읽는다(index에서 export). 토지 기반이면 land만, 1인당이면 poll·income만 0이 아니다. 세금 수준 옆에 숫자로 보여 준다.
- 지난주 국정 수지: `Kingdom.lastBudget` = `{ revenue, fees, wages, goods, research, interest }`
  - `revenue` 세입(세금 + 관세 + 주조), `fees` 민간 공사 수수료
  - `wages`·`goods` 왕실 정부 건물(행정청·건축사무소·학교)의 임금과 원료, `research` 연구비, `interest` 국채 이자
  - 이번 주에 쌓이는 세입은 그대로 `Kingdom.revenueWeek`다.
  - 수지(revenue + fees − wages − goods − research − interest)를 한 줄로 보여 주면 좋다.
  - `Kingdom.expenseEma`(주간 국정 지출 평균, 수수료를 뺀 값)와 국고가 버티는 주 수(현금 ÷ expenseEma), `Kingdom.wageIndex`도 보여 주면 좋다.
- 장부 항목 `welfare`(복지)가 없어졌다. `strings.ts`의 `ledgerLabels.welfare`, 교육 줄(`education`, `educationPending`)을 지운다. 지출 그룹은 이미 `wages, inputs, research, interest`로 줄여 두었다.
- 왕실 임금: 왕실 회사에는 `setWage`·`setWageOffset`이 오류를 돌려준다(국영 임금 수준으로 정한다). 왕실의 `Company.wageOffset`은 늘 `null`이다.
  - 재정 탭 `Wages` 섹션(`CompanyPanel.tsx` 449~459행의 직종별 임금 슬라이더)은 왕실이면 국영 임금 손잡이와 지금 임금 읽기 전용 표시로 바꾼다.
- 정부 건물 가동률: 왕실 정부 건물에는 `setUtilization`과 끄기(`setActive` false)가 오류를 돌려준다. 건물 패널의 가동률 조절과 끄기 버튼을 숨기거나 막는다.
- 모르는 명령(없앤 `setTax`·`setLandTax` 등)은 이제 "알 수 없는 명령입니다" 오류를 돌려준다.
- 학교: `MethodDef.grant`(보조금 배율)가 없어졌다. 학교는 왕실만 짓는다(`stateOnly`)는 점에서 행정청과 같고, 민간 지분도 붙지 않는다(2-15에서 학교 제외).
  - `ResourceInspector.tsx`의 "교육 서비스" 표시는 `method.seats` 기준으로 바꿔 두었다.
- 건축사무소: `Company.buildUsed`(왕실) = 사무소 포인트 중 공사에 실제로 쓰인 하루 양의 이동평균. AI는 이것으로 사무소를 늘리고 줄인다. 건설 탭에서 하루 능력(`constructionEstimate(...).pointsPerDay`) 옆에 막대로 보여 주면 좋다.
- 지표(`KingdomMetrics`): `education`·`welfare`가 없어지고 `feesWeek`, `govSpendWeek`(정부 건물 임금 + 원료), `interest`, `policy`(세 단계), `wageIndex`, `debt`가 생겼다. 화면은 아직 이 지표를 쓰지 않는다.

### 2-24. 행정청·학교는 땅을 쓰지 않는다 (건축사무소는 그대로 공장 부지)
- `BuildingTypeDef.land`가 선택 값이 됐다(`land?: LandType`). 행정청(`admin`)과 학교(`school`)는 `land`가 없다. 땅 칸도 매장량도 보지 않고 어느 자기 지역에나 몇 레벨이든 지을 수 있다.
- `roomFor(w, regionId, 'admin')`는 `Infinity`를 돌려준다. `landFree`에 `undefined`를 넘기지 않는다.
- 컴파일을 위해 `CompanyPanel.tsx`에 최소한만 고쳐 두었다:
  - 짓기 목록(`BuildList`): 땅이 없는 건물은 땅 이름과 남은 칸 수(`<small>`)를 그리지 않는다. 남은 칸은 `Infinity`로 보고 "땅 없음" 표시가 뜨지 않는다.
  - 짓기 막힘 꼬리표(`buildBlockers`): 땅이 없는 건물에는 "○○ 없음"을 붙이지 않는다.
  - 내 건물 조작(`Controls`): 땅이 없는 건물은 +, +10 버튼이 땅 때문에 막히지 않는다.
- 화면 작업자에게: 짓기 카드에서 땅 칸 대신 무엇을 보여 줄지 정한다 (예: 비워 두거나 "—"). 지역 패널의 땅 막대(`RegionPanel.tsx` 132~138행)는 그대로 맞다. 행정청·학교는 공장 부지 사용량에서 빠진다.
- 건축사무소: 맡은 공사가 없는 날은 쉰다(포인트·자재 없음, `b.idle`). 7일(`TUNE.officeIdleDays`)을 넘게 쉬어야 인부를 해산한다(`disbanded(b)`). 그 전까지는 일자리와 일꾼이 남고 임금이 나간다. 새 필드 `Building.idleDays`(쉰 날 수, 사무소만).
  - 일자리 수는 `b.idle`이 아니라 `slots(b, s)`(또는 `disbanded(b)`)로 센다. `CompanyPanel.tsx` `rowOf`(47행, 켜진 건물)와 `Workforce.tsx`(14행)의 일자리 계산은 `slots(b, s)`로 바꿔 두었다. 쉬는 7일 동안 "고용 8k / 일자리 0"과 빈 막대가 나오던 것이 없어진다.
    - `slots`를 쓴 것은 worktree의 클라이언트 typecheck가 저장소 루트의 main sim을 보기 때문이다 (새 이름 `disbanded`는 합친 뒤에 쓸 수 있다).
  - "쉼" 꼬리표(`CompanyPanel.tsx` 319행)와 원료 막대 숨김(328~329행)은 `b.idle` 그대로 맞다 (쉬는 날은 자재를 쓰지 않는다). `ResourceInspector.tsx`·`RegionPanel.tsx`의 가동률 표시도 `b.idle`이면 0%로 두어도 된다.
  - 새 필드 `Building.staffPeak`(사무소만, AI 철거 판단용)는 화면에 쓰지 않는다.

### 2-25. 기상 조건 (가뭄·홍수·산불, 새 표시)
- 지역에 기상 조건이 걸리면 그 땅의 산출이 강도 × 5% 줄어든다 (계절 90일 단위로 1~2계절, 진원지 확률은 계절마다 지역마다 5%). 건물은 투입도 같은 비율로 준다. 저장 형식은 그대로다 (조건은 시드와 날짜로 다시 계산한다).

| 조건 | 영어 | 깎이는 땅 |
|---|---|---|
| 가뭄 | Drought | 농지 (소작지·곡물 농장·섬유 농장·목장) |
| 홍수 | Flood | 농지, 광맥 (광산) |
| 산불 | Wildfire | 농지, 산림 (벌목장) |

- 읽는 함수 (index에서 export):
  - `harvestCondition(world, regionId)` → `HarvestCondition | null` = `{ kind, lands, intensity, cut, origin, start, end }`. `cut`은 감소율(0.2 = −20%), 남은 날 = `end − world.tick`.
  - `harvestLabel(world, regionId, en?)` → `"가뭄 농지 −20% · 45일"` / `"Drought farmland −20% · 45 d"`, 조건이 없으면 `null`.
  - 이름: `HARVEST_KINDS`(이름·영어 이름·땅). 땅 이름은 `LAND_NAMES`·`landNameEn`. 글은 직접 만들지 말고 `harvestLabel`을 쓴다 (알림도 같은 함수를 쓴다).
- 넣을 곳
  - 지역 목록(`views/RegionMap.tsx`)의 지역 이름 옆과 지역 패널(`views/RegionPanel.tsx`) 머리에 `harvestLabel` 칩 하나. 종류별 색: 가뭄 갈색·주황, 홍수 파랑, 산불 빨강 (다크 모드에서도 구분되게).
  - 지역 건물 목록에서 깎이는 땅의 건물(`BUILDING_BY_ID[typeId].land`가 `lands`에 있음)의 산출 옆에 `−20%`.
- 알림: 조건이 새로 걸리면 그 지역 왕국의 왕실에 `warn` 알림이 한 번 온다 (`regionId` 있음). 글은 지역 이름 + `harvestLabel`: `"강변 평야 가뭄 농지 −20% · 180일"` / `"River Plain Drought farmland −20% · 180 d"`. 플레이어 왕실(id 100) 것은 지금 규칙대로 토스트가 뜬다.
- 지표: `MetricPoint.harvestRegions` = 조건이 걸린 지역 수 (없으면 필드가 없다 → `?? 0`). 통계 그래프에 선 하나로 넣으면 좋다.


## 2026-10-22 확인

### 2-27. 100배 값 필드로 옮기기 (남은 것, 2026-10-21 확인)
- 저장 v6의 100배 값 필드(`Pop.wealth100`·`literacy100`, `Region.education100`, `Building.crew100`·`exp100`)는 sim 쪽 이야기이고, 불러오기(`sim.worker.ts` 71 `migrateWorld`)와 지역 개요(`RegionExplorer.tsx` 19·20 `literacyOf`·`educationOf`)는 이미 반영됐다.
- 남은 것: 옛 이름 사본(`p.wealth`·`p.literacy`·`r.education`·`b.crew`)을 읽는 세 파일을 읽는 함수로 바꾼다. 사본은 sim이 하루 끝에 다시 쓰는 소수 둘째 자리 값이라 지금도 맞게 보인다.
  - `CompanyPanel.tsx` 46 `b.crew ?? b.last.staffing` → `crewOf(b)` (작업 인원이 없으면 충원율을 돌려준다)
  - `PopTable.tsx` 28 부·문해력 칸 `p.wealth` → `wealthOf(p)`, `p.literacy` → `literacyOf(p)`. 23·24행 정렬도 `a.p[sort]`로 `wealth`·`literacy`를 읽으므로, 두 값을 행 객체(`incomeEma`처럼)에 계산해 넣고 거기서 정렬한다.
  - `RegionPanel.tsx` 119 교육 접근도 숫자와 막대 두 곳 `r.education` → `educationOf(r)`
- 다 바꾸면 3장에 "사본 지워도 됨"을 적는다. 그때 sim이 사본을 없앤다.
- 표시 규칙(그대로): 모든 저장값은 소수 둘째 자리, 0~1 비율은 소수 셋째 자리 이상을 보이지 않는다. 문해력·교육 접근도는 주 1회 바뀌어 그래프가 계단으로 보일 수 있다.


확인 근거: CompanyPanel의 b.crew → crewOf(b), RegionPanel의 r.education → educationOf(r), PopTable의 부·문해력 렌더링 및 정렬 → wealthOf(p)·literacyOf(p). Household.wealth는 별도 집계값이므로 유지. sim 파일 변경 없음.


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


**2026-10-25 구현·확인:** `marketScope.ts`, `MarketWindow.tsx`, App 연결. 거래량 가중 가격/무거래 평균/합산/왕국 제한/잘못된 저장값을 새 테스트 3개로 확인. 세계·왕국·지역 범위와 지도 선택 독립, 명시적 지도 맞춤, 방향키/Home, 새로고침 기억을 실제 브라우저에서 확인. 1920×1080 한국어 밝은 모드에서 가로 넘침 없음, 콘솔 오류 없음. 루트 typecheck 및 build 통과. 왕국 가격 추이는 기존 지역별 history 가격의 단순 평균이며 세계 추이는 metrics의 ratio를 기본 가격으로 환산한다.

### 2026-11-01 서브윈도우 독립 이력 기반 (우선순위 2 일부, 화면 미검증)
- DetailWindow마다 NavigationProvider와 뒤로/앞으로 버튼을 배치. 부모·형제 상세 창과 이력 분리.
- BuildingPops 직종·집단/1인당, ResourceInspector 투입/산출·선택 건물·정렬·검색·BuildingInspector 소유 기관 선택을 이력 상태로 연결. 컴포넌트별 useId로 키 충돌 방지.
- 루트 npm.cmd run typecheck 통과. ownershipPop 기존 회귀 시험의 현재 체크아웃 3개 통과 (명령이 임시 worktree 사본도 함께 수집했으며 해당 사본 결과는 이 변경의 근거로 사용하지 않음).
- 화면 미검증. 전체 우선순위 2 완료가 아님: 인구·토지·교육의 부모 창 이동 콜백은 후속 내부 경로 연결 필요. UI_CHANGES의 해당 항목 유지.



## 2026-11-01 확인 (main `31ca0d5` 클라이언트 코드 대조, 화면 미검증)

> 코드로만 확인했다. 화면 작업자(Codex)는 브라우저를 열 수 없어 배치·클릭·영어/다크 모드를 보지 못했다 (화면 미검증). 화면 검증은 UI_CHANGES 0장 "검증" 줄에 남아 있다.

### 확인 근거
| 절·기록 | 근거 (파일:행) |
|---|---|
| 2-68 | `researchLayout.ts:11~12` 깊이(선행 사슬 길이)마다 한 행, `:16~17` 선행 기술 x 평균으로 행 안 정렬 (선행 없음은 선언 순서, 안정 정렬), `:13` 폭 = 가장 긴 행 × 204 (TECHS에서 계산, 고정 폭 없음), `:18` 행 가운데 정렬. `views/ResearchPanel.tsx:45~51` 계통도: 가로 스크롤·빈 곳 드래그·확대/축소. 화면 미검증. |
| 2-50 (일부) | `views/OwnerSummary.tsx:6~13` 금고·자리 충원 막대, 적용 `BuildingEconomics.tsx:16`, `RegionIndustry.tsx:56·58`, `OwnershipBrowser.tsx:33`. 가동률·원료 줄 숨김 `ResourceInspector.tsx:39~40`, `GroupDetail.tsx:17·23`. 남은 것(옛 상회 보기 행)은 UI_CHANGES 2-50에 다시 썼다. 화면 미검증. |
| 2026-11-01 서브윈도우 독립 이력 기반 (Codex가 먼저 옮긴 기록, 이 절 바로 위) | 근거 맞음: `views/DetailWindow.tsx:18~20` 창마다 NavigationProvider·뒤로/앞으로, `BuildingPops.tsx:14·20`, `ResourceInspector.tsx:24·52~56` `useNavigationState`. 남은 것도 맞음: `PopTable.tsx:42` 지역·건물 링크가 부모 창으로 간다 (UI_CHANGES 0장 2번). |
| 3장 "팝 상세 후속 요구" | sim `types.ts:215` `Pop.incomeBreakdown`, 화면 `BuildingPops.tsx:40` 소득·세금 세부 표. 요청이 처리되어 3장에서 지웠다. |
| UI_CHANGES 3장 뒤 구현 기록 (2026-10-28~30, Codex 작성) | 팝 소득 원천 `BuildingPops.tsx:40`. 드래그 `windowDrag.ts:6` (requestAnimationFrame), `WindowWorkspace.tsx:29`. 연구 창 재설계·계통도 `ResearchPanel.tsx:40~51`, `researchLayout.ts`. 법 도움말·정책 창 `PolicyPanel.tsx:18~22` (역할 툴팁·사전 항목·분야 칸). 재정 상세 창 `FinancePanel.tsx:1·39` (DetailWindow). 경제 추이 9지표 `EconomyCharts.tsx:7~8`. 시세 범위 `marketScope.ts:16~20`. 유보자산 바 `ReserveBar.tsx:8`. 건물 요약 바 `BuildingMetricBars.tsx:7`. 지도 도로 경로 `scripts/build-map.ts` `routes`: 경로 목록·끝점 검증 줄은 2026-11-01 기준 커밋 안 된 작업 사본에만 있다 (`git diff`). 모두 화면 미검증 (기록 안의 "확인"은 그 날 Codex 기록). |

### 2-68. 연구 트리는 실제 모양대로 (사용자 요청 2026-10-28 "옆이 길어도 되니까 실제 되있는것처럼 그리면 좋겠는데")
> 2026-10-29: 깊이별 한 행·선행 위치 평균 정렬·트리 내부 가로 스크롤 구현. 실제 브라우저/영어·다크 시각 검증은 대기. 아래 “지금”은 변경 전 설명.
- 지금: `ResearchPanel.tsx:14`가 같은 깊이(선행 사슬 길이)의 기술을 `i%2`로 두 열에 접어 놓는다. 실제 폭은 깊이 0~3에서 6 / 3 / 2 / 6인데 어느 깊이나 폭 2처럼 보이고, 줄이 3~4개로 늘어난다.
- 바꿀 것: 깊이 하나가 한 줄(행)이다. 그 깊이의 기술을 `x = 인덱스 × 노드 폭`으로 한 줄에 전부 놓는다. 트리 영역은 가로 스크롤을 허용한다. 줄 사이 간격과 선행선 곡선(`ResearchPanel.tsx:24`의 path)은 그대로 쓰되 좌표만 새 배치를 따른다.
- 줄 안의 순서는 선행 기술이 있는 기술이 그 선행 기술 아래쪽(x 평균 근처)에 오도록 정렬해 선이 덜 엉키게 한다 (선행 없음 기술은 `TECHS` 선언 순서).
- 지금 값 확인: `TECHS`(data.ts)는 17개. 깊이 0 = 제분·염장, 물레, 괴철로, 수공업 길드, 인쇄술, 마찻길(6) / 깊이 1 = 철 가공, 목재 비계, 코크스 제련(3) / 깊이 2 = 개량 농기구, 증기기관(2) / 깊이 3 = 증기 양수기, 증기 직기, 기계식 식품 가공, 농업 기계화, 증기 철도, 철골 건축(6). sim 쪽 기술 구조는 나중에 바뀔 수 있으므로 폭을 고정값으로 두지 않는다.
- 노드 선택, 연구 중 표시, 알려진 기술 표시, 툴팁은 지금 동작 그대로 둔다. 영어/다크 모드에서도 구분이 되어야 한다.


### 2-50. 저택·금융가에는 가동률·원료 충족을 보이지 않는다 (사용자 2026-10-21)

> 2026-10-28: 주요 경로 구현, 시각 검증 대기. OwnerSummary로 귀족/직원 충원·금고·하루 수입 통일. 타입 검사와 렌더링 테스트 3개 통과. UI_WINDOWS_2026-10-28 기록 참조.

- 저택(`manor`)과 금융가(`finance`) 건물 상세·목록에서 가동률 막대·손잡이와 원료 충족(`inputFill`) 표시를 모두 없앤다. sim에서 둘 다 늘 100%로 고정이다 (DECISIONS 7-19).
- 대신 보이는 것: 자리 충원 `앉은 인원 / 자리` 막대(저택은 상급·하급 귀족 두 줄, 금융가는 전문가 직원), 금고 금액, 주간 수입(2-32).
- 고칠 곳: 건물 상세(`ResourceInspector.tsx` BuildingInspector)와 지역 건물 목록에서 `BUILDING_BY_ID[b.typeId].ownership`인 건물은 가동률·원료 줄을 그리지 않는다.

### 3장 팝 상세 후속 요구 (원문, 2026-11-01 처리 확인)
소유 기관→개별 팝 연결 구현. 임금·배당·지대·세금 상세 금액은 미완료: 현재 Pop.lastIncome은 세후 합계만 보유. sim에서 팝별 일별 수입/세금 실적 API 제공이 필요하며 초기화·병합·저장/불러오기 정책을 포함해야 함. 연결·경계의 실제 브라우저 검증도 남음.


### UI_CHANGES 3장 뒤 구현 기록 (원문, 2026-10-28~30, 2026-11-01 옮김)

#### 팝 실제 소득 원천 기록 (2026-10-28 후속)
- Pop.incomeBreakdown 선택 필드 추가: wages/dividends/rent/sales/welfare/other/tax. 실제 지급·차감 시점에 관찰값만 누적. 기존 돈 이동, 소득 계산, AI 판단은 변경하지 않음.
- 매일 lastIncome 초기화와 함께 초기화. 금융가 성과급은 wages, 누적 금고 환급은 other, 소작 판매는 sales. 세금은 양수 지출로 표시.
- 기존 lastIncome과 동일하게 팝 ID의 수령 실적을 기록. 인구 이동 시 이전 팝의 과거 수령 기록은 옮기지 않음. 소멸한 팝은 기존 삭제 정책을 따름. 세계 전체 누적 장부로 사용하면 안 됨.
- JSON 저장에 포함. 이전 저장에 필드가 없으면 —와 다음 하루 진행 안내 표시. 주간 지급은 지급일 실적이며 하루 평균으로 나누지 않음.
- BuildingPops에서 집단/1인당 전환과 함께 실제 내역 표시. 앞선 '소득 원천 API 미구현' 상태를 대체함.

#### 창 드래그 렌더링 최적화 (2026-10-28)
- WindowWorkspace pointermove는 React setState 없이 ref의 마지막 좌표만 갱신. requestAnimationFrame당 transform translate 1회. pointerup에서 최신 좌표를 flush한 뒤 setPositions 1회. cancel/lostcapture 중복 완료 차단, unmount RAF 취소, 임시 will-change 정리.
- 기존 20px 방향키 이동 및 workspace 경계 clamp 유지. 최신 경계는 ref로 참조. 다른 포인터는 무시.
- GameWindow/RegionWindow/RegionPanel/MarketWindow/PopTable/BottomPanel memo. 탐색 Context value와 useNavigationState setter를 안정화하고 GameWindow 경로 콜백, 지역/시세 부모 콜백을 useCallback으로 고정. useGame 반환값을 useMemo로 고정하여 창 focus만 바뀌는 App 렌더에서 game props가 변하지 않게 함.
- Worker 스냅샷 보류는 아직 추가하지 않음: 실제 성능 기록으로 필요성이 확인되지 않음. 실제 world 변경은 정상 반영.
- DevTools Performance 전후 기록 미완료. IAB browser.user is unavailable. 일반 브라우저 복구 시 게임이 아닌 개인 페이지가 발견되어 자동 승인 검토가 접근 거절. 개인 페이지를 더 읽지 않음. 프레임 시간 수치/컴포넌트 렌더 횟수를 실측했다고 주장하지 않음.
- 재측정: 동일 seed/속도/배율 및 1920×1028 브라우저 조건, 인구·건물 창 각각 동일 경로 5초 드래그. Performance에서 scripting/rendering/frame duration 비교하고 React Profiler에서 pointermove로 인한 표 commit 유무 확인. 방향키·모서리·capture loss·Worker 갱신 중 드래그 검사.

#### 연구 창 전면 재설계 — 2026-10-29
- 사용자 피드백에 따라 주 창의 긴 그래프를 제거. 현재 연구/KPI → 가능·잠김·완료·전체 필터 및 검색 → 짧은 목록 → 선택 기술 상세/연구 버튼으로 재구성.
- 선택 상세는 선행 기술 링크, 비용·남은 주·진행, 건물/생산 방식/정책 해금 표시. 목록은 연구 명령을 실행하지 않고 선택만 변경. 명령은 별도 버튼에서 실행.
- 전체 계통도는 960×620 기본 크기의 이동·크기 조절 가능 DetailWindow로 분리. 깊이별 한 행 규칙 유지, 빈 공간 드래그 스크롤, 확대/축소·너비 맞춤·선택 위치 버튼과 오른쪽 상세. 폭이 좁아지면 상세를 아래로 배치.
- 선택은 기존 주 창별 이력을 사용. 계통도는 같은 연구 선택을 공유하며 별도 독립 이력을 구현한 것은 아님.
- sim 변경 없음. 실제 화면 배치와 상호작용 검증은 별도로 필요. 과거 2-48의 모든 상세 툴팁·사전/정책 이동을 완료했다고 처리하지 않음.

#### 연구 계통도 정렬·간격 보정 (2026-10-29)
- 각 깊이의 기술 묶음을 전체 트리 중심에 정렬. 첫 열람 시 스크롤도 가로 중앙. 축소 시 트리 자체를 viewport 가운데 배치.
- 행 간격 116→184px, 노드 사이 세로 여백 28→96px. 연결선 제어점은 단계 사이 중간으로 조정.

#### 연구 노드 시각 상태 (2026-10-29)
- 계통도 박스 텍스트는 기술명·포인트만. 완료 체크/녹색, 잠김 자물쇠/점선, 가능 빈 원/금색 실선, 연구 중 채운 원/금색 이중선. 상태 텍스트는 aria-label에만 남김. 진행 막대는 상세에 유지.
- 기술 툴팁은 해금 건물·방식·정책 이름만 나열. 노드 포인트의 별도 숫자 툴팁도 제거해 해금 목록을 덮지 않음.

#### 법 선택 도움말 (2026-10-29)
- 각 법 이름에 키보드 포커스/호버 가능한 한 줄 역할 툴팁(ko/en strings). 화면에 상시 설명 문구는 추가하지 않음.
- 법 이름 옆 책 아이콘으로 공개 사전 tax-laws/invest-law/welfare 항목을 새 탭에 열기. 법 변경 버튼과 분리. 현재·잠긴 법도 도움말 접근 가능.
- 세금·복지 대상 설명은 현재 taxDue/welfareGroup 구현 기준. sim 수정 없음.

#### 정책 창 정리 (2026-10-29)
- 세법·투자법·복지법의 현행 법을 상단 세 칸으로 요약. 선택 분야의 짧은 법 목록과 하나의 상세/전환 버튼만 표시.
- 조건·기술 링크·주간 비용·사전 링크는 선택 상세에 모음. 역할 툴팁 유지. 전환 중 진행/취소/조건 상실 경고 유지. 분야별 선택은 창 탐색 이력에 기록. sim 수정 없음.

#### 재정 창 링크·상세 복구 (2026-10-29)
- 주 창 간 다른 분야 링크는 대상 창을 열고 앞으로 가져옴. 재정→정책, 정책→연구, 재정 상세→지역 건물에서 출발 창 제목과 내용이 달라지지 않게 함. 같은 분야의 탐색은 해당 창 이력 유지.
- 재정 고정 aside를 body portal의 공통 DetailWindow로 교체. transform을 가진 주 창의 좌표계 영향 제거, 이동/크기 조절/경계 보정/닫기 적용. 인건비 계산식과 수지 세부 문자열 줄바꿈 보강.
- 기존 tax/goods/tariffs/wages/welfare 등 budgetDrill 데이터를 유지. sim 수정 없음. 실제 화면 검증은 별도로 필요.

#### 경제 추이 그래프 추가 (2026-10-29)
- 통계의 경제 추이: GDP·1인당 GDP, 인구·평균 생활수준·실업 인구 비율·문해력, 국고 현금·국채·가계 저축 총 9종.
- 기존 world.metrics 월별 기록 사용. 왕국 비교 토글, 1년/5년/전체 기간, 값 호버 표시. 1인당 GDP는 같은 기록의 인구로 나누고 생활수준은 인구 가중. 국고는 순금고 아닌 현금으로 명시. 기록 2개 미만은 대기, 결측값을 0으로 채우지 않음. sim 수정 없음.

#### 시세 범위 UI 통일 (2026-10-29)
- 세계/왕국/지역 모두 지역 UI의 전체 시세표→상품 상세→수요·공급→가격 추이 탐색 구조 사용. 지역별 가격 비교 추가 유지.
- ResourceInspector에 실제 지역 집합/합산 시장을 전달, 가짜 Region을 만들지 않음. 범위 안 생산/소비 건물과 지역명 표시. 공급/수요 구성은 지역별 출처 합산(내부 교역도 포함).
- 현재 가격은 거래량 가중 평균, 역사 가격은 기록된 지역 가격 단순 평균으로 툴팁에 구분. 누락된 과거 값을 0으로 채우지 않음. 시세표 가치와 정렬은 지역 UI의 가격×(공급+수요)/2 기준으로 통일.

#### 시세·통계 후속 검증 (2026-10-29)
- 가격 이력에서 불완전한 지역 기록의 timestamp를 보존하여 결측 전후를 선으로 잇지 않도록 수정. 유효 기록 2개 미만은 ‘가격 기록 대기’, 상세 조건은 툴팁.
- 경제 규모 툴팁에 실제 kingdomGdp 정의(가계 일일 incomeEma 합계 × 360일)를 명시. sim 변경 없음.
- 루트 npm run typecheck 통과. marketScope/marketUnified 9개 테스트 통과: 범위 집계, 공통 UI, 초기 그래프 대기, 결측·0값·비정상 값 처리.
- 서버 5199 재실행 후 IAB에서 실제 innerWidth=1920, innerHeight=1028 확인. 세계→왕국→북부 광산지대 범위 변경, 곡물 클릭→상품 상세, 생산 건물 수 왕국 2/지역 1, 가격 기록 대기, 통계 경제 추이 초기 표시 확인. 화면 캡처 저장.
- 이번 검증은 초기 데이터·한국어 밝은 모드. 장기 기록 그래프 곡선·호버, 영어/다크 모드, 드래그 성능 실측은 미검증. 이전 연결 오류를 현재 상태로 간주하지 않음.

#### 유보자산 바 통일 (2026-10-29)
- ReserveBar를 개별 BuildingEconomics와 지역 건물 그룹 RegionIndustry에 공통 적용. 소유권 바와 같은 24px 높이·테두리·클릭 스타일, 동전 아이콘과 금색 충전/회색 잔여 공간.
- 보유액/상한과 비율은 바 전체 폭 위에 표시하여 낮은 충전율에서도 잘리지 않게 함. 색칠은 0~100%로 제한하되 실제 금액·초과 비율은 유지. 상한 0은 비율 —.
- 클릭 시 이동 가능한 상세 창에서 정확한 보유액·상한·충전율·주간 적립을 확인. 중복된 유보자산 본문 줄 제거. 한국어/영어 지원, sim 변경 없음.
- client 타입 검사 통과. 이번 브라우저 조작은 browser.user unavailable 오류로 실제 배치/클릭 검증 미완료.

#### 건물 요약 바 통일 (2026-10-29)
- 지역 건물 그룹의 고용/필요 인원·주간 이익·레벨당 이익을 유보자산과 동일한 24px 아이콘 바로 변경. 기존 숫자 나열과 얇은 충원 바 제거. 개별 건물의 이익 두 항목에도 공통 적용.
- 충원은 파란 채움과 비율, 이익은 초록/빨강/회색과 +/-로 구분. 이익에는 상한이 없으므로 가짜 충전율을 표시하지 않음. 레벨당 이익의 단위는 주·L. 항목명·툴팁·상세 창 제공. sim 변경 없음.
- 검증: 루트 npm run typecheck 통과. 실제 1920×1028 브라우저 배치·클릭 검증은 미완료.

#### 지도 경계·연결선·강 보정 (2026-10-30)
- 지역 내부의 긴 직선 경계를 완만한 곡선형 폴리라인으로 보정. 맞닿은 영역 채움·클릭 도형·경계선·호수·산지에 동일한 공유 좌표 적용. 생성된 배경 이미지와 sim은 변경하지 않음.
- 중심 사이 일괄 곡선 대신 인접 지역 9쌍별 도로 경로 지정. 호수와 중앙 산지를 우회하고 실제 지역 연결점에 종착. 선택 지역에 연결된 길을 강조하며 도로·강·국경의 선 굵기를 구분.
- 두 강에 각각 두 지류를 합류시키고 본류/지류 굵기 구분. 서부는 해안에서 클립, 동부는 지도 밖까지 하류 연장.
- build-map에 도로 목록/끝점 검증 추가. 7개 지역·9개 인접 관계 통과. Shapely 검사에서 지역 7개와 미소유지 2개 폴리곤 유효·내부 중첩 없음. 전체 타입 검사 통과.
- 1920×1028 CSS viewport에서 한국어 밝은 모드 지도 및 확대/초기화 확인. 다크 모드 실측은 남음. 바깥 지도 확장부의 긴 직선과 배경 이미지의 사각 이음새는 별도 개선 대상.

### 2-69. 왕실 생산 건물 임금은 읽기 전용 (sim 2026-10-29, 2-65 이어서, 깨진 화면)
- 지금: 재정 창 `FinancePanel.tsx:38`이 `<Wages>`를 그리고, `CompanyPanel.tsx:459~461`이 회사 종류와 상관없이 직종마다 `input type="range"`(시장 임금 대비 −50~+100%)를 그린다. 플레이어 왕실(`me.state && me.isPlayer`)이 움직이면 sim이 `setWageOffset`·`setWage`를 거절한다 (`commands.ts:149·157`, "왕실의 생산 건물 임금은 시장 임금입니다" / "Crown production wages follow the market"). 끌 때마다 오류 토스트가 뜬다.
- 바꿀 것: `me.state`이면 슬라이더와 오프셋 %(`spct(offset)`)를 그리지 않는다. 직종마다 한 줄: 직종 이름 · 임금 `me.wages[s]` · 시장 임금 `marketWage(world, s, me.id)` · 실업 막대 `unemploymentRate(world, s)` (지금 `wage-meta` 그대로). 위 줄 국영 임금(`me.stateWages`, `CompanyPanel.tsx:448`)은 그대로 둔다 (국영 임금 단계가 정한다).
- 민간 플레이어의 임금 조정(슬라이더)은 그대로.
- 문자열: 새 문자열 없음.
- 완료 기준: 왕실에서 재정 창의 range 입력 0개, 임금 명령 오류 토스트 없음. typecheck.

- 2026-11-01 코드 완료, 화면 미검증: Wages에서 me.state일 때 range와 오프셋 %를 렌더링하지 않음. 국영 임금·시장 임금·실업 막대 보존, 민간 조정 보존. 루트 npm.cmd run typecheck 전체 통과. sim 변경 없음.
- 2026-11-01 확인 (UI/UX 담당): `CompanyPanel.tsx:457·459`의 `!me.state` 분기로 왕실은 오프셋 %와 range를 그리지 않는다. 근거 맞음, 화면 미검증.

### 서브윈도우 내부 경로 명세 (2026-11-01)
- UI_DESIGN 2.3·3장 대응: 인구 구성 → 직종 팝 목록 → 개별 팝 → 거주 지역/근무 건물, 토지·교육 → 지역 건물 목록 → 건물 → 상품/소유 회사의 지역 건물 목록. 모두 같은 DetailWindow의 NavigationProvider에 route를 기록한다.
- 원래 개요 버튼 및 제목줄 뒤로/앞으로 제공. 다른 주 창 선택·좌표·경로를 변경하지 않는다. 대상이 사라지면 — 표시.
- 인수 조건: 부모 onPops/onBuildings를 상세 내부에서 호출하지 않음, 경로별 실존 대상 검사, 한/영 라벨, 루트 타입 검사. 화면 미검증.

- 코드 완료, 화면 미검증. DetailExplorer 신규: 상세별 route 상태와 실존 대상 검사. RegionExplorer의 인구·토지·교육 내부 링크 연결. PopTable preserveSelection 모드로 뒤로 이동 시 선택 팝·직종을 초기화하지 않음. 기존 주 창의 요청 동작 유지.
- 검증: 루트 npm.cmd run typecheck 전체 통과. 한/영 라벨, 기존 테마 클래스 사용. sim 변경 없음. 실제 클릭·뒤로/앞으로·영어 밤 검증은 남음.


### 2026-11-01 2-51 공통 흐름 1차 (부분, 화면 미검증)
FlowRow: 실제 투입(충원·기상·충족), 실제 산출, 지역 단가/금액, 충족/판매 추정 막대, 서비스·소작·소유 기관 분기. 상세·상회 펼침·건설 방식·방식 비교 적용. root typecheck 통과. 전체 2-51 잔여는 UI_STATUS 참조.


### 2026-11-01 2-42·2-59 그룹 잔여 (화면 미검증)
GroupDetail에 세금 한도·학교 자리·실제 건설 포인트 합계, 일간 수지 Waterfall, 미지정 배당 수령 기관 링크 추가. 기존 그룹/OwnershipBar 유지. 루트 타입 검사 통과. 주간 수지 분해는 sim week API 대기로 남음.


### 2026-11-01 2-49 철거 일정 (부분, 화면 미검증)
DemolitionProgress: 남는 레벨·철거 대기·이번 주 1레벨, 다음/전체 완료 일수, 주기 막대, 취소, reduced-motion 대응. 루트 타입 검사 통과. 개별 회수 자재는 buildingId 부재로 막힘(UI_STATUS).


### 2026-11-01 2-70 K 개발 계측 (코드 완료, 화면 미검증)
개발 빌드 + trace=1일 때만 trace.dev 동적 로드. 세션/창 열기·닫기·포커스/클릭/명령/오류/속도 기록, 최대 20,000건, localStorage 실패 무시, 메뉴 로컬 JSON 내보내기. world를 읽거나 변경하지 않고 tick 숫자만 전달. 네트워크 호출 없음. 루트 typecheck 통과, Vite 공개 빌드 성공(.tmp-ui-prod), 결과물 estera-trace 검색 0건. 실제 개발 브라우저 JSON 다운로드·이벤트 순서 검증은 미실시. tooltip은 선택 항목으로 미추가.


### 2-70. K 시험용 계측 (오버홀 09 단위 K, 3.8·U7)
- 목적: 1a 사람 시험 기록 일곱 가지 중 1~4·6·7의 숫자(숫자 → 처방 클릭 수, 첫 처방까지 분, 연구 선택 → 첫 재생 초, 창 열림 순서, 정지 구간, 처방 뒤 확인 행동)를 사람이 세지 않아도 되게 한다. sim은 이 기록을 읽지 않는다.
- 켜는 조건: 개발 빌드(`import.meta.env.DEV`)이고 URL에 `?trace=1`이 있을 때만. 공개 빌드에는 코드가 들어가지 않게 `import.meta.env.DEV` 분기 안에 둔다 (U7 기본값 "개발 빌드만"). 외부 전송 없음: `fetch`·`sendBeacon`·이미지 핑을 쓰지 않는다.
- 기록 (새 파일 `src/trace.ts`, 메모리 배열 + `localStorage` `estera-trace-v1`, 최대 20,000건, 넘으면 앞에서 자름. 저장 실패는 무시):
  - 한 건 = `{ t: 시작부터 벽시계 ms, tick: world.tick, kind, ... }`.
  - `session`: 시작 시각(ISO), 언어, 테마, `innerWidth`·`innerHeight`, `devicePixelRatio`.
  - `window`: 창 id, `open`/`close`/`focus` (`App.tsx` `showWindow`·`openLinkedWindow`, `WindowWorkspace.tsx:21~22` `focus`·`close`). DetailWindow 열기/닫기도 제목과 함께.
  - `speed`: 이전·다음 ticksPerSecond와 원인 `user`/`key`/`danger`/`reached` (`useGame.ts:49` `setSpeed`, `:80~84` 위험 정지, 단축키 `App.tsx` keydown).
  - `command`: 명령 객체 그대로 (`useGame.ts:125`). 오류는 `error` 건으로 따로 (worker `errors`, `useGame.ts:67`).
  - `click`: 문서 `pointerdown` 캡처 한 곳에서. 창 id(가장 가까운 `section.strategy-panel`의 `window-*` 클래스 또는 DetailWindow 제목), 대상 라벨(`aria-label` → `data-help` 첫 줄 → 텍스트 앞 40자).
  - `tooltip`: 툴팁이 뜬 라벨 (`TooltipLayer.tsx`, 선택).
- 내보내기: 메뉴(`App.tsx:178` Popover)에 계측이 켜졌을 때만 버튼 하나. 누르면 `{ version: 1, startedAt, events }`를 `estera-trace-<YYYYMMDD-HHmm>.json`으로 내려받는다 (Blob + `a download`). 버튼 옆 건수 숫자.
- 문자열: "기록 내보내기" / "Export trace" (개발 전용).
- 완료 기준: `?trace=1` 개발 서버에서 내보낸 JSON에 위 kind가 다 나온다. 공개 빌드(`npm run build`) 결과물에 `estera-trace` 문자열 0건. 코드에 네트워크 호출 없음. 계측을 켜도 world 상태가 같다 (기록은 world를 건드리지 않는다). typecheck.



### 2-76. 처음 실행할 때 KR / EN 선택 (사용자 요청 2026-11-01: "KR/EN 선택을 게임 시작할 때 나오게 할 것")
- 지금:
  - 언어는 `lang.ts:6~8` `loadLang()`이 `localStorage['estera-lang']`을 읽어 `'en'`이면 영어, 그 밖(키 없음·읽기 실패 포함)은 모두 한국어. 묻지 않는다.
  - `setLang` (`lang.ts:15~20`)은 `lang === current`이면 바로 돌아가므로 저장하지 않는다. 그래서 한국어로만 해 온 사람은 키가 한 번도 저장되지 않았다.
  - 바꾸는 길은 메뉴 팝오버의 KO / EN (`App.tsx:193~198`) 하나뿐.
  - 시작 화면은 없다. `App.tsx:116`은 세계가 오기 전 문장 표시(`.boot`, `styles.css:75`)만 보이고, `useGame.ts:99~101`이 저장을 질문 없이 불러온다. 시작 속도는 0 (`useGame.ts:31`, 정지 상태로 시작).
- 바꿀 동작:
  1. 저장된 언어가 없으면 (`localStorage['estera-lang']`이 `'ko'`도 `'en'`도 아니거나 읽기 실패) 게임 화면 대신 언어 선택 화면을 먼저 보인다. 새 게임이든 저장 불러오기든 같다.
  2. 고르면 `localStorage['estera-lang']`에 쓰고 바로 게임 화면으로 간다. 다음 실행부터는 묻지 않는다.
  3. 저장에 실패하면 (사생활 모드 등) 이번 실행은 고른 언어로 그대로 진행하고, 다음 실행에서 다시 묻는다. 경고·토스트는 띄우지 않는다.
  4. 메뉴의 KO / EN (`App.tsx:193~198`)은 그대로 둔다.
  5. 기본 강조 (추천안): `navigator.language`가 `ko`로 시작하면 "한국어", 아니면 "English"를 강조하고 그 버튼에 `autoFocus` (Enter로 고를 수 있게). 강조만 하고 저절로 넘어가지 않는다. 고르는 것은 사용자. 이유: 클릭 한 번으로 끝나고, 틀리게 고를 일이 줄어든다.
- 고칠 곳:
  - `lang.ts`: `hasStoredLang(): boolean` (저장값이 `'ko'`·`'en'`이면 true, 읽기 실패면 false)와 `chooseLang(lang: Lang)`을 더한다. `chooseLang`은 `lang === current`여도 저장을 시도하고 (위 `setLang` 조기 반환 때문에 "한국어"를 고르면 저장되지 않는 문제를 피한다), 바뀌었으면 구독자에게 알린다. 기존 `setLang`·`getLang`·`subscribeLang`은 그대로.
  - 처음 `current`: 저장값이 없으면 브라우저 언어로 정해도 된다 (선택 화면이 바로 덮으므로 보이는 차이 없음). 바꾸지 않아도 된다.
  - 선택 화면: 새 파일 `views/LanguagePick.tsx`. `App.tsx`에 `const [langChosen, setLangChosen] = useState(hasStoredLang)`를 다른 훅들과 같이 두고, `App.tsx:116`의 `if (!world)` 바로 앞에 `if (!langChosen) return <LanguagePick onPick={(l) => { chooseLang(l); setLangChosen(true); }} />`. 워커(`useGame`)는 그 사이 뒤에서 세계를 불러와도 된다 (속도 0이라 시간이 흐르지 않는다). 저장에 실패해도 `langChosen`은 이번 실행 동안 true로 남는다.
  - 모양: `.boot`와 같은 가운데 정렬, 문장(`crest`) 48px 위에 버튼 둘을 가로로. 기존 `.segmented`·`aria-pressed` 양식이나 큰 버튼 둘 (최소 높이 44px). 강조는 `aria-pressed="true"`처럼 `--ink` 바탕 / `--sheet` 글자로, 다크 모드(`:root[data-theme="dark"]`)에서도 강조와 보통 버튼이 구분돼야 한다. 테마는 이미 저장된 값(`App.tsx:39` `loadTheme`)을 따른다. 1920×1080 한 화면, 스크롤 없음.
  - 각 버튼에 `lang="ko"` / `lang="en"`. 그룹 `role="group"`, `aria-label="언어 / Language"` (아직 언어를 모르므로 둘 다).
- 문자열: 버튼 라벨은 각자 제 언어로 고정: "한국어", "English". `strings.ts` KO·EN 둘 다에 같은 값 `languageNames: { ko: '한국어', en: 'English' }`로 두거나 컴포넌트 상수로 둔다. 그룹 라벨 "언어 / Language". 제목·안내 문구는 넣지 않는다.
- 빼거나 지울 것: 없음.
- 알려진 영향: 지금까지 한국어로만 해 온 사람(키 없음)도 이 변경 뒤 처음 한 번은 묻는다. 의도한 동작으로 본다.
- 오버홀 Q16(`docs/overhaul/12_DECISIONS_NEEDED.md:227`, 새 게임 시작 화면·시작 상태 프리셋)과 단위 M의 "이어하기 / 새 판"(09 3.8, `09_UI_UX.md:312`)과 겹치지 않는다. 이 선택 화면은 그 결정과 상관없이 지금 넣는다. 나중에 시작 화면이 생기면 언어 선택은 그 앞에 한 번 나온다.
- 완료 기준: 키가 없을 때 첫 실행에 선택 화면, 고르면 `estera-lang` 저장 ("한국어"를 골라도 저장됨), 새로고침하면 바로 게임, 메뉴 KO / EN 그대로 동작, `npm run typecheck` 통과. 화면 미검증 표시 허용 (Codex는 브라우저를 못 연다).
- 사용자 결정이 필요한 것: 없음.



### 2026-11-01 2-76 첫 실행 언어 선택 (화면 미검증)
저장 언어 없으면 LanguagePick 표시, 브라우저 언어에 따른 강조/포커스, 선택 후 진입. chooseLang은 같은 언어도 저장하며 실패 시 세션 진행. 기존 메뉴 보존. 루트 타입 검사 통과, 언어 저장·저장 실패 회귀 2개 통과.


### 2-71. C 국가 창: 정책 + 재정을 탭 둘로 (오버홀 09 단위 C, 3.3·6.4)
- 지금: 창 둘. `policies`(PolicyPanel)과 `finance`(FinancePanel)가 도크에 따로 있고 아이콘도 같다 (`App.tsx:208`, 둘 다 Landmark). 라우팅 `GameWindow.tsx:40~41`. 재정 → 정책 링크 `FinancePanel.tsx:32` (`onPolicies`), 국고 칩 → 재정 `App.tsx:153`, 소식 목적지 `eventDestination.ts:3`(법 소식 → policies)·`:8`(빚·재정 글 → finance).
- 바꿀 것:
  1. 창 하나 `state`. 제목 "국가" / "State", 아이콘 Landmark. 도크 버튼이 7 → 6 (장부 창은 단위 D에서 더한다).
  2. 창 머리 아래 탭 둘: "예산" / "Budget" = FinancePanel 본문 그대로, "법" / "Laws" = PolicyPanel 본문 그대로 (재작성 아님, 09 3.3 "합쳐도 본문은 그대로 탭 안에").
  3. 탭은 창 탐색 이력에 넣는다: `useNavigationState<'budget'|'laws'>('state:tab','budget')`. 뒤로/앞으로가 탭 전환을 되돌린다. 두 본문의 기존 이력 키(`views/FinancePanel.tsx:detail`, `policy:kind` 등)는 그대로.
  4. `ScreenRoute`에 `tab?: 'budget'|'laws'`. 국고 칩 → `{kind:'state', tab:'budget'}`, 소식 법 → `{kind:'state', tab:'laws'}`, 소식 빚·재정 → `{kind:'state', tab:'budget'}`.
  5. FinancePanel의 "정책 ↗" 링크(`:32`)는 지운다 (탭이 바로 위에 있다). PolicyPanel → 연구 링크는 그대로 (연구 창을 연다).
- 지울 것: `WindowId`의 `'policies'`·`'finance'`와 그 참조 (`App.tsx:153·208`, `GameWindow.tsx:40~41`, `eventDestination.ts:3·8`). 열린 창 목록은 저장하지 않으므로 (`App.tsx:64` useState) 옮길 저장값이 없다.
- 같이 할 것: 2-72 1항 (복지 다이얼 잠금). 왕실 임금 읽기 전용(2-69)은 끝났으니 예산 탭으로 옮길 때 되돌리지 않는다.
- 문자열: 창 "국가"/"State", 탭 "예산"/"Budget", "법"/"Laws".
- 완료 기준 (09 단위 C 인수 조건 "기능 회귀 없음"): 예산 탭의 단계 1~5 `setBudget`·호버/포커스 미리보기·줄 상세 DetailWindow·시장 임금, 법 탭의 분야 선택·법 선택·전환·취소·조건·사전 책 아이콘·연구 링크가 지금과 같이 동작. 국고 칩·법 소식·빚 소식이 맞는 탭을 연다. 뒤로/앞으로가 탭을 오간다. 420×560 창에서 가로 넘침 없음 (ko/en). typecheck.



### 2026-11-01 C(2-71·2-72 1항)
정책·재정 → 국가 예산/법 탭. 기존 본문과 명령 유지, 탭/법 소식/국고·빚 소식 목적지 연결. 복지법 없음 단계 5개 disabled, 잠금 칩이 법·복지 분야로 이동. 루트 typecheck 및 client 17파일 53시험 통과. 헤드리스 스크린샷 확인(1920×1080): Temp/estera-ui-cdp/state-budget.png, state-laws.png. 예산 왕실 range 0, 복지 disabled 5, 법·복지 활성, 가로폭 418=scrollWidth 418 확인. 상세 조작 전체 회귀의 실사용 검증은 별도.


### 2026-11-01 2-77 아이콘·막대 가독성
수요/공급 사람·건물 아이콘 32px, 행 38px, 표식 10px, 배경·그림자 대비. 범례·팝 표 아이콘 24px, 막대 최소 6px/테두리1px, 보조 글자 최소11px. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/market-icons-ko.png, market-icons-en-dark.png. 실제 아이콘 32×32, 시세창 clientWidth=scrollWidth=418, 새 Runtime 예외 없음. root typecheck 및 client 53시험 통과.


### 2026-11-01 H(2-73) 건설 입구
ConstructionPanel 지역 칩·짓기/대기열 탭, 내 왕국 지역만 활성, 지도 내 지역 선택 연동, ScreenRoute 지역 이력, 기존 BuildList/Projects 재사용. 지역 전환 시 카드만 닫고 검색/필터/정렬 유지. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/construction-fixed.png. 외국 칩 disabled, 탭 두 개, 가로폭418=scroll418. root typecheck/client55시험 통과. 실제 build 명령 클릭 경로 전체 실사용 검증은 남음.


### 2026-11-01 J(2-74) 기간 진행·정지 사유
프로토콜 runUntil/reached, 워커 advance의 틱 경계 정지, 수동 속도·새 판/불러오기 목표 취소. 연말 분할 버튼·정지/위험/도달 사유 칩, 위험 소식 목적지 이동. 위험 키 숫자 정규화·35틱 에피소드, 반복 토스트는 유지. root typecheck/client55시험 통과(위험 반복·공백·건물별·정지중 사례 2시험 포함). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/year-end-reached.png. 테스트 저장 tick359에서 실행 → tick360, Reached · Year end 확인. sim 수정 없음.


### 2026-11-01 2-50 옛 상회 행 잔여 (화면 미검증)
CompanyPanel BuildingRow의 저택·금융가는 별도 행으로 분기: 자리·금고 OwnerSummary와 펼침 인력만 표시. 원료·산출·이익률 공장 칸 제거. root typecheck/client55시험 통과.


### 2026-11-01 UI_DESIGN 어긋남 1·2·4 (화면 미검증)
팝 집계 기본 1인당, 빈 집단 — 표시. OwnershipBar의 왕실/저택/금융가/미지정 색을 CSS 토큰으로 바꾸고 다크 팔레트 추가. 원래 왕실 토큰 재사용. root typecheck/client55시험 통과.


### 2026-11-01 폐기 배치 코드 정리
좌우 slotRect/placeWindows 및 격자 swap/resize/windowTracks 구현 제거. 파일 삭제 명령 없이 빈 모듈 표식 유지. WindowId overview/industry 제거. 옛 규칙 시험 10개를 현재 경계·자유 창3개 동시 표시 3개로 교체. root typecheck/client48시험 통과. 화면 동작 변경 없음.


### 2026-11-01 화면 문자열 사전 정리
25개 화면 한/영 조건277곳의 문구252개·라벨 목록4개를 strings.ts의 screenText/screenLists로 이동, Dict로 짝 검사. 데이터 이름은 sim 번역 필드 유지. 첫 언어 선택은 언어별 고정 라벨 유지. exactNumber 최대 소수2자리로 통일. root typecheck/client48시험 통과. 헤드리스 스크린샷 확인(1920×1080): scratch strings-language-first.png(한국어/English 버튼·밤 테마). 나머지 추출 화면 전체의 시각 회귀는 미검증.


### 2-77. 작은 아이콘·막대·점·글자를 1920×1080에서 읽히게 (사용자 요청 2026-11-01: "시세-수요/공급 사람 아이콘이 너무 작아서 잘 안 보인다. 이런 것 좀 개선해 달라.")
- 기준: UI_DESIGN 4.3 "최소 크기·대비" 줄 (이 절과 같은 커밋). 게임 그림(`Sprite`·`Sprite64`·`GoodSprite`·`ClassSprite`·`BuildingSprite`) 24px, 색 견본·점 10px, 값을 보이는 막대 높이 6px, 글자 10px, 색 표식·막대 채움은 바탕과 3:1.
- 왜 그림이 특히 작아 보이나: 아틀라스 그림은 480px 칸에 여백이 최소 48px씩이라 (UI_DESIGN 4.3) 그림이 칸의 80% 안쪽만 차지한다. 16px로 그리면 실제 그림은 약 13px 이하, 24px이면 약 19px. 밤 테마에서는 그림 뒤에 양피지 네모가 깔려(`styles.css:83`) 작은 그림이 더 묻힌다. `lucide-react` 조작 아이콘은 여백이 없어 이 기준에서 뺀다.
- 고칠 곳 (먼저 1, 그다음 차례로):
  1. **시세 창 수요·공급 구성** (`SourceBreakdown.tsx`, 시장 창 `MarketWindow.tsx:59`와 지역 창 `RegionPanel.tsx:152`의 "수요·공급" 칸):
     - 계층(사람) 아이콘 `ClassSprite` 기본 16px (`SourceBreakdown.tsx:17`, 기본값 `sprites.tsx:20`), 건물 `BuildingSprite size={16}` (`:21`), 배·밀·동전 `Sprite` 기본 16px (`:28~33`, `:44`) → 모두 24px.
     - 줄 칸 `grid-template-columns: 10px 16px …` (`styles.css:289`)의 아이콘 칸 16px → 24px. 상품 그림 `GoodSprite`는 지금도 32px로 그려져(`sprites.tsx:18`, `max(32, size×2)`) 16px 칸을 넘친다. `.src-list .spr { width: 24px; height: 24px }`로 한 크기에 맞춘다.
     - 줄 높이는 아이콘에 맞게 (최소 26px). 글자 크기는 그대로 (`workspace.css:102` 11px).
  2. **그 밖의 게임 그림 16~18px**:
     - 경제 추이 계층 범례 `ClassSprite size={16}` (`BottomPanel.tsx:52`). 또 `.strategy-panel .legend .spr {14px}` (`strategy.css:143`)가 선택자가 더 구체적이라 `.legend-sp .spr {28px}` (`workspace.css:216`)를 이길 수 있다. 범례 그림은 24px 하나로 정리하고 14px 규칙은 지운다.
     - 인구 표 계층 아이콘 `ClassSprite size={18}` (`PopTable.tsx:44`) → 24px.
     - 지역 특산 태그 `BuildingSprite size={16}` (`RegionPanel.tsx:88`). `.perks .spr {28px}` (`workspace.css:216`)가 덮는지 스크린샷으로 보고, 16px로 보이면 24px.
     - 지도 범례 밀·나무·광산 `size={16}` (`RegionMap.tsx:96`) → 24px. 같은 범례의 글자 9px (`strategy.css:53` `.map-keys`) → 10px.
     - 상단 바 국고 동전 `size={16}` (`App.tsx:158`) → 24px (상단 바 높이 안에 들어가는지 스크린샷으로).
     - 메뉴 낮 테마 해 `size={16}` (`App.tsx:195`) → 24px (밤 테마 쪽은 lucide `Moon`이라 그대로).
  3. **10px보다 작은 색 점·견본** → 10×10px: `.ownership-ring-row i` 7px (`strategy.css:106`), `.market-scope-chips i` 6px (`system-ui.css:22`), `.region-directory i`·`.region-directory-table i` 7px (`workspace.css:113`, `:156`), `.notice-unread-dot` 6px (`strategy.css:239`). `.ownership-key` 12×5px (`workspace.css:171`)는 12×10px.
  4. **6px보다 낮은 값 막대** → 높이 6px: 상단 바 칩 막대 3px (`strategy.css:49`), `.strategy-panel .stat .bar` 3px (`strategy.css:62`, `workspace.css:94`의 5px를 덮는다), 그룹 지표 막대 3px (`system-ui.css:48` `.group-metrics .bar`), 그룹 상세 장부 막대 3px (`system-ui.css:50`), 소유 나눔 막대 5px·4px (`system-ui.css:9` `.ownership-split`, `:48` `.industry-group .ownership-split`). 막대 둘레선(`--ink` 2px)이 있는 막대는 채움이 6px 이상 보이게 한다.
     - 빼는 것: 값이 아닌 조작 손잡이·표시 (`.section-resize` `strategy.css:61`·`workspace.css:146`, 창 가장자리 `.edge-n/.edge-s` `strategy.css:98`, 도크 열림 표시 `strategy.css:99`·`workspace.css:90`).
  5. **9px 글자** → 10px: `strategy.css`의 9px 규칙 19곳 (`:48` `.brand-name`, `:53`, `:61` 둘, `:62` 둘, `:63`, `:64`, `:66`, `:67`, `:70`, `:77`, `:78` `.harvest-badge`, `:85` `.gauge-label`, `:104`, `:106`, `:250`, `:263`, `:264`). 420×560 창에서 줄이 넘치면 그 줄만 말줄임 + 툴팁 (`title`).
- 대비: 밤 테마에서 3·4항의 점·막대 채움 색이 `--sheet` 바탕과 3:1 이상인지 본다 (WCAG 2.1 1.4.11 비텍스트 대비 기준값). 모자라면 토큰을 바꾸지 말고 1px `--ink` 둘레선을 더한다.
- 문자열: 없음.
- 빼거나 지울 것: `strategy.css:143`의 14px 범례 규칙. 크기를 다시 정하는 중복 규칙이 생기면 한 곳(`workspace.css` 또는 `system-ui.css`)에만 둔다.
- 완료 기준: 위 1~5항의 file:line이 기준 크기 이상 (코드 검색으로 16px 이하 `Sprite` 계열 `size`가 남지 않음, 지도 SVG 안 `SvgSprite`는 지도 확대에 따르므로 제외). `npm run typecheck`. 헤드리스 스크린샷 1920×1080 (UI_DESIGN 12장): 시장 창 수요·공급 칸을 한국어 낮·영어 밤으로 한 장씩, 경제 추이 범례·인구 표 한 장. 420×560 창에서 가로 넘침 없음.
- 사용자 결정이 필요한 것: 없음. 기준값(24·10·6·10px)은 지금 코드에서 이미 쓰는 크기에 맞춘 추천이고 근거는 UI_DESIGN 4.3에 있다.



### 2026-11-01 2-51 실제 흐름·상품 링크 후속 (화면 미검증)
상회 FlowRow 상품 클릭을 통계→CompanyView→House→BuildingRow 경유 시세 창으로 연결. 관련 건물 목록 양을 rowOf 실제 투입/산출로 변경. 그룹 합산 흐름 표는 cur/max 제거, 실제 양·가중 단가·금액과 투입 충족 표시. idle 산출0 처리 보강. root typecheck/client48시험 통과. 공통 요약 레이아웃/일부 비교 경로와 사전 패키지 라벨은 잔여로 유지.


### 2-50. 저택·금융가에는 가동률·원료 충족을 보이지 않는다 (사용자 2026-10-21) — 남은 부분
> 2026-11-01: 지역 그룹·개별 상세·소유권 상세는 끝 (UI_DONE 2026-11-01, 화면 미검증). 아래만 남았다.
- 옛 상회 보기(`BottomPanel.tsx:45` CompanyView → `CompanyPanel.tsx:160` House → `BuildingRow`)에서 `isOwnerBuilding(b.typeId)`인 행은 원료 충족 칸(`CompanyPanel.tsx:328~331`), 산출 막대(`:332~334`), 이익률·매출/비용 막대(`:335~343`)를 그리지 않고, 자리 충원 막대(`:322~327`)와 금고 `b.cash`만 둔다. 2-35가 상회 상세를 왕국 경제 창으로 바꾸면서 이 경로를 없애면 이 항목도 끝난다.



### 2-73. H 건설 창 입구 (오버홀 09 단위 H, 3.3·6.5, X3)
- 지금: 건설 창은 대기열(`Projects`)만 그린다 (`GameWindow.tsx:43`). 새 건물은 지도 → 지역 창 → 건물 탭 → "새 건물" DetailWindow(`RegionIndustry.tsx:49`) → 카드 → 버튼으로 5단계다 (09 X3).
- 바꿀 것:
  1. 건설 창 맨 위: 지역 칩 줄. `world.regions` 전부, 내 왕국 지역(`region.kingdomId === me.kingdomId`)만 활성, 나머지는 `disabled`. 칩 = 지역 이름 + 대기 공사 수 숫자(그 지역의 내 공사, 0이면 숫자 없음).
  2. 그 아래 탭 둘: "짓기" / "Build" (기본), "대기열" / "Queue" + 공사 수. 짓기 탭 = 선택 지역의 `BuildList` (`CompanyPanel.tsx:487`, props `game, world, me, region, projects = world.constructions.filter(k => k.companyId === me.id).length`) 그대로. 대기열 탭 = 지금 `Projects` 그대로.
  3. 선택 지역은 창 탐색 이력에: `ScreenRoute.regionId` (`{kind:'construction', regionId}`). 기본값: `mapRegionId`가 내 왕국 지역이면 그것, 아니면 내 왕국 지역 중 id가 가장 작은 것 (지금 id 1, 09 X10).
  4. 지도 연동: 건설 창이 열려 있을 때 지도에서 내 왕국 지역을 고르면 칩이 따라 바뀐다 (`mapRegionId` prop, `GameWindow.tsx:18`). 내 왕국이 아닌 지역을 고르면 칩은 그대로.
  5. 지역을 바꾸면 BuildList의 펼친 카드(`open`)는 닫는다. 검색어·필터·정렬은 유지.
- 그대로 둘 것: 지역 창 건물 탭의 "새 건물" 입구 (회귀 없음). 철거·방식 교체·가동률 손잡이는 지역 창 건물 카드에 그대로.
- 2-75(공급 ÷ 수요)가 들어오면 같은 `BuildCard`에 붙으므로 여기서도 보인다.
- 문자열: "짓기"/"Build", "대기열"/"Queue".
- 완료 기준 (09 단위 H 인수 조건 "클릭 수 ≤ 설계 경로"): 도크 → (지역 칩) → 카드 → 짓기 = 3~4번 클릭으로 `build` 명령이 들어간다. 남의 왕국 칩은 눌리지 않는다. 창이 열린 채 지도 클릭이 칩을 바꾼다. 대기열 순서·정지·취소가 지금과 같다. 420×560에서 가로 넘침 없음 (ko/en). typecheck.



### 2-74. J "~까지 ▸" 분할 버튼 + 정지·도달 사유 라벨 + 위험 정지 거르기 (오버홀 09 단위 J, 3.5·3.11·H9·R8·R9)
- 지금: 속도 줄은 정지·1·2·3·4·10배·하루 (`App.tsx:159~167`). 위험 자동 정지는 내 상회 `danger` 소식이 새로 생기면 멈춘다 (`useGame.ts:69~85`). 멈춘 이유는 토스트(12초)뿐이고, 같은 경보가 4주 쿨다운(`alerts.ts:9` `COOLDOWN = TICKS_PER_WEEK * 4`)마다 다시 나오면 그때마다 멈춘다.
- 바꿀 것:
  1. **분할 버튼 하나** (속도 줄 오른쪽): 왼쪽 "▸ 연말" = 마지막에 고른 목적지로 진행, 오른쪽 ▾ = 목적지 목록. 목록: "연말" (늘 보임). "신호"(1c 표지 뒤), "기한"(목표 카드 N 뒤)은 그 단위가 생길 때 더한다 (지금 숨김). 진행 속도는 직전 속도(`App.tsx:95` `lastSpeed`), 정지 중이었으면 4배속.
  2. **도달 판정은 워커에서 틱 단위로** (09 7.1): `protocol.ts`에 `{ type: 'runUntil'; tick: number | null }`(null = 취소)과 `{ type: 'reached'; reason: 'yearEnd'; tick: number }`. `sim.worker.ts` `advance` 반복 안에서 `world.tick >= target`이면 그 틱에서 멈추고 (`ticksPerSecond = 0`), `publish()` 뒤 `reached`를 보낸다. 연말 목표 = 다음 해 1월 1일: `(Math.floor(tick / TICKS_PER_YEAR) + 1) * TICKS_PER_YEAR` (`TICKS_PER_YEAR` 360, sim `data.ts:847`). 사용자가 속도·정지를 바꾸거나 새 판·불러오기를 하면 목표를 지운다.
  3. **사유 라벨 한 자리** (분할 버튼 옆, 멈췄을 때만): 칩 하나 = 아이콘 + 종류 (+ 지역). 종류 넷: 정지(사용자), 위험(지역 이름, 누르면 그 소식 목적지 `openEvent`, `App.tsx:123`), 도달("연말"), 사전(단위 G 뒤). 다시 진행하면 사라진다. 끄기 버튼은 두지 않는다 (끄기는 메뉴의 위험 정지 하나 그대로, `App.tsx:186`).
  4. **위험 정지 거르기 (H9)**: 같은 경보 키가 한 번 정지를 일으킨 뒤 쿨다운 주기로 되풀이되면 다시 멈추지 않는다. 키를 마지막으로 본 틱에서 5주(`TICKS_PER_WEEK * 5` = 35틱, 쿨다운 4주 + 1주)보다 오래 안 나왔다가 다시 나오면 새 사유로 보고 멈춘다. "~까지" 진행 중에도 같다. 토스트와 소식함에는 그대로 남는다. 상태(키 → 마지막 본 틱, 정지를 일으켰는지)는 `useGame` ref에 두고 새 판·불러오기 때 비운다.
     - 경보 키: `GameEvent`에 경보 키가 없다 (`types.ts:631~641`, `alertOnce`의 key는 `economy.ts:765~773`에서 쓰고 버린다). 그 전까지 화면 키 = `${companyId}|${buildingId ?? ''}|${regionId ?? ''}|${textEn ?? text에서 숫자를 지운 글}`. sim이 `GameEvent.key`를 주면 그것으로 바꾼다 (3장, 선택).
- 그대로 둘 것: 10배속 (V17 결정 전), 단축키 Space·1~5, 하루 진행.
- 문자열: "연말"/"Year end", 분할 ▾ `aria-label` "목적지"/"Destination", 사유 칩 "정지"/"Paused", "위험"/"Danger", "도달"/"Reached".
- 완료 기준 (09 단위 J): 연말 목표가 다음 해 1월 1일 틱에서 정확히 멈추고 사유 칩 "도달 · 연말"이 뜬다. 위험 정지 때 사유 칩이 뜨고 누르면 목적지가 열린다. 같은 경보 키가 4주마다 되풀이되면 두 번째부터 멈추지 않는다. 5주 넘게 없다가 다시 나오면 멈춘다. 메뉴의 위험 정지 끄기가 그대로 동작한다. 같은 시드·같은 명령이면 "~까지"로 간 세계와 그냥 진행한 세계가 같은 틱에서 같다 (워커 정지는 명령이 아니다). typecheck.



### 2026-11-01 2-51 공통 요약·합계 마무리
상회 요약의 원료/산출/매출 막대를 FlowRow로 통일. 그룹 합계도 같은 FlowRow에 실제 합산량/가중 단가/금액/충족/판매 추정을 전달. 가상 Building 합성 없이 집계값 사용. 타입 검사/client48시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/flow-group.png, 흐름 clientWidth=scrollWidth=382. 상회 요약 화면은 미검증. packages/encyclopedia 라벨은 범위 밖 요청으로 남음.


### 2-78. 건축사무소는 맡은 공사만큼만 가동 (sim wt-officeuse, DESIGN 8장, DECISIONS 7-30)
- sim: 사무소는 그날 맡은 공사에 필요한 포인트만 만들고 그만큼의 자재만 쓰고 산다. 일자리·임금은 그대로다.
- `officeLoad(w, c)` (`production.ts`, `@econ/sim`에서 import): 회사 c의 오늘 가동 비율 = min(1, 필요 포인트 ÷ 능력). 회사의 사무소 모두 같은 값이고, 맡은 공사가 없으면 0.
- 사무소 원료 사용 = 방식 원료 × 레벨 × 가동률 × 작업 인원 × 기상 배율 × 가동 비율 × `b.last.inputFill`. `b.last.points` = 능력 × 가동 비율 × 자재 충족.
- 가동 비율이 0인 날 sim은 `b.last.inputFill = 1`로 두고(`b.idle`은 false일 수 있다) 원료를 쓰지 않는다. 지금 화면(`CompanyPanel.tsx:54·57`, `FlowRow.tsx:16`)은 그날 원료를 능력 전부만큼 쓴 것으로 보인다.
- `CompanyPanel.tsx:67` outMax와 `FlowRow.tsx:21`은 `b.last.points`를 능력 전부와 견주므로, 일이 적은 사무소가 모자란 것처럼 보인다. 산출 칸에 가동 비율을 숫자로 함께 보인다 (`GroupDetail.tsx:19` 합계도).
- 완료 기준: 같은 날 패널의 사무소 원료 양이 `per*run*crew*harvest*officeLoad*inputFill`과 소수 둘째 자리까지 같다.



### 2026-11-01 2-78 사무소 가동 비율 (화면 미검증)
rowOf/FlowRow 원료에 officeLoad 곱, 사무소 서비스 칩에 가동 비율 표시, 그룹은 레벨 가중 가동 비율 전달. 회사가 없는 옛 대상은 조회 예외 방지. root typecheck/client48시험 통과. CDP 현재 테스트 세계 사무소3개 모두 load0·원료 섬유/목재/공구0 확인(읽기만). 화면 가동0/부분/전체 비율 스크린샷 대조는 남음. sim 수정 없음.


### 2-44. 저택 대 금융가 자산 비율 (통계·소식, 사용자 요청 2026-10-21, sim 쪽 필요)

> 현재 상태 (2026-10-28): API 대기 해제: ownershipAssets export 존재. 요청한 통계/추이 필드와 UI 반영 범위는 별도 감사 필요.
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



### 2026-11-01 2-44 자산 비율
ownershipAssets API로 소유 기관 소재지 기준 왕국/지역 막대, 내 왕국 우선, 범위 저장·창 이력, 월별 왕국 금융가 비율 추이 추가. 법 조건선 없음. typecheck/client48시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/assets-kingdoms.png 및 assets-regions.png. 왕국3/지역7행·창폭418=scroll418 확인. 여러 월 곡선 실사용은 기록 대기.


### 2026-11-01 2-35 왕국 요약 합산 (부분)
통계 summary를 왕실 회사 요약에서 왕국 영토의 정부·민간 합산으로 전환. 저택·금융가는 고용 합계에만 포함하고 생산 수입·비용·손익은 제외. 국고는 왕실 순금고/한도로 별도 유지. 주간 이익은 소유 기관을 제외한 건물 profitEma×7 합. root typecheck/client48시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-summary.png, 창폭418=scroll418. 회사 선택·순위의 왕국 전환은 미완료.


### 2026-11-01 · 2-35 부분: 왕국 선택·비교 입구
- 기존 회사 6개 선택과 상회 순위를 왕국 3개 선택·비교 표로 합쳤다. 왕국 경제는 영토의 건물(소유 기관 제외)을 표시하고 기존 회사 ID 링크를 소속 왕국으로 받는다.
- 왕실 금고와 민간 순자금은 분리한다. 주간 생산 이익은 정부·소유 기관 이익을 제외한다. 소유 레벨은 현재 API의 국가/저택/금융가와 미배정 몫으로 표시한다.
- root typecheck·클라이언트 50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-comparison-fixed.png, kingdom-comparison-right.png, kingdom-economy.png. 영문 다크, 3행 및 상세 진입 확인. 전체 2-35는 미완료로 원문을 UI_CHANGES에 유지한다.

### 2026-11-01 · 2-35 부분: 공통 왕국 합계 타일
- 요약과 왕국 경제에 같은 인구·주간 GDP·레벨·고용/일자리·주간 생산 이익 타일을 적용했다. 구성 막대는 최신 소유권 규칙의 왕실·저택·금융가 및 미배정 레벨을 사용한다. 음수 이익 몫은 툴팁에 남기고 막대는 양수 몫으로 그린다.
- 소유 기관의 직원은 고용에 포함하며 기관 수입·정부 수입은 주간 생산 이익에서 제외한다. 국고 옆 지난주 수지는 정부 장부 값으로 분리했다.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-totals-en.png, kingdom-totals-ko.png. 한/영 다크 확인. 전체 2-35는 아직 미완료다.

### 2026-11-01 · 2-35 부분: 왕국 건물 장부
- 왕국 전용 목록에 소유 종류 필터·개수, 검색, 주간 이익/레벨/이름/지역/충원율/유보율 정렬, 공통 소유·유보 막대, 고용/일자리와 철거 대기를 연결했다. 좁은 창에서 장부 필드를 건물별 세 줄로 배치한다. 조작은 지역 건물 상세에 둔다.
- 건물 링크로 연 상세가 아래에 가려지지 않도록 요청 대상까지 자동 스크롤한다.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-buildings-ko.png, kingdom-building-open-visible.png. 전체17/금융가2 및 해당 무역소 상세 진입 확인. 전체2-35의 차트·자금 세부 등은 남아 있다.

### 2026-11-01 · 2-35 부분: 왕국 추이
- 월간 기록으로 레벨 누적 면적, 국고/민간 자금 두 선, 연 GDP 탭을 구현했다. 레벨은 2-54의 국가·저택·금융가 기록을 사용하고 미배정 몫은 회색이다. 소작지·소유 기관 제외라는 기록 정의를 유지한다. 없어진 투자 풀은 소유 기관 금고 라벨로 고쳤다.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-trends-levels.png, kingdom-trends-money.png, kingdom-trends-gdp-fixed.png. 실제 seed42·360일의 월간12기록으로 면적/두 선/GDP를 확인했다. 다른 왕국·영문·라이트 차트는 화면 미검증이다.

### 2026-11-01 · 2-35 부분: 국고·민간 자금 상자
- 국고/한도와 정부 지난주 수지, 민간 순자금 및 포함된 유보 자산, 별도 저택·금융가 금고를 구분한다. 옛 투자 대기(regionFunds)는 2-54에서 삭제되어 만들지 않는다.
- 플레이어 국고를 누르면 국가 예산으로 이동한다. 다른 왕국은 조회만 가능하다.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-money-ko.png, kingdom-money-budget.png, kingdom-money-foreign.png. 실제 예산 진입과 벨로니아 수치·조작 없음 확인. 전체2-35는 라우팅/미사용 코드 정리가 남아 있다.

## 2026-11-01 · 2-35 코드 완료: 왕국 경제 통합
- 왕국 ID 탐색·왕국 선택/비교·공통 합계·분리 자금·건물 장부·추이 구현. 회사 링크는 소속 왕국으로 변환하며 이전 이력의 companyId는 호환 조회만 한다. 옛 섹션 company는 kingdom으로 배치 정보를 이전한다.
- ViewSelect/CompanyPanel/CompanyView/CompanySummary 및 전용 미사용 문구 제거. 상품 건물 목록의 소유 정렬·검색과 지역 개별 링크는 회사명 대신 현재 소유 종류를 쓴다.
- 원문의 privateShare/stake/투자 대기는 2-54가 대체한다. 차트는 이미 있는 levelsState/levelsManor/levelsFinance와 미배정 몫을 쓰므로 옛 4몫 API 요청은 폐기한다. 민간 자금은 순현금, 유보는 그 안의 금액, 저택·금융가 금고는 별도 계정이다. 좁은 건물 표는 건물별 장부 행 배치다. 지도 소유 3색 전환은 원문상 선택 사항이라 기존 표시를 유지한다.
- 검증: root typecheck/client20파일50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-history.png, kingdom-ko-light.png, kingdom-en-dark-final.png. 비교행→왕국 경제, 에스테라→벨로니아→뒤로 에스테라→앞으로 벨로니아 복원 true. 본문391/scroll391, 한글 라이트·영문 다크 합계/자금·문장 확인. 같은 왕국 재요청도 sequence로 해당 섹션을 연다.
- 화면 미검증: 상품 소유 검색 전체 경우, 전체 정렬 조합, 왕국별 모든 차트의 툴팁, 일반 브라우저 배율. 앞의 부분별 스크린샷 기록은 해당 범위에만 적용한다.

### 보관 원문 (2-54와 위 구현 근거가 오래된 네 몫/투자 풀 요구보다 우선)
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



## 2026-11-01 · 지도 광맥·순금고·도크 감사 완료 (2-26·2-28·2-34)
- 2-26: 기존 adc2c32의 자원별 광맥 분리 표시를 실제 확인. 북부 광산지대 철0/160·석탄2/90은 현재 발견량과 일치하며 잠재량200/150을 표시하지 않는다. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/deposits-en-dark.png. 본문418/scroll418. 다른 지역 탐광 알림 클릭은 화면 미검증.
- 2-28: 상단·예산·왕국 금고는 cash−debt/creditLimit. 누락된 음수 경고색과 상단 신용 한도 경고 클래스를 보완. 별도 프로필의 저장 복사본 cash10000/debt20000에서 세 화면 모두 −ƒ10k, 경고색 rgb(239,138,111). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/negative-treasury-en-dark.png. 검증용 저장은 원래 사본으로 복구. 실제 대출/상환 명령은 미검증.
- 2-34: 도크 Build false→true→false, 버튼 Region/Market/State/Research/Build/Statistics, 지도·최소화 버튼 없음 확인. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/dock-toggle-check.png. 낡은 원문의 좌우 자리 규칙은 최신 자유 이동 창 규칙이 대체한다.
- root typecheck/client50시험 통과. 아래는 보관 원문.
### 2-26. 광맥은 자원별, 탐광으로 늘어난다 (산림·광맥 늘림)
- 산림: 지역 1~7 = 30/30/60/100/200/30/50칸. 광맥 잠재량(못 찾은 것 포함, `REGIONS[i].veins`): 철 0/0/60/0/0/200/150, 석탄 0/0/30/0/60/150/100.
- 찾은 광맥 = `region.deposits.iron`·`region.deposits.coal` (레벨 수). 시작은 잠재량의 30%이고, 계절(90일)마다 지역·자원마다 일정 확률로 잠재량의 10%씩 늘어난다 (탐광).
- 남은 칸: `depositFree(world, regionId, 'iron' | 'coal')`. 철광산·석탄광산은 자기 자원 광맥으로만 막힌다. `region.land.ore`는 두 자원 `deposits`의 합이라 지금 화면의 광맥 칸은 그대로 맞는다 (광맥 `landFree(…, 'ore')`는 두 광산을 합친 값).
- 넣을 곳: 지역 패널의 땅 표에서 광맥 한 줄을 철·석탄 두 줄로 (이름 `DEPOSIT_NAMES`/`DEPOSIT_NAMES_EN`, 쓴 칸/찾은 칸). 잠재량(`veins`)은 보이지 않는다 (탐광의 의미가 없어진다).
- 알림: 광맥을 찾으면 그 지역 왕국 왕실에 `info` 알림 (`regionId` 있음): `"북부 광산지대 철광맥 +20"` / `"Northern Mining District iron veins +20"` (석탄은 `탄맥` / `coal seams`, `VEIN_NAMES`·`VEIN_NAMES_EN`).
- 저장 형식 그대로. 옛 저장은 찾은 광맥이 적은 채로 이어서 탐광한다.


### 2-28. 금고와 대출을 한 칸으로 (사용자 요청 2026-10-21)
- 회사는 현금(`cash`)과 빚(`debt`)을 따로 들고 있지만, 화면에서는 한 숫자로 보인다: **금고 = `cash - debt`**. 빚이 현금보다 크면 음수(`neg` 색)다.
- 옆에 한도를 붙인다: `금고 −1.2만 / 30만`처럼 `NumericValue(cash - debt) / NumericValue(creditLimit(world, c))`. 막대를 쓰면 `debt / limit`(지금 대출 막대)를 그대로 쓴다.
- 고칠 곳 (2026-10-21 main 기준)
  - `App.tsx` 144 현금 칩과 145 대출 칩을 하나로 (누르면 재정 창, `debtRatio` 색은 그대로)
  - `FinancePanel.tsx` 19 treasury 블록: `T.cash`·`T.loanLimit` 두 stat → 한 stat
  - `CompanyPanel.tsx` 140~146(`CompanyView`)과 600(`CompanySummary`)은 2-35에서 없어지고, 그 자리의 왕실 금고 상자가 이 모양을 쓴다.
- 문자열: `T.treasury`(금고/Treasury)를 라벨로 쓴다. `T.cash`·`T.loan`·`T.loanLimit`는 안 쓰게 되면 지운다.
- sim 변경 없음. 대출을 받으면 현금과 빚이 같이 늘어 금고 값은 그대로다 (이자·상환만 금고를 바꾼다).


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

## 2026-11-01 · 2-30 완료, 2-60 부분 보완: 재정 미리보기·상세
- 현재 값은 유지하고 단계 호버/포커스 예상액을 회색 → 값으로 나란히 표시한다. 묶음·소속 줄·머리/바닥 순수지가 함께 바뀌고 선택 단계/세계는 바꾸지 않는다. blur/mouseleave로 예상값만 제거한다.
- 부모 국가 창을 닫으면 예산 상세도 닫히도록 실제 열림 상태를 전달한다. 예산/법 탭 전환도 기존처럼 상세를 닫는다.
- 인건비 상세에 건물/직종24px 그림·건물 레벨·인원/자리·단계 배율, 세금 상세에 법/세율을 추가했다. 관세 상대 왕국 이름은 현재 언어로 표시한다. 2-30의 미사용 장부 문구를 검색 확인 뒤 제거했다.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/budget-preview-arrows.png, budget-staff-formula.png, budget-detail-parent-close.png. 현재 단계3을 유지한 채5단계 포커스에서 예상 화살표6개, blur 뒤0개, 부모 닫기/재개방 시 상세 없음 확인. 예산 본문391/scroll391, 상세431/scroll431, 그림24px.
- 2-60 전체는 미완료: 일부 상세 머리 칩·세법 비교 막대/복지 세부 필드·빈 상태·모든 상세 탭/클릭 조합 감사가 남아 원문을 UI_CHANGES에 유지한다. 한국어/라이트의 새 미리보기·상세는 화면 미검증. 아래 2-30 옛 수치와 열 순서는 보관 원문이며 최신2-60·2-62와 현재 API가 우선한다.
### 2-30. 재정 탭: 단계별 예산 미리보기 (사용자 요청 2026-10-21)
> **2-60이 대신하는 부분:** 아래 "새 표"의 줄 순서, 수입/지출 두 묶음, `firmWages` 흐린 줄. 표는 2-60-2대로 손잡이별 다섯 묶음과 `stateFirms` 줄로 그린다. 나머지(즉시 반영·안정성·문자열 정리)는 이 절 그대로.
> **2-62:** `fees` 줄과 `budgetBase.feesWage/feesOther`·`Kingdom.feeWageWeek`는 없어졌다 (저장 15판).
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

## 2026-11-01 · 2-60 코드 완료: 재정 상세 장부
- 세법3개 비교 막대/현행 강조, 법·단계·세율, 복지 집단(소작농·실업자/임금 노동자)·목표 소득·부족 인원·미적용 대시, 주조의 주간 GDP/비율, 왕실 공사 몫/사무소 매출, 상품/왕국별 정렬·색상·합계/평균 보정, 빈 상세 금액을 구현했다. 국영 사업이 없으면 그 행을 숨긴다.
- 직종별 임금은 인원/자리·1인 하루·주간 수치 장부로 펼친다. 산식과 소수2자리 정확값은 NumericValue 툴팁에 둔다. 일괄 구형 wageIndex 대신 실제 계산에 쓰는 jobsBy의 직종별 지수를 툴팁에 표시한다. 국영 사업은 음수 저장 비용을 두 번 빼지 않게 표시를 바로잡았다. 일 이자율 등 비율은 소수2자리까지라 0.03%가0%로 사라지지 않는다.
- 원문의 고정 위치/크기 조절 금지/좁은 열 배치는 현재 UI_DESIGN의 자유 이동 상세 창·장부 배치가 대체한다. 옛 fees는2-62의 build로 대체했다. 부모 국가 창 닫기와 탭 이탈 시 상세 닫힘은2fe5a8d에서 반영했다.
- root typecheck/client21파일52시험 통과(국영 사업 있음/없음 회귀2시험 추가). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/budget-tax-comparison.png, budget-welfare-ko-light.png, budget-mint-formula.png, budget-empty-goods.png, budget-tariffs-ko-light.png, budget-interest-rate-ko.png, budget-jobs-final-ko.png, budget-jobs-final-en-dark.png. 상세431/scroll431, 직종·건물 그림24px, 영어 다크/한국어 라이트 주요 경로 확인. 재정 상대 왕국2행 정렬 반전, 빈 물자 탭 표0개, 미적용 복지4행 대시, 일 이자율0.03% 확인. 새 페이지 컨텍스트에서는 오류0(budget-clean-load).
- 화면 미검증: 실제 단계 변경 명령의 전후값, 복지 적용 집단·자료가 있는 물자 탭의 전 조합, 빈 국영 사업 행(코드 회귀 시험만), 일반 브라우저 배율. 코드 완료와 전체 조합 시각 검증을 구분한다. 아래는 보관 원문이다.
### 2-60. 재정 수지 표: 손잡이별 묶음 + 국영 사업 손익 + 줄 자세히 보기 창 (사용자 요청 2026-10-22)
> **2-62가 대신하는 부분:** `fees` 줄·`drillFees`·`FeesDrill`이 없어지고 `build` 줄·`drillBuild`가 생겼다. 국영 임금 묶음은 `[wages, stateFirms, build]`, `wages`·`goods`는 행정청·학교만, `stateFirms`에 건축사무소가 들어간다 (2-62-1·2-62-2).
**사용자 말:** "수지에서도 정부 건물 인건비 누르면 정확히 뭐가 어떻게 나가고 있나 등등 자세히 볼 수 있었으면 좋겠음 (작은 윈도우로 뜨게)". 왕실 벌목장 같은 국영 생산 건물의 수입이 수지에 안 잡히는 데 대해: "개헷갈리니까 플레이어가 뭘 어떻게 조절해야 되나 알기 쉽게 고쳐".

**지금 화면 (main `3faa68c`, `packages/client/src/views/FinancePanel.tsx`)**
- 17: 줄을 `수입`(tax·tariffs·mint·fees)과 `지출`(wages·goods·research·interest) 두 묶음으로 나눈다. `welfare` 줄은 목록에 없어 안 보인다 (2-57 2번 미반영).
- 18~21 `row`: 단계 버튼은 `l.key === l.knob`인 줄(tax·wages·research·welfare)에만. `fees`는 국영 임금을 따라 움직이지만 그 사실이 화면에 없다.
- 26 바닥줄 `preview.net`. 줄을 눌러도 아무 일도 없다.
- 국영 생산 건물(왕실 벌목장 등)의 매출·원료·임금은 국고에 바로 들고 나는데 표에 없었다 (`firmWages`만 있었고 화면은 안 썼다). 그래서 표의 순수지와 실제 국고 변화가 달랐다.

**이 절이 대신하는 것 (겹치는 미완료 항목)**
- 2-30 "새 표"의 줄 순서·`수입/지출` 두 묶음·`firmWages` 흐린 줄 → 아래 2-60-2 (손잡이별 묶음). 2-30의 즉시 반영·안정성·문자열 정리 항목은 그대로.
- 2-57 2번(예산 표 `복지` 줄) → 2-60-2의 복지 묶음. 툴팁 내용(목표 생활수준)은 2-57 2번 그대로.
- 0번 목록 3번(2-30 남은 일)의 "화면 다듬기"는 이 절로 한다.

#### 2-60-1. sim API (wt-regionecon, index에서 export, 모두 순수 함수)
- `budgetPreview(world, kingdomId, steps?)` 바뀐 점:
  - 새 줄 `stateFirms` (국영 사업 손익) = 왕실 생산 건물(정부 건물이 아닌 국영 건물)의 매출 − 원료 − 임금, 주간. 흑자 +, 적자 −. `knob: 'wages'`, `byLevel` 있음. **`net`에 들어간다** (예전에는 빠져 있었다).
  - 새 필드 `groups: BudgetGroup[]` = `{ knob: 'tax'|'wages'|'welfare'|'fixed', lines: BudgetLineKey[], weekly, byLevel?: number[5] }`. 순서와 묶음은 상수 `BUDGET_GROUPS`:
    `tax: [tax]` · `wages: [wages, fees, stateFirms]` · `welfare: [welfare]` · `fixed: [tariffs, mint, goods, interest]`. `weekly` = 묶음 줄 합(둥근 값의 합), `byLevel[i]` = 그 손잡이 단계 i+1일 때 묶음 합. 묶음 `weekly`를 다 더하면 `net`.
  - `lines`의 순서가 `BUDGET_GROUPS` 순서로 바뀌었다. `firmWages`는 옛 화면용 사본으로 남는다 (쓰지 않는다).
- `budgetDrill(world, kingdomId, key, steps?): BudgetDrill` (줄 하나의 자세히 보기). 줄마다 함수도 따로 있다: `drillWages`, `drillStateFirms`, `drillGoods`, `drillTax`, `drillWelfare`, `drillInterest`, `drillTariffs`, `drillMint`, `drillFees`. `budgetLineRaw(world, kingdomId, key, steps?)` = 그 줄의 반올림 전 주간 값.
  - 공통: `{ key, weekly, smoothing, rows, ... }`. 모든 금액은 **주간, 국고에 주는 효과** (+ 들어옴, − 나감). `weekly`는 줄 값(반올림 전), 화면 줄의 숫자는 `roundBudget(weekly)`와 같다. **행 `weekly` 합 + `smoothing` = `weekly`**. `smoothing`은 줄이 이동평균인데 행은 지금 값으로 나눌 때의 차이 (임금·국영 사업·이자·수수료는 0).
  - 금액이 아닌 값(1인 임금, 세율, 가격, 사람 수)은 양수. 돈은 둥글지 않으니 화면에서 `roundBudget` 또는 `money` 형식으로 보인다.

| key | 머리 값 | `rows[]` 한 줄 | 다른 목록 |
|---|---|---|---|
| `wages` 정부 건물 인건비 | `wageIndex`, `stepMult` | `{ buildingId, typeId, regionId, level, employed, jobs, weekly, jobsBy[] }`, `jobsBy` = `{ skill, employed, jobs, baseWage, wageIndex, stepMult, perHead, weekly }` (`perHead` = `baseWage × wageIndex × stepMult`, 1인 하루) | |
| `stateFirms` 국영 사업 | `stepMult` | `{ buildingId, typeId, regionId, level, employed, sales(+), inputs(−), wages(−), weekly(=손익) }` | |
| `goods` 정부 건물 물자 | | `{ buildingId, typeId, regionId, level, weekly }` (어제 원료비 × 7) | `byGood[] = { good, qty(주간), price, weekly }` |
| `tax` 세금 | `law`, `stepMult`, `collection`(징수율 0..1), `rates { land, poll, income }` | `{ regionId, prof, payers, base: 'land'|'poll'|'income', rate, income(주간 소득), weekly }` | `laws[] = { law, weekly }` (세법마다 지금 단계로 걷힐 주간 세입) |
| `welfare` 복지 | `law`, `target`(목표 생활수준) | `{ regionId, group: 'poor'|'wage', covered, short(모자란 사람), targetIncome(1인 하루), need(−, 덮으면 낼 액), weekly(덮으면 need, 아니면 0) }` | |
| `interest` 국채 이자 | `debt`, `dailyRate` | `{ part: 'interest', weekly }` | 이자 = `debt × dailyRate × 7` |
| `tariffs` 관세 | | `{ good, weekly }` | `byPartner[] = { kingdomId, weekly }` (출발 왕국) |
| `mint` 주조 | `base`, `gdpWeek`, `rate` | `{ part: 'base'|'gdp', weekly }` | |
| `fees` 민간 공사 수수료 | `stepMult` | `{ part: 'wage'|'other', base, weekly }` (`wage` = 건축사무소 임금 몫 = `base × stepMult`, `other` = 원료 몫) | |

- 계산 비용: `drillTax`는 왕국 pop을 한 번 훑는다. 나머지는 건물 한 번 훑기 또는 상수. 창이 열린 동안만 매 publish(100ms)마다 불러도 된다.
- 미리보기 순수지와 실제 주간 국고 변화(현금 − 빚)의 차이: 150주차부터 8주 합이 총 흐름의 0.2~0.9% (시드 1·2). 국영 사업 줄을 빼면 1.3~2.2%였다.
- 저장 형식 13판 (12판은 그대로 불러온다). 저장 키는 바꿀 필요 없다.

#### 2-60-2. 재정 창 수지 표 (440 px 창, 2-53)
- `수입`/`지출` 두 묶음을 없애고 `preview.groups` 순서대로 묶음 넷을 그린다. 열은 그대로 `항목 | 주간 예상 | 단계`(40/25/35%).
- 묶음 머리 줄 (`account-group` 행): 왼쪽 손잡이 이름(`세금 수준`/`국영 임금`/`복지`/`고정`), 가운데 묶음 합 `group.weekly`(`signedMoney`, 음수면 `neg`), 오른쪽 단계 버튼 1~5 (fixed는 비움). **단계 버튼은 줄이 아니라 묶음 머리에 하나만** 둔다 (국영 임금 버튼 하나가 아래 세 줄을 같이 움직이는 것이 보이게).
  - 버튼 툴팁: `국영 임금 4 · ×1.15 · 묶음 −412,300 · 순수지 −18,200` (= `group.byLevel[i]`, `preview.netByLevel[knob][i]`). 복지는 `×` 대신 `생활수준 3.5` (2-57 2번).
  - 버튼에 마우스를 올리면 그 묶음 줄 숫자 옆에 작은 회색 `→ byLevel[i]` 칩을 보인다 (줄마다 `line.byLevel[i]`). 떠나면 지운다.
- 묶음 아래 줄: 들여쓰기 12px, `줄 이름 | roundBudget(line.weekly) | (빈칸)`. 줄 이름 앞에 작은 `›` 아이콘(누를 수 있다는 표시, 글 없음). `tax` 줄의 징수율 칩(지금 20행)은 그대로.
- 국영 사업 줄 `stateFirms`: 국영 임금 묶음 안, 인건비·수수료 아래. 왕실 생산 건물이 없으면(`drillStateFirms(...).rows.length === 0`) 줄을 숨긴다. 값이 −면 `neg`.
- 바닥줄 `순수지`(`preview.net`) 그대로. 머리 줄 합의 합 = 순수지.
- 세법 `select`(24행)는 2-45 정책 창으로 옮기기 전까지 세금 수준 묶음 머리 바로 위에 둔다.

#### 2-60-3. 줄 자세히 보기 창 (작은 떠 있는 창)
- **여는 법**: 묶음 아래 줄(또는 `›`)을 누른다. 같은 줄을 다시 누르면 닫힌다. 다른 줄을 누르면 내용만 바뀐다 (창은 하나). Esc, 창의 `×`, 재정 창을 닫으면 닫힌다. 바깥을 눌러도 닫히지 않는다 (지도를 보면서 열어 둔다).
- **크기·자리**: 폭 360px, 높이는 내용에 맞추고 최대 560px(안에서 세로 스크롤 하나, 2-53의 "스크롤 안 스크롤 없음"은 이 창 안 표 하나만 스크롤). 크기 조절 없음. 재정 창이 왼쪽 자리면 그 오른쪽 바깥(x = 456), 오른쪽 자리면 그 왼쪽 바깥(x = 창 x − 368)에 띄운다. y는 누른 줄의 위쪽에 맞추고 화면 아래로 넘치면 위로 민다 (1920×1080 기준 위 8px·아래 8px 안). `App.tsx` 37~52의 `popover-panel` 모양(그림자·테두리)을 쓰되 `mousedown` 바깥 닫기는 빼고, 창 관리(`WindowWorkspace.tsx`)의 자리에는 넣지 않는다.
- **머리 줄**: 줄 이름 · `roundBudget(drill.weekly)`(`signedMoney`) · `×` 버튼. 둘째 줄에 머리 값 칩 (아래 표의 "칩"), 숫자만.
- **표**: 열 머리를 누르면 정렬 (`SortHeader`), 기본은 `|weekly|` 큰 순. 행 하나 높이 22px, 숫자 열 오른쪽 맞춤. 맨 아래 합계 줄 `Σ` = 행 합, 그 위에 `smoothing`이 |값| ≥ 10이면 회색 줄 `평균 보정` 하나.
- **툴팁**: 모든 숫자 칸에 둥글지 않은 값(소수 둘째 자리)과 계산식을 보인다 (아래 "툴팁").

| 줄 | 칩 | 열 | 행을 누르면 | 툴팁 |
|---|---|---|---|---|
| `wages` | `임금 지수 ×1.04` `단계 ×1.15` | 건물(그림 + 지역 이름 + `×level`) · 인원/자리 · 주간 | 행이 펼쳐져 `jobsBy` 하위 행: 직종 아이콘 · 인원 · 1인 하루 · 주간 | 1인 하루 칸: `10 × 1.04 × 1.15 = 11.96` (`baseWage × wageIndex × stepMult = perHead`), 주간 칸: `인원 × 1인 하루 × 7` |
| `stateFirms` | `단계 ×1.15` | 건물 · 매출 · 원료 · 임금 · 손익 | 그 건물 상세(2-59-3)를 연다 | 손익 칸: `매출 − 원료 − 임금`, 매출·원료: `하루 이동평균 × 7` |
| `goods` | | 탭 둘 `건물`/`상품`. 건물: 건물 · 주간. 상품: 상품 아이콘 · 수량/주 · 가격 · 주간 | 건물 행 → 건물 상세 | 상품 행: `수량 × 가격` |
| `tax` | `세법 인두세` `단계 ×1.2` `징수 85%` 세율 칩(`ƒ0.6/인` 또는 `25%`) | 지역 · 직종 아이콘 · 납세자 · 세율 · 주간 | | 주간 칸: `min(저축, 낼 세금) × 징수율 × 7`, 세율 칸: 정확한 값. 칩 아래 작은 막대 셋 `laws[]` (세법마다 주간, 지금 세법 강조) |
| `welfare` | `복지법 구빈법` `목표 3` | 지역 · 무리 아이콘(poor/wage) · 모자란 사람 · 1인 목표 소득 · 주간 | | 덮지 않는 무리(`covered === false`) 행은 흐리게, 주간 칸 `—`, 툴팁에 `need` |
| `interest` | | 줄 하나: `빚` · `일 이자율` · 주간 | | `debt × dailyRate × 7` |
| `tariffs` | | 탭 둘 `상품`/`왕국`. 상품 아이콘 · 주간 / 왕국 깃발색 칩 · 주간 | | |
| `mint` | | 줄 둘: `기본` · `주간 총생산 × rate` (`gdpWeek`, `rate`) | | |
| `fees` | `단계 ×1.15` | 줄 둘: `사무소 임금 몫` (`base × stepMult`) · `원료 몫` | | |

- 빈 상태: `rows`가 비면 표 대신 `ƒ0` 한 줄 (설명 문구 없음).
- 갱신: 창이 열린 동안 매 publish마다 `budgetDrill(world, kingdom.id, key)`를 다시 부른다. 단계 버튼에 마우스를 올린 동안에는 `budgetDrill(world, kid, key, { [knob]: level })`로 그 단계 값을 보인다 (손잡이 묶음 줄만).
- 이름: 건물은 `T.buildings[typeId]`(있는 것), 지역은 `regionName`, 직종은 직종 아이콘(`Workforce.tsx`와 같은 그림), 상품은 상품 아이콘.

#### 2-60-4. 문자열 (ko / en)

| 키 | ko | en |
|---|---|---|
| `budgetLines.stateFirms` | 국영 사업 손익 | State enterprises |
| `budgetLines.welfare` | 복지 | Welfare (2-57에서 이미 요청) |
| `budgetGroups.tax` | 세금 수준 | Tax level |
| `budgetGroups.wages` | 국영 임금 | State wages |
| `budgetGroups.welfare` | 복지 | Welfare |
| `budgetGroups.fixed` | 고정 | Fixed |
| `drill.smoothing` | 평균 보정 | Smoothing |
| `drill.wageIndex` | 임금 지수 | Wage index |
| `drill.step` | 단계 | Step |
| `drill.perHead` | 1인 하루 | Per head/day |
| `drill.staff` | 인원/자리 | Staff/jobs |
| `drill.sales` | 매출 | Sales |
| `drill.inputs` | 원료 | Inputs |
| `drill.wages` | 임금 | Wages |
| `drill.profit` | 손익 | Profit |
| `drill.byBuilding` | 건물 | Buildings |
| `drill.byGood` | 상품 | Goods |
| `drill.byKingdom` | 왕국 | Kingdoms |
| `drill.payers` | 납세자 | Payers |
| `drill.rate` | 세율 | Rate |
| `drill.collection` | 징수 | Collected |
| `drill.short` | 모자란 사람 | Short |
| `drill.targetIncome` | 목표 소득 | Target income |
| `drill.left` | 남은 비용 | Left |
| `drill.debt` | 빚 | Debt |
| `drill.dailyRate` | 일 이자율 | Daily rate |
| `drill.mintBase` | 기본 | Base |
| `drill.mintGdp` | 총생산 몫 | Output share |
| `drill.feeWage` | 사무소 임금 몫 | Office wages |
| `drill.feeOther` | 원료 몫 | Materials |
| `drill.qtyWeek` | 수량/주 | Qty/wk |
| `drill.price` | 가격 | Price |

- 있는 것: `T.budgetLines.*`(86·376행, `wages`는 이미 `정부 건물 인건비`), `T.budgetNet`, `T.policyLevel`, `T.weeklyBudget`, `T.taxLaw`·`landBased`·`pollTax`·`incomeTax`.
- 화면 규칙: 설명 문구 없음. 식과 정확한 값은 툴팁에만.

## 2026-11-01 · 2-31 유보 자산 표시 감사 완료
- 개별 건물/왕국 장부는 buildingEcon의 hasReserve/reserve/reserveCap/reserveWeek를 공통 ReserveBar에 연결한다. 채움은0~100%로 자르지만 수치와 툴팁은 실제 값을 보인다. 민간 유보 합계는 자금 상자에 분리하며 현금에 다시 더하지 않는다.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/reserve-detail-en-dark.png. 곡물 농장 유보ƒ200.3k/ƒ224k·89%, 상세 주간 적립+ƒ14.2k, 본문338/scroll338. 코드 경로: BuildingEconomics.tsx:20, KingdomBuildings.tsx:39, KingdomMoney.tsx:11, ReserveBar.tsx:9. 기존 검증된 코드8606391의 root typecheck/client52시험 통과.
- 화면 미검증: 상한 초과/상한0/누락 reserve의 실제 장면, 새 한국어 라이트의 유보 상세. 0·누락 및 채움 잘림은 코드 대조만 확인했다. 아래 원문의 유보율·건축사무소 예외·저장판은 현재 sim API/2-62가 우선한다.
### 2-31. 건물 유보 자산
- 파는 건물(정부 건물·학교·건축사무소 제외)은 이익의 35%를 유보 자산에 쌓는다. 상한 = 레벨 × 레벨당 주간 산출 가치(기본가) × 0.5주 (`TUNE.reserveWeeks`, 2026-10-21 변경: 레벨당 고정 50,000을 없앴다). 방식을 바꾸면 상한이 바뀐다 (줄면 다음 주 정산 전까지 잠깐 상한을 넘을 수 있으니 막대는 100%에서 자른다). 다 차면 이익을 모두 배당한다. 적자는 유보 자산에서 먼저 빠지고, 바닥나면 가동률을 줄이고 철거한다.
- 필드: `Building.reserve?: number` (없으면 0, 소수 둘째 자리). index에서 `reserveCap(b)`(상한), `hasReserve(b)`(쌓는 건물인가), `weeklyOutputValue(typeId, methodId)`(방식 1레벨의 주간 산출 가치, 기본가)를 export한다.
- 건물 패널 (**2-59-3 유보 줄이 대신한다**) (`ResourceInspector.tsx` `BuildingInspector`, 32행 지표 줄 근처): `hasReserve(b)`이면 "유보 자산" 라벨과 `reserve / reserveCap(b)` 막대, 숫자 두 개.
- 합계는 2-35 왕국 경제 창의 민간 자금 상자와 건물 표에 둔다 (회사 현금 안의 몫이다. 현금에 더하지 않는다).
- 저장 형식은 그대로(v6). 옛 저장은 `reserve`가 없어 0으로 시작한다.

## 2026-11-01 · 2-37 농부 계층 표시 완료
- farmer 전용 색 토큰을 라이트#677b2f/다크#a8be62로 만들고 임시 fallback을 제거했다. --sheet 기준 상대 명도 대비는 라이트4.37:1/다크7.85:1로3:1을 넘는다. 기존 녹색 계열에서 대비를 확보한 UI 색이며 경제 수치는 바꾸지 않는다.
- 옛 RegionPanel의 하층 합계에 농부를 포함하고 노동자만 보던 실업률을 노동자+농부 노동 인구 가중치로 수정했다. 현재 장부형 개요에서는 이 옛 추가 지표가 CSS로 숨겨져 있어 해당 값의 실제 화면은 미검증이며 계산 시험으로 확인했다. RegionExplorer는 더 이상 노동자 단독 실업률을 그리지 않는다.
- 농부·소작농은 이미 전용 아틀라스 셀이다. uiRefresh에 과거 임시 별칭8쌍의 다른 셀 회귀 검증을 추가했다. 읽기 전용 아이콘 검사(list.ts):72개 고유 그림, sim id 누락/별칭 없음. 미커밋 지도 생성 파일을 보존하기 위해 build-map이 포함된 전체 assets:check 대신 아이콘 검사만 직접 실행했다.
- root typecheck/client21파일55시험 통과(가중 실업률/빈 집단2시험, 별도 아이콘 셀1시험 추가). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/farmer-en-dark.png, farmer-ko-light.png. 농부35.7k,24px 그림, 각 테마 토큰 색, 본문418/scroll418 확인. 다른 화면의 모든 농부 표시·실제 취업 이동은 화면 미검증이다.
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

## 2026-11-01 · 2-36 종이·2-39 임시 아이콘 감사 완료
- 종이/종이 공장 및 옛 임시 별칭8쌍은 현재 전용 아틀라스 셀에 연결된다. paper=goods-b:3, cloth=goods-a:6, paper_mill=buildings-b:0, workshop=buildings-a:10. 나머지 농부/소작농·하급/상급 귀족·목장/농장·고기/식료품·고급/일반 가구·고급/일반 옷감도 서로 다른 셀 회귀 시험 통과. 정당한 옛 이름 별칭(factory 등)은 남긴다. 농부 테마 토큰은169f97b에서 완료.
- 종이는 GOOD_IDS 기반 시세/건물 흐름에 이미 들어 있다. 지역 가격 기록의 남은 결측0 대체를 공통 marketPriceHistory로 교체해 종이가 없던 날짜는 가격 키를 빼고 실제0은 보존한다. 공통 결측/0 회귀 시험으로 확인했다.
- root typecheck/client21파일55시험 통과. 읽기 전용 icons/list.ts:72고유 그림, 누락/별칭 없음. 기존 미커밋 지도는 재생성하지 않았다.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/paper-market-ko-light.png, paper-mill-ko-light.png. 종이ƒ2.28/생산 건물2곳, 실제 중앙 고원 종이 공장/펄프 압착709/일·전용 건물 그림·상세 연결, 본문418/scroll418. buildings-b.webp 원본 시트의 수차·종이 더미가 있는 종이 공장도 이미지로 확인했다.
- 화면 미검증: 과거 저장의 종이 결측 구간 실제 재생·영문 다크 종이 상세·모든 아이콘 쌍을 나란히 놓은 화면. 전용 셀 검증과 전체 시각 검증을 구분한다. 아래 옛 상품/방식/저장판 수치는 현재 sim 데이터가 우선한다.
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

## 2026-11-02 정책·연구 연결 및 전환 상태 보완
- 2-45·2-56 부분 완료: 법의 기술 링크가 연구 창에서 해당 기술을 선택한다. 잠긴 기술도 필터를 전체로 바꿔 표시하며 연구 시작 명령은 보내지 않는다. 같은 기술 재요청도 sequence로 반영한다.
- 전환 중 다른 법 시행 차단. 조건 미달이면 진행 막대와 현재/필요 비율을 빨강으로 표시하고, 비율은 소수 둘째 자리까지. 실패 시점은 틱 대신 게임 날짜로 표시한다.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-tech-selected-ko.png, policy-pending-invalid-ko.png. 잠긴 증기 철도 선택·현재 연구 불변, 검증용 투자법 전환의 8%/15%·150일·다른 시행 버튼 disabled, 본문418/scroll418. 검증용 세계는 원래 저장 상태로 복원. 새로고침 런타임 오류0.
- 잔여: 법별 실제 세율 툴팁, 투자 직종 아이콘 및 완료/실패 소식의 모든 경로. 이번 수정의 영문·다크 및 전환 완료 자체는 화면 미검증. 따라서 2-45·2-56 전체 원문은 UI_CHANGES에 유지한다.


## 2026-11-02 2-54 민영화 가격·대상 보완

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


- 코드 완료: BuildingEconomics의 민영화 허용 기준을 sellsShares로 통일해 무역소·정부/자동 건물 제외. privatizePrice의 레벨당 매각 가격·연간 이익을 정확한 소수2자리 툴팁으로 표시, KO/EN 라벨 추가. 미사용 privateEquity 문자열 제거. 소유 몫·금고·장부 라벨은 앞선 완료 기록 참조.
- 검증: 루트 typecheck 통과, 클라이언트22파일59시험 통과(가격 한/영 및 무역소 조작 제외 회귀 포함). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/privatization-price-ko-tooltip.png. 별도 프로필 검증용 왕실 벌목장8레벨, 가격ƒ186,233.21/레벨·연간 이익−ƒ164,784.26/레벨 툴팁 확인. 검증용 저장은 복원. 실제 매각 진행·영문/다크 화면은 화면 미검증.

- 2-45 세율·조건 툴팁 보완 완료: 모든 세법 선택지의 taxRates(k, law)를 현재 예산 단계 기준으로 표시(정액은 1인/일, 소득세는 %). 조건 미달 툴팁에 financeRatio/threshold, 전환 중에는 목표 법 라벨 추가. 루트 typecheck 및 클라이언트23파일61시험 통과(예산5단계 KO/EN 회귀 포함).
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-tax-quotes-ko.png. 토지세ƒ0.02/인·일 툴팁, 인두세ƒ0.6/인·일·소득세30%는 DOM 대조. 본문418/scroll418。영문·다크 화면 및 다른 법 툴팁 실표시는 화면 미검증. 투자 직종 아이콘과 전환 완료/실패 소식 전 경로는 잔여.
