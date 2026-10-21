import { BUILDING_BY_ID, buildPointsOf, GOODS, GOOD_IDS, TICKS_PER_WEEK, MAX_POINTS_PER_LEVEL_DAY, OWNER_SEATS_PER_LEVEL, OWNERSHIP_SEATS, TUNE, WORKFORCE_RATIO, getMethod } from './data';
import { addOwnerLevels, ownBuildingAt, builderOf, companyById, efficiency, harvestFactor, isGovernment, landFree, logEvent, newBuilding, regionById } from './economy';
import { SKILLS } from './types';
import { workforce } from './pops';
import { flow, kingdomById } from './kingdoms';
import { buildingNameEn, regionNameEn } from './i18n';
import { clamp } from './rng';
import type { Building, Company, Construction, GoodBag, GoodId, World } from './types';
import { budgetEmaWeight, weeklyOutputValue } from './finance';

/** 숙련도가 하루에 오르는 양 (0..1 에서 3.5%p, 약 한 달이면 최대) */
export const EXP_GAIN = 0.035;
/** 작업 인원이 실제 충원율을 따라가는 하루 비율 */
export const CREW_RATE = 0.08;

/**
 * 소작지는 지역의 빈 농지 전부다. 농장이 들어서면 줄고, 헐리면 다시 늘어난다.
 * 지역마다 하나이고 그 지역 왕국 민간의 소유로 둔다. 짓거나 헐 수 없다.
 */
export function updateSubsistence(w: World) {
  for (const r of w.regions) {
    const level = Math.max(0, Math.floor(landFree(w, r.id, 'arable')));
    let b = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence');
    const owner = kingdomById(w, r.kingdomId).privateIds[0];
    if (!b) {
      b = newBuilding(w.nextId++, 'subsistence', r.id, owner, 'subsistence', level, false);
      b.exp = 1; b.crew = 1;
      w.buildings.push(b);
    }
    b.companyId = owner; b.stateOwned = false;
    b.level = level;
  }
  updateOwnership(w);
}

/**
 * 저택의 상급 귀족 자리 (노동 인구, TUNE.nobleSeats 규칙. 비교 중이며 기본 'fit' 은 정해진 자리 없이 지역 귀족이 다 앉는다 → undefined).
 * - owned: 저택이 가진 건물 레벨 × nobleSeatsPerLevel + 소작지 칸 × nobleSeatsPerCell
 * - income: 저택 수입(profitEma) ÷ 귀족 1명 목표 수입 nobleIncome (하루 1% 씩 다가간다. 처음에는 지금 귀족 수에서 시작한다)
 * - land: (소작지 칸 + 저택이 가진 건물 레벨) × nobleSeatsLand
 * - pop: 지역 인구 × noblePerMille / 1000 × 노동 인구 비율
 * 규칙이 있으면 상급 귀족 수는 이 자리에 맞춰 간다 (pops.ts matchNobles)
 */
