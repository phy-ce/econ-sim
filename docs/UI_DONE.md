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


## 2026-11-02 2-29 저택 배당 표시

### 2-29. 저택의 하급 귀족 (gentry)
- 저택(`manor`) 1레벨 자리: 귀족 100 + 하급 귀족 100. 일자리 표·막대는 `slots(b, s)`·`b.employed`라 그대로 보인다.
- 저택 수입(배당·지대·철거 대금)은 몫으로 나뉜다: 귀족 1명 1몫, 하급 귀족 1명 `TUNE.gentryShare`(0.25) 몫. 저택·금융가 자리는 모두 임금이 없다.
- 새 export (`economy.ts`): `paysShare(b, s)` 이 자리가 임금 대신 몫을 받는가 (`paysDividend`는 그대로 있다), `shareWage(b, s)` 한 사람의 기대 하루 몫 (= labor `dividendWage`), `shareWeight(cls)` 1명 몫.
- 넣을 곳: 건물 카드에서 "배당" 표시를 `paysShare(b, s)`로 바꾸면 저택의 하급 귀족도 몫으로 보인다 (`CompanyPanel.tsx` 152행은 `paysDividend(c.state, s)`). 저택 툴팁에 직종별 1명 몫(`shareWage`)을 보일 수 있다 (선택).
- 저장 형식 그대로. 옛 저장은 다음 날 저택이 커지고 실업 하급 귀족이 차차 앉는다.


- 코드 완료: Workforce는 이미 paysShare를 사용. 실제 소유 기관 상세/그룹에서 쓰는 OwnerSummary에도 동일 기준의 배당 표식을 추가해 하급·상급 귀족 모두 표시. 현재 sim slots에 따라 자리 수를 읽으며 옛 고정100/100을 화면에 박지 않는다.
- 루트 typecheck/클라이언트23파일62시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/manor-gentry-share-ko.png. 동부 삼림 저택23레벨·하급2.3k/상급433 및 배당 아이콘2개, 본문418/scroll418. 영문·다크 상세 및 실제 몫 지급은 화면 미검증.


## 2026-11-02 2-41 민간 대출 표시 코드 대조

### 2-41. 은행 없앰, 민간은 빌리지 않음 (사용자 결정 2026-10-21)
- 규칙: 왕실만 빌린다. 국고가 모자라면 자동으로 국채를 찍어 빌리고, 남으면 갚는다. 민간 상회는 빌리지 않는다.
- sim 변경: `World.bank`(와 `Bank` 타입)를 없앴다. `MetricPoint.bank`도 없앴다 (화면은 읽지 않았다). `creditLimit(w, c)`는 민간이면 0이고, 민간 `Company.debt`는 늘 0이다 (필드는 왕실 국채 때문에 그대로 둔다). 옛 저장은 `migrateWorld`가 은행 현금을 투자 풀 쪽으로 옮기고 민간 빚을 0으로 만든다.
- 화면에서 할 일:
  - `CompanyPanel.tsx` 132~144: 대출 값과 한도 막대(`T.loanLimit`)는 `c.state`일 때만 그린다. 민간 상회 쪽에서는 줄을 뺀다.
  - `App.tsx` 125~145 상단 대출 칩, `FinancePanel.tsx` 19: 플레이어는 왕실이라 그대로 맞다. 2-28의 "금고 순자산 / 한도"도 왕실 국채 한도 그대로.
  - `BottomPanel.tsx` 34의 `c.cash - c.debt`: 민간은 빚이 0이라 현금과 같다. 그대로 두어도 된다.
- 컴파일 수정: 없음 (sim 이름·타입 중 화면이 쓰는 것은 바뀌지 않았다).


- 코드 대조 완료: 옛 CompanyView는 8d66c52에서 제거. 현재 KingdomMoney.tsx의 creditLimit은 d.government에만 사용하고 민간 카드에는 현금·유보·저택·금융가 금고만 표시. FinancePanel.tsx:42와 상단 칩은 플레이어 왕실 금고/신용 한도. 민간에 대출 조작이나 대출 한도 행 없음. packages/client/src에서 World.bank 사용 없음.
- 이 항목은 코드 대조만 수행해 추가 화면 미검증. 앞선 왕국 자금 카드 스크린샷은 그때 확인 범위로 유지한다. 직전 검증 루트 typecheck/클라이언트23파일62시험 통과(코드 변경 없음). 하급 귀족 표식 커밋 cceaa08.

## 2026-11-02 2-45·2-56 정책 표시 후속
- 투자법 상세에 INVEST_CLASSES의 대상 직종24px 아이콘 추가. KO 라이트 최대6직종, 본문418/scroll418. 잠금 표식은 lucide Lock으로 통일. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-invest-classes-ko.png.
- eventDestination.ts:3에서 lawChanged/lawFailed 둘 다 국가 창 법 탭으로 이동하며 App·GameWindow·Notifications가 같은 함수를 사용함을 코드 대조. 실제 전환 완료/실패 사건 클릭, 영문/다크 새 아이콘은 화면 미검증. 2-45 원문은 잔여 검증 범위를 보존해 유지.
- 최신 main 병합 후 루트 typecheck와 클라이언트23파일62시험 통과. 다음 사용자 최신 우선순위 2-81 진행. 민간 대출 감사 커밋39906cd.


## 2026-11-02 2-81 지역 임금 기준 반영

### 2-81. 왕실 임금 탭과 건물 방식 비교 임금 (main c952e65, DESIGN 7.3, 웃돈 손잡이는 결정 대기)
- sim 사실:
  - 실제 지급은 지역마다: 회사 생산 건물 = `Region.wages` × (1 + 웃돈 `Company.wageOffset[s]`) (`economy.ts:349~359 wagesAt`, `:361 offsetWages`). 웃돈은 −50%~+100% (`commands.ts:156~161`).
  - `Company.wages` (`types.ts:411`)는 그 회사 생산 건물 지역 임금의 고용 가중 평균 계산값이다 (`labor.ts:472 syncCompanyWages`, 날마다). 반올림하지 않은 값이라 화면은 소수 둘째 자리로 보인다 (`test/core/decimals.test.ts`는 이 칸을 "보이는 값"에서 뺐다).
  - `Company.stateWages` (왕실)는 왕국 지역들의 `Region.stateWages` 평균이다 (`finance.ts:153~154`, 대표값).
  - `setWage`로 넣은 절대값은 지역 임금이 있으면 지급에 쓰이지 않는다 (`wagesAt`이 `Region.wages`를 먼저 본다). 플레이어 왕실은 `setWage`·`setWageOffset` 둘 다 오류다 (`commands.ts:149`, `:157`, 2-69). 클라이언트에 `setWage` 호출은 없다 (grep 0건). 플레이어 왕국의 민간 회사는 AI다.
- 지금 화면:
  - `Wages` (`CompanyPanel.tsx:326~349`, 재정 창 `FinancePanel.tsx:49`): 직종마다 큰 숫자 `me.wages[s]` (`:338`, `format="two"`, 반올림은 이미 된다), 비교값 "시장임금" `marketWage(world, s, me.id)` (`:331`, `:344`) = 세계 전체 회사 평균, 실업 `unemploymentRate(world, s)` (`:333`, 세계 전체 pop). 왕실은 슬라이더가 없다 (`:339`).
  - 건물 상세 방식 비교 (`CompanyPanel.tsx:305`): `estimateMethod(world, b.regionId, b.typeId, m.id, owner.wages)` → 회사 평균 임금으로 임금비를 센다. 그 건물이 실제로 주는 임금이 아니다.
- 바꿀 것:
  1. `:305`의 `owner.wages` → `wagesAt(owner, b.typeId, world, b.regionId)` (`@econ/sim`에서 export됨). 건설 카드의 `estimateAfterEntry` (`:388`, `:419`)는 sim이 지역 임금을 읽으므로 (`outlook.ts:345~350 longRunWages`) 그대로 둔다.
  2. `Wages` 직종 행: 큰 숫자 `me.wages[s]`는 그대로 두고 라벨을 "평균"으로. "시장임금" 줄(`:344`)은 "지역" + 플레이어 왕국 지역들의 `r.wages[s]` 최소 ~ 최대 (`world.regions.filter(r => r.kingdomId === me.kingdomId && r.wages)`, 둘 다 `format="money"`). 지역이 하나면 값 하나. `marketWage` import는 다른 곳에서 안 쓰면 지운다.
  3. 실업 막대(`:333`)는 플레이어 왕국 pop만: 그 왕국 지역의 그 직종 pop 합 중 `work === 0` 비율 (화면에서 센다. `unemploymentRate`와 같은 식에 왕국 거르기만 더한다).
  4. 맨 위 국영 임금 칸(`:329`)은 그대로 두고 라벨 뒤에 "평균" (`me.stateWages`는 지역 평균이다).
  5. 지역별 값은 2-79 지역 임금 창에서 본다 (이 탭에 지역 목록을 넣지 않는다).
