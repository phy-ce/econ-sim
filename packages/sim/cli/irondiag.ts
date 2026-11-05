// 철 체인 진단: bash cli/fast.sh irondiag.ts [seed] [years] [salt]   (TUNE 은 환경변수 TUNE='{"key":value}')
// 해마다 왕국마다: 철 체인 기술을 연 해, 철광산·제철소·기계 공장 레벨, 광석·철·기계 공급·수요·값·값이 뜨거운 주,
// 잠재 방식: 기술이 열렸고 일손이 되고 지금 값으로 지금 방식보다 낫지만 투입재가 없어(inputsAvailable) 못 고르는 건물 레벨 합.
// 공급 쪽: 그 왕국에서 철광산·제철소 1레벨을 지금 값으로 지을 때의 하루 손익 최대와, 지을 수 있는 지역 수.
import { BUILDING_BY_ID, BUILDING_TYPES, GOODS, TICKS_PER_YEAR, getMethod, overrideTune } from '../src/data';
import { availableMethods, companyById, estimateMethod, harvestFactor, knowsTech, roomFor, wagesAt } from '../src/economy';
import { createWorld, step } from '../src/index';
import { laborAvailability } from '../src/staffing';
import { TUNE } from '../src/data';
import type { GoodId, MethodDef, World } from '../src/types';

if (process.env.TUNE) overrideTune(JSON.parse(process.env.TUNE), 'cli/irondiag');
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10), salt = Number(process.argv[4] ?? 0);
const w = createWorld(seed, { withPlayer: true, aiSalt: salt });
const CHAIN: GoodId[] = ['ore', 'metal', 'electronics'];
const TECHS = ['bloomery', 'guilds', 'ironworking', 'coking', 'steam_engine'];
const techYear = new Map<string, number>();

const spare = (g: GoodId) => w.regions.reduce((a, r) => a + r.market[g].supplyEma - r.market[g].demandEma, 0);
const blocked = (m: MethodDef, lv: number) => (Object.entries(m.inputs) as [GoodId, number][]).filter(([g, per]) => spare(g) < per * lv * 0.5).map(([g]) => g);

