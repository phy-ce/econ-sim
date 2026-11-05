# UI 현재 상태 — 2026-11-02

UI 문서의 시작점. 사용자 최신 요청이 과거 문서보다 우선한다. 상태는 기능 구현과 검증을 구분한다.

## 문서 역할
| 문서 | 용도 |
|---|---|
| UI_CHANGES.md | 현재 우선순위 및 미완료·부분 구현 상세 요구 |
| UI_DONE.md | 날짜·코드 시점별 검증된 변경 보관. 현재 전체 회귀 통과 보증 아님 |
| UI_WINDOWS_2026-10-28.md | 최신 창·밀도·소유권 구현과 검증 기록 |
| log/UI_BUILDING_GROUPS_2026-10-26.md | 지역 건물 그룹 구현·잔여 범위 |
| log/UI_BACKLOG_ARCHIVE_2026-10-28.md | 이전 할 일 목록 원문. 실행 기준 아님 |
| log/UI_FIXED_WINDOWS_2026-10-22.md | 폐기된 고정 창 방식의 과거 기록 |

## 구현 및 확인 상태
| 범위 | 상태 | 근거 / 남은 것 |
|---|---|---|
| 시세 범위 통일 | 세계·왕국·지역 공통 탐색 구현 | 1920×1028 초기 화면에서 범위/상품/기록 대기 확인. 결측 구간 보존. 관련 테스트 9개 통과 |
| 경제 추이 | 월별 9개 지표 구현 | 초기 대기 화면 확인. 장기 데이터 곡선·호버 시각 검증 남음 |
| 연구 창 재설계 | 목록·선택 상세 + 별도 계통도 구현 | 2-68 행 배치 유지. 실제 배치·조작·다크 모드 검증 대기 |
| 드래그 성능 | RAF/transform 및 memo 구현, 실측 대기 | pointermove 상태 변경 제거, 최종 위치 1회 저장. DevTools 전후 기록 미완료 |
| 자유 이동·여러 주 창·주 창별 이력 | 구현, 주요 동작 확인 | WindowWorkspace, GameWindow, NavigationHistory. 팝→건물→뒤로 및 다른 창 독립 확인 |
| 장부형 지역 개요·420×560 상한 | 구현, 한국어 밝은 모드 확인 | RegionExplorer. 일반 브라우저 배율별 검증 남음 |
| 인구/토지/교육/시세 상세 창 | 독립 탐색 이력 구현 | 인구/토지/교육 실제 뒤로 복원 확인. 상세별 검증 범위는 하단 기록 참고 |
| 상세 창 화면 경계 보정 | 구현, 축소 검사 확인 | workspace 실측, ResizeObserver. 1920×1028 및 축소 시 경계/가로 넘침 확인 |
| 소유권 바·소작지 저택 관계 | 구현, 기본 화면 확인 | OwnershipBar. 24px 색상+아이콘, 실제 지역 저택 연결 |
| 소유주→기관→보유 건물 탐색 | 구현, 화면 검증 대기 | OwnershipBrowser. 서브윈도우 독립 뒤로/앞으로 포함 |
| 귀족·투자자 구성 / 작은 지분 | 구현, 계산 테스트 3개 통과 | ownershipPortfolio. 귀족은 배당 가중치, 투자자는 실제 펀드 지분 수. 혼합 지분 시각 검증 남음 |
| 소유 기관 → 개별 팝 → 거주지·고용처 | 구현, 화면 검증 대기 | 귀족·투자자·직원 연결, 소유권 창 이력 유지. 실제 소득 원천 기록 및 상세 UI 추가, 검증 기록은 최신 작업 문서 참고 |
| 지역 건물 그룹 | 클라이언트 코드 완료·sim 일부 대기 | 서비스 합계·일간 폭포·미지정 배당 반영. 주간 폭포 API 대기 |
| 2-50 소유 기관 표시 | 코드 완료 | 공통 OwnerSummary 적용 및 기존 상회 행 잔여 처리. provider 포함 렌더링 회귀3시험 통과 |
| 2-51 공통 투입·산출 | 클라이언트 코드 완료 | FlowRow 공통화. 그룹 화면 확인, 사전 패키지는 범위 밖. 하단 최신 기록 참고 |
| 2-35 왕국 경제 | 코드 완료·주요 화면 확인 | 왕국 선택/비교·합계/자금·건물 장부/추이·왕국 ID 이력. UI_DONE 원문·하단 검증 범위 참고 |
| 나머지 오래된 요청 | 재대조 필요 | 연구/정책/재정/지도/아이콘 등이 모두 미구현인 것은 아님. 코드 감사 전 일괄 완료/미착수 판정 금지 |

## 검증 한계
- 최신 소유권 탐색 추가분: client 타입 검사 및 계산 테스트 통과. 브라우저 도구 연결 오류로 클릭·배치 미검증.
- 2026-10-29 시세 후속 수정 후 루트 전체 타입 검사 통과.
- 과거 budget.test.ts:85 실패 기록은 폐기: 52b37e3에서 시험 삭제·교체, A0_PROBE.md 2장에 9b46c2d 예산 시험 8개 통과 기록. 이번 세션 재실행 결과 아님.
- 영어/다크 모드의 과거 통과 기록은 신규 창과 소유권 탐색 검증으로 승계하지 않는다.
- 소작지별 주간 지대가 기록되지 않아 — 표시. 금융가 직원 인구와 투자 지분 소유자를 혼동하지 않는다.

## 다음 작업
UI_CHANGES 0장 순서를 따른다. 완료 처리 시 구현 근거와 실제 검증 범위를 함께 기록하고, 미검증 추가분을 UI_DONE의 완료 항목으로 옮기지 않는다.


## 2026-11-01 코드 대조 (브라우저 연결 불가로 화면 검증 중단)

아래는 구현 상태이며 브라우저 검증 통과 판정이 아니다. UI_DONE 이동 없음.

| 우선순위 | 상태 | 코드 근거와 잔여 |
|---|---|---|
| 0 / 2-68 연구 트리 | 구현됨, 화면 미검증 | packages/client/src/researchLayout.ts:13 깊이별 행, :18 선행 위치 평균 정렬, :19 가변 폭 배치. views/ResearchPanel.tsx:45 계통도 선택·확대, :50 스크롤·드래그. 영어/다크와 실제 배치 검증 남음 |
| 1 소유권 탐색 | 구현됨, 화면 미검증 | views/OwnershipBrowser.tsx:13 독립 pages/at 이력, :14 이후 기관·팝·지역 이동. 혼합·극소 지분 및 기관 소멸의 실제 조작 검증 남음 |
| 2 다른 서브윈도우 이력 | 부분 | views/PopTable.tsx:17 선택 상태 저장은 있으나 views/DetailWindow.tsx:8 자체 상태에는 탐색 이력이 없음. 모든 상세 창의 독립 이력 완료로 볼 수 없음 |
| 3 / 2-50 기관 표시 | 구현됨, 경로 감사·화면 미검증 | views/OwnerSummary.tsx:6 공통 표시, views/RegionIndustry.tsx:56 그룹, views/BuildingEconomics.tsx:16 개별, views/OwnershipBrowser.tsx:33 기관에 적용 |
| 4 / 2-51 투입·산출 | 부분 | views/ResourceInspector.tsx:38 방식 투입·산출 recipe 존재. 실제 양·단가·금액·판매 및 방식 비교를 합친 공통 UI는 이 경로에 없음 |
| 5 / 2-42·2-59 그룹 | 부분 | views/RegionIndustry.tsx:58 매출·원료·임금·이익 숫자 표시. 워터폴은 이 경로에 없음. 서비스 합계와 미지정 배당은 추가 대조 필요 |
| 6 / 2-49 철거 | 부분 | views/ResourceInspector.tsx:36 대기 레벨 막대, :76 목록 배지 구현. 일정·회수 자재는 이 표시 경로에 없음 |
| 7 전체 화면 감사 | 부분 | views/ResearchPanel.tsx:15, views/PolicyPanel.tsx:12, views/FinancePanel.tsx:16 기존 화면·선택 상태 구현. 세부 요구 전체 충족 여부는 미판정 |
| 8 실사용 환경 검증 | 없음 (이번 세션) | 1920×1080·영어·다크·Edge 배율 검증 수행 못 함 |

