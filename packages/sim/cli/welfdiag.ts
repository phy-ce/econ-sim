// 복지 진단: npx tsx cli/welfdiag.ts [seed] [years] '<TUNE JSON>'
// 해마다 왕국별: 국고(백만), 주간 지출(천), 국고 주치, 정책 단계, 복지법, 지난주 복지(천), 법별 1·3·5단계 주간 예상(천)·모자란 사람(천)
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { welfareShortOf, welfareWeekly } from '../src/welfare';
import type { WelfareLaw } from '../src/types';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 8);
Object.assign(TUNE, JSON.parse(process.argv[4] ?? '{}'));
const w = createWorld(seed, { withPlayer: false });
const laws: WelfareLaw[] = ['poor', 'wage', 'universal'];
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (d % 360 !== 0) continue;
  for (const k of w.kingdoms) {
    const g = w.companies.find((c) => c.id === k.governmentId)!;
    const exp = k.expenseEma ?? 0;
    const est = laws.map((l) => `${l[0]}:${[1, 3, 5].map((s) => `${Math.round(welfareWeekly(k, l, s) / 1e3)}/${Math.round(welfareShortOf(k, l, s) / 1e3)}`).join(' ')}`).join(' | ');
    console.log(`y${d / 360} k${k.id} cash ${(g.cash / 1e6).toFixed(1)}M exp ${Math.round(exp / 1e3)}k wk ${exp > 0 ? Math.round(g.cash / exp) : '-'} steps ${JSON.stringify(k.budget)} law ${k.welfareLaw}${k.lawChange?.welfare ? '->' + k.lawChange.welfare.to : ''} paid ${Math.round((k.lastBudget?.welfare ?? 0) / 1e3)}k rev ${Math.round((k.lastBudget?.revenue ?? 0) / 1e3)}k research ${g.research.current ?? '-'} | ${est}`);
  }
}
