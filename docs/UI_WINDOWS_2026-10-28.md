# UI 진행 기록 — 2026-10-28

이 기록은 이번 창·밀도·소유권 작업의 범위다. UI_CHANGES 전체 완료를 뜻하지 않는다.

## 최신 사용자 기준
- 1920×1028을 시각 테스트 기준으로 사용한다. 모니터/브라우저 외곽 해상도와 CSS viewport는 서로 다를 수 있다. 실제 이동 범위는 상단 바와 하단 메뉴를 제외한 workspace 실측 영역이다.
- 고정 좌우 슬롯 대신 자유 이동 창. 주 창별 화면 탐색 및 뒤로/앞으로 이력은 분리한다.
- 기본 창은 420×560 CSS px 상한이며 실제 workspace가 작으면 축소한다. 글씨 일괄 축소보다 장부·서브윈도우·툴팁으로 밀도를 높인다.

## 반영
- WindowWorkspace: 여러 주 창 동시 표시, 제목 드래그, 앞 창 활성화, 닫았다 열 때 세션 내 위치와 화면 유지.
- GameWindow / NavigationHistory: 주 창별 화면 경로 및 탐색 이력. 팝 상세→근무 건물→뒤로 이동이 다른 창을 변경하지 않음.
- RegionExplorer: 장부형 지역 개요. 인구 구성·토지 소유·교육을 DetailWindow로 분리.
- MarketWindow: 지역별 상품 가격·추이를 DetailWindow로 분리.
- DetailWindow: 비모달 상세 창, 드래그/크기 조절/Escape 닫기/닫을 때 트리거 포커스 복원. ResizeObserver로 workspace와 상세 창 크기를 관찰하고 크기 변경 후 경계 안으로 위치 보정. 상단 바·하단 메뉴를 이동 경계에서 제외.
- OwnershipBar: 지역 개요·지역 건물 목록·개별 건물 경제 상세에 24px 소유권 바. 왕실(왕관/적색), 저택(집/황갈색), 금융가(기관/청색). 클릭하면 소유주 소재지·식별번호·보유 레벨 비중·지난주 배당 표.
- 소작지: levelOwnersOf가 빈 배열이라는 이유로 소유주 없음으로 표시하던 오류 수정. payRent와 동일하게 해당 지역의 저택을 찾아 소유·지대 관계 표시. 실제 저택이 없으면 회색. 일반 투자 지분과의 차이는 표 머리글 툴팁에 설명.
- 소작지별 지난주 지대는 별도 기록이 없어 0을 꾸며 표시하지 않고 — 및 툴팁 제공.
- 인구 구성 행의 부/생활수준/식량 상세와 소유권 설명은 툴팁으로 이동.

## 검증
- 루트 npm run typecheck: sim/client/encyclopedia 모두 통과.
- npm run test:core: 37 통과, 1 실패. test/core/budget.test.ts:85 국영 임금 단계 미리보기의 건축사무소 수수료 반영 오차: 0.38255196078431364, 허용 <0.2. 이번 작업은 client만 변경했고 sim 원인은 조사하지 않음. 화폐 보존·결정성 검사는 통과.
- 브라우저 1920×1028에서 소작지 소유권 바/상세 실제 열기 확인: 벨마르 항 저택 #1042, 442L / 100%, 지대 —.
- 상세 창을 연 상태에서 1280×721로 시험 크기를 줄인 후 DOM 보고 1280×722: workspace 경계 내 유지, 상세 본문 가로 넘침 없음.
- 개발 서버 http://127.0.0.1:5199/ 재실행.

## 남은 범위 / 제한
- 소유권 서브윈도우는 독립 탐색 이력과 기관·보유 건물 링크를 구현했다. **그 추가분의 브라우저 검증은 아직 미완료**다.
- 다른 상세 창으로 독립 이력을 확장하는 작업은 미구현.
- 귀족·투자자 구성은 아래 추가 구현에 포함. 혼합/극소 지분, 소멸한 기관, 영문/다크 모드의 시각 검증은 남음.
- 소유 기관 표시(2-50)의 전 경로 정리, 공통 투입·산출(2-51)은 완료 처리하지 않음.
- 일반 Edge 최대화/Windows 배율별 실측 검증은 별도 필요.