실행: git status --short 정상. npm.cmd run typecheck는 PowerShell 권한 오류 없이 시작해 @econ/sim의 tsc --noEmit -p .까지 출력했으나 완료 응답 없음. packages/client에서 npx.cmd vite --port 5199도 도구 호출이 출력 없이 대기. 승인 요청이나 샌드박스 오류 메시지는 표시되지 않음. 타입 검사 통과·서버 준비·브라우저 검증을 주장하지 않는다. 검증 조건 미충족으로 커밋하지 않음.

### 실행 환경 재검증 (2026-11-01)
- require_escalated로 npm.cmd run typecheck 재실행: sim → client → encyclopedia 모두 완료, 종료 코드 0. 앞선 무출력만으로 실행 불가를 단정한 기록은 이 결과로 정정한다.
- packages/client에서 require_escalated로 npx.cmd vite --port 5199 실행: Vite v6.4.4 ready in 562 ms, http://localhost:5199/.
- 브라우저 도구 createBrowserTab 및 listBrowsers 모두 The browser access host is unavailable 반환. 실제 화면·영어·다크 검증 없음. 2-68은 UI_DONE으로 옮기지 않는다.
- 코드 수정 없이 UI 문서만 선택하여 커밋. 기존 클라이언트 미커밋 변경 보존.

### 2026-11-01 이력 후속
DetailWindow 독립 NavigationProvider/버튼, BuildingPops 및 ResourceInspector 선택 상태 이력 연결. 루트 타입 검사와 현재 체크아웃 ownershipPop 회귀 3개 통과, 화면 미검증. 우선순위 2는 부분 완료이며 인구·토지·교육 내부 링크 전환이 남음.


- 2026-11-01 2-69 코드 완료, 화면 미검증. 왕실 Wages는 읽기 전용, 민간 range 유지. 루트 타입 검사 통과. 상세 명세/근거는 UI_DONE으로 이동.


### 2026-11-01 UI_DESIGN 기준 후속
- UI_DESIGN 2.3·3장: 인구·토지·교육 상세 내부 탐색 경로를 DetailExplorer로 연결. 부모 창 이동 대신 상세별 이력 사용. PopTable의 상세 경로 복원 시 초기화 방지. 루트 타입 검사 통과, 화면 미검증.
- UI_DESIGN 10장 어긋남 1~8 확인. 기본 집계·소유권 색 토큰·문자열·빈 목록 문장·폐기 코드 정리는 이 변경에 포함하지 않음. 사전 단위 G와 화면 실측은 기존 대기 유지.


- 2-51: FlowRow를 개별 상세·상회 펼침·건설 방식에 연결, 실제/1레벨 기준 구분. 상회 방식 비교 추가. 사전 패키지 라벨 수정은 허용 범위 밖(막힘: packages/encyclopedia). 화면 미검증. 상회 상품 링크·일부 요약 공통화는 잔여로 추적.


- 2-42·2-59: 그룹 서비스 합계·일간 Waterfall·ownerless 배당 링크 추가. 주간 내역은 sim week API 대기(3장 기존 요청). 화면 미검증.


- 2-49: 다음 철거/전체 완료 일수·레벨 목표·진행 막대·취소 구현 중. 막힘(회수 자재 건물별 귀속): SalvageLot에는 buildingId가 없어 같은 지역/회사 건물 몫을 구분할 수 없음. 기존 3장 요청 유지. 지역 자재를 특정 건물 몫으로 표시하지 않음.


- K(2-70) 코드 완료, 화면 미검증. 루트 typecheck/공개 Vite 빌드 통과, estera-trace 산출물 0건. 다운로드 실사용은 미검증. 2-76을 다음으로 진행.


- 2-76 코드 완료, 화면 미검증. 타입 검사 및 언어 저장/실패 회귀 2개 통과. 다음 C(2-71·2-72) 진행.


- C(2-71·2-72 1항): 코드 완료, 헤드리스 스크린샷 확인(1920×1080). 경로 C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/state-budget.png 및 state-laws.png. typecheck/client 전체 53시험 통과.
- 2-76: 헤드리스 스크린샷 확인(1920×1080). 같은 scratch의 first.png, language-ko.png. 한국어 클릭 저장값 ko·진입 확인. 재실행/영어·밤 추가 확인 예정.


- ownerSummary NavigationProvider 시험 수정 커밋 c5e9e47. client 전체 17파일 53시험 통과 확인. 이후 각 커밋 전에 root typecheck와 client 전체 시험을 실행.
- 2-77 진행: 수요/공급 생성 아이콘 32px·행 38px·배경 대비, 범례/팝 표 24px·최소 막대 6px·보조 글자 11px. 헤드리스 검증 예정.


- 2-77 완료: 헤드리스 스크린샷 확인(1920×1080), scratch market-icons-ko.png / market-icons-en-dark.png. 아이콘 32px, 시세창 가로 넘침 없음, 영어/다크 대비 이미지 확인. typecheck와 client 전체53시험 통과.


- H(2-73) 코드 완료. 헤드리스 스크린샷 확인(1920×1080) construction-fixed.png, 내 지역 활성/외국 잠금/가로 넘침 없음. typecheck/client55시험 통과.


- J(2-74) 완료: typecheck/client55시험 통과. 헤드리스 스크린샷 확인(1920×1080) year-end-reached.png, tick359→360 정확한 정지/도달 칩 확인. 위험 에피소드는 순수 클라이언트 시험 확인, 실제 위험 클릭 화면은 미검증.


- 2-50 잔여 코드 완료, 화면 미검증. 옛 상회 소유 기관 행도 자리/금고 전용. typecheck/client55시험 통과.


- UI_DESIGN 어긋남 1·2·4 정리 중: 팝 기본 1인당, 빈 집단 —, 소유권 바 CSS 토큰과 밤 색 분리. sim 변경 없음.


- 폐기 좌우 고정/격자 코드 제거 중: WindowId overview/industry 제거, 옛 배치 모듈 빈 모듈로 정리(파일 삭제 명령 금지 준수). 시험을 현재 자유 창 3개 동시 표시·경계로 교체.


- UI_DESIGN 문자열 정리 진행: 25개 화면의 한/영 조건 277곳·문구252개와 목록4개를 strings.ts로 이동. 데이터 이름(왕국/산업)은 기존 sim 번역 필드 유지. 언어 선택 버튼은 자국어 고정. exactNumber도 최대 소수2자리로 규칙 통일.


- 2-77 정식 명세 후속 완료: Sprite 계열 명시 size<20 검색0, 기본24, 점10, 막대 채움6+테두리, 9px 글자10. 경제 추이/범례·인구 표 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/icons-trends.png, icons-pop-table.png. 인구 표 아이콘24, 창 scrollWidth418 확인. 시세 한/영·밤 확인은 market-icons-ko.png / market-icons-en-dark.png. typecheck/client48시험 통과.


- 2-51 후속: 실제 관련 건물 양/그룹 단가·금액/상회 상품 링크 구현, typecheck/client48시험 통과. 화면 미검증. 전체 공통 요약 레이아웃 잔여와 허용 범위 밖 packages/encyclopedia 라벨은 미완료로 유지.


