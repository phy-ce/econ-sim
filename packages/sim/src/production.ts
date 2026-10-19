import { BUILDING_BY_ID, GOOD_IDS, MAX_POINTS_PER_LEVEL_DAY, OWNER_SEATS_PER_LEVEL, OWNERSHIP_SEATS, TUNE, getMethod } from './data';
import { builderOf, companyById, efficiency, harvestFactor, isGovernment, landFree, logEvent, newBuilding, ownerBuildingOf, regionById } from './economy';
import { workforce } from './pops';
import { kingdomById } from './kingdoms';
import { buildingNameEn, regionNameEn } from './i18n';
import { clamp, round2 } from './rng';
import type { Building, Company, GoodBag, World } from './types';

/** 숙련도가 하루에 오르는 양 (약 한 달이면 최대) */
const EXP_GAIN = 0.035;
/** 작업 인원이 실제 충원율을 따라가는 하루 비율 */
const CREW_RATE = 0.08;

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
 * 소유 건물(저택·금융가): 지역마다 하나씩, 그 지역 민간 소유. 크기는 지역의 그 직종 노동 인구와
 * 소유한 건물 레벨 × OWNER_SEATS_PER_LEVEL 중 큰 쪽이 다 앉을 만큼이다.
 * 하루 받은 배당·지대(last.revenue)는 이동평균(profitEma)으로 남긴다 (자리 값).
 */