function nobleSeatsOf(w: World, regionId: number, b: Building, own: number): number | undefined {
  const rule = TUNE.nobleSeats;
  if (rule === 'fit') return undefined;
  const cells = () => w.buildings.find((x) => x.regionId === regionId && x.typeId === 'subsistence')?.level ?? 0;
  if (rule === 'owned') return Math.round(own * TUNE.nobleSeatsPerLevel + cells() * TUNE.nobleSeatsPerCell);
  if (rule === 'land') return Math.round((own + cells()) * TUNE.nobleSeatsLand);
  if (rule === 'econ') {
    // 저택이 가진 경제 규모 (주간, 기본가): 가진 레벨의 산출 가치 + 그 지역 소작지 수확. 자리 목표 = 규모 ÷ nobleEconPer, 하루 1%씩 다가간다
    let value = 0;
    for (const x of w.buildings) {
      const n = x.owners?.[b.id];
      if (n) value += n * weeklyOutputValue(x.typeId, x.methodId);
      else if (x.regionId === regionId && x.typeId === 'subsistence') for (const [g, q] of Object.entries(x.last.output)) value += (q ?? 0) * GOODS[g as GoodId].basePrice * TICKS_PER_WEEK;
    }
    let prev = b.nobleSeats;
    if (prev === undefined) { prev = 0; for (const p of w.pops) if (p.regionId === regionId && p.prof === 'aristocrat') prev += workforce(p); }
    return prev + (value / TUNE.nobleEconPer - prev) * TUNE.nobleAdjust;
  }
  if (rule === 'pop') {
    let n = 0;
    for (const p of w.pops) if (p.regionId === regionId) n += p.size;
    return Math.round((n * TUNE.noblePerMille) / 1000 * WORKFORCE_RATIO);
  }
  let prev = b.nobleSeats;
  if (prev === undefined) { prev = 0; for (const p of w.pops) if (p.regionId === regionId && p.prof === 'aristocrat') prev += workforce(p); }
  return prev + (Math.max(0, b.profitEma) / TUNE.nobleIncome - prev) * 0.01;
}

/**
 * 소유 건물(저택·금융가): 지역마다 하나씩, 그 지역 민간 소유.
 * 크기는 가진 건물 레벨(어느 지역 것이든) × OWNER_SEATS_PER_LEVEL 과, 자리가 있는 직종마다 다른 건물에서 일하지 않는 그 지역 노동 인구(실업자 + 여기 앉은 사람)가
 * 다 앉을 만큼 중 가장 큰 쪽이다 (저택: 귀족과, 다른 일자리가 없는 하급 귀족). 저택 상급 귀족 자리 규칙(nobleSeatsOf)이 있으면 귀족 자리는 그 값이고,
 * 저택 레벨은 그 자리와 하급 귀족이 다 앉을 만큼 중 큰 쪽이다.
 * 하루 받은 배당·지대(last.revenue)는 이동평균(profitEma)으로 남긴다 (자리 값).
 */
export function updateOwnership(w: World) {
  // 소유 건물 id → 가진 레벨 (어느 지역 건물이든)
  const owned = new Map<number, number>();
  for (const b of w.buildings) for (const [id, n] of Object.entries(b.owners ?? {})) owned.set(Number(id), (owned.get(Number(id)) ?? 0) + n);
  for (const r of w.regions) {
    const owner = kingdomById(w, r.kingdomId).privateIds[0];
    for (const typeId of ['manor', 'finance']) {
      let b = w.buildings.find((x) => x.regionId === r.id && x.typeId === typeId);
      if (!b) {
        b = newBuilding(w.nextId++, typeId, r.id, owner, typeId, 0, false);
        b.exp = 1; b.crew = 1;
        w.buildings.push(b);
      }
      const workers = getMethod(typeId, typeId).workers;
      const own = owned.get(b.id) ?? 0;
      let levels = (own * OWNER_SEATS_PER_LEVEL) / OWNERSHIP_SEATS;
      const seats = typeId === 'manor' ? nobleSeatsOf(w, r.id, b, own) : undefined;
      if (seats !== undefined) { b.nobleSeats = seats; levels = seats / OWNERSHIP_SEATS; }
      // 금융가: 가진 레벨 1당 전문가 TUNE.financeStaff 자리 (실업자 수로 늘리지 않는다)
      if (typeId === 'finance') levels = (own * TUNE.financeStaff) / OWNERSHIP_SEATS;
      for (const s of SKILLS) {
        if (typeId === 'finance') break;
        const per = workers[s] ?? 0;
        if (!(per > 0) || (seats !== undefined && s === 'aristocrat')) continue;
        let wf = 0;
        for (const p of w.pops) if (p.regionId === r.id && p.prof === s && (p.work === 0 || p.work === b.id)) wf += workforce(p);
        levels = Math.max(levels, wf / per);
      }
      b.companyId = owner; b.stateOwned = false;
      // 저택·금융가는 늘 다 가동한다 (가동률·원료 충족 100%)
      b.utilization = 1; b.last.inputFill = 1;
      b.level = Math.max(1, Math.ceil(levels));
      b.profitEma = b.profitEma * 0.95 + b.last.revenue * 0.05;
      b.last.revenue = 0;
    }
  }
}