- 웃돈 손잡이 (**결정 대기**): 추천안은 "웃돈만 보이고 웃돈으로만 조절"이다. 절대 임금 입력은 만들지 않는다 (지급에 안 쓰인다). 다만 지금 플레이어 왕실은 sim이 웃돈도 막으므로 (2-69) 이 탭은 읽기 전용이다. 왕실 생산 건물의 웃돈(−50%~+100%)을 플레이어에게 열지는 플레이어가 보는 규칙이 바뀌는 일이라 사용자 결정이다 (sim `commands.ts:157` 조건). 열리면 화면은 `:339`의 `!me.state` 조건만 풀고, 슬라이더 값은 `me.wageOffset[s]`(플레이어는 시작부터 객체, `world.ts:98`)를 쓴다. `:332`의 `me.wages[s] / market - 1` 대체식은 지운다.
- 문자열 (ko/en): "평균"/"Average", "지역"/"Regions". 나머지 재사용.
- 빼는 것: `:331`·`:344`의 세계 평균 `marketWage` 비교.
- 완료 기준: 방식 비교의 임금비가 그 건물 지역 임금으로 센 값이다 (같은 방식이면 `b.last.wageCost`와 가동률·인원 차이만큼만 다르다). 임금 탭 지역 범위가 2-79 표의 최소·최대와 같다. typecheck.


- 코드 완료: 방식 비교 estimateMethod에 wagesAt(owner,typeId,world,regionId) 사용. 임금 요약은 Company.wages의 소수2자리 평균, 왕국 지역의 시장 임금 최소/최대(표시값이 같으면 하나), 왕국 pop만의 실업률. 국가 임금은 평균 라벨, 결측은 —. 왕실 슬라이더 없음. 머리 영역은 두 열 전체 폭.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/wages-region-summary-ko.png, wages-region-summary-en-dark.png. 최신 sim createWorld(42)→step14일 실제 값: 노동자 평균ƒ3.31/지역ƒ3.30~ƒ3.31, 본문418/scroll418·슬라이더0. 방식 비교 선택지의 실제 클릭·옛 저장 첫날 결측의 모든 경로는 화면 미검증. 검증용 세계는 별도 Edge 프로필에만 저장, 원래 저장은 estera-ui-before-regional-wage-check로 백업(2-79 검증 후 복원 예정).
- 외국 임금999.12와 대규모 외국 실업 인구가 왕국 표에 섞이지 않고, 평균4.56789→4.57·실업25%·읽기 전용을 확인하는 KO/EN 회귀 추가.


### 2-80. 국영 임금 상세는 지역 시장 임금 × 단계 (main c952e65, DESIGN 7.3·9.2, sim 준비됨 (`WageDrillJob.marketWage`, wt-sim2))
- 지금 화면: 재정 창 국영 임금 줄의 자세히 보기 (`FinancePanel.tsx:68` → `BudgetJobs.tsx:12`)가 1인/일 값과 식 툴팁 `기준 임금 × 임금 지수 × 단계`를 보인다. 값은 sim `drillWages` (`budget.ts:370~389`)의 `WageDrillJob.perHead`이고, 거기서 임금 지수 = `marketWages(w, 왕실 id)[s] ÷ baseWage` (`budget.ts:117`, `:380`) = 세계 전체 회사 고용 가중 평균 기준이다.
- 실제 지급: 정부 건물은 그 건물 지역의 `Region.stateWages[s]` = round2(`Region.wages[s]` × 단계 배율) (`finance.ts:147~151`, `economy.ts:353`). 지역마다 다르다. 그래서 지금 상세의 1인/일·주간 값은 실제 지급과 다르다 (행 합과 줄 합의 차이는 `smoothing`으로 흡수되어 겉으로 드러나지 않는다).
- sim 쪽 필요 (3장): `drillWages`가 `wageMarket` 1이면 행 건물 지역의 시장 임금으로 센다. `WageDrillJob`에 새 칸 `marketWage?: number` (= 그 행 지역 `Region.wages[s]`, 1인 하루 ƒ), `perHead` = `marketWage × stepMult` (단계 미리보기 `steps`도 같은 식), `wageIndex` = `marketWage ÷ baseWage` (호환용으로 남김). `budgetModel`의 `wageBase`·`firmBase`(`budget.ts:261~266`)도 같은 지역 임금으로.
- 화면 (sim이 들어온 뒤):
  1. `BudgetJobs.tsx:12` 식 툴팁: `j.marketWage !== undefined`이면 `{시장 임금} {marketWage} × {단계} {stepMult}` 한 줄. 없으면 지금 식 그대로 (`wageMarket` 0 세계).
  2. 같은 툴팁의 "임금 지수" 줄은 `marketWage`가 있으면 뺀다.
  3. 행 머리의 지역 이름은 이미 있다 (`FinancePanel.tsx:67` `region(row.regionId)`). 바꾸지 않는다.
- 문자열: "시장 임금"/"Market wage" (`T.marketWage`), "단계"/"Stage" (`T.stage`). 새 문자열 없음.
- 빼는 것: `marketWage`가 있을 때 식의 `baseWage × wageIndex` 부분.
- 완료 기준: 정부 건물 한 곳의 1인/일이 그 지역 `Region.stateWages[s]`와 소수 둘째 자리까지 같다 (지금 단계). typecheck.




### 2-84. 국영 웃돈 (wt-admin, DESIGN 7.3·10장 `adjustStatePremium`, 사전 `ai-state-premium`, 낮은 우선순위)
- sim: AI 왕실은 지역마다 정부 건물(행정청·건축사무소·학교) 직종마다 웃돈 `Company.statePremium[지역 id][직종]` (0~`TUNE.aiStatePremium`)을 둔다. 그 지역 `Region.stateWages[s]` = round2(`Region.wages[s]` × 단계 배율 × (1 + 웃돈)). 플레이어 왕실은 이 칸이 생기지 않는다 (AI 판단만, DECISIONS 7-42 결정 대기).
- 예산 상세: `WageDrillJob.premium?: number` (새 칸, 웃돈이 0 이면 없음). `perHead` = `marketWage` × (1 + `premium`) × `stepMult`, `wageIndex` = `marketWage` × (1 + `premium`) ÷ `baseWage`. 플레이어 왕국의 상세에는 나오지 않는다.
- 화면 (선택): 2-80 식 툴팁에서 `j.premium`이 있으면 `× (1 + {웃돈})` 한 칸을 더한다. 2-79 지역 시장 임금 표에서 다른 왕국 지역의 국영 임금이 시장 임금 × 단계보다 크면 그 웃돈 때문이다 (웃돈 열은 넣지 않아도 된다).
- 문자열: "웃돈"/"Premium" (이미 있으면 그것). 완료 기준: typecheck.



## 2026-11-02 2-80·2-84 국영 임금 계산 표시
- 코드 완료: BudgetJobs는 marketWage가 있으면 시장 임금 × 단계만 표시하고, AI 국영 premium이 있으면 ×(1+웃돈) 추가. 지역 값이 없는 wageMarket0/옛 자료는 기본 임금 × 임금 지수 × 단계 식 유지. 화면 숫자는 소수2자리, 원래 계산값 불변.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/state-wage-regional-en-dark.png. 동부 삼림 행정청 하급 귀족700명, 1인ƒ4.00·Market wage4×Stage1. 직접 API 대조 perHead3.997182848716258/Region.stateWages4 → 표시값4.00 동일. AI 웃돈 및 지역 임금0 세계는 SSR 회귀만, 화면 미검증.
- 클라이언트25파일66시험 통과(지역/웃돈식·옛 계산식 호환 포함). 루트 typecheck 통과. 이전 2-81 커밋9d61d99.

## 2026-11-02 · UI_CHANGES 3장 뒤 진행 메모 (원문, 2026-11-02 옮김)
- 근거: 같은 범위의 완료 기록이 이 문서에 있다 (K 2-70, C 2-71·2-72 1항, H 2-73, J 2-74, 2-50 잔여, 모두 2026-11-01 절). 할 일이 남지 않아 UI_CHANGES 에서 뺐다.
- K(2-70): 코드 완료, 화면 미검증. UI_DONE 참조.
- 진행 C(2-71·2-72 1항): 국가 예산/법 탭 통합, 외부 링크 탭 목적지, 복지법 없음 잠금. 본문/명령 재사용.
- 진행 H(2-73): 지역 칩·짓기/대기열·지도 선택 연동·BuildList 재사용.
- 진행 J(2-74): 워커 틱 경계 목표 정지, 이유 칩, 위험 에피소드 35틱 거르기. sim 파일 변경 없음.
- 진행 2-50 잔여: 옛 상회 저택·금융가 행을 OwnerSummary/자리/금고 전용으로 분기.

## 2026-11-02 확인 (main `81494a1` 클라이언트 코드 대조, 화면 작업자 커밋 d47e766·9d61d99·e152f49 포함)
- 코드만 읽어 판정했다. 화면 검증 범위는 UI_STATUS 기록을 따른다 (적힌 것 밖은 화면 미검증).

### 2-43 확인: 완료 (그림 양식은 2026-10-24에 바뀌었다). `RegionMap.tsx:7`·`:69`·`:72` (regions.json, 바탕 이미지, 호수·산괴), 이웃 검사 `scripts/build-map.ts:18~29` (`assets:check`).

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

