import { BUILDING_BY_ID, CLASS_DEFS, GOOD_IDS, GOODS, TICKS_PER_WEEK, getMethod } from './data';
import { alertOnce, builderOf, harvestCondition, harvestLabel, logEvent, regionById } from './economy';
import { funderShares } from './production';
import { buildingNameEn, goodNameEn, regionNameEn } from './i18n';
import type { Building, Region, World } from './types';

/** 기아 알림의 주어 */
const STARVING_KO = { unskilled: '노동자가', farmer: '농부가', peasant: '소작농이' } as const;

const COOLDOWN = TICKS_PER_WEEK * 4;
/** 이주 알림: 이 기간(4주) 동안 떠난 사람이 원래 인구의 이 비율 이상일 때만 */

/**
 * 주 1회 상태를 점검해 회사·지역에 알림을 남긴다. 같은 알림은 4주에 한 번만.
 * 플레이어뿐 아니라 AI 회사에도 남기지만, 화면에서는 내 회사 것만 강조한다.
 * 각 알림은 같은 숫자로 만든 영어 문장(en)도 함께 남긴다.
 */
/** 묶은 알림의 목록: 앞의 LIST_MAX 개만 쓰고 나머지는 개수로 */
const LIST_MAX = 3;
const listKo = (l: string[]) => l.slice(0, LIST_MAX).join(', ') + (l.length > LIST_MAX ? ` 외 ${l.length - LIST_MAX}곳` : '');
const listEn = (l: string[]) => l.slice(0, LIST_MAX).join(', ') + (l.length > LIST_MAX ? ` and ${l.length - LIST_MAX} more` : '');

/** 상태가 풀리면 지우는 알림 키의 앞부분 (기상 조건 소식은 logEvent 로 남기고 지우지 않는다) */
const RESOLVABLE = /^(unpaid|inputs|staff|nobuilder|nofunds|nopoints|spike|famine):/;

