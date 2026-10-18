// 왕국별 경제 규모: 인구, 현금 소득, 현물(기본가), 세금, 국고 수지
import { GOODS, companyById, createWorld, regionById, step } from '../src/index';
import { LEDGER_KEYS } from '../src/types';
const seed = Number(process.argv[2] ?? 1), days = Number(process.argv[3] ?? 30);
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d < days; d++) step(w);
const M = (v: number) => `${(v / 1e6).toFixed(1)}M`;
for (const k of w.kingdoms) {
  let pop = 0, cash = 0, kind = 0;
  for (const p of w.pops) {
    if (regionById(w, p.regionId).kingdomId !== k.id) continue;
    pop += p.size; cash += p.incomeEma;
    for (const [g, q] of Object.entries((p as any).inKind ?? {})) kind += (q as number) * GOODS[g as keyof typeof GOODS].basePrice;
  }
  const gov = companyById(w, k.governmentId)!;
  const led = LEDGER_KEYS.map((x) => `${x} ${M((gov.lastLedger as any)[x] * 52)}`).join(' ');
  console.log(`${k.nameEn} pop ${(pop / 1e6).toFixed(2)}M cash/yr ${M(cash * 360)} kind/yr ${M(kind * 360)} taxDue/yr ${M((k.taxDue ?? 0) * 360)} cap/yr ${M((k.taxCapacity ?? 0) * 360)} gov cash ${M(gov.cash)}`);
  console.log('  gov/yr ' + led);
}
