# 인수인계 (2026-11-02 기준)

에스테라 왕국 경제 시뮬레이션. 빅토리아3의 경제 루프에서 영감을 받은 근세 왕국 경영 게임이다. 공개 배포가 목표다.

- 폴더: `C:\Users\phyju\Desktop\Coding_Desk\2026\estera economy sim`
- 저장소: https://github.com/phy-ce/econ-sim (main). 검증된 병합마다 푸시한다(2026-10-19 사용자 지시).
- 작업 규칙: `CLAUDE.md`. 경제 규칙 요약: `docs/DESIGN.md`. 빅토리아3 근거: `docs/VIC3_REFERENCE.md`.
- 사용자 결정 대기: `docs/overhaul/12_DECISIONS_NEEDED.md`(Q1~Q20)와 `docs/DECISIONS.md`. 지금 답을 기다리는 것은 아래 0-1030 절 0b′ 의 "사용자 답 대기" 줄, 0-1102 의 `tenantSlack` 메모, 0-1102e 의 플레이어 왕실 국영 웃돈·하급 귀족 시작 임금 (DECISIONS 7-42), 0-1102i 의 이익집단 확률 규칙·선거 보정치·지분 끌림 크기 (DECISIONS 7-45, 단계 0 만 구현), 0-1102f 의 목표 임금 규칙 확인 (DECISIONS 7-43, 기본 켬; 7-41 W1 은 이것이 대신함), 0-1102-welfare9 의 복지 상한 (DECISIONS 7-47, 기본 끔), 0-1102-fix10 의 정산 소수 레벨 (DECISIONS 7-48, 급하지 않음). 화면 작업자에게 넘길 것: `docs/UI_CHANGES.md` 맨 위 "0. 지금 할 일".
- 클라우드 세션(claude.ai/code)으로 이어서 할 수 있다. 규칙은 CLAUDE.md "클라우드 세션"을 본다.
- 옛 세션 기록: `docs/log/` (2026-10-25 이전 HANDOFF 절은 `docs/log/HANDOFF_2026-10-18_to_10-25.md`, 날짜별 UI 기록도 여기). 다른 문서의 "HANDOFF 0-ind3"·"HANDOFF 0-aifix" 같은 옛 절 참조는 그 파일에 있다.

## 0-1102-uiapi. 2026-11-02: wt-uiapi (UI_CHANGES 3장의 읽기 전용 sim 요청 + 보고서 소작농 라벨)
- 바뀐 것 (sim, 읽기 전용): `marketWageTargets(w, regionId): Record<Skill, WageTarget> | null` (`labor.ts:549`, index `index.ts:15`, 타입 `WageTarget = { target, lo, hi, jobs, willing }` `labor.ts:501`·`index.ts:16`). `updateMarketWages` 의 지역 하나 셈을 `moveRegionWages` (`labor.ts:507`) 로 빼고, `updateMarketWages` 와 `marketWageTargets` 가 같이 쓴다 (`marketWageTargets` 는 지역 임금표 사본에 돌린다. 위 직종의 아래 끝은 아래 직종이 그날 움직인 뒤 값으로, `updateMarketWages` 와 같다). `TUNE.wageMarket` 0, `wageTarget` ≠ 2, 지역이 없거나 `Region.wages` 가 없으면 null. 규칙은 그대로다.
- 시험: `test/core/wageTarget.test.ts` '목표 임금 읽기' 2개 (시드 1 120일: 부른 전후 직렬화·rngState·nextId 같음, 두 번 불러도 같음, 다음 `updateMarketWages` 뒤 임금 = 지금 + `wageTargetSpeed` × (목표 − 지금) (자리가 없으면 목표) 를 `toBe` 로, 자리 있는 직종은 lo ≤ 목표 ≤ hi. null 네 경우). `readonly.test.ts` 의 regions 읽기 묶음에 넣음 (얼린 세계 포함).
- 바뀐 것 (cli/report.py): 해마다 한 줄 파일의 `peas` 이름이 '소작농 수 / 백만' 으로 나왔다. `cli/lab.ts` 줄(`src/lab/metrics.ts:914`)의 `peas` 는 소작농 비율이고 수는 `peasK` 다. 옛 진단 `.tmp/col/collapse.ts` 파일(보고서 2026-10-22-collapse40·2026-10-30-0a-probe, `peasK` 없음)은 정말 수였으므로 FLAT 이름은 `peasK` 가 없는 파일에만 쓴다 (`finish` 의 `old_flat`). 이미 올린 보고서 11개(`peasK` 있는 것: 0b-base·0b-levers·0bp-glut·basewage·admin·admin-k2·combo·newdefaults·wagelag·wagespan·wagespeed)의 `labels.peas` 를 '소작농 비율' (단위 없음) 으로 고쳤다 (그 칸 한 곳만, 값은 그대로).
- UI_CHANGES: 3장에서 2-86 요청을 지우고 '이미 export되는 것'에 더함. 2-86 은 'sim 준비됨' 과 줄 번호, 2-85 에 쓰는 export 줄 번호 한 줄 (새 export 필요 없음), 2-79 옛 줄 번호(`labor.ts:436`·`economy.ts:349`) 고침, 0장 2-86 줄 'sim 준비됨, 지금 해도 된다'.
- 남은 것 (3장, 읽기 전용이 아니라 이번에 안 함): 2-59 `BuildingEcon.week` (매출·세금·원료비·임금 이동평균을 건물에 새로 저장해야 한다, 골든 바뀜), 2-49 회수 자재 `buildingId` (`SalvageLot` 저장 칸), 2-74 `GameEvent.key` (저장되는 소식 칸), 2-72 인두세 부담 (05 C-2 결정 뒤), 오버홀 S1~S8 (큰 일), 2-17 `compat.ts` 껍데기 지우기 (export 를 없애는 일이라 범위 밖, 화면 작업자의 커밋 안 한 파일을 확인하지 못했다).
- 화면: UI_CHANGES 0장 'sim 대기 · 결정 대기' 의 2-86 (이제 할 수 있음), 2-85.
- 검증: typecheck (sim + client + encyclopedia), test:core 24파일 81개. 골든 해시 c7fb7c00ef46d24c (`cli/golden.ts`) 가 이력 마지막(규칙 판 6) 과 같음. 클라이언트 코드는 고치지 않았다.

## 0-1102-welfare9
2026-11-02, 브랜치 `wt-welfare9` (main 9ba5acc 에서), 이슈 #9 (복지법 하나가 왕실 국고를 비운다). 합치지 않았다.
- 측정 (지금 규칙, 새 CLI `cli/welfmon.ts`: 0b levers `m.welfareLaw.*` 조건 = 플레이어 왕국에 0일 복지법 강제·단계 3, 30일마다 국고·빚·한도·복지·세입·생활수준 한 줄, 결과 `.tmp/wt/welfare9/.tmp/welfare9/*.jsonl`, 해마다 표 `.tmp/welfare9/yearly.py`): 5년 × 시드 1 × salt 0 에서 구빈법·보편 보장은 첫 달에 국고 1,200만을 다 쓰고 (그달 복지 1,240만, 필요액 달 4,600만 = 세금·관세의 약 90배), 임금 보조는 9달째 국고 0. 5년차 빚 ÷ 한도 구빈 1.09 / 임금 1.13 / 보편 1.14, 복지 없음은 국고 1,200만 → 6,690만·빚 0. 시드 2 도 같은 모양 (구빈·보편 첫 달, 임금 9달째 국고 0, 5년차 빚 ÷ 한도 1.25 / 1.16 / 1.28, 복지 없음 5,820만). 구빈·보편에서도 소작농 생활수준은 1.00~1.05 (국고가 빈 뒤 지급이 필요의 2~5%).
- 바뀐 것: `TUNE.welfareCap` (기본 0 = 끔, 골든 해시 c7fb7c00ef46d24c 가 main 규칙 판 6 과 같음). 켜면 하루 복지 합 ≤ 지난주 세입 ÷ 7 × welfareCap × 단계 ÷ 5 (`welfare.ts welfareCapDaily`, `payWelfare`·`welfareWeekly` 가 쓴다). 사전 `welfare` 항목에 손잡이 줄과 식, 같은 항목의 바꾸는 날 수 자리표시가 `{0}` (목표 생활수준 표를 가리켰다) → `{1}` (lawDays). `cli/report.py` LAB 에 welfareY·taxY·welTax 이름. VIC3_REFERENCE '복지 지급과 국고' 절 (지급 식은 확인 못 함).
- 비교 (켬): DECISIONS 7-47, DESIGN 11장 `welfareCap` 행, 보고서 2026-11-02-welfare9 (`tools/reports/public/data/`, 해마다 값은 `.tmp/welfare9/y/`). 0.5 (단계 × 10%), 단계 3: 구빈·임금·보편 × 시드 1·2 여섯 실행 모두 빚 0, 5년차 국고 4,780만~5,550만 (복지 없음 5,820만·6,690만), 복지 ÷ 세금·관세 0.34 → 0.53. 단계 5 (시드 1): 0.5 국고 4,680만, 1 은 1,950만. 0.25 / 1 (단계 3): 6,060만 / 4,040만. 소작농 생활수준은 그대로 1.00~1.04, 임금 보조 노동자 생활수준은 복지 없음보다 조금 높다 (5년차 1.40·1.46 대 1.23·1.25). 켜면 AI 왕국이 보편 보장을 켜기 시작한다 (10실행 중 6, 빚 0). 끄면 `welfmon` 결과가 지금 main 과 같다 (구빈 시드 1 60달 줄이 같음).
- 남은 것: 사용자 결정 7-47 (켤지, 값). 하루 순서(임금 → 복지)·못 낸 이자가 빚에 쌓임·복지가 총생산(국채 한도)에 들어감은 그대로다. 20년 비교는 하지 않았다.
- 화면: 넘길 것 없음 (기본 끔). 켜면 정책 창·예산 미리보기에 상한 줄이 필요하다 (복지 내역 `drillWelfare` 의 지역 줄은 상한 전 필요액이라 줄인 몫이 smoothing 에 들어간다).
- 검증: typecheck, test:core 24파일 80개 (새 시험 'welfareCap: 하루 지급이 상한을 넘지 않고 돈이 보존된다' 포함), `cli/golden.ts` 같음. 전체 vitest 는 돌리지 않았다.

