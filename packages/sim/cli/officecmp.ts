// 건축사무소 자재·포인트 비교: npx tsx cli/officecmp.ts <저장소 루트> <seed> <salt> <이름> [years]   (packages/sim 에서)
// lab runSpec 과 같은 실행(플레이어 왕국, 고정 연구 순서)에 사무소 지표를 날마다 더해 해마다 한 줄(대륙 합)을 낸다.
// 저장소 루트를 받아 그 체크아웃의 src 를 불러오므로, 옛 커밋의 worktree 와 지금 코드를 같은 스크립트로 비교할 수 있다.
// 2026-11-01 사무소 가동 비율 비교 (DESIGN 8장, 보고서 2026-11-01-officeuse): 이름 old = main 974a705 worktree, new = wt-officeuse,
// 시드 1·2 × salt 0~3, 20년. 보고서는 줄마다 k: 'all' 을 더하고 seed 를 seed + 10 × salt 로 바꿔 cli/report.py 에 넣었다.
// 지표: use.<상품> 사무소 자재 사용(하루), officeProfit 사무소 손익(하루), fee 수수료, made 만든 포인트, used 공사에 쓰인 포인트(buildUsed 에서 되돌림),
// cap 능력(자재 충족·가동 비율 전), waste = 1 − used ÷ made, feePerPt = fee ÷ used, idleShare 쉬는 레벨 비율, price·sd 는 lab 수집기 값.
import { pathToFileURL } from 'node:url';
const [root, seedS, saltS, name, yearsS] = process.argv.slice(2);
const src = (f: string) => pathToFileURL(`${root}/packages/sim/src/${f}`).href;
const { createWorld, step } = await import(src('index.ts'));
const { getMethod, TICKS_PER_YEAR } = await import(src('data.ts'));
const { efficiency } = await import(src('economy.ts'));
const { Collector } = await import(src('lab/metrics.ts'));
const { applyFixedResearch } = await import(src('lab/run.ts'));
const { PLAYER_ID } = await import(src('world.ts'));
const seed = Number(seedS), salt = Number(saltS), years = Number(yearsS ?? 20);
const w = createWorld(seed, { withPlayer: true, aiSalt: salt });
const col = new Collector(w, { run: name, seed, salt });
const GOODS = ['timber', 'tools', 'fiber', 'ore', 'metal'];
const z = () => ({ use: Object.fromEntries(GOODS.map((g) => [g, 0])) as Record<string, number>, buy: 0, wage: 0, fee: 0, rev: 0, made: 0, used: 0, cap: 0, days: 0, idleLv: 0, lv: 0 });
let acc = z();
const end = years * TICKS_PER_YEAR;
while (w.tick < end) {
  applyFixedResearch(w, PLAYER_ID);
  const before = new Map<number, number>();
  for (const c of w.companies) if (c.state) before.set(c.id, c.buildUsed ?? 0);
  step(w);
  acc.days++;
  for (const c of w.companies) if (c.state && before.has(c.id)) acc.used += ((c.buildUsed ?? 0) - 0.9 * before.get(c.id)!) / 0.1;
  for (const b of w.buildings) {
    if (!b.active) continue;
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) continue;
    const eff = efficiency(b);
    const runFill = (b.last.points ?? 0) / (m.construction * eff);
    for (const g of GOODS) acc.use[g] += (m.inputs[g] ?? 0) * runFill;
    acc.buy += b.last.inputCost; acc.wage += b.last.wageCost; acc.fee += b.last.fee ?? 0; acc.rev += b.last.revenue;
    acc.made += b.last.points ?? 0;
    acc.cap += m.construction * b.level * b.utilization * (b.crew ?? 0) * eff;
    acc.lv += b.level; if (b.idle) acc.idleLv += b.level;
  }
  const rows = col.after(w);
  const all = rows.find((r: any) => r.k === 'all');
  if (all) {
    const d = acc.days;
    const out: Record<string, unknown> = {
      run: name, seed, salt, y: all.y,
      gdp: all.gdp, treasury: all.treasury, govCash: all['stock.gov'], govDebt: all['stock.govDebt'],
      officeProfit: (acc.rev - acc.buy - acc.wage) / d, fee: acc.fee / d, buy: acc.buy / d, wage: acc.wage / d,
      made: acc.made / d, used: acc.used / d, cap: acc.cap / d, useRate: acc.cap > 0 ? acc.used / acc.cap : null, madeRate: acc.cap > 0 ? acc.made / acc.cap : null,
      waste: acc.made > 0 ? 1 - acc.used / acc.made : null, feePerPt: acc.used > 0 ? acc.fee / acc.used : null, idleShare: acc.lv > 0 ? acc.idleLv / acc.lv : null,
    };
    for (const g of GOODS) { out[`use.${g}`] = acc.use[g] / d; out[`price.${g}`] = (all.price as any)?.[g] ?? null; out[`sd.${g}`] = (all.sd as any)?.[g] ?? null; }
    process.stdout.write(JSON.stringify(out) + '\n');
    acc = z();
  }
}
