# cssv: CSS 정리 검사 도구 (UI-20)

화면이 바뀌지 않는 CSS 정리를 확인한다. 저장소 루트에서 실행한다. Chrome 이 `C:/Program Files/Google/Chrome/Application/chrome.exe` 에 있어야 한다.

1. 기준: 바꾸기 전 화면을 띄운 개발 서버로 잰다.
   `CSSV_URL=http://localhost:5199/ CSSV_OUT=.tmp/cssv/base node tools/cssv/cdp.mjs tools/cssv/verify.mjs`
2. 바꾼 뒤: 바꾼 코드를 띄운 서버로 잰다 (`CSSV_OUT=.tmp/cssv/after`).
3. 비교: `python tools/cssv/compare.py .tmp/cssv/base .tmp/cssv/after`. 다른 상태가 0 이면 통과다.

`verify.mjs` 는 시드를 고정하고(새 게임 4242) 화면 상태(2026-11-21 기준 60개, 처음 74개)(한국어 밝음·영어 어두움, 주 창 6개, 서브창 1~4, 탭·구역, 툴팁)를 연다. 화면에 그려진 모든 요소의 위치·크기와 계산된 스타일 전체(속성 이름순, 공백 접음, `--` 변수는 뺀다: 변수 글만 바뀌는 정리를 다르게 세지 않게, 2026-11-21 UI-21)의 해시를 남기고 스크린샷을 찍는다. `compare.py` 는 요소별 값과 픽셀을 비교한다.

알려진 것: 개발 서버를 켠 직후 첫 실행은 다르게 나온 적이 있다 (2026-11-18). 다르면 한 번 더 잰다.

정리 스크립트:
- `deadrules.mjs`: Codex 화면 조사(`.tmp/css-runtime-data.json`)에서 한 번도 맞지 않았고, 클래스 이름이 코드 어디에도 없는 규칙을 찾는다.
- `dupdecl.mjs`: 같은 선택자·같은 조건의 뒤 규칙이 늘 덮어쓰는 선언을 찾는다. 초안 페이지도 쓰는 공용 파일은 같은 파일 안에서만 지운다.
- `neverwin.mjs`: 화면에서 이긴 선언을 잰 결과로, 맞는 요소는 있었지만 어느 요소에서도 이기지 못한 선언을 찾는다 (UI-20 4단계).
   측정: `CSSV_WINS=1 CSSV_URL=.. CSSV_OUT=.tmp/cssv/wins node tools/cssv/cdp.mjs tools/cssv/verify.mjs` (위와 같은 상태, 2026-11-21 기준 60개, `wins.json`).
   목록: `CSSV_WINS_IN=.tmp/cssv/wins/wins.json [CSSV_APPLY=1] node tools/cssv/cdp.mjs tools/cssv/neverwin.mjs`.
   지키는 것: 공용 파일은 건드리지 않는다. :hover·:focus 같은 상태 선택자와 그 밖의 의사 요소가 붙은 규칙, @container 안 규칙은 남긴다.
   @media·@supports 안 규칙이 이긴 경우는 그 규칙이 없는 환경도 따져, 진 쪽을 이긴 것으로 친다. 한 번도 맞지 않은 규칙은 이 단계에서 지우지 않는다.
- `plan.mjs`: 규칙을 역할별 파일로 나누는 계획과 검사 (UI-20 5단계). 측정한 요소별 규칙 묶음에서 새 순서의 이긴 선언이 지금과 같은지 센다 (`--layers` 는 @layer 를 걸었을 때). `--apply` 로 파일을 쓴다 (옛 파일은 지우지 않는다).
   `deadrules.mjs`·`dupdecl.mjs`·`neverwin.mjs`·`plan.mjs` 의 파일 목록은 5단계 전 파일 기준이다. 다시 쓰려면 `ui/index.css` 의 순서로 목록을 바꾼다.