### 2-45 확인: 코드 완료 (d47e766 투자 직종 아이콘·잠금 아이콘, 5beb5c0 세율 툴팁, 631751f 기술 링크·전환 상태). `PolicyPanel.tsx:30` 세율 툴팁, `:41` 전환 막대(조건 미달 빨강), `:43` 잠금, `:45` 투자 직종 아이콘, `:46` 기술 링크. 사건 이동 `eventDestination.ts:3`. 예산 칩·재정 칩 항목은 정책·재정이 국가 창 하나로 합쳐져(`StatePanel.tsx`, 2-71) 폐기. 화면 미검증: 법 전환 완료/실패 사건 클릭, 영어·다크 새 아이콘 (UI_STATUS 2026-11-02).

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

### 2-46 확인: 완료. `RegionWindow.tsx:12`·`:17` 개요·인구·건물 탭 (탐색 이력 상태). 작은 잔여(`role=tablist`, ←/→ 키)는 넘기지 않는다.

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

### 2-52 확인: 완료 (양식은 바뀜). `scripts/icons/list.ts` (별칭 없는 전체 목록), `scripts/icons/pack.py`, `assets-src/icons.json`, 생성 아틀라스 `spriteSheets.gen.ts`. 다음 시트 프롬프트 출력·미리보기 페이지는 넘기지 않는다.

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

### 2-53 확인: 폐기 (좌우 고정 두 자리·크기 조절 없앰 방식은 UI_DESIGN 3장 자유 이동 창으로 대체, UI_CHANGES 0장 "최신 적용 기준").

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

### 2-56 확인: 완료. `PolicyPanel.tsx:22`·`:43`·`:46` (열림·기술·잠금, 전환 중 조건), 연구 → 법 해금 줄 `ResearchPanel.tsx:34`.

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

### 2-57 확인: 완료. 복지 법 칸과 주간 금액 `PolicyPanel.tsx:46`, 목표 생활수준 툴팁 `FinancePanel.tsx:35`·`:45`. 읽기 전용 칩 항목은 국가 창 통합(2-71)으로 필요 없음.

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

### 2-58 확인: 완료. 클라이언트에 100배 값 칸·`roundWorld` 사용 없음 (grep 0건).

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

### 2-63 확인: 완료. 레벨 입력에 50 고정 상한 없음, 방식 숫자는 sim 데이터에서 읽고 공구는 FlowRow 로 보인다.

### 2-63. 방식 사다리와 1레벨 약 500명 (2026-10-22, 사용자 결정, DESIGN 7.1)
- 모든 건물의 방식이 바뀌었다 (`data.ts BUILDING_TYPES`). 기본 방식 1레벨은 일꾼 약 500명(옛 1,000명)이고 산출도 약 절반이다. 단계가 오를수록 일꾼은 줄고 기술자·전문가와 공구·석탄·철·기계가 늘며, 레벨당 이익은 단계마다 2배다.
- 새 방식: 방직 공장 `textile_spin` (방적기, 철 가공). 방직 공장 방식 순서가 손베틀·방적기·증기 직기·맞춤 재단·증기 재단으로 바뀌었다 (방식 id는 그대로). 철·석탄 광산 방식 이름: `iron_shaft`·`coal_shaft` "곡괭이와 삽 / Picks and shovels", `iron_pick`·`coal_pick` "발파 / Blasting".
- 기본 방식 대부분이 공구를 10~30 쓴다 (광산 30, 2-64) (투입·산출 표시 2-51에 공구가 새로 보인다). 소작지가 공구를 낸다 (`SUBSISTENCE.output.tools`). (2026-10-23 sim 변경, DECISIONS 7-25: 소작지는 이제 곡물·술·의복·목재만 내고 가구·공구는 내지 않는다. 화면은 산출 키를 그대로 읽으면 따로 고칠 것이 없다.)
- 숫자가 바뀐 상수: `SUBSISTENCE.workersPerCell` 500, `OWNER_SEATS_PER_LEVEL` 5, `TUNE.financeStaff` 1, `START_OFFICE_LEVELS` 20, `MAX_LEVELS_PER_PROJECT` 100, 공사 포인트(`buildPoints`) 200~550 (2-64에서 바뀜), 건축사무소 목조 2점·비계 4점·철골 6점. 공사 레벨 입력 칸 상한이 50으로 박혀 있으면 `MAX_LEVELS_PER_PROJECT`를 읽는다.
- 이익률 막대(사전 `methods-rule`)는 이제 최대 약 55%라 눈금 상한을 0.6으로 했다.

### 2-65 확인: 대체됨. 1항(왕실 슬라이더)은 2-69가 뒤집었고, 지역 시장 임금은 2-79~2-81·2-84가 맡는다. 왕실 임금 읽기 전용 `CompanyPanel.tsx:344` (9d61d99).

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

### 2-66 확인: 완료. 술·양조장 아틀라스 `spriteSheets.gen.ts:22`·`:54`, `assets-src/icons.json`. 상품 목록은 `GOOD_IDS` 에서 그린다.

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

### 2-72 1항 확인: 완료 (C 단위). 복지법 없음이면 단계 버튼 비활성 + 잠금 칩 → 법 탭 `FinancePanel.tsx:45`. 2항은 UI_CHANGES 2-72에 남김.

### 2-72. 0b 결과에서 화면이 알아야 할 것: 복지 다이얼, 인두세 부담 (docs/overhaul/0B_RESULTS.md 2.4·2.9·2.10)
1. **복지 다이얼은 복지법이 없으면 아무 일도 안 한다 (지금 할 일, 2-71과 같이).**
   - 사실: 플레이어 왕국의 복지법은 시작부터 `none` (`world.ts:173`). `welfareCovers('none', g)`는 어느 무리도 덮지 않아 (`welfare.ts:25~27`) 복지 단계 `k.budget.welfare`는 읽히지 않는다 (`welfare.ts:87~88`). 0b (main be7e72f, 20년 × 시드 1·2 × salt 0..3)에서 복지 단계 1과 5의 결과가 기준선과 같았다.
   - 지금 화면: `FinancePanel.tsx:34` 복지 줄의 단계 버튼 1~5가 늘 눌리고, 눌러도 수지가 0으로 그대로라 왜 안 바뀌는지 읽히지 않는다.
   - 바꿀 것 (추천안): `k.welfareLaw === 'none'`이면 복지 줄의 단계 버튼 다섯 개를 `disabled`로 (지금 단계는 눌린 모양 그대로 회색). 줄 머리에 잠금 칩 하나: 자물쇠 아이콘 + `{S.welfareLaw}: {법 이름}` (법 이름은 PolicyPanel이 쓰는 `names[st.welfare.current]`). 칩을 누르면 국가 창 법 탭, 분야 `welfare` 선택. 툴팁은 라벨만 ("복지법: 없음").
   - 이유: 움직여도 결과가 0인 손잡이는 읽히지 않는다 (0B 2.4 해석). 규칙은 바꾸지 않는다. 버린 안: 버튼은 살리고 수치 0만 보이기 (법을 고르기 전에 단계를 미리 정할 이유가 작고, 눌러도 안 바뀌는 혼동이 남는다). 사용자가 반대하면 버린 안으로 바꾼다.
   - 데이터: `world.kingdoms.find(k => k.id === me.kingdomId).welfareLaw` (`WelfareLaw`), 법 이름은 `policyStatus(world, kingdomId).welfare`.
   - 문자열: 새 문자열 없음 (복지법 라벨·법 이름 재사용).

## 2026-11-05 확인 (main 0e00385 클라이언트 코드 대조)
- 코드를 읽어 판정했다. 스크린샷은 이 대조에서 다시 열지 않았고, 화면 작업자가 UI_STATUS 2026-11-05 기록에 적은 파일 이름을 옮겼다 (1920×1028 헤드리스, `C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/`). 적힌 것 밖은 화면 미검증.

### 2-32 확인: 완료. `OwnerHoldings.tsx:7~9` 주간 이익 × 몫 내림차순·실제 배당, `:12` 열과 합계 행, `OwnerSummary.tsx:12` 머리 받은 돈/주 (`profitEma` × 7), `BuildingEconomics.tsx:19` 뒤의 죽은 표는 지웠다. 스크린샷 nov5-holdings-ko-light.png·nov5-holdings-en-dark.png. 화면 미검증: 혼합 지역, 양수 실제 배당 (지급액 경로는 `test/ownerHoldings.test.tsx`).

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

### 2-42 확인: 완료. 상세 머리 땅·광맥 남은 수 `BuildingRoom.tsx:9~11` (`GroupDetail.tsx:31`, `ResourceInspector.tsx:40`), 대기열 건수/상한 `CompanyPanel.tsx:218`, 지역 링크 `:221` (`ConstructionPanel.tsx:14`, `GameWindow.tsx:47`), 문자열 `expandTen`·`myHouse` 없음 (grep 0건). 2-42-6 의 '그 종류 상세로 열기'는 지역 건물 탭 열기까지다 (11-02 남은 줄은 지역 링크만 요구). 건설 창 짓기 탭은 2-73 이 대신했다. 스크린샷 nov5-room-ko-light.png·nov5-room-en-dark.png·nov5-queue-link-ko-light.png·nov5-queue-en-dark.png. 화면 미검증: 광산 광맥 줄, 공사 상한까지 찬 화면.

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