## 0-1102-fix10. 2026-11-02: wt-fix10 (이슈 #10, 공사 완공 정산에서 저택·금융가 금고가 음수)
- 원인: `production.ts giveLevels` 정산이 금고를 보지 않고 뺐다. 음수가 나는 길은 모아 내기다: `finance.ts chooseFunders` 는 어느 금고도 한 레벨을 혼자 못 낼 때만 남은 금고 돈을 모으고, 마지막 금고를 빼면 모두 쓸 수 있는 돈을 다 약정한다. 완공되면 나머지 레벨은 가장 많이 낸 쪽이 갖고 공사비 × 남의 몫을 내야 하는데, 그 돈은 공사 중 들어온 수입뿐이다.
- 바뀐 것: `TUNE.settleCap` (915ab53 에서 기본 0 으로 넣고 골든 c7fb7c00ef46d24c 같음 확인, 다음 커밋에서 기본 1). 규칙 한 줄: "레벨을 더 받은 쪽은 금고에 있는 돈까지만 돌려준다." 진단 흐름 `settle.*`·`settleShort.*`·`settleN`·`settleCap.*` (kingdoms.ts FLOW), 진단 `cli/settlediag.ts` (lowprio, 해마다 한 줄, report.py 가 읽는다). 시험 `test/core/settle.test.ts` (60:40 모아 낸 레벨, 금고 0 아래로 안 감·돈의 합 그대로). `test/helpers.ts stateFlags` 가 저택·금융가 금고 ≥ 0 을 다시 판정한다 (무역소 금고는 유한한지만). DESIGN 8장·9.3·11장 `settleCap` 행, 사전 `owner-treasury`, DECISIONS 7-29.
- 숫자 (main 9ba5acc + 915ab53, 20년 × 시드 1·2, 한 번에 한 프로세스, 보고서 2026-11-02-fix10): 저택·금융가 금고가 음수인 날 345·204 → 0·0 (최저 −401,825·−438,438 → 0). 연 총생산 20년 평균 비 1.05·1.08, 민간 레벨 1.03·1.04 (해마다 −11%~+38%, 1·5·10·15·20년차 값은 DESIGN 11장).
- 남은 것: 덜 가진 쪽이 받지 못한 돈 20년 1,735만·1,223만, 차액을 낸 정산 100·114 → 294·277번. 잃는 사람 없는 다른 길(레벨을 소수까지 나눔)은 DECISIONS 7-48 사용자 결정. 무역소 금고 음수(시드 1 settleCap 0 에서 9일, 최저 −4,762)는 따로다 (원인 확인 못 함, 장기 시험 meta.ownerCashNeg 가 계속 센다). 장기 시험(`npm run test:long`)은 두 시드를 병렬로 돌려 이번에는 돌리지 않았다 (CPU 제한).
- 합칠 때: 기본 1 이라 골든 해시가 바뀐다 (premerge 마지막에 main 을 합친 상태로 `npm run golden:update`). 화면: 넘길 것 없음.
- 검증: typecheck, test:core 25파일 82개 (아래 커밋에서).

## 0-1102k. 2026-11-02: wt-batch1 (wt-par 비교 실행 자원 + wt-uidocs UI_CHANGES 감사)
- 바뀐 것 (wt-par a17d0f7): `cli/lab.sh`·`cli/sweep.sh` 의 `PAR` 기본이 'CPU 코어 수 − 2' 에서 '6 과 코어 수 − 2 중 작은 쪽 (최소 1)' 으로 (이 PC 16코어: 14 → 6, 클라우드 VM 약 4 vCPU: 2 그대로). `cli/lowprio.ts` (프로세스 우선순위 '보통 이하', `LOWPRIO=0` 이면 끔)를 `cli/lab.ts`·`cli/sweep.ts` 가 맨 앞에서 import 한다. CLAUDE.md '실행과 검증'에 컴퓨팅 자원 줄 (2026-11-02 사용자: PC 를 너무 많이 쓴다). 계산 결과는 같다 (우선순위·동시 실행 수만 바뀐다). 숫자: 실행 시간은 재지 않았다.
- 바뀐 것 (wt-uidocs 626a052): UI_CHANGES 를 클라이언트 main 81494a1 과 대조했다. 끝났거나 폐기된 절 2-43·2-45·2-46·2-52·2-53(폐기)·2-56·2-57·2-58·2-63·2-65(대체)·2-66 과 2-72 1항은 UI_DONE '2026-11-02 확인'으로 옮겼다. 일부만 된 절에는 '2026-11-02 반영 확인' 줄을 달았다. 0장은 순서 목록 하나로 다시 썼다. 새 절: 2-85 (일꾼 줄 1인 임금·웃돈 칩), 2-86 (목표 임금 화살표·툴팁, premerge 에서 wt-span 뒤 이름 `TUNE.wageTargetSpan`·줄 번호로 고침).
- 남은 것: UI_CHANGES 3장의 sim 요청 `marketWageTargets(w, regionId)` 는 아직 만들지 않았다 (Claude 쪽 일, 2-86 이 기다린다. → 0-1102-uiapi 에서 만듦). 2-86 규칙 자체는 DECISIONS 7-43 사용자 답 대기.
- 화면: UI_CHANGES 0장 2 (2-85), 'sim 대기 · 결정 대기' (2-86).
- 검증: typecheck, test:core 24파일 79개 (premerge 고침 뒤 브랜치에서). 문서와 cli 만 바뀌었고 sim·client 코드는 그대로다.

