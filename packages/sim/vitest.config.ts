import { defineConfig } from 'vitest/config';
import { BaseSequencer } from 'vitest/node';
import type { WorkspaceSpec } from 'vitest/node';

/**
 * 20년 실행(test/long)을 먼저 띄운다. 전체 시간은 가장 긴 파일 하나가 정하므로,
 * 긴 파일이 먼저 자리를 잡고 짧은 파일들은 남은 일꾼에서 그동안 끝난다.
 */
class LongFirst extends BaseSequencer {
  async sort(files: WorkspaceSpec[]) {
    const sorted = await super.sort(files);
    const isLong = (f: WorkspaceSpec) => /[\\/]test[\\/]long[\\/]/.test(f.moduleId);
    return [...sorted.filter(isLong), ...sorted.filter((f) => !isLong(f))];
  }
}

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // 시뮬레이션은 순수 계산이라 스레드로 충분하다 (fork 보다 띄우는 비용이 작다)
    pool: 'threads',
    // 일꾼 4개: 20년 파일 2개 + 짧은 파일들을 나눠 맡는 2개. 더 늘려도 가장 긴 파일보다 빨라지지 않고,
    // 같은 기계를 쓰는 다른 작업만 느려진다. 바꾸려면 VITEST_MAX_THREADS 로 덮어쓴다.
    poolOptions: { threads: { minThreads: 1, maxThreads: Number(process.env.VITEST_MAX_THREADS ?? 4) } },
    sequence: { sequencer: LongFirst },
    // 모든 시험은 동기 계산이다. 시간 제한은 비동기 시험에만 걸리지만 넉넉히 둔다
    testTimeout: 600_000,
  },
});