### 2026-11-01 중단 복구 후 검증 상태
- 2-77 후속 dbd4b49: 최소크기 검색/타입/클라이언트48시험 통과. 계층 범례 추가 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/icons-class-legend.png. 8개 범례 아이콘24px, 창scrollWidth418. 인구 표 icons-pop-table.png도24px. 단순 Trends 장면에는 계층 범례가 없으므로 범례 근거는 이 파일로 정정.
- 2-51 실제값/링크 후속 9529187. 남은 것은 공통 요약 레이아웃 통일(미완료)과 사전 라벨(범위 밖).
- K/C/H/J·2-50·기본 집계/테마/문구/폐기코드/문자열 커밋 완료. 0장에 완료 상태 반영. 시각 검증 범위는 항목별 기록을 따른다.
- 주간 수지 내역과 개별 철거 자재 귀속은 sim 요청 대기. sim 파일 수정·push 없음.


- 2-51 공통 요약·그룹 흐름 코드 완료. typecheck/client48시험 통과, 헤드리스 flow-group.png(1920×1080) 폭382·넘침없음 확인. 상회 요약 시각검증 및 사전 패키지 라벨은 남음.
- 이전 우선순위 문서 편집이 상세 절의 번호5~9에도 적용된 것을 발견해 f251b54 이전 원문으로 해당 상세 줄만 복구. 이제 완료 표시는 0장 범위에만 적용.


- 흐름 화면 캡처 정정: flow-group.png는 스크롤 아래 흐름이 가려져 있었음. 실제 흐름이 보이는 헤드리스 확인 근거는 C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/flow-group-visible.png(1920×1080).
- 2-68: 헤드리스 스크린샷 확인(1920×1080), 같은 scratch research-tree.png. 영어 밤17노드, 깊이별6/3/2/6 한 행, 가로scrollWidth1230 확인. 모든 노드 선택/툴팁 조작은 별도 미검증.


- 2-78 코드 완료: 원료 officeLoad 반영·사무소/그룹 가동 비율 표시. typecheck/client48시험 통과, CDP 읽기 검증 사무소3개 load0/모든 원료0. 화면 미검증(office-load-check.png는 코드 조회 장면이며 사무소 화면 검증 근거가 아님).


- 서브윈도우 이력: 헤드리스 스크린샷 확인(1920×1080), C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/detail-history-back.png. 인구 구성→소작농 목록→개별 팝→거주지→뒤로 순서 실제 클릭. 목록/선택/거주지 렌더와 뒤로 시 선택 팝 복원 true, 부모 지역 창 앞80자 동일 확인. 토지·교육·앞으로·다른 팝 경로는 아직 별도 검증 필요.


- 서브윈도우 추가 조작: 인구 앞으로 복원true, 토지→지역 건물 목록→뒤로 링 복원true, 교육→지역 건물 목록7링크→뒤로 교육 지표 복원true. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/land-history.png, education-history.png. 부모 Port Belmar 유지. 기관 소멸/극소 지분은 별도 미검증.


- 0장 감사 후속: EconomyCharts 빈 차트/비교 선택 안내 문장은 —로 바꾸고 툴팁에 보존. 정지·도달 사유의 비활성 opacity를1로 보강. root typecheck/client48시험 통과. 변경 후 화면 미검증.


- 소유권 탐색 기본 경로: 헤드리스 스크린샷 확인(1920×1080), C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/ownership-institution.png 및 ownership-history.png. 소작지→저택→벌목장→뒤로 저택→앞으로 벌목장 모두true, 소유권본문 scrollWidth=clientWidth391 확인. 혼합·극소 지분·기관 소멸은 아직 미검증.


- 2-49 그룹 후속: GroupDetail에도 건물id별 DemolitionProgress 연결, 같은 취소 권한 판정·다음/전체 완료 일수·레벨막대 재사용. root typecheck/client48시험 통과. 화면 미검증. 회수 자재 귀속은 기존sim 요청 대기.


- K 실사용 후속: trace=1에서 session/click/window/command/speed 5종, version1·9events 로컬 저장 확인(trace-events.png). 내보내기 Blob 링크는 DOM에 붙여 클릭 후1초 뒤 해제하도록 보강. Edge 헤드리스 내보내기 클릭은 되지만 지정 scratch/downloads 파일 생성은 확인 못함(다운로드 패널 대상이 추가됨). 이를 다운로드 성공으로 판정하지 않음. root typecheck/client48시험 통과.


- 2-26 감사 후속 완료(화면 미검증): RegionCircles 광산 부지 합계를 철/석탄 각각의 사용/발견량으로 분리. 건설 대기도 depositFree와 같은 산식으로 포함, 잠재량은 표시하지 않음. root typecheck/client48시험 통과.


- 2-33 감사 후속: wealthColor를 고정정점2/5/7.5/11의 OKLab 연속 보간으로 교체, 단일 연속 범례·정점 눈금. SOL_STOPS는 같은 정점으로 명시(장기분포에 따른 별도 범위 선택은 미실시). root typecheck/client48시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/wealth-gradient.png. CSS OKLab 지원true,5.99/6/6.01 보간비 연속 변화 확인.


- 2-44 API 대기 해제 후 구현 완료. 왕국/지역 자산 막대·월별 왕국 추이, 조건선 없음. typecheck/client48시험 통과. 헤드리스 1920×1080 assets-kingdoms.png/assets-regions.png 확인. 위치 C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/.


- 2-35 표시 후속: OwnerBadge 민간 본문을 회사명 대신 민간/Private로 통일, 왕국은 색띠·툴팁 유지. root typecheck/client48시험 통과. 화면 미검증. 회사 선택/순위의 왕국 단위 전면전환은 미완료이며 별도 추적.


- 2-35 왕국 요약 합산 부분 완료: 정부·민간 모두 포함, 소유 기관 손익 이중계산 제외, 국고 분리. typecheck/client48시험 통과, 헤드리스 kingdom-summary.png(1920×1080) 확인. 나머지 회사 선택/순위/왕국경제 상세 전환은 남음.


- 왕국 주간 생산 이익은 isGovernment와 소유 기관을 제외하도록 보정. 정부100·소유기관1000·생산2의 profitEma를 둔 회귀에서 주간생산14만 집계 확인. root typecheck/client49시험 통과.


- 2-35 부분 구현: 통계의 회사 6개 선택·순위를 왕국 3개 선택·비교로 합침. 비교의 모든 열 정렬, 행 클릭 → 왕국 경제, 영토 기준 건물 목록(소유 기관 제외), 민간 순자금(cash−debt), 왕실·저택·금융가/미배정 레벨 집계. 최신 2-54 규칙에 따라 폐기된 privateShare/stake를 새로 쓰지 않음. 기존 회사 ID 링크는 소속 왕국으로 연결해 호환 유지.
- 검증: root typecheck 및 client vitest 20파일 50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-comparison-fixed.png, kingdom-comparison-right.png, kingdom-economy.png. 3행, 본문391px/scrollWidth391px, 비교 표790px는 내부 가로 스크롤. 영문 다크 확인; 한국어 및 다른 왕국 전환은 추가 확인 예정.
- 2-35 남음: 공통 합계 타일의 인구·주간 GDP·소유 구성, 민간 자금 세부 내역, 소유 필터·유보 정렬을 갖춘 건물 표, 왕국 추이 차트, 회사 라우팅/미사용 코드 정리. 원문을 UI_DONE으로 전부 옮기지 않음.