## 0-1102i. 2026-11-02: wt-ig (이익집단, 단계 0 읽기 전용 층)
- 사용자 결정 (DECISIONS 7-45): 회원은 빅토리아3 식 끌림 가중치, 효과는 경제 특성 + 법 저항, 영향력은 "총 부에 선거 보정치를 곱한다" (식은 정해짐, 다시 묻지 않는다). 두 번째 답: 법 저항은 "빅토리아처럼 확률" (0% 문턱 버림), 투표법은 "단계를 더" (여섯 단계), 자본가 집단은 "금융가 지분 가진 사람에게 끌림".
- 바뀐 것 (sim 결과는 그대로): `src/interestGroups.ts` (회원 몫 `igMembership`·자본가 지분 끌림 `igFundAttraction`·1년 생활비 `igYearCost`, 선거 보정치 `VOTE_MOD`·`igVoteMod`, 영향력·승인·기분 `interestGroups(w, kingdomId, opts)`, 법이 바뀔 확률 `lawChance`, 상수·입장 표), `index.ts` 내보냄, 진단 `cli/igdiag.ts` (해마다 왕국별 영향력·승인, 투표법 여섯의 영향력, AI 가 바꾼 법의 바뀔 확률·실패했을 기대 수, 법 바꾸기 기록은 스크립트가 넘김), 사전 `interest-groups` (DESIGN 9.6), 시험 `test/core/interestGroups.test.ts` + `readonly.test.ts` 에 읽기 함수 등록. TUNE·저장 모양·규칙 해시는 안 바뀜. 첫 커밋 c37cae5 (0/1 투표법·0% 문턱) 를 두 번째 커밋이 바꿨다.
- 설계: `docs/overhaul/INTEREST_GROUPS.md` (빅토리아3 사실과 출처, 집단 6·끌림 표, 법 입장 표, 총 부 × 선거 보정치, 투표법 여섯 (전제 / 과두정 / 지주 투표 / 재산 투표 / 인구 조사 선거 / 보통 선거, 지금 모두 전제, 읽기 값), 승인 식, 특성 대응, 8장 법이 바뀔 확률 (단계 2), AI, 저택 지분 관계, 단계 0~3, 남은 결정). 빅토리아3 사실은 `docs/VIC3_REFERENCE.md` "이익집단 (2026-11-02 확인)" (법 제정 확률 식 포함).
- 숫자 (main 93bc0b0 코드, 20년 × 시드 1·2, 전제, 보고서 2026-11-02-ig0, 해마다 표는 INTEREST_GROUPS.md 12장): 1~3년차 농민이 가장 크다 (47·41%), 지주 25~30% (10년차까지), 자본가 9·11% → 20년차 35·44% (귀족·전문가의 금융가 지분), 지주 14·18%. AI 가 바꾼 법 21·22번의 바뀔 확률 평균 64·58%, 실패했을 기대 수 7.6·9.2번. 생활수준 항 배율 50 → 25 (자본가가 한도 ±15 에 자주 닿음), 지분 끌림 분모 1년 소득 → 1년 생활비 (소득 이동평균이 주간 배당에 출렁여 해마다 14 ↔ 27% 로 오감). 둘 다 비교 실행 아님.
- 검증: typecheck, test:core 25파일 85개 (`VITEST_MAX_THREADS=2`), samecheck 5개 모두 main 93bc0b0 기준 해시와 같음.
- 화면: UI_CHANGES 2-88 (정치 탭, 낮은 우선순위, 바뀔 확률은 단계 2 전에는 안 보임). 클라이언트는 안 건드림.
- 남은 것: 사용자 확인 (DECISIONS 7-45: 8장 확률 규칙, 선거 보정치의 계층 지위 0.05 / 0.2 / 1, 지분 끌림 50 / 250, 지식인·생활수준 항·근거 없는 입장·특성 대응). 확인 뒤 단계 1 (특성 스위치, 법 바꾸기 기록 상태) → 단계 2 (법이 바뀔 확률, AI) → 단계 3 (투표법 명령, 가문 지도자). main 에 합치지 않음 (premerge 대기).

## 0-1102g. 2026-11-02: wt-span (맞는 임금 위 끝 배율·하루 속도 비교)
- 바뀐 것: `labor.ts WAGE_TARGET_SPAN` 상수를 `TUNE.wageTargetSpan` (기본 2) 으로 뺐다 (c1caf9f, main 81494a1 에서, 기본 2 면 samecheck 5개 같음). 사전 `market-wage` 의 '목표 위 끝 배율' 이 TUNE 값을 읽는다. lab 줄에 `solSkill` (기술자 생활수준), `cli/report.py` LAB 에 empLowK·wageSdW·adminSt·lvProd·solSkill·skRatio·lnsd6·lo6·adminSt1~3 이름. 기본값 그대로 (배율 2, 속도 0.1).
- 숫자: DESIGN 11장 `wageTargetSpan`·`wageTargetSpeed` 행 (1·3·5·10·15·20년차 표), 보고서 2026-11-02-wagespan (명세 `docs/overhaul/WAGESPAN_SPECS.json`, 20년 × 시드 1·2 × salt 0..3 = 8회 평균, 결과 `.tmp/wt/span/.tmp/span/y20.jsonl`, 요약 `.tmp/wt/span/.tmp/span/sum.py`). 배율 1.5 / 2 / 3: 20년차 세전 총생산 1,138 / 1,200 / 1,203, 국고(백만) 227 / 251 / 235, 기술자 ÷ 노동자 임금 1.36 / 1.44 / 1.55. 속도 0.2 대 0.1: 1년차 세전 총생산 180 대 172, 15·20년차 779/1,126 대 868/1,200, 20년차 국고 204 대 251, 노동자·농부 임금 주간 변화율 표준편차 20년차 0.036 대 0.028.
- 남은 것: 차는 모두 8회 범위 안. 배율 2.5·속도 0.15 는 돌리지 않았다. 배율 3 은 행정청 충원이 크게 떨어지는 실행이 있다 (5년차 왕국 3 한 실행 0.05, 15년차 왕국 2 한 실행 0.49). 규칙을 그대로 둘지는 DECISIONS 7-43 사용자 답 대기.
- 화면: 넘길 것 없음 (클라이언트는 `WAGE_TARGET_SPAN` 을 쓰지 않는다).
- 검증: typecheck, test:core 24파일 79개. 골든 해시 c7fb7c00ef46d24c (브랜치 머리 4898bb6 에서 `cli/golden.ts`) 가 main 규칙 판 6 과 같다. main 에 합침 (fast-forward 93bc0b0, 골든 규칙 판 6 그대로).

## 0-1102f. 2026-11-02: wt-wagespeed (임금이 고정 속도로 움직임 → 맞는 임금 쪽으로)
- 사용자: "임금이나 상품 가격이나 속도가 무조건 일정 속도로 변화하는건 말이 안됨. 수요-공급 차에 따라서 숫자가(하한/상한 수렴값은 존재함) 변하게 해야지". 가격은 이미 목표가(기본가 25~175%)로 거리의 3%씩 가므로 그대로, 임금만 바꿨다.
- 바뀐 것: `TUNE.wageTarget` (0 = 옛 하루 0.25%, 1 = 바깥 소득 기준 쏠림 비교용, 2 = 맞는 임금 기본), `TUNE.wageTargetSpeed` 0.1. `labor.ts clearingWage`·`willingAt`·`WillingCurve`·`outsideWage`·위 끝 배율 2 (wt-span 부터 `TUNE.wageTargetSpan`)·`WAGE_TILT` 0.75, `labourTable` 에 선택 인자 `curves`. 끄면 samecheck 5개 같음 (0f23b14). 시험 `test/core/wageTarget.test.ts` (맞는 임금 식, 1·2 의 화폐 보존·저장/불러오기·범위). `test/core/budget.test.ts` 세금 단계 미리보기 허용 오차 0.08 → 0.1 (시드 42 단계 5 오차 8.4%, 임금이 한 주 안에 더 움직인다). `cli/microcheck.ts` (w) 절에 날마다 지역 0 시장 임금 기록 (`-w.json` 의 `days`). 사전 `market-wage`, DESIGN 7.3·11장, DECISIONS 7-43 (7-41 은 이것이 대신함), UI_CHANGES 2-79 한 줄 고침 (화면 변경 없음).
- 1차 (위 끝 = 기본 임금 × 10) 실패: 기술자 자리가 자격자보다 많으면 기술자 자격의 전문가·하급 귀족까지 끌어오는 임금으로 올라 기술자 임금이 노동자의 6~11배, 10년차부터 생산 레벨 대조의 약 60%. 위 끝을 바깥 소득 × 2 로 묶어 고쳤다.
- 숫자: DESIGN 11장 `wageTarget`·`wageTargetSpeed` 행, 보고서 2026-11-02-wagespeed (명세 `docs/overhaul/WAGESPEED_SPECS.json` specs·specs2, 결과 `.tmp/wt/wagespeed/.tmp/ws/y20.jsonl`·`y20c2.jsonl`, 요약 `.tmp/ws/sum.py`). 마이크로 (`.tmp/ws/micro/`, 3년 시드 1, base·drought·people·jobs·cloth): 노동자 임금 < 소작 소득인 주 76~117/154 → 3~10/154, 직종 순서 5실행 모두 맞음. 성능: `updateMarketWages` 하루 0.46 → 0.50ms (step 7ms 중, `fast.sh perf.ts 2`).
- 남은 것: 10·15년차 세전 총생산 −12% (원인 확인 못 함), 10~20년차 S/D 조금 더 벌어짐, 20년차 소작 생활수준 낮음. 위 끝 배율·속도 비교는 0-1102g (wt-span). main 에 합침 (5617ac3, 골든 규칙 판 6 81494a1).

