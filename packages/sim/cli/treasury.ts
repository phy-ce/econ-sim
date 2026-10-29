// 왕실 국고 진단: npx tsx cli/treasury.ts '<TUNE JSON>' [seed] [years]
// 해마다 왕국별 국고·빚 변화, 정책 단계와 임금 지수, 1년 국정 수지(lastBudget 키 그대로: 세입·관세 / 행정청·학교 임금·원료·이자·복지·왕실 공사(build) / 국영 사업 손익(firms, 그중 사무소 office)·민간 수수료(fees, 지표용))와
// 1년 장부(세입·지출 항목), 왕실 건물 종류별 인건비+원료를 하루 평균으로 출력한다
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { LEDGER_KEYS } from '../src/types';

Object.assign(TUNE, JSON.parse(process.argv[2] ?? '{}'));
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
const w = createWorld(seed, { withPlayer: false });
const govs = w.kingdoms.map((k) => w.companies.find((c) => c.id === k.governmentId)!);
type Acc = { ledger: Record<string, number>; budget: Record<string, number>; byType: Record<string, number>; cash0: number; debt0: number };
const fresh = (): Acc[] => govs.map((g) => ({ ledger: {}, budget: {}, byType: {}, cash0: g.cash, debt0: g.debt }));
let acc = fresh();
const r0 = (x: number) => Math.round(x / 360);
for (let d = 1; d <= years * 360; d++) {
  step(w);
  govs.forEach((g, i) => {
    for (const b of w.buildings) if (b.companyId === g.id) acc[i].byType[b.typeId] = (acc[i].byType[b.typeId] ?? 0) + b.last.wageCost + b.last.inputCost;
    if (w.tick % 7 !== 0) return;
    for (const k of LEDGER_KEYS) acc[i].ledger[k] = (acc[i].ledger[k] ?? 0) + g.lastLedger[k];
    for (const [k, v] of Object.entries(w.kingdoms[i].lastBudget ?? {})) { if (typeof v === 'number') acc[i].budget[k] = (acc[i].budget[k] ?? 0) + v; }
  });
  if (d % 360 !== 0) continue;
  console.log(`== ${d / 360}년 (하루 평균)`);
  govs.forEach((g, i) => {
    const k = w.kingdoms[i], a = acc[i];
    const led = LEDGER_KEYS.filter((x) => a.ledger[x]).map((x) => `${x} ${r0(a.ledger[x])}`).join(', ');
    const bud = Object.entries(a.budget).map(([x, v]) => `${x} ${r0(v)}`).join(', ');
    const bt = Object.entries(a.byType).sort((x, y) => y[1] - x[1]).map(([t, v]) => `${t} ${r0(v)}`).join(', ');
    const weeks = (k.expenseEma ?? 0) > 0 ? (g.cash / k.expenseEma!).toFixed(0) : '-';
    console.log(`왕국${k.id} ${k.taxLaw} 세금${k.budget.tax} 임금${k.budget.wages} 지수${k.wageIndex ?? '-'} 징수${k.taxRatio ?? 0} | 순자산 ${r0(g.cash - g.debt - a.cash0 + a.debt0)}/일 (현금 ${Math.round(g.cash)}, 빚 ${Math.round(g.debt)}, 지출 ${weeks}주치) 경제 ${Math.round((k.output ?? 0) / 7)}/일`);
    console.log(`  국정 수지: ${bud}`);
    console.log(`  장부: ${led}`);
    console.log(`  건물 운영비: ${bt}`);
  });
  acc = fresh();
}