export function updateOwnership(w: World) {
  const owned = new Map<string, number>();
  for (const b of w.buildings) {
    const o = ownerBuildingOf(w, b);
    if (o) owned.set(`${o.regionId}|${o.typeId}`, (owned.get(`${o.regionId}|${o.typeId}`) ?? 0) + b.level);
  }
  for (const r of w.regions) {
    const owner = kingdomById(w, r.kingdomId).privateIds[0];
    for (const typeId of ['manor', 'finance']) {
      const cls = BUILDING_BY_ID[typeId].ownership!;
      let wf = 0;
      for (const p of w.pops) if (p.regionId === r.id && p.prof === cls) wf += workforce(p);
      const seats = Math.max(wf, (owned.get(`${r.id}|${typeId}`) ?? 0) * OWNER_SEATS_PER_LEVEL);
      let b = w.buildings.find((x) => x.regionId === r.id && x.typeId === typeId);
      if (!b) {
        b = newBuilding(w.nextId++, typeId, r.id, owner, typeId, 0, false);
        b.exp = 1; b.crew = 1;
        w.buildings.push(b);
      }
      b.companyId = owner; b.stateOwned = false;
      b.level = Math.max(1, Math.ceil(seats / OWNERSHIP_SEATS));
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

export function produce(w: World) {
  for (const c of w.companies) { c.buildPoints = 0; c.buildCost = 0; }
  for (const b of w.buildings) {
    if (!b.active || BUILDING_BY_ID[b.typeId].auto) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    const method = getMethod(b.typeId, b.methodId);
    b.crew = (b.crew ?? b.last.staffing) + (b.last.staffing - (b.crew ?? b.last.staffing)) * CREW_RATE;
    const st = b.crew;
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
      const scale = run * fill * efficiency(b);
      for (const g of GOOD_IDS) {
        const per = method.outputs[g];
        if (!per) continue;
        const q = per * scale;
        b.last.output[g] = q;
        b.outStock[g] = q;
      }
      if (method.construction && !b.idle) {
        b.last.points = round2(method.construction * scale);
        c.buildPoints += b.last.points;
        c.buildCost += b.last.wageCost + b.last.inputCost;
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
      if (c.state) c.buildUsed = round2((c.buildUsed ?? 0) * 0.9);
      continue;
    }
    const costPerPoint = c.buildCost / c.buildPoints;
    const mine = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === c; });
    const taken = new Map<number, number>();
    const serve = (list: typeof mine, budget: number) => {
      for (const k of list) {
        if (budget <= 1e-9) break;
        if (k.paused) continue;
        const owner = companyById(w, k.companyId)!;
        const room = MAX_POINTS_PER_LEVEL_DAY * (k.levels ?? 1) - (taken.get(k.id) ?? 0);
        let take = Math.min(budget, room, k.required - k.points);
        if (owner !== c && costPerPoint > 0) take = Math.min(take, Math.max(0, owner.cash) / costPerPoint);
        take = Math.floor(take * 100 + 1e-6) / 100;
        if (take <= 0) continue;
        if (owner !== c) {
          const fee = round2(take * costPerPoint);
          owner.cash -= fee; owner.ledger.buildPaid += fee;
          c.cash += fee; c.ledger.buildFees += fee; c.weekProfit += fee;
        }
        k.points = round2(k.points + take);
        k.spent = round2(k.spent + take * costPerPoint);
        taken.set(k.id, (taken.get(k.id) ?? 0) + take);
        budget = round2(budget - take);
      }
      return budget;
    };
    const crown = mine.filter((k) => companyById(w, k.companyId)!.state);
    const priv = mine.filter((k) => !companyById(w, k.companyId)!.state);
    const half = Math.floor(c.buildPoints * 50 + 1e-6) / 100;
    const leftCrown = serve(crown, half);
    const leftPriv = serve(priv, round2(c.buildPoints - half));
    const unused = serve(crown, leftPriv) + serve(priv, leftCrown);
    c.buildUsed = round2((c.buildUsed ?? 0) * 0.9 + Math.max(0, c.buildPoints - unused) * 0.1);
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
      ?? w.buildings.find((b) => b.companyId === k.companyId && b.regionId === k.regionId && b.typeId === k.typeId);
    const mats = materialsPerLevel(w, companyById(w, k.companyId), k.typeId);
    if (target) {
      const old = target.materials ?? materialsPerLevel(w, undefined, k.typeId);
      target.materials = Object.fromEntries(GOOD_IDS.filter((g) => (old[g] ?? 0) + (mats[g] ?? 0) > 0)
        .map((g) => [g, round2(((old[g] ?? 0) * target.level + (mats[g] ?? 0) * add) / (target.level + add))]));
      target.exp *= target.level / (target.level + add);
      if (target.privateShare || k.privateShare) target.privateShare = round2(((target.privateShare ?? 0) * target.level + (k.privateShare ?? 0) * add) / (target.level + add));
      target.level += add;
      logEvent(w, k.companyId, `${rname} ${def.name} 증설 완료 → ${target.level}레벨`,
        { regionId: k.regionId, buildingId: target.id, en: `${regionNameEn(k.regionId)} ${buildingNameEn(k.typeId)} expanded to ${target.level} levels` });
    } else {
      const state = !!companyById(w, k.companyId)?.state;
      const b = newBuilding(w.nextId++, k.typeId, k.regionId, k.companyId, k.methodId, add, state);
      if (k.privateShare) b.privateShare = k.privateShare;
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
  const points = BUILDING_BY_ID[typeId].buildPoints;
  const out: GoodBag = {};
  for (const g of GOOD_IDS) if (m.inputs[g]) out[g] = round2((m.inputs[g]! / m.construction!) * points);
  return out;
}

/**
 * 철거 (매주): 철거 대기가 있는 건물은 1레벨씩 헐린다. 헐린 레벨의 자재 중 TUNE.salvageShare 를 회수해
 * TUNE.salvageDays 동안 지역 시장에 나눠 판다. 대금은 민간 건물이면 소유 건물(저택·금융가)로, 국영 건물이면 국고로 간다 (민간 지분 몫은 소유 건물로)
 */
export function progressDemolition(w: World) {
  for (const b of [...w.buildings]) {
    if (!b.shrinking || b.shrinking <= 0) continue;
    b.shrinking -= 1;
    b.level -= 1;
    const starts = (kingdomById(w, regionById(w, b.regionId).kingdomId).startsMonth ??= {});
    starts[`${b.typeId}|d`] = (starts[`${b.typeId}|d`] ?? 0) + 1;
    const mats = b.materials ?? materialsPerLevel(w, undefined, b.typeId);
    const owner = ownerBuildingOf(w, b, true);
    const ownerShare = b.stateOwned ? (b.privateShare ?? 0) : 1;
    for (const g of GOOD_IDS) {
      const q = round2((mats[g] ?? 0) * TUNE.salvageShare);
      if (q > 0) w.salvage.push({ regionId: b.regionId, good: g, q, days: TUNE.salvageDays, companyId: b.companyId, ownerId: owner?.id ?? null, ownerShare });
    }
    if (b.level <= 0) removeBuilding(w, b);
  }
}

function removeBuilding(w: World, b: Building) {
  w.buildings = w.buildings.filter((x) => x.id !== b.id);
  logEvent(w, b.companyId, `${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id}) 철거 완료`,
    { regionId: b.regionId, en: `Demolished: ${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})` });
}