### 2-48 확인: 완료. `ResearchPanel.tsx:68` 노드 비용·남은 주·진행 막대, `:53`·`:66`·`researchLayout.ts:2~6` 선행 경로 강조, `:62` 마우스 위치 휠 확대, `:64` `+`·`-`·`0` 키, `:49`·`:54` `research-view` 저장, `:27` 툴팁 이익률·일자리·투입→산출, `:34`·`GameWindow.tsx:46` 법 줄 → 국가 법 탭. 배치는 2-68, `?` 사전 링크는 2-40 (단위 G)이 대신한다. 스크린샷 nov5-research-ko-light.png·nov5-research-en-dark.png·nov5-research-path-ko.png·nov5-research-view-restored.png. 화면 미검증: 연구 완료까지의 시간 경과, 모든 노드 툴팁.

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

### 2-51 확인: 완료. 열 방식 비교 `MethodComparison.tsx:12~38` (`CompanyPanel.tsx:302`, `<select>` 없음): 차이 칩 `:19`, 경험 −50% `:25`, 잠긴 열 `:18`·`:23~24`, 머리 클릭 `setMethod` `:24`. FlowRow 툴팁 효율·기상 `FlowRow.tsx:17~18`·`:25`. `Bag`·`bag` 없음 (grep 0건). 건설 카드는 명세의 좁을 때 대안 (`CompanyPanel.tsx:423` FlowRow 줄). 사전 패키지 '입력' 라벨은 화면 작업자 범위 밖이라 3장으로 넘겼다. 스크린샷 nov5-method-comparison-ko-light.png·nov5-method-comparison-en-dark.png·nov5-method-header-click-ko.png. 화면 미검증: 다른 건물의 방식 조합.

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

### 2-64 확인: 완료. 건설 카드 라벨 `CompanyPanel.tsx:390`·`:421`, `IndustryLabel.tsx:3~6`, 방식 비교 머리 `MethodComparison.tsx:25`, 원료/매출 행 `:36` (`methodMarginAtBase`, 막대가 아니라 비율 숫자 행이다). 유형 칩(선택)은 하지 않았다. 스크린샷 nov5-types-ko-light.png·nov5-types-en-dark.png. 화면 미검증: 실제 방식 전환, 비율 행 조합.

### 2-64. 산업 유형 라벨과 방식 숫자 (사용자 요청 2026-10-22, DESIGN 7.1, 브랜치 wt-ind2)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 건설 카드에 산업 유형 라벨 없음 (건물 상세에는 있음 `BuildingEconomics.tsx:24`). 방식 비교의 투입·매출 줄은 2-51 열 비교와 같이 한다. 유형 칩(선택)은 하지 않아도 된다.
- 새 sim 값 (`data.ts`): 타입 `Industry = 'primary' | 'processing' | 'heavy' | 'luxury'`, `INDUSTRIES[id]` (`name` 한국어 1차 산업·가공·중공업·숙련, `nameEn` Primary·Processing·Heavy industry·Skilled crafts, 기본 일꾼 `workers`, 숙련 비율 `skillShare`, 원료/매출 범위 `inputShare`), `BuildingTypeDef.industry`, `MethodDef.industry`(방직·가구 공방의 사치품 방식만), 함수 `industryOf(typeId, methodId?)` (없으면 null: 소작지·저택·금융가·학교·건축사무소·행정청).
- 화면 요청:
  1. 건물 상세 머리와 건설 카드에 유형 라벨 한 칸 (`INDUSTRIES[industryOf(b.typeId, b.methodId)].name`). 방직·가구 공방은 방식에 따라 라벨이 바뀐다 (손베틀 = 가공, 맞춤 재단 = 숙련).
  2. 방식 비교(2-51 열 비교)에 행 하나: 원료/매출 막대 (기본가 기준 원료비 ÷ 매출, 0~1). 사전 `methods-rule` live 가 같은 값을 쓴다 (`methodMarginAtBase(typeId, methodId)`의 `input / revenue`).
  3. 지역 건물 목록·새 건물 목록에 유형으로 묶거나 거르는 칩 (선택, 급하지 않음).
  설명 문구는 넣지 않는다 (규칙은 README·사전).
- 바뀐 숫자: 가공·중공업·숙련 기본 방식 일꾼 300 (옛 400), 가공 공장 원료·산출 약 2배 (예: 식료품 곡물 1,300 → 2,600, 식료품 2,150 → 2,650), 벌목·광산 일꾼에 기술자 50, 1차 윗단계 일꾼 350·200. 공사 포인트: 식료품·가구·종이 250 → 300, 공방 200 → 300, 운송 200 → 350, 제철소 300 → 500, 기계 공장 300 → 550 (`buildPointsOf`). 화면이 숫자를 박아 두었으면 데이터에서 읽는다. 방식 id·기술 연결은 그대로.

### 2-67 확인: 완료. 금고 막대·`postUsable` `BuildingEconomics.tsx:27`, `tradeReserveOf` `MethodComparison.tsx:32`·`CompanyPanel.tsx:423`, 약정금 줄 `CompanyPanel.tsx:433` (레벨당 값, 툴팁 `T.tradeEscrowHelp`), `Region.trade` 막대·이익률 `RegionTrade.tsx:7~15`·`MarketWindow.tsx:63`, 빈 흐름 — `FlowRow.tsx:26`. 클라이언트가 `traders` 를 읽는 곳은 없다 (grep 0건). 스크린샷 nov5-trade-ko-light.png·nov5-trade-en-dark.png·nov5-post-usable-ko-light.png. 화면 미검증: 약정금 실제 납부·환급, 영문 무역소 상세.

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

### 2-75 확인: 완료. 건설 카드 지금·+1·+5 `CompanyPanel.tsx:429`·`supplyDemand.ts:6~10`, 로그 막대·눈금·AI 문턱 `SupplyDemand.tsx:7~13`, 줄 툴팁 `:19`, 증설 버튼 `CompanyPanel.tsx:288~298`, 시장 창 열·정렬 `MarketWindow.tsx:41`·`:44`·`:61`. 스크린샷 nov5-sd-build-ko-light.png·nov5-sd-build-en-dark.png·nov5-sd-market-ko-light.png·nov5-sd-market-en-dark.png (화면 작업자가 같은 날 sim 직접 호출 값과 대조했다고 기록). 화면 미검증: 실제 짓기 실행, 전 상품·전 범위 조합.

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

### 2-79 확인: 완료. 창 `RegionExplorer.tsx:40` (`region.wages` 없으면 없다), 소작 1인 소득 주간 계산 `RegionWages.tsx:15`, 칸과 툴팁 `:22~24`, 표 `:25~36`, 국영 칸 식 `:28`. 스크린샷 nov5-wages-ko-light.png·nov5-wages-en-dark.png. 화면 미검증: AI 양수 웃돈 툴팁.

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

### 2-85 확인: 완료. 일꾼 줄 임금 칸 `Workforce.tsx:20`, 값 `WorkforceWage.tsx:8~18`, 배당 자리 — `:13`·`:24`, 그룹 가중 평균·최저~최고 `:27`·`:29~30`, 웃돈 칩 `:31`, 네 칸 격자 `system-ui.css:145`, 그룹 줄 `GroupDetail.tsx:33`. 스크린샷 nov5-workforce-group-en-dark.png·nov5-workforce-single-en-dark.png·nov5-workforce-single-ko-light.png. 화면 미검증: AI 왕실 국영 웃돈, 소작지 줄.

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

### 2-86 확인: 완료. 주 단위 조회 `RegionWages.tsx:16`, 방향 `:29`·`wageDirection.ts:1~3`, 툴팁 `:30`, 화살표 `:33`. 스크린샷 nov5-wage-target-ko-light.png·nov5-wage-target-en-dark.png. 화면 미검증: 주간 경계의 장기 화면, 전 직종 다음 날 대조.

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

### 2-87 확인: 완료. 주인 목록 지분 무게 `ownershipPortfolio.ts:4~5`, 저택 머리 `:6~10`·`OwnershipBrowser.tsx:37`, pop 보유 지분 `PopHoldings.tsx:6~20`·`BuildingPops.tsx:49`, 자리 라벨 `OwnerSummary.tsx:13`, 임시 우회를 뺀 시험 `test/ownerSummary.test.tsx:12`. 4항(선택)은 2-79 표의 직종별 실업 `RegionWages.tsx:34` 로 볼 수 있다. 스크린샷 nov5-manor-shares-ko.png·nov5-manor-owners-ko.png·nov5-manor-owners-en-dark.png·nov5-pop-manor-holdings-ko.png·nov5-pop-manor-holdings-en-dark.png. 화면 미검증: 실제 배당 지급, 지분 매매의 시간 경과.

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

