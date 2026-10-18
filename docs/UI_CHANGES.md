# UI 수정 요청 (sim 변경 반영 + 소유 구분)

이 문서는 `packages/sim` 게임 로직이 바뀐 내용과, 그에 맞춰 `packages/client` 화면을 어떻게 고쳐야 하는지 정리한 것이다.

## 공통 규칙
- 화면에 설명 문구를 넣지 않는다. 아이콘, 색, 숫자, 짧은 이름만 쓴다. 툴팁은 써도 된다.
- 한국어와 영어 UI를 모두 지원한다. 문자열은 `strings.ts`의 `T`와 `lang` 방식을 따른다.
- `packages/sim`은 고치지 않는다. 필요한 export가 없으면 이 문서의 "sim 쪽 필요 사항"에 적힌 대로 요청만 한다.
- 다크 모드(`:root[data-theme="dark"]`)에서도 구분이 되어야 한다.
- 검증
  - 루트에서 `npm run typecheck`가 통과해야 한다.
  - 개발 서버는 `cd packages/client && npx vite --port 5199`로 띄운다.

---

## 1. 바뀐 시스템 요약

### 1-1. 회사 구조: 왕국마다 왕실 + 민간
- 왕국은 3개이고, 왕국마다 회사가 2개 있다.

| 왕국 | 왕실 (`Company.state = true`) | 민간 (`state = false`) |
|---|---|---|
| 에스테라 | 에스테라 왕실 `#e11d48` (플레이어) | 에스테라 민간 `#f59e0b` |
| 벨로니아 | 벨로니아 왕실 `#3b82f6` | 벨로니아 민간 `#60a5fa` |
| 카르텐 | 카르텐 왕실 `#10b981` | 카르텐 민간 `#34d399` |

- **민간**은 그 왕국 팝들의 투자를 대표한다.
  - 팝은 생활비 10일분이 넘는 현금을 조금씩 왕국 투자 풀(`Kingdom.investmentPool`)에 넣는다.
  - 풀은 매주 민간 회사의 자금이 된다.
- 민간은 **연구를 하지 않는다.** 그 왕국 왕실이 아는 기술을 함께 쓴다.
- 민간은 **건축사무소가 없다.** 왕실의 건축사무소가 민간 공사도 맡고, 민간은 공사비를 왕실에 낸다.
- **행정청**(`admin`)은 왕실만 지을 수 있다(`BuildingTypeDef.stateOnly`).

### 1-2. 소유주 = 일자리 (Victoria 3 방식)
- 별도의 "소유주" 개념은 없어졌다. `Building.owners`와 `Building.ownerFill`이 삭제됐다.
- 자본가(`capitalist`)와 귀족(`aristocrat`)도 생산 방식마다 정해진 **일자리**다.
  - `SKILLS` = `unskilled`, `skilled`, `expert`, `capitalist`, `aristocrat` (5개)
  - `Building.employed`와 `Company.wages`, `Company.wageOffset`도 5개 키를 가진다.
- 받는 돈은 건물 소유에 따라 다르다.
  - **민간 건물**: 자본가와 귀족 자리는 임금 대신 **배당**(건물 이익의 몫)을 받는다.
  - **왕실 건물**: 모든 자리가 임금을 받는다.
  - 판정 함수: `paysDividend(building.stateOwned, skill)`
- **소작지**(`subsistence`)
  - 그 왕국 **민간 소유**다(이번에 변경).
  - 일자리는 소작농과 지주(귀족)다. 지주 자리 수는 `landlordJobs(b)`, 소작농 자리 수는 `peasantSlots(b)`로 구한다.

### 1-3. 세금: 행정청 역량만큼만 걷힌다
- 법인세는 없어졌다. 세금은 소득세뿐이다(`Kingdom.incomeTax`, 계층별 세율).
- 실제로 걷히는 비율은 `min(1, Kingdom.taxCapacity / Kingdom.taxDue)`다.
  - 역량은 행정청 레벨, 가동률, 인원에서 나온다.
  - 그래서 처음에는 세금이 덜 걷히고, 행정청을 지을수록 늘어난다.
- 걷힌 세금은 행정청 건물의 수입(`last.revenue`)으로 잡힌다.

### 1-4. 돈의 공급: 주조와 국채
- 매주 화폐를 새로 찍어 국고에 넣는다(주조).
- 왕실이 빌리는 돈은 새로 발행되고, 갚는 돈과 이자는 소멸한다.
  - 왕실의 대출 한도는 기본 한도 + 왕국 GDP의 25%다(`creditLimit`).
- 국고가 필요 금액의 4배를 넘으면 넘는 몫을 팝에게 복지로 나눠 준다.
- 장부: `World.mint` = `{ minted, issued, retired, interest, burned }`

### 1-5. 항구 폐쇄
- `PORTS_OPEN = false`(`packages/sim/src/market.ts`)다. 해외 수출입이 없다.
- `Region.spaceport`는 그대로 남아 있다.

