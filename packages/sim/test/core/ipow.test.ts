// 정수 거듭제곱 (오버홀 0a, docs/overhaul/10_ARCHITECTURE.md 4.2): 곱셈 순서를 고정해 엔진마다 같은 비트를 낸다
import { describe, expect, it } from 'vitest';
import { ipow, ipowBin } from '../../src/rng/ipow';

describe('ipow', () => {
  it('ipow 는 x 를 n 번 차례로 곱한 값과 비트까지 같다', () => {
    for (const x of [0.3, 0.97, 1, 1.0001, 2.5]) {
      let r = 1;
      for (let n = 0; n <= 12; n++) {
        expect(ipow(x, n)).toBe(r);
        r *= x;
      }
    }
  });

  it('ipowBin 은 낮은 비트부터 곱한 값과 같고, Math.pow 와 상대 1e-12 안에서 같다', () => {
    const x = 1 + 1.3e-4;
    // 360 = 0b101101000: 비트 3·5·6·8 의 x^(2^k) 를 이 순서로 곱한다
    const sq: number[] = [x];
    for (let k = 1; k <= 8; k++) sq.push(sq[k - 1] * sq[k - 1]);
    expect(ipowBin(x, 360)).toBe(((1 * sq[3]) * sq[5]) * sq[6] * sq[8]);
    for (const [b, n] of [[x, 360], [0.999, 360], [1.5, 7], [3, 0], [0.5, 1]] as const) {
      expect(Math.abs(ipowBin(b, n) / Math.pow(b, n) - 1)).toBeLessThan(1e-12);
      expect(Math.abs(ipow(b, n) / Math.pow(b, n) - 1)).toBeLessThan(1e-12);
    }
  });

  it('정수가 아니거나 음수인 지수는 받지 않는다', () => {
    expect(() => ipow(2, 1.5)).toThrow();
    expect(() => ipowBin(2, -1)).toThrow();
  });
});
