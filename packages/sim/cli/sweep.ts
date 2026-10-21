// 조정값 비교: npx tsx cli/sweep.ts '<TUNE JSON>' [seed] [years]  (JSON 의 "subsistence" 는 SUBSISTENCE 를 바꾼다)
// 주요 지표(w.metrics)에서 5년마다(와 마지막 해) 대륙 합계를 뽑아 한 줄 JSON으로 출력한다.
// TIMING=1 이면 time: { ms 시뮬레이션 시간, msPerDay 하루 평균 } 을 덧붙인다 (sweepsum.py 가 따로 요약한다)
import { BUILDING_BY_ID, GOOD_IDS, GOODS, LAW_TECH, SKILL_DEFS, SUBSISTENCE, TECH_BY_ID, TECH_COST, TECHS, TUNE } from '../src/data';
import { isGovernment, paysDividend, slots } from '../src/economy';
import { committedCost } from '../src/finance';
import { treasuryTight } from '../src/ai';
import { FLOW } from '../src/kingdoms';
import { kingdomGdp } from '../src/economy';
import { createWorld, financeRatio, investThreshold, literacyOf, step, taxThreshold } from '../src/index';
import type { MetricPoint } from '../src/index';
import { workforce } from '../src/pops';
import { applyWorld } from './worldtune';
import { LEDGER_KEYS, POP_CLASSES, SKILLS } from '../src/types';
import type { World } from '../src/types';

/**
 * 민간 투자 (5년마다, 대륙 합계): priv 민간 상회 현금(백만), idle 그중 진행 공사 잔액을 뺀 쉬는 돈(백만),
 * lvP·lvS 민간·왕실 건물 레벨, stP 민간 건물 충원율(기본 임금 가중), profP 민간 건물 하루 손익 이동평균 합(천), ofLv 사무소 레벨
 */
function investSnapshot(w: World) {
  let priv = 0, idle = 0, lvP = 0, lvS = 0, need = 0, have = 0, profP = 0, ofLv = 0;
  for (const c of w.companies) if (!c.state) { priv += c.cash; idle += c.cash - committedCost(w, c); }
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    if (b.typeId === 'builder') ofLv += b.level;
    if (b.stateOwned) { lvS += b.level; continue; }
    lvP += b.level;
    profP += b.profitEma;
    for (const s of SKILLS) {
      if (paysDividend(false, s)) continue;
      const n = slots(b, s);
      need += n * SKILL_DEFS[s].baseWage; have += Math.min(n, b.employed[s]) * SKILL_DEFS[s].baseWage;
    }
  }
  const f2 = (x: number) => +x.toFixed(2);
  return { priv: f2(priv / 1e6), idle: f2(idle / 1e6), lvP, lvS, stP: f2(need > 0 ? have / need : 0), profP: Math.round(profP / 1e3), ofLv };
}

/**
 * 5년 구간 (월 기록, 대륙 합계): lossSh 생산 건물(정부 건물 제외) 레벨 중 적자(이익 이동평균 < 0) 비율의 월 평균,
 * dem 철거 레벨, bP·bS 민간·왕실 착공 레벨, pv 민영화로 판 레벨
 */