## 2026-11-07 확인 (main `3f4e89a` 클라이언트 코드, 커밋 안 한 변경은 근거로 쓰지 않음)

화면 작업자에게 넘기기 전 UI_CHANGES 를 정리하며 옮겼다. 줄 번호는 `3f4e89a` 기준이다. 판정은 코드와 UI_STATUS 기록으로 했고, 이 정리에서 화면을 다시 보지는 않았다. 스크린샷은 UI_STATUS 기록대로 `C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/` 에 있다.
"완료" 는 할 일이 없는 절, "일부" 는 남은 것만 UI_CHANGES 에 줄여 두고 원문을 여기 보관한 절이다.

### 옛 "0. 지금 할 일" 에서 끝난 줄 (2026-11-07)
- **2-82**: pop 상세에 부 이동 표가 두 번 나온다 (`BuildingPops.tsx:36`·`:46`). `:46` 을 지운다. 그 밖은 없음 (코드 대조 기준).
- **2-92 건설 창 다시 만들기 (사용자 요청, 먼저)**: 건설 + 건물 관리 합침. 목업 `docs/mockups/construction-d.dc.html`, 검토 후 새로 만든다.
0. **2-91 혼합 방식 (새)**: 산출이 둘인 방식의 공급 ÷ 수요를 상품마다. 2-92 10번 형태(지금 S/D 와 값)로 넣는다.
0. **2-93 실제 가동 (새, 사용자 2026-11-05)**: 건물 창과 건설 서브창에 `실제 가동` 한 값. 2-93 식 그대로, sim 읽기 전용 값으로 바로 된다.
0. **2-94 기술로 열리는 수요 (새)**: 시장 창의 운송·종이·정밀 기기 줄에 잠금 표시 (`Region.lockedGoods`), 툴팁에 여는 기술 (`goodTechs`). 이름 변경(기계 → 정밀 기기)은 `GOODS`·`BUILDING_BY_ID` 를 읽는 곳이면 저절로 된다.
1. **2-89 복지 상한 (새)**: 정책 창·예산 미리보기 복지 줄에 상한 숫자, `welfareCapDaily` × 7, 라벨과 숫자만. 복지 내역의 '평활 차이' 를 "상한으로 줄인 몫" 으로.
2. **2-55**: 인구 표 직종 고르기에서 자본가 빼기.
3. **2-62**: 목록 행 비용 막대 툴팁의 사무소 매출을 "공사 수수료"로.
4. **2-83 재해 칩 (낮음)**: `quakeChance` 기본 0이라 지금은 안 보인다.
5. 죽은 코드·문자열: 옛 `Research` 컴포넌트, `dailyBudget`·연구 장부 문자열 (2-61). 빈 파일 `windowGeometry.ts`·`windowLayout.ts`, `App.tsx:35` 옛 주석 "하루 24초" (UI_DESIGN 9·10장).
6. **2-88 정치 창 (낮음)**: 왕국 이익집단 6줄 (영향력·승인·기분), 투표법 라벨. 읽기 전용, 효과 없음.

### 옛 1장 "바뀐 시스템 요약" (2026-11-07 지움, 원문)
DESIGN 을 옮겨 적은 내용이라 지웠다. 고정 값과 없어진 이름(`Company.regionFunds`)이 있었다. 지금 기준이 아니다.

#### 1-1. 회사 구조: 왕국마다 왕실 + 민간
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

#### 1-2. 소유주 = 일자리 (Victoria 3 방식)
- 별도의 "소유주" 개념은 없다. 자본가(`capitalist`)·귀족(`aristocrat`)·하급 귀족(`gentry`)도 생산 방식마다 정해진 **일자리**다.
- 받는 돈은 건물 소유에 따라 다르다.
  - **민간 건물**: 귀족 자리는 임금이 없다. 레벨 이익은 배당으로 저택·금융가에 가고, 거기서 지분 주인에게 간다 (2-32, 2-87).
  - **왕실 건물**: 모든 자리가 임금을 받는다. 민간 지분(`privateShare`)이 있으면 그 몫의 이익만 저택·금융가로 간다.
  - 판정 함수: `paysDividend(building.stateOwned, skill)`
- **소작지**(`subsistence`)는 그 왕국 **민간 소유**다. 일자리는 소작농뿐이고(`peasantSlots(b)`), 지대는 저택이 받는다.

#### 1-3. 세금: 행정청 역량만큼만 걷힌다
- 세금은 세법(토지 기반 / 1인당)과 세금 수준 단계로 정한다 (2-22·2-23, `taxRates(kingdom)`).
- 실제로 걷히는 비율은 `Kingdom.taxRatio`다 (행정청 한도와 인구로 정하는 곡선, 100%에 닿지 않는다).
- 걷힌 세금은 행정청 건물의 수입(`last.revenue`)으로 잡힌다.

#### 1-4. 돈의 공급: 주조와 국채
- 매주 화폐를 새로 찍어 국고에 넣는다(주조).
- 왕실이 빌리는 돈은 새로 발행되고, 갚는 돈과 이자는 소멸한다.
  - 왕실의 대출 한도는 기본 한도 + 왕국 GDP의 25%다(`creditLimit`).
- 장부: `World.mint` = `{ minted, issued, retired, interest }`

#### 1-6. 부와 생활수준 분리 (빅토리아3 방식)
- **부**(`wealth`, 1~99)는 구매력 단계다. 소득과 생활비로만 오르내린다.
- **생활수준**(`sol`)은 `부 × 필요 충족률`이고, 최소 1이다. 물건이 시장에 없으면 생활수준만 떨어진다.
  - `Household.sol`, `HistoryPoint.sol`(`colonySol`), `popSol(p)`
- 시작 부는 시작 소득으로 감당할 수 있는 단계로 계산한다.

#### 1-7. 속도 조정
- 기술 비용은 4배, 건물 건설 포인트는 5배가 됐다. 20년쯤 지나야 경제가 다 발전한다.
- 연구와 공사 진행 바는 지금보다 훨씬 느리게 찬다.

### 2-33 확인: 일부, 사용자 결정 대기. 연속 보간 `RegionMap.tsx:26~31`, 범례 `:89~90`, `SOL_STOPS` `:27`. 정점 범위만 남아 UI_CHANGES 에 줄여 두었다.

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

### 2-40 확인: 일부, 단위 G 대기. 게임 안 링크 `PolicyPanel.tsx:46`. 앱 설명은 이 원문에만 남는다.

### 2-40. 규칙 사전 (2026-10-21, 급하지 않음)
- **2026-11-02 반영 확인 (main 81494a1): 일부. 이 절에서 할 일은 이 줄뿐이다 (아래 본문은 참고):** 오버홀 단위 G(게임 안 사전 창, sim S6)로 넘어갔다. 지금 할 일 없음. 게임 안 링크는 `PolicyPanel.tsx:44` 하나.
- 데이터: `@econ/sim`의 `ENCYCLOPEDIA`(항목 79개), `ENC_CATEGORIES`(10개), `SEEN_IN`(창 이름), `fillText`, `defaultCtx`, `ENC_BUILDINGS`.
  항목 = `id, category, title{ko,en}, rule{ko,en}, formula?, params[{label, value(), unit}], example?() → {inputs, steps, result}, live?{pick, run(world, ctx)} → {rows, bars}, related, seenIn, source, design`.
  `rule`·`formula`의 `{0}`, `{1}`은 `params` 값이다 (`fillText(text, entry, format)`). 단위(`unit`): florin, pct(×100 %), x, day, week, people, pt, level, good.
- 단독 앱 `packages/encyclopedia` (Vite + React, 포트 5200, `npm run encyclopedia`): 왼쪽 분류·검색, 오른쪽 규칙·공식·값·예시·지금 게임(워커에서 도는 세계, 날짜 슬라이더·+30일·+1년·시드)·관련·보이는 곳. 테마는 CSS 변수(`:root[data-theme='dark']`), 언어 ko/en.
- 게임에 옮길 때: `src/components/*`(Sidebar, EntryView, LivePanel, Bars, Rows, ExampleView)는 작고 `@econ/sim`만 쓴다. 지금 게임 패널은 게임 화면의 `world`를 그대로 넘기면 워커가 필요 없다 (`LivePanel`의 `live.world` 자리).
- 딥링크: `…/encyclopedia/#price-formula`. 게임 창의 도움말 아이콘이 항목 id로 열면 된다. 항목의 `seenIn` 키(map, region, market, resource, pops, workforce, company, finance, alerts, charts)는 창 이름이다. 창 id와 다르면 `SEEN_IN`을 맞춰 달라고 3장에 적어 달라.
- GitHub Pages: `/econ-sim/encyclopedia/`에 함께 올린다 (`pages.yml`).

### 2-49 확인: 일부, sim 대기. 화면 쪽은 완료: 커밋 `d8c480d`, `DemolitionBadge.tsx`, `DemolitionProgress.tsx`, UI_STATUS 2026-11-05 "2-49 철거 표시 완료". 스크린샷 nov5-demolition-en-dark.png·nov5-demolition-ko-light.png. 화면 미검증: 상품 관련 행, 철거 주간 완료까지의 시간 경과. 3항 회수 자재만 UI_CHANGES 에 남았다.

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

