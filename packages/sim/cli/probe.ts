// 빠른 점검: 연도별 직종 인구·부, 실업, 회사, 화폐 보존, 건물, 가격
import { GOOD_IDS, GOODS, POP_CLASSES, createWorld, colonyPopulation, colonySol, kingdomGdp, moneyIdentity, step, totalMoney, unemploymentRate } from '../src/index';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 3), every = Number(process.argv[4] ?? 90);
const w = createWorld(seed, { withPlayer: false });
console.log('kingdoms', w.regions.map((r) => `${r.id}:${r.kingdomId}`).join(' '));
const m0 = moneyIdentity(w);
const t0 = Date.now();
for (let d = 1; d <= 360 * years; d++) {
  step(w);
  if (d % every === 0) {
    const cls = POP_CLASSES.map((s) => `${s.slice(0, 4)} ${Math.round(colonyPopulation(w, s) / 1000)}k w${colonySol(w, s).toFixed(1)}`).join(' | ');
    const gdp = w.kingdoms.reduce((a, k) => a + kingdomGdp(w, k.id), 0);
    const px = GOOD_IDS.reduce((a, g) => a + w.regions.reduce((b, r) => b + r.market[g].price, 0) / w.regions.length / GOODS[g].basePrice, 0) / GOOD_IDS.length;
    const m = w.mint;
    const sav = w.pops.reduce((a, p) => a + p.savings, 0), cc = w.companies.reduce((a, c) => a + c.cash, 0);
    console.log(`  money ${(totalMoney(w) / 1e6).toFixed(1)}M (pops ${(sav / 1e6).toFixed(1)}M cos ${(cc / 1e6).toFixed(1)}M) gdp ${(gdp / 1e6).toFixed(0)}M/y px ${px.toFixed(2)} | mint ${(m.minted / 1e6).toFixed(1)}M debt+${(m.issued / 1e6).toFixed(1)}M -${(m.retired / 1e6).toFixed(1)}M int ${(m.interest / 1e6).toFixed(2)}M`);
    console.log(`d${d} ${cls} | unemp ${(unemploymentRate(w, 'unskilled') * 100).toFixed(0)}% pops ${w.pops.length} drift ${((moneyIdentity(w) - m0) / m0).toExponential(1)} ${((Date.now() - t0) / d).toFixed(1)}ms`);
  }
}
console.log(w.companies.map((c) => `${c.name} ${Math.round(c.cash / 1000)}k/${Math.round(c.debt / 1000)}k t${c.research.known.length}`).join(' | '));
const lv: Record<string, number> = {};
for (const b of w.buildings) lv[b.methodId] = (lv[b.methodId] ?? 0) + b.level;
console.log(Object.entries(lv).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('price×base: ' + GOOD_IDS.map((g) => `${g} ${(w.regions.reduce((a, r) => a + r.market[g].price, 0) / w.regions.length / GOODS[g].basePrice).toFixed(2)}`).join(' '));
console.log('pools', w.kingdoms.map((k) => Math.round(k.investmentPool)).join(','), 'fund', Math.round(w.fund), 'bank', Math.round(w.bank.cash / 1000) + 'k', 'traders', Math.round(w.traders.cash / 1000) + 'k');
const ev = w.events.filter((e) => /파산|압류|은행 관리/.test(e.text));
console.log('distress events (last 300):', ev.length, ev.slice(-5).map((e) => `t${e.tick} ${e.text.slice(0, 40)}`).join(' / '));
console.log('taxes', w.kingdoms.map((k) => `${k.name} ${k.incomeTax.lower.toFixed(2)}/${k.incomeTax.middle.toFixed(2)}/${k.incomeTax.upper.toFixed(2)}`).join(' | '));
