import { BUILDING_BY_ID, BUILDING_TYPES, CLASS_DEFS, GOOD_IDS, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE, getMethod, regionPerk } from './data';
import { withEstimateCache, regionPopulation,
  availableMethods, builderOf, canBuildType, paysDividend, companyById, constructionEstimate, creditLimit, depositFree, efficiency, estimateMethod, hasBuilder, isGovernment, regionById, researchableTechs, roomFor, slots,
} from './economy';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LAND_TAX, MAX_LEVELS_PER_PROJECT, applyCommand } from './commands';
import { budgetAmount, committedCost, lawRevenue, reserveOf } from './finance';
import { subsistenceWage } from './labor';
import { marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { kingdomById, kingdomOf } from './kingdoms';
import { workforce } from './pops';
import { rand, round2 } from './rng';
import { BUDGET_ITEMS, BUDGET_LEVELS, SKILLS } from './types';
import type { Building, Company, Kingdom, MethodDef, Region, Skill, World } from './types';

// AI: 국영과 민간이 같은 판단을 쓴다. 다른 점은 자금원(국고 / 투자 풀)과 자기 왕국 땅에만 짓는다는 것뿐이다.

/** 건설 판단 기준: 연간 이윤 / 공사비 (5년 안에 회수) */
const MIN_ROI = 0.2;
const SWITCH_COOLDOWN = TICKS_PER_WEEK * 3;
/** 공사 하나의 레벨 수 후보 (큰 것부터) */
const CHUNKS = [5, 2, 1];
/** 사무소를 한 번에 늘리는 레벨: 지금 사무소의 1/4 (최소 2) */
const OFFICE_BLOCK = 2;
const OFFICE_GROWTH = 0.25;
/** 공사 기간 동안 채울 수 있는 사람을 셀 때 보는 날 수 */
const STAFFING_HORIZON = 60;

export function runAi(w: World) {
  if (!w.config.ai) return;
  const outlook = marketOutlook(w);
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    if (c.state) { adjustTaxes(w, c); adjustBudget(w, c); }
    adjustWages(w, c);
    manageBuildings(w, c);
    if (c.state) planResearch(w, c, outlook);
    withEstimateCache(() => planConstruction(w, c, outlook));
  }
}

const ownRegions = (w: World, c: Company) => w.regions.filter((r) => r.kingdomId === c.kingdomId);

/**
 * 이 지역에서 공사 기간 안에 이 직종으로 데려올 수 있는 노동 인구.
 * 같은 직종 실업자 + (노동자) 다른 실업자와 소작농이 옮겨 오는 몫 + (그 위 직종) 자격자가 옮겨 오는 몫.
 */
function labourPool(w: World, r: Region, s: Skill): number {
  let n = 0;
  const reach = Math.min(1, TUNE.switchRate * STAFFING_HORIZON);
  for (const p of w.pops) {
    if (p.regionId !== r.id) continue;
    // 같은 직종: 실업자 전부. 귀족·자본가는 소유 자리에서 임금 자리로 옮겨 오는 사람도 센다 (국영 건물의 임금 자리)
    if (p.prof === s) { n += p.work === 0 ? workforce(p) : s === 'capitalist' || s === 'aristocrat' ? workforce(p) * reach : 0; continue; }
    if (p.prof === 'capitalist' || p.prof === 'aristocrat') continue;
    const q = s === 'unskilled' ? workforce(p) : (p.quals[s] ?? 0);
    n += p.work === 0 ? q : q * reach;
  }
  return n;
}

/** 이 방식을 levels 레벨 돌릴 일손이 공사 기간 안에 모이는가 0..1 (민간 건물의 배당 자리는 승진으로 천천히 차므로 세지 않는다) */
export function laborAvailability(w: World, r: Region, m: MethodDef, levels: number, stateOwned = true): number {
  let ok = 1;
  // 민간 건물의 소유주 자리(1%)는 공사 판단을 막지 않는다
  for (const s of SKILLS) {
    if (paysDividend(stateOwned, s)) continue;
    const need = (m.workers[s] ?? 0) * levels;
    if (need > 0) ok = Math.min(ok, labourPool(w, r, s) / need);
  }
  return ok;
}