## 추가 구현: 소유권 상세 탐색
- OwnershipBrowser: 소유주 표의 저택·금융가 링크 → 동일 서브윈도우의 기관 상세 → 보유 건물 상세 → 소유 기관으로 탐색. 이 서브윈도우 안에서 독립 뒤로/앞으로 제공. 다른 종류의 DetailWindow에는 이력 확장을 아직 적용하지 않았다.
- 저택·금융가 자체의 소유권 표에서도 구성 보기 링크 제공.
- holdingsOf 기반 보유 지역·건물·레벨·비율. 소작지는 지대 관계로 구별.
- 저택 귀족: 해당 저택 근무 팝의 인구 × shareWeight 비중. 금융가 투자자: 실제 Pop.fund의 해당 기관 지분 수 비중(직원 인구와 구별). 팝별 지역·계층·인구·식별번호 표시.
- 기관 상세에서 금고와 주간 수입/이익 표시. 소멸한 건물은 안내 후 뒤로 이동 가능.
- 종류별 범례를 별도로 추가. 막대 실제 비율은 유지하고 작은 지분은 표/범례에서 소수 둘째 자리, 0.01% 미만 양수는 <0.01%로 표시.
- 검증: client typecheck 통과, ownershipPortfolio.test.ts 3개 통과(극소 지분, 금융가 지분과 직원 구별, 저택 근무 팝·가중치).
- 이번 추가분 브라우저 클릭/혼합 지분 시각 검증 미완료: 브라우저 제어 도구의 browser.user unavailable 연결 오류. 이전 시각 검증과 혼동하지 않는다.
- 현재 잔여 범위는 위의 남은 범위와 UI_STATUS에 통합했다.


## 소유 기관 화면 정리 (2-50)
- 공통 OwnerSummary: 저택은 직종별 귀족 자리, 금융가는 직원 충원. slots/employed 기준 인원과 자리 수. 금고는 cash 합, 수입/일은 마지막 하루 last.revenue 합(배당·지대 수입). 인구 전체/투자 지분 비중과 구분.
- 지역 건물 그룹의 목록·필터 상세, BuildingEconomics/BuildingInspector, OwnershipBrowser 기관 상세에 같은 요약 적용.
- 저택·금융가 개별 상세의 생산 레시피와 중복 충원 지표 제거. 그룹의 가동률·원료비·생산 손익 요약을 소유 기관 요약으로 대체. 일반 생산 건물은 유지.
- GroupDetail의 중복 직종 인력 펼침은 소유 기관에서 제외. BuildingControls는 기존 자동 건물 차단으로 가동률 손잡이를 제공하지 않음.
- client typecheck 통과. ownerSummary.test.tsx 3개 통과(저택/금융가 지표 제거와 금고·충원·수입, 일반 생산 건물 지표 유지). SSR 검사에서는 기존 DetailWindow useLayoutEffect 경고 발생; 브라우저 동작 검증을 대신하지 않음.
- 브라우저 연결 오류(browser.user unavailable)로 이번 배치·클릭 검증 미완료. 오래된 상회 전용 경로에 같은 표시가 필요한지는 별도 감사. 이 절 전체를 UI_DONE으로 이동하지 않음.

## 소유 기관 → 팝 탐색 (2026-10-28)
- OwnershipBrowser의 귀족·투자자 행을 개별 팝 링크로 전환. 금융가 직원은 실제 work ID로 별도 집계하며 부양가족 포함 툴팁을 표시.
- 동일 소유권 서브윈도우에서 팝 → 거주지의 건물 목록 → 건물로 이동. 기존 창별 뒤로/앞으로 스택에 팝·지역 경로도 포함하며 다른 창에 영향을 주지 않음.
- 팝 ID로 BuildingPops 통계를 제한: 생활수준, 세후 현금 소득, 소비, 저축, 충족률, 현물. 이동·병합된 팝은 대체 집계를 하지 않고 소멸 안내.
- lastIncome은 finance.ts에서 세금을 차감한 합계이므로 세후 현금 소득으로 명칭 수정.
- 미완료: 팝별 임금·배당·지대·세금 금액은 sim에 기록이 없어 — 및 툴팁 처리. 실제 금액을 제공하려면 sim의 일별 소득 원천 기록 API가 필요. 추정값으로 대체하지 않음.
- 브라우저 재연결은 browser.user is unavailable 오류로 실제 클릭 및 1920×1028 배치 미검증.