### 2-55 확인: 일부. 인구 표 직종 필터 `PopTable.tsx:26`·`:43` (커밋 `c50f91b`), 1좌 가치 `ownershipPortfolio.ts:4`·`:7`, `OwnershipBrowser.tsx:37`, 2-44·2-45 는 UI_DONE. 스크린샷 professions-ko-light.png. 남은 것: `BottomPanel.tsx:31`·`:44` 차트 범례의 자본가 (UI_STATUS 는 완료로 적었지만 이번 대조에서 찾았다). 화면 미검증: 범례 실제 모습.

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

### 2-59 확인: 일부, sim 대기. 화면 쪽은 완료: 커밋 `3cc4704`, 목록 비용 막대 `BuildingCostBar.tsx:6~13`, `sumEcon` `buildingGroups.ts:4`, 주인 표 `GroupDetail.tsx:39`, `BuildingEconomics.tsx:31`, UI_STATUS 2026-11-05 "2-59 화면 잔여 완료". 스크린샷 nov5-cost-bars-ko-light.png·nov5-cost-bars-en-dark.png. 2-59-2 의 행 치수는 그대로 되지 않았다: 기존 24px 소유·수치 막대를 유지했고 (UI_STATUS), 목록 행은 뒤에 2-92 가 요약과 상세 입구로 바꿨다. 화면 미검증: 양수 이익 막대, 배당 정렬 전 기관 조합. 주간 폭포만 UI_CHANGES 에 남았다.

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

### 2-61 확인: 일부. 연구 창 `ResearchPanel.tsx:39`, 옛 `Research` 컴포넌트와 `dailyBudget`·연구 장부 문자열 제거 (커밋 `8a96c26`, grep 0건), `App.tsx:37` 주석. 스크린샷 research-cleanup-ko-light.png. 남은 것: 안 쓰는 `T.adjustFinance` (`strings.ts:357`·`:933`). 원문 화면 1번이 "안 쓰임" 이라고 적은 문자열이다.

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

### 2-62 확인: 일부. 장부 라벨·수수료 표시, 비용 막대 라벨 `BuildingCostBar.tsx:10` (커밋 `3d6e3c3`, `b5d8da5`). 스크린샷 nov5-office-fees-ko-light.png·nov5-office-fees-en-dark.png·cost-fees-ko-light.png. 남은 것: `build` 자세히 보기 라벨 셋 (`FinancePanel.tsx:60`·`:70`, `drill.crownShare`·`drill.feeOther` 키가 없다). 화면 미검증: 양수 실제 수수료, 재정 매출 툴팁 실제 표시, 장부 전 항목.

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

### 2-72 확인: 일부, sim 대기. 1항은 전에 옮겼다. 2항을 줄였다: 옛 0b 수치(그때 `pollTax` 개발값)는 이 원문에만 남는다.

### 2-72. 0b 결과에서 화면이 알아야 할 것: 복지 다이얼, 인두세 부담 (docs/overhaul/0B_RESULTS.md 2.4·2.9·2.10)
- 2026-11-02: 1항(복지 다이얼 잠금)은 끝나 UI_DONE으로 옮겼다. 남은 것은 아래 2항(sim 대기)뿐이다.
2. **인두세에는 플레이어 쪽 부담 상한이 없다 (단위 F의 재료).**
   - 사실: `setTaxLaw`는 기술 해금과 금융가 자산 비율만 본다 (`commands.ts:249~255`). 소득 대비 30% 상한(`pollTaxIncomeCap` 0.3)은 AI 판단에만 있다 (`ai.ts:447~448`). 0b (그때 `pollTax` 0.6, 인두세를 개발용으로 강제)에서 시드 1의 5년차 총생산이 13.6 (대조 101~122), 노동자 세금 ÷ 소득이 0.70~0.97까지 올랐다. 플레이어 왕국은 고정 연구 순서에서 5.7~6.3년차에 인두세를 열었다.
   - 화면이 할 것: 지금은 없다. 단위 F(1차 효과 미리보기)의 "부담률" 줄(05 L-S1: 걷힘 ÷ 세금·복지 전 소득, 직종별)이 이 값을 보인다. 05 C-2 는 `pollTax` 0.1 로 결정됐다 (DECISIONS 7-50). sim 대기: S3 (3장).
   - 화면 쪽에서 미리 계산식을 만들지 않는다 (sim 함수가 생기면 그것을 읽는다).

### 2-82 확인: 일부. 1~4항 `WealthDrift.tsx`, `wealthSummary.ts`, 중복 표 제거 `BuildingPops.tsx:38` 하나만 남음 (커밋 `3312f9a`). 스크린샷 nov5-wealth-drift-ko-light.png·nov5-wealth-drift-en-dark.png·nov5-wealth-total-en-dark.png·drift-single-ko-light.png. 남은 것: 합 행 라벨 `Σ` `WealthDrift.tsx:16`. 화면 미검증: 값이 0 이 아닌 부 변화의 다음 날 화면, 상층 pop 상세.

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

### 2-83 확인: 완료. `QuakeBadge.tsx:6~9`, 소작지 행 `FlowRow.tsx:35`, 지역 머리 `RegionPanel.tsx:88` (커밋 `d36f658`). 스크린샷 quake-head-ko-light.png·quake-head-en-dark.png·quake-flow-en-dark.png. 화면 미검증: 실제 재해 발생·종료 사건의 시간 경과.

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

### 2-88 확인: 완료. `PoliticsPanel.tsx:15~25` (커밋 `b161ee8`), `lawChance` 호출 없음 (grep 0건). 스크린샷 politics-ko-light.png·politics-en-dark.png·politics-expanded-en-dark.png. 화면 미검증: 법 전환 중 `pending`, 모든 기분 조합.

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

### 2-89 확인: 완료. `WelfareCap.tsx:5~6`, 예산 `FinancePanel.tsx:49`·`:50`, 정책 `PolicyPanel.tsx:42`, 복지 내역 줄 `FinancePanel.tsx:42`·`strings.ts:23`·`:599` (커밋 `0fc470c`). 스크린샷 welfare-cap-en-dark.png·welfare-detail-en-dark.png·welfare-detail-ko-light.png·welfare-policy-ko-light.png. 화면 미검증: 실제 주간 지출 확정까지의 시간 경과.

### 2-89. 복지 상한 (wt-welfarefill, DESIGN 9.5, DECISIONS 7-47, 사전 `welfare`, sim 준비됨, 이슈 #9)
- 규칙: 복지는 하루에 지난주 세입의 단계 × 40% ÷ 7 까지만 쓴다 (`TUNE.welfareCap` 기본 2). 넘으면 받는 사람마다 같은 비율로 줄인다.
- sim: `welfareCapDaily(k, step?)` (`packages/sim/src/welfare.ts`, 하루 상한. 끄면 `Infinity`, 첫 주는 0). 주간 값은 × 7. `welfareWeekly(k, law, step)` 은 이미 상한을 넘지 않으므로 미리보기 숫자는 저절로 바뀐다.
- 화면 (라벨·숫자만, 설명 문구 없음):
  1. 정책 창의 복지 줄과 예산 미리보기의 복지 줄에 "상한"/"Cap" 라벨 + 지금 단계의 주간 상한 숫자 (소수 둘째 자리까지).
  2. 단계 1~5 버튼 툴팁에 그 단계의 주간 상한 (`welfareCapDaily(k, step)` × 7).
  3. `Infinity` 면 상한 줄을 숨긴다.
  4. 복지 내역 `drillWelfare`: 상한이 기본 켬이라 지역 줄 합(상한 전 필요액)이 줄 값보다 크게 많고, 그 차이가 '평활 차이' 로 보인다 (`FinancePanel.tsx:38`, 도움말이 이동평균 차이라고 말해 틀린 뜻이 된다). 복지 내역에서는 이 줄 이름을 "상한으로 줄인 몫"/"Cut by cap" 으로 바꾼다.
- 완료 기준: 단계를 바꾸면 상한 숫자가 단계에 비례해 바뀌고, 지난주 복지가 상한을 넘지 않는다.

### 2-90 확인: 화면 코드 고칠 것 없음. 원문이 그렇게 적었고 `Building.nav` 는 `ownershipPortfolio.ts:7` 이 그대로 읽는다. 화면 미검증: 금고보다 큰 평가액의 표시.

### 2-90. 저택 지분 값에 지대 (wt-manornav, DESIGN 9.3, DECISIONS 7-44, 사전 `manor-shares` 항목, 2026-11-05 사용자 결정으로 wt-batch4 에 합침)
- API·타입 변화 없음. `Building.nav` 를 그대로 읽으면 된다. 저택 지분 값이 약 1.1~1.6 높아져 지분 평가액도 그만큼 크게 보인다. 이 평가액에는 현금이 아닌 지대 몫이 들어 있어, 금고보다 클 수 있다. 화면 코드는 고칠 것이 없다.