/**
 * 임금 (데이터 기준): 바닥과 천장 사이에서, 지난주 실제로 사람이 찼는지를 보고 움직인다.
 * - 바닥: 그 자리로 옮겨 올 사람들의 지금 소득 × TUNE.wageOutside (노동자 ← 소작 수확 가치, 기술자 ← 노동자 임금, 전문가 ← 기술자 임금)
 * - 천장: 회사 생산 건물이 사람을 다 채웠을 때의 부가가치(지금 가격의 매출 − 원료) × TUNE.wageCeil 를 기본 임금 비율대로 나눈 값.
 *   실제 부가가치로 재면 사람이 없을 때 천장이 0이 되어 임금을 못 올리고 사람도 못 뽑는다. 산출이 없는 정부 건물은 천장 계산에서 뺀다
 * - 빈자리가 5% 넘는데 지난주 고용이 빈자리의 10%도 못 늘었으면 +3%, 빈자리가 2% 미만이면 −1%, 적자면 −2%
 */
function adjustWages(w: World, c: Company) {
  const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto);
  let va = 0, baseBill = 0;
  for (const b of mine) {
    const m = getMethod(b.typeId, b.methodId);
    if (!b.active || !Object.keys(m.outputs).length) continue;
    const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages, c.state);
    va += (e.revenue - e.inputCost) * b.level * b.utilization;
    for (const s of SKILLS) if (!paysDividend(c.state, s)) baseBill += slots(b, s) * SKILL_DEFS[s].baseWage;
  }
  const ceilMult = baseBill > 0 ? Math.max(0, va) * TUNE.wageCeil / baseBill : Infinity;
  const last = c.lastEmployed ?? {};
  c.lastEmployed = {};
  for (const s of SKILLS) {
    if (paysDividend(c.state, s)) continue;
    let cap = 0, emp = 0, outside = 0, people = 0;
    for (const b of mine) {
      const n = slots(b, s);
      if (n <= 0) continue;
      cap += n; emp += b.employed[s];
      const r = regionById(w, b.regionId);
      outside += (s === 'unskilled' ? subsistenceWage(w, r) : s === 'skilled' ? c.wages.unskilled : c.wages.skilled) * n;
      people += n;
    }
    c.lastEmployed[s] = emp;
    if (cap <= 0) continue;
    const floor = (people > 0 ? outside / people : 0) * TUNE.wageOutside;
    const ceiling = SKILL_DEFS[s].baseWage * ceilMult;
    const vacancy = cap - emp, grew = emp - (last[s] ?? emp);
    let wage = c.wages[s];
    if (TUNE.wageLossCut && c.lastWeekProfit < 0) wage *= 0.98;
    else if (vacancy > cap * 0.05 && grew < vacancy * 0.1) wage *= 1.03;
    else if (vacancy < cap * 0.02) wage *= 0.99;
    wage = Math.max(floor, Math.min(ceiling, wage));
    wage = Math.min(SKILL_DEFS[s].baseWage * 3, Math.max(SKILL_DEFS[s].baseWage * 0.1, wage));
    if (Math.abs(wage - c.wages[s]) > 1e-9) applyCommand(w, c.id, { type: 'setWage', skill: s, wage });
  }
}

/** 국고 목표: 지금 예산 편성의 TREASURY_WEEKS 주치. 이보다 적으면 조이고 TREASURY_LOOSE 배를 넘으면 푼다 (예산·세금 같은 기준) */
const TREASURY_WEEKS = 26;
const TREASURY_LOOSE = 1.5;

/** 국고 상황: −1 조인다(세금 올림·예산 내림), +1 푼다, 0 그대로 */
function treasuryDir(c: Company, k: Kingdom): number {
  const target = BUDGET_ITEMS.reduce((a, i) => a + budgetAmount(k, i), 0) * TREASURY_WEEKS;
  if (target <= 0) return 0;
  return c.cash < target ? -1 : c.debt <= 0 && c.cash > target * TREASURY_LOOSE ? 1 : 0;
}