/** 맡은 공사(왕실 것과 그 왕국 민간 것)가 없는 건축사무소는 쉰다 (포인트·자재 없음). TUNE.officeIdleDays 일을 넘게 쉬면 인부를 해산한다 (economy.ts slots) */
export function updateIdleOffices(w: World) {
  const busy = new Set<number>();
  for (const k of w.constructions) { const o = companyById(w, k.companyId); if (o) busy.add(builderOf(w, o).id); }
  for (const b of w.buildings) {
    if (!getMethod(b.typeId, b.methodId).construction) continue;
    b.idle = !busy.has(b.companyId);
    if (b.idle) b.idleDays = (b.idleDays ?? 0) + 1; else if (b.idleDays) b.idleDays = 0;
  }
}

/** 오늘 건축사무소 비용 중 임금 (회사 id 별, 저장하지 않는다. 예산 미리보기용 수수료 나누기) */
const buildWage = new Map<number, number>();

export function produce(w: World) {
  for (const c of w.companies) { c.buildPoints = 0; c.buildCost = 0; }
  buildWage.clear();
  for (const b of w.buildings) {
    if (!b.active || BUILDING_BY_ID[b.typeId].auto) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    const method = getMethod(b.typeId, b.methodId);
    const crew = b.crew ?? b.last.staffing;
    const st = (b.crew = crew + (b.last.staffing - crew) * CREW_RATE);
    b.last.points = 0;
    b.last.output = {};
    if (st > 1e-4) {
      // 기상 조건은 농지·산림·광맥 건물의 투입과 산출을 함께 줄인다 (빅토리아3 throughput, 일자리는 그대로). 효율은 행정청·사무소도 쓰므로 따로
      const run = b.level * b.utilization * st * harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land);
      let fill = 1;
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (per) fill = Math.min(fill, (b.stock[g] ?? 0) / (per * run));
      }
      fill = b.idle ? 0 : clamp(fill, 0, 1);
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (per) b.stock[g] = Math.max(0, (b.stock[g] ?? 0) - per * run * fill);
      }
      b.last.inputFill = b.idle ? 1 : fill;
      if (!b.idle && Object.keys(method.inputs).length) b.fillEma = (b.fillEma ?? 1) * 0.95 + fill * 0.05;
      const scale = run * fill * efficiency(b);
      for (const g of GOOD_IDS) {
        const per = method.outputs[g];
        if (!per) continue;
        const q = per * scale;
        b.last.output[g] = q;
        b.outStock[g] = q;
      }
      if (method.construction && !b.idle) {
        b.last.points = method.construction * scale;
        c.buildPoints += b.last.points;
        c.buildCost += b.last.wageCost + b.last.inputCost;
        buildWage.set(c.id, (buildWage.get(c.id) ?? 0) + b.last.wageCost);
      }
      b.exp = Math.min(1, b.exp + EXP_GAIN);
    } else {
      b.last.inputFill = 0;
    }
    c.revenueEma = c.revenueEma * 0.98 + b.last.revenue * 0.02;
    const profit = b.last.revenue - b.last.inputCost - b.last.wageCost;
    b.profitEma = b.profitEma * 0.95 + profit * 0.05;
    c.weekProfit += profit;
    c.ledger.sales += b.last.revenue - (b.last.tax ?? 0);
    c.ledger.tax += b.last.tax ?? 0;
    c.ledger.inputs += b.last.inputCost;
    c.ledger.wages += b.last.wageCost;
    // 왕실 정부 건물의 운영비는 국정 지출로 따로 센다 (spendBudget 이 매주 lastBudget 에 적는다)
    if (c.state && isGovernment(b.typeId)) {
      const spent = (kingdomById(w, c.kingdomId).spentWeek ??= { wages: 0, goods: 0 });
      spent.wages += b.last.wageCost;
      spent.goods += b.last.inputCost;
    } else if (c.state) {
      // 왕실 생산 건물: 매출·원료·임금이 국고에 바로 들고 난다. 국정 수지의 국영 사업 손익 줄 (화면 전용, sim 은 읽지 않는다)
      const spent = (kingdomById(w, c.kingdomId).spentWeek ??= { wages: 0, goods: 0 });
      spent.firms = (spent.firms ?? 0) + profit;
      const a = budgetEmaWeight(w, 0.05), e = b.firmEma;
      b.firmEma = e ? { sales: e.sales * (1 - a) + b.last.revenue * a, inputs: e.inputs * (1 - a) + b.last.inputCost * a } : { sales: b.last.revenue, inputs: b.last.inputCost };
    }
  }
  allocateConstruction(w);
}

