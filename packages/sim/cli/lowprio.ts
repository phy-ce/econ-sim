// 비교 실행(lab·sweep)은 PC 의 다른 일보다 뒤에 돈다: 이 프로세스의 우선순위를 '보통 이하'로 내린다 (LOWPRIO=0 이면 끔).
// 계산 결과에는 영향이 없다 (CPU 를 받는 순서만 바뀐다). Windows 는 BELOW_NORMAL_PRIORITY_CLASS, 유닉스는 nice 10.
import { constants, setPriority } from 'node:os';

if (process.env.LOWPRIO !== '0') {
  try {
    setPriority(constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    // 권한이 없으면 그대로 둔다
  }
}