- 2-35 합계 타일 추가: KingdomTotals를 요약·왕국 경제에서 함께 사용. 인구, 주간 GDP(연 GDP/360×7), 레벨, 고용/일자리, 주간 생산 이익. 레벨·고용·이익에 현재 소유권 3종/미배정 구성 막대와 소수2자리 툴팁. 소유 기관의 고용만 포함하고 그 수입은 생산 이익에서 제외. 국고 옆 지난주 수지는 정부 lastWeekProfit으로 분리.
- 검증: root typecheck/client20파일50시험 통과. 레벨·고용·이익 구성 합계 일치 회귀 검증 추가. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-totals-en.png, kingdom-totals-ko.png (영/한 다크). 실제 메뉴 KO 버튼으로 전환 확인. 기존 선택·비교 커밋 d54de6b. 2-35 건물 표·차트·돈 세부·라우팅 정리 잔여.

- 2-35 건물 목록 후속: 회사용 House를 왕국 전용 KingdomBuildings로 교체. 왕실/저택/금융가 필터·개수, 건물/지역 검색, 주간 이익·레벨·이름·지역·충원율·유보율 정렬(순서는 주마다 갱신), 소유권·유보 공통 막대, 철거 대기 숫자. 420px 창에서는 각 건물의 장부 필드를 세 줄로 배치해 가로 넘침 없음. 소유 기관 제외, 소작지 포함. 조작은 지역 상세로 이동.
- 링크 검증에서 대상 건물이 아래에 가려진 것을 발견해 RegionIndustry의 요청 건물 상세를 창 안으로 자동 스크롤. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-buildings-ko.png, kingdom-building-open-visible.png. 전체17→금융가2 필터, 무역소 클릭→해당 무역소 상세(top87px) 확인. 본문391/scroll391. root typecheck/client50시험 통과. 합계 타일 커밋61fcba8. 추이·자금 세부·라우팅 정리 잔여.

- 2-35 추이 구현: 기존 월간 KingdomMetrics로 레벨 누적 면적(국가/저택/금융가/미배정), 국고와 민간 현금+소유 기관 금고 2개 선, 연 GDP를 탭 전환. 2-54의 levelsManor/levelsFinance가 이미 있어 별도 sim 변경 불필요. 현재 합계와 달리 기록 레벨은 sim 정의대로 소작지·소유 기관 제외. 투자 풀의 남은 화면 라벨을 저택·금융가 금고, 장부는 자본 유입으로 정정.
- root typecheck/client50시험 통과. 헤드리스 별도 프로필에서 createWorld(42)→step 360일로 만든 실제 기록12개 사용. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-trends-levels.png, kingdom-trends-money.png, kingdom-trends-gdp-fixed.png. 4면/2선/1선, 본문391px·가로 넘침없음. 금액축 왼쪽 잘림을 발견해 이 차트의 축 폭을52px로 보정. 화면 미검증: 다른 왕국 차트 전환, 영문 차트와 라이트 테마.

- 2-35 자금 상자 구현: 공통 KingdomMoney에서 국고/신용 한도·지난주 정부 수지, 민간 순자금·그 안의 유보 자산·저택 금고·금융가 금고를 구분. 유보 자산을 현금에 더하지 않는 근거는 툴팁. 삭제된 regionFunds/옛 투자 대기는 만들지 않고 2-54의 소유 기관 금고로 대체. 플레이어 국고만 클릭→국가 예산, 타 왕국은 조작 없음.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-money-ko.png, kingdom-money-budget.png, kingdom-money-foreign.png. 벨로니아 전환·금고 버튼0·해당 왕국 차트4면 확인. 기존 차트 커밋67e9d8d. 2-35 남음: 회사 라우팅/미사용 코드·문자열 정리와 타왕국·영문·라이트의 추가 화면 검증.

- 2-35 코드 완료: kingdomId 기반 라우팅과 kingdom 섹션으로 전환. 기존 companyId는 이전 이력 호환용으로만 읽고 새 요청은 왕국 ID를 쓴다. 저장된 company 섹션 배치를 kingdom으로 이전. 같은 왕국 링크도 sequence로 섹션 재노출. 사용하지 않는 상회 선택/상세/요약과 전용 문자열 제거, 자원 소유 검색·정렬/지역 개별 링크를 실제 소유 종류로 변경.
- 검증: root typecheck/client20파일50시험 통과. JSX 문장 추가 중 따옴표 오류는 typecheck가 잡았고 고친 뒤 다시 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/kingdom-history.png, kingdom-ko-light.png, kingdom-en-dark-final.png. 비교행→왕국, 두 왕국 간 뒤로/앞으로 선택 복원true, 한글 라이트/영문 다크, 가로 넘침없음. 상품 소유 검색 전체 경우·모든 정렬/차트 툴팁·일반 브라우저 배율은 화면 미검증. 2-35 원문은 2-54 대체 사항과 함께 UI_DONE으로 이동. 차트에 필요한 소유 기록이 이미 있어 옛 네 몫 API 대기는 폐기.

- 2-26·2-28·2-34 코드 대조/주요 화면 확인 완료, 원문 UI_DONE 이동. 광맥 스크린샷 deposits-en-dark.png(철0/160, 석탄2/90, 잠재량 비노출), 음수 금고 negative-treasury-en-dark.png(검증용 cash10000/debt20000, 상단·예산·왕국 모두 −ƒ10k/동일 neg색), 도크 dock-toggle-check.png(false→true→false, 지도·최소화 없음). 모두 C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/, 헤드리스 스크린샷 확인(1920×1080). root typecheck/client50시험 통과.
- 2-33 분포 대조: 실제 seed42·360일 세계의 지역 평균 부1.14~1.27, 생활수준1.07~1.24(소수2자리). 두 분포 범위는 유사하므로 현재 SOL_STOPS=WEALTH_STOPS를 유지. 이 조건에서는 고정된 첫 정점2 아래에 모두 몰린다. 부 정점은 사용자 고정값(2/5/7.5/11)이므로 임의 변경하지 않는다. 가운데 두 정점에 분포시키라는 옛 요구와 충돌하는 범위 재선택은 막힘(사용자/화면 설계 결정 필요). 보간 자체는 기존 78611c1 구현·스크린샷 확인, 일반화하지 않음.

- 2-30 완료/2-60 부분 보완: 예산 현재값+회색 → 예상값(묶음/줄/머리·바닥 순수지), 실제 국가 창 닫힘을 FinancePanel까지 전달해 상세 동반 닫기, 인건비 그림24px·레벨·인원/자리·직종 산식·단계 배율, 법/세율 칩, 관세 상대 왕국 번역. 오래된 미사용 장부 문자열 제거. 2-30 원문 UI_DONE 이동, 2-60은 상세 잔여가 있어 유지.
- root typecheck/client50시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/budget-preview-arrows.png, budget-staff-formula.png, budget-detail-parent-close.png. 3단계 선택 유지하며5단계 포커스 → 예상값6개, blur →0개. 부모 닫기 뒤 상세0, 재개방 뒤에도0. 본문391/scroll391·상세431/scroll431·그림24px. 현재 영어 다크 확인, 신규 한국어/라이트는 화면 미검증.
- 2-60 남음: 일부 머리 칩/세법 비교 막대·복지 세부 필드·빈 상태와 모든 상세 탭/정렬/이동 조합 감사. 이전 지도/금고/도크 감사 커밋 ecbbec0.

- 2-60 코드 완료. 세법 비교3막대/현행 강조, 복지 대상·목표 소득·미적용 대시, 주조/이자/공사 세부, 상품·왕국별 정렬/색상/합계/평균 보정, 빈 금액, 없는 국영 사업 숨김. 직종별 장부는 인원/자리·하루·주간 수치이며 산식은 툴팁. 구형 전역 wageIndex 대신 실제 jobsBy 지수를 사용. 비용 저장 부호에 맞춰 매출−원료−임금 산식 수정. 비율 소수2자리(일 이자0.03%) 보존. 원문 UI_DONE 이동.
- root typecheck/client21파일52시험 통과: 국영 사업 있음/없음 회귀2개 추가. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/budget-tax-comparison.png, budget-welfare-ko-light.png, budget-mint-formula.png, budget-empty-goods.png, budget-tariffs-ko-light.png, budget-interest-rate-ko.png, budget-jobs-final-ko.png, budget-jobs-final-en-dark.png. 본문431/scroll431, 그림24px. 자료 없는 물자 표0, 복지 제외4행—, 왕국2행 정렬반전, 새 컨텍스트 오류0 확인. 모든 단계 변경/복지 적용/유자료 물자 탭·일반 배율은 화면 미검증으로 유지.