/**
 * 건축사무소의 하루 포인트를 그 왕국 공사에 나눈다. 왕실 몫 50%, 민간 몫 50%이고, 각 몫 안에서는 공사 순서대로 쓴다.
 * 한 공사는 레벨당 하루 MAX_POINTS_PER_LEVEL_DAY 까지만 받는다 (빅토리아3). 한쪽이 다 못 쓴 몫은 다른 쪽이 쓴다.
 * 민간은 쓴 포인트만큼 사무소 주인에게 공사비를 낸다.
 */
function allocateConstruction(w: World) {
  for (const c of w.companies) {
    if (c.buildPoints <= 0) {
      if (c.state) c.buildUsed = (c.buildUsed ?? 0) * 0.9;
      continue;
    }
    const costPerPoint = c.buildCost / c.buildPoints;
    // 수수료의 임금 몫 → 왕국 기록 (국영 임금 수준 배율 1로 환산, 예산 미리보기 전용)
    const kd = c.state ? kingdomById(w, c.kingdomId) : undefined;
    const wm = kd ? TUNE.govWageLevels[kd.budget.wages - 1] : 0;
    const wageShare = c.buildCost > 0 && wm > 0 ? (buildWage.get(c.id) ?? 0) / c.buildCost / wm : 0;
    const mine = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === c; });
    const taken = new Map<number, number>();
    const byId = new Map(w.buildings.map((b) => [b.id, b] as const));
    const serve = (list: typeof mine, budget: number) => {
      for (const k of list) {
        if (budget <= 1e-9) break;
        if (k.paused) continue;
        const owner = companyById(w, k.companyId)!;
        const room = MAX_POINTS_PER_LEVEL_DAY * (k.levels ?? 1) - (taken.get(k.id) ?? 0);
        let take = Math.min(budget, room, k.required - k.points);
        // 민간 공사는 약정한 저택·금융가 금고가 약정액 비율로 낸다 (가장 모자란 금고만큼만 진행). 약정이 없으면 공사 주인 회사가 낸다
        const funds = k.funders ? funderShares(k, byId) : null;
        if (funds && funds.length === 0) continue;
        if (owner !== c && costPerPoint > 0) {
          if (funds) for (const [o, sh] of funds) take = Math.min(take, Math.max(0, o.cash ?? 0) / (sh * costPerPoint));
          else take = Math.min(take, Math.max(0, owner.cash) / costPerPoint);
        }
        if (!(take > 0)) continue;
        if (owner !== c) {
          const fee = take * costPerPoint;
          if (funds) {
            // 마지막 금고는 남은 몫을 내서 낸 돈의 합이 수수료와 같다
            let rest = fee;
            funds.forEach(([o, sh], i) => { const pay = i === funds.length - 1 ? rest : fee * sh; o.cash = (o.cash ?? 0) - pay; flow(`build.${o.typeId}`, pay); rest -= pay; });
          } else { owner.cash -= fee; owner.ledger.buildPaid += fee; }
          c.cash += fee; c.ledger.buildFees += fee; c.weekProfit += fee;
          if (kd) kd.feeWageWeek = (kd.feeWageWeek ?? 0) + fee * wageShare;
        }
        k.points += take;
        k.spent += take * costPerPoint;
        taken.set(k.id, (taken.get(k.id) ?? 0) + take);
        budget -= take;
      }
      return budget;
    };
    const crown = mine.filter((k) => companyById(w, k.companyId)!.state);
    const priv = mine.filter((k) => !companyById(w, k.companyId)!.state);
    const half = c.buildPoints / 2;
    const leftCrown = serve(crown, half);
    const leftPriv = serve(priv, c.buildPoints - half);
    const unused = serve(crown, leftPriv) + serve(priv, leftCrown);
    c.buildUsed = (c.buildUsed ?? 0) * 0.9 + Math.max(0, c.buildPoints - unused) * 0.1;
  }
}