## 0-1102e. 2026-11-02: wt-admin (행정청 충원 0, 세습 관료가 저택으로 떠남)
- 진단: `.tmp/wt/admin/.tmp/admin/RESULT.md` (main b1bd1fa, 새 도구 `cli/admindiag.ts`: 매주 표본의 해 평균, `--every N` 지역별, `--micro N` 마이크로). 세습 관료제 행정청(왕국마다 수도 한 지역)의 하급 귀족은 저택의 하급 귀족 1인 몫과 비교해 떠난다. 저택 이익 이동평균이 0 에서 시작해 첫 120일 동안 시장 하급 귀족 임금이 4.14 → 3.07 로 내리고, 그 뒤 저택 몫이 국영 임금의 1.5~3배가 되어 150~210일에 행정청이 빈다. 시장 임금(하루 0.25%)과 A2 국영 임금 단계(5단계 × 1.3)로는 1년 안에 못 따라간다. 1년차 충원 평균 0.39~0.44 (10년 × 시드 1·2, AI 왕국). 인쇄술은 1년차에 알지만 종이가 없어 전문 관료제로 못 바꾼다. 마이크로(인구 2,000)는 저택 자리 정수 효과로 재현되지 않았다.
- 바뀐 것: `TUNE.aiStatePremium` (a1aa901 스위치, 끄면 samecheck 5개 같음 → bd4894b 기본 2 → 기본 1, 총생산 때문): AI 왕실이 지역마다 정부 건물 직종 충원이 0.9 아래면 국영 임금에 웃돈 (바깥 소득 × `STATE_HIRE_PULL` 1.25, 하급 귀족의 바깥 소득 = 저택 1인 몫), 차 있으면 바깥 소득까지 한 주 0.1 씩 내림 (`ai.ts adjustStatePremium`, `Company.statePremium`, `finance.ts applyStateWages`). 예산 상세 `budget.ts govMarketWages` 가 웃돈을 넣고 `WageDrillJob.premium` 새 칸 (시험 `test/core/budget.test.ts` 식 한 줄 고침). 사전 `ai-state-premium`. DESIGN 7.3·9.2·10장·11장.
- 숫자: DESIGN 11장 `aiStatePremium` 행, 보고서 2026-11-02-admin (대륙)·2026-11-02-admin-k2 (왕국 2), 명세 `docs/overhaul/ADMIN_SPECS.json` (20년 × 시드 1·2 × salt 0..3, 40회, 결과 `.tmp/wt/admin/.tmp/admin/lab20.jsonl`, 요약 `.tmp/wt/admin/.tmp/admin/sum.py`). 대조 → 상한 1 (채택): AI 왕국 연말 충원 1·5·20년차 0.01/0.83/0.88 → 0.62/0.85/1.00, 징수율 해 평균 0.25/0.55/0.08 → 0.39/0.53/0.09, 20년차 왕실 빚 21 → 13, 세전 총생산 20년차 1,064 → 1,143. 상한 2 는 1년차 충원 0.89 지만 세전 총생산 20년차 989 라 고르지 않았다.
- 남은 것: 1년차 연말 충원이 0.62 에 그친다 (AI 왕국 시드 1 0.83, 시드 2 0.42). 3·5년차 세전 총생산이 대조보다 조금 낮다 (362/459 대 366/466). 15·20년차 징수율은 대조와 겹치거나 낮다 (0.12/0.09 대 0.20/0.08). 10년차 뒤 징수율이 낮은 것은 행정청 레벨이 주는 탓 (K2·K3 평균 10.2 → 20년차 0.7, 대조 3.7): 철거·전문 관료제 전환 판단을 따로 봐야 한다. 플레이어 왕실은 웃돈이 없어 1년차에 행정청이 빈다 (DECISIONS 7-42 결정 대기 1). 세계 규칙 뿌리(하급 귀족 시작 임금 = 기술자 × 1.1, 저택 이익 이동평균 시작 0)는 묻기만 했다 (7-42 결정 대기 2). `STATE_HIRE_PULL` 1.25 는 근거 없음. 가뭄 지역 건축사무소(0-1102d)는 같은 웃돈이 노동자에도 걸리지만 따로 재지 않았다. 골든 해시는 합친 뒤 04bbc6d 에서 고쳤다. 화면: UI_CHANGES 2-84 (낮음).
- 검증: typecheck, test:core 23파일 73개. main 에 합침 (fast-forward 2f5e0e2, 골든 규칙 판 5 04bbc6d).

## 0-1102d. 2026-11-02: wt-wagelag (흉작 때 시장 임금이 소작 소득을 못 따라감)
- 진단: `.tmp/y1/RESULT.md` (시드 1 의 182일 가뭄으로 소작 1인 소득이 약 3배, 시장 임금은 하루 `wageMarketRate` 에 묶여 임금 ÷ 소작 0.59, 생산 고용 50 → 22천, 지역 1 건축사무소·행정청이 빔).
- 바뀐 것 (2fbc1de 스위치, 끄면 samecheck 5개 같음 → 그다음 커밋에서 A1·A2 기본 켬):
  - A1 `aiWagePremium` 1 (기본): 민간 AI 상회가 사람이 빠지는 이익 지역에 웃돈 (`ai.ts adjustPremium`, `Company.aiPremium`, `economy.ts wagesAt`, DESIGN 7.3·10장). DECISIONS 7-39 (플레이어 왕실 웃돈)과 별개.
  - A2 `aiAdminWage` 2 (기본): 왕실이 행정청·건축사무소 충원 중 낮은 쪽이 0.9 아래면 국영 임금 단계를 올리고 내리지 않는다 (옛 `aiAdminWage` 1 에 모드를 더함, 새 키 없음).
  - W1 `wageMarketRateUp` (기본 0 = 끔, DECISIONS 7-41; 2026-11-02 wt-wagespeed 부터 wageTarget 0 일 때만 쓰임, 7-43 이 대신함): 오를 때만 하루 속도.
  - 마이크로 흉작 충격 `microcheck --runs drought` (`economy.ts SCRIPTED_HARVESTS`, `--droughtcut`·`--droughtdays`), 표 `--sections w`. 시험 `test/core/wageLag.test.ts`.
- 숫자: DESIGN 11장 `aiWagePremium`·`aiAdminWage`·`wageMarketRateUp` 행, 보고서 2026-11-02-wagelag (20년 × 시드 1·2 × salt 0..3, 명세 `docs/overhaul/WAGELAG_SPECS.json`). 대조 → A1+A2 세전 총생산 8회 평균 1·5·10·20년차 148/454/571/824 → 170/466/696/1,064. 결과 파일: `.tmp/wagelag/` (lab20.jsonl, y1_*.jsonl, micro/).
- 남은 것: 가뭄 지역 국영 건축사무소는 A2 로 못 고친다 (국영 임금 단계가 왕국 하나). 행정청 충원 0 (세습 관료 이탈, 0b′ A4)은 그대로 → 0-1102e (wt-admin `aiStatePremium`)에서 AI 왕실은 고침, 플레이어 왕실은 DECISIONS 7-42 대기. 3~5년차 생산 레벨이 대조보다 적다. 국고·징수율이 15~20년차에 낮다. A1·A2 기본을 바꿔 골든 해시가 바뀐다 (합친 뒤 `npm run golden:update`). 화면: 따로 넘길 것 없음. 클라이언트는 `wagesAt` 을 부르지 않고 AI 상회 임금표를 보여 주지 않는다 (`Wages` 는 플레이어 회사 `me.wages`, CompanyPanel.tsx:325). 건물 임금 비용 `econ.day.wages` 는 웃돈이 든 실제 지급액이고, 회사 임금표 `Company.wages` (`syncCompanyWages`, `wagesAt` 의 고용 가중 평균)에도 웃돈이 들어간다. 사전 항목 `ai-wage-premium`.
- main 에 합침 (171fc43 fast-forward, 골든 규칙 판 4 52f9db6). typecheck·test:core 24파일·클라이언트 vitest 23파일 통과.

## 0-1102c. 2026-11-02: wt-cash (민간 회사 현금 0 함정, DECISIONS 7-40)
- 원인: 운영 자금(`payDividends`)의 하루 운영비를 그날 실제로 쓴 돈으로 세서, 현금 0 인 상회는 임금·원료를 못 내 운영비도 0 으로 보이고 주인이 채우지 않았다 (`finance.ts:569`·`:572`, d964485).
- 바뀐 것: `TUNE.firmCallPlan` 1 (기본, 0 = d964485 동작), `finance.ts opsDay` (흑자인 가동 중 생산 건물은 계획 운영비와 큰 쪽, DESIGN 9.3), 시험 `test/gate/firmcall.test.ts`, 마이크로 `cli/microcheck.ts --runs drain` (상회 현금을 720일부터 14일 동안 0 으로).
- 숫자 (0991755, 해마다 값은 DESIGN 11장 `firmCallPlan` 행): 마이크로 drain 6년 × 시드 1~4, 끄면 4/4 가 3년차부터 끝까지 현금 0 (원료 충족 0%), 켜면 4/4 가 다음 주 정산에 운전자금을 받아 4년차 원료 충족 99~100%. 본 게임 5년 × 시드 1, 현금 < 1 인 (회사·날) 111 → 0.
- 남은 것: 주인 금고(약정 뺀 돈)가 비면 그대로 굳는다. 적자 건물이 끌어내린 현금 0 은 막지 않는다. microA 발견 2 의 경로는 확인 못 함. 20년 비교는 하지 않았다 (값이 아니라 스위치, 다음 비교에 묶는다).
- main 에 합침 (e0499ef).