/** 예산 단계 (AI 왕국, 4주마다): treasuryDir 만큼 모든 항목을 한 단계 움직인다 */
function adjustBudget(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  const dir = treasuryDir(c, k);
  if (!dir) return;
  for (const item of BUDGET_ITEMS) {
    const v = Math.min(BUDGET_LEVELS.length, Math.max(1, k.budget[item] + dir));
    if (v !== k.budget[item]) applyCommand(w, c.id, { type: 'setBudget', item, value: v });
  }
}

/** 세법을 바꾸는 기준: 다른 세법의 예상 세입이 지금의 이 배수를 넘을 때, 마지막으로 바꾼 지 LAW_COOLDOWN 틱이 지났을 때 */
const LAW_SWITCH = 1.2;
const LAW_COOLDOWN = TICKS_PER_YEAR;

/** 세법 (AI 왕국, 4주마다): 두 세법으로 지금 걷힐 세금(lawRevenue)을 비교해 더 걷히는 쪽으로 바꾼다 */
function chooseTaxLaw(w: World, c: Company, k: Kingdom) {
  if (w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  if (k.lawTick != null && w.tick - k.lawTick < LAW_COOLDOWN) return;
  const other = k.taxLaw === 'land' ? 'capita' : 'land';
  if (lawRevenue(w, k, other) > lawRevenue(w, k, k.taxLaw) * LAW_SWITCH) applyCommand(w, c.id, { type: 'setTaxLaw', law: other });
}

/** 토지세율을 한 주에 바꾸는 폭 */
const LAND_TAX_STEP = 0.01;

/** 소득세율 범위와 한 주에 바꾸는 폭 */
const TAX_MAX = 0.3;
const TAX_STEP = 0.01;

/**
 * 재정 (AI 왕국)
 * - 세법: chooseTaxLaw 가 고른다. 토지 기반이면 토지세율만, 1인당이면 아래 두 가지를 움직인다.
 * - 세금 수준: treasuryDir (국고가 예산 편성의 TREASURY_WEEKS 주치보다 적으면 올리고, TREASURY_LOOSE 배를 넘으면 내린다).
 * - 세금 형태: 신분마다 인두세가 그 신분 1인당 현금 소득의 TUNE.pollShareMax 를 넘으면 인두세를 한 단계 내리고,
 *   줄어드는 세입만큼 소득세율을 올린다 (세입은 그대로, 소득세율 상한까지). 부유한 신분이 늘수록 소득세 중심이 된다.
 *   플레이어는 setTax 로 직접 정한다
 */
function adjustTaxes(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k) return;
  chooseTaxLaw(w, c, k);
  const dir = -treasuryDir(c, k);
  if (k.taxLaw === 'land') {
    const v = round2(Math.min(MAX_LAND_TAX, Math.max(TUNE.landTax, k.landTax + dir * LAND_TAX_STEP)));
    if (v !== k.landTax) applyCommand(w, c.id, { type: 'setLandTax', value: v });
    return;
  }
  const income = { lower: 0, middle: 0, upper: 0 }, people = { lower: 0, middle: 0, upper: 0 };
  for (const p of w.pops) {
    if (kingdomOf(w, p.regionId) !== k.id) continue;
    const st = CLASS_DEFS[p.prof].stratum;
    income[st] += Math.max(0, p.incomeEma); people[st] += p.size;
  }
  for (const s of ['lower', 'middle', 'upper'] as const) {
    let poll = k.pollTax[s], rate = k.incomeTax[s];
    const perHead = people[s] > 0 ? income[s] / people[s] : 0;
    if (poll > perHead * TUNE.pollShareMax && poll > 0 && income[s] > 0) {
      const shift = (Math.min(TAX_STEP, poll) * people[s]) / income[s];
      if (rate + shift <= TAX_MAX) { poll -= Math.min(TAX_STEP, poll); rate += shift; }
    }
    rate += dir * TAX_STEP;
    k.pollTax[s] = round2(Math.max(0, poll));
    k.incomeTax[s] = round2(Math.min(TAX_MAX, Math.max(0, rate)));
  }
}