### 2-91 확인: 완료. 산출 상품마다 한 줄 `SupplyDemand.tsx:20`, 혼합 산출 시험 (커밋 `49e1a63`, UI_STATUS 2026-11-06 "2-92 구현 완료 · 2-91"). 원문의 "고칠 곳" `supplyDemandProjection` 은 고치지 않고 안 쓰게 됐다 (2-92 10번이 대신함, 코드 정리는 UI_CHANGES 2-92). 화면 미검증: 맞춤 재단 방직 공장 실제 화면의 줄 수.

### 2-91. 혼합 방식: 산출이 둘인 방식 (wt-luxmix, DESIGN 혼합 방식, DECISIONS 7-52, 사전 `methods-rule`, sim 준비됨)
- sim: `textile_tailor`·`textile_tailor_steam`·`furniture_luxury`·`furniture_luxury_tools` 는 이제 산출이 둘이다 (`outputs` 에 사치품과 일반품). 방식 id·이름은 그대로라 저장 파일은 그대로 읽힌다.
- 고칠 곳: `supplyDemand.ts:7` `supplyDemandProjection` 은 `mainOutput` 하나만 보여 준다. 산출 상품마다 한 줄로 지금 S/D (`currentSD(w, regionId, g)`) 와 값을 낸다. +1·+5 는 2-92 10번으로 뺀다. `methodSD` (기본가 가중)는 AI 가 보는 값이다.
- 건설 미리보기의 `outputPriceChange` 는 이제 대표 산출(`mainOutput`, 기본가 값이 큰 쪽)의 값이다. 그 전에는 `GOOD_IDS` 순서의 첫 상품이었다. 화면 할 일 없음.
- 그대로 되는 곳 (코드 대조): `CompanyPanel.tsx:65`, `FlowRow.tsx:19`, `MethodComparison.tsx:28`, `ResearchPanel.tsx:27` 는 산출을 상품마다 돈다.
- 완료 기준: 맞춤 재단을 쓰는 방직 공장의 서브윈도우에서 의복과 고급 의복의 S/D 와 값이 줄마다 보인다 (2-92 10번). typecheck.

### 2-92 확인: 일부. 카테고리·정렬 `ConstructionPanel.tsx:36`, 지역 `+건수` `:34`, 카드 땅 구분·잠금·`(22+2)` `:41`, 상세 `ConstructionDetail.tsx:36`·`:41`·`:44`, 대기열 `CompanyPanel.tsx` `Projects` (커밋 `49e1a63`). 최종 검토 항목은 UI_STATUS 2026-11-06 "2-92 최종 검토". 스크린샷 construction-final-ko-light.png·construction-final-en-dark.png·construction-builder-ko-light.png·construction-queue-ko-light.png·construction-private-en-dark.png·construction-region-common-en-dark.png. 9번의 가동률은 2-99 가 대신한다. 남은 것: 안 쓰는 +1·+5 코드, 커밋 안 한 `×22 +2` 표기. 화면 미검증: 모든 기술 전환, 특수 기관 모든 조합.

### 2-92. 건설 창 다시 만들기: 건설 + 건물 관리 합침 (사용자 2026-11-05)

사용자: "방향성은 괜찮긴 한데, 화면 작업자가 최종적으로 검토할 부분을 검토하고 새로 만들어서 합치는 걸로 해". 목업은 그대로 옮기는 대상이 아니다. 화면 작업자가 지금 코드와 규칙(UI_DESIGN)을 보고 다시 설계해서 넣는다. 목업: `docs/mockups/construction-d.dc.html` (숫자는 가짜, 건물 그림 자리는 글자).

사용자가 정한 것:
1. 카테고리: 탭 대신 버튼 하나, ▼ 를 누르면 전체 / 1차 / 가공 / 중공업 / 사치품 / 정부 목록.
2. 못 짓는 건물: 필터 없이 자물쇠. 이유는 호버로 짧게 ("제지술 필요", "철광맥 없음"). `buildBlockers` 를 쓴다.
3. 검색은 뺀다. 정렬은 예상 수익 / 이름 / 회수 기간만 작게.
4. 지역: 고른 지역 오른쪽에 그 지역 공사 수 `+4`.
5. 카드 배경으로 땅 구분: 농지·부지·땅 없음 (지금은 색, 나중에 그림).
6. 건물 이름 뒤 `(22+2)`: 지금 레벨 + 짓는 레벨.
7. 공사 포인트는 서브윈도우에만.
8. 지을 때 방식을 고르지 않는다. 지금 방식대로 지어진다 (`commands.ts build`: 있는 건물이면 그 방식, 처음이면 쓸 수 있는 첫 방식). 방식 바꾸기는 서브윈도우에서 건물 자체의 방식을 바꾸는 것이다 (`setMethod`).
9. 건설과 건물 관리를 합친다: 서브윈도우에 방식, −1 철거, +1/+5, 가동률, 멈춤.
10. 수요 예측(+1/+5 공급÷수요 눈금)은 뺀다. 산출이 둘인 방식이 있으니 산출 물품마다 한 줄씩 지금 공급÷수요와 값을 보인다. 지금 건설 카드의 2-75 미리보기도 이 형태로 바꾼다.
11. 대기열: 왕실·민간을 나누고 왕실은 진행 막대·정지·순서·취소·지역 링크.

화면 작업자가 최종 검토할 것:
- 지역 창 건물 탭(`RegionIndustry`)과 기능이 겹친다. 어디까지 옮기고 지역 창을 무엇만 남길지.
- 왕실 건물과 민간 건물을 서브윈도우에서 어떻게 나눌지 (명령은 왕실 것만).
- 무역소 약정금·유보금, 건축사무소 표시, 학교 자리, 잠긴 방식의 필요 기술 등 목업에 없는 특수 건물.
- 420×560 주 창과 서브윈도우 크기, 여러 창 규칙, 화면 문구 금지, 소수 둘째 자리.
- 한국어·영어 문구, 키보드 접근, 지금 시험 갱신.

### 2-93 확인: 완료. `actualOutput.ts:4`, `ActualOutput.tsx:9~10`, `ConstructionDetail.tsx:36`, `BuildingEconomics.tsx:25`, `CompanyPanel.tsx:256` (커밋 `b6c8c4b`). 사무소는 `officeLoad` 도 곱한다 (UI_STATUS 2026-11-06). 스크린샷 actual-admin-ko-light.png·actual-admin-en-dark.png. 화면 미검증: 정지·원료 0·100% 초과 조합 (자동 시험만).

### 2-93. 실제 가동 (사용자 요청 2026-11-05, wt-ironchain, sim 변경 없음)

건물이 지금 얼마나 돌고 있는지 곱한 값을 한 줄로 보여 준다. 가동률만 보이면 충원·원료·기상으로 멈춘 건물이 100%로 보인다.

- 식: `실제 가동 = (b.active && !b.idle) ? b.utilization × crewOf × 효율 × b.last.inputFill : 0`, 땅 건물은 `× harvestFactor` 를 더 곱한다.
  - `crewOf(b)`, `efficiency(b)` (`@econ/sim` export, `FlowRow.tsx` 가 이미 `crewOf` 를 쓴다).
  - `harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land)`: 공장 부지·땅 없는 건물은 1 을 돌려주므로 모든 건물에 같은 코드로 곱해도 된다.
  - `b.last.inputFill` 은 그날 생산 뒤의 값이다. 원료 없는 방식과 일거리가 없어 쉬는 건물(`b.idle`)은 1, 일꾼이 없으면 0, 꺼진 건물(`!b.active`)은 마지막 값이 남으므로 위 식처럼 먼저 0 으로 거른다 (`CompanyPanel.tsx:57` 과 같다).
- 자리: 건물 창, 건설 서브창의 건물 줄 (2-92 합침 뒤에는 합친 창의 건물 줄).
- 라벨 `실제 가동` / `Actual output rate`. 값은 퍼센트, 소수 둘째 자리까지. 효율이 1 을 넘으면 100% 를 넘을 수 있으니 막대는 잘라도 숫자는 자르지 않는다.
- 툴팁에 곱하는 값을 하나씩 (가동률, 작업 인원, 효율, 원료 충족, 기상 조건). 화면 본문에 설명 문구는 넣지 않는다.
- 건축사무소는 맡은 공사만큼만 돌기도 한다 (`officeLoad`, 8장). 위 식에는 들어 있지 않다. 사무소 줄에서 `officeLoad` 를 곱할지는 화면 작업자가 정한다 (`CompanyPanel.tsx` 가 이미 import 한다).

### 2-94 확인: 완료. `DemandLock.tsx:5~8`, 시장 줄 `MarketWindow.tsx:64`, 상품 상세 `ResourceInspector.tsx:73` (커밋 `1b4b224`). 스크린샷 demand-lock-ko-light.png·demand-detail-ko-light.png·demand-detail-en-dark.png. 화면 미검증: 기록 없음.

### 2-94. 기술로 열리는 수요 (wt-demand, DESIGN 5장, 사전 `needs`, sim 준비됨)

운송·종이·정밀 기기는 왕국이 그 상품을 만들 기술을 연 뒤에야 주민이 산다. 공구는 주민이 사지 않는다. 화면이 고칠 것은 표시뿐이고 컴파일은 깨지지 않는다 (클라이언트는 `NeedId` 를 쓰지 않는다, 합친 뒤 main 에서 다시 확인).

