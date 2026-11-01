# UI 현재 상태 — 2026-10-29

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
| 인구/토지/교육/시세 상세 창 | 구현, 주요 동작 확인 | DetailWindow. 독립 탐색 이력은 소유권 창 외에는 미구현 |
| 상세 창 화면 경계 보정 | 구현, 축소 검사 확인 | workspace 실측, ResizeObserver. 1920×1028 및 축소 시 경계/가로 넘침 확인 |
| 소유권 바·소작지 저택 관계 | 구현, 기본 화면 확인 | OwnershipBar. 24px 색상+아이콘, 실제 지역 저택 연결 |
| 소유주→기관→보유 건물 탐색 | 구현, 화면 검증 대기 | OwnershipBrowser. 서브윈도우 독립 뒤로/앞으로 포함 |
| 귀족·투자자 구성 / 작은 지분 | 구현, 계산 테스트 3개 통과 | ownershipPortfolio. 귀족은 배당 가중치, 투자자는 실제 펀드 지분 수. 혼합 지분 시각 검증 남음 |
| 소유 기관 → 개별 팝 → 거주지·고용처 | 구현, 화면 검증 대기 | 귀족·투자자·직원 연결, 소유권 창 이력 유지. 실제 소득 원천 기록 및 상세 UI 추가, 검증 기록은 최신 작업 문서 참고 |
| 지역 건물 그룹 | 부분 구현 | 서비스 합계·워터폴·소유주 미지정 배당 잔여 |
| 2-50 소유 기관 표시 | 주요 경로 구현, 화면 검증 대기 | 공통 OwnerSummary를 지역 그룹·개별 상세·OwnershipBrowser에 적용. 렌더링 회귀 3개 통과. 오래된 상회 화면 추가 감사는 남음 |
| 2-51 공통 투입·산출 | 미완료 | 통합 구현·검증 근거 없음 |
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