/** 산출물 1단위당 이윤 (방식끼리 비교용) */
function unitProfit(profit: number, m: MethodDef): number {
  const out = GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0), 0);
  return out > 0 ? profit / out : profit;
}

/** 투입재를 대륙 어딘가에서 실제로 구할 수 있는가 */
function inputsAvailable(w: World, m: MethodDef, levels: number): boolean {
  for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) {
    let avail = 0;
    for (const x of w.regions) avail += x.market[g].supplyEma;
    if (avail < per * levels * 0.5) return false;
  }
  return true;
}

function manageBuildings(w: World, c: Company) {
  for (const b of w.buildings.filter((x) => x.companyId === c.id && !BUILDING_BY_ID[x.typeId].auto)) {
    const usable = availableMethods(c, b.typeId);
    const cur = getMethod(b.typeId, b.methodId);
    const current = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages, c.state);

    // 건축사무소: 자재를 구할 수 있는 방식 중 하루 포인트가 가장 많은 것
    if (cur.construction) {
      const starved = b.active && !b.idle && b.last.inputFill < 0.5;
      const ok = usable.filter((m) => m.construction && (m.id === b.methodId ? !starved : inputsAvailable(w, m, b.level)));
      const best = ok.length ? ok.reduce((x, m) => (m.construction! > x.construction! ? m : x)) : null;
      if (best && best.id !== b.methodId && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 학교: 일손을 구할 수 있는 방식 중 1인당 인건비가 가장 싼 것
    if (cur.seats) {
      const perSeat = (m: MethodDef) => estimateMethod(w, b.regionId, b.typeId, m.id, c.wages, c.state).wageCost / m.seats!;
      const r = regionById(w, b.regionId);
      const ok = usable.filter((m) => m.seats && (m.id === cur.id || laborAvailability(w, r, m, b.level, c.state) >= 0.5));
      const best = ok.reduce((x, m) => (perSeat(m) < perSeat(x) ? m : x), cur);
      if (best.id !== cur.id && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      // 왕실 학교의 가동률은 교육 예산이 정한다
      if (c.state) continue;
    }

    // 생산 방식: 같은 상품을 더 싸게 만드는 방식으로 (3주 쿨다운). 투입재를 못 구해 멈췄으면 쿨다운 없이
    const starved = Object.keys(cur.inputs).length > 0 && b.active && b.last.inputFill < 0.5 && b.last.staffing > 0;
    if (!cur.seats && usable.length > 1 && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
      let best = { m: cur, v: starved ? -Infinity : unitProfit(current.profit, cur) };
      for (const m of usable) {
        if (m.id === cur.id || !inputsAvailable(w, m, b.level)) continue;
        const v = unitProfit(estimateMethod(w, b.regionId, b.typeId, m.id, c.wages, c.state).profit, m);
        if (v > best.v * 1.05 + 0.01) best = { m, v };
      }
      if (best.m !== cur) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.m.id });
    }

    if (!b.active) {
      b.pausedWeeks += 1;
      if (current.margin > 0.05 && inputsAvailable(w, cur, b.level)) {
        applyCommand(w, c.id, { type: 'setActive', buildingId: b.id, active: true });
        applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: 0.3 });
        b.lossWeeks = 0; b.profitEma = 0;
      }
      continue;
    }
    // 적자면 끄지 않고 가동률부터 줄인다 (4주마다 10%씩). 철거는 planConstruction 이 짓기와 같은 계산으로 정한다
    const cost = b.last.inputCost + b.last.wageCost;
    const actualMargin = cost > 0 ? (b.last.revenue - cost) / cost : 0;
    const bleeding = b.profitEma < 0 && (current.margin < -0.2 || actualMargin < -0.2);
    b.lossWeeks = bleeding ? b.lossWeeks + 1 : 0;
    if (b.lossWeeks >= 4 && b.utilization > 0.1 + 1e-9) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(0.1, b.utilization - 0.1) });
      b.lossWeeks = 0;
    } else if (b.utilization < 1 && current.margin > 0) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: b.utilization + 0.1 });
    }
  }
}