### 1-6. 부와 생활수준 분리 (빅토리아3 방식)
- **부**(`wealth`, 1~99)는 구매력 단계다. 소득과 생활비로만 오르내린다.
- **생활수준**(`sol`)은 `부 × 필요 충족률`이고, 최소 1이다. 물건이 시장에 없으면 생활수준만 떨어진다.
  - `Household.sol`, `HistoryPoint.sol`(`colonySol`), `popSol(p)`
- 시작 부는 시작 소득으로 감당할 수 있는 단계로 계산한다.
- **화면 수정:** 지도와 지역 패널의 "1인당 부"(`regionAvgWealth`)와 별도로, 생활수준(`households[*].sol`의 인구 가중 평균)을 보여 준다. 계층 표에는 부와 생활수준을 나란히 둔다.

### 1-7. 속도 조정
- 기술 비용은 4배, 건물 건설 포인트는 5배가 됐다. 20년쯤 지나야 경제가 다 발전한다.
- 연구와 공사 진행 바는 지금보다 훨씬 느리게 찬다.

---

## 2. 화면별 수정 사항

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
       - 지출(손익에 포함): `wages` 임금, `inputs` 원자재, `research` 연구, `interest` 이자, `welfare` 복지
       - 손익 밖(자본 흐름): `dividends` 배당 지급, `investment` 투자 풀 유입, `buildPaid` 민간이 낸 공사비
       - 합계: 손익 = `lastWeekProfit`. 수입 합계 − 지출 합계와 같다.
       - 소득세 옆에 징수율(`taxCapacity / taxDue`)을 표시한다.
     - 계층별 소득세율(`Kingdom.incomeTax`): 지금은 표시만 한다. 조정 명령이 생기면 여기에 붙인다.
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
- 실업 pop은 예산 편성의 복지 몫(2-12)을 매주 나눠 받는다. 국고 장부의 `welfare` 항목에 합쳐진다.
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
2-12와 2-19의 예산 편성(항목별 금액, 연구·교육·복지·건설)은 없어졌다. 이 절이 그 둘을 대신한다.
- 금액 편성이 없다. 왕실 정부 건물(행정청·건축사무소·학교)은 늘 100% 가동하고 임금과 원료를 국고에서 낸다. 국고가 모자라면 국채로 낸다.
- 정책 손잡이는 세 개다. `Kingdom.budget` = `{ tax, wages, research }`, 각각 정수 1~5(3이 보통). `BUDGET_ITEMS` = `['tax', 'wages', 'research']`, 단계 수는 `BUDGET_STEPS`(5).
  - 바꾸기: `{ type: 'setBudget', item: 'tax' | 'wages' | 'research', value: 1~5 }`
  - 이름: 세금 수준 / Tax level, 국영 임금 / Government wages, 연구비 / Research
  - 단계 이름: 매우 낮음 / 낮음 / 보통 / 높음 / 매우 높음 (Very low / Low / Normal / High / Very high)
  - 세금 수준: 지금 세법의 모든 세율 × 0.6 / 0.8 / 1 / 1.2 / 1.4 (`TUNE.taxLevels`)
  - 국영 임금: 기본 임금 × 임금 지수(`Kingdom.wageIndex`) × 0.7 / 0.85 / 1 / 1.15 / 1.3 (`TUNE.govWageLevels`). 바꾸면 왕실 임금(`me.wages`)이 바로 바뀐다.
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
- 정부 건물 가동률: 왕실 정부 건물에는 `setUtilization`이 오류를 돌려준다. 건물 패널의 가동률 조절을 숨기거나 막는다.
- 학교: `MethodDef.grant`(보조금 배율)가 없어졌다. 학교는 왕실만 짓는다(`stateOnly`)는 점에서 행정청과 같고, 민간 지분도 붙지 않는다(2-15에서 학교 제외).
  - `ResourceInspector.tsx`의 "교육 서비스" 표시는 `method.seats` 기준으로 바꿔 두었다.
- 지표(`KingdomMetrics`): `education`·`welfare`가 없어지고 `feesWeek`, `govSpendWeek`(정부 건물 임금 + 원료), `interest`, `policy`(세 단계), `wageIndex`, `debt`가 생겼다. 화면은 아직 이 지표를 쓰지 않는다.

---

## 3. sim 쪽 필요 사항 (Claude가 처리할 것, UI 작업자는 요청만)
- 지금 `packages/sim/src/index.ts`가 export하지 않아서 UI가 쓰려면 추가가 필요한 것
  - `PORTS_OPEN` (market.ts)
  - `taxCapacity` (finance.ts). `Kingdom.taxCapacity`와 `taxDue` 필드는 이미 매주 채워지므로 필드만 읽어도 된다.
  - `peasantSlots` (economy.ts 쪽 export 여부 확인)
- 이미 export되는 것: `paysDividend`, `landlordJobs`, `kingdomGdp`, `kingdomById`, `builderOf`, `companyById`
