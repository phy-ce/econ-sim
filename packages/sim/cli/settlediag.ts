// 민간 공사 완공 정산 진단 (이슈 #10): npx tsx cli/settlediag.ts [시드] [년] ['<TUNE JSON>']
// 해마다 한 줄 JSON (cli/report.py 가 읽는 lab 줄 꼴: run·k('all')·seed·y 와 숫자 칸, 실행 이름은 RUN 환경 변수):
//   negDays 저택·금융가 금고가 음수인 날, low 그해 가장 낮은 저택·금융가 금고, otherNeg·otherLow 그 밖의 건물 금고(무역소)가 음수인 날·가장 낮은 값, settleN 정산에서 돈을 낸 횟수, settle 낼 돈(천), short 그중 금고에 없던 돈(천), cap settleCap 으로 못 낸 돈(천), capManor 그중 저택이 못 낸 돈(천),
//   pooled 그해 착공 중 한 레벨을 여러 금고가 나눠 약정한 공사 수, starts 약정이 있는 착공 수,
//   gdpY 연 총생산(백만, 대륙 합), lv.priv 민간 건물 레벨, lv.state 왕실 건물 레벨, manor·finance 연말 금고 합(백만), drift 화폐 보존 어긋남
// 정산 흐름은 kingdoms.ts FLOW (settle.*, settleShort.*, settleN, settleCap.*) 에서 읽는다
import './lowprio';
import { BUILDING_BY_ID, overrideTune } from '../src/data';
import { isOwnerBuilding, kingdomGdp, moneyIdentity } from '../src/economy';
import { FLOW } from '../src/kingdoms';
import { createWorld, step } from '../src/index';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const over = JSON.parse(process.argv[4] ?? '{}');
overrideTune(over, 'settlediag');
const run = process.env.RUN ?? (Object.keys(over).length ? JSON.stringify(over) : 'base');
const w = createWorld(seed, { withPlayer: false });
const m0 = moneyIdentity(w);
const seen = new Set<number>();
for (const k of w.constructions) seen.add(k.id);
const f = (k: string) => FLOW[k] ?? 0;
const sum = (p: string) => Object.entries(FLOW).filter(([k]) => k.startsWith(p)).reduce((a, [, v]) => a + v, 0);
let negDays = 0, low = 0, otherNeg = 0, otherLow = 0, pooled = 0, starts = 0;
let prev = { n: 0, settle: 0, short: 0, cap: 0, capManor: 0 };
for (let t = 1; t <= 360 * years; t++) {
  step(w);
  for (const k of w.constructions) {
    if (seen.has(k.id)) continue;
    seen.add(k.id);
    if (!k.funders) continue;
    starts++;
    const v = Object.values(k.funders);
    const per = v.reduce((a, x) => a + x, 0) / (k.levels ?? 1);
    if (v.some((x) => Math.abs(x / per - Math.round(x / per)) > 1e-6)) pooled++;
  }
  let dayLow = 0, dayOther = 0;
  for (const b of w.buildings) {
    if (b.cash === undefined) continue;
    if (isOwnerBuilding(b.typeId)) dayLow = Math.min(dayLow, b.cash); else dayOther = Math.min(dayOther, b.cash);
  }
  if (dayLow < -1e-6) { negDays++; low = Math.min(low, dayLow); }
  if (dayOther < -1e-6) { otherNeg++; otherLow = Math.min(otherLow, dayOther); }
  if (t % 360 !== 0) continue;
  let gdp = 0, lvP = 0, lvS = 0, manor = 0, finance = 0;
  for (const k of w.kingdoms) gdp += kingdomGdp(w, k.id);
  for (const b of w.buildings) {
    if (b.typeId === 'manor') manor += b.cash ?? 0;
    if (b.typeId === 'finance') finance += b.cash ?? 0;
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    if (b.stateOwned) lvS += b.level; else lvP += b.level;
  }
  const now = { n: f('settleN'), settle: sum('settle.'), short: sum('settleShort.'), cap: sum('settleCap.'), capManor: f('settleCap.manor') };
  const r2 = (x: number) => Math.round(x * 100) / 100;
  console.log(JSON.stringify({
    run, k: 'all', seed, y: t / 360, negDays, low: Math.round(low), otherNeg, otherLow: Math.round(otherLow), settleN: now.n - prev.n, settle: r2((now.settle - prev.settle) / 1e3), short: r2((now.short - prev.short) / 1e3),
    cap: r2((now.cap - prev.cap) / 1e3), capManor: r2((now.capManor - prev.capManor) / 1e3), pooled, starts, gdpY: r2(gdp / 1e6), lv: { priv: lvP, state: lvS }, manor: r2(manor / 1e6), finance: r2(finance / 1e6),
    drift: Math.abs(moneyIdentity(w) - m0) / m0,
  }));
  prev = now; negDays = 0; low = 0; otherNeg = 0; otherLow = 0; pooled = 0; starts = 0;
}
