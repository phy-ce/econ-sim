# Kingdom of Estera (econ-sim)

[English](README.md) | **한국어**

**브라우저에서 플레이:** https://phy-ce.github.io/econ-sim/
· [규칙 백과](https://phy-ce.github.io/econ-sim/encyclopedia/)
· [실험 리포트](https://phy-ce.github.io/econ-sim/reports/)

근세 대륙의 시장 경제를 다루는 경영 게임입니다. 에스테라, 벨로니아, 카르텐 세 왕국이 일곱 지역을 나눠 갖고, 플레이어는 에스테라 왕실을 맡습니다. 경제 루프는 Victoria 3에서 영감을 받았지만, 규칙과 수치는 이 게임의 독자적인 설계입니다.

UI는 양피지와 픽셀 아트 스타일의 대시보드이며, 한국어와 영어를 지원합니다.

## 특징

- **살아 있는 경제:** 약 500만 명의 시뮬레이션 인구가 세 왕국과 일곱 지역에서 일하고, 먹고, 저축하고, 이주하고, 직업을 바꿉니다.
- **같은 명령 경로:** AI 왕실과 기업도 플레이어와 같은 검증된 명령으로 행동합니다.
- **테스트된 시뮬레이션:** 화폐 보존, 저장·불러오기를 포함한 결정성, 값 범위를 검사하고, 20년 실행으로 장기 진행을 돌려 봅니다.
- **공개된 규칙과 데이터:** 규칙 백과는 값을 코드에서 읽어 오고, 실험 리포트는 규칙별 결과를 시드별로 비교합니다.

## 실행

```bash
npm install
npm run dev          # 로컬에서 플레이 (http://localhost:5173)
npm run build        # 클라이언트 프로덕션 빌드
npm run typecheck    # 시뮬레이션과 클라이언트 타입 검사
npm run test:core    # 화폐 보존, 결정성, 값 범위 테스트
npm run test:long    # 시드 1, 2의 20년 실행
npm test             # 전체 시뮬레이션 테스트
```

조작: `Space`로 일시정지와 재개, `1`~`5`로 속도를 바꿉니다.

## 구조

```text
packages/sim           순수 TypeScript 시뮬레이션 (IO 없음, 시드 기반 난수, 직렬화 가능한 상태)
packages/client        React + Vite. 시뮬레이션은 Web Worker에서 실행
packages/encyclopedia  규칙 백과
tools/reports          실험 리포트 뷰어
```

## 상세 규칙

세계, 기술, 건설, 계층, 화폐, AI의 상세 규칙은 [영어 README](README.md#world)와 [규칙 백과](https://phy-ce.github.io/econ-sim/encyclopedia/)에 정리되어 있습니다. 진단 도구와 실험 리포트 작성법도 영어 README를 참고하세요.

## 아트

모든 픽셀 아트는 이 프로젝트의 오리지널입니다. [ASSETS.md](packages/client/public/ASSETS.md)를 참고하세요.

## 라이선스

Copyright 2026 phy-ce. [Apache License 2.0](LICENSE)으로 배포합니다. 재배포할 때는 저작권 표시, 라이선스, [NOTICE](NOTICE) 파일을 유지하고 변경 사항을 밝혀야 합니다.
