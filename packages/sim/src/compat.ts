import { roundAll, roundWorld, writeMirrors } from './round';
import type { Building, Company, Shipment, World } from './types';

// 화면 호환용 껍데기와 옛 저장 변환. 껍데기는 sim 에서 없앤 제도들이다. 화면이 UI_CHANGES 2-17 을 반영하면 껍데기는 지운다.

/** 부실 제도는 없앴다: 늘 false */
export function isDistressed(_w: World, _c: Company): boolean {
  return false;
}
export const SEIZURE_WEEKS = 1;
export const DISTRESS_DEBT_RATIO = 1;

/** 소작지 지주 자리는 없다 (지대는 저택 귀족이 현금으로 받는다): 늘 0 */
export function landlordJobs(_b: Building): number {
  return 0;
}

/** 연구비는 예산 편성으로 정한다. 화면의 예상 일수 계산용으로만 남긴 값 */
export const MAX_RESEARCH_BUDGET = 100_000;

/** 옛 이름(규칙 단위) 필드가 있으면 100배 값으로 새 이름에 옮긴다. 없으면 이미 지금 모양이라 그대로 둔다 */
function to100(o: object, from: string, to: string): void {
  const rec = o as Record<string, unknown>;
  const v = rec[from];
  // 100배 값이 이미 있으면 옛 이름의 값은 화면 표시용 사본이다 (round.ts 가 다시 쓴다)
  if (typeof v !== 'number' || typeof rec[to] === 'number') return;
  rec[to] = v * 100;
  delete rec[from];
}

/**
 * 저장 파일을 지금 형식(6판)으로 바꾼다 (불러오기 직후에 부른다). 지금 형식이면 그대로 돌려준다. 4판보다 옛 형식은 바꿀 수 없다 (null).
 * 4·5 → 6 (저장값 소수 둘째 자리). 5판은 이 변경의 중간 판이다: 부·문해력·교육 접근도는 이미 100배 값이고,
 * 건물의 숙련도·작업 인원은 규칙 단위이거나(먼저 나온 5판) 이미 100배 값이다. 그래서 판 번호가 아니라 필드마다 옛 이름이 있으면 바꾼다:
 * - pop 의 부·문해력, 지역의 교육 접근도, 건물의 숙련도·작업 인원을 100배 값으로 (wealth100, literacy100, education100, exp100, crew100)
 * - 상인 화물을 시장마다 새 화물·묵은 화물 하나씩으로 합친다 (지금 규칙과 같은 모양. 이미 합친 목록은 그대로다)
 * - 모든 숫자를 소수 둘째 자리로 (round.ts roundWorld: 돈 계정의 센트 아래는 주인 없는 돈으로 가서 화폐 장부가 그대로다). 기록도 맞춘다
 * 지금 모양인 5판은 판 번호만 바뀐다 (반올림은 이미 맞춘 값을 그대로 둔다)
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as World & { version: number };
  if (!w || typeof w !== 'object') return null;
  if (w.version === 6) { writeMirrors(w); return w; }
  if (w.version !== 4 && w.version !== 5) return null;
  for (const p of w.pops) { to100(p, 'wealth', 'wealth100'); to100(p, 'literacy', 'literacy100'); }
  for (const r of w.regions) to100(r, 'education', 'education100');
  for (const b of w.buildings) { to100(b, 'exp', 'exp100'); to100(b, 'crew', 'crew100'); }
  w.traders.shipments = mergeShipments(w.traders.shipments);
  // 출처별 수요·공급처럼 roundWorld 가 따로 훑지 않는 (쓸 때 반올림하는) 값까지 한 번 모두 맞춘다
  roundAll(w.regions);
  for (const h of w.history) roundAll(h);
  for (const m of w.metrics ?? []) roundAll(m);
  w.version = 6;
  roundWorld(w);
  return w;
}

/** 같은 (도착 지역, 상품, 묵은 화물인가) 의 화물을 하나로 합친다 (처음 나온 순서) */
function mergeShipments(list: Shipment[]): Shipment[] {
  const out: Shipment[] = [];
  const at = new Map<string, Shipment>();
  for (const sh of list) {
    const k = `${sh.to}|${sh.good}|${sh.stale ? 1 : 0}`;
    const hit = at.get(k);
    if (hit) hit.q += sh.q;
    else { const s: Shipment = { ...sh }; at.set(k, s); out.push(s); }
  }
  return out;
}