function investInterval(ms: MetricPoint[], from: number, to: number) {
  let loss = 0, lv = 0, dem = 0, bP = 0, bS = 0, pv = 0;
  for (const m of ms) {
    if (m.tick <= from || m.tick > to) continue;
    for (const k of Object.values(m.kingdoms)) {
      for (const [t, x] of Object.entries(k.typeBy)) if (!isGovernment(t)) { loss += x.lossLevels; lv += k.levelsBy[t] ?? 0; }
      for (const [key, n] of Object.entries(k.starts)) {
        if (key.endsWith('|v')) pv += n; else if (key.endsWith('|d')) dem += n; else if (key.endsWith('|p')) bP += n; else if (key.endsWith('|s')) bS += n;
      }
    }
  }
  return { lossSh: +(lv > 0 ? loss / lv : 0).toFixed(2), dem, bP, bS, pv };
}

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
// "subsistence": { grainPerWorker 등 } 은 소작지 1인당 산출(SUBSISTENCE)을 바꾼다
// "world": 상품 가격·임금·일자리·원료 배율 (cli/worldtune.ts)
const { subsistence, world, tech4, techScale, lawTech, addTech, ...tune } = over;
// "addTech": 비교용 기술 더하기 ([{ id, cost, requires }])
for (const t of (addTech ?? []) as { id: string; cost: number; requires: string[] }[]) { const d = { name: t.id, nameEn: t.id, description: '', descriptionEn: '', ...t }; TECHS.push(d); TECH_BY_ID[t.id] = d; }
// "lawTech": 법을 여는 기술 바꾸기 ({ poll: 'guilds', ... })
if (lawTech) Object.assign(LAW_TECH, lawTech);
// "tech4": 4단계 기술 값 (연구 포인트)
if (tech4) for (const t of TECHS) if (t.cost === TECH_COST[4]) t.cost = tech4;
// "techScale": 모든 기술 값(연구 포인트)에 곱한다
if (techScale) for (const t of TECHS) t.cost *= techScale;
Object.assign(TUNE, tune);
if (subsistence) Object.assign(SUBSISTENCE, subsistence);
applyWorld(world);
// 비교 실행에서는 플레이어 왕국도 AI가 맡는다
const w = createWorld(seed, { withPlayer: false });
// 왕실 정책 단계 (4주 점검마다 왕국별): 세금 수준·국영 임금 수준·국고(지출 몇 주치)·빚
const trace = w.kingdoms.map(() => [] as { tax: number; wages: number; weeks: number; debt: boolean }[]);
// 교육 (5년마다): lit 인구 가중 문해력, sch 왕실 학교 레벨, qs 기술자 자격자(기술자 + 다른 직종의 기술자 자격, 천 명), schDem 학교 철거 레벨 누계
const edu: Record<number, { lit: number; sch: number; qs: number; schDem: number; veins: number }> = {};
// 하급 귀족·귀족 (5년마다): gJob·aJob 실업 비율(노동 인구), gSol 하급 귀족 생활수준, gMan 저택에 앉은 하급 귀족 비율
const gent: Record<number, { gJob: number; aJob: number; gSol: number; gMan: number; gSch: number; gAdm: number; tut: number }> = {};
const inv: Record<number, ReturnType<typeof investSnapshot>> = {};
let schDem = 0;
const schoolLevels = new Map<number, number>();
// 소작 시장 (해마다 하루 평균): subG·subT 소작지가 내놓은 곡물·목재, demG·demT 곡물·목재 수요 (만), landTax 걷힌 토지세 (천/일),
// shG·shT·shF 소작지가 내놓은 양 / 소작지 수확 (곡물·목재·섬유)
const yearAcc = { subG: 0, demG: 0, subT: 0, demT: 0, subF: 0, hG: 0, hT: 0, hF: 0, landTax: 0, pG: 0, pC: 0, pFu: 0, pT: 0, pFi: 0, pFul: 0, pW: 0, supU: 0, demU: 0, supR: 0, demR: 0, pU: 0, pR: 0 };
// 곡물 도시(티어 1·2)·농촌(티어 3·4) 지역: supU·demU·supR·demR 하루 공급·수요 합, pU·pR 값/기본가의 지역 평균 (해마다 하루 평균)
const urban = (t: number | undefined) => (t ?? 9) <= 2;
const nU = w.regions.filter((r) => urban(r.tier)).length, nR = w.regions.length - nU;
const yearly: Record<number, Record<string, number>> = {};
// 계층 소득 (해마다 마지막 날): incAri·incGen·incSk·incUnsk 상급 귀족·하급 귀족·기술자·노동자 1인당 하루 현금 소득(incomeEma),
// ariSk 상급 귀족 ÷ 기술자, ariK 상급 귀족 인구(천), genK 하급 귀족 인구(천)
const classInc: Record<number, Record<string, number>> = {};
const ironY: Record<number, Record<string, number>> = {};
// 복지 (해마다): welY 한 해 복지 지급(백만), welL0..2 왕국별 복지법 (없음 0 / 구빈 1 / 임금 2 / 보편 3), welS 복지 단계 평균,
// below3 귀족·자본가를 뺀 인구 중 생활수준 3 미만 비율, solFarm 농부 생활수준
const welY: Record<number, Record<string, number>> = {};
let welAcc = 0;
// 돈과 왕실 (해마다, cli/report.py 의 '돈 ÷ 총생산'·'왕실'): 재고 ÷ 연간 총생산과 절대값(백만), 세금 단계 평균, 조임 비율(날마다 왕국 평균),
// 국고 주치(지출 몇 주치, 왕국 평균), 세금 올림 횟수, 팔린 비율(가치 기준), 한 해 주조(백만)
const aiY: Record<number, Record<string, number>> = {};
const aiAcc = { tight: 0, tax: 0, weeks: 0, ups: 0, soldV: 0, supV: 0, days: 0, welOn: 0, welStp: 0, welFlips: 0 };
const taxPrev = w.kingdoms.map((k) => k.budget.tax);
// 복지 (해마다): welOn 복지법이 켜진 왕국 비율(날마다 평균), welStp 복지 단계 평균(켜진 왕국), welFlips 복지법 켜기·끄기 횟수
const welPrev = w.kingdoms.map((k) => (k.welfareLaw ?? 'none') !== 'none');
let mintPrev = 0;
function classIncome(w: World) {
  const n: Record<string, number> = {}, inc: Record<string, number> = {}, sav: Record<string, number> = {};
  for (const p of w.pops) { n[p.prof] = (n[p.prof] ?? 0) + p.size; inc[p.prof] = (inc[p.prof] ?? 0) + p.incomeEma; sav[p.prof] = (sav[p.prof] ?? 0) + p.savings; }
  const per = (c: string) => (n[c] ?? 0) > 0 ? inc[c] / n[c] : 0;
  const f2 = (x: number) => +x.toFixed(2);
  // manOwn 저택이 가진 건물 레벨 합, cells 소작지 칸 합, ariSeat 저택 상급 귀족 자리 합(천)
  let manOwn = 0, cells = 0, ariSeat = 0;
  const manors = new Set(w.buildings.filter((b) => b.typeId === 'manor').map((b) => b.id));
  for (const b of w.buildings) {
    if (b.typeId === 'subsistence') cells += b.level;
    else if (b.typeId === 'manor') ariSeat += slots(b, 'aristocrat');
    for (const [id, n] of Object.entries(b.owners ?? {})) if (manors.has(Number(id))) manOwn += n;
  }
  // savX: 계층 저축 합(백만)
  const sv = (c: string) => +((sav[c] ?? 0) / 1e6).toFixed(2);
  return { savPeas: sv('peasant'), savUnsk: sv('unskilled'), savFarm: sv('farmer'), savSk: sv('skilled'), savEx: sv('expert'), manOwn, cells, ariSeat: Math.round(ariSeat / 1e3), incAri: f2(per('aristocrat')), incGen: f2(per('gentry')), incSk: f2(per('skilled')), incEx: f2(per('expert')), incUnsk: f2(per('unskilled')),
    ariSk: f2(per('skilled') > 0 ? per('aristocrat') / per('skilled') : 0), ariK: Math.round((n.aristocrat ?? 0) / 1e3), genK: Math.round((n.gentry ?? 0) / 1e3) };
}
// 행정청·하급 귀족 (해마다 마지막 날): admHer·admPro 세습·전문 관료제 레벨, admFill 행정청 충원율(자리 가중),
// admWage 행정청 하루 임금(천), admSk·admGen 행정청 기술자·하급 귀족 고용(천), wIdxAvg 국영 임금 지수 평균 (traj 의 wIdx 는 왕국 최대), wStep 국영 임금 배율 평균,
// genWkK 하급 귀족 노동 인구(천, genK 는 인구), solGen 생활수준, gAdmSh·gManSh·gTutSh·gIdleSh 행정청·저택·가정교사·실업 비율
const admY: Record<number, Record<string, number>> = {};
function adminSnap(w: World) {
  let her = 0, pro = 0, need = 0, have = 0, wage = 0, sk = 0, gen = 0;
  const gov = new Map(w.companies.filter((c) => c.state).map((c) => [c.id, c] as const));
  for (const b of w.buildings) {
    if (b.typeId !== 'admin') continue;
    if (b.methodId === 'admin_hereditary') her += b.level; else pro += b.level;
    const c = gov.get(b.companyId);
    for (const s of SKILLS) { const n = slots(b, s); need += n; have += Math.min(n, b.employed[s]); wage += b.employed[s] * (c?.wages[s] ?? 0); }
    sk += b.employed.skilled ?? 0; gen += b.employed.gentry ?? 0;
  }
  const typeOf = new Map(w.buildings.map((b) => [b.id, b] as const));
  let gn = 0, gs = 0, ga = 0, gm = 0, gt = 0, gi = 0;
  for (const p of w.pops) {
    if (p.prof !== 'gentry') continue;
    const f = workforce(p); gn += f; gs += p.sol * f;
    const b = typeOf.get(p.work);
    if (!b) gi += f; else if (b.typeId === 'admin') ga += f; else if (b.typeId === 'manor') gm += f; else if (b.methodId === 'school_tutor') gt += f;
  }
  const f2 = (x: number) => +x.toFixed(2), f3 = (x: number) => +x.toFixed(3), d = Math.max(1, gn);
  const wIdx = w.kingdoms.reduce((a, k) => a + (k.wageIndex ?? 1), 0) / w.kingdoms.length;
  const wStep = w.kingdoms.reduce((a, k) => { const g = gov.get(k.governmentId); return a + (g ? g.wages.gentry / SKILL_DEFS.gentry.baseWage / (k.wageIndex ?? 1) : 1); }, 0) / w.kingdoms.length;
  return { admHer: her, admPro: pro, admFill: f2(need > 0 ? have / need : 0), admWage: f2(wage / 1e3), admSk: f2(sk / 1e3), admGen: f2(gen / 1e3), wIdxAvg: f2(wIdx), wStep: f2(wStep),
    genWkK: f2(gn / 1e3), solGen: f2(gs / d), gAdmSh: f3(ga / d), gManSh: f3(gm / d), gTutSh: f3(gt / d), gIdleSh: f3(gi / d) };
}
// 모든 지표 (해마다, cli/report.py): 붕괴 진단(.tmp/col/collapse.ts)이 기록하던 것을 합쳤다. 이름은 "묶음.항목".
// 하루 평균: price.<상품> 지역 평균 값 ÷ 기본가, sup·dem·sold.<상품> 하루 공급·수요·체결 합(천), hh.<상품> 가계 수요 합(천),
//   util 민간 생산 건물 가동률(레벨 가중), food 식량 충족(인구 가중), cons.priv·cons.state 진행 중 민간·왕실 공사 수
// 한 해 합: govL.<항목>·privL.<항목> 왕실·민간 장부(백만/년, 주마다 lastLedger 합), flows.<흐름>.<manor|finance> 소유 건물 금고 흐름(백만/년)
// 마지막 날: stock.* 주인별 돈(백만), wage.<p|s><U|F|S|E|G> 민간·국영 고용 가중 임금, emp·idle.<직종> 고용·실업 노동 인구(천),
//   popK·wfK.<계층> 인구·노동 인구(천), sol.<계층> 생활수준(인구 가중), inc.<계층> 1인 하루 소득, lv.priv·state·office, lvT.<건물> 건물 레벨
const fullY: Record<number, Record<string, number>> = {};
const fAcc = { util: 0, utilN: 0, food: 0, foodN: 0, priv: 0, state: 0, days: 0 };
const gAcc: Record<string, number> = {};
const ledG: Record<string, number> = {}, ledP: Record<string, number> = {};
for (const k in FLOW) delete FLOW[k];
const JOB_LETTER: Record<string, string> = { unskilled: 'U', farmer: 'F', skilled: 'S', expert: 'E', gentry: 'G' };
const SAV_KEY: Record<string, string> = { peasant: 'savPeas', unskilled: 'savUnsk', farmer: 'savFarm', skilled: 'savSk', expert: 'savEx', gentry: 'savGen', capitalist: 'savCap', aristocrat: 'savAri' };
function fullDay(w: World) {
  const nReg = w.regions.length;
  for (const g of GOOD_IDS) {
    let p = 0, su = 0, de = 0, so = 0, hh = 0;
    for (const r of w.regions) {
      const m = r.market[g];
      p += m.price; su += m.supply; de += m.demand; so += m.sold;
      if (m.demandBy) for (const key in m.demandBy) if (key.startsWith('pop:')) hh += m.demandBy[key];
    }
    gAcc['price.' + g] = (gAcc['price.' + g] ?? 0) + p / nReg / GOODS[g].basePrice;
    gAcc['sup.' + g] = (gAcc['sup.' + g] ?? 0) + su; gAcc['dem.' + g] = (gAcc['dem.' + g] ?? 0) + de;
    gAcc['sold.' + g] = (gAcc['sold.' + g] ?? 0) + so; gAcc['hh.' + g] = (gAcc['hh.' + g] ?? 0) + hh;
  }
  for (const b of w.buildings) {
    if (b.stateOwned || BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId)) continue;
    fAcc.util += b.utilization * b.level; fAcc.utilN += b.level;
  }
  for (const p of w.pops) { fAcc.food += p.food * p.size; fAcc.foodN += p.size; }
  const stateCo = new Set(w.companies.filter((c) => c.state).map((c) => c.id));
  for (const k of w.constructions) if (stateCo.has(k.companyId)) fAcc.state++; else fAcc.priv++;
  fAcc.days++;
  if (w.tick % 7 === 0) for (const c of w.companies) {
    const t = c.state ? ledG : ledP;
    for (const k of LEDGER_KEYS) t[k] = (t[k] ?? 0) + c.lastLedger[k];
  }
}
function fullYear(w: World): Record<string, number> {
  const M = (x: number) => +(x / 1e6).toFixed(3), K = (x: number) => +(x / 1e3).toFixed(2), f3 = (x: number) => +x.toFixed(3);
  const o: Record<string, number> = {};
  const d = Math.max(1, fAcc.days);
  for (const [k, v] of Object.entries(gAcc)) o[k] = k.startsWith('price.') ? f3(v / d) : K(v / d);
  o.util = f3(fAcc.util / Math.max(1, fAcc.utilN)); o.food = f3(fAcc.food / Math.max(1, fAcc.foodN));
  o['cons.priv'] = +(fAcc.priv / d).toFixed(1); o['cons.state'] = +(fAcc.state / d).toFixed(1);
  for (const k of LEDGER_KEYS) { o['govL.' + k] = M(ledG[k] ?? 0); o['privL.' + k] = M(ledP[k] ?? 0); }
  for (const k of Object.keys(FLOW).sort()) { o['flows.' + k] = M(FLOW[k]); delete FLOW[k]; }
  // 계층별 인구·돈·생활수준·소득, 직종별 고용·실업
  const n: Record<string, number> = {}, wf: Record<string, number> = {}, sav: Record<string, number> = {}, sol: Record<string, number> = {}, inc: Record<string, number> = {};
  const emp: Record<string, number> = {}, idle: Record<string, number> = {};
  let fundVal = 0;
  const navOf = new Map(w.buildings.filter((b) => b.typeId === 'finance').map((b) => [b.id, b.nav ?? 1] as const));
  for (const p of w.pops) {
    const f = workforce(p);
    n[p.prof] = (n[p.prof] ?? 0) + p.size; wf[p.prof] = (wf[p.prof] ?? 0) + f; sav[p.prof] = (sav[p.prof] ?? 0) + p.savings;
    sol[p.prof] = (sol[p.prof] ?? 0) + p.sol * p.size; inc[p.prof] = (inc[p.prof] ?? 0) + p.incomeEma;
    if (p.work === 0) idle[p.prof] = (idle[p.prof] ?? 0) + f; else emp[p.prof] = (emp[p.prof] ?? 0) + f;
    if (p.fund) p.fund.id.forEach((id, i) => { fundVal += p.fund!.u[i] * (navOf.get(id) ?? 1); });
  }
  let gov = 0, govDebt = 0, firm = 0, man = 0, fin = 0;
  for (const c of w.companies) { if (c.state) { gov += c.cash; govDebt += c.debt; } else firm += c.cash; }
  for (const b of w.buildings) { if (b.typeId === 'manor') man += b.cash ?? 0; if (b.typeId === 'finance') fin += b.cash ?? 0; }
  const savT = Object.values(sav).reduce((a, x) => a + x, 0), pool = w.kingdoms.reduce((a, k) => a + (k.investmentPool ?? 0), 0); // investmentPool 은 저택·금융가 금고 합의 화면용 사본 (round.ts writePool): 총통화에 더하지 않는다
  for (const c of POP_CLASSES) o['stock.' + SAV_KEY[c]] = M(sav[c] ?? 0);
  Object.assign(o, { 'stock.savAll': M(savT), 'stock.pool': M(pool), 'stock.gov': M(gov), 'stock.govDebt': M(govDebt), 'stock.firm': M(firm), 'stock.man': M(man), 'stock.fin': M(fin),
    'stock.traders': M(w.traders.cash), 'stock.wfund': M(w.fund), 'stock.total': M(savT + gov + firm + man + fin + w.traders.cash + w.fund), 'stock.minted': M(w.mint.minted), 'stock.fundVal': M(fundVal) });
  for (const c of POP_CLASSES) {
    o['popK.' + c] = K(n[c] ?? 0); o['wfK.' + c] = K(wf[c] ?? 0);
    o['sol.' + c] = +((n[c] ?? 0) > 0 ? sol[c] / n[c] : 0).toFixed(2); o['inc.' + c] = +((n[c] ?? 0) > 0 ? inc[c] / n[c] : 0).toFixed(2);
  }
  for (const s of SKILLS) { o['emp.' + s] = K(emp[s] ?? 0); o['idle.' + s] = K(idle[s] ?? 0); }
  // 임금 (고용 가중), 레벨
  const co = new Map(w.companies.map((c) => [c.id, c] as const));
  const pay: Record<string, number> = {}, cnt: Record<string, number> = {};
  const lv = { priv: 0, state: 0, office: 0 }, lvT: Record<string, number> = {};
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    lvT[b.typeId] = (lvT[b.typeId] ?? 0) + b.level;
    if (b.typeId === 'builder') lv.office += b.level;
    if (b.stateOwned) lv.state += b.level; else lv.priv += b.level;
    const c = co.get(b.companyId);
    if (!c) continue;
    for (const s in JOB_LETTER) {
      const e = b.employed[s as keyof typeof b.employed] ?? 0;
      if (!e) continue;
      const key = (c.state ? 's' : 'p') + JOB_LETTER[s];
      pay[key] = (pay[key] ?? 0) + e * c.wages[s as keyof typeof c.wages]; cnt[key] = (cnt[key] ?? 0) + e;
    }
  }
  for (const s of Object.values(JOB_LETTER)) for (const side of ['p', 's']) { const key = side + s; o['wage.' + key] = +(cnt[key] ? pay[key] / cnt[key] : 0).toFixed(2); }
  o['lv.priv'] = lv.priv; o['lv.state'] = lv.state; o['lv.office'] = lv.office;
  for (const t of Object.keys(lvT).sort()) o['lvT.' + t] = lvT[t];
  for (const k in gAcc) gAcc[k] = 0;
  for (const k of Object.keys(fAcc) as (keyof typeof fAcc)[]) fAcc[k] = 0;
  for (const t of [ledG, ledP]) for (const k in t) t[k] = 0;
  return o;
}
const yearPts: MetricPoint[] = [];
const lawY: Record<string, [number | null, number | null]>[] = [];
const ratioY: Record<number, number>[] = [];
// 왕국마다 기술을 연 해 (0.1년)
const techY: Record<string, number>[] = [];
// 왕국마다 법 바꾸기가 끝날 때 실패한 해 (세법·투자법)
const failY: { tax: number[]; invest: number[] }[] = [];
const t0 = performance.now();
for (let d = 0; d < years * 360; d++) {
  step(w);
  fullDay(w);
  for (const r of w.regions) {
    yearAcc.subG += r.market.grain.supplyBy?.subsistence ?? 0; yearAcc.demG += r.market.grain.demand;
    yearAcc.subT += r.market.timber.supplyBy?.subsistence ?? 0; yearAcc.demT += r.market.timber.demand;
    yearAcc.subF += r.market.fiber.supplyBy?.subsistence ?? 0;
    yearAcc.pG += r.market.grain.demandBy?.['pop:peasant'] ?? 0;
    yearAcc.pC += r.market.cloth.demandBy?.['pop:peasant'] ?? 0; yearAcc.pFu += r.market.furniture.demandBy?.['pop:peasant'] ?? 0;
    yearAcc.pT += r.market.timber.demandBy?.['pop:peasant'] ?? 0; yearAcc.pFi += r.market.fiber.demandBy?.['pop:peasant'] ?? 0;
    const gm = r.market.grain, pr = gm.price / GOODS.grain.basePrice;
    if (urban(r.tier)) { yearAcc.supU += gm.supply; yearAcc.demU += gm.demand; yearAcc.pU += pr / nU; }
    else { yearAcc.supR += gm.supply; yearAcc.demR += gm.demand; yearAcc.pR += pr / nR; }
  }
  for (const b of w.buildings) if (b.typeId === 'subsistence') { yearAcc.hG += b.last.output.grain ?? 0; yearAcc.hT += b.last.output.timber ?? 0; yearAcc.hF += b.last.output.fiber ?? 0; }
  // 소작농 묶음 충족률·부 (인구 가중, 하루 평균)
  { let n = 0, f = 0, wl = 0; for (const p of w.pops) if (p.prof === 'peasant') { n += p.size; f += p.size * p.fulfillment; wl += p.size * p.wealth; }
    if (n > 0) { yearAcc.pFul += f / n; yearAcc.pW += wl / n; } }
  if (w.tick % 7 === 0) for (const k of w.kingdoms) welAcc += k.lastBudget?.welfare ?? 0;
  {
    let tight = 0, tax = 0, weeks = 0;
    w.kingdoms.forEach((k, i) => {
      const c = w.companies.find((x) => x.id === k.governmentId);
      if (!c) return;
      if (treasuryTight(w, c, k)) tight++;
      tax += k.budget.tax;
      weeks += Math.min(520, (k.expenseEma ?? 0) > 0 ? c.cash / k.expenseEma! : 520);
      const on = (k.welfareLaw ?? 'none') !== 'none';
      if (on) { aiAcc.welOn++; aiAcc.welStp += k.budget.welfare; }
      if (on !== welPrev[i]) aiAcc.welFlips++;
      welPrev[i] = on;
      if (k.budget.tax > taxPrev[i]) aiAcc.ups++;
      taxPrev[i] = k.budget.tax;
    });
    const n = w.kingdoms.length;
    aiAcc.tight += tight / n; aiAcc.tax += tax / n; aiAcc.weeks += weeks / n; aiAcc.days++;
    for (const r of w.regions) for (const g in r.market) { const m = r.market[g as keyof typeof r.market]; aiAcc.soldV += m.sold * m.price; aiAcc.supV += m.supply * m.price; }
  }
  if (w.tick % 360 === 0) {
    let gdp = 0, crown = 0, debt = 0, firms = 0, man = 0, fin = 0, hh = 0;
    for (const k of w.kingdoms) gdp += kingdomGdp(w, k.id);
    for (const c of w.companies) { if (c.state) { crown += c.cash; debt += c.debt; } else firms += c.cash; }
    for (const b of w.buildings) { if (b.typeId === 'manor') man += b.cash ?? 0; if (b.typeId === 'finance') fin += b.cash ?? 0; }
    for (const p of w.pops) hh += p.savings;
    const R = (x: number) => +(x / Math.max(1, gdp)).toFixed(3), M = (x: number) => +(x / 1e6).toFixed(1), d = Math.max(1, aiAcc.days);
    aiY[w.tick / 360] = {
      gdpY: M(gdp), rCrown: R(crown - debt), rFin: R(fin), rMan: R(man), rFirm: R(firms), rHh: R(hh),
      mCrown: M(crown - debt), mFin: M(fin), mMan: M(man), mFirm: M(firms), mHh: M(hh),
      taxStep: +(aiAcc.tax / d).toFixed(2), tight: +(aiAcc.tight / d).toFixed(3), tWeeks: Math.round(aiAcc.weeks / d), taxUps: aiAcc.ups,
      sellThru: +(aiAcc.soldV / Math.max(1, aiAcc.supV)).toFixed(3), minted: M(w.mint.minted - mintPrev),
      welOn: +(aiAcc.welOn / w.kingdoms.length / d).toFixed(3), welStp: +(aiAcc.welOn > 0 ? aiAcc.welStp / aiAcc.welOn : 0).toFixed(2), welFlips: aiAcc.welFlips,
    };
    {
      // 건축사무소 (해마다, 왕국 합): ofLevel 레벨, ofPts 하루 포인트, ofUsed 쓰인 포인트(buildUsed), ofBacklog 남은 공사 ÷ 하루 포인트(일, 왕국 평균),
      // ofProfit·ofFees·ofBuild 지난주 사무소 손익·민간 수수료·왕실 공사 수수료(천), ofRes 사무소 유보 자산(천). 옛 sim 에는 office·build 가 없어 0
      let lv = 0, pts = 0, used = 0, back = 0, prof = 0, fees = 0, bld = 0, res = 0;
      for (const b of w.buildings) if (b.typeId === 'builder') { lv += b.level; pts += b.last.points; res += b.reserve ?? 0; }
      for (const k of w.kingdoms) {
        const g = w.companies.find((c) => c.id === k.governmentId);
        if (!g) continue;
        used += g.buildUsed ?? 0;
        const left = w.constructions.filter((x) => w.companies.find((c) => c.id === x.companyId)?.kingdomId === k.id).reduce((a, x) => a + x.required - x.points, 0);
        const p = w.buildings.filter((b) => b.companyId === g.id && b.typeId === 'builder').reduce((a, b) => a + b.last.points, 0);
        back += p > 0 ? left / p / w.kingdoms.length : 0;
        const lb = k.lastBudget as { office?: number; fees?: number; build?: number } | undefined;
        prof += lb?.office ?? 0; fees += lb?.fees ?? 0; bld += lb?.build ?? 0;
      }
      const T = (x: number) => Math.round(x / 1e3);
      Object.assign(aiY[w.tick / 360], { ofLevel: lv, ofPts: Math.round(pts), ofUsed: Math.round(used), ofBacklog: Math.round(back), ofProfit: T(prof), ofFees: T(fees), ofBuild: T(bld), ofRes: T(res) });
    }
    mintPrev = w.mint.minted;
    for (const key of Object.keys(aiAcc) as (keyof typeof aiAcc)[]) aiAcc[key] = 0;
  }
  if (w.tick % 360 === 0) {
    // 해마다 지표 (w.metrics 는 30년까지만 남아 따로 모은다)
    const last = w.metrics[w.metrics.length - 1];
    if (last?.tick === w.tick) yearPts.push(last);
    const y = w.tick / 360;
    classInc[y] = classIncome(w);
    fullY[y] = fullYear(w);
    {
      let n = 0, lo = 0, nf = 0, sf = 0;
      for (const p of w.pops) {
        if (p.prof === 'aristocrat' || p.prof === 'gentry' || p.prof === 'capitalist') continue;
        n += p.size; if (p.sol < 3) lo += p.size;
        if (p.prof === 'farmer') { nf += p.size; sf += p.size * p.sol; }
      }
      const laws = ['none', 'poor', 'wage', 'universal'];
      welY[y] = { welY: +(welAcc / 1e6).toFixed(2), welS: +(w.kingdoms.reduce((a, k) => a + k.budget.welfare, 0) / w.kingdoms.length).toFixed(2),
        below3: +(lo / Math.max(1, n)).toFixed(3), solFarm: +(sf / Math.max(1, nf)).toFixed(2),
        ...Object.fromEntries(w.kingdoms.map((k, i) => [`welL${i}`, laws.indexOf(k.welfareLaw ?? 'none')])),
        ...Object.fromEntries(w.kingdoms.map((k, i) => [`tax${i}`, k.budget.tax])) };
      welAcc = 0;
    }
    admY[y] = adminSnap(w);
    {
      let lv = 0, st = 0;
      for (const b of w.buildings) if (b.typeId === 'mine') { lv += b.level; st += b.level * b.last.staffing; }
      const sup = (g: 'ore' | 'metal') => Math.round(w.regions.reduce((a, r) => a + r.market[g].supplyEma, 0) / 1e3);
      const dem = (g: 'ore' | 'metal') => Math.round(w.regions.reduce((a, r) => a + r.market[g].demandEma, 0) / 1e3);
      ironY[y] = { mineSt: +(lv > 0 ? st / lv : 0).toFixed(2), oreSup: sup('ore'), oreDem: dem('ore'), metalSup: sup('metal'), metalDem: dem('metal') };
    }
    let cash = 0, n = 0;
    for (const p of w.pops) if (p.prof === 'peasant' && p.work !== 0) { cash += Math.max(0, p.incomeEma); n += p.size; }
    yearly[y] = {
      subG: +(yearAcc.subG / 360 / 1e4).toFixed(1), demG: +(yearAcc.demG / 360 / 1e4).toFixed(1),
      subT: +(yearAcc.subT / 360 / 1e4).toFixed(1), demT: +(yearAcc.demT / 360 / 1e4).toFixed(1),
      shG: +(yearAcc.subG / Math.max(1, yearAcc.hG)).toFixed(3), shT: +(yearAcc.subT / Math.max(1, yearAcc.hT)).toFixed(3), shF: +(yearAcc.subF / Math.max(1, yearAcc.hF)).toFixed(3),
      landTax: +(yearAcc.landTax / 360 / 1e3).toFixed(1),
      peasBuyG: +(yearAcc.pG / 360 / 1e3).toFixed(1),
      // 소작농이 산 의복·가구·목재·섬유 (천/일), 묶음 충족률, 부
      pbC: +(yearAcc.pC / 360 / 1e3).toFixed(1), pbFu: +(yearAcc.pFu / 360 / 1e3).toFixed(1), pbT: +(yearAcc.pT / 360 / 1e3).toFixed(1), pbFi: +(yearAcc.pFi / 360 / 1e3).toFixed(1),
      peasFul: +(yearAcc.pFul / 360).toFixed(2), peasW: +(yearAcc.pW / 360).toFixed(2),
      gSD: +((yearAcc.supU + yearAcc.supR) / Math.max(1, yearAcc.demU + yearAcc.demR)).toFixed(2),
      gSDu: +(yearAcc.supU / Math.max(1, yearAcc.demU)).toFixed(2), gSDr: +(yearAcc.supR / Math.max(1, yearAcc.demR)).toFixed(2),
      gPu: +(yearAcc.pU / 360).toFixed(2), gPr: +(yearAcc.pR / 360).toFixed(2), cashPeas: +(n > 0 ? cash / n : 0).toFixed(3),
    };
    for (const key of Object.keys(yearAcc) as (keyof typeof yearAcc)[]) yearAcc[key] = 0;
  }
  if (w.tick % 7 === 0) {
    // 줄어든 학교 레벨 (철거) 을 센다
    const now = new Map<number, number>();
    for (const b of w.buildings) if (b.typeId === 'school') now.set(b.id, b.level);
    for (const [id, lv] of schoolLevels) schDem += Math.max(0, lv - (now.get(id) ?? 0));
    schoolLevels.clear();
    for (const [id, lv] of now) schoolLevels.set(id, lv);
  }
  if (w.tick % 1800 === 0 || w.tick === years * 360) {
    let n = 0, lit = 0, qs = 0;
    for (const p of w.pops) { n += p.size; lit += p.size * literacyOf(p); qs += p.prof === 'skilled' ? workforce(p) : (p.quals.skilled ?? 0); }
    const sch = w.buildings.filter((b) => b.typeId === 'school').reduce((a, b) => a + b.level, 0);
    // veins: 찾은 광맥 레벨 합 (모든 지역·자원)
    const veins = w.regions.reduce((a, r) => a + Object.values(r.deposits).reduce((b, x) => b + x, 0), 0);
    const g = { n: 0, job: 0, sol: 0, man: 0, an: 0, ajob: 0, sch: 0, adm: 0 };
    const typeOf = new Map(w.buildings.map((b) => [b.id, b.typeId] as const));
    const manors = new Set(w.buildings.filter((b) => b.typeId === 'manor').map((b) => b.id));
    for (const p of w.pops) {
      const wf = workforce(p);
      if (p.prof === 'gentry') { g.n += wf; g.sol += p.sol * wf; if (p.work === 0) g.job += wf; if (manors.has(p.work)) g.man += wf; const t = typeOf.get(p.work); if (t === 'school') g.sch += wf; if (t === 'admin') g.adm += wf; }
      if (p.prof === 'aristocrat') { g.an += wf; if (p.work === 0) g.ajob += wf; }
    }
    const f3 = (x: number) => +x.toFixed(3);
    gent[w.tick / 360] = { gJob: f3(g.job / Math.max(1, g.n)), aJob: f3(g.ajob / Math.max(1, g.an)), gSol: +(g.sol / Math.max(1, g.n)).toFixed(2), gMan: f3(g.man / Math.max(1, g.n)), gSch: Math.round(g.sch), gAdm: Math.round(g.adm), tut: w.buildings.filter((b) => b.methodId === 'school_tutor').reduce((a, b) => a + b.level, 0) };
    edu[w.tick / 360] = { lit: +(lit / n).toFixed(3), sch, qs: Math.round(qs / 1e3), schDem, veins };
    inv[w.tick / 360] = investSnapshot(w);
  }
  if (w.tick % 28 !== 0) continue;
  w.kingdoms.forEach((k, i) => {
    // 법이 열린 해(금융가 자산 비율이 기준을 처음 넘은 때)와 실제로 바뀐 해 (0.1년)
    const r = financeRatio(w, k.id), yr = +(w.tick / 360).toFixed(1), L = (lawY[i] ??= {});
    // 비율 5% 칸마다 처음 넘은 해
    const C = (ratioY[i] ??= {});
    for (let p = 5; p <= 95; p += 5) if (C[p] == null && r >= p / 100) C[p] = yr;
    for (const [id, t] of [['poll', taxThreshold('poll')], ['income', taxThreshold('income')], ['upper', investThreshold('upper')], ['middle', investThreshold('middle')], ['lower', investThreshold('lower')]] as const) {
      const e = (L[id] ??= [null, null]);
      if (e[0] == null && t != null && r >= t) e[0] = yr;
      if (e[1] == null && (k.taxLaw === id || ['upper', 'middle', 'lower'].indexOf(id) >= 0 && ['nobles', 'upper', 'middle', 'lower'].indexOf(k.investLaw) >= ['nobles', 'upper', 'middle', 'lower'].indexOf(id))) e[1] = yr;
    }
    const g = w.companies.find((c) => c.id === k.governmentId)!;
    const T = (techY[i] ??= {});
    for (const id of g.research.known) T[id] ??= yr;
    const F = (failY[i] ??= { tax: [], invest: [] });
    for (const kind of ['tax', 'invest'] as const) { const ft = k.lawFail?.[kind]; if (ft != null && ft > w.tick - 28) F[kind].push(+(ft / 360).toFixed(1)); }
    trace[i].push({ tax: k.budget.tax, wages: k.budget.wages, weeks: (k.expenseEma ?? 0) > 0 ? g.cash / k.expenseEma! : Infinity, debt: g.debt > 0 });
  });
}
const simMs = performance.now() - t0;

