// 복지법 국고 진단 (이슈 #9): npx tsx cli/welfmon.ts <법 none|poor|wage|universal> [seed] [salt] [years] ['<TUNE JSON>'] [복지 단계]
// 0b levers 의 m.welfareLaw.* 명세와 같은 조건 (플레이어 있음, 0일에 플레이어 왕국 복지법 forceLaw, 연구는 사전 등록 고정 순서, 복지 단계는 시작값.
// 단계를 주면 0일에 setBudget 명령으로 바꾼다, lab 명세의 budget.welfare 와 같다)으로 돌리고
// 30일마다 플레이어 왕국 한 줄 JSON 을 낸다:
//   m 달, cash 국고, debt 빚, lim 국채 한도, dl 빚 ÷ 한도, gdp 연 총생산, rev 그달 세입(세금+관세+주조), mint 그달 주조, wel 그달 복지 지급,
//   wr 복지 ÷ (세입 − 주조), need 복지 필요액 하루 이동평균 × 30 (지금 법·단계), unpaid 그달 못 낸 이자 추정(빚에 쌓인 몫), wages 그달 정부 건물 임금,
//   solP 소작농 생활수준, solU 노동자 생활수준 (플레이어 왕국 인구 가중), welShare 하층(소작농·노동자) 그달 소득 중 복지 비율,
//   foodP·foodU 소작농·노동자 식량, low 생활수준 1.25 미만 인구 비율 (왕국 전체), pop 인구, gdpPre 그달 세전 소득 합 (임금·배당·지대·판매, 복지 뺌),
//   welP 그달 복지 중 소작농 몫,
//   ai 다른 왕국마다 [복지법, 복지 단계, 국고(백만), 빚 ÷ 한도]
import './lowprio';
import { overrideTune } from '../src/data';
import { companyById, creditLimit, kingdomGdp } from '../src/economy';
import { DAILY_INTEREST } from '../src/finance';
import { applyCommandMsg, createWorld, step } from '../src/index';
import { applyFixedResearch, forceLaw } from '../src/lab/run';
import { welfareNeedOf } from '../src/welfare';
import { PLAYER_ID } from '../src/world';
import type { WelfareLaw } from '../src/types';

const law = (process.argv[2] ?? 'poor') as WelfareLaw;
const seed = Number(process.argv[3] ?? 1), salt = Number(process.argv[4] ?? 0), years = Number(process.argv[5] ?? 5);
overrideTune(JSON.parse(process.argv[6] ?? '{}'), 'welfmon');
const w = createWorld(seed, { withPlayer: true, aiSalt: salt });
const k = w.kingdoms.find((x) => x.governmentId === PLAYER_ID)!;
const gov = companyById(w, PLAYER_ID)!;
forceLaw(w, k.id, 'welfare', law);
if (process.argv[7]) { const err = applyCommandMsg(w, PLAYER_ID, { type: 'setBudget', item: 'welfare', value: Number(process.argv[7]) }); if (err) throw new Error(err.text); }
const rid = new Set(w.regions.filter((r) => r.kingdomId === k.id).map((r) => r.id));
let acc = { rev: 0, mint: 0, wel: 0, unpaid: 0, wages: 0, lowInc: 0, lowWel: 0, gdpPre: 0, welP: 0 };
const r2 = (x: number) => Math.round(x * 100) / 100;
for (let d = 1; d <= years * 360; d++) {
  applyFixedResearch(w, PLAYER_ID);
  const rv0 = k.revenueWeek, mt0 = gov.ledger.mint, wl0 = gov.ledger.welfare, wg0 = k.spentWeek?.wages ?? 0;
  acc.unpaid += Math.max(0, gov.debt * DAILY_INTEREST - Math.max(0, gov.cash));
  step(w);
  const weekly = w.tick % 7 === 0;
  acc.rev += (weekly ? (k.lastBudget?.revenue ?? 0) : k.revenueWeek) - rv0;
  acc.mint += (weekly ? gov.lastLedger.mint : gov.ledger.mint) - mt0;
  acc.wel += (weekly ? gov.lastLedger.welfare : gov.ledger.welfare) - wl0;
  acc.wages += (weekly ? (k.lastBudget?.wages ?? 0) : k.spentWeek?.wages ?? 0) - wg0;
  for (const p of w.pops) {
    if (!rid.has(p.regionId)) continue;
    const b = p.incomeBreakdown;
    acc.gdpPre += (b?.wages ?? 0) + (b?.dividends ?? 0) + (b?.rent ?? 0) + (b?.sales ?? 0);
    if (p.prof === 'peasant') acc.welP += b?.welfare ?? 0;
    if (p.prof !== 'peasant' && p.prof !== 'unskilled') continue;
    acc.lowInc += Math.max(0, p.lastIncome);
    acc.lowWel += p.incomeBreakdown?.welfare ?? 0;
  }
  if (d % 30 !== 0) continue;
  let sp = 0, np = 0, su = 0, nu = 0, fp = 0, fu = 0, low = 0, pop = 0;
  for (const p of w.pops) {
    if (!rid.has(p.regionId)) continue;
    pop += p.size;
    if (p.sol < 1.25) low += p.size;
    if (p.prof === 'peasant') { sp += p.sol * p.size; fp += p.food * p.size; np += p.size; }
    if (p.prof === 'unskilled') { su += p.sol * p.size; fu += p.food * p.size; nu += p.size; }
  }
  const lim = creditLimit(w, gov), tax = acc.rev - acc.mint;
  console.log(JSON.stringify({
    law, seed, salt, m: d / 30, cash: Math.round(gov.cash), debt: Math.round(gov.debt), lim: Math.round(lim), dl: r2(lim > 0 ? gov.debt / lim : 0),
    gdp: Math.round(kingdomGdp(w, k.id)), rev: Math.round(acc.rev), mint: Math.round(acc.mint), wel: Math.round(acc.wel), wr: r2(tax > 0 ? acc.wel / tax : 0),
    need: Math.round(welfareNeedOf(k, k.welfareLaw, k.budget.welfare) * 30), unpaid: Math.round(acc.unpaid), wages: Math.round(acc.wages),
    solP: r2(np ? sp / np : 0), solU: r2(nu ? su / nu : 0), welShare: r2(acc.lowInc > 0 ? acc.lowWel / acc.lowInc : 0),
    foodP: r2(np ? fp / np : 0), foodU: r2(nu ? fu / nu : 0), low: r2(pop ? low / pop : 0), pop: Math.round(pop), peas: Math.round(np), gdpPre: Math.round(acc.gdpPre), welP: Math.round(acc.welP),
    ai: w.kingdoms.filter((x) => x !== k).map((x) => { const g = companyById(w, x.governmentId)!, l = creditLimit(w, g); return [x.welfareLaw, x.budget.welfare, r2(g.cash / 1e6), r2(l > 0 ? g.debt / l : 0)]; }),
  }));
  acc = { rev: 0, mint: 0, wel: 0, unpaid: 0, wages: 0, lowInc: 0, lowWel: 0, gdpPre: 0, welP: 0 };
}