export function advanceConstruction(w: World) {
  const done = w.constructions.filter((k) => { k.ticksElapsed += 1; return k.points >= k.required - 1e-6; });
  for (const k of done) {
    w.constructions = w.constructions.filter((x) => x.id !== k.id);
    const def = BUILDING_BY_ID[k.typeId];
    const rname = regionById(w, k.regionId).name;
    const add = k.levels ?? 1;
    const target = (k.targetBuildingId != null ? w.buildings.find((b) => b.id === k.targetBuildingId) : undefined)
      ?? ownBuildingAt(w, k.companyId, k.regionId, k.typeId, k.methodId);
    const mats = materialsPerLevel(w, companyById(w, k.companyId), k.typeId);
    if (target) {
      const old = target.materials ?? materialsPerLevel(w, undefined, k.typeId);
      target.materials = Object.fromEntries(GOOD_IDS.filter((g) => (old[g] ?? 0) + (mats[g] ?? 0) > 0)
        .map((g) => [g, ((old[g] ?? 0) * target.level + (mats[g] ?? 0) * add) / (target.level + add)]));
      target.exp *= target.level / (target.level + add);
      if (!target.stateOwned) giveLevels(w, k, target, add);
      target.level += add;
      logEvent(w, k.companyId, `${rname} ${def.name} 증설 완료 → ${target.level}레벨`,
        { regionId: k.regionId, buildingId: target.id, en: `${regionNameEn(k.regionId)} ${buildingNameEn(k.typeId)} expanded to ${target.level} levels` });
    } else {
      const state = !!companyById(w, k.companyId)?.state;
      const b = newBuilding(w.nextId++, k.typeId, k.regionId, k.companyId, k.methodId, add, state);
      if (!state) giveLevels(w, k, b, add);
      b.materials = mats;
      w.buildings.push(b);
      logEvent(w, k.companyId, `${rname} ${def.name} 신규 건설 완료. 사람을 뽑기 시작합니다.`,
        { regionId: k.regionId, buildingId: b.id, en: `New ${buildingNameEn(k.typeId).toLowerCase()} completed in ${regionNameEn(k.regionId)}. Hiring has begun.` });
    }
  }
}

/**
 * 1레벨을 짓는 데 드는 자재: 건설 포인트 × 그 회사 건축사무소 방식의 포인트당 자재.
 * 사무소가 없으면(시작 건물) 첫 건설 방식으로 센다
 */
export function materialsPerLevel(w: World, c: Company | undefined, typeId: string): GoodBag {
  const builder = c ? builderOf(w, c) : undefined;
  const office = builder ? w.buildings.find((b) => b.companyId === builder.id && b.active && getMethod(b.typeId, b.methodId).construction) : undefined;
  const m = office ? getMethod(office.typeId, office.methodId) : BUILDING_BY_ID.builder.methods[0];
  const points = buildPointsOf(typeId);
  const out: GoodBag = {};
  for (const g of GOOD_IDS) if (m.inputs[g]) out[g] = (m.inputs[g]! / m.construction!) * points;
  return out;
}