// 플레이어 왕국은 연구를 고르지 않으므로 기술 수에서 뺀다
const playerKingdom = w.companies.find((c) => c.isPlayer)?.kingdomId;
const sum = (m: MetricPoint, f: (k: MetricPoint['kingdoms'][number]) => number) => Object.values(m.kingdoms).reduce((a, k) => a + f(k), 0);
const out: Record<string, unknown> = { tune: over, seed };
for (const m of w.metrics) {
  const y = m.tick / 360;
  if (!Number.isInteger(y) || (y % 5 !== 0 && y !== years && y !== 2 && y !== 1)) continue;
  const pop = sum(m, (k) => k.pop);
  out[`y${y}`] = {
    pop: +(pop / 1e6).toFixed(2),
    peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    techs: Math.min(...Object.entries(m.kingdoms).filter(([id]) => Number(id) !== playerKingdom).map(([, k]) => k.techs)),
    revWk: Math.round(sum(m, (k) => k.revenueWeek) / 1e3),
    gdp: Math.round(sum(m, (k) => k.gdp) / 1e6),
    pts: Math.round(sum(m, (k) => k.pointsPerDay)),
    grain: m.goods.grain.ratio,
    // 곡물 농장 레벨, 그중 적자 레벨
    farm: sum(m, (k) => k.levelsBy.farm ?? 0), farmLoss: sum(m, (k) => k.typeBy.farm?.lossLevels ?? 0),
    timber: m.goods.timber.ratio,
    fiber: m.goods.fiber.ratio,
    solArist: +(sum(m, (k) => k.solBy.aristocrat * k.popBy.aristocrat) / Math.max(1, sum(m, (k) => k.popBy.aristocrat))).toFixed(2),
    ...(yearly[y] ?? {}),
    ore: m.goods.ore.ratio,
    fuel: m.goods.fuel.ratio,
    classGap: m.classGap,
    regionGap: m.regionGap,
    taxRatio: +(sum(m, (k) => k.taxRatio * k.pop) / pop).toFixed(2),
    solPeas: +(sum(m, (k) => k.solBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    foodPeas: +(sum(m, (k) => k.foodBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    solUnsk: +(sum(m, (k) => k.solBy.unskilled * k.popBy.unskilled) / Math.max(1, sum(m, (k) => k.popBy.unskilled))).toFixed(2),
    // 하층 일자리 직종별: 인구 비율, 생활수준, 고용 가중 임금, 실업률 (실업 노동 인구 / (고용 + 실업)). 농부가 없는 판에서는 0
    ...Object.fromEntries((['unskilled', 'farmer', 'skilled'] as const).flatMap((c) => {
      const lab = (k: MetricPoint['kingdoms'][number]) => (k.labor as Record<string, { wage: number; employed: number; jobless: number } | undefined>)[c];
      const n = sum(m, (k) => k.popBy[c] ?? 0), emp = sum(m, (k) => lab(k)?.employed ?? 0), idle = sum(m, (k) => lab(k)?.jobless ?? 0);
      return [[`${c}Pop`, +(n / pop).toFixed(3)], [`${c}Sol`, +(sum(m, (k) => (k.solBy[c] ?? 0) * (k.popBy[c] ?? 0)) / Math.max(1, n)).toFixed(2)],
        [`${c}Wage`, +(sum(m, (k) => (lab(k)?.wage ?? 0) * (lab(k)?.employed ?? 0)) / Math.max(1, emp)).toFixed(2)], [`${c}Idle`, +(idle / Math.max(1, emp + idle)).toFixed(3)]];
    })),
    farmLv: sum(m, (k) => (k.levelsBy.farm ?? 0) + (k.levelsBy.fiber_farm ?? 0) + (k.levelsBy.ranch ?? 0)),
    ...(edu[y] ?? {}),
    ...(gent[y] ?? {}),
    ...(inv[y] ?? {}),
    ...investInterval(w.metrics, (y - 5) * 360, y * 360),
  };
}
// 해마다 흐름 (cli/flowsum.py, trajchart.py): 인구, 소작농·노동자·기술자·전문가·상급 귀족 SoL, 소작농 식량, 총생산, 레벨, 곡물값, 소작농 비율, 민간 현금(백만), 실업 비율
out.traj = yearPts.map((m) => {
  const pop = sum(m, (k) => k.pop), by = (c: 'peasant' | 'unskilled' | 'skilled' | 'expert' | 'aristocrat', f: (k: MetricPoint['kingdoms'][number]) => number) =>
    +(sum(m, (k) => f(k) * k.popBy[c]) / Math.max(1, sum(m, (k) => k.popBy[c]))).toFixed(2);
  return {
    y: m.tick / 360, pop: +(pop / 1e6).toFixed(2), solPeas: by('peasant', (k) => k.solBy.peasant), solUnsk: by('unskilled', (k) => k.solBy.unskilled), solSk: by('skilled', (k) => k.solBy.skilled),
    solEx: by('expert', (k) => k.solBy.expert), solArist: by('aristocrat', (k) => k.solBy.aristocrat),
    foodPeas: by('peasant', (k) => k.foodBy.peasant), gdp: Math.round(sum(m, (k) => k.gdp) / 1e6), levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    grain: m.goods.grain.ratio, peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    privCash: Math.round(sum(m, (k) => k.privateCash) / 1e6),
    // 레벨 주인: privSh 민간 레벨 비율, lvMan·lvFin 저택·금융가가 가진 레벨, manCash·finCash 저택·금융가 금고 합(백만)
    privSh: +(sum(m, (k) => k.levelsPrivate) / Math.max(1, sum(m, (k) => k.levelsState + k.levelsPrivate))).toFixed(3),
    finR: +(sum(m, (k) => k.assetsFinance ?? 0) / Math.max(1, sum(m, (k) => (k.assetsManor ?? 0) + (k.assetsFinance ?? 0)))).toFixed(3),
    // 세법·투자법 단계 (왕국 평균: 토지 0 / 인두 1 / 소득 2, 귀족 0 … 노동자·농부 3), 주간 세입(천), 징수율
    taxIdx: +(Object.values(m.kingdoms).reduce((a, k) => a + ['land', 'poll', 'income'].indexOf(k.taxLaw ?? 'land'), 0) / Object.keys(m.kingdoms).length).toFixed(2),
    invIdx: +(Object.values(m.kingdoms).reduce((a, k) => a + ['nobles', 'upper', 'middle', 'lower'].indexOf(k.investLaw ?? 'nobles'), 0) / Object.keys(m.kingdoms).length).toFixed(2),

    treasury: Math.round(sum(m, (k) => k.treasury - k.debt) / 1e6),
    lvMan: sum(m, (k) => k.levelsManor ?? 0), lvFin: sum(m, (k) => k.levelsFinance ?? 0),
    manCash: +(sum(m, (k) => k.manorCash ?? 0) / 1e6).toFixed(1), finCash: +(sum(m, (k) => k.financeCash ?? 0) / 1e6).toFixed(1),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    // 기술자 실업률: 기술자 실업 / (고용 + 실업)
    joblessSk: (() => {
      const lab = (k: MetricPoint['kingdoms'][number]) => (k.labor as Record<string, { employed: number; jobless: number } | undefined>).skilled;
      const emp = sum(m, (k) => lab(k)?.employed ?? 0), idle = sum(m, (k) => lab(k)?.jobless ?? 0);
      return +(idle / Math.max(1, emp + idle)).toFixed(3);
    })(),
    ...(classInc[m.tick / 360] ?? {}),
    // 연구: resPts 왕국 평균 주간 연구 포인트, lit 인구 가중 문해력, techs 왕국 평균 아는 기술 수, techsMin 가장 적은 왕국
    resPts: +(Object.values(m.kingdoms).reduce((a, k) => a + k.researchPts, 0) / Object.keys(m.kingdoms).length).toFixed(1),
    lit: +(sum(m, (k) => k.literacy * k.pop) / pop).toFixed(3),
    techs: +(Object.values(m.kingdoms).reduce((a, k) => a + k.techs, 0) / Object.keys(m.kingdoms).length).toFixed(2),
    techsMin: Math.min(...Object.values(m.kingdoms).map((k) => k.techs)),
    taxRatio: +(sum(m, (k) => k.taxRatio * k.pop) / pop).toFixed(2), revWk: Math.round(sum(m, (k) => k.revenueWeek) / 1e3),
    ...(admY[m.tick / 360] ?? {}),
    // 철: 철광석·철 값(장기 기준 대비), 철광산 레벨, 철광산 충원율(레벨 가중), 철 생산(천/일)
    oreP: m.goods.ore.ratio, wIdx: Math.max(...Object.values(m.kingdoms).map((k) => k.wageIndex)), metalP: m.goods.metal.ratio, mineLv: sum(m, (k) => k.levelsBy.mine ?? 0),
    ...(ironY[m.tick / 360] ?? {}),
    ...(welY[m.tick / 360] ?? {}),
    ...(aiY[m.tick / 360] ?? {}),
    ...(fullY[m.tick / 360] ?? {}),
  };
});
const after1 = w.metrics.filter((m) => m.tick > 360);
out.foodMin = Math.min(...after1.map((m) => {
  const n = sum(m, (k) => k.popBy.unskilled);
  return n > 0 ? sum(m, (k) => k.foodBy.unskilled * k.popBy.unskilled) / n : 1;
})).toFixed(2);
// 정책 요약 (전체 기간, 왕국 평균): t5/t1 세금 5·1단계에 있던 점검 비율, run5/run1 세금 5·1단계가 가장 길게 이어진 햇수(왕국 최대),
// chg 왕국 한 곳의 한 해 세금 수준 변경 수, flip 바로 다음 점검에서 되돌린 변경 비율, wchg 국영 임금 수준 변경 수/년,
// debt 빚이 있던 점검 비율, hoard 국고가 지출 104주치(2년)를 넘던 점검 비율
const yrs = years, nk = trace.length;
let t5 = 0, t1 = 0, run5 = 0, run1 = 0, chg = 0, flips = 0, wchg = 0, debt = 0, hoard = 0, n = 0;
for (const tr of trace) {
  let run = 0, low = 0, lastDir = 0;
  tr.forEach((x, j) => {
    n++;
    if (x.tax === 5) t5++;
    if (x.tax === 1) t1++;
    run = x.tax === 5 ? run + 1 : 0;
    run5 = Math.max(run5, run);
    low = x.tax === 1 ? low + 1 : 0;
    run1 = Math.max(run1, low);
    if (x.debt) debt++;
    if (x.weeks > 104) hoard++;
    if (j === 0) return;
    const dir = Math.sign(x.tax - tr[j - 1].tax);
    if (x.wages !== tr[j - 1].wages) wchg++;
    if (dir === 0) { lastDir = 0; return; }
    chg++;
    if (lastDir === -dir) flips++;
    lastDir = dir;
  });
}
const f2 = (x: number) => +x.toFixed(2);
out.pol = { t5: f2(t5 / n), t1: f2(t1 / n), run5: f2((run5 * 28) / 360), run1: f2((run1 * 28) / 360), chg: f2(chg / nk / yrs), flip: f2(chg ? flips / chg : 0), wchg: f2(wchg / nk / yrs), debt: f2(debt / n), hoard: f2(hoard / n) };
out.laws = lawY;
out.ratioY = ratioY;
out.techY = techY;
out.failY = failY;
if (process.env.TIMING) out.time = { ms: Math.round(simMs), msPerDay: +(simMs / (years * 360)).toFixed(2) };
console.log(JSON.stringify(out));