/** 지역 학교 자리: 학교 레벨(공사 중 포함) × 방식의 자리. 가동률과 무관하게 지은 만큼 센다 */
function schoolSeats(w: World, regionId: number): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === regionId) n += b.level * (getMethod(b.typeId, b.methodId).seats ?? 0);
  for (const k of w.constructions) if (k.regionId === regionId) n += (k.levels ?? 1) * (getMethod(k.typeId, k.methodId).seats ?? 0);
  return n;
}

/**
 * 학교의 공익 (왕실만 센다, 민간은 보조금 수입만 본다): 학교 레벨이 새로 감당하는 인구 × TUNE.schoolValue.
 * 이미 있는 레벨이면 그 레벨이 없을 때 못 배우는 인구만 센다
 */
function schoolBenefit(w: World, c: Company, r: Region, m: MethodDef, levels: number, existing: boolean): number {
  if (!c.state) return 0;
  const add = levels * (m.seats ?? 0);
  const others = schoolSeats(w, r.id) - (existing ? add : 0);
  return Math.min(add, Math.max(0, regionPopulation(r) - others)) * TUNE.schoolValue;
}

function planResearch(w: World, c: Company, o: Outlook) {
  const r = c.research;
  if (!r.current) {
    const direct = new Map(Object.keys(TECH_BY_ID).map((id) => [id, techValue(w, o, c, id)] as const));
    // 학교를 여는 기술: 자기 왕국에서 학교가 감당하지 못하는 인구를 가르치는 가치
    let uncovered = 0;
    for (const reg of ownRegions(w, c)) uncovered += Math.max(0, regionPopulation(reg) - schoolSeats(w, reg.id));
    for (const t of BUILDING_TYPES) for (const m of t.methods) if (m.grant && m.tech) direct.set(m.tech, (direct.get(m.tech) ?? 0) + uncovered * TUNE.schoolValue);
    const memo = new Map<string, number>();
    const deep = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      memo.set(id, 0);
      let v = direct.get(id) ?? 0;
      for (const t of Object.values(TECH_BY_ID)) if (t.requires.includes(id)) v = Math.max(v, deep(t.id) * 0.5);
      memo.set(id, v);
      return v;
    };
    const ranked = researchableTechs(c).map((id) => ({ id, s: ((deep(id) + 1) / TECH_BY_ID[id].cost) * (0.85 + rand(w) * 0.3) })).sort((a, b) => b.s - a.s);
    if (ranked.length) applyCommand(w, c.id, { type: 'setResearch', techId: ranked[0].id });
  }
}

