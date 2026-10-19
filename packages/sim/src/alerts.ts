import { BUILDING_BY_ID, GOOD_IDS, GOODS, LAND_NAMES, TICKS_PER_WEEK, getMethod } from './data';
import { alertOnce, harvestCondition, logEvent, regionById } from './economy';
import { buildingNameEn, goodNameEn, harvestNameEn, harvestNameKo, landNameEn, regionNameEn } from './i18n';
import type { Region, World } from './types';

const COOLDOWN = TICKS_PER_WEEK * 4;
/** 이주 알림: 이 기간(4주) 동안 떠난 사람이 원래 인구의 이 비율 이상일 때만 */

/**
 * 주 1회 상태를 점검해 회사·지역에 알림을 남긴다. 같은 알림은 4주에 한 번만.
 * 플레이어뿐 아니라 AI 회사에도 남기지만, 화면에서는 내 회사 것만 강조한다.
 * 각 알림은 같은 숫자로 만든 영어 문장(en)도 함께 남긴다.
 */
/** 이 아래로 식량이 떨어지면 모든 왕국에 알린다 (심한 기아) */
const SEVERE_FAMINE = 0.2;

export function weeklyAlerts(w: World) {
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    const r = regionById(w, b.regionId);
    const name = `${r.name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id})`;
    const nameEn = `${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})`;
    const at = { regionId: b.regionId, buildingId: b.id };
    if (b.unpaid) {
      alertOnce(w, `unpaid:${b.id}`, COOLDOWN, b.companyId,
        `${name}: 임금을 다 주지 못해 노동자가 떠나고 있습니다. 현금이나 대출 한도를 확인하세요.`,
        { kind: 'danger', ...at, en: `${nameEn}: wages could not be paid in full and workers are leaving. Check your cash and credit limit.` });
    }
    if (b.active && !b.idle && b.last.staffing > 0 && b.last.inputFill < 0.5) {
      const method = getMethod(b.typeId, b.methodId);
      const shortIds = GOOD_IDS.filter((g) => method.inputs[g] && (b.stock[g] ?? 0) < method.inputs[g]! * b.level * 0.5);
      const short = shortIds.map((g) => GOODS[g].name);
      const fill = Math.round(b.last.inputFill * 100);
      alertOnce(w, `inputs:${b.id}`, COOLDOWN, b.companyId,
        `${name}: 투입재(${short.join(', ') || '원료'})를 못 구해 가동이 ${fill}%로 떨어졌습니다.`,
        { kind: 'warn', ...at, en: `${nameEn}: inputs (${shortIds.map(goodNameEn).join(', ') || 'materials'}) are short, so output fell to ${fill}%.` });
    }
    if (b.active && b.last.staffing < 0.5 && b.last.staffing > 0) {
      const staff = Math.round(b.last.staffing * 100);
      alertOnce(w, `staff:${b.id}`, COOLDOWN, b.companyId,
        `${name}: 인력이 ${staff}%뿐입니다. 임금을 올리거나 다른 지역을 알아보세요.`,
        { kind: 'warn', ...at, en: `${nameEn}: only ${staff}% staffed. Raise wages or look at other regions.` });
    }
  }
  // 건설 포인트가 안 나오는 회사의 공사: 사무소가 없거나, 사람이 없거나, 목재 같은 투입재가 없다
  for (const c of w.companies) {
    const mine = w.constructions.filter((k) => k.companyId === c.id);
    if (mine.length === 0) continue;
    const offices = w.buildings.filter((b) => b.companyId === c.id && getMethod(b.typeId, b.methodId).construction);
    const oldest = mine.reduce((a, k) => (k.ticksElapsed > a.ticksElapsed ? k : a));
    if (oldest.ticksElapsed < 14) continue;
    if (offices.length === 0) {
      alertOnce(w, `nobuilder:${c.id}`, COOLDOWN, c.id, '공사가 잡혀 있지만 건축사무소가 없어 진행되지 않습니다.',
        { kind: 'danger', en: 'Projects are queued, but there is no construction office, so nothing is being built.' });
    } else if (offices.every((b) => !b.active || b.last.points <= 0)) {
      const noStaff = offices.some((b) => b.active && b.last.staffing <= 0);
      const noInputs = !noStaff && offices.some((b) => b.active && b.last.inputFill < 0.5);
      const why = noStaff ? '사무소에 일꾼이 없습니다' : noInputs ? '사무소의 투입재(목재 등)가 없습니다' : '사무소가 멈춰 있습니다';
      const whyEn = noStaff ? 'The offices have no workers' : noInputs ? 'The offices have no inputs (timber etc.)' : 'The offices are stopped';
      alertOnce(w, `nopoints:${c.id}`, COOLDOWN, c.id, `공사 ${mine.length}건이 진행되지 않습니다. ${why}.`,
        { kind: 'warn', regionId: offices[0].regionId, buildingId: offices[0].id, en: `${mine.length} project${mine.length === 1 ? ' is' : 's are'} not advancing. ${whyEn}.` });
    }
  }
  // 내 투입재 가격 급등 (회사별, 지역별)
  for (const c of w.companies) {
    const seen = new Set<string>();
    for (const b of w.buildings) {
      if (b.companyId !== c.id || !b.active) continue;
      const method = getMethod(b.typeId, b.methodId);
      for (const g of GOOD_IDS) {
        if (!method.inputs[g]) continue;
        const key = `${b.regionId}:${g}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const mg = regionById(w, b.regionId).market[g];
        if (mg.price > GOODS[g].basePrice * 1.6) {
          const x = (mg.price / GOODS[g].basePrice).toFixed(1);
          alertOnce(w, `spike:${c.id}:${key}`, COOLDOWN, c.id,
            `${regionById(w, b.regionId).name}의 ${GOODS[g].name} 가격이 기본가의 ${x}배입니다. 투입 비용이 크게 올랐습니다.`,
            { kind: 'warn', regionId: b.regionId, en: `${goodNameEn(g)} in ${regionNameEn(b.regionId)} costs ${x}× its base price. Input costs have risen sharply.` });
        }
      }
    }
  }
  // 지역 알림은 그 지역 왕국의 왕실에게만 간다. 다른 왕국에도 알리는 것은 중대한 알림(심한 기아)뿐이다
  const crownOf = (r: Region) => w.kingdoms.find((k) => k.id === r.kingdomId)?.governmentId ?? null;
  // 기상 조건: 지난 점검 뒤에 새로 걸린 조건마다 한 번 (조건은 날짜로 다시 계산하므로 따로 기억하지 않는다)
  for (const r of w.regions) {
    const now = harvestCondition(w, r.id);
    if (!now) continue;
    const before = harvestCondition(w, r.id, w.tick - TICKS_PER_WEEK);
    if (before && before.origin === now.origin && before.start === now.start) continue;
    const pct = Math.round(now.cut * 100), days = now.end - w.tick;
    logEvent(w, crownOf(r), `${r.name} ${harvestNameKo(now.kind)}: ${now.lands.map((l) => LAND_NAMES[l]).join('·')} −${pct}% · ${days}일`,
      { kind: 'warn', regionId: r.id, en: `${regionNameEn(r.id)} ${harvestNameEn(now.kind).toLowerCase()}: ${now.lands.map((l) => landNameEn(l).toLowerCase()).join(', ')} −${pct}% · ${days} d` });
  }
  // 지역 기아
  for (const r of w.regions) {
    for (const cls of ['unskilled', 'peasant'] as const) {
      const h = r.households[cls];
      // 기아는 부가 아니라 식량 충족률로 판단한다. 소작농은 원래 배를 곯으므로 더 심할 때만 알린다
      const line = cls === 'unskilled' ? 0.8 : 0.6;
      if (h.population >= 5000 && h.food < line) {
        const food = Math.round(h.food * 100);
        const severe = h.food < SEVERE_FAMINE;
        alertOnce(w, `famine:${r.id}:${cls}`, TICKS_PER_WEEK * 8, severe ? null : crownOf(r),
          `${r.name}의 ${cls === 'unskilled' ? '노동자가' : '소작농이'} 굶고 있습니다(식량 충족 ${food}%). 인구가 줄어듭니다.`,
          { kind: severe ? 'danger' : 'warn', regionId: r.id, en: `${cls === 'unskilled' ? 'Labourers' : 'Tenant farmers'} in ${regionNameEn(r.id)} are starving (food ${food}%). The population is shrinking.` });
      }
    }
  }
}
