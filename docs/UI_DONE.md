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