## 0-1102b. 2026-11-02 세션 끝 (사용자가 컴퓨터를 끔)
- main c952e65 (+284cb52 UI 명세)까지 푸시됨: wt-labor 병합(0b′, 기준 임금 재계산, 지역 시장 임금, 마이크로 도구, S7·S5·S8·D2 기본 켬). 시험은 사용자 지시로 typecheck·test:core 만 돌렸다. 새 기본값 대 옛 main 확인 비교(20년 × 시드 1·2 × salt 0..3)는 뒤에 했다: 보고서 2026-11-02-newdefaults (5d355c5).
- `wt-sim2` 는 main 에 합쳐짐 (d964485): UI_CHANGES 3장 sim 요청 셋(`subsistenceWage` export, 예산 국영 임금 상세를 지역 `Region.stateWages` 로, `wealthDrivers` export). 민간 회사 현금 0 함정은 wt-cash 로 옮김 (0-1102c).
- 사용자 결정 (2026-11-02): 왕실 생산 건물 임금 웃돈을 플레이어에게 열지 않는다 (UI_CHANGES 2-81, DECISIONS). 소작지 수확 체감(`tenantSlack`)은 메모만 (DECISIONS 7-38).
- Codex(herdr front, w1:p2)는 사용량 한도로 멈춤 (한도 해제 2026-11-02 03:22). 커밋 안 한 클라이언트 변경이 main 체크아웃에 남아 있다 (PolicyPanel.tsx, system-ui.css, 지도 파일 등): 건드리지 않는다. 한도가 풀리면 UI_CHANGES 0장(2-81·2-79·2-75·2-83 등)을 이어서 하게 한다. Codex 에 일을 보내기 전에 `herdr agent read front` 로 한도 문구를 먼저 본다.
- 정리 거리: git 워크트리 86개·브랜치 81개 (대부분 합쳐진 옛 것). 지우는 일은 사용자 확인 뒤.

## 0-1102. 2026-11-02: wt-labor 를 main 에 합칠 준비 (0b′ + 기준 임금 + 지역 시장 임금 + 마이크로 + 조합)
- 사용자 결정 (DECISIONS 7-38): "소작지 수확 체감은 일단 메모만 해 두고, all 의 나머지를 넣어서 메인에 합쳐 봐", "테스트는 일단 생략" → 확인 비교(새 기본값 대 main 20년 × salt 묶음)는 돌리지 않았다. 근거는 보고서 2026-11-02-combo (all 판, `tenantSlack` 0.5 포함).
- 이 브랜치가 가져오는 것:
  - 0b′ (옛 wt-0bp): 5-1 과잉 검사 `aiGlutSD` 1.5 (기본, 보고서 2026-11-01-0bp-glut). 5-2 `aiCutSD`·`aiDemoSD`, A1~A3 (`aiGlutIdle`·`aiSellDemoSD`·`aiMarginal`), A4 (`aiAdminFloor`·`aiAdminWage`) 는 스위치만 (기본 0). lab 지표.
  - 기준 임금 재계산 (DECISIONS 7-31, 보고서 2026-11-01-basewage): 노동자 = 기본가 소작 1인 소득 × `wageOutside`, 방식 숫자 `cli/rebasewage.ts` 로 약 0.35배, `MAX_POINTS_PER_LEVEL_DAY` 3.5, 사무소 포인트 0.7·1.4·2.1. DESIGN 11장 비교값 다수 "재검증 필요".
  - 화폐 누수 수정 (0b5f754, 아주 작은 가계 수요가 아무도 안 판 물건 값을 냄, `test/core/tinyDemand`).
  - **새 기본값**: 지역 시장 임금 `wageMarket` 1·`wageMarketRate` 0.0025 (DESIGN 7.3, `docs/overhaul/LABOR_MARKET.md`), `reserveGrowMax` 1, `aiKeepLastSupplier` 1 (S7), `aiGrowWhere` 1 (S5), `aiReserveFund` 1 (S8), D2 `wealthSavWeeks` 52·`wealthSavBuffer` 8·`wealthSavLower` 1. 끈 채: `tenantSlack` (메모), 재해 `quakeChance`, `startPopScale` 1, 저택 `manorTargetMult`·`manorGentrySeats`, 5-2, A1~A4.
  - 마이크로 세계 도구 (`src/lab` micro, `cli/microcheck.ts`, `cli/microjudge.ts`), 결과 `.tmp/lm/microA·microB·combo` (RESULT.md), 명세 `docs/overhaul/{LABOR,QUAKE,MANOR,COMBO}_SPECS.json`.
- main 병합 (959015b): 충돌 6곳. DECISIONS 는 main 7-29·7-30 다음에 wt-labor 7-31~7-37 (번호 안 겹침), DESIGN 11장 사무소 행은 양쪽 "재검증 필요" 를 다 남김, report.py 라벨·사전 import·lab/metrics 반환·보고서 목록은 양쪽 합침. 사무소 필요 포인트(`officeLoad`)는 포인트·`MAX_POINTS_PER_LEVEL_DAY`·자재가 함께 0.35배라 비율이 그대로 성립 (test/core/officeload 통과).
- 시험을 하나 고쳤다: `test/core/decimals.test.ts` 는 지역 시장 임금에서 회사 임금표(`Company.wages`, 지역 임금의 고용 가중 평균인 계산값)를 "보이는 값" 에서 뺀다 (DESIGN 2장 반올림 줄). 화면이 소수 둘째 자리로 보인다.
- 검증: `npm run typecheck`, `npm run test:core` (22 파일 70개), `methods_audit` 종료 0. 전체 vitest·장기·클라이언트 시험은 사용자 지시로 생략. 골든은 손대지 않음 (합친 뒤 `npm run golden:update`).
- 알려진 문제: 소작농이 0 에 가까워지면 노동자 소득이 무너지는 판 (사용자: 나중 확장 몫), 노동자가 소작보다 못 버는 기간 (7-33 수용), 민간 회사 현금 0 함정 (microA 발견 2, → 0-1102c wt-cash `firmCallPlan`), 완공 정산의 금고 음수 (0-1101b), README 의 AI 절은 옛 판단을 설명한다 (임금·국영 임금·부 줄만 고쳤다).
- 다음 할 일: (1)·(2) 끝남: wt-labor 병합 (golden c952e65), 확인 비교는 보고서 2026-11-02-newdefaults (5d355c5). DESIGN 11장 `wageMarket` 행에는 아직 안 더했다. (3) 민간 회사 현금 0 함정: wt-cash 에서 고침 (0-1102c, DECISIONS 7-40, `firmCallPlan`). (4) `tenantSlack` 다시 물을 때 근거는 2026-11-02-combo kgsd·all.
- wt-sim2 (2026-11-02, 284cb52 위): UI 요청 셋 처리 (`subsistenceWage`·`wealthDrivers` export, 예산 국영 임금 상세가 지역 시장 임금 × 단계, `WageDrillJob.marketWage`), DECISIONS 7-39 (왕실 웃돈 열지 않음). 민간 회사 현금 0 함정 (DECISIONS 7-40)은 wt-cash 로 넘김. main 에 합쳐짐 (d964485).
- **화면에 넘길 것 (ui-ux 가 UI_CHANGES 로 옮긴다)**:
  - 지역 시장 임금 표: 지역마다 직종별 `Region.wages` (노동자·농부·기술자·전문가·하급 귀족…) 와 소작 1인 소득 (`subsistenceWage`), 52주 평균 `Region.wageAvg`. 사전 `market-wage` 제목에서 "(비교 중)" 을 뺐다.
  - 국영 임금 상세: 정부 건물 임금 = 그 지역 시장 임금 × 국영 임금 단계 배율 (`Region.stateWages`, 매주). 왕실 `stateWages` 는 왕국 지역 평균 (대표값).
  - 회사 임금표: AI 임금 판단(`adjustWages`)이 돌지 않고 `Company.wages` 는 지역 임금의 고용 가중 평균 계산값 (반올림 안 됨 → 화면에서 소수 둘째 자리). 실제 지급은 지역 시장 임금 × (1 + 웃돈 `setWageOffset`, −50%~+100%) 이고 `setWage` 로 넣은 절대값은 지급에 쓰이지 않는다 (`economy.ts wagesAt`, 지역 임금이 있으면). 플레이어 임금 화면은 웃돈만 두는지 정한다.
  - 저축·부: 하층(소작농·노동자·농부)은 생활비 8주치를 넘는 저축 ÷ 52주가 부를 정하는 소득에 더해진다. pop 상세의 부 이동 줄에 이 몫을 보일지.
  - 재해 사건 열: `quakeChance` 기본 0 이라 지금은 안 나오지만 켜면 "지역 지진 소작지 −25% (3칸) · 1080일" 사건 (`quakeLabel`, `logEvent` warn), 사전 `tenant-disaster`.
  - 사무소 가동 비율: 이미 UI_CHANGES 2-78 (코드 완료).