function report(y: number) {
  for (const k of w.kingdoms) {
    const regs = w.regions.filter((r) => r.kingdomId === k.id);
    const gov = companyById(w, k.governmentId)!;
    for (const t of TECHS) if (knowsTech(gov, t) && !techYear.has(`${k.id}|${t}`)) techYear.set(`${k.id}|${t}`, y);
    const lv = (id: string) => w.buildings.filter((b) => b.typeId === id && regs.some((r) => r.id === b.regionId)).reduce((a, b) => a + b.level, 0);
    const latent: Record<string, number> = {};
    const by: Record<string, number> = {};
    for (const b of w.buildings) {
      if (!regs.some((r) => r.id === b.regionId) || BUILDING_BY_ID[b.typeId].auto) continue;
      const c = companyById(w, b.companyId); if (!c) continue;
      const wages = wagesAt(c, b.typeId, w, b.regionId);
      const cur = estimateMethod(w, b.regionId, b.typeId, b.methodId, wages, c.state).profit;
      for (const m of availableMethods(c, b.typeId)) {
        if (m.id === b.methodId) continue;
        const miss = blocked(m, b.level);
        if (!miss.length) continue;
        const v = estimateMethod(w, b.regionId, b.typeId, m.id, wages, c.state).profit;
        const key = `${m.id}<${miss.join('+')}`;
        by[key] = (by[key] ?? 0) + b.level;
        if (v > cur) latent[key] = (latent[key] ?? 0) + b.level;
      }
    }
    const supply: Record<string, string> = {};
    for (const id of ['mine', 'smelter', 'machine_works']) {
      const t = BUILDING_TYPES.find((x) => x.id === id) ?? BUILDING_TYPES.find((x) => x.methods.some((m) => m.outputs.electronics && id === 'machine_works'));
      if (!t) continue;
      let best = -Infinity, sites = 0, staffed = 0, bestM = '';
      for (const r of regs) {
        if (roomFor(w, r.id, t.id) < 1 || harvestFactor(w, r.id, t.land) < 1) continue;
        sites++;
        for (const m of availableMethods(gov, t.id)) {
          if (laborAvailability(w, r, m, 1, true) >= TUNE.minStaffing) staffed++;
          const v = estimateMethod(w, r.id, t.id, m.id, wagesAt(gov, t.id, w, r.id), true).profit;
          if (v > best) { best = v; bestM = m.id; }
        }
      }
      supply[t.id] = `${bestM} ${Number.isFinite(best) ? Math.round(best) : '-'} sites ${sites} staffed ${staffed}`;
    }
    console.log(JSON.stringify({ y, k: k.id, gov: k.governmentId, cash: Math.round(gov.cash / 1e6), debt: Math.round(gov.debt / 1e6), lv: { mine: lv('mine'), smelter: lv('smelter'), coal: lv('coal_mine') }, latent, by, supply }));
  }
  const g: Record<string, unknown> = {};
  for (const x of [...CHAIN, 'tools', 'paper'] as GoodId[]) {
    const S = w.regions.reduce((a, r) => a + r.market[x].supplyEma, 0), D = w.regions.reduce((a, r) => a + r.market[x].demandEma, 0);
    const p = w.regions.reduce((a, r) => a + r.market[x].price, 0) / w.regions.length / GOODS[x].basePrice;
    const hot = Math.max(...w.regions.map((r) => r.hotWeeks?.[x] ?? 0));
    g[x] = { S: Math.round(S), D: Math.round(D), p: +p.toFixed(2), hot };
  }
  console.log(JSON.stringify({ y, goods: g, tech: Object.fromEntries(techYear) }));
}
void getMethod;
let snap = 0;
const iron = (id: string) => /tools_iron|build_steel|machine_steam/.test(id);
const WATCH = new Set(['mine', 'smelter', 'fab']);
import { aiTrace } from '../src/ai';
if (process.env.EV) aiTrace.on = (ww, c, path, typeId, methodId, levels) => { if (WATCH.has(typeId) || iron(String(methodId))) console.error(`T d${ww.tick} ${path} ${typeId} ${methodId} x${levels} c${c.id}`); };
const seenLv = new Map<number, string>();
function events() {
  for (const b of w.buildings) {
    if (!WATCH.has(b.typeId) && !iron(b.methodId)) continue;
    const key = `${b.level}|${b.methodId}`;
    if (seenLv.get(b.id) !== key) {
      seenLv.set(b.id, key);
      if (process.env.EV) console.error(`d${w.tick} y${(w.tick / TICKS_PER_YEAR).toFixed(1)} ${b.typeId}#${b.id} r${b.regionId} c${b.companyId} L${b.level} ${b.methodId} st ${b.last.staffing.toFixed(2)} fill ${b.last.inputFill.toFixed(2)} ema ${Math.round(b.profitEma)} res ${Math.round(b.reserve ?? 0)}`);
    }
  }
  if (process.env.EV && (++snap) % 8 === 0) for (const b of w.buildings) if (WATCH.has(b.typeId)) console.error(`  s d${w.tick} ${b.typeId}#${b.id} r${b.regionId} L${b.level} ${b.methodId} act ${b.active} ut ${b.utilization.toFixed(1)} st ${b.last.staffing.toFixed(2)} emp ${Object.entries(b.employed).filter(([, v]) => v).map(([k, v]) => k[0] + Math.round(v as number)).join('')} fill ${b.last.inputFill.toFixed(2)} ema ${Math.round(b.profitEma)} res ${Math.round(b.reserve ?? 0)} starve ${b.starvedWeeks ?? 0} shr ${b.shrinking ?? 0} p ${Object.keys(getMethod(b.typeId, b.methodId).outputs).map((g) => w.regions.find((r) => r.id === b.regionId)!.market[g as GoodId].price.toFixed(2))} sold ${Math.round(b.last.revenue)} cost ${Math.round(b.last.inputCost + b.last.wageCost)}`);
  for (const id of [...seenLv.keys()]) if (id > 0 && !w.buildings.some((b) => b.id === id)) { seenLv.delete(id); if (process.env.EV) console.error(`d${w.tick} GONE #${id}`); }
  for (const k of w.constructions) if (WATCH.has(k.typeId) && !seenLv.has(-k.id)) { seenLv.set(-k.id, 'c'); if (process.env.EV) console.error(`d${w.tick} START ${k.typeId} r${k.regionId} c${k.companyId} x${k.levels ?? 1} ${k.methodId}`); }
}
for (let y = 1; y <= years; y++) {
  for (let t = 0; t < TICKS_PER_YEAR; t++) { step(w); if (t % 7 === 0) events(); }
  report(y);
}