- 2-31 표시 감사 완료, UI_DONE 이동. API hasReserve/reserve/reserveCap/reserveWeek 공통 연결, 채움만0~100% 제한·실제 수치 유지, 민간 유보를 현금에 중복 합산하지 않음. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/reserve-detail-en-dark.png. ƒ200.3k/ƒ224k·89%, 주간+ƒ14.2k, 본문338/scroll338. 상한초과·0·누락의 실제 장면은 화면 미검증(코드 대조만), 한국어 라이트 유보 상세도 미검증. 코드8606391의 root typecheck/client52시험 통과를 사용한 문서 감사이며 새 코드 수정 없음.

- 2-37 완료: farmer 라이트/다크 토큰#677b2f/#a8be62(--sheet 대비4.37/7.85:1), 임시 fallback 제거. 옛 하층 합계에 농부 포함, 하층 실업률을 노동자+농부 노동 인구 가중 집계로 수정. 현재 개요의 해당 옛 지표는 숨김 상태라 계산은 시험 근거이며 시각 확인으로 주장하지 않음.
- root typecheck/client21파일55시험 통과. 가중 집계2시험·과거 임시 별칭8쌍의 고유 셀1시험 추가. 읽기 전용 icons/list.ts:72고유 그림·누락/별칭 없음. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/farmer-en-dark.png, farmer-ko-light.png. 농부35.7k/24px·다크rgb168,190,98/라이트rgb103,123,47, 본문418/scroll418. 실제 취업 이동·전 경로는 화면 미검증. 원문 UI_DONE 이동.

- 2-36·2-39 완료: 종이/종이 공장과 옛 별칭8쌍 모두 별도 셀, icons/list.ts 72고유 그림. 지역 가격 기록의 결측0 대체를 marketPriceHistory로 통일(결측 키 생략·실제0 보존). root typecheck/client55시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/paper-market-ko-light.png, paper-mill-ko-light.png. 종이ƒ2.28/생산2곳·종이 공장 실제 상세709/일, 본문418/scroll418. 원본 buildings-b.webp도 이미지 확인. 과거 저장 결측 재생·새 종이 영문다크·전 아이콘 쌍 시각 비교는 미검증. 원문 UI_DONE 이동. 농부 커밋169f97b.

## 2026-11-02 정책·연구 연결 및 전환 상태 보완
- 2-45·2-56 부분 완료: 법의 기술 링크가 연구 창에서 해당 기술을 선택한다. 잠긴 기술도 필터를 전체로 바꿔 표시하며 연구 시작 명령은 보내지 않는다. 같은 기술 재요청도 sequence로 반영한다.
- 전환 중 다른 법 시행 차단. 조건 미달이면 진행 막대와 현재/필요 비율을 빨강으로 표시하고, 비율은 소수 둘째 자리까지. 실패 시점은 틱 대신 게임 날짜로 표시한다.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-tech-selected-ko.png, policy-pending-invalid-ko.png. 잠긴 증기 철도 선택·현재 연구 불변, 검증용 투자법 전환의 8%/15%·150일·다른 시행 버튼 disabled, 본문418/scroll418. 검증용 세계는 원래 저장 상태로 복원. 새로고침 런타임 오류0.
- 잔여: 법별 실제 세율 툴팁, 투자 직종 아이콘 및 완료/실패 소식의 모든 경로. 이번 수정의 영문·다크 및 전환 완료 자체는 화면 미검증. 따라서 2-45·2-56 전체 원문은 UI_CHANGES에 유지한다.
- 검증: 루트 npm.cmd run typecheck 통과, 클라이언트 vitest 21파일56시험 통과.
- 631751f: 정책·연구 링크 및 전환 상태 수정 커밋. 다음 2-54 민영화 가격 툴팁·허용 대상 보완 착수.
- 코드 완료: BuildingEconomics의 민영화 허용 기준을 sellsShares로 통일해 무역소·정부/자동 건물 제외. privatizePrice의 레벨당 매각 가격·연간 이익을 정확한 소수2자리 툴팁으로 표시, KO/EN 라벨 추가. 미사용 privateEquity 문자열 제거. 소유 몫·금고·장부 라벨은 앞선 완료 기록 참조.
- 검증: 루트 typecheck 통과, 클라이언트22파일59시험 통과(가격 한/영 및 무역소 조작 제외 회귀 포함). 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/privatization-price-ko-tooltip.png. 별도 프로필 검증용 왕실 벌목장8레벨, 가격ƒ186,233.21/레벨·연간 이익−ƒ164,784.26/레벨 툴팁 확인. 검증용 저장은 복원. 실제 매각 진행·영문/다크 화면은 화면 미검증.
- 2ec3fe9: 2-54 민영화 가격·대상 수정 커밋. 이어서 2-45 실제 세율·조건 툴팁 보완.

- 2-45 세율·조건 툴팁 보완 완료: 모든 세법 선택지의 taxRates(k, law)를 현재 예산 단계 기준으로 표시(정액은 1인/일, 소득세는 %). 조건 미달 툴팁에 financeRatio/threshold, 전환 중에는 목표 법 라벨 추가. 루트 typecheck 및 클라이언트23파일61시험 통과(예산5단계 KO/EN 회귀 포함).
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-tax-quotes-ko.png. 토지세ƒ0.02/인·일 툴팁, 인두세ƒ0.6/인·일·소득세30%는 DOM 대조. 본문418/scroll418。영문·다크 화면 및 다른 법 툴팁 실표시는 화면 미검증. 투자 직종 아이콘과 전환 완료/실패 소식 전 경로는 잔여.
- 5beb5c0: 실제 세율 툴팁 커밋. 2-29 대조에서 실제 상세가 Workforce 대신 OwnerSummary를 쓰므로 하급 귀족 배당 표식을 OwnerSummary에도 추가 중.
- 코드 완료: Workforce는 이미 paysShare를 사용. 실제 소유 기관 상세/그룹에서 쓰는 OwnerSummary에도 동일 기준의 배당 표식을 추가해 하급·상급 귀족 모두 표시. 현재 sim slots에 따라 자리 수를 읽으며 옛 고정100/100을 화면에 박지 않는다.
- 루트 typecheck/클라이언트23파일62시험 통과. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/manor-gentry-share-ko.png. 동부 삼림 저택23레벨·하급2.3k/상급433 및 배당 아이콘2개, 본문418/scroll418. 영문·다크 상세 및 실제 몫 지급은 화면 미검증.
- 코드 대조 완료: 옛 CompanyView는 8d66c52에서 제거. 현재 KingdomMoney.tsx의 creditLimit은 d.government에만 사용하고 민간 카드에는 현금·유보·저택·금융가 금고만 표시. FinancePanel.tsx:42와 상단 칩은 플레이어 왕실 금고/신용 한도. 민간에 대출 조작이나 대출 한도 행 없음. packages/client/src에서 World.bank 사용 없음.
- 이 항목은 코드 대조만 수행해 추가 화면 미검증. 앞선 왕국 자금 카드 스크린샷은 그때 확인 범위로 유지한다. 직전 검증 루트 typecheck/클라이언트23파일62시험 통과(코드 변경 없음). 하급 귀족 표식 커밋 cceaa08.

