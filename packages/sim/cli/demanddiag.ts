// 주민 수요 진단: bash cli/fast.sh demanddiag.ts [seed] [years] > 파일   (TUNE 은 환경변수 TUNE='{"key":value}')
// 해마다 한 줄 (cli/report.py 가 읽는다): 총생산·인구·기본가 산출, 운송·종이·정밀 기기와 철 사슬 상품의 공급·수요·값 (한 해 주마다 평균),
// 주민 수요 (pop: 몫), 건물 레벨, 그 상품을 만들 기술을 연 왕국 수. 값은 지역 평균 ÷ 기본가, 판매율은 팔린 양 ÷ 공급 (한 해 평균).
import './lowprio';
import { BUILDING_BY_ID, GOODS, GOOD_IDS, TICKS_PER_YEAR, TUNE, overrideTune } from '../src/data';
import { companyById, kingdomGdp, knowsTech } from '../src/economy';
import { createWorld, step } from '../src/index';
import type { GoodId } from '../src/types';

if (process.env.TUNE) overrideTune(JSON.parse(process.env.TUNE), 'cli/demanddiag');
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10);
const w = createWorld(seed, { withPlayer: false });
const WATCH: GoodId[] = ['transport', 'paper', 'electronics', 'furniture', 'metal', 'ore', 'fuel', 'tools', 'timber'];
const TECH: Record<string, string> = { transport: 'wagonway', paper: 'printing', electronics: 'steam_engine' };
const LV = ['railway', 'paper_mill', 'fab', 'smelter', 'mine', 'coal_mine', 'furniture', 'lumber', 'workshop'];
const f = (x: number, n = 2) => +x.toFixed(n);
void TUNE;
for (let y = 1; y <= years; y++) {
  const acc: Record<string, { S: number; D: number; H: number; sold: number; p: number; pmin: number; pmax: number }> = {};
  for (const g of WATCH) acc[g] = { S: 0, D: 0, H: 0, sold: 0, p: 0, pmin: 0, pmax: 0 };
  let weeks = 0;
  for (let t = 0; t < TICKS_PER_YEAR; t++) {
    step(w);
    if (t % 7 !== 3) continue;
    weeks++;
    for (const g of WATCH) {
      const a = acc[g];
      let pmin = Infinity, pmax = 0;
      for (const r of w.regions) {
        const m = r.market[g], q = m.price / GOODS[g].basePrice;
        a.S += m.supplyEma; a.D += m.demandEma; a.sold += m.sold; a.p += q / w.regions.length;
        pmin = Math.min(pmin, q); pmax = Math.max(pmax, q);
        for (const [k, v] of Object.entries(m.demandByEma ?? {})) if (k.startsWith('pop:')) a.H += v;
      }
      a.pmin += pmin; a.pmax += pmax;
    }
  }
  const row: Record<string, unknown> = { y, seed };
  row.gdpY = f(w.kingdoms.reduce((a, k) => a + kingdomGdp(w, k.id), 0) / 1e6);
  row.pop = f(w.pops.reduce((a, p) => a + p.size, 0) / 1e6, 3);
  let outV = 0;
  for (const r of w.regions) for (const g of GOOD_IDS) outV += r.market[g].supplyEma * GOODS[g].basePrice;
  row.outV = f(outV / 1e6, 3);
  row.levels = w.buildings.filter((b) => !BUILDING_BY_ID[b.typeId].auto).reduce((a, b) => a + b.level, 0);
  row.cash = f(w.kingdoms.reduce((a, k) => a + (companyById(w, k.governmentId)?.cash ?? 0), 0) / 1e6);
  row.debt = f(w.kingdoms.reduce((a, k) => a + (companyById(w, k.governmentId)?.debt ?? 0), 0) / 1e6);
  const size = w.pops.reduce((a, p) => a + p.size, 0);
  row.wealth = f(w.pops.reduce((a, p) => a + p.size * p.wealth, 0) / size);
  row.w6 = f(w.pops.filter((p) => p.wealth >= 6).reduce((a, p) => a + p.size, 0) / size, 3);
  for (const g of WATCH) {
    const a = acc[g];
    row[`S.${g}`] = Math.round(a.S / weeks); row[`D.${g}`] = Math.round(a.D / weeks); row[`H.${g}`] = Math.round(a.H / weeks);
    row[`sd.${g}`] = f(a.D > 0 ? a.S / a.D : 0); row[`p.${g}`] = f(a.p / weeks); row[`pmin.${g}`] = f(a.pmin / weeks); row[`pmax.${g}`] = f(a.pmax / weeks);
  }
  for (const t of LV) row[`lv.${t}`] = w.buildings.filter((b) => b.typeId === t).reduce((a, b) => a + b.level, 0);
  for (const [g, tech] of Object.entries(TECH)) row[`open.${g}`] = w.kingdoms.filter((k) => knowsTech(companyById(w, k.governmentId)!, tech)).length;
  console.log(JSON.stringify(row));
}
