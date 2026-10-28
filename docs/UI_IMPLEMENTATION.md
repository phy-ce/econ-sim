# UI 시스템 반영 — 2026-10-18

> 과거 시점의 구현·검증 기록입니다. 최신 구현 전체의 검증 완료를 뜻하지 않습니다. 현재 상태와 우선순위는 [UI_STATUS](UI_STATUS.md), [UI_CHANGES](UI_CHANGES.md) 참조.

`docs/UI_CHANGES.md`를 현재 sim 코드와 대조해 client에 반영했다. sim 로직은 수정하지 않았다.

- OwnerBadge: 왕관/가방, 왕국 색 띠, 플레이어 별과 외곽선. 지역 건물, 자원 건물 목록/상세, 회사 제목, 순위, 알림에 적용.
- 지도에 왕실/민간 건물 레벨 지분 막대 추가.
- 민간 자본가/귀족 임금 비교를 배당으로 변경. 민간 연구는 왕실 공유 기술 및 왕실의 알려진 기술 목록 사용.
- 소작지 인력은 peasantSlots/landlordJobs와 tenants/employed 값을 사용한다. 자동 생성 소작지는 건설 목록 및 조작에서 제외.
- 왕실 대기열에 같은 왕국 민간 공사를 원래 순서로 포함. 민간 공사 취소 버튼은 표시하지 않는다. 새 공사 한도는 자기 회사 공사 수로 판정.
- 상단 세금 징수율, 행정청 세금 역량, 왕국 투자 풀/연 GDP 추가.
- 지도/지역에 인구 가중 생활수준 추가. 계층에는 부와 생활수준을 분리. HistoryPoint.sol 그래프 제목도 생활수준으로 교정.
- 항구 폐쇄 표시. 저장 키 v6 사용 (v5 저장은 삭제하지 않으며 자동으로 불러오지 않음).
- 새 스프라이트는 생성하지 않음. 행정청의 기존 school 임시 그림 유지.

## sim export 요청
`PORTS_OPEN`은 market.ts에 있지만 public index.ts에서 export하지 않는다. 현재 UI는 systemMetrics.ts에 false를 명시했다. sim 담당자가 public export를 추가하면 해당 상수를 import로 교체할 것. peasantSlots는 이미 export되어 사용 중이다.

## 숫자 재설계 문서
NUMBERS_SPEC.md의 재설계 값은 현재 data.ts와 다르다. UI는 문서 숫자를 하드코딩하지 않고 실제 method/level/state에서 값을 읽는다.

## 검증
루트 typecheck, client 테스트 6개, Vite 빌드. 1920×1080 한국어 밝은 모드/영어 다크 모드에서 배당, 공유 기술, 소작지 2개 직종, 행정청 역량, 생활수준, 왕국 재정 확인.
