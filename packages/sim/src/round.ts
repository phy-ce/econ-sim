import { round2 } from './rng';
import type { World } from './types';

// 반올림은 플레이어에게 보이는 값에만 한다 (CLAUDE.md). sim 이 계산하고 저장하는 값은 반올림하지 않는다 (저장 JSON 의 double 은 그대로 돌아온다).
// - 기록(history·metrics)은 화면 그래프와 표에 그대로 나가므로 쓸 때 소수 둘째 자리로 맞춘다 (roundAll)
// - 화면 표시용 사본 Kingdom.investmentPool 은 하루 끝에 소수 둘째 자리로 다시 쓴다 (writePool)

/** 소수 둘째 자리 (−0 은 0) */
const r = (x: number) => round2(x) + 0;

/** 왕국 투자 풀 칸 (화면 호환용 사본, 소수 둘째 자리): 그 왕국 저택·금융가 금고의 합. 하루 끝과 불러오기 뒤에 쓴다 */
export function writePool(w: World): void {
  const pool = new Map<number, number>();
  const kOf = new Map(w.regions.map((x) => [x.id, x.kingdomId] as const));
  for (const b of w.buildings) if (b.cash !== undefined && (b.typeId === 'manor' || b.typeId === 'finance')) { const k = kOf.get(b.regionId) ?? 0; pool.set(k, (pool.get(k) ?? 0) + b.cash); }
  for (const k of w.kingdoms) k.investmentPool = r(pool.get(k.id) ?? 0);
}

/** 기록(화면에 그대로 나가는 값) 안의 모든 숫자를 소수 둘째 자리로 (제자리에서, −0 은 0) */
export function roundAll(o: object): void {
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) {
      const v: unknown = o[i];
      if (typeof v === 'number') o[i] = r(v);
      else if (typeof v === 'object' && v !== null) roundAll(v);
    }
    return;
  }
  const rec = o as Record<string, unknown>;
  for (const k in rec) {
    const v = rec[k];
    if (typeof v === 'number') rec[k] = r(v);
    else if (typeof v === 'object' && v !== null) roundAll(v);
  }
}