## 0-1101c. 2026-11-01: 건축사무소는 필요한 만큼만 자재를 산다 (`wt-officeuse`)
- 사용자 결정 DECISIONS 7-30. 가동 비율 = min(1, 필요 포인트 ÷ 능력) (`production.ts officeNeed`·`officeLoad`). 자재 주문은 그 비율의 2일분 (`market.ts collectOrders`). 일자리·임금은 그대로. 규칙과 숫자: DESIGN 8장 "한 줄 규칙".
- 숫자 (main 974a705 대 ededa2d, 20년 × 시드 1·2 × salt 0~3, `cli/officecmp.ts`, 보고서 `2026-11-01-officeuse`): 버린 포인트 몫 22~47% → 1~6%. 사무소 목재 20년 평균 49,400 → 40,300/일. 사무소 손익 −60,700 → +64,600 (1년차), −2,300 → +7,100 (20년차). 포인트당 수수료 20년 평균 +21%. 국고는 8회 모두 5·10·20년차에 높다. 총생산 20년 평균은 8회 모두 높고, 5년차는 8회 중 3회만 높다.
- 열린 문제: `constructionEstimate`가 다 가동할 때의 비용으로 봐서 가동 비율이 낮으면 공사비를 싸게 본다 (사전 공사비 예시·건설 포인트 live도 "다 가동할 때"로 적고 오늘 가동 비율을 함께 보인다). 민간 금고가 내는 몫만큼의 포인트는 아직 버린다. 예산 미리보기는 오늘 포인트로 한 주를 센다. 사무소 능력 90 → 126 증가 원인은 진단하지 않았다. `officeShrinkWeeks`·`officeIdleDays`·`officeRichWeeks` 재검증 필요 (DESIGN 11장).
- 화면: UI_CHANGES 2-78 (사무소 원료 양에 가동 비율을 곱하고 산출 칸에 가동 비율을 보인다).

## 0-1101b. 2026-11-01: 장기 시험은 코드 문제만 판정 (`wt-tests`)
- 사용자 지시 (2026-11-01): "테스트에는 코딩적인 문제가 없는지만 점검하라. 데이터를 취득해서 나중에 로직에 문제가 없는지 본다" (DECISIONS 7-29).
- `test/long/longRun.ts`: 판정은 20년 완주, 화폐 보존(해마다 최대·끝 < 1e-9), 매일 상태 값 범위(`test/helpers.ts stateFlags`, `test/core/ranges.test.ts`와 함께 씀)만 한다. 뺀 단언: 4단계 기술 연도 ≥ 7, 소작농→노동자 이동 > 0, 노동자 식량 최저 > 35%·평균 > 80%. 이 값들은 이제 데이터로 남는다 (era4Y, mob["peasant>unskilled"], foodUnskMin·foodUnskAvg·foodUnsk).
- 데이터: `src/lab/metrics.ts` Collector가 해마다 쓰는 왕국별·대륙 줄을 `.tmp/test-data/long-<시드>.jsonl`에 남긴다 (첫 줄 meta: 커밋·dirty·음수 금고 날 수). `LONG_DATA=0`으로 끄고 `LONG_DATA_DIR`로 위치를 바꾼다. 보고서는 `python cli/report.py <id> ../../.tmp/test-data/long-1.jsonl ../../.tmp/test-data/long-2.jsonl`. `report.py` LAB에 라벨 4개를 더했다.
- 비용 (bb28119, 이 PC): tsx 시드 1 20년에서 수집기 3.9초 ÷ step 48.8초 = 약 8%. vitest test/long 두 시드 병렬은 끔 54초, 켬 64~72초 (두 번 잼).
- 알려진 문제 (판정 안 함, 콘솔·meta에서 셈): 민간 공사 완공 정산(`production.ts giveLevels`)이 약정 몫보다 레벨을 더 받은 저택·금융가의 금고를 확인하지 않고 차액을 빼서 금고가 음수가 된다 (시드 2, 226일, 저택 1046: 32만 → −25만). GitHub 이슈로 올리고 고칠지 정한다. 고치면 `stateFlags`의 건물 금고 검사를 `>= -1e-6`로 되돌린다.
- 문서: `docs/overhaul/10_ARCHITECTURE.md`·`06_INDUSTRY_TECH.md`·`11_ROADMAP.md`·`12_DECISIONS_NEEDED.md`·`01_VISION.md`·`00_INDEX.md`·`docs/NUMBERS_SPEC.md` 8장·`.claude/agents/tester.md`의 `tier4 ≥ 7`·식량 하한 기준 문장에 시험에서 빠졌다고 적었다 (D10-S11은 이 지시로 답이 났다).

## 0-1101. 2026-11-01: 문서 정리 (`wt-docs`, 문서만, sim·client 코드 안 바꿈)
- HANDOFF 의 2026-10-19 ~ 10-25 세션 절(464줄)을 `docs/log/HANDOFF_2026-10-18_to_10-25.md` 로 잘라 옮겼다. 날짜가 붙은 UI 기록 9개를 `docs/log/` 로 옮겼다 (`UI_IMPLEMENTATION.md` → `UI_IMPLEMENTATION_2026-10-18.md`). 목록은 `docs/log/README.md`.
- UI_CHANGES·UI_DESIGN 13장·UI_STATUS 의 링크를 `log/` 로 고쳤다. CLAUDE.md 문서 목록에 `docs/log/` 를 더했고, 화면 규칙의 지금 기준은 `docs/UI_DESIGN.md` 라고 적었다.
- 남은 일: `docs/UI_WINDOWS_2026-10-28.md` 는 사용자 PC main 체크아웃에 커밋 안 한 수정이 있어 아직 안 옮겼다. 화면 작업자가 그 수정을 커밋한 뒤 `docs/log/` 로 옮기고, UI_DESIGN.md:126·UI_STATUS.md:10·UI_DONE.md:465 의 참조를 고친다.

## 0-1101-basewage. 기준 임금 재계산 (`wt-basewage`, 06bab20 위, wt-labor 에 들어가 0-1102 로 합친다)

- 사용자 결정 2026-11-01 (DECISIONS 7-31): 기본 임금 = 기본가 소작 1인 하루 소득 2.95 (`data.ts tenantIncomeAtBase`) × `wageOutside` 1.2 → 0.5 단위 3.5. 기술자 5.5, 하급 귀족 10.5, 전문가·자본가·상급 귀족 14 (`ruleBaseWage`, `methods_audit` 9번 규칙).
- 방식 숫자는 `cli/rebasewage.ts`로 다시 셌다 (일꾼 그대로, 원료·산출·공사 포인트 약 0.35배). 사무소 포인트 0.7·1.4·2.1, `MAX_POINTS_PER_LEVEL_DAY` 3.5, 학교 300·행정청 150·사무소 50, 전문 관료제 종이 70. `methods_audit` 통과.
- 시드 1 × salt 0 × 10년 (06bab20 → 이 브랜치): 곡물 S/D 10년차 1.65 → 1.34, 농장 이익률 59% → 10%, 노동자 생활수준 2.96 → 1.28, 세전 총생산 296 → 242. 표는 DECISIONS 7-31. 묶음 비교는 안 했다.
- 남은 일: DESIGN 11장 비교값 61개 "재검증 필요". `financeWage` 20(전문가 기본 임금 14보다 높음), `START_CASH`·`START_FIRM_CASH`(레벨 공사비가 약 0.35배라 상대적으로 약 3배), 국영 임금 단계 AI 문턱(임금 지수 1)은 값 그대로. 합치기 전 premerge, 합친 뒤 `npm run golden:update`.

## 0-1030. 2026-10-30 세션: 오버홀 설계 문서, A0 안전망, 0a AI 난수 분리