## 2026-11-02 2-45·2-56 정책 표시 후속
- 투자법 상세에 INVEST_CLASSES의 대상 직종24px 아이콘 추가. KO 라이트 최대6직종, 본문418/scroll418. 잠금 표식은 lucide Lock으로 통일. 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/policy-invest-classes-ko.png.
- eventDestination.ts:3에서 lawChanged/lawFailed 둘 다 국가 창 법 탭으로 이동하며 App·GameWindow·Notifications가 같은 함수를 사용함을 코드 대조. 실제 전환 완료/실패 사건 클릭, 영문/다크 새 아이콘은 화면 미검증. 2-45 원문은 잔여 검증 범위를 보존해 유지.
- 최신 main 병합 후 루트 typecheck와 클라이언트23파일62시험 통과. 다음 사용자 최신 우선순위 2-81 진행. 민간 대출 감사 커밋39906cd.
- 코드 완료: 방식 비교 estimateMethod에 wagesAt(owner,typeId,world,regionId) 사용. 임금 요약은 Company.wages의 소수2자리 평균, 왕국 지역의 시장 임금 최소/최대(표시값이 같으면 하나), 왕국 pop만의 실업률. 국가 임금은 평균 라벨, 결측은 —. 왕실 슬라이더 없음. 머리 영역은 두 열 전체 폭.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/wages-region-summary-ko.png, wages-region-summary-en-dark.png. 최신 sim createWorld(42)→step14일 실제 값: 노동자 평균ƒ3.31/지역ƒ3.30~ƒ3.31, 본문418/scroll418·슬라이더0. 방식 비교 선택지의 실제 클릭·옛 저장 첫날 결측의 모든 경로는 화면 미검증. 검증용 세계는 별도 Edge 프로필에만 저장, 원래 저장은 estera-ui-before-regional-wage-check로 백업(2-79 검증 후 복원 예정).
- 외국 임금999.12와 대규모 외국 실업 인구가 왕국 표에 섞이지 않고, 평균4.56789→4.57·실업25%·읽기 전용을 확인하는 KO/EN 회귀 추가.
- 2-81 최종 검증: 루트 npm.cmd run typecheck 통과, 클라이언트24파일64시험 통과. 정책 아이콘 커밋d47e766.
- 9d61d99: 2-81 커밋. 2-80 준비된 marketWage 식 및 2-84 선택 사항인 AI 국영 웃돈 배율 표시 진행.

## 2026-11-02 2-80·2-84 국영 임금 계산 표시
- 코드 완료: BudgetJobs는 marketWage가 있으면 시장 임금 × 단계만 표시하고, AI 국영 premium이 있으면 ×(1+웃돈) 추가. 지역 값이 없는 wageMarket0/옛 자료는 기본 임금 × 임금 지수 × 단계 식 유지. 화면 숫자는 소수2자리, 원래 계산값 불변.
- 헤드리스 스크린샷 확인(1920×1080): C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/state-wage-regional-en-dark.png. 동부 삼림 행정청 하급 귀족700명, 1인ƒ4.00·Market wage4×Stage1. 직접 API 대조 perHead3.997182848716258/Region.stateWages4 → 표시값4.00 동일. AI 웃돈 및 지역 임금0 세계는 SSR 회귀만, 화면 미검증.
- 클라이언트25파일66시험 통과(지역/웃돈식·옛 계산식 호환 포함). 루트 typecheck 통과. 이전 2-81 커밋9d61d99.
- e152f49: 2-80·2-84 커밋. 2-79 지역 임금 표 구현 착수(소작 소득 export 준비됨).

## 2026-11-05 main 0acc1a2 재개 · 2-79 완료
- sim 변경 대조: 저택 지분 기본 켬, 지역 임금 단일 규칙·목표 임금 API, AI 국영 웃돈, 이익집단 읽기 계층, 싼 곡물 추가 소비/인구 증가 반영 확인. 이전 화면 검증을 최신 sim 검증으로 간주하지 않고 다시 실행.
- 지역 개요에 임금 상세 추가: 직종7개·시장/52주 평균/국영/실업 표, 소작 1인 소득은 주간 갱신, 결측 —. 국영 값은 실제 Region.stateWages를 읽고 툴팁에 시장 임금×단계 및 존재하는 AI 웃돈 배율 표시. 왕실 조작 없음.
- 검증: 루트 npm.cmd run typecheck 통과, 클라이언트26파일69시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-wages-ko-light.png, nov5-wages-en-dark.png. 최신 sim seed42·14일, 소작ƒ2.77/노동자ƒ3.17·52주ƒ3.42/하급 귀족 실업75%, 상세 본문403/scroll403. 표 하단은 내부 스크롤. AI 양수 웃돈 툴팁은 코드 대조만(해당 조건 화면 미검증).
- 미완료 문서 이동은 하지 않고 이번부터 UI_STATUS만 갱신(사용자 최신 지시). 다음 깨진 화면/2-87 저택 지분 목록.
- 39938d4: 2-79 커밋. 이어받은 지도 경계·강 연장·회색 협곡 연결 끝점 및 build-map의 경로 앵커 검사를 확인. build-map 재생성: 7지역/9이웃쌍/49,395bytes 통과. 1920×1028 스크린샷 C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-map-1920x1028.png 확인. 직전 루트 typecheck·클라이언트69시험 통과. 지도 전체 확대/모든 레이어는 미검증. UI_WINDOWS 문서는 수정 범위 밖이라 유지.

## 2026-11-05 2-87 저택 지분 완료
- manorShares 기본1에서 저택 주인 목록을 p.fund 지분 수로 집계(실업/다른 지역 보유자 포함). 0이면 옛 자리×계층 가중치 유지. 저택 머리에 지분 합·nav·지분당 주간 배당·주간 수익률, 상급 귀족 자리 라벨. pop 상세는 저택과 금융가를 함께 보유 수/총 보유 가치로 표시하며 외국 왕국 이름 표시.
- ownerSummary 첫 시험은 임시 manorShares0 우회를 제거하고 기본 지분 규칙에서 상급 자리만 남는지 검사. 지분/자리 분리·옛 규칙 호환·외국 저택 가치 회귀 추가. 루트 typecheck 및 클라이언트26파일71시험 통과.
- 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-manor-shares-ko.png, nov5-manor-owners-ko.png, nov5-manor-owners-en-dark.png, nov5-pop-manor-holdings-ko.png, nov5-pop-manor-holdings-en-dark.png. 저택1050 지분 합14,728,392.96(직접 fund 합 대조), 하급 귀족 보유자7행, pop1070의 저택·금융가14기관. 본문403/scroll403. 극소 지분0 대신 <0.01, 숫자 소수2자리. 실제 배당 지급/지분 매매 시간 경과는 미검증.
- 이전 지도 커밋c0afa5c. 다음 2-85 건물/그룹 일꾼 1인 임금·웃돈.

## 2026-11-05 2-85 일꾼 1인 임금·웃돈 완료
- Workforce에 world 전달, 건물/그룹 공통 WorkforceWage 사용. 실제 wagesAt 임금·정부 단계/웃돈 식, 중립 +% 칩(0.5% 이상), 배당 자리 —, 소작지 주간 소득. 그룹은 고용 가중 평균과 툴팁 최저~최고(고용0이면 자리 가중). 4열 격자는 해당 줄에만 적용.
- 루트 typecheck 및 클라이언트27파일73시험 통과. AI 웃돈 실제 임금10/그룹 가중 평균17.5·배당 자리 제외 회귀 포함.
- 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-workforce-group-en-dark.png, nov5-workforce-single-en-dark.png, nov5-workforce-single-ko-light.png. 별도 검증용 벌목장1013 노동자웃돈25%·기술자10%, wagesAt 노동자3.8548143→ƒ3.85, 그룹/개별 동일, 본문403/scroll403. 검증용 웃돈 저장 복원 후 런타임 오류0. AI 국영 웃돈/소작지 화면은 미검증(코드 대조).
- 2-87 커밋c204774. 다음 2-75 공급÷수요, 2-82 부 이동, 2-86 목표 임금.

