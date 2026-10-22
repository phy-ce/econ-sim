// 숫자 점검: 건물 방식별 일자리 1개당 산출·투입 가치, 부가가치, 민간 공사비(첫 사무소 방식 수수료), 회수 기간 (기본가 기준)
import { BUILDING_BY_ID, GOODS, SKILL_DEFS, SKILLS, officeFeeMult } from '../src/index';
import type { GoodBag } from '../src/index';
const val = (b: GoodBag) => Object.entries(b).reduce((a, [g, q]) => a + (q ?? 0) * GOODS[g as keyof typeof GOODS].basePrice, 0);
const office = BUILDING_BY_ID.builder.methods[0];
const officeWorkers = SKILLS.reduce((a, s) => a + (office.workers[s] ?? 0), 0);
const officeWage = SKILLS.reduce((a, s) => a + (office.workers[s] ?? 0) * SKILL_DEFS[s].baseWage, 0);
const costPerPoint = (val(office.inputs) + officeWage) / office.construction!;
const feePerPoint = costPerPoint * officeFeeMult(office.id);
console.log(`office(${office.id}) ${office.construction} pts/day, ${officeWorkers} workers, cost/pt ${costPerPoint.toFixed(2)}, fee/pt ${feePerPoint.toFixed(2)} (material ${(val(office.inputs) / office.construction!).toFixed(2)} + wage ${(officeWage / office.construction!).toFixed(2)})`);
console.log('method'.padEnd(20), 'jobs', 'out/job', 'in/job', 'wage/job', 'VA/job', 'pts/job', 'fee$/lvl', 'payback(d)');
for (const t of Object.values(BUILDING_BY_ID)) {
  if (t.auto) continue;
  for (const m of t.methods) {
    const jobs = SKILLS.reduce((a, s) => a + (m.workers[s] ?? 0), 0);
    const wage = SKILLS.reduce((a, s) => a + (m.workers[s] ?? 0) * SKILL_DEFS[s].baseWage, 0);
    const out = val(m.outputs), inp = val(m.inputs);
    const build = t.buildPoints * feePerPoint;
    const profit = out - inp - wage;
    console.log(m.id.padEnd(20), String(jobs).padStart(4), (out / jobs).toFixed(2).padStart(7), (inp / jobs).toFixed(2).padStart(6), (wage / jobs).toFixed(2).padStart(8), ((out - inp) / jobs).toFixed(2).padStart(6), (t.buildPoints / jobs).toFixed(0).padStart(7), build.toFixed(0).padStart(10), (profit > 0 ? (build / profit).toFixed(0) : '-').padStart(9));
  }
}
