/**
 * 정수 지수 거듭제곱 (오버홀 0a, docs/overhaul/10_ARCHITECTURE.md 4.2).
 * Math.pow·** 는 IEEE 754 가 결과를 정하지 않아 엔진(브라우저·Node)마다 마지막 비트가 다를 수 있다. 곱셈은 정해져 있으므로
 * 곱셈 순서를 코드로 고정해 어디서나 같은 값을 낸다 (mathgrep.test.ts 가 sim 의 Math.pow·** 를 막는다). 지수는 0 이상 정수만 받는다.
 */

function checkExp(n: number) {
  if (!(n >= 0 && Number.isInteger(n))) throw new Error(`ipow: 지수는 0 이상 정수 (${n})`);
}

/** x 를 n 번 곱한다 (작은 지수: 지수 10 이면 곱셈 10번) */
export function ipow(x: number, n: number): number {
  checkExp(n);
  let r = 1;
  for (let i = 0; i < n; i++) r *= x;
  return r;
}

/** 이진 거듭제곱 (큰 지수: 360 이면 곱셈 약 12번). 지수의 낮은 비트부터 r *= b, b *= b 순서로 곱한다 */
export function ipowBin(x: number, n: number): number {
  checkExp(n);
  let r = 1, b = x;
  for (let k = n; k > 0; k = Math.floor(k / 2)) {
    if (k % 2 === 1) r *= b;
    if (k > 1) b *= b;
  }
  return r;
}