- 검증 결과: 전체 npm run typecheck 통과. 소유권 계산·기관 표시·팝 목적지 렌더링 9개 테스트 통과(실제 클릭 이력 테스트는 아님). 핵심 테스트 37 통과/1 실패: 기존 budget.test.ts:85 오차 0.38255 < 0.2 실패 재현. 화폐 보존·결정성 통과. SSR useLayoutEffect 경고는 기존 DetailWindow에서 발생.

## 팝 실제 소득 원천 기록 (2026-10-28 후속)
- Pop.incomeBreakdown 선택 필드 추가: wages/dividends/rent/sales/welfare/other/tax. 실제 지급·차감 시점에 관찰값만 누적. 기존 돈 이동, 소득 계산, AI 판단은 변경하지 않음.
- 매일 lastIncome 초기화와 함께 초기화. 금융가 성과급은 wages, 누적 금고 환급은 other, 소작 판매는 sales. 세금은 양수 지출로 표시.
- 기존 lastIncome과 동일하게 팝 ID의 수령 실적을 기록. 인구 이동 시 이전 팝의 과거 수령 기록은 옮기지 않음. 소멸한 팝은 기존 삭제 정책을 따름. 세계 전체 누적 장부로 사용하면 안 됨.
- JSON 저장에 포함. 이전 저장에 필드가 없으면 —와 다음 하루 진행 안내 표시. 주간 지급은 지급일 실적이며 하루 평균으로 나누지 않음.
- BuildingPops에서 집단/1인당 전환과 함께 실제 내역 표시. 앞선 '소득 원천 API 미구현' 상태를 대체함.

- 검증: 전체 타입 검사 통과. UI 관련 9개 테스트 통과. 핵심 테스트 39 통과/1 실패(기존 budget.test.ts:85 동일 오차). 새 소득 테스트는 시드42 28일의 팝별 세전 항목 합계−세금=lastIncome, 주간 배당·지대 발생, JSON 복원 후 동일 결과, 다음 날 초기화를 확인. 화폐 보존·결정성 통과. 브라우저 실제 배치 검증은 미완료.

## 창 드래그 렌더링 최적화 (2026-10-28)
- WindowWorkspace pointermove는 React setState 없이 ref의 마지막 좌표만 갱신. requestAnimationFrame당 transform translate 1회. pointerup에서 최신 좌표를 flush한 뒤 setPositions 1회. cancel/lostcapture 중복 완료 차단, unmount RAF 취소, 임시 will-change 정리.
- 기존 20px 방향키 이동 및 workspace 경계 clamp 유지. 최신 경계는 ref로 참조. 다른 포인터는 무시.
- GameWindow/RegionWindow/RegionPanel/MarketWindow/PopTable/BottomPanel memo. 탐색 Context value와 useNavigationState setter를 안정화하고 GameWindow 경로 콜백, 지역/시세 부모 콜백을 useCallback으로 고정. useGame 반환값을 useMemo로 고정하여 창 focus만 바뀌는 App 렌더에서 game props가 변하지 않게 함.
- Worker 스냅샷 보류는 아직 추가하지 않음: 실제 성능 기록으로 필요성이 확인되지 않음. 실제 world 변경은 정상 반영.
- DevTools Performance 전후 기록 미완료. IAB browser.user is unavailable. 일반 브라우저 복구 시 게임이 아닌 개인 페이지가 발견되어 자동 승인 검토가 접근 거절. 개인 페이지를 더 읽지 않음. 프레임 시간 수치/컴포넌트 렌더 횟수를 실측했다고 주장하지 않음.
- 재측정: 동일 seed/속도/배율 및 1920×1028 브라우저 조건, 인구·건물 창 각각 동일 경로 5초 드래그. Performance에서 scripting/rendering/frame duration 비교하고 React Profiler에서 pointermove로 인한 표 commit 유무 확인. 방향키·모서리·capture loss·Worker 갱신 중 드래그 검사.

- 검증 결과: client 타입 검사 통과. windowDrag 4개 + 팝 상세 3개 테스트 통과. 100개 포인터 샘플 → 예약 RAF 1회, 이동 중 commit 0회, 종료 commit 1회 및 경계·취소 확인. 이는 컨트롤러 단위 검증이며 실제 브라우저 프레임 시간 측정은 아님. 게임 전용 Edge 탭 생성도 Browser is not available: edge로 실패.
