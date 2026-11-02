// 저택 지분 진단 (wt-manor, TUNE.manorShares, docs/overhaul/MANOR_SHARES.md): 해마다 (또는 --every 일마다) 한 줄.
//   packages/sim 에서:  npx tsx cli/manordiag.ts [--seed 1] [--years 2] [--every 360] [--tune '{"manorShares":1}'] [--player 1]
// 줄: 날, 화폐 어긋남(총량 대비), 왕국별 행정청 충원(레벨 가중), 하급 귀족 실업률, 상급·하급 귀족 1인 하루 소득(incomeEma ÷ 인원)·생활수준,
//     소작농·노동자 생활수준, 저택 금고 합·지분 값 평균, 그 기간 지분 흐름 (자기 지역·다른 지역·다른 왕국 저택 사기, 팔기, 되사기, 부재 지주 몫).
import { TUNE, createWorld, moneyIdentity, overrideTune, step, totalMoney } from '../src/index';
import { FLOW } from '../src/kingdoms';
import { kingdomOf } from '../src/kingdoms';
import type { World } from '../src/index';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const SEED = Number(arg('seed', '1')), YEARS = Number(arg('years', '2')), EVERY = Number(arg('every', '360'));
const tune = JSON.parse(arg('tune', '{}')) as Record<string, unknown>;
overrideTune(tune, 'manordiag --tune');
const w: World = createWorld(SEED, { withPlayer: arg('player', '1') !== '0' });
const m0 = moneyIdentity(w);
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'NaN');
const TAGS = ['mbuy.home', 'mbuy.away', 'mbuy.foreign', 'msell.manor', 'mbuyback.manor', 'absentee.manor'];
let last: Record<string, number> = Object.fromEntries(TAGS.map((t) => [t, FLOW[t] ?? 0]));
let worst = 0;
console.log(['day', 'drift', ...w.kingdoms.map((k) => `adm${k.id}`), 'gJobless', 'aInc', 'gInc', 'aSol', 'gSol', 'peasSol', 'unskSol', 'manorCash', 'nav', ...TAGS.map((t) => t.split('.')[0] + (t.includes('.home') ? 'H' : t.includes('.away') ? 'A' : t.includes('foreign') ? 'F' : ''))].join('\t'));
for (let d = 1; d <= YEARS * 360; d++) {
  step(w);
  worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
  if (d % EVERY !== 0) continue;
  const adm = w.kingdoms.map((k) => {
    let s = 0, l = 0;
    for (const b of w.buildings) if (b.typeId === 'admin' && kingdomOf(w, b.regionId) === k.id) { s += b.last.staffing * b.level; l += b.level; }
    return l > 0 ? s / l : NaN;
  });
  const acc = (prof: string, f: (p: World['pops'][number]) => boolean = () => true) => {
    let n = 0, inc = 0, sol = 0;
    for (const p of w.pops) if (p.prof === prof && p.size > 0 && f(p)) { n += p.size; inc += p.incomeEma; sol += p.sol * p.size; }
    return { n, inc: n > 0 ? inc / n : NaN, sol: n > 0 ? sol / n : NaN };
  };
  const g = acc('gentry'), a = acc('aristocrat'), gi = acc('gentry', (p) => p.work === 0), pe = acc('peasant'), un = acc('unskilled');
  let cash = 0, nav = 0, nm = 0;
  for (const b of w.buildings) if (b.typeId === 'manor') { cash += b.cash ?? 0; nav += b.nav ?? 1; nm++; }
  const fl = TAGS.map((t) => { const v = (FLOW[t] ?? 0) - last[t]; return v; });
  last = Object.fromEntries(TAGS.map((t) => [t, FLOW[t] ?? 0]));
  console.log([d, worst.toExponential(1), ...adm.map(f2), f2(gi.n / g.n), f2(a.inc), f2(g.inc), f2(a.sol), f2(g.sol), f2(pe.sol), f2(un.sol), Math.round(cash / 1e3) + 'k', f2(nav / nm), ...fl.map((v) => Math.round(v / 1e3) + 'k')].join('\t'));
}