**오버홀 설계 (`docs/overhaul/`, main 9b46c2d)**: 경제 샌드박스 틀(사용자 고정). 시작점은 `00_INDEX.md`, 실행 순서는 `11_ROADMAP.md`, 사용자 결정 Q1~Q20 은 `12_DECISIONS_NEEDED.md`.

**A0 안전망 (`wt-a0`)**: 결과 비트 동일 (samecheck 해시가 고치기 전후 같음). 바뀐 것:
- core 시험 5개 (`test/core/`): `readonly`(읽기 함수가 세계를 안 바꿈, 얼린 세계에서도 돎), `roundtrip`(JSON 왕복·migrateWorld 동일, JSON 손실 없음), `ratchet`(돈 이동 줄 수: ±= 48줄, 대입 30줄, 파일별 표), `mathgrep`(엔진 의존 수학 허용 목록 5곳), `layers`(read/save/lab 위쪽 import 금지). 합 약 6초.
- gate 시험 (`test/gate/`, test:core 밖, 전체 `vitest run` 에는 들어감): `migrate`(고정 저장 파일 둘을 불러 30일, 화폐 보존), `interleave`(두 세계 번갈아 = 따로, 7초). 묶을 명령은 사용자 결정 Q10 대기라 package.json·CLAUDE.md 는 안 고침.
- 고정 저장 파일 (`test/fixtures/`): `save-v18-100d-9b46c2d.json.gz`(80 KB), `save-v18-8y-9b46c2d.json.gz`(0.5 MB, 명령열 `commands-a0.json` 25줄: 연구 5개, 세율 단계, 국영 임금, 학교·무역소·농장 착공, 법 전환 6번, 국채 발행). 0a 뒤에는 만들 수 없는 옛 판 저장이다. 만드는 도구 `cli/makefixtures.ts`.
- `cli/samecheck.ts`: 입력 셋 5개(1년 × 시드 1·2, 5년 × 시드 1, 명령열 5년, 8년 저장 + 30일)의 세계 해시. 두 커밋 비교는 worktree 둘에서 각각 돌려 출력 파일을 비교 (약 23초). 커버리지(Node 내장 V8)로 주조·국채 한도·발행·상환·이자·임금 범위 줄을 모두 지나감을 확인.
- `economy.ts totalMoney`: `mapMoney(w, x => x)` 로 돈 칸에 같은 값을 되쓰던 것을 읽기만 하게 고침 (같은 계정을 같은 순서로 더해 합은 비트까지 같음). 얼린 세계에서 TypeError 가 나던 읽기 함수 계약 위반.
- 장부 닫힘 탐침 (`docs/overhaul/A0_PROBE.md`, 9b46c2d, 시드 7, 3년 매일): 지금 기록(받은 6종·세금·소비)만으로는 안 닫힌다 (기타 하루 최대 비율 1.0). 기록 없는 이동 5종(소작농 초과 저축 → 저택 금고 market.ts:838, 지분 매입 :849, 직종 이동·왕국 간 이주 pops.ts:143, 상속 :171, 사망 → w.fund :176)을 더하면 하루 최대 1.1e-15 로 닫힌다 (왕국 합·왕국별 모두). 그래서 01 P3 약속 범위는 "장부 닫힘 전체"로 추천. 소작농으로 내려온 사람의 저축이 바로 저택 금고로 가서 (2년차 순유입 4,275만 = 그해 금고 이동 5,346만의 80%), 장부에 이동 줄을 같이 보여야 한다.
- 예산 미리보기 실패 2개: 9b46c2d 에서 재현 안 됨 (8개 통과). 52b37e3 에서 사용자 결정으로 시험이 바뀌었다. 0704b3f 에서 재현한 원인: 국영 임금을 올리면 그 주에 사무소 고용이 늘어 수수료가 오르는 반응을 미리보기가 안 넣음 (임금 3→5 오차 0.386), 왕실 공사가 없는 왕국은 분모가 작아 국영 사업 한 줄이 오차 100%. 남은 약점: 대신 들어온 시험은 거의 항등식이라 단계 변경 반응을 안 본다.
- 관찰 (안 고침): 시드 1 에서 구빈법(poor) 하나가 시행 두 달 만에 왕실 국고 33M 을 비웠다 (주간 복지 1.69M, 세수 64k, makefixtures 8년 실행). 8년 끝 빚 39.8M 이 한도 30.6M 을 넘었다 (CLAUDE.md 대로 GitHub 이슈로 올려야 한다. premerge 고침 때 자동 모드가 외부 쓰기를 막아 아직 안 올림).

- 미반영: `docs/UI_CHANGES.md` "별도 이슈"의 `budget.test.ts:85` 실패 줄은 지난 상태다 (위 원인 참조). 화면 작업자가 main 에서 이 파일을 커밋하지 않고 고치는 중이라 이번 병합에서 빼 두었다. 그 사람의 변경이 커밋된 뒤 고친다.

**0a AI 난수 분리 (`wt-0a`, 2026-10-30)**: 기준선이 한 번 바뀐다 (세계 규칙은 같음). 사용자가 "계속 해봐"라 해서 Q3 은 추천안(Math.pow 고정을 함께)으로 진행했다. 다르게 정하면 커밋 f67358b(ipow)·58e49ae(골든 첫 항목)를 빼고 `npm run golden:update`.
- `rng/aiRand.ts`: AI 난수 4곳(연구, 증설, 손해 후보, 착공 점수)을 고정 키 해시로. 착공 점수는 한 주에 같은 후보를 최대 3번 평가해 부름 순번을 키에 넣었다. `config.aiSalt`·`rulesRev`·`rulesHash` 선택 칸 (저장 판 18 그대로, 옛 저장은 0·0·'' 로 채움). `createWorld(seed, { aiSalt })`.
- `rng/ipow.ts`: market·data·pops 의 Math.pow / ** 3곳.
- `save/rulesHash.ts`, `cli/golden.ts`, `packages/sim/golden.json` (규칙 판 = 이력 길이, 첫 항목 a651ba7ff55c4165), `npm run golden:update`.
- 판정 (보고서 2026-10-30-0a-judge, 20년 × 시드 1~4 × salt 0~3 대 0a 직전 main 9007b10 시드 1~4): 16회 모두 장기 시험 기준 통과. 4단계 기술 10~15년 (직전 11~14), 노동자 식량 최저 0.72~0.87 (직전 0.83~0.89), 화폐 어긋남 ≤ 7.8e-14. 20년차 소작농 비중은 같은 시드에서 salt 만 바꿔도 크게 갈린다 (시드 2: 0.445~0.721). 직전 값이 salt 4개 범위 밖인 것은 시드 3(0.336, 범위 0.383~0.440)·시드 4(0.677, 범위 0.510~0.612), 단서일 뿐이다 (효과 0 이어도 밖일 확률 40%).
- 대조 측정 (보고서 2026-10-30-0a-probe, docs/overhaul/0A_PROBE.md, 5년 × 시드 1·2): 0a 직전엔 효과 없이 난수 하나만 더 써도 salt 를 바꾼 것만큼 갈라졌다 (salt 28쌍 간격 분포에서 평균 분위 0.52). 0a 뒤 burn 쌍은 비트까지 같다. 정당화("처방과 무관한 분기를 없앤다") 유지, Q3 을 다시 물을 조건 아님. null: 5지표 × 5년 효과 판정의 가족 단위 오경보율 45% (판정 하나 3.0%, 이론 2.86%), 거짓 단서율 44%(수준)·69%(변화량). 0b 에서 판정을 미리 하나로 정하거나 K·연수를 키워야 한다.
- 0a 이전 보고서 36개의 설명 앞에 "[AI 난수 분리 전]" 을 달았다 (tools/reports/public/data/index.json). DESIGN 11장 머리에 "재검증 필요 (조건 바뀜: AI 난수 분리 전)" 줄을 달았다 (칸마다 달지는 않음).
- 곁가지 관찰 (확인 안 함): 두 코드 모두 곡물 가격비가 5년 안에 기본가 0.35~0.43배로 내려가고 총생산이 2년차에 약 25% 떨어진다.
- 오버홀 기준선: main be7e72f (0a 를 합친 main 끝 커밋, 빨리 감기라 병합 커밋은 따로 없다). 0b 측정은 이 커밋에서 했고, 0b′ 가 AI 기준선을 새로 적기 전까지 '끔 = 같음' 검사의 기준이다.
- 숫자 기대값이 박힌 것: `packages/sim/golden.json`(규칙 해시 a651ba7ff55c4165), `test/fixtures/a0.ts` HASH_EXCLUDE(config.rulesHash·rulesRev), `test/gate/migrate.test.ts` 선택 칸 기본값, samecheck 해시(0a 뒤 새로 잼).