/**
 * 철거 (매주): 철거 대기가 있는 건물은 1레벨씩 헐린다. 헐린 레벨의 자재 중 TUNE.salvageShare 를 회수해
 * TUNE.salvageDays 동안 지역 시장에 나눠 판다. 대금은 헐린 레벨의 주인이 받는다 (저택·금융가 레벨은 그 금고, 국영 레벨은 국고)
 */
export function progressDemolition(w: World) {
  for (const b of [...w.buildings]) {
    if (!b.shrinking || b.shrinking <= 0) continue;
    b.shrinking -= 1;
    b.level -= 1;
    const starts = (kingdomById(w, regionById(w, b.regionId).kingdomId).startsMonth ??= {});
    starts[`${b.typeId}|d`] = (starts[`${b.typeId}|d`] ?? 0) + 1;
    const mats = b.materials ?? materialsPerLevel(w, undefined, b.typeId);
    // 헐리는 레벨: 민간 건물이면 레벨을 가장 많이 가진 소유 건물의 것 (같으면 id 가 작은 쪽). 국영 건물은 국가 것
    let ownerId: number | null = null;
    if (!b.stateOwned) {
      for (const [id, n] of Object.entries(b.owners ?? {})) if (ownerId === null || n > b.owners![ownerId] || (n === b.owners![ownerId] && Number(id) < ownerId)) ownerId = Number(id);
      if (ownerId !== null) addOwnerLevels(b, ownerId, -1);
    }
    for (const g of GOOD_IDS) {
      const q = (mats[g] ?? 0) * TUNE.salvageShare;
      if (q > 0) w.salvage.push({ regionId: b.regionId, good: g, q, days: TUNE.salvageDays, companyId: b.companyId, ownerId });
    }
    if (b.level <= 0) removeBuilding(w, b);
  }
}

function removeBuilding(w: World, b: Building) {
  w.buildings = w.buildings.filter((x) => x.id !== b.id);
  logEvent(w, b.companyId, `${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id}) 철거 완료`,
    { regionId: b.regionId, en: `Demolished: ${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})` });
}

/** 공사 k 의 약정 금고와 그 비율 (소유 건물 id 순) */
function funderShares(k: Construction, byId: Map<number, Building>): [Building, number][] {
  const ids = Object.keys(k.funders!).map(Number).sort((a, b) => a - b);
  let total = 0;
  for (const id of ids) total += k.funders![id];
  const out: [Building, number][] = [];
  for (const id of ids) { const o = byId.get(id); if (o && total > 0 && k.funders![id] > 0) out.push([o, k.funders![id] / total]); }
  return out;
}

/**
 * 민간 공사 완공: add 레벨을 약정액 비율로 나눈다. 나눠떨어지지 않는 레벨은 약정액이 큰 쪽부터 1레벨씩 갖는다.
 * 그다음 실제로 낸 돈(공사비 × 약정 비율)과 가진 레벨 몫(공사비 × 레벨 ÷ add)의 차이를 정산한다: 더 가진 쪽이 덜 가진 쪽에 돌려준다.
 * 약정이 없는 공사(플레이어 민간 상회 등)는 그 지역 금융가 몫으로 적는다
 */