function planConstruction(w: World, c: Company, o: Outlook) {
  if (!hasBuilder(w, c)) {
    const home = ownRegions(w, c).sort((a, b) => b.land.plot - a.land.plot)[0];
    if (home && !w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) applyCommand(w, c.id, { type: 'build', typeId: 'builder', regionId: home.id, levels: Math.min(OFFICE_BLOCK, MAX_LEVELS_PER_PROJECT) });
    return;
  }
  for (const k of w.constructions.filter((x) => x.companyId === c.id)) if (k.ticksElapsed > 720 && k.points < k.required * 0.5) applyCommand(w, c.id, { type: 'cancelConstruction', constructionId: k.id });
  const est = constructionEstimate(w, c, 'farm');
  // 밀린 공사는 같은 사무소가 맡은 공사 전부로 센다 (왕실 + 그 왕국 민간)
  const builder = builderOf(w, c);
  const backlog = () => w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === builder; }).reduce((s, k) => s + (k.required - k.points), 0) / Math.max(1, est.pointsPerDay);
  // 공사가 한 달 넘게 밀려 있고 돈이 넉넉하면 사무소를 한 블록 늘린다. 사무소는 왕실만 늘린다
  if (builder === c) {
    const offices = w.buildings.filter((b) => b.companyId === c.id && b.typeId === 'builder');
    const officeLevel = offices.reduce((s, b) => s + b.level, 0);
    const block = Math.max(OFFICE_BLOCK, Math.round(officeLevel * OFFICE_GROWTH));
    const officeCost = constructionEstimate(w, c, 'builder').cost * block;
    // 증설 자금: 현금 + 민간 공사 수수료 수입 TUNE.feeWeeks 주치 (수수료는 대기가 밀린 동안 계속 들어온다)
    // 건설 예산이 사무소를 다 못 돌리면 늘리지 않는다
    if (offices.every((b) => b.utilization >= 1) && backlog() > TUNE.officeTargetDays && c.cash + c.lastLedger.buildFees * TUNE.feeWeeks > officeCost * 1.5 && !w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) {
      const office = offices[0];
      // 대기가 TUNE.officeTargetDays 안으로 들어올 만큼 한 번에 늘린다
      const perLevel = est.pointsPerDay / Math.max(1, officeLevel);
      const want = Math.ceil((backlog() * est.pointsPerDay / TUNE.officeTargetDays - est.pointsPerDay) / Math.max(1e-9, perLevel));
      // 한 번에 늘리는 양은 지금 사무소가 목표 일수 안에 지을 수 있는 만큼까지 (증설 공사가 너무 길어지지 않게)
      const byTime = Math.floor((est.pointsPerDay * TUNE.officeTargetDays) / BUILDING_BY_ID.builder.buildPoints);
      const levels = Math.min(Math.max(block, want), Math.max(block, byTime), MAX_LEVELS_PER_PROJECT);
      // 부지가 모자라면 남은 만큼만 늘리고, 그것도 안 되면 부지가 가장 넓은 자기 지역에 사무소를 새로 짓는다
      const spot = office && roomFor(w, office.regionId, 'builder') >= block ? office.regionId
        : ownRegions(w, c).map((r) => r.id).sort((a, b) => roomFor(w, b, 'builder') - roomFor(w, a, 'builder'))[0];
      const fit = spot != null ? Math.min(levels, roomFor(w, spot, 'builder')) : 0;
      const here = offices.find((b) => b.regionId === spot);
      const err = fit < 1 ? 'no room'
        : here ? applyCommand(w, c.id, { type: 'expand', buildingId: here.id, levels: fit })
        : applyCommand(w, c.id, { type: 'build', typeId: 'builder', regionId: spot!, levels: fit });
      if (!err) toFront(w, c);
    }
  }
  reviewLevels(w, c, o, est.pointsPerDay, backlog());
  let fallbacks = 0;
  let blocked: { best: Pick | null } | undefined;
  for (let started = 0; started < TUNE.startsPerWeek; started++) {
    const own = w.constructions.filter((k) => k.companyId === c.id).length;
    if (own >= MAX_CONCURRENT_CONSTRUCTIONS) break;
    if (c.debt > creditLimit(w, c) * 0.3) break;
    const free = c.cash - reserveOf(w, c) - committedCost(w, c) - est.costPerDay * 30;
    if (free <= 0) break;
    const out = { best: null as Pick | null };
    const pick = pickProject(w, c, o, free, fallbacks < TUNE.lossBuildsPerWeek, out);
    blocked ??= out;
    if (!pick) break;
    if (pick.fallback) fallbacks++;
    const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === pick.regionId && b.typeId === pick.typeId);
    const err = existing
      ? applyCommand(w, c.id, { type: 'expand', buildingId: existing.id, levels: pick.levels })
      : applyCommand(w, c.id, { type: 'build', typeId: pick.typeId, regionId: pick.regionId, methodId: pick.methodId, levels: pick.levels });
    if (err) break;
    if (pick.fallback) {
      const starts = (kingdomById(w, c.kingdomId).startsMonth ??= {});
      starts[`${pick.typeId}|loss`] = (starts[`${pick.typeId}|loss`] ?? 0) + pick.levels;
    }
    if (isGovernment(pick.typeId)) toFront(w, c);
    // 지역 돈을 먼저 쓴다
    if (c.regionFunds?.[pick.regionId]) c.regionFunds[pick.regionId] = Math.max(0, c.regionFunds[pick.regionId] - constructionEstimate(w, c, pick.typeId).cost * pick.levels);
    o.add(getMethod(pick.typeId, pick.methodId), pick.levels, 1 + regionPerk(pick.regionId, pick.typeId));
  }
  if (blocked?.best) swapLand(w, c, o, blocked.best);
}