**0b 측정 (`wt-0b`, 2026-10-30)**: sim 세계 코드는 그대로, 측정 도구와 결과만. 판정 기준은 실행 전에 커밋했다 (`docs/overhaul/0B_PREREG.md`, 7c45da7). 결과 전체: `docs/overhaul/0B_RESULTS.md` (1장 기준선, 2장 동사). 보고서 2026-10-30-0b-base, 2026-10-30-0b-levers.
- 도구: `src/lab/`(run.ts 명세 → 해마다 왕국별 줄, metrics.ts 관측 전용, forceLaw·drain·매크로), `cli/lab.ts`·`lab.sh`(병렬), `cli/labsum.py`(대역·단서·효과·E7·통과 기준·거짓 단서율·빈 해), `cli/labspecs.py` → `docs/overhaul/0B_SPECS.json`. lab 관측을 켜도 세계 해시가 같다 (test/gate/lab.test.ts).
- 실행: 1차 142회(18.6분, PAR 10) + 2차 195회(1차 단서 65개 × salt 1..3, 27분). 조건 main be7e72f, 플레이어 방치 + 고정 연구 순서.
- 통과 기준: a) 곡물·섬유·목재·석탄·의복은 네 시드 모두 연평균 S/D ≥ 2 가 5년 이상. 곡물값은 11~20년차 지역·날의 36~100% 가 하한 0.25 (40년도 그대로). 공급 증가는 회사 곡물 농장 증설 (10년에 15~23 → 198~276레벨), AI 증설이 시장 S/D 를 안 봄 (`ai.ts:1143`). b) 노동자 20/20년 하한 위, 소작농 7~18년. c) 총생산의 "2년차 25~30% 하락"은 연말 하루 표본 탓이고 한 해 흐름(gdpPre)은 1→2년차 +12~26%. d) 완주. e) 노동자를 올리는 동사 있음 (임금 연동 복지법, 투자법 lower), 내리는 플레이어 동사 없음. 소작농을 올리는 동사는 복지법(시드 2, +0.09, 국고 0·부채 한도 2배)뿐, 내리는 동사 없음.
- 지대율 0~20%(X04-E1)는 소작 현금은 크게 바꾸지만(판매 대금 −62%) 생활수준은 1.07~1.10 그대로: 현물 우선(market.ts:206), 생활수준 바닥 1(economy.ts:636), 8주 넘는 저축 거둠(market.ts:833~841). 사용자 결정 Q1(소작 빈곤 원칙)의 입력.
- 모든 복지법이 5년 안에 왕실 국고를 0으로 만든다 (이슈 #9 와 같은 현상, 원인은 0B_RESULTS 2.9). 강제 인두세는 시드 1 총생산을 1/8 로 (플레이어는 ironworking 뒤 상한 검사 없이 고를 수 있다, commands.ts:249~255).
- 검출력: 노동자 생활수준은 K=4 대역이 카드 단위의 1.3~2.9배라 "효과 없음"은 '못 잼'. 국고 카드 단위 100백만은 국고 크기(30~40백만)보다 커서 다시 정해야 한다. 0a null 가족 오경보 45%, 0b 거짓 단서율 38%.
- E7 (해마다 변하는가): 빈 해 지표 다섯 중 소작 비율·징수율·곡물 가격비·노동자 생활수준 통과, 실업 0/12. **빈 해 계산은 사용자 확인 대기** (사전 등록 4장).
- 못 한 것: 브라우저 비용(X01-d, 사용자 브라우저 필요), A6 20년 24회·be.tax4 8회(2차 후보), 방식 처방은 5년 안에 철공구가 안 열려 사실상 "공방 짓기"였다.

**0b′ 진행 중 (2026-10-30 세션 끝, 사용자 사정으로 중단. 그 뒤 5-1 은 1.5 로 정했고 wt-labor 에 들어가 0-1102 로 합친다)**: 브랜치 `wt-0bp` (origin 에 올림, 커밋 8a31e51, main 4062a92 위). main 에 아직 안 합침.
- 한 것: 03 5-1 과잉 신호 구현. `reserveLevels` 가 증설 확률을 뽑은 뒤 같은 지역·산출 상품의 예상 S/D(`economy.ts projectedSD`: 공급 이동평균 + 공사 중 레벨 산출, ÷ 수요 이동평균)가 `TUNE.aiGlutSD` 를 넘으면 그 주 증설 안 함. 기본 0 = 검사 없음이라 결과 비트 동일 (golden "같음", samecheck 5개 같음, core·gate 73개 통과). 짧은 확인(1.5, 2년 × 시드 1): 막힌 증설 1년차 9건·2년차 56건, 유보 증설 59→54·87→56레벨.
- 함께 바꾼 것: lab 지표 추가(해 안 S/D 진동 폭, 팔린 비율, 실제/설계 이익률, 귀족 저축, 금고와 증가율, 공사 약정, 52주 안에 헐린 레벨, 저택 거둠, 행정청 인원, glutBlock), labsum 고침(명세의 대조 사용, 중복 판정 제거, drain 은 충격 뒤 5년차로 판정 — 이 해석은 확인 필요), `labsum.py --compare g0` 후보 비교 모드. DESIGN 10·11장(aiGlutSD 행, expandUtilMin 재검증 필요), 사전 aiGlutSD.
- **다음 할 일 (차례대로)**: (1) wt-0bp 에서 5년 비교 32회 `cd packages/sim && bash cli/lab.sh <out5.jsonl> ../../docs/overhaul/0BP_5-1_SPECS.json` → `python cli/labsum.py <out5.jsonl> --compare g0` (g0 / 1.25 / 1.5 / 1.75 × 시드 1·2 × salt 0..3). (2) 남은 후보로 20년 32회 `KEY=specs20 bash cli/lab.sh ...`. 채택 제한: 1.5·1.75 는 52주 안에 헐린 레벨이 늘면 채택 안 함 (03 5장 1번). 기대 방향: S/D 증가 둔화. (3) 고른 값을 DESIGN 11장 근거 칸에 적고 premerge → main. (4) 이어서 07 A4(세금 단계 끝값 고착·징수율 0)·A6(임금 배율 20년 24회)·A5, 0B_RESULTS 2장 "0b′ 에 넘길 것". (5) 0b′ 끝에 기준선 재측정, 그 커밋을 'AI 기준선'으로 여기에 적는다.
- 사용자 답 대기: 빈 해 지표 4개(소작 비율·징수율·곡물 가격비·노동자 생활수준) 확인, Q10(시험 분류). 0c 묶음 질문은 0b′ 뒤.

**옛 세션에서 넘어온 할 일** (2026-11-01 HANDOFF 정리 때 `docs/log/HANDOFF_2026-10-18_to_10-25.md` 에서 옮김. 끝난 것은 뺐다: 하층 기준선 `growthEq.lower` → 1 (0704b3f), 예산 미리보기 시험 실패 원인 (위 A0 절))
- 노동자 임금이 소작농 소득 수준으로 내려감: 소작지 곡물 ×1.5·×2, `TUNE.wageOutside` 1.2·1.5·2 20년 비교 (0-1025 다음 할 일 1). `wageOutside` 는 아직 1.2. 확인 필요 (0b 임금 배율 측정·A6 과 겹침).
- 2026-10-25 에 비교·premerge 없이 합친 것의 문서·근거 정리 (0-1025 다음 할 일 2, 알려진 문제). 확인 필요.
- 고부가 산업·철: 사치품 시장이 작고 철 수요가 늦음, 철물(대장간) 상품 추가는 사용자 미결정 (0-1025 다음 할 일 4).
- 가공업 원료 비중 50% → 기본 35% / 윗단계 50% 안, 사용자 미결정 (0-1025 다음 할 일 5).
- 하드코딩 숫자 정리 (`wt-rules` 예정, data.ts `RULES`): data.ts 에 `RULES` 없음, 확인 필요 (0-1025 다음 할 일 6, 오버홀 설계와 겹칠 수 있음).
- 운송 수요 키우기, 미결정 (0-1025 다음 할 일 7).
- 지역 간 교역 개편 (사용자 보류, "이동할 때마다 돈이 드는 방식" 선호), AI 가 철광산을 적게 지음: 확인 필요 (0절 2026-10-21, 5번).
- 옛 절 "1. 사용자 원칙 (CLAUDE.md에 없는 것)" (화면 설명 문구 금지, 양피지 + 도트 스타일, 정보는 막대로, 삭제 명령 금지 등)은 로그로 옮겼다. 대부분 CLAUDE.md·`docs/UI_DESIGN.md` 에 있다.
