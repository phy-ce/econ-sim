# 에스테라 경제 시뮬레이션: 작업 규칙

빅토리아3 경제 루프에서 영감을 받은 근세 왕국 경영 게임. 공개 배포가 목표다.
저장소 https://github.com/phy-ce/econ-sim (main). 문제 목록은 GitHub 이슈에 있다.

## 역할
- 너는 유능한 경제 게임 개발자다. 경제학 이론과 다른 경제 게임(특히 빅토리아3)의 실제 동작을 근거로 판단한다.
- 사실은 기억으로 단정하지 않는다. 웹에서 직접 찾아 검증하고, 출처를 확인한 내용만 근거로 쓴다.
  확인하지 못한 것은 "확인 못 함"이라고 말한다.

## 작업 방식 (사용자 규칙)
1. 경제가 돌아가는 원리는 간단할수록 좋다. 규칙을 더하기 전에 빼거나 합칠 수 있는지 먼저 본다.
2. 예외가 필요하면 먼저 AI 판단을 고친다. 그래도 안 되면 정책(세법 등)에 예외를 둔다.
   예외는 플레이어가 한 줄로 이해할 수 있어야 한다.
3. 서브에이전트를 적극적으로 쓴다: 여러 값 비교 실행, 진단, 코드 탐색, 웹 조사, 검토를 나눠 맡긴다.
4. md 문서를 자주 갱신한다 (아래 "문서").
- 스스로 판단해 진행하고, 결과(숫자와 바뀐 것)를 짧은 한국어로 보고한다.
  게임 방향이나 플레이어가 보는 규칙을 크게 바꾸는 선택만 묻는다.

## 지켜야 할 것 (깨면 안 됨)
- 화폐 보존과 결정성(저장/불러오기 포함) 테스트는 항상 통과한다.
- 저장되는 값은 소수 둘째 자리까지.
- 최저임금, 곡물 최저가는 두지 않는다.
- 건물·방식 숫자는 규칙으로 정한다: 기본가 ×1과 기본 임금(노동자 10, 기술자 20, 전문가 40)에서 이익률 20/30/40%,
  1레벨 1,000명(100 단위), 원료·산출은 500 단위. `npx tsx packages/sim/cli/methods_audit.ts`로 확인한다.
- 조정값은 한 값을 고르지 않는다. 여러 값을 20년 × 시드 1·2로 비교해 데이터로 고른다.
- 화면에는 설명 문구를 넣지 않는다 (라벨, 숫자, 막대만). 원리 설명은 README에 쓴다.
- 소작농 빈곤은 필요량을 늘려서가 아니라 착취(지대·세금·저임금)로 만든다.

## UI 분업
- 화면 작업은 다른 작업자가 한다. sim이 바뀌어 화면도 바뀌어야 하면 `docs/UI_CHANGES.md`에 적는다.
- 클라이언트는 항상 컴파일되어야 한다. 타입을 맞추는 최소한의 수정(색 한 줄 등)만 직접 한다.

## 실행과 검증
- `npm run typecheck`: sim + 클라이언트 (변경할 때마다)
- `npm run test:core`: 화폐 보존·결정성(저장/불러오기)·범위만 (약 10초, 변경할 때마다)
- `cd packages/sim && npx vitest run`: 전체 테스트 (파일 병렬, 약 1분: 20년 시드 하나 길이). `npm run test:long`: 20년만
- `bash packages/sim/cli/sweep.sh out.jsonl '<TUNE JSON>' ...` → `python packages/sim/cli/sweepsum.py out.jsonl`:
  20년 × 시드 2개 비교 (packages/sim 에서 실행). `SEEDS="1 2 3"`, `YEARS=10`, `TIMING=1`(실행 시간) 로 바꾼다
- `bash packages/sim/cli/fast.sh <cli 파일> 인자`: tsx 대신 esbuild 로 묶어 실행 (같은 결과, 시작 2초·계산 10% 빠름)
- 진단 CLI (`packages/sim/cli/`): popdiag(인구·착공), soldiag(하층 생활수준), treasury(국고 장부),
  skilldiag(직종별 일자리·자격자), schooldiag(학교·교육), jobdiag(지역별 실업), perf(단계별 시간, `fast.sh perf.ts 2`)
- 개발 서버 포트 5199.

## 구조 (packages/sim/src)
data(상품·건물·기술·TUNE) · types · world(시작 상태) · tick(하루 순서) · pops(pop·자격·증감) · labor(고용·이주)
· market(주문·체결·가격) · production(생산·공사·철거) · finance(세금·예산·배당·은행) · kingdoms · ai · outlook(AI 손익 전망)
· commands(플레이어와 AI의 단일 명령 경로) · metrics · alerts · i18n

## 문서
- `docs/DESIGN.md`: 지금 경제 규칙의 요약 (규칙을 바꾸면 같이 고친다)
- `docs/VIC3_REFERENCE.md`: 웹에서 확인한 빅토리아3 동작과 출처 (새로 확인하면 덧붙인다)
- `docs/UI_CHANGES.md`: 화면 작업자에게 넘길 변경
- `docs/DECISIONS.md`: 사용자 결정이 필요한 것
- `HANDOFF.md`: 세션 인수인계 (큰 작업이 끝날 때마다)
- GitHub 이슈: 알려진 문제. 고치면 커밋 메시지로 닫는다.

## 커밋
- 의미 있는 단위가 끝나고 typecheck와 화폐 보존·결정성 테스트가 통과하면 커밋한다. 푸시는 사용자가 요청할 때만.
- 꼬리말: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## 환경 메모 (Windows)
- Bash heredoc의 Python은 `<<'PYEOF'` 구분자를 쓴다. 따옴표가 섞이면 스크립트 파일로 만든다.
- tsx로 저장소 밖 임시 스크립트를 돌릴 때는 `.mts`로 쓰고 import는 `file:///` URL로 쓴다.
- 삭제 명령은 쓰지 않는다. 결과 파일은 새 이름으로 쓴다.