/**
 * 내 건물 마지막 1레벨의 장기 하루 손익: 짓기 판단(valueMethod)과 같은 계산이고, 이미 도는 레벨이라 전망에 더하지 않는다.
 * 건축사무소는 손익 대신 공사 대기로 본다: 그 레벨을 빼도 대기가 목표 일수의 절반 안이면 −1, 아니면 +1
 */
function levelValue(w: World, c: Company, o: Outlook, b: Building, pointsPerDay: number, backlogDays: number): number {
  const m = getMethod(b.typeId, b.methodId);
  if (m.construction) {
    const perLevel = m.construction * b.utilization * efficiency(b);
    const left = pointsPerDay - perLevel;
    if (left <= 0) return 1;
    return (backlogDays * pointsPerDay) / left < TUNE.officeTargetDays * 0.5 ? -1 : 1;
  }
  const r = regionById(w, b.regionId);
  const e = valueMethod(w, o, r, c, b.typeId, m, 1, true);
  if (m.grant) e.profit += schoolBenefit(w, c, r, m, 1, true);
  return e.profit;
}

/**
 * 철거 판단 (짓기와 같은 주, 같은 전망): 마지막 레벨 손익이 TUNE.shrinkWeeks 주 연속 마이너스면 레벨의 1/4(최소 1)을 철거 대기에 올린다.
 * 손실 때문에 헐리는 중인 건물이 다시 이익을 내면 철거를 취소한다. 증설 공사 중인 건물은 보지 않는다
 */
function reviewLevels(w: World, c: Company, o: Outlook, pointsPerDay: number, backlogDays: number) {
  for (const b of w.buildings) {
    if (b.companyId !== c.id || BUILDING_BY_ID[b.typeId].auto) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) { b.negWeeks = 0; continue; }
    const v = levelValue(w, c, o, b, pointsPerDay, backlogDays);
    if (b.shrinking) {
      if (v > 0 && !b.swap) b.shrinking = 0;
      continue;
    }
    b.swap = false;
    b.negWeeks = v < 0 ? (b.negWeeks ?? 0) + 1 : 0;
    if (b.negWeeks >= TUNE.shrinkWeeks) {
      applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: Math.max(1, Math.round(b.level * 0.25)) });
      b.negWeeks = 0;
    }
  }
}

/**
 * 땅 바꾸기: 땅이 없어 못 짓는 가장 좋은 후보가 있으면, 그 지역 같은 땅의 내 건물 중 마지막 레벨 수익률이 가장 낮은 것과 비교해
 * 후보 수익률이 그 TUNE.swapMult 배(그리고 기준 수익률)를 넘으면 그 건물을 후보 덩어리만큼 헌다
 */
function swapLand(w: World, c: Company, o: Outlook, cand: Pick) {
  const land = BUILDING_BY_ID[cand.typeId].land;
  const est = constructionEstimate(w, c, 'farm');
  let worst: { b: Building; roi: number } | null = null;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || b.regionId !== cand.regionId || b.shrinking || BUILDING_BY_ID[b.typeId].auto) continue;
    if (BUILDING_BY_ID[b.typeId].land !== land || b.typeId === cand.typeId) continue;
    if (getMethod(b.typeId, b.methodId).construction) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) continue;
    const cost = constructionEstimate(w, c, b.typeId).cost;
    if (!Number.isFinite(cost) || cost <= 0) continue;
    const roi = (levelValue(w, c, o, b, est.pointsPerDay, 0) * TICKS_PER_YEAR) / cost;
    if (!worst || roi < worst.roi) worst = { b, roi };
  }
  if (!worst || cand.score <= Math.max(MIN_ROI, worst.roi) * TUNE.swapMult) return;
  const n = Math.min(worst.b.level, cand.levels);
  if (!applyCommand(w, c.id, { type: 'demolish', buildingId: worst.b.id, levels: n })) worst.b.swap = true;
}