function giveLevels(w: World, k: Construction, b: Building, add: number) {
  const byId = new Map(w.buildings.map((x) => [x.id, x] as const));
  const funds = k.funders ? funderShares(k, byId) : [];
  if (funds.length === 0) {
    const f = w.buildings.find((x) => x.regionId === k.regionId && x.typeId === 'finance');
    if (f) addOwnerLevels(b, f.id, add);
    return;
  }
  const got = funds.map(([o, sh]) => ({ o, sh, n: Math.floor(add * sh + 1e-9) }));
  let left = add - got.reduce((a, x) => a + x.n, 0);
  for (const x of [...got].sort((a, c) => c.sh - a.sh || a.o.id - c.o.id)) { if (left <= 0) break; x.n += 1; left -= 1; }
  for (const x of got) if (x.n > 0) addOwnerLevels(b, x.o.id, x.n);
  // 정산: 낸 돈 − 가진 레벨 몫. 음수인 쪽이 내고, 양수인 쪽이 받는다 (받는 쪽 비율대로)
  const diff = got.map((x) => ({ o: x.o, d: k.spent * x.sh - (k.spent * x.n) / add }));
  let pot = 0;
  for (const x of diff) if (x.d < 0) { const pay = -x.d; x.o.cash = (x.o.cash ?? 0) - pay; pot += pay; }
  const takers = diff.filter((x) => x.d > 0);
  const want = takers.reduce((a, x) => a + x.d, 0);
  // 마지막으로 받는 쪽이 남은 몫을 받아 받은 돈의 합이 낸 돈과 같다
  let rest = pot;
  takers.forEach((x, i) => { const get = i === takers.length - 1 ? rest : (pot * x.d) / want; x.o.cash = (x.o.cash ?? 0) + get; rest -= get; });
  if (takers.length === 0 && pot > 0) funds[0][0].cash = (funds[0][0].cash ?? 0) + pot;
}

/**
 * 민영화: 왕실 건물 b 의 1레벨을 소유 건물 buyer 가 price 에 산다. 값은 국고로 가고, 레벨은 같은 지역·같은 종류의 민간 건물로 옮겨 buyer 의 것이 된다
 * (민간 건물이 없으면 새로 생긴다. 숙련도·자재는 왕실 건물 것을 따른다)
 */
export function privatizeLevel(w: World, b: Building, buyer: Building, price: number) {
  const gov = companyById(w, b.companyId);
  const k = gov ? kingdomById(w, gov.kingdomId) : undefined;
  const firm = k ? companyById(w, k.privateIds[0]) : undefined;
  if (!gov || !firm || b.level < 1) return;
  buyer.cash = (buyer.cash ?? 0) - price;
  flow(`priv.${buyer.typeId}`, price);
  gov.cash += price; gov.ledger.investment += price;
  let p = ownBuildingAt(w, firm.id, b.regionId, b.typeId, b.methodId);
  if (p) {
    const q = p;
    const old = q.materials ?? materialsPerLevel(w, undefined, q.typeId), mats = b.materials ?? materialsPerLevel(w, undefined, b.typeId);
    q.materials = Object.fromEntries(GOOD_IDS.filter((g) => (old[g] ?? 0) + (mats[g] ?? 0) > 0)
      .map((g) => [g, ((old[g] ?? 0) * q.level + (mats[g] ?? 0)) / (q.level + 1)]));
    q.exp = (q.exp * q.level + b.exp) / (q.level + 1);
    q.level += 1;
  } else {
    p = newBuilding(w.nextId++, b.typeId, b.regionId, firm.id, b.methodId, 1, false);
    p.exp = b.exp;
    if (b.materials) p.materials = { ...b.materials };
    w.buildings.push(p);
  }
  addOwnerLevels(p, buyer.id, 1);
  b.level -= 1;
  if (k) { const starts = (k.startsMonth ??= {}); starts[`${b.typeId}|v`] = (starts[`${b.typeId}|v`] ?? 0) + 1; }
  if (b.shrinking) b.shrinking = Math.min(b.shrinking, b.level);
  const rname = regionById(w, b.regionId).name;
  logEvent(w, gov.id, `${rname} ${BUILDING_BY_ID[b.typeId].name} 1레벨 민영화 (ƒ${Math.round(price)})`,
    { regionId: b.regionId, buildingId: p.id, en: `${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)}: one level privatised (ƒ${Math.round(price)})` });
  if (b.level <= 0) removeBuilding(w, b);
}
