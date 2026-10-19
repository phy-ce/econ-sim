import { roundAll, roundWorld } from './round';
import type { Building, Company, Pop, Region, Shipment, World } from './types';

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

/** 4판 저장의 pop·지역 (부·문해력·교육 접근도가 규칙 단위 그대로였다) */
type PopV4 = Omit<Pop, 'wealth100' | 'literacy100'> & { wealth: number; literacy: number };
type RegionV4 = Omit<Region, 'education100'> & { education: number };

/**
 * 저장 파일을 지금 형식으로 바꾼다 (불러오기 직후에 부른다). 지금 형식이면 그대로 돌려준다. 그보다 옛 형식은 바꿀 수 없다 (null).
 * 4 → 5 (저장값 소수 둘째 자리):
 * - pop 의 부·문해력, 지역의 교육 접근도를 100배 값으로 (wealth100, literacy100, education100)
 * - 상인 화물을 시장마다 새 화물·묵은 화물 하나씩으로 합친다 (지금 규칙과 같은 모양)
 * - 모든 숫자를 소수 둘째 자리로 (round.ts roundWorld: 돈 계정의 센트 아래는 주인 없는 돈으로 가서 화폐 총량이 그대로다). 기록도 맞춘다
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as World & { version: number };
  if (!w || typeof w !== 'object') return null;
  if (w.version === 5) return w;
  if (w.version !== 4) return null;
  w.pops = (w.pops as unknown as PopV4[]).map(({ wealth, literacy, ...rest }) => ({ ...rest, wealth100: wealth * 100, literacy100: literacy * 100 }));
  w.regions = (w.regions as unknown as RegionV4[]).map(({ education, ...rest }) => ({ ...rest, education100: education * 100 }));
  w.traders.shipments = mergeShipments(w.traders.shipments);
  // 출처별 수요·공급처럼 roundWorld 가 따로 훑지 않는 (쓸 때 반올림하는) 값까지 한 번 모두 맞춘다
  roundAll(w.regions);
  for (const h of w.history) roundAll(h);
  for (const m of w.metrics ?? []) roundAll(m);
  w.version = 5;
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