export function weeklyAlerts(w: World) {
  // 이번 점검에서 조건이 걸린 키. 걸리지 않은 키의 소식은 끝에서 지운다 (해결된 소식은 남기지 않는다, 2026-11-20 사용자)
  const live = new Set<string>();
  const fire = (key: string, cooldown: number, companyId: number | null, text: string, opts?: Parameters<typeof alertOnce>[5]) => { live.add(key); return alertOnce(w, key, cooldown, companyId, text, opts); };
  // 투입재·일손 부족은 회사마다 한 알림으로 묶는다 (건물마다 따로 내면 알림이 너무 많다, 2026-11-20 사용자). 가장 나쁜 건물을 가리킨다
  type Row = { b: Building; v: number; ko: string; en: string };
  const inputs = new Map<number, Row[]>(), staff = new Map<number, Row[]>();
  const push = (m: Map<number, Row[]>, c: number, r: Row) => { const l = m.get(c); if (l) l.push(r); else m.set(c, [r]); };
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    const r = regionById(w, b.regionId);
    const name = `${r.name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id})`;
    const nameEn = `${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})`;
    const at = { regionId: b.regionId, buildingId: b.id };
    if (b.unpaid) {
      fire(`unpaid:${b.id}`, COOLDOWN, b.companyId,
        `${name}: 임금을 다 주지 못해 노동자가 떠나고 있습니다. 현금이나 대출 한도를 확인하세요.`,
        { kind: 'danger', ...at, en: `${nameEn}: wages could not be paid in full and workers are leaving. Check your cash and credit limit.` });
    }
    if (b.active && !b.idle && b.last.staffing > 0 && b.last.inputFill < 0.5) {
      const method = getMethod(b.typeId, b.methodId);
      const shortIds = GOOD_IDS.filter((g) => method.inputs[g] && (b.stock[g] ?? 0) < method.inputs[g]! * b.level * 0.5);
      const fill = Math.round(b.last.inputFill * 100);
      push(inputs, b.companyId, { b, v: b.last.inputFill, ko: `${name} ${fill}%(${shortIds.map((g) => GOODS[g].name).join(', ') || '원료'})`,
        en: `${nameEn} ${fill}% (${shortIds.map(goodNameEn).join(', ') || 'materials'})` });
    }
    if (b.active && b.last.staffing < 0.5 && b.last.staffing > 0) {
      const pct = Math.round(b.last.staffing * 100);
      push(staff, b.companyId, { b, v: b.last.staffing, ko: `${name} ${pct}%`, en: `${nameEn} ${pct}%` });
    }
  }
  const grouped = (m: Map<number, Row[]>, key: string, ko: string, en: string) => {
    for (const [c, rows] of m) {
      rows.sort((a, x) => a.v - x.v);
      const worst = rows[0].b;
      fire(`${key}:${c}`, COOLDOWN, c, `${ko} ${rows.length}곳: ${listKo(rows.map((x) => x.ko))}`,
        { kind: 'warn', regionId: worst.regionId, buildingId: worst.id, en: `${en} at ${rows.length}: ${listEn(rows.map((x) => x.en))}` });
    }
  };
  grouped(inputs, 'inputs', '투입재 부족', 'Inputs short');
  grouped(staff, 'staff', '일손 부족', 'Understaffed');
  // 공사가 2주 넘게 포인트를 받지 못하는 까닭. 민간 공사는 왕실 사무소가 짓는다 (builderOf). 멈춘(paused) 공사는 세지 않는다
  for (const c of w.companies) {
    const mine = w.constructions.filter((k) => k.companyId === c.id && !k.paused);
    if (mine.length === 0) continue;
    const oldest = mine.reduce((a, k) => (k.ticksElapsed > a.ticksElapsed ? k : a));
    if (oldest.ticksElapsed < 14) continue;
    const builder = builderOf(w, c), own = builder === c;
    const offices = w.buildings.filter((b) => b.companyId === builder.id && getMethod(b.typeId, b.methodId).construction);
    const n = mine.length;
    const head = `공사 ${n}건이 멈췄습니다`, headEn = `${n} project${n === 1 ? ' is' : 's are'} stalled`;
    if (offices.length === 0) {
      fire(`nobuilder:${c.id}`, COOLDOWN, c.id, `${head}: ${own ? '' : '왕실에 '}건축사무소가 없습니다.`,
        { kind: 'danger', en: `${headEn}: ${own ? 'you have' : 'the crown has'} no construction office.` });
      continue;
    }
    // 민간 공사는 약정한 금고(저택·금융가)가 하나라도 비면 포인트를 받지 못한다 (production.ts officeNeed 와 같은 조건)
    if (!own) {
      const byId = new Map(w.buildings.map((b) => [b.id, b] as const));
      const unfunded = mine.filter((k) => k.funders ? (() => { const f = funderShares(k, byId); return !f.length || f.some(([o]) => !((o.cash ?? 0) > 0)); })() : !(c.cash > 0));
      if (unfunded.length === n) {
        fire(`nofunds:${c.id}`, COOLDOWN, c.id, `${head}: 공사비를 낼 금고에 돈이 없습니다.`,
          { kind: 'warn', en: `${headEn}: the treasuries paying for ${n === 1 ? 'it are' : 'them are'} empty.` });
        continue;
      }
    }
    if (offices.every((b) => !b.active || b.last.points <= 0)) {
      const noStaff = offices.some((b) => b.active && b.last.staffing <= 0);
      const noInputs = !noStaff && offices.some((b) => b.active && b.last.inputFill < 0.5);
      const who = own ? '건축사무소' : '왕실 건축사무소', whoEn = own ? 'Your construction offices' : 'The crown construction offices';
      const why = noStaff ? `${who}에 일꾼이 없습니다` : noInputs ? `${who}의 투입재(목재 등)가 없습니다` : `${who}가 멈춰 있습니다`;
      const whyEn = noStaff ? `${whoEn} have no workers` : noInputs ? `${whoEn} have no inputs (timber etc.)` : `${whoEn} are stopped`;
      fire(`nopoints:${c.id}`, COOLDOWN, c.id, `${head}: ${why}.`,
        { kind: 'warn', regionId: offices[0].regionId, buildingId: offices[0].id, en: `${headEn}: ${whyEn}.` });
    }
  }
  // 내 투입재 가격 급등: 회사마다 한 알림 (지역·상품 목록, 가장 비싼 것부터)
  for (const c of w.companies) {
    const seen = new Set<string>();
    const rows: { v: number; regionId: number; ko: string; en: string }[] = [];
    for (const b of w.buildings) {
      if (b.companyId !== c.id || !b.active) continue;
      const method = getMethod(b.typeId, b.methodId);
      for (const g of GOOD_IDS) {
        if (!method.inputs[g]) continue;
        const key = `${b.regionId}:${g}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const mg = regionById(w, b.regionId).market[g];
        const x = mg.price / GOODS[g].basePrice;
        if (x > 1.6) rows.push({ v: x, regionId: b.regionId, ko: `${regionById(w, b.regionId).name} ${GOODS[g].name} ${x.toFixed(1)}배`, en: `${goodNameEn(g)} in ${regionNameEn(b.regionId)} ${x.toFixed(1)}×` });
      }
    }
    if (!rows.length) continue;
    rows.sort((a, x) => x.v - a.v);
    fire(`spike:${c.id}`, COOLDOWN, c.id, `투입재 가격 급등 ${rows.length}건 (기본가 대비): ${listKo(rows.map((x) => x.ko))}`,
      { kind: 'warn', regionId: rows[0].regionId, en: `Input prices spiking, ${rows.length} (vs base price): ${listEn(rows.map((x) => x.en))}` });
  }
  // 지역 알림은 그 지역 왕국의 왕실에게만 간다 (다른 왕국의 기아·인력 사정은 알리지 않는다)
  const crownOf = (r: Region) => w.kingdoms.find((k) => k.id === r.kingdomId)?.governmentId ?? null;
  // 기상 조건: 지난 점검 뒤에 새로 걸린 조건마다 한 번 (조건은 날짜로 다시 계산하므로 따로 기억하지 않는다)
  for (const r of w.regions) {
    const now = harvestCondition(w, r.id);
    if (!now) continue;
    const before = harvestCondition(w, r.id, w.tick - TICKS_PER_WEEK);
    if (before && before.origin === now.origin && before.start === now.start) continue;
    logEvent(w, crownOf(r), `${r.name} ${harvestLabel(w, r.id)}`, { kind: 'warn', regionId: r.id, en: `${regionNameEn(r.id)} ${harvestLabel(w, r.id, true)}` });
  }
  // 지역 기아
  for (const r of w.regions) {
    for (const cls of ['unskilled', 'farmer', 'peasant'] as const) {
      const h = r.households[cls];
      // 기아는 'warn' 이다: 화면의 '위험 알림에 멈춤'(kind danger)으로 게임을 멈추지 않는다 (2026-11-20 사용자). 기아는 부가 아니라 식량 충족률로 판단한다. 소작농은 원래 배를 곯으므로 더 심할 때만 알린다
      const line = cls === 'peasant' ? 0.6 : 0.8;
      if (h.population >= 5000 && h.food < line) {
        const food = Math.round(h.food * 100);
        fire(`famine:${r.id}:${cls}`, TICKS_PER_WEEK * 8, crownOf(r),
          `${r.name}의 ${STARVING_KO[cls]} 굶고 있습니다(식량 충족 ${food}%). 인구가 줄어듭니다.`,
          { kind: 'warn', regionId: r.id, en: `${CLASS_DEFS[cls].nameEn} in ${regionNameEn(r.id)} are starving (food ${food}%). The population is shrinking.` });
      }
    }
  }
  for (const k of Object.keys(w.alertState)) if (RESOLVABLE.test(k) && !live.has(k)) delete w.alertState[k];
  let n = 0;
  for (const e of w.events) if (!e.key || !RESOLVABLE.test(e.key) || live.has(e.key)) w.events[n++] = e;
  w.events.length = n;
}