- 잠금: `Region.lockedGoods: GoodId[]` (그 지역 왕국이 아직 못 만드는 수요 상품). 시장 창의 상품 줄과 상품 상세에 잠금 아이콘. 툴팁은 여는 기술 이름 (`goodTechs(g)` → `TECH_BY_ID[x].name`). 본문에 설명 문구는 넣지 않는다. 시장 범위가 지역이면 그 지역의 `lockedGoods`, `kingdom`·`world` 이면 플레이어 왕국 지역의 `lockedGoods` 로 표시한다. `goodTechs(g)` 는 여럿일 수 있어 (운송은 `wagonway`·`steam_rail`) 툴팁에는 이름을 다 적고, 영어 화면은 `nameEn` 을 쓴다.
- 새 필요 둘: `travel` (이동 / Free movement), `fine_instruments` (정밀 기기 / Precision instruments). 화면에는 `NEEDS` 를 읽는 곳이 없어 (`packages/client/src` 검색) 이 항목으로 고칠 것은 없다.
- 가정용품 선택지에 종이가 들어갔다 (`NEEDS` household, 상한 0.5).
- 이름 변경: 상품 `electronics` 는 `정밀 기기 / Precision instruments`, 건물 `fab` 은 `정밀 기기 공장 / Instrument works`, 방식 `machine_steam` 은 `증기 정밀 가공`. id 는 그대로다. 화면 파일에 옛 이름을 적은 곳은 없다 (`기계` 검색, main eeb99e1 기준). 아이콘을 상품 이름으로 고른다면 바꿀 때 본다.
- 종이 공장은 이제 인쇄술이 있어야 짓는다 (`pulp_press.tech = 'printing'`). 건설 목록과 기술 트리는 `canBuildType`·`unlocksOf` 를 읽으므로 저절로 맞다.

## 2026-11-07 2-101 게임 툴팁

### 2-101. 기본 툴팁 없애기 (사용자 2026-11-07, DECISIONS 7-62, sim 변경 없음)
사용자: "기본 툴팁 대신 게임에 맞게 디자인된 툴팁을 사용".

고칠 것:
1. 브라우저 기본 툴팁을 뜨게 하는 `title` 속성을 모두 `data-help` 로 바꾼다 (`TooltipLayer.tsx`). `title=` 이 63곳이다. 바꿀 곳: DOM 까지 내려가 브라우저 툴팁을 띄우는 것. `UIButton` 처럼 DOM 으로 넘기는 컴포넌트를 포함한다. 예: `HarvestBadge.tsx:11`, `OwnerBadge.tsx:13`, `SourceBreakdown.tsx:61`, `App.tsx:168`. 그대로 둘 곳: 창 제목으로만 쓰는 컴포넌트 속성. 예: `<DetailWindow title=...>`, `<Side title=...>`.
2. 아이콘만 있는 단추는 `aria-label` 과 `data-help` 를 함께 단다.
3. 게임 툴팁 모양을 다듬는다. `.game-tooltip` 규칙을 하나로 합치고 (2-96), 색·테두리는 게임 창과 같은 토큰을 쓴다. `data-help` 글의 첫 줄은 제목처럼 굵게, `라벨: 값` 줄은 값을 오른쪽에 맞춘다. `data-help` 는 글자 속성 그대로 둔다.
4. 중첩 툴팁은 쓰지 않는다 (2026-11-06 사용자).

툴팁 안에 표를 넣는 일과 라이브러리(Base UI) 도입은 사용자 결정 대기다. 지금 하지 않는다.

확인: 표 숫자, 아이콘 단추, 긴 설명 툴팁을 띄운 1920×1028 스크린샷을 찍고 파일 이름을 UI_STATUS 에 적는다.

구현·확인: UI_STATUS의 2026-11-07 2-101 기록 참조. 한국어 밝음/영어 어두움에서 표 숫자·아이콘·긴 설명 및 라벨/값 정렬 확인, 타입 검사와 툴팁 시험 2개 통과. 일반 Edge 실환경과 모든 조합은 화면 미검증.


### 2-100. 창 크기 규격 (사용자 2026-11-07, DECISIONS 7-62, sim 변경 없음)
사용자: "지금 서브윈도우가 졸라 큰데 서브윈도우랑 윈도우 크기를 먼저 규격화하고 거기에다가 요소를 맞추셈. 지금 잘 됐다고 생각하는 건 시세 윈도우."

원인: 서브창 토큰이 520×640 (`ui/tokens.css:21`, `ui/tokens.ts:3`)이라 주 창 420×560 보다 크다.

크기 숫자는 에이전트가 정한 첫 값이고 사용자 승인 대기다 (DECISIONS 7-62, 근거 없음). 규격을 토큰으로 만드는 일은 지금 해도 된다. 값은 토큰 한 곳에서만 바꾸게 둔다.

| 창 | 크기 | 쓰는 곳 |
|---|---|---|
| 주 창 | 420×560 | 지금 그대로 |
| 서브창1 | 320×240 | 짧은 내역: 유보 자산 (`ReserveBar.tsx:14`), 건물 지표 (`BuildingMetricBars.tsx:14`), 교육 (`RegionExplorer.tsx:36`) |
| 서브창2 | 360×360 | 표나 그림 하나: 소유 (`OwnershipBar.tsx:35`), 인구 구성·토지·임금 (`RegionExplorer.tsx:32~41`), 재정 자세히 (`FinancePanel.tsx:54`) |
| 서브창3 | 420×420 | 구역이 여럿: 건물 관리 (`ConstructionPanel.tsx:48`, `RegionIndustry.tsx:44`) |
| 서브창4 | 840×560 | 연구 계통도 (`ResearchPanel.tsx:42`) 하나만 |

사용자: "서브창을 몇 개로 나누고, 웬만하면 작은 쪽을 써. 서브창1 서브창2 이런 식으로 네이밍". 위 배정은 코드만 보고 정한 첫 배정이다. 되도록 작은 번호를 쓴다. 내용이 안 들어가면 먼저 줄이고, 그래도 안 되면 한 단계 위로 올린 뒤 UI_STATUS 에 적는다.

고칠 것:
1. 토큰 `--gu-detail-width`·`--gu-detail-height` 를 서브창1~4 토큰으로 바꾸고, `DetailWindow` 에 크기 번호를 받는 속성을 둔다. 기본값은 서브창1 이다. 창 크기 숫자는 토큰에만 둔다.
2. 크기는 고정이다. 플레이어가 크기를 바꾸지 않는다. 서브창에 크기 조절이 남아 있으면 지운다. 위치 이동은 그대로 둔다.
3. 옛 크기 규칙을 지운다: `strategy.css:55`·`:82` (`.strategy-panel` 폭·높이, `.window-finance`, `.window-trends`), `:177` (`.detail-window` 420×460, 최소 크기). 재정·통계 창이 420 이 아닌 폭으로 뜨고 있으면 420 에 맞춘다. 창별 덮어쓰기도 모두 지운다: `strategy.css:193`·`:202`·`:207`·`:218`·`:268`, `system-ui.css:83`·`:119`·`:177` (`.detail-window` 와 `.detail-window:has(...)` 의 폭·높이). 줄 번호는 커밋된 코드 기준이다. 커밋 안 한 작업 트리에서 `.detail-window` 를 찾아 다시 본다.
4. 요소를 창에 맞춘다. 기준은 시세 창(`MarketWindow.tsx`)이다.
   - 맨 위에 범위나 대상을 고르는 줄 하나.
   - 내용은 제목이 있는 구역으로 나눈다 (`SectionStack`).
   - 표는 왼쪽에 아이콘과 이름, 오른쪽에 숫자. 정렬은 표 머리로 한다.
   - 가로 스크롤은 없다. 세로 스크롤만 쓴다. 시세 표의 `table.goods{min-width:440px}` (`strategy.css:64`)가 420 창에서 넘치는지도 본다.
   - 내용이 넘치면 창을 키우지 않고 구역을 접거나 서브창으로 보낸다.
5. 서브창3 에도 안 들어가는 창은 크기를 늘리지 말고 UI_STATUS 에 적고 묻는다.

확인: 위 창을 하나씩 열어 1920×1028 스크린샷을 찍고 파일 이름을 UI_STATUS 에 적는다. 한국어·영어 모두 본다.

구현·확인 (2026-11-08): 서브창1~4 CSS 토큰과 size 속성, 기본 서브창1, 고정 크기·드래그 유지. 주 창 420×560 및 각 배정 크기를 한국어 밝음/영어 어두움 1920×1028 화면 36개에서 확인. 내용 재배치와 가로 넘침 검사, typecheck 및 관련 시험 9개 통과. 상세 근거·스크린샷은 UI_STATUS의 2026-11-08 2-100 참조. 크기 숫자는 여전히 잠정값이며 사용자 승인 완료를 뜻하지 않는다. 일반 Edge·Windows 배율과 모든 상세 상태는 화면 미검증.