## 2026-11-05 2-75 공급÷수요 완료
- 건설 카드 기본 선택 가능 방식의 주 산출을 기준으로 지금/+1/+5를 sim currentSD/projectedSD에서 읽음(지역 산출 보정 포함). 0.25~4 로그 막대·0.5/1/2 눈금, 지금 채운 점/+1빈 원/+5빈 마름모, aiGlutSD 문턱 툴팁. 서비스 건물은 줄 없음. 증설+/+5 툴팁은 현재→예상 비율.
- 시장 양 열을 비율+작은 로그 막대로 교체. 지역은 currentSD, 합산 범위는 합산 공급÷수요. 수요0은 —, 정렬은 비율이며 결측은 뒤. 비율의 크기에 좋음/나쁨 색 없음.
- 루트 typecheck·클라이언트28파일76시험 통과(지역 보정·수요0·서비스·로그 위치 회귀). 1920×1028 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-sd-build-ko-light.png, nov5-sd-build-en-dark.png, nov5-sd-market-ko-light.png, nov5-sd-market-en-dark.png. 남부 습지 목재 지금0.28/+1 0.81/+5 2.91, sim 직접 호출0.2791536/0.8060579/2.9136748와 일치. 본문403/scroll403. 시장 내림차순2.13/2.03/1.15…/— 확인. 실제 짓기 실행과 전 상품/전 범위 조합은 미검증.
- 2-85 커밋e70704e. 다음 2-82 부 이동→2-86 목표 임금→0장 잔여.

## 2026-11-05 2-82 부 이동 완료
- pop별 wealthDrivers를 합쳐 소득·현물·저축 몫·합계·현재/다음 생활비 표시, 주간 부 변화는 인구 가중 평균. 돈은 기존 1인당/합계 토글을 따르고 부 변화와 저축/생활비 주 수는 나누지 않음. 상층/중층 저축 몫 —, 식 툴팁은 TUNE 버퍼/기간을 읽음. 부 이동 상세는 기본 닫힘.
- 루트 typecheck·클라이언트29파일78시험 통과. 집계·인구 가중·세계 불변·1인당/합계·상층 제외 회귀 포함.
- 1920×1028 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-wealth-drift-en-dark.png, nov5-wealth-total-en-dark.png, nov5-wealth-drift-ko-light.png. pop1069 소득/인0.06·현물/인0.63·합0.69·생활비0.66/다음0.90·저축0.5주, 총액 전환70.5k/772k/842.6k. 본문403/scroll403. 복제 세계 하루 진행 전 예측 주간0/실제0 대조. 비영 부 변화의 실제 다음 날 화면·상층 상세 화면은 미검증(집계/제외는 시험).
- 2-75 커밋a4d3489. 다음 2-86 목표 임금.

## 2026-11-05 2-86 목표 임금 완료
- 지역 임금 창에서 marketWageTargets를 주간 키로 조회, 시장 값은 매일 읽음. ±0.5% 밖에서 중립 lucide 위/아래14px 화살표, 목표/아래끝/위끝/자리/오려는 사람은 임금 숫자 툴팁. 반환 null이면 목표 정보 없음. 기존 다섯 열 안에서 시장 칸만 넓힘.
- 루트 typecheck·클라이언트30파일79시험 통과. 방향 경계·무표시 구간 회귀 포함.
- 1920×1028 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-wage-target-ko-light.png, nov5-wage-target-en-dark.png. 동부 삼림 노동자 시장3.17/목표3.04/아래3.04/위6.09/자리8.1k/오려는52.7k, 직접 API target3.044533609와 일치. 복제 세계 다음 날 시장3.173261066→3.160388320 하락으로 아래 화살표 일치. 본문403/scroll403. 주간 경계 갱신의 장기 화면 및 전 직종 다음 날 대조는 미검증.
- 2-82 커밋7723ec9. 사용자 지정 선행 작업2-79/2-87/2-85/2-75/2-82/2-86 완료, 다음 0장5번 2-51 방식 비교 잔여부터.

## 2026-11-05 2-51 잔여 완료
- select/방식별 흐름 목록을 현재 방식 첫 열의 비교 표로 교체. 투입·산출·일자리·서비스·일간 손익·매출 기준 이익률, 다른 방식의 차이 칩·경험−50%·잠금 기술 툴팁. 열 머리 클릭으로 setMethod. 좁은 창은 표 안 가로 스크롤만 사용(본문403/scroll403). 건설 카드의 좁은 FlowRow 목록은 명세의 대체 배치 유지.
- FlowRow 툴팁에 efficiencyParts 구성과 기상 배율, 레시피 숫자 소수2자리. 미사용 Bag/bag 및 optProfit/optOffice/optNeedsTech 문자열 정리.
- 루트 typecheck·클라이언트31파일80시험 통과. 1920×1028 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-method-comparison-ko-light.png, nov5-method-comparison-en-dark.png, nov5-method-header-click-ko.png. 건축사무소20레벨/3방식/차이17칩, 별도 해금 검증에서 build_manual→build_scaffold 머리 클릭 및 경험1→0.5 확인. 검증용 저장 복원. 흐름 툴팁 효율1.2/경험1/규모1.2/특성1/인력0.41/기상1 대조. 다른 건물 전 방식 조합은 미검증.
- 2-86 커밋ec66794. 사용자 추가 제보 '지도 확대 시 이상'을 다음 깨진 화면으로 먼저 재현/수정한 뒤 0장6번(2-59) 진행.

## 2026-11-05 지도 오른쪽 직선 경계·확대 수정
- 오른쪽 연장 지형의 수평 경계를 완만한 지형 윤곽으로 수정. 지역 선은 수작업 지름길 대신 실제 공유 변에서 생성해 채움과 일치시킴. 원본 그림은 육지/호수 영역으로 잘라 직사각형 바다 배경 가장자리 제거. 지역7개·이웃9쌍 유지, build-map 검사 통과(43,829bytes).
- 휠 확대 중심을 SVG 좌표로 변환한 마우스 위치에 고정. 같은 지점의 100→200% 화면 이동428.08px→0.80px, 200→300% 0.15px(좌표 반올림 포함). 버튼은 중앙 확대, 100~300% 제한/초기화 유지.
- 루트 npm.cmd run typecheck·클라이언트32파일82시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-map-right-final-ko-light.png, nov5-map-right-final-en-dark.png, nov5-map-final-zoom200-ko-light.png, nov5-map-final-zoom300-ko-light.png. 오른쪽 경계와 300% 해안 확인. 전 영역 드래그/모든 지도 레이어 조합은 미검증.
- 2-51 커밋2cc182d. 다음 0장6번 2-59 잔여.

