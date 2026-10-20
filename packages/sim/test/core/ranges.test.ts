import { describe, expect, it } from 'vitest';
import { GOOD_IDS, GOODS, WEALTH_MAX, createWorld, moneyIdentity, step, wealthOf } from '../../src/index';

describe('경제 불변식: 범위', () => {
  // 매일 모든 값을 본다. expect 를 값마다 부르면 그 비용이 시뮬레이션보다 커서, 어긋난 값을 모아 그날 끝에 한 번에 판정한다.
  // 비교는 !(a >= b) 꼴로 써서 NaN 도 어긋남으로 잡는다 (expect 와 같은 판정)
  it('가격·현금·저축·부 단계가 정상 범위를 벗어나지 않는다', () => {
    const w = createWorld(3);
    const m0 = moneyIdentity(w);
    const bad: string[] = [];
    const flag = (msg: string) => { if (bad.length < 20) bad.push(`${w.tick}일 ${msg}`); };
    for (let i = 0; i < 360 * 2 && bad.length === 0; i++) {
      step(w);
      for (const r of w.regions) for (const g of GOOD_IDS) {
        const price = r.market[g].price;
        if (!(price >= GOODS[g].basePrice * 0.25 - 1e-9)) flag(`지역 ${r.id} ${g} 가격 ${price} < 기본가 × 0.25`);
        if (!(price <= GOODS[g].basePrice * 1.75 + 1e-9)) flag(`지역 ${r.id} ${g} 가격 ${price} > 기본가 × 1.75`);
      }
      for (const p of w.pops) {
        if (!(p.savings >= -1e-6)) flag(`pop ${p.id} 저축 ${p.savings}`);
        if (!(wealthOf(p) >= 1)) flag(`pop ${p.id} 부 ${wealthOf(p)} < 1`);
        if (!(wealthOf(p) <= WEALTH_MAX)) flag(`pop ${p.id} 부 ${wealthOf(p)} > ${WEALTH_MAX}`);
        if (!Number.isFinite(p.size)) flag(`pop ${p.id} 인구 ${p.size}`);
      }
      for (const c of w.companies) if (!(c.cash >= -1e-6)) flag(`회사 ${c.id} 현금 ${c.cash}`);
      if (!(w.traders.cash >= -1e-6)) flag(`무역상 현금 ${w.traders.cash}`);
      // 다른 시드에서도 화폐 보존을 매일 본다 (덤, 거의 공짜)
      if (!(Math.abs(moneyIdentity(w) - m0) / m0 < 1e-9)) flag(`화폐 장부 어긋남 ${moneyIdentity(w) - m0}`);
    }
    expect(bad).toEqual([]);
  });
});