interface Pick { regionId: number; typeId: string; methodId: string; levels: number; score: number; fallback?: boolean }

/**
 * 모든 후보를 같은 기준으로: 장기 손익 / 공사비. 수익률이 기준의 1.25배를 넘는 가장 큰 덩어리를 고른다.
 * allowLoss: 이익이 나는 후보가 없으면 수익률이 가장 높은(가장 덜 손해 보는) 후보를 가장 작은 덩어리로 고른다
 */
export function pickProject(w: World, c: Company, o: Outlook, free: number, allowLoss = false, blocked?: { best: Pick | null }): Pick | null {
  let best: Pick | null = null, least: Pick | null = null;
  for (const r of ownRegions(w, c)) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      const room = roomFor(w, r.id, t.id);
      const perLevel = constructionEstimate(w, c, t.id).cost;
      if (!Number.isFinite(perLevel) || free < perLevel) continue;
      const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id);
      if (existing?.shrinking) continue;
      // 땅이 없으면 1레벨 기준 수익률만 재 둔다 (땅 바꾸기 후보). 매장량이 없는 것은 땅을 비워도 못 지으므로 뺀다
      if (room < 1) {
        if (!blocked || (t.deposit && depositFree(w, r.id, t.deposit) < 1)) continue;
        for (const m of availableMethods(c, t.id)) {
          if (existing && existing.methodId !== m.id) continue;
          if (laborAvailability(w, r, m, 1, c.state) < 0.5) continue;
          const e = valueMethod(w, o, r, c, t.id, m, 1);
          if (m.grant) e.profit += schoolBenefit(w, c, r, m, 1, false);
          const roi = (e.profit * TICKS_PER_YEAR) / perLevel;
          if (e.profit > 0 && roi > MIN_ROI && (!blocked.best || roi > blocked.best.score)) blocked.best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: 1, score: roi };
        }
        continue;
      }
      for (const m of availableMethods(c, t.id)) {
        if (existing && existing.methodId !== m.id) continue;
        let choice: { levels: number; roi: number } | null = null, top: { levels: number; roi: number } | null = null;
        for (const levels of CHUNKS) {
          if (levels > room || free < perLevel * levels) continue;
          const e = valueMethod(w, o, r, c, t.id, m, levels);
          if (m.grant) e.profit += schoolBenefit(w, c, r, m, levels, false);
          if (laborAvailability(w, r, m, levels, c.state) < 0.5) continue;
          const roi = (e.profit * TICKS_PER_YEAR) / (perLevel * levels);
          if (allowLoss && levels === CHUNKS[CHUNKS.length - 1] && e.profit >= -TUNE.lossTolerance * e.wageCost) {
            const s = roi + Math.abs(roi) * (rand(w) - 0.5) * 0.3;
            if (!least || s > least.score) least = { regionId: r.id, typeId: t.id, methodId: m.id, levels, score: s, fallback: true };
          }
          if (e.profit <= 0) continue;
          if (roi <= MIN_ROI) continue;
          if (!top || roi > top.roi) top = { levels, roi };
          if (!choice && roi > MIN_ROI * 1.25) choice = { levels, roi };
        }
        const pick = choice ?? top;
        if (!pick) continue;
        // 지역 우선 투자: 그 지역 사람들이 낸 돈으로 짓는 몫만큼 가산점
        const local = Math.min(1, (c.regionFunds?.[r.id] ?? 0) / (perLevel * pick.levels));
        const score = pick.roi * (0.85 + rand(w) * 0.3) * (1 + TUNE.localBias * local);
        if (!best || score > best.score) best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: pick.levels, score };
      }
    }
  }
  return best ?? least;
}

/** 방금 넣은 내 공사(목록 맨 끝)를 내 공사 맨 앞으로 옮긴다 */
function toFront(w: World, c: Company) {
  const mine = w.constructions.filter((k) => k.companyId === c.id);
  const last = mine[mine.length - 1];
  if (last && mine.length > 1) applyCommand(w, c.id, { type: 'moveConstruction', constructionId: last.id, index: 0 });
}