## 2026-11-05 2-59 화면 잔여 완료 · 주간 폭포 막힘
- 목록에 6px 원료/임금/양수 이익 SegBar, 적자 끝 띠, 정확한 일간 매출·비용·이익률 툴팁. 정부 건물/매출0은 생략. 기존24px 소유/수치 바 배치는 유지. 주간 레벨당 이익·실제 배당 정렬 추가(주간 순서 갱신).
- 유보 툴팁 RESERVE_SHARE35%, 개별/그룹 주인 배당 툴팁 KEEP_SHARE20%/30%. 상세 충원은 buildingEcon.staffing, 그룹은 일자리 가중 평균(고용÷자리와 다른 평활 값 보존); 회귀에서0.77 확인.
- 루트 typecheck·클라이언트32파일82시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-cost-bars-ko-light.png, nov5-cost-bars-en-dark.png. 동부 삼림 비용 막대4개 높이6px, 본문403/scroll403. 벌목장 매출22,021.14/원료1,078.55/임금25,740.51/손익−4,797.92 직접 API와 일치. 양수 이익 막대 및 배당 정렬 전 기관 조합은 화면 미검증.
- 막힘: BuildingEcon.week 미제공으로 주간 폭포는 기존 sim 요청 유지, 하루 값을 주간으로 바꾸지 않음. 지도 수정 커밋ebac485. 다음2-42 상세 자원·대기열.

## 2026-11-05 2-42 잔여 완료
- 공통 BuildingRoom으로 개별/그룹 상세에 종류별 땅·광맥 여유 숫자(landFree/depositFree, 공사 예약 포함). 왕국 대기열 각 회사 머리에 전체 건수/MAX_CONCURRENT_CONSTRUCTIONS(40), 행 지역 링크는 해당 지역 건물 탭을 연다. 미사용 myHouse/expandTen 양 언어 문자열 제거.
- 루트 typecheck·클라이언트32파일82시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-room-ko-light.png, nov5-room-en-dark.png, nov5-queue-link-ko-light.png, nov5-queue-en-dark.png. 동부 삼림 산림 여유384.00=landFree384, 본문403/scroll403. 복제 세계 공사1건에서1/40·지역 링크 클릭→지역 창 건물 탭 확인, 검증 저장 복원. 광산 광맥 줄과 상한40건 화면은 미검증(동일 공통 함수/상수 코드 대조).
- 2-59 커밋3cc4704. 다음2-32 보유 주간 이익·배당 표.

## 2026-11-05 2-32 보유 주간 손익·배당 완료
- OwnerHoldings 공통 표: 주간 이익×보유 몫 내림차순, 실제 건물 owners/ownerless 지급액, 보유 레벨·이익·배당 합계. 관계는 건물 이름 아래로 옮겨420px 안 네 열. 소작지별 지대 기록은 없어 배당 —. OwnerSummary 머리는 하루 수입 대신 profitEma×7 받은 돈/주, 계산 툴팁. BuildingEconomics의 이른 return 뒤 죽은 보유 표 제거.
- 루트 typecheck·클라이언트33파일83시험 통과. 지분20%의 주간 이익140·실제 배당37.25를 별개로 확인하고 순서/합계 회귀 추가.
- 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-holdings-ko-light.png, nov5-holdings-en-dark.png. 저택1050 보유4행·710레벨·주간 합−92.2k·실제 배당0, 본문403/scroll403. 좁은 표의 비율 숫자는 본문 글꼴로 가독성 보정. 기관 수입60.3k/주는 표의 보유 손익 합과 다른 배당·지대 수입임. 혼합 지역/양수 실제 배당 화면은 미검증(37.25 회귀로 지급액 경로 검증).
- 2-42 커밋b39fb8c. 다음2-67 무역소·무역 흐름.

## 2026-11-05 2-67 무역소·교역 표시 완료
- 무역소 개별 상세 postUsable, 방식 비교/건설 방식의 tradeReserveOf, 공사비와 별도 tradeEscrowPerLevel 약정금(레벨당·환급 툴팁). 빈 상품 흐름 —. 지역 시장 전용 교역 항목에 Region.trade.buy/cut 두 막대·기대 이익률(총 주문0이면 —). 전역/왕국 수치를 임의 합산하지 않음.
- SectionStack 항목이 범위 전환으로 늘 때 기존 설정에 새 항목을 덧붙이도록 수정(세계→지역 전환 때 교역 탭 누락 해소).
- 루트 typecheck·클라이언트33파일83시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-trade-en-dark.png, nov5-trade-ko-light.png, nov5-post-usable-ko-light.png. 복제 교역값buy1234.56/cut432.10/margin0.125, 막대74%/26%·높이8px/표시13% 확인. 실제 무역소1003 postUsable3443.8442→3.4k, 상한5000·약정금/L2500 API 대조. 검증 저장 복원. 건설 약정금 실제 납부/환급 및 영문 무역소 상세는 화면 미검증(표시 코드는 반영).
- 2-32 커밋90a9826. 다음2-48 연구 진행·경로·링크.

## 2026-11-05 2-48 연구 트리 잔여 완료
- 노드 비용·남은 주·양수 진행 막대, 선택/hover/focus 기술의 모든 선행 경로 강조. 툴팁에 methodMarginAtBase·직종별 자리·투입→산출 레벨당 하루 수치. 법 해금 줄은 국가 법 탭으로 연결.
- 휠 마우스 위치 확대50~150%, +/−·0맞춤, research-view 배율/스크롤 저장·복원. 처음 열 때 현재 연구 중앙. 진행 막대는 축소 배율에서도 약6px(53%에서 실측5.99px 반올림).
- 루트 typecheck·클라이언트33파일84시험 통과(갈라진 선행 경로 합집합 회귀 포함). 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-research-ko-light.png, nov5-research-en-dark.png, nov5-research-path-ko.png, nov5-research-view-restored.png. 검증 세계 괴철로4500pt/진행2250/주20→113주·50%, 증기기관 선행 선5개, 휠110%·0맞춤53%·닫기/재열기53%/스크롤0 복원·법 링크→국가 법 탭 확인. 연구 상세 본문943/scroll943. 검증 저장 복원. 끝까지 실제 연구 완료/모든 노드 툴팁 실표시는 미검증.
- 2-67 커밋494714b. 다음2-49 철거 아이콘.

## 2026-11-05 2-49 철거 표시 완료 · 회수 자재 막힘
- 지역 종류 행/상품 관련 건물 행에 demolish 그림24px + 대기 레벨 배지. 지도에는 지역의 철거 대기 레벨 합계, 확대해도 이름표와 같은 고정 표시 크기. 설명 문장 없이 숫자/그림, 정확한 철거 라벨 툴팁.
- 루트 typecheck·클라이언트33파일84시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-demolition-en-dark.png, nov5-demolition-ko-light.png. 별도 검증 세계 벌목장2/농장3→지도5, 목록 아이콘 실제24px. 검증 저장 복원. 상품 관련 행 및 철거 주간 완료까지의 시간 경과는 미검증.
- 막힘: SalvageLot.buildingId 미제공으로 건물별 회수 자재는 기존 sim 요청 유지. 연구 커밋0acd2a5. 다음2-62 공사 수수료 라벨/계산 툴팁.

## 2026-11-05 2-62 공사 수수료 잔여 완료
- ledgerLabels.buildFees·장부 툴팁을 모든 공사의 공사 수수료로 정정, 폐기 budgetLines.fees 제거. 건축사무소 개별/그룹 매출·폭포 라벨을 공사 수수료로, day.fee·officeMargin 계산 툴팁 추가. 재정 국영 사업 상세 매출에도 방식 이익률 식. 사무소 매출 양수면 목록 비용 막대 표시(정부 일반 예외와 분리).
- 루트 typecheck·클라이언트33파일84시험 통과. 1920×1028 헤드리스 스크린샷 확인: C:/Users/phyju/AppData/Local/Temp/estera-ui-cdp/nov5-office-fees-ko-light.png, nov5-office-fees-en-dark.png. 수수료0/기본 방식20% 식 확인. 영문 긴 폭포 라벨은100px 칸으로 막대 겹침 해소. 양수 실제 수수료·재정 매출 툴팁 실제 표시·장부 전 항목은 화면 미검증(상수/필드 경로 코드 대조).
- 철거 커밋d8c480d. 다음2-64 건설 카드 산업 유형.
